# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: assistant\cases\assistant-despesas.spec.ts >> Assistente Financeiro — Suíte E2E Determinística >> E2E determinístico: entrada + saída e confirmação com feedback visual
- Location: tests\e2e\assistant\cases\assistant-despesas.spec.ts:78:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-testid="assistant-input"]')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('[data-testid="assistant-input"]') with timeout 15000ms
  - waiting for locator('[data-testid="assistant-input"]')

```

```yaml
- region "Notifications Alt+T"
- main:
  - text: 
  - heading "Dashboard" [level=1]
  - text: 
  - combobox:
    - option "Hoje"
    - option "Ontem"
    - option "Esta Semana"
    - option "Este Mês" [selected]
    - option "Últimos 30 Dias"
    - option "Mês Passado"
    - option "Este Ano"
    - option "Período Personalizado"
  - text: 
  - button " Nova Venda"
  - button " Recebimento"
  - button " Novo Produto"
  - button " Agenda"
  - button " Inventário"
  - text:   28.6%
  - paragraph: Faturamento
  - heading "R$ 91.378,74" [level=3]
  - text:   33.8%
  - paragraph: Vendas
  - heading "90" [level=3]
  - text:   7.8%
  - paragraph: Ticket Médio
  - heading "R$ 1.015,32" [level=3]
  - text:   28.0%
  - paragraph: Lucro Bruto
  - heading "R$ 91.378,74" [level=3]
  - text: 
  - paragraph: Margem Bruta
  - heading "100.0%" [level=3]
  - text: 
  - paragraph: CMV
  - heading "R$ 0,00" [level=3]
  - heading "Desempenho de Vendas" [level=3]
  - paragraph: Evolução no período · Este Mês
  - text: 
  - button "Faturamento"
  - button "Lucro"
  - button "Pedidos"
  - img: 01/09 03/09 05/09 07/09 09/09 11/09 13/09 15/09 17/09 19/09 21/09 23/09 25/09 26/09
  - text: 
  - heading "Central de Atenção" [level=3]
  - paragraph: Estoque · Inventário
  - text: 
  - paragraph: Sem Estoque
  - paragraph: 265 produtos zerados
  - link "Ver Estoque ":
    - /url: /estoque/inventarios
  - text: "· Armário Torre para Forno 0,65 Gênova, dobradiças metálicas, em MDP Altura: 210 Largura: 61 Profundidade: 50 — Armário Torre para Forno 65cm Genova Damovel Freijó Matt/Areia · A Cozinha Compacta Lorena 6 Portas 1 Gaveta Darmovel, foi desenvolvida para oferecer praticidade e melhor aproveitamento de espaço no dia a dia. Seu design moderno combina funcionalidade e organização, contando com amplo espaço interno para armazenar utensílios, mantimentos e acessórios de cozinha. Produzida em MDP com acabamento em pintura UV, proporciona boa durabilidade e excelente custo-benefício. ‼️ Não inclui tampo/a pia‼️ Características: 6 Portas 1 Gaveta Estrutura em MDP 12mm Base em MDP 15mm Pintura UV Puxadores plásticos Pés plásticos Dobradiças de pressão 26mm Corrediças metálicas 400mm Design compacto e funcional Dimensões: Altura: 196 cm Largura: 120 cm Profundidade: 42 cm Peso: 51 kg — Cozinha Compacta Lorena para Pia de 1,20m Darmovel Freijó Matt/Areia · — Balcao para Pia Cadorin Laura 2pt 3gv 120cm Freijo/Fume"
  - heading "Central Operacional" [level=3]
  - text: Situação geral
  - button " 25 Em Aberto":
    - text: 
    - paragraph: "25"
    - paragraph: Em Aberto
  - button " 13 Agendados":
    - text: 
    - paragraph: "13"
    - paragraph: Agendados
  - button " 5 Entregas Hoje":
    - text: 
    - paragraph: "5"
    - paragraph: Entregas Hoje
  - button " 5 Atrasadas":
    - text: 
    - paragraph: "5"
    - paragraph: Atrasadas
  - button " 0 Montagens":
    - text: 
    - paragraph: "0"
    - paragraph: Montagens
  - button " 0 Recebimentos":
    - text: 
    - paragraph: "0"
    - paragraph: Recebimentos
  - text: 
  - heading "Catálogo Digital" [level=2]
  - paragraph: Métricas da Loja Online
  - text: Visualizações 0 Visitantes Únicos 0 Conversão Estimada 0.0% Total de Produtos 415
  - link "Gerenciar Catálogo Completo ":
    - /url: /marketing/catalog
  - heading "Produtos" [level=3]
  - link "Relatório →":
    - /url: /sales-order
  - button "Faturamento"
  - button "Pedidos"
  - button "Lucro"
  - button "Parados"
  - text: "1"
  - paragraph: SOFÁ IBIZA RETRÁTIL E RECLINÁVEL 3 METROS VELUDO TABACO
  - text: R$ 2.999,00 100% 2
  - paragraph: SOFÁ IBIZA 2,90M 3 LUGARES RETRÁTIL E RECLINAVEL CINZA
  - text: R$ 2.499,00 100% 3
  - paragraph: GUARDA ROUPA 2,38 6 PORTAS E PÉS SERENA DAMULTI
  - text: R$ 1.599,00 100% 4
  - paragraph: COZINHA MODULADA TUNÍSIA 2,63M
  - text: R$ 1.549,00 100% 5
  - paragraph: COZINHA MODULADA INDEKES STAR
  - text: R$ 1.499,00 100%
  - heading "Pedidos Recentes" [level=3]
  - link "Ver todos →":
    - /url: /sales-order
  - text: "#003320"
  - paragraph: Andreia Fernandes
  - paragraph: —
  - paragraph: R$ 2.206,00
  - text: "Agendado #003289"
  - paragraph: Alessandra Barbosa
  - paragraph: —
  - paragraph: R$ 3.497,00
  - text: "Agendado #003200"
  - paragraph: Barbara Diaz Granado
  - paragraph: —
  - paragraph: R$ 399,00
  - text: "Agendado #003298"
  - paragraph: Silvana Domingos da Silva
  - paragraph: —
  - paragraph: R$ 498,00
  - text: "Agendado #003172"
  - paragraph: Claudiane Francine Fonseca
  - paragraph: —
  - paragraph: R$ 569,00
  - text: Agendado 
  - heading "Radar Geográfico" [level=3]
  - paragraph: Concentração de vendas por região
  - button " Expandir"
  - heading " Radar Geográfico de Vendas" [level=2]
  - paragraph: Mapeamento Térmico de Performance - Curitiba e RMC
  - button "Venda"
  - button "Pedidos"
  - text: Opacidade
  - slider: "0.8"
  - region "Map"
  - text: Baixo Volume Alto 
  - heading "Logística" [level=3]
  - text:  Entregas realizadas 75  Pendentes de entrega 13  Atrasadas 6  KM percorridos 0.0 km 
  - heading "APIs & Consumo" [level=3]
  - paragraph: Ciclo de Setembro
  - text: Saudável
  - button "Serviços"
  - button "Modelos IA"
  - button "Módulos ERP"
  - text: "Google Routes API 958 / 1,000 (95.8%) Google Places (Autocomplete & Details) 170 / 1,500 (11.3%) Google Geocoding API 1,102 / 1,000 (100%) Google Route Optimization 1 / 200 (0.5%) Total:"
  - strong: 2,393
  - text: chamadas
  - link "Ver detalhes ":
    - /url: /api-usage
- text: Seu Lizandro Agente IA do ERP
- button "Abrir chat do Seu Lizandro, Agente Inteligente do ERP":
  - img "Seu Lizandro - Agente IA"
- banner:
  - img "seu Lizandro"
  - heading "seu Lizandro" [level=4]
  - text: "Agente ERP Tela: Dashboard"
  - button ""
  - button ""
  - button ""
- img "seu Lizandro"
- text: Olá! Sou Seu Lizandro, seu Agente Inteligente do ERP. Posso lançar despesas, receitas, consultar o fluxo de caixa ou tirar dúvidas do sistema. Como posso te ajudar hoje? 01:19 PM
- 'textbox "Ex: Paguei 230 de gasolina hoje no Pix..."'
- button ""
- button "" [disabled]
- region "Notifications Alt+T"
```

# Test source

```ts
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
  130 |   await page.goto('/?auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator');
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
> 149 |   await expect(page.locator('[data-testid="assistant-input"]')).toBeVisible({ timeout: 15000 });
      |                                                                 ^ Error: expect(locator).toBeVisible() failed
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