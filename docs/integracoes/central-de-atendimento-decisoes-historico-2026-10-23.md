# Decisões pendentes de histórico e comentários — Central de Atendimento

**Data:** 23/10/2026  
**Status:** alternativas pesquisadas; nenhuma alteração de produto, código ou banco aplicada.

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

## Próximo passo

Nenhuma alternativa foi implementada por inferência. A implementação deve aguardar a escolha do proprietário para os três comportamentos acima; testes atuais seguem cobrindo somente os contratos existentes.
