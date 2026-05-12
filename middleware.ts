import createMiddleware from 'next-intl/middleware'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

// Auth pages live outside [locale] and must never get a locale prefix
const AUTH_PATHS = ['/login', '/signup']
const PUBLIC_PATHS = ['/waitlist', '/api/waitlist', '/api/whoop/callback']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isAuthPath = AUTH_PATHS.includes(pathname)
  const isPublic = isAuthPath
    || PUBLIC_PATHS.some(p => pathname === p)
    || pathname.startsWith('/api/auth')

  let supabaseResponse = NextResponse.next({ request })

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
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Bounce authenticated users away from login/signup
  if (user && isAuthPath) {
    const url = request.nextUrl.clone()
    url.pathname = `/${routing.defaultLocale}/dashboard`
    return NextResponse.redirect(url)
  }

  // Bounce unauthenticated users to login (skip intl middleware — no locale prefix on /login)
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Auth pages and API routes: serve directly — no locale prefix needed
  if (isAuthPath || pathname.startsWith('/api/')) {
    return supabaseResponse
  }

  const intlResponse = intlMiddleware(request)
  supabaseResponse.cookies.getAll().forEach(cookie => {
    intlResponse.cookies.set(cookie.name, cookie.value, cookie)
  })

  return intlResponse
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
}
