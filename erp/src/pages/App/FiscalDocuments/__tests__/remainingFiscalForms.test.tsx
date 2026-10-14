// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFiscalCceModal } from '../hooks/useFiscalCceModal';
import { useZodForm } from '@/hooks/useZodForm';
import { ORDER_EDIT_CCE_DISABLED_REASON } from '../../../../../../shared-utils/fiscalCorrectionPolicy';
import { hmlCsosnFormSchema } from '../../../../../../shared-utils/fiscalOperationFormSchemas';
import { nfeAcquisitionPurposeFormSchema, nfeEmissionDraftFormSchema } from '../../../../../../shared-utils/nfeEmissionFormValidation';
import { ncmCorrelationFormSchema, ncmProductReviewFormSchema } from '../../../../../../shared-utils/ncmManagementFormSchemas';

const mocks = vi.hoisted(() => ({ history: vi.fn(), submit: vi.fn(), reconcile: vi.fn(), error: vi.fn() }));
vi.mock('../services/fiscalCceService', () => ({ fetchCceHistory: mocks.history, submitCce: mocks.submit, reconcileCce: mocks.reconcile }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, info: vi.fn(), success: vi.fn(), warning: vi.fn() } }));
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); mocks.history.mockResolvedValue({ previousCorrection: '', nextSequence: 1, pending: false }); });

describe('remaining fiscal form boundaries', () => {
  it('blocks every new CC-e submission before calling the API', async () => {
    const { result } = renderHook(() => useFiscalCceModal());
    await act(async () => { await result.current.openCce({ id: 'historical-document', ambiente: 1 } as never); });
    act(() => result.current.setCceText('Correção histórica com conteúdo suficiente.'));
    await act(async () => { await result.current.handleSubmit(); });
    expect(mocks.submit).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith(ORDER_EDIT_CCE_DISABLED_REASON);
  });
  it('preserves historical reconciliation without starting a new event', async () => {
    const updated = vi.fn();
    mocks.history.mockResolvedValueOnce({ previousCorrection: 'Histórico', nextSequence: 2, pending: true });
    mocks.reconcile.mockResolvedValue({ success: true, pending: false, sequence: 1, protocolNumber: 'historical-protocol' });
    const { result } = renderHook(() => useFiscalCceModal(updated));
    await act(async () => { await result.current.openCce({ id: 'historical-document', ambiente: 1 } as never); });
    await act(async () => { await result.current.handleReconcile(); });
    expect(mocks.reconcile).toHaveBeenCalledWith('historical-document');
    expect(mocks.submit).not.toHaveBeenCalled();
    expect(updated).toHaveBeenCalledTimes(1);
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
