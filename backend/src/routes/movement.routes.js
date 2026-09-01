const express = require('express');
const movementController = require('../controllers/movement.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const { createRules, adjustRules } = require('../validators/movement.validator');

const router = express.Router();

router.use(authenticate);

router.get('/', movementController.list);
router.get('/:id', movementController.getById);

// Operador pode registrar movimentações (é a função principal do cargo).
router.post('/', authorize('admin', 'gestor', 'operador'), createRules, validate, movementController.create);

// Correção só por admin/gestor, e sempre via ajuste — nunca edição/exclusão
// da movimentação original (ver comentário em movement.repository.js).
router.put('/:id', authorize('admin', 'gestor'), adjustRules, validate, movementController.adjust);

module.exports = router;
