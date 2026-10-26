# Teste nativo do fluxo de entrega — 24/10/2026

## Ambiente

- App `com.morante.mobile`, versão instalada `1.6.2`, `versionCode 29`.
- O checkout declara `versionCode 27` em `mobile/app.json`; a execução comprova apenas a build instalada no telefone.
- Telefone físico Xiaomi `2312DRA50G`, conectado por Depuração sem fio no ADB.
- Maestro CLI `2.10.0`, instalado no computador com checksum oficial verificado; os auxiliares estavam no telefone antes dos testes.
- Fluxo: `flows/operations/delivery-flow-readonly.yaml`.

## Resultado no aplicativo

- A primeira passada ficou em Hoje e encontrou um cartão de entrega, abriu os detalhes e voltou à lista. Nessa data não apareceu um caminho elegível para abrir o fluxo.
- Após selecionar Dias Seguintes, o botão do cartão `Iniciar fluxo de entrega - preparação` abriu Preparação. A execução final do Maestro passou: 1 fluxo, 0 falhas. Na tela apareceram `ETAPA 1 DE 4`, as quatro etapas Preparação, Em Rota, Chegada e Atendimento e o slider `« Deslize para INICIAR ROTA`.
- Uma repetição intermediária tocou no mesmo botão, mas a tela continuou na lista. A rodada final abriu Preparação; registro a variação como possível intermitência de navegação, sem causa confirmada.
- O fluxo separado pelos detalhes abriu e fechou os detalhes de um cartão. Nesse cartão não estava visível o botão de início no rodapé. Os estados Em Rota, Chegada e Em Atendimento não estavam disponíveis na lista/detalhes testados, então os controles dessas etapas não foram exercitados no aparelho.
- A tela nativa confirmou o contador da etapa 1 e a presença das quatro etiquetas. A ordem esquerda‑para‑direita é definida pela lista do stepper no código, em `src/features/orders/components/delivery/DeliveryStepProgressIndicator.tsx`. Os controles das demais etapas estão em `src/features/orders/components/delivery/DeliveryStepActionFooter.tsx`.
- Depois que o operador fechou a janela do MIUI, o teste do slider foi retomado. Um primeiro flow passou pelas asserções da etapa 1, mas o fluxo condicional de cancelar a confirmação ficou `SKIPPED`; portanto, essa rodada não prova abertura do modal.
- Uma nova rodada ligou o GPS temporariamente (permissão do app já estava concedida) e exigiu a abertura de `Iniciar Fluxo de Entrega`. A asserção falhou porque o modal não apareceu. O código do rodapé mostra o motivo provável e verificável: o slider fica desabilitado enquanto o checklist estiver incompleto (`disabled={!isChecklistComplete}`). Não foi alterado pedido real.
- O flow ajustado para verificar o bloqueio do checklist não chegou à asserção: o cartão deixou de aparecer na lista em uma repetição. A tentativa seguinte foi bloqueada quando o Maestro recebeu `INSTALL_FAILED_USER_RESTRICTED` ao instalar o driver auxiliar. A regra exige parar nesse erro; não houve outra tentativa.
- O GPS foi desligado após a tentativa e permaneceu desligado. O app Morante continuou em primeiro plano.
- Não foi possível observar a faixa animada em execução porque não havia pedido ativo em rota/atendimento. O código marca esses estados como animados em `src/features/logistics/components/schedule/ScheduleCard.tsx` e usa `Animated.loop`; o botão de status no detalhe também usa `Animated.loop` em `src/components/order-details/OrderDeliveryStartFooter.tsx`.
- No código, o stepper declara a ordem Preparação → Em Rota → Chegada → Atendimento em `src/features/orders/components/delivery/DeliveryStepProgressIndicator.tsx`. Os controles de cada etapa estão em `src/features/orders/components/delivery/DeliveryStepActionFooter.tsx`. Os estados Em Rota e Em Atendimento ativam um loop animado em `src/features/logistics/components/schedule/ScheduleCard.tsx`; o botão de status no detalhe também usa `Animated.loop` em `src/components/order-details/OrderDeliveryStartFooter.tsx`.

## Testes complementares

| Camada | Resultado | Limite |
|---|---|---|
| Maestro — Dias Seguintes | Botão do cartão abriu Preparação; etapa 1, quatro rótulos e slider visíveis. 1 fluxo passou. | Não foram deslizados controles. A repetição de uma tentativa não abriu a tela; a rodada final abriu. |
| Maestro — detalhes | Abertura e fechamento dos detalhes passaram. | O cartão selecionado não mostrou botão de início no rodapé; etapas 2–4 não estavam disponíveis. |
| Maestro — início/slider | A etapa 1 apareceu; a abertura do modal não foi comprovada. | A asserção estrita do modal falhou; checklist incompleto deixa o slider desativado. |
| Maestro — continuação | Não executado após a falha do driver. | `INSTALL_FAILED_USER_RESTRICTED`; interrompido conforme a regra de teste. |
| Vitest — `deliveryFlowStepRules.test.ts` | 7 testes passaram. | Lógica isolada, sem UI nativa ou banco. |
| Vitest — `deliveryFlowService.test.ts` | 10 testes passaram. | Supabase está mockado; não comprova persistência remota. |
| Vitest — `DeliveryStepActionFooter.test.tsx` | 7 testes passaram após completar o mock com `Platform.OS`. | Renderização isolada; não simula gestos no telefone. |
| Vitest — `ScheduleCardActions.test.tsx` | 3 testes passaram após completar o mock com `Animated` e alinhar asserções aos rótulos atuais. | Renderização isolada; não comprova a animação visual no aparelho. |
| Total Vitest | 27 testes passaram em 4 arquivos. | Nenhum deles comprova gravação remota. |

## Persistência e escopo

O operador autorizou fixture sintética, transições e uso temporário do GPS. Ainda assim, nenhuma fixture foi criada e nenhuma etapa foi gravada no pedido: a lista do app no checkout exclui pedidos de teste e a build instalada (código 29) difere do checkout (código 27). A exceção limitada ao `runId`/owner ainda não existe nesse código. O GPS foi ligado apenas durante uma tentativa segura e depois desligado.

Ao abrir Operações, a tela também aciona a sincronização normal do próprio status em `team_locations`, já autorizada pelo operador numa etapa anterior. Essa sincronização não foi usada para alterar pedidos.

Há uma lacuna que deve ser tratada antes de considerar a persistência comprovada: em `src/features/orders/services/deliveryFlowService.ts`, as atualizações Supabase são aguardadas, mas os retornos `{ error }` não são verificados antes de atualizar o cache local e enfileirar o evento offline (por exemplo, `startRoute`, linhas 120–160). Os testes atuais cobrem `error: null` e rejeições de rede lançadas, mas não uma resposta PostgREST resolvida com `error`. Isso pode deixar a interface/cache avançar sem confirmar que a gravação remota foi aceita.

O projeto Supabase remoto confirmado foi `hkoxhourxwlddgsfdgws`, correspondente ao URL do ERP e sem branch de teste. A consulta de readiness `test_artifact_policy_status()` foi recusada porque exige `service_role`; assim, o gate global não foi comprovado e não houve escrita. Para continuar, falta resolver a restrição de instalação do driver e disponibilizar uma build compatível com uma exceção de visibilidade limitada ao `runId`/owner, além de confirmar os gates remotos antes de provisionar a fixture autorizada.
