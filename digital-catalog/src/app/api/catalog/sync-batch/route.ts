import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import {
  sendMetaCatalogBatch,
  mapProductToMeta,
  normalizeMetaImageUrl,
  formatDecimalPrice,
  stripHtml,
  MetaBatchRequest,
} from '@/services/meta-catalog';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { productId, action } = await req.json();

    if (!productId || !action) {
      return NextResponse.json(
        { error: "productId e action ('CREATE' | 'UPDATE' | 'DELETE') são obrigatórios." },
        { status: 400 }
      );
    }

    // Se for DELETE explícito, busca possíveis variações para remover todos os retailer_ids associados
    if (action === 'DELETE') {
      const { data: variations } = await supabase
        .from('product_variations')
        .select('id, sku')
        .eq('product_id', productId);

      const requests: MetaBatchRequest[] = [
        {
          method: 'DELETE',
          retailer_id: String(productId),
        },
      ];

      if (variations && variations.length > 0) {
        for (const v of variations) {
          requests.push({
            method: 'DELETE',
            retailer_id: String(v.sku || v.id),
          });
        }
      }

      const result = await sendMetaCatalogBatch(requests);
      return NextResponse.json(result);
    }

    // Para CREATE ou UPDATE, buscar dados completos com relações
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

    // Se o produto foi despublicado, rascunho ou excluído logicamente, remova do Meta Catalog
    if (product.status !== 'published' || product.deleted_at || product.deleted || product.is_draft) {
      const requests: MetaBatchRequest[] = [
        {
          method: 'DELETE',
          retailer_id: String(productId),
        },
      ];

      if (product.product_variations && product.product_variations.length > 0) {
        for (const v of product.product_variations) {
          requests.push({
            method: 'DELETE',
            retailer_id: String(v.sku || v.id),
          });
        }
      }

      const result = await sendMetaCatalogBatch(requests);
      return NextResponse.json(result);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://moveismorante.com.br';
    const origin = appUrl.replace(/\/$/, '');

    // Imagens ordenadas
    const sortedImages = [...(product.product_images || [])].sort(
      (a, b) => (b.is_main ? 1 : -1) - (a.is_main ? 1 : -1)
    );
    const allImages = sortedImages.map((img: any) => img.image_url).filter(Boolean);
    const parentImage = allImages[0] || '';
    const additionalImages = allImages.slice(1);

    // Categorias
    const parentCategories =
      product.product_categories
        ?.map((pc: any) => pc.categories)
        .filter((cat: any) => cat && cat.type === 'category')
        .map((cat: any) => cat.name)
        .filter(Boolean) || [];

    const environments =
      product.product_categories
        ?.map((pc: any) => pc.categories)
        .filter((cat: any) => cat && cat.type === 'environment')
        .map((cat: any) => cat.name)
        .filter(Boolean) || [];

    let productType = '';
    if (environments.length > 0 && parentCategories.length > 0) {
      productType = `${environments[0]} > ${parentCategories[0]}`;
    } else if (parentCategories.length > 0) {
      productType = parentCategories[0];
    } else if (environments.length > 0) {
      productType = environments[0];
    } else {
      productType = 'Furniture';
    }

    const opp = Array.isArray(product.opportunities)
      ? product.opportunities[0]
      : product.opportunities;
    const oppName = opp?.name ? String(opp.name).trim() : '';

    const variations = product.product_variations || [];
    const hasVariations = variations.length > 0;
    const requests: MetaBatchRequest[] = [];

    if (hasVariations) {
      // O pai nunca é vendido diretamente quando há variações
      requests.push({ method: 'DELETE', retailer_id: String(product.id) });

      for (const v of variations) {
        const isPublished =
          v.active !== false &&
          (v.status === 'published' || (!v.status && product.status === 'published') || v.status !== 'hidden');

        if (!isPublished) {
          requests.push({
            method: 'DELETE',
            retailer_id: String(v.sku || v.id),
          });
          continue;
        }

        const isParentPrice = v.use_parent_price !== false;
        const isParentPromo = v.use_parent_promo_price !== false;
        const isParentDesc = v.use_parent_description !== false;
        const hasDistinctName = v.name && String(v.name).trim() !== String(product.name).trim();
        const isParentName = v.use_parent_name !== false && !hasDistinctName;

        const varPrice = isParentPrice ? product.price || product.unit_price : v.price || product.price;
        const varPromo = isParentPromo ? product.promo_price : v.promo_price;
        const varDesc = isParentDesc ? product.description : v.description || product.description;
        let varName = isParentName ? product.name : v.name || product.name;

        let color = '';
        let size = '';
        if (Array.isArray(v.attributes)) {
          const corAttr = v.attributes.find(
            (a: any) => a && (a.name?.toLowerCase() === 'cor' || a.key?.toLowerCase() === 'cor')
          );
          if (corAttr) color = String(corAttr.value || corAttr.option || '').trim();

          const tamAttr = v.attributes.find(
            (a: any) => a && (a.name?.toLowerCase() === 'tamanho' || a.key?.toLowerCase() === 'tamanho')
          );
          if (tamAttr) size = String(tamAttr.value || tamAttr.option || '').trim();
        } else if (v.attributes && typeof v.attributes === 'object') {
          color = String(v.attributes.Cor || v.attributes.cor || '').trim();
          size = String(v.attributes.Tamanho || v.attributes.tamanho || '').trim();
        }

        if (!color && /branco/i.test(varName)) {
          color = 'Branco';
        }

        const suffixParts: string[] = [];
        if (color && !new RegExp(`\\b${color}\\b`, 'i').test(varName)) suffixParts.push(color);
        if (size && !new RegExp(`\\b${size}\\b`, 'i').test(varName)) suffixParts.push(size);
        if (suffixParts.length > 0) {
          varName = `${varName} - ${suffixParts.join(' / ')}`;
        }

        const descParts: string[] = [];
        if (opp?.observations) {
          descParts.push(`***Aviso Importante (${oppName || opp.name}): ${opp.observations}***`);
        }
        if (varDesc) descParts.push(varDesc);
        const desc = stripHtml(descParts.join('\n\n'));

        let varImage = normalizeMetaImageUrl(parentImage);
        let varAdditional = additionalImages.map(normalizeMetaImageUrl).filter(Boolean).join(',');

        if (v.image_url) {
          const varImagesList = String(v.image_url).split(',').map((u: any) => u.trim()).filter(Boolean);
          if (varImagesList.length > 0) {
            varImage = normalizeMetaImageUrl(varImagesList[0]);
            varAdditional = varImagesList.slice(1).map(normalizeMetaImageUrl).filter(Boolean).join(',');
          }
        }

        const regularPrice = Number(varPrice || 0);
        const promoPrice = varPromo ? Number(varPromo) : 0;
        const hasPromo = promoPrice > 0 && promoPrice < regularPrice;
        const currentPrice = hasPromo ? promoPrice : regularPrice;
        const oldPriceFormatted = hasPromo ? formatDecimalPrice(regularPrice) : undefined;

        const isStockAvailable = v.stock === null || v.stock === undefined || Number(v.stock) > 0;
        const quantityToSell = v.stock !== null && v.stock !== undefined ? Math.max(0, Number(v.stock)) : 1;
        const retailerId = String(v.sku || v.id);

        requests.push({
          method: 'UPDATE',
          retailer_id: retailerId,
          data: {
            id: retailerId,
            title: varName,
            description: desc,
            link: `${origin}/produto/${product.slug}?var=${v.id}`,
            image_link: varImage,
            additional_image_link: varAdditional || undefined,
            availability: isStockAvailable ? 'in stock' : 'out of stock',
            price: `${regularPrice.toFixed(2)} BRL`,
            sale_price: hasPromo ? `${promoPrice.toFixed(2)} BRL` : undefined,
            brand: 'Móveis Morante',
            condition: product.is_salvado ? 'refurbished' : 'new',
            color: color || undefined,
            size: size || undefined,
            material: product.material || undefined,
            item_group_id: '',
            quantity_to_sell_on_facebook: quantityToSell,
            product_type: productType,
            custom_label_0: productType,
            custom_label_1: formatDecimalPrice(currentPrice),
            custom_label_2: oldPriceFormatted,
            custom_label_3: oppName || undefined,
          },
        });
      }
    } else {
      const mappedData = mapProductToMeta(product, parentImage, additionalImages);
      mappedData.product_type = productType;
      mappedData.custom_label_0 = productType;
      mappedData.item_group_id = '';

      requests.push({
        method: 'UPDATE',
        retailer_id: String(product.code || product.id),
        data: mappedData,
      });
    }

    const result = await sendMetaCatalogBatch(requests);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[MetaCatalogSyncBatch] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}
