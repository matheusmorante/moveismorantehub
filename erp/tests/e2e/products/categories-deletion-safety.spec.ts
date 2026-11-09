import { test, expect } from '@playwright/test';
import { createCategoryEnvironmentRouteMocks } from './categoryEnvironmentRouteMocks';
import { registerCategoryLayoutCases } from './categoryLayoutCases';

/**
 * Suíte E2E Playwright Permanente — Módulo Ambientes e Categorias
 *
 * Cobertura completa e determinística dos 18 cenários padronizados:
 * 1. Criar Ambiente (modal, salvar, listar e persistir após reload)
 * 2. Criar Categoria (modal, salvar, listar em Categorias e persistir após reload)
 * 3. Categoria em múltiplos Ambientes (relação N:N visualizada em ambas as abas)
 * 4. Ambiente com múltiplas Categorias (contagem e listagem completa)
 * 5. Desvincular Categoria de Ambiente sem excluir (N:N isolado)
 * 6. Exclusão de Ambiente bloqueada quando possui categorias vinculadas
 * 7. Exclusão de Ambiente permitida quando vazio (0 categorias)
 * 8. Exclusão de Categoria bloqueada quando possui produtos vinculados
 * 9. Categoria com 0 produtos e múltiplos ambientes vinculados PODE ser excluída
 * 10. Categoria completamente sem uso (0 produtos, 0 ambientes) excluída normalmente
 * 11. Busca contextual independente por aba (Ambientes vs Categorias)
 * 12. Filtros de Categoria (Todas, Com ambiente, Sem ambiente)
 * 13. Editar Ambiente (nome, categorias vinculadas e persistência)
 * 14. Editar Categoria (nome, ambientes vinculados e persistência)
 * 15. Accordion dos Ambientes (recolher/expandir sem quebrar vínculos)
 * 16. Indicador "+N" de Ambientes resumidos com tooltip
 * 17. Responsividade em Desktop, Tablet e Mobile (cards sem scroll horizontal)
 * 18. Ausência de novos erros críticos no console e sem loops de requisição
 */

const AUTH_QUERY = 'auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator';

