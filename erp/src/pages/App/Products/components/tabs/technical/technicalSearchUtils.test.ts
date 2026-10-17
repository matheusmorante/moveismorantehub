import { describe, it, expect } from 'vitest';
import {
  getDisplayedOptionalFields,
  getMatchingOptionalFields,
  getMatchingTopicGroups,
} from './technicalSearchUtils';
import type { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';

describe('technicalSearchUtils', () => {
  const mockAllFields: TechnicalFieldDefinition[] = [
    { id: '1', name: 'Altura', isRequired: true },
    { id: '2', name: 'Largura', isRequired: true },
    { id: '3', name: 'Material da estrutura', isRequired: false },
    { id: '4', name: 'Acabamento', isRequired: false },
    { id: '5', name: 'Quantidade de portas', isRequired: false },
    { id: '6', name: 'Tipo de portas', isRequired: false },
  ];

  describe('getDisplayedOptionalFields', () => {
    it('retorna array vazio quando requiredFieldsOnly estiver ativo', () => {
      const result = getDisplayedOptionalFields({
        requiredFieldsOnly: true,
        optionalFields: [mockAllFields[2]],
        allTechnicalFields: mockAllFields,
        filledOrManualOptionalFields: [],
        normalizedSearchTerm: '',
      });
      expect(result).toEqual([]);
    });

    it('retorna todas as características opcionais da categoria quando não há busca', () => {
      const optional = [mockAllFields[2], mockAllFields[3]];
      const result = getDisplayedOptionalFields({
        requiredFieldsOnly: false,
        optionalFields: optional,
        allTechnicalFields: mockAllFields,
        filledOrManualOptionalFields: [],
        normalizedSearchTerm: '',
      });
      expect(result).toEqual(optional);
    });

    it('mantém campos preenchidos visíveis mesmo quando não correspondem ao termo de busca', () => {
      const filled = [mockAllFields[2]]; // Material da estrutura
      const optional = [mockAllFields[2], mockAllFields[3]];
      const result = getDisplayedOptionalFields({
        requiredFieldsOnly: false,
        optionalFields: optional,
        allTechnicalFields: mockAllFields,
        filledOrManualOptionalFields: filled,
        normalizedSearchTerm: 'acabamento',
      });

      const names = result.map((f) => f.name);
      expect(names).toContain('Material da estrutura');
      expect(names).toContain('Acabamento');
    });
  });

  describe('getMatchingOptionalFields', () => {
    it('retorna vazio se o termo tiver menos de 3 caracteres ou termos diferirem', () => {
      expect(
        getMatchingOptionalFields(mockAllFields, [], [], false, 'ac', 'ac')
      ).toEqual([]);

      expect(
        getMatchingOptionalFields(mockAllFields, [], [], false, 'acab', 'aca')
      ).toEqual([]);
    });

    it('retorna sugestões correspondentes respeitando o limite', () => {
      const result = getMatchingOptionalFields(
        mockAllFields,
        [mockAllFields[0]],
        [],
        false,
        'porta',
        'porta'
      );
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((f) => f.name.includes('porta'))).toBe(true);
    });
  });

  describe('getMatchingTopicGroups', () => {
    it('retorna grupo Portas ao buscar "portas"', () => {
      const groups = getMatchingTopicGroups(false, 'portas', 'portas');
      expect(groups.length).toBeGreaterThanOrEqual(1);
      expect(groups.some((g) => g.id === 'portas')).toBe(true);
    });

    it('retorna grupo Gavetas ao buscar "corrediças"', () => {
      const groups = getMatchingTopicGroups(false, 'corredica', 'corredica');
      expect(groups.length).toBeGreaterThanOrEqual(1);
      expect(groups.some((g) => g.id === 'gavetas')).toBe(true);
    });

    it('retorna vazio quando requiredFieldsOnly for true', () => {
      expect(getMatchingTopicGroups(true, 'portas', 'portas')).toEqual([]);
    });
  });
});
