import { describe, expect, it } from 'vitest';
import {
  applyPresetToConfig,
  createInitialLabelConfig,
  mapModelToLabelConfig,
  resolveAutoPreset,
} from '../services/labelModelMapper';
import type { GridModel } from '../types/LabelGridModelTypes';

describe('labelModelMapper', () => {
  describe('createInitialLabelConfig', () => {
    it('cria configuração padrão para contexto geral (logos)', () => {
      const config = createInitialLabelConfig(false);
      expect(config.preset).toBe('store_logo');
      expect(config.showStoreLogo).toBe(true);
      expect(config.showName).toBe(false);
      expect(config.columns).toBe(2);
      expect(config.rows).toBe(3);
    });

    it('cria configuração padrão para contexto de produto (qr_product)', () => {
      const config = createInitialLabelConfig(true);
      expect(config.preset).toBe('qr_product');
      expect(config.showName).toBe(true);
      expect(config.showBarcode).toBe(true);
      expect(config.showSKU).toBe(true);
      expect(config.showStoreLogo).toBe(false);
    });
  });

  describe('resolveAutoPreset', () => {
    it('resolve preset conforme a categoria informada', () => {
      expect(resolveAutoPreset('precos')).toBe('price_only');
      expect(resolveAutoPreset('identificacao')).toBe('qr_product');
      expect(resolveAutoPreset('logos')).toBe('store_logo');
      expect(resolveAutoPreset('outra_coisa')).toBe('qr_product');
      expect(resolveAutoPreset(null)).toBe('qr_product');
    });
  });

  describe('mapModelToLabelConfig', () => {
    const mockModel: GridModel = {
      id: 'modelo_precos_1',
      name: 'Preço Gondola',
      columns: 3,
      rows: 4,
      marginT: 5,
      marginB: 5,
      marginL: 6,
      marginR: 6,
      gapH: 3,
      gapV: 3,
      icon: 'bi-grid',
      paperSize: 'A4',
      type: 'rect',
      category: 'precos',
      nameFontSize: 12,
      priceFontSize: 30,
      priceColor: '#ff0000',
    };

    it('mapeia propriedades geométricas e tipográficas do modelo para o LabelConfig', () => {
      const baseConfig = createInitialLabelConfig(false);
      const mapped = mapModelToLabelConfig(mockModel, baseConfig);

      expect(mapped.layoutId).toBe('modelo_precos_1');
      expect(mapped.preset).toBe('price_only');
      expect(mapped.columns).toBe(3);
      expect(mapped.rows).toBe(4);
      expect(mapped.marginT).toBe(5);
      expect(mapped.priceFontSize).toBe(30);
      expect(mapped.priceColor).toBe('#ff0000');
      expect(mapped.showPrice).toBe(true);
      expect(mapped.showBarcode).toBe(false);
    });

    it('prioriza artConfig salvo em savedArtConfigs se disponível', () => {
      const baseConfig = createInitialLabelConfig(false);
      const savedArt = { elements: [{ id: 'saved_elem', type: 'image' }] };
      const mapped = mapModelToLabelConfig(mockModel, baseConfig, {
        modelo_precos_1: savedArt as any,
      });

      expect(mapped.artConfig).toEqual(savedArt);
    });
  });

  describe('applyPresetToConfig', () => {
    it('aplica preset price_only com categoria e visibilidades corretas', () => {
      const base = createInitialLabelConfig(false);
      const result = applyPresetToConfig('price_only', base);

      expect(result.preset).toBe('price_only');
      expect(result.category).toBe('precos');
      expect(result.showPrice).toBe(true);
      expect(result.showBarcode).toBe(false);
      expect(result.showStoreLogo).toBe(false);
    });

    it('aplica preset store_logo com categoria logos', () => {
      const base = createInitialLabelConfig(true);
      const result = applyPresetToConfig('store_logo', base);

      expect(result.preset).toBe('store_logo');
      expect(result.category).toBe('logos');
      expect(result.showStoreLogo).toBe(true);
      expect(result.showName).toBe(false);
      expect(result.showBarcode).toBe(false);
    });

    it('aplica preset social_square com categoria posts', () => {
      const base = createInitialLabelConfig(false);
      const result = applyPresetToConfig('social_square', base);

      expect(result.preset).toBe('social_square');
      expect(result.category).toBe('posts');
      expect(result.showStoreLogo).toBe(true);
      expect(result.showStoreName).toBe(true);
      expect(result.showPrice).toBe(true);
    });
  });
});
