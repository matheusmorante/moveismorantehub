import { Alert, Platform } from 'react-native';
import { supabase } from '../../../../services/supabaseClient';
import { deleteLocalInventoryDraft, markLocalDraftPendingSync } from '../../../../services/sqlite/inventoryDrafts';
import { recalculateInventoryAuditBalance } from '../../../../services/stock/stockInventoryService';
import { connectivityService } from '../../../../services/offline/connectivityService';
import type { AuditItem, AuditDraftState, FinalizeAdjustmentItem } from '../types/inventoryWorkflow.types';

interface FinalizeParams {
    items: AuditItem[];
    itemsWithAdjustment: FinalizeAdjustmentItem[];
    scopeConfig: {
        name: string;
        hasStages: boolean;
        responsibleId: string;
        scopeType?: string;
    };
    draftRef: React.MutableRefObject<AuditDraftState>;
    userProfile: { id: string; full_name?: string; fullName?: string } | null;
    onClose: () => void;
}

export const executeInventoryFinalization = async ({
    items,
    itemsWithAdjustment,
    scopeConfig,
    draftRef,
    userProfile,
    onClose,
}: FinalizeParams): Promise<boolean> => {
    const auditId = draftRef.current.id;
    const code = draftRef.current.code;

    if (!auditId || !code) {
        Alert.alert('Erro', 'Identificador de inventário inválido.');
        return false;
    }

    // 1. Validações de regra de negócio
    const uncountedCount = items.filter(i => i.physicalCount === null).length;
    if (scopeConfig.hasStages && uncountedCount > 0) {
        Alert.alert('Etapas pendentes', 'Todos os produtos devem ser contados antes de concluir o inventário por etapas.');
        return false;
    }

    if (!items.some(i => i.physicalCount !== null)) {
        Alert.alert('Nenhuma contagem', 'É necessário realizar pelo menos uma contagem para finalizar o inventário.');
        return false;
    }

    // 2. Verificação prévia de conectividade antes do commit
    const isOnline = connectivityService.connected && (typeof navigator === 'undefined' || navigator.onLine !== false);
    if (!isOnline) {
        await markLocalDraftPendingSync(auditId).catch(() => {});
        Alert.alert(
            'Sem conexão à internet',
            'Suas contagens estão salvas com segurança no aparelho. Conecte-se à internet para finalizar e sincronizar o estoque.'
        );
        return false;
    }

    try {
        const auditObservation = {
            inventoryAudit: true,
            inventoryCode: code,
            status: 'completed',
            name: scopeConfig.name,
            hasStages: scopeConfig.hasStages,
            responsibleId: scopeConfig.responsibleId,
            responsibleName: userProfile?.fullName || userProfile?.full_name || 'Usuário',
            items: items.map(({ productId, variationId, name, systemStock, physicalCount, assignedSupplier }) => ({
                productId,
                variationId,
                name,
                systemStock,
                physicalCount,
                assignedSupplier,
            })),
        };

        const completionDate = new Date().toISOString();
        const auditMarker = items[0];
        const markerPayload = {
            product_id: auditMarker?.productId || null,
            variation_id: auditMarker?.variationId || null,
            product_description: 'Sessão de inventário',
            type: 'adjustment',
            quantity: 0,
            date: completionDate,
            label: `Inventário #${code} (Concluído)`,
            observation: JSON.stringify({
                ...auditObservation,
                auditId,
            }),
            created_at: completionDate,
        };

        if (draftRef.current.markerMoveId) {
            const { error: updateErr } = await supabase
                .from('inventory_moves')
                .update({
                    label: `Inventário #${code} (Concluído)`,
                    observation: JSON.stringify({
                        ...auditObservation,
                        auditId,
                    }),
                    date: completionDate,
                })
                .eq('id', draftRef.current.markerMoveId);

            if (updateErr) {
                console.warn('[Finalize] Falha ao atualizar marker move, criando novo:', updateErr);
                const { error: insertErr } = await supabase
                    .from('inventory_moves')
                    .insert([markerPayload]);
                if (insertErr) throw insertErr;
            }
        } else {
            const { error: insertErr } = await supabase
                .from('inventory_moves')
                .insert([markerPayload]);
            if (insertErr) throw insertErr;
        }

        // Criar movimentações de ajuste para itens com divergência
        if (itemsWithAdjustment.length > 0) {
            const adjustmentMoves = itemsWithAdjustment.map(item => ({
                product_id: item.productId,
                variation_id: item.variationId || null,
                product_description: item.name,
                type: 'adjustment',
                quantity: 0,
                date: completionDate,
                label: `Ajuste lançado pelo inventário #${code}`,
                observation: JSON.stringify({
                    note: `Saldo definido pelo inventário #${code}`,
                    targetStock: item.physicalCount,
                    source: 'inventory_audit',
                    status: 'effective',
                    auditId,
                }),
                created_at: completionDate,
            }));

            const { error: adjErr } = await supabase
                .from('inventory_moves')
                .insert(adjustmentMoves);
            if (adjErr) throw adjErr;

            // Recalcular saldo de estoque no banco para produtos afetados
            const affectedProductIds = Array.from(new Set(itemsWithAdjustment.map(i => i.productId)));
            for (const productId of affectedProductIds) {
                try {
                    await recalculateInventoryAuditBalance(productId);
                } catch (e) {
                    console.warn(`[Finalize] Erro ao recalcular saldo do produto ${productId}:`, e);
                }
            }
        }

        // Somente após confirmação de sucesso pelo Supabase, limpa o SQLite local
        try {
            await deleteLocalInventoryDraft(auditId);
        } catch (e) {
            console.warn('[SQLite] Erro ao remover rascunho local após finalização:', e);
        }

        if (Platform.OS === 'web') {
            Alert.alert('Sucesso', `Inventário #${code} finalizado!`);
            onClose();
        } else {
            Alert.alert(
                'Sucesso',
                `Inventário #${code} finalizado! ${items.length} produto(s) contados e ${itemsWithAdjustment.length} ajuste(s) lançados no estoque. ✨`,
                [{ text: 'OK', onPress: onClose }]
            );
        }
        return true;
    } catch (error: any) {
        console.error('[Finalize] Erro ao finalizar inventário no Supabase:', error);
        const isNetworkError = 
            error?.message?.toLowerCase().includes('network') ||
            error?.message?.toLowerCase().includes('fetch') ||
            error?.message?.toLowerCase().includes('failed to fetch') ||
            !connectivityService.connected;

        if (isNetworkError) {
            await markLocalDraftPendingSync(auditId).catch(() => {});
            Alert.alert(
                'Falha de conexão',
                'Não foi possível conectar ao servidor. Todas as suas contagens permanecem salvas neste aparelho. Tente novamente assim que sua conexão for restabelecida.'
            );
        } else {
            Alert.alert(
                'Erro na finalização',
                error?.message || 'Não foi possível processar o inventário. Suas contagens locais continuam seguras. Tente novamente.'
            );
        }
        return false;
    }
};
