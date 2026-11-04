import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { requestConfirmation } from '@/components/shared/confirmationService';
import { z } from 'zod';
import {
  supportChatComposerDraftSchema,
  supportInternalCommentSchema,
  supportOrderDocumentSchema,
  type SupportChatComposerDraft,
  type SupportOrderDocumentInput,
} from '../../../../../../../shared-utils/customerSupportFormSchemas';
import type { ProductCatalogPrepareInput } from '../../../../../../../shared-utils/productCatalogFormSchemas';
import type { ProductCatalogSendSelection } from '../../../../../../../shared-utils/productCatalogFormSchemas';
import type { WhatsAppConversation, WhatsAppMessage } from '../../types';
import { ProductCatalogPanel } from '@/components/catalog/ProductCatalogPanel';
import { getSettings } from '@/pages/utils/settingsService';
import { supabase } from '@/pages/utils/supabaseConfig';
import {
  formatDate,
  getCustomerOrders,
  type SupportOrderSummary,
} from '@/pages/utils/customerSupport/supportOrdersService';
import type {
  CustomerSupportSendInput,
  CustomerSupportSendResult,
} from '@/pages/utils/customerSupport/customerSupportService';
import { ChatAudioRecordingControls, RecordedAudioPreview } from './ChatAudioRecordingPanels';
import { ChatComposerAttachmentList } from './ChatComposerAttachmentList';
import {
  formatFileSize,
  MAX_ATTACHMENTS,
  MAX_FILE_SIZE,
  normalizedFileType,
} from './chatComposerAttachmentFiles';
import {
  formatSelectedMessage,
  formatSelectedMessageLines,
  WHATSAPP_FORMATS,
  WHATSAPP_LINE_FORMATS,
  type WhatsAppLineFormatKind,
} from './chatMessageFormatting';
import { SupportOrderPickerDialog } from './SupportOrderPickerDialog';
import {
  createOrderSummaryPdf,
  formatSupportOrderMoney,
  isQuoteOrder,
} from './supportOrderSummaryPdf';

type SupportChatComposerAttachment = z.input<typeof supportChatComposerDraftSchema>['attachments'][number];
type InsertedSnippet = { id: number; text: string };

interface ChatComposerProps {
  conversation?: WhatsAppConversation;
  displayName?: string;
  canSend?: boolean;
  canShareCommercialInfo?: boolean;
  shareOrderRequest?: { record: SupportOrderSummary; requestId: string } | null;
  onShareOrderRequestHandled?: (requestId: string) => void;
  careWindowOpen?: boolean;
  isChannelConnected?: boolean;
  onSendCustomerMessage?: (input: CustomerSupportSendInput) => Promise<CustomerSupportSendResult>;
  onRefreshMessages?: () => Promise<void> | void;
  replyTarget?: WhatsAppMessage | null;
  onClearReplyTarget?: () => void;
  composerMode?: 'whatsapp' | 'comment';
  onComposerModeChange?: (mode: 'whatsapp' | 'comment') => void;
  insertedSnippet?: InsertedSnippet | null;
  onAddInternalNote?: (text: string) => Promise<boolean | void>;
  onOpenSnippets: () => void;
  catalogSpaceRef?: React.RefObject<HTMLElement | null>;
}

const EMOJIS = ['😀', '😊', '😍', '👍', '🙏', '❤️', '✨', '😉', '🎉', '👋', '😄', '🛋️'];
const makeId = () => globalThis.crypto?.randomUUID?.()
  || `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const formatDuration = (seconds: number) =>
  `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

const EMPTY_CONVERSATION = {
  id: '', businessPhoneNumberId: '', contactPhone: '', contactWaId: '', contactName: null,
  customerId: null, customerLinkStatus: 'unlinked' as const, lastMessageText: null,
  lastMessageAt: '', lastCustomerMessageAt: null, unreadCount: 0, isArchived: true,
  internalNotes: null, tags: [], assignedTo: null, createdAt: '', updatedAt: '',
} as WhatsAppConversation;

const toCatalogSendSelection = (selection: ProductCatalogPrepareInput): ProductCatalogSendSelection => ({
  items: selection.items.map(({ productId, variationId }) => ({
    productId,
    ...(variationId ? { variationId } : {}),
  })),
  bulkScope: selection.bulkScope ? {
    selectionMode: 'all_matching',
    filters: selection.bulkScope.filters,
    excludedProductIds: selection.bulkScope.excludedProductIds,
  } : null,
  hidePrices: selection.hidePrices,
  deliveryMode: selection.deliveryMode,
});

