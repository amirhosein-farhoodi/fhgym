import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, SquarePlus } from 'lucide-react'
import { Card, PageHeader } from '@/components/ui'
import { CoachLayout } from '@/components/CoachLayout'
import { CustomExerciseForm } from '@/features/exercises/CustomExerciseForm'
import { useT } from '@/lib/i18n'

/**
 * A coach's own movement — the machine their gym has that the global catalog does not,
 * or a cue they prescribe by a name their trainees recognise. The same form is available
 * inside the program builder's exercise picker.
 */
export function NewExercise() {
  const t = useT()
  const navigate = useNavigate()

  return (
    <CoachLayout>
      <Link
        to="/coach/exercises"
        className="mb-4 inline-flex items-center gap-1.5 text-caption font-semibold text-fg-muted hover:text-fg"
      >
        <ChevronLeft aria-hidden className="icon-directional size-4" />
        {t('nav.exercises')}
      </Link>
      <PageHeader
        icon={SquarePlus}
        title={t('exercises.custom.title')}
        description={t('exercises.custom.hint')}
      />

      <Card className="mt-8 max-w-2xl">
        <CustomExerciseForm
          onCreated={() => void navigate('/coach/exercises')}
          onCancel={() => void navigate('/coach/exercises')}
        />
      </Card>
    </CoachLayout>
  )
}
