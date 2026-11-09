/** Constrói mensagens de conversa no formato Chat Completions da OpenAI. */
export function buildCustomerFacingOpenAiHistory(
  sourceMessages: Array<{
    id?: string;
    direction: string;
    message_type: string;
    text_content?: string | null;
    raw_payload?: any;
  }>
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const msg of sourceMessages) {
    if (!msg.text_content || !msg.text_content.trim()) continue;
    if (msg.message_type === 'internal_note' || msg.message_type === 'system_event' || msg.message_type === 'deleted') {
      continue;
    }
    const role = msg.direction === 'inbound' ? 'user' : 'assistant';
    messages.push({ role, content: msg.text_content.trim() });
  }

  return messages;
}
