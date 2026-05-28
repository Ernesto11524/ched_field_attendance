const db  = require('../config/db');
const jwt = require('jsonwebtoken');

async function getAllWorkers(req, res, next) {
  try {
    const result = await db.query(
      `SELECT w.id, w.full_name, w.phone_number, w.email, w.employee_id,
         w.is_active, w.created_at,
         json_agg(json_build_object('site_id',ws.id,'site_name',ws.name,'assignment_id',wsa.id,'start_date',wsa.start_date,'end_date',wsa.end_date))
         FILTER (WHERE ws.id IS NOT NULL) AS sites
       FROM workers w
       LEFT JOIN worker_site_assignments wsa ON wsa.worker_id = w.id AND wsa.is_active = true
       LEFT JOIN work_sites ws ON ws.id = wsa.site_id
       WHERE w.is_active = true GROUP BY w.id ORDER BY w.full_name ASC`
    );
    res.json({ workers: result.rows });
  } catch(err) { next(err); }
}

async function getWorkerById(req, res, next) {
  try {
    const result = await db.query(
      `SELECT w.id, w.full_name, w.phone_number, w.email, w.employee_id,
         w.is_active, w.created_at,
         json_agg(json_build_object('site_id',ws.id,'site_name',ws.name))
         FILTER (WHERE ws.id IS NOT NULL) AS sites
       FROM workers w
       LEFT JOIN worker_site_assignments wsa ON wsa.worker_id = w.id AND wsa.is_active = true
       LEFT JOIN work_sites ws ON ws.id = wsa.site_id
       WHERE w.id = $1 GROUP BY w.id`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Worker not found.' });
    res.json({ worker: result.rows[0] });
  } catch(err) { next(err); }
}

/**
 * GET /api/workers/by-employee-id/:employeeId
 * Worker login — enforces single device restriction.
 * If worker has a registered device, only allows login if the
 * credential was registered (device check happens on check-in).
 * Returns worker info + JWT token.
 */
async function getWorkerByEmployeeId(req, res, next) {
  try {
    const result = await db.query(
      `SELECT id, full_name, phone_number, email, employee_id 
       FROM workers WHERE employee_id = $1 AND is_active = true`,
      [req.params.employeeId.toUpperCase()]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'No worker found with that Employee ID.' });
    }

    const worker = result.rows[0];

    // Check if this worker has any registered devices
    const credResult = await db.query(
      `SELECT credential_id, device_name FROM worker_credentials 
       WHERE worker_id = $1 AND is_active = true LIMIT 1`,
      [worker.id]
    );

    const hasRegisteredDevice = credResult.rows.length > 0;

    // Issue JWT token
    const token = jwt.sign(
      { id: worker.id, employee_id: worker.employee_id, role: 'worker' },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      worker,
      token,
      hasRegisteredDevice,
      // If device is registered, the front end will verify on check-in
      registeredDevice: hasRegisteredDevice ? credResult.rows[0].device_name : null,
    });
  } catch(err) { next(err); }
}

async function getAssignedSite(req, res, next) {
  try {
    const result = await db.query(
      `SELECT ws.id, ws.name, ws.address, ws.latitude, ws.longitude, ws.geofence_radius_m,
         json_agg(json_build_object('id',cw.id,'label',cw.label,'window_open',cw.window_open,'window_close',cw.window_close) ORDER BY cw.window_open)
         FILTER (WHERE cw.id IS NOT NULL) AS checkin_windows
       FROM worker_site_assignments wsa
       JOIN work_sites ws ON ws.id = wsa.site_id
       LEFT JOIN checkin_windows cw ON cw.site_id = ws.id AND cw.is_active = true
       WHERE wsa.worker_id = $1 AND wsa.is_active = true
         AND wsa.start_date <= CURRENT_DATE AND (wsa.end_date IS NULL OR wsa.end_date >= CURRENT_DATE)
       GROUP BY ws.id LIMIT 1`,
      [req.params.id]
    );
    res.json({ site: result.rows[0] || null });
  } catch(err) { next(err); }
}

async function getWorkerCredentialCount(req, res, next) {
  try {
    const result = await db.query(
      `SELECT COUNT(*) as count FROM worker_credentials WHERE worker_id = $1 AND is_active = true`,
      [req.params.id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch(err) { next(err); }
}

async function createWorker(req, res, next) {
  try {
    const { full_name, phone_number, email, employee_id } = req.body;
    if (!full_name || !phone_number || !employee_id)
      return res.status(400).json({ error: 'full_name, phone_number, and employee_id are required.' });
    const result = await db.query(
      `INSERT INTO workers (full_name, phone_number, email, employee_id) VALUES ($1,$2,$3,$4)
       RETURNING id, full_name, phone_number, email, employee_id, created_at`,
      [full_name, phone_number, email || null, employee_id]
    );
    res.status(201).json({ message: 'Worker created.', worker: result.rows[0] });
  } catch(err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Employee ID already exists.' });
    next(err);
  }
}

async function updateWorker(req, res, next) {
  try {
    const { full_name, phone_number, email } = req.body;
    const result = await db.query(
      `UPDATE workers SET full_name=COALESCE($1,full_name), phone_number=COALESCE($2,phone_number), email=COALESCE($3,email) WHERE id=$4
       RETURNING id, full_name, phone_number, email, employee_id`,
      [full_name, phone_number, email, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Worker not found.' });
    res.json({ message: 'Worker updated.', worker: result.rows[0] });
  } catch(err) { next(err); }
}

async function deactivateWorker(req, res, next) {
  try {
    const result = await db.query(
      `UPDATE workers SET is_active=false WHERE id=$1 RETURNING id`, [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Worker not found.' });
    res.json({ message: 'Worker deactivated.' });
  } catch(err) { next(err); }
}

async function assignWorkerToSite(req, res, next) {
  try {
    const { site_id, start_date, end_date } = req.body;
    if (!site_id || !start_date)
      return res.status(400).json({ error: 'site_id and start_date are required.' });
    await db.query(
      `UPDATE worker_site_assignments SET is_active=false WHERE worker_id=$1 AND site_id=$2`,
      [req.params.id, site_id]
    );
    const result = await db.query(
      `INSERT INTO worker_site_assignments (worker_id, site_id, start_date, end_date) VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.params.id, site_id, start_date, end_date || null]
    );
    res.status(201).json({ message: 'Worker assigned.', assignment: result.rows[0] });
  } catch(err) { next(err); }
}

/**
 * DELETE /api/workers/:id/device
 * Admin can reset a worker's registered device (forces re-registration).
 * Use this when a worker loses their phone.
 */
async function resetWorkerDevice(req, res, next) {
  try {
    await db.query(
      `UPDATE worker_credentials SET is_active = false WHERE worker_id = $1`,
      [req.params.id]
    );
    res.json({ message: 'Device registration reset. Worker must register their device again.' });
  } catch(err) { next(err); }
}

module.exports = {
  getAllWorkers,
  getWorkerById,
  getWorkerByEmployeeId,
  getAssignedSite,
  getWorkerCredentialCount,
  createWorker,
  updateWorker,
  deactivateWorker,
  assignWorkerToSite,
  resetWorkerDevice,
};
