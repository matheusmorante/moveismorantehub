# Central — operação proposta para as provas graváveis

## Estado e autorização

**Operação limitada autorizada expressamente pelo proprietário em 21/10/2026, ainda não executada neste checkpoint.** Resposta: “Autorizar essa operação limitada”. Projeto operacional `hkoxhourxwlddgsfdgws`, branch primária e schema `public`. Operador autenticado pelo agente com credenciais oficiais de Vercel Development; gate real retornou 204. Não há solicitação de login manual.

A política [SUPABASE_REMOTE_TEST_POLICY.md](../testing/SUPABASE_REMOTE_TEST_POLICY.md), seções “Escritas, transações e migrations” e “Origem dos artefatos E2E”, exige autorização específica para provisionamento, separada do runner de testes. A autorização anterior das duas migrations funcionais foi executada; ela não foi tratada como aprovação ilimitada para popular o banco.

## Operação limitada a aprovar

- Preparar e revisar as guardas de artefatos da Central usando os JSON já existentes (`whatsapp_messages.raw_payload` e `customer_support_inboxes.criteria`) e vínculos existentes. Não criar tabelas, schemas ou colunas físicas de segregação. Conversas não têm JSON próprio; sua identidade precisa de um vínculo persistido e protegido antes de qualquer prova gravável.
- Após comprovar autorização, ownership, vínculos, exclusões operacionais e supressão de notificações: provisionar **até 51 conversas sintéticas**, **131 mensagens iniciais** e **uma pasta compartilhada**. Uma conversa terá 81 mensagens; as outras 50 terão uma mensagem de identificação cada. Isso permite conferir a página de 50 conversas e o histórico inicial de 80 mensagens com sua continuação.
- Vincular todos os registros ao mesmo `runId` UUID, `scenarioKey` e operador autenticado. Identificadores de canal/contato sintéticos não serão números WhatsApp reais. Nenhuma conversa operacional será usada como fixture.
- Executar pela UI na porta 5173 criação/reabertura/edição/exclusão da pasta, filtro de atendente, rolagem de conversas e mensagens, comentários, tags e comandos de status/atribuição. Limite adicional de **20 comentários/eventos** sobre a própria massa, preservando a trilha persistida.
- Não criar clientes, produtos, pedidos ou usuários; não alterar estoque, reservas, financeiro ou documentos fiscais. Não enviar mensagens, consultar arquivos reais da Meta nem transmitir à SEFAZ. Os cenários comerciais e de acesso por outra identidade ficam pendentes se não houver artefatos/contas previamente autorizados e compatíveis.

## Prévia já conferida e gates restantes

Em 21/10, o catálogo remoto confirmou ausência de triggers nas três tabelas da Central e ausência de funções/views externas à Central referenciando essas tabelas pela busca de definição. A busca de código encontrou consumidores no próprio Atendimento, processador de recebimento e proxy de mídia. Esses levantamentos delimitam o impacto; **não comprovam por si só isolamento comportamental**.

Não há fixture da Central com metadata canônica e ownership verificados disponível para reutilização. Não serão usados nomes, prefixos, variáveis de ambiente ou o gate do operador como substitutos das guardas no banco. A preparação técnica das guardas e sua revisão precedem a execução proposta; a aprovação não autoriza desabilitar qualquer gate caso ele falhe.

## Efeitos, retenção e reversão

### Guardas preparadas para a operação autorizada

Migration aplicada com sucesso: versão remota `20261021113455`, nome `customer_support_test_artifact_guards`, arquivo local `supabase/migrations/20261021113455_customer_support_test_artifact_guards.sql`, SHA-256 `6F29A6F5C34937BD96ACF591CBD22CF6EEDADBB15CEB47565063DFD3C89161DA`. Pós-aplicação confirmou quatro funções definer, helpers sem execução autenticada/anônima, dois comandos somente autenticados, três triggers habilitados e dois índices. Zero fixtures no checkpoint pós-DDL. A instalação é evidência de catálogo, ainda não de comportamento positivo autenticado.

SQL revisável: [customer-support-test-artifact-guards.sql](sql/customer-support-test-artifact-guards.sql). Adiciona quatro funções em `public`, três triggers nas tabelas existentes e dois índices parciais. Sem novas tabelas/colunas/schemas ou alteração de permissões das tabelas. Helpers não têm execução anônima/pública; os dois comandos expostos exigem administrador autenticado com acesso à Central. A identidade vem de `auth.uid()` e do helper canônico `assert_test_artifact_identity`.

O provisionamento recebe uma solicitação validada, limita 51 nomes/81 textos, reutiliza o comando real de comentário para as notas e é transacional/idempotente por execução e hash dos parâmetros. Não cria a pasta: ela será criada pela UI com marcador explícito. Canal/contato sintéticos, ausência de cliente e bloqueio de API/media impedem ligação operacional nessa massa. Identificação/mensagens não podem ser removidas/reclassificadas; pasta mantém metadata ao editar. O limite no banco é 151 mensagens/eventos por execução, cobrindo 131 iniciais e 20 adicionais. Uma pasta por execução/owner.

