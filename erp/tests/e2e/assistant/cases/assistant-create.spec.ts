import { test, expect } from '@playwright/test';
import {
  openFinancialAssistant,
  sendAssistantMessage,
  waitForAssistantIdle,
  getLastAssistantMessage
} from '../helpers/assistant.helper';

test.describe('Assistente Financeiro - Criação de Lançamentos', () => {
  test.beforeEach(async ({ page }) => {
    await openFinancialAssistant(page);
  });

  test('Criação de saída simples em dinheiro', async ({ page }) => {
    await sendAssistantMessage(page, 'paguei 180 reais de combustível hoje no pix');
    await waitForAssistantIdle(page);
    const lastMsg = await getLastAssistantMessage(page);
    expect(lastMsg).toBeTruthy();
  });

  test('Criação de entrada simples com cliente', async ({ page }) => {
    await sendAssistantMessage(page, 'recebi 2500 de uma venda hoje no pix');
    await waitForAssistantIdle(page);
    const lastMsg = await getLastAssistantMessage(page);
    expect(lastMsg).toBeTruthy();
  });
});
