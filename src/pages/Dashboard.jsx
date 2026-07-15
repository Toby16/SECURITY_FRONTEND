import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getUserProfile, updateUsername, updateProfilePhoto,
  changePassword, deactivateAccount,
  getToken, clearToken, saveToken,
} from '../services/authService.js'
import { useAuthGuard } from '../hooks/useAuthGuard.js'
import { useTokenRefresh } from '../hooks/useTokenRefresh.js'
import GhostLogo from '../components/GhostLogo.jsx'
import DepositModal from './DepositModal.jsx'
import DonateModal from './DonateModal.jsx'
import SupportModal from './SupportModal.jsx'
import { ChangePwModal, DeleteAccModal } from './AccountModals.jsx'
import styles from './Dashboard.module.css'

function usePageTitle(t) { useEffect(() => { document.title = t }, [t]) }

// ── Toast ─────────────────────────────────────────────────────────────────────
let _tid = 0
function useToast() {
  const [toasts, setToasts] = useState([])
  const remove = useCallback((id) => setToasts(p => p.filter(t => t.id !== id)), [])
  const push = useCallback((message, type = 'info', ms = 4500) => {
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
        if (n.x < 0) n.x = canvas.width; if (n.x > canvas.width) n.x = 0
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
const EVERYDAY_APPS = [
  {
    name: 'BlackGrid — Airbnb, Hotel & Restaurant Finder',
    desc: 'Discover great hotels, airbnbs, restaurants, and eats wherever you are. 🏨',
    color: 'black', live: true, free: true,
    route: '/blackgrid',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
        <path d="M2 2.75A.75.75 0 012.75 2h1.5a.75.75 0 01.75.75V6h6V2.75A.75.75 0 0111.75 2h1.5a.75.75 0 01.75.75v10.5a.75.75 0 01-1.5 0V11H3.5v2.25a.75.75 0 01-1.5 0V2.75zM3.5 7.5v2h9v-2h-9z"/>
      </svg>
    ),
  },
  {
    name: 'Petro — Petrol & Gas Station Finder',
    desc: 'Locate the nearest fuel & gas filling stations. ⛽',
    color: 'red', live: true, free: true,
    route: '/petro',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
        <path d="M3 1.75A.75.75 0 013.75 1h4.5a.75.75 0 01.75.75V7h.25A1.75 1.75 0 0111 8.75v3a.5.5 0 001 0v-3.5a1 1 0 01-1-1v-1a1 1 0 011-1V4.56a1 1 0 00-.3-.7L9.5 2.25v-.5a.75.75 0 111.5 0v.19l1.85 1.72A2 2 0 0113.5 5v6.25A1.75 1.75 0 0111.75 13H11v.5a.75.75 0 01-1.5 0V13H4v.5a.75.75 0 01-1.5 0V13h-.5A.75.75 0 011 12.5v-10zm1.5.75v8.25h5.25V2.5H4.5z"/>
      </svg>
    ),
  },
  {
    name: 'MedicNear — Hospitals, Clinics & Pharmacies',
    desc: 'Find hospitals, clinics and pharmacies 10-minutes away. 🏥',
    color: 'pink', live: true, free: true,
    route: '/medicnear',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
        <path d="M7.25 1.75a.75.75 0 011.5 0V6h4.25a.75.75 0 010 1.5H8.75v4.25a.75.75 0 01-1.5 0V7.5H3a.75.75 0 010-1.5h4.25V1.75z"/>
      </svg>
    ),
  },
  {
    name: 'MechFind — Mechanics & Auto Repair Finder',
    desc: 'Find vetted mechanics and vehicle repair shops near you. 🚗',
    color: 'orange', live: true, free: true,
    route: '/mechfind',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
        <path d="M3.5 8.5l1-3.25A1.5 1.5 0 015.93 4h4.14a1.5 1.5 0 011.43 1.25l1 3.25h.25A1.25 1.25 0 0114 9.75v2.5a.75.75 0 01-.75.75h-1a.75.75 0 01-.75-.75V12H4.5v.25a.75.75 0 01-.75.75h-1A.75.75 0 012 12.25v-2.5A1.25 1.25 0 013.25 8.5h.25zM5.6 5.5l-.85 2.75h6.5L10.4 5.5H5.6zM4.25 10a.75.75 0 100-1.5.75.75 0 000 1.5zm7.5 0a.75.75 0 100-1.5.75.75 0 000 1.5z"/>
      </svg>
    ),
  },
  {
    name: 'Cart — Supermarket, Local & Farm Market Finder',
    desc: 'Find supermarkets, local markets, and farm produce stalls near you. 🛒',
    color: 'green', live: false, free: false,
    route: '/cart',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
        <path d="M1.5 1.75A.75.75 0 012.25 1h1a.75.75 0 01.73.579L4.28 3H14.5a.75.75 0 01.728.936l-1.25 5A.75.75 0 0113.25 9.5H5.24l.25 1H12.5a.75.75 0 010 1.5H4.9a.75.75 0 01-.73-.579L2.79 3.5H2.25a.75.75 0 01-.75-.75v-1zM6 12.5a1.25 1.25 0 100 2.5 1.25 1.25 0 000-2.5zm6 0a1.25 1.25 0 100 2.5 1.25 1.25 0 000-2.5z"/>
      </svg>
    ),
  }
]

