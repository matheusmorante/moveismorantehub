# Propostas

O status de cada proposta registra a decisão do operador. Em 26/11/2026, o operador aprovou as quatro propostas apresentadas no chat, de SUP-PROP-001 a SUP-PROP-004. Propostas novas exigem uma decisão própria.

## SUP-PROP-001 — Reduzir o trabalho por pedido na RPC da agenda

- **Diagnóstico relacionado:** SUP-001.
- **Prioridade:** P1 — alta.
- **Alteração sugerida:** avaliar uma prefiltragem relacional indexável antes de converter pedidos inteiros em JSONB e avaliar as regras de compromisso em uma consulta set-based. Preservar os campos legados de agendamento, a contagem completa, os resultados do ERP e do aplicativo, o RLS e a ordenação. Reutilizar os lotes de 100 como transporte, sem introduzir paginação visível.
- **Arquivos afetados:** migrations Supabase de agenda, helper compartilhado e consumidores ERP/app, a definir após revisão completa dos chamadores.
- **Justificativa:** a RPC ainda percorre candidatos e interpreta JSONB por linha; o histórico mostra média cumulativa de 2,501 s, máximo de 19,564 s e quatro cancelamentos na janela curta.
- **Benefícios esperados:** menor CPU e latência para a agenda.
- **Estimativa:** não disponível; não usar o custo do invólucro PostgREST como estimativa do plano interno.
- **Riscos e efeitos colaterais:** perder pedidos em formatos legados, alterar contagens, datas de compromissos ou filtros de montagem; regressões em escopos mobile.
- **Testes e reversão:** propor somente depois de aprovação. Seguir Playwright/Vitest e política de banco remoto do repositório; validar a definição, grants, RLS, filtros e resultados. Migration compatível e reversível, com rollback da função; não usar banco local nem EXPLAIN ANALYZE pesado em produção.
- **Status em 26/11/2026.** Implementada no Supabase operacional pela migration [20261126152432](../../supabase/migrations/20261126152432_prefilter_order_schedule_candidates.sql). O servidor elimina exclusões e datas normalizadas claramente fora do intervalo antes de montar o JSON. O resolvedor de compromissos usa apenas os campos necessários. A comparação remota validou as respostas completas do cronograma ERP e da Agenda do app no recorte medido. A amostra do incidente poupou 551 avaliações potenciais do comparador em 1.324 pedidos. A consulta segue com varredura sequencial na tabela analisada.
- **Reversão.** Uma migration corretiva pode restaurar a [seleção anterior](../../supabase/migrations/20261115171053_order_operation_read_consistency.sql#L260) e o [resolvedor de compromissos anterior](../../supabase/migrations/20261114210226_order_schedule_multiple_appointments.sql#L3). A seleção restaurada deve incluir o [timeout de 20 segundos](../../supabase/migrations/20261121155207_extend_order_rpc_statement_timeouts.sql#L65).

## SUP-PROP-002 — Revisar o volume e a latência das RPCs de pedidos e notificações

- **Diagnóstico relacionado:** SUP-002.
- **Prioridade:** P1 — alta.
- **Alteração sugerida:** mapear invalidations, refetches, listeners Realtime e chamadores de list_order_page_ids e notification_product_summaries no ERP e no app. Separar chamada duplicada comprovada de leitura necessária antes de qualquer ajuste de cache ou query.
- **Arquivos afetados:** hooks, serviços e chamadores que a auditoria identificar; ainda não definidos.
- **Justificativa:** estatísticas cumulativas desde 18/10 mostram 32.479 chamadas de list_order_page_ids, 25.941 de notification_product_summaries e máximos de 19,884 s e 7,824 s, respectivamente. Não há série temporal nem identificação por tela.
- **Benefícios esperados:** reduzir chamadas repetidas, trabalho do banco ou respostas desnecessárias somente se a inspeção confirmar duplicidade.
- **Estimativa:** nenhuma; os contadores cumulativos não isolam a janela nem medem bytes.
- **Riscos:** dados desatualizados em pedidos, estoque ou mensagens; listeners duplicados podem ser comportamento legítimo de telas distintas.
- **Testes e reversão:** após aprovação, usar Vitest/RTL para lógica isolada e Playwright para fluxo ERP; revisar os caminhos mobile. Reverter apenas o ajuste aprovado mantendo atualização de mensagens e sincronização ao reconectar.
- **Status em 26/11/2026.** Implementada no Supabase operacional pela migration [20261126152451](../../supabase/migrations/20261126152451_reduce_order_list_and_stock_alert_work.sql). ERP e app usam a mesma RPC de listagem, que agora pula a comparação textual dos filtros vazios. A RPC de alertas do ERP reutiliza a consulta das variações sem estoque para verificar a elegibilidade e montar o retorno. A revisão encontrou compartilhamento e agrupamento de atualizações no sino e no painel. As respostas do ERP, do app e dos alertas foram comparadas remotamente. SUP-PROP-005 registra uma proposta posterior com decisão própria.
- **Reversão.** Retirar os atalhos para `customerName`, `seller`, `generalSearch` e `mobileSearch` da listagem. Para alertas, restaurar a [definição anterior da RPC](../../supabase/migrations/20261105013133_dashboard_stock_summary_compact_alerts.sql#L74) com as permissões conferidas.

## SUP-PROP-003 — Avaliar o polling do dispatcher fiscal e do autofinalizador

- **Diagnóstico relacionado:** SUP-003 e SUP-005.
- **Prioridade:** P2 — média.
- **Alteração sugerida:** medir quantas execuções do dispatcher encontram jobs pendentes e o tempo entre reserva e processamento; comparar isso com o requisito operacional antes de considerar intervalo maior ou um disparo condicionado a fila pendente. Para auto_fulfill, medir candidatos vencidos por execução antes de rever frequência.
- **Arquivos afetados:** migrations e worker fiscal ou de pedidos, somente se uma proposta posterior for aprovada.
- **Justificativa:** cada job é agendado a cada dois minutos e executou 28.114 vezes desde 18/10. O dispatcher agenda HTTP POST sem verificar no SQL se há trabalho pendente. As falhas de startup são intermitentes e depois se recuperaram.
- **Benefícios esperados:** potencial redução de invocações do worker e chamadas ao banco quando não há trabalho.
- **Estimativa:** não disponível sem contagem de jobs pendentes, POSTs completados e latência do worker.
- **Riscos:** maior atraso na emissão automática de devoluções ou no atendimento de pedidos vencidos. Não alterar regras fiscais, estados incertos, idempotência, consultas à SEFAZ ou circulação.
- **Testes e reversão:** requer aprovação explícita, revisão da documentação fiscal vigente, validação remota read-only e estratégia de rollback antes de qualquer migration ou alteração de cron.
- **Status em 26/11/2026.** Implementada para o dispatcher fiscal no Supabase operacional pela migration [20261126152514](../../supabase/migrations/20261126152514_skip_dispatch_when_return_fiscal_queue_idle.sql). O job mantém a cadência de dois minutos e faz o POST quando há devolução pronta ou reserva vencida. O primeiro ciclo após a mudança concluiu com a fila vazia. O autofinalizador tinha 3 candidatos vencidos na consulta de leitura. Alterar sua frequência poderia atrasar trabalho real e requer evidência de tempo e candidatos por execução. A prova com uma fila fiscal elegível depende de fixture autorizada.
- **Reversão.** Restaurar o dispatcher conforme o [registro fiscal](../fiscal/historico-correcoes-2026-11-26.md#dispatcher-de-devolução-fiscal-consulta-a-fila-antes-do-post).

## SUP-PROP-004 — Medir a contribuição de auto_explain à Log Ingestion

- **Diagnóstico relacionado:** SUP-004.
- **Prioridade:** P2 — média.
- **Alteração sugerida:** comparar, usando o medidor oficial de Log Ingestion e uma janela controlada, o volume de eventos auto_explain e o total ingerido antes de recomendar mudança de limiar ou amostragem. Preservar logs de erro, segurança e auditoria.
- **Arquivos afetados:** configuração Supabase, somente mediante aprovação específica.
- **Justificativa:** há auto_explain para todas as consultas acima de 10 segundos, mas o tamanho agregado desses planos não foi medido.
- **Benefícios esperados:** determinar se a configuração contribui materialmente para a ingestão sem ocultar erros.
- **Estimativa:** indisponível até comparar o medidor oficial.
- **Riscos:** elevar o limiar ou reduzir a amostragem pode retirar evidência necessária para diagnóstico; habilitar planos aninhados pode aumentar muito a ingestão e expor parâmetros.
- **Testes e reversão:** medir em janela definida, preservar configuração anterior e reverter o parâmetro aprovado caso a evidência diagnóstica piore.
- **Status em 26/11/2026.** Aprovada, com amostra coletada e comparação oficial pendente. Em 15 minutos, cinco planos somaram 21.406 bytes de texto. Isso representou 81,7% do texto dos eventos PostgreSQL daquela janela. O conector trouxe os eventos e o plano da organização. O medidor oficial de ingestão por período está no painel Usage e não está disponível pelo conector. A evidência atual sustenta acompanhar a contribuição dos planos. Limiar e amostragem seguem com a configuração vigente até uma comparação oficial.

## SUP-PROP-005 — Encerrar a atualização de alertas antes da contagem de rascunhos quando o resumo falhar

- **Diagnóstico e prioridade.** SUP-006, P2 (média). Recorte específico dentro da investigação de SUP-PROP-002.
- **Mudança proposta.** Em `erp/src/pages/utils/notifications/notificationService.ts:286–300`, validar `pError` e o formato de `pData` antes de iniciar `fetchServerOrderPage`. Manter a verificação de geração após a consulta de rascunhos. A alternativa é manter a sequência atual e aceitar o trabalho que será descartado nesse caminho.
- **Efeito estimado.** Até uma chamada a menos para cada atualização ativa que hoje chega à contagem depois de um erro retornado ou resultado inválido. Em caso de sucesso, as chamadas permanecem as mesmas. Economia total, tempo de banco, bytes e egress não medidos. Sem estimativa para os medidores de logs.
- **Risco e validação após aprovação.** Risco baixo e localizado na ordem das guardas. Com Vitest, simular `57014` retornado, resposta inválida, sucesso, falha posterior na contagem e cancelamento por troca de sessão. Conferir zero chamadas de contagem nos dois primeiros casos e preservar a última lista publicada, a leitura compartilhada e a recuperação por reconexão. Usar Playwright headless para uma conferência somente leitura do sino e painel se necessária. Reverter a alteração pontual da guarda para recuperar a sequência anterior.
- **Status.** Aguardando aprovação.

## SUP-PROP-006 — Aplicar filtro e página inicial juntos na lista de pedidos do ERP

- **Diagnóstico e prioridade.** SUP-007, P2 (média). Aguardando aprovação.
- **Mudança proposta.** Em `erp/src/pages/App/SalesOrder/OrderHistoryList/hooks/useOrderHistory.ts`, associar a página ao conjunto efetivo de filtros e usar a página 1 desde a primeira renderização após a troca, na chave, na consulta e na paginação exibida. Preservar a limpeza de seleção, o uso do cache, a atualização manual e por Realtime, os filtros de servidor e o limite da consulta. O app já aplica o reset junto à troca de busca ou status.
- **Benefício e risco.** Evitar a consulta da combinação transitória, sujeita a cache e cancelamento. Normalizar a identidade dos filtros de modo consistente com a consulta para evitar resets por objetos equivalentes ou reaproveitamento indevido ao voltar a um filtro anterior. Sem estimativa de economia total ou efeito nos medidores de logs.
- **Validação e reversão.** Após aprovação, ampliar o Vitest de `useOrderHistoryQueryState` para navegar até a página 2 com cache frio, trocar o filtro e verificar uma única leitura para o novo filtro com página 1. Conferir filtro equivalente recriado, seleção, navegação posterior, refetch e erro da nova página. Conferir o fluxo ERP em Playwright headless se necessário. Reverter restaurando o estado e o reset por efeito anteriores. A proposta não requer migration.

## SUP-PROP-007 — Classificar falhas de contrato antes da retentativa da lista ERP

- **Diagnóstico, prioridade e status.** SUP-008, P3 (baixa), aguardando aprovação.
- **Mudança sugerida.** Dar uma classificação tipada às respostas que já são rejeitadas pelas validações de página e resumos em `shared-utils/orders/orderListServerQuery.ts:31–37` e `shared-utils/orders/orderSummaryQuery.ts:12–14`. Em `erp/src/pages/App/SalesOrder/OrderHistoryList/utils/orderHistoryQueryRetry.ts:14–15`, usar essa classificação para encerrar a tentativa automática. Preservar mensagens, opção de nova leitura manual, recuperação por reconexão, abortos, Query Guard e tratamento atual de timeout e rede. Conferir consumidores dos helpers e manter no app o tratamento de erro e a hidratação offline.
- **Benefício e risco.** Até uma seleção adicional e uma leitura de resumos a menos por tentativa elegível. A frequência real é desconhecida. Uma incompatibilidade transitória da resposta perderia a recuperação automática imediata. Restringir a regra aos erros explícitos das duas validações para preservar a recuperação de falhas operacionais.
- **Validação e reversão.** Após aprovação, usar Vitest para página inválida, lote inválido depois de página válida, sucesso, falha transitória, Query Guard, timeout, cancelamento e nova leitura manual. Confirmar contagem de RPCs e mensagens nos dois clientes e preservar o cache offline do app. Reverter a classificação e a condição da política ERP. Sem migration prevista.

## SUP-PROP-008 — Restringir o conjunto de eventos usado nas métricas de 30 dias

- **Diagnóstico, prioridade e status.** SUP-009, P2 (média), aguardando aprovação.
- **Opções.** Comparar a consulta atual com uma versão que agrega os totais históricos em uma leitura só de `product_view` e compartilha uma entrada de 30 dias UTC entre os totais recentes, a série diária e os rankings. Manter o SQL atual se o plano alternativo duplicar leituras relevantes ou não reduzir o trabalho. A proposta cobre a função da migration 20261118001316 e preserva suas chaves, permissões, exclusões e critérios dos rankings.
- **Estimativa e risco.** O conjunto recente excluiria todos os eventos fora da janela de suas leituras. O ganho líquido permanece indeterminado porque as visualizações recentes também pertencem aos totais históricos e podem ser lidas em ambos os ramos. Espera-se uma chamada e resposta equivalente. Tempo, bytes, egress e efeito sobre os medidores de logs não medidos.
- **Validação e reversão.** Após aprovação, comparar as partes internas com `EXPLAIN` sem `ANALYZE` e verificar se os índices atuais por tipo/data atendem ao recorte. Antes de aplicar, comprovar equivalência do JSON com o mesmo instante de referência, incluindo limites UTC, dias vazios, visitantes repetidos, exclusões, eventos legados e rankings de produtos publicados. Conferir que autorização, isolamento e grants permaneçam iguais. Medir execuções comparáveis separando tempo SQL, latência e bytes. Uma migration corretiva pode restaurar a definição vigente sem alterar os eventos.


## SUP-PROP-009 — Classificar conflito de versão esperado no autofinalizador

- **Diagnóstico e status.** SUP-010, P2, gravidade moderada, confiança alta na causa. Aguardando aprovação.
- **Mudança proposta.** Reconhecer conjuntamente o SQLSTATE `P0001` e a mensagem exata `ORDER_VERSION_CONFLICT` no tratamento do autofinalizador e somar o caso a `version_conflicts`. Manter o tratamento de `40001`, o isolamento por pedido e os avisos para falhas reais. Preservar o contrato do guard para o ERP, a cadência e a elegibilidade do cron, os efeitos comerciais e as proteções fiscais. A alteração seria em nova migration de `public.auto_fulfill_scheduled_orders()`, a partir da [definição atual](../../supabase/migrations/20261013231942_auto_fulfill_scheduled_orders_time_aware.sql#L131).
- **Impacto e estimativa.** Cada ocorrência confirmada deixa de ser registrada como falha genérica. Quantidade de ocorrências, efeito em Log Ingestion e trabalho SQL não medidos. A classificação do aviso existente é genérica e não basta para estimar quantos eventos decorrem desse conflito.
- **Validação e risco.** Após aprovação própria, verificar a definição e permissões no catálogo. Com teste isolado de comportamento permitido e somente com dados próprios e autorização específica para qualquer prova remota gravável, cobrir versão obsoleta, `40001`, erro diferente com `P0001` e execução normal. Conferir contadores, avisos para erros reais e ausência de alteração no pedido em conflito. Classificar pelo código e pela mensagem exata para evitar ocultar falhas que usam o mesmo SQLSTATE. Revisar as proteções fiscais vigentes antes de aplicar.
- **Reversão.** Restaurar a definição anterior do autofinalizador por migration compatível e verificar permissões e agendamento. A proposta não depende de alterar o histórico de pedidos ou o contrato do guard.
