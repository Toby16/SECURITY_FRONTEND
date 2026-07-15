import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken, getUserProfile } from '../../services/authService.js'
import { useAuthGuard } from '../../hooks/useAuthGuard.js'
import { useTokenRefresh } from '../../hooks/useTokenRefresh.js'
import {
  initializeCartSearch,
  startCartMarketSearch,
  startCartFarmSearch,
} from '../../services/cartService.js'
import { getPreciseLocation } from '../mechfind/useGeolocation.js'
import GhostLogo from '../../components/GhostLogo.jsx'
import styles from './CART.module.css'

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
  return nowMin >= start || nowMin < end
}
// Which days a place is actually open — used by Farm/Local to surface
// "Sat only" / "Closed Sun" style patterns, since several listings only
// trade on weekends.
function openDaysShort(hours) {
  if (!Array.isArray(hours) || !hours.length) return null
  const short = { Sunday: 'Su', Monday: 'Mo', Tuesday: 'Tu', Wednesday: 'We', Thursday: 'Th', Friday: 'Fr', Saturday: 'Sa' }
  return hours.map(line => {
    const [day, ...rest] = line.split(': ')
    return { day, abbr: short[day] || day.slice(0, 2), closed: rest.join(': ') === 'Closed' }
  })
}

// ── Category definitions ────────────────────────────────────────────────
const CATEGORIES = {
  market: {
    key: 'market',
    label: 'Market',
    tagline: 'Supermarkets, Grocery Stores, Malls & Marts',
    accentClass: styles.accentMarket,
    consentBody: 'CART uses your precise location to find the closest supermarkets, grocery stores, malls, and marts — with hours, contacts, and directions.',
    start: startCartMarketSearch,
  },
  farm: {
    key: 'farm',
    label: 'Farm & Local',
    tagline: 'Local Markets & Farm Markets Nearby',
    accentClass: styles.accentFarm,
    consentBody: 'CART uses your precise location to find the closest local markets and farm markets — with hours, contacts, and directions.',
    start: startCartFarmSearch,
  },
}

const STATUS_COPY = (categoryLabel) => ({
  locating: 'Pinpointing your location…',
  initializing: 'Reserving your search…',
  searching: `Scanning nearby ${categoryLabel.toLowerCase()} listings…`,
})

// ── CART mark — a basket that draws itself in once on mount ─────────────
function BrandMark({ size = 56, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={`${styles.brandMark} ${className}`} xmlns="http://www.w3.org/2000/svg">
      <path d="M10 18 L38 18 L34 40 L14 40 Z" className={styles.basketOuter} fill="none" />
      <path d="M16 18 L18 10 M32 18 L30 10" className={styles.basketOuter} fill="none" />
      <path d="M15 25 L33 25" className={styles.basketWeaveA} fill="none" />
      <path d="M16 32 L32 32" className={styles.basketWeaveB} fill="none" />
      <circle cx="24" cy="43.5" r="1.8" className={styles.basketDot} />
    </svg>
  )
}

