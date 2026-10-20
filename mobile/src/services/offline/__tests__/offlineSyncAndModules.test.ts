import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Alert: { alert: vi.fn() },
  Platform: { OS: 'web' },
}));

const state = vi.hoisted(() => ({
  connected: false,
  rpcError: null as any,
  rpcData: null as any,
  ordersById: {} as Record<string, any>,
  calendarInserted: [] as any[],
  calendarRemoteRows: [] as any[],
  deletedRemoteInventoryIds: [] as string[],
}));

vi.mock('../connectivityService', () => ({
  connectivityService: {
    get connected() {
      return state.connected;
    },
    set connected(val: boolean) {
      state.connected = val;
    },
    initialize: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    checkConnection: vi.fn(async () => state.connected),
  },
}));

vi.mock('../../supabaseClient', () => ({
  MASTER_DEFAULT_PROFILE: { email: 'admin@morantehub.test', fullName: 'Admin' },
  supabase: {
    rpc: vi.fn(async (fnName: string, args: any) => {
      if (state.rpcError) {
        return { data: null, error: state.rpcError };
      }
      if (fnName === 'sync_entity_operation') {
        const orderId = args.p_entity_id;
        const current = state.ordersById[orderId] || {
          id: orderId,
          status: 'scheduled',
          version: 1,
          order_data: { id: orderId, status: 'scheduled' },
        };
        const mergedData = { ...current.order_data, ...(args.p_payload || {}) };
        const updated = {
          ...current,
          version: (current.version || 1) + 1,
          order_data: mergedData,
        };
        state.ordersById[orderId] = updated;
        return {
          data: state.rpcData || {
            success: true,
            server_version: updated.version,
            server_state: updated,
          },
          error: null,
        };
      }
      if (
        fnName === 'finalize_inventory_transaction_v2' ||
        fnName === 'finalize_inventory_transaction'
      ) {
        return {
          data: { status: 'processed', auditId: args.p_audit_id },
          error: null,
        };
      }
      return { data: null, error: null };
    }),
    from: vi.fn((table: string) => {
      if (table === 'orders') {
        let targetId = '';
        const query: any = {
          select: vi.fn(() => query),
          eq: vi.fn((col: string, val: string) => {
            if (col === 'id') targetId = val;
            return query;
          }),
          maybeSingle: vi.fn(async () => ({
            data: state.ordersById[targetId] || null,
            error: null,
          })),
          update: vi.fn((patch: any) => ({
            eq: vi.fn(async (_col: string, val: string) => {
              state.ordersById[val] = {
                ...(state.ordersById[val] || { id: val }),
                ...patch,
              };
              return { error: null };
            }),
          })),
        };
        return query;
      }

      if (table === 'calendar_events') {
        const query: any = {
          select: vi.fn(() => query),
          order: vi.fn(async () => {
            if (!state.connected) {
              throw new Error('Network request failed');
            }
            return { data: state.calendarRemoteRows, error: null };
          }),
          insert: vi.fn(async (rows: any[]) => {
            if (!state.connected) {
              return { error: { message: 'Network request failed' } };
            }
            for (const row of rows) {
              state.calendarInserted.push(row);
              state.calendarRemoteRows.push(row);
            }
            return { data: rows, error: null };
          }),
        };
        return query;
      }

      if (table === 'inventory_moves') {
        const query: any = {
          delete: vi.fn(() => ({
            eq: vi.fn(async (_col: string, val: string) => {
              state.deletedRemoteInventoryIds.push(val);
              return { error: null };
            }),
          })),
          select: vi.fn(() => query),
          eq: vi.fn(() => query),
          single: vi.fn(async () => {
            if (!state.connected) {
              throw new Error('Offline');
            }
            return { data: null, error: { message: 'Not found' } };
          }),
        };
        return query;
      }

      const fallbackQuery: any = {
        select: vi.fn(() => fallbackQuery),
        eq: vi.fn(() => fallbackQuery),
        maybeSingle: vi.fn(async () => {
          if (!state.connected) {
            throw new Error('Offline network error');
          }
          return {
            data: {
              id: 'user-offline-1',
              email: 'driver@morantehub.test',
              full_name: 'Motorista',
              role: 'driver',
              roles: ['driver'],
            },
            error: null,
          };
        }),
      };
      return fallbackQuery;
    }),
  },
}));

