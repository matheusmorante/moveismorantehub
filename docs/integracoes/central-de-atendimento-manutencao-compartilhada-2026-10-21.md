# Pastas — manutenção por qualquer atendente autorizado, 21/10/2026

## Decisão e operação concreta

**Orientação posterior do proprietário:** a prova entre duas contas fica para sua validação futura, conforme resposta a `call_f6c1fffe89eb47efafa34ed6faf3f751`. Permanece não realizada, mas deixou de ser requisito para a continuidade atual. Não solicitar outra conta nem criar usuários/fixtures para essa prova nesta etapa.

O proprietário respondeu **“Qualquer atendente autorizado”** à pergunta `call_ecdb638ddd14417db4e89087c5552c90`, escolhendo C na comparação ATD-006-R1. A implementação da regra é autorizada por essa resposta, pelo plano da Inbox e pela orientação anterior para executar as migrações necessárias. Não abrange criar contas, nova massa de teste ou publicar outro candidato sem sua autorização correspondente.

Todos os usuários com `viewCustomerSupport` poderão editar nome/critérios e excluir qualquer pasta compartilhada. A autoria original continua determinando “Por mim/Outras”; consultar ou editar não transfere a autoria. A operação é restrita a `public.customer_support_inboxes` no projeto existente `hkoxhourxwlddgsfdgws`, sem alterar registros.

## Catálogo e SQL revisável

[SQL completo](sql/customer-support-shared-folder-maintenance.sql): modifica somente as políticas UPDATE/DELETE para exigir `customer_support_can_view()` em vez de ownership. SELECT compartilhado e INSERT com autor autenticado são preservados. `USING` e `WITH CHECK` mantêm a autorização da Central.

O catálogo anterior confirmou as seis colunas e quatro políticas existentes. Além de UPDATE amplo, authenticated possuía TRUNCATE/TRIGGER/REFERENCES. O SQL reconstrói os privilégios dessa única tabela: SELECT, INSERT, DELETE e UPDATE somente de `name`, `criteria`, `updated_at`. Retira privilégios de tabela/coluna de PUBLIC/anon/authenticated antes desses grants específicos. Assim `id`, `created_by` e `created_at` não podem ser regravados pelo cliente; service role permanece como estava. Nenhuma outra tabela, função de autorização ou permissão comercial muda.

O trigger de proteção das fixtures permanece intacto. Conversas e históricos não são tocados; critérios e nome das pastas são preservados; não há envio/Meta, efeito fiscal/financeiro/estoque ou geração de notificações nesta migration. Não desativar esse trigger para provar acesso de outra identidade a fixtures antigas.

