// src/pages/ghostroutevpn/myvpns/vpnConfigUtils.js
import QRCode from "qrcode";

export function formatWireguardConfig(configuration) {
  const { Interface = {}, Peer = {} } = configuration ?? {};
  return [
    "[Interface]",
    `PrivateKey = ${Interface.PrivateKey ?? ""}`,
    `Address = ${Interface.Address ?? ""}`,
    `DNS = ${Interface.DNS ?? ""}`,
    "",
    "[Peer]",
    `PublicKey = ${Peer.PublicKey ?? ""}`,
    `PresharedKey = ${Peer.PresharedKey ?? ""}`,
    `Endpoint = ${Peer.Endpoint ?? ""}`,
    `AllowedIPs = ${Peer.AllowedIPs ?? ""}`,
  ].join("\n");
}

// Both protocols end up as plain text for display, regardless of source shape —
// wireguard's is an object we format ourselves, openvpn's is already a string.
export function getConfigDisplayText(configData) {
  if (!configData) return "";
  return configData.vpn_type === "wireguard"
    ? formatWireguardConfig(configData.configuration)
    : configData.configuration;
}

export function downloadVpnConfig(configData) {
  if (!configData) return;
  const text = getConfigDisplayText(configData);
  const blob = new Blob([text], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${configData.client_id}${configData.file_extension}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Renders the config text as a scannable QR code (data URL) so a phone's
// WireGuard/OpenVPN app can import the tunnel directly by scanning, without
// needing the downloaded file at all. These configs are small enough to fit
// comfortably within a QR code's capacity even at a low error-correction
// level, so we don't need to pin a version — the library picks one.
export async function generateConfigQrDataUrl(configData) {
  const text = getConfigDisplayText(configData);
  if (!text) return null;
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: "L",
    margin: 1,
    width: 320,
    color: {
      dark: "#0a0a0b",
      light: "#e9eaed",
    },
  });
}

export function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

export function howToUsePath(vpnType) {
  return `/ghostroutevpn/how-to-use?protocol=${vpnType}`;
}
