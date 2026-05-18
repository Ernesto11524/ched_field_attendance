const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const db = require('../config/db');

// Your app's domain — update this when you deploy
const RP_ID = process.env.RP_ID || 'localhost';
const RP_NAME = 'Field Attendance App';
const ORIGIN = process.env.ORIGIN || 'http://localhost:5173';

// Temporary in-memory store for challenges (use Redis in production)
const challengeStore = new Map();

// ─────────────────────────────────────────────────────────────
// REGISTRATION (first time a worker enrolls their device)
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/webauthn/register/options/:workerId
 * Step 1: Generate registration options to send to the worker's phone.
 */
async function getRegistrationOptions(req, res, next) {
  try {
    const { workerId } = req.params;

    // Get the worker
    const workerResult = await db.query(
      'SELECT id, full_name, employee_id FROM workers WHERE id = $1 AND is_active = true',
      [workerId]
    );

    if (workerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Worker not found.' });
    }

    const worker = workerResult.rows[0];

    // Get any existing credentials for this worker
    const credResult = await db.query(
      'SELECT credential_id FROM worker_credentials WHERE worker_id = $1 AND is_active = true',
      [workerId]
    );

    const existingCredentials = credResult.rows.map((row) => ({
      id: row.credential_id,
      type: 'public-key',
    }));

    // Generate the options
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: Buffer.from(worker.id),
      userName: worker.employee_id,
      userDisplayName: worker.full_name,
      excludeCredentials: existingCredentials,
      authenticatorSelection: {
        userVerification: 'required',       // requires biometric (fingerprint/face)
        residentKey: 'preferred',
      },
    });

    // Save the challenge temporarily (10 minutes)
    challengeStore.set(workerId, {
      challenge: options.challenge,
      expires: Date.now() + 10 * 60 * 1000,
    });

    res.json(options);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/webauthn/register/verify/:workerId
 * Step 2: Verify the registration response from the worker's phone.
 * Body: the raw response from the browser's navigator.credentials.create()
 */
async function verifyRegistration(req, res, next) {
  try {
    const { workerId } = req.params;
    const { body: registrationResponse, deviceName } = req.body;

    // Get the stored challenge
    const stored = challengeStore.get(workerId);
    if (!stored || Date.now() > stored.expires) {
      return res.status(400).json({ error: 'Registration challenge expired. Please try again.' });
    }

    // Verify the response
    const verification = await verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge: stored.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verification.verified) {
      return res.status(400).json({ error: 'Biometric registration failed. Please try again.' });
    }

    const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

    // Save the credential to the database
    await db.query(
      `INSERT INTO worker_credentials
         (worker_id, credential_id, public_key, sign_count, device_name)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (credential_id) DO UPDATE
         SET sign_count = EXCLUDED.sign_count`,
      [
        workerId,
        Buffer.from(credentialID).toString('base64url'),
        Buffer.from(credentialPublicKey).toString('base64url'),
        counter,
        deviceName || 'My Phone',
      ]
    );

    // Clean up the challenge
    challengeStore.delete(workerId);

    res.json({ message: 'Device registered successfully. Biometrics are now set up.' });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// AUTHENTICATION (every time a worker checks in)
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/webauthn/authenticate/options/:workerId
 * Step 1: Generate authentication options for the worker's phone.
 */
async function getAuthenticationOptions(req, res, next) {
  try {
    const { workerId } = req.params;

    // Get the worker's registered credentials
    const credResult = await db.query(
      'SELECT credential_id FROM worker_credentials WHERE worker_id = $1 AND is_active = true',
      [workerId]
    );

    if (credResult.rows.length === 0) {
      return res.status(404).json({
        error: 'No registered device found for this worker. Please register first.',
      });
    }

    const allowCredentials = credResult.rows.map((row) => ({
      id: row.credential_id,
      type: 'public-key',
    }));

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials,
      userVerification: 'required',
    });

    // Save the challenge
    challengeStore.set(workerId, {
      challenge: options.challenge,
      expires: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    res.json(options);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/webauthn/authenticate/verify/:workerId
 * Step 2: Verify the authentication response from the worker's phone.
 * Returns { verified: true/false } which is then used in the check-in request.
 */
async function verifyAuthentication(req, res, next) {
  try {
    const { workerId } = req.params;
    const authResponse = req.body;

    // Get the stored challenge
    const stored = challengeStore.get(workerId);
    if (!stored || Date.now() > stored.expires) {
      return res.status(400).json({ error: 'Authentication challenge expired. Please try again.' });
    }

    // Find the matching credential in the database
    const credResult = await db.query(
      `SELECT * FROM worker_credentials
       WHERE worker_id = $1 AND credential_id = $2 AND is_active = true`,
      [workerId, authResponse.id]
    );

    if (credResult.rows.length === 0) {
      return res.status(404).json({ error: 'Credential not found.' });
    }

    const cred = credResult.rows[0];

    // Verify the response
    const verification = await verifyAuthenticationResponse({
      response: authResponse,
      expectedChallenge: stored.challenge,
      expectedOrigin: ORIGIN,
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

    // Update the sign count (security measure against cloning)
    await db.query(
      'UPDATE worker_credentials SET sign_count = $1 WHERE id = $2',
      [verification.authenticationInfo.newCounter, cred.id]
    );

    // Clean up the challenge
    challengeStore.delete(workerId);

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
