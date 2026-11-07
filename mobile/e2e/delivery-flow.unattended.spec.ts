import { test, expect } from '@playwright/test';
import { START_URL } from './deliveryFlowTestConstants';

test.describe('Fluxo de Entrega Completo (Online e Offline) — E2E Browser UI', () => {
  test('5. Etapa de Preparação: botão vermelho "Não será possível entregar" abaixo do checklist com motivos específicos e campo em "Outro motivo"', async ({
    page,
  }) => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const orderId = 'e2e-delivery-prep-unattended-005';
    let serverOrderState: Record<string, any> = {
      id: orderId,
      order_number: '900505',
      order_index: '900505',
      status: 'scheduled',
      order_type: 'sale',
      customer_name: 'CLIENTE E2E PREPARO INSUCESSO',
      total_amount: 500,
      delivery_status: null,
      created_at: `${todayStr}T09:30:00.000Z`,
      updated_at: `${todayStr}T09:30:00.000Z`,
      order_data: {
        id: orderId,
        orderIndex: '900505',
        status: 'scheduled',
        orderType: 'sale',
        customerData: { fullName: 'CLIENTE E2E PREPARO INSUCESSO', phone: '41955554444' },
        shipping: {
          deliveryMethod: 'delivery',
          scheduling: { date: todayStr, startTime: '09:00', endTime: '12:00' },
          deliveryAddress: { street: 'Rua B', number: '2', neighborhood: 'Centro', city: 'Curitiba' },
        },
        items: [{ id: 'item-1', name: 'Estante', quantity: 1, unitPrice: 500 }],
      },
    };

    const dialogMessages: string[] = [];
    page.on('dialog', async (dialog) => {
      dialogMessages.push(dialog.message());
      await dialog.accept();
    });
    await page.route('**/rest/v1/orders*', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([serverOrderState]),
        });
        return;
      }
      const body = route.request().postDataJSON() || {};
      serverOrderState = {
        ...serverOrderState,
        ...body,
        order_data: body.order_data || serverOrderState.order_data,
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([serverOrderState]),
      });
    });
    await page.route('**/rest/v1/rpc/sync_entity_operation*', async (route) => {
      const args = route.request().postDataJSON() || {};
      const patch = args.p_payload?.order_data_patch || {};
      const mergedData = { ...serverOrderState.order_data, ...patch };
      serverOrderState = {
        ...serverOrderState,
        delivery_status: mergedData.deliveryStatus ?? null,
        order_data: mergedData,
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, server_version: 2, server_state: serverOrderState }),
      });
    });

    await page.goto(START_URL);
    const cronogramaTab = page.getByText('Cronograma', { exact: true }).first();
    await expect(cronogramaTab).toBeVisible({ timeout: 60000 });
    await cronogramaTab.click();
    await page.getByText('FLUXO OPERACIONAL').first().click();
    await expect(page.getByText(/Pedido #900505 • Preparar Saída/i)).toBeVisible({
      timeout: 10000,
    });

    // O botão vermelho fica no fluxo de preparação com o nome "Não será possível entregar"
    const checklistItem = page.getByText('Carregado: Estante', { exact: true });
    await checklistItem.scrollIntoViewIfNeeded();
    await expect(checklistItem).toBeVisible();

    const unattendedBtn = page.getByRole('button', { name: 'Não será possível entregar' });
    await unattendedBtn.scrollIntoViewIfNeeded();
    await expect(unattendedBtn).toBeVisible();

    await unattendedBtn.click();
    const modalTitle = page.getByRole('dialog').getByText('Não será possível entregar', { exact: true });
    await expect(modalTitle).toBeVisible();

    // Valida que os 4 motivos da preparação estão visíveis
    await expect(page.getByText('Cliente não poderá receber no momento')).toBeVisible();
    await expect(page.getByText('Cliente quer Cancelar')).toBeVisible();
    await expect(page.getByText('Problema no veículo')).toBeVisible();
    await expect(page.getByText('Outro motivo')).toBeVisible();

    // Selecionando "Problema no veículo" -> o campo de texto NÃO é exibido
    await page.getByText('Problema no veículo').click();
    const notesInput = page.getByPlaceholder('Explique o motivo...');
    await expect(notesInput).toBeHidden();

    // Selecionando "Outro motivo" -> o campo de texto é exibido para preenchimento
    await page.getByText('Outro motivo').click();
    await expect(notesInput).toBeVisible();

    // Tentativa de confirmar sem preencher o motivo deve ser bloqueada com alerta
    await page.getByText('CONFIRMAR NÃO SERÁ POSSÍVEL ENTREGAR').click();
    await expect(modalTitle).toBeVisible();
    await expect.poll(() => dialogMessages.join(' | '), { timeout: 5000 }).toMatch(
      /Descreva o motivo/i
    );

    // Preenche o motivo digitando no campo
    await notesInput.click();
    await page.keyboard.type('Pneu furou durante o carregamento no depósito.', { delay: 5 });
    await expect(modalTitle).toBeVisible();

    await page.getByText('CONFIRMAR NÃO SERÁ POSSÍVEL ENTREGAR').click();

    await expect
      .poll(() => serverOrderState.order_data?.deliveryStatus, { timeout: 15000 })
      .toBe('unattended');
    expect(serverOrderState.order_data?.unattendedReason).toBe('Outro motivo');
    expect(serverOrderState.order_data?.unattendedNotes).toBe(
      'Pneu furou durante o carregamento no depósito.'
    );
  });
});
