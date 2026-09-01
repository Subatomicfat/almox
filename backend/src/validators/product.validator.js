const { body, query, param } = require('express-validator');

const CATEGORIAS = ['FR', 'CO', 'IP', 'MI'];

const createRules = [
  body('codigo').isString().trim().isLength({ min: 1, max: 30 }).withMessage('Código obrigatório (máx. 30 caracteres).'),
  body('nome').isString().trim().isLength({ min: 1, max: 160 }).withMessage('Nome obrigatório.'),
  body('categoria').isIn(CATEGORIAS).withMessage('Categoria deve ser FR, CO, IP ou MI.'),
  body('unidade').isString().trim().isLength({ min: 1, max: 10 }).withMessage('Unidade obrigatória.'),
  body('estoqueMinimo').optional().isFloat({ min: 0 }).withMessage('Estoque mínimo não pode ser negativo.'),
  body('estoqueAtual').optional().isFloat({ min: 0 }).withMessage('Estoque atual não pode ser negativo.')
];

const updateRules = [
  param('id').isInt().withMessage('ID inválido.'),
  body('nome').optional().isString().trim().isLength({ min: 1, max: 160 }),
  body('categoria').optional().isIn(CATEGORIAS),
  body('unidade').optional().isString().trim().isLength({ min: 1, max: 10 }),
  body('estoqueMinimo').optional().isFloat({ min: 0 })
];

const listRules = [
  query('categoria').optional().isIn(CATEGORIAS),
  query('estoque_baixo').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 200 })
];

module.exports = { createRules, updateRules, listRules };
