import { useEffect, useState } from "react";
import { apiFetch, formatDate } from "../api";
import { formatFCFA, PAYMENT_LABELS } from "../money";
import Receipt from "../components/Receipt";

// Historique des ventes et chiffres du jour
export default function SalesPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    apiFetch("/api/sales?limit=100")
      .then(setData)
      .catch(() => setError("Impossible de récupérer les ventes."));
  }, []);

  async function openReceipt(id) {
    try {
      setReceipt(await apiFetch(`/api/sales/${id}`));
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div>
      {receipt && <Receipt sale={receipt} onClose={() => setReceipt(null)} />}

      <h1 style={{ marginBottom: "16px" }}>💰 Ventes</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!data && !error && <p>Chargement des ventes...</p>}

      {data && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <Card
              label="Ventes du jour"
              value={data.today.count}
              color="#2563eb"
            />
            <Card
              label="Chiffre d'affaires TTC (jour)"
              value={formatFCFA(data.today.total)}
              color="#16a34a"
            />
            <Card
              label="dont HT"
              value={formatFCFA(data.today.totalHt)}
              color="#4b5563"
            />
            <Card
              label="dont TVA"
              value={formatFCFA(data.today.totalVat)}
              color="#7c3aed"
            />
          </div>

          {data.sales.length === 0 ? (
            <p>Aucune vente pour le moment.</p>
          ) : (
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  <th style={thStyle}>N°</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Articles</th>
                  <th style={thStyle}>Paiement</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>HT</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>TVA</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>TTC</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {data.sales.map((s) => (
                  <tr key={s.id}>
                    <td style={tdStyle}>{s.id}</td>
                    <td style={tdStyle}>{formatDate(s.createdAt)}</td>
                    <td style={tdStyle}>{s.itemsCount}</td>
                    <td style={tdStyle}>{PAYMENT_LABELS[s.paymentMethod]}</td>
                    <td style={tdRight}>{formatFCFA(s.totalHt)}</td>
                    <td style={tdRight}>{formatFCFA(s.totalVat)}</td>
                    <td style={{ ...tdRight, fontWeight: 700 }}>
                      {formatFCFA(s.total)}
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => openReceipt(s.id)}
                        style={ticketButton}
                      >
                        Ticket
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

function Card({ label, value, color }) {
  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: "8px",
        border: "1px solid #ddd",
        borderLeft: `4px solid ${color}`,
      }}
    >
      <div style={{ fontSize: "13px", opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: "20px", fontWeight: 700, color }}>{value}</div>
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
const tdStyle = { border: "1px solid #ddd", padding: "8px 12px" };
const tdRight = { ...tdStyle, textAlign: "right", whiteSpace: "nowrap" };
const ticketButton = {
  padding: "4px 10px",
  borderRadius: "4px",
  border: "none",
  background: "#2563eb",
  color: "white",
  cursor: "pointer",
  fontSize: "12px",
};
