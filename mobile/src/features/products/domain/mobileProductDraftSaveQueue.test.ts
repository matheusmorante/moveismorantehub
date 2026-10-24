import { describe, expect, it, vi } from 'vitest';
import { createMobileProductDraftSaveQueue } from './mobileProductDraftSaveQueue';

describe('createMobileProductDraftSaveQueue', () => {
  it('serializa gravações e reduz snapshots pendentes ao mais recente', async () => {
    let finishFirst!: (saved: boolean) => void;
    const save = vi
      .fn<(entry: { revision: number; snapshot: string }) => Promise<boolean>>()
      .mockImplementationOnce(
        () => new Promise<boolean>((resolve) => { finishFirst = resolve; })
      )
      .mockResolvedValueOnce(true);
    const queue = createMobileProductDraftSaveQueue(save);

    const first = queue.enqueue({ revision: 1, snapshot: 'primeiro' });
    expect(save).toHaveBeenCalledTimes(1);
    const pending = queue.enqueue({ revision: 2, snapshot: 'intermediário' });
    queue.enqueue({ revision: 3, snapshot: 'mais recente' });

    finishFirst(true);
    await Promise.all([first, pending, queue.waitForIdle()]);

    expect(save.mock.calls.map(([entry]) => entry)).toEqual([
      { revision: 1, snapshot: 'primeiro' },
      { revision: 3, snapshot: 'mais recente' },
    ]);
  });

  it('descarta fila pendente após falha sem iniciar gravação obsoleta', async () => {
    let finishFirst!: (saved: boolean) => void;
    const save = vi
      .fn<(entry: { revision: number; snapshot: string }) => Promise<boolean>>()
      .mockImplementationOnce(
        () => new Promise<boolean>((resolve) => { finishFirst = resolve; })
      )
      .mockResolvedValueOnce(true);
    const queue = createMobileProductDraftSaveQueue(save);

    const first = queue.enqueue({ revision: 1, snapshot: 'primeiro' });
    queue.enqueue({ revision: 2, snapshot: 'pendente' });
    finishFirst(false);

    await expect(first).resolves.toBe(false);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('aguarda a revisão em andamento sem gravá-la uma segunda vez', async () => {
    let finishSave!: (saved: boolean) => void;
    const save = vi.fn(() => new Promise<boolean>((resolve) => { finishSave = resolve; }));
    const queue = createMobileProductDraftSaveQueue(save);

    const first = queue.enqueue({ revision: 4, snapshot: 'revisão atual' });
    const flush = queue.enqueue({ revision: 4, snapshot: 'mesma revisão' });
    expect(save).toHaveBeenCalledTimes(1);

    finishSave(true);
    await Promise.all([first, flush]);

    expect(save).toHaveBeenCalledTimes(1);
  });

  it('não substitui um snapshot mais novo por uma revisão atrasada', async () => {
    let finishFirst!: (saved: boolean) => void;
    const save = vi
      .fn<(entry: { revision: number; snapshot: string }) => Promise<boolean>>()
      .mockImplementationOnce(
        () => new Promise<boolean>((resolve) => { finishFirst = resolve; })
      )
      .mockResolvedValueOnce(true);
    const queue = createMobileProductDraftSaveQueue(save);

    const first = queue.enqueue({ revision: 1, snapshot: 'primeira' });
    const newest = queue.enqueue({ revision: 3, snapshot: 'mais nova' });
    queue.enqueue({ revision: 2, snapshot: 'atrasada' });

    finishFirst(true);
    await Promise.all([first, newest]);

    expect(save.mock.calls.map(([entry]) => entry.revision)).toEqual([1, 3]);
  });

  it('descarta snapshots pendentes quando a gravação em curso rejeita', async () => {
    let rejectFirst!: (error: Error) => void;
    const save = vi
      .fn<(entry: { revision: number; snapshot: string }) => Promise<boolean>>()
      .mockImplementationOnce(
        () => new Promise<boolean>((_resolve, reject) => { rejectFirst = reject; })
      )
      .mockResolvedValueOnce(true);
    const queue = createMobileProductDraftSaveQueue(save);

    const first = queue.enqueue({ revision: 1, snapshot: 'primeira' });
    queue.enqueue({ revision: 2, snapshot: 'pendente' });
    rejectFirst(new Error('resultado não confirmado'));

    await expect(first).rejects.toThrow('resultado não confirmado');
    expect(save).toHaveBeenCalledTimes(1);
  });
});
