> **Orientação histórica substituída:** instruções sobre Docker, Supabase Local ou exigência de PostgreSQL isolado neste relatório não são mais operacionais. A validação vigente segue [`SUPABASE_REMOTE_TEST_POLICY.md`](../testing/SUPABASE_REMOTE_TEST_POLICY.md) com o Supabase remoto configurado e fixtures sintéticas; preserve este relatório como registro do estado observado na época. Os critérios de testes fiscais em homologação foram removidos em 2026-10-03 para redefinição.

# Plano de reconciliação por objeto — NF-e de saída

> Auditoria de schema e plano de trabalho. Este documento não altera o roadmap fiscal e não declara emissão homologada ou pronta para produção. Não define testes fiscais em homologação; o roteiro anterior foi removido em 2026-10-03 para redefinição.

## Escopo e evidência

- Snapshot inicial consultado em 28/09/2026 às 11:57 BRT (14:57 UTC), somente leitura, no projeto Supabase **MoranteHub**, ref `hkoxhourxwlddgsfdgws` (`sa-east-1`, PostgreSQL 17.6), antes da migration de proteção de papéis.
- Foram consultados catálogos do PostgreSQL para relações, colunas, índices, constraints, funções, triggers, policies e grants. Nenhum DDL, INSERT, teste fiscal ou registro de migration foi executado.
- Os nomes e definições esperados abaixo vêm das migrations locais de NF-e e de seus consumidores. A existência de um objeto remoto com o mesmo nome não prova equivalência semântica.
- A divergência de histórico registrada anteriormente — 112 migrations locais sem mesmo nome remoto e 31 com mesmo nome em outra versão — descreve o histórico, não a ausência comprovada de cada efeito SQL. Não usar esses números como fila de aplicação.

## Resultado do snapshot remoto

### Objetos fiscais

Não existem no schema `public` as tabelas:

`nfe_documents`, `nfe_sequences`, `nfe_document_items`, `nfe_return_item_allocations`, `nfe_document_events`, `nfe_operation_drafts`, `nfe_operation_draft_lines` e `nfe_operation_draft_allocations`.

Como as relações não existem, também não há índices, constraints, triggers, policies ou grants específicos dessas tabelas. A consulta não encontrou tipos fiscais/NF-e. A busca nas migrations locais não encontrou dependência de Storage para NF-e de saída; o XML é persistido no banco e `danfe_url` é apenas uma coluna prevista.

### Dependências operacionais já existentes

Existem `orders`, `order_items`, `order_payments` e `inventory_moves`. As quatro relações têm RLS habilitado, mas isso não as torna restritas: foram encontradas policies permissivas com `USING (true)`/`WITH CHECK (true)` e grants amplos. Em `orders`, há policies públicas de leitura, inserção e atualização; em `order_items` e `order_payments`, há policies de leitura e escrita para `anon`, `authenticated` e `service_role`; em `inventory_moves`, há policy pública de acesso total, além de policies permissivas de leitura/escrita. Uma policy permissiva amplia o acesso efetivo mesmo quando outra policy é restritiva.

O projeto permite cadastro próprio: uma sessão `authenticated` pode pertencer a perfil `pending`; o bloqueio do ERP é uma proteção de interface e não restringe chamadas diretas ao PostgREST. A migration `20260928150615_harden_profile_role_assignments` foi aplicada separadamente ao remoto. A revalidação estrutural confirma `protect_profile_role` ativo em INSERT/UPDATE/DELETE, cobrindo `role` e `roles`; `is_administrator()` considera os dois campos; `search_path` das funções está vazio; e o trigger helper não tem EXECUTE para papéis de aplicação. A contagem de perfis administradores continua em três. A validação funcional permanece pendente: a consulta restrita ao run ID descartável `TEST_AUT_543d92f5-2285-41f3-96cb-2827ca8c1dc7` encontrou zero contas e nenhum teste direto de RLS foi executado. Portanto, a proteção não deve ser marcada como funcionalmente comprovada.

Também existe `public.create_order_with_inventory_transaction(text,jsonb,jsonb,jsonb,boolean) RETURNS jsonb`, `SECURITY DEFINER`, `search_path=public, extensions`. A definição integral remota foi comparada e coincide com `20260926160000` local (16.900 caracteres; corpo `prosrc` MD5 normalizado `04911356b089673f2c0935925e467791`). Assinatura, retorno, `SECURITY DEFINER` e `search_path` coincidem. Os corpos transitivos de `save_order_transaction`, `recalculate_order_document_unit_cost` e `apply_order_document_stock_delta` também coincidem com as versões locais mais recentes. A ACL remota da RPC principal concede `EXECUTE` a `PUBLIC`, `anon`, `authenticated` e `service_role`; `save_order_transaction` também é executável por esses papéis, enquanto os helpers de estoque estão restritos a `postgres`/`service_role`.

