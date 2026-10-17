import { describe, it, expect } from 'vitest';
import {
  extractProductAiPrerequisites,
  hasErpValue,
  computeInitialSelectionKeys,
  computeSelectAllKeys,
  applyAiCharacteristicsToProduct,
} from '../index';
import type { Product } from '../../../../../types/product.type';
import type { ProductAiSuggestedCharacteristics } from '../../../../../../../shared-utils/productAiFormSchemas';

describe('characteristicsAiUtils', () => {
  describe('extractProductAiPrerequisites', () => {
    it('extrai marca, nome e modelo com suporte canônico a Modelo/Linha e chaves legadas', () => {
      const p1: Partial<Product> = {
        name: 'Mesa de Jantar',
        brand: 'Morante',
        technicalValues: { 'Modelo/Linha': 'Imperial' },
      };
      const res1 = extractProductAiPrerequisites(p1, 'Mesas');
      expect(res1.hasName).toBe(true);
      expect(res1.hasBrand).toBe(true);
      expect(res1.hasModel).toBe(true);
      expect(res1.model).toBe('Imperial');
      expect(res1.isPrerequisitesMet).toBe(true);
      expect(res1.effectiveCategory).toBe('Mesas');

      // Suporte a fallback para line
      const p2: Partial<Product> = {
        title: 'Sofá Retrátil',
        technicalValues: { Marca: 'Estofados Sul' },
        line: 'Conforto',
      };
      const res2 = extractProductAiPrerequisites(p2);
      expect(res2.productName).toBe('Sofá Retrátil');
      expect(res2.brand).toBe('Estofados Sul');
      expect(res2.model).toBe('Conforto');
      expect(res2.isPrerequisitesMet).toBe(true);
    });

    it('identifica quando os pré-requisitos mínimos não foram atendidos', () => {
      const p: Partial<Product> = {
        name: 'A', // menos de 2 caracteres
        brand: '',
      };
      const res = extractProductAiPrerequisites(p);
      expect(res.hasName).toBe(false);
      expect(res.hasBrand).toBe(false);
      expect(res.hasModel).toBe(false);
      expect(res.isPrerequisitesMet).toBe(false);
    });
  });

  describe('productAiSelectionRules', () => {
    it('hasErpValue identifica valores significativos do ERP', () => {
      expect(hasErpValue(undefined)).toBe(false);
      expect(hasErpValue(null)).toBe(false);
      expect(hasErpValue('')).toBe(false);
      expect(hasErpValue('   ')).toBe(false);
      expect(hasErpValue('0')).toBe(false);
      expect(hasErpValue(0)).toBe(false);
      expect(hasErpValue('Preto')).toBe(true);
      expect(hasErpValue(120)).toBe(true);
    });

    it('computeInitialSelectionKeys protege valores já preenchidos no ERP e desmarca baixa confiança', () => {
      const suggested: ProductAiSuggestedCharacteristics = {
        identifiedProduct: {
          name: 'Mesa Imperial 6 Cadeiras',
          brand: 'Morante',
          model: 'Imperial',
        },
        height: 80,
        width: 140,
        technicalValues: {
          Material: 'MDF',
          Formato: 'Retangular',
          Acabamento: 'Verniz',
        },
        itemConfidence: {
          Acabamento: 'baixa',
        },
      };

      const formData: Partial<Product> = {
        name: 'Mesa de Jantar',
        width: 130, // Já preenchido no ERP
        technicalValues: {
          Material: 'MDF', // Já preenchido no ERP
        },
      };

      const selection = computeInitialSelectionKeys(suggested, formData);

      // Nome: já existe no formData -> desmarcado
      expect(selection['__field_name__']).toBe(false);
      // Marca: não existe no formData -> marcado
      expect(selection['__field_brand__']).toBe(true);
      // Modelo: não existe no formData -> marcado
      expect(selection['__field_model__']).toBe(true);
      // Altura: não existe no formData -> marcado
      expect(selection['__field_height__']).toBe(true);
      // Largura: já existe no formData -> desmarcado
      expect(selection['__field_width__']).toBe(false);
      // Material: já existe no ERP -> desmarcado
      expect(selection['Material']).toBe(false);
      // Formato: não existe no ERP e confiança não é baixa -> marcado
      expect(selection['Formato']).toBe(true);
      // Acabamento: confiança 'baixa' -> desmarcado
      expect(selection['Acabamento']).toBe(false);
    });

    it('computeSelectAllKeys marca e desmarca todos os campos disponíveis', () => {
      const suggested: ProductAiSuggestedCharacteristics = {
        identifiedProduct: { name: 'Cadeira X' },
        height: 90,
        technicalValues: { Cor: 'Azul' },
      };

      const allSelected = computeSelectAllKeys(suggested, true);
      expect(allSelected['__field_name__']).toBe(true);
      expect(allSelected['__field_height__']).toBe(true);
      expect(allSelected['Cor']).toBe(true);

      const allDeselected = computeSelectAllKeys(suggested, false);
      expect(allDeselected['__field_name__']).toBe(false);
      expect(allDeselected['__field_height__']).toBe(false);
      expect(allDeselected['Cor']).toBe(false);
    });
  });

  describe('applyAiCharacteristicsToProduct', () => {
    it('aplica dados selecionados e sincroniza Modelo/Linha unificado sem criar chaves redundantes', () => {
      const currentProduct: Partial<Product> = {
        name: 'Nome Antigo',
        technicalValues: {
          Modelo: 'Antigo', // chave legada
          Cor: 'Branco',
        },
      };

      const suggested: ProductAiSuggestedCharacteristics = {
        identifiedProduct: {
          name: 'Nome Novo Sugerido',
          brand: 'Morante Móveis',
          model: 'Linha Supreme',
        },
        height: 100,
        width: 150,
        technicalValues: {
          'Tipo de pés': 'Madeira Maciça',
        },
      };

      const selectedKeys = {
        __field_name__: true,
        __field_brand__: true,
        __field_model__: true,
        __field_height__: true,
        'Tipo de pés': true,
      };

      const editedValues = {
        __field_brand__: 'Morante Indústria',
      };

      const next = applyAiCharacteristicsToProduct(currentProduct, suggested, selectedKeys, editedValues);

      expect(next.name).toBe('Nome Novo Sugerido');
      expect(next.title).toBe('Nome Novo Sugerido');
      expect(next.brand).toBe('Morante Indústria');
      expect(next.line).toBe('Linha Supreme');
      expect(next.height).toBe(100);
      expect(next.technicalValues?.['Marca']).toBe('Morante Indústria');
      expect(next.technicalValues?.['Modelo/Linha']).toBe('Linha Supreme');
      expect(next.technicalValues?.['Modelo']).toBeUndefined(); // Chave legada higienizada
      expect(next.technicalValues?.['Tipo de pés']).toBe('Madeira Maciça');
      expect(next.technicalValues?.['Cor']).toBe('Branco'); // Preservado
    });
  });
});
