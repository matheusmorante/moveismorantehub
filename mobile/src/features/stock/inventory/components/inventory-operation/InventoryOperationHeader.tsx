import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowLeft, MoreVertical, ScanLine, X } from 'lucide-react-native';

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
  countLabel = 'produtos contados',
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
  const [stageMenuOpen, setStageMenuOpen] = React.useState(false);

  React.useEffect(() => {
    if (!showStageActions && !onRequestCancelInventory) setStageMenuOpen(false);
  }, [showStageActions, onRequestCancelInventory]);

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
        <Text style={[styles.headerTitle, { color: textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        {showCount && (
          <Text style={[styles.countedText, { color: muted }]}>
            <Text style={{ color: '#10b981', fontWeight: '800' }}>{countedCount}</Text>{' '}
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
            onPress={() => {
              setStageMenuOpen(false);
              onOpenScanner();
            }}
          >
            <ScanLine size={24} color="#ffffff" />
          </TouchableOpacity>
        )}
        {(showStageActions || onRequestCancelInventory) && (
          <View style={styles.stageActionsContainer}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={showStageActions ? 'Ações do inventário e da etapa' : 'Ações do inventário'}
              accessibilityState={{ expanded: stageMenuOpen }}
              style={styles.stageMenuButton}
              onPress={() => setStageMenuOpen((open) => !open)}
            >
              <MoreVertical size={22} color={muted} />
            </TouchableOpacity>
            {stageMenuOpen && (
              <View style={[styles.stageMenu, { backgroundColor: surface, borderColor: border }]}>
                {onRequestCancelInventory && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.cancelStageAction}
                    onPress={() => {
                      setStageMenuOpen(false);
                      onRequestCancelInventory();
                    }}
                  >
                    <X size={17} color={isDarkMode ? '#fda4af' : '#e11d48'} />
                    <Text style={[styles.cancelStageLabel, { color: isDarkMode ? '#fda4af' : '#be123c' }]}>Cancelar inventário</Text>
                  </TouchableOpacity>
                )}
                {showStageActions && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.cancelStageAction}
                    onPress={() => {
                      setStageMenuOpen(false);
                      onRequestCancelStage?.();
                    }}
                  >
                    <X size={17} color={isDarkMode ? '#fda4af' : '#e11d48'} />
                    <Text style={[styles.cancelStageLabel, { color: isDarkMode ? '#fda4af' : '#be123c' }]}>Cancelar etapa</Text>
                  </TouchableOpacity>
                )}
              </View>
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
  titleCol: { flex: 1, paddingRight: 16 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
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
  stageActionsContainer: { position: 'relative' },
  stageMenuButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageMenu: {
    position: 'absolute',
    top: 50,
    right: 0,
    width: 190,
    borderWidth: 1,
    borderRadius: 14,
    padding: 5,
    zIndex: 20,
    elevation: 10,
  },
  cancelStageAction: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 11, paddingVertical: 12, borderRadius: 10 },
  cancelStageLabel: { fontSize: 13, fontWeight: '700' },
});
