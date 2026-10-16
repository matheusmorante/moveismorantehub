// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useFinancialOperation } from './useFinancialOperation';
import { useZodForm } from '@/hooks/useZodForm';
import { financialTransactionFormSchema } from '../../../../../shared-utils/financialFormSchemas';
const values = { description: ' Test ', amount: 10, type: 'expense' as const, date: '2026-10-15', payment_method: 'Manual' };
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe('financial operation lifecycle with real RHF', () => {
  it('locks all owner intents before validation and keeps the resolver active through the write', async () => {
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    const write = vi.fn((_input: unknown) => pending);
    const otherWrite = vi.fn();
    const { result } = renderHook(() => { const op = useFinancialOperation(); const form = useZodForm(financialTransactionFormSchema, values); void form.formState.isSubmitting; return { op, form }; });
    let first!: Promise<void>;
    await act(async () => {
      first = result.current.op.run(() => result.current.form.validateAndRun(values, (parsed) => result.current.op.wait(write(parsed))));
      await result.current.op.run(async () => { otherWrite(); });
    });
    expect(write).toHaveBeenCalledWith(expect.objectContaining({ description: 'Test' }));
    expect(otherWrite).not.toHaveBeenCalled();
    expect(result.current.form.formState.isSubmitting).toBe(true);
    await act(async () => { finish(); await first; });
    expect(result.current.op.busy).toBe(false);
    expect(result.current.form.formState.isSubmitting).toBe(false);
  });
  it('releases RHF on timeout, reports uncertainty and blocks replay', async () => {
    vi.useFakeTimers();
    const write = vi.fn(() => new Promise<void>(() => {}));
    const { result } = renderHook(() => { const op = useFinancialOperation(); const form = useZodForm(financialTransactionFormSchema, values); void form.formState.isSubmitting; return { op, form }; });
    let submission!: Promise<void>;
    await act(async () => { submission = result.current.op.run(() => result.current.form.validateAndRun(values, () => result.current.op.wait(write()))); });
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); await submission; });
    expect(result.current.op.busy).toBe(false);
    expect(result.current.form.formState.isSubmitting).toBe(false);
    expect(result.current.op.uncertain).toBe(true);
    expect(result.current.op.error).toContain('Consulte a conta');
    await act(async () => { await result.current.op.run(async () => { write(); }); });
    expect(write).toHaveBeenCalledTimes(1);
  });
  it('prevents a late response from running callbacks of an unmounted owner', async () => {
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    const saved = vi.fn();
    const { result, unmount } = renderHook(useFinancialOperation);
    const op = result.current;
    let submission!: Promise<void>;
    await act(async () => { submission = op.run(async () => { await op.wait(pending); if (op.current()) saved(); }); });
    unmount();
    await act(async () => { finish(); await submission; });
    expect(saved).not.toHaveBeenCalled();
  });
  it('treats a Supabase transport error as uncertain and hides its details', async () => {
    const { result } = renderHook(useFinancialOperation);
    await act(async () => { await result.current.run(() => result.current.wait(Promise.reject({ code: '', message: 'TypeError: Failed to fetch private-detail' }))); });
    expect(result.current.uncertain).toBe(true);
    expect(result.current.error).not.toContain('private-detail');
  });
});
