# Diff declarativo por objeto — schema de NF-e de saída

> **Rascunho de especificação; não é migration e não é SQL para executar.** Descreve o delta observado em 28/09/2026 e o estado final proposto. Nenhuma alteração remota foi executada.

## Revalidação remota

Projeto conferido novamente: **MoranteHub**, ref `hkoxhourxwlddgsfdgws`, região `sa-east-1`, PostgreSQL 17.6. Consultas `SELECT` aos catálogos confirmaram:

- Ausentes: `nfe_documents`, `nfe_sequences`, `nfe_document_items`, `nfe_return_item_allocations`, `nfe_document_events`, `nfe_operation_drafts`, `nfe_operation_draft_lines` e `nfe_operation_draft_allocations`.
- Ausentes: `reserve_next_nfe_number`, `reserve_nfe_outbound_emission`, `create_return_order_with_capacity`, `create_return_order_with_fiscal_capacity`, `prepare_nfe_operation_draft`, `persist_authorized_nfe_operation_draft`, `save_nfe_operation_draft_review` e `enforce_nfe_draft_authorized_attempt_match`.
- `get_next_nfe_number` também está ausente. Busca ampla no workspace (incluindo strings de RPC e arquivos ocultos, excluídos artefatos de dependências/build) encontrou zero consumidores em código de execução; as ocorrências são definição/migration de hardening, testes e documentação. Busca no catálogo remoto por referências textuais em funções e views também retornou zero, e a função não existe no remoto. Ela fica fora do estado desejado; integrações fora deste repositório não podem ser descartadas por essa evidência.
- Existentes: `orders`, `order_items`, `order_payments`, `inventory_moves` e `create_order_with_inventory_transaction(text,jsonb,jsonb,jsonb,boolean)`.
- A definição integral de `create_order_with_inventory_transaction` foi comparada com `20260926160000`: o corpo remoto e o local coincidem (16.900 caracteres; MD5 normalizado de `prosrc` `04911356b089673f2c0935925e467791`). Assinatura, retorno `jsonb`, `SECURITY DEFINER` e `search_path=public, extensions` também coincidem. Os corpos remotos de `save_order_transaction`, `recalculate_order_document_unit_cost` e `apply_order_document_stock_delta` coincidem com suas últimas definições locais (`20260912160000` e `20260926180000`).
- A ACL da RPC de estoque segue aberta a `PUBLIC`, `anon`, `authenticated` e `service_role`; `save_order_transaction` também concede `EXECUTE` a todos esses papéis. Os helpers de estoque têm `EXECUTE` apenas para `postgres`/`service_role`. Não há mudança de ACL proposta até fechar autorização por papel e compatibilidade dos callers.
- As policies atuais nas quatro tabelas operacionais seguem permissivas com predicados `true`; os grants também incluem papéis públicos/anon. O RLS está ligado, mas as policies deixam acesso amplo.
- Cadastro próprio pode gerar sessão autenticada com perfil `pending`. O ERP usa `profiles.roles` para autorizar a interface, mas o trigger remoto `protect_profile_role` só protege mudanças em `profiles.role`; a policy permite atualizar o próprio perfil e o catálogo confirma privilégio de `UPDATE` em `roles` para `authenticated`. A análise estática indica possibilidade de autoatribuir papéis pela coluna `roles`; não foi executado UPDATE de prova. Portanto, **não usar `authenticated` nem `profiles.roles` como autorização DB até corrigir e validar essa proteção**. A migration local `20260928002920` já amplia o trigger para proteger `roles`, mas essa versão não está no remoto.

As migrations locais são as fontes dos corpos atuais das funções e do desenho dos dados. Os arquivos são referências para extrair e revisar o SQL; **não devem ser aplicados em fila nem registrados artificialmente no histórico remoto**.

## Regra de reconciliação

Para cada objeto, a futura execução deverá seguir este contrato:

1. **Ausente:** criar diretamente no estado final seguro descrito abaixo.
2. **Presente e igual:** não alterar.
3. **Presente com qualquer diferença de tipo, definição, predicado, ACL ou dependência:** abortar e produzir uma comparação específica. `IF NOT EXISTS` não conta como comparação.
4. Não usar `DROP` para substituir tabela/função divergente, não remover evidência fiscal e não inserir linhas artificiais em `supabase_migrations.schema_migrations`.
5. Pré-condições e DDL devem executar numa transação verificada. Se qualquer preflight, grant ou validação falhar, `ROLLBACK`; não prosseguir para o próximo grupo.

## Catálogo do delta

### Tabelas

