---
name: testes-seguros-erp
description: Planeje e execute testes seguros do ERP e App Mobile em alterações de regras de negócio, banco, estoque, vendas, recebimentos, devoluções, custos, relatórios ou integrações, sem tocar dados reais, com suporte a roadmap cíclico contínuo e Docker.
---

# Testes Seguros do ERP & App Mobile

Use esta skill sempre que a mudança puder alterar regras de negócio, persistência, interface ou efeitos entre módulos. Também utilize-a como guia mestre para executar e continuar o **Roadmap Cíclico de Testes Contínuos** do Morante Hub.

---

## 1. Regra de Ouro da Blindagem de Dados

> [!CAUTION]
> **NUNCA TOCAR DADOS REAIS DE PRODUÇÃO OU CLIENTES EXISTENTES.**
> Teste regras reais com dados 100% isolados, reproduzíveis e descartáveis. Se for fazer adição, criação, edição ou remoção de qualquer dado no banco de dados, utilize **EXCLUSIVAMENTE DADOS DE TESTE** identificados com prefixo padronizado (`[TESTE_AUT]` ou `testRunId`).

1. **Geração de `testRunId`**: Cada bateria gera um identificador único, ex: `TESTE_HUB_20260905_120000_F4A12`.
2. **Campos Seguros**: O `testRunId` deve estar presente no nome do cliente (`Cliente Teste [TESTE_AUT]`), código de referência, SKU ou observações.
3. **Limpeza Garantida (Teardown)**: Ao concluir cada teste ou suíte, execute a limpeza imediata de todos os registros contendo o `testRunId` em bloco `finally` ou hooks de pós-execução.
4. **Ambiente Não-Produção**: Confirme que a execução ocorre em ambiente local, banco de testes ou staging isolado. Se não for possível garantir o isolamento, aborte qualquer operação que execute escrita ou mutação.

---

## 2. Uso de Docker no Ambiente de Testes

> [!IMPORTANT]
> **Detecção Automática do Docker**: Se o Docker estiver ligado e em execução no sistema, ele **DEVE SER UTILIZADO** como ambiente preferencial para isolamento total dos testes de integração e banco de dados.

### Protocolo de Detecção e Seleção de Runtime:
1. **Verificar se o Docker está ativo**:
   Executar comando de checagem: `docker ps` ou `docker compose ps`.
2. **Se o Docker ESTIVER ATIVO**:
   - Suba/utilize o contêiner dedicado de testes do PostgreSQL/Supabase local (`docker compose -f docker-compose.test.yml up -d` ou contêiner existente de testes).
   - Execute as migrations de teste no contêiner isolado.
   - Conecte a suíte de testes de integração à porta do contêiner Docker.
   - Ao final dos testes destrutivos ou do ciclo, limpe o estado do contêiner ou execute `down -v` se aplicável.
3. **Se o Docker NÃO ESTIVER ATIVO (ou não instalado)**:
   - Recorra ao ambiente de testes seguro local com mocks em memória (`vitest`), transações de banco com `ROLLBACK` automático no Supabase dev/staging, ou factories controladas com `testRunId` e limpeza explícita no `finally`.
   - Nunca interrompa o processo de testes apenas pela ausência do Docker; use o fallback seguro.

---

## 3. Matriz Completa de Tipos de Testes

A suíte do Morante Hub engloba **todos os tipos possíveis de teste** para assegurar tanto a lógica profunda de negócio quanto a integridade da interface:

| Tipo de Teste | Escopo | Ferramentas / Métodos |
|---|---|---|
| **Testes Unitários** | Funções puras, cálculos de CMPM, CMV, frete, descontos, transições de status, máscaras de moeda, formatação de endereço, slots de horário. | Vitest (`npm --prefix erp run test:unit`), Jest. Execução em memória sem dependências externas. |
| **Testes de Integração** | Serviços de Venda, Estoque, Movimentações, Conciliação Financeira, APIs externas (Google Maps, SEFAZ schemas). | Vitest com banco isolado (Docker se ativo / staging isolado com `testRunId`). |
| **Testes E2E / Interface / Visual** | Navegação, telas full screen, tabelas, cards responsivos (<1280px vs >=1280px), formulários, bottom sheets, modais. | Browser Subagent, Playwright, Chrome DevTools. Validação visual de renderização e fluxos de clique/input. |
| **Testes de Tipagem & Contratos** | Conformidade TypeScript, integridade de propriedades herdadas, schemas tributários, eventos mobile. | `node mobile/node_modules/typescript/bin/tsc --noEmit`, `npm --prefix erp run typecheck`. |
| **Testes Mobile Offline-First** | Registro de eventos operacionais, ciclo de 4 estados (`PENDING` → `SYNCING` → `CONFIRMED` / `REJECTED`), fila de sync e autoridade do backend. | Mocks de AsyncStorage/NetInfo, testes dos hooks de rotas e sincronização. |

