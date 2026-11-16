/*
 * Per-gym web app manifest and fallback icon.
 *
 *   GET /manifest/<gymId>.webmanifest?k=<token>
 *                                      — the gym's own "app": its name, its logo as the icon,
 *                                        starting at /me?k=<token> so the installed app can
 *                                        sign the trainee back in (iOS isolates its storage)
 *   GET /gym-icon/<gymId>.svg          — monogram icon for gyms that have not uploaded a logo
 *
 * When a trainee adds the workout page to their Android home screen, Chrome reads this
 * manifest, so the icon and the label under it are the gym's — not ours.
 *
 * Needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify's environment variables
 * (the same two the app build already uses), and migration 0007 for the gym_brand() RPC.
 */

declare const Netlify: { env: { get(name: string): string | undefined } }

const TOKEN = /^[0-9a-f]{32,128}$/i
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CREAM = '#f1e8d7'
const PINE = '#2f655c'

interface Brand {
  gym_name: string
  logo_path: string | null
}

async function loadBrand(gymId: string): Promise<{ brand: Brand | null; supabaseUrl: string }> {
  const supabaseUrl = Netlify.env.get('VITE_SUPABASE_URL') ?? ''
  const key = Netlify.env.get('VITE_SUPABASE_ANON_KEY') ?? ''
  if (!supabaseUrl || !key) return { brand: null, supabaseUrl }

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/gym_brand`, {
    method: 'POST',
    headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ p_gym_id: gymId }),
  })
  if (!response.ok) return { brand: null, supabaseUrl }
  const rows = (await response.json()) as Brand[]
  return { brand: rows[0] ?? null, supabaseUrl }
}

function initials(name: string): string {
  const letters = name.trim().split(/\s+/).slice(0, 2).map((w) => [...w][0] ?? '')
  const persian = letters.some((l) => /[؀-ۿ]/.test(l))
  return persian ? letters.join('‌') : letters.join('').toUpperCase()
}

function escapeXml(text: string): string {
  return text.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

function monogramSvg(name: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" fill="${PINE}"/>
<text x="256" y="262" text-anchor="middle" dominant-baseline="middle" fill="${CREAM}"
 font-family="Vazirmatn, Inter, system-ui, sans-serif" font-weight="700" font-size="200">${escapeXml(initials(name))}</text>
</svg>`
}

export default async (request: Request): Promise<Response> => {
  const url = new URL(request.url)
  const [, kind, file = ''] = url.pathname.split('/')
  const gymId = file.replace(/\.(webmanifest|svg)$/, '')
  if (!UUID.test(gymId)) return new Response('Not found', { status: 404 })

  const { brand, supabaseUrl } = await loadBrand(gymId)
  if (!brand) return new Response('Not found', { status: 404 })

  if (kind === 'gym-icon') {
    return new Response(monogramSvg(brand.gym_name), {
      headers: { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=3600' },
    })
  }

  const icons =
    brand.logo_path ?
      [
        // The uploaded logo is a 512px square PNG with a safe margin on white (see
        // prepareLogo in the app), so it works both as a plain and as a maskable icon.
        {
          src: `${supabaseUrl}/storage/v1/object/public/exercise-media/${brand.logo_path}`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ]
    : [{ src: `/gym-icon/${gymId}.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]

  const token = url.searchParams.get('k') ?? ''
  const startUrl = TOKEN.test(token) ? `/me?k=${token}` : '/me'

  const manifest = {
    id: '/me',
    name: brand.gym_name,
    short_name: brand.gym_name.length > 12 ? brand.gym_name.slice(0, 12).trim() : brand.gym_name,
    start_url: startUrl,
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: CREAM,
    theme_color: CREAM,
    icons,
  }

  return new Response(JSON.stringify(manifest), {
    headers: {
      'content-type': 'application/manifest+json',
      // Short and private: it is per-trainee once ?k= is present, and a coach who changes
      // their logo should see it on the next install.
      'cache-control': 'private, max-age=300',
    },
  })
}

export const config = { path: ['/manifest/*', '/gym-icon/*'] }
