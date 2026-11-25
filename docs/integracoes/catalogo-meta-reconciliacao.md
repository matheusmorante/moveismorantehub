# Reconciliação do Catálogo Meta

O ERP é a origem dos dados de publicação. A alteração de produto ou variação no ERP e no app solicita uma reconciliação do produto após salvar. O Catálogo Digital usa o mesmo serviço na finalização da publicação. A ação manual e o agendamento horário executam a comparação completa no servidor. O agendamento está em `erp/vercel.json` e chama o servidor do ERP sem depender de uma sessão aberta.

## Operações no catálogo

- A rotina usa o SKU canônico como `retailer_id`. Produtos e variações elegíveis no ERP são sincronizados como `in stock`, inclusive com saldo zero, negativo ou nulo. O valor fixo `1` substitui saldos zero de sincronizações anteriores na Meta. Itens ocultos ou mesclados e itens comuns inativos saem da publicação na Meta via `items_batch`, com confirmação de ausência pelo SKU.
- O carrinho do Catálogo Digital verifica os preços e a publicação dos itens antes de montar a mensagem do WhatsApp. A quantidade solicitada pelo cliente segue na mensagem independentemente do saldo no ERP.
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

## Disponibilidade independente do saldo em 24/11/2026

A consulta inicial à Graph API encontrou 162 itens gerenciados pelo ERP em cada destino, dos quais 146 estavam com `out of stock` e quantidade zero. Os SKUs `000342-03` e `000311-02` estavam ativos e publicados no ERP, com saldo zero e negativo, respectivamente. A consulta por `retailer_id` confirmou que o Sidney Branco (`000212-04`), oculto no ERP, seguia ausente de ambos os catálogos.

O backend de reconciliação deixou de consultar o saldo para montar a disponibilidade. Os testes Vitest verificam a correção de um SKU previamente esgotado, a ausência de novas escritas após alteração isolada no saldo e a remoção após ocultação. O carrinho do site mantém a conferência de preço e de publicação antes de encaminhar a quantidade solicitada ao WhatsApp.

## Reconciliação dos salvados e confirmação por SKU em 25/11/2026

A comparação entre o ERP operacional e a Graph API encontrou os mesmos 162 SKUs nos dois destinos. Em cada catálogo, 146 estavam sem estoque e com quantidade 0, incluindo três sofás. A Meta registrava o erro `PRODUCT_OUT_OF_STOCK` nesses itens. Das 198 variações publicáveis no ERP, 36 de salvados estavam ausentes em ambos, incluindo sete variações de sofás. O Sidney Branco (`000212-04`), oculto no ERP, continuava ausente nos dois destinos.

A consulta do servidor excluía qualquer produto com `active=false`, e o tratamento das variações também ocultava salvados inativos. A correção preserva a regra de publicação dos salvados mesmo quando a atividade de estoque comum está desativada. Ocultos, rascunhos, mesclados, excluídos e produtos comuns inativos continuam fora conforme as regras do catálogo. Produtos presentes são enviados como `in stock` com quantidade 1, sem ler ou alterar o saldo do ERP. A exclusão usa `items_batch` e confirmação de ausência pelo SKU.

A reconciliação consulta cada SKU alterado na Graph API antes de contabilizar a publicação. A leitura verifica vínculo, visibilidade, disponibilidade e quantidade. Somente SKUs pendentes são reconsultados, em lote, sem requisições adicionais ao Supabase. Rejeições individuais da Meta permanecem registradas. Os cards do ERP e do app identificam as contagens como itens para publicar e mostram o resultado da sincronização separadamente.

A migration `20261125125053` atualizou a função `get_meta_catalog_stats()` no Supabase operacional, preservando a assinatura e permissões. A execução de leitura com a função sob o papel `authenticated` retornou 0 produtos simples, 198 variações aptas e 323 itens fora da publicação. As seis suítes Vitest focadas passaram, com 35 testes simulados. O bundle da API do ERP foi reconstruído.

A versão corrigida foi implantada no ERP de produção na Vercel (`dpl_8in97jft4pkX649wQTY3QnCgqh8C`). A conferência somente leitura do estado desejado no servidor retornou 198 SKUs, nenhum bloqueado, todos com `in stock` e quantidade 1. A execução da rotina de produção entre 10:10:03 e 10:12:58 BRT confirmou 62 criações e 275 atualizações; 51 itens ficaram pendentes na confirmação do lote e nenhuma exclusão foi necessária. A conferência independente logo depois, paginada e por `retailer_id`, encontrou **198 de 198 SKUs em cada destino**, todos publicados, em estoque, com quantidade 1 e sem erros registrados pela Meta. Os 36 SKUs antes ausentes, incluindo sete variações de sofás, estavam nos dois destinos. Nenhum SKU fora da publicação foi encontrado. A consulta pontual confirmou também que o Sidney Branco (`000212-04`) permanecia ausente.
