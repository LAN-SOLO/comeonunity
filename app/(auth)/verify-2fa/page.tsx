'use client'

import { Suspense } from 'react'
import { TwoFactorVerify } from '@/components/auth/two-factor-verify'
import { Loader2 } from 'lucide-react'

function TwoFactorVerifyContent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <TwoFactorVerify />
    </div>
  )
}

export default function VerifyTwoFactorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <TwoFactorVerifyContent />
    </Suspense>
  )
}
