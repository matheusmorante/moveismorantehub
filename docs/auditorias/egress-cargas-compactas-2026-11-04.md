# Cargas compactas no ERP, app e catálogo — 04/11/2026

Continuação da auditoria de egress e da correção de filtros no servidor. Escopo autorizado: implementar as otimizações restantes sem retirar informações, resultados, operação offline ou atualização das mensagens. Não houve publicação de ERP/catálogo nem OTA nesta etapa.

## Implementação

- Pedidos: os IDs continuam selecionados no servidor antes de paginação/contagem. A RPC `read_order_summaries` devolve os campos operacionais e pagamentos normalizados, sem duplicar arrays de itens, transportar a geometria da rota ou snapshots fiscais dos itens. ERP e app carregam o pedido completo pelo ID antes de detalhes/edição/ações. Resumos não entram no WeakMap de snapshots fiscais nem são aceitos como gravação completa.
- Agenda e cronograma: usam o mesmo resumo para **todos** os IDs do escopo. Lotes de transporte não são paginação da tela. Endereço, contatos, agendamento, responsáveis, observações, manuseio e itens operacionais permanecem.
- Offline: os resumos ficam em conjuntos separados dos snapshots completos. Para preservar operações sem rede, o app atualiza os snapshots completos dos IDs do escopo somente quando estão ausentes ou com versão/data alterada, em lotes de transporte de até 100 IDs. Consultas seguintes não repetem esse download quando o snapshot está atual. Esta carga adicional é necessária para conservar a funcionalidade offline, não é uma leitura global para filtrar no cliente. A lista pesquisa os dados já salvos, identifica resultados locais e consulta novamente o servidor ao reconectar. Respostas remotas preservam alterações pendentes. Se a atualização do snapshot falhar e ele nunca tiver sido carregado, os detalhes informam que precisam de conexão.
- Alertas: `notification_product_summaries` seleciona no servidor produtos com condições de alerta ou desejos pendentes. Sino e dashboard compartilham consulta, snapshot, leitura e invalidação. Preço/estoque de operações não dependem desse cache de alertas.
- Complemento de produtos/estoque: o dashboard passou a receber somente contagens e até oito itens de `get_dashboard_stock_summary`, sem baixar os candidatos. Alertas também omitem variações saudáveis. [Prova de 94,50% menos JSON nessa consulta, correção da exclusão de testes e limites](produtos-alertas-resumo-estoque-2026-11-04.md).
- Notificações do app: `list_app_notification_summaries` retorna até 50 metadados e referência ao pedido; abertura usa o carregador completo. Recuperação na reconexão/retorno ao app, proteção contra duplicatas e respostas da sessão anterior. A redução é na leitura REST; o evento INSERT do Realtime continua sujeito ao payload original da tabela.
- Atendimento: página inicial de até 80 mensagens com watermark do banco; eventos restritos à conversa aberta; recuperação incremental por revisão `changed_at`, incluindo mensagens editadas, reações e conteúdo citado. Segurança periódica passa de 6 para 30 segundos. Lotes de 200 recuperam todas as alterações pendentes, sem truncar após desconexão. Histórico anterior continua sob demanda e nenhuma conversa é marcada lida pela auditoria.
- Etiquetas: listagem dos modelos omite imagem de amostra, arte e campos extras pesados. Arte completa carregada ao selecionar/editar/copiar/imprimir; cache por `updated_at`. Cópias e comparação contra modelos existentes continuam usando conteúdo completo. Não há mudança nos passos operacionais do estoquista; guia PDF não precisa ser reescrito por esta alteração interna.
- Catálogo: elegibilidade pública, filtros e contagem aplicados antes da página também sem termo de busca. Cartões recebem uma imagem do pai e somente variações publicadas; descrições e demais fotos continuam no detalhe. Menus compartilham cache de categorias. Link direto de produto e metadados também filtram variações no banco. Carrinho confere publicação, preço e estoque atuais; mudança de preço exige nova conferência do subtotal, mantendo a consulta de interesse quando a disponibilidade é sob consulta.
- Diagnóstico: app e catálogo registram contagens, bytes decodificados, duração e falhas por recurso/plataforma/versão, somente em memória, sem tokens, URLs completas, filtros, corpo ou dados pessoais. Não representa cobrança oficial do Supabase nem cobre imagens carregadas fora do cliente HTTP, tráfego Realtime ou o tráfego R2.

