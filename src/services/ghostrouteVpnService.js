// src/services/ghostrouteVpnService.js
import { getToken, isTokenExpiredError, signalTokenExpired } from "./authService.js";

const SERVERS_ENDPOINT = "https://secure.ghostroute.icu/api/v1.0/vpn/list/servers";
const PAYMENTS_ENDPOINT = "https://secure.ghostroute.icu/api/v1.0/vpn/list/payment";
const PAYMENT_DETAIL_ENDPOINT = "https://secure.ghostroute.icu/api/v1.0/vpn/get/payment/";
const CONFIG_ENDPOINT = "https://secure.ghostroute.icu/api/v1.0/vpn/get/config/";
const DATA_TRANSFER_ENDPOINT = "https://secure.ghostroute.icu/api/v1.0/vpn/get/config/data_transfer/";
const PEER_COUNT_ENDPOINT = "https://secure.ghostroute.icu/api/v1.0/vpn/count/server/peers/";
const INITIALIZE_PAYMENT_ENDPOINT = "https://secure.ghostroute.icu/api/v1.0/vpn/initialize/payment/";
const VERIFY_PAYMENT_ENDPOINT = "https://secure.ghostroute.icu/api/v1.0/vpn/verify/payment/";

export const MAX_VPNS_PER_USER = 10;
export const NGN_PER_USD = 1200;

// Temporary: the servers-list response doesn't expose a usable ip_address
// per protocol yet, so we default to the one live server for both
// protocols. Swap this out once that endpoint returns real per-server IPs.
const DEFAULT_VPN_SERVER_IP = "46.202.195.35";

// amount is always the USD figure — naira is derived from it (amount * NGN_PER_USD)
// at render time, so there's one source of truth per price instead of two
// hand-typed strings that can drift apart.
const PROTOCOL_META = {
  wireguard: {
    key: "wireguard",
    name: "wireguard",
    tag: "Fast VPN",
    cardPrice: { amount: 0.4, unit: "/day" },
    pricing: [{ amount: 0.4, unit: "/day", value: "0.4-day" }],
  },
  openvpn: {
    key: "openvpn",
    name: "openvpn",
    tag: "Quiet VPN",
    cardPrice: { amount: 3, unit: "/week" },
    pricing: [
      { amount: 2.5, unit: "/5days", value: "2.5-5day" },
      { amount: 3, unit: "/7days", value: "3-7day" },
      { amount: 5, unit: "/10days", value: "5-10day" },
    ],
  },
};

// Package options for openvpn — mirrors PROTOCOL_META.openvpn.pricing but
// keyed by days_for, since that's what the initialize endpoint expects.
export const OPENVPN_PACKAGES = [
  { daysFor: 5, dollar: 2.5 },
  { daysFor: 7, dollar: 3 },
  { daysFor: 10, dollar: 5 },
];

export const WIREGUARD_MIN_DAYS = 1;
export const WIREGUARD_MAX_DAYS = 10;
export const WIREGUARD_DOLLAR_PER_DAY = 0.4;

const PREVIEW_COUNT = {
  wireguard: 6,
  openvpn: 6,
};

function extractFeatures(protocolBlock) {
  if (!protocolBlock?.item_object) return [];
  const firstServer = Object.values(protocolBlock.item_object)[0];
  return firstServer?.features ?? [];
}

// Same assumption as the balance keys in VpnProtocols.jsx — this is a
// best-effort guess at the shape of the servers-list payload. The peer-count
// endpoint needs a concrete ip_address per protocol, so we try a couple of
// likely shapes: an ip_address (or server_ip) property on the first server
// entry, and — since some APIs key item_object BY the ip address itself —
// fall back to that entry's key. Confirm against the real network response
// and simplify this once the actual shape is known.
function extractIpAddress(protocolBlock) {
  if (!protocolBlock?.item_object) return null;
  const entries = Object.entries(protocolBlock.item_object);
  if (entries.length === 0) return null;

  const [firstKey, firstServer] = entries[0];
  return firstServer?.ip_address ?? firstServer?.server_ip ?? firstKey ?? null;
}

function buildRequestError(response, json) {
  const message =
    (typeof json?.detail === "string" ? json.detail : json?.detail?.message) ||
    json?.message ||
    `Request failed (${response.status})`;
  const err = new Error(message);
  err.code = json?.detail?.error ?? json?.code;

  if (isTokenExpiredError(err) || response.status === 401 || response.status === 403) {
    signalTokenExpired();
    err.code = "UNAUTHENTICATED";
  }
  return err;
}

function requireToken() {
  const token = getToken();
  if (!token) {
    const err = new Error("Not authenticated");
    err.code = "UNAUTHENTICATED";
    throw err;
  }
  return token;
}

async function authedGet(url) {
  const token = requireToken();
  const response = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json", Authorization: `Bearer ${token}` },
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) throw buildRequestError(response, json);
  return json;
}

