import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import {
  getMetaCatalogCredentials,
  normalizeMetaImageUrl,
  stripHtml,
  formatDecimalPrice,
  checkMetaBatchStatus,
  MetaBatchRequest,
} from '@/services/meta-catalog';

export const dynamic = 'force-dynamic';

const META_GRAPH_VERSION = 'v26.0';

/**
 * GET: Consulta o status de um lote enviado (via ?handle=...) ou verifica a saúde da integração
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
      return NextResponse.json({
        success: true,
        handle,
        status: statusData,
      });
    }

    // Se nenhum handle foi fornecido, verifica a saúde do catálogo na Meta
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST: Sincroniza todos os produtos publicados e ativos diretamente com a Meta Catalog API (items_batch)
 */
export async function POST(request: Request) {
  try {
    // 1. Obter credenciais e configurações
    const credentials = await getMetaCatalogCredentials();
    if (!credentials) {
      return NextResponse.json(
        { error: 'Access Token ou Catalog ID do Meta não configurados no sistema.' },
        { status: 400 }
      );
    }

    const { accessToken, catalogId } = credentials;

    // Buscar configurações de descrição e mapeamentos
    let globalDescPrefix = '';
    let columnMappings: Record<string, string> = {
      brand: 'Móveis Morante',
      condition: 'new',
      gender: 'unisex',
      age_group: 'adult',
    };

    try {
      const { data: catSettings } = await supabase
        .from('facebook_catalog_settings')
        .select('global_description_prefix, column_mappings')
        .eq('id', true)
        .maybeSingle();

      if (catSettings) {
        if (catSettings.global_description_prefix) {
          globalDescPrefix = catSettings.global_description_prefix;
        }
        if (catSettings.column_mappings) {
          columnMappings = { ...columnMappings, ...catSettings.column_mappings };
        }
      }
    } catch (dbErr) {
      console.warn('[MetaCatalogSync] Erro ao carregar facebook_catalog_settings:', dbErr);
    }

    // 2. Buscar todos os produtos com campos completos (incluindo slug, stock, material, is_salvado)
    const { data: allProducts, error: productsError } = await supabase
      .from('products')
      .select(
        'id, name, slug, description, price, unit_price, promo_price, status, deleted_at, deleted, is_draft, is_salvado, material, stock, code, category_id, product_categories(categories(name, type)), product_images(image_url, is_main), product_variations(id, name, sku, price, promo_price, image_url, attributes, status, active, stock, use_parent_price, use_parent_promo_price, use_parent_name), opportunities(name, observations)'
      );

    if (productsError || !allProducts) {
      return NextResponse.json(
        {
          error:
            productsError?.message || 'Não foi possível carregar os produtos para sincronização.',
        },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://moveismorante.com.br';
    const origin = appUrl.includes('localhost')
      ? new URL(request.url).origin
      : appUrl.replace(/\/$/, '');

    // 3. Montar as requisições em lote para a Meta Catalog API (items_batch)
    const batchRequests: MetaBatchRequest[] = [];
    const visibleProducts = allProducts.filter(
      (p: any) =>
        p.active !== false &&
        p.status === 'published' &&
        !p.deleted_at &&
        !p.deleted &&
        !p.is_draft
    );

    for (const p of allProducts as any[]) {
      const relationalVariations = p.product_variations || [];
      const hasRelationalVariations = relationalVariations.length > 0;
      const isParentVisible =
        p.active !== false &&
        p.status === 'published' &&
        !p.deleted_at &&
        !p.deleted &&
        !p.is_draft;
      const visibleVariations = relationalVariations.filter(
        (v: any) =>
          v.active !== false &&
          (v.status === 'published' ||
            (!v.status && isParentVisible) ||
            (isParentVisible && v.status !== 'hidden'))
      );

      // Tratamento de exclusões (itens deletados, desativados ou ocultados)
      if (hasRelationalVariations) {
        // Se o produto pai tiver variações, remove o SKU/código e ID pai do catálogo pois a venda ocorre por variações
        const parentCode = p.code ? String(p.code).trim() : '';
        if (parentCode) {
          batchRequests.push({
            method: 'DELETE',
            retailer_id: parentCode,
            data: { id: parentCode },
          });
        }
        batchRequests.push({
          method: 'DELETE',
          retailer_id: String(p.id),
          data: { id: String(p.id) },
        });

        for (const variation of relationalVariations) {
          const isVarPublished =
            variation.active !== false &&
            (variation.status === 'published' ||
              (!variation.status && isParentVisible) ||
              (isParentVisible && variation.status !== 'hidden'));
          if (!isVarPublished) {
            const varSku = variation.sku ? String(variation.sku).trim() : '';
            if (varSku) {
              batchRequests.push({
                method: 'DELETE',
                retailer_id: varSku,
                data: { id: varSku },
              });
            }
            if (variation.id) {
              batchRequests.push({
                method: 'DELETE',
                retailer_id: String(variation.id),
                data: { id: String(variation.id) },
              });
            }
          }
        }
        if (visibleVariations.length === 0) continue;
      } else if (!isParentVisible) {
        const parentCode = p.code ? String(p.code).trim() : '';
        if (parentCode) {
          batchRequests.push({
            method: 'DELETE',
            retailer_id: parentCode,
            data: { id: parentCode },
          });
        }
        batchRequests.push({
          method: 'DELETE',
          retailer_id: String(p.id),
          data: { id: String(p.id) },
        });
        continue;
      }

      // Mapeamento de categorias e ambientes
      const parentCategories =
        p.product_categories
          ?.map((pc: any) => pc.categories)
          .filter((cat: any) => cat && cat.type === 'category')
          .map((cat: any) => cat.name)
          .filter(Boolean) || [];

      const environments =
        p.product_categories
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
        productType = 'Móveis';
      }

      // Imagens principais e adicionais
      const sortedImages = [...(p.product_images || [])].sort(
        (a, b) => (b.is_main ? 1 : -1) - (a.is_main ? 1 : -1)
      );
      const allImages = sortedImages.map((img: any) => img.image_url).filter(Boolean);
      const parentImage = allImages[0] || '';
      const additionalImages = allImages
        .slice(1)
        .map(normalizeMetaImageUrl)
        .filter(Boolean)
        .join(',');

      const opp = Array.isArray(p.opportunities) ? p.opportunities[0] : p.opportunities;
      const opportunityName = opp?.name ? String(opp.name).trim() : '';

      if (hasRelationalVariations) {
        // Cada variação vira um item individual agrupado por item_group_id
        for (const v of visibleVariations as any[]) {
          const isParentPrice = v.use_parent_price !== false;
          const isParentPromo = v.use_parent_promo_price !== false;
          const isParentDesc = v.use_parent_description !== false;

          const varPrice = isParentPrice ? p.price || p.unit_price : v.price || p.price;
          const varPromo = isParentPromo ? p.promo_price : v.promo_price;
          const varDesc = isParentDesc ? p.description : v.description || p.description;
          // Extração de cor e tamanho
          let color = '';
          let size = '';
          if (Array.isArray(v.attributes)) {
            const corAttr = v.attributes.find(
              (a: any) =>
                a &&
                (a.name?.toLowerCase() === 'cor' ||
                  a.key?.toLowerCase() === 'cor' ||
                  a.attribute_name?.toLowerCase() === 'cor')
            );
            if (corAttr) color = String(corAttr.value || corAttr.option || '').trim();

            const tamAttr = v.attributes.find(
              (a: any) =>
                a &&
                (a.name?.toLowerCase() === 'tamanho' ||
                  a.key?.toLowerCase() === 'tamanho' ||
                  a.attribute_name?.toLowerCase() === 'tamanho')
            );
            if (tamAttr) size = String(tamAttr.value || tamAttr.option || '').trim();
          } else if (v.attributes && typeof v.attributes === 'object') {
            color = String(v.attributes.Cor || v.attributes.cor || '').trim();
            size = String(v.attributes.Tamanho || v.attributes.tamanho || '').trim();
          }

          // O nome enviado para a Meta deve ser exclusivamente o nome da variação
          let varName = String(v.name || '').trim();
          if (!varName) {
            const suffixParts: string[] = [];
            if (color) suffixParts.push(color);
            if (size) suffixParts.push(size);
            varName = suffixParts.length > 0 ? `${p.name} - ${suffixParts.join(' / ')}` : String(p.name).trim();
          }

          if (!color && /branco/i.test(varName)) {
            color = 'Branco';
          }

          // Descrição com prefixo global e observações de oportunidade
          const descParts: string[] = [];
          if (globalDescPrefix) descParts.push(globalDescPrefix);
          if (opp?.observations) {
            descParts.push(
              `***Aviso Importante (${opportunityName || opp.name}): ${opp.observations}***`
            );
          }
          if (varDesc) descParts.push(varDesc);
          const descWithPrefix = stripHtml(descParts.join('\n\n'));

          let varImageLink = normalizeMetaImageUrl(parentImage);
          let varAdditionalImages = additionalImages;

          if (v.image_url) {
            const varImagesList = String(v.image_url)
              .split(',')
              .map((url: any) => url.trim())
              .filter(Boolean);
            if (varImagesList.length > 0) {
              varImageLink = normalizeMetaImageUrl(varImagesList[0]);
              varAdditionalImages = varImagesList
                .slice(1)
                .map(normalizeMetaImageUrl)
                .filter(Boolean)
                .join(',');
            }
          }

          let regularVarPrice = Number(varPrice || 0);
          let promoVarPrice = varPromo ? Number(varPromo) : 0;
          if (regularVarPrice <= 0 && promoVarPrice > 0) {
            regularVarPrice = promoVarPrice;
            promoVarPrice = 0;
          }

          const varSku =
            String(v.sku || '').trim() ||
            (p.code
              ? `${p.code}-${String(visibleVariations.indexOf(v) + 1).padStart(2, '0')}`
              : String(v.id));
          const retailerId = varSku;

          // Meta exige preço estritamente positivo e imagem válida
          if (regularVarPrice <= 0 || !varImageLink) {
            batchRequests.push({
              method: 'DELETE',
              retailer_id: retailerId,
              data: { id: retailerId },
            });
            continue;
          }

          const hasVarPromo = promoVarPrice > 0 && promoVarPrice < regularVarPrice;
          const currentVarPrice = hasVarPromo ? promoVarPrice : regularVarPrice;
          const oldVarPriceFormatted = hasVarPromo ? formatDecimalPrice(regularVarPrice) : undefined;

          const isStockAvailable =
            v.stock === null || v.stock === undefined || Number(v.stock) > 0;
          const quantityToSell =
            v.stock !== null && v.stock !== undefined ? Math.max(0, Number(v.stock)) : 1;

          batchRequests.push({
            method: 'UPDATE',
            retailer_id: retailerId,
            data: {
              id: retailerId,
              title: varName,
              description: descWithPrefix,
              link: `${origin}/produto/${p.slug}?var=${v.id}`,
              image_link: varImageLink,
              additional_image_link: varAdditionalImages || undefined,
              availability: isStockAvailable ? 'in stock' : 'out of stock',
              price: `${regularVarPrice.toFixed(2)} BRL`,
              sale_price: hasVarPromo ? `${promoVarPrice.toFixed(2)} BRL` : undefined,
              brand: columnMappings.brand || 'Móveis Morante',
              condition: p.is_salvado ? 'refurbished' : 'new',
              color: color || undefined,
              gender: columnMappings.gender || 'unisex',
              material: p.material || undefined,
              size: size || undefined,
              item_group_id: '',
              identifier_exists: 'no',
              quantity_to_sell_on_facebook: quantityToSell,
              product_type: productType,
              custom_label_0: productType,
              custom_label_1: formatDecimalPrice(currentVarPrice),
              custom_label_2: oldVarPriceFormatted,
              custom_label_3: opportunityName || undefined,
            },
          });
        }
      } else {
        // Produto simples
        const descParts: string[] = [];
        if (globalDescPrefix) descParts.push(globalDescPrefix);
        if (opp?.observations) {
          descParts.push(
            `***Aviso Importante (${opportunityName || opp.name}): ${opp.observations}***`
          );
        }
        if (p.description) descParts.push(p.description);
        const descWithPrefix = stripHtml(descParts.join('\n\n'));

        let regularParentPrice = Number(p.price || p.unit_price || 0);
        let promoParentPrice = p.promo_price ? Number(p.promo_price) : 0;
        if (regularParentPrice <= 0 && promoParentPrice > 0) {
          regularParentPrice = promoParentPrice;
          promoParentPrice = 0;
        }

        const finalParentImage = normalizeMetaImageUrl(parentImage);
        const parentSku = String(p.code || p.sku || '').trim() || String(p.id);
        const retailerId = parentSku;

        // Meta exige preço estritamente positivo e imagem válida
        if (regularParentPrice <= 0 || !finalParentImage) {
          batchRequests.push({
            method: 'DELETE',
            retailer_id: retailerId,
            data: { id: retailerId },
          });
          continue;
        }

        const hasParentPromo = promoParentPrice > 0 && promoParentPrice < regularParentPrice;
        const currentParentPrice = hasParentPromo ? promoParentPrice : regularParentPrice;
        const oldParentPriceFormatted = hasParentPromo ? formatDecimalPrice(regularParentPrice) : undefined;

        const isStockAvailable =
          p.stock === null || p.stock === undefined || Number(p.stock) > 0;
        const quantityToSell =
          p.stock !== null && p.stock !== undefined ? Math.max(0, Number(p.stock)) : 1;

        batchRequests.push({
          method: 'UPDATE',
          retailer_id: retailerId,
          data: {
            id: retailerId,
            title: p.name,
            description: descWithPrefix,
            link: `${origin}/produto/${p.slug}`,
            image_link: finalParentImage,
            additional_image_link: additionalImages || undefined,
            availability: isStockAvailable ? 'in stock' : 'out of stock',
            price: `${regularParentPrice.toFixed(2)} BRL`,
            sale_price: hasParentPromo ? `${promoParentPrice.toFixed(2)} BRL` : undefined,
            brand: columnMappings.brand || 'Móveis Morante',
            condition: p.is_salvado ? 'refurbished' : 'new',
            gender: columnMappings.gender || 'unisex',
            material: p.material || undefined,
            item_group_id: '',
            identifier_exists: 'no',
            quantity_to_sell_on_facebook: quantityToSell,
            product_type: productType,
            custom_label_0: productType,
            custom_label_1: formatDecimalPrice(currentParentPrice),
            custom_label_2: oldParentPriceFormatted,
            custom_label_3: opportunityName || undefined,
          },
        });
      }
    }

    if (batchRequests.length === 0) {
      return NextResponse.json({ message: 'Nenhum produto publicado para sincronizar.' });
    }

    // 4. Enviar em lotes seguros de até 250 itens (limite Meta: 300 itens por lote)
    const BATCH_SIZE = 250;
    const handles: string[] = [];
    const errors: any[] = [];
    const metaApiUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${catalogId}/items_batch`;

    for (let i = 0; i < batchRequests.length; i += BATCH_SIZE) {
      const chunk = batchRequests.slice(i, i + BATCH_SIZE);

      const response = await fetch(metaApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          item_type: 'PRODUCT_ITEM',
          requests: chunk,
        }),
      });

      const chunkData = await response.json();

      if (!response.ok) {
        console.error(`[MetaCatalogSync] Erro no chunk ${i / BATCH_SIZE + 1}:`, chunkData);
        errors.push(chunkData.error || chunkData);
      } else if (chunkData.handles && Array.isArray(chunkData.handles)) {
        handles.push(...chunkData.handles);
      }
    }

    // 5. Atualizar os Conjuntos (Product Sets) para categorias ativas
    let setsCreated = 0;
    try {
      const categoryNames = new Set<string>();
      for (const p of visibleProducts) {
        p.product_categories?.forEach((pc: any) => {
          const catName = pc.categories?.name;
          const catType = pc.categories?.type;
          if (catName && catType === 'category') {
            categoryNames.add(catName);
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
          getSetsData?.data?.map((set: any) => set.name?.toLowerCase()?.trim()).filter(Boolean) ||
            []
        );

        for (const catName of activeCategories) {
          const normalizedCat = catName.toLowerCase().trim();
          if (!existingSetNames.has(normalizedCat)) {
            const createSetUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${catalogId}/product_sets`;
            const filterObj = {
              product_type: {
                i_contains: catName,
              },
            };

            const setRes = await fetch(createSetUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                name: catName,
                filter: JSON.stringify(filterObj),
              }),
            });

            if (setRes.ok) {
              setsCreated++;
            }
          }
        }
      }
    } catch (setErr: any) {
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
  } catch (err: any) {
    console.error('[MetaCatalogSync] Erro fatal:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