A RPC principal toma advisory lock por pedido, lê o pedido existente, pode marcar movimentos antigos como revertidos, chama `save_order_transaction` para persistir pedido/itens/pagamentos, cria movimentos de saída/entrada, recalcula saldo e custo em `products`/`product_variations`, grava histórico de status e pode chamar-se recursivamente para componentes. Triggers nas tabelas operacionais também participam do fluxo. A chamada é uma transação PostgreSQL, mas o payload arbitrário aceito por uma `SECURITY DEFINER` acessível a `PUBLIC`/`anon`/`authenticated` permanece um risco crítico. `save_order_transaction` também está diretamente executável por esses papéis e, se chamado isoladamente, persiste pedido/itens/pagamentos sem passar pela RPC de estoque; a busca no código de runtime encontrou como caller apenas a RPC atômica. Não executar alterações de ACL antes de confirmar integrações externas e definir um guard DB que preserve os callers legítimos; não assumir que conceder a `authenticated` é seguro para perfis `pending`.

As policies e grants abertos das tabelas operacionais e da RPC de estoque são um achado de segurança separado, mas afetam dependências chamadas pela cadeia de devolução. Devem ser auditados antes de expor novos caminhos fiscais. Este plano não os altera nem presume que RLS esteja protegendo esses dados.

## Matriz por objeto

### 1. Persistência de documentos e sequência

| Objeto | Estado remoto | Estado esperado local | Dependências e trabalho | Dados, risco e reversão |
|---|---|---|---|---|
| `public.nfe_documents` | Ausente | Tabela-base da migration `20260903150000`, depois acrescida de `document_type`, `finalidade`, `original_document_id`, `related_return_order_id`, `fiscal_draft` e `emission_request_id`. Campos centrais incluem pedido, número/série/modelo/ambiente, chave, status, XML enviado/protocolado, protocolo e valores/destinatário. | Criar somente após validar `orders(id)` e as definições finais. A FK para `orders` usa `ON DELETE SET NULL`; as FKs de linhagem usam `RESTRICT`. Comparar cada coluna, tipo, default, nulabilidade e FK antes de considerar qualquer objeto existente equivalente. | Sem backfill no snapshot, pois a tabela não existe. Não inferir documentos fiscais a partir de pedidos. Risco alto: XML, chave e dados do destinatário são dados fiscais sensíveis. A política-base local permite leitura/escrita ampla; a versão final deve nascer com grants/policies restritos, sem janela intermediária permissiva. Depois de guardar evidência SEFAZ, rollback deve ser corretivo para frente, nunca `DROP TABLE`. |
| `public.nfe_sequences` | Ausente | Controle único por `(modelo, serie, ambiente)`, com `ultimo_numero`. | Criar junto com a política de escrita restrita e funções de reserva. Exigir `modelo ∈ {55,65}`, ambiente separado e série/número de homologação conforme a configuração aprovada. | Sem backfill no snapshot. Não inicializar sequência de produção com base em `orders.order_index`; definir o ponto inicial somente depois de conferir o controle fiscal autorizado. Não apagar nem reduzir contador após transmissão; corrigir por avanço rastreável. |
| Índices de `nfe_documents` | Ausentes | Índices por pedido, chave, status e modelo; unicidade de `emission_request_id`; proteção parcial para tentativa ativa por pedido/modelo/ambiente; índice da linhagem original. A coluna `chave_acesso` já tem `UNIQUE` na tabela-base; o índice simples adicional da migration parece redundante. | Antes de criar qualquer índice único em uma tabela já existente, fazer preflight de duplicidade usando exatamente o predicado final. Não presumir que `IF NOT EXISTS` valida a definição de um índice com o mesmo nome. | No snapshot não há linhas fiscais nem varredura para esses índices. Risco de bloqueio/aborto sobe se o objeto existir quando a aplicação ocorrer. Não remover índice de idempotência sem parar escritas, provar ausência de colisões e validar concorrência. |
| `public.nfe_document_items` | Ausente | Itens fiscais imutáveis por documento, com quantidade/valores/XML de produto e tributos e unicidade `(document_id,item_number)`. | Depende de `nfe_documents`; é consumida pelas alocações e pelos rascunhos de devolução/estorno. RLS habilitado; escrita somente por `service_role` na definição local. | Sem backfill no snapshot. Depois de usada, não apagar linhas associadas a documento autorizado; preservar a trilha fiscal. |
| `public.nfe_return_item_allocations` | Ausente | Vínculo de item devolvido a documento/linha originais, com quantidade e eventual documento fiscal de retorno. | Depende de `orders`, `nfe_documents` e `nfe_document_items`. Unicidade local por pedido de retorno, índice do item e linha original. RLS e escrita somente por `service_role`. | Sem backfill no snapshot. A aplicação precisa detectar alocações duplicadas/inconsistentes antes de qualquer backfill futuro. Reversões devem preservar origem e não duplicar capacidade devolvida. |

