import type { CSSProperties } from 'react';

interface CustomerSupportPanelStylesInput {
  isMobileViewport: boolean;
  isMobileInboxOpen: boolean;
  isInboxSidebarOpen: boolean;
  inboxSidebarWidth: number;
  isConversationSidebarOpen: boolean;
  conversationSidebarWidth: number;
  isDraggingSupportPanel: boolean;
}

export function getCustomerSupportPanelStyles({
  isMobileViewport,
  isMobileInboxOpen,
  isInboxSidebarOpen,
  inboxSidebarWidth,
  isConversationSidebarOpen,
  conversationSidebarWidth,
  isDraggingSupportPanel,
}: CustomerSupportPanelStylesInput): {
  inboxPanelStyle: CSSProperties;
  conversationPanelStyle: CSSProperties;
} {
  const inboxPanelStyle = isMobileViewport
    ? {
        position: 'absolute' as const,
        left: '56px',
        top: 0,
        bottom: 0,
        width: isMobileInboxOpen ? 'min(280px, calc(100vw - 56px))' : '0px',
        flex: '0 0 0px',
        zIndex: 40,
        boxShadow: isMobileInboxOpen ? '0 12px 32px rgba(15, 23, 42, 0.24)' : 'none',
        visibility: isMobileInboxOpen ? 'visible' as const : 'hidden' as const,
        pointerEvents: isMobileInboxOpen ? 'auto' as const : 'none' as const,
        transition: isDraggingSupportPanel ? 'none' : 'width 180ms ease',
      }
    : {
        position: 'relative' as const,
        width: isInboxSidebarOpen ? `${inboxSidebarWidth}px` : '0px',
        flex: isInboxSidebarOpen ? `0 1 ${inboxSidebarWidth}px` : '0 0 0px',
        minWidth: isInboxSidebarOpen ? '180px' : '0px',
        maxWidth: '360px',
        zIndex: 10,
        visibility: isInboxSidebarOpen ? 'visible' as const : 'hidden' as const,
        pointerEvents: isInboxSidebarOpen ? 'auto' as const : 'none' as const,
        transition: isDraggingSupportPanel ? 'none' : 'width 180ms ease, flex-basis 180ms ease',
      };

  const conversationPanelStyle = isMobileViewport
    ? {
        position: 'relative' as const,
        width: 'auto',
        flex: '1 1 0%',
        minWidth: 0,
        maxWidth: 'none',
        transition: 'none',
      }
    : {
        position: 'relative' as const,
        width: isConversationSidebarOpen ? `${conversationSidebarWidth}px` : '0px',
        flex: isConversationSidebarOpen ? `0 1 ${conversationSidebarWidth}px` : '0 0 0px',
        minWidth: isConversationSidebarOpen ? '260px' : '0px',
        maxWidth: '600px',
        visibility: isConversationSidebarOpen ? 'visible' as const : 'hidden' as const,
        pointerEvents: isConversationSidebarOpen ? 'auto' as const : 'none' as const,
        transition: isDraggingSupportPanel ? 'none' : 'width 180ms ease, flex-basis 180ms ease',
      };

  return { inboxPanelStyle, conversationPanelStyle };
}
