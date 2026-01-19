'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { signupSchema, type SignupInput } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, Lock, User, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'

// Helper to parse Supabase auth errors
function parseAuthError(error: unknown): string {
  if (!error) return 'An unknown error occurred'

  if (typeof error === 'string') return error

  if (error instanceof Error) {
    return error.message || 'An unexpected error occurred'
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>

    // Check for Supabase error structure
    if (typeof err.message === 'string' && err.message) {
      return err.message
    }

    // Check for nested error
    if (err.error && typeof err.error === 'object') {
      const nestedErr = err.error as Record<string, unknown>
      if (typeof nestedErr.message === 'string') {
        return nestedErr.message
      }
    }

    // Check for status/code based errors
    if (err.status === 400 || err.code === 'bad_request') {
      return 'Invalid request. Please check your input and try again.'
    }

    if (err.status === 422 || err.code === 'user_already_exists') {
      return 'An account with this email already exists. Please log in instead.'
    }

    if (err.status === 429 || err.code === 'over_request_rate_limit') {
      return 'Too many requests. Please wait a moment and try again.'
    }
  }

  return 'An unexpected error occurred. Please try again.'
}

export function SignupForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [successEmail, setSuccessEmail] = useState<string>('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupInput) => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.name,
          },
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      })

      if (authError) {
        const errorMessage = parseAuthError(authError)

        // Check for common error patterns
        if (
          errorMessage.toLowerCase().includes('already registered') ||
          errorMessage.toLowerCase().includes('already exists') ||
          errorMessage.toLowerCase().includes('user already exists')
        ) {
          setError('An account with this email already exists. Please log in or use "Forgot password" to reset your password.')
        } else if (errorMessage.toLowerCase().includes('invalid email')) {
          setError('Please enter a valid email address.')
        } else if (errorMessage.toLowerCase().includes('password')) {
          setError('Password must be at least 8 characters with uppercase, lowercase, and a number.')
        } else {
          setError(errorMessage)
        }
        return
      }

      if (authData.user) {
        // Check if email confirmation is required
        if (authData.user.identities?.length === 0) {
          setError('An account with this email already exists. Please log in or use "Forgot password" to reset your password.')
          return
        }

        // Show success message
        setSuccessEmail(data.email)
        setSuccess(true)
      }
    } catch (err) {
      console.error('Signup error:', err)
      setError(parseAuthError(err))
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendVerification = async () => {
    const email = successEmail || getValues('email')
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
        // Show a brief success indicator
        setSuccess(true)
        setSuccessEmail(email)
      }
    } catch (err) {
      setError(parseAuthError(err))
    } finally {
      setIsResending(false)
    }
  }

  const handleGoogleSignup = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
        setIsLoading(false)
      }
    } catch (err) {
      setError('Failed to initiate Google signup')
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-xl font-semibold">Check your email</h2>
        <p className="text-muted-foreground">
          We&apos;ve sent a confirmation link to <strong>{successEmail}</strong>.
          Please check your inbox (and spam folder) and click the link to activate your account.
        </p>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            onClick={handleResendVerification}
            disabled={isResending}
          >
            {isResending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend verification email
              </>
            )}
          </Button>
          <Button variant="ghost" onClick={() => router.push('/login')}>
            Back to login
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Didn&apos;t receive the email? Check your spam folder or try resending.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            className="pl-10"
            autoComplete="name"
            disabled={isLoading}
            {...register('name')}
          />
        </div>
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

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
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            placeholder="Create a strong password"
            className="pl-10"
            autoComplete="new-password"
            disabled={isLoading}
            {...register('password')}
          />
        </div>
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Must be at least 8 characters with uppercase, lowercase, and number
        </p>
      </div>

      <Button type="submit" className="w-full press-effect" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          'Create account'
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

      <Button
        type="button"
        variant="outline"
        className="w-full press-effect"
        onClick={handleGoogleSignup}
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

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>

      <p className="text-center text-xs text-muted-foreground">
        By creating an account, you agree to our{' '}
        <Link href="/terms" className="underline hover:text-primary">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="underline hover:text-primary">
          Privacy Policy
        </Link>
      </p>
    </form>
  )
}
