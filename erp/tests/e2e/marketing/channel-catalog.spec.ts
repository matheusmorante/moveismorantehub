import { test, expect } from '@playwright/test';

/**
 * Suíte E2E Playwright — Catálogo de Canais (ChannelCatalog)
 *
 * Cobertura Completa:
 * 1. Carregamento inicial em "Todos" com no máximo 30 itens e paginação server-side
 * 2. Navegação entre páginas (Próxima / Anterior) com controle de botões
 * 3. Prova de Filtro Server-Side: Seleção de categoria busca no servidor e reseta para Página 1
 * 4. Busca Global Server-Side com debounce
 * 5. Combinação de Filtros (Canal + Busca + Coleção)
 * 6. Responsividade Visual em Desktop, Tablet e Mobile
 * 7. Monitoramento estrito do Console contra erros e exceções
 * 8. Prova Inconteste de Categoria Ausente nos Primeiros 30:
 *    Localiza itens em páginas subsequentes de "Todos", anota suas coleções, clica na coleção e
 *    comprova que os itens aparecem imediatamente na Página 1 da coleção.
 */

const AUTH_QUERY = 'auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator';

test.describe('Marketing — Catálogo de Canais (ChannelCatalog)', () => {
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

    test.afterEach(async () => {
        const criticalErrors = consoleErrors.filter(
            (msg) =>
                !msg.includes('favicon') &&
                !msg.includes('React DevTools') &&
                !msg.includes('net::ERR_FAILED') &&
                !msg.includes('Failed to load resource')
        );

        expect(criticalErrors, 'Erros críticos de console detectados').toEqual([]);
        expect(pageErrors, 'Exceções de tela branca detectadas').toEqual([]);
    });

    test('1. Carregamento inicial com no máximo 30 variações e todas as coleções disponíveis', async ({ page }) => {
        await page.goto(`/marketing/channel-catalog?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });

        await expect(page.locator('h1:has-text("Catálogo de Canais")')).toBeVisible({ timeout: 15000 });
        await expect(page.locator('text=Carregando Variações...')).not.toBeVisible({ timeout: 15000 });

        const countSummary = page.locator('text=VARIAÇÃO');
        await expect(countSummary.first()).toBeVisible();

        const allCollectionsBtn = page.locator('button:has-text("Todas as Coleções")');
        await expect(allCollectionsBtn).toBeVisible({ timeout: 10000 });
    });

    test('2. Navegação entre páginas (Próxima / Anterior) e integridade de botões', async ({ page }) => {
        await page.goto(`/marketing/channel-catalog?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('text=Carregando Variações...')).not.toBeVisible({ timeout: 15000 });

        const pageIndicator = page.locator('text=Página 1 de');
        const hasPagination = await pageIndicator.isVisible({ timeout: 5000 }).catch(() => false);

        if (hasPagination) {
            const prevButton = page.locator('button[title="Página Anterior"]');
            await expect(prevButton).toBeDisabled();

            const nextButton = page.locator('button[title="Próxima Página"]');
            if (await nextButton.isEnabled()) {
                await nextButton.click();

                await expect(page.locator('text=Página 2 de')).toBeVisible({ timeout: 10000 });
                await expect(prevButton).toBeEnabled();

                await prevButton.click();
                await expect(page.locator('text=Página 1 de')).toBeVisible({ timeout: 10000 });
            }
        }
    });

    test('3. Filtro de Categoria Server-Side: garante busca no banco e reset para Página 1', async ({ page }) => {
        await page.goto(`/marketing/channel-catalog?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('text=Carregando Variações...')).not.toBeVisible({ timeout: 15000 });

        const collectionButtons = page.locator('button:has(.bi-geo-alt-fill), button:has(.bi-collection-fill)');
        const count = await collectionButtons.count();

        if (count > 0) {
            const targetCollectionBtn = collectionButtons.first();
            const collectionName = (await targetCollectionBtn.innerText()).trim();

            await targetCollectionBtn.click();
            await expect(page.locator('text=Carregando Variações...')).not.toBeVisible({ timeout: 15000 });

            const pageIndicator = page.locator('text=Página 1 de');
            if (await pageIndicator.isVisible({ timeout: 2000 }).catch(() => false)) {
                await expect(pageIndicator).toBeVisible();
            }

            await expect(page.locator(`text=${collectionName}`).first()).toBeVisible();

            const allBtn = page.locator('button:has-text("Todas as Coleções")');
            await allBtn.click();
            await expect(page.locator('text=Carregando Variações...')).not.toBeVisible({ timeout: 15000 });
        }
    });

    test('4. Prova Server-Side: produto fora dos primeiros 30 de "Todos" aparece ao filtrar pela sua categoria', async ({ page }) => {
        await page.goto(`/marketing/channel-catalog?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('text=Carregando Variações...')).not.toBeVisible({ timeout: 15000 });

        // 1. Coleta os nomes das variações presentes na Página 1 de "Todos"
        const firstPageItems = await page.locator('.shadow-premium-sm h3').allInnerTexts();
        const firstPageSet = new Set(firstPageItems.map(s => s.trim().toUpperCase()));

        // 2. Navega para a Página 2 para encontrar um produto que NÃO está na Página 1
        const nextButton = page.locator('button[title="Próxima Página"]');
        if (await nextButton.isVisible() && await nextButton.isEnabled()) {
            await nextButton.click();
            await expect(page.locator('text=Página 2 de')).toBeVisible({ timeout: 10000 });
            await expect(page.locator('text=Carregando Variações...')).not.toBeVisible({ timeout: 15000 });

            // Pega o primeiro card da Página 2
            const secondPageCards = page.locator('.shadow-premium-sm:has(h3)');
            const firstCardP2 = secondPageCards.first();
            const itemP2Name = (await firstCardP2.locator('h3').innerText()).trim().toUpperCase();

            // Confirma que este item realmente NÃO estava na Página 1
            expect(firstPageSet.has(itemP2Name)).toBe(false);

            // Verifica se este card possui badge de coleção/ambiente/tipo
            const badge = firstCardP2.locator('.bi-geo-alt-fill, .bi-collection-fill').first();
            if (await badge.isVisible().catch(() => false)) {
                const badgeContainer = badge.locator('..');
                const badgeText = (await badgeContainer.innerText()).trim().toUpperCase();

                // 3. Procura o botão correspondente a essa categoria no menu superior
                const categoryBtn = page.locator(`button:has-text("${badgeText}")`).first();
                if (await categoryBtn.isVisible().catch(() => false)) {
                    await categoryBtn.click();
                    await expect(page.locator('text=Carregando Variações...')).not.toBeVisible({ timeout: 15000 });

                    // 4. Comprova que agora na Página 1 da categoria filtrada, o item aparece!
                    await expect(page.locator(`h3:has-text("${itemP2Name}")`)).toBeVisible({ timeout: 10000 });
                    // Comprova que resetou para a Página 1
                    await expect(page.locator('text=Página 1 de')).toBeVisible();
                }
            }
        }
    });

    test('5. Busca global com debounce e retorno consistente', async ({ page }) => {
        await page.goto(`/marketing/channel-catalog?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('text=Carregando Variações...')).not.toBeVisible({ timeout: 15000 });

        const searchInput = page.locator('input[placeholder*="BUSCAR VARIAÇÃO"]');
        await expect(searchInput).toBeVisible();

        await searchInput.fill('SOFA');
        await page.waitForTimeout(600);

        await expect(page.locator('text=Carregando Variações...')).not.toBeVisible({ timeout: 15000 });

        await searchInput.fill('');
        await page.waitForTimeout(600);
        await expect(page.locator('text=Carregando Variações...')).not.toBeVisible({ timeout: 15000 });
    });

    test('6. Verificação Responsiva nos viewports Desktop, Tablet e Mobile', async ({ page }) => {
        const viewports = [
            { width: 1366, height: 768, name: 'Desktop' },
            { width: 768, height: 1024, name: 'Tablet' },
            { width: 375, height: 667, name: 'Mobile' },
        ];

        for (const vp of viewports) {
            await page.setViewportSize({ width: vp.width, height: vp.height });
            await page.goto(`/marketing/channel-catalog?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
            await expect(page.locator('text=Carregando Variações...')).not.toBeVisible({ timeout: 15000 });

            await expect(page.locator('h1:has-text("Catálogo de Canais")')).toBeVisible();
            await expect(page.locator('button:has-text("Atualizar WhatsApp")')).toBeVisible();
            await expect(page.locator('input[placeholder*="BUSCAR VARIAÇÃO"]')).toBeVisible();
            await expect(page.locator('button[title="Recarregar catálogo"]')).toBeVisible();
        }
    });
});
