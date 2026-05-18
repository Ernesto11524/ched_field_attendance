const express = require('express');
const router = express.Router();
const {
  getAllSites,
  getSiteById,
  createSite,
  updateSite,
  addCheckinWindow,
  removeCheckinWindow,
} = require('../controllers/site.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

router.use(authenticate);

// GET  /api/sites            - list all sites
router.get('/', getAllSites);

// GET  /api/sites/:id        - get one site
router.get('/:id', getSiteById);

// POST /api/sites            - create site (admin only)
router.post('/', requireAdmin, createSite);

// PUT  /api/sites/:id        - update site (admin only)
router.put('/:id', requireAdmin, updateSite);

// POST /api/sites/:id/windows         - add check-in window (admin only)
router.post('/:id/windows', requireAdmin, addCheckinWindow);

// DELETE /api/sites/windows/:windowId - remove check-in window (admin only)
router.delete('/windows/:windowId', requireAdmin, removeCheckinWindow);

module.exports = router;
