import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Validate redirect URL to prevent open redirect attacks
function validateRedirectPath(path: string): string {
  // Only allow relative paths starting with /
  if (!path || typeof path !== 'string') return '/'

  // Remove any protocol or domain
  const cleanPath = path.replace(/^[a-z]+:\/\/[^/]+/i, '')

  // Must start with / and not contain //
  if (!cleanPath.startsWith('/') || cleanPath.includes('//')) return '/'

  // Block any attempts to redirect to external domains via protocol-relative URLs
  if (cleanPath.startsWith('//')) return '/'

  // Only allow alphanumeric, dash, underscore, slash, query params
  const validPathRegex = /^\/[a-zA-Z0-9\-_/?&=%[\]@]*$/
  if (!validPathRegex.test(cleanPath)) return '/'

  return cleanPath
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/'
  const next = validateRedirectPath(rawNext)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Check if user has 2FA enabled
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('totp_enabled')
          .eq('id', user.id)
          .single()

        // If 2FA is enabled, redirect to verification
        if (profile?.totp_enabled) {
          return NextResponse.redirect(
            `${origin}/verify-2fa?next=${encodeURIComponent(next)}`
          )
        }

        // Ensure user profile exists
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        if (!existingProfile) {
          // Create user profile
          await supabase.from('user_profiles').insert({
            id: user.id,
            platform_role: 'user',
            status: 'active',
          })
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
