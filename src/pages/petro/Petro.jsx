import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken, getUserProfile } from '../../services/authService.js'
import { useAuthGuard } from '../../hooks/useAuthGuard.js'
import { useTokenRefresh } from '../../hooks/useTokenRefresh.js'
import { initializePetroSearch, startPetroSearch } from '../../services/petroService.js'
import { getPreciseLocation } from '../mechfind/useGeolocation.js'
import GhostLogo from '../../components/GhostLogo.jsx'
import styles from './Petro.module.css'

function usePageTitle(t) {
  useEffect(() => { document.title = t }, [t])
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Results farther than this are hidden behind "Show more" so users aren't
// bombarded with the full backend response every time.
const NEARBY_DISTANCE_KM = 15.99

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

function formatDistance(m) {
  const km = m.distance_km
  const meters = m.distance_meters
  if (meters != null) return `${meters} m`
  if (km != null) return `${km} km`
  return null
}

// Resolves a station's distance to kilometers regardless of which field the
// backend populated, so the nearby/far split works consistently.
function distanceKm(m) {
  if (typeof m.distance_km === 'number') return m.distance_km
  if (typeof m.distance_meters === 'number') return m.distance_meters / 1000
  return null
}

// Splits a results array into "nearby" (shown immediately) and "far"
// (distance > NEARBY_DISTANCE_KM, tucked behind a "Show more" reveal).
function splitByDistance(results) {
  const nearby = []
  const far = []
  for (const m of results) {
    const km = distanceKm(m)
    if (km != null && km > NEARBY_DISTANCE_KM) far.push(m)
    else nearby.push(m)
  }
  return { nearby, far }
}

function statusTone(status) {
  if (status === 'OPERATIONAL') return 'good'
  if (!status) return null
  return 'bad'
}

const fmt = (n, cur) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(n ?? 0)

// ── Fuel pump icon — Petro's hero mark ───────────────────────────────────────
function FuelPumpIcon({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" />
      <path d="M4 21h10" />
      <path d="M4 11h10" />
      <path d="M14 8h2.2l2.6 2.6a1 1 0 0 1 .2.6V17a1.5 1.5 0 0 1-3 0v-3.5a1 1 0 0 0-1-1H14" />
      <circle cx="7" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
      <path d="M17.8 8.6 16 6.8" />
    </svg>
  )
}

// ── Status overlay shown while location → initialize → start are in flight ──
const STATUS_COPY = {
  locating: 'Pinning your exact spot…',
  initializing: 'Priming your search…',
  searching: 'Scanning nearby stations…',
}

function SearchOverlay({ phase }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.gaugeWrap}>
        <svg viewBox="0 0 120 70" className={styles.gaugeSvg}>
          <path d="M10 65 A50 50 0 0 1 110 65" className={styles.gaugeTrack} />
          <path d="M10 65 A50 50 0 0 1 110 65" className={styles.gaugeFill} />
        </svg>
        <div className={styles.gaugeNeedle} />
        <div className={styles.gaugeHub} />
      </div>
      <p className={styles.overlayStatus}>{STATUS_COPY[phase] || 'Working on it…'}</p>
      <p className={styles.overlayHint}>Fueling up the results…</p>
    </div>
  )
}

