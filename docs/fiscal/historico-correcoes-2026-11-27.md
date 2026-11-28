# Histórico de correções — 27/11/2026

## Conclusão automática da venda respeita a operação imediata e a data agendada

- **Problema e sintomas:** a função recorrente concluía vendas agendadas no horário final registrado, apesar da regra operacional de concluir só após terminar a data de entrega. Pedidos com várias operações também podiam ser concluídos quando apenas a primeira operação vencia.
- **Causa raiz comprovada:** `public.auto_fulfill_scheduled_orders()` calculava o prazo de venda com `endTime`, `scheduled_end_time` ou `time`; o prazo estava no nível do pedido e não considerava a lista de operações armazenada em `shipping.scheduling.appointments`.
- **Arquivos e linhas:**
  - `supabase/migrations/20261128005725_auto_fulfill_sales_delivery_day_boundary.sql:3` (função), `:81-193` (prazo por operação e filtros), `:269-274` (ACL e comentário).
  - `erp/src/pages/App/SystemDocs/systemDocumentation.ts:39`: regra automática detalhada para operação imediata e operações agendadas.
  - `erp/src/pages/App/SystemDocs/userDocumentation.ts:12`: orientação para o vendedor.
  - `docs/fiscal/README.md:8`: referência atualizada para esta regra e a assistência.
  - `docs/fiscal/historico-correcoes-2026-11-27.md:3-11`: este registro.
- **Solução:** retirada imediata com método de retirada mantém o horário atual persistido; as demais operações de venda passam a vencer à meia-noite BRT depois da data agendada, ignorando a hora. Para pedidos com várias operações, a conclusão aguarda a última data e não ocorre se alguma operação ainda estiver pendente ou sem data válida. Os rótulos existentes mostram **Retirado** para retirada e **Entregue** para entrega no ERP e no aplicativo. A tarefa preserva a atualização transacional do estoque, os snapshots fiscais, a checagem de versão e a ACL restrita; as regras de assistência e devolução foram mantidas.
- **Validação:** migration `20261128005725` aplicada no projeto operacional `hkoxhourxwlddgsfdgws`. Consulta somente de leitura confirmou `SECURITY DEFINER`, `search_path` fixo, ACL restrita ao proprietário, distinção de retirada imediata, limite de meia-noite após a última operação agendada, preservação de conflito por versão e Cron ativo a cada dois minutos. `EXPLAIN (FORMAT JSON)` da consulta de candidatos foi aceito pelo PostgreSQL e usou `idx_orders_status`. O advisor de segurança não apontou questão nesta função; o advisor de performance também listou um índice de telefone não utilizado em `public.orders`, não alterado por esta migration. A tarefa de produção não foi executada; nenhum pedido ou fixture foi alterado e não houve envio à SEFAZ. Testes automatizados não foram executados.

## Assistência agendada é atendida após o fim da data

- **Problema e sintomas:** a tarefa recorrente do banco selecionava vendas agendadas e coletas de devolução, mas não assistências. Uma assistência permanecia como `scheduled` mesmo após o dia agendado.
- **Causa raiz comprovada:** a função ativa `public.auto_fulfill_scheduled_orders()` filtrava `orders.order_type` para `sale` e `return`. A assistência já persiste `order_type = 'assistance'`, status, data agendada e os dados de agendamento na mesma tabela.
- **Arquivos e linhas:**
  - `supabase/migrations/20261128003805_auto_fulfill_assistance_after_scheduled_date.sql:3` (função), `:85` (prazo após a data), `:90` e `:114` (elegibilidade), `:150` (conflito de versão).
  - `erp/src/pages/App/SystemDocs/systemDocumentation.ts:82`: regra do status automático no guia do sistema.
  - `erp/src/pages/App/SystemDocs/userDocumentation.ts:96`: orientação para o operador.
  - `docs/negocio/assistencias/assistencias-tecnicas.md:21`: regra operacional da assistência.
  - `docs/fiscal/README.md:8`: vigência e referência deste registro.
- **Solução:** a função recorrente inclui assistências agendadas e atribui a elas o prazo de meia-noite após a data marcada, ignorando a hora agendada; em faixa de datas, considera o último dia. A função mantém a validação de status, exclusão, pendência de agendamento, pedidos de teste HML, concorrência por `updated_at`, snapshot fiscal e atualização transacional. A regra de horários das vendas e devoluções permanece igual. Para assistência, a atualização de status não cria documento fiscal nem a baixa automática de estoque da venda.
- **Validação:** migration aplicada no projeto operacional `hkoxhourxwlddgsfdgws`. Consultas remotas somente de leitura confirmaram a função `SECURITY DEFINER` com `search_path` fixo e ACL apenas do proprietário, seleção de assistência, prazo à meia-noite do dia seguinte, tratamento de conflito `P0001` e Cron ativo a cada dois minutos. O histórico remoto contém `20261126175907_classify_auto_fulfill_order_version_conflicts`, cujo arquivo não existe no checkout; o tratamento `P0001` ativo foi preservado nesta migration. O advisor de segurança não listou esta função. A aritmética de data foi conferida em PostgreSQL e o plano da consulta usa `idx_orders_status` (estimativa de 44 pedidos agendados); não foi necessário criar índice. Nenhum pedido operacional ou fixture foi escrito, e a função de produção não foi chamada. `git diff --check` sem erros. Testes automatizados não foram executados.
