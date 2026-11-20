import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../api";
import { formatFCFA, PAYMENT_LABELS, splitTtc } from "../money";
import { matchesSearch } from "../stock";
import Receipt from "../components/Receipt";

// Point d'encaissement : panier, paiement, ticket
export default function CashierPage() {
  const [products, setProducts] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  // panier : { [productId]: quantité }
  const [cart, setCart] = useState({});
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [amountReceived, setAmountReceived] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);

  const fetchProducts = useCallback(async () => {
    try {
      setProducts(await apiFetch("/api/products"));
      setLoadError("");
    } catch {
      setLoadError("Impossible de récupérer les produits.");
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = Object.entries(cart)
    .map(([id, qty]) => ({ product: byId.get(Number(id)), qty }))
    .filter((l) => l.product);

  // totaux affichés (le serveur recalcule à l'encaissement)
  let totalHt = 0;
  let total = 0;
  for (const { product, qty } of lines) {
    const { ht, ttc } = splitTtc(product.price * qty, product.vatRate);
    totalHt += ht;
    total += ttc;
  }
  const totalVat = total - totalHt;

  const received = Number(amountReceived);
  const change =
    paymentMethod === "CASH" && amountReceived !== "" ? received - total : null;

  const canCheckout =
    lines.length > 0 &&
    !submitting &&
    (paymentMethod !== "CASH" ||
      (Number.isInteger(received) && received >= total));

  function setQty(product, qty) {
    setError("");
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[product.id];
      else next[product.id] = Math.min(qty, product.quantity);
      return next;
    });
  }

  function addToCart(product) {
    const inCart = cart[product.id] ?? 0;
    if (inCart >= product.quantity) {
      setError(`Stock insuffisant pour « ${product.name} ».`);
      return;
    }
    setQty(product, inCart + 1);
  }

  async function handleCheckout() {
    setError("");
    setSubmitting(true);
    try {
      const sale = await apiFetch("/api/sales", {
        method: "POST",
        body: JSON.stringify({
          items: lines.map((l) => ({
            productId: l.product.id,
            quantity: l.qty,
          })),
          paymentMethod,
          amountReceived: paymentMethod === "CASH" ? received : undefined,
        }),
      });
      setReceipt(sale);
      setCart({});
      setAmountReceived("");
      fetchProducts();
    } catch (err) {
      setError(err.message);
      fetchProducts(); // le stock a peut-être changé entre-temps
    } finally {
      setSubmitting(false);
    }
  }

  const visible = products.filter((p) => matchesSearch(p, search));

  return (
    <div>
      {receipt && <Receipt sale={receipt} onClose={() => setReceipt(null)} />}

      <h1 style={{ marginBottom: "16px" }}>🧾 Caisse</h1>
      {loadError && <p style={{ color: "red" }}>{loadError}</p>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* Choix des produits */}
        <section>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Rechercher un produit…"
            aria-label="Rechercher un produit à vendre"
            style={{ ...inputStyle, width: "100%", marginBottom: "12px" }}
          />
          <div style={{ display: "grid", gap: "6px" }}>
            {visible.length === 0 && <p>Aucun produit.</p>}
            {visible.map((p) => {
              const noPrice = p.price <= 0;
              const noStock = p.quantity <= 0;
              const disabled = noPrice || noStock;
              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={disabled}
                  title={
                    noPrice
                      ? "Définissez un prix dans l'onglet Produits"
                      : noStock
                        ? "Rupture de stock"
                        : "Ajouter au panier"
                  }
                  style={{
                    ...productButton,
                    opacity: disabled ? 0.5 : 1,
                    cursor: disabled ? "not-allowed" : "pointer",
                  }}
                >
                  <span style={{ textAlign: "left" }}>
                    <strong>{p.name}</strong>
                    <br />
                    <small style={{ opacity: 0.7 }}>
                      {p.sku} · stock {p.quantity}
                    </small>
                  </span>
                  <strong style={{ whiteSpace: "nowrap" }}>
                    {noPrice
                      ? "Prix ?"
                      : noStock
                        ? "Rupture"
                        : formatFCFA(p.price)}
                  </strong>
                </button>
              );
            })}
          </div>
        </section>

        {/* Panier et paiement */}
        <section style={cartBox}>
          <h2 style={{ marginTop: 0, fontSize: "18px" }}>🛒 Panier</h2>

          {lines.length === 0 ? (
            <p style={{ opacity: 0.7 }}>
              Cliquez sur un produit pour l'ajouter.
            </p>
          ) : (
            <div style={{ display: "grid", gap: "8px", marginBottom: "12px" }}>
              {lines.map(({ product, qty }) => (
                <div key={product.id} style={cartLine}>
                  <span style={{ flex: 1 }}>
                    {product.name}
                    <br />
                    <small style={{ opacity: 0.7 }}>
                      {formatFCFA(product.price)} l'unité
                    </small>
                  </span>
                  <span
                    style={{
                      display: "flex",
                      gap: "4px",
                      alignItems: "center",
                    }}
                  >
                    <button
                      onClick={() => setQty(product, qty - 1)}
                      style={qtyButton}
                      aria-label={`Retirer un ${product.name}`}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={product.quantity}
                      value={qty}
                      onChange={(e) =>
                        setQty(product, Number(e.target.value) || 0)
                      }
                      aria-label={`Quantité de ${product.name}`}
                      style={{
                        ...inputStyle,
                        width: "56px",
                        textAlign: "center",
                      }}
                    />
                    <button
                      onClick={() => addToCart(product)}
                      style={qtyButton}
                      aria-label={`Ajouter un ${product.name}`}
                    >
                      +
                    </button>
                  </span>
                  <strong style={{ width: "110px", textAlign: "right" }}>
                    {formatFCFA(product.price * qty)}
                  </strong>
                  <button
                    onClick={() => setQty(product, 0)}
                    style={{ ...qtyButton, background: "transparent" }}
                    aria-label={`Supprimer ${product.name} du panier`}
                    title="Retirer du panier"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={totalsBox}>
            <div style={totalRow}>
              <span>Total HT</span>
              <span>{formatFCFA(totalHt)}</span>
            </div>
            <div style={totalRow}>
              <span>TVA</span>
              <span>{formatFCFA(totalVat)}</span>
            </div>
            <div style={{ ...totalRow, fontSize: "22px", fontWeight: 700 }}>
              <span>Total TTC</span>
              <span>{formatFCFA(total)}</span>
            </div>
          </div>

          <div style={{ margin: "16px 0 8px", fontWeight: 600 }}>Paiement</div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {Object.entries(PAYMENT_LABELS).map(([code, label]) => (
              <button
                key={code}
                onClick={() => setPaymentMethod(code)}
                aria-pressed={paymentMethod === code}
                style={payButton(paymentMethod === code)}
              >
                {label}
              </button>
            ))}
          </div>

          {paymentMethod === "CASH" && (
            <div style={{ marginTop: "12px", display: "grid", gap: "6px" }}>
              <label style={{ display: "grid", gap: "4px" }}>
                <span>Montant reçu (FCFA)</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  style={inputStyle}
                />
              </label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <button
                  onClick={() => setAmountReceived(String(total))}
                  style={quickButton}
                  disabled={total === 0}
                >
                  Compte juste
                </button>
                {[1000, 2000, 5000, 10000]
                  .map((b) => Math.ceil(total / b) * b)
                  .filter((v, i, arr) => v > total && arr.indexOf(v) === i)
                  .slice(0, 3)
                  .map((v) => (
                    <button
                      key={v}
                      onClick={() => setAmountReceived(String(v))}
                      style={quickButton}
                    >
                      {formatFCFA(v)}
                    </button>
                  ))}
              </div>
              {change !== null && (
                <div
                  style={{
                    ...totalRow,
                    fontSize: "18px",
                    fontWeight: 700,
                    color: change < 0 ? "#dc2626" : "#16a34a",
                  }}
                >
                  <span>{change < 0 ? "Manque" : "Monnaie à rendre"}</span>
                  <span>{formatFCFA(Math.abs(change))}</span>
                </div>
              )}
            </div>
          )}

          {error && <p style={{ color: "#dc2626" }}>{error}</p>}

          <button
            onClick={handleCheckout}
            disabled={!canCheckout}
            style={{
              ...checkoutButton,
              background: canCheckout ? "#16a34a" : "#9ca3af",
              cursor: canCheckout ? "pointer" : "not-allowed",
            }}
          >
            {submitting ? "Encaissement…" : `Encaisser ${formatFCFA(total)}`}
          </button>
          {lines.length > 0 && (
            <button
              onClick={() => {
                setCart({});
                setAmountReceived("");
                setError("");
              }}
              style={{ ...quickButton, width: "100%", marginTop: "8px" }}
            >
              Vider le panier
            </button>
          )}
        </section>
      </div>
    </div>
  );
}

const inputStyle = {
  padding: "8px",
  borderRadius: "4px",
  border: "1px solid #ccc",
  fontSize: "14px",
  boxSizing: "border-box",
};

const productButton = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #ddd",
  background: "transparent",
  color: "inherit",
  fontSize: "14px",
};

const cartBox = {
  border: "1px solid #ddd",
  borderRadius: "8px",
  padding: "16px",
};

const cartLine = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  paddingBottom: "8px",
  borderBottom: "1px solid #eee",
  fontSize: "14px",
};

const qtyButton = {
  width: "30px",
  height: "30px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  background: "#f3f4f6",
  color: "#111",
  cursor: "pointer",
  padding: 0,
};

const totalsBox = {
  display: "grid",
  gap: "4px",
  paddingTop: "8px",
  borderTop: "2px solid #ddd",
};

const totalRow = { display: "flex", justifyContent: "space-between" };

function payButton(active) {
  return {
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid #2563eb",
    background: active ? "#2563eb" : "transparent",
    color: active ? "white" : "#2563eb",
    cursor: "pointer",
    fontWeight: 600,
  };
}

const quickButton = {
  padding: "6px 10px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  background: "#f3f4f6",
  color: "#111",
  cursor: "pointer",
  fontSize: "13px",
};

const checkoutButton = {
  width: "100%",
  marginTop: "16px",
  padding: "14px",
  border: "none",
  borderRadius: "8px",
  color: "white",
  fontSize: "18px",
  fontWeight: 700,
};
