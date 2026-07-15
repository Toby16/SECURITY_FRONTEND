import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken, getUserProfile } from '../../services/authService.js'
import { useAuthGuard } from '../../hooks/useAuthGuard.js'
import { useTokenRefresh } from '../../hooks/useTokenRefresh.js'
import { initializeBlackGridSearch, startBlackGridSearch } from '../../services/blackGridService.js'
import { getPreciseLocation } from '../mechfind/useGeolocation.js'
import GhostLogo from '../../components/GhostLogo.jsx'
import styles from './BlackGrid.module.css'

function usePageTitle(t) {
  useEffect(() => { document.title = t }, [t])
}

const fmt = (n, cur) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(n ?? 0)

// ── Category definitions — the one split this app is built around ──────────
const CATEGORIES = {
  stay: {
    key: 'stay',
    label: 'Stay',
    tagline: 'Airbnbs, Hotels & Lounges Nearby',
    accentClass: styles.accentStay,
    consentBody: 'BlackGrid uses your precise location to find the closest Airbnbs, guesthouses, and hotels — with rates, contacts, and directions.',
  },
  eat: {
    key: 'eat',
    label: 'Eat',
    tagline: 'Restaurants & Eats Nearby',
    accentClass: styles.accentEat,
    consentBody: 'BlackGrid uses your precise location to find the closest restaurants, and fast food spots — with ratings, contacts, and directions.',
  },
}

const STATUS_COPY = (categoryLabel) => ({
  locating: 'Pinpointing your location…',
  initializing: 'Preparing your search…',
  searching: `Scanning nearby ${categoryLabel.toLowerCase()} listings…`,
})

