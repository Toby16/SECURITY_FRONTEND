import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import IPLookupForm from '../../components/IPLookupForm.jsx'
import IPResultCard from '../../components/IPResultCard.jsx'
import { lookupIP } from '../../services/ipService.js'
import GhostLogo from '../../components/GhostLogo.jsx'
import { clearToken } from '../../services/authService.js'
import { useTokenRefresh } from '../../hooks/useTokenRefresh.js'
import styles from './IPLookup.module.css'
import { useAuthGuard } from '../../hooks/useAuthGuard.js'

function usePageTitle(t) { useEffect(() => { document.title = t }, [t]) }

export default function IPLookup() {
  usePageTitle('SCANORACLE — IP Lookup | Ghostroute')
  useAuthGuard()
  useTokenRefresh()
  const navigate = useNavigate()
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const handleLookup = async (ip) => {
    setLoading(true); setError(null); setResult(null)
    try {
      const data = await lookupIP(ip)
      setResult(data)
    } catch (err) {
      setError(err.message || 'Lookup failed. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <div className={styles.page}>
      <div className={styles.grid} aria-hidden="true" />

      {/* Nav */}
      <nav className={styles.nav}>
        <button className={styles.navBack} onClick={() => navigate('/')}>
          ← Dashboard
        </button>
        <div className={styles.navBrand}>
          <span className={styles.navBrandScan}>SCAN</span>ORACLE
          <span className={styles.navBrandSub}>IP Lookup</span>
        </div>
        <div className={styles.navRight}>
          <GhostLogo size={26} showText={false} />
          <button
            className={styles.signOutBtn}
            onClick={() => { clearToken(); navigate('/auth') }}
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.titleAccent}>SCAN</span>ORACLE
        </h1>
        <p className={styles.tagline}>IP Lookup Intelligence</p>
      </header>

      {/* Main content */}
      <section className={styles.content}>
        <IPLookupForm onLookup={handleLookup} loading={loading} />
        {error && (
          <div className={styles.error} role="alert">
            <span>⚠</span> {error}
          </div>
        )}
        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Scanning target…</p>
          </div>
        )}
        {result && !loading && <IPResultCard data={result} />}
      </section>

      <footer className={styles.footer}>
        <p>
          SCANORACLE · Part of{' '}
          <span className={styles.footerAccent}>Ghostroute</span>{' '}
          Security Mega App · {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  )
}
