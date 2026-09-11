import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check, X } from 'lucide-react-native';
import { MobileOpportunity } from '../../services/mobileOpportunityService';

interface OpportunitySelectModalProps {
  visible: boolean;
  opportunities: MobileOpportunity[];
  selectedOpportunityId?: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
  dark: boolean;
}

export const OpportunitySelectModal: React.FC<OpportunitySelectModalProps> = ({
  visible,
  opportunities,
  selectedOpportunityId,
  onSelect,
  onClose,
  dark,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.modalContent, dark && styles.darkModalContent]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, dark && styles.lightText]}>
              Selecionar Oportunidade
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <X size={18} color={dark ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalList}>
            <TouchableOpacity
              onPress={() => {
                onSelect(null);
                onClose();
              }}
              style={[
                styles.modalItem,
                !selectedOpportunityId && styles.modalItemActive,
                dark && styles.darkModalItem,
              ]}
            >
              <Text
                style={[
                  styles.modalItemText,
                  !selectedOpportunityId && styles.modalItemTextActive,
                  dark && styles.lightText,
                ]}
              >
                Nenhuma (Produto Normal)
              </Text>
              {!selectedOpportunityId && (
                <Check size={16} color="#2563eb" strokeWidth={2.5} />
              )}
            </TouchableOpacity>

            {opportunities.map((opp) => {
              const isSelected = selectedOpportunityId === opp.id;
              return (
                <TouchableOpacity
                  key={opp.id}
                  onPress={() => {
                    onSelect(opp.id);
                    onClose();
                  }}
                  style={[
                    styles.modalItem,
                    isSelected && styles.modalItemActive,
                    dark && styles.darkModalItem,
                  ]}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      isSelected && styles.modalItemTextActive,
                      dark && styles.lightText,
                    ]}
                  >
                    {opp.name}
                  </Text>
                  {isSelected && (
                    <Check size={16} color="#2563eb" strokeWidth={2.5} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  darkModalContent: {
    backgroundColor: '#1e293b',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalList: {
    maxHeight: 280,
    padding: 8,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  darkModalItem: {},
  modalItemActive: {
    backgroundColor: '#eff6ff',
  },
  modalItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  modalItemTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  lightText: {
    color: '#f8fafc',
  },
});
