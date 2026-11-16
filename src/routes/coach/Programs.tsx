import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ClipboardList, Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Segmented } from '@/components/ui'
import { CoachLayout } from '@/components/CoachLayout'
import { InlineSpinner } from '@/components/Feedback'
import { useCoachContext } from '@/features/auth/useCoach'
import { useCreateProgram, useDeleteProgram, useTemplates } from '@/features/programs/usePrograms'
import { useT } from '@/lib/i18n'

const DAY_OPTIONS = [3, 4, 5, 6] as const

/**
 * The template library: splits the coach writes once and reuses for every trainee.
 * This is what turns the second program from twenty minutes of work into two.
 */
export function Programs() {
  const navigate = useNavigate()
  const t = useT()
  const { data: coach } = useCoachContext()
  const templates = useTemplates()
  const createProgram = useCreateProgram()
  const deleteProgram = useDeleteProgram()

  const [title, setTitle] = useState('')
  const [daysPerWeek, setDaysPerWeek] = useState<number>(4)

  return (
    <CoachLayout>
      <PageHeader
        icon={ClipboardList}
        eyebrow={t('program.template')}
        title={t('nav.programs')}
        description={t('programs.templatesHint')}
      />

      <Card className="mt-8">
        <h2 className="flex items-center gap-2 text-body font-semibold">
          <Plus aria-hidden className="size-[18px] text-pine" />
          {t('programs.newTemplate')}
        </h2>
        <div className="mt-5 flex flex-wrap items-end gap-4">
          <div className="w-full sm:w-72">
            <Field label={t('programs.new.name')}>
              {({ id }) => (
                <Input
                  id={id}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t('programs.new.templatePlaceholder')}
                />
              )}
            </Field>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-body-sm font-semibold">{t('programs.new.daysPerWeek')}</span>
            <Segmented
              options={DAY_OPTIONS}
              value={daysPerWeek as (typeof DAY_OPTIONS)[number]}
              onChange={setDaysPerWeek}
              label={t('programs.new.daysPerWeek')}
            />
          </div>

          <Button
            disabled={createProgram.isPending || !coach?.gym}
            onClick={() => {
              if (!coach?.gym) return
              createProgram.mutate(
                {
                  gymId: coach.gym.id,
                  traineeId: null,
                  isTemplate: true,
                  title: title.trim() || `${daysPerWeek} ${t('programs.dayWeek')}`,
                  daysPerWeek,
                },
                { onSuccess: (program) => void navigate(`/coach/programs/${program.id}`) },
              )
            }}
          >
            <Plus aria-hidden />
            {t('programs.new.create')}
          </Button>
        </div>
      </Card>

      {templates.isPending && <InlineSpinner className="mt-10" />}

      <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.data?.map((template) => (
          <li key={template.id}>
            <Card interactive className="flex h-full flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-pine-soft text-pine-deep">
                  <Layers aria-hidden className="size-5" strokeWidth={1.75} />
                </span>
                <Badge tone="accent">{t('program.template')}</Badge>
              </div>
              <div>
                <p className="text-body font-semibold">{template.title}</p>
                <p className="mt-1 flex items-center gap-1.5 text-caption text-fg-muted">
                  <CalendarDays aria-hidden className="size-3.5" />
                  {template.days_per_week} {t('programs.dayWeek')}
                </p>
              </div>
              <div className="mt-auto flex gap-2 border-t border-line/70 pt-4">
                <Button size="sm" onClick={() => void navigate(`/coach/programs/${template.id}`)}>
                  <Pencil aria-hidden />
                  {t('action.edit')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="hover:text-danger"
                  onClick={() => {
                    if (window.confirm(t('programs.deleteConfirm'))) deleteProgram.mutate(template.id)
                  }}
                >
                  <Trash2 aria-hidden />
                  {t('action.delete')}
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      {templates.isSuccess && templates.data.length === 0 && (
        <EmptyState icon={ClipboardList} title={t('programs.noTemplates')} />
      )}
    </CoachLayout>
  )
}
