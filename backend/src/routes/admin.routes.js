const express = require('express');
const router = express.Router();
const { getDashboard, getAttendanceReport, createAdminUser } = require('../controllers/admin.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

router.use(authenticate);
router.use(requireAdmin);

// GET  /api/admin/dashboard  - today's summary stats
router.get('/dashboard', getDashboard);

// GET  /api/admin/report     - attendance report (?from=&to=&site_id=)
router.get('/report', getAttendanceReport);

// POST /api/admin/create-admin - create a new admin/supervisor account
router.post('/create-admin', createAdminUser);

module.exports = router;
