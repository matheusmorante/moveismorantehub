# Regras e Comportamentos do Sistema - Morante Hub

Este documento é a **Fonte Canônica de Regras Universais (Nível 1)** do Morante Hub.
Para regras técnicas e regras de domínio específicas, consulte as Skills correspondentes conforme o modelo de governança.

---

## 1. PRINCÍPIOS PERMANENTES INVIOLÁVEIS DO AGENTE

> [!IMPORTANT]
> **"ANTES DE CRIAR, PROCURE. ANTES DE ALTERAR, ENTENDA. ANTES DE ABSTRAIR, JUSTIFIQUE. ANTES DE CONCLUIR, TESTE. ANTES DE DIZER QUE RESOLVEU, VERIFIQUE REGRESSÕES."**

1. **Investigação Prévia Obrigatória**: Nunca inicie implementação sem antes localizar e entender o código existente. É expressamente proibido criar implementações paralelas por comodidade.
2. **Regra da Causa Raiz**: Nunca corrija sintomas antes de investigar e identificar a causa raiz. É proibido adicionar retries, timeouts, sleeps artificiais, mascarar assertions ou duplicar lógica para contornar um problema de origem.
3. **Menor Alteração Necessária (Anti-Refatoração Desnecessária)**: Modifique apenas o necessário para cumprir a tarefa. Não realize "limpeza geral", renomeações em massa ou reestruturações não solicitadas. Se uma refatoração for genuinamente indispensável, justifique previamente ao usuário.
4. **Resolução de Divergências (`Regra Oficial × Código`)**: O código em produção pode conter bugs silenciosos ou legados, e documentações podem desatualizar. **Divergência entre regra de negócio e código significa INVESTIGAR A CAUSA RAIZ, e NUNCA adaptar automaticamente um ao outro.** Consulte o usuário em caso de dúvida de negócio.
5. **Git Push**: Nunca executar `git push` automaticamente. Aguardar solicitação explícita do usuário.
6. **Idioma**: Falar apenas em português brasileiro.

---

## 2. GATILHO PRÉ-EDIÇÃO DE ARQUIVOS (PRE-FLIGHT OBRIGATÓRIO)

Antes de propor ou realizar qualquer edição (`replace_file_content` / `write_to_file`) em QUALQUER arquivo, o agente DEVE mentalmente executar a verificação de conformidade em 3 níveis:

```text
┌────────────────────────────────────────────────────────┐
│  NÍVEL 1: GLOBAL (Universal)                           │
│  - Entendi a causa raiz?                               │
│  - É a menor alteração necessária?                     │
│  - Evitei refatoração paralela ou cosmética?           │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│  NÍVEL 2: TÉCNICO (Conforme a Stack Envolvida)         │
│  - `governanca-skills`         → Seleção e composição  │
│  - `modularizacao_codigo`      → Arquitetura, SOLID    │
│  - `database-supabase`         → Consultas e Egress    │
│  - `testes-seguros-erp`        → Testes e causa raiz   │
│  - `cloud-free-tier-guard`     → APIs e teto R$ 0,00   │
│  - `mobile-offline-first`      → SQLite e sincronia    │
│  - `arquitetura-agente-gemini` → Function Calling IA   │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│  NÍVEL 3: DOMÍNIO (Conforme a Regra de Negócio)        │
│  - `regras-de-negocio-erp`     → Estoque, CMPM, CMV    │
│  - `nfe-sefaz-direto`          → Fiscal, SEFAZ-PR      │
│  - `analise-compatibilidade`   → Snapshots e histórico │
└────────────────────────────────────────────────────────┘
```

---

## 3. REGRAS TÉCNICAS CENTRAIS DO ECOSSISTEMA

- **Modularização Segura e Limite de Linhas (`modularizacao_codigo`)**:
  - Alvo recomendado de 30–100 linhas (aceitável até ~150 linhas; acima de 200 linhas ou com acúmulo de responsabilidades, analisar divisão conservadora).
  - Estratégia conservadora sem perda de lógica: **COPIAR → VALIDAR → CONECTAR → TESTAR → SÓ DEPOIS REMOVER**.
- **Versionamento Unificado Mobile e ERP**:
  - Ao atualizar versões ou builds do App Mobile, sincronizar 100% dos locais:
    1. `mobile/app.json` (`version`, `runtimeVersion`, `versionCode`);
    2. `mobile/android/app/build.gradle` (`versionCode`, `versionName`);
    3. `mobile/src/constants/appVersion.ts` (`APP_VERSION`, `APP_BUILD`, `APP_RELEASE_DATE`);
    4. `mobile/src/components/ProfileModal.tsx`;
    5. `mobile/src/hooks/useMandatoryAppUpdate.ts`;
    6. Supabase `settings` id `'app'` (`mobileSettings`);
    7. `erp/src/pages/App/MobileAppLanding.tsx`.
