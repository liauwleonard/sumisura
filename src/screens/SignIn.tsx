import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useSettings } from '../i18n'
import { Button, Card, Field, inputClass } from '../components/ui'

export function SignIn() {
  const { t } = useSettings()
  const { sendLink } = useAuth()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!email.trim()) return
    setState('sending')
    setError(null)
    const { error } = await sendLink(email)
    if (error) {
      setError(error)
      setState('idle')
      return
    }
    setState('sent')
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center p-6">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t('app')}</h1>
        <p className="text-sm text-stone-500">{t('tagline')}</p>
      </div>

      {state === 'sent' ? (
        <Card className="space-y-3 text-center">
          <p className="font-medium">{t('linkSent')}</p>
          <p className="text-sm text-stone-600">{t('linkSentDetail', { email })}</p>
          <Button onClick={() => setState('idle')}>{t('useAnotherEmail')}</Button>
        </Card>
      ) : (
        <Card className="space-y-4">
          <Field label={t('email')} hint={t('signInHint')}>
            <input
              autoFocus
              type="email"
              inputMode="email"
              autoComplete="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </Field>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {t('signInError')} {error}
            </p>
          )}

          <Button
            variant="primary"
            className="w-full"
            disabled={state === 'sending' || !email.trim()}
            onClick={submit}
          >
            {state === 'sending' ? t('sending') : t('sendLink')}
          </Button>
        </Card>
      )}
    </div>
  )
}
