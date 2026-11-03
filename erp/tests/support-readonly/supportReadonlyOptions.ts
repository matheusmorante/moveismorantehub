import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Environment = Readonly<Record<string, string | undefined>>;
type SetTestTimeout = (timeout: number) => void;

export function readSupportReadonlyOptions(env: Environment, setTestTimeout: SetTestTimeout) {
  const verifySlowRefresh = env.SUPPORT_READONLY_SLOW_REFRESH === '1';
  const verifyReadReceipt = env.SUPPORT_READONLY_READ_RECEIPT === '1';
  if (verifyReadReceipt) setTestTimeout(90_000);
  const verifyPhoneCopy = env.SUPPORT_READONLY_COPY_PHONE === '1';
  const verifyOrdersPanel = env.SUPPORT_READONLY_ORDERS_PANEL === '1';
  const verifySnippets = env.SUPPORT_READONLY_SNIPPETS === '1';
  const verifyHistoryPanels = env.SUPPORT_READONLY_HISTORY_PANELS === '1';
  const verifyMessageSearch = env.SUPPORT_READONLY_MESSAGE_SEARCH === '1';
  const verifyMessagePaging = env.SUPPORT_READONLY_MESSAGE_PAGING === '1';
  const verifyMobileLayout = env.SUPPORT_READONLY_MOBILE_LAYOUT === '1';
  const verifyMultiChatLayout = env.SUPPORT_READONLY_MULTI_CHAT_LAYOUT === '1';
  const verifyAudioPlayer = env.SUPPORT_READONLY_AUDIO_PLAYER === '1';
  const verifyRealAudioMedia = env.SUPPORT_READONLY_REAL_AUDIO_MEDIA === '1';
  const realAudioConversationId = env.SUPPORT_READONLY_REAL_AUDIO_CONVERSATION_ID?.trim() || '';
  const realAudioMediaId = env.SUPPORT_READONLY_REAL_AUDIO_MEDIA_ID?.trim() || '';
  if (verifyRealAudioMedia && (!/^[0-9a-f-]{36}$/i.test(realAudioConversationId) || !/^\d{1,32}$/.test(realAudioMediaId))) {
    throw new Error('Informe os identificadores da conversa e mídia de áudio selecionadas.');
  }
  if (verifyRealAudioMedia) setTestTimeout(90_000);
  const verifyMissedReadRecovery = env.SUPPORT_READONLY_MISSED_READ === '1';
  const verifyProductionMetaConnection = env.SUPPORT_READONLY_META_PRODUCTION_CONNECTION === '1';
  const verifyProductionMetaCredentialsOnly = env.SUPPORT_READONLY_META_CREDENTIALS_ONLY === '1';
  const verifyDevelopmentMetaCredentials = env.SUPPORT_READONLY_META_DEVELOPMENT_CREDENTIALS === '1';
  const verifyProductionSignedWebhook = env.SUPPORT_READONLY_META_PRODUCTION_SIGNED_WEBHOOK === '1';
  const verifyProductionWabaSubscription = env.SUPPORT_READONLY_META_WABA_SUBSCRIPTION === '1';
  if (verifyProductionSignedWebhook || verifyProductionWabaSubscription) setTestTimeout(90_000);
  if (verifyPhoneCopy && !verifyReadReceipt) throw new Error('A prova de cópia exige a conversa própria retida e suas guardas de leitura.');
  if (verifyOrdersPanel && !verifyReadReceipt) throw new Error('A prova de pedidos exige a conversa própria retida e suas guardas de leitura.');
  if (verifySnippets && !verifyReadReceipt) throw new Error('A prova dos modelos exige a conversa própria retida e suas guardas de leitura.');
  if (verifyHistoryPanels && !verifyReadReceipt) throw new Error('Timeline e galeria exigem a conversa própria retida e suas guardas de leitura.');
  if (verifyMessageSearch && !verifyReadReceipt) throw new Error('A busca exige a conversa própria retida e suas guardas de leitura.');
  if (verifyMessagePaging && !verifyReadReceipt) throw new Error('A paginação de mensagens exige a conversa própria retida e suas guardas de leitura.');
  if (verifyMobileLayout && !verifyReadReceipt) throw new Error('A prova em tela pequena exige o histórico próprio retido e suas guardas de leitura.');
  if (verifyMissedReadRecovery && !verifyReadReceipt) throw new Error('A recuperação de leitura exige o histórico próprio e suas guardas de leitura.');
  const retainedManifest = verifyReadReceipt
    ? JSON.parse(readFileSync(resolve(env.SUPPORT_REOPENING_MANIFEST || ''), 'utf8')) : null;
  if (verifyReadReceipt && (retainedManifest?.projectRef !== 'hkoxhourxwlddgsfdgws'
    || retainedManifest.runId !== '8eaed14f-364d-47ab-be41-66be54b3fb65'
    || retainedManifest.ownerId !== '13eab361-be48-4e49-be4b-4ad79813b812'
    || retainedManifest.cleanupCompleted !== true)) throw new Error('Manifesto de leitura retido não confirmado.');

  return {
    verifySlowRefresh,
    verifyReadReceipt,
    verifyPhoneCopy,
    verifyOrdersPanel,
    verifySnippets,
    verifyHistoryPanels,
    verifyMessageSearch,
    verifyMessagePaging,
    verifyMobileLayout,
    verifyMultiChatLayout,
    verifyAudioPlayer,
    verifyRealAudioMedia,
    realAudioConversationId,
    realAudioMediaId,
    verifyMissedReadRecovery,
    verifyProductionMetaConnection,
    verifyProductionMetaCredentialsOnly,
    verifyDevelopmentMetaCredentials,
    verifyProductionSignedWebhook,
    verifyProductionWabaSubscription,
    retainedManifest,
  };
}
