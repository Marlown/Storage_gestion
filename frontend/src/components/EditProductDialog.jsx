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

// Fenêtre de modification du nom et du SKU d'un produit.
// La quantité n'est pas modifiable ici : elle passe par les entrées / sorties.
export default function EditProductDialog({ product, onClose, onDone }) {
  const [name, setName] = useState(product.name);
  const [sku, setSku] = useState(product.sku);
  const [minQuantity, setMinQuantity] = useState(product.minQuantity);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const minQty = Number(minQuantity);
  const unchanged =
    name.trim() === product.name &&
    sku.trim() === product.sku &&
    minQty === product.minQuantity;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !sku.trim()) {
      setError("Les champs Nom et SKU sont obligatoires.");
      return;
    }
    if (!Number.isInteger(minQty) || minQty < 0) {
      setError("Le seuil d'alerte doit être un nombre entier >= 0.");
      return;
    }
    if (unchanged) {
      onClose();
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch(`/api/products/${product.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: name.trim(),
          sku: sku.trim(),
          minQuantity: minQty,
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
          ✏️ Modifier le produit
        </h2>

        {error && (
          <p style={{ color: "#dc2626", margin: "0 0 12px" }}>{error}</p>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px" }}>
          <label style={labelStyle}>
            <span>Nom *</span>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            <span>SKU *</span>
            <input
              type="text"
              value={sku}
              onChange={(e) => {
                setSku(e.target.value);
                setError("");
              }}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            <span>Seuil d'alerte</span>
            <input
              type="number"
              min={0}
              step={1}
              value={minQuantity}
              onChange={(e) => {
                setMinQuantity(e.target.value);
                setError("");
              }}
              style={inputStyle}
            />
          </label>

          <p style={{ margin: 0, color: "#555", fontSize: "14px" }}>
            Stock actuel : <strong>{product.quantity}</strong> — pour le
            modifier, utilisez les boutons Entrée / Sortie.
          </p>

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
                background: submitting ? "#888" : "#2563eb",
              }}
            >
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
