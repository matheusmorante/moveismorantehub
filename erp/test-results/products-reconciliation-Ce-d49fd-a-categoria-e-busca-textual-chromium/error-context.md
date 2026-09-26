# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products\reconciliation.spec.ts >> Central de Conciliação e Saneamento de Produtos >> 2. Filtros compactos: tipo de pendência, categoria e busca textual
- Location: tests\e2e\products\reconciliation.spec.ts:167:5

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "http://localhost:5173/products/reconciliation?auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator", waiting until "load"

```

# Test source

```ts
  34  |         page.on('console', msg => {
  35  |             if (msg.type() === 'error') {
  36  |                 consoleErrors.push(msg.text());
  37  |             }
  38  |         });
  39  | 
  40  |         page.on('pageerror', err => {
  41  |             pageErrors.push(err.message);
  42  |         });
  43  | 
  44  |         await page.route('**/rest/v1/category_attributes*', async route => {
  45  |             await route.fulfill({
  46  |                 status: 200,
  47  |                 contentType: 'application/json',
  48  |                 body: JSON.stringify([{
  49  |                     category_id: 'cat-wardrobe',
  50  |                     attribute_id: 'attr-material',
  51  |                     is_required: true,
  52  |                     attributes: { id: 'attr-material', name: 'Material', data_type: 'list', unit: null }
  53  |                 }])
  54  |             });
  55  |         });
  56  | 
  57  |         await page.route('**/rest/v1/product_variations*', async route => {
  58  |             const request = route.request();
  59  |             if (request.method().toUpperCase() === 'PATCH') {
  60  |                 const payload = request.postDataJSON() as { attributes?: typeof variationAttributes };
  61  |                 if (payload.attributes) variationAttributes = payload.attributes;
  62  |             }
  63  |             await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  64  |         });
  65  | 
  66  |         await page.route('**/rest/v1/products*', async route => {
  67  |             if (route.request().method().toUpperCase() === 'PATCH') {
  68  |                 await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  69  |                 return;
  70  |             }
  71  | 
  72  |             await route.fulfill({
  73  |                 status: 200,
  74  |                 headers: { 'content-range': '0-0/1' },
  75  |                 contentType: 'application/json',
  76  |                 body: JSON.stringify([{
  77  |                     id: 'prod-wardrobe-TEST_AUT',
  78  |                     code: 'TEST_AUT_GR_001',
  79  |                     sku: 'TEST_AUT_GR_001',
  80  |                     name: '[TESTE_AUT] Guarda-Roupa',
  81  |                     description: '[TESTE_AUT] Guarda-Roupa',
  82  |                     category: 'Guarda-Roupas',
  83  |                     category_id: 'cat-wardrobe',
  84  |                     main_supplier_id: 'supplier-TEST_AUT',
  85  |                     supplier_id: 'supplier-TEST_AUT',
  86  |                     supplier_ids: ['supplier-TEST_AUT'],
  87  |                     price: 999,
  88  |                     fiscal: { ncm: '94035000' },
  89  |                     product_categories: [{
  90  |                         category_id: 'cat-wardrobe',
  91  |                         categories: { id: 'cat-wardrobe', name: 'Guarda-Roupas' }
  92  |                     }],
  93  |                     product_variations: [{
  94  |                         id: 'variation-TEST_AUT',
  95  |                         sku: 'TEST_AUT_GR_001-01',
  96  |                         name: '[TESTE_AUT] Guarda-Roupa Branco',
  97  |                         price: 999,
  98  |                         use_parent_price: true,
  99  |                         attributes: variationAttributes,
  100 |                         active: true,
  101 |                         status: 'published'
  102 |                     }]
  103 |                 }])
  104 |             });
  105 |         });
  106 | 
  107 |         await page.route('**/rest/v1/people*', async route => {
  108 |             await route.fulfill({
  109 |                 status: 200,
  110 |                 contentType: 'application/json',
  111 |                 body: JSON.stringify([{
  112 |                     id: 'supplier-TEST_AUT',
  113 |                     full_name: '[TESTE_AUT] Fornecedor',
  114 |                     social_name: '[TESTE_AUT] Fornecedor',
  115 |                     nickname: 'Fornecedor Teste'
  116 |                 }])
  117 |             });
  118 |         });
  119 | 
  120 |         await page.route('**/rest/v1/categories*', async route => {
  121 |             await route.fulfill({
  122 |                 status: 200,
  123 |                 contentType: 'application/json',
  124 |                 body: JSON.stringify([{ id: 'cat-wardrobe', name: 'Guarda-Roupas' }])
  125 |             });
  126 |         });
  127 |         await page.route('**/rest/v1/environments*', async route => {
  128 |             await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  129 |         });
  130 |         await page.route('**/rest/v1/environment_categories*', async route => {
  131 |             await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  132 |         });
  133 | 
