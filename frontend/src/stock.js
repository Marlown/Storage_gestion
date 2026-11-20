// Statut de stock d'un produit : "out" (rupture), "low" (sous le seuil) ou "ok"
export function stockStatus(product) {
  if (product.quantity === 0) return "out";
  if (product.minQuantity > 0 && product.quantity <= product.minQuantity) {
    return "low";
  }
  return "ok";
}

// Normalise un texte pour la recherche : minuscules, sans accents
export function normalize(text) {
  return String(text).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// Le produit correspond-il à la recherche (nom ou SKU) ?
export function matchesSearch(product, search) {
  const q = normalize(search);
  if (!q) return true;
  return (
    normalize(product.name).includes(q) || normalize(product.sku).includes(q)
  );
}
