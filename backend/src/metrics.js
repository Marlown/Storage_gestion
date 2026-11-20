import client from "prom-client";

// Registry global partagé
const register = new client.Registry();

// Métriques système par défaut (CPU, mémoire, etc.)
client.collectDefaultMetrics({
  register,
  prefix: "stock_app_", // préfixe pour repérer ton appli
});

// Histogramme durée des requêtes HTTP
const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Durée des requêtes HTTP en secondes",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

// Compteur de requêtes HTTP
const httpRequestCounter = new client.Counter({
  name: "http_request_total",
  help: "Nombre total de requêtes HTTP",
  labelNames: ["method", "route", "status_code"],
});

// 🔹 Compteur d’erreurs API
const apiErrorCounter = new client.Counter({
  name: "stock_api_errors_total",
  help: "Nombre total d'erreurs sur l'API de gestion de stock",
  labelNames: ["method", "route", "type"], // type = "unexpected", "db", etc.
});

// 🔹 Gauge métier : nombre de produits
const productsCountGauge = new client.Gauge({
  name: "stock_products_count",
  help: "Nombre de produits connus par l'API",
});

// 🔹 Gauge métier : produits en alerte (rupture ou sous le seuil)
const lowStockGauge = new client.Gauge({
  name: "stock_products_low_count",
  help: "Nombre de produits en rupture ou sous leur seuil d'alerte",
});

// Enregistrer les métriques dans le registre
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestCounter);
register.registerMetric(apiErrorCounter);
register.registerMetric(productsCountGauge);
register.registerMetric(lowStockGauge);

export {
  register,
  httpRequestDuration,
  httpRequestCounter,
  apiErrorCounter,
  productsCountGauge,
  lowStockGauge,
};
