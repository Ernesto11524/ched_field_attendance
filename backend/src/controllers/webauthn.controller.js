const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const db = require('../config/db');

const RP_ID   = process.env.RP_ID   || 'localhost';
const RP_NAME = 'COCOBOD Field Attendance';

// Support comma-separated list so one Railway deployment serves both
// Vercel URLs and local dev at the same time.
// e.g. ORIGINS=https://ched-field-attendance.vercel.app,https://ched-field-attendance-1yo8.vercel.app,http://localhost:5173
const ORIGINS = process.env.ORIGINS
  ? process.env.ORIGINS.split(',').map(s => s.trim())
  : [process.env.ORIGIN || 'http://localhost:5173'];

// ── REGISTRATION ─────────────────────────────────────────

async function getRegistrationOptions(req, res, next) {
  try {
    const { workerId } = req.params;

    const workerResult = await db.query(
      'SELECT id, full_name, employee_id FROM workers WHERE id = $1 AND is_active = true',
      [workerId]
    );

    if (workerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Worker not found.' });
    }

    const worker = workerResult.rows[0];

    const credResult = await db.query(
      'SELECT credential_id FROM worker_credentials WHERE worker_id = $1 AND is_active = true',
      [workerId]
    );

    if (credResult.rows.length > 0) {
      return res.status(409).json({
        error: 'This account is already registered on a device. Contact your supervisor to reset your registration if you have lost your phone.',
        code: 'DEVICE_ALREADY_REGISTERED',
      });
    }

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: Buffer.from(worker.id),
      userName: worker.employee_id,
      userDisplayName: worker.full_name,
      excludeCredentials: [],
      authenticatorSelection: {
        userVerification: 'required',
        residentKey: 'preferred',
      },
    });

    // Save challenge to database instead of memory
    await db.query(
      `INSERT INTO webauthn_challenges (worker_id, challenge, type, expires_at)
       VALUES ($1, $2, 'registration', NOW() + INTERVAL '10 minutes')
       ON CONFLICT (worker_id, type) DO UPDATE
         SET challenge = EXCLUDED.challenge, expires_at = EXCLUDED.expires_at`,
      [workerId, options.challenge]
    );

    res.json(options);
  } catch (err) {
    next(err);
  }
}

async function verifyRegistration(req, res, next) {
  try {
    const { workerId } = req.params;
    const { body: registrationResponse, deviceName } = req.body;

    // Get challenge from database
    const challengeResult = await db.query(
      `SELECT challenge FROM webauthn_challenges
       WHERE worker_id = $1 AND type = 'registration' AND expires_at > NOW()`,
      [workerId]
    );

    if (challengeResult.rows.length === 0) {
      return res.status(400).json({ error: 'Registration challenge expired. Please try again.' });
    }

    const storedChallenge = challengeResult.rows[0].challenge;

    const verification = await verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge: storedChallenge,
      expectedOrigin: ORIGINS,
      expectedRPID: RP_ID,
    });

    if (!verification.verified) {
      return res.status(400).json({ error: 'Biometric registration failed. Please try again.' });
    }

    const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

    // In simplewebauthn v9, credentialID is already a Base64URLString.
    // Guard against both string and Uint8Array so this works across versions.
    const credIdBase64 = typeof credentialID === 'string'
      ? credentialID
      : Buffer.from(credentialID).toString('base64url');

    await db.query(
      `INSERT INTO worker_credentials
         (worker_id, credential_id, public_key, sign_count, device_name)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (credential_id) DO UPDATE
         SET sign_count = EXCLUDED.sign_count`,
      [
        workerId,
        credIdBase64,
        Buffer.from(credentialPublicKey).toString('base64url'),
        counter,
        deviceName || 'My Phone',
      ]
    );

    // Clean up challenge
    await db.query(
      `DELETE FROM webauthn_challenges WHERE worker_id = $1 AND type = 'registration'`,
      [workerId]
    );

    res.json({ message: 'Device registered successfully. Biometrics are now set up.' });
  } catch (err) {
    next(err);
  }
}

// ── AUTHENTICATION ────────────────────────────────────────

async function getAuthenticationOptions(req, res, next) {
  try {
    const { workerId } = req.params;

    const credResult = await db.query(
      'SELECT credential_id FROM worker_credentials WHERE worker_id = $1 AND is_active = true',
      [workerId]
    );

    if (credResult.rows.length === 0) {
      return res.status(404).json({
        error: 'No registered device found for this worker. Please register first.',
      });
    }

    // Pass as Buffer (Uint8Array) so generateAuthenticationOptions encodes
    // the bytes correctly. Passing a raw string risks double-encoding.
    const allowCredentials = credResult.rows.map(row => ({
      id: Buffer.from(row.credential_id, 'base64url'),
      type: 'public-key',
    }));

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials,
      userVerification: 'required',
    });

    // Save challenge to database
    await db.query(
      `INSERT INTO webauthn_challenges (worker_id, challenge, type, expires_at)
       VALUES ($1, $2, 'authentication', NOW() + INTERVAL '5 minutes')
       ON CONFLICT (worker_id, type) DO UPDATE
         SET challenge = EXCLUDED.challenge, expires_at = EXCLUDED.expires_at`,
      [workerId, options.challenge]
    );

    res.json(options);
  } catch (err) {
    next(err);
  }
}

async function verifyAuthentication(req, res, next) {
  try {
    const { workerId } = req.params;
    const authResponse = req.body;

    // Get challenge from database
    const challengeResult = await db.query(
      `SELECT challenge FROM webauthn_challenges
       WHERE worker_id = $1 AND type = 'authentication' AND expires_at > NOW()`,
      [workerId]
    );

    if (challengeResult.rows.length === 0) {
      return res.status(400).json({ error: 'Authentication challenge expired. Please try again.' });
    }

    const storedChallenge = challengeResult.rows[0].challenge;

    const credResult = await db.query(
      `SELECT * FROM worker_credentials
       WHERE worker_id = $1 AND credential_id = $2 AND is_active = true`,
      [workerId, authResponse.id]
    );

    if (credResult.rows.length === 0) {
      return res.status(404).json({ error: 'Credential not found.' });
    }

    const cred = credResult.rows[0];

    const verification = await verifyAuthenticationResponse({
      response: authResponse,
      expectedChallenge: storedChallenge,
      expectedOrigin: ORIGINS,
      expectedRPID: RP_ID,
      authenticator: {
        credentialID: Buffer.from(cred.credential_id, 'base64url'),
        credentialPublicKey: Buffer.from(cred.public_key, 'base64url'),
        counter: cred.sign_count,
      },
    });

    if (!verification.verified) {
      return res.status(401).json({ verified: false, error: 'Biometric verification failed.' });
    }

    await db.query(
      'UPDATE worker_credentials SET sign_count = $1 WHERE id = $2',
      [verification.authenticationInfo.newCounter, cred.id]
    );

    // Clean up challenge
    await db.query(
      `DELETE FROM webauthn_challenges WHERE worker_id = $1 AND type = 'authentication'`,
      [workerId]
    );

    res.json({
      verified: true,
      credential_id: cred.id,
      message: 'Biometric verified successfully.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
};
