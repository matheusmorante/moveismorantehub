# Registro da prova mínima de persistência de comentário — Central

**Status:** prova remota autorizada e concluída com sucesso em 23/10/2026; publicação condicional autorizada e em andamento.

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

## Publicação condicional

Com a prova aprovada, publicar o worktree revisado `C:\Users\mathe\morantehub-central-history-release-20261023` no projeto Vercel `morantehub`, preservando o bloqueio de envio. O worktree corresponde a 25 caminhos selecionados, base `2ac99bb1715258680b476c616e3fd6b21171c879`, e coincide com o manifesto de hashes. O build completo e 269 testes Vitest já passaram; a publicação não inclui migration adicional nem dados de teste.

O proprietário autorizou a prova e a publicação condicional em 23/10/2026. A publicação prossegue agora que a persistência, o isolamento e a limpeza foram comprovados.
