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

- **Apresentação da Conclusão de Vendas**: O estado persistido `fulfilled` continua significando que o cliente recebeu a mercadoria e que houve circulação concluída para as regras comerciais e fiscais. Na interface, apresente a venda como **Entregue** quando `shipping.deliveryMethod` indicar entrega e como **Retirado** quando indicar retirada. Ações, confirmações, histórico, filtros, avisos e notificações devem usar o mesmo rótulo contextual; filtros agregados podem ser chamados **Concluídos**. Preserve `fulfilled` em banco, API, sincronização offline e regras de estoque/fiscal. Esta regra de apresentação não se aplica a devoluções, assistências ou outros fluxos cujo `fulfilled` tenha semântica própria.
- **Vendas com Produto Cadastrado**: Pedido em estado `scheduled` ou `fulfilled` gera uma única saída de estoque por item cadastrado.
- **Materialização Obrigatória do CMV**: No momento da saída, o CMV unitário (`cmvUnitCost`) e o CMV total (`cmvTotal`) são capturados do **CMPM vigente naquele exato instante** e materializados no item da venda.
- **Imutabilidade de Vendas Passadas**: O CMV materializado em uma venda antiga **jamais** muda apenas porque novas compras alteraram o `costPrice` atual do produto no futuro.
- **Item Temporário**: Itens sem produto/variação vinculados (`isTemporaryProduct: true` ou `productId` nulo) **não** movimentam estoque nem geram CMV artificial.
- **Data Efetiva da Movimentação de Saída**: No momento em que o pedido de venda é cadastrado definitivamente (seja ele agendado em entregas ou retiradas, ou atendido em retiradas imediatas), a data efetiva da movimentação de saída no estoque (`date` em `inventory_moves`) utiliza a **mesma data em que o pedido foi cadastrado** (`order.date`).

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

- **Gatilho de Estoque da Devolução**: A devolução `scheduled` não movimenta estoque. A entrada é gerada somente quando a devolução passa a `fulfilled` e o produto cadastrado retorna de fato (`returnStockProcessed: true`).
- **Custo de Retorno**: A entrada no estoque da devolução é valorizada utilizando o **CMV unitário histórico materializado da venda original**. Essa entrada ajusta o `costPrice` (CMPM) para movimentações subsequentes.
- **Cancelamento e Estorno com Modal de 5 Segundos**:
  - Para devolução agendada (`scheduled`): ação no menu de 3 pontinhos exibe **"Cancelar Devolução"**. Ao confirmar no modal de segurança com contagem de 5s, o status muda para cancelado sem estorno de estoque (a entrada ainda não existe) e é exibido o carimbo de **"Cancelado"** na linha/card.
  - Para devolução atendida (`fulfilled`): ação no menu de 3 pontinhos exibe **"Estornar Devolução"**. Ao confirmar no modal de segurança com contagem de 5s, o status muda para cancelado, a entrada de estoque é estornada e é exibido o carimbo de **"Estornado"** na linha/card.
- **Separação de Fatos**: Devolução nunca apaga ou substitui o registro da venda original. Ambas permanecem como fatos históricos distintos.
- **Data Efetiva da Movimentação de Entrada**: A movimentação de entrada de estoque gerada pela devolução tem como data efetiva a **mesma data em que a devolução foi cadastrada** (`order.date`).

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
- **Nomeação de Variações na Etiquetação e UI**: A variação já é formada começando com o nome do pai nela. Portanto, o nome da variação já contém o nome do produto pai por definição. Ao exibir o nome da variação em etiquetas de identificação, preços ou interfaces, **nunca** concatene ou adicione o nome do pai como prefixo (ex: evitar `Nome do Pai - Nome da Variação`), pois isso gera redundância. Utilize apenas o nome da variação.
- **Produtos de Teste no Catálogo Digital**: Produtos identificados pelos marcadores `HMLNFTEST` ou `NFE_HML_MATRIX_2026_10`, pelos códigos `TEST_AUT_...`/`NFEHML26P...` ou pelo rótulo `[HML NF TEST]` são dados de teste e devem permanecer com status `hidden` no produto e em todas as variações. Bloqueie a publicação em qualquer fluxo; salvar outros campos não deve publicá-los.

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

---

## 9. Identidade Técnica Imutável (`id` / UUID)

- **Regra Geral**: O `id`/UUID de qualquer registro persistido é sua identidade técnica imutável. Nenhum módulo do ERP, aplicativo, catálogo digital, serviço, Edge Function, RPC ou interface pode alterar, regenerar, substituir ou recriar o `id`/UUID de um registro existente.
- **Relacionamentos Internos**: Relações entre entidades devem usar o `id`/UUID imutável. Em particular, a identidade de uma variação é sempre `product_variations.id`/`variation_id`; o SKU não pode ser usado como chave relacional interna quando o UUID existir.

---

## 10. Snapshot Imutável de Pedidos e Independência Cadastral

- **Garantia de Snapshot no Cadastro**: Ao criar ou salvar qualquer pedido (`saveOrder` / `handleCompleteOrder`):
  - O sistema **obrigatoriamente** congela o snapshot dos dados vigentes: `customerData` (nome, telefone, endereço completo), `items` (descrição, valor unitário, manuseio, código) e vendedor.
  - Se o cliente possuir `id` vinculado mas o snapshot textual estiver incompleto ou em branco, o sistema busca automaticamente os dados completos da entidade `people` no banco e preenche o snapshot antes de gravar.
  - As colunas dedicadas da tabela `orders` (`customer_id`, `customer_name`, `seller_id`, `seller_name`, `status`, `total_amount`, `order_number`) são sempre sincronizadas com o `order_data`.