Revisão de documentação: [privilégios de coluna Supabase](https://supabase.com/docs/guides/database/postgres/column-level-security) e [GRANT PostgreSQL 17](https://www.postgresql.org/docs/17/sql-grant.html) confirmam que um UPDATE amplo prevalece sobre revogações por coluna; é necessário removê-lo antes do grant restrito. Changelog consultado via HTTP (o navegador de pesquisa recusou text/markdown); o aviso de [PostgreSQL 15.19/17.11](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes) trata de extensões/operadores, sem alteração desta sintaxe. Nenhum upgrade de banco foi executado.

## Frontend e validação local

- `InboxSectionCustom.tsx`: controles de editar/excluir disponíveis para as pastas listadas, preservando o filtro de autoria.
- `customerSupportFormSchemas.ts`: exclusão continua pelo RHF/zodResolver, com UUIDs de pasta/autor/atendente válidos; remove somente a igualdade entre editor e autor. A autorização permanece no backend.
- `customerSupportInboxService.ts`: salvar uma pasta existente envia somente nome, critérios e data de atualização; recusa de exclusão não atribui mais o bloqueio à autoria.
- Regressões RTL/service: três casos falharam antes (botão de outro autor ausente, resolver recusando outro autor e mensagem de erro antiga); **21/21 em dois arquivos** depois. Mantém testes de cancelamento, falha de persistência, contexto inválido e autoria original. Logs `scratch/central-support-shared-folders-before-2026-10-21.log` e `scratch/central-support-shared-folders-after-2026-10-21.log`.
- Inspeção estática adicional do SQL em `customerSupportSharedFoldersMigration.test.ts`: não equivale a prova de RLS, persistência ou segundo usuário no PostgreSQL.

## Migração aplicada e catálogo posterior

Aplicada após revalidar projeto saudável, histórico sem duplicata e as quatro políticas coincidindo com o catálogo revisado: **20261021194621_customer_support_shared_folder_maintenance.sql**. Cópia exata em `supabase/migrations`, SHA-256 **2683BF3EE29CE7C19D7C643613D4D535ECBC39FF1BDC6A2F82F775ABAB3610E6**.

O catálogo posterior confirmou RLS ativo; UPDATE/DELETE exigem acesso à Central sem ownership; SELECT e INSERT permanecem como antes (INSERT exige autor autenticado). Authenticated tem SELECT/INSERT/DELETE e UPDATE somente de nome/critérios/data de atualização; nenhum UPDATE de ID/autor/data de criação, nem TRUNCATE/TRIGGER/REFERENCES. Anon sem privilégios; service role preservada. Trigger de fixtures e corpo da função preservados (MD5 `6329e817ae408c8a56baa58c657beec5`). Isso é prova de instalação/configuração, não de comportamento de dois usuários.

## Validação remota e publicação

Pré e pós-catálogo conferidos conforme acima. Nenhum DML de teste foi feito nesta etapa.

A Vercel Development só disponibiliza o par de credenciais do operador atual. As duas execuções de fixtures anteriores estão encerradas; a última autorização excluiu novas pastas/clientes/pedidos e contas. Uma prova positiva entre dois atendentes exige conta/perfil e fixtures participantes próprios autorizados; não substituir por impersonação, alteração de role, bypass de helper, massa sem marcador ou mudança de ambiente. Essa prova permanece pendente e será explicitada na entrega.

## Conferência final da entrega

A seleção consolidada na origem e a cópia isolada passaram **222/222 em 22 arquivos**; build Vite completo da cópia isolada aprovado em **3m22s**. Lint focado e TypeScript do harness passaram; o gate TypeScript global não foi declarado aprovado. Prova de edição de outro autor inclui preservação do autor e do critério comercial existente sem consultar pedidos; erros de contexto continuam bloqueando o serviço pelo resolver real.

Playwright somente leitura repetido depois da mudança: **1/1 em 20,7s**, janela visível no ERP **5173**/strictPort, login em memória e gate real; resposta de busca retida por 8,5s, carregamento liberado, filtro por atendente e rolagem reais, escritas de negócio bloqueadas. Logs `scratch/central-support-shared-folders-consolidated-2026-10-21.log`, `scratch/central-support-shared-folders-lint-2026-10-21.log`, `scratch/central-support-shared-folders-harness-types-2026-10-21.log` e `scratch/central-support-shared-folders-readonly-ui-2026-10-21.log`.

Durante a conferência, a integração Git publicou a produção **dpl_HEWH6mSt4zhreR7XFtgs2qukSkBR**, READY, commit **39b10c593834b07ed3727bd7f6abad1fcfcad5d2**, em `https://morantehub.vercel.app`. O commit contém as quatro mudanças de runtime deste lote e os contratos anteriores; **12 blobs** de runtime/build/schema coincidem com a origem (`scratch/central-support-shared-folders-production-fingerprints-2026-10-21.json`). Sete checks HTTP no alias atual passaram, preservando 401 de mídia sem sessão/assinatura inválida e 403 de despacho. Provas `scratch/central-support-shared-folders-production-http-2026-10-21.log` e `scratch/central-support-shared-folders-production-http-proof-2026-10-21.json`. Nenhum deploy/promoção foi feito por este agente nesta operação.

Snapshot `C:/Users/mathe/morantehub-central-refresh-release-20261021`: 25 caminhos selecionados e quatro mudanças de runtime sobre o commit anterior. Está marcado **somente validação**, pois a produção Git avançou e já contém estas alterações; não deve substituí-la. Manifesto SHA-256 `3EC7C4A0F9E36F002338893D7F9CF60CC8B83D8BFAAA6D54AD82369F612ACCC1`.

A prova positiva entre duas identidades continua pendente conforme o limite acima; os checks da publicação não a substituem. A mudança pode ser revertida, se explicitamente instruído, restaurando ownership nas políticas UPDATE/DELETE e mantendo os grants de identidade protegidos. Não regravar autores, restaurar TRUNCATE/TRIGGER ou excluir histórico para reverter; considerar a produção Git atual e suas outras mudanças.
