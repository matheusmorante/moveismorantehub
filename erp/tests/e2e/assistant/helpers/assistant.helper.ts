import { Page, expect } from '@playwright/test';

export async function setupDeterministicAiMock(page: Page) {
  await page.route('**/generativelanguage.googleapis.com/**', async route => {
    const postData = route.request().postDataJSON();
    const promptText = postData?.contents?.[0]?.parts?.[0]?.text || '';
    const lower = promptText.toLowerCase();

    // 1. Caso de chat simples ou dúvida
    if (lower.includes('você é um assistente prestativo') || lower.includes('assistente:')) {
      const resp = {
        candidates: [{
          content: { parts: [{ text: 'Olá! Sou o assistente do sistema. Como posso te ajudar hoje?' }] }
        }]
      };
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(resp)
      });
    }

    // 2. Extração de intenção para transações/produtos/pedidos
    let intentResult: any = {
      intent: 'create_transaction',
      status: 'ready',
      summary: 'Lançamento identificado. Deseja confirmar?',
      data: {
        type: 'expense',
        amount: 50,
        description: 'Despesa Geral',
        payment_method: 'Pix',
        category: 'Outros'
      }
    };

    // Detecção de ajuste de valor
    if (lower.includes('na verdade foi 180') || lower.includes('corrigindo o campo') || lower.includes('180, não 200')) {
      intentResult = {
        intent: 'create_transaction',
        status: 'ready',
        summary: 'Ajustei o valor para R$ 180,00.',
        data: {
          amount: 180
        }
      };
    } else if (lower.includes('paguei o almoço') && !lower.includes('reais') && !/\d+/.test(promptText.split('Mensagem do Usuário:')[1] || '')) {
      // Despesa sem valor informado
      intentResult = {
        intent: 'create_transaction',
        status: 'incomplete',
        summary: 'Qual foi o valor gasto no almoço?',
        data: {
          description: 'Almoço',
          payment_method: 'Pix'
        }
      };
    } else {
      // Extração dinâmica dos dados da mensagem
      const userSection = promptText.split('Mensagem do Usuário:')[1] || promptText;
      const userLower = userSection.toLowerCase();

      let type = userLower.includes('recebi') || userLower.includes('venda') ? 'income' : 'expense';
      let amount = 50;
      const numMatch = userLower.match(/(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)/);
      if (numMatch) {
        amount = parseFloat(numMatch[1].replace(',', '.'));
      }

      let paymentMethod = 'Dinheiro';
      if (userLower.includes('pix')) paymentMethod = 'Pix';
      else if (userLower.includes('crédito') || userLower.includes('credito')) paymentMethod = 'Cartão de Crédito';
      else if (userLower.includes('débito') || userLower.includes('debito')) paymentMethod = 'Cartão de Débito';
      else if (userLower.includes('boleto')) paymentMethod = 'Boleto';

      let description = 'Despesa';
      if (userLower.includes('almoço') || userLower.includes('almoco')) description = 'Almoço';
      else if (userLower.includes('gasolina') || userLower.includes('combustível') || userLower.includes('combustivel')) description = 'Combustível';
      else if (userLower.includes('estacionamento')) description = 'Estacionamento';
      else if (userLower.includes('limpeza')) description = 'Material de limpeza';
      else if (userLower.includes('mercado')) description = 'Mercado';
      else if (userLower.includes('luz')) description = 'Conta de luz';
      else if (userLower.includes('uber')) description = 'Uber';
      else if (userLower.includes('café') || userLower.includes('cafe')) description = 'Café da tarde';
      else if (userLower.includes('venda')) description = 'Venda no PDV';

      intentResult = {
        intent: 'create_transaction',
        status: 'ready',
        summary: `Identifiquei ${type === 'income' ? 'uma entrada' : 'uma saída'} de R$ ${amount.toFixed(2)} (${description} no ${paymentMethod}). Deseja confirmar?`,
        data: {
          type,
          amount,
          description,
          payment_method: paymentMethod,
          product_name: description
        }
      };
    }

    const resp = {
      candidates: [{
        content: { parts: [{ text: JSON.stringify(intentResult) }] }
      }]
    };

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(resp)
    });
  });
}

export async function openFinancialAssistant(page: Page, options?: { skipMock?: boolean }) {
  if (!options?.skipMock) {
    await setupDeterministicAiMock(page);
  }

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`[Browser ${msg.type().toUpperCase()}]:`, msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('[Browser PAGE ERROR]:', err.message);
  });

  await page.goto('/?auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator');
  await page.waitForLoadState('domcontentloaded');

  const assistantInput = page.locator('[data-testid="assistant-input"]');
  if (await assistantInput.isVisible()) {
    return;
  }

  const hubToggle = page.locator('[data-testid="floating-hub-toggle"]');
  if (await hubToggle.isVisible()) {
    await hubToggle.click();
    await page.waitForTimeout(300);
  }

  const toggleBtn = page.locator('[data-testid="assistant-toggle"]');
  if (await toggleBtn.isVisible()) {
    await toggleBtn.click();
  }

  await expect(page.locator('[data-testid="assistant-input"]')).toBeVisible({ timeout: 15000 });
}

export async function sendAssistantMessage(page: Page, text: string) {
  const input = page.locator('[data-testid="assistant-input"]');
  await input.fill(text);
  await page.locator('[data-testid="assistant-send"]').click();
}

export async function waitForAssistantIdle(page: Page) {
  await page.waitForTimeout(300);
  await expect(page.locator('[data-testid="assistant-analyzing-state"]')).toHaveCount(0, { timeout: 10000 }).catch(() => {});
  await expect(page.locator('.animate-bounce')).toHaveCount(0, { timeout: 10000 }).catch(() => {});
}

export async function getLastAssistantMessage(page: Page) {
  const messages = page.locator('[data-testid="assistant-message-ai"]');
  if (await messages.count() === 0) {
    // Fallback para mensagens do assistente no chat
    const bubbles = page.locator('.whitespace-pre-wrap');
    if (await bubbles.count() > 0) {
      return bubbles.last().textContent();
    }
  } else {
    await expect(messages.last()).toBeVisible({ timeout: 10000 });
    return messages.last().textContent();
  }
  return null;
}

export async function getTransactionPreviewCard(page: Page) {
  const card = page.locator('[data-testid="transaction-preview-card"]');
  await expect(card.first()).toBeVisible({ timeout: 10000 });
  return card.first();
}

export async function confirmTransaction(page: Page) {
  const confirmBtn = page.locator('[data-testid="transaction-confirm"]').first();
  await expect(confirmBtn).toBeVisible({ timeout: 10000 });
  await confirmBtn.click();
}

export async function editDraft(page: Page) {
  const editBtn = page.locator('[data-testid="transaction-edit"]').first();
  await expect(editBtn).toBeVisible({ timeout: 10000 });
  await editBtn.click();
}

export async function clearChat(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('lisandro_chat_history');
  });
  await page.reload();
}
