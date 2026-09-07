import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Fuel, ArrowDownLeft, FileCheck, Layers, ChevronRight } from 'lucide-react-native';
import { FinanceExamplesModal } from './FinanceExamplesModal';

const SEU_LIZANDRO_IMG = require('../../../../assets/lizandro.png');

interface Props {
  isDarkMode?: boolean;
}

export const AssistantEmptyState: React.FC<Props> = ({
  isDarkMode = false,
}) => {
  const [showExamplesModal, setShowExamplesModal] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Image
          source={SEU_LIZANDRO_IMG}
          style={{ width: '100%', height: '100%', borderRadius: 26 }}
          resizeMode="cover"
        />
      </View>

      <Text style={[styles.title, isDarkMode && styles.textDark]}>
        Seu Lizandro - IA Financeira
      </Text>

      <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>
        Fale ou digite naturalmente o que aconteceu.{'\n'}Eu identifico os dados e preparo o lançamento para você.
      </Text>

      {/* Container de Exemplos Práticos Rápidos (Apenas para Leitura) */}
      <View style={[styles.examplesContainer, isDarkMode && styles.examplesContainerDark]}>
        <Text style={[styles.containerHeaderTitle, isDarkMode && styles.subtitleDark]}>
          EXEMPLOS PRÁTICOS DE COMO FALAR:
        </Text>

        {/* 1. Saída */}
        <View style={[styles.exampleRow, isDarkMode && styles.exampleRowDark]}>
          <View style={styles.badgeLabel}>
            <Fuel size={12} color="#ef4444" />
            <Text style={styles.badgeLabelTextExpense}>Saída</Text>
          </View>
          <Text style={[styles.exampleQuoteText, isDarkMode && styles.exampleQuoteTextDark]}>
            "Paguei R$ 180 de combustível no Posto Shell em PIX hoje"
          </Text>
        </View>

        {/* 2. Entrada */}
        <View style={[styles.exampleRow, isDarkMode && styles.exampleRowDark]}>
          <View style={styles.badgeLabel}>
            <ArrowDownLeft size={12} color="#10b981" />
            <Text style={styles.badgeLabelTextIncome}>Entrada</Text>
          </View>
          <Text style={[styles.exampleQuoteText, isDarkMode && styles.exampleQuoteTextDark]}>
            "Recebi R$ 1.500 de reembolso do fornecedor em PIX"
          </Text>
        </View>

        {/* 3. Pagamento de Parcela */}
        <View style={[styles.exampleRow, isDarkMode && styles.exampleRowDark]}>
          <View style={styles.badgeLabel}>
            <FileCheck size={12} color="#3b82f6" />
            <Text style={styles.badgeLabelTextInstallment}>Pagamento de Parcela</Text>
          </View>
          <Text style={[styles.exampleQuoteText, isDarkMode && styles.exampleQuoteTextDark]}>
            "Paguei a 1ª parcela do frete de R$ 500 no PIX hoje"
          </Text>
        </View>

        {/* 4. Múltiplas Saídas */}
        <View style={[styles.exampleRow, isDarkMode && styles.exampleRowDark]}>
          <View style={styles.badgeLabel}>
            <Layers size={12} color="#8b5cf6" />
            <Text style={styles.badgeLabelTextMultiple}>Múltiplas Saídas</Text>
          </View>
          <Text style={[styles.exampleQuoteText, isDarkMode && styles.exampleQuoteTextDark]}>
            "Paguei R$ 200 de luz e R$ 150 de internet hoje"
          </Text>
        </View>

        {/* Botão Ver Mais Exemplos ao Final do Container */}
        <TouchableOpacity
          style={[styles.seeMoreBtn, isDarkMode && styles.seeMoreBtnDark]}
          onPress={() => setShowExamplesModal(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.seeMoreBtnText}>Ver mais exemplos completos</Text>
          <ChevronRight size={16} color="#7c3aed" />
        </TouchableOpacity>
      </View>

      {/* Modal Informativo com Todos os Exemplos em Scroll */}
      <FinanceExamplesModal
        visible={showExamplesModal}
        onClose={() => setShowExamplesModal(false)}
        isDarkMode={isDarkMode}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  textDark: {
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 12.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  subtitleDark: {
    color: '#94a3b8',
  },
  examplesContainer: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  examplesContainerDark: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  containerHeaderTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  exampleRow: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  exampleRowDark: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
  },
  badgeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  badgeLabelTextExpense: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ef4444',
  },
  badgeLabelTextIncome: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
  badgeLabelTextRecurrent: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3b82f6',
  },
  badgeLabelTextInstallment: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3b82f6',
  },
  badgeLabelTextMultiple: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8b5cf6',
  },
  exampleQuoteText: {
    fontSize: 12,
    color: '#334155',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  exampleQuoteTextDark: {
    color: '#cbd5e1',
  },
  seeMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
    paddingVertical: 10,
    backgroundColor: '#f3e8ff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  seeMoreBtnDark: {
    backgroundColor: '#3b0764',
    borderColor: '#6b21a8',
  },
  seeMoreBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#7c3aed',
  },
});
