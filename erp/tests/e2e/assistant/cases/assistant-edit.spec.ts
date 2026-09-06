import { test, expect } from '@playwright/test';
import {
  openFinancialAssistant,
  sendAssistantMessage,
  waitForAssistantIdle,
  getLastAssistantMessage
} from '../helpers/assistant.helper';

test.describe('Assistente Financeiro - Edição e Alteração', () => {
  test.beforeEach(async ({ page }) => {
    await openFinancialAssistant(page);
  });

  test('Edição de compra informando fornecedor', async ({ page }) => {
    await sendAssistantMessage(page, 'quero editar uma compra da Bechara');
    await waitForAssistantIdle(page);
    const lastMsg = await getLastAssistantMessage(page);
    expect(lastMsg).toBeTruthy();
  });
});