| Objeto | Remoto observado | Estado final e SQL mínimo proposto | Pré-condições / dependências | Reexecução, falha e validação |
|---|---|---|---|---|
| `public.nfe_documents` | Ausente | Uma tabela com todos os campos-base e de linhagem/idempotência já na criação: `id uuid PK DEFAULT gen_random_uuid()`; `order_id uuid FK orders ON DELETE SET NULL`; `numero_nfe integer NOT NULL`; `serie varchar(4) NOT NULL DEFAULT '1'`; `chave_acesso varchar(44) UNIQUE`; `modelo varchar(2) NOT NULL DEFAULT '55'`; `ambiente integer NOT NULL DEFAULT 2`; `status varchar(30) NOT NULL DEFAULT 'pendente'`; `motivo_status`, `xml_nfe`, `xml_protocolo`, `numero_protocolo varchar(30)`, `danfe_url`, `destinatario_nome`, `destinatario_documento`; `valor_total numeric(12,2) NOT NULL DEFAULT 0`; `document_type text NOT NULL DEFAULT 'outbound'`; `finalidade smallint NOT NULL DEFAULT 1`; `original_document_id uuid FK self ON DELETE RESTRICT`; `related_return_order_id uuid FK orders ON DELETE RESTRICT`; `fiscal_draft jsonb`; `emission_request_id uuid`; `created_at` e `updated_at timestamptz DEFAULT now()`. A DDL futura deve ser um único `CREATE TABLE`, sem criar primeiro a versão permissiva antiga e depois `ALTER`. | `orders(id)` deve existir e a assinatura da FK deve ser comparada. Confirmar se todos os usuários autenticados da instalação podem ler todos os documentos; a policy atual pretendida não é tenant-scoped. | Ausente: criar. Igual: pular. Parcial/divergente: parar. Validar colunas, tipos/defaults, FKs, PK e unicidade da chave. Sem backfill no snapshot. Nunca apagar documentos ou XML após transmissão. |
| `public.nfe_sequences` | Ausente | `id serial PK`, `modelo varchar(2) NOT NULL`, `serie varchar(4) NOT NULL`, `ambiente integer NOT NULL`, `ultimo_numero integer NOT NULL DEFAULT 0`, `updated_at timestamptz DEFAULT now()`, `UNIQUE(modelo,serie,ambiente)`. | Reservas devem ser separadas por modelo, série e ambiente. A sequência inicial depende da configuração fiscal autorizada, não dos pedidos existentes. | Validar a constraint composta e testar chamadas concorrentes. Não reduzir nem apagar contador depois de número reservado/transmitido. |
| `public.nfe_document_items` | Ausente | Itens fiscais com PK UUID, FK `document_id → nfe_documents ON DELETE RESTRICT`, número > 0, código/descrição, quantidade > 0, valores >= 0, XML de produto/tributação e `UNIQUE(document_id,item_number)`. | Criar depois de `nfe_documents`; estrutura de referência: `20260926240000_add_fiscal_lineage_and_return_allocations.sql`. | Sem backfill no snapshot. Reexecução por comparação de colunas/constraints; falha em FK/check aborta o grupo. Preservar itens de documento autorizado. |
| `public.nfe_return_item_allocations` | Ausente | PK UUID; FKs `return_order_id → orders ON DELETE RESTRICT`, `original_document_id → nfe_documents ON DELETE RESTRICT`, `fiscal_return_document_id → nfe_documents ON DELETE RESTRICT`; item/linha positivos conforme migration; `quantity > 0`; unicidade `(return_order_id,return_item_index,original_document_id,original_item_number)`. | Depende de `orders`, `nfe_documents` e `nfe_document_items`; gravação server-side. | Sem backfill no snapshot. Validar unicidade e capacidade antes de habilitar retorno. Falha na operação deve reverter pedido, estoque e alocação na mesma RPC/transação. |
| `public.nfe_document_events` | Ausente | Colunas da migration `20260926230000`: documento, tipo/sequência/tentativa, ambiente, estado, justificativa, XML assinado/resposta, `cstat`, motivo, protocolo/datas, solicitante. `UNIQUE(document_id,event_type,attempt_number)` e índice `(document_id,requested_at DESC)`. | Depende de `nfe_documents`. Os consumidores de `cancel.ts` e `consult.ts` inserem uma tentativa e depois atualizam sua resposta/estado. | Sem backfill no snapshot. Cada retry recebe novo `attempt_number`; preservar XML enviado e respostas anteriores. O comentário local “append-only” não descreve esses updates: ajustar comentário/contrato; não impor trigger append-only incompatível com os consumidores atuais. |
| `public.nfe_operation_drafts` | Ausente | Usar a definição de `20260926260000` com a versão final de índices e retry de `20260926290000`: tipo estorno/retorno, finalidade, documento original, chave original, pedido de retorno, ambiente, status, revisão, XML gerado/assinado/resposta, protocolo/chaves e auditoria de usuários/datas. | Depende de `nfe_documents`, `orders`, `auth.users`; as linhas dependem de itens fiscais e alocações. XML e estado desconhecido são dados fiscais que devem ficar server-side. | Sem backfill. Nunca excluir uma tentativa transmitida/desconhecida para “recomeçar”; manter nova tentativa vinculada ao rascunho/histórico. Validar CHECKs, FKs e índices parciais finais. |
| `public.nfe_operation_draft_lines` | Ausente | Linhas revisadas da migration `20260926260000`, com FKs `draft_id` e `original_document_item_id`, quantidade/valores, CFOP/XML revisados e uniques `(draft_id,original_document_item_id)` e `(draft_id,fiscal_item_number)`. | Depende de rascunhos e itens fiscais. | Sem backfill. Comparar `CHECK`, FKs e uniques; falha aborta. Preservar as linhas que sustentam documento autorizado. |
| `public.nfe_operation_draft_allocations` | Ausente | Chave primária `(draft_line_id,allocation_id)`, FK para linha e FK única para alocação. **Não** restaurar uma `UNIQUE(allocation_id)` global: retries rejeitados podem preservar rascunhos históricos distintos para a mesma alocação. | Depende de linhas de rascunho e alocações de retorno; versão final definida em `20260926290000`. | Sem backfill. Validar que só o rascunho ativo pode consumir a alocação e que `fiscal_return_document_id` continua sendo a trava de consumo. |

