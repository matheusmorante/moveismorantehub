# Auditoria de egress do ERP e do app — 04/11/2026

**Produtos/estoque, implementação posterior:** o resumo de estoque agora é calculado no servidor, com 94,50% menos JSON na amostra da consulta; os alertas omitem variações que não geram aviso. [Implementação, exclusão correta dos testes e limites](produtos-alertas-resumo-estoque-2026-11-04.md). Esse percentual não se aplica aos 64,67 MB de todas as leituras de produtos.

**Implementação posterior, 04/11/2026:** os pontos autorizados foram implementados; resultados e limites estão em [cargas compactas no ERP, app e catálogo](egress-cargas-compactas-2026-11-04.md). Os achados abaixo descrevem a auditoria anterior à implementação.

**Implementação posterior à auditoria:** os filtros de pedidos e seus leitores relacionados foram corrigidos no [registro de implementação](pedidos-filtros-servidor-2026-11-04.md), com migrations aplicadas e evidências de testes/consultas. Os achados e volumes abaixo descrevem o recorte anterior à correção.

O MoranteHub reúne ERP, aplicativo e serviços que compartilham o Supabase operacional. Esta revisão identifica transferências evitáveis nas consultas do ERP e do app e propõe reduções sem alterar o produto ou o banco.

Projeto: `hkoxhourxwlddgsfdgws`. Janela congelada: **03/11/2026 20:31:45 UTC a 04/11/2026 20:31:45 UTC**, ou **17:31:45–17:31:45 BRT**. A carga observada inclui produção, desenvolvimento local e app nativo; não foi executado teste de carga nem assumido número fixo de operadores. Os carregamentos por tela/painel se multiplicam conforme os usuários e painéis simultâneos.

## Evidência e limites da medição

A tabela `public.supabase_telemetry` registrou **271.229.602 bytes (271,23 MB decimais)** no módulo ERP, 7.326 execuções e 7.218 respostas com tamanho registrado. O monitor mede o tamanho declarado no header ou lê uma cópia limitada do corpo JSON. SELECTs simultâneos deduplicados retornam antes da contagem, evitando registrar novamente a mesma leitura compartilhada: `erp/src/services/monitoring/queryGuard.ts:187,242,297,323`.

Esse número é **conteúdo de respostas observado pelos clientes instrumentados**, não o egress faturável do projeto. A instrumentação mistura navegadores de produção e desenvolvimento e não inclui todos os fluxos de backend, Realtime ou Storage. A janela teve 22.084 eventos de gateway, incluindo 21.147 chamadas REST. Só 7.512 chamadas REST tinham Content-Length no log; os headers disponíveis omitem justamente muitas respostas maiores e não permitem reconstruir a cobrança.

O app nativo não alimenta essa mesma telemetria de bytes. A comparação do app usa contagens reais de gateway, projeções e amostras agregadas do payload atual. **Expo Web local não foi tratado como teste do Android**; suas chamadas estão separadas das de `supabase-js-react-native`. Origem e biblioteca servem para atribuição de cliente, não como identificação autenticada da versão implantada.

Todas as consultas foram somente leitura, com resultados agregados. Não foram exportados conteúdos de mensagens, clientes, tokens, sessões, URLs de objetos ou valores de configurações. Os tamanhos amostrados são JSON serializado no banco, sem simular compressão, CDN ou uma janela futura. [Evidências numéricas](2026-11-04-egress-erp-app-evidencias.json).

## Onde o ERP transferiu mais conteúdo

| Fonte na telemetria ERP | Execuções | Linhas registradas | Respostas medidas |
|---|---:|---:|---:|
| `orders` | 512 | 59.327 | **91,85 MB** |
| `products` | 425 | 41.596 | **64,67 MB** |
| `get_dashboard_orders_by_effective_date` | 81 | 26.615 | **54,47 MB** |
| `whatsapp_messages` | 861 | 34.662 | **27,29 MB** |
| `customer_support_list_conversations` | 321 | 15.952 | **11,47 MB** |
| Demais fontes | — | — | 21,49 MB |

As cinco primeiras fontes respondem por **92,08%** dos bytes registrados. As categorias da tabela são distintas; o estoque do dashboard também lê `products`, portanto seus bytes não devem ser somados novamente ao total de produtos.

## Achados e propostas, em prioridade de execução

### 1. Pedidos: filtros da lista podem baixar todos os candidatos

**Prova.** A tela `/sales-order` concentrou 59,64 MB de `orders` no recorte. O gateway de produção registrou 105 leituras da projeção completa da lista, com 8.379 linhas. A lista atual inclui `items`, `order_data`, `order_items.item_snapshot` e pagamentos. Quando há filtro por cliente, produto, vendedor, período ou ordenação não padrão, `requiresGlobalOrderFiltering` escolhe um caminho que percorre páginas de **1.000 pedidos** antes de filtrar e recortar a página no navegador.

