import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  connected: true,
  localDraft: null as { code: string } | null,
  remoteDeletes: [] as Array<{ table: string; column: string; id: string }>,
  localDeletes: [] as string[],
  submissionDeletes: [] as string[],
  scanDeletes: [] as string[],
}));

vi.mock('../../supabaseClient', () => ({
  supabase: {
    from: (table: string) => ({
      delete: () => ({
        eq: async (column: string, id: string) => {
          state.remoteDeletes.push({ table, column, id });
          return { error: null };
        },
      }),
    }),
  },
}));

vi.mock('../../offline/connectivityService', () => ({
  connectivityService: { get connected() { return state.connected; } },
}));

vi.mock('../../sqlite/inventoryDrafts', () => ({
  getLocalInventoryDraft: async () => state.localDraft,
  deleteLocalInventoryDraft: async (id: string) => { state.localDeletes.push(id); },
}));

vi.mock('../../sqlite/inventoryOutbox', () => ({
  deleteInventorySubmission: async (id: string) => { state.submissionDeletes.push(id); },
}));

vi.mock('../../sqlite/inventoryScans', () => ({
  deleteLocalInventoryScans: async (id: string) => { state.scanDeletes.push(id); },
}));

import { deleteInventoryDraft } from './inventorySessionMutationService';

describe('deleteInventoryDraft', () => {
  beforeEach(() => {
    state.connected = true;
    state.localDraft = null;
    state.remoteDeletes = [];
    state.localDeletes = [];
    state.submissionDeletes = [];
    state.scanDeletes = [];
  });

  it('remove um rascunho LOCAL- apenas do aparelho mesmo quando a conexão parece ativa', async () => {
    state.localDraft = { code: 'LOCAL-12345678' };

    await deleteInventoryDraft('local-audit-id');

    expect(state.localDeletes).toEqual(['local-audit-id']);
    expect(state.submissionDeletes).toEqual(['local-audit-id']);
    expect(state.scanDeletes).toEqual(['local-audit-id']);
    expect(state.remoteDeletes).toEqual([]);
  });

  it('mantém a exclusão remota para um rascunho com código operacional quando online', async () => {
    state.localDraft = { code: '000042' };

    await deleteInventoryDraft('remote-audit-id');

    expect(state.remoteDeletes).toEqual([
      { table: 'inventory_moves', column: 'id', id: 'remote-audit-id' },
    ]);
  });

  it('não tenta excluir remotamente quando offline', async () => {
    state.connected = false;

    await deleteInventoryDraft('offline-audit-id');

    expect(state.localDeletes).toEqual(['offline-audit-id']);
    expect(state.remoteDeletes).toEqual([]);
  });
});
