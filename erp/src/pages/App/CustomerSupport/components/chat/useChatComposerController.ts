import React, { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  supportChatComposerDraftSchema,
  type SupportChatComposerDraft,
} from '../../../../../../../shared-utils/customerSupportFormSchemas';
import type { WhatsAppConversation, WhatsAppMessage } from '../../types';
import type { SupportOrderSummary } from '@/pages/utils/customerSupport/supportOrdersService';
import type {
  CustomerSupportSendInput,
  CustomerSupportSendResult,
} from '@/pages/utils/customerSupport/customerSupportService';
import { useChatComposerDraftLifecycle } from './useChatComposerDraftLifecycle';
import { useChatComposerAttachments } from './useChatComposerAttachments';
import { useChatComposerSend } from './useChatComposerSend';
import { useChatComposerOrderPicker } from './useChatComposerOrderPicker';
import { useChatComposerAudioRecording, type ChatAudioPreview } from './useChatComposerAudioRecording';
import { useChatComposerInputState } from './useChatComposerInputState';

export type InsertedSnippet = { id: number; text: string };

export interface UseChatComposerControllerOptions {
  conversation: WhatsAppConversation;
  displayName: string;
  canSend: boolean;
  canShareCommercialInfo: boolean;
  canCreateOrders?: boolean;
  shareOrderRequest: { record: SupportOrderSummary; requestId: string } | null;
  onShareOrderRequestHandled?: (requestId: string) => void;
  isChannelConnected: boolean;
  onSendCustomerMessage?: (input: CustomerSupportSendInput) => Promise<CustomerSupportSendResult>;
  onRefreshMessages?: () => Promise<void> | void;
  replyTarget?: WhatsAppMessage | null;
  onClearReplyTarget?: () => void;
  composerModeProp?: 'whatsapp' | 'comment';
  onComposerModeChange?: (mode: 'whatsapp' | 'comment') => void;
  insertedSnippet?: InsertedSnippet | null;
}

const makeId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const formatDuration = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

export function useChatComposerController(options: UseChatComposerControllerOptions) {
  const {
    conversation,
    displayName,
    canSend,
    canShareCommercialInfo,
    shareOrderRequest,
    onShareOrderRequestHandled,
    isChannelConnected,
    onSendCustomerMessage,
    onRefreshMessages,
    replyTarget = null,
    onClearReplyTarget,
    composerModeProp = 'whatsapp',
    onComposerModeChange,
    insertedSnippet,
  } = options;

  const [internalComposerMode, setInternalComposerMode] = useState<'whatsapp' | 'comment'>('whatsapp');
  const composerMode = onComposerModeChange ? composerModeProp : internalComposerMode;
  const setComposerMode = onComposerModeChange || setInternalComposerMode;
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [newOrderType, setNewOrderType] = useState<'sale' | 'budget' | null>(null);
  const currentAudioAttachmentRef = useRef<string | null>(null);
  const audioPreviewRef = useRef<ChatAudioPreview>(null);

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
  const attachments = watchDraft('attachments') || [];

  const {
    objectUrlsRef,
    fileByAttachmentIdRef,
    photoInputRef,
    documentInputRef,
    releaseAttachment,
    appendAttachments,
    removeAttachment,
    addFiles,
    addStoreContact,
  } = useChatComposerAttachments({
    watchAttachments: () => watchDraft('attachments') || [],
    setDraftValue,
    setDraftError,
    clearDraftErrors,
    setSendError: (err) => sendControl.setSendError(err),
    setSendFeedback: (fb) => sendControl.setSendFeedback(fb),
    setAudioPreview: (preview) => audioRecording.setAudioPreview(preview),
    audioPreviewRef,
    currentAudioAttachmentRef,
    makeId,
  });

  const sendControl = useChatComposerSend({
    canSend,
    isChannelConnected,
    onSendCustomerMessage,
    onRefreshMessages,
    replyTarget,
    onClearReplyTarget,
    fileByAttachmentIdRef,
    removeAttachment,
    setDraftValue,
  });

  const orderPicker = useChatComposerOrderPicker({
    customerId: conversation.customerId,
    displayName,
    canSend,
    canShareCommercialInfo,
    shareOrderRequest,
    onShareOrderRequestHandled,
    addFiles,
  });

  const audioRecording = useChatComposerAudioRecording({
    objectUrlsRef,
    audioPreviewRef,
    currentAudioAttachmentRef,
    setSendError: sendControl.setSendError,
    makeId,
    formatDuration,
    removeAttachment,
    appendAttachments,
  });

  const { messageInputRef, insertEmoji } = useChatComposerInputState({
    message,
    setDraftValue,
    watchDraft,
    replyTarget,
    composerMode,
    setComposerMode,
    insertedSnippet,
  });

  useChatComposerDraftLifecycle({
    objectUrlsRef,
    fileByAttachmentIdRef,
    recordingStreamRef: audioRecording.recordingStreamRef,
    isRecording: audioRecording.isRecording,
    isRecordingPaused: audioRecording.isRecordingPaused,
    setRecordingSeconds: audioRecording.setRecordingSeconds,
    audioPreview: audioRecording.audioPreview,
  });

  const handleSendDraft = handleDraftSubmit(sendControl.executeSendDraft);

  return {
    composerMode,
    setComposerMode,
    isCatalogOpen,
    setIsCatalogOpen,
    newOrderType,
    setNewOrderType,
    message,
    attachments,
    registerDraft,
    handleSendDraft,
    draftErrors,
    isDraftSubmitting,
    messageInputRef,
    insertEmoji,
    photoInputRef,
    documentInputRef,
    releaseAttachment,
    removeAttachment,
    addFiles,
    addStoreContact,
    sendControl,
    orderPicker,
    audioRecording,
  };
}
