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

> Para o detalhamento completo de 50 tópicos e fórmulas matemáticas da arquitetura, consulte a referência em [references/estoque-cmpm-cmv.md](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/.agents/skills/regras-de-negocio-erp/references/estoque-cmpm-cmv.md).
