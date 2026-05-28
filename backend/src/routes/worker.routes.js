const express = require('express');
const router  = express.Router();
const {
  getAllWorkers, getWorkerById, getWorkerByEmployeeId,
  getAssignedSite, getWorkerCredentialCount,
  createWorker, updateWorker, deactivateWorker,
  assignWorkerToSite, resetWorkerDevice,
} = require('../controllers/worker.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

// Public — used by worker login screen (no JWT needed)
router.get('/by-employee-id/:employeeId', getWorkerByEmployeeId);

// All routes below require JWT
router.use(authenticate);

router.get('/',                    getAllWorkers);
router.get('/:id/assigned-site',   getAssignedSite);
router.get('/:id/credentials',     getWorkerCredentialCount);
router.get('/:id',                 getWorkerById);
router.post('/',                   requireAdmin, createWorker);
router.put('/:id',                 requireAdmin, updateWorker);
router.delete('/:id',              requireAdmin, deactivateWorker);
router.post('/:id/assign',         requireAdmin, assignWorkerToSite);
// Reset device — admin only (when worker loses phone)
router.delete('/:id/device',       requireAdmin, resetWorkerDevice);

module.exports = router;
