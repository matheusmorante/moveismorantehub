import React, { useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Crosshair, Maximize2 } from 'lucide-react-native';
import { DeliveryRouteItem } from '../../hooks/useDeliveryRoute';
import { DriverCoordinates } from '../../../../services/locationService';
import { getOperationActivityType } from '../../../schedule/utils/operationActivity';
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
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const defaultLat = storeCoords?.latitude || -25.35205;
  const defaultLng = storeCoords?.longitude || -49.16948;

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
      .map((i) => {
        const activityType = getOperationActivityType(i.order);
        const isPickup = i.order?.shipping?.deliveryMethod === 'pickup';

        let typeLabel = 'Entrega';
        let bgColor = '#16a34a'; // Padrão: Entrega (Verde)
        let borderColor = '#ffffff';

        if (isPickup) {
          typeLabel = 'Retirada';
          bgColor = '#7c3aed'; // Retirada (Roxo)
        } else if (activityType === 'assistance') {
          typeLabel = 'Assistência';
          bgColor = '#eab308'; // Assistência (Amarelo)
        } else if (activityType === 'return') {
          typeLabel = 'Devolução';
          bgColor = '#f97316'; // Coleta de Devolução (Laranja)
        }

        if (i.status === 'completed') {
          typeLabel = 'Concluída';
          bgColor = '#10b981';
          borderColor = '#a7f3d0';
        } else if (i.status === 'unattended') {
          typeLabel = 'Não Atendida';
          bgColor = '#ef4444';
          borderColor = '#fecaca';
        } else if (i.isCurrent) {
          borderColor = '#ffffff';
        }

        let iconType = 'delivery';
        if (i.status === 'completed') iconType = 'check';
        else if (i.status === 'unattended') iconType = 'alert';
        else if (isPickup) iconType = 'pickup';
        else if (activityType === 'assistance') iconType = 'assistance';
        else if (activityType === 'return') iconType = 'return';

        return {
          id: i.id,
          seq: i.sequence,
          name: String(i.customerName || 'Consumidor').replace(/'/g, "\\'"),
          address: String(i.fullAddress || '').replace(/'/g, "\\'"),
          lat: i.coords!.latitude,
          lng: i.coords!.longitude,
          status: i.status,
          isCurrent: i.isCurrent,
          isNext: i.isNext,
          typeLabel,
          bgColor,
          borderColor,
          iconType,
        };
      });

    const polyData = (polylineCoords && polylineCoords.length > 0)
      ? polylineCoords.map(p => [p.latitude, p.longitude])
      : [];

    const hasDriverLocation = Boolean(driverCoords && driverCoords.latitude && driverCoords.longitude);

    const teamData = (teamMembers || []).map(m => ({
      userId: m.userId,
      userName: String(m.userName || 'Membro da Equipe').replace(/'/g, "\\'"),
      shortName: String((m.userName || 'Membro').split(' ')[0]).replace(/'/g, "\\'"),
      lat: m.coords.latitude,
      lng: m.coords.longitude,
      isDisconnectedOrNoGps: m.isDisconnectedOrNoGps,
      lastSeenTime: m.lastSeen ? new Date(m.lastSeen).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
    }));

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
    
    .marker-container { display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3)); }
    .marker-container.marker-highlight { transform: scale(1.18); z-index: 1000; }
    .marker-badge { width: 32px; height: 32px; border-radius: 50%; border-width: 2.5px; border-style: solid; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
    .pin-tip { width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top-width: 6px; border-top-style: solid; margin-top: -1px; }

    .pin-store-container { display: flex; flex-direction: column; align-items: center; cursor: pointer; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35)); }
    .pin-store-badge { width: 32px; height: 32px; border-radius: 50%; background: #0f172a; border: 2.5px solid #38bdf8; display: flex; align-items: center; justify-content: center; box-sizing: border-box; font-size: 15px; color: #ffffff; }
    .pin-tip-store { width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top-width: 6px; border-top-style: solid; border-top-color: #0f172a; margin-top: -1px; }

    .pin-driver { background: transparent; border: none; font-size: 28px; line-height: 1; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.4)); cursor: pointer; text-align: center; }

    .team-member-container { display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35)); }
    .team-member-badge { background-color: #1e293b; color: #ffffff; padding: 2px 6px; border-radius: 6px; font-size: 10px; font-weight: 800; border: 1.5px solid #38bdf8; margin-bottom: 2px; white-space: nowrap; }
    .team-member-badge.offline { background-color: #7f1d1d; border-color: #ef4444; }
    .team-truck-wrapper { position: relative; display: flex; align-items: center; justify-content: center; font-size: 28px; line-height: 1; }
    .team-question-badge { position: absolute; top: -5px; right: -9px; width: 18px; height: 18px; border-radius: 50%; background-color: #ef4444; border: 2px solid #ffffff; color: #ffffff; font-size: 12px; font-weight: 900; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }
    .team-active-dot { position: absolute; bottom: 0; right: -4px; width: 8px; height: 8px; border-radius: 50%; background-color: #22c55e; border: 1.5px solid #ffffff; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    function getIconSvg(type) {
      if (type === 'check') {
        return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      }
      if (type === 'alert') {
        return '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
      }
      if (type === 'pickup') {
        return '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>';
      }
      if (type === 'assistance') {
        return '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>';
      }
      if (type === 'return') {
        return '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>';
      }
      // delivery (padrão): Caminhãozinho igual ao app
      return '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>';
    }

    function initMap() {
      if (typeof L === 'undefined') {
        setTimeout(initMap, 100);
        return;
      }
      
      const isDark = ${isDarkMode};
      const tileUrl = isDark 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

      const map = L.map('map', { zoomControl: false }).setView([${defaultLat}, ${defaultLng}], 13);
      L.tileLayer(tileUrl, { 
        maxZoom: 19, 
        attribution: '© OpenStreetMap colaboradores' 
      }).addTo(map);

      const bounds = [];

      // Depósito Central (🏪 Móveis Morante)
      const storeHtml = '<div class="pin-store-container"><div class="pin-store-badge"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg></div><div class="pin-tip-store"></div></div>';
      const storeIcon = L.divIcon({
        className: '',
        html: storeHtml,
        iconSize: [32, 38],
        iconAnchor: [16, 38]
      });
      L.marker([${defaultLat}, ${defaultLng}], { icon: storeIcon })
        .bindPopup('<div style="font-family:sans-serif;padding:4px;"><b>Móveis Morante — Depósito Central</b><br><span style="color:#64748b;font-size:12px;">Origem do Roteiro</span></div>')
        .addTo(map);
      bounds.push([${defaultLat}, ${defaultLng}]);

      // Motorista (🚚 Posição Atual) — renderiza somente se houver GPS real do motorista
      let driverMarker = null;
      if (${hasDriverLocation}) {
        const driverLat = ${driverCoords?.latitude || defaultLat};
        const driverLng = ${driverCoords?.longitude || defaultLng};
        const driverIcon = L.divIcon({
          className: 'pin-driver',
          html: '🚚',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });
        driverMarker = L.marker([driverLat, driverLng], { icon: driverIcon, zIndexOffset: 1200 })
          .bindPopup('<div style="font-family:sans-serif;padding:4px;"><b>Motorista / Entregador</b><br><span style="color:#2563eb;font-weight:700;font-size:12px;">🚚 Posição Atual em Rota</span></div>')
          .addTo(map);
        bounds.push([driverLat, driverLng]);
      }

      // Paradas do Roteiro (com ícone por tipo de pedido e pinTip idênticos ao App Nativo)
      const points = ${JSON.stringify(pointsData)};
      points.forEach(p => {
        const markerHtml = 
          '<div class="marker-container ' + (p.isCurrent || p.isNext ? 'marker-highlight' : '') + '">' +
            '<div class="marker-badge" style="background-color:' + p.bgColor + '; border-color:' + p.borderColor + ';">' +
              getIconSvg(p.iconType) +
            '</div>' +
            '<div class="pin-tip" style="border-top-color:' + p.bgColor + ';"></div>' +
          '</div>';

        const icon = L.divIcon({
          className: '',
          html: markerHtml,
          iconSize: [32, 38],
          iconAnchor: [16, 38]
        });

        const m = L.marker([p.lat, p.lng], { icon, zIndexOffset: p.isCurrent ? 1000 : (p.isNext ? 900 : 500) }).addTo(map);
        m.on('click', () => {
          window.parent.postMessage({ type: 'MARKER_CLICK', id: p.id }, '*');
        });
        bounds.push([p.lat, p.lng]);
      });

      // Outros Membros da Equipe (com indicador de ? vermelho se desligado ou sem GPS)
      const team = ${JSON.stringify(teamData)};
      team.forEach(tm => {
        const questionHtml = tm.isDisconnectedOrNoGps 
          ? '<div class="team-question-badge">?</div>' 
          : '<div class="team-active-dot"></div>';
        
        const badgeClass = tm.isDisconnectedOrNoGps ? 'team-member-badge offline' : 'team-member-badge';

        const tmHtml = 
          '<div class="team-member-container">' +
            '<div class="' + badgeClass + '">' + tm.shortName + '</div>' +
            '<div class="team-truck-wrapper">' +
              '<span>🚚</span>' +
              questionHtml +
            '</div>' +
          '</div>';

        const icon = L.divIcon({
          className: '',
          html: tmHtml,
          iconSize: [44, 48],
          iconAnchor: [22, 24]
        });

        const statusText = tm.isDisconnectedOrNoGps
          ? '<span style="color:#ef4444;font-weight:800;font-size:11px;">⚠️ Sem sinal de GPS / Desligado</span><br><span style="color:#64748b;font-size:11px;">Visto pela última vez às ' + tm.lastSeenTime + '</span>'
          : '<span style="color:#16a34a;font-weight:800;font-size:11px;">🟢 GPS Ativo em Rota</span><br><span style="color:#64748b;font-size:11px;">Atualizado às ' + tm.lastSeenTime + '</span>';

        L.marker([tm.lat, tm.lng], { icon, zIndexOffset: 1100 }).addTo(map)
          .bindPopup(
            '<div style="font-family:sans-serif;padding:4px;min-width:180px;">' +
              '<b style="color:#0f172a;font-size:13px;">' + tm.userName + '</b><br>' +
              statusText +
            '</div>'
          );
        bounds.push([tm.lat, tm.lng]);
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
  }, [items, driverCoords, storeCoords, polylineCoords, isDarkMode, defaultLat, defaultLng, teamMembers]);

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