### 2. Eventos fiscais e operações de devolução/estorno

| Objeto | Estado remoto | Estado esperado local | Dependências e trabalho | Dados, risco e reversão |
|---|---|---|---|---|
| `public.nfe_document_events` | Ausente | Tentativa/evento por documento, tipo, sequência e tentativa, com XML assinado/resposta, `cStat`, motivo, protocolo e datas. Unicidade `(document_id,event_type,attempt_number)`. | Depende de `nfe_documents`. RLS habilitado, sem acesso de `PUBLIC`/`anon`/`authenticated`; gravação por `service_role`. `cancel.ts` e `consult.ts` atualizam o mesmo registro após consulta/transmissão; o comentário local “append-only” conflita com esse contrato e precisa ser corrigido ou redesenhado. | Sem backfill no snapshot. Preservar cada tentativa e suas evidências; retry cria novo `attempt_number`. Não impor trigger append-only incompatível com os consumidores atuais. |
| `public.create_return_order_with_capacity(text,jsonb,jsonb,jsonb)` | Ausente | RPC transacional local que chama a função de pedido/estoque. | Depende da função remota existente `create_order_with_inventory_transaction` e dos contratos reais de `orders`, `order_items`, `order_payments` e `inventory_moves`. Primeiro comparar a definição e permissões da dependência; depois testar rollback de falha intermediária. | Sem backfill. Risco alto porque cria/atualiza pedido e efeitos de estoque; operação principal e efeitos devem ocorrer na mesma transação. A função remota atual não deve ser substituída como parte deste plano. |
| `nfe_document_type`/linhagem em `nfe_documents` | Ausente junto com a tabela | Colunas `document_type`, `finalidade`, `original_document_id`, `related_return_order_id` e `fiscal_draft`. | Migration local `20260926240000` depende da tabela-base e também cria itens, alocações e `create_return_order_with_fiscal_capacity`. O preflight local rejeita valores fora de `outbound/return/estorno` e `1/3/4`. | Sem backfill no snapshot. Se a tabela existir em nova leitura, parar e classificar cada linha antes de aplicar defaults: o valor padrão `outbound/1` não prova finalidade real de documentos históricos. |
| `public.create_return_order_with_fiscal_capacity(text,jsonb,jsonb,jsonb,jsonb)` | Ausente | RPC que valida capacidade fiscal das linhas e faz a criação do retorno ligada à função de pedido/estoque. | Depende de `create_return_order_with_capacity`, das alocações e dos itens fiscais. A migration local a define `SECURITY DEFINER`; validar `search_path`, ACL e atomicidade. | Sem backfill. Qualquer falha entre reserva de capacidade, pedido/estoque e alocação deve reverter a transação inteira. As policies permissivas atuais nos objetos operacionais são bloqueio de segurança relacionado. |
| `nfe_operation_drafts`, `nfe_operation_draft_lines`, `nfe_operation_draft_allocations` | Todas ausentes | Rascunhos de estorno/devolução, revisão das linhas e vínculo com alocações. Guardam XML gerado/assinado, resposta SEFAZ, chave e estado de transmissão. | Dependem de `nfe_documents`; linhas dependem de `nfe_document_items`; alocações dependem de `nfe_return_item_allocations`. RLS habilitado e grants somente a `service_role` na definição local. RPCs esperadas: `prepare_nfe_operation_draft`, `save_nfe_operation_draft_review` e `persist_authorized_nfe_operation_draft`. | Sem backfill no snapshot. Risco alto por conter XML e estado de operação fiscal. Não apagar rascunho com tentativa transmitida ou estado desconhecido. Fazer retry com a chave/XML persistidos. |
| `enforce_nfe_draft_authorized_attempt_match()` e trigger | Ausentes | Trigger impede marcar rascunho como autorizado quando chave/XML diferem da tentativa assinada original. | Depende da tabela `nfe_operation_drafts`, criada pela cadeia de rascunhos. Verificar definição do trigger e estados permitidos no pós-aplicação. | Sem backfill. Rollback por correção da função/trigger; não contornar a validação para acomodar uma resposta divergente. |

