import { useState, useEffect, useRef, useCallback } from 'react'
import { depositNew, depositStart, depositVerify } from '../services/paymentService.js'
import styles from './DepositModal.module.css'

// ── tiny helpers ──────────────────────────────────────────────────────────────
const fmt = (n, cur) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(n)

const RATE = 1200 // NGN per USD
const STEPS = ['Amount', 'Confirm', 'Pay', 'Done']

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconClose = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
)
const IconNaira = () => <span style={{ fontWeight: 700, fontSize: '1em' }}>₦</span>
const IconDollar = () => <span style={{ fontWeight: 700, fontSize: '1em' }}>$</span>
const IconSpinner = () => (
  <svg className={styles.spin} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
)
const IconCheck = () => (
  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
)
const IconError = () => (
  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 8v4M12 16h.01"/>
  </svg>
)
const IconExternal = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
)
const IconRefresh = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
    <path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
    <path d="M8 16H3v5"/>
  </svg>
)

// ── Step indicator ────────────────────────────────────────────────────────────
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

// ── Main component ────────────────────────────────────────────────────────────
export default function DepositModal({ onClose, onBalanceUpdate }) {
  const [step,      setStep]      = useState(0)   // 0=Amount 1=Confirm 2=Pay 3=Done
  const [currency,  setCurrency]  = useState('NGN') // 'NGN' | 'USD'
  const [amount,    setAmount]    = useState('')
  const [preview,   setPreview]   = useState(null) // { payment_id, naira_amount, dollar_amount }
  const [payInfo,   setPayInfo]   = useState(null) // { transaction_id, authorization_url, paystack_reference }
  const [result,    setResult]    = useState(null) // { naira_balance, dollar_balance, message }
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [visible,   setVisible]   = useState(false)
  const [verifying, setVerifying] = useState(false)
  const pollRef   = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const onKey = (e) => e.key === 'Escape' && handleClose()
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); clearInterval(pollRef.current) }
  }, [])

  useEffect(() => { if (step === 0 && inputRef.current) inputRef.current.focus() }, [step])

  const handleClose = () => {
    clearInterval(pollRef.current)
    setVisible(false)
    setTimeout(onClose, 220)
  }

  const clearErr = () => setError('')

  const numericAmount = parseFloat(amount.replace(/,/g, '')) || 0

  // Always send NGN to the API — multiply by rate when user chose USD
  const ngnAmount = currency === 'USD'
    ? Math.round(numericAmount * RATE)
    : numericAmount

  // ── Step 0 → 1: create deposit, get NGN + USD preview ──────────────────────
  const handleNew = async () => {
    const val = numericAmount
    if (!val || val <= 0) { setError('Enter a valid amount.'); return }
    if (currency === 'NGN' && val < 100)  { setError('Minimum deposit is ₦100.'); return }
    if (currency === 'USD' && val < 1)    { setError('Minimum deposit is $1.'); return }
    if (ngnAmount > 5999999.99) { setError('Single deposit cannot exceed ₦5,999,999.99.'); return }
    setLoading(true); clearErr()
    try {
      const data = await depositNew(ngnAmount) // always NGN to the API
      setPreview(data)
      setStep(1)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  // ── Step 1 → 2: start payment, open Paystack tab, begin polling ────────────
  const handleStart = async () => {
    setLoading(true); clearErr()
    const redirectUrl = `${window.location.origin}${window.location.pathname}?verify=1`
    try {
      const data = await depositStart(preview.payment_id, redirectUrl)
      setPayInfo(data)
      setStep(2)
      window.open(data.authorization_url, '_blank', 'noopener,noreferrer')
      startPolling(preview.payment_id, data.paystack_reference)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  // ── Async polling: verify every 5s until success or user stops ─────────────
  const startPolling = useCallback((payment_id, paystack_reference) => {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const data = await depositVerify(payment_id, paystack_reference)
        clearInterval(pollRef.current)
        setResult(data)
        setStep(3)
        if (onBalanceUpdate) onBalanceUpdate(data)
      } catch {
        // not yet paid — keep polling silently
      }
    }, 5000)
  }, [onBalanceUpdate])

  // ── Manual verify (user clicks "I've Paid") ────────────────────────────────
  const handleManualVerify = async () => {
    if (!payInfo) return
    setVerifying(true); clearErr()
    try {
      const data = await depositVerify(payInfo.transaction_id, payInfo.paystack_reference)
      clearInterval(pollRef.current)
      setResult(data)
      setStep(3)
      if (onBalanceUpdate) onBalanceUpdate(data)
    } catch (e) {
      setError(e.message || 'Payment not confirmed yet. Please complete the transaction.')
    } finally { setVerifying(false) }
  }

  const handleReset = () => {
    clearInterval(pollRef.current)
    setStep(0); setAmount(''); setPreview(null)
    setPayInfo(null); setResult(null); setError('')
    setCurrency('NGN')
  }

  return (
    <div
      className={`${styles.backdrop} ${visible ? styles.backdropVisible : ''}`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className={`${styles.modal} ${visible ? styles.modalVisible : ''}`}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.iconWrap}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
            </div>
            <div>
              <h2 className={styles.title}>Deposit Funds</h2>
              <p className={styles.subtitle}>Add balance to your Ghostroute account</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={handleClose}><IconClose /></button>
        </div>

        <div className={styles.divider} />

        {/* Step bar */}
        <div className={styles.stepBarWrap}>
          <StepBar current={step} />
        </div>

        {/* Body */}
        <div className={styles.body}>

          {/* ── STEP 0: Enter amount ── */}
          {step === 0 && (
            <div className={styles.stepContent}>
              <p className={styles.stepDesc}>Enter the amount you'd like to deposit.</p>

              {/* Currency toggle */}
              <div className={styles.currencyToggle}>
                <button
                  className={`${styles.toggleBtn} ${currency === 'NGN' ? styles.toggleActive : ''}`}
                  onClick={() => { setCurrency('NGN'); setAmount(''); clearErr() }}
                >
                  ₦ NGN
                </button>
                <button
                  className={`${styles.toggleBtn} ${currency === 'USD' ? styles.toggleActive : ''}`}
                  onClick={() => { setCurrency('USD'); setAmount(''); clearErr() }}
                >
                  $ USD
                </button>
              </div>

              <div className={styles.amountGroup}>
                <label className={styles.fieldLabel}>Amount ({currency})</label>
                <div className={styles.amountInputWrap}>
                  <span className={styles.currencyPrefix}>
                    {currency === 'NGN' ? <IconNaira /> : <IconDollar />}
                  </span>
                  <input
                    ref={inputRef}
                    type="number"
                    className={styles.amountInput}
                    placeholder={currency === 'NGN' ? 'e.g. 5000' : 'e.g. 10'}
                    value={amount}
                    min={currency === 'NGN' ? '100' : '1'}
                    onChange={(e) => { setAmount(e.target.value); clearErr() }}
                    onKeyDown={(e) => e.key === 'Enter' && handleNew()}
                  />
                </div>

                {/* Live NGN equivalent shown when typing in USD mode */}
                {currency === 'USD' && numericAmount > 0 && (
                  <p className={styles.conversionHint}>
                    ≈ {fmt(ngnAmount, 'NGN')} at ₦{RATE.toLocaleString()}/$1
                  </p>
                )}

                <p className={styles.minNote}>
                  {currency === 'NGN'
                    ? 'Min: ₦100 · Max: ₦5,999,999.99 per deposit'
                    : `Min: $1 · Max: $${Math.floor(5999999 / RATE).toLocaleString()} per deposit`
                  }
                </p>
              </div>
              {error && <div className={styles.errorBox}>{error}</div>}
            </div>
          )}

          {/* ── STEP 1: Confirm amounts ── */}
          {step === 1 && preview && (
            <div className={styles.stepContent}>
              <p className={styles.stepDesc}>Review the deposit details before proceeding to payment.</p>
              <div className={styles.confirmCard}>
                {/* Show what they typed in their chosen currency */}
                {currency === 'USD' && (
                  <div className={styles.confirmRow}>
                    <span className={styles.confirmLabel}>You entered</span>
                    <span className={styles.confirmValueUsd}>{fmt(numericAmount, 'USD')}</span>
                  </div>
                )}
                <div className={styles.confirmRow}>
                  <span className={styles.confirmLabel}>You deposit</span>
                  <span className={styles.confirmValueBig}>{fmt(preview.naira_amount, 'NGN')}</span>
                </div>
                <div className={styles.confirmDivider} />
                <div className={styles.confirmRow}>
                  <span className={styles.confirmLabel}>USD equivalent</span>
                  <span className={styles.confirmValueUsd}>{fmt(preview.dollar_amount, 'USD')}</span>
                </div>
                <div className={styles.confirmRow}>
                  <span className={styles.confirmLabel}>Payment ID</span>
                  <span className={styles.confirmMono}>{preview.payment_id}</span>
                </div>
              </div>
              <div className={styles.infoNote}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                Rate: ₦{RATE.toLocaleString()} / $1 · You'll be redirected to Paystack's secure checkout in a new tab.
              </div>
              {error && <div className={styles.errorBox}>{error}</div>}
            </div>
          )}

          {/* ── STEP 2: Pay + verify ── */}
          {step === 2 && payInfo && (
            <div className={styles.stepContent}>
              <div className={styles.payingCard}>
                <div className={styles.pulseWrap}>
                  <span className={styles.pulse} />
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                </div>
                <p className={styles.payingTitle}>Waiting for payment…</p>
                <p className={styles.payingDesc}>
                  Complete your payment on Paystack. This page will update automatically once your payment is confirmed.
                </p>
                <div className={styles.payingMeta}>
                  <span className={styles.confirmLabel}>Reference</span>
                  <span className={styles.confirmMono}>{payInfo.paystack_reference}</span>
                </div>
              </div>

              <a
                href={payInfo.authorization_url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.paystackLink}
              >
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

          {/* ── STEP 3: Done ── */}
          {step === 3 && result && (
            <div className={styles.stepContent}>
              <div className={styles.doneCard}>
                <div className={styles.doneIcon}><IconCheck /></div>
                <p className={styles.doneTitle}>Payment Successful!</p>
                <p className={styles.doneDesc}>{result.message}</p>
                <div className={styles.balanceGrid}>
                  <div className={styles.balanceItem}>
                    <span className={styles.balanceLabel}>NGN Balance</span>
                    <span className={styles.balanceValue}>{fmt(result.naira_balance, 'NGN')}</span>
                  </div>
                  <div className={styles.balanceSep} />
                  <div className={styles.balanceItem}>
                    <span className={styles.balanceLabel}>USD Balance</span>
                    <span className={styles.balanceValueUsd}>{fmt(result.dollar_balance, 'USD')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className={styles.footer}>
          {step === 0 && (
            <>
              <button className={styles.cancelBtn} onClick={handleClose}>Cancel</button>
              <button className={styles.primaryBtn} onClick={handleNew} disabled={loading || !amount}>
                {loading ? <><IconSpinner /> Processing…</> : 'Continue →'}
              </button>
            </>
          )}
          {step === 1 && (
            <>
              <button className={styles.cancelBtn} onClick={() => { setStep(0); clearErr() }}>← Back</button>
              <button className={styles.primaryBtn} onClick={handleStart} disabled={loading}>
                {loading ? <><IconSpinner /> Starting…</> : 'Pay with Paystack →'}
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <button className={styles.cancelBtn} onClick={handleReset}>Start over</button>
              <button className={styles.primaryBtn} onClick={handleManualVerify} disabled={verifying}>
                {verifying ? <><IconSpinner /> Verifying…</> : "I've Paid — Verify"}
              </button>
            </>
          )}
          {step === 3 && (
            <>
              <button className={styles.cancelBtn} onClick={handleReset}>
                <IconRefresh /> New deposit
              </button>
              <button className={styles.primaryBtn} onClick={handleClose}>Done</button>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
