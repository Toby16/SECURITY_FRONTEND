// src/pages/ghostroutevpn/myvpns/VpnPaymentModal.jsx
import { useEffect, useState } from "react";
import {
  fetchVpnPaymentDetail,
  verifyVpnPayment,
} from "../../../services/ghostrouteVpnService.js";
import styles from "./VpnPaymentModal.module.css";

export default function VpnPaymentModal({ paymentId, onClose, onVerified }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetchVpnPaymentDetail(paymentId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });

    function handleKey(e) {
      if (e.key === "Escape" && !verifying) onClose();
    }
    window.addEventListener("keydown", handleKey);

    return () => {
      cancelled = true;
      window.removeEventListener("keydown", handleKey);
    };
  }, [paymentId, onClose, verifying]);

  async function handleVerify() {
    setVerifying(true);
    setVerifyError(null);
    try {
      await verifyVpnPayment(paymentId);
      await onVerified?.(); // refetches vpns + balance in the parent
      onClose();
    } catch (err) {
      setVerifyError(err);
      setVerifying(false);
      setConfirming(false);
    }
  }

  function handleOverlayClose() {
    if (verifying) return;
    onClose();
  }

  return (
    <div className={styles.overlay} onMouseDown={handleOverlayClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Payment detail"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Close"
          disabled={verifying}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M5 5l14 14M19 5 5 19" />
          </svg>
        </button>

        {!detail && !error && <div className={styles.state}>Loading payment detail…</div>}

        {error && (
          <div className={styles.state}>
            {error.code === "NOT_FOUND"
              ? "This payment no longer exists."
              : "Couldn't load this payment. Try again shortly."}
          </div>
        )}

        {detail && !confirming && (
          <>
            <div className={styles.head}>
              <span className={styles.name}>{detail.vpn_type}</span>
              <span className={styles.pending}>pending payment</span>
            </div>

            <dl className={styles.rows}>
              <div className={styles.row}>
                <dt>Duration</dt>
                <dd>{detail.days_for} days</dd>
              </div>
              <div className={styles.row}>
                <dt>Days remaining</dt>
                <dd>{detail.days_left} days</dd>
              </div>
              <div className={styles.row}>
                <dt>Price per day</dt>
                <dd>${detail.dollar_price_per_day} · ₦{detail.naira_price_per_day.toLocaleString()}</dd>
              </div>
              <div className={styles.row}>
                <dt>Total</dt>
                <dd className={styles.total}>
                  ${detail.dollar_total_price} · ₦{detail.naira_total_price.toLocaleString()}
                </dd>
              </div>
              <div className={styles.row}>
                <dt>Auto-renew</dt>
                <dd>{detail.auto_renew ? "On" : "Off"}</dd>
              </div>
            </dl>

            <p className={styles.note}>
              Verifying this payment will deduct the total amount from your balance.
            </p>

            <div className={styles.actions}>
              <button type="button" className={styles.cancel} onClick={onClose}>
                cancel
              </button>
              <button type="button" className={styles.verify} onClick={() => setConfirming(true)}>
                verify
              </button>
            </div>
          </>
        )}

        {detail && confirming && (
          <>
            <div className={styles.head}>
              <span className={styles.name}>Confirm payment</span>
            </div>

            <p className={styles.note}>
              ${detail.dollar_total_price} · ₦{detail.naira_total_price.toLocaleString()} will be
              deducted from your balance to activate this {detail.vpn_type} configuration. This can't be
              reversed.
            </p>

            {verifyError && (
              <p className={styles.note} style={{ color: "#e08585" }}>
                {verifyError.code === "payment id not found!"
                  ? "This payment no longer exists."
                  : verifyError.message || "Couldn't verify this payment. Try again shortly."}
              </p>
            )}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.cancel}
                onClick={() => setConfirming(false)}
                disabled={verifying}
              >
                back
              </button>
              <button
                type="button"
                className={styles.verify}
                onClick={handleVerify}
                disabled={verifying}
              >
                {verifying ? "paying…" : "confirm & pay"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
