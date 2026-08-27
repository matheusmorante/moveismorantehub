import React, { useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import { Truck } from 'lucide-react-native';

type Props = { disabled: boolean; onComplete: () => void };

export function SlideHoldToStart({ disabled, onComplete }: Props) {
  const x = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(0);
  const [completedSlides, setCompletedSlides] = useState(0);
  const maxX = Math.max(0, trackWidth - 58);

  const returnToStart = (callback?: () => void) => {
    Animated.spring(x, { toValue: 0, useNativeDriver: false }).start(callback);
  };

  const finishSlide = () => {
    if (completedSlides === 0) {
      setCompletedSlides(1);
      returnToStart();
      return;
    }
    onComplete();
  };

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: () => !disabled,
    onPanResponderMove: (_, gesture) => {
      x.setValue(Math.max(0, Math.min(maxX, gesture.dx)));
    },
    onPanResponderRelease: (_, gesture) => {
      const reachedEnd = maxX > 0 && gesture.dx >= maxX * 0.88;
      if (reachedEnd) finishSlide();
      else returnToStart();
    },
    onPanResponderTerminate: () => returnToStart(),
  }), [disabled, completedSlides, maxX]);

  const label = disabled
    ? 'Aguarde...'
    : completedSlides === 0
      ? 'Deslize o caminhão • 1 de 2'
      : 'Deslize novamente • 2 de 2';

  return (
    <View style={[styles.track, disabled && styles.disabled]} onLayout={event => setTrackWidth(event.nativeEvent.layout.width)}>
      <Text style={styles.label}>{label}</Text>
      <Animated.View style={[styles.knob, { transform: [{ translateX: x }] }]} {...responder.panHandlers}>
        <Truck size={22} color="#ffffff" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 58, borderRadius: 29, backgroundColor: '#16a34a', justifyContent: 'center', overflow: 'hidden' },
  disabled: { backgroundColor: '#94a3b8', opacity: 0.75 },
  label: { color: '#ffffff', fontSize: 12, fontWeight: '900', textAlign: 'center', paddingLeft: 48 },
  knob: { position: 'absolute', left: 4, width: 50, height: 50, borderRadius: 25, backgroundColor: '#14532d', alignItems: 'center', justifyContent: 'center', elevation: 4 },
});
