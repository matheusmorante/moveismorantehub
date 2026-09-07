/**
 * Testes E2E — Transações Manuais no App Mobile (Expo Web)
 * URL: http://localhost:8081
 *
 * Cobertura Completa:
 *  T1 — Criar transação de SAÍDA manual (com categoria e forma de pagamento PIX)
 *  T2 — Criar transação de ENTRADA manual (com categoria Outras e forma de pagamento PIX)
 *  T3 — Editar uma transação existente (alterar valor e salvar)
 *  T4 — Excluir uma transação (com confirmação e timer de segurança de 3s)
 *  T5 — Validação de campos obrigatórios (impede finalizar sem tipo/valor/descrição)
 */

import { test, expect, Page } from '@playwright/test';

const APP_FINANCE_URL = 'http://localhost:8081/?auth_email=matheusmorante002@gmail.com&tab=financeiro';

/**
 * Helper para navegar para a tela do financeiro autenticado como admin
 */
async function navegarParaFinancas(page: Page) {
  await page.goto(APP_FINANCE_URL, { waitUntil: 'domcontentloaded' });
  const fabBtn = page.getByText('Nova Transação').first();
  await expect(fabBtn).toBeVisible({ timeout: 25000 });
}

/**
 * Helper para abrir o modal de nova movimentação aguardando estabilização da animação
 */
async function abrirModalNovaTransacao(page: Page) {
  const fab = page.getByText('Nova Transação').first();
  await fab.click();
  await expect(page.getByText('+ Nova Transação').first()).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(600);
}

/**
 * Helper robusto para selecionar o tipo da movimentação
 */
async function selecionarTipoMovimentacao(page: Page, tipo: 'expense' | 'income') {
  const testId = tipo === 'expense' ? 'type-btn-expense' : 'type-btn-income';
  const label = tipo === 'expense' ? '- Saída' : '+ Entrada';

  const btn = page.getByTestId(testId).first();
  await btn.click({ force: true });
  await page.waitForTimeout(400);

  const isVisible = await page.getByTestId('input-amount').first().isVisible({ timeout: 1500 }).catch(() => false);
  if (!isVisible) {
    await page.getByText(label, { exact: true }).first().click({ force: true });
    await page.waitForTimeout(400);
  }

  await expect(page.getByTestId('input-amount').first()).toBeVisible({ timeout: 8000 });
}

/**
 * Helper para selecionar categoria no modal
 */
async function selecionarCategoria(page: Page, nomeCategoria: string) {
  const catTrigger = page.getByText('Pesquisar ou selecionar categoria...').first();
  await catTrigger.click();
  await page.waitForTimeout(500);

  // Digita no input de busca para filtrar instantaneamente no topo
  const searchInput = page.locator('input[placeholder*="Pesquisar categoria"]').first();
  await searchInput.fill(nomeCategoria);
  await page.waitForTimeout(300);

  // Clica no item filtrado dentro do modal
  const itemFiltrado = page.getByTestId(`cat-item-${nomeCategoria}`).first();
  if (await itemFiltrado.isVisible({ timeout: 2000 }).catch(() => false)) {
    await itemFiltrado.click();
  } else {
    await page.getByText(nomeCategoria, { exact: true }).first().click();
  }

  await page.waitForTimeout(400);
}

