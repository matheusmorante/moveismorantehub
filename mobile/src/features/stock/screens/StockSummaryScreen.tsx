import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Package, ArrowLeftRight, CheckSquare, Truck, ShoppingCart, FileText, Users, ArrowRight } from 'lucide-react-native';

interface Props {
  isDarkMode: boolean;
  onNavigate: (tabIndex: number) => void;
}

export const StockSummaryScreen: React.FC<Props> = ({ isDarkMode, onNavigate }) => {
  return (
    <ScrollView style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Estoque Atual</Text>
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, isDarkMode && styles.kpiCardDark]}>
            <Package size={24} color={isDarkMode ? '#60a5fa' : '#2563eb'} />
            <Text style={[styles.kpiValue, isDarkMode && styles.textDark]}>2.450</Text>
            <Text style={[styles.kpiLabel, isDarkMode && styles.textMutedDark]}>Itens em estoque</Text>
          </View>
          <View style={[styles.kpiCard, isDarkMode && styles.kpiCardDark]}>
            <CheckSquare size={24} color={isDarkMode ? '#f87171' : '#ef4444'} />
            <Text style={[styles.kpiValue, isDarkMode && styles.textDark]}>12</Text>
            <Text style={[styles.kpiLabel, isDarkMode && styles.textMutedDark]}>Estoque baixo</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Ações Rápidas</Text>
        <TouchableOpacity style={[styles.actionBtn, isDarkMode && styles.actionBtnDark]} onPress={() => onNavigate(1)}>
          <View style={[styles.actionIcon, isDarkMode && styles.actionIconDark]}>
            <ArrowLeftRight size={20} color={isDarkMode ? '#60a5fa' : '#2563eb'} />
          </View>
          <Text style={[styles.actionText, isDarkMode && styles.textDark]}>Nova movimentação</Text>
          <ArrowRight size={20} color={isDarkMode ? '#64748b' : '#94a3b8'} />
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.actionBtn, isDarkMode && styles.actionBtnDark]} onPress={() => onNavigate(5)}>
          <View style={[styles.actionIcon, isDarkMode && styles.actionIconDark]}>
            <Truck size={20} color={isDarkMode ? '#60a5fa' : '#2563eb'} />
          </View>
          <Text style={[styles.actionText, isDarkMode && styles.textDark]}>Novo recebimento</Text>
          <ArrowRight size={20} color={isDarkMode ? '#64748b' : '#94a3b8'} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, isDarkMode && styles.actionBtnDark]} onPress={() => onNavigate(2)}>
          <View style={[styles.actionIcon, isDarkMode && styles.actionIconDark]}>
            <CheckSquare size={20} color={isDarkMode ? '#60a5fa' : '#2563eb'} />
          </View>
          <Text style={[styles.actionText, isDarkMode && styles.textDark]}>Iniciar inventário</Text>
          <ArrowRight size={20} color={isDarkMode ? '#64748b' : '#94a3b8'} />
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  textDark: {
    color: '#f8fafc',
  },
  textMutedDark: {
    color: '#94a3b8',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'flex-start',
  },
  kpiCardDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 12,
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  actionBtnDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionIconDark: {
    backgroundColor: '#1e3a8a',
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
});
