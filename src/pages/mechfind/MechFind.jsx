import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken, getUserProfile } from '../../services/authService.js'
import { useAuthGuard } from '../../hooks/useAuthGuard.js'
import { useTokenRefresh } from '../../hooks/useTokenRefresh.js'
import { initializeMechanicSearch, startMechanicSearch } from '../../services/mechfindService.js'
import { getPreciseLocation } from './useGeolocation.js'
import GhostLogo from '../../components/GhostLogo.jsx'
import styles from './MechFind.module.css'

function usePageTitle(t) {
  useEffect(() => { document.title = t }, [t])
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function todayHoursLine(hours) {
  if (!Array.isArray(hours) || !hours.length) return null
  const today = DAY_NAMES[new Date().getDay()]
  const line = hours.find(h => h.startsWith(today))
  return line ? line.replace(`${today}: `, '') : null
}

function formatPhone(m) {
  return m.international_phone_number || m.national_phone_number || null
}

function formattedAddress(m) {
  return m.long_formatted_address || m.short_formatted_address
}

const fmt = (n, cur) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(n ?? 0)

// ── Vehicle icon — used for the MechFind hero mark ──────────────────────────
function CarIcon({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 11 6.2 7.3A2 2 0 0 1 8.1 6h7.8a2 2 0 0 1 1.9 1.3L19 11" />
      <path d="M3.5 11h17A1.5 1.5 0 0 1 22 12.5V16a1 1 0 0 1-1 1h-1" />
      <path d="M3.5 11A1.5 1.5 0 0 0 2 12.5V16a1 1 0 0 0 1 1h1" />
      <path d="M4.5 17h11" />
      <circle cx="7.5" cy="17" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="17" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

// ── Status overlay shown while location → initialize → start are in flight ──
const STATUS_COPY = {
  locating: 'Getting your precise location…',
  initializing: 'Setting up your search…',
  searching: 'Finding nearby mechanics…',
}

function SearchOverlay({ phase }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.radarWrap}>
        <div className={styles.radarRing} />
        <div className={styles.radarRing} style={{ animationDelay: '0.6s' }} />
        <div className={styles.radarRing} style={{ animationDelay: '1.2s' }} />
        <div className={styles.radarCore}>
          <div className={styles.radarSweep} />
        </div>
      </div>
      <p className={styles.overlayStatus}>{STATUS_COPY[phase] || 'Working on it…'}</p>
      <p className={styles.overlayHint}>This only takes a moment.</p>
    </div>
  )
}

// ── Location-readiness notice — always shown first, before anything else ───
function LocationNoticeModal({ onAcknowledge, balance, balanceLoading }) {
  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
      <div className={styles.modalCard}>
        <div className={styles.modalIcon}>📡</div>
        <h2 className={styles.modalTitle}>Before you search</h2>
        <p className={styles.modalBody}>
          MechFind depends on accurate device location to find mechanics near you. Please confirm
          that location (GPS) services are switched on and permitted for this browser before
          continuing. If location services are disabled or restricted on your device, we have no
          way to determine your position on our end, and a search cannot be completed until this
          is enabled.
        </p>

        <div className={styles.balanceRow}>
          <div className={styles.balanceItem}>
            <span className={styles.balanceLabel}>NGN Balance</span>
            <span className={styles.balanceValue}>
              {balanceLoading ? '—' : fmt(balance?.naira_balance, 'NGN')}
            </span>
          </div>
          <div className={styles.balanceSep} />
          <div className={styles.balanceItem}>
            <span className={styles.balanceLabel}>USD Balance</span>
            <span className={styles.balanceValueUsd}>
              {balanceLoading ? '—' : fmt(balance?.dollar_balance, 'USD')}
            </span>
          </div>
        </div>

        <div className={styles.modalActions}>
          <button className={styles.primaryBtn} onClick={onAcknowledge}>Got it, continue</button>
        </div>
      </div>
    </div>
  )
}

// ── Consent modal: location + price, shown before every fresh search ──
function ConsentModal({ onConfirm, onCancel }) {
  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
      <div className={styles.modalCard}>
        <div className={styles.modalIcon}>📍</div>
        <h2 className={styles.modalTitle}>Find mechanics near you</h2>
        <p className={styles.modalBody}>
          MechFind uses your precise location to match you with the closest, most reliable
          mechanics and auto repair shops. Your device will ask you to allow location access.
        </p>
        <div className={styles.priceRow}>
          <span className={styles.priceTag}>$0.2 <span className={styles.priceTagAlt}>· ₦240</span></span>
          <span className={styles.priceLabel}>per search</span>
        </div>
        <p className={styles.modalFinePrint}>
          Results stay free to browse until you leave this page. Coming back later starts a new search.
        </p>
        <div className={styles.modalActions}>
          <button className={styles.primaryBtn} onClick={onConfirm}>
            Allow location &amp; search
          </button>
          <button className={styles.ghostBtn} onClick={onCancel}>Not now</button>
        </div>
      </div>
    </div>
  )
}

