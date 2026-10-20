import React, { useMemo, useRef } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import { Truck, CheckCircle2, RotateCcw } from 'lucide-react-native';

export type SlideHoldToStartProps = {
  disabled?: boolean;
  loading?: boolean;
  onComplete?: () => void;
  onConfirm?: () => void;
  actionText?: string;
  label?: string;
  loadingLabel?: string;
  trackColor?: string;
  knobColor?: string;
  iconType?: 'truck' | 'check' | 'back';
  direction?: 'left' | 'right';
  isDarkMode?: boolean;
};

/**
 * Botão deslizante com confirmação de um único deslize.
 * Usado nas etapas de transição do fluxo de entrega (Preparação -> Em Rota -> Atendimento -> Finalização).
 * Quando desativado, apresenta cor cinza meio transparente e bloqueia qualquer interação física.
 */
export function SlideHoldToStart({
  disabled = false,
  loading = false,
  onComplete,
  onConfirm,
  actionText = 'Deslize para confirmar',
  label,
  loadingLabel = 'Aguarde...',
  trackColor = '#16a34a',
  knobColor = '#14532d',
  iconType = 'truck',
  direction = 'left',
  isDarkMode = false,
}: SlideHoldToStartProps) {
  const x = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = React.useState(280);
  const maxX = Math.max(0, trackWidth - 58);

  const returnToStart = (callback?: () => void) => {
    Animated.spring(x, { toValue: 0, useNativeDriver: false }).start(callback);
  };

  const isDisabled = Boolean(disabled || loading);

  const finishSlide = () => {
    if (isDisabled) {
      returnToStart();
      return;
    }
    returnToStart();
    const handleAction = onComplete || onConfirm;
    handleAction?.();
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !isDisabled,
        onMoveShouldSetPanResponder: () => !isDisabled,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, gesture) => {
          if (isDisabled) return;
          const distance = direction === 'left' ? -gesture.dx : gesture.dx;
          x.setValue(Math.max(0, Math.min(maxX, distance)));
        },
        onPanResponderRelease: (_, gesture) => {
          if (isDisabled) {
            returnToStart();
            return;
          }
          const distance = direction === 'left' ? -gesture.dx : gesture.dx;
          const reachedEnd = maxX > 0 && distance >= maxX * 0.85;
          if (reachedEnd) finishSlide();
          else returnToStart();
        },
        onPanResponderTerminate: () => returnToStart(),
      }),
    [isDisabled, maxX, direction, onComplete, onConfirm]
  );

  const displayLabel = loading ? loadingLabel : (label || actionText);

  // Cores quando desativado: cinza meio transparente
  const currentTrackColor = isDisabled
    ? isDarkMode
      ? '#475569'
      : '#94a3b8'
    : trackColor;
  const currentKnobColor = isDisabled
    ? isDarkMode
      ? '#334155'
      : '#64748b'
    : knobColor;

  return (
    <View
      style={[
        styles.track,
        { backgroundColor: currentTrackColor },
        isDisabled && styles.disabled,
      ]}
      pointerEvents={isDisabled ? 'none' : 'auto'}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      accessibilityRole="adjustable"
      accessibilityState={{ disabled: isDisabled }}
      accessibilityLabel={displayLabel}
    >
      <Text
        style={[
          styles.label,
          direction === 'left' ? styles.labelLeft : styles.labelRight,
          isDisabled && styles.labelDisabled,
        ]}
      >
        {displayLabel}
      </Text>
      <Animated.View
        style={[
          styles.knob,
          {
            backgroundColor: currentKnobColor,
            ...(direction === 'left' ? { right: 4 } : { left: 4 }),
            transform: [{ translateX: direction === 'left' ? Animated.multiply(x, -1) : x }],
          },
        ]}
        {...responder.panHandlers}
      >
        {iconType === 'check' ? (
          <CheckCircle2 size={24} color="#ffffff" />
        ) : iconType === 'back' ? (
          <RotateCcw size={22} color="#ffffff" />
        ) : (
          <Truck size={22} color="#ffffff" />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  labelDisabled: {
    color: '#f8fafc',
  },
  labelLeft: {
    paddingRight: 48,
  },
  labelRight: {
    paddingLeft: 48,
  },
  knob: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
});
