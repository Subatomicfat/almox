const movementRepository = require('../repositories/movement.repository');
const vehicleRepository = require('../repositories/vehicle.repository');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const { data_inicio: dataInicio, data_fim: dataFim, tipo: type, categoria, user_id: userId } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 200);
  const movements = await movementRepository.findAll({ dataInicio, dataFim, type, categoria, userId, page, limit });
  res.json(movements);
});

const getById = asyncHandler(async (req, res) => {
  const movement = await movementRepository.findById(req.params.id);
  if (!movement) throw ApiError.notFound('Movimentação não encontrada.');
  res.json(movement);
});

const create = asyncHandler(async (req, res) => {
  const { productId, type, quantidade, referencia, observacao, vehiclePlaca } = req.body;

  let vehicleId = null;
  if (vehiclePlaca) {
    const vehicle = await vehicleRepository.findByPlaca(vehiclePlaca.toUpperCase());
    if (!vehicle) throw ApiError.badRequest(`Veículo de placa ${vehiclePlaca} não encontrado.`);
    vehicleId = vehicle.id;
  }

  const movement = await movementRepository.create({
    productId, type, quantidade, userId: req.user.id, vehicleId, referencia, observacao, ip: req.ip
  });
  res.status(201).json(movement);
});

// Corresponde a "PUT /api/movements/:id (apenas se erro de digitação,
// com justificativa obrigatória)" — implementado como uma NOVA
// movimentação de ajuste, nunca como edição da linha original
// (ver regra de negócio em movement.repository.js).
const adjust = asyncHandler(async (req, res) => {
  const { type, quantidade, justificativa } = req.body;
  const adjustment = await movementRepository.createAdjustment({
    originalMovementId: req.params.id, type, quantidade, userId: req.user.id, justificativa, ip: req.ip
  });
  res.status(201).json(adjustment);
});

module.exports = { list, getById, create, adjust };
