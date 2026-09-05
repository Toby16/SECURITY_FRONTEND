// src/services/ghostrouteVpnService.js
//
// Talks to the Ghostroute VPN servers endpoint and shapes the response into
// what the "vpn protocols" page needs. Pricing isn't part of the API payload
// (the endpoint only describes servers/features), so it's defined here
// alongside the protocol copy — this is the one place to change it later.
import { getToken, isTokenExpiredError, signalTokenExpired } from "./authService.js";

const SERVERS_ENDPOINT = "https://secure.ghostroute.icu/api/v1.0/vpn/list/servers";

const PROTOCOL_META = {
  wireguard: {
    key: "wireguard",
    name: "wireguard",
    tag: "fast vpn",
    cardPrice: "$0.3/day",
    pricing: [{ label: "$0.3/day", value: "0.3-day" }],
  },
  openvpn: {
    key: "openvpn",
    name: "openvpn",
    tag: "quiet vpn",
    cardPrice: "$3/week",
    pricing: [
      { label: "$2.5/5days", value: "2.5-5day" },
      { label: "$3/7days", value: "3-7day" },
      { label: "$5/10days", value: "5-10day" },
    ],
  },
};

// Card view only needs a short teaser; the modal shows everything.
const PREVIEW_COUNT = {
  wireguard: 6,
  openvpn: 6,
};

/**
 * Pulls the shared feature list out of a protocol's item_object, ignoring
 * the IP address itself (it's only ever used as a lookup key here).
 */
function extractFeatures(protocolBlock) {
  if (!protocolBlock?.item_object) return [];
  const firstServer = Object.values(protocolBlock.item_object)[0];
  return firstServer?.features ?? [];
}

export async function fetchVpnProtocols() {
  const token = getToken();

  // No token at all — same "please sign in" state as an expired one, but no
  // point firing a network request (and no point signaling expiry for a
  // session that was never there in the first place).
  if (!token) {
    const err = new Error("Not authenticated");
    err.code = "UNAUTHENTICATED";
    throw err;
  }

  const response = await fetch(SERVERS_ENDPOINT, {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (typeof json?.detail === "string" ? json.detail : json?.detail?.message) ||
      json?.message ||
      `Failed to load VPN protocols (${response.status})`;
    const err = new Error(message);

    // Same expiry detection + cleanup the rest of the app uses (clears the
    // stored token and fires "ghostroute:token-expired" so the existing
    // auth guard redirects to /auth) rather than handling it locally here.
    if (isTokenExpiredError(err) || response.status === 401 || response.status === 403) {
      signalTokenExpired();
      err.code = "UNAUTHENTICATED";
    } else {
      err.code = "REQUEST_FAILED";
    }
    throw err;
  }

  const data = json?.data ?? {};

  return Object.keys(PROTOCOL_META).map((key) => {
    const meta = PROTOCOL_META[key];
    const features = extractFeatures(data[key]);
    return {
      ...meta,
      features,
      previewFeatures: features.slice(0, PREVIEW_COUNT[key] ?? 4),
      hasMore: features.length > (PREVIEW_COUNT[key] ?? 4),
    };
  });
}
