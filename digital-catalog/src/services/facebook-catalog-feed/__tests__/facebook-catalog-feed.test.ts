import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  META_CATALOG_CSV_HEADERS,
  formatCsvValue,
  serializeFeedRowsToCsv,
} from '../csv-serializer';
import {
  resolveProductType,
  extractVariationAttributes,
  resolveEffectivePrice,
  resolveVariationSku,
  resolveParentProductSku,
  buildDescription,
} from '../feed-helpers';
import { mapProductsToFeedRows } from '../feed-mapper';
import { RawCatalogProduct, MetaCatalogSettings } from '../types';

test('META_CATALOG_CSV_HEADERS contains exactly the 24 required Meta columns in order', () => {
  assert.equal(META_CATALOG_CSV_HEADERS.length, 24);
  assert.equal(META_CATALOG_CSV_HEADERS[0], 'id');
  assert.equal(META_CATALOG_CSV_HEADERS[1], 'title');
  assert.equal(META_CATALOG_CSV_HEADERS[8], 'price');
  assert.equal(META_CATALOG_CSV_HEADERS[9], 'sale_price');
  assert.equal(META_CATALOG_CSV_HEADERS[23], 'custom_label_3');
});

test('formatCsvValue handles quotes, commas, newlines and nulls properly', () => {
  assert.equal(formatCsvValue(null), '');
  assert.equal(formatCsvValue(undefined), '');
  assert.equal(formatCsvValue('Simple'), 'Simple');
  assert.equal(formatCsvValue('Hello, World'), '"Hello, World"');
  assert.equal(formatCsvValue('Hello\nWorld'), '"Hello\nWorld"');
  assert.equal(formatCsvValue('Item "Especial"'), '"Item ""Especial"""');
});

test('serializeFeedRowsToCsv formats headers and rows into clean CSV', () => {
  const rows = [
    ['000100', 'Mesa de Centro', 'Descricao', 'http://link', 'http://img', '', 'in stock', 'Descricao', '299.00 BRL', '', 'Móveis Morante', 'new', '', 'unisex', '', '', '', 'no', '1', 'Sala', 'Sala', '299,00', '', '']
  ];
  const csv = serializeFeedRowsToCsv(rows);
  const lines = csv.split('\n');
  assert.equal(lines.length, 2);
  assert.equal(lines[0], META_CATALOG_CSV_HEADERS.join(','));
  assert.ok(lines[1].startsWith('000100,Mesa de Centro'));
});

test('resolveProductType handles environments and categories hierarchy', () => {
  const productWithBoth: RawCatalogProduct = {
    id: 'p1',
    name: 'Guarda Roupa',
    slug: 'guarda-roupa',
    product_categories: [
      { categories: { name: 'Quarto', type: 'environment' } },
      { categories: { name: 'Guarda-Roupa', type: 'category' } },
    ],
  };
  assert.equal(resolveProductType(productWithBoth), 'Quarto > Guarda-Roupa');

  const productWithCatOnly: RawCatalogProduct = {
    id: 'p2',
    name: 'Mesa',
    slug: 'mesa',
    product_categories: [
      { categories: { name: 'Mesas', type: 'category' } },
    ],
  };
  assert.equal(resolveProductType(productWithCatOnly), 'Mesas');

  const productWithNone: RawCatalogProduct = {
    id: 'p3',
    name: 'Outro',
    slug: 'outro',
    product_categories: [],
  };
  assert.equal(resolveProductType(productWithNone), 'Móveis');
});

test('extractVariationAttributes parses both array and object formats', () => {
  const fromArray = [
    { name: 'Cor', value: 'Freijó/Off White' },
    { name: 'Tamanho', value: 'Casal' },
  ];
  const res1 = extractVariationAttributes(fromArray);
  assert.equal(res1.color, 'Freijó/Off White');
  assert.equal(res1.size, 'Casal');

  const fromObject = { Cor: 'Branco', Tamanho: 'Solteiro' };
  const res2 = extractVariationAttributes(fromObject);
  assert.equal(res2.color, 'Branco');
  assert.equal(res2.size, 'Solteiro');
});

test('resolveEffectivePrice correctly handles normal, promo and zero-regular fallbacks', () => {
  // Caso normal sem promo
  const p1 = resolveEffectivePrice(100, 0);
  assert.equal(p1.isValid, true);
  assert.equal(p1.regularPrice, 100);
  assert.equal(p1.hasPromo, false);
  assert.equal(p1.currentPrice, 100);
  assert.equal(p1.oldPriceFormatted, '');

  // Caso com promo
  const p2 = resolveEffectivePrice(200, 150);
  assert.equal(p2.isValid, true);
  assert.equal(p2.regularPrice, 200);
  assert.equal(p2.promoPrice, 150);
  assert.equal(p2.hasPromo, true);
  assert.equal(p2.currentPrice, 150);
  assert.equal(p2.oldPriceFormatted, '200,00');

  // Caso preco normal zero mas promocional positivo
  const p3 = resolveEffectivePrice(0, 80);
  assert.equal(p3.isValid, true);
  assert.equal(p3.regularPrice, 80);
  assert.equal(p3.hasPromo, false);

  // Caso preco zero
  const p4 = resolveEffectivePrice(0, 0);
  assert.equal(p4.isValid, false);
});

