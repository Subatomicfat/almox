// Aplica db/schema.sql no banco configurado em .env
// Uso via CLI: npm run migrate
// Também pode ser chamado programaticamente (ver server.js — usado pela
// opção RUN_MIGRATIONS_ON_BOOT, para plataformas sem acesso a Shell).
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || undefined,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });

  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const client = await pool.connect();
  try {
    console.log('Aplicando schema.sql...');
    await client.query(sql);
    console.log('Schema aplicado com sucesso.');
  } catch (err) {
    // "already exists" é esperado se a migration já rodou antes —
    // não é motivo para derrubar o processo quando chamado no boot.
    console.error('Falha ao aplicar o schema:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// Roda sozinho só quando chamado via CLI (node db/migrate.js / npm run
// migrate) — quando importado por outro módulo (server.js), só expõe
// run() sem executar nada automaticamente.
if (require.main === module) {
  run().catch(() => { process.exitCode = 1; });
}

module.exports = run;
