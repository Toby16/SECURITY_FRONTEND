import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearToken, getToken } from '../../services/authService.js'
import { getUserProfile } from '../../services/authService.js'
import { useTokenRefresh } from '../../hooks/useTokenRefresh.js'
import { useAuthGuard } from '../../hooks/useAuthGuard.js'
import styles from './IPLookupCategory.module.css'

function usePageTitle(t) { useEffect(() => { document.title = t }, [t]) }

function GhostIPLogo({ size = 120, animated = true }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 120 120"
      fill="none" xmlns="http://www.w3.org/2000/svg"
      className={animated ? styles.logoAnimated : ''}
    >
      <rect x="0" y="0" width="120" height="120" rx="26" fill="#0d1117" />
      <circle cx="60" cy="60" r="29" stroke="#22c7e0" strokeWidth="4" />
      <line x1="60" y1="47" x2="60" y2="70" stroke="#22c7e0" strokeWidth="5" strokeLinecap="round" />
      <line x1="50" y1="55" x2="70" y2="55" stroke="#22c7e0" strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}

const FIELD_META = {
  asn:                        { label: 'ASN',                         cat: 'Network',  icon: '⬡' },
  hostname:                   { label: 'Hostname',                    cat: 'Network',  icon: '⬡' },
  city:                       { label: 'City',                        cat: 'Location', icon: '◎' },
  region:                     { label: 'Region',                      cat: 'Location', icon: '◎' },
  country:                    { label: 'Country',                     cat: 'Location', icon: '◎' },
  country_name:               { label: 'Country Name',                cat: 'Location', icon: '◎' },
  latitude:                   { label: 'Latitude',                    cat: 'Location', icon: '◎' },
  longitude:                  { label: 'Longitude',                   cat: 'Location', icon: '◎' },
  organization:               { label: 'Organization',                cat: 'Network',  icon: '⬡' },
  timezone:                   { label: 'Timezone',                    cat: 'Location', icon: '◎' },
  continent:                  { label: 'Continent',                   cat: 'Location', icon: '◎' },
  continent_name:             { label: 'Continent Name',              cat: 'Location', icon: '◎' },
  ip_version:                 { label: 'IP Version',                  cat: 'Network',  icon: '⬡' },
  country_alpha_3:            { label: 'Country Alpha-3',             cat: 'Country',  icon: '⊞' },
  postal_code:                { label: 'Postal Code',                 cat: 'Location', icon: '◎' },
  country_currency_code:      { label: 'Country Currency Code',       cat: 'Country',  icon: '⊞' },
  country_currency_symbol:    { label: 'Country Currency Symbol',     cat: 'Country',  icon: '⊞' },
  european_union_member:      { label: 'EU Member?',                  cat: 'Country',  icon: '⊞' },
  country_current_time:       { label: 'Country Local Time',          cat: 'Time',     icon: '◷' },
  country_current_time_24hr:  { label: 'Country Local Time (24hr)',   cat: 'Time',     icon: '◷' },
  country_current_time_12hr:  { label: 'Country Local Time (12hr)',   cat: 'Time',     icon: '◷' },
  country_current_time_iso:   { label: 'Country Local Time (ISO)',    cat: 'Time',     icon: '◷' },
  country_flag_icon:          { label: 'Country Flag Icon',           cat: 'Country',  icon: '⊞' },
  network_status:             { label: 'Network Status',              cat: 'Network',  icon: '⬡' },
  network_range:              { label: 'Network Range',               cat: 'Network',  icon: '⬡' },
  network_start_address:      { label: 'Network Start Address',       cat: 'Network',  icon: '⬡' },
  network_end_address:        { label: 'Network End Address',         cat: 'Network',  icon: '⬡' },
  network_registration:       { label: 'Network Registered',          cat: 'Network',  icon: '⬡' },
  network_last_changed:       { label: 'Network Last Changed',        cat: 'Network',  icon: '⬡' },
  contact_email:              { label: 'Contact Email',               cat: 'Contact',  icon: '✉' },
  contact_phone:              { label: 'Contact Phone',               cat: 'Contact',  icon: '✉' },
  contact_address:            { label: 'Contact Address',             cat: 'Contact',  icon: '✉' },
  is_tor:                     { label: 'TOR Exit Node?',              cat: 'Threat',   icon: '⚑' },
  is_blacklisted:             { label: 'Is Blacklisted?',             cat: 'Threat',   icon: '⚑' },
  threat_score:               { label: 'Threat Score',                cat: 'Threat',   icon: '⚑' },
  language:                   { label: 'Language',                    cat: 'Country',  icon: '⊞' },
  mobile_calling_code:        { label: 'Country Mobile Calling Code', cat: 'Country',  icon: '⊞' },
  tld:                        { label: 'TLD',                         cat: 'Country',  icon: '⊞' },
  fifa:                       { label: 'FIFA Country Code',           cat: 'Country',  icon: '⊞' },
  maps:                       { label: 'Map Link',                    cat: 'Location', icon: '◎' },
  population:                 { label: 'Population',                  cat: 'Country',  icon: '⊞' },
}

