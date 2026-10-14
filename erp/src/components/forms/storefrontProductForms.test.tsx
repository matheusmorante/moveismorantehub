// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useZodForm } from '@/hooks/useZodForm';
import { storefrontProductDraftFormSchema, storefrontProductFormSchema, storefrontVariationFormSchema, storefrontAttributeFormSchema, storefrontImageUploadFormSchema, parseStorefrontPrice } from '../../../../shared-utils/storefrontProductFormSchemas';
afterEach(cleanup);
const product = { name: 'Mesa', slug: 'mesa', description: '', price: '1.250,50', promo_price: '', is_salvado: false, opportunity_id: null, category_ids: ['34d868e3-64fd-4909-a126-bdbf96b03b9b'], width: '', depth: '', height: '', depth_use_length: false, images: [] };
describe('catalog product contracts', () => {
  it('preserves the existing currency interpretation', () => {
    expect(parseStorefrontPrice(product.price)).toBe(1250.5);
    expect(parseStorefrontPrice('12.50')).toBe(12.5);
    expect(parseStorefrontPrice('1.250')).toBe(1250);
  });
  it('allows incomplete drafts while final publication requires the existing category and slug', () => {
    const values = { product: { ...product, slug: '', category_ids: [] }, variations: [], variationsEnabled: false };
    expect(storefrontProductDraftFormSchema.safeParse(values).success).toBe(true);
    expect(storefrontProductFormSchema.safeParse(values).success).toBe(false);
  });
  it('blocks invalid promotion and variation photo before the publishing callback', async () => {
    const values = { product, variations: [{ attributes: {}, image_url: '' }], variationsEnabled: true };
    const publish = vi.fn();
    const { result } = renderHook(() => useZodForm(storefrontProductFormSchema, values));
    await act(async () => { await result.current.validateAndRun(values, publish); });
    expect(publish).not.toHaveBeenCalled();
    expect(storefrontProductFormSchema.safeParse({ ...values, variationsEnabled: false, product: { ...product, promo_price: '1.300,00' } }).success).toBe(false);
    await act(async () => { await result.current.validateAndRun({ ...values, variations: [{ attributes: {}, image_url: 'https://example.com/photo.jpg' }] }, publish); });
    expect(publish).toHaveBeenCalledOnce();
  });
  it('rejects invalid money, noninteger inventory and empty attribute values', () => {
    expect(storefrontVariationFormSchema.safeParse({ attributes: {}, price: 'abc' }).success).toBe(false);
    expect(storefrontVariationFormSchema.safeParse({ attributes: {}, stock: '1.5' }).success).toBe(false);
    expect(storefrontAttributeFormSchema.safeParse({ name: 'Cor', values: [] }).success).toBe(false);
    expect(storefrontAttributeFormSchema.parse({ name: ' Cor ', values: [' Azul '] })).toEqual({ name: 'Cor', values: ['Azul'] });
  });
  it('rejects nonimage uploads without changing valid File objects', () => {
    expect(storefrontImageUploadFormSchema.safeParse({ files: [new File(['x'], 'a.txt', { type: 'text/plain' })] }).success).toBe(false);
    const file = new File(['image'], 'a.png', { type: 'image/png' });
    expect(storefrontImageUploadFormSchema.parse({ files: [file] }).files[0]).toBe(file);
  });
});
