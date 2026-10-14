// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useZodForm } from '@/hooks/useZodForm';
import { createMobileProductFormSchema } from '../../../../shared-utils/mobileProductFormSchema';
import { createInboundFamilyVariationSchema, mobileInboundMappingsFormSchema } from '../../../../shared-utils/inboundProductLinkFormSchemas';
import { marketingTemplateFormSchema, marketingTemplateFormValues } from '../../../../shared-utils/marketingFormSchemas';
import { compositionTemplate } from '@/pages/App/Marketing/Posts/services/compositionDefaults';
import { createPersonFormSchema } from '../../../../shared-utils/personDomainValidation';
afterEach(cleanup);
describe('continued domain boundaries', () => {
  it('preserves incomplete mobile drafts but rejects invalid numeric values before save', async () => {
    const schema = createMobileProductFormSchema({ draft: true, isStockistOnly: false, published: false });
    const values = { name: 'Mesa', unitPrice: '', variations: [{ id: 'variation', attributes: { Cor: { value: 'Azul', showName: false } }, legacy: 'preserve' }] };
    const save = vi.fn();
    const { result } = renderHook(() => useZodForm(schema, values));
    await act(async () => { await result.current.validateAndRun({ ...values, unitPrice: Number.NaN }, save); });
    expect(save).not.toHaveBeenCalled();
    await act(async () => { await result.current.validateAndRun(values, save); });
    expect(save).toHaveBeenCalledWith(values);
  });
  it('blocks foreign invoice items and missing variation markup before creating a family variation', () => {
    const schema = createInboundFamilyVariationSchema([1]);
    const value = { itemNumber: 1, supplierId: 'supplier', productId: 'product', markup: '25,5', quantity: 2, finalCost: 100, normalizedParentName: 'Mesa' };
    expect(schema.parse(value).markup).toBe(25.5);
    expect(schema.safeParse({ ...value, itemNumber: 2 }).success).toBe(false);
    expect(schema.safeParse({ ...value, markup: '' }).success).toBe(false);
  });
  it('does not persist invalid composition multipliers or discard source NF item metadata', async () => {
    const save = vi.fn();
    const values = { invoiceId: 'invoice', supplierId: 'supplier', items: [{ itemNumber: 1, productCode: 'source', productDescription: 'Mesa', sourceXml: 'original', compositionLinks: [{ id: 'link', productId: 'product', quantityMultiplier: 0 }] }] };
    const { result } = renderHook(() => useZodForm(mobileInboundMappingsFormSchema, values));
    await act(async () => { await result.current.validateAndRun(values, save); });
    expect(save).not.toHaveBeenCalled();
    const valid = { ...values, items: [{ ...values.items[0], compositionLinks: [{ id: 'link', productId: 'product', quantityMultiplier: 2 }] }] };
    await act(async () => { await result.current.validateAndRun(valid, save); });
    expect(save).toHaveBeenCalledWith(valid);
  });
  it('validates every template layout before caching an autosave', () => {
    const values = marketingTemplateFormValues(compositionTemplate);
    expect(marketingTemplateFormSchema.safeParse(values).success).toBe(true);
    const invalid = { ...values, layouts: { '9:16': { aspectRatio: '9:16', targetWidth: 1080, targetHeight: 1920, layers: [{ ...values.layers[0], width: Number.NaN }] } } };
    expect(marketingTemplateFormSchema.safeParse(invalid).success).toBe(false);
  });
  it('parses mobile supplier lead time without replacing invalid text with zero', () => {
    const schema = createPersonFormSchema('suppliers');
    expect(schema.parse({ fullName: 'Fornecedor', leadTime: '12' }).leadTime).toBe(12);
    expect(schema.safeParse({ fullName: 'Fornecedor', leadTime: 'abc' }).success).toBe(false);
  });
});
