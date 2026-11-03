import { chromium, expect, test } from '@playwright/test';

test('retoma o rascunho e verifica os nomes dos itens antes de editar', async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9225');
  const context = browser.contexts()[0];
  if (!context) throw new Error('Sessão Chrome indisponível');
  const page = context.pages().find((candidate) => candidate.url().includes('/sales-order'));
  if (!page) throw new Error('Lista de pedidos não encontrada');
  await page.goto('http://localhost:5173/sales-order', { waitUntil: 'domcontentloaded' });
  const card = page.locator('[id^="order-card-"]').filter({ hasText: '#008390' });
  await expect(card).toBeVisible({ timeout: 30_000 });
  await card.getByRole('button', { name: 'Retomar cadastramento do pedido' }).click();
  await page.getByRole('button', { name: /Próxima Etapa/i }).click();
  await expect(page.getByRole('heading', { name: /ITENS DO PEDIDO/i })).toBeVisible();
  const rows = await page.evaluate(() => [...document.querySelectorAll('button')]
    .filter((button) => /Expandir item/.test([button.innerText, button.title, button.getAttribute('aria-label')].join(' ')))
    .map((button) => {
      let ancestor: HTMLElement | null = button as HTMLElement;
      for (let level = 0; level < 4 && ancestor?.innerText?.length < 80; level += 1) ancestor = ancestor?.parentElement || null;
      return {
        button: (button.innerText || button.title || button.getAttribute('aria-label') || '').trim(),
        parent: ancestor?.innerText?.trim().slice(0, 480) || '',
      };
    }));
  const formState = await page.evaluate(() => ({
    headings: [...document.querySelectorAll('h1,h2,h3,h4')].map((node) => node.textContent?.trim()).filter(Boolean).slice(-5),
    itemButtons: [...document.querySelectorAll('button')].map((node) => (node.innerText || node.title || '').trim()).filter((text) => /Expandir item|Adicionar item/.test(text)),
  }));
  console.log('[draft-items-detail]', JSON.stringify({ rows, formState }));
});