> 134 |         await page.goto(`/products/reconciliation?${AUTH_QUERY}`);
      |                    ^ Error: page.goto: Test timeout of 30000ms exceeded.
  135 |         await page.waitForLoadState('domcontentloaded');
  136 |     });
  137 | 
  138 |     test.afterEach(async () => {
  139 |         const criticalErrors = consoleErrors.filter(msg =>
  140 |             !msg.includes('favicon') &&
  141 |             !msg.includes('React DevTools') &&
  142 |             !msg.includes('net::ERR_FAILED') &&
  143 |             !msg.includes('Failed to load resource')
  144 |         );
  145 |         expect(criticalErrors, 'Erros críticos de console detectados').toEqual([]);
  146 |         expect(pageErrors, 'Exceções de tela branca detectadas').toEqual([]);
  147 |     });
  148 | 
  149 |     test('1. Carregamento inicial da tela com header, métricas compactas e chips rápidos', async ({ page }) => {
  150 |         // Título e subtítulo da nova Central de Conciliação
  151 |         await expect(page.getByRole('heading', { name: /conciliação de produtos/i })).toBeVisible({ timeout: 15000 });
  152 |         await expect(page.getByText('Corrija campos obrigatórios e inconsistências do cadastro.')).toBeVisible();
  153 | 
  154 |         // Cards compactos de métricas no topo
  155 |         await expect(page.getByText(/produtos/i).first()).toBeVisible();
  156 |         await expect(page.getByText(/pendências/i).first()).toBeVisible();
  157 | 
  158 |         // Chips rápidos de filtro
  159 |         await expect(page.getByRole('button', { name: /todos/i })).toBeVisible();
  160 |         await expect(page.getByRole('button', { name: /fornecedor/i })).toBeVisible();
  161 |         await expect(page.getByRole('button', { name: /categoria/i })).toBeVisible();
  162 |         await expect(page.getByRole('button', { name: /ncm/i })).toBeVisible();
  163 |         await expect(page.getByRole('button', { name: /atributos/i })).toBeVisible();
  164 |         await expect(page.getByRole('button', { name: /preço/i })).toBeVisible();
  165 |     });
  166 | 
  167 |     test('2. Filtros compactos: tipo de pendência, categoria e busca textual', async ({ page }) => {
  168 |         // Dropdown de tipo de pendência
  169 |         const typeSelect = page.locator('select').first();
  170 |         await expect(typeSelect).toBeVisible();
  171 | 
  172 |         // Categoria autocomplete
  173 |         const categoryInput = page.getByPlaceholder('Todas as categorias');
  174 |         await expect(categoryInput).toBeVisible();
  175 | 
  176 |         // Busca por produto
  177 |         const searchInput = page.getByPlaceholder('Nome, SKU ou código...');
  178 |         await expect(searchInput).toBeVisible();
  179 | 
  180 |         // Testar digitação no campo de busca com debounce
  181 |         await searchInput.fill('Armário');
  182 |         // Botão de limpar filtros deve aparecer
  183 |         const clearBtn = page.getByRole('button', { name: /limpar filtros/i });
  184 |         if (await clearBtn.isVisible()) {
  185 |             await clearBtn.click();
  186 |             await expect(searchInput).toHaveValue('');
  187 |         }
  188 |     });
  189 | 
  190 |     test('3. Card orientado a pendências: exibe apenas campos problemáticos sem colunas estáticas', async ({ page }) => {
  191 |         // Se houver produtos na lista, verifica que o layout é por cards/accordions e não tabela gigante
  192 |         const productCards = page.locator('div[class*="rounded-3xl border"]');
  193 |         const cardCount = await productCards.count();
  194 | 
  195 |         if (cardCount > 0) {
  196 |             const firstCard = productCards.first();
  197 |             await expect(firstCard).toBeVisible();
  198 | 
  199 |             // Deve conter indicador de pendências
  200 |             const pendencyBadge = firstCard.locator('text=/\\d+ pendência/');
  201 |             if (await pendencyBadge.isVisible()) {
  202 |                 await expect(pendencyBadge).toBeVisible();
  203 |             }
  204 | 
  205 |             // Seções de pendências (Pai ou Variação) devem renderizar apenas os inputs necessários
  206 |             const parentSection = firstCard.locator('text=Pendências do Produto (Pai)');
  207 |             if (await parentSection.isVisible()) {
  208 |                 await expect(parentSection).toBeVisible();
  209 |             }
  210 |         }
  211 |     });
  212 | 
  213 |     test('4. Seleção e Barra de Ações em Lote (Sticky Batch Bar)', async ({ page }) => {
  214 |         // Checkbox de seleção na página
  215 |         const selectAllCheckbox = page.locator('input[type="checkbox"]').first();
  216 |         if (await selectAllCheckbox.isVisible()) {
  217 |             await selectAllCheckbox.click();
  218 | 
  219 |             // Ao selecionar, a barra em lote deve surgir
  220 |             const batchBar = page.locator('text=/produto.*selecionado/');
  221 |             if (await batchBar.isVisible()) {
  222 |                 await expect(batchBar).toBeVisible();
  223 | 
  224 |                 // Botões de lote disponíveis
  225 |                 await expect(page.getByRole('button', { name: /fornecedor/i }).last()).toBeVisible();
  226 |                 await expect(page.getByRole('button', { name: /categoria/i }).last()).toBeVisible();
  227 |                 await expect(page.getByRole('button', { name: /ncm/i }).last()).toBeVisible();
  228 | 
  229 |                 // Clicar em Desmarcar
  230 |                 const desmarcarBtn = page.getByRole('button', { name: /desmarcar/i });
  231 |                 if (await desmarcarBtn.isVisible()) {
  232 |                     await desmarcarBtn.click();
  233 |                     await expect(batchBar).not.toBeVisible();
  234 |                 }
```