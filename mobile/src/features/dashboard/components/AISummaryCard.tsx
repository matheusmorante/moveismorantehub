import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { RefreshCw, Sparkles } from 'lucide-react-native';
import { AISummaryAudioPlayer } from './AISummaryAudioPlayer';

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
  finishSeekToPosition: (secs: number, fullText?: string) => void;
  setSpeechCurrentTime: (secs: number) => void;
  formatAudioTime: (secs: number) => string;
}

export const AISummaryCard: React.FC<Props> = ({
  isDarkMode, aiSummaryTab, setAiSummaryTab, hasTodayDeliveries = true,
  aiSummaryToday, aiSummaryTomorrow, isGeneratingAISummary, onRefreshSummary,
  isSpeakingSummary, speechIsPaused, speechCurrentTime, speechTotalDuration,
  handleToggleSpeech, finishSeekToPosition, setSpeechCurrentTime, formatAudioTime,
}) => {
  const activeSummaryText = aiSummaryTab === 'today' ? aiSummaryToday : aiSummaryTomorrow;
  const isWaitingForSummary = !activeSummaryText;

  return (
    <View style={{ marginHorizontal: 16, marginVertical: 10, backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#e2e8f0', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 32, height: 32, borderRadius: 12, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' }}><Sparkles size={16} color="#ffffff" /></View>
          <View>
            <Text style={{ fontSize: 13, fontWeight: '900', color: isDarkMode ? '#f8fafc' : '#0f172a' }}>Resumo Inteligente das Entregas</Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b' }}>Narrativa IA para motoristas & montadores</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onRefreshSummary} disabled={isGeneratingAISummary} style={{ padding: 6, opacity: isGeneratingAISummary ? 0.5 : 1 }}><RefreshCw size={16} color={isDarkMode ? '#94a3b8' : '#64748b'} /></TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', backgroundColor: isDarkMode ? '#0f172a' : '#f1f5f9', borderRadius: 14, padding: 3, marginBottom: 12 }}>
        <TouchableOpacity disabled={!hasTodayDeliveries} style={{ flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 11, backgroundColor: !hasTodayDeliveries ? (isDarkMode ? '#334155' : '#e2e8f0') : (aiSummaryTab === 'today' ? '#2563eb' : 'transparent') }} onPress={() => setAiSummaryTab('today')}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: !hasTodayDeliveries ? '#ef4444' : (aiSummaryTab === 'today' ? '#ffffff' : (isDarkMode ? '#94a3b8' : '#64748b')) }}>{hasTodayDeliveries ? 'Resumo de Hoje' : 'Hoje não tem entregas'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 11, backgroundColor: aiSummaryTab === 'tomorrow' ? '#2563eb' : 'transparent' }} onPress={() => setAiSummaryTab('tomorrow')}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: aiSummaryTab === 'tomorrow' ? '#ffffff' : (isDarkMode ? '#94a3b8' : '#64748b') }}>Resumo de Amanhã</Text>
        </TouchableOpacity>
      </View>

      {isWaitingForSummary ? (
        <View style={{ paddingVertical: 20, alignItems: 'center', gap: 8 }}>
          <ActivityIndicator size="small" color="#2563eb" />
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>Gerando resumo inteligente das entregas...</Text>
        </View>
      ) : (
        <Text style={{ fontSize: 13, lineHeight: 20, fontWeight: '600', color: isDarkMode ? '#cbd5e1' : '#334155', marginBottom: 14 }}>{activeSummaryText}</Text>
      )}

      <AISummaryAudioPlayer
        isDarkMode={isDarkMode} text={activeSummaryText} isSpeaking={isSpeakingSummary} isPaused={speechIsPaused}
        currentTime={speechCurrentTime} totalDuration={speechTotalDuration} onToggle={handleToggleSpeech}
        onSeekEnd={finishSeekToPosition} setCurrentTime={setSpeechCurrentTime} formatTime={formatAudioTime}
      />
    </View>
  );
};
