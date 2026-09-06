import { Page, expect } from '@playwright/test';

export async function openFinancialAssistant(page: Page) {
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
  await page.waitForTimeout(500);
  await expect(page.locator('.animate-bounce')).toHaveCount(0, { timeout: 10000 }).catch(() => {});
}

export async function getLastAssistantMessage(page: Page) {
  const messages = page.locator('[data-testid="assistant-message-ai"]');
  await expect(messages.last()).toBeVisible({ timeout: 10000 });
  return messages.last().textContent();
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
