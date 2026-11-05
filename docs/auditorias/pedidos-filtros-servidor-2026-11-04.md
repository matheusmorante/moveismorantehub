# Pedidos: filtros no servidor — 04/11/2026

## Problema comprovado

A lista do ERP removia o nome do cliente dos filtros enviados ao banco e percorria lotes de até 1.000 candidatos para filtrar, ordenar, contar e paginar no navegador. Outros consumidores usavam amostras recentes de 30/300 pedidos, descartando registros após o limite. Isso transferia dados desnecessários e podia omitir pedidos antigos que atendiam ao filtro.

O volume histórico de 91,85 MB é o ponto de partida da investigação, não uma medição posterior desta implementação.

## Implementação e cobertura

| Caminho | Consulta vigente |
| --- | --- |
| ERP: vendas, orçamentos, assistências, devoluções, lixeira e rascunhos | `list_order_page_ids`: critérios, ordenação, total e soma antes da página, com máximo de 15 IDs; detalhes somente desses IDs. |
| App: listas dos quatro módulos comerciais | Mesma RPC e limite de 15; tipo e status definidos antes da página. Debounce de 350 ms, cancelamento e descarte de resposta antiga. |
| Seleção de venda atendida | Busca, status, tipo e ordenação no servidor. |
| Vínculo automático da assistência por produto | Servidor seleciona somente a venda do produto informado, incluindo o fallback legado quando não há itens normalizados. |
| Histórico do cliente no cadastro e busca de cliente nos pedidos | Nome, telefone/e-mail e fallback de identidade no servidor. Histórico paginado em 15, com contagem e soma completas. |
| Histórico de compras no cadastro de fornecedor do app | Mesma seleção de identidade, paginação e soma; removidas referências a colunas físicas de telefone/e-mail inexistentes. |
| Central de atendimento: seletor de documentos | `customer_support_list_customer_orders_filtered` aplica Todos/Pedidos/Orçamentos antes do limite de 15, conservando as verificações comerciais do atendimento. O histórico do perfil já usa sua RPC paginada por grupo. |
| Agenda e cronograma do ERP/app | `list_order_schedule_ids` filtra período, situação e tipo antes de buscar detalhes. Todos os resultados do escopo são apresentados; lotes de 100 são somente transporte, sem paginação visual. |
| Roteiro do app | Consulta somente o período escolhido e recebe contagens dos outros períodos em resposta compacta. |
| Montagens do ERP/app | Data, local e busca no servidor; contagens de tarefas por local também no servidor. Preservadas as classificações dos manuseios e as particularidades das duas interfaces. |
| Impressão de montagens | IDs somente dos pedidos com itens habilitados na modalidade de entrega/retirada correspondente. |
| Assistente do app | `search_order_operation_ids` aplica termo, datas, tipo e aliases de status antes do limite solicitado; detalhes somente dos IDs selecionados. |
| Alerta de rascunhos do ERP | Usa a contagem da RPC, dispensando a amostra anterior de 500 pedidos. |
| Histórico de movimentações: nomes dos pedidos | Consulta somente IDs/códigos referenciados na página visível; removida a assinatura que baixava os últimos 30 pedidos. |
| Relatório de vendas: contingência JSONB | Elegibilidade de exclusão, orçamento e status filtrada no banco. Cálculos de itens e análises do snapshot do relatório continuam em seus transformadores. |

Os vínculos de produto já filtrados por `order_items`, leituras de um pedido por ID e consultas fiscais por IDs continuam usando seus predicados no servidor. Agrupamento visual, cálculo de quantidades de itens de um pedido e construção da rota operam sobre o conjunto selecionado; não selecionam uma amostra global de pedidos para a lista.

Os helpers antigos `requiresGlobalOrderFiltering`/`selectFilteredOrderHistoryPage` e o serviço de carga de candidatos foram retirados. Nenhum chamador ativo permanece no fluxo `subscribeToOrders`; os consumidores agora recebem sinal de alteração e consultam seu próprio escopo.

## Offline e limites de produto

O operador escolheu explicitamente manter a busca dos pedidos salvos no aparelho quando estiver sem internet. O app informa a origem local dos resultados e volta à consulta remota quando reconecta. O cache de listagem preserva gravações locais pendentes, inclusive na atualização concorrente da linha SQLite.

