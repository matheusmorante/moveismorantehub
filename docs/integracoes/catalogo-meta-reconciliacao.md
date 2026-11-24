# Reconciliação do Catálogo Meta

O ERP é a origem dos dados de publicação. A alteração de produto ou variação no ERP e no app solicita uma reconciliação do produto após salvar. O Catálogo Digital usa o mesmo serviço na finalização da publicação. A ação manual e o agendamento horário executam a comparação completa no servidor. O agendamento está em `erp/vercel.json` e chama o servidor do ERP sem depender de uma sessão aberta.

## Operações no catálogo

- A rotina usa o SKU canônico como `retailer_id`. Cria ou atualiza produtos e variações publicados e ativos. Estoque numérico zero gera `out of stock`. Estoque nulo mantém o tratamento existente para itens sem controle numérico, como os salvados. Produto ou variação ocultos, inativos ou mesclados saem da publicação na Meta via `items_batch`.
- O servidor aceita apenas o Catálogo do site/WhatsApp (`949184464866249`) e o Catálogo de Criativos (`3884846918337684`). Consulta as fontes dos destinos na Graph API em cada execução. Nos catálogos exclusivos do aplicativo do ERP, o estado do ERP basta para atualizar e excluir itens legados. A sincronização pontual limita a exclusão sem vínculo histórico aos SKUs associados ao cadastro consultado. A sincronização completa também exclui SKUs ausentes da publicação no ERP.
- Se houver outra fonte de dados no catálogo, o servidor aplica a proteção de propriedade por `custom_label_4` ou pelo vínculo com o ID interno na tabela `meta_catalog_verified_items`. A tabela e o rótulo também servem para localizar itens com SKUs antigos. `custom_number_4` registra a versão dos rótulos de campanha enviados.
- A reconciliação só monta os lotes após concluir as leituras. As consultas Supabase conferem a contagem exata da primeira página e a progressão das páginas restantes. Campos inválidos de um produto publicado geram uma pendência para seu SKU. Por catálogo, o servidor bloqueia um plano com mais de 50 exclusões, ou com pelo menos 10 exclusões que superam 25% de um catálogo lido por inteiro.
- Os lotes têm até 50 alterações. Antes de enviar exclusões, o servidor registra a tentativa em `meta_catalog_sync_deletions`, com execução, catálogo, SKU e gatilho. Após a consulta por SKU confirmar a ausência, registra `confirmed_at` e conta a remoção. Tentativas sem confirmação continuam no histórico com `confirmed_at` vazio. O painel do ERP e do app usa a mesma regra de atividade para contar os itens publicáveis.

## Acompanhamento e ativação

O painel **Catálogo Meta** no ERP e no app mostra a data e o resumo da última execução completa. As contagens são de itens por catálogo. Um SKU alterado com sucesso em dois catálogos conta duas vezes. O Supabase guarda `last_run` e a última falha pontual em `meta_catalog_sync_state`. A trava é compartilhada pelos disparos pontual, manual e horário. O PostgreSQL libera a transação antes das chamadas externas. Uma execução interrompida libera a vaga após vencer a concessão.

