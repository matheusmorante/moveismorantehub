import type { WhatsAppMessage } from '../../../types';

export interface VisibleMessageReactionsResult {
  reactionsByWamid: Map<string, string[]>;
  embeddedEventIds: Set<string>;
}

export function projectVisibleMessageReactions(
  messages: WhatsAppMessage[],
  visibleMessages: WhatsAppMessage[],
): VisibleMessageReactionsResult {
  const visibleWamids = new Set(visibleMessages.map((message) => message.apiMessageId).filter(Boolean));
  const uniqueMessages = [...new Map(messages.map((message) => [message.id, message])).values()];
  const reactionEvents = uniqueMessages.filter((message) => {
    const text = message.textContent || '';
    return message.rawPayload?.provider_message_type === 'reaction'
      || /^Reação .+ a uma mensagem$/u.test(text)
      || text === 'Reação removida de uma mensagem';
  }).sort((left, right) =>
    left.timestamp.localeCompare(right.timestamp)
      || left.createdAt.localeCompare(right.createdAt)
      || left.id.localeCompare(right.id)
  );
  const currentByWamid = new Map<string, Map<WhatsAppMessage['direction'], string>>();
  const embeddedEventIds = new Set<string>();

  for (const event of reactionEvents) {
    const targetWamid = event.replyToWamid || event.rawPayload?.reaction?.message_id;
    if (typeof targetWamid !== 'string' || !visibleWamids.has(targetWamid)) continue;
    embeddedEventIds.add(event.id);

    const emoji = typeof event.rawPayload?.reaction?.emoji === 'string'
      ? event.rawPayload.reaction.emoji
      : event.textContent?.match(/^Reação (.+) a uma mensagem$/u)?.[1] || '';
    const current = currentByWamid.get(targetWamid) || new Map<WhatsAppMessage['direction'], string>();
    if (emoji) current.set(event.direction, emoji);
    else current.delete(event.direction);
    if (current.size > 0) currentByWamid.set(targetWamid, current);
    else currentByWamid.delete(targetWamid);
  }

  return {
    reactionsByWamid: new Map([...currentByWamid].map(([wamid, reactions]) => [wamid, [...reactions.values()]])),
    embeddedEventIds,
  };
}
