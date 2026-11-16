import { useMemo, useRef, useState, type FormEvent } from 'react'
import { Building2, Check, ImagePlus, LoaderCircle, Save, Smartphone, Store, Trash2, UserRound } from 'lucide-react'
import { Button, Card, Field, Input, PageHeader } from '@/components/ui'
import { CoachLayout } from '@/components/CoachLayout'
import { useCoachContext } from '@/features/auth/useCoach'
import {
  checkBrandImage,
  uploadBrandImage,
  useUpdateGym,
  useUpdateProfile,
} from '@/features/branding/brand'
import { CoachAvatar, GymAvatar } from '@/features/branding/GymAvatar'
import { ACCEPTED_MEDIA } from '@/features/exercises/useCustomExercise'
import { useT } from '@/lib/i18n'

/** Picked-but-not-yet-saved image: a local preview until the coach presses Save. */
type Pending = { file: File; preview: string } | 'remove' | null

function ImageField({
  label,
  hint,
  pending,
  onPick,
  onRemove,
  hasImage,
  children,
}: {
  label: string
  hint?: string
  pending: Pending
  onPick: (file: File) => void
  onRemove: () => void
  hasImage: boolean
  children: React.ReactNode
}) {
  const t = useT()
  const inputRef = useRef<HTMLInputElement>(null)
  const [problem, setProblem] = useState<'badType' | 'tooBig' | null>(null)

  return (
    <div className="flex flex-col gap-2">
      <span className="text-body-sm font-semibold">{label}</span>
      <div className="flex items-center gap-4">
        {children}
        <div className="flex flex-col items-start gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_MEDIA.join(',')}
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (!file) return
              const issue = checkBrandImage(file)
              setProblem(issue)
              if (!issue) onPick(file)
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
              <ImagePlus aria-hidden />
              {hasImage ? t('settings.change') : t('settings.upload')}
            </Button>
            {hasImage && pending !== 'remove' && (
              <Button size="sm" variant="ghost" className="hover:text-danger" onClick={onRemove}>
                <Trash2 aria-hidden />
                {t('settings.remove')}
              </Button>
            )}
          </div>
        </div>
      </div>
      {hint && <p className="text-caption text-fg-muted">{hint}</p>}
      {problem && (
        <p role="alert" className="text-caption text-danger">
          {t(problem === 'tooBig' ? 'exercises.upload.tooBig' : 'exercises.upload.badType')}
        </p>
      )}
    </div>
  )
}

/**
 * The gym's public face. Everything here is what a trainee sees on their phone and on their
 * home screen; our own name is reduced to a "Powered by" line.
 */
