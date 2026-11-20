import { stockStatus } from "../stock";

// Bandeau de résumé en haut de la page Produits
export default function StockSummary({ products }) {
  const out = products.filter((p) => stockStatus(p) === "out").length;
  const low = products.filter((p) => stockStatus(p) === "low").length;
  const units = products.reduce((sum, p) => sum + p.quantity, 0);

  const cards = [
    { label: "Produits", value: products.length, color: "#2563eb" },
    { label: "Unités en stock", value: units, color: "#4b5563" },
    { label: "Stock bas", value: low, color: "#d97706" },
    { label: "En rupture", value: out, color: "#dc2626" },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: "12px",
        marginBottom: "24px",
      }}
    >
      {cards.map((c) => (
        <div
          key={c.label}
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            border: "1px solid #ddd",
            borderLeft: `4px solid ${c.color}`,
          }}
        >
          <div style={{ fontSize: "13px", opacity: 0.7 }}>{c.label}</div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: c.color }}>
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}
