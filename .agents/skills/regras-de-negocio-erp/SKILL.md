---
name: regras-de-negocio-erp
description: Consulte e preserve as regras oficiais de negócio do Morante Hub ao alterar pedidos, estoque, custos, devoluções, recebimentos ou integrações entre módulos.
---

# Regras de negócio do ERP

Use esta skill antes de mudar comportamento de domínio. Em caso de conflito entre uma solicitação e uma regra registrada, apresente ambas e peça confirmação antes de substituir a regra oficial.

# Regras de Negócio do ERP — Morante Hub

Use esta skill antes de alterar comportamentos de domínio referentes a vendas, estoque, custos, recebimentos, devoluções ou relatórios financeiros. Em caso de conflito entre uma solicitação e uma regra oficial aqui registrada, apresente a divergência ao usuário e solicite confirmação explícita antes de alterar.

---

## 1. Vendas, Saídas e Materialização do CMV

- **Vendas com Produto Cadastrado**: Pedido em estado `scheduled` ou `fulfilled` gera uma única saída de estoque por item cadastrado.
- **Materialização Obrigatória do CMV**: No momento da saída, o CMV unitário (`cmvUnitCost`) e o CMV total (`cmvTotal`) são capturados do **CMPM vigente naquele exato instante** e materializados no item da venda.
- **Imutabilidade de Vendas Passadas**: O CMV materializado em uma venda antiga **jamais** muda apenas porque novas compras alteraram o `costPrice` atual do produto no futuro.
- **Item Temporário**: Itens sem produto/variação vinculados (`isTemporaryProduct: true` ou `productId` nulo) **não** movimentam estoque nem geram CMV artificial.

---

## 2. CMPM (Custo Médio Ponderado Móvel) e Valoração de Estoque

- **Cálculo por SKU**: O CMPM é calculado individualmente por produto/variação (SKU). Nunca misturar custos de SKUs diferentes.
- **Entradas Valorizadas**: Novas entradas (recebimentos/compras ou devoluções atendidas) recalculam o custo médio:
  $$\text{novoCostPrice} = \frac{(\text{stockAtual} \times \text{costPriceAtual}) + (\text{valorEntrada})}{\text{stockAtual} + \text{qtdEntrada}}$$
- **Estoque Zerado (`stock = 0`)**: Quando o estoque chega a 0, compras futuras não são contaminadas pelo `costPrice` antigo ($0 \times \text{costPriceAntigo} = 0$). A nova entrada determina o novo `costPrice`.
- **Custo Desconhecido NÃO é Zero**: Quando não houver histórico de custo confiável, o CMV fica como `não apurado` (`NULL`). É expressamente proibido utilizar R$ 0,00 como fallback para não gerar margens/lucros brutos artificiais de 100%.
- **Estoque Negativo**: Vendas que deixarem `stock < 0` não autorizam inventar custo; o CMV permanece pendente até a regularização da entrada via replay.
- **Proibido Misturar CMPM e FIFO**: O método oficial de valoração e CMV do ERP é 100% CMPM.

---

## 3. Devoluções e Custo de Retorno

- **Gatilhos de Estoque**: Devolução `scheduled` não movimenta estoque. Devolução `fulfilled` com item cadastrado gera entrada no estoque (+1).
- **Custo de Retorno**: A entrada no estoque da devolução é valorizada utilizando o **CMV unitário histórico materializado da venda original**. Essa entrada pode ajustar o `costPrice` (CMPM) para movimentações subsequentes.
- **Separação de Fatos**: Devolução nunca apaga ou substitui o registro da venda original. Ambas permanecem como fatos históricos distintos.

---

## 4. Reconciliação Comercial e Produtos Temporários

- **Reconciliação Cronológica**: Ao vincular um item temporário a um produto/variação real:
  - Se a venda estiver `scheduled` ou `fulfilled`, materializa a saída histórica na **data/posição cronológica original da venda**.
  - Se houver devolução vinculada já `fulfilled`, materializa a entrada histórica na **data/posição cronológica original da devolução**.
- **Disparo de Replay**: A reconciliação dispara o replay cronológico a partir do ponto afetado.