---

## 4. Ordem Oficial dos Módulos Vitais e Críticos

Os testes devem seguir rigorosamente a **ordem de criticidade do negócio**:

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
[RECOMEÇO DO CICLO] → Retorna ao [MÓDULO 1] (Ciclo N+1)
```

---

## 5. Roteiro Cíclico Contínuo e Continuação por Goals

> [!IMPORTANT]
> **Roteiro Cíclico Infinito**: O teste nunca termina em um ponto morto. Quando o **Módulo 9** é concluído com sucesso, o roteiro **recomeça no Módulo 1** em uma nova rodada de checagem (Ciclo 1 → Ciclo 2 → Ciclo 3...).
> **Continuação Exata de Onde Parou**: Sempre que o usuário solicitar *"continue os testes"*, *"prossiga com o roteiro"* ou acionar a execução, o agente deve obrigatoriamente ler o arquivo de tracking `docs/ROTEIRO_TESTES_CICLICOS.md`, identificar o último goal/módulo concluído e retomar a partir da etapa seguinte.

### Protocolo de Execução do Roteiro Cíclico:

1. **Leitura do Checkpoint**:
   Abra e leia `docs/ROTEIRO_TESTES_CICLICOS.md`. Identifique:
   - `Ciclo Atual` (ex: Ciclo 1)
   - `Módulo Atual` (ex: Módulo 3 - Logística)
   - `Próxima Etapa / Goal` (ex: Etapa 3.2 - Teste da Tela de Etapas da Entrega)
2. **Detecção de Ambiente**:
   Cheque se Docker está rodando. Se sim, use Docker. Se não, use o ambiente seguro in-memory / local dev.
3. **Execução da Etapa Atual**:
   - Execute os testes correspondentes (unitários, integração, tipo ou interface).
   - Se envolver persistência, gere `testRunId`, crie dados com `[TESTE_AUT]`, valide os resultados e faça o teardown completo.
4. **Registro de Resultados**:
   - Atualize `docs/ROTEIRO_TESTES_CICLICOS.md` com:
     - Status: `PASSOU`, `FALHOU` ou `AVISO`.
     - Evidência técnica (log, saída do comando, screenshot se visual).
     - Registro de qualquer bug detectado para correção imediata.
5. **Avanço do Cursor de Goals**:
   - Avance o cursor para a próxima etapa.
   - Se completou o Módulo 9, atualize `Ciclo Atual = Ciclo + 1` e aponte para `Módulo 1 - Etapa 1.1`.
6. **Reporte ao Usuário**:
   Apresente um resumo claro do que foi testado, qual foi o resultado, e qual é o próximo goal pronto para execução.

---

## 6. Detalhamento dos Módulos no Roteiro

### [MÓDULO 1] Vendas & Pedidos de Venda (`SalesOrder`)
- **1.1 Código Sequencial Único (`orderIndex`)**: Validação de formato `#00XXXX`, não-nulo, unicidade estrita, bloqueio sem código, blindagem em updates parciais.
- **1.2 Ciclo de Vida e Status**: Transição `draft` → `scheduled` (para entregas com agendamento) ou `fulfilled` (para retiradas imediatas).
- **1.3 Ações Pós-Venda (`PostOrderActionsModal`)**: Garantia de que ações de impressão/WhatsApp nunca revertem status para rascunho nem perdem `orderIndex`.
- **1.4 Itens e Manuseio de Montagem**: Preservação estrita do manuseio selecionado; selos amarelo (`Montagem Depósito`) e vermelho (`Montagem Fora`) com ícone `Drill` preenchido.
- **1.5 Cálculos Financeiros do Pedido**: Subtotal, descontos (R$ e %), frete manual vs automático, acréscimos, valor total líquido, troco.
- **1.6 Interface Full Screen**: Modal de pedido em tela cheia (`z-[999999]`) sobrepondo o header, bloqueio de scroll do body e ausência de barra vertical nos inputs numéricos (`CurrencyInput`).

### [MÓDULO 2] Estoque, Movimentações, CMPM e CMV
- **2.1 Entradas de Estoque**: Criação de movimentos de entrada (`inventory_moves`), cálculo correto do Custo Médio Ponderado Móvel (CMPM).
- **2.2 Saídas por Venda**: Saída única e irreversível vinculada ao pedido atendido; CMV materializado com base no CMPM da data da venda.
- **2.3 Idempotência**: Validação contra duplicação de saídas ou entradas ao recarregar a tela ou reenviar requisições.
- **2.4 Cancelamentos & Estornos**: Cancelamento de pedido estorna as saídas de estoque recompondo o saldo físico sem duplicar registros de auditoria.
- **2.5 Devoluções de Venda**: Entrada única para itens devolvidos recuperando o CMV original histórico da venda, sem usar o custo atual.

