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
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

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

    expect(saveCustomLabelLayouts(layouts)).toBe(true);

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
    expect(saveCustomLabels(labels)).toBe(true);

    expect(getCustomLabels()).toEqual(labels);
  });

  it('keeps default logos first and adds valid stored logos once', () => {
    const defaults = [{ id: 'default', name: 'Padrão', image: 'default.svg' }];
    expect(saveAvailableLabelLogos([...defaults, { id: 'custom', name: 'Extra', image: 'extra.svg' }])).toBe(true);

    expect(getAvailableLabelLogos(defaults)).toEqual([
      ...defaults,
      { id: 'custom', name: 'Extra', image: 'extra.svg' },
    ]);
  });

  it('persists hidden default layout identifiers', () => {
    expect(saveHiddenDefaultLayoutIds(['1x1_std', 'round-small'])).toBe(true);

    expect(getHiddenDefaultLayoutIds()).toEqual(['1x1_std', 'round-small']);
  });

  it.each([
    ['grade', () => saveCustomLabelLayouts([])],
    ['modelos ocultos', () => saveHiddenDefaultLayoutIds([])],
  ] as const)('não confirma armazenamento de %s quando falha ou descarta a escrita', (_name, save) => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('window', { localStorage: { ...storage, setItem: () => { throw new Error('Quota'); } } });
    expect(save()).toBe(false);
    vi.stubGlobal('window', { localStorage: { ...storage, setItem: () => undefined } });
    expect(save()).toBe(false);
    vi.stubGlobal('window', { localStorage: { ...storage, setItem: storage.setItem, getItem: () => 'stale' } });
    expect(save()).toBe(false);
  });

  it.each([
    ['rótulos', 'label_custom_labels', saveCustomLabels],
    ['logotipos', 'label_available_logos', saveAvailableLabelLogos],
  ] as const)('confirms exact serialized %s and preserves zero values and metadata', (_name, key, save) => {
    const assets = [{ id: 'owned-asset', name: 'Ativo', image: 'data:image/png;base64,x',
      extraFields: [{ id: 'field', x: 0, y: 0, size: 0, bold: false, text: '' }],
      metadata: { runId: 'owned', sequence: 0, selected: false } }];
    const serialized = JSON.stringify(assets);
    const getItem = vi.fn((value: string) => storage.getItem(value));
    vi.stubGlobal('window', { localStorage: { ...storage, getItem } });
    expect(save(assets)).toBe(true);
    expect(getItem).toHaveBeenCalledWith(key);
    expect(values.get(key)).toBe(serialized);
    expect(JSON.parse(values.get(key)!)).toEqual(assets);
  });

  it.each([saveCustomLabels, saveAvailableLabelLogos])('returns false on quota failure without replacing the prior library %#', (save) => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const quota = Object.assign(new Error('Quota excedida'), { name: 'QuotaExceededError' });
    const setItem = vi.fn(() => { throw quota; });
    values.set('label_custom_labels', '[]'); values.set('label_available_logos', '[]');
    vi.stubGlobal('window', { localStorage: { ...storage, setItem } });
    expect(save([{ id: 'new', name: 'Novo', image: 'new.svg' }])).toBe(false);
    expect(values.get('label_custom_labels')).toBe('[]'); expect(values.get('label_available_logos')).toBe('[]');
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('armazenamento local'), quota);
  });

  it.each([undefined, {}, { localStorage: null }])('returns false when storage is unavailable %#', (windowValue) => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('window', windowValue);
    const assets = [{ id: 'new', name: 'Novo', image: 'new.svg' }];
    expect(saveCustomLabels(assets)).toBe(false); expect(saveAvailableLabelLogos(assets)).toBe(false);
    expect(values.size).toBe(0); expect(warning).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['label_custom_labels', saveCustomLabels], ['label_available_logos', saveAvailableLabelLogos],
  ] as const)('rejects silent writes when %s retains an older payload', (key, save) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    values.set(key, '[]');
    vi.stubGlobal('window', { localStorage: { ...storage, setItem: vi.fn() } });
    expect(save([{ id: 'new', name: 'Novo', image: 'new.svg' }])).toBe(false);
    expect(values.get(key)).toBe('[]');
  });

  it('does not confirm a write when reading its result fails', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('window', { localStorage: { ...storage, getItem: () => { throw new Error('Leitura negada'); } } });
    expect(saveAvailableLabelLogos([{ id: 'new', name: 'Novo', image: 'new.svg' }])).toBe(false);
    expect(values.has('label_available_logos')).toBe(true);
  });
});