const APPS = [
  {
    name: 'SCANORACLE — IP Lookup',
    desc: 'Geolocate any IP address with full intelligence. 📡',
    color: 'blue', live: true,
    route: '/scanoracle/iplookup',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
        <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0zm7-3.25v1.5H10v1H8.5V10H7V7.25H5.5v-1H7V4.75h1.5z"/>
      </svg>
    ),
  },
  {
    name: 'BOLT - Internet Speed Metrics',
    desc: 'Real-time internet speed and network quality diagnostics. 📶',
    color: 'amber', live: true,
	route: '/bolt',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
        <path d="M9.504 2.078a.75.75 0 01.292.757L8.762 7h2.988a.75.75 0 01.58 1.228l-5.25 6.5a.75.75 0 01-1.324-.555l.977-4.143H3.75a.75.75 0 01-.58-1.228l5.25-6.5a.75.75 0 011.084-.224z"/>
      </svg>
    ),
  },
  {
    name: 'SCANORACLE — Email Scanner',
    desc: 'Validate, score and investigate any email address. 📨',
    color: 'purple', live: false,
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
        <path d="M1.75 2A1.75 1.75 0 000 3.75v.736c.043.343.196.672.444.912l5.25 4.675a2.75 2.75 0 003.612 0l5.25-4.675c.248-.24.4-.57.444-.912V3.75A1.75 1.75 0 0013.25 2H1.75zM0 6.954V11.5c0 .966.784 1.75 1.75 1.75h11.5A1.75 1.75 0 0015 11.5V6.954l-4.823 4.29a4.25 4.25 0 01-5.354 0L0 6.954z"/>
      </svg>
    ),
  },
  {
    name: 'SCANORACLE — Phone Lookup',
    desc: 'Look up carrier, location and validity of any phone number. 🔎',
    color: 'teal', live: false,
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
        <path d="M1.062 4.28C1.62 7.86 4.14 10.88 7.563 12.398l.774.372a1.75 1.75 0 002.174-.69l.544-.9a.25.25 0 01.334-.093l2.437 1.37a.25.25 0 01.111.321l-.723 1.712a.25.25 0 01-.2.152C4.46 15.32.336 10.14.012 4.46A.25.25 0 01.26 4.2l1.849-.19a.25.25 0 01.27.204l.246 1.23a.25.25 0 01-.124.27l-.9.543a.25.25 0 00-.093.334l.554.69z"/>
      </svg>
    ),
  },
  {
    name: 'SCANORACLE — User-Agent Lookup',
    desc: 'Parse and fingerprint any browser or device user-agent string. 🌐',
    color: 'green', live: false,
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
        <path d="M10.5 5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm.061 3.073a4 4 0 10-5.123 0 6.004 6.004 0 00-3.431 5.142.75.75 0 001.498.07 4.5 4.5 0 018.99 0 .75.75 0 101.498-.07 6.005 6.005 0 00-3.432-5.142z"/>
      </svg>
    ),
  },
  {
    name: 'SCANORACLE — MAC Lookup',
    desc: 'Identify device vendors from any MAC address. 🖧',
    color: 'blue', live: false,
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
        <path d="M4 2a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V3a1 1 0 00-1-1H4zm2 3h4a.5.5 0 010 1H6a.5.5 0 010-1zm0 2h4a.5.5 0 010 1H6a.5.5 0 010-1zm0 2h2a.5.5 0 010 1H6a.5.5 0 010-1z"/>
      </svg>
    ),
  },
  {
    name: 'Ghostroute VPN',
    desc: 'Private, fast, encrypted browsing powered by Ghostroute. 🔒',
    color: 'purple', live: false,
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
        <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM4.5 7.5a.5.5 0 000 1h5.793l-2.147 2.146a.5.5 0 00.708.708l3-3a.5.5 0 000-.708l-3-3a.5.5 0 10-.708.708L10.293 7.5H4.5z"/>
      </svg>
    ),
  },
  {
    name: 'Pixel Pirate',
    desc: 'Download media from anywhere on the web instantly. 🌧️',
    color: 'coral', live: false,
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
        <path d="M2.75 14A1.75 1.75 0 011 12.25v-2.5a.75.75 0 011.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 00.25-.25v-2.5a.75.75 0 011.5 0v2.5A1.75 1.75 0 0113.25 14H2.75zM7.25 7.689V2a.75.75 0 011.5 0v5.689l1.97-1.97a.75.75 0 111.06 1.06l-3.25 3.25a.75.75 0 01-1.06 0L4.22 6.78a.75.75 0 011.06-1.06l1.97 1.97z"/>
      </svg>
    ),
  },
  {
    name: 'Mechanic Finder',
    desc: 'Find vetted mechanics near you, instantly. 🧰',
    color: 'teal', live: false,
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
        <path d="M8.082.8a7.25 7.25 0 015.634 11.849l1.818 1.817a.75.75 0 01-1.06 1.061l-1.817-1.817A7.25 7.25 0 118.082.8zM2.333 8.082a5.75 5.75 0 1011.5 0 5.75 5.75 0 00-11.5 0z"/>
      </svg>
    ),
  },
  {
    name: 'Device & Browser Detect',
    desc: 'Instantly identify any mobile device or browser from your session. 💻',
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
        {app.free && <span className={styles.freeTag}>1st try free</span>}
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
  const navigate = useNavigate()
  const { toasts, push, remove } = useToast()
  const photoInputRef = useRef(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [showChangePw, setShowChangePw] = useState(false)
  const [showDeleteAcc, setShowDeleteAcc] = useState(false)
  const [showDeposit, setShowDeposit] = useState(false)
  const [showDonate, setShowDonate] = useState(false)
  const [showSupport, setShowSupport] = useState(false)
  // Mobile profile drawer
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    getUserProfile(token)
      .then(r => { setUser(r.user); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Close drawer when clicking outside sidebar on mobile
  useEffect(() => {
    if (!sidebarOpen) return
    const handler = (e) => {
      if (!e.target.closest('[data-sidebar]')) setSidebarOpen(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [sidebarOpen])

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
    if (r.token) saveToken(r.token)
    return r
  }

  const handleDeactivateAccount = async () => {
    await deactivateAccount(getToken())
    clearToken()
    navigate('/auth', { replace: true })
  }

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

  const photo = photoPreview || user?.photo_url
  const initial = (user?.username ?? '?')[0].toUpperCase()

  return (
    <div className={styles.page}>
      <ToastStack toasts={toasts} remove={remove} />
      <ParticleBg />

      {showDeposit && (
        <DepositModal onClose={() => setShowDeposit(false)} onBalanceUpdate={handleBalanceUpdate} />
      )}
      {showDonate && <DonateModal onClose={() => setShowDonate(false)} />}
      {showSupport && <SupportModal onClose={() => setShowSupport(false)} />}
      {showChangePw && (
        <ChangePwModal onClose={() => setShowChangePw(false)} onSubmit={handleChangePassword} push={push} />
      )}
      {showDeleteAcc && (
	<DeleteAccModal
	onClose={() => setShowDeleteAcc(false)}
    	onConfirm={handleDeactivateAccount}
    	username={user?.username}
    	push={push}
  	/>
      )}

      {/* Top Nav */}
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
        {/* ── Sidebar ── */}
        <aside
          className={styles.sidebar}
          data-open={sidebarOpen ? 'true' : 'false'}
          data-sidebar
        >
          {/* Always-visible strip: avatar + name + pill + ⋯ */}
          <div className={styles.sidebarInner}>
            {/* Avatar */}
            <div className={styles.avatarSection}>
              <div
                className={styles.avatarRing}
                onClick={() => photoInputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                {uploadingPhoto ? (
                  <div className={styles.avatarSpinner}><div className={styles.spinner} /></div>
                ) : photo ? (
                  <img src={photo} alt={user?.username} className={styles.avatarImg} />
                ) : (
                  <div className={styles.avatarFallback}><span>{initial}</span></div>
                )}
                <div className={styles.avatarEdit}>
                  <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
                    <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 00-.064.108l-.558 1.953 1.953-.558a.253.253 0 00.108-.064l6.286-6.286zm1.238-3.763a.25.25 0 00-.354 0L10.811 3.65l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086z"/>
                  </svg>
                </div>
              </div>
              <input ref={photoInputRef} type="file" accept="image/*" className={styles.hiddenInput} onChange={handlePhotoChange} />
            </div>

            {/* Profile text */}
            <div className={styles.sideProfile}>
              {editingName ? (
                <div className={styles.editBlock}>
                  <input
                    className={styles.editInput}
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    autoFocus disabled={savingName}
                    placeholder="new username"
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveUsername()
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
                  <button
                    className={styles.editPencil}
                    onClick={() => { setNewUsername(user?.username ?? ''); setEditingName(true) }}
                  >
                    <svg viewBox="0 0 16 16" fill="currentColor" width="11" height="11">
                      <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 00-.064.108l-.558 1.953 1.953-.558a.253.253 0 00.108-.064l6.286-6.286zm1.238-3.763a.25.25 0 00-.354 0L10.811 3.65l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086z"/>
                    </svg>
                  </button>
                </div>
              )}
              <p className={styles.sideEmail}>📧 {user?.email}</p>
              <span className={styles.activePill}>● Active</span>
            </div>

            {/* Mobile-only ⋯ toggle */}
            <button
              className={styles.mobileProfileMenu}
              onClick={(e) => { e.stopPropagation(); setSidebarOpen(o => !o) }}
              aria-label="Profile actions"
              aria-expanded={sidebarOpen}
            >
              {sidebarOpen ? '✕' : '⋯'}
            </button>
          </div>

          {/* Account action buttons — slide down on mobile, always visible on desktop */}
          <div className={styles.sideAccountActions}>
            <button
              className={styles.sideActionBtn}
              onClick={() => { setShowChangePw(true); setSidebarOpen(false) }}
            >
              🗝️ Change password
            </button>
            <button
              className={`${styles.sideActionBtn} ${styles.sideActionDanger}`}
              onClick={() => { setShowDeleteAcc(true); setSidebarOpen(false) }}
            >
              🔒 Deactivate account
            </button>
	    <button
	      className={styles.sideActionBtn}
	      onClick={() => { setShowSupport(true); setSidebarOpen(false) }}

	    >
	      💬 Contact support
	    </button>
          </div>
        </aside>

        {/* Main Content */}
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

	  <section className={`${styles.section} ${styles.everydaySection}`}>
  	    <div className={styles.everydayHeader}>
    	      <h2 className={styles.sectionTitle}>Ghostroute for Everybody</h2>
    	      <span className={styles.everydayBadge}>✨ First try free on every app</span>
  	    </div>
	    <div className={styles.appsGrid}>
    	      {EVERYDAY_APPS.map(app => (
      		<AppCard
        	key={app.name}
        	app={app}
        	onClick={app.live ? () => navigate(app.route) : undefined}
      		/>
    	      ))}
  	    </div>
	  </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Security Mini-Apps </h2>
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
      {/* ← Added Footer */}
      <footer className={styles.footer}>
	<div className={styles.footerSocials}>
	  {/* Instagram — unclickable */}
	  <span className={styles.footerIcon} aria-label="Instagram" title="Instagram">
	    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="17" height="17">
	      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
	      <circle cx="12" cy="12" r="4.5"/>
	      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
	    </svg>
	  </span>

    	  {/* X / Twitter*/}
	  <a href="https://x.com/GhostrouteSec" className={styles.footerIcon} aria-label="X (Twitter)" title="X (Twitter)" tabIndex={-1}>
	    <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
	      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
	    </svg>
	  </a>

    	  {/* Gmail*/}
    	  <a href="mailto:ghostroute.security@gmail.com" className={styles.footerIcon} aria-label="Email" title="Email">
	    <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
	      <path d="M20 4H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 2-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z"/>
	    </svg>
	  </a>

    	{/* Ghostroute logo*/}
	<a href="https://home.ghostroute.icu" className={`${styles.footerIcon} ${styles.footerGhostLogo}`} aria-label="Ghostroute" target="_blank" rel="noopener noreferrer" title="home.ghostroute.icu">
	  <svg viewBox="0 0 64 72" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
	    <path d="M32 4 C18 4 10 14 10 26 L10 58 L16 52 L22 58 L28 52 L32 58 L36 52 L42 58 L48 52 L54 58 L54 26 C54 14 46 4 32 4 Z" fill="currentColor"/>
	    <ellipse cx="24" cy="28" rx="4.5" ry="5.5" fill="#010409"/>
	    <ellipse cx="25.5" cy="26.5" rx="1.5" ry="1.5" fill="#fff" opacity="0.8"/>
	    <ellipse cx="40" cy="28" rx="4.5" ry="5.5" fill="#010409"/>
	    <ellipse cx="41.5" cy="26.5" rx="1.5" ry="1.5" fill="#fff" opacity="0.8"/>
	    <path d="M26 38 Q32 44 38 38" stroke="#010409" strokeWidth="2" strokeLinecap="round" fill="none"/>
	  </svg>
    	</a>
      </div>

      <div className={styles.footerCopy}>
	<span className={styles.footerAccent}>Ghostroute</span> Security™ · 2026 ⚡
      </div>
    </footer>
    </div>
  )
}
