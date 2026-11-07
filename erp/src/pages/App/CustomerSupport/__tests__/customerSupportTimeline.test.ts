/**
 * Testes da apresentacao da timeline do atendimento.
 */
import { describe, it, expect } from 'vitest';
import { formatTimeAgo } from '../components/ConversationItem';
import { groupMessagesByDate } from '../components/ChatArea';
import { projectVisibleMessageReactions } from '../components/chat/ChatMessageTimeline';
import type { WhatsAppMessage } from '../types';

describe('Apresentação temporal da timeline', () => {
  // 19. Formatação de tempo relativo (estilo WhatsApp Web)
  it('19. deve formatar carimbos de data/hora no padrão WhatsApp Web', () => {
    const now = new Date();
    const todayFormatted = formatTimeAgo(now.toISOString());
    expect(todayFormatted).toMatch(/^\d{2}:\d{2}$/);

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const yesterdayFormatted = formatTimeAgo(yesterday.toISOString());
    expect(yesterdayFormatted).toBe('Ontem');
  });

  // 20. Agrupamento de mensagens por data (Hoje, Ontem e datas completas)
  it('20. deve agrupar mensagens por data com separadores contextuais', () => {
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);

    const mockMsgs: any[] = [
      { id: '1', timestamp: yesterday.toISOString(), textContent: 'Msg ontem' },
      { id: '2', timestamp: now.toISOString(), textContent: 'Msg hoje' },
    ];

    const grouped = groupMessagesByDate(mockMsgs);
    expect(grouped.length).toBe(2);
    expect(grouped[0].dateLabel).toBe('Ontem');
    expect(grouped[1].dateLabel).toBe('Hoje');
  });

});

describe('Reações na timeline da Central', () => {
  const makeMessage = (overrides: Partial<WhatsAppMessage>): WhatsAppMessage => ({
    id: 'target',
    conversationId: 'conversation-1',
    apiMessageId: 'wamid.target',
    direction: 'inbound',
    messageType: 'text',
    textContent: 'Mensagem original',
    mediaId: null,
    mediaMimeType: null,
    mediaUrl: null,
    mediaFilename: null,
    mediaCaption: null,
    replyToMessageId: null,
    replyToWamid: null,
    status: 'received',
    errorCode: null,
    failureReason: null,
    timestamp: '2026-10-28T12:00:00Z',
    createdAt: '2026-10-28T12:00:00.000Z',
    ...overrides,
  });

  it('agrupa reações sobre a mensagem e remove a reação mais recente', () => {
    const target = makeMessage({});
    const added = makeMessage({
      id: 'reaction-added',
      apiMessageId: 'wamid.reaction-added',
      direction: 'outbound',
      messageType: 'interactive',
      textContent: 'Reação ❤️ a uma mensagem',
      replyToWamid: 'wamid.target',
      rawPayload: { provider_message_type: 'reaction', reaction: { message_id: 'wamid.target', emoji: '❤️' } },
      timestamp: '2026-10-28T12:00:01Z',
      createdAt: '2026-10-28T12:00:01.000Z',
    });
    const replaced = makeMessage({
      id: 'reaction-replaced',
      apiMessageId: 'wamid.reaction-replaced',
      direction: 'outbound',
      messageType: 'interactive',
      textContent: 'Reação 😂 a uma mensagem',
      replyToWamid: 'wamid.target',
      rawPayload: { provider_message_type: 'reaction', reaction: { message_id: 'wamid.target', emoji: '😂' } },
      timestamp: added.timestamp,
      createdAt: '2026-10-28T12:00:01.100Z',
    });
    const removed = makeMessage({
      id: 'reaction-removed',
      apiMessageId: 'wamid.reaction-removed',
      direction: 'outbound',
      messageType: 'interactive',
      textContent: 'Reação removida de uma mensagem',
      replyToWamid: 'wamid.target',
      rawPayload: { provider_message_type: 'reaction', reaction: { message_id: 'wamid.target', emoji: '' } },
      timestamp: added.timestamp,
      createdAt: '2026-10-28T12:00:01.200Z',
    });

    const current = projectVisibleMessageReactions([target, added, replaced, removed], [target]);
    expect(current.reactionsByWamid.has('wamid.target')).toBe(false);
    expect(current.embeddedEventIds).toEqual(new Set([added.id, replaced.id, removed.id]));

    const withCurrentReaction = projectVisibleMessageReactions([target, added, replaced], [target]);
    expect(withCurrentReaction.reactionsByWamid.get('wamid.target')).toEqual(['😂']);
  });
});
