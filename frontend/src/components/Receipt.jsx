import { formatDate } from "../api";
import { formatFCFA, formatRate, PAYMENT_LABELS, STORE_NAME } from "../money";
import {
  overlayStyle,
  dialogStyle,
  primaryButton,
  secondaryButton,
} from "./dialogStyles";

// Ticket de caisse d'une vente, imprimable (seul le ticket s'imprime :
// voir la règle @media print dans index.css)
export default function Receipt({ sale, onClose }) {
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div
        style={{ ...dialogStyle, maxWidth: "380px" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Ticket de la vente n°${sale.id}`}
      >
        <div className="receipt" style={receiptStyle}>
          <div style={{ textAlign: "center", marginBottom: "8px" }}>
            <strong style={{ fontSize: "16px" }}>{STORE_NAME}</strong>
            <div>Ticket n°{sale.id}</div>
            <div>{formatDate(sale.createdAt)}</div>
          </div>

          <hr style={hrStyle} />

          {sale.items.map((it, i) => (
            <div key={i} style={{ marginBottom: "6px" }}>
              <div>{it.productName}</div>
              <div style={rowStyle}>
                <span>
                  {it.quantity} × {formatFCFA(it.unitPrice)}
                  {it.vatRate === 0 ? " (exo.)" : ""}
                </span>
                <span>{formatFCFA(it.lineTotal)}</span>
              </div>
            </div>
          ))}

          <hr style={hrStyle} />

          <div style={rowStyle}>
            <span>Total HT</span>
            <span>{formatFCFA(sale.totalHt)}</span>
          </div>
          <div style={rowStyle}>
            <span>TVA</span>
            <span>{formatFCFA(sale.totalVat)}</span>
          </div>
          <div style={{ ...rowStyle, fontSize: "16px", fontWeight: 700 }}>
            <span>TOTAL TTC</span>
            <span>{formatFCFA(sale.total)}</span>
          </div>

          <hr style={hrStyle} />

          <div style={rowStyle}>
            <span>Paiement</span>
            <span>{PAYMENT_LABELS[sale.paymentMethod]}</span>
          </div>
          {sale.paymentMethod === "CASH" && (
            <>
              <div style={rowStyle}>
                <span>Reçu</span>
                <span>{formatFCFA(sale.amountReceived)}</span>
              </div>
              <div style={rowStyle}>
                <span>Rendu</span>
                <span>{formatFCFA(sale.changeGiven)}</span>
              </div>
            </>
          )}

          <hr style={hrStyle} />

          <table style={{ width: "100%", fontSize: "11px" }}>
            <thead>
              <tr>
                <th style={vatCell}>Taux</th>
                <th style={vatCell}>HT</th>
                <th style={vatCell}>TVA</th>
                <th style={vatCell}>TTC</th>
              </tr>
            </thead>
            <tbody>
              {sale.vatSummary.map((v) => (
                <tr key={v.vatRate}>
                  <td style={vatCell}>{formatRate(v.vatRate)}</td>
                  <td style={vatCell}>{formatFCFA(v.ht)}</td>
                  <td style={vatCell}>{formatFCFA(v.vat)}</td>
                  <td style={vatCell}>{formatFCFA(v.ttc)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p style={{ textAlign: "center", margin: "12px 0 0" }}>
            Merci de votre visite !
          </p>
        </div>

        <div
          className="no-print"
          style={{
            display: "flex",
            gap: "8px",
            justifyContent: "flex-end",
            marginTop: "16px",
          }}
        >
          <button type="button" onClick={onClose} style={secondaryButton}>
            Fermer
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            style={{ ...primaryButton, background: "#2563eb" }}
          >
            🖨️ Imprimer
          </button>
        </div>
      </div>
    </div>
  );
}

const receiptStyle = {
  fontFamily: "ui-monospace, Menlo, Consolas, monospace",
  fontSize: "13px",
  lineHeight: 1.45,
};

const rowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
};

const hrStyle = {
  border: "none",
  borderTop: "1px dashed #999",
  margin: "8px 0",
};

const vatCell = { textAlign: "right", padding: "1px 2px", fontWeight: 400 };
