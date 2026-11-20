import { useCallback, useEffect, useState } from "react";
import { apiFetch, formatDate } from "../api";

// Historique des mouvements de stock, filtrable par produit
export default function MovementsPage({ productId, onProductChange }) {
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/products")
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = productId ? `?productId=${productId}` : "";
      setMovements(await apiFetch(`/api/stocks/movements${query}`));
    } catch (err) {
      console.error(err);
      setError("Impossible de récupérer les mouvements.");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  return (
    <div>
      <h1 style={{ marginBottom: "16px" }}>🔁 Mouvements de stock</h1>

      <label style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "16px" }}>
        <span>Produit :</span>
        <select
          value={productId ?? ""}
          onChange={(e) =>
            onProductChange(e.target.value ? Number(e.target.value) : null)
          }
          style={{ padding: "6px 8px", borderRadius: "4px", fontSize: "14px" }}
        >
          <option value="">Tous les produits</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku})
            </option>
          ))}
        </select>
      </label>

      {loading && <p>Chargement des mouvements...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && movements.length === 0 && (
        <p>Aucun mouvement enregistré.</p>
      )}

      {!loading && !error && movements.length > 0 && (
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Produit</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Quantité</th>
              <th style={thStyle}>Stock après</th>
              <th style={thStyle}>Motif</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id}>
                <td style={tdStyle}>{formatDate(m.createdAt)}</td>
                <td style={tdStyle}>
                  {m.productName}{" "}
                  <span style={{ opacity: 0.6 }}>({m.productSku})</span>
                </td>
                <td style={tdStyle}>
                  <span style={m.type === "IN" ? badgeIn : badgeOut}>
                    {m.type === "IN" ? "Entrée" : "Sortie"}
                  </span>
                </td>
                <td style={tdStyle}>
                  {m.type === "IN" ? "+" : "−"}
                  {m.quantity}
                </td>
                <td style={tdStyle}>{m.newQuantity}</td>
                <td style={tdStyle}>{m.reason || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle = {
  border: "1px solid #ccc",
  padding: "8px 12px",
  background: "#f5f5f5",
  color: "#111",
  textAlign: "left",
};

const tdStyle = {
  border: "1px solid #ddd",
  padding: "8px 12px",
};

const badge = {
  padding: "2px 8px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 600,
  color: "white",
};
const badgeIn = { ...badge, background: "#16a34a" };
const badgeOut = { ...badge, background: "#ea580c" };
