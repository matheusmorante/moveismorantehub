import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { Check, AlertTriangle, Store } from 'lucide-react-native';
import { DeliveryRouteItem } from '../../hooks/useDeliveryRoute';

interface Props {
  item?: DeliveryRouteItem;
  isStore?: boolean;
  storeCoords?: { latitude: number; longitude: number };
  onPress?: () => void;
}

export const DeliveryMarker: React.FC<Props> = ({
  item,
  isStore = false,
  storeCoords,
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
  const isNext = item.isNext && !isCurrent;

  let backgroundColor = '#334155'; // Pendente
  let borderColor = '#ffffff';

  if (isCurrent) {
    backgroundColor = '#2563eb'; // Em Rota / Em Atendimento (Destaque)
    borderColor = '#bfdbfe';
  } else if (isNext) {
    backgroundColor = '#0284c7'; // Próxima
    borderColor = '#bae6fd';
  } else if (isCompleted) {
    backgroundColor = '#10b981'; // Concluída
    borderColor = '#a7f3d0';
  } else if (isUnattended) {
    backgroundColor = '#ef4444'; // Não Atendida
    borderColor = '#fecaca';
  }

  return (
    <Marker
      coordinate={item.coords}
      anchor={{ x: 0.5, y: 1 }}
      onPress={onPress}
      tracksViewChanges={false}
    >
      <View style={[styles.markerContainer, (isCurrent || isNext) && styles.markerHighlight]}>
        <View style={[styles.markerBadge, { backgroundColor, borderColor }]}>
          {isCompleted ? (
            <Check size={14} color="#ffffff" strokeWidth={3} />
          ) : isUnattended ? (
            <AlertTriangle size={12} color="#ffffff" strokeWidth={3} />
          ) : (
            <Text style={styles.sequenceText}>{item.sequence}</Text>
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
  sequenceText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
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
