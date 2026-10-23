# Registro da prova mínima de persistência de comentário — Central

**Status:** prova remota autorizada e concluída; publicação condicional executada com sucesso em 23/10/2026.

## Execução

- Projeto operacional Supabase `hkoxhourxwlddgsfdgws`, schema `public`.
- `runId`: `e9e22a13-f509-41c9-80c5-ecd21a0349c6`.
- `scenarioKey`: `support-comment-persistence`.
- Operador esperado: `13eab361-be48-4e49-be4b-4ad79813b812`, confirmado pelo login em memória via Vercel Development, `is_administrator()`, `customer_support_can_view()` e endpoint local de operador HTTP 204 antes de qualquer gravação.
- O RPC criou exatamente **1 conversa sintética** e uma âncora interna: contato `Teste comentário e9e22a13`, texto `Âncora sintética e9e22a13`. O guard remoto vinculou o registro ao operador, ao runId e ao canal `test-artifact:<runId>`.
- A sessão autenticada confirmou ownership, RLS, ausência de cliente/pedido/mídia e `internal_notes IS NULL` antes da prova.
- `customer_support_add_internal_note()` foi chamada exatamente uma vez com `Comentário sintético de persistência e9e22a13`. A mesma sessão leu uma nova mensagem `internal_note`; `internal_notes` permaneceu `NULL`.
- A conversa foi arquivada pelo comando normal da Central. O evento de fechamento e o histórico ficaram retidos.
- Resultado final: **1 conversa e 3 mensagens/eventos** — uma âncora, um comentário e um evento de arquivamento; manifesto em `scratch/central-comment-persistence-result-2026-10-23.json`, fase `cleanup-complete`.

O Vitest remoto passou **1/1** no projeto operacional `hkoxhourxwlddgsfdgws` (schema `public`), pelo Vercel Development. O teste confirmou o endpoint local do operador (HTTP 204), `is_administrator()`, `customer_support_can_view()` e a recusa anônima do manifesto antes de provisionar. Nenhuma guarda foi desabilitada.

Não foram criados clientes, pedidos, produtos, pastas ou mídia; não houve efeitos fiscais, financeiros ou de estoque, chamadas à Meta, envio externo, exclusão do histórico ou alteração de registros operacionais. Credenciais permaneceram em memória.

## Publicação concluída

Após a prova, o worktree revisado `C:\Users\mathe\morantehub-central-history-release-20261023` foi publicado no projeto Vercel `morantehub`, preservando o bloqueio de envio. O worktree correspondeu a 25 caminhos selecionados, base `2ac99bb1715258680b476c616e3fd6b21171c879`, e coincidiu com o manifesto de hashes. Deployment `dpl_7nPegi5o1D8f9xtNCDh2ga6YnEJW`: `READY` em Production, aliases `morantehub.vercel.app` e `morantehub.com`. As rotas `/` e `/atendimento` responderam HTTP 200. Não houve migration adicional nem dados de teste na publicação.

O proprietário autorizou a prova e a publicação condicional em 23/10/2026. Persistência, isolamento e limpeza foram comprovados antes da publicação. A checagem pós-publicação encontrou uma chamada ao webhook com HTTP 401; não foi enviado webhook válido pela Meta e a correspondência do valor de `WHATSAPP_APP_SECRET` ao aplicativo Meta permanece sem prova. A empresa mantém o envio bloqueado.
