// Cria o usuário administrador inicial (obrigatório para o primeiro login)
// e, opcionalmente, alguns dados de exemplo para testar a API.
// Uso: npm run seed
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || undefined,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });

  const nome = process.env.SEED_ADMIN_NAME || 'Administrador';
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@empresa.com.br';
  const senha = process.env.SEED_ADMIN_PASSWORD;

  if (!senha) {
    console.error('Defina SEED_ADMIN_PASSWORD no .env antes de rodar o seed.');
    process.exitCode = 1;
    return;
  }

  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      console.log('Usuário admin já existe (' + email + '). Nada a fazer.');
    } else {
      const hash = await bcrypt.hash(senha, 10);
      await client.query(
        `INSERT INTO users (nome, email, senha_hash, role, departamento, ativo)
         VALUES ($1, $2, $3, 'admin', 'Geral', TRUE)`,
        [nome, email, hash]
      );
      console.log('Usuário admin criado: ' + email);
      console.log('Troque a senha no primeiro login em produção.');
    }

    // Dados de exemplo mínimos para testar os endpoints (idempotente)
    await client.query(`
      INSERT INTO products (codigo, nome, categoria, unidade, estoque_minimo, estoque_atual)
      VALUES ('PNEU-295', 'Pneu 295/80 R22.5', 'FR', 'un', 8, 5)
      ON CONFLICT (codigo) DO NOTHING;
    `);
    await client.query(`
      INSERT INTO vehicles (placa, modelo, marca)
      VALUES ('ABC-1234', 'Volvo FH 540', 'Volvo')
      ON CONFLICT (placa) DO NOTHING;
    `);
    console.log('Dados de exemplo verificados/criados.');
  } catch (err) {
    console.error('Falha no seed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
