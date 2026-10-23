# Central — falha comercial não representa ausência de pedidos

**Data:** 22/10/2026. Correção local validada e compilada em candidato isolado, sem publicação deste lote.

## Causa comprovada

`fetchConversations` consultava resumos de clientes e contagens de pedidos depois da lista autorizada. Erros dessas consultas e fallback nulo de timeout não eram conferidos. Os mapas vazios geravam `customer: null` e `orders: []`, mesmo quando a ausência dos dados não havia sido confirmada. Uma resposta inválida também não recebia feedback público consistente.

Cinco regressões falharam antes do ajuste: erros dos dois serviços, timeout dos dois serviços e recuperação após uma contagem comercial recusada. A primeira versão do harness de timeout produziu duas rejeições de assertivas sem tratamento quando a função resolvia inesperadamente; a prova foi corrigida para capturar a resolução/rejeição antes de avançar timers. A execução válida anterior ao patch tem cinco falhas e dois sucessos, sem erros assíncronos do runner.

## Correção e alcance

O serviço agora exige ausência de erro e lista válida nas duas respostas comerciais. Erro, timeout, dado nulo ou objeto inesperado interrompem a hidratação com a mensagem: “Não foi possível carregar os dados comerciais das conversas. Tente atualizar a lista.” Falha de resumo impede a consulta de contagem seguinte. Arrays vazios recebidos com sucesso continuam válidos.

O hook existente exibe o erro e preserva a lista e a seleção confirmadas quando a atualização é silenciosa. A repetição bem-sucedida limpa o aviso e atualiza os dados comerciais. No carregamento inicial ou troca de filtro, a lista permanece sem dados até uma consulta válida. Não foi criado estado de pedido zero para representar falha.

Arquivo de execução: `erp/src/pages/utils/customerSupport/customerSupportService.ts`. RPCs, filtros, paginação, RLS, permissão comercial e bloqueio de envio não mudaram. Sem permissão comercial, nenhuma das duas consultas adicionais é feita.

## Provas

| Teste | Executado | Projeto / massa | Resultado | Limite |
|---|---|---|---|---|
| Regressões antes/depois | Vitest, serviço real com cliente simulado e timers controlados | Sem PostgreSQL | Cinco falharam antes e passaram depois; erro junto a data vazia, nulo, objeto inválido e timeout recusados | Não prova RLS/persistência |
| Respostas vazias, recuperação e gate comercial | Vitest | Dados unitários | Zero/ausência válidos preservados; nova consulta recupera dois pedidos; sem permissão não consulta comercial | Nenhum dado de pessoa/pedido real consultado por essa prova |
| Atualização silenciosa e repetição | RTL do hook | Mocks isolados | Conserva cliente e dois pedidos durante falha, libera loading, apresenta erro; repetição atualiza para três e limpa aviso | Não prova concorrência entre contas |
| Suíte da Central | Vitest/RTL, 25 arquivos | Isolado | **256 aprovados/seis ignorados**, 262 no total | Seis checks remotos sem opt-in não executados nesta rodada |
| Lint do serviço e dois arquivos de prova | ESLint | Local | Aprovado, sem erros/avisos | Sem novo TypeScript global |
| Fluxo da Inbox | Playwright visível na **5173**, strictPort e API **3000/health** 200, pilha iniciada com npm run dev na raiz | Projeto operacional; run próprio retido `8eaed14f-364d-47ab-be41-66be54b3fb65`, ownership/canal/arquivamento conferidos antes de selecionar | **1/1 em 24,0s**; pastas, diretório, filtro de atendente, leitura e bloqueios preservados | Escritas abortadas ou ACK restrito simulado no navegador; não prova persistência nem o cenário comercial positivo com pedidos reais |

Testes: `customerSupportCommercialHydration.test.ts` e `customerSupportPaging.test.tsx`, em `erp/src/pages/App/CustomerSupport/__tests__/`. Logs em `scratch/central-support-commercial-hydration-before-2026-10-22.log` (harness inicial), `scratch/central-support-commercial-hydration-before-final-2026-10-22.log` (regressões válidas), `scratch/central-support-commercial-hydration-after-2026-10-22.log` e `scratch/central-support-commercial-hydration-eslint-2026-10-22.log`.

Nenhum cliente, pedido, fixture, conta, migration ou dado operacional criado/alterado. Não há nova autorização de escrita nem prova comercial positiva com fixtures remotas. Os candidatos de leitura, diretório e webhook permanecem congelados. A auditoria A–R continua parcial e o envio fica bloqueado.

A autenticação foi executada pelo agente com credenciais Vercel Development em memória, sem valores em argumentos ou evidências. A aplicação foi encerrada em about:blank antes de retirar a guarda de escrita; janela visível preservada. Logs de servidor/UI: `scratch/central-support-commercial-hydration-dev-2026-10-22.log` e `scratch/central-support-commercial-hydration-playwright-2026-10-22.log`.

Na continuação, uma prova em 390×844 encontrou sobreposição no cabeçalho, [corrigida e validada separadamente](central-de-atendimento-cabecalho-mobile-2026-10-22.md). O conjunto passou em **257 testes/seis ignorados**, lint e Playwright visível **1/1 em 22,5s**. O primeiro build de hidratação passou em 1m50s, porém não inclui a correção posterior do cabeçalho e não serve como prova de compilação do pacote final.

**Candidato final:** `C:\Users\mathe\morantehub-central-commercial-hydration-release-20261022`, base `bed981061157e1d07164b4cb9c8fdeb91e78abbb`, nove arquivos de execução/24 caminhos selecionados; dois arquivos de execução alterados nesta etapa. Inclui os ajustes anteriores de leitura/diretório/webhook ainda não publicados. Suíte isolada: **257 aprovados/seis ignorados em 7,72s**; build ERP completo final **5m04s**, 5.913 módulos, com avisos não fatais de anotação Zod, imports mistos e chunks. Sem nova execução TypeScript global. Logs: `scratch/central-support-commercial-mobile-isolated-vitest-2026-10-22.log` e `scratch/central-support-commercial-mobile-build-final-2026-10-22.log`. Manifests de dependências equivalentes à base, nenhuma alteração fiscal local copiada; snapshots anteriores preservados.
