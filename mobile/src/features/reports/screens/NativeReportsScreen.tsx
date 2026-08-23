import React from 'react';
import { View, Text, ScrollView, StyleSheet, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart3, CheckCircle2 } from 'lucide-react-native';

interface Props {
  isDarkMode: boolean;
}

export const NativeReportsScreen: React.FC<Props> = ({ isDarkMode }) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0) + 8;

  return (
    <ScrollView style={[styles.container, isDarkMode && styles.containerDark]} contentContainerStyle={[styles.content, { paddingTop: topInset }]}>
      <View style={styles.topRow}>
        <BarChart3 size={22} color="#2563eb" />
        <Text style={[styles.screenTitle, isDarkMode && styles.textDark]}>Relatórios & Performance</Text>
      </View>

      <View style={[styles.card, isDarkMode && styles.cardDark]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={18} color="#10b981" />
          <Text style={styles.badgeText}>Métricas Sincronizadas</Text>
        </View>
        <Text style={[styles.bigText, isDarkMode && styles.textDark]}>100% Nativo</Text>
        <Text style={styles.subText}>
          Aplicativo mobile refatorado com componentes nativos React Native e alta performance.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  containerDark: { backgroundColor: '#0f172a' },
  content: { padding: 20, gap: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  screenTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  textDark: { color: '#f8fafc' },
  card: { backgroundColor: '#ffffff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#f1f5f9', gap: 12 },
  cardDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  badgeText: { fontSize: 12, fontWeight: '800', color: '#2563eb', textTransform: 'uppercase' },
  bigText: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  subText: { fontSize: 11, fontWeight: '600', color: '#64748b' }
});
