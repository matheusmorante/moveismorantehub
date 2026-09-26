import { describe, expect, it, vi } from 'vitest';
import { createAsyncSingleton } from './asyncSingleton';

describe('abertura assíncrona compartilhada do SQLite', () => {
  it('compartilha uma abertura quando várias áreas pedem o banco juntas', async () => {
    let finishOpening!: (database: object) => void;
    const openDatabase = vi.fn(() => new Promise<object>((resolve) => { finishOpening = resolve; }));
    const getDatabase = createAsyncSingleton(openDatabase);

    const requests = [getDatabase(), getDatabase(), getDatabase()];
    await Promise.resolve();
    expect(openDatabase).toHaveBeenCalledTimes(1);

    const nativeDatabase = {};
    finishOpening(nativeDatabase);
    const databases = await Promise.all(requests);
    expect(databases).toEqual([nativeDatabase, nativeDatabase, nativeDatabase]);
    expect(await getDatabase()).toBe(nativeDatabase);
  });

  it('permite nova abertura depois que a primeira falha', async () => {
    const nativeDatabase = {};
    const openDatabase = vi.fn()
      .mockRejectedValueOnce(new Error('falha temporária'))
      .mockResolvedValueOnce(nativeDatabase);
    const getDatabase = createAsyncSingleton(openDatabase);

    await expect(getDatabase()).rejects.toThrow('falha temporária');
    await expect(getDatabase()).resolves.toBe(nativeDatabase);
    expect(openDatabase).toHaveBeenCalledTimes(2);
  });
});
