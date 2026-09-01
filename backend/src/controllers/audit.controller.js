const auditRepository = require('../repositories/audit.repository');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const { user_id: userId, data_inicio: dataInicio, data_fim: dataFim } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const logs = await auditRepository.findAll({ userId, dataInicio, dataFim, page, limit });
  res.json(logs);
});

module.exports = { list };
