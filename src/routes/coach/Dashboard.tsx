import { Link } from 'react-router-dom'
import { ArrowRight, ClipboardList, Clock, Dumbbell, Pencil, Users, type LucideIcon } from 'lucide-react'
import { GymAvatar } from '@/features/branding/GymAvatar'
import { CoachLayout } from '@/components/CoachLayout'
import { PageHeader } from '@/components/ui'
import { useCoachContext } from '@/features/auth/useCoach'
import { useTemplates } from '@/features/programs/usePrograms'
import { useTrainees } from '@/features/trainees/useTrainees'
import { useT } from '@/lib/i18n'
import type { TranslationKey } from '@/lib/i18n'

function QuickLink({
  to,
  icon: Icon,
  title,
  body,
  count,
}: {
  to: string
  icon: LucideIcon
  title: TranslationKey
  body: TranslationKey
  count?: number | undefined
}) {
  const t = useT()
  return (
    <Link
      to={to}
      className="group flex flex-col rounded-card border border-line/70 bg-surface-card p-5 shadow-card transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-raised"
    >
      <div className="flex items-start justify-between">
        <span className="flex size-11 items-center justify-center rounded-[12px] bg-pine-soft text-pine-deep transition-colors group-hover:bg-pine group-hover:text-cream">
          <Icon aria-hidden className="size-5" strokeWidth={1.75} />
        </span>
        {count !== undefined && (
          <span className="font-display text-heading text-fg tabular-nums" dir="ltr">
            {count}
          </span>
        )}
      </div>
      <h3 className="mt-4 text-body font-semibold text-fg">{t(title)}</h3>
      <p className="mt-1 text-body-sm text-fg-muted">{t(body)}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-caption font-semibold text-pine-deep">
        {t('coach.open')}
        <ArrowRight
          aria-hidden
          className="icon-directional size-3.5 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
        />
      </span>
    </Link>
  )
}

export function CoachDashboard() {
  const t = useT()
  const { data } = useCoachContext()
  const trainees = useTrainees()
  const templates = useTemplates()

  const activeTrainees = trainees.data?.filter((tr) => tr.revoked_at === null).length

  return (
    <CoachLayout>
      <PageHeader
        eyebrow={t('coach.dashboard.title')}
        title={t('coach.greeting', { name: data?.profile.display_name ?? '' })}
      />

      {/* The gym, on steel — the one dark block on this screen, so it anchors the page. */}
      <section className="relative mt-8 overflow-hidden rounded-special bg-surface-inverse p-6 text-on-inverse shadow-raised sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 end-[-60px] size-72 rounded-full bg-pine/30 blur-3xl"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="flex items-center gap-4">
            <GymAvatar name={data?.gym?.name ?? ''} logoPath={data?.gym?.logo_path} className="size-16" />
            <div>
              <p className="text-caption font-semibold tracking-wide text-copper uppercase">
                {t('coach.gymLabel')}
              </p>
              <p className="font-display text-heading text-on-inverse">{data?.gym?.name}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/coach/settings"
            className="flex items-center gap-1.5 rounded-pill bg-cream px-3.5 py-1.5 text-caption font-semibold text-steel transition-colors hover:bg-paper"
          >
            <Pencil aria-hidden className="size-3.5" />
            {t('settings.edit')}
          </Link>
          {data?.gym?.timezone && (
            <p className="flex items-center gap-2 rounded-pill bg-cream/10 px-3.5 py-1.5 text-caption text-on-inverse-muted" dir="ltr">
              <Clock aria-hidden className="size-3.5" />
              {data.gym.timezone}
            </p>
          )}
          </div>
        </div>
      </section>

      <h2 className="mt-10 mb-4 text-caption font-semibold tracking-wide text-fg-muted uppercase">
        {t('coach.quick.title')}
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        <QuickLink
          to="/coach/trainees"
          icon={Users}
          title="nav.trainees"
          body="coach.quick.trainees"
          count={activeTrainees}
        />
        <QuickLink
          to="/coach/programs"
          icon={ClipboardList}
          title="nav.programs"
          body="coach.quick.programs"
          count={templates.data?.length}
        />
        <QuickLink to="/coach/exercises" icon={Dumbbell} title="nav.exercises" body="coach.quick.exercises" />
      </div>
    </CoachLayout>
  )
}