**Causa localizada.** `erp/src/pages/App/SalesOrder/OrderHistoryList/useOrderHistoryFilters.ts:129`; `erp/src/pages/App/SalesOrder/OrderHistoryList/useOrderHistory.ts:131`; `erp/src/pages/utils/orderSyncQueries/orderListQueries.ts:175,179`; `erp/src/pages/utils/orderSyncQueries/orderSyncConstants.ts:5,13`. O filtro de cliente ainda é retirado de `serverFilters` no caminho global.

**Proposta.** Levar os predicados e a ordenação para uma consulta/RPC que filtre e conte no servidor antes de retornar **15 resumos**. Projetar somente os campos da linha e um resumo dos itens; buscar o pedido completo pelo ID ao abrir detalhes, edição ou uma ação que realmente o exija. Preservar busca por palavras/acentos, campos históricos, tipos de operação, permissões e todos os filtros. Recortar primeiro e filtrar depois produziria resultados e contagens incorretos.

**Resultado esperado.** Eliminar o download de todo o conjunto de candidatos para uma página. É uma redução de alto impacto, mas depende de prova de equivalência dos filtros; não há percentual de economia medido para uma implementação que ainda não existe.

### 2. Alertas do ERP: todos os produtos ativos são lidos com todas as colunas

**Prova.** O gateway confirmou **141 consultas `products.select('*')`**, retornando 22.842 linhas: 34 em produção e 107 no ERP local. O serviço de notificações baixa todos os produtos ativos a cada montagem de assinante, embora transforme o resultado em poucos campos. Há consumidores no sino e no painel de alertas.

**Causa localizada.** `erp/src/pages/utils/notificationService.ts:235,239,240,252`; `erp/src/components/shared/NotificationBell.tsx:36`; `erp/src/pages/App/Dashboard/components/AlertsPanel.tsx:59`. O serviço não compartilha resultado/TTL entre montagens. O Query Guard compartilha somente requisições que coincidam enquanto estão em voo.

**Proposta.** Trocar o asterisco por uma projeção explícita com os campos usados nos alertas e os metadados de teste necessários. Compartilhar uma única carga por sessão/escopo e invalidá-la quando houver mudança pertinente em produto/estoque. Depois, avaliar uma resposta agregada de alertas que dispense enviar o catálogo inteiro.

**Amostra concreta.** Os 162 produtos ativos atuais ocupam 628.524 bytes como linhas JSON completas; os campos necessários, **mantendo inclusive `technical_specs` para preservar o filtro de artefatos de teste**, ocupam 250.155 bytes. É uma redução estimada de **60,2% por leitura** nessa amostra, antes de compressão. Não extrapolada para a cobrança diária.

### 3. Dashboard: a produção ainda usa a consulta antiga; estoque ainda é calculado no cliente

**Prova.** A RPC antiga transferiu 54,47 MB em 81 chamadas na telemetria. Mesmo após a migration do dashboard compacto de 04/11, o gateway de `morantehub.vercel.app` registrou **18 chamadas 200 do SDK à RPC antiga** entre 16:49:15 e 20:31:45 UTC. No mesmo período, a nova `get_dashboard_metrics` aparece na telemetria com cinco chamadas e 30.655 bytes. As consultas podem ter filtros e volumes diferentes; esses totais não constituem comparação causal de antes/depois.

**Código conferido.** `erp/src/pages/App/Dashboard/dashboardMetrics.ts:55` usa a RPC compacta. O helper legado permanece em `erp/src/pages/utils/orderSyncQueries/dashboardOrdersQueries.ts:102,114`, sem chamador de produção encontrado no código atual fora da fachada. Isso demonstra diferença entre o tráfego observado e o caminho atual revisado, sem identificar o commit implantado.

**Proposta imediata.** Confirmar e publicar a versão web que usa os indicadores compactos; acompanhar a adoção pelo endpoint e por versão do cliente. Retirar o contrato legado somente depois de confirmar que os clientes ativos migraram.

**Atualização posterior, em 04/11/2026.** A versão compacta foi publicada no ERP e validada no endereço principal. O teste da sessão fez uma chamada agregada de 7.248 bytes na carga inicial e não chamou a RPC massiva anterior. Consulte [a comprovação da publicação](dashboard-carga-compacta-2026-11-04.md) para os detalhes e os limites da medição.

**Segundo ponto.** `erp/src/pages/App/Dashboard/hooks/useDashboardStock.ts:30,37,55,133,150` ainda percorre produtos e variações para calcular contadores e exibir oito itens. No gateway, a projeção de estoque teve 154 leituras e 24.794 linhas entre produção e ERP local. Na telemetria da raiz, todas as consultas de produtos somaram 24,95 MB; esse valor também inclui outros leitores da tela e não foi atribuído inteiro ao hook de estoque.

