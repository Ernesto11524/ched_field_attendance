const express = require('express');
const router = express.Router();
const { login, changePassword } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/change-password  (must be logged in)
router.post('/change-password', authenticate, changePassword);

module.exports = router;
