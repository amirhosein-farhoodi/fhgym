import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { ImagePlus, Link2, LoaderCircle, RefreshCw, Save, Trash2 } from 'lucide-react'
import { Button, Chip, Field, Input } from '@/components/ui'
import { useCoachContext } from '@/features/auth/useCoach'
import { cn } from '@/lib/cn'
import { CATEGORIES } from '@/lib/exercise-taxonomy'
import { useT } from '@/lib/i18n'
import type { Exercise } from '@/lib/db.types'
import { ACCEPTED_MEDIA, checkMedia, useCreateCustomExercise, type MediaProblem } from './useCustomExercise'

const TEXTAREA =
  'w-full rounded-[12px] border border-line-strong bg-surface-raised px-4 py-3 text-body text-fg shadow-[inset_0_1px_2px_rgb(43_47_51/0.06)] placeholder:text-fg-subtle hover:border-steel/30 focus:border-accent focus:ring-4 focus:ring-pine/15 focus:outline-none'

/** Tap-or-drop picker with a live preview. The file is only uploaded on save. */
function MediaPicker({ file, onFile }: { file: File | null; onFile: (file: File | null) => void }) {
  const t = useT()
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [problem, setProblem] = useState<MediaProblem | null>(null)
  const [dragging, setDragging] = useState(false)
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview])

  function accept(candidate: File | undefined) {
    if (!candidate) return
    const issue = checkMedia(candidate)
    setProblem(issue)
    if (!issue) onFile(candidate)
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-body-sm font-semibold">{t('exercises.upload.title')}</span>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED_MEDIA.join(',')}
        className="sr-only"
        onChange={(event) => {
          accept(event.target.files?.[0])
          event.target.value = ''
        }}
      />

      {file && preview ?
        <div className="flex items-center gap-4 rounded-card border border-line bg-surface-raised p-3">
          <img src={preview} alt="" className="size-24 shrink-0 rounded-[12px] bg-paper object-contain ring-1 ring-line/60" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-sm font-semibold">{file.name}</p>
            <p className="text-caption text-fg-muted" dir="ltr">
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
                <RefreshCw aria-hidden />
                {t('exercises.upload.replace')}
              </Button>
              <Button size="sm" variant="ghost" className="hover:text-danger" onClick={() => onFile(null)}>
                <Trash2 aria-hidden />
                {t('exercises.upload.remove')}
              </Button>
            </div>
          </div>
        </div>
      : <label
          htmlFor={inputId}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            accept(event.dataTransfer.files?.[0])
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center gap-2 rounded-card border-2 border-dashed px-4 py-8 text-center transition-colors',
            dragging ? 'border-pine bg-pine-soft' : 'border-line-strong bg-surface-raised hover:border-pine/60',
          )}
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-sage-soft text-pine-deep">
            <ImagePlus aria-hidden className="size-6" strokeWidth={1.75} />
          </span>
          <span className="text-body-sm font-semibold text-fg">{t('exercises.upload.cta')}</span>
          <span className="text-caption text-fg-muted">{t('exercises.upload.hint')}</span>
        </label>
      }

      {problem && (
        <p role="alert" className="text-caption text-danger">
          {t(problem === 'tooBig' ? 'exercises.upload.tooBig' : 'exercises.upload.badType')}
        </p>
      )}
    </div>
  )
}

/**
 * The custom-exercise form, shared by the full page and the program builder's picker, so a
 * coach can invent a movement mid-program without losing their place.
 */
export function CustomExerciseForm({
  onCreated,
  onCancel,
  autoFocus = true,
}: {
  onCreated: (exercise: Exercise) => void
  onCancel: () => void
  autoFocus?: boolean
}) {
  const t = useT()
  const { data: coach } = useCoachContext()
  const create = useCreateCustomExercise()

  const [name, setName] = useState('')
  const [nameFa, setNameFa] = useState('')
  const [equipment, setEquipment] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [showLink, setShowLink] = useState(false)
  const [gifUrl, setGifUrl] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [instructions, setInstructions] = useState('')

  const trimmed = name.trim()
  const canSubmit = trimmed.length >= 2 && categories.length > 0 && !create.isPending

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    // Inside the picker this form sits within another dialog; keep the submit local.
    event.stopPropagation()
    if (!canSubmit || !coach?.gym) return

    create.mutate(
      {
        gymId: coach.gym.id,
        name: trimmed,
        nameFa: nameFa.trim() || null,
        categories,
        equipments: equipment.trim() ? [equipment.trim().toLowerCase()] : [],
        file,
        gifUrl: gifUrl.trim() || null,
        // One step per line — the same shape the seeded catalog uses, so both render alike.
        instructions: instructions
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      },
      { onSuccess: onCreated },
    )
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
      <Field label={t('exercises.custom.name')}>
        {({ id }) => (
          <Input
            id={id}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('exercises.custom.namePlaceholder')}
            maxLength={160}
            autoFocus={autoFocus}
          />
        )}
      </Field>

      <Field label={t('exercises.custom.nameFa')}>
        {({ id }) => (
          <Input
            id={id}
            value={nameFa}
            onChange={(event) => setNameFa(event.target.value)}
            placeholder={t('exercises.custom.nameFaPlaceholder')}
            // auto: right-aligned once Persian is typed, without forcing an English placeholder right.
            dir="auto"
          />
        )}
      </Field>

      <div className="flex flex-col gap-2">
        <span className="text-body-sm font-semibold">{t('exercises.custom.categories')}</span>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <Chip
              key={category}
              active={categories.includes(category)}
              onClick={() =>
                setCategories((prev) =>
                  prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
                )
              }
            >
              {category}
            </Chip>
          ))}
        </div>
      </div>

      <Field label={t('exercises.custom.equipment')}>
        {({ id }) => (
          <Input id={id} value={equipment} onChange={(event) => setEquipment(event.target.value)} placeholder={t('exercises.custom.equipmentPlaceholder')} />
        )}
      </Field>

      <MediaPicker file={file} onFile={setFile} />

      {!file &&
        (showLink ?
          <Field label={t('exercises.custom.media')} hint={t('exercises.custom.mediaHint')}>
            {({ id, describedBy }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                value={gifUrl}
                onChange={(event) => setGifUrl(event.target.value)}
                dir="ltr"
                // A URL shape, not a word — the same in every language.
                placeholder="https://…"
              />
            )}
          </Field>
        : <button
            type="button"
            onClick={() => setShowLink(true)}
            className="-mt-2 inline-flex items-center gap-1.5 self-start text-caption font-semibold text-pine-deep hover:underline"
          >
            <Link2 aria-hidden className="size-3.5" />
            {t('exercises.upload.orLink')}
          </button>)}

      <Field label={t('exercises.custom.instructions')} hint={t('exercises.custom.instructionsHint')}>
        {({ id, describedBy }) => (
          <textarea
            id={id}
            aria-describedby={describedBy}
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            rows={4}
            className={TEXTAREA}
          />
        )}
      </Field>

      {create.isError && (
        <p role="alert" className="text-caption text-danger">
          {t('error.generic.body')}
        </p>
      )}

      <div className="flex gap-2 border-t border-line/70 pt-5">
        <Button type="submit" disabled={!canSubmit}>
          {create.isPending ?
            <LoaderCircle aria-hidden className="animate-spin" />
          : <Save aria-hidden />}
          {create.isPending && file ? t('exercises.upload.uploading') : t('action.save')}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('action.cancel')}
        </Button>
      </div>
    </form>
  )
}
