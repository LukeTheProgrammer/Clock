// Reload the page when a new build is deployed, so kiosk browsers (like the
// bedside Raspberry Pi) pick up updates without a restart.
//
// Every Vite build gives the entry script a new hashed filename. Every couple
// of minutes, fetch index.html (skipping the cache) and compare its script
// filenames with the ones this page loaded; if they differ, reload.

const CHECK_EVERY_MS = 2 * 60 * 1000

function scriptSrcs(doc) {
  return [...doc.querySelectorAll('script[src]')]
    .map((s) => new URL(s.getAttribute('src'), location.href).pathname)
    .sort()
    .join(' ')
}

export function startAutoReload() {
  // Only for built sites: the dev server reloads on its own
  if (!import.meta.env.PROD) return

  const current = scriptSrcs(document)

  setInterval(async () => {
    try {
      const resp = await fetch('/', { cache: 'no-store' })
      if (!resp.ok) return
      const html = await resp.text()
      const latest = scriptSrcs(new DOMParser().parseFromString(html, 'text/html'))
      // An empty result means the fetch returned something unexpected
      if (latest && latest !== current) location.reload()
    } catch {
      // Offline or mid-deploy: try again next time
    }
  }, CHECK_EVERY_MS)
}
