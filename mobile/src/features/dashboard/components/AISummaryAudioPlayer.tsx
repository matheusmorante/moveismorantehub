import React, { useRef } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { Pause, Play } from 'lucide-react-native';

interface Props {
  isDarkMode: boolean;
  text: string;
  isSpeaking: boolean;
  isPaused: boolean;
  currentTime: number;
  totalDuration: number;
  onToggle: (text: string) => void;
  onSeekEnd: (seconds: number, text?: string) => void;
  setCurrentTime: (seconds: number) => void;
  formatTime: (seconds: number) => string;
}

export const AISummaryAudioPlayer: React.FC<Props> = ({
  isDarkMode, text, isSpeaking, isPaused, currentTime, totalDuration,
  onToggle, onSeekEnd, setCurrentTime, formatTime,
}) => {
  const isSeekingRef = useRef(false);
  const timelineBarWidthRef = useRef(280);
  const containerPageXRef = useRef(0);
  const estimatedDuration = Math.max(5, Math.ceil((text || '').length / 14));
  const effectiveTotalDuration = totalDuration > 0 ? totalDuration : estimatedDuration;
  const seek = (locationX: number) => {
    const ratio = Math.max(0, Math.min(1, locationX / (timelineBarWidthRef.current || 280)));
    return ratio * (effectiveTotalDuration || 15);
  };

  return (
    <View style={{ backgroundColor: isDarkMode ? '#0f172a' : '#f1f5f9', borderRadius: 18, padding: 12, gap: 10, borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#e2e8f0' }}>
      <View
        onLayout={(e) => { timelineBarWidthRef.current = e.nativeEvent.layout.width || 280; }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => {
          containerPageXRef.current = e.nativeEvent.pageX - e.nativeEvent.locationX;
          isSeekingRef.current = true;
          setCurrentTime(seek(e.nativeEvent.locationX));
        }}
        onResponderMove={(e) => {
          if (isSeekingRef.current) setCurrentTime(seek(e.nativeEvent.pageX - containerPageXRef.current));
        }}
        onResponderRelease={(e) => {
          if (!isSeekingRef.current) return;
          isSeekingRef.current = false;
          const seconds = seek(e.nativeEvent.pageX - containerPageXRef.current);
          setCurrentTime(seconds);
          onSeekEnd(seconds, text);
        }}
        onResponderTerminate={() => {
          if (isSeekingRef.current) {
            isSeekingRef.current = false;
            onSeekEnd(currentTime, text);
          }
        }}
        style={{ height: 26, justifyContent: 'center', position: 'relative' }}
      >
        <View pointerEvents="none" style={{ height: 8, backgroundColor: isDarkMode ? '#334155' : '#cbd5e1', borderRadius: 4, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${Math.min(100, Math.max(0, (currentTime / (effectiveTotalDuration || 1)) * 100))}%`, backgroundColor: '#2563eb', borderRadius: 4 }} />
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', left: `${Math.min(94, Math.max(0, (currentTime / (effectiveTotalDuration || 1)) * 100))}%`, width: 16, height: 16, borderRadius: 8, backgroundColor: '#2563eb', borderWidth: 2, borderColor: '#ffffff', elevation: 3, top: 5 }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => onToggle(text)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2563eb', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, elevation: 2 }}>
          {isSpeaking && !isPaused ? <Pause size={16} color="#ffffff" fill="#ffffff" /> : <Play size={16} color="#ffffff" fill="#ffffff" style={{ marginLeft: 2 }} />}
          <Text style={{ fontSize: 12, fontWeight: '900', color: '#ffffff' }}>{isSpeaking ? (isPaused ? 'Continuar' : 'Pausar') : 'Ouvir Resumo'}</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 11, fontWeight: '800', color: isDarkMode ? '#cbd5e1' : '#64748b', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
          {formatTime(currentTime)} / {formatTime(effectiveTotalDuration)}
        </Text>
      </View>
    </View>
  );
};
