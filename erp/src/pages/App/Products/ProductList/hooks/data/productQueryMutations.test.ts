import { describe, expect, it, vi } from 'vitest';
import { persistAndInvalidateProductList } from './productQueryMutations';

describe('persistAndInvalidateProductList', () => {
  it('invalidates the list after persistence succeeds', async () => {
    const events: string[] = [];
    const persist = vi.fn(async () => {
      events.push('persist');
      return 'saved';
    });
    const invalidate = vi.fn(async () => {
      events.push('invalidate');
    });

    await expect(persistAndInvalidateProductList(persist, invalidate)).resolves.toBe('saved');
    expect(events).toEqual(['persist', 'invalidate']);
    expect(invalidate).toHaveBeenCalledOnce();
  });

  it('invalidates to reconcile possible partial writes when persistence fails', async () => {
    const persist = vi.fn().mockRejectedValue(new Error('falha ao salvar'));
    const invalidate = vi.fn(async () => undefined);

    await expect(persistAndInvalidateProductList(persist, invalidate)).rejects.toThrow(
      'falha ao salvar'
    );
    expect(invalidate).toHaveBeenCalledOnce();
  });

  it('preserves the persistence error when reconciliation also fails', async () => {
    const persistError = new Error('falha ao salvar');
    const onInvalidateError = vi.fn();
    const invalidate = vi.fn().mockRejectedValue(new Error('falha ao atualizar o cache'));

    await expect(
      persistAndInvalidateProductList(
        vi.fn().mockRejectedValue(persistError),
        invalidate,
        onInvalidateError
      )
    ).rejects.toBe(persistError);

    expect(invalidate).toHaveBeenCalledOnce();
    expect(onInvalidateError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('preserves the committed result when cache invalidation fails', async () => {
    const onInvalidateError = vi.fn();
    const invalidate = vi.fn().mockRejectedValue(new Error('falha ao atualizar o cache'));

    await expect(
      persistAndInvalidateProductList(vi.fn().mockResolvedValue('saved'), invalidate, onInvalidateError)
    ).resolves.toBe('saved');
    expect(onInvalidateError).toHaveBeenCalledWith(expect.any(Error));
  });
});
