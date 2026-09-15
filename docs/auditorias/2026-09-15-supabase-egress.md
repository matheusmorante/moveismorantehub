# Auditoria de Egress do Supabase — 15/09/2026

## Escopo e método

- Varredura estática: 294 arquivos-fonte do ERP com chamadas Supabase (`from`, `rpc`, `channel`, `postgres_changes` ou Storage), excluindo dependências e relatórios gerados.
- Medição no banco: contagens por `head: true` e amostras de 30/300 linhas, sem registrar conteúdo de clientes, pedidos ou outros dados pessoais.
- Arquivos revisados em detalhe: `orderSyncQueries.ts`, `orderSearchQueries.ts`, `useOrderHistory.ts`, `useDashboardData.ts`, `useDeliverySchedule.ts`, `AssemblyListPage.tsx`, `useInventoryOrdersLookup.ts`, `AssistanceOrderModal.tsx`, `useDashboardStock.ts`, `ChannelCatalog.tsx` e os módulos de relatórios/estoque listados abaixo.

## 1. Principais responsáveis comprovados

| Origem | Consulta | Execuções antes | Registros/payload medido | Severidade |
|---|---|---:|---:|---|
| Assinatura compartilhada de pedidos | `orders` + `order_items(*)` + `order_payments(*)`, limite 300 | Uma por tela inscrita, na abertura e em cada evento de pedido/item/pagamento | 300 pedidos completos = 496.430 bytes | **Crítico** |
| Histórico de pedidos | Usava a assinatura completa só para chamar `refresh()` | Uma carga de 300 ao abrir e a cada alteração, embora a tela já carregue página de 30 | 496 KB por carga inútil | **Crítico** |
| Agendamento/logística/estoque/assistência/dashboard | Seis consumidores independentes de `subscribeToOrders` | Até seis cargas concorrentes para o mesmo estado | até ~2,84 MB para seis leituras de 300 | **Crítico** |
| Busca de cliente no pedido | todos os pedidos com `order_data` para compor lista de clientes | Ao abrir o modal | 300 completos: 496.430 bytes; projeção necessária: 43.916 bytes | **Alto** |
| Histórico de cliente sem nome normalizado | `select('*')` sem filtro quando havia telefone/e-mail mas não nome | Ao abrir histórico desse cliente | Até todos os pedidos | **Alto** |

Com 200 eventos/dia distribuídos em pedidos, itens e pagamentos, seis assinaturas independentes podiam transferir aproximadamente `200 × 6 × 496 KB = 581 MB/dia` somente nesse fluxo. A quantidade real varia por quantidade de pedidos e telas abertas, mas a ordem de grandeza explica os 300–500 MB/dia observados.

## 2. Medições do banco na auditoria

| Tabela | Linhas | Amostra de 30 | Média/linha | Estimativa para todas as linhas |
|---|---:|---:|---:|---:|
| `orders` | 859 | 55.742 bytes | 1.858 bytes | 1,52 MB |
| `order_items` | 1.517 | 24.169 bytes | 806 bytes | 1,17 MB |
| `order_payments` | 959 | 7.610 bytes | 254 bytes | 0,23 MB |
| `products` | 379 | 71.645 bytes | 2.388 bytes | 0,86 MB |
| `product_variations` | 297 | 23.085 bytes | 770 bytes | 0,22 MB |

Para o modal de busca de cliente, não há hoje pedidos sem `customer_name` normalizado. Portanto, o fallback legado permanece compatível, mas não traz `order_data` no estado atual.

## 3. Correções realizadas

### Carga e Realtime de pedidos

- `erp/src/pages/utils/orderSyncQueries.ts`
  - Substituiu assinaturas isoladas por um canal Realtime e uma carga de pedidos compartilhados por todos os consumidores ativos.
  - Agrupou eventos próximos em 350 ms, evitando refetch repetido de uma mesma operação que altera pedido, itens e pagamentos.
  - Adicionou `subscribeToOrderChanges`, que notifica sem baixar pedidos completos.
  - Adicionou instrumentação somente em desenvolvimento: `window.__MORANTEHUB_SUPABASE_READ_METRICS__` registra execuções, linhas, bytes e tempo; não registra conteúdo.
- `erp/src/pages/App/SalesOrder/OrderHistoryList/useOrderHistory.ts`
  - Troca a carga completa por sinal de mudança; mantém a consulta paginada de 30 pedidos como fonte da tabela.
- `erp/src/pages/utils/orderHistoryService.ts`
  - Reexporta a assinatura leve para preservar o contrato dos consumidores.

