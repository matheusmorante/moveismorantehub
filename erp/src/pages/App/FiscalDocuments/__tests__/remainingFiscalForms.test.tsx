// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { legacyCceFormSchema } from '../../../../../../shared-utils/legacyFiscalFormSchemas';
import { useZodForm } from '@/hooks/useZodForm';
import { ORDER_EDIT_CCE_DISABLED_REASON } from '../../../../../../shared-utils/fiscalCorrectionPolicy';
import { hmlCsosnFormSchema } from '../../../../../../shared-utils/fiscalOperationFormSchemas';
import { nfeAcquisitionPurposeFormSchema, nfeEmissionDraftFormSchema } from '../../../../../../shared-utils/nfeEmissionFormValidation';
import { ncmCorrelationFormSchema, ncmProductReviewFormSchema } from '../../../../../../shared-utils/ncmManagementFormSchemas';

afterEach(cleanup);

describe('remaining fiscal form boundaries', () => {
  it.each(['', 'Conteudo legado suficiente para rejeicao.'])('rejects legacy CC-e before any effect: %s', async (correction) => {
    const submit = vi.fn();
    const { result } = renderHook(() => useZodForm(legacyCceFormSchema, { correction }));
    await act(async () => { expect(await result.current.validateAndRun({ correction }, submit)).toBe(false); });
    expect(submit).not.toHaveBeenCalled();
    expect(legacyCceFormSchema.safeParse({ correction }).error?.issues[0].message).toBe(ORDER_EDIT_CCE_DISABLED_REASON);
  });
  it('runs the resolver before saving the homologation CSOSN', async () => {
    const save = vi.fn();
    const { result } = renderHook(() => useZodForm(hmlCsosnFormSchema, { csosn: '' }));
    await act(async () => { expect(await result.current.validateAndRun({ csosn: '999' }, save)).toBe(false); });
    expect(save).not.toHaveBeenCalled();
    await act(async () => { await result.current.validateAndRun({ csosn: '103' }, save); });
    expect(save).toHaveBeenCalledWith({ csosn: '103' });
  });
  it('does not persist an invalid recipient document from a production draft', async () => {
    const values = { order: { id: 'order', items: [], customerData: { personType: 'PF' } }, recipientTaxId: '11111111111', nfeItems: [], environment: 1 };
    expect(nfeEmissionDraftFormSchema.safeParse(values).success).toBe(false);
    expect(nfeEmissionDraftFormSchema.safeParse({ ...values, recipientTaxId: '', environment: 2 }).success).toBe(true);
  });
  it('rejects missing acquisition identity and unsupported purposes', () => {
    expect(nfeAcquisitionPurposeFormSchema.safeParse({ orderId: '', purpose: 'resale' }).success).toBe(false);
    expect(nfeAcquisitionPurposeFormSchema.safeParse({ orderId: 'order', purpose: 'arbitrary' }).success).toBe(false);
    expect(nfeAcquisitionPurposeFormSchema.safeParse({ orderId: 'order', purpose: 'fixed_asset' }).success).toBe(true);
  });
  it('validates product selections, NCM destination and correlation version', () => {
    expect(ncmProductReviewFormSchema.safeParse({ destinationCode: '94035000', productIds: [] }).success).toBe(false);
    expect(ncmProductReviewFormSchema.parse({ destinationCode: '9403.50.00', productIds: ['product'] }).destinationCode).toBe('94035000');
    expect(ncmCorrelationFormSchema.safeParse({ sourceCode: '94035000', destinationCode: '94036000', relationType: 'one_to_one', version: '  ' }).success).toBe(false);
  });
});
