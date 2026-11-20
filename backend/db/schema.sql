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

-- ===== Caisse =====

-- Prix de vente unitaire TTC, en francs CFA (entier, pas de centimes)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS price INTEGER NOT NULL DEFAULT 0
  CHECK (price >= 0);

-- Taux de TVA du produit, en % (18 = 18 %, 0 = exonéré)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5,2) NOT NULL DEFAULT 18
  CHECK (vat_rate >= 0 AND vat_rate < 100);

-- Une vente (un passage en caisse). Montants en FCFA.
CREATE TABLE IF NOT EXISTS sales (
  id              SERIAL PRIMARY KEY,
  total_ht        INTEGER     NOT NULL CHECK (total_ht >= 0),
  total_vat       INTEGER     NOT NULL CHECK (total_vat >= 0),
  total           INTEGER     NOT NULL CHECK (total >= 0),  -- TTC
  payment_method  VARCHAR(10) NOT NULL
                  CHECK (payment_method IN ('CASH', 'CARD', 'MOBILE')),
  amount_received INTEGER     CHECK (amount_received >= 0), -- espèces uniquement
  change_given    INTEGER     CHECK (change_given >= 0),    -- monnaie rendue
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lignes d'une vente. Nom, SKU, prix et taux de TVA sont recopiés au moment
-- de la vente : le ticket reste exact même si le produit change ou disparaît.
CREATE TABLE IF NOT EXISTS sale_items (
  id           SERIAL PRIMARY KEY,
  sale_id      INTEGER      NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id   INTEGER      REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  product_sku  VARCHAR(100) NOT NULL,
  unit_price   INTEGER      NOT NULL CHECK (unit_price >= 0),  -- TTC
  vat_rate     NUMERIC(5,2) NOT NULL,
  quantity     INTEGER      NOT NULL CHECK (quantity > 0),
  line_ht      INTEGER      NOT NULL CHECK (line_ht >= 0),
  line_vat     INTEGER      NOT NULL CHECK (line_vat >= 0),
  line_total   INTEGER      NOT NULL CHECK (line_total >= 0)   -- TTC
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
