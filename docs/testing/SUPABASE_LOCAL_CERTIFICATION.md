> **Arquivo histórico, substituído.** Este documento descreve um laboratório Supabase Local/Docker que não faz mais parte do fluxo. Não siga seus procedimentos operacionais. A política vigente é [`SUPABASE_REMOTE_TEST_POLICY.md`](SUPABASE_REMOTE_TEST_POLICY.md): os testes de integração usam o projeto Supabase remoto configurado, com fixtures sintéticas e escopo controlado.
# Auditoria do Ambiente Supabase Local de Testes

Este documento define como certificar o laboratório Supabase local usado para validar o MoranteHub. Ele verifica se o ambiente produz evidência confiável; não audita a correção funcional de um módulo.

## Princípio

> O teste só é evidência de integração quando o auditor prova qual ambiente executou, quais migrations/schema estavam ativos e qual estado final foi observado.

Supabase local não precisa conter dados de produção. Deve reproduzir o schema e os comportamentos relevantes ao cenário. Mocks, PGlite e inspeção estática não certificam integração PostgreSQL/Supabase real.

## Escopo da certificação

Avalie todos os componentes usados pelo escopo declarado, registrando `Não aplicável` com justificativa quando um componente não for dependência do ERP:

- Docker, containers e saúde dos serviços;
- versão da Supabase CLI, configuração `supabase/config.toml`, portas e `project_id`;
- PostgreSQL, Auth, JWT, Storage e Realtime quando usado;
- migrations e sua ordem, baseline/schema-base, seeds e fixtures;
- `supabase start`, `supabase db reset`, stop/start e banco novo;
- upgrade de uma baseline representativa;
- schema e comportamentos relevantes: tabelas, colunas, tipos, PK/FK, índices, constraints, triggers, funções/RPCs, RLS e policies de Storage;
- transações, rollback induzido, idempotência e concorrência com conexões reais quando aplicáveis;
- pgTAP e integração via API Supabase;
- testes de Storage;
- sincronização SQLite/IndexedDB ↔ servidor quando usada;
- Playwright somente contra endpoints locais e para fluxos que necessitem de navegador;
- scripts reproduzíveis, isolamento, cleanup e ausência de escrita em produção.

## Barreira contra ambiente remoto

Antes de cada suíte com escrita ou que alegue integração, um preflight deve falhar fechado até confirmar e registrar:

1. API em `http://127.0.0.1:54321` e PostgreSQL no host `127.0.0.1` e porta local declarada no `config.toml` (normalmente `54322`; usar o valor configurado, sem assumir);
2. `project_id` e projeto local esperados;
3. URL/porta efetivamente usada pelo cliente, inclusive precedência de variáveis de ambiente;
4. ausência de `SUPABASE_URL`/equivalente remoto prevalecendo sobre a configuração local;
5. credenciais locais do stack em execução. Nunca imprimir chaves, JWTs ou segredos nos logs;
6. destino local de todos os clientes, Playwright, scripts, seeds e fixtures.

Se qualquer destino não puder ser confirmado como local, interrompa antes de escrever. Nunca use produção como fallback. O preflight deve testar valores normalizados de host/URL e rejeitar domínios remotos, não apenas procurar uma string fixa. Chave `service_role` deve ficar restrita ao processo local que realmente necessitar dela e nunca ser exposta no browser.

## Provas obrigatórias de reprodutibilidade

Para certificar uma baseline, execute na janela autorizada para Docker + Supabase Local definida em `.agents/skills/testes-seguros-erp/SKILL.md`:

1. Registrar versões, configuração, projeto, portas, containers e estado inicial.
2. Subir o stack a partir de estado limpo, sem depender de fixtures manuais fora do repositório.
3. Executar `supabase db reset` e confirmar migrations/seeds aplicados.
4. Conferir o schema e as invariantes de uma lista versionada de objetos essenciais.
5. Executar os testes de comportamento aplicáveis: Auth/JWT, RLS, RPC, triggers, constraints, transação/rollback, concorrência real com duas conexões, idempotência, Storage e API.
6. Parar e iniciar o stack; repetir a conferência do schema e dos serviços.
7. Criar banco novo e aplicar toda a cadeia de migrations esperada.
8. Aplicar um upgrade representativo sobre baseline versionada e conferir compatibilidade do estado final e dos dados legados de fixture.
9. Executar cleanup por IDs pertencentes ao test run e comprovar ausência de resíduos. Não usar `TRUNCATE`, limpeza ampla ou dados reais.
10. Registrar comandos exatos, versões, resultados e limitações sem incluir credenciais.

`stop/start` demonstra persistência do volume; `db reset` demonstra reconstrução determinística a partir da fonte versionada. São provas distintas. Um snapshot parcial com migrations selecionadas pode certificar somente aquele recorte, nunca a cadeia integral do repositório.

