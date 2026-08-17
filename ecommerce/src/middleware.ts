import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Lista de padrões de user-agents comuns de bots, scrapers e crawlers agressivos
const BOT_USER_AGENTS = /bot|crawler|spider|crawling|scraping|scrape|semrush|ahrefs|dotbot|rogerbot|mj12bot|yandex|baidu/i

// Redes sociais que podem fazer fetch para preview de link (apenas em páginas públicas)
const SOCIAL_BOTS = /facebookexternalhit|whatsapp|telegram|slackbot|twitterbot/i

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || ''
  const path = request.nextUrl.pathname

  // Bypass imediato e total para o feed do catálogo do Facebook/Meta
  const isFacebookCatalogFeed = path === '/api/facebook-catalog.csv' || path === '/api/facebook-catalog';
  if (isFacebookCatalogFeed) {
    return NextResponse.next();
  }

  // 1. Bloqueio de Bots e Scrapers em rotas críticas (admin, api, busca)
  if (BOT_USER_AGENTS.test(userAgent)) {
    return new NextResponse('Acesso não autorizado para bots.', { status: 403 })
  }

  // Para bots de redes sociais (WhatsApp, FB, etc.), permitimos apenas páginas de produtos e home pública.
  // Bloqueamos acesso a rotas de API (exceto o feed de catálogo do Facebook), Admin e rotas com parâmetros de busca pesados.
  if (SOCIAL_BOTS.test(userAgent)) {
    const isFacebookCatalogFeed = path === '/api/facebook-catalog.csv' || path === '/api/facebook-catalog';
    const isCriticalRoute = path.startsWith('/admin') || (path.startsWith('/api') && !isFacebookCatalogFeed) || path.includes('/search');
    if (isCriticalRoute) {
      return new NextResponse('Acesso restrito para crawlers de rede social.', { status: 403 })
    }
  }

  const response = NextResponse.next()

  // 2. Proteção de Rate Limit (Definido nas respostas de API se necessário)
  // Cabeçalhos de controle de cache básicos para otimizar recursos estáticos
  if (path.startsWith('/_next/static') || path.startsWith('/images/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  }

  return response
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/:path*',
  ],
}
