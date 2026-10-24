export interface CustomerSupportLayoutPreferences {
  inboxWidth: number;
  conversationsWidth: number;
  isInboxOpen: boolean;
  isConversationsOpen: boolean;
}

export const CUSTOMER_SUPPORT_LAYOUT_DEFAULTS: CustomerSupportLayoutPreferences = {
  inboxWidth: 220,
  conversationsWidth: 340,
  isInboxOpen: true,
  isConversationsOpen: true,
};

const STORAGE_KEY_PREFIX = 'morantehub_customer_support_layout_';

const clampWidth = (value: unknown, fallback: number, min: number, max: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.round(Math.min(max, Math.max(min, value)));
};

export const normalizeCustomerSupportLayoutPreferences = (
  value: Partial<CustomerSupportLayoutPreferences> | null | undefined,
): CustomerSupportLayoutPreferences => ({
  inboxWidth: clampWidth(value?.inboxWidth, CUSTOMER_SUPPORT_LAYOUT_DEFAULTS.inboxWidth, 180, 360),
  conversationsWidth: clampWidth(value?.conversationsWidth, CUSTOMER_SUPPORT_LAYOUT_DEFAULTS.conversationsWidth, 260, 600),
  isInboxOpen: typeof value?.isInboxOpen === 'boolean' ? value.isInboxOpen : CUSTOMER_SUPPORT_LAYOUT_DEFAULTS.isInboxOpen,
  isConversationsOpen: typeof value?.isConversationsOpen === 'boolean'
    ? value.isConversationsOpen
    : CUSTOMER_SUPPORT_LAYOUT_DEFAULTS.isConversationsOpen,
});

const storageKey = (userId: string) => `${STORAGE_KEY_PREFIX}${userId}`;

export const loadCustomerSupportLayoutPreferences = (userId?: string): CustomerSupportLayoutPreferences => {
  if (!userId || typeof window === 'undefined') return { ...CUSTOMER_SUPPORT_LAYOUT_DEFAULTS };

  try {
    const saved = window.localStorage.getItem(storageKey(userId));
    return saved
      ? normalizeCustomerSupportLayoutPreferences(JSON.parse(saved) as Partial<CustomerSupportLayoutPreferences>)
      : { ...CUSTOMER_SUPPORT_LAYOUT_DEFAULTS };
  } catch {
    return { ...CUSTOMER_SUPPORT_LAYOUT_DEFAULTS };
  }
};

export const saveCustomerSupportLayoutPreferences = (
  userId: string | undefined,
  preferences: CustomerSupportLayoutPreferences,
): void => {
  if (!userId || typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(normalizeCustomerSupportLayoutPreferences(preferences)));
  } catch {
    // A indisponibilidade do armazenamento local não deve interromper a Central.
  }
};
