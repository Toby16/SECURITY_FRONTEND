// src/pages/ghostroutevpn/protocols/PurchaseModal.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom"; // swap for your router if different
import {
  initializeVpnPayment,
  verifyVpnPayment,
  formatDollarAmount,
  OPENVPN_PACKAGES,
  WIREGUARD_MIN_DAYS,
  WIREGUARD_MAX_DAYS,
  WIREGUARD_DOLLAR_PER_DAY,
} from "../../../services/ghostrouteVpnService.js";
import styles from "./PurchaseModal.module.css";

export default function PurchaseModal({ protocol, currency, onClose }) {
  const navigate = useNavigate();
  const isWireguard = protocol.key === "wireguard";

  const [days, setDays] = useState(WIREGUARD_MIN_DAYS);
  const [packageIndex, setPackageIndex] = useState(0);
  const [autoRenew, setAutoRenew] = useState(false);
  const [submitting, setSubmitting] = useState(null); // "save" | "verify" | null
  const [error, setError] = useState(null);

  const daysFor = isWireguard ? days : OPENVPN_PACKAGES[packageIndex].daysFor;
  const totalDollar = isWireguard
    ? days * WIREGUARD_DOLLAR_PER_DAY
    : OPENVPN_PACKAGES[packageIndex].dollar;

  async function handleSubmit(mode) {
    setError(null);
    setSubmitting(mode);
    try {
      const init = await initializeVpnPayment({
        vpnType: protocol.key,
        ipAddress: protocol.ipAddress,
        daysFor,
        autoRenew,
      });

      const paymentId = init?.data?.payment_id;

      if (mode === "save") {
        onClose();
        navigate(`/ghostroutevpn/my-vpns?payment_id=${paymentId}&status=unverified`);
        return;
      }

      // "verify": initialize then verify, back-to-back
      await verifyVpnPayment(paymentId);
      onClose();
      navigate(`/ghostroutevpn/my-vpns?payment_id=${paymentId}&status=verified`);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={`Set up ${protocol.name}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M5 5l14 14M19 5 5 19" />
          </svg>
        </button>

        <div className={styles.head}>
          <span className={styles.name}>{protocol.name}</span>
          <span className={styles.tag}>set up your plan</span>
        </div>

        {isWireguard ? (
          <div className={styles.section}>
            <span className={styles.label}>Duration</span>
            <div className={styles.counter}>
              <button
                type="button"
                className={styles.counterBtn}
                onClick={() => setDays((d) => Math.max(WIREGUARD_MIN_DAYS, d - 1))}
                disabled={days <= WIREGUARD_MIN_DAYS}
                aria-label="Decrease days"
              >
                −
              </button>
              <span className={styles.counterValue}>
                {days} {days === 1 ? "day" : "days"}
              </span>
              <button
                type="button"
                className={styles.counterBtn}
                onClick={() => setDays((d) => Math.min(WIREGUARD_MAX_DAYS, d + 1))}
                disabled={days >= WIREGUARD_MAX_DAYS}
                aria-label="Increase days"
              >
                +
              </button>
            </div>
            <span className={styles.hint}>
              {formatDollarAmount(WIREGUARD_DOLLAR_PER_DAY, currency)} per day · up to {WIREGUARD_MAX_DAYS} days
            </span>
          </div>
        ) : (
          <div className={styles.section}>
            <span className={styles.label}>Choose a package</span>
            <div className={styles.packages}>
              {OPENVPN_PACKAGES.map((pkg, i) => (
                <button
                  key={pkg.daysFor}
                  type="button"
                  className={i === packageIndex ? styles.packageBtnActive : styles.packageBtn}
                  onClick={() => setPackageIndex(i)}
                >
                  <span className={styles.packageDays}>{pkg.daysFor} days</span>
                  <span className={styles.packagePrice}>{formatDollarAmount(pkg.dollar, currency)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={styles.section}>
          <div className={styles.toggleRow}>
            <div className={styles.toggleText}>
              <span className={styles.label}>Auto renew</span>
              <span className={styles.subLabel}>Automatically extend this VPN when it expires</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoRenew}
              className={autoRenew ? styles.toggleOn : styles.toggleOff}
              onClick={() => setAutoRenew((v) => !v)}
            >
              <span className={styles.toggleKnob} />
            </button>
          </div>
        </div>

        <div className={styles.totalRow}>
          <span>Total</span>
          <span className={styles.totalPrice}>{formatDollarAmount(totalDollar, currency)}</span>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={() => handleSubmit("save")}
            disabled={submitting !== null}
          >
            {submitting === "save" ? "saving…" : "save"}
          </button>
          <button
            type="button"
            className={styles.verifyBtn}
            onClick={() => handleSubmit("verify")}
            disabled={submitting !== null}
          >
            {submitting === "verify" ? "verifying…" : "purchase"}
          </button>
        </div>
      </div>
    </div>
  );
}
