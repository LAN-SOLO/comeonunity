import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/login-form'

export const metadata = {
  title: 'Sign In - ComeOnUnity',
  description: 'Sign in to your ComeOnUnity account',
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>

        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}

function LoginFormSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 w-16 bg-muted rounded" />
        <div className="h-10 bg-muted rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-20 bg-muted rounded" />
        <div className="h-10 bg-muted rounded" />
      </div>
      <div className="h-10 bg-muted rounded" />
    </div>
  )
}