Para a ativação, a produção do ERP precisa do `CRON_SECRET` como variável sensível. `erp/vercel.json` declara um Vercel Schedule horário para a rota protegida do Catálogo Meta. No Hobby, Schedules permite até 5.000 execuções mensais e acrescenta até 15 minutos de jitter; uma execução horária consome cerca de 672–744 execuções por mês. O servidor usa o token, a configuração do WhatsApp e o catálogo Meta Ads já adotados pelo ERP. A validação de publicação inclui conferir a invocação autenticada e o registro da execução. [Schedules da Vercel](https://vercel.com/docs/schedules)

Em 23/11/2026, a migration `20261123130005` foi aplicada no Supabase operacional. A conferência remota verificou as tabelas, a RLS e os grants das RPCs. Os testes Vitest cobrem a autenticação do cron, a trava, a comparação de itens, o isolamento de falhas e a confirmação de exclusão por SKU em respostas simuladas. A consulta real de saúde do catálogo respondeu. A comprovação da origem dos legados, uma execução com escritas na Meta e a ativação do agendamento em produção ficaram pendentes.

## Auditoria do ciclo de produto em 23/11/2026

O ERP publicado passou do commit `33253d8b` para `16c95922` durante a auditoria. Na versão final conferida, a operação do cron ainda retornou `404`, o `CRON_SECRET` estava ausente em produção e o Supabase não apresentava execuções nem itens legados com origem verificada. A consulta de saúde da integração antiga respondeu.

O teste de ciclo usa o cliente PostgREST e as rotas do ERP com respostas simuladas do Supabase e da Meta. Abrange rascunho, publicação, edição de preço e nome, ocultação de variação e produto, republicação, recuperação horária de item ausente ou alterado, repetição sem novos envios e remoção após exclusão do ERP. O item manual persiste nos dois catálogos simulados.

A auditoria também incluiu o disparo logo após o ERP confirmar a exclusão definitiva de um produto ou de uma variação. No app, a exclusão de um produto concluído passa pela operação protegida da Lixeira, que já agenda a reconciliação após o sucesso.

Passaram 130 testes das suítes de catálogo, serviços e API e 12 testes dos fluxos de formulário do app. A verificação dos ambientes operacionais foi somente leitura.

## Correção da falha de build em 23/11/2026

A configuração anterior usava Vercel Cron com `0 * * * *`, frequência que o plano Hobby rejeita por exceder uma execução diária. O cron legado foi substituído pelo Vercel Schedules em `erp/vercel.json`, com o mesmo horário nominal, rota `GET` e autenticação por `CRON_SECRET`. Foi criado um novo `CRON_SECRET` como variável sensível somente no ambiente de produção da Vercel. A execução em produção depende do próximo deploy bem-sucedido; ainda é necessário confirmar no painel de Schedules a próxima execução e o registro de uma execução concluída. No Hobby, o horário pode atrasar até 15 minutos.

## Remoção de legados em 24/11/2026

A Graph API mostrou o Sidney Branco (`000212-04`) publicado nos dois destinos e oculto no ERP. Cada catálogo tinha como única fonte o aplicativo Meta utilizado pelo ERP. A regra anterior exigia um vínculo individual e deixava esse item no catálogo. O servidor passou a decidir pelo estado do ERP nos destinos exclusivos. A mesclagem de variações solicita reconciliação pontual no ERP e no app.

A migration `20261124134554` foi aplicada no Supabase operacional. O histórico tem RLS e escrita restrita ao serviço. A RPC de resumo conserva o contrato e as permissões de leitura e conta a elegibilidade por atividade e mesclagem para os dois clientes.

A reconciliação manual iniciada às 10:46:23 BRT registrou 46 exclusões confirmadas em cada catálogo. O histórico confirmou o Sidney às 10:47:27 no Catálogo de Criativos e às 10:47:30 no Catálogo do site/WhatsApp. Uma consulta posterior por `retailer_id` retornou o SKU ausente nos dois destinos. O mesmo processamento registrou 282 itens sem confirmação do lote no prazo e manteve a trava até a expiração prevista.

Uma leitura posterior da Meta encontrou 166 itens em cada catálogo. Todos tinham o rótulo do ERP e 150 por destino estavam com `out of stock`. Os testes Vitest passaram para o Catálogo Meta, a sincronização de produto e o disparo após mesclagem no ERP e no app. O commit `67b8323d`, com a regra de propriedade corrigida, foi implantado na Vercel em produção. Essa versão ainda usava o limite de polling de 12 segundos que causou os erros registrados na seção seguinte.

## Correção dos 116 erros de confirmação em 24/11/2026

O painel mostrou a execução de 11:29:39 BRT com 50 atualizações, 166 itens sem alteração e 116 erros. A leitura de `meta_catalog_sync_state.last_run` mostrou que os detalhes registrados eram timeouts de confirmação do lote assíncrono da Meta. Os 100 SKUs detalhados estavam ativos e publicados no ERP. O histórico `meta_catalog_sync_deletions` não tinha tentativas de exclusão para essa execução.

A causa foi o limite local de 12 segundos para consultar o `handle` retornado por `items_batch`. A Graph API aceita o lote e informa o resultado final pelo endpoint `check_batch_request_status`; lotes com muitas alterações continuavam processando após esse limite. A reconciliação agora consulta o estado por `retailer_id` por até 45 segundos, com intervalo crescente limitado a 5 segundos. Se o `handle` seguir sem conclusão, a rotina lê os SKUs alterados e compara o payload observado com o desejado usando `matchesMetaProduct`. Só os itens confirmados por leitura são contados como atualizados. Falhas de leitura ou divergências permanecem pendentes. Exclusões mantêm a verificação e o histórico próprios.

A reconciliação manual integral no Supabase operacional e nos dois catálogos Meta terminou às 11:55:41 BRT com sucesso: 166 atualizados, 166 sem alteração, zero criados, zero excluídos e zero erros. O Supabase informou 166 variações publicáveis, nenhum produto simples publicável e 354 itens não publicáveis. Nenhuma exclusão foi necessária. A leitura de confirmação das atualizações só roda em lotes inconclusivos e consulta grupos de até 20 SKUs, sem adicionar leituras ao Supabase.

O bundle `erp/server/secure-api/secure-integrations.cjs` foi reconstruído junto ao fonte. A validação local passou em 13 testes Vitest focados no polling prolongado, no readback por SKU e no ciclo de reconciliação. Nenhuma migration foi necessária para esta correção.
