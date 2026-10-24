# Proposta de prova “conversas com pedidos” — Central de Atendimento

**Estado:** migration, fixture e prova de UI concluídas no Supabase operacional, sob autorização explícita de 24/10/2026. A conversa de teste foi arquivada; os três registros sintéticos e o histórico foram preservados. Não houve publicação.

**Identificador da operação autorizada:** `central-support-positive-orders-2026-10-24`.

## Causa e mudança aplicada

A busca e a paginação da Central já aplicavam `with_orders` antes do limite e exigiam `customer_support_can_view_commercial_info()`. A guarda anterior de fixtures rejeitava qualquer `customer_id` em conversa sintética. A migration `20261024122401_customer_support_positive_orders_fixture_guard.sql` permite o vínculo somente no cenário `support-positive-orders`, ao dono administrador da execução, para um cliente sintético com exatamente um pedido não excluído da mesma execução. O vínculo começa como `unlinked`, torna-se `manually_linked` uma única vez e não pode ser removido ou trocado. A prova positiva agora está concluída, conforme os resultados abaixo.

A mesma guarda limita esse cenário a uma conversa, uma mensagem âncora e um evento normal de fechamento. As outras fixtures mantêm seus limites; `support-reopening` continua com o teto de 68 eventos e cinco eventos reservados para limpeza. Não há tabela, coluna ou trigger novo; a migration concede `EXECUTE` somente ao papel `authenticated` para um provisionador novo, protegido por administrador e pelas duas permissões da Central.

O provisionador é `SECURITY INVOKER` e agrupa, na mesma transação, os helpers já existentes de pedido sintético, conversa sintética e vínculo do cliente. Um advisory lock serializa o `runId`; se qualquer gate, vínculo ou validação falhar, a transação desfaz todos os registros dessa execução. Repetir um `runId` já usado é recusado para inspeção manual, sem replay cego.

## Operação remota autorizada e executada

Projeto operacional: Supabase `hkoxhourxwlddgsfdgws`, schema `public`. Antes da operação, o projeto, o ledger, o `runId` vazio e os gates de administrador, `viewCustomerSupport` e `viewCustomerCommercialInfo` foram confirmados para a identidade autenticada. O usuário autorizou migration, fixture, validação pela UI e arquivamento em 24/10/2026.

O escopo autorizado foi executado:

1. A migration foi aplicada; o Supabase registrou a versão `20261024122401`.
2. `customer_support_provision_test_order_conversation(runId)` criou, em uma transação, um cliente inativo/em rascunho, um pedido sintético cancelado sem itens e de valor zero, uma conversa e a mensagem âncora.
3. RPCs autenticadas comprovaram `with_orders`, `without_orders`, critério de pasta e a consulta comercial do pedido.
4. Playwright visível na porta `5173` passou **1/1 em 9,6s**. O filtro retornou uma conversa e o painel exibiu o pedido `cancelled`; o guard de rede bloqueou operações não autorizadas e registrou zero tentativas de escrita de negócio.
5. A RPC normal `customer_support_set_conversation_status` arquivou a conversa. A verificação final passou **1/1**, encontrou dois registros de mensagem/evento (uma âncora e um evento de fechamento) e confirmou a retenção do cliente e pedido.

O teto autorizado foi **1 cliente, 1 pedido, 1 conversa e 2 mensagens/eventos** e foi respeitado. O factory não avançou a sequência comercial e excluiu esse pedido de estoque, dashboard, tarefas de entrega e notificações. Não houve pasta, comentário, registro operacional, item, pagamento, movimento de estoque, efeito financeiro, emissão fiscal, chamada à Meta ou envio de mensagem.

## Retenção e reversão

O cliente sintético inativo/em rascunho e o pedido cancelado com valor zero permanecem retidos. A conversa está arquivada e seus dois registros de histórico foram preservados. A operação deixou exatamente os três registros sintéticos previstos.

## Validação local e remota

O teste estático `customerSupportPositiveOrdersMigration.test.ts` cobre a exceção de vínculo, o mesmo-run/owner, a permissão comercial, os limites e a preservação da guarda anterior. Vitest focal passou **15/15** antes da operação remota e **4/4** após alinhar o arquivo ao ledger; a suíte Central passou em **33 arquivos, 319 aprovados e 7 ignorados** e o build ERP passou em **1m49s**. A prova remota passou nas fases de recuperação, inspeção, provisionamento e arquivamento (**1/1 por fase**); Playwright passou **1/1** na porta `5173`. O patch da normalização foi isolado sobre o commit Production `d3d325e0737a5197000d939efd5ab4837dc29de0`; os 11 testes do serviço e o build ERP completo (**1m45s**) passaram. Após autorização específica, foi publicado no deployment Production `dpl_3o8BvF6MDv3dr8sJGQA576DEqKYM` (`READY`), com os aliases `morantehub.com` e `morantehub.vercel.app` apontando para ele. A prova confirma o filtro e o painel com a fixture própria.
