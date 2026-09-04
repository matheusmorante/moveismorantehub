import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { Crosshair, Maximize2 } from 'lucide-react-native';
import { DeliveryMarker } from './DeliveryMarker';
import { DeliveryRouteItem } from '../../hooks/useDeliveryRoute';
import { DriverCoordinates } from '../../../../services/locationService';

interface Props {
  items: DeliveryRouteItem[];
  driverCoords: DriverCoordinates | null;
  storeCoords?: { latitude: number; longitude: number };
  polylineCoords?: { latitude: number; longitude: number }[];
  selectedItem: DeliveryRouteItem | null;
  onSelectMarker: (item: DeliveryRouteItem) => void;
  isDarkMode?: boolean;
}

export const DeliveryMapView: React.FC<Props> = ({
  items,
  driverCoords,
  storeCoords,
  polylineCoords,
  selectedItem,
  onSelectMarker,
  isDarkMode = false,
}) => {
  const mapRef = useRef<MapView | null>(null);

  // Região padrão inicial (Curitiba / Colombo / RMC)
  const initialRegion = {
    latitude: storeCoords?.latitude || -25.352,
    longitude: storeCoords?.longitude || -49.169,
    latitudeDelta: 0.12,
    longitudeDelta: 0.12,
  };

  // Enquadra todos os pontos relevantes do roteiro
  const fitAllPoints = () => {
    if (!mapRef.current) return;

    const points: { latitude: number; longitude: number }[] = [];

    if (driverCoords) points.push(driverCoords);
    if (storeCoords) points.push(storeCoords);

    items.forEach((item) => {
      if (item.coords) points.push(item.coords);
    });

    if (points.length > 0) {
      mapRef.current.fitToCoordinates(points, {
        edgePadding: { top: 70, right: 60, bottom: 220, left: 60 },
        animated: true,
      });
    }
  };

  // Centraliza na posição do motorista
  const centerOnDriver = () => {
    if (!mapRef.current || !driverCoords) return;
    mapRef.current.animateToRegion(
      {
        latitude: driverCoords.latitude,
        longitude: driverCoords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      800
    );
  };

  // Ao montar ou mudar pontos, enquadra o roteiro suavemente
  useEffect(() => {
    const timer = setTimeout(() => {
      fitAllPoints();
    }, 600);
    return () => clearTimeout(timer);
  }, [items.length, !!driverCoords]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        loadingEnabled={true}
      >
        {/* Marcador do Depósito / Loja */}
        {storeCoords && (
          <DeliveryMarker isStore storeCoords={storeCoords} />
        )}

        {/* Marcadores das Entregas do Roteiro */}
        {items.map((item) => (
          <DeliveryMarker
            key={item.id}
            item={item}
            onPress={() => onSelectMarker(item)}
          />
        ))}

        {/* Linha do Trajeto (Routes API) */}
        {polylineCoords && polylineCoords.length > 1 && (
          <Polyline
            coordinates={polylineCoords}
            strokeWidth={4.5}
            strokeColor="#2563eb"
            lineDashPattern={[0]}
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
          >
            <Crosshair size={20} color="#2563eb" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.controlBtn, isDarkMode && styles.controlBtnDark]}
          onPress={fitAllPoints}
          activeOpacity={0.85}
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
    right: 16,
    top: 16,
    gap: 10,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
