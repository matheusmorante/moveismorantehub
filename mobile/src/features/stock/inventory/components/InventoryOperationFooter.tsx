import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowLeft, ArrowRight, Save } from 'lucide-react-native';

interface Props {
  isDarkMode: boolean;
  activeStage: string | null;
  onBackStage: () => void;
  onReview: () => void;
  onSaveDraft?: () => void;
}

export const InventoryOperationFooter: React.FC<Props> = ({
  isDarkMode,
  activeStage,
  onBackStage,
  onReview,
  onSaveDraft,
}) => {
  const surface = isDarkMode ? '#1e293b' : '#ffffff';
  const border = isDarkMode ? '#334155' : '#e2e8f0';
  const textPrimary = isDarkMode ? '#f1f5f9' : '#0f172a';

  return (
    <View style={[styles.footer, { backgroundColor: surface, borderTopColor: border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {activeStage && (
          <TouchableOpacity style={styles.backBtn} onPress={onBackStage}>
            <ArrowLeft size={18} color={textPrimary} />
            <Text style={[styles.backBtnText, { color: textPrimary }]}>Voltar</Text>
          </TouchableOpacity>
        )}
        {onSaveDraft && (
          <TouchableOpacity style={[styles.draftBtn, { borderColor: border }]} onPress={onSaveDraft}>
            <Save size={16} color={textPrimary} />
            <Text style={[styles.draftBtnText, { color: textPrimary }]}>Salvar rascunho</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <TouchableOpacity style={styles.reviewBtn} onPress={onReview}>
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
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 12 },
  backBtnText: { fontWeight: '700', fontSize: 14 },
  draftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 12,
  },
  draftBtnText: { fontWeight: '700', fontSize: 13 },
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
  reviewBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
});