const CAT_COLORS = {
  Network:  { bg: 'rgba(56,189,248,0.08)',  border: 'rgba(56,189,248,0.25)',  text: '#38bdf8' },
  Location: { bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.25)', text: '#a78bfa' },
  Country:  { bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.25)',  text: '#fbbf24' },
  Time:     { bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.25)',  text: '#34d399' },
  Contact:  { bg: 'rgba(251,113,133,0.08)', border: 'rgba(251,113,133,0.25)', text: '#fb7185' },
  Threat:   { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)',   text: '#ef4444' },
}

const DISPLAY_CATEGORIES = ['Network', 'Location', 'Country', 'Time', 'Contact', 'Threat']

// ─── FIX: Only skip truly absent values (null/undefined), never skip false.
// false is valid data (e.g. is_blacklisted=false means "clean" — show it).
function isAbsent(val) {
  return val === null || val === undefined
}

function formatValue(key, val) {
  if (isAbsent(val)) return null
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  if (key === 'population') return Number(val).toLocaleString()
  if (key === 'country_flag_icon') return null   // rendered as <img>, not text
  if (key === 'maps') return null                // rendered as <a>, not text
  const str = String(val)
  if (str.trim() === '') return null
  return str
}

function isValidIP(ip) {
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/
  const ipv6 = /^[0-9a-fA-F:]+$/
  return ipv4.test(ip) || ipv6.test(ip)
}

// ─── Category Card ────────────────────────────────────────────────────────────
function CategoryCard({ entry, isSelected, onClick }) {
  const isFree = entry.dollar_price_per_day === 0
  const fieldCount = entry.keys?.length ?? 0

  return (
    <div
      className={`${styles.catCard} ${isSelected ? styles.catCardSelected : ''}`}
      onClick={onClick}
    >
      <div className={styles.catCardTop}>
        <div className={styles.catCardLeft}>
          <span className={styles.catCardStatus}>● Active</span>
          <code className={styles.catCardId}>{entry.category_id}</code>
        </div>
        {entry.auto_renew && (
          <span className={styles.catCardAutoRenew}>↺ Auto</span>
        )}
      </div>

      <div className={styles.catCardMeta}>
        <div className={styles.catCardStat}>
          <span className={styles.catCardStatNum}>{fieldCount}</span>
          <span className={styles.catCardStatLabel}>field{fieldCount !== 1 ? 's' : ''}</span>
        </div>
        <div className={styles.catCardStatDiv} />
        <div className={styles.catCardStat}>
          {isFree
            ? <span className={styles.catCardFree}>FREE</span>
            : <span className={styles.catCardPrice}>${entry.dollar_price_per_day.toFixed(2)}<span className={styles.catCardPriceUnit}>/day</span></span>
          }
          <span className={styles.catCardStatLabel}>cost</span>
        </div>
        <div className={styles.catCardStatDiv} />
        <div className={styles.catCardStat}>
          <span className={styles.catCardStatNum}>{entry.days_left}</span>
          <span className={styles.catCardStatLabel}>days left</span>
        </div>
      </div>

      {entry.keys?.length > 0 && (
        <div className={styles.catCardFields}>
          {entry.keys.slice(0, 4).map(k => (
            <span key={k} className={styles.catCardPill}>{FIELD_META[k]?.label ?? k}</span>
          ))}
          {entry.keys.length > 4 && (
            <span className={styles.catCardPillMore}>+{entry.keys.length - 4} more</span>
          )}
        </div>
      )}

      {isSelected && <div className={styles.catCardSelectedIndicator} />}
    </div>
  )
}

