import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Package, RotateCcw, Truck, Wrench } from 'lucide-react-native';
import { MobileDrill } from '../../shared/MobileDrill';

interface OrderTypeBadgesProps {
  assistance?: boolean;
  pickup?: boolean;
  isReturn?: boolean;
  internal?: boolean;
  outside?: boolean;
}

export function OrderTypeBadges({
  assistance,
  pickup,
  isReturn,
  internal,
  outside,
}: OrderTypeBadgesProps) {
  return (
    <View style={styles.badges}>
      <View
        style={[
          styles.badge,
          assistance
            ? styles.orange
            : isReturn
              ? styles.amber
              : pickup
                ? styles.purple
                : styles.green,
        ]}
      >
        {assistance ? (
          <Wrench size={14} color="#fff" />
        ) : isReturn ? (
          <RotateCcw size={14} color="#fff" />
        ) : pickup ? (
          <Package size={14} color="#fff" />
        ) : (
          <Truck size={14} color="#fff" />
        )}
        <Text style={styles.badgeText}>
          {assistance
            ? 'ASSISTÊNCIA'
            : isReturn
              ? 'DEVOLUÇÃO'
              : pickup
                ? 'RETIRADA'
                : 'ENTREGA'}
        </Text>
      </View>
      {internal && (
        <View style={[styles.badge, styles.orange]}>
          <MobileDrill size={14} color="#fff" />
          <Text style={styles.badgeText}>MONTAGEM DEPÓSITO</Text>
        </View>
      )}
      {outside && (
        <View style={[styles.badge, styles.red]}>
          <MobileDrill size={14} color="#fff" />
          <Text style={styles.badgeText}>MONTAGEM FORA</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  green: { backgroundColor: '#10b981' },
  purple: { backgroundColor: '#a855f7' },
  orange: { backgroundColor: '#f59e0b' },
  amber: { backgroundColor: '#d97706' },
  red: { backgroundColor: '#ef4444' },
  badgeText: { fontSize: 10, fontWeight: '900', color: '#fff' },

});
