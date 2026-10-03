import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getAvailableLabelLogos,
  getCustomLabelLayouts,
  getCustomLabels,
  getHiddenDefaultLayoutIds,
  saveAvailableLabelLogos,
  saveCustomLabelLayouts,
  saveCustomLabels,
  saveHiddenDefaultLayoutIds,
} from '../services/labelStorageService';

describe('labelStorageService', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
  } satisfies Storage;

  beforeEach(() => {
    values.clear();
    vi.stubGlobal('window', { localStorage: storage });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('reads and writes custom layouts using the expected shape', () => {
    const layouts = [
      {
        id: 'custom_layout',
        name: 'Layout local',
        columns: 2,
        rows: 3,
        marginT: 10,
        marginB: 10,
        marginL: 10,
        marginR: 10,
        gapH: 2,
        gapV: 2,
        paperSize: 'A4',
        icon: 'bi-grid',
      },
    ];

    saveCustomLabelLayouts(layouts);

    expect(getCustomLabelLayouts()).toEqual(layouts);
  });

  it('ignores malformed cached layouts, labels, and hidden identifiers', () => {
    storage.setItem('custom_label_layouts', JSON.stringify([{ id: 1 }]));
    storage.setItem('label_custom_labels', JSON.stringify([{ id: 'x' }, null]));
    storage.setItem('hidden_default_layout_ids', JSON.stringify(['hidden', 5]));

    expect(getCustomLabelLayouts()).toBeNull();
    expect(getCustomLabels()).toEqual([]);
    expect(getHiddenDefaultLayoutIds()).toEqual([]);
  });

  it('persists custom labels by identifier', () => {
    const labels = [{ id: 'label_1', name: 'Preço', image: 'data:image/png;base64,x' }];
    saveCustomLabels(labels);

    expect(getCustomLabels()).toEqual(labels);
  });

  it('keeps default logos first and adds valid stored logos once', () => {
    const defaults = [{ id: 'default', name: 'Padrão', image: 'default.svg' }];
    saveAvailableLabelLogos([...defaults, { id: 'custom', name: 'Extra', image: 'extra.svg' }]);

    expect(getAvailableLabelLogos(defaults)).toEqual([
      ...defaults,
      { id: 'custom', name: 'Extra', image: 'extra.svg' },
    ]);
  });

  it('persists hidden default layout identifiers', () => {
    saveHiddenDefaultLayoutIds(['1x1_std', 'round-small']);

    expect(getHiddenDefaultLayoutIds()).toEqual(['1x1_std', 'round-small']);
  });
});
