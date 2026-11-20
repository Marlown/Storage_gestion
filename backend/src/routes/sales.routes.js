import express from "express";
import pool from "../db.js";
import {
  apiErrorCounter,
  salesCounter,
  salesRevenueCounter,
} from "../metrics.js";
import { splitTtc } from "../vat.js";

const router = express.Router();

const PAYMENT_METHODS = ["CASH", "CARD", "MOBILE"];

const SALE_COLUMNS = `
  s.id,
  s.total_ht AS "totalHt",
  s.total_vat AS "totalVat",
  s.total,
  s.payment_method AS "paymentMethod",
  s.amount_received AS "amountReceived",
  s.change_given AS "changeGiven",
  s.created_at AS "createdAt"
`;

// Erreur de validation métier (renvoyée au client avec son code HTTP)
class SaleError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function loadSale(db, id) {
  const saleResult = await db.query(
    `SELECT ${SALE_COLUMNS} FROM sales s WHERE s.id = $1`,
    [id]
  );
  if (saleResult.rowCount === 0) return null;

  const itemsResult = await db.query(
    `SELECT
       product_id AS "productId",
       product_name AS "productName",
       product_sku AS "productSku",
       unit_price AS "unitPrice",
       vat_rate::float AS "vatRate",
       quantity,
       line_ht AS "lineHt",
       line_vat AS "lineVat",
       line_total AS "lineTotal"
     FROM sale_items
     WHERE sale_id = $1
     ORDER BY id`,
    [id]
  );
  const items = itemsResult.rows;

  // récapitulatif de TVA par taux, pour le ticket
  const byRate = new Map();
  for (const it of items) {
    const r = byRate.get(it.vatRate) ?? { vatRate: it.vatRate, ht: 0, vat: 0, ttc: 0 };
    r.ht += it.lineHt;
    r.vat += it.lineVat;
    r.ttc += it.lineTotal;
    byRate.set(it.vatRate, r);
  }
  const vatSummary = [...byRate.values()].sort((a, b) => a.vatRate - b.vatRate);

  return { ...saleResult.rows[0], items, vatSummary };
}

// Regroupe et valide les lignes du panier : [{ productId, quantity }]
function parseItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new SaleError(400, "Le panier est vide.");
  }
  const quantities = new Map();
  for (const item of rawItems) {
    const pid = Number(item?.productId);
    const qty = Number(item?.quantity);
    if (!Number.isInteger(pid) || pid <= 0) {
      throw new SaleError(400, "Produit invalide dans le panier.");
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new SaleError(400, "Les quantités doivent être des entiers > 0.");
    }
    quantities.set(pid, (quantities.get(pid) ?? 0) + qty);
  }
  return quantities;
}

// GET /api/sales?limit=50 : dernières ventes (sans le détail des lignes)
router.get("/", async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 500);
    const result = await pool.query(
      `SELECT ${SALE_COLUMNS},
         COALESCE(SUM(i.quantity), 0)::int AS "itemsCount"
       FROM sales s
       LEFT JOIN sale_items i ON i.sale_id = s.id
       GROUP BY s.id
       ORDER BY s.created_at DESC, s.id DESC
       LIMIT $1`,
      [limit]
    );

    // totaux du jour (heure du serveur)
    const today = await pool.query(
      `SELECT COUNT(*)::int AS count,
         COALESCE(SUM(total), 0)::int AS total,
         COALESCE(SUM(total_ht), 0)::int AS "totalHt",
         COALESCE(SUM(total_vat), 0)::int AS "totalVat"
       FROM sales WHERE created_at >= date_trunc('day', NOW())`
    );

    res.json({ sales: result.rows, today: today.rows[0] });
  } catch (err) {
    console.error("Erreur sur GET /api/sales :", err);
    apiErrorCounter.labels("GET", "/api/sales", "db").inc();
    res
      .status(500)
      .json({ message: "Erreur interne sur la récupération des ventes" });
  }
});

// GET /api/sales/:id : une vente avec ses lignes (pour le ticket)
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Identifiant invalide." });
    }
    const sale = await loadSale(pool, id);
    if (!sale) {
      return res.status(404).json({ message: "Vente introuvable." });
    }
    res.json(sale);
  } catch (err) {
    console.error("Erreur sur GET /api/sales/:id :", err);
    apiErrorCounter.labels("GET", "/api/sales/:id", "db").inc();
    res
      .status(500)
      .json({ message: "Erreur interne sur la récupération de la vente" });
  }
});

