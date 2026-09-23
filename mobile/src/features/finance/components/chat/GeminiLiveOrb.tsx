import React, { useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { AudioLines, Mic, MicOff, Pause, Play, X } from 'lucide-react-native';

interface Props {
  active: boolean;
  paused: boolean;
  muted: boolean;
  remainingMs: number;
  onPause: () => void;
  onMute: () => void;
  onEnd: () => void;
}

export const GeminiLiveOrb: React.FC<Props> = ({ active, paused, muted, remainingMs, onPause, onMute, onEnd }) => {
  const { width, height } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);
  const [right, setRight] = useState(true);
  const expandedRef = useRef(false);
  const dragOrigin = useRef({ x: width - 72, y: Math.max(130, height * 0.38) });
  const dragPosition = useRef({ ...dragOrigin.current });
  const position = useRef(new Animated.ValueXY({ x: width - 72, y: Math.max(130, height * 0.38) })).current;
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 6,
    onPanResponderGrant: () => { dragOrigin.current = { ...dragPosition.current }; },
    onPanResponderMove: (_, g) => {
      dragPosition.current = { x: dragOrigin.current.x + g.dx, y: dragOrigin.current.y + g.dy };
      position.setValue(dragPosition.current);
    },
    onPanResponderRelease: (_, g) => {
      const dockRight = g.moveX > width / 2;
      setRight(dockRight);
      const y = Math.max(90, Math.min(height - 110, g.moveY - 28));
      dragPosition.current = { x: dockRight ? width - 66 : 10, y };
      position.setValue(dragPosition.current);
    },
  })).current;
  if (!active) return null;
  return (
    <Animated.View {...pan.panHandlers} style={[styles.wrap, { transform: position.getTranslateTransform() }]}>
      {expanded && <View style={[styles.controls, right ? styles.controlsLeft : styles.controlsRight]}>
        <TouchableOpacity accessibilityLabel={paused ? 'Retomar conversa' : 'Pausar conversa'} style={styles.control} onPress={onPause}>{paused ? <Play color="white" size={18} /> : <Pause color="white" size={18} />}</TouchableOpacity>
        <TouchableOpacity accessibilityLabel={muted ? 'Ativar microfone' : 'Silenciar microfone'} style={styles.control} onPress={onMute}>{muted ? <MicOff color="white" size={18} /> : <Mic color="white" size={18} />}</TouchableOpacity>
        <TouchableOpacity accessibilityLabel="Encerrar chamada" style={[styles.control, styles.end]} onPress={onEnd}><X color="white" size={18} /></TouchableOpacity>
      </View>}
      <TouchableOpacity accessibilityLabel="Controles Gemini Live" onPress={() => { expandedRef.current = !expandedRef.current; setExpanded(expandedRef.current); }} style={[styles.orb, paused && styles.paused]}>
        {paused ? <Pause color="white" size={23} /> : <AudioLines color="white" size={24} />}
        <Text style={styles.timer}>{Math.ceil(remainingMs / 60000)}m</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, zIndex: 20, width: 58, height: 58 },
  orb: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', elevation: 8 },
  paused: { backgroundColor: '#64748b' },
  timer: { color: 'white', fontSize: 9, marginTop: 1 },
  controls: { position: 'absolute', top: 4, flexDirection: 'row', gap: 8, backgroundColor: '#0f172a', borderRadius: 24, padding: 6 },
  controlsLeft: { right: 64 },
  controlsRight: { left: 64 },
  control: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#334155' },
  end: { backgroundColor: '#dc2626' },
});
