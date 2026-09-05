// src/pages/ghostroutevpn/MyVpns.jsx
import { useCallback, useEffect, useState } from "react";
import { getToken, getUserProfile } from "../../services/authService.js";
import {
  fetchMyVpns,
  deleteVpnPayment,
  MAX_VPNS_PER_USER,
} from "../../services/ghostrouteVpnService.js";
import VpnEntryCard from "./myvpns/VpnEntryCard.jsx";
import VpnPaymentModal from "./myvpns/VpnPaymentModal.jsx";
import VpnDetailModal from "./myvpns/VpnDetailModal.jsx";
import ConfirmDeleteModal from "./myvpns/ConfirmDeleteModal.jsx";
import styles from "./MyVpns.module.css";

export default function MyVpns() {
  const [vpns, setVpns] = useState(null);
  const [error, setError] = useState(null);
  const [currency, setCurrency] = useState("usd");
  const [balance, setBalance] = useState(null);
  const [activePaymentId, setActivePaymentId] = useState(null);
  const [detailPaymentId, setDetailPaymentId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // the vpn object being deleted

  const loadVpns = useCallback(() => {
    return fetchMyVpns()
      .then((data) => setVpns(data))
      .catch((err) => setError(err));
  }, []);

  const loadBalance = useCallback(() => {
    const token = getToken();
    if (!token) return Promise.resolve();
    return getUserProfile(token)
      .then(({ user }) => {
        setBalance({
          dollar: user?.dollar_balance ?? 0,
          naira: user?.naira_balance ?? 0,
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadVpns();
    loadBalance();
  }, [loadVpns, loadBalance]);

  // called after a successful verify — refresh everything so balance + list stay in sync
  const refreshAll = useCallback(() => {
    return Promise.all([loadVpns(), loadBalance()]);
  }, [loadVpns, loadBalance]);

  async function handleConfirmDelete(vpn) {
    await deleteVpnPayment(vpn.payment_id);
    setVpns((prev) => (prev ?? []).filter((v) => v.payment_id !== vpn.payment_id));
    setDeleteTarget(null);
  }

  const active = (vpns ?? [])
    .filter((v) => v.transaction_status)
    .sort((a, b) => a.days_left - b.days_left);

  const pending = (vpns ?? [])
    .filter((v) => !v.transaction_status)
    .sort((a, b) => a.days_left - b.days_left);

  return (
    <section>
      <div className={styles.head}>
        <div className={styles.intro}>
          <h1 className={styles.title}>My VPNs</h1>
          <p className={styles.subtitle}>
            {vpns
              ? `${vpns.length} of ${MAX_VPNS_PER_USER} slots used`
              : "Your active connections will live here."}
          </p>
        </div>
        <div className={styles.headRight}>
          {balance && (
            <div className={styles.balance} title="Your current balance">
              <span>${balance.dollar.toFixed(2)}</span>
              <span className={styles.balanceDot} />
              <span>₦{balance.naira.toLocaleString()}</span>
            </div>
          )}

          {vpns && vpns.length > 0 && (
            <div className={styles.currencyToggle} role="tablist" aria-label="Currency">
              <button
                type="button"
                role="tab"
                aria-selected={currency === "usd"}
                className={currency === "usd" ? styles.currencyBtnActive : styles.currencyBtn}
                onClick={() => setCurrency("usd")}
              >
                $
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={currency === "ngn"}
                className={currency === "ngn" ? styles.currencyBtnActive : styles.currencyBtn}
                onClick={() => setCurrency("ngn")}
              >
                ₦
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className={styles.state}>
          {error.code === "UNAUTHENTICATED"
            ? "Sign in to see your VPNs."
            : "Couldn't load your VPNs. Try again shortly."}
        </div>
      )}

      {!error && !vpns && <div className={styles.state}>Loading your VPNs…</div>}

      {!error && vpns && vpns.length === 0 && (
        <div className={styles.state}>No VPNs yet — pick a protocol to get started.</div>
      )}

      {!error && active.length > 0 && (
        <div className={styles.group}>
          <h2 className={styles.groupLabel}>Active</h2>
          <div className={styles.grid}>
            {active.map((vpn) => (
              <VpnEntryCard
                key={vpn.payment_id}
                vpn={vpn}
                currency={currency}
                onClick={() => setDetailPaymentId(vpn.payment_id)}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        </div>
      )}

      {!error && pending.length > 0 && (
        <div className={styles.group}>
          <h2 className={styles.groupLabel}>Pending payment</h2>
          <div className={styles.grid}>
            {pending.map((vpn) => (
              <VpnEntryCard
                key={vpn.payment_id}
                vpn={vpn}
                currency={currency}
                onClick={() => setActivePaymentId(vpn.payment_id)}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        </div>
      )}

      {activePaymentId && (
        <VpnPaymentModal
          paymentId={activePaymentId}
          onClose={() => setActivePaymentId(null)}
          onVerified={refreshAll}
        />
      )}

      {detailPaymentId && (
        <VpnDetailModal
          paymentId={detailPaymentId}
          onClose={() => setDetailPaymentId(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          vpn={deleteTarget}
          isActive={Boolean(deleteTarget.transaction_status)}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </section>
  );
}
