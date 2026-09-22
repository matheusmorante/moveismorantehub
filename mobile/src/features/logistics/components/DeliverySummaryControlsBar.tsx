import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Volume2 } from 'lucide-react-native';

interface DeliverySummaryControlsBarProps {
  isGeminiQuotaExceeded: boolean;
}

export const DeliverySummaryControlsBar: React.FC<DeliverySummaryControlsBarProps> = ({
  isGeminiQuotaExceeded,
}) => {
  return (
    <View style={styles.controlsRow}>
      <View style={styles.toggleSwitchContainer}>
        <Volume2 size={14} color="#ffffff" style={{ marginLeft: 8, marginRight: 6 }} />
        <Text style={[styles.toggleSwitchText, isGeminiQuotaExceeded && styles.toggleSwitchTextUnavailable]}>
          Gemini IA
        </Text>
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
  toggleSwitchText: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    color: '#dbeafe',
    fontSize: 11,
    fontWeight: '900',
  },
  toggleSwitchTextUnavailable: {
    color: '#fca5a5',
  },
});
