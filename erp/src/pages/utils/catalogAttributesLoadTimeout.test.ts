import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CATALOG_ATTRIBUTES_LOAD_TIMEOUT_MS,
  withCatalogAttributesLoadTimeout,
} from '../../../../shared-utils/catalogAttributesLoadTimeout';

describe('withCatalogAttributesLoadTimeout', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns the resolved catalogue result', async () => {
    const result = [{ id: 'attribute-1', name: 'Cor' }];

    await expect(
      withCatalogAttributesLoadTimeout(Promise.resolve(result), 'test:catalog'),
    ).resolves.toBe(result);
  });

  it('propagates query errors instead of converting them to a timeout', async () => {
    const error = new Error('Falha ao consultar características.');

    await expect(
      withCatalogAttributesLoadTimeout(Promise.reject(error), 'test:catalog'),
    ).rejects.toBe(error);
  });

  it('rejects when the configured timeout wins the race', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const pendingQuery = new Promise<never>(() => undefined);
    const result = withCatalogAttributesLoadTimeout(pendingQuery, 'test:catalog');
    const rejection = expect(result).rejects.toThrow('15 segundos');

    await vi.advanceTimersByTimeAsync(CATALOG_ATTRIBUTES_LOAD_TIMEOUT_MS);
    await rejection;
  });
});
