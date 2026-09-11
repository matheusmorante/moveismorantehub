import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Calendar, ChevronRight, ChevronDown, AlertCircle } from 'lucide-react-native';

export interface SectionData {
  title: string;
  count: number;
  key: string;
  data: any[];
}

interface Props {
  section: SectionData;
  isCollapsed: boolean;
  isDarkMode: boolean;
  onToggle: (key: string) => void;
}

export const LogisticsOrderSectionHeader: React.FC<Props> = ({
  section,
  isCollapsed,
  isDarkMode,
  onToggle,
}) => {
  const isPending = section.key === 'sem_data';
  const isEmpty = section.count === 0;

  let headerStyle = styles.stickySectionHeaderDefault;
  if (isPending) headerStyle = styles.stickySectionHeaderPending;
  else if (isEmpty) headerStyle = styles.stickySectionHeaderEmpty;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onToggle(section.key)}
      style={[
        styles.stickySectionHeader,
        headerStyle,
        isDarkMode && styles.stickySectionHeaderDark
      ]}
    >
      <View style={styles.titleRow}>
        {isPending ? (
          <AlertCircle size={16} color="#d97706" />
        ) : (
          <Calendar size={16} color={isEmpty ? (isDarkMode ? '#475569' : '#94a3b8') : '#2563eb'} />
        )}
        <Text style={[
          styles.stickySectionTitle,
          isPending && { color: '#92400e' },
          isEmpty && { color: isDarkMode ? '#64748b' : '#94a3b8' },
          isDarkMode && styles.textDark
        ]}>
          {section.title}
        </Text>
      </View>

      <View style={styles.badgeRow}>
        <View style={[
          styles.stickySectionBadge,
          isPending && { backgroundColor: '#d97706' },
          isEmpty && { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }
        ]}>
          <Text style={[
            styles.stickySectionBadgeText,
            isEmpty && { color: isDarkMode ? '#cbd5e1' : '#64748b' }
          ]}>
            {section.count} {section.count === 1 ? 'item' : 'itens'}
          </Text>
        </View>
        {isCollapsed ? (
          <ChevronRight size={18} color={isPending ? '#d97706' : (isEmpty ? '#94a3b8' : '#2563eb')} />
        ) : (
          <ChevronDown size={18} color={isPending ? '#d97706' : (isEmpty ? '#94a3b8' : '#2563eb')} />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  stickySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginVertical: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  stickySectionHeaderDefault: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe'
  },
  stickySectionHeaderPending: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a'
  },
  stickySectionHeaderEmpty: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0'
  },
  stickySectionHeaderDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155'
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stickySectionTitle: { fontSize: 13, fontWeight: '900', color: '#1e3a8a' },
  stickySectionBadge: { backgroundColor: '#2563eb', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  stickySectionBadgeText: { fontSize: 10, fontWeight: '900', color: '#ffffff' },
  textDark: { color: '#f8fafc' },
});
