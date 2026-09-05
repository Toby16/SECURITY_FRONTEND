// src/pages/ghostroutevpn/myvpns/VpnDetailModal.jsx
import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchVpnPaymentDetail,
  fetchVpnConfig,
  fetchVpnDataTransfer,
} from "../../../services/ghostrouteVpnService.js";
import {
  getConfigDisplayText,
  downloadVpnConfig,
  formatBytes,
  howToUsePath,
} from "./vpnConfigUtils.js";
import styles from "./VpnDetailModal.module.css";

const POLL_INTERVAL_MS = 10000;
const SCROLLBAR_FADE_MS = 900;

export default function VpnDetailModal({ paymentId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState(null);

  const [config, setConfig] = useState(null);
  const [configError, setConfigError] = useState(null);

  const [metrics, setMetrics] = useState(null);
  const [metricsError, setMetricsError] = useState(null);

  // payment / vpn detail
  useEffect(() => {
    let cancelled = false;
    fetchVpnPaymentDetail(paymentId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (!cancelled) setDetailError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  // config, once we know the payment/vpn is real
  useEffect(() => {
    if (!detail) return;
    let cancelled = false;
    fetchVpnConfig(paymentId)
      .then((data) => {
        if (!cancelled) setConfig(data);
      })
      .catch((err) => {
        if (!cancelled) setConfigError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [detail, paymentId]);

  // data metrics — only runs while this modal is mounted, keyed on client_id.
  // Unmounting (closing the modal) clears the interval, which is what stops
  // monitoring for this particular client.
  useEffect(() => {
    const clientId = detail?.client_id;
    if (!clientId) return;

    let cancelled = false;

    function poll() {
      fetchVpnDataTransfer(clientId)
        .then((data) => {
          if (!cancelled) {
            setMetrics(data);
            setMetricsError(null);
          }
        })
        .catch((err) => {
          if (!cancelled) setMetricsError(err);
        });
    }

    poll(); // fetch immediately when the card is opened
    const intervalId = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [detail?.client_id]);

  // esc to close
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleOverlayClose() {
    onClose();
  }

  // Scroll-activated scrollbar: adds an "isScrolling" class while the element
  // is actively being scrolled, then removes it a short moment after
  // scrolling stops. The scrollbar itself is styled transparent by default in
  // the CSS module and only painted while this class is present, so it fades
  // in on scroll and fades back out instead of sitting on screen permanently.
  const fadeTimeouts = useRef({});
  const handleScrollFade = useCallback((e) => {
    const el = e.currentTarget;
    const key = el.dataset.scrollKey || (el.dataset.scrollKey = Math.random().toString(36));

    el.classList.add(styles.isScrolling);
    clearTimeout(fadeTimeouts.current[key]);
    fadeTimeouts.current[key] = setTimeout(() => {
      el.classList.remove(styles.isScrolling);
    }, SCROLLBAR_FADE_MS);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(fadeTimeouts.current).forEach(clearTimeout);
    };
  }, []);

  return (
    <div className={styles.overlay} onMouseDown={handleOverlayClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="VPN detail"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M5 5l14 14M19 5 5 19" />
          </svg>
        </button>

        {!detail && !detailError && <div className={styles.state}>Loading VPN detail…</div>}

        {detailError && (
          <div className={styles.state}>
            {detailError.code === "NOT_FOUND"
              ? "This VPN no longer exists."
              : "Couldn't load this VPN. Try again shortly."}
          </div>
        )}

        {detail && (
          <div className={styles.scrollArea} onScroll={handleScrollFade}>
            <div className={styles.head}>
              <span className={styles.name}>{detail.vpn_type}</span>
              <span className={styles.active}>active</span>
            </div>

            <dl className={styles.rows}>
              <div className={styles.row}>
                <dt>Client ID</dt>
                <dd className={styles.mono}>{detail.client_id}</dd>
              </div>
              <div className={styles.row}>
                <dt>Days remaining</dt>
                <dd>{detail.days_left} / {detail.days_for} days</dd>
              </div>
              <div className={styles.row}>
                <dt>Total paid</dt>
                <dd>${detail.dollar_total_price} · ₦{detail.naira_total_price.toLocaleString()}</dd>
              </div>
              <div className={styles.row}>
                <dt>Server IP</dt>
                <dd className={styles.mono}>{detail.ip_address}</dd>
              </div>
              <div className={styles.row}>
                <dt>Auto-renew</dt>
                <dd>{detail.auto_renew ? "On" : "Off"}</dd>
              </div>
            </dl>

            <div className={styles.sectionLabel}>Data usage</div>
            <div className={styles.metrics}>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>Uploaded</span>
                <span className={styles.metricValue}>
                  {metrics ? formatBytes(metrics.upload_bytes) : "—"}
                </span>
              </div>
              <div className={styles.metricBox}>
                <span className={styles.metricLabel}>Downloaded</span>
                <span className={styles.metricValue}>
                  {metrics ? formatBytes(metrics.download_bytes) : "—"}
                </span>
              </div>
            </div>
            {metricsError && (
              <p className={styles.metricsNote}>Couldn't refresh data usage — retrying…</p>
            )}

            <div className={styles.sectionLabel}>Configuration</div>
            {!config && !configError && (
              <div className={styles.configState}>Loading configuration…</div>
            )}
            {configError && (
              <div className={styles.configState}>Couldn't load the configuration file.</div>
            )}
            {config && (
              <pre className={styles.configBlock} onScroll={handleScrollFade}>
                {getConfigDisplayText(config)}
              </pre>
            )}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.download}
                onClick={() => config && downloadVpnConfig(config)}
                disabled={!config}
              >
                download configuration file
              </button>

              <a
                className={styles.howTo}
                href={howToUsePath(detail.vpn_type)}
                target="_blank"
                rel="noopener noreferrer"
              >
                how to use {detail.vpn_type}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
