import { describe, expect, it } from 'vitest';
import type Product from '../../types/product.type';
import { createProductDraftSnapshot, restoreProductDraft } from './productDraftSnapshot';
import { mapFromDB, mapToDB } from './productMapper';

const product: Product = {
  id: '9b2ec3b1-8629-4514-b38b-3894fb33719f', code: 'TEST_AUT_DRAFT', name: 'Armário',
  description: 'Descrição', unitPrice: 500, unit: 'UN', itemType: 'product', active: false,
  isDraft: true, status: 'draft', variations: [{
    id: '8a3f4c19-588b-48e4-a0d3-d3d5139cfe20', name: 'Armário Azul', title: 'Título próprio',
    sku: 'TEST_AUT_DRAFT-01', stock: 0, unitPrice: 450, promoPrice: 0, costPrice: 240,
    active: false, attributes: [{ name: 'Cor', value: 'Azul', showName: false }],
    description: 'Descrição manual', technicalValues: { Altura: '180', Montagem: false },
    images: ['https://example.test/foto.jpg'], width: 80, height: 180, depth: 50, weight: 25,
    pkgWidth: 85, syncWidth: false, syncHeight: true, syncDepth: false, syncWeight: false,
    syncDescription: false, syncUnitPrice: false, syncPromoPrice: false, syncCostPrice: false,
    syncFiscal: false, fiscal: { ncm: '94035000' }, minStock: 2, freightCost: 10, ipiPercent: 3,
  }],
};

describe('persistência completa do rascunho', () => {
  it('mantém o status individual de uma variação concluída dentro do pai ainda rascunho', () => {
    const snapshot = createProductDraftSnapshot({ ...product,
      variations: [{ ...product.variations![0], status: 'hidden' }] });
    const reopened = restoreProductDraft({ ...product, technicalSpecs: { draftProduct: snapshot } });
    expect(reopened.status).toBe('draft');
    expect(reopened.variations?.[0]).toMatchObject({ status: 'hidden', active: false });
  });
  it('preserva o status do catálogo ao restaurar o snapshot de um cadastro em rascunho', () => {
    const snapshot = createProductDraftSnapshot(product);
    const reopened = restoreProductDraft({
      ...product,
      status: 'published',
      technicalSpecs: { draftProduct: snapshot },
    });
    expect(reopened).toMatchObject({ status: 'published', isDraft: true, active: false });
  });
  it('reabre todos os campos de variações novas mesmo sem registros normalizados', () => {
    const snapshot = createProductDraftSnapshot(product);
    const record = {
      ...mapToDB(product), id: product.id, product_variations: [], stock: 0,
      technical_specs: { draftProduct: snapshot }, updated_at: '2026-10-05T20:00:00Z',
    };
    const reopened = mapFromDB(JSON.parse(JSON.stringify(record)));
    expect(reopened.variations).toEqual(snapshot.variations);
    expect(reopened.updatedAt).toBe(record.updated_at);
    expect(reopened.active).toBe(false);
  });

  it('remove campos antigos de estoque inicial e não aninha snapshots anteriores', () => {
    const snapshot = createProductDraftSnapshot({
      ...product, launchInitialStock: true, initialStockEntries: [{ quantity: 5, unitCost: 10 }],
      technicalSpecs: { draftProduct: product },
      variations: [{ ...product.variations![0], launchInitialStock: true, initialStock: 5, initialCost: 10 } as any],
    });
    expect(snapshot).not.toHaveProperty('technicalSpecs');
    expect(snapshot).not.toHaveProperty('launchInitialStock');
    expect(snapshot).not.toHaveProperty('initialStockEntries');
    expect(snapshot.variations?.[0]).not.toHaveProperty('initialStock');
    expect(snapshot.variations?.[0]).not.toHaveProperty('launchInitialStock');
  });

  it('saldo confirmado prevalece sobre a cópia do rascunho', () => {
    const result = restoreProductDraft({
      ...product, stock: 7, variations: [{ ...product.variations![0], stock: 7 }],
      technicalSpecs: { draftProduct: { ...product, stock: 99, variations: [{ ...product.variations![0], stock: 99 }] } },
    });
    expect(result.stock).toBe(7);
    expect(result.variations?.[0].stock).toBe(7);
  });

  it('restaura variações do snapshot ausentes da relação normalizada e preserva estoque confirmado', () => {
    const firstVariation = product.variations![0];
    const secondVariation = {
      ...firstVariation,
      id: 'ab5ff0b1-b443-4dd9-9af2-15e6058117a2',
      name: 'Armário Verde',
      sku: 'TEST_AUT_DRAFT-02',
      stock: 0,
    };
    const snapshot = createProductDraftSnapshot({
      ...product,
      variations: [firstVariation, secondVariation],
    });
    const mapped = mapFromDB({
      id: product.id,
      code: product.code,
      name: product.name,
      item_type: 'product',
      is_draft: true,
      status: 'draft',
      stock: 6,
      technical_specs: { draftProduct: snapshot },
      product_variations: [
        {
          id: firstVariation.id,
          product_id: product.id,
          sku: firstVariation.sku,
          name: firstVariation.name,
          stock: 6,
          active: false,
          price: firstVariation.unitPrice,
          use_parent_price: false,
        },
      ],
    });

    expect(mapped.variations).toHaveLength(2);
    expect(mapped.variations?.[0]).toMatchObject({ id: firstVariation.id, stock: 6 });
    expect(mapped.variations?.[1]).toMatchObject({ id: secondVariation.id, stock: 0 });
  });

  it('preserva detalhes sem coluna própria ao concluir e ignora o snapshot de rascunho', () => {
    const variation = product.variations![0];
    const payload = mapToDB({ ...product, isDraft: false, status: 'hidden' });
    expect(payload.technical_specs.draftProduct).toBeNull();
    const reopened = mapFromDB({
      ...payload, id: product.id, stock: 4,
      product_variations: [{ id: variation.id, product_id: product.id, sku: variation.sku,
        name: variation.name, price: 450, cost_price: 240, stock: 4, active: false,
        attributes: variation.attributes, image_url: variation.images!.join(','),
        use_parent_price: false, use_parent_promo_price: false, use_parent_description: false,
        description: variation.description, width: '80', height: '180', depth: '50' }],
    });
    expect(reopened.variations?.[0]).toMatchObject({
      title: variation.title, technicalValues: variation.technicalValues, fiscal: variation.fiscal,
      syncHeight: true, syncWidth: false, syncDepth: false, weight: 25, minStock: 2,
      costPrice: 240, stock: 4,
    });
  });
});
