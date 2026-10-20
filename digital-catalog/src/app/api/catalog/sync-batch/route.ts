import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import {
  sendMetaCatalogBatch,
  type MetaBatchRequest,
} from '@/services/meta-catalog';
import {
  resolveProductTypeTaxonomy,
  resolveSortedImages,
  buildParentDeleteRequests,
  buildVariationBatchRequests,
  buildSimpleProductRequest,
  DEFAULT_SYNC_SETTINGS,
} from '../../facebook-catalog/sync/syncBatchBuilder';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://moveismorante.com.br';

/**
 * POST /api/catalog/sync-batch
 * Sincroniza um produto individual com a Meta Catalog API (CREATE | UPDATE | DELETE).
 * Controlador fino — toda lógica de montagem de lote fica em syncBatchBuilder.
 */
export async function POST(req: Request) {
  try {
    const { productId, action } = await req.json();

    if (!productId || !action) {
      return NextResponse.json(
        { error: "productId e action ('CREATE' | 'UPDATE' | 'DELETE') são obrigatórios." },
        { status: 400 }
      );
    }

    // ── DELETE explícito ───────────────────────────────────────────────────
    if (action === 'DELETE') {
      const { data: parentProduct } = await supabase
        .from('products')
        .select('id, code')
        .eq('id', productId)
        .maybeSingle();

      const { data: variations } = await supabase
        .from('product_variations')
        .select('id, sku')
        .eq('product_id', productId);

      const requests: MetaBatchRequest[] = [
        ...buildParentDeleteRequests(productId, parentProduct?.code ?? null),
      ];

      for (const v of variations ?? []) {
        const varSku = v.sku ? String(v.sku).trim() : '';
        if (varSku) requests.push({ method: 'DELETE', retailer_id: varSku });
        if (v.id) requests.push({ method: 'DELETE', retailer_id: String(v.id) });
      }

      const result = await sendMetaCatalogBatch(requests);
      return NextResponse.json(result);
    }

    // ── CREATE / UPDATE ────────────────────────────────────────────────────
    const { data: product, error: productError } = await supabase
      .from('products')
      .select(
        '*, product_categories(categories(name, type)), product_images(*), product_variations(*), opportunities(*)'
      )
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: `Produto não encontrado: ${productError?.message || ''}` },
        { status: 404 }
      );
    }

    // Produto despublicado/excluído → DELETE de todos os identificadores
    if (product.status !== 'published' || product.deleted_at || product.deleted || product.is_draft) {
      const requests: MetaBatchRequest[] = [
        ...buildParentDeleteRequests(productId, product.code),
      ];
      for (const v of product.product_variations ?? []) {
        const varSku = v.sku ? String(v.sku).trim() : '';
        if (varSku) requests.push({ method: 'DELETE', retailer_id: varSku });
        if (v.id) requests.push({ method: 'DELETE', retailer_id: String(v.id) });
      }
      const result = await sendMetaCatalogBatch(requests);
      return NextResponse.json(result);
    }

    const origin = APP_URL.replace(/\/$/, '');
    const productType = resolveProductTypeTaxonomy(product.product_categories ?? []);
    const { mainImage, additionalImages } = resolveSortedImages(product.product_images ?? []);
    const opp = Array.isArray(product.opportunities)
      ? product.opportunities[0]
      : product.opportunities;
    const opportunityName = opp?.name ? String(opp.name).trim() : '';

    const variations: any[] = product.product_variations ?? [];
    const requests: MetaBatchRequest[] = [];

    if (variations.length > 0) {
      // O pai nunca é vendido diretamente quando há variações
      requests.push(...buildParentDeleteRequests(productId, product.code));

      const visibleVariations = variations.filter(
        (v: any) =>
          v.status !== 'hidden' &&
          (v.status === 'published' || (!v.status && product.status === 'published'))
      );

      const varRequests = buildVariationBatchRequests({
        product,
        variations,
        visibleVariations,
        origin,
        productType,
        mainImage,
        additionalImages,
        settings: DEFAULT_SYNC_SETTINGS,
        opportunityName,
        opp,
        globalDescPrefix: '',
      });
      requests.push(...varRequests);
    } else {
      // Produto simples sem variações
      const req = buildSimpleProductRequest({
        product,
        origin,
        productType,
        mainImage,
        additionalImages,
        settings: DEFAULT_SYNC_SETTINGS,
        opportunityName,
        opp,
        globalDescPrefix: '',
      });
      if (req) requests.push(req);
    }

    const result = await sendMetaCatalogBatch(requests);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('[MetaCatalogSyncBatch] Erro:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}
