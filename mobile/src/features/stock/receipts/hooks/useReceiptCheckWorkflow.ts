import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import {
  completeGoodsReceiptCheck,
  getGoodsReceiptCheckDraft,
  saveGoodsReceiptCheckDraft,
} from '../../../../services/stock/stockReceiptsService';

interface UseReceiptCheckWorkflowParams {
  receipt?: any;
  onBack: () => void;
  onCompleted?: () => void;
}

export const useReceiptCheckWorkflow = ({
  receipt,
  onBack,
  onCompleted,
}: UseReceiptCheckWorkflowParams) => {
  const items = Array.isArray(receipt?.items) ? receipt.items : [];
  const totalVolumes = Math.max(
    1,
    items.reduce((sum: number, item: any) => sum + Math.max(1, Number(item?.quantity || 1)), 0) ||
      15
  );
  const [checkedVolumes, setCheckedVolumes] = useState<number>(
    Number(receipt?.checkedVolumes ?? (receipt?.status === 'received' ? totalVolumes : 0))
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    if (receipt?.id) {
      void getGoodsReceiptCheckDraft(String(receipt.id)).then((draft) => {
        if (active && draft && typeof draft.checkedVolumes === 'number') {
          setCheckedVolumes(Math.min(totalVolumes, draft.checkedVolumes));
        }
      });
    }
    return () => {
      active = false;
    };
  }, [receipt?.id, totalVolumes]);

  const handleScanVolume = async () => {
    const next = Math.min(totalVolumes, checkedVolumes + 1);
    setCheckedVolumes(next);
    if (receipt?.id) {
      await saveGoodsReceiptCheckDraft(String(receipt.id), {
        checkedVolumes: next,
        totalVolumes,
      });
    }
  };

  const handleCompleteCheck = async () => {
    if (!receipt?.id) {
      onCompleted?.();
      onBack();
      return;
    }
    setSubmitting(true);
    try {
      const result = await completeGoodsReceiptCheck({
        receiptId: String(receipt.id),
        checkedVolumes,
        totalVolumes,
      });
      if (!result.syncedRemotely) {
        Alert.alert(
          'Conferência salva no aparelho',
          'Você está sem internet. A conferência deste recebimento foi salva localmente e será sincronizada automaticamente assim que a conexão retornar.'
        );
      }
      onCompleted?.();
      onBack();
    } finally {
      setSubmitting(false);
    }
  };

  const headerTitle = receipt?.invoiceNumber
    ? `NF ${receipt.invoiceNumber}`
    : receipt?.receiptIndex || receipt?.receipt_index
      ? `Rec #${String(receipt.receiptIndex || receipt.receipt_index).padStart(6, '0')}`
      : 'NF 123456';
  const supplierSubtitle = receipt?.supplierName || 'Indústria Móveis Silva';

  return {
    items,
    totalVolumes,
    checkedVolumes,
    submitting,
    headerTitle,
    supplierSubtitle,
    handleScanVolume,
    handleCompleteCheck,
  };
};