As consultas novas não modificam pedidos, snapshots, estoque, pagamentos, documentos fiscais ou eventos. Não há envio de mensagens, emissão à SEFAZ, fixtures sintéticas persistidas ou limpeza de registros nesta tarefa. Nenhum passo de operação do estoque foi alterado; os PDFs do guia não precisaram de atualização.

## Banco operacional e compatibilidade

Projeto confirmado: `hkoxhourxwlddgsfdgws`, schema `public`. SQL completo, assinaturas existentes, colunas e histórico remoto conferidos antes de aplicar. Migrations aplicadas e registradas remotamente:

- `20261104221742_order_server_filters.sql`: comparação por palavras/acentos, datas legadas, artefatos de teste, paginação comercial e seletor restrito do atendimento.
- `20261104222545_refine_order_server_filters.sql`: códigos com zeros, tipos canônicos do app, histórico por contato e soma remota.
- `20261104224119_order_product_filter.sql`: vínculo por produto antes da seleção da página.
- `20261104225650_order_schedule_server_filters.sql`: resolução da data operacional e predicados das agendas.
- `20261104230100_order_schedule_counts.sql`: contadores compactos de rota e montagem.
- `20261104230957_order_operation_search.sql`: busca do assistente antes do limite.
- `20261104231220_order_assembly_print_filter.sql`: seleção da impressão por configuração de manuseio.
- `20261104231325_restrict_order_read_rpc_grants.sql`: revogação explícita dos grants `anon` herdados dos defaults do Supabase nas funções novas.

As funções de lista são `SECURITY INVOKER`, com `search_path` vazio, acesso autenticado e RLS/permissões existentes. A RPC específica do atendimento conserva o mesmo guard de permissão do serviço anterior. Verificado após aplicar: execução permitida para `authenticated` e negada para `anon` nos quatro pontos de entrada de leitura; nenhuma alteração ampla de RLS. Funções anteriores permanecem para compatibilidade com clientes já publicados.

## Arquivos e pontos de alteração

Referências são do estado local desta entrega; mudanças anteriores no mesmo checkout foram preservadas.

- `AGENTS.md:211`: regra permanente 24, com exceção offline autorizada.
- `shared-utils/orderListServerQuery.ts:11`; `shared-utils/orderScheduleServerQuery.ts:6,23`; `shared-utils/schedulePeriodFilters.ts:3`: contratos, timeout/cancelamento e lotes de resultados filtrados.
- `erp/src/pages/utils/orderSyncQueries/orderListQueries.ts:12,52`; `scheduledOrdersQuery.ts:9`; `index.ts:22`; `erp/src/pages/utils/orderHistoryService.ts:16`: consultas e fachadas.
- `erp/src/pages/App/SalesOrder/OrderHistoryList/useOrderHistory.ts:38,126`; arquivos removidos `useOrderHistoryFilters.ts` e `useOrderHistoryFilters.test.ts`: uso da página remota e remoção do caminho de candidatos.
- `erp/src/pages/utils/orderSearchQueries.ts:89,135,189`; `erp/src/pages/App/Registrations/shared/modals/PersonPurchaseHistoryModal.tsx:47,228`; `erp/src/pages/App/SalesOrder/modals/CustomerSearchModal.tsx:73`: históricos e busca de cliente.
- `erp/src/pages/App/SalesOrder/Assistance/hooks/useAssistanceOrderForm.ts:92`: consulta do vínculo por produto.
- `erp/src/pages/utils/customerSupport/supportOrdersService.ts:149`; `erp/src/pages/App/CustomerSupport/components/chat/ChatComposer.tsx:274,865`; `SupportOrderPickerDialog.tsx:26`: grupo filtrado remotamente.
- `erp/src/pages/App/DeliverySchedule/useDeliverySchedule.ts:265,287,315`: período/tipos nas consultas da agenda.
- `erp/src/pages/App/Logistics/services/assemblyOrderListService.ts:7`; `hooks/useAssemblyListQuery.ts:12,38`; `AssemblyListPage.tsx:27,39`; `erp/src/pages/utils/showcaseAssemblyService.ts:17`: busca de montagens e mostruário.
- `erp/src/pages/utils/assemblyPrintOrdersService.ts:4`; `erp/src/pages/utils/notificationService.ts:240`; `erp/src/pages/App/SalesOrder/Reports/services/salesReportApiService.ts:75`: impressão, contagem de rascunhos e contingência do relatório.
- `erp/src/pages/App/Stock/Movements/hooks/useInventoryOrdersLookup.ts:34`; `useInventoryMovesHistory.ts:174`: referências dos pedidos da página visível.
- `mobile/src/features/orders/services/mobileOrderListService.ts:282,322`; `hooks/useMobileOrders.ts:23`; `domain/offlineOrderSearch.ts:8`; `screens/NativeOrdersScreen.tsx:186`; `mobile/src/repositories/OrderRepository.ts:173,187`: leitura online, cache e comportamento offline.
- `mobile/src/features/logistics/hooks/useScopedOrderSchedule.ts:13`; `useDeliveryRoute.ts:12`; `useLogisticsScheduleData.ts:8`; `screens/NativeLogisticsScreen.tsx:42`; `DeliveriesHubScreen.tsx:101`; `TodayDeliveriesScreen.tsx:64`: escopos, contadores e indicação offline.
- `mobile/src/features/schedule/hooks/useAgendaData.ts:5`; `screens/AgendaScreen.tsx:40`; `mobile/src/features/assemblies/screens/NativeAssembliesScreen.tsx:109`: agenda e montagens.
- `mobile/src/services/aiAgent/orderDeliveryAgentService.ts:177`; `mobile/src/services/stock/stockSuppliersService.ts:196`: assistente e histórico de fornecedor.
- Todos os oito arquivos SQL listados acima, a partir da linha 1.

