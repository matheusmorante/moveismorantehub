import { describe, expect, it } from 'vitest';
import {
  categoryAttributeSelectionSchema,
  getDefaultCategoryAttributeIsRequired,
  isCategoryAttributeSelectable,
  isCategoryAttributeAlwaysRequired,
  isCategoryAttributeAlwaysOptional,
  isCategoryAttributeRequirementLocked,
  resolveCategoryAttributeIsRequired,
  setCategoryAttributeRequirement,
} from '../../../../../../shared-utils/categoryAttributeSelection';

describe('contrato de atributos de categoria ERP/mobile', () => {
  it.each(['Cor', 'Linha', 'Modelo e Linha', 'Comprimento total', 'Altura']) (
    'mantém %s obrigatório em todas as categorias',
    (name) => {
      expect(isCategoryAttributeAlwaysRequired(name)).toBe(true);
      expect(getDefaultCategoryAttributeIsRequired(name)).toBe(true);
      expect(isCategoryAttributeRequirementLocked(name)).toBe(true);
    },
  );

  it('mantém Peso sempre opcional, mesmo com um valor legado isRequired=true', () => {
    expect(isCategoryAttributeAlwaysOptional(' peso ')).toBe(true);
    expect(getDefaultCategoryAttributeIsRequired('Peso')).toBe(false);
    expect(resolveCategoryAttributeIsRequired({ name: 'Peso', isRequired: true })).toBe(false);
    expect(isCategoryAttributeRequirementLocked('Peso')).toBe(true);
  });

  it('preserva o estado obrigatório/opcional configurado para atributos comuns', () => {
    expect(resolveCategoryAttributeIsRequired({ name: 'Material', isRequired: false })).toBe(false);
    expect(resolveCategoryAttributeIsRequired({ name: 'Material', isRequired: true })).toBe(true);
    expect(isCategoryAttributeRequirementLocked('Material')).toBe(false);
  });

  it('altera somente atributos comuns e não viola as regras fixas', () => {
    const attributes = [
      { id: 'material', name: 'Material', isRequired: false },
      { id: 'cor', name: 'Cor', isRequired: true },
      { id: 'peso', name: 'Peso', isRequired: false },
    ];

    expect(setCategoryAttributeRequirement(attributes, 'material', true)).toEqual([
      { id: 'material', name: 'Material', isRequired: true },
      attributes[1],
      attributes[2],
    ]);
    expect(setCategoryAttributeRequirement(attributes, 'cor', false)[1].isRequired).toBe(true);
    expect(setCategoryAttributeRequirement(attributes, 'peso', true)[2].isRequired).toBe(false);
  });

  it('exige ID, nome e isRequired no payload de edição', () => {
    expect(categoryAttributeSelectionSchema.safeParse({ id: 'a1', name: 'Material', isRequired: false }).success).toBe(true);
    expect(categoryAttributeSelectionSchema.safeParse({ id: 'a1', name: 'Material' }).success).toBe(false);
    expect(categoryAttributeSelectionSchema.safeParse({ id: '', name: 'Material', isRequired: false }).success).toBe(false);
    expect(categoryAttributeSelectionSchema.safeParse({ id: 'a1', name: '   ', isRequired: false }).success).toBe(false);
  });

  it.each(['Reclinável', 'Reclinavel', 'Linha', 'Modelo']) (
    'não oferece %s para novo vínculo de categoria',
    (name) => expect(isCategoryAttributeSelectable(name)).toBe(false),
  );

  it('mantém atributos próprios de produto disponíveis para vínculo', () => {
    expect(isCategoryAttributeSelectable('Modelo/Linha')).toBe(true);
    expect(isCategoryAttributeSelectable('Material')).toBe(true);
  });
});
