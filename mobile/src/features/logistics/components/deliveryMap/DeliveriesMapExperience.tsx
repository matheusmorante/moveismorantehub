import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { DeliveryRouteDateScope, DeliveryRouteItem } from '../../hooks/useDeliveryRoute';
import { useDriverLocation } from '../../hooks/useDriverLocation';
import { useRoutesApi } from '../../hooks/useRoutesApi';
import { useTeamLocations } from '../../hooks/useTeamLocations';
import { getPrimaryDeliveryResponsibleId } from '../../domain/deliveryRouteBuilder';
import { classifyDeliveryService } from '../../domain/deliveryServiceClassification';
import { DeliveryBottomSheet } from './DeliveryBottomSheet';
import { DeliveryMapView } from './DeliveryMapView';
import { MapErrorBoundary } from './MapErrorBoundary';

type MapActivityFilter = 'delivery' | 'assistance' | 'return';

const MAP_ACTIVITY_FILTERS: { key: MapActivityFilter; label: string }[] = [
  { key: 'delivery', label: 'Entregas' },
  { key: 'assistance', label: 'Assistência' },
  { key: 'return', label: 'Coleta de devolução' },
];

const getMapActivityType = (item: DeliveryRouteItem): MapActivityFilter | null => {
  if (item.activityType === 'assistance') return 'assistance';
  if (item.activityType === 'return') return 'return';
  const service = classifyDeliveryService(item.order);
  if (service.isDelivery) return 'delivery';
  return null;
};

interface Props {
  active: boolean;
  isDarkMode: boolean;
  userProfile?: any;
  routeItems: DeliveryRouteItem[];
  currentDelivery: DeliveryRouteItem | null;
  loading: boolean;
  dateScope: DeliveryRouteDateScope;
  onViewOrder: (item: DeliveryRouteItem) => void;
  onOpenDeliveryFlow: (item: DeliveryRouteItem) => void;
}

