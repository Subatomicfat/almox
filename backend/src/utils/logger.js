// Logger mínimo, sem dependências externas, mas já em formato estruturado
// (JSON com timestamp e nível). Em produção real, troque por Winston ou
// Pino para ter transporte para arquivo/serviço externo — a assinatura
// dos métodos abaixo (info/warn/error/debug) é compatível com ambos,
// então a troca não exige mudar o resto do código.
const LEVELS = ['debug', 'info', 'warn', 'error'];

function log(level, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

const logger = {};
LEVELS.forEach((level) => {
  logger[level] = (message, meta) => log(level, message, meta);
});

module.exports = logger;