### Índices e constraints

| Objeto | Remoto observado | Estado final / SQL mínimo | Pré-condições | Reexecução e validação |
|---|---|---|---|---|
| `uq_nfe_documents_emission_request` | Ausente | `CREATE UNIQUE INDEX ... ON nfe_documents(emission_request_id) WHERE emission_request_id IS NOT NULL`. | Coluna `emission_request_id` presente. | Comparar `pg_get_indexdef`; antes de criar em tabela existente, buscar duplicatas não nulas. Reexecução só pula se definição for idêntica. |
| `uq_nfe_documents_inflight_order_model_environment` | Ausente | Unicidade em `(order_id,modelo,ambiente)` apenas quando `order_id IS NOT NULL`, `document_type='outbound'` e `status IN ('pendente','processando')`. A inclusão de `document_type` alinha o índice ao filtro da RPC e evita colisão com retorno/estorno. | Todas as colunas devem existir antes do índice. | Há divergência local: `2620000` cria o índice sem `document_type`; `26240000`/`26250000` tentam apagar `uq_nfe_documents_active_order_model_environment`, nome diferente. O diff final cria diretamente o predicado correto; se o índice errado existir em nova leitura, parar, comprovar duplicatas e removê-lo/substituí-lo na mesma transação planejada. |
| `uq_nfe_estorno_draft_source`, `uq_nfe_return_draft_source_order` | Ausentes | Índices únicos parciais da versão final: origem/ambiente para estorno e origem/pedido de retorno/ambiente para retorno, ambos com `status <> 'rejected'`. | Tabela de rascunho e colunas presentes; permitir histórico rejeitado. | Comparar definição exata; procurar colisões em estados não rejeitados. Não criar índices da primeira versão e depois removê-los. |
| Índices de leitura | Ausentes | Criar os índices de pedido, status/modelo, documento original, eventos, alocações e status de rascunhos das migrations locais. **Não criar** `idx_nfe_documents_chave_acesso` separado: a constraint `UNIQUE(chave_acesso)` já fornece índice de busca equivalente. | Confirmar os índices já providos por PK/UNIQUE para não duplicar estruturas. | Validar nome, expressão, ordem das colunas e predicado. Índice com mesmo nome e definição diferente bloqueia reexecução. |
| Constraints das tabelas | Ausentes | Criar junto das tabelas exatamente PK/FK/CHECK/UNIQUE descritas nas definições locais. A linhagem local rejeita tipos/finalidades desconhecidos num preflight, mas não cria CHECK permanente para esses campos. | Revisar defaults e consumidores antes de adicionar checks novos (`document_type` e `finalidade`) ao estado desejado. | Sem backfill no snapshot. Se houver linhas quando o plano for reaplicado, validar todas antes de constraint; erro não pode ser contornado com `NOT VALID` sem decisão registrada. |

