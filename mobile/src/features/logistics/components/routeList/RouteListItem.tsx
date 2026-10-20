import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { openExternalNavigation } from '../../utils/externalMapsNavigation';
import { classifyDeliveryService } from '../../domain/deliveryServiceClassification';
import { RouteListItemProps } from './route-list-item/routeListItem.types';
import { styles } from './route-list-item/routeListItem.styles';
import { RouteListItemBadges } from './route-list-item/RouteListItemBadges';
import { RouteListItemHeader } from './route-list-item/RouteListItemHeader';
import { RouteListItemFooter } from './route-list-item/RouteListItemFooter';

export type { RouteListItemProps };

/**
 * Item individual da listagem de roteiro diário de entregas.
 * Composição modular com separação clara de responsabilidades (SRP e DRY).
 */
export const RouteListItem: React.FC<RouteListItemProps> = ({
  item,
  onSelect,
  onStartDelivery,
  onViewOrder,
  isDarkMode = false,
}) => {
  const isCompleted = item.status === 'completed';
  const isUnattended = item.status === 'unattended';
  const isInProgress =
    item.status === 'in_progress' || item.status === 'arrived' || item.status === 'in_service';
  const isNext = item.isNext && !isInProgress;

  const classification = classifyDeliveryService(item.order);

  const handleOpenNav = () => {
    openExternalNavigation({
      latitude: item.coords?.latitude,
      longitude: item.coords?.longitude,
      fullAddress: item.fullAddress,
    });
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isDarkMode && styles.cardDark,
        isInProgress && styles.cardInProgress,
        isNext && styles.cardNext,
      ]}
      onPress={() => onSelect(item)}
      activeOpacity={0.7}
    >
      {/* 1. Badges Operacionais de Tipo de Serviço & Montagem */}
      <RouteListItemBadges classification={classification} />

      {/* 2. Cabeçalho: Sequência, Dados do Cliente e Status Pill */}
      <RouteListItemHeader
        item={item}
        isCompleted={isCompleted}
        isUnattended={isUnattended}
        isInProgress={isInProgress}
        isDarkMode={isDarkMode}
      />

      {/* 3. Endereço */}
      <View style={styles.addressRow}>
        <MapPin size={12} color="#ef4444" style={{ marginTop: 2 }} />
        <Text style={[styles.addressText, isDarkMode && styles.textMuted]} numberOfLines={1}>
          {item.fullAddress}
        </Text>
      </View>

      {/* 4. Rodapé: Métricas e Atalhos de Ação Rápida */}
      <RouteListItemFooter
        item={item}
        onOpenNav={handleOpenNav}
        onViewOrder={onViewOrder}
        isDarkMode={isDarkMode}
      />
    </TouchableOpacity>
  );
};
