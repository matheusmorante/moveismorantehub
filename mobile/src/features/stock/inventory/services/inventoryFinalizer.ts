import { Alert, Platform } from 'react-native';
import { supabase } from '../../../../services/supabaseClient';
import {
  deleteLocalInventoryDraft,
  markLocalDraftPendingSync,
} from '../../../../services/sqlite/inventoryDrafts';
import {
  deleteInventorySubmission,
  freezeInventorySubmission,
  getInventorySubmission,
  recordInventorySubmissionFailure,
} from '../../../../services/sqlite/inventoryOutbox';
import { connectivityService } from '../../../../services/offline/connectivityService';
import { syncPendingInventorySubmissions } from './inventoryOutboxSync';
import {
  buildInventorySubmissionDraft,
  validateInventoryBeforeFinalization,
  type InventoryFinalizerScopeConfig,
} from './inventoryFinalizerValidation';
import type {
  AuditItem,
  AuditDraftState,
  FinalizeAdjustmentItem,
} from '../types/inventoryWorkflow.types';

export { syncPendingInventorySubmissions };

interface FinalizeParams {
  items: AuditItem[];
  itemsWithAdjustment: FinalizeAdjustmentItem[];
  scopeConfig: InventoryFinalizerScopeConfig;
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
  } catch {
    Alert.alert(
      'Falha ao recuperar',
      'A submissão salva está inválida. Preserve este inventário e tente novamente.'
    );
    return false;
  }

  const useV2 = process.env.EXPO_PUBLIC_INVENTORY_RPC_V2 === 'true';
  if (!existingSubmission) {
    const validation = await validateInventoryBeforeFinalization({
      items,
      itemsWithAdjustment,
      scopeConfig,
      useV2,
    });
    if (!validation.valid) {
      Alert.alert(validation.alertTitle || 'Atenção', validation.alertMessage || '');
      return false;
    }
  }

  let submission;
  try {
    submission =
      existingSubmission ||
      (await freezeInventorySubmission(
        buildInventorySubmissionDraft({
          auditId,
          code,
          items,
          itemsWithAdjustment,
          scopeConfig,
          userProfile,
          useV2,
        })
      ));
  } catch (error) {
    console.error('[Inventory] Falha ao salvar submissão local:', error);
    Alert.alert(
      'Falha ao salvar',
      'Não foi possível congelar a submissão no aparelho. Tente novamente.'
    );
    return false;
  }

  const isOnline =
    connectivityService.connected &&
    (typeof navigator === 'undefined' || navigator.onLine !== false);
  if (!isOnline) {
    await markLocalDraftPendingSync(auditId).catch(() => {});
    Alert.alert(
      'Conclusão salva no aparelho',
      'A submissão ficou congelada para envio. Conecte-se à internet e retome este inventário para sincronizar o estoque.',
      [{ text: 'OK', onPress: onClose }]
    );
    if (Platform.OS === 'web') {
      onClose();
    }
    return false;
  }

  try {
    const { data, error } = await supabase.rpc(
      submission.contractVersion === 2
        ? 'finalize_inventory_transaction_v2'
        : 'finalize_inventory_transaction',
      {
        p_audit_id: submission.auditId,
        p_code: submission.code,
        p_observation: submission.observation,
        p_items: submission.items,
        p_responsible_name: submission.responsibleName,
      }
    );
    if (error) throw error;
    if (data?.auditId !== auditId || !['processed', 'already_processed'].includes(data?.status)) {
      throw new Error('O servidor não confirmou a conclusão do inventário.');
    }

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
    await recordInventorySubmissionFailure(auditId, error).catch((e) =>
      console.warn('[SQLite] Falha ao registrar tentativa:', e)
    );
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
        error?.message ||
          'Não foi possível processar o inventário. Suas contagens locais continuam seguras. Tente novamente.'
      );
    }
    return false;
  }
};
