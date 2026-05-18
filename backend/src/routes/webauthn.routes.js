const express = require('express');
const router = express.Router();
const {
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
} = require('../controllers/webauthn.controller');

// These routes are called directly from the worker's phone
// No JWT required — the worker authenticates via biometrics

// Device registration (first time setup)
router.get('/register/options/:workerId', getRegistrationOptions);
router.post('/register/verify/:workerId', verifyRegistration);

// Biometric authentication (every check-in)
router.get('/authenticate/options/:workerId', getAuthenticationOptions);
router.post('/authenticate/verify/:workerId', verifyAuthentication);

module.exports = router;
