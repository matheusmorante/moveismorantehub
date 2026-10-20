import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MobileDrill } from '../../../../components/shared/MobileDrill';

interface ScheduleCardBadgesProps {
  activityLabel: string;
  activityColor: string;
  activityBackgroundColor: string;
  statusBadgeConfig?: { label: string; bg: string; color: string } | null;
  hasDepotAssembly: boolean;
  hasOutsideAssembly: boolean;
  hasWallInstallation: boolean;
  isDarkMode?: boolean;
}

export const ScheduleCardBadges: React.FC<ScheduleCardBadgesProps> = ({
  activityLabel,
  activityColor,
  activityBackgroundColor,
  statusBadgeConfig,
  hasDepotAssembly,
  hasOutsideAssembly,
  hasWallInstallation,
  isDarkMode = false,
}) => (
  <View style={styles.headerLeft}>
    <View style={[styles.activityBadge, { backgroundColor: activityBackgroundColor }]}>
      <Text style={[styles.activityBadgeText, { color: activityColor }]}>{activityLabel}</Text>
    </View>

    {statusBadgeConfig && (
      <View style={[styles.activityBadge, { backgroundColor: statusBadgeConfig.bg }]}>
        <Text style={[styles.activityBadgeText, { color: statusBadgeConfig.color }]}>
          {statusBadgeConfig.label}
        </Text>
      </View>
    )}

    {hasDepotAssembly && (
      <View style={[styles.drillBadge, styles.drillBadgeDepot]}>
        <MobileDrill size={11} color="#ffffff" />
      </View>
    )}

    {hasOutsideAssembly && (
      <View style={[styles.drillBadge, styles.drillBadgeOutside]}>
        <MobileDrill size={11} color="#ffffff" />
      </View>
    )}

    {hasWallInstallation && (
      <View style={[styles.wallBadge, isDarkMode && styles.wallBadgeDark]}>
        <Text style={styles.wallBadgeText}>🧱 AÉREO</Text>
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  activityBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activityBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  drillBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  drillBadgeDepot: {
    backgroundColor: '#d97706',
  },
  drillBadgeOutside: {
    backgroundColor: '#dc2626',
  },
  wallBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  wallBadgeDark: {
    backgroundColor: '#334155',
    borderColor: '#475569',
  },
  wallBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
  },
});
