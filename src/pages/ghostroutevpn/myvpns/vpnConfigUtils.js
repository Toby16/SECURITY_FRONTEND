// src/pages/ghostroutevpn/myvpns/vpnConfigUtils.js

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
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${configData.client_id}${configData.file_extension}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
