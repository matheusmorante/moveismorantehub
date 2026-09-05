import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { Check, AlertTriangle, Store } from 'lucide-react-native';
import { DeliveryRouteItem } from '../../hooks/useDeliveryRoute';

interface Props {
  item?: DeliveryRouteItem;
  isStore?: boolean;
  storeCoords?: { latitude: number; longitude: number };
  isSelected?: boolean;
  onPress?: () => void;
}

export const DeliveryMarker: React.FC<Props> = ({
  item,
  isStore = false,
  storeCoords,
  isSelected = false,
  onPress,
}) => {
  if (isStore && storeCoords) {
    return (
      <Marker
        coordinate={storeCoords}
        title="Depósito Móveis Morante"
        description="Ponto de Saída e Retorno"
        anchor={{ x: 0.5, y: 1 }}
      >
        <View style={styles.storePin}>
          <Store size={14} color="#ffffff" />
        </View>
        <View style={styles.pinTipStore} />
      </Marker>
    );
  }

  if (!item || !item.coords) return null;

  const isCompleted = item.status === 'completed';
  const isUnattended = item.status === 'unattended';
  const isCurrent = item.isCurrent;
  const isFixedTime = item.scheduleSlot?.isFixedTime;

  let backgroundColor = '#2563eb'; // 🔵 Pendente padrão (Azul Morante)
  let borderColor = isSelected ? '#fbbf24' : '#ffffff';

  if (isCurrent) {
    backgroundColor = '#16a34a'; // 🚚 Em Rota / Em Atendimento (Verde Destaque)
    borderColor = isSelected ? '#fbbf24' : '#dcfce7';
  } else if (isFixedTime) {
    backgroundColor = '#7c3aed'; // 🔒 Horário Fixo / Restrito (Roxo)
    borderColor = isSelected ? '#fbbf24' : '#ede9fe';
  } else if (isCompleted) {
    backgroundColor = '#10b981'; // 🟢 Concluída (Verde)
    borderColor = isSelected ? '#fbbf24' : '#a7f3d0';
  } else if (isUnattended) {
    backgroundColor = '#ef4444'; // 🔴 Não Atendida
    borderColor = isSelected ? '#fbbf24' : '#fecaca';
  }

  return (
    <Marker
      coordinate={item.coords}
      anchor={{ x: 0.5, y: 1 }}
      onPress={onPress}
      tracksViewChanges={false}
      zIndex={isSelected ? 60 : isCurrent ? 40 : 20}
    >
      <View style={[styles.markerContainer, (isCurrent || isSelected) && styles.markerHighlight]}>
        <View style={[
          styles.markerBadge,
          { backgroundColor, borderColor },
          isSelected && styles.markerBadgeSelected
        ]}>
          {isCompleted ? (
            <Check size={14} color="#ffffff" strokeWidth={3} />
          ) : isUnattended ? (
            <AlertTriangle size={12} color="#ffffff" strokeWidth={3} />
          ) : isCurrent ? (
            <View style={styles.currentDot} />
          ) : isFixedTime ? (
            <Text style={styles.fixedLockIcon}>🔒</Text>
          ) : (
            <View style={styles.standardDot} />
          )}
        </View>
        <View style={[styles.pinTip, { borderTopColor: backgroundColor }]} />
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerHighlight: {
    transform: [{ scale: 1.15 }],
  },
  markerBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  markerBadgeSelected: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3.5,
    elevation: 8,
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  standardDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
  },
  currentDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  fixedLockIcon: {
    fontSize: 12,
  },
  pinTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  storePin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0f172a',
    borderWidth: 2,
    borderColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  pinTipStore: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#0f172a',
    marginTop: -1,
    alignSelf: 'center',
  },
});
