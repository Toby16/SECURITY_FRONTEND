const BASE_URL = 'https://secure.ghostroute.icu/api/v1.0/medicfind'

async function parseJsonSafe(res) {
  try { return await res.json() } catch { return null }
}

/**
 * Step 1 — reserve a search slot for the given coordinates.
 * Returns { search_id, search_dollar_charge, search_naira_charge, ... }
 */
export async function initializeMedicFindSearch(token, latitude, longitude) {
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
 * Step 2 — run the reserved search and fetch the nearest hospitals,
 * clinics, and pharmacies.
 * Returns { status_code, message, length, data: [...] }
 */
export async function startMedicFindSearch(token, searchToken, latitude, longitude) {
  const res = await fetch(`${BASE_URL}/search/start`, {
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
