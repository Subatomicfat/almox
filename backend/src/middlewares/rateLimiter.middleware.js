const rateLimit = require('express-rate-limit');
const env = require('../config/env');

// Limite geral: protege toda a API de abuso/scraping.
const generalLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Muitas requisições. Tente novamente em alguns minutos.' } }
});

// Limite estrito só no login: sem isso, o limite geral (100/15min)
// ainda permite tentativas suficientes para um ataque de força bruta.
const loginLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.loginMax,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: { message: 'Muitas tentativas de login. Aguarde antes de tentar novamente.' } }
});

module.exports = { generalLimiter, loginLimiter };
