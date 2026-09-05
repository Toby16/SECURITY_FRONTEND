// src/pages/ghostroutevpn/protocols/ProtocolCard.jsx
import { useEffect, useState } from "react";
import {
  formatProtocolPrice,
  fetchVpnPeerCount,
} from "../../../services/ghostrouteVpnService.js";
import { iconForFeature } from "./icons.jsx";
import styles from "./ProtocolCard.module.css";

const SLOT_POLL_INTERVAL_MS = 15000;

export default function ProtocolCard({ protocol, currency, onShowMore, onSelect }) {
  const hasMultiplePrices = protocol.pricing.length > 1;

  // Live slot availability — configs are handed out first-come-first-served,
  // so users can see (roughly) in real time whether a spot is likely to
  // still be there by the time they pay.
  const [slots, setSlots] = useState(null); // { used, available }
  const [slotsError, setSlotsError] = useState(null);

  useEffect(() => {
    if (!protocol.ipAddress) return;
    let cancelled = false;

    function poll() {
      fetchVpnPeerCount({ vpnType: protocol.key, ipAddress: protocol.ipAddress })
        .then((data) => {
          if (cancelled || !data) return;
          setSlots({ used: data.used_count, available: data.available_count });
          setSlotsError(null);
        })
        .catch((err) => {
          if (!cancelled) setSlotsError(err);
        });
    }

    poll(); // fetch immediately, then keep it live
    const intervalId = setInterval(poll, SLOT_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [protocol.key, protocol.ipAddress]);

  const slotPercent = slots
    ? Math.min(100, (slots.used / Math.max(slots.available, 1)) * 100)
    : 0;

  return (
    <article className={styles.card}>
      <div className={styles.sheen} aria-hidden="true" />

      <div className={styles.head}>
        <h2 className={styles.name}>{protocol.name}</h2>
        <span className={styles.price}>
          {formatProtocolPrice(protocol.cardPrice, currency)}
          {hasMultiplePrices && <span className={styles.priceFrom}></span>}
        </span>
      </div>

      <ul className={styles.features}>
        {protocol.previewFeatures.map((feature) => {
          const Icon = iconForFeature(feature);
          return (
            <li key={feature} className={styles.feature}>
              <Icon className={styles.featureIcon} />
              <span>{feature}</span>
            </li>
          );
        })}
      </ul>

      {protocol.hasMore && (
        <button type="button" className={styles.showMore} onClick={onShowMore}>
          show more…
        </button>
      )}

      <button type="button" className={styles.select} onClick={onSelect}>
        select to continue
      </button>

      <div className={styles.slots}>
        <span className={styles.slotsLabel}>
          <span className={styles.liveDot} aria-hidden="true" />
          live spaces
        </span>
        <span className={styles.slotsCount}>
          {slots
            ? `${slots.used.toLocaleString()} / ${slots.available.toLocaleString()} used`
            : slotsError
            ? "unavailable right now"
            : "checking availability…"}
        </span>
      </div>

      {slots && (
        <div className={styles.slotsTrack}>
          <div className={styles.slotsFill} style={{ width: `${slotPercent}%` }} />
        </div>
      )}
    </article>
  );
}
