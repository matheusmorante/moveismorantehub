# Inbox — disputa entre atualização e paginação, 21/10/2026

## Problema e reprodução

`useCustomerSupportConversations` inicia a consulta normal com `isLoadingConversations=true`. Poll de 6s, foco e Realtime chamavam a mesma função em modo silencioso, incrementando o identificador de requisição enquanto a consulta inicial ainda estava pendente. O resultado inicial e seu finally eram descartados; o finally silencioso não liberava o loading inicial. Mesmo consultas individualmente protegidas por timeout podiam deixar a UI presa por substituição contínua das requisições.

Uma segunda disputa ocorria ao carregar mais conversas durante uma atualização silenciosa: a página seguinte era acrescentada, mas uma resposta anterior da atualização substituía a lista e descartava as linhas novas. Isso também deixava a referência de páginas carregadas à frente das linhas exibidas.

Quatro regressões Vitest/RTL falharam antes da correção, com os sete casos anteriores aprovados: abertura interrompida por atualização; contagens pendentes; atualização sobrescrevendo nova página; conclusão de filtro antigo liberando outra consulta sobre o filtro atual. Log `scratch/central-support-refresh-race-before-2026-10-21.log`.

## Correção técnica

Em `erp/src/pages/App/CustomerSupport/hooks/useCustomerSupportConversations.ts`, uma referência identifica a consulta pendente. Atualizações silenciosas não iniciam outra consulta enquanto a carga atual ou a paginação estiverem em curso. O finally libera somente a referência da própria requisição. Trocar filtro continua podendo substituir a consulta anterior.

A paginação solicitada pelo usuário passa a invalidar a atualização anterior, conservando as linhas já carregadas. Usa os mesmos identificadores/refs existentes, sem nova fila, cache, dependência ou alteração de API/banco. Os serviços continuam com seus timeouts. Esta é correção do estado de carregamento/paginação exigido pelo plano da Inbox e pelo invariante de interface do AGENTS.md; nenhuma decisão nova de produto ou permissão foi aplicada.

Arquivos de prova: `erp/src/pages/App/CustomerSupport/__tests__/customerSupportPaging.test.tsx` e `erp/tests/support-readonly/support-login.spec.ts`. Este último também confere Vite em localhost:5173 antes de acessar o navegador.

## Provas e limites

- Vitest/RTL focado: **11/11** depois da correção, incluindo as quatro regressões; `scratch/central-support-refresh-race-after-2026-10-21.log`.
- Seleção consolidada: **215/215 em 21 arquivos**, incluindo seis negativas anônimas reais; `scratch/central-support-refresh-race-consolidated-2026-10-21.log`.
- Playwright visível: **1/1 em 21,1s**, ERP 5173/strictPort e API 3000. Login autônomo com Vercel Development e gate real 204. Uma busca sem resultado teve sua resposta real do Supabase retida por 8,5s: somente uma chamada para a busca durante a espera, loading encerrado e estado vazio visível; em seguida consulta normal, filtro por atendente e rolagem reais. Guard de rede bloqueou escritas de negócio durante todo o teste. `SUPPORT_READONLY_SLOW_REFRESH=1 npm run test:support:readonly`; log `scratch/central-support-refresh-race-ui-ready-2026-10-21.log`.
- Primeira tentativa de UI parou antes de navegar/logar por ausência de aba na janela visível. O agente abriu a aba de desenvolvimento e repetiu o mesmo teste, sem alterar gates; log inicial `scratch/central-support-refresh-race-ui-2026-10-21.log` preservado.
- Lint do hook/regressões e TypeScript do harness: exit 0; `scratch/central-support-refresh-race-lint-2026-10-21.log` e `scratch/central-support-refresh-race-harness-types-2026-10-21.log`. Isso não declara TypeScript global do ERP aprovado.

Nenhuma fixture, mensagem, status, nota, pasta, conta ou permissão foi criada/alterada nesta prova. As execuções anteriores de 51 e cinco conversas permanecem encerradas. A latência foi simulada no transporte do navegador, sem alterar o conteúdo real retornado nem substituir o PostgreSQL por mock. Os casos RTL provam o mecanismo do hook; o navegador prova a interação com uma leitura remota lenta, não persistência ou concorrência no PostgreSQL.

## Publicação e decisão de pastas

A correção do hook é local neste checkpoint. A produção conferida segue em `dpl_Hm6cgBdncczxjNk91AvFSqbNacYB`, commit `0385fa1343887892117996e3d57fd027956bcadb`. Preparar um candidato isolado sobre esse commit e solicitar a autorização final da publicação concreta. O snapshot anterior de reabertura continua marcado como somente validação e não deve substituir a produção atual.

A pesquisa ATD-006-R1 apresenta A (somente autor), B (autor e administradores) e C (qualquer atendente autorizado) para manutenção das pastas, preservando sua visibilidade compartilhada e autoria. Essa escolha foi enviada ao proprietário e permanece pendente; não ampliar RLS, cadastrar perfil de teste nem inferir aprovação pelo silêncio.
