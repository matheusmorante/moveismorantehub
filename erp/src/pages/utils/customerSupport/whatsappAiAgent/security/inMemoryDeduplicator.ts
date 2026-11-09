// Cache em memória de mensagens e conversas em processamento (janela de 10 minutos)
// Utilizado como primeira linha de defesa local (fast-path) no processo
const processedWamids = new Map<string, number>();
const inFlightWamids = new Set<string>();
const inFlightConversations = new Set<string>();
const DEDUP_TTL_MS = 10 * 60 * 1000;

export const clearProcessedMessagesCache = (): void => {
  processedWamids.clear();
  inFlightWamids.clear();
  inFlightConversations.clear();
};

export function isMessageAlreadyProcessedOrInFlight(wamid: string): boolean {
  if (!wamid) return false;
  const now = Date.now();
  if (inFlightWamids.has(wamid)) return true;
  const processedAt = processedWamids.get(wamid);
  if (processedAt && now - processedAt < DEDUP_TTL_MS) return true;
  return false;
}

export function isConversationTurnInFlight(conversationId: string): boolean {
  if (!conversationId) return false;
  return inFlightConversations.has(conversationId);
}

export function markConversationInFlight(conversationId: string): void {
  if (conversationId) inFlightConversations.add(conversationId);
}

export function releaseConversationInFlight(conversationId: string): void {
  if (conversationId) inFlightConversations.delete(conversationId);
}

export function markMessageInFlight(wamid: string): void {
  if (wamid) inFlightWamids.add(wamid);
}

export function markMessageProcessed(wamid: string): void {
  if (wamid) {
    inFlightWamids.delete(wamid);
    processedWamids.set(wamid, Date.now());
  }
}

export function releaseMessageInFlight(wamid: string): void {
  if (wamid) inFlightWamids.delete(wamid);
}
