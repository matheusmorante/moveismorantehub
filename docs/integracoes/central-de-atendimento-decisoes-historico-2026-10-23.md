# Decisões pendentes de histórico e comentários — Central de Atendimento

**Data:** 23/10/2026  
**Status:** decisões aprovadas pelo proprietário; implementação local concluída; migration remota aplicada; prova remota de persistência concluída. Publicação do candidato autorizada condicionalmente e em andamento.

## Decisões do proprietário

O proprietário escolheu resolver a mensagem citada sob o RLS da conversa e permitir o salto à origem; paginar atividades e anexos por cursores próprios, com busca literal validada na galeria; e manter comentários cronológicos separados do resumo interno editável. A migration remota e a publicação foram autorizadas separadamente, com a publicação condicionada ao sucesso da prova remota.

## Estado observado no MoranteHub

- Mensagem com `replyToWamid` exibe o placeholder genérico “Referência à mensagem anterior”; `MessageBubble` não recebe o conjunto de mensagens nem resolve o WAMID.
- A conversa carrega primeiro 80 mensagens e busca 50 anteriores ao chegar ao topo. A timeline de eventos e a galeria filtram esse mesmo conjunto carregado, sem afirmar cobertura integral.
- `customer_support_add_internal_note()` persiste um comentário como mensagem interna **e** copia seu texto para `whatsapp_conversations.internal_notes`. O formulário separado de notas também atualiza `internal_notes` com comparação otimista. O resultado observado é que um comentário recente pode substituir o resumo editável; não há decisão registrada esclarecendo se isso é intencional.

## 1. Contexto da mensagem citada

| Alternativa | Comportamento | Efeito técnico |
| --- | --- | --- |
| A — Prévia local | Mostrar autor e trecho apenas quando a mensagem original já estiver carregada; ao clicar, rolar até ela. Manter fallback quando estiver fora do recorte. | Reutiliza dados já lidos; menor mudança e sem consulta extra. |
| B — Resolver sob demanda | Buscar a mensagem referenciada pela chave externa com RLS; mostrar prévia e tentar abrir o contexto mesmo fora das páginas carregadas. | Acrescenta leitura e estado de carregamento/indisponibilidade; requer validar qual identificador é confiável em cada tipo de mensagem. |
| C — Manter placeholder | Preservar o texto genérico e não mostrar conteúdo citado. | Nenhuma mudança. |