Testes atualizados/criados: `erp/src/pages/utils/__tests__/orderSyncQueries.test.ts`; `OrderHistoryList/useOrderHistoryQueryState.test.tsx`; `Assistance/__tests__/assistanceFormOwner.test.tsx`; `CustomerSupport/__tests__/customerSupportOrdersQuery.test.ts`; `Logistics/services/assemblyOrderListService.test.ts`; `Stock/Movements/hooks/useInventoryOrdersLookup.test.tsx`; `mobile/src/features/orders/services/mobileOrderListService.test.ts`; `mobileOrderListResilience.test.ts`; `domain/offlineOrderSearch.test.ts`; `mobile/src/services/aiAgent/orderDeliveryAgentService.test.ts`.

## Evidência executada

- Vitest/RTL ERP: 112 testes passaram em 9 arquivos, cobrindo seleção remota, erro/timeout, concorrência, pagamentos da agenda, vínculo da assistência, grupos do atendimento, lotes de montagens e referências do estoque.
- Vitest app: 15 testes passaram em 4 arquivos, cobrindo filtro remoto, limite, ordenação, dados operacionais, falha de cache, busca offline por acentos/palavras/código e consulta do assistente.
- Playwright em Chrome visível, operador autenticado e ERP na porta 5173: busca na lista devolveu 5 IDs/5 pedidos (31.924 bytes dos detalhes); troca para a segunda página devolveu 15 IDs/15 pedidos (124.558 bytes dos detalhes). Nenhuma leitura de `orders` com mais de 15 linhas ou sem restrição por ID nessas ações. São amostras, não projeção mensal nem percentual de economia global.
- Agenda pelo navegador: 6 IDs do período vigente. Montagens: 13 IDs no escopo inicial e 1 após a busca, com os critérios presentes na requisição e respostas HTTP 200.
- Comparação real da função de datas no Supabase com o helper do ERP: 35 pedidos existentes, zero divergências. Mais 7 casos de argumentos somente leitura cobriram alternativa futura, todas vencidas, pedido atendido, faixa de datas, pendência e formato brasileiro; zero divergências. Nenhum caso foi persistido.
- RPC comercial em modo mobile conferida autenticada pelo navegador: pedido de 500 registros respeitou o teto de 15.
- ACL e `SECURITY INVOKER` conferidos no banco operacional depois das migrations.
- Build final do ERP (`npm run build:test --prefix erp`) passou, com os avisos existentes de tamanho de bundle/imports. O typecheck global apresenta erros fora dos arquivos desta alteração; isso não foi tratado como aprovação global do projeto.

O aplicativo Android não foi exercitado em telefone físico nesta tarefa; Vitest e chamadas autenticadas da consulta compartilhada não são prova de UI nativa. Não houve publicação OTA nem deploy do cliente web nesta entrega. As mudanças de cliente estão no checkout/servidor de desenvolvimento, e as migrations já estão aplicadas no projeto operacional.
