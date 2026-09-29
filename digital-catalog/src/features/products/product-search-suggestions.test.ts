import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  filterPublicCatalogSuggestions,
  isCatalogSearchLongEnough,
  normalizeCatalogSearchInput,
  orderCatalogSearchResultsByIds,
} from './product-search-suggestions';

test('published catalog items stay visible when ERP product and variation are inactive', () => {
  const product = {
    id: 'published-inactive',
    status: 'published',
    active: false,
    product_variations: [{ status: 'published', active: false }],
  };

  assert.deepEqual(filterPublicCatalogSuggestions([product]), [product]);
});

test('hidden, draft, deleted, and products without a published variation are excluded', () => {
  const products = [
    { id: 'hidden', status: 'hidden' },
    { id: 'draft', status: 'draft' },
    { id: 'deleted', status: 'published', deleted_at: '2026-09-01T00:00:00Z' },
    {
      id: 'all-variations-hidden',
      status: 'published',
      product_variations: [{ status: 'hidden' }],
    },
  ];

  assert.deepEqual(filterPublicCatalogSuggestions(products), []);
});

test('a product with at least one published variation is suggested', () => {
  const product = {
    id: 'one-visible-variation',
    status: 'published',
    product_variations: [{ status: 'hidden' }, { status: 'published', active: false }],
  };

  assert.deepEqual(filterPublicCatalogSuggestions([product]), [product]);
});

test('search matching runs before the five-product cap', () => {
  const products = Array.from({ length: 8 }, (_, index) => ({
    id: `product-${index}`,
    status: 'published',
  }));

  const suggestions = filterPublicCatalogSuggestions(
    products,
    (product) => product.id !== 'product-0'
  );

  assert.deepEqual(
    suggestions.map(({ id }) => id),
    ['product-1', 'product-2', 'product-3', 'product-4', 'product-5']
  );
});

test('search input normalization treats accents, hyphens, and repeated spaces consistently', () => {
  assert.equal(normalizeCatalogSearchInput('  SOFÁ--Cama   '), 'sofa cama');
  assert.equal(isCatalogSearchLongEnough('  sofá '), true);
  assert.equal(isCatalogSearchLongEnough(' tv '), false);
});

test('hydrated page details retain the database relevance order', () => {
  const products = [
    { id: 'third', name: 'Third' },
    { id: 'first', name: 'First' },
    { id: 'second', name: 'Second' },
    { id: 'not-in-page', name: 'Extra' },
  ];

  assert.deepEqual(
    orderCatalogSearchResultsByIds(products, ['first', 'second', 'third']).map(({ id }) => id),
    ['first', 'second', 'third']
  );
});
