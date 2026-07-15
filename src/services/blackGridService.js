const BASE_URL = 'https://secure.ghostroute.icu/api/v1.0/blackgrid'

async function parseJsonSafe(res) {
  try { return await res.json() } catch { return null }
}

/**
 * Step 1 — reserve a search slot for the given coordinates.
 * Shared by both categories (Stay and Eat) — BlackGrid resolves which kind
 * of listing to return at the "start" step, not here at initialize.
 * Returns { search_id, search_dollar_charge, search_naira_charge, ... }
 */
export async function initializeBlackGridSearch(token, latitude, longitude) {
  const res = await fetch(`${BASE_URL}/search/initialize`, {
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
 * Step 2a — run the reserved search for the 'stay' category and fetch the
 * nearest Airbnbs & hotels.
 * Returns { status_code, message, length, data: [...] }
 */
export async function startBlackGridHotelSearch(token, searchToken, latitude, longitude) {
  const res = await fetch(`${BASE_URL}/search/hotel/start/`, {
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
 * Step 2b — run the reserved search for the 'eat' category and fetch the
 * nearest restaurants & fast food spots.
 * Returns { status_code, message, length, data: [...] }
 */
export async function startBlackGridRestaurantSearch(token, searchToken, latitude, longitude) {
  const res = await fetch(`${BASE_URL}/search/restaurant/start/`, {
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
