import { getToken } from './authService.js'

const BASE = 'https://security.appcardy.com/api/v1.0/payment/payment/deposit'

async function request(url, body, auth = false) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
  if (auth) headers['Authorization'] = `Bearer ${getToken()}`
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  const json = await res.json()
  if (!res.ok || (json.statusCode && json.statusCode !== 200)) {
    const msg =
      json?.detail?.message ||
      json?.detail?.error ||
      json?.message ||
      'Something went wrong. Please try again.'
    throw new Error(msg)
  }
  return json
}

/** Step 1 — create a new deposit, returns { payment_id, naira_amount, dollar_amount } */
export async function depositNew(amountNGN) {
  const json = await request(`${BASE}/new/`, { amount: String(amountNGN) }, true)
  return json.data
}

/** Step 2 — start payment, returns { transaction_id, authorization_url, paystack_reference } */
export async function depositStart(payment_id, redirectUrl) {
  const json = await request(`${BASE}/start/`, {
    payment_id,
    paystack_redirect_url: redirectUrl,
  })
  return json.data
}

/** Step 3 — verify payment, returns { message, naira_balance, dollar_balance } on success */
export async function depositVerify(payment_id, paystack_reference) {
  const json = await request(`${BASE}/verify`, { payment_id, paystack_reference })
  return json.data
}
