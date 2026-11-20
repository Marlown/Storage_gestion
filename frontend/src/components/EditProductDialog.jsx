import { useState } from "react";
import { apiFetch } from "../api";
import { formatFCFA, splitTtc } from "../money";
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
  const [price, setPrice] = useState(product.price);
  const [vatRate, setVatRate] = useState(product.vatRate);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const minQty = Number(minQuantity);
  const priceNum = Number(price);
  const rateNum = Number(vatRate);
  const unchanged =
    name.trim() === product.name &&
    sku.trim() === product.sku &&
    minQty === product.minQuantity &&
    priceNum === product.price &&
    rateNum === product.vatRate;

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
    if (!Number.isInteger(priceNum) || priceNum < 0) {
      setError("Le prix doit être un nombre entier de FCFA >= 0.");
      return;
    }
    if (!(rateNum >= 0 && rateNum < 100)) {
      setError("Le taux de TVA doit être compris entre 0 et 100.");
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
          price: priceNum,
          vatRate: rateNum,
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

          <div style={{ display: "flex", gap: "8px" }}>
            <label style={{ ...labelStyle, flex: 2 }}>
              <span>Prix TTC (FCFA)</span>
              <input
                type="number"
                min={0}
                step={1}
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  setError("");
                }}
                style={inputStyle}
              />
            </label>
            <label style={{ ...labelStyle, flex: 1 }}>
              <span>TVA (%)</span>
              <input
                type="number"
                min={0}
                max={99}
                step={0.01}
                value={vatRate}
                onChange={(e) => {
                  setVatRate(e.target.value);
                  setError("");
                }}
                style={inputStyle}
              />
            </label>
          </div>
          {priceNum > 0 && rateNum >= 0 && (
            <small style={{ color: "#555", marginTop: "-6px" }}>
              Soit {formatFCFA(splitTtc(priceNum, rateNum).ht)} HT +{" "}
              {formatFCFA(splitTtc(priceNum, rateNum).vat)} de TVA
            </small>
          )}

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
