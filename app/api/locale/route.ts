import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { locales, type Locale } from '@/i18n/request'

// POST /api/locale - Set locale preference
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { locale } = body

    // Validate locale
    if (!locale || !locales.includes(locale as Locale)) {
      return NextResponse.json({ error: 'Invalid locale' }, { status: 400 })
    }

    // Set cookie (expires in 1 year)
    const cookieStore = await cookies()
    cookieStore.set('locale', locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      httpOnly: false, // Allow client-side access for SSR
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })

    // If user is authenticated, sync to user_profiles
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      await supabase
        .from('user_profiles')
        .update({ locale })
        .eq('id', user.id)
    }

    return NextResponse.json({ success: true, locale })
  } catch (err) {
    console.error('Locale API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/locale - Get current locale
export async function GET() {
  try {
    const cookieStore = await cookies()
    const locale = cookieStore.get('locale')?.value || 'de'

    return NextResponse.json({ locale })
  } catch (err) {
    console.error('Locale API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
