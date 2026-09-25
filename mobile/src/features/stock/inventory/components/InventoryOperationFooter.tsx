import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';

interface Props {
  isDarkMode: boolean;
  activeStage: string | null;
  onBack: () => void;
  onReview: () => void;
}

export const InventoryOperationFooter: React.FC<Props> = ({
  isDarkMode,
  activeStage,
  onBack,
  onReview,
}) => {
  const surface = isDarkMode ? '#1e293b' : '#ffffff';
  const border = isDarkMode ? '#334155' : '#e2e8f0';
  const textPrimary = isDarkMode ? '#f1f5f9' : '#0f172a';

  return (
    <View style={[styles.footer, { backgroundColor: surface, borderTopColor: border }]}>
      <TouchableOpacity testID="footer-back-btn" style={styles.backBtn} onPress={onBack}>
        <ArrowLeft size={18} color={textPrimary} />
        <Text style={[styles.backBtnText, { color: textPrimary }]}>
          {activeStage ? 'Voltar para etapas' : 'Voltar'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity testID="footer-review-btn" style={styles.reviewBtn} onPress={onReview}>
        <Text style={styles.reviewBtnText}>Revisar</Text>
        <ArrowRight size={18} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  backBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#10b981',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  reviewBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
});
