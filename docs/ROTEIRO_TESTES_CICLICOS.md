# Roadmap de Testes Cíclico do Morante Hub (ERP & Mobile)

> Este documento é o **cursor persistente de estado** do roteiro de testes contínuo do Morante Hub.  
> O roteiro é **estritamente cíclico**: ao concluir o Módulo 9, o ciclo recomeça no Módulo 1 (Ciclo N → Ciclo N+1).  
> Sempre que solicitado *"continue os testes"*, a execução retoma exatamente a partir da próxima etapa pendente indicada no cursor abaixo.

---

## 📌 Cursor de Estado Atual

| Campo | Valor |
|---|---|
| **Ciclo Atual** | **Ciclo 1** |
| **Módulo Atual** | **[MÓDULO 1] Vendas & Pedidos de Venda (`SalesOrder`)** |
| **Próxima Etapa / Goal** | **Etapa 1.2 - Ciclo de vida e transições de status (`draft` → `scheduled` / `fulfilled` / `cancelled`)** |
| **Status do Goal** | ⏳ `PRONTO_PARA_EXECUTAR` |
| **Ambiente Ativo** | Local / Staging (Docker inativo no host - usando isolamento in-memory e `testRunId`) |
| **Último testRunId** | `TESTE_HUB_20260905_125109_M1_SALES` |
| **Data da Última Atualização** | 2026-09-05 12:51:13 |

---

## 🛡️ Regras de Ouro e Segurança de Dados

1. **PROIBIDO TOCAR DADOS REAIS**: Qualquer dado inserido, editado ou removido deve conter o identificador `[TESTE_AUT]` ou `testRunId`.
2. **TEARDOWN GARANTIDO**: Todo teste que criar registros no banco de dados deve executar limpeza completa em bloco `finally`.
3. **DOCKER PREFERENCIAL**: Se o comando `docker ps` retornar contêineres ativos, a execução de testes de integração é redirecionada para o contêiner de teste isolado. Caso contrário, utiliza mocks e transações locais seguras.

---

## 🗺️ Mapa de Módulos (Ordem de Criticidade)

```
[MÓDULO 1] Vendas & Pedidos de Venda (SalesOrder)
    ↓
[MÓDULO 2] Estoque, Movimentações, CMPM e CMV
    ↓
[MÓDULO 3] Logística, Entregas e Montagens (ERP & Mobile)
    ↓
[MÓDULO 4] Fiscal (NF-e / NFC-e SEFAZ-PR Direto)
    ↓
[MÓDULO 5] Financeiro, Recebimentos e Contas a Receber
    ↓
[MÓDULO 6] Produtos, Variações & Catálogo Digital
    ↓
[MÓDULO 7] Pessoas, Clientes, Fornecedores & Geocodificação
    ↓
[MÓDULO 8] Catálogo Digital & Integração Meta
    ↓
[MÓDULO 9] Relatórios Gerenciais, DRE & Métricas Comerciais
    ↓
[REINÍCIO DO CICLO] ↺ Retorna ao [MÓDULO 1] (Ciclo N+1)
```

---

## 📋 Grade de Execução do Ciclo 1

### [MÓDULO 1] Vendas & Pedidos de Venda (`SalesOrder`) — Criticidade: ALTA (VITAL)
- [x] **Etapa 1.1**: Código Sequencial Único (`orderIndex`, formato `#00XXXX`, não-nulo, unicidade e blindagem em updates parciais).  
  *Tipo:* Unitário / Integração (`vitest run src/pages/utils/orderChangeDetector.test.ts`) — **12/12 testes aprovados** (2026-09-05)
- [ ] **Etapa 1.2**: Ciclo de vida e transições de status (`draft` → `scheduled` / `fulfilled` / `cancelled`).  
  *Tipo:* Unitário / Regra de Negócio
- [ ] **Etapa 1.3**: Ações pós-venda (`PostOrderActionsModal` - não perde código e não reverte status).  
  *Tipo:* Integração / Interface