SQL mínimo dos índices esperados (o índice de tentativa ativa corrige o predicado inconsistente local):

```sql
CREATE INDEX idx_nfe_documents_order_id ON public.nfe_documents(order_id);
CREATE INDEX idx_nfe_documents_status ON public.nfe_documents(status);
CREATE INDEX idx_nfe_documents_modelo ON public.nfe_documents(modelo);
CREATE INDEX idx_nfe_documents_original_document
  ON public.nfe_documents(original_document_id)
  WHERE original_document_id IS NOT NULL;
CREATE UNIQUE INDEX uq_nfe_documents_emission_request
  ON public.nfe_documents(emission_request_id)
  WHERE emission_request_id IS NOT NULL;
CREATE UNIQUE INDEX uq_nfe_documents_inflight_order_model_environment
  ON public.nfe_documents(order_id, modelo, ambiente)
  WHERE order_id IS NOT NULL
    AND document_type = 'outbound'
    AND status IN ('pendente', 'processando');

CREATE INDEX idx_nfe_document_events_document
  ON public.nfe_document_events(document_id, requested_at DESC);
CREATE INDEX idx_nfe_return_allocations_original_line
  ON public.nfe_return_item_allocations(original_document_id, original_item_number);
CREATE INDEX idx_nfe_return_allocations_return_order
  ON public.nfe_return_item_allocations(return_order_id);
CREATE INDEX idx_nfe_operation_drafts_status
  ON public.nfe_operation_drafts(status, created_at);
CREATE UNIQUE INDEX uq_nfe_estorno_draft_source
  ON public.nfe_operation_drafts(original_document_id, environment)
  WHERE operation_kind = 'estorno' AND status <> 'rejected';
CREATE UNIQUE INDEX uq_nfe_return_draft_source_order
  ON public.nfe_operation_drafts(original_document_id, return_order_id, environment)
  WHERE operation_kind = 'return' AND status <> 'rejected';
CREATE UNIQUE INDEX uq_nfe_operation_drafts_access_key
  ON public.nfe_operation_drafts(access_key)
  WHERE access_key IS NOT NULL;
```

### DDL consolidado proposto para as tabelas ausentes

Este bloco torna explícita a forma final das tabelas ao reuni-las sem a janela de policies permissivas. É especificação para revisão: não executar daqui; constraints e colunas continuam sujeitas ao preflight e ao banco representativo.

