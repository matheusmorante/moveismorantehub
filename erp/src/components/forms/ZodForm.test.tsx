// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ZodForm } from './ZodForm';
import { bulkAttributeFormSchema, bulkNcmFormSchema, catalogNameFormSchema, cartesianVariationFormSchema } from '../../../../shared-utils/catalogFormSchemas';
import { inboundAccessKeyFormSchema, manualScanFormSchema } from '../../../../shared-utils/lookupFormSchemas';
import { stockUnavailabilityFormSchema } from '../../../../shared-utils/operationsFormSchemas';

const { error } = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: { error } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('controlled form boundary', () => {
  it('blocks invalid catalog names and displays the resolver error', async () => {
    const submit = vi.fn();
    render(<ZodForm schema={catalogNameFormSchema} values={{ name: '  ' }} onSubmit={submit}><button>Salvar</button></ZodForm>);
    fireEvent.submit(screen.getByRole('button').closest('form')!);
    await waitFor(() => expect(error).toHaveBeenCalledWith('Informe o nome.'));
    expect(submit).not.toHaveBeenCalled();
  });
  it('passes a valid submission through the resolver to its existing callback', async () => {
    const submit = vi.fn();
    render(<ZodForm schema={catalogNameFormSchema} values={{ name: 'MDF' }} onSubmit={submit}><button>Salvar</button></ZodForm>);
    fireEvent.submit(screen.getByRole('button').closest('form')!);
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect(error).not.toHaveBeenCalled();
  });
});

describe('shared small form contracts', () => {
  it('validates masked NCM without accepting an incomplete code', () => {
    expect(bulkNcmFormSchema.parse({ ncm: '9403.50.00' }).ncm).toBe('94035000');
    expect(bulkNcmFormSchema.safeParse({ ncm: '9403' }).success).toBe(false);
  });
  it('preserves alphanumeric access keys and rejects foreign characters', () => {
    const numeric = '41260802216300000138550010000040201276092641';
    const key = `${numeric.slice(0, 10)}A${numeric.slice(11)}`;
    expect(key.length).toBe(44);
    expect(inboundAccessKeyFormSchema.parse({ accessKey: key.toLowerCase() }).accessKey).toBe(key);
    expect(inboundAccessKeyFormSchema.safeParse({ accessKey: key.replace('A', '!') }).success).toBe(false);
  });
  it('requires attributes, values, selections and manual scan content', () => {
    expect(bulkAttributeFormSchema.safeParse({ name: 'Cor', value: ' ' }).success).toBe(false);
    expect(cartesianVariationFormSchema.safeParse({ attributes: [] }).success).toBe(false);
    expect(manualScanFormSchema.safeParse({ code: ' ' }).success).toBe(false);
  });
  it('blocks invalid quantities and a missing supplier for supplier returns', () => {
    const base = { productId: 'product', variationId: 'variation', quantity: 1, availableStock: 2, supplierId: 'supplier', reason: 'Avaria', treatment: 'Devolução ao fornecedor' };
    expect(stockUnavailabilityFormSchema.safeParse(base).success).toBe(true);
    for (const quantity of [0, -1, Infinity, NaN, 3]) expect(stockUnavailabilityFormSchema.safeParse({ ...base, quantity }).success).toBe(false);
    expect(stockUnavailabilityFormSchema.safeParse({ ...base, supplierId: '' }).success).toBe(false);
  });
});
