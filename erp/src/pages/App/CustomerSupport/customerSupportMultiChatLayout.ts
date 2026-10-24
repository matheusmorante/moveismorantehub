export const CUSTOMER_SUPPORT_MAX_OPEN_CHATS = 3;

const MULTI_CHAT_BREAKPOINTS = {
  twoColumns: 960,
  threeColumns: 1280,
  singleColumn: 768,
} as const;

export type CustomerSupportMultiChatPresentation = 'single' | 'columns' | 'tabs';

export function getCustomerSupportMultiChatPresentation(
  isMultiChatMode: boolean,
  openChatCount: number,
  viewportWidth: number,
): CustomerSupportMultiChatPresentation {
  if (!isMultiChatMode || openChatCount < 1) return 'single';
  if (openChatCount === 1) return viewportWidth >= MULTI_CHAT_BREAKPOINTS.singleColumn ? 'columns' : 'tabs';
  if (openChatCount === 2) return viewportWidth >= MULTI_CHAT_BREAKPOINTS.twoColumns ? 'columns' : 'tabs';
  return viewportWidth >= MULTI_CHAT_BREAKPOINTS.threeColumns ? 'columns' : 'tabs';
}