test.describe('📱 Transações Manuais — App Mobile (Expo Web)', () => {

  test.beforeEach(async ({ page }) => {
    await navegarParaFinancas(page);
  });

  // ── T1: Criar transação de SAÍDA manual ────────────────────────────────────
  test('T1 — Criar transação de SAÍDA manual com sucesso', async ({ page }) => {
    await abrirModalNovaTransacao(page);

    // 1. Seleciona o tipo "- Saída"
    await selecionarTipoMovimentacao(page, 'expense');

    // 2. Preenche valor
    const valorInput = page.getByTestId('input-amount').first();
    await valorInput.fill('250,00');

    // 3. Preenche descrição
    const descInput = page.getByTestId('input-description').first();
    const descricao = `E2E Saída ${Date.now()}`;
    await descInput.fill(descricao);

    // 4. Seleciona Categoria ("Outras")
    await selecionarCategoria(page, 'Outras');

    // 5. Seleciona Forma de Pagamento (PIX)
    const pixBtn = page.getByText('PIX', { exact: true }).first();
    await pixBtn.click();

    await page.screenshot({ path: 'tests/screenshots/t1-antes-finalizar.png' });

    // 6. Clica em Finalizar
    const finalizarBtn = page.getByText('Finalizar', { exact: true }).first();
    await finalizarBtn.click();

    // 7. Valida que o modal fechou com sucesso
    await expect(page.getByText('+ Nova Transação')).toHaveCount(0, { timeout: 12000 });
    await page.screenshot({ path: 'tests/screenshots/t1-apos-salvar.png' });

    // 8. Valida que a transação criada aparece na lista
    const itemCriado = page.getByText(descricao).first();
    await expect(itemCriado).toBeVisible({ timeout: 8000 });

    console.log(`✅ T1 concluído: Transação de saída criada com sucesso "${descricao}"`);
  });

  // ── T2: Criar transação de ENTRADA manual ───────────────────────────────────
  test('T2 — Criar transação de ENTRADA manual com sucesso', async ({ page }) => {
    await abrirModalNovaTransacao(page);

    // 1. Seleciona o tipo "+ Entrada"
    await selecionarTipoMovimentacao(page, 'income');

    // 2. Preenche valor
    const valorInput = page.getByTestId('input-amount').first();
    await valorInput.fill('1500,00');

    // 3. Preenche descrição
    const descInput = page.getByTestId('input-description').first();
    const descricao = `E2E Entrada Venda ${Date.now()}`;
    await descInput.fill(descricao);

    // 4. Seleciona Categoria de Entrada ("Outras")
    await selecionarCategoria(page, 'Outras');

    // 5. Seleciona Forma de Pagamento (PIX)
    const pixBtn = page.getByText('PIX', { exact: true }).first();
    await pixBtn.click();

    await page.screenshot({ path: 'tests/screenshots/t2-antes-finalizar.png' });

    // 6. Clica em Finalizar
    const finalizarBtn = page.getByText('Finalizar', { exact: true }).first();
    await finalizarBtn.click();

    // 7. Confirma que fechou e aparece na lista
    await expect(page.getByText('+ Nova Transação')).toHaveCount(0, { timeout: 12000 });
    await page.screenshot({ path: 'tests/screenshots/t2-apos-salvar.png' });

    const itemCriado = page.getByText(descricao).first();
    await expect(itemCriado).toBeVisible({ timeout: 8000 });

    console.log(`✅ T2 concluído: Transação de entrada criada com sucesso "${descricao}"`);
  });

  // ── T3: Editar transação existente ─────────────────────────────────────────
  test('T3 — Editar transação existente', async ({ page }) => {
    // 1. Cria uma transação para edição
    await abrirModalNovaTransacao(page);
    await selecionarTipoMovimentacao(page, 'expense');

    await page.getByTestId('input-amount').first().fill('80,00');
    const descOriginal = `E2E Para Editar ${Date.now()}`;
    await page.getByTestId('input-description').first().fill(descOriginal);

    await selecionarCategoria(page, 'Outras');
    await page.getByText('PIX', { exact: true }).first().click();

    await page.getByText('Finalizar', { exact: true }).first().click();
    await expect(page.getByText('+ Nova Transação')).toHaveCount(0, { timeout: 12000 });

    // 2. Localiza o card criado
    const itemCard = page.getByText(descOriginal).first();
    await expect(itemCard).toBeVisible({ timeout: 8000 });

    // 3. Clica no botão de 3 pontinhos usando o accessibilityLabel exato
    const menuBtn = page.getByLabel(`Ações de ${descOriginal}`).first();
    await expect(menuBtn).toBeVisible({ timeout: 5000 });
    await menuBtn.click();

    await page.screenshot({ path: 'tests/screenshots/t3-menu-acoes-aberto.png' });

    // 4. No modal de ações, clica em "Editar"
    const editarBtn = page.getByText('Editar', { exact: true }).first();
    await expect(editarBtn).toBeVisible({ timeout: 5000 });
    await editarBtn.click();

    // 5. Valida que o modal de edição abriu com o título "Editar Transação"
    await expect(page.getByText('Editar Transação').first()).toBeVisible({ timeout: 6000 });

    // 6. Altera o valor
    const valorEditInput = page.getByTestId('input-amount').first();
    await valorEditInput.click();
    await valorEditInput.fill('195,00');

    await page.screenshot({ path: 'tests/screenshots/t3-antes-salvar-edicao.png' });

    // 7. Clica em "Salvar alterações"
    const salvarBtn = page.getByText('Salvar alterações', { exact: true }).first();
    await salvarBtn.click();

    // 8. Valida fechamento
    await expect(page.getByText('Editar Transação')).toHaveCount(0, { timeout: 12000 });
    await page.screenshot({ path: 'tests/screenshots/t3-apos-editar.png' });

    console.log(`✅ T3 concluído: Transação editada com sucesso`);
  });

  // ── T4: Excluir transação com timer de segurança ───────────────────────────
  test('T4 — Excluir transação com confirmação e timer de segurança', async ({ page }) => {
    // 1. Cria uma transação para exclusão
    await abrirModalNovaTransacao(page);
    await selecionarTipoMovimentacao(page, 'expense');

    await page.getByTestId('input-amount').first().fill('62,00');
    const descExcluir = `E2E Para Deletar ${Date.now()}`;
    await page.getByTestId('input-description').first().fill(descExcluir);

    await selecionarCategoria(page, 'Outras');
    await page.getByText('PIX', { exact: true }).first().click();

    await page.getByText('Finalizar', { exact: true }).first().click();
    await expect(page.getByText('+ Nova Transação')).toHaveCount(0, { timeout: 12000 });

    // 2. Localiza o card
    const itemCard = page.getByText(descExcluir).first();
    await expect(itemCard).toBeVisible({ timeout: 8000 });

    // 3. Clica no menu de 3 pontinhos
    const menuBtn = page.getByLabel(`Ações de ${descExcluir}`).first();
    await expect(menuBtn).toBeVisible({ timeout: 5000 });
    await menuBtn.click();

    // 4. Clica no botão "Excluir"
    const excluirBtn = page.getByText('Excluir', { exact: true }).first();
    await expect(excluirBtn).toBeVisible({ timeout: 5000 });
    await excluirBtn.click();

    // 5. Valida título de confirmação "Excluir transação?"
    await expect(page.getByText('Excluir transação?').first()).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'tests/screenshots/t4-confirmacao-delete.png' });

    // 6. Aguarda o botão "Sim, excluir" ficar habilitado (após a contagem de 3s)
    const confirmBtn = page.getByText('Sim, excluir', { exact: true });
    await expect(confirmBtn).toBeVisible({ timeout: 8000 });
    await confirmBtn.click();

    // 7. Confirma fechamento do modal
    await expect(page.getByText('Excluir transação?')).toHaveCount(0, { timeout: 12000 });

    // 8. Confirma que a transação foi removida da tela
    await expect(page.getByText(descExcluir)).toHaveCount(0, { timeout: 10000 });
    await page.screenshot({ path: 'tests/screenshots/t4-apos-exclusao.png' });

    console.log(`✅ T4 concluído: Transação excluída com sucesso`);
  });

  // ── T5: Validação de campos obrigatórios ────────────────────────────────────
  test('T5 — Validação de campos obrigatórios impede submissão vazia', async ({ page }) => {
    await abrirModalNovaTransacao(page);

    // 1. Tenta submeter sem selecionar tipo nem valor nem descrição
    const finalizarBtn = page.getByText('Finalizar', { exact: true }).first();
    await finalizarBtn.click();

    // O modal DEVE permanecer aberto (UnselectedTypePrompt na tela)
    await expect(page.getByText('+ Nova Transação').first()).toBeVisible({ timeout: 3000 });

    // 2. Seleciona "- Saída", mas NÃO preenche valor nem descrição
    await selecionarTipoMovimentacao(page, 'expense');

    // Clica em Finalizar novamente
    await finalizarBtn.click();

    // O modal DEVE permanecer aberto devido às validações de campo obrigatório
    await expect(page.getByText('+ Nova Transação').first()).toBeVisible({ timeout: 3000 });
    await page.screenshot({ path: 'tests/screenshots/t5-validacao-bloqueio.png' });

    console.log('✅ T5 concluído: Validação de campos obrigatórios funcionando perfeitamente');
  });

});