- [ ] **Etapa 1.4**: Manuseio de itens e montagens (Preservação estrita, badges amarelo e vermelho, ícone `Drill`).  
  *Tipo:* Unitário / Interface
- [ ] **Etapa 1.5**: Cálculos financeiros do pedido (Descontos R$ e %, frete, total líquido, cálculo de troco).  
  *Tipo:* Unitário
- [ ] **Etapa 1.6**: Modal de pedido em tela cheia (Full screen, scroll do body bloqueado, sem barra vertical nos inputs).  
  *Tipo:* Interface E2E

### [MÓDULO 2] Estoque, Movimentações, CMPM e CMV — Criticidade: ALTA (VITAL)
- [ ] **Etapa 2.1**: Entradas de estoque e recálculo determinístico do CMPM.  
  *Tipo:* Unitário (`vitest run src/pages/utils/movingAverageCostRules.test.ts`)
- [ ] **Etapa 2.2**: Saída única na efetivação de venda com materialização do CMV histórico.  
  *Tipo:* Unitário (`vitest run src/pages/utils/saleInventoryRules.test.ts`)
- [ ] **Etapa 2.3**: Idempotência de movimentos (bloqueio contra duplicidade por reenvio ou refresh).  
  *Tipo:* Integração com `testRunId`
- [ ] **Etapa 2.4**: Cancelamento de pedido (estorno de saídas e recomposição do estoque físico).  
  *Tipo:* Unitário / Integração
- [ ] **Etapa 2.5**: Devoluções de venda atendidas (entrada com recuperação do CMV histórico da venda).  
  *Tipo:* Unitário (`vitest run src/pages/utils/returnInventoryRules.test.ts`)

### [MÓDULO 3] Logística, Entregas e Montagens (ERP & App Mobile) — Criticidade: ALTA (VITAL)
- [ ] **Etapa 3.1**: Semântica de agendamento (Períodos sem cadeado e sem `#1, #2, #3`; horário fixo com `🔒`).  
  *Tipo:* Unitário (`scheduleSlots.ts`)
- [ ] **Etapa 3.2**: Hub de Entregas Mobile (Hoje, Cronograma, Mapa interativo com cards dinâmicos).  
  *Tipo:* Interface E2E Browser Subagent
- [ ] **Etapa 3.3**: Marcador do Depósito Móveis Morante diferenciado (`🏬`) sem ações de entrega.  
  *Tipo:* Interface E2E
- [ ] **Etapa 3.4**: Iniciar Entrega → Tela de etapas → Abrir rota externa no Google Maps Android.  
  *Tipo:* Unitário (`googleMapsNavigationDeliveryFlow.test.ts`) / Mobile
- [ ] **Etapa 3.5**: Mobile Offline-First (Eventos atômicos, ciclo de 4 estados e autoridade do backend).  
  *Tipo:* Unitário / Mock de Sync

### [MÓDULO 4] Fiscal (NF-e / NFC-e SEFAZ-PR Direto) — Criticidade: ALTA (VITAL)
- [ ] **Etapa 4.1**: Lista de itens da venda no modal fiscal (sem numeração fixa `#1, #2...`, destaque para itens temporários).  
  *Tipo:* Interface / Unitário
- [ ] **Etapa 4.2**: Campos tributários padronizados via `<select>` (CFOP, CSOSN/CST, Origem, CEST e `NcmSelect`).  
  *Tipo:* Interface / Schema
- [ ] **Etapa 4.3**: Geração e validação de nós XML contra schemas oficiais do SEFAZ-PR.  
  *Tipo:* Unitário (`vitest run src/pages/utils/nfe/`)
- [ ] **Etapa 4.4**: Emissão de DANFE, cancelamento e contingência.  
  *Tipo:* Integração SEFAZ (Ambiente Homologação com dados `[TESTE_AUT]`)