### 3. RPCs de emissão e numeração

| RPC | Estado remoto | Contrato esperado e dependências | Risco, permissões e validação |
|---|---|---|---|
| `get_next_nfe_number(varchar,varchar,integer)` | Ausente | Busca ampla no workspace encontrou zero consumidores em runtime; ocorrências são migrations, testes e documentação. Busca textual nas definições remotas de funções/views também retornou zero. | Não incluir no estado desejado. A migration `20260928105700` ainda exige e altera essa função como precondição; adaptar/rebasear a mudança endurecida antes de produzir SQL operacional. A evidência não cobre clientes externos ao repositório. |
| `reserve_next_nfe_number(varchar,varchar,integer,integer)` | Ausente | Reserva atômica respeitando mínimo, depende de `nfe_sequences`. A API chama por backend; o ERP também chama via sessão `authenticated`. | A migration local concede `authenticated` e `service_role`; a ACL final não está fechada. Sessões autenticadas incluem perfis `pending`, e o guard de rota do ERP não vale para RPC direta. Só conceder a `authenticated` depois de checagem DB de papel confiável ou mover o caller para o backend; testar que perfil pendente não consome sequência. |
| `reserve_nfe_outbound_emission(uuid,varchar,integer,uuid,varchar,text,integer,varchar) RETURNS uuid` | Ausente | Versão final local valida modelo/ambiente/chave/XML/número/série, serializa por pedido+modelo+ambiente, filtra documento ativo por modelo/ambiente e registra tentativa com idempotência. Depende de `nfe_documents`, `document_type`, `finalidade` e `emission_request_id`. | Usar apenas a definição final endurecida, não a versão inicial `20260928000000`. A final fixa `search_path=public`, revoga execução a `PUBLIC`/`anon`/`authenticated` e concede a `service_role`. Validar duas tentativas concorrentes, retry e identidade do XML. |

## Divergências da cadeia local que impedem congelar o SQL de aplicação

1. **Índice de tentativa ativa com nome divergente.** `20260926200000` cria `uq_nfe_documents_inflight_order_model_environment`, mas `20260926240000` e `20260926250000` tentam remover `uq_nfe_documents_active_order_model_environment`. Esses `DROP INDEX IF EXISTS` não removem o índice criado pela cadeia. Definir a semântica final desejada para múltiplas notas por pedido e corrigir o alvo pelo objeto real; não mascarar o problema com histórico de migration.
2. **Policies fiscais locais não são alvo seguro sem ajuste.** `20260903150000` cria leitura para anônimo/autenticado e escrita `FOR ALL USING (true)` em documentos e sequências; `20260928105700` remove as policies conhecidas, mas recria `nfe_documents_authenticated_read` com `USING (true)`. Como perfis `pending` também têm sessão `authenticated`, esse `SELECT` não pode ir para o estado final. A definição reconciliada mantém leitura fechada até existir predicado DB confiável. `CREATE TABLE IF NOT EXISTS` sozinho não compara nem corrige policy, coluna ou grant existente.
3. **Dependência de pedido/estoque comparada; ACL e autorização ainda bloqueiam.** O `pg_get_functiondef` integral de `create_order_with_inventory_transaction` coincide com `20260926160000`; também foram comparados os corpos de `save_order_transaction`, `recalculate_order_document_unit_cost` e `apply_order_document_stock_delta`. Revisar os triggers e efeitos já identificados. Não sobrescrever a RPC para “alinhar” versões. A ACL aberta segue sendo risco crítico.
4. **Papéis autenticados ainda aguardam prova funcional e allowlist.** A migration remota protege estruturalmente `profiles.role` e `profiles.roles`, mas as tentativas diretas de seller, manager e administrator ainda não foram validadas. Fechar esse teste e definir a allowlist real de papéis antes de usar `authenticated` ou `profiles.roles` como controle fiscal/operacional.
5. **Proteção por índice não substitui a idempotência da RPC.** Validar que a definição final usa o mesmo escopo em lock, consulta de tentativa ativa e índice; incluir `document_type`, modelo e ambiente conforme a regra de negócio. Conferir o tratamento de `emission_request_id` repetido e a resposta `ALREADY_ACTIVE`.

## Grafo de dependências

