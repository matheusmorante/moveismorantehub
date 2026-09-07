import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Image } from 'react-native';
import { Check, Copy, Edit2 } from 'lucide-react-native';
import { ChatMessage } from '../../../../services/financialAiAssistantService';

const SEU_LIZANDRO_IMG = require('../../../../../assets/lizandro.png');

interface Props {
  msg: ChatMessage;
  editingMessageId: string | null;
  editText: string;
  copiedMessageId: string | null;
  setEditText: (text: string) => void;
  onCopyMessage: (msg: ChatMessage) => void;
  onStartEditMessage: (msg: ChatMessage) => void;
  onCancelEdit: () => void;
  onSaveAndResend: (msg: ChatMessage) => void;
  isDarkMode?: boolean;
}

export const ChatMessageItem: React.FC<Props> = ({
  msg,
  editingMessageId,
  editText,
  copiedMessageId,
  setEditText,
  onCopyMessage,
  onStartEditMessage,
  onCancelEdit,
  onSaveAndResend,
  isDarkMode = false,
}) => {
  const isUser = msg.sender === 'user';
  const isEditingThis = editingMessageId === msg.id;

  return (
    <View style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
      {!isUser ? (
        <View style={styles.avatarBot}>
          <Image
            source={SEU_LIZANDRO_IMG}
            style={{ width: '100%', height: '100%', borderRadius: 14 }}
            resizeMode="cover"
          />
        </View>
      ) : null}

      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          !isUser && msg.isAlert && (isDarkMode ? styles.alertBubbleDark : styles.alertBubble),
          isDarkMode && !isUser && !msg.isAlert && styles.assistantBubbleDark,
          isEditingThis && styles.editingMessageBubble,
        ]}
      >
        {isUser && isEditingThis ? (
          /* Modo de Edição Inline da Mensagem */
          <View style={styles.inlineEditContainer}>
            <TextInput
              style={[styles.inlineEditInput, isDarkMode && styles.inlineEditInputDark]}
              value={editText}
              onChangeText={setEditText}
              multiline
              autoFocus
            />
            <View style={styles.inlineEditActions}>
              <TouchableOpacity
                style={styles.cancelEditBtn}
                onPress={onCancelEdit}
                accessibilityLabel="Cancelar edição"
              >
                <Text style={styles.cancelEditBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveEditBtn}
                onPress={() => onSaveAndResend(msg)}
                accessibilityLabel="Salvar e reenviar mensagem"
              >
                <Text style={styles.saveEditBtnText}>Salvar e reenviar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Modo Normal da Mensagem */
          <>
            <Text
              style={[
                styles.messageText,
                isUser ? styles.userText : styles.assistantText,
                !isUser && msg.isAlert && (isDarkMode ? styles.alertTextDark : styles.alertText),
                isDarkMode && !isUser && !msg.isAlert && styles.assistantTextDark,
              ]}
            >
              {msg.text}
            </Text>

            <View style={styles.bubbleFooter}>
              <Text style={[styles.timeText, !isUser && msg.isAlert && (isDarkMode ? styles.alertTimeDark : styles.alertTime)]}>
                {msg.timestamp}
                {msg.version && msg.version > 1 ? ' (editado)' : ''}
              </Text>

              {/* Ações Discretas nas Mensagens do Usuário: [ Copiar ] [ Editar ] */}
              {isUser && (
                <View style={styles.msgActionRow}>
                  <TouchableOpacity
                    style={styles.msgActionBtn}
                    onPress={() => onCopyMessage(msg)}
                    accessibilityLabel="Copiar mensagem"
                    activeOpacity={0.7}
                  >
                    {copiedMessageId === msg.id ? (
                      <Check size={11} color="#93c5fd" />
                    ) : (
                      <Copy size={11} color="#bfdbfe" />
                    )}
                    <Text style={styles.msgActionText}>
                      {copiedMessageId === msg.id ? 'Copiado' : 'Copiar'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.msgActionBtn}
                    onPress={() => onStartEditMessage(msg)}
                    accessibilityLabel="Editar mensagem"
                    activeOpacity={0.7}
                  >
                    <Edit2 size={11} color="#bfdbfe" />
                    <Text style={styles.msgActionText}>Editar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  avatarBot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: '#2563eb',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#f1f5f9',
    borderBottomLeftRadius: 4,
  },
  assistantBubbleDark: {
    backgroundColor: '#1e293b',
  },
  alertBubble: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  alertBubbleDark: {
    backgroundColor: 'rgba(120, 53, 15, 0.25)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  editingMessageBubble: {
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: '#ffffff',
  },
  assistantText: {
    color: '#1e293b',
  },
  assistantTextDark: {
    color: '#f8fafc',
  },
  alertText: {
    color: '#92400e',
    fontWeight: '500',
  },
  alertTextDark: {
    color: '#fef08a',
    fontWeight: '500',
  },
  alertTime: {
    color: '#b45309',
  },
  alertTimeDark: {
    color: '#fbbf24',
  },
  bubbleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  timeText: {
    fontSize: 10,
    color: '#94a3b8',
  },
  msgActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  msgActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  msgActionText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#bfdbfe',
  },
  inlineEditContainer: {
    minWidth: 240,
  },
  inlineEditInput: {
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 8,
    minHeight: 48,
    textAlignVertical: 'top',
  },
  inlineEditInputDark: {
    color: '#f8fafc',
    backgroundColor: '#0f172a',
  },
  inlineEditActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  cancelEditBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
  },
  cancelEditBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  saveEditBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#2563eb',
  },
  saveEditBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
});
