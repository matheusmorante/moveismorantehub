import { useEffect, useMemo, useState } from "react";
import type InventoryMove from "@/pages/types/inventoryMove.type";
import { deleteInventoryMove, subscribeToInventoryMoves, reverseInventoryMove, unreverseInventoryMove } from "@/pages/utils/inventoryService";
import { toast } from "react-toastify";
import type { InventoryAuditSession } from "../types/inventoryAudit.types";
import { readSnapshot } from "../utils/inventorySnapshotUtils";

export const useInventoryAuditSessions = () => {
    const [moves, setMoves] = useState<InventoryMove[]>([]);
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
        if (!session.markerMoveId || !window.confirm(`Excluir a contagem #${session.inventoryCode}?`)) return;
        try {
            await deleteInventoryMove(session.markerMoveId, false, true);
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
            const auditMoves = moves.filter((move) => move.relatedEntityId === session.id && move.label?.startsWith('Ajuste lançado pelo inventário #'));
            
            for (const move of auditMoves) {
                if (type === 'reverse' && move.status !== 'reversed') {
                    await reverseInventoryMove(move.id!, 'Estorno de inventário');
                } else if (type === 'apply' && move.status === 'reversed') {
                    await unreverseInventoryMove(move.id!);
                }
            }
            toast.success(type === 'reverse' ? 'Inventário estornado com sucesso!' : 'Ajustes aplicados com sucesso!');
        } catch (error) {
            console.error('Erro ao processar movimentações:', error);
            toast.error('Ocorreu um erro ao processar sua solicitação.');
        } finally {
            setConfirmAction(null);
        }
    };

    const sessions = useMemo(() => moves
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
        .filter((s): s is InventoryAuditSession => s !== null)
        .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()), [moves]);

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
