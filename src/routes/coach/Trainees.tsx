import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Ban,
  CircleCheck,
  ClipboardList,
  Phone,
  QrCode,
  Search,
  SearchX,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react'
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader } from '@/components/ui'
import { CoachLayout } from '@/components/CoachLayout'
import { InlineSpinner } from '@/components/Feedback'
import { cn } from '@/lib/cn'
import { QrDialog } from '@/features/trainees/QrDialog'
import {
  useCreateTrainee,
  useReactivateTrainee,
  useRevokeTrainee,
  useRotateToken,
  useTrainees,
} from '@/features/trainees/useTrainees'
import { useCoachContext } from '@/features/auth/useCoach'
import { useT } from '@/lib/i18n'

/** Two letters for the avatar disc; works for Persian names too (first letter of each word). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

/**
 * Folds the ways the same name or number gets typed on Iranian keyboards into one form:
 * Arabic ي/ك vs Persian ی/ک, Persian and Arabic digits vs Latin, the zero-width
 * non-joiner, case and extra spaces. "رضا احمدي" finds "رضا احمدی"; "۰۹۱۲" finds "0912".
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/\u200c/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const digitsOnly = (text: string) => normalize(text).replace(/\D/g, '')

interface QrTarget {
  name: string
  token: string
}

export function Trainees() {
  const t = useT()
  const { data: coach } = useCoachContext()
  const trainees = useTrainees()

  const createTrainee = useCreateTrainee()
  const rotateToken = useRotateToken()
  const revokeTrainee = useRevokeTrainee()
  const reactivate = useReactivateTrainee()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [qr, setQr] = useState<QrTarget | null>(null)
  const [query, setQuery] = useState('')

  // Client-side: a coach has tens of trainees, at most a few hundred, all already loaded.
  const visible = useMemo(() => {
    const list = trainees.data ?? []
    const q = normalize(query)
    if (!q) return list
    const words = q.split(' ')
    const qDigits = digitsOnly(query)
    return list.filter((trainee) => {
      const name = normalize(trainee.full_name)
      if (words.every((word) => name.includes(word))) return true
      return qDigits.length >= 3 && digitsOnly(trainee.phone ?? '').includes(qDigits)
    })
  }, [trainees.data, query])

  const trimmed = name.trim()
  const canSubmit = trimmed.length >= 2 && !createTrainee.isPending

  function handleCreate(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return

    createTrainee.mutate(
      { full_name: trimmed, phone: phone.trim() || null },
      {
        onSuccess: (result) => {
          // Straight into the QR dialog: this is the only moment the token exists in
          // readable form, so the coach must not have to go looking for it.
          setQr({ name: trimmed, token: result.access_token })
          setName('')
          setPhone('')
        },
      },
    )
  }

  return (
    <CoachLayout>
      <PageHeader icon={Users} eyebrow={t('nav.dashboard')} title={t('nav.trainees')} />

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="lg:sticky lg:top-24">
          <h2 className="flex items-center gap-2 text-body font-semibold">
            <UserPlus aria-hidden className="size-[18px] text-pine" />
            {t('trainees.add.title')}
          </h2>
          <form className="mt-5 flex flex-col gap-4" onSubmit={handleCreate} noValidate>
            <Field label={t('trainees.field.name')}>
              {({ id }) => (
                <Input
                  id={id}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('trainees.field.namePlaceholder')}
                  maxLength={80}
                />
              )}
            </Field>

            <Field label={t('trainees.field.phone')}>
              {({ id }) => (
                <Input
                  id={id}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  inputMode="tel"
                />
              )}
            </Field>

            {createTrainee.isError && (
              <p role="alert" className="text-caption text-danger">
                {t('error.generic.body')}
              </p>
            )}

            <Button type="submit" disabled={!canSubmit} fullWidth>
              <QrCode aria-hidden />
              {t('trainees.add.submit')}
            </Button>
          </form>
        </Card>

        <div>
          {trainees.isPending && <InlineSpinner />}

          {trainees.isSuccess && trainees.data.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative min-w-0 flex-1 sm:max-w-sm">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute start-3.5 top-1/2 size-[18px] -translate-y-1/2 text-fg-subtle"
                />
                <Input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('trainees.search.placeholder')}
                  aria-label={t('trainees.search.placeholder')}
                  className="ps-10"
                />
              </div>
              <p className="text-caption text-fg-muted tabular-nums" aria-live="polite">
                {query ?
                  t('trainees.search.count', { shown: visible.length, total: trainees.data.length })
                : t('trainees.search.total', { total: trainees.data.length })}
              </p>
            </div>
          )}

          {trainees.isSuccess && trainees.data.length > 0 && visible.length === 0 && (
            <EmptyState
              icon={SearchX}
              title={t('trainees.search.noResults')}
              action={
                <Button size="sm" variant="secondary" onClick={() => setQuery('')}>
                  {t('exercises.clearFilters')}
                </Button>
              }
            />
          )}

          {trainees.isSuccess && trainees.data.length === 0 && (
            <EmptyState
              icon={Users}
              title={t('state.empty.trainees.title')}
              body={t('state.empty.trainees.body')}
            />
          )}

          <ul className="grid gap-4 xl:grid-cols-2">
            {visible.map((trainee) => {
              const revoked = trainee.revoked_at !== null
              return (
                <li key={trainee.id}>
                  <Card className={cn('flex h-full flex-col gap-4', revoked && 'opacity-75')}>
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className={cn(
                          'flex size-11 shrink-0 items-center justify-center rounded-full font-display text-subheading',
                          revoked ? 'bg-surface-sunken text-fg-muted' : 'bg-steel text-sage',
                        )}
                      >
                        {initials(trainee.full_name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body font-semibold">{trainee.full_name}</p>
                        {trainee.phone && (
                          <p className="mt-0.5 flex items-center gap-1.5 text-caption text-fg-muted" dir="ltr">
                            <Phone aria-hidden className="size-3" />
                            {trainee.phone}
                          </p>
                        )}
                      </div>
                      <Badge tone={revoked ? 'danger' : 'done'}>
                        {revoked ? <Ban aria-hidden /> : <CircleCheck aria-hidden />}
                        {revoked ? t('trainees.status.revoked') : t('trainees.status.active')}
                      </Badge>
                    </div>

                    <div className="mt-auto flex flex-wrap gap-2 border-t border-line/70 pt-4">
                      <Link to={`/coach/trainees/${trainee.id}/program`}>
                        <Button size="sm">
                          <ClipboardList aria-hidden />
                          {t('trainees.action.program')}
                        </Button>
                      </Link>

                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={rotateToken.isPending}
                        onClick={() =>
                          rotateToken.mutate(trainee.id, {
                            onSuccess: (token) => setQr({ name: trainee.full_name, token }),
                          })
                        }
                      >
                        <QrCode aria-hidden />
                        {t('trainees.action.newQr')}
                      </Button>

                      {revoked ?
                        <Button size="sm" variant="ghost" onClick={() => reactivate.mutate(trainee.id)}>
                          <UserCheck aria-hidden />
                          {t('trainees.action.reactivate')}
                        </Button>
                      : <Button
                          size="sm"
                          variant="ghost"
                          className="hover:text-danger"
                          onClick={() => {
                            if (window.confirm(t('trainees.action.revokeConfirm'))) {
                              revokeTrainee.mutate(trainee.id)
                            }
                          }}
                        >
                          <UserX aria-hidden />
                          {t('trainees.action.revoke')}
                        </Button>
                      }
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      {qr && (
        <QrDialog
          traineeName={qr.name}
          token={qr.token}
          gymName={coach?.gym?.name ?? ''}
          gymLogo={coach?.gym?.logo_path ?? null}
          onClose={() => setQr(null)}
        />
      )}
    </CoachLayout>
  )
}
