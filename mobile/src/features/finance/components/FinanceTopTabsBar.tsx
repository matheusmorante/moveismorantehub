import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Sparkles, Receipt } from 'lucide-react-native';

interface Props {
  activeTab: 'transactions' | 'assistant';
  onSelectTab: (tab: 'transactions' | 'assistant') => void;
  isAdmin: boolean;
  isDarkMode?: boolean;
}

export const FinanceTopTabsBar: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  isAdmin,
  isDarkMode,
}) => {
  return (
    <View style={[styles.topTabsBar, isDarkMode && styles.topTabsBarDark]}>
      <TouchableOpacity
        style={[styles.topTabBtn, activeTab === 'transactions' && styles.activeTopTabBtn]}
        onPress={() => onSelectTab('transactions')}
        activeOpacity={0.7}
      >
        <Receipt size={15} color={activeTab === 'transactions' ? '#3b82f6' : isDarkMode ? '#94a3b8' : '#64748b'} />
        <Text
          style={[
            styles.topTabText,
            activeTab === 'transactions' && styles.activeTopTabText,
            isDarkMode && activeTab !== 'transactions' && styles.topTabTextDark,
          ]}
        >
          Transações
        </Text>
      </TouchableOpacity>

      {isAdmin ? (
        <TouchableOpacity
          style={[styles.topTabBtn, activeTab === 'assistant' && styles.activeTopTabBtn]}
          onPress={() => onSelectTab('assistant')}
          activeOpacity={0.7}
        >
          <Sparkles size={15} color={activeTab === 'assistant' ? '#7c3aed' : isDarkMode ? '#94a3b8' : '#64748b'} />
          <Text
            style={[
              styles.topTabText,
              activeTab === 'assistant' && styles.activeTopTabTextAssistant,
              isDarkMode && activeTab !== 'assistant' && styles.topTabTextDark,
            ]}
          >
            Agente ERP
          </Text>
          <View style={styles.betaBadge}>
            <Text style={styles.betaBadgeText}>BETA</Text>
          </View>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  topTabsBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  topTabsBarDark: {
    backgroundColor: '#1e293b',
    borderBottomColor: '#334155',
  },
  topTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    backgroundColor: '#f1f5f9',
  },
  activeTopTabBtn: {
    backgroundColor: '#ffffff',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  topTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  topTabTextDark: {
    color: '#94a3b8',
  },
  activeTopTabText: {
    color: '#3b82f6',
    fontWeight: '700',
  },
  activeTopTabTextAssistant: {
    color: '#7c3aed',
    fontWeight: '700',
  },
  betaBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#ede9fe',
  },
  betaBadgeText: {
    color: '#6d28d9',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
});
