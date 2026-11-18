import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { product_id, visitor_id, referer } = body;
    const eventType = body.event_type == null ? 'product_view' : body.event_type;
    const validEventTypes = ['catalog_visit', 'product_view', 'product_click'];

    if (
      typeof eventType !== 'string'
      || !validEventTypes.includes(eventType)
      || typeof visitor_id !== 'string'
      || !visitor_id.trim()
      || visitor_id.length > 128
      || (eventType === 'catalog_visit' ? product_id != null : !product_id)
      || (referer != null && typeof referer !== 'string')
    ) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }

    const analyticsEvent = {
      product_id: product_id ?? null,
      visitor_id: visitor_id.trim(),
      event_type: eventType,
      referer: typeof referer === 'string' ? referer.slice(0, 500) : 'Tráfego Direto',
    };

    if (eventType === 'product_view') {
      // A localização continua vinculada apenas às visualizações de produto.
      let ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

      if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.') || ip.startsWith('192.168.')) {
        ip = '186.220.192.1';
      }

      let city = request.headers.get('x-vercel-ip-city') || '';
      let region = request.headers.get('x-vercel-ip-country-region') || '';
      let country = request.headers.get('x-vercel-ip-country') || '';

      if (!city && ip && ip !== '127.0.0.1') {
        try {
          const geoRes = await fetch(
            `http://ip-api.com/json/${ip}?fields=status,country,region,city`
          );
          const geoData = await geoRes.json();
          if (geoData.status === 'success') {
            city = geoData.city || '';
            region = geoData.region || '';
            country = geoData.country || '';
          }
        } catch (geoErr) {
          console.error('Erro ao buscar GeoIP:', geoErr);
        }
      }

      const { error } = await supabase.from('product_analytics').insert({
        ...analyticsEvent,
        ip_address: ip,
        country: country || 'BR',
        region: region || 'PR',
        city: city || 'Curitiba',
      });

      if (error) return handleAnalyticsInsertError(error);
      return NextResponse.json({ success: true, geo: { city, region, country, ip } });
    }

    const { error } = await supabase.from('product_analytics').insert(analyticsEvent);
    if (error) return handleAnalyticsInsertError(error);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Erro no track API:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function handleAnalyticsInsertError(error: { code?: string; message?: string }) {
  if (error.code === '42P01') {
    return NextResponse.json(
      {
        error: 'Tabela product_analytics não encontrada. Por favor execute a migration SQL no Supabase.',
        code: 'MIGRATION_REQUIRED',
      },
      { status: 500 }
    );
  }
  throw error;
}
