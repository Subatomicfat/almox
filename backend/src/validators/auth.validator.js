const { body } = require('express-validator');

const loginRules = [
  body('email').isEmail().withMessage('E-mail inválido.').normalizeEmail(),
  body('senha').isString().notEmpty().withMessage('Senha obrigatória.')
];

const registerRules = [
  body('nome').isString().trim().isLength({ min: 2, max: 120 }).withMessage('Nome deve ter entre 2 e 120 caracteres.'),
  body('email').isEmail().withMessage('E-mail inválido.').normalizeEmail(),
  body('senha').isString().isLength({ min: 8 }).withMessage('Senha deve ter no mínimo 8 caracteres.'),
  body('role').isIn(['admin', 'gestor', 'operador', 'visualizador']).withMessage('Role inválida.'),
  body('departamento').optional().isString().trim().isLength({ max: 60 })
];

const updateUserRules = [
  body('nome').optional().isString().trim().isLength({ min: 2, max: 120 }),
  body('role').optional().isIn(['admin', 'gestor', 'operador', 'visualizador']),
  body('departamento').optional().isString().trim().isLength({ max: 60 }),
  body('ativo').optional().isBoolean()
];

module.exports = { loginRules, registerRules, updateUserRules };
