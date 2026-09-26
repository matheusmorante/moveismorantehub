# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: stock\label-printing.spec.ts >> Suíte E2E B2B - Módulo de Etiquetas (Label Printing) >> Cenário 1: Acesso e Renderização Inicial (Aba Identificação)
- Location: tests\e2e\stock\label-printing.spec.ts:72:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('h1').filter({ hasText: 'Etiqueta de Identificação do Produto' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('h1').filter({ hasText: 'Etiqueta de Identificação do Produto' }) with timeout 10000ms
  - waiting for locator('h1').filter({ hasText: 'Etiqueta de Identificação do Produto' })

```

```yaml
- region "Notifications Alt+T"
- main:
  - text: 
  - heading "Etiquetas de Logotipo e Rótulo" [level=1]
  - text: "Modelo: 4 Etiquetas (Retangular) (2x2) • Folha A4"
  - button ""
  - heading "Gerenciar Etiquetas" [level=3]
  - paragraph: Organize e configure seus ativos para impressão
  - button " Biblioteca"
  - text: 
  - paragraph: Nenhuma etiqueta adicionada
  - paragraph: Busque um produto acima para começar a montar a impressão.
  - heading "Preview" [level=3]
  - button "Página anterior" [disabled]: 
  - text: 1/1
  - button "Próxima página" [disabled]: 
  - button "Diminuir zoom": 
  - text: 60%
  - button "Aumentar zoom": 
  - button "Ações do preview": 
- text: Seu Lizandro Agente IA do ERP
- button "Abrir chat do Seu Lizandro, Agente Inteligente do ERP":
  - img "Seu Lizandro - Agente IA"
- region "Notifications Alt+T"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Suíte E2E B2B - Módulo de Etiquetas (Label Printing)', () => {
  4   |     const AUTH_QUERY = 'auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator';
  5   |     let consoleErrors: string[] = [];
  6   |     let pageErrors: string[] = [];
  7   | 
  8   |     test.beforeEach(async ({ page }) => {
  9   |         consoleErrors = [];
  10  |         pageErrors = [];
  11  | 
  12  |         page.on('console', msg => {
  13  |             if (msg.type() === 'error') {
  14  |                 consoleErrors.push(msg.text());
  15  |             }
  16  |         });
  17  | 
  18  |         page.on('pageerror', err => {
  19  |             pageErrors.push(err.message);
  20  |         });
  21  | 
  22  |         // Mock das chamadas Supabase para busca de produtos
  23  |         await page.route('**/rest/v1/products*', async route => {
  24  |             if (route.request().method() === 'OPTIONS') {
  25  |                 await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*' }});
  26  |                 return;
  27  |             }
  28  |             await route.fulfill({ 
  29  |                 status: 200, 
  30  |                 contentType: 'application/json',
  31  |                 headers: { 'Access-Control-Allow-Origin': '*' },
  32  |                 body: JSON.stringify([{
  33  |                     id: 'mock-prod-1',
  34  |                     name: 'Produto Teste Automacao [TESTE_AUT]',
  35  |                     reference_code: 'REF-TEST-001',
  36  |                     stock_quantity: 10,
  37  |                     cash_price: 150.00,
  38  |                     retail_price: 199.99,
  39  |                     images: []
  40  |                 }]) 
  41  |             });
  42  |         });
  43  | 
  44  |         await page.route('**/rest/v1/product_variations*', async route => {
  45  |             if (route.request().method() === 'OPTIONS') {
  46  |                 await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*' }});
  47  |                 return;
  48  |             }
  49  |             await route.fulfill({ 
  50  |                 status: 200, 
  51  |                 contentType: 'application/json',
  52  |                 headers: { 'Access-Control-Allow-Origin': '*' },
  53  |                 body: JSON.stringify([]) 
  54  |             });
  55  |         });
  56  | 
  57  |         await page.goto(`/estoque/etiquetas?${AUTH_QUERY}`);
  58  |         await page.waitForLoadState('domcontentloaded');
  59  |     });
  60  | 
  61  |     test.afterEach(async () => {
  62  |         const realErrors = consoleErrors.filter(e => 
  63  |             !e.includes('favicon') && 
  64  |             !e.includes('Download the React DevTools') &&
  65  |             !e.includes('net::ERR_CONNECTION_REFUSED') &&
  66  |             !e.includes('has been blocked by CORS policy')
  67  |         );
  68  |         expect(realErrors, 'Erros críticos de console detectados').toEqual([]);
  69  |         expect(pageErrors, 'Exceções de tela branca detectadas').toEqual([]);
  70  |     });
  71  | 
  72  |     test('Cenário 1: Acesso e Renderização Inicial (Aba Identificação)', async ({ page }) => {
  73  |         // Verifica o título da aba padrão
> 74  |         await expect(page.locator('h1').filter({ hasText: 'Etiqueta de Identificação do Produto' })).toBeVisible({ timeout: 10000 });
      |                                                                                                      ^ Error: expect(locator).toBeVisible() failed
  75  |         
  76  |         // Verifica se a fila (Queue) está vazia inicialmente
  77  |         await expect(page.locator('text=Nenhum produto adicionado à fila')).toBeVisible();
  78  |     });
  79  | 
  80  |     test('Cenário 2: Troca de Categorias de Etiqueta (Tabs)', async ({ page }) => {
  81  |         // Alterna para "Etiquetas de Preço"
  82  |         await page.click('button:has-text("Etiquetas de Preço")');
  83  |         await expect(page.locator('h1').filter({ hasText: 'Etiqueta de Preço' })).toBeVisible();
  84  |         
  85  |         // Verifica se os botões específicos do preço (como os 3 pontinhos) apareceram
  86  |         await expect(page.locator('button:has-text("⋮")')).toBeVisible();
  87  | 
  88  |         // Alterna para "Logotipos"
  89  |         await page.click('button:has-text("Logotipos")');
  90  |         await expect(page.locator('h1').filter({ hasText: 'Etiqueta de Logotipo' })).toBeVisible();
  91  | 
  92  |         // Volta para a aba inicial
  93  |         await page.click('button:has-text("Identificação")');
  94  |         await expect(page.locator('h1').filter({ hasText: 'Etiqueta de Identificação do Produto' })).toBeVisible();
  95  |     });
  96  | 
  97  |     test('Cenário 3 e 4: Interação com a Fila (Busca, Inserção e Remoção)', async ({ page }) => {
  98  |         // Foca no input de busca e procura por algo
  99  |         const searchInput = page.getByPlaceholder('Buscar produto por nome ou código...');
  100 |         await searchInput.fill('TESTE');
  101 | 
  102 |         // Espera o mock retornar
  103 |         const productCard = page.locator('text=Produto Teste Automacao [TESTE_AUT]').first();
  104 |         await expect(productCard).toBeVisible({ timeout: 10000 });
  105 | 
  106 |         // Clica no botão de "+" para adicionar à fila
  107 |         const addButton = page.locator('button').filter({ hasText: '+' }).first();
  108 |         await addButton.click();
  109 | 
  110 |         // Verifica se foi adicionado (a fila não deve mais mostrar "Nenhum produto")
  111 |         await expect(page.locator('text=Nenhum produto adicionado à fila')).toBeHidden();
  112 |         
  113 |         // Deve existir na lista da fila o nome do produto
  114 |         await expect(page.locator('.space-y-4').locator('text=Produto Teste Automacao [TESTE_AUT]').first()).toBeVisible();
  115 | 
  116 |         // Testar a remoção individual clicando na lixeira (trash)
  117 |         // Usando o ícone SVG de lixeira (normalmente um TrashIcon / heroicons que tem a classe stroke-current ou text-red-500)
  118 |         const removeBtn = page.locator('.space-y-4 button.text-red-500, .space-y-4 button.text-red-600').first();
  119 |         if (await removeBtn.isVisible()) {
  120 |             await removeBtn.click();
  121 |         } else {
  122 |             // Tenta clicar no primeiro botão svg vermelho
  123 |             await page.locator('.space-y-4 button:has(svg)').last().click();
  124 |         }
  125 | 
  126 |         // A fila deve voltar ao estado vazio
  127 |         await expect(page.locator('text=Nenhum produto adicionado à fila')).toBeVisible();
  128 |     });
  129 | 
  130 |     test('Cenário 5: Menu Suspenso e Modo Avançado (Etiquetas de Preço)', async ({ page }) => {
  131 |         // Muda para a aba de etiquetas de preço
  132 |         await page.click('button:has-text("Etiquetas de Preço")');
  133 |         
  134 |         // Clica nos 3 pontinhos para abrir o dropdown
  135 |         const menuBtn = page.locator('button:has-text("⋮")');
  136 |         await menuBtn.click();
  137 | 
  138 |         // Seleciona "Avançado" dentro do menu
  139 |         const advancedBtn = page.locator('button:has-text("Avançado")');
  140 |         await expect(advancedBtn).toBeVisible();
  141 |         await advancedBtn.click();
  142 | 
  143 |         // Reabre o menu para verificar opções
  144 |         await menuBtn.click();
  145 |         const templateBtn = page.locator('button').filter({ hasText: /TEMPLATE DA ETIQUETA/i });
  146 |         await expect(templateBtn).toBeVisible();
  147 |     });
  148 | 
  149 |     test('Cenário 6: Acionamento da Impressão', async ({ page }) => {
  150 |         // Busca um produto e adiciona à fila
  151 |         const searchInput = page.getByPlaceholder('Buscar produto por nome ou código...');
  152 |         await searchInput.fill('TESTE');
  153 |         const productCard = page.locator('text=Produto Teste Automacao [TESTE_AUT]').first();
  154 |         await expect(productCard).toBeVisible({ timeout: 10000 });
  155 | 
  156 |         const addButton = page.locator('button').filter({ hasText: '+' }).first();
  157 |         await addButton.click();
  158 | 
  159 |         // Intercepta a janela para não travar no window.print
  160 |         await page.addInitScript(() => {
  161 |             window.print = () => {
  162 |                 console.log('Impressão simulada E2E');
  163 |             };
  164 |         });
  165 | 
  166 |         // Clica no botão de imprimir
  167 |         const printBtn = page.locator('button:has-text("IMPRIMIR ETIQUETAS")');
  168 |         await printBtn.click();
  169 | 
  170 |         // Como a implementação local abre uma tela modal ou printWindow overlay
  171 |         // Apenas confirmamos que clicar no botão não quebra a interface
  172 |         expect(pageErrors).toEqual([]);
  173 |     });
  174 | });
```