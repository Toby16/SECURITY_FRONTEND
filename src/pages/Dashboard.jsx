import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getUserProfile, updateUsername, updateProfilePhoto,
  changePassword, deleteAccount,
  getToken, clearToken, saveToken,
} from '../services/authService.js'
import { useAuthGuard } from '../hooks/useAuthGuard.js'
import { useTokenRefresh } from '../hooks/useTokenRefresh.js'
import GhostLogo from '../components/GhostLogo.jsx'
import DepositModal from './DepositModal.jsx'          // ← ADD 1
import DonateModal  from './DonateModal.jsx'
import { ChangePwModal, DeleteAccModal } from './AccountModals.jsx'
import styles from './Dashboard.module.css'

function usePageTitle(t) { useEffect(() => { document.title = t }, [t]) }

// ── Toast ─────────────────────────────────────────────────────────────────────
let _tid = 0
function useToast() {
  const [toasts, setToasts] = useState([])
  const remove = useCallback((id) => setToasts(p => p.filter(t => t.id !== id)), [])
  const push   = useCallback((message, type = 'info', ms = 4500) => {
    const id = ++_tid
    setToasts(p => [...p, { id, message, type }])
    if (ms) setTimeout(() => remove(id), ms)
  }, [remove])
  return { toasts, push, remove }
}

function ToastStack({ toasts, remove }) {
  return (
    <div className={styles.toastStack}>
      {toasts.map(t => (
        <div key={t.id} className={`${styles.toast} ${styles[`toast_${t.type}`]}`}>
          <span>{t.type === 'error' ? '✕' : t.type === 'success' ? '✓' : 'ℹ'}</span>
          <span className={styles.toastMsg}>{t.message}</span>
          <button className={styles.toastClose} onClick={() => remove(t.id)}>×</button>
        </div>
      ))}
    </div>
  )
}

