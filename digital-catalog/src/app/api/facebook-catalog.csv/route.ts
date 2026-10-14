import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

function normalizeMetaImageUrl(urlStr: any): string {
  if (!urlStr) return '';
  const str = String(urlStr).trim();

  // Mantém URLs públicas de origem. A antiga conversão de Supabase para R2
  // descartava o caminho do arquivo e gerava links 404 para imagens ainda não
  // migradas ao R2, que o Meta não consegue baixar.
  try {
    const decoded = decodeURI(str);
    return encodeURI(decoded).replace(/%2520/g, '%20').replace(/\s+/g, '%20');
  } catch (e) {
    return str.replace(/\s+/g, '%20');
  }
}

function stripHtml(html: string): string {
  if (!html) return '';
  let text = html
    // Converte tags de bloco em quebra de parágrafo real (\n) para preservar formatação no WhatsApp
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n')
    .replace(/<\/div\s*>/gi, '\n')
    .replace(/<\/li\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Normaliza múltiplas quebras consecutivas (max 2) mas preserva parágrafos
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text;
}

/**
 * Formata campo CSV preservando quebras de parágrafo dentro de aspas duplas.
 * Campos com \n, \r, vírgulas ou aspas são sempre envoltos em "..."
 * garantindo que o WhatsApp e o Meta recebam os parágrafos corretos.
 */
function formatCsvValue(val: any): string {
  if (val === null || val === undefined) return '';
  // Normaliza \r\n para \n simples
  let str = String(val).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  // Se contiver quebra de linha, vírgula ou aspas duplas → obrigatório envolver em aspas
  if (/["\n,]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Formata valores numéricos para o padrão decimal com 2 dígitos após a vírgula (ex: "199,90"),
 * sem símbolos de moeda (R$ ou BRL), conforme especificação para custom_labels da Meta.
 */
function formatDecimalPrice(val: any): string {
  if (val === null || val === undefined || val === '') return '';
  const num = Number(val);
  if (isNaN(num)) return '';
  return num.toFixed(2).replace('.', ',');
}

export async function GET(request: Request) {
  try {
    // Buscar todos os produtos ativos e não deletados
    const { data: products, error } = await supabase
      .from('products')
      .select(
        '*, product_categories(categories(name, type)), product_images(*), product_variations(*), opportunities(*)'
      )
      .is('deleted_at', null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Buscar configurações do catálogo
    let globalDescriptionPrefix = '';
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
          globalDescriptionPrefix = catSettings.global_description_prefix;
        }
        if (catSettings.column_mappings) {
          columnMappings = { ...columnMappings, ...catSettings.column_mappings };
        }
      }
    } catch (dbErr) {
      console.warn('facebook_catalog_settings não pôde ser lido, usando fallbacks:', dbErr);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://moveismorante.com.br';
    const origin = appUrl.includes('localhost')
      ? new URL(request.url).origin
      : appUrl.replace(/\/$/, '');

    // Cabeçalho idêntico ao modelo wix do cliente
    const headers = [
      'id',
      'title',
      'description',
      'link',
      'image_link',
      'additional_image_link',
      'availability',
      'rich_text_description',
      'price',
      'sale_price',
      'brand',
      'condition',
      'color',
      'gender',
      'material',
      'size',
      'item_group_id',
      'identifier_exists',
      'quantity_to_sell_on_facebook',
      'product_type',
      'custom_label_0',
      'custom_label_1',
      'custom_label_2',
      'custom_label_3',
    ];

    const rows: string[][] = [];

    for (const p of products || []) {
      // Ignora rascunhos, inativos ou removidos
      if (p.is_draft || p.deleted || p.deleted_at || p.active === false) {
        continue;
      }

      // Suporte a variações relacionais e variações no formato JSON
      let variationsList: any[] = [];
      const hasRelationalVariations = Boolean(
        p.product_variations && p.product_variations.length > 0
      );
      const hasLegacyVariations = Boolean(
        p.variations && (Array.isArray(p.variations) ? p.variations.length : true)
      );

      const isParentPublished = p.status === 'published';

      if (hasRelationalVariations) {
        variationsList = p.product_variations.filter(
          (v: any) =>
            v.active !== false &&
            (v.status === 'published' ||
              (!v.status && isParentPublished) ||
              (isParentPublished && v.status !== 'hidden'))
        );
      } else if (hasLegacyVariations) {
        const rawVars = Array.isArray(p.variations)
          ? p.variations
          : typeof p.variations === 'string'
            ? JSON.parse(p.variations || '[]')
            : [];
        variationsList = rawVars.filter(
          (v: any) =>
            v.active !== false &&
            (v.status === 'published' ||
              (!v.status && isParentPublished) ||
              (isParentPublished && v.status !== 'hidden'))
        );
      }

      // Se nem o produto pai nem nenhuma variação estiver publicada, ignora
      if (!isParentPublished && variationsList.length === 0) {
        continue;
      }

      // Filtra apenas categorias reais (type = 'category') e ignora ambientes (type = 'environment')
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

      // Ordena as imagens do produto de forma que a principal (is_main = true) fique em primeiro lugar
      const sortedImages = [...(p.product_images || [])].sort(
        (a, b) => (b.is_main ? 1 : -1) - (a.is_main ? 1 : -1)
      );
      const allImages = sortedImages.map((img: any) => img.image_url).filter(Boolean) || [];
      const parentImage = allImages[0] || (Array.isArray(p.images) ? p.images[0] : '') || '';
      const additionalImages =
        allImages.slice(1).join(',') ||
        (Array.isArray(p.images) ? p.images.slice(1).join(',') : '');

      const opp = Array.isArray(p.opportunities) ? p.opportunities[0] : p.opportunities;
      const opportunityName = opp?.name ? String(opp.name).trim() : '';

      // Caso tenha variações ativas e publicadas
      if (variationsList.length > 0) {
        for (const v of variationsList) {
          // Ignorar variações explicitamente ocultas quando o pai estiver publicado
          if (v.status === 'hidden') {
            continue;
          }

          const isParentPrice = v.use_parent_price !== false;
          const isParentPromo = v.use_parent_promo_price !== false;
          const isParentDesc = v.use_parent_description !== false;
          const varPrice = isParentPrice ? p.price : v.price || p.price;
          const varPromo = isParentPromo ? p.promo_price : v.promo_price;
          const varDesc = isParentDesc ? p.description : v.description || p.description;
          // Pegar cor e tamanho das propriedades de attributes se houver
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

          // O nome enviado para o feed da Meta deve ser exclusivamente o nome da variação
          let varName = String(v.name || '').trim();
          if (!varName) {
            const suffixParts: string[] = [];
            if (color) suffixParts.push(color);
            if (size) suffixParts.push(size);
            varName = suffixParts.length > 0 ? `${p.name} - ${suffixParts.join(' / ')}` : String(p.name).trim();
          }

          // Se a cor ainda não foi detectada pelos atributos, mas o nome contém a cor (ex: Branco)
          if (!color && /branco/i.test(varName)) {
            color = 'Branco';
          }

          // Se a variação tiver imagem própria, trata se houver lista separada por vírgula
          let varImageLink = normalizeMetaImageUrl(parentImage);
          let varAdditionalImages = additionalImages
            .split(',')
            .map(normalizeMetaImageUrl)
            .filter(Boolean)
            .join(',');

          if (v.image_url) {
            const varImagesList = v.image_url
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

          // Adicionar prefixo global e posicionar o aviso de oportunidade entre o prefixo e a descrição
          const descParts: string[] = [];
          if (globalDescriptionPrefix) {
            descParts.push(globalDescriptionPrefix);
          }
          if (opp && opp.observations) {
            descParts.push(
              `***Aviso Importante (${opportunityName || opp.name}): ${opp.observations}***`
            );
          }
          if (varDesc) {
            descParts.push(varDesc);
          }
          let descWithPrefix = stripHtml(descParts.join('\n\n'));

          let regularVarPrice = Number(varPrice || 0);
          let promoVarPrice = varPromo ? Number(varPromo) : 0;
          // Se o preço normal for zero mas houver preço promocional, usa o promocional como base
          if (regularVarPrice <= 0 && promoVarPrice > 0) {
            regularVarPrice = promoVarPrice;
            promoVarPrice = 0;
          }

          // Meta exige preço estritamente positivo e imagem válida
          if (regularVarPrice <= 0 || !varImageLink) {
            continue;
          }

          const hasVarPromo = promoVarPrice > 0 && promoVarPrice < regularVarPrice;
          const currentVarPrice = hasVarPromo ? promoVarPrice : regularVarPrice;
          const oldVarPriceFormatted = hasVarPromo ? formatDecimalPrice(regularVarPrice) : '';

          rows.push([
            v.sku || v.id, // id
            varName, // title
            descWithPrefix, // description
            `${origin}/produto/${p.slug}?var=${v.id}`, // link
            varImageLink, // image_link
            varAdditionalImages, // additional_image_link
            'in stock', // availability
            descWithPrefix, // rich_text_description
            `${regularVarPrice.toFixed(2)} BRL`, // price
            hasVarPromo ? `${promoVarPrice.toFixed(2)} BRL` : '', // sale_price
            columnMappings.brand || 'Móveis Morante', // brand
            p.is_salvado ? 'refurbished' : 'new', // condition (refurbished se for salvado, senão new)
            color, // color
            columnMappings.gender || 'unisex', // gender
            p.material || '', // material
            size, // size
            '', // item_group_id (sem grupos: cada variação é um produto individual)
            'no', // identifier_exists
            '1', // quantity_to_sell_on_facebook
            productType, // product_type
            productType, // custom_label_0 (ambiente > categoria)
            formatDecimalPrice(currentVarPrice), // custom_label_1 (preço promocional ou preço normal se não tiver promo)
            oldVarPriceFormatted, // custom_label_2 (preço antigo se tiver promo ou vazio se não tiver)
            opportunityName, // custom_label_3 (oportunidade do produto)
          ]);
        }
      } else if (isParentPublished) {
        // Sem variações, insere apenas o produto pai
        const descParts: string[] = [];
        if (globalDescriptionPrefix) {
          descParts.push(globalDescriptionPrefix);
        }
        if (opp && opp.observations) {
          descParts.push(
            `***Aviso Importante (${opportunityName || opp.name}): ${opp.observations}***`
          );
        }
        if (p.description) {
          descParts.push(p.description);
        }
        let descWithPrefix = stripHtml(descParts.join('\n\n'));

        let regularParentPrice = Number(p.price || p.unit_price || 0);
        let promoParentPrice = p.promo_price ? Number(p.promo_price) : 0;
        // Se o preço normal for zero mas houver preço promocional, usa o promocional como base
        if (regularParentPrice <= 0 && promoParentPrice > 0) {
          regularParentPrice = promoParentPrice;
          promoParentPrice = 0;
        }

        const finalParentImage = normalizeMetaImageUrl(parentImage);
        // Meta exige preço estritamente positivo e imagem válida
        if (regularParentPrice <= 0 || !finalParentImage) {
          continue;
        }

        const hasParentPromo = promoParentPrice > 0 && promoParentPrice < regularParentPrice;
        const currentParentPrice = hasParentPromo ? promoParentPrice : regularParentPrice;
        const oldParentPriceFormatted = hasParentPromo ? formatDecimalPrice(regularParentPrice) : '';

        rows.push([
          p.id, // id
          p.name, // title
          descWithPrefix, // description
          `${origin}/produto/${p.slug}`, // link
          finalParentImage, // image_link
          additionalImages.split(',').map(normalizeMetaImageUrl).filter(Boolean).join(','), // additional_image_link
          'in stock', // availability
          descWithPrefix, // rich_text_description
          `${regularParentPrice.toFixed(2)} BRL`, // price
          hasParentPromo ? `${promoParentPrice.toFixed(2)} BRL` : '', // sale_price
          columnMappings.brand || 'Móveis Morante', // brand
          p.is_salvado ? 'refurbished' : 'new', // condition (refurbished se for salvado, senão new)
          '', // color
          columnMappings.gender || 'unisex', // gender
          p.material || '', // material
          '', // size
          '', // item_group_id
          'no', // identifier_exists
          '1', // quantity_to_sell_on_facebook
          productType, // product_type
          productType, // custom_label_0 (ambiente > categoria)
          formatDecimalPrice(currentParentPrice), // custom_label_1 (preço promocional ou preço normal se não tiver promo)
          oldParentPriceFormatted, // custom_label_2 (preço antigo se tiver promo ou vazio se não tiver)
          opportunityName, // custom_label_3 (oportunidade do produto)
        ]);
      }
    }

    // Gerar o corpo do arquivo separado por VÍRGULAS (CSV legítimo)
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map(formatCsvValue).join(',')),
    ].join('\n');

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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
