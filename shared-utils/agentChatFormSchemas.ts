import { z } from 'zod';
import { textPromptFormSchema } from './assistedFormSchemas';

// Tool arguments/results have tool-specific contracts in the dispatcher.
const toolPayload = z.record(z.string(), z.unknown());
export const agentContentSchema = z.object({
  role: z.enum(['user', 'model']),
  parts: z.array(z.object({
    text: z.string().optional(),
    functionCall: z.object({ name: z.string().trim().min(1), args: toolPayload }).optional(),
    functionResponse: z.object({ name: z.string().trim().min(1), response: toolPayload }).optional(),
    thought: z.boolean().optional(),
    thoughtSignature: z.string().optional(),
  }).passthrough().refine(
    part => part.text !== undefined || !!part.functionCall || !!part.functionResponse,
    'Parte do histórico sem texto ou chamada de ferramenta.',
  )).min(1),
});
export const agentToolRecordSchema = z.object({
  name: z.string().min(1), label: z.string().min(1), args: toolPayload,
  result: toolPayload, success: z.boolean(), error: z.string().optional(),
});
export const agentSendFormSchema = textPromptFormSchema.extend({
  history: z.array(agentContentSchema),
  pageContext: z.object({
    currentModule: z.string().trim().min(1), currentPage: z.string().optional(),
    currentPath: z.string().startsWith('/'), title: z.string().optional(),
  }),
});
export const agentResponseSchema = z.object({
  result: z.object({ answer: z.string().trim().min(1), executedTools: z.array(agentToolRecordSchema), error: z.string().optional() }),
  updatedHistory: z.array(agentContentSchema),
});
export const agentHistoryFormSchema = z.object({
  messages: z.array(z.object({
    id: z.string().min(1), role: z.enum(['user', 'assistant']), content: z.string().min(1),
    timestamp: z.iso.datetime(), executedTools: z.array(agentToolRecordSchema).optional(),
  })),
  history: z.array(agentContentSchema),
});
export const agentClearHistoryFormSchema = z.object({ intent: z.literal('clear_history'), confirmed: z.literal(true), autoSpeak: z.boolean() });
export const agentVoicePreferenceFormSchema = z.object({ enabled: z.boolean() });
