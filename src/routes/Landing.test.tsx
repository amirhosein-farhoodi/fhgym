import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Landing } from './Landing'
import { I18nProvider } from '@/lib/i18n'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { applyDirection } from '@/lib/i18n/direction'
import { en } from '@/lib/i18n/messages/en'
import { fa } from '@/lib/i18n/messages/fa'

/*
 * The point of this test is not that Landing renders — it is that the locale actually
 * reaches the DOM. Persian copy with dir="ltr" still "renders fine" and looks completely
 * broken, which is exactly the class of bug that survives code review.
 */
function renderLanding() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <AuthProvider>
            <Landing />
          </AuthProvider>
        </I18nProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('Landing', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
    vi.unstubAllEnvs()
  })

  /*
   * Both configuration cases stub the env explicitly. Reading whatever happens to be in
   * .env.local makes these tests pass or fail depending on whose machine they run on —
   * which is how this test broke the moment real credentials landed.
   */
  function setConfigured(configured: boolean) {
    vi.stubEnv('VITE_SUPABASE_URL', configured ? 'https://example.supabase.co' : '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', configured ? 'sb_publishable_test_key_000000' : '')
  }

  it('defaults to Persian and sets the document to RTL', () => {
    localStorage.setItem('fh.locale', 'fa')
    applyDirection('fa')
    renderLanding()

    expect(document.documentElement.lang).toBe('fa')
    expect(document.documentElement.dir).toBe('rtl')
    expect(screen.getByText(fa['landing.door.coach.title'])).toBeInTheDocument()
  })

  it('renders English LTR when that locale is stored', () => {
    localStorage.setItem('fh.locale', 'en')
    applyDirection('en')
    renderLanding()

    expect(document.documentElement.lang).toBe('en')
    expect(document.documentElement.dir).toBe('ltr')
    expect(screen.getByText(en['landing.door.coach.title'])).toBeInTheDocument()
  })

  it('renders both doors', () => {
    localStorage.setItem('fh.locale', 'en')
    applyDirection('en')
    renderLanding()

    expect(screen.getByText(en['landing.door.coach.title'])).toBeInTheDocument()
    expect(screen.getByText(en['landing.door.trainee.title'])).toBeInTheDocument()
  })

  it('disables coach sign-in and says why when Supabase is not configured', () => {
    setConfigured(false)
    localStorage.setItem('fh.locale', 'en')
    applyDirection('en')
    renderLanding()

    const signIn = screen.getByRole('button', { name: en['landing.door.coach.cta'] })
    expect(signIn).toBeDisabled()
    expect(screen.getByText(en['error.unconfigured.title'])).toBeInTheDocument()
  })

  it('enables coach sign-in once Supabase is configured', () => {
    setConfigured(true)
    localStorage.setItem('fh.locale', 'en')
    applyDirection('en')
    renderLanding()

    const signIn = screen.getByRole('button', { name: en['landing.door.coach.cta'] })
    expect(signIn).toBeEnabled()
    expect(screen.queryByText(en['error.unconfigured.title'])).not.toBeInTheDocument()
  })
})
