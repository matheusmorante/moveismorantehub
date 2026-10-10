import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  events: [] as string[],
  queryError: null as Error | null,
  invalidateQueries: vi.fn(() => {
    mocks.events.push('invalidate');
    return Promise.resolve();
  }),
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/lib/queryClient', () => ({
  queryClient: { invalidateQueries: mocks.invalidateQueries },
}));

import { moveToTrash, permanentDeletePerson, restorePerson } from './personMutationService';

const createQuery = (table: string) => {
  const chain: any = {
    delete: vi.fn(() => {
      mocks.events.push(`${table}:delete`);
      return chain;
    }),
    update: vi.fn(() => {
      mocks.events.push(`${table}:update`);
      return chain;
    }),
    eq: vi.fn(() => chain),
    select: vi.fn(() => chain),
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve({
        data: mocks.queryError ? null : [{ id: 'person-1' }],
        error: mocks.queryError,
      }).then(resolve),
  };
  return chain;
};

describe('person mutation query invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.events.length = 0;
    mocks.queryError = null;
    mocks.from.mockImplementation((table: string) => createQuery(table));
  });

  it('invalidates after the profile write when moving a UUID employee to trash', async () => {
    await moveToTrash('employees', '550e8400-e29b-41d4-a716-446655440000');

    expect(mocks.events).toEqual(['profiles:update', 'invalidate']);
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['people', 'employees'] });
  });

  it('invalidates after the row is permanently deleted', async () => {
    await permanentDeletePerson('customers', 'legacy-customer-1');

    expect(mocks.events).toEqual(['people:delete', 'invalidate']);
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['people', 'customers'] });
  });

  it('invalidates after the row is restored', async () => {
    await restorePerson('customers', 'legacy-customer-1');

    expect(mocks.events).toEqual(['people:update', 'invalidate']);
  });

  it('does not invalidate after a failed profile write', async () => {
    mocks.queryError = new Error('falha ao atualizar perfil');

    await expect(
      moveToTrash('employees', '550e8400-e29b-41d4-a716-446655440000')
    ).rejects.toThrow('falha ao atualizar perfil');

    expect(mocks.events).toEqual(['profiles:update']);
    expect(mocks.invalidateQueries).not.toHaveBeenCalled();
  });

  it('can defer invalidation so the list can batch several successful writes', async () => {
    await permanentDeletePerson('customers', 'legacy-customer-1', {
      deferQueryInvalidation: true,
    });

    expect(mocks.events).toEqual(['people:delete']);
    expect(mocks.invalidateQueries).not.toHaveBeenCalled();
  });
});
