import { NextResponse } from 'next/server';
import { getMetaCatalogCredentials, checkMetaBatchStatus } from '@/services/meta-catalog';
import { forwardReconciliation } from '@/services/meta-catalog/forwardReconciliation';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const META_GRAPH_VERSION = 'v26.0';

/**
 * GET: Consulta o status de um lote enviado (via ?handle=...) ou verifica a saúde da integração.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const handle = searchParams.get('handle');

    const credentials = await getMetaCatalogCredentials();
    if (!credentials) {
      return NextResponse.json(
        { error: 'Credenciais do Meta Catalog não configuradas.' },
        { status: 400 }
      );
    }

    if (handle) {
      const statusData = await checkMetaBatchStatus(handle, credentials);
      return NextResponse.json({ success: true, handle, status: statusData });
    }

    // Verificação de saúde do catálogo
    const metaCheckUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${credentials.catalogId}?fields=id,name,vertical,product_count`;
    const res = await fetch(metaCheckUrl, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });
    const catalogInfo = await res.json();

    if (!res.ok || catalogInfo.error) {
      return NextResponse.json(
        {
          healthy: false,
          error: catalogInfo.error?.message || 'Falha ao conectar ao catálogo da Meta.',
          catalogId: credentials.catalogId,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      healthy: true,
      catalog: catalogInfo,
      endpoint: `https://graph.facebook.com/${META_GRAPH_VERSION}/${credentials.catalogId}/items_batch`,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export function POST(request: Request) {
  return forwardReconciliation(request.headers.get('authorization'));
}
