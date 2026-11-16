import { getSupabase } from '@/lib/supabase'

export interface ClaimResult {
  trainee_id: string
  trainee_name: string
  gym_name: string
}

/**
 * Turns a scanned QR into a working session.
 *
 * Two steps, in this order:
 *   1. Anonymous sign-in — a real Supabase user with a real JWT, no email or password.
 *   2. claim_trainee(token) — links that anonymous user to the trainee row.
 *
 * After this, ordinary RLS does the work: every trainee policy resolves through
 * trainee_devices. No custom JWT signing, no hand-written API, and it keeps working when
 * Supabase finishes migrating to asymmetric JWT keys.
 *
 * The session never expires. Only the coach revoking ends it.
 */
export async function claimTrainee(token: string): Promise<ClaimResult> {
  const supabase = getSupabase()

  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session) {
    const { error } = await supabase.auth.signInAnonymously()
    if (error) throw error
  }

  const { data, error } = await supabase
    .rpc('claim_trainee', { p_token: token })
    .single<ClaimResult>()

  if (error) throw error
  return data
}

const STORAGE_KEY = 'fh.trainee'

/** What we keep on the device. The token lets an installed app re-claim on its own. */
export interface StoredTrainee extends ClaimResult {
  token?: string
}

/** Remembered so a returning trainee lands straight on their workout without rescanning. */
export function rememberTrainee(result: ClaimResult, token?: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...result, token }))
  } catch {
    /* private mode — the Supabase session still persists, this is only a nicety */
  }
}

export function recallTrainee(): StoredTrainee | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredTrainee) : null
  } catch {
    return null
  }
}

/** Claim and remember in one step — used by the QR route and by an installed app's first launch. */
export async function claimAndRemember(token: string): Promise<StoredTrainee> {
  const result = await claimTrainee(token)
  rememberTrainee(result, token)
  return { ...result, token }
}

/**
 * The trainee's home URL. It carries the access token on purpose: on iOS a home-screen app
 * gets storage separate from Safari, so the installed app starts with no session and no
 * remembered trainee. With the token in its start URL it can sign itself back in. The token
 * is the same secret already printed in the QR code.
 */
export function traineeHomePath(token: string | undefined): string {
  return token ? `/me?k=${encodeURIComponent(token)}` : '/me'
}
