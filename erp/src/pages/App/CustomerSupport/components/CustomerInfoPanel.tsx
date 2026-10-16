import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { WhatsAppConversation, WhatsAppMessage } from '../types';
import { formatPhoneForDisplay } from '@/pages/utils/customerSupport/phoneUtils';
import { whatsappSupportGuard } from '@/pages/utils/customerSupport/whatsappSupportGuard';
import {
  getCustomerOrders,
  SupportOrderSummary,
  formatBRL,
  formatDate,
} from '@/pages/utils/customerSupport/supportOrdersService';
import {
  unlinkCustomer,
  CustomerSummary,
} from '@/pages/utils/customerSupport/customerMatchingService';
import { updateInternalNotesAndTags } from '@/pages/utils/customerSupport/customerSupportService';
import { supabase } from '@/pages/utils/supabaseConfig';
import { ManualLinkModal } from './ManualLinkModal';

const notesSchema = z.object({
  notes: z.string().max(2000, 'Máximo de 2000 caracteres.'),
  tagInput: z.string().optional(),
});

type NotesFormData = z.infer<typeof notesSchema>;

interface CustomerInfoPanelProps {
  conversation: WhatsAppConversation;
  messages: WhatsAppMessage[];
  isOpen: boolean;
  onClose: () => void;
  onConversationUpdated: (updated: Partial<WhatsAppConversation>) => void;
}

type PanelTab = 'customer' | 'orders' | 'support' | 'media';

