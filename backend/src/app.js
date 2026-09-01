const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const env = require('./config/env');
const apiRoutes = require('./routes');
const { generalLimiter } = require('./middlewares/rateLimiter.middleware');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler.middleware');

const app = express();

// Security headers, incluindo Content-Security-Policy (proteção contra XSS)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // swagger-ui precisa de inline styles
      objectSrc: ["'none'"]
    }
  }
}));

// CORS restrito à origem configurada (não usar '*' em produção com cookies)
app.use(cors({
  origin: env.corsOrigin,
  credentials: true
}));

app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
// Comprime respostas JSON grandes (listas de produtos, relatórios) —
// especialmente relevante para a exportação CSV e listagens com muitos
// itens, dado o volume de ~1.500 produtos previsto para este sistema.
app.use(compression());
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(generalLimiter);

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Documentação Swagger/OpenAPI — ver src/docs/openapi.yaml.
// Cobre os endpoints principais como referência de padrão; os demais
// endpoints seguem exatamente a mesma convenção (ver README.md).
try {
  const openapiDocument = YAML.load(path.join(__dirname, 'docs', 'openapi.yaml'));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));
} catch (err) {
  // Não derruba a API se a doc não carregar — apenas fica indisponível.
  console.warn('Não foi possível carregar openapi.yaml:', err.message);
}

app.use('/api', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
