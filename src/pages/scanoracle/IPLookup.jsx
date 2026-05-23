import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearToken, getToken } from '../../services/authService.js'
import { getUserProfile } from '../../services/authService.js'
import { useTokenRefresh } from '../../hooks/useTokenRefresh.js'
import { useAuthGuard } from '../../hooks/useAuthGuard.js'
import styles from './IPLookup.module.css'

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

// Keys here must exactly match the API's IP_ADDRESS object keys
// NOTE: API POST body uses "maps" (not "map") — key corrected below
const FIELD_META = {
  asn:                        { label: 'ASN',                cat: 'Network',  icon: '⬡' },
  hostname:                   { label: 'Hostname',            cat: 'Network',  icon: '⬡' },
  city:                       { label: 'City',                cat: 'Location', icon: '◎' },
  region:                     { label: 'Region',              cat: 'Location', icon: '◎' },
  country:                    { label: 'Country',             cat: 'Location', icon: '◎' },
  country_name:               { label: 'Country Name',        cat: 'Location', icon: '◎' },
  latitude:                   { label: 'Latitude',            cat: 'Location', icon: '◎' },
  longitude:                  { label: 'Longitude',           cat: 'Location', icon: '◎' },
  organization:               { label: 'Organization',        cat: 'Network',  icon: '⬡' },
  timezone:                   { label: 'Timezone',            cat: 'Location', icon: '◎' },
  continent:                  { label: 'Continent',           cat: 'Location', icon: '◎' },
  continent_name:             { label: 'Continent Name',      cat: 'Location', icon: '◎' },
  ip_version:                 { label: 'IP Version',          cat: 'Network',  icon: '⬡' },
  country_alpha_3:            { label: 'Country Alpha-3',     cat: 'Country',  icon: '⊞' },
  postal_code:                { label: 'Postal Code',         cat: 'Location', icon: '◎' },
  country_currency_code:      { label: 'Country Currency Code',       cat: 'Country',  icon: '⊞' },
  country_currency_symbol:    { label: 'Country Currency Symbol',     cat: 'Country',  icon: '⊞' },
  european_union_member:      { label: 'EU Member?',          cat: 'Country',  icon: '⊞' },
  country_current_time:       { label: 'Country Local Time',          cat: 'Time',     icon: '◷' },
  country_current_time_24hr:  { label: 'Country Local Time (24hr)',   cat: 'Time',     icon: '◷' },
  country_current_time_12hr:  { label: 'Country Local Time (12hr)',   cat: 'Time',     icon: '◷' },
  country_current_time_iso:   { label: 'Country Local Time (ISO)',    cat: 'Time',     icon: '◷' },
  country_flag_icon:          { label: 'Country Flag Icon',   cat: 'Country',  icon: '⊞' },
  network_status:             { label: 'Network Status',      cat: 'Network',  icon: '⬡' },
  network_range:              { label: 'Network Range',       cat: 'Network',  icon: '⬡' },
  network_start_address:      { label: 'Network Start Address',       cat: 'Network',  icon: '⬡' },
  network_end_address:        { label: 'Network End Address',         cat: 'Network',  icon: '⬡' },
  network_registration:       { label: 'Network Registered',          cat: 'Network',  icon: '⬡' },
  network_last_changed:       { label: 'Network Last Changed',        cat: 'Network',  icon: '⬡' },
  contact_email:              { label: 'Contact Email',       cat: 'Contact',  icon: '✉' },
  contact_phone:              { label: 'Contact Phone',       cat: 'Contact',  icon: '✉' },
  contact_address:            { label: 'Contact Address',     cat: 'Contact',  icon: '✉' },
  is_tor:                     { label: 'TOR Exit Node?',      cat: 'Threat',   icon: '⚑' },
  is_blacklisted:             { label: 'Is Blacklisted?',     cat: 'Threat',   icon: '⚑' },
  threat_score:               { label: 'Threat Score',        cat: 'Threat',   icon: '⚑' },
  language:                   { label: 'Language',            cat: 'Country',  icon: '⊞' },
  mobile_calling_code:        { label: 'Country Mobile Calling Code', cat: 'Country',  icon: '⊞' },
  tld:                        { label: 'TLD',                 cat: 'Country',  icon: '⊞' },
  fifa:                       { label: 'FIFA Country Code',   cat: 'Country',  icon: '⊞' },
  maps:                       { label: 'Map Link',            cat: 'Location', icon: '◎' }, // API key is "maps"
  population:                 { label: 'Population',          cat: 'Country',  icon: '⊞' },
}

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

