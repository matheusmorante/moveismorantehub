// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
  applyTechnicalValueChangeToProduct,
  cleanupDependentCharacteristicsOnZero,
  applyDepthLengthToggleToProduct,
  syncProductWithVariations,
  populateInitialTechnicalValues,
} from './technicalSyncUtils';
import type { Product } from '../../../../../types/product.type';

describe('technicalSyncUtils', () => {
  describe('cleanupDependentCharacteristicsOnZero', () => {
    it('não altera valores se a quantidade não for zero', () => {
      const tv = {
        'Quantidade de portas': 2,
        'Tipo de portas': 'De correr',
      };
      const result = cleanupDependentCharacteristicsOnZero(tv, 'Quantidade de portas', 2);
      expect(result).toEqual(tv);
    });

    it('limpa campos de portas quando a quantidade de portas for 0 ou "0"', () => {
      const tv = {
        'Quantidade de portas': 0,
        'Possui portas': 'Sim',
        'Tipo de portas': 'De correr',
        'Material das portas': 'MDF',
        'Material da estrutura': 'MDP',
      };
      const result = cleanupDependentCharacteristicsOnZero(tv, 'Quantidade de portas', 0);
      expect(result['Possui portas']).toBeUndefined();
      expect(result['Tipo de portas']).toBe('');
      expect(result['Material das portas']).toBe('');
      expect(result['Material da estrutura']).toBe('MDP');
    });

    it('limpa corrediças (array) e gavetas quando a quantidade de gavetas for 0', () => {
      const tv = {
        'Quantidade de gavetas': 0,
        'Possui gavetas': 'Sim',
        'Materiais das corrediças': ['Telescópica'],
        'Material das gavetas': 'MDP',
      };
      const result = cleanupDependentCharacteristicsOnZero(tv, 'Quantidade de gavetas', 0);
      expect(result['Possui gavetas']).toBeUndefined();
      expect(result['Materiais das corrediças']).toEqual([]);
      expect(result['Material das gavetas']).toBe('');
    });
  });

  describe('applyTechnicalValueChangeToProduct', () => {
    it('atualiza valores técnicos e marca', () => {
      const prev: Partial<Product> = { technicalValues: {} };
      const next = applyTechnicalValueChangeToProduct(prev, 'Marca', 'Morante');
      expect(next.technicalValues?.['Marca']).toBe('Morante');
      expect(next.brand).toBe('Morante');
    });

    it('atualiza dimensões e sincroniza variações', () => {
      const prev: Partial<Product> = {
        technicalValues: {},
        variations: [
          {
            id: 'v1',
            name: 'V1',
            height: 0,
            width: 0,
            depth: 0,
            weight: 0,
            syncHeight: true,
          } as any,
        ],
      };

      const next = applyTechnicalValueChangeToProduct(prev, 'Altura', '125,5');
      expect(next.height).toBe(125.5);
      expect(next.variations?.[0].height).toBe(125.5);
    });

    it('remove chave quando valor for null ou undefined', () => {
      const prev: Partial<Product> = {
        technicalValues: { 'Material da estrutura': 'MDF' },
      };
      const next = applyTechnicalValueChangeToProduct(prev, 'Material da estrutura', undefined);
      expect(next.technicalValues?.['Material da estrutura']).toBeUndefined();
    });
  });

  describe('applyDepthLengthToggleToProduct', () => {
    it('migra valor entre profundidade e comprimento e sincroniza variações', () => {
      const prev: Partial<Product> = {
        technicalValues: { Profundidade: '45' },
        variations: [
          {
            id: 'v1',
            name: 'V1',
            height: 0,
            width: 0,
            depth: 0,
            weight: 0,
            syncDepth: true,
          } as any,
        ],
      };

      const next = applyDepthLengthToggleToProduct(prev, 'Profundidade', 'Comprimento');
      expect(next.technicalValues?.['Profundidade']).toBeUndefined();
      expect(next.technicalValues?.['Comprimento']).toBe('45');
      expect(next.depth).toBe(45);
      expect(next.variations?.[0].depth).toBe(45);
    });
  });

  describe('syncProductWithVariations', () => {
    it('retorna o mesmo objeto quando não há variações', () => {
      const prod: Partial<Product> = { height: 100 };
      expect(syncProductWithVariations(prod)).toBe(prod);
    });
  });

  describe('populateInitialTechnicalValues (retrocompatibilidade)', () => {
    it('normaliza quantidades legadas com texto para inteiros e ativa switches mestres', () => {
      const prev: Partial<Product> = {
        technicalValues: {
          'Quantidade de portas': '3 portas',
          'Quantidade de gavetas': '2 gavetas',
          'Quantidade de pés': '4 pés',
          'Tipo de portas': 'Bater',
          'Tipo/Material das corrediças': 'Corrediça metálica telescópica',
        },
      };

      const result = populateInitialTechnicalValues(prev, []);
      expect(result.technicalValues?.['Quantidade de portas']).toBe(3);
      expect(result.technicalValues?.['Quantidade de gavetas']).toBe(2);
      expect(result.technicalValues?.['Quantidade de pés']).toBe(4);
      expect(result.technicalValues?.['Possui portas']).toBe('Sim');
      expect(result.technicalValues?.['Possui gavetas']).toBe('Sim');
      expect(result.technicalValues?.['Possui pés']).toBe('Sim');
      expect(result.technicalValues?.['Tipo de portas']).toEqual(['Bater']);
      expect(result.technicalValues?.['Tipo/Material das corrediças']).toEqual([
        'Corrediça metálica telescópica',
      ]);
    });

    it('divide strings compostas com "+" em array para multi-select', () => {
      const prev: Partial<Product> = {
        technicalValues: {
          'Tipo de portas': 'Bater + Basculante',
        },
      };

      const result = populateInitialTechnicalValues(prev, []);
      expect(result.technicalValues?.['Tipo de portas']).toEqual(['Bater', 'Basculante']);
      expect(result.technicalValues?.['Possui portas']).toBe('Sim');
    });
  });
});
