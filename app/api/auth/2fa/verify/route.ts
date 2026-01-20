import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyTOTP, generateRecoveryCodes, verifyRecoveryCode } from '@/lib/security/totp'
import { encrypt, decrypt } from '@/lib/security/encryption'
import { createAuditLog } from '@/lib/security/audit'
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit'
import { totpVerifySchema } from '@/lib/validations/auth'
import { z } from 'zod'

const verifyRequestSchema = z.object({
  code: z.string().min(6).max(10),
  type: z.enum(['totp', 'recovery']).optional().default('totp'),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit
    const ip = getClientIp(request)
    const { success } = await checkRateLimit('auth', `2fa_verify:${user.id}:${ip}`)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const parseResult = verifyRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues },
        { status: 400 }
      )
    }

    const { code, type } = parseResult.data
    const adminClient = createAdminClient()

    // Get stored secret and recovery codes
    const { data: profile } = await adminClient
      .from('user_profiles')
      .select('totp_secret, totp_enabled, recovery_codes')
      .eq('id', user.id)
      .single()

    if (!profile?.totp_secret) {
      return NextResponse.json(
        { error: '2FA setup not initiated. Please start the setup process.' },
        { status: 400 }
      )
    }

    // Decrypt secret
    const secret = decrypt(profile.totp_secret)

    if (type === 'recovery') {
      // Verify recovery code
      if (!profile.recovery_codes || profile.recovery_codes.length === 0) {
        return NextResponse.json(
          { error: 'No recovery codes available' },
          { status: 400 }
        )
      }

      // Decrypt recovery codes
      const decryptedCodes = profile.recovery_codes.map((c: string) => decrypt(c))
      const { valid, index } = verifyRecoveryCode(code, decryptedCodes)

      if (!valid) {
        return NextResponse.json({ error: 'Invalid recovery code' }, { status: 400 })
      }

      // Remove used recovery code
      const updatedCodes = [...profile.recovery_codes]
      updatedCodes.splice(index, 1)

      await adminClient
        .from('user_profiles')
        .update({ recovery_codes: updatedCodes })
        .eq('id', user.id)

      // Audit log
      await createAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'auth.2fa_enabled',
        resourceType: 'user',
        resourceId: user.id,
        details: { method: 'recovery_code' },
        severity: 'warning',
      })

      return NextResponse.json({ success: true })
    }

    // Verify TOTP code
    const isValid = await verifyTOTP(code, secret)

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 })
    }

    // If enabling for the first time, generate recovery codes
    if (!profile.totp_enabled) {
      const recoveryCodes = generateRecoveryCodes()
      const encryptedCodes = recoveryCodes.map((c) => encrypt(c))

      await adminClient
        .from('user_profiles')
        .update({
          totp_enabled: true,
          recovery_codes: encryptedCodes,
        })
        .eq('id', user.id)

      // Audit log
      await createAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'auth.2fa_enabled',
        resourceType: 'user',
        resourceId: user.id,
        severity: 'info',
      })

      return NextResponse.json({
        success: true,
        recoveryCodes, // Show once only
        message: '2FA has been enabled successfully',
      })
    }

    // Regular verification (already enabled)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('2FA verify error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
