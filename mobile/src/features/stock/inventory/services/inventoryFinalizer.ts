import { Alert, Platform } from 'react-native';
import { supabase } from '../../../../services/supabaseClient';
import { deleteLocalInventoryDraft, markLocalDraftPendingSync } from '../../../../services/sqlite/inventoryDrafts';
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

    if (itemsWithAdjustment.some(item => !item.variationId)) {
        Alert.alert('Variação pendente', 'Selecione a variação dos produtos com ajuste antes de concluir o inventário.');
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

        const { data, error } = await supabase.rpc('finalize_inventory_transaction', {
            p_audit_id: auditId,
            p_code: code,
            p_observation: auditObservation,
            p_items: itemsWithAdjustment.map(item => ({
                productId: item.productId,
                variationId: item.variationId || null,
                name: item.name,
                physicalCount: item.physicalCount,
                previousStock: item.reconciledExpected,
            })),
            p_responsible_name: auditObservation.responsibleName,
        });
        if (error) throw error;
        if (data?.auditId !== auditId || !['processed', 'already_processed'].includes(data?.status)) {
            throw new Error('O servidor não confirmou a conclusão do inventário.');
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
