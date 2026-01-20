import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateTOTPSecret, generateTOTPUri } from '@/lib/security/totp'
import { encrypt } from '@/lib/security/encryption'
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit
    const ip = getClientIp(request)
    const { success } = await checkRateLimit('strict', `2fa_setup:${user.id}:${ip}`)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Check if already enabled
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('totp_enabled')
      .eq('id', user.id)
      .single()

    if (profile?.totp_enabled) {
      return NextResponse.json(
        { error: '2FA is already enabled for this account' },
        { status: 400 }
      )
    }

    // Generate new secret and QR code
    const secret = generateTOTPSecret()
    const { uri, qrCode } = await generateTOTPUri(secret, user.email!)

    // Store encrypted secret temporarily (will be confirmed on verify)
    const adminClient = createAdminClient()
    const { error: upsertError } = await adminClient
      .from('user_profiles')
      .upsert({
        id: user.id,
        totp_secret: encrypt(secret),
        totp_enabled: false,
      }, {
        onConflict: 'id',
      })

    if (upsertError) {
      console.error('Failed to store TOTP secret:', upsertError)
      return NextResponse.json(
        { error: 'Failed to initialize 2FA setup' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      qrCode,
      uri,
      // Don't send secret to client - it's already stored encrypted
    })
  } catch (error) {
    console.error('2FA setup error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
