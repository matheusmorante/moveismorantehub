# Migração remota e gate de prova — Central de Atendimento

**Data:** 23/10/2026  
**Projeto:** Supabase operacional `hkoxhourxwlddgsfdgws`, schema `public`

## Migração

O proprietário autorizou aplicar `20261023134535_customer_support_history_context_and_separated_comments.sql`. O projeto foi confirmado como `ACTIVE_HEALTHY`; a migration remota imediatamente anterior era `20261023130851_remove_bling_and_settings_credentials`.

A aplicação terminou com sucesso. O Supabase registrou a versão `20261023145037`, nome `20261023134535_customer_support_history_context_and_separated_comments`. SHA-256 do SQL local aplicado: `AFD0876A78C88034EB73A243150B4594AA6EB110F8CC061B6C86EF5B375A2090`.

A migration substitui somente `customer_support_add_internal_note(uuid,text)`. A inspeção posterior do catálogo confirmou `SECURITY DEFINER`, `search_path` vazio, timeout de 10 segundos, verificação de `auth.uid()` e `customer_support_can_view()`, sem atualização de `whatsapp_conversations.internal_notes`. Os privilégios permaneceram: `anon` sem execução; `authenticated` e `service_role` com execução. Nenhuma linha foi criada ou alterada pela migration.

## Fixture anterior e decisão de não gravar

A autorização condicionava um comentário sintético ao `runId` `8eaed14f-364d-47ab-be41-66be54b3fb65`, owner `13eab361-be48-4e49-be4b-4ad79813b812` e gates de propriedade/acesso. O manifesto local canônico indica `cleanupCompleted=true`; o harness de reabertura rejeita a reutilização de uma execução encerrada. A leitura remota confirmou cinco conversas arquivadas, nenhuma vinculada a cliente, 38 mensagens/eventos retidos e cinco âncoras. Nenhum comentário foi inserido nesta etapa.

O gate da execução encerrada foi respeitado: nenhuma gravação foi feita nela. Em autorização separada, uma nova fixture foi criada e isolada para provar a persistência do comentário.

## Nova prova autorizada

No run `e9e22a13-f509-41c9-80c5-ecd21a0349c6` (`support-comment-persistence`), o login Vercel Development confirmou o mesmo operador, `is_administrator()`, `customer_support_can_view()` e o endpoint local de operador (HTTP 204). O manifesto remoto confirmou run vazio e owner correto; a prova anônima do manifesto foi recusada.

O RPC criou 1 conversa sintética sem cliente, pedido ou mídia. Uma âncora e um único comentário foram lidos pela mesma sessão RLS; `internal_notes` permaneceu `NULL`. O comando normal arquivou a conversa e preservou o evento, resultando em **3 mensagens/eventos** no total. Vitest remoto: **1/1 aprovado**; manifesto local em `scratch/central-comment-persistence-result-2026-10-23.json`, fase `cleanup-complete`.

## Validação posterior

| Verificação | Resultado |
| --- | --- |
| Histórico remoto | Migration registrada como `20261023145037` |
| Catálogo da função | `internal_notes` não é atualizado; `anon=false`, `authenticated=true`; gate da Central preservado |
| Leitura da fixture encerrada | 5/5 conversas arquivadas; 0 clientes vinculados; 38 mensagens/eventos; 5 âncoras; nenhuma gravação na execução antiga |
| Nova fixture de comentário | 1 conversa própria arquivada; 3 mensagens/eventos; comentário persistiu e `internal_notes` permaneceu `NULL`; cleanup completo |
| Advisory de segurança | Avisos existentes de RPCs `SECURITY DEFINER` executáveis por `authenticated`, incluindo a função de comentário; a função mantém seus gates de identidade e permissão. Não houve mudança de grant |
| Advisory de performance | Avisos existentes sobre índice ausente em `assigned_to` e índice de telefone sem uso; sem relação com esta migration |
| Candidato | 25 arquivos selecionados, 0 divergências de SHA-256, base `2ac99bb1715258680b476c616e3fd6b21171c879` |
| Testes/build do candidato | 269 testes da Central passaram, 6 checks remotos foram ignorados; build Vite completo aprovado; Playwright somente leitura 1/1 na porta 5173 em validação anterior |
| Deployment Vercel | `dpl_7nPegi5o1D8f9xtNCDh2ga6YnEJW`, Production `READY`; aliases `morantehub.vercel.app` e `morantehub.com`; `/` e `/atendimento` HTTP 200 |

O Playwright visível de leitura passou 1/1 na porta 5173, incluindo timeline e galeria comparadas com contagens RLS e cópia de snippet sem nova nota. Vitest da Central: 269 aprovados e 6 ignorados conforme a política remota; build completo aprovado. A prova PostgreSQL/Vitest acima confirmou a persistência após a migration.

## Gate de publicação concluído

O proprietário autorizou a publicação condicional do candidato. A prova passou e a condição foi satisfeita; o deployment acima está `READY` e os aliases de produção foram conferidos. Nenhuma outra migration ou fixture foi criada nesta etapa. O webhook legítimo da Meta permanece sem prova; uma chamada observada retornou 401, sem detalhe de causa na telemetria agregada.
