import {
  MapProductsOptions,
  RawCatalogProduct,
  RawProductVariation,
  MetaCatalogColumnMappings,
} from './types';
import {
  resolveProductType,
  extractVariationAttributes,
  buildDescription,
  resolveEffectivePrice,
  extractProductImages,
  resolveVariationSku,
  normalizeMetaImageUrl,
  formatDecimalPrice,
} from './feed-helpers';

/**
 * Constrói uma linha CSV para uma variação de produto
 */
function buildVariationRow(options: {
  product: RawCatalogProduct;
  variation: RawProductVariation;
  variationIndex: number;
  origin: string;
  productType: string;
  parentImage: string;
  additionalImages: string;
  globalPrefix?: string;
  opportunityName?: string;
  opportunityObservations?: string;
  columnMappings: MetaCatalogColumnMappings;
}): string[] | null {
  const { product, variation, variationIndex, origin, productType, parentImage, additionalImages } = options;

  if (variation.status === 'hidden') {
    return null;
  }

  const isParentPrice = variation.use_parent_price !== false;
  const isParentPromo = variation.use_parent_promo_price !== false;
  const isParentDesc = variation.use_parent_description !== false;

  const rawVarPrice = isParentPrice ? product.price : variation.price || product.price;
  const rawVarPromo = isParentPromo ? product.promo_price : variation.promo_price;
  const varDesc = isParentDesc ? product.description : variation.description || product.description;

  let { color, size } = extractVariationAttributes(variation.attributes);

  // Nome da variação
  let varName = String(variation.name || '').trim();
  if (!varName) {
    const suffixParts = [color, size].filter(Boolean);
    varName = suffixParts.length > 0 ? `${product.name} - ${suffixParts.join(' / ')}` : String(product.name).trim();
  }

  // Fallback de cor pelo nome
  if (!color && /branco/i.test(varName)) {
    color = 'Branco';
  }

  // Imagens da variação
  let varImageLink = normalizeMetaImageUrl(parentImage);
  let varAdditionalImages = additionalImages
    .split(',')
    .map(normalizeMetaImageUrl)
    .filter(Boolean)
    .join(',');

  if (variation.image_url) {
    const varImagesList = variation.image_url
      .split(',')
      .map((url) => String(url).trim())
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

  // Preço
  const priceInfo = resolveEffectivePrice(rawVarPrice, rawVarPromo);

  // Meta exige preço estritamente positivo e imagem válida
  if (!priceInfo.isValid || !varImageLink) {
    return null;
  }

  // Descrição
  const descWithPrefix = buildDescription({
    globalPrefix: options.globalPrefix,
    opportunityName: options.opportunityName,
    opportunityObservations: options.opportunityObservations,
    body: varDesc,
  });

  // SKU da variação (estritamente o SKU do produto)
  const varSku = resolveVariationSku(variation, product.code, variationIndex);

  return [
    varSku, // id
    varName, // title
    descWithPrefix, // description
    `${origin}/produto/${product.slug}?var=${variation.id}`, // link
    varImageLink, // image_link
    varAdditionalImages, // additional_image_link
    'in stock', // availability
    descWithPrefix, // rich_text_description
    `${priceInfo.regularPrice.toFixed(2)} BRL`, // price
    priceInfo.hasPromo ? `${priceInfo.promoPrice.toFixed(2)} BRL` : '', // sale_price
    options.columnMappings.brand || 'Móveis Morante', // brand
    product.is_salvado ? 'refurbished' : 'new', // condition
    color, // color
    options.columnMappings.gender || 'unisex', // gender
    product.material || '', // material
    size, // size
    '', // item_group_id (sem grupos: cada variação é um produto individual)
    'no', // identifier_exists
    '1', // quantity_to_sell_on_facebook
    productType, // product_type
    productType, // custom_label_0
    formatDecimalPrice(priceInfo.currentPrice), // custom_label_1
    priceInfo.oldPriceFormatted, // custom_label_2
    options.opportunityName || '', // custom_label_3
  ];
}

/**
 * Mapeia todos os produtos e variações em linhas para o feed da Meta.
 * No MoranteHub, apenas variações são itens de venda e devem compor o catálogo.
 * Códigos pai de produtos nunca devem ser exportados ao Meta Catalog.
 */
export function mapProductsToFeedRows(options: MapProductsOptions): string[][] {
  const { products, settings, origin } = options;
  const rows: string[][] = [];

  for (const product of products) {
    // Ignora rascunhos, deletados ou produtos não publicados no canal do Catálogo
    if (product.is_draft || product.deleted || product.deleted_at || product.status !== 'published') {
      continue;
    }

    // Exclui produtos desativados (active: false), exceto salvados que têm active: false por definição
    const isSalvado = product.is_salvado === true || product.product_kind === 'salvado';
    if (!isSalvado && product.active === false) {
      continue;
    }

    const isParentPublished = product.status === 'published';

    // Suporte a variações relacionais e variações legadas em JSON
    let variationsList: RawProductVariation[] = [];
    if (product.product_variations && product.product_variations.length > 0) {
      variationsList = product.product_variations.filter(
        (v) =>
          v.status !== 'hidden' &&
          (isSalvado || v.active !== false) &&
          (v.status === 'published' || (!v.status && isParentPublished))
      );
    } else if (product.variations) {
      const rawVars: RawProductVariation[] = Array.isArray(product.variations)
        ? product.variations
        : typeof product.variations === 'string'
          ? JSON.parse(product.variations || '[]')
          : [];
      variationsList = rawVars.filter(
        (v) =>
          v.status !== 'hidden' &&
          (isSalvado || v.active !== false) &&
          (v.status === 'published' || (!v.status && isParentPublished))
      );
    }

    // Se não houver variações publicadas para esta família de produtos, ignora completamente
    if (variationsList.length === 0) {
      continue;
    }

    const productType = resolveProductType(product);
    const { parentImage, additionalImages } = extractProductImages(product);

    const opp = Array.isArray(product.opportunities)
      ? product.opportunities[0]
      : product.opportunities;
    const opportunityName = opp?.name ? String(opp.name).trim() : '';
    const opportunityObservations = opp?.observations ? String(opp.observations).trim() : '';

    for (let i = 0; i < variationsList.length; i++) {
      const row = buildVariationRow({
        product,
        variation: variationsList[i],
        variationIndex: i,
        origin,
        productType,
        parentImage,
        additionalImages,
        globalPrefix: settings.globalDescriptionPrefix,
        opportunityName,
        opportunityObservations,
        columnMappings: settings.columnMappings,
      });

      if (row) {
        rows.push(row);
      }
    }
  }

  return rows;
}
