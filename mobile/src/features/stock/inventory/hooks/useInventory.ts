import { useState, useCallback, useEffect, useRef } from 'react';
import { InventorySession } from '../../types/stock.types';
import * as stockService from '../../../../services/stockService';
import {
  listLocalInventoryDrafts,
  saveLocalInventoryDraft,
} from '../../../../services/sqlite/inventoryDrafts';
import { connectivityService } from '../../../../services/offline/connectivityService';
import { syncPendingInventorySubmissions } from '../services/inventoryFinalizer';
import { sumInventoryCountedQuantities } from '../../../../../../shared-utils/inventorySupplierStages';

export const useInventory = (userProfileId?: string | null) => {
  const [sessions, setSessions] = useState<InventorySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isOnline, setIsOnline] = useState(() => connectivityService.connected);
  const [usesCachedResults, setUsesCachedResults] = useState(false);
  const periodDaysRef = useRef(30);

  const loadSessions = useCallback(async (
    isRefresh = false,
    pageNum = 0,
    selectedPeriodDays = periodDaysRef.current,
    shouldSyncPendingSubmissions = true
  ) => {
    if (isRefresh) {
      setPage(0);
      setHasMore(true);
    } else if (pageNum > 0) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    // 0. Se estiver online, sincroniza automaticamente submissões congeladas na outbox local
    if (
      shouldSyncPendingSubmissions &&
      pageNum === 0 &&
      connectivityService.connected &&
      userProfileId
    ) {
      await syncPendingInventorySubmissions(userProfileId).catch(() => 0);
    }

    // 1. Carrega rascunhos locais do SQLite (disponíveis 100% offline)
    let localDraftSessions: InventorySession[] = [];
    if (pageNum === 0) {
      try {
        const localDrafts = await listLocalInventoryDrafts(userProfileId);
        const reservedCodes = new Set(
          localDrafts
            .filter((draft) => draft.status === 'pending_sync')
            .map((draft) => draft.code)
        );
        const inProgressDrafts = localDrafts
          .filter((draft) => draft.status === 'in_progress')
          .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt));

        const draftsToRepair = [] as typeof inProgressDrafts;
        for (const draft of inProgressDrafts) {
          const code = draft.code.trim();
          if (code && !reservedCodes.has(code)) {
            reservedCodes.add(code);
            continue;
          }
          draftsToRepair.push(draft);
        }

        const reservedNumericCodes = [...reservedCodes]
          .map((reservedCode) => reservedCode.trim())
          .filter((reservedCode) => /^\d{1,6}$/.test(reservedCode))
          .map((reservedCode) => reservedCode.padStart(6, '0'));

        for (let offset = 0; offset < draftsToRepair.length; offset += 1000) {
          const batch = draftsToRepair.slice(offset, offset + 1000);
          let nextCodes: string[];
          try {
            if (reservedNumericCodes.length > 1000) {
              throw new Error('A lista local excede o limite de reserva remota.');
            }
            nextCodes = await stockService.getNextInventoryCodes(reservedNumericCodes, batch.length);
          } catch {
            nextCodes = batch.map((draft) => {
              let localCode = `LOCAL-${draft.id.replace(/-/g, '')}`;
              while (reservedCodes.has(localCode)) localCode += 'X';
              reservedCodes.add(localCode);
              return localCode;
            });
          }

          for (const [index, draft] of batch.entries()) {
            const nextCode = nextCodes[index];
            if (!draft.userId || draft.userId !== userProfileId) continue;
            await saveLocalInventoryDraft({ ...draft, userId: draft.userId, code: nextCode });
            draft.code = nextCode;
            reservedCodes.add(nextCode);
          }
        }

        localDraftSessions = localDrafts.map((d) => {
          const countedProductsCount = d.items.filter(
            (item) => typeof item.physicalCount === 'number'
          ).length;
          return {
            id: d.id,
            name: d.name,
            status: d.status || 'in_progress',
            created_at: d.updatedAt,
            updated_at: d.updatedAt,
            items_count: countedProductsCount,
            productsCount: countedProductsCount,
            countedQuantityTotal: sumInventoryCountedQuantities(d.items),
            adjustmentsCount: 0,
            reversedCount: 0,
            inventoryCode: d.code,
            responsibleName: d.responsibleName || 'Armazenado no aparelho',
          };
        });
        setSessions(localDraftSessions);
        setLoading(false);
      } catch (e) {
        console.warn('[SQLite] Erro ao listar rascunhos locais:', e);
      }
    }

    try {
      const periodStart = selectedPeriodDays > 0
        ? new Date(Date.now() - selectedPeriodDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined;
      const result = await stockService.fetchInventorySessionsWithStatus(
        pageNum,
        periodStart,
        undefined,
        userProfileId,
        selectedPeriodDays
      );
      const data = result.sessions;
      if (pageNum === 0) setUsesCachedResults(result.fromCache);

      const formattedData = (data || []).map((session: any) => ({
        id: session.id,
        name: session.name || `Inventário #${session.id.split('-')[0]}`,
        status: session.status || 'in_progress',
        created_at: session.created_at,
        updated_at: session.updated_at,
        items_count: session.items_count || 0,
        productsCount: session.productsCount || 0,
        countedQuantityTotal: session.countedQuantityTotal,
        adjustmentsCount: session.adjustmentsCount || 0,
        reversedCount: session.reversedCount || 0,
        inventoryCode: session.inventoryCode,
        responsibleName: session.responsibleName,
      }));

      if (isRefresh || pageNum === 0) {
        // Mescla rascunhos locais no topo, deduplicando por ID
        const completedRemoteIds = new Set(
          formattedData.filter((s: any) => s.status === 'completed').map((s: any) => s.id)
        );
        const localIds = new Set(localDraftSessions.map((s) => s.id));
        const activeLocal = localDraftSessions.filter((d) => !completedRemoteIds.has(d.id));
        setSessions([
          ...activeLocal,
          ...formattedData.filter((s: any) => s.status === 'completed' || !localIds.has(s.id)),
        ]);
      } else {
        setSessions((prev) => [...prev, ...formattedData]);
      }

      if (data && data.length < stockService.ITEMS_PER_PAGE) {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to fetch inventory sessions:', err);
      // Em caso de falha de conexão (offline), exibe os rascunhos locais salvos no aparelho!
      if (pageNum === 0 && localDraftSessions.length > 0) {
        setSessions(localDraftSessions);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userProfileId]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      void loadSessions(false, nextPage);
    }
  }, [loadingMore, hasMore, loading, page, loadSessions]);

  useEffect(() => {
    void loadSessions(true, 0);
    return connectivityService.subscribe((online) => {
      setIsOnline(online);
      if (online) {
        void loadSessions(true, 0);
      }
    });
  }, [loadSessions]);

  const reloadForPeriod = useCallback((nextPeriodDays: number) => {
    periodDaysRef.current = nextPeriodDays;
    void loadSessions(true, 0, nextPeriodDays, false);
  }, [loadSessions]);

  return {
    sessions,
    loading,
    loadingMore,
    isOnline,
    usesCachedResults,
    loadMore,
    reloadForPeriod,
    reload: () => loadSessions(true, 0, periodDaysRef.current),
  };
};
