// src/pages/ghostroutevpn/protocols/ProtocolCard.jsx
import { iconForFeature } from "./icons.jsx";
import styles from "./ProtocolCard.module.css";

export default function ProtocolCard({ protocol, onShowMore, onSelect }) {
  const hasMultiplePrices = protocol.pricing.length > 1;

  return (
    <article className={styles.card}>
      <div className={styles.sheen} aria-hidden="true" />

      <div className={styles.head}>
        <h2 className={styles.name}>{protocol.name}</h2>
        <span className={styles.price}>
          {protocol.cardPrice}
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
    </article>
  );
}
