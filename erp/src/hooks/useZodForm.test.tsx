// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { useZodForm } from './useZodForm';

afterEach(cleanup);
describe('React Hook Form with the shared Zod resolver', () => {
  const schema = z.object({ name: z.string().trim().min(1), quantity: z.number().positive() });
  it('validates concurrent query snapshots in order without dropping the newest or stalling after invalid input', async () => {
    const asyncSchema = schema.refine(async () => { await Promise.resolve(); return true; });
    const { result } = renderHook(() => useZodForm(asyncSchema, { name: '', quantity: 0 }));
    await act(async () => {
      const values = await Promise.all([
        result.current.validateValues({ name: ' First ', quantity: 1 }),
        result.current.validateValues({ name: ' Second ', quantity: 2 }),
        result.current.validateValues({ name: '', quantity: 0 }),
        result.current.validateValues({ name: ' Last ', quantity: 3 }),
      ]);
      expect(values).toEqual([{ name: 'First', quantity: 1 }, { name: 'Second', quantity: 2 }, false, { name: 'Last', quantity: 3 }]);
    });
  });
  it('blocks invalid submission before the persistence callback', async () => {
    const action = vi.fn();
    const invalid = vi.fn();
    const { result } = renderHook(() => useZodForm(schema, { name: '', quantity: 0 }));
    await act(async () => {
      expect(await result.current.validateAndRun({ name: '', quantity: 0 }, action, invalid)).toBe(false);
    });
    expect(action).not.toHaveBeenCalled();
    expect(invalid).toHaveBeenCalledWith(expect.objectContaining({ name: expect.anything(), quantity: expect.anything() }), undefined);
  });
  it('passes parsed values and uses the current submit intent instead of stale defaults', async () => {
    const action = vi.fn(async (data) => ({ id: 'saved', ...data }));
    const { result } = renderHook(() => useZodForm(schema, { name: 'Old', quantity: 1 }));
    await act(async () => {
      expect(await result.current.validateAndRun({ name: ' Current ', quantity: 2 }, action)).toEqual({ id: 'saved', name: 'Current', quantity: 2 });
    });
    expect(action).toHaveBeenCalledWith({ name: 'Current', quantity: 2 });
  });
  it('keeps the button snapshot when a render occurs during async resolution', async () => {
    const asyncSchema = schema.refine(async () => { await Promise.resolve(); return true; });
    const { result, rerender } = renderHook(({ name }) => useZodForm(asyncSchema, { name, quantity: 1 }), { initialProps: { name: 'Old' } });
    await act(async () => {
      const pending = result.current.validateAndRun({ name: 'Submitted', quantity: 2 }, (data) => data);
      rerender({ name: 'Changed while resolving' });
      expect(await pending).toEqual({ name: 'Submitted', quantity: 2 });
    });
  });
  it('blocks duplicate submission while validation and persistence are pending', async () => {
    let finish!: () => void;
    const action = vi.fn(async () => { await new Promise<void>((resolve) => { finish = resolve; }); return 'saved'; });
    const { result } = renderHook(() => useZodForm(schema, { name: 'Name', quantity: 1 }));
    let first!: Promise<string | false>;
    await act(async () => {
      first = result.current.validateAndRun({ name: 'Name', quantity: 1 }, action);
      expect(await result.current.validateAndRun({ name: 'Other', quantity: 1 }, action)).toBe(false);
    });
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    await act(async () => {
      finish();
      expect(await first).toBe('saved');
    });
    expect(action).toHaveBeenCalledTimes(1);
  });
});
