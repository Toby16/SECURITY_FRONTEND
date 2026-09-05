// src/pages/ghostroutevpn/protocols/VpnProtocols.jsx
import { useEffect, useState } from "react";
import { getToken, getUserProfile } from "../../../services/authService.js";
import { fetchVpnProtocols } from "../../../services/ghostrouteVpnService.js";
import ProtocolCard from "./ProtocolCard.jsx";
import ProtocolModal from "./ProtocolModal.jsx";
import PurchaseModal from "./PurchaseModal.jsx";
import styles from "./VpnProtocols.module.css";

export default function VpnProtocols() {
  const [protocols, setProtocols] = useState(null);
  const [error, setError] = useState(null);
  const [activeProtocol, setActiveProtocol] = useState(null); // for the "show more" modal
  const [purchaseProtocol, setPurchaseProtocol] = useState(null); // for the buy/setup modal
  const [currency, setCurrency] = useState("usd"); // "usd" | "ngn"
  const [balance, setBalance] = useState(null); // { dollar, naira }

  useEffect(() => {
    let cancelled = false;

    fetchVpnProtocols()
      .then((data) => {
        if (!cancelled) setProtocols(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });

    const token = getToken();
    if (token) {
      getUserProfile(token)
        .then(({ user }) => {
          if (cancelled) return;
          // Same assumption as MyVpns.jsx — adjust these two keys if your
          // actual profile payload names balance fields differently.
          setBalance({
            dollar: user?.dollar_balance ?? 0,
            naira: user?.naira_balance ?? 0,
          });
        })
        .catch(() => {
          /* silent — balance is a convenience, not core to the page */
        });
    }

    return () => {
      cancelled = true;
    };
  }, []);

  function handleSelect(protocol) {
    setPurchaseProtocol(protocol);
  }

  return (
    <section>
      <div className={styles.head}>
        <div className={styles.intro}>
          <h1 className={styles.title}>Choose your protocol</h1>
          <p className={styles.subtitle}>
            Both routes are encrypted end to end. Pick the one that fits how you connect.
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

          {protocols && (
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
            ? "Sign in to see VPN protocols."
            : "Couldn't load VPN protocols. Try again shortly."}
        </div>
      )}

      {!error && !protocols && <div className={styles.state}>Loading protocols…</div>}

      {!error && protocols && (
        <div className={styles.grid}>
          {protocols.map((protocol) => (
            <ProtocolCard
              key={protocol.key}
              protocol={protocol}
              currency={currency}
              onShowMore={() => setActiveProtocol(protocol)}
              onSelect={() => handleSelect(protocol)}
            />
          ))}
        </div>
      )}

      {activeProtocol && (
        <ProtocolModal
          protocol={activeProtocol}
          currency={currency}
          onClose={() => setActiveProtocol(null)}
          onSelect={() => {
            handleSelect(activeProtocol);
            setActiveProtocol(null);
          }}
        />
      )}

      {purchaseProtocol && (
        <PurchaseModal
          protocol={purchaseProtocol}
          currency={currency}
          onClose={() => setPurchaseProtocol(null)}
        />
      )}
    </section>
  );
}
