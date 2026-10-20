import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Calendar, RefreshCw } from 'lucide-react-native';
import type { EffectiveScheduleResolution } from '../../../../../../shared-utils/commercialSchedulingRules';

interface ScheduleAlternativesInfoProps {
  scheduleRes: EffectiveScheduleResolution;
  isDarkMode?: boolean;
}

export const ScheduleAlternativesInfo: React.FC<ScheduleAlternativesInfoProps> = ({
  scheduleRes,
  isDarkMode = false,
}) => {
  const { isUsingAlternative, effective, alternatives, primary } = scheduleRes;

  if (alternatives.length === 0 && !isUsingAlternative) {
    return null;
  }

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {isUsingAlternative && effective && (
        <View style={styles.repositionedRow}>
          <RefreshCw size={12} color="#b45309" />
          <Text style={styles.repositionedText}>
            Data definida expirou · Reposicionado para {effective.label} ({effective.formattedDate})
          </Text>
        </View>
      )}

      {alternatives.length > 0 && (
        <View style={styles.alternativesRow}>
          <Calendar size={12} color="#64748b" />
          <Text style={[styles.alternativesLabel, isDarkMode && styles.textMuted]}>
            Alternativas:{' '}
            <Text style={[styles.alternativesValues, isDarkMode && styles.textLight]}>
              {alternatives.map((alt) => alt.formattedSummary).join(' • ')}
            </Text>
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 4,
  },
  containerDark: {
    borderTopColor: '#334155',
  },
  repositionedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  repositionedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400e',
    flex: 1,
  },
  alternativesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 2,
  },
  alternativesLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    flex: 1,
  },
  alternativesValues: {
    fontWeight: '700',
    color: '#334155',
  },
  textMuted: {
    color: '#94a3b8',
  },
  textLight: {
    color: '#f8fafc',
  },
});
