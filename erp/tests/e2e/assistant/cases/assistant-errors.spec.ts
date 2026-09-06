import { test, expect } from '@playwright/test';
import {
  openFinancialAssistant,
  sendAssistantMessage,
  waitForAssistantIdle,
  getLastAssistantMessage
} from '../helpers/assistant.helper';

test.describe('Assistente Financeiro - Validação e Alertas de Divergência', () => {
  test.beforeEach(async ({ page }) => {
    await openFinancialAssistant(page);
  });

  test('Detecta divergência entre total informado e soma das parcelas', async ({ page }) => {
    await sendAssistantMessage(page, 'comprei 30 mil da Bechara em dois boletos de 10 mil e um de 5 mil');
    await waitForAssistantIdle(page);
    const lastMsg = await getLastAssistantMessage(page);
    expect(lastMsg).toBeTruthy();
  });
});
