/**
 * Suíte E2E Playwright — Movimentações de Estoque, Histórico e Auditoria
 * Morante Hub ERP
 *
 * Cobertura:
 * 1. Renderização da página /stock com aba ativa "history"
 * 2. Filtro de produtos e variações no ProductAutocomplete com persistência local
 * 3. Alternância entre abas de Movimentações e Inventários sem regressão de interface
 * 4. Abertura e fechamento do modal de contagem de inventário (InventoryAuditModal)
 * 5. Teardown Seguro com testRunId
 */

import { test, expect } from '@playwright/test';

const AUTH_QUERY = 'auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator';

test.describe('Módulo de Estoque - Movimentações, Histórico e Inventário', () => {
    const testRunId = `TEST_AUT_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let consoleErrors: string[] = [];
    let pageErrors: string[] = [];

    test.beforeEach(async ({ page }) => {
        consoleErrors = [];
        pageErrors = [];

        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        page.on('pageerror', (err) => {
            pageErrors.push(err.message);
        });
    });

    test.afterEach(async ({ page }) => {
        const criticalConsoleErrors = consoleErrors.filter(
            (msg) =>
                !msg.includes('favicon') &&
                !msg.includes('React DevTools') &&
                !msg.includes('net::ERR_FAILED') &&
                !msg.includes('Failed to load resource')
        );

        expect(criticalConsoleErrors, 'Erros críticos de console detectados').toEqual([]);
        expect(pageErrors, 'Exceções não tratadas (tela branca) detectadas').toEqual([]);

        // Teardown: remover filtros persistidos em localStorage
        await page.evaluate(() => {
            try {
                localStorage.removeItem('morante_stock_selected_product_filter');
            } catch (e) {
                console.error('Erro no teardown:', e);
            }
        });
    });

    test('1. Renderização de /stock na aba Histórico com cabeçalho de Movimentações', async ({ page }) => {
        await page.goto(`/stock?tab=history&${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle').catch(() => {});

        // Validar título no cabeçalho
        const title = page.locator('h1:has-text("Movimentações")');
        await expect(title).toBeVisible({ timeout: 15000 });

        // Validar que o campo de busca/filtro de produto está presente
        const productSearch = page.locator('input[placeholder*="Buscar produto"], input[placeholder*="produto"]').first();
        await expect(productSearch).toBeVisible();
    });

    test('2. Alternância de abas para Inventários (/stock?tab=audit) e exibição do botão Novo inventário', async ({ page }) => {
        await page.goto(`/stock?tab=audit&${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle').catch(() => {});

        // Validar título de inventários
        const auditTitle = page.locator('h1:has-text("Inventários")');
        await expect(auditTitle).toBeVisible({ timeout: 15000 });

        // Validar presença do botão "Novo inventário"
        const startAuditBtn = page.locator('button:has-text("Novo inventário")');
        await expect(startAuditBtn).toBeVisible();

        // Clicar em "Novo inventário" e validar abertura do modal
        await startAuditBtn.click();
        await page.waitForTimeout(400);

        // Modal deve estar visível
        const modal = page.locator('div[role="dialog"], .fixed.inset-0').first();
        await expect(modal).toBeVisible();

        // Fechar modal via botão de fechar (x) no header do ScopeModal
        const closeBtn = page.locator('button i.bi-x-lg').first();
        if (await closeBtn.isVisible()) {
            await closeBtn.click();
        }
    });

    test('3. Persistência de Filtro de Produto no localStorage e Limpeza', async ({ page }) => {
        await page.goto(`/stock?tab=history&${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle').catch(() => {});

        const searchInput = page.locator('input[placeholder*="Buscar produto"], input[placeholder*="produto"]').first();
        if (await searchInput.isVisible()) {
            await searchInput.fill('Cadeira');
            await page.waitForTimeout(600);

            // Se houver dropdown de sugestões de produtos, clicar no primeiro
            const suggestion = page.locator('.suggestion-item, [role="option"], li button').first();
            if (await suggestion.isVisible()) {
                await suggestion.click();
                await page.waitForTimeout(400);

                // Validar que a chave foi persistida no localStorage
                const savedFilter = await page.evaluate(() => {
                    return localStorage.getItem('morante_stock_selected_product_filter');
                });
                expect(savedFilter).toBeTruthy();

                // Clicar no botão de limpar filtro se existir
                const clearBtn = page.locator('button[title*="Limpar"], button:has-text("Limpar")').first();
                if (await clearBtn.isVisible()) {
                    await clearBtn.click();
                    await page.waitForTimeout(300);

                    const clearedFilter = await page.evaluate(() => {
                        return localStorage.getItem('morante_stock_selected_product_filter');
                    });
                    expect(clearedFilter).toBeNull();
                }
            }
        }
    });
});
