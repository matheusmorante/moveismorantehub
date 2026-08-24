import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Sparkles, RefreshCw, Volume2, Play, Pause } from 'lucide-react-native';

interface Props {
  isDarkMode: boolean;
  aiSummaryTab: 'today' | 'tomorrow';
  setAiSummaryTab: (val: 'today' | 'tomorrow') => void;
  hasTodayDeliveries?: boolean;
  aiSummaryToday: string;
  aiSummaryTomorrow: string;
  isGeneratingAISummary: boolean;
  onRefreshSummary: () => void;
  isSpeakingSummary: boolean;
  speechIsPaused: boolean;
  speechCurrentTime: number;
  speechTotalDuration: number;
  handleToggleSpeech: (text: string) => void;
  finishSeekToPosition: (secs: number) => void;
  setSpeechCurrentTime: (secs: number) => void;
  formatAudioTime: (secs: number) => string;
}

export const AISummaryCard: React.FC<Props> = ({
  isDarkMode,
  aiSummaryTab,
  setAiSummaryTab,
  hasTodayDeliveries = true,
  aiSummaryToday,
  aiSummaryTomorrow,
  isGeneratingAISummary,
  onRefreshSummary,
  isSpeakingSummary,
  speechIsPaused,
  speechCurrentTime,
  speechTotalDuration,
  handleToggleSpeech,
  finishSeekToPosition,
  setSpeechCurrentTime,
  formatAudioTime,
}) => {
  const isSeekingRef = useRef(false);
  const timelineBarWidthRef = useRef(280);
  const containerPageXRef = useRef(0);

  const activeSummaryText = aiSummaryTab === 'today' ? aiSummaryToday : aiSummaryTomorrow;
  const estimatedDuration = Math.max(5, Math.ceil((activeSummaryText || '').length / 14));
  const effectiveTotalDuration = speechTotalDuration > 0 ? speechTotalDuration : estimatedDuration;

  return (
    <View style={{
      marginHorizontal: 16,
      marginVertical: 10,
      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
      borderRadius: 24,
      padding: 16,
      borderWidth: 1,
      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8
    }}>
      {/* Cabeçalho do Card */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 32, height: 32, borderRadius: 12, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={16} color="#ffffff" />
          </View>
          <View>
            <Text style={{ fontSize: 13, fontWeight: '900', color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
              Resumo Inteligente das Entregas
            </Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b' }}>
              Narrativa IA para motoristas & montadores
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onRefreshSummary}
          disabled={isGeneratingAISummary}
          style={{ padding: 6, opacity: isGeneratingAISummary ? 0.5 : 1 }}
        >
          <RefreshCw size={16} color={isDarkMode ? '#94a3b8' : '#64748b'} />
        </TouchableOpacity>
      </View>

      {/* Sub-abas de Período (Hoje vs Amanhã) */}
      <View style={{ flexDirection: 'row', backgroundColor: isDarkMode ? '#0f172a' : '#f1f5f9', borderRadius: 14, padding: 3, marginBottom: 12 }}>
        <TouchableOpacity
          disabled={!hasTodayDeliveries}
          style={{
            flex: 1,
            paddingVertical: 6,
            alignItems: 'center',
            borderRadius: 11,
            backgroundColor: !hasTodayDeliveries
              ? (isDarkMode ? '#334155' : '#e2e8f0')
              : (aiSummaryTab === 'today' ? '#2563eb' : 'transparent')
          }}
          onPress={() => setAiSummaryTab('today')}
        >
          <Text style={{
            fontSize: 11,
            fontWeight: '800',
            color: !hasTodayDeliveries
              ? '#ef4444'
              : (aiSummaryTab === 'today' ? '#ffffff' : (isDarkMode ? '#94a3b8' : '#64748b'))
          }}>
            {hasTodayDeliveries ? 'Resumo de Hoje' : 'Hoje não tem entregas'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 6,
            alignItems: 'center',
            borderRadius: 11,
            backgroundColor: aiSummaryTab === 'tomorrow' ? '#2563eb' : 'transparent'
          }}
          onPress={() => setAiSummaryTab('tomorrow')}
        >
          <Text style={{ fontSize: 11, fontWeight: '800', color: aiSummaryTab === 'tomorrow' ? '#ffffff' : (isDarkMode ? '#94a3b8' : '#64748b') }}>
            Resumo de Amanhã
          </Text>
        </TouchableOpacity>
      </View>

      {/* Conteúdo do Texto do Resumo */}
      {isGeneratingAISummary && !activeSummaryText ? (
        <View style={{ paddingVertical: 20, alignItems: 'center', gap: 8 }}>
          <ActivityIndicator size="small" color="#2563eb" />
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>
            Gerando resumo inteligente das entregas...
          </Text>
        </View>
      ) : (
        <Text style={{
          fontSize: 13,
          lineHeight: 20,
          fontWeight: '600',
          color: isDarkMode ? '#cbd5e1' : '#334155',
          marginBottom: 14
        }}>
          {activeSummaryText || 'Nenhuma entrega agendada para o período.'}
        </Text>
      )}

      {/* Player de Áudio TTS */}
      <View style={{
        backgroundColor: isDarkMode ? '#0f172a' : '#f1f5f9',
        borderRadius: 18,
        padding: 12,
        gap: 10,
        borderWidth: 1,
        borderColor: isDarkMode ? '#334155' : '#e2e8f0'
      }}>
        {/* Linha de Progresso Visual do Áudio Interativa */}
        <View
          onLayout={(e) => {
            timelineBarWidthRef.current = e.nativeEvent.layout.width || 280;
          }}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(e) => {
            const locationX = e.nativeEvent.locationX;
            const pageX = e.nativeEvent.pageX;
            containerPageXRef.current = pageX - locationX;
            isSeekingRef.current = true;

            const width = timelineBarWidthRef.current || 280;
            const ratio = Math.max(0, Math.min(1, locationX / width));
            const targetSecs = ratio * (effectiveTotalDuration || 15);
            setSpeechCurrentTime(targetSecs);
          }}
          onResponderMove={(e) => {
            if (!isSeekingRef.current) return;
            const pageX = e.nativeEvent.pageX;
            const touchX = pageX - (containerPageXRef.current || 0);
            const width = timelineBarWidthRef.current || 280;
            const ratio = Math.max(0, Math.min(1, touchX / width));
            const targetSecs = ratio * (effectiveTotalDuration || 15);
            setSpeechCurrentTime(targetSecs);
          }}
          onResponderRelease={(e) => {
            if (!isSeekingRef.current) return;
            isSeekingRef.current = false;
            const pageX = e.nativeEvent.pageX;
            const touchX = pageX - (containerPageXRef.current || 0);
            const width = timelineBarWidthRef.current || 280;
            const ratio = Math.max(0, Math.min(1, touchX / width));
            const targetSecs = ratio * (effectiveTotalDuration || 15);
            setSpeechCurrentTime(targetSecs);
            finishSeekToPosition(targetSecs);
          }}
          onResponderTerminate={() => {
            if (isSeekingRef.current) {
              isSeekingRef.current = false;
              finishSeekToPosition(speechCurrentTime);
            }
          }}
          style={{ height: 26, justifyContent: 'center', position: 'relative' }}
        >
          <View pointerEvents="none" style={{ height: 8, backgroundColor: isDarkMode ? '#334155' : '#cbd5e1', borderRadius: 4, overflow: 'hidden' }}>
            <View style={{
              height: '100%',
              width: `${Math.min(100, Math.max(0, (speechCurrentTime / (effectiveTotalDuration || 1)) * 100))}%`,
              backgroundColor: '#2563eb',
              borderRadius: 4
            }} />
          </View>
          <View pointerEvents="none" style={{
            position: 'absolute',
            left: `${Math.min(94, Math.max(0, (speechCurrentTime / (effectiveTotalDuration || 1)) * 100))}%`,
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: '#2563eb',
            borderWidth: 2,
            borderColor: '#ffffff',
            elevation: 3,
            top: 5
          }} />
        </View>

        {/* Controles do Player */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity
            onPress={() => handleToggleSpeech(activeSummaryText)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: '#2563eb',
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderRadius: 12,
              elevation: 2
            }}
          >
            {isSpeakingSummary && !speechIsPaused ? (
              <Pause size={16} color="#ffffff" fill="#ffffff" />
            ) : (
              <Play size={16} color="#ffffff" fill="#ffffff" style={{ marginLeft: 2 }} />
            )}
            <Text style={{ fontSize: 12, fontWeight: '900', color: '#ffffff' }}>
              {isSpeakingSummary ? (speechIsPaused ? 'Continuar' : 'Pausar') : 'Ouvir Resumo'}
            </Text>
          </TouchableOpacity>

          <Text style={{ fontSize: 11, fontWeight: '800', color: isDarkMode ? '#cbd5e1' : '#64748b', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
            {formatAudioTime(speechCurrentTime)} / {formatAudioTime(effectiveTotalDuration)}
          </Text>
        </View>
      </View>
    </View>
  );
};