### [MÓDULO 5] Financeiro, Recebimentos e Contas a Receber — Criticidade: ALTA
- [ ] **Etapa 5.1**: Lançamentos financeiros automáticos na finalização de pedidos.  
  *Tipo:* Integração / Unitário
- [ ] **Etapa 5.2**: Formas de pagamento (Dinheiro, PIX, Cartões, Boleto, Promissória) e baixas parciais/totais.  
  *Tipo:* Unitário / Regra de Negócio
- [ ] **Etapa 5.3**: Fechamento de caixa diário e conciliação por operador.  
  *Tipo:* Integração

### [MÓDULO 6] Produtos, Variações & Catálogo Digital — Criticidade: MÉDIA-ALTA
- [ ] **Etapa 6.1**: Independência de status: Ativo/Desativado no ERP vs Publicado/Oculto no Catálogo.  
  *Tipo:* Unitário / Regra de Negócio
- [ ] **Etapa 6.2**: Rascunhos na listagem com bloqueio de ativação e opção de descarte nos 3 pontinhos.  
  *Tipo:* Unitário / Interface
- [ ] **Etapa 6.3**: Variações filhas herdando do produto pai e layout (Cards brancos, pai cinza).  
  *Tipo:* Unitário (`vitest run src/pages/utils/productVariationDefaults.test.ts`)
- [ ] **Etapa 6.4**: Fotos 1:1 (`SquareImageCropper`) sem bordas internas e livre de Canvas Tainted CORS.  
  *Tipo:* Interface E2E
- [ ] **Etapa 6.5**: Responsividade: Cards em `< 1280px` e Tabela em `>= 1280px`.  
  *Tipo:* Interface E2E

### [MÓDULO 7] Pessoas, Clientes, Fornecedores & Geocodificação — Criticidade: MÉDIA
- [ ] **Etapa 7.1**: Cadastro PF/PJ com validação de CPF/CNPJ e estado padrão Paraná (`PR`).  
  *Tipo:* Unitário / Form
- [ ] **Etapa 7.2**: Autocomplete de logradouros (Google Places restrito a endereços sem estabelecimentos).  
  *Tipo:* Integração
- [ ] **Etapa 7.3**: Fallback resiliente de geocodificação no Google Maps (proteção de cota Free Tier).  
  *Tipo:* Unitário / API

### [MÓDULO 8] Catálogo Digital & Integração Meta — Criticidade: MÉDIA
- [ ] **Etapa 8.1**: Catálogo Web: exibição fiel de itens publicados, preços e variações.  
  *Tipo:* Interface E2E
- [ ] **Etapa 8.2**: Geração do feed de produtos para integração Meta (Instagram/Facebook Shopping).  
  *Tipo:* Unitário / Integração

### [MÓDULO 9] Relatórios Gerenciais, DRE & Métricas Comerciais — Criticidade: MÉDIA
- [ ] **Etapa 9.1**: Apuração de faturamento bruto vs faturamento líquido (dedução de devoluções).  
  *Tipo:* Unitário
- [ ] **Etapa 9.2**: Cálculo de margem de contribuição e lucro bruto com base no CMV real.  
  *Tipo:* Unitário
- [ ] **Etapa 9.3**: Cálculo de comissões operacionais de vendedores e montadores.  
  *Tipo:* Unitário

---

## 📜 Histórico de Execuções e Achados

| Data / Hora | Ciclo | Módulo | Etapa | Resultado | Evidência / Notas |
|---|---|---|---|---|---|
| 2026-09-05 12:50 | Ciclo 1 | N/A | Setup | ✅ INICIALIZADO | Skill e roteiro cíclico criados e estruturados |
| 2026-09-05 12:51 | Ciclo 1 | Módulo 1 (Vendas) | Etapa 1.1 | ✅ APROVADO | 12/12 testes unitários de detecção de alterações e regras de pedidos (`TESTE_HUB_20260905_125109_M1_SALES`) |
