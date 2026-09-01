const reportRepository = require('../repositories/report.repository');
const cache = require('../utils/cache');
const asyncHandler = require('../utils/asyncHandler');

const stats = asyncHandler(async (req, res) => {
  // TTL de 5 min: os totais do dashboard não precisam ser 100%
  // em tempo real segundo a segundo (ver prompt original — cache de
  // dashboard é explicitamente listado como aceitável ter alguns
  // minutos de defasagem, diferente do saldo de estoque em si, que
  // é sempre lido fresco em cada movimentação).
  const dados = await cache.withCache('cache:dashboard:stats', 300, () => reportRepository.dashboardStats());
  res.json(dados);
});

module.exports = { stats };