```sql
CREATE TABLE public.nfe_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  numero_nfe integer NOT NULL,
  serie varchar(4) NOT NULL DEFAULT '1',
  chave_acesso varchar(44) UNIQUE,
  modelo varchar(2) NOT NULL DEFAULT '55',
  ambiente integer NOT NULL DEFAULT 2,
  status varchar(30) NOT NULL DEFAULT 'pendente',
  motivo_status text,
  xml_nfe text,
  xml_protocolo text,
  numero_protocolo varchar(30),
  danfe_url text,
  valor_total numeric(12,2) NOT NULL DEFAULT 0.00,
  destinatario_nome text,
  destinatario_documento text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  document_type text NOT NULL DEFAULT 'outbound',
  finalidade smallint NOT NULL DEFAULT 1,
  original_document_id uuid REFERENCES public.nfe_documents(id) ON DELETE RESTRICT,
  related_return_order_id uuid REFERENCES public.orders(id) ON DELETE RESTRICT,
  fiscal_draft jsonb,
  emission_request_id uuid
);

CREATE TABLE public.nfe_sequences (
  id serial PRIMARY KEY,
  modelo varchar(2) NOT NULL,
  serie varchar(4) NOT NULL,
  ambiente integer NOT NULL,
  ultimo_numero integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (modelo, serie, ambiente)
);

CREATE TABLE public.nfe_document_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.nfe_documents(id) ON DELETE RESTRICT,
  item_number integer NOT NULL CHECK (item_number > 0),
  product_code text NOT NULL,
  description text NOT NULL,
  billed_quantity numeric(14,4) NOT NULL CHECK (billed_quantity > 0),
  unit_value numeric(14,4) NOT NULL CHECK (unit_value >= 0),
  gross_value numeric(14,2) NOT NULL CHECK (gross_value >= 0),
  discount_value numeric(14,2) NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  product_xml text NOT NULL,
  taxes_xml text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, item_number)
);

CREATE TABLE public.nfe_return_item_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  return_item_index integer NOT NULL CHECK (return_item_index >= 0),
  original_document_id uuid NOT NULL REFERENCES public.nfe_documents(id) ON DELETE RESTRICT,
  original_item_number integer NOT NULL CHECK (original_item_number > 0),
  quantity numeric(14,4) NOT NULL CHECK (quantity > 0),
  fiscal_return_document_id uuid REFERENCES public.nfe_documents(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (return_order_id, return_item_index, original_document_id, original_item_number)
);

CREATE TABLE public.nfe_document_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.nfe_documents(id) ON DELETE RESTRICT,
  event_type varchar(6) NOT NULL,
  event_sequence integer NOT NULL DEFAULT 1 CHECK (event_sequence > 0),
  attempt_number integer NOT NULL DEFAULT 1 CHECK (attempt_number > 0),
  environment integer NOT NULL CHECK (environment IN (1, 2)),
  status varchar(24) NOT NULL CHECK (status IN ('transmitting', 'registered', 'rejected', 'unknown')),
  justification text NOT NULL,
  signed_xml text,
  response_xml text,
  cstat varchar(4),
  xmotivo text,
  protocol_number varchar(30),
  protocol_date timestamptz,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  UNIQUE (document_id, event_type, attempt_number)
);
COMMENT ON TABLE public.nfe_document_events IS
  'Tentativas de evento fiscal; resposta e estado são atualizados na mesma tentativa, e retries usam novo attempt_number.';

CREATE TABLE public.nfe_operation_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_kind text NOT NULL CHECK (operation_kind IN ('estorno', 'return')),
  finalidade smallint NOT NULL,
  original_document_id uuid NOT NULL REFERENCES public.nfe_documents(id) ON DELETE RESTRICT,
  original_access_key varchar(44) NOT NULL CHECK (original_access_key ~ '^[0-9]{44}$'),
  return_order_id uuid REFERENCES public.orders(id) ON DELETE RESTRICT,
  environment smallint NOT NULL CHECK (environment IN (1, 2)),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'transmitting', 'authorized', 'rejected', 'unknown')),
  reason text,
  nature_of_operation text,
  recipient_snapshot jsonb,
  review_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_xml text,
  signed_xml text,
  sefaz_response_xml text,
  protocol_number text,
  access_key varchar(44),
  document_id uuid UNIQUE REFERENCES public.nfe_documents(id) ON DELETE RESTRICT,
  created_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  transmitted_at timestamptz,
  authorized_at timestamptz,
  CONSTRAINT nfe_operation_draft_kind_consistent CHECK (
    (operation_kind = 'estorno' AND finalidade = 3 AND return_order_id IS NULL)
    OR (operation_kind = 'return' AND finalidade = 4 AND return_order_id IS NOT NULL)
  )
);

CREATE TABLE public.nfe_operation_draft_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES public.nfe_operation_drafts(id) ON DELETE RESTRICT,
  original_document_item_id uuid NOT NULL REFERENCES public.nfe_document_items(id) ON DELETE RESTRICT,
  fiscal_item_number integer NOT NULL CHECK (fiscal_item_number BETWEEN 1 AND 990),
  quantity numeric(14,4) NOT NULL CHECK (quantity > 0),
  gross_value numeric(14,2) NOT NULL CHECK (gross_value >= 0),
  discount_value numeric(14,2) NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  reviewed_cfop varchar(4) CHECK (reviewed_cfop ~ '^[0-9]{4}$'),
  reviewed_product_xml text,
  reviewed_taxes_xml text,
  reviewed_at timestamptz,
  UNIQUE (draft_id, original_document_item_id),
  UNIQUE (draft_id, fiscal_item_number)
);

CREATE TABLE public.nfe_operation_draft_allocations (
  draft_line_id uuid NOT NULL REFERENCES public.nfe_operation_draft_lines(id) ON DELETE RESTRICT,
  allocation_id uuid NOT NULL REFERENCES public.nfe_return_item_allocations(id) ON DELETE RESTRICT,
  PRIMARY KEY (draft_line_id, allocation_id)
);
```

### Policies e grants das tabelas fiscais

Estado final seguro proposto; a autorização de leitura ainda não está definida:

