import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { Sparkles, Check, X, ArrowRight, Zap } from 'lucide-react-native';
import { OptimizationResult } from '../../services/routeOptimizationService';

interface Props {
  visible: boolean;
  result: OptimizationResult | null;
  applying: boolean;
  onApply: () => void;
  onClose: () => void;
  isDarkMode?: boolean;
}

export const RouteOptimizationModal: React.FC<Props> = ({
  visible,
  result,
  applying,
  onApply,
  onClose,
  isDarkMode = false,
}) => {
  if (!result) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[styles.card, isDarkMode && styles.cardDark]}>
          {/* Topo com Ícone */}
          <View style={styles.topHeader}>
            <View style={styles.iconCircle}>
              <Sparkles size={24} color="#2563eb" />
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, isDarkMode && styles.closeBtnDark]}>
              <X size={18} color={isDarkMode ? '#cbd5e1' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.title, isDarkMode && styles.textLight]}>
            Otimização do Roteiro
          </Text>

          {result.hasImprovement ? (
            <>
              {/* Badge de Economia */}
              <View style={styles.savingsBox}>
                <Zap size={18} color="#16a34a" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.savingsTitle}>
                    Economia Estimada: ~{result.savedKm} km e ~{result.savedMinutes} min
                  </Text>
                  <Text style={styles.savingsSubtitle}>
                    A nova sequência reduz o tempo total em trânsito e o consumo de combustível.
                  </Text>
                </View>
              </View>

              {/* Lista das paradas sugeridas */}
              <Text style={[styles.listHeaderTitle, isDarkMode && styles.textMuted]}>
                NOVA ORDEM SUGERIDA:
              </Text>
              <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
                {result.optimizedItems.map((item, idx) => (
                  <View key={item.id} style={[styles.listItemRow, isDarkMode && styles.listItemRowDark]}>
                    <View style={styles.sequenceBadge}>
                      <Text style={styles.sequenceBadgeText}>{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.itemCustomer, isDarkMode && styles.textLight]} numberOfLines={1}>
                        {item.customerName}
                      </Text>
                      <Text style={[styles.itemAddress, isDarkMode && styles.textMuted]} numberOfLines={1}>
                        {item.fullAddress}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>

              {/* Botões de Ação */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.cancelBtn, isDarkMode && styles.cancelBtnDark]}
                  onPress={onClose}
                  disabled={applying}
                >
                  <Text style={[styles.cancelBtnText, isDarkMode && styles.textMuted]}>Manter Atual</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.applyBtn, applying && { opacity: 0.7 }]}
                  onPress={onApply}
                  disabled={applying}
                >
                  <Check size={16} color="#ffffff" strokeWidth={3} />
                  <Text style={styles.applyBtnText}>{applying ? 'Aplicando...' : 'Aplicar Ordem'}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.noImprovementBox}>
                <Check size={24} color="#16a34a" strokeWidth={2.5} />
                <Text style={styles.noImprovementText}>
                  Seu roteiro já está na sequência ideal ou com poucas paradas para otimizar.
                </Text>
              </View>

              <TouchableOpacity style={styles.okBtn} onPress={onClose}>
                <Text style={styles.okBtnText}>Entendi</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  card: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },
  cardDark: {
    backgroundColor: '#1e293b',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnDark: {
    backgroundColor: '#334155',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 14,
  },
  savingsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  savingsTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#166534',
  },
  savingsSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#15803d',
    marginTop: 2,
    lineHeight: 15,
  },
  listHeaderTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: '#64748b',
    marginBottom: 8,
  },
  listScroll: {
    maxHeight: 200,
    marginBottom: 16,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 12,
    marginBottom: 6,
  },
  listItemRowDark: {
    backgroundColor: '#0f172a',
  },
  sequenceBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sequenceBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  itemCustomer: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  itemAddress: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnDark: {
    backgroundColor: '#334155',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
  },
  applyBtn: {
    flex: 1.2,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  applyBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ffffff',
  },
  noImprovementBox: {
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
    gap: 8,
  },
  noImprovementText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
    textAlign: 'center',
    lineHeight: 18,
  },
  okBtn: {
    height: 44,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  okBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  textLight: {
    color: '#f8fafc',
  },
  textMuted: {
    color: '#94a3b8',
  },
});