**Proposta.** RPC de estoque que devolva os dois contadores, os oito itens e o inventário pendente. Preservar a semântica de pai/variação, produtos compostos e artefatos de teste. Manter invalidação de dados relevantes e compartilhar a carga entre os cartões; não usar cache longo para estoque.

### 4. Atendimento: polling de seis segundos repete o histórico; a lista repete páginas já abertas

**Prova.** Mensagens somaram **27,29 MB**, e a lista de conversas, **11,47 MB**. `loadMessages` consulta novamente até 80 mensagens a cada seis segundos enquanto o documento está visível, mesmo com Realtime ativo: até **600 consultas por hora e por painel aberto**. A lista de conversas atualiza a cada 30 segundos e, no refresh silencioso, busca novamente todas as páginas que o operador já carregou.

**Causa localizada.** `erp/src/pages/App/CustomerSupport/hooks/useCustomerSupportMessages.ts:12,65,223,228,252`; `erp/src/pages/App/CustomerSupport/hooks/useCustomerSupportConversations.ts:59,62,155,159`. A assinatura de mensagens recebe mudanças de toda a tabela autorizada e descarta outras conversas no cliente. `erp/src/pages/utils/customerSupport/customerSupportHistoryService.ts:14,32` inclui `raw_payload` em cada leitura.

**Proposta.** Usar Realtime como caminho principal, com assinatura limitada à conversa quando aplicável; na reconexão, consultar alterações desde um cursor. O polling deve atuar como contingência adaptativa, com intervalo maior e sem recarregar históricos intactos. Na caixa de entrada, atualizar registros alterados e contadores leves em vez de repetir todas as páginas.

**Payload.** Projetar os campos de `raw_payload` realmente exibidos e carregar detalhes excepcionais sob demanda. Reações, respostas citadas, templates, encaminhamento e autoria já usam esse objeto; removê-lo integralmente causaria regressão. Preservar ordenação, cursores, deduplicação e recuperação de mensagens após desconexão.

### 5. App: roteiro e cronograma recarregam 300 pedidos completos

**Prova no Android.** O gateway identificou **11 leituras nativas e 3.300 linhas** da projeção com `order_data`. Separadamente, a simulação local fez 158 leituras e retornou 47.400 linhas. Uma amostra agregada atual dos mesmos 300 pedidos e campos tem **1.137.416 bytes de JSON**, aproximadamente **1,14 MB por carga**, sem compressão.

**Causa localizada.** `mobile/src/features/logistics/hooks/useDeliveryRoute.ts:53,56,79` busca os 300 pedidos e aplica o escopo de data em `buildDeliveryRouteItems` no cliente. `mobile/src/features/logistics/hooks/useLogisticsScheduleData.ts:48,51,76` mantém outra carga de até 300 pedidos. Ambos usam o working set `logistics_orders`. O canal já é compartilhado e tem debounce de três segundos, mas distribui um sinal que faz cada consumidor refazer sua própria carga: `mobile/src/services/logisticsRealtimeService.ts:13,34`.

**Proposta.** Consultar no servidor todos os resultados do período/escopo selecionado e retornar uma projeção operacional de entrega/montagem, não o snapshot completo. Atualizar IDs alterados e compartilhar a promessa em voo e o working set por escopo/operador. Agregar os contadores de hoje/amanhã/próximos dias no servidor.

**Regra preservada.** Agenda e cronograma devem continuar mostrando todos os resultados dos filtros; a redução vem do escopo correto e dos campos, sem adicionar paginação ou cortar registros válidos. Preservar a sobreposição das alterações offline e as permissões. O fallback de IA sem limite em `TodaySummaryCard` não foi classificado como consumo ativo: `SHOW_AI_SUMMARY=false` desativa esse caminho no código atual.

### 6. App: a lista de notificações ainda transporta snapshots de pedidos

**Prova.** O código seleciona `order_data` para 50 notificações, mas constrói a navegação com uma referência `order_id`. O gateway observou cinco leituras nativas/250 linhas e, separadamente, 155 leituras locais/7.750 linhas. Na amostra atual de 50 notificações, o JSON ocupa **263.104 bytes**; os mesmos campos sem o snapshot de pedido ocupam **18.901 bytes**. O snapshot representa **92,82%** dessa amostra.

**Causa localizada.** `mobile/src/contexts/NotificationContext.tsx:29,33,35,47`. O snapshot também participa da identificação de artefatos de teste; esse uso precisa ser mantido por uma projeção de marcadores/flag normalizada.

**Proposta.** Retornar metadados da notificação e a referência do pedido, preservando a exclusão de testes no servidor e a compatibilidade dos marcadores legados. Buscar o pedido completo somente ao abrir a notificação. A oportunidade de aproximadamente 93% se refere à amostra de JSON, não a uma redução de egress faturável já entregue. Não foi encontrado polling periódico nesse provider atual; a fonte é carga inicial/atualização solicitada e eventos.

