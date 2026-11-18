import { NextResponse } from 'next/server';

const ALLOWED_IMAGE_HOSTS = [
  'r2.dev',
  'supabase.co',
  'moveismorante.com.br',
  'fbcdn.net',
] as const;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_IMAGE_REDIRECTS = 5;

function isAllowedImageHost(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase().replace(/\.$/, '');

  return ALLOWED_IMAGE_HOSTS.some(
    (host) => normalizedHostname === host || normalizedHostname.endsWith(`.${host}`)
  );
}

function resolveAllowedImageUrl(imageUrl: string): URL | null {
  try {
    if (imageUrl.startsWith('/') && !imageUrl.startsWith('//')) {
      const catalogOrigin = process.env.NEXT_PUBLIC_APP_URL || 'https://moveismorante.com.br';
      const catalogUrl = new URL(catalogOrigin);
      const resolvedUrl = new URL(imageUrl, catalogUrl);

      return resolvedUrl.origin === catalogUrl.origin ? resolvedUrl : null;
    }

    const resolvedUrl = new URL(imageUrl);

    if (
      resolvedUrl.protocol !== 'https:' ||
      resolvedUrl.username ||
      resolvedUrl.password ||
      resolvedUrl.port ||
      !isAllowedImageHost(resolvedUrl.hostname)
    ) {
      return null;
    }

    return resolvedUrl;
  } catch {
    return null;
  }
}

async function cancelResponseBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // The redirect response is already unusable; continue with the validation result.
  }
}

async function fetchImageWithValidatedRedirects(initialUrl: URL): Promise<Response> {
  let currentUrl = initialUrl;
  let redirectsFollowed = 0;

  while (true) {
    const response = await fetch(currentUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      redirect: 'manual',
      next: { revalidate: 86400 }, // Cache no Next.js por 24 horas
    });

    if (!REDIRECT_STATUSES.has(response.status)) {
      return response;
    }

    const location = response.headers.get('location');

    if (!location) {
      return response;
    }

    let destination: URL;

    try {
      destination = new URL(location, currentUrl);
    } catch {
      await cancelResponseBody(response);
      return new Response(null, { status: 403 });
    }

    const allowedDestination = resolveAllowedImageUrl(destination.href);

    if (!allowedDestination) {
      await cancelResponseBody(response);
      return new Response(null, { status: 403 });
    }

    if (redirectsFollowed >= MAX_IMAGE_REDIRECTS) {
      await cancelResponseBody(response);
      return new Response(null, { status: 502 });
    }

    await cancelResponseBody(response);
    currentUrl = allowedDestination;
    redirectsFollowed += 1;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return new Response('Parâmetro URL ausente', { status: 400 });
    }

    const resolvedImageUrl = resolveAllowedImageUrl(imageUrl);

    if (!resolvedImageUrl) {
      return new Response('Domínio não autorizado para proxy', { status: 403 });
    }

    const response = await fetchImageWithValidatedRedirects(resolvedImageUrl);

    if (!response.ok) {
      return new Response('Erro ao buscar a imagem de origem', { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache de 1 ano no navegador/CDN
      },
    });
  } catch (error: any) {
    console.error('Erro no proxy de imagem OG:', error);
    return new Response('Erro interno do servidor', { status: 500 });
  }
}
