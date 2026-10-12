# Migração: artefatos fiscais E2E somente no Supabase

**Decisão de 11/10/2026.** Para testes E2E fiscais, a fonte de verdade de clientes, produtos, pedidos, itens, pagamentos e estados de execução é exclusivamente o Supabase remoto operacional, branch primária, schema `public`. Não gerar ou manter payloads comerciais sintéticos hardcoded em runners, fixtures TypeScript/JS, arquivos JSON ou SQL de seed. Scripts de teste, asserções, validadores, schemas e mocks de testes unitários continuam permitidos no código-fonte; eles não são artefatos E2E.

## Contrato operacional

1. Criar ou selecionar artefatos via serviços reais do ERP e persistir no Supabase **somente após autorização explícita de escrita** e comprovação de isolamento. Cada execução possui UUID `runId`, owner autenticado e metadados de vínculo existentes. Nunca inferir autorização por prefixo ou flag client-side.
2. Runners E2E recebem apenas identificadores de registros já persistidos, consultam o banco e verificam owner, vínculos, integridade, cenário, status e elegibilidade antes de executar qualquer ação. Não reconstruir pedidos fictícios em memória como alternativa silenciosa.
3. O backend de emissão mantém leitura de `orders`, snapshot fiscal, numeração, idempotência e persistência. Transmissão SEFAZ HML **somente pelo fluxo UI autorizado**, nunca via runner HTTP/CLI/SQL; `tpAmb=2`, produção desabilitada.
4. Provar exclusões em relatórios, agenda, cronograma, montagens e dashboard antes de agregação/paginação; suprimir notificações em todos os canais. Manter movimentações, efeitos reais da própria massa e auditoria fiscal, sem afetar registros operacionais compartilhados.
5. Em timeout, resultado ambíguo ou emissão incerta: somente consultar/reconciliar. Nunca reenviar com novo identificador. Preservar XML, protocolo, snapshot e trilha fiscal. Limpeza somente por owner/runId, por fluxos normais e sem apagar fatos fiscais.
6. Sem Docker, Supabase local, bancos/branches/schemas paralelos, reset ou DDL experimental. Leituras não autorizam DML/DDL. O guard `TEST_ARTIFACT_UNAUTHORIZED` continua fail-closed até todas as provas passarem.

## Migração do código (pendente de implementação)

- Inventariar `scripts/testing/nfe-hml-automated.cjs`, `scripts/testing/nfe-hml-automated.test.cjs`, `scripts/testing/nfe-retail-remote-controlled.sql`, `erp/src/pages/utils/hmlTestData.ts`, `shared-utils/testArtifactPolicy.ts`, `supabase/tests/test_artifact_*_remote.cjs` e todos os caminhos de fixture referenciados.
- Substituir `makeFixture`, `createSyntheticRecipient`, `createSyntheticProduct` e equivalentes por seleção/leitura de IDs previamente persistidos; manter validações de esquema e negócio. Não apagar arquivos ou testes unitários indiscriminadamente.
- Adaptar o provisionamento para operar pelos serviços reais com autorização, sem payload comercial estático no runner. Não usar registros de clientes reais como massa.
- Testar gates de autenticação, owner, RLS, referências cruzadas, agregações, notificações, concorrência, rollback, estoque/financeiro e idempotência com evidências sanitizadas.
- Atualizar documentação canônica, AGENTS/skills, comandos npm, CI e relatório de homologação **após** mudanças verificadas.
- Registrar matriz `Teste | Executado | Ref | runId | Resultado | Evidência/limitação`. Sem testes executados, reportar `não executado`.

## Critério de liberação

Nenhuma gravação remota, migration ou transmissão está autorizada por este documento. A migração somente é concluída quando o checkout local e remoto estiverem reconciliados, código alterado, testes automatizados aprovados, proteções de isolamento comprovadas e autorização específica de escrita concedida. Até lá, manter o comportamento anterior fail-closed.
