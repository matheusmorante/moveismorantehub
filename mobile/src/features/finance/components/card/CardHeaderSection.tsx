import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { CardVisualState } from '../TransactionPreviewCard';

interface Props {
  cardState: CardVisualState;
  cardTitleType: string;
  badgeBg: string;
  badgeColor: string;
  isDarkMode?: boolean;
}

export const CardHeaderSection: React.FC<Props> = ({
  cardState,
  cardTitleType,
  badgeBg,
  badgeColor,
}) => {
  return (
    <View style={styles.headerRow}>
      <View style={styles.headerTitleGroup}>
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          {cardState === 'NEEDS_INPUT' && <AlertTriangle size={12} color="#92400e" style={{ marginRight: 4 }} />}
          <Text style={[styles.badgeText, { color: badgeColor }]}>{cardTitleType}</Text>
        </View>
        <Text style={styles.subtleCheckHint}>Confira antes de registrar</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subtleCheckHint: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
