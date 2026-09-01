const express = require('express');
const assetController = require('../controllers/asset.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const { createRules, updateRules } = require('../validators/asset.validator');

const router = express.Router();

router.use(authenticate);

router.get('/', assetController.list);
router.post('/', authorize('admin', 'gestor'), createRules, validate, assetController.create);
router.put('/:id', authorize('admin', 'gestor'), updateRules, validate, assetController.update);

module.exports = router;
