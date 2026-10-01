import { describe, expect, it } from 'vitest';
import { normalizeProductForSave } from './productKindRules';
import { mapFromDB, mapToDB } from './productService/productMapper';
import type Product from '@/pages/types/product.type';
import { getInitialProductFormData } from '../App/Products/utils/form/productFormInitialData';

const composition: Partial<Product> = {
  ...getInitialProductFormData(),
  itemType: 'composition' as const,
  active: true,
  status: 'published' as const,
  variations: [
    {
      id: 'v1',
      sku: 'COMP-01',
      name: 'Componente',
      stock: 2,
      unitPrice: 10,
      active: true,
      attributes: [],
    },
  ],
};

const save = (data: Partial<Product>) =>
  normalizeProductForSave(data, {
    isDraft: false,
    isCompletingDraft: true,
    catalogStatus: 'published',
    name: 'Composição teste',
  });

describe('tipo único Normal/Salvado para produtos e composições', () => {
  it('cria composição Normal com o padrão e segue ativação ERP normal', () => {
    const initial = getInitialProductFormData();
    const result = save({ ...composition, ...initial, itemType: 'composition', active: true });

    expect(initial.productKind).toBe('normal');
    expect(result.productKind).toBe('normal');
    expect(result.active).toBe(true);
  });

  it('cria composição Salvado inativa no ERP sem ocultar do catálogo', () => {
    const result = save({ ...composition, productKind: 'salvado' });

    expect(result.active).toBe(false);
    expect(result.variations?.[0].active).toBe(false);
    expect(result.status).toBe('published');
  });

  it('ao editar de Normal para Salvado, desativa pai e variações', () => {
    const existing = { ...composition, productKind: 'normal' as const };
    const result = save({ ...existing, productKind: 'salvado' });

    expect(result.productKind).toBe('salvado');
    expect(result.active).toBe(false);
    expect(result.variations?.every((variation) => !variation.active)).toBe(true);
  });

  it('interpreta composição antiga sem product_kind como Normal', () => {
    const result = mapFromDB({
      id: 'composition-old',
      item_type: 'composition',
      active: true,
      product_variations: [],
    });

    expect(result.productKind).toBe('normal');
    expect(result.active).toBe(true);
  });

  it('mapeia e persiste product_kind sem alterar a condição legada', () => {
    const fromDb = mapFromDB({
      id: 'composition-salvado',
      item_type: 'composition',
      product_kind: 'salvado',
      condition: 'usado',
      active: true,
      product_variations: [],
    });

    expect(fromDb.productKind).toBe('salvado');
    expect(fromDb.condition).toBe('usado');
    expect(fromDb.active).toBe(false);
    expect(mapToDB({ ...fromDb, active: true })).toMatchObject({
      product_kind: 'salvado',
      active: false,
      condition: 'usado',
    });
  });

  it('produto simples Salvado: desativado no ERP mas totalmente publicável no catálogo com atributos completos', () => {
    const simpleSalvado: Partial<Product> = {
      ...getInitialProductFormData(),
      name: 'Mesa de Madeira Maciça Salvada',
      productKind: 'salvado',
      unitPrice: 1500,
      images: ['https://storage.example.com/foto1.jpg'],
      description: 'Mesa de mostruário com pequenos detalhes estéticos',
      technicalValues: { Material: 'Madeira Maciça', Cor: 'Imbuia' },
      width: 90,
      height: 75,
      depth: 180,
      status: 'published',
      active: true, // tenta ativar no payload
    };

    const result = normalizeProductForSave(simpleSalvado, {
      isDraft: false,
      isCompletingDraft: false,
      catalogStatus: 'published',
      name: 'Mesa de Madeira Maciça Salvada',
    });

    // Status ERP desativado automaticamente
    expect(result.active).toBe(false);
    expect(result.productKind).toBe('salvado');

    // Catálogo Digital independente e publicado
    expect(result.status).toBe('published');

    // Atributos do catálogo preservados integralmente
    expect(result.name).toBe('Mesa de Madeira Maciça Salvada');
    expect(result.unitPrice).toBe(1500);
    expect(result.images).toHaveLength(1);
    expect(result.description).toBe('Mesa de mostruário com pequenos detalhes estéticos');
    expect(result.technicalValues).toEqual({ Material: 'Madeira Maciça', Cor: 'Imbuia' });
    expect(result.width).toBe(90);

    // Mapeamento para DB garante active = false e product_kind = 'salvado'
    const dbData = mapToDB(result);
    expect(dbData.active).toBe(false);
    expect(dbData.product_kind).toBe('salvado');
    expect(dbData.status).toBe('published');
  });

  it('produto simples Salvado: pode ser ocultado do catálogo digital independentemente', () => {
    const simpleSalvado: Partial<Product> = {
      ...getInitialProductFormData(),
      name: 'Cadeira Salvada Oculta',
      productKind: 'salvado',
      status: 'hidden',
      active: false,
    };

    const result = normalizeProductForSave(simpleSalvado, {
      isDraft: false,
      isCompletingDraft: false,
      catalogStatus: 'hidden',
      name: 'Cadeira Salvada Oculta',
    });

    expect(result.active).toBe(false);
    expect(result.status).toBe('hidden');

    const dbData = mapToDB(result);
    expect(dbData.active).toBe(false);
    expect(dbData.status).toBe('hidden');
  });

  it('produto simples ou composição Usados: preserva productKind usado e segue ativação normal', () => {
    const usadoProduct: Partial<Product> = {
      ...getInitialProductFormData(),
      name: 'Sofá Usado',
      productKind: 'usado',
      active: true,
      status: 'published',
    };

    const result = normalizeProductForSave(usadoProduct, {
      isDraft: false,
      isCompletingDraft: false,
      catalogStatus: 'published',
      name: 'Sofá Usado',
    });

    expect(result.productKind).toBe('usado');
    expect(result.active).toBe(true);

    const dbData = mapToDB(result);
    expect(dbData.product_kind).toBe('usado');
    expect(dbData.active).toBe(true);
  });
});
