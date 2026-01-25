'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Shield, Key, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export function TwoFactorVerify() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [code, setCode] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'totp' | 'recovery'>('totp')

  const redirectTo = searchParams.get('next') || '/'

  const verifyTOTP = async () => {
    if (code.length !== 6) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, type: 'totp' }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Invalid code')
      }

      toast.success('Verification successful')
      router.push(redirectTo)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const verifyRecoveryCode = async () => {
    if (recoveryCode.length < 8) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: recoveryCode, type: 'recovery' }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Invalid recovery code')
      }

      toast.success('Verification successful')
      router.push(redirectTo)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, type: 'totp' | 'recovery') => {
    if (e.key === 'Enter') {
      if (type === 'totp' && code.length === 6) {
        verifyTOTP()
      } else if (type === 'recovery' && recoveryCode.length >= 8) {
        verifyRecoveryCode()
      }
    }
  }

  return (
    <Card className="p-6 max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Two-Factor Authentication</h2>
        <p className="text-sm text-muted-foreground">
          Enter the verification code from your authenticator app to continue.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v as 'totp' | 'recovery')
          setError(null)
        }}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="totp" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Authenticator
          </TabsTrigger>
          <TabsTrigger value="recovery" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            Recovery
          </TabsTrigger>
        </TabsList>

        <TabsContent value="totp" className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Enter the 6-digit code
            </label>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => handleKeyDown(e, 'totp')}
              placeholder="000000"
              className="text-center text-2xl tracking-[0.5em] font-mono"
              autoFocus
              disabled={loading}
            />
          </div>

          <Button
            onClick={verifyTOTP}
            disabled={code.length !== 6 || loading}
            className="w-full press-effect"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify'
            )}
          </Button>
        </TabsContent>

        <TabsContent value="recovery" className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Enter a recovery code
            </label>
            <Input
              type="text"
              value={recoveryCode}
              onChange={(e) =>
                setRecoveryCode(e.target.value.toUpperCase().replace(/\s/g, ''))
              }
              onKeyDown={(e) => handleKeyDown(e, 'recovery')}
              placeholder="XXXXXXXX"
              className="text-center text-lg tracking-wider font-mono uppercase"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Recovery codes are 8 characters. Each code can only be used once.
            </p>
          </div>

          <Button
            onClick={verifyRecoveryCode}
            disabled={recoveryCode.length < 8 || loading}
            className="w-full press-effect"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Use Recovery Code'
            )}
          </Button>
        </TabsContent>
      </Tabs>

      <div className="text-center">
        <Button
          variant="link"
          onClick={() => router.push('/login')}
          className="text-sm"
          disabled={loading}
        >
          Back to login
        </Button>
      </div>
    </Card>
  )
}
