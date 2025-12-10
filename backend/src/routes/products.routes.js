import express from "express";
import { productsCountGauge, apiErrorCounter } from "../metrics.js";

const router = express.Router();

// On garde les produits en mémoire pour l'instant
let products = [
  { id: 1, name: "Produit test", sku: "TEST-001", quantity: 10 },
  { id: 2, name: "Deuxième produit", sku: "TEST-002", quantity: 5 },
];

// GET /api/products
router.get("/", (req, res) => {
  try {
    productsCountGauge.set(products.length);
    res.json(products);
  } catch (err) {
    console.error("Erreur sur GET /api/products :", err);
    apiErrorCounter.labels(req.method, "/api/products", "unexpected").inc();
    res
      .status(500)
      .json({ message: "Erreur interne sur la récupération des produits" });
  }
});

// POST /api/products : créer un produit
router.post("/", (req, res) => {
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

    const newId = products.length > 0 ? products[products.length - 1].id + 1 : 1;

    const newProduct = {
      id: newId,
      name: name.trim(),
      sku: sku.trim(),
      quantity: qty,
    };

    products.push(newProduct);
    productsCountGauge.set(products.length);

    return res.status(201).json(newProduct);
  } catch (err) {
    console.error("Erreur sur POST /api/products :", err);
    apiErrorCounter.labels(req.method, "/api/products", "unexpected").inc();
    res
      .status(500)
      .json({ message: "Erreur interne sur l'ajout d'un produit" });
  }
});

// PUT /api/products/:id : mettre à jour un produit
router.put("/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, sku, quantity } = req.body;

    const index = products.findIndex((p) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ message: "Produit non trouvé." });
    }

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

    const updated = {
      ...products[index],
      name: name.trim(),
      sku: sku.trim(),
      quantity: qty,
    };

    products[index] = updated;

    return res.status(200).json(updated);
  } catch (err) {
    console.error("Erreur sur PUT /api/products/:id :", err);
    apiErrorCounter.labels(req.method, "/api/products/:id", "unexpected").inc();
    res
      .status(500)
      .json({ message: "Erreur interne sur la mise à jour du produit" });
  }
});

// DELETE /api/products/:id : supprimer un produit
router.delete("/:id", (req, res) => {
  try {
    const id = Number(req.params.id);

    const index = products.findIndex((p) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ message: "Produit non trouvé." });
    }

    const deleted = products[index];
    products.splice(index, 1);

    productsCountGauge.set(products.length);

    return res.status(200).json({ message: "Produit supprimé", product: deleted });
  } catch (err) {
    console.error("Erreur sur DELETE /api/products/:id :", err);
    apiErrorCounter.labels(req.method, "/api/products/:id", "unexpected").inc();
    res
      .status(500)
      .json({ message: "Erreur interne sur la suppression du produit" });
  }
});

export default router;
