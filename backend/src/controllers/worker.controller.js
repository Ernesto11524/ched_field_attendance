const db = require('../config/db');

/**
 * GET /api/workers
 * Returns all active workers. Admins only.
 */
async function getAllWorkers(req, res, next) {
  try {
    const result = await db.query(
      `SELECT 
         w.id, w.full_name, w.phone_number, w.email, w.employee_id,
         w.is_active, w.created_at,
         json_agg(
           json_build_object(
             'site_id', ws.id,
             'site_name', ws.name,
             'assignment_id', wsa.id,
             'start_date', wsa.start_date,
             'end_date', wsa.end_date
           )
         ) FILTER (WHERE ws.id IS NOT NULL) AS sites
       FROM workers w
       LEFT JOIN worker_site_assignments wsa ON wsa.worker_id = w.id AND wsa.is_active = true
       LEFT JOIN work_sites ws ON ws.id = wsa.site_id
       WHERE w.is_active = true
       GROUP BY w.id
       ORDER BY w.full_name ASC`,
    );

    res.json({ workers: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/workers/:id
 * Returns a single worker by ID.
 */
async function getWorkerById(req, res, next) {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT 
         w.id, w.full_name, w.phone_number, w.email, w.employee_id,
         w.is_active, w.created_at
       FROM workers w
       WHERE w.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Worker not found.' });
    }

    res.json({ worker: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/workers
 * Creates a new worker. Admins only.
 * Body: { full_name, phone_number, email, employee_id }
 */
async function createWorker(req, res, next) {
  try {
    const { full_name, phone_number, email, employee_id } = req.body;

    if (!full_name || !phone_number || !employee_id) {
      return res.status(400).json({
        error: 'full_name, phone_number, and employee_id are required.',
      });
    }

    const result = await db.query(
      `INSERT INTO workers (full_name, phone_number, email, employee_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, phone_number, email, employee_id, created_at`,
      [full_name, phone_number, email || null, employee_id]
    );

    res.status(201).json({
      message: 'Worker created successfully.',
      worker: result.rows[0],
    });
  } catch (err) {
    // Duplicate employee_id
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A worker with this employee ID already exists.' });
    }
    next(err);
  }
}

/**
 * PUT /api/workers/:id
 * Updates a worker's details. Admins only.
 * Body: { full_name, phone_number, email }
 */
async function updateWorker(req, res, next) {
  try {
    const { id } = req.params;
    const { full_name, phone_number, email } = req.body;

    const result = await db.query(
      `UPDATE workers
       SET full_name = COALESCE($1, full_name),
           phone_number = COALESCE($2, phone_number),
           email = COALESCE($3, email)
       WHERE id = $4
       RETURNING id, full_name, phone_number, email, employee_id`,
      [full_name, phone_number, email, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Worker not found.' });
    }

    res.json({ message: 'Worker updated.', worker: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/workers/:id
 * Soft-deletes a worker (sets is_active = false). Admins only.
 */
async function deactivateWorker(req, res, next) {
  try {
    const { id } = req.params;

    const result = await db.query(
      `UPDATE workers SET is_active = false WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Worker not found.' });
    }

    res.json({ message: 'Worker deactivated successfully.' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/workers/:id/assign
 * Assigns a worker to a work site. Admins only.
 * Body: { site_id, start_date, end_date (optional) }
 */
async function assignWorkerToSite(req, res, next) {
  try {
    const { id } = req.params;
    const { site_id, start_date, end_date } = req.body;

    if (!site_id || !start_date) {
      return res.status(400).json({ error: 'site_id and start_date are required.' });
    }

    // Deactivate any existing assignment for this worker+site
    await db.query(
      `UPDATE worker_site_assignments
       SET is_active = false
       WHERE worker_id = $1 AND site_id = $2`,
      [id, site_id]
    );

    const result = await db.query(
      `INSERT INTO worker_site_assignments (worker_id, site_id, start_date, end_date)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, site_id, start_date, end_date || null]
    );

    res.status(201).json({
      message: 'Worker assigned to site successfully.',
      assignment: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/workers/by-employee-id/:employeeId
 * Looks up a worker by their employee ID — used on the login screen.
 * Returns a short-lived token for the worker session.
 */
async function getWorkerByEmployeeId(req, res, next) {
  try {
    const { employeeId } = req.params;
    const jwt = require('jsonwebtoken');

    const result = await db.query(
      `SELECT id, full_name, phone_number, email, employee_id
       FROM workers WHERE employee_id = $1 AND is_active = true`,
      [employeeId.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No worker found with that Employee ID. Please check and try again.' });
    }

    const worker = result.rows[0];

    // Issue a worker-scoped JWT (not admin)
    const token = jwt.sign(
      { id: worker.id, employee_id: worker.employee_id, role: 'worker' },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({ worker, token });
  } catch (err) {
    next(err);
  }
}

async function getAssignedSite(req, res, next) {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT
         ws.id, ws.name, ws.address, ws.latitude, ws.longitude,
         ws.geofence_radius_m,
         json_agg(
           json_build_object(
             'id', cw.id,
             'label', cw.label,
             'window_open', cw.window_open,
             'window_close', cw.window_close
           ) ORDER BY cw.window_open
         ) FILTER (WHERE cw.id IS NOT NULL) AS checkin_windows
       FROM worker_site_assignments wsa
       JOIN work_sites ws ON ws.id = wsa.site_id
       LEFT JOIN checkin_windows cw ON cw.site_id = ws.id AND cw.is_active = true
       WHERE wsa.worker_id = $1
         AND wsa.is_active = true
         AND wsa.start_date <= CURRENT_DATE
         AND (wsa.end_date IS NULL OR wsa.end_date >= CURRENT_DATE)
       GROUP BY ws.id
       LIMIT 1`,
      [id]
    );

    res.json({ site: result.rows[0] || null });
  } catch (err) {
    next(err);
  }
}

async function hasRegisteredDevice(req, res, next) {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT COUNT(*) as count FROM worker_credentials 
       WHERE worker_id = $1 AND is_active = true`,
      [id]
    );
    const registered = parseInt(result.rows[0].count) > 0;
    res.json({ registered });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllWorkers,
  getWorkerById,
  getWorkerByEmployeeId,
  getAssignedSite,
  createWorker,
  updateWorker,
  deactivateWorker,
  assignWorkerToSite,
};
