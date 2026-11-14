import { Link } from 'react-router-dom'
import { Badge, Button, Card, Display } from '@/components/ui'
import { CoachLayout } from '@/components/CoachLayout'
import { useCoachContext } from '@/features/auth/useCoach'
import { useT } from '@/lib/i18n'

/**
 * Phase 1 dashboard: proves the identity chain end to end — signed in, profile row created
 * by the trigger, gym linked. The real dashboard (adherence, quiet trainees, expiring
 * programs) arrives in Phase 6 once there is anything to count.
 */
export function CoachDashboard() {
  const t = useT()
  const { data } = useCoachContext()

  return (
    <CoachLayout>
      <Display size="md" as="h1" className="text-accent">
        {t('coach.dashboard.title')}
      </Display>

      <p className="mt-4 text-body text-muted-dark">
        {t('coach.greeting', { name: data?.profile.display_name ?? '' })}
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Card>
          <Badge tone="accent">{t('coach.gymLabel')}</Badge>
          <p className="mt-3 font-display text-heading-sm">{data?.gym?.name}</p>
          <p className="mt-2 text-caption text-muted-dark" dir="ltr">
            {data?.gym?.timezone}
          </p>
        </Card>

        <Card>
          <Badge tone="done">{t('nav.exercises')}</Badge>
          <p className="mt-3 text-body-sm text-on-dark/80">{t('coach.catalogHint')}</p>
          <div className="mt-4">
            <Link to="/coach/exercises">
              <Button size="sm">{t('coach.browseCatalog')}</Button>
            </Link>
          </div>
        </Card>
      </div>

      <p className="mt-8 text-caption text-muted-dark">
        Phase 3 — catalog browsing. Trainees, QR codes and the program builder are next.
      </p>
    </CoachLayout>
  )
}
