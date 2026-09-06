import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { VoiceSessionState } from '../../types/VoiceSessionState';
import { LocalSemanticDelta } from '../../../../services/financialAiAssistantService';

interface Props {
  voiceState: VoiceSessionState;
  livePill?: LocalSemanticDelta | null;
  isDarkMode?: boolean;
}

export const RecordingStatusBar: React.FC<Props> = ({ voiceState, livePill, isDarkMode = false }) => {
  const isRecordingActive =
    voiceState === 'LISTENING' ||
    voiceState === 'PRE_ANALYZING' ||
    voiceState === 'FINALIZING' ||
    voiceState === 'ANALYZING';

  if (!isRecordingActive) return null;

  return (
    <View style={[styles.recordingBanner, isDarkMode && styles.recordingBannerDark]}>
      <View style={styles.recordingHeaderRow}>
        {(voiceState === 'LISTENING' || voiceState === 'PRE_ANALYZING') && (
          <View style={styles.statusGroup}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>● Ouvindo...</Text>
          </View>
        )}

        {voiceState === 'PRE_ANALYZING' && (
          <View style={styles.statusGroup}>
            <Text style={styles.statusDivider}>•</Text>
            <Sparkles size={14} color="#a855f7" style={{ marginRight: 4 }} />
            <Text style={styles.preAnalyzingText}>✦ Analisando...</Text>
          </View>
        )}

        {(voiceState === 'FINALIZING' || voiceState === 'ANALYZING') && (
          <View style={styles.statusGroup}>
            <Sparkles size={14} color="#a855f7" style={{ marginRight: 4 }} />
            <Text style={styles.preAnalyzingText}>✦ Analisando...</Text>
          </View>
        )}
      </View>

      {/* Pílula Semântica de Detecção Local */}
      {livePill && (livePill.amountsFound.length > 0 || livePill.supplierFound || livePill.categoryFound) ? (
        <View style={styles.livePillContainer}>
          {livePill.supplierFound ? (
            <View style={styles.livePillTag}>
              <Text style={styles.livePillTagText}>{livePill.supplierFound}</Text>
            </View>
          ) : null}

          {livePill.categoryFound ? (
            <View style={styles.livePillTag}>
              <Text style={styles.livePillTagText}>{livePill.categoryFound}</Text>
            </View>
          ) : null}

          {livePill.amountsFound.map((amt, idx) => (
            <View key={idx} style={[styles.livePillTag, styles.livePillTagAmount]}>
              <Text style={styles.livePillTagAmountText}>
                {amt.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  recordingBanner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  recordingBannerDark: {
    backgroundColor: '#0f172a',
    borderTopColor: '#1e293b',
  },
  recordingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginRight: 6,
  },
  recordingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  statusDivider: {
    fontSize: 12,
    color: '#94a3b8',
    marginHorizontal: 6,
  },
  preAnalyzingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7c3aed',
  },
  livePillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  livePillTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  livePillTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  livePillTagAmount: {
    backgroundColor: '#dcfce7',
  },
  livePillTagAmountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
});