- **Buscas Accent-Insensitive Globais**:
  - Em todos os inputs de busca, autocompletes e filtros, a pesquisa é 100% insensível a acentuações (`normalizeSearchTerm` com NFD).
- **Proibição de Bloqueio em RLS e APIs**:
  - Garantir políticas RLS permissivas e válidas para operações do ERP e Mobile sem rejeições silenciosas.

---

## 4. PADRÕES VISUAIS E IDENTIDADE DO SISTEMA

- **Terminologia de Produtos**: No ERP: **Ativos** / **Desativados** (nunca publicados/despublicados). No Catálogo: **Publicado no Catálogo** / **Ocultado do Catálogo**.
- **Ícone e Selos de Montagem (`Drill` - Furadeira Preenchida)**:
  - Componente oficial `Drill` preenchido (ERP `@/components/shared/DrillIcon` e Mobile `MobileDrill`).
  - Cores: **Montagem Fora** em Vermelho (`bg-red-600`); **Montagem Depósito** em Amarelo/Âmbar (`bg-amber-500`).
  - Se um pedido contiver ambos os tipos, ambos os selos são exibidos lado a lado. Em devoluções (`is_return: true`), selos de montagem não são exibidos.
- **Selo Queima dos Salvados**:
  - Sempre exibe o nome completo **"Queima dos Salvados"** com ícone de fogo (`bi-fire` no ERP e `Flame` no Mobile), fundo âmbar e borda âmbar.
- **Inputs Numéricos**:
  - `CurrencyInput`, `CurrencyOrPercentInput` e `UnitInput` não possuem borda divisória vertical separando o símbolo (`R$`, `%`, `UN`) do valor digitado.
- **Cabeçalho de Recibos e Impressões**:
  - Apenas a logo oficial é exibida (sem repetição textual do nome), com container sem borda e sem sombra.

---

## 5. REGRAS INVIOLÁVEIS DE DOMÍNIO (RESUMO OPERACIONAL)

Para o detalhamento completo de fórmulas e regras de domínio, consulte as skills especializadas.

1. **Variações de Produtos**:
   - Todo produto possui pelo menos uma variação. Um produto simples é a sua própria variação principal única.
   - Variações herdam atributos técnicos por padrão (`syncDescription`, `syncWidth`, etc.).
2. **Vendas, Devoluções e Estoque**:
   - **Vendas**: Pedido agendado ou atendido gera saída de estoque com data efetiva igual à data de cadastro do pedido (`order.date`). CMV materializado no momento da saída é imutável.
   - **Devoluções**: Lançam entrada imediata no estoque no momento do cadastro (seja agendada ou atendida). Cancelamentos/estornos reverterem a entrada via modal com timer de segurança de 5 segundos.
   - **Itens Temporários**: Itens sem cadastro (`isTemporaryProduct: true`) **nunca** movimentam estoque nem geram CMV artificial.
3. **Cálculo de Rotas e Distâncias**:
   - Uso exclusivo da API oficial do Google Maps com fallback geográfico padrão para o Paraná (`PR`). Não utilizar APIs terceiras abertas.
4. **Assistente Financeiro de IA**:
   - Registra **exclusivamente fatos financeiros já ocorridos**. Proibido gerar parcelamentos futuros ou recorrências automáticas.
   - Múltiplas movimentações em uma mesma mensagem devem ser tratadas de forma estritamente *batch-aware* (`batchDraftsList`).
   - Despesas operacionais (salários, combustível, manutenção veicular, impostos, fornecedores, empréstimos da empresa) possuem finalidade `BUSINESS` conhecida automaticamente; nunca perguntar se são pessoais.

---

## 6. MAPA DE ARQUIVOS CRÍTICOS DO ERP

| Arquivo | Módulo | Responsabilidade |
|---|---|---|
| `erp/src/pages/utils/orderHistoryService.ts` | Pedidos | CRUD, status, estoque automático, devoluções |
| `erp/src/pages/utils/inventoryService.ts` | Estoque | CRUD central de `inventory_moves`, concorrência e estornos |
| `erp/src/pages/utils/returnInventoryRules.ts` | Devoluções | Regras de estoque e custo de devoluções |
| `erp/src/pages/utils/saleInventoryRules.ts` | Vendas | Regras de saída e validação de produtos cadastrados |
| `erp/src/pages/utils/productService/` | Produtos | Serviços modularizados de produtos e variações |
| `erp/src/pages/utils/goodsReceiptService.ts` | Recebimentos | Confirmação, estorno e entradas de compras |
| `erp/src/pages/utils/nfe/nfeService.ts` | Fiscal | Orquestrador central de validação e emissão SEFAZ |
| `erp/src/services/aiAgent/` | IA Gemini | Agente conversacional e Function Calling nativo |
