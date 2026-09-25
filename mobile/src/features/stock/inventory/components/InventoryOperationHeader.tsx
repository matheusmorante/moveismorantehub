import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { ArrowLeft, ScanLine } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  isDarkMode: boolean;
  title: string;
  countedCount: number;
  totalCount: number;
  progressPercent: number;
  onBack: () => void;
  onOpenScanner: () => void;
}

export const InventoryOperationHeader: React.FC<Props> = ({
  isDarkMode,
  title,
  countedCount,
  totalCount,
  progressPercent,
  onBack,
  onOpenScanner,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 16
  );
  const surface = isDarkMode ? '#1e293b' : '#ffffff';
  const border = isDarkMode ? '#334155' : '#e2e8f0';
  const textPrimary = isDarkMode ? '#f1f5f9' : '#0f172a';
  const muted = isDarkMode ? '#94a3b8' : '#64748b';

  return (
    <View style={[styles.header, { backgroundColor: surface, borderBottomColor: border, paddingTop: topInset + 8 }]}>
      <TouchableOpacity testID="header-back-btn" onPress={onBack} style={styles.backBtn}>
        <ArrowLeft size={24} color={textPrimary} />
      </TouchableOpacity>
      <View style={styles.titleCol}>
        <Text style={[styles.headerTitle, { color: textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.progressRow}>
          <Text style={[styles.progressText, { color: muted }]}>
            <Text style={{ color: '#10b981', fontWeight: '800' }}>{countedCount}</Text> / {totalCount}
          </Text>
          <View style={[styles.progressBarBg, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }]}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={[styles.progressText, { color: muted }]}>{progressPercent}%</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.scanActionBtn} onPress={onOpenScanner}>
        <ScanLine size={24} color="#ffffff" />
      </TouchableOpacity>
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
  headerTitle: { fontSize: 18, fontWeight: '800' },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  progressText: { fontSize: 12, fontWeight: '700' },
  progressBarBg: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 3 },
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
});
