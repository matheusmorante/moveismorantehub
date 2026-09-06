import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

interface RouteContext {
  params: Promise<{
    token: string;
  }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { token } = await context.params;

  // 1. Validar token
  const { data: shareToken } = await supabase
    .from('post_share_tokens')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (!shareToken || shareToken.revoked_at) {
    return NextResponse.json(
      { error: 'TOKEN_INVALID_OR_REVOKED', message: 'Este link de compartilhamento não é mais válido.' },
      {
        status: 404,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          'X-Robots-Tag': 'noindex, nofollow, noarchive',
        },
      }
    );
  }

  // 2. Buscar Produto com Imagens e Variações
  const { data: product } = await supabase
    .from('products')
    .select('*, product_images(*), product_variations(*)')
    .eq('id', shareToken.product_id)
    .maybeSingle();

  // 3. Buscar Campanhas e Element Models
  const { data: campaigns } = await supabase
    .from('post_creator_campaigns')
    .select('*')
    .eq('active', true);

  const { data: models } = await supabase
    .from('campaign_element_models')
    .select('*');

  const {
    resolveProductImages,
    ABSOLUTE_FIDELITY_RULE,
    OFFICIAL_MORANTE_LOGO_URL,
    OFFICIAL_QUEIMA_BADGE_URL,
  } = await import('@/services/postProductImageResolver');
  const { productImages, validation } = resolveProductImages({
    product,
    selectedVariationId: shareToken.variation_id,
  });

  const productOpportunityId = product?.opportunity_id || null;
  const filteredModels = (models || []).filter((m) => {
    if (m.element_type === 'BADGE') {
      if (!productOpportunityId) return false;
      return m.opportunity_id === productOpportunityId;
    }
    return true;
  });

  let officialBadge: { name: string; url: string; role: 'OFFICIAL_ASSET'; opportunityId: string } | null = null;
  if (productOpportunityId) {
    const oppBadgeModel = filteredModels.find((m) => m.element_type === 'BADGE');
    const badgeUrl = oppBadgeModel?.generated_asset_url || product?.opportunity?.image_url || OFFICIAL_QUEIMA_BADGE_URL;
    officialBadge = {
      name: oppBadgeModel?.name || product?.opportunity?.name || 'Selo Oficial',
      url: badgeUrl,
      role: 'OFFICIAL_ASSET',
      opportunityId: productOpportunityId,
    };
  }

  const specification = {
    version: '1.0',
    createdAt: new Date().toISOString(),
    token: shareToken.token,
    absoluteFidelityRule: ABSOLUTE_FIDELITY_RULE,
    product: {
      id: product?.id || shareToken.product_id,
      name: product?.name || '',
      price: product?.sale_price || product?.price || 0,
      oldPrice: product?.old_price || 0,
      catalogUrl: `https://moveismorante.com.br/produto/${product?.slug || shareToken.product_id}`,
      mainImageUrl: productImages?.primary?.url || product?.main_image_url || null,
    },
    productImages,
    officialAssets: {
      logo: {
        name: 'Logo Oficial Móveis Morante',
        url: OFFICIAL_MORANTE_LOGO_URL,
        role: 'OFFICIAL_ASSET',
      },
      badge: officialBadge,
    },
    imageValidation: validation,
    campaigns: (campaigns || []).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      instructions: c.instructions,
      formats: c.formats || ['4:5', '9:16'],
      elementModels: filteredModels
        .filter((m) => m.campaign_id === c.id)
        .map((m) => ({
          id: m.id,
          elementType: m.element_type,
          prompt: m.prompt,
          instructions: m.instructions,
        })),
    })),
  };

  return NextResponse.json(specification, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  });
}
