const db = require('../config/db');

/**
 * GET /api/sites
 * Returns all active work sites with their check-in windows.
 */
async function getAllSites(req, res, next) {
  try {
    const result = await db.query(
      `SELECT 
         ws.id, ws.name, ws.address, ws.latitude, ws.longitude,
         ws.geofence_radius_m, ws.is_active, ws.created_at,
         json_agg(
           json_build_object(
             'id', cw.id,
             'label', cw.label,
             'window_open', cw.window_open,
             'window_close', cw.window_close
           ) ORDER BY cw.window_open
         ) FILTER (WHERE cw.id IS NOT NULL) AS checkin_windows
       FROM work_sites ws
       LEFT JOIN checkin_windows cw ON cw.site_id = ws.id AND cw.is_active = true
       WHERE ws.is_active = true
       GROUP BY ws.id
       ORDER BY ws.name ASC`
    );

    res.json({ sites: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/sites/:id
 * Returns a single site by ID.
 */
async function getSiteById(req, res, next) {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT 
         ws.id, ws.name, ws.address, ws.latitude, ws.longitude,
         ws.geofence_radius_m, ws.is_active,
         json_agg(
           json_build_object(
             'id', cw.id,
             'label', cw.label,
             'window_open', cw.window_open,
             'window_close', cw.window_close
           ) ORDER BY cw.window_open
         ) FILTER (WHERE cw.id IS NOT NULL) AS checkin_windows
       FROM work_sites ws
       LEFT JOIN checkin_windows cw ON cw.site_id = ws.id AND cw.is_active = true
       WHERE ws.id = $1
       GROUP BY ws.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Site not found.' });
    }

    res.json({ site: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/sites
 * Creates a new work site. Admins only.
 * Body: { name, address, latitude, longitude, geofence_radius_m }
 */
async function createSite(req, res, next) {
  try {
    const { name, address, latitude, longitude, geofence_radius_m } = req.body;

    if (!name || !address || latitude == null || longitude == null) {
      return res.status(400).json({
        error: 'name, address, latitude, and longitude are required.',
      });
    }

    const result = await db.query(
      `INSERT INTO work_sites (name, address, latitude, longitude, geofence_radius_m)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, address, latitude, longitude, geofence_radius_m || 100]
    );

    res.status(201).json({
      message: 'Site created successfully.',
      site: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/sites/:id
 * Updates a work site. Admins only.
 */
async function updateSite(req, res, next) {
  try {
    const { id } = req.params;
    const { name, address, latitude, longitude, geofence_radius_m } = req.body;

    const result = await db.query(
      `UPDATE work_sites
       SET name              = COALESCE($1, name),
           address           = COALESCE($2, address),
           latitude          = COALESCE($3, latitude),
           longitude         = COALESCE($4, longitude),
           geofence_radius_m = COALESCE($5, geofence_radius_m)
       WHERE id = $6
       RETURNING *`,
      [name, address, latitude, longitude, geofence_radius_m, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Site not found.' });
    }

    res.json({ message: 'Site updated.', site: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/sites/:id/windows
 * Adds a check-in window to a site. Admins only.
 * Body: { label, window_open, window_close }
 * Time format: "HH:MM" e.g. "07:30"
 */
async function addCheckinWindow(req, res, next) {
  try {
    const { id } = req.params;
    const { label, window_open, window_close } = req.body;

    if (!label || !window_open || !window_close) {
      return res.status(400).json({
        error: 'label, window_open, and window_close are required.',
      });
    }

    const result = await db.query(
      `INSERT INTO checkin_windows (site_id, label, window_open, window_close)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, label, window_open, window_close]
    );

    res.status(201).json({
      message: 'Check-in window added.',
      window: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/sites/windows/:windowId
 * Deactivates a check-in window. Admins only.
 */
async function removeCheckinWindow(req, res, next) {
  try {
    const { windowId } = req.params;

    await db.query(
      `UPDATE checkin_windows SET is_active = false WHERE id = $1`,
      [windowId]
    );

    res.json({ message: 'Check-in window removed.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllSites,
  getSiteById,
  createSite,
  updateSite,
  addCheckinWindow,
  removeCheckinWindow,
};