- **Alteração Intencional via Tela do Pedido**: Ao editar o pedido pela tela de pedidos (`OrderEditModal` / `useSalesOrderForm`), qualquer modificação intencional feita pelo usuário (troca de cliente, edição de endereço, troca de itens ou valores) altera o snapshot do pedido e as colunas físicas correspondentes.
- **Imutabilidade contra Alterações Externas**: Se um cliente, produto ou colaborador for alterado externamente em seus próprios módulos (ex: cadastro de pessoas `/registrations/customers` ou produtos `/products`), o snapshot histórico de pedidos antigos já gravados **NÃO é alterado**. Os pedidos antigos continuam referenciando o `id`/UUID real da entidade, mas preservam o nome, endereço, descrição e valor vigentes no momento da venda.

- **SKU é Código Comercial**: O SKU/código comercial pode ser alterado quando a operação de negócio permitir. A alteração nunca muda o UUID, nem pode romper vínculos, histórico, estoque, vendas, recebimentos, assistências ou demais registros relacionados.
- **Sem Exposição Operacional**: Não disponibilizar em telas, fluxos, APIs de módulo ou lógicas comuns qualquer operação de troca de `id`/UUID. Nenhuma funcionalidade regular deve ter permissão para fazê-lo.
- **Exceção Externa e Extraordinária**: Uma eventual alteração global de IDs só pode ocorrer diretamente no Supabase, como manutenção excepcional e fora do sistema operacional. Exige planejamento de migração de todas as referências, execução atômica, cópia de segurança e auditoria; não é uma operação de negócio nem deve ser implementada nas interfaces ou módulos.

---

## 11. Responsável pelo Inventário no Mobile

- **Seleção Automática e Oculta**: No aplicativo móvel, **NÃO EXISTE** tela ou campo para selecionar qual o funcionário responsável pelo inventário.
- **Usuário Logado**: A autoria (o responsável) é sempre preenchida automaticamente em *background* com o UUID do usuário que está logado e realizando a operação no aparelho (`userProfile.id`).

> Para o detalhamento completo de 50 tópicos e fórmulas matemáticas da arquitetura, consulte a referência em [references/estoque-cmpm-cmv.md](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/.agents/skills/regras-de-negocio-erp/references/estoque-cmpm-cmv.md).

## 12. Cancelamento de pedido, circulação e documento fiscal

- O cancelamento pode ser iniciado pelo **Pedido de Venda** ou pela tela de **Notas Fiscais de Saída**. Ambos os pontos devem chamar a mesma operação comercial transacional e a mesma política/serviço fiscal central; a tela fiscal não pode apenas alterar o status do documento. Quando houver NF vinculada, reconciliar o pedido e o estoque pelos fluxos existentes antes do evento externo à SEFAZ.
- Use `hasGoodsCirculated(order)` como regra semântica compartilhada. Só a confirmação final de entrega (Entregue) ou retirada (Retirado) significa circulação. Saída, trânsito, chegada ao endereço e conclusão automática por tempo não comprovam circulação; mantenha a rota não reconciliada separada para impedir decisões fiscais prematuras.
- Com circulação, bloquear cancelamento por operação não realizada e estorno fiscal. Se a mercadoria retornar, registrar devolução comercial vinculada e gerar o documento fiscal de entrada aplicável, preservando venda e NF-e originais.
- Sem circulação e sem documento autorizado (ausente, rejeitado ou não autorizado), cancelar apenas o pedido e o efeito comercial/estoque correspondente.
- Sem circulação e com documento autorizado, a política fiscal central decide automaticamente entre cancelamento SEFAZ e estorno permitido pela legislação. A pessoa usuária não escolhe “Cancelar NF-e” ou “Estornar NF-e”.
- Paraná: NF-e modelo 55 tem prazo de 168 horas; NFC-e modelo 65, 30 minutos conforme FAQ vigente da SEFA/PR. Centralizar as janelas e testar antes, no limite e depois, usando o instante de autorização com fuso explícito.
- O estorno da NF-e 55 deve seguir RICMS/PR art. 298, VII e NPF 038/2022: finalidade 3, chave original referenciada, CFOP/tipo de operação inversos, justificativa em `infAdFisco` e natureza da operação exigida. Revisar diferenças e acréscimos quando a regularização ocorrer em período posterior (art. 298, §2º) antes de transmitir.
- Evento SEFAZ e transmissão de estorno são efeitos externos posteriores ao commit comercial. Persistir tentativas/protocolos e permitir reconciliação idempotente; falha fiscal não reverte nem apaga o cancelamento comercial já confirmado.

## 13. Devolução e retorno físico
- Criar o pedido de devolução registra a solicitação e as quantidades parciais. Só representa retorno físico quando o cliente já entrega na loja ou quando a coleta pela equipe é confirmada.
- A forma existente fica registrada em `order_data.returnMethod`: `store_delivery` indica mercadoria já entregue pelo cliente na loja; `store_collection` indica coleta pela empresa pendente. Não criar coluna ou enum para essa informação sem necessidade comprovada.
- `scheduled` + `store_collection` aparece como “Aguardando coleta”; a confirmação física conclui como “Coletada”. `fulfilled` + `store_delivery` aparece como “Recebida”, pois essa opção confirma que o cliente já trouxe a mercadoria.
- A entrada de estoque acontece somente na criação transacional da devolução já recebida ou na confirmação transacional da coleta. Retry deve permanecer idempotente.
- Criar ou concluir operacionalmente a devolução não transmite NF-e automaticamente. Após o retorno físico, preparar e transmitir o documento vinculado na área fiscal conforme a regra vigente.
- Preservar a NF-e original após circulação e manter saldo parcial devolvível com vínculo fiscal/comercial por item.