// ── Error modal ──
function ErrorModal({ message, onRetry, onClose }) {
  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
      <div className={styles.modalCard}>
        <div className={`${styles.modalIcon} ${styles.modalIconError}`}>✕</div>
        <h2 className={styles.modalTitle}>Search couldn&rsquo;t be completed</h2>
        <p className={styles.modalBody}>{message}</p>
        <div className={styles.modalActions}>
          <button className={styles.primaryBtn} onClick={onRetry}>Try again</button>
          <button className={styles.ghostBtn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Compact list item — just enough to scan and decide ──
function MechanicListItem({ m, onView }) {
  const phone = formatPhone(m)

  return (
    <div className={styles.resultCard}>
      <div className={styles.resultTop}>
        <div className={styles.resultTitleBlock}>
          <p className={styles.resultName}>{m.display_name}</p>
          <div className={styles.resultTags}>
            <span className={styles.typeTag}>{m.label || m.primary_type_name}</span>
            {m.badge_approved && <span className={styles.verifiedTag}>✓ Verified</span>}
          </div>
        </div>
        <div className={styles.resultDistance}>
          <span className={styles.distanceVal}>{m.distance_km}</span>
          <span className={styles.distanceUnit}>km</span>
        </div>
      </div>

      <p className={styles.resultAddress}>{formattedAddress(m)}</p>

      <div className={styles.resultMetaRow}>
        {m.rating != null ? (
          <span className={styles.ratingPill}>★ {m.rating}</span>
        ) : (
          <span className={styles.ratingPillMuted}>No ratings yet</span>
        )}
      </div>

      <div className={styles.resultActions}>
        {phone ? (
          <a className={styles.actionBtn} href={`tel:${phone}`}>📞 Call</a>
        ) : (
          <a className={styles.actionBtn} href={m.maps_url} target="_blank" rel="noopener noreferrer">📍 Maps</a>
        )}
        <button className={styles.actionBtnPrimary} onClick={() => onView(m)}>
          View mechanic →
        </button>
      </div>
    </div>
  )
}

// ── Full detail page for a single mechanic ──
function MechanicDetail({ m, onBack }) {
  const phone = formatPhone(m)
  const closedForGood = m.business_status && m.business_status !== 'OPERATIONAL'
  const today = todayHoursLine(m.regular_working_hours)

  return (
    <div className={styles.detailPage}>
      <button className={styles.detailBack} onClick={onBack}>← Back to results</button>

      <div className={styles.detailHeader}>
        <h2 className={styles.detailName}>{m.display_name}</h2>
        <div className={styles.resultTags}>
          <span className={styles.typeTag}>{m.label || m.primary_type_name}</span>
          {m.badge_approved && <span className={styles.verifiedTag}>✓ Verified</span>}
          {closedForGood && (
            <span className={styles.closedTag}>{m.business_status.replaceAll('_', ' ').toLowerCase()}</span>
          )}
        </div>
      </div>

      <div className={styles.detailMetaRow}>
        {m.rating != null ? (
          <span className={styles.ratingPill}>★ {m.rating}</span>
        ) : (
          <span className={styles.ratingPillMuted}>No ratings yet</span>
        )}
        <span className={styles.hoursPill}>{m.distance_km} km away</span>
        {today && <span className={styles.hoursPill}>Today · {today}</span>}
      </div>

      <div className={styles.detailActions}>
        {phone && <a className={styles.actionBtn} href={`tel:${phone}`}>📞 Call</a>}
        <a className={styles.actionBtnPrimary} href={m.maps_url} target="_blank" rel="noopener noreferrer">
          Open in Maps →
        </a>
      </div>

      <div className={styles.detailSection}>
        <p className={styles.detailSectionTitle}>Address</p>
        <p className={styles.detailValue}>{m.long_formatted_address || m.short_formatted_address}</p>
      </div>

      {phone && (
        <div className={styles.detailSection}>
          <p className={styles.detailSectionTitle}>Phone</p>
          <p className={styles.detailValue}>{phone}</p>
        </div>
      )}

      {Array.isArray(m.regular_working_hours) && (
        <div className={styles.detailSection}>
          <p className={styles.detailSectionTitle}>Opening hours</p>
          <ul className={styles.hoursList}>
            {m.regular_working_hours.map(line => <li key={line}>{line}</li>)}
          </ul>
        </div>
      )}

      {Array.isArray(m.types) && m.types.length > 0 && (
        <div className={styles.detailSection}>
          <p className={styles.detailSectionTitle}>Categories</p>
          <div className={styles.resultTags}>
            {m.types.map(t => (
              <span key={t} className={styles.typeTag}>{t.replaceAll('_', ' ')}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Results screen ──
function ResultsView({ results, meta, onClose }) {
  const [selected, setSelected] = useState(null)
  const free = Number(meta?.charge) === 0

  if (selected) {
    return <MechanicDetail m={selected} onBack={() => setSelected(null)} />
  }

  return (
    <div className={styles.resultsPage}>
      <div className={styles.resultsHeader}>
        <div>
          <h2 className={styles.resultsTitle}>{results.length} auto-repair shops nearby</h2>
          <p className={styles.resultsSub}>📍Sorted by distance, closest to you.</p>
        </div>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close results">✕</button>
      </div>

      <div className={free ? styles.freeBanner : styles.paidBanner}>
        {free
          ? 'This search was free — no charge applied.'
          : `This search has been charged at $${meta?.charge} ~ ₦${meta?.naira}.`}
      </div>

      <div className={styles.resultsList}>
        {results.map(m => <MechanicListItem key={m.maps_url} m={m} onView={setSelected} />)}
      </div>

      <button className={styles.newSearchBtn} onClick={onClose}>
        Start a new search
      </button>
    </div>
  )
}

// ── Main page ──
export default function MechFind() {
  usePageTitle('MechFind — Ghostroute')
  useAuthGuard()
  useTokenRefresh()
  const navigate = useNavigate()

  // locationNotice | idle | consent | locating | initializing | searching | results | error
  const [phase, setPhase] = useState('locationNotice')
  const [errorMessage, setErrorMessage] = useState('')
  const [results, setResults] = useState([])
  const [meta, setMeta] = useState(null)
  const [balance, setBalance] = useState(null)
  const [balanceLoading, setBalanceLoading] = useState(true)

  // Fetch the user profile once so its balance fields can be shown in the
  // location-readiness notice — same source Dashboard reads naira_balance /
  // dollar_balance from.
  useEffect(() => {
    let cancelled = false
    async function loadBalance() {
      const token = getToken()
      if (!token) { setBalanceLoading(false); return }
      try {
        const r = await getUserProfile(token)
        if (!cancelled) setBalance(r.user)
      } catch {
        // Non-fatal — the notice will just show a dash instead of an amount.
      } finally {
        if (!cancelled) setBalanceLoading(false)
      }
    }
    loadBalance()
    return () => { cancelled = true }
  }, [])

  const acknowledgeLocationNotice = useCallback(() => setPhase('idle'), [])
  const openConsent = useCallback(() => setPhase('consent'), [])
  const cancelConsent = useCallback(() => setPhase('idle'), [])

  const runSearch = useCallback(async () => {
    const token = getToken()
    try {
      setPhase('locating')
      const { latitude, longitude } = await getPreciseLocation()

      setPhase('initializing')
      const init = await initializeMechanicSearch(token, latitude, longitude)

      setPhase('searching')
      const started = await startMechanicSearch(token, init.search_id, latitude, longitude)

      setMeta({ charge: init.search_dollar_charge, naira: init.search_naira_charge })
      setResults(started.data || [])
      setPhase('results')
    } catch (e) {
      setErrorMessage(e.message)
      setPhase('error')
    }
  }, [])

  const resetToIdle = useCallback(() => {
    setResults([])
    setMeta(null)
    setErrorMessage('')
    setPhase('idle')
  }, [])

  const busy = phase === 'locating' || phase === 'initializing' || phase === 'searching'

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <nav className={styles.nav}>
        <button className={styles.backBtn} onClick={() => navigate('/dashboard')} aria-label="Back to dashboard">
          ← Dashboard
        </button>
        <span className={styles.navSpacer} />
        <div className={styles.navBrand}>
          <GhostLogo size={26} showText showSub={false} />
        </div>
      </nav>

      {phase === 'results' ? (
        <ResultsView results={results} meta={meta} onClose={resetToIdle} />
      ) : (
        <main className={styles.hero}>
          <div className={styles.heroGlow} aria-hidden="true" />

          <button
            className={styles.logoTapTarget}
            onClick={openConsent}
            aria-label="Tap to find mechanics near you"
          >
            <span className={styles.tapRing} />
            <span className={styles.tapRing} style={{ animationDelay: '0.9s' }} />
            <div className={styles.logoInner}>
              <CarIcon size={72} />
            </div>
          </button>

          <p className={styles.heroTitle}>MechFind</p>
          <p className={styles.heroSub}>Tap the logo to find vetted mechanics near you</p>

          <button className={styles.priceBtn} onClick={openConsent}>
            $0.2 <span className={styles.priceBtnDivider}>/</span> search
          </button>
        </main>
      )}

      {phase === 'locationNotice' && (
        <LocationNoticeModal
          onAcknowledge={acknowledgeLocationNotice}
          balance={balance}
          balanceLoading={balanceLoading}
        />
      )}

      {phase === 'consent' && (
        <ConsentModal onConfirm={runSearch} onCancel={cancelConsent} />
      )}

      {busy && <SearchOverlay phase={phase} />}

      {phase === 'error' && (
        <ErrorModal message={errorMessage} onRetry={runSearch} onClose={resetToIdle} />
      )}
    </div>
  )
}
