import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const BOT_USER_AGENTS = /bot|crawler|spider|crawling|scraping|scrape|semrush|ahrefs|dotbot|rogerbot|mj12bot|yandex|baidu/i
const SOCIAL_BOTS = /facebookexternalhit|whatsapp|telegram|slackbot|twitterbot/i

export function proxy(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || ''
  const path = request.nextUrl.pathname
  const isFacebookCatalogFeed = path === '/api/facebook-catalog.csv'
    || path === '/api/facebook-catalog'

  if (isFacebookCatalogFeed) return NextResponse.next()

  if (BOT_USER_AGENTS.test(userAgent)) {
    return new NextResponse('Acesso não autorizado para bots.', { status: 403 })
  }

  if (SOCIAL_BOTS.test(userAgent)) {
    const isCriticalRoute = path.startsWith('/admin')
      || path.startsWith('/api')
      || path.includes('/search')

    if (isCriticalRoute) {
      return new NextResponse('Acesso restrito para crawlers de rede social.', { status: 403 })
    }
  }

  const response = NextResponse.next()
  if (path.startsWith('/_next/static') || path.startsWith('/images/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
}