```sql
-- Documentos e dados fiscais só ficam acessíveis ao backend até a autorização
-- autenticada ser definida a partir de um atributo DB protegido.
ALTER TABLE public.nfe_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.nfe_documents FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.nfe_documents TO service_role;
-- Não criar policy SELECT para authenticated enquanto o predicado seguro
-- e os papéis de negócio não estiverem definidos e validados.

-- Demais tabelas fiscais: sem acesso direto de PUBLIC/anon/authenticated.
ALTER TABLE public.nfe_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfe_document_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfe_return_item_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfe_document_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfe_operation_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfe_operation_draft_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfe_operation_draft_allocations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.nfe_sequences, public.nfe_document_items,
  public.nfe_return_item_allocations, public.nfe_document_events,
  public.nfe_operation_drafts, public.nfe_operation_draft_lines,
  public.nfe_operation_draft_allocations FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.nfe_sequences, public.nfe_document_items,
  public.nfe_return_item_allocations, public.nfe_document_events,
  public.nfe_operation_drafts, public.nfe_operation_draft_lines,
  public.nfe_operation_draft_allocations TO service_role;
```

O bloco é uma especificação, não script pronto. A leitura pela interface exige uma decisão explícita sobre autorização e, se necessária, um predicado baseado em atributo de perfil protegido no banco. `authenticated` inclui cadastros pendentes; o guard de rota do ERP não protege chamadas diretas ao PostgREST. Policies/grants são efetivos por soma permissiva; não basta adicionar uma policy restritiva mantendo outra permissiva.

### RPCs e permissões

Para as RPCs fiscais ausentes, extrair e revisar os corpos finais das migrations indicadas; para as duas RPCs operacionais já existentes, a comparação integral foi concluída. Não gerar stubs nem alterar lógica fiscal nesta etapa.

