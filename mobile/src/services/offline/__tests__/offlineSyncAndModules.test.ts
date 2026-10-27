import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Alert: { alert: vi.fn() },
  Platform: { OS: 'web' },
}));

const uploadDeliveryProofMock = vi.hoisted(() =>
  vi.fn(async () => 'https://storage.test/delivery-proofs/proof.png')
);

vi.mock('../../../features/orders/services/deliveryProofUploadService', () => ({
  uploadDeliveryProof: uploadDeliveryProofMock,
}));

const state = vi.hoisted(() => ({
  connected: false,
  activeSessionUserId: 'user-driver-1' as string | null,
  rpcError: null as any,
  rpcData: null as any,
  ordersById: {} as Record<string, any>,
  receiptsById: {} as Record<string, any>,
  calendarInserted: [] as any[],
  calendarRemoteRows: [] as any[],
  deletedRemoteInventoryIds: [] as string[],
  failNextOrderUpdate: false,
  failAfterOrderCommit: false,
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
    auth: {
      getSession: vi.fn(async () => ({
        data: {
          session: state.activeSessionUserId
            ? { user: { id: state.activeSessionUserId } }
            : null,
        },
      })),
    },
    rpc: vi.fn(async (fnName: string, args: any) => {
      if (state.rpcError) {
        return { data: null, error: state.rpcError };
      }
      if (fnName === 'claim_inventory_audit_submission') {
        return {
          data: { auditId: args.p_audit_id, status: 'claimed' },
          error: null,
        };
      }
      if (fnName === 'sync_entity_operation') {
        const orderId = args.p_entity_id;
        const current = state.ordersById[orderId] || {
          id: orderId,
          status: 'scheduled',
          version: 1,
          order_data: { id: orderId, status: 'scheduled' },
        };
        const currentVersion = Number(current.version ?? current.order_data?.syncVersion ?? 1);
        if (Number(args.p_expected_version) !== currentVersion) {
          return {
            data: {
              success: false,
              reason: 'VERSION_CONFLICT',
              server_version: currentVersion,
              server_state: current,
            },
            error: null,
          };
        }
        const patch = args.p_payload?.order_data_patch || args.p_payload || {};
        const mergedData = { ...current.order_data, ...patch, syncVersion: currentVersion + 1 };
        for (const [key, value] of Object.entries(patch)) {
          if (value === null) delete mergedData[key];
        }
        const updated = {
          ...current,
          version: currentVersion + 1,
          status: typeof patch.status === 'string' ? patch.status : current.status,
          delivery_status: mergedData.deliveryStatus ?? null,
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
          data: state.rpcData || { status: 'processed', auditId: args.p_audit_id },
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
          maybeSingle: vi.fn(async () => {
            const order = state.ordersById[targetId];
            return {
              data: order
                ? { id: order.id, status: order.status, order_data: order.order_data }
                : null,
              error: null,
            };
          }),
          update: vi.fn((patch: any) => ({
            eq: vi.fn(async (_col: string, val: string) => {
              if (state.failNextOrderUpdate) {
                state.failNextOrderUpdate = false;
                return { error: new Error('Network connection lost mid-flight') };
              }
              if (!state.connected) {
                return { error: new Error('Offline') };
              }
              state.ordersById[val] = {
                ...(state.ordersById[val] || { id: val }),
                ...patch,
              };
              if (state.failAfterOrderCommit) {
                state.failAfterOrderCommit = false;
                return { error: new Error('Connection lost after server commit') };
              }
              return { error: null };
            }),
          })),
        };
        return query;
      }

      if (table === 'goods_receipts') {
        let targetReceiptId = '';
        const query: any = {
          select: vi.fn(() => query),
          order: vi.fn(() => query),
          range: vi.fn(async () => {
            if (!state.connected) {
              return { data: null, error: new Error('Offline') };
            }
            return { data: Object.values(state.receiptsById), error: null };
          }),
          eq: vi.fn((col: string, val: string) => {
            if (col === 'id') targetReceiptId = val;
            return query;
          }),
          maybeSingle: vi.fn(async () => ({
            data: state.receiptsById[targetReceiptId] || null,
            error: null,
          })),
          update: vi.fn((patch: any) => ({
            eq: vi.fn(async (_col: string, val: string) => {
              if (!state.connected) {
                return { error: new Error('Offline') };
              }
              state.receiptsById[val] = {
                ...(state.receiptsById[val] || { id: val }),
                ...patch,
              };
              return { error: null };
            }),
          })),
        };
        return query;
      }

      if (table === 'calendar_events') {
        const upsertOrInsert = async (rows: any[]) => {
          if (!state.connected) {
            return { error: { message: 'Network request failed' } };
          }
          for (const row of rows) {
            const existingIdx = state.calendarRemoteRows.findIndex((r) => r.id === row.id);
            if (existingIdx >= 0) {
              state.calendarRemoteRows[existingIdx] = row;
            } else {
              state.calendarInserted.push(row);
              state.calendarRemoteRows.push(row);
            }
          }
          return { data: rows, error: null };
        };
        const query: any = {
          select: vi.fn(() => query),
          order: vi.fn(async () => {
            if (!state.connected) {
              throw new Error('Network request failed');
            }
            return { data: state.calendarRemoteRows, error: null };
          }),
          insert: vi.fn(upsertOrInsert),
          upsert: vi.fn(upsertOrInsert),
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
          ilike: vi.fn(() => query),
          order: vi.fn(() => query),
          range: vi.fn(async () =>
            state.connected
              ? { data: [], error: null }
              : { data: null, error: new Error('Offline') }
          ),
          gte: vi.fn(() => query),
          lte: vi.fn(() => query),
          in: vi.fn(() => query),
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
import { getSQLiteDatabase } from '../../sqlite/database';
import { OrderRepository } from '../../../repositories/OrderRepository';
import { SyncQueueRepository } from '../../../repositories/SyncQueueRepository';
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
import { saveLocalInventoryCatalogSnapshot } from '../../sqlite/inventoryCatalog';
import { clearOfflineInventoryCatalogCache } from '../../../features/stock/inventory/services/offlineInventoryCatalog';
import { syncPendingInventorySubmissions } from '../../../features/stock/inventory/services/inventoryFinalizer';
import {
  deleteInventoryDraft,
  fetchInventorySessions,
  fetchInventorySessionDetails,
} from '../../stock/stockInventoryService';
import {
  INVENTORY_SESSION_DETAILS_CACHE_KEY,
  INVENTORY_SESSIONS_CACHE_KEY,
} from '../../stock/inventory/inventorySessionQueryService';
import {
  completeGoodsReceiptCheck,
  fetchReceipts,
  getGoodsReceiptCheckDraft,
  getPendingGoodsReceiptChecks,
  saveGoodsReceiptCheckDraft,
  syncPendingGoodsReceipts,
  GOODS_RECEIPTS_CACHE_KEY,
  GOODS_RECEIPTS_PENDING_SYNC_KEY,
} from '../../stock/stockReceiptsService';
import { resolveMobileUserProfile } from '../../mobileAuthProfile';
import { deliveryFlowService } from '../../../features/orders/services/deliveryFlowService';
import { resolveDeliveryStep } from '../../../features/orders/screens/delivery-preparation/deliveryFlowStepRules';
import { buildDeliveryRouteItems } from '../../../features/logistics/domain/deliveryRouteBuilder';

describe('Auditoria Offline End-to-End (7 Pontos Críticos: Operação, Sincronização, Reconciliação e Segurança)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    state.connected = false;
    state.activeSessionUserId = 'user-driver-1';
    offlineSyncManager.setCurrentUserId('user-driver-1');
    state.rpcError = null;
    state.rpcData = null;
    state.ordersById = {};
    state.receiptsById = {};
    state.calendarInserted = [];
    state.calendarRemoteRows = [];
    state.deletedRemoteInventoryIds = [];
    state.failNextOrderUpdate = false;
    state.failAfterOrderCommit = false;
    await OrderRepository.init();
    const db = await getSQLiteDatabase();
    await db.runAsync('DELETE FROM sync_queue');
    await db.runAsync('DELETE FROM orders_local');
    await clearAllLocalInventoryDrafts();
    await db.runAsync('DELETE FROM inventory_outbox_local');
    await offlineStorageService.cacheWorkingSet('schedule_calendar_events_pending_v1', []);
    await offlineStorageService.cacheWorkingSet('schedule_calendar_events_v1', []);
    await offlineStorageService.cacheWorkingSet(GOODS_RECEIPTS_PENDING_SYNC_KEY, []);
    await offlineStorageService.cacheWorkingSet(GOODS_RECEIPTS_CACHE_KEY, []);
    clearOfflineInventoryCatalogCache();
  });

  it('1 & 2. Reconcilia conflito de versão concorrente (VERSION_CONFLICT) e garante idempotência após falha de rede no meio do envio', async () => {
    const orderId = 'order-conflict-1';
    // Dispositivo A tem versão 1 localmente
    await OrderRepository.saveLocal({
      id: orderId,
      status: 'scheduled',
      orderData: { id: orderId, status: 'scheduled', deliveryStatus: 'in_progress' },
      version: 1,
      updatedAt: '2026-10-20T08:00:00.000Z',
      isPendingLocal: true,
    });

    // Enquanto Dispositivo A está offline, overlayPendingLocalOrders preserva o estado otimista local
    const staleRemoteList = [
      { id: orderId, status: 'scheduled', order_data: { id: orderId, status: 'scheduled' } },
    ];
    const overlaidBeforeSync = await OrderRepository.overlayPendingLocalOrders(staleRemoteList);
    expect(overlaidBeforeSync[0].order_data.deliveryStatus).toBe('in_progress');

    // Dispositivo B já atualizou o mesmo pedido no servidor para syncVersion = 3 ('completed')
    state.ordersById[orderId] = {
      id: orderId,
      status: 'fulfilled',
      version: 3,
      order_data: {
        id: orderId,
        status: 'fulfilled',
        deliveryStatus: 'completed',
        syncVersion: 3,
      },
    };
    await offlineStorageService.cacheWorkingSet('logistics_orders', staleRemoteList);

    const evt = await offlineSyncManager.recordEvent(
      'DELIVERY_ARRIVE_DESTINATION',
      'order',
      orderId,
      { occurredAt: '2026-10-20T08:30:00.000Z' }
    );

    state.rpcError = { code: 'PGRST202', message: 'Could not find function sync_entity_operation' };
    state.connected = true;

    await offlineSyncManager.processQueue();

    // Deve identificar VERSION_CONFLICT e reconciliar o estado local com o server_state (completed / fulfilled)
    const summary = await offlineSyncManager.getSummary();
    expect(summary.conflictCount).toBeGreaterThanOrEqual(1);

    const reconciledLocal = await OrderRepository.getById(orderId);
    expect(reconciledLocal?.status).toBe('fulfilled');
    expect(reconciledLocal?.orderData.deliveryStatus).toBe('completed');
    expect(reconciledLocal?.isPendingLocal).toBe(false);

    const reconciledCache = await offlineStorageService.getWorkingSet<any[]>('logistics_orders');
    expect(reconciledCache?.data?.[0]?.status).toBe('fulfilled');
    expect(reconciledCache?.data?.[0]?.deliveryStatus).toBe('completed');
    expect(evt.eventId).toBeTruthy();
  });

  it('2 & 3. Tolera queda de conexão durante o envio (retry) e não duplica quando o servidor já processou o mesmo idempotencyKey', async () => {
    const orderId = 'order-unstable-net';
    state.ordersById[orderId] = {
      id: orderId,
      status: 'scheduled',
      version: 1,
      order_data: {
        id: orderId,
        status: 'scheduled',
        deliveryStatus: 'in_progress',
        deliveryStartedAt: '2026-10-20T08:00:00.000Z',
      },
    };

    await OrderRepository.saveLocal({
      id: orderId,
      status: 'scheduled',
      orderData: state.ordersById[orderId].order_data,
      version: 1,
      updatedAt: '2026-10-20T08:00:00.000Z',
      isPendingLocal: true,
    });

    const arrivalEvent = await offlineSyncManager.recordEvent(
      'DELIVERY_ARRIVE_DESTINATION',
      'order',
      orderId,
      { deliveryStatus: 'arrived', deliveryArrivedAt: '2026-10-20T08:30:00.000Z' }
    );
    const serviceEvent = await offlineSyncManager.recordEvent(
      'DELIVERY_START_SERVICE',
      'order',
      orderId,
      { deliveryStatus: 'in_service', deliveryServiceStartedAt: '2026-10-20T08:35:00.000Z' }
    );

    state.rpcError = { code: 'PGRST202', message: 'Missing RPC' };
    state.failAfterOrderCommit = true; // A gravação chega ao servidor, mas a resposta se perde.
    state.connected = true;

    await offlineSyncManager.processQueue();

    // A primeira etapa foi aplicada remotamente, mas a fila ainda precisa recuperá-la por idempotência.
    const activeAfterFailure = await SyncQueueRepository.listActive();
    const failedItem = activeAfterFailure.find((i) => i.entityId === orderId);
    expect(failedItem?.status).toBe('failed');
    expect(failedItem?.retryCount).toBe(1);
    expect(activeAfterFailure.find((i) => i.id !== failedItem?.id)?.expectedVersion).toBe(1);
    expect(state.ordersById[orderId].order_data.syncVersion).toBe(2);
    expect(state.ordersById[orderId].order_data.lastSyncEventId).toBe(arrivalEvent.eventId);

    // A repetição reconhece o primeiro commit, avança a versão do segundo evento e conclui a cadeia.
    await offlineSyncManager.processQueue();
    const activeAfterRecovery = await SyncQueueRepository.listActive();
    expect(activeAfterRecovery.find((i) => i.entityId === orderId)).toBeUndefined();
    expect(state.ordersById[orderId].order_data.deliveryStatus).toBe('in_service');
    expect(state.ordersById[orderId].order_data.syncVersion).toBe(3);
    expect(state.ordersById[orderId].order_data.lastSyncEventId).toBe(serviceEvent.eventId);
  });

  it('4. Agenda: preserva eventos criados offline com UUID idempotente e precedência sobre leitura remota', async () => {
    // 1. Carrega evento remoto existente enquanto online
    state.connected = true;
    state.calendarRemoteRows = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        title: 'Vistoria Pré-existente',
        date: '2026-10-20',
        created_at: '2026-10-19T10:00:00.000Z',
      },
    ];
    const initialEvents = await fetchCalendarEvents();
    expect(initialEvents).toHaveLength(1);

    // 2. Entra em modo avião e cria novo compromisso
    state.connected = false;
    const createdOffline = await createCalendarEvent({
      title: 'Reunião Criada em Modo Avião',
      date: '2026-10-21',
      time_or_period: 'Manhã (08:00 - 12:00)',
      type: 'REUNION',
    });

    expect(createdOffline.success).toBe(true);
    // Verifica que o ID gerado é um UUID v4 válido para idempotência no PostgreSQL
    expect(createdOffline.data?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );

    // Consulta offline retorna tanto o evento previamente carregado quanto o criado offline
    const offlineList = await fetchCalendarEvents();
    expect(offlineList).toHaveLength(2);
    expect(offlineList.map((e) => e.title)).toContain('Vistoria Pré-existente');
    expect(offlineList.map((e) => e.title)).toContain('Reunião Criada em Modo Avião');

    // 3. Restaura conexão e sincroniza sem duplicar mesmo se chamado duas vezes
    state.connected = true;
    const syncedList = await fetchCalendarEvents();
    await fetchCalendarEvents();

    expect(state.calendarInserted).toHaveLength(1);
    expect(await getPendingLocalCalendarEvents()).toHaveLength(0);
    expect(syncedList).toHaveLength(2);
  });

  it('5. Inventário: bloqueia sincronização automática caso uma variação tenha sido mesclada concorrentemente e sincroniza quando íntegro', async () => {
    const conflictAuditId = 'audit-conflict-var';
    state.connected = false;

    // Catálogo atualizado indica que a variação 'var-merged' foi mesclada em 'var-target'
    await saveLocalInventoryCatalogSnapshot({
      products: { 'prod-1': { id: 'prod-1', name: 'Poltrona', active: true } },
      variations: {
        'var-merged': {
          id: 'var-merged',
          product_id: 'prod-1',
          name: 'Poltrona Azul',
          active: true,
          merged_to_variation_id: 'var-target',
        },
      },
      labels: {},
      suppliers: {},
      cursors: {},
      syncedAt: '2026-10-20T09:00:00.000Z',
    });
    clearOfflineInventoryCatalogCache();

    await saveLocalInventoryDraft({
      id: conflictAuditId,
      userId: 'user-driver-1',
      code: 'INV-CONF-01',
      name: 'Inventário com Variação Mesclada',
      hasStages: false,
      status: 'pending_sync',
      items: [],
    });

    await freezeInventorySubmission({
      contractVersion: 2,
      auditId: conflictAuditId,
      code: 'INV-CONF-01',
      observation: {
        inventoryAudit: true,
        inventoryCode: 'INV-CONF-01',
        items: [
          {
            productId: 'prod-1',
            variationId: 'var-merged',
            name: 'Poltrona Azul',
            physicalCount: 3,
          },
        ],
      },
      items: [{ productId: 'prod-1', variationId: 'var-merged', physicalCount: 3 }],
      responsibleName: 'Estoquista',
      userId: 'user-driver-1',
    });

    // Reconecta: o sincronizador deve detectar o conflito de variação mesclada e preservar o rascunho/outbox
    state.connected = true;
    const syncedConflictCount = await syncPendingInventorySubmissions('user-driver-1');
    expect(syncedConflictCount).toBe(0);
    expect(await getInventorySubmission(conflictAuditId, 'user-driver-1')).not.toBeNull();
    await deleteInventoryDraft(conflictAuditId, 'user-driver-1');

    // Agora testa submissão íntegra sem conflitos
    const validAuditId = 'audit-valid-1';
    state.connected = false;
    await saveLocalInventoryDraft({
      id: validAuditId,
      userId: 'user-driver-1',
      code: 'INV-OK-01',
      name: 'Inventário Galpão Íntegro',
      hasStages: false,
      status: 'pending_sync',
      items: [],
    });
    await freezeInventorySubmission({
      contractVersion: 2,
      auditId: validAuditId,
      code: 'INV-OK-01',
      observation: {
        inventoryAudit: true,
        inventoryCode: 'INV-OK-01',
        items: [{ productId: 'prod-1', name: 'Poltrona', physicalCount: 5 }],
      },
      items: [{ productId: 'prod-1', physicalCount: 5 }],
      responsibleName: 'Estoquista',
      userId: 'user-driver-1',
    });

    const detailsOffline = await fetchInventorySessionDetails(validAuditId, 'user-driver-1');
    expect(detailsOffline.inventoryCode).toBe('INV-OK-01');

    state.connected = true;
    expect(await syncPendingInventorySubmissions('user-driver-1')).toBe(1);
    expect(await getLocalInventoryDraft(validAuditId, 'user-driver-1')).toBeNull();
    expect(await getInventorySubmission(validAuditId, 'user-driver-1')).toBeNull();
  });

  it('6. Recebimentos: salva rascunho de conferência de volumes, conclui offline, sincroniza ao reconectar e respeita estorno no servidor', async () => {
    const receiptId = 'rec-offline-1';
    const reversedReceiptId = 'rec-reversed-2';

    state.receiptsById[receiptId] = {
      id: receiptId,
      receipt_index: 42,
      supplier_name: 'Moveleira Sul',
      status: 'draft',
      is_draft: true,
      total_value: 3200,
      received_at: '2026-10-20T08:00:00.000Z',
      goods_receipt_items: [{ id: 'ri-1', description: 'Mesa Jantar', quantity: 4 }],
    };
    state.receiptsById[reversedReceiptId] = {
      id: reversedReceiptId,
      receipt_index: 43,
      supplier_name: 'Fornecedor Estornado',
      status: 'estornado',
      is_draft: false,
      total_value: 1000,
      received_at: '2026-10-20T08:00:00.000Z',
      goods_receipt_items: [],
    };

    // 1. Carrega lista online e preenche o cache
    state.connected = true;
    const onlineReceipts = await fetchReceipts(0);
    await offlineStorageService.cacheWorkingSet(GOODS_RECEIPTS_CACHE_KEY, onlineReceipts);

    // 2. Entra em modo avião, salva progresso parcial de volumes e depois conclui conferência
    state.connected = false;
    await saveGoodsReceiptCheckDraft(receiptId, { checkedVolumes: 2, totalVolumes: 4 });
    expect((await getGoodsReceiptCheckDraft(receiptId))?.checkedVolumes).toBe(2);

    const completion = await completeGoodsReceiptCheck({
      receiptId,
      checkedVolumes: 4,
      totalVolumes: 4,
      observation: 'Conferido 100% no pátio offline',
      userId: 'user-driver-1',
    });
    expect(completion.success).toBe(true);
    expect(completion.syncedRemotely).toBe(false);

    // Tenta concluir também um recebimento que foi estornado no servidor
    await completeGoodsReceiptCheck({
      receiptId: reversedReceiptId,
      checkedVolumes: 1,
      totalVolumes: 1,
      userId: 'user-driver-1',
    });

    // Verifica que o cache local já reflete status 'received' imediatamente
    const cachedAfterOfflineCheck = await offlineStorageService.getWorkingSet<any[]>(
      GOODS_RECEIPTS_CACHE_KEY
    );
    expect(cachedAfterOfflineCheck?.data?.find((r) => r.id === receiptId)?.status).toBe('received');

    // 3. Reconecta e sincroniza: rec-offline-1 vira 'received' no servidor, mas rec-reversed-2 permanece 'estornado'
    state.connected = true;
    await syncPendingGoodsReceipts('user-driver-1');

    expect(state.receiptsById[receiptId].status).toBe('received');
    expect(state.receiptsById[receiptId].observation).toBe('Conferido 100% no pátio offline');
    expect(state.receiptsById[reversedReceiptId].status).toBe('estornado');
    expect(await getPendingGoodsReceiptChecks()).toHaveLength(0);
  });

  it('7. Segurança Multi-Usuário: impede que operações pendentes do Usuário A sejam sincronizadas na sessão do Usuário B no mesmo aparelho', async () => {
    state.connected = false;
    state.activeSessionUserId = 'user-operator-A';
    offlineSyncManager.setCurrentUserId('user-operator-A');

    // Usuário A realiza operações offline (Entrega, Evento de Agenda, Inventário e Recebimento)
    const orderId = 'order-user-A';
    state.ordersById[orderId] = {
      id: orderId,
      status: 'scheduled',
      version: 1,
      order_data: { id: orderId, status: 'scheduled' },
    };
    await offlineSyncManager.recordEvent(
      'DELIVERY_START_ROUTE',
      'order',
      orderId,
      { deliveryStatus: 'in_progress', deliveryResponsibleName: 'Operador A' }
    );
    await createCalendarEvent({
      title: 'Compromisso Privado Operador A',
      date: '2026-10-22',
      created_by: 'user-operator-A',
    });
    await freezeInventorySubmission({
      contractVersion: 2,
      auditId: 'inv-user-A',
      code: 'INV-A',
      observation: { inventoryAudit: true, responsibleId: 'user-operator-A', items: [] },
      items: [],
      responsibleName: 'Operador A',
      userId: 'user-operator-A',
    });
    await completeGoodsReceiptCheck({
      receiptId: 'rec-user-A',
      checkedVolumes: 3,
      totalVolumes: 3,
      userId: 'user-operator-A',
    });

    // Usuário A faz logout e Usuário B faz login no mesmo aparelho; internet volta
    state.activeSessionUserId = 'user-operator-B';
    state.connected = true;

    // Uma chamada atrasada com o ID antigo não pode sincronizar sob a sessão nova.
    expect(await syncPendingInventorySubmissions('user-operator-A')).toBe(0);
    expect(await getInventorySubmission('inv-user-A', 'user-operator-A')).not.toBeNull();

    offlineSyncManager.setCurrentUserId('user-operator-B');

    await offlineSyncManager.processQueue();

    // NENHUMA operação do Usuário A pode ter sido enviada na sessão do Usuário B
    expect(state.ordersById[orderId].order_data.deliveryStatus).toBeUndefined();
    expect(state.calendarInserted).toHaveLength(0);
    expect(await getInventorySubmission('inv-user-A', 'user-operator-A')).not.toBeNull();
    expect(await getPendingGoodsReceiptChecks()).toHaveLength(1);

    // Quando o Usuário A volta a logar no aparelho, todas as suas operações pendentes são sincronizadas
    state.receiptsById['rec-user-A'] = { id: 'rec-user-A', status: 'draft' };
    state.activeSessionUserId = 'user-operator-A';
    offlineSyncManager.setCurrentUserId('user-operator-A');
    await offlineSyncManager.processQueue();

    expect(state.ordersById[orderId].order_data.deliveryStatus).toBe('in_progress');
    expect(state.calendarInserted).toHaveLength(1);
    expect(await getInventorySubmission('inv-user-A', 'user-operator-A')).toBeNull();
    expect(await getPendingGoodsReceiptChecks()).toHaveLength(0);
  });

  it('isola listas e detalhes de inventários em cache quando outra conta usa o mesmo aparelho', async () => {
    const inventoryId = 'inventory-cache-user-A';
    const cachedDetails = { inventoryAudit: true, inventoryCode: 'INV-A', items: [] };
    const cachedSessions = [{ id: inventoryId, status: 'completed', inventoryCode: 'INV-A' }];
    await offlineStorageService.cacheWorkingSet(
      `${INVENTORY_SESSION_DETAILS_CACHE_KEY}:user-operator-A`,
      { [inventoryId]: cachedDetails }
    );
    await offlineStorageService.cacheWorkingSet(
      `${INVENTORY_SESSIONS_CACHE_KEY}:user-operator-A`,
      cachedSessions
    );

    state.connected = false;
    await expect(fetchInventorySessionDetails(inventoryId, 'user-operator-B')).rejects.toThrow(
      'Não foi possível carregar os detalhes'
    );
    expect(await fetchInventorySessions(0, undefined, undefined, 'user-operator-B')).toEqual([]);
    expect(await fetchInventorySessionDetails(inventoryId, 'user-operator-A')).toEqual(cachedDetails);
    expect(await fetchInventorySessions(0, undefined, undefined, 'user-operator-A')).toEqual(cachedSessions);
  });

  it('restaura o perfil aprovado em cache quando o app abre offline sem rebaixar para pending', async () => {
    const sessionUser = {
      id: 'user-offline-1',
      email: 'driver@morantehub.test',
      user_metadata: { full_name: 'Motorista' },
    };

    state.connected = true;
    const onlineProfile = await resolveMobileUserProfile({ user: sessionUser });
    expect(onlineProfile.role).toBe('driver');

    state.connected = false;
    const offlineProfile = await resolveMobileUserProfile({ user: sessionUser });
    expect(offlineProfile.role).toBe('driver');
    expect(offlineProfile.roles).toContain('driver');
  });

  it('envia a prova local ao reconectar antes de sincronizar a ocorrência da entrega', async () => {
    const orderId = 'order-offline-proof-1';
    const localProof = {
      uri: 'file:///documents/delivery-proofs/proof.png',
      fileName: 'proof.png',
      contentType: 'image/png',
    };
    const remoteProofUrl = 'https://storage.test/delivery-proofs/proof.png';
    const initialOrder = {
      id: orderId,
      status: 'scheduled',
      version: 1,
      order_data: { id: orderId, status: 'scheduled', deliveryStatus: 'arrived' },
    };
    state.ordersById[orderId] = initialOrder;
    await offlineStorageService.cacheWorkingSet('logistics_orders', [initialOrder]);
    state.connected = false;

    await deliveryFlowService.recordUnattended({
      orderId,
      currentData: initialOrder.order_data,
      reason: 'Ninguém Atendeu no Local',
      notes: 'Interfone sem resposta.',
      proofUrls: [localProof.uri],
      proofMetadata: [localProof],
    });

    const queuedBeforeReconnect = await SyncQueueRepository.listActive();
    expect(queuedBeforeReconnect).toHaveLength(1);
    expect(queuedBeforeReconnect[0].payload.order_data_patch.unattendedProofUrls).toEqual([
      localProof.uri,
    ]);

    uploadDeliveryProofMock
      .mockRejectedValueOnce(new Error('Upload temporariamente indisponível'))
      .mockResolvedValueOnce(remoteProofUrl);
    state.connected = true;
    await offlineSyncManager.processQueue();

    const queuedAfterUploadFailure = await SyncQueueRepository.listActive();
    expect(queuedAfterUploadFailure).toHaveLength(1);
    expect(queuedAfterUploadFailure[0].status).toBe('failed');
    expect(queuedAfterUploadFailure[0].retryCount).toBe(1);
    expect(queuedAfterUploadFailure[0].payload.order_data_patch.unattendedProofUrls).toEqual([
      localProof.uri,
    ]);

    await offlineSyncManager.processQueue();

    expect(uploadDeliveryProofMock).toHaveBeenNthCalledWith(
      2,
      localProof.uri,
      expect.stringContaining('proof.png'),
      localProof.contentType
    );
    expect(state.ordersById[orderId].order_data.unattendedProofUrls).toEqual([remoteProofUrl]);
    expect(state.ordersById[orderId].order_data.unattendedProofUrl).toBe(remoteProofUrl);
    expect(JSON.stringify(state.ordersById[orderId].order_data)).not.toContain('file://');
  });

  it('rebaseia etapas offline sequenciais quando o RPC exige a versão esperada', async () => {
    const orderId = 'order-offline-rpc-sequence-1';
    const initialOrder = {
      id: orderId,
      status: 'scheduled',
      version: 1,
      order_data: { id: orderId, status: 'scheduled', deliveryStatus: 'in_progress' },
    };
    state.ordersById[orderId] = initialOrder;
    await OrderRepository.saveLocal({
      id: orderId,
      status: 'scheduled',
      orderData: initialOrder.order_data,
      version: 1,
      updatedAt: '2026-10-20T08:00:00.000Z',
      isPendingLocal: true,
    });
    state.connected = false;

    await offlineSyncManager.recordEvent('DELIVERY_ARRIVE_DESTINATION', 'order', orderId, {
      deliveryStatus: 'arrived',
      deliveryArrivedAt: '2026-10-20T08:30:00.000Z',
    });
    await offlineSyncManager.recordEvent('DELIVERY_START_SERVICE', 'order', orderId, {
      deliveryStatus: 'in_service',
      deliveryServiceStartedAt: '2026-10-20T08:35:00.000Z',
    });

    expect((await SyncQueueRepository.listActive()).map((item) => item.expectedVersion)).toEqual([
      1, 1,
    ]);
    state.connected = true;
    await offlineSyncManager.processQueue();

    expect((await offlineSyncManager.getSummary()).conflictCount).toBe(0);
    expect(state.ordersById[orderId].version).toBe(3);
    expect(state.ordersById[orderId].order_data.deliveryStatus).toBe('in_service');
    expect((await SyncQueueRepository.listActive())).toHaveLength(0);
  });

  it('8. Fluxo Completo de Entrega (4 Etapas + Retrocesso + Cancelamento) Online e Offline com reconciliação no Roteiro', async () => {
    const todayStr = '2026-10-20';
    const orderId = 'order-e2e-flow-1';
    const initialOrder = {
      id: orderId,
      status: 'scheduled',
      version: 1,
      order_data: {
        id: orderId,
        orderIndex: '000777',
        status: 'scheduled',
        customerData: { fullName: 'Maria E2E', phone: '41999990000' },
        paymentsSummary: { totalOrderValue: 450 },
        shipping: {
          deliveryMethod: 'delivery',
          scheduling: { date: todayStr, startTime: '08:00', endTime: '12:00' },
          deliveryAddress: { street: 'Rua E2E', number: '100', city: 'Curitiba' },
        },
        items: [{ id: 'it-1', name: 'Sofá Retrátil', quantity: 1 }],
      },
    };
    state.ordersById[orderId] = initialOrder;
    await offlineStorageService.cacheWorkingSet('logistics_orders', [initialOrder]);

    // Simular uso de fallback direto de pedidos no sync (sem RPC customizada)
    state.rpcError = { code: 'PGRST202', message: 'Could not find the function sync_entity_operation' };
    state.connected = false;
    state.activeSessionUserId = 'user-driver-1';
    offlineSyncManager.setCurrentUserId('user-driver-1');

    // Etapa 1: Preparar Saída
    expect(resolveDeliveryStep(initialOrder.order_data).currentStep).toBe(1);

    // Etapa 1 -> Etapa 2 (Em Rota) OFFLINE
    const step2 = await deliveryFlowService.startRoute({
      orderId,
      currentData: initialOrder.order_data,
      checklist: [{ id: 'chk-1', checked: true }],
      responsibles: [{ id: 'user-driver-1', name: 'Carlos Motorista' }],
      userProfileId: 'user-driver-1',
    });
    expect(resolveDeliveryStep(step2.updatedData).currentStep).toBe(2);
    expect(resolveDeliveryStep(step2.updatedData).headerTitle).toBe('Em Rota');

    // Etapa 2 -> Etapa 3 (Chegada no Local) OFFLINE
    const step3 = await deliveryFlowService.arriveAtDestination({
      orderId,
      currentData: step2.updatedData,
    });
    expect(resolveDeliveryStep(step3.updatedData).currentStep).toBe(3);
    expect(resolveDeliveryStep(step3.updatedData).headerTitle).toBe('Chegada no Local');
    expect(resolveDeliveryStep(step3.updatedData).isInArrival).toBe(true);

    // Verificar que buildDeliveryRouteItems reconhece Etapa 3 ('arrived') como isCurrent = true
    const cachedMidFlow = await offlineStorageService.getWorkingSet<any[]>('logistics_orders');
    const routeMidFlow = buildDeliveryRouteItems(cachedMidFlow?.data || [], 'today', todayStr);
    expect(routeMidFlow).toHaveLength(1);
    expect(routeMidFlow[0].status).toBe('arrived');
    expect(routeMidFlow[0].isCurrent).toBe(true);

    // Etapa 3 -> Etapa 4 (Em Atendimento) OFFLINE
    const step4 = await deliveryFlowService.startService({
      orderId,
      currentData: step3.updatedData,
    });
    expect(resolveDeliveryStep(step4.updatedData).currentStep).toBe(4);
    expect(resolveDeliveryStep(step4.updatedData).headerTitle).toBe('Em Atendimento');
    expect(resolveDeliveryStep(step4.updatedData).isInService).toBe(true);

    // Retroceder Etapa 4 -> Etapa 3 (stepBackToArrival) OFFLINE e sincronizar
    const backTo3 = await deliveryFlowService.stepBackToArrival(orderId, step4.updatedData);
    expect(resolveDeliveryStep(backTo3.updatedData).currentStep).toBe(3);
    expect(backTo3.updatedData.deliveryServiceStartedAt).toBeUndefined();

    expect(state.ordersById[orderId].order_data.deliveryStatus).toBeUndefined();
    const queuedOfflineEvents = await SyncQueueRepository.listActive();
    expect(queuedOfflineEvents.map((item) => item.payload.event_type)).toEqual([
      'DELIVERY_START_ROUTE',
      'DELIVERY_ARRIVE_DESTINATION',
      'DELIVERY_START_SERVICE',
      'DELIVERY_STEP_BACK',
    ]);
    expect(queuedOfflineEvents.map((item) => item.expectedVersion)).toEqual([1, 1, 1, 1]);

    // Conectar e sincronizar fila até aqui: o servidor deve limpar deliveryServiceStartedAt e ficar na Etapa 3
    state.connected = true;
    await offlineSyncManager.processQueue();
    expect((await offlineSyncManager.getSummary()).conflictCount).toBe(0);
    expect(state.ordersById[orderId].order_data.deliveryStatus).toBe('arrived');
    expect(state.ordersById[orderId].order_data.deliveryServiceStartedAt).toBeUndefined();
    expect(resolveDeliveryStep(state.ordersById[orderId].order_data).currentStep).toBe(3);

    // Avançar novamente Etapa 3 -> Etapa 4 e Finalizar Entrega (ONLINE)
    const step4Online = await deliveryFlowService.startService({
      orderId,
      currentData: state.ordersById[orderId].order_data,
    });
    const finished = await deliveryFlowService.finishDelivery({
      orderId,
      currentData: step4Online.updatedData,
      payments: [{ method: 'Pix', amount: 450, status: 'Pago' }],
    });
    await offlineSyncManager.processQueue();

    expect(finished.updatedData.status).toBe('fulfilled');
    expect(finished.updatedData.deliveryStatus).toBe('completed');
    expect(state.ordersById[orderId].status).toBe('fulfilled');
    expect(state.ordersById[orderId].delivery_status).toBe('completed');

    const cachedFinal = await offlineStorageService.getWorkingSet<any[]>('logistics_orders');
    const routeFinal = buildDeliveryRouteItems(cachedFinal?.data || [], 'today', todayStr);
    expect(routeFinal[0].status).toBe('completed');
    expect(routeFinal[0].isCurrent).toBe(false);
  });
});
