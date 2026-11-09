import { test, expect } from '@playwright/test';
import { START_URL } from './deliveryFlowTestConstants';

export function registerUnattendedDeliveryModalCase(): void {
  test('4. Modal "Não foi possível entregar": campo de observações não fecha o modal; backdrop e X fecham; sem foto bloqueia o envio', async ({
    page,
  }) => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const orderId = 'e2e-delivery-unattended-004';
    const serverOrderState: Record<string, any> = {
      id: orderId,
      order_number: '900404',
      order_index: '900404',
      status: 'in_progress',
      order_type: 'sale',
      customer_name: 'CLIENTE E2E INSUCESSO',
      total_amount: 300,
      delivery_status: 'arrived',
      created_at: `${todayStr}T09:30:00.000Z`,
      updated_at: `${todayStr}T10:00:00.000Z`,
      order_data: {
        id: orderId,
        orderIndex: '900404',
        status: 'in_progress',
        orderType: 'sale',
        deliveryStatus: 'arrived',
        deliveryStartedAt: `${todayStr}T10:00:00.000Z`,
        deliveryArrivedAt: `${todayStr}T10:20:00.000Z`,
        customerData: { fullName: 'CLIENTE E2E INSUCESSO', phone: '41966664444' },
        shipping: {
          deliveryMethod: 'delivery',
          scheduling: { date: todayStr, startTime: '09:00', endTime: '12:00' },
          deliveryAddress: { street: 'Rua A', number: '1', neighborhood: 'Centro', city: 'Curitiba' },
        },
        items: [{ id: 'item-1', name: 'Cadeira', quantity: 1, unitPrice: 300 }],
      },
    };

    const dialogMessages: string[] = [];
    page.on('dialog', async (dialog) => {
      dialogMessages.push(dialog.message());
      await dialog.accept();
    });
    await page.route('**/rest/v1/orders*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([serverOrderState]),
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.goto(START_URL);
    const cronogramaTab = page.getByText('Cronograma', { exact: true }).first();
    await expect(cronogramaTab).toBeVisible({ timeout: 60000 });
    await cronogramaTab.click();
    await page.getByText('FLUXO OPERACIONAL').first().click();
    await expect(page.getByText(/Pedido #900404 • Chegada no Local/i)).toBeVisible({
      timeout: 10000,
    });

    const modalTitle = page.getByText('Não foi possível realizar a entrega');
    const notesInput = page.getByPlaceholder('Explique o que aconteceu no local...');

    // Abre, clica no campo de texto e digita: o modal permanece aberto
    await page.getByText('Não foi possível entregar').click();
    await expect(modalTitle).toBeVisible();
    await notesInput.click();
    await page.keyboard.type('Cliente não estava', { delay: 5 });
    await expect(modalTitle).toBeVisible();
    await expect(notesInput).toHaveValue('Cliente não estava');

    // Sem foto, o motivo "Ninguém Atendeu no Local" bloqueia o envio e mantém o modal aberto
    await page.getByText('Ninguém Atendeu no Local').click();
    await page.getByText('CONFIRMAR NÃO FOI POSSÍVEL ENTREGAR').click();
    await expect(modalTitle).toBeVisible();
    await expect.poll(() => dialogMessages.join(' | '), { timeout: 5000 }).toMatch(
      /Anexe pelo menos uma imagem/i
    );

    // Clique no backdrop (fora do card) fecha o modal
    await page.getByLabel('Fechar modal ao clicar fora').click({ position: { x: 5, y: 5 } });
    await expect(modalTitle).toBeHidden({ timeout: 5000 });

    // Reabre: botão X fecha também
    await page.getByText('Não foi possível entregar').click();
    await expect(modalTitle).toBeVisible();
    await page.getByRole('button', { name: 'Fechar modal' }).click();
    await expect(modalTitle).toBeHidden({ timeout: 5000 });
  });
}
