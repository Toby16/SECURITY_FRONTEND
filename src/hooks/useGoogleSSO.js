import { useEffect, useRef, useCallback } from 'react'
import { saveToken } from '../services/authService.js'

const SSO_URL       = 'https://secure.ghostroute.icu/api/v1.0/auth/google/'
const POPUP_W       = 520
const POPUP_H       = 640
const POLL_INTERVAL = 400

export function useGoogleSSO(onSuccess, onError) {
  const popupRef  = useRef(null)
  const pollRef   = useRef(null)
  const cleanedUp = useRef(false)

  const cleanup = useCallback(() => {
    if (pollRef.current)  clearInterval(pollRef.current)
    if (popupRef.current && !popupRef.current.closed) popupRef.current.close()
    window.removeEventListener('message', handleMessage)
    cleanedUp.current = true
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleMessage(event) {
    if (event.origin !== window.location.origin) return
    const { type, token, error } = event.data ?? {}
    if (type === 'GHOSTROUTE_SSO_SUCCESS' && token) {
      saveToken(token)
      cleanup()
      onSuccess?.(token)
    } else if (type === 'GHOSTROUTE_SSO_ERROR') {
      cleanup()
      onError?.(error || 'Google sign-in failed.')
    }
  }

  const openPopup = useCallback(() => {
    cleanedUp.current = false
    const left = Math.round(window.screenX + (window.outerWidth  - POPUP_W) / 2)
    const top  = Math.round(window.screenY + (window.outerHeight - POPUP_H) / 2)

    const popup = window.open(
      SSO_URL,
      'ghostroute_google_sso',
      `width=${POPUP_W},height=${POPUP_H},left=${left},top=${top},scrollbars=yes,resizable=yes,status=yes`
    )

    if (!popup || popup.closed) {
      onError?.('Popup was blocked. Please allow popups for this site and try again.')
      return
    }

    popupRef.current = popup
    window.addEventListener('message', handleMessage)

    pollRef.current = setInterval(() => {
      if (popupRef.current?.closed && !cleanedUp.current) {
        cleanup()
        onError?.('Sign-in was cancelled.')
      }
    }, POLL_INTERVAL)
  }, [onSuccess, onError, cleanup]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => cleanup(), [cleanup])

  return { openPopup }
}
