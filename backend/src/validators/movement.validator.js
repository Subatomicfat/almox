const { body } = require('express-validator');

// Observação de design: a data da movimentação é sempre gerada pelo
// servidor (data_movimentacao DEFAULT NOW() no banco) — o cliente não
// pode enviar uma data. Isso satisfaz a regra "não aceitar datas
// futuras" por construção, sem precisar validar isso aqui.
const createRules = [
  body('productId').isInt({ min: 1 }).withMessage('productId inválido.'),
  body('type').isIn(['entrada', 'saida']).withMessage('type deve ser "entrada" ou "saida".'),
  body('quantidade').isFloat({ gt: 0 }).withMessage('Quantidade deve ser maior que zero.'),
  body('referencia').optional().isString().trim().isLength({ max: 160 }),
  body('observacao').optional().isString().trim().isLength({ max: 1000 }),
  body('vehiclePlaca').optional().isString().trim().isLength({ min: 5, max: 10 })
];

const adjustRules = [
  body('type').isIn(['entrada', 'saida']).withMessage('type deve ser "entrada" ou "saida".'),
  body('quantidade').isFloat({ gt: 0 }).withMessage('Quantidade deve ser maior que zero.'),
  body('justificativa').isString().trim().isLength({ min: 5, max: 500 })
    .withMessage('Justificativa obrigatória (mínimo 5 caracteres).')
];

module.exports = { createRules, adjustRules };