test('resolveVariationSku and resolveParentProductSku strictly prioritize product SKU and reject slugs', () => {
  // Variação com SKU existente
  const varWithSku = { id: 'v-uuid-1', sku: '000224-02' };
  assert.equal(resolveVariationSku(varWithSku, '000224', 1), '000224-02');

  // Variação sem SKU mas com código pai
  const varWithoutSku = { id: 'v-uuid-2', sku: null };
  assert.equal(resolveVariationSku(varWithoutSku, '000224', 0), '000224-01');

  // Variação onde SKU era um slug legado -> DEVE ser rejeitado e usar SKU padrão
  const varWithSlugSku = {
    id: 'v-uuid-3',
    sku: 'armario-aereo-florenca-3-portas-120-100-mdf-canary',
  };
  assert.equal(resolveVariationSku(varWithSlugSku, '000213', 0), '000213-01');

  // Variação com slug 01-7bdb15 -> DEVE ser rejeitado e usar SKU padrão
  const varWithHexSlug = { id: 'v-uuid-4', sku: '01-7bdb15' };
  assert.equal(resolveVariationSku(varWithHexSlug, '004013', 0), '004013-01');

  // Produto pai com code
  const parentWithCode: RawCatalogProduct = { id: 'p-uuid-1', code: '000131', name: 'Balcao', slug: 'balcao' };
  assert.equal(resolveParentProductSku(parentWithCode), '000131');

  // Produto pai cujo sku era slug
  const parentWithSlugSku: RawCatalogProduct = {
    id: 'p-uuid-2',
    code: '000213',
    sku: 'armario-aereo-florenca',
    name: 'Armario',
    slug: 'armario-aereo-florenca',
  };
  assert.equal(resolveParentProductSku(parentWithSlugSku), '000213');
});

test('mapProductsToFeedRows outputs strictly SKUs as id and ignores invalid/inactive items', () => {
  const settings: MetaCatalogSettings = {
    globalDescriptionPrefix: 'Frete grátis para Curitiba',
    columnMappings: { brand: 'Móveis Morante', gender: 'unisex' },
  };

  const products: RawCatalogProduct[] = [
    // 1. Produto com variações
    {
      id: 'p-uuid-florida',
      code: '000224',
      name: 'Guarda Roupa Florida',
      slug: 'guarda-roupa-florida',
      price: 1649,
      status: 'published',
      active: true,
      images: ['https://pub-r2.dev/foto-pai.jpg'],
      product_variations: [
        {
          id: 'v-uuid-offwhite',
          sku: '000224-02',
          name: 'Guarda Roupa Florida Freijó/Off White',
          status: 'published',
          active: true,
          attributes: { Cor: 'Freijó/Off White' },
          image_url: 'https://pub-r2.dev/foto-offwhite.jpg',
        },
        {
          id: 'v-uuid-hidden',
          sku: '000224-03',
          name: 'Variação Oculta',
          status: 'hidden',
          active: true,
        },
      ],
    },
    // 2. Produto sem variações publicadas (todas ocultas ou ausentes) - NÃO deve entrar no feed
    {
      id: 'p-uuid-balcao',
      code: '000131',
      name: 'Balcão para Pia de 1,20m',
      slug: 'balcao-120m',
      price: 499,
      status: 'published',
      active: true,
      images: ['https://pub-r2.dev/balcao.jpg'],
      product_variations: [
        {
          id: 'v-uuid-balcao-hidden',
          sku: '000131-01',
          name: 'Balcão Branco',
          status: 'hidden',
          active: true,
        },
      ],
    },
    // 3. Produto inativo/oculto no catálogo (não deve entrar)
    {
      id: 'p-uuid-inativo',
      code: '000999',
      name: 'Produto Inativo',
      slug: 'inativo',
      price: 100,
      status: 'hidden',
      active: false,
      images: ['https://pub-r2.dev/inativo.jpg'],
    },
  ];

  const rows = mapProductsToFeedRows({
    products,
    settings,
    origin: 'https://moveismorante.com.br',
  });

  // Deve conter estritamente 1 linha: apenas a variação publicada
  // Produtos pai e produtos sem variações publicadas nunca devem ser emitidos
  assert.equal(rows.length, 1);

  // Linha 1: variação com SKU
  assert.equal(rows[0][0], '000224-02');
  assert.equal(rows[0][1], 'Guarda Roupa Florida Freijó/Off White');
  assert.ok(rows[0][2].startsWith('Frete grátis para Curitiba'));
  assert.equal(rows[0][8], '1649.00 BRL');

  // Garante que o código do produto pai 000131 NÃO está presente em nenhuma linha
  const hasParentCode = rows.some((r) => r[0] === '000131' || r[0] === '000224');
  assert.equal(hasParentCode, false);
});

