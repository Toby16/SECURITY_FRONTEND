// src/pages/ghostroutevpn/myvpns/VpnEntryCard.jsx
import { BoltIcon, ShieldIcon } from "../protocols/icons.jsx";
import styles from "./VpnEntryCard.module.css";

const PROTOCOL_ICON = { wireguard: BoltIcon, openvpn: ShieldIcon };

function formatAmount(value, currency) {
  return currency === "ngn" ? `₦${value.toLocaleString()}` : `$${value}`;
}

function TrashIcon(props) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </svg>
  );
}

export default function VpnEntryCard({ vpn, currency, onClick, onDelete }) {
  const Icon = PROTOCOL_ICON[vpn.vpn_type] ?? BoltIcon;
  const isActive = vpn.transaction_status;
  const isClickable = Boolean(onClick);
  const progress =
    vpn.days_for > 0 ? Math.max(0, Math.min(1, vpn.days_left / vpn.days_for)) : 0;

  const totalPrice = currency === "ngn" ? vpn.naira_total_price : vpn.dollar_total_price;
  const perDayPrice = currency === "ngn" ? vpn.naira_price_per_day : vpn.dollar_price_per_day;

  const footerLabel = isActive && vpn.client_id ? vpn.client_id : vpn.payment_id;

  function handleDeleteClick(e) {
    e.stopPropagation(); // card itself may be clickable
    onDelete?.(vpn);
  }

  return (
    <article
      className={isClickable ? `${styles.card} ${styles.cardClickable}` : styles.card}
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick();
            }
          : undefined
      }
    >
      <div className={styles.head}>
        <div className={styles.name}>
          <Icon className={styles.icon} />
          <span>{vpn.vpn_type}</span>
        </div>
        <div className={styles.headActions}>
          <span className={`${styles.status} ${isActive ? styles.statusActive : styles.statusPending}`}>
            {isActive ? "active" : "pending payment"}
          </span>
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={handleDeleteClick}
            aria-label={isActive ? "Delete VPN" : "Delete pending payment"}
            title="Delete"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      <div className={styles.days}>
        <div className={styles.daysRow}>
          <span>{vpn.days_left} days left</span>
          <span className={styles.daysTotal}>of {vpn.days_for}</span>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      <div className={styles.meta}>
        <span>{formatAmount(totalPrice, currency)} total</span>
        <span className={styles.metaDot} />
        <span>{formatAmount(perDayPrice, currency)}/day</span>
        {vpn.auto_renew && <span className={styles.renewTag}>auto-renew</span>}
      </div>

      <div className={styles.footer}>{footerLabel}</div>
    </article>
  );
}