// ── Location-readiness notice — always shown first, before anything else ───
function LocationNoticeModal({ onAcknowledge, balance, balanceLoading }) {
  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
      <div className={styles.modalCard}>
        <div className={styles.modalIcon}>⛽</div>
        <h2 className={styles.modalTitle}>Before you search</h2>
        <p className={styles.modalBody}>
          Petro depends on accurate device location to find filling stations near you. Please
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
function ConsentModal({ onConfirm, onCancel }) {
  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
      <div className={styles.modalCard}>
        <div className={styles.modalIcon}>📍</div>
        <h2 className={styles.modalTitle}>Find fuel near you</h2>
        <p className={styles.modalBody}>
          Petro uses your precise location to find the closest filling stations, along with
          hours, contacts, and directions. Your device will ask you to allow location access.
        </p>
        <div className={styles.priceRow}>
          <span className={styles.priceTag}>$0.2 <span className={styles.priceTagAlt}> ·</span></span>
          <span className={styles.priceLabel}>first search free</span>
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
function StationListItem({ m, onView }) {
  const phone = formatPhone(m)

  return (
    <div className={styles.resultCard}>
      <div className={styles.resultTop}>
        <div className={styles.resultTitleBlock}>
          <p className={styles.resultName}>{m.display_name}</p>
          <div className={styles.resultTags}>
            <span className={styles.typeTag}>{m.label || m.primary_type_name || 'Fuel Station'}</span>
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
          View station →
        </button>
      </div>
    </div>
  )
}

// ── Copy-to-clipboard icon button with inline feedback ──
function CopyButton({ value, fieldKey, copiedKey, onCopy }) {
  const copied = copiedKey === fieldKey
  if (!value) return null
  return (
    <button
      type="button"
      className={styles.copyBtn}
      onClick={() => onCopy(fieldKey, value)}
      aria-label={copied ? 'Copied' : 'Copy'}
    >
      {copied ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="12" height="12" rx="2" />
          <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
        </svg>
      )}
      <span>{copied ? 'Copied' : 'Copy'}</span>
    </button>
  )
}

// ── Row inside an info card: label, value, optional copy ──
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

// ── Full detail page for a single station ──
function StationDetail({ m, onBack }) {
  const phone = formatPhone(m)
  const status = m.business_status
  const tone = statusTone(status)
  const today = todayHoursLine(m.regular_working_hours)
  const [copiedKey, setCopiedKey] = useState(null)

  const handleCopy = useCallback((key, value) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(String(value)).catch(() => {})
    }
    setCopiedKey(key)
    window.setTimeout(() => setCopiedKey(k => (k === key ? null : k)), 1600)
  }, [])

  const address = formattedAddress(m)
  const distanceLabel = formatDistance(m)

  return (
    <div className={styles.detailPage}>
      <button className={styles.detailBack} onClick={onBack}>← Back to results</button>

      {/* ── Hero ── */}
      <div className={styles.detailHero}>
        <div className={styles.detailHeroTop}>
          <div className={styles.detailHeroIcon}><FuelPumpIcon size={30} /></div>
          {tone && (
            <span className={tone === 'good' ? styles.statusDotGood : styles.statusDotBad}>
              <span className={styles.statusDotPip} />
              {status.replaceAll('_', ' ').toLowerCase()}
            </span>
          )}
        </div>

        <h2 className={styles.detailName}>{m.display_name}</h2>

        <div className={styles.resultTags}>
          <span className={styles.typeTag}>{m.label || m.primary_type_name || 'Fuel Station'}</span>
          {m.badge_approved ? (
            <span className={styles.verifiedTag}>✓ Ghostroute Verified</span>
          ) : (
            <span className={styles.unverifiedTag}>Not yet verified</span>
          )}
        </div>

        <div className={styles.detailStatStrip}>
          <div className={styles.detailStat}>
            <span className={styles.detailStatVal}>
              {m.rating != null ? `★ ${m.rating}` : '—'}
            </span>
            <span className={styles.detailStatLabel}>Rating</span>
          </div>
          <div className={styles.detailStatSep} />
          <div className={styles.detailStat}>
            <span className={styles.detailStatVal}>{distanceLabel || '—'}</span>
            <span className={styles.detailStatLabel}>Distance</span>
          </div>
          <div className={styles.detailStatSep} />
          <div className={styles.detailStat}>
            <span className={styles.detailStatVal}>{today || 'Hours vary'}</span>
            <span className={styles.detailStatLabel}>Today</span>
          </div>
        </div>

        <div className={styles.detailActions}>
          {phone && <a className={styles.actionBtn} href={`tel:${phone}`}>📞 Call {phone}</a>}
          <a className={styles.actionBtnPrimary} href={m.maps_url} target="_blank" rel="noopener noreferrer">
            Open in Maps →
          </a>
        </div>
      </div>

      {/* ── Contact & address ── */}
      <div className={styles.detailSection}>
        <p className={styles.detailSectionTitle}>Contact &amp; location</p>

        <InfoRow
          label="Address"
          value={address}
          fieldKey="address"
          copiedKey={copiedKey}
          onCopy={handleCopy}
        />
        {m.short_formatted_address && m.short_formatted_address !== address && (
          <InfoRow
            label="Short address"
            value={m.short_formatted_address}
            fieldKey="shortAddress"
            copiedKey={copiedKey}
            onCopy={handleCopy}
          />
        )}
        {phone ? (
          <InfoRow
            label="Phone"
            value={phone}
            fieldKey="phone"
            copiedKey={copiedKey}
            onCopy={handleCopy}
            mono
          />
        ) : (
          <div className={styles.infoRow}>
            <div className={styles.infoRowText}>
              <p className={styles.infoRowLabel}>Phone</p>
              <p className={styles.infoRowValueMuted}>Not listed — use Maps to reach them</p>
            </div>
          </div>
        )}
        <InfoRow
          label="Timezone"
          value={m.timezone}
          fieldKey="timezone"
          copiedKey={copiedKey}
          onCopy={handleCopy}
        />
      </div>

      {/* ── Classification ── */}
      <div className={styles.detailSection}>
        <p className={styles.detailSectionTitle}>Classification</p>
        <InfoRow label="Label" value={m.label} />
        <InfoRow label="Primary Service" value={m.primary_type_name} />
        <InfoRow label="Service Type" value={m.primary_type} mono />
        <InfoRow
          label="Business status"
          value={status ? status.replaceAll('_', ' ').toLowerCase() : null}
        />

        {Array.isArray(m.types) && m.types.length > 0 && (
          <div className={styles.infoRow}>
            <div className={styles.infoRowText}>
              <p className={styles.infoRowLabel}>Categories</p>
              <div className={styles.resultTags} style={{ marginTop: 6 }}>
                {m.types.map(t => (
                  <span key={t} className={styles.typeTag}>{t.replaceAll('_', ' ')}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Distance ── */}
      <div className={styles.detailSection}>
        <p className={styles.detailSectionTitle}>Distance from you</p>
        <InfoRow label="Kilometers" value={m.distance_km != null ? `${m.distance_km} km` : null} />
        <InfoRow label="Meters" value={m.distance_meters != null ? `${m.distance_meters.toLocaleString()} m` : null} />
      </div>

      {/* ── Opening hours ── */}
      {Array.isArray(m.regular_working_hours) && m.regular_working_hours.length > 0 && (
        <div className={styles.detailSection}>
          <p className={styles.detailSectionTitle}>Opening hours</p>
          <ul className={styles.hoursListFull}>
            {m.regular_working_hours.map(line => {
              const [day, ...rest] = line.split(': ')
              const isToday = DAY_NAMES[new Date().getDay()] === day
              return (
                <li key={line} className={isToday ? styles.hoursRowToday : styles.hoursRow}>
                  <span>{day}</span>
                  <span>{rest.join(': ')}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

// ── Results screen ──
function ResultsView({ results, meta, onClose }) {
  const [selected, setSelected] = useState(null)
  const [showAll, setShowAll] = useState(false)
  const { nearby, far } = useMemo(() => splitByDistance(results), [results])
  const visible = showAll ? results : nearby
  const free = meta?.free

  if (selected) {
    return <StationDetail m={selected} onBack={() => setSelected(null)} />
  }

  return (
    <div className={styles.resultsPage}>
      <div className={styles.resultsHeader}>
        <div>
          <h2 className={styles.resultsTitle}>{visible.length} filling stations nearby</h2>
          <p className={styles.resultsSub}>⛽ Sorted by distance, closest to you.</p>
        </div>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close results">✕</button>
      </div>

      <div className={free ? styles.freeBanner : styles.paidBanner}>
        {free
          ? (meta?.message || 'This search was free — no charge applied.')
          : `This search has been charged at $${meta?.charge} ~ ₦${meta?.naira}.`}
      </div>

      <div className={styles.resultsList}>
        {visible.map(m => <StationListItem key={m.maps_url} m={m} onView={setSelected} />)}
      </div>

      {!showAll && far.length > 0 && (
        <button className={styles.showMoreBtn} onClick={() => setShowAll(true)}>
          Show {far.length} more {far.length === 1 ? 'station' : 'stations'} farther away
        </button>
      )}

      <button className={styles.newSearchBtn} onClick={onClose}>
        Start a new search
      </button>
    </div>
  )
}

// ── Main page ──
export default function Petro() {
  usePageTitle('Petro — Ghostroute')
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
      const init = await initializePetroSearch(token, latitude, longitude)

      setPhase('searching')
      const started = await startPetroSearch(token, init.search_id, latitude, longitude)

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
          <div className={styles.heroStripes} aria-hidden="true" />

          <button
            className={styles.logoTapTarget}
            onClick={openConsent}
            aria-label="Tap to find filling stations near you"
          >
            <span className={styles.tapRing} />
            <span className={styles.tapRing} style={{ animationDelay: '0.9s' }} />
            <div className={styles.logoInner}>
              <FuelPumpIcon size={72} />
            </div>
          </button>

          <p className={styles.heroTitle}>Petro</p>
          <p className={styles.heroSub}>Tap the pump to find fuel &amp; gas stations near you</p>

          <button className={styles.priceBtn} onClick={openConsent}>
            <span className={styles.priceBtnDivider}>.</span>$0.2 / search <span className={styles.priceBtnDivider}>·</span>
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
