import { describe, expect, it, vi } from 'vitest';
import { PRODUCT_LIST_PAGE_SIZES } from '../../../../../shared-utils/listingFormSchemas';
import {
  getMobileProductPageSizePreferenceKey,
  readMobileProductPageSizePreference,
  writeMobileProductPageSizePreference,
  type MobileProductPageSizePreferenceStorage,
} from './mobileProductPageSizePreference';

describe('mobileProductPageSizePreference', () => {
  it('separa a preferência por usuário e módulo, sem persistir perfis anônimos', () => {
    expect(getMobileProductPageSizePreferenceKey('user-1', 'standard'))
      .toBe('@morantehub:products:page-size:user-1:standard');
    expect(getMobileProductPageSizePreferenceKey('user-1', 'composition'))
      .not.toBe(getMobileProductPageSizePreferenceKey('user-1', 'standard'));
    expect(getMobileProductPageSizePreferenceKey('user-2', 'standard'))
      .not.toBe(getMobileProductPageSizePreferenceKey('user-1', 'standard'));
    expect(getMobileProductPageSizePreferenceKey(null, 'standard')).toBeNull();
  });

  it('recupera apenas tamanhos aceitos pelo schema compartilhado', async () => {
    const values = new Map<string, string>([['page-size', '30']]);
    const storage: MobileProductPageSizePreferenceStorage = {
      getItem: vi.fn(async (key) => values.get(key) ?? null),
      setItem: vi.fn(async (key, value) => { values.set(key, value); }),
    };

    expect(await readMobileProductPageSizePreference('page-size', storage)).toBe(30);
    for (const size of PRODUCT_LIST_PAGE_SIZES) {
      values.set('page-size', String(size));
      expect(await readMobileProductPageSizePreference('page-size', storage)).toBe(size);
    }
    values.set('page-size', '11');
    expect(await readMobileProductPageSizePreference('page-size', storage)).toBeNull();
    expect(await readMobileProductPageSizePreference(null, storage)).toBeNull();
  });

  it('persiste a escolha e a recupera na reabertura', async () => {
    const values = new Map<string, string>();
    const storage: MobileProductPageSizePreferenceStorage = {
      getItem: vi.fn(async (key) => values.get(key) ?? null),
      setItem: vi.fn(async (key, value) => { values.set(key, value); }),
    };

    const key = getMobileProductPageSizePreferenceKey('user-1', 'composition');
    await writeMobileProductPageSizePreference(key, 50, storage);

    expect(storage.setItem).toHaveBeenCalledWith(key, '50');
    expect(await readMobileProductPageSizePreference(key, storage)).toBe(50);
  });

  it('usa fallback seguro em falha de leitura e escrita', async () => {
    const storage: MobileProductPageSizePreferenceStorage = {
      getItem: vi.fn().mockRejectedValue(new Error('storage unavailable')),
      setItem: vi.fn().mockRejectedValue(new Error('storage unavailable')),
    };

    expect(await readMobileProductPageSizePreference('page-size', storage)).toBeNull();
    await expect(writeMobileProductPageSizePreference('page-size', 50, storage)).resolves.toBeUndefined();
    await expect(writeMobileProductPageSizePreference(null, 50, storage)).resolves.toBeUndefined();
  });

  it('não mantém a consulta bloqueada se o armazenamento local não responder', async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const storage: MobileProductPageSizePreferenceStorage = {
      getItem: vi.fn(() => new Promise<string | null>(() => undefined)),
      setItem: vi.fn(() => new Promise<void>(() => undefined)),
    };

    try {
      const read = readMobileProductPageSizePreference('page-size', storage);
      await vi.advanceTimersByTimeAsync(1_000);
      await expect(read).resolves.toBeNull();

      const write = writeMobileProductPageSizePreference('page-size', 30, storage);
      await vi.advanceTimersByTimeAsync(1_000);
      await expect(write).resolves.toBeUndefined();
      expect(warn).toHaveBeenCalledTimes(2);
    } finally {
      warn.mockRestore();
      vi.useRealTimers();
    }
  });
});