test.describe('Suíte Permanente E2E: Ambientes e Categorias', () => {
    let consoleErrors: string[] = [];
    let pageErrors: string[] = [];

    let categoryEnvironmentMocks: ReturnType<typeof createCategoryEnvironmentRouteMocks>;
    let restRequestCount = 0;

    test.beforeEach(async ({ page }) => {
        consoleErrors = [];
        pageErrors = [];
        const testRunId = `TEST_AUT_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

        restRequestCount = 0;
        categoryEnvironmentMocks = createCategoryEnvironmentRouteMocks(testRunId);
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        page.on('pageerror', err => {
            pageErrors.push(err.message);
        });

        page.on('request', request => {
            if (request.url().includes('/rest/v1/')) restRequestCount++;
        });

        // Mock State Store do Supabase
        await categoryEnvironmentMocks.install(page);

        await page.goto(`/registrations/product-categories?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
    });

    test.afterEach(async () => {
        const criticalErrors = consoleErrors.filter(
            msg =>
                !msg.includes('favicon') &&
                !msg.includes('React DevTools') &&
                !msg.includes('net::ERR_FAILED') &&
                !msg.includes('Failed to load resource')
        );
        expect(criticalErrors, 'Erros críticos de console detectados').toEqual([]);
        expect(pageErrors, 'Exceções de tela branca detectadas').toEqual([]);
    });

    // ==========================================
    // CENÁRIO 1 — Criar Ambiente
    // ==========================================
    test('Cenário 1 — Criar Ambiente: modal, cadastro, exibição e persistência após reload', async ({ page }) => {
        await page.getByTestId('btn-new-environment').click();

        const input = page.getByPlaceholder(/ex: cozinha/i);
        await expect(input).toBeVisible();
        await input.fill('COZINHA PLANEJADA');

        await page.getByRole('button', { name: /salvar/i }).click();

        // Deve aparecer na lista
        await expect(page.locator('text=COZINHA PLANEJADA')).toBeVisible({ timeout: 5000 });

        // Recarrega a página e confirma persistência
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page.locator('text=COZINHA PLANEJADA')).toBeVisible({ timeout: 5000 });
    });

    // ==========================================
    // CENÁRIO 2 — Criar Categoria
    // ==========================================
    test('Cenário 2 — Criar Categoria: modal, cadastro, exibição em Categorias e persistência', async ({ page }) => {
        await page.getByTestId('btn-new-category').click();

        const input = page.getByPlaceholder(/ex: sofá/i);
        await expect(input).toBeVisible();
        await input.fill('MESA DE JANTAR');

        await page.getByRole('button', { name: /salvar/i }).click();

        // Muda para a aba Categorias
        await page.getByTestId('tab-view-categoria').click();
        await expect(page.locator('table').getByText('MESA DE JANTAR')).toBeVisible({ timeout: 5000 });

        // Recarrega e confirma persistência
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.getByTestId('tab-view-categoria').click();
        await expect(page.locator('table').getByText('MESA DE JANTAR')).toBeVisible({ timeout: 5000 });
    });

    // ==========================================
    // CENÁRIO 3 — Categoria em múltiplos Ambientes (N:N)
    // ==========================================
    test('Cenário 3 — Categoria em múltiplos Ambientes comprova o relacionamento N:N', async ({ page }) => {
        // Aba Por ambiente: PUFE aparece em SALA e em QUARTO
        const salaRow = page.locator('div[data-testid^="environment-row-env-sala"]');
        const quartoRow = page.locator('div[data-testid^="environment-row-env-quarto"]');

        await expect(salaRow.locator('text=PUFE COM AMBIENTES SEM PRODUTOS')).toBeVisible();
        await expect(quartoRow.locator('text=PUFE COM AMBIENTES SEM PRODUTOS')).toBeVisible();

        // Aba Categorias: PUFE lista ambos os ambientes
        await page.getByTestId('tab-view-categoria').click();
        const pufeRow = page.locator('tr[data-testid^="category-row-cat-pufe"]');
        await expect(pufeRow).toBeVisible();
        await expect(pufeRow.locator('text=SALA DE ESTAR')).toBeVisible();
        await expect(pufeRow.locator('text=QUARTO CASAL')).toBeVisible();
    });

    // ==========================================
    // CENÁRIO 4 — Ambiente com múltiplas Categorias
    // ==========================================
    test('Cenário 4 — Ambiente com múltiplas Categorias: listagem e contadores corretos', async ({ page }) => {
        const salaRow = page.locator('div[data-testid^="environment-row-env-sala"]');
        await expect(salaRow).toBeVisible();

        // SALA possui 3 categorias vinculadas: Sofá, Pufe e Cadeira Multi
        await expect(salaRow.getByText('3 categorias', { exact: true })).toBeVisible();
        await expect(salaRow.locator('text=SOFÁ COM PRODUTOS')).toBeVisible();
        await expect(salaRow.locator('text=PUFE COM AMBIENTES SEM PRODUTOS')).toBeVisible();
        await expect(salaRow.locator('text=CADEIRA MULTI AMBIENTES')).toBeVisible();
    });

    // ==========================================
    // CENÁRIO 5 — Desvincular sem excluir
    // ==========================================
    test('Cenário 5 — Desvincular Categoria de Ambiente remove vínculo sem excluir a Categoria', async ({ page }) => {
        const salaRow = page.locator('div[data-testid^="environment-row-env-sala"]');
        const quartoRow = page.locator('div[data-testid^="environment-row-env-quarto"]');

        // Configura aceitação do diálogo de confirmação
        page.on('dialog', async dialog => {
            expect(dialog.message()).toContain('Desvincular');
            await dialog.accept();
        });

        // Clica no x do chip do Pufe dentro da Sala
        const chipPufeSala = salaRow.locator('span:has-text("PUFE COM AMBIENTES SEM PRODUTOS")');
        const unlinkBtn = chipPufeSala.locator('button[title*="Desvincular"]');
        await unlinkBtn.click();

        // Pufe deve desaparecer da Sala
        await expect(salaRow.locator('text=PUFE COM AMBIENTES SEM PRODUTOS')).not.toBeVisible();

        // Pufe DEVE continuar no Quarto
        await expect(quartoRow.locator('text=PUFE COM AMBIENTES SEM PRODUTOS')).toBeVisible();

        // Pufe DEVE continuar existindo na aba Categorias
        await page.getByTestId('tab-view-categoria').click();
        const pufeRow = page.locator('tr[data-testid^="category-row-cat-pufe"]');
        await expect(pufeRow).toBeVisible();
    });

    // ==========================================
    // CENÁRIO 6 — Exclusão de Ambiente bloqueada
    // ==========================================
    test('Cenário 6 — Exclusão de Ambiente bloqueada quando possui categorias vinculadas', async ({ page }) => {
        const salaRow = page.locator('div[data-testid^="environment-row-env-sala"]');
        await expect(salaRow).toBeVisible();

        const deleteRegion = salaRow.locator('div[role="region"][aria-disabled="true"]');
        await expect(deleteRegion).toBeVisible();

        const deleteBtn = deleteRegion.locator('button');
        await expect(deleteBtn).toBeDisabled();

        await deleteRegion.hover();
        const tooltip = deleteRegion.locator('div[role="tooltip"]');
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('Não é possível excluir este ambiente porque ele possui 3 categorias vinculadas');
    });

    // ==========================================
    // CENÁRIO 7 — Exclusão de Ambiente permitida
    // ==========================================
    test('Cenário 7 — Exclusão de Ambiente permitida quando vazio (0 categorias)', async ({ page }) => {
        const varandaRow = page.locator('div[data-testid^="environment-row-env-varanda"]');
        await expect(varandaRow).toBeVisible();

        page.on('dialog', async dialog => {
            expect(dialog.message()).toContain('EXCLUIR');
            await dialog.accept();
        });

        const deleteBtn = varandaRow.locator('button[aria-label*="Excluir ambiente"]');
        await expect(deleteBtn).toBeEnabled();
        await deleteBtn.click();

        await expect(varandaRow).not.toBeVisible();

        // Recarrega e confirma persistência da exclusão
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page.locator('text=VARANDA VAZIA')).not.toBeVisible();
    });

    // ==========================================
    // CENÁRIO 8 — Exclusão de Categoria bloqueada
    // ==========================================
    test('Cenário 8 — Exclusão de Categoria bloqueada quando possui produtos vinculados', async ({ page }) => {
        await page.getByTestId('tab-view-categoria').click();

        const sofaRow = page.locator('tr[data-testid^="category-row-cat-sofa"]');
        await expect(sofaRow).toBeVisible();

        const deleteRegion = sofaRow.locator('div[role="region"][aria-disabled="true"]');
        await expect(deleteRegion).toBeVisible();

        const deleteBtn = deleteRegion.locator('button');
        await expect(deleteBtn).toBeDisabled();

        await deleteRegion.hover();
        const tooltip = deleteRegion.locator('div[role="tooltip"]');
        await expect(tooltip).toBeVisible();
        await expect(tooltip).toContainText('Não é possível excluir esta categoria porque ela está sendo utilizada por 2 produtos');
    });

    // ==========================================
    // CENÁRIO 9 — Categoria com 0 Produtos e Ambientes vinculados
    // ==========================================
    test('Cenário 9 — Categoria com 0 Produtos e Ambientes vinculados PODE ser excluída sem afetar Ambientes', async ({ page }) => {
        await page.getByTestId('tab-view-categoria').click();

        const pufeRow = page.locator('tr[data-testid^="category-row-cat-pufe"]');
        await expect(pufeRow).toBeVisible();

        page.on('dialog', async dialog => {
            expect(dialog.message()).toContain('EXCLUIR');
            await dialog.accept();
        });

        const deleteBtn = pufeRow.locator('button[aria-label*="Excluir categoria"]');
        await expect(deleteBtn).toBeEnabled();
        await deleteBtn.click();

        // Pufe foi removido
        await expect(pufeRow).not.toBeVisible();

        // Ambientes (Sala e Quarto) continuam existindo normalmente
        await page.getByTestId('tab-view-ambiente').click();
        await expect(page.locator('text=SALA DE ESTAR')).toBeVisible();
        await expect(page.locator('text=QUARTO CASAL')).toBeVisible();
    });

    // ==========================================
    // CENÁRIO 10 — Categoria completamente sem uso
    // ==========================================
    test('Cenário 10 — Categoria completamente sem uso (0 produtos, 0 ambientes) excluída normalmente', async ({ page }) => {
        await page.getByTestId('tab-view-categoria').click();

        const isoladaRow = page.locator('tr[data-testid^="category-row-cat-isolada"]');
        await expect(isoladaRow).toBeVisible();

        page.on('dialog', async dialog => {
            expect(dialog.message()).toContain('EXCLUIR');
            await dialog.accept();
        });

        const deleteBtn = isoladaRow.locator('button[aria-label*="Excluir categoria"]');
        await expect(deleteBtn).toBeEnabled();
        await deleteBtn.click();

        await expect(isoladaRow).not.toBeVisible();
    });

    // ==========================================
    // CENÁRIO 11 — Busca contextual
    // ==========================================
    test('Cenário 11 — Busca contextual independente por aba', async ({ page }) => {
        const searchInput = page.getByPlaceholder(/buscar ambiente\.\.\./i);
        await searchInput.fill('QUARTO');

        await expect(page.locator('text=QUARTO CASAL')).toBeVisible();
        await expect(page.locator('text=SALA DE ESTAR')).not.toBeVisible();

        await searchInput.fill('');
        await expect(page.locator('text=SALA DE ESTAR')).toBeVisible();

        // Muda para Categorias
        await page.getByTestId('tab-view-categoria').click();
        const catSearchInput = page.getByPlaceholder(/buscar categoria\.\.\./i);
        await catSearchInput.fill('PUFE');

        await expect(page.locator('table').getByText('PUFE COM AMBIENTES SEM PRODUTOS')).toBeVisible();
        await expect(page.locator('table').getByText('SOFÁ COM PRODUTOS')).not.toBeVisible();
    });

    // ==========================================
    // CENÁRIO 12 — Filtros de Categoria
    // ==========================================
    test('Cenário 12 — Filtros de Categoria (Todas, Com ambiente, Sem ambiente)', async ({ page }) => {
        await page.getByTestId('tab-view-categoria').click();

        // Filtro: Sem ambiente (apenas CATEGORIA TOTALMENTE LIVRE)
        await page.getByRole('button', { name: /sem ambiente/i }).click();
        await expect(page.locator('table').getByText('CATEGORIA TOTALMENTE LIVRE')).toBeVisible();
        await expect(page.locator('table').getByText('SOFÁ COM PRODUTOS')).not.toBeVisible();

        // Filtro: Com ambiente
        await page.getByRole('button', { name: /com ambiente/i }).click();
        await expect(page.locator('table').getByText('SOFÁ COM PRODUTOS')).toBeVisible();
        await expect(page.locator('table').getByText('CATEGORIA TOTALMENTE LIVRE')).not.toBeVisible();

        // Filtro: Todas
        await page.getByRole('button', { name: /todas \(/i }).click();
        await expect(page.locator('table').getByText('SOFÁ COM PRODUTOS')).toBeVisible();
        await expect(page.locator('table').getByText('CATEGORIA TOTALMENTE LIVRE')).toBeVisible();
    });

    // ==========================================
    // CENÁRIO 13 — Editar Ambiente
    // ==========================================
    test('Cenário 13 — Editar Ambiente: nome, categorias vinculadas e persistência', async ({ page }) => {
        const salaRow = page.locator('div[data-testid^="environment-row-env-sala"]');
        await salaRow.locator('button[aria-label*="Editar ambiente"]').click();

        const input = page.getByPlaceholder(/ex: cozinha/i);
        await expect(input).toBeVisible();
        await input.fill('SALA PRINCIPAL DECORADA');

        await page.getByRole('button', { name: /salvar/i }).click();

        await expect(page.locator('text=SALA PRINCIPAL DECORADA')).toBeVisible({ timeout: 5000 });

        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page.locator('text=SALA PRINCIPAL DECORADA')).toBeVisible({ timeout: 5000 });
    });

    // ==========================================
    // CENÁRIO 14 — Editar Categoria
    // ==========================================
    test('Cenário 14 — Editar Categoria: nome, ambientes vinculados e persistência', async ({ page }) => {
        await page.getByTestId('tab-view-categoria').click();

        const sofaRow = page.locator('tr[data-testid^="category-row-cat-sofa"]');
        await sofaRow.locator('button[aria-label*="Editar categoria"]').click();

        const input = page.getByPlaceholder(/ex: sofá/i);
        await expect(input).toBeVisible();
        await input.fill('SOFÁ RETRÁTIL E RECLINÁVEL');

        await page.getByRole('button', { name: /salvar/i }).click();

        await expect(page.locator('table').getByText('SOFÁ RETRÁTIL E RECLINÁVEL')).toBeVisible({ timeout: 5000 });

        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.getByTestId('tab-view-categoria').click();
        await expect(page.locator('table').getByText('SOFÁ RETRÁTIL E RECLINÁVEL')).toBeVisible({ timeout: 5000 });
    });

    registerCategoryLayoutCases();

    // ==========================================
    // CENÁRIO 18 — Console e erros de rede
    // ==========================================
    test('Cenário 18 — Fluxo completo sem erros críticos no console ou loops de requisição', async ({ page }) => {
        // Navega entre as duas visões
        await page.getByTestId('tab-view-categoria').click();
        const requestsAfterInitialLoad = restRequestCount;
        await page.getByTestId('tab-view-ambiente').click();

        // Verificação final garantida pelo afterEach
        expect(restRequestCount, 'Alternar abas não deve disparar novas consultas REST').toBe(requestsAfterInitialLoad);
        expect(consoleErrors.filter(e => !e.includes('favicon')), 'Console sem erros').toEqual([]);
    });

    // ==========================================
    // CENÁRIO 19 — Modal de Ambiente NÃO exibe Atributos Obrigatórios
    // ==========================================
    test('Cenário 19 — Modal de Ambiente não exibe seção de Atributos Obrigatórios', async ({ page }) => {
        await page.getByTestId('btn-new-environment').click();

        const nameInput = page.getByPlaceholder(/ex: cozinha/i);
        await expect(nameInput).toBeVisible();

        // A seção de atributos NUNCA deve aparecer em modais de Ambiente
        const attrSection = page.locator('label:has-text("Atributos Obrigatórios")');
        await expect(attrSection).not.toBeVisible();
    });

    // ==========================================
    // CENÁRIO 20 — Modal de Categoria exibe Atributos Obrigatórios
    // ==========================================
    test('Cenário 20 — Modal de Categoria exibe seção de Atributos Obrigatórios com autocomplete', async ({ page }) => {
        await page.getByTestId('btn-new-category').click();

        const nameInput = page.getByPlaceholder(/ex: sofá/i);
        await expect(nameInput).toBeVisible();

        // A seção de atributos DEVE aparecer em modais de Categoria
        const attrSection = page.locator('label:has-text("Atributos Obrigatórios")');
        await expect(attrSection).toBeVisible();

        // O input de busca de atributos deve estar presente
        const attrInput = page.getByPlaceholder(/Digite para buscar atributos/i);
        await expect(attrInput).toBeVisible();
        await expect(page.getByText('Produtos desta categoria deverão preencher estes atributos.')).toBeVisible();

        await page.setViewportSize({ width: 375, height: 667 });
        await expect(page.getByRole('button', { name: /salvar/i })).toBeVisible();
        const hasHorizontalOverflow = await page.evaluate(() =>
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(hasHorizontalOverflow, 'O modal não deve provocar scroll horizontal no mobile').toBe(false);
    });

    // ==========================================
    // CENÁRIO 21 — Criar Categoria com Atributo Obrigatório e verificar persistência
    // ==========================================
    test('Cenário 21 — Criar Categoria com múltiplos Atributos Obrigatórios: sem duplicar por Ambiente e com persistência', async ({ page }) => {
        await page.getByTestId('btn-new-category').click();

        const nameInput = page.getByPlaceholder(/ex: sofá/i);
        await nameInput.fill('ESTANTE COM COR');

        await page.locator('label').filter({ hasText: 'SALA DE ESTAR' }).locator('input').check();
        await page.locator('label').filter({ hasText: 'QUARTO CASAL' }).locator('input').check();

        // Buscar e selecionar o atributo "Cor"
        const attrInput = page.getByPlaceholder(/Digite para buscar atributos/i);
        await attrInput.click();
        await attrInput.fill('Cor');

        // Aguardar a sugestão aparecer e clicar
        const corOption = page.getByRole('button', { name: 'Cor' }).first();
        await expect(corOption).toBeVisible({ timeout: 5000 });
        await corOption.click();

        // O atributo selecionado deixa de ser oferecido, impedindo duplicidade.
        await attrInput.fill('Cor');
        await expect(page.getByRole('button', { name: 'Cor', exact: true })).not.toBeVisible();

        await attrInput.fill('Material');
        await page.getByRole('button', { name: /Material/i }).click();

        // O chip "Cor" deve aparecer abaixo do autocomplete
        const chip = page.locator('div').filter({ hasText: /^Cor$/ }).first();
        await expect(chip).toBeVisible({ timeout: 3000 });
        await expect(page.locator('div').filter({ hasText: /^Material$/ }).first()).toBeVisible();

        // Salvar
        await page.getByRole('button', { name: /salvar/i }).click();

        // Confirmar que a categoria foi criada (modal fechou)
        await expect(page.getByPlaceholder(/ex: sofá/i)).not.toBeVisible({ timeout: 5000 });

        // Verificar que o category_attribute foi persistido no mock
        const createdCategory = categoryEnvironmentMocks.currentCategories.find(category => category.name.toUpperCase() === 'ESTANTE COM COR');
        expect(createdCategory).toBeDefined();
        expect(categoryEnvironmentMocks.currentCategoryAttributes.filter(ca => ca.category_id === createdCategory?.id)).toHaveLength(2);
        expect(categoryEnvironmentMocks.currentRelationships.filter(rel => rel.child_id === createdCategory?.id)).toHaveLength(2);

        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.getByTestId('tab-view-categoria').click();
        const createdRow = page.locator('tr').filter({ hasText: /ESTANTE COM COR/i });
        await createdRow.locator('button[aria-label^="Editar categoria"]').click();
        await expect(page.locator('div').filter({ hasText: /^Cor$/ }).first()).toBeVisible();
        await expect(page.locator('div').filter({ hasText: /^Material$/ }).first()).toBeVisible();
    });

    // ==========================================
    // CENÁRIO 22 — Editar Categoria e remover Atributo Obrigatório
    // ==========================================
    test('Cenário 22 — Editar Categoria: remove e adiciona obrigatoriedade sem alterar valores dos Produtos', async ({ page }) => {
        // Pre-populate: SOFÁ já tem "Cor" vinculado
        const sofaId = categoryEnvironmentMocks.currentCategories.find((c: any) => c.name.includes('SOFÁ'))?.id;
        if (sofaId) {
            categoryEnvironmentMocks.currentCategoryAttributes.push({ category_id: sofaId, attribute_id: 'attr-cor', is_required: true });
        }

        // Ir para aba categorias e editar o SOFÁ
        await page.getByTestId('tab-view-categoria').click();
        const sofaRow = page.locator('tr[data-testid^="category-row-cat-sofa"]');
        const editBtn = sofaRow.locator('button[aria-label^="Editar categoria"]');
        await editBtn.click();

        // Modal abre: o atributo "Cor" deve aparecer como chip pré-carregado
        const chip = page.locator('div').filter({ hasText: /^Cor$/ }).first();
        await expect(chip).toBeVisible({ timeout: 5000 });

        // Remover o atributo via botão [x]
        const removeBtn = page.locator(`button[aria-label="Remover atributo Cor"]`);
        await expect(removeBtn).toBeVisible();
        await removeBtn.click();

        // Chip some
        await expect(chip).not.toBeVisible({ timeout: 3000 });

        const attrInput = page.getByPlaceholder(/Digite para buscar atributos/i);
        await attrInput.fill('Material');
        await page.getByRole('button', { name: /Material/i }).click();

        // Salvar
        await page.getByRole('button', { name: /salvar/i }).click();

        // Aguardar a persistência terminar e o modal fechar antes de inspecionar o estado do mock.
        await expect(page.getByPlaceholder(/ex: sofá/i)).not.toBeVisible({ timeout: 5000 });

        // Confirmar que o vínculo foi removido no mock
        if (sofaId) {
            expect(categoryEnvironmentMocks.currentCategoryAttributes.filter(ca => ca.category_id === sofaId && ca.attribute_id === 'attr-cor')).toHaveLength(0);
            expect(categoryEnvironmentMocks.currentCategoryAttributes.filter(ca => ca.category_id === sofaId && ca.attribute_id === 'attr-material')).toHaveLength(1);
        }
        expect(categoryEnvironmentMocks.productVariationMutationCount, 'Alterar obrigatoriedade não pode editar valores das variações').toBe(0);
    });
});
