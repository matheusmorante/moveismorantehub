import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Trash2 } from 'lucide-react-native';

interface Props {
  onClearChat: () => void;
  isDarkMode?: boolean;
}

export const ChatHeaderToolBar: React.FC<Props> = ({ onClearChat, isDarkMode = false }) => {
  return (
    <View style={[styles.chatHeaderToolBar, isDarkMode && styles.chatHeaderToolBarDark]}>
      <Text style={[styles.chatHeaderTitle, isDarkMode && styles.chatHeaderTitleDark]}>
        Conversa com a IA
      </Text>
      <TouchableOpacity style={styles.clearChatBtn} onPress={onClearChat} activeOpacity={0.7}>
        <Trash2 size={13} color="#ef4444" />
        <Text style={styles.clearChatText}>Limpar chat</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  chatHeaderToolBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  chatHeaderToolBarDark: {
    backgroundColor: '#0f172a',
    borderBottomColor: '#1e293b',
  },
  chatHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  chatHeaderTitleDark: {
    color: '#94a3b8',
  },
  clearChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  clearChatText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
});
