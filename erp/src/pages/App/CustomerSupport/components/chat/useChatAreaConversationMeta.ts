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
    const displayName =
      conversation.contactName?.trim() || formatPhoneForDisplay(conversation.contactPhone);

    const formattedPhone = formatPhoneForDisplay(conversation.contactPhone);
    const careWindow = whatsappSupportGuard.calculateCareWindow(conversation.lastCustomerMessageAt);
    const configuredPhoneNumberId = getSettings().whatsappConfig?.phoneNumberId;
    const isChannelConnected = Boolean(
      configuredPhoneNumberId && configuredPhoneNumberId === conversation.businessPhoneNumberId
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
