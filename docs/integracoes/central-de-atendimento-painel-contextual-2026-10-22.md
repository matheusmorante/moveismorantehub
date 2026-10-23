# Painel contextual contido na Central — 22/10/2026

## Defeito observado

Durante Playwright somente leitura, a aba Pedidos abriu na conversa sintética própria, mas o clique normal em **Fechar painel** foi interceptado por um controle da navegação global. O log identifica o elemento receptor e 19 novas tentativas sem sucesso. Não foi usado clique forçado.

O painel e seu backdrop tinham `position: fixed` com topo no viewport. Abaixo do breakpoint `xl`, isso colocava o cabeçalho do painel na faixa ocupada pela navegação global. A coluna de chat já é um ancestral relativo em `Index.tsx:291`; a sobreposição deve pertencer a essa coluna.

## Correção

Em `components/CustomerInfoPanel.tsx:172`, o backdrop passa de `fixed` para `absolute`. Em `:177`, a mesma troca limita o painel à coluna da Central. O modo `xl:static`, larguras, estado, callbacks, permissões e formulários permanecem no contrato existente.

O teste RTL em `customerSupportLinkForms.test.tsx` verifica o painel e o backdrop como elementos absolutos, sem `fixed`. Falhou antes da mudança. Após a correção, a suíte da Central passou em **263 testes, com seis checks remotos sem opt-in ignorados**, 25 arquivos, 69,67s. A duração maior nesta rodada não é medição de performance do produto. ESLint dos dois arquivos de execução e três testes passou sem diagnóstico.

O harness `support-login.spec.ts` agora fixa 1024×768 para a prova do painel e também abre/fecha o painel em 390×844, com limites horizontais conferidos. **Playwright completo aprovado: 1/1 em 27,7s**, com cliques normais para fechar nas duas larguras e voltar à lista em tela pequena. A rodada intermediária não encontrou Copiar com um localizador exato, ajustado para o nome visível. Essa falha de localizador não foi tratada como defeito de negócio. A primeira compilação isolada terminou sem resultado conclusivo porque a sessão anterior desapareceu; não foi possível provar a causa. Confirmada a ausência do processo Vite e a igualdade dos oito arquivos do candidato com o workspace, a repetição compilou sem alterações no runtime: **código 0, `✓ built in 1m 52s`**. Log: `scratch/central-support-neutral-panel-build-retry-2026-10-22.log`. O Vite apontou avisos não fatais de Rollup e chunks grandes; o maior chunk listado foi 9.712,43 kB.

## Evidências e limites

Logs: `scratch/central-support-snippets-playwright-retry-2026-10-22.log` (intercepção original), `central-support-context-panel-before-2026-10-22.log` (regressão RTL), `central-support-neutral-panel-central-2026-10-22.log`, `central-support-neutral-panel-eslint-2026-10-22.log`, `central-support-neutral-panel-playwright-2026-10-22.log` (rodada intermediária) e `central-support-neutral-panel-playwright-approved-2026-10-22.log` (fluxo final aprovado).

A primeira navegação da rodada de modelos teve timeout antes do preenchimento de credenciais; ERP, API e browser estavam saudáveis quando conferidos depois. Não foi alterado o login nem aumentado o prazo por suposição. A causa profunda desse primeiro timeout não foi estabelecida.

Não há nova regra comercial, alteração fiscal, conta, fixture, migration, gravação operacional ou envio. O cenário usa o run próprio retido e comprova seus gates antes de selecionar uma conversa; escritas de negócio são bloqueadas no navegador. O candidato isolado compõe este ajuste com os [modelos neutros](central-de-atendimento-modelos-neutros-2026-10-22.md), totalizando dois deltas de execução, oito caminhos alterados e 29 selecionados. A compilação terminou; a conferência e o congelamento do manifesto ainda estão pendentes. Nenhuma publicação posterior ao pacote combinado foi autorizada ou executada.

## Revalidação do candidato — 23/10/2026

A revisão do delta comparou o candidato com a base de produção atual. O painel está dentro do wrapper relativo da conversa; o overlay absoluto fica limitado à coluna da Central. O modelo rápido continua somente copiando o texto e não chama a RPC de comentários. Não encontrei falha técnica concreta nos dois deltas de execução.

Vitest/RTL focado passou **64/64 em três arquivos**, incluindo snippets sem criação de comentário e a posição do painel no wrapper relativo. `build:support` passou. O Playwright anterior deste candidato (1/1) já havia fechado o painel por clique normal em desktop e em viewport de 390×844; não foi repetido nesta revalidação. A porta `5173` respondeu HTTP 200 e a porta `3000` tinha o processo do adaptador de API ativo. Esta revalidação não altera o estado de publicação: o candidato segue sem autorização específica e não foi implantado.
