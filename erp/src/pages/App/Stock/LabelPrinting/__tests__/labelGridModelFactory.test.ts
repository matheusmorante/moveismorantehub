import { describe, expect, it } from 'vitest';
import {
  createGridModelFromEditorState,
  type LabelGridModelEditorState,
} from '../services/labelGridModelFactory';
import type { GridModel } from '../types/LabelGridModelTypes';

const editor: LabelGridModelEditorState = {
  name: '  Modelo editado  ',
  generatedName: 'Nome automático',
  columns: 2,
  rows: 3,
  marginT: 0,
  marginB: 0,
  marginL: 0,
  marginR: 0,
  gapH: 0,
  gapV: 0,
  paperSize: 'Custom',
  customWidth: 100.5,
  customHeight: 200.25,
  layoutType: 'rect',
  namePos: { x: 0, y: 0 },
  pricePos: { x: 0, y: 0 },
  promoPos: { x: 0, y: 0 },
  barcodePos: { x: 0, y: 0 },
  priceSymbolPos: { x: 0, y: 0 },
  priceDecimalsPos: { x: 0, y: 0 },
  promoNamePos: { x: 0, y: 0 },
  oldPricePos: { x: 0, y: 0 },
  promoBarcodePos: { x: 0, y: 0 },
  promoPriceSymbolPos: { x: 0, y: 0 },
  promoPriceDecimalsPos: { x: 0, y: 0 },
  customPreviewImage: null,
  nameFontSize: 0,
  imageScale: 0,
};

describe('createGridModelFromEditorState', () => {
  it('preserva arte, origem e metadata não controladas ao editar', () => {
    const editingModel: GridModel & { metadata: { revision: number; enabled: boolean } } = {
      id: 'modelo-existente',
      baseModelId: 'modelo-origem',
      name: 'Modelo antigo',
      columns: 1,
      rows: 1,
      marginT: 10,
      marginB: 10,
      marginL: 10,
      marginR: 10,
      gapH: 5,
      gapV: 5,
      paperSize: 'A4',
      icon: 'bi-circle',
      category: 'precos',
      type: 'round',
      nameFontSize: 22,
      imageScale: 1,
      borderWidth: 0,
      customPadding: 0,
      imageFit: 'contain',
      showPromoPrice: false,
      dePricePorGroupPos: { x: 0, y: 0 },
      dePricePorGroupRotation: 0,
      dePricePorGroupGap: 0,
      artConfig: { globalSnapshot: { title: 'Arte original', opacity: 0, enabled: false } },
      metadata: { revision: 0, enabled: false },
    };
    const original = structuredClone(editingModel);

    const result = createGridModelFromEditorState({
      ...editor,
      editingModel,
      currentCategory: 'logos',
    });

    expect(result).toMatchObject({
      id: editingModel.id,
      baseModelId: editingModel.baseModelId,
      category: 'precos',
      artConfig: editingModel.artConfig,
      metadata: editingModel.metadata,
      borderWidth: 0,
      customPadding: 0,
      imageFit: 'contain',
      showPromoPrice: false,
      dePricePorGroupPos: { x: 0, y: 0 },
      dePricePorGroupRotation: 0,
      dePricePorGroupGap: 0,
      name: 'Modelo editado',
      columns: 2,
      rows: 3,
      marginT: 0,
      gapH: 0,
      paperSize: 'Custom',
      paperWidth: 100.5,
      paperHeight: 200.25,
      type: 'rect',
      icon: 'bi-grid-fill',
      nameFontSize: 0,
      namePosX: 0,
      imageScale: 0,
      previewImage: null,
    });
    expect(editingModel).toEqual(original);
  });

  it('mantém o contrato de criação e limpa dimensões personalizadas após trocar o papel', () => {
    const created = createGridModelFromEditorState({
      ...editor,
      name: ' ',
      currentCategory: 'logos',
      layoutType: 'round',
    });

    expect(created).toMatchObject({
      id: expect.stringMatching(/^custom_\d+$/),
      name: 'Nome automático',
      category: 'logos',
      icon: 'bi-circle',
      type: 'round',
      paperWidth: 100.5,
      paperHeight: 200.25,
    });

    expect(createGridModelFromEditorState({ ...editor, editingModel: created, paperSize: 'A4' })).toMatchObject({
      id: created.id,
      paperWidth: undefined,
      paperHeight: undefined,
    });
  });
});
