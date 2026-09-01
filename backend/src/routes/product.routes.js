const express = require('express');
const multer = require('multer');
const productController = require('../controllers/product.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const { createRules, updateRules, listRules } = require('../validators/product.validator');

const router = express.Router();

// Upload em memória (não grava em disco) — arquivo é só lido e descartado.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB é mais que suficiente para 1.500 linhas
  fileFilter: (req, file, cb) => {
    const ok = /\.(csv|txt)$/i.test(file.originalname);
    cb(ok ? null : new Error('Apenas arquivos .csv ou .txt são aceitos.'), ok);
  }
});

router.use(authenticate);

// Leitura: qualquer perfil autenticado pode consultar produtos
// (inclusive operador, que precisa listá-los para registrar movimentações).
router.get('/', listRules, validate, productController.list);
router.get('/estoque-baixo', productController.estoqueBaixo);
router.get('/:id', productController.getById);

// Escrita: apenas admin e gestor.
router.post('/', authorize('admin', 'gestor'), createRules, validate, productController.create);
router.put('/:id', authorize('admin', 'gestor'), updateRules, validate, productController.update);
router.delete('/:id', authorize('admin', 'gestor'), productController.remove);
router.post('/import-csv', authorize('admin', 'gestor'), upload.single('file'), productController.importCsv);

module.exports = router;
