// src/pages/ghostroutevpn/protocols/ProtocolModal.jsx
import { useEffect } from "react";
import { formatProtocolPrice } from "../../../services/ghostrouteVpnService.js";
import { iconForFeature } from "./icons.jsx";
import styles from "./ProtocolModal.module.css";

export default function ProtocolModal({ protocol, currency, onClose, onSelect }) {
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={`${protocol.name} features`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M5 5l14 14M19 5 5 19" />
          </svg>
        </button>

        <div className={styles.head}>
          <span className={styles.name}>{protocol.name}</span>
          <span className={styles.tag}>{protocol.tag}</span>
        </div>

        <div className={styles.pricing}>
          {protocol.pricing.map((price) => (
            <span key={price.value} className={styles.priceChip}>
              {formatProtocolPrice(price, currency)}
            </span>
          ))}
        </div>

        <ul className={styles.features}>
          {protocol.features.map((feature) => {
            const Icon = iconForFeature(feature);
            return (
              <li key={feature} className={styles.feature}>
                <Icon className={styles.featureIcon} />
                <span>{feature}</span>
              </li>
            );
          })}
        </ul>

        <button type="button" className={styles.select} onClick={onSelect}>
          select to continue
        </button>
      </div>
    </div>
  );
}
