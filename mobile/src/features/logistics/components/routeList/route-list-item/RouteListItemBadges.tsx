import React from 'react';
import { View, Text } from 'react-native';
import { RotateCcw, Wrench, Package, Truck } from 'lucide-react-native';
import { MobileDrill } from '../../../../../components/shared/MobileDrill';
import { DeliveryServiceClassification } from '../../../domain/deliveryServiceClassification';
import { styles } from './routeListItem.styles';

interface Props {
  classification: DeliveryServiceClassification;
}

export const RouteListItemBadges: React.FC<Props> = ({ classification }) => {
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
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
      <View style={[styles.hBadge, { backgroundColor: badgeBackgroundColor }]}>
        {isReturn ? (
          <RotateCcw size={10} color="#fff" />
        ) : isAssistance ? (
          <Wrench size={10} color="#fff" />
        ) : isPickup ? (
          <Package size={10} color="#fff" />
        ) : (
          <Truck size={10} color="#fff" />
        )}
        <Text style={styles.hBadgeText}>{serviceLabel}</Text>
      </View>

      {hasInternalAssembly && (
        <View style={[styles.hBadge, styles.hBadgeDepot]}>
          <MobileDrill size={10} color="#fff" />
          <Text style={styles.hBadgeText}>MONTAGEM DEPÓSITO</Text>
        </View>
      )}

      {hasOutsideAssembly && (
        <View style={[styles.hBadge, styles.hBadgeOutside]}>
          <MobileDrill size={10} color="#fff" />
          <Text style={styles.hBadgeText}>MONTAGEM FORA</Text>
        </View>
      )}
    </View>
  );
};
