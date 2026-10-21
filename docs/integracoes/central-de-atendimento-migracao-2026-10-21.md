# Migração da Inbox — 21/10/2026

## Autorização e projeto

O proprietário autorizou nesta conversa a execução da migration da Central após a auditoria. Projeto confirmado no ERP (`erp/.env.local`, somente a URL) e no conector: `hkoxhourxwlddgsfdgws`, MoranteHub, PostgreSQL 17, estado `ACTIVE_HEALTHY`. Nenhum banco/schema paralelo de teste será criado.

## Prévia da operação concreta

- Aplicar a migration revisada `customer_support_inbox_completion` ao projeto operacional, pela ferramenta de migrations remotas.
- Criar `public.customer_support_inboxes`, dois índices, quatro políticas e as RPCs de consulta/permissão/vínculo usadas pela interface existente.
- Criar somente o schema de aplicação `private` e seus dois helpers internos de permissão. A prévia confirmou que esse schema ainda não existe. Nenhuma permissão global de outros schemas será alterada.
- Atualizar as nove políticas existentes das três tabelas WhatsApp da Central com `ALTER POLICY`; não usar `DROP`, reset ou truncamento. Operações legadas não permitidas ficam com política negativa e privilégios revogados.
- Remover acesso `anon`/`PUBLIC` às tabelas e RPCs da Central; exigir autorização equivalente a `viewCustomerSupport`. Informações e filtros de pedidos exigem também `viewCustomerCommercialInfo`.
- Preservar recebimento e gravações com `service_role`. O bloqueio de despacho da Central permanece no frontend/backend.
- Não criar nem editar clientes, pedidos, conversas, mensagens ou fixtures comerciais. Não produzir efeitos de estoque/financeiro, notificações nem chamadas à Meta.

## Compatibilidade e impacto conferidos antes da execução

Prévia remota: as três tabelas WhatsApp e suas nove políticas existem, RLS está habilitada, mas as políticas permitem `anon`. Não existem a tabela de pastas, RPCs `customer_support_*` nem o registro desta migration no histórico. `profiles.roles` já existe; não será necessário acrescentar a coluna. Todas as colunas de pessoas/pedidos referenciadas pelo SQL existem. As tabelas de conversas e mensagens já estão na publicação Realtime. Nenhuma dessas quatro tabelas possui trigger de aplicação na prévia.

O arquivo completo foi lido e comparado aos leitores/escritores atuais. Os clientes autenticados autorizados mantêm leitura e os updates de organização previstos; inserções do navegador em mensagens ficam restritas a comentários/eventos internos. Leituras comerciais usam as RPCs com gate próprio. A compatibilidade não equivale à prova de todos os fluxos autenticados.

## Correções feitas antes de aplicar

1. **Pasta fechada vazia:** o hook envia `p_filter=all` ao selecionar uma pasta. A SQL excluía fechadas no predicado-base e depois exigia fechadas pelo critério da pasta. Agora critérios de pasta controlam o escopo de status; o comportamento padrão sem pasta é preservado. `status=all` na pasta inclui os estados, enquanto a fila padrão continua excluindo fechadas.
2. **Privilégios internos:** revogação específica dos dois helpers, sem revogar permissões de todo o schema `private`.
3. **Políticas preservadas:** substituir remoção/recriação por atualização das políticas existentes e criação idempotente das quatro novas políticas. Checks sem dependência da linha ficam em subconsultas para evitar reavaliar permissões por linha.

## Reversão, retenção e limites

O SQL é transacional, com `lock_timeout=5s`, `statement_timeout=30s` na migration, `idle_in_transaction_session_timeout=60s` e limite de 10s nas RPCs. Em falha antes do commit, a transação deve reverter. Em resposta de rede incerta, conferir histórico/objetos antes de qualquer repetição.

