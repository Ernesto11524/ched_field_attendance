const express = require('express');
const router = express.Router();
const {
  getAllWorkers,
  getWorkerById,
  getWorkerByEmployeeId,
  getAssignedSite,
  createWorker,
  updateWorker,
  deactivateWorker,
  assignWorkerToSite,
  hasRegisteredDevice,
} = require('../controllers/worker.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

// Public route — used by the worker login screen (no JWT needed)
router.get('/by-employee-id/:employeeId', getWorkerByEmployeeId);

// All routes below require a valid JWT
router.use(authenticate);

// GET  /api/workers                    - list all workers
router.get('/', getAllWorkers);

// GET  /api/workers/:id/assigned-site  - get this worker's assigned site (used by worker app)
router.get('/:id/assigned-site', getAssignedSite);

router.get('/:id/has-device', hasRegisteredDevice);

// GET  /api/workers/:id                - get one worker
router.get('/:id', getWorkerById);

// POST /api/workers                    - create worker (admin only)
router.post('/', requireAdmin, createWorker);

// PUT  /api/workers/:id                - update worker (admin only)
router.put('/:id', requireAdmin, updateWorker);

// DELETE /api/workers/:id              - deactivate worker (admin only)
router.delete('/:id', requireAdmin, deactivateWorker);

// POST /api/workers/:id/assign         - assign worker to site (admin only)
router.post('/:id/assign', requireAdmin, assignWorkerToSite);

module.exports = router;