export async function fetchVpnProtocols() {
  const json = await authedGet(SERVERS_ENDPOINT);
  const data = json?.data ?? {};

  return Object.keys(PROTOCOL_META).map((key) => {
    const meta = PROTOCOL_META[key];
    const block = data[key];
    const features = extractFeatures(block);
    const ipAddress = extractIpAddress(block) ?? DEFAULT_VPN_SERVER_IP;

    return {
      ...meta,
      ipAddress,
      features,
      previewFeatures: features.slice(0, PREVIEW_COUNT[key] ?? 4),
      hasMore: features.length > (PREVIEW_COUNT[key] ?? 4),
    };
  });
}

export async function fetchMyVpns() {
  const json = await authedGet(PAYMENTS_ENDPOINT);
  return json?.data ?? [];
}

export async function fetchVpnPaymentDetail(paymentId) {
  const token = requireToken();

  const response = await fetch(PAYMENT_DETAIL_ENDPOINT, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ input_id: paymentId }),
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    if (json?.detail?.error === "payment-id not found!") {
      const err = new Error(json.detail.message || "No payment detail available.");
      err.code = "NOT_FOUND";
      throw err;
    }
    throw buildRequestError(response, json);
  }

  return json?.data ?? null;
}

export async function fetchVpnConfig(paymentId) {
  const token = requireToken();

  const response = await fetch(CONFIG_ENDPOINT, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ input_id: paymentId }),
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    if (json?.detail?.error === "payment-id not found!") {
      const err = new Error(json.detail.message || "No configuration available.");
      err.code = "NOT_FOUND";
      throw err;
    }
    throw buildRequestError(response, json);
  }

  return json?.data ?? null;
}

export async function fetchVpnDataTransfer(clientId) {
  const token = requireToken();

  const response = await fetch(DATA_TRANSFER_ENDPOINT, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ input_id: clientId }),
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    if (json?.detail?.error === "payment-id not found!") {
      const err = new Error(json.detail.message || "No data usage available.");
      err.code = "NOT_FOUND";
      throw err;
    }
    throw buildRequestError(response, json);
  }

  return json?.data ?? null;
}

/**
 * Live count of how many configs a given protocol's server is currently
 * holding vs. how many it can hold in total. Used to show users slot
 * availability before they pay, since slots are first-come-first-served.
 */
export async function fetchVpnPeerCount({ vpnType, ipAddress }) {
  const token = requireToken();

  const response = await fetch(PEER_COUNT_ENDPOINT, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ vpn_type: vpnType, ip_address: ipAddress }),
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    throw buildRequestError(response, json);
  }

  return json?.data ?? null;
}

/** Formats a { amount, unit } price entry for the given currency. */
export function formatProtocolPrice({ amount, unit }, currency) {
  if (currency === "ngn") {
    return `₦${Math.round(amount * NGN_PER_USD).toLocaleString()}${unit}`;
  }
  return `$${amount}${unit}`;
}

/** Plain dollar -> currency-formatted string, for the purchase modal totals. */
export function formatDollarAmount(amount, currency) {
  if (currency === "ngn") {
    return `₦${Math.round(amount * NGN_PER_USD).toLocaleString()}`;
  }
  return `$${amount.toFixed(2)}`;
}

export async function deleteVpnPayment(paymentId) {
  const token = getToken();
  const res = await fetch("https://secure.ghostroute.icu/api/v1.0/vpn/delete/payment/", {
    method: "DELETE",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input_id: paymentId }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.detail?.message || "Failed to delete payment");
    err.code = data?.detail?.error;
    throw err;
  }
  return data;
}

/**
 * Step 1 of the purchase flow: creates a payment record and (if this is the
 * "verify" path) reserves the slot. Does NOT deduct balance or hand out a
 * client_id by itself — that only happens once verifyVpnPayment succeeds.
 *
 * Throws an Error with:
 *  - err.message: human-readable text (e.g. "invalid days selected!" or
 *    "balance not sufficient for this transaction!")
 *  - err.code: the machine-readable detail.error when the API sends the
 *    { error, message } object form (e.g. "balance not sufficient for this transaction!")
 */
export async function initializeVpnPayment({ vpnType, ipAddress, daysFor, autoRenew }) {
  const token = getToken();
  const res = await fetch(INITIALIZE_PAYMENT_ENDPOINT, {
    method: "POST",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      vpn_type: vpnType,
      ip_address: ipAddress,
      days_for: daysFor,
      auto_renew: autoRenew,
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = data?.detail;
    const message =
      typeof detail === "string" ? detail : detail?.message || "Failed to initialize payment";
    const err = new Error(message);
    err.code = typeof detail === "string" ? detail : detail?.error;
    throw err;
  }
  return data;
}

/**
 * Step 2 ("verify" path only): confirms the payment, deducts balance, and
 * returns the client_id. Calling it twice on an already-paid payment_id is
 * safe — the API returns status_code 200 with the same client_id and a
 * "already been paid for successfully!" message.
 */
export async function verifyVpnPayment(paymentId) {
  const token = getToken();
  const res = await fetch(VERIFY_PAYMENT_ENDPOINT, {
    method: "POST",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input_id: paymentId }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = data?.detail;
    const message =
      typeof detail === "string" ? detail : detail?.message || "Failed to verify payment";
    const err = new Error(message);
    err.code = typeof detail === "string" ? detail : detail?.error;
    throw err;
  }
  return data;
}
