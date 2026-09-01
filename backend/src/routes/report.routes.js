const express = require('express');
const reportController = require('../controllers/report.controller');
const authenticate = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/consumo-veiculo', reportController.consumoVeiculo);
router.get('/consumo-categoria', reportController.consumoCategoria);
router.get('/estoque-baixo', reportController.estoqueBaixo);
router.get('/atividade-usuario', reportController.atividadeUsuario);
router.post('/export-csv', reportController.exportCsv);

module.exports = router;
