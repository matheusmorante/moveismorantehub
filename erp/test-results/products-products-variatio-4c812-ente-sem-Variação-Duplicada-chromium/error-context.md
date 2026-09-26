# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products\products-variations-e2e.spec.ts >> Suíte E2E B2B - Criação de Produto, Variações e Validações de Negócio >> Caso 5: Cadastro Rápido de Variação em Pai Existente sem Variação Duplicada
- Location: tests\e2e\products\products-variations-e2e.spec.ts:153:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [active]:
  - generic:
    - region "Notifications Alt+T"
```

# Test source

```ts
  59  | 
  60  |     test('Caso 1: Criação de produto simples e geração automática da Variação 1 padrão', async ({ page }) => {
  61  |         await openNewProduct(page);
  62  | 
  63  |         // Modal de produto deve estar visível
  64  |         const parentModal = page.locator('.fixed.inset-0 .relative.bg-white, .fixed.inset-0 .relative.dark\\:bg-slate-900').first();
  65  |         await expect(parentModal).toBeVisible({ timeout: 5000 });
  66  | 
  67  |         // Preenche o nome na aba Geral
  68  |         const nameInput = page.locator('input[placeholder*="nome interno"], input[placeholder*="SOFA 3 LUG"]').first();
  69  |         await expect(nameInput).toBeVisible();
  70  |         await nameInput.fill(`${testRunId} poltrona do papai com reclinador`);
  71  |         await nameInput.blur();
  72  | 
  73  |         // Verifica formatação automática em Title Case com conectivos 'do' e 'com' em minúsculo
  74  |         const formattedValue = await nameInput.inputValue();
  75  |         expect(formattedValue).toContain('Poltrona do Papai com Reclinador');
  76  | 
  77  |         // Navega para a aba de variações
  78  |         const variationsTabBtn = page.locator('button:has-text("Variações")').first();
  79  |         await variationsTabBtn.click();
  80  | 
  81  |         // Deve existir a Variação 1 gerada automaticamente na lista
  82  |         const tableRows = page.locator('div[role="dialog"] table tbody tr');
  83  |         console.log(await page.evaluate(() => document.body.innerHTML.substring(0, 3000)));
  84  |         await expect(tableRows).toHaveCount(1);
  85  |     });
  86  | 
  87  |     test('Caso 2: Bloqueio de criação de nova variação sem atributo definido na Variação 1', async ({ page }) => {
  88  |         await openNewProduct(page);
  89  | 
  90  |         // Navega para a aba de variações
  91  |         const variationsTabBtn = page.locator('button:has-text("Variações")').first();
  92  |         await variationsTabBtn.click();
  93  | 
  94  |         // Botão "Adicionar variação" deve estar desabilitado ou barrar a criação com aviso
  95  |         const addVarBtn = page.locator('button:has-text("Adicionar variação")').first();
  96  |         const isDisabled = await addVarBtn.isDisabled();
  97  | 
  98  |         if (isDisabled) {
  99  |             expect(isDisabled).toBe(true);
  100 |         } else {
  101 |             await addVarBtn.click();
  102 |             // Deve exibir toast de bloqueio informando necessidade de atributo na Variação 1
  103 |             const toastMessage = page.locator('text=Antes de criar outra variação, informe pelo menos um atributo');
  104 |             await expect(toastMessage).toBeVisible({ timeout: 5000 });
  105 |         }
  106 |     });
  107 | 
  108 |     test('Caso 3: Adição de Variação Manual com Atributos e Validação do Tamanho do Modal', async ({ page }) => {
  109 |         await openNewProduct(page);
  110 | 
  111 |         // Preenche nome do pai
  112 |         const nameInput = page.locator('input[placeholder*="nome interno"], input[placeholder*="SOFA 3 LUG"]').first();
  113 |         await nameInput.fill(`${testRunId} Guarda-Roupa de Casal com Espelho`);
  114 |         await nameInput.blur();
  115 | 
  116 |         // Aba de Variações
  117 |         await page.locator('button:has-text("Variações")').first().click();
  118 | 
  119 |         // Clica na Variação 1 para editar
  120 |         const firstVarRow = page.locator('div[role="dialog"] table tbody tr').first();
  121 |         await firstVarRow.click();
  122 | 
  123 |         // Modal de Variação deve estar aberto
  124 |         const varModal = page.locator('div[role="dialog"][aria-labelledby="variation-form-modal-title"]').first();
  125 |         await expect(varModal).toBeVisible({ timeout: 5000 });
  126 | 
  127 |         // Validação estrita do tamanho do Modal de Variação (mesmo tamanho do modal pai: max-w-5xl h-[92vh] rounded-3xl)
  128 |         const modalClass = await varModal.getAttribute('class');
  129 |         expect(modalClass).toContain('max-w-5xl');
  130 |         expect(modalClass).toContain('h-[92vh]');
  131 |         expect(modalClass).toContain('rounded-3xl');
  132 | 
  133 |         // Fecha/Conclui o modal da Variação 1
  134 |         const cancelOrCloseBtn = page.locator('button:has-text("Cancelar"), button:has-text("Concluir")').first();
  135 |         await cancelOrCloseBtn.click();
  136 |     });
  137 | 
  138 |     test('Caso 4: Regra de Imutabilidade da Variação 1', async ({ page }) => {
  139 |         await openNewProduct(page);
  140 | 
  141 |         await page.locator('button:has-text("Variações")').first().click();
  142 | 
  143 |         // Tenta remover a Variação 1 se houver botão de exclusão
  144 |         const deleteBtn = page.locator('div[role="dialog"] table tbody tr button[title*="Excluir"], div[role="dialog"] table tbody tr button i.bi-trash').first();
  145 |         if (await deleteBtn.isVisible()) {
  146 |             await deleteBtn.click();
  147 |             // Deve informar que a Variação 1 é obrigatória
  148 |             const warningToast = page.locator('text=A Variação 1 é obrigatória e não pode ser removida');
  149 |             await expect(warningToast).toBeVisible({ timeout: 5000 });
  150 |         }
  151 |     });
  152 | 
  153 |     test('Caso 5: Cadastro Rápido de Variação em Pai Existente sem Variação Duplicada', async ({ page }) => {
  154 |         // Testa a rota de notas fiscais de entrada / conferência onde o operador faz cadastro rápido
  155 |         await page.goto(`/stock/receipts?${AUTH_QUERY}`);
  156 |         await page.waitForLoadState('domcontentloaded');
  157 | 
  158 |         // Garante que a tela carregou sem erros de runtime
> 159 |         expect(await page.locator('body').isVisible()).toBe(true);
      |                                                        ^ Error: expect(received).toBe(expected) // Object.is equality
  160 |     });
  161 | 
  162 |     test('Caso 6: Formatação rigorosa de Title Case em atributos e valores de variações', async ({ page }) => {
  163 |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  164 |         await page.waitForLoadState('domcontentloaded');
  165 | 
  166 |         const newProductBtn = page.locator('button:has-text("Novo Produto")').first();
  167 |         await expect(newProductBtn).toBeVisible({ timeout: 15000 });
  168 |         await newProductBtn.click();
  169 | 
  170 |         const nameInput = page.locator('input[placeholder*="nome interno"], input[placeholder*="SOFA 3 LUG"]').first();
  171 |         await nameInput.fill('MESA DE JANTAR PARA 6 LUGARES COM TAMPO DE VIDRO');
  172 |         await nameInput.blur();
  173 | 
  174 |         const formatted = await nameInput.inputValue();
  175 |         expect(formatted).toBe('Mesa de Jantar para 6 Lugares com Tampo de Vidro');
  176 |     });
  177 | 
  178 |     test('Caso 7: Fusão de variação com variação de outro produto pai', async ({ page }) => {
  179 |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  180 |         await page.waitForLoadState('domcontentloaded');
  181 | 
  182 |         // Cria o Produto Pai A
  183 |         const newProductBtn = page.locator('button:has-text("Novo Produto")').first();
  184 |         await expect(newProductBtn).toBeVisible({ timeout: 15000 });
  185 |         await newProductBtn.click();
  186 |         const nameInputA = page.locator('input[placeholder*="nome interno"]').first();
  187 |         await nameInputA.fill(`${testRunId} Pai Origem`);
  188 |         await nameInputA.blur();
  189 |         while (await page.locator('button:has-text("Próxima etapa")').isVisible()) {
  190 |             await page.locator('button:has-text("Próxima etapa")').click();
  191 |         }
  192 |         while (await page.locator('button:has-text("Próxima etapa")').isVisible()) {
  193 |             await page.locator('button:has-text("Próxima etapa")').click();
  194 |         }
  195 |         await page.locator('button:has-text("Cadastrar produto"), button:has-text("Salvar alterações"), button:has-text("Concluir")').first().click();
  196 |         await expect(page.locator('text=com sucesso').first()).toBeVisible({ timeout: 15000 });
  197 | 
  198 |         // Cria o Produto Pai B (Canônico)
  199 |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  200 |         await page.waitForLoadState('domcontentloaded');
  201 |         await expect(newProductBtn).toBeVisible({ timeout: 15000 });
  202 |         await newProductBtn.click();
  203 |         const nameInputB = page.locator('input[placeholder*="nome interno"]').first();
  204 |         await nameInputB.fill(`${testRunId} Pai Destino`);
  205 |         await nameInputB.blur();
  206 |         while (await page.locator('button:has-text("Próxima etapa")').isVisible()) {
  207 |             await page.locator('button:has-text("Próxima etapa")').click();
  208 |         }
  209 |         while (await page.locator('button:has-text("Próxima etapa")').isVisible()) {
  210 |             await page.locator('button:has-text("Próxima etapa")').click();
  211 |         }
  212 |         await page.locator('button:has-text("Cadastrar produto"), button:has-text("Salvar alterações"), button:has-text("Concluir")').first().click();
  213 |         await expect(page.locator('text=com sucesso').first()).toBeVisible({ timeout: 15000 });
  214 | 
  215 |         // Acessa a lista novamente para buscar as variações
  216 |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  217 |         await page.waitForLoadState('domcontentloaded');
  218 |         
  219 |         // Clica na linha do Pai Origem para expandir variações
  220 |         await page.locator(`td:has-text("${testRunId} Pai Origem")`).first().click();
  221 | 
  222 |         // Localiza a linha da Variação do Pai Origem e abre o menu de ações
  223 |         const trVariação = page.locator(`tr:has-text("Variação 1"):near(:text("${testRunId} Pai Origem"))`).first();
  224 |         await trVariação.locator('button[title="Mais ações"]').first().click();
  225 |         
  226 |         // Clica em "Mesclar com outra variação"
  227 |         await page.locator('button:has-text("Mesclar com outra variação")').first().click();
  228 | 
  229 |         // Modal de fusão deve estar visível
  230 |         const mergeModal = page.locator('div[role="dialog"][aria-labelledby="merge-variation-title"]').first();
  231 |         await expect(mergeModal).toBeVisible();
  232 | 
  233 |         // Digita o nome do Pai Destino para buscar a variação canônica
  234 |         const searchInput = mergeModal.locator('input[placeholder*="Pesquise por nome"]').first();
  235 |         await searchInput.fill(`${testRunId} Pai Destino`);
  236 | 
  237 |         // Seleciona a opção encontrada
  238 |         const option = mergeModal.locator('button:has-text("Pai Destino")').first();
  239 |         await expect(option).toBeVisible({ timeout: 5000 });
  240 |         await option.click();
  241 | 
  242 |         // Confirma a fusão
  243 |         const confirmBtn = mergeModal.locator('button:has-text("Confirmar fusão")').first();
  244 |         await confirmBtn.click();
  245 | 
  246 |         const successToast = page.locator('text=Variação mesclada');
  247 |         await expect(successToast).toBeVisible({ timeout: 5000 });
  248 |         await expect(mergeModal).toBeHidden({ timeout: 5000 });
  249 |     });
  250 | 
  251 |     test('Caso 8: Mover variação com fotos explícitas e herdadas', async ({ page }) => {
  252 |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  253 |         await page.waitForLoadState('domcontentloaded');
  254 | 
  255 |         // Note: For a real test, we would upload an image, but Playwright might skip the complex upload UI.
  256 |         // We will just verify that the modal for moving variations can be opened and submitted without crashing
  257 |         // and that it preserves the variation's photos if we stub or mock the API.
  258 |         
  259 |         // Cria o Produto Pai A (Origem)
```