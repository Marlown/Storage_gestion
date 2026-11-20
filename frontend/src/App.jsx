import { useState } from "react";
import ProductsPage from "./pages/ProductsPage";
import MovementsPage from "./pages/MovementsPage";

function App() {
  const [page, setPage] = useState("products");
  const [movementsProductId, setMovementsProductId] = useState(null);

  function showHistory(productId) {
    setMovementsProductId(productId);
    setPage("movements");
  }

  return (
    <div
      style={{
        padding: "24px",
        fontFamily: "system-ui",
        maxWidth: "1000px",
        margin: "0 auto",
      }}
    >
      <nav style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
        <button
          onClick={() => setPage("products")}
          style={tabStyle(page === "products")}
        >
          📦 Produits
        </button>
        <button
          onClick={() => {
            setMovementsProductId(null);
            setPage("movements");
          }}
          style={tabStyle(page === "movements")}
        >
          🔁 Mouvements
        </button>
      </nav>

      {page === "products" ? (
        <ProductsPage onShowHistory={showHistory} />
      ) : (
        <MovementsPage
          productId={movementsProductId}
          onProductChange={setMovementsProductId}
        />
      )}
    </div>
  );
}

function tabStyle(active) {
  return {
    padding: "8px 16px",
    borderRadius: "6px",
    border: "1px solid #2563eb",
    background: active ? "#2563eb" : "transparent",
    color: active ? "white" : "#2563eb",
    cursor: "pointer",
    fontWeight: 600,
  };
}

export default App;
