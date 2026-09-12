import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { Crosshair, Maximize2 } from 'lucide-react-native';
import { DeliveryMarker } from './DeliveryMarker';
import { DeliveryRouteItem } from '../../hooks/useDeliveryRoute';
import { DriverCoordinates } from '../../../../services/locationService';
import { TeamMemberLocation } from '../../../../services/teamLocationService';

interface Props {
  items: DeliveryRouteItem[];
  driverCoords: DriverCoordinates | null;
  storeCoords?: { latitude: number; longitude: number };
  polylineCoords?: { latitude: number; longitude: number }[];
  selectedItem: DeliveryRouteItem | null;
  onSelectMarker: (item: DeliveryRouteItem) => void;
  isDarkMode?: boolean;
  teamMembers?: TeamMemberLocation[];
}

export const DeliveryMapView: React.FC<Props> = ({
  items,
  driverCoords,
  storeCoords,
  polylineCoords,
  selectedItem,
  onSelectMarker,
  isDarkMode = false,
  teamMembers = [],
}) => {
  const mapRef = useRef<MapView | null>(null);

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

  // Região padrão inicial (Curitiba / RMC - R. Cascavel, 306, lado esquerdo)
  const initialRegion = {
    latitude: isValidCoord(storeCoords) ? storeCoords!.latitude : -25.35205,
    longitude: isValidCoord(storeCoords) ? storeCoords!.longitude : -49.16948,
    latitudeDelta: 0.12,
    longitudeDelta: 0.12,
  };

  // Enquadra todos os pontos relevantes do roteiro com segurança
  const fitAllPoints = () => {
    if (!mapRef.current) return;

    const points: { latitude: number; longitude: number }[] = [];

    if (isValidCoord(driverCoords)) points.push(driverCoords!);
    if (isValidCoord(storeCoords)) points.push(storeCoords!);

    items.forEach((item) => {
      if (isValidCoord(item.coords)) points.push(item.coords!);
    });

    if (points.length > 0) {
      try {
        mapRef.current.fitToCoordinates(points, {
          edgePadding: { top: 70, right: 60, bottom: 220, left: 60 },
          animated: true,
        });
      } catch (e) {
        console.warn('[DeliveryMapView] Exceção ao enquadrar coordenadas:', e);
      }
    }
  };

  // Centraliza na posição do motorista
  const centerOnDriver = () => {
    if (!mapRef.current || !isValidCoord(driverCoords)) return;
    try {
      mapRef.current.animateToRegion(
        {
          latitude: driverCoords!.latitude,
          longitude: driverCoords!.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        800
      );
    } catch (e) {
      console.warn('[DeliveryMapView] Exceção ao centralizar no motorista:', e);
    }
  };

  const [mapReady, setMapReady] = React.useState(false);

  // Ao montar ou mudar pontos, enquadra o roteiro suavemente assim que o mapa estiver pronto
  useEffect(() => {
    if (!mapReady) return;
    const timer = setTimeout(() => {
      fitAllPoints();
    }, 400);
    return () => clearTimeout(timer);
  }, [mapReady, items.length, !!driverCoords]);

  const validPolyline = (polylineCoords || []).filter(isValidCoord);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        loadingEnabled={false}
        onMapReady={() => setMapReady(true)}
      >
        {/* Marcador da Posição do Motorista / Entregador (🚚) */}
        {isValidCoord(driverCoords) && (
          <DeliveryMarker isDriver driverCoords={driverCoords!} />
        )}

        {/* Marcador do Depósito / Loja */}
        {isValidCoord(storeCoords) && (
          <DeliveryMarker isStore storeCoords={storeCoords!} />
        )}

        {/* Marcadores das Entregas do Roteiro */}
        {items.map((item) => (
          isValidCoord(item.coords) ? (
            <DeliveryMarker
              key={item.id}
              item={item}
              onPress={() => onSelectMarker(item)}
            />
          ) : null
        ))}

        {/* Marcadores dos Outros Membros da Equipe (com ? vermelho se desligado/sem GPS) */}
        {teamMembers.map((member) => (
          isValidCoord(member.coords) ? (
            <DeliveryMarker
              key={`team-${member.userId}`}
              isTeamMember
              teamMember={member}
            />
          ) : null
        ))}

        {/* Linha do Trajeto Recomendado (Routes API) */}
        {validPolyline.length > 1 && (
          <Polyline
            coordinates={validPolyline}
            strokeWidth={4.5}
            strokeColor="#2563eb"
            lineDashPattern={[8, 8]}
          />
        )}
      </MapView>

      {/* Controles Flutuantes do Mapa */}
      <View style={styles.controlsContainer}>
        {driverCoords && (
          <TouchableOpacity
            style={[styles.controlBtn, isDarkMode && styles.controlBtnDark]}
            onPress={centerOnDriver}
            activeOpacity={0.85}
            accessibilityLabel="Minha localização"
            accessibilityHint="Centraliza o mapa na sua posição atual em rota"
          >
            <Crosshair size={20} color="#2563eb" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.controlBtn, isDarkMode && styles.controlBtnDark]}
          onPress={fitAllPoints}
          activeOpacity={0.85}
          accessibilityLabel="Enquadrar roteiro"
          accessibilityHint="Enquadra todas as paradas do roteiro no mapa"
        >
          <Maximize2 size={18} color="#475569" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  controlsContainer: {
    position: 'absolute',
    right: 12,
    top: 12,
    gap: 8,
  },
  controlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  controlBtnDark: {
    backgroundColor: '#1e293b',
  },
});
