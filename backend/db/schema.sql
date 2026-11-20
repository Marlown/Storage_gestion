-- Schéma de la base Storage_gestion
-- Exécuté automatiquement par le conteneur Postgres au premier démarrage
-- (monté dans /docker-entrypoint-initdb.d), ou à la main :
--   psql -h localhost -U stock_user -d stock_db -f backend/db/schema.sql

CREATE TABLE IF NOT EXISTS products (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  sku        VARCHAR(100) NOT NULL UNIQUE,
  quantity   INTEGER      NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id           SERIAL PRIMARY KEY,
  product_id   INTEGER     NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type         VARCHAR(3)  NOT NULL CHECK (type IN ('IN', 'OUT')),
  quantity     INTEGER     NOT NULL CHECK (quantity > 0),
  reason       TEXT,
  new_quantity INTEGER     NOT NULL CHECK (new_quantity >= 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id
  ON stock_movements(product_id);

-- Seuil d'alerte de stock bas (0 = pas d'alerte, hors rupture).
-- ADD COLUMN IF NOT EXISTS : relancer ce fichier met à jour une base existante.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS min_quantity INTEGER NOT NULL DEFAULT 0
  CHECK (min_quantity >= 0);
