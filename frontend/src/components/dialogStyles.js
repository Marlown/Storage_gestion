// Styles partagés par les fenêtres modales

export const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px",
  zIndex: 10,
};

export const dialogStyle = {
  background: "white",
  color: "#111",
  borderRadius: "8px",
  padding: "24px",
  width: "100%",
  maxWidth: "420px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
};

export const labelStyle = { display: "flex", flexDirection: "column", gap: "4px" };

export const inputStyle = {
  padding: "8px",
  borderRadius: "4px",
  border: "1px solid #ccc",
  fontSize: "14px",
  background: "white",
  color: "#111",
};

export const primaryButton = {
  padding: "8px 16px",
  border: "none",
  borderRadius: "6px",
  color: "white",
  cursor: "pointer",
};

export const secondaryButton = {
  ...primaryButton,
  background: "#e5e7eb",
  color: "#111",
};
