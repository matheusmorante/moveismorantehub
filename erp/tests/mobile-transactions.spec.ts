/**
 * Testes E2E — Transações Manuais no App Mobile (Expo Web)
 * URL: http://localhost:8081
 *
 * Cobertura Completa:
 *  T1 — Criar transação de SAÍDA manual (com categoria e forma de pagamento)
 *  T2 — Criar transação de ENTRADA manual
 *  T3 — Editar uma transação existente (alterar valor)
 *  T4 — Excluir uma transação (com timer de confirmação de 3s)
 *  T5 — Validação de campos obrigatórios (impede finalizar sem preencher)
 */

import { test, expect, Page } from '@playwright/test';

const APP_FINANCE_URL = 'http://localhost:8081/?auth_email=matheusmorante002@gmail.com&tab=financeiro';

/**
 * Helper para carregar a aba de finanças autenticado
 */
async function navegarParaFinancas(page: Page) {
  await page.goto(APP_FINANCE_URL, { waitUntil: 'domcontentloaded' });
  // Aguarda a aba de finanças ou o botão de nova transação ficar visível
  const fabBtn = page.getByText('Nova Transação');
  await expect(fabBtn).toBeVisible({ timeout: 25000 });
}

/**
 * Helper para abrir o modal de nova transação
 */
async function abrirModalNovaTransacao(page: Page) {
  const fab = page.getByText('Nova Transação').first();
  await fab.click();
  await expect(page.getByText('+ Nova Transação').first()).toBeVisible({ timeout: 8000 });
}

