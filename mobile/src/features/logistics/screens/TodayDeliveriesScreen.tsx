import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Map, List, Sparkles, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react-native';
import { useDeliveryRoute, DeliveryRouteItem } from '../hooks/useDeliveryRoute';
import { useDriverLocation } from '../hooks/useDriverLocation';
import { useRoutesApi } from '../hooks/useRoutesApi';
import { DeliveryMapView } from '../components/deliveryMap/DeliveryMapView';
import { NextDeliveryCard } from '../components/deliveryMap/NextDeliveryCard';
import { DeliveryBottomSheet } from '../components/deliveryMap/DeliveryBottomSheet';
import { RouteProgressHeader } from '../components/deliveryMap/RouteProgressHeader';
import { RouteOptimizationModal } from '../components/deliveryMap/RouteOptimizationModal';
import { RouteListView } from '../components/routeList/RouteListView';
import { calculateOptimizedRoute, applyOptimizedSequence, OptimizationResult } from '../services/routeOptimizationService';

interface Props {
  isDarkMode?: boolean;
  onBack?: () => void;
  onSelectOrder: (order: any) => void;
}

export const TodayDeliveriesScreen: React.FC<Props> = ({
  isDarkMode = false,
  onBack,
  onSelectOrder,
}) => {
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedMarkerItem, setSelectedMarkerItem] = useState<DeliveryRouteItem | null>(null);

  // Otimização de rota
  const [showOptimizationModal, setShowOptimizationModal] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [applyingOptimization, setApplyingOptimization] = useState(false);

  // Hooks de Dados e Localização
  const { routeItems, currentDelivery, stats, loading, refreshing, onRefresh } = useDeliveryRoute();
  const { coords: driverCoords, refreshLocation } = useDriverLocation();

  // Coordenadas padrão da loja/depósito Morante (Curitiba/Colombo - PR)
  const storeCoords = useMemo(() => ({
    latitude: -25.352,
    longitude: -49.169,
  }), []);

  // Alvo ativo da rota (entrega selecionada ou entrega em andamento)
  const activeDeliveryTarget = currentDelivery || selectedMarkerItem;

  // Polyline e métricas da Routes API entre motorista e próxima parada
  const { polylineCoords, distanceKm, durationMin } = useRoutesApi({
    origin: driverCoords || storeCoords,
    destination: activeDeliveryTarget?.coords || null,
    enabled: viewMode === 'map' && !!activeDeliveryTarget?.coords,
  });

  // Ação de Iniciar Entrega: abre o modal de pedido existente já no fluxo de preparação
  const handleStartDelivery = (item: DeliveryRouteItem) => {
    if (item.order) {
      item.order._openDeliveryPreparation = true;
    }
    onSelectOrder(item.order);
  };

  // Ação de Ver Pedido
  const handleViewOrder = (item: DeliveryRouteItem) => {
    onSelectOrder(item.order);
  };

  // Ação de Registrar Atendimento
  const handleRegisterService = (item: DeliveryRouteItem) => {
    onSelectOrder(item.order);
  };

  // Ação de Otimizar Rota
  const handleOpenOptimization = () => {
    const origin = driverCoords || storeCoords;
    const result = calculateOptimizedRoute(routeItems, origin);
    setOptimizationResult(result);
    setShowOptimizationModal(true);
  };

  const handleApplyOptimization = async () => {
    if (!optimizationResult) return;
    setApplyingOptimization(true);
    const success = await applyOptimizedSequence(optimizationResult.optimizedItems);
    setApplyingOptimization(false);
    setShowOptimizationModal(false);

    if (success) {
      Alert.alert('Roteiro Otimizado', 'A nova sequência de paradas foi salva com sucesso.');
      onRefresh();
    } else {
      Alert.alert('Erro', 'Não foi possível salvar a nova ordem no momento.');
    }
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Barra de Topo */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }, isDarkMode && styles.topBarDark]}>
        <View style={styles.topRow}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={[styles.iconBtn, isDarkMode && styles.iconBtnDark]}>
              <ArrowLeft size={18} color={isDarkMode ? '#cbd5e1' : '#475569'} />
            </TouchableOpacity>
          )}

          <View style={{ flex: 1 }}>
            <Text style={[styles.screenTitle, isDarkMode && styles.textLight]}>Entregas de Hoje</Text>
            <Text style={[styles.screenSubtitle, isDarkMode && styles.textMuted]}>
              {stats.total} {stats.total === 1 ? 'parada programada' : 'paradas programadas'}
            </Text>
          </View>

          {/* Botão de Otimizar Rota */}
          {stats.pending > 1 && (
            <TouchableOpacity
              style={[styles.optimizeBtn, isDarkMode && styles.optimizeBtnDark]}
              onPress={handleOpenOptimization}
              activeOpacity={0.8}
            >
              <Sparkles size={14} color="#2563eb" />
              <Text style={styles.optimizeBtnText}>Otimizar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Alternância [ Mapa | Lista ] */}
        <View style={[styles.toggleContainer, isDarkMode && styles.toggleContainerDark]}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
            onPress={() => setViewMode('map')}
            activeOpacity={0.8}
          >
            <Map size={14} color={viewMode === 'map' ? '#2563eb' : (isDarkMode ? '#94a3b8' : '#64748b')} />
            <Text style={[styles.toggleBtnText, viewMode === 'map' && styles.toggleBtnTextActive]}>
              Mapa
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
            onPress={() => setViewMode('list')}
            activeOpacity={0.8}
          >
            <List size={14} color={viewMode === 'list' ? '#2563eb' : (isDarkMode ? '#94a3b8' : '#64748b')} />
            <Text style={[styles.toggleBtnText, viewMode === 'list' && styles.toggleBtnTextActive]}>
              Lista ({stats.total})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Barra de Progresso do Roteiro */}
      <RouteProgressHeader
        total={stats.total}
        completed={stats.completed}
        pending={stats.pending}
        percent={stats.percent}
        remainingKm={distanceKm}
        remainingMin={durationMin}
        isDarkMode={isDarkMode}
      />

      {/* Conteúdo: Mapa ou Lista */}
      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={[styles.loadingText, isDarkMode && styles.textMuted]}>Carregando roteiro...</Text>
        </View>
      ) : viewMode === 'map' ? (
        <View style={styles.mapArea}>
          <DeliveryMapView
            items={routeItems}
            driverCoords={driverCoords}
            storeCoords={storeCoords}
            polylineCoords={polylineCoords}
            selectedItem={selectedMarkerItem}
            onSelectMarker={(item) => setSelectedMarkerItem(item)}
            isDarkMode={isDarkMode}
          />

          {/* Card Flutuante de Próxima Entrega / Em Andamento */}
          <View style={styles.floatingCardContainer}>
            <NextDeliveryCard
              selectedDelivery={selectedMarkerItem}
              currentDelivery={currentDelivery}
              pendingCount={stats.pending}
              allCompleted={stats.total > 0 && stats.pending === 0}
              onStartDelivery={handleStartDelivery}
              onViewOrder={handleViewOrder}
              onRegisterService={handleRegisterService}
              isDarkMode={isDarkMode}
            />
          </View>
        </View>
      ) : (
        <RouteListView
          items={routeItems}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onSelect={(item) => onSelectOrder(item.order)}
          onStartDelivery={handleStartDelivery}
          onViewOrder={handleViewOrder}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Bottom Sheet de Detalhes da Parada */}
      <DeliveryBottomSheet
        item={selectedMarkerItem}
        onClose={() => setSelectedMarkerItem(null)}
        onStartDelivery={handleStartDelivery}
        onViewOrder={handleViewOrder}
        isDarkMode={isDarkMode}
      />

      {/* Modal de Confirmação de Otimização */}
      <RouteOptimizationModal
        visible={showOptimizationModal}
        result={optimizationResult}
        applying={applyingOptimization}
        onApply={handleApplyOptimization}
        onClose={() => setShowOptimizationModal(false)}
        isDarkMode={isDarkMode}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  topBar: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  topBarDark: {
    backgroundColor: '#0f172a',
    borderBottomColor: '#1e293b',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDark: {
    backgroundColor: '#1e293b',
  },
  screenTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
  },
  screenSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  optimizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  optimizeBtnDark: {
    backgroundColor: '#1e293b',
  },
  optimizeBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563eb',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 3,
  },
  toggleContainerDark: {
    backgroundColor: '#1e293b',
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 9,
  },
  toggleBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
  },
  toggleBtnTextActive: {
    color: '#2563eb',
  },
  mapArea: {
    flex: 1,
    position: 'relative',
  },
  floatingCardContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  textLight: {
    color: '#f8fafc',
  },
  textMuted: {
    color: '#94a3b8',
  },
});
