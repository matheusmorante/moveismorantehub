/**
 * Facade de Consultas e Sincronização de Pedidos.
 *
 * Arquitetura modular delegada para ./orderSyncQueries com separação estrita de responsabilidades (SOLID):
 * - `orderSyncConstants.ts`: Constantes de tabela, projeções de colunas SQL otimizadas e métricas de Egress.
 * - `orderSyncTypes.ts`: Tipos de assinantes realtime, opções de filtro paginado e DTOs de dashboard.
 * - `orderPeopleEnrichment.ts`: Validação de linhas válidas e enriquecimento de origens e contatos de clientes.
 * - `orderListQueries.ts`: Consultas paginadas de pedidos ativos, atendidos e candidatos a filtro no cliente.
 * - `scheduledOrdersQuery.ts`: Consulta de pedidos agendados e rascunhos para o cronograma logístico.
 * - `sharedOrdersRealtime.ts`: Canal compartilhado Supabase Realtime, debounce de atualizações e métricas.
 * - `dashboardOrdersQueries.ts`: Projeções leves (Fonte A, B e C) e RPC agregada consolidada para o dashboard.
 */

export * from './orderSyncQueries/index';