export const CustomerInfoPanel: React.FC<CustomerInfoPanelProps> = ({
  conversation,
  messages,
  isOpen,
  onClose,
  onConversationUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<PanelTab>('customer');
  const [orders, setOrders] = useState<SupportOrderSummary[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [tags, setTags] = useState<string[]>(conversation.tags || []);
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const careWindow = whatsappSupportGuard.calculateCareWindow(conversation.lastCustomerMessageAt);
  const customer = conversation.customer;
  const isLinked = Boolean(conversation.customerId && customer);

  const { register, handleSubmit, reset } = useForm<NotesFormData>({
    resolver: zodResolver(notesSchema),
    defaultValues: {
      notes: conversation.internalNotes || '',
      tagInput: '',
    },
  });

  useEffect(() => {
    reset({
      notes: conversation.internalNotes || '',
      tagInput: '',
    });
    setTags(conversation.tags || []);
  }, [conversation.id, conversation.internalNotes, conversation.tags, reset]);

  // Carrega pedidos vinculados do cliente sob demanda (Lazy Loading de Egress)
  useEffect(() => {
    if (!conversation.customerId) {
      setOrders([]);
      return;
    }

    let isMounted = true;
    setIsLoadingOrders(true);

    getCustomerOrders(supabase, conversation.customerId)
      .then((data) => {
        if (isMounted) setOrders(data);
      })
      .finally(() => {
        if (isMounted) setIsLoadingOrders(false);
      });

    return () => {
      isMounted = false;
    };
  }, [conversation.customerId]);

  if (!isOpen) return null;

  const handleUnlink = async () => {
    if (!window.confirm('Deseja realmente desvincular este cliente da conversa?')) return;
    const res = await unlinkCustomer(supabase, conversation.id);
    if (res.success) {
      onConversationUpdated({
        customerId: null,
        customerLinkStatus: 'unlinked',
        customer: null,
        orders: [],
      });
      setOrders([]);
    }
  };

  const handleLinked = (linkedCustomer: CustomerSummary) => {
    onConversationUpdated({
      customerId: linkedCustomer.id,
      customerLinkStatus: 'manually_linked',
      customer: linkedCustomer,
    });
  };

  const onSaveNotes = async (data: NotesFormData) => {
    setIsSavingNotes(true);
    try {
      await updateInternalNotesAndTags(supabase, conversation.id, data.notes, tags);
      onConversationUpdated({ internalNotes: data.notes, tags });
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = (e.currentTarget.value || '').trim();
      if (val && !tags.includes(val)) {
        const nextTags = [...tags, val];
        setTags(nextTags);
        e.currentTarget.value = '';
        updateInternalNotesAndTags(
          supabase,
          conversation.id,
          conversation.internalNotes || '',
          nextTags
        );
        onConversationUpdated({ tags: nextTags });
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const nextTags = tags.filter((t) => t !== tagToRemove);
    setTags(nextTags);
    updateInternalNotesAndTags(
      supabase,
      conversation.id,
      conversation.internalNotes || '',
      nextTags
    );
    onConversationUpdated({ tags: nextTags });
  };

  // Mídias da conversa
  const imageMessages = messages.filter((m) => m.messageType === 'image' && (m.mediaId || m.mediaUrl));
  const docMessages = messages.filter((m) => m.messageType === 'document' && (m.mediaId || m.mediaUrl));

  return (
    <aside className="w-80 sm:w-96 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full shrink-0 shadow-lg animate-slide-left z-20">
      {/* Header do Painel */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <i className="bi bi-info-circle-fill text-blue-500"></i>
          Informações & Pedidos
        </h3>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <i className="bi bi-x-lg text-xs"></i>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold">
        <button
          onClick={() => setActiveTab('customer')}
          className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${
            activeTab === 'customer'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Cliente
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 py-2.5 text-center transition-colors border-b-2 flex items-center justify-center gap-1 ${
            activeTab === 'orders'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Pedidos
          {orders.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[9px] flex items-center justify-center">
              {orders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('support')}
          className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${
            activeTab === 'support'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Atendimento
        </button>
        <button
          onClick={() => setActiveTab('media')}
          className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${
            activeTab === 'media'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Mídias
        </button>
      </div>

      {/* Conteúdo das Tabs */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 1. ABA CLIENTE */}
        {activeTab === 'customer' && (
          <div className="space-y-4">
            {isLinked && customer ? (
              <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[9px] font-bold uppercase tracking-wider">
                    {conversation.customerLinkStatus === 'auto_matched'
                      ? 'Localizado Automaticamente'
                      : 'Vinculado Manualmente'}
                  </span>
                  <Link
                    to="/registrations/customers"
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    Ver Cadastro
                    <i className="bi bi-box-arrow-up-right text-[9px]"></i>
                  </Link>
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {customer.fullName}
                </h4>

                <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Código:</span>
                    <span className="font-mono text-[11px] font-medium">#{customer.id.slice(0, 8)}</span>
                  </div>
                  {customer.phone && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Telefone ERP:</span>
                      <span className="font-medium">{formatPhoneForDisplay(customer.phone)}</span>
                    </div>
                  )}
                  {customer.cpfCnpj && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">CPF/CNPJ:</span>
                      <span className="font-mono text-[11px]">{customer.cpfCnpj}</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex justify-between truncate">
                      <span className="text-slate-400">E-mail:</span>
                      <span className="truncate max-w-[180px]">{customer.email}</span>
                    </div>
                  )}
                  {customer.address && (
                    <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800">
                      <span className="text-slate-400 block text-[10px] mb-0.5">Endereço:</span>
                      <span className="text-[11px] leading-tight block">{customer.address}</span>
                    </div>
                  )}
                </div>

                {/* Ações de Vínculo */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800">
                  <button
                    onClick={() => setIsLinkModalOpen(true)}
                    className="flex-1 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Alterar vínculo
                  </button>
                  <button
                    onClick={handleUnlink}
                    className="px-3 py-1.5 rounded-xl text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    Desvincular
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-center">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-2 text-lg">
                  <i className="bi bi-person-x"></i>
                </div>
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  {conversation.customerLinkStatus === 'ambiguous'
                    ? 'Telefone associado a múltiplos clientes'
                    : 'Contato não identificado no ERP'}
                </h4>
                <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80 mt-1 mb-3">
                  {conversation.customerLinkStatus === 'ambiguous'
                    ? 'Existem dois ou mais cadastros com este mesmo telefone. Selecione manualmente o cliente correto.'
                    : 'Nenhum cadastro de cliente foi localizado com este número de telefone.'}
                </p>
                <button
                  onClick={() => setIsLinkModalOpen(true)}
                  className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition-all"
                >
                  Pesquisar e Vincular Cliente
                </button>
              </div>
            )}

            {/* Informações da Conta WhatsApp */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Dados do WhatsApp
              </span>
              <div className="flex justify-between">
                <span className="text-slate-400">Nome no Perfil:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {conversation.contactName || 'Não informado'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">WhatsApp ID:</span>
                <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200">
                  {conversation.contactWaId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Telefone Formatado:</span>
                <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200">
                  {formatPhoneForDisplay(conversation.contactPhone)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 2. ABA PEDIDOS */}
        {activeTab === 'orders' && (
          <div className="space-y-3">
            {!isLinked ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                <i className="bi bi-cart-x text-2xl block mb-2 opacity-50"></i>
                Vincule um cliente à conversa para visualizar seus pedidos de venda.
              </div>
            ) : isLoadingOrders ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                <span className="text-[11px] text-slate-400">Consultando pedidos...</span>
              </div>
            ) : orders.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                <i className="bi bi-receipt text-2xl block mb-2 opacity-50"></i>
                Nenhum pedido de venda encontrado para este cliente.
              </div>
            ) : (
              orders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <i className="bi bi-receipt text-blue-500"></i>
                      Pedido #{ord.orderNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        ord.isCanceled
                          ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                          : ord.isCompleted
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                      }`}
                    >
                      {ord.status}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Valor Total:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {formatBRL(ord.totalAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Data da Venda:</span>
                      <span>{formatDate(ord.createdAt)}</span>
                    </div>
                    {ord.scheduledDate && (
                      <div className="flex justify-between">
                        <span>Previsão de Entrega:</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {formatDate(ord.scheduledDate)}
                        </span>
                      </div>
                    )}
                    {ord.deliveryFinishedAt && (
                      <div className="flex justify-between">
                        <span>Data de Entrega:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatDate(ord.deliveryFinishedAt)}
                        </span>
                      </div>
                    )}
                    <div className="pt-1.5 border-t border-slate-200/50 dark:border-slate-800 text-[10px] text-slate-500 leading-snug">
                      <strong className="text-slate-400 font-normal">Itens: </strong>
                      {ord.itemsPreview}
                    </div>
                  </div>

                  {/* Link Direto para o Pedido */}
                  <div className="pt-1">
                    <Link
                      to={`/sales-order`}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-end gap-1"
                    >
                      Abrir Pedido no ERP
                      <i className="bi bi-chevron-right text-[9px]"></i>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 3. ABA ATENDIMENTO */}
        {activeTab === 'support' && (
          <div className="space-y-4">
            {/* Status da Janela de 24h da Meta */}
            <div
              className={`p-3.5 rounded-2xl border text-xs ${
                careWindow.isOpen
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200'
                  : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5 font-bold">
                <i
                  className={`bi ${
                    careWindow.isOpen ? 'bi-clock-fill text-emerald-500' : 'bi-clock-history text-amber-500'
                  }`}
                ></i>
                <span>
                  {careWindow.isOpen
                    ? `Janela de 24h Ativa (${careWindow.remainingHours}h ${careWindow.remainingMinutes}m restantes)`
                    : 'Janela de 24h Expirada'}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                {careWindow.isOpen
                  ? `Aberta pelo contato em ${formatDate(conversation.lastCustomerMessageAt)}. Expira em ${careWindow.expiresAt?.toLocaleTimeString('pt-BR')}.`
                  : 'O cliente não enviou mensagens nas últimas 24h.'}
              </p>
            </div>

            {/* Marcadores / Tags Internas */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Marcadores Internos
              </span>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-red-500 ml-0.5"
                    >
                      <i className="bi bi-x"></i>
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Adicionar tag e pressionar Enter..."
                onKeyDown={handleAddTag}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
              />
            </div>

            {/* Notas Internas (RHF + zodResolver) */}
            <form onSubmit={handleSubmit(onSaveNotes)} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Notas Internas da Equipe
                </span>
                {isSavingNotes && (
                  <span className="text-[10px] text-blue-500 font-semibold animate-pulse">
                    Salvando...
                  </span>
                )}
              </div>
              <textarea
                rows={4}
                {...register('notes')}
                placeholder="Observações visíveis somente para a equipe interna..."
                className="w-full p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="w-full py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors"
              >
                Salvar Notas
              </button>
            </form>
          </div>
        )}

        {/* 4. ABA MÍDIAS */}
        {activeTab === 'media' && (
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Fotos ({imageMessages.length})
              </span>
              {imageMessages.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-4">Nenhuma foto compartilhada.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {imageMessages.map((m) => {
                    const src = m.mediaUrl || `/api/whatsapp-media?id=${m.mediaId}`;
                    return (
                      <a
                        key={m.id}
                        href={src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 block"
                      >
                        <img src={src} alt="Foto" className="w-full h-full object-cover" />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Documentos ({docMessages.length})
              </span>
              {docMessages.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-4">Nenhum documento compartilhado.</p>
              ) : (
                <div className="space-y-2">
                  {docMessages.map((m) => {
                    const src = m.mediaUrl || `/api/whatsapp-media?id=${m.mediaId}`;
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                      >
                        <span className="truncate max-w-[180px] font-medium text-slate-800 dark:text-slate-200">
                          {m.mediaFilename || 'Documento'}
                        </span>
                        <a
                          href={src}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline text-[11px] font-bold"
                        >
                          Baixar
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Vinculação Manual */}
      <ManualLinkModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        conversationId={conversation.id}
        onLinked={handleLinked}
      />
    </aside>
  );
};
