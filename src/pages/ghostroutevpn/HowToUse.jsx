// src/pages/ghostroutevpn/HowToUse.jsx
import { useState } from "react";
import { BoltIcon, ShieldIcon } from "./protocols/icons.jsx";
import {
  AndroidIcon,
  AppleIcon,
  WindowsIcon,
  LinuxIcon,
  ExternalLinkIcon,
  DownloadIcon,
} from "./howToUseIcons.jsx";
import { HOW_TO_USE_CONTENT } from "./howToUseContent.js";
import styles from "./HowToUse.module.css";

const PROTOCOLS = [
  { key: "wireguard", label: "wireguard", Icon: BoltIcon },
  { key: "openvpn", label: "openvpn", Icon: ShieldIcon },
];

const DEVICES = [
  { key: "android", label: "android", Icon: AndroidIcon },
  { key: "ios", label: "ios", Icon: AppleIcon },
  { key: "windows", label: "windows", Icon: WindowsIcon },
  { key: "macos", label: "macOS", Icon: AppleIcon },
  { key: "linux", label: "linux & others", Icon: LinuxIcon },
];

// Lets a link like /ghostroute-vpn?...&protocol=openvpn (or wherever this page
// lives) open straight onto the matching tab — used by the "how to use
// wireguard/openvpn" link inside VpnDetailModal, so the tab always matches
// the protocol of the VPN the person was just looking at.
function getInitialProtocol() {
  if (typeof window === "undefined") return "wireguard";
  const params = new URLSearchParams(window.location.search);
  return params.get("protocol") === "openvpn" ? "openvpn" : "wireguard";
}

function RedirectPanel({ ProtocolIcon, guide }) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <ProtocolIcon className={styles.panelIcon} />
        <div>
          <h2 className={styles.panelTitle}>{guide.title}</h2>
          <p className={styles.panelSubtitle}>{guide.subtitle}</p>
        </div>
      </div>
      <a className={styles.redirectLink} href={guide.href} target="_blank" rel="noopener noreferrer">
        <ExternalLinkIcon className={styles.redirectLinkIcon} />
        {guide.linkLabel}
      </a>
    </div>
  );
}

function GuidePanel({ ProtocolIcon, guide }) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <ProtocolIcon className={styles.panelIcon} />
        <div>
          <h2 className={styles.panelTitle}>{guide.title}</h2>
          <p className={styles.panelSubtitle}>{guide.subtitle}</p>
        </div>
      </div>

      {guide.prerequisites && (
        <div className={styles.prereq}>
          <span className={styles.sectionLabel}>before you start</span>
          <ul className={styles.prereqList}>
            {guide.prerequisites.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {guide.links && (
        <div className={styles.linkRow}>
          {guide.links.map((link) => (
            <a key={link.href} className={styles.linkChip} href={link.href} target="_blank" rel="noopener noreferrer">
              {link.icon === "download" ? (
                <DownloadIcon className={styles.linkChipIcon} />
              ) : (
                <ExternalLinkIcon className={styles.linkChipIcon} />
              )}
              {link.label}
            </a>
          ))}
        </div>
      )}

      <div className={styles.stepsHead}>
        <span className={styles.sectionLabel}>{guide.stepsLabel}</span>
      </div>

      <ol className={styles.steps}>
        {guide.steps.map((step, i) => (
          <li key={step.title} className={styles.step}>
            <div className={styles.stepMarker}>
              <span className={styles.stepNode}>{i + 1}</span>
              {i < guide.steps.length - 1 && <span className={styles.stepLine} />}
            </div>
            <div className={styles.stepBody}>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepText}>{step.text}</p>
            </div>
          </li>
        ))}
      </ol>

      {guide.note && <p className={styles.note}>{guide.note}</p>}
    </div>
  );
}

export default function HowToUse() {
  const [protocol, setProtocol] = useState(getInitialProtocol);
  const [device, setDevice] = useState("android");

  const activeProtocol = PROTOCOLS.find((p) => p.key === protocol);
  const activeDevice = DEVICES.find((d) => d.key === device);
  const guide = HOW_TO_USE_CONTENT[protocol]?.[device] ?? null;

  return (
    <section>
      <div className={styles.head}>
        <h1 className={styles.title}>How to use</h1>
        <p className={styles.subtitle}>
          Pick your protocol and device — we'll walk you from install to connected.
        </p>
      </div>

      <div className={styles.protocolTabs} role="tablist" aria-label="Protocol">
        {PROTOCOLS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={protocol === key}
            className={protocol === key ? styles.protocolTabActive : styles.protocolTab}
            onClick={() => setProtocol(key)}
          >
            <Icon className={styles.protocolTabIcon} />
            {label}
          </button>
        ))}
      </div>

      <div className={styles.deviceRail} role="tablist" aria-label="Device">
        {DEVICES.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={device === key}
            className={device === key ? styles.deviceTabActive : styles.deviceTab}
            onClick={() => setDevice(key)}
          >
            <Icon className={styles.deviceTabIcon} />
            {label}
          </button>
        ))}
      </div>

      {!guide && (
        <div className={styles.empty}>
          Guide for {activeProtocol.label} on {activeDevice.label} is on the way.
        </div>
      )}

      {guide && guide.redirect && <RedirectPanel ProtocolIcon={activeProtocol.Icon} guide={guide} />}

      {guide && !guide.redirect && <GuidePanel ProtocolIcon={activeProtocol.Icon} guide={guide} />}
    </section>
  );
}
