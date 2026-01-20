import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that require authentication
const PROTECTED_ROUTES = ['/c/', '/communities', '/settings']

// Routes that require platform admin role
const ADMIN_ROUTES = ['/(admin)']

// Auth routes (redirect authenticated users away, except logout)
const AUTH_ROUTES = ['/login', '/signup', '/forgot-password']
const LOGOUT_ROUTE = '/logout'

// Helper to add timeout to promises
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  const timeout = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), ms)
  })
  return Promise.race([promise, timeout])
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // Add timeout to prevent hanging on slow Supabase responses
  let user = null
  try {
    const result = await withTimeout(supabase.auth.getUser(), 5000)
    user = result?.data?.user ?? null
  } catch {
    // Continue without user on error - let the page handle auth
  }

  const path = request.nextUrl.pathname

  // Check if route requires authentication
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => path.startsWith(route))
  const isAdminRoute = ADMIN_ROUTES.some((route) => path.includes(route))
  const isAuthRoute = AUTH_ROUTES.some((route) => path.startsWith(route))

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users from auth routes
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Check platform admin access
  if (isAdminRoute && user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('platform_role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'superadmin'].includes(profile.platform_role)) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so: NextResponse.next({ request })
  // 2. Copy over the cookies, like so: supabaseResponse.cookies.getAll().forEach(...)

  return supabaseResponse
}