// ── Particle background ───────────────────────────────────────────────────────
function ParticleBg() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)
    const COUNT = 55
    const nodes = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.5 + 0.5,
    }))
    const LINK_DIST = 140
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy
        if (n.x < 0) n.x = canvas.width;  if (n.x > canvas.width)  n.x = 0
        if (n.y < 0) n.y = canvas.height; if (n.y > canvas.height) n.y = 0
      })
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx*dx + dy*dy)
          if (dist < LINK_DIST) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(124,58,237,${(1 - dist/LINK_DIST) * 0.18})`
            ctx.lineWidth = 0.8
            ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }
      nodes.forEach(n => {
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(167,139,250,0.45)'; ctx.fill()
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} className={styles.particleCanvas} aria-hidden="true" />
}

// ── Mini apps data ────────────────────────────────────────────────────────────
const APPS = [
  {
    name: 'SCANORACLE — IP Lookup',
    desc: 'Geolocate any IP address or domain with full intelligence.',
    color: 'blue', live: true,
    route: '/scanoracle/iplookup',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
        <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0zm7-3.25v1.5H10v1H8.5V10H7V7.25H5.5v-1H7V4.75h1.5z"/>
      </svg>
    ),
  },
  {
    name: 'SCANORACLE — Email Scanner',
    desc: 'Validate, score and investigate any email address.',
    color: 'purple', live: false,
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
        <path d="M1.75 2A1.75 1.75 0 000 3.75v.736c.043.343.196.672.444.912l5.25 4.675a2.75 2.75 0 003.612 0l5.25-4.675c.248-.24.4-.57.444-.912V3.75A1.75 1.75 0 0013.25 2H1.75zM0 6.954V11.5c0 .966.784 1.75 1.75 1.75h11.5A1.75 1.75 0 0015 11.5V6.954l-4.823 4.29a4.25 4.25 0 01-5.354 0L0 6.954z"/>
      </svg>
    ),
  },
  {
    name: 'SCANORACLE — Phone Lookup',
    desc: 'Look up carrier, location and validity of any phone number.',
    color: 'teal', live: false,
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
        <path d="M1.062 4.28C1.62 7.86 4.14 10.88 7.563 12.398l.774.372a1.75 1.75 0 002.174-.69l.544-.9a.25.25 0 01.334-.093l2.437 1.37a.25.25 0 01.111.321l-.723 1.712a.25.25 0 01-.2.152C4.46 15.32.336 10.14.012 4.46A.25.25 0 01.26 4.2l1.849-.19a.25.25 0 01.27.204l.246 1.23a.25.25 0 01-.124.27l-.9.543a.25.25 0 00-.093.334l.554.69z"/>
      </svg>
    ),
  },
  {
    name: 'SCANORACLE — User-Agent Lookup',
    desc: 'Parse and fingerprint any browser or device user-agent string.',
    color: 'green', live: false,
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
        <path d="M10.5 5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm.061 3.073a4 4 0 10-5.123 0 6.004 6.004 0 00-3.431 5.142.75.75 0 001.498.07 4.5 4.5 0 018.99 0 .75.75 0 101.498-.07 6.005 6.005 0 00-3.432-5.142z"/>
      </svg>
    ),
  },
  {
    name: 'SCANORACLE — MAC Lookup',
    desc: 'Identify device vendors from any MAC address.',
    color: 'blue', live: false,
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
        <path d="M4 2a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V3a1 1 0 00-1-1H4zm2 3h4a.5.5 0 010 1H6a.5.5 0 010-1zm0 2h4a.5.5 0 010 1H6a.5.5 0 010-1zm0 2h2a.5.5 0 010 1H6a.5.5 0 010-1z"/>
      </svg>
    ),
  },
  {
    name: 'Ghostroute VPN',
    desc: 'Private, fast, encrypted browsing powered by Ghostroute.',
    color: 'purple', live: false,
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
        <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM4.5 7.5a.5.5 0 000 1h5.793l-2.147 2.146a.5.5 0 00.708.708l3-3a.5.5 0 000-.708l-3-3a.5.5 0 10-.708.708L10.293 7.5H4.5z"/>
      </svg>
    ),
  },
  {
    name: 'Pixel Pirate',
    desc: 'Download media from anywhere on the web instantly.',
    color: 'coral', live: false,
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
        <path d="M2.75 14A1.75 1.75 0 011 12.25v-2.5a.75.75 0 011.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 00.25-.25v-2.5a.75.75 0 011.5 0v2.5A1.75 1.75 0 0113.25 14H2.75zM7.25 7.689V2a.75.75 0 011.5 0v5.689l1.97-1.97a.75.75 0 111.06 1.06l-3.25 3.25a.75.75 0 01-1.06 0L4.22 6.78a.75.75 0 011.06-1.06l1.97 1.97z"/>
      </svg>
    ),
  },
  {
    name: 'Speed Metrics',
    desc: 'Real-time internet speed and network quality diagnostics.',
    color: 'amber', live: false,
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
        <path d="M8 0a8 8 0 110 16A8 8 0 018 0zm.5 4.75a.75.75 0 00-1.5 0v3.5c0 .414.336.75.75.75h3.25a.75.75 0 000-1.5H8.5v-2.75z"/>
      </svg>
    ),
  },
  {
    name: 'Mechanic Finder',
    desc: 'Find vetted mechanics near you, instantly.',
    color: 'teal', live: false,
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
        <path d="M8.082.8a7.25 7.25 0 015.634 11.849l1.818 1.817a.75.75 0 01-1.06 1.061l-1.817-1.817A7.25 7.25 0 118.082.8zM2.333 8.082a5.75 5.75 0 1011.5 0 5.75 5.75 0 00-11.5 0z"/>
      </svg>
    ),
  },
  {
    name: 'Device & Browser Detect',
    desc: 'Instantly identify any mobile device or browser from your session.',
    color: 'green', live: false,
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
        <path d="M3.75 0A1.75 1.75 0 002 1.75v12.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0014 14.25V1.75A1.75 1.75 0 0012.25 0h-8.5zM3.5 1.75a.25.25 0 01.25-.25h8.5a.25.25 0 01.25.25v12.5a.25.25 0 01-.25.25h-8.5a.25.25 0 01-.25-.25V1.75zM8 13a1 1 0 100-2 1 1 0 000 2z"/>
      </svg>
    ),
  },
]

// ── App Card ──────────────────────────────────────────────────────────────────
function AppCard({ app, onClick }) {
  return (
    <div
      className={`${styles.appCard} ${!app.live ? styles.appSoon : ''}`}
      onClick={app.live ? onClick : undefined}
      role={app.live ? 'button' : undefined}
      tabIndex={app.live ? 0 : undefined}
      onKeyDown={e => app.live && e.key === 'Enter' && onClick?.()}
    >
      <div className={styles.appIconWrap} data-color={app.color}>
        {app.icon}
      </div>
      <div className={styles.appText}>
        <p className={styles.appName}>{app.name}</p>
        <p className={styles.appDesc}>{app.desc}</p>
      </div>
      {app.live ? (
        <span className={styles.appArrow}>→</span>
      ) : (
        <span className={styles.appBadge}>SOON</span>
      )}
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  usePageTitle('Ghostroute — Dashboard')
  useAuthGuard()
  useTokenRefresh()

  const navigate                 = useNavigate()
  const { toasts, push, remove } = useToast()
  const photoInputRef            = useRef(null)

  const [user,           setUser]           = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [editingName,    setEditingName]    = useState(false)
  const [newUsername,    setNewUsername]    = useState('')
  const [savingName,     setSavingName]     = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoPreview,   setPhotoPreview]   = useState(null)
  const [showChangePw,   setShowChangePw]   = useState(false)
  const [showDeleteAcc,  setShowDeleteAcc]  = useState(false)
  const [showDeposit,    setShowDeposit]    = useState(false)  // ← ADD 2
  const [showDonate,     setShowDonate]     = useState(false)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    getUserProfile(token)
      .then(r  => { setUser(r.user); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleSaveUsername = async () => {
    if (!newUsername.trim()) { push('Username cannot be empty.', 'error'); return }
    if (newUsername.trim() === user?.username) { setEditingName(false); return }
    setSavingName(true)
    try {
      const r = await updateUsername(getToken(), newUsername.trim())
      setUser(u => ({ ...u, username: r.username }))
      push('Username updated!', 'success')
      setEditingName(false)
    } catch (e) { push(e.message, 'error') }
    finally { setSavingName(false) }
  }

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setPhotoPreview(ev.target.result)
    reader.readAsDataURL(file)
    setUploadingPhoto(true)
    try {
      const r = await updateProfilePhoto(getToken(), file)
      setUser(u => ({ ...u, photo_url: r.photoUrl }))
      setPhotoPreview(null)
      push('Profile photo updated!', 'success')
    } catch (e) { setPhotoPreview(null); push(e.message, 'error') }
    finally { setUploadingPhoto(false) }
  }

  const handleChangePassword = async (currentPw, newPw) => {
    const r = await changePassword(getToken(), currentPw, newPw)
    // backend returns a fresh token — swap it in silently
    if (r.token) saveToken(r.token)
    return r
  }

  const handleDeleteAccount = async () => {
    await deleteAccount(getToken())
    clearToken()
    navigate('/auth', { replace: true })
  }

  // ← ADD 3: update balances in-place after a successful deposit
  const handleBalanceUpdate = useCallback(({ naira_balance, dollar_balance }) => {
    setUser(u => ({ ...u, naira_balance, dollar_balance }))
    push('Balance updated successfully!', 'success')
  }, [push])

  const handleLogout = () => { clearToken(); navigate('/auth', { replace: true }) }

  if (loading) return (
    <div className={styles.centerPage}>
      <div className={styles.spinner} />
      <p className={styles.loadingText}>Loading your dashboard…</p>
    </div>
  )

  const photo   = photoPreview || user?.photo_url
  const initial = (user?.username ?? '?')[0].toUpperCase()

  return (
    <div className={styles.page}>
      <ToastStack toasts={toasts} remove={remove} />
      <ParticleBg />

      {/* ← ADD 4: render modals */}
      {showDeposit && (
        <DepositModal
          onClose={() => setShowDeposit(false)}
          onBalanceUpdate={handleBalanceUpdate}
        />
      )}
      {showDonate && <DonateModal onClose={() => setShowDonate(false)} />}
      {showChangePw  && (
        <ChangePwModal
          onClose={() => setShowChangePw(false)}
          onSubmit={handleChangePassword}
          push={push}
        />
      )}
      {showDeleteAcc && (
        <DeleteAccModal
          onClose={() => setShowDeleteAcc(false)}
          onConfirm={handleDeleteAccount}
          username={user?.username}
          push={push}
        />
      )}

      {/* Nav */}
      <nav className={styles.nav}>
        <GhostLogo size={34} showText showSub={false} />
        <div className={styles.navBalances}>
          <div className={styles.balance}>
            <span className={styles.balanceCurrency}>₦</span>
            <span className={styles.balanceVal}>{(user?.naira_balance ?? 0).toLocaleString()}</span>
            <span className={styles.balanceLbl}>NGN</span>
          </div>
          <div className={styles.balanceDivider} />
          <div className={styles.balance}>
            <span className={styles.balanceCurrency}>$</span>
            <span className={styles.balanceVal}>{(user?.dollar_balance ?? 0).toLocaleString()}</span>
            <span className={styles.balanceLbl}>USD</span>
          </div>
          {/* ← deposit trigger sits right next to the balance pills */}
          <button className={styles.depositBtn} onClick={() => setShowDeposit(true)}>
            <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
              <path d="M8 .25a.75.75 0 01.75.75v6.19l1.72-1.72a.75.75 0 111.06 1.06l-3 3a.75.75 0 01-1.06 0l-3-3A.75.75 0 015.53 5.47L7.25 7.19V1A.75.75 0 018 .25zM1.75 13a.75.75 0 000 1.5h12.5a.75.75 0 000-1.5H1.75z"/>
            </svg>
            Deposit
          </button>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout}>Sign out</button>
      </nav>

      <div className={styles.layout}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.avatarSection}>
            <div
              className={styles.avatarRing}
              onClick={() => photoInputRef.current?.click()}
              title="Click to change photo"
              role="button" tabIndex={0}
            >
              {uploadingPhoto
                ? <div className={styles.avatarSpinner}><div className={styles.spinner} /></div>
                : photo
                  ? <img src={photo} alt={user?.username} className={styles.avatarImg} />
                  : <div className={styles.avatarFallback}><span>{initial}</span></div>
              }
              <div className={styles.avatarEdit}>
                <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
                  <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 00-.064.108l-.558 1.953 1.953-.558a.253.253 0 00.108-.064l6.286-6.286zm1.238-3.763a.25.25 0 00-.354 0L10.811 3.65l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086z"/>
                </svg>
              </div>
            </div>
            <input ref={photoInputRef} type="file" accept="image/*"
              className={styles.hiddenInput} onChange={handlePhotoChange} />
          </div>

          <div className={styles.sideProfile}>
            {editingName ? (
              <div className={styles.editBlock}>
                <input
                  className={styles.editInput} value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  autoFocus disabled={savingName} placeholder="new username"
                  onKeyDown={e => {
                    if (e.key === 'Enter')  handleSaveUsername()
                    if (e.key === 'Escape') setEditingName(false)
                  }}
                />
                <div className={styles.editActions}>
                  <button className={styles.saveBtn} onClick={handleSaveUsername} disabled={savingName}>
                    {savingName ? <span className={styles.btnSpinner} /> : 'Save'}
                  </button>
                  <button className={styles.cancelBtn} onClick={() => setEditingName(false)} disabled={savingName}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className={styles.usernameRow}>
                <span className={styles.sideUsername}>@{user?.username}</span>
                <button className={styles.editPencil}
                  onClick={() => { setNewUsername(user?.username ?? ''); setEditingName(true) }}>
                  <svg viewBox="0 0 16 16" fill="currentColor" width="11" height="11">
                    <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 00-.064.108l-.558 1.953 1.953-.558a.253.253 0 00.108-.064l6.286-6.286zm1.238-3.763a.25.25 0 00-.354 0L10.811 3.65l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086z"/>
                  </svg>
                </button>
              </div>
            )}
            <p className={styles.sideEmail}>{user?.email}</p>
            <span className={styles.activePill}>● Active</span>
            <div className={styles.sideAccountActions}>
              <button className={styles.sideActionBtn} onClick={() => setShowChangePw(true)}>
                <svg viewBox="0 0 16 16" fill="currentColor" width="11" height="11">
                  <path d="M4 4v1.5h-.5A1.5 1.5 0 002 7v6.5A1.5 1.5 0 003.5 15h9a1.5 1.5 0 001.5-1.5V7a1.5 1.5 0 00-1.5-1.5H12V4a4 4 0 10-8 0zm1.5 0a2.5 2.5 0 015 0v1.5h-5V4zM8 10a1 1 0 110-2 1 1 0 010 2z"/>
                </svg>
                Change password
              </button>
              <button className={`${styles.sideActionBtn} ${styles.sideActionDanger}`} onClick={() => setShowDeleteAcc(true)}>
                <svg viewBox="0 0 16 16" fill="currentColor" width="11" height="11">
                  <path d="M11 1.75V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.559a.75.75 0 10-1.492.141l.66 6.941A1.75 1.75 0 005.405 15h5.19c.9 0 1.652-.681 1.741-1.559l.66-6.94a.75.75 0 00-1.492-.142l-.66 6.941a.25.25 0 01-.249.2h-5.19a.25.25 0 01-.249-.2l-.66-6.941z"/>
                </svg>
                Delete account
              </button>
            </div>
          </div>

          <nav className={styles.sideNav}>
            <p className={styles.sideNavTitle}>Navigation</p>
            <button className={`${styles.sideNavItem} ${styles.sideNavActive}`}>
              <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
                <path d="M1.5 3.25a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zm5.677-.177L9.573.677A.25.25 0 0110 .854V2.5h1A2.5 2.5 0 0113.5 5v5.628a2.251 2.251 0 11-1.5 0V5a1 1 0 00-1-1h-1v1.646a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354z"/>
              </svg>
              Dashboard
            </button>
            <button className={styles.sideNavItem} onClick={() => navigate('/scanoracle/iplookup')}>
              <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
                <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z"/>
              </svg>
              IP Lookup
            </button>
          </nav>
        </aside>

        {/* Main */}
        <main className={styles.main}>
          <div className={styles.welcomeStrip}>
            <div>
              <h1 className={styles.welcomeTitle}>
                Welcome back{user?.username ? `, ${user.username.replace(/\d+$/, '')}` : ''}.
              </h1>
              <p className={styles.welcomeSub}>Here's what's available in your Ghostroute account.</p>
            </div>
          </div>

          <div className={styles.donateBanner}>
            <div className={styles.donateBannerGlow} aria-hidden="true" />
            <div className={styles.donateBannerLeft}>
              <span className={styles.donateBannerIcon}>💜</span>
              <div>
                <p className={styles.donateBannerTitle}>Building a better Nigeria, one tool at a time.</p>
                <p className={styles.donateBannerSub}>
                  Support orphaned children in Lagos &amp; help us bring world-class security tools to everyone — for free.
                </p>
              </div>
            </div>
            <button className={styles.donateBannerBtn} onClick={() => setShowDonate(true)}>
              Make an Impact →
            </button>
          </div>

                    <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Mini Apps</h2>
            <div className={styles.appsGrid}>
              {APPS.map(app => (
                <AppCard
                  key={app.name}
                  app={app}
                  onClick={app.live ? () => navigate(app.route) : undefined}
                />
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
