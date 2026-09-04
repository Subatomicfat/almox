-- =====================================================================
-- ALMOX//CTRL — Schema v2 (enterprise)
-- Substitui o schema_estoque.sql anterior: aqui adicionamos usuários,
-- autenticação, log de auditoria e simplificamos "produtos" para bater
-- exatamente com o modelo de dados pedido no prompt de arquitetura.
-- PostgreSQL 14+
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid(), se optar por UUID no futuro

-- ---------- USERS ----------
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  nome          VARCHAR(120) NOT NULL,
  email         VARCHAR(160) UNIQUE NOT NULL,
  senha_hash    VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'operador'
                  CHECK (role IN ('admin','gestor','operador','visualizador')),
  departamento  VARCHAR(60),                 -- FR, CO, IP, MI, Geral...
  ativo         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Guarda o hash do refresh token emitido, para permitir revogação/logout real
-- (sem isso, um refresh token roubado continua válido até expirar sozinho).
CREATE TABLE refresh_tokens (
  id            SERIAL PRIMARY KEY,
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    VARCHAR(255) NOT NULL,
  revoked       BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

-- ---------- PRODUCTS ----------
CREATE TABLE products (
  id               SERIAL PRIMARY KEY,
  codigo           VARCHAR(30) UNIQUE NOT NULL,
  nome             VARCHAR(160) NOT NULL,
  categoria        VARCHAR(5) NOT NULL CHECK (categoria IN ('FR','CO','IP','MI')),
  unidade          VARCHAR(10) NOT NULL,
  estoque_minimo   NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (estoque_minimo >= 0),
  estoque_atual    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (estoque_atual >= 0),
  ativo            BOOLEAN NOT NULL DEFAULT TRUE,   -- soft delete
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_products_categoria ON products(categoria);
CREATE INDEX idx_products_nome ON products USING gin (to_tsvector('portuguese', nome));

-- ---------- VEHICLES ----------
CREATE TABLE vehicles (
  id            SERIAL PRIMARY KEY,
  placa         VARCHAR(10) UNIQUE NOT NULL,
  modelo        VARCHAR(80) NOT NULL,
  marca         VARCHAR(60) NOT NULL,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- ASSETS (comodato) ----------
CREATE TABLE assets (
  id            SERIAL PRIMARY KEY,
  codigo        VARCHAR(30) UNIQUE NOT NULL,
  nome          VARCHAR(160) NOT NULL,
  tipo          VARCHAR(60) NOT NULL,
  localizacao   VARCHAR(160),
  status        VARCHAR(20) NOT NULL DEFAULT 'disponivel'
                  CHECK (status IN ('disponivel','instalado','manutencao')),
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_assets_status ON assets(status);

-- ---------- MOVEMENTS ----------
-- Regra de negócio: movimentações NUNCA são apagadas nem sobrescritas.
-- Uma correção é sempre uma nova movimentação de ajuste, referenciando
-- a original em "adjustment_of" — mantém rastreabilidade total.
CREATE TABLE movements (
  id                SERIAL PRIMARY KEY,
  product_id        INT NOT NULL REFERENCES products(id),
  type              VARCHAR(10) NOT NULL CHECK (type IN ('entrada','saida')),
  quantidade        NUMERIC(12,2) NOT NULL CHECK (quantidade > 0),
  user_id           INT NOT NULL REFERENCES users(id),
  vehicle_id        INT REFERENCES vehicles(id),      -- preenchido quando referência é da frota (FR)
  referencia        VARCHAR(160),                      -- setor, local, nº de pedido/NF etc.
  observacao        TEXT,
  adjustment_of      INT REFERENCES movements(id),      -- aponta para a movimentação corrigida, se for um ajuste
  data_movimentacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_data_nao_futura CHECK (data_movimentacao <= NOW() + INTERVAL '1 minute')
);
CREATE INDEX idx_movements_product ON movements(product_id);
CREATE INDEX idx_movements_vehicle ON movements(vehicle_id);
CREATE INDEX idx_movements_data ON movements(data_movimentacao);
CREATE INDEX idx_movements_user ON movements(user_id);

-- ---------- AUDIT LOG ----------
CREATE TABLE audit_log (
  id              SERIAL PRIMARY KEY,
  user_id         INT REFERENCES users(id),
  action          VARCHAR(20) NOT NULL,   -- CREATE | UPDATE | DELETE | LOGIN | LOGIN_FAILED | LOGOUT
  table_affected  VARCHAR(60) NOT NULL,
  record_id       INT,
  old_values      JSONB,
  new_values      JSONB,
  ip_address      VARCHAR(45),
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_table ON audit_log(table_affected, record_id);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);

-- =====================================================================
-- TRIGGER: mantém products.estoque_atual sempre consistente.
-- Funciona como rede de segurança mesmo se algo gravar direto no banco
-- fora da API (import manual, script de correção etc.).
-- A API também atualiza dentro da mesma transaction — ver
-- movement.repository.js — então isto é redundante por design, não
-- por descuido: two-phase safety é aceitável aqui pelo baixo custo.
-- =====================================================================
CREATE OR REPLACE FUNCTION fn_atualizar_estoque()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'entrada' THEN
    UPDATE products SET estoque_atual = estoque_atual + NEW.quantidade, updated_at = NOW()
    WHERE id = NEW.product_id;
  ELSE
    UPDATE products SET estoque_atual = estoque_atual - NEW.quantidade, updated_at = NOW()
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_atualizar_estoque
AFTER INSERT ON movements
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_estoque();

-- =====================================================================
-- TRIGGER: updated_at automático
-- =====================================================================
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_assets_updated_at BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- =====================================================================
-- VIEW: itens abaixo do estoque mínimo
-- =====================================================================
CREATE VIEW vw_estoque_baixo AS
SELECT id, codigo, nome, categoria, unidade, estoque_atual, estoque_minimo,
       (estoque_minimo - estoque_atual) AS quantidade_faltante
FROM products
WHERE ativo = TRUE AND estoque_atual <= estoque_minimo;
