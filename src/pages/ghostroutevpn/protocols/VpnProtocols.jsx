// src/pages/ghostroutevpn/protocols/VpnProtocols.jsx
import { useEffect, useState } from "react";
import { fetchVpnProtocols } from "../../../services/ghostrouteVpnService.js";
import ProtocolCard from "./ProtocolCard.jsx";
import ProtocolModal from "./ProtocolModal.jsx";
import styles from "./VpnProtocols.module.css";

export default function VpnProtocols() {
  const [protocols, setProtocols] = useState(null);
  const [error, setError] = useState(null);
  const [activeProtocol, setActiveProtocol] = useState(null); // for the "show more" modal

  useEffect(() => {
    let cancelled = false;

    fetchVpnProtocols()
      .then((data) => {
        if (!cancelled) setProtocols(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleSelect(protocol) {
    // Hand off to plan selection. Adjust the destination to whatever route
    // owns "choose a plan" — kept as a console flag for now.
    console.log("proceed to plan selection for:", protocol.key);
  }

  return (
    <section>
      <div className={styles.intro}>
        <h1 className={styles.title}>Choose your protocol</h1>
        <p className={styles.subtitle}>
          Both routes are encrypted end to end. Pick the one that fits how you connect.
        </p>
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
              onShowMore={() => setActiveProtocol(protocol)}
              onSelect={() => handleSelect(protocol)}
            />
          ))}
        </div>
      )}

      {activeProtocol && (
        <ProtocolModal
          protocol={activeProtocol}
          onClose={() => setActiveProtocol(null)}
          onSelect={() => {
            handleSelect(activeProtocol);
            setActiveProtocol(null);
          }}
        />
      )}
    </section>
  );
}
