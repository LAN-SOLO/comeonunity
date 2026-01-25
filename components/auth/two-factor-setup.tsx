'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Copy, Check, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

type SetupStep = 'init' | 'qr' | 'verify' | 'recovery'

export function TwoFactorSetup() {
  const router = useRouter()
  const [step, setStep] = useState<SetupStep>('init')
  const [qrCode, setQrCode] = useState<string>('')
  const [code, setCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startSetup = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/2fa/setup')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start setup')
      }

      setQrCode(data.qrCode)
      setStep('qr')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start 2FA setup'
      setError(message)
      toast.error('Failed to start 2FA setup')
    } finally {
      setLoading(false)
    }
  }

  const verifyCode = async () => {
    if (code.length !== 6) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Invalid code')
      }

      if (data.recoveryCodes) {
        setRecoveryCodes(data.recoveryCodes)
        setStep('recovery')
      } else {
        toast.success('2FA verified successfully')
        router.refresh()
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Verification failed'
      setError(message)
      toast.error(message || 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  const copyRecoveryCodes = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Recovery codes copied to clipboard')
    } catch {
      toast.error('Failed to copy codes')
    }
  }

  const downloadRecoveryCodes = () => {
    const content = `ComeOnUnity Recovery Codes
Generated: ${new Date().toISOString()}

Keep these codes safe. Each code can only be used once.

${recoveryCodes.join('\n')}
`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'comeonunity-recovery-codes.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Recovery codes downloaded')
  }

  const finishSetup = () => {
    router.push('/settings/security')
    router.refresh()
  }

  // Step 1: Initial screen
  if (step === 'init') {
    return (
      <Card className="p-6 max-w-md mx-auto">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold">Enable Two-Factor Authentication</h2>
          <p className="text-muted-foreground">
            Add an extra layer of security to your account using an authenticator app
            like Google Authenticator or Authy.
          </p>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button
            onClick={startSetup}
            disabled={loading}
            className="w-full press-effect"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : (
              'Get Started'
            )}
          </Button>
        </div>
      </Card>
    )
  }

  // Step 2: QR Code display
  if (step === 'qr') {
    return (
      <Card className="p-6 max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">Scan QR Code</h2>
          <p className="text-sm text-muted-foreground">
            Open your authenticator app and scan this QR code to add your account.
          </p>
        </div>

        <div className="flex justify-center p-4 bg-white rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrCode}
            alt="2FA QR Code"
            className="rounded-lg"
            width={200}
            height={200}
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Enter the 6-digit code from your app
          </label>
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="text-center text-2xl tracking-[0.5em] font-mono"
            autoFocus
          />
        </div>

        <Button
          onClick={verifyCode}
          disabled={code.length !== 6 || loading}
          className="w-full press-effect"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify & Enable'
          )}
        </Button>

        <Button
          variant="ghost"
          onClick={() => setStep('init')}
          className="w-full"
          disabled={loading}
        >
          Cancel
        </Button>
      </Card>
    )
  }

  // Step 3: Recovery codes
  if (step === 'recovery') {
    return (
      <Card className="p-6 max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-full bg-green/10 flex items-center justify-center">
            <Check className="w-8 h-8 text-green" />
          </div>
          <h2 className="text-xl font-semibold">Save Your Recovery Codes</h2>
          <p className="text-sm text-muted-foreground">
            Save these codes in a safe place. You can use them to access your account
            if you lose your phone or authenticator app.
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Each code can only be used once. Keep them secure and don&apos;t share them!
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-2 bg-muted p-4 rounded-lg font-mono text-sm">
          {recoveryCodes.map((recoveryCode, i) => (
            <div key={i} className="text-center py-1 bg-background rounded">
              {recoveryCode}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={copyRecoveryCodes}
            variant="outline"
            className="flex-1 press-effect"
          >
            {copied ? (
              <Check className="w-4 h-4 mr-2" />
            ) : (
              <Copy className="w-4 h-4 mr-2" />
            )}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button
            onClick={downloadRecoveryCodes}
            variant="outline"
            className="flex-1 press-effect"
          >
            Download
          </Button>
        </div>

        <Button onClick={finishSetup} className="w-full press-effect">
          I&apos;ve Saved My Codes
        </Button>
      </Card>
    )
  }

  return null
}
