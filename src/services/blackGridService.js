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
 * Step 2 — run the reserved search for a specific category
 * ('stay' → Airbnbs & Hotels, 'eat' → Restaurants & Fast Food) and fetch
 * the nearest listings.
 *
 * NOT WIRED UP YET. Only /search/initialize was provided so far — the
 * BlackGrid equivalent of MedicFind's /search/start (the endpoint that
 * actually returns stay/eat listings) hasn't been given. This stub keeps
 * the same two-step shape as medicFindService so BlackGrid.jsx's phase
 * machine is fully wired and ready — once the real endpoint + response
 * shape are provided, replace the body below with the real fetch call
 * (commented scaffold included).
 *
 * It throws with code 'NOT_IMPLEMENTED' on purpose, so the UI can show a
 * calm "your slot is reserved, results aren't live yet" state instead of
 * treating it like a real search failure.
 */
export async function startBlackGridSearch(token, searchId, category, latitude, longitude) {
  throw Object.assign(
    new Error('Results for this category aren\u2019t connected yet — your search slot is reserved.'),
    { code: 'NOT_IMPLEMENTED' }
  )

  // Once the endpoint exists, this should look roughly like:
  //
  // const res = await fetch(`${BASE_URL}/search/start`, {
  //   method: 'POST',
  //   headers: {
  //     accept: 'application/json',
  //     Authorization: `Bearer ${token}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     search_id: searchId,
  //     category, // 'stay' | 'eat'
  //     latitude: String(latitude),
  //     longitude: String(longitude),
  //   }),
  // })
  // const data = await parseJsonSafe(res)
  // if (!res.ok) {
  //   throw new Error(data?.detail || 'This search is no longer valid. Please search again.')
  // }
  // return data
}
