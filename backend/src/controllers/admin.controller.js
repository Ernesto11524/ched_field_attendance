const db = require('../config/db');
const bcrypt = require('bcryptjs');

/**
 * GET /api/admin/dashboard
 * Returns summary stats for today. Admins only.
 */
async function getDashboard(req, res, next) {
  try {
    // Total active workers
    const workersResult = await db.query(
      `SELECT COUNT(*) AS total FROM workers WHERE is_active = true`
    );

    // Today's check-in stats
    const todayResult = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'on_time')          AS on_time,
         COUNT(*) FILTER (WHERE status = 'late')             AS late,
         COUNT(*) FILTER (WHERE status = 'outside_geofence') AS outside_geofence,
         COUNT(*) FILTER (WHERE status = 'biometric_failed') AS biometric_failed,
         COUNT(*) FILTER (WHERE status = 'overridden')       AS overridden,
         COUNT(*)                                            AS total_checkins
       FROM checkins
       WHERE checked_in_date = CURRENT_DATE`
    );

    // Per-site summary for today
    const siteResult = await db.query(
      `SELECT
         ws.name AS site_name,
         COUNT(*) FILTER (WHERE c.status = 'on_time')   AS on_time,
         COUNT(*) FILTER (WHERE c.status != 'on_time')  AS issues,
         COUNT(*)                                        AS total
       FROM checkins c
       JOIN work_sites ws ON ws.id = c.site_id
       WHERE c.checked_in_date = CURRENT_DATE
       GROUP BY ws.id, ws.name
       ORDER BY ws.name`
    );

    res.json({
      date: new Date().toISOString().slice(0, 10),
      total_workers: parseInt(workersResult.rows[0].total),
      today: todayResult.rows[0],
      by_site: siteResult.rows,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/report
 * Returns attendance report for a date range. Admins only.
 * Query params: ?from=YYYY-MM-DD&to=YYYY-MM-DD&site_id=xxx
 */
async function getAttendanceReport(req, res, next) {
  try {
    const { from, to, site_id } = req.query;

    const fromDate = from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const toDate = to || new Date().toISOString().slice(0, 10);

    let query = `
      SELECT
        c.checked_in_date AS date,
        w.full_name AS worker_name,
        w.employee_id,
        ws.name AS site_name,
        cw.label AS window,
        c.status,
        c.location_verified,
        c.biometric_verified,
        c.distance_from_site_m,
        c.checked_in_at
      FROM checkins c
      JOIN workers w ON w.id = c.worker_id
      JOIN work_sites ws ON ws.id = c.site_id
      LEFT JOIN checkin_windows cw ON cw.id = c.window_id
      WHERE c.checked_in_date BETWEEN $1 AND $2
    `;

    const params = [fromDate, toDate];

    if (site_id) {
      params.push(site_id);
      query += ` AND c.site_id = $${params.length}`;
    }

    query += ` ORDER BY c.checked_in_date DESC, w.full_name ASC, c.checked_in_at ASC`;

    const result = await db.query(query, params);

    res.json({
      report: result.rows,
      from: fromDate,
      to: toDate,
      total_records: result.rows.length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/create-admin
 * Creates a new admin or supervisor account. Super-admins only.
 * Body: { full_name, email, password, role }
 */
async function createAdminUser(req, res, next) {
  try {
    const { full_name, email, password, role } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'full_name, email, and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const validRoles = ['admin', 'supervisor'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Role must be either admin or supervisor.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO admin_users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, email, role, created_at`,
      [full_name, email, passwordHash, role || 'supervisor']
    );

    res.status(201).json({
      message: 'Admin user created successfully.',
      user: result.rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An admin with this email already exists.' });
    }
    next(err);
  }
}

module.exports = { getDashboard, getAttendanceReport, createAdminUser };