// ── BlackGrid mark — a line-drawn grid compass. Draws itself in on mount;
// this is the page's one deliberate motion signature. ──
function BrandMark({ size = 56, className = '' }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 48 48"
      className={`${styles.brandMark} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M24 4 L44 24 L24 44 L4 24 Z" className={styles.markOuter} fill="none" />
      <path d="M24 12 L24 36" className={styles.markInnerA} fill="none" />
      <path d="M12 24 L36 24" className={styles.markInnerB} fill="none" />
      <circle cx="24" cy="24" r="2.2" className={styles.markDot} />
    </svg>
  )
}

function StayGlyph({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4.5" y="6" width="15" height="15" rx="1.2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="7.5" y="9" width="2.6" height="2.6" stroke="currentColor" strokeWidth="1.3" />
      <rect x="13.5" y="9" width="2.6" height="2.6" stroke="currentColor" strokeWidth="1.3" />
      <rect x="10.4" y="15" width="3.2" height="6" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

function EatGlyph({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.5 3.5v6M8.5 3.5v6M6.5 6.5h2M7.5 9.5v11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.5 3.5c-1.4 0-2.5 1.7-2.5 4.5s1.1 4.3 2.1 4.7v7.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Status overlay shown while location → initialize → start are in flight ──
function SearchOverlay({ phase, category }) {
  const copy = STATUS_COPY(category.label)
  return (
    <div className={styles.overlay}>
      <div className={`${styles.scannerWrap} ${category.accentClass}`}>
        <BrandMark size={64} />
        <span className={styles.scanSweep} />
      </div>
      <p className={styles.overlayStatus}>{copy[phase] || 'Working on it…'}</p>
      <p className={styles.overlayHint}>This takes a few seconds.</p>
    </div>
  )
}

// ── Location-readiness notice — always shown first, before anything else ───
function LocationNoticeModal({ onAcknowledge, balance, balanceLoading }) {
  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
      <div className={styles.modalCard}>
        <div className={styles.modalIcon}>🍲</div>
        <h2 className={styles.modalTitle}>Before you search</h2>
        <p className={styles.modalBody}>
          BlackGrid depends on accurate device location to find stays and eats near you. Please
          confirm that location (GPS) services are switched on and permitted for this browser
          before continuing. If location services are disabled or restricted on your device, we
          have no way to determine your position on our end, and a search cannot be completed
          until this is enabled.
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
function ConsentModal({ category, onConfirm, onCancel }) {
  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
      <div className={styles.modalCard}>
        <div className={`${styles.modalIcon} ${category.accentClass}`}>
          {category.key === 'stay' ? <StayGlyph size={20} /> : <EatGlyph size={20} />}
        </div>
        <h2 className={styles.modalTitle}>Find {category.key === 'stay' ? 'a stay' : 'somewhere to eat'} near you</h2>
        <p className={styles.modalBody}>{category.consentBody}</p>
        <p className={styles.modalBody}>Your device will ask you to allow location access.</p>
        <div className={styles.priceTag}>
          <span className={styles.priceTagAmount}>$0.20</span>
          <span className={styles.priceTagLabel}>first search free</span>
        </div>
        <p className={styles.modalFinePrint}>
          Results stay free to browse until you leave this page. Coming back later starts a new search.
        </p>
        <div className={styles.modalActions}>
          <button className={`${styles.primaryBtn} ${category.accentClass}`} onClick={onConfirm}>
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

// ── Reserved modal — shown once initialize succeeds but the category's
// results endpoint isn't wired up yet. Distinct from ErrorModal on purpose:
// this isn't a failure, it's a "you're in queue" state. ──
function ReservedModal({ category, reservation, onClose }) {
  const free = reservation?.free
  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
      <div className={styles.modalCard}>
        <div className={`${styles.modalIcon} ${styles.modalIconGood}`}>✓</div>
        <h2 className={styles.modalTitle}>Search reserved</h2>
        <p className={styles.modalBody}>
          Your {category.key === 'stay' ? 'stay' : 'eat'} search near your location is confirmed.
          Listings for this category aren&rsquo;t live on the grid just yet — check back shortly
          and this same search will surface results.
        </p>
        <div className={styles.idChip}>
          <span className={styles.idChipLabel}>Search ID</span>
          <span className={styles.idChipValue}>{reservation?.searchId}</span>
        </div>
        <p className={styles.modalFinePrint}>
          {free
            ? 'This search was free — no charge applied.'
            : `Charged $${reservation?.charge} ~ ₦${reservation?.naira}.`}
        </p>
        <div className={styles.modalActions}>
          <button className={styles.primaryBtn} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}

// ── Category picker tile ──
function CategoryTile({ category, onSelect }) {
  return (
    <button
      className={`${styles.tile} ${category.accentClass}`}
      onClick={() => onSelect(category.key)}
    >
      <span className={styles.tileIcon}>
        {category.key === 'stay' ? <StayGlyph size={22} /> : <EatGlyph size={22} />}
      </span>
      <span className={styles.tileLabel}>{category.label}</span>
      <span className={styles.tileTagline}>{category.tagline}</span>
      <span className={styles.tileRule} />
      <span className={styles.tilePrice}>$0.20 / search</span>
    </button>
  )
}

// ── Main page ──
export default function BlackGrid() {
  usePageTitle('BlackGrid — Ghostroute')
  useAuthGuard()
  useTokenRefresh()
  const navigate = useNavigate()

  // locationNotice | idle | consent | locating | initializing | searching | reserved | results | error
  const [phase, setPhase] = useState('locationNotice')
  const [categoryKey, setCategoryKey] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [reservation, setReservation] = useState(null)
  const [results, setResults] = useState([])
  const [meta, setMeta] = useState(null)
  const [balance, setBalance] = useState(null)
  const [balanceLoading, setBalanceLoading] = useState(true)

  const category = categoryKey ? CATEGORIES[categoryKey] : null

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

  const selectCategory = useCallback((key) => {
    setCategoryKey(key)
    setPhase('consent')
  }, [])

  const cancelConsent = useCallback(() => {
    setCategoryKey(null)
    setPhase('idle')
  }, [])

  const runSearch = useCallback(async () => {
    const token = getToken()
    const activeCategory = categoryKey
    try {
      setPhase('locating')
      const { latitude, longitude } = await getPreciseLocation()

      setPhase('initializing')
      const init = await initializeBlackGridSearch(token, latitude, longitude)

      setPhase('searching')
      try {
        const started = await startBlackGridSearch(token, init.search_id, activeCategory, latitude, longitude)

        const charge = init.search_dollar_charge ?? started.search_dollar_charge
        const naira = init.search_naira_charge ?? started.search_naira_charge
        const free = charge == null || Number(charge) === 0 || Number(naira) === 0

        setMeta({ charge, naira, free, message: init.message })
        setResults(started.data || [])
        setPhase('results')
      } catch (startErr) {
        if (startErr.code === 'NOT_IMPLEMENTED') {
          const charge = init.search_dollar_charge
          const naira = init.search_naira_charge
          const free = charge == null || Number(charge) === 0 || Number(naira) === 0
          setReservation({ searchId: init.search_id, charge, naira, free })
          setPhase('reserved')
          return
        }
        throw startErr
      }
    } catch (e) {
      setErrorMessage(e.message)
      setPhase('error')
    }
  }, [categoryKey])

  const resetToIdle = useCallback(() => {
    setResults([])
    setMeta(null)
    setReservation(null)
    setErrorMessage('')
    setCategoryKey(null)
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

      <main className={styles.hero}>
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={styles.heroGlow} aria-hidden="true" />

        <div className={styles.logoBadge}>
          <BrandMark size={44} />
        </div>

        <p className={styles.heroEyebrow}>Find nearby</p>
        <p className={styles.heroTitle}>BlackGrid</p>
        <p className={styles.heroSub}>Choose a category, and we&rsquo;ll locate what&rsquo;s around you.</p>

        <div className={styles.categoryRow}>
          <CategoryTile category={CATEGORIES.stay} onSelect={selectCategory} />
          <CategoryTile category={CATEGORIES.eat} onSelect={selectCategory} />
        </div>
      </main>

      {phase === 'locationNotice' && (
        <LocationNoticeModal
          onAcknowledge={acknowledgeLocationNotice}
          balance={balance}
          balanceLoading={balanceLoading}
        />
      )}

      {phase === 'consent' && category && (
        <ConsentModal category={category} onConfirm={runSearch} onCancel={cancelConsent} />
      )}

      {busy && category && <SearchOverlay phase={phase} category={category} />}

      {phase === 'reserved' && category && (
        <ReservedModal category={category} reservation={reservation} onClose={resetToIdle} />
      )}

      {phase === 'error' && (
        <ErrorModal message={errorMessage} onRetry={runSearch} onClose={resetToIdle} />
      )}
    </div>
  )
}
