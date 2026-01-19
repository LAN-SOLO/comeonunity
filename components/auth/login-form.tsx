'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { loginSchema, type LoginInput } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, Lock, AlertCircle, RefreshCw } from 'lucide-react'

// Helper to parse Supabase auth errors
function parseAuthError(error: unknown): string {
  if (!error) return 'An unknown error occurred'

  if (typeof error === 'string') return error

  if (error instanceof Error) {
    return error.message || 'An unexpected error occurred'
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>

    if (typeof err.message === 'string' && err.message) {
      return err.message
    }

    if (err.error && typeof err.error === 'object') {
      const nestedErr = err.error as Record<string, unknown>
      if (typeof nestedErr.message === 'string') {
        return nestedErr.message
      }
    }
  }

  return 'An unexpected error occurred. Please try again.'
}

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState('')
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  const redirectTo = searchParams.get('next') || '/'
  const urlError = searchParams.get('error')

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const handleResendVerification = async () => {
    const email = verificationEmail || getValues('email')
    if (!email) {
      setError('Please enter your email address first.')
      return
    }

    setIsResending(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      })

      if (error) {
        setError(parseAuthError(error))
      } else {
        setError(null)
        setNeedsVerification(false)
        // Show success
        alert('Verification email sent! Please check your inbox.')
      }
    } catch (err) {
      setError(parseAuthError(err))
    } finally {
      setIsResending(false)
    }
  }

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true)
    setError(null)
    setNeedsVerification(false)

    try {
      const supabase = createClient()

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        const errorMessage = parseAuthError(authError)

        if (
          errorMessage.toLowerCase().includes('invalid login credentials') ||
          errorMessage.toLowerCase().includes('invalid credentials')
        ) {
          setError('Invalid email or password. Please check your credentials and try again.')
        } else if (
          errorMessage.toLowerCase().includes('email not confirmed') ||
          errorMessage.toLowerCase().includes('not confirmed')
        ) {
          setVerificationEmail(data.email)
          setNeedsVerification(true)
          setError('Please verify your email address before logging in.')
        } else {
          setError(errorMessage)
        }
        return
      }

      if (authData.user) {
        // Check if user has 2FA enabled
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('totp_enabled')
          .eq('id', authData.user.id)
          .single()

        if (profile?.totp_enabled) {
          // Redirect to 2FA verification
          setNeedsTwoFactor(true)
          router.push(`/verify-2fa?next=${encodeURIComponent(redirectTo)}`)
        } else {
          // No 2FA, redirect to destination
          router.push(redirectTo)
          router.refresh()
        }
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(parseAuthError(err))
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      })

      if (error) {
        setError(error.message)
        setIsLoading(false)
      }
    } catch (err) {
      setError('Failed to initiate Google login')
      setIsLoading(false)
    }
  }

  const handleMagicLink = async () => {
    const email = getValues('email')
    if (!email) {
      setError('Please enter your email address first.')
      return
    }

    setIsSendingMagicLink(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      })

      if (error) {
        setError(parseAuthError(error))
      } else {
        setMagicLinkSent(true)
      }
    } catch (err) {
      setError(parseAuthError(err))
    } finally {
      setIsSendingMagicLink(false)
    }
  }

  if (magicLinkSent) {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <Mail className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-xl font-semibold">Check your email</h2>
        <p className="text-muted-foreground">
          We&apos;ve sent a magic link to <strong>{getValues('email')}</strong>.
          Click the link in the email to sign in.
        </p>
        <Button variant="ghost" onClick={() => setMagicLinkSent(false)}>
          Back to login
        </Button>
      </div>
    )
  }

  if (needsTwoFactor) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="mt-4 text-muted-foreground">Redirecting to 2FA verification...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {urlError === 'auth_callback_error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Authentication failed. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-col gap-2">
            <span>{error}</span>
            {needsVerification && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-fit"
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Resend verification email
                  </>
                )}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            className="pl-10"
            autoComplete="email"
            disabled={isLoading}
            {...register('email')}
          />
        </div>
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-sm text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            className="pl-10"
            autoComplete="current-password"
            disabled={isLoading}
            {...register('password')}
          />
        </div>
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full press-effect" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          'Sign in'
        )}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white dark:bg-black px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <div className="grid gap-3">
        <Button
          type="button"
          variant="outline"
          className="w-full press-effect"
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full press-effect"
          onClick={handleMagicLink}
          disabled={isLoading || isSendingMagicLink}
        >
          {isSendingMagicLink ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending magic link...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Sign in with Magic Link
            </>
          )}
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  )
}
