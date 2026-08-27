import React, { useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import { Truck, CheckCircle2, RotateCcw } from 'lucide-react-native';

type Props = {
  disabled: boolean;
  onComplete: () => void;
  actionText?: string;
  trackColor?: string;
  knobColor?: string;
  iconType?: 'truck' | 'check' | 'back';
  direction?: 'left' | 'right';
};

export function SlideHoldToStart({
  disabled,
  onComplete,
  actionText = 'Deslize o caminhão',
  trackColor = '#16a34a',
  knobColor = '#14532d',
  iconType = 'truck',
  direction = 'left',
}: Props) {
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
      const distance = direction === 'left' ? -gesture.dx : gesture.dx;
      x.setValue(Math.max(0, Math.min(maxX, distance)));
    },
    onPanResponderRelease: (_, gesture) => {
      const distance = direction === 'left' ? -gesture.dx : gesture.dx;
      const reachedEnd = maxX > 0 && distance >= maxX * 0.88;
      if (reachedEnd) finishSlide();
      else returnToStart();
    },
    onPanResponderTerminate: () => returnToStart(),
  }), [disabled, completedSlides, maxX, direction]);

  const label = disabled
    ? 'Aguarde...'
    : completedSlides === 0
      ? `${actionText} • 1 de 2`
      : 'Deslize novamente • 2 de 2';

  return (
    <View
      style={[
        styles.track,
        { backgroundColor: trackColor },
        disabled && styles.disabled,
      ]}
      onLayout={event => setTrackWidth(event.nativeEvent.layout.width)}
    >
      <Text style={[styles.label, direction === 'left' ? styles.labelLeft : styles.labelRight]}>{label}</Text>
      <Animated.View
        style={[
          styles.knob,
          {
            backgroundColor: knobColor,
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
    backgroundColor: '#94a3b8',
    opacity: 0.75,
  },
  label: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
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
