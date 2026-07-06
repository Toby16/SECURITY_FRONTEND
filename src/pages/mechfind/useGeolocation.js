/**
 * getPreciseLocation
 * Requests one high-accuracy geolocation reading from the browser.
 * Not a React hook (no state) on purpose — MechFind calls this imperatively
 * as one step inside its search flow.
 */
export function getPreciseLocation() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Location isn\u2019t available on this device or browser.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
      },
      (err) => {
        let message = 'We couldn\u2019t get your location. Please try again.'
        if (err.code === err.PERMISSION_DENIED) {
          message = 'Location access was denied. Enable it for this site in your browser settings, then try again.'
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          message = 'Your location is unavailable right now. Try again in a moment.'
        } else if (err.code === err.TIMEOUT) {
          message = 'Finding your location took too long. Try again.'
        }
        reject(new Error(message))
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  })
}
