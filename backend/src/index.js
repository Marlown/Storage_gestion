import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import pool from "./db.js";
import productsRouter from "./routes/products.routes.js";
import stocksRouter from "./routes/stocks.routes.js";
import {
  register,
  httpRequestDuration,
  httpRequestCounter,
} from "./metrics.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Middleware de mesure HTTP
app.use((req, res, next) => {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const diffSeconds =
      Number(process.hrtime.bigint() - start) / 1e9;
    const route = req.route?.path || req.path || "unknown";

    httpRequestDuration
      .labels(req.method, route, String(res.statusCode))
      .observe(diffSeconds);

    httpRequestCounter
      .labels(req.method, route, String(res.statusCode))
      .inc();
  });

  next();
});

// Routes métier
app.use("/api/products", productsRouter);
app.use("/api/stocks", stocksRouter);

app.get("/", (req, res) => {
  res.json({ message: "API Stock OK ✅" });
});

// Vérifie que l'API et la base répondent
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "ok" });
  } catch (err) {
    res.status(503).json({ status: "error", database: "unreachable" });
  }
});

// /metrics pour Prometheus
app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (err) {
    console.error("Error generating metrics:", err);
    res.status(500).end();
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 Metrics at http://localhost:${PORT}/metrics`);
});