// ─── Price helpers ────────────────────────────────────────────────────────────
function parsePriceUSD(info) {
  if (!info) return null
  const n = parseFloat(info.price)
  return isNaN(n) ? null : n
}

function PriceBadge({ info, rate }) {
  const usd = parsePriceUSD(info)
  if (usd === null) return null
  if (usd === 0) return <span className={styles.priceFree}>FREE</span>
  const ngn = Math.round(usd * parseFloat(rate || 1200))
  return (
    <div className={styles.priceBadge}>
      <span className={styles.priceUsd}>${usd.toFixed(2)}</span>
      <span className={styles.priceNgn}>₦{ngn.toLocaleString()}</span>
      <span className={styles.priceUnit}>/day</span>
    </div>
  )
}

function tierColor(usd) {
  if (usd === null) return '#2d3550'
  if (usd === 0)    return '#34d399'
  if (usd <= 0.10)  return '#38bdf8'
  if (usd <= 0.20)  return '#a78bfa'
  if (usd <= 0.30)  return '#fbbf24'
  if (usd <= 0.35)  return '#fb7185'
  return '#ef4444'
}

// ─── Pricing tier legend ──────────────────────────────────────────────────────
function PricingTierLegend({ rate }) {
  const tiers = [
    { label: 'Free',  usd: 0,    color: '#34d399' },
    { label: '$0.10', usd: 0.10, color: '#38bdf8' },
    { label: '$0.20', usd: 0.20, color: '#a78bfa' },
    { label: '$0.30', usd: 0.30, color: '#fbbf24' },
    { label: '$0.35', usd: 0.35, color: '#fb7185' },
    { label: '$0.40', usd: 0.40, color: '#ef4444' },
  ]
  return (
    <div className={styles.pricingLegend}>
      <div className={styles.pricingLegendTop}>
        <span className={styles.pricingLegendTitle}>PRICING TIERS</span>
        <div className={styles.pricingLegendRate}>
          <span className={styles.rateIcon}>↔</span>
          $1 = ₦{Number(rate || 1200).toLocaleString()} NGN
        </div>
      </div>
      <div className={styles.pricingTiers}>
        {tiers.map(t => (
          <div key={t.label} className={styles.pricingTier}>
            <span className={styles.pricingTierDot} style={{ background: t.color }} />
            <span className={styles.pricingTierLabel}>{t.label}</span>
            {t.usd > 0 && (
              <span className={styles.pricingTierNgn}>
                ₦{Math.round(t.usd * Number(rate || 1200)).toLocaleString()}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Live IP Panel ────────────────────────────────────────────────────────────
function LiveIPPanel({ data, loading, error, lookupMeta }) {
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
  if (error) return <div className={styles.liveError}><span>⚠</span> {error}</div>
  if (!data) return null

  const d = data.data
  const threatNum = parseInt(d.threat_score) || 0
  const threatColor = threatNum < 30 ? '#34d399' : threatNum < 60 ? '#fbbf24' : '#ef4444'
  const DISPLAY_CATEGORIES = ['Network', 'Location', 'Country', 'Time', 'Contact', 'Threat']

  return (
    <div className={styles.livePanel}>
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

      <div className={styles.threatWrap}>
        <div className={styles.threatHeader}>
          <span className={styles.threatLabel}>Threat Score</span>
          <span className={styles.threatVal} style={{ color: threatColor }}>{d.threat_score}</span>
        </div>
        <div className={styles.threatBar}>
          <div className={styles.threatFill} style={{ width: d.threat_score, background: threatColor }} />
        </div>
        <div className={styles.threatBadges}>
          <span className={`${styles.threatBadge} ${d.is_tor ? styles.threatBadgeDanger : styles.threatBadgeSafe}`}>
            {d.is_tor ? '● TOR' : '○ No TOR'}
          </span>
          <span className={`${styles.threatBadge} ${d.is_blacklisted ? styles.threatBadgeDanger : styles.threatBadgeSafe}`}>
            {d.is_blacklisted ? '● Blacklisted' : '○ Clean'}
          </span>
          <span className={`${styles.threatBadge} ${styles.threatBadgeSafe}`}>● {d.network_status}</span>
        </div>
      </div>

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
                    <a href={raw} target="_blank" rel="noreferrer" className={styles.liveLink}>View Map ↗</a>
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
        <span>🔒</span> Everything we say is facts!.
      </div>
    </div>
  )
}

// ─── Data Selector Panel ──────────────────────────────────────────────────────
function DataSelectorPanel({ lookupMeta, rate, lookupsLoading, token, onPurchaseSuccess }) {
  const [selected, setSelected] = useState({})
  const [daysFor, setDaysFor] = useState(30)
  const [autoRenew, setAutoRenew] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [txId, setTxId] = useState(null)
  const [activeTab, setActiveTab] = useState('All')

  useEffect(() => {
    const init = {}
    Object.keys(FIELD_META).forEach(k => { init[k] = false })
    setSelected(init)
  }, [])

  const toggleField = key => setSelected(prev => ({ ...prev, [key]: !prev[key] }))
  const selectAll = () => { const n = {}; Object.keys(FIELD_META).forEach(k => { n[k] = true }); setSelected(n) }
  const clearAll  = () => { const n = {}; Object.keys(FIELD_META).forEach(k => { n[k] = false }); setSelected(n) }

  const selectedCount = Object.values(selected).filter(Boolean).length
  const totalFields   = Object.keys(FIELD_META).length

  const totalCostUSD = lookupMeta
    ? Object.entries(selected).reduce((sum, [key, on]) => {
        if (!on) return sum
        const usd = parsePriceUSD(lookupMeta[key])
        return usd !== null ? sum + usd : sum
      }, 0)
    : 0
  const totalCostNGN = Math.round(totalCostUSD * Number(rate || 1200))

  const handleSubmit = async () => {
    if (selectedCount === 0) { setSubmitError('Select at least one data field.'); return }
    setSubmitting(true); setSubmitError(null); setTxId(null)
    try {
      const res = await fetch('https://security.appcardy.com/api/v1.0/scanoracle/payment/create/ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'accept': 'application/json' },
        body: JSON.stringify({ ...selected, days_for: daysFor, auto_renew: autoRenew }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || json.detail || 'Purchase failed.')
      setTxId(json.data?.transaction_id)
      onPurchaseSuccess?.(json.data)
    } catch (e) { setSubmitError(e.message) }
    finally { setSubmitting(false) }
  }

  if (lookupsLoading) return (
    <div className={styles.selectorLoading}>
      <div className={styles.selectorSpinner} />
      <p>Loading data catalog…</p>
    </div>
  )

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
      <div className={styles.selectorHeader}>
        <div className={styles.selectorTitle}>
          <span className={styles.selectorTitleIcon}>⊛</span>
          Build Your Data Package 👨‍🔧
        </div>
        <div className={styles.selectorCount}>
          <span className={styles.selectorCountNum}>{selectedCount}</span>
          <span className={styles.selectorCountOf}>/ {totalFields} fields</span>
        </div>
      </div>

      <PricingTierLegend rate={rate} />

      <div className={styles.selectorActions}>
        <button className={styles.quickBtn} onClick={selectAll}>Select All</button>
        <button className={styles.quickBtn} onClick={clearAll}>Clear</button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`${styles.quickBtn} ${activeTab === cat ? styles.quickBtnActive : ''}`}
            style={activeTab === cat ? { borderColor: CAT_COLORS[cat].text, color: CAT_COLORS[cat].text } : {}}
            onClick={() => setActiveTab(cat)}
          >{cat}</button>
        ))}
      </div>

      <div className={styles.fieldList}>
        {Object.entries(FIELD_META)
          .filter(([, m]) => activeTab === 'All' || m.cat === activeTab)
          .map(([key, meta]) => {
            const info = lookupMeta?.[key]
            const usd = parsePriceUSD(info)
            const isOn = selected[key] || false
            const dot = tierColor(usd)

            return (
              <label
                key={key}
                className={`${styles.fieldRow} ${isOn ? styles.fieldRowOn : ''}`}
                style={isOn ? { borderColor: CAT_COLORS[meta.cat]?.border, background: CAT_COLORS[meta.cat]?.bg } : {}}
              >
                <div
                  className={`${styles.checkbox} ${isOn ? styles.checkboxOn : ''}`}
                  style={isOn ? { background: CAT_COLORS[meta.cat]?.text, borderColor: CAT_COLORS[meta.cat]?.text } : {}}
                >
                  {isOn && <span className={styles.checkmark}>✓</span>}
                </div>
                <input type="checkbox" checked={isOn} onChange={() => toggleField(key)} className={styles.hiddenCheck} />

                <span
                  className={styles.tierDot}
                  style={{ background: dot }}
                  title={usd === null ? 'Loading…' : usd === 0 ? 'Free' : `$${usd.toFixed(2)}/day`}
                />

                <div className={styles.fieldInfo}>
                  <span className={styles.fieldLabel}>{meta.label}</span>
                  {info?.description && (
                    <span className={styles.fieldDesc} title={info.description}>{info.description}</span>
                  )}
                </div>

                <PriceBadge info={info} rate={rate} />
              </label>
            )
          })}
      </div>

      <div className={styles.subscriptionConfig}>
        <div className={styles.configRow}>
          <div className={styles.configLabel}>
            <span className={styles.configIcon}>◷</span>
            Subscription Duration
          </div>
          <div className={styles.daysControl}>
            {[7, 14, 30, 60, 90].map(d => (
              <button key={d} className={`${styles.dayChip} ${daysFor === d ? styles.dayChipActive : ''}`} onClick={() => setDaysFor(d)}>{d}d</button>
            ))}
            <input
              type="number" min={1} max={365} value={daysFor}
              onChange={e => setDaysFor(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))}
              className={styles.daysInput}
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
            role="switch" aria-checked={autoRenew}
          >
            <span className={styles.toggleThumb} />
            <span className={styles.toggleLabel}>{autoRenew ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className={styles.costSummary}>
          <div className={styles.costRow}><span>Fields selected</span><span>{selectedCount}</span></div>
          <div className={styles.costRow}><span>Duration</span><span>{daysFor} days</span></div>
          <div className={styles.costDivider} />
          {totalCostUSD > 0 ? (
            <>
              <div className={styles.costRow}>
                <span>Per day (USD)</span>
                <span className={styles.costUsdVal}>${totalCostUSD.toFixed(2)}</span>
              </div>
              <div className={styles.costRow}>
                <span>Per day (NGN)</span>
                <span>₦{totalCostNGN.toLocaleString()}</span>
              </div>
              <div className={styles.costDivider} />
              <div className={`${styles.costRow} ${styles.costTotal}`}>
                <span>Total ({daysFor}d)</span>
                <div className={styles.costTotalVals}>
                  <span className={styles.costTotalUsd}>${(totalCostUSD * daysFor).toFixed(2)}</span>
                  <span className={styles.costTotalNgn}>₦{(totalCostNGN * daysFor).toLocaleString()}</span>
                </div>
              </div>
            </>
          ) : (
            <div className={`${styles.costRow} ${styles.costTotal}`}>
              <span>Total ({daysFor}d)</span>
              <span className={styles.priceFree}>FREE</span>
            </div>
          )}
        </div>
      )}

      {submitError && <div className={styles.submitError}><span>⚠</span> {submitError}</div>}

      <button
        className={`${styles.purchaseBtn} ${selectedCount === 0 || submitting ? styles.purchaseBtnDisabled : ''}`}
        onClick={handleSubmit}
        disabled={selectedCount === 0 || submitting}
      >
        {submitting ? <><span className={styles.btnSpinner} />Processing…</> : (
          <>⊛ Purchase {selectedCount > 0 ? `${selectedCount} Field${selectedCount > 1 ? 's' : ''}` : 'Data Package'}{autoRenew && ' · Auto-Renew'}</>
        )}
      </button>
    </div>
  )
}

// ─── Subscription Ledger ──────────────────────────────────────────────────────
function SubscriptionLedger({ token, refreshTrigger }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    if (!token) { setLoading(false); return }
    setLoading(true); setError(null)
    fetch('https://security.appcardy.com/api/v1.0/scanoracle/get/categories/ip', {
      headers: { 'accept': 'application/json', 'Authorization': `Bearer ${token}` },
    })
      .then(r => {
        if (!r.ok) throw new Error(`Server error (${r.status})`)
        return r.json()
      })
      .then(json => { setEntries(json?.data ?? []); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [token, refreshTrigger])

  const [deletingId, setDeletingId]   = useState(null)
  const [deleteError, setDeleteError] = useState(null)

  const handleDelete = async (categoryId) => {
    setDeletingId(categoryId); setDeleteError(null)
    try {
      const res = await fetch('https://security.appcardy.com/api/v1.0/scanoracle/delete/category/id', {
        method: 'DELETE',
        headers: { 'accept': 'application/json', 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: categoryId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || json.detail || 'Delete failed.')
      // Remove from local list immediately for snappy UX
      setEntries(prev => prev.filter(e => e.category_id !== categoryId))
      if (expanded === categoryId) setExpanded(null)
    } catch (e) { setDeleteError(e.message) }
    finally { setDeletingId(null) }
  }

  const paid   = entries.filter(e => e.transaction_status)
  const unpaid = entries.filter(e => !e.transaction_status)

  function StatusBadge({ ok }) {
    return ok
      ? <span className={styles.ledgerStatusPaid}>● Paid</span>
      : <span className={styles.ledgerStatusUnpaid}>○ Pending</span>
  }

  function EntryRow({ entry }) {
    const isOpen    = expanded === entry.category_id
    const hasKeys   = entry.keys && entry.keys.length > 0
    const hasPrice  = entry.dollar_price_per_day > 0
    const isDeleting = deletingId === entry.category_id
    const expandable = hasKeys || hasPrice

    return (
      <div
        className={`${styles.ledgerRow} ${isOpen ? styles.ledgerRowOpen : ''} ${!hasKeys && !hasPrice ? styles.ledgerRowEmpty : ''}`}
        onClick={() => expandable ? setExpanded(isOpen ? null : entry.category_id) : null}
        style={{ cursor: expandable ? 'pointer' : 'default' }}
      >
        <div className={styles.ledgerRowMain}>
          <div className={styles.ledgerRowLeft}>
            <StatusBadge ok={entry.transaction_status} />
            <code className={styles.ledgerTxId}>{entry.category_id}</code>
            {entry.auto_renew && <span className={styles.ledgerAutoRenew}>↺ Auto</span>}
          </div>
          <div className={styles.ledgerRowRight}>
            {hasKeys && (
              <span className={styles.ledgerKeyCount}>{entry.keys.length} field{entry.keys.length !== 1 ? 's' : ''}</span>
            )}
            {hasPrice ? (
              <div className={styles.ledgerPriceWrap}>
                <span className={styles.ledgerPriceUsd}>${entry.dollar_price_per_day.toFixed(2)}/day</span>
                <span className={styles.ledgerPriceNgn}>₦{Number(entry.naira_price_per_day).toLocaleString()}/day</span>
              </div>
            ) : (
              <span className={styles.ledgerFree}>FREE</span>
            )}
            <div className={styles.ledgerDays}>
              <span className={styles.ledgerDaysLeft}>{entry.days_left}d left</span>
              {entry.days_for > 0 && <span className={styles.ledgerDaysFor}>of {entry.days_for}d</span>}
            </div>
            {expandable && (
              <span className={`${styles.ledgerChevron} ${isOpen ? styles.ledgerChevronOpen : ''}`}>›</span>
            )}
            <button
              className={`${styles.ledgerDeleteBtn} ${isDeleting ? styles.ledgerDeleteBtnBusy : ''}`}
              onClick={e => { e.stopPropagation(); if (!isDeleting) handleDelete(entry.category_id) }}
              title="Delete this entry"
              disabled={isDeleting}
            >
              {isDeleting ? <span className={styles.ledgerDeleteSpinner} /> : '🗑️'}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className={styles.ledgerRowDetail} onClick={e => e.stopPropagation()}>
            {hasKeys && (
              <div className={styles.ledgerKeyList}>
                <span className={styles.ledgerKeyListLabel}>Subscribed Fields</span>
                <div className={styles.ledgerKeyPills}>
                  {entry.keys.map(k => (
                    <span key={k} className={styles.ledgerKeyPill}>
                      {FIELD_META[k]?.label ?? k}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {hasPrice && (
              <div className={styles.ledgerTotals}>
                <div className={styles.ledgerTotalRow}>
                  <span>Total Cost</span>
                  <span className={styles.ledgerTotalUsd}>${entry.dollar_total_price.toFixed(2)}</span>
                  <span className={styles.ledgerTotalNgn}>₦{Number(entry.naira_total_price).toLocaleString()}</span>
                </div>
                <div className={styles.ledgerTotalRow}>
                  <span>Rate</span>
                  <span>$1 = ₦{Number(entry.rate).toLocaleString()}</span>
                </div>
              </div>
            )}
            {entry.api_key && (
              <div className={styles.ledgerApiKey}>
                <span className={styles.ledgerApiKeyLabel}>API Key</span>
                <code className={styles.ledgerApiKeyVal}>{entry.api_key}</code>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <section className={styles.ledgerSection}>
      <div className={styles.ledgerHeader}>
        <div className={styles.ledgerHeaderLeft}>
          <span className={styles.ledgerHeaderIcon}>⊟</span>
          <span className={styles.ledgerHeaderTitle}>Subscription Ledger</span>
        </div>
        <div className={styles.ledgerHeaderRight}>
          <span className={styles.ledgerStat}><span style={{ color: '#34d399' }}>●</span> {paid.length} paid</span>
          <span className={styles.ledgerStat}><span style={{ color: '#fb7185' }}>○</span> {unpaid.length} pending</span>
          <span className={styles.ledgerTotal}>{entries.length} total</span>
        </div>
      </div>

      <div className={styles.ledgerBody}>
        {loading && (
          <div className={styles.ledgerLoading}>
            <div className={styles.selectorSpinner} />
            <span>Fetching subscriptions…</span>
          </div>
        )}
        {error && (
          <div className={styles.ledgerError}><span>⚠</span> {error}</div>
        )}
        {!loading && !error && entries.length === 0 && (
          <div className={styles.ledgerEmpty}>
            <span className={styles.ledgerEmptyIcon}>⊘</span>
            <p>No subscriptions yet. Build a data package above to get started.</p>
          </div>
        )}
        {deleteError && (
          <div className={styles.ledgerError}><span>⚠</span> {deleteError}</div>
        )}
        {!loading && !error && entries.length > 0 && (
          <div className={styles.ledgerList}>
            {entries.map(entry => <EntryRow key={entry.category_id} entry={entry} />)}
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function IPLookup() {
  usePageTitle('SCANORACLE — IP Lookup | Ghostroute')
  useAuthGuard()
  useTokenRefresh()
  const navigate = useNavigate()

  const [user, setUser]                     = useState(null)
  const [liveData, setLiveData]             = useState(null)
  const [liveLoading, setLiveLoading]       = useState(true)
  const [liveError, setLiveError]           = useState(null)
  const [lookupMeta, setLookupMeta]         = useState(null)
  const [rate, setRate]                     = useState('1200')
  const [lookupsLoading, setLookupsLoading] = useState(() => !!getToken())
  const [token, setToken]                   = useState(() => getToken())
  const [ledgerRefresh, setLedgerRefresh]   = useState(0)

  useEffect(() => { const t = getToken(); if (t !== token) setToken(t) }, [])

  useEffect(() => {
    if (!token) return
    getUserProfile(token).then(r => setUser(r.user)).catch(() => {})
  }, [token])

  useEffect(() => {
    setLiveLoading(true)
    fetch('https://security.appcardy.com/api/v1.0/scanoracle/get/ip_address', { headers: { 'accept': 'application/json' } })
      .then(r => r.json())
      .then(json => { setLiveData(json); setLiveLoading(false) })
      .catch(() => { setLiveLoading(false) })
  }, [])

  useEffect(() => {
    if (!token) { setLookupsLoading(false); return }
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
        const d = json?.data
        setLookupMeta(d?.IP_ADDRESS ?? {})
        setRate(d?.rate ?? '1200')
      })
      .catch(() => { if (cancelled) return; setLookupMeta({}) })
      .finally(() => { if (cancelled) return; clearTimeout(timeout); setLookupsLoading(false) })
    return () => { cancelled = true; clearTimeout(timeout); controller.abort() }
  }, [token])

  const handleLogout = () => { clearToken(); navigate('/auth') }

  const handlePurchaseSuccess = () => {
    // Refresh the ledger after a successful purchase
    setLedgerRefresh(n => n + 1)
  }

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
          <div className={styles.navBrand}>
            <GhostIPLogo size={28} animated={false} />
            <span className={styles.navBrandText}><span className={styles.navAccent}>SCAN</span>ORACLE</span>
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

      <header className={styles.hero}>
        <div className={styles.heroLogo}>
          <GhostIPLogo size={80} animated={true} />
        </div>
        <div className={styles.heroText}>
          <h1 className={styles.heroTitle}><span className={styles.heroAccent}>SCAN</span>ORACLE</h1>
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

      <main className={styles.splitLayout}>
        <div className={styles.leftCol}>
          <div className={styles.panelLabel}>
            <span className={styles.panelLabelDot} style={{ background: '#a78bfa' }} />
            🚧 Data Package Builder
          </div>
          <DataSelectorPanel
            lookupMeta={lookupMeta}
            rate={rate}
            lookupsLoading={lookupsLoading}
            token={token}
            onPurchaseSuccess={handlePurchaseSuccess}
            userBalances={{ naira: user?.naira_balance, dollar: user?.dollar_balance }}
          />
        </div>
        <div className={styles.rightCol}>
          <div className={styles.panelLabel}>
            <span className={styles.panelLabelDot} style={{ background: '#38bdf8' }} />
            Your IP Address 🪐
            <span className={styles.panelLabelBadge}>live scan</span>
          </div>
          <div className={styles.livePanelWrap}>
            <LiveIPPanel
              data={liveData}
              loading={liveLoading}
              error={null}
              lookupMeta={lookupMeta}
            />
          </div>
        </div>
      </main>

      {token && (
        <div className={styles.ledgerWrap}>
          <SubscriptionLedger token={token} refreshTrigger={ledgerRefresh} />
        </div>
      )}

      <footer className={styles.footer}>
        ScanOracle™ - <span className={styles.footerAccent}>Ghostroute</span> Security™ - {new Date().getFullYear()} 📡
      </footer>
    </div>
  )
}