---

## 5. Replay Cronológico, Reprocessamento Retroativo e Relatórios

- **Fonte de Verdade vs Cache**: As movimentações em `inventory_moves` são os fatos imutáveis. `stock` e `costPrice` nas tabelas de produtos são caches materializados.
- **Replay Determinístico**: Correções retroativas em recebimentos, devoluções ou vendas disparam replay cronológico determinístico apenas para o SKU afetado, ordenado por data/hora efetiva + critério fixo.
- **Invariante Fundamental**: `REPLAY(history) ≈ stock + costPrice atuais`.
- **Idempotência e Atomicidade**: Replays e atualizações não duplicam movimentações e são executados sob transações atômicas.
- **Relatórios**: Relatórios e DREs leem CMVs históricos materializados das vendas. Não executam replay completo a cada abertura de tela.

---

## 6. Variações e Estrutura de Produtos

- **Regra Oficial de Variações de Produto**: No Morante Hub, **TODO produto tem pelo menos uma variação**.
- **Produtos Simples**: Um produto cadastrado sem atributos específicos (produto simples) é conceitualmente e operacionalmente a sua própria variação principal única (1 produto = 1 variação).
- **Produtos com Atributos**: Produtos com atributos (ex: cor, tecido, tamanho) possuem múltiplas variações filhas registradas na tabela `product_variations`.
- **Invariante de Domínio**: Não existe o conceito de produto sem variação no sistema. Todo cadastro de produto representa pelo menos uma variação vendável.

---

---

## 7. Assistente Financeiro de IA (Movimentação Única Realizada)

- **Transações Apenas para Fatos Reais Ocorridos**: O Assistente Financeiro registra **apenas movimentações financeiras individuais que de fato já ocorreram** (*"paguei"*, *"recebi"*, *"transferi"*, *"quitei"*).
- **Remoção de Geradores Automáticos**: O Assistente Financeiro não cria nem agenda parcelamentos futuros, planos de parcelas, transações recorrentes ou compromissos a pagar/receber no futuro.
- **Declarações Futuras ou de Intenção**: Frases sobre futuro ou hábito (*"comprei em 10x"*, *"tenho 10 parcelas"*, *"pago todo mês"*, *"vou pagar amanhã"*) não geram saídas/entradas automáticas.
- **Contexto de Parcela Paga**: O pagamento declarado de uma parcela (*"Paguei a 3ª parcela da Bechara R$ 1.000"*) cria apenas UMA transação pontual de R$ 1.000,00, usando "3ª parcela" unicamente como texto descritivo.

---

## 8. Assistente Financeiro — Invariante de Múltiplas Movimentações (`batchDraftsList`)

- **Invariante Arquitetural Anti-Colapso**: Quando uma fala do usuário contém 2 ou mais movimentações financeiras realizadas (`batchDraftsList.length > 1`), **é expressamente proibido** que qualquer componente, serviço ou função futura reduza ou colapse silenciosamente o lote no primeiro rascunho (`const draft = batchDraftsList[0]`).
- **Consciência de Lote Obrigatória (`batch-aware`)**: Todo o pipeline (perguntas agrupadas via `buildGroupedQuestion`, chips de análise em tempo real via `buildDraftAnalysisChips`, renderização de cards e aplicação de patches via `applyTurnPatchWithDraftList`) DEVE ser conscientemente **batch-aware** e operar sobre a totalidade dos rascunhos do lote.
- **Rastreabilidade Histórica da Causa Raiz**: O bug histórico onde a segunda movimentação sumia ocorria por conta da atribuição precoce de `questionToUser` isolada do item `[0]` e descarte visual de `batchDraftsList` na UI. O relatório de causa raiz é mantido junto da bateria de testes de regressão (`multiFactPipelineGroupedQuestions.test.ts` e `financialInvariants.test.ts`) para documentar a causa estrutural do comportamento.

> Para o detalhamento completo de 50 tópicos e fórmulas matemáticas da arquitetura, consulte a referência em [references/estoque-cmpm-cmv.md](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/.agents/skills/regras-de-negocio-erp/references/estoque-cmpm-cmv.md).

