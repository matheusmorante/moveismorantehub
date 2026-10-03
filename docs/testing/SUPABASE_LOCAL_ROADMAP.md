> **Arquivo histórico, substituído.** Este documento descreve um laboratório Supabase Local/Docker que não faz mais parte do fluxo. Não siga seus procedimentos operacionais. A política vigente é [`SUPABASE_REMOTE_TEST_POLICY.md`](SUPABASE_REMOTE_TEST_POLICY.md): os testes de integração usam o projeto Supabase remoto configurado, com fixtures sintéticas e escopo controlado.
# Roadmap — Certificação do Supabase Local

Fonte de critérios: [SUPABASE_LOCAL_CERTIFICATION.md](./SUPABASE_LOCAL_CERTIFICATION.md). Este plano acompanha a execução e não replica os critérios da certificação.

## Estado atual

- Classificação: **INCONCLUSIVO**.
- A baseline `supabase/tests/local-indisponibilidades` cobre somente o recorte indicado no README; não certifica o ERP completo.
- A cadeia raiz de migrations não cria o schema inicial completo (`public.products` está ausente) e a baseline histórica disponível diverge em tipos. Nenhuma delas pode ser promovida a baseline completa sem reconciliação com uma fonte autoritativa.
- Supabase CLI fixada em `2.118.0`; dependência adicionada para que automações não baixem versões implicitamente.
- Preflight fail-closed e comandos de automação adicionados nesta revisão. Ainda precisam de execução na janela autorizada.
- Baseline autoritativa formalmente definida, mas ainda **não selecionada**. Ver [SUPABASE_LOCAL_BASELINE.md](./SUPABASE_LOCAL_BASELINE.md).
- Auditoria de dependências registrada em [DEPENDENCY_AUDIT_2026-09-28.md](./DEPENDENCY_AUDIT_2026-09-28.md); nenhuma atualização de vulnerabilidades foi aplicada.

## Provas definidas

Conforme a fonte canônica: isolamento local e saúde, banco limpo/reset, migrations/seeds, schema esperado/drift, Auth/JWT/RLS/RPC, constraints/triggers/transações/rollback, concorrência/idempotência, Storage, stop/start, banco novo, upgrade representativo, cleanup e API. Sync e Playwright entram quando aplicáveis, sempre com destino local comprovado.

## Lacunas e dependências

| Item | Estado | Dependência / bloqueio |
|---|---|---|
| `test:local:preflight` | Implementado; não executado contra stack | Janela Docker/Supabase; verificar comportamento da CLI fixada |
| `test:migrations` | Runner isolado implementado: banco limpo, reset/seed, stop/start com volume persistido, baseline até checkpoint, assertions pré/pós-upgrade, drift e descarte do volume exclusivo. Ainda bloqueado antes do runtime | Selecionar baseline com provenance e arquivos sintéticos aprovados; manifesto atual continua incompleto |
| Drift de schema | Comparador implementado para relações/RLS, colunas, constraints, índices, funções, triggers, grants, tipos e buckets/policies; bloqueado pelo manifesto `incomplete` | Gerar e revisar snapshot a partir de schema aprovado e executar a comparação |
| `test:rls` | Harness Auth/JWT implementado para os seis papéis de `SYSTEM_ROLES` e `pending`; CRUD direto e RPCs permitidos/negados conforme configuração real. Não executado | Stack com schema aplicável, perfis e políticas presentes; revisar resultados reais na janela |
| `test:storage` | Harness JWT implementado: upload/leitura/remoção próprios, negação por pasta/usuário/perfil e cleanup de objetos/usuários. Não executado | Stack/bucket/policies aplicáveis; executar na janela |
| `test:db`, integração, concorrência | Wrappers exigem preflight; concorrência usa IDs próprios e cleanup direcionado. Não executados nesta revisão | Stack local confirmado; verificar estado final PostgreSQL e ausência de resíduos |
| `test:local-all` | Orquestrador sequencial; deve parar na primeira falha | Só fica verde após completar baseline e todas as etapas obrigatórias |
| Persistência/reset/upgrade | Pendente | Execução controlada na janela autorizada |

## Próxima etapa

1. Confirmar uma origem/versionamento autoritativos da baseline, sem dados operacionais, segundo os critérios publicados; hoje nenhum candidato atende aos critérios.
2. Preencher a provenance e os hashes dos artefatos sintéticos, após revisão da fonte escolhida, e completar o manifesto de schema final.
3. Na próxima janela permitida, executar o runner de banco limpo/upgrade, preflight, suites JWT/Storage/concorrência, reset, stop/start e cleanup; registrar comandos, versões, horários e resultados na matriz canônica.

## Critérios de classificação

- **APROVADO**: todas as provas obrigatórias do perfil completo foram executadas em stack local confirmado, reproduzíveis, sem bloqueadores e com cleanup comprovado.
- **APROVADO COM RESSALVAS**: provas completas de um perfil explicitamente limitado; nenhuma inferência para o schema/módulos fora desse perfil.
- **REPROVADO**: uma prova executada demonstrou ambiente inseguro, inconsistente ou incompatível.
- **INCONCLUSIVO**: falta prova operacional obrigatória, baseline aprovada, ou evidência suficiente.

Nenhuma validação estática altera a classificação. Evidência operacional deve ser anotada na matriz da fonte canônica, incluindo testes não executados e motivo.
