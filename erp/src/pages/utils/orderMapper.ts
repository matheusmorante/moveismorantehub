/**
 * Facade de Mapeamento de Pedidos (Master Banco de Dados -> Domínio Order).
 *
 * Arquitetura modular delegada para ./orderMapper com separação estrita de responsabilidades (SOLID):
 * - `orderMapperTypes.ts`: Tipos e interfaces estruturais da linha bruta do banco.
 * - `orderSnapshots.ts`: Rastreamento de snapshots de dados brutos e auditoria via WeakMap.
 * - `orderPaymentsMapper.ts`: Resolução de pagamentos normalizados, taxas e totais financeiros.
 * - `orderItemsMapper.ts`: Mapeamento de itens, variações, snapshots fiscais e quantidades devolvidas.
 * - `orderCustomerMapper.ts`: Resolução de dados do cliente, inferência de pessoa física/jurídica e endereços.
 * - `orderShippingMapper.ts`: Normalização de frete, agendamentos, janelas de horário e status logístico.
 * - `mapOrderFromDatabase.ts`: Orquestrador canônico do mapeamento.
 */

export * from './orderMapper/index';
