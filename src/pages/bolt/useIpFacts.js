// src/pages/bolt/useIpFacts.js
import { useEffect, useState } from 'react';

const IP_ORACLE_URL = 'https://secure.ghostroute.icu/api/v1.0/scanoracle/get/ip_address/';

// Curated pool of "fun fact" fields — deliberately excludes threat/vpn/proxy
// scores and any contact details, since those aren't meant for casual display.
const FACT_BUILDERS = [
  (d) => d.city && d.country_name && { icon: '📍', label: "You're browsing from", value: `${d.city}, ${d.country_name}` },
  (d) => d.organization && { icon: '🛰️', label: 'Your ISP', value: d.organization },
  (d) => d.ip_address && { icon: '🌐', label: 'Public IP', value: d.ip_address },
  (d) => d.timezone && { icon: '🕒', label: 'Local timezone', value: d.timezone },
  (d) => d.country_current_time_12hr && d.country_name && { icon: '⏰', label: `Right now in ${d.country_name}`, value: d.country_current_time_12hr },
  (d) => d.country_currency_code && d.country_currency_symbol && { icon: '💱', label: 'Local currency', value: `${d.country_currency_symbol} ${d.country_currency_code}` },
  (d) => d.language && { icon: '🗣️', label: 'Primary language', value: d.language },
  (d) => d.mobile_calling_code && { icon: '📱', label: 'Dialing code', value: d.mobile_calling_code },
  (d) => d.population && d.country_name && { icon: '👥', label: `${d.country_name} population`, value: Number(d.population).toLocaleString() },
  (d) => d.continent_name && { icon: '🗺️', label: 'Continent', value: d.continent_name },
  (d) => d.network_type && { icon: '📶', label: 'Connection type', value: d.network_type },
  (d) => d.asn && { icon: '🔢', label: 'Network ASN', value: d.asn },
  (d) => d.tld && { icon: '🔗', label: 'Country domain', value: d.tld },
  (d) => d.fifa && { icon: '⚽', label: 'FIFA code', value: d.fifa },
  (d) => d.hostname && { icon: '🏷️', label: 'Resolved hostname', value: d.hostname },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function useIpFacts() {
  const [facts, setFacts] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(IP_ORACLE_URL, { headers: { accept: 'application/json' } });
        if (!res.ok) throw new Error('bad status');
        const json = await res.json();
        const data = json?.data;
        if (!data || cancelled) return;

        const built = FACT_BUILDERS
          .map((fn) => {
            try { return fn(data); } catch { return null; }
          })
          .filter(Boolean);

        setFacts(shuffle(built).slice(0, 3));
      } catch {
        if (!cancelled) setFacts(null);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { facts };
}
