import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowLeft, ScanLine } from 'lucide-react-native';

interface Props {
  isDarkMode: boolean;
  title: string;
  countedCount: number;
  countLabel?: string;
  onBack: () => void;
  onOpenScanner: () => void;
  showBackButton?: boolean;
  showCount?: boolean;
  showScanner?: boolean;
  showStageActions?: boolean;
  onRequestCancelStage?: () => void;
  onRequestCancelInventory?: () => void;
}

export const InventoryOperationHeader: React.FC<Props> = ({
  isDarkMode,
  title,
  countedCount,
  countLabel = 'quantidades contadas',
  onBack,
  onOpenScanner,
  showBackButton = true,
  showCount = true,
  showScanner = true,
  showStageActions = false,
  onRequestCancelStage,
  onRequestCancelInventory,
}) => {
  const surface = isDarkMode ? '#1e293b' : '#ffffff';
  const border = isDarkMode ? '#334155' : '#e2e8f0';
  const textPrimary = isDarkMode ? '#f1f5f9' : '#0f172a';
  const muted = isDarkMode ? '#94a3b8' : '#64748b';
  return (
    <View
      style={[
        styles.header,
        { backgroundColor: surface, borderBottomColor: border },
      ]}
    >
      {showBackButton && (
        <TouchableOpacity testID="header-back-btn" onPress={onBack} style={styles.backBtn}>
          <ArrowLeft size={24} color={textPrimary} />
        </TouchableOpacity>
      )}
      <View style={styles.titleCol}>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>
          {title}
        </Text>
        {showCount && (
          <Text style={[styles.countedText, { color: muted }]}>
            <Text style={{ color: '#10b981', fontWeight: '800' }}>{countedCount.toLocaleString('pt-BR')}</Text>{' '}
            {countLabel}
          </Text>
        )}
      </View>
      <View style={styles.headerActions}>
        {showScanner && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Escanear inventário"
            style={styles.scanActionBtn}
            onPress={onOpenScanner}
          >
            <ScanLine size={24} color="#ffffff" />
          </TouchableOpacity>
        )}
        {(showStageActions || onRequestCancelInventory) && (
          <View style={styles.cancelActions}>
            {showStageActions && onRequestCancelStage && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Cancelar etapa"
                style={styles.cancelInventoryActionButton}
                onPress={onRequestCancelStage}
              >
                <Text style={[styles.cancelActionLabel, { color: isDarkMode ? '#fda4af' : '#be123c' }]}>Cancelar etapa</Text>
              </TouchableOpacity>
            )}
            {onRequestCancelInventory && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Cancelar inventário"
                style={styles.cancelInventoryActionButton}
                onPress={onRequestCancelInventory}
              >
                <Text style={[styles.cancelActionLabel, { color: isDarkMode ? '#fda4af' : '#be123c' }]}>Cancelar inventário</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { marginRight: 12, padding: 4 },
  titleCol: { flex: 1, minWidth: 0, paddingRight: 16 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', flexShrink: 1 },
  countedText: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  scanActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  cancelActions: { alignItems: 'flex-end', justifyContent: 'center', gap: 4 },
  cancelInventoryActionButton: { minHeight: 28, paddingVertical: 4, justifyContent: 'center' },
  cancelActionLabel: { fontSize: 10, fontWeight: '800' },
});