```text
orders / order_items / order_payments / inventory_moves
  └─ create_order_with_inventory_transaction (corpo comparado; ACL/autorização por resolver)
       └─ create_return_order_with_capacity
            └─ linhagem fiscal + nfe_document_items + nfe_return_item_allocations
                 └─ create_return_order_with_fiscal_capacity

nfe_documents + nfe_sequences
  ├─ índices anti-duplicidade + reserve_next_nfe_number
  ├─ nfe_document_events
  ├─ emission_request_id + reserva atômica de emissão
  └─ itens/linhagem + alocações
       └─ nfe_operation_drafts + lines + allocations
            ├─ prepare_nfe_operation_draft
            ├─ save_nfe_operation_draft_review
            ├─ persist_authorized_nfe_operation_draft
            └─ trigger de correspondência chave/XML da tentativa autorizada
```

O grafo é lógico, não é uma ordem de `db push`. As dependências devem ser confirmadas pelos corpos integrais das funções e pelas colunas efetivamente usadas. As migrations de eventos e índices podem ser independentes depois da tabela-base; a cadeia de devolução não é isolada do fluxo de estoque.

## Plano de reconciliação e aplicação

### Antes de gerar SQL operacional

1. Repetir o snapshot imediatamente antes da mudança. Se qualquer objeto fiscal tiver aparecido, interromper e classificar definição, dados, policies, índices e dependências em vez de aplicar `IF NOT EXISTS`.
2. A comparação integral da RPC e dos helpers transitivos está concluída. Revisar os triggers e os efeitos; fechar um guard de autorização para callers e retirar execução pública/anônima sem bloquear operações ERP legítimas. A simples concessão a `authenticated` não é segura para perfis `pending`.
3. O trigger remoto para `profiles.role` e `profiles.roles` já foi corrigido estruturalmente pela migration `20260928150615_harden_profile_role_assignments`; completar a validação funcional com contas descartáveis. Definir fonte confiável/allowlist de papéis antes de criar policies operacionais ou conceder RPCs a `authenticated`; não usar apenas o guard de rota do ERP. Manter a leitura fiscal autenticada fechada até essa decisão.
4. Corrigir a divergência do índice e adaptar a migration de hardening que exige `get_next_nfe_number`; gerar um plano SQL por **estado desejado de cada objeto**: pré-condições, DDL exato, privilégios, validações e recuperação. Não aplicar toda a fila local e não inserir versões artificiais em `supabase_migrations.schema_migrations`.
5. Testar o plano contra banco representativo isolado, incluindo estado parcialmente existente, reexecução, falha no meio, rollback transacional, duplicidade, concorrência e grants por papel. Neste computador não há Docker conforme informado; não considerar isso testado. Criar branch Supabase exige confirmação de custo, portanto ainda não foi criada.
6. Rodar `npm run advisors` e revisar alertas/RLS antes de qualquer DDL remoto, conforme `AGENTS.md`. Preparar backup e janela autorizada de aplicação; esse passo ainda não foi autorizado nem executado.

### Aplicação remota, se vier a ser autorizada

- Confirmar novamente ref `hkoxhourxwlddgsfdgws`, janela autorizada e escopo exato.
- Aplicar apenas as mudanças do plano por objeto já comparado e testado; sem `db push` cego. Manter fora do escopo mudanças em pedidos/estoque não necessárias ao schema fiscal.
- Se a operação falhar, parar no primeiro erro e preservar o estado para reconciliação. Não marcar migration como concluída manualmente para ultrapassar falha.

### Validação pós-aplicação

- Conferir para cada tabela: colunas/tipos/defaults/nulabilidade; PK/FK/CHECK/UNIQUE; índices e predicados; RLS habilitado; policies efetivas; grants por papel; triggers e funções chamados.
- Conferir assinaturas exatas, `SECURITY DEFINER`, `search_path` e ACL das RPCs; negar chamadas fiscais a `anon` e a papéis não previstos.
- Fazer consulta de consistência dos contadores por modelo/série/ambiente e provar que nenhuma série de homologação cruza produção.
- Em banco representativo, comprovar que qualquer falha em etapa essencial reverte documento, número/estado e efeitos de pedido/estoque; repetir operação e concorrência para provar idempotência.

## Decisão do snapshot

**O diff declarativo por objeto está registrado em `diff-declarativo-schema-nfe.md`, mas ainda não é executável.** O corpo da RPC de estoque e seus helpers foi comparado; continuam bloqueando o SQL operacional as policies/grants amplos, a exposição direta de `save_order_transaction`, a validação funcional ainda pendente da proteção de `profiles.role`/`profiles.roles`, a allowlist de papéis indefinida, a divergência do índice, a precondição legada e a validação em banco representativo. As oito tabelas fiscais permanecem ausentes no remoto, P0 segue bloqueado e nenhuma versão de migration deve ser marcada artificialmente como aplicada.
