const vehicleRepository = require('../repositories/vehicle.repository');
const auditRepository = require('../repositories/audit.repository');
const cache = require('../utils/cache');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const VEHICLES_CACHE_TTL = 600; // 10 min
const VEHICLES_VERSION_KEY = 'cache:vehicles:version';

const list = asyncHandler(async (req, res) => {
  const version = await cache.getVersion(VEHICLES_VERSION_KEY);
  const cacheKey = `cache:vehicles:list:v${version}:${JSON.stringify({ busca: req.query.busca })}`;
  const vehicles = await cache.withCache(cacheKey, VEHICLES_CACHE_TTL, () =>
    vehicleRepository.findAll({ busca: req.query.busca })
  );
  res.json(vehicles);
});

const getConsumo = asyncHandler(async (req, res) => {
  const vehicle = await vehicleRepository.findById(req.params.id);
  if (!vehicle) throw ApiError.notFound('Veículo não encontrado.');
  const historico = await vehicleRepository.consumo(vehicle.id);
  res.json({ veiculo: vehicle, historico });
});

const create = asyncHandler(async (req, res) => {
  const { placa, modelo, marca } = req.body;
  const existing = await vehicleRepository.findByPlaca(placa.toUpperCase());
  if (existing) throw ApiError.conflict(`Já existe um veículo com a placa ${placa}.`);

  const vehicle = await vehicleRepository.create({ placa: placa.toUpperCase(), modelo, marca });
  await auditRepository.log({ userId: req.user.id, action: 'CREATE', table: 'vehicles', recordId: vehicle.id, newValues: vehicle, ip: req.ip });
  await cache.bumpVersion(VEHICLES_VERSION_KEY);
  res.status(201).json(vehicle);
});

const update = asyncHandler(async (req, res) => {
  const before = await vehicleRepository.findById(req.params.id);
  if (!before) throw ApiError.notFound('Veículo não encontrado.');

  const vehicle = await vehicleRepository.update(req.params.id, req.body);
  await auditRepository.log({
    userId: req.user.id, action: 'UPDATE', table: 'vehicles', recordId: vehicle.id, oldValues: before, newValues: vehicle, ip: req.ip
  });
  await cache.bumpVersion(VEHICLES_VERSION_KEY);
  res.json(vehicle);
});

module.exports = { list, getConsumo, create, update };
