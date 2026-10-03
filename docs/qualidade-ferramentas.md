# Ferramentas locais de qualidade

Esta configuração adiciona mutation testing e análise estática local sem tornar a CI dependente de Docker, SonarQube ou tokens.

## StrykerJS com Vitest

O primeiro escopo cobre as regras de tipo Normal/Salvado e as atualizações independentes do status ERP e da publicação no Catálogo Digital.

```powershell
npm run quality:coverage:critical
npm run quality:mutation:critical
```

Vitest grava LCOV em `erp/coverage/lcov.info`. Stryker grava HTML e JSON em `erp/reports/mutation/`. Esses diretórios são locais e ignorados pelo Git. O score inicial é baseline informativo, sem limite que interrompa CI. Ao analisar mutantes sobreviventes, diferencie sobreviventes relevantes, sem cobertura, timeout e erros de compilação; só acrescente testes para comportamento exigido.

## SonarQube

A instalação local de SonarQube via Compose foi retirada do fluxo ativo. Não inicie nem mantenha serviços locais para essa análise. Use os relatórios de Vitest/Stryker e a análise já configurada no CI, quando disponível. `npm run quality:sonar` depende do endpoint/credencial previsto na configuração atual do projeto e não deve ser usado como requisito de validação local.
## Escopo e limites atuais

O scanner local analisa ERP, API, catálogo digital, bibliotecas compartilhadas e o agente desktop de impressão. Os `tsconfig` usados são explícitos para não incluir workspaces alheios ao escopo; o workspace Mobile permanece fora por usar uma configuração TypeScript própria e versões fora da matriz de suporte publicada pelo analisador. O scanner também não substitui Vitest, testes de integração/PostgreSQL, concorrência, RLS ou Playwright.

## ast-grep para regras estruturais

Use ast-grep em auditorias estruturais amplas, migrações estruturais e localização de violações em massa; não é obrigatório para mudanças pequenas. As regras ficam em `rules/<domínio>/`, os testes positivos e negativos em `rule-tests/`, e `sgconfig.yml` registra esses diretórios. A varredura percorre somente diretórios-fonte (`erp/src`, `mobile/src`, `digital-catalog/src`, `desktop-print-agent/src`, `api`, `src` e `shared-utils`), sem dependências, builds, relatórios, coverage ou migrations Supabase.

```powershell
npm run test:ast-grep
npm run quality:ast-grep:scan
npm run quality:ast-grep:critical
npm run quality:ast-grep:ci
```

A primeira regra, `no-deprecated-delete-order` (erro), impede chamadas ao alias depreciado `deleteOrder`, cuja alternativa documentada é `moveToTrash`. A segunda, `no-inventory-move-write-in-ui` (erro), bloqueia `insert`/`update`/`upsert`/`delete` direto com nome literal `inventory_moves` na UI; leituras e chamadas aos casos de uso/serviços continuam válidas. Como a regra compara o nome literal da tabela, nomes via constante permanecem uma limitação conhecida e exigem revisão estrutural/manual. Ambas têm casos positivos/negativos, nenhum autofix e zero ocorrências atuais nas camadas monitoradas. Não há pipeline de CI versionada no repositório atualmente; `quality:ast-grep:ci` está pronto para integração quando houver pipeline, mas não é apresentado como executado pelo CI. Não adicione regras para `select('*')` ou acesso Supabase de leitura em telas sem antes resolver as exceções contextuais: essas buscas tiveram ocorrências legítimas e não justificam um gate amplo. Atualizações diretas de saldo encontradas dentro do serviço de estoque Mobile continuam candidatas a auditoria de domínio/RPC, não a uma regra geral sem contrato confirmado.

## CALM para navegação relacional

CALM mapeia relações do código para orientar leitura e análise de impacto. O projeto usa a versão `@eilodon/calm-mcp@0.8.0`, com os conjuntos mínimos `orient`, `trace` e `change`. `reference_impact` cobre referências no conjunto `trace`; `diff_impact` cobre impacto de diff em `change`. A configuração local do Codex fica em `.codex/config.toml`; o Antigravity usa configuração MCP global apontando explicitamente para a raiz do repositório. O índice e a configuração gerada ficam em `.calm/`, ignorado pelo Git.

O semantic search foi desativado; a indexação é local e não deve baixar modelo ou enviar código a serviço externo. Dependências, builds, caches, relatórios e pastas de backup são excluídos. CALM complementa Serena, ast-grep, dependency-cruiser e Repomix: grafo de chamadas/impacto, navegação de símbolos, padrões estruturais, boundaries e contexto amplo continuam com seus papéis próprios. CALM não é fonte de regra de negócio nem substitui testes.