Após commit, manter pastas/dados e os controles de acesso. Não reintroduzir as permissões anônimas antigas como rollback de interface. Se houver incompatibilidade, corrigir o contrato por migration adicional restrita; não excluir tabelas/histórico nem reabrir acesso público. O nome/versionamento definitivo será alinhado ao registro criado pela ferramenta remota.

## Validação e estado

**Aplicada com sucesso.** Histórico remoto: versão `20261021032348`, nome `customer_support_inbox_completion`. Arquivo local renomeado para `supabase/migrations/20261021032348_customer_support_inbox_completion.sql`, alinhando-o ao registro produzido pela ferramenta. SHA-256: `33DC40C820B81CEC6BF7F469227576937247BCA0F0A33CC4FF0E7DA8D8B1A22C`.

Conferência pós-aplicação: quatro tabelas com RLS; `anon` sem SELECT/INSERT/UPDATE, inclusive sem privilégios SELECT de coluna; 11 funções públicas com execução autenticada e sem execução anônima; dois helpers internos sem execução de clientes; 13 políticas somente para `authenticated`. Inserção/update com `service_role` preservados. A definição instalada da listagem contém a correção do escopo de pasta. O índice único normalizado de nomes e o índice por criador existem.

| Teste | Executado | Projeto/ref | Massa/runId | Resultado | Limitação |
|---|---|---|---|---|---|
| Vitest de serviços/componentes/webhook/guarda | Sim | Mocks isolados | Não aplicável | 48 passaram | Não prova banco real. |
| Vitest dos contratos do arquivo de migration | Sim | Arquivo local alinhado | Não aplicável | 3 passaram | Análise estática, sem prova funcional PostgreSQL. |
| Vitest de acesso anônimo às quatro tabelas | Sim | hkoxhourxwlddgsfdgws | Nenhuma fixture; LIMIT 0 | 4 passaram, erro 42501 | Não comprova leitura/escrita autenticada nem RLS por usuário. |
| Vitest de execução anônima das duas RPCs de permissão | Sim | hkoxhourxwlddgsfdgws | Nenhuma fixture | 2 passaram, erro 42501 | Não comprova todas as combinações de funções/papéis. |
| Pastas compartilhadas, filtros/páginas e autoria autenticados | Não | hkoxhourxwlddgsfdgws | Sem fixture com gates/ownership comprovados | Pendente | Nenhuma escrita E2E realizada. |
| Playwright | Não nesta etapa | ERP / porta 5173 | Sem harness autorizado | Pendente | Configuração geral bloqueia o projeto operacional; guarda preservada. |

Comando executado em `erp`, com `RUN_CUSTOMER_SUPPORT_REMOTE_READONLY_TESTS=1`: `npm run test:unit -- src/pages/App/CustomerSupport/__tests__/customerSupport.test.ts src/pages/App/CustomerSupport/__tests__/customerSupportInbox.test.tsx src/pages/App/CustomerSupport/__tests__/customerSupportMigration.test.ts src/pages/utils/__tests__/whatsappDispatchTracking.test.ts`.

**Advisors:** a categoria `authenticated_security_definer_function_executable` inclui as 11 RPCs públicas novas. Esse privilégio é intencional para o contrato da Central: todas verificam autorização da sessão ou delegam ao helper de permissão, usam search_path vazio e não concedem execução a anon. Não trocar indiscriminadamente para invoker nem revogar a API exigida pela UI para apenas ocultar o aviso. A revisão das combinações autenticadas continua pendente. [Explicação do aviso](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). Outros achados globais não foram alterados.

Nenhuma mensagem enviada, fixture comercial criada ou dado comercial alterado. A ausência de fixture própria não autoriza contornar ownership/gates. Playwright continua na porta 5173 com strictPort e servidor iniciado antes do navegador.

Fontes oficiais consultadas: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [funções e privilégios](https://supabase.com/docs/guides/database/functions), [changelog](https://supabase.com/changelog). A política específica do repositório prevalece sobre exemplos genéricos de testes locais/CLI.
