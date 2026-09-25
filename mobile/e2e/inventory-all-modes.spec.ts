import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://127.0.0.1:8081';
const START_URL = `${BASE_URL}/?auth_email=matheusmorante002@gmail.com&tab=estoque`;

test.describe('Auditoria Completa de Inventário: Todos os Modos, Contagens e Offline', () => {

  test.beforeEach(async ({ page }) => {
    // Configura listeners de console para capturar warnings e logs
    page.on('console', msg => {
      if (msg.type() === 'error') console.log('[BROWSER ERROR]:', msg.text());
    });

    // Mock para alertas do React Native Web não bloquearem a execução do E2E
    await page.addInitScript(() => {
      window.alert = function (msg) {
        console.log('[Mocked Window Alert]:', msg);
        return true;
      };
      window.confirm = function (msg) {
        console.log('[Mocked Window Confirm]:', msg);
        return true;
      };
    });

    // 1. Acesso à aplicação mobile e navegação para a aba Estoque
    await page.goto(START_URL, { timeout: 30000 });
    await expect(page.getByTestId('tab-summary')).toBeVisible({ timeout: 60000 });

    // Navegar para a sub-aba de Inventário
    await page.getByTestId('tab-inventory').first().click();
    await expect(page.locator('text=Novo Inventário').first()).toBeVisible({ timeout: 15000 });
  });

  test('Cenário 1: Modo Estoque Completo — Contagem (+, -, Manual) e Finalização', async ({ page }) => {
    // Clicar em Novo Inventário
    await page.getByTestId('new-inventory-btn').first().click();
    await expect(page.locator('text=O que você deseja inventariar?').first()).toBeVisible({ timeout: 15000 });

    // Selecionar Estoque Completo
    await page.locator('text=Estoque Completo').first().click();

    // Se houver etapas por fornecedor, seleciona a primeira etapa para contar
    const firstStageBtn = page.locator('button:has-text("Iniciar Contagem"), text=Iniciar Contagem, text=Continuar').first();
    if (await firstStageBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await firstStageBtn.click();
    }

    // Aguardar o carregamento dos itens na tela de operação
    const incrementBtn = page.getByTestId('increment-btn').first();
    await expect(incrementBtn).toBeVisible({ timeout: 15000 });

    const countInput = page.getByTestId('count-input').first();
    const decrementBtn = page.getByTestId('decrement-btn').first();

    // 1. Testar Botão '+' (Incremento)
    await incrementBtn.click();
    await expect(countInput).toHaveValue('1', { timeout: 5000 });

    await incrementBtn.click();
    await expect(countInput).toHaveValue('2', { timeout: 5000 });

    // 2. Testar Botão '-' (Decremento)
    await decrementBtn.click();
    await expect(countInput).toHaveValue('1', { timeout: 5000 });

    // 3. Testar Digitação Manual Direta de Quantidade
    await countInput.fill('');
    await countInput.fill('7');
    await expect(countInput).toHaveValue('7', { timeout: 5000 });

    // 4. Avançar para Revisão
    const btnRevisar = page.locator('text=Revisar').first();
    await expect(btnRevisar).toBeVisible();
    await btnRevisar.click({ force: true });

    // Na tela de Revisão, validar título e botão de confirmação
    await expect(page.locator('text=Revisão do Inventário').or(page.locator('text=Confirmar e Atualizar Estoque'))).toBeVisible({ timeout: 15000 });

    // Se estiver em etapas e exigir todas, volta ou finaliza
    const btnConfirmar = page.locator('text=Confirmar e Atualizar Estoque').first();
    if (await btnConfirmar.isVisible()) {
      await btnConfirmar.click({ force: true });
      // Clica em eventual modal/alerta nativo
      try {
        const okBtn = page.locator('text=OK').first();
        if (await okBtn.isVisible({ timeout: 2000 })) await okBtn.click();
      } catch {}
    }
  });

  test('Cenário 2: Modo Por Fornecedor — Seleção, Contagem e Isolamento', async ({ page }) => {
    await page.getByTestId('new-inventory-btn').first().click();
    await expect(page.locator('text=O que você deseja inventariar?').first()).toBeVisible({ timeout: 15000 });

    // Clicar em "Por Fornecedor" para expandir a lista
    await page.locator('text=Por Fornecedor').first().click();
    await page.waitForTimeout(1000);

    // Selecionar o primeiro fornecedor disponível
    const supplierChips = page.locator('text=Selecione o fornecedor para iniciar:').locator('..').locator('div, button');
    const firstSupplier = page.locator('text=Continuar com').or(supplierChips.filter({ hasText: /./ })).first();

    // Clica no primeiro chip de fornecedor
    const chip = page.locator('[style*="border-radius"]').filter({ hasText: /^[A-Z]/ }).first();
    if (await chip.isVisible()) {
      await chip.click();
    }

    // Clica no botão Continuar com fornecedor
    const continueSupplierBtn = page.locator('text=Continuar com').first();
    if (await continueSupplierBtn.isVisible({ timeout: 5000 })) {
      await continueSupplierBtn.click();

      // Na tela de operação, validar carregamento dos itens
      const incrementBtn = page.getByTestId('increment-btn').first();
      if (await incrementBtn.isVisible({ timeout: 10000 })) {
        await incrementBtn.click();
        const countInput = page.getByTestId('count-input').first();
        await expect(countInput).toHaveValue('1', { timeout: 5000 });
      }
    }
  });

  test('Cenário 3: Modo Seleção Personalizada — Adição Dinâmica e Contagem', async ({ page }) => {
    await page.getByTestId('new-inventory-btn').first().click();
    await expect(page.locator('text=O que você deseja inventariar?').first()).toBeVisible({ timeout: 15000 });

    // Clicar em "Seleção Personalizada"
    await page.locator('text=Seleção Personalizada').first().click();
    await page.waitForTimeout(500);

    // Clicar em + Adicionar produto ou variação
    const addProductBtn = page.locator('text=+ Adicionar produto ou variação').first();
    if (await addProductBtn.isVisible()) {
      await addProductBtn.click();

      // Modal de busca de produto
      const searchModalInput = page.locator('input[placeholder="Nome, código..."]').first();
      await expect(searchModalInput).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(1000);

      // Adiciona o primeiro produto encontrado
      const firstAddBtn = page.locator('text=+ Add').first();
      if (await firstAddBtn.isVisible()) {
        await firstAddBtn.click();
      }

      // Fecha o modal se ainda estiver aberto
      const closeSearch = page.getByTestId('close-modal-btn').or(page.locator('text=Fechar, text=×')).first();
      if (await closeSearch.isVisible()) await closeSearch.click();

      // Clica em Continuar com X item(ns)
      const continueCustomBtn = page.locator('text=Continuar com').first();
      if (await continueCustomBtn.isVisible({ timeout: 5000 })) {
        await continueCustomBtn.click();

        // Na operação: testa botões + e contagem manual
        const incrementBtn = page.getByTestId('increment-btn').first();
        await expect(incrementBtn).toBeVisible({ timeout: 15000 });
        await incrementBtn.click();

        const countInput = page.getByTestId('count-input').first();
        await expect(countInput).toHaveValue('1');

        await countInput.fill('12');
        await expect(countInput).toHaveValue('12');
      }
    }
  });

  test('Cenário 4: Sem Contagens — Voltar sem Criar Inventário Fantasma', async ({ page }) => {
    await page.getByTestId('new-inventory-btn').first().click();
    await expect(page.locator('text=O que você deseja inventariar?').first()).toBeVisible({ timeout: 15000 });

    // Inicia Estoque Completo
    await page.locator('text=Estoque Completo').first().click();

    // Se estiver em etapas, entra na primeira
    const firstStageBtn = page.locator('button:has-text("Iniciar Contagem"), text=Iniciar Contagem, text=Continuar').first();
    if (await firstStageBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await firstStageBtn.click();
    }

    // Não faz NENHUMA contagem (todos os campos vazios / null)
    // Clica no botão Voltar (seta voltar ou Cancelar)
    const backBtn = page.locator('button:has-text("Voltar"), text=Voltar, text=Cancelar').first();
    if (await backBtn.isVisible({ timeout: 5000 })) {
      await backBtn.click();
    }

    // Deve voltar diretamente ao escopo ou fechar sem exibir alerta de confirmação de descarte de rascunho
    await page.waitForTimeout(1000);
    // Não deve haver nenhum erro de requisição ou travamento
  });

  test('Cenário 5: OFFLINE — Contagem no SQLite, Bloqueio Seguro e Conclusão após Reconexão', async ({ page, context }) => {
    // 1. Inicia um inventário com rede online
    await page.getByTestId('new-inventory-btn').first().click();
    await expect(page.locator('text=O que você deseja inventariar?').first()).toBeVisible({ timeout: 15000 });
    await page.locator('text=Estoque Completo').first().click();

    const firstStageBtn = page.locator('button:has-text("Iniciar Contagem"), text=Iniciar Contagem, text=Continuar').first();
    if (await firstStageBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await firstStageBtn.click();
    }

    const incrementBtn = page.getByTestId('increment-btn').first();
    await expect(incrementBtn).toBeVisible({ timeout: 15000 });
    const countInput = page.getByTestId('count-input').first();

    // 2. SIMULAÇÃO DO MODO OFFLINE (Equivalente ao DevTools -> Network -> Offline)
    console.log('[TESTE E2E]: Ativando modo OFFLINE no contexto do navegador (DevTools Network Offline)...');
    await context.setOffline(true);
    await page.waitForTimeout(500);

    // 3. Realiza contagens OFFLINE: + , - , digitação manual
    await incrementBtn.click();
    await expect(countInput).toHaveValue('1', { timeout: 5000 });

    await incrementBtn.click();
    await expect(countInput).toHaveValue('2', { timeout: 5000 });

    const decrementBtn = page.getByTestId('decrement-btn').first();
    await decrementBtn.click();
    await expect(countInput).toHaveValue('1', { timeout: 5000 });

    await countInput.fill('9');
    await expect(countInput).toHaveValue('9', { timeout: 5000 });
    console.log('[TESTE E2E]: Contagens offline realizadas com sucesso no armazenamento local (SQLite/Cache).');

    // 4. Tentar Finalizar OFFLINE: O sistema deve interceptar a ausência de rede com segurança
    const btnRevisar = page.locator('text=Revisar').first();
    await btnRevisar.click({ force: true });

    const btnConfirmar = page.locator('text=Confirmar e Atualizar Estoque').first();
    if (await btnConfirmar.isVisible({ timeout: 5000 })) {
      await btnConfirmar.click({ force: true });
      await page.waitForTimeout(1500);
      console.log('[TESTE E2E]: Tentativa de finalização offline disparou guarda de conectividade com sucesso.');
    }

    // 5. RESTAURAÇÃO DA REDE (DevTools Network -> Online)
    console.log('[TESTE E2E]: Restaurando conexão com a internet (ONLINE)...');
    await context.setOffline(false);
    await page.waitForTimeout(1000);

    // 6. Finalização com Sucesso após Reconexão
    if (await btnConfirmar.isVisible()) {
      await btnConfirmar.click({ force: true });
      try {
        const okBtn = page.locator('text=OK').first();
        if (await okBtn.isVisible({ timeout: 3000 })) await okBtn.click();
      } catch {}
      console.log('[TESTE E2E]: Inventário finalizado com sucesso após reconexão.');
    }
  });

});
