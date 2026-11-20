import { useEffect, useState } from "react";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // états du formulaire d'ajout
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const API_BASE_URL = "http://localhost:3000";

  async function fetchProducts() {
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
  }

  useEffect(() => {
    fetchProducts();
  }, []);

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
      `Supprimer le produit "${product.name}" ?`
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

  // 🔧 MODIFICATION (avec prompt pour aller vite)
  async function handleEdit(product) {
    const newName = window.prompt("Nouveau nom :", product.name);
    if (newName === null) return; // annulé

    const newSku = window.prompt("Nouveau SKU :", product.sku);
    if (newSku === null) return;

    const newQuantityStr = window.prompt(
      "Nouvelle quantité :",
      String(product.quantity)
    );
    if (newQuantityStr === null) return;

    const newQuantity = Number(newQuantityStr);
    if (Number.isNaN(newQuantity) || newQuantity < 0) {
      alert("Quantité invalide.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${product.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newName.trim(),
          sku: newSku.trim(),
          quantity: newQuantity,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Erreur API (${res.status})`);
      }

      await res.json();
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert(err.message || "Erreur lors de la mise à jour du produit.");
    }
  }

  return (
    <div
      style={{
        padding: "24px",
        fontFamily: "system-ui",
        maxWidth: "900px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ marginBottom: "16px" }}>📦 Produits en stock</h1>

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
            <span>Quantité</span>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              style={inputStyle}
              min={0}
            />
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
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td style={tdStyle}>{p.id}</td>
                    <td style={tdStyle}>{p.name}</td>
                    <td style={tdStyle}>{p.sku}</td>
                    <td style={tdStyle}>{p.quantity}</td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => handleEdit(p)}
                        style={actionButtonStyle}
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        style={{ ...actionButtonStyle, background: "#dc2626" }}
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
