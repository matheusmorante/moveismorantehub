# Central de Atendimento — recuperação do diretório de atendentes

**Data:** 22/10/2026  
**Estado:** RTL, UI e build isolado aprovados; candidato combinado preparado, sem publicação deste lote.

## Problema e causa comprovada

`fetchTeamProfiles` convertia erro da RPC ou timeout em lista vazia. A lateral exibia “Nenhum atendente autorizado encontrado”, sem distinguir falha de consulta nem oferecer repetição. O chat consultava o mesmo diretório a cada montagem; lateral e atribuição podiam apresentar resultados diferentes.

Três regressões falharam antes: rejeição pelo serviço, erro/repetição na lateral e erro/repetição no menu de atribuição. Lista vazia recebida com sucesso continua válida.

## Solução

- Serviço recusa erro, timeout e resposta que não seja lista, com mensagem pública de falha. Prazo de 15 segundos e retorno restrito a identificador, nome e função preservados.
- Página controla carregamento, erro e repetição por identidade autenticada e ignora respostas de efeitos encerrados.
- Lateral e atribuição compartilham a lista; abrir outra conversa não consulta novamente o diretório.
- Ambos mostram carregamento e erro com repetição; vazio só após resposta válida. Repetir no menu não atribui nem fecha o menu.

Arquivos de execução: `Index.tsx`, `components/InboxSidebar.tsx`, `components/inbox/InboxSectionTeam.tsx`, `components/ChatArea.tsx`, `components/chat/ChatHeader.tsx`, em `erp/src/pages/App/CustomerSupport/`, e `erp/src/pages/utils/customerSupport/customerSupportService.ts`.

A recuperação de leitura anterior também modifica `Index.tsx`; o candidato combinado inclui esse ajuste e `hooks/useCustomerSupportMessages.ts`, totalizando sete arquivos de execução. O candidato de leitura submetido permanece congelado e separado. Resolver de atribuição, permissões, RPC, RLS, schema, recebimento e bloqueio de envio preservados. Nenhuma migration, fixture, conta ou dado comercial criado.

## Provas

| Teste | Executado | Projeto / massa | Resultado | Limite |
|---|---|---|---|---|
| Três regressões de erro/repetição | Vitest/RTL antes/depois | Mocks isolados | Três falharam antes e passaram depois | Não prova PostgreSQL |
| Suíte da Central | Vitest/RTL, 23 arquivos | Isolado | **231 aprovados, seis ignorados**, 237 no total | Seis verificações remotas de anon sem opt-in não executadas nesta rodada |
| Lint dos seis arquivos de execução e dois RTL | ESLint | Local | **Zero erros; um aviso** do export não componente já existente em ChatArea | Export de agrupamento preservado |
| Suíte na cópia isolada | Vitest/RTL, 23 arquivos | Base de produção mais 16 caminhos selecionados | **231 aprovados/seis ignorados**, em 4,49s | Mesmos seis checks remotos sem opt-in |
| Build ERP completo na cópia isolada | npm run build | Base `bed981061157e1d07164b4cb9c8fdeb91e78abbb`, sem credenciais | **Aprovado em 1m33s**, 5.913 módulos Vite | Avisos não fatais de anotação de dependência, imports estáticos/dinâmicos e tamanho de chunks |
| Falha/recuperação do diretório, filtro real por atendente e abertura do chat | Playwright visível, ERP **5173** strictPort, API 3000 respondendo | Supabase operacional `hkoxhourxwlddgsfdgws`, public; run próprio retido `8eaed14f-364d-47ab-be41-66be54b3fb65`, ownership/canal/arquivamento conferidos | **1/1 em 59,0s**. RPC recusada no navegador, repetição recebeu resposta remota válida; abrir chat não acrescentou consulta | Escritas bloqueadas; não prova atribuição persistida nem duas contas |

O fluxo preservou as provas de pastas, bloqueio de envio e recuperação de leitura pelo poll remoto real. Um ACK é simulado exclusivamente no navegador para ID próprio/payload restrito; demais escritas são abortadas. Nenhum PATCH chega ao banco: não há nova prova de persistência. A aplicação vai para `about:blank` antes da remoção da guarda de rede.

Após observar 59 segundos no cenário próprio, o orçamento global desse cenário passou de 60 para 90 segundos no runner, sem alterar prazos individuais, assertivas ou gates. Essa alteração de orçamento foi posterior à aprovação funcional citada.

Testes: `customerSupportInbox.test.tsx`, `customerSupportCommandForms.test.tsx`, `erp/tests/support-readonly/support-login.spec.ts`. Logs: `scratch/central-support-agent-directory-before-2026-10-22.log`, `scratch/central-support-agent-directory-after-2026-10-22.log`, `scratch/central-support-agent-directory-playwright-2026-10-22.log`.

## Publicação e limites

Lote não publicado por este agente. Autorização pendente para o candidato de leitura não inclui os novos arquivos por inferência. Prova entre contas adiada pelo proprietário; não solicitada novamente. Auditoria A–R parcial, sem implementação de novas decisões de produto.

Candidato combinado: `C:\Users\mathe\morantehub-central-agent-directory-release-20261022`, sete arquivos de execução e 16 caminhos selecionados. Os quatro manifests de dependências têm conteúdo idêntico à base, normalizando CRLF do package.json da raiz; a cópia de produção foi preservada. Dois diretórios node_modules são junctions apenas para compilação. Logs adicionais: `scratch/central-support-agent-directory-isolated-vitest-2026-10-22.log` e `scratch/central-support-agent-directory-build-2026-10-22.log`. Não foi executado um novo TypeScript global; build Vite não equivale a essa prova.