test.describe('📱 Transações Manuais — App Mobile (Expo Web)', () => {

  test.beforeEach(async ({ page }) => {
    await navegarParaFinancas(page);
  });

  // ── T1: Criar transação de SAÍDA manual ────────────────────────────────────
  test('T1 — Criar transação de SAÍDA manual com sucesso', async ({ page }) => {
    await abrirModalNovaTransacao(page);
    await page.screenshot({ path: 'tests/screenshots/t1-modal-aberto.png' });

    // 1. Seleciona o tipo Saída
    const saidaBtn = page.getByText('Saída', { exact: true }).first();
    await saidaBtn.click();
    await page.waitForTimeout(300);

    // 2. Preenche valor
    const valorInput = page.locator('input[placeholder="0,00"]').first();
    await valorInput.click();
    await valorInput.fill('250,00');

    // 3. Preenche descrição
    const descInput = page.locator('input[placeholder*="Abastecimento"]').first();
    await descInput.click();
    const descricao = `E2E Saída ${Date.now()}`;
    await descInput.fill(descricao);

    // 4. Seleciona Categoria
    const catTrigger = page.getByText('Pesquisar ou selecionar categoria...').first();
    if (await catTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      await catTrigger.click();
      await page.waitForTimeout(500);
      // Seleciona uma categoria da lista no modal
      const catItem = page.locator('text=Selecionar Categoria').locator('..').locator('..').getByRole('button').or(page.locator('div[tabindex="0"]')).filter({ hasText: /[a-zA-Z]/ });
      const firstCat = page.locator('div, span, p').filter({ hasText: /Outr|Geral|Manuten|Aluguel|Mater/ }).first();
      if (await firstCat.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstCat.click();
      } else {
        // Clica no primeiro item clicável da lista
        await page.locator('input[placeholder*="Buscar"]').fill('Outros');
        await page.waitForTimeout(300);
        await page.getByText('Outros').first().click().catch(() => {});
      }
    }

    // 5. Seleciona Forma de Pagamento (PIX)
    const pixBtn = page.getByText('PIX', { exact: true }).or(page.getByText('Pix', { exact: true })).first();
    if (await pixBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pixBtn.click();
    }

    await page.screenshot({ path: 'tests/screenshots/t1-antes-salvar.png' });

    // 6. Clica em Finalizar
    const finalizarBtn = page.getByText('Finalizar', { exact: true }).first();
    await finalizarBtn.click();

    // 7. Valida que o modal fechou ou que a transação aparece na lista
    await expect(page.getByText('+ Nova Transação')).toHaveCount(0, { timeout: 10000 });
    await page.screenshot({ path: 'tests/screenshots/t1-apos-salvar.png' });

    console.log(`✅ T1 concluído: Transação criada "${descricao}"`);
  });

  // ── T2: Criar transação de ENTRADA manual ───────────────────────────────────
  test('T2 — Criar transação de ENTRADA manual com sucesso', async ({ page }) => {
    await abrirModalNovaTransacao(page);
    await page.screenshot({ path: 'tests/screenshots/t2-modal-aberto.png' });

    // 1. Seleciona tipo Entrada
    const entradaBtn = page.getByText('Entrada', { exact: true }).first();
    await entradaBtn.click();
    await page.waitForTimeout(300);

    // 2. Preenche valor
    const valorInput = page.locator('input[placeholder="0,00"]').first();
    await valorInput.click();
    await valorInput.fill('1200,00');

    // 3. Preenche descrição
    const descInput = page.locator('input[placeholder*="Abastecimento"]').first();
    await descInput.click();
    const descricao = `E2E Entrada Venda ${Date.now()}`;
    await descInput.fill(descricao);

    // 4. Categoria (se houver seletor)
    const catTrigger = page.getByText('Pesquisar ou selecionar categoria...').first();
    if (await catTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
      await catTrigger.click();
      await page.waitForTimeout(400);
      const firstCat = page.locator('div, span, p').filter({ hasText: /Outra|Venda|Servi/ }).first();
      await firstCat.click().catch(() => {});
    }

    // 5. Forma de Pagamento
    const dinheiroBtn = page.getByText('Dinheiro', { exact: true }).first();
    if (await dinheiroBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dinheiroBtn.click();
    } else {
      const pixBtn = page.getByText('PIX', { exact: true }).first();
      await pixBtn.click().catch(() => {});
    }

    await page.screenshot({ path: 'tests/screenshots/t2-antes-salvar.png' });

    // 6. Finaliza
    const finalizarBtn = page.getByText('Finalizar', { exact: true }).first();
    await finalizarBtn.click();

    // 7. Confirma fechamento
    await expect(page.getByText('+ Nova Transação')).toHaveCount(0, { timeout: 10000 });
    await page.screenshot({ path: 'tests/screenshots/t2-apos-salvar.png' });

    console.log(`✅ T2 concluído: Transação de entrada criada "${descricao}"`);
  });

  // ── T3: Editar transação existente ─────────────────────────────────────────
  test('T3 — Editar transação existente', async ({ page }) => {
    // Primeiro cria uma para garantir que existe uma conhecida para edição
    await abrirModalNovaTransacao(page);
    const saidaBtn = page.getByText('Saída', { exact: true }).first();
    await saidaBtn.click();
    await page.waitForTimeout(200);

    const valorInput = page.locator('input[placeholder="0,00"]').first();
    await valorInput.fill('80,00');

    const descInput = page.locator('input[placeholder*="Abastecimento"]').first();
    const descOriginal = `E2E Para Editar ${Date.now()}`;
    await descInput.fill(descOriginal);

    const catTrigger = page.getByText('Pesquisar ou selecionar categoria...').first();
    if (await catTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
      await catTrigger.click();
      await page.waitForTimeout(300);
      await page.locator('div, span, p').filter({ hasText: /Outr|Geral|Manut/ }).first().click().catch(() => {});
    }

    const pixBtn = page.getByText('PIX', { exact: true }).first();
    await pixBtn.click().catch(() => {});

    await page.getByText('Finalizar', { exact: true }).first().click();
    await expect(page.getByText('+ Nova Transação')).toHaveCount(0, { timeout: 10000 });

    // Agora localiza o item recém-criado
    await page.waitForTimeout(1000);
    const itemCard = page.getByText(descOriginal).first();
    await expect(itemCard).toBeVisible({ timeout: 10000 });

    // Abre o menu de 3 pontinhos do item
    const menuBtn = page.locator(`[aria-label="Ações de ${descOriginal}"]`).or(
      itemCard.locator('..').locator('..').locator('button, [role="button"]')
    ).first();

    if (await menuBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await menuBtn.click();
    } else {
      // Clica direto no card se o menu for contextual
      await itemCard.click();
    }

    await page.screenshot({ path: 'tests/screenshots/t3-menu-acoes.png' });

    // Clica em Editar
    const editarBtn = page.getByText('Editar', { exact: true }).first();
    await expect(editarBtn).toBeVisible({ timeout: 5000 });
    await editarBtn.click();

    // Modal de edição abre
    await expect(page.getByText('Editar Transação').first()).toBeVisible({ timeout: 5000 });

    // Altera o valor
    const valorEditInput = page.locator('input[placeholder="0,00"]').first();
    await valorEditInput.click();
    await valorEditInput.fill('150,00');

    // Clica em Salvar alterações
    const salvarBtn = page.getByText('Salvar alterações', { exact: true }).first();
    await salvarBtn.click();

    await expect(page.getByText('Editar Transação')).toHaveCount(0, { timeout: 10000 });
    await page.screenshot({ path: 'tests/screenshots/t3-apos-editar.png' });

    console.log(`✅ T3 concluído: Transação editada com sucesso`);
  });

  // ── T4: Excluir transação com timer de segurança ───────────────────────────
  test('T4 — Excluir transação com confirmação e timer de segurança', async ({ page }) => {
    // Cria uma transação específica para exclusão
    await abrirModalNovaTransacao(page);
    await page.getByText('Saída', { exact: true }).first().click();
    await page.waitForTimeout(200);

    await page.locator('input[placeholder="0,00"]').first().fill('55,00');
    const descExcluir = `E2E Para Deletar ${Date.now()}`;
    await page.locator('input[placeholder*="Abastecimento"]').first().fill(descExcluir);

    const catTrigger = page.getByText('Pesquisar ou selecionar categoria...').first();
    if (await catTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
      await catTrigger.click();
      await page.waitForTimeout(300);
      await page.locator('div, span, p').filter({ hasText: /Outr|Geral|Manut/ }).first().click().catch(() => {});
    }

    await page.getByText('PIX', { exact: true }).first().click().catch(() => {});
    await page.getByText('Finalizar', { exact: true }).first().click();
    await expect(page.getByText('+ Nova Transação')).toHaveCount(0, { timeout: 10000 });

    // Localiza o card
    await page.waitForTimeout(1000);
    const itemCard = page.getByText(descExcluir).first();
    await expect(itemCard).toBeVisible({ timeout: 10000 });

    // Abre o menu de ações
    const menuBtn = page.locator(`[aria-label="Ações de ${descExcluir}"]`).or(
      itemCard.locator('..').locator('..').locator('button, [role="button"]')
    ).first();

    if (await menuBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await menuBtn.click();
    } else {
      await itemCard.click();
    }

    // Clica no botão Excluir
    const excluirBtn = page.getByText('Excluir', { exact: true }).first();
    await expect(excluirBtn).toBeVisible({ timeout: 5000 });
    await excluirBtn.click();

    // Modal de confirmação com timer de 3 segundos
    await expect(page.getByText('Excluir transação?').first()).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'tests/screenshots/t4-confirmacao-delete.png' });

    // Aguarda o botão "Sim, excluir" ficar habilitado (após a contagem regressiva de 3s)
    const confirmBtn = page.getByText('Sim, excluir', { exact: true });
    await expect(confirmBtn).toBeVisible({ timeout: 6000 });
    await confirmBtn.click();

    // Aguarda modal fechar
    await expect(page.getByText('Excluir transação?')).toHaveCount(0, { timeout: 10000 });
    await page.waitForTimeout(1500);

    // Valida que o item foi removido da tela
    await expect(page.getByText(descExcluir)).toHaveCount(0);
    await page.screenshot({ path: 'tests/screenshots/t4-apos-exclusao.png' });

    console.log(`✅ T4 concluído: Transação excluída com sucesso`);
  });

  // ── T5: Validação de campos obrigatórios ────────────────────────────────────
  test('T5 — Validação de campos obrigatórios impede submissão vazia', async ({ page }) => {
    await abrirModalNovaTransacao(page);

    // Tenta submeter sem selecionar tipo nem preencher campos
    // Se o tipo não foi selecionado, os campos restantes sequer são exibidos (UnselectedTypePrompt)
    const finalizarBtn = page.getByText('Finalizar', { exact: true }).first();
    await finalizarBtn.click();

    // O modal DEVE permanecer aberto
    await expect(page.getByText('+ Nova Transação').first()).toBeVisible({ timeout: 3000 });

    // Seleciona Saída mas não preenche valor nem descrição
    const saidaBtn = page.getByText('Saída', { exact: true }).first();
    await saidaBtn.click();
    await page.waitForTimeout(200);

    await finalizarBtn.click();

    // O modal continua aberto porque os campos obrigatórios estão vazios
    await expect(page.getByText('+ Nova Transação').first()).toBeVisible({ timeout: 3000 });
    await page.screenshot({ path: 'tests/screenshots/t5-validacao-bloqueio.png' });

    console.log('✅ T5 concluído: Validação de campos obrigatórios funcionando perfeitamente');
  });

});
