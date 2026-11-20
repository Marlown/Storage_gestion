// Statut de stock d'un produit : "out" (rupture), "low" (sous le seuil) ou "ok"
export function stockStatus(product) {
  if (product.quantity === 0) return "out";
  if (product.minQuantity > 0 && product.quantity <= product.minQuantity) {
    return "low";
  }
  return "ok";
}