| RPC | Estado remoto | Definição final e dependências | Grant final proposto | Validação / falha |
|---|---|---|---|---|
| `reserve_next_nfe_number(varchar,varchar,integer,integer) → integer` | Ausente | Corpo de `20260926210000`; depende de `nfe_sequences`, valida modelo/ambiente/série/mínimo. API usa backend; ERP chama a RPC como sessão `authenticated`. | **Indefinido:** não conceder a `authenticated` até existir autorização DB confiável. Manter backend `service_role`, ou adicionar checagem de papel aprovada dentro da RPC e validar o caller do ERP. Revogar `PUBLIC`/`anon`. | Além dos limites, concorrência e retry, provar que perfil pendente e sessão sem papel permitido são negados sem consumir número. Uma falha deve deixar a linha da sequência inalterada pela transação. |
| `reserve_nfe_outbound_emission(uuid,varchar,integer,uuid,varchar,text,integer,varchar) → uuid` | Ausente | Extrair somente o corpo final endurecido de `20260928105700`, que valida chave/XML e serializa por pedido+modelo+ambiente; adaptar precondição à exclusão documentada de `get_next_nfe_number`. Depende de documentos, tipo, ambiente e `emission_request_id`. Não aplicar o arquivo inteiro: ele também contém policy de leitura autenticada com `USING (true)`. | Revogar `PUBLIC, anon, authenticated`; conceder `service_role`. | `to_regprocedure`, `pg_get_functiondef`, `prosecdef`, `search_path=public`, ACL; provar duplicidade, concorrência e escopo por modelo/ambiente. Qualquer erro aborta a reserva. |
| `create_return_order_with_capacity(text,jsonb,jsonb,jsonb) → jsonb` | Ausente | Corpo de `20260926220000`; depende de `create_order_with_inventory_transaction`. A migration local concede também a `anon`. | **Indefinido:** alvo mínimo é revogar `PUBLIC`/`anon`; `authenticated` só após checagem DB de papel autorizado ou mediação pelo backend. | Testar os efeitos obrigatórios na mesma transação e injeção de falha entre pedido/itens/pagamentos/estoque. Perfis pendentes devem ser negados. Qualquer falha reverte tudo. |
| `create_return_order_with_fiscal_capacity(text,jsonb,jsonb,jsonb,jsonb) → jsonb` | Ausente | Corpo de `20260926240000`; depende da RPC de retorno, documentos, itens e alocações fiscais. | **Indefinido:** revogar `PUBLIC`/`anon`; não conceder `authenticated` sem a mesma autorização DB validada. | Testar concorrência na capacidade, duplicidade de alocação, cancelamento, perfil pendente e rollback integral. |
| `prepare_nfe_operation_draft(text,uuid,uuid,smallint,text,uuid) → uuid` | Ausente | Usar versão final de `20260926290000`, não corpo supersedido de `20260926260000`; depende de documentos, itens, alocações e três tabelas de draft. | Revogar `PUBLIC, anon, authenticated`; conceder `service_role`. | Validar idempotência por origem/ambiente, retry após rejeição e nenhuma duplicação de alocação. |
| `save_nfe_operation_draft_review(uuid,jsonb,jsonb,uuid) → uuid` | Ausente | Corpo de `20260926280000`; atualiza rascunho/linhas de forma validada. | Revogar `PUBLIC, anon, authenticated`; conceder `service_role`. | Testar linha faltante, linha repetida e CFOP inválido; nenhuma revisão parcial deve persistir. |
| `persist_authorized_nfe_operation_draft(uuid,uuid,integer,text,varchar,text,text,text,timestamptz,text,text,jsonb) → uuid` | Ausente | Corpo de `20260926270000`; persiste documento/item/alocação/estado autorizado atomicamente. | Revogar `PUBLIC, anon, authenticated`; conceder `service_role`. | Testar repetição idempotente e falha em cada etapa; só aceitar estado autorizado com protocolo/chave/XML coerentes. |
| `enforce_nfe_draft_authorized_attempt_match() RETURNS trigger` + `trg_nfe_draft_authorized_attempt_match` | Ausentes | Corpo/trigger de `20260926290000`; `BEFORE UPDATE` em `nfe_operation_drafts`, impede trocar chave ou XML assinado ao autorizar tentativa. | Função de trigger sem grant de execução de aplicação; `search_path=public`. | Conferir disparo para mudança de estado autorizado e rejeição do update divergente; transaction rollback mantém tentativa anterior. |
| `create_order_with_inventory_transaction(text,jsonb,jsonb,jsonb,boolean) → jsonb` | Existente; corpo e helpers transitivos comparados integralmente com as últimas migrations locais. | Corpo lê pedido existente, toma advisory lock por pedido, chama `save_order_transaction`, reverte movimentos anteriores e grava novos movimentos de estoque; atualiza saldos/custos de `products`/`product_variations`, registra mudanças de status e pode ser chamada recursivamente para componentes. A operação ocorre numa transação PostgreSQL. | **Nenhum delta de ACL fechado.** Atual ACL de `PUBLIC`/`anon`/`authenticated` é risco crítico porque função `SECURITY DEFINER` recebe payloads do caller. Revogar acesso público/anônimo é necessário, mas `authenticated` também inclui usuários pendentes; definir guard DB compatível com os callers antes de fechar o grant. | Testar efeitos completos, falhas intermediárias, retry, concorrência, cancelamento e reversão; revisar triggers de `orders`/`inventory_moves` e provar usuários não autorizados negados. Não substituir o corpo, que já coincide. |
| `save_order_transaction(text,jsonb,jsonb,jsonb,boolean) → jsonb` | Existente; corpo comparado com `20260912160000`; `SECURITY DEFINER`, `search_path=public, extensions`; ACL para `PUBLIC`, `anon`, `authenticated`, `service_role`. | Único caller de runtime encontrado é a RPC atômica acima. Isoladamente, faz upsert de `orders`, substitui `order_items`/`order_payments` e ativa flag transacional que suprime o fallback; não registra movimentos/saldo de estoque. | **Bloqueio crítico:** não deve permanecer exposta diretamente a `PUBLIC`/`anon`/`authenticated`. Definir ACL privada ao owner e/ou `service_role` apenas após confirmar integrações externas; a chamada aninhada pela função de estoque deve ser validada após eventual revogação. | Provar chamada negada aos papéis sem autorização, chamada pelo fluxo atômico preservada e rollback completo. Revisar efeitos/triggers antes de fechar o delta. |
| `get_next_nfe_number(varchar,varchar,integer)` | Ausente | Legado sem consumidor encontrado; não incluir no estado final. Busca no workspace e busca textual em funções/views remotas não acharam referências; função ausente no remoto. A migration de hardening `20260928105700` ainda tem precondição e comandos que exigem essa função, portanto não pode ser aplicada sem adaptação/rebase do conjunto de mudanças. | Nenhum grant; não criar. | Repetir buscas e confirmar integrações externas antes da aplicação. Resultado não prova ausência de clientes fora do repositório. |

## Políticas das dependências operacionais: bloqueio separado

