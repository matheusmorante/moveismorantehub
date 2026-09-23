import React from 'react';
import { View, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { AudioLines, Send } from 'lucide-react-native';

interface Props {
  inputText: string;
  loading: boolean;
  isDarkMode?: boolean;
  onChangeInputText: (text: string) => void;
  onSendMessage: () => void;
  onStartLive: () => void;
}

export const FinancialChatInputBar: React.FC<Props> = ({
  inputText,
  loading,
  isDarkMode,
  onChangeInputText,
  onSendMessage,
  onStartLive,
}) => {
  return (
    <View style={[styles.inputContainer, isDarkMode && styles.inputContainerDark]}>
      <TextInput
        style={[styles.textInput, isDarkMode && styles.textInputDark]}
        placeholder="Descreva a movimentação ou dúvida..."
        placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
        value={inputText}
        onChangeText={onChangeInputText}
        multiline
        maxLength={500}
      />

      {inputText.trim() ? (
        <TouchableOpacity
          style={[styles.sendBtn, loading ? styles.sendBtnDisabled : null]}
          onPress={onSendMessage}
          disabled={loading}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Enviar mensagem"
        >
          <Send size={16} color="#ffffff" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.voiceModeBtn}
          onPress={onStartLive}
          accessibilityRole="button"
          accessibilityLabel="Voice Mode"
          accessibilityHint="Iniciar conversa por voz Gemini Live"
          activeOpacity={0.8}
        >
          <AudioLines size={18} color="#ffffff" />
        </TouchableOpacity>
      )}
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
  voiceModeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2563eb',
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
