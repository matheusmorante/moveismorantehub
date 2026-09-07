import { test, expect, Page } from '@playwright/test';
import {
  openFinancialAssistant,
  sendAssistantMessage,
  waitForAssistantIdle,
  getLastAssistantMessage,
  getTransactionPreviewCard,
  confirmTransaction,
  clearChat,
} from '../helpers/assistant.helper';

/**
 * Suíte E2E Determinística: Assistente Financeiro
 *
 * Valida os fluxos de interface, lógica de rascunhos, previews e confirmação com mock determinístico:
 * 1. E2E determinístico: resposta simples
 * 2. E2E determinístico: múltiplas despesas
 * 3. E2E determinístico: entrada + saída
 * 4. E2E determinístico: correção de valor
 * 5. E2E determinístico: complemento de pagamento
 */

const TEST_PREFIX = '[TESTE_AUT]';

async function cleanupTestTransactions(page: Page) {
  try {
    await page.evaluate(() => {
      localStorage.removeItem('lisandro_chat_history');
    });
  } catch {
    // Silencioso se a página não estiver carregada
  }
}

test.describe('Assistente Financeiro — Suíte E2E Determinística', () => {
  test.beforeEach(async ({ page }) => {
    await openFinancialAssistant(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupTestTransactions(page);
  });

  // 1. CENÁRIO DETERMINÍSTICO: RESPOSTA SIMPLES
  test('E2E determinístico: resposta simples e exibição de card de preview', async ({ page }) => {
    await sendAssistantMessage(page, `paguei 45 reais de almoço hoje no dinheiro ${TEST_PREFIX}`);
    await waitForAssistantIdle(page);

    const aiMsg = await getLastAssistantMessage(page);
    expect(aiMsg).toBeTruthy();

    const card = await getTransactionPreviewCard(page);
    await expect(card).toBeVisible();

    const cardText = await card.textContent();
    expect(cardText).toBeTruthy();
  });

  // 2. CENÁRIO DETERMINÍSTICO: MÚLTIPLAS DESPESAS
  test('E2E determinístico: múltiplas despesas sequenciais mantêm histórico de chat', async ({ page }) => {
    await sendAssistantMessage(page, `paguei 60 de almoço hoje no dinheiro ${TEST_PREFIX}`);
    await waitForAssistantIdle(page);

    const msg1 = await getLastAssistantMessage(page);
    expect(msg1).toBeTruthy();

    await sendAssistantMessage(page, `também gastei 35 de café da tarde no pix ${TEST_PREFIX}`);
    await waitForAssistantIdle(page);

    const msg2 = await getLastAssistantMessage(page);
    expect(msg2).toBeTruthy();

    const userMessages = page.locator('.bg-indigo-600');
    expect(await userMessages.count()).toBeGreaterThanOrEqual(2);
  });

  // 3. CENÁRIO DETERMINÍSTICO: ENTRADA + SAÍDA
  test('E2E determinístico: entrada + saída e confirmação com feedback visual', async ({ page }) => {
    // 3.1 Entrada
    await sendAssistantMessage(page, `recebi 1200 reais de uma venda hoje no pix ${TEST_PREFIX}`);
    await waitForAssistantIdle(page);

    let card = await getTransactionPreviewCard(page);
    await expect(card).toBeVisible();

    await card.hover();
    await page.waitForTimeout(300);
    await confirmTransaction(page);

    const successIndicator = page.locator('text=REGISTRO CONFIRMADO').first();
    await expect(successIndicator).toBeVisible({ timeout: 10000 });

    // 3.2 Saída
    await sendAssistantMessage(page, `paguei 85 reais de material de limpeza no dinheiro ${TEST_PREFIX}`);
    await waitForAssistantIdle(page);

    card = await getTransactionPreviewCard(page);
    await expect(card).toBeVisible();
  });

  // 4. CENÁRIO DETERMINÍSTICO: CORREÇÃO DE VALOR
  test('E2E determinístico: correção de valor via ajuste no chat', async ({ page }) => {
    await sendAssistantMessage(page, `paguei 200 de combustível hoje no pix ${TEST_PREFIX}`);
    await waitForAssistantIdle(page);

    const card = await getTransactionPreviewCard(page);
    await expect(card).toBeVisible();

    await card.hover();
    await page.waitForTimeout(300);

    const editBtn = page.locator('[data-testid="transaction-edit"]').first();
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();

    // Corrigir valor
    await sendAssistantMessage(page, 'na verdade foi 180, não 200');
    await waitForAssistantIdle(page);

    const adjustedMsg = await getLastAssistantMessage(page);
    expect(adjustedMsg).toBeTruthy();
  });

  // 5. CENÁRIO DETERMINÍSTICO: COMPLEMENTO DE PAGAMENTO
  test('E2E determinístico: complemento de pagamento para despesa sem valor', async ({ page }) => {
    await sendAssistantMessage(page, `paguei o almoço hoje no pix ${TEST_PREFIX}`);
    await waitForAssistantIdle(page);

    const aiMsg = await getLastAssistantMessage(page);
    expect(aiMsg).toBeTruthy();

    // Enviar o valor que faltava
    await sendAssistantMessage(page, 'foi 42 reais');
    await waitForAssistantIdle(page);

    const completeMsg = await getLastAssistantMessage(page);
    expect(completeMsg).toBeTruthy();
  });
});
