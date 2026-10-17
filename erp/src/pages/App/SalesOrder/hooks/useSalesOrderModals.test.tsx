// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSalesOrderModals } from './useSalesOrderModals';
import type Order from '@/pages/types/order.type';

const mocks = vi.hoisted(() => ({ prepare: vi.fn(), eligibility: vi.fn(), error: vi.fn(), navigate: vi.fn() }));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('@/pages/utils/nfeEmissionSnapshotService', () => ({ prepareOrderFiscalSnapshotForEmission: mocks.prepare }));
vi.mock('../../FiscalDocuments/services/fiscalOperationDraftService', () => ({ fetchReturnFiscalEligibility: mocks.eligibility }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error } }));
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); mocks.prepare.mockImplementation(async (order: Order) => order); });
const order = { id: 'order', orderType: 'sale', status: 'fulfilled' } as Order;
const setup = () => renderHook(() => useSalesOrderModals({ orderListRef: { current: null }, draftsListRef: { current: null }, setHighlightOrderId: vi.fn() }));

describe('sales order modal imports and actions', () => {
  it('uses the existing commercial return policy when opening the form', () => {
    const { result } = setup();
    act(() => result.current.handleOrderAction('generateReturn', { ...order, status: 'draft' }));
    expect(result.current.returningOrder).toBeNull();
    act(() => result.current.handleOrderAction('generateReturn', order));
    expect(result.current.returningOrder).toBe(order);
    expect(mocks.prepare).not.toHaveBeenCalled();
  });

  it('uses canGenerateAssistance policy when triggering generateAssistance', () => {
    const { result } = setup();
    act(() => result.current.handleOrderAction('generateAssistance', { ...order, status: 'draft' }));
    expect(result.current.assistanceSourceOrder).toBeNull();
    act(() => result.current.handleOrderAction('generateAssistance', order));
    expect(result.current.assistanceSourceOrder).toBe(order);
  });

  it('prepares the selected environment once and opens the emission form without transmitting', async () => {
    let finish!: (order: Order) => void;
    mocks.prepare.mockImplementationOnce(() => new Promise<Order>((resolve) => { finish = resolve; }));
    const { result } = setup();
    let first!: Promise<void>;
    await act(async () => { first = result.current.handleDirectIssueNfe(order, 2); });
    await act(async () => { await result.current.handleDirectIssueNfe(order, 2); });
    expect(mocks.prepare).toHaveBeenCalledTimes(1);
    expect(mocks.prepare).toHaveBeenCalledWith(order, 2);
    await act(async () => { finish(order); await first; });
    expect(result.current.chosenNfeEnvironment).toBe(2);
    expect(result.current.nfeModalOrder).toBe(order);
    expect(result.current.nfeSnapshotPreparationOrderId).toBeNull();
  });

  it('preserves the default production environment and releases preparation after a failure', async () => {
    mocks.prepare.mockRejectedValueOnce(new Error('Falha de preparação'));
    const { result } = setup();
    await act(async () => { await result.current.handleDirectIssueNfe(order); });
    expect(mocks.error).toHaveBeenCalledWith('Falha de preparação');
    expect(result.current.nfeModalOrder).toBeNull();
    expect(result.current.nfeSnapshotPreparationOrderId).toBeNull();
    await act(async () => { await result.current.handleDirectIssueNfe(order); });
    expect(mocks.prepare).toHaveBeenLastCalledWith(order, 1);
    expect(result.current.chosenNfeEnvironment).toBe(1);
  });
});
