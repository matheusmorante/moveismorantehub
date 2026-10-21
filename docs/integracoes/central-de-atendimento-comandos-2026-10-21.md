# Comandos internos da Central — 21/10/2026

> Acompanhar o gate de implantação e a situação da restrição final no [registro atual da publicação](central-de-atendimento-publicacao-2026-10-21.md). Os checkpoints abaixo preservam a ordem expansão → frontend compatível → contração.

## Operação autorizada e compatibilidade

Continuidade autorizada pelo proprietário até conclusão ou dependência real. Projeto operacional confirmado pelo conector e configuração ERP: `hkoxhourxwlddgsfdgws`. Escopo da próxima migration: criar cinco RPCs, conceder execução a `authenticated`, negar `anon`/`PUBLIC`, sem editar registros existentes, tocar outras áreas ou chamar a Meta.

A prévia remota confirmou que as cinco RPCs ainda não existem, o helper privado de permissão está instalado e os comandos antigos usam UPDATE de seis colunas de conversas e INSERT de mensagens. Retirar esses privilégios imediatamente quebraria clientes publicados que ainda usam o contrato anterior. A implantação será em duas etapas:

1. **Expandir:** instalar as RPCs compatíveis. O frontend em desenvolvimento passa a usá-las. Recebimento, mídia e `service_role` permanecem com seus contratos.
2. **Restringir após deploy:** somente depois de publicar o frontend correspondente e validar fixtures autenticadas, aplicar como nova migration o SQL preparado em [sql/customer-support-internal-commands-contract.sql](sql/customer-support-internal-commands-contract.sql). Esse passo revoga INSERT de mensagens e UPDATE direto de atribuição/status/notas/tags; mantém UPDATE de não lidas. Ainda não executar.

## Causas e correções

**Atualização posterior:** produção publicada e restrição do contrato legado aplicada como **20261021162004**, com catálogo antes/depois e sete verificações HTTP aprovadas. [Registro da contração](central-de-atendimento-restricao-legada-2026-10-21.md). As pendências descritas nos checkpoints históricos abaixo se referem às datas dessas provas; a etapa seguinte é o lote de reabertura.

- Atribuição/status antes eram UPDATE e INSERT separados. Um evento recusado deixava a conversa alterada. RPCs bloqueiam a linha, validam o responsável, derivam autor/hora no servidor e gravam alteração/evento na mesma chamada transacional. Repetir o estado já persistido não insere outro evento.
- Comentários aceitavam autor e horário do navegador. A RPC recebe somente conversa/texto, deriva o perfil autenticado e mantém o resumo legado `internal_notes` na mesma transação. Não há envio externo.
- Salvar tags enviava também notas antigas, e mudar status enviava um snapshot antigo de tags. RPCs de marcador alteram somente um marcador sobre o estado atual bloqueado. `status:*` é reservado às ações de status. Notas têm comparação do texto-base para rejeitar sobrescrita concorrente.
- Formulários reutilizam schemas Zod de domínio. Notas em edição não são substituídas por atualização remota; a base da edição é preservada para detectar conflito.

## Objetos, efeitos e reversão

Funções públicas: `customer_support_assign_conversation(uuid,uuid)`, `customer_support_set_conversation_status(uuid,text)`, `customer_support_add_internal_note(uuid,text)`, `customer_support_set_internal_notes(uuid,text,text)` e `customer_support_update_tag(uuid,text,boolean)`. Todas verificam `auth.uid()` e `customer_support_can_view()`, usam `SECURITY DEFINER` com `search_path=''` e prazo de 10s. Nenhum novo schema, tabela, trigger, cliente, pedido ou fixture.

DDL transacional, `lock_timeout=5s`, limite total de 30s e timeout ocioso de 60s. Em falha pré-commit, a transação reverte; em resposta incerta, consultar histórico antes de repetir. Após commit, conservar funções/eventos. Corrigir por migration adicional, sem apagar dados ou reabrir `anon`. A fase de expansão permite reverter o frontend ao contrato anterior até a etapa de restrição. Depois da restrição, não reintroduzir autoria/eventos livres como rollback.

## Provas e limites

Prévia de metadata não é teste comportamental. Vitest com mocks prova o contrato de transporte, resolver e descarte de respostas antigas; testes estáticos do SQL não comprovam transação, concorrência ou RLS autenticada. As provas reais desses comportamentos exigem operador autenticado e fixtures com ownership/gates comprovados, conforme [política remota](../testing/SUPABASE_REMOTE_TEST_POLICY.md). Nenhuma conversa operacional será usada como fixture. Deploy e restrição final ainda dependem dessa etapa.

