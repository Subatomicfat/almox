require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  db: {
    connectionString: process.env.DATABASE_URL || undefined,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'almox_ctrl',
    user: process.env.DB_USER || 'almox_app',
    password: process.env.DB_PASSWORD || ''
  },

  jwt: {
    // Em produção, required() derruba o processo no boot se o segredo não
    // estiver definido — melhor falhar rápido do que rodar com um valor fraco.
    accessSecret: process.env.NODE_ENV === 'production'
      ? required('JWT_ACCESS_SECRET')
      : (process.env.JWT_ACCESS_SECRET || 'dev-only-access-secret-troque-em-producao'),
    refreshSecret: process.env.NODE_ENV === 'production'
      ? required('JWT_REFRESH_SECRET')
      : (process.env.JWT_REFRESH_SECRET || 'dev-only-refresh-secret-troque-em-producao'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    loginMax: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '5', 10)
  },

  redis: {
    url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`
  }
};

module.exports = env;
