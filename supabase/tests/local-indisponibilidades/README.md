> **Legado arquivado e desativado:** este harness Supabase Local/Docker não faz parte do fluxo ativo e não deve ser executado. `verify-local-stack.ps1` agora falha fechado antes de chamar Docker ou Supabase CLI. A política vigente usa somente o projeto remoto operacional, na branch padrão e schema `public`: [`docs/testing/SUPABASE_REMOTE_TEST_POLICY.md`](../../../docs/testing/SUPABASE_REMOTE_TEST_POLICY.md). O restante desta página e as fixtures SQL abaixo são registros históricos.

# Registro histórico — Supabase Local para Indisponibilidades

O harness antigo usava `project_id = morantehub-local-tests` e portas 55320–55329 num diretório temporário. Essa configuração não autoriza iniciar o ambiente nem criar outro projeto/branch/schema.

A baseline versionada é um snapshot somente de schema. As migrations de fixture explicitam as duas dependências ausentes no snapshot (`suppliers` e colunas de status das movimentações). As migrations da funcionalidade são copiadas diretamente de `supabase/migrations` em cada execução para evitar uma segunda fonte de verdade.

Na execução histórica, o script preparava um diretório em `%TEMP%`, iniciava serviços, aplicava resets e migrations e validava a conversão de URLs legadas, constraints e bucket privado. O runner foi desativado; essas etapas não são procedimentos atuais e não devem ser repetidas.

O resultado histórico cobria somente migrations focadas sobre a baseline versionada. Não comprova o estado atual do remoto nem a cadeia integral de migrations.
