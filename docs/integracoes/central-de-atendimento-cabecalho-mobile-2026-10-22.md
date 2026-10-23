# Central — retorno à lista em tela pequena

**Data:** 22/10/2026. Correção local validada na interface e compilada em candidato combinado, sem publicação.

## Problema e causa

O Playwright em viewport **390×844** encontrou o histórico próprio e o botão “Voltar para a lista”, mas o clique normal foi interceptado pelo botão de atribuição. O cabeçalho tinha altura fixa de 64px e uma única linha: o grupo de ações não encolhia, enquanto a identificação da conversa podia perder sua largura. Os controles se sobrepunham. A prova falhou aguardando o clique, sem usar force ou execução direta do callback.

## Correção

Em larguras inferiores a md, `ChatHeader` passa a organizar identificação e ações em linhas separadas, com altura de acordo com o conteúdo; ações podem quebrar linha. O botão de retorno não encolhe. A partir de md, o cabeçalho mantém disposição horizontal e altura de 64px.

Arquivo de execução: `erp/src/pages/App/CustomerSupport/components/chat/ChatHeader.tsx`, três alterações de classes. Ações, RHF/resolver, permissões, dados, status, atribuição e envio não mudaram.

## Provas

| Teste | Executado | Projeto / massa | Resultado | Limite |
|---|---|---|---|---|
| Estrutura responsiva | Vitest/RTL antes/depois | Isolado | Uma regressão falhou antes; 11 testes do cabeçalho passaram depois | Asserção de classes não mede geometria |
| Lista/chat em 390×844 | Playwright visível na **5173**, strictPort, pilha npm run dev na raiz e API 3000/health 200 | Supabase operacional; somente run próprio retido `8eaed14f-364d-47ab-be41-66be54b3fb65`, ownership/canal/arquivamento conferidos | **1/1 em 22,5s**. Histórico dentro da largura, lista oculta com chat aberto; clique normal no retorno reexibe lista; compositor desativado | Viewport Chromium, não aparelho físico nem toque nativo; não prova funcionamento offline |
| Suíte da Central com ajuste comercial | Vitest/RTL, 25 arquivos | Isolado | **257 aprovados/seis ignorados** | Seis verificações remotas sem opt-in não executadas nesta rodada |
| Lint do cabeçalho/serviço e três provas RTL | ESLint | Local | Sem erros/avisos | Sem novo TypeScript global |

A UI também preservou os fluxos de pastas, diretório, filtro de atendente e recuperação de leitura. Todas as escritas de negócio foram abortadas ou, para um ACK restrito do ID próprio, simuladas somente no navegador. Nenhum PATCH foi encaminhado ao banco. A aplicação foi para about:blank antes de retirar a guarda de rede; navegador visível preservado.

Testes: `customerSupportCommandForms.test.tsx` e `erp/tests/support-readonly/support-login.spec.ts`, com `SUPPORT_READONLY_MOBILE_LAYOUT=1` exigindo o mesmo gate do histórico próprio. Logs: `scratch/central-support-mobile-header-before-2026-10-22.log`, `scratch/central-support-mobile-header-after-2026-10-22.log`, `scratch/central-support-mobile-layout-playwright-2026-10-22.log` (falha real anterior), `scratch/central-support-mobile-header-playwright-after-2026-10-22.log`, `scratch/central-support-commercial-mobile-after-2026-10-22.log` e `scratch/central-support-commercial-mobile-eslint-2026-10-22.log`.

Sem nova fixture, migration, cliente/pedido, mensagem enviada, commit, push, deploy ou promoção por este agente. Os candidatos anteriores permanecem congelados. Nenhum cache persistente, fila offline ou nova capacidade mobile foi implementado.

Candidato final conjunto com [hidratação comercial](central-de-atendimento-hidratacao-comercial-2026-10-22.md): `C:\Users\mathe\morantehub-central-commercial-hydration-release-20261022`, nove arquivos de execução/24 caminhos selecionados, dois arquivos alterados nesta etapa. Suíte isolada **257 aprovados/seis ignorados**, build completo **5m04s**, 5.913 módulos e avisos não fatais de dependências/chunks. O build de 1m50s anterior ao cabeçalho foi substituído como prova pelo build final; nenhum resultado de versão anterior foi atribuído ao código novo.
