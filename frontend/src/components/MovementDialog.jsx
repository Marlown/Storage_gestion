import { useState } from "react";
import { apiFetch } from "../api";

// Fenêtre d'entrée / sortie de stock pour un produit
export default function MovementDialog({ product, type, onClose, onDone }) {
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isIn = type === "IN";
  const qty = Number(quantity);
  const validQty = Number.isInteger(qty) && qty > 0;
  const preview = validQty
    ? isIn
      ? product.quantity + qty
      : product.quantity - qty
    : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!validQty) {
      setError("La quantité doit être un nombre entier supérieur à 0.");
      return;
    }
    if (!isIn && qty > product.quantity) {
      setError(`Stock insuffisant : ${product.quantity} disponible(s).`);
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/api/stocks/movements", {
        method: "POST",
        body: JSON.stringify({
          productId: product.id,
          type,
          quantity: qty,
          reason: reason.trim() || undefined,
        }),
      });
      onDone();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div
        style={dialogStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 style={{ marginTop: 0, fontSize: "20px" }}>
          {isIn ? "⬇️ Entrée de stock" : "⬆️ Sortie de stock"}
        </h2>
        <p style={{ margin: "0 0 16px", color: "#555" }}>
          <strong>{product.name}</strong> ({product.sku}) — stock actuel :{" "}
          <strong>{product.quantity}</strong>
        </p>

        {error && <p style={{ color: "#dc2626", margin: "0 0 12px" }}>{error}</p>}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px" }}>
          <label style={labelStyle}>
            <span>Quantité *</span>
            <input
              type="number"
              min={1}
              step={1}
              autoFocus
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                setError("");
              }}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            <span>Motif</span>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={inputStyle}
              placeholder={isIn ? "Ex : livraison fournisseur" : "Ex : vente, casse…"}
            />
          </label>

          {preview !== null && (
            <p style={{ margin: 0, color: preview < 0 ? "#dc2626" : "#555" }}>
              Nouveau stock : <strong>{preview}</strong>
            </p>
          )}

          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={secondaryButton}>
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                ...primaryButton,
                background: submitting ? "#888" : isIn ? "#16a34a" : "#ea580c",
              }}
            >
              {submitting ? "Enregistrement…" : "Valider"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px",
  zIndex: 10,
};

const dialogStyle = {
  background: "white",
  color: "#111",
  borderRadius: "8px",
  padding: "24px",
  width: "100%",
  maxWidth: "420px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
};

const labelStyle = { display: "flex", flexDirection: "column", gap: "4px" };

const inputStyle = {
  padding: "8px",
  borderRadius: "4px",
  border: "1px solid #ccc",
  fontSize: "14px",
  background: "white",
  color: "#111",
};

const primaryButton = {
  padding: "8px 16px",
  border: "none",
  borderRadius: "6px",
  color: "white",
  cursor: "pointer",
};

const secondaryButton = {
  ...primaryButton,
  background: "#e5e7eb",
  color: "#111",
};
