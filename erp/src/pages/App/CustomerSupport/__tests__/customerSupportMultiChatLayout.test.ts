import { describe, expect, it } from 'vitest';
import {
  CUSTOMER_SUPPORT_MAX_OPEN_CHATS,
  getCustomerSupportMultiChatPresentation,
} from '../customerSupportMultiChatLayout';

describe('layout responsivo dos chats abertos', () => {
  it('mantém o chat único no layout existente', () => {
    expect(getCustomerSupportMultiChatPresentation(false, 1, 1440)).toBe('single');
    expect(getCustomerSupportMultiChatPresentation(true, 0, 1440)).toBe('single');
  });

  it('usa duas colunas quando há espaço e abas quando a largura é menor', () => {
    expect(getCustomerSupportMultiChatPresentation(true, 2, 960)).toBe('columns');
    expect(getCustomerSupportMultiChatPresentation(true, 2, 959)).toBe('tabs');
  });

  it('usa três colunas somente na largura adequada e respeita o máximo de chats', () => {
    expect(CUSTOMER_SUPPORT_MAX_OPEN_CHATS).toBe(3);
    expect(getCustomerSupportMultiChatPresentation(true, 3, 1280)).toBe('columns');
    expect(getCustomerSupportMultiChatPresentation(true, 3, 1279)).toBe('tabs');
  });

  it('usa abas no celular mesmo com apenas um chat aberto no modo múltiplo', () => {
    expect(getCustomerSupportMultiChatPresentation(true, 1, 390)).toBe('tabs');
  });
});