// ─── Result Panel ─────────────────────────────────────────────────────────────
function ResultPanel({ result, loading, error, ipQueried }) {
  if (loading) return (
    <div className={styles.resultLoading}>
      <div className={styles.radarWrap}>
        <div className={styles.radarRing} />
        <div className={styles.radarRing2} />
        <div className={styles.radarSweep} />
        <div className={styles.radarDot} />
      </div>
      <p className={styles.resultLoadingText}>Scanning <strong>{ipQueried}</strong>…</p>
    </div>
  )

  if (error) return (
    <div className={styles.resultError}>
      <span>⚠</span> {error}
    </div>
  )

  if (!result) return (
    <div className={styles.resultEmpty}>
      <div className={styles.resultEmptyIcon}>◎</div>
      <p className={styles.resultEmptyTitle}>No results yet</p>
      <p className={styles.resultEmptyHint}>Select a category and enter an IP address to begin scanning</p>
    </div>
  )

  const d = result
  const threatNum = parseInt(String(d.threat_score ?? '').replace('%', '')) || 0
  const threatColor = threatNum < 30 ? '#34d399' : threatNum < 60 ? '#fbbf24' : '#ef4444'

  // ─── FIX: A field is "present" if the API returned it (key exists in d),
  // even when the value is false/0/empty-string. Only skip null/undefined.
  // This means is_blacklisted=false ("clean") and is_tor=false ("not TOR") both render.
  const fieldsByCategory = {}
  Object.entries(d).forEach(([key, val]) => {
    if (!FIELD_META[key]) return
    if (isAbsent(val)) return           // skip only truly missing values
    const cat = FIELD_META[key].cat
    if (!fieldsByCategory[cat]) fieldsByCategory[cat] = []
    fieldsByCategory[cat].push([key, val])
  })

  // Threat summary section: show if ANY threat key came back from the API
  const hasThreatScore     = !isAbsent(d.threat_score)
  const hasTorField        = !isAbsent(d.is_tor)
  const hasBlacklistField  = !isAbsent(d.is_blacklisted)
  const hasNetworkStatus   = !isAbsent(d.network_status)
  const hasThreat = hasThreatScore || hasTorField || hasBlacklistField

  const hasFlag = d.country_flag_icon && !isAbsent(d.country_flag_icon)

  return (
    <div className={styles.resultPanel}>
      <div className={styles.resultHeader}>
        <div className={styles.resultIPBadge}>
          <span className={styles.resultIPDot} />
          <span className={styles.resultIPText}>{d.ip_address}</span>
          {!isAbsent(d.ip_version) && (
            <span className={styles.resultIPVersion}>{String(d.ip_version).toUpperCase()}</span>
          )}
        </div>
        {hasFlag && (
          <img src={d.country_flag_icon} alt={d.country_name || ''} className={styles.resultFlag} />
        )}
      </div>

      {hasThreat && (
        <div className={styles.threatWrap}>
          {hasThreatScore && (
            <>
              <div className={styles.threatHeader}>
                <span className={styles.threatLabel}>Threat Score</span>
                <span className={styles.threatVal} style={{ color: threatColor }}>{d.threat_score}</span>
              </div>
              <div className={styles.threatBar}>
                <div className={styles.threatFill} style={{ width: d.threat_score, background: threatColor }} />
              </div>
            </>
          )}
          <div className={styles.threatBadges}>
            {hasTorField && (
              <span className={`${styles.threatBadge} ${d.is_tor ? styles.threatBadgeDanger : styles.threatBadgeSafe}`}>
                {d.is_tor ? '● TOR Exit Node' : '○ No TOR'}
              </span>
            )}
            {hasBlacklistField && (
              <span className={`${styles.threatBadge} ${d.is_blacklisted ? styles.threatBadgeDanger : styles.threatBadgeSafe}`}>
                {d.is_blacklisted ? '● Blacklisted' : '○ Clean'}
              </span>
            )}
            {hasNetworkStatus && (
              <span className={`${styles.threatBadge} ${styles.threatBadgeSafe}`}>● {d.network_status}</span>
            )}
          </div>
        </div>
      )}

      <div className={styles.resultFields}>
        {DISPLAY_CATEGORIES.map(cat => {
          const fields = fieldsByCategory[cat]
          if (!fields || fields.length === 0) return null
          return (
            <div key={cat} className={styles.resultCatGroup}>
              <div className={styles.resultCatLabel} style={{ color: CAT_COLORS[cat]?.text }}>
                {FIELD_META[Object.keys(FIELD_META).find(k => FIELD_META[k].cat === cat)]?.icon} {cat}
              </div>
              {fields.map(([key, val]) => {
                if (key === 'country_flag_icon') return null
                if (key === 'ip_address') return null
                if (key === 'maps') return (
                  <div key={key} className={styles.resultRow}>
                    <span className={styles.resultRowKey}>{FIELD_META[key]?.label ?? key}</span>
                    <a href={val} target="_blank" rel="noreferrer" className={styles.resultLink}>View Map ↗</a>
                  </div>
                )
                const formatted = formatValue(key, val)
                if (formatted === null) return null
                return (
                  <div key={key} className={styles.resultRow}>
                    <span className={styles.resultRowKey}>{FIELD_META[key]?.label ?? key}</span>
                    <span className={styles.resultRowVal}>{formatted}</span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      <div className={styles.resultDisclaimer}>
        <span>🔒</span> Data shown is limited to fields in your subscription.
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function IPLookupCategory() {
  usePageTitle('SCANORACLE — IP Lookup Categories | Ghostroute')
  useAuthGuard()
  useTokenRefresh()
  const navigate = useNavigate()

  const tokenRef = useRef(getToken())
  const token = tokenRef.current

  const [user, setUser] = useState(null)
  const [categories, setCategories] = useState([])
  const [catsLoading, setCatsLoading] = useState(true)
  const [catsError, setCatsError] = useState(null)

  const [selectedCat, setSelectedCat] = useState(null)
  const [ipInput, setIpInput] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [scanError, setScanError] = useState(null)
  const [ipQueried, setIpQueried] = useState('')
  const [inputError, setInputError] = useState('')

  useEffect(() => {
    if (!token) return
    getUserProfile(token).then(r => setUser(r.user)).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token) { setCatsLoading(false); return }
    setCatsLoading(true)
    setCatsError(null)
    fetch('https://security.appcardy.com/api/v1.0/scanoracle/get/categories/ip', {
      headers: { 'accept': 'application/json', 'Authorization': `Bearer ${token}` },
    })
      .then(r => {
        if (!r.ok) throw new Error(`Server error (${r.status})`)
        return r.json()
      })
      .then(json => {
        const paid = (json?.data ?? []).filter(e => e.transaction_status === true)
        setCategories(paid)
        setCatsLoading(false)
      })
      .catch(e => { setCatsError(e.message); setCatsLoading(false) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleScan = async () => {
    setInputError('')
    if (!selectedCat) { setInputError('Please select a category first.'); return }
    const ip = ipInput.trim()
    if (!ip) { setInputError('Enter an IP address.'); return }
    if (!isValidIP(ip)) { setInputError('Enter a valid IPv4 or IPv6 address.'); return }

    setScanning(true); setScanResult(null); setScanError(null)
    setIpQueried(ip)
    try {
      const res = await fetch('https://security.appcardy.com/api/v1.0/scanoracle/ip/info/category/id/', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category_id: selectedCat.category_id, ip_address: ip }),
      })
      const json = await res.json()
      if (!res.ok) {
        const detail = json.detail
        const msg =
          (typeof detail === 'string' ? detail : detail?.message || detail?.error) ||
          json.message ||
          'Lookup failed.'
        throw new Error(msg)
      }
      setScanResult(json.data)
    } catch (e) { setScanError(e.message) }
    finally { setScanning(false) }
  }

  const handleLogout = () => { clearToken(); navigate('/auth') }

  return (
    <div className={styles.page}>
      <div className={styles.bgGrid} aria-hidden="true" />
      <div className={styles.bgGlow1} aria-hidden="true" />
      <div className={styles.bgGlow2} aria-hidden="true" />

      <nav className={styles.nav}>
        <div className={styles.navLeft}>
          <button className={styles.navBack} onClick={() => navigate('/')}>
            <svg viewBox="0 0 16 16" fill="currentColor" width="11" height="11">
              <path d="M7.78 12.53a.75.75 0 01-1.06 0L2.47 8.28a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 1.06L4.81 7h7.44a.75.75 0 010 1.5H4.81l2.97 2.97a.75.75 0 010 1.06z" />
            </svg>
            Dashboard
          </button>
          <div className={styles.navSep} />
          <button className={styles.navBack} onClick={() => navigate('/scanoracle/iplookup')}>
            <svg viewBox="0 0 16 16" fill="currentColor" width="11" height="11">
              <path d="M7.78 12.53a.75.75 0 01-1.06 0L2.47 8.28a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 1.06L4.81 7h7.44a.75.75 0 010 1.5H4.81l2.97 2.97a.75.75 0 010 1.06z" />
            </svg>
            IP Lookup 🛰️
          </button>
          <div className={styles.navSep} />
          <div className={styles.navBrand}>
            <GhostIPLogo size={28} animated={false} />
            <span className={styles.navBrandText}><span className={styles.navAccent}>SCAN</span>ORACLE</span>
            <span className={styles.navPill}>Category</span>
          </div>
        </div>
        <div className={styles.navRight}>
          <div className={styles.navBalances}>
            <div className={styles.navBal}>
              <span className={styles.navBalCurr}>₦</span>
              <span className={styles.navBalAmt}>{(user?.naira_balance ?? 0).toLocaleString()}</span>
              <span className={styles.navBalLbl}>NGN</span>
            </div>
            <div className={styles.navBalDiv} />
            <div className={styles.navBal}>
              <span className={styles.navBalCurr}>$</span>
              <span className={styles.navBalAmt}>{(user?.dollar_balance ?? 0).toLocaleString()}</span>
              <span className={styles.navBalLbl}>USD</span>
            </div>
          </div>
          <button className={styles.signOutBtn} onClick={handleLogout}>Sign out</button>
        </div>
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroLogo}>
          <GhostIPLogo size={72} animated={true} />
        </div>
        <div className={styles.heroText}>
          <h1 className={styles.heroTitle}><span className={styles.heroAccent}>SCAN</span>ORACLE</h1>
          <p className={styles.heroSub}>Test your subscribed IP data packages 🔬</p>
        </div>
        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <span className={styles.heroStatNum}>{categories.length}</span>
            <span className={styles.heroStatLabel}>Active Plans 🎯</span>
          </div>
          <div className={styles.heroStatDiv} />
          <div className={styles.heroStat}>
            <span className={styles.heroStatNum}>Live</span>
            <span className={styles.heroStatLabel}>Real-Time ✔️</span>
          </div>
        </div>
      </header>

      <main className={styles.mainLayout}>
        <div className={styles.leftCol}>
          <div className={styles.sectionLabel}>
            <span className={styles.sectionLabelDot} style={{ background: '#a78bfa' }} />
            Select a Subscription
          </div>

          {/* FIX: removed max-height cap on the wrapper — scroll is on catList itself */}
          <div className={styles.catList}>
            {catsLoading && (
              <div className={styles.catsLoading}>
                <div className={styles.spinner} />
                <span>Loading subscriptions…</span>
              </div>
            )}
            {catsError && (
              <div className={styles.catsError}><span>⚠</span> {catsError}</div>
            )}
            {!catsLoading && !catsError && categories.length === 0 && (
              <div className={styles.catsEmpty}>
                <span className={styles.catsEmptyIcon}>⊘</span>
                <p>No active subscriptions found.</p>
                <button className={styles.catsEmptyBtn} onClick={() => navigate('/scanoracle/iplookup')}>
                  Buy a Subscription →
                </button>
              </div>
            )}
            {!catsLoading && !catsError && categories.map(entry => (
              <CategoryCard
                key={entry.category_id}
                entry={entry}
                isSelected={selectedCat?.category_id === entry.category_id}
                onClick={() => {
                  setSelectedCat(entry)
                  setScanResult(null)
                  setScanError(null)
                  setInputError('')
                }}
              />
            ))}
          </div>

          <div className={styles.sectionLabel} style={{ marginTop: 8 }}>
            <span className={styles.sectionLabelDot} style={{ background: '#38bdf8' }} />
            Enter IP Address
          </div>

          <div className={styles.inputCard}>
            {selectedCat ? (
              <div className={styles.selectedCatBadge}>
                <span className={styles.selectedCatDot} />
                <span className={styles.selectedCatId}>{selectedCat.category_id}</span>
                <span className={styles.selectedCatCount}>{selectedCat.keys?.length ?? 0} fields</span>
              </div>
            ) : (
              <div className={styles.noSelectionHint}>← Select a subscription above first</div>
            )}

            <div className={styles.ipInputRow}>
              <input
                className={`${styles.ipInput} ${inputError ? styles.ipInputError : ''}`}
                type="text"
                placeholder="e.g. 185.67.82.114"
                value={ipInput}
                onChange={e => { setIpInput(e.target.value); setInputError('') }}
                onKeyDown={e => e.key === 'Enter' && handleScan()}
                spellCheck={false}
              />
              <button
                className={`${styles.scanBtn} ${(!selectedCat || scanning) ? styles.scanBtnDisabled : ''}`}
                onClick={handleScan}
                disabled={!selectedCat || scanning}
              >
                {scanning
                  ? <><span className={styles.btnSpinner} />Scanning…</>
                  : <>⊛ Scan IP</>
                }
              </button>
            </div>

            {inputError && (
              <div className={styles.inputErrorMsg}><span>⚠</span> {inputError}</div>
            )}

            <p className={styles.inputHint}>
              Results will only include data fields in your selected subscription.
            </p>
          </div>
        </div>

        <div className={styles.rightCol}>
          <div className={styles.sectionLabel}>
            <span className={styles.sectionLabelDot} style={{ background: '#38bdf8' }} />
            Scan Results
            {scanResult && ipQueried && (
              <span className={styles.sectionLabelBadge}>
                <span className={styles.liveDot} /> {ipQueried}
              </span>
            )}
          </div>

          <ResultPanel
            result={scanResult}
            loading={scanning}
            error={scanError}
            ipQueried={ipQueried}
          />
        </div>
      </main>

      <footer className={styles.footer}>
        ScanOracle™ — <span className={styles.footerAccent}>Ghostroute</span> Security™ — {new Date().getFullYear()} 📡
      </footer>
    </div>
  )
}
