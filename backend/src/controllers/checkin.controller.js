const db = require('../config/db');
const { haversineDistance } = require('../utils/haversine');

/**
 * POST /api/checkins
 * Records a worker check-in. Called from the worker's phone.
 *
 * Body: {
 *   worker_id,
 *   site_id,
 *   latitude,
 *   longitude,
 *   biometric_verified,   -- true/false (result from WebAuthn on the device)
 *   credential_id         -- the worker's registered credential UUID
 * }
 */
async function submitCheckin(req, res, next) {
  try {
    const {
      worker_id,
      site_id,
      latitude,
      longitude,
      biometric_verified,
      credential_id,
    } = req.body;

    // ── 1. Validate required fields ───────────────────────
    if (!worker_id || !site_id || latitude == null || longitude == null) {
      return res.status(400).json({
        error: 'worker_id, site_id, latitude, and longitude are required.',
      });
    }

    // ── 2. Check worker is assigned to this site ──────────
    const assignmentCheck = await db.query(
      `SELECT id FROM worker_site_assignments
       WHERE worker_id = $1 AND site_id = $2 AND is_active = true
       AND start_date <= CURRENT_DATE
       AND (end_date IS NULL OR end_date >= CURRENT_DATE)`,
      [worker_id, site_id]
    );

    if (assignmentCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'This worker is not assigned to this site.',
      });
    }

    // ── 3. Get the site's GPS location and geofence radius ─
    const siteResult = await db.query(
      `SELECT latitude, longitude, geofence_radius_m FROM work_sites WHERE id = $1`,
      [site_id]
    );

    if (siteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Site not found.' });
    }

    const site = siteResult.rows[0];

    // ── 4. Calculate distance from site ──────────────────
    const distance = haversineDistance(
      latitude,
      longitude,
      site.latitude,
      site.longitude
    );

    const location_verified = distance <= site.geofence_radius_m;

    // ── 5. Find the active check-in window for right now ──
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"

    const windowResult = await db.query(
      `SELECT id, label FROM checkin_windows
       WHERE site_id = $1
       AND is_active = true
       AND window_open <= $2::TIME
       AND window_close >= $2::TIME`,
      [site_id, currentTime]
    );

    const window = windowResult.rows[0] || null;

    // ── 6. Determine check-in status ─────────────────────
    let status;

    if (!location_verified) {
      status = 'outside_geofence';
    } else if (!biometric_verified) {
      status = 'biometric_failed';
    } else if (!window) {
      status = 'late'; // checked in but outside any window
    } else {
      status = 'on_time';
    }

    // ── 7. Save the check-in record ───────────────────────
    const result = await db.query(
      `INSERT INTO checkins (
         worker_id, site_id, window_id, credential_id,
         latitude, longitude, distance_from_site_m,
         location_verified, biometric_verified,
         status, checked_in_date
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_DATE)
       RETURNING *`,
      [
        worker_id,
        site_id,
        window ? window.id : null,
        credential_id || null,
        latitude,
        longitude,
        Math.round(distance),
        location_verified,
        biometric_verified || false,
        status,
      ]
    );

    const checkin = result.rows[0];

    // ── 8. Return the result ──────────────────────────────
    res.status(201).json({
      message: getStatusMessage(status),
      checkin: {
        id: checkin.id,
        status: checkin.status,
        location_verified: checkin.location_verified,
        biometric_verified: checkin.biometric_verified,
        distance_from_site_m: checkin.distance_from_site_m,
        window: window ? window.label : null,
        checked_in_at: checkin.checked_in_at,
      },
    });
  } catch (err) {
    // Duplicate check-in for the same window today
    if (err.code === '23505') {
      return res.status(409).json({
        error: 'You have already checked in for this time window today.',
      });
    }
    next(err);
  }
}

/**
 * GET /api/checkins/today
 * Returns all check-ins for today. Admins only.
 * Optional query param: ?site_id=xxx
 */
async function getTodaysCheckins(req, res, next) {
  try {
    const { site_id } = req.query;

    let query = `
      SELECT 
        c.id, c.status, c.location_verified, c.biometric_verified,
        c.distance_from_site_m, c.checked_in_at,
        w.full_name AS worker_name, w.employee_id,
        ws.name AS site_name,
        cw.label AS window_label
      FROM checkins c
      JOIN workers w ON w.id = c.worker_id
      JOIN work_sites ws ON ws.id = c.site_id
      LEFT JOIN checkin_windows cw ON cw.id = c.window_id
      WHERE c.checked_in_date = CURRENT_DATE
    `;

    const params = [];

    if (site_id) {
      params.push(site_id);
      query += ` AND c.site_id = $${params.length}`;
    }

    query += ` ORDER BY c.checked_in_at DESC`;

    const result = await db.query(query, params);

    res.json({ checkins: result.rows, date: new Date().toISOString().slice(0, 10) });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/checkins/worker/:workerId
 * Returns check-in history for a specific worker.
 * Optional query params: ?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
async function getWorkerCheckins(req, res, next) {
  try {
    const { workerId } = req.params;
    const { from, to } = req.query;

    const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // last 30 days
    const toDate = to || new Date().toISOString().slice(0, 10);

    const result = await db.query(
      `SELECT 
         c.id, c.status, c.location_verified, c.biometric_verified,
         c.distance_from_site_m, c.checked_in_at, c.checked_in_date,
         ws.name AS site_name,
         cw.label AS window_label
       FROM checkins c
       JOIN work_sites ws ON ws.id = c.site_id
       LEFT JOIN checkin_windows cw ON cw.id = c.window_id
       WHERE c.worker_id = $1
       AND c.checked_in_date BETWEEN $2 AND $3
       ORDER BY c.checked_in_at DESC`,
      [workerId, fromDate, toDate]
    );

    res.json({ checkins: result.rows, worker_id: workerId, from: fromDate, to: toDate });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/checkins/:id/override
 * Supervisor manually approves a failed check-in.
 * Body: { reason }
 */
async function overrideCheckin(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'A reason is required for the override.' });
    }

    // Update the check-in status
    await db.query(
      `UPDATE checkins SET status = 'overridden' WHERE id = $1`,
      [id]
    );

    // Record the override
    await db.query(
      `INSERT INTO supervisor_overrides (checkin_id, supervisor_id, reason)
       VALUES ($1, $2, $3)`,
      [id, req.user.id, reason]
    );

    res.json({ message: 'Check-in approved by supervisor.' });
  } catch (err) {
    next(err);
  }
}

// Helper to return a user-friendly message based on status
function getStatusMessage(status) {
  const messages = {
    on_time: 'Check-in successful! You are on time.',
    late: 'Check-in recorded but you are outside the check-in window.',
    outside_geofence: 'Check-in failed. You are not at the work site location.',
    biometric_failed: 'Check-in failed. Biometric verification did not pass.',
  };
  return messages[status] || 'Check-in recorded.';
}

module.exports = {
  submitCheckin,
  getTodaysCheckins,
  getWorkerCheckins,
  overrideCheckin,
};
