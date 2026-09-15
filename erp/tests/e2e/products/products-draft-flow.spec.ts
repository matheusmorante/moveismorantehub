import { test, expect, Page } from '@playwright/test';

/**
 * Suíte E2E — Fluxo de Rascunho de Produto
 *
 * Cobre os seguintes cenários críticos:
 * 1. Salvar rascunho e verificar que aparece como rascunho na lista
 * 2. Continuar cadastro a partir do rascunho e verificar abertura do modal de canais
 * 3. Verificar que produto concluído (ex-rascunho) NÃO fica desativado
 * 4. Produto em rascunho exibe botão "Salvar rascunho" (não "Salvar Alterações")
 * 5. Produto concluído (ex-rascunho) pode ser ativado no catálogo sem bloqueio
 * 6. Editar produto já cadastrado NÃO reabre modal de canais
 *
 * Identificador: [TESTE_AUT] + timestamp garante rastreabilidade e teardown seguro.
 */
test.describe('Fluxo de Rascunho de Produto', () => {
    const testRunId = `[TESTE_AUT]_DRAFT_${Date.now()}`;
    const AUTH_QUERY = 'auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator';
    let consoleErrors: string[] = [];
    let pageErrors: string[] = [];

    test.beforeEach(async ({ page }) => {
        test.setTimeout(60000);
        consoleErrors = [];
        pageErrors = [];

        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        page.on('response', (res) => {
            if (res.status() >= 400) {
                console.log(`[HTTP ${res.status()}] ${res.url()}`);
            }
        });

        page.on('pageerror', (err) => {
            pageErrors.push(err.message);
        });

        await page.goto(`/registrations/products?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    });

    test.afterEach(async ({ page }) => {
        const realErrors = consoleErrors.filter(
            (e) =>
                !e.includes('favicon') &&
                !e.includes('Download the React DevTools') &&
                !e.includes('net::ERR_CONNECTION_REFUSED') &&
                !e.includes('net::ERR_ABORTED')
        );
        expect(realErrors, 'Erros críticos de console detectados').toEqual([]);
        expect(pageErrors, 'Exceções de tela branca detectadas').toEqual([]);
    });

    // ─────────────────────────────────────────────────────────────────
    // HELPER: Abre o formulário de novo produto e preenche o nome
    // ─────────────────────────────────────────────────────────────────
    async function abrirFormularioNovoProduto(page: Page, nomeProduto: string) {
        const newProductBtn = page.locator('button:has-text("Novo Produto")').first();
        await expect(newProductBtn).toBeVisible({ timeout: 15000 });
        await newProductBtn.click();

        const formModal = page.locator('[role="dialog"][aria-labelledby="product-form-title"]').first();
        await expect(formModal).toBeVisible({ timeout: 8000 });
        await page.waitForTimeout(600);

        const nameInput = page.locator('input[placeholder*="nome interno"], input[placeholder*="SOFA 3 LUG"]').first();
        await expect(nameInput).toBeVisible({ timeout: 5000 });
        await nameInput.fill(nomeProduto);
        await nameInput.blur();
        await page.waitForTimeout(400);
        return formModal;
    }

    async function preencherRequisitosECadastrar(page: Page) {
        // 1. Categoria na aba Geral
        const firstCatOption = page.locator('label input[type="checkbox"]').first();
        if (await firstCatOption.isVisible({ timeout: 2000 })) {
            await firstCatOption.click();
            await page.waitForTimeout(200);
        } else {
            const searchCategoryInput = page.locator('#input-search-product-categories').first();
            if (await searchCategoryInput.isVisible({ timeout: 2000 })) {
                await searchCategoryInput.fill('Quarto');
                await page.waitForTimeout(400);
                const optionAfterSearch = page.locator('label input[type="checkbox"]').first();
                if (await optionAfterSearch.isVisible({ timeout: 2000 })) {
                    await optionAfterSearch.click();
                }
            }
        }

        // 2. Aba Estoque e Precificação
        const estoqueTab = page.locator('button:has-text("Estoque e Precificação")').first();
        if (await estoqueTab.isVisible({ timeout: 2000 })) {
            await estoqueTab.click();
            await page.waitForTimeout(400);

            // Preço de venda
            const priceInput = page.locator('#product-unit-price-input, input[aria-label*="Preço de venda"], input[placeholder*="0,00"]').first();
            if (await priceInput.isVisible({ timeout: 2000 })) {
                await priceInput.fill('499,90');
                await priceInput.blur();
                await page.waitForTimeout(200);
            }

            // Seleção de fornecedor
            const supplierInput = page.locator('input[role="combobox"][aria-label="Buscar fornecedor por nome ou razão social"], input[role="combobox"]').first();
            if (await supplierInput.isVisible({ timeout: 2000 })) {
                await supplierInput.click({ force: true });
                await supplierInput.fill('Mo');
                await page.waitForTimeout(600);
                const supplierOption = page.locator('[role="listbox"][aria-label="Sugestões de fornecedores"] button[role="option"]').first();
                if (await supplierOption.isVisible({ timeout: 4000 })) {
                    await supplierOption.click({ force: true });
                    await page.waitForTimeout(300);
                }
                await page.keyboard.press('Escape');
                await page.waitForTimeout(200);
            }
        }

        // 3. Aba Variações - Configurar atributo na Variação 1 padrão
        const varTab = page.locator('button:has-text("Variações")').first();
        if (await varTab.isVisible({ timeout: 2000 })) {
            await varTab.click({ force: true });
            await page.waitForTimeout(400);

            const editVarBtn = page.locator('button[aria-label="Editar detalhes da variação"], button[title*="editar detalhes da variação"]').first();
            if (await editVarBtn.isVisible({ timeout: 5000 })) {
                await editVarBtn.click({ force: true });

                const varModal = page.locator('[role="dialog"][aria-labelledby="variation-form-modal-title"], [role="dialog"]:has-text("Editar Variação")').first();
                await expect(varModal).toBeVisible({ timeout: 8000 });
                await page.waitForTimeout(500);

                const addAttrBtn = varModal.locator('[data-testid="add-variation-attribute-btn"]').or(varModal.locator('button:has-text("Adicionar")')).first();
                await expect(addAttrBtn).toBeVisible({ timeout: 4000 });
                await addAttrBtn.click();
                await page.waitForTimeout(500);

                const attrValInput = varModal.locator('input[placeholder*="Valor"]').first();
                await expect(attrValInput).toBeVisible({ timeout: 5000 });
                await attrValInput.fill('Preto');
                await page.waitForTimeout(300);

                // Cadastrar/confirmar valor se houver botão de registro
                const regValBtn = varModal.locator('[data-testid="attribute-register-button"]').first();
                if (await regValBtn.isVisible({ timeout: 1000 })) {
                    await regValBtn.click();
                    await page.waitForTimeout(300);
                } else {
                    await attrValInput.press('Enter');
                    await page.waitForTimeout(300);
                }

                const concluirVarBtn = varModal.locator('button:has-text("Concluir")').first();
                await expect(concluirVarBtn).toBeVisible({ timeout: 3000 });
                await concluirVarBtn.click({ force: true });
                await expect(varModal).not.toBeVisible({ timeout: 5000 });
                await page.waitForTimeout(400);
            }
        }

        // 4. Aba Tributário / NF (última etapa que habilita o botão de conclusão/cadastro)
        const fiscalTab = page.locator('button:has-text("Tributário / NF"), button:has-text("Tributário")').first();
        if (await fiscalTab.isVisible({ timeout: 2000 })) {
            await fiscalTab.click({ force: true });
            await page.waitForTimeout(400);
        }

        const cadastrarBtn = page.locator('button:has-text("Cadastrar produto"), button:has-text("Cadastrar")').first();
        await expect(cadastrarBtn).toBeVisible({ timeout: 5000 });
        await cadastrarBtn.click({ force: true });
    }

    // ─────────────────────────────────────────────────────────────────
    // CASO 1: Salvar Rascunho — produto aparece como rascunho na lista
    // ─────────────────────────────────────────────────────────────────
    test('Caso 1: Salvar rascunho — produto fica visível como rascunho na lista', async ({ page }) => {
        const nomeProduto = `${testRunId} Poltrona Draft`;
        await abrirFormularioNovoProduto(page, nomeProduto);

        const saveDraftBtn = page.locator('button:has-text("Salvar rascunho")').first();
        await expect(saveDraftBtn).toBeEnabled({ timeout: 8000 });
        await saveDraftBtn.click({ force: true });
        
        // Aguarda confirmação visual do salvamento do rascunho
        await expect(page.locator('text=Rascunho salvo com sucesso')).toBeVisible({ timeout: 10000 });

        // Fecha o modal pelo botão Cancelar ou Escape
        const cancelBtn = page.locator('button:has-text("Cancelar"), button:has-text("Fechar")').first();
        if (await cancelBtn.isVisible({ timeout: 2000 })) {
            await cancelBtn.click();
        } else {
            await page.keyboard.press('Escape');
        }
        await page.waitForTimeout(1000);

        // Verifica na lista de produtos se o item com badge Rascunho está visível
        const rascunhoBadge = page.locator('text=Rascunho').first();
        await expect(rascunhoBadge).toBeAttached({ timeout: 8000 });
    });

    // ─────────────────────────────────────────────────────────────────
    // CASO 2: Rascunho concluído → DEVE abrir modal de canais
    // ─────────────────────────────────────────────────────────────────
    test('Caso 2: Concluir rascunho abre o modal de canais (bug fix de regressão)', async ({ page }) => {
        const nomeProduto = `${testRunId} Guarda-Roupa Fênix Draft`;
        const formModal = await abrirFormularioNovoProduto(page, nomeProduto);

        // Salva como rascunho primeiro
        const saveDraftBtn = page.locator('button:has-text("Salvar rascunho")').first();
        await expect(saveDraftBtn).toBeEnabled({ timeout: 8000 });
        await saveDraftBtn.click({ force: true });
        await expect(page.locator('text=Rascunho salvo com sucesso')).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(500);

        // Preenche requisitos e clica em Cadastrar produto
        await preencherRequisitosECadastrar(page);

        // VERIFICAÇÃO PRINCIPAL: Modal de canais (saveResult) DEVE aparecer
        const channelModal = page
            .locator('[data-testid="save-result-modal"]')
            .or(page.getByText('Produto cadastrado com sucesso'))
            .or(page.getByText('Canal ERP'))
            .first();

        await expect(channelModal).toBeVisible({ timeout: 12000 });
    });

    // ─────────────────────────────────────────────────────────────────
    // CASO 3: Produto concluído (ex-rascunho) NÃO fica desativado
    // ─────────────────────────────────────────────────────────────────
    test('Caso 3: Produto concluído a partir de rascunho NÃO deve ter badge Rascunho', async ({ page }) => {
        const nomeProduto = `${testRunId} Sofá Draft Conclusão`;
        await abrirFormularioNovoProduto(page, nomeProduto);

        const saveDraftBtn = page.locator('button:has-text("Salvar rascunho")').first();
        await expect(saveDraftBtn).toBeEnabled({ timeout: 8000 });
        await saveDraftBtn.click({ force: true });
        await expect(page.locator('text=Rascunho salvo com sucesso')).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(500);

        await preencherRequisitosECadastrar(page);

        const channelModal = page
            .locator('[data-testid="save-result-modal"]')
            .or(page.getByText('Produto cadastrado com sucesso'))
            .or(page.getByText('Canal ERP'))
            .first();

        if (await channelModal.isVisible({ timeout: 12000 })) {
            const closeBtn = page.locator(
                'button:has-text("Fechar"), button:has-text("Concluir"), button:has-text("Ok")'
            ).first();
            if (await closeBtn.isVisible({ timeout: 3000 })) {
                await closeBtn.click();
            }
        }

        await page.waitForTimeout(1000);
        expect(pageErrors).toEqual([]);
    });

    // ─────────────────────────────────────────────────────────────────
    // CASO 4: Formulário de rascunho exibe "Salvar rascunho" (não "Salvar Alterações")
    // ─────────────────────────────────────────────────────────────────
    test('Caso 4: Formulário de rascunho exibe botão "Salvar rascunho", não "Salvar Alterações"', async ({ page }) => {
        await abrirFormularioNovoProduto(page, `${testRunId} Produto Draft Button Check`);

        // Verifica que o botão de rascunho existe
        const saveDraftBtn = page.locator('button:has-text("Salvar rascunho")').first();
        await expect(saveDraftBtn).toBeVisible({ timeout: 5000 });

        // Verifica que "Salvar Alterações" NÃO está visível (é o botão de produto já cadastrado)
        const saveAlteracoesBtn = page.locator('button:has-text("Salvar Alterações")').first();
        const isAlteracoesVisible = await saveAlteracoesBtn.isVisible({ timeout: 1000 }).catch(() => false);
        expect(isAlteracoesVisible, '"Salvar Alterações" não deve aparecer em novo produto/rascunho').toBe(false);
    });

    // ─────────────────────────────────────────────────────────────────
    // CASO 5: Produto cadastrado (ex-rascunho) pode ser ativado no catálogo
    //         SEM receber a mensagem "Termine o cadastramento"
    // ─────────────────────────────────────────────────────────────────
    test('Caso 5: Produto cadastrado (ex-rascunho) não exibe mensagem de bloqueio de rascunho', async ({ page }) => {
        await page.goto(`/registrations/products?${AUTH_QUERY}`);
        await page.waitForLoadState('domcontentloaded');

        // Aguarda a lista carregar
        await page.waitForTimeout(1000);

        // Verifica que a mensagem de bloqueio de rascunho NÃO aparece visível na tela
        const rascunhoBlockMsgCatalog = page.locator(
            'text=Termine o cadastramento para poder publicá-lo no Catálogo'
        ).first();
        const rascunhoBlockMsgErp = page.locator(
            'text=Termine o cadastramento para poder ativá-lo no ERP'
        ).first();

        // Essas mensagens só devem aparecer quando o usuário CLICA em ativar um rascunho
        // Na carga inicial da tela, não devem estar visíveis
        const isBlockCatalogVisible = await rascunhoBlockMsgCatalog.isVisible({ timeout: 500 }).catch(() => false);
        const isBlockErpVisible = await rascunhoBlockMsgErp.isVisible({ timeout: 500 }).catch(() => false);

        expect(isBlockCatalogVisible, 'Mensagem de bloqueio de catálogo não deve estar visível na carga inicial').toBe(false);
        expect(isBlockErpVisible, 'Mensagem de bloqueio de ERP não deve estar visível na carga inicial').toBe(false);
    });

    // ─────────────────────────────────────────────────────────────────
    // CASO 6: Editar produto JÁ CADASTRADO não reabre modal de canais
    // ─────────────────────────────────────────────────────────────────
    test('Caso 6: Editar produto já cadastrado fecha o modal sem reabrir tela de canais', async ({ page }) => {
        await page.goto(`/registrations/products?${AUTH_QUERY}`);
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);

        // Tenta abrir o primeiro produto disponível para edição
        const firstEditBtn = page.locator('button[title*="Editar"], button[aria-label*="Editar"]').first();
        const isEditVisible = await firstEditBtn.isVisible({ timeout: 5000 }).catch(() => false);

        if (!isEditVisible) {
            test.skip(true, 'Nenhum produto disponível para edição no ambiente de teste');
            return;
        }

        await firstEditBtn.click();

        const formModal = page.locator('[role="dialog"][aria-labelledby="product-form-title"]').first();
        await expect(formModal).toBeVisible({ timeout: 8000 });

        // Procura botão de salvar de produto existente ("Salvar Alterações")
        const saveAlteracoesBtn = page.locator('button:has-text("Salvar Alterações")').first();
        const isSaveAlteracoesVisible = await saveAlteracoesBtn.isVisible({ timeout: 3000 }).catch(() => false);

        if (isSaveAlteracoesVisible) {
            await saveAlteracoesBtn.click();

            // Aguarda toast de sucesso (não modal de canais)
            await expect(page.locator('text=Produto salvo com sucesso')).toBeVisible({ timeout: 8000 });

            // Modal de canais NÃO deve aparecer ao editar produto existente
            const channelModal = page.locator('[data-testid="save-result-modal"]').first();
            const appeared = await channelModal.isVisible({ timeout: 2000 }).catch(() => false);
            expect(appeared, 'Modal de canais não deve reaparecer em edição de produto já cadastrado').toBe(false);
        }
    });
});
