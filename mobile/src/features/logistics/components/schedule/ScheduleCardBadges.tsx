import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MobileDrill } from '../../../../components/shared/MobileDrill';

interface ScheduleCardBadgesProps {
  activityLabel: string;
  activityColor: string;
  activityBackgroundColor: string;
  hasDepotAssembly: boolean;
  hasOutsideAssembly: boolean;
  hasWallInstallation: boolean;
  showActivityLabel?: boolean;
  isDarkMode?: boolean;
}

export const ScheduleCardBadges: React.FC<ScheduleCardBadgesProps> = ({
  activityLabel,
  activityColor,
  activityBackgroundColor,
  hasDepotAssembly,
  hasOutsideAssembly,
  hasWallInstallation,
  showActivityLabel = true,
  isDarkMode = false,
}) => {
  const hasBadges =
    showActivityLabel ||
    hasDepotAssembly ||
    hasOutsideAssembly ||
    hasWallInstallation;

  if (!hasBadges) return null;

  return (
    <View style={styles.headerLeft}>
      {showActivityLabel && (
        <View style={[styles.activityBadge, { backgroundColor: activityBackgroundColor }]}>
          <Text style={[styles.activityBadgeText, { color: activityColor }]}>{activityLabel}</Text>
        </View>
      )}

      {hasDepotAssembly && (
        <View
          style={[styles.drillBadge, styles.drillBadgeDepot]}
          accessible
          accessibilityRole="image"
          accessibilityLabel="Montagem no depósito"
        >
          <MobileDrill size={11} color="#ffffff" />
          <Text style={styles.drillBadgeText}>MONTAGEM NO DEPÓSITO</Text>
        </View>
      )}

      {hasOutsideAssembly && (
        <View
          style={[styles.drillBadge, styles.drillBadgeOutside]}
          accessible
          accessibilityRole="image"
          accessibilityLabel="Montagem fora do depósito"
        >
          <MobileDrill size={11} color="#ffffff" />
          <Text style={styles.drillBadgeText}>MONTAGEM FORA</Text>
        </View>
      )}

      {hasWallInstallation && (
        <View style={[styles.wallBadge, isDarkMode && styles.wallBadgeDark]}>
          <Text style={styles.wallBadgeText}>🧱 AÉREO</Text>
        </View>
      )}
    </View>
  );
};

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
    minHeight: 22,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  drillBadgeDepot: {
    backgroundColor: '#f59e0b',
    borderColor: '#d97706',
    borderWidth: 1,
  },
  drillBadgeOutside: {
    backgroundColor: '#dc2626',
    borderColor: '#b91c1c',
    borderWidth: 1,
  },
  drillBadgeText: { color: '#ffffff', fontSize: 8, fontWeight: '900', letterSpacing: 0.25 },
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
