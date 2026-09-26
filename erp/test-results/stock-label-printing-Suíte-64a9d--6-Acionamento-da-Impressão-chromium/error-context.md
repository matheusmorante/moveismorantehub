# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: stock\label-printing.spec.ts >> Suíte E2E B2B - Módulo de Etiquetas (Label Printing) >> Cenário 6: Acionamento da Impressão
- Location: tests\e2e\stock\label-printing.spec.ts:149:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByPlaceholder('Buscar produto por nome ou código...')

```

# Page snapshot

```yaml
- generic [ref=f1e2]:
  - generic [ref=f1e3]:
    - region "Notifications Alt+T"
    - main [ref=f1e4]:
      - generic [ref=f1e5]:
        - generic [ref=f1e7]:
          - generic [ref=f1e8]:
            - generic [ref=f1e9]: 
            - generic [ref=f1e11]:
              - heading "Etiquetas de Logotipo e Rótulo" [level=1] [ref=f1e12]
              - generic [ref=f1e13]:
                - generic [ref=f1e14]: "Modelo: 4 Etiquetas (Retangular) (2x2)"
                - generic [ref=f1e15]: •
                - generic [ref=f1e16]: Folha A4
          - button "" [ref=f1e19] [cursor=pointer]
        - generic [ref=f1e21]:
          - generic [ref=f1e22]:
            - generic [ref=f1e24]:
              - generic [ref=f1e25]:
                - heading "Gerenciar Etiquetas" [level=3] [ref=f1e26]
                - paragraph [ref=f1e27]: Organize e configure seus ativos para impressão
              - button " Biblioteca" [ref=f1e29] [cursor=pointer]:
                - generic [ref=f1e30]: 
                - text: Biblioteca
            - generic [ref=f1e34]:
              - generic [ref=f1e35]: 
              - paragraph [ref=f1e36]: Nenhuma etiqueta adicionada
              - paragraph [ref=f1e37]: Busque um produto acima para começar a montar a impressão.
          - generic [ref=f1e39]:
            - heading "Preview" [level=3] [ref=f1e40]
            - generic [ref=f1e41]:
              - button "Página anterior" [disabled] [ref=f1e42]:
                - generic [ref=f1e43]: 
              - generic [ref=f1e44]: 1/1
              - button "Próxima página" [disabled] [ref=f1e45]:
                - generic [ref=f1e46]: 
              - button "Diminuir zoom" [ref=f1e48] [cursor=pointer]:
                - generic [ref=f1e49]: 
              - generic [ref=f1e50]: 60%
              - button "Aumentar zoom" [ref=f1e51] [cursor=pointer]:
                - generic [ref=f1e52]: 
            - button "Ações do preview" [ref=f1e54] [cursor=pointer]:
              - generic [ref=f1e55]: 
    - generic [ref=f1e66]:
      - generic:
        - generic:
          - generic: Seu Lizandro
          - generic: Agente IA do ERP
      - button "Abrir chat do Seu Lizandro, Agente Inteligente do ERP" [ref=f1e67] [cursor=pointer]:
        - img "Seu Lizandro - Agente IA" [ref=f1e69]
  - region "Notifications Alt+T"
```

# Test source

```ts
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
  74  |         await expect(page.locator('h1').filter({ hasText: 'Etiqueta de Identificação do Produto' })).toBeVisible({ timeout: 10000 });
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
> 152 |         await searchInput.fill('TESTE');
      |                           ^ Error: locator.fill: Test timeout of 30000ms exceeded.
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
  175 | 
```