## Verificação concluída neste escopo

As migrations foram aplicadas no projeto operacional `hkoxhourxwlddgsfdgws`, somente schema `public`, com funções `SECURITY INVOKER` e sem alterar RLS existente. Leituras internas não concedem execução a `anon`; somente as leituras públicas do catálogo concedem. Nenhuma fixture, DML de teste, emissão SEFAZ ou mensagem externa foi executada.

### Leituras e interface

| Verificação | Resultado observado |
|---|---|
| Mesmos 15 IDs de pedidos, duas projeções pela sessão do operador | 123.413 → 66.816 bytes de JSON serializado, redução de **45,86%**. Nenhuma divergência nos campos comparados: cliente, status, descrições/quantidades, total e valor pago. |
| Lista de pedidos e abertura de detalhes pela UI | 15 resumos; o detalhe abriu com leitura completa somente pelo ID escolhido. O resumo não foi registrado como snapshot fiscal; o objeto completo foi. |
| Segurança incremental do atendimento | A conversa conferida retornou 103 bytes e zero alterações; watermark presente e canal de mensagens restrito à conversa aberta. A recuperação de várias páginas e revisões foi conferida em Vitest, sem alterar mensagens reais. |
| Modelos de etiquetas | Uma leitura leve dos quatro modelos retornou 10.493 bytes, sem solicitar `preview_image` nem `art_config`; seleção pela UI confirmada, reaproveitando arte completa em cache. A referência anterior de 213.559 bytes é JSON agregado no banco, portanto não constitui comparação exata de bytes HTTP. |
| Notificações móveis | Amostra agregada de 50 resumos: 19.001 bytes. Sem exportar conteúdos. |
| Produtos elegíveis para alertas | Com condição `novo`, 103 resumos/99.445 bytes na amostra agregada. A conta de operador estava com condições vazias e recebeu lista vazia, conforme sua configuração; isso não foi tratado como falha. |
| Catálogo, página pública inicial | 15 produtos pais/146 no total; resposta de 25.399 bytes. Cartões sem descrições completas, até uma imagem do pai e somente variações publicadas; detalhe público abriu pela UI. |
| Catálogo, preço entre R$ 400 e R$ 600 | Uma consulta, 15 pais/32 no total, 18.568 bytes, nenhum preço retornado fora da faixa. O filtro ocorre antes da página/contagem, inclusive nas variações. |
| Cache dos menus do catálogo | Uma leitura de categorias (5.182 bytes) e uma de relacionamentos (6.040 bytes), compartilhadas pelos consumidores da página. Imagens observadas vieram do host R2. |

Essas medições são amostras de conteúdo decodificado/serializado, não a cobrança do Supabase nem uma previsão mensal. Valores e contagens podem mudar com dados operacionais novos. [Evidências sem dados pessoais](egress-cargas-compactas-2026-11-04-evidencias.json).

### Testes e limites

