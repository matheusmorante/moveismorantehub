import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { ArrowLeft, Check, Camera, QrCode } from 'lucide-react-native';
import { receiptCheckStyles as styles } from './ReceiptCheckScreen.styles';
import { useReceiptCheckWorkflow } from './useReceiptCheckWorkflow';

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
  const {
    items,
    totalVolumes,
    checkedVolumes,
    submitting,
    headerTitle,
    supplierSubtitle,
    handleScanVolume,
    handleCompleteCheck,
  } = useReceiptCheckWorkflow({ receipt, onBack, onCompleted });

  const displayItems =
    items.length > 0
      ? items
      : Array.from({ length: 3 }).map((_, i) => ({
          id: `fallback-${i}`,
          description: 'Sofá Retrátil 3 Lugares',
          sku: `100${i}`,
          quantity: 5,
        }));

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
          {displayItems.map((item: any, i: number) => (
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
