# Arquitetura de Estoque, CMPM, CMV, Devoluções e Reconciliação Histórica — Morante Hub

Este documento é a referência completa de regras de negócio de estoque, valoração de inventário, custos, CMV (Custo da Mercadoria Vendida) e reprocessamento histórico do ERP.

---

## 1. Princípios Fundamentais do CMPM (Custo Médio Ponderado Móvel)

1. **Método Oficial**: O ERP avalia o estoque e calcula o CMV exclusivamente via **Custo Médio Ponderado Móvel (CMPM)**. Não misturar CMPM com FIFO ou outras metodologias para apuração oficial de CMV.
2. **Escopo por SKU (Produto/Variação)**: O CMPM é calculado individualmente por variação/produto real que controla estoque. Custos de produtos ou variações distintas jamais são misturados.
3. **Entradas Valorizadas**: Apenas entradas valorizadas (ex: recebimentos de compras, devoluções atendidas com custo confiável) recalculam o custo médio unitário.
4. **Saídas de Venda**: Uma saída de venda **não** altera o custo médio unitário (`costPrice`). Ela retira quantidade e valor proporcionalmente ao CMPM vigente naquele instante.
5. **Fórmula de Nova Entrada**:
   $$\text{novoCostPrice} = \frac{(\text{stockAtual} \times \text{costPriceAtual}) + (\text{qtdRecebida} \times \text{custoUnitarioEntrada})}{\text{stockAtual} + \text{qtdRecebida}}$$

---

## 2. As Três Camadas Conceituais

| Camada | Descrição | Exemplos |
|---|---|---|
| **1. FATOS (Fatos Históricos)** | Eventos imutáveis ocorridos na operação | Recebimento confirmado, Venda agendada/atendida, Devolução atendida, Ajuste manual |
| **2. RESULTADOS DERIVADOS** | Valores calculados pela aplicação dos fatos na cronologia | CMPM num instante $t$, CMV materializado no item da venda, valor atribuído a um retorno de devolução |
| **3. CACHE MATERIALIZADO** | Estado atual consolidado para alta performance de leitura | `stock` e `costPrice` na tabela de produtos/variações |

- **Invariante Fundamental**: `REPLAY(Fatos Históricos) ≈ stock + costPrice atuais materializados`.

---

## 3. Materialização do CMV e Isolamento Histórico

1. **Materialização no Item da Venda**: Toda venda válida (`scheduled` ou `fulfilled`) grava nos itens o CMV unitário (`cmvUnitCost`) e o CMV total (`cmvTotal`) vigentes no instante exato da venda.
2. **Imutabilidade por Atualização do Produto**: Vendas antigas **nunca** têm seu CMV reajustado apenas porque o `costPrice` atual do produto mudou no futuro por novas compras.
3. **Leitura de Relatórios**: Relatórios financeiros e DREs leem os CMVs históricos materializados dos itens das vendas. Jamais recalculam o CMV de vendas passadas utilizando o `costPrice` atual do produto.

---

## 4. Estoque Zerado, Estoque Negativo e Custo Desconhecido

1. **Estoque Zerado (`stock = 0`)**: Quando o estoque físico chega a zero, um `costPrice` antigo não contamina compras futuras ($0 \times \text{costPriceAntigo} = 0$). A primeira nova entrada valorizada define integralmente o novo `costPrice`.
2. **Custo Desconhecido (Não Apurado / NULL)**: **Custo desconhecido NÃO é R$ 0,00.** Se não houver histórico confiável de custo para um produto/venda, o CMV deve permanecer como `não apurado` / `NULL`. Proibido inventar R$ 0,00, pois isso gera lucro bruto artificial de 100% e margens enganosas.
3. **Estoque Negativo**: Vendas permitidas operacionalmente antes do recebimento podem deixar `stock < 0`, mas estoque negativo **não autoriza inventar custo**. O CMV dessa venda permanece pendente/não apurado até a regularização da entrada correspondente via replay.

---

## 5. Devoluções de Venda (Efeito Físico e Financeiro)

1. **Separação de Fatos**: Venda e Devolução são eventos históricos distintos. Uma devolução jamais apaga ou exclui a venda original.
2. **Gatilhos de Estoque**:
   - Devolução Agendada (`scheduled`): NÃO gera movimentação de estoque.
   - Devolução Atendida (`fulfilled`) com produto cadastrado: Gera entrada de estoque (`type: 'entry'`).
3. **Custo de Retorno do Estoque**:
   - A unidade devolvida retorna ao estoque avaliada pelo **CMV unitário histórico materializado da venda original**.
   - Esse retorno de valor e quantidade no estoque pode ajustar o `costPrice` (CMPM) para as movimentações e vendas subsequentes.
4. **Efeito Financeiro Gerencial**:
   - A devolução reverte a receita líquida e o CMV proporcionalmente nos relatórios do período da devolução, sem apagar o fato histórico da venda original.

---

## 6. Produtos Temporários e Reconciliação Comercial

1. **Isolamento de Itens Temporários**: Itens de vendas/devoluções sem produto cadastrado (`isTemporaryProduct: true` ou `productId` nulo) **nunca** movimentam estoque real nem alteram CMPM/CMV de nenhum SKU.
2. **Reconciliação Histórica Cronológica**:
   - Ao vincular um item temporário de uma venda passada a um produto/variação real:
   - Se a venda estiver `scheduled` ou `fulfilled`, materializa a saída histórica **na data/posição cronológica original da venda**.
   - Se houver devolução vinculada já `fulfilled`, materializa a entrada histórica **na data/posição cronológica original da devolução**.
   - Dispara o **replay cronológico** a partir do ponto do evento para atualizar os CMVs das vendas posteriores e o saldo/custo atual do produto.

---

## 7. Replay Cronológico, Reprocessamento Retroativo e Idempotência

1. **Disparo de Replay**: Alterações retroativas em recebimentos, devoluções, reconciliações ou ajustes disparam um reprocessamento cronológico determinístico restrito exclusivamente ao SKU (produto/variação) afetado.
2. **Ordem Cronológica Determinística**: Ordenação estrita por `data/hora efetiva` + critério fixo de desempate (ex: ID da movimentação). O mesmo histórico recria exatamente o mesmo resultado.
3. **Idempotência**: Nenhuma movimentação pode ser duplicada em reprocessamentos. Vendas e devoluções garantem vínculo único com suas movimentações em `inventory_moves`.
4. **Atomicidade**: Atualizações retroativas e replays executam em transações atômicas. Falhas no reprocessamento desfazem a alteração e não deixam o cache do produto inconsistente.
5. **Relatórios Não Executam Replay**: Abertura de dashboards e relatórios leem exclusivamente os CMVs materializados e caches atuais. O replay é executado apenas na ocorrência de alterações retroativas de dados.

---

## 8. Distinção de Conceitos de Custo

| Conceito | Definição | Utilização |
|---|---|---|
| **Custo de Aquisição** | Preço de compra unitário em uma Nota Fiscal/Recebimento | Análise de fornecedores, inflação de insumos e negociação |
| **CMPM (Cost Price)** | Custo médio ponderado das unidades existentes no saldo atual | Valoração de estoque atual e precificação |
| **CMV (Custo da Mercadoria Vendida)** | Custo capturado do CMPM no momento exato de cada venda | DRE gerencial, margem bruta de vendas e relatórios de lucro |