- **146 testes ERP** em 16 arquivos e **14 testes de lógica/serviços mobile** em quatro arquivos passaram. Incluem resumos inválidos, hidratação de detalhes, pagamentos, estoque, snapshots offline ausentes/alterados, preservação de pendências locais, revisões de mensagens com precisão inferior a milissegundo, histórico anterior, ciclo de Realtime e seleção/edição de modelos.
- Build ERP aprovado (`remaining-erp-build-final.log`). Typecheck do catálogo aprovado. Os typechecks globais de ERP e app continuam com diagnósticos preexistentes fora deste lote; o typecheck mobile final não apontou os arquivos alterados neste escopo. Não se declara aprovação global do repositório.
- Playwright em Chrome visível exercitou ERP e catálogo com guardas de somente leitura, sem provisionar fixtures ou gravar dados operacionais. Autovínculo de contatos foi simulado para não produzir escrita. Os testes não enviaram mensagens nem confirmaram pedidos/carrinho.
- UI Android em telefone físico não foi testada. Vitest não substitui Maestro nem comprova transações PostgreSQL, concorrência ou efeitos fiscais reais. Reconnect e recuperação de mensagens foram verificados por lógica/ciclo de vida, sem provocar uma desconexão gravável de mensagens reais.
- Duas correções adjacentes de compilação do catálogo removeram um comentário JSX fora da raiz em `ProfileEmailTab` e trataram o preço opcional em `useProductShare`; não alteram regras comerciais.
- Nenhum deploy ou OTA foi publicado. As migrations já estão no Supabase operacional; os clientes modificados estão no checkout local. A economia em produção só poderá ser comparada após publicação e uma janela equivalente de uso.

### Migrations aplicadas

O histórico remoto foi reconferido após a aplicação, preservando os nomes/versões abaixo:

1. `20261105000648_compact_notifications_message_changes.sql`
2. `20261105000932_support_initial_message_page.sql`
3. `20261105001647_compact_catalog_cards.sql`
4. `20261105002327_order_read_summaries.sql`
5. `20261105003459_notification_products_cart_quote.sql`
6. `20261105004008_order_summary_payment_projection.sql`
7. `20261105004845_public_catalog_product_detail.sql`
8. `20261105010448_catalog_price_filters_before_paging.sql`

As leituras antigas continuam compatíveis. Reverter os clientes não exige apagar colunas, funções ou dados; os acréscimos podem permanecer. A função pública de busca também passou a aplicar a faixa de preço antes da paginação, preservando a intenção do filtro existente. A última migration inicializa `pg_trgm` pela função `similarity` antes de configurar seu limite, sem alterar permissões do operador. ACLs foram reconferidas e os advisors não apontaram avisos relacionados às novas funções de leitura. Achados antigos fora do escopo não foram corrigidos indiscriminadamente.

### Pontos principais no código

- Leituras de pedidos: `shared-utils/orderSummaryQuery.ts`, `shared-utils/orderScheduleServerQuery.ts`, `erp/src/pages/utils/orderDetailsLoader.ts`, leitores em `orderSyncQueries`, guardas em `orderMutationService` e consumidores comerciais/agenda/montagens.
- Offline mobile: `services/offline/orderSnapshotCache.ts`, `services/orderDetailsReadService.ts`, `features/orders/services/mobileOrderListService.ts`, `features/logistics/hooks/useScopedOrderSchedule.ts` e modal de detalhes.
- Alertas/mensagens: `erp/src/pages/utils/notificationService.ts`, `customerSupportMessageSync.ts`, `useCustomerSupportMessages.ts`, `useCustomerSupportConversations.ts`, `mobile/src/contexts/NotificationContext.tsx` e `services/appNotificationQuery.ts`.
- Etiquetas: `labelLayoutService.ts`, `useLabelLayouts.ts`, `LabelModelManagerModal.tsx` e schema de seleção `shared-utils/labelLayoutFormSchemas.ts`. A seleção/edição executa o resolver real antes do efeito; o inventário RHF/Zod foi atualizado.
- Catálogo: `useCatalogProductsQuery.ts`, `useCatalogProductsFiltering.ts`, rota de detalhe público, `catalog-menu-queries.ts`, cache de configurações e `cart-quote.ts`/`cart-drawer.tsx`.
- Diagnóstico por plataforma/versão: `shared-utils/supabaseReadMetrics.ts` e clientes Supabase do app e catálogo.
