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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <CheckCircle size={15} color="#10b981" />
          <Text style={[styles.progressText, isDarkMode && styles.textLight]}>
            <Text style={{ fontWeight: '900' }}>{completed}</Text> de {total} concluídas
          </Text>
        </View>

        <Text style={[styles.pendingText, isDarkMode && styles.textMuted]}>
          {pending} {pending === 1 ? 'restante' : 'restantes'} ({percent}%)
        </Text>
      </View>

      {/* Barra de Progresso */}
      <View style={[styles.progressBarTrack, isDarkMode && styles.progressBarTrackDark]}>
        <View style={[styles.progressBarFill, { width: `${Math.min(100, Math.max(0, percent))}%` }]} />
      </View>

      {/* Estimativas Confiáveis (se disponíveis) */}
      {(remainingKm || remainingMin) ? (
        <View style={styles.metricsRow}>
          {remainingKm ? (
            <Text style={styles.estimateText}>{remainingKm.toFixed(1)} km restantes</Text>
          ) : null}
          {remainingKm && remainingMin ? <Text style={{ color: '#cbd5e1' }}>•</Text> : null}
          {remainingMin ? (
            <Text style={[styles.estimateText, { color: '#64748b' }]}>~{remainingMin} min estimados</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    marginBottom: 6,
  },
  progressText: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '700',
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
  },
  progressBarTrackDark: {
    backgroundColor: '#334155',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  estimateText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563eb',
  },
  textLight: {
    color: '#f8fafc',
  },
  textMuted: {
    color: '#94a3b8',
  },
});
