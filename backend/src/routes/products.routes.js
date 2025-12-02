import express from "express";
import { productsCountGauge, apiErrorCounter } from "../metrics.js";

const router = express.Router();

// ⚠️ On utilise let pour pouvoir ajouter des produits
let products = [
  { id: 1, name: "Produit test", sku: "TEST-001", quantity: 10 },
  { id: 2, name: "Deuxième produit", sku: "TEST-002", quantity: 5 },
];

// GET /api/products
router.get("/", (req, res) => {
  try {
    // métrique métier : nb de produits
    productsCountGauge.set(products.length);

    res.json(products);
  } catch (err) {
    console.error("Erreur sur GET /api/products :", err);

    apiErrorCounter
      .labels(req.method, "/api/products", "unexpected")
      .inc();

    res
      .status(500)
      .json({ message: "Erreur interne sur la récupération des produits" });
  }
});

// POST /api/products : ajouter un produit
router.post("/", (req, res) => {
  try {
    const { name, sku, quantity } = req.body;

    // validation simple
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

    // générer un nouvel id (simple, en mémoire)
    const newId = products.length > 0 ? products[products.length - 1].id + 1 : 1;

    const newProduct = {
      id: newId,
      name,
      sku,
      quantity: qty,
    };

    products.push(newProduct);

    // mettre à jour la métrique métier
    productsCountGauge.set(products.length);

    return res.status(201).json(newProduct);
  } catch (err) {
    console.error("Erreur sur POST /api/products :", err);

    apiErrorCounter
      .labels(req.method, "/api/products", "unexpected")
      .inc();

    res
      .status(500)
      .json({ message: "Erreur interne sur l'ajout d'un produit" });
  }
});

export default router;
