import { describe, expect, it } from 'vitest';
import {
  CUSTOMER_SUPPORT_MAX_OPEN_CHATS,
  getCustomerSupportMultiChatPresentation,
} from '../customerSupportMultiChatLayout';

describe('limite de chats da Central de Atendimento', () => {
  it('mantém apenas uma conversa selecionada em qualquer largura', () => {
    expect(CUSTOMER_SUPPORT_MAX_OPEN_CHATS).toBe(1);
    expect(getCustomerSupportMultiChatPresentation(false, 1, 1440)).toBe('single');
    expect(getCustomerSupportMultiChatPresentation(true, 0, 1440)).toBe('single');
    expect(getCustomerSupportMultiChatPresentation(true, 1, 390)).toBe('single');
    expect(getCustomerSupportMultiChatPresentation(true, 3, 1440)).toBe('single');
  });
});
