import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRight, Search, Users, UserCheck, X } from 'lucide-react-native';
import type { DeliveryResponsibleItem } from '../../../screens/delivery-preparation/deliveryPreparation.types';
import { filterUnaddedStaff } from '../../../screens/delivery-preparation/deliveryStaffRules';
import { styles } from './deliveryPreparationStep.styles';
import { DeliveryResponsibleSearchModal } from './DeliveryResponsibleSearchModal';

interface Props {
  responsibles: DeliveryResponsibleItem[];
  onAddResponsible: (responsible: DeliveryResponsibleItem) => void;
  onRemoveResponsible: (index: number) => void;
  availableStaff?: Array<{ id: string; fullName: string; role?: string }>;
  loadingStaff?: boolean;
  userProfile?: any;
  isDarkMode?: boolean;
}

export const DeliveryResponsiblesSection: React.FC<Props> = ({
  responsibles,
  onAddResponsible,
  onRemoveResponsible,
  availableStaff = [],
  loadingStaff = false,
  userProfile,
  isDarkMode = false,
}) => {
  const [searchVisible, setSearchVisible] = useState(false);
  const unaddedStaff = filterUnaddedStaff(availableStaff, responsibles);

  return (
    <View style={[styles.responsiblesSection, isDarkMode && styles.cardDark]}>
      <View style={styles.responsiblesSectionHeader}>
        <View style={styles.heading}>
          <Users size={19} color="#2563eb" />
          <Text style={[styles.headingText, isDarkMode && styles.textLight]}>
            Responsáveis pela Entrega
          </Text>
        </View>
      </View>

      {/* Chips dos responsáveis atuais */}
      <View style={styles.chipsContainer}>
        {responsibles.map((resp, idx) => {
          const isCurrentUser =
            (userProfile?.id && resp.id === userProfile.id) ||
            (userProfile?.fullName &&
              resp.name.trim().toLowerCase() === userProfile.fullName.trim().toLowerCase());

          return (
            <View
              key={`${resp.id || resp.name}-${idx}`}
              style={[styles.responsibleChip, isDarkMode && styles.responsibleChipDark]}
            >
              <View style={styles.avatarCircle}>
                <UserCheck size={13} color="#2563eb" />
              </View>
              <Text style={[styles.responsibleChipName, isDarkMode && styles.textLight]}>
                {resp.name}
              </Text>
              {isCurrentUser && (
                <View style={styles.youBadge}>
                  <Text style={styles.youBadgeText}>Você</Text>
                </View>
              )}
              {responsibles.length > 1 && (
                <TouchableOpacity
                  onPress={() => onRemoveResponsible(idx)}
                  style={styles.chipRemoveBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={`Remover ${resp.name}`}
                >
                  <X size={13} color={isDarkMode ? '#94a3b8' : '#64748b'} />
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>

      {/* Busca de colaboradores ainda não adicionados */}
      {(loadingStaff || unaddedStaff.length > 0) && (
        <View style={styles.suggestionsContainer}>
          <Text style={[styles.suggestionsLabel, isDarkMode && styles.textMuted]}>
            Adicionar mais responsáveis pela entrega:
          </Text>
          <TouchableOpacity
            onPress={() => setSearchVisible(true)}
            style={[
              styles.responsibleSearchButton,
              isDarkMode && styles.responsibleSearchButtonDark,
            ]}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Pesquisar responsáveis pela entrega"
          >
            <Search size={17} color={isDarkMode ? '#93c5fd' : '#2563eb'} />
            <Text style={[styles.responsibleSearchPlaceholder, isDarkMode && styles.textMuted]}>
              Pesquisar responsável pela entrega
            </Text>
            <ChevronRight size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
          </TouchableOpacity>
        </View>
      )}

      <DeliveryResponsibleSearchModal
        visible={searchVisible}
        isDarkMode={isDarkMode}
        staff={unaddedStaff}
        loadingStaff={loadingStaff}
        onClose={() => setSearchVisible(false)}
        onSelect={(staff) => {
          onAddResponsible({ id: staff.id, name: staff.fullName, role: staff.role });
          setSearchVisible(false);
        }}
      />

    </View>
  );
};
