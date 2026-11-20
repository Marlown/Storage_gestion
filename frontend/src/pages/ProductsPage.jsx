import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "../api";
import MovementDialog from "../components/MovementDialog";
import EditProductDialog from "../components/EditProductDialog";
import StockSummary from "../components/StockSummary";
import { matchesSearch, stockStatus } from "../stock";

export default function ProductsPage({ onShowHistory }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // états du formulaire d'ajout
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [minQuantity, setMinQuantity] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // mouvement de stock en cours de saisie : { product, type: "IN" | "OUT" }
  const [movement, setMovement] = useState(null);
  // produit en cours de modification
  const [editing, setEditing] = useState(null);
  // n'afficher que les produits en rupture ou sous le seuil
  const [alertsOnly, setAlertsOnly] = useState(false);

  // recherche par nom ou SKU
  const [search, setSearch] = useState("");

  const visibleProducts = products.filter(
    (p) => matchesSearch(p, search) && (!alertsOnly || stockStatus(p) !== "ok"),
  );
  const isFiltered = search.trim() !== "" || alertsOnly;

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API_BASE_URL}/api/products`);

      if (!res.ok) {
        throw new Error(`Erreur API (${res.status})`);
      }

      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error(err);
      setError("Impossible de récupérer les produits.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!name.trim() || !sku.trim()) {
      setFormError("Les champs Nom et SKU sont obligatoires.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          sku: sku.trim(),
          quantity: Number(quantity) || 0,
          minQuantity: Number(minQuantity) || 0,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Erreur API (${res.status})`);
      }

      await res.json();

      setFormSuccess("Produit ajouté avec succès ✅");
      setName("");
      setSku("");
      setQuantity(0);
      setMinQuantity(0);

      fetchProducts();
    } catch (err) {
      console.error(err);
      setFormError(err.message || "Erreur lors de l'ajout du produit.");
    } finally {
      setSubmitting(false);
    }
  }

  // 🔧 SUPPRESSION
  async function handleDelete(product) {
    const confirmDelete = window.confirm(
      `Supprimer le produit "${product.name}" ?`,
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${product.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Erreur API (${res.status})`);
      }

      await res.json();
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert(err.message || "Erreur lors de la suppression du produit.");
    }
  }

  return (
    <div>
      {movement && (
        <MovementDialog
          product={movement.product}
          type={movement.type}
          onClose={() => setMovement(null)}
          onDone={() => {
            setMovement(null);
            fetchProducts();
          }}
        />
      )}

      {editing && (
        <EditProductDialog
          product={editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            fetchProducts();
          }}
        />
      )}

      <h1 style={{ marginBottom: "16px" }}>📦 Produits en stock</h1>

      {!loading && !error && <StockSummary products={products} />}

      {/* Formulaire d'ajout */}
      <section
        style={{
          marginBottom: "24px",
          padding: "16px",
          border: "1px solid #ddd",
          borderRadius: "8px",
          background: "#fafafa",
        }}
      >
        <h2 style={{ marginBottom: "12px", fontSize: "18px" }}>
          ➕ Ajouter un produit
        </h2>

        {formError && (
          <p style={{ color: "red", marginBottom: "8px" }}>{formError}</p>
        )}
        {formSuccess && (
          <p style={{ color: "green", marginBottom: "8px" }}>{formSuccess}</p>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "grid", gap: "8px", maxWidth: "400px" }}
        >
          <label
            style={{ display: "flex", flexDirection: "column", gap: "4px" }}
          >
            <span>Nom *</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
              placeholder="Ex : Clavier mécanique"
            />
          </label>

          <label
            style={{ display: "flex", flexDirection: "column", gap: "4px" }}
          >
            <span>SKU *</span>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              style={inputStyle}
              placeholder="Ex : CLAV-MEC-001"
            />
          </label>

          <label
            style={{ display: "flex", flexDirection: "column", gap: "4px" }}
          >
            <span>Stock initial</span>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              style={inputStyle}
              min={0}
            />
          </label>

          <label
            style={{ display: "flex", flexDirection: "column", gap: "4px" }}
          >
            <span>Seuil d'alerte</span>
            <input
              type="number"
              value={minQuantity}
              onChange={(e) => setMinQuantity(e.target.value)}
              style={inputStyle}
              min={0}
            />
            <small style={{ opacity: 0.7 }}>
              Alerte quand le stock descend à ce niveau (0 = alerte en rupture
              uniquement)
            </small>
          </label>

          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: "8px",
              padding: "8px 12px",
              background: submitting ? "#888" : "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Ajout en cours..." : "Ajouter"}
          </button>
        </form>
      </section>

      {/* Liste des produits */}
      {loading && <p>Chargement des produits...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && (
        <>
          {products.length === 0 ? (
            <p>Aucun produit pour le moment.</p>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "12px 24px",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="🔍 Rechercher par nom ou SKU…"
                  aria-label="Rechercher un produit"
                  style={{
                    ...inputStyle,
                    flex: "1 1 240px",
                    maxWidth: "360px",
                  }}
                />
                <label
                  style={{ display: "flex", gap: "8px", alignItems: "center" }}
                >
                  <input
                    type="checkbox"
                    checked={alertsOnly}
                    onChange={(e) => setAlertsOnly(e.target.checked)}
                  />
                  Uniquement les produits en alerte
                </label>
                {isFiltered && (
                  <span style={{ opacity: 0.7, fontSize: "14px" }}>
                    {visibleProducts.length} / {products.length} produit(s)
                  </span>
                )}
              </div>
              {visibleProducts.length === 0 ? (
                <p>
                  {search.trim()
                    ? `Aucun produit${alertsOnly ? " en alerte" : ""} ne correspond à « ${search.trim()} ».`
                    : "Aucun produit en alerte 👍"}
                </p>
              ) : (
                <table
                  style={{
                    borderCollapse: "collapse",
                    width: "100%",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={thStyle}>ID</th>
                      <th style={thStyle}>Nom</th>
                      <th style={thStyle}>SKU</th>
                      <th style={thStyle}>Quantité</th>
                      <th style={thStyle}>Seuil</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleProducts.map((p) => (
                      <tr key={p.id} style={rowStyle[stockStatus(p)]}>
                        <td style={tdStyle}>{p.id}</td>
                        <td style={tdStyle}>{p.name}</td>
                        <td style={tdStyle}>{p.sku}</td>
                        <td style={tdStyle}>
                          <strong>{p.quantity}</strong>{" "}
                          {stockStatus(p) === "out" && (
                            <span style={{ ...badge, background: "#dc2626" }}>
                              Rupture
                            </span>
                          )}
                          {stockStatus(p) === "low" && (
                            <span style={{ ...badge, background: "#d97706" }}>
                              Stock bas
                            </span>
                          )}
                        </td>
                        <td style={tdStyle}>{p.minQuantity || "—"}</td>
                        <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                          <button
                            onClick={() =>
                              setMovement({ product: p, type: "IN" })
                            }
                            style={{
                              ...actionButtonStyle,
                              background: "#16a34a",
                            }}
                            title="Entrée de stock"
                          >
                            + Entrée
                          </button>
                          <button
                            onClick={() =>
                              setMovement({ product: p, type: "OUT" })
                            }
                            style={{
                              ...actionButtonStyle,
                              background: "#ea580c",
                              opacity: p.quantity === 0 ? 0.4 : 1,
                              cursor:
                                p.quantity === 0 ? "not-allowed" : "pointer",
                            }}
                            title={
                              p.quantity === 0
                                ? "Stock vide"
                                : "Sortie de stock"
                            }
                            disabled={p.quantity === 0}
                          >
                            − Sortie
                          </button>
                          <button
                            onClick={() => onShowHistory(p.id)}
                            style={{
                              ...actionButtonStyle,
                              background: "#4b5563",
                            }}
                          >
                            Historique
                          </button>
                          <button
                            onClick={() => setEditing(p)}
                            style={actionButtonStyle}
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            style={{
                              ...actionButtonStyle,
                              background: "#dc2626",
                            }}
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

const thStyle = {
  border: "1px solid #ccc",
  padding: "8px 12px",
  background: "#f5f5f5",
  textAlign: "left",
};

const tdStyle = {
  border: "1px solid #ddd",
  padding: "8px 12px",
};

const inputStyle = {
  padding: "6px 8px",
  borderRadius: "4px",
  border: "1px solid #ccc",
  fontSize: "14px",
};

const actionButtonStyle = {
  padding: "4px 8px",
  marginRight: "6px",
  borderRadius: "4px",
  border: "none",
  cursor: "pointer",
  background: "#0f766e",
  color: "white",
  fontSize: "12px",
};

const badge = {
  padding: "2px 8px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 600,
  color: "white",
  marginLeft: "4px",
};

// fond des lignes selon le statut de stock (couleurs translucides : lisibles
// en thème clair comme sombre)
const rowStyle = {
  out: { background: "rgba(220, 38, 38, 0.12)" },
  low: { background: "rgba(217, 119, 6, 0.12)" },
  ok: {},
};
