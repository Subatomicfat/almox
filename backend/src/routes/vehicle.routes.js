const express = require('express');
const vehicleController = require('../controllers/vehicle.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const { createRules, updateRules } = require('../validators/vehicle.validator');

const router = express.Router();

router.use(authenticate);

router.get('/', vehicleController.list);
router.get('/:id/consumo', vehicleController.getConsumo);
router.post('/', authorize('admin', 'gestor'), createRules, validate, vehicleController.create);
router.put('/:id', authorize('admin', 'gestor'), updateRules, validate, vehicleController.update);

module.exports = router;
