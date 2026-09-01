const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10; // mínimo exigido pelo requisito de segurança

async function hash(plainText) {
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

async function compare(plainText, hashValue) {
  return bcrypt.compare(plainText, hashValue);
}

module.exports = { hash, compare };
