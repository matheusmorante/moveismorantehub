import { Alert, Platform } from 'react-native';
import { supabase } from '../../../../services/supabaseClient';
import { deleteLocalInventoryDraft, markLocalDraftPendingSync } from '../../../../services/sqlite/inventoryDrafts';
import { deleteInventorySubmission, freezeInventorySubmission, getInventorySubmission, recordInventorySubmissionFailure } from '../../../../services/sqlite/inventoryOutbox';
import { connectivityService } from '../../../../services/offline/connectivityService';
import { getOfflineInventoryCatalog } from './offlineInventoryCatalog';
import { findInventoryDraftConflicts } from './inventoryDraftConflicts';
import type { AuditItem, AuditDraftState, FinalizeAdjustmentItem } from '../types/inventoryWorkflow.types';

interface FinalizeParams {
    items: AuditItem[];
    itemsWithAdjustment: FinalizeAdjustmentItem[];
    scopeConfig: {
        name: string;
        hasStages: boolean;
        responsibleId: string;
        scopeType?: string;
        supplierId?: string;
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

    let existingSubmission;
    try {
        existingSubmission = await getInventorySubmission(auditId);
    } catch (error) {
        Alert.alert('Falha ao recuperar', 'A submissão salva está inválida. Preserve este inventário e tente novamente.');
        return false;
    }

    // 1. Validações de regra de negócio na primeira conclusão
    const uncountedCount = items.filter(i => i.physicalCount === null).length;
    if (!existingSubmission && scopeConfig.hasStages && uncountedCount > 0) {
        Alert.alert('Etapas pendentes', 'Todos os produtos devem ser contados antes de concluir o inventário por etapas.');
        return false;
    }

    if (!existingSubmission && !items.some(i => i.physicalCount !== null)) {
        Alert.alert('Nenhuma contagem', 'É necessário realizar pelo menos uma contagem para finalizar o inventário.');
        return false;
    }

    if (!existingSubmission && itemsWithAdjustment.some(item => !item.variationId)) {
        Alert.alert('Variação pendente', 'Selecione a variação dos produtos com ajuste antes de concluir o inventário.');
        return false;
    }
    const useV2 = process.env.EXPO_PUBLIC_INVENTORY_RPC_V2 === 'true';
    if (!existingSubmission && useV2 && items.filter(item => item.physicalCount !== null).some(item => !item.countedAt)) {
        Alert.alert('Horário da contagem ausente', 'Alguns itens foram contados antes da atualização. Refaça essas contagens para concluir com segurança.');
        return false;
    }
    if (!existingSubmission) {
        const conflicts = findInventoryDraftConflicts(await getOfflineInventoryCatalog(), items);
        if (conflicts.length) {
            Alert.alert('Conflito no inventário', `${conflicts.length} variação(ões) da contagem foram mescladas ou removidas. Revise os itens antes de concluir.`);
            return false;
        }
    }

    let submission;
    try {
        const auditObservation = {
            inventoryAudit: true,
            inventoryCode: code,
            status: 'completed',
            name: scopeConfig.name,
            hasStages: scopeConfig.hasStages,
            responsibleId: scopeConfig.responsibleId,
            scopeType: scopeConfig.scopeType,
            supplierId: scopeConfig.supplierId,
            responsibleName: userProfile?.fullName || userProfile?.full_name || 'Usuário',
            items: items.map(({ productId, variationId, name, systemStock, physicalCount, assignedSupplier, countedAt }) => ({
                productId, variationId, name, systemStock, physicalCount, assignedSupplier, countedAt,
            })),
        };
        submission = existingSubmission || await freezeInventorySubmission({
            contractVersion: useV2 ? 2 : 1, auditId, code, observation: auditObservation,
            items: (useV2 ? itemsWithAdjustment : itemsWithAdjustment.filter(item => item.physicalCount !== item.reconciledExpected)).map(item => ({
                productId: item.productId, variationId: item.variationId || null, name: item.name,
                physicalCount: item.physicalCount, previousStock: item.reconciledExpected,
                ...(useV2 ? { countedAt: item.countedAt } : {}),
            })),
            responsibleName: auditObservation.responsibleName,
        });
    } catch (error) {
        console.error('[Inventory] Falha ao salvar submissão local:', error);
        Alert.alert('Falha ao salvar', 'Não foi possível congelar a submissão no aparelho. Tente novamente.');
        return false;
    }

    // 2. A submissão já está persistida; a rede pode voltar após reiniciar o aplicativo.
    const isOnline = connectivityService.connected && (typeof navigator === 'undefined' || navigator.onLine !== false);
    if (!isOnline) {
        await markLocalDraftPendingSync(auditId).catch(() => {});
        Alert.alert(
            'Conclusão salva no aparelho',
            'A submissão ficou congelada para envio. Conecte-se à internet e retome este inventário para sincronizar o estoque.',
            [{ text: 'OK', onPress: onClose }],
        );
        return false;
    }

    try {
        const { data, error } = await supabase.rpc(submission.contractVersion === 2 ? 'finalize_inventory_transaction_v2' : 'finalize_inventory_transaction', {
            p_audit_id: submission.auditId,
            p_code: submission.code,
            p_observation: submission.observation,
            p_items: submission.items,
            p_responsible_name: submission.responsibleName,
        });
        if (error) throw error;
        if (data?.auditId !== auditId || !['processed', 'already_processed'].includes(data?.status)) {
            throw new Error('O servidor não confirmou a conclusão do inventário.');
        }

        // Somente após confirmação de sucesso pelo Supabase, limpa o SQLite local
        try {
            await deleteLocalInventoryDraft(auditId);
            await deleteInventorySubmission(auditId);
        } catch (e) {
            console.warn('[SQLite] Erro ao remover rascunho local após finalização:', e);
        }

        if (Platform.OS === 'web') {
            Alert.alert('Sucesso', `Inventário #${code} finalizado!`);
            onClose();
        } else {
            Alert.alert(
                'Sucesso',
                `Inventário #${code} finalizado! ${items.length} produto(s) contados e ${data?.moves?.length ?? submission.items.length} ajuste(s) lançados no estoque. ✨`,
                [{ text: 'OK', onPress: onClose }]
            );
        }
        return true;
    } catch (error: any) {
        console.error('[Finalize] Erro ao finalizar inventário no Supabase:', error);
        await recordInventorySubmissionFailure(auditId, error).catch(e => console.warn('[SQLite] Falha ao registrar tentativa:', e));
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
