import { z } from 'zod';
import {
  productCatalogPrepareSchema,
  productCatalogSendSelectionSchema,
} from './productCatalogFormSchemas';

export const isReservedSupportTag = (tag: string) => tag.trim().toLowerCase().startsWith('status:');
export const supportInternalCommentSchema = z.object({
  comment: z.string().trim().min(1, 'Escreva um comentário antes de salvar.').max(2000, 'O comentário deve ter no máximo 2000 caracteres.'),
});
export const supportSandboxMessageSchema = z.object({
  message: z.string().trim().min(1, 'Escreva uma mensagem antes de enviar.').max(4096, 'A mensagem deve ter no máximo 4096 caracteres.'),
});
const supportComposerCatalogAttachmentSchema = z.object({
  kind: z.literal('catalog'),
  id: z.string().min(1).max(100),
  selection: productCatalogPrepareSchema,
  catalogUrl: z.string().trim().max(3800).optional(),
});
const supportComposerLocalAttachmentSchema = z.object({
  kind: z.enum(['media', 'document', 'contact', 'order', 'quote', 'audio']),
  id: z.string().min(1).max(100),
  label: z.string().trim().min(1).max(180),
  detail: z.string().trim().max(500).optional(),
  fileName: z.string().trim().max(255).optional(),
  mimeType: z.string().trim().max(120).optional(),
  previewUrl: z.string().max(2000).optional(),
  contactName: z.string().trim().min(1).max(100).optional(),
  contactPhone: z.string().trim().max(30).optional(),
  orderNumber: z.string().trim().max(80).optional(),
  orderStatus: z.string().trim().max(80).optional(),
  orderTotal: z.number().finite().nonnegative().optional(),
  orderItemsPreview: z.string().trim().max(500).optional(),
});
export const supportChatComposerDraftSchema = z.object({
  message: z.string().max(4096, 'A mensagem deve ter no máximo 4096 caracteres.'),
  attachments: z.array(z.union([
    supportComposerCatalogAttachmentSchema,
    supportComposerLocalAttachmentSchema,
  ])).max(50, 'Remova alguns anexos antes de continuar.'),
}).refine((draft) => Boolean(draft.message.trim()) || draft.attachments.length > 0, {
  message: 'Escreva uma mensagem ou adicione um anexo.',
  path: ['message'],
});
export type SupportChatComposerDraft = z.infer<typeof supportChatComposerDraftSchema>;
export type SupportChatComposerAttachment = SupportChatComposerDraft['attachments'][number];
export const supportCustomerSendSchema = z.object({
  conversationId: z.string().uuid('Conversa inválida.'),
  message: z.string().max(4096, 'A mensagem deve ter no máximo 4096 caracteres.'),
  attachmentType: z.enum(['text', 'file', 'contact', 'catalog']),
  fileName: z.string().trim().min(1).max(255).optional(),
  fileMimeType: z.string().trim().max(120).optional(),
  fileSize: z.number().int().nonnegative().max(4 * 1024 * 1024).optional(),
  contactName: z.string().trim().min(1).max(100).optional(),
  contactPhone: z.string().trim().min(10).max(30).optional(),
  catalogSelection: productCatalogSendSelectionSchema.optional(),
}).refine((input) => Boolean(input.message.trim()) || input.attachmentType !== 'text', {
  message: 'Escreva uma mensagem ou adicione um anexo.',
  path: ['message'],
}).refine((input) => input.attachmentType !== 'file' || Boolean(input.fileName && input.fileMimeType && input.fileSize), {
  message: 'Selecione um arquivo válido.',
  path: ['fileName'],
}).refine((input) => input.attachmentType !== 'contact' || Boolean(input.contactName && input.contactPhone), {
  message: 'Selecione um contato válido.',
  path: ['contactName'],
}).refine((input) => (input.attachmentType === 'catalog') === Boolean(input.catalogSelection), {
  message: 'Selecione um catálogo válido.',
  path: ['catalogSelection'],
});
export type SupportCustomerSendInput = z.infer<typeof supportCustomerSendSchema>;
export const supportOrderDocumentSchema = z.object({
  orderId: z.string().trim().min(1, 'Selecione um pedido ou orçamento.'),
});
export type SupportOrderDocumentInput = z.infer<typeof supportOrderDocumentSchema>;
export const supportNotesSchema = z.object({ notes: z.string().max(2000, 'Máximo de 2000 caracteres.') });
export const supportTagSchema = z.object({
  tagInput: z.string().trim().min(1, 'Digite um marcador.').max(40, 'O marcador deve ter no máximo 40 caracteres.')
    .refine((tag) => !isReservedSupportTag(tag), 'Marcadores de status são gerenciados pelas ações do atendimento.'),
});

