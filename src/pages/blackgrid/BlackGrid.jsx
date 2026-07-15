import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken, getUserProfile } from '../../services/authService.js'
import { useAuthGuard } from '../../hooks/useAuthGuard.js'
import { useTokenRefresh } from '../../hooks/useTokenRefresh.js'
import {
  initializeBlackGridSearch,
  startBlackGridHotelSearch,
  startBlackGridRestaurantSearch,
} from '../../services/blackGridService.js'
import { getPreciseLocation } from '../mechfind/useGeolocation.js'
import GhostLogo from '../../components/GhostLogo.jsx'
import styles from './BlackGrid.module.css'

function usePageTitle(t) {
  useEffect(() => { document.title = t }, [t])
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const fmt = (n, cur) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(n ?? 0)

function formatPhone(m) {
  return m.international_phone_number || m.national_phone_number || null
}
function formattedAddress(m) {
  return m.long_formatted_address || m.short_formatted_address
}
function todayHoursLine(hours) {
  if (!Array.isArray(hours) || !hours.length) return null
  const today = DAY_NAMES[new Date().getDay()]
  const line = hours.find(h => h.startsWith(today))
  return line ? line.replace(`${today}: `, '') : null
}
function timeStrToMinutes(str) {
  const m = str.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return null
  let h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  if (/pm/i.test(m[3]) && h !== 12) h += 12
  if (/am/i.test(m[3]) && h === 12) h = 0
  return h * 60 + min
}
function isOpenNow(hours) {
  const line = todayHoursLine(hours)
  if (!line) return null
  if (line === 'Closed') return false
  if (line === 'Open 24 hours') return true
  const [startStr, endStr] = line.split(/–|-/).map(s => s.trim())
  const start = timeStrToMinutes(startStr)
  const end = timeStrToMinutes(endStr)
  if (start == null || end == null) return null
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  if (end > start) return nowMin >= start && nowMin < end
  return nowMin >= start || nowMin < end // overnight wrap
}

// ── Category definitions ────────────────────────────────────────────────
const CATEGORIES = {
  stay: {
    key: 'stay',
    label: 'Stay',
    tagline: 'Airbnbs, Hotels, Lounges Nearby',
    accentClass: styles.accentStay,
    consentBody: 'BlackGrid uses your precise location to find the closest Airbnbs, guesthouses, and hotels — with rates, contacts, and directions.',
    start: startBlackGridHotelSearch,
  },
  eat: {
    key: 'eat',
    label: 'Eat',
    tagline: 'Restaurants & Eats Nearby',
    accentClass: styles.accentEat,
    consentBody: 'BlackGrid uses your precise location to find the closest restaurants, eats, and fast food spots — with ratings, menu descriptions, contacts, and directions.',
    start: startBlackGridRestaurantSearch,
  },
}

const STATUS_COPY = (categoryLabel) => ({
  locating: 'Pinpointing your location…',
  initializing: 'Preparing your search…',
  searching: `Scanning nearby ${categoryLabel.toLowerCase()} listings…`,
})

// ── BlackGrid mark — draws itself in once on mount ──────────────────────
function BrandMark({ size = 56, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={`${styles.brandMark} ${className}`} xmlns="http://www.w3.org/2000/svg">
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
function StarGlyph({ filled }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3.5 14.6 9l6 .9-4.3 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.4 9.9l6-.9Z" strokeLinejoin="round" />
    </svg>
  )
}

// ── Status overlay ────────────────────────────────────────────────────
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
            <span className={styles.balanceValue}>{balanceLoading ? '—' : fmt(balance?.naira_balance, 'NGN')}</span>
          </div>
          <div className={styles.balanceSep} />
          <div className={styles.balanceItem}>
            <span className={styles.balanceLabel}>USD Balance</span>
            <span className={styles.balanceValueUsd}>{balanceLoading ? '—' : fmt(balance?.dollar_balance, 'USD')}</span>
          </div>
        </div>
        <div className={styles.modalActions}>
          <button className={styles.primaryBtn} onClick={onAcknowledge}>Got it, continue</button>
        </div>
      </div>
    </div>
  )
}

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

