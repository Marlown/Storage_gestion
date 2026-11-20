// Montants en francs CFA (entiers) et calculs de TVA, côté interface.
// Le serveur refait toujours les calculs : ceux-ci servent à l'affichage.

const formatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export function formatFCFA(amount) {
  return `${formatter.format(amount ?? 0)} FCFA`;
}

export function formatRate(rate) {
  return `${String(rate).replace(".", ",")} %`;
}

// Décompose un montant TTC en HT + TVA (même règle d'arrondi que le serveur)
export function splitTtc(amountTtc, vatRate) {
  const ht = Math.round((amountTtc * 100) / (100 + vatRate));
  return { ht, vat: amountTtc - ht, ttc: amountTtc };
}

export const PAYMENT_LABELS = {
  CASH: "Espèces",
  CARD: "Carte bancaire",
  MOBILE: "Mobile Money",
};

export const STORE_NAME = import.meta.env.VITE_STORE_NAME || "Storage Gestion";
