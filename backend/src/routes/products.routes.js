import express from "express";
import pool from "../db.js";
import { productsCountGauge, apiErrorCounter } from "../metrics.js";

const router = express.Router();

// GET /api/products
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, sku, quantity FROM products ORDER BY id ASC"
    );
    const products = result.rows;

    productsCountGauge.set(products.length);

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
  try {
    const { name, sku, quantity } = req.body;

    if (!name || !sku) {
      return res
        .status(400)
        .json({ message: "Les champs 'name' et 'sku' sont obligatoires." });
    }

    const qty = Number(quantity ?? 0);
    if (Number.isNaN(qty) || qty < 0) {
      return res
        .status(400)
        .json({ message: "Le champ 'quantity' doit être un nombre >= 0." });
    }

    const insertQuery = `
      INSERT INTO products (name, sku, quantity)
      VALUES ($1, $2, $3)
      RETURNING id, name, sku, quantity
    `;
    const values = [name.trim(), sku.trim(), qty];

    const result = await pool.query(insertQuery, values);
    const newProduct = result.rows[0];

    // mettre à jour la gauge
    const countResult = await pool.query("SELECT COUNT(*) FROM products");
    const total = Number(countResult.rows[0].count);
    productsCountGauge.set(total);

    return res.status(201).json(newProduct);
  } catch (err) {
    console.error("Erreur sur POST /api/products :", err);
    apiErrorCounter.labels("POST", "/api/products", "db").inc();
    res
      .status(500)
      .json({ message: "Erreur interne sur l'ajout d'un produit" });
  }
});

// PUT /api/products/:id
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, sku, quantity } = req.body;

    if (!name || !sku) {
      return res
        .status(400)
        .json({ message: "Les champs 'name' et 'sku' sont obligatoires." });
    }

    const qty = Number(quantity ?? 0);
    if (Number.isNaN(qty) || qty < 0) {
      return res
        .status(400)
        .json({ message: "Le champ 'quantity' doit être un nombre >= 0." });
    }

    const updateQuery = `
      UPDATE products
      SET name = $1, sku = $2, quantity = $3
      WHERE id = $4
      RETURNING id, name, sku, quantity
    `;
    const values = [name.trim(), sku.trim(), qty, id];

    const result = await pool.query(updateQuery, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Produit non trouvé." });
    }

    const updated = result.rows[0];
    return res.status(200).json(updated);
  } catch (err) {
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

    const deleteQuery = `
      DELETE FROM products
      WHERE id = $1
      RETURNING id, name, sku, quantity
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
