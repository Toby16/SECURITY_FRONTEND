// src/pages/ghostroutevpn/GhostrouteVpnNav.jsx
import { NavLink } from "react-router-dom";
import styles from "./GhostrouteVpnNav.module.css";

const LINKS = [
  { to: "/ghostroutevpn/protocols", label: "vpn protocols" },
  { to: "/ghostroutevpn/my-vpns", label: "my vpns" },
  { to: "/ghostroutevpn/how-to-use", label: "how to use" },
  { to: "/ghostroutevpn/about-us", label: "about us" },
];

export default function GhostrouteVpnNav() {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.brandMark} aria-hidden="true" />
        Ghostroute VPN
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
