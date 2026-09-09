import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Check } from 'lucide-react-native';
import { CardVisualState } from '../TransactionPreviewCard';

interface Props {
  cardState: CardVisualState;
  readOnly?: boolean;
  isDarkMode?: boolean;
  onConfirm: () => void;
}

export const CardActionsSection: React.FC<Props> = ({
  cardState,
  readOnly,
  isDarkMode,
  onConfirm,
}) => {
  if (readOnly) return null;

  const nowTimeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.actionsRow}>
      {cardState === 'SAVING' ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#3b82f6" size="small" />
          <Text style={styles.loadingText}>Registrando...</Text>
        </View>
      ) : cardState === 'SAVED' ? (
        <View style={styles.savedFooterRow}>
          <Text style={styles.timestampText}>Registrado às {nowTimeStr}</Text>
          <TouchableOpacity
            style={styles.viewRecordBtn}
            onPress={onConfirm}
            activeOpacity={0.7}
          >
            <Text style={styles.viewRecordBtnText}>Ver transação</Text>
          </TouchableOpacity>
        </View>
      ) : cardState === 'ERROR' ? (
        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: '#dc2626' }]}
          onPress={onConfirm}
          activeOpacity={0.8}
        >
          <Text style={styles.confirmBtnText}>Tentar novamente</Text>
        </TouchableOpacity>
      ) : cardState === 'NEEDS_INPUT' ? null : (
        <>
          {cardState === 'READY_TO_CONFIRM' ? (
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Check size={16} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.confirmBtnText}>Sim</Text>
            </TouchableOpacity>
          ) : null}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  loadingText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
  },
  savedFooterRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timestampText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
  },
  viewRecordBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#dcfce7',
  },
  viewRecordBtnText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '700',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#16a34a',
  },
  confirmBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});
