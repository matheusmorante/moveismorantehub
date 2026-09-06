import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Trash2 } from 'lucide-react-native';

const SEU_LIZANDRO_IMG = require('../../../../../assets/lizandro.png');

interface Props {
  onClearChat: () => void;
  isDarkMode?: boolean;
}

export const ChatHeaderToolBar: React.FC<Props> = ({ onClearChat, isDarkMode = false }) => {
  return (
    <View style={[styles.chatHeaderToolBar, isDarkMode && styles.chatHeaderToolBarDark]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{
          width: 30,
          height: 30,
          borderRadius: 10,
          backgroundColor: '#ffffff',
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: isDarkMode ? '#334155' : '#cbd5e1',
        }}>
          <Image
            source={SEU_LIZANDRO_IMG}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </View>
        <View>
          <Text style={[styles.chatHeaderTitle, isDarkMode && styles.chatHeaderTitleDark]}>
            Seu Lizandro
          </Text>
          <Text style={{ fontSize: 10, color: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: '600', marginTop: -1 }}>
            Assistente Financeiro IA
          </Text>
        </View>
      </View>
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
