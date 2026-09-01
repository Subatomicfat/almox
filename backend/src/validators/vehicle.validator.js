const { body } = require('express-validator');

const createRules = [
  body('placa').isString().trim().isLength({ min: 5, max: 10 }).withMessage('Placa inválida.'),
  body('modelo').isString().trim().isLength({ min: 1, max: 80 }).withMessage('Modelo obrigatório.'),
  body('marca').isString().trim().isLength({ min: 1, max: 60 }).withMessage('Marca obrigatória.')
];

const updateRules = [
  body('modelo').optional().isString().trim().isLength({ min: 1, max: 80 }),
  body('marca').optional().isString().trim().isLength({ min: 1, max: 60 })
];

module.exports = { createRules, updateRules };
