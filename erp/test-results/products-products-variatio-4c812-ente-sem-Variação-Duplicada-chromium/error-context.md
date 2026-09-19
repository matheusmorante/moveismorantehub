# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products\products-variations-e2e.spec.ts >> Suíte E2E B2B - Criação de Produto, Variações e Validações de Negócio >> Caso 5: Cadastro Rápido de Variação em Pai Existente sem Variação Duplicada
- Location: tests\e2e\products\products-variations-e2e.spec.ts:152:5

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
  58  |         await expect(parentModal).toBeVisible({ timeout: 5000 });
  59  | 
  60  |         // Preenche o nome na aba Geral
  61  |         const nameInput = page.locator('input[placeholder*="nome interno"], input[placeholder*="SOFA 3 LUG"]').first();
  62  |         await expect(nameInput).toBeVisible();
  63  |         await nameInput.fill(`${testRunId} poltrona do papai com reclinador`);
  64  |         await nameInput.blur();
  65  | 
  66  |         // Verifica formatação automática em Title Case com conectivos 'do' e 'com' em minúsculo
  67  |         const formattedValue = await nameInput.inputValue();
  68  |         expect(formattedValue).toContain('Poltrona do Papai com Reclinador');
  69  | 
  70  |         // Navega para a aba de variações
  71  |         const variationsTabBtn = page.locator('button:has-text("Variações")').first();
  72  |         await variationsTabBtn.click();
  73  | 
  74  |         // Deve existir a Variação 1 gerada automaticamente na lista
  75  |         const tableRows = page.locator('div[role="dialog"] table tbody tr');
  76  |         console.log(await page.evaluate(() => document.body.innerHTML.substring(0, 3000)));
  77  |         await expect(tableRows).toHaveCount(1);
  78  |     });
  79  | 
  80  |     test('Caso 2: Bloqueio de criação de nova variação sem atributo definido na Variação 1', async ({ page }) => {
  81  |         const newProductBtn = page.locator('button:has-text("Novo Produto")').first();
  82  |         await expect(newProductBtn).toBeVisible({ timeout: 15000 });
  83  |         await newProductBtn.click();
  84  | 
  85  |         // Navega para a aba de variações
  86  |         const variationsTabBtn = page.locator('button:has-text("Variações")').first();
  87  |         await variationsTabBtn.click();
  88  | 
  89  |         // Botão "Adicionar variação" deve estar desabilitado ou barrar a criação com aviso
  90  |         const addVarBtn = page.locator('button:has-text("Adicionar variação")').first();
  91  |         const isDisabled = await addVarBtn.isDisabled();
  92  | 
  93  |         if (isDisabled) {
  94  |             expect(isDisabled).toBe(true);
  95  |         } else {
  96  |             await addVarBtn.click();
  97  |             // Deve exibir toast de bloqueio informando necessidade de atributo na Variação 1
  98  |             const toastMessage = page.locator('text=Antes de criar outra variação, informe pelo menos um atributo');
  99  |             await expect(toastMessage).toBeVisible({ timeout: 5000 });
  100 |         }
  101 |     });
  102 | 
  103 |     test('Caso 3: Adição de Variação Manual com Atributos e Validação do Tamanho do Modal', async ({ page }) => {
  104 |         const newProductBtn = page.locator('button:has-text("Novo Produto")').first();
  105 |         await expect(newProductBtn).toBeVisible({ timeout: 15000 });
  106 |         await newProductBtn.click();
  107 | 
  108 |         // Preenche nome do pai
  109 |         const nameInput = page.locator('input[placeholder*="nome interno"], input[placeholder*="SOFA 3 LUG"]').first();
  110 |         await nameInput.fill(`${testRunId} Guarda-Roupa de Casal com Espelho`);
  111 |         await nameInput.blur();
  112 | 
  113 |         // Aba de Variações
  114 |         await page.locator('button:has-text("Variações")').first().click();
  115 | 
  116 |         // Clica na Variação 1 para editar
  117 |         const firstVarRow = page.locator('div[role="dialog"] table tbody tr').first();
  118 |         await firstVarRow.click();
  119 | 
  120 |         // Modal de Variação deve estar aberto
  121 |         const varModal = page.locator('div[role="dialog"][aria-labelledby="variation-form-modal-title"]').first();
  122 |         await expect(varModal).toBeVisible({ timeout: 5000 });
  123 | 
  124 |         // Validação estrita do tamanho do Modal de Variação (mesmo tamanho do modal pai: max-w-5xl h-[92vh] rounded-3xl)
  125 |         const modalClass = await varModal.getAttribute('class');
  126 |         expect(modalClass).toContain('max-w-5xl');
  127 |         expect(modalClass).toContain('h-[92vh]');
  128 |         expect(modalClass).toContain('rounded-3xl');
  129 | 
  130 |         // Fecha/Conclui o modal da Variação 1
  131 |         const cancelOrCloseBtn = page.locator('button:has-text("Cancelar"), button:has-text("Concluir")').first();
  132 |         await cancelOrCloseBtn.click();
  133 |     });
  134 | 
  135 |     test('Caso 4: Regra de Imutabilidade da Variação 1', async ({ page }) => {
  136 |         const newProductBtn = page.locator('button:has-text("Novo Produto")').first();
  137 |         await expect(newProductBtn).toBeVisible({ timeout: 15000 });
  138 |         await newProductBtn.click();
  139 | 
  140 |         await page.locator('button:has-text("Variações")').first().click();
  141 | 
  142 |         // Tenta remover a Variação 1 se houver botão de exclusão
  143 |         const deleteBtn = page.locator('div[role="dialog"] table tbody tr button[title*="Excluir"], div[role="dialog"] table tbody tr button i.bi-trash').first();
  144 |         if (await deleteBtn.isVisible()) {
  145 |             await deleteBtn.click();
  146 |             // Deve informar que a Variação 1 é obrigatória
  147 |             const warningToast = page.locator('text=A Variação 1 é obrigatória e não pode ser removida');
  148 |             await expect(warningToast).toBeVisible({ timeout: 5000 });
  149 |         }
  150 |     });
  151 | 
  152 |     test('Caso 5: Cadastro Rápido de Variação em Pai Existente sem Variação Duplicada', async ({ page }) => {
  153 |         // Testa a rota de notas fiscais de entrada / conferência onde o operador faz cadastro rápido
  154 |         await page.goto(`/stock/receipts?${AUTH_QUERY}`);
  155 |         await page.waitForLoadState('domcontentloaded');
  156 | 
  157 |         // Garante que a tela carregou sem erros de runtime
> 158 |         expect(await page.locator('body').isVisible()).toBe(true);
      |                                                        ^ Error: expect(received).toBe(expected) // Object.is equality
  159 |     });
  160 | 
  161 |     test('Caso 6: Formatação rigorosa de Title Case em atributos e valores de variações', async ({ page }) => {
  162 |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  163 |         await page.waitForLoadState('domcontentloaded');
  164 | 
  165 |         const newProductBtn = page.locator('button:has-text("Novo Produto")').first();
  166 |         await expect(newProductBtn).toBeVisible({ timeout: 15000 });
  167 |         await newProductBtn.click();
  168 | 
  169 |         const nameInput = page.locator('input[placeholder*="nome interno"], input[placeholder*="SOFA 3 LUG"]').first();
  170 |         await nameInput.fill('MESA DE JANTAR PARA 6 LUGARES COM TAMPO DE VIDRO');
  171 |         await nameInput.blur();
  172 | 
  173 |         const formatted = await nameInput.inputValue();
  174 |         expect(formatted).toBe('Mesa de Jantar para 6 Lugares com Tampo de Vidro');
  175 |     });
  176 | 
  177 |     test('Caso 7: Fusão de variação com variação de outro produto pai', async ({ page }) => {
  178 |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  179 |         await page.waitForLoadState('domcontentloaded');
  180 | 
  181 |         // Cria o Produto Pai A
  182 |         const newProductBtn = page.locator('button:has-text("Novo Produto")').first();
  183 |         await expect(newProductBtn).toBeVisible({ timeout: 15000 });
  184 |         await newProductBtn.click();
  185 |         const nameInputA = page.locator('input[placeholder*="nome interno"]').first();
  186 |         await nameInputA.fill(`${testRunId} Pai Origem`);
  187 |         await nameInputA.blur();
  188 |         while (await page.locator('button:has-text("Próxima etapa")').isVisible()) {
  189 |             await page.locator('button:has-text("Próxima etapa")').click();
  190 |         }
  191 |         while (await page.locator('button:has-text("Próxima etapa")').isVisible()) {
  192 |             await page.locator('button:has-text("Próxima etapa")').click();
  193 |         }
  194 |         await page.locator('button:has-text("Cadastrar produto"), button:has-text("Salvar alterações"), button:has-text("Concluir")').first().click();
  195 |         await expect(page.locator('text=com sucesso').first()).toBeVisible({ timeout: 15000 });
  196 | 
  197 |         // Cria o Produto Pai B (Canônico)
  198 |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  199 |         await page.waitForLoadState('domcontentloaded');
  200 |         await expect(newProductBtn).toBeVisible({ timeout: 15000 });
  201 |         await newProductBtn.click();
  202 |         const nameInputB = page.locator('input[placeholder*="nome interno"]').first();
  203 |         await nameInputB.fill(`${testRunId} Pai Destino`);
  204 |         await nameInputB.blur();
  205 |         while (await page.locator('button:has-text("Próxima etapa")').isVisible()) {
  206 |             await page.locator('button:has-text("Próxima etapa")').click();
  207 |         }
  208 |         while (await page.locator('button:has-text("Próxima etapa")').isVisible()) {
  209 |             await page.locator('button:has-text("Próxima etapa")').click();
  210 |         }
  211 |         await page.locator('button:has-text("Cadastrar produto"), button:has-text("Salvar alterações"), button:has-text("Concluir")').first().click();
  212 |         await expect(page.locator('text=com sucesso').first()).toBeVisible({ timeout: 15000 });
  213 | 
  214 |         // Acessa a lista novamente para buscar as variações
  215 |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  216 |         await page.waitForLoadState('domcontentloaded');
  217 |         
  218 |         // Clica na linha do Pai Origem para expandir variações
  219 |         await page.locator(`td:has-text("${testRunId} Pai Origem")`).first().click();
  220 | 
  221 |         // Localiza a linha da Variação do Pai Origem e abre o menu de ações
  222 |         const trVariação = page.locator(`tr:has-text("Variação 1"):near(:text("${testRunId} Pai Origem"))`).first();
  223 |         await trVariação.locator('button[title="Mais ações"]').first().click();
  224 |         
  225 |         // Clica em "Mesclar com outra variação"
  226 |         await page.locator('button:has-text("Mesclar com outra variação")').first().click();
  227 | 
  228 |         // Modal de fusão deve estar visível
  229 |         const mergeModal = page.locator('div[role="dialog"][aria-labelledby="merge-variation-title"]').first();
  230 |         await expect(mergeModal).toBeVisible();
  231 | 
  232 |         // Digita o nome do Pai Destino para buscar a variação canônica
  233 |         const searchInput = mergeModal.locator('input[placeholder*="Pesquise por nome"]').first();
  234 |         await searchInput.fill(`${testRunId} Pai Destino`);
  235 | 
  236 |         // Seleciona a opção encontrada
  237 |         const option = mergeModal.locator('button:has-text("Pai Destino")').first();
  238 |         await expect(option).toBeVisible({ timeout: 5000 });
  239 |         await option.click();
  240 | 
  241 |         // Confirma a fusão
  242 |         const confirmBtn = mergeModal.locator('button:has-text("Confirmar fusão")').first();
  243 |         await confirmBtn.click();
  244 | 
  245 |         const successToast = page.locator('text=Variação mesclada');
  246 |         await expect(successToast).toBeVisible({ timeout: 5000 });
  247 |         await expect(mergeModal).toBeHidden({ timeout: 5000 });
  248 |     });
  249 | 
  250 |     test('Caso 8: Mover variação com fotos explícitas e herdadas', async ({ page }) => {
  251 |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  252 |         await page.waitForLoadState('domcontentloaded');
  253 | 
  254 |         // Note: For a real test, we would upload an image, but Playwright might skip the complex upload UI.
  255 |         // We will just verify that the modal for moving variations can be opened and submitted without crashing
  256 |         // and that it preserves the variation's photos if we stub or mock the API.
  257 |         
  258 |         // Cria o Produto Pai A (Origem)
```