import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { ArrowLeft, Check, Camera, QrCode } from 'lucide-react-native';
import {
  completeGoodsReceiptCheck,
  getGoodsReceiptCheckDraft,
  saveGoodsReceiptCheckDraft,
} from '../../../services/stock/stockReceiptsService';

export interface ReceiptCheckScreenProps {
  isDarkMode: boolean;
  onBack: () => void;
  receipt?: any;
  onCompleted?: () => void;
}

export const ReceiptCheckScreenContent: React.FC<ReceiptCheckScreenProps> = ({
  isDarkMode,
  onBack,
  receipt,
  onCompleted,
}) => {
  const items = Array.isArray(receipt?.items) ? receipt.items : [];
  const computedTotalVolumes = Math.max(
    1,
    items.reduce((sum: number, item: any) => sum + Math.max(1, Number(item?.quantity || 1)), 0) ||
      15
  );
  const [checkedVolumes, setCheckedVolumes] = useState<number>(
    Number(receipt?.checkedVolumes ?? (receipt?.status === 'received' ? computedTotalVolumes : 0))
  );
  const [submitting, setSubmitting] = useState(false);
  const totalVolumes = computedTotalVolumes;

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

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <TouchableOpacity
          onPress={onBack}
          style={[styles.backButton, isDarkMode && styles.backButtonDark]}
        >
          <ArrowLeft size={24} color={isDarkMode ? '#94a3b8' : '#64748b'} />
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <Text style={[styles.title, isDarkMode && styles.textDark]}>{headerTitle}</Text>
          <Text style={[styles.subtitle, isDarkMode && styles.textMutedDark]}>
            {supplierSubtitle}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.statsCard, isDarkMode && styles.statsCardDark]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#2563eb' }]}>{checkedVolumes}</Text>
            <Text style={[styles.statLabel, isDarkMode && styles.textMutedDark]}>Conferidos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, isDarkMode && styles.textDark]}>{totalVolumes}</Text>
            <Text style={[styles.statLabel, isDarkMode && styles.textMutedDark]}>Total Vols</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.scanButton} onPress={handleScanVolume}>
          <QrCode size={32} color="#ffffff" />
          <Text style={styles.scanButtonText}>Ler Código de Barras do Volume</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.photoButton, isDarkMode && styles.photoButtonDark]}>
          <Camera size={24} color={isDarkMode ? '#f8fafc' : '#0f172a'} />
          <Text style={[styles.photoButtonText, isDarkMode && styles.textDark]}>
            Anexar Canhoto / Foto
          </Text>
        </TouchableOpacity>

        <View style={styles.itemsList}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Itens da Nota</Text>
          {(items.length > 0
            ? items
            : Array.from({ length: 3 }).map((_, i) => ({
                id: `fallback-${i}`,
                description: 'Sofá Retrátil 3 Lugares',
                sku: `100${i}`,
                quantity: 5,
              }))
          ).map((item: any, i: number) => (
            <View key={item.id || i} style={[styles.itemCard, isDarkMode && styles.itemCardDark]}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, isDarkMode && styles.textDark]}>
                  {item.description || item.name || 'Item do Recebimento'}
                </Text>
                <Text style={[styles.itemSku, isDarkMode && styles.textMutedDark]}>
                  SKU: {item.sku || item.product_id || `100${i}`}
                </Text>
              </View>
              <View style={[styles.itemQtyBadge, isDarkMode && styles.itemQtyBadgeDark]}>
                <Text style={[styles.itemQtyText, isDarkMode && styles.textDark]}>
                  {Number(item.quantity || 1)} un
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {checkedVolumes === totalVolumes && (
        <View style={[styles.footer, isDarkMode && styles.footerDark]}>
          <TouchableOpacity
            style={styles.confirmButton}
            disabled={submitting}
            onPress={handleCompleteCheck}
          >
            <Check size={20} color="#ffffff" />
            <Text style={styles.confirmButtonText}>
              {submitting ? 'Salvando...' : 'Concluir Conferência'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  headerDark: {
    backgroundColor: '#0f172a',
    borderBottomColor: '#1e293b',
  },
  headerTitleGroup: {
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    marginRight: 12,
  },
  backButtonDark: {
    backgroundColor: '#1e293b',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  textDark: {
    color: '#f8fafc',
  },
  textMutedDark: {
    color: '#94a3b8',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  statsCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 16,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  scanButton: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 12,
  },
  scanButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  photoButton: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 32,
    gap: 12,
  },
  photoButtonDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  photoButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  itemsList: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  itemSku: {
    fontSize: 13,
    color: '#64748b',
  },
  itemQtyBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  itemQtyBadgeDark: {
    backgroundColor: '#334155',
  },
  itemQtyText: {
    fontWeight: '700',
    color: '#0f172a',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footerDark: {
    backgroundColor: '#0f172a',
    borderTopColor: '#1e293b',
  },
  confirmButton: {
    flexDirection: 'row',
    backgroundColor: '#10b981',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
