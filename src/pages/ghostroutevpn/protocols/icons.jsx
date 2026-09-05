// src/pages/ghostroutevpn/protocols/icons.jsx
//
// Small, single-stroke line icons in the spirit of Uber's flat pictograms —
// low path count, currentColor, no fills that need heavy detail. Each
// feature string from the API is mapped to the closest icon by keyword.

const base = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const BoltIcon = (p) => (
  <svg {...base} {...p}><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" /></svg>
);

export const ShieldIcon = (p) => (
  <svg {...base} {...p}><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3Z" /></svg>
);

export const EyeOffIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M3 3l18 18" />
    <path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c5 0 9 3.5 10 7-.4 1.2-1 2.3-1.9 3.3M6.2 6.6C4.3 8 2.9 9.8 2 12c1 3.5 5 7 10 7 1.4 0 2.7-.3 3.9-.7" />
    <path d="M9.5 10a3 3 0 0 0 4.2 4.2" />
  </svg>
);

export const GamepadIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="2" y="8" width="20" height="9" rx="4" />
    <path d="M7 11v3M5.5 12.5h3M15.5 12h.01M18 10.5h.01" />
  </svg>
);

export const BatteryIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="2" y="8" width="17" height="8" rx="2" />
    <path d="M21 11v2" />
    <path d="M6 10.5v3" />
  </svg>
);

export const TvIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <path d="M9 21h6M12 18v3" />
  </svg>
);

export const BlockIcon = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M6 6l12 12" /></svg>
);

export const TagIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3h6a2 2 0 0 1 2 2v6l-9 9-8-8 9-9Z" />
    <circle cx="15.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const DevicesIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="2" y="4" width="14" height="10" rx="1.5" />
    <rect x="17" y="9" width="5" height="9" rx="1" />
    <path d="M6 18h6" />
  </svg>
);

export const GlobeIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.6 4 5.7 4 9s-1.5 6.4-4 9c-2.5-2.6-4-5.7-4-9s1.5-6.4 4-9Z" />
  </svg>
);

export const GhostIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M6 20V11a6 6 0 0 1 12 0v9l-2.5-2-2 2-2-2-2 2-2.5-2Z" />
    <path d="M9.5 11h.01M14.5 11h.01" />
  </svg>
);

export const BriefcaseIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="2.5" y="7" width="19" height="12" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M2.5 12h19" />
  </svg>
);

export const NetworkIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="6" cy="6" r="2.3" /><circle cx="18" cy="6" r="2.3" /><circle cx="12" cy="18" r="2.3" />
    <path d="M8 7.3 10.5 16M16 7.3 13.5 16M8.3 6h7.4" />
  </svg>
);

export const SparkIcon = (p) => (
  <svg {...base} {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M17.5 6 15 8.5M6 18l2.5-2.5M17.5 18 15 15.5" /></svg>
);

const RULES = [
  { icon: BoltIcon, test: /fast|speed|latency|performance|lightweight/i },
  { icon: GamepadIcon, test: /gaming/i },
  { icon: TvIcon, test: /stream/i },
  { icon: EyeOffIcon, test: /privacy|private|anonymity/i },
  { icon: GhostIcon, test: /stealth|obfustic|censorship/i },
  { icon: ShieldIcon, test: /security|firewall|protection|stable/i },
  { icon: BatteryIcon, test: /battery/i },
  { icon: NetworkIcon, test: /ipv4|ipv6|tcp\/udp|advanced/i },
  { icon: BlockIcon, test: /ad blocking|anti-phishing/i },
  { icon: TagIcon, test: /cost effective/i },
  { icon: DevicesIcon, test: /device/i },
  { icon: GlobeIcon, test: /dns/i },
  { icon: BriefcaseIcon, test: /business|enterprise/i },
];

export function iconForFeature(feature) {
  const match = RULES.find((r) => r.test.test(feature));
  return match ? match.icon : SparkIcon;
}
