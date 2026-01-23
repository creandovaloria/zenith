import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
    // Check for the authentication cookie
    const authCookie = request.cookies.get('zenith_auth')
    const { pathname } = request.nextUrl

    // Allow access to login page
    if (pathname === '/login') {
        // If already authenticated and trying to access login, redirect to home
        if (authCookie?.value === 'true') {
            return NextResponse.redirect(new URL('/', request.url))
        }
        return NextResponse.next()
    }

    // Protect all other routes
    // If no cookie is found, redirect to login
    if (!authCookie || authCookie.value !== 'true') {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    return NextResponse.next()
}

// Config to match all paths except static files, images, favicon
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes, if you have public ones you might want to exclude them)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - Any file with extension (e.g. .svg, .png, .jpg)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
    ],
}