// ── Copy button + info row (shared by both detail views) ─────────────────
function CopyButton({ value, fieldKey, copiedKey, onCopy }) {
  const copied = copiedKey === fieldKey
  if (!value) return null
  return (
    <button type="button" className={styles.copyBtn} onClick={() => onCopy(fieldKey, value)} aria-label={copied ? 'Copied' : 'Copy'}>
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></svg>
      )}
      <span>{copied ? 'Copied' : 'Copy'}</span>
    </button>
  )
}
function InfoRow({ label, value, fieldKey, copiedKey, onCopy, mono }) {
  if (value == null || value === '') return null
  return (
    <div className={styles.infoRow}>
      <div className={styles.infoRowText}>
        <p className={styles.infoRowLabel}>{label}</p>
        <p className={mono ? styles.infoRowValueMono : styles.infoRowValue}>{value}</p>
      </div>
      {fieldKey && <CopyButton value={value} fieldKey={fieldKey} copiedKey={copiedKey} onCopy={onCopy} />}
    </div>
  )
}
function useCopy() {
  const [copiedKey, setCopiedKey] = useState(null)
  const onCopy = useCallback((key, value) => {
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(String(value)).catch(() => {})
    setCopiedKey(key)
    window.setTimeout(() => setCopiedKey(k => (k === key ? null : k)), 1600)
  }, [])
  return { copiedKey, onCopy }
}

/* ══════════════════════ STAY — card-grid, rate-led layout ══════════════════════ */

