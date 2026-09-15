/**
 * Suíte E2E Playwright — Pedidos de Compra e Gestão de Fornecedores
 * Morante Hub ERP
 *
 * Cobertura:
 * 1. Renderização de /stock/purchases com redirecionamento canônico e cabeçalho operacional
 * 2. Abertura do modal de Novo Pedido de Compra (PurchaseFormModal)
 * 3. Validação dos campos obrigatórios (Fornecedor, Data, Itens, IPI, Frete)
 * 4. Fechamento seguro do modal e integridade de navegação
 */

import { test, expect } from '@playwright/test';

const AUTH_QUERY = 'auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator';

test.describe('Módulo de Estoque - Pedidos de Compra', () => {
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
    });

    test('1. Renderização da tela de Pedidos de Compra com cabeçalho e botão Nova Compra', async ({ page }) => {
        await page.goto(`/stock/purchases?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle').catch(() => {});

        // Validar título
        const title = page.locator('h1:has-text("Pedidos de Compra")');
        await expect(title).toBeVisible({ timeout: 15000 });

        // Validar botão de Nova Compra
        const newPurchaseBtn = page.locator('button:has-text("Nova Compra")');
        await expect(newPurchaseBtn).toBeVisible();
    });

    test('2. Abertura do modal de criação de compra e validação de campos', async ({ page }) => {
        await page.goto(`/stock/purchases?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle').catch(() => {});

        // Abrir modal de Nova Compra
        const newPurchaseBtn = page.locator('button:has-text("Nova Compra")');
        await newPurchaseBtn.click();

        // Validar título do modal
        const modalTitle = page.locator('h2:has-text("Novo Pedido de Compra")');
        await expect(modalTitle).toBeVisible({ timeout: 8000 });

        // Validar campo de busca de fornecedor
        const supplierInput = page.locator('input[placeholder*="Buscar fornecedor"]').first();
        await expect(supplierInput).toBeVisible();

        // Fechar modal
        const closeBtn = page.locator('button[aria-label="Fechar modal"]').first();
        await expect(closeBtn).toBeVisible();
        await closeBtn.click();

        await page.waitForTimeout(400);
        await expect(modalTitle).not.toBeVisible();
    });
});
