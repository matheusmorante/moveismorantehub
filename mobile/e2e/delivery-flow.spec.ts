import { test, expect, Page } from '@playwright/test';

const START_URL = '/?auth_email=matheusmorante002@gmail.com&tab=entregas';

/**
 * Executa o gesto físico de deslize no componente SlideHoldToStart no navegador.
 */
async function slideActionButton(
  page: Page,
  labelSubstring: string,
  direction: 'left' | 'right'
) {
  const sliderTrack = page.locator(`[aria-label*="${labelSubstring}"]`).first();
  await expect(sliderTrack).toBeVisible({ timeout: 10000 });
  await sliderTrack.scrollIntoViewIfNeeded();

  const box = await sliderTrack.boundingBox();
  if (!box) {
    throw new Error(`BoundingBox não encontrada para o slider: ${labelSubstring}`);
  }

  const centerY = box.y + box.height / 2;
  const startX = direction === 'left' ? box.x + box.width - 28 : box.x + 28;
  const endX = direction === 'left' ? box.x + 8 : box.x + box.width - 8;

  await page.mouse.move(startX, centerY);
  await page.mouse.down();
  await page.mouse.move((startX + endX) / 2, centerY, { steps: 8 });
  await page.mouse.move(endX, centerY, { steps: 12 });
  await page.mouse.up();
}