Prévia remota: zero canais sintéticos, zero mensagens de identificação, zero pastas marcadas e zero conflitos com os quatro nomes de funções; `authenticated` não tem INSERT direto de conversas. Consumidores operacionais continuam com o contrato anterior. Triggers verificam metadata protegida e identidade real; prefixos apenas delimitam a representação e não autorizam operações. As guardas devem receber provas negativas remotas antes do provisionamento positivo e os resultados comportamentais serão registrados depois, sem substituir evidência por flags.

DDL com prazos de 5s para locks, 30s para a transação e 60s ociosa. Em falha pré-commit, reverter a transação; em resposta incerta, consultar o histórico da migration antes de repetir. Depois de aplicada, manter as guardas e corrigir por migration adicional; não remover autoria/ownership como rollback. Antes de criar artefatos, o frontend pode continuar no contrato normal. A mudança não revoga o contrato legado cuja restrição depende de deploy.

As linhas de teste podem aparecer na Inbox, que é o módulo sendo exercitado. Os cinco destinos operacionais e notificações devem permanecer protegidos antes do provisionamento. Os testes não chamarão serviços de envio ou integrações externas.

Excluir somente a pasta própria pelo fluxo normal ao terminar. Arquivar as conversas próprias e preservar mensagens/eventos para auditoria; não aplicar `DELETE` amplo, `TRUNCATE`, reset ou remover trilhas confirmadas. As guardas devem ser compatíveis com registros operacionais existentes e não ampliar acesso anônimo. Migração com falha deve reverter sua transação; resposta incerta exige conferir o histórico antes de repetir.

## Critério de encerramento

### Provisionamento e regressão encontrados pela UI

O runner Vitest separado passou nas negativas de `anon`, arrays vazios/excedidos, texto vazio e pasta com outro owner (sem persistência da tentativa). Confirmou a preparação e replay idempotente de 51 conversas/131 mensagens no runId `73bcaf9a-9b15-4ae1-8583-23c026fd9477`, owner `13eab361-be48-4e49-be4b-4ad79813b812`; mensagens herdam metadata e autoria, sem API/media IDs. Nenhum cliente/pedido/usuário criado.

O Playwright criou a pasta com marcador explícito. A busca pelo fragmento textual do runId retornou 52 conversas em vez de 51: as consultas descartavam as letras e procuravam os três dígitos remanescentes em telefones. Um teste remoto de leitura reproduziu a regressão (`expected 52 to be 51`). Correção preparada em [customer-support-literal-search.sql](sql/customer-support-literal-search.sql): substituir somente as duas funções existentes de listagem e busca de clientes; as três normalizações numéricas só se aplicam a entradas formadas por caracteres de telefone. Assinaturas, filtros anteriores à paginação, ACL e gates comerciais preservados. Sem DML nessa migration, mesmos prazos de lock/transação/ociosidade. Rollback é correção adicional das duas consultas, sem remover guardas ou metadata.

Correção aplicada: versão remota `20261021115020`, nome `customer_support_literal_search`; SHA-256 local `A55C90C32DFBE6C6D827493291BAF02FB95A35742B669C76E4808975C2B37F1B`. O mesmo teste que falhava passou: 50+1 conversas próprias, IDs sem duplicação, “com pedidos” vazio e “sem pedidos” com 51 registros antes de paginar. Os três testes Vitest remotos passaram, incluindo replay sem nova massa. Playwright básico da própria execução passou em 26,2s: pasta persistida/reaberta, 51 conversas em duas páginas e 81 mensagens (80+1). A prova ampliada de comandos e a limpeza continuam em execução.

Registrar IDs, `runId`, owner, resultados de Playwright/Vitest e limites sem credenciais ou dados pessoais. Deploy e revogação final dos privilégios autenticados legados continuam etapas posteriores ao teste gravável da versão correspondente. Esta proposta não declara a Inbox concluída nem certifica persistência, concorrência ou RLS com mocks.

