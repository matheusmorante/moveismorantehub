import type { WhatsAppConversation } from '../types';
import type { SortOrder } from './index';

export function sortConversations(
  conversations: WhatsAppConversation[],
  sortOrder: SortOrder = 'newest'
): WhatsAppConversation[] {
  const list = [...conversations];
  if (sortOrder === 'unread') {
    return list.sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return timeB - timeA;
    });
  }

  if (sortOrder === 'oldest') {
    return list.sort((a, b) => {
      const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return timeA - timeB;
    });
  }

  // Default 'newest'
  return list.sort((a, b) => {
    const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return timeB - timeA;
  });
}
