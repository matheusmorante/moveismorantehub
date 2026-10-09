import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bindTestArtifactContext, clearTestArtifactContext } from '../../../../../shared-utils/testArtifactContext';
import { savePerson, updatePerson } from './personMutationService';

const db = vi.hoisted(() => ({
  from: vi.fn(),
  inserts: [] as any[],
  updates: [] as any[],
  currentPerson: null as any,
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: db }));

const runId = '550e8400-e29b-41d4-a716-446655440000';
const ownerId = '550e8400-e29b-41d4-a716-446655440001';

describe('personMutationService test artifact context', () => {
  beforeEach(() => {
    clearTestArtifactContext();
    db.inserts.length = 0;
    db.updates.length = 0;
    db.currentPerson = null;
    db.from.mockImplementation(() => {
      const chain: any = {
        insert: vi.fn((rows: any[]) => { db.inserts.push(...rows); return chain; }),
        update: vi.fn((row: any) => { db.updates.push(row); return chain; }),
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        maybeSingle: vi.fn(async () => ({ data: db.currentPerson, error: null })),
        then: (resolve: (value: any) => unknown) => Promise.resolve({
          data: db.inserts.length ? [{ ...db.inserts[0], id: ownerId }] : [],
          error: null,
        }).then(resolve),
      };
      return chain;
    });
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });
  });

  it('grava a identidade no JSON address ao criar uma pessoa', async () => {
    bindTestArtifactContext({ runId, ownerId });

    await savePerson('customers', {
      fullName: 'Cliente da execução',
      address: { street: 'Rua de teste', city: 'Curitiba', state: 'PR' },
    } as any);

    expect(db.inserts[0].address).toMatchObject({
      street: 'Rua de teste',
      testArtifact: { is_test: true, runId, ownerId },
    });
  });

  it('recusa editar cadastro operacional ou de outra execução no contexto de teste', async () => {
    bindTestArtifactContext({ runId, ownerId });
    db.currentPerson = { id: 'person-id', address: { street: 'Cliente real' } };

    await expect(updatePerson('customers', 'person-id', { fullName: 'Alteração' }))
      .rejects.toThrow('mesma execução e operador');
    expect(db.updates).toEqual([]);
  });
});
