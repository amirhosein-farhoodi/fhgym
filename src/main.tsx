import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { applyDirection, resolveInitialLocale } from '@/lib/i18n/direction'
import { AppProviders } from '@/app/providers'
import { AppRouter } from '@/app/router'
import '@/styles/global.css'

// Before React paints, so a Persian load never flashes LTR.
applyDirection(resolveInitialLocale())

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('#root is missing from index.html')

createRoot(rootEl).render(
  <StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </StrictMode>,
)
