---
name: regras-de-negocio-erp
description: Consulte e preserve as regras oficiais de negócio do Morante Hub ao alterar pedidos, estoque, custos, devoluções, recebimentos ou integrações entre módulos.
---

# Regras de negócio do ERP

Use esta skill antes de mudar comportamento de domínio. Em caso de conflito entre uma solicitação e uma regra registrada, apresente ambas e peça confirmação antes de substituir a regra oficial.

## Vendas e estoque

- Venda `scheduled` ou `fulfilled` com item cadastrado deve ter uma única saída de estoque; item temporário não recebe movimento artificial.
- Ao reconciliar item temporário para produto/variação real, materialize a saída pendente se a venda já estiver `scheduled` ou `fulfilled`. Se o evento for histórico, preserve sua data e reprocesse CMPM/CMV quando necessário.
- Cancelamento estorna saídas vinculadas; devolução nunca apaga a saída original.

## Devoluções

- Devolução `scheduled` não cria entrada. Devolução `fulfilled` cria uma única entrada para cada item cadastrado.
- Devolução temporária atendida permanece com entrada pendente. A reconciliação é feita no pedido de venda e propaga produto/variação à devolução vinculada.
- Se essa devolução já estiver atendida, a reconciliação materializa a entrada histórica pendente; se estiver agendada, espera o atendimento.
- A entrada de devolução usa o CMV histórico materializado na venda quando confiável. Custo desconhecido permanece não apurado, nunca vira zero.

## CMPM e histórico

- `inventory_moves` efetivos são a fonte de verdade; `stock` e `costPrice` são cache materializado.
- Evento histórico inserido ou corrigido exige replay cronológico determinístico do SKU afetado para atualizar CMVs posteriores e cache final.
- Operações devem ser idempotentes: uma venda/item e uma devolução/item não podem produzir movimento duplicado.
