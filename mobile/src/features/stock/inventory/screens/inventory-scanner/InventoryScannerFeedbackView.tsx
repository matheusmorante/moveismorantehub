import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { InventoryScanFeedback } from '../InventoryScannerScreen';
import { styles } from './inventoryScanner.styles';

interface InventoryScannerFeedbackViewProps {
  description: string;
  feedbacks: InventoryScanFeedback[];
  unitsRead: number;
  productsReadCount: number;
  countedCount?: number;
  totalCount?: number;
  progressPercent?: number;
  scanned: boolean;
  onClose: () => void;
}

export const InventoryScannerFeedbackView: React.FC<InventoryScannerFeedbackViewProps> = ({
  description,
  feedbacks,
  unitsRead,
  productsReadCount,
  countedCount,
  totalCount,
  progressPercent,
  scanned,
  onClose,
}) => {
  return (
    <>
      {feedbacks.map((feedback, index) => (
        <View
          key={`${feedback.itemId || feedback.title}-${index}`}
          style={[
            styles.feedback,
            feedback.kind === 'error'
              ? styles.feedbackError
              : feedback.kind === 'warning'
                ? styles.feedbackWarning
                : styles.feedbackSuccess,
          ]}
        >
          <Text style={styles.feedbackTitle}>
            {feedback.kind === 'success'
              ? index === 0
                ? 'ÚLTIMA CONTAGEM'
                : 'CONTAGEM ANTERIOR'
              : feedback.title}
          </Text>
          {feedback.kind === 'success' && (
            <Text style={styles.feedbackText}>{feedback.title}</Text>
          )}
          {feedback.sku && (
            <Text style={styles.feedbackText}>SKU: {feedback.sku}</Text>
          )}
          {feedback.supplier && (
            <Text style={styles.feedbackText}>Fornecedor: {feedback.supplier}</Text>
          )}
          {feedback.quantity !== undefined && (
            <Text style={styles.feedbackText}>
              Quantidade contada: {feedback.quantity}
            </Text>
          )}
          {feedback.message && (
            <Text style={styles.feedbackText}>{feedback.message}</Text>
          )}
        </View>
      ))}
      <Text style={[styles.footerText, styles.footerTextInventory]}>{description}</Text>
      {countedCount !== undefined && totalCount !== undefined && progressPercent !== undefined ? (
        <View style={styles.sessionStatsRow}>
          <Text style={styles.sessionStat}>
            {countedCount} / {totalCount} produtos contados
          </Text>
          <Text style={styles.sessionStat}>{progressPercent}%</Text>
        </View>
      ) : (
        <View style={styles.sessionStatsRow}>
          <Text style={styles.sessionStat}>
            {unitsRead} {unitsRead === 1 ? 'unidade contada' : 'unidades contadas'}
          </Text>
          <Text style={styles.sessionStat}>
            {productsReadCount}{' '}
            {productsReadCount === 1 ? 'produto contado' : 'produtos contados'}
          </Text>
        </View>
      )}
      <TouchableOpacity style={styles.finishButton} onPress={onClose} disabled={scanned}>
        <Text style={styles.finishButtonText}>Finalizar leitura</Text>
      </TouchableOpacity>
    </>
  );
};
