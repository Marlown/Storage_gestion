// Calculs de TVA. Les prix sont saisis TTC, en FCFA entiers.

// Taux par défaut (en %) appliqué aux nouveaux produits sans taux précisé.
// Réglable dans .env : DEFAULT_VAT_RATE=18
export const DEFAULT_VAT_RATE = Number(process.env.DEFAULT_VAT_RATE ?? 18);

// Lit un taux de TVA : nombre entre 0 et 100 (exclu), 2 décimales max.
// Renvoie null si invalide.
export function parseVatRate(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n >= 100) return null;
  if (Math.round(n * 100) !== n * 100) return null;
  return n;
}

// Décompose un montant TTC en HT + TVA (arrondi au franc ; TVA = TTC - HT
// pour que HT + TVA = TTC exactement)
export function splitTtc(amountTtc, vatRate) {
  const ht = Math.round((amountTtc * 100) / (100 + vatRate));
  return { ht, vat: amountTtc - ht, ttc: amountTtc };
}
