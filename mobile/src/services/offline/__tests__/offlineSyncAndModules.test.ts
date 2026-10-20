import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Alert: { alert: vi.fn() },
  Platform: { OS: 'web' },
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
      if (fnName === 'sync_entity_operation') {
        const orderId = args.p_entity_id;
        const current = state.ordersById[orderId] || {
          id: orderId,
          status: 'scheduled',
          version: 1,
          order_data: { id: orderId, status: 'scheduled' },
        };
        const patch = args.p_payload?.order_data_patch || args.p_payload || {};
        const mergedData = { ...current.order_data, ...patch };
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
          maybeSingle: vi.fn(async () => ({
            data: state.ordersById[targetId] || null,
            error: null,
          })),
          update: vi.fn((patch: any) => ({
            eq: vi.fn(async (_col: string, val: string) => {
              if (state.failNextOrderUpdate) {
                state.failNextOrderUpdate = false;
                return { error: new Error('Network connection lost mid-flight') };
              }
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
  deleteInventorySubmission,
} from '../../sqlite/inventoryOutbox';
import { saveLocalInventoryCatalogSnapshot } from '../../sqlite/inventoryCatalog';
import { clearOfflineInventoryCatalogCache } from '../../../features/stock/inventory/services/offlineInventoryCatalog';
import { syncPendingInventorySubmissions } from '../../../features/stock/inventory/services/inventoryFinalizer';
import {
  deleteInventoryDraft,
  fetchInventorySessionDetails,
} from '../../stock/stockInventoryService';
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
    await OrderRepository.init();
    await clearAllLocalInventoryDrafts();
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

    await offlineSyncManager.recordEvent(
      'DELIVERY_STEP_BACK',
      'order',
      orderId,
      { targetStep: 'preparation' }
    );

    state.rpcError = { code: 'PGRST202', message: 'Missing RPC' };
    state.failNextOrderUpdate = true; // Simula queda de rede no meio do UPDATE
    state.connected = true;

    await offlineSyncManager.processQueue();

    // Deve continuar na fila ativa com status 'failed' e retryCount = 1
    const activeAfterFailure = await SyncQueueRepository.listActive();
    const failedItem = activeAfterFailure.find((i) => i.entityId === orderId);
    expect(failedItem?.status).toBe('failed');
    expect(failedItem?.retryCount).toBe(1);

    // Na reconexão seguinte, envia e confirma sem duplicar
    await offlineSyncManager.processQueue();
    const activeAfterRecovery = await SyncQueueRepository.listActive();
    expect(activeAfterRecovery.find((i) => i.entityId === orderId)).toBeUndefined();
    expect(state.ordersById[orderId].order_data.deliveryStatus).toBeUndefined();
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
    expect(await getInventorySubmission(conflictAuditId)).not.toBeNull();
    await deleteInventoryDraft(conflictAuditId);

    // Agora testa submissão íntegra sem conflitos
    const validAuditId = 'audit-valid-1';
    state.connected = false;
    await saveLocalInventoryDraft({
      id: validAuditId,
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

    const detailsOffline = await fetchInventorySessionDetails(validAuditId);
    expect(detailsOffline.inventoryCode).toBe('INV-OK-01');

    state.connected = true;
    expect(await syncPendingInventorySubmissions('user-driver-1')).toBe(1);
    expect(await getLocalInventoryDraft(validAuditId)).toBeNull();
    expect(await getInventorySubmission(validAuditId)).toBeNull();
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
    offlineSyncManager.setCurrentUserId('user-operator-B');
    state.connected = true;

    await offlineSyncManager.processQueue();

    // NENHUMA operação do Usuário A pode ter sido enviada na sessão do Usuário B
    expect(state.ordersById[orderId].order_data.deliveryStatus).toBeUndefined();
    expect(state.calendarInserted).toHaveLength(0);
    expect(await getInventorySubmission('inv-user-A')).not.toBeNull();
    expect(await getPendingGoodsReceiptChecks()).toHaveLength(1);

    // Quando o Usuário A volta a logar no aparelho, todas as suas operações pendentes são sincronizadas
    state.receiptsById['rec-user-A'] = { id: 'rec-user-A', status: 'draft' };
    state.activeSessionUserId = 'user-operator-A';
    offlineSyncManager.setCurrentUserId('user-operator-A');
    await offlineSyncManager.processQueue();

    expect(state.ordersById[orderId].order_data.deliveryStatus).toBe('in_progress');
    expect(state.calendarInserted).toHaveLength(1);
    expect(await getInventorySubmission('inv-user-A')).toBeNull();
    expect(await getPendingGoodsReceiptChecks()).toHaveLength(0);
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
});