const supportConversationId = z.string().uuid('Não foi possível identificar a conversa.');
export const supportConversationCommandSchema = z.discriminatedUnion('intent', [
  z.object({ intent: z.literal('assign'), conversationId: supportConversationId,
    assigneeId: z.string().uuid('Selecione um atendente válido.').nullable() }),
  z.object({ intent: z.literal('status'), conversationId: supportConversationId,
    status: z.enum(['open', 'closed', 'snoozed']) }),
  z.object({ intent: z.literal('archive'), conversationId: supportConversationId }),
]);
export type SupportConversationCommand = z.infer<typeof supportConversationCommandSchema>;

export const supportFolderDeleteSchema = z.object({
  folderId: z.string().uuid('Pasta inválida.'),
  createdBy: z.string().uuid('Autor da pasta inválido.'),
  currentUserId: z.string().uuid('Não foi possível identificar o atendente.'),
});
export type SupportFolderDeleteInput = z.infer<typeof supportFolderDeleteSchema>;

export const supportCustomerSearchSchema = z.object({
  searchTerm: z.string().trim().min(2, 'Informe pelo menos 2 caracteres para pesquisar cliente por nome, CPF ou telefone.'),
});
export const supportAttachmentSearchSchema = z.object({
  search: z.string().trim().max(100, 'A busca deve ter no máximo 100 caracteres.'),
});
export const supportCustomerRecordFiltersSchema = z.object({
  search: z.string().trim().max(100, 'A busca deve ter no máximo 100 caracteres.'),
  status: z.string().trim().max(80, 'O status selecionado é inválido.'),
});
export type SupportCustomerRecordFiltersInput = z.infer<typeof supportCustomerRecordFiltersSchema>;
export const supportMessageSearchSchema = z.object({
  search: z.string().trim().min(3, 'Informe pelo menos 3 caracteres para pesquisar.').max(100, 'A busca deve ter no máximo 100 caracteres.'),
});
export const supportGlobalMessageSearchSchema = z.object({
  search: z.string().trim().min(3, 'Informe pelo menos 3 caracteres para pesquisar mensagens.').max(100, 'A busca deve ter no máximo 100 caracteres.'),
});
export type SupportGlobalMessageSearchInput = z.infer<typeof supportGlobalMessageSearchSchema>;
export const supportCustomerLinkSchema = z.object({
  conversationId: supportConversationId,
  customerId: z.string().trim().min(1, 'Selecione um cliente válido.'),
});
export type SupportCustomerLinkInput = z.infer<typeof supportCustomerLinkSchema>;

export const supportFolderFormSchema = z.object({
  name: z.string().trim().min(2, 'O nome deve ter pelo menos 2 caracteres.').max(50, 'O nome deve ter no máximo 50 caracteres.'),
  status: z.enum(['all', 'open', 'closed', 'snoozed']),
  assigneeId: z.string().refine((value) => ['all', 'mine', 'unassigned'].includes(value)
    || z.string().uuid().safeParse(value).success, 'Selecione um atendente válido.'),
  unread: z.boolean(),
  customerLink: z.enum(['all', 'linked', 'unlinked']),
  orders: z.enum(['all', 'with_orders', 'without_orders']),
  search: z.string().trim().max(100, 'A busca deve ter no máximo 100 caracteres.'),
  isTestArtifact: z.boolean(),
});
export type SupportFolderFormInput = z.infer<typeof supportFolderFormSchema>;

// Provisioning is separate from the UI runner and accepts a reviewed request.
export const supportFixtureProvisionSchema = z.object({
  runId: z.string().uuid(),
  scenarioKey: z.string().regex(/^[a-z][a-z0-9_-]{2,63}$/),
  contactNames: z.array(z.string().trim().min(1).max(100)).min(1).max(51),
  history: z.array(supportInternalCommentSchema.shape.comment).min(1).max(81),
});
export type SupportFixtureProvisionInput = z.infer<typeof supportFixtureProvisionSchema>;
