const BASE_URL = 'https://secure.ghostroute.icu/api/v1.0/cart'

async function parseJsonSafe(res) {
  try { return await res.json() } catch { return null }
}

/**
 * Step 1 — reserve a search slot for the given coordinates.
 * Shared by both categories (Market and Farm) — CART resolves which kind
 * of listing to return at the "start" step, not here at initialize.
 */
export async function initializeCartSearch(token, latitude, longitude) {
  const res = await fetch(`${BASE_URL}/search/initialize/`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ latitude: String(latitude), longitude: String(longitude) }),
  })
  const data = await parseJsonSafe(res)
  if (!res.ok) {
    throw new Error(data?.detail || 'We couldn\u2019t start your search. Please try again.')
  }
  return data
}

/**
 * Step 2a — run the reserved search for the 'market' category: supermarkets,
 * grocery stores, malls, and marts.
 */
export async function startCartMarketSearch(token, searchToken, latitude, longitude) {
  const res = await fetch(`${BASE_URL}/search/supermarket/start`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      search_token: searchToken,
      latitude: String(latitude),
      longitude: String(longitude),
    }),
  })
  const data = await parseJsonSafe(res)
  if (!res.ok) {
    throw new Error(data?.detail || 'This search is no longer valid. Please search again.')
  }
  return data
}

/**
 * Step 2b — run the reserved search for the 'farm' category: local markets
 * and farm markets.
 */
export async function startCartFarmSearch(token, searchToken, latitude, longitude) {
  const res = await fetch(`${BASE_URL}/search/localmarket/start`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      search_token: searchToken,
      latitude: String(latitude),
      longitude: String(longitude),
    }),
  })
  const data = await parseJsonSafe(res)
  if (!res.ok) {
    throw new Error(data?.detail || 'This search is no longer valid. Please search again.')
  }
  return data
}
