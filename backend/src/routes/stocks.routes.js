import express from "express";
import pool from "../db.js";
import { apiErrorCounter } from "../metrics.js";

const router = express.Router();

// GET /api/stocks/movements
router.get("/movements", async (req, res) => {
  try {
    const { productId } = req.query;
    let query = `
      SELECT
        m.id,
        m.product_id AS "productId",
        m.type,
        m.quantity,
        m.reason,
        m.new_quantity AS "newQuantity",
        m.created_at AS "createdAt",
        p.name AS "productName",
        p.sku AS "productSku"
      FROM stock_movements m
      JOIN products p ON p.id = m.product_id
    `;
    const params = [];

    if (productId) {
      query += " WHERE m.product_id = $1";
      params.push(Number(productId));
    }

    query += " ORDER BY m.created_at DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur sur GET /api/stocks/movements :", err);
    apiErrorCounter
      .labels("GET", "/api/stocks/movements", "db")
      .inc();
    res
      .status(500)
      .json({ message: "Erreur interne sur la récupération des mouvements" });
  }
});

// POST /api/stocks/movements
router.post("/movements", async (req, res) => {
  const client = await pool.connect();

  try {
    const { productId, type, quantity, reason } = req.body;

    const pid = Number(productId);
    const qty = Number(quantity);

    if (!pid || Number.isNaN(pid)) {
      return res
        .status(400)
        .json({ message: "Champ 'productId' invalide ou manquant." });
    }

    if (!["IN", "OUT"].includes(type)) {
      return res
        .status(400)
        .json({ message: "Champ 'type' doit être 'IN' ou 'OUT'." });
    }

    if (Number.isNaN(qty) || qty <= 0) {
      return res
        .status(400)
        .json({ message: "Champ 'quantity' doit être > 0." });
    }

    await client.query("BEGIN");

    // 1) Récupérer le produit courant
    const productResult = await client.query(
      "SELECT id, quantity FROM products WHERE id = $1 FOR UPDATE",
      [pid]
    );

    if (productResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Produit introuvable." });
    }

    const currentQty = productResult.rows[0].quantity;

    let newQuantity =
      type === "IN" ? currentQty + qty : currentQty - qty;

    if (newQuantity < 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message:
          "Impossible d'effectuer une sortie, la quantité deviendrait négative.",
      });
    }

    // 2) Mettre à jour la quantité du produit
    await client.query(
      "UPDATE products SET quantity = $1 WHERE id = $2",
      [newQuantity, pid]
    );

    // 3) Insérer le mouvement
    const movementResult = await client.query(
      `
      INSERT INTO stock_movements (product_id, type, quantity, reason, new_quantity)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        product_id AS "productId",
        type,
        quantity,
        reason,
        new_quantity AS "newQuantity",
        created_at AS "createdAt"
      `,
      [pid, type, qty, reason || null, newQuantity]
    );

    await client.query("COMMIT");

    const movement = movementResult.rows[0];
    return res.status(201).json(movement);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erreur sur POST /api/stocks/movements :", err);
    apiErrorCounter
      .labels("POST", "/api/stocks/movements", "db")
      .inc();
    res
      .status(500)
      .json({ message: "Erreur interne sur la création du mouvement" });
  } finally {
    client.release();
  }
});

export default router;
