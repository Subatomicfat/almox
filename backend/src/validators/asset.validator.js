const { body } = require('express-validator');

const STATUSES = ['disponivel', 'instalado', 'manutencao'];

const createRules = [
  body('codigo').isString().trim().isLength({ min: 1, max: 30 }).withMessage('Código obrigatório.'),
  body('nome').isString().trim().isLength({ min: 1, max: 160 }).withMessage('Nome obrigatório.'),
  body('tipo').isString().trim().isLength({ min: 1, max: 60 }).withMessage('Tipo obrigatório.'),
  body('localizacao').optional().isString().trim().isLength({ max: 160 }),
  body('status').optional().isIn(STATUSES).withMessage('Status inválido.')
];

const updateRules = [
  body('nome').optional().isString().trim().isLength({ min: 1, max: 160 }),
  body('tipo').optional().isString().trim().isLength({ min: 1, max: 60 }),
  body('localizacao').optional().isString().trim().isLength({ max: 160 }),
  body('status').optional().isIn(STATUSES)
];

module.exports = { createRules, updateRules };
