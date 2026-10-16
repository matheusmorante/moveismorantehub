import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bindTestArtifactContext, clearTestArtifactContext } from '../../../../../shared-utils/testArtifactContext';
import { savePeopleBatch, savePerson, updatePerson } from './personMutationService';

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

  it('grava a identidade no JSON de endereço canônico ao criar uma pessoa', async () => {
    bindTestArtifactContext({ runId, ownerId });

    await savePerson('customers', {
      fullName: 'Cliente da execução',
      address: { street: 'Rua de teste', city: 'Curitiba', state: 'PR' },
    } as any, { isTestArtifact: true });

    expect(db.inserts[0].address).toMatchObject({
      street: 'Rua de teste',
      testArtifact: { is_test: true, runId, ownerId },
    });
    expect(db.inserts[0].full_address).toMatchObject({
      street: 'Rua de teste',
      testArtifact: { is_test: true, runId, ownerId },
    });
  });

  it('não marca cadastros como teste quando o contexto existe e o formulário está em OFF', async () => {
    bindTestArtifactContext({ runId, ownerId });

    await savePerson('customers', {
      fullName: 'Cliente operacional',
      address: { street: 'Rua real', city: 'Curitiba', state: 'PR' },
    } as any);

    expect(db.inserts[0].address).not.toHaveProperty('testArtifact');
    expect(db.inserts[0]).not.toHaveProperty('full_address');
  });

  it('permite inserir cliente com CPF válido', async () => {
    await savePerson('customers', {
      fullName: 'Cliente com CPF válido',
      personType: 'PF',
      cpfCnpj: '529.982.247-25',
    } as any);

    expect(db.inserts).toHaveLength(1);
    expect(db.inserts[0].cpf_cnpj).toBe('529.982.247-25');
  });

  it('permite lote com documentos válidos e bloqueia formato incorreto', async () => {
    await savePeopleBatch('customers', [{
      fullName: 'Cliente com CPF válido',
      personType: 'PF',
      cpfCnpj: '529.982.247-25',
    }]);

    expect(db.inserts).toHaveLength(1);
    db.inserts.length = 0;

    await expect(savePeopleBatch('customers', [{
      fullName: 'Cliente com CPF em formato incorreto',
      personType: 'PF',
      cpfCnpj: '123.456.789-0A',
    }])).rejects.toThrow('CPF inválido: contém letras ou caracteres alfanuméricos');
    expect(db.inserts).toEqual([]);
  });

  it('preserva a identidade canônica ao editar um cadastro da própria execução', async () => {
    bindTestArtifactContext({ runId, ownerId });
    db.currentPerson = {
      id: 'person-id',
      address: JSON.stringify({
        street: 'Rua de teste',
        testArtifact: { is_test: true, runId, ownerId },
      }),
    };

    await updatePerson('customers', 'person-id', { fullName: 'Cliente fiscal atualizado' });

    expect(db.updates[0].full_address).toMatchObject({
      street: 'Rua de teste',
      testArtifact: { is_test: true, runId, ownerId },
    });
  });

  it('permite editar cadastro operacional mesmo quando o contexto de teste está ativo', async () => {
    bindTestArtifactContext({ runId, ownerId });
    db.currentPerson = { id: 'person-id', address: { street: 'Cliente real' } };

    await updatePerson('customers', 'person-id', {
      fullName: 'Matheus Morante dos Santos',
      phone: '(44) 99999-9999',
    });

    expect(db.updates).toHaveLength(1);
    expect(db.updates[0].full_name).toBe('Matheus Morante dos Santos');
    expect(db.updates[0].phone).toBe('(44) 99999-9999');
    expect(db.updates[0].address).toBeUndefined();
  });

  it('recusa editar cadastro de teste de outra execução no contexto de teste', async () => {
    bindTestArtifactContext({ runId, ownerId });
    db.currentPerson = {
      id: 'person-id',
      address: JSON.stringify({
        street: 'Rua de outro teste',
        testArtifact: { is_test: true, runId: 'other-run-id', ownerId },
      }),
    };

    await expect(updatePerson('customers', 'person-id', { fullName: 'Alteração' }))
      .rejects.toThrow('mesma execução e operador');
    expect(db.updates).toEqual([]);
  });
});
