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

/** Remembered so a returning trainee lands straight on their workout without rescanning. */
export function rememberTrainee(result: ClaimResult): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result))
  } catch {
    /* private mode — the Supabase session still persists, this is only a nicety */
  }
}

export function recallTrainee(): ClaimResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ClaimResult) : null
  } catch {
    return null
  }
}
