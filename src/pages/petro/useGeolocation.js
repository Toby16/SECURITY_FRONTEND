/**
 * getPreciseLocation
 * Requests a geolocation reading from the browser, trying three strategies
 * in order and falling through to the next only if the previous one fails:
 *
 *   1. Plain call, browser-default options (matches basic HTML5 usage).
 *   2. High-accuracy (GPS-preferred), fresh reading only.
 *   3. Loose / network-based, accepting a recent cached fix.
 *
 * A denied permission stops the chain immediately, since no fallback can
 * fix that. Any other failure (unavailable / timeout) moves to the next
 * strategy before finally surfacing a friendly error.
 */
export function getCurrentPosition(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })
}

function toFriendlyError(err) {
  let message = 'We couldn\u2019t get your location. Enable your location settings, and try again.'
  if (err.code === err.PERMISSION_DENIED) {
    message = 'Location access was denied. Enable your location/gps settings, then try again.'
  } else if (err.code === err.POSITION_UNAVAILABLE) {
    message = 'Your location is unavailable right now. Try again in a moment.'
  } else if (err.code === err.TIMEOUT) {
    message = 'Finding your location took too long. Try again.'
  }
  return new Error(message)
}

function toCoords(position) {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  }
}

export async function getPreciseLocation() {
  if (!('geolocation' in navigator)) {
    throw new Error('Location isn\u2019t available on this device or browser.')
  }

  // Attempt 1 — plain call, no options, browser decides how to resolve it.
  try {
    const position = await getCurrentPosition()
    console.log('Latitude: ' + position.coords.latitude)
    console.log('Longitude: ' + position.coords.longitude)
    return toCoords(position)
  } catch (firstErr) {
    if (firstErr.code === firstErr.PERMISSION_DENIED) throw toFriendlyError(firstErr)

    // Attempt 2 — high-accuracy, GPS-preferred, fresh reading only.
    try {
      const position = await getCurrentPosition({ enableHighAccuracy: true, timeout: 60000, maximumAge: 0 })
      return toCoords(position)
    } catch (secondErr) {
      if (secondErr.code === secondErr.PERMISSION_DENIED) throw toFriendlyError(secondErr)

      // Attempt 3 — loose / network-based, accepting a recent cached fix.
      try {
        const position = await getCurrentPosition({ enableHighAccuracy: false, timeout: 60000, maximumAge: 60000 })
        return toCoords(position)
      } catch (thirdErr) {
        throw toFriendlyError(thirdErr)
      }
    }
  }
}