// POST /api/sales
// { items: [{ productId, quantity }], paymentMethod: "CASH"|"CARD"|"MOBILE",
//   amountReceived?: number (obligatoire en espèces) }
// Les prix viennent de la base (jamais du client). Tout est fait dans une
// transaction : vente, lignes, baisse du stock et mouvements de sortie.
router.post("/", async (req, res) => {
  let client;
  try {
    const quantities = parseItems(req.body.items);
    const paymentMethod = req.body.paymentMethod;
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      throw new SaleError(400, "Moyen de paiement invalide.");
    }

    client = await pool.connect();
    await client.query("BEGIN");

    // verrouille les produits (ordre fixe par id pour éviter les interblocages)
    const productIds = [...quantities.keys()];
    const productsResult = await client.query(
      `SELECT id, name, sku, quantity, price, vat_rate::float AS "vatRate"
       FROM products WHERE id = ANY($1::int[])
       ORDER BY id FOR UPDATE`,
      [productIds]
    );
    if (productsResult.rowCount !== productIds.length) {
      throw new SaleError(404, "Un produit du panier n'existe plus.");
    }

    const lines = productsResult.rows.map((p) => {
      const qty = quantities.get(p.id);
      if (p.price <= 0) {
        throw new SaleError(400, `« ${p.name} » n'a pas de prix défini.`);
      }
      if (qty > p.quantity) {
        throw new SaleError(
          400,
          `Stock insuffisant pour « ${p.name} » : ${p.quantity} disponible(s).`
        );
      }
      const { ht, vat, ttc } = splitTtc(p.price * qty, p.vatRate);
      return { product: p, qty, lineHt: ht, lineVat: vat, lineTotal: ttc };
    });
    const total = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    const totalHt = lines.reduce((sum, l) => sum + l.lineHt, 0);
    const totalVat = total - totalHt;

    let amountReceived = null;
    let changeGiven = null;
    if (paymentMethod === "CASH") {
      amountReceived = Number(req.body.amountReceived);
      if (!Number.isInteger(amountReceived) || amountReceived < total) {
        throw new SaleError(
          400,
          "Le montant reçu en espèces doit couvrir le total."
        );
      }
      changeGiven = amountReceived - total;
    }

    const saleResult = await client.query(
      `INSERT INTO sales
         (total_ht, total_vat, total, payment_method, amount_received, change_given)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [totalHt, totalVat, total, paymentMethod, amountReceived, changeGiven]
    );
    const saleId = saleResult.rows[0].id;

    for (const { product, qty, lineHt, lineVat, lineTotal } of lines) {
      const newQuantity = product.quantity - qty;
      await client.query(
        `INSERT INTO sale_items
           (sale_id, product_id, product_name, product_sku, unit_price, vat_rate,
            quantity, line_ht, line_vat, line_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          saleId,
          product.id,
          product.name,
          product.sku,
          product.price,
          product.vatRate,
          qty,
          lineHt,
          lineVat,
          lineTotal,
        ]
      );
      await client.query("UPDATE products SET quantity = $1 WHERE id = $2", [
        newQuantity,
        product.id,
      ]);
      await client.query(
        `INSERT INTO stock_movements (product_id, type, quantity, reason, new_quantity)
         VALUES ($1, 'OUT', $2, $3, $4)`,
        [product.id, qty, `Vente n°${saleId}`, newQuantity]
      );
    }

    await client.query("COMMIT");

    salesCounter.labels(paymentMethod).inc();
    salesRevenueCounter.labels(paymentMethod).inc(total);

    const sale = await loadSale(pool, saleId);
    return res.status(201).json(sale);
  } catch (err) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    if (err instanceof SaleError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("Erreur sur POST /api/sales :", err);
    apiErrorCounter.labels("POST", "/api/sales", "db").inc();
    res
      .status(500)
      .json({ message: "Erreur interne lors de l'enregistrement de la vente" });
  } finally {
    client?.release();
  }
});

export default router;
