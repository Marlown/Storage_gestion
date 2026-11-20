import { useState } from "react";
import { apiFetch } from "../api";
import {
  overlayStyle,
  dialogStyle,
  labelStyle,
  inputStyle,
  primaryButton,
  secondaryButton,
} from "./dialogStyles";

// Fenêtre d'inventaire : on saisit la quantité comptée, le serveur crée
// le mouvement d'ajustement correspondant à l'écart.
export default function InventoryDialog({ product, onClose, onDone }) {
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const countedQty = Number(counted);
  const valid =
    counted !== "" && Number.isInteger(countedQty) && countedQty >= 0;
  const difference = valid ? countedQty - product.quantity : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!valid) {
      setError("La quantité comptée doit être un nombre entier >= 0.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiFetch("/api/stocks/inventory", {
        method: "POST",
        body: JSON.stringify({
          productId: product.id,
          countedQuantity: countedQty,
          note: note.trim() || undefined,
        }),
      });
      onDone(result);
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
        <h2 style={{ marginTop: 0, fontSize: "20px" }}>📋 Inventaire</h2>
        <p style={{ margin: "0 0 16px", color: "#555" }}>
          <strong>{product.name}</strong> ({product.sku}) — stock enregistré :{" "}
          <strong>{product.quantity}</strong>
        </p>

        {error && (
          <p style={{ color: "#dc2626", margin: "0 0 12px" }}>{error}</p>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px" }}>
          <label style={labelStyle}>
            <span>Quantité comptée *</span>
            <input
              type="number"
              min={0}
              step={1}
              autoFocus
              value={counted}
              onChange={(e) => {
                setCounted(e.target.value);
                setError("");
              }}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            <span>Remarque</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={inputStyle}
              placeholder="Ex : casse constatée, erreur de saisie…"
            />
          </label>

          {difference !== null && (
            <p style={{ margin: 0, color: differenceColor(difference) }}>
              {difference === 0
                ? "Aucun écart : le stock est juste ✅"
                : `Écart : ${difference > 0 ? "+" : "−"}${Math.abs(difference)} → une ${
                    difference > 0 ? "entrée" : "sortie"
                  } de ${Math.abs(difference)} sera enregistrée.`}
            </p>
          )}

          <div
            style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}
          >
            <button type="button" onClick={onClose} style={secondaryButton}>
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                ...primaryButton,
                background: submitting ? "#888" : "#7c3aed",
              }}
            >
              {submitting ? "Enregistrement…" : "Valider l'inventaire"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function differenceColor(difference) {
  if (difference > 0) return "#16a34a";
  if (difference < 0) return "#ea580c";
  return "#555";
}
