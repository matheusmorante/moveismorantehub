import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { Check, AlertTriangle, Store, Truck, Wrench, Package, RotateCcw } from 'lucide-react-native';
import { DeliveryRouteItem } from '../../hooks/useDeliveryRoute';
import { getOperationActivityType } from '../../../schedule/utils/operationActivity';
import { TeamMemberLocation } from '../../../../services/teamLocationService';

interface Props {
  item?: DeliveryRouteItem;
  isStore?: boolean;
  storeCoords?: { latitude: number; longitude: number };
  isDriver?: boolean;
  driverCoords?: { latitude: number; longitude: number };
  isTeamMember?: boolean;
  teamMember?: TeamMemberLocation;
  onPress?: () => void;
}

export const DeliveryMarker: React.FC<Props> = ({
  item,
  isStore = false,
  storeCoords,
  isDriver = false,
  driverCoords,
  isTeamMember = false,
  teamMember,
  onPress,
}) => {
  // tracksViewChanges dinâmico: necessário no Android para permitir que ícones e badges
  // renderizem na tela nativa antes de congelar a visualização do Marker
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    // Permite que o mapa capture a visualização inicial dos componentes filhos
    setTracksViewChanges(true);
    const timer = setTimeout(() => {
      setTracksViewChanges(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, [
    item?.status,
    item?.sequence,
    item?.isCurrent,
    item?.isNext,
    isStore,
    isDriver,
    driverCoords?.latitude,
    driverCoords?.longitude,
    isTeamMember,
    teamMember?.coords?.latitude,
    teamMember?.coords?.longitude,
    teamMember?.isDisconnectedOrNoGps,
  ]);

  const isValidCoord = (c?: { latitude?: number; longitude?: number } | null): boolean => {
    return Boolean(
      c &&
      typeof c.latitude === 'number' &&
      !isNaN(c.latitude) &&
      typeof c.longitude === 'number' &&
      !isNaN(c.longitude) &&
      Math.abs(c.latitude) <= 90 &&
      Math.abs(c.longitude) <= 180 &&
      (c.latitude !== 0 || c.longitude !== 0)
    );
  };

  if (isDriver && isValidCoord(driverCoords)) {
    return (
      <Marker
        coordinate={driverCoords!}
        title="Posição Atual"
        description="Você (Motorista / Entregador em Rota)"
        anchor={{ x: 0.5, y: 0.5 }}
        tracksViewChanges={tracksViewChanges}
      >
        <View style={styles.driverPin}>
          <Text style={styles.driverEmoji}>🚚</Text>
        </View>
      </Marker>
    );
  }

  // Marcador de Outro Membro da Equipe (com badge e alerta de '?' em vermelho se desligado/sem GPS)
  if (isTeamMember && teamMember && isValidCoord(teamMember.coords)) {
    const lastSeenTime = teamMember.lastSeen
      ? new Date(teamMember.lastSeen).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : '';
    const statusDesc = teamMember.isDisconnectedOrNoGps
      ? `Última localização às ${lastSeenTime} • Sem sinal de GPS / Desligado`
      : `Em rota • GPS Ativo (${lastSeenTime})`;

    return (
      <Marker
        coordinate={teamMember.coords}
        title={teamMember.userName}
        description={statusDesc}
        anchor={{ x: 0.5, y: 0.5 }}
        tracksViewChanges={tracksViewChanges}
        onPress={onPress}
      >
        <View style={styles.teamMemberContainer}>
          <View
            style={[
              styles.teamMemberNameBadge,
              teamMember.isDisconnectedOrNoGps && styles.teamMemberNameBadgeOffline,
            ]}
          >
            <Text style={styles.teamMemberNameText} numberOfLines={1}>
              {teamMember.userName.split(' ')[0]}
            </Text>
          </View>
          <View style={styles.teamMemberTruckWrapper}>
            <Text style={styles.driverEmoji}>🚚</Text>
            {teamMember.isDisconnectedOrNoGps ? (
              <View style={styles.questionBadge}>
                <Text style={styles.questionBadgeText}>?</Text>
              </View>
            ) : (
              <View style={styles.activeDotBadge} />
            )}
          </View>
        </View>
      </Marker>
    );
  }

  if (isStore && isValidCoord(storeCoords)) {
    return (
      <Marker
        coordinate={storeCoords!}
        title="Depósito Móveis Morante"
        description="Ponto de Saída e Retorno"
        anchor={{ x: 0.5, y: 1 }}
        tracksViewChanges={tracksViewChanges}
      >
        <View style={styles.markerContainer}>
          <View style={styles.storePin}>
            <Store size={15} color="#ffffff" />
          </View>
          <View style={styles.pinTipStore} />
        </View>
      </Marker>
    );
  }

  if (!item || !isValidCoord(item.coords)) return null;

  const isCompleted = item.status === 'completed';
  const isUnattended = item.status === 'unattended';
  const isCurrent = item.isCurrent;
  const isNext = item.isNext && !isCurrent;

  // Determinação da atividade operacional
  const activityType = getOperationActivityType(item.order);
  const isPickup = item.order?.shipping?.deliveryMethod === 'pickup';

  // Cores de fundo por tipo de pedido:
  // - Retirada: Roxo (#7c3aed)
  // - Assistência: Amarelo/Âmbar (#eab308)
  // - Coleta de Devolução: Laranja (#f97316)
  // - Entrega: Verde (#16a34a)
  let backgroundColor = '#16a34a'; // Padrão: Entrega (Verde)
  let borderColor = '#ffffff';

  if (isPickup) {
    backgroundColor = '#7c3aed'; // Retirada (Roxo)
  } else if (activityType === 'assistance') {
    backgroundColor = '#eab308'; // Assistência (Amarelo)
  } else if (activityType === 'return') {
    backgroundColor = '#f97316'; // Coleta de Devolução (Laranja)
  }

  // Se concluída ou não atendida, cores de estado têm prioridade semântica
  if (isCompleted) {
    backgroundColor = '#10b981'; // Concluída
    borderColor = '#a7f3d0';
  } else if (isUnattended) {
    backgroundColor = '#ef4444'; // Não Atendida
    borderColor = '#fecaca';
  } else if (isCurrent) {
    borderColor = '#ffffff';
  }

  return (
    <Marker
      coordinate={item.coords}
      anchor={{ x: 0.5, y: 1 }}
      onPress={onPress}
      tracksViewChanges={tracksViewChanges}
    >
      <View style={[styles.markerContainer, (isCurrent || isNext) && styles.markerHighlight]}>
        <View style={[styles.markerBadge, { backgroundColor, borderColor }]}>
          {isCompleted ? (
            <Check size={15} color="#ffffff" strokeWidth={3} />
          ) : isUnattended ? (
            <AlertTriangle size={13} color="#ffffff" strokeWidth={3} />
          ) : isPickup ? (
            <Package size={14} color="#ffffff" strokeWidth={2.5} />
          ) : activityType === 'assistance' ? (
            <Wrench size={14} color="#ffffff" strokeWidth={2.5} />
          ) : activityType === 'return' ? (
            <RotateCcw size={14} color="#ffffff" strokeWidth={2.5} />
          ) : (
            <Truck size={14} color="#ffffff" strokeWidth={2.5} />
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
  driverPin: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  driverEmoji: {
    fontSize: 28,
    lineHeight: 32,
  },
  teamMemberContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamMemberNameBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    marginBottom: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  teamMemberNameBadgeOffline: {
    backgroundColor: '#7f1d1d',
    borderColor: '#ef4444',
  },
  teamMemberNameText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ffffff',
  },
  teamMemberTruckWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 3,
    elevation: 6,
  },
  questionBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: 14,
  },
  activeDotBadge: {
    position: 'absolute',
    bottom: 2,
    right: -4,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#22c55e',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
});
