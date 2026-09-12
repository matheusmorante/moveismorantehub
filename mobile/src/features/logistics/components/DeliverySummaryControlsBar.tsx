import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Volume2 } from 'lucide-react-native';
import type { DeliveryPeriodFilter } from '../utils/deliverySummaryMetrics';
import type { VoiceEngineType } from './TodaySummaryCard';

interface DeliverySummaryControlsBarProps {
  voiceEngine: VoiceEngineType;
  isGeminiQuotaExceeded: boolean;
  onSelectGeminiVoice: () => void;
  onSelectNativeVoice: () => void;
}

export const DeliverySummaryControlsBar: React.FC<DeliverySummaryControlsBarProps> = ({
  voiceEngine,
  isGeminiQuotaExceeded,
  onSelectGeminiVoice,
  onSelectNativeVoice,
}) => {
  return (
    <View style={styles.controlsRow}>
      {/* Alternância de Voz: Gemini IA vs Voz Nativa */}
      <View style={styles.toggleSwitchContainer}>
        <Volume2 size={14} color="#ffffff" style={{ marginLeft: 8, marginRight: 6 }} />
        <TouchableOpacity
          style={[
            styles.toggleSwitchOption,
            voiceEngine === 'gemini' && styles.toggleSwitchOptionActive,
            isGeminiQuotaExceeded && { opacity: 0.4, backgroundColor: 'rgba(255,255,255,0.1)' }
          ]}
          onPress={onSelectGeminiVoice}
          disabled={isGeminiQuotaExceeded}
          activeOpacity={0.85}
        >
          <Text style={[
            styles.toggleSwitchText,
            voiceEngine === 'gemini' ? styles.toggleSwitchTextActive : styles.toggleSwitchTextInactive,
            isGeminiQuotaExceeded && { color: '#94a3b8' }
          ]}>
            Gemini IA
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleSwitchOption,
            voiceEngine === 'native' && styles.toggleSwitchOptionActive
          ]}
          onPress={onSelectNativeVoice}
          activeOpacity={0.85}
        >
          <Text style={[
            styles.toggleSwitchText,
            voiceEngine === 'native' ? styles.toggleSwitchTextActive : styles.toggleSwitchTextInactive
          ]}>
            Voz Nativa
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  toggleSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderRadius: 20,
    padding: 3,
    alignItems: 'center',
  },
  toggleSwitchOption: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 17,
  },
  toggleSwitchOptionActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleSwitchText: {
    color: '#dbeafe',
    fontSize: 11,
    fontWeight: '700',
  },
  toggleSwitchTextActive: {
    color: '#0055ff',
    fontWeight: '900',
  },
  toggleSwitchTextInactive: {
    color: '#dbeafe',
    fontWeight: '700',
  },
});