| Objeto existente | Estado remoto | Alvo de segurança | SQL mínimo nesta especificação | Bloqueio / validação |
|---|---|---|---|---|
| Policies/grants de `orders`, `order_items`, `order_payments`, `inventory_moves` | RLS ligado; policies com predicados `true`; grants amplos. Há sessões `authenticated` para usuários `pending`. | Remover acesso `PUBLIC`/`anon`; preservar somente operações e escopo de papel aprovados, com fonte de autorização protegida no banco. | **Nenhum DDL produzido aqui.** O modelo de papéis de negócio não foi fechado e o campo `profiles.roles` pode ser alterado pelo próprio usuário no remoto; não usar esse campo até corrigir o trigger. | Gate obrigatório antes de expor RPCs de devolução. Corrigir e validar a proteção dos papéis, mapear callers/operações e provar `anon`, perfil pending, usuário sem vínculo, usuário autorizado e `service_role`. |
| ACL da RPC de pedido/estoque | `EXECUTE` para `PUBLIC`, `anon`, `authenticated`, `service_role`; `SECURITY DEFINER`. | Sem chamada pública/anônima. Para sessão autenticada, checagem DB de papel aprovado; backend com `service_role`. | Delta final em aberto até escolher e testar uma autorização que não confie em `profiles.roles` ainda vulnerável. | O bloqueio de rota no React é apenas UX. Revalidar execução direta via RPC após guard/revogação. |

Esses itens são dependências presentes e não serão corrigidos implicitamente pela criação das tabelas fiscais. Sem o mapeamento de autorização das quatro tabelas, o diff global permanece **bloqueado para execução**.

## Pré-condições exatas antes de qualquer SQL operacional

1. Repetir a leitura de existência/definição imediatamente antes da execução; comparar todos os objetos, não apenas nomes.
2. A comparação integral da RPC de estoque e dos três helpers transitivos está feita. Fechar a revisão dos triggers e a autorização dos callers; manter a ACL aberta como bloqueio de segurança.
3. Corrigir/validar `protect_profile_role` no remoto para proteger `role` e `roles`; definir fonte confiável e allowlist de papéis antes de criar policies ou grants para authenticated. Confirmar separadamente o acesso de leitura a `nfe_documents`.
4. Corrigir a divergência do índice; adaptar a migration de hardening que ainda exige `get_next_nfe_number`; revisar grants locais de devolução e omitir a função legada do estado desejado.
5. Revisar todas as `SECURITY DEFINER` e seus `search_path`; conferir advisors/RLS e privs por papel.
6. Provar este estado final em banco representativo isolado. Não há Docker neste computador; branch Supabase não foi criado. Sem essa validação, não gerar arquivo de aplicação.

## Verificações pós-aplicação propostas

As consultas abaixo são modelos de validação para uma futura execução autorizada; não foram rodadas como teste de comportamento:

```sql
-- Relações e RLS
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname LIKE 'nfe_%'
ORDER BY c.relname;

-- Definições efetivas de policy
SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename LIKE 'nfe_%'
ORDER BY tablename,policyname;

-- Predicados reais dos índices
SELECT tablename,indexname,indexdef FROM pg_indexes
WHERE schemaname='public' AND tablename LIKE 'nfe_%'
ORDER BY tablename,indexname;

-- Assinaturas/segurança dos RPCs
SELECT p.proname, pg_get_function_identity_arguments(p.oid),
       pg_get_function_result(p.oid), p.prosecdef, p.proconfig, p.proacl
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname LIKE '%nfe%'
ORDER BY p.proname;
```

Além da inspeção declarativa: verificar `has_table_privilege`/`has_function_privilege` para `anon`, `authenticated` e `service_role`; provar negação de escrita fiscal a `anon`; confirmar que o ERP autenticado só consegue ler o que foi aprovado; validar reserva duplicada, concorrência, retry da mesma chave/XML, estados de resposta desconhecida e rollback em falha. Esses testes de banco não equivalem à homologação real SEFAZ.

## Como se comporta se houver falha

- Se qualquer pré-condição apontar objeto divergente, interromper antes do primeiro DDL desse grupo.
- Aplicar DDL futuro numa transação cuja atomicidade tenha sido confirmada no runner escolhido. Erro antes do `COMMIT` implica `ROLLBACK` integral, sem registrar manualmente a migration.
- Se a transação já foi confirmada e uma validação posterior falhar, preservar o schema/dados e corrigir por nova alteração revisada. Não apagar documento, XML, evento ou sequência para simular rollback.
- A emissão real continua bloqueada até o diff ser testado em banco representativo, schema/policies validados, A1 confirmado e P0 homologado com evidência persistida da SEFAZ-PR.

## Resultado

O delta fiscal em si começa com objetos ausentes e pode ser criado no estado final seguro desde o primeiro DDL. Porém, **este diff ainda não é executável**: faltam comparação integral da RPC de estoque, desenho das policies nas dependências operacionais, correção do índice divergente e validação representativa. O próximo passo depois desses gates é transformar esta especificação no plano SQL operacional revisável — ainda separado de uma migration e de qualquer escrita remota.
