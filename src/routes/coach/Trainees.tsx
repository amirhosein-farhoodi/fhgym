import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, Display, Field, Input } from '@/components/ui'
import { CoachLayout } from '@/components/CoachLayout'
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
      <Display size="md" as="h1" className="text-accent">
        {t('nav.trainees')}
      </Display>

      <Card className="mt-8 max-w-xl">
        <h2 className="text-body font-medium">{t('trainees.add.title')}</h2>
        <form className="mt-4 flex flex-col gap-4" onSubmit={handleCreate} noValidate>
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

          <div>
            <Button type="submit" disabled={!canSubmit}>
              {t('trainees.add.submit')}
            </Button>
          </div>
        </form>
      </Card>

      <div className="mt-10">
        {trainees.isPending && <p className="text-body-sm text-muted-dark">{t('state.loading')}</p>}

        {trainees.isSuccess && trainees.data.length === 0 && (
          <Card className="max-w-xl">
            <h3 className="font-display text-heading-sm">{t('state.empty.trainees.title')}</h3>
            <p className="mt-2 text-body-sm text-muted-dark">{t('state.empty.trainees.body')}</p>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {trainees.data?.map((trainee) => {
            const revoked = trainee.revoked_at !== null
            return (
              <Card key={trainee.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-body font-medium">{trainee.full_name}</p>
                    {trainee.phone && (
                      <p className="mt-1 text-caption text-muted-dark" dir="ltr">
                        {trainee.phone}
                      </p>
                    )}
                  </div>
                  <Badge tone={revoked ? 'danger' : 'done'}>
                    {revoked ? t('trainees.status.revoked') : t('trainees.status.active')}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link to={`/coach/trainees/${trainee.id}/program`}>
                    <Button size="sm">{t('trainees.action.program')}</Button>
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
                    {t('trainees.action.newQr')}
                  </Button>

                  {revoked ?
                    <Button size="sm" variant="ghost" onClick={() => reactivate.mutate(trainee.id)}>
                      {t('trainees.action.reactivate')}
                    </Button>
                  : <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (window.confirm(t('trainees.action.revokeConfirm'))) {
                          revokeTrainee.mutate(trainee.id)
                        }
                      }}
                    >
                      {t('trainees.action.revoke')}
                    </Button>
                  }
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {qr && (
        <QrDialog
          traineeName={qr.name}
          token={qr.token}
          gymName={coach?.gym?.name ?? ''}
          onClose={() => setQr(null)}
        />
      )}
    </CoachLayout>
  )
}
