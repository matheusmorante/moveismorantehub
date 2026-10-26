export const CUSTOMER_SUPPORT_MAX_OPEN_CHATS = 1;

export type CustomerSupportMultiChatPresentation = 'single';

export function getCustomerSupportMultiChatPresentation(
  _isMultiChatMode: boolean,
  _openChatCount: number,
  _viewportWidth: number,
): CustomerSupportMultiChatPresentation {
  return 'single';
}
