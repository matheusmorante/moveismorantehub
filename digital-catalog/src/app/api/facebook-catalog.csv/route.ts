import { NextResponse } from 'next/server';
import { generateFacebookCatalogCsv } from '@/services/facebook-catalog-feed';

export const dynamic = 'force-dynamic';

/**
 * Endpoint HTTP que entrega o feed de catálogo CSV para o Meta Commerce Manager
 * Segue o padrão Thin Controller / Single Responsibility.
 */
export async function GET(request: Request) {
  try {
    const csvContent = await generateFacebookCatalogCsv(request.url);

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename=catalog_products.csv',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error: any) {
    console.error('[FacebookCatalogCSV] Erro ao gerar feed:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao gerar feed de catálogo.' },
      { status: 500 }
    );
  }
}
