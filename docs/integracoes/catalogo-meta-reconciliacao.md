# Reconciliação do Catálogo Meta

O ERP é a origem dos dados de publicação. A alteração de produto ou variação no ERP e no app solicita uma reconciliação do produto após salvar. O Catálogo Digital usa o mesmo serviço na finalização da publicação. A ação manual e o agendamento horário executam a comparação completa no servidor. O agendamento está em `erp/vercel.json` e chama o servidor do ERP sem depender de uma sessão aberta.

## Operações no catálogo

- A rotina usa o SKU canônico como `retailer_id` e compara os campos do ERP com os retornados pela Graph API, incluindo preços, disponibilidade, estoque, mídia e rótulos. Mantém a elegibilidade já usada pelo catálogo, inclusive para salvados publicados.
- Um SKU ausente é criado. A divergência em um item gerenciado gera atualização. Um item gerenciado cujo produto ou variação saiu da publicação gera `DELETE` via `items_batch`. Ocultar mantém o cadastro no ERP. Um lote só conta a remoção depois que a consulta à Meta deixa de retornar o SKU.
- `custom_label_4` identifica os itens gerenciados pelo ERP e `custom_number_4` registra a versão dos rótulos de campanha enviados, pois a Graph API não oferece a leitura de `internal_label` no objeto de produto. Um cadastro existente com SKU coincidente e sem origem comprovada gera pendência. Itens de outras origens são preservados.
- A conferência completa corrige o vínculo de um SKU gerenciado que passou para outro produto do ERP. O envio pontual do novo produto registra uma pendência quando o catálogo ainda associa o SKU ao produto de origem.
- Para reconhecer um legado, confirme a origem do item no Commerce Manager ou em um registro de envio da integração, além do catálogo, do `retailer_id`, do ID interno da Meta e do produto do ERP. A tabela de serviço `meta_catalog_verified_items` registra a evidência. Ela começa vazia. Um SKU ou URL de destino coincidente não comprova a origem de um item.
- Os lotes têm até 50 alterações. As falhas são identificadas por catálogo e SKU quando a resposta permite. A rotina registra a pendência e prossegue com os demais lotes. A próxima execução consulta novamente a Meta antes de decidir o que enviar.

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
