import { Link } from 'react-router-dom'
import { Button, Display } from '@/components/ui'
import { useT } from '@/lib/i18n'

export function NotFound() {
  const t = useT()

  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 py-16">
      <div className="mx-auto w-full max-w-page">
        <Display size="lg" className="text-accent">
          404
        </Display>
        <h1 className="mt-6 text-heading-sm font-display text-on-dark">{t('error.notfound.title')}</h1>
        <p className="mt-3 max-w-prose text-body text-muted-dark">{t('error.notfound.body')}</p>
        <div className="mt-8">
          <Link to="/">
            <Button>{t('action.back')}</Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
