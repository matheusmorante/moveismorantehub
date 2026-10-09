# Status da política de artefatos de teste — 09/10/2026

## Decisão aplicada no workspace

- Os testes usam o projeto, banco, schema e tabelas existentes do Supabase configurado pelo ERP. Nenhum schema, tabela ou coluna física de teste foi criado.
- A identidade proposta é um UUID por execução, proprietário autenticado e metadata JSON nos artefatos já existentes. O helper novo usa UUID sem prefixo; código e fixtures históricos ainda podem usar `TEST_AUT_`, sem que isso seja requisito para a identidade nova.
- Movimentações, efeitos financeiros aplicáveis e históricos permanecem nos fluxos reais para auditoria. Não se envia notificação de artefato de teste pelo ERP, celular ou dispositivos conectados.
- Artefatos de teste são excluídos de relatórios, agenda, cronograma, montagens e dashboard. Mapa e telas operacionais de vendas/fiscal continuam fora dessa lista.
- A migration local ainda não foi aplicada. Não houve gravação ou alteração remota no Supabase.

## Implementação local desta etapa

- Política documentada em `AGENTS.md`, `.agents/skills/testes-seguros-erp/SKILL.md` e `docs/testing/SUPABASE_REMOTE_TEST_POLICY.md`.
- Helpers em `shared-utils/testArtifactPolicy.ts`, `shared-utils/testArtifactQueries.ts` e `shared-utils/testArtifactContext.ts` para identidade, vínculo, classificação de leitura e filtros PostgREST.
- Filtros adicionados às consultas ERP/Mobile de dashboard, relatórios, agenda, cronograma e montagens; os filtros são aplicados antes da paginação nas consultas ajustadas.
- Supressão local de notificações adicionada às rotas de criar/editar pedido, ao dispatcher/push, ao feed do Mobile e aos alertas derivados.
- Runner fiscal alinhado ao Vercel Development e à ref lida de `supabase/.temp/project-ref`. O `globalSetup` faz somente uma chamada read-only a `test_artifact_policy_status`; ausência ou estado incompleto bloqueia Playwright. `E2E_ISOLATED_DATA` foi removida deste runner.
- Regra antiga que aceitava `E2E_ISOLATED_DATA` na suíte E2E geral foi substituída por bloqueio explícito nas refs operacionais até existir harness comprovado. O simulador SOAP preserva o bloqueio dessas refs e não depende mais desse flag.
- Migration candidata local: `supabase/migrations/20261009200000_test_artifact_json_guards.sql`. Ela propõe guards nos vínculos, supressão de inserções em notificações, filtros financeiros e atualização controlada de funções SQL do dashboard.

## Evidência e validação

| Camada | Resultado | Limite |
|---|---|---|
| Testes focados Vitest | 35 aprovados em 5 arquivos: política, consultas, atomicidade de criação, push e finanças; depois, mais 4 do simulador SOAP passaram. Total: 39 aprovados em 6 arquivos. | O primeiro grupo passou antes das últimas alterações apenas no runner/config; o teste do simulador foi repetido depois da remoção do flag. |
| ESLint nas rotas focadas | 0 erros; 3 warnings de variáveis não usadas | Warnings observados em arquivos de aplicação. |
| Runner CommonJS | `node --check` aprovado para os dois scripts fiscais | Não executado contra Vercel/Supabase. |
| Config e `globalSetup` Playwright | Transpilação TypeScript sintática aprovada | O ESLint raiz não fornece configuração para estes arquivos; não é uma validação funcional. |
| Diff | `git diff --check` aprovado | Git avisou sobre conversão de LF/CRLF em arquivos já modificados. |
| TypeScript Mobile | `tsc --noEmit` terminou com `RangeError: Maximum call stack size exceeded` dentro do compilador | Sem diagnóstico associado a arquivo; não comprova compilação. |
| Supabase Advisors | Comando terminou com sucesso, mas exibiu muitos avisos existentes de policies, `search_path` e índices | Não foi interpretado como autorização para aplicar a migration. |
| Playwright, comparação de XML e SEFAZ | Não executados | O RPC de readiness ainda não existe remotamente e a proteção de banco não foi provada. Nenhuma transmissão fiscal ocorreu. |

O projeto ref conferido somente para leitura foi `hkoxhourxwlddgsfdgws`. A auditoria remota anterior não encontrou os guards novos. Ela encontrou 22 pedidos com `order_data.is_test=true` sem owner e dois produtos e duas pessoas com prefixo histórico sem metadata canônica. Esses registros não foram adotados, atualizados ou removidos.

## Migrations e estado

| Migration | Destino | Estado nesta etapa |
|---|---|---|
| `20261009200000_test_artifact_json_guards.sql` | Supabase remoto configurado (`hkoxhourxwlddgsfdgws`) | **BLOCKED — local, não aplicada.** Falta validação SQL/pgTAP e prova comportamental de autorização, vínculos, rollback, concorrência, filtros e não emissão de notificações. A presença do RPC de status, isoladamente, não seria prova suficiente. |
| `20261009140000_order_update_version_guard.sql` | Supabase remoto configurado (`hkoxhourxwlddgsfdgws`) | Alteração preexistente no workspace, preservada; a auditoria anterior não a encontrou no remoto. Não aplicada nesta etapa. |
| `20261009180000_fiscal_order_edit_replacements.sql` | Supabase remoto configurado (`hkoxhourxwlddgsfdgws`) | Alteração preexistente no workspace, preservada; a auditoria anterior não a encontrou no remoto. Não aplicada nesta etapa. |
| `20261009050000_isolate_remote_test_data.sql` | Nenhum | Exclusão preexistente preservada; não restaurada nem aplicada. |

## Pendências que impedem o E2E fiscal real

1. `bindTestArtifactContext` não tem consumidor no ERP/Playwright. Assim, ainda não existe um fluxo comprovado que crie UUID por execução e aplique metadata ao cliente, produto, variação, pedido e efeitos relacionados desde a criação.
2. A suíte fiscal atual (`fiscal-ui-navigation.spec.ts`) autentica e navega por telas, abre formulários vazios e os fecha. Ela não salva um pedido, não abre o modal fiscal, não gera snapshot/XML nem compara os valores do pedido com o XML.
3. A migration candidata ainda não passou por execução controlada contra PostgreSQL nem por testes de comportamento dos triggers/RPCs. O `test_artifact_policy_status` confirma instalação, não comprova os efeitos.
4. O guard de banco exige administrador autenticado e owner igual a `auth.uid()`. O caminho de persistência usado pelos fluxos reais precisa provar que mantém essa identidade também nos efeitos transacionais.
5. Os registros históricos incompletos citados acima precisam de decisão individual antes de qualquer atualização ou limpeza. Não devem ser classificados pelo prefixo sozinho.

Próximo passo seguro: completar o harness de identidade e uma suíte de banco com fixtures reversíveis, validar a migration sem aplicá-la ao remoto, revisar os avisos dos Advisors relevantes e só então propor uma execução controlada. Até lá, qualquer execução Playwright fiscal fica bloqueada pelo readiness gate; não reutilizar pedidos operacionais nem transmitir à SEFAZ.
