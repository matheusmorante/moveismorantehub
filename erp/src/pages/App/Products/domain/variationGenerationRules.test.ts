import { describe, it, expect } from 'vitest';
import {
  generateCartesianCombinations,
  deduplicateVariationSkus,
  buildBulkVariations,
  createDefaultNewVariation,
  regenerateAllVariationSkusList,
} from './variationGenerationRules';
import type Product from '../../../../types/product.type';
import type { Variation } from '../../../../types/product.type';

describe('variationGenerationRules', () => {
  describe('generateCartesianCombinations', () => {
    it('retorna vazio quando não há opções válidas', () => {
      expect(generateCartesianCombinations([])).toEqual({ attributes: [], combinations: [] });
      expect(generateCartesianCombinations([{ name: '', values: [], showName: true }])).toEqual({
        attributes: [],
        combinations: [],
      });
    });

    it('gera produto cartesiano de 2 atributos com múltiplos valores', () => {
      const options = [
        { name: 'Cor', values: ['Azul', 'Vermelho'], showName: true },
        { name: 'Tamanho', values: ['P', 'M', 'G'], showName: false },
      ];
      const result = generateCartesianCombinations(options);
      expect(result.attributes).toHaveLength(2);
      expect(result.combinations).toHaveLength(6);
      expect(result.combinations[0]).toEqual({
        Cor: { value: 'Azul', showName: true },
        Tamanho: { value: 'P', showName: false },
      });
      expect(result.combinations[5]).toEqual({
        Cor: { value: 'Vermelho', showName: true },
        Tamanho: { value: 'G', showName: false },
      });
    });
  });

  describe('deduplicateVariationSkus', () => {
    it('adiciona sufixo sequencial quando SKU já existe', () => {
      const existing: Variation[] = [
        { id: '1', sku: '001-01', name: 'Var 1', stock: 0, unitPrice: 10, active: true, status: 'published', attributes: [] },
      ];
      const newVars: Variation[] = [
        { id: '2', sku: '001-01', name: 'Var 2', stock: 0, unitPrice: 10, active: true, status: 'published', attributes: [] },
        { id: '3', sku: '001-01', name: 'Var 3', stock: 0, unitPrice: 10, active: true, status: 'published', attributes: [] },
      ];

      const deduplicated = deduplicateVariationSkus(newVars, existing);
      expect(deduplicated[0].sku).toBe('001-01-1');
      expect(deduplicated[1].sku).toBe('001-01-2');
    });
  });

  describe('buildBulkVariations', () => {
    it('monta variações em lote respeitando rascunho e nomes compostos', () => {
      const options = [
        { name: 'Cor', values: ['Preto'], showName: true },
      ];
      const formData: Partial<Product> = {
        name: 'Camisa Polo',
        code: '100',
        unitPrice: 50,
        status: 'draft',
      };
      const result = buildBulkVariations(options, formData, []);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Camisa Polo Preto');
      expect(result[0].status).toBe('draft');
      expect(result[0].active).toBe(false);
      expect(result[0].syncUnitPrice).toBe(true);
    });

    it('preserva atributos ocultos mas não usa seus valores no nome automático', () => {
      const result = buildBulkVariations(
        [
          { name: 'Cor', values: ['azul'], showName: true },
          { name: 'Lote interno', values: ['premium'], showName: false },
        ],
        { name: 'Tênis' },
        []
      );

      expect(result[0].name).toBe('Tênis Azul');
      expect(result[0].attributes).toEqual([
        { name: 'Cor', value: 'Azul', showName: true },
        { name: 'Lote Interno', value: 'Premium', showName: false },
      ]);
    });
  });

  describe('createDefaultNewVariation', () => {
    it('cria variação padrão com herança ativada', () => {
      const formData: Partial<Product> = {
        name: 'Mesa de Centro',
        code: '200',
        unitPrice: 150,
        costPrice: 80,
      };
      const variation = createDefaultNewVariation(formData, []);
      expect(variation.name).toBe('Mesa de Centro');
      expect(variation.unitPrice).toBe(150);
      expect(variation.costPrice).toBe(80);
      expect(variation.syncUnitPrice).toBe(true);
      expect(variation.syncCostPrice).toBe(true);
      expect(variation.syncDimensions).toBe(true);
    });
  });

  describe('regenerateAllVariationSkusList', () => {
    it('regera apenas SKUs genéricos ou ausentes e preserva os manuais', () => {
      const variations: Variation[] = [
        { id: '1', sku: 'CUSTOM-SKU-99', name: 'Personalizado', stock: 0, unitPrice: 10, active: true, status: 'published', attributes: [] },
        { id: '2', sku: '', name: 'Sem Sku', stock: 0, unitPrice: 10, active: true, status: 'published', attributes: [] },
        { id: '3', sku: 'NEW-VAR-1', name: 'Nova', stock: 0, unitPrice: 10, active: true, status: 'published', attributes: [] },
      ];
      const result = regenerateAllVariationSkusList(variations, 'PROD01');
      expect(result[0].sku).toBe('CUSTOM-SKU-99');
      expect(result[1].sku).toBe('PROD01-SEMSKU');
      expect(result[2].sku).toBe('PROD01-NOVA');
    });
  });
});
