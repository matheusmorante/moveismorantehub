// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFinancialOperation } from '../App/Finance/useFinancialOperation';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: mocks }));
import { financeService } from './financeService';

const account = { id: 'account-1', description: ' Saved ', amount: 10, date: '2026-10-15', status: 'pending' as const, category_id: '' };
const result = { id: 'account-1', status: 'paid', payment_date: '2026-10-15', transaction_id: 'tx-1', already_applied: false };
const request_id = '11111111-1111-4111-8111-111111111111';
const recurring = { request_id, payable: { description: ' Rent ', amount: 10, due_date: '2026-01-31', status: 'pending' as const, category_id: 'category', supplier_name: '', notes: '' }, frequency: 'monthly' as const };
beforeEach(() => { vi.resetAllMocks(); });
afterEach(cleanup);
describe('real financial command services', () => {
  it('validates and sends one atomic settlement command with the persisted snapshot', async () => {
    mocks.rpc.mockResolvedValue({ data: result, error: null });
    await expect(financeService.settleAccount({ kind: 'payable', account })).resolves.toEqual(result);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith('settle_financial_account', { p_kind: 'payable', p_account_id: 'account-1', p_payment_date: '2026-10-15', p_expected: { description: 'Saved', amount: 10, category_id: null } });
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('rejects invalid amounts and cancelled accounts before the transport', async () => {
    await expect(financeService.settleAccount({ kind: 'receivable', account: { ...account, amount: Infinity } })).rejects.toThrow();
    await expect(financeService.settleAccount({ kind: 'payable', account: { ...account, status: 'cancelled' } })).rejects.toThrow();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('propagates missing migration/permission errors without falling back to two writes', async () => {
    const error = { code: 'PGRST202', message: 'Function unavailable' };
    mocks.rpc.mockResolvedValue({ error, data: null });
    await expect(financeService.settleAccount({ kind: 'receivable', account })).rejects.toBe(error);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('does not acknowledge a different account, different date or malformed result', async () => {
    for (const data of [{ ...result, id: 'other' }, { ...result, payment_date: '2026-10-14' }, null]) {
      mocks.rpc.mockResolvedValue({ data, error: null });
      await expect(financeService.settleAccount({ kind: 'payable', account })).rejects.toEqual({ uncertain: true });
    }
  });
  it('creates one recurring command and requires 12 distinct returned account identities', async () => {
    const payable_ids = Array.from({ length: 12 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`);
    mocks.rpc.mockResolvedValue({ data: { recurring_expense_id: request_id, payable_ids, already_applied: false }, error: null });
    await financeService.createRecurringPayableExpense(recurring);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith('create_recurring_payable_expense', { p_request_id: request_id, p_payload: { payable: { ...recurring.payable, description: 'Rent' }, frequency: 'monthly' } });
    expect(mocks.from).not.toHaveBeenCalled();
    mocks.rpc.mockResolvedValue({ data: { recurring_expense_id: request_id, payable_ids: Array(12).fill(payable_ids[0]), already_applied: true }, error: null });
    await expect(financeService.createRecurringPayableExpense(recurring)).rejects.toEqual({ uncertain: true });
  });
  it('stops a Rede update when its lookup fails rather than inserting another config', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { code: '42501' } });
    const query = { select: vi.fn(() => ({ maybeSingle })), insert: vi.fn() };
    mocks.from.mockReturnValue(query);
    await expect(financeService.updateRedeConfig({ pv: '', client_id: '', client_secret: '', active: false, anticipation_enabled: false, environment: 'sandbox' })).rejects.toEqual({ code: '42501' });
    expect(query.insert).not.toHaveBeenCalled();
  });
  it('validates account and transaction writes before requesting a table', async () => {
    await expect(financeService.createPayable({ ...recurring.payable, amount: -1 })).rejects.toThrow();
    await expect(financeService.updateReceivable('account-1', { amount: 1.001 })).rejects.toThrow();
    await expect(financeService.createTransaction({ type: 'expense', amount: 0, description: 'Test', date: '2026-10-15', payment_method: 'Manual' })).rejects.toThrow();
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('preserves the assistant purpose and sends parsed transaction fields', async () => {
    const query: any = { insert: vi.fn(() => query), select: vi.fn(() => query), single: vi.fn().mockResolvedValue({ data: { id: 'tx-1' }, error: null }) };
    mocks.from.mockReturnValue(query);
    await financeService.createTransaction({ type: 'expense', amount: 10, description: ' Test ', date: '2026-10-15', payment_method: ' Manual ', purpose: 'PERSONAL' });
    expect(query.insert).toHaveBeenCalledWith([{ type: 'expense', amount: 10, description: 'Test', date: '2026-10-15', payment_method: 'Manual', purpose: 'PERSONAL', result_nature: 'DESPESA' }]);
  });
  it('rejects a mismatched category before writing a transaction', async () => {
    const query: any = { select: vi.fn(() => query), eq: vi.fn(() => query), maybeSingle: vi.fn().mockResolvedValue({ data: { name: 'Venda', type: 'income' }, error: null }), insert: vi.fn() };
    mocks.from.mockReturnValue(query);
    await expect(financeService.createTransaction({ type: 'expense', amount: 10, description: 'Test', date: '2026-10-15', payment_method: 'Manual', category_id: 'category' })).rejects.toThrow('Categoria incompatível');
    expect(query.insert).not.toHaveBeenCalled();
  });
  it('reports an unconfirmed bulk result and an update acknowledging another account', async () => {
    let data: unknown = [];
    const query: any = { insert: vi.fn(() => query), update: vi.fn(() => query), eq: vi.fn(() => query), select: vi.fn(() => query), single: vi.fn(async () => ({ data, error: null })), then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data, error: null }).then(resolve) };
    mocks.from.mockReturnValue(query);
    await expect(financeService.bulkCreatePayables([recurring.payable])).rejects.toEqual({ uncertain: true });
    data = { id: 'another-account' };
    await expect(financeService.updatePayable('account-1', { description: 'New' })).rejects.toEqual({ uncertain: true });
  });
  it.each([
    { code: '', message: 'SyntaxError: Unexpected end of JSON input', status: 0 },
    { message: 'Service Unavailable', status: 503 },
    { code: 'PGRST116', message: 'No rows returned', status: 406 },
  ])('blocks a second INSERT after an unacknowledged provider response: $message', async ({ status, ...error }) => {
    const query: any = { insert: vi.fn(() => query), select: vi.fn(() => query), single: vi.fn().mockResolvedValue({ data: null, error, status }) };
    mocks.from.mockReturnValue(query);
    const { result } = renderHook(useFinancialOperation);
    const input = { type: 'expense' as const, amount: 10, description: 'Test', date: '2026-10-15', payment_method: 'Manual' };
    await act(async () => { await result.current.run(() => result.current.wait(financeService.createTransaction(input))); });
    expect(result.current.uncertain).toBe(true);
    expect(result.current.error).toContain('Consulte a conta');
    await act(async () => { await result.current.run(() => result.current.wait(financeService.createTransaction(input))); });
    expect(query.insert).toHaveBeenCalledTimes(1);
  });
});