test.describe('Fluxo de Entrega Completo (Online e Offline) — E2E Browser UI', () => {
  test('1. Executa todas as 4 etapas da entrega Online, valida todos os retrocessos (2->1, 3->2, 4->3), pagamentos e finalização', async ({
    page,
  }) => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const orderId = 'e2e-delivery-online-001';

    let serverOrderState: Record<string, any> = {
      id: orderId,
      order_number: '900101',
      order_index: '900101',
      status: 'scheduled',
      order_type: 'sale',
      customer_name: 'CLIENTE E2E FLUXO ONLINE',
      total_amount: 1250,
      delivery_status: null,
      delivery_started_at: null,
      delivery_arrived_at: null,
      delivery_finished_at: null,
      created_at: `${todayStr}T08:00:00.000Z`,
      updated_at: `${todayStr}T08:00:00.000Z`,
      order_data: {
        id: orderId,
        orderIndex: '900101',
        status: 'scheduled',
        orderType: 'sale',
        customerData: {
          fullName: 'CLIENTE E2E FLUXO ONLINE',
          phone: '41999991111',
          fullAddress: {
            street: 'Rua XV de Novembro',
            number: '500',
            neighborhood: 'Centro',
            city: 'Curitiba',
          },
        },
        shipping: {
          deliveryMethod: 'delivery',
          bringCardMachine: true,
          callBeforeDelivery: true,
          distance: 8.5,
          durationMinutes: 20,
          scheduling: {
            date: todayStr,
            startTime: '08:00',
            endTime: '12:00',
          },
          deliveryAddress: {
            street: 'Rua XV de Novembro',
            number: '500',
            neighborhood: 'Centro',
            city: 'Curitiba',
          },
        },
        items: [
          {
            id: 'item-sofa-1',
            name: 'Sofá Retrátil 3 Lugares',
            quantity: 1,
            unitPrice: 1250,
          },
        ],
        paymentsSummary: {
          totalOrderValue: 1250,
          totalPaid: 0,
          amountRemaining: 1250,
        },
        payments: [
          {
            method: 'Pix',
            amount: 1250,
            status: 'Pendente',
            fee: 0,
            feeType: 'fixed',
          },
        ],
      },
    };

    const patchHistory: any[] = [];

    // Auto-aceitar window.alert / window.confirm disparados no navegador (ex: "🎉 Entrega Finalizada!")
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Interceptar consultas e mutações de orders para isolar o teste com segurança total
    await page.route('**/rest/v1/orders*', async (route) => {
      const method = route.request().method();
      const url = route.request().url();

      if (method === 'GET') {
        if (url.includes(`id=eq.${orderId}`)) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(serverOrderState),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([serverOrderState]),
        });
        return;
      }

      if (method === 'PATCH' || method === 'POST') {
        const body = route.request().postDataJSON() || {};
        patchHistory.push(body);
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
        return;
      }

      await route.continue();
    });

    await page.route('**/rest/v1/rpc/sync_entity_operation*', async (route) => {
      const args = route.request().postDataJSON() || {};
      const patch = args.p_payload?.order_data_patch || {};
      const mergedData = {
        ...serverOrderState.order_data,
        ...patch,
      };
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) delete mergedData[k];
      }
      serverOrderState = {
        ...serverOrderState,
        status: patch.status || serverOrderState.status,
        delivery_status: mergedData.deliveryStatus ?? null,
        order_data: mergedData,
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          server_version: 2,
          server_state: serverOrderState,
        }),
      });
    });

    await page.goto(START_URL);

    // 1. Verificar aba Cronograma e card da entrega
    const cronogramaTab = page.getByText('Cronograma', { exact: true }).first();
    await expect(cronogramaTab).toBeVisible({ timeout: 60000 });
    await cronogramaTab.click();

    await expect(page.getByText('CLIENTE E2E FLUXO ONLINE').first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText('VER DETALHES').first()).toBeVisible();
    await expect(page.getByText('FLUXO DE ENTREGA').first()).toBeVisible();

    // 2. Testar botão "VER DETALHES" e depois iniciar fluxo pelo botão do modal
    await page.getByText('VER DETALHES').first().click();
    await expect(page.getByText('Iniciar fluxo de entrega').first()).toBeVisible({
      timeout: 10000,
    });
    await page.getByText('Iniciar fluxo de entrega').first().click();

    // 3. ETAPA 1: Preparar Saída
    await expect(page.getByText(/Pedido #900101 • Preparar Saída/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByText('Confira todos os itens do checklist acima para iniciar a rota')
    ).toBeVisible();

    const startSlider = page.locator('[aria-label*="Deslize para INICIAR ROTA"]').first();
    await expect(startSlider).toHaveAttribute('aria-disabled', 'true');

    // Marcar os 2 primeiros itens: o slider ainda deve permanecer bloqueado até marcar o 3º
    await page.getByText('Carregado: Sofá Retrátil 3 Lugares', { exact: true }).click();
    await page.getByText('Carregado: Máquina de cartão', { exact: true }).click();
    await expect(startSlider).toHaveAttribute('aria-disabled', 'true');

    // Marcar o 3º item: libera o slider
    await page.getByText('Ligar antes de sair', { exact: true }).click();
    await expect(startSlider).not.toHaveAttribute('aria-disabled', 'true');

    // Mensagem de bloqueio deve sumir
    await expect(
      page.getByText('Confira todos os itens do checklist acima para iniciar a rota')
    ).toBeHidden();

    // Deslizar para Iniciar Rota (Etapa 1 -> Etapa 2)
    await slideActionButton(page, 'Deslize para INICIAR ROTA', 'left');

    // 4. ETAPA 2: Em Rota
    await expect(page.getByText(/Pedido #900101 • Em Rota/i)).toBeVisible({ timeout: 10000 });
    expect(serverOrderState.delivery_status).toBe('in_progress');

    // Testar Retrocesso Etapa 2 -> Etapa 1 ("Deslize para VOLTAR AO PREPARO »")
    await slideActionButton(page, 'Deslize para VOLTAR AO PREPARO', 'right');
    await expect(page.getByText(/Pedido #900101 • Preparar Saída/i)).toBeVisible({
      timeout: 10000,
    });
    expect(serverOrderState.delivery_status).toBeNull();

    // Avançar novamente Etapa 1 -> Etapa 2
    await slideActionButton(page, 'Deslize para INICIAR ROTA', 'left');
    await expect(page.getByText(/Pedido #900101 • Em Rota/i)).toBeVisible({ timeout: 10000 });

    // Avançar Etapa 2 -> Etapa 3 ("« Deslize para CHEGUEI NO DESTINO")
    await slideActionButton(page, 'Deslize para CHEGUEI NO DESTINO', 'left');

    // 5. ETAPA 3: Chegada no Local
    await expect(page.getByText(/Pedido #900101 • Chegada no Local/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText('Não foi possível entregar')).toBeVisible();
    expect(serverOrderState.delivery_status).toBe('arrived');

    // Testar Retrocesso Etapa 3 -> Etapa 2 ("Deslize para VOLTAR PARA EM ROTA »")
    await slideActionButton(page, 'Deslize para VOLTAR PARA EM ROTA', 'right');
    await expect(page.getByText(/Pedido #900101 • Em Rota/i)).toBeVisible({ timeout: 10000 });
    expect(serverOrderState.delivery_status).toBe('in_progress');

    // Avançar novamente Etapa 2 -> Etapa 3
    await slideActionButton(page, 'Deslize para CHEGUEI NO DESTINO', 'left');
    await expect(page.getByText(/Pedido #900101 • Chegada no Local/i)).toBeVisible({
      timeout: 10000,
    });

    // Avançar Etapa 3 -> Etapa 4 ("« Deslize para INICIAR ATENDIMENTO")
    await slideActionButton(page, 'Deslize para INICIAR ATENDIMENTO', 'left');

    // 6. ETAPA 4: Em Atendimento
    await expect(page.getByText(/Pedido #900101 • Em Atendimento/i)).toBeVisible({
      timeout: 10000,
    });
    expect(serverOrderState.delivery_status).toBe('in_service');

    // Verificar bloqueio de finalização enquanto pagamento estiver Pendente
    await expect(
      page.getByText(/Confirme todos os pagamentos acima para liberar a finalização/i)
    ).toBeVisible();
    const finishSlider = page.locator('[aria-label*="Deslize para FINALIZAR"]').first();
    await expect(finishSlider).toHaveAttribute('aria-disabled', 'true');

    // Testar Retrocesso Etapa 4 -> Etapa 3 ("Deslize para VOLTAR À CHEGADA »")
    await slideActionButton(page, 'Deslize para VOLTAR À CHEGADA', 'right');
    await expect(page.getByText(/Pedido #900101 • Chegada no Local/i)).toBeVisible({
      timeout: 10000,
    });
    expect(serverOrderState.delivery_status).toBe('arrived');

    // Avançar novamente Etapa 3 -> Etapa 4
    await slideActionButton(page, 'Deslize para INICIAR ATENDIMENTO', 'left');
    await expect(page.getByText(/Pedido #900101 • Em Atendimento/i)).toBeVisible({
      timeout: 10000,
    });

    // Testar troca de forma de pagamento inline e confirmação como "Pago"
    await page.getByLabel(/Forma de pagamento Pix/i).click();
    await expect(page.getByText('Crédito', { exact: true })).toBeVisible();
    await page.getByText('Crédito', { exact: true }).click();
    await expect(page.getByLabel(/Forma de pagamento Crédito/i)).toBeVisible();

    // Confirmar pagamento clicando em "Pendente - no ato da entrega"
    await page.getByText('Pendente - no ato da entrega').click();
    await expect(page.getByText('Pago', { exact: true })).toBeVisible();

    // Alerta de pagamento pendente deve sumir e slider ficar habilitado
    await expect(
      page.getByText(/Confirme todos os pagamentos acima para liberar a finalização/i)
    ).toBeHidden();
    await expect(finishSlider).not.toHaveAttribute('aria-disabled', 'true');

    // Deslizar para Finalizar Entrega (Etapa 4 -> Concluído)
    await slideActionButton(page, 'Deslize para FINALIZAR', 'left');

    // Verificar que o estado final foi persistido como fulfilled / completed
    await expect
      .poll(() => serverOrderState.status, { timeout: 10000 })
      .toBe('fulfilled');
    expect(serverOrderState.delivery_status).toBe('completed');
    expect(serverOrderState.order_data.payments[0].method).toBe('Crédito');
    expect(serverOrderState.order_data.payments[0].status).toBe('Pago');
  });

  test('2. Executa o Fluxo Offline (sem rede), persiste ao fechar e reabrir o pedido, registra Insucesso e sincroniza ao reconectar', async ({
    page,
  }) => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const orderId = 'e2e-delivery-offline-002';

    let isNetworkOffline = false;
    let serverOrderState: Record<string, any> = {
      id: orderId,
      order_number: '900202',
      order_index: '900202',
      status: 'scheduled',
      order_type: 'sale',
      customer_name: 'CLIENTE E2E MODO OFFLINE',
      total_amount: 1780,
      delivery_status: null,
      created_at: `${todayStr}T09:00:00.000Z`,
      updated_at: `${todayStr}T09:00:00.000Z`,
      order_data: {
        id: orderId,
        orderIndex: '900202',
        status: 'scheduled',
        orderType: 'sale',
        customerData: {
          fullName: 'CLIENTE E2E MODO OFFLINE',
          phone: '41988882222',
          fullAddress: {
            street: 'Av. Sete de Setembro',
            number: '1200',
            neighborhood: 'Batel',
            city: 'Curitiba',
          },
        },
        shipping: {
          deliveryMethod: 'delivery',
          scheduling: {
            date: todayStr,
            startTime: '13:00',
            endTime: '18:00',
          },
          deliveryAddress: {
            street: 'Av. Sete de Setembro',
            number: '1200',
            neighborhood: 'Batel',
            city: 'Curitiba',
          },
        },
        items: [
          {
            id: 'item-mesa-1',
            name: 'Mesa de Jantar 6 Cadeiras',
            quantity: 2,
            unitPrice: 890,
          },
        ],
        paymentsSummary: {
          totalOrderValue: 1780,
        },
      },
    };

    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    await page.route('**/rest/v1/orders*', async (route) => {
      if (isNetworkOffline) {
        await route.abort('internetdisconnected');
        return;
      }

      const method = route.request().method();
      const url = route.request().url();

      if (method === 'GET') {
        if (url.includes(`id=eq.${orderId}`)) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(serverOrderState),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([serverOrderState]),
        });
        return;
      }

      if (method === 'PATCH' || method === 'POST') {
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
        return;
      }

      await route.continue();
    });

    await page.route('**/rest/v1/rpc/sync_entity_operation*', async (route) => {
      if (isNetworkOffline) {
        await route.abort('internetdisconnected');
        return;
      }
      const args = route.request().postDataJSON() || {};
      const patch = args.p_payload?.order_data_patch || {};
      const mergedData = {
        ...serverOrderState.order_data,
        ...patch,
      };
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) delete mergedData[k];
      }
      serverOrderState = {
        ...serverOrderState,
        status: patch.status || serverOrderState.status,
        delivery_status: mergedData.deliveryStatus ?? null,
        order_data: mergedData,
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          server_version: 2,
          server_state: serverOrderState,
        }),
      });
    });

    await page.route('**/api/upload*', async (route) => {
      if (isNetworkOffline) {
        await route.abort('internetdisconnected');
        return;
      }
      await route.continue();
    });

    await page.goto(START_URL);

    // Ir para aba Cronograma
    const cronogramaTab = page.getByText('Cronograma', { exact: true }).first();
    await expect(cronogramaTab).toBeVisible({ timeout: 60000 });
    await cronogramaTab.click();

    await expect(page.getByText('CLIENTE E2E MODO OFFLINE').first()).toBeVisible({
      timeout: 15000,
    });

    // Ativar MODO OFFLINE (cortar rede do Supabase e avisar navegador)
    isNetworkOffline = true;
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });

    // Clicar diretamente no botão "FLUXO DE ENTREGA" do card no Cronograma
    await page.getByText('FLUXO DE ENTREGA').first().click();

    // Deve abrir direto na Etapa 1: Preparar Saída mesmo sem rede!
    await expect(page.getByText(/Pedido #900202 • Preparar Saída/i)).toBeVisible({
      timeout: 10000,
    });

    // Marcar checklist (2x Mesa de Jantar 6 Cadeiras) e iniciar rota OFFLINE
    await page.getByText('Carregado: 2x Mesa de Jantar 6 Cadeiras', { exact: true }).click();
    await slideActionButton(page, 'Deslize para INICIAR ROTA', 'left');

    // Deve avançar para Etapa 2 (Em Rota) OFFLINE, enquanto o servidor ainda tem delivery_status = null
    await expect(page.getByText(/Pedido #900202 • Em Rota/i)).toBeVisible({ timeout: 10000 });
    expect(serverOrderState.delivery_status).toBeNull();

    // Avançar para Etapa 3 (Chegada no Local) OFFLINE
    await slideActionButton(page, 'Deslize para CHEGUEI NO DESTINO', 'left');
    await expect(page.getByText(/Pedido #900202 • Chegada no Local/i)).toBeVisible({
      timeout: 10000,
    });

    // Fechar o modal ainda OFFLINE ("Voltar") e conferir se a lista reflete "NO LOCAL" e reabre na Etapa 3
    await page.getByRole('button', { name: 'Voltar' }).first().click();
    await expect(page.getByText('NO LOCAL').first()).toBeVisible({ timeout: 10000 });

    await page.getByText('FLUXO DE ENTREGA').first().click();
    await expect(page.getByText(/Pedido #900202 • Chegada no Local/i)).toBeVisible({
      timeout: 10000,
    });

    // Registrar "Não foi possível entregar" OFFLINE na Etapa 3
    await page.getByText('Não foi possível entregar').click();
    await expect(
      page.getByText('Não foi possível realizar a entrega')
    ).toBeVisible({ timeout: 5000 });

    await page.getByText('Ninguém Atendeu no Local').click();

    // REGRESSÃO: tocar dentro do card (título, rótulos, campo de texto) NÃO pode fechar o modal.
    const modalTitle = page.getByText('Não foi possível realizar a entrega');
    await modalTitle.click();
    await expect(modalTitle).toBeVisible();
    await page.getByText('Detalhes / Observações:').click();
    await expect(modalTitle).toBeVisible();

    // Clique real + digitação pelo teclado (e não apenas fill(), que não dispara o clique).
    const notesInput = page.getByPlaceholder('Explique o que aconteceu no local...');
    await notesInput.click();
    await expect(modalTitle).toBeVisible();
    await page.keyboard.type('Tocamos o interfone 3 vezes sem retorno.', { delay: 5 });
    await expect(notesInput).toHaveValue('Tocamos o interfone 3 vezes sem retorno.');
    await expect(modalTitle).toBeVisible();

    // Clicar novamente no campo já preenchido e editar também mantém o modal aberto.
    await notesInput.click();
    await page.keyboard.press('End');
    await expect(modalTitle).toBeVisible();
    await expect(notesInput).toHaveValue('Tocamos o interfone 3 vezes sem retorno.');

    // Anexar foto de comprovação enquanto OFFLINE (valida fallback de URI local/data sem travar por falta de rede)
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText('Adicionar imagem (0/5)').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'comprovante-portao.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      ),
    });
    await expect(page.getByText('Adicionar imagem (1/5)')).toBeVisible({ timeout: 5000 });

    await page.getByText('CONFIRMAR NÃO FOI POSSÍVEL ENTREGAR').click();

    // Modal deve fechar após o registro offline; o servidor remoto ainda não recebeu porque está offline
    await expect(page.getByText('CLIENTE E2E MODO OFFLINE').first()).toBeVisible({
      timeout: 10000,
    });
    expect(serverOrderState.delivery_status).toBeNull();

    // Restaurar conexão de rede e disparar evento 'online' no navegador para acionar a fila de sincronização
    isNetworkOffline = false;
    await page.evaluate(() => {
      window.dispatchEvent(new Event('online'));
    });

    // O offlineSyncManager deve sincronizar toda a fila pendente até o estado final 'unattended'
    await expect
      .poll(() => serverOrderState.order_data?.deliveryStatus, { timeout: 15000 })
      .toBe('unattended');
    expect(serverOrderState.order_data?.unattendedReason).toBe('Ninguém Atendeu no Local');
    expect(serverOrderState.order_data?.unattendedNotes).toBe(
      'Tocamos o interfone 3 vezes sem retorno.'
    );
  });

  test('3. Valida Cancelamento da Entrega (CancelDeliveryConfirmModal) e abertura pelo Mapa / BottomSheet', async ({
    page,
  }) => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const orderId = 'e2e-delivery-cancel-003';

    let serverOrderState: Record<string, any> = {
      id: orderId,
      order_number: '900303',
      order_index: '900303',
      status: 'in_progress',
      order_type: 'sale',
      customer_name: 'CLIENTE E2E CANCELAMENTO',
      total_amount: 640,
      delivery_status: 'in_progress',
      delivery_started_at: `${todayStr}T10:00:00.000Z`,
      created_at: `${todayStr}T09:30:00.000Z`,
      updated_at: `${todayStr}T10:00:00.000Z`,
      order_data: {
        id: orderId,
        orderIndex: '900303',
        status: 'in_progress',
        orderType: 'sale',
        deliveryStatus: 'in_progress',
        deliveryStartedAt: `${todayStr}T10:00:00.000Z`,
        customerData: {
          fullName: 'CLIENTE E2E CANCELAMENTO',
          phone: '41977773333',
          fullAddress: {
            street: 'Rua Marechal Deodoro',
            number: '300',
            neighborhood: 'Centro',
            city: 'Curitiba',
          },
        },
        shipping: {
          deliveryMethod: 'delivery',
          scheduling: {
            date: todayStr,
            startTime: '09:00',
            endTime: '12:00',
          },
          deliveryAddress: {
            street: 'Rua Marechal Deodoro',
            number: '300',
            neighborhood: 'Centro',
            city: 'Curitiba',
            latitude: -25.4284,
            longitude: -49.2733,
          },
        },
        items: [
          {
            id: 'item-poltrona-1',
            name: 'Poltrona Decorativa',
            quantity: 1,
            unitPrice: 640,
          },
        ],
      },
    };

    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    await page.route('**/rest/v1/orders*', async (route) => {
      const method = route.request().method();
      const url = route.request().url();

      if (method === 'GET') {
        if (url.includes(`id=eq.${orderId}`)) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(serverOrderState),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([serverOrderState]),
        });
        return;
      }

      if (method === 'PATCH' || method === 'POST') {
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
        return;
      }

      await route.continue();
    });

    await page.route('**/rest/v1/rpc/sync_entity_operation*', async (route) => {
      const args = route.request().postDataJSON() || {};
      const patch = args.p_payload?.order_data_patch || {};
      const mergedData = {
        ...serverOrderState.order_data,
        ...patch,
      };
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) delete mergedData[k];
      }
      serverOrderState = {
        ...serverOrderState,
        status: patch.status || serverOrderState.status,
        delivery_status: mergedData.deliveryStatus ?? null,
        order_data: mergedData,
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          server_version: 2,
          server_state: serverOrderState,
        }),
      });
    });

    await page.goto(START_URL);

    // 1. Abrir aba Mapa no Hub de Operações, selecionar o marcador e clicar em "CONTINUAR ETAPAS DA ENTREGA" no BottomSheet
    const mapaTab = page.getByText('Mapa', { exact: true }).first();
    await expect(mapaTab).toBeVisible({ timeout: 60000 });
    await mapaTab.click();

    await expect(page.locator('iframe').first()).toBeVisible({ timeout: 10000 });
    await page.evaluate((id) => {
      window.postMessage({ type: 'MARKER_CLICK', id }, '*');
    }, orderId);

    await expect(
      page.getByText('CONTINUAR ETAPAS DA ENTREGA').first()
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Detalhes do pedido').first()).toBeVisible();
    await page.getByText('CONTINUAR ETAPAS DA ENTREGA').first().click();

    // Deve abrir direto na Etapa 2 (Em Rota)
    await expect(page.getByText(/Pedido #900303 • Em Rota/i)).toBeVisible({ timeout: 10000 });

    // 2. Clicar em "Cancelar Entrega" e confirmar no modal CancelDeliveryConfirmModal
    await page.getByText('Cancelar Entrega').first().click();
    await expect(page.getByText('Cancelar Fluxo de Entrega')).toBeVisible({ timeout: 5000 });
    await page.getByText('Sim, Cancelar').click();

    // 3. Verificar que o pedido retornou ao status 'scheduled' e limpou delivery_status
    await expect
      .poll(() => serverOrderState.status, { timeout: 10000 })
      .toBe('scheduled');
    expect(serverOrderState.delivery_status).toBeNull();
  });

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
    await page.getByText('FLUXO DE ENTREGA').first().click();
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
    await page.getByLabel('Fechar modal').click({ position: { x: 5, y: 5 } });
    await expect(modalTitle).toBeHidden({ timeout: 5000 });

    // Reabre: botão X fecha também
    await page.getByText('Não foi possível entregar').click();
    await expect(modalTitle).toBeVisible();
    await page.getByLabel('Fechar modal').click({ position: { x: 5, y: 5 } });
    await expect(modalTitle).toBeHidden({ timeout: 5000 });
  });
});
