import { useState, useEffect, useRef, useCallback } from 'react'
import { depositNew, depositStart, donationsVerify } from '../services/paymentService.js'
import styles from './DonateModal.module.css'

const fmt = (n, cur) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(n)

const PRESETS = [500, 1000, 2500, 5000, 10000, 25000]

const IMPACT_ITEMS = [
  { emoji: '🏠', label: 'Orphanages in Lagos', value: '19+', sub: 'supported across Lagos state' },
  { emoji: '🛠️', label: 'Tools in development', value: '8+',   sub: 'being built for Nigerians' },
  { emoji: '🌍', label: 'Goal', value: 'Free access',         sub: 'for every Nigerian, worldwide' },
]

const STEPS = ['Amount', 'Confirm', 'Pay', 'Done']

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconClose = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
)
const IconSpinner = () => (
  <svg className={styles.spin} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
)
const IconExternal = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
)
const IconRefresh = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
    <path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
    <path d="M8 16H3v5"/>
  </svg>
)
const IconHeart = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
  </svg>
)

// ── Step bar ──────────────────────────────────────────────────────────────────
function StepBar({ current }) {
  return (
    <div className={styles.stepBar}>
      {STEPS.map((label, i) => (
        <div key={label} className={styles.stepItem}>
          <div className={`${styles.stepDot} ${i < current ? styles.stepDone : i === current ? styles.stepActive : ''}`}>
            {i < current
              ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              : <span>{i + 1}</span>}
          </div>
          <span className={`${styles.stepLabel} ${i === current ? styles.stepLabelActive : ''}`}>{label}</span>
          {i < STEPS.length - 1 && <div className={`${styles.stepLine} ${i < current ? styles.stepLineDone : ''}`} />}
        </div>
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DonateModal({ onClose }) {
  const [step,      setStep]      = useState(0)
  const [amount,    setAmount]    = useState('')
  const [custom,    setCustom]    = useState(false)
  const [preview,   setPreview]   = useState(null)
  const [payInfo,   setPayInfo]   = useState(null)
  const [result,    setResult]    = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [verifying, setVerifying] = useState(false)
  const [visible,   setVisible]   = useState(false)
  const inputRef  = useRef(null)
  const pollRef   = useRef(null)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const onKey = (e) => e.key === 'Escape' && handleClose()
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); clearInterval(pollRef.current) }
  }, [])

  const handleClose = () => { clearInterval(pollRef.current); setVisible(false); setTimeout(onClose, 220) }
  const clearErr = () => setError('')

  const selectPreset = (val) => { setAmount(String(val)); setCustom(false); clearErr() }

  // Step 0 → 1
  const handleNew = async () => {
    const val = parseFloat(amount)
    if (!val || val < 100)        { setError('Minimum donation is ₦100.'); return }
    if (val > 5999999.99)         { setError('Single donation cannot exceed ₦5,999,999.99.'); return }
    setLoading(true); clearErr()
    try {
      const data = await depositNew(val)
      setPreview(data)
      setStep(1)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  // Step 1 → 2
  const handleStart = async () => {
    setLoading(true); clearErr()
    const redirectUrl = `${window.location.origin}${window.location.pathname}?donated=1`
    try {
      const data = await depositStart(preview.payment_id, redirectUrl)
      setPayInfo(data)
      setStep(2)
      window.open(data.authorization_url, '_blank', 'noopener,noreferrer')
      startPolling(preview.payment_id, data.paystack_reference)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  // Async poll every 5s
  const startPolling = useCallback((payment_id, paystack_reference) => {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const data = await donationsVerify(payment_id, paystack_reference)
        clearInterval(pollRef.current)
        setResult(data)
        setStep(3)
      } catch { /* not yet — keep polling */ }
    }, 5000)
  }, [])

  // Manual verify
  const handleManualVerify = async () => {
    if (!payInfo) return
    setVerifying(true); clearErr()
    try {
      const data = await donationsVerify(payInfo.transaction_id, payInfo.paystack_reference)
      clearInterval(pollRef.current)
      setResult(data)
      setStep(3)
    } catch (e) {
      setError(e.message || 'Payment not confirmed yet. Please complete the transaction.')
    } finally { setVerifying(false) }
  }

  const handleReset = () => {
    clearInterval(pollRef.current)
    setStep(0); setAmount(''); setCustom(false)
    setPreview(null); setPayInfo(null); setResult(null); setError('')
  }

  return (
    <div
      className={`${styles.backdrop} ${visible ? styles.backdropVisible : ''}`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className={`${styles.modal} ${visible ? styles.modalVisible : ''}`}>

        {/* Hero banner — only on step 0 */}
        {step === 0 && (
          <div className={styles.hero}>
            <div className={styles.heroGlow} aria-hidden="true" />
            <div className={styles.heroContent}>
              <div className={styles.heroHeartWrap}>
                <IconHeart size={22} />
              </div>
              <div>
                <h2 className={styles.heroTitle}>Make a Difference Today</h2>
                <p className={styles.heroSub}>
                  Your contribution funds orphanages across Lagos and powers tools built for every Nigerian — at zero cost to them.
                </p>
              </div>
            </div>
            {/* Impact row */}
            <div className={styles.impactRow}>
              {IMPACT_ITEMS.map(item => (
                <div key={item.label} className={styles.impactItem}>
                  <span className={styles.impactEmoji}>{item.emoji}</span>
                  <span className={styles.impactVal}>{item.value}</span>
                  <span className={styles.impactSub}>{item.sub}</span>
                </div>
              ))}
            </div>
            <button className={styles.heroClose} onClick={handleClose} aria-label="Close"><IconClose /></button>
          </div>
        )}

        {/* Compact header for steps 1–3 */}
        {step > 0 && (
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <div className={styles.iconWrap}><IconHeart size={18} /></div>
              <div>
                <h2 className={styles.title}>Donate</h2>
                <p className={styles.subtitle}>Supporting Lagos orphanages &amp; Ghostroute tools</p>
              </div>
            </div>
            <button className={styles.closeBtn} onClick={handleClose}><IconClose /></button>
          </div>
        )}

        <div className={styles.divider} />

        {/* Step bar */}
        <div className={styles.stepBarWrap}><StepBar current={step} /></div>

        {/* Body */}
        <div className={styles.body}>

          {/* ── STEP 0: Choose amount ── */}
          {step === 0 && (
            <div className={styles.stepContent}>
              <p className={styles.stepDesc}>Choose an amount or enter your own. Every naira counts.</p>

              {/* Preset chips */}
              <div className={styles.presetGrid}>
                {PRESETS.map(p => (
                  <button
                    key={p}
                    className={`${styles.preset} ${!custom && amount === String(p) ? styles.presetActive : ''}`}
                    onClick={() => selectPreset(p)}
                  >
                    ₦{p.toLocaleString()}
                  </button>
                ))}
              </div>

              {/* Custom input toggle */}
              {!custom ? (
                <button className={styles.customToggle} onClick={() => { setCustom(true); setAmount(''); setTimeout(() => inputRef.current?.focus(), 50) }}>
                  Enter a custom amount →
                </button>
              ) : (
                <div className={styles.amountGroup}>
                  <label className={styles.fieldLabel}>Custom amount (NGN)</label>
                  <div className={styles.amountInputWrap}>
                    <span className={styles.currencyPrefix}>₦</span>
                    <input
                      ref={inputRef}
                      type="number"
                      className={styles.amountInput}
                      placeholder="e.g. 3500"
                      value={amount}
                      min="100"
                      onChange={(e) => { setAmount(e.target.value); clearErr() }}
                      onKeyDown={(e) => e.key === 'Enter' && handleNew()}
                    />
                  </div>
                </div>
              )}

              <p className={styles.minNote}>Min: ₦100 &nbsp;·&nbsp; Max: ₦5,999,999.99 per donation</p>
              {error && <div className={styles.errorBox}>{error}</div>}

              {/* Trust line */}
              <div className={styles.trustLine}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Secured by Paystack &nbsp;·&nbsp; Not deducted from your balance
              </div>
            </div>
          )}

          {/* ── STEP 1: Confirm ── */}
          {step === 1 && preview && (
            <div className={styles.stepContent}>
              <p className={styles.stepDesc}>Review your donation before proceeding to payment.</p>
              <div className={styles.confirmCard}>
                <div className={styles.confirmRow}>
                  <span className={styles.confirmLabel}>Your donation</span>
                  <span className={styles.confirmValueBig}>{fmt(preview.naira_amount, 'NGN')}</span>
                </div>
                <div className={styles.confirmDivider} />
                <div className={styles.confirmRow}>
                  <span className={styles.confirmLabel}>USD equivalent</span>
                  <span className={styles.confirmValueUsd}>{fmt(preview.dollar_amount, 'USD')}</span>
                </div>
                <div className={styles.confirmRow}>
                  <span className={styles.confirmLabel}>Reference ID</span>
                  <span className={styles.confirmMono}>{preview.payment_id}</span>
                </div>
              </div>
              <div className={styles.infoNote}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                Rate: ₦1,200 / $1 &nbsp;·&nbsp; Redirecting to Paystack's secure checkout in a new tab.
              </div>
              {error && <div className={styles.errorBox}>{error}</div>}
            </div>
          )}

          {/* ── STEP 2: Awaiting payment ── */}
          {step === 2 && payInfo && (
            <div className={styles.stepContent}>
              <div className={styles.payingCard}>
                <div className={styles.pulseWrap}>
                  <span className={styles.pulse} />
                  <div className={styles.pulseHeart}><IconHeart size={24} /></div>
                </div>
                <p className={styles.payingTitle}>Waiting for your donation…</p>
                <p className={styles.payingDesc}>
                  Complete payment on Paystack. This will update automatically once confirmed.
                </p>
                <div className={styles.payingMeta}>
                  <span className={styles.confirmLabel}>Reference</span>
                  <span className={styles.confirmMono}>{payInfo.paystack_reference}</span>
                </div>
              </div>
              <a href={payInfo.authorization_url} target="_blank" rel="noopener noreferrer" className={styles.paystackLink}>
                <IconExternal /> Open Paystack again
              </a>
              {error && <div className={styles.errorBox}>{error}</div>}
              <div className={styles.manualNote}>
                Already paid?{' '}
                <button className={styles.textBtn} onClick={handleManualVerify} disabled={verifying}>
                  {verifying ? 'Checking…' : 'Click here to verify'}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Thank you ── */}
          {step === 3 && result && (
            <div className={styles.stepContent}>
              <div className={styles.doneCard}>
                <div className={styles.doneHearts}>
                  <span>💜</span><span>🙏</span><span>💜</span>
                </div>
                <p className={styles.doneTitle}>Thank you so much.</p>
                <p className={styles.doneDesc}>
                  Your generosity directly supports orphaned children in Lagos and helps us build tools the whole world can afford.
                </p>
                <div className={styles.donationSummary}>
                  <div className={styles.donationSummaryRow}>
                    <span className={styles.confirmLabel}>Amount donated</span>
                    <span className={styles.confirmValueBig}>{fmt(result.naira_amount, 'NGN')}</span>
                  </div>
                  <div className={styles.confirmDivider} />
                  <div className={styles.donationSummaryRow}>
                    <span className={styles.confirmLabel}>USD value</span>
                    <span className={styles.confirmValueUsd}>{fmt(result.dollar_amount, 'USD')}</span>
                  </div>
                </div>
                <p className={styles.doneFootnote}>
                  You're part of something bigger. &nbsp;🌍
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          {step === 0 && (
            <>
              <button className={styles.cancelBtn} onClick={handleClose}>Maybe later</button>
              <button className={styles.donateBtn} onClick={handleNew} disabled={loading || !amount}>
                {loading ? <><IconSpinner /> Processing…</> : <><IconHeart size={13} /> Continue →</>}
              </button>
            </>
          )}
          {step === 1 && (
            <>
              <button className={styles.cancelBtn} onClick={() => { setStep(0); clearErr() }}>← Back</button>
              <button className={styles.donateBtn} onClick={handleStart} disabled={loading}>
                {loading ? <><IconSpinner /> Starting…</> : <><IconHeart size={13} /> Donate with Paystack →</>}
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <button className={styles.cancelBtn} onClick={handleReset}>Start over</button>
              <button className={styles.donateBtn} onClick={handleManualVerify} disabled={verifying}>
                {verifying ? <><IconSpinner /> Verifying…</> : "I've Paid — Verify"}
              </button>
            </>
          )}
          {step === 3 && (
            <>
              <button className={styles.cancelBtn} onClick={handleReset}>
                <IconRefresh /> Donate again
              </button>
              <button className={styles.donateBtn} onClick={handleClose}>Close</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
