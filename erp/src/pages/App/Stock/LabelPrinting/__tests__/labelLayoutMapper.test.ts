import { describe, expect, it } from 'vitest';
import { mapDbToModel, mapModelToDb } from '../services/labelLayoutMapper';
import { createInitialLabelConfig, mapModelToLabelConfig } from '../services/labelModelMapper';
import type { GridModel } from '../types/LabelGridModelTypes';

const model: GridModel = { id: 'layout-1', name: 'MODELO', columns: 1, rows: 2, marginT: 0, marginB: 0, marginL: 0, marginR: 0, gapH: 0, gapV: 0, paperSize: 'A4', icon: '', category: 'precos', type: 'rect' };
describe('persistência e seleção de valores de desenho', () => {
  it('preserva zeros, frações NUMERIC, flags falsas e JSON no ciclo de seleção', () => {
    const input = { ...model, nameFontSize: 0, priceFontSize: 0, promoPriceFontSize: 0, imageScale: 0, namePosX: 1.25,
      priceFontSizeTens: 0, priceFontSizeTenThousands: 2.5, nameBold: false, artConfig: { globalSnapshot: { title: 'OFERTA', metadata: { zero: 0, enabled: false, nullable: null } } } };
    const row = mapModelToDb(input);
    expect(row).toMatchObject({ name_font_size: 0, price_font_size: 0, promo_price_font_size: 0, safety_margin: 0, name_pos_x: 1.25, name_bold: false, price_font_size_tens: 0, price_font_size_ten_thousands: 2.5, art_config: input.artConfig });
    const loaded = mapDbToModel({ ...row, id: model.id });
    expect(loaded).toMatchObject(input);
    const selected = mapModelToLabelConfig(loaded, createInitialLabelConfig(), {});
    expect(selected).toMatchObject({ nameFontSize: 0, priceFontSize: 0, promoPriceFontSize: 0, imageScale: 0, namePosX: 1.25, nameBold: false, artConfig: input.artConfig });
  });

  it('normaliza apenas NULLs opcionais no topo e aceita fontes TEXT numéricas', () => {
    const row = { ...mapModelToDb(model), id: model.id, base_model_id: null, name_font_size: null, art_config: { globalSnapshot: { metadata: { nullable: null } } }, preview_image: null, price_font_size_tens: '0', price_font_size_ten_thousands: '2.5' };
    const result = mapDbToModel(row as Parameters<typeof mapDbToModel>[0]);
    expect(result.nameFontSize).toBeUndefined(); expect(result.baseModelId).toBeUndefined(); expect(result.previewImage).toBeNull();
    expect(result).toMatchObject({ priceFontSizeTens: 0, priceFontSizeTenThousands: 2.5, artConfig: row.art_config });
  });

  it.each(['', ' ', 'NaN', 'Infinity', 'not-number'])('rejeita fonte TEXT inválida %j sem convertê-la em zero', (invalid) => {
    expect(() => mapDbToModel({ ...mapModelToDb(model), id: model.id, price_font_size_tens: invalid })).toThrow('fonte inválido');
  });

  it('usa objeto de arte vazio compatível com NOT NULL e conserva origem simbólica sem inventar UUID', () => {
    expect(mapModelToDb({ ...model, baseModelId: 'ident_2x5' })).toMatchObject({ art_config: {}, base_model_id: 'ident_2x5' });
  });
});
