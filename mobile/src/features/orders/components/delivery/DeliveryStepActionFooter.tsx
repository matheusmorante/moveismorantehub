import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SlideHoldToStart } from './SlideHoldToStart';

export interface DeliveryStepActionFooterProps {
  currentStep: number; // 1: Preparação, 2: Em Rota, 3: Chegada, 4: Em Atendimento
  isDarkMode: boolean;
  loading: boolean;
  isChecklistComplete: boolean;
  paymentsConfirmed: boolean;
  onStartDelivery: () => void;
  onArriveAtDestination: () => void;
  onStepBackToPreparation: () => void;
  onStartService: () => void;
  onStepBackToRoute: () => void;
  onFinishDelivery: () => void;
  onStepBackToArrival: () => void;
}

/**
 * Rodapé fixo de ações do Fluxo de Entrega.
 * Posicionado no fim da tela, rigorosamente ancorado na Zona Segura (SafeAreaInsets),
 * sem sobrepor os botões de navegação do dispositivo (Android 3-buttons / Gesture bar).
 * 
 * - Etapa 1: Deslize para a esquerda para INICIAR ROTA (inicia na direita e arrasta para a esquerda).
 * - Etapa 2: Deslize para a esquerda para CHEGUEI NO DESTINO e direita para VOLTAR AO PREPARO.
 * - Etapa 3: Deslize para a esquerda para INICIAR ATENDIMENTO e direita para VOLTAR PARA EM ROTA.
 * - Etapa 4: Deslize para a esquerda para FINALIZAR ENTREGA e direita para VOLTAR À CHEGADA.
 */
export const DeliveryStepActionFooter: React.FC<DeliveryStepActionFooterProps> = ({
  currentStep,
  isDarkMode,
  loading,
  isChecklistComplete,
  paymentsConfirmed,
  onStartDelivery,
  onArriveAtDestination,
  onStepBackToPreparation,
  onStartService,
  onStepBackToRoute,
  onFinishDelivery,
  onStepBackToArrival,
}) => {
  const insets = useSafeAreaInsets();
  // Garante padding inferior que respeita a barra de botões do celular / home indicator
  const bottomInset = Math.max(insets.bottom, 12);

  return (
    <View
      style={[
        styles.footer,
        { paddingBottom: bottomInset },
        isDarkMode && styles.footerDark,
      ]}
    >
      {/* ETAPA 1: PREPARAÇÃO */}
      {currentStep === 1 && (
        <View style={styles.stepContainer}>
          {!isChecklistComplete && (
            <Text style={[styles.hintText, isDarkMode && styles.hintTextDark]}>
              Confira todos os itens do checklist acima para iniciar a rota
            </Text>
          )}
          <SlideHoldToStart
            actionText="« Deslize para INICIAR ROTA"
            label="« Deslize para INICIAR ROTA"
            loadingLabel="Iniciando Rota..."
            onComplete={onStartDelivery}
            onConfirm={onStartDelivery}
            loading={loading}
            disabled={!isChecklistComplete || loading}
            trackColor="#16a34a"
            knobColor="#14532d"
            iconType="truck"
            direction="left"
            isDarkMode={isDarkMode}
          />
        </View>
      )}

      {/* ETAPA 2: EM ROTA */}
      {currentStep === 2 && (
        <View style={styles.stepContainer}>
          {/* Ação Primária: Avançar para Chegada (Esquerda) */}
          <SlideHoldToStart
            disabled={loading}
            loading={loading}
            onComplete={onArriveAtDestination}
            onConfirm={onArriveAtDestination}
            actionText="« Deslize para CHEGUEI NO DESTINO"
            trackColor="#2563eb"
            knobColor="#1d4ed8"
            iconType="check"
            direction="left"
            isDarkMode={isDarkMode}
          />

          {/* Ação Secundária: Voltar para Preparação (Direita) */}
          <SlideHoldToStart
            disabled={loading}
            loading={loading}
            onComplete={onStepBackToPreparation}
            onConfirm={onStepBackToPreparation}
            actionText="Deslize para VOLTAR AO PREPARO »"
            trackColor="#64748b"
            knobColor="#334155"
            iconType="back"
            direction="right"
            isDarkMode={isDarkMode}
          />
        </View>
      )}

      {/* ETAPA 3: CHEGADA */}
      {currentStep === 3 && (
        <View style={styles.stepContainer}>
          {/* Ação Primária: Iniciar Atendimento (Esquerda) */}
          <SlideHoldToStart
            disabled={loading}
            loading={loading}
            onComplete={onStartService}
            onConfirm={onStartService}
            actionText="« Deslize para INICIAR ATENDIMENTO"
            trackColor="#2563eb"
            knobColor="#1d4ed8"
            iconType="check"
            direction="left"
            isDarkMode={isDarkMode}
          />

          {/* Ação Secundária: Voltar para Em Rota (Direita) */}
          <SlideHoldToStart
            disabled={loading}
            loading={loading}
            onComplete={onStepBackToRoute}
            onConfirm={onStepBackToRoute}
            actionText="Deslize para VOLTAR PARA EM ROTA »"
            trackColor="#64748b"
            knobColor="#334155"
            iconType="back"
            direction="right"
            isDarkMode={isDarkMode}
          />
        </View>
      )}

      {/* ETAPA 4: EM ATENDIMENTO */}
      {currentStep === 4 && (
        <View style={styles.stepContainer}>
          {!paymentsConfirmed && (
            <Text style={[styles.warningText, isDarkMode && styles.warningTextDark]}>
              ⚠️ Confirme todos os pagamentos acima para liberar a finalização
            </Text>
          )}

          {/* Ação Primária: Finalizar Entrega (Esquerda) */}
          <SlideHoldToStart
            disabled={loading || !paymentsConfirmed}
            loading={loading}
            onComplete={onFinishDelivery}
            onConfirm={onFinishDelivery}
            actionText="« Deslize para FINALIZAR"
            trackColor="#16a34a"
            knobColor="#14532d"
            iconType="check"
            direction="left"
            isDarkMode={isDarkMode}
          />

          {/* Ação Secundária: Voltar para Chegada (Direita) */}
          <SlideHoldToStart
            disabled={loading}
            loading={loading}
            onComplete={onStepBackToArrival}
            onConfirm={onStepBackToArrival}
            actionText="Deslize para VOLTAR À CHEGADA »"
            trackColor="#64748b"
            knobColor="#334155"
            iconType="back"
            direction="right"
            isDarkMode={isDarkMode}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    paddingTop: 10,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 8,
  },
  footerDark: {
    backgroundColor: '#0f172a',
    borderTopColor: '#1e293b',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
  },
  stepContainer: {
    gap: 8,
  },
  hintText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 2,
  },
  hintTextDark: {
    color: '#94a3b8',
  },
  warningText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b45309',
    textAlign: 'center',
    marginBottom: 2,
  },
  warningTextDark: {
    color: '#f59e0b',
  },
});
