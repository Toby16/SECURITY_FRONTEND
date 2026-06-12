// src/services/authService.js
// ── Ghostroute Auth + User Service ───────────────────────────────────────────
const BASE_URL  = 'https://secure.ghostroute.icu/api/v1.0/auth'
const USER_URL  = 'https://secure.ghostroute.icu/api/v1.0/user'
const TOKEN_KEY = 'ghostroute_token'

// ── Token helpers ─────────────────────────────────────────────────────────────
export const saveToken       = (t) => localStorage.setItem(TOKEN_KEY, t)
export const getToken        = ()  => localStorage.getItem(TOKEN_KEY)
export const clearToken      = ()  => localStorage.removeItem(TOKEN_KEY)
export const isAuthenticated = ()  => Boolean(getToken())

// ── Temp credentials ──────────────────────────────────────────────────────────
// username = user_id returned by /signup (e.g. "sarahgreenwood0172817")
export const storeTempCredentials = (email, password, username = null) =>
  sessionStorage.setItem('gr_tmp', JSON.stringify({ email, password, username }))

export function getTempCredentials() {
  try { return JSON.parse(sessionStorage.getItem('gr_tmp')) ?? null }
  catch { return null }
}
export const clearTempCredentials = () => sessionStorage.removeItem('gr_tmp')

// ── Error helper ──────────────────────────────────────────────────────────────
function buildError(data, fallback = 'Request failed.') {
  const detail = data?.detail
  let message, errorField, messageField

  if (typeof detail === 'string') {
    message = detail; errorField = detail; messageField = null
  } else if (detail && typeof detail === 'object') {
    message      = detail.message || detail.error || fallback
    errorField   = detail.error   ?? null
    messageField = detail.message ?? null
  } else {
    message = data?.message || fallback
    errorField = data?.message ?? null; messageField = null
  }

  const err = new Error(message)
  err.errorField = errorField; err.messageField = messageField
  return err
}

function buildAndCheckError(data, fallback) {
  const err = buildError(data, fallback)
  if (isTokenExpiredError(err)) signalTokenExpired()
  return err
}

// ── Token expiry detection ────────────────────────────────────────────────────
const EXPIRED_SIGNALS = [
  'kindly input new token',
  'invalid token',
  'token has expired',
  'could not validate credentials',
  'not authenticated',
]

export function isTokenExpiredError(err) {
  if (!err?.message) return false
  const msg = err.message.toLowerCase()
  return EXPIRED_SIGNALS.some(s => msg.includes(s))
}

export function signalTokenExpired() {
  clearToken()
  window.dispatchEvent(new CustomEvent('ghostroute:token-expired'))
}

