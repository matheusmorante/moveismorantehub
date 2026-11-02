import { useEffect, useRef, useState } from 'react';
import {
  CUSTOMER_SUPPORT_LAYOUT_DEFAULTS,
  loadCustomerSupportLayoutPreferences,
  saveCustomerSupportLayoutPreferences,
} from '../customerSupportLayoutPreferences';
import { getCustomerSupportPanelStyles } from '../customerSupportPanelStyles';

export function useCustomerSupportPanelLayout(userId?: string) {
  const [isInboxSidebarOpen, setIsInboxSidebarOpen] = useState(true);
  const [inboxSidebarWidth, setInboxSidebarWidth] = useState(CUSTOMER_SUPPORT_LAYOUT_DEFAULTS.inboxWidth);
  const [isConversationSidebarOpen, setIsConversationSidebarOpen] = useState(true);
  const [conversationSidebarWidth, setConversationSidebarWidth] = useState(CUSTOMER_SUPPORT_LAYOUT_DEFAULTS.conversationsWidth);
  const [isMobileInboxOpen, setIsMobileInboxOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );
  const [isDraggingSupportPanel, setIsDraggingSupportPanel] = useState(false);
  const supportLayoutRef = useRef<HTMLDivElement>(null);
  const inboxPanelRef = useRef<HTMLDivElement>(null);
  const conversationPanelRef = useRef<HTMLDivElement>(null);
  const preferencesLoadedForUser = useRef<string | null>(null);
  const skipLayoutPreferenceSave = useRef(false);

  useEffect(() => {
    const preferences = loadCustomerSupportLayoutPreferences(userId);
    preferencesLoadedForUser.current = userId || null;
    skipLayoutPreferenceSave.current = true;
    setInboxSidebarWidth(preferences.inboxWidth);
    setConversationSidebarWidth(preferences.conversationsWidth);
    setIsInboxSidebarOpen(preferences.isInboxOpen);
    setIsConversationSidebarOpen(preferences.isConversationsOpen);
  }, [userId]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const updateViewport = () => {
      setIsMobileViewport(media.matches);
    };
    updateViewport();
    media.addEventListener('change', updateViewport);
    window.addEventListener('resize', updateViewport);
    return () => {
      media.removeEventListener('change', updateViewport);
      window.removeEventListener('resize', updateViewport);
    };
  }, []);

  useEffect(() => {
    if (isMobileViewport) setIsMobileInboxOpen(false);
  }, [isMobileViewport]);

  useEffect(() => {
    if (skipLayoutPreferenceSave.current) {
      skipLayoutPreferenceSave.current = false;
      return;
    }
    if (!userId || preferencesLoadedForUser.current !== userId || isMobileViewport || isDraggingSupportPanel) return;
    saveCustomerSupportLayoutPreferences(userId, {
      inboxWidth: inboxSidebarWidth,
      conversationsWidth: conversationSidebarWidth,
      isInboxOpen: isInboxSidebarOpen,
      isConversationsOpen: isConversationSidebarOpen,
    });
  }, [
    userId,
    isMobileViewport,
    isDraggingSupportPanel,
    inboxSidebarWidth,
    conversationSidebarWidth,
    isInboxSidebarOpen,
    isConversationSidebarOpen,
  ]);

  const handleToggleInboxPanel = () => {
    if (isMobileViewport) setIsMobileInboxOpen((open) => !open);
    else setIsInboxSidebarOpen((open) => !open);
  };

  const handleCloseInboxPanel = () => {
    if (isMobileViewport) setIsMobileInboxOpen(false);
    else setIsInboxSidebarOpen(false);
  };

  const handleResetLayout = () => {
    setInboxSidebarWidth(CUSTOMER_SUPPORT_LAYOUT_DEFAULTS.inboxWidth);
    setConversationSidebarWidth(CUSTOMER_SUPPORT_LAYOUT_DEFAULTS.conversationsWidth);
    setIsInboxSidebarOpen(CUSTOMER_SUPPORT_LAYOUT_DEFAULTS.isInboxOpen);
    setIsConversationSidebarOpen(CUSTOMER_SUPPORT_LAYOUT_DEFAULTS.isConversationsOpen);
  };

  const inboxPanelVisible = isMobileViewport ? isMobileInboxOpen : isInboxSidebarOpen;
  const { inboxPanelStyle, conversationPanelStyle } = getCustomerSupportPanelStyles({
    isMobileViewport,
    isMobileInboxOpen,
    isInboxSidebarOpen,
    inboxSidebarWidth,
    isConversationSidebarOpen,
    conversationSidebarWidth,
    isDraggingSupportPanel,
  });

  return {
    supportLayoutRef,
    inboxPanelRef,
    conversationPanelRef,
    isInboxSidebarOpen,
    setIsInboxSidebarOpen,
    inboxSidebarWidth,
    setInboxSidebarWidth,
    isConversationSidebarOpen,
    setIsConversationSidebarOpen,
    conversationSidebarWidth,
    setConversationSidebarWidth,
    isMobileInboxOpen,
    setIsMobileInboxOpen,
    isMobileViewport,
    isDraggingSupportPanel,
    setIsDraggingSupportPanel,
    inboxPanelVisible,
    inboxPanelStyle,
    conversationPanelStyle,
    handleToggleInboxPanel,
    handleCloseInboxPanel,
    handleResetLayout,
  };
}
