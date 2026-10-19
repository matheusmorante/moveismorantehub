import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { InventoryScanFeedback } from '../InventoryScannerScreen';
import { styles } from './inventoryScanner.styles';

interface InventoryScannerFeedbackViewProps {
  lastFeedback: InventoryScanFeedback | null;
  unitsRead: number;
  productsReadCount: number;
  scanned: boolean;
  onClose: () => void;
}

export const InventoryScannerFeedbackView: React.FC<InventoryScannerFeedbackViewProps> = ({
  lastFeedback,
  unitsRead,
  productsReadCount,
  scanned,
  onClose,
}) => {
  return (
    <>
      {lastFeedback && (
        <View
          style={[
            styles.feedback,
            lastFeedback.kind === 'error'
              ? styles.feedbackError
              : lastFeedback.kind === 'warning'
                ? styles.feedbackWarning
                : styles.feedbackSuccess,
          ]}
        >
          <Text style={styles.feedbackTitle}>
            {lastFeedback.kind === 'success' ? 'ÚLTIMA CONTAGEM' : lastFeedback.title}
          </Text>
          {lastFeedback.kind === 'success' && (
            <Text style={styles.feedbackText}>{lastFeedback.title}</Text>
          )}
          {lastFeedback.sku && (
            <Text style={styles.feedbackText}>SKU: {lastFeedback.sku}</Text>
          )}
          {lastFeedback.supplier && (
            <Text style={styles.feedbackText}>Fornecedor: {lastFeedback.supplier}</Text>
          )}
          {lastFeedback.quantity !== undefined && (
            <Text style={styles.feedbackText}>
              Quantidade contada: {lastFeedback.quantity}
            </Text>
          )}
          {lastFeedback.message && (
            <Text style={styles.feedbackText}>{lastFeedback.message}</Text>
          )}
        </View>
      )}
      <Text style={styles.sessionText}>
        {unitsRead} {unitsRead === 1 ? 'unidade contada' : 'unidades contadas'} ·{' '}
        {productsReadCount}{' '}
        {productsReadCount === 1 ? 'produto contado' : 'produtos contados'}
      </Text>
      <TouchableOpacity style={styles.finishButton} onPress={onClose} disabled={scanned}>
        <Text style={styles.finishButtonText}>FINALIZAR LEITURA</Text>
      </TouchableOpacity>
    </>
  );
};
