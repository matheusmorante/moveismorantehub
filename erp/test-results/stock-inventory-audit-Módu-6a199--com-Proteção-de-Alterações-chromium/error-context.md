# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: stock\inventory-audit.spec.ts >> Módulo de Estoque - Inventário e Auditoria >> 3. Inventário: Fechamento com Proteção de Alterações
- Location: tests\e2e\stock\inventory-audit.spec.ts:161:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: Erros críticos de console detectados

expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 27

- Array []
+ Array [
+   "Warning: validateDOMNesting(...): %s cannot appear as a descendant of <%s>.%s <button> button 
+     at button
+     at div
+     at div
+     at button
+     at div
+     at InventoryAudit (http://localhost:5173/src/pages/App/Stock/Inventory/InventoryAudit.tsx?t=1790442643094:22:34)
+     at div
+     at div
+     at StockPage (http://localhost:5173/src/pages/App/Stock/index.tsx?t=1790442643206:32:23)
+     at RenderedRoute (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=d845a5c6:4131:5)
+     at Outlet (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=d845a5c6:4537:26)
+     at main
+     at div
+     at AppLayout (http://localhost:5173/src/AppLayout.tsx?t=1790442643206:37:20)
+     at ProtectedRoute (http://localhost:5173/src/Router.tsx?t=1790442643206:94:27)
+     at RenderedRoute (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=d845a5c6:4131:5)
+     at Routes (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=d845a5c6:4601:5)
+     at Router (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=d845a5c6:4544:15)
+     at BrowserRouter (http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=d845a5c6:5290:5)
+     at AuthProvider (http://localhost:5173/src/context/AuthContext.tsx?t=1790442312355:21:32)
+     at Router
+     at ErrorBoundary (http://localhost:5173/src/components/ErrorBoundary.tsx:5:1)
+     at App
+     at ThemeProvider (http://localhost:5173/src/context/ThemeContext.tsx?t=1790442312355:21:33)",
+ ]
```

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button:has-text("Selecione um responsável")')

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
            - generic [ref=e8]:
              - generic [ref=e9]: 
              - heading "Inventários" [level=1] [ref=e11]
            - button " Novo inventário" [active] [ref=e13] [cursor=pointer]:
              - generic [ref=e14]: 
              - generic [ref=e15]: Novo inventário
          - generic [ref=e16]:
            - generic [ref=e17]:
              - generic [ref=e18]: 
              - text: Período
              - combobox " Período" [ref=e19]:
                - option "Últimos 30 dias" [selected]
                - option "Últimos 90 dias"
                - option "Último ano"
                - option "Todos os períodos"
            - generic [ref=e20]:
              - button "Página anterior" [disabled] [ref=e21]:
                - generic [ref=e22]: 
              - generic [ref=e23]: Página 1 de 1
              - button "Próxima página" [disabled] [ref=e24]:
                - generic [ref=e25]: 
          - text:     
          - table [ref=e27]:
            - rowgroup [ref=e28]:
              - row [ref=e29]:
                - columnheader "Inventário" [ref=e30]
                - columnheader "Data e horário" [ref=e31]
                - columnheader "Responsável" [ref=e32]
                - columnheader "Status" [ref=e33]
                - columnheader "Produtos contados" [ref=e34]
                - columnheader "Ajustes gerados" [ref=e35]
                - columnheader "Ações" [ref=e36]
            - rowgroup [ref=e37]:
              - row [ref=e38] [cursor=pointer]:
                - 'cell "Inventário #000007" [ref=e39]'
                - cell "24/09/2026, 21:14:16" [ref=e40]
                - cell "Matheus Morante" [ref=e41]
                - cell "Concluído" [ref=e42]
                - cell "1" [ref=e45]
                - cell "2 Lançado" [ref=e46]:
                  - generic [ref=e48]:
                    - strong [ref=e49]: "2"
                    - generic [ref=e50]: Lançado
                - cell [ref=e51]:
                  - button "Mais opções" [ref=e52]:
                    - generic [aria-hidden] [ref=e53]: 
              - row [ref=e54] [cursor=pointer]:
                - 'cell "Inventário #000006" [ref=e55]'
                - cell "24/09/2026, 21:12:09" [ref=e56]
                - cell "Matheus Morante" [ref=e57]
                - cell "Concluído" [ref=e58]
                - cell "1" [ref=e61]
                - cell "2 Lançado" [ref=e62]:
                  - generic [ref=e64]:
                    - strong [ref=e65]: "2"
                    - generic [ref=e66]: Lançado
                - cell [ref=e67]:
                  - button "Mais opções" [ref=e68]:
                    - generic [aria-hidden] [ref=e69]: 
              - row [ref=e70] [cursor=pointer]:
                - 'cell "Inventário #000005" [ref=e71]'
                - cell "24/09/2026, 21:02:07" [ref=e72]
                - cell "Matheus Morante" [ref=e73]
                - cell "Concluído" [ref=e74]
                - cell "1" [ref=e77]
                - cell "2 Lançado" [ref=e78]:
                  - generic [ref=e80]:
                    - strong [ref=e81]: "2"
                    - generic [ref=e82]: Lançado
                - cell [ref=e83]:
                  - button "Mais opções" [ref=e84]:
                    - generic [aria-hidden] [ref=e85]: 
              - row [ref=e86] [cursor=pointer]:
                - 'cell "Inventário #000004" [ref=e87]'
                - cell "24/09/2026, 20:59:25" [ref=e88]
                - cell "Matheus Morante" [ref=e89]
                - cell "Concluído" [ref=e90]
                - cell "1" [ref=e93]
                - cell "2 Lançado" [ref=e94]:
                  - generic [ref=e96]:
                    - strong [ref=e97]: "2"
                    - generic [ref=e98]: Lançado
                - cell [ref=e99]:
                  - button "Mais opções" [ref=e100]:
                    - generic [aria-hidden] [ref=e101]: 
              - row [ref=e102] [cursor=pointer]:
                - 'cell "Inventário #000003" [ref=e103]'
                - cell "19/09/2026, 11:15:49" [ref=e104]
                - cell "Matheus Morante" [ref=e105]
                - cell "Concluído" [ref=e106]
                - cell "1" [ref=e109]
                - cell "2 Lançado" [ref=e110]:
                  - generic [ref=e112]:
                    - strong [ref=e113]: "2"
                    - generic [ref=e114]: Lançado
                - cell [ref=e115]:
                  - button "Mais opções" [ref=e116]:
                    - generic [aria-hidden] [ref=e117]: 
        - dialog [ref=e118]:
          - generic [ref=e121]:
            - generic [ref=e122]:
              - generic [ref=e123]:
                - heading "Novo Inventário" [level=2] [ref=e124]
                - paragraph [ref=e125]: O que você deseja inventariar?
                - status [ref=e126]: Índice offline ainda não sincronizado neste navegador
              - button "" [ref=e127] [cursor=pointer]
            - main [ref=e129]:
              - generic [ref=e131]:
                - button " Estoque Completo Todas as variações ativas cadastradas no sistema." [ref=e132] [cursor=pointer]:
                  - generic [ref=e133]: 
                  - generic [ref=e135]: Estoque Completo
                  - generic [ref=e136]: Todas as variações ativas cadastradas no sistema.
                - button " Por Fornecedor Selecione um fornecedor e conte as variações relacionadas." [ref=e137] [cursor=pointer]:
                  - generic [ref=e138]: 
                  - generic [ref=e140]: Por Fornecedor
                  - generic [ref=e141]: Selecione um fornecedor e conte as variações relacionadas.
                - button " Seleção Personalizada Pesquise e adicione manualmente produtos ou variações específicas ao escopo." [ref=e142] [cursor=pointer]:
                  - generic [ref=e143]: 
                  - generic [ref=e145]: Seleção Personalizada
                  - generic [ref=e146]: Pesquise e adicione manualmente produtos ou variações específicas ao escopo.
    - generic [ref=e148]:
      - generic:
        - generic:
          - generic: Seu Lizandro
          - generic: Agente IA do ERP
      - button "Abrir chat do Seu Lizandro, Agente Inteligente do ERP" [ref=e149] [cursor=pointer]:
        - img "Seu Lizandro - Agente IA" [ref=e151]
  - region "Notifications Alt+T"
```

# Test source

```ts
  66  |         // Confirmar e iniciar
  67  |         await page.click('button:has-text("Confirmar e Iniciar")');
  68  | 
  69  |         // Na tela de Operação (se tiver etapas)
  70  |         // Validar que a etapa "Sem fornecedor" NÃO existe.
  71  |         const stagesText = await page.textContent('body');
  72  |         expect(stagesText).not.toContain('Sem fornecedor');
  73  | 
  74  |         // Se houver etapas, clica na primeira para iniciar
  75  |         const firstStageButton = page.locator('button:has-text("Iniciar Contagem")').first();
  76  |         if (await firstStageButton.isVisible()) {
  77  |             await firstStageButton.click();
  78  |         }
  79  | 
  80  |         // Deve estar no modo manual por padrão
  81  |         await expect(page.locator('button:has-text("Scanner")')).toBeVisible();
  82  | 
  83  |         // Alterar para modo scanner
  84  |         await page.click('button:has-text("Scanner")');
  85  |         
  86  |         // Validar interface do scanner
  87  |         await expect(page.locator('text=Aguardando leitura do código de barras')).toBeVisible();
  88  | 
  89  |         // Voltar para manual
  90  |         await page.click('button:has-text("Manual")');
  91  | 
  92  |         // Incrementar primeiro item (se existir)
  93  |         const plusButton = page.locator('button i.bi-plus').first();
  94  |         if (await plusButton.isVisible()) {
  95  |             await plusButton.click(); // +1
  96  |         }
  97  | 
  98  |         // Revisão
  99  |         await page.click('button:has-text("Revisar Contagem")');
  100 |         await expect(page.locator('text=Revisão do Inventário')).toBeVisible();
  101 | 
  102 |         // Concluir
  103 |         // Pode ser "Finalizar Inventário" ou "Concluir Inventário"
  104 |         await page.click('button:has-text("Concluir Inventário"), button:has-text("Finalizar")');
  105 |         
  106 |         // Deve fechar o modal
  107 |         await expect(page.locator('text=Revisão do Inventário')).not.toBeVisible();
  108 |     });
  109 | 
  110 |     test('2. Inventário Personalizado: Adição Dinâmica, Autocomplete Verde, e Fechamento (X)', async ({ page }) => {
  111 |         await page.goto(`/estoque/inventarios?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
  112 | 
  113 |         await page.click('button:has-text("Novo inventário")');
  114 |         await page.waitForSelector('text=Novo Inventário');
  115 | 
  116 |         // Selecionar Personalizado
  117 |         await page.click('button:has-text("Personalizado")');
  118 |         
  119 | 
  120 |         
  121 |         await page.click('button:has-text("Selecione um responsável")');
  122 |         await page.click('[role="dialog"] button:has-text("Matheus Morante")');
  123 |         
  124 |         await page.click('button:has-text("Confirmar e Iniciar")');
  125 | 
  126 |         // Na tela de Operação, validar barra de busca escondida
  127 |         await expect(page.locator('input[placeholder="Buscar item..."]')).not.toBeVisible();
  128 | 
  129 |         // Adicionar Item Vazio
  130 |         await page.click('button:has-text("Adicionar Item")');
  131 | 
  132 |         // Deve aparecer o Autocomplete
  133 |         const autocompleteInput = page.locator('input[placeholder="Pesquisar produto..."]');
  134 |         await expect(autocompleteInput).toBeVisible();
  135 | 
  136 |         // Pesquisar um produto qualquer (ex: camisa)
  137 |         await autocompleteInput.fill('teste');
  138 |         await page.waitForTimeout(500); // debounce do autocomplete
  139 |         
  140 |         // Selecionar a primeira sugestão
  141 |         const firstSuggestion = page.locator('.absolute.z-50 button').first();
  142 |         if (await firstSuggestion.isVisible()) {
  143 |             await firstSuggestion.click();
  144 |             
  145 |             // Após selecionar, deve ficar verde e ter o checkmark
  146 |             const greenText = page.locator('.text-emerald-600, .dark\\:text-emerald-400');
  147 |             await expect(greenText).toBeVisible();
  148 |             const checkMark = page.locator('.bi-check-circle-fill.text-emerald-500');
  149 |             await expect(checkMark).toBeVisible();
  150 |         }
  151 | 
  152 |         // Testar Fechamento para validar o modal de aviso e fechar sem salvar rascunho
  153 |         await page.click('button:has-text("Cancelar")');
  154 |         await page.waitForSelector('text=Deseja salvar como rascunho?');
  155 |         await page.click('button:has-text("Não, descartar contagem")');
  156 | 
  157 |         // O modal deve fechar sem erro na página
  158 |         await expect(page.locator('text=Novo Inventário')).not.toBeVisible();
  159 |     });
  160 | 
  161 |     test('3. Inventário: Fechamento com Proteção de Alterações', async ({ page }) => {
  162 |         await page.goto(`/estoque/inventarios?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
  163 |         await page.click('button:has-text("Novo inventário")');
  164 |         await page.waitForSelector('text=Novo Inventário');
  165 | 
> 166 |         await page.click('button:has-text("Selecione um responsável")');
      |                    ^ Error: page.click: Test timeout of 30000ms exceeded.
  167 |         await page.click('[role="dialog"] button:has-text("Matheus Morante")');
  168 |         await page.click('button:has-text("Confirmar e Iniciar")');
  169 | 
  170 |         const plusButton = page.locator('button i.bi-plus').first();
  171 |         if (await plusButton.isVisible()) {
  172 |             await plusButton.click();
  173 |             await page.waitForTimeout(500);
  174 |         }
  175 | 
  176 |         await page.click('button:has-text("Cancelar")');
  177 |         const warningModal = page.locator('text=Deseja salvar como rascunho?');
  178 |         if (await warningModal.isVisible()) {
  179 |             await page.click('button:has-text("Não, descartar contagem")');
  180 |         }
  181 |         await expect(page.locator('text=Novo Inventário')).not.toBeVisible();
  182 |     });
  183 | 
  184 |     test('4. Inventário: Desfazer e Aplicar Ajuste', async ({ page }) => {
  185 |         await page.goto(`/estoque/inventarios?${AUTH_QUERY}`, { waitUntil: 'domcontentloaded' });
  186 |         
  187 |         const threeDots = page.locator('button:has(i.bi-three-dots-vertical)').first();
  188 |         if (await threeDots.isVisible()) {
  189 |             await threeDots.click();
  190 |             
  191 |             const undoBtn = page.locator('button:has-text("Desfazer inventário")');
  192 |             if (await undoBtn.isVisible()) {
  193 |                 await undoBtn.click();
  194 |                 await page.waitForSelector('text=Desfazer Inventário');
  195 |                 
  196 |                 const confirmBtn = page.locator('button', { hasText: /Confirmar|Aguarde/ }).last();
  197 |                 await expect(confirmBtn).toBeDisabled();
  198 |                 
  199 |                 await page.waitForTimeout(3500);
  200 |                 await expect(confirmBtn).toBeEnabled();
  201 |                 await confirmBtn.click();
  202 |                 
  203 |                 await expect(page.locator('text=Desfazer Inventário')).not.toBeVisible();
  204 |             }
  205 |         }
  206 |     });
  207 | });
  208 | 
```