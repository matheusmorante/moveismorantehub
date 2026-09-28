# Autorização de `profiles.role` e `profiles.roles`

Projeto Supabase `MoranteHub` (`hkoxhourxwlddgsfdgws`).

## Snapshot anterior à migration

Consulta somente leitura feita em 2026-09-28 14:57 UTC (11:57 em São Paulo), antes de aplicar `20260928150615_harden_profile_role_assignments`.

- `public.profiles`: RLS habilitado; `FORCE ROW LEVEL SECURITY` desabilitado; owner `postgres`.
- Policies existentes: DELETE para `is_administrator()`; INSERT para o próprio `id` ou administrator; SELECT para o próprio `id` ou administrator; UPDATE para o próprio `id` ou administrator. Todas se aplicam a `authenticated`.
- Grants da tabela: `anon`, `authenticated` e `service_role` têm grants SQL de tabela; o RLS continua sendo a barreira de linha. Nenhum grant de tabela será alterado por esta correção.
- `role`: `text`, anulável, default `pending`. `roles`: `text[]`, anulável, sem default.
- O trigger `protect_profile_role` estava ativo para INSERT/UPDATE. A função tinha `SECURITY DEFINER`, `search_path=public`, exceção por e-mail no INSERT e só conferia mudanças em `role`; mudanças em `roles` passavam sem essa proteção.
- `is_administrator()` tinha `SECURITY DEFINER`, `search_path=public` e conferia somente `role='administrator'`.
- Antes da correção, `PUBLIC`, `anon`, `authenticated` e `service_role` tinham `EXECUTE` nos dois helpers.
- O trigger `on_auth_user_created` cria o perfil com `role='pending'`; `roles` fica nulo. A regra nova permite esse cadastro normal.
- A consulta contou três perfis com acesso de administrator. Nenhum identificador ou dado pessoal foi registrado.

## Escopo da correção

A migration altera somente `public.is_administrator()`, `public.protect_profile_role()` e o trigger `protect_profile_role` em `public.profiles`. Não altera policies nem grants da tabela. Revoga a execução direta do trigger helper e remove a exceção por e-mail. O helper de autorização permanece executável por `authenticated` para atender às policies existentes.

O último administrator não pode retirar o próprio acesso nem excluir o próprio perfil enquanto não houver outro perfil com administrator. A verificação é serializada por advisory transaction lock para evitar remoções concorrentes deixando o sistema sem administrador.

## Verificação estrutural após aplicação

Migration aplicada isoladamente no projeto confirmado em 2026-09-28. O histórico remoto registrou `20260928150615 / harden_profile_role_assignments`.

- RLS continua habilitado e as quatro policies listadas no snapshot permanecem inalteradas.
- Os grants de tabela continuam com sete privilégios para cada um de `anon`, `authenticated` e `service_role`; não houve alteração de grants da tabela.
- `protect_profile_role` está ativo em INSERT/UPDATE/DELETE; as funções ficaram com `search_path` vazio.
- `is_administrator()` agora reconhece `role` e `roles`; `anon` não tem EXECUTE, `authenticated` tem EXECUTE para as policies.
- `protect_profile_role()` não tem EXECUTE para `anon`, `authenticated` nem `service_role`.
- A contagem de perfis com acesso de administrator continua em três.
- Advisors pós-migration não apontam mais `protect_profile_role()` como RPC executável por `anon`/`authenticated`. Permanece o aviso de `is_administrator()` executável por `authenticated`, necessário para as policies existentes.

## Validação funcional

Pendente. Executar com identidades descartáveis próprias desta execução; não usar perfis operacionais existentes como massa de teste. Confirmar os testes diretos de RLS, edição normal de perfil e a regra do último administrator, e remover as identidades criadas.

### Pré-checagem da execução remota — 2026-09-28

- Run ID preparado: `TEST_AUT_543d92f5-2285-41f3-96cb-2827ca8c1dc7`.
- Consulta somente leitura ao `auth.users`, restrita aos três e-mails descartáveis desse run ID, retornou zero contas.
- O arquivo local de credenciais está no caminho ignorado pelo Git, mas as credenciais atuais não atendem ao mínimo do harness; não foram usadas nem exibidas.
- O formulário de criação permaneceu sem envio. Nenhuma identidade foi criada pelo agente, nenhum perfil foi alterado e o harness remoto não foi executado.
- Status funcional permanece **PENDENTE**. Requer criar as três contas descartáveis com credenciais temporárias adequadas, completar o arquivo local e repetir a pré-checagem antes de executar o harness.
