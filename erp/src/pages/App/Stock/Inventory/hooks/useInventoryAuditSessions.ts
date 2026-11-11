import { useEffect, useMemo, useRef, useState } from 'react';
import {
  deleteInventoryMove,
  getNextInventoryCodes,
  subscribeToInventoryMoveMutations,
  reverseInventoryMove,
  unreverseInventoryMove,
} from '@/pages/utils/inventoryService';
import { toast } from 'react-toastify';
import type { InventoryAuditSession } from '../types/inventoryAudit.types';
import { supabase } from '@/pages/utils/supabaseConfig';
import { requestConfirmation } from '@/components/shared/confirmationService';
import {
  deleteWebInventoryDraft,
  listWebInventoryDrafts,
  saveWebInventoryDraft,
  subscribeWebInventoryDrafts,
  type WebInventoryDraft,
} from '../services/inventoryLocalDrafts';
import { listReservedLocalInventoryCodes } from '../services/listReservedLocalInventoryCodes';
import {
  fetchInventoryAuditSessionPage,
  mapWebInventoryDraftToSession,
  type InventoryAuditSessionPageEntry,
} from '../services/inventoryAuditSessionQuery';

export const useInventoryAuditSessions = () => {
  const [sessionEntries, setSessionEntries] = useState<readonly InventoryAuditSessionPageEntry[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [reservedInventoryCodes, setReservedInventoryCodes] = useState<string[]>([]);
  const [localDrafts, setLocalDrafts] = useState<WebInventoryDraft[]>([]);
  const [localDraftsLoaded, setLocalDraftsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<InventoryAuditSession | null>(null);
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; right: number } | null>(
    null
  );
  const [confirmAction, setConfirmAction] = useState<{
    session: InventoryAuditSession;
    type: 'reverse' | 'apply';
  } | null>(null);
  const [periodDays, setPeriodDaysState] = useState(30);
  const [periodAnchorMs, setPeriodAnchorMs] = useState(() => Date.now());
  const [page, setPage] = useState(1);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const repairingDraftCodes = useRef(false);
  const suppressInventoryRefresh = useRef(false);
  const suppressLocalDraftRefresh = useRef(false);

  const periodStart = useMemo(
    () =>
      periodDays === 0
        ? null
        : new Date(periodAnchorMs - periodDays * 24 * 60 * 60 * 1000).toISOString(),
    [periodAnchorMs, periodDays]
  );
  const periodStartMs = periodStart ? Date.parse(periodStart) : null;
  const eligibleLocalDrafts = useMemo(
    () =>
      periodStartMs === null
        ? localDrafts
        : localDrafts.filter((draft) => Date.parse(draft.date) >= periodStartMs),
    [localDrafts, periodStartMs]
  );
  const eligibleLocalDraftsRef = useRef(eligibleLocalDrafts);
  eligibleLocalDraftsRef.current = eligibleLocalDrafts;
  const localDraftsRef = useRef(localDrafts);
  localDraftsRef.current = localDrafts;
  const localDraftsQueryKey = useMemo(
    () => JSON.stringify(localDrafts.map(({ id, date }) => [id, date])),
    [localDrafts]
  );

  useEffect(() => {
    if (!activeSession) return;
    const handleClose = () => {
      setActiveSession(null);
      setMenuPos(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleClose, true);
    window.addEventListener('resize', handleClose);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('resize', handleClose);
    };
  }, [activeSession]);

  useEffect(
    () =>
      subscribeToInventoryMoveMutations(() => {
        if (!suppressInventoryRefresh.current) {
          setRefreshVersion((current) => current + 1);
        }
      }),
    []
  );

  useEffect(() => {
    if (!localDraftsLoaded || !localDrafts.length || repairingDraftCodes.current) return;
    let cancelled = false;

    const repairDuplicateCodes = async () => {
      repairingDraftCodes.current = true;
      try {
        const reservedCodes = new Set<string>();
        reservedInventoryCodes.forEach((code) => {
          const normalizedCode = String(code || '').trim();
          if (normalizedCode) reservedCodes.add(normalizedCode);
        });

        localDrafts
          .filter((draft) => draft.status === 'pending_sync')
          .forEach((draft) => reservedCodes.add(draft.code));

        const inProgressDrafts = localDrafts
          .filter((draft) => draft.status === 'in_progress')
          .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());

        const draftsToRepair: WebInventoryDraft[] = [];
        let repaired = false;
        for (const draft of inProgressDrafts) {
          const currentCode = draft.code.trim();
          if (currentCode && !reservedCodes.has(currentCode)) {
            reservedCodes.add(currentCode);
            continue;
          }
          draftsToRepair.push(draft);
        }

        if (draftsToRepair.length) {
          let allReservedCodes: string[] = [];
          let canReserveRemotely = true;
          try {
            const localReservedCodes = await listReservedLocalInventoryCodes(draftsToRepair[0].id);
            allReservedCodes = [...new Set([
              ...localReservedCodes,
              ...[...reservedCodes]
                .map((code) => code.trim())
                .filter((code) => /^\d{1,6}$/.test(code))
                .map((code) => code.padStart(6, '0')),
            ])];
            canReserveRemotely = allReservedCodes.length <= 1000;
          } catch {
            canReserveRemotely = false;
          }

          for (let offset = 0; offset < draftsToRepair.length; offset += 1000) {
            const batch = draftsToRepair.slice(offset, offset + 1000);
            let nextCodes: string[];
            try {
              if (!canReserveRemotely) throw new Error('A reserva remota não está disponível.');
              nextCodes = await getNextInventoryCodes(allReservedCodes, batch.length);
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
              await saveWebInventoryDraft({
                ...draft,
                code: nextCode,
                updatedAt: new Date().toISOString(),
              });
              reservedCodes.add(nextCode);
              repaired = true;
            }
          }
        }

        if (repaired && !cancelled) setLocalDrafts(await listWebInventoryDrafts());
      } catch (error) {
        console.warn('Não foi possível corrigir códigos repetidos de inventário:', error);
      } finally {
        repairingDraftCodes.current = false;
      }
    };

    void repairDuplicateCodes();
    return () => {
      cancelled = true;
    };
  }, [localDrafts, localDraftsLoaded, reservedInventoryCodes]);

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: number | undefined;

    const loadDrafts = async () => {
      try {
        const drafts = await listWebInventoryDrafts();
        if (cancelled) return;
        setLocalDrafts(drafts);
      } catch (error) {
        if (!cancelled) {
          console.error('Falha ao listar inventários locais:', error);
          setLocalDrafts([]);
        }
      } finally {
        if (!cancelled) setLocalDraftsLoaded(true);
      }
    };

    const refresh = () => {
      if (suppressLocalDraftRefresh.current) return;
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        refreshTimer = undefined;
        void loadDrafts();
      }, 100);
    };

    void loadDrafts();
    const unsubscribe = subscribeWebInventoryDrafts(refresh);
    return () => {
      cancelled = true;
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!localDraftsLoaded) return;
    let cancelled = false;
    let timedOut = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 15_000);

    setLoading(true);
    void fetchInventoryAuditSessionPage({
      page,
      periodStart,
      localDrafts: localDraftsRef.current,
      signal: controller.signal,
    })
      .then((result) => {
        if (cancelled) return;
        setSessionEntries(result.entries);
        setTotalItems(result.totalItems);
        setReservedInventoryCodes((current) => {
          const next = [...result.reservedCodes];
          return current.length === next.length && current.every((code, index) => code === next[index])
            ? current
            : next;
        });
        setLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        if (timedOut) {
          console.warn('A consulta das sessões de inventário excedeu 15 segundos.');
        } else {
          console.error('Erro ao buscar sessões de inventário:', error);
        }
        const localSessions = eligibleLocalDraftsRef.current
          .map(mapWebInventoryDraftToSession)
          .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
        const start = (page - 1) * 15;
        setSessionEntries(
          localSessions.slice(start, start + 15).map((session) => ({ kind: 'local', id: session.id }))
        );
        setTotalItems(localSessions.length);
        setReservedInventoryCodes([]);
        setLoading(false);
      })
      .finally(() => window.clearTimeout(timeoutId));

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    localDraftsLoaded,
    localDraftsQueryKey,
    page,
    periodStart,
    refreshVersion,
  ]);

  const handleOpenMenu = (
    e: React.MouseEvent<HTMLButtonElement>,
    session: InventoryAuditSession
  ) => {
    e.stopPropagation();
    if (activeSession?.id === session.id) {
      setActiveSession(null);
      setMenuPos(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < 180) {
      setMenuPos({
        bottom: window.innerHeight - rect.top + 4,
        right: window.innerWidth - rect.right,
      });
    } else {
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setActiveSession(session);
  };

  const deleteDraft = async (session: InventoryAuditSession) => {
    if (!await requestConfirmation({
      title: 'Excluir contagem em andamento?',
      message: `Deseja excluir a contagem #${session.inventoryCode}?`,
      confirmLabel: 'Excluir contagem',
      type: 'danger',
    })) return;
    let remoteMarkerDeleted = false;
    let localDraftDeleted = false;
    suppressInventoryRefresh.current = true;
    suppressLocalDraftRefresh.current = true;
    try {
      if (session.markerMoveId) {
        await deleteInventoryMove(session.markerMoveId, false, true);
        remoteMarkerDeleted = true;
      }
      await deleteWebInventoryDraft(session.id);
      localDraftDeleted = true;
      setLocalDrafts(await listWebInventoryDrafts());
      toast.success('Contagem em andamento excluída.');
    } catch (error: unknown) {
      console.error('Erro ao excluir contagem:', error);
      toast.error('Não foi possível excluir a contagem.');
    } finally {
      suppressInventoryRefresh.current = false;
      suppressLocalDraftRefresh.current = false;
      if (remoteMarkerDeleted || localDraftDeleted) {
        setRefreshVersion((current) => current + 1);
      }
      setActiveSession(null);
      setMenuPos(null);
    }
  };

  const handleToggleAdjustments = async () => {
    if (!confirmAction) return;
    const { session, type } = confirmAction;
    let shouldRefreshSessions = false;
    suppressInventoryRefresh.current = true;

    try {
      const { data: auditMoves, error: fetchError } = await supabase
        .from('inventory_moves')
        .select('id, observation, reason')
        .or(`order_id.eq.${session.id},related_entity_id.eq.${session.id}`)
        .like('label', 'Ajuste lançado pelo inventário #%');
      if (fetchError) throw fetchError;
      if (!auditMoves?.length) {
        throw new Error(
          `Nenhuma movimentação de ajuste foi encontrada para o inventário #${session.inventoryCode}.`
        );
      }
      shouldRefreshSessions = true;

      for (const move of auditMoves) {
        let observationStatus = '';
        try {
          observationStatus = JSON.parse(move.observation || '{}').status || '';
        } catch {
          /* observation legacy */
        }
        const isReversed =
          ['reversed', 'cancelled'].includes(observationStatus) ||
          String(move.reason || '').startsWith('Estorno');
        if (type === 'reverse' && !isReversed) {
          await reverseInventoryMove(move.id!, 'Estorno de inventário');
        } else if (type === 'apply' && isReversed) {
          await unreverseInventoryMove(move.id!);
        }
      }

      const { data: verifiedMoves, error: verifyError } = await supabase
        .from('inventory_moves')
        .select('observation, reason')
        .or(`order_id.eq.${session.id},related_entity_id.eq.${session.id}`)
        .like('label', 'Ajuste lançado pelo inventário #%');
      if (verifyError) throw verifyError;
      const allInExpectedState = (verifiedMoves || []).every((move) => {
        let metaStatus = '';
        try {
          metaStatus = JSON.parse(move.observation || '{}').status || '';
        } catch {
          /* observation legacy */
        }
        const isReversed =
          ['reversed', 'cancelled'].includes(metaStatus) ||
          String(move.reason || '').startsWith('Estorno');
        return type === 'reverse' ? isReversed : !isReversed;
      });
      if (!verifiedMoves?.length || !allInExpectedState) {
        throw new Error('O status das movimentações não foi confirmado após a operação.');
      }
      toast.success(
        type === 'reverse' ? 'Inventário estornado com sucesso!' : 'Ajustes aplicados com sucesso!'
      );
    } catch (error) {
      console.error('Erro ao processar movimentações:', error);
      toast.error('Ocorreu um erro ao processar sua solicitação.');
    } finally {
      suppressInventoryRefresh.current = false;
      if (shouldRefreshSessions) {
        setRefreshVersion((current) => current + 1);
      }
      setConfirmAction(null);
    }
  };

  const localDraftsById = useMemo(
    () => new Map(eligibleLocalDrafts.map((draft) => [draft.id, draft])),
    [eligibleLocalDrafts]
  );
  const sessions = useMemo(
    () =>
      sessionEntries.flatMap((entry) => {
        if (entry.kind === 'remote') return [entry.session];
        const draft = localDraftsById.get(entry.id);
        return draft ? [mapWebInventoryDraftToSession(draft)] : [];
      }),
    [localDraftsById, sessionEntries]
  );
  const pageCount = Math.max(1, Math.ceil(totalItems / 15));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const setPeriodDays = (days: number) => {
    setPage(1);
    setPeriodAnchorMs(Date.now());
    setPeriodDaysState(days);
  };

  return {
    sessions,
    periodDays,
    setPeriodDays,
    page,
    setPage,
    pageCount,
    totalItems,
    itemsPerPage: 15,
    loading,
    activeSession,
    menuPos,
    confirmAction,
    setConfirmAction,
    handleOpenMenu,
    closeMenu: () => {
      setActiveSession(null);
      setMenuPos(null);
    },
    deleteDraft,
    handleToggleAdjustments,
  };
};
