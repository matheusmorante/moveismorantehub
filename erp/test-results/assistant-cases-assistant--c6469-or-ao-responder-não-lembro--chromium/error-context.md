# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: assistant\cases\assistant-context.spec.ts >> Assistente Financeiro - Contexto Incremental e Desconhecimento >> Não repete pergunta de valor ao responder "não lembro"
- Location: tests\e2e\assistant\cases\assistant-context.spec.ts:14:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5174/?auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator
Call log:
  - navigating to "http://localhost:5174/?auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator", waiting until "load"

```

# Test source

```ts
  30  |         amount: 50,
  31  |         description: 'Despesa Geral',
  32  |         payment_method: 'Pix',
  33  |         category: 'Outros'
  34  |       }
  35  |     };
  36  | 
  37  |     // Detecção de ajuste de valor
  38  |     if (lower.includes('na verdade foi 180') || lower.includes('corrigindo o campo') || lower.includes('180, não 200')) {
  39  |       intentResult = {
  40  |         intent: 'create_transaction',
  41  |         status: 'ready',
  42  |         summary: 'Ajustei o valor para R$ 180,00.',
  43  |         data: {
  44  |           amount: 180
  45  |         }
  46  |       };
  47  |     } else if (lower.includes('paguei o almoço') && !lower.includes('reais') && !/\d+/.test(promptText.split('Mensagem do Usuário:')[1] || '')) {
  48  |       // Despesa sem valor informado
  49  |       intentResult = {
  50  |         intent: 'create_transaction',
  51  |         status: 'incomplete',
  52  |         summary: 'Qual foi o valor gasto no almoço?',
  53  |         data: {
  54  |           description: 'Almoço',
  55  |           payment_method: 'Pix'
  56  |         }
  57  |       };
  58  |     } else {
  59  |       // Extração dinâmica dos dados da mensagem
  60  |       const userSection = promptText.split('Mensagem do Usuário:')[1] || promptText;
  61  |       const userLower = userSection.toLowerCase();
  62  | 
  63  |       let type = userLower.includes('recebi') || userLower.includes('venda') ? 'income' : 'expense';
  64  |       let amount = 50;
  65  |       const numMatch = userLower.match(/(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)/);
  66  |       if (numMatch) {
  67  |         amount = parseFloat(numMatch[1].replace(',', '.'));
  68  |       }
  69  | 
  70  |       let paymentMethod = 'Dinheiro';
  71  |       if (userLower.includes('pix')) paymentMethod = 'Pix';
  72  |       else if (userLower.includes('crédito') || userLower.includes('credito')) paymentMethod = 'Cartão de Crédito';
  73  |       else if (userLower.includes('débito') || userLower.includes('debito')) paymentMethod = 'Cartão de Débito';
  74  |       else if (userLower.includes('boleto')) paymentMethod = 'Boleto';
  75  | 
  76  |       let description = 'Despesa';
  77  |       if (userLower.includes('almoço') || userLower.includes('almoco')) description = 'Almoço';
  78  |       else if (userLower.includes('gasolina') || userLower.includes('combustível') || userLower.includes('combustivel')) description = 'Combustível';
  79  |       else if (userLower.includes('estacionamento')) description = 'Estacionamento';
  80  |       else if (userLower.includes('limpeza')) description = 'Material de limpeza';
  81  |       else if (userLower.includes('mercado')) description = 'Mercado';
  82  |       else if (userLower.includes('luz')) description = 'Conta de luz';
  83  |       else if (userLower.includes('uber')) description = 'Uber';
  84  |       else if (userLower.includes('café') || userLower.includes('cafe')) description = 'Café da tarde';
  85  |       else if (userLower.includes('venda')) description = 'Venda no PDV';
  86  | 
  87  |       intentResult = {
  88  |         intent: 'create_transaction',
  89  |         status: 'ready',
  90  |         summary: `Identifiquei ${type === 'income' ? 'uma entrada' : 'uma saída'} de R$ ${amount.toFixed(2)} (${description} no ${paymentMethod}). Deseja confirmar?`,
  91  |         data: {
  92  |           type,
  93  |           amount,
  94  |           description,
  95  |           payment_method: paymentMethod,
  96  |           product_name: description
  97  |         }
  98  |       };
  99  |     }
  100 | 
  101 |     const resp = {
  102 |       candidates: [{
  103 |         content: { parts: [{ text: JSON.stringify(intentResult) }] }
  104 |       }]
  105 |     };
  106 | 
  107 |     return route.fulfill({
  108 |       status: 200,
  109 |       contentType: 'application/json',
  110 |       body: JSON.stringify(resp)
  111 |     });
  112 |   });
  113 | }
  114 | 
  115 | export async function openFinancialAssistant(page: Page, options?: { skipMock?: boolean }) {
  116 |   if (!options?.skipMock) {
  117 |     await setupDeterministicAiMock(page);
  118 |   }
  119 | 
  120 |   page.on('console', msg => {
  121 |     if (msg.type() === 'error' || msg.type() === 'warning') {
  122 |       console.log(`[Browser ${msg.type().toUpperCase()}]:`, msg.text());
  123 |     }
  124 |   });
  125 | 
  126 |   page.on('pageerror', err => {
  127 |     console.log('[Browser PAGE ERROR]:', err.message);
  128 |   });
  129 | 
> 130 |   await page.goto('/?auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator');
      |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5174/?auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator
  131 |   await page.waitForLoadState('domcontentloaded');
  132 | 
  133 |   const assistantInput = page.locator('[data-testid="assistant-input"]');
  134 |   if (await assistantInput.isVisible()) {
  135 |     return;
  136 |   }
  137 | 
  138 |   const hubToggle = page.locator('[data-testid="floating-hub-toggle"]');
  139 |   if (await hubToggle.isVisible()) {
  140 |     await hubToggle.click();
  141 |     await page.waitForTimeout(300);
  142 |   }
  143 | 
  144 |   const toggleBtn = page.locator('[data-testid="assistant-toggle"]');
  145 |   if (await toggleBtn.isVisible()) {
  146 |     await toggleBtn.click();
  147 |   }
  148 | 
  149 |   await expect(page.locator('[data-testid="assistant-input"]')).toBeVisible({ timeout: 15000 });
  150 | }
  151 | 
  152 | export async function sendAssistantMessage(page: Page, text: string) {
  153 |   const input = page.locator('[data-testid="assistant-input"]');
  154 |   await input.fill(text);
  155 |   await page.locator('[data-testid="assistant-send"]').click();
  156 | }
  157 | 
  158 | export async function waitForAssistantIdle(page: Page) {
  159 |   await page.waitForTimeout(300);
  160 |   await expect(page.locator('[data-testid="assistant-analyzing-state"]')).toHaveCount(0, { timeout: 10000 }).catch(() => {});
  161 |   await expect(page.locator('.animate-bounce')).toHaveCount(0, { timeout: 10000 }).catch(() => {});
  162 | }
  163 | 
  164 | export async function getLastAssistantMessage(page: Page) {
  165 |   const messages = page.locator('[data-testid="assistant-message-ai"]');
  166 |   if (await messages.count() === 0) {
  167 |     // Fallback para mensagens do assistente no chat
  168 |     const bubbles = page.locator('.whitespace-pre-wrap');
  169 |     if (await bubbles.count() > 0) {
  170 |       return bubbles.last().textContent();
  171 |     }
  172 |   } else {
  173 |     await expect(messages.last()).toBeVisible({ timeout: 10000 });
  174 |     return messages.last().textContent();
  175 |   }
  176 |   return null;
  177 | }
  178 | 
  179 | export async function getTransactionPreviewCard(page: Page) {
  180 |   const card = page.locator('[data-testid="transaction-preview-card"]');
  181 |   await expect(card.first()).toBeVisible({ timeout: 10000 });
  182 |   return card.first();
  183 | }
  184 | 
  185 | export async function confirmTransaction(page: Page) {
  186 |   const confirmBtn = page.locator('[data-testid="transaction-confirm"]').first();
  187 |   await expect(confirmBtn).toBeVisible({ timeout: 10000 });
  188 |   await confirmBtn.click();
  189 | }
  190 | 
  191 | export async function editDraft(page: Page) {
  192 |   const editBtn = page.locator('[data-testid="transaction-edit"]').first();
  193 |   await expect(editBtn).toBeVisible({ timeout: 10000 });
  194 |   await editBtn.click();
  195 | }
  196 | 
  197 | export async function clearChat(page: Page) {
  198 |   await page.evaluate(() => {
  199 |     localStorage.removeItem('lisandro_chat_history');
  200 |   });
  201 |   await page.reload();
  202 | }
  203 | 
```