// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
  normalizeTechnicalName,
  normalizeSearchTerm,
  parseNumericDimension,
  getToggledDepthLengthTarget,
  computeTechnicalFieldItemState,
  isOptionalFieldSelected,
  hasCharacteristicValue,
  SYNCED_FIELDS,
} from './technicalTabUtils';
import type { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';

describe('technicalTabUtils', () => {
  describe('normalizeTechnicalName & normalizeSearchTerm', () => {
    it('normaliza o nome técnico para lowercase e remove espaços extras', () => {
      expect(normalizeTechnicalName('  Altura Total ')).toBe('altura total');
      expect(normalizeTechnicalName('Cor')).toBe('cor');
    });

    it('normaliza termo de busca removendo acentos e espaços', () => {
      expect(normalizeSearchTerm('  Dimensões & Medição ')).toBe('dimensoes & medicao');
      expect(normalizeSearchTerm('NÃO SE APLICA')).toBe('nao se aplica');
    });
  });

  describe('parseNumericDimension', () => {
    it('retorna número válido maior que 0', () => {
      expect(parseNumericDimension(120.5)).toBe(120.5);
      expect(parseNumericDimension('85,5')).toBe(85.5);
      expect(parseNumericDimension(' 90.2 ')).toBe(90.2);
    });

    it('retorna undefined para entradas inválidas ou zero/negativas', () => {
      expect(parseNumericDimension(0)).toBeUndefined();
      expect(parseNumericDimension(-10)).toBeUndefined();
      expect(parseNumericDimension('')).toBeUndefined();
      expect(parseNumericDimension('abc')).toBeUndefined();
      expect(parseNumericDimension(null)).toBeUndefined();
      expect(parseNumericDimension(undefined)).toBeUndefined();
    });
  });

  describe('getToggledDepthLengthTarget', () => {
    const definitions: TechnicalFieldDefinition[] = [
      { id: '1', name: 'Profundidade' },
      { id: '2', name: 'Comprimento' },
      { id: '3', name: 'Profundidade total' },
      { id: '4', name: 'Comprimento total' },
    ];

    it('alterna Profundidade para Comprimento', () => {
      const target = getToggledDepthLengthTarget('Profundidade', definitions);
      expect(target?.name).toBe('Comprimento');
    });

    it('alterna Comprimento para Profundidade', () => {
      const target = getToggledDepthLengthTarget('Comprimento', definitions);
      expect(target?.name).toBe('Profundidade');
    });

    it('alterna Profundidade total para Comprimento total', () => {
      const target = getToggledDepthLengthTarget('Profundidade total', definitions);
      expect(target?.name).toBe('Comprimento total');
    });

    it('alterna Comprimento total para Profundidade total', () => {
      const target = getToggledDepthLengthTarget('Comprimento total', definitions);
      expect(target?.name).toBe('Profundidade total');
    });

    it('retorna undefined caso não encontre campo compatível', () => {
      const target = getToggledDepthLengthTarget('Profundidade', []);
      expect(target).toBeUndefined();
    });
  });

  describe('computeTechnicalFieldItemState', () => {
    const fieldAltura: TechnicalFieldDefinition = {
      id: 'f-1',
      name: 'Altura',
      isRequired: true,
    };

    const fieldMarca: TechnicalFieldDefinition = {
      id: 'f-2',
      name: 'Marca',
      isRequired: false,
    };

    const fieldOpcional: TechnicalFieldDefinition = {
      id: 'f-3',
      name: 'Material da estrutura',
      isRequired: false,
    };

    it('herda valor de altura a partir de formData.height se technicalValues estiver vazio', () => {
      const state = computeTechnicalFieldItemState(
        fieldAltura,
        { height: 180, technicalValues: {} },
        []
      );
      expect(state.rawValue).toBe(180);
      expect(state.hasSelectedValue).toBe(true);
      expect(state.isApplicable).toBe(true);
      expect(state.isAlwaysApplicable).toBe(true);
      expect(state.isFieldInvalid).toBe(false);
    });

    it('não aponta como erro ERP uma característica exigida apenas pelo catálogo', () => {
      const state = computeTechnicalFieldItemState(
        fieldAltura,
        { height: undefined, technicalValues: { Altura: '' } },
        [],
        { technicalValues: true }
      );
      expect(state.hasSelectedValue).toBe(false);
      expect(state.isApplicable).toBe(true);
      expect(state.isFieldInvalid).toBe(false);
    });

    it('identifica corretamente Marca vinda de formData.brand', () => {
      const state = computeTechnicalFieldItemState(
        fieldMarca,
        { brand: 'Morante', technicalValues: {} },
        []
      );
      expect(state.rawValue).toBe('Morante');
      expect(state.hasConfiguredValue).toBe(true);
      expect(state.isApplicable).toBe(true);
    });

    it('identifica campo opcional desligado como Não se aplica', () => {
      const state = computeTechnicalFieldItemState(
        fieldOpcional,
        { technicalValues: { 'Material da estrutura': 'Não se aplica' } },
        []
      );
      expect(state.isNotApplicable).toBe(true);
      expect(state.isApplicable).toBe(false);
    });
  });

  describe('hasCharacteristicValue', () => {
    it('reconhece valor de marca a partir de formData.brand ou technicalValues', () => {
      const field: TechnicalFieldDefinition = { id: 'm1', name: 'Marca' };
      expect(hasCharacteristicValue(field, { brand: 'Morante' })).toBe(true);
      expect(hasCharacteristicValue(field, { technicalValues: { Marca: 'Morante' } })).toBe(true);
      expect(hasCharacteristicValue(field, { brand: '' })).toBe(false);
      expect(hasCharacteristicValue(field, {})).toBe(false);
    });

    it('reconhece dimensões diretas ou em technicalValues', () => {
      const fieldAltura: TechnicalFieldDefinition = { id: 'a1', name: 'Altura' };
      expect(hasCharacteristicValue(fieldAltura, { height: 180 })).toBe(true);
      expect(hasCharacteristicValue(fieldAltura, { technicalValues: { Altura: '180' } })).toBe(true);
      expect(hasCharacteristicValue(fieldAltura, { height: 0 })).toBe(false);
    });

    it('identifica valores de características gerais excluindo vazio e Não se aplica', () => {
      const field: TechnicalFieldDefinition = { id: 'p1', name: 'Material dos puxadores' };
      expect(
        hasCharacteristicValue(field, { technicalValues: { 'Material dos puxadores': 'Alumínio' } })
      ).toBe(true);
      expect(
        hasCharacteristicValue(field, { technicalValues: { 'Material dos puxadores': '' } })
      ).toBe(false);
      expect(
        hasCharacteristicValue(field, {
          technicalValues: { 'Material dos puxadores': 'Não se aplica' },
        })
      ).toBe(false);
      expect(
        hasCharacteristicValue(field, { technicalValues: { 'Material dos puxadores': 'n/a' } })
      ).toBe(false);
    });
  });

  describe('isOptionalFieldSelected', () => {
    const field: TechnicalFieldDefinition = {
      id: 'f-opc',
      name: 'Garantia',
      isRequired: false,
    };

    it('retorna true se o campo estiver na lista de campos manuais', () => {
      expect(isOptionalFieldSelected(field, {}, ['Garantia'])).toBe(true);
    });

    it('retorna true se o campo possuir valor configurado diferente de Não se aplica', () => {
      expect(
        isOptionalFieldSelected(field, { technicalValues: { Garantia: '3 meses' } }, [])
      ).toBe(true);
    });

    it('retorna false se o valor for Não se aplica ou n/a', () => {
      expect(
        isOptionalFieldSelected(field, { technicalValues: { Garantia: 'Não se aplica' } }, [])
      ).toBe(false);
      expect(
        isOptionalFieldSelected(field, { technicalValues: { Garantia: 'n/a' } }, [])
      ).toBe(false);
    });
  });

  describe('SYNCED_FIELDS', () => {
    it('contém campos canônicos herdáveis por variações', () => {
      expect(SYNCED_FIELDS.has('description')).toBe(true);
      expect(SYNCED_FIELDS.has('width')).toBe(true);
      expect(SYNCED_FIELDS.has('height')).toBe(true);
      expect(SYNCED_FIELDS.has('depth')).toBe(true);
      expect(SYNCED_FIELDS.has('weight')).toBe(true);
    });
  });
});