Referências oficiais: [Chatwoot — responder a uma mensagem específica](https://app.chatwoot.com/hc/user-guide/articles/1785465742-comment-repondre-a-un-message-specifique) mostra o contexto citado e permite saltar à mensagem original; [respond.io — ações de mensagem](https://respond.io/help/inbox/managing-conversations-in-inbox) documenta resposta contextual para mensagens recebidas/enviadas nos canais suportados.

## 2. Cobertura da timeline e galeria

| Alternativa | Comportamento | Efeito técnico |
| --- | --- | --- |
| A — Recorte explícito | Continuar usando mensagens carregadas, mas identificar “histórico carregado” e oferecer continuar a rolagem antes de chamar a timeline/galeria completa. | Mantém consultas atuais; informa o limite aos atendentes. |
| B — Atividade e anexos paginados | Buscar eventos/comentários e anexos por conversa com cursores próprios; anexos têm paginação/busca e ação para localizar a mensagem de origem. | Cobertura integral sob demanda, com novas consultas e tratamento de retenção/ordenação. |
| C — Histórico unificado | Timeline, comentários e mídias compartilham uma navegação paginada e filtros de período/tipo. | Experiência consistente, mas maior mudança de interface e superfície de consulta. |

Referência oficial: [respond.io — Inbox](https://respond.io/help/inbox/getting-started-with-inbox) separa Activities (comentários e eventos, também em ordem cronológica na conversa) e Attachments (arquivos da conversa com busca e salto à mensagem de origem). A referência demonstra uma alternativa de organização, não define a regra do MoranteHub.

## 3. Relação entre comentário e resumo interno

| Alternativa | Comportamento | Efeito técnico |
| --- | --- | --- |
| A — Separar conceitos | Comentários são itens cronológicos; `internal_notes` segue como resumo persistente e editável. Adicionar comentário não altera o resumo. | Remove a atualização cruzada na RPC; preserva o resumo atual e o histórico de comentários. |
| B — Manter o espelhamento | O comentário mais recente continua substituindo `internal_notes`; renomear/explicar o campo para deixar claro que representa a nota mais recente. | Menor mudança, mas comentário e resumo permanecem acoplados. |
| C — Unificar | Retirar o campo editável e usar comentários como única forma de notas. | Exige decidir destino e migração dos resumos já persistidos e rever a interface. |

Referências oficiais: [Chatwoot — notas privadas](https://app.chatwoot.com/hc/user-guide/articles/1677235281-lesson-3-a-mastering-core-features) trata nota como mensagem interna na conversa; [respond.io — colaboração](https://respond.io/help/inbox/collaborating-with-your-team-in-inbox) trata comentários e eventos internos; [respond.io — encerrar conversa](https://respond.io/help/inbox/assigning-and-closing-a-conversation) documenta closing note como resumo separado. Nenhum desses padrões escolhe a semântica do campo MoranteHub.

## Implementação local

- `MessageBubble` mostra autor e prévia quando a origem está carregada. Se não estiver, consulta `whatsapp_messages` pelo ID local ou WAMID, sempre filtrando pela mesma conversa; o RLS continua aplicado. O botão leva à mensagem original e a insere na janela do chat quando ela ainda não estava carregada.
- `ActivityTimelineDrawer` carrega páginas próprias contendo somente comentários e eventos persistidos; novos IDs de comentários/eventos recebidos pelo chat atualizam a primeira página sem inserir conteúdo localmente. A galeria busca anexos com `media_id`, pagina sem depender das mensagens do chat e oferece busca textual literal validada por `react-hook-form`/`zodResolver`, além do salto à conversa.
- `customer_support_add_internal_note()` foi alterada para registrar comentários no histórico sem atualizar `whatsapp_conversations.internal_notes`. A migration `20261023134535_customer_support_history_context_and_separated_comments.sql` substitui apenas a função; foi aplicada ao Supabase remoto na versão `20261023145037` e conferida no catálogo. Não altera linhas, tabela, política ou grants.

## Validação deste lote

- Vitest/RTL da Central: **269 aprovados, 6 ignorados**. Os seis casos remotos foram ignorados conforme a política de banco; nenhum mock foi contado como prova PostgreSQL.
- Playwright visível na porta **5173**: **1/1 aprovado em 26,8s**, com a suíte somente de leitura. Foram exercitados falha/repetição da leitura de pastas e atendentes, filtro por atendente e validação de pasta sem gravação.
- Build completo do ERP: **aprovado em 3m43s**. Permanecem avisos do Rollup sobre comentários em dependências e tamanho/partição de chunks.
- ESLint focado: **0 erros e 2 avisos** de Fast Refresh em `ChatArea.tsx` e `ChatMessageTimeline.tsx`.
- Na revisão do cursor, os timestamps passaram a ser citados nos filtros `or` do PostgREST, cobrindo a pontuação reservada do timestamp ISO tanto no histórico de mensagens quanto em atividades/anexos. A regressão cobre timestamp com fração de segundo e offset; confira também [a gramática oficial de valores reservados do PostgREST](https://docs.postgrest.org/en/stable/references/api/url_grammar.html#reserved-characters).

O mesmo lote foi compilado no worktree candidato `C:\Users\mathe\morantehub-central-history-release-20261023`, baseado em `2ac99bb1715258680b476c616e3fd6b21171c879`; o `npm run build` completo terminou com código 0 após a correção do cursor. Após incorporar o relatório remoto e a proposta da nova fixture, o conjunto do candidato contém 25 caminhos selecionados. A instalação `node_modules` foi reutilizada por junction; os fontes e artefatos selecionados são do candidato. Os outputs server gerados pelo build foram restaurados, pois não pertencem a este lote. Manifesto de hashes: `C:\Users\mathe\morantehub-central-history-release-20261023-manifest.json`.

O Playwright deste lote não selecionou conversa operacional nem validou visualmente a galeria, a timeline ou o salto de citação; a política exige ownership e autorização concreta para fixtures remotas graváveis. Os componentes e serviços novos têm cobertura Vitest/RTL, mas o comportamento PostgreSQL da nova função depende da migration e de fixture própria.

## Próximas operações remotas

Após a migration, o catálogo confirmou `SECURITY DEFINER`, `search_path` vazio, timeout de 10 segundos, gate por `auth.uid()` e `customer_support_can_view()`, `anon` sem execução e `authenticated` com execução. A função não atualiza mais `internal_notes`. O registro da aplicação, incluindo os advisors e as contagens remotas, está em [migration remota e próximo gate](central-de-atendimento-migration-remota-2026-10-23.md).

A fixture anterior (`8eaed14f-364d-47ab-be41-66be54b3fb65`) permanece encerrada e preservada. A nova prova autorizada (`e9e22a13-f509-41c9-80c5-ecd21a0349c6`) passou no Supabase remoto: 1 conversa sintética própria, 3 mensagens/eventos no total, comentário persistido, `internal_notes` inalterado, gates aprovados e conversa arquivada com histórico retido. O resultado detalhado está em [registro da prova de comentário](central-de-atendimento-comentario-persistencia-proposta-2026-10-23.md). O candidato `C:\Users\mathe\morantehub-central-history-release-20261023` corresponde ao manifesto de 25 caminhos e está autorizado para publicação; o envio de mensagens permanece bloqueado.