Referência de semântica dos triggers: [PostgreSQL 17 — CREATE TRIGGER](https://www.postgresql.org/docs/17/sql-createtrigger.html). Sete testes Vitest conferem somente o contrato estático e o schema de entrada; não comprovam PostgreSQL autenticado.

### Conflitos de domínio sem retry transitório

A prova concorrente limitada à conversa principal detectou uma edição bem-sucedida e outra que esgotou o prazo de 25s sem devolver o conflito esperado. A RPC de notas usava SQLSTATE `40001` para divergência do texto-base; o provisionamento também o usava para parâmetros diferentes na mesma execução. A [documentação atual do Supabase](https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b) descreve retries indevidos para conflitos de negócio com esse código. Não foi afirmada uma versão específica do PostgREST remoto.

Correção preparada em [customer-support-domain-conflicts.sql](sql/customer-support-domain-conflicts.sql): preservar as duas assinaturas, row locks, comparação otimista, permissões e transações, trocando os dois conflitos customizados por `P0001`. Notas recebem o identificador `CUSTOMER_SUPPORT_NOTES_CONFLICT`; o frontend apresenta o mesmo erro legível e continua reconhecendo `40001` durante compatibilidade. Sem DML na migration. O teste restaura o resumo da própria fixture em `finally`; nenhum histórico é removido. Não reverter ao código transitório como rollback.

Migration aplicada: versão `20261021120432`, nome `customer_support_domain_conflicts`, SHA-256 `5A63A6381DCEF14F75C4FD05487D40FB0BBDC3F753A4A949D8BAA5585A205069`. A prova remota passou em 1,5s: um vencedor, um conflito `P0001`, resumo restaurado, tags concorrentes preservadas, eventos idempotentes, autoria/metadata forjadas rejeitadas e metadata da pasta mantida ao editar. Nenhuma chamada ativa da RPC foi encontrada na conferência pós-DDL; não foi necessário cancelar backends. Quatro testes remotos passaram no conjunto.

### Limpeza — autorização complementar e execução concluída

Playwright ampliado passou em 36,3s: pasta reaberta/editada/excluída; 51 conversas em duas páginas; 81 mensagens anteriores; snippet com feedback sem nota; comentário com autoria real; atribuição, fechamento/reabertura; timeline com IDs únicos; marcador reservado bloqueado; tag criada/removida e draft de notas preservado/salvo. A pasta própria foi excluída pela UI e a prévia remota confirmou zero pastas dessa execução.

O arquivamento normal usa `customer_support_set_conversation_status` e grava um evento persistido por conversa. A prévia autenticada contou **51 conversas a arquivar e 139 mensagens atuais**, resultando em **190 mensagens** depois da limpeza. O teto original de 151 (131 iniciais +20 adicionais) não comporta esses 51 eventos. Não arquivar por UPDATE direto, porque isso suprimiria os eventos do fluxo normal.

Na prévia, [customer-support-cleanup-events.sql](sql/customer-support-cleanup-events.sql) foi preparado para reservar 202 mensagens (131+20+51) e expor o limite no manifesto restrito. `tests/support-fixtures/cleanup.test.ts` confere ownership/âncoras, ausência da pasta e quota instalada antes de usar o serviço normal para fechar somente os IDs próprios. O caso gravável permaneceu ignorado até a confirmação específica de 71 eventos adicionais totais (20 de testes +51 de limpeza). Sem outra conversa, pasta, cliente ou pedido novo. Históricos ficam retidos, com contagem antes/depois e proibição de reabrir o runner após encerramento.

**Autorização complementar recebida em 21/10/2026:** o proprietário respondeu “Autorizar os 51 eventos de limpeza”. Reservar somente os eventos do fechamento normal das mesmas 51 conversas, além dos 20 eventos/comentários de testes já autorizados; sem nova massa. A aplicação da reserva e o runner de arquivamento passam a estar autorizados, mantendo todos os gates anteriores.

**Execução concluída às 09:23 de 21/10/2026:** migration `20261021122238_customer_support_cleanup_events.sql` aplicada no ref `hkoxhourxwlddgsfdgws`, SHA-256 `A353DFF6A967B5ACBD0B61A28D2845F5415725CE85FE2CB118F8D92A7DE0C141`. Substitui somente a guarda existente e a consulta restrita do manifesto; sem DML, novas permissões ou alteração do contrato operacional. A quota instalada foi conferida antes da primeira escrita.

`RUN_SUPPORT_FIXTURE_CLEANUP=1 npm run test:support:cleanup`, com o manifesto próprio explícito, passou em **2/2 testes Vitest (4,55s)**. Confirmou os mesmos 51 IDs/owner/âncoras, ausência de cliente e pasta, arquivou pelo serviço `updateConversationStatus` e verificou **139 → 190 mensagens**, com **51 eventos de fechamento** e todas as conversas arquivadas. O manifesto foi encerrado com `cleanupCompleted: true`; os runners de provisionamento/escrita recusam reutilizar essa execução encerrada. Não apagar as conversas, âncoras ou históricos retidos.

| Teste | Executado | Projeto/ref | Massa/runId | Resultado | Limitação |
| --- | --- | --- | --- | --- | --- |
| Prévia e limpeza pelo comando real | Sim, Vitest 2/2 | `hkoxhourxwlddgsfdgws` | `73bcaf9a-9b15-4ae1-8583-23c026fd9477` | 51 arquivadas; pasta ausente; 190 mensagens retidas | Uma identidade; sem mídia/cliente/pedido ou deploy |
