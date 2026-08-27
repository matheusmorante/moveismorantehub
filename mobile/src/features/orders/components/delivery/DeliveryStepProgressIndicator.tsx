import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Check, ClipboardCheck, Truck, MapPin } from 'lucide-react-native';

interface Props {
  currentStep: 1 | 2 | 3;
  isDarkMode?: boolean;
}

export const DeliveryStepProgressIndicator: React.FC<Props> = ({ currentStep, isDarkMode }) => {
  const steps = [
    {
      num: 1,
      title: 'Preparação',
      subtitle: 'Conferência',
      icon: <ClipboardCheck size={14} color="#ffffff" />,
    },
    {
      num: 2,
      title: 'Em Rota',
      subtitle: 'A Caminho',
      icon: <Truck size={14} color="#ffffff" />,
    },
    {
      num: 3,
      title: 'Atendimento',
      subtitle: 'No Cliente',
      icon: <MapPin size={14} color="#ffffff" />,
    },
  ];

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Título de Status da Etapa Atual */}
      <View style={styles.headerInfo}>
        <Text style={styles.stepCounterText}>
          ETAPA {currentStep} DE 3
        </Text>
        <Text style={[styles.stepCurrentTitle, isDarkMode && styles.textLight]}>
          {currentStep === 1 && '📦 1. Preparação e Conferência de Mercadorias'}
          {currentStep === 2 && '🚚 2. Em Deslocamento / Rota para o Destino'}
          {currentStep === 3 && '📍 3. No Local do Cliente • Finalização'}
        </Text>
      </View>

      {/* Stepper Horizontal */}
      <View style={styles.stepperRow}>
        {steps.map((step, idx) => {
          const isDone = step.num < currentStep;
          const isActive = step.num === currentStep;

          let badgeBg = '#cbd5e1';
          if (isDone) badgeBg = '#16a34a';
          else if (isActive) badgeBg = '#2563eb';

          return (
            <React.Fragment key={step.num}>
              {idx > 0 && (
                <View
                  style={[
                    styles.connectorLine,
                    step.num <= currentStep && styles.connectorLineActive,
                    isDarkMode && styles.connectorLineDark,
                  ]}
                />
              )}

              <View style={styles.stepItem}>
                <View style={[styles.circleBadge, { backgroundColor: badgeBg }]}>
                  {isDone ? (
                    <Check size={14} color="#ffffff" strokeWidth={3} />
                  ) : (
                    step.icon
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    isActive && styles.stepLabelActive,
                    isDone && styles.stepLabelDone,
                    isDarkMode && styles.textLight,
                  ]}
                >
                  {step.title}
                </Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 10,
  },
  containerDark: {
    backgroundColor: '#0f172a',
    borderBottomColor: '#1e293b',
  },
  headerInfo: {
    gap: 2,
  },
  stepCounterText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#2563eb',
    letterSpacing: 0.5,
  },
  stepCurrentTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
  },
  textLight: {
    color: '#f8fafc',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
    width: 76,
  },
  circleBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#2563eb',
    fontWeight: '900',
  },
  stepLabelDone: {
    color: '#16a34a',
    fontWeight: '800',
  },
  connectorLine: {
    flex: 1,
    height: 3,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 4,
    marginBottom: 16,
    borderRadius: 2,
  },
  connectorLineActive: {
    backgroundColor: '#2563eb',
  },
  connectorLineDark: {
    backgroundColor: '#334155',
  },
});
