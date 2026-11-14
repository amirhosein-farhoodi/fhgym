import { Badge, Button } from '@/components/ui'
import { exerciseImageUrl } from '@/features/exercises/useExercises'
import { exerciseName } from '@/features/exercises/name'
import { cn } from '@/lib/cn'
import { useI18n, useT } from '@/lib/i18n'
import type { ProgramExercise, ProgramExerciseWithExercise } from '@/lib/db.types'

/** Compact numeric input; the builder is a dense grid of these. */
function NumberCell({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  width = 'w-16',
}: {
  label: string
  value: number | null
  onChange: (value: number | null) => void
  min?: number
  max?: number
  width?: string
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-caption text-muted-dark">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        dir="ltr"
        min={min}
        max={max}
        value={value ?? ''}
        onChange={(event) => {
          const raw = event.target.value
          onChange(raw === '' ? null : Number(raw))
        }}
        className={cn(
          width,
          'rounded-tag border border-line-dark bg-white/6 px-2 py-1.5 text-body-sm text-on-dark',
          'text-center focus:border-accent focus:outline-none',
        )}
      />
    </label>
  )
}

export interface ExerciseRowProps {
  item: ProgramExerciseWithExercise
  index: number
  count: number
  onPatch: (patch: Partial<ProgramExercise>) => void
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
}

export function ExerciseRow({ item, index, count, onPatch, onRemove, onMove }: ExerciseRowProps) {
  const t = useT()
  const { locale } = useI18n()
  const src = exerciseImageUrl(item.exercise)

  return (
    <li className="rounded-card bg-white/5 p-3">
      <div className="flex items-start gap-3">
        <span className="size-14 shrink-0 overflow-hidden rounded-[8px] bg-white">
          {src && <img src={src} alt="" loading="lazy" className="h-full w-full object-contain" />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-body-sm font-medium">{exerciseName(item.exercise, locale)}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {item.exercise.equipments.slice(0, 1).map((equipment) => (
              <Badge key={equipment} tone="neutral" className="capitalize">
                {equipment}
              </Badge>
            ))}
            {item.superset_group !== null && (
              <Badge tone="due">
                {t('builder.superset')} {item.superset_group}
              </Badge>
            )}
          </div>
        </div>

        {/*
          Up/down buttons rather than drag-and-drop. This list is used on a phone, on a gym
          floor, in both reading directions — and arrows work with touch, keyboard and screen
          readers without any of the RTL pointer-maths that drag libraries get wrong.
        */}
        <div className="flex shrink-0 flex-col gap-1">
          <button
            type="button"
            aria-label={t('builder.moveUp')}
            disabled={index === 0}
            onClick={() => onMove(-1)}
            className="rounded-tag bg-white/8 px-2 py-0.5 text-caption disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            aria-label={t('builder.moveDown')}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
            className="rounded-tag bg-white/8 px-2 py-0.5 text-caption disabled:opacity-30"
          >
            ↓
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <NumberCell
          label={t('builder.sets')}
          value={item.sets}
          onChange={(value) => onPatch({ sets: value })}
          max={20}
        />
        <NumberCell
          label={t('builder.repsMin')}
          value={item.reps_min}
          onChange={(value) => onPatch({ reps_min: value })}
        />
        <NumberCell
          label={t('builder.repsMax')}
          value={item.reps_max}
          onChange={(value) => onPatch({ reps_max: value })}
        />
        <NumberCell
          label={t('builder.weight')}
          value={item.weight}
          onChange={(value) => onPatch({ weight: value })}
        />
        <NumberCell
          label={t('builder.rest')}
          value={item.rest_seconds}
          onChange={(value) => onPatch({ rest_seconds: value })}
          width="w-20"
          max={600}
        />
        <NumberCell
          label={t('builder.supersetGroup')}
          value={item.superset_group}
          onChange={(value) => onPatch({ superset_group: value })}
          max={9}
        />

        <label className="flex min-w-40 flex-1 flex-col gap-1">
          <span className="text-caption text-muted-dark">{t('builder.note')}</span>
          <input
            value={item.notes ?? ''}
            onChange={(event) => onPatch({ notes: event.target.value || null })}
            className="rounded-tag border border-line-dark bg-white/6 px-2 py-1.5 text-body-sm text-on-dark focus:border-accent focus:outline-none"
          />
        </label>

        <Button variant="ghost" size="sm" onClick={onRemove}>
          {t('action.delete')}
        </Button>
      </div>
    </li>
  )
}
