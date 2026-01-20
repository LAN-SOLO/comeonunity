import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyTOTP } from '@/lib/security/totp'
import { decrypt } from '@/lib/security/encryption'
import { createAuditLog } from '@/lib/security/audit'
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit'
import { totpVerifySchema } from '@/lib/validations/auth'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit
    const ip = getClientIp(request)
    const { success } = await checkRateLimit('strict', `2fa_disable:${user.id}:${ip}`)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const parseResult = totpVerifySchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid code format' },
        { status: 400 }
      )
    }

    const { code } = parseResult.data
    const adminClient = createAdminClient()

    // Get stored secret
    const { data: profile } = await adminClient
      .from('user_profiles')
      .select('totp_secret, totp_enabled')
      .eq('id', user.id)
      .single()

    if (!profile?.totp_enabled || !profile?.totp_secret) {
      return NextResponse.json(
        { error: '2FA is not enabled for this account' },
        { status: 400 }
      )
    }

    // Decrypt and verify current code
    const secret = decrypt(profile.totp_secret)
    const isValid = await verifyTOTP(code, secret)

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      )
    }

    // Disable 2FA
    await adminClient
      .from('user_profiles')
      .update({
        totp_enabled: false,
        totp_secret: null,
        recovery_codes: null,
      })
      .eq('id', user.id)

    // Audit log
    await createAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'auth.2fa_disabled',
      resourceType: 'user',
      resourceId: user.id,
      severity: 'warning',
    })

    return NextResponse.json({
      success: true,
      message: '2FA has been disabled successfully',
    })
  } catch (error) {
    console.error('2FA disable error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
