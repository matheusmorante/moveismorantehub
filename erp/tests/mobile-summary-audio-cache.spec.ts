import { test, expect } from '@playwright/test';

const APP_URL = 'http://localhost:8081/?auth_email=matheusmorante002@gmail.com&tab=entregas';

async function waitForSummaryToSettle(page: import('@playwright/test').Page) {
  const generatingAudio = page.getByText('Gerando resumo em áudio...', { exact: true });
  await expect(generatingAudio).toHaveCount(0, { timeout: 8000 });
}

test('resumo reutiliza o áudio salvo ao voltar para um período já aberto', async ({ page }) => {
  await page.goto(APP_URL, { waitUntil: 'commit', timeout: 5000 });
  await expect(page.getByText('Entregas de Hoje', { exact: true })).toBeVisible({ timeout: 10000 });

  // A primeira abertura pode preparar o conteúdo; espera finalizar antes de trocar.
  await waitForSummaryToSettle(page);

  await page.getByText('Dias Seguintes', { exact: true }).click();
  await expect(page.getByText('Entregas dos Próximos Dias', { exact: true })).toBeVisible({ timeout: 10000 });
  await waitForSummaryToSettle(page);

  // Ao voltar para Hoje, mesmo texto deve vir do cache, sem novo estado de áudio.
  await page.getByText('Hoje', { exact: true }).last().click();
  await expect(page.getByText('Entregas de Hoje', { exact: true })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Gerando resumo em áudio...', { exact: true })).toHaveCount(0);
});
