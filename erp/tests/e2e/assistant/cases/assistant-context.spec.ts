import { test, expect } from '@playwright/test';
import {
  openFinancialAssistant,
  sendAssistantMessage,
  waitForAssistantIdle,
  getLastAssistantMessage
} from '../helpers/assistant.helper';

test.describe('Assistente Financeiro - Contexto Incremental e Desconhecimento', () => {
  test.beforeEach(async ({ page }) => {
    await openFinancialAssistant(page);
  });

  test('Não repete pergunta de valor ao responder "não lembro"', async ({ page }) => {
    await sendAssistantMessage(page, 'quero editar uma compra da Bechara mas não lembro o valor nem a data');
    await waitForAssistantIdle(page);
    const lastMsg = await getLastAssistantMessage(page);
    expect(lastMsg).not.toContain('Qual foi o valor dessa movimentação?');
  });
});
