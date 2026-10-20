import { describe, expect, it } from 'vitest';
import {
  invertIfReversalCfop,
  resolveEmissionDraftByIndex,
  buildEnrichmentFallbackItems,
  extractXmlTagValue,
  computeSingleItemFiscalUpdate,
  computeBatchItemFiscalUpdates,
} from '../index';
import type { OrderItem } from '@/pages/types/order.type';
import type { NfeItemWithFiscal } from '../../NfeItemsSection';

describe('item-enrichment modular functions', () => {
  describe('invertIfReversalCfop', () => {
    it('inverts reversal CFOP 1949 and 2949 to normal sale', () => {
      expect(invertIfReversalCfop('1949', '1')).toBe('5102');
      expect(invertIfReversalCfop('1949', '2')).toBe('6102');
      expect(invertIfReversalCfop('2949', '1')).toBe('5102');
      expect(invertIfReversalCfop('2949', '2')).toBe('6102');
      expect(invertIfReversalCfop('1202', '1')).toBe('5102');
      expect(invertIfReversalCfop('2202', '2')).toBe('6102');
    });

    it('keeps standard CFOPs unchanged', () => {
      expect(invertIfReversalCfop('5102', '1')).toBe('5102');
      expect(invertIfReversalCfop('6102', '2')).toBe('6102');
      expect(invertIfReversalCfop(undefined, '1')).toBeUndefined();
    });
  });

  describe('extractXmlTagValue', () => {
    it('extracts tag value from XML string correctly', () => {
      const xml = '<prod><cProd>123</cProd><NCM>94035000</NCM></prod>';
      expect(extractXmlTagValue(xml, 'NCM')).toBe('94035000');
      expect(extractXmlTagValue(xml, 'cProd')).toBe('123');
      expect(extractXmlTagValue(xml, 'NONEXISTENT')).toBeNull();
      expect(extractXmlTagValue('', 'NCM')).toBeNull();
    });
  });

  describe('resolveEmissionDraftByIndex', () => {
    it('matches items by orderItemId, productId, or code', () => {
      const productItems: OrderItem[] = [
        {
          orderItemId: 'item-1',
          productId: 'prod-1',
          name: 'Produto 1',
          quantity: 1,
          price: 100,
          total: 100,
        },
        {
          productId: 'prod-2',
          name: 'Produto 2',
          quantity: 2,
          price: 50,
          total: 100,
        },
      ];

      const savedEmissionItems = [
        {
          orderItemId: 'item-1',
          fiscal: { ncm: '94035000', cfop: '5102' },
        },
        {
          productId: 'prod-2',
          fiscal: { ncm: '94036000', cfop: '5102' },
        },
      ];

      const matched = resolveEmissionDraftByIndex(productItems, savedEmissionItems);
      expect(matched.get(0)?.ncm).toBe('94035000');
      expect(matched.get(1)?.ncm).toBe('94036000');
    });
  });

  describe('buildEnrichmentFallbackItems', () => {
    it('builds fallback items using default values and shared draft NCM', () => {
      const productItems: OrderItem[] = [
        {
          productId: 'prod-1',
          name: 'Item A',
          quantity: 1,
          price: 100,
          total: 100,
        },
      ];
      const otherEnvDraft = [
        {
          productId: 'prod-1',
          fiscal: { ncm: '94035000' },
        },
      ];

      const result = buildEnrichmentFallbackItems({
        productItems,
        emissionDraftByIndex: new Map(),
        otherEnvDraft,
        operationScope: { destination: '1' },
        compatibleCfop: (cfop) => cfop || '5102',
        suggestedInitialCfop: '5102',
        dependenciesChanged: false,
        defaultFiscal: { origem: '0' },
        model: '55',
      });

      expect(result.fallbackItems[0].fiscal.ncm).toBe('94035000');
      expect(result.fallbackItems[0].fiscal.cfop).toBe('5102');
      expect(result.fallbackItems[0].fiscal.cst).toBe('103');
    });
  });

  describe('computeSingleItemFiscalUpdate and computeBatchItemFiscalUpdates', () => {
    it('recalculates CFOP and CST when classification changes', () => {
      const currentItem: NfeItemWithFiscal = {
        name: 'Item 1',
        quantity: 1,
        price: 100,
        total: 100,
        fiscal: {
          ncm: '94035000',
          cest: '',
          cfop: '5102',
          cst: '103',
          origem: '0',
          commercialUnit: 'UN',
          taxableUnit: 'UN',
        },
      };

      const { resolvedUpdates, classificationChanged } = computeSingleItemFiscalUpdate(
        currentItem,
        { ncm: '94036000' },
        {
          compatibleCfop: (cfop) => cfop || '5102',
          defaultCfop: '5102',
          defaultCst: '103',
        }
      );

      expect(classificationChanged).toBe(true);
      expect(resolvedUpdates.ncm).toBe('94036000');
      expect(resolvedUpdates.cfop).toBe('5102');
      expect(resolvedUpdates.cst).toBe('103');
    });

    it('processes batch updates correctly', () => {
      const currentItems: NfeItemWithFiscal[] = [
        {
          name: 'Item 1',
          quantity: 1,
          price: 100,
          total: 100,
          fiscal: {
            ncm: '94035000',
            cfop: '5102',
            cst: '103',
            origem: '0',
            commercialUnit: 'UN',
            taxableUnit: 'UN',
          },
        },
      ];

      const updated = [
        {
          ...currentItems[0],
          fiscal: {
            ...currentItems[0].fiscal,
            cst: '500',
          },
        },
      ];

      const { resolvedItems, updatedChoices } = computeBatchItemFiscalUpdates(
        currentItems,
        updated,
        {
          compatibleCfop: (cfop) => cfop || '5102',
          defaultCfop: '5102',
          defaultCst: '103',
        },
        {}
      );

      expect(resolvedItems[0].fiscal.cst).toBe('500');
      expect(resolvedItems[0].fiscal.csosnSource).toBe('manual');
      expect(updatedChoices[0].cst).toBe('500');
    });
  });
});