export const DeliveriesMapExperience: React.FC<Props> = ({
  active,
  isDarkMode,
  userProfile,
  routeItems,
  currentDelivery,
  loading,
  dateScope,
  onViewOrder,
  onOpenDeliveryFlow,
}) => {
  const [selectedMarkerItem, setSelectedMarkerItem] = useState<DeliveryRouteItem | null>(null);
  const [selectedMapFilter, setSelectedMapFilter] = useState<MapActivityFilter>('delivery');

  useEffect(() => setSelectedMarkerItem(null), [dateScope]);
  useEffect(() => setSelectedMarkerItem(null), [selectedMapFilter]);

  const mapFilterCounts = useMemo(
    () =>
      routeItems.reduce(
        (counts, item) => {
          const type = getMapActivityType(item);
          if (type) counts[type] += 1;
          return counts;
        },
        { delivery: 0, assistance: 0, return: 0 }
      ),
    [routeItems]
  );
  const mapItems = useMemo(
    () => routeItems.filter((item) => getMapActivityType(item) === selectedMapFilter),
    [routeItems, selectedMapFilter]
  );

  const { coords: driverCoords, gpsEnabled } = useDriverLocation();
  const primaryResponsibleId = getPrimaryDeliveryResponsibleId(currentDelivery);
  const isCurrentUserPrimaryResponsible = Boolean(
    currentDelivery &&
      primaryResponsibleId &&
      userProfile?.id &&
      userProfile.id === primaryResponsibleId
  );
  const isDelivering = Boolean(currentDelivery && isCurrentUserPrimaryResponsible);
  const activeOrder = currentDelivery && primaryResponsibleId
    ? {
        id: currentDelivery.id,
        code: currentDelivery.orderIndex,
        responsibleId: primaryResponsibleId,
      }
    : null;
  const { teamMembers } = useTeamLocations({
    userProfile,
    myCoords: driverCoords,
    isGpsActive: gpsEnabled && Boolean(driverCoords),
    isDelivering,
    activeOrder,
    canBroadcastLocation: isDelivering,
  });
  const primaryResponsibleCoords = isCurrentUserPrimaryResponsible
    ? driverCoords
    : teamMembers[0]?.coords || null;

  // Coordenadas padrão do depósito Morante (Curitiba/Colombo - PR - R. Cascavel, 306 - Loja Física)
  const storeCoords = useMemo(
    () => ({ latitude: -25.35212, longitude: -49.16933 }),
    []
  );
  const { polylineCoords, distanceKm, durationMin } = useRoutesApi({
    origin: primaryResponsibleCoords || storeCoords,
    destination: selectedMarkerItem?.coords || null,
    enabled: active && !!selectedMarkerItem?.coords,
  });

  return (
    <>
      {active && (
        <View style={styles.mapArea}>
          <View style={styles.mapCanvas}>
            {loading ? (
              <View style={styles.loadingCenter}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={[styles.loadingText, isDarkMode && styles.textMuted]}>
                  Carregando mapa...
                </Text>
              </View>
            ) : (
              <MapErrorBoundary isDarkMode={isDarkMode}>
                <DeliveryMapView
                  items={mapItems}
                  driverCoords={isDelivering ? driverCoords : null}
                  storeCoords={storeCoords}
                  polylineCoords={polylineCoords}
                  selectedItem={selectedMarkerItem}
                  onSelectMarker={(item) => setSelectedMarkerItem(item)}
                  isDarkMode={isDarkMode}
                  teamMembers={teamMembers}
                />
              </MapErrorBoundary>
            )}
            <View style={styles.mapFilterOverlay} pointerEvents="box-none">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.mapFilterScroll}
                contentContainerStyle={styles.mapFilterList}
                accessibilityLabel="Filtrar atividades no mapa"
              >
                {MAP_ACTIVITY_FILTERS.map(({ key, label }) => {
                  const selected = selectedMapFilter === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.mapFilterChip,
                        isDarkMode && styles.mapFilterChipDark,
                        selected && styles.mapFilterChipActive,
                        isDarkMode && selected && styles.mapFilterChipActiveDark,
                      ]}
                      onPress={() => {
                        setSelectedMapFilter(key);
                        setSelectedMarkerItem(null);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`${label}: ${mapFilterCounts[key]} no mapa`}
                      accessibilityState={{ selected }}
                    >
                      <Text
                        style={[
                          styles.mapFilterText,
                          isDarkMode && styles.mapFilterTextDark,
                          selected && styles.mapFilterTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                      <Text
                        style={[
                          styles.mapFilterCount,
                          isDarkMode && styles.mapFilterCountDark,
                          selected && styles.mapFilterCountActive,
                        ]}
                      >
                        {mapFilterCounts[key]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </View>
      )}
      <DeliveryBottomSheet
        item={selectedMarkerItem}
        distanceKm={distanceKm}
        durationMin={durationMin}
        onClose={() => setSelectedMarkerItem(null)}
        onViewOrder={onViewOrder}
        onOpenDeliveryFlow={onOpenDeliveryFlow}
        isDarkMode={isDarkMode}
      />
    </>
  );
};

const styles = StyleSheet.create({
  mapArea: {
    flex: 1,
  },
  mapCanvas: { flex: 1, position: 'relative' },
  mapFilterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 50,
    zIndex: 20,
    elevation: 10,
  },
  mapFilterScroll: { flex: 1 },
  mapFilterList: {
    height: 50,
    flexDirection: 'row',
    flexGrow: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  mapFilterChip: {
    height: 34,
    alignSelf: 'center',
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  mapFilterChipDark: { backgroundColor: '#1e293b', borderColor: '#334155' },
  mapFilterChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  mapFilterChipActiveDark: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  mapFilterText: { color: '#475569', fontSize: 11, fontWeight: '700' },
  mapFilterTextDark: { color: '#cbd5e1' },
  mapFilterTextActive: { color: '#ffffff' },
  mapFilterCount: { color: '#64748b', fontSize: 10, fontWeight: '800' },
  mapFilterCountDark: { color: '#94a3b8' },
  mapFilterCountActive: { color: '#ffffff' },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  textMuted: {
    color: '#94a3b8',
  },
});
