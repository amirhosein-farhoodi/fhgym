import { useEffect } from 'react'
import type { GymBrand } from '@/lib/db.types'
import { monogramIcon, publicMediaUrl } from './brand'

function setAttr(selector: string, create: () => HTMLElement, attr: string, value: string): () => void {
  let el = document.head.querySelector<HTMLElement>(selector)
  let created = false
  if (!el) {
    el = create()
    document.head.appendChild(el)
    created = true
  }
  const previous = el.getAttribute(attr)
  el.setAttribute(attr, value)
  return () => {
    if (created) el.remove()
    else if (previous !== null) el.setAttribute(attr, previous)
  }
}

const link = (rel: string) => () => Object.assign(document.createElement('link'), { rel })
const meta = (name: string) => () => Object.assign(document.createElement('meta'), { name })

/**
 * While the trainee screen is open, the page *is* the gym's app: tab title, favicon, and —
 * crucially — what the phone captures when the trainee taps "Add to Home Screen".
 *
 *   iOS reads apple-touch-icon and apple-mobile-web-app-title from the live page at the
 *   moment of adding, so swapping them here is enough.
 *   Android reads the web app manifest, so we point it at a per-gym manifest served by the
 *   Netlify edge function in netlify/edge-functions/gym-manifest.ts. It is only swapped in
 *   once we have confirmed it exists, so local dev keeps the default manifest.
 */
export function useInstallBranding(brand: GymBrand | undefined) {
  const name = brand?.gym_name ?? ''
  const logo = publicMediaUrl(brand?.logo_path)
  const gymId = brand?.gym_id ?? null

  useEffect(() => {
    if (!name) return
    const icon = logo ?? monogramIcon(name)
    const previousTitle = document.title
    document.title = name

    const undo = [
      setAttr('meta[name="apple-mobile-web-app-title"]', meta('apple-mobile-web-app-title'), 'content', name),
      setAttr('link[rel="apple-touch-icon"]', link('apple-touch-icon'), 'href', icon),
      setAttr('link[rel="icon"]', link('icon'), 'href', icon),
    ]

    let cancelled = false
    if (gymId) {
      const href = `/manifest/${gymId}.webmanifest`
      fetch(href, { headers: { accept: 'application/manifest+json' } })
        .then((response) => {
          const type = response.headers.get('content-type') ?? ''
          if (cancelled || !response.ok || !type.includes('json')) return
          undo.push(setAttr('link[rel="manifest"]', link('manifest'), 'href', href))
        })
        .catch(() => {
          /* offline or no edge function — the default manifest stays */
        })
    }

    return () => {
      cancelled = true
      document.title = previousTitle
      undo.reverse().forEach((fn) => fn())
    }
  }, [name, logo, gymId])
}
