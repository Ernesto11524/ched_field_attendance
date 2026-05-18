const express = require('express');
const router = express.Router();
const {
  submitCheckin,
  getTodaysCheckins,
  getWorkerCheckins,
  overrideCheckin,
} = require('../controllers/checkin.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

// POST /api/checkins                      - submit a check-in (from worker's phone)
router.post('/', submitCheckin);

// GET  /api/checkins/today                - today's check-ins (admin)
router.get('/today', getTodaysCheckins);

// GET  /api/checkins/worker/:workerId     - a worker's history
router.get('/worker/:workerId', getWorkerCheckins);

// POST /api/checkins/:id/override         - supervisor override
router.post('/:id/override', overrideCheckin);

module.exports = router;
