const express = require('express');

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const productRoutes = require('./product.routes');
const vehicleRoutes = require('./vehicle.routes');
const assetRoutes = require('./asset.routes');
const movementRoutes = require('./movement.routes');
const reportRoutes = require('./report.routes');
const dashboardRoutes = require('./dashboard.routes');
const auditRoutes = require('./audit.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/assets', assetRoutes);
router.use('/movements', movementRoutes);
router.use('/reports', reportRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/audit-log', auditRoutes);

module.exports = router;
