import React, { useEffect, useRef, useState } from 'react';
import { Platform, Text, TouchableOpacity, View, ActivityIndicator, StyleSheet } from 'react-native';
import { Animated, Easing } from 'react-native';
import { Play, Pause, AlertTriangle, RefreshCw } from 'lucide-react-native';

export interface AISummaryAudioPlayerProps {
  isDarkMode?: boolean;
  title?: string;
  updatedAt?: string;
  text?: string;
  isLoadingText?: boolean;
  isGenerating?: boolean;
  isOutdated?: boolean;
  hasError?: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  currentTime: number;
  totalDuration: number;
  onToggle: (text: string) => void;
  onRefresh?: () => void;
  onSeekStart?: () => void;
  onSeekEnd: (seconds: number, text?: string) => void;
  setCurrentTime: (seconds: number) => void;
  formatTime: (seconds: number) => string;
}

export const AISummaryAudioPlayer: React.FC<AISummaryAudioPlayerProps> = ({
  isDarkMode = false,
  title = 'Ouvir resumo de hoje',
  updatedAt,
  text = '',
  isLoadingText = false,
  isGenerating = false,
  isOutdated = false,
  hasError = false,
  isSpeaking,
  isPaused,
  currentTime,
  totalDuration,
  onToggle,
  onRefresh,
  onSeekStart,
  onSeekEnd,
  setCurrentTime,
  formatTime,
}) => {
  const isSeekingRef = useRef(false);
  const timelineBarWidthRef = useRef(260);
  const containerPageXRef = useRef(0);
  const [seekingTime, setSeekingTime] = useState<number | null>(null);
  const loadingRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isGenerating) {
      loadingRotation.stopAnimation();
      loadingRotation.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.timing(loadingRotation, {
        toValue: 1,
        duration: 850,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [isGenerating, loadingRotation]);

  const loadingSpin = loadingRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const estimatedDuration = Math.max(10, Math.ceil((text || '').length / 14));
  const effectiveTotalDuration = totalDuration > 0 ? totalDuration : estimatedDuration;

  // Usa seekingTime temporário durante o arraste para movimento 100% fluido sem flickering
  const activeDisplayTime = seekingTime !== null ? seekingTime : currentTime;
  const progressPercent = Math.min(100, Math.max(0, (activeDisplayTime / (effectiveTotalDuration || 1)) * 100));

  const formattedUpdateLabel = updatedAt
    ? `Atualizado às ${updatedAt} · ${effectiveTotalDuration} s`
    : `Duração: ${effectiveTotalDuration} s`;

  const calculateSeekTime = (locationX: number) => {
    const width = Math.max(1, timelineBarWidthRef.current || 260);
    const ratio = Math.max(0, Math.min(1, locationX / width));
    return ratio * (effectiveTotalDuration || 15);
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* 1. Header do Player: Botão Play/Pause + Título + Subtítulo */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={[
            styles.playBtn,
            (isGenerating || isLoadingText || !text) && styles.playBtnDisabled,
            isSpeaking && !isPaused && styles.playBtnActive,
          ]}
          onPress={() => text && onToggle(text)}
          disabled={isGenerating || isLoadingText || !text}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={
            isSpeaking && !isPaused
              ? 'Pausar resumo das entregas de hoje'
              : 'Reproduzir resumo das entregas de hoje'
          }
        >
          {isGenerating ? (
            <>
              <Animated.View style={[styles.generationRing, { transform: [{ rotate: loadingSpin }] }]} />
              <ActivityIndicator color="#ffffff" size="small" />
            </>
          ) : isSpeaking && !isPaused ? (
            <Pause size={22} color="#ffffff" fill="#ffffff" />
          ) : (
            <Play size={22} color="#ffffff" fill="#ffffff" style={{ marginLeft: 3 }} />
          )}
        </TouchableOpacity>

        <View style={styles.infoCol}>
          <Text style={[styles.title, isDarkMode && styles.titleDark]} numberOfLines={1}>
            {title}
          </Text>

          <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]} numberOfLines={1}>
            {isGenerating
              ? 'Gerando resumo em áudio...'
              : isLoadingText
                ? 'Atualizando resumo...'
                : formattedUpdateLabel}
          </Text>

          {isOutdated ? (
            <TouchableOpacity style={styles.outdatedBadge} onPress={onRefresh} activeOpacity={0.7}>
              <AlertTriangle size={12} color="#d97706" />
              <Text style={styles.outdatedText}>⚠ Resumo desatualizado</Text>
              {onRefresh ? <RefreshCw size={10} color="#d97706" style={{ marginLeft: 2 }} /> : null}
            </TouchableOpacity>
          ) : (
            <Text style={styles.aiTag}>Áudio gerado por IA</Text>
          )}
        </View>
      </View>

      {/* 2. Timeline / Barra de Progresso Arrastável */}
      <View style={styles.timelineSection}>
        <View
          onLayout={(e) => {
            if (e.nativeEvent.layout.width > 0) {
              timelineBarWidthRef.current = e.nativeEvent.layout.width;
            }
          }}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(e) => {
            containerPageXRef.current = e.nativeEvent.pageX - e.nativeEvent.locationX;
            isSeekingRef.current = true;
            onSeekStart?.();
            const targetSec = calculateSeekTime(e.nativeEvent.locationX);
            setSeekingTime(targetSec);
          }}
          onResponderMove={(e) => {
            if (isSeekingRef.current) {
              const targetSec = calculateSeekTime(e.nativeEvent.pageX - containerPageXRef.current);
              setSeekingTime(targetSec);
            }
          }}
          onResponderRelease={(e) => {
            if (!isSeekingRef.current) return;
            isSeekingRef.current = false;
            const finalSec = calculateSeekTime(e.nativeEvent.pageX - containerPageXRef.current);
            setSeekingTime(null);
            setCurrentTime(finalSec);
            onSeekEnd(finalSec, text);
          }}
          onResponderTerminate={() => {
            if (isSeekingRef.current) {
              isSeekingRef.current = false;
              setSeekingTime(null);
              onSeekEnd(activeDisplayTime, text);
            }
          }}
          style={styles.touchableTrack}
        >
          {/* Trilha Fundo */}
          <View style={[styles.trackBg, isDarkMode && styles.trackBgDark]}>
            <View style={[styles.trackFill, { width: `${progressPercent}%` }]} />
          </View>

          {/* Indicador Arrastável (Knob) centralizado com transform */}
          <View
            style={[
              styles.knob,
              {
                left: `${progressPercent}%`,
                transform: [{ translateX: -8 }],
              },
            ]}
          />
        </View>

        {/* Contador de Tempo */}
        <View style={styles.timeRow}>
          <Text style={[styles.timeText, isDarkMode && styles.timeTextDark]}>
            {formatTime(activeDisplayTime)} / {formatTime(effectiveTotalDuration)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 8,
  },
  containerDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  playBtnActive: {
    backgroundColor: '#1d4ed8',
  },
  playBtnDisabled: {
    backgroundColor: '#94a3b8',
    elevation: 0,
  },
  generationRing: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
    borderTopColor: '#ffffff',
    borderRightColor: '#ffffff',
  },
  infoCol: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  titleDark: {
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  subtitleDark: {
    color: '#94a3b8',
  },
  aiTag: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 2,
  },
  outdatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
    gap: 4,
  },
  outdatedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d97706',
  },
  timelineSection: {
    marginTop: 8,
  },
  touchableTrack: {
    height: 32,
    justifyContent: 'center',
    position: 'relative',
  },
  trackBg: {
    height: 6,
    backgroundColor: '#cbd5e1',
    borderRadius: 3,
    overflow: 'hidden',
  },
  trackBgDark: {
    backgroundColor: '#334155',
  },
  trackFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 3,
  },
  knob: {
    position: 'absolute',
    top: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    borderWidth: 2,
    borderColor: '#ffffff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: -4,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  timeTextDark: {
    color: '#94a3b8',
  },
});
