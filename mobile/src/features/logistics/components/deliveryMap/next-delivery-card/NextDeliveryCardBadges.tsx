import React from 'react';
import { View, Text } from 'react-native';
import { RotateCcw, Wrench, Package, Truck } from 'lucide-react-native';
import { MobileDrill } from '../../../../../components/shared/MobileDrill';
import { DeliveryServiceClassification } from '../../../domain/deliveryServiceClassification';
import { styles } from './nextDeliveryCard.styles';

interface Props {
  classification: DeliveryServiceClassification;
}

export const NextDeliveryCardBadges: React.FC<Props> = ({ classification }) => {
  const {
    isReturn,
    isAssistance,
    isPickup,
    serviceLabel,
    hasInternalAssembly,
    hasOutsideAssembly,
    badgeBackgroundColor,
  } = classification;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
      <View style={[styles.opBadge, { backgroundColor: badgeBackgroundColor }]}>
        {isReturn ? (
          <RotateCcw size={10} color="#fff" />
        ) : isAssistance ? (
          <Wrench size={10} color="#fff" />
        ) : isPickup ? (
          <Package size={10} color="#fff" />
        ) : (
          <Truck size={10} color="#fff" />
        )}
        <Text style={styles.opBadgeText}>{serviceLabel}</Text>
      </View>

      {hasInternalAssembly && (
        <View
          style={[styles.opBadge, styles.opBadgeDepot]}
          accessible
          accessibilityRole="image"
          accessibilityLabel="Montagem no depósito"
        >
          <MobileDrill size={11} color="#fff" />
          <Text style={styles.opBadgeText}>MONTAGEM NO DEPÓSITO</Text>
        </View>
      )}

      {hasOutsideAssembly && (
        <View
          style={[styles.opBadge, styles.opBadgeOutside]}
          accessible
          accessibilityRole="image"
          accessibilityLabel="Montagem fora"
        >
          <MobileDrill size={11} color="#fff" />
          <Text style={styles.opBadgeText}>MONTAGEM FORA</Text>
        </View>
      )}
    </View>
  );
};