function StayListItem({ m, onView }) {
  const phone = formatPhone(m)
  const openAllDay = Array.isArray(m.regular_working_hours) && m.regular_working_hours.every(h => h.includes('Open 24 hours'))
  return (
    <div className={styles.stayCard} onClick={() => onView(m)}>
      <div className={styles.stayCardTop}>
        <div className={styles.stayRatingBadge}>
          <span className={styles.stayRatingNum}>{m.rating != null ? m.rating.toFixed(1) : '—'}</span>
          <div className={styles.stayStars}>
            {[1, 2, 3, 4, 5].map(i => <StarGlyph key={i} filled={m.rating != null && i <= Math.round(m.rating)} />)}
          </div>
        </div>
        <div className={styles.stayDistancePill}>{m.distance_km} km</div>
      </div>
      <p className={styles.stayName}>{m.display_name}</p>
      <p className={styles.stayAddress}>{m.short_formatted_address}</p>
      <div className={styles.stayTagRow}>
        <span className={styles.stayTypeTag}>{m.label || m.primary_type_name || 'Stay'}</span>
        {m.badge_approved && <span className={styles.stayVerifiedTag}>Verified</span>}
        {openAllDay && <span className={styles.stayHoursTag}>Open 24h</span>}
      </div>
      <div className={styles.stayCardActions}>
        {phone
          ? <a className={styles.stayActionBtn} href={`tel:${phone}`} onClick={e => e.stopPropagation()}>Call</a>
          : <a className={styles.stayActionBtn} href={m.maps_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>Maps</a>}
        <button className={styles.stayActionBtnPrimary} onClick={() => onView(m)}>View stay →</button>
      </div>
    </div>
  )
}

function StayDetail({ m, onBack }) {
  const { copiedKey, onCopy } = useCopy()
  const phone = formatPhone(m)
  const address = formattedAddress(m)
  const today = todayHoursLine(m.regular_working_hours)

  return (
    <div className={styles.detailPage}>
      <button className={styles.detailBack} onClick={onBack}>← Back to stays</button>
      <div className={`${styles.stayHero} ${styles.accentStay}`}>
        <div className={styles.stayHeroTop}>
          <span className={styles.stayHeroBadge}>{m.label || m.primary_type_name}</span>
          {m.badge_approved && <span className={styles.stayVerifiedTag}>Verified</span>}
        </div>
        <h2 className={styles.detailName}>{m.display_name}</h2>
        <div className={styles.stayHeroRating}>
          <div className={styles.stayStars}>{[1, 2, 3, 4, 5].map(i => <StarGlyph key={i} filled={m.rating != null && i <= Math.round(m.rating)} />)}</div>
          <span>{m.rating != null ? `${m.rating.toFixed(1)} rating` : 'No ratings yet'}</span>
          <span className={styles.statDot}>•</span>
          <span>{m.distance_km} km away</span>
        </div>
        <div className={styles.detailActions}>
          {phone && <a className={styles.stayActionBtn} href={`tel:${phone}`}>Call {phone}</a>}
          <a className={styles.stayActionBtnPrimary} href={m.maps_url} target="_blank" rel="noopener noreferrer">Open in Maps →</a>
        </div>
      </div>

      <div className={styles.detailSection}>
        <p className={styles.detailSectionTitle}>Location &amp; contact</p>
        <InfoRow label="Address" value={address} fieldKey="address" copiedKey={copiedKey} onCopy={onCopy} />
        {phone && <InfoRow label="Phone" value={phone} fieldKey="phone" copiedKey={copiedKey} onCopy={onCopy} mono />}
        <InfoRow label="Business status" value={m.business_status ? m.business_status.replaceAll('_', ' ').toLowerCase() : null} />
      </div>

      {Array.isArray(m.regular_working_hours) && m.regular_working_hours.length > 0 && (
        <div className={styles.detailSection}>
          <p className={styles.detailSectionTitle}>Hours {today ? `· Today ${today}` : ''}</p>
          <ul className={styles.hoursListFull}>
            {m.regular_working_hours.map(line => {
              const [day, ...rest] = line.split(': ')
              const isToday = DAY_NAMES[new Date().getDay()] === day
              return <li key={line} className={isToday ? styles.hoursRowToday : styles.hoursRow}><span>{day}</span><span>{rest.join(': ')}</span></li>
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

function StayResults({ results, meta, onClose }) {
  const [selected, setSelected] = useState(null)
  if (selected) return <StayDetail m={selected} onBack={() => setSelected(null)} />
  return (
    <div className={styles.resultsPage}>
      <div className={styles.resultsHeader}>
        <div>
          <p className={styles.resultsEyebrow}>Stay</p>
          <h2 className={styles.resultsTitle}>{results.length} places to stay nearby</h2>
        </div>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close results">✕</button>
      </div>
      <div className={meta?.free ? styles.freeBanner : styles.paidBanner}>
        {meta?.free ? (meta?.message || 'This search was free — no charge applied.') : `Charged $${meta?.charge} ~ ₦${meta?.naira}.`}
      </div>
      <div className={styles.stayGrid}>
        {results.map(m => <StayListItem key={m.maps_url} m={m} onView={setSelected} />)}
      </div>
      <button className={styles.newSearchBtn} onClick={onClose}>Start a new search</button>
    </div>
  )
}

/* ═══════════════════ EAT — compact ticket-row layout ═══════════════════ */

function EatListItem({ m, onView }) {
  const phone = formatPhone(m)
  const open = isOpenNow(m.regular_working_hours)
  return (
    <div className={styles.eatRow} onClick={() => onView(m)}>
      <div className={styles.eatStatusCol}>
        {open === null ? <span className={styles.eatStatusDotMuted} /> : (
          <span className={open ? styles.eatStatusDotOpen : styles.eatStatusDotClosed}>{open ? 'Open' : 'Closed'}</span>
        )}
      </div>
      <div className={styles.eatMain}>
        <p className={styles.eatName}>{m.display_name}</p>
        <p className={styles.eatAddress}>{m.short_formatted_address}</p>
        <div className={styles.eatTagRow}>
          <span className={styles.eatCuisineTag}>{m.label || m.primary_type_name || 'Eat'}</span>
          {m.rating != null && <span className={styles.eatRating}>★ {m.rating}</span>}
          {m.badge_approved && <span className={styles.eatVerifiedDot} title="Verified" />}
        </div>
      </div>
      <div className={styles.eatRight}>
        <span className={styles.eatDistance}>{m.distance_km} km</span>
        {phone
          ? <a className={styles.eatCallBtn} href={`tel:${phone}`} onClick={e => e.stopPropagation()}>Call</a>
          : <span className={styles.eatCallBtnMuted}>No phone</span>}
      </div>
    </div>
  )
}

function EatDetail({ m, onBack }) {
  const { copiedKey, onCopy } = useCopy()
  const phone = formatPhone(m)
  const address = formattedAddress(m)
  const open = isOpenNow(m.regular_working_hours)
  const today = todayHoursLine(m.regular_working_hours)

  return (
    <div className={styles.detailPage}>
      <button className={styles.detailBack} onClick={onBack}>← Back to eats</button>
      <div className={`${styles.eatHero} ${styles.accentEat}`}>
        <div className={styles.eatHeroTop}>
          <span className={styles.eatCuisineTag}>{m.label || m.primary_type_name}</span>
          {open != null && <span className={open ? styles.eatStatusDotOpen : styles.eatStatusDotClosed}>{open ? 'Open now' : 'Closed now'}</span>}
        </div>
        <h2 className={styles.detailName}>{m.display_name}</h2>
        <p className={styles.eatHeroToday}>{today ? `Today: ${today}` : 'Hours vary'}</p>
        <div className={styles.detailActions}>
          {phone && <a className={styles.eatCallBtn} href={`tel:${phone}`}>Call {phone}</a>}
          <a className={styles.eatCallBtnPrimary} href={m.maps_url} target="_blank" rel="noopener noreferrer">Directions →</a>
        </div>
      </div>

      <div className={styles.detailSection}>
        <p className={styles.detailSectionTitle}>Contact &amp; location</p>
        <InfoRow label="Address" value={address} fieldKey="address" copiedKey={copiedKey} onCopy={onCopy} />
        {phone && <InfoRow label="Phone" value={phone} fieldKey="phone" copiedKey={copiedKey} onCopy={onCopy} mono />}
        <InfoRow label="Rating" value={m.rating != null ? `${m.rating} / 5` : 'No ratings yet'} />
        <InfoRow label="Distance" value={`${m.distance_km} km away`} />
      </div>

      {Array.isArray(m.regular_working_hours) && m.regular_working_hours.length > 0 && (
        <div className={styles.detailSection}>
          <p className={styles.detailSectionTitle}>Hours</p>
          <ul className={styles.hoursListFull}>
            {m.regular_working_hours.map(line => {
              const [day, ...rest] = line.split(': ')
              const isToday = DAY_NAMES[new Date().getDay()] === day
              return <li key={line} className={isToday ? styles.hoursRowToday : styles.hoursRow}><span>{day}</span><span>{rest.join(': ')}</span></li>
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

function EatResults({ results, meta, onClose }) {
  const [selected, setSelected] = useState(null)
  if (selected) return <EatDetail m={selected} onBack={() => setSelected(null)} />
  return (
    <div className={styles.resultsPage}>
      <div className={styles.resultsHeader}>
        <div>
          <p className={styles.resultsEyebrow}>Eat</p>
          <h2 className={styles.resultsTitle}>{results.length} places to eat nearby</h2>
        </div>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close results">✕</button>
      </div>
      <div className={meta?.free ? styles.freeBanner : styles.paidBanner}>
        {meta?.free ? (meta?.message || 'This search was free — no charge applied.') : `Charged $${meta?.charge} ~ ₦${meta?.naira}.`}
      </div>
      <div className={styles.eatList}>
        {results.map((m, i) => <EatListItem key={`${m.maps_url}-${i}`} m={m} onView={setSelected} />)}
      </div>
      <button className={styles.newSearchBtn} onClick={onClose}>Start a new search</button>
    </div>
  )
}

/* ═══════════════════ Category picker tile ═══════════════════ */
function CategoryTile({ category, onSelect }) {
  return (
    <button className={`${styles.tile} ${category.accentClass}`} onClick={() => onSelect(category.key)}>
      <span className={styles.tileIcon}>{category.key === 'stay' ? <StayGlyph size={22} /> : <EatGlyph size={22} />}</span>
      <span className={styles.tileLabel}>{category.label}</span>
      <span className={styles.tileTagline}>{category.tagline}</span>
      <span className={styles.tileRule} />
      <span className={styles.tilePrice}>$0.20 / search</span>
    </button>
  )
}

/* ═══════════════════ Main page ═══════════════════ */
export default function BlackGrid() {
  usePageTitle('BlackGrid — Ghostroute')
  useAuthGuard()
  useTokenRefresh()
  const navigate = useNavigate()

  // locationNotice | idle | consent | locating | initializing | searching | results | error
  const [phase, setPhase] = useState('locationNotice')
  const [categoryKey, setCategoryKey] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [results, setResults] = useState([])
  const [meta, setMeta] = useState(null)
  const [balance, setBalance] = useState(null)
  const [balanceLoading, setBalanceLoading] = useState(true)

  const category = categoryKey ? CATEGORIES[categoryKey] : null

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
  const selectCategory = useCallback((key) => { setCategoryKey(key); setPhase('consent') }, [])
  const cancelConsent = useCallback(() => { setCategoryKey(null); setPhase('idle') }, [])

  const runSearch = useCallback(async () => {
    const token = getToken()
    const activeCategory = CATEGORIES[categoryKey]
    try {
      setPhase('locating')
      const { latitude, longitude } = await getPreciseLocation()

      setPhase('initializing')
      const init = await initializeBlackGridSearch(token, latitude, longitude)

      setPhase('searching')
      const started = await activeCategory.start(token, init.search_id, latitude, longitude)

      const charge = init.search_dollar_charge ?? started.search_dollar_charge
      const naira = init.search_naira_charge ?? started.search_naira_charge
      const free = charge == null || Number(charge) === 0 || Number(naira) === 0

      setMeta({ charge, naira, free, message: init.message })
      setResults(started.data || [])
      setPhase('results')
    } catch (e) {
      setErrorMessage(e.message)
      setPhase('error')
    }
  }, [categoryKey])

  const resetToIdle = useCallback(() => {
    setResults([]); setMeta(null); setErrorMessage(''); setCategoryKey(null); setPhase('idle')
  }, [])

  const busy = phase === 'locating' || phase === 'initializing' || phase === 'searching'

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <button className={styles.backBtn} onClick={() => navigate('/dashboard')} aria-label="Back to dashboard">← Dashboard</button>
        <span className={styles.navSpacer} />
        <div className={styles.navBrand}><GhostLogo size={26} showText showSub={false} /></div>
      </nav>

      {phase === 'results' && category ? (
        category.key === 'stay'
          ? <StayResults results={results} meta={meta} onClose={resetToIdle} />
          : <EatResults results={results} meta={meta} onClose={resetToIdle} />
      ) : (
        <main className={styles.hero}>
          <div className={styles.heroGrid} aria-hidden="true" />
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={styles.logoBadge}><BrandMark size={44} /></div>
          <p className={styles.heroEyebrow}>Find nearby</p>
          <p className={styles.heroTitle}>BlackGrid</p>
          <p className={styles.heroSub}>Choose a category, and we&rsquo;ll locate what&rsquo;s around you.</p>
          <div className={styles.categoryRow}>
            <CategoryTile category={CATEGORIES.stay} onSelect={selectCategory} />
            <CategoryTile category={CATEGORIES.eat} onSelect={selectCategory} />
          </div>
        </main>
      )}

      {phase === 'locationNotice' && (
        <LocationNoticeModal onAcknowledge={acknowledgeLocationNotice} balance={balance} balanceLoading={balanceLoading} />
      )}
      {phase === 'consent' && category && (
        <ConsentModal category={category} onConfirm={runSearch} onCancel={cancelConsent} />
      )}
      {busy && category && <SearchOverlay phase={phase} category={category} />}
      {phase === 'error' && (
        <ErrorModal message={errorMessage} onRetry={runSearch} onClose={resetToIdle} />
      )}
    </div>
  )
}
