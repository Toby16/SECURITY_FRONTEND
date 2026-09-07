// src/pages/ghostroutevpn/GhostrouteVpnNav.jsx
import { NavLink } from "react-router-dom";
import GhostRouteMark from "../../components/GhostRouteMark.jsx";
import styles from "./GhostrouteVpnNav.module.css";

const LINKS = [
  { to: "/ghostroutevpn/protocols", label: "vpn protocols" },
  { to: "/ghostroutevpn/my-vpns", label: "my vpns" },
  { to: "/ghostroutevpn/how-to-use", label: "how to use" },
  { to: "/ghostroutevpn/about-us", label: "about us" },
];

function ArrowLeftIcon(props) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </svg>
  );
}

export default function GhostrouteVpnNav() {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {/* Always present, always the same spot, regardless of which
            ghostroutevpn page is active — the one constant way back to the
            dashboard of mini apps. */}
        <NavLink
          to="/"
          className={styles.backLink}
          title="Back to dashboard"
          aria-label="Back to dashboard"
        >
          <ArrowLeftIcon className={styles.backIcon} />
          <span>dashboard</span>
        </NavLink>

        <div className={styles.brand}>
          <GhostRouteMark size={22} className={styles.brandMark} />
          Ghostroute VPN
        </div>
      </div>

      <nav className={styles.nav} aria-label="Ghostroute VPN">
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              isActive ? `${styles.link} ${styles.linkActive}` : styles.link
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
