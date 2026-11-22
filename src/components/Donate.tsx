import { useEffect, useState } from 'react'
import { Check, Copy, Heart, Wallet } from 'lucide-react'
import { Button, Segmented } from '@/components/ui'
import { useT } from '@/lib/i18n'
import type { TranslationKey } from '@/lib/i18n'
import { DONATE_AMOUNTS, DONATE_NETWORKS, NoWalletError, RejectedError, sendTip, type DonateNetwork } from '@/lib/donate'

type Status =
  | { kind: 'idle' }
  | { kind: 'working'; step: string }
  | { kind: 'sent'; hash: string }
  | { kind: 'error'; message: string }

const STEP_KEYS: Record<string, TranslationKey> = {
  connect: 'donate.step.connect',
  switch: 'donate.step.switch',
  confirm: 'donate.step.confirm',
}

/*
 * A quiet tip card for the landing page: plaster card on cream, copper heart as the one
 * accent. Optional by design — nothing in the app is locked behind it.
 */
export function Donate() {
  const t = useT()
  const [netId, setNetId] = useState<DonateNetwork['id']>('eth')
  const [amount, setAmount] = useState<number>(3)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [copied, setCopied] = useState(false)

  const net = DONATE_NETWORKS.find((n) => n.id === netId) ?? DONATE_NETWORKS[0]!
  const busy = status.kind === 'working'

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(net.address)
      setCopied(true)
    } catch {
      window.prompt(t('donate.copy'), net.address)
    }
  }

  async function pay() {
    try {
      const hash = await sendTip(net, amount, (step) => setStatus({ kind: 'working', step }))
      setStatus({ kind: 'sent', hash })
    } catch (e) {
      if (e instanceof RejectedError) return setStatus({ kind: 'idle' })
      const message =
        e instanceof NoWalletError ?
          t(net.id === 'eth' ? 'donate.noMetamask' : 'donate.noTronlink')
        : (e as Error).message
      setStatus({ kind: 'error', message })
    }
  }

  return (
    <section aria-labelledby="donate-title" className="mx-auto max-w-page px-4 py-section sm:px-6">
      <div className="grid gap-8 rounded-special border border-line/70 bg-surface-card p-7 shadow-card md:grid-cols-[1fr_1.2fr] md:p-9">
        <div>
          <span className="flex size-11 items-center justify-center rounded-[12px] bg-copper-soft text-copper-deep">
            <Heart aria-hidden className="size-5" strokeWidth={1.75} />
          </span>
          <h2 id="donate-title" className="mt-4 font-display text-heading-sm text-fg">
            {t('donate.title')}
          </h2>
          <p className="mt-2 max-w-sm text-body-sm text-fg-muted">{t('donate.body')}</p>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-caption font-semibold tracking-wide text-fg-muted uppercase">
                {t('donate.amount')}
              </span>
              <Segmented
                label={t('donate.amount')}
                options={DONATE_AMOUNTS}
                value={amount as (typeof DONATE_AMOUNTS)[number]}
                onChange={(a) => {
                  setAmount(a)
                  setStatus({ kind: 'idle' })
                }}
                render={(a) => <span dir="ltr">${a}</span>}
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-caption font-semibold tracking-wide text-fg-muted uppercase">
                {t('donate.network')}
              </span>
              <Segmented
                label={t('donate.network')}
                options={DONATE_NETWORKS.map((n) => n.id)}
                value={netId}
                onChange={(id) => {
                  setNetId(id)
                  setStatus({ kind: 'idle' })
                }}
                render={(id) => {
                  const n = DONATE_NETWORKS.find((x) => x.id === id)!
                  return (
                    <span dir="ltr">
                      {n.label} <small className="opacity-70">{n.short}</small>
                    </span>
                  )
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-card border border-line bg-surface-sunken/60 py-1.5 ps-4 pe-1.5">
            <code dir="ltr" title={net.address} className="min-w-0 flex-1 truncate font-mono text-caption text-fg">
              {net.address}
            </code>
            <Button variant="secondary" size="sm" onClick={() => void copyAddress()}>
              {copied ?
                <Check aria-hidden />
              : <Copy aria-hidden />}
              {copied ? t('donate.copied') : t('donate.copy')}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button onClick={() => void pay()} disabled={busy}>
              <Wallet aria-hidden />
              {busy ? t('donate.waiting') : t('donate.send', { amount, wallet: net.wallet })}
            </Button>
            <span className="max-w-xs text-caption text-fg-muted">
              {t(net.id === 'eth' ? 'donate.note.eth' : 'donate.note.tron')}
            </span>
          </div>

          <div aria-live="polite" className="text-body-sm">
            {status.kind === 'working' && <p className="text-fg-muted">{t(STEP_KEYS[status.step] ?? 'donate.waiting')}</p>}
            {status.kind === 'sent' && (
              <p className="text-pine-deep">
                {t('donate.thanks')}{' '}
                <a
                  href={net.explorer + status.hash}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-semibold underline decoration-copper underline-offset-4"
                >
                  {t('donate.viewTx')}
                </a>
              </p>
            )}
            {status.kind === 'error' && (
              <p role="alert" className="text-danger">
                {status.message}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
