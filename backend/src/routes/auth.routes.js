const express = require('express');
const authController = require('../controllers/auth.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const { loginLimiter } = require('../middlewares/rateLimiter.middleware');
const { loginRules, registerRules } = require('../validators/auth.validator');

const router = express.Router();

router.post('/login', loginLimiter, loginRules, validate, authController.login);
router.post('/register', authenticate, authorize('admin'), registerRules, validate, authController.register);
router.post('/refresh-token', authController.refresh);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
