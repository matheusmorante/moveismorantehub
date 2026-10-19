import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Users, UserCheck, X } from 'lucide-react-native';
import { DeliveryResponsibleItem } from '../../../screens/delivery-preparation/deliveryPreparation.types';
import { filterUnaddedStaff } from '../../../screens/delivery-preparation/deliveryStaffRules';
import { styles } from './deliveryPreparationStep.styles';

interface Props {
  responsibles: DeliveryResponsibleItem[];
  onAddResponsible: (responsible: DeliveryResponsibleItem) => void;
  onRemoveResponsible: (index: number) => void;
  availableStaff?: Array<{ id: string; fullName: string; role?: string }>;
  userProfile?: any;
  isDarkMode?: boolean;
}

export const DeliveryResponsiblesSection: React.FC<Props> = ({
  responsibles,
  onAddResponsible,
  onRemoveResponsible,
  availableStaff = [],
  userProfile,
  isDarkMode = false,
}) => {
  // Sugestões de colaboradores ainda não adicionados
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
        <Text style={[styles.responsiblesSubtext, isDarkMode && styles.textMuted]}>
          Selecione quem está saindo para esta entrega. O operador atual é adicionado automaticamente.
        </Text>
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

      {/* Sugestões rápidas de colaboradores da equipe */}
      {unaddedStaff.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={[styles.suggestionsLabel, isDarkMode && styles.textMuted]}>
            Adicionar mais responsáveis pela entrega:
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsScroll}
          >
            {unaddedStaff.slice(0, 8).map((staff) => (
              <TouchableOpacity
                key={staff.id}
                onPress={() =>
                  onAddResponsible({ id: staff.id, name: staff.fullName, role: staff.role })
                }
                style={[styles.suggestionChip, isDarkMode && styles.suggestionChipDark]}
                activeOpacity={0.7}
              >
                <Text style={[styles.suggestionText, isDarkMode && styles.textLight]}>
                  {staff.fullName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <Text style={[styles.confirmationNotice, isDarkMode && styles.textMuted]}>
        ℹ️ Os responsáveis só serão confirmados no pedido ao iniciar a rota abaixo.
      </Text>
    </View>
  );
};
