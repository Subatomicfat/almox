const express = require('express');
const auditController = require('../controllers/audit.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/rbac.middleware');

const router = express.Router();

router.use(authenticate, authorize('admin'));
router.get('/', auditController.list);

module.exports = router;
