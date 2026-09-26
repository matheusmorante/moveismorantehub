# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: marketing\channel-catalog.spec.ts >> Marketing — Catálogo de Canais (ChannelCatalog) >> 3. Filtro de Categoria Server-Side: garante busca no banco e reset para Página 1
- Location: tests\e2e\marketing\channel-catalog.spec.ts:90:5

# Error details

```
Error: Erros críticos de console detectados

expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "Catalog ID não configurado.",
+ ]
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - region "Notifications Alt+T"
    - main [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6]:
          - generic [ref=e7]:
            - heading "Catálogo de Canais" [level=1] [ref=e8]
            - paragraph [ref=e9]: Variações publicadas por coleção
          - generic [ref=e10]:
            - button " Atualizar WhatsApp" [disabled] [ref=e11]:
              - generic [ref=e12]: 
              - text: Atualizar WhatsApp
            - generic [ref=e13]:
              - generic [ref=e14]: 
              - textbox "BUSCAR VARIAÇÃO OU SKU..." [ref=e15]
            - combobox [ref=e16] [cursor=pointer]:
              - option "TODOS OS CANAIS" [selected]
              - option "WHATSAPP SHOP"
              - option "CATÁLOGO DIGITAL"
            - button "" [ref=e17] [cursor=pointer]
        - generic [ref=e20]:
          - generic [ref=e21]:
            - generic [ref=e22]: 
            - generic [ref=e24]:
              - heading "Coleções do Catálogo Meta" [level=3] [ref=e25]
              - paragraph [ref=e26]: Product Sets no WhatsApp Business
          - button " Gerenciar Coleções Meta" [ref=e27] [cursor=pointer]:
            - generic [ref=e28]: 
            - text: Gerenciar Coleções Meta
        - generic [ref=e29]:
          - button " Produtos" [ref=e30] [cursor=pointer]:
            - generic [ref=e31]: 
            - text: Produtos
          - button " Design & Cores" [ref=e32] [cursor=pointer]:
            - generic [ref=e33]: 
            - text: Design & Cores
          - button " Banners" [ref=e34] [cursor=pointer]:
            - generic [ref=e35]: 
            - text: Banners
          - button " Oportunidades" [ref=e36] [cursor=pointer]:
            - generic [ref=e37]: 
            - text: Oportunidades
          - button " Configurações" [ref=e38] [cursor=pointer]:
            - generic [ref=e39]: 
            - text: Configurações
        - generic [ref=e40]:
          - generic [ref=e41]:
            - button "Todas as Coleções" [active] [ref=e42] [cursor=pointer]
            - button " COZINHA" [ref=e43] [cursor=pointer]:
              - generic [ref=e44]: 
              - text: COZINHA
            - button " QUARTO" [ref=e45] [cursor=pointer]:
              - generic [ref=e46]: 
              - text: QUARTO
            - button " SALA DE JANTAR" [ref=e47] [cursor=pointer]:
              - generic [ref=e48]: 
              - text: SALA DE JANTAR
          - paragraph [ref=e51]: Carregando Variações...
          - generic [ref=e52]:
            - button "" [disabled] [ref=e53]
            - generic [ref=e55]: Página 1 de 2
            - button "" [disabled] [ref=e56]
    - generic [ref=e59]:
      - generic:
        - generic:
          - generic: Seu Lizandro
          - generic: Agente IA do ERP
      - button "Abrir chat do Seu Lizandro, Agente Inteligente do ERP" [ref=e60] [cursor=pointer]:
        - img "Seu Lizandro - Agente IA" [ref=e62]
  - region "Notifications Alt+T"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | /**
  4   |  * Suíte E2E Playwright — Catálogo de Canais (ChannelCatalog)
  5   |  *
  6   |  * Cobertura Completa:
  7   |  * 1. Carregamento inicial em "Todos" com no máximo 30 itens e paginação server-side
  8   |  * 2. Navegação entre páginas (Próxima / Anterior) com controle de botões
  9   |  * 3. Prova de Filtro Server-Side: Seleção de categoria busca no servidor e reseta para Página 1
  10  |  * 4. Busca Global Server-Side com debounce
  11  |  * 5. Combinação de Filtros (Canal + Busca + Coleção)
  12  |  * 6. Responsividade Visual em Desktop, Tablet e Mobile
  13  |  * 7. Monitoramento estrito do Console contra erros e exceções
  14  |  * 8. Prova Inconteste de Categoria Ausente nos Primeiros 30:
  15  |  *    Localiza itens em páginas subsequentes de "Todos", anota suas coleções, clica na coleção e
  16  |  *    comprova que os itens aparecem imediatamente na Página 1 da coleção.
  17  |  */
  18  | 
  19  | const AUTH_QUERY = 'auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator';
  20  | 
  21  | test.describe('Marketing — Catálogo de Canais (ChannelCatalog)', () => {
  22  |     let consoleErrors: string[] = [];
  23  |     let pageErrors: string[] = [];
  24  | 
  25  |     test.beforeEach(async ({ page }) => {
  26  |         consoleErrors = [];
  27  |         pageErrors = [];
  28  | 
  29  |         page.on('console', (msg) => {
  30  |             if (msg.type() === 'error') {
  31  |                 consoleErrors.push(msg.text());
  32  |             }
  33  |         });
  34  | 
  35  |         page.on('pageerror', (err) => {
  36  |             pageErrors.push(err.message);
  37  |         });
  38  |     });
  39  | 
  40  |     test.afterEach(async () => {
  41  |         const criticalErrors = consoleErrors.filter(
  42  |             (msg) =>
  43  |                 !msg.includes('favicon') &&
  44  |                 !msg.includes('React DevTools') &&
  45  |                 !msg.includes('net::ERR_FAILED') &&
  46  |                 !msg.includes('Failed to load resource')
  47  |         );
  48  | 
> 49  |         expect(criticalErrors, 'Erros críticos de console detectados').toEqual([]);
      |                                                                        ^ Error: Erros críticos de console detectados
  50  |         expect(pageErrors, 'Exceções de tela branca detectadas').toEqual([]);
  51  |     });
  52  | 
  53  |     test('1. Carregamento inicial com no máximo 30 variações e todas as coleções disponíveis', async ({ page }) => {
  54  |         await page.goto(`/marketing/channel-catalog?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
  55  | 
  56  |         await expect(page.locator('h1:has-text("Catálogo de Canais")')).toBeVisible({ timeout: 15000 });
  57  |         await expect(page.locator('text=Carregando Variações...')).not.toBeVisible({ timeout: 15000 });
  58  | 
  59  |         const countSummary = page.locator('text=VARIAÇÃO');
  60  |         await expect(countSummary.first()).toBeVisible();
  61  | 
  62  |         const allCollectionsBtn = page.locator('button:has-text("Todas as Coleções")');
  63  |         await expect(allCollectionsBtn).toBeVisible({ timeout: 10000 });
  64  |     });
  65  | 
  66  |     test('2. Navegação entre páginas (Próxima / Anterior) e integridade de botões', async ({ page }) => {
  67  |         await page.goto(`/marketing/channel-catalog?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
  68  |         await expect(page.locator('text=Carregando Variações...')).not.toBeVisible({ timeout: 15000 });
  69  | 
  70  |         const pageIndicator = page.locator('text=Página 1 de');
  71  |         const hasPagination = await pageIndicator.isVisible({ timeout: 5000 }).catch(() => false);
  72  | 
  73  |         if (hasPagination) {
  74  |             const prevButton = page.locator('button[title="Página Anterior"]');
  75  |             await expect(prevButton).toBeDisabled();
  76  | 
  77  |             const nextButton = page.locator('button[title="Próxima Página"]');
  78  |             if (await nextButton.isEnabled()) {
  79  |                 await nextButton.click();
  80  | 
  81  |                 await expect(page.locator('text=Página 2 de')).toBeVisible({ timeout: 10000 });
  82  |                 await expect(prevButton).toBeEnabled();
  83  | 
  84  |                 await prevButton.click();
  85  |                 await expect(page.locator('text=Página 1 de')).toBeVisible({ timeout: 10000 });
  86  |             }
  87  |         }
  88  |     });
  89  | 
  90  |     test('3. Filtro de Categoria Server-Side: garante busca no banco e reset para Página 1', async ({ page }) => {
  91  |         await page.goto(`/marketing/channel-catalog?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
  92  |         await expect(page.locator('text=Carregando Variações...')).not.toBeVisible({ timeout: 15000 });
  93  | 
  94  |         const collectionButtons = page.locator('button:has(.bi-geo-alt-fill), button:has(.bi-collection-fill)');
  95  |         const count = await collectionButtons.count();
  96  | 
  97  |         if (count > 0) {
  98  |             const targetCollectionBtn = collectionButtons.first();
  99  |             const collectionName = (await targetCollectionBtn.innerText()).trim();
  100 | 
  101 |             await targetCollectionBtn.click();
  102 |             await expect(page.locator('text=Carregando Variações...')).not.toBeVisible({ timeout: 15000 });
  103 | 
  104 |             const pageIndicator = page.locator('text=Página 1 de');
  105 |             if (await pageIndicator.isVisible({ timeout: 2000 }).catch(() => false)) {
  106 |                 await expect(pageIndicator).toBeVisible();
  107 |             }
  108 | 
  109 |             await expect(page.locator(`text=${collectionName}`).first()).toBeVisible();
  110 | 
  111 |             const allBtn = page.locator('button:has-text("Todas as Coleções")');
  112 |             await allBtn.click();
  113 |             await expect(page.locator('text=Carregando Variações...')).not.toBeVisible({ timeout: 15000 });
  114 |         }
  115 |     });
  116 | 
  117 |     test('4. Prova Server-Side: produto fora dos primeiros 30 de "Todos" aparece ao filtrar pela sua categoria', async ({ page }) => {
  118 |         await page.goto(`/marketing/channel-catalog?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
  119 |         await expect(page.locator('text=Carregando Variações...')).not.toBeVisible({ timeout: 15000 });
  120 | 
  121 |         // 1. Coleta os nomes das variações presentes na Página 1 de "Todos"
  122 |         const firstPageItems = await page.locator('.shadow-premium-sm h3').allInnerTexts();
  123 |         const firstPageSet = new Set(firstPageItems.map(s => s.trim().toUpperCase()));
  124 | 
  125 |         // 2. Navega para a Página 2 para encontrar um produto que NÃO está na Página 1
  126 |         const nextButton = page.locator('button[title="Próxima Página"]');
  127 |         if (await nextButton.isVisible() && await nextButton.isEnabled()) {
  128 |             await nextButton.click();
  129 |             await expect(page.locator('text=Página 2 de')).toBeVisible({ timeout: 10000 });
  130 |             await expect(page.locator('text=Carregando Variações...')).not.toBeVisible({ timeout: 15000 });
  131 | 
  132 |             // Pega o primeiro card da Página 2
  133 |             const secondPageCards = page.locator('.shadow-premium-sm:has(h3)');
  134 |             const firstCardP2 = secondPageCards.first();
  135 |             const itemP2Name = (await firstCardP2.locator('h3').innerText()).trim().toUpperCase();
  136 | 
  137 |             // Confirma que este item realmente NÃO estava na Página 1
  138 |             expect(firstPageSet.has(itemP2Name)).toBe(false);
  139 | 
  140 |             // Verifica se este card possui badge de coleção/ambiente/tipo
  141 |             const badge = firstCardP2.locator('.bi-geo-alt-fill, .bi-collection-fill').first();
  142 |             if (await badge.isVisible().catch(() => false)) {
  143 |                 const badgeContainer = badge.locator('..');
  144 |                 const badgeText = (await badgeContainer.innerText()).trim().toUpperCase();
  145 | 
  146 |                 // 3. Procura o botão correspondente a essa categoria no menu superior
  147 |                 const categoryBtn = page.locator(`button:has-text("${badgeText}")`).first();
  148 |                 if (await categoryBtn.isVisible().catch(() => false)) {
  149 |                     await categoryBtn.click();
```