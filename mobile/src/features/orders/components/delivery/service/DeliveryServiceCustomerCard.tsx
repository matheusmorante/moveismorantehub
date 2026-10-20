import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MapPin, Navigation, User } from 'lucide-react-native';
import {
  openGoogleMapsNavigation,
  extractNavigationTarget,
} from '../../../../logistics/utils/externalMapsNavigation';
import { styles } from './deliveryServiceStep.styles';

interface DeliveryServiceCustomerCardProps {
  order: any;
  customer: any;
  fullAddress: string;
  isDarkMode: boolean;
}

/**
 * Cartão de dados do cliente, endereço e acionador de GPS no destino da entrega.
 */
export const DeliveryServiceCustomerCard: React.FC<DeliveryServiceCustomerCardProps> = ({
  order,
  customer,
  fullAddress,
  isDarkMode,
}) => {
  if (!fullAddress) return null;

  const handleOpenGPS = () => {
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

      <TouchableOpacity onPress={handleOpenGPS} style={styles.gpsButton} activeOpacity={0.8}>
        <Navigation size={16} color="#2563eb" />
        <Text style={styles.gpsButtonText}>Abrir no GPS / Navegador</Text>
      </TouchableOpacity>
    </View>
  );
};
