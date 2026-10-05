import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type Product from '../../types/product.type';

vi.mock('@/pages/utils/supabaseConfig', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const { readFileSync } = await import('node:fs');
  const { parse } = await import('dotenv');
  const env = parse(readFileSync(new URL('../../../../../.env.local', import.meta.url)));
  const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  if (new URL(url).hostname !== 'hkoxhourxwlddgsfdgws.supabase.co') throw new Error('Projeto de integração incorreto.');
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error('Credencial de integração não disponível.');
  return { supabase: createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) };
});

import { supabase } from '@/pages/utils/supabaseConfig';
import { persistProductDraft } from './productDraftPersistence';
import { mapFromDB } from './productMapper';

const testRunId = `TEST_AUT_${randomUUID()}`;
const ownedIds = new Set<string>();
let fixtureId: string | null = null;

function assertOwned(product: Product) {
  if (!product.id || !ownedIds.has(product.id) || product.code !== testRunId) {
    throw new Error('Operação fora da fixture da execução.');
  }
}

afterEach(async () => {
  if (!fixtureId) return;
  const { data: owned, error: readError } = await supabase.from('products')
    .select('id, code').eq('id', fixtureId).maybeSingle();
  if (readError) throw readError;
  if (owned) {
    assertOwned({ id: owned.id, code: owned.code } as Product);
    const { error } = await supabase.from('products').update({ deleted: true, active: false })
      .eq('id', fixtureId).eq('code', testRunId).eq('is_draft', true);
    if (error) throw error;
  }
  const { data: archived, error } = await supabase.from('products')
    .select('id, deleted, active').eq('id', fixtureId).maybeSingle();
  if (error) throw error;
  if (owned) expect(archived).toMatchObject({ deleted: true, active: false });
  console.info(JSON.stringify({ testRunId, projectRef: 'hkoxhourxwlddgsfdgws', productId: fixtureId,
    created: owned ? 1 : 0, removed: 0, retained: archived ? 1 : 0, archived: Boolean(archived?.deleted) }));
});

describe('rascunho completo no PostgreSQL remoto', () => {
  it('reabre campos, repete sem duplicar, rejeita conflito e falha sem salvar parcialmente', async () => {
    fixtureId = randomUUID();
    ownedIds.add(fixtureId);
    console.info(JSON.stringify({ testRunId, projectRef: 'hkoxhourxwlddgsfdgws', productId: fixtureId, phase: 'fixture-create' }));
    const product: Product = {
      id: fixtureId, code: testRunId, name: testRunId, description: '',
      unitPrice: 0, active: false, isDraft: true, status: 'draft', itemType: 'product', unit: 'UN',
      categoryIds: [], images: [], variations: [{
        id: randomUUID(), sku: `${testRunId}-01`, name: `${testRunId} Azul`,
        unitPrice: 120, promoPrice: 0, costPrice: 70, stock: 0, active: false, status: 'draft',
        barcode: '7890000000000', title: 'Título manual', description: 'Descrição manual',
        attributes: [{ name: 'Cor', value: 'Azul', showName: false }],
        images: ['https://example.test/fixture.jpg'], technicalValues: { Altura: '', Montagem: false },
        width: 70, height: 0, depth: 40, weight: 18, pkgWidth: 75, minStock: 2,
        syncUnitPrice: false, syncCostPrice: false, syncHeight: true, syncWidth: false,
        syncDepth: false, syncDescription: false, syncFiscal: false, fiscal: { ncm: '94035000' },
      }],
    };
    assertOwned(product);
    await persistProductDraft(product);
    const read = async () => {
      const { data, error } = await supabase.from('products').select('*').eq('id', fixtureId!).single();
      if (error) throw error;
      assertOwned({ id: data.id, code: data.code } as Product);
      return data;
    };
    const first = await read();
    expect(mapFromDB(first).variations).toEqual(first.technical_specs.draftProduct.variations);
    expect(mapFromDB(first).variations?.[0]).toMatchObject(product.variations![0]);

    const oldVersion = product.updatedAt;
    product.variations![0].technicalValues = { Altura: '180', Montagem: true };
    product.variations![0].images = [];
    await persistProductDraft(product);
    const second = await read();
    expect(mapFromDB(second).variations?.[0]).toMatchObject({ technicalValues: { Altura: '180', Montagem: true }, images: [] });
    await expect(persistProductDraft({ ...product, updatedAt: oldVersion })).rejects.toThrow('alterado em outro lugar');

    const concurrent = await Promise.allSettled([
      persistProductDraft({ ...product, description: 'Edição A' }),
      persistProductDraft({ ...product, description: 'Edição B' }),
    ]);
    expect(concurrent.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(concurrent.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const confirmed = await read();
    const invalid = { ...mapFromDB(confirmed), categoryIds: [randomUUID()], description: 'Não deve persistir' };
    await expect(persistProductDraft(invalid)).rejects.toBeTruthy();
    const afterFailure = await read();
    expect(afterFailure.technical_specs).toEqual(confirmed.technical_specs);
    expect(afterFailure.updated_at).toBe(confirmed.updated_at);

    const duplicate = mapFromDB(afterFailure);
    assertOwned(duplicate);
    await persistProductDraft(duplicate);
    duplicate.variations![0].status = 'hidden';
    await persistProductDraft(duplicate);
    const completedChild = mapFromDB(await read());
    expect(completedChild.status).toBe('draft');
    expect(completedChild.variations?.[0].status).toBe('hidden');
    duplicate.variations![0].status = 'draft';
    duplicate.variations![0].barcode = '';
    await persistProductDraft(duplicate);
    expect(mapFromDB(await read()).variations?.[0]).toMatchObject({ status: 'draft', barcode: '' });
    const { count } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('id', fixtureId);
    expect(count).toBe(1);
    for (const table of ['product_variations', 'inventory_moves', 'product_images', 'product_categories']) {
      const { count: effects, error } = await supabase.from(table)
        .select('id', { count: 'exact', head: true }).eq('product_id', fixtureId);
      if (error) throw error;
      expect(effects, table).toBe(0);
    }
  });
});
