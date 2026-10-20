import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MapPin, Navigation, User } from 'lucide-react-native';
import {
  openGoogleMapsNavigation,
  extractNavigationTarget,
} from '../../../../logistics/utils/externalMapsNavigation';
import { styles } from './deliveryRouteStep.styles';

interface DeliveryRouteCustomerCardProps {
  order: any;
  customer: any;
  fullAddress: string;
  isDarkMode: boolean;
}

/**
 * Cartão de informações do cliente, endereço e botão de navegação externa (Google Maps).
 */
export const DeliveryRouteCustomerCard: React.FC<DeliveryRouteCustomerCardProps> = ({
  order,
  customer,
  fullAddress,
  isDarkMode,
}) => {
  const handleOpenGoogleMaps = () => {
    const target = extractNavigationTarget(order, fullAddress);
    void openGoogleMapsNavigation(target);
  };

  return (
    <View style={[styles.infoCard, isDarkMode && styles.infoCardDark]}>
      <View style={styles.infoRow}>
        <User size={18} color="#2563eb" />
        <Text style={[styles.customerName, isDarkMode && styles.textLight]}>
          {customer.fullName || 'Cliente'}
        </Text>
      </View>
      <View style={styles.infoRow}>
        <MapPin size={18} color="#ef4444" style={{ marginTop: 2 }} />
        <Text style={[styles.addressText, isDarkMode && styles.textLight]}>{fullAddress}</Text>
      </View>

      <TouchableOpacity
        onPress={handleOpenGoogleMaps}
        style={styles.googleMapsNavButton}
        activeOpacity={0.85}
      >
        <Navigation size={17} color="#ffffff" fill="#ffffff" />
        <Text style={styles.googleMapsNavButtonText}>ABRIR ROTA NO GOOGLE MAPS</Text>
      </TouchableOpacity>
    </View>
  );
};
