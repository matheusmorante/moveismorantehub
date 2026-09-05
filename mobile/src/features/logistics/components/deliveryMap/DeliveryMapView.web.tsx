import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { Crosshair, Maximize2, AlertCircle, RefreshCw } from 'lucide-react-native';
import { DeliveryRouteItem } from '../../hooks/useDeliveryRoute';
import { DriverCoordinates } from '../../../../services/locationService';
import { getGoogleApiKey } from '../../services/googleRoutesService';
import { isValidCoordinate } from '../../utils/externalMapsNavigation';
import { loadGoogleMapsScript } from './googleMapsScriptLoader';
import { createMarkerIconSvg, MapMarkerType } from './googleMapsMarkerIcons';

interface Props {
  items: DeliveryRouteItem[];
  driverCoords: DriverCoordinates | null;
  storeCoords?: { latitude: number; longitude: number };
  polylineCoords?: { latitude: number; longitude: number }[];
  selectedItem: DeliveryRouteItem | null;
  onSelectMarker: (item: DeliveryRouteItem) => void;
  onDeselectMarker?: () => void;
  isDarkMode?: boolean;
}

export const DeliveryMapView: React.FC<Props> = ({
  items,
  driverCoords,
  storeCoords,
  polylineCoords,
  selectedItem,
  onSelectMarker,
  onDeselectMarker,
  isDarkMode = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inicializa o Google Maps JavaScript API
  const initMap = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const apiKey = await getGoogleApiKey();
      if (!apiKey) {
        throw new Error('Chave de API do Google Maps não configurada');
      }

      await loadGoogleMapsScript(apiKey);

      if (!mapContainerRef.current || !window.google?.maps) return;

      const centerLat = storeCoords?.latitude || -25.352;
      const centerLng = storeCoords?.longitude || -49.169;

      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: { lat: centerLat, lng: centerLng },
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_TOP,
        },
      });

      // Clique em área livre do mapa limpa a seleção
      map.addListener('click', () => {
        onDeselectMarker?.();
      });

      mapInstanceRef.current = map;
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      setError('Não foi possível carregar o mapa. Verifique a conexão.');
    }
  }, [storeCoords?.latitude, storeCoords?.longitude, onDeselectMarker]);

  useEffect(() => {
    void initMap();
  }, [initMap]);

  // Enquadra todos os pontos no mapa com padding adequado para não cobrir com o card flutuante
  const fitAllPoints = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google?.maps) return;

    const bounds = new window.google.maps.LatLngBounds();
    let hasPoints = false;

    if (storeCoords && isValidCoordinate(storeCoords.latitude, storeCoords.longitude)) {
      bounds.extend({ lat: storeCoords.latitude, lng: storeCoords.longitude });
      hasPoints = true;
    }

    if (driverCoords && isValidCoordinate(driverCoords.latitude, driverCoords.longitude)) {
      bounds.extend({ lat: driverCoords.latitude, lng: driverCoords.longitude });
      hasPoints = true;
    }

    items.forEach((item) => {
      if (item.coords && isValidCoordinate(item.coords.latitude, item.coords.longitude)) {
        bounds.extend({ lat: item.coords.latitude, lng: item.coords.longitude });
        hasPoints = true;
      }
    });

    if (hasPoints) {
      map.fitBounds(bounds, {
        top: 60,
        right: 50,
        bottom: 240, // Padding inferior para o NextDeliveryCard flutuante
        left: 50,
      });
    }
  }, [items, driverCoords, storeCoords]);

  // Centraliza na posição do motorista
  const centerOnDriver = () => {
    const map = mapInstanceRef.current;
    if (!map || !driverCoords) return;
    map.panTo({ lat: driverCoords.latitude, lng: driverCoords.longitude });
    map.setZoom(15);
  };

  // Renderiza e atualiza marcadores e polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google?.maps || loading) return;

    // Limpa marcadores anteriores
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // 1. Marcador do Depósito
    if (storeCoords && isValidCoordinate(storeCoords.latitude, storeCoords.longitude)) {
      const storeMarker = new window.google.maps.Marker({
        position: { lat: storeCoords.latitude, lng: storeCoords.longitude },
        map,
        title: 'Depósito Móveis Morante',
        icon: createMarkerIconSvg('#1e3a8a', 'dot', false, true),
        zIndex: 10,
      });

      const storeInfoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="font-family: sans-serif; padding: 4px 6px; color: #1e293b;">
            <div style="font-weight: 700; font-size: 13px; margin-bottom: 2px;">🏬 Depósito Móveis Morante</div>
            <div style="font-size: 11px; color: #64748b;">Ponto de saída e retorno</div>
          </div>
        `,
      });

      storeMarker.addListener('click', () => {
        storeInfoWindow.open({
          anchor: storeMarker,
          map,
        });
      });

      markersRef.current.push(storeMarker);
    }

    // 2. Marcador do Motorista
    if (driverCoords && isValidCoordinate(driverCoords.latitude, driverCoords.longitude)) {
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setMap(null);
      }
      driverMarkerRef.current = new window.google.maps.Marker({
        position: { lat: driverCoords.latitude, lng: driverCoords.longitude },
        map,
        title: 'Sua Localização',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#2563eb',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        zIndex: 100,
      });
    }

    // 3. Marcadores das Entregas (Sem números de sequência ou ordem compulsória)
    items.forEach((item) => {
      if (!item.coords || !isValidCoordinate(item.coords.latitude, item.coords.longitude)) {
        return;
      }

      const isSelected = selectedItem?.id === item.id;
      const isCompleted = item.status === 'completed';
      const isUnattended = item.status === 'unattended';
      const isCurrent = item.isCurrent;
      const isFixed = item.scheduleSlot?.isFixedTime;

      let color = '#2563eb'; // azul padrão Morante
      let markerType: 'dot' | 'lock' | 'play' | 'check' | 'alert' = 'dot';

      if (isCompleted) {
        color = '#059669'; // verde esmeralda
        markerType = 'check';
      } else if (isUnattended) {
        color = '#dc2626'; // vermelho
        markerType = 'alert';
      } else if (isCurrent) {
        color = '#16a34a'; // verde em andamento
        markerType = 'play';
      } else if (isFixed) {
        color = '#7c3aed'; // roxo para horário combinado/fixo
        markerType = 'lock';
      } else {
        // Entrega normal com período (09:00-12:00, 13:00-18:00): pin padrão limpo sem cadeado
        color = '#2563eb';
        markerType = 'dot';
      }

      const marker = new window.google.maps.Marker({
        position: { lat: item.coords.latitude, lng: item.coords.longitude },
        map,
        title: item.customerName || `Pedido #${item.orderIndex || ''}`,
        icon: createMarkerIconSvg(color, markerType, isSelected, false),
        zIndex: isSelected ? 60 : isCurrent ? 40 : 20,
      });

      marker.addListener('click', () => {
        onSelectMarker(item);
      });

      markersRef.current.push(marker);
    });

    // 4. Polyline do Trajeto (Routes API) - Apenas se houver entrega selecionada ou em andamento
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (polylineCoords && polylineCoords.length > 1 && (selectedItem || items.some((i) => i.isCurrent))) {
      const validPoints = polylineCoords.filter((p) => isValidCoordinate(p.latitude, p.longitude));
      if (validPoints.length > 1) {
        polylineRef.current = new window.google.maps.Polyline({
          path: validPoints.map((p) => ({ lat: p.latitude, lng: p.longitude })),
          strokeColor: '#2563eb',
          strokeOpacity: 0.85,
          strokeWeight: 4.5,
          map,
        });
      }
    }

    // Enquadra após criar os pontos
    const timer = setTimeout(() => {
      fitAllPoints();
    }, 400);

    return () => clearTimeout(timer);
  }, [items, storeCoords, driverCoords, polylineCoords, selectedItem?.id, loading, fitAllPoints, onSelectMarker]);

  // Redimensiona o mapa ao trocar de abas ou alterar o tamanho da janela
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google?.maps) return;

    const handleResize = () => {
      window.google.maps.event.trigger(map, 'resize');
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Container DOM real para a Google Maps JavaScript API */}
      <div
        ref={mapContainerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
        }}
      />

      {/* Estado de Carregamento */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Carregando mapa interativo...</Text>
        </View>
      )}

      {/* Estado de Erro */}
      {error && !loading && (
        <View style={styles.errorOverlay}>
          <AlertCircle size={32} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => void initMap()} style={styles.retryBtn} activeOpacity={0.8}>
            <RefreshCw size={15} color="#ffffff" />
            <Text style={styles.retryBtnText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Controles Flutuantes do Mapa */}
      {!loading && !error && (
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
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(248, 250, 252, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    zIndex: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    zIndex: 10,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 6,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  controlsContainer: {
    position: 'absolute',
    right: 16,
    top: 16,
    gap: 10,
    zIndex: 5,
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
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  controlBtnDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
});
