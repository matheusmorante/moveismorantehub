import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Calendar, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react-native';

interface LogisticsDateSectionHeaderProps {
  dateKey: string;
  label: string;
  count: number;
  isPending: boolean;
  isToday: boolean;
  isCollapsed: boolean;
  onToggle: (dateKey: string) => void;
  isDarkMode?: boolean;
}

export const LogisticsDateSectionHeader: React.FC<LogisticsDateSectionHeaderProps> = ({
  dateKey,
  label,
  count,
  isPending,
  isToday,
  isCollapsed,
  onToggle,
  isDarkMode = false,
}) => (
  <TouchableOpacity
    style={[
      styles.sectionHeader,
      isDarkMode && styles.sectionHeaderDark,
      isPending && styles.sectionHeaderPending,
      isToday && styles.sectionHeaderToday,
    ]}
    onPress={() => onToggle(dateKey)}
    activeOpacity={0.8}
  >
    <View style={styles.sectionHeaderLeft}>
      {isPending ? (
        <AlertCircle size={16} color="#d97706" />
      ) : (
        <Calendar size={16} color={isToday ? '#2563eb' : isDarkMode ? '#94a3b8' : '#64748b'} />
      )}
      <Text
        style={[
          styles.sectionHeaderText,
          isDarkMode && styles.textDark,
          isPending && styles.textPending,
          isToday && styles.textToday,
        ]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.badgeCount,
          isDarkMode && styles.badgeCountDark,
          isPending && styles.badgeCountPending,
          isToday && styles.badgeCountToday,
        ]}
      >
        <Text
          style={[
            styles.badgeCountText,
            isDarkMode && styles.badgeCountTextDark,
            isPending && styles.badgeCountTextPending,
            isToday && styles.badgeCountTextToday,
          ]}
        >
          {count}
        </Text>
      </View>
    </View>

    {isCollapsed ? (
      <ChevronRight size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
    ) : (
      <ChevronDown size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    marginBottom: 8,
    marginTop: 6,
  },
  sectionHeaderDark: {
    backgroundColor: '#1e293b',
  },
  sectionHeaderPending: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  sectionHeaderToday: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  textDark: {
    color: '#f8fafc',
  },
  textPending: {
    color: '#b45309',
  },
  textToday: {
    color: '#1d4ed8',
  },
  badgeCount: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  badgeCountDark: {
    backgroundColor: '#334155',
  },
  badgeCountPending: {
    backgroundColor: '#fef3c7',
  },
  badgeCountToday: {
    backgroundColor: '#dbeafe',
  },
  badgeCountText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#475569',
  },
  badgeCountTextDark: {
    color: '#cbd5e1',
  },
  badgeCountTextPending: {
    color: '#b45309',
  },
  badgeCountTextToday: {
    color: '#1d4ed8',
  },
});
