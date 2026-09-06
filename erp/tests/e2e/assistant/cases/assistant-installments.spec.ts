import { test, expect } from '@playwright/test';
import {
  openFinancialAssistant,
  sendAssistantMessage,
  waitForAssistantIdle,
  getLastAssistantMessage
} from '../helpers/assistant.helper';

test.describe('Assistente Financeiro - Lançamentos Parcelados', () => {
  test.beforeEach(async ({ page }) => {
    await openFinancialAssistant(page);
  });

  test('Lançamento parcelado com boletos de valores variados', async ({ page }) => {
    await sendAssistantMessage(page, 'comprei 30 mil da Bechara em dois boletos de 10 mil e dois de 5 mil');
    await waitForAssistantIdle(page);
    const lastMsg = await getLastAssistantMessage(page);
    expect(lastMsg).toBeTruthy();
  });
});
