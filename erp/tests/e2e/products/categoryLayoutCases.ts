import { expect, test } from '@playwright/test';

export function registerCategoryLayoutCases(): void {
    // ==========================================
    // CENÁRIO 15 — Accordion dos Ambientes
    // ==========================================
    test('Cenário 15 — Accordion dos Ambientes: recolher e expandir sem alterar vínculos', async ({ page }) => {
        const salaRow = page.locator('div[data-testid^="environment-row-env-sala"]');
        const collapseBtn = salaRow.locator('button[title="Recolher ambiente"]');

        await expect(salaRow.locator('text=SOFÁ COM PRODUTOS')).toBeVisible();

        // Recolher
        await collapseBtn.click();
        await expect(salaRow.locator('text=SOFÁ COM PRODUTOS')).not.toBeVisible();

        // Expandir novamente
        const expandBtn = salaRow.locator('button[title="Expandir ambiente"]');
        await expandBtn.click();
        await expect(salaRow.locator('text=SOFÁ COM PRODUTOS')).toBeVisible();
    });

    // ==========================================
    // CENÁRIO 16 — Indicador "+N" de Ambientes
    // ==========================================
    test('Cenário 16 — Indicador "+N" de Ambientes exibe badge resumido com tooltip', async ({ page }) => {
        await page.getByTestId('tab-view-categoria').click();

        const multiRow = page.locator('tr[data-testid^="category-row-cat-multi-env"]');
        await expect(multiRow).toBeVisible();

        // Cadeira Multi está em 4 ambientes -> deve exibir os 3 primeiros e um badge "+1"
        const plusBadge = multiRow.locator('span:has-text("+1")');
        await expect(plusBadge).toBeVisible();
        await expect(plusBadge).toHaveAttribute('title', /JARDIM/);
    });

    // ==========================================
    // CENÁRIO 17 — Responsividade
    // ==========================================
    test('Cenário 17 — Responsividade em Desktop, Tablet e Mobile (cards sem scroll horizontal)', async ({ page }) => {
        // Desktop
        await page.setViewportSize({ width: 1280, height: 800 });
        await expect(page.locator('h1:has-text("Ambientes e Categorias")')).toBeVisible();

        // Tablet
        await page.setViewportSize({ width: 768, height: 1024 });
        await expect(page.locator('h1:has-text("Ambientes e Categorias")')).toBeVisible();

        // Mobile
        await page.setViewportSize({ width: 375, height: 667 });
        await expect(page.locator('h1:has-text("Ambientes e Categorias")')).toBeVisible();

        // Na aba Categorias em Mobile, deve exibir cards em vez de tabela oculta
        await page.getByTestId('tab-view-categoria').click();
        const mobileCard = page.locator('div.flex.md\\:hidden').first();
        await expect(mobileCard).toBeVisible();
    });
}
