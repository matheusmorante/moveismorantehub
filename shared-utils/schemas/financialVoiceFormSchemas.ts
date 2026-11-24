import { z } from 'zod';
import { textPromptFormSchema } from './assistedFormSchemas';

export const financialLiveCommandFormSchema = z.object({
  action: z.enum(['start', 'pause', 'resume', 'mute', 'end']),
  sessionId: z.string().min(1, 'Chamada de voz não identificada.').optional(),
  state: z.enum(['idle', 'connecting', 'active', 'paused', 'muted', 'ended']),
}).superRefine(({ action, sessionId, state }, ctx) => {
  if (action !== 'start' && !sessionId) ctx.addIssue({ code: 'custom', path: ['sessionId'], message: 'Chamada de voz não identificada.' });
  const allowed = action === 'start' ? ['idle'] : action === 'resume' ? ['paused'] : action === 'end' ? ['connecting', 'active', 'paused', 'muted'] : ['active', 'muted'];
  if (!allowed.includes(state)) ctx.addIssue({ code: 'custom', path: ['state'], message: 'O estado da chamada mudou. Confira os controles de voz.' });
});
export const financialRecordingCommandFormSchema = z.object({
  action: z.enum(['start', 'stop', 'cancel']),
  sessionId: z.number().int().nonnegative(),
  baseText: z.string(),
});
export const financialLiveTranscriptFormSchema = textPromptFormSchema.extend({ role: z.enum(['user', 'assistant']) });
export const financialLiveQuotaSchema = z.object({
  usedMs: z.number().nonnegative(), remainingMs: z.number().nonnegative(), limitMs: z.number().nonnegative(), active: z.boolean(), usageDate: z.string(),
});
export const financialChatUtilityFormSchema = z.discriminatedUnion('intent', [
  z.object({ intent: z.literal('clear_chat'), messageIds: z.array(z.string().min(1)), cardIds: z.array(z.string().min(1)), inputText: z.string(), editText: z.string() }),
  z.object({ intent: z.literal('copy_message'), messageId: z.string().min(1, 'Mensagem não identificada.'), text: z.string().min(1, 'Mensagem vazia.') }),
]);
