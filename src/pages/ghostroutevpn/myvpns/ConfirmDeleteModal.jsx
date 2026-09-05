// src/pages/ghostroutevpn/myvpns/ConfirmDeleteModal.jsx
import { useState } from "react";
import styles from "./ConfirmDeleteModal.module.css";

export default function ConfirmDeleteModal({ vpn, isActive, onConfirm, onCancel }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm(vpn);
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  return (
    <div className={styles.overlay} onMouseDown={busy ? undefined : onCancel}>
      <div
        className={styles.modal}
        role="alertdialog"
        aria-modal="true"
        aria-label="Delete confirmation"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <span className={styles.type}>{vpn.vpn_type}</span>
        <h3 className={styles.title}>
          {isActive ? "This can't be undone!" : "Delete this pending payment?"}
        </h3>

        {isActive ? (
          <p className={styles.body}>
            This VPN will stop working immediately. If you're currently
            connected, that connection will drop right away, and the file
            you downloaded for it won't reconnect afterward!
          </p>
        ) : (
          <p className={styles.body}>
            This purchase hasn't been paid for yet, so nothing will be
            charged!
          </p>
        )}

        {error && (
          <p className={styles.error}>
            {error.code === "payment-id not found!"
              ? "This item was already removed."
              : "Couldn't delete this right now. Try again shortly."}
          </p>
        )}
        <div className={styles.actions}>
          <button
            type="button"
            className={isActive ? styles.confirmDanger : styles.confirm}
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? "deleting…" : isActive ? "yes, disconnect & delete" : "delete"}
          </button>
          <button
            type="button"
            className={styles.cancel}
            onClick={onCancel}
            disabled={busy}
          >
            cancel
          </button>
        </div>
      </div>
    </div>
  );
}
