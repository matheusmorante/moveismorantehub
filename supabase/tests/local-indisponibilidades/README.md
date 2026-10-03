> **Legado arquivado:** este harness Supabase Local/Docker não faz parte do fluxo ativo e não deve ser executado. A política vigente usa Supabase remoto configurado com fixtures sintéticas e escopo controlado: [`docs/testing/SUPABASE_REMOTE_TEST_POLICY.md`](../../../docs/testing/SUPABASE_REMOTE_TEST_POLICY.md). O conteúdo abaixo é mantido apenas como registro técnico histórico.

# Supabase local de teste para Indisponibilidades

Este ambiente é isolado do projeto padrão: usa `project_id = morantehub-local-tests` e portas 55320–55329. O diretório temporário de execução não compartilha containers, volume ou portas com `supabase/config.toml` da raiz.

A baseline versionada é um snapshot somente de schema. As migrations de fixture explicitam as duas dependências ausentes no snapshot (`suppliers` e colunas de status das movimentações). As migrations da funcionalidade são copiadas diretamente de `supabase/migrations` em cada execução para evitar uma segunda fonte de verdade.

Execute no PowerShell, na raiz do repositório:

```powershell
.\supabase\tests\local-indisponibilidades\verify-local-stack.ps1
```

O script prepara o diretório isolado em `%TEMP%`, faz `start`, `db reset`, valida as tabelas essenciais, executa `stop/start` e valida novamente. Depois simula uma linha legada com URL pública de foto, aplica a migration de endurecimento e verifica a conversão para chave de objeto, a constraint de variação obrigatória e o bucket privado. Os fixtures de upgrade são removidos ao final.

Este ambiente verifica as migrations focadas sobre a baseline versionada. Ele não afirma que as 188 migrations históricas da raiz formam uma cadeia integral aplicável desde banco vazio; o repositório ainda não contém uma migration inicial completa para esse propósito.