### [MÓDULO 3] Logística, Entregas e Montagens (ERP & App Mobile)
- **3.1 Sem Ordem Compulsória**: Agendamentos por período (`13:00–18:00`) exibem pin normal sem cadeado e sem `#1, #2, #3`; horários fixos (`15:00`) exibem cadeado `🔒`.
- **3.2 Hub de Entregas Mobile (Hoje, Cronograma, Mapa)**: Estado sem seleção compacto ("X entregas pendentes hoje"), clique no marcador destaca pin e substitui card, botão `X` limpa seleção.
- **3.3 Depósito Móveis Morante**: Pin diferenciado (`🏬`), sem opções de entrega.
- **3.4 Fluxo de Início de Entrega**: Clique em `[ INICIAR ENTREGA ]` direciona para a tela de etapas existente; primeira etapa oferece `[ ABRIR ROTA NO GOOGLE MAPS ]` via navegação externa no Android.
- **3.5 Mobile Offline-First**: Eventos operacionais locais com UUID idempotente, ciclo de 4 estados (`PENDING` → `SYNCING` → `CONFIRMED` / `REJECTED`).

### [MÓDULO 4] Fiscal (NF-e / NFC-e SEFAZ-PR Direto)
- **4.1 Modal de Emissão Fiscal**: Lista de itens da venda sem numeração estática `#1, #2...`. Destaque para itens temporários (`!productId`).
- **4.2 Campos Tributários Obrigatórios**: NCM pesquisável com `NcmSelect`, CFOP, CSOSN/CST, Origem e CEST selecionáveis via `<select>`.
- **4.3 Validação de XML & Schemas**: Validação dos nós XML contra schemas oficiais do SEFAZ-PR antes da transmissão.
- **4.4 DANFE & Contingência**: Geração de espelho DANFE e tratamento de contingência sem perda de dados fiscais.

### [MÓDULO 5] Financeiro, Recebimentos e Contas a Receber
- **5.1 Geração de Contas a Receber**: Parcelamento, vencimentos e valores gerados automaticamente na conclusão do pedido.
- **5.2 Baixas e Formas de Pagamento**: Baixas parciais e totais (Dinheiro, PIX, Cartão, Boleto, Promissória).
- **5.3 Conciliação de Caixa**: Fechamento de caixa diário e conferência de recebimentos por operador.

### [MÓDULO 6] Produtos, Variações & Catálogo Digital
- **6.1 Ativo / Desativado vs Publicado / Oculto**: Independência total entre ativação no ERP (`active: true/false`) e publicação no Catálogo Digital (`published/hidden`).
- **6.2 Rascunhos**: Exibição na listagem principal com badge âmbar, bloqueio de ativação/publicação até conclusão e botão "Descartar Rascunho" nos 3 pontinhos.
- **6.3 Variações Filhas**: Herança padrão de informações do produto pai (`syncDescription`, dimensões, peso); cards brancos individuais e fundo cinza para o pai.
- **6.4 Fotos 1:1 (`SquareImageCropper`)**: Proporção quadrada sem borda interna, cantos retos e canvas livre de erro CORS tainted.
- **6.5 Responsividade**: Cards em resoluções `< 1280px` e Tabela em `>= 1280px`.

### [MÓDULO 7] Pessoas, Clientes, Fornecedores & Geocodificação
- **7.1 Validações Cadastrais**: CPF/CNPJ, máscaras, estado padrão Paraná (`PR`).
- **7.2 Autocomplete de Endereços**: Google Places restrito a logradouros/ruas (sem estabelecimentos comerciais).
- **7.3 Geocodificação Resiliente**: Fallback de coordenadas (número → rua → bairro/cidade) com proteção de cota Google Cloud (margem 70%).

### [MÓDULO 8] Catálogo Digital & Integração Meta
- **8.1 Visualização Digital**: Renderização correta de produtos publicados, fotos e preços.
- **8.2 Geração de Feed Meta**: Formato XML/CSV padronizado para sincronização de catálogo no Facebook/Instagram.

### [MÓDULO 9] Relatórios Gerenciais, DRE & Métricas Comerciais
- **9.1 Faturamento Líquido vs Bruto**: Dedução de devoluções e desconsideração de pedidos cancelados.
- **9.2 Apuração de Margem e Lucro**: Confronto de faturamento com o CMV real do estoque.
- **9.3 Comissões**: Cálculo correto por vendedor e montador de acordo com regras operacionais.

---

## 7. Encerramento de Ciclo e Reinício

Ao concluir o Módulo 9:
1. Registre o fechamento do ciclo atual em `docs/ROTEIRO_TESTES_CICLICOS.md`.
2. Incremente o contador de ciclo: `Ciclo 1 → Ciclo 2`.
3. Aponte o cursor de execução de volta para `Módulo 1 (Vendas & Pedidos)`.
4. Comunique o sucesso da rodada ao usuário, indicando eventuais pontos de atenção e deixando o próximo ciclo pronto para ser continuado sob demanda.