### Busca de clientes

- `erp/src/pages/utils/orderSearchQueries.ts`
  - A busca por cliente sem nome não faz mais leitura integral para filtrar telefone/e-mail no navegador.
  - A lista de clientes lê primeiro apenas `id`, data, cliente e exclusão. `order_data` é solicitado somente para registros sem `customer_name`, preservando a compatibilidade legada.

## 4. Antes x depois estimado

### Seis telas inscritas em pedidos

| | Antes | Depois |
|---|---:|---:|
| Cargas completas por evento agrupado | até 6 | 1 |
| Payload por ciclo (300 pedidos) | até 2,84 MB | ~496 KB |
| Redução estimada | — | **~83%** |

### Abertura de busca de cliente (amostra de 300)

| | Antes | Depois |
|---|---:|---:|
| Payload | 496.430 bytes | 43.916 bytes |
| Redução medida | — | **91,2%** |

## 5. Achados comprovados ainda pendentes

| Arquivo/módulo | Evidência | Risco | Próxima ação segura |
|---|---|---|---|
| `orderSearchQueries.ts` | `getOrdersByProductId` e os fallbacks legados ainda usam `select('*')` | Médio | Projetar consulta de detalhe para o modal de vendas após mapear todos os campos exibidos.
| `useDashboardStock.ts` | busca todos os produtos e a coluna `variations` para calcular estoque baixo no cliente | Médio | Criar RPC/agregação no banco que retorne somente contagens e os 8 itens exibidos, após validar regras de variação.
| `ChannelCatalog.tsx` | carrega todos os produtos com imagens e variações | Médio | Paginar e buscar detalhes/imagens sob demanda; o catálogo precisa manter a expansão de variações.
| `LabelPrinting/ProductSearchInput.tsx` | busca `products(*)` e variações com pai completo | Médio | Definir projeção de busca/autocomplete com limite e debounce.
| Relatórios de vendas | há leituras de `order_data` e `select('*')` em módulos de relatório | Médio | Medir por relatório aberto e mover agregações comprovadas para RPC/view.
| `useDeliverySchedule.ts` / `AssemblyListPage.tsx` | ainda precisam de lista completa de pedidos para calendário | Médio | Avaliar endpoint por janela de data; a duplicação de assinaturas já foi eliminada.

## 6. Realtime

O canal `orders_changes_shared` cobre `orders`, `order_items` e `order_payments`. Ele é removido quando não há consumidores. Eventos próximos são agrupados em 350 ms antes de uma carga. A lista de histórico passa a receber somente o evento, não o dataset completo.

Outros canais identificados e a revisar por fluxo: `showroom_assemblies` em agendamento/logística, inventário em `inventorySubscriptionState`, recebimentos em `goodsReceiptQueryService` e compras. Nenhum deles foi alterado sem medição de uso.

## 7. Proteção contra regressão

1. Em desenvolvimento, consultar `window.__MORANTEHUB_SUPABASE_READ_METRICS__` ao navegar Dashboard, Pedidos, Agendamento e Estoque.
2. Criar teste para garantir que `subscribeToOrders` mantenha apenas um canal e uma leitura para múltiplos consumidores.
3. Adicionar revisão obrigatória para `select('*')` em tabelas com JSONB, especialmente `orders`, `products` e tabelas de relatório.
4. Exigir `.range()`/`.limit()` em novas listagens e documentar exceções de detalhe/lookup.
5. Para Realtime, preferir evento leve + atualização de linha/página, nunca refetch integral por componente.
6. Coletar uma janela de 24 horas das métricas de desenvolvimento/homologação antes de priorizar os pendentes acima.

---

## 8. Auditoria complementar — aplicativo mobile

### Medição e causa principal

- A amostra mobile de 300 pedidos completos mede **496.430 bytes** (1.655 bytes por pedido em média).
- Na inicialização, `mobile/App.tsx` chamava `fetchDashboardStats()` e também chamava duas vezes `generateDeliveryAISummary` sem fornecer os pedidos já buscados. Isso podia transferir `400 + 300 + 300` pedidos em sequência para uma única abertura do app.
- `fetchDashboardStats()` já gera os dois resumos e fornece a carga de pedidos como argumento; as duas chamadas extras foram removidas.

### Correção mobile realizada

