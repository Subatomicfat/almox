// Aplica db/schema.sql no banco configurado em .env, e também aplica
// "patches" incrementais idempotentes — usados quando o banco JÁ
// estava rodando em produção antes de uma mudança de schema existir
// (ex: adicionar uma categoria nova depois do sistema já estar no ar
// no Render, onde não tem Shell para rodar SQL manual).
//
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

  const client = await pool.connect();
  try {
    // 1. Schema base — cria tudo do zero em um banco novo. Em um banco
    // que já tinha rodado isso antes, as tabelas/tipos já existem e o
    // Postgres retorna erro — isso é esperado, não interrompe o
    // processo, porque os patches abaixo precisam rodar de qualquer
    // forma (é assim que mudanças chegam a bancos já em produção).
    try {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const sql = fs.readFileSync(schemaPath, 'utf8');
      console.log('Aplicando schema.sql...');
      await client.query(sql);
      console.log('Schema aplicado com sucesso.');
    } catch (err) {
      console.warn('schema.sql não foi reaplicado integralmente (normal se o banco já existia antes):', err.message);
    }

    // 2. Patches incrementais — cada um precisa ser seguro de rodar
    // repetidas vezes (idempotente), porque isso roda em todo boot
    // quando RUN_MIGRATIONS_ON_BOOT=true está ativo.
    console.log('Aplicando patches...');

    // Patch: categoria "MP" (Manutenção Predial) adicionada depois do
    // lançamento inicial (que tinha só FR, CO, IP, MI).
    await client.query(`
      ALTER TABLE products DROP CONSTRAINT IF EXISTS products_categoria_check;
      ALTER TABLE products ADD CONSTRAINT products_categoria_check
        CHECK (categoria IN ('FR','CO','IP','MI','MP'));
    `);

    // Patch: campos de custo/Kardex (fornecedor, nº NF, custo unitário,
    // custo médio ponderado e valor de estoque) — pedido depois do
    // lançamento inicial, para o registro de movimentação funcionar
    // como um Kardex tradicional (ver MIGRATION_GUIDE.md).
    await client.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS custo_medio NUMERIC(14,4) NOT NULL DEFAULT 0;
    `);
    await client.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS valor_estoque NUMERIC(16,2)
        GENERATED ALWAYS AS (estoque_atual * custo_medio) STORED;
    `);
    await client.query(`
      ALTER TABLE movements ADD COLUMN IF NOT EXISTS fornecedor VARCHAR(160);
    `);
    await client.query(`
      ALTER TABLE movements ADD COLUMN IF NOT EXISTS numero_nf VARCHAR(60);
    `);
    await client.query(`
      ALTER TABLE movements ADD COLUMN IF NOT EXISTS valor_unitario NUMERIC(14,4);
    `);
    await client.query(`
      ALTER TABLE movements ADD COLUMN IF NOT EXISTS valor_total NUMERIC(16,2)
        GENERATED ALWAYS AS (quantidade * valor_unitario) STORED;
    `);

    // Patch: substitui a função do trigger de estoque pela versão que
    // também calcula custo médio ponderado. Precisa ser reaplicado
    // aqui (não só no schema.sql) porque, num banco que já existia, o
    // bloco do schema.sql inteiro aborta no primeiro "already exists"
    // antes de chegar nesse CREATE OR REPLACE — ver comentário acima.
    await client.query(`
      CREATE OR REPLACE FUNCTION fn_atualizar_estoque()
      RETURNS TRIGGER AS $BODY$
      DECLARE
        estoque_anterior  NUMERIC(12,2);
        custo_anterior    NUMERIC(14,4);
        novo_custo_medio  NUMERIC(14,4);
      BEGIN
        SELECT estoque_atual, custo_medio INTO estoque_anterior, custo_anterior
        FROM products WHERE id = NEW.product_id;

        IF NEW.type = 'entrada' THEN
          IF NEW.valor_unitario IS NOT NULL AND (estoque_anterior + NEW.quantidade) > 0 THEN
            novo_custo_medio := ((estoque_anterior * custo_anterior) + (NEW.quantidade * NEW.valor_unitario))
                                 / (estoque_anterior + NEW.quantidade);
            UPDATE products SET estoque_atual = estoque_atual + NEW.quantidade,
                                 custo_medio = novo_custo_medio,
                                 updated_at = NOW()
            WHERE id = NEW.product_id;
          ELSE
            UPDATE products SET estoque_atual = estoque_atual + NEW.quantidade, updated_at = NOW()
            WHERE id = NEW.product_id;
          END IF;
        ELSE
          UPDATE products SET estoque_atual = estoque_atual - NEW.quantidade, updated_at = NOW()
          WHERE id = NEW.product_id;
        END IF;
        RETURN NEW;
      END;
      $BODY$ LANGUAGE plpgsql;
    `);

    console.log('Patches aplicados com sucesso.');
  } finally {
    client.release();
    await pool.end();
  }
}

// Roda sozinho só quando chamado via CLI (node db/migrate.js / npm run
// migrate) — quando importado por outro módulo (server.js), só expõe
// run() sem executar nada automaticamente.
if (require.main === module) {
  run().catch((err) => { console.error('Falha na migration:', err.message); process.exitCode = 1; });
}

module.exports = run;
