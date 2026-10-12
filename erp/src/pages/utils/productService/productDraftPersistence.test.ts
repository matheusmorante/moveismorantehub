import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Product from '../../types/product.type';
import { persistProductDraft } from './productDraftPersistence';

const db = vi.hoisted(() => ({
  from: vi.fn(), existing: null as any,
  written: { data: { id: '9b2ec3b1-8629-4514-b38b-3894fb33719f', updated_at: '2026-10-05T20:00:00Z' }, error: null } as any,
  payload: null as any, filters: [] as any[],
}));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: db }));
vi.mock('../uniqueSlug', () => ({ resolveUniqueSlug: vi.fn(async () => 'test-aut-draft'), normalizeSlug: (value: string) => value }));

const product = (): Product => ({
  id: '9b2ec3b1-8629-4514-b38b-3894fb33719f', name: 'TEST_AUT_DRAFT', code: 'TEST_AUT_DRAFT',
  description: '', unitPrice: 0, stock: 999, itemType: 'product', unit: 'UN', active: false,
  isDraft: true, status: 'draft', categoryIds: [],
  variations: [{ id: '8a3f4c19-588b-48e4-a0d3-d3d5139cfe20', sku: '', name: '', stock: 999,
    unitPrice: 0, active: false, attributes: [{ name: 'Cor', value: '', showName: false }],
    technicalValues: { Largura: '' }, images: [] }],
});

beforeEach(() => {
  db.existing = null;
  db.payload = null;
  db.filters = [];
  db.written = { data: { id: product().id, updated_at: '2026-10-05T20:00:00Z' }, error: null };
  db.from.mockImplementation(() => {
    let writing = false;
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn((...args) => { db.filters.push(args); return chain; }),
      is: vi.fn((...args) => { db.filters.push(args); return chain; }),
      or: vi.fn(() => chain),
      insert: vi.fn((payload) => { db.payload = payload; writing = true; return chain; }),
      update: vi.fn((payload) => { db.payload = payload; writing = true; return chain; }),
      maybeSingle: vi.fn(async () => writing ? db.written : { data: db.existing, error: null }),
      single: vi.fn(async () => db.written),
    };
    return chain;
  });
});

describe('gravação do agregado de rascunho', () => {
  it('persiste a identidade canônica do artefato de teste fora do snapshot do formulário', async () => {
    const testArtifact = {
      is_test: true,
      runId: '196068ee-6be6-4354-8cf1-295d01ddcad6',
      ownerId: 'eccde09e-72d8-4efe-a387-eb34114dea39',
      scenarioKey: 'nfce65_pickup',
    };

    await persistProductDraft({ ...product(), technicalSpecs: { testArtifact } });

    expect(db.payload.technical_specs.testArtifact).toEqual(testArtifact);
    expect(db.payload.technical_specs.draftProduct).not.toHaveProperty('technicalSpecs');
  });

  it('grava pai e variações incompletas juntos, sem atualizar saldos ou tabelas filhas', async () => {
    const draft = product();
    await persistProductDraft(draft);
    expect(db.from.mock.calls.every(([table]) => table === 'products')).toBe(true);
    expect(db.payload.technical_specs.draftProduct.variations[0]).toMatchObject({
      sku: '', attributes: [{ name: 'Cor', value: '', showName: false }], technicalValues: { Largura: '' }, images: [],
    });
    expect(db.payload).not.toHaveProperty('stock');
    expect(db.payload).not.toHaveProperty('initial_stock');
    expect(draft.updatedAt).toBe(db.written.data.updated_at);
  });

  it('protege edições concorrentes pela versão lida pelo formulário e preserva metadados', async () => {
    db.existing = { id: product().id, is_draft: true, status: 'draft', updated_at: 'newer', technical_specs: { custom: 'preserved' } };
    const draft = { ...product(), updatedAt: 'original' };
    await persistProductDraft(draft);
    expect(db.filters).toContainEqual(['updated_at', 'original']);
    expect(db.payload.technical_specs.custom).toBe('preserved');
  });

  it('rejeita conflito sem marcar a versão local como salva', async () => {
    db.existing = { id: product().id, is_draft: true, updated_at: 'newer' };
    db.written = { data: null, error: null };
    const draft = { ...product(), updatedAt: 'original' };
    await expect(persistProductDraft(draft)).rejects.toThrow('alterado em outro lugar');
    expect(draft.updatedAt).toBe('original');
  });

  it('remove o marcador ao salvar OFF e mantém os outros metadados do rascunho', async () => {
    const testArtifact = { is_test: true, runId: 'fd41a462-a72a-4e69-b0cd-b673b8ccb570', ownerId: '0bad55d5-2099-41fa-8c74-1a9fbab0e183' };
    db.existing = { id: product().id, is_draft: true, status: 'draft', technical_specs: { testArtifact, custom: 'preservado' } };
    await persistProductDraft({ ...product(), technicalSpecs: {} });
    expect(db.payload.technical_specs).not.toHaveProperty('testArtifact');
    expect(db.payload.technical_specs.custom).toBe('preservado');
  });

  it('não troca runId ou ownerId de um rascunho já identificado', async () => {
    const testArtifact = { is_test: true, runId: 'fd41a462-a72a-4e69-b0cd-b673b8ccb570', ownerId: '0bad55d5-2099-41fa-8c74-1a9fbab0e183' };
    db.existing = { id: product().id, is_draft: true, technical_specs: { testArtifact } };
    await expect(persistProductDraft({ ...product(), technicalSpecs: { testArtifact: { ...testArtifact, runId: testArtifact.ownerId } } })).rejects.toThrow('outra execução');
    expect(db.payload).toBeNull();
  });

  it('propaga falha de gravação e bloqueia autosave em produto já concluído', async () => {
    db.written = { data: null, error: new Error('gravação recusada') };
    await expect(persistProductDraft(product())).rejects.toThrow('gravação recusada');
    db.existing = { id: product().id, is_draft: false, status: 'hidden' };
    db.payload = null;
    await expect(persistProductDraft(product())).rejects.toThrow('já foi concluído');
    expect(db.payload).toBeNull();
  });
});
