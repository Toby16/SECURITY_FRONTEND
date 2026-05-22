import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearToken, getToken } from '../../services/authService.js'
import { getUserProfile } from '../../services/authService.js'
import { useTokenRefresh } from '../../hooks/useTokenRefresh.js'
import { useAuthGuard } from '../../hooks/useAuthGuard.js'
import styles from './IPLookup.module.css'

function usePageTitle(t) { useEffect(() => { document.title = t }, [t]) }

// ─────────────────────────────────────────────────────────────────────────────
// Exact match to the first image — Soft glowing blue circle
// ─────────────────────────────────────────────────────────────────────────────
function GhostIPLogo({ size = 120, animated = true }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 120 120" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={animated ? styles.logoAnimated : ''}
    >
      {/* Dark rounded square background */}
      <rect 
        x="12" 
        y="12" 
        width="96" 
        height="96" 
        rx="28" 
        fill="#0f172a" 
        stroke="#1e2937" 
        strokeWidth="9"
      />

      {/* Large outer soft glow */}
      <circle 
        cx="60" 
        cy="60" 
        r="41" 
        fill="none" 
        stroke="#22d3ee" 
        strokeWidth="11" 
        strokeOpacity="0.25"
        className={animated ? styles.outerGlow : ''}
      />

      {/* Main bright cyan ring */}
      <circle 
        cx="60" 
        cy="60" 
        r="34" 
        fill="none" 
        stroke="#67e8f9" 
        strokeWidth="6.5"
        className={animated ? styles.mainRing : ''}
      />

      {/* Inner soft glow ring */}
      <circle 
        cx="60" 
        cy="60" 
        r="26" 
        fill="none" 
        stroke="#a5f3fc" 
        strokeWidth="4" 
        strokeOpacity="0.75"
      />

      {/* Very subtle inner circle */}
      <circle 
        cx="60" 
        cy="60" 
        r="14" 
        fill="none" 
        stroke="#e0f2fe" 
        strokeWidth="3" 
        strokeOpacity="0.9"
      />

      {/* Center bright dot */}
      <circle 
        cx="60" 
        cy="60" 
        r="4.5" 
        fill="#e0f2fe"
        className={animated ? styles.dotPulse : ''}
      />
    </svg>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Data field metadata — maps each API key to display label + category
// ─────────────────────────────────────────────────────────────────────────────
const FIELD_META = {
  asn:                     { label: 'ASN',                    cat: 'Network',   icon: '⬡' },
  hostname:                { label: 'Hostname',               cat: 'Network',   icon: '⬡' },
  city:                    { label: 'City',                   cat: 'Location',  icon: '◎' },
  region:                  { label: 'Region',                 cat: 'Location',  icon: '◎' },
  country:                 { label: 'Country Code',           cat: 'Location',  icon: '◎' },
  country_name:            { label: 'Country Name',           cat: 'Location',  icon: '◎' },
  latitude:                { label: 'Latitude',               cat: 'Location',  icon: '◎' },
  longitude:               { label: 'Longitude',              cat: 'Location',  icon: '◎' },
  organization:            { label: 'Organization',           cat: 'Network',   icon: '⬡' },
  timezone:                { label: 'Timezone',               cat: 'Location',  icon: '◎' },
  continent:               { label: 'Continent Code',         cat: 'Location',  icon: '◎' },
  continent_name:          { label: 'Continent Name',         cat: 'Location',  icon: '◎' },
  ip_version:              { label: 'IP Version',             cat: 'Network',   icon: '⬡' },
  country_alpha_3:         { label: 'Alpha-3 Code',           cat: 'Country',   icon: '⊞' },
  postal_code:             { label: 'Postal Code',            cat: 'Location',  icon: '◎' },
  country_currency_code:   { label: 'Currency Code',          cat: 'Country',   icon: '⊞' },
  country_currency_symbol:{ label: 'Currency Symbol',         cat: 'Country',   icon: '⊞' },
  european_union_member:  { label: 'EU Member',               cat: 'Country',   icon: '⊞' },
  country_current_time:   { label: 'Local Time',              cat: 'Time',      icon: '◷' },
  country_current_time_24hr:{ label: 'Time (24hr)',           cat: 'Time',      icon: '◷' },
  country_current_time_12hr:{ label: 'Time (12hr)',           cat: 'Time',      icon: '◷' },
  country_current_time_iso: { label: 'Time (ISO)',            cat: 'Time',      icon: '◷' },
  country_flag_icon:      { label: 'Flag Icon URL',           cat: 'Country',   icon: '⊞' },
  network_status:          { label: 'Network Status',          cat: 'Network',   icon: '⬡' },
  network_range:           { label: 'Network Range',           cat: 'Network',   icon: '⬡' },
  network_start_address:  { label: 'Range Start',             cat: 'Network',   icon: '⬡' },
  network_end_address:    { label: 'Range End',               cat: 'Network',   icon: '⬡' },
  network_registration:   { label: 'Registered',              cat: 'Network',   icon: '⬡' },
  network_last_changed:   { label: 'Last Changed',            cat: 'Network',   icon: '⬡' },
  contact_email:          { label: 'Contact Email',           cat: 'Contact',   icon: '✉' },
  contact_phone:          { label: 'Contact Phone',           cat: 'Contact',   icon: '✉' },
  contact_address:        { label: 'Contact Address',         cat: 'Contact',   icon: '✉' },
  is_tor:                  { label: 'TOR Exit Node',           cat: 'Threat',    icon: '⚑' },
  is_blacklisted:          { label: 'Blacklisted',             cat: 'Threat',    icon: '⚑' },
  threat_score:            { label: 'Threat Score',            cat: 'Threat',    icon: '⚑' },
  language:                { label: 'Language',                cat: 'Country',   icon: '⊞' },
  mobile_calling_code:     { label: 'Calling Code',            cat: 'Country',   icon: '⊞' },
  tld:                     { label: 'TLD',                     cat: 'Country',   icon: '' },
  fifa:                    { label: 'FIFA Code',               cat: 'Country',   icon: '' },
  population:              { label: 'Population',              cat: 'Country',   icon: '' },
  maps:                    { label: 'Maps Link',               cat: 'Location',  icon: '◎' },
}

// Added 'All' option dynamically inside categories map list
const CATEGORIES = ['All', 'Network', 'Location', 'Country', 'Time', 'Contact', 'Threat']
const CAT_COLORS = {
  All:      { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.15)', text: '#e2e8f0' },
  Network:  { bg: 'rgba(56,189,248,0.08)',  border: 'rgba(56,189,248,0.25)',  text: '#38bdf8' },
  Location: { bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.25)', text: '#a78bfa' },
  Country:  { bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.25)',  text: '#fbbf24' },
  Time:     { bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.25)',  text: '#34d399' },
  Contact:  { bg: 'rgba(251,113,133,0.08)', border: 'rgba(251,113,133,0.25)', text: '#fb7185' },
  Threat:   { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)',   text: '#ef4444' },
}

function formatValue(key, val) {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  if (key === 'population') return Number(val).toLocaleString()
  if (key === 'country_flag_icon') return null 
  if (key === 'maps') return null 
  return String(val)
}

// ─────────────────────────────────────────────────────────────────────────────
// Live IP Result Panel (right side)
// ─────────────────────────────────────────────────────────────────────────────
function LiveIPPanel({ data, loading, error }) {
  if (loading) return (
    <div className={styles.liveLoading}>
      <div className={styles.radarWrap}>
        <div className={styles.radarRing} />
        <div className={styles.radarRing2} />
        <div className={styles.radarSweep} />
        <div className={styles.radarDot} />
      </div>
      <p className={styles.liveLoadingText}>Scanning your IP…</p>
    </div>
  )

  if (error) return (
    <div className={styles.liveError}>
      <span>⚠</span> {error}
    </div>
  )

  if (!data) return null

  const d = data.data
  const threatNum = parseInt(d.threat_score) || 0
  const threatColor = threatNum < 30 ? '#34d399' : threatNum < 60 ? '#fbbf24' : '#ef4444'

  // Standard static categories for grouping results on the right side lookup panel
  const DISPLAY_CATEGORIES = ['Network', 'Location', 'Country', 'Time', 'Contact', 'Threat']

  return (
    <div className={styles.livePanel}>
      {/* Header row */}
      <div className={styles.livePanelHeader}>
        <div className={styles.liveIPBadge}>
          <span className={styles.liveIPDot} />
          <span className={styles.liveIPText}>{d.ip_address}</span>
          <span className={styles.liveIPVersion}>{d.ip_version?.toUpperCase()}</span>
        </div>
        {d.country_flag_icon && (
          <img src={d.country_flag_icon} alt={d.country_name} className={styles.liveFlag} />
        )}
      </div>

      {/* Threat bar */}
      <div className={styles.threatWrap}>
        <div className={styles.threatHeader}>
          <span className={styles.threatLabel}>Threat Score</span>
          <span className={styles.threatVal} style={{ color: threatColor }}>{d.threat_score}</span>
        </div>
        <div className={styles.threatBar}>
          <div
            className={styles.threatFill}
            style={{ width: d.threat_score, background: threatColor }}
          />
        </div>
        <div className={styles.threatBadges}>
          <span className={`${styles.threatBadge} ${d.is_tor ? styles.threatBadgeDanger : styles.threatBadgeSafe}`}>
            {d.is_tor ? '● TOR' : '○ No TOR'}
          </span>
          <span className={`${styles.threatBadge} ${d.is_blacklisted ? styles.threatBadgeDanger : styles.threatBadgeSafe}`}>
            {d.is_blacklisted ? '● Blacklisted' : '○ Clean'}
          </span>
          <span className={`${styles.threatBadge} ${styles.threatBadgeSafe}`}>
            ● {d.network_status}
          </span>
        </div>
      </div>

      {/* Grouped data fields */}
      <div className={styles.liveFields}>
        {DISPLAY_CATEGORIES.map(cat => {
          const fields = Object.entries(FIELD_META).filter(([, m]) => m.cat === cat)
          return (
            <div key={cat} className={styles.liveCatGroup}>
              <div className={styles.liveCatLabel} style={{ color: CAT_COLORS[cat].text }}>
                {FIELD_META[Object.keys(FIELD_META).find(k => FIELD_META[k].cat === cat)].icon} {cat}
              </div>
              {fields.map(([key, meta]) => {
                const raw = d[key]
                if (raw === undefined) return null
                if (key === 'country_flag_icon') return null
                if (key === 'maps') return (
                  <div key={key} className={styles.liveRow}>
                    <span className={styles.liveRowKey}>{meta.label}</span>
                    <a href={raw} target="_blank" rel="noreferrer" className={styles.liveLink}>
                      View Map ↗
                    </a>
                  </div>
                )
                return (
                  <div key={key} className={styles.liveRow}>
                    <span className={styles.liveRowKey}>{meta.label}</span>
                    <span className={styles.liveRowVal}>{formatValue(key, raw)}</span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      <div className={styles.liveDisclaimer}>
        <span>🔒</span> This is a live scan of your current IP — demonstrating real-time accuracy.
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Data Selector Panel (left side)
// ─────────────────────────────────────────────────────────────────────────────
function DataSelectorPanel({ lookups, lookupsLoading, lookupsError, token, onPurchaseSuccess, userBalances }) {
  const [selected, setSelected] = useState({})
  const [daysFor, setDaysFor] = useState(30)
  const [autoRenew, setAutoRenew] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [txId, setTxId] = useState(null)
  const [activeTab, setActiveTab] = useState('All') // Changed default state to 'All'

  // Safe Checkbox state initializer loop
  useEffect(() => {
    const init = {}
    Object.keys(FIELD_META).forEach(k => { 
      init[k] = false 
    })
    setSelected(init)
  }, [])

  const toggleField = (key) => {
    setSelected(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const selectAll = () => {
    const next = {}
    Object.keys(FIELD_META).forEach(k => { next[k] = true })
    setSelected(next)
  }

  const clearAll = () => {
    const next = {}
    Object.keys(FIELD_META).forEach(k => { next[k] = false })
    setSelected(next)
  }

  const selectedCount = Object.values(selected).filter(Boolean).length
  const totalFields = Object.keys(FIELD_META).length

  const totalCost = lookups ? Object.entries(selected).reduce((sum, [key, on]) => {
    if (!on) return sum
    const entry = Array.isArray(lookups) ? lookups.find?.(l => l.field_name === key || l.key === key) : null
    if (!entry) return sum
    return sum + (entry.price_per_day || entry.price || 0)
  }, 0) : 0

  const handleSubmit = async () => {
    if (selectedCount === 0) { setSubmitError('Select at least one data field.'); return }
    setSubmitting(true); setSubmitError(null); setTxId(null)
    try {
      const body = { ...selected, days_for: daysFor, auto_renew: autoRenew }
      const res = await fetch('https://security.appcardy.com/api/v1.0/scanoracle/payment/create/ip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'accept': 'application/json',
        },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || json.detail || 'Purchase failed.')
      setTxId(json.data?.transaction_id)
      onPurchaseSuccess?.(json.data)
    } catch (e) {
      setSubmitError(e.message)
    } finally { setSubmitting(false) }
  }

  const getFieldInfo = (key) => {
    if (!lookups || !Array.isArray(lookups)) return null
    return lookups.find?.(l => l.field_name === key || l.key === key || l.name === key) || null
  }

  if (lookupsLoading) {
    return (
      <div className={styles.selectorLoading}>
        <div className={styles.selectorSpinner} />
        <p>Loading data catalog…</p>
      </div>
    )
  }
  // errors are non-fatal — panel renders without pricing if API failed

  if (txId) return (
    <div className={styles.successPanel}>
      <div className={styles.successIcon}>✓</div>
      <h3 className={styles.successTitle}>Purchase Initiated</h3>
      <p className={styles.successSub}>Your data subscription is being activated.</p>
      <div className={styles.successTx}>
        <span className={styles.successTxLabel}>Transaction ID</span>
        <code className={styles.successTxCode}>{txId}</code>
      </div>
      <button className={styles.successReset} onClick={() => { setTxId(null); clearAll() }}>
        Configure New Subscription
      </button>
    </div>
  )

  return (
    <div className={styles.selectorPanel}>
      {/* Header */}
      <div className={styles.selectorHeader}>
        <div className={styles.selectorTitle}>
          <span className={styles.selectorTitleIcon}>⊛</span>
          Build Your Data Package
        </div>
        <div className={styles.selectorCount}>
          <span className={styles.selectorCountNum}>{selectedCount}</span>
          <span className={styles.selectorCountOf}>/ {totalFields} fields</span>
        </div>
      </div>

      {/* Quick actions tabs */}
      <div className={styles.selectorActions}>
        <button className={styles.quickBtn} onClick={selectAll}>Select All</button>
        <button className={styles.quickBtn} onClick={clearAll}>Clear</button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`${styles.quickBtn} ${activeTab === cat ? styles.quickBtnActive : ''}`}
            style={activeTab === cat ? { borderColor: CAT_COLORS[cat].text, color: CAT_COLORS[cat].text } : {}}
            onClick={() => setActiveTab(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Field list Container */}
      <div className={styles.fieldList}>
        {Object.entries(FIELD_META)
          .filter(([, m]) => activeTab === 'All' || m.cat === activeTab)
          .map(([key, meta]) => {
            const info = getFieldInfo(key)
            const isOn = selected[key] || false
            return (
              <label
                key={key}
                className={`${styles.fieldRow} ${isOn ? styles.fieldRowOn : ''}`}
                style={isOn ? {
                  borderColor: CAT_COLORS[meta.cat]?.border || 'rgba(255,255,255,0.2)',
                  background: CAT_COLORS[meta.cat]?.bg || 'transparent'
                } : {}}
              >
                <div className={`${styles.checkbox} ${isOn ? styles.checkboxOn : ''}`}
                  style={isOn ? { background: CAT_COLORS[meta.cat]?.text || '#fff', borderColor: CAT_COLORS[meta.cat]?.text || '#fff' } : {}}>
                  {isOn && <span className={styles.checkmark}>✓</span>}
                </div>
                <input type="checkbox" checked={isOn} onChange={() => toggleField(key)} className={styles.hiddenCheck} />
                <div className={styles.fieldInfo}>
                  <span className={styles.fieldLabel}>
                    {/* Fixed: Removed inline category tag showing beside label name in All view */}
                    {meta.label}
                  </span>
                  {info?.description && (
                    <span className={styles.fieldDesc}>{info.description}</span>
                  )}
                </div>
                {info?.price_per_day !== undefined && (
                  <span className={styles.fieldPrice}>
                    ₦{Number(info.price_per_day).toLocaleString()}<sub>/day</sub>
                  </span>
                )}
                {info?.price !== undefined && !info?.price_per_day && (
                  <span className={styles.fieldPrice}>
                    ₦{Number(info.price).toLocaleString()}<sub>/day</sub>
                  </span>
                )}
              </label>
            )
          })}
      </div>

      {/* Duration + auto-renew */}
      <div className={styles.subscriptionConfig}>
        <div className={styles.configRow}>
          <div className={styles.configLabel}>
            <span className={styles.configIcon}>◷</span>
            Subscription Duration
          </div>
          <div className={styles.daysControl}>
            {[7, 14, 30, 60, 90].map(d => (
              <button
                key={d}
                className={`${styles.dayChip} ${daysFor === d ? styles.dayChipActive : ''}`}
                onClick={() => setDaysFor(d)}
              >
                {d}d
              </button>
            ))}
            <input
              type="number"
              min={1} max={365}
              value={daysFor}
              onChange={e => setDaysFor(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))}
              className={styles.daysInput}
              title="Custom days"
            />
          </div>
        </div>

        <div className={styles.configRow}>
          <div className={styles.configLabel}>
            <span className={styles.configIcon}>↺</span>
            Auto-Renew
            <span className={styles.configHint}>Automatically renews when subscription expires</span>
          </div>
          <button
            className={`${styles.toggle} ${autoRenew ? styles.toggleOn : ''}`}
            onClick={() => setAutoRenew(o => !o)}
            role="switch"
            aria-checked={autoRenew}
          >
            <span className={styles.toggleThumb} />
            <span className={styles.toggleLabel}>{autoRenew ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Cost summary */}
      {selectedCount > 0 && (
        <div className={styles.costSummary}>
          <div className={styles.costRow}>
            <span>Fields selected</span>
            <span>{selectedCount}</span>
          </div>
          <div className={styles.costRow}>
            <span>Duration</span>
            <span>{daysFor} days</span>
          </div>
          {totalCost > 0 && (
            <>
              <div className={styles.costDivider} />
              <div className={`${styles.costRow} ${styles.costTotal}`}>
                <span>Estimated Total</span>
                <span>₦{(totalCost * daysFor).toLocaleString()}</span>
              </div>
            </>
          )}
        </div>
      )}

      {submitError && (
        <div className={styles.submitError}>
          <span>⚠</span> {submitError}
        </div>
      )}

      {/* Purchase button */}
      <button
          className={`${styles.purchaseBtn} ${selectedCount === 0 || submitting ? styles.purchaseBtnDisabled : ''}`}
          onClick={handleSubmit}
          disabled={selectedCount === 0 || submitting}
      >
          {submitting ? (
            <>
              <span className={styles.btnSpinner} />
              Processing…
            </>
          ) : (
            <>
              ⊛ Purchase {selectedCount > 0 ? `${selectedCount} Field${selectedCount > 1 ? 's' : ''}` : 'Data Package'}
              {autoRenew && ' · Auto-Renew'}
          </>
        )}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function IPLookup() {
  usePageTitle('SCANORACLE — IP Lookup | Ghostroute')
  useAuthGuard()
  useTokenRefresh()
  const navigate = useNavigate()

  const [user, setUser]               = useState(null)
  const [liveData, setLiveData]       = useState(null)
  const [liveLoading, setLiveLoading] = useState(true)
  const [liveError, setLiveError]     = useState(null)
  const [lookups, setLookups]         = useState(null)
  const [lookupsLoading, setLookupsLoading] = useState(() => !!getToken())
  const [lookupsError, setLookupsError]     = useState(null)

  const [token, setToken] = useState(() => getToken())

  useEffect(() => {
    const t = getToken()
    if (t !== token) setToken(t)
  }, [])
	
  // Fetch user profile
  useEffect(() => {
    if (!token) return
    getUserProfile(token)
      .then(r => setUser(r.user))
      .catch(() => {})
  }, [token])

  // Fetch live IP data
  useEffect(() => {
    setLiveLoading(true)
    fetch('https://security.appcardy.com/api/v1.0/scanoracle/get/ip_address', {
      headers: { 'accept': 'application/json' }
    })
      .then(r => r.json())
      .then(json => { setLiveData(json); setLiveLoading(false) })
      .catch(e => { setLiveError('Failed to fetch your IP data.'); setLiveLoading(false) })
  }, [])

  // Fetch all_lookups (requires auth)
  useEffect(() => {
    if (!token) {
      setLookupsLoading(false)
      return
    }

    let cancelled = false
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    setLookupsLoading(true)

    fetch('https://security.appcardy.com/api/v1.0/scanoracle/get/all_lookups', {
      signal: controller.signal,
      headers: { 'accept': 'application/json', 'Authorization': `Bearer ${token}` },
    })
      .then(r => {
        if (!r.ok) throw new Error(r.status === 401 ? 'Session expired.' : `Server error (${r.status})`)
        return r.json()
      })
      .then(json => {
        if (cancelled) return
        const data = json.data || json.lookups || json.fields || json
        setLookups(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (cancelled) return
        setLookups([]) // unblock UI — pricing just won't show
      })
      .finally(() => {
        if (cancelled) return
        clearTimeout(timeout)
        setLookupsLoading(false)
      })

    return () => {
      cancelled = true
      clearTimeout(timeout)
      controller.abort()
    }
  }, [token])

  const handleLogout = () => { clearToken(); navigate('/auth') }

  return (
    <div className={styles.page}>
      <div className={styles.bgGrid} aria-hidden="true" />
      <div className={styles.bgGlow1} aria-hidden="true" />
      <div className={styles.bgGlow2} aria-hidden="true" />

      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navLeft}>
          <button className={styles.navBack} onClick={() => navigate('/')}>
            <svg viewBox="0 0 16 16" fill="currentColor" width="11" height="11">
              <path d="M7.78 12.53a.75.75 0 01-1.06 0L2.47 8.28a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 1.06L4.81 7h7.44a.75.75 0 010 1.5H4.81l2.97 2.97a.75.75 0 010 1.06z" />
            </svg>
            Dashboard
          </button>
          <div className={styles.navSep} />
          <div className={styles.navBrand}>
            <GhostIPLogo size={28} animated={false} />
            <span className={styles.navBrandText}>
              <span className={styles.navAccent}>SCAN</span>ORACLE
            </span>
            <span className={styles.navPill}>IP Lookup</span>
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

      {/* Hero */}
      <header className={styles.hero}>
        <div className={styles.heroLogo}>
          <GhostIPLogo size={80} animated={true} />
          <div className={styles.heroPulseRing} aria-hidden="true" />
          <div className={styles.heroPulseRing2} aria-hidden="true" />
        </div>
        <div className={styles.heroText}>
          <h1 className={styles.heroTitle}>
            <span className={styles.heroAccent}>SCAN</span>ORACLE
          </h1>
          <p className={styles.heroSub}>IP Lookup &amp; Intelligence 🔎</p>
        </div>
        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <span className={styles.heroStatNum}>42+</span>
            <span className={styles.heroStatLabel}>Data Fields 🛢</span>
          </div>
          <div className={styles.heroStatDiv} />
          <div className={styles.heroStat}>
            <span className={styles.heroStatNum}>Live</span>
            <span className={styles.heroStatLabel}>Real-Time 🚀</span>
          </div>
          <div className={styles.heroStatDiv} />
          <div className={styles.heroStat}>
            <span className={styles.heroStatNum}>110%</span>
            <span className={styles.heroStatLabel}>Accuracy ⚡</span>
          </div>
        </div>
      </header>

      {/* Split Layout */}
      <main className={styles.splitLayout}>
        <div className={styles.leftCol}>
          <div className={styles.panelLabel}>
            <span className={styles.panelLabelDot} style={{ background: '#a78bfa' }} />
            Data Package Builder
          </div>
          <DataSelectorPanel
            lookups={lookups}
            lookupsLoading={lookupsLoading}
            lookupsError={lookupsError}
            token={token}
            onPurchaseSuccess={() => {}}
            userBalances={{ naira: user?.naira_balance, dollar: user?.dollar_balance }}
          />
        </div>

        <div className={styles.rightCol}>
          <div className={styles.panelLabel}>
            <span className={styles.panelLabelDot} style={{ background: '#38bdf8' }} />
            Your IP Address
            <span className={styles.panelLabelBadge}>REAL DATA</span>
          </div>
          <div className={styles.livePanelWrap}>
            <LiveIPPanel data={liveData} loading={liveLoading} error={liveError} />
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        SCANORACLE · Part of <span className={styles.footerAccent}>Ghostroute</span> Security Suite · {new Date().getFullYear()}
      </footer>
    </div>
  )
}
