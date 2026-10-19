import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import {
  getMetaCatalogCredentials,
  checkMetaBatchStatus,
  type MetaBatchRequest,
} from '@/services/meta-catalog';
import {
  DEFAULT_SYNC_SETTINGS,
  resolveProductTypeTaxonomy,
  resolveSortedImages,
  buildParentDeleteRequests,
  buildVariationBatchRequests,
  buildSimpleProductRequest,
  type CatalogSyncSettings,
} from './syncBatchBuilder';

export const dynamic = 'force-dynamic';

const META_GRAPH_VERSION = 'v26.0';
const BATCH_SIZE = 250;

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

/**
 * POST: Sincroniza todos os produtos publicados e ativos diretamente com a Meta Catalog API.
 */
export async function POST(request: Request) {
  try {
    const credentials = await getMetaCatalogCredentials();
    if (!credentials) {
      return NextResponse.json(
        { error: 'Access Token ou Catalog ID do Meta não configurados no sistema.' },
        { status: 400 }
      );
    }

    const { accessToken, catalogId } = credentials;

    // 1. Carregar configurações de descrição e mapeamentos
    const settings: CatalogSyncSettings = { ...DEFAULT_SYNC_SETTINGS };
    try {
      const { data: catSettings } = await supabase
        .from('facebook_catalog_settings')
        .select('global_description_prefix, column_mappings')
        .eq('id', true)
        .maybeSingle();

      if (catSettings) {
        if (catSettings.global_description_prefix) {
          settings.globalDescPrefix = catSettings.global_description_prefix;
        }
        if (catSettings.column_mappings) {
          settings.columnMappings = { ...settings.columnMappings, ...catSettings.column_mappings };
        }
      }
    } catch (dbErr) {
      console.warn('[MetaCatalogSync] Erro ao carregar facebook_catalog_settings:', dbErr);
    }

    // 2. Buscar todos os produtos com relações necessárias
    const { data: allProducts, error: productsError } = await supabase
      .from('products')
      .select(
        'id, name, slug, description, price, unit_price, promo_price, status, deleted_at, deleted, is_draft, is_salvado, product_kind, material, stock, code, sku, product_categories(categories(name, type)), product_images(image_url, is_main), product_variations(id, name, sku, price, promo_price, image_url, attributes, status, active, stock, use_parent_price, use_parent_promo_price, use_parent_name), opportunities(name, observations)'
      );

    if (productsError || !allProducts) {
      return NextResponse.json(
        { error: productsError?.message || 'Não foi possível carregar os produtos.' },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://moveismorante.com.br';
    const origin = appUrl.includes('localhost')
      ? new URL(request.url).origin
      : appUrl.replace(/\/$/, '');

    // 3. Montar requisições em lote
    const batchRequests: MetaBatchRequest[] = [];
    const visibleProducts = allProducts.filter(
      (p: any) => p.status === 'published' && !p.deleted_at && !p.deleted && !p.is_draft
    );

    for (const p of allProducts as any[]) {
      const relationalVariations: any[] = p.product_variations || [];
      const hasRelationalVariations = relationalVariations.length > 0;
      const isParentVisible =
        p.status === 'published' && !p.deleted_at && !p.deleted && !p.is_draft;

      const visibleVariations = relationalVariations.filter(
        (v: any) =>
          v.status !== 'hidden' &&
          (v.status === 'published' || (!v.status && isParentVisible))
      );

      if (hasRelationalVariations) {
        // Remove o item pai do catálogo (vendas ocorrem por variação)
        batchRequests.push(...buildParentDeleteRequests(p.id, p.code));

        const productType = resolveProductTypeTaxonomy(p.product_categories || []);
        const { mainImage, additionalImages } = resolveSortedImages(p.product_images || []);
        const opp = Array.isArray(p.opportunities) ? p.opportunities[0] : p.opportunities;
        const opportunityName = opp?.name ? String(opp.name).trim() : '';

        const varRequests = buildVariationBatchRequests({
          product: p,
          variations: relationalVariations,
          visibleVariations,
          origin,
          productType,
          mainImage,
          additionalImages,
          settings,
          opportunityName,
          opp,
          globalDescPrefix: settings.globalDescPrefix,
        });
        batchRequests.push(...varRequests);
      } else if (!isParentVisible) {
        batchRequests.push(...buildParentDeleteRequests(p.id, p.code));
      } else {
        const productType = resolveProductTypeTaxonomy(p.product_categories || []);
        const { mainImage, additionalImages } = resolveSortedImages(p.product_images || []);
        const opp = Array.isArray(p.opportunities) ? p.opportunities[0] : p.opportunities;
        const opportunityName = opp?.name ? String(opp.name).trim() : '';

        const req = buildSimpleProductRequest({
          product: p,
          origin,
          productType,
          mainImage,
          additionalImages,
          settings,
          opportunityName,
          opp,
          globalDescPrefix: settings.globalDescPrefix,
        });
        if (req) batchRequests.push(req);
      }
    }

    if (batchRequests.length === 0) {
      return NextResponse.json({ message: 'Nenhum produto publicado para sincronizar.' });
    }

    // 4. Enviar em lotes de até 250 itens
    const handles: string[] = [];
    const errors: unknown[] = [];
    const metaApiUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${catalogId}/items_batch`;

    for (let i = 0; i < batchRequests.length; i += BATCH_SIZE) {
      const chunk = batchRequests.slice(i, i + BATCH_SIZE);
      const response = await fetch(metaApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ item_type: 'PRODUCT_ITEM', requests: chunk }),
      });

      const chunkData = await response.json();
      if (!response.ok) {
        console.error(`[MetaCatalogSync] Erro no chunk ${Math.floor(i / BATCH_SIZE) + 1}:`, chunkData);
        errors.push((chunkData as any).error || chunkData);
      } else if (chunkData.handles && Array.isArray(chunkData.handles)) {
        handles.push(...chunkData.handles);
      }
    }

    // 5. Criar/atualizar Conjuntos de Produtos por categoria
    let setsCreated = 0;
    try {
      const categoryNames = new Set<string>();
      for (const p of visibleProducts) {
        (p.product_categories || []).forEach((pc: any) => {
          if (pc.categories?.name && pc.categories?.type === 'category') {
            categoryNames.add(pc.categories.name);
          }
        });
      }

      const activeCategories = Array.from(categoryNames);
      if (activeCategories.length > 0) {
        const getSetsUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${catalogId}/product_sets`;
        const getSetsRes = await fetch(getSetsUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const getSetsData = await getSetsRes.json();
        const existingSetNames = new Set<string>(
          (getSetsData?.data || [])
            .map((set: any) => set.name?.toLowerCase()?.trim())
            .filter(Boolean)
        );

        for (const catName of activeCategories) {
          if (!existingSetNames.has(catName.toLowerCase().trim())) {
            const setRes = await fetch(getSetsUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                name: catName,
                filter: JSON.stringify({ product_type: { i_contains: catName } }),
              }),
            });
            if (setRes.ok) setsCreated++;
          }
        }
      }
    } catch (setErr: unknown) {
      console.warn('[MetaCatalogSync] Aviso ao sincronizar conjuntos:', setErr);
    }

    return NextResponse.json({
      success: handles.length > 0,
      total_items: batchRequests.length,
      chunks_sent: Math.ceil(batchRequests.length / BATCH_SIZE),
      handles,
      errors: errors.length > 0 ? errors : undefined,
      product_sets_created: setsCreated,
      message: `Sincronização Meta Catalog enviada com sucesso! (${batchRequests.length} itens em ${handles.length} lote(s)).`,
    });
  } catch (err: unknown) {
    console.error('[MetaCatalogSync] Erro fatal:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
