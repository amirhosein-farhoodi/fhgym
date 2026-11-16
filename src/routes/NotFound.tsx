import { Link } from 'react-router-dom'
import { House } from 'lucide-react'
import { Button, Display } from '@/components/ui'
import { useT } from '@/lib/i18n'

export function NotFound() {
  const t = useT()

  return (
    <main className="flex min-h-dvh flex-col justify-center bg-surface px-6 py-16">
      <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
        <img src="/logo-mark.png" alt="" className="h-12 w-auto opacity-80" />
        <Display size="xl" className="mt-6 text-center text-pine">
          404
        </Display>
        <h1 className="mt-4 font-display text-heading-sm text-fg">{t('error.notfound.title')}</h1>
        <p className="mt-3 text-body text-fg-muted">{t('error.notfound.body')}</p>
        <div className="mt-8">
          <Link to="/">
            <Button>
              <House aria-hidden />
              {t('action.back')}
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
