# E2E fiscal pela interface

## Projeto e dados

O runner usa exclusivamente o projeto e o schema Supabase já configurados no ERP. Ele lê a ref local de `supabase/.temp/project-ref` e compara com a URL recebida do Vercel Development; não aceita uma ref informada separadamente como substituta da configuração do app. Não cria projeto, banco, schema, tabela ou coluna de teste.

Cada cenário futuro deve usar UUID de execução e owner autenticado na metadata JSON existente dos próprios artefatos. Não gere IDs com prefixo obrigatório `TEST_AUT_` e não use um marcador de ambiente como prova de isolamento. Movimentos e históricos ficam acessíveis para auditoria; os cinco destinos excluídos e a supressão de notificações seguem `SUPABASE_REMOTE_TEST_POLICY.md`.

Antes de iniciar os testes, o runner consulta em modo somente leitura `test_artifact_policy_status()` no projeto configurado. O RPC ausente, erro de acesso, versão inesperada ou `ready=false` bloqueia o Playwright. Esse status confirma instalação de guards, mas não substitui os testes de banco de autorização, vínculos, rollback, concorrência, consultas e supressão de efeitos.

As chaves e a identidade do operador são lidas em runtime do Vercel Development. Não grave secrets, senha, tokens, cookies ou `storageState` em arquivos ou relatórios. A política principal está em `.agents/skills/vercel-development/SKILL.md`.

## Estado da suíte

`erp/tests/e2e/fiscal/fiscal-ui-navigation.spec.ts` atualmente prova login e navegação por pedidos, devoluções, notas fiscais e cadastros, além de abrir formulários vazios. Não salva cliente, produto ou pedido; não abre o modal de emissão; não cria snapshot/XML nem compara o XML ao pedido.

O helper de contexto UUID existe, mas `bindTestArtifactContext()` ainda não é chamado pelo ERP ou pelo Playwright. Portanto, o fluxo não está pronto para gravar artefatos sintéticos no Supabase remoto.

A suíte E2E geral em `erp/playwright.config.ts` recusa refs operacionais enquanto não houver harness comprovado de identidade, vínculos e cleanup. O simulador SOAP também recusa essas refs porque uma autorização simulada criaria um fato fiscal falso no banco operacional. Não habilite um flag para contornar esses bloqueios.

## Próxima validação fiscal

1. Implementar e testar a vinculação do UUID/owner autenticado desde a criação dos artefatos, sem credenciais em metadata.
2. Concluir testes de banco focados para vínculos, movimentações, notificações, filtros, falha transacional, repetição e concorrência limitada.
3. Fazer uma suíte Playwright que use os formulários reais, gere XML pela infraestrutura oficial e compare o formulário, pedido persistido, snapshot e XML campo a campo. A validação inicial deve parar antes de qualquer transmissão.
4. Só transmitir à SEFAZ-PR em Homologação quando o usuário tiver autorizado essa emissão, o cenário estiver integralmente elegível e a tentativa for reconciliável. Transmissões reais devem partir da interface fiscal do ERP.

O estado atual é **BLOCKED** para gravações E2E e transmissão fiscal. A migration candidata e os motivos estão registrados em `test-artifact-policy-status-2026-10-09.md`.