export function Settings() {
  const t = useT()
  const { data } = useCoachContext()
  const gym = data?.gym
  const profile = data?.profile

  const updateGym = useUpdateGym()
  const updateProfile = useUpdateProfile()

  const [gymName, setGymName] = useState(gym?.name ?? '')
  const [coachName, setCoachName] = useState(profile?.display_name ?? '')
  const [title, setTitle] = useState(profile?.title ?? '')
  const [logo, setLogo] = useState<Pending>(null)
  const [photo, setPhoto] = useState<Pending>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [failed, setFailed] = useState(false)

  const pick = (set: (p: Pending) => void) => (file: File) => {
    set({ file, preview: URL.createObjectURL(file) })
    setSaved(false)
  }

  // What the preview shows: the pending pick, else the saved value.
  const logoShown = logo === 'remove' ? null : logo ? logo.preview : (gym?.logo_path ?? null)
  const photoShown = photo === 'remove' ? null : photo ? photo.preview : (profile?.avatar_url ?? null)
  const nameShown = gymName.trim() || gym?.name || ''

  const dirty = useMemo(
    () =>
      logo !== null ||
      photo !== null ||
      gymName.trim() !== (gym?.name ?? '') ||
      coachName.trim() !== (profile?.display_name ?? '') ||
      title.trim() !== (profile?.title ?? ''),
    [logo, photo, gymName, coachName, title, gym, profile],
  )

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    if (!gym || saving) return
    const trimmedGym = gymName.trim()
    if (trimmedGym.length < 2 || trimmedGym.length > 80) return

    setSaving(true)
    setFailed(false)
    try {
      const logoPath =
        logo === 'remove' ? null
        : logo ? await uploadBrandImage(gym.id, 'logo', logo.file)
        : gym.logo_path
      const photoPath =
        photo === 'remove' ? null
        : photo ? await uploadBrandImage(gym.id, 'coach', photo.file)
        : (profile?.avatar_url ?? null)

      await updateGym.mutateAsync({ gymId: gym.id, patch: { name: trimmedGym, logo_path: logoPath } })
      await updateProfile.mutateAsync({
        display_name: coachName.trim() || null,
        title: title.trim() || null,
        avatar_url: photoPath,
      })
      setLogo(null)
      setPhoto(null)
      setSaved(true)
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <CoachLayout>
      <PageHeader icon={Store} eyebrow={t('nav.settings')} title={t('settings.title')} description={t('settings.subtitle')} />

      <form onSubmit={(event) => void handleSave(event)} className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_340px]" noValidate>
        <div className="flex flex-col gap-6">
          <Card>
            <h2 className="mb-5 flex items-center gap-2 text-body font-semibold">
              <Building2 aria-hidden className="size-[18px] text-pine" />
              {t('settings.gym.section')}
            </h2>
            <div className="flex flex-col gap-5">
              <ImageField
                label={t('settings.gym.logo')}
                hint={logoShown ? t('settings.gym.logoHint') : t('settings.gym.noLogo')}
                pending={logo}
                hasImage={Boolean(logoShown)}
                onPick={pick(setLogo)}
                onRemove={() => {
                  setLogo('remove')
                  setSaved(false)
                }}
              >
                <GymAvatar name={nameShown} logoPath={logoShown} className="size-20" />
              </ImageField>

              <Field label={t('settings.gym.name')}>
                {({ id }) => (
                  <Input id={id} value={gymName} maxLength={80} onChange={(e) => setGymName(e.target.value)} />
                )}
              </Field>
            </div>
          </Card>

          <Card>
            <h2 className="mb-5 flex items-center gap-2 text-body font-semibold">
              <UserRound aria-hidden className="size-[18px] text-pine" />
              {t('settings.coach.section')}
            </h2>
            <div className="flex flex-col gap-5">
              <ImageField
                label={t('settings.coach.photo')}
                pending={photo}
                hasImage={Boolean(photoShown)}
                onPick={pick(setPhoto)}
                onRemove={() => {
                  setPhoto('remove')
                  setSaved(false)
                }}
              >
                <CoachAvatar name={coachName} url={photoShown} className="size-20" />
              </ImageField>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={t('settings.coach.name')}>
                  {({ id }) => (
                    <Input
                      id={id}
                      value={coachName}
                      maxLength={80}
                      placeholder={t('settings.coach.namePlaceholder')}
                      onChange={(e) => setCoachName(e.target.value)}
                    />
                  )}
                </Field>
                <Field label={t('settings.coach.title')}>
                  {({ id }) => (
                    <Input
                      id={id}
                      value={title}
                      maxLength={60}
                      placeholder={t('settings.coach.titlePlaceholder')}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  )}
                </Field>
              </div>
            </div>
          </Card>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={!dirty || saving || gymName.trim().length < 2}>
              {saving ?
                <LoaderCircle aria-hidden className="animate-spin" />
              : <Save aria-hidden />}
              {t('settings.save')}
            </Button>
            {saved && !dirty && (
              <span role="status" className="flex items-center gap-1.5 text-body-sm font-semibold text-pine-deep">
                <Check aria-hidden className="size-4" />
                {t('settings.saved')}
              </span>
            )}
            {failed && (
              <p role="alert" className="text-body-sm text-danger">
                {t('error.generic.body')}
              </p>
            )}
          </div>
        </div>

        {/* Live preview of the trainee's header, so the coach sees exactly what they ship. */}
        <aside className="lg:sticky lg:top-24">
          <p className="mb-3 flex items-center gap-2 text-caption font-semibold tracking-wide text-fg-muted uppercase">
            <Smartphone aria-hidden className="size-4" />
            {t('settings.preview')}
          </p>
          <div className="overflow-hidden rounded-[28px] border-[6px] border-steel bg-surface shadow-raised">
            <div className="flex items-center gap-2.5 border-b border-line/80 bg-cream px-4 py-3">
              <GymAvatar name={nameShown} logoPath={logoShown} className="size-8" />
              <span className="truncate font-display text-body text-fg">{nameShown}</span>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3 rounded-card border border-line/70 bg-surface-card p-3 shadow-card">
                <GymAvatar name={nameShown} logoPath={logoShown} className="size-12" />
                <div className="min-w-0">
                  <p className="text-body-sm font-semibold">{t('trainee.hello', { name: '…' })}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <CoachAvatar name={coachName} url={photoShown} className="size-5" />
                    <p className="truncate text-caption text-fg-muted">
                      <span className="font-semibold text-fg">{coachName || '—'}</span>
                      {title && <> · {title}</>}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="h-14 rounded-card bg-surface-inverse" />
                <div className="h-12 rounded-card border border-line/70 bg-surface-card" />
                <div className="h-12 rounded-card border border-line/70 bg-surface-card" />
              </div>
              <p className="mt-4 text-center text-[0.6rem] text-fg-subtle">
                {t('trainee.poweredBy')} <span className="font-semibold">FH Gym Assistant</span>
              </p>
            </div>
          </div>

          {/* Home-screen icon preview. */}
          <div className="mt-5 flex items-center gap-3">
            <GymAvatar name={nameShown} logoPath={logoShown} className="size-14 shadow-card" />
            <span className="max-w-24 truncate text-caption font-semibold">{nameShown}</span>
          </div>
        </aside>
      </form>
    </CoachLayout>
  )
}
