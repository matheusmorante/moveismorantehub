import { test, expect } from '@playwright/test';
import {
  openFinancialAssistant,
  sendAssistantMessage,
  waitForAssistantIdle,
  getLastAssistantMessage
} from '../helpers/assistant.helper';

test.describe('Assistente Financeiro - Tratamento de Datas Relativas', () => {
  test.beforeEach(async ({ page }) => {
    await openFinancialAssistant(page);
  });

  test('Vencimento todo dia 20 a partir do próximo mês', async ({ page }) => {
    await sendAssistantMessage(page, 'compra de 10 mil da Bechara todo dia 20 a partir do próximo mês em 3 parcelas');
    await waitForAssistantIdle(page);
    const lastMsg = await getLastAssistantMessage(page);
    expect(lastMsg).toBeTruthy();
  });
});
