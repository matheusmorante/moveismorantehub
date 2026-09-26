import { useEffect, useMemo, useState } from "react";
import type InventoryMove from "@/pages/types/inventoryMove.type";
import { deleteInventoryMove, subscribeToInventoryMoves, reverseInventoryMove, unreverseInventoryMove } from "@/pages/utils/inventoryService";
import { toast } from "react-toastify";
import type { InventoryAuditSession } from "../types/inventoryAudit.types";
import { readSnapshot } from "../utils/inventorySnapshotUtils";
import { supabase } from "@/pages/utils/supabaseConfig";
import { mapInventoryMoveFromDB } from "@/pages/utils/inventoryService/inventoryMapper";
import { deleteWebInventoryDraft, listWebInventoryDrafts, subscribeWebInventoryDrafts, type WebInventoryDraft } from '../services/inventoryLocalDrafts';

export const useInventoryAuditSessions = () => {
    const [moves, setMoves] = useState<InventoryMove[]>([]);
    const [localDrafts, setLocalDrafts] = useState<WebInventoryDraft[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSession, setActiveSession] = useState<InventoryAuditSession | null>(null);
    const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ session: InventoryAuditSession; type: 'reverse' | 'apply' } | null>(null);

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

    useEffect(() => {
        return subscribeToInventoryMoves((data) => {
            setMoves(data);
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        const refresh = () => { void listWebInventoryDrafts()
            .then(drafts => { setLocalDrafts(drafts); setLoading(false); })
            .catch(error => { console.error('Falha ao listar inventários locais:', error); setLoading(false); }); };
        refresh();
        return subscribeWebInventoryDrafts(refresh);
    }, []);

    const handleOpenMenu = (e: React.MouseEvent<HTMLButtonElement>, session: InventoryAuditSession) => {
        e.stopPropagation();
        if (activeSession?.id === session.id) {
            setActiveSession(null);
            setMenuPos(null);
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow < 180) {
            setMenuPos({ bottom: window.innerHeight - rect.top + 4, right: window.innerWidth - rect.right });
        } else {
            setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
        }
        setActiveSession(session);
    };

    const deleteDraft = async (session: InventoryAuditSession) => {
        if (!window.confirm(`Excluir a contagem #${session.inventoryCode}?`)) return;
        try {
            if (session.markerMoveId) await deleteInventoryMove(session.markerMoveId, false, true);
            await deleteWebInventoryDraft(session.id);
            toast.success('Contagem em andamento excluída.');
        } catch (error: unknown) {
            console.error('Erro ao excluir contagem:', error);
            toast.error('Não foi possível excluir a contagem.');
        } finally {
            setActiveSession(null);
            setMenuPos(null);
        }
    };

    const handleToggleAdjustments = async () => {
        if (!confirmAction) return;
        const { session, type } = confirmAction;
        
        try {
            const { data: auditMoves, error: fetchError } = await supabase
                .from('inventory_moves')
                .select('*')
                .eq('order_id', session.id)
                .like('label', 'Ajuste lançado pelo inventário #%');
            if (fetchError) throw fetchError;
            if (!auditMoves?.length) {
                throw new Error(`Nenhuma movimentação de ajuste foi encontrada para o inventário #${session.inventoryCode}.`);
            }
            
            for (const move of auditMoves) {
                let observationStatus = '';
                try { observationStatus = JSON.parse(move.observation || '{}').status || ''; } catch { /* observation legacy */ }
                const isReversed = ['reversed', 'cancelled'].includes(observationStatus)
                    || String(move.reason || '').startsWith('Estorno');
                if (type === 'reverse' && !isReversed) {
                    await reverseInventoryMove(move.id!, 'Estorno de inventário');
                } else if (type === 'apply' && isReversed) {
                    await unreverseInventoryMove(move.id!);
                }
            }

            const { data: verifiedMoves, error: verifyError } = await supabase
                .from('inventory_moves')
                .select('*')
                .eq('order_id', session.id)
                .like('label', 'Ajuste lançado pelo inventário #%');
            if (verifyError) throw verifyError;
            const allInExpectedState = (verifiedMoves || []).every(move => {
                let metaStatus = '';
                try { metaStatus = JSON.parse(move.observation || '{}').status || ''; } catch { /* observation legacy */ }
                const isReversed = ['reversed', 'cancelled'].includes(metaStatus)
                    || String(move.reason || '').startsWith('Estorno');
                return type === 'reverse' ? isReversed : !isReversed;
            });
            if (!verifiedMoves?.length || !allInExpectedState) {
                throw new Error('O status das movimentações não foi confirmado após a operação.');
            }
            const verifiedAuditMoves = verifiedMoves.map(mapInventoryMoveFromDB);
            setMoves(current => {
                const verifiedIds = new Set(verifiedAuditMoves.map(move => move.id));
                return [...current.filter(move => !verifiedIds.has(move.id)), ...verifiedAuditMoves];
            });
            toast.success(type === 'reverse' ? 'Inventário estornado com sucesso!' : 'Ajustes aplicados com sucesso!');
        } catch (error) {
            console.error('Erro ao processar movimentações:', error);
            toast.error('Ocorreu um erro ao processar sua solicitação.');
        } finally {
            setConfirmAction(null);
        }
    };

    const sessions = useMemo(() => {
        const remoteSessions = moves
        .filter((move) => move.label?.startsWith('Inventário #'))
        .map((marker): InventoryAuditSession | null => {
            const snapshot = readSnapshot(marker);
            if (!snapshot || !snapshot.items.length) return null;
            const auditMoves = moves.filter((move) => move.relatedEntityId === marker.relatedEntityId && move.label?.startsWith('Ajuste lançado pelo inventário #'));
            const adjustmentsCount = auditMoves.length;
            const reversedCount = auditMoves.filter(m => m.status === 'reversed').length;
            
            return {
                id: marker.relatedEntityId || marker.id || marker.date,
                inventoryCode: snapshot.inventoryCode,
                date: marker.date,
                status: snapshot.status,
                items: snapshot.items,
                productsCount: snapshot.items.length,
                adjustmentsCount,
                reversedCount,
                hasStages: snapshot.hasStages,
                responsibleId: snapshot.responsibleId,
                responsibleName: snapshot.responsibleName,
                markerMoveId: marker.id
            };
        })
        .filter((s): s is InventoryAuditSession => s !== null);
        const completedRemoteIds = new Set(remoteSessions.filter(session => session.status === 'completed').map(session => session.id));
        const localIds = new Set(localDrafts.map(draft => draft.id));
        const localSessions: InventoryAuditSession[] = localDrafts
            .filter(draft => !completedRemoteIds.has(draft.id))
            .map(draft => ({
                id: draft.id,
                inventoryCode: draft.code,
                date: draft.date,
                status: draft.status === 'pending_sync' ? 'pending' : 'in_progress',
                items: draft.items,
                productsCount: draft.items.filter(item => item.physicalCount !== null).length,
                adjustmentsCount: 0,
                reversedCount: 0,
                hasStages: draft.hasStages,
                responsibleId: draft.responsibleId,
            }));
        return [...localSessions, ...remoteSessions.filter(session => session.status === 'completed' || !localIds.has(session.id))]
            .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
    }, [moves, localDrafts]);

    return {
        sessions,
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