## Fidelidade

Mantenha uma referência versionada do schema esperado e compare-a com a baseline local e o resultado após migrations:

```text
schema esperado do projeto → baseline local versionada → migrations → schema final local
```

Compare, conforme o escopo: objetos, tipos, defaults, nulabilidade, constraints, relações, índices, funções/RPCs, triggers, grants, RLS e policies de Storage. Toda divergência deve ser explicada e classificada como esperada ou bloqueadora. Não use dump de dados de produção para completar a baseline; fixtures devem ser sintéticas e versionadas.

## Automação esperada

Os comandos devem existir no `package.json` raiz (ou em um workspace claramente documentado), ser não interativos e falhar com código diferente de zero diante de preflight inválido, serviço indisponível, migration ausente, assertion falha ou cleanup incompleto:

| Comando | Responsabilidade |
|---|---|
| `test:db` | pgTAP e assertions SQL locais |
| `test:integration` | APIs/RPCs e estado persistido |
| `test:concurrency` | cenários multi-conexão aplicáveis |
| `test:storage` | upload, leitura, remoção e policies |
| `test:migrations` | banco limpo e upgrade representativo |
| `test:rls` | usuários/JWTs e permissões permitidas/negadas |
| `test:local-all` | preflight, saúde, migrations e suítes obrigatórias para o perfil de certificação |

Um comando inexistente ou que ainda não execute uma dessas responsabilidades não deve ser apresentado como cobertura concluída. `test:local-all` só retorna sucesso se todos os checks obrigatórios do perfil declarado passarem; componentes não aplicáveis precisam de justificativa registrada. A automação não substitui a apresentação das evidências.

## Cadência

Executar a certificação completa:

- após mudança em `supabase/config.toml`, baseline, migrations estruturais, seeds, scripts de reset ou configuração de Auth/Storage/RLS;
- após atualização relevante do Supabase CLI ou Docker;
- periodicamente, com frequência definida pelo responsável do projeto;
- antes de usar o laboratório como evidência para módulo crítico P0/P1.

Mudanças de interface sem impacto no laboratório não exigem repetir esta auditoria. Testes funcionais do módulo continuam seguindo a skill canônica de testes seguros.

## Resultado e relatório

Use exatamente uma classificação:

- **APROVADO** — todas as provas obrigatórias do perfil foram executadas, ambiente local foi confirmado e não há pendência bloqueadora.
- **APROVADO COM RESSALVAS** — evidência válida para o escopo explicitamente limitado; limitações e usos proibidos ficam listados.
- **REPROVADO** — ambiente comprovadamente incorreto, inseguro, não reproduzível ou com falha em requisito obrigatório.
- **INCONCLUSIVO** — faltou executar prova obrigatória ou não foi possível obter evidência suficiente. Não usar o ambiente como evidência para o requisito não comprovado.

O relatório deve registrar data/hora e fuso, responsável, commit, perfil/escopo, versões e configuração sem segredos, `project_id`, hosts/portas confirmados, migrations aplicadas, baseline/fixtures, comandos e resultados, tabelas/objetos verificados, cleanup, classificação, ressalvas e evidências pendentes. Liste explicitamente testes não executados e o motivo. Nunca chamar teste com mock de integração real.

### Matriz mínima de evidências

| Prova | Comando/escopo | Ambiente confirmado | Executada | Resultado | Pendente/motivo |
|---|---|---|---|---|---|
| Preflight local e segurança | | | | | |
| Start limpo e saúde dos serviços | | | | | |
| Reset, migrations, seeds e schema | | | | | |
| Stop/start e persistência | | | | | |
| Banco novo e upgrade representativo | | | | | |
| Auth/JWT, RLS e RPC | | | | | |
| Constraints, triggers, transação/rollback | | | | | |
| Concorrência e idempotência | | | | | |
| Storage/API/Realtime/sync/E2E aplicáveis | | | | | |
| Cleanup e ausência de resíduos | | | | | |

### Registro desta rodada — 2026-09-28 08:21 BRT

Referência: `HEAD 4b32eb66`; Node `v22.18.0`; Supabase CLI fixada `2.118.0`. Nenhum Docker, status Supabase, conexão PostgreSQL/API, reset, start/stop ou escrita remota foi executado nesta rodada.

