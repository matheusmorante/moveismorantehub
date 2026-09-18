# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products\reconciliation.spec.ts >> Supplier Reconciliation (Conciliação de Produtos) >> CT02: Should load without import errors or React crashes (TypeError)
- Location: tests\e2e\products\reconciliation.spec.ts:28:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('table')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('table') with timeout 10000ms
  - waiting for locator('table')

```

```yaml
- text: E
- heading "ERP Móveis Morante" [level=1]
- paragraph: Gestão de Móveis e Serviços
- text: E-mail 
- textbox "exemplo@email.com"
- text: Senha
- button "Esqueceu?"
- text: 
- textbox "••••••••"
- button ""
- button "Entrar no Sistema "
- text: Ou continuar com
- button "Entrar com Google":
  - img
  - text: Entrar com Google
- paragraph:
  - text: Não tem uma conta?
  - link "Criar conta grátis":
    - /url: /signup
- paragraph: Sistema de Alta Performance • v2.1
- region "Notifications Alt+T"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | // Utilizando setup de testes existente se houver, ou a estrutura básica
  4  | // Como não temos acesso direto ao auth do projeto aqui, vamos assumir que existe um script global de setup ou fazer login
  5  | // ou ignorar auth se for um ambiente de teste local configurado para isso.
  6  | // Mas para este teste de componente E2E simples, acessaremos a rota:
  7  | 
  8  | test.describe('Supplier Reconciliation (Conciliação de Produtos)', () => {
  9  |     
  10 |     test.beforeEach(async ({ page }) => {
  11 |         // Redireciona e assegura que a página carregou. Vamos supor que não tem tela de login bloqueando no localhost,
  12 |         // ou que a sessão é carregada pelo storageState do Playwright.
  13 |         // Se houver necessidade de auth, adicione aqui o acesso à tela de login.
  14 |         await page.goto('/products/reconciliation/suppliers');
  15 |         
  16 |         // Espera a página carregar (um texto conhecido ou elemento)
  17 |         await page.waitForLoadState('networkidle');
  18 |     });
  19 | 
  20 |     test('CT01: Should load the supplier reconciliation page without errors', async ({ page }) => {
  21 |         // Verifica que o título da página está presente
  22 |         await expect(page.getByText('Conciliação de Fornecedores')).toBeVisible({ timeout: 10000 });
  23 |         await expect(page.getByText('Fornecedor Atual')).toBeVisible();
  24 |         await expect(page.getByText('Categoria')).toBeVisible();
  25 |         await expect(page.getByText('Buscar (Nome / SKU)')).toBeVisible();
  26 |     });
  27 | 
  28 |     test('CT02: Should load without import errors or React crashes (TypeError)', async ({ page }) => {
  29 |         // Se a página renderizou "Status da Pendência" ou a tabela, significa que não deu crash do React
  30 |         const table = page.locator('table');
> 31 |         await expect(table).toBeVisible({ timeout: 10000 });
     |                             ^ Error: expect(locator).toBeVisible() failed
  32 |         
  33 |         // Deve listar produtos ou a mensagem de "Nenhum produto encontrado"
  34 |         const noProductMsg = page.getByText('Nenhum produto encontrado para os filtros atuais');
  35 |         const rows = page.locator('table tbody tr');
  36 |         
  37 |         const count = await rows.count();
  38 |         if (count === 0) {
  39 |             await expect(noProductMsg).toBeVisible();
  40 |         } else {
  41 |             expect(count).toBeGreaterThan(0);
  42 |         }
  43 |     });
  44 | 
  45 |     test('CT03: Should filter products by status', async ({ page }) => {
  46 |         // Altera o filtro "Status da Pendência" de "Sem fornecedor" para "Todos"
  47 |         // Como é um select HTML padrão ou componente customizado, tentamos clicar e selecionar
  48 |         const statusSelect = page.locator('select').first(); // Supondo que seja o primeiro select, ajuste se necessário
  49 |         
  50 |         // Como o React pode não ter carregado a tabela logo de cara, esperamos
  51 |         await page.waitForTimeout(1000); 
  52 | 
  53 |         // Vamos procurar pelo label "Status da Pendência"
  54 |         await expect(page.getByText('Status da Pendência')).toBeVisible();
  55 |         
  56 |         // Tenta interagir e buscar
  57 |         const searchInput = page.getByPlaceholder('Buscar...'); // do input livre
  58 |         if (await searchInput.isVisible()) {
  59 |             await searchInput.fill('Teste');
  60 |             await page.waitForTimeout(500); // debounce
  61 |         }
  62 |     });
  63 | });
  64 | 
```