test('mapProductsToFeedRows exclui produtos e variações com active: false mesmo com status published (bug desincronização)', () => {
  const settings: MetaCatalogSettings = {
    globalDescriptionPrefix: '',
    columnMappings: { brand: 'Móveis Morante', gender: 'unisex' },
  };

  const products: RawCatalogProduct[] = [
    // Produto pai desativado (active: false) mas status 'published' — NÃO deve entrar
    {
      id: 'p-uuid-desativado',
      code: '000368',
      name: 'Balcão para Pia Jk 1º Linha 3 Gavetas',
      slug: 'balcao-para-pia-jk-1-linha-3-gavetas',
      price: 449,
      status: 'published',
      active: false,   // ← foi desativado, status ficou desincronizado
      is_salvado: false,
      images: ['https://pub-r2.dev/balcao.jpg'],
      product_variations: [
        {
          id: '8cc6f2e9-e2e6-433a-9adb-f403353642f5',
          sku: '000368-01',
          name: 'Balcão para Pia Jk 1º Linha 3 Gavetas',
          status: 'published',
          active: false,  // ← variação também desativada
        },
      ],
    },
    // Produto com variação active: false — a variação NÃO deve entrar
    {
      id: 'p-uuid-misto',
      code: '000100',
      name: 'Produto Misto',
      slug: 'produto-misto',
      price: 300,
      status: 'published',
      active: true,
      images: ['https://pub-r2.dev/misto.jpg'],
      product_variations: [
        {
          id: 'v-uuid-var-ativa',
          sku: '000100-01',
          name: 'Variação Ativa',
          status: 'published',
          active: true,
        },
        {
          id: 'v-uuid-var-inativa',
          sku: '000100-02',
          name: 'Variação Inativa',
          status: 'published',
          active: false, // ← desativada deve ser excluída
        },
      ],
    },
  ];

  const rows = mapProductsToFeedRows({
    products,
    settings,
    origin: 'https://moveismorante.com.br',
  });

  // Só a variação ativa do produto misto deve aparecer
  assert.equal(rows.length, 1);
  assert.equal(rows[0][0], '000100-01');

  // Nenhuma entrada do produto desativado (000368) deve aparecer
  const has368 = rows.some((r) => String(r[0]).includes('000368'));
  assert.equal(has368, false);
});

test('mapProductsToFeedRows includes published variations of salvados even if active is false', () => {
  const settings: MetaCatalogSettings = {
    globalDescriptionPrefix: '',
    columnMappings: { brand: 'Móveis Morante', gender: 'unisex' },
  };

  const products: RawCatalogProduct[] = [
    {
      id: '5f44c0e1-1596-4f27-adc8-9f0afce089f7',
      code: '000314',
      name: 'Guarda-Roupa Paris Queima dos Salvados',
      slug: 'guarda-roupa-paris-queima-dos-salvados',
      price: 1399,
      status: 'published',
      active: false, // Em salvados, active é false no ERP
      is_salvado: true,
      product_kind: 'salvado',
      images: ['https://pub-r2.dev/paris-pai.jpg'],
      product_variations: [
        {
          id: 'df9f1631-844e-4b24-8ab3-3af810a159e8',
          sku: '000314-01',
          name: 'Guarda-Roupa Paris Preto',
          status: 'published',
          active: false,
          attributes: { Cor: 'Preto' },
          image_url: 'https://pub-r2.dev/paris-preto.jpg',
        },
        {
          id: 'e4f92379-fa15-4428-8c0e-311bf48f9437',
          sku: '000314-04',
          name: 'Guarda-Roupa Paris Branco',
          status: 'hidden',
          active: false,
        },
      ],
    },
  ];

  const rows = mapProductsToFeedRows({
    products,
    settings,
    origin: 'https://moveismorante.com.br',
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0][0], '000314-01');
  assert.equal(rows[0][1], 'Guarda-Roupa Paris Preto');
  assert.equal(rows[0][11], 'refurbished'); // condition para salvados
  assert.equal(rows[0][12], 'Preto'); // cor
});