import { offlineSyncManager } from '../offlineSyncManager';
import { offlineStorageService } from '../offlineStorageService';
import { OrderRepository } from '../../../repositories/OrderRepository';
import {
  createCalendarEvent,
  fetchCalendarEvents,
  getPendingLocalCalendarEvents,
} from '../../scheduleEventsService';
import {
  saveLocalInventoryDraft,
  getLocalInventoryDraft,
  clearAllLocalInventoryDrafts,
} from '../../sqlite/inventoryDrafts';
import {
  freezeInventorySubmission,
  getInventorySubmission,
} from '../../sqlite/inventoryOutbox';
import { syncPendingInventorySubmissions } from '../../../features/stock/inventory/services/inventoryFinalizer';
import {
  deleteInventoryDraft,
  fetchInventorySessionDetails,
} from '../../stock/stockInventoryService';
import { resolveMobileUserProfile } from '../../mobileAuthProfile';

describe('Auditoria Offline End-to-End (Operações, Agenda, Inventário e Perfil)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    state.connected = false;
    state.rpcError = null;
    state.rpcData = null;
    state.ordersById = {};
    state.calendarInserted = [];
    state.calendarRemoteRows = [];
    state.deletedRemoteInventoryIds = [];
    await OrderRepository.init();
    await clearAllLocalInventoryDrafts();
  });

  it('sincroniza operações de entrega via fallback direto quando a RPC sync_entity_operation não existe (PGRST202)', async () => {
    const orderId = 'order-fallback-1';
    state.ordersById[orderId] = {
      id: orderId,
      status: 'scheduled',
      version: 2,
      order_data: {
        id: orderId,
        status: 'scheduled',
        deliveryStatus: 'in_route',
        deliveryStartedAt: '2026-10-20T08:00:00.000Z',
      },
    };

    await offlineStorageService.cacheWorkingSet('logistics_orders', [
      state.ordersById[orderId].order_data,
    ]);

    // Registra recuo de etapa (stepBackToPreparation) enquanto offline
    await offlineSyncManager.recordEvent(
      'DELIVERY_STEP_BACK',
      'order',
      orderId,
      {
        targetStep: 'preparation',
        occurredAt: '2026-10-20T08:15:00.000Z',
      }
    );

    // Simula ausência da RPC no banco (PGRST202) e reconexão
    state.rpcError = { code: 'PGRST202', message: 'Could not find function sync_entity_operation' };
    state.connected = true;

    await offlineSyncManager.processQueue();

    // Verifica que o fallback atualizou a tabela orders limpando deliveryStatus e deliveryStartedAt
    const updatedRemote = state.ordersById[orderId];
    expect(updatedRemote.order_data.deliveryStatus).toBeUndefined();
    expect(updatedRemote.order_data.deliveryStartedAt).toBeUndefined();
    expect(updatedRemote.order_data.lastSyncEventId).toBeTruthy();

    // Verifica que o cache local de logística também foi reconciliado
    const cachedLogistics = await offlineStorageService.getWorkingSet<any[]>('logistics_orders');
    expect(cachedLogistics?.data?.[0]?.deliveryStatus).toBeUndefined();
  });

  it('preserva eventos da Agenda criados offline durante refresh e os sincroniza ao reconectar', async () => {
    state.connected = false;

    const result = await createCalendarEvent({
      title: 'Reunião Logística Offline',
      description: 'Alinhamento de rota',
      event_date: '2026-10-21',
      start_time: '09:00',
      end_time: '10:00',
    });

    expect(result.success).toBe(true);
    expect(result.data?.id.startsWith('evt_')).toBe(true);
    expect(await getPendingLocalCalendarEvents()).toHaveLength(1);

    // Quando a conexão volta e fetchCalendarEvents é chamado, o evento local é enviado ao Supabase e não é perdido
    state.connected = true;
    const eventsAfterReconnect = await fetchCalendarEvents();

    expect(state.calendarInserted).toHaveLength(1);
    expect(state.calendarInserted[0].title).toBe('Reunião Logística Offline');
    expect(await getPendingLocalCalendarEvents()).toHaveLength(0);
    expect(eventsAfterReconnect.some((e) => e.title === 'Reunião Logística Offline')).toBe(true);
  });

  it('sincroniza submissões de inventário congeladas no outbox local ao reconectar e permite consulta/exclusão offline', async () => {
    const auditId = 'audit-offline-1';
    state.connected = false;

    await saveLocalInventoryDraft({
      id: auditId,
      code: 'INV-OFF-01',
      name: 'Inventário Galpão Offline',
      hasStages: false,
      scopeType: 'full',
      status: 'pending_sync',
      items: [
        {
          id: 'item-1',
          key: 'p1-main',
          productId: 'p1',
          name: 'Cadeira',
          supplierNames: 'Fornecedor A',
          assignedSupplier: 'Fornecedor A',
          systemStock: 5,
          physicalCount: 4,
          unit: 'UN',
          sku: 'CAD-01',
        },
      ],
    });

    await freezeInventorySubmission({
      contractVersion: 2,
      auditId,
      code: 'INV-OFF-01',
      observation: {
        inventoryAudit: true,
        inventoryCode: 'INV-OFF-01',
        name: 'Inventário Galpão Offline',
        items: [{ productId: 'p1', physicalCount: 4 }],
      },
      items: [{ product_id: 'p1', diff_qty: -1 }],
      responsibleName: 'Estoquista',
    });

    // Consulta de detalhes (usada no modal de visualização e em Duplicar Inventário) funciona offline
    const detailsOffline = await fetchInventorySessionDetails(auditId);
    expect(detailsOffline.inventoryCode).toBe('INV-OFF-01');
    expect(detailsOffline.items).toHaveLength(1);

    // Reconecta e sincroniza via syncPendingInventorySubmissions
    state.connected = true;
    state.rpcError = null;
    const syncedCount = await syncPendingInventorySubmissions();
    expect(syncedCount).toBe(1);

    // Rascunho e outbox devem ter sido limpos após confirmação
    expect(await getLocalInventoryDraft(auditId)).toBeNull();
    expect(await getInventorySubmission(auditId)).toBeNull();

    // Testa exclusão offline de um rascunho local
    state.connected = false;
    await saveLocalInventoryDraft({
      id: 'audit-delete-offline',
      code: 'INV-DEL-01',
      name: 'Rascunho Descartado Offline',
      hasStages: false,
      items: [],
    });
    await deleteInventoryDraft('audit-delete-offline');
    expect(await getLocalInventoryDraft('audit-delete-offline')).toBeNull();
  });

  it('restaura o perfil aprovado em cache quando o app abre offline sem rebaixar para pending', async () => {
    const sessionUser = {
      id: 'user-offline-1',
      email: 'driver@morantehub.test',
      user_metadata: { full_name: 'Motorista' },
    };

    // 1. Primeiro acesso online salva o perfil no cache local
    state.connected = true;
    const onlineProfile = await resolveMobileUserProfile({ user: sessionUser });
    expect(onlineProfile.role).toBe('driver');

    // 2. Segundo acesso offline restaura do cache sem retornar 'pending'
    state.connected = false;
    const offlineProfile = await resolveMobileUserProfile({ user: sessionUser });
    expect(offlineProfile.role).toBe('driver');
    expect(offlineProfile.roles).toContain('driver');
  });
});
