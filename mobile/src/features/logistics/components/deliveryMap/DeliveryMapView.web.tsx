import React, { useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Crosshair, Maximize2 } from 'lucide-react-native';
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
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const defaultLat = storeCoords?.latitude || -25.352;
  const defaultLng = storeCoords?.longitude || -49.169;

  // Escuta cliques nos marcadores enviados do iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'MARKER_CLICK') {
        const found = items.find((i) => i.id === event.data.id);
        if (found) {
          onSelectMarker(found);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [items, onSelectMarker]);

  const fitAllBounds = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'FIT_BOUNDS' }, '*');
    }
  };

  const centerDriver = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'CENTER_DRIVER' }, '*');
    }
  };

  // Constrói o HTML com Leaflet inicializado com segurança via script onload/polling
  const mapHtml = useMemo(() => {
    const pointsData = items
      .filter((i) => i.coords)
      .map((i) => ({
        id: i.id,
        seq: i.sequence,
        name: String(i.customerName || 'Consumidor').replace(/'/g, "\\'"),
        address: String(i.fullAddress || '').replace(/'/g, "\\'"),
        lat: i.coords!.latitude,
        lng: i.coords!.longitude,
        status: i.status,
        isCurrent: i.isCurrent,
        isNext: i.isNext,
      }));

    const polyData = (polylineCoords && polylineCoords.length > 0)
      ? polylineCoords.map(p => [p.latitude, p.longitude])
      : [];

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: ${isDarkMode ? '#0f172a' : '#f8fafc'}; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .leaflet-container { background: ${isDarkMode ? '#0f172a' : '#f1f5f9'}; }
    .custom-pin { display: flex; align-items: center; justify-content: center; border-radius: 50%; color: #ffffff; font-weight: 900; font-size: 13px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); cursor: pointer; }
    .pin-store { background: #0f172a; border: 2.5px solid #38bdf8; width: 34px; height: 34px; font-size: 16px; }
    .pin-driver { background: transparent; border: none; width: 34px; height: 34px; font-size: 28px; line-height: 1; box-shadow: none; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35)); }
    .pin-current { background: #2563eb; border: 3px solid #bfdbfe; width: 34px; height: 34px; font-size: 14px; transform: scale(1.1); }
    .pin-next { background: #0284c7; border: 2.5px solid #ffffff; width: 30px; height: 30px; }
    .pin-completed { background: #10b981; border: 2px solid #ffffff; width: 28px; height: 28px; }
    .pin-unattended { background: #ef4444; border: 2px solid #ffffff; width: 28px; height: 28px; }
    .pin-pending { background: #334155; border: 2px solid #ffffff; width: 28px; height: 28px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    function initMap() {
      if (typeof L === 'undefined') {
        setTimeout(initMap, 100);
        return;
      }
      
      const isDark = ${isDarkMode};
      const tileUrl = isDark 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

      const map = L.map('map', { zoomControl: false }).setView([${defaultLat}, ${defaultLng}], 13);
      L.tileLayer(tileUrl, { 
        maxZoom: 19, 
        subdomains: 'abcd',
        attribution: '© CartoDB © OpenStreetMap' 
      }).addTo(map);

      const bounds = [];

      // Depósito Central (🏬)
      const storeIcon = L.divIcon({
        className: 'custom-pin pin-store',
        html: '🏬',
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });
      L.marker([${defaultLat}, ${defaultLng}], { icon: storeIcon })
        .bindPopup('<div style="font-family:sans-serif;padding:4px;"><b>Móveis Morante — Depósito Central</b><br><span style="color:#64748b;font-size:12px;">Origem do Roteiro</span></div>')
        .addTo(map);
      bounds.push([${defaultLat}, ${defaultLng}]);

      // Motorista (🚚 Posição Atual)
      const driverLat = ${driverCoords ? driverCoords.latitude : defaultLat};
      const driverLng = ${driverCoords ? driverCoords.longitude : defaultLng};
      const driverIcon = L.divIcon({
        className: 'custom-pin pin-driver',
        html: '🚚',
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      });
      const driverMarker = L.marker([driverLat, driverLng], { icon: driverIcon })
        .bindPopup('<div style="font-family:sans-serif;padding:4px;"><b>Motorista / Entregador</b><br><span style="color:#2563eb;font-weight:700;font-size:12px;">Posição Atual em Rota</span></div>')
        .addTo(map);
      bounds.push([driverLat, driverLng]);

      // Paradas do Roteiro
      const points = ${JSON.stringify(pointsData)};
      points.forEach(p => {
        let cls = 'pin-pending';
        let symbol = p.seq;
        if (p.status === 'completed') { cls = 'pin-completed'; symbol = '✓'; }
        else if (p.status === 'unattended') { cls = 'pin-unattended'; symbol = '!'; }
        else if (p.isCurrent) { cls = 'pin-current'; symbol = p.seq; }
        else if (p.isNext) { cls = 'pin-next'; symbol = p.seq; }

        const icon = L.divIcon({
          className: 'custom-pin ' + cls,
          html: symbol,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const m = L.marker([p.lat, p.lng], { icon }).addTo(map);
        m.bindPopup(
          '<div style="font-family:sans-serif;padding:4px;min-width:180px;">' +
            '<b style="color:#1e293b;font-size:13px;">Parada ' + p.seq + ' • ' + p.name + '</b><br>' +
            '<span style="color:#64748b;font-size:11px;">' + p.address + '</span>' +
          '</div>'
        );
        m.on('click', () => {
          window.parent.postMessage({ type: 'MARKER_CLICK', id: p.id }, '*');
        });
        bounds.push([p.lat, p.lng]);
      });

      // Polyline da rota: desenha apenas quando houver trajeto explícito da parada selecionada
      const polyCoords = ${JSON.stringify(polyData)};
      if (polyCoords.length > 1) {
        L.polyline(polyCoords, { color: '#2563eb', weight: 4.5, dashArray: '7, 9', opacity: 0.85 }).addTo(map);
      }

      if (bounds.length > 0) {
        map.fitBounds(bounds, { paddingBottomRight: [50, 250], paddingTopLeft: [50, 60] });
      }

      // Comunicação por Mensagens com o Parent React Component
      window.addEventListener('message', (e) => {
        if (!e.data) return;
        if (e.data.type === 'FIT_BOUNDS' && bounds.length > 0) {
          map.fitBounds(bounds, { paddingBottomRight: [50, 250], paddingTopLeft: [50, 60], animate: true });
        } else if (e.data.type === 'CENTER_DRIVER') {
          if (driverMarker) {
            map.setView(driverMarker.getLatLng(), 15, { animate: true });
          } else {
            map.setView([${defaultLat}, ${defaultLng}], 14, { animate: true });
          }
        }
      });
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      initMap();
    } else {
      document.addEventListener('DOMContentLoaded', initMap);
    }
  </script>
</body>
</html>
    `;
  }, [items, driverCoords, storeCoords, polylineCoords, isDarkMode, defaultLat, defaultLng]);

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={styles.mapCanvas}>
        {/* @ts-ignore - Iframe HTML do mapa interativo na Web */}
        <iframe
          ref={iframeRef}
          srcDoc={mapHtml}
          style={{
            width: '100%',
            height: '100%',
            border: 0,
            backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
          }}
          title="Mapa Real de Entregas"
        />

        {/* Controles Flutuantes do Mapa: [◎] Minha Localização e [⊞] Enquadrar */}
        <View style={styles.floatingControls}>
          <TouchableOpacity
            style={[styles.controlBtn, isDarkMode && styles.controlBtnDark]}
            onPress={centerDriver}
            activeOpacity={0.8}
            accessibilityLabel="Minha localização"
          >
            <Crosshair size={18} color="#2563eb" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlBtn, isDarkMode && styles.controlBtnDark]}
            onPress={fitAllBounds}
            activeOpacity={0.8}
            accessibilityLabel="Enquadrar roteiro"
          >
            <Maximize2 size={16} color="#475569" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    position: 'relative',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  mapCanvas: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  floatingControls: {
    position: 'absolute',
    right: 12,
    top: 12,
    gap: 8,
    zIndex: 100,
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
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  controlBtnDark: {
    backgroundColor: '#1e293b',
  },
});

