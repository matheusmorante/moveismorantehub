import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle, Clock } from 'lucide-react-native';

interface Props {
  total: number;
  completed: number;
  pending: number;
  percent: number;
  remainingKm?: number;
  remainingMin?: number;
  isDarkMode?: boolean;
}

export const RouteProgressHeader: React.FC<Props> = ({
  total,
  completed,
  pending,
  percent,
  remainingKm,
  remainingMin,
  isDarkMode = false,
}) => {
  if (total === 0) return null;

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={styles.topRow}>
        <View style={styles.progressLeftGroup}>
          <CheckCircle size={14} color="#10b981" />
          <Text style={[styles.progressText, isDarkMode && styles.textLight]} numberOfLines={1}>
            <Text style={{ fontWeight: '900' }}>{completed}</Text> de {total} concluídas
          </Text>
        </View>

        <Text style={[styles.pendingText, isDarkMode && styles.textMuted]}>
          {percent}%
        </Text>
      </View>

      {/* Barra de Progresso */}
      <View style={[styles.progressBarTrack, isDarkMode && styles.progressBarTrackDark]}>
        <View style={[styles.progressBarFill, { width: `${Math.min(100, Math.max(0, percent))}%` }]} />
      </View>

      {/* Estimativas do Roteiro Restante Inteiro */}
      {(remainingKm || remainingMin) ? (
        <View style={styles.metricsRow}>
          <Text style={[styles.estimateText, isDarkMode && styles.textMuted]} numberOfLines={2}>
            <Text style={{ fontWeight: '800' }}>Roteiro restante:</Text>{' '}
            {remainingKm ? `${remainingKm.toFixed(1)} km` : ''}
            {remainingKm && remainingMin ? ' · ' : ''}
            {remainingMin ? (
              remainingMin >= 60 
                ? `~${Math.floor(remainingMin / 60)}h${remainingMin % 60 ? `${remainingMin % 60}min` : ''}` 
                : `~${remainingMin} min`
            ) : ''}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  containerDark: {
    backgroundColor: '#0f172a',
    borderBottomColor: '#1e293b',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 5,
  },
  progressLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    minWidth: 0,
  },
  progressText: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '700',
    flexShrink: 1,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    flexShrink: 0,
  },
  progressBarTrack: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
  },
  progressBarTrackDark: {
    backgroundColor: '#334155',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 2.5,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    flexWrap: 'wrap',
  },
  estimateText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563eb',
    lineHeight: 15,
  },
  textLight: {
    color: '#f8fafc',
  },
  textMuted: {
    color: '#94a3b8',
  },
});