## Execução e evidências

- Expansão aplicada com sucesso: versão remota `20261021041610`, nome `customer_support_internal_commands`, arquivo local alinhado. SHA-256 `0FBD5F2345D5CC9CE03ECAD4D24F087A1BC3DD26897A9AAF0C50A160864ED14F`.
- Catálogo pós-aplicação: cinco funções `SECURITY DEFINER`, `search_path=''`, prazo de 10s, execução autenticada e sem execução anônima. Nenhum registro existente foi editado pela migration. A etapa de restrição não foi aplicada.
- Vitest/RTL: 126 testes/10 arquivos aprovados, com seis negativas remotas sem fixture. Inclui contratos das RPCs, proteção de mídia, drafts, tags, paginação e cinco provas HTTP do adaptador. Sem prova de atomicidade/concorrência no banco autenticado.
- Playwright real, servidor 5173 e API 3000: 1/1 passou após reinício restrito da API. Login do operador feito pelo agente, Inbox consultada e mídia sem header retornou 401. A lista remota respondeu 200 com 50 linhas; isso não equivale a massa controlada de persistência. Sem criação de pasta, escolha automatizada de conversa operacional ou chamada à Meta para baixar arquivos reais.
- Build Vite aprovado em 1m47s, saída em `scratch/central-inbox-build-2026-10-21`. TypeScript global: 421 diagnósticos e nenhum nos arquivos da Central naquele checkpoint. Lint focado sem erros; avisos de Fast Refresh nos dois arquivos que já exportam helpers.
- `AGENTS.md:9` agora exige login pelo agente, credenciais do Vercel e resolução autônoma de erros, sem solicitar que o proprietário entre manualmente. A porta 5173 permanece obrigatória.

### Adaptador HTTP compartilhado — arquivos e linhas

- `scripts/local-fiscal-dev-server.cjs:20`: resolução do bundle da Central; `:61`: aliases/operation; `:83`: coleta de bytes; `:101`: operação por alias; `:108`: rawBody preservado.
- `scripts/build-customer-support-api.cjs:6`: entrada ERP, bundle Node externo sem embutir variáveis de ambiente; `package.json:12`: build antes de iniciar a API; `.gitignore`: bundle gerado ignorado.
- `erp/src/pages/utils/customerSupport/whatsappWebhookProcessor.ts:74`: Buffer pré-coletado ou stream original; `erp/src/pages/App/CustomerSupport/__tests__/customerSupportLocalApi.test.ts`: cinco provas HTTP.
- `erp/tests/support-readonly.config.ts` e `erp/tests/support-readonly/support-login.spec.ts`: runner com navegador visível, credenciais em memória, gravações de negócio bloqueadas e sem trace/screenshot/storage state de autenticação.

### Continuidade

**Checkpoint mais recente:** [conferência de 21/10](central-de-atendimento-validacao-2026-10-21.md) e [operação de fixtures autorizada](central-de-atendimento-fixtures-proposta-2026-10-21.md). A suíte consolidada passou em 191 testes/19 arquivos. Quatro testes remotos comprovaram ownership, autoria, idempotência de eventos, paginação 50+1, tags concorrentes e conflito otimista com uma edição vencedora. Playwright da própria massa passou em 36,3s: pasta persistida/reaberta/editada/excluída, 81 mensagens, snippet sem nota, comentário, atribuição/status, tags/notas e IDs únicos na timeline. Seis migrations estão aplicadas; busca literal e conflitos de domínio foram corrigidos a partir das falhas reais. Após autorização específica dos 51 eventos, a limpeza passou em 2/2 testes: 51 conversas arquivadas, pasta ausente, 190 mensagens preservadas e manifesto encerrado. Build final aprovado em 1m59s; harnesses TypeScript sem diagnósticos; gate global mantém 424 diagnósticos externos à Central. A primeira navegação acima não conferia a identidade no gate do operador; os novos runners usam a identidade canônica/gate 204 e substituem essa evidência. Deploy e restrição final do contrato legado continuam pendentes.

Concluir o harness de fixtures de Atendimento com ownership e gates comprovados antes de testar gravações remotas. Depois: criação/reabertura/exclusão de pasta compartilhada, status/atribuição e histórico em duas sessões, comentários/autoria, tags/conflitos e mídia da própria fixture. Preparar/publicar somente o recorte da Central, validar a versão publicada e aplicar a restrição final como migration adicional. Não usar fixtures fiscais ou conversas reais como substituto. Não declarar conclusão global da Inbox enquanto esses gates estiverem abertos.