// ── Sign up ───────────────────────────────────────────────────────────────────
// Success: { statusCode: 201, message, user_id, token }
export async function signupUser({ email, password }) {
  const res = await fetch(`${BASE_URL}/signup/`, {
    method: 'POST',
    headers: { 'accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username: null, password }),
  })
  const data        = await res.json()
  const detail      = data?.detail ?? {}
  const error       = typeof detail === 'object' ? detail.error   : null
  const message     = typeof detail === 'object' ? detail.message : null
  const alreadyExists = error === 'Kindly login!'
  if (!res.ok && !alreadyExists) throw buildAndCheckError(data, 'Signup failed.')
  return {
    ok:           true,
    alreadyExists,
    error,
    message:      data.message || message,
    userId:       data.user_id  ?? null,   // generated username, e.g. "sarahgreenwood0172817"
    token:        data.token    ?? null,
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────
export async function loginUser({ email, password }) {
  const res  = await fetch(`${BASE_URL}/login/`, {
    method: 'POST',
    headers: { 'accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: email, password }),
  })
  const data  = await res.json()
  if (!res.ok) throw buildAndCheckError(data, 'Login failed.')
  const token = data.token ?? data.access_token ?? data.data?.token ?? null
  if (token) saveToken(token)
  return { ok: true, token, data }
}

// ── Google SSO ────────────────────────────────────────────────────────────────
export function initiateGoogleSSO() {
  window.location.href = 'https://secure.ghostroute.icu/api/v1.0/auth/google/'
}

// ── Refresh token ─────────────────────────────────────────────────────────────
export async function refreshToken() {
  const token = getToken()
  if (!token) return null
  const res  = await fetch(`${BASE_URL}/refresh_token`, {
    method: 'GET',
    headers: { 'accept': 'application/json', 'Authorization': `Bearer ${token}` },
  })
  const data = await res.json()
  if (!res.ok || data.statusCode !== 200) throw buildAndCheckError(data, 'Session refresh failed.')
  if (data.token) saveToken(data.token)
  return data.token
}

// ── Request verification ──────────────────────────────────────────────────────
// Pass username = user_id from signup OR the email address (API accepts both)
export async function requestVerification({ username }) {
  const res  = await fetch(`${BASE_URL}/verification/request/`, {
    method: 'POST',
    headers: { 'accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  })
  const data = await res.json()
  if (!res.ok) throw buildAndCheckError(data, 'Verification request failed.')
  return {
    ok:              true,
    message:         data.message,
    verificationUrl: data.verification_url,
    qrCode:          data.qr_code,
  }
}

// ── Verify account (GET the verification_url) ─────────────────────────────────
export async function verifyAccount(verificationUrl) {
  const res  = await fetch(verificationUrl, {
    method: 'GET',
    headers: { 'accept': 'application/json' },
  })
  const data = await res.json()
  if (!res.ok || data.statusCode !== 200) throw buildAndCheckError(data, 'Verification failed.')
  if (data.token) saveToken(data.token)
  return { ok: true, message: data.message, token: data.token }
}

// ── Activate account ──────────────────────────────────────────────────────────
export async function activateAccount(token) {
  const res  = await fetch(`${BASE_URL}/activate`, {
    method: 'GET',
    headers: { 'accept': 'application/json', 'Authorization': `Bearer ${token}` },
  })
  const data = await res.json()
  if (!res.ok || data.statusCode !== 200) throw buildAndCheckError(data, 'Activation failed.')
  return { ok: true, message: data.message, userId: data.user_id }
}

// ── Get user profile ──────────────────────────────────────────────────────────
export async function getUserProfile(token) {
  const res  = await fetch(`${USER_URL}/get/profile`, {
    method: 'GET',
    headers: { 'accept': 'application/json', 'Authorization': `Bearer ${token}` },
  })
  const data = await res.json()
  if (!res.ok || data.statusCode !== 200) throw buildAndCheckError(data, 'Failed to load profile.')
  if (data.token) saveToken(data.token)
  return { ok: true, user: data.data, token: data.token }
}

// ── Update username ───────────────────────────────────────────────────────────
export async function updateUsername(token, username) {
  const res  = await fetch(`${USER_URL}/update/profile/`, {
    method: 'POST',
    headers: {
      'accept': 'application/json', 'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ username }),
  })
  const data = await res.json()
  if (!res.ok || data.statusCode !== 200) throw buildAndCheckError(data, 'Failed to update username.')
  if (data.token) saveToken(data.token)
  return { ok: true, username: data.username, token: data.token }
}

// ── Update profile photo ──────────────────────────────────────────────────────
export async function updateProfilePhoto(token, file) {
  const form = new FormData()
  form.append('file', file)
  const res  = await fetch(`${USER_URL}/update/profile_photo`, {
    method: 'POST',
    headers: { 'accept': 'application/json', 'Authorization': `Bearer ${token}` },
    body: form,
  })
  const data = await res.json()
  if (!res.ok || data.statusCode !== 200) throw buildAndCheckError(data, 'Failed to update photo.')
  if (data.token) saveToken(data.token)
  return { ok: true, photoUrl: data.profile_photo, token: data.token }
}

// ── Forgot password ───────────────────────────────────────────────────────────
export async function forgotPassword(verificationToken, newPassword) {
  const res  = await fetch(`${USER_URL}/forgot/password/`, {
    method: 'POST',
    headers: {
      'accept': 'application/json', 'Content-Type': 'application/json',
      'Authorization': `Bearer ${verificationToken}`,
    },
    body: JSON.stringify({ new_password: newPassword }),
  })
  const data = await res.json()
  if (!res.ok || data.statusCode !== 200) throw buildAndCheckError(data, 'Failed to update password.')
  if (data.token) saveToken(data.token)
  return { ok: true, message: data.message, userId: data.user_id, token: data.token }
}

// ── Change password ───────────────────────────────────────────────────────────
export async function changePassword(token, current_password, new_password) {
  const res = await fetch('https://secure.ghostroute.icu/api/v1.0/user/change/password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ current_password, new_password }),
  })
  const json = await res.json()
  if (!res.ok || (json.statusCode && json.statusCode !== 200)) {
    throw new Error(json?.detail?.message || json?.message || 'Failed to change password.')
  }
  return json
}

// ── Delete account ────────────────────────────────────────────────────────────
export async function deleteAccount(token) {
  const res = await fetch('https://secure.ghostroute.icu/api/v1.0/user/delete/profile/', {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  })
  const json = await res.json()
  if (!res.ok || (json.statusCode && json.statusCode !== 200)) {
    throw new Error(json?.detail?.message || json?.message || 'Failed to delete account.')
  }
  return json
}


export async function deactivateAccount(token) {
  const res = await fetch(
    'https://secure.ghostroute.icu/api/v1.0/user/deactivate/profile',
    {
      method: 'DELETE',
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  )
  const json = await res.json()
  if (!res.ok || (json.statusCode && json.statusCode !== 200)) {
    throw new Error(json?.detail?.message || json?.message || 'Failed to deactivate account.')
  }
  return json
}