function MarketGlyph({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 9 5.5 4h13L20 9" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M4 9h16v2a2 2 0 0 1-4 0 2 2 0 0 1-4 0 2 2 0 0 1-4 0 2 2 0 0 1-4 0Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M5.5 11v9h13v-9" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10 20v-5h4v5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
function FarmGlyph({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 21c0-6 3-8 7-9-1 5-3 8-7 9Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 21c0-7-3-10-7-11 1 6 3 9.5 7 11Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 21V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
        <span className={styles.overlayGlyph}>
          {category.key === 'market' ? <MarketGlyph size={40} /> : <FarmGlyph size={40} />}
        </span>
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
        <div className={styles.modalIcon}>🧺</div>
        <h2 className={styles.modalTitle}>Before you search</h2>
        <p className={styles.modalBody}>
          CART depends on accurate device location to find markets and grocers near you. Please
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
          {category.key === 'market' ? <MarketGlyph size={20} /> : <FarmGlyph size={20} />}
        </div>
        <h2 className={styles.modalTitle}>Find {category.key === 'market' ? 'a market or store' : 'a local or farm market'} near you</h2>
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

// Maps a primary_type to a shelf-tag color class — Market listings span
// supermarket/grocery/mall/general-store/discount, so the tag itself carries
// the distinction instead of relying on rating or hours.
function marketTypeTagClass(m) {
  const t = (m.primary_type || '').toLowerCase()
  if (t.includes('mall')) return styles.tagMall
  if (t.includes('discount')) return styles.tagDiscount
  if (t.includes('general')) return styles.tagGeneral
  if (t.includes('grocery')) return styles.tagGrocery
  return styles.tagSuper
}

/* ══════════════════════ MARKET — shelf-tag card grid ══════════════════════ */

function MarketListItem({ m, onView }) {
  const phone = formatPhone(m)
  const open = isOpenNow(m.regular_working_hours)
  return (
    <div className={styles.marketCard} onClick={() => onView(m)}>
      <div className={styles.marketCardTop}>
        <span className={`${styles.marketTypeTag} ${marketTypeTagClass(m)}`}>{m.label || m.primary_type_name || 'Store'}</span>
        <span className={styles.marketDistancePill}>{m.distance_km} km</span>
      </div>
      <p className={styles.marketName}>{m.display_name}</p>
      <p className={styles.marketAddress}>{m.short_formatted_address}</p>
      <div className={styles.marketMetaRow}>
        {m.rating != null ? (
          <span className={styles.marketRating}><StarGlyph filled /> {m.rating}</span>
        ) : <span className={styles.marketRatingMuted}>No ratings yet</span>}
        {open != null && (
          <span className={open ? styles.marketOpenDot : styles.marketClosedDot}>{open ? 'Open now' : 'Closed'}</span>
        )}
        {m.badge_approved && <span className={styles.marketVerifiedTag}>Verified</span>}
      </div>
      <div className={styles.marketCardActions}>
        {phone
          ? <a className={styles.marketActionBtn} href={`tel:${phone}`} onClick={e => e.stopPropagation()}>Call</a>
          : <a className={styles.marketActionBtn} href={m.maps_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>Maps</a>}
        <button className={styles.marketActionBtnPrimary} onClick={() => onView(m)}>View store →</button>
      </div>
    </div>
  )
}

function MarketDetail({ m, onBack }) {
  const { copiedKey, onCopy } = useCopy()
  const phone = formatPhone(m)
  const address = formattedAddress(m)
  const today = todayHoursLine(m.regular_working_hours)
  const open = isOpenNow(m.regular_working_hours)

  return (
    <div className={styles.detailPage}>
      <button className={styles.detailBack} onClick={onBack}>← Back to stores</button>
      <div className={`${styles.marketHero} ${styles.accentMarket}`}>
        <div className={styles.marketHeroTop}>
          <span className={`${styles.marketTypeTag} ${marketTypeTagClass(m)}`}>{m.label || m.primary_type_name}</span>
          {m.badge_approved && <span className={styles.marketVerifiedTag}>Verified</span>}
        </div>
        <h2 className={styles.detailName}>{m.display_name}</h2>
        <div className={styles.marketHeroMeta}>
          {m.rating != null ? <span className={styles.marketRating}><StarGlyph filled /> {m.rating} rating</span> : <span>No ratings yet</span>}
          <span className={styles.statDot}>•</span>
          <span>{m.distance_km} km away</span>
          {open != null && <><span className={styles.statDot}>•</span><span className={open ? styles.marketOpenDot : styles.marketClosedDot}>{open ? 'Open now' : 'Closed'}</span></>}
        </div>
        <div className={styles.detailActions}>
          {phone && <a className={styles.marketActionBtn} href={`tel:${phone}`}>Call {phone}</a>}
          <a className={styles.marketActionBtnPrimary} href={m.maps_url} target="_blank" rel="noopener noreferrer">Open in Maps →</a>
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

function MarketResults({ results, meta, onClose }) {
  const [selected, setSelected] = useState(null)
  if (selected) return <MarketDetail m={selected} onBack={() => setSelected(null)} />
  return (
    <div className={styles.resultsPage}>
      <div className={styles.resultsHeader}>
        <div>
          <p className={styles.resultsEyebrow}>Market</p>
          <h2 className={styles.resultsTitle}>{results.length} stores nearby</h2>
        </div>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close results">✕</button>
      </div>
      <div className={meta?.free ? styles.freeBanner : styles.paidBanner}>
        {meta?.free ? (meta?.message || 'This search was free — no charge applied.') : `Charged $${meta?.charge} ~ ₦${meta?.naira}.`}
      </div>
      <div className={styles.marketGrid}>
        {results.map((m, i) => <MarketListItem key={`${m.maps_url}-${i}`} m={m} onView={setSelected} />)}
      </div>
      <button className={styles.newSearchBtn} onClick={onClose}>Start a new search</button>
    </div>
  )
}

/* ═══════════════════ FARM/LOCAL — stall-card list, open-day led ═══════════════════ */

function FarmListItem({ m, onView }) {
  const phone = formatPhone(m)
  const open = isOpenNow(m.regular_working_hours)
  const days = openDaysShort(m.regular_working_hours)
  return (
    <div className={styles.farmCard} onClick={() => onView(m)}>
      <div className={styles.farmCardLeft}>
        <p className={styles.farmName}>{m.display_name}</p>
        <p className={styles.farmAddress}>{m.short_formatted_address}</p>
        <div className={styles.farmTagRow}>
          <span className={styles.farmTypeTag}>{m.label || m.primary_type_name || 'Market'}</span>
          {m.rating != null && <span className={styles.farmRating}><StarGlyph filled /> {m.rating}</span>}
          {m.badge_approved && <span className={styles.farmVerifiedDot} title="Verified" />}
        </div>
        {days && (
          <div className={styles.farmDayStrip}>
            {days.map(d => (
              <span key={d.day} className={d.closed ? styles.farmDayOff : styles.farmDayOn}>{d.abbr}</span>
            ))}
          </div>
        )}
      </div>
      <div className={styles.farmCardRight}>
        {open != null && <span className={open ? styles.farmOpenPill : styles.farmClosedPill}>{open ? 'Open now' : 'Closed'}</span>}
        <span className={styles.farmDistance}>{m.distance_km} km</span>
        {phone
          ? <a className={styles.farmCallBtn} href={`tel:${phone}`} onClick={e => e.stopPropagation()}>Call</a>
          : <span className={styles.farmCallBtnMuted}>No phone</span>}
      </div>
    </div>
  )
}

function FarmDetail({ m, onBack }) {
  const { copiedKey, onCopy } = useCopy()
  const phone = formatPhone(m)
  const address = formattedAddress(m)
  const open = isOpenNow(m.regular_working_hours)
  const today = todayHoursLine(m.regular_working_hours)

  return (
    <div className={styles.detailPage}>
      <button className={styles.detailBack} onClick={onBack}>← Back to markets</button>
      <div className={`${styles.farmHero} ${styles.accentFarm}`}>
        <div className={styles.farmHeroTop}>
          <span className={styles.farmTypeTag}>{m.label || m.primary_type_name || 'Market'}</span>
          {open != null && <span className={open ? styles.farmOpenPill : styles.farmClosedPill}>{open ? 'Open now' : 'Closed now'}</span>}
        </div>
        <h2 className={styles.detailName}>{m.display_name}</h2>
        <p className={styles.farmHeroToday}>{today ? `Today: ${today}` : 'Hours vary'}</p>
        <div className={styles.detailActions}>
          {phone && <a className={styles.farmCallBtn} href={`tel:${phone}`}>Call {phone}</a>}
          <a className={styles.farmCallBtnPrimary} href={m.maps_url} target="_blank" rel="noopener noreferrer">Directions →</a>
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
          <p className={styles.detailSectionTitle}>Trading days</p>
          <ul className={styles.hoursListFull}>
            {m.regular_working_hours.map(line => {
              const [day, ...rest] = line.split(': ')
              const isToday = DAY_NAMES[new Date().getDay()] === day
              const closed = rest.join(': ') === 'Closed'
              return (
                <li key={line} className={isToday ? styles.hoursRowToday : styles.hoursRow}>
                  <span>{day}</span>
                  <span className={closed ? styles.hoursClosedText : undefined}>{rest.join(': ')}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

function FarmResults({ results, meta, onClose }) {
  const [selected, setSelected] = useState(null)
  if (selected) return <FarmDetail m={selected} onBack={() => setSelected(null)} />
  return (
    <div className={styles.resultsPage}>
      <div className={styles.resultsHeader}>
        <div>
          <p className={styles.resultsEyebrow}>Farm &amp; Local</p>
          <h2 className={styles.resultsTitle}>{results.length} markets nearby</h2>
        </div>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close results">✕</button>
      </div>
      <div className={meta?.free ? styles.freeBanner : styles.paidBanner}>
        {meta?.free ? (meta?.message || 'This search was free — no charge applied.') : `Charged $${meta?.charge} ~ ₦${meta?.naira}.`}
      </div>
      <div className={styles.farmList}>
        {results.map((m, i) => <FarmListItem key={`${m.maps_url}-${i}`} m={m} onView={setSelected} />)}
      </div>
      <button className={styles.newSearchBtn} onClick={onClose}>Start a new search</button>
    </div>
  )
}

/* ═══════════════════ Category picker tile ═══════════════════ */
function CategoryTile({ category, onSelect }) {
  return (
    <button className={`${styles.tile} ${category.accentClass}`} onClick={() => onSelect(category.key)}>
      <span className={styles.tileIcon}>{category.key === 'market' ? <MarketGlyph size={22} /> : <FarmGlyph size={22} />}</span>
      <span className={styles.tileLabel}>{category.label}</span>
      <span className={styles.tileTagline}>{category.tagline}</span>
      <span className={styles.tileRule} />
      <span className={styles.tilePrice}>$0.20 / search</span>
    </button>
  )
}

/* ═══════════════════ Main page ═══════════════════ */
export default function CART() {
  usePageTitle('CART — Ghostroute')
  useAuthGuard()
  useTokenRefresh()
  const navigate = useNavigate()

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
        // Non-fatal
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
      const init = await initializeCartSearch(token, latitude, longitude)

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
        category.key === 'market'
          ? <MarketResults results={results} meta={meta} onClose={resetToIdle} />
          : <FarmResults results={results} meta={meta} onClose={resetToIdle} />
      ) : (
        <main className={styles.hero}>
          <div className={styles.heroGrid} aria-hidden="true" />
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={styles.logoBadge}><BrandMark size={44} /></div>
          <p className={styles.heroEyebrow}>Find nearby</p>
          <p className={styles.heroTitle}>CART</p>
          <p className={styles.heroSub}>Choose a category, and we&rsquo;ll locate what&rsquo;s around you.</p>
          <div className={styles.categoryRow}>
            <CategoryTile category={CATEGORIES.market} onSelect={selectCategory} />
            <CategoryTile category={CATEGORIES.farm} onSelect={selectCategory} />
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
