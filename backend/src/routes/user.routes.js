const express = require('express');
const userController = require('../controllers/user.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const { registerRules, updateUserRules } = require('../validators/auth.validator');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/', userController.list);
router.get('/:id', userController.getById);
router.post('/', registerRules, validate, userController.create);
router.put('/:id', updateUserRules, validate, userController.update);
router.delete('/:id', userController.remove);

module.exports = router;
