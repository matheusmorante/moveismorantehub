// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CUSTOMER_SUPPORT_LAYOUT_DEFAULTS,
  loadCustomerSupportLayoutPreferences,
  normalizeCustomerSupportLayoutPreferences,
  saveCustomerSupportLayoutPreferences,
} from '../customerSupportLayoutPreferences';

beforeEach(() => window.localStorage.clear());

describe('preferências de layout da Central', () => {
  it('usa valores padrão e persiste as preferências por identificador de usuário', () => {
    expect(loadCustomerSupportLayoutPreferences('atendente-1')).toEqual(CUSTOMER_SUPPORT_LAYOUT_DEFAULTS);

    saveCustomerSupportLayoutPreferences('atendente-1', {
      inboxWidth: 310,
      conversationsWidth: 420,
      isInboxOpen: false,
      isConversationsOpen: true,
    });

    expect(loadCustomerSupportLayoutPreferences('atendente-1')).toEqual({
      inboxWidth: 310,
      conversationsWidth: 420,
      isInboxOpen: false,
      isConversationsOpen: true,
    });
    expect(loadCustomerSupportLayoutPreferences('atendente-2')).toEqual(CUSTOMER_SUPPORT_LAYOUT_DEFAULTS);
  });

  it('limita larguras e recupera dados inválidos sem quebrar a tela', () => {
    expect(normalizeCustomerSupportLayoutPreferences({
      inboxWidth: 900,
      conversationsWidth: 100,
      isInboxOpen: 'yes' as unknown as boolean,
    })).toEqual({
      inboxWidth: 360,
      conversationsWidth: 260,
      isInboxOpen: true,
      isConversationsOpen: true,
    });

    window.localStorage.setItem('morantehub_customer_support_layout_atendente-1', '{invalid');
    expect(loadCustomerSupportLayoutPreferences('atendente-1')).toEqual(CUSTOMER_SUPPORT_LAYOUT_DEFAULTS);
  });
});