| Prova | Comando/escopo | Ambiente confirmado | Executada | Resultado | Pendente/motivo |
|---|---|---|---|---|---|
| Preflight local e segurança | `node --check` dos runners; parsing de `config.toml`; scanner de URLs ativas; teste isolado do validador de endpoint Docker local/remoto | Não; somente configuração versionada e valores sintéticos | Parcial estática | Sintaxe/configuração passaram; destinos reais não foram consultados | PENDENTE — aguardando janela permitida para Docker + Supabase Local; confirmar project_id, endpoint Docker, container, API e PostgreSQL reais |
| Start limpo e saúde dos serviços | — | Não | Não | Sem evidência operacional | PENDENTE — aguardando janela permitida para Docker + Supabase Local |
| Reset, migrations, seeds e schema | `npm run test:migrations` | Não; o gate terminou antes de iniciar serviços | Gate executado; prova de banco não executada | Bloqueado com código 2 porque baseline/provenance/manifesto estão `incomplete`; nenhum banco foi iniciado | Selecionar e versionar baseline autoritativa; executar cadeia integral na janela |
| Stop/start e persistência | — | Não | Não | Sem evidência operacional | PENDENTE — aguardando janela permitida para Docker + Supabase Local |
| Banco novo e upgrade representativo | — | Não | Não | Sem evidência operacional | Baseline autoritativa não selecionada; executar runner na janela após completar artefatos |
| Auth/JWT, RLS e RPC | — | Não | Não | Harness de seis perfis preparado; sem resultado real | PENDENTE — aguardando janela permitida para Docker + Supabase Local |
| Constraints, triggers, transação/rollback | — | Não | Não | Sem evidência operacional | PENDENTE — aguardando janela permitida para Docker + Supabase Local |
| Concorrência e idempotência | — | Não | Não | Harness de conexões reais preparado; não executado | PENDENTE — aguardando janela permitida para Docker + Supabase Local |
| Storage/API/Realtime/sync/E2E aplicáveis | — | Não | Não | Harness autenticado de Storage preparado; não executado | PENDENTE — aguardando janela permitida para Docker + Supabase Local |
| Cleanup e ausência de resíduos | — | Não | Não | Não houve criação de fixtures nesta rodada | PENDENTE — comprovar cleanup após execução operacional |

Validações auxiliares desta rodada: `node --check` nos runners e harnesses alterados; leitura/parsing de `package.json`, `schema.expected.json` e `config.toml`; teste estático do scanner de URL; `git diff --check` (apontou whitespace preexistente em arquivos fora do escopo desta rodada). `npm audit --json` encontrou 9 pacotes vulneráveis e está detalhado em [DEPENDENCY_AUDIT_2026-09-28.md](./DEPENDENCY_AUDIT_2026-09-28.md); nenhuma correção automática foi aplicada.

## Estado conhecido do repositório

O ambiente `supabase/tests/local-indisponibilidades` declara que usa baseline focada e fixtures para dependências ausentes, e que não representa a cadeia completa das migrations históricas. Até que as provas de banco limpo e upgrade representativo sejam executadas contra uma baseline fiel e reproduzível, essa configuração não certifica o schema completo do ERP. Não inferir aprovação a partir de serviços saudáveis ou de testes focados aprovados.

Na revisão atual, o `package.json` raiz possui wrappers para `test:db`, `test:concurrency`, `test:storage`, `test:integration` e `test:rls`, além de `test:migrations`, `test:schema-drift` e `test:local-all`. As suítes locais passam por preflight antes de usar credenciais/endpoints; o preflight confere URLs efetivas, configuração, porta/projeto/CLI, endpoint Docker local, container, saúde HTTP de Auth/PostgREST e conexão PostgreSQL, além de literais nos seeds/scripts ativos/Playwright conhecidos, sem imprimir credenciais. `test:migrations` implementa stacks isolados para cadeia limpa e upgrade, incluindo reset/seed, assertions legadas, drift, stop/start e cleanup por `project_id`; falha fechado antes de iniciar Docker enquanto a provenance e o manifesto permanecerem incompletos. `test:schema-drift` compara um snapshot local com o manifesto e também bloqueia enquanto ele estiver incompleto. O manifesto atual está explicitamente `incomplete`: a cadeia raiz não cria o schema base e não há baseline autoritativa revisada. Os harnesses de RLS/JWT (seis papéis do sistema mais `pending`) e Storage (upload/leitura/remoção autenticados, caminhos próprios e negados) ainda não foram executados nesta revisão. A existência desses scripts não é evidência de aprovação: a classificação permanece **INCONCLUSIVO** até as provas operacionais da matriz serem executadas na janela permitida.

O roadmap de continuidade está em [SUPABASE_LOCAL_ROADMAP.md](./SUPABASE_LOCAL_ROADMAP.md). Ele acompanha bloqueios e próximas etapas sem duplicar esta fonte de critérios.

## Relação com a governança

Esta é a fonte canônica dos critérios de certificação do ambiente. `.agents/skills/testes-seguros-erp/SKILL.md` define como executar testes seguros de módulos e aponta para este documento quando a validade do laboratório Supabase local estiver em questão. Não duplicar esta matriz em outras skills ou no roteiro cíclico.
