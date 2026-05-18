import { useState, useEffect } from 'react'
import styles from './AccountModals.module.css'

// ── shared helpers ────────────────────────────────────────────────────────────
function EyeOn()  { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="13" height="13"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> }
function EyeOff() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="13" height="13"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg> }
function Spinner() { return <svg className={styles.spin} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> }
function XIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg> }

function useVisible(onClose) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const fn = (e) => e.key === 'Escape' && close()
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])
  const close = () => { setVisible(false); setTimeout(onClose, 200) }
  return { visible, close }
}

function PwField({ id, label, value, onChange, disabled }) {
  const [show, setShow] = useState(false)
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      <div className={styles.inputWrap}>
        <input
          id={id} type={show ? 'text' : 'password'}
          className={styles.input} value={value} onChange={onChange}
          disabled={disabled} autoComplete="off" spellCheck={false}
        />
        <button type="button" className={styles.eyeBtn} onClick={() => setShow(s => !s)} tabIndex={-1}>
          {show ? <EyeOff /> : <EyeOn />}
        </button>
      </div>
    </div>
  )
}

// ── Change Password Modal ─────────────────────────────────────────────────────
export function ChangePwModal({ onClose, onSubmit, push }) {
  const { visible, close } = useVisible(onClose)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw,     setNewPw]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [done,      setDone]      = useState(false)

  const handleSubmit = async () => {
    if (!currentPw.trim()) { setError('Please enter your current password.'); return }
    if (!newPw.trim())     { setError('Please enter a new password.'); return }
    if (newPw === currentPw) { setError('New password must differ from current password.'); return }
    setLoading(true); setError('')
    try {
      await onSubmit(currentPw, newPw)
      setDone(true)
      push('Password changed successfully!', 'success')
      setTimeout(close, 1400)
    } catch (e) {
      setError(e.message || 'Could not change password. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <div className={`${styles.backdrop} ${visible ? styles.backdropVisible : ''}`}
      onClick={(e) => e.target === e.currentTarget && close()}>
      <div className={`${styles.modal} ${visible ? styles.modalVisible : ''}`}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.iconWrap}>
              <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
                <path d="M4 4v1.5h-.5A1.5 1.5 0 002 7v6.5A1.5 1.5 0 003.5 15h9a1.5 1.5 0 001.5-1.5V7a1.5 1.5 0 00-1.5-1.5H12V4a4 4 0 10-8 0zm1.5 0a2.5 2.5 0 015 0v1.5h-5V4zM8 10a1 1 0 110-2 1 1 0 010 2z"/>
              </svg>
            </div>
            <div>
              <h2 className={styles.title}>Change Password</h2>
              <p className={styles.subtitle}>Update your account password</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={close}><XIcon /></button>
        </div>

        <div className={styles.divider} />

        <div className={styles.body}>
          {done ? (
            <div className={styles.successState}>
              <span className={styles.successIcon}>✓</span>
              <p className={styles.successMsg}>Password updated! Closing…</p>
            </div>
          ) : (
            <>
              <PwField id="cur-pw" label="Current password"
                value={currentPw} onChange={e => { setCurrentPw(e.target.value); setError('') }}
                disabled={loading} />
              <PwField id="new-pw" label="New password"
                value={newPw} onChange={e => { setNewPw(e.target.value); setError('') }}
                disabled={loading} />
              {error && <div className={styles.errorBox}>{error}</div>}
            </>
          )}
        </div>

        {!done && (
          <div className={styles.footer}>
            <button className={styles.cancelBtn} onClick={close} disabled={loading}>Cancel</button>
            <button className={styles.primaryBtn} onClick={handleSubmit} disabled={loading}>
              {loading ? <><Spinner /> Saving…</> : 'Update Password'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Delete Account Modal ──────────────────────────────────────────────────────
export function DeleteAccModal({ onClose, onConfirm, username, push }) {
  const { visible, close } = useVisible(onClose)
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const PHRASE = 'delete my account'

  const handleDelete = async () => {
    if (confirm.toLowerCase() !== PHRASE) {
      setError(`Type "${PHRASE}" exactly to confirm.`); return
    }
    setLoading(true); setError('')
    try {
      await onConfirm()
      push(`Account deleted. Goodbye, ${username}.`, 'info')
    } catch (e) {
      setError(e.message || 'Could not delete account. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className={`${styles.backdrop} ${visible ? styles.backdropVisible : ''}`}
      onClick={(e) => e.target === e.currentTarget && close()}>
      <div className={`${styles.modal} ${styles.modalDanger} ${visible ? styles.modalVisible : ''}`}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={`${styles.iconWrap} ${styles.iconWrapDanger}`}>
              <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
                <path d="M11 1.75V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.559a.75.75 0 10-1.492.141l.66 6.941A1.75 1.75 0 005.405 15h5.19c.9 0 1.652-.681 1.741-1.559l.66-6.94a.75.75 0 00-1.492-.142l-.66 6.941a.25.25 0 01-.249.2h-5.19a.25.25 0 01-.249-.2l-.66-6.941z"/>
              </svg>
            </div>
            <div>
              <h2 className={styles.title}>Delete Account</h2>
              <p className={styles.subtitle}>This action is permanent and cannot be undone</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={close}><XIcon /></button>
        </div>

        <div className={styles.divider} />

        <div className={styles.body}>
          <div className={styles.warningBox}>
            <p>Deleting your account will permanently remove your profile, balance, and all associated data. <strong>This cannot be reversed.</strong></p>
          </div>

          <div className={styles.field}>
            <label htmlFor="del-confirm" className={styles.label}>
              Type <span className={styles.phrase}>"{PHRASE}"</span> to confirm
            </label>
            <input
              id="del-confirm"
              type="text"
              className={`${styles.input} ${styles.inputDanger}`}
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setError('') }}
              disabled={loading}
              placeholder={PHRASE}
              autoComplete="off"
            />
          </div>
          {error && <div className={styles.errorBox}>{error}</div>}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={close} disabled={loading}>Cancel</button>
          <button className={styles.dangerBtn} onClick={handleDelete}
            disabled={loading || confirm.toLowerCase() !== PHRASE}>
            {loading ? <><Spinner /> Deleting…</> : 'Delete My Account'}
          </button>
        </div>
      </div>
    </div>
  )
}
