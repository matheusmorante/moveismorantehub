import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { User, MapPin, Clock, Navigation } from 'lucide-react-native';
import {
  openGoogleMapsNavigation,
  extractNavigationTarget,
} from '../../../../logistics/utils/externalMapsNavigation';
import { extractScheduleSlot } from '../../../../logistics/utils/scheduleSlots';
import { styles } from './deliveryPreparationStep.styles';

interface Props {
  customer: any;
  fullAddress: string;
  order?: any;
  isDarkMode?: boolean;
}

export const DeliveryDestinationInfoCard: React.FC<Props> = ({
  customer,
  fullAddress,
  order,
  isDarkMode = false,
}) => {
  const scheduleSlot = order ? extractScheduleSlot(order) : null;
  const scheduleBadgeText = scheduleSlot?.displayBadge || scheduleSlot?.sublabel;

  const handleOpenGoogleMaps = () => {
    const target = extractNavigationTarget(order, fullAddress);
    void openGoogleMapsNavigation(target);
  };

  return (
    <View style={[styles.infoCard, isDarkMode && styles.infoCardDark]}>
      <View style={styles.row}>
        <User size={18} color="#2563eb" />
        <Text style={[styles.infoText, isDarkMode && styles.textLight]}>
          {customer?.fullName || 'Cliente'}
        </Text>
      </View>

      <View style={styles.row}>
        <MapPin size={18} color="#ef4444" />
        <Text style={[styles.address, isDarkMode && styles.textLight]}>{fullAddress}</Text>
      </View>

      {Boolean(scheduleBadgeText) && (
        <View style={styles.timeRow}>
          <Clock size={16} color="#d97706" />
          <Text style={[styles.timeText, isDarkMode && styles.timeTextDark]}>
            {scheduleBadgeText}
          </Text>
        </View>
      )}

      {/* Ação Destacada: ABRIR ROTA NO GOOGLE MAPS */}
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