- `mobile/App.tsx`: removidas as duas leituras redundantes de pedidos para resumo de IA na inicialização. Os resumos permanecem gerados pelo painel após a carga existente, sem perda de funcionalidade.
- `mobile/App.tsx`: a lista de notificações deixou de transferir `order_data` a cada consulta. Ao tocar em uma notificação, o pedido é carregado por `order_id`, sob demanda. O intervalo de contingência foi de 15 para 60 segundos; o Realtime continua entregando novas notificações imediatamente.

### Nova medição — notificações do aplicativo

| Consulta de 50 notificações | Payload | Frequência anterior/atual | Estimativa máxima diária com app aberto |
|---|---:|---:|---:|
| Antes: `select('*')` | 152.957 bytes | 15 s | ~840,2 MB |
| Depois: campos exibidos | 18.774 bytes | 60 s | ~25,8 MB |

Redução medida por leitura: **87,7%**. A diferença de frequência reduz mais 75% das leituras de contingência. Esse é um segundo responsável crítico, independente das consultas de pedidos.

### Inventário dos fluxos mobile revisados

| Fluxo | Leitura | Paginação/cache | Avaliação |
|---|---|---|---|
| Lista de pedidos | `order_list_items`, fallback `orders` | `.range()`, 30 por página e cache SQLite | Adequado; o fallback ainda inclui `order_data` para compatibilidade. |
| Painel inicial | lista de pedidos, até 400 | sem cache de resultado remoto dedicado; chama resumos com a mesma carga | Corrigida a duplicação de duas cargas. |
| Roteiro de entrega | `orders.select('*')` | cache de working set, mas sem limite no hook `useDeliveryRoute` | Alto: precisa trocar para projeção/escopo de roteiro antes de alterar, pois usa endereço, itens e janelas. |
| Logística/Montagens nativas | `orders` com `order_data`, limite 300 | cache `logistics_orders`; Realtime com debounce | Médio: dois fluxos podem recarregar o mesmo working set. |
| Agenda | projeção de campos de pedido + `order_data` | conferir janela de datas | Médio. |
| Produtos | `products(*)` + `product_variations(*)` | paginação no serviço, mas projeção pesada | Médio. |
| Financeiro | várias consultas `financial_transactions.select('*')` | filtros por data em relatórios; CRUD pontual | Médio, requer medição por tela. |
| Notificações | 50 registros com `order_data` em polling | Realtime + contingência de 15 segundos | **Corrigido: projeção enxuta e 60 segundos.** |

### Realtime e offline

- `App.tsx` agrupa eventos de `orders` e `settings` em 400 ms antes de atualizar o painel.
- `logisticsRealtimeService.ts` agrupa eventos em 250 ms e remove o canal no desmontar.
- A fila offline possui estados `PENDING`, `SYNCING`, `CONFIRMED` e `REJECTED`; mídia fica em fila separada.
- Risco pendente: `useDeliveryRoute` armazena uma leitura integral em `logistics_orders`; o cache deve ser limitado ao roteiro do operador, não à tabela completa.

### Ampliação da auditoria — módulos adicionais

| Sistema/módulo | Evidência encontrada | Situação |
|---|---|---|
| ERP · Impressão de etiquetas | Busca por texto retornava produto e pai de variação completos, até 50 de cada | **Corrigido:** projeção limitada aos campos de etiqueta (nome, código, preço, estoque, imagens, categoria e variações). |
| ERP · Monitor de uso de IA | Consultava todos os registros de uso do dia a cada 10 segundos; há 1.242 registros na base atual | **Corrigido:** atualização passou para 60 segundos. |
| ERP · Sincronização do catálogo Meta | `products(*)` e variações completas | Ação manual de administrador, não fonte de egress recorrente. |
| ERP · Categorias/atributos | há `select('*')` | Baixo: 44 categorias, 2 atributos e 72 valores na base atual. |
| ERP · Conciliação Rede | polling global de 30 segundos | Baixo na amostra: não há transações pendentes; mantido para não atrasar PIX. |
| Mobile · Roteiro de entrega | `useDeliveryRoute` usa `orders.select('*')` sem limite e grava no working set | Alto pendente: precisa de consulta por roteiro/data antes de reduzir campos, pois depende de endereço, itens e janelas. |
| Mobile · Logística e montagens | ambas leem até 300 pedidos com `order_data` e assinam Realtime | Médio: cache comum, mas podem duplicar leitura se ambas as telas forem abertas. |
| Mobile · Lista de pedidos | paginação server-side de 30 + cache local | Adequado; `order_data` ainda é necessário para compatibilidade de renderização. |
| Mobile · Financeiro | leituras `select('*')` filtradas por período | Médio: requer medição em base com transações antes de reduzir projeções. |
