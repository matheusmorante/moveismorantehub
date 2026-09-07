import React from 'react';
import { View, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Send, Mic, MicOff, Square } from 'lucide-react-native';

interface Props {
  inputText: string;
  isRecordingActive: boolean;
  loading: boolean;
  isDarkMode?: boolean;
  onChangeInputText: (text: string) => void;
  onStartVoice: () => void;
  onStopVoice: () => void;
  onCancelVoice: () => void;
  onSendMessage: () => void;
}

export const FinancialChatInputBar: React.FC<Props> = ({
  inputText,
  isRecordingActive,
  loading,
  isDarkMode,
  onChangeInputText,
  onStartVoice,
  onStopVoice,
  onCancelVoice,
  onSendMessage,
}) => {
  return (
    <View style={[styles.inputContainer, isDarkMode && styles.inputContainerDark]}>
      <TextInput
        style={[styles.textInput, isDarkMode && styles.textInputDark]}
        placeholder={isRecordingActive ? 'Ditando mensagem por voz...' : 'Descreva a movimentação ou dúvida...'}
        placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
        value={inputText}
        onChangeText={onChangeInputText}
        multiline
        maxLength={500}
      />

      {isRecordingActive ? (
        <View style={styles.recordingControlsGroup}>
          <TouchableOpacity
            style={styles.cancelRecordingBtn}
            onPress={onCancelVoice}
            accessibilityLabel="Cancelar ditado"
            activeOpacity={0.7}
          >
            <MicOff size={16} color="#ef4444" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.stopRecordingBtn}
            onPress={onStopVoice}
            accessibilityLabel="Parar gravação"
            activeOpacity={0.8}
          >
            <Square size={14} color="#ffffff" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.micBtn, isDarkMode && styles.micBtnDark]}
          onPress={onStartVoice}
          accessibilityLabel="Iniciar ditado por voz"
          activeOpacity={0.7}
        >
          <Mic size={18} color="#7c3aed" />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.sendBtn, !inputText.trim() || loading ? styles.sendBtnDisabled : null]}
        onPress={async () => {
          if (isRecordingActive) {
            onStopVoice();
          }
          onSendMessage();
        }}
        disabled={!inputText.trim() || loading}
        activeOpacity={0.8}
        accessibilityLabel="Enviar mensagem"
      >
        <Send size={16} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 8,
  },
  inputContainerDark: {
    backgroundColor: '#1e293b',
    borderTopColor: '#334155',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    maxHeight: 100,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
  textInputDark: {
    color: '#f8fafc',
    backgroundColor: '#0f172a',
  },
  micBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnDark: {
    backgroundColor: '#3b0764',
  },
  recordingControlsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cancelRecordingBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopRecordingBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
});