O canal de Postgres Changes também recebe a linha com o snapshot no evento de inserção. Para reduzir essa parcela, usar um evento privado com os metadados necessários e autorização equivalente, sem transmitir o snapshot completo. O volume de bytes desses eventos não foi medido nesta coleta.

### 7. Prioridade seguinte: configurações e modelos de etiqueta

**Configurações.** A telemetria registrou 5,13 MB em leituras de `settings`, além de 1,01 MB em respostas de gravação. Cada assinante de `subscribeToSettings` lê o JSON completo: `erp/src/pages/utils/settings/storage.ts:104,116`. O campo `aiPrompts` sozinho ocupa 42.716 bytes no estado atual. O app tem cache com promessa compartilhada em `mobile/src/services/appSettingsCache.ts:8`, mas o cronograma ainda faz sua própria consulta completa em `useLogisticsScheduleData.ts:18`.

**Proposta.** Compartilhar a leitura com revisão/invalidação e separar as projeções usadas por logística, empresa, preços e IA. Preservar a confirmação autoritativa exigida antes de editar configurações; a deduplicação não pode transformar snapshot velho em confirmação de gravação.

**Etiquetas.** `label_layouts` transferiu 2,55 MB em 12 leituras. Os quatro modelos atuais ocupam 213.559 bytes de JSON: 162.197 bytes são `preview_image` e 39.291 são `art_config`. `erp/src/pages/App/Stock/LabelPrinting/services/labelLayoutService.ts:68` baixa todos os campos de todos os modelos.

**Proposta.** Catálogo leve de modelos, miniaturas pequenas com cache e carregamento da arte completa apenas para o modelo escolhido. Usar `updated_at`/revisão na chave do cache; conservar a arte original e a fidelidade da impressão.

### 8. Completar a medição do app e distinguir versões

A maior lacuna é a ausência de bytes do app na mesma telemetria: `mobile/src/services/supabaseClient.ts:13` não usa o observador do ERP. Os logs permitem separar origens e bibliotecas, mas não recuperam todos os tamanhos nem identificam com precisão qual release fez a consulta.

**Proposta.** Medição passiva limitada de tamanho/latência e endpoint no app, sem registrar corpos, filtros pessoais, tokens ou headers de autenticação. Acrescentar plataforma, ambiente e release às métricas agregadas, mantendo flush em lote e teto de custo da própria telemetria. Comparar a próxima janela equivalente após cada implantação com a versão identificada e conferir o medidor oficial de Usage/Egress.

## Ordem sugerida para reduzir primeiro

1. **Dashboard em produção:** confirmar/publicar o cliente compacto já existente e medir a adoção; não iniciar outra reescrita dos mesmos indicadores.
2. **Ganhos menores de implementar:** projeção dos alertas do ERP, snapshot de notificações do app e atualização incremental/contingência do atendimento.
3. **Ganhos estruturais:** filtros/ordenação de pedidos no servidor, resumos de estoque e working set logístico do app por escopo.
4. **Complementos:** configurações segmentadas, catálogo leve de etiquetas e medição por release/plataforma.

## Cobertura e fontes

Revisados: medidor do ERP, projeções reais do gateway, lista de pedidos e caminho de filtros locais, alertas globais, leitores do dashboard, histórico/lista de atendimento, roteiro/cronograma e notificações do app, configurações e modelos de etiquetas. Componentes de imagem dos dois clientes já possuem derivação de tamanho e fallback; sem medição completa de Storage/CDN, não foi afirmado que fotos são o maior consumo.

Não cobertos integralmente: relatórios financeiros/fiscais, todas as rotas do catálogo público e todos os objetos de Storage/CDN/Realtime. A cobrança oficial, quota, excedente e o commit exato da produção não foram obtidos. Não extrapolada a amostra para custo mensal, número de usuários ou cumprimento da meta histórica de 100 MB/dia em produção.

Referências oficiais consultadas: [Egress no Supabase](https://supabase.com/docs/guides/platform/manage-your-usage/egress), que distingue tráfego dos diferentes serviços; [campos de logs](https://supabase.com/docs/guides/observability/log-field-reference), cuja presença pode variar por evento. Os relatórios anteriores foram usados como histórico e reconferidos contra os caminhos atuais; não foram repetidos como achados corrigidos, por exemplo o polling antigo de notificações do app ou o fallback de IA atualmente desligado.

**Entrega desta tarefa:** somente auditoria, consultas agregadas e estes arquivos de evidência/relatório. Nenhuma alteração de código, configuração, dados operacionais, migration, deploy ou OTA. Não houve testes funcionais ou de carga; as provas são observação de telemetria/logs, leitura de código e medições agregadas de payload.

