import { Outlet } from "react-router-dom";
import GhostrouteVpnNav from "./GhostrouteVpnNav.jsx";
import styles from "./GhostrouteVpn.module.css";

export default function GhostrouteVpn() {
  return (
    <div className={styles.page}>
      <div className={styles.mist} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />

      <GhostrouteVpnNav />

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}

