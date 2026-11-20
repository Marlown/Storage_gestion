export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

// Appel à l'API : renvoie le JSON, ou lève une Error avec le message du serveur
export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message || `Erreur API (${res.status})`);
  }
  return body;
}

export function formatDate(value) {
  return new Date(value).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
