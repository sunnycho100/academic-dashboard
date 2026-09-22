import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()

  // Intercept Supabase auth error redirects (e.g. expired email link → /?error=access_denied)
  // Forward to /login with a user-friendly message
  const authError = request.nextUrl.searchParams.get('error')
  if (authError && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const errorDesc = request.nextUrl.searchParams.get('error_description')
    // Clean up and preserve only what the login page needs
    url.search = ''
    if (errorDesc) url.searchParams.set('error', errorDesc)
    else url.searchParams.set('error', 'Authentication failed. Please try again.')
    return NextResponse.redirect(url)
  }

  // Allow unauthenticated users to use the app in guest mode (no redirect to /login)
  // Only redirect authenticated users away from /login
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }
  return supabaseResponse
}
