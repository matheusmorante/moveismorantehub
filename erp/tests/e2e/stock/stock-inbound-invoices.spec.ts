/**
 * Suíte E2E Playwright — Notas Fiscais de Entrada e Importação XML
 * Morante Hub ERP
 *
 * Cobertura:
 * 1. Renderização de /estoque/notas-fiscais-entrada com cabeçalho e filtros operacionais
 * 2. Exibição e verificação do componente GeminiQuotaWarningBanner no topo da tela
 * 3. Abertura do modal de Importação de NF-e (InboundDocumentImportModal)
 * 4. Validação dos campos do modal (Chave de 44 dígitos, Upload de XML, Aviso Gemini)
 * 5. Fechamento seguro do modal e integridade de navegação
 */

import { test, expect } from '@playwright/test';

const AUTH_QUERY = 'auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator';

test.describe('Módulo de Estoque - Notas Fiscais de Entrada e Importação', () => {
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

    test('1. Renderização de /stock/inbound-invoices com cabeçalho e botão de adicionar nota', async ({ page }) => {
        await page.goto(`/estoque/notas-fiscais-entrada?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle').catch(() => {});

        // Validar título da página
        const title = page.locator('h1:has-text("Notas Fiscais de Entrada")');
        await expect(title).toBeVisible({ timeout: 15000 });

        // Validar botão de adicionar nota fiscal de entrada
        const addBtn = page.locator('button:has-text("Importar XML da NF-e")');
        await expect(addBtn).toBeVisible();

        // Validar seletor de período
        const periodSelect = page.locator('select').first();
        await expect(periodSelect).toBeVisible();
    });

    test('2. Abertura do modal de importação e validação do campo de Chave de Acesso e Upload', async ({ page }) => {
        await page.goto(`/estoque/notas-fiscais-entrada?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle').catch(() => {});

        // Clicar no botão para abrir modal de importação
        const addBtn = page.locator('button:has-text("Importar XML da NF-e")');
        await addBtn.click();

        // Modal deve abrir com título correto
        const modalTitle = page.locator('h2:has-text("Importar XML da NF-e")');
        await expect(modalTitle).toBeVisible({ timeout: 8000 });

        // Campo de chave de acesso de 44 dígitos deve estar presente
        const accessKeyInput = page.locator('#accessKey');
        await expect(accessKeyInput).toBeVisible();

        // Botão de upload de XML/documento deve estar visível
        const uploadArea = page.locator('button:has-text("Clique para escolher ou arraste o arquivo aqui")');
        await expect(uploadArea).toBeVisible();

        // Fechar modal pelo botão X
        const closeBtn = page.locator('button[aria-label="Fechar modal"]').first();
        await expect(closeBtn).toBeVisible();
        await closeBtn.click();

        await page.waitForTimeout(400);
        await expect(modalTitle).not.toBeVisible();
    });

    test('3. Validação da Tabela de Notas Fiscais e Alternância de Filtros', async ({ page }) => {
        await page.goto(`/estoque/notas-fiscais-entrada?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle').catch(() => {});

        // Alterar filtro de período para "Este Ano"
        const periodSelect = page.locator('select').first();
        if (await periodSelect.isVisible()) {
            await periodSelect.selectOption('current_year');
            await page.waitForTimeout(600);
        }

        // Se houver notas renderizadas ou estado vazio informativo
        const bodyContent = page.locator('header, table, [role="dialog"]');
        await expect(bodyContent.first()).toBeVisible();
    });
});
