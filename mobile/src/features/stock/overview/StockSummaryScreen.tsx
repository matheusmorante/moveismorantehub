import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Box, ArrowUpRight, ArrowDownRight, Users } from 'lucide-react-native';

interface Props {
  isDarkMode: boolean;
  renderHeader: () => React.ReactElement;
  onNavigate?: (index: number) => void;
}

export const StockSummaryScreen: React.FC<Props> = ({ isDarkMode, renderHeader, onNavigate }) => {
  return (
    <ScrollView style={[styles.container, isDarkMode && styles.containerDark]}>
      {renderHeader()}
      <View style={styles.content}>
          <Text style={[styles.title, isDarkMode && styles.textDark]}>Visão Geral</Text>
          
          <View style={styles.grid}>
              <TouchableOpacity style={[styles.card, isDarkMode && styles.cardDark]} onPress={() => onNavigate?.(2)}>
                  <View style={[styles.iconWrapper, { backgroundColor: '#eff6ff' }]}>
                      <Box size={24} color="#3b82f6" />
                  </View>
                  <Text style={[styles.value, isDarkMode && styles.textDark]}>45</Text>
                  <Text style={styles.label}>Itens Cadastrados</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.card, isDarkMode && styles.cardDark]} onPress={() => onNavigate?.(4)}>
                  <View style={[styles.iconWrapper, { backgroundColor: '#f0fdf4' }]}>
                      <ArrowDownRight size={24} color="#22c55e" />
                  </View>
                  <Text style={[styles.value, isDarkMode && styles.textDark]}>12</Text>
                  <Text style={styles.label}>NF-e Entrada</Text>
              </TouchableOpacity>
          </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  containerDark: { backgroundColor: '#0f172a' },
  content: { padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { flex: 1, minWidth: '45%', backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  cardDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  iconWrapper: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  value: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
  label: { fontSize: 13, color: '#64748b' },
  textDark: { color: '#f8fafc' }
});
