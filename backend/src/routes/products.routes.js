import express from "express";
import pool from "../db.js";
import {
  productsCountGauge,
  lowStockGauge,
  apiErrorCounter,
} from "../metrics.js";

// En alerte : rupture, ou quantité au niveau du seuil ou en dessous
const isLowStock = (p) =>
  p.quantity === 0 || (p.minQuantity > 0 && p.quantity <= p.minQuantity);

// Lit le seuil d'alerte ; renvoie null si invalide
function parseMinQuantity(value) {
  const n = Number(value ?? 0);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

const MIN_QTY_ERROR = {
  message: "Le champ 'minQuantity' doit être un entier >= 0.",
};

const router = express.Router();

// GET /api/products
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, sku, quantity, min_quantity AS "minQuantity" FROM products ORDER BY id ASC'
    );
    const products = result.rows;

    productsCountGauge.set(products.length);
    lowStockGauge.set(products.filter(isLowStock).length);

    res.json(products);
  } catch (err) {
    console.error("Erreur sur GET /api/products :", err);
    apiErrorCounter.labels("GET", "/api/products", "db").inc();
    res
      .status(500)
      .json({ message: "Erreur interne sur la récupération des produits" });
  }
});

// POST /api/products
router.post("/", async (req, res) => {
  const name = String(req.body.name ?? "").trim();
  const sku = String(req.body.sku ?? "").trim();
  const qty = Number(req.body.quantity ?? 0);
  const minQty = parseMinQuantity(req.body.minQuantity);

  if (!name || !sku) {
    return res
      .status(400)
      .json({ message: "Les champs 'name' et 'sku' sont obligatoires." });
  }
  if (!Number.isInteger(qty) || qty < 0) {
    return res
      .status(400)
      .json({ message: "Le champ 'quantity' doit être un entier >= 0." });
  }
  if (minQty === null) {
    return res.status(400).json(MIN_QTY_ERROR);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO products (name, sku, quantity, min_quantity)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, sku, quantity, min_quantity AS "minQuantity"`,
      [name, sku, qty, minQty]
    );
    const newProduct = result.rows[0];

    // le stock de départ est tracé comme une entrée, pour que l'historique
    // explique toujours la quantité actuelle
    if (qty > 0) {
      await client.query(
        `INSERT INTO stock_movements (product_id, type, quantity, reason, new_quantity)
         VALUES ($1, 'IN', $2, 'Stock initial', $2)`,
        [newProduct.id, qty]
      );
    }

    await client.query("COMMIT");

    // mettre à jour la gauge
    const countResult = await pool.query("SELECT COUNT(*) FROM products");
    productsCountGauge.set(Number(countResult.rows[0].count));

    return res.status(201).json(newProduct);
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ message: "Un produit avec ce SKU existe déjà." });
    }
    console.error("Erreur sur POST /api/products :", err);
    apiErrorCounter.labels("POST", "/api/products", "db").inc();
    res
      .status(500)
      .json({ message: "Erreur interne sur l'ajout d'un produit" });
  } finally {
    client.release();
  }
});

// PUT /api/products/:id
// Modifie le nom, le SKU et le seuil d'alerte (minQuantity, facultatif).
// Ne modifie jamais la quantité : la quantité ne change que par des
// mouvements de stock (POST /api/stocks/movements), pour garder un historique fiable.
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Identifiant invalide." });
    }
    const name = String(req.body.name ?? "").trim();
    const sku = String(req.body.sku ?? "").trim();
    const minQty =
      req.body.minQuantity === undefined
        ? undefined
        : parseMinQuantity(req.body.minQuantity);

    if (!name || !sku) {
      return res
        .status(400)
        .json({ message: "Les champs 'name' et 'sku' sont obligatoires." });
    }
    if (minQty === null) {
      return res.status(400).json(MIN_QTY_ERROR);
    }

    const result = await pool.query(
      `UPDATE products
       SET name = $1, sku = $2, min_quantity = COALESCE($4, min_quantity)
       WHERE id = $3
       RETURNING id, name, sku, quantity, min_quantity AS "minQuantity"`,
      [name, sku, id, minQty ?? null]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Produit non trouvé." });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ message: "Un produit avec ce SKU existe déjà." });
    }
    console.error("Erreur sur PUT /api/products/:id :", err);
    apiErrorCounter.labels("PUT", "/api/products/:id", "db").inc();
    res
      .status(500)
      .json({ message: "Erreur interne sur la mise à jour du produit" });
  }
});

// DELETE /api/products/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Identifiant invalide." });
    }

    const deleteQuery = `
      DELETE FROM products
      WHERE id = $1
      RETURNING id, name, sku, quantity, min_quantity AS "minQuantity"
    `;
    const result = await pool.query(deleteQuery, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Produit non trouvé." });
    }

    // mettre à jour la gauge
    const countResult = await pool.query("SELECT COUNT(*) FROM products");
    const total = Number(countResult.rows[0].count);
    productsCountGauge.set(total);

    return res
      .status(200)
      .json({ message: "Produit supprimé", product: result.rows[0] });
  } catch (err) {
    console.error("Erreur sur DELETE /api/products/:id :", err);
    apiErrorCounter.labels("DELETE", "/api/products/:id", "db").inc();
    res
      .status(500)
      .json({ message: "Erreur interne sur la suppression du produit" });
  }
});

export default router;
