import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Check, ClipboardCheck } from 'lucide-react-native';
import { SlideHoldToStart } from '../SlideHoldToStart';
import { DeliveryResponsibleItem } from '../../screens/delivery-preparation/deliveryPreparation.types';
import { styles } from './preparation/deliveryPreparationStep.styles';
import { DeliveryDestinationInfoCard } from './preparation/DeliveryDestinationInfoCard';
import { DeliveryResponsiblesSection } from './preparation/DeliveryResponsiblesSection';

export type { DeliveryResponsibleItem };

interface Props {
  customer: any;
  fullAddress: string;
  order?: any;
  checklist: any[];
  checked: Record<string, boolean>;
  onToggleChecklist: (id: string) => void;
  responsibles: DeliveryResponsibleItem[];
  onAddResponsible: (responsible: DeliveryResponsibleItem) => void;
  onRemoveResponsible: (index: number) => void;
  availableStaff?: Array<{ id: string; fullName: string; role?: string }>;
  userProfile?: any;
  onStartDelivery: () => void;
  saving: boolean;
  isDarkMode: boolean;
}

/**
 * Etapa 1 do Fluxo de Entrega: Preparação e Conferência Pré-Saída.
 * Modularizado e desacoplado respeitando os princípios de SRP e DRY.
 */
export const DeliveryPreparationStep: React.FC<Props> = ({
  customer,
  fullAddress,
  order,
  checklist,
  checked,
  onToggleChecklist,
  responsibles,
  onAddResponsible,
  onRemoveResponsible,
  availableStaff = [],
  userProfile,
  onStartDelivery,
  saving,
  isDarkMode,
}) => {
  return (
    <View style={styles.container}>
      {/* 1. Informações Iniciais do Cliente, Destino e Botão Maps */}
      <DeliveryDestinationInfoCard
        customer={customer}
        fullAddress={fullAddress}
        order={order}
        isDarkMode={isDarkMode}
      />

      {/* 2. Seção de Seleção e Gestão de Responsáveis pela Entrega */}
      <DeliveryResponsiblesSection
        responsibles={responsibles}
        onAddResponsible={onAddResponsible}
        onRemoveResponsible={onRemoveResponsible}
        availableStaff={availableStaff}
        userProfile={userProfile}
        isDarkMode={isDarkMode}
      />

      {/* 3. Checklist antes de sair */}
      <View style={styles.heading}>
        <ClipboardCheck size={20} color="#16a34a" />
        <Text style={[styles.headingText, isDarkMode && styles.textLight]}>
          Checklist antes de sair
        </Text>
      </View>

      {checklist.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.item, isDarkMode && styles.cardDark]}
          onPress={() => onToggleChecklist(item.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, checked[item.id] && styles.checkboxOn]}>
            {checked[item.id] ? <Check size={16} color="#fff" strokeWidth={3} /> : null}
          </View>
          <Text style={[styles.itemText, isDarkMode && styles.textLight]}>{item.label}</Text>
        </TouchableOpacity>
      ))}

      {/* 4. Ação de Início do Fluxo de Entrega */}
      <SlideHoldToStart
        label="Deslize para Iniciar Entrega"
        loadingLabel="Iniciando Rota..."
        onConfirm={onStartDelivery}
        loading={saving}
        isDarkMode={isDarkMode}
      />

      <Text style={[styles.safety, isDarkMode && styles.textMuted]}>
        🔒 Dirija com segurança. Use cinto de segurança e respeite os limites de velocidade.
      </Text>
    </View>
  );
};
