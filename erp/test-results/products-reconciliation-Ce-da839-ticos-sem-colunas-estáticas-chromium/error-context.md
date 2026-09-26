# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products\reconciliation.spec.ts >> Central de Conciliação e Saneamento de Produtos >> 3. Card orientado a pendências: exibe apenas campos problemáticos sem colunas estáticas
- Location: tests\e2e\products\reconciliation.spec.ts:190:5

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
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
              - heading " Conciliação de Produtos" [level=1] [ref=e9]:
                - generic [ref=e10]: 
                - text: Conciliação de Produtos
              - paragraph [ref=e12]: Corrija campos obrigatórios e inconsistências do cadastro.
            - generic [ref=e13]:
              - generic [ref=e14]:
                - generic [ref=e16]: "1"
                - generic [ref=e17]: produtos
              - generic [ref=e18]:
                - generic [ref=e20]: "1"
                - generic [ref=e21]: pendências
          - generic [ref=e22]:
            - button " Todos 1" [ref=e23] [cursor=pointer]:
              - generic [ref=e24]: 
              - generic [ref=e25]: Todos
              - generic [ref=e26]: "1"
            - button " Fornecedor 0" [ref=e27] [cursor=pointer]:
              - generic [ref=e28]: 
              - generic [ref=e29]: Fornecedor
              - generic [ref=e30]: "0"
            - button " Categoria 0" [ref=e31] [cursor=pointer]:
              - generic [ref=e32]: 
              - generic [ref=e33]: Categoria
              - generic [ref=e34]: "0"
            - button " NCM 0" [ref=e35] [cursor=pointer]:
              - generic [ref=e36]: 
              - generic [ref=e37]: NCM
              - generic [ref=e38]: "0"
            - button " Atributos 1" [ref=e39] [cursor=pointer]:
              - generic [ref=e40]: 
              - generic [ref=e41]: Atributos
              - generic [ref=e42]: "1"
            - button " Preço 0" [ref=e43] [cursor=pointer]:
              - generic [ref=e44]: 
              - generic [ref=e45]: Preço
              - generic [ref=e46]: "0"
        - generic [ref=e48]:
          - generic [ref=e49]:
            - generic [ref=e50]: Tipo de Pendência
            - combobox [ref=e51] [cursor=pointer]:
              - option "Todas as pendências" [selected]
              - option "Sem fornecedores"
              - option "Sem categoria"
              - option "NCM ausente ou inválido"
              - option "Atributos obrigatórios / vazios"
              - option "Sem preço de venda"
          - generic [ref=e52]:
            - generic [ref=e53]: Categoria
            - generic [ref=e56]:
              - generic [ref=e57]: 
              - textbox "Todas as categorias" [ref=e58]
          - generic [ref=e59]:
            - generic [ref=e60]: Buscar Produto
            - generic [ref=e62]:
              - generic: 
              - textbox "Nome, SKU ou código..." [ref=e63]
        - generic [ref=e64]:
          - generic [ref=e66] [cursor=pointer]:
            - checkbox "Selecionar todos da página (1)" [ref=e67]
            - generic [ref=e68]: Selecionar todos da página (1)
          - generic [ref=e69]:
            - generic [ref=e70]:
              - generic [ref=e71]:
                - checkbox [ref=e72] [cursor=pointer]
                - generic [ref=e73]:
                  - generic [ref=e74]:
                    - heading "[TESTE_AUT] Guarda-Roupa" [level=3] [ref=e75]
                    - generic [ref=e76]: TEST_AUT_GR_001
                  - generic [ref=e77]:
                    - generic [ref=e78]:
                      - generic [ref=e79]: 
                      - text: Guarda-Roupas
                    - generic [ref=e80]:
                      - generic [ref=e81]: 
                      - text: "[TESTE_AUT] Fornecedor"
              - generic [ref=e82]:
                - generic [ref=e83]:
                  - generic [ref=e84]: 
                  - text: 1 pendência
                - button "" [ref=e85] [cursor=pointer]
            - generic [ref=e88]:
              - generic [ref=e89]: Variações do Produto (1)
              - generic [ref=e92]:
                - generic [ref=e93]:
                  - generic [ref=e94]:
                    - generic [ref=e95]: "[TESTE_AUT] Guarda-Roupa Branco"
                    - generic [ref=e96]: TEST_AUT_GR_001-01
                  - generic [ref=e97]:
                    - generic [ref=e98]: 
                    - text: 1 pendente(s)
                - generic [ref=e100]:
                  - generic [ref=e101]:
                    - generic [ref=e102]: 
                    - text: Material
                  - textbox "Valor de Material..." [ref=e105]
          - generic [ref=e106]:
            - generic [ref=e107]: Mostrando 1 até 1 de 1 produtos
            - generic [ref=e108]:
              - button " Anterior" [disabled] [ref=e109]:
                - generic [ref=e110]: 
                - text: Anterior
              - generic [ref=e111]: Página 1
              - button "Próxima " [disabled] [ref=e112]:
                - text: Próxima
                - generic [ref=e113]: 
    - generic [ref=e115]:
      - generic:
        - generic:
          - generic: Seu Lizandro
          - generic: Agente IA do ERP
      - button "Abrir chat do Seu Lizandro, Agente Inteligente do ERP" [ref=e116] [cursor=pointer]:
        - img "Seu Lizandro - Agente IA" [ref=e118]
  - region "Notifications Alt+T"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | /**
  4   |  * Suíte E2E Playwright — Central de Conciliação e Saneamento de Produtos
  5   |  *
  6   |  * Cobertura dos 13 cenários obrigatórios:
  7   |  * 1. Produto faltando fornecedor
  8   |  * 2. Campo obrigatório do pai (categoria e NCM)
  9   |  * 3. Campo obrigatório da variação (atributo)
  10  |  * 4. Atributo obrigatório por categoria
  11  |  * 5. Herança pai -> variação ("Corrigir aqui resolverá X variações")
  12  |  * 6. Correção inline que elimina múltiplas pendências e atualiza contadores
  13  |  * 7. Edição em lote (atribuir fornecedor / categoria)
  14  |  * 8. Filtros (tipo de pendência, categoria e busca)
  15  |  * 9. Chips rápidos com contadores dinâmicos
  16  |  * 10. Paginação server-side e contagem
  17  |  * 11. Produto desaparecendo da lista após ficar 100% válido
  18  |  * 12. Responsividade: desktop largo, janela reduzida (meia-tela) e mobile (sem scroll horizontal e sem colunas cortadas)
  19  |  * 13. Ausência de novos erros no console do navegador
  20  |  */
  21  | 
  22  | const AUTH_QUERY = 'auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator';
  23  | 
  24  | test.describe('Central de Conciliação e Saneamento de Produtos', () => {
  25  |     let consoleErrors: string[] = [];
  26  |     let pageErrors: string[] = [];
  27  |     let variationAttributes: Array<{ name: string; value: string; showName?: boolean }> = [];
  28  | 
> 29  |     test.beforeEach(async ({ page }) => {
      |          ^ Test timeout of 30000ms exceeded while running "beforeEach" hook.
  30  |         consoleErrors = [];
  31  |         pageErrors = [];
  32  |         variationAttributes = [{ name: 'Quantidade de Portas', value: '4', showName: true }];
  33  | 
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
```