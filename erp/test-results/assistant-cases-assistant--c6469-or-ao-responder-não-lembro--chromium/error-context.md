# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: assistant\cases\assistant-context.spec.ts >> Assistente Financeiro - Contexto Incremental e Desconhecimento >> Não repete pergunta de valor ao responder "não lembro"
- Location: tests\e2e\assistant\cases\assistant-context.spec.ts:14:3

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

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
- text: Olá! Sou Seu Lizandro, seu Agente Inteligente do ERP. Posso lançar despesas, receitas, consultar o fluxo de caixa ou tirar dúvidas do sistema. Como posso te ajudar hoje? 01:15 PM
- 'textbox "Ex: Paguei 230 de gasolina hoje no Pix..."'
- button ""
- button "" [disabled]
- region "Notifications Alt+T"
```

```
Tearing down "context" exceeded the test timeout of 30000ms.
```