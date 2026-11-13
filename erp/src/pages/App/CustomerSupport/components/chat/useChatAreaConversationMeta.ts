import { useMemo } from 'react';
import { formatPhoneForDisplay } from '@/pages/utils/customerSupport/phoneUtils';
import { whatsappSupportGuard } from '@/pages/utils/customerSupport/whatsappSupportGuard';
import { getSettings } from '@/pages/utils/settingsService';
import type { WhatsAppConversation } from '../types';

interface UserProfile {
  id?: string;
  full_name?: string | null;
}

interface UserAuth {
  id?: string;
  email?: string | null;
}

export function useChatAreaConversationMeta(
  conversation: WhatsAppConversation,
  profile: UserProfile | null | undefined,
  user: UserAuth | null | undefined
) {
  return useMemo(() => {
    const isSocialChannel = conversation.channel === 'instagram' || conversation.channel === 'messenger';
    const channelLabel = conversation.channel === 'instagram'
      ? 'Instagram'
      : conversation.channel === 'messenger'
        ? 'Messenger'
        : 'WhatsApp';
    const displayName =
      conversation.contactName?.trim()
      || (isSocialChannel
        ? `Contato do ${channelLabel} · ${String(conversation.contactWaId || '').slice(-4)}`
        : formatPhoneForDisplay(conversation.contactPhone));

    const formattedPhone = isSocialChannel
      ? `ID ${String(conversation.contactWaId || '').slice(-4)}`
      : formatPhoneForDisplay(conversation.contactPhone);
    const careWindow = whatsappSupportGuard.calculateCareWindow(conversation.lastCustomerMessageAt);
    const configuredPhoneNumberId = getSettings().whatsappConfig?.phoneNumberId;
    const isChannelConnected = Boolean(
      !isSocialChannel
      && configuredPhoneNumberId
      && configuredPhoneNumberId === conversation.businessPhoneNumberId
    );

    const initials = conversation.contactName?.trim()
      ? conversation.contactName
          .trim()
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((w) => w[0].toUpperCase())
          .join('')
      : '';

    const currentStatus = conversation.status || (conversation.isArchived ? 'closed' : 'open');
    const currentUserName = profile?.full_name || user?.email || 'Atendente';

    return {
      displayName,
      formattedPhone,
      careWindow,
      isChannelConnected,
      initials,
      currentStatus,
      currentUserName,
    };
  }, [conversation, profile, user]);
}