export const ChatComposer: React.FC<ChatComposerProps> = ({
  conversation = EMPTY_CONVERSATION,
  displayName = 'Cliente',
  canSend = false,
  canShareCommercialInfo = false,
  shareOrderRequest = null,
  onShareOrderRequestHandled,
  careWindowOpen = false,
  isChannelConnected = false,
  onSendCustomerMessage,
  onRefreshMessages,
  replyTarget = null,
  onClearReplyTarget,
  composerMode = 'whatsapp',
  onComposerModeChange,
  insertedSnippet,
  onAddInternalNote,
  onOpenSnippets,
  catalogSpaceRef,
}) => {
  const setComposerMode = onComposerModeChange || (() => undefined);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isEmojiMenuOpen, setIsEmojiMenuOpen] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isOrderPickerOpen, setIsOrderPickerOpen] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [orders, setOrders] = useState<SupportOrderSummary[]>([]);
  const [ordersError, setOrdersError] = useState('');
  const [orderFilter, setOrderFilter] = useState<'all' | 'orders' | 'quotes'>('all');
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingError, setRecordingError] = useState('');
  const [sendError, setSendError] = useState('');
  const [sendFeedback, setSendFeedback] = useState('');
  const [isOutcomeUncertain, setIsOutcomeUncertain] = useState(false);
  const [isRefreshingForRetry, setIsRefreshingForRetry] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [isCreatingOrderPdf, setIsCreatingOrderPdf] = useState(false);
  const requestedOrderRef = useRef<SupportOrderSummary | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentMenuRef = useRef<HTMLDivElement | null>(null);
  const emojiMenuRef = useRef<HTMLDivElement | null>(null);
  const objectUrlsRef = useRef(new Set<string>());
  const fileByAttachmentIdRef = useRef(new Map<string, File>());
  const recordingRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const currentAudioAttachmentRef = useRef<string | null>(null);
  const isSendingRef = useRef(false);
  const [audioPreview, setAudioPreview] = useState<{ url: string; type: string; name: string } | null>(null);

  const {
    register: registerDraft,
    handleSubmit: handleDraftSubmit,
    watch: watchDraft,
    setValue: setDraftValue,
    setError: setDraftError,
    clearErrors: clearDraftErrors,
    formState: { errors: draftErrors, isSubmitting: isDraftSubmitting },
  } = useForm<z.input<typeof supportChatComposerDraftSchema>, unknown, SupportChatComposerDraft>({
    resolver: zodResolver(supportChatComposerDraftSchema),
    defaultValues: { message: '', attachments: [] },
  });
  const message = watchDraft('message');
  const attachments = watchDraft('attachments');
  const sendAllowed = canSend && careWindowOpen && isChannelConnected && Boolean(onSendCustomerMessage) && !isOutcomeUncertain;

  useEffect(() => {
    if (replyTarget && composerMode === 'whatsapp') requestAnimationFrame(() => textareaRef.current?.focus());
  }, [replyTarget?.id, composerMode]);

  const {
    register: registerComment,
    handleSubmit: submitCommentForm,
    reset: resetComment,
    setError: setCommentError,
    formState: { errors: commentErrors, isSubmitting: isCommentSubmitting },
  } = useForm<{ comment: string }>({
    resolver: zodResolver(supportInternalCommentSchema),
    defaultValues: { comment: '' },
  });

  const {
    setValue: setOrderValue,
    handleSubmit: submitOrderForm,
    formState: { errors: orderErrors },
  } = useForm<SupportOrderDocumentInput>({
    resolver: zodResolver(supportOrderDocumentSchema),
    defaultValues: { orderId: '' },
  });

  useEffect(() => {
    if (!shareOrderRequest || !canSend || !canShareCommercialInfo) return;
    const { record, requestId } = shareOrderRequest;
    requestedOrderRef.current = record;
    setOrders((current) => [record, ...current.filter((order) => order.id !== record.id)]);
    setOrderFilter('quotes');
    setSelectedOrderId(record.id);
    setOrderValue('orderId', record.id, { shouldDirty: true, shouldValidate: true });
    setOrdersError('');
    setIsOrderPickerOpen(true);
    onShareOrderRequestHandled?.(requestId);
  }, [canSend, canShareCommercialInfo, onShareOrderRequestHandled, setOrderValue, shareOrderRequest]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [message]);

  useEffect(() => () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
    fileByAttachmentIdRef.current.clear();
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (!isRecording || isRecordingPaused) return;
    const timer = window.setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isRecording, isRecordingPaused]);

  useEffect(() => {
    if (!isRecording && !audioPreview) return;
    const protectDraft = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', protectDraft);
    return () => window.removeEventListener('beforeunload', protectDraft);
  }, [isRecording, audioPreview]);

  useEffect(() => {
    if (!isAttachmentMenuOpen && !isEmojiMenuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!attachmentMenuRef.current?.contains(target)) {
        setIsAttachmentMenuOpen(false);
      }
      if (!emojiMenuRef.current?.contains(target)) {
        setIsEmojiMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAttachmentMenuOpen(false);
        setIsEmojiMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isAttachmentMenuOpen, isEmojiMenuOpen]);

  useEffect(() => {
    if (!insertedSnippet?.text) return;
    setComposerMode('whatsapp');
    const current = watchDraft('message') || '';
    const next = current.trim() ? `${current.replace(/\s+$/, '')}\n${insertedSnippet.text}` : insertedSnippet.text;
    setDraftValue('message', next, { shouldDirty: true, shouldValidate: true });
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [insertedSnippet?.id]);

  useEffect(() => {
    if (!isOrderPickerOpen || !conversation.customerId) return;
    let active = true;
    setOrders([]);
    setOrdersError('');
    setIsLoadingOrders(true);
    getCustomerOrders(supabase, conversation.customerId)
      .then((data) => {
        if (!active) return;
        const requestedOrder = requestedOrderRef.current;
        setOrders(requestedOrder
          ? [requestedOrder, ...data.filter((order) => order.id !== requestedOrder.id)]
          : data);
      })
      .catch(() => { if (active) setOrdersError('Não foi possível carregar os documentos deste cliente.'); })
      .finally(() => { if (active) setIsLoadingOrders(false); });
    return () => { active = false; };
  }, [isOrderPickerOpen, conversation.customerId]);

  const currentAttachments = () => watchDraft('attachments') || [];
  const releaseAttachment = (attachment: SupportChatComposerAttachment | undefined) => {
    if (!attachment) return;
    fileByAttachmentIdRef.current.delete(attachment.id);
    if ('previewUrl' in attachment && attachment.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl);
      objectUrlsRef.current.delete(attachment.previewUrl);
    }
    if (attachment.id === currentAudioAttachmentRef.current) currentAudioAttachmentRef.current = null;
    if (audioPreview?.url && 'previewUrl' in attachment && attachment.previewUrl === audioPreview.url) {
      setAudioPreview(null);
    }
  };

  const appendAttachments = (nextAttachments: SupportChatComposerAttachment[], files: Map<string, File> = new Map()) => {
    const next = [...currentAttachments(), ...nextAttachments];
    if (next.length > MAX_ATTACHMENTS) {
      nextAttachments.forEach(releaseAttachment);
      setDraftError('attachments', { type: 'max', message: `O rascunho aceita até ${MAX_ATTACHMENTS} anexos.` });
      return false;
    }
    files.forEach((file, id) => fileByAttachmentIdRef.current.set(id, file));
    clearDraftErrors(['attachments', 'message']);
    setDraftValue('attachments', next, { shouldDirty: true, shouldValidate: true });
    setSendError('');
    setSendFeedback('');
    return true;
  };

  const removeAttachment = (attachmentId: string) => {
    const current = currentAttachments();
    const removed = current.find((attachment) => attachment.id === attachmentId);
    releaseAttachment(removed);
    setDraftValue('attachments', current.filter((attachment) => attachment.id !== attachmentId), {
      shouldDirty: true,
      shouldValidate: true,
    });
    setSendFeedback('Anexo removido do rascunho.');
  };

  const addFiles = (incoming: FileList | File[], kind: 'media' | 'document', customKind?: 'order' | 'quote'): boolean => {
    const files = Array.from(incoming);
    if (!files.length) return false;
    const additions: SupportChatComposerAttachment[] = [];
    const fileMap = new Map<string, File>();
    const validationMessages: string[] = [];
    for (const file of files) {
      const classification = normalizedFileType(file);
      if (file.size > MAX_FILE_SIZE) {
        validationMessages.push(`${file.name}: o limite é 4 MB.`);
        continue;
      }
      if (!classification || (kind === 'media' && !['Imagem', 'Vídeo'].includes(classification.label))
        || (kind === 'document' && !['Documento', 'Áudio'].includes(classification.label))) {
        validationMessages.push(`${file.name}: formato não aceito pelo WhatsApp.`);
        continue;
      }
      const id = makeId();
      const mimeType = file.type || classification.mimeType;
      const previewUrl = (classification.label === 'Imagem' || classification.label === 'Vídeo' || classification.label === 'Áudio')
        ? URL.createObjectURL(file)
        : undefined;
      if (previewUrl) objectUrlsRef.current.add(previewUrl);
      const attachmentKind = customKind || (classification.label === 'Áudio' ? 'audio' : kind);
      additions.push({
        kind: attachmentKind,
        id,
        label: customKind ? `${customKind === 'quote' ? 'Orçamento' : 'Pedido'} em PDF` : file.name,
        detail: `${formatFileSize(file.size)} · ${classification.label}`,
        fileName: file.name,
        mimeType,
        ...(previewUrl ? { previewUrl } : {}),
      });
      fileMap.set(id, file);
    }
    const wasAdded = additions.length > 0 && appendAttachments(additions, fileMap);
    if (validationMessages.length) setSendError(validationMessages.slice(0, 2).join(' '));
    if (kind === 'media' && photoInputRef.current) photoInputRef.current.value = '';
    if (kind === 'document' && documentInputRef.current) documentInputRef.current.value = '';
    return wasAdded;
  };

  const addStoreContact = () => {
    const settings = getSettings();
    const phone = String(settings.companyPhone || '').replace(/\D/g, '');
    const name = String(settings.companyName || 'Móveis Morante').trim();
    if (!/^\d{10,15}$/.test(phone)) {
      setSendError('Cadastre um telefone comercial válido nas configurações da empresa para compartilhar o contato.');
      setIsAttachmentMenuOpen(false);
      return;
    }
    appendAttachments([{
      kind: 'contact',
      id: makeId(),
      label: name,
      detail: `+${phone}`,
      contactName: name,
      contactPhone: phone,
    }]);
    setIsAttachmentMenuOpen(false);
  };

  const addBusinessDocument = async (data: SupportOrderDocumentInput) => {
    if (isCreatingOrderPdf) return;
    const order = orders.find((item) => item.id === data.orderId)
      || (requestedOrderRef.current?.id === data.orderId ? requestedOrderRef.current : undefined);
    if (!order) {
      setOrdersError('Selecione um documento disponível.');
      return;
    }
    setIsCreatingOrderPdf(true);
    try {
      const blob = await createOrderSummaryPdf(order, displayName, getSettings().companyName || 'Móveis Morante');
      const quote = isQuoteOrder(order);
      const prefix = quote ? 'Orcamento' : 'Pedido';
      const fileName = `${prefix}-${order.orderNumber.replace(/[^a-zA-Z0-9_-]/g, '-')}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });
      const wasAdded = addFiles([file], 'document', quote ? 'quote' : 'order');
      if (!wasAdded) {
        setOrdersError('Não foi possível adicionar o PDF ao rascunho. Remova alguns anexos e tente novamente.');
        return;
      }
      if (requestedOrderRef.current?.id === order.id) requestedOrderRef.current = null;
      setIsOrderPickerOpen(false);
      setSelectedOrderId('');
    } catch {
      setOrdersError('Não foi possível preparar o resumo em PDF. Tente novamente.');
    } finally {
      setIsCreatingOrderPdf(false);
    }
  };
  const submitOrderDocument = submitOrderForm(addBusinessDocument, () => {
    setOrdersError('Selecione um pedido ou orçamento antes de preparar o PDF.');
  });

  const handleCommentSubmit = submitCommentForm(async (data) => {
    if (!onAddInternalNote) return;
    try {
      const saved = await onAddInternalNote(data.comment);
      if (saved === false) {
        setCommentError('root.server', { message: 'Não foi possível salvar o comentário.' });
        return;
      }
      resetComment({ comment: '' });
      setComposerMode('whatsapp');
    } catch {
      setCommentError('root.server', { message: 'Não foi possível salvar o comentário. Tente novamente.' });
    }
  });

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? message.length;
    const end = textarea?.selectionEnd ?? message.length;
    const nextMessage = `${message.slice(0, start)}${emoji}${message.slice(end)}`;
    setDraftValue('message', nextMessage, { shouldDirty: true, shouldValidate: true });
    setIsEmojiMenuOpen(false);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const applyMessageFormatting = (prefix: string, suffix: string) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? message.length;
    const end = textarea?.selectionEnd ?? message.length;
    const formatted = formatSelectedMessage(message, start, end, prefix, suffix);

    setDraftValue('message', formatted.message, { shouldDirty: true, shouldValidate: true });
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(formatted.selectionStart, formatted.selectionEnd);
    });
  };

  const applyMessageLineFormatting = (kind: WhatsAppLineFormatKind) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? message.length;
    const end = textarea?.selectionEnd ?? message.length;
    const formatted = formatSelectedMessageLines(message, start, end, kind);

    setDraftValue('message', formatted.message, { shouldDirty: true, shouldValidate: true });
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(formatted.selectionStart, formatted.selectionEnd);
    });
  };

  const stopRecordingStream = () => {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
    recordingRef.current = null;
  };

  const cancelRecording = () => {
    const recorder = recordingRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.stop();
    }
    stopRecordingStream();
    recordingChunksRef.current = [];
    setIsRecording(false);
    setIsRecordingPaused(false);
    setRecordingSeconds(0);
    setRecordingError('');
    const existing = currentAudioAttachmentRef.current;
    if (existing) removeAttachment(existing);
    setAudioPreview(null);
  };

  const startRecording = async () => {
    setRecordingError('');
    setSendError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setRecordingError('Este navegador não oferece gravação de áudio. Anexe um arquivo OGG, MP3 ou M4A.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const supportedMime = ['audio/ogg;codecs=opus', 'audio/mp4', 'audio/aac']
        .find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
      const recorder = new MediaRecorder(stream, supportedMime ? { mimeType: supportedMime } : undefined);
      recordingStreamRef.current = stream;
      recordingRef.current = recorder;
      recordingChunksRef.current = [];
      setRecordingSeconds(0);
      setIsRecordingPaused(false);
      setIsRecording(true);
      recorder.ondataavailable = (event) => {
        if (event.data.size) recordingChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setRecordingError('A gravação foi interrompida. Confira a permissão do microfone e tente novamente.');
        stopRecordingStream();
        setIsRecording(false);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const fileType = normalizedFileType(new File([blob], 'gravacao', { type: blob.type }));
        const fileName = `audio-atendimento.${blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'm4a' : blob.type.includes('mpeg') ? 'mp3' : 'webm'}`;
        const id = makeId();
        const url = URL.createObjectURL(blob);
        objectUrlsRef.current.add(url);
        const file = new File([blob], fileName, { type: blob.type || 'audio/webm' });
        const addition: SupportChatComposerAttachment = {
          kind: 'audio', id, label: 'Áudio gravado',
          detail: `${formatDuration(recordingSeconds)} · ${formatFileSize(file.size)}`,
          fileName,
          mimeType: file.type,
          previewUrl: url,
        };
        currentAudioAttachmentRef.current = id;
        setAudioPreview({ url, type: file.type, name: fileName });
        setIsRecording(false);
        setIsRecordingPaused(false);
        stopRecordingStream();
        recordingChunksRef.current = [];
        if (fileType?.label !== 'Áudio') {
          setRecordingError('A gravação deste navegador está em WebM, formato não aceito pela API do WhatsApp. Você pode anexar áudio OGG, MP3 ou M4A.');
        }
        appendAttachments([addition], new Map([[id, file]]));
      };
      recorder.start(500);
    } catch (error) {
      const denied = error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError');
      setRecordingError(denied
        ? 'Permita o acesso ao microfone no navegador para gravar um áudio.'
        : 'Não foi possível iniciar a gravação. Confira o microfone e tente novamente.');
      stopRecordingStream();
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recordingRef.current?.state !== 'inactive') recordingRef.current?.stop();
  };

  const toggleRecordingPause = () => {
    const recorder = recordingRef.current;
    if (!recorder) return;
    if (recorder.state === 'recording') {
      recorder.pause();
      setIsRecordingPaused(true);
    } else if (recorder.state === 'paused') {
      recorder.resume();
      setIsRecordingPaused(false);
    }
  };

  const addCatalogSelection = (selection: ProductCatalogPrepareInput, catalogUrl: string | null) => {
    appendAttachments([{
      kind: 'catalog',
      id: makeId(),
      selection,
      ...(catalogUrl ? { catalogUrl } : {}),
    }]);
    setIsCatalogOpen(false);
  };

  const handleRefreshAfterUncertainSend = async () => {
    if (!onRefreshMessages || isRefreshingForRetry) return;
    setIsRefreshingForRetry(true);
    try {
      await onRefreshMessages();
      setIsOutcomeUncertain(false);
      setSendError('Histórico atualizado. Confira se a última mensagem apareceu antes de tentar enviar novamente.');
    } catch {
      setSendError('Não foi possível atualizar o histórico. Tente atualizar novamente antes de reenviar.');
    } finally {
      setIsRefreshingForRetry(false);
    }
  };

  const handleSendDraft = handleDraftSubmit(async (draft) => {
    if (isSendingRef.current) return;
    if (!sendAllowed || !onSendCustomerMessage) {
      setSendError(!canSend
        ? 'Seu perfil não tem permissão para enviar mensagens pela Central.'
        : !careWindowOpen
          ? 'A janela de atendimento de 24 horas está fechada.'
          : !isChannelConnected
            ? 'O canal WhatsApp desta conversa está desconectado.'
            : 'O envio está indisponível para esta conversa.');
      return;
    }
    const startCount = draft.attachments.reduce((total, attachment) => {
      if (attachment.kind === 'catalog') return total + (attachment.selection.bulkScope?.total || attachment.selection.items.length);
      return total + 1;
    }, 0);
    if (startCount > 10 && !await requestConfirmation({
      title: 'Enviar mais de 10 itens?',
      message: `Você está prestes a enviar conteúdo sobre ${startCount} itens. Deseja continuar?`,
      confirmLabel: 'Enviar',
      type: 'warning',
    })) return;

    // Valida o lote inteiro antes da primeira chamada externa para evitar envios parciais previsíveis.
    let plannedText = draft.message.trim();
    for (const attachment of draft.attachments) {
      if (attachment.kind === 'catalog') {
        if (attachment.selection.deliveryMode === 'native' && plannedText.length > 1024) {
          setSendError('A mensagem que acompanha os cards do WhatsApp deve ter até 1024 caracteres.');
          return;
        }
        if (plannedText.length > 4096) {
          setSendError('A mensagem excede o limite de 4096 caracteres.');
          return;
        }
        plannedText = '';
        continue;
      }
      if (attachment.kind === 'contact') {
        plannedText = '';
        continue;
      }
      const file = fileByAttachmentIdRef.current.get(attachment.id);
      const fileInfo = file ? normalizedFileType(file) : null;
      if (!file || !fileInfo) {
        setSendError(`O arquivo “${attachment.label}” não está mais disponível ou não é aceito pelo WhatsApp.`);
        return;
      }
      if (fileInfo.label === 'Áudio' && !['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg'].includes(fileInfo.mimeType)) {
        setSendError('A API do WhatsApp aceita áudio OGG, MP3, M4A, AAC ou AMR. Esta gravação precisa ser convertida antes do envio.');
        return;
      }
      if (fileInfo.label === 'Áudio') plannedText = '';
      else if (plannedText.length > 1024) {
        setSendError('A legenda do anexo pode ter até 1024 caracteres.');
        return;
      } else plannedText = '';
    }

    isSendingRef.current = true;
    setIsSending(true);
    setSendError('');
    setSendFeedback('Enviando…');
    let pendingText = draft.message.trim();
    let pendingReplyToWamid = replyTarget?.apiMessageId || undefined;
    let replyWasSent = false;
    let hadWarning = false;
    const acceptResult = (result: CustomerSupportSendResult) => {
      if (!result.persisted || result.warning) {
        hadWarning = true;
        setSendFeedback(result.warning || 'A Meta aceitou a mensagem. Atualize o histórico para conferir o registro.');
      }
    };
    const sendMessage = async (input: CustomerSupportSendInput) => {
      const result = await onSendCustomerMessage({
        ...input,
        ...(pendingReplyToWamid ? { replyToWamid: pendingReplyToWamid } : {}),
      });
      acceptResult(result);
      if (pendingReplyToWamid) {
        pendingReplyToWamid = undefined;
        replyWasSent = true;
      }
      return result;
    };
    const sendText = async (text: string) => {
      await sendMessage({ message: text });
      pendingText = '';
      setDraftValue('message', '', { shouldDirty: true, shouldValidate: false });
    };

    try {
      if (draft.attachments.length === 0) {
        await sendText(pendingText);
      } else {
        for (const attachment of draft.attachments) {
          if (attachment.kind === 'catalog') {
            await sendMessage({
              message: pendingText,
              catalogSelection: toCatalogSendSelection(attachment.selection),
            });
            pendingText = '';
            setDraftValue('message', '', { shouldDirty: true, shouldValidate: false });
            removeAttachment(attachment.id);
            continue;
          }

          if (attachment.kind === 'contact') {
            if (pendingText) await sendText(pendingText);
            await sendMessage({
              message: '',
              contact: { name: attachment.contactName || attachment.label, phone: attachment.contactPhone || '' },
            });
            removeAttachment(attachment.id);
            continue;
          }

          const file = fileByAttachmentIdRef.current.get(attachment.id);
          if (!file) throw new Error(`O arquivo “${attachment.label}” não está mais disponível. Remova e anexe novamente.`);
          const fileInfo = normalizedFileType(file);
          if (!fileInfo) throw new Error(`O formato de “${attachment.label}” não é aceito pelo WhatsApp.`);
          if (fileInfo.label === 'Áudio' && !['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg'].includes(fileInfo.mimeType)) {
            throw new Error('A API do WhatsApp aceita áudio OGG, MP3, M4A, AAC ou AMR. Esta gravação precisa ser convertida antes do envio.');
          }
          const supportsCaption = fileInfo.label !== 'Áudio';
          if (!supportsCaption && pendingText) await sendText(pendingText);
          await sendMessage({
            message: supportsCaption ? pendingText : '',
            file,
          });
          if (supportsCaption) {
            pendingText = '';
            setDraftValue('message', '', { shouldDirty: true, shouldValidate: false });
          }
          removeAttachment(attachment.id);
        }
        if (pendingText) await sendText(pendingText);
      }
      setSendError('');
      if (replyWasSent) onClearReplyTarget?.();
      if (!hadWarning) setSendFeedback('Mensagem enviada.');
      try {
        await onRefreshMessages?.();
      } catch {
        if (!hadWarning) setSendFeedback('Mensagem enviada. Não foi possível atualizar o histórico automaticamente; atualize a conversa para conferir.');
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Não foi possível enviar a mensagem.';
      const outcomeUncertain = Boolean((error as { outcomeUncertain?: unknown })?.outcomeUncertain);
      setIsOutcomeUncertain(outcomeUncertain);
      setSendError(messageText);
      setSendFeedback('');
    } finally {
      setIsSending(false);
      isSendingRef.current = false;
    }
  });

  const messageField = registerDraft('message');
  const effectiveSendDisabled = isDraftSubmitting || isSending || !sendAllowed;
  const quickReplyAction = () => {
    setIsAttachmentMenuOpen(false);
    onOpenSnippets();
  };

  return (
    <div className="shrink-0 border-t border-slate-200/80 bg-white/95 p-3 transition-colors dark:border-slate-800 dark:bg-slate-900/95">
      {composerMode === 'comment' ? (
        <form onSubmit={handleCommentSubmit} className="flex flex-col gap-2 rounded-2xl border-2 border-amber-400/80 bg-amber-50/80 p-3 shadow-md dark:border-amber-600/70 dark:bg-amber-950/30">
          <div className="flex items-center justify-between gap-3 border-b border-amber-200/70 pb-1.5 text-xs font-bold text-amber-900 dark:border-amber-800/60 dark:text-amber-200">
            <span className="flex items-center gap-1.5"><i className="bi bi-lock-fill text-amber-600" />Comentário interno da equipe</span>
            <button type="button" onClick={() => setComposerMode('whatsapp')} className="text-[11px] text-amber-700 underline dark:text-amber-300">Voltar ao atendimento</button>
          </div>
          <textarea
            {...registerComment('comment')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                void handleCommentSubmit();
              }
            }}
            rows={3}
            autoFocus
            placeholder="Escreva uma anotação visível apenas para a equipe…"
            className="w-full resize-none rounded-xl border border-amber-200 bg-white p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-amber-700/60 dark:bg-slate-900 dark:text-slate-100"
          />
          {commentErrors.comment && <p role="alert" className="text-[11px] text-red-600">{commentErrors.comment.message}</p>}
          {commentErrors.root?.server && <p role="alert" className="text-[11px] text-red-600">{commentErrors.root.server.message}</p>}
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={quickReplyAction} className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300"><i className="bi bi-lightning-charge-fill" />Inserir resposta rápida</button>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setComposerMode('whatsapp')} className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">Cancelar</button>
              <button type="submit" disabled={isCommentSubmitting || !onAddInternalNote} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"><i className="bi bi-check-lg" />{isCommentSubmitting ? 'Salvando…' : 'Salvar comentário'}</button>
            </div>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-2">
          {replyTarget && (
            <div className="flex items-center gap-3 rounded-xl border-l-4 border-emerald-600 bg-emerald-50 px-3 py-2 dark:bg-emerald-950/30">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  Respondendo a {replyTarget.direction === 'inbound' ? displayName : replyTarget.authorName || 'Atendente'}
                </p>
                <p className="truncate text-xs text-slate-600 dark:text-slate-300">
                  {replyTarget.textContent || replyTarget.mediaCaption || replyTarget.mediaFilename ||
                    (replyTarget.messageType === 'image' ? 'Foto' : replyTarget.messageType === 'video' ? 'Vídeo' : replyTarget.messageType === 'audio' ? 'Áudio' : replyTarget.messageType === 'document' ? 'Documento' : 'Mensagem')}
                </p>
              </div>
              <button type="button" onClick={onClearReplyTarget} aria-label="Cancelar resposta" title="Cancelar resposta" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-white hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white">
                <i className="bi bi-x-lg text-xs" />
              </button>
            </div>
          )}
          <form onSubmit={(event) => { event.preventDefault(); void handleSendDraft(); }} className={`relative flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-850 ${isRecording ? 'hidden' : ''}`}>
            <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,video/mp4,video/3gpp,.jpg,.jpeg,.png,.mp4,.3gp" multiple className="hidden" onChange={(event) => addFiles(event.target.files || [], 'media')} />
            <input ref={documentInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.aac,.m4a,.mp3,.amr,.ogg,application/pdf,text/plain,audio/aac,audio/mp4,audio/mpeg,audio/amr,audio/ogg" multiple className="hidden" onChange={(event) => addFiles(event.target.files || [], 'document')} />

            <div ref={attachmentMenuRef} className="relative shrink-0 self-end">
              <button type="button" onClick={() => { setIsAttachmentMenuOpen((open) => !open); setIsEmojiMenuOpen(false); }} aria-label="Abrir menu de anexos" aria-expanded={isAttachmentMenuOpen} title="Anexar conteúdo" className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-300 dark:hover:bg-slate-800">
                <i className={`bi ${isAttachmentMenuOpen ? 'bi-x-lg' : 'bi-plus-lg'} text-xl`} />
              </button>
              {isAttachmentMenuOpen && (
                <div role="menu" aria-label="Anexos e catálogo" className="absolute bottom-12 left-0 z-40 w-64 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  <button type="button" role="menuitem" onClick={() => { setIsAttachmentMenuOpen(false); setIsCatalogOpen(true); }} className="flex w-full items-center gap-3 rounded-xl bg-emerald-50 px-3 py-2.5 text-left text-sm font-semibold text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950/70">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm dark:bg-slate-800 dark:text-emerald-300"><i className="bi bi-box-seam text-lg" /></span><span>Catálogo de produtos<small className="block text-xs font-normal opacity-75">Selecionar um ou vários produtos</small></span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => { setIsAttachmentMenuOpen(false); photoInputRef.current?.click(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"><i className="bi bi-images w-9 text-center text-lg text-blue-600" /><span>Fotos e vídeos<small className="block text-xs text-slate-400">JPG, PNG ou MP4 · até 4 MB cada</small></span></button>
                  <button type="button" role="menuitem" onClick={() => { setIsAttachmentMenuOpen(false); documentInputRef.current?.click(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"><i className="bi bi-file-earmark-text w-9 text-center text-lg text-rose-600" /><span>Documentos e áudio<small className="block text-xs text-slate-400">PDF, planilhas, OGG, MP3 e outros</small></span></button>
                  <button type="button" role="menuitem" disabled={!canShareCommercialInfo || !conversation.customerId} onClick={() => { setIsAttachmentMenuOpen(false); setIsOrderPickerOpen(true); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 dark:text-slate-200 dark:hover:bg-slate-800"><i className="bi bi-receipt w-9 text-center text-lg text-amber-600" /><span>Pedidos e orçamentos<small className="block text-xs text-slate-400">Preparar resumo em PDF</small></span></button>
                  <button type="button" role="menuitem" onClick={addStoreContact} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"><i className="bi bi-person-vcard w-9 text-center text-lg text-violet-600" /><span>Contato da loja<small className="block text-xs text-slate-400">Compartilhar telefone comercial</small></span></button>
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                  <button type="button" role="menuitem" onClick={quickReplyAction} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"><i className="bi bi-lightning-charge w-9 text-center text-amber-500" />Respostas rápidas</button>
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 py-1">
              {attachments.length > 0 && (
                <ChatComposerAttachmentList
                  attachments={attachments}
                  onRemove={removeAttachment}
                />
              )}

              {audioPreview && (
                <RecordedAudioPreview audioUrl={audioPreview.url} onDiscard={cancelRecording} />
              )}

              <div role="toolbar" aria-label="Formatação de texto do WhatsApp" className="mb-1 flex items-center gap-0.5 px-1">
                {WHATSAPP_FORMATS.map((format) => (
                  <button
                    key={format.name}
                    type="button"
                    aria-label={`Aplicar ${format.name.toLowerCase()}`}
                    title={format.title}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyMessageFormatting(format.prefix, format.suffix)}
                    disabled={!canSend || !careWindowOpen || !isChannelConnected || isOutcomeUncertain}
                    className={`flex h-6 min-w-7 items-center justify-center rounded-md px-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 ${format.className}`}
                  >
                    {format.label}
                  </button>
                ))}
                {WHATSAPP_LINE_FORMATS.map((format) => (
                  <button
                    key={format.name}
                    type="button"
                    aria-label={`Aplicar ${format.name.toLowerCase()}`}
                    title={format.title}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyMessageLineFormatting(format.kind)}
                    disabled={!canSend || !careWindowOpen || !isChannelConnected || isOutcomeUncertain}
                    className="flex h-6 min-w-7 items-center justify-center rounded-md px-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  >
                    {format.label}
                  </button>
                ))}
                <span title="Combine negrito, itálico e tachado envolvendo o mesmo texto, por exemplo *_~texto~_*." className="ml-1 hidden truncate text-[10px] text-slate-400 sm:inline">*negrito* · _itálico_ · ~tachado~ · *_combina_* · `código` · ```monoespaçado```</span>
              </div>

              <textarea
                {...messageField}
                ref={(element) => { messageField.ref(element); textareaRef.current = element; }}
                rows={1}
                aria-label="Mensagem"
                placeholder={sendAllowed ? 'Digite uma mensagem…' : 'Envio indisponível para esta conversa'}
                disabled={!canSend || !careWindowOpen || !isChannelConnected || isOutcomeUncertain}
                onChange={(event) => {
                  messageField.onChange(event);
                  if (sendError) setSendError('');
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void handleSendDraft();
                  }
                }}
                className="block max-h-40 w-full resize-none bg-transparent px-1 py-1 text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-100"
              />
              {draftErrors.message && <p role="alert" className="px-1 pt-1 text-[11px] text-red-600">{draftErrors.message.message}</p>}
              {draftErrors.attachments && <p role="alert" className="px-1 pt-1 text-[11px] text-red-600">{draftErrors.attachments.message}</p>}
            </div>

            <div ref={emojiMenuRef} className="relative flex shrink-0 items-end gap-1">
              <button type="button" aria-label="Inserir emoji" aria-expanded={isEmojiMenuOpen} title="Inserir emoji" onClick={() => { setIsEmojiMenuOpen((open) => !open); setIsAttachmentMenuOpen(false); }} className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-amber-500 dark:text-slate-400 dark:hover:bg-slate-800"><i className="bi bi-emoji-smile text-lg" /></button>
              {isEmojiMenuOpen && <div role="menu" aria-label="Emojis" className="absolute bottom-11 right-10 z-40 grid w-52 grid-cols-6 gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">{EMOJIS.map((emoji) => <button key={emoji} type="button" aria-label={`Inserir ${emoji}`} onClick={() => insertEmoji(emoji)} className="rounded-lg p-1 text-xl hover:bg-slate-100 dark:hover:bg-slate-800">{emoji}</button>)}</div>}
              {message.trim() || attachments.length > 0 ? (
                <button type="submit" disabled={effectiveSendDisabled} title={isSending ? 'Enviando…' : 'Enviar mensagem'} aria-label="Enviar mensagem" className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"><i className={`bi ${isSending ? 'bi-arrow-repeat animate-spin' : 'bi-send-fill'} text-sm`} /></button>
              ) : (
                <button type="button" disabled={!sendAllowed || isSending} title="Gravar áudio" aria-label="Gravar áudio" onClick={() => void startRecording()} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-45 dark:text-slate-400 dark:hover:bg-slate-800"><i className="bi bi-mic-fill text-lg" /></button>
              )}
            </div>
          </form>

          <ChatAudioRecordingControls
            isRecording={isRecording}
            isRecordingPaused={isRecordingPaused}
            durationLabel={formatDuration(recordingSeconds)}
            recordingError={recordingError}
            onCancel={cancelRecording}
            onTogglePause={toggleRecordingPause}
            onStop={stopRecording}
          />
          {!canSend && <p role="status" className="px-1 text-[11px] text-slate-500">Seu perfil não tem permissão para enviar mensagens pela Central.</p>}
          {canSend && !isChannelConnected && <p role="status" className="px-1 text-[11px] text-amber-700 dark:text-amber-300">O canal WhatsApp desta conversa está desconectado.</p>}
          {canSend && isChannelConnected && !careWindowOpen && <p role="status" className="px-1 text-[11px] text-amber-700 dark:text-amber-300">A janela de atendimento de 24 horas está fechada. Aguarde uma nova mensagem do cliente.</p>}
          {isOutcomeUncertain && <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"><span>{sendError}</span><button type="button" onClick={() => void handleRefreshAfterUncertainSend()} disabled={isRefreshingForRetry} className="rounded-md bg-white px-2 py-1 font-bold disabled:opacity-50 dark:bg-slate-900">{isRefreshingForRetry ? 'Atualizando…' : 'Atualizar conversa'}</button></div>}
          {sendError && !isOutcomeUncertain && <p role="alert" className="px-1 text-[11px] text-red-600 dark:text-red-400">{sendError}</p>}
          {sendFeedback && !isOutcomeUncertain && <p role="status" className={`px-1 text-[11px] ${sendFeedback.includes('aceitou') ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{sendFeedback}</p>}

        </div>
      )}

      {isCatalogOpen && (
        <ProductCatalogPanel
          isOpen
          onClose={() => setIsCatalogOpen(false)}
          onSelectionPrepared={addCatalogSelection}
          onPdfPrepared={(file) => {
            const added = addFiles([file], 'document');
            if (added) setIsCatalogOpen(false);
            return added;
          }}
          selectionActionLabel="Adicionar à conversa"
          availableSpaceRef={catalogSpaceRef}
        />
      )}

      {isOrderPickerOpen && (
        <SupportOrderPickerDialog
          customerId={conversation.customerId}
          orderFilter={orderFilter}
          onOrderFilterChange={setOrderFilter}
          isLoading={isLoadingOrders}
          error={ordersError}
          orders={orders}
          isQuoteOrder={isQuoteOrder}
          selectedOrderId={selectedOrderId}
          onSelectOrder={(orderId) => {
            setSelectedOrderId(orderId);
            setOrderValue('orderId', orderId, { shouldDirty: true, shouldValidate: true });
            setOrdersError('');
          }}
          orderFieldError={orderErrors.orderId?.message}
          isCreatingPdf={isCreatingOrderPdf}
          formatMoney={formatSupportOrderMoney}
          formatDate={formatDate}
          onClose={() => setIsOrderPickerOpen(false)}
          onSubmit={(event) => { event.preventDefault(); void submitOrderDocument(); }}
        />
      )}
    </div>
  );
};
