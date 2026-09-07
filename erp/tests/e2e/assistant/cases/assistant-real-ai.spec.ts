import { test, expect } from '@playwright/test';
import {
  openFinancialAssistant,
  sendAssistantMessage,
  waitForAssistantIdle,
  getLastAssistantMessage,
  clearChat
} from '../helpers/assistant.helper';

/**
 * Suíte Smoke: IA Real (Gemini Live)
 * 
 * Executa cenários críticos chamando diretamente o provedor de IA com medição de latência.
 * Configurado com timeout de 30s por teste para tolerar latência de rede externa.
 */

test.describe('Assistente Financeiro — Smoke Test com IA Real (Gemini Live)', () => {
  test.setTimeout(35000); // Timeout estendido para IA externa

  test.beforeEach(async ({ page }) => {
    // Abrir assistente sem mock (chamada real)
    await openFinancialAssistant(page, { skipMock: true });
  });

  test.afterEach(async ({ page }) => {
    await clearChat(page);
  });

  test('IA REAL: Conversação simples e medição de latência', async ({ page }) => {
    const startTime = Date.now();
    const prompt = 'Olá, como você pode me ajudar no financeiro da loja?';

    await sendAssistantMessage(page, prompt);
    await waitForAssistantIdle(page);

    const durationMs = Date.now() - startTime;
    const responseText = await getLastAssistantMessage(page);

    console.log(`[Telemetria IA Real] Cenário 1: Duração = ${durationMs}ms | Resposta: "${responseText?.substring(0, 80)}..."`);

    expect(responseText).toBeTruthy();
    expect(responseText!.length).toBeGreaterThan(10);
    expect(durationMs).toBeGreaterThan(0);
  });

  test('IA REAL: Interpretação de despesa e captura de resposta bruta', async ({ page }) => {
    const startTime = Date.now();
    const prompt = 'gastei 50 reais de lanche da equipe hoje no pix';

    await sendAssistantMessage(page, prompt);
    await waitForAssistantIdle(page);

    const durationMs = Date.now() - startTime;
    const responseText = await getLastAssistantMessage(page);

    console.log(`[Telemetria IA Real] Cenário 2 (Despesa): Duração = ${durationMs}ms | Resposta: "${responseText?.substring(0, 100)}..."`);

    expect(responseText).toBeTruthy();
    expect(durationMs).toBeGreaterThan(0);
  });
});
