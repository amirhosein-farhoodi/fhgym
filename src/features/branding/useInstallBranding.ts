import { useEffect } from 'react'
import type { GymBrand } from '@/lib/db.types'
import { traineeHomePath } from '@/features/trainees/claim'
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
 *   Netlify edge function in netlify/edge-functions/gym-manifest.ts. Where that function
 *   does not exist (local dev, preview) an equivalent manifest is built in the browser.
 *
 * Both manifests start the installed app at /me?k=<token>, so it can sign the trainee back
 * in even when the phone gives it storage separate from the browser (iOS does).
 */
function blobManifest(name: string, icon: string, token: string | undefined): string {
  const origin = window.location.origin
  const manifest = {
    id: '/me',
    name,
    short_name: name.length > 12 ? name.slice(0, 12).trim() : name,
    // Absolute: a blob: manifest has no base URL to resolve relative paths against.
    start_url: origin + traineeHomePath(token),
    scope: origin + '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f1e8d7',
    theme_color: '#f1e8d7',
    icons: [{ src: icon, sizes: '512x512', type: 'image/png', purpose: 'any maskable' }],
  }
  return URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }))
}

export function useInstallBranding(brand: GymBrand | undefined, token?: string) {
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
    let blobUrl: string | null = null
    const applyBlobManifest = () => {
      if (cancelled) return
      blobUrl = blobManifest(name, logo ?? monogramIcon(name, 512), token)
      undo.push(setAttr('link[rel="manifest"]', link('manifest'), 'href', blobUrl))
    }

    if (gymId) {
      const query = token ? `?k=${encodeURIComponent(token)}` : ''
      const href = `/manifest/${gymId}.webmanifest${query}`
      fetch(href, { headers: { accept: 'application/manifest+json' } })
        .then((response) => {
          const type = response.headers.get('content-type') ?? ''
          if (cancelled) return
          if (!response.ok || !type.includes('json')) return applyBlobManifest()
          undo.push(setAttr('link[rel="manifest"]', link('manifest'), 'href', href))
        })
        .catch(applyBlobManifest)
    } else {
      applyBlobManifest()
    }

    return () => {
      cancelled = true
      if (blobUrl) URL.revokeObjectURL(blobUrl)
      document.title = previousTitle
      undo.reverse().forEach((fn) => fn())
    }
  }, [name, logo, gymId, token])
}
