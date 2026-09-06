import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { X, Sparkles, Fuel, ArrowDownLeft, Calendar, CreditCard, FileCheck } from 'lucide-react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

export const FinanceExamplesModal: React.FC<Props> = ({
  visible,
  onClose,
  isDarkMode = false,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.contentCard, isDarkMode && styles.contentCardDark]}>
          {/* Cabeçalho */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Sparkles size={20} color="#7c3aed" />
              <Text style={[styles.headerTitle, isDarkMode && styles.textDark]}>
                Exemplos de como falar
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <X size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>
            Fale ou digite naturalmente como se estivesse conversando. Veja abaixo como descrever cada tipo de movimentação:
          </Text>

          {/* Lista em Scroll de Exemplos para Leitura */}
          <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={true}>
            {/* 1. Despesa à Vista */}
            <View style={[styles.categorySection, isDarkMode && styles.categorySectionDark]}>
              <View style={styles.categoryHeader}>
                <Fuel size={16} color="#ef4444" />
                <Text style={styles.categoryTitle}>Despesas à Vista</Text>
              </View>
              <View style={styles.exampleItem}>
                <Text style={[styles.exampleText, isDarkMode && styles.exampleTextDark]}>
                  "Paguei R$ 180 de combustível no Posto Shell em PIX hoje"
                </Text>
              </View>
              <View style={styles.exampleItem}>
                <Text style={[styles.exampleText, isDarkMode && styles.exampleTextDark]}>
                  "Almoço com cliente R$ 85 no cartão de débito"
                </Text>
              </View>
            </View>

            {/* 2. Outras Receitas (Exclui Vendas do ERP) */}
            <View style={[styles.categorySection, isDarkMode && styles.categorySectionDark]}>
              <View style={styles.categoryHeader}>
                <ArrowDownLeft size={16} color="#10b981" />
                <Text style={styles.categoryTitle}>Outras Receitas (Aporte, Reembolso, Empréstimos)</Text>
              </View>
              <View style={styles.exampleItem}>
                <Text style={[styles.exampleText, isDarkMode && styles.exampleTextDark]}>
                  "Recebi R$ 2.000 de reembolso do fornecedor pelo PIX"
                </Text>
              </View>
              <View style={styles.exampleItem}>
                <Text style={[styles.exampleText, isDarkMode && styles.exampleTextDark]}>
                  "Entrou R$ 5.000 de aporte de capital dos sócios na conta da empresa"
                </Text>
              </View>
              <View style={styles.exampleItem}>
                <Text style={[styles.exampleText, isDarkMode && styles.exampleTextDark]}>
                  "Recebi R$ 10.000 de empréstimo bancário com aprovação hoje"
                </Text>
              </View>
            </View>

            {/* 3. Contas Recorrentes */}
            <View style={[styles.categorySection, isDarkMode && styles.categorySectionDark]}>
              <View style={styles.categoryHeader}>
                <Calendar size={16} color="#3b82f6" />
                <Text style={styles.categoryTitle}>Contas Recorrentes</Text>
              </View>
              <View style={styles.exampleItem}>
                <Text style={[styles.exampleText, isDarkMode && styles.exampleTextDark]}>
                  "A conta de internet é R$ 149,90 todo mês, dia 10"
                </Text>
              </View>
              <View style={styles.exampleItem}>
                <Text style={[styles.exampleText, isDarkMode && styles.exampleTextDark]}>
                  "Aluguel da loja R$ 2.500 mensal com vencimento dia 05"
                </Text>
              </View>
            </View>

            {/* 4. Compras Parceladas */}
            <View style={[styles.categorySection, isDarkMode && styles.categorySectionDark]}>
              <View style={styles.categoryHeader}>
                <CreditCard size={16} color="#8b5cf6" />
                <Text style={styles.categoryTitle}>Compras Parceladas</Text>
              </View>
              <View style={styles.exampleItem}>
                <Text style={[styles.exampleText, isDarkMode && styles.exampleTextDark]}>
                  "Comprei um notebook de R$ 4.500 em 10x no cartão de crédito"
                </Text>
              </View>
              <View style={styles.exampleItem}>
                <Text style={[styles.exampleText, isDarkMode && styles.exampleTextDark]}>
                  "Jogo de pneus R$ 1.200 parcelado em 4 vezes"
                </Text>
              </View>
            </View>

            {/* 5. Baixas de Contas a Pagar */}
            <View style={[styles.categorySection, isDarkMode && styles.categorySectionDark]}>
              <View style={styles.categoryHeader}>
                <FileCheck size={16} color="#f59e0b" />
                <Text style={styles.categoryTitle}>Baixa de Contas a Pagar</Text>
              </View>
              <View style={styles.exampleItem}>
                <Text style={[styles.exampleText, isDarkMode && styles.exampleTextDark]}>
                  "Paguei a conta de luz da Copel"
                </Text>
              </View>
              <View style={styles.exampleItem}>
                <Text style={[styles.exampleText, isDarkMode && styles.exampleTextDark]}>
                  "Baixei o boleto do fornecedor de R$ 890"
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Botão Entendi */}
          <TouchableOpacity style={styles.okBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.okBtnText}>Entendi</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 16,
  },
  contentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    maxHeight: '80%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  contentCardDark: {
    backgroundColor: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  textDark: {
    color: '#f8fafc',
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 16,
  },
  subtitleDark: {
    color: '#94a3b8',
  },
  scrollList: {
    marginBottom: 16,
  },
  categorySection: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categorySectionDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  exampleItem: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#7c3aed',
  },
  exampleText: {
    fontSize: 12.5,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 17,
  },
  exampleTextDark: {
    color: '#cbd5e1',
  },
  okBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  okBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
