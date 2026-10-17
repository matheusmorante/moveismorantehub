# Histórico de correções — 16/10/2026

## Assistência técnica: segregação entre Assistência Avulsa e Assistência Vinculada a Venda Atendida

**Data:** 16/10/2026  
**Problema identificado:**
1. No módulo de assistência, o formulário de cadastro exigia lidar com toggle e campos de vincular pedido de venda original mesmo quando o objetivo era cadastrar uma assistência técnica avulsa (ou quando a venda de origem não se encontrava no ERP).
2. Na listagem de pedidos de venda (`OrderHistoryList`), os operadores não tinham um atalho direto e intuitivo para abrir uma assistência vinculada a partir de uma venda concluída/entregue.

**Causa raiz técnica comprovada:**
- Acoplamento do fluxo de seleção/busca de pedidos dentro do modal genérico de assistência técnica.
- Ausência de ação dedicada no menu de contexto dos 3 pontinhos (`OrderOptionsMenu`) e de uma política de elegibilidade formal de pedidos aptos a gerar assistência.

**Solução técnica implementada:**
1. **Regra de Elegibilidade (`canGenerateAssistance`):** Criada em `erp/src/pages/utils/assistancePolicy.ts` garantindo que apenas pedidos de venda (`sale`, `showroom`) com status de atendimento (`fulfilled`, `delivered`, `atendido`, `entregue`, `retirado`) ou com circulação de mercadorias concluída (`getGoodsCirculationState === 'completed'`) exibem o botão "Gerar Assistência". Pedidos cancelados, rascunhos, devoluções ou assistências são estritamente excluídos.
2. **Ação no Menu dos 3 Pontinhos (`OrderOptionsMenu`):** Registrada a ação `GENERATE_ASSISTANCE` em `orderButtonsConfig.ts` e `orderActionsConfig.ts`, validada por `orderActionValidationRules.ts` e filtrada em `OrderMenuActiveActions.tsx`.
3. **Orquestração de Modais (`useSalesOrderModals` & `SalesOrderModalsContainer`):** Implementado suporte a `assistanceSourceOrder` para abrir o modal de assistência passando a venda atendida como fonte direta.
4. **Segregação Clara de Fluxos na Interface:**
   - **Fluxo Avulso (na rota de assistências):** O botão na toolbar chama-se **"Nova Assistência Avulsa"**. O modal intitula-se **"Pedido de Assistência Avulso"** (ou "Editar Assistência Avulsa"). A seção de vínculo de venda **não é renderizada**, proporcionando uma experiência enxuta e sem campos irrelevantes.
   - **Fluxo Vinculado (via "Gerar Assistência" no pedido atendido):** O modal intitula-se **"Nova Assistência Vinculada"** (com badge `#código` da venda). No início do formulário, renderiza o card elegante `AssistanceLinkedOrderSection` com os dados da venda vinculada (código, cliente, data, vendedor) e a lista de itens daquela venda original, permitindo selecionar individualmente quais itens estão sob assistência técnica e a quantidade com defeito (1 a maxQty). Não há botões confusos de busca ou toggle. Os dados do cliente e atendente são pré-carregados automaticamente.
5. **Formulários RHF + Zod:** Mantido o uso rigoroso de `useZodForm` com schema validado via Zod (`createAssistanceOrderFormSchema`).
6. **Política Mandatória de CC-e:** Nenhuma menção a CC-e foi reintroduzida.

**Arquivos modificados:**
- `erp/src/pages/utils/assistancePolicy.ts` (criação da regra de elegibilidade pura `canGenerateAssistance`).
- `erp/src/pages/utils/__tests__/assistancePolicy.test.ts` (5 testes unitários de elegibilidade).
- `erp/src/pages/types/order.type.ts` (tipagem de `OrderAction` e `IsButtonsClicked`).
- `erp/src/pages/App/SalesOrder/OrderActions/orderButtonsConfig.ts` (configuração do botão `generateAssistance`).
- `erp/src/pages/App/SalesOrder/OrderActions/orderActionsConfig.ts` (registro da ação no mapa de ações).
- `erp/src/pages/App/SalesOrder/OrderActions/orderActionValidationRules.ts` (regra de validação com `canGenerateAssistance`).
- `erp/src/pages/App/SalesOrder/OrderHistoryList/OrderMenuActiveActions.tsx` (filtro no menu de contexto).
- `erp/src/pages/App/SalesOrder/PdvActions/Index.tsx` (exclusão no pós-venda).
- `erp/src/pages/App/SalesOrder/hooks/useSalesOrderModals.ts` (estado e handler `generateAssistance`).
- `erp/src/pages/App/SalesOrder/hooks/useSalesOrderModals.test.tsx` (testes de orquestração de modais).
- `erp/src/pages/App/SalesOrder/modals/SalesOrderModalsContainer.tsx` (renderização condicional de `<AssistanceOrderModal sourceOrder={assistanceSourceOrder} />`).
- `erp/src/pages/App/SalesOrder/components/SalesOrderTopToolbar.tsx` (label "Nova Assistência Avulsa").
- `erp/src/pages/App/SalesOrder/Assistance/types/assistance.types.ts` (prop `sourceOrder?: Order`).
- `erp/src/pages/App/SalesOrder/Assistance/components/AssistanceOrderHeader.tsx` (títulos dinâmicos e badge da venda vinculada).
- `erp/src/pages/App/SalesOrder/Assistance/components/AssistanceLinkedOrderSection.tsx` (card do pedido vinculado e itens para seleção).
- `erp/src/pages/App/SalesOrder/Assistance/hooks/useAssistanceOrderForm.ts` (suporte a `sourceOrder`, cliente/vendedor e remoção de modal de busca).
- `erp/src/pages/App/SalesOrder/Assistance/AssistanceOrderModal.tsx` (composição limpa sem `OrderSelectionModal`).
- `erp/src/pages/App/SalesOrder/Assistance/__tests__/AssistanceOrderModal.test.tsx` (testes de renderização avulsa e vinculada).

**Validações e Testes Executados:**
- 17 testes executados com Vitest e 100% aprovados:
  - `assistancePolicy.test.ts` (5 testes): aprovação de pedidos atendidos/entregues/concluídos e exclusão de cancelados/rascunhos/devoluções/assistências.
  - `useSalesOrderModals.test.tsx` (4 testes): validação do handler `generateAssistance` e abertura do modal vinculado.
  - `AssistanceOrderModal.test.tsx` (4 testes): validação de formulário avulso sem vínculo, fechamento, formulário vinculado com `sourceOrder` e seleção de itens, e modo de edição.
  - `assistanceOrderService.test.ts` (4 testes): payload e validação pura de rascunhos.
- Suíte geral de pedidos de venda (`SalesOrder`) executada com 511 testes aprovados.

---

## Política de produto — CC-e ausente do sistema

**Diretriz vigente, obrigatória para todos os agentes:** o MoranteHub **NÃO utiliza Carta de Correção Eletrônica (CC-e)**. Não criar, restaurar nem oferecer formulário, botão, menu, modal, rota ou fluxo de CC-e; a proibição inclui tela dedicada de histórico. A correção fiscal adotada é **cancelamento fiscal ou estorno fiscal direto da NF, conforme a elegibilidade vigente**. Esta diretriz de produto não altera automaticamente os critérios de circulação da mercadoria.

**Causa da confusão:** a interface de documentos ainda carregava um hook/modal/cliente de CC-e e conservava um item condicionado no menu. O bloqueio da API e de `canIssueCce` impedia emissão, mas código de interface legado permitia interpretar CC-e como funcionalidade do produto. A referência a uma tela histórica no checkpoint imediatamente abaixo está substituída por esta política.

**Correção:** removidos `useFiscalCceModal.ts`, `FiscalCceModal.tsx` e `fiscalCceService.ts` do frontend; removidos imports/montagem/callbacks da página, tabela, linha, card e menu de documentos. Regressões passaram a exigir ausência de CC-e no menu e manutenção do bloqueio da API legada. Regras de cancelamento/estorno fiscal e elegibilidade por circulação não foram modificadas. Nenhum evento/XML/protocolo antigo foi apagado: artefatos técnicos legados servem à auditoria/reconciliação técnica e não autorizam recriar uma funcionalidade de CC-e.

**Documentação vinculante:** esta referência no índice fiscal, FISCAL-016 em `invariantes-arquiteturais.md` e a regra explícita em `AGENTS.md` prevalecem sobre snapshots ou referências antigas a CC-e. Não usar documentação antiga como justificativa para reintroduzir a funcionalidade.

**Reforço no ponto de entrada da documentação:** `docs/fiscal/README.md:5` passa a exibir a proibição antes das referências, para que o crescimento do histórico não esconda a política. A conferência textual confirmou a mesma regra em `AGENTS.md:37`, FISCAL-016 e neste registro. Alteração somente documental, sem mudar critérios de circulação, cancelamento ou estorno; nenhuma operação fiscal executada.

**Prova inicial:** 58 testes em sete arquivos aprovados, incluindo 13 do menu (ausência de CC-e nos dois modelos/ambientes e ações mantidas), quatro do endpoint legado, três do XML técnico e seis fronteiras fiscais. As outras 32 provas são etiquetagem e preenchimento assistido. Busca em erp/src não encontra referências aos três módulos removidos nem onOpenCce. Log: scratch/rhf-no-cce-labeling-tests.log. Lint do lote sem erros (dez avisos anteriores no FormHeader); build inicial aprovado em1m35s. Gate final com confirmação da biblioteca de devolução/FormHeader: **65 testes em nove arquivos e build ERP completo com startup fiscal aprovado em1m51s** (scratch/rhf-no-cce-final-{tests,build}.log). TypeScript global tem 304 diagnósticos; mantém erro anterior na assinatura de salvamento do OrderEditModal fora do callback alterado e fixtures fiscais, sem diagnóstico nas fontes da retirada de CC-e. Sem transmissão, alteração de dados comerciais, migration ou deploy.

**Arquivos e linhas da retirada:**

| Arquivo | Região modificada |
|---|---|
| erp/src/pages/App/FiscalDocuments/index.tsx | imports/hook/montagem retirados (antigas12,20,74–76,194,212–228); tabela atual178–191 sem callback CC-e. |
| erp/src/pages/App/FiscalDocuments/components/FiscalDocumentsTable.tsx | remoções nas linhas antigas27,49,90; regiões atuais26,47,87. |
| erp/src/pages/App/FiscalDocuments/components/FiscalDocumentRow.tsx | remoções antigas29,50,180; regiões atuais28,48,177. |
| erp/src/pages/App/FiscalDocuments/components/FiscalDocumentCard.tsx | remoções antigas25,69; regiões atuais24,67. |
| erp/src/pages/App/FiscalDocuments/components/FiscalDocumentRowActions.tsx | remoções antigas3,20,43,177–187; regiões atuais2,18,40,173. |
| erp/src/pages/App/FiscalDocuments/hooks/useFiscalCceModal.ts | arquivo removido integralmente (115 linhas no baseline). |
| erp/src/pages/App/FiscalDocuments/modals/FiscalCceModal.tsx | arquivo removido integralmente (177 linhas no baseline). |
| erp/src/pages/App/FiscalDocuments/services/fiscalCceService.ts | arquivo removido integralmente (83 linhas no baseline). |
| shared-utils/legacyFiscalFormSchemas.ts:4 | comentário explicita rejeição defensiva, sem UI/fluxo de produto. |
| erp/src/pages/App/FiscalDocuments/__tests__/fiscalDocumentRowActions.test.tsx:49 | quatro regressões de ausência de CC-e; removido handler legado; fixture de permissão e eventos DOM do menu alinhados ao componente existente. |
| erp/src/pages/App/FiscalDocuments/__tests__/fiscalDocumentsComponents.test.tsx | removidos import/teste do modal excluído; título atual de cancelamento e happy-dom local. |
| erp/src/pages/App/FiscalDocuments/__tests__/remainingFiscalForms.test.tsx:14 | teste defensivo executa resolver real sem recriar proprietário CC-e. |
| AGENTS.md; docs/fiscal/invariantes-arquiteturais.md (FISCAL-016); README.md; inventários e este registro | política explícita e referências vigentes. |


## WhatsApp nas configurações — submissões com snapshot parseado

**Causa comprovada:** conexão/lista/teste tinham resolvers separados sem trava comum, prazo ou guarda de contexto. A busca de modelos ignorava os valores parseados e lia o cache; o envio lia credenciais do cache mesmo que campos visíveis já tivessem mudado. Erros eram apenas toast/log e resposta tardia podia publicar dados de outra conta.

**Correção:** três intenções mantêm resolver real até recibo, com trava comum desde o clique, prazo20s para consultas/30s para envio, erro/progresso e campos bloqueados. Comando de envio inclui configuração/telefone/modelo/idioma/quantidade parseados; zero variáveis continua permitido. Serviços aceitam override optativo de conta/credenciais (contrato legado preservado) e usam-no nos headers, inclusive fallbacks já existentes. Conexão pede id e exige o mesmo telefone; lista exige resposta em array; envio exige ID retornado pela Meta. ID/snapshot de usuário/conta/telefone/modelo impedem aplicar resposta antiga. Consulta de outra conta limpa lista anterior. Mesmo teste confirmado/incerto bloqueado na instância, inclusive após timeout. Recusa explícita da Meta ou do guard antes de envio recebe confirmedFailure=true e permite corrigir/repetir; rejeição de transporte/recibo ausente permanece incerta. Não foi enviada mensagem real.

**Arquivos/linhas:** shared-utils/messagingFormSchemas.ts:37–39 (idioma parseado/comando com config); erp/src/pages/App/Settings/components/integrations/WhatsAppConfigSection.tsx:1–11,54–125,fieldset/status/controles (três resolvers, trava/contexto/prazos/ACK); novo WhatsAppConfigSection.test.tsx (dez provas); erp/src/pages/utils/metaService/metaWhatsAppService.ts:263–274 (override da consulta/headers); metaTemplateSender.ts:17–24,58,67,87,111,141 (override nos fallbacks e recusa confirmada); metaHttpClient.ts:89 (id explícito na conexão); metaService/__tests__/metaWhatsAppService.test.ts:1–44 (quatro provas novas de serviço/headers/guard). Serviços e versões da Meta existentes preservados. Utilitários de feed com URL fixa não são submissões de dados do usuário; conteúdo das mensagens de teste permanece o anterior.

**Validação conjunta com Settings:** **69 testes em nove arquivos aprovados**, incluindo dez do proprietário WhatsApp, 13 do serviço Meta, 14 de Settings/composição e sanitização de segredos fiscais. Lint dos 12 arquivos sem erros/avisos. TS ERP mantém 304 diagnósticos, nenhum nas fontes/testes alterados; build ERP completo com startup fiscal aprovado em 1m48s. Logs scratch/rhf-settings-whatsapp-final-{tests,lint,tsc,build}.log. Todos os transportes/guard/telemetria são simulados; sem conta alterada, mensagem externa, DDL/SQL, transmissão fiscal ou deploy. Nenhuma prova de entrega Meta/credenciais/permissões remotas; ID aceito não equivale a entrega ao destinatário. Bloqueio de repetição é local à instância, não idempotência global no provedor.

**Fonte de API:** localizada a [coleção oficial da Meta no Postman](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api?entity=request-13382743-a03d0db1-f135-4db6-9534-3cb9a7049e58). A página direta developers.facebook.com retornou 429 nesta consulta; não se declara validação do comportamento remoto. GET/header/POST/fallbacks foram verificados com fetch simulado e contratos atuais do repositório, sem troca de versão da API.

**Cobertura:** Settings e WhatsApp são proprietários independentes conferidos. ERP 112/131 itens encerrados (85,5%), 19 pendentes. Build final aprovado; demais formulários e inventários mobile/catálogo continuam pendentes.

## Configurações gerais — autosave confirmado pelo proprietário

**Causa comprovada:** timers/efeitos de persistência estavam dentro do updater de setSettings. Saves usavam modo legado local-first (sem recibo), uma confirmação/consulta antiga podia apagar edição recente e o resolver não serializava uma nova intenção durante o serviço anterior. A página não distinguia leitura de nuvem confirmada de defaults/cache.

**Correção:** useSettingsForm é proprietário do rascunho e campos filhos; atualização imutável ocorre fora do updater, debounce de 1s/fila/RHF até saveSettings(confirm:true), um submit por revisão e merge dos campos editados sobre notificações. Modo confirmado existente exige recibo/id/payload, limita gravação de 20s e só depois publica cache; falha conhecida permite retry, incerteza interrompe fila e conserva rascunho/erro. Leitura confirmada pertence ao contexto do usuário, inclusive na janela entre render/effect de troca de sessão. Contexto por usuário/desmontagem cancela timers e respostas antigas; edição bloqueada até leitura remota confirmada. Tema tem resolver derivado do schema comum antes de aplicar preferência local. Assinatura adicionou callback optativo de status remoto, com prazo de 15s existente, sem alterar contrato dos demais chamadores; falha de cache não invalida leitura remota. Busca visual local continua sem I/O. Ações independentes dos filhos (WhatsApp/CSOSN/etc.) conservam proprietários próprios.

**Arquivos/linhas:** erp/src/pages/App/Settings/hooks/useSettingsForm.ts (novo proprietário,1–140); index.tsx:2–3,26–35,75,91–95,261 (composição/feedback/bloqueio); novo Settings.owner.test.tsx (página/campo real, hook/resolvers e serviço reais, somente transporte/contextos simulados); novo hooks/useSettingsForm.test.tsx (12 provas); erp/src/pages/utils/settings/storage.ts:81–115 (callback opcional/cache no SELECT); settings/__tests__/settingsConfirmed.test.tsx:38–52 (duas provas adicionais de leitura). Schema estrutural de domínio AppSettingsFormSchema e migração sanitizadora existentes reutilizados.

**Validação:**37 testes em cinco arquivos aprovados, incluindo 14 provas do proprietário/composição e 14 da confirmação. Lint específico sem erros/avisos; build ERP completo com startup fiscal aprovado em1m54s. TS global mantém304 diagnósticos, nenhum nas fontes/testes alterados do lote; sem alegação de aprovação global. Logs scratch/rhf-settings-owner-{tests,lint,build,tsc}.log. Sem configuração real alterada, envio, SQL/migration ou SEFAZ. Não há prova remota de RLS/concorrência/versionamento entre clientes: confirmação de snapshot não constitui controle de concorrência otimista. Bloqueio incerto dura na instância. Campos desconhecidos e metadados transitórios de importação permanecem; sanitização de segredos fiscais continua no serviço existente.

**Cobertura:** proprietário principal de Settings conferido. WhatsAppConfigSection foi conferido separadamente na continuação abaixo; a prova de aparência não o certifica.

## CSOSN de homologação — proprietário conferido

**Problema e causa:** HmlCsosnSettings liberava o resolver antes do serviço de persistência, permitia nova submissão entre validação/espera e não limitava a leitura inicial. Uma resposta apenas tipada como HML podia ser publicada sem conferir ambiente/modelo/CRT/produção/versão ou o valor efetivamente salvo.

**Solução:** RHF mantém o contrato até o recibo, com trava síncrona comum, prazo15s na leitura/20s na escrita, erro/progresso e retry protegido de leitura. Salvamento fica indisponível sem leitura confirmada. Schema explícito do recibo reutiliza CSOSN_CODES e exige ambiente2/modelo55/CRT1/productionApprovedfalse/versão não vazia; recibo de escrita deve confirmar o CSOSN solicitado. Timeout/rejeição/recibo inválido conservam estado e bloqueiam repetição na instância até revisão/recarregamento. Resposta de componente desmontado não altera UI. Política tributária, API, permissões e padrão inicial103 permanecem.

**Regressão de teste encontrada:** csosnConfigurationApi.test esperava103/500 apesar de seus próprios itens já conterem snapshot102. O código existente de resolvePreparedItems prioriza esse snapshot; a expectativa foi alinhada a102 para os dois itens. Não houve alteração de lógica fiscal ou do backend. A provenance textual existente source=catalog foi preservada.

**Arquivos/linhas:** shared-utils/fiscalOperationFormSchemas.ts:8–11 (schema explícito do recibo); erp/src/pages/App/Settings/components/fiscal/HmlCsosnSettings.tsx:1–4,17–59,select/botão/status/retry (resolver/guardas/prazos/recibo); HmlCsosnSettings.test.tsx:1–103 (fixtures completas e dez provas); erp/src/pages/utils/nfe/__tests__/csosnConfigurationApi.test.ts:111–118 (nome/expectativa de snapshot existente). Inventário principal, migração, índice e este registro atualizados.

**Provas:**32 testes em quatro arquivos aprovados (dez do painel,12 da política, quatro da API e seis fronteiras fiscais); lint específico sem erros/avisos. TS ERP mantém304 diagnósticos globais, nenhum no painel/schema/testes alterados. Build ERP completo com startup fiscal aprovado em 1m33s. Logs scratch/rhf-hml-csosn-{tests,lint,tsc,build}.log. Serviços/API/banco simulados: sem configuração real modificada, escrita remota, Auth real, SEFAZ ou deploy. Consumidor ativo FiscalSettingsSection → HmlCsosnSettings; Settings agregado mantém linha própria.

**Cobertura:** ERP110/131 itens conferidos/encerrados (84,0%),21 pendentes. Não é conclusão global; mobile/catálogo conservam seus inventários.

## Continuação final dos formulários — checkpoint109/131

A biblioteca de confirmação de abertura da devolução tem contrato explícito de revisão e espera do callback, sem conter itens nem ter consumidor localizado. Catálogo: categorias conferidas, autosave de produto sem repetição por estado próprio e UUIDs preservados; uploads do agregado ainda pendentes. Mobile: lançamento manual aguarda refresh/fechamento, mensagens/reenvios e confirmação financeira têm guardas/recibos; voz/live ainda pendentes. **ERP109/131 encerrados (83,2%),22 pendentes**, incluindo retirada de CC-e e bibliotecas retidas. **65 testes ERP,42 móveis e48 catálogo aprovados; builds ERP/Next aprovados.** TS catálogo aprovado; TS ERP304 globais e mobile30 externos, sem declaração de aprovação global. [Causas, arquivos/linhas, logs e limites completos](../forms/continuidade-formularios-2026-10-16.md). Sem operação remota/transmissão.

## Etiquetagem — biblioteca conferida

**Causa comprovada:** StockCheckModal conservava checks por índice entre pedidos/aberturas e permitia editar/fechar enquanto aguardava callback sem prazo.

**Correção:** contrato compartilhado de etiquetagem com RHF até o callback, seleção por abertura/contexto e snapshots preservados; trava/erro/progresso/prazo de 30s, recusa e bloqueio incerto. Biblioteca retida, sem consumidor ativo localizado; o badge operacional tem proprietário distinto. Não reativada por inferência.

**Prova:** dez testes do modal/resolver reais, incluindo contexto, falha, timeout, espera e snapshots; incluídos nos 58 testes aprovados do lote de retirada de CC-e. Arquivos: shared-utils/operationsFormSchemas.ts (createStockLabelingFormSchema); erp/src/pages/App/SalesOrder/OrderHistoryList/StockCheckModal.tsx:6–119; StockCheckModal.test.tsx (dez provas). O esboço anterior de uma interface histórica de CC-e foi descartado e removido conforme a política acima.

## Pedido assistido, lançamento móvel e produto do catálogo — continuação

**Pedido assistido ativo:** SmartAIFillModal chamava método inexistente da fachada IA (parseOrderFromFreeText), encerrava resolver antes do I/O e descartava a promessa de aplicação no FormHeader. Usa parseOrderFreeText real, prompt/JSON/payload parseados, contratos de rascunho incompleto, prazo por etapa, trava comum/contexto/voz e arquivo tardios, erro/progresso. FormHeader retorna a promessa e isola por pedido; callbacks de importação retornam false após erro, sem anunciar aplicação bem-sucedida. Importação abre o rascunho de cliente quando necessário; não equivale a salvar/finalizar o pedido. Arquivos: SmartAIFillModal.tsx:9–255,324–605; novo SmartAIFillModal.test.tsx (18 provas); FormHeader.tsx:22,99–108; SalesOrderFormSection.tsx:16; steps/SalesOrderStepPanels.tsx:20; pages/NewSaleOrder.tsx:82–104; modals/OrderEditModal.tsx:153–178; novo FormHeader.smartFill.test.tsx (três integrações reais). Paths relativos a erp/src/pages/App/SalesOrder. Provas do modal +assistidos21/21 e integração+modal21/21 aprovadas; lint específico limpo. 18 provas do modal incluídas no lote conjunto de58; build acima. Não é conferência global do OrderEditModal.

**Lançamento financeiro móvel:** useTransactionForm.ts:23,76–144,283–357 em mobile/src/features/finance/hooks estende schema financeiro comum com campos do proprietário, mantém RHF até create/update com payload parseado, guarda/prazo20s/erro/finally, categorias não apagam rascunho e consulta colaboradores tem prazo15s. Novo erp/tests/mobile-forms/manualTransactionOwner.test.tsx (14 provas); suite móvel30/30, lint limpo e TS móvel mantém22 diagnósticos externos, nenhum no hook. Consumidor FinanceHubScreen → NewTransactionModal. Create exige data.id; update confirma apenas o ACKbooleano do serviço, sem provar linha afetada. Contexto incerto bloqueado enquanto a instância estiver montada; sem dispositivo ou escrita remota. Logs scratch/rhf-mobile-manual-transaction-{tests,lint,tsc}.log.

**Produto no catálogo — proprietário parcial:** digital-catalog/src/features/products/components/admin-modal/hooks/useAdminProductSave.ts:56–350 conserva contratos distintos de rascunho/final, fila única autosave/conclusão, RHF até recibo/payload confirmado, prazo20s, contexto/cleanup, erros de relacionamento/status e bloqueio incerto. Novo erp/tests/catalog-forms/adminProductOwner.test.tsx (17 provas) aprovado; TS completo catálogo e lint focal aprovados. Upload iniciado posteriormente por Step1Photos ainda não participa da fila; callback vazio de substituição de imagem continua pendente. Logo o proprietário agregado continua pendente. Sincronização Meta é background independente após publicação confirmada. Sem transação remota comprovada ou escrita real.

**Cobertura:** ERP108/131 itens conferidos/encerrados,23 pendentes (82,4%); o incremento inclui retirada de CC-e por determinação do usuário, biblioteca de etiquetagem e pedido assistido. Não são108 formulários operacionais migrados. Mobile acrescenta o proprietário manual; catálogo registra prova parcial do hook, sem declarar agregado concluído. Inventários próprios continuam vinculando filhos e efeitos; nenhum percentual global é afirmado.

## Vínculo após cadastrar produto — confirmação e persistência conferidas

**Causa comprovada:** `handleCreatedProductFromModal` liberava o resolver antes das consultas/gravações e limpava o alvo mesmo após falha. O `onSuccess` do submit de produto e a conclusão do modal de resultado descartavam a promessa. `ManageInboundInvoiceMappingsModal.handleItemChange` descartava a promessa da gravação; o serviço genérico mantinha fallback em cache mesmo após erro remoto, impedindo distinguir confirmação remota.

**Correção aplicada:** comando próprio inclui item atual/código/descrição/fornecedor e produto/variação; RHF acompanha recarga obrigatória, gravação, consulta de confirmação e callback de aplicação. Resposta incerta bloqueia replay e preserva produto/alvo; falha antes da escrita permite retomada explícita. Submit e conclusão do produto aguardam o callback e respeitam recusa `false`; a conclusão mostra erro sem fechar. Seleção/remoção têm a mesma proteção até confirmar associação/ausência e aplicar no item. Mapeamentos aguardam seu resolver até salvar e confirmar, possuem prazo/trava/erro/contexto e callback de refresh separado da confirmação. Modo optativo `requireConfirmation` no serviço exige recibo do cabeçalho/itens e não publica cache prematuro; o contrato legado de fallback dos demais chamadores permanece. Isso não constitui transação entre tabelas: falha parcial fica incerta e bloqueada para revisão.

**Proprietário adicional localizado:** `ProductSaveResultModal` também altera ativação ERP/publicação. As duas ações agora executam o contrato compartilhado de produto salvo no resolver até o ID confirmado, com trava comum, contexto/prazo/erro e bloqueio por produto em resultado incerto. Conclusão usa o mesmo contrato, conserva recusa do callback e não repete o cadastro para tentar novamente a etapa seguinte. Adicionado ao inventário principal; requisitos de origem de estoque e permissão de catálogo permanecem. Foram alinhados imports de tipo/contratos dos callbacks na extração local prévia `ProductFormSubModals`, sem desfazer a composição existente.

**Arquivos e linhas modificados neste lote:**

| Arquivo | Linhas / região modificada |
|---|---|
| `shared-utils/inboundProductLinkFormSchemas.ts` | 71–99: comando pós-cadastro e contrato de mapeamentos/NCM/composição. |
| `shared-utils/productDomainValidation.ts` | 121–127: contrato próprio do produto já salvo. |
| `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceProductCreation.ts` | 4, 23, 88–99, 310–373: comando aguardado até recarga/gravação/consulta/aplicação. |
| `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceItemsReview.ts` | 36–37, 45, 78–84, 161–164, 184–186, 248–309, retorno do hook: seleção/remoção com resolver e contexto/erro/trava. |
| `erp/src/pages/App/Stock/InboundInvoices/components/InboundInvoiceItemsReview.tsx` | 16, 42–45, 65: callback assíncrono e feedback/bloqueio dos filhos. |
| `erp/src/pages/App/Stock/InboundInvoices/modals/ManageInboundInvoiceMappingsModal.tsx` | 1, 14, 20, 33–43, 88–132, 136–189, 212–239, fechamento do fieldset: consultas, persistência aguardada e feedback. |
| `erp/src/pages/utils/inboundNfe/services/inboundInvoicesMutationService.ts` | 37–45, 57, 110–128, 174–205: confirmação optativa, guardas entre I/O e cache após recibo. |
| `erp/src/pages/App/Products/hooks/form/useProductFormSubmit.ts` | 28, 215: assinatura e espera de onSuccess/recusa false. |
| `erp/src/pages/App/Products/hooks/form/useProductFormModal.ts` | 42: contrato assíncrono de onSuccess. |
| `erp/src/pages/App/Products/modals/ProductFormModal.tsx` | 25: contrato assíncrono de onSuccess. |
| `erp/src/pages/App/Products/components/form/ProductFormSubModals.tsx` | 2–3, 21, 25, 28, 31, 110–112: imports de tipo/callbacks reais e promessa de onSave preservada. |
| `erp/src/pages/App/Products/components/modals/product/ProductSaveResultModal.tsx` | 1–9, 12, 41, 62–194, 215, 326, 475, 501–507: três intenções no resolver, callback aguardado, erro/progresso/trava/ACK. |
| `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceCreatedLink.test.tsx` | arquivo novo: 14 provas do callback e suas fronteiras. |
| `erp/src/pages/utils/inboundNfe/__tests__/inboundMappingConfirmation.test.ts` | arquivo novo: dez provas da confirmação estrita e preservação do fallback legado. |
| `erp/src/pages/App/Stock/InboundInvoices/modals/ManageInboundInvoiceMappingsModal.test.tsx` | arquivo novo: nove provas de persistência, payload, falha, callback, contexto e prazo. |
| `erp/src/pages/App/Stock/InboundInvoices/modals/ManageInboundInvoiceMappingsModal.suggestions.test.tsx` | 1: ambiente happy-dom existente no projeto, pois o jsdom local requer canvas nativo indisponível. Três regressões mantidas. |
| `erp/src/pages/App/Stock/InboundInvoices/components/InboundInvoiceItemsReview.test.tsx` | imports, preparação e oito provas novas da seleção/remoção aguardadas, incerteza e prazo; dez testes no arquivo. |
| `erp/src/pages/App/Products/hooks/form/useProductFormSubmit.test.tsx` | novo teste inicial: espera/recusa de onSuccess do cadastro existente. |
| `erp/src/pages/App/Products/components/modals/product/ProductSaveResultModal.test.tsx` | imports/preparação, fixtures com itemType e sete provas novas; dez no arquivo. |
| `docs/audits/fiscal-2026-10-14/form-migration-inventory.md`, `docs/forms/migracao-rhf-zod-2026-10-14.md`, `docs/fiscal/README.md`, este histórico | cobertura, disposição das bibliotecas e referências atuais. |

**Validação final conjunta:** **157 testes em 14 arquivos aprovados**, incluindo as bibliotecas assistidas (`scratch/rhf-assisted-created-link-final-regression.log`). Após o último ajuste de dependências/no-op da consulta, 22 testes dos três proprietários afetados foram repetidos e aprovados (`rhf-assisted-created-link-last-source-tests.log`). Lint do lote sem erros (18 avisos naquele log; o aviso novo de dependência foi eliminado e lint dos últimos três arquivos passou sem avisos: `rhf-assisted-created-link-final-lint.log`, `rhf-assisted-created-link-last-source-lint.log`). **Build ERP completo com startup fiscal aprovado em 1m31s** (`rhf-assisted-created-link-final-build.log`). TypeScript global mantém **305 diagnósticos**, nenhum nas fontes ou testes alterados deste lote (`rhf-assisted-created-link-final-tsc.log`); fontes de outra extração local, como ProductFormTabContent, continuam com diagnósticos próprios. Não há declaração de TS global aprovado.

**Fonte da API:** documentação oficial de [upsert com retorno via select](https://supabase.com/docs/reference/javascript/upsert), consultada em 16/10; changelog atual arquivado em `scratch/supabase-changelog-forms.md`. A confirmação compara IDs/JSONB e quantidade de itens, sem afirmar atomicidade conjunta nem RLS/transações remotas comprovadas. Transporte, autocomplete, editor completo de produto e persistência remota são simulados nas provas. Nenhuma gravação remota, migration, Auth real, emissão ou deploy.

**Cobertura:** quatro itens anteriores conferidos (WhatsApp, bibliotecas de recebimento/voz e mapeamentos) e um proprietário antes ausente acrescentado/conferido (pós-cadastro/canais). **ERP 105/131 (80,2%), 26 pendentes.** Classificação de entrada, variação assistida e demais pendências conservam linhas próprias; mobile/catálogo ainda não estão globalmente conferidos.

## WhatsApp e bibliotecas assistidas — conferência de submissões

**Problema e causa comprovada:** o WhatsApp usava formulários separados sem trava comum entre envio direto e link manual, não aguardava callbacks e não limitava a espera. No recebimento assistido, a validação de texto acabava antes da interpretação; o modal podia fechar sem concluir a aplicação. O atendimento por voz lia texto da closure, aceitava telefone parcial, não mostrava erro no componente e disparava sugestões diretamente sem resolver.

**Solução aplicada:** trava comum e callback aguardado no WhatsApp, feedback/timeout e bloqueio do mesmo envio confirmado/incerto na instância; resposta de abertura anterior não fecha destinatário novo. Recebimento mantém os dois resolvers até interpretação/aplicação, descarta contexto antigo, bloqueia fechamento enquanto espera e impede reaplicação após timeout incerto. Atendimento envia texto/telefone parseados, aguarda análise/upload/recibo, protege sessão, mostra erros e usa contrato distinto para sugestões. Telefone opcional continua vazio permitido; telefones preenchidos reutilizam normalização/mínimo10 já existente em mensagens. IA indisponível conserva o fallback anterior do relato bruto. Gravação sem recibo ou rejeitada bloqueia repetição e preserva relato.

**Evidência final:** 8 testes de WhatsApp, 10 de recebimento, 11 de atendimento e 3 regressões assistidas aprovados (32, incluídos no conjunto de 157 acima). Lint sem erros; removida dependência desnecessária do hook. Build completo e TS global com seus limites estão registrados no checkpoint conjunto acima. Testes usam componentes/hooks/resolvers reais e serviços simulados; nenhuma mensagem, áudio, registro ou operação fiscal real.

**Arquivos/linhas:** `shared-utils/messagingFormSchemas.ts:10–24` (telefone/sugestões), `erp/src/components/shared/SendWhatsAppModal.tsx:10–16,31–119,149–235` (trava/callback/prazo/contexto/feedback), `erp/src/components/forms/messagingForms.test.tsx` (oito provas), `erp/src/components/shared/AttendanceVoiceInput.tsx:4–5,17–60,89–210` (comando de sugestão/feedback/bloqueios), `erp/src/hooks/useAttendanceVoice.ts:1–10,17–28,51,76–85,113–265` (payload parseado/recibo/sessão/prazos), `erp/src/components/shared/AttendanceVoiceInput.test.tsx` (novo: onze provas), `erp/src/pages/App/Stock/Receipts/modals/ReceiptAIFillModal.tsx:6,51–82,104–136,145–190,207–264` (dois resolvers aguardados/guardas/feedback) e `erp/src/pages/App/Stock/Receipts/modals/ReceiptAIFillModal.test.tsx` (novo: dez provas).

**Disposição dos consumidores:** `ProductRowModals` monta SendWhatsAppModal para compartilhar produtos; contrato manual conserva telefone/mensagem vazios. `ReceiptAIFillModal` e `AttendanceVoiceInput` não têm import/acionador operacional localizado em `erp/src`; permanecerão bibliotecas conferidas, sem reativação inferida. A aplicação final de recebimento, listeners comerciais das sugestões e captura real de microfone não são comprovados por testes destas bibliotecas. A meta global continua em andamento.

## Cadastro rápido da nota de entrada — preparação no resolver

**Problema e causa comprovada:** o acionador ativo `InboundItemLinkHeader` abria a seleção, mas `QuickRegisterVariationModal` tratava o callback assíncrono como `void`. `useInboundInvoiceQuickRegister` fechava a seleção antes de carregar/preparar o produto, sem prazo ou guarda de contexto. Item e fornecedor não integravam o comando do resolver. O serviço usava `finalCost || unitCost`, substituindo custo final zero.

**Correção:** a seleção e o comando completo executam RHF/zodResolver até terminar a preparação. Modal bloqueado desde o início do resolver, progresso/erro visíveis, prazo de 20s, descarte por item/fornecedor/abertura/desmontagem e seleção invalidada ao editar a busca. Produto pai recarregado deve conservar identidade, disponibilidade e vínculo com o fornecedor. O serviço conserva zero com `??` e verifica contexto entre consultas. Consultas de código são prévias de SKU de produto, sem reserva fiscal ou escrita. Categoria automática conserva o fallback anterior quando há falha conhecida.

**Arquivos e linhas deste lote:**

| Arquivo | Linhas / responsabilidade |
|---|---|
| `shared-utils/operationsFormSchemas.ts` | 35: normalização do identificador selecionado. |
| `shared-utils/inboundProductLinkFormSchemas.ts` | 3–20: contrato explícito do item e comando de preparação. |
| `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceQuickRegister.ts` | 1–6, 20, 33–107: resolver até resultado, contexto do item atual, prazo, trava e produto pai revalidado. |
| `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceItemsReview.ts` | 139: itens da nota encaminhados ao proprietário da preparação. |
| `erp/src/pages/App/Stock/InboundInvoices/modals/QuickRegisterVariationModal.tsx` | 1–6, 30, 42–98, 110, 135, 143–147, 197–203, 223–232: RHF aguardado, bloqueios, feedback, invalidação da seleção. |
| `erp/src/pages/App/Stock/InboundInvoices/services/inboundProductPreparationService.ts` | 118–128, 155–167, 194: guarda entre consultas e custo final zero nos dois modos. |
| `erp/src/pages/App/Stock/InboundInvoices/components/InboundQuickRegister.test.tsx` | 1–146: 25 provas diretas da composição ativa, falhas, contexto, disponibilidade, fornecedor, fechamento, prazo e zero. |
| `docs/audits/fiscal-2026-10-14/form-migration-inventory.md` | linhas dos proprietários QuickRegisterVariationModal e ManageInboundInvoiceMappingsModal: payload correto, cobertura e pendência posterior explícitos. |
| `docs/forms/migracao-rhf-zod-2026-10-14.md`, `docs/fiscal/README.md`, este histórico | checkpoint e referência vigente deste lote. |

**Validação final:** 59 testes em cinco arquivos aprovados, incluindo 25 diretos (`scratch/rhf-quick-register-regression.log`). Lint sem erros, 21 avisos em código anterior (`rhf-quick-register-lint.log`); build ERP completo com startup fiscal aprovado em 1m49s (`rhf-quick-register-build.log`). TypeScript global registra 316 diagnósticos fora dos arquivos deste lote, sem diagnóstico no teste novo ou fontes alteradas (`rhf-quick-register-tsc.log`); o fixture recebeu o CFOP obrigatório. Revisão focada final sem achados. Linha/proprietário/modal/resolvers e serviços de preparação são reais; transporte, autocomplete e editor final são simulados. Isso comprova preparação até abrir o produto, sem comprovar o salvamento posterior, consulta de autocomplete ou persistência remota.

**Pendências preservadas:** `handleCreatedProductFromModal` ainda encerra o resolver antes de recarregar/gravar o vínculo, fecha antes do resultado e limpa estado após falha. Salvar produto/vincular e salvar mapeamentos continuam pendentes no agregado; edição direta de produto possui caminho próprio. Inventário ERP permanece **100/130, 30 pendentes**, pois a seleção já estava marcada; corrigida sua descrição antiga de payload, sem incremento artificial. Mobile/catálogo continuam em inventários separados. Sem operação remota, SQL, Auth real, emissão ou deploy.

## Formulário de variações — composição em conferência

**Continuação vigente:** recorte/envio/propagação e busca conferidos no [registro posterior](#variações--recorte-envio-propagação-e-busca-conferidos). O agregado foi encerrado após137 testes e build completo; o checkpoint abaixo é histórico.

Problemas constatados no proprietário/composição: fechamento e edição continuavam habilitados durante gravação; a operação não possuía prazo/guarda de contexto; atributos incompletos eram filtrados antes do resolver e componentes sem produto/quantidade mínima passavam na conclusão. Descontos fora dos limites podiam virar uma prévia de preço zero e perder a entrada inválida antes da validação. Consultas de atributos/fotos não tinham prazo nem proteção contra publicar retorno de outro contexto.

Implementado: contrato de conclusão distinto do rascunho em `shared-utils/productVariationValidation.ts`, preservando linhas incompletas para erro e validando desconto exibido na intenção. O proprietário `useVariationForm.ts` mantém resolver/trava até callback ou serviço finalizar, com prazo de 60s, guarda de sessão entre aberturas e bloqueio de sucesso/repetição após resultado incerto. Fechamento por cabeçalho, backdrop, Cancelar e Escape compartilha a trava; campos/abas ficam desabilitados e erro/progresso visíveis em `VariationFormModal.tsx`. Consultas de fotos/atributos têm prazo de 10s e guarda; aba técnica tem prazo de 15s, erro distinto de ausência e repetição com consulta nova. Seleção de componente preserva preço/estoque zero com `??`. O contrato de callback conserva `void`/`true` para conclusão e `false` para recusa explícita; somente valores parseados da variação seguem para ele, sem os campos auxiliares de desconto.

**99 testes em 11 arquivos aprovados**, incluindo 26 provas do modal/hook/abas/RHF reais com serviços/transporte simulados (`scratch/rhf-variation-composition-final-tests.log`). Cobertura: abas reais de identificação/descrição/preço/características/componentes/fotos, herança de variação única, perfil estoquista, linhas incompletas, desconto inválido, composição preservando zero, callback/serviço aguardados, fechamento/edição durante gravação, recusa explícita, erro de rede, prazo e reabertura, desmontagem durante resolver, troca de contexto e fotos tardias. **Lint sem erros e cinco avisos anteriores** de efeitos/código sem consumidor (`scratch/rhf-variation-composition-final-lint.log`). A fixture de precificação usa agora happy-dom, pois jsdom exigia o módulo nativo canvas ausente; nenhum desses cinco testes usa canvas. A primeira execução com jsdom não é contada como gate aprovado.

Arquivos e linhas desta continuação:

| Arquivo | Linhas | Alteração |
| --- | --- | --- |
| `shared-utils/productVariationValidation.ts` | 48–82 | Conclusão valida atributos/componentes e intenção com descontos; rascunho preservado. |
| `erp/src/pages/App/Products/hooks/variation/variationForm.types.ts` | 8–12 | Guarda da operação. |
| `erp/src/pages/App/Products/hooks/variation/useVariationForm.ts` | 1–114; 225–277; 377; 404–552; 554–557; 600–613 | Resolver/intenção, sessão/trava/erro/prazo, consultas protegidas, preservação de linhas e barreira de contexto para substituição de imagem. |
| `erp/src/pages/App/Products/modals/VariationFormModal.tsx` | 1; 9; 56–77; 145; 177; 335; 352–360; 469–477 | Sessão por pai/origem, feedback e controles protegidos. |
| `erp/src/pages/App/Products/components/variationTabs/VariationCompositionItemsTab.tsx` | 45–46 | Seleção conserva zero da variação componente. |
| `erp/src/pages/App/Products/components/variationTabs/VariationTechnicalTab.tsx` | 20; 58; 70–91; 304; 338–347 | Prazo/erro/repetição de consulta; erro não vira ausência; const local exigido pelo lint. |
| `erp/src/pages/App/Products/modals/VariationFormModal.test.tsx` | 1–198 | 26 provas da composição real; providers reais de Query e transporte simulado. |
| `erp/src/pages/App/Products/hooks/variation/useVariationPricing.test.tsx` | 1 | Ambiente happy-dom sem dependência de canvas nativo. |

**TypeScript global mantém 290 diagnósticos**, sem diagnósticos nas fontes alteradas ou no teste novo (`scratch/rhf-variation-composition-final-tsc.log`); seis deles estão em fixtures/testes legados executados, mas não alterados (`VariationTechnicalTab.test.tsx`, `useVariationForm.test.tsx`). **Build aprovado em 2m05s** (`scratch/rhf-variation-composition-build.log`), incluindo geração fiscal e Vite. Diff-check das fontes aprovado.

O inventário permanece **98/129**: a seleção de fotos foi conferida na composição, mas recorte/upload e propagação global de imagem ainda exigem conferência conjunta de propriedade/prazo/erro/concorrência; a consulta do autocomplete compartilhado de componentes também precisa de conferência própria do resolver. Não declarar o modal agregado concluído por presença de resolver no botão principal. A confirmação persistida/transação de `saveVariation`/`updateProduct` e seus efeitos de cache não foram certificados por estes mocks; uma operação subjacente já iniciada pode continuar após o prazo, e a guarda impede publicação/repetição neste proprietário, sem abortar ou reverter o backend. Nenhum I/O remoto, migration, Auth real, SEFAZ ou deploy.

## Mesclagem canônica — confirmação e busca conferidas

Problemas comprovados: o resolver terminava antes da RPC; o serviço convertia ACK vazio em listas vazias e tratava falha de desativar/ocultar a origem somente como log, permitindo sucesso falso. Cabeçalho/backdrop/cancelamento podiam descartar submissão pendente. A busca não tinha prazo e o filtro usava `products.supplier_id` apesar do relacionamento estar nomeado `product`. A cada nova referência do objeto da origem, o hook também descartava a seleção/rascunho.

Correção local: contratos distintos de consulta, comando, identidades e ACK; busca por texto literal com resolver real, debounce/prazo/contexto e filtros no alias correto. Sessões por UUID/contexto mantêm trava comum, geração da seleção e guarda entre aberturas. Resolver acompanha preflight, RPC, conferência de UUID/vínculo canônico e ocultação com ACK condicional; falhas incertas/parciais bloqueiam repetição e não publicam cache/sucesso. Uma origem já mesclada é detectada antes de nova RPC, inclusive em uma nova instância. Estado já inativo/oculto dispensa UPDATE adicional. A RPC e o UPDATE, quando necessário, permanecem etapas separadas; não foi criada atomicidade conjunta nem reescrito histórico pelo cliente.

Arquivos e linhas modificados nesta continuação (referências deste checkout):

| Arquivo | Linhas | Alteração |
| --- | --- | --- |
| `shared-utils/variationMergeFormSchemas.ts` | 1–22 | Comando, busca, identidades, listas únicas de fornecedores no ACK e erro de resultado incerto. |
| `erp/src/pages/utils/productService/productVariationMergeQueries.ts` | 1–22 | Busca literal limitada a 12 opções, prazo, contexto, alias e conferência das opções. |
| `erp/src/pages/utils/productService/productVariationActionsService.ts` | 9; 194–259 | Import e fluxo de mesclagem, preflight, confirmação do vínculo/ocultação e publicação somente após confirmação. A mudança de família anterior permanece preservada. |
| `erp/src/pages/App/Products/ProductList/modals/MergeVariation/useMergeVariation.ts` | 1–100 | Resolver até confirmação, busca, trava, sessão, geração da seleção e guarda de incerteza. |
| `erp/src/pages/App/Products/ProductList/modals/MergeVariationModal.tsx` | 1–184 | Proprietário por origem/contexto, fechamento protegido e feedback distinto de busca/erro/ausência. |
| `erp/src/pages/App/Products/ProductList/modals/MergeVariation.test.tsx` | 1–236 | 43 provas com modal, hook, RHF, busca e serviço reais; transporte simulado. |

**97 testes em seis arquivos aprovados** (`scratch/rhf-merge-variation-final-tests.log`): 43 de mesclagem, 35 da mudança de família, 2 do serviço de atributos, 12 de SKU, 3 do seletor de mesclados e 2 do badge. Cobrem fechamento/duplicidade, seleção antiga, prazo total/de etapa, perda de contexto, respostas inválidas, falha parcial de ocultação, retry após rejeição conhecida e bloqueio de origem já mesclada. **Lint sem erros/avisos** (`scratch/rhf-merge-variation-final-lint.log`). **TypeScript global mantém 290 diagnósticos, nenhum do lote** (`scratch/rhf-merge-variation-final-tsc.log`). **Build final aprovado em 1m50s** (`scratch/rhf-merge-variation-final-build.log`), após a última alteração dos contratos. Diff-check aprovado. O inventário principal passa a **98/129 (76,0%), 31 pendentes**; mesclagem conta como um proprietário, com hook/consulta abrangidos pelo modal. Mobile/catálogo e demais formulários permanecem pendentes.

O filtro de fornecedor segue o alias `product` do relacionamento, conforme [filtros embutidos do PostgREST](https://docs.postgrest.org/en/stable/references/api/resource_embedding.html#embedded-filters); busca usa `imatch` com metacaracteres escapados e string entre aspas conforme [operadores](https://docs.postgrest.org/en/stable/references/api/tables_views.html#operators) e [caracteres reservados](https://docs.postgrest.org/en/v13/references/api/url_grammar.html#reserved-characters). Falha de consulta não é apresentada como ausência.

Limites: a fonte SQL da RPC não está versionada e não foi consultada remotamente. Os documentos de negócio preservados têm descrições distintas de efeitos históricos; esta rodada verifica o contrato do formulário e os estados visíveis, sem certificar a implementação remota de histórico/estoque/fornecedores, RLS, concorrência, rollback ou atomicidade. Listas de fornecedores são validadas no ACK sem impor relação não documentada entre elas e sem inferir transferência persistida. A guarda entre aberturas protege a mesma instância; o preflight identifica vínculo já persistido, mas os mocks não comprovam idempotência durável ou concorrência da RPC. Nenhuma leitura/escrita remota, migration, Auth real, SEFAZ ou deploy. O teste legado que grava no Supabase real não foi executado.

## Mudança de família — proprietário e confirmação conferidos

Problemas comprovados: o resolver de `useMoveVariationFamily` terminava antes de cadastrar atributos/mover; o callback ignorava a trava/contagem regressiva e consultas podiam concluir fora do contexto ou ficar sem prazo. A consulta de contagem ignorava erros. `variationFamilyFormSchema` aceitava ausência de atributos e o proprietário descartava silenciosamente linhas incompletas. O editor de atributos era ocultado sem conflito, impedindo completar uma variação sem atributos. O serviço aceitava ACK vazio e descartava erros de vincular imagens após mover. O helper de atributos usava padrões `ilike` sem proteção para entradas literais e não conferia a linha inserida.

Correção local: contratos explícitos de comando/consulta/ACK, atributos completos/únicos e normalização compartilhada preservando zero; sessões por UUID com guarda, trava comum de fechamento/submissão, contagem de cinco segundos após consulta válida e invalidação ao editar. Consultas limitadas e paginadas conferem origem/contagem/fotos/destinos/conflitos antes de habilitar. Resolver permanece ativo até preparação canônica e confirmação; helpers/serviço verificam guarda entre etapas, limitam esperas e conferem retorno/linha/vínculos de fotos. Resultado incerto/parcial bloqueia repetição na mesma instância, sem declarar sucesso. Cadastramento global de atributos, RPC de vínculo e imagens continuam etapas distintas; não foi criada atomicidade conjunta nem executado SQL remoto.

**49 testes locais em três arquivos aprovados**, incluindo 35 provas com modal/filhos/RHF/helpers/serviços reais e transporte simulado (`scratch/rhf-move-family-verified-tests.log`). As três provas adicionais reproduziram falhas antes das correções: callback de revisão antiga enviando atributos obsoletos (`scratch/rhf-move-family-stale-proof.log`), falta de compatibilidade com `showName` ausente no formato legado (`rhf-move-family-legacy-proof.log`) e paginação continuando depois do prazo do proprietário (`rhf-move-family-query-deadline-proof.log`). A revisão agora possui geração síncrona invalidada ao editar/reconsultar, além do prazo; ausência de `showName` conserva o padrão visível já usado em `productVariationMapper.ts`, enquanto `false` explícito continua obrigatório na confirmação. Ao vencer/falhar a consulta, a guarda impede páginas/etapas novas mesmo se a chamada anterior terminar depois. A busca canônica usa `imatch` ancorado com operadores escapados para aceitar `%`, `_`, `*` e metacaracteres como texto; o operador é documentado pelo [PostgREST](https://docs.postgrest.org/en/stable/references/api/tables_views.html#operators).

**Lint sem erros/avisos** (`scratch/rhf-move-family-complete-lint.log`); **TypeScript com 290 diagnósticos globais, nenhum nos arquivos deste lote** (`scratch/rhf-move-family-complete-tsc.log`); **build final aprovado em 1m42s** (`scratch/rhf-move-family-complete-build.log`). O build foi repetido após as correções reproduzidas de revisão antiga, visibilidade legada e paginação tardia. Diff-check aprovado. O teste legado `moveVariationConcurrency.test.ts` grava em projeto remoto e não integra a suíte local desta rodada. Dois itens principais (modal e hook efetivo) e seus filhos conferidos: **ERP 97/129 (75,2%), 32 pendentes**, além de mobile/catálogo. Os percentuais seguem os itens do inventário e não medem prontidão fiscal.

Arquivos e linhas (prefixo ERP: `erp/src/`):

| Arquivo | Alteração |
|---|---|
| `shared-utils/catalogFormSchemas.ts:30–35` | Atributos obrigatórios, completos e com nomes únicos; valores parseados preservam visibilidade/metadados. |
| `shared-utils/variationFamilyFormSchemas.ts:1–30` | Contratos de UUID/consulta/conflito/comando/ACK, normalização compartilhada preservando zero e erro/guarda de resultado incerto. |
| `pages/App/Products/ProductList/modals/MoveVariationFamilyModal.tsx:1–174` | Sessões por UUID, guarda entre aberturas, fechamento comum, erros/progresso e filhos sob estado do proprietário. |
| `pages/App/Products/ProductList/modals/MoveVariationFamily/useMoveVariationFamily.ts:1–160` | Resolver até confirmação, consultas e prazos, contagem vinculada à revisão, preparação canônica, trava/contexto/resultado parcial e sucesso único. |
| `pages/App/Products/ProductList/modals/MoveVariationFamily/AttributeConflictResolver.tsx:1–57` | Edição mesmo sem conflito, rascunho incompleto acessível, campos identificados e chave estável. |
| `pages/App/Products/ProductList/modals/MoveVariationFamily/utils.ts:1–11` | Reexports dos normalizadores compartilhados e apresentação da família. |
| `pages/utils/productService/productVariationFamilyQueries.ts:1–61` | Origem/contagem/fotos confirmadas, listas/conflitos paginados com ordenação estável, validação e guardas entre etapas. |
| `pages/utils/variationService.ts:9–10,61–122` | Atributo/valor canônicos conferidos, filtros literais, prazos e bloqueio de escritas tardias. |
| `pages/utils/productService/productVariationActionsService.ts:6–8,108–191` | Comando validado, ACK/UUID/pai/SKU/nome/atributos/fotos conferidos, origem removida conferida quando informada, imagens adicionadas com ACK e cache somente ao concluir. |
| `pages/App/Products/ProductList/modals/MoveVariationFamily.test.tsx:1–265` | 35 provas com implementação real e transporte simulado, incluindo fronteiras/legado/contexto/paginação/prazos/resultado parcial. |

Limites: sem leitura/gravação remota, migration, Auth, SEFAZ ou deploy. A definição SQL de `move_variation_to_parent` não está versionada no checkout e não foi consultada remotamente. Testes locais não provam ACL/RLS, formato/semântica remotos do ACK, exclusão do pai, preservação de histórico no PostgreSQL, concorrência de SKU ou atomicidade entre atributos globais/RPC/fotos. Resultado incerto/parcial exige consulta e recarga antes de repetir; não há repetição automática nem nova transação conjunta. A guarda por UUID persiste ao fechar/reabrir na mesma instância do modal; navegação/recarregamento têm nova instância e não constituem idempotência durável no servidor. Mesclagem canônica permanece em caminho separado pendente. Objetivo global continua ativo.

## Indisponibilidades — confirmação e anexos conferidos

Problemas comprovados no checkout: o cadastro publicava sucesso para resposta vazia da RPC; a limpeza incondicional de fotos após falha podia remover anexos de uma transação já confirmada pelo banco com resposta perdida. O modal podia fechar durante o resolver/gravação, não invalidava respostas de outra abertura e não limitava a espera. A consulta de fornecedores retornava lista vazia também em erro, exibindo ausência falsa.

Correção local: contratos compartilhados preservam os refinamentos de estoque/fornecedor e validam fotos/consulta/ACK; quantidade limita-se a duas casas, conforme `numeric(10,2)` já registrado em `supabase/tests/stock_unavailabilities.sql:13`, e variações virtuais são rejeitadas antes do serviço. O serviço exige ACK com ID e consulta a linha para conferir produto/variação/quantidade/textos/fornecedor/anexos/status; prazos de 10s para sessão, 15s por upload, 20s para RPC, 10s para confirmação e 5s para limpeza, além do prazo total de 60s no proprietário. Resultado incerto conserva anexos e bloqueia repetição na mesma instância do modal, inclusive reabertura. Rejeição SQL conhecida permite repetição explícita e limpeza limitada de fotos sem vínculo. O modal monta sessões distintas, protege todos os botões de fechamento enquanto há submissão, congela payload/identidade antes do resolver e publica sucesso uma vez após confirmação. Fotos (inclusive limpar seleção) e consultas usam resolvers reais; fornecedores distinguem falha/ausência e oferecem repetição com contexto protegido. Consultas têm prazos de 10s em cada etapa e 22s no proprietário. Fornecedor não vinculado ao produto atual é rejeitado pelo resolver; regras autoritativas de vínculo/estoque/permissões continuam no backend.

Arquivos e linhas desta rodada (prefixo `erp/src/` quando indicado):

| Arquivo | Alteração |
|---|---|
| `shared-utils/stockUnavailabilityFormSchemas.ts:1–20` | Contratos de consulta/fotos/escrita/proprietário/ACK, variação física, precisão, fornecedor vinculado e erro incerto. |
| `pages/utils/stockUnavailabilityService.ts:3–4,113–197` | Validação pré-I/O, prazos, ACK/linha conferidos, guarda entre etapas e anexos conservados em resultado incerto. |
| `pages/App/Stock/Unavailabilities/hooks/useUnavailabilityForm.ts:1–139` | Resolver até confirmação, captura de identidade/payload, trava comum, fotos em fila, consultas protegidas, contexto/prazos e erro/progresso; sucesso único e liberação antes do callback. |
| `pages/App/Stock/Unavailabilities/modals/UnavailabilityFormModal.tsx:2–3,11–56,178,222–235` | Sessões por abertura, guarda persistente, fechamento protegido, formulário/erros/progresso e fornecedor sem ausência falsa. |
| `pages/App/Stock/Unavailabilities/services/unavailabilitySupplierService.ts:3–4,23–83` | Resultado data/erro, validação, prazos/contexto, filtros de vínculos e wrapper array compatível. |
| `pages/utils/stockUnavailabilityService.test.ts:1,29–44,216–335` | Fixtures File reais e 15 regressões de ACK, incerteza, confirmação divergente, fronteira, contexto e prazos. |
| `pages/App/Stock/Unavailabilities/hooks/useUnavailabilityForm.test.tsx:1–94` | Oito provas com RHF real; fotos, falta de confirmação, fornecedor, fila, contexto, prazo e duplicação. |
| `pages/App/Stock/Unavailabilities/services/unavailabilitySupplierService.test.ts:1–45` | Quatro regressões de erro/ausência, validação, dois prazos e contexto antes de consultar pessoas. |
| `pages/App/Stock/Unavailabilities/Unavailabilities.test.tsx:146–190` | Asserções aguardam resolver real; callback inclui guarda do proprietário. |
| `pages/App/Stock/Unavailabilities/UnavailabilityFormConfirmation.test.tsx:1–134` | Dez provas de composição real, incluindo payload/fotos, ACK/contexto, prazos RPC e total, recuperação de consulta e duas aberturas após sucesso. |

**74 testes em cinco arquivos aprovados** (`scratch/rhf-unavailability-final-tests.log`), incluindo dez provas com modal/hook/RHF/serviços reais e somente transporte/autocomplete simulados. A revisão da composição comprovou e corrigiu um caso adicional: o fechamento automático pelo proprietário após sucesso não pode marcar a próxima abertura como incerta; a trava agora é liberada após o ACK e antes do callback. **Lint do lote sem erros/avisos** (`scratch/rhf-unavailability-final-lint.log`). TypeScript voltou aos **295 diagnósticos anteriores, nenhum do lote** (`scratch/rhf-unavailability-final-tsc.log`); ajustes locais de tipos concluídos. A primeira compilação falhou por bloqueio temporário do Windows nos artefatos fiscais; a repetição passou em 1m40s (`scratch/rhf-unavailability-build-retry.log`). **Build final após o ajuste da trava aprovado em 1m39s** (`scratch/rhf-unavailability-final-build.log`). Diff-check aprovado.

Limites: sem escrita/leitura remota, SQL/migration, Auth real, SEFAZ ou deploy. A definição SQL da RPC não está versionada neste checkout e não foi consultada remotamente; o serviço aceita ACK escalar ou objeto com ID e exige a linha correspondente antes de sucesso. Os testes não provam formato remoto, RLS, transação dos efeitos de estoque nem idempotência do servidor. Upload vencido pode concluir depois de uma limpeza e deixar arquivo órfão, mas uma RPC de estoque não é iniciada após a guarda expirar. A regra de segurança é conservar anexos sempre que o resultado da RPC for incerto. Desfazer indisponibilidade e consultas da página têm caminhos próprios e não são certificados por este formulário. Proprietário agregado e filho conferidos no escopo da migração local: **ERP 95/129 (73,6%), 34 pendentes**, além de mobile/catálogo. Objetivo global continua ativo.

## Impressão de OS — imports após extração dos renderizadores

Sintoma: Vite interrompia a tela de ações de pedido com Failed to resolve import ../../../utils/orderCode em printReturnOs.ts. A mesma falha atingia os utilitários e o tipo Order do módulo de assistência.

Causa comprovada: os renderizadores foram movidos para OrderActions/printers, um nível abaixo, conservando seis imports relativos da pasta anterior. ../../../utils e ../../../types passam a apontar para src/pages/App, enquanto os módulos reais estão em src/pages/utils e src/pages/types.

Correção: `erp/src/pages/App/SalesOrder/OrderActions/printers/printReturnOs.ts:1–3` e `printAssistanceOs.ts:1–3` usam o alias existente @/pages; Order é importação somente de tipo. Conteúdo e comportamento dos documentos não foram alterados.

Validação: requisições ao Vite ativo em http://localhost:5173 retornaram HTTP200 para printReturnOs.ts, printAssistanceOs.ts e orderActionsConfig.ts. Cinco testes existentes de orderCode/formatters passaram (`scratch/printer-imports-tests.log`); diff-check dos dois módulos passou. O build ERP final também passou em 2m31s (`scratch/rhf-layout-commands-build.log`). Não foi aberta janela de impressão nem executada operação comercial/fiscal ou remota.

## Modelos de etiquetas — cópia e exclusão confirmadas pelo proprietário

Problemas e causas comprovadas:

- Cópia e exclusão eram efeitos diretos; o diálogo de cópia fechava sem aguardar, e a exclusão alterava a lista antes de conhecer a resposta. Os callbacks não distinguiam confirmação de falha.
- O cache começava vazio e uma cópia anterior à consulta inicial podia apagar modelos locais. A consulta também podia republicar um cache remoto obsoleto depois de confirmar lista vazia.
- Após trocar categoria ou encerrar o diálogo durante um INSERT/DELETE, uma resposta incerta era descartada como contexto antigo. A revisão reproduziu uma segunda inserção indevida; trocar categoria também apagava a mensagem, conservando ações bloqueadas sem explicação.

Solução implementada: duplicação/cópia e exclusão executam o resolver real do proprietário antes dos serviços. Os contratos validam origem, nome, dimensões, ID e compatibilidade da categoria; os valores parseados seguem à persistência. Uma trava comum permanece até concluir a operação. Cópias independentes removem a origem de override; zeros, frações e arte são preservados. Exclusão remota aguarda confirmação; ocultação padrão e exclusão local exigem Storage confirmado. Erros conhecidos mantêm o diálogo/lista e permitem correção; resultado incerto impede novas alterações até recarregar/conferir, inclusive após perder o contexto. Respostas de aberturas antigas não fecham nem alteram a nova abertura. O cache é carregado na inicialização, consultas atrasadas são invalidadas após alteração confirmada, e lista remota vazia remove entradas remotas antigas preservando modelos `custom_`.

Arquivos e linhas do lote:

| Arquivo | Alteração |
|---|---|
| `shared-utils/labelLayoutFormSchemas.ts:8–13` | Contratos explícitos de duplicação e destino de cópia. |
| `erp/src/pages/App/Stock/LabelPrinting/hooks/useLabelLayouts.ts:49,81–92,115–136,242–275,304–335` | Cache inicial, três intenções no resolver, trava, confirmação, contexto e bloqueio persistente. |
| `erp/src/pages/App/Stock/LabelPrinting/services/labelGridModelPersistence.ts:46–47,65–68,110–113,124` | Guarda antes do I/O/fallback/cache, classificação incerta anterior ao descarte e leitura atual da lista. |
| `erp/src/pages/App/Stock/LabelPrinting/modals/LabelCopyCategoryModal.tsx:10–15,27–57,64–75,108–115,144–147` | Filho aguarda confirmação, mantém erro, protege repetição/fechamento e invalida abertura antiga. |
| `erp/src/pages/App/Stock/LabelPrinting/modals/LabelDeleteConfirmModal.tsx:9–12,24–47,53–65,90–110` | Mesmo contrato para excluir/ocultar, sem publicar sucesso antecipado. |
| `erp/src/pages/App/Stock/LabelPrinting/modals/LabelModelManagerModal.tsx:19–22,39–56,87–110,178–213,230–232` | Gerenciador reutiliza exclusão do proprietário e espera confirmação com erro/progresso visíveis. Seleção/edição não foram conferidas neste lote. |
| `erp/src/pages/App/Stock/LabelPrinting/types/LabelPrintingSections.types.ts:86–92,107` | Callbacks booleanos assíncronos, contexto e estado do proprietário. |
| `erp/src/pages/App/Stock/LabelPrinting/hooks/useLabelPrintingState.ts:176–178` | Fachada encaminha progresso, erro e bloqueio. |
| `erp/src/pages/App/Stock/LabelPrinting/sections/ModalsSection.tsx:65–67,167–188,225–241` | Estado do proprietário chega aos três diálogos reais. |
| `erp/src/pages/App/Stock/LabelPrinting/__tests__/labelLayoutCommands.test.tsx:1` | 14 provas do proprietário com RHF/Zod/helper/Storage reais e transporte simulado. |
| `erp/src/pages/App/Stock/LabelPrinting/__tests__/labelLayoutCommandsPage.test.tsx:1` | 8 provas pela fachada/seção/diálogos/serviço reais; apenas transporte Supabase e módulos fora do lote simulados. |
| `erp/src/pages/App/Stock/LabelPrinting/__tests__/useLabelLayouts.test.tsx:163–180,246` | Exclusão espera a consulta real do teste e ID local respeita UUID, sem expectativa aleatória numérica. |
| `erp/src/pages/App/Stock/LabelPrinting/__tests__/labelAssetPage.test.tsx:37` | Harness respeita confirmação booleana do callback. |

Validação final: **107 testes em dez arquivos aprovados**, incluindo confirmação divergente, falha de Storage, payload parseado, dupla ação, consulta atrasada, erros e troca de proprietário (`scratch/rhf-layout-commands-tests.log`). Timeouts no log são cenários com relógio simulado. Lint sem erros; um aviso anterior de dependências do efeito da fila em `useLabelPrintingState.ts:91` (`scratch/rhf-layout-commands-final-lint.log`). **Build ERP aprovado em 2m31s** (`scratch/rhf-layout-commands-build.log`), com avisos de tamanho/anotações de dependências. TypeScript global conserva **295 diagnósticos fora do lote**, nenhum em LabelPrinting, nos renderizadores de OS ou no schema alterado (`scratch/rhf-layout-commands-final-tsc.log`). Os quatro diagnósticos iniciais do hook foram corrigidos construindo snapshots explícitos para a entrada Zod, preservando metadata; o antigo erro do callback de cópia em Index.tsx deixou de constar. Diff-check do lote aprovado; avisos de conversão CRLF/LF são do checkout.

Limites daquele checkpoint: não houve SQL, CRUD remoto, Auth, dados comerciais, transmissão ou deploy. A confirmação simulada não prova RLS nem concorrência do PostgreSQL. Os três subcaminhos isoladamente não concluíam o proprietário agregado: ERP 91/129 (70,5%), 38 pendentes. O salvamento, filhos, consulta/preferências e recarga foram tratados no checkpoint seguinte, abaixo; a conferência do mobile/catálogo permanece independente. A tabela acima registra as linhas durante aquele lote; a localização vigente dos arquivos novamente alterados consta abaixo.

## Editor de modelos — salvar, consultar e preservar preferências

Problemas e causas comprovadas: o callback na seção fechava o editor duas vezes e aplicava estado de outro contexto após aguardar; a comparação de duplicados usava somente geometria e descartava diferenças de design/papel personalizado. Em rejeição remota conhecida, a edição local conservava o ID remoto e era sobrescrita pela próxima consulta. O factory reconstruía somente os controles, descartando arte/origem/metadata; a abertura ignorava largura/altura Custom e substituía zeros de vários campos pelo padrão. Os inputs de grade/fontes truncavam frações. As preferências locais eram gravadas diretamente por efeitos e podiam derrubar a montagem com SecurityError. O comando de padrão anunciava sucesso mesmo com erro remoto absorvido pelo serviço legado. SELECT inicial atrasado podia desfazer padrão confirmado; após falha de cache, outro padrão mesclado do Storage antigo apagava o anterior.

Solução implementada:

- O editor executa RHF/resolver com contrato final de papel/opções e dimensões Custom positivas. Rascunho continua editável; linhas/colunas inválidas não viram números válidos por truncamento. Campos controlados e design pertencem ao mesmo proprietário. Fonte zero/fracionária, arte e metadata são preservadas; papel Custom carrega suas medidas originais. O factory espalha o snapshot original antes dos controles editados.
- O callback real na seção delega ao hook com a trava comum. O diálogo tem identidade por abertura/categoria/tipo/modelo, fecha uma vez somente após confirmação booleana e protege campos, canvas, fechamento e amostra durante a gravação. A amostra pendente é abortada quando começa o save. Erros mantêm o editor; resultados antigos não fecham outra abertura. Editar modelo de outra categoria exige reabrir.
- A comparação de duplicados considera o conteúdo completo, exceto nome/ID/origem. Fallback de UPDATE rejeitado ganha ID `custom_` com vínculo ao remoto; ambos são conservados na lista/cache e a edição local sobrevive à recarga. Isso não sincroniza automaticamente uma edição local com a nuvem.
- A consulta inicial tem prazo de 15s, progresso e erro na página real; falha preserva cache, resposta tardia é ignorada e lista vazia confirmada conserva somente modelos locais. Ela é inicialização automática, sem novo formulário de busca ou emissão de consulta pelo operador.
- Preferências locais executam resolver em fila e confirmam escrita/leitura do Storage; falhas ficam visíveis. O comando de padrão valida ID/categoria/tipo, mescla o mapa confirmado em memória e conserva a trava até o ACK. Confirmação de outro contexto exige recarga antes de enviar outro snapshot.
- `saveSettings(settings, { confirm: true, isCurrent })` é optativo: prazo de 20s e conferência de linha/ID/payload antes de cache/notificação; classificação incerta precede o descarte de contexto. Cache falho não desfaz confirmação da nuvem. Publicações invalidam SELECTs de configurações anteriores, e assinaturas encerradas não publicam; leitura protegida devolve defaults quando o Storage falha. Chamadores legados conservam o contrato anterior e não são declarados conferidos por essa adição.

Arquivos e linhas vigentes do lote:

| Arquivo | Linhas e alteração |
|---|---|
| `shared-utils/labelLayoutFormSchemas.ts` | 5–14: contrato final/papel Custom, preferências locais/padrão e fronteira remota. |
| `erp/src/pages/App/Stock/LabelPrinting/hooks/useLabelLayouts.ts` | 67–88,122–141,253–319,395–406: mapa confirmado, estado de consulta, save/default com trava/contexto e autosave no resolver. |
| `erp/src/pages/App/Stock/LabelPrinting/modals/LabelGridModelModal.tsx` | 24–30,42,449–450,482–594,635–761,1090–1117,1149–1160,1423,1448–1449: callback booleano, zeros/medidas, resolver final, abertura e campos protegidos. |
| `erp/src/pages/App/Stock/LabelPrinting/modals/label-grid-model-editor/LabelGridModelSettingsPanel.tsx` | 68–146: nomes acessíveis e valores de grade sem truncar/substituir entrada inválida. |
| `erp/src/pages/App/Stock/LabelPrinting/modals/label-grid-model-editor/LabelGridModelToolbar.tsx` | 223–272: fonte selecionada acessível, zero e frações conservados. |
| `erp/src/pages/App/Stock/LabelPrinting/components/LabelGridSheetPreview.tsx` | 26,42,55,103,116,126: bloqueio externo invalida/aborta leitura e impede mudança durante save. |
| `erp/src/pages/App/Stock/LabelPrinting/services/labelGridModelFactory.ts` | 56,83: snapshot completo preservado antes dos controles editados. |
| `erp/src/pages/App/Stock/LabelPrinting/services/labelGridModelPersistence.ts` | 9–15,105–108: identidade de conteúdo completa e fallback local vinculado ao remoto. |
| `erp/src/pages/App/Stock/LabelPrinting/services/labelStorageService.ts` | 29–43,98–105: leitura segura e confirmação de strings de preferência mantendo formato anterior. |
| `erp/src/pages/utils/settings/storage.ts` | 35–36,57–60,81–110,115–147: leitura protegida, geração/assinatura com prazo e modo optativo de gravação confirmada. |
| `erp/src/pages/App/Stock/LabelPrinting/hooks/useLabelPrintingState.ts` | 173,178–180: callback e estados encaminhados. |
| `erp/src/pages/App/Stock/LabelPrinting/sections/ModalsSection.tsx` | 85–96: callback do proprietário, erro/progresso/bloqueio e tipo atual; callback anterior removido. |
| `erp/src/pages/App/Stock/LabelPrinting/types/LabelPrintingSections.types.ts` | 87: contrato booleano/assíncrono e guarda de abertura. |
| `erp/src/pages/App/Stock/LabelPrinting/Index.tsx` | 19–20: progresso da consulta e falhas visíveis na página. |
| `erp/src/pages/App/Stock/LabelPrinting/__tests__/labelGridModelPage.test.tsx` | 1: 11 provas com formulário, filhos, callback, serviço e Storage reais; somente transporte/peers fora do lote simulados. |
| `erp/src/pages/App/Stock/LabelPrinting/__tests__/labelLayoutsQueryPage.test.tsx` | 1: página/fachada/hook/serviço reais em falha, prazo e resposta tardia. |
| `erp/src/pages/utils/settings/__tests__/settingsConfirmed.test.tsx` | 1: 12 provas reais de confirmação, padrão/RHF, contexto, cache falho e SELECT antigo. |
| `erp/src/pages/App/Stock/LabelPrinting/__tests__/labelGridModelFactory.test.ts` | 1: criação/edição, snapshot/metadata e controles prevalecentes. |
| `erp/src/pages/App/Stock/LabelPrinting/__tests__/labelGridModelPersistence.test.ts` | 55–61,178–190: conteúdo distinto/reordenado e fallback remoto/local vinculado. |
| `erp/src/pages/App/Stock/LabelPrinting/__tests__/LabelGridModelBoundary.test.tsx` | 1: confirmação booleana, fechamento único, erro e abertura desmontada. |
| `erp/src/pages/App/Stock/LabelPrinting/__tests__/LabelGridSheetPreview.test.tsx` | 43–52: cancelamento da amostra quando o proprietário salva. |
| `erp/src/pages/App/Stock/LabelPrinting/__tests__/useLabelLayouts.test.tsx` | 26–27,254,264–268: mock de preferência confirma escrita; callback de padrão usa ACK explícito. |

Validação final: **171 testes em 17 arquivos aprovados** (`scratch/rhf-layout-save-verified-tests.log`), incluindo regressões de criação/edição, zeros/frações/arte, campos filhos, recarga de fallback, respostas antigas, ACK divergente, erros de Storage, padrão e consulta. Timeouts são cenários simulados. Lint sem erros e um aviso anterior do efeito de fila (`scratch/rhf-layout-save-verified-lint.log`). **Build ERP final aprovado em 1m43s** (`scratch/rhf-layout-save-verified-build.log`), com avisos de dependências/chunks; TypeScript mantém 295 diagnósticos fora do lote, nenhum em LabelPrinting, schema de layouts ou configurações/testes alterados (`scratch/rhf-layout-save-verified-tsc.log`). Diff-check aprovado. API conferida na [documentação oficial de upsert](https://supabase.com/docs/reference/javascript/upsert); changelog consultado em 16/10, sem mudança de versão da biblioteca.

Limites: nenhuma escrita remota, migration, Auth, dados comerciais, SEFAZ ou deploy. Não há prova de RLS, atomicidade ou concorrência PostgreSQL. O comando de padrão continua sem consumidor de interface ativo localizado; seu callback foi validado sem criar novo fluxo. O modo legado de configurações, arte de preço/dados manuais e os demais proprietários permanecem em seus itens próprios. Este proprietário e seus filhos de canvas/settings/toolbar estão conferidos: **ERP 92/129 (71,3%), 37 pendentes**. Mobile/catálogo têm conferência independente; o objetivo global permanece ativo.

## Dados da etiqueta de preço — aplicação e busca com resolver

Causas comprovadas: campos de PriceLabelDataFillModal chamavam setters do editor em cada tecla e iniciavam autosave antes de Aplicar; escolher produto chamava onApplyProductTitle diretamente, sem resolver. Busca absorvia erro/timeout como lista vazia e não tinha prazo. Os callbacks não tinham confirmação nem proteção de abertura/contexto.

Solução: contrato compartilhado separa texto editável, seleção de produto e consulta/resultados. Preços/centavos/parcelamento são texto da arte, podem ficar vazios para limpar campos e preservam sua formatação; não são valores comerciais do pedido/produto. O modal mantém rascunho por abertura, aplica os valores parseados somente após o resolver e aguarda confirmação booleana do proprietário. Trava comum protege repetição/campos/fechamento; falhas ficam visíveis, callback tem prazo de 15s e resposta incerta impede repetição na abertura. Layout/oportunidade/magnitude identificam a abertura; respostas/resolvers antigos não alteram nem fecham a atual.

`PriceLabelArtEditorModal.tsx` aplica o conjunto de seis campos num callback síncrono, protegido pela guarda da abertura; seleção do catálogo conserva o comportamento de aplicar somente nome/showTitle. Digitar/cancelar não altera a arte nem dispara seu autosave. Esse callback aplica estado do editor; a persistência completa da arte continua em item próprio.

Consulta executa o resolver com termo parseado, debounce de 150ms e prazo de 15s no serviço (16s de proteção no modal). Repetir a consulta usa o mesmo caminho. Resultado explícito data/erro conserva produtos locais válidos quando a nuvem falha; os erros deixam de parecer lista vazia confirmada. Serviço filtra linhas inválidas/excluídas recebidas, valida ID/preços e conserva zeros/frações. Filtros tratam pontuação/aspas/backslash e curingas literalmente; `*` usa regex para não virar alias de `%`. O wrapper legado continua devolvendo array. Cache não é prova de atualização remota de todos os produtos.

Arquivos e linhas:

| Arquivo | Alteração |
|---|---|
| `shared-utils/labelDataFillFormSchemas.ts:1–15` | Contratos distintos de texto manual, seleção, consulta e linhas do catálogo. |
| `erp/src/pages/App/Stock/LabelPrinting/modals/PriceLabelDataFillModal.tsx:14–17,25–113,183–267,282–383` | Rascunho, resolver, callback confirmado, contexto, prazos, consulta/erro/repetição, campos acessíveis e botão de seleção. |
| `erp/src/pages/App/Stock/LabelPrinting/modals/PriceLabelArtEditorModal.tsx:1704–1730` | Identidade da abertura e callbacks atômicos protegidos; setters diretos do filho e fechamento duplicado retirados. |
| `erp/src/pages/App/Stock/LabelPrinting/services/priceLabelCatalogService.ts:1–5,17–97` | Fronteira validada, resultado data/erro, prazo, cache, filtros literais e wrapper compatível. |
| `erp/src/pages/App/Stock/LabelPrinting/__tests__/priceLabelDataFillModal.test.tsx:1–118` | Treze provas reais de rascunho, aplicações, erros, trava, consulta e lifetime do modal. |
| `erp/src/pages/App/Stock/LabelPrinting/__tests__/priceLabelCatalogService.test.ts:142–263` | Onze regressões novas além de seis testes anteriores; timeout, fronteira/cache e padrões literais. |
| `erp/src/pages/App/Stock/LabelPrinting/__tests__/priceLabelDataFillParent.test.tsx:1–127` | Sete provas de composição com editor/usePriceLabelState/DataFill/RHF reais, sem mock do resolver. |

Validação final: **49 testes em quatro arquivos aprovados** (`scratch/rhf-label-data-fill-final-tests.log`): modal 13, serviço 17, composição 7 e contratos existentes 12. Composição comprova rascunho sem autosave, seis campos e um fechamento/sucesso, snapshot completo no callback de persistência parseado, seleção só de nome e invalidação de consulta/submissão durante troca de layout/oportunidade. Transporte/persistência/renderer são simulados; não houve Supabase real. **Build ERP aprovado em 1m45s** (`scratch/rhf-label-data-fill-build.log`); lint sem erros e 17 avisos anteriores de hooks do editor de arte, nenhum do novo modal/serviço/schema/testes (`scratch/rhf-label-data-fill-final-lint.log`). TypeScript mantém 295 diagnósticos fora do lote, nenhum dos arquivos alterados (`scratch/rhf-label-data-fill-final-tsc.log`). Diff-check aprovado; Vite ativo retornou HTTP200 para modal/serviço. Filtros foram comparados aos [operadores](https://docs.postgrest.org/en/stable/references/api/tables_views.html#operators) e [caracteres reservados](https://docs.postgrest.org/en/stable/references/api/url_grammar.html#reserved-characters) documentados pelo PostgREST.

Limites: nenhuma consulta/gravação remota, SQL, Auth, dados comerciais, exportação real, SEFAZ ou deploy. Testes não provam SQL/RLS nem confirmação da persistência completa da arte; autosave, consultas da arte/oportunidades e exportação/filhos do editor de arte continuam pendentes. Formulário de dados conferido: **ERP 93/129 (72,1%), 36 pendentes**, além da conferência independente de mobile/catálogo. Objetivo global permanece ativo.

## Arte de etiquetas — persistência confirmada e fila protegida

Problema comprovado: as duas gravações da arte verificavam somente `error`, permitindo sucesso sem linha/payload devolvidos; as consultas legadas confundiam falha com ausência. O coordenador também usava `parsed.data` após `schema.parse`, embora essa API já retorne o objeto parseado. Esse acesso foi corrigido antes de integrar a interface.

Solução: fronteiras compartilhadas explícitas, confirmação das duas gravações e fila serial que congela cada intenção antes de esperar. O resolver real recebe o payload completo e seus valores parseados seguem ao callback. Somente `true` confirmado permite status salvo/saída/publicação; ausência de confirmação e timeout interrompem a fila e mantêm bloqueio por modelo inclusive ao reabrir o modal. Erro conhecido conserva o rascunho e exige repetição explícita do último estado. Cada callback recebe guarda de contexto, invalidada também ao vencer o prazo de 45s, impedindo segundo envio/publicação tardios. A saída tem prazo total adicional de 45s, independente da quantidade de intenções enfileiradas; excedê-lo bloqueia a fila e uma confirmação tardia não limpa esse erro. Modelo/categoria têm sessões distintas; intenções antigas ainda não iniciadas são descartadas.

Consultas distinguem ausência confirmada de falha, validam o modelo antes de aplicar, têm prazos de 15s no serviço e 16s no proprietário e mostram progresso/erro/repetição. Falha de leitura da arte impede autosave sobre um estado remoto desconhecido. Repetir oportunidades não recarrega a arte nem descarta edições; resposta tardia não substitui a escolha do operador. Filhos e atalhos ficam bloqueados ao sair e durante consulta/bloqueio. O listener duplicado de Ctrl+Z/Y foi removido do hook de movimentação; ações de histórico consultam a guarda vigente, inclusive quando o evento parte de `window`.

Dois defeitos adicionais foram comprovados durante a revisão e corrigidos: um listener de histórico continuava alterando o snapshot durante a saída pendente; e o atalho de retry que marcava salvo ao voltar ao snapshot original ignorava uma primeira gravação já confirmada em caso parcial. Agora o retry sempre atravessa resolver e gravação reparadora, mesmo quando o rascunho corresponde ao snapshot anteriormente confirmado. Zero no preço do produto inicial é preservado com `??`.

Arquivos e linhas (prefixo dos caminhos ERP: `erp/src/pages/App/Stock/LabelPrinting/`):

| Arquivo | Alteração |
|---|---|
| `shared-utils/labelDesignFormSchemas.ts:88` e `shared-utils/labelArtworkFormSchemas.ts:1–18` | Exportação do contrato existente; seleção, arte, salvamento, comando do modelo e oportunidades. |
| `services/labelLayoutService.ts:7,30–57,145–196` | Validação/ACK/prazo das duas gravações, valores parseados, resultado parcial/incerto e guarda de contexto. |
| `services/priceLabelPersistenceService.ts:5–59` | Consultas Result com identidade/conteúdo/prazo e wrappers compatíveis; helper confirmado para save legado. |
| `types/PriceLabelArtEditorTypes.ts:15–16` | Callback booleano confirmado e guarda da sessão. |
| `modals/PriceLabelArtEditorModal.tsx:6–7,20–21,34–91,305–307,469–579,611–734,759–763,1163–1165,1462–1474,1864` | Sessões/guards, leitura e erros, fila/prévia congelada, resolver/callback, retry reparador, bloqueio de filhos/atalhos e interface de erro/progresso. |
| `sections/ModalsSection.tsx:2,81–87,208,214–255,261` | Guarda da fachada, cache/config/publicação somente após confirmação e preço zero preservado. |
| `hooks/usePriceLabelState.ts:13–14,745` | Guarda de histórico recebida do proprietário. |
| `hooks/usePriceLabelHistory.ts:8,16,22–23,63–98` | Ações consultam permissão/estado vigente antes de aplicar; callback atualizado. |
| `hooks/usePriceLabelEditorKeyboardShortcuts.ts:11–51` | Somente movimentação, removendo listener de undo/redo duplicado. |
| `__tests__/labelLayoutService.test.ts:193–224` e `__tests__/priceLabelArtworkWrites.test.ts:1–70` | ACKs explícitos e regressões das duas gravações. |
| `__tests__/priceLabelPersistenceService.test.ts:1–175` | Ausência/falhas/dados inválidos/SQL NULL/prazos/ACK. |
| `__tests__/priceLabelDataFillParent.test.tsx:1–269` | 22 provas com proprietário, estado, histórico e RHF reais, incluindo fila, valores filhos, contexto, timeout e consultas. |
| `__tests__/priceLabelArtworkPage.test.tsx:1–188` | 10 provas com seção/editor/coordenador/helpers/RHF reais, simulando somente transporte e pares visuais. |

Evidência inicial: **49 testes em três arquivos aprovados** (`scratch/rhf-price-art-writes-tests.log`): `labelLayoutService.test.ts` 21, `priceLabelArtworkWrites.test.ts` 14, `priceLabelPersistenceService.test.ts` 14. Incluem timeout, confirmação divergente/ausente, preservação de zeros/frações/metadata, rejeição SQL, resultado incerto, gravação parcial e mudança de contexto. Revisão independente das fundações não encontrou novos defeitos. Não houve consulta/gravação remota nem SQL. As duas gravações continuam sem transação conjunta; testes simulados não provam atomicidade ou RLS.

Validação final da integração: **142 testes em dez arquivos aprovados** (`scratch/rhf-price-art-final-tests.log`), incluindo os dois proprietários de modelos que compartilham ModalsSection. Há 32 testes de composição da arte, dez deles incluindo a seção/coordenador/helpers; o teste adicional comprova prazo total de saída com várias gravações e rejeição de confirmação tardia. Lint sem erros e 20 avisos de hooks/variáveis nos arquivos preexistentes (`scratch/rhf-price-art-core-lint.log`); última alteração do proprietário/teste novamente aprovada, com 13 avisos e nenhum erro (`scratch/rhf-price-art-final-lint.log`). **Build ERP final aprovado em 2m05s** (`scratch/rhf-price-art-final-build.log`). TypeScript global mantém 295 diagnósticos, nenhum em LabelPrinting ou nos schemas alterados (`scratch/rhf-price-art-final-tsc.log`). Diff-check aprovado; módulo do proprietário retornou HTTP200 no Vite ativo. A primeira compilação também passou; a final foi repetida após adicionar o limite total de saída.

Limites: nenhuma consulta/gravação remota, SQL, Auth, dados comerciais, exportação real, SEFAZ ou deploy. As duas gravações continuam sem transação conjunta; simulações não provam atomicidade, RLS nem concorrência PostgreSQL. Exportação, renomear e demais caminhos de toolbar/color picker/menu ainda exigem conferência própria. O item agregado não foi marcado concluído; ERP permanece **93/129 (72,1%), 36 pendentes**, além da conferência independente de mobile/catálogo. Objetivo global permanece ativo.

## Arte de etiquetas — exportação, título e controles conferidos

Lacunas localizadas: renomear usava `prompt` com alteração direta, sem resolver; a exportação ignorava os valores parseados e o download não aguardava sua Promise. A cópia passava callback `async` a `canvas.toBlob`, deixando rejeições do clipboard fora do `try/catch` e encerrando a operação antes da confirmação. Os sliders da prévia ainda chamavam setters diretamente. O renderer usa dígitos de teste somente durante a prévia; isso não constitui mudança dos preços persistidos.

Na retomada foi comprovada também uma referência residual à função removida `validateArtwork`, deixada pela execução interrompida. Título e exportação agora executam seus resolvers reais, com trava comum e mensagens visíveis; cancelamento do prompt não altera a arte e o título parseado segue ao estado e ao autosave do proprietário. O serviço único `exportLabelImage` recebe a intenção parseada, aguarda captura/toBlob/clipboard, propaga falhas e limita a operação completa a 30s. Uma guarda verifica sessão/snapshot antes dos efeitos; após prazo ou troca de contexto, continuações antigas não iniciam download/escrita. `ignoreElements` exclui controles sem alterar estilos do DOM original, conforme [configuração oficial de html2canvas](https://html2canvas.hertzen.com/configuration). O download informa início, pois o browser não confirma a gravação em disco. Uma escrita já entregue ao clipboard não pode ser cancelada pelo aplicativo; sua conclusão tardia não publica sucesso. A espera pela Promise e o tratamento de rejeição seguem o contrato de [Clipboard.write](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/write).

O simulador usa contratos de dígitos inteiros de 0 a 9 com RHF real, fila serial e descarte ao fechar/desmontar. Removida a restauração de preços no fechamento de `usePriceLabelTestValues`: dígitos são estado separado e não justificam gravar novamente os preços reais. Exportação exige concluir o simulador para não capturar valores temporários com snapshot de preços persistentes. Toolbar, fontes individuais/em lote, tamanhos zero/fracionários, escalas, visibilidade, espaçamento, cores por oportunidade, centralização e margem foram conferidos na composição com controles reais. Campos filhos chegam ao resolver do autosave antes do serviço; entrada inválida mostra erro e não grava. Seleção e margem de segurança não persistem mudanças de apresentação.

Arquivos/linhas (prefixo ERP: `erp/src/pages/App/Stock/LabelPrinting/`):

| Arquivo | Alteração |
|---|---|
| `shared-utils/labelArtworkFormSchemas.ts:16–18` | Contratos distintos de título, exportação e dígitos; nome de arquivo derivado internamente da oportunidade validada. |
| `modals/PriceLabelArtEditorModal.tsx:2,59–60,76–78,310–312,402,761,1454–1515` | Resolver, trava/progresso/erro, guarda de snapshot, exportação aguardada, título parseado e integração da prévia isolada. |
| `services/priceLabelExportService.ts:1–50` | Captura única sem mutação do DOM, await de blob/clipboard, falhas propagadas, nome seguro, prazo total e bloqueio tardio. |
| `hooks/usePriceLabelTestValues.ts:1–56` | Remoção do backup e das escritas de preços na dispensa do simulador. |
| `modals/PriceLabelTestValuesModal.tsx:1–103,160–396` | Filho com resolver/fila reais, validação e erros acessíveis nos 12 sliders; invalidação por dispensa/desmontagem. |
| `__tests__/priceLabelExportService.test.ts:1–84` | Onze regressões de captura, DOM, blob, clipboard, fronteira, contexto e três etapas do prazo. |
| `__tests__/priceLabelDataFillParent.test.tsx:11,16,32–39,69–140` | Dez regressões de título/exportação/prévia com proprietário/estado/RHF reais e simulador real. |
| `__tests__/priceLabelArtworkPage.test.tsx:18` | Mock ajustado ao serviço único, preservando provas da seção/coordenador/persistência. |
| `__tests__/priceLabelTestValuesModal.test.tsx:1–146` | 23 provas dos 12 campos, limites, fila rápida, erros, dispensa/desmontagem e Escape. |
| `__tests__/priceLabelEditorControls.test.tsx:1–96` | Nove provas com menu, toolbar, seleção, cores e camadas reais; somente renderer/transporte simulados. |

Validação final: **195 testes em 13 arquivos aprovados** (`scratch/rhf-art-actions-regression-tests.log`); **build ERP aprovado em 1m43s** (`scratch/rhf-art-actions-build.log`). Lint sem erros e 13 avisos anteriores do editor (`scratch/rhf-art-actions-final-lint.log`). TypeScript global mantém **295 diagnósticos fora do lote**, nenhum em LabelPrinting ou nos schemas envolvidos (`scratch/rhf-art-actions-final-tsc.log`). Não houve consulta/gravação remota, SQL, Auth, SEFAZ ou deploy; transporte, renderer e APIs do navegador são simulados nos testes. Não foi comprovado PNG visual real nem clipboard em navegador real, RLS ou atomicidade conjunta das duas gravações da arte.

Proprietário agregado e filhos conferidos no escopo da migração de formulários: **ERP 94/129 (72,9%), 35 pendentes**, além de mobile/catálogo. Isso não declara conclusão global nem prontidão fiscal. `LabelModelCreationModal` permanece sem import/consumidor ativo localizado e não foi reativado ou marcado como conferido.

## Arte de etiquetas — interações iniciadas antes da trava

Problema e causa comprovados na continuação: o fieldset desabilitado impedia iniciar novos gestos, mas os listeners de `mousemove`/`touchmove` já registrados em `window` continuavam alterando posição, tamanho e rotação durante exportação/saída. Isso permitia mudar o rascunho após validar e iniciar uma operação.

Correção em `erp/src/pages/App/Stock/LabelPrinting/modals/PriceLabelArtEditorModal.tsx:828,1012,1122`: cada listener verifica sessão ativa, saída, ação em andamento e permissão vigente de edição antes de alterar o estado. Em `erp/src/pages/App/Stock/LabelPrinting/__tests__/priceLabelDataFillParent.test.tsx:23–30,136–147`, o renderer simulado expõe os três inícios de gesto para acionar os handlers reais; três regressões iniciam o gesto, bloqueiam a exportação com Promise pendente, comprovam snapshot/guarda inalterados e verificam que o mesmo listener volta a editar após liberar a trava. Isso evita uma prova vazia por ausência de listener.

Validação final: **198 testes em 13 arquivos aprovados** (`scratch/rhf-price-art-resume-final-tests.log`), incluindo 35 testes do proprietário, 23 da prévia, 11 da exportação e nove dos controles reais. **Build ERP aprovado em 2m25s** (`scratch/rhf-price-art-resume-final-build.log`); lint sem erros e 13 avisos de hooks/variáveis do editor (`scratch/rhf-price-art-resume-final-lint.log`). TypeScript global registra 300 diagnósticos, nenhum em LabelPrinting ou nos schemas envolvidos (`scratch/rhf-price-art-resume-final-tsc.log`). Diff-check aprovado. Não houve exportação real, gravação remota, SQL, Auth, SEFAZ ou deploy; canvas/clipboard/renderização visual e RLS não foram certificados. A leitura do inventário principal nesta continuação registrou **98/129 (76,0%), 31 pendentes**; os demais checkpoints possuem evidências próprias e mobile/catálogo têm inventário separado. Objetivo integral segue ativo.

## Recebimento da devolução comercial — confirmação conferida

Problema comprovado: `ReturnFulfillmentConfirmModal` disparava um callback sem resolver nem await e o histórico limpava a confirmação antes do commit. O serviço genérico também aceitava ausência de erro da RPC sem conferir identidade/status do recibo. Isso podia fechar a confirmação e iniciar a etapa fiscal sem confirmação comercial suficiente.

Solução: o schema compartilhado exige intenção física, contexto agendado/método e versão válida. O modal executa RHF/zodResolver reais, preserva o atraso de cinco segundos, bloqueia cliques/cancelamento durante a operação, mostra erros/progresso e invalida a abertura antiga. O histórico mantém a confirmação até o recibo comercial, executa seu resolver próprio, protege sessão/fila/prazos e bloqueia repetição de resultado incerto. A emissão fiscal automática existente começa somente após confirmação comercial e não compõe o sucesso comercial nem provoca nova submissão física. Falha fiscal posterior não afirma entrada de estoque para itens sem cadastro.

O caminho específico do serviço exige a versão conferida, alvo correto e alteração exclusiva do status; usa a RPC existente com guarda de versão. Limita a RPC a 30s e exige ID externo/interno, status, tipo, método, versão e flag física válidos antes de publicar notificações. Sem snapshot persistido confirmado, não substitui o JSON por objeto parcial da interface. Leituras tardias não publicam cache nem iniciam escrita. O retorno void dos consumidores legados é preservado. O histórico espera no máximo 35s e o modal no máximo 40s; resultado incerto exige consultar o pedido, sem repetição automática. Outra abertura aguarda a trava comum e não é fechada por resposta da anterior.

Arquivos/linhas do lote (referências no fechamento desta etapa):

- `shared-utils/returnFormSchemas.ts:44–67`: intenção/recibo de recebimento e erro incerto.
- `erp/src/pages/utils/orderMutation/orderMutationTypes.ts:5`: guarda específica; `erp/src/pages/utils/orderMutationService.ts:28`: fachada legada void.
- `erp/src/pages/utils/orderMutation/orderUpdateService.ts:34–73,103–116,211–252,280–292`: snapshot/guarda, intenção estrita, versão, prazo/recibo e serviço de confirmação.
- `erp/src/pages/App/SalesOrder/OrderHistoryList/useOrderHistory.ts:30–31,63–70,245,278,329–366,494–496`: resolver do proprietário, trava/contexto, publicação confirmada, etapa fiscal posterior e cancelamento da abertura.
- `erp/src/pages/App/SalesOrder/OrderHistoryList/index.tsx:80,254`: progresso comum encaminhado ao modal.
- `erp/src/pages/App/SalesOrder/OrderHistoryList/ReturnFulfillmentConfirmModal.tsx:1–149`: resolver, prazo, erros, sessão e controles.
- `erp/src/pages/App/SalesOrder/OrderHistoryList/ReturnFulfillmentConfirmModal.test.tsx:1–227` e `useOrderHistoryQueryState.test.tsx:17–49,82–148`: composição real e fixtures de versão válidas.

Evidência de contrato: leitura de `pg_proc/pg_get_functiondef`, coluna `orders.updated_at` e contagem agregada no projeto operacional `hkoxhourxwlddgsfdgws`, confirmado no vínculo local e URL configurada do ERP. A função `create_order_with_inventory_transaction(text,jsonb,jsonb,jsonb,boolean)` devolve JSON da transação com `order_data` persistido (ID/status/tipo/flag física); o wrapper de versão retorna o mesmo resultado. A coluna é nullable com default `now()`, mas a consulta de 16/10 encontrou **zero devoluções agendadas com versão nula**; não houve backfill nem mudança de schema.

Validação: **110 testes em nove arquivos aprovados**, sendo 43 da composição modal → hook → resolver → serviço real (`scratch/rhf-return-fulfillment-final-tests.log`, 79; `scratch/rhf-return-fulfillment-final-domain-tests.log`, 31). Build ERP aprovado em **2m03s** (`scratch/rhf-return-fulfillment-final-build.log`); lint sem erros/avisos (`scratch/rhf-return-fulfillment-final-lint.log`). TypeScript global tem **300 diagnósticos fora do lote** (`scratch/rhf-return-fulfillment-final-tsc.log`). Diff-check aprovado. Transporte e notificações/etapa fiscal são simulados; não houve chamada comercial real, DDL, fixtures, Auth, transmissão SEFAZ ou deploy. Leituras de catálogo/contagem não comprovam RLS, efeitos, rollback, concorrência ou atomicidade comportamental remota. Inventário passa a **99/130 (76,2%), 31 pendentes**: foi incluído `CancelReturnModal`, proprietário ativo de cancelamento comercial ausente do inventário anterior. Mobile/catálogo permanecem separados; sem conclusão global.

## Produto da nota de entrada — biblioteca conferida, abertura ausente

Falha reproduzida em composição de biblioteca: o modal individual fechava enquanto a promessa de título da IA ainda estava pendente. `classifyAndStart` e `startCreation` liberavam o resolver antes do I/O; o primeiro disparava o segundo com `void`, e o segundo engolia falhas. Correção local em validação: comando compartilhado com item da NF validado, resolver ativo até resultado de vínculo/classificação/preparação, trava/sessão/contexto e prazo total de 60s; fornecedor e campos parseados seguem ao I/O. Consulta de contexto não publica cache antigo. O proprietário mantém o modal, erro e progresso até confirmar resultado; o filho recebe estado/controladores do proprietário.

**Localização posterior obrigatória:** `InboundInvoiceItemsReview` monta o modal, mas a linha real de itens recebe apenas `onRequestQuickRegister`, sem callback para `requestIndividualCreation`. A busca de consumidores encontrou este último somente no hook e no novo teste; não há abertura ativa localizada. Não foi reativado fluxo legado por inferência e este item **continua pendente no inventário**. As provas cobrem a biblioteca composta, não uma rota operacional acessível. O cadastro rápido ativo e seu callback `handleCreatedProductFromModal` mantêm conferência própria; este último ainda libera o resolver antes de recarregar o produto/gravar o vínculo. Sem I/O remoto, SQL, cadastros, Auth, SEFAZ ou deploy. Arquivos/linhas e resultados finais serão registrados após regressões.

Arquivos e linhas desta etapa:

- `shared-utils/inboundProductLinkFormSchemas.ts:2,29–42`: reutiliza o schema do item da nota, exige descrição e coerência de item/quantidade, preserva metadata e explicita o retorno de título válido. Não altera XML ou snapshot persistido da NF.
- `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceProductCreation.ts:1–5,35,64–72,92–215,364–365`: resolver único acompanha consulta de código, classificação e preparação; fornecedor/item/acréscimo parseados seguem ao I/O. Guarda após cada espera, prazo total de 60s, vínculo sem produto existente recusado, resultado booleano/erro e trava comum. O prazo invalida a publicação, sem abortar uma requisição de IA/leitura já iniciada. O callback ativo posterior de produto criado (linha 301) não foi incluído nesta certificação.
- `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceClassification.ts:24–26,38–74`: target de fornecedor parseado, token/contexto de consulta, cache protegido e reset da classificação.
- `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceItemsReview.ts:77–85,153,202–203,233–256,328–336`: resolver do acréscimo permanece até o resultado, mantém o modal na falha, trava de fechar/submeter e erro/progresso controlados pelo proprietário.
- `erp/src/pages/App/Stock/InboundInvoices/modals/InboundIndividualProductModal.tsx:12–23,36,54,63–77` e `components/InboundInvoiceItemsReview.tsx:79–88`: feedback acessível, controles bloqueados e estado encaminhado ao filho; sobreposições de preparação evitadas durante o modal individual. Não adicionam acionador na linha de itens.
- `erp/src/pages/App/Stock/InboundInvoices/modals/InboundIndividualProductModal.test.tsx:1–141`: novo teste de biblioteca com 20 cenários de espera/erro/retry, concorrência, valores parseados/zeros/NF preservada, vínculo existente, classificação, prazo, troca de contexto/cache e desmontagem.
- `erp/src/pages/App/Stock/InboundInvoices/components/InboundInvoiceItemsReview.test.tsx:1,10` e `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceSuggestions.test.ts:1`: usam o DOM já disponível; a carga jsdom falhava antes de executar as duas suítes por binding nativo de canvas ausente. O mock do formulário de produto foi alinhado ao caminho atual `Products/modals/ProductFormModal`; o caminho antigo deixava montar um formulário fora do AuthProvider. As asserções existentes foram mantidas.

Validação final da biblioteca: baseline reproduziu o fechamento antecipado (`scratch/rhf-inbound-individual-baseline-tests.log`). **47 testes em seis arquivos aprovados**, incluindo os 20 da biblioteca composta (`scratch/rhf-inbound-individual-final-tests.log`); lint sem erros e 19 avisos de variáveis anteriores (`scratch/rhf-inbound-individual-final-lint.log`). TypeScript global registra **315 diagnósticos fora dos arquivos deste lote** (`scratch/rhf-inbound-individual-final-tsc.log`); fontes e testes alterados sem diagnóstico. **Build ERP aprovado em 1m40s** (`scratch/rhf-inbound-individual-verified-build.log`), após a última alteração de fonte; diff-check aprovado. Sem IA/rede reais, persistência, autenticação real, SQL/migration, SEFAZ ou deploy. A conferência não prova cadastro/vínculo no banco, concorrência remota, browser real nem caminho acessível; inventário permanece **100/130 (76,9%), 30 pendentes**, além de mobile/catálogo. Não conta o harness que cria um acionador de teste como abertura de produção.

## Cancelamento da devolução comercial — confirmação conferida

Problema e causa comprovados: o modal ativo `CancelReturnModal` não executava resolver nem aguardava callback; `confirmReturnCancellation` fechava antes da operação, engolia falhas e publicava status/flags sem recibo. O proprietário também estava ausente do inventário. A notificação genérica chamava o cancelamento da devolução de venda cancelada e prometia reversão de estoque. Uma exceção síncrona local na notificação podia invalidar a confirmação já recebida e aparentar falha comercial.

Solução: contrato compartilhado específico de intenção, versão, status agendado e ausência de confirmação/reversão física; recibo exige identidade externa/interna, tipo, status cancelado, versão, método e flags compatíveis. RHF/zodResolver reais no modal e histórico acompanham o serviço até o recibo. Menu e mudança de status agendada passam pelo mesmo modal. A atualização específica reutiliza a RPC existente com guarda de versão, altera somente status e preserva o snapshot original; valida também seu estado/método/ID antes de enviar, sem injetar intenção/versão no JSON. Nenhum cadastro de CRM ou preparação fiscal é iniciado por esta mudança de status.

Recebimento e cancelamento compartilham trava de operação e mapa de bloqueio incerto nesta sessão, com guardas próprias da abertura. Outra abertura aguarda a trava e não recebe publicação/fechamento da resposta anterior; trocar entre recebimento e cancelamento invalida o contexto anterior. Prazos continuam 30s na RPC, 35s no proprietário e 40s no modal; leituras antigas não publicam cache nem iniciam gravação. Falhas conhecidas mantêm o modal para nova tentativa explícita. Falta de recibo, transporte incerto, resposta incompatível ou operação confirmada em contexto perdido exigem consultar o histórico. O prazo não aborta/reverte uma RPC já iniciada. Retorno físico confirmado é recusado na interface, schema e snapshot; o cancelamento comercial não transmite documento fiscal. Notificação identifica a devolução comercial e preservação da venda/estoque; a mensagem de venda também qualifica cancelamento comercial sem prometer efeito não conferido. Falha local de notificação não invalida recibo comercial confirmado.

Arquivos/linhas modificados nesta continuação (referências no fechamento):

- `shared-utils/returnFormSchemas.ts:69–90`: contratos/recibo/erro próprios de cancelamento.
- `erp/src/pages/utils/orderMutation/orderMutationTypes.ts:6–7`: guarda do cancelamento; `orderUpdateService.ts:23–24,42,86,106–125,229–235,248–282,314–319`: validação do snapshot original, seleção do contrato/recibo, versão, prazo, erro incerto, notificação posterior e helper específico. O contrato legado sem opção continua void e o `undoReturn` legado foi preservado.
- `erp/src/pages/App/SalesOrder/OrderHistoryList/useOrderHistory.ts:9–10,30–31,66–74,293–298,318–319,339–375,378–411,424–426,512–518`: resolver de cancelamento, trava comum, contexto/versão, recibo, publicação e limpeza confirmada, entrada por status/menu e cancelamento da abertura.
- `erp/src/pages/App/SalesOrder/OrderHistoryList/index.tsx:84,264`: encaminhamento da trava comum.
- `erp/src/pages/App/SalesOrder/OrderHistoryList/CancelReturnModal.tsx:1–136`: resolver, cinco segundos, sessão/trava/prazo e feedback de erro/progresso.
- `erp/src/pages/utils/orderMutation/orderNotificationDispatcher.ts:115–122`: mensagens corretas por tipo comercial; `__tests__/orderNotificationDispatcher.test.ts:64–82`: regressões da devolução e venda.
- `erp/src/pages/App/SalesOrder/OrderHistoryList/ReturnFulfillmentConfirmModal.test.tsx:9–85,240–354`: composição dos dois modais com hook/resolver/serviço reais, 30 casos adicionais; `useOrderHistoryQueryState.test.tsx:14,49`: mock do novo helper na prova isolada de consulta. Os 43 casos anteriores de recebimento continuam aprovados.

Validação final: **156 testes em 13 arquivos aprovados**, incluindo 73 de composição (recebimento/cancelamento) e quatro de notificações (`scratch/rhf-return-cancellation-verified-tests.log`). **Build ERP aprovado em 1m52s**, lint sem erros/avisos e **300 diagnósticos TypeScript fora do lote** (`scratch/rhf-return-cancellation-verified-{build,lint,tsc}.log`). Diff-check aprovado. Foram inspecionados somente trechos de catálogo da RPC operacional sobre a flag física; sem chamada comercial, DDL, fixtures, Auth real, notificações reais, SEFAZ ou deploy. Transporte e efeitos externos são simulados; SQL/RLS, persistência real, concorrência, rollback e atomicidade remota não foram certificados. Inventário passa a **100/130 (76,9%), 30 pendentes** no ERP; mobile/catálogo continuam separados. Próximos itens ativos mantêm sua conferência própria; não há conclusão global.

## Rótulos fiscais — feedback visual de carregamento com faixa de luz (shimmer)

### 1. Problema identificado e sintomas observados
Durante operações de conferência/cancelamento de pedido de venda que avaliam a necessidade de cancelamento ou estorno da nota fiscal na SEFAZ, após o clique de confirmação de cancelamento, os rótulos de nota fiscal (`NF` e `NFH`) exibiam um ícone circular giratório (`bi-arrow-repeat animate-spin`) posicionado no canto superior direito do badge. A experiência visual foi considerada intrusiva, desconfortável e com poluição estética excessiva ("ícone de rotacionar girando chato"), contrastando com a elegância esperada na interface do ERP.

### 2. Causa raiz técnica comprovada
No componente `OrderFiscalBadge.tsx` (linhas 117–124), quando a propriedade booleana `loading` estava ativa (`fiscalBadgeLoadingByOrderId[order.id] === true`), o componente renderizava um elemento fixo no topo direito (`absolute -right-1 -top-1`) contendo uma esfera azul com ícone de repetição animado (`<i className="bi bi-arrow-repeat animate-spin text-[9px]" />`). Essa animação de rotação contínua sobrecarregava visualmente o pequeno container do badge fiscal (24px de altura) e competia com os ícones definitivos de status fiscal.

### 3. Lista exata dos arquivos e linhas modificados
- `erp/src/pages/App/SalesOrder/OrderHistoryList/OrderFiscalBadge.tsx`: Linhas 114–135.
  Substituição do spinner giratório pelo feixe de luz passando no background do badge via `.order-fiscal-badge-shimmer-container` e `.order-fiscal-badge-shimmer-beam`, preservação da sigla com `.relative.z-10` e renderização estática limpa do ícone de status.
- `erp/src/index.css`: Linhas 319–373.
  Implementação dos keyframes `@keyframes fiscal-badge-shimmer` e classes `.order-fiscal-badge-shimmer-container`, `.order-fiscal-badge-shimmer-beam`, com transição translúcida luminosa que clareia naturalmente a cor de fundo subjacente (`emerald-600`, `slate-400`, `rose-600`, etc.) e suporte a acessibilidade motora via `@media (prefers-reduced-motion: reduce)`.
- `erp/src/pages/App/SalesOrder/OrderHistoryList/OrderFiscalBadge.test.tsx`: Novo arquivo de testes unitários com 5 cenários completos validando presença da faixa de luz em loading, ausência estrita de spinners giratórios, preservação da sigla acima da camada animada, acessibilidade (`aria-busy="true"`) e variantes de produção/homologação.

### 4. Solução técnica implementada
- **Faixa de luz luminosa no background:** Criado container interno com `overflow-hidden` e `border-radius: inherit` (`.order-fiscal-badge-shimmer-container`) contendo um feixe inclinado (`.order-fiscal-badge-shimmer-beam`) com gradiente translúcido de alta luminosidade (`rgba(255, 255, 255, 0.58)` no ápice).
- **Adequação dinâmica à cor do fundo:** Ao deslizar sobre o background do rótulo, a faixa de luz clareia naturalmente o tom exato do badge (verde esmeralda claro sobre nota autorizada, cinza claro sobre não emitida, rosa claro sobre cancelada e amarelo claro sobre rejeitada), cumprindo estritamente a diretriz do usuário ("é a cor do background, só que mais claro").
- **Remoção definitiva do spinner giratório:** O ícone `bi-arrow-repeat` com `animate-spin` foi removido de `OrderFiscalBadge.tsx`. O rótulo agora sinaliza atividade de forma suave e elegante diretamente pela passagem da luz no fundo.
- **Camada de texto preservada:** O texto da sigla (`NF` ou `NFH`) foi envolvido em `<span className="relative z-10">`, mantendo 100% de legibilidade e contraste acima do feixe de luz.
- **Acessibilidade e redução de movimento:** Implementado fallback para `@media (prefers-reduced-motion: reduce)` substituindo o deslocamento contínuo por uma pulsação suave e estática de opacidade, em estrita conformidade com as diretrizes do W3C e WCAG AAA.

### 5. Testes executados e validações que comprovam a não-regressão
- **Testes unitários dedicados:** 5 testes aprovados em `OrderFiscalBadge.test.tsx` (5/5).
- **Suíte de histórico de pedidos:** 24 testes aprovados em 6 arquivos (`OrderFiscalBadge`, `OrderHistoryRow`, `OrderHistoryTable`, `OrderFiscalOperationBadge`, `CancelSaleModal`, `OrderCancellationFailureNotice`).
- **ESLint:** 0 erros e 0 warnings nos arquivos alterados.
- **TypeScript:** Verificação de tipos limpa e sem diagnósticos nos arquivos modificados.


## Biblioteca de artes — upload, consulta e exclusão conferidos

**Problema e causa comprovada:** o upload liberava o resolver antes de terminar a leitura da imagem, aceitava troca de formato após a conferência, descartava a promessa de atualização da biblioteca e não conferia recibos do Storage/registro. A página proprietária tinha busca/filtros/exclusão diretos, respostas antigas podiam substituir filtros novos e o arquivo era removido antes da confirmação da exclusão do registro. O proprietário da página não constava no inventário principal; foi acrescentado antes da conferência, elevando o denominador de131 para132.

**Solução:** contratos explícitos compartilhados para arquivo/proporção, upload, filtros, exclusão vinculada ao produto/arte e download HTTPS. RHF acompanha cada intenção até o efeito confirmado, com guarda comum, prazo, contexto de sessão/produto e erro visível. Upload tem ID estável por tentativa, exige path e snapshot do registro correspondentes; atualização da página é aguardada. Se o registro foi confirmado e o refresh falha, a repetição atualiza somente a lista. Respostas incertas bloqueiam reenvio na instância; não há retransmissão automática. URLs temporárias são liberadas.

A exclusão confirma exatamente o registro por id/produto antes de remover seu arquivo. Falha posterior conserva uma limpeza pendente explícita; o operador pode repetir somente a limpeza, sem novo DELETE do registro. Erro de transporte/recibo vazio antes da confirmação conserva o arquivo e bloqueia repetição incerta. PostCard usa imageUrl, o campo canônico do tipo/serviço. A busca e o carregamento descartam respostas de sessão/filtro antigos.

**Arquivos e linhas:**

| Arquivo | Região modificada |
|---|---|
| shared-utils/marketingFormSchemas.ts | 64–81: contratos de upload/proporção, filtros, exclusão e download. |
| erp/src/pages/App/Marketing/Posts/components/PostsLibrary/UploadPostModal.tsx | 1–173 e controles: schemas, contexto/guardas, busca, arquivo, persistência/refresh, feedback e bloqueio. |
| erp/src/pages/App/Marketing/Posts/components/PostsLibrary/PostsLibraryPage.tsx | 1–149, filtros/feedback e296–305: consulta/busca, confirmação de exclusão, limpeza e callback aguardável do upload. |
| erp/src/pages/App/Marketing/Posts/components/PostsLibrary/PostCard.tsx | 28: imagem canônica imageUrl. |
| erp/src/pages/App/Marketing/Posts/services/productPostsService.ts | 13,36–88,91–99,124–206: leitura de proporção, prazos, identidade/recibos e exclusão parcial. |
| erp/src/pages/App/Marketing/Posts/components/PostsLibrary/UploadPostModal.test.tsx | novo: nove provas do proprietário. |
| erp/src/pages/App/Marketing/Posts/components/PostsLibrary/PostsLibraryPage.test.tsx | novo: dez provas, incluindo página e modal reais juntos. |
| erp/src/pages/App/Marketing/Posts/services/productPostsService.test.ts | novo: treze provas com serviço real e transporte simulado. |
| inventário principal, continuidade e índice fiscal | cobertura, denominador corrigido, evidências e limites. |

**Validação:**35 testes em quatro arquivos aprovados (32 novos e três regressões de campanhas); lint das oito fontes/testes sem erros ou avisos. Build ERP completo com startup fiscal aprovado em1m47s. TypeScript global mantém303 diagnósticos fora das fontes/testes do lote; não está aprovado globalmente. Logs: scratch/rhf-post-library-final-{tests,lint,tsc,build}.log. Revisão React conferiu ordem de hooks, dependências, cleanup de imagens/timers e controles/erros acessíveis.

**Contrato consultado:** SDK instalado retorna FileObject[] em StorageFileApi.remove; o [endpoint oficial de exclusão](https://github.com/supabase/storage/blob/master/src/http/routes/object/deleteObjects.ts) retorna os objetos de [deleteObjects](https://github.com/supabase/storage/blob/master/src/storage/object.ts), identificados por name. A confirmação local exige o nome/caminho solicitado. Isso não comprova versão ou políticas do Storage remoto. Não houve criação/exclusão remota, geração por IA, migration, mensagem ou transmissão.

**Limites e cobertura:** não há transação entre Storage e registro; falha após upload pode deixar arquivo sem registro. Timeout não cancela transporte, e as travas/limpezas pendentes duram na instância montada. Testes simulam Auth/Supabase e não provam RLS/concorrência/execução remota. Dois proprietários ativos conferidos: ERP114/132 encerrados (86,4%),18 pendentes. Página principal de criação/editor/ambientação e mobile/catálogo mantêm pendências próprias; não é conclusão global.

## Ambientação — biblioteca conferida sem acionador ativo

**Problema e causa comprovada:** a biblioteca de ambientação liberava isGenerating antes de terminar saveAmbientedImage e já permitia aplicar a prévia. O serviço ignorava erros/recibos do INSERT, também retornava sucesso quando a gravação local falhava e criava uma identidade nova a cada repetição. Sugestão e aplicação não compartilhavam trava; a aplicação chamava um callback void e fechava sem confirmação, com espera/contexto sem proteção.

**Solução:** contratos distintos para sugestão, geração, registro da imagem e aplicação, todos executados pelo resolver real do proprietário. Nome/prompt/produto seguem parseados; origem/resultado aceitam HTTPS válido ou dados de imagem raster. Guarda comum impede geração, aplicação e fechamento simultâneos; prazos são15s para sugestão,90s para IA,20s para INSERT (25s na fronteira do proprietário) e30s para aplicação. Respostas após troca de produto, foto, sessão ou abertura são descartadas. Erros e progresso são visíveis.

A prévia pode ser exibida enquanto salva, mas Usar Foto Ambientada só aparece após recibo correspondente. Cada resultado recebe UUID estável antes da persistência. Se há falha local conhecida, Salvar ambiente gerado repete a persistência da mesma imagem/ID sem nova geração por IA; resultado remoto incerto bloqueia repetição na instância. A aplicação aguarda o callback, conserva a imagem após recusa explícita e bloqueia repetição após timeout/retorno incerto.

O serviço confere ID/produto/variação/imagens/prompt no INSERT.select.single. O fallback existente é conservado somente após recusa explícita de tabela ausente/permissão (42P01,42501,PGRST205); exige setItem e leitura de confirmação, deduplica o mesmo ID e retorna persistence:local. A interface informa Imagem salva somente neste navegador. Transporte/timeout/recibo divergente não são convertidos em sucesso local. Cache local indisponível não invalida um recibo remoto já confirmado. Consulta de biblioteca ganha prazo de15s.

**Arquivos e linhas:**

| Arquivo | Região modificada |
|---|---|
| shared-utils/marketingFormSchemas.ts | 55–63: contratos separados, imagens e UUID. |
| erp/src/pages/App/Marketing/Posts/components/Ambientation/AmbientationStudioModal.tsx | 1–121: formulários/guardas/contexto, sugestão, geração/persistência e callback;132–137,176–193,215–234: feedback e controles. |
| erp/src/pages/App/Marketing/Posts/services/ambientationService.ts | 3–4,11–20,46–98: prazo de leitura, schema/ID, recibo remoto e confirmação local. |
| erp/src/pages/App/Marketing/Posts/components/Ambientation/AmbientationStudioModal.test.tsx | novo: treze provas do proprietário com RHF real. |
| erp/src/pages/App/Marketing/Posts/services/ambientationService.test.ts | novo: oito provas do serviço real, transporte e Storage local simulados. |
| inventário principal, continuidade e índice fiscal | disposição da biblioteca, cobertura e evidências. |

**Validação:**21 novas provas; conjunto de marketing56 testes em seis arquivos aprovado, incluindo biblioteca de artes/upload/campanhas. Lint das12 fontes/testes sem erros ou avisos. TypeScript global mantém303 diagnósticos fora do lote. Build ERP completo com startup fiscal aprovado em1m30s. Logs: scratch/rhf-marketing-owners-final-{tests,lint,tsc,build}.log. Fontes de códigos de recusa: [PostgREST](https://docs.postgrest.org/en/v14/references/errors.html) e [PostgreSQL](https://www.postgresql.org/docs/18/errcodes-appendix.html). Não foi inferida a versão ou a existência da tabela no remoto.

**Disposição e limites:** busca por consumidores encontra somente a própria declaração de AmbientationStudioModal e os testes; generateRoom/saveAmbientedImage também não têm outro consumidor ativo localizado. Biblioteca retida e conferida, sem reativar funcionalidade ou contar formulário operacional ativo. IA, Supabase e Auth simulados; não houve geração/INSERT real, migration, alteração comercial ou transmissão. Timeout não cancela transporte/geração; travas incertas duram na instância/contexto montado. Armazenamento local não prova sincronização, RLS ou durabilidade remota. Biblioteca conferida e retida: ERP115/132 itens encerrados (87,1%),17 pendentes, incluindo itens retirados e bibliotecas sem consumidor. Página principal, editor/autosave de modelos e mobile/catálogo mantêm caminhos próprios pendentes.

## Campanhas e modelos — proprietário ativo com recibos conferidos

**Problema e causa comprovada:** a página ativa de posts chamava serviços diretamente para salvar/remover campanhas, persistir regras gerais e criar/editar/vincular modelos. Os serviços descartavam erros do Supabase e retornavam o objeto local sem conferir a escrita. A limpeza de escolhas de fotos não executava resolver; salvar/limpar o Storage local absorvia falhas, mas a interface publicava sucesso e alterava a prévia. Exclusão era disparada sem espera/erro no modal. Uma nova identidade de modelo era criada a cada repetição. A consulta também podia criar campanha padrão implicitamente e não tinha prazo/contexto.

**Solução no proprietário:** contratos compartilhados explícitos para campanha, exclusão, consulta e comando completo de modelo; regras gerais e escolhas/limpeza de fotos conservam contratos próprios. Cada intenção executa RHF/zodResolver até o serviço/recibo, usando valores parseados. Trava comum, identidade estável, contexto de sessão/campanha/modal, erro/progresso e bloqueio de repetição incerta. Consultas/refresh têm15s por etapa e descartam resposta antiga; escolhas locais só atualizam a prévia após confirmação de setItem/removeItem. O reset tem resolver próprio.

**Confirmação de serviço:** acrescentada opção confirm aos métodos utilizados pela página. Escrita exige select.single correspondente ao payload; exclusão exige exatamente o ID solicitado. Datas são comparadas como instantes e referências JSON por seus campos de domínio, conservando diferenças de ordem de chaves. Espera de escrita limitada a20s; contexto conferido antes do envio e depois do recibo, antes de publicar cache. Erro explícito é distinguido de transporte/timeout/ACK divergente. Cache indisponível não invalida escrita remota já confirmada. Leitura confirmada não cria campanha padrão implicitamente nem mascara consulta desconhecida como conteúdo padrão. Demais consumidores legados conservam o contrato existente e continuam sujeitos à sua conferência própria.

**Falha parcial:** campanha já confirmada com refresh malsucedido mantém o mesmo ID; repetir atualiza somente a lista. Modelo salvo com vínculo recusado informa explicitamente Modelo salvo / vínculo pendente; a repetição conhecida tenta somente o vínculo. Vínculo incerto bloqueia repetição. Após refresh confirmado, as etapas guardadas são liberadas para permitir uma nova edição legítima. Rascunhos locais antigos são preservados e marcados persistedRemotely:false; vínculos somente locais ficam inativos até confirmação remota. Registros anteriormente confirmados e ausentes na leitura remota não são restaurados como novos rascunhos.

**Filhos reais:** exclusão no gerenciador passa por resolver até callback, bloqueia dupla ação/fechamento e mostra erro. Regras gerais descartam load/filas de componente desmontado. Modal de modelo mantém UUID do rascunho, compartilha trava entre leitura de arquivo e salvamento, limita FileReader a10s e callback a80s (composição pode exigir modelo20s+vínculo20s+refresh30s), desativa controles pendentes e libera leitores/timers. Callback não confirmado conserva rascunho/erro e bloqueia repetição. Produto/variações usam o contrato canônico do mapper existente; atributos em array são adaptados à leitura das imagens, preservando a identificação legada de oportunidade.

**Arquivos e linhas modificados:**

| Arquivo | Região modificada |
|---|---|
| shared-utils/postManagerFormSchemas.ts | novo,1–15: comandos de campanha/consulta/exclusão/modelo. |
| shared-utils/marketingFormSchemas.ts | 88–94: escolhas de imagem com URL válida e contrato de reset. |
| erp/src/pages/App/Marketing/Posts/index.tsx | 1–103: formulários, contexto/trava e regras/seleção;105–193: compatibilidade de produto e imagens;222–323: reset, consultas e cinco callbacks;326–fim: feedback e controles/fechamento. |
| erp/src/pages/App/Marketing/Posts/services/postCreatorService.ts | 2,89–265: opção de confirmação, recibos, prazos, cache e leituras; demais cadeias then com rejeição equivalente corrigem PromiseLike sem alterar os contratos legados. |
| erp/src/pages/App/Marketing/Posts/services/postProductImageSelections.ts | 1,13–19,23–47: leitura parseada e confirmação de gravação/remoção local. |
| erp/src/pages/App/Marketing/Posts/types/postCreator.ts | 36,55,65: marcador opcional de persistência em modelo/vínculo/campanha, sem alteração de banco. |
| erp/src/pages/App/Marketing/Posts/components/CampaignManagerModal.tsx | 4,27–77,86–95,130–174: resolver de exclusão, guardas, contexto, erro e rascunho local. |
| erp/src/pages/App/Marketing/Posts/components/GeneralCampaignRules.tsx | 20–28,42–54: ciclo de vida da consulta e das submissões em fila. |
| erp/src/pages/App/Marketing/Posts/components/PostCreatorModelModal.tsx | 4,23–40,59–156,175–260,rodapé: UUID/contexto, leitura e callback limitados, trava/erro/feedback e controles. |
| erp/src/pages/App/Marketing/Posts/postManagerOwner.test.tsx | novo:14 provas do proprietário; compõe CampaignManagerModal/GeneralCampaignRules reais e simula outras fronteiras de UI. |
| erp/src/pages/App/Marketing/Posts/services/postCreatorConfirmation.test.ts | novo:20 provas do serviço/recibos, compatibilidade, rascunhos locais e Storage. |
## Assistência técnica — modularização, princípios SOLID e vínculo opcional

**Problema e causas comprovadas:**
1. No fluxo de emissão/edição de assistência técnica, o sistema exigia obrigatoriamente a seleção de um pedido original de venda do ERP e a escolha de itens originários desse pedido. Isso impedia o registro de ordens de serviço/assistência técnica cujo pedido original não constava no ERP (vendas anteriores à implantação do sistema, atendimentos avulsos a terceiros, etc.).
2. O modal de assistência (`AssistanceOrderModal.tsx`) acumulava mais de 550 linhas misturando ciclo de vida do formulário, autosave com debounce, chamadas de stream reativo, montagem de payload, formatação de dados e renderização de múltiplas seções no mesmo arquivo, ferindo os princípios SOLID (Single Responsibility Principle, Separation of Concerns e Clean Architecture).
3. O modal de seleção de pedidos vinculados (`OrderSelectionModal.tsx`) precisava restringir a exibição exclusivamente a pedidos atendidos (`status === 'delivered'`) e possuir paginação padrão do ERP com 15 itens por página.

**Soluções arquiteturais implementadas:**
1. **Regras de Domínio (`shared-utils/commercialAssistanceRules.ts` e `commercialOrderRules.ts`):**
   - Atualizada a função `validateAssistanceOrder`: quando a assistência não está vinculada a uma venda (`!order.linkedOrderId`), a seleção de itens de pedido original é estritamente opcional. A validação exige o detalhamento do serviço (`assistanceDescription`), dados do cliente e atendente.
   - Quando vinculada a uma venda original, mantém-se a exigência de seleção de pelo menos um item ou peça extra.
2. **Separação de Responsabilidades e Camada de Serviços:**
   - Criado o diretório modular `erp/src/pages/App/SalesOrder/Assistance/`.
   - `types/assistance.types.ts`: Tipagem estrita e centralizada para o formulário e propriedades de modais.
   - `services/assistanceOrderService.ts`: Funções puras desacopladas de React para construção de payload (`buildAssistanceOrderPayload`), detecção de formulário em branco (`isAssistanceFormBlank`) e sumarização de itens (`calcAssistanceItemsSummary`).
   - `hooks/useAssistanceOrderForm.ts`: Custom hook encapsulando o estado do formulário, integração com `useZodForm` e `createAssistanceOrderFormSchema`, autosave com debounce seguro, detecção automática por produto (`initialData.matchedProductId`), inscrição no stream de pedidos e cancelamento com guarda defensiva (`isCurrent`).
   - `components/`: Componentes visuais modulares focados exclusivamente em renderização (`AssistanceOrderHeader`, `AssistanceLinkedOrderSection`, `AssistanceCustomerSection`, `AssistanceDescriptionSection`, `AssistanceExtraItemsSection`, `AssistanceActions`).
   - `AssistanceOrderModal.tsx`: Visual limpo e declarativo reduzido de ~550 para ~140 linhas.
3. **Seleção de Pedido Original (`OrderSelectionModal.tsx`):**
   - Filtragem estrita para pedidos atendidos (`status === 'delivered'`).
   - Paginação padrão do ERP implementada com 15 itens por página e controles universais de navegação.
4. **Retrocompatibilidade e Limpeza:**
   - Mantidos re-exports no caminho legado `erp/src/pages/App/SalesOrder/modals/AssistanceOrderModal.tsx` e `AssistanceOrderModalComponents/` para garantir compatibilidade com `AppLayout`, `SalesOrderModalsContainer` e demais pontos de montagem.
   - Removido o arquivo morto não importado `erp/src/pages/App/SalesOrder/AssistanceOrderModalComponents/AssistanceSchedulingSection.tsx`.

**Arquivos e linhas modificados:**
| Arquivo | Região modificada |
|---|---|
| `shared-utils/commercialAssistanceRules.ts` | Linhas 18–48: flexibilização de itens para assistência avulsa desvinculada. |
| `shared-utils/commercialOrderRules.ts` | Linhas 135–150: exceção de `items_summary` para assistências sem venda original. |
| `erp/src/pages/App/SalesOrder/Assistance/types/assistance.types.ts` | Novo: interfaces `AssistanceOrderModalProps`, `AssistanceFormState`. |
| `erp/src/pages/App/SalesOrder/Assistance/services/assistanceOrderService.ts` | Novo: funções puras de payload, blank check e cálculo de itens. |
| `erp/src/pages/App/SalesOrder/Assistance/hooks/useAssistanceOrderForm.ts` | Novo: hook orquestrador com RHF + Zod resolver, autosave debounced e proteção de desmontagem. |
| `erp/src/pages/App/SalesOrder/Assistance/components/*` | Novo: 6 componentes visuais desacoplados e barrel export `index.ts`. |
| `erp/src/pages/App/SalesOrder/Assistance/AssistanceOrderModal.tsx` | Novo: view declarativa desacoplada (~140 linhas). |
| `erp/src/pages/App/SalesOrder/modals/AssistanceOrderModal.tsx` | Re-export limpo do componente modular. |
| `erp/src/pages/App/SalesOrder/modals/OrderSelectionModal.tsx` | Linhas 44–120: filtro `delivered`, paginação 15 itens/página. |
| `erp/src/components/NoticeInput.tsx` | Linhas 32–40: defensiva `setFrequencies(freq || {})` com try/catch. |
| `erp/src/pages/App/SalesOrder/AssistanceOrderModalComponents/AssistanceSchedulingSection.tsx` | Arquivo obsoleto removido. |

**Validação e Provas Executadas:**
- `erp/src/pages/App/SalesOrder/Assistance/services/__tests__/assistanceOrderService.test.ts`: 4 testes aprovados (100%).
- `erp/src/pages/utils/__tests__/commercialAssistanceRules.test.ts`: 6 testes aprovados (100%).
- `erp/src/pages/App/SalesOrder/Assistance/__tests__/AssistanceOrderModal.test.tsx`: 3 testes aprovados (100%).
- `erp/src/pages/App/SalesOrder/modals/OrderSelectionModal.test.tsx`: 5 testes aprovados (100%).
- `erp/src/pages/utils/__tests__/orderSyncQueries.test.ts`: 11 testes aprovados (100%).
- Total: 29 testes aprovados sem falhas ou exceções não tratadas.


## Editor de posts — busca, seleção e template conferidos

**Problema e causa comprovada:** usePostEditor disparava busca/seleção de produto e composição por IA sem resolver próprio, com consultas sem prazo. Resposta antiga e preferência local não confirmada podiam afetar a prévia; falha no carregamento complementar podia deixar loading ativo. O salvamento de template não tinha guarda comum/contexto/recibo, e templateService marcava persistedRemotely apenas pela ausência de error, sem select de confirmação. Falha de transporte era convertida em aparente sucesso local. Erros do hook não eram apresentados pelos dois consumidores atuais.

**Solução:** contratos explícitos compartilhados para consulta paginada, produto da prévia (vazio remove preferência), campanha e composição; template mantém seu schema de domínio. RHF acompanha cada operação até serviço/resultado; entrada parseada é usada na consulta/seleção/IA/persistência. Produto/campanha anteriores são preservados em falha; respostas antigas são descartadas por sessão/revisão, e fila de seleção conserva a intenção mais recente. Preferência local só é publicada após confirmação do produto, carregamento complementar e setItem/removeItem conferido. Análise opcional da foto tem fallback após10s. Busca15s, produto20s e templates20s no proprietário; sessão/consultas antigas não publicam resultados.

Salvamento e composição compartilham trava síncrona; salvar tem ID pré-alocado estável por tentativa e timestamp atual. Resolver continua ativo até recibo de save (20s no serviço/25s no proprietário). Falha conhecida permite repetir com a mesma identidade; resultado incerto bloqueia repetição na instância. Composição tem prazo90s, valida input e resultado antes de alterar camadas/slogan. Troca de revisão/sessão descarta resultado anterior. Seleção de template também executa o resolver; a campanha selecionada é confirmada após consultar seus templates.

**Serviço e compatibilidade:** save({confirm:true}) valida o contrato completo e exige select.single com o mesmo snapshot, incluindo JSON de camadas/layouts/settings e instante updatedAt. Chaves JSON em ordem diferente são equivalentes; valores distintos não são. O cache local confirma set/get, preserva histórico ilegível e rejeita substituição local por versão anterior. Recibo remoto válido continua válido quando o cache falha. Recusa explícita do servidor permite retorno persistedRemotely:false apenas com armazenamento local confirmado; transporte/timeout/recibo divergente conservam status incerto. Caminhos legados sem confirm conservam contrato anterior e seguem em conferência própria. getAll recebe prazo15s e marca registros remotos como confirmados.

**Consumidores:** MarketingPostsManager usa busca/seleção para a prévia e ModelFormModal também usa o hook; ambos apresentam sua mensagem. ModelProductPicker, biblioteca sem consumidor localizado, só confirma seleção/fecha após retorno verdadeiro. save/run/selectTemplate/selectCampaign não têm acionador ativo localizado nos consumidores atuais; foram conferidos como métodos retidos do proprietário, sem reativar interface. Autosave de templates/useTemplateWorkspace permanece em item próprio.

**Arquivos e linhas:**

| Arquivo | Região modificada |
|---|---|
| shared-utils/postEditorFormSchemas.ts | novo,1–11: consulta/produto/campanha/composição. |
| shared-utils/marketingFormSchemas.ts | 83: helper aceita timestamps opcionais do contrato de entrada sem perder metadata. |
| erp/src/pages/App/Marketing/Posts/components/Editor/usePostEditor.ts | 1–80: contratos, busca e sessão;100–213: seleção/campanha/composição/salvamento;retorno: loading agregado e guarda da revisão. |
| erp/src/pages/App/Marketing/Posts/services/templateService.ts | 6–9,35–48,51–79,89–150: schema, confirmação local/recibo remoto, prazo/contexto e compatibilidade optativa. |
| erp/src/pages/App/Marketing/Posts/components/Editor/ModelProductPicker.tsx | 12–19,39: busca estável, callback verdadeiro antes de fechar e erro visível. |
| erp/src/pages/App/Marketing/Posts/index.tsx | 327: mensagem do hook ativo. |
| erp/src/pages/App/Marketing/Posts/components/ModelFormModal.tsx | 276: mensagem do hook ativo. |
| erp/src/pages/App/Marketing/Posts/components/Editor/usePostEditor.test.tsx | novo:12 provas do proprietário, incluindo PreviewProductPicker real. |
| erp/src/pages/App/Marketing/Posts/services/templateConfirmation.test.ts | novo: dez provas do serviço real/contratos de recibos e cache. |
| inventário principal, continuidade e índice fiscal | cobertura, evidências e caminhos ainda pendentes. |

**Validação:**162 testes em17 arquivos aprovados no gate final, incluindo22 provas novas do editor/serviço e11 da biblioteca de autosave. Persistência legada de templates, composição e proprietários anteriores de marketing preservados. Lint sem erros; quatro avisos anteriores do ModelFormModal fora da linha de feedback. TypeScript global mantém305 diagnósticos fora das fontes/testes deste lote; não está aprovado globalmente. Build ERP completo com startup fiscal aprovado em1m37s. Logs: scratch/rhf-post-workspace-final-{tests,lint,tsc,build}.log. Sem novo pacote, chamada real de IA, escrita Supabase, migration, transmissão ou deploy.

**Limites:** testes simulam Auth, Supabase, IA, análise de foto e serviços de produto; provam o encadeamento local e a composição com o picker real, sem comprovar permissões/concorrência/versionamento remoto. Cache/controle de timestamp não substitui controle de concorrência no banco. Timeout não cancela transporte; geração pode continuar e a trava incerta dura na instância/sessão montada. Cache local confirmado não equivale a sincronização remota. Proprietário ativo e métodos retidos estão conferidos; autosave da biblioteca foi conferido na continuação abaixo. Demais formulários ERP/mobile/catálogo continuam pendentes.

## Autosave de templates — biblioteca proprietária e fila conferidas

**Problema e causa comprovada:** scheduleTemplateSave gravava cache e avisava que havia salvado antes do resolver acompanhar o serviço; useTemplateWorkspace concluía validateAndRun assim que agendava a fila. Edições rápidas podiam ser descartadas enquanto o resolver anterior trabalhava. A leitura não encerrava loading em erro; respostas antigas não eram vinculadas à sessão/campanha. change() construía o novo objeto apenas com layouts/updatedAt e descartava editorSettings produzido por setSettings.

**Solução:** fila mantém debounce700ms, consolida o último snapshot e serializa gravações por ID. O agendador não grava nem chama templateService diretamente: executa a função de persistência do proprietário. Esse callback usa enqueueAndRun/RHF/zodResolver até save({confirm:true}) e seu recibo, com prazo25s no proprietário/20s no serviço. Não há anúncio de salvamento local antes da confirmação. Validação inválida não chama serviço/cache. Edição posterior é preservada na fila enquanto aguarda o primeiro recibo; retorno antigo não substitui o status da revisão atual.

Contexto de sessão/campanha e cleanup cancelam itens ainda não enviados; resposta antiga não publica em outro contexto. Resultado incerto bloqueia novas gravações/retry desse ID na instância; recusa conhecida conserva estado e permite retrySave explícito com a mesma identidade. Consulta de20s no proprietário encerra loading em todos os resultados, limpa o proprietário anterior antes de trocar campanha e oferece reload. Estado carregado é validado, dois layouts são preservados, e editorSettings atualizado é incorporado ao estado/payload. Recibo somente local continua com mensagem explícita de sincronização indisponível.

**Arquivos e linhas:**

| Arquivo | Região modificada |
|---|---|
| erp/src/pages/App/Marketing/Posts/services/templateAutosave.ts | 1–49: job com callback do proprietário/contexto, fila/debounce, status e cancelamento pendente; retiradas escritas fora do resolver. |
| erp/src/pages/App/Marketing/Posts/components/Editor/useTemplateWorkspace.ts | 1–3,75–147: sessão, consulta/validação, carregamento e callback RHF até recibo;149–181: settings preservados, reload e retry. |
| erp/src/pages/App/Marketing/Posts/components/Editor/useTemplateWorkspace.test.tsx | novo: onze provas com hook, fila, debounce e RHF reais. |
| inventário principal, continuidade e índice fiscal | disposição da biblioteca, evidências e limites. |

**Validação:** onze novas provas. Conjunto com editor/templates e proprietários anteriores de marketing:162 testes em17 arquivos aprovados; lint sem erros, quatro avisos anteriores de ModelFormModal fora da linha alterada. TypeScript global mantém305 diagnósticos fora das fontes/testes do lote; build ERP completo com startup fiscal aprovado em1m37s. Logs: scratch/rhf-post-workspace-final-{tests,lint,tsc,build}.log. Revisão React conferiu dependências, fila e cleanup, respostas antigas e ausência de autosave no carregamento inicial.

**Disposição e limites:** useTemplateWorkspace continua sem consumidor ativo localizado em erp/src; templateAutosave é chamado somente por esse proprietário. Biblioteca retida e conferida sem reativar tela; não são formulários operacionais ativos adicionais. O item de autosave existente no inventário passa a apontar proprietário e agendador juntos, pois o módulo agora apenas agenda a mesma submissão validada. Não há nova operação independente nem alteração de denominador. Testes simulam persistência/Auth; provas de recibos reais são locais e não provam RLS/concorrência remota. Timeout não cancela I/O já enviado, a fila é em memória e trava incerta dura na instância. Não houve escrita remota, migration, mensagem, geração real por IA ou transmissão. Editor ativo/métodos retidos e autosave de biblioteca encerram dois itens existentes: ERP118/132 (89,4%),14 pendentes.

## Replicação e Paridade: Módulo de Produtos ERP → Mobile App

**Problema e sintomas observados:**
1. **Publicação no Catálogo Digital e Feedback de Rascunhos:** No aplicativo móvel, o botão de catálogo bloqueava produtos em rascunho com um alerta genérico opaco (`Alert.alert('Produto em Rascunho', ...)`), sem avaliar e detalhar os campos obrigatórios pendentes. No ERP (`2b4833f4`), o botão de catálogo foi desbloqueado para permitir que o usuário visualize uma lista detalhada com marcadores (`• Pelo menos uma foto deve ser adicionada`, etc.) e uma nota orientando a finalização do rascunho. Além disso, a validação de dimensões no mobile exigia estritamente todas as 3 dimensões (largura, altura, profundidade), ao passo que o ERP permite produtos com dimensões não aplicáveis desde que pelo menos uma dimensão física ativa seja positiva.
2. **Exibição de SKU em Produto com Variação Única:** No ERP (`547bcf6c` e `0df5a0bd`), quando o produto possui apenas 1 variação (`singleVariation`), o cabeçalho do card exibe o SKU normalizado da variação (`000100-01`) em vez do código base do pai (`000100`). No mobile, o card renderizava apenas `product.code`.
3. **Validação de Fornecedor e Dimensões na Variação:** Em `productRegistrationRules.ts`, `getMobileVariationRegistrationIssue` exigia fornecedor diretamente no objeto pai ao cadastrar/salvar a variação, gerando falso bloqueio caso o rascunho do pai ainda não tivesse fornecedor selecionado ou fosse produção própria/serviço. No ERP (`productVariationRules.ts`), a validação de variação descarta erro de fornecedor porque a variação herda o fornecedor do pai e a validação do fornecedor pertence ao formulário principal do pai ao concluir. Além disso, dimensões com valor "Não se aplica" no cadastro técnico eram computadas como ausentes no mobile.

**Solução técnica implementada:**
1. **Compartilhamento de Regras em `shared-utils/catalogPublicationValidation.ts`:** Criada biblioteca canônica compartilhada contendo `checkEcomLegibility` e `validateCatalogPublication`, mantendo paridade estrita de mensagens, requisitos de fotos, categorias, preço, dimensões com tolerância a "não se aplica" e identificador de artefatos de teste fiscal (`isTestProduct`).
2. **Delegação no ERP:** `productLegibilityRules.ts` e `useProductsCatalogActions.ts` foram refatorados para consumir `catalogPublicationValidation.ts`, eliminando duplicações e assegurando retrocompatibilidade total.
3. **Replicação no Mobile (`useMobileProducts.ts` & Componentes):**
   - Em `useMobileProducts.ts`, o fluxo de alternância de catálogo (`handleToggleCatalog`) passou a executar `validateCatalogPublication`, apresentando o alerta estruturado com todos os itens faltantes e nota de rascunho quando pertinente.
   - Em `MobileChannelBadges.tsx` e `MobileProductVariationCard.tsx`, removidos os bloqueios antecipados que impediam a chamada a `onToggleCatalog` em itens em rascunho.
4. **Exibição de SKU de Variação Única no Mobile (`MobileProductCard.tsx`):**
   - Integrado `normalizeVariationSku` em `MobileProductCard.tsx` para computar `displaySku`: quando houver variação única, apresenta o SKU normalizado da variação; caso contrário, apresenta o código do pai.
5. **Harmonização de Regras de Variação (`productRegistrationRules.ts`):**
   - Ajustada a verificação de dimensões para ignorar campos configurados explicitamente como "não se aplica", "nao se aplica" ou "n/a" em características técnicas.
   - Removida a exigência indevida de fornecedor no nível da variação em `getMobileVariationRegistrationIssue`, alinhando-se a `productVariationRules.ts` do ERP.

**Arquivos e linhas modificados:**
| Arquivo | Modificação / Linhas |
|---|---|
| `shared-utils/catalogPublicationValidation.ts` | Arquivo novo: implementação canônica de `checkEcomLegibility` e `validateCatalogPublication`. |
| `erp/src/pages/App/Products/domain/productLegibilityRules.ts` | 9–14: reexporta `checkEcomLegibility`, `EcomLegibilityResult` e `isPositiveNumber` de `shared-utils`. |
| `erp/src/pages/App/Products/ProductList/hooks/actions/useProductsCatalogActions.ts` | 108: reexporta `validateCatalogPublication` da biblioteca canônica compartilhada. |
| `mobile/src/features/products/hooks/useMobileProducts.ts` | 5, 150–175: integra `validateCatalogPublication` e remove validação manual ad-hoc divergente. |
| `mobile/src/features/products/components/MobileChannelBadges.tsx` | 63–75: remove retorno precoce em rascunho no `handleToggleCat`. |
| `mobile/src/features/products/components/MobileProductVariationCard.tsx` | 95–99: remove bloqueio precoce em rascunho do pai no toggle de catálogo da variação. |
| `mobile/src/features/products/components/MobileProductCard.tsx` | 31, 241–252, 281: computa e exibe `displaySku` para produtos com variação única. |
| `mobile/src/features/products/domain/productRegistrationRules.ts` | 122–165: alinha isenção de dimensões "não se aplica" e remove exigência indevida de fornecedor em variações. |
| `mobile/src/features/products/domain/productRegistrationRules.test.ts` | 185–212: novos testes cobrindo isenção de fornecedor e dimensões "não se aplica". |

**Validações e Testes Executados:**
- **Testes Unitários Mobile:** 21 arquivos de testes do módulo de produtos executados via `npm run test:unit:mobile --prefix erp -- src/features/products`, com **139 testes aprovados** (0 falhas).
- **Testes Unitários ERP:** `catalogPublicationValidation.test.ts` e `productLegibilityRules.test.ts` executados via `npm run test:unit`, com **20 testes aprovados** (0 falhas).

## Variações — recorte, envio, propagação e busca conferidos

**Problema e causa comprovada:** VariationPhotosTab enviava o recorte sem resolver do proprietário e a trava do modal não cobria preparação/upload. useVariationForm.handleReplaceImageGlobal alterava imagens locais antes de aguardar o callback e absorvia falhas ao sincronizar o pai. O callback do formulário do produto devolvia void assim que agendava autosave. No cropper, a promessa retornada dentro de try/finally não era aguardada: a trava era liberada antes do resolver terminar, permitindo Escape enquanto enviava. Carga/compressão/upload/callback não tinham limite uniforme. A busca compartilhada já validava valores, mas liberava o resolver antes do I/O, não expunha searchError/retry no componente e não recebia disabled do proprietário.

**Solução de propriedade:** useVariationForm recebe contratos explícitos de arquivo/origem e substituição HTTPS em shared-utils. RHF acompanha o arquivo até upload e aplicação; substituição também executa resolver próprio. A trava comum cobre preparação, upload e propagação, impedindo conclusão/fechamento/edições do modal. Sessão inclui usuário, produto e variação; retorno antigo não altera outro contexto. Fotos da variação e referência do pai só são atualizadas após callback/serviço resolver. Timeout/resultado incerto mantém erro e bloqueia repetição/salvamento final no proprietário.

**Recorte real e fila de efeitos:** SquareImageCropper aguarda validateAndRun antes do finally, limita a carga a15s, canvas a10s, compressão a15s e callback composto a95s. Os limites internos do proprietário são55s para o helper de upload e30s para propagação. O recortador abre por portal no fluxo de variação, mantendo seus controles acessíveis enquanto o campo proprietário está desativado. Escape cancela somente o cropper ocioso e não fecha o modal enquanto trabalha; ponteiros já iniciados também respeitam a trava. Erro/progresso ficam visíveis, URLs temporárias e timers são liberados. Mesma geometria/preparação reaproveita o File; após upload confirmado, recusa explícita da aplicação repete só o callback com a mesma URL, sem nova compressão/envio.

**Upload:** helper valida arquivo antes de preparar/enviar, conserva uma identidade para original/média/thumb, limita preparações a10s cada e uploads a30s. Exige URL HTTPS válida do original; falha opcional de derivada conserva o original confirmado. Falha local conhecida permite retry; retorno original ausente/divergente ou transporte incerto não fabrica URL nem autoriza repetição automática. Contexto é conferido antes de iniciar upload depois da preparação.

**Propagação ao produto:** callback do formulário do produto aplica um snapshot explícito em imagens e variações, confirmando a aplicação local. Produto registrado continua com alteração no formulário até seu salvamento normal; não se anuncia persistência remota por essa confirmação local. Para produto rascunho, callback aguarda autoSaveDraft; ausência de confirmação conserva o rascunho alterado e retorna erro incerto. Sem callback de agregado local, o proprietário aguarda o contrato void existente de updateProduct, sem absorver sua falha; exige pai disponível no cache. Ctrl+S do formulário pai respeita o modal de variação aberto.

**Busca de componentes:** ProductAutocomplete encaminha disabled, mostra erro/retry e rejeita sugestão de outro contexto/geração. useProductAutocomplete mantém enqueueAndRun ativo durante consulta, utiliza query/fornecedor/opções parseados, prazo10s, descarte antigo e nova validação no retry. A composição real conserva preço/estoque zero. As duas suítes antigas desse componente passaram a happy-dom: jsdom não inicializava neste checkout Windows por ausência do binário canvas.node; não havia resultado de teste para contar nessa tentativa. Não alteradas as asserções funcionais desses testes.

**Arquivos e linhas modificados:**

| Arquivo | Região modificada |
|---|---|
| shared-utils/productImageFormSchemas.ts | 2–5: upload de recorte e substituição HTTPS. |
| erp/src/pages/App/Products/hooks/variation/useVariationForm.ts | 1–5,39,371–442,retorno: dois resolvers, trava compartilhada, upload/callback limitados, erro/recusa/incerteza e estado aplicado após resposta. |
| erp/src/pages/App/Products/modals/VariationFormModal.tsx | 36–49,113–125,248–250: identidade de usuário, Escape e encadeamento real do recorte. |
| erp/src/pages/App/Products/components/tabs/images/VariationPhotosTab.tsx | 1–74,247–253: encaminhamento ao proprietário, fallback validado, recibo de arquivo e erro. |
| erp/src/pages/App/Products/components/tabs/images/SquareImageCropper.tsx | 1–48,50–108,156–245,255–270,476: espera correta, contexto/prazos, preparação reaproveitada, feedback/guardas e portal. |
| erp/src/pages/App/Products/components/tabs/images/productImageUpload.ts | 3–5,14–fim: arquivo, contexto, preparações/envios limitados e confirmação da URL. |
| erp/src/pages/App/Products/hooks/form/useProductFormModal.ts | 344–348,475–489: Ctrl+S e callback aguardável com snapshot/rascunho. |
| erp/src/pages/App/Products/components/form/ProductFormSubModals.tsx | 21: contrato aguardável de aplicação com recusa explícita. |
| erp/src/components/ProductAutocomplete.tsx | 77–97,253: disabled, erro/retry e seleção atual. |
| erp/src/components/hooks/useProductAutocomplete.ts | 47,93–181,206: resolver até consulta e opções parseadas. |
| erp/src/pages/App/Products/modals/VariationFormModal.test.tsx | mocks/cleanup e198–fim: oito provas novas com modal/hook/cropper reais. |
| erp/src/pages/App/Products/hooks/form/useProductFormModal.variation.test.tsx | mocks,83 e99–fim: quatro provas novas da propagação no pai; fixture pendente completa o tipo Variation existente. |
| erp/src/components/forms/imageCropOwners.test.tsx | cleanup e29–35: carga de origem limitada. |
| erp/src/pages/App/Products/components/tabs/images/productImageUpload.test.ts | novo: oito provas do helper real e transporte simulado. |
| erp/src/components/ProductAutocomplete.form.test.tsx | novo: cinco provas do componente/hook/RHF reais. |
| erp/src/components/ProductAutocomplete.ai.test.tsx e ProductAutocomplete.variationDisplay.test.tsx | 1: runtime DOM compatível com checkout. |
| inventário principal, continuidade e índice fiscal | evidências e fechamento do agregado após conferir seus caminhos antes pendentes. |

**Validação:**137 testes em16 arquivos aprovados após o catch final da preparação de origem (26 provas novas), incluindo conclusão/rascunho/preços, seleção/reordenação/fotos, composição real do modal e busca. Lint sem erros; três avisos anteriores nos hooks. TypeScript global294 diagnósticos fora das fontes/testes do lote. Build ERP completo com startup fiscal aprovado em1m48s. Agregado de variações conferido: ERP119/132 (90,2%),13 pendentes no inventário principal; não é conclusão global de ERP/mobile/catálogo. Logs finais: scratch/rhf-variation-images-final-{tests,lint,tsc,build}.log.

**Limites:** serviços de produto, R2, Supabase, compressão/canvas e Auth são simulados. Testes provam o encadeamento do proprietário e contratos locais, sem certificar pixels reais/CORS, permissões, linha persistida, transação ou concorrência remota. updateProduct preserva seu retorno void existente; resolver esse contrato não equivale a uma leitura independente do registro no banco. Registro/arquivo/imagens globais não formam transação atômica. Arquivo enviado antes de falha na aplicação pode permanecer sem vínculo; não há exclusão automática. Timeout não cancela todo transporte já iniciado; recibos e travas de imagem são da instância/sessão. Não houve gravação real, migration, transmissão ou deploy. Cancelamento/estorno e política de ausência de CC-e permanecem conforme documentação vigente.

## Modelo de etiqueta — biblioteca de recorte conferida

**Problema e causa comprovada:** LabelModelCreationModal liberava validação antes de terminar FileReader; a prévia desenhava sem executar o resolver. Aplicar gerava outra Image assíncrona e esperava100ms fixos antes de ler o canvas/fechar, podendo enviar resultado vazio ou antigo. Callback onApply era tratado como void; não havia prazo/trava comum ou erro visível durante leitura/aplicação. O schema não conferia dimensões carregadas, limites nem interseção do recorte com a imagem.

**Correção:** leitura reutiliza readImageFile já existente (10s/AbortSignal), dentro do resolver real. Prévia e aplicação usam o mesmo contrato explícito de imagem/escala/geometria antes do canvas. O recorte usa a imagem exibida com dimensões confirmadas, calcula sua interseção visível e devolve o PNG sincronamente; removidos Image extra e atraso fixo. Seleção inicial é ajustada a displays estreitos. Mesma geometria reutiliza o PNG preparado, e uma recusa explícita permite repetir somente o callback. Arquivo inválido/dimensões zero/recorte sem interseção/canvas vazio bloqueiam o efeito com erro.

Callback permanece no resolver até confirmação, com30s de limite; resultado incerto bloqueia repetição na instância. Campos, ponteiros, cabeçalho/backdrop/Cancelar/Escape compartilham a trava. Leitura pode ser repetida para o mesmo arquivo; erros de decode são visíveis. Sessão própria por abertura/contextKey cancela leituras e impede callback antigo de fechar/destravar outro contexto. Controles e imagens são preservados após falha conhecida; progresso/erro ficam na interface.

| Arquivo | Linhas modificadas |
|---|---|
| shared-utils/labelDesignFormSchemas.ts | 367–377: imagem, escala, dimensões e interseção da geometria. |
| erp/src/pages/App/Stock/LabelPrinting/modals/LabelModelCreationModal.tsx | 4–8,10–71: contratos/sessão/guardas e cleanup;83–101: leitura aguardada;145–180: canvas validado e callback confirmado;190–fim: feedback, fechamento/controles, metadados da imagem e display estreito. |
| erp/src/pages/App/Stock/LabelPrinting/modals/LabelModelCreationModal.test.tsx | novo:13 provas com componente, FileReader, canvas e resolver reais no encadeamento; APIs nativas simuladas. |
| inventário principal, continuidade e índice fiscal | disposição da biblioteca, evidência e cobertura. |

**Provas:**37 testes em quatro arquivos aprovados, incluindo13 novos do proprietário e regressões de estado/controles/página da arte. Lint das três fontes/testes sem erros/avisos. TypeScript global mantém294 diagnósticos fora deste lote; não está aprovado globalmente. Build ERP completo com startup fiscal aprovado em1m30s. Logs: scratch/rhf-label-model-creation-final-{tests,lint,tsc,build}.log. O reset final do input foi novamente conferido nos37 testes. Nenhum pacote adicionado.

**Disposição:** busca de consumidores em erp/src localiza somente a declaração e os testes. Biblioteca retida e conferida, sem reativar tela nem declarar formulário operacional ativo. Fechado um item já existente: ERP120/132 itens encerrados (90,9%),12 pendentes no principal; censo adicional/mobile/catálogo continuam separados. Testes não certificam pixels/decodificação reais, impressão física ou persistência no consumidor futuro. onApply aceita void/true como confirmação do contrato e false como recusa; sua implementação continua responsável pelo efeito. Timeout não cancela callback já iniciado e bloqueio incerto é da instância. Sem escrita remota, migration, mensagem, transmissão ou deploy.


## Assistente global — envio, histórico e voz conferidos

**Problema e causa comprovada:** o componente ativo no AppLayout só validava o texto; enviava histórico/contexto da closure e gravava histórico/preferência diretamente em efeitos. getItem fora do try podia derrubar a tela, dados inválidos eram descartados e sobrescritos silenciosamente, e o texto era apagado antes da resposta. Voz criava reconhecedores sem cleanup e agendava envio dentro do updater de estado, capturando histórico antigo. O serviço não limitava esperas nem conferia contexto entre modelo e ferramentas. Três provas iniciais falharam reproduzindo perda antecipada do rascunho, falha de leitura e cache inválido sem aviso (scratch/rhf-agent-chat-baseline-tests.log).

**Solução:** quatro contratos explícitos compartilhados: envio com texto/histórico/contexto; persistência de mensagens/histórico; limpeza confirmada; preferência de voz. Cada intenção mantém o useZodForm/zodResolver real até seu efeito terminar. A operação recebe valores parseados; resposta e conteúdo do modelo são conferidos antes de publicação/despacho. Metadados do provedor são preservados; os argumentos/resultados dinâmicos das ferramentas não substituem suas regras de serviço/backend. Leitura inválida/inacessível apresenta aviso e impede sobrescrever o cache até limpeza explícita. Escritas e remoções locais conferem readback; falha de cache depois de uma resposta confirmada conserva essa resposta e não dispara novamente o serviço.

Envio por Enter, botão, drawer/floating e voz compartilha trava síncrona. O rascunho só é limpo após resposta válida e se não foi editado durante a espera. Contexto de usuário/rota/abertura e AbortController impedem publicar resposta antiga ou iniciar ferramentas posteriores; esperas têm prazo de30s/modelo,20s/ferramenta e90s/conversa. Falha após ferramenta despachada é incerta, com aviso e bloqueio da mesma mensagem normalizada na instância, inclusive após limpar o histórico. Recusa conhecida antes de ferramentas permite nova tentativa. O limite de iterações e a ausência de texto não declaram operação bem-sucedida.

Reconhecedor e timer de silêncio têm cleanup por fechamento/rota/usuário/unmount, e os callbacks leem o envio/histórico atual. O microfone pausa durante consulta e reprodução da resposta, sem capturar a fala do próprio assistente; término/erro de voz e prazo de60s liberam ou encerram a chamada com feedback. Formas visuais têm rótulos acessíveis e status/erro persistentes.

**Arquivos e linhas:**

| Arquivo | Alteração |
|---|---|
| shared-utils/agentChatFormSchemas.ts:1 | Contratos explícitos de conteúdo, ferramenta, envio, resposta, cache, limpeza e voz (linhas6–42). |
| erp/src/components/shared/AIChatAssistant.tsx:44 | Contexto autenticado; leitura segura107–125; proprietários131–134; travas/sessão135–175; voz179–270; cache274–287; envio289–349; limpeza351–368; status/erro/controles em ambos os layouts. |
| erp/src/services/aiAgent/geminiAgentService.ts:18 | Opções de contexto/aborto e erro com classificação; sendMessage132–240 limita modelo/ferramentas/total, valida conteúdo e confere atualidade antes/depois de cada espera. Prompt e contratos de negócio das ferramentas preservados. |
| erp/src/components/shared/AIChatAssistant.test.tsx:1 |25 testes do componente real com RHF/resolvers reais; serviços, cache e APIs de voz simulados. |
| erp/src/services/aiAgent/__tests__/geminiAgentRequest.test.ts:1 |10 provas da orquestração real: contexto, aborto, resposta tardia, prazos por etapa/total, dispatch e resposta inválida; modelo/dispatcher simulados. |
| docs/audits/fiscal-2026-10-14/form-migration-inventory.md:7 | Checkpoint e fechamento das duas referências do assistente (principal e censo), sem dupla contagem. |
| docs/forms/migracao-rhf-zod-2026-10-14.md:3; docs/forms/continuidade-formularios-2026-10-16.md:5; docs/fiscal/README.md:9 | Checkpoint e referência vigente sincronizados. |

**Prova final:**45 testes em quatro arquivos, sendo25 novos do componente,10 novos do serviço e10 regressões conversacionais existentes. Lint dos cinco arquivos de fonte/teste passou sem erros/avisos. Build ERP completo com startup fiscal passou em1m35s. TypeScript global mantém294 diagnósticos fora destes arquivos, sem aprovação global do projeto. Logs: scratch/rhf-agent-chat-final-{tests,lint,build,tsc}.log; configuração de lint compartilhado: scratch/agent-chat-rhf-eslint.config.mjs.

**Limites e cobertura:** um proprietário existente encerrado: ERP121/132 (91,7%),11 pendentes no principal; censo adicional, mobile e catálogo continuam abertos. IA/dispatcher, armazenamento e voz foram simulados: não certifica microfone/áudio real, permissões, persistência de lançamentos/feedback, transação remota ou concorrência entre abas. Aborto/prazo não desfaz ferramenta já enviada nem cancela todos os transportes iniciados. O bloqueio de mensagem incerta é da instância e não uma chave de idempotência persistida. As duas chaves legadas de histórico foram preservadas; readback não as torna uma transação atômica e este lote não altera sua política de armazenamento por usuário. Sem chamada paga de IA, gravação comercial, transmissão, migration, mensagem externa ou deploy. Política de ausência de CC-e e elegibilidade de cancelamento/estorno não foram alteradas.


## Relatórios Bling — proprietário e composição conferidos

**Problema e causa comprovada:** o período do Index já tinha um resolver, mas o hook gravava nome/configuração e dados calculados diretamente no Supabase, sem validar o payload agregado nem conferir o recibo. Update aceitava nenhuma linha como sucesso, exclusão não conferia ID e consultas engoliam erros. A busca paginada interrompia em erro/limite devolvendo as páginas anteriores, permitindo gravar análise incompleta. O cálculo preparatório alterava totais/datas da tela antes de salvar. O nome usava Date de meia-noite UTC para um campo de data local, podendo rotular o mês anterior. Três testes iniciais reproduziram nome vazio e NaN chegando à gravação e update sem recibo aceito (scratch/rhf-bling-report-baseline-tests.log).

**Solução e proprietário:** schemas explícitos compartilhados para configuração, métricas calculadas, períodos, conteúdo consumido do provedor, gravação/criação/atualização/exclusão, consultas e filtros da visualização. Valores financeiros finitos podem ser negativos; não foram inferidas restrições de lucro/giro positivo. Configuração vazia continua válida para os defaults do cálculo, e campos legados de mapeamento/configuração são preservados. Histórico de métricas mensais ausentes é normalizado somente na leitura, mantendo o fallback existente, sem regravar relatórios antigos.

O hook executa RHF/zodResolver real antes de cada efeito e mantém o proprietário até resposta/recibo. Criação conserva UUID na recusa conhecida; criar/atualizar comparam ID, tipo, fonte, nome, configuração e dados retornados, independentemente da ordem das chaves JSONB. Exclusão exige o ID exato no retorno; get exige o relatório solicitado e o tipo correto. Recusa conhecida permite retry; resultado incerto congela novas gravações naquele contexto da instância, mantendo consultas para conferência. Gravação confirmada seguida de falha só no refresh retorna o recibo e não repete automaticamente a mutação.

Consultas e páginas têm prazo de15s; gravação20s e importação90s no total. Alteração de usuário/relatório/modo ou unmount descarta resultados antigos e impede iniciar outra página/gravação na sequência. Erro posterior, página inválida ou teto de50 páginas encerram a importação com erro, sem devolver dados parciais. Os estados e cálculo dos itens atendidos/enviados (6/9), zeros para campos de valor ausentes e regras da curva ABC/giro existentes foram preservados; preparar resultado com returnRaw não altera a análise exibida.

Index mantém submissão até consulta/cálculo/gravação/recibo e navega apenas com confirmação, guarda o intervalo no config.dateRange, preserva campos em falha e mostra status/erro/retry. O rótulo usa a data validada sem conversão UTC. View usa o proprietário de consulta, valida filtros/URL antes de aplicá-los, conserva erro e permite recarregar. Callback retido de configuração valida o agregado antes das consultas, aguarda gravação e reload, trava fechamento e conserva recibo para repetir somente a leitura após confirmação conhecida.

**Disposição da configuração:** Router.tsx:296–307 monta as duas rotas Bling e o menu desktop aponta para a lista. Há criação/lista/exclusão e leitura operacionais. A View mantém isConfigOpen inicial false e nenhum setIsConfigOpen(true) localizado; o ramo de configuração é biblioteca retida, sem reativação nesta tarefa. As provas de composição não afirmam abertura operacional desse ramo. O contrato de atualização e seus recibos/contexto foram exercitados diretamente no proprietário do hook; o modal compartilhado tem nove regressões próprias.

**Arquivos e linhas:**

| Arquivo | Alteração |
|---|---|
| shared-utils/salesReportFormSchemas.ts:1 | Configuração, métricas/relatório, intents/recibos e consultas (5–46); filtros/URL47 e página do provedor54. |
| erp/src/pages/App/SalesOrder/ReportsBling/useSalesReport.ts:43 | Proprietário/autorização/contexto e formulários; query84–118; preparação de cálculo sem aplicar estado120–315; filtro317; consulta paginada366; gravação407–462 com recibos/trava/prazo e falha parcial explícita. |
| erp/src/pages/App/SalesOrder/ReportsBling/Index.tsx:9 | Rótulo de período sem UTC; formulário39; submissão51–75 até navegação confirmada; campos/status/erro e exclusão aguardada98–202. |
| erp/src/pages/App/SalesOrder/ReportsBling/ReportView.tsx:92 | Contratos no proprietário; consulta145, callback retido184 e filtros/URL214; erro/retry346 e progresso/fechamento440. |
| erp/src/pages/App/SalesOrder/ReportsBling/useSalesReport.test.tsx:1 |31 provas do hook real com RHF/resolvers reais, transporte/provedor simulados. |
| erp/src/pages/App/SalesOrder/ReportsBling/reportsBlingOwner.test.tsx:1 |Nove provas das páginas reais com hook/RHF reais, sem simular o proprietário; transporte, Auth, router, gráficos, visão de fornecedores e provedor são simulados. |
| docs/audits/fiscal-2026-10-14/form-migration-inventory.md:7 | Checkpoint e fechamento do hook principal e censo do Index, um único incremento. |
| docs/forms/migracao-rhf-zod-2026-10-14.md:3; docs/forms/continuidade-formularios-2026-10-16.md:5; docs/fiscal/README.md:9 | Cobertura e referência vigente sincronizadas. |

**Prova final:**49 testes em três arquivos (31 do hook, nove da composição e nove regressões do modal compartilhado). A reprodução com TZ=America/Sao_Paulo confirmou que 2025-07-01 era rotulado06/25 e agora fica07/25 (scratch/rhf-bling-report-period-proof.log). Lint dos seis arquivos sem erros;34 avisos de código não utilizado da View já presentes no baseline, sem mensagem nova (baseline38, removidas também dependências incompletas). Build ERP completo com startup fiscal aprovado em1m42s. TypeScript global tem296 diagnósticos, nenhum nestes arquivos; o gate intermediário tinha294 e os dois adicionais estão em PersonAddressSection/CustomDeliveryAddressFields, fora do lote, por contrato de AddressVerificationMapProps. Não há aprovação global de TypeScript. Logs: scratch/rhf-bling-report-final-{tests,build,tsc}.log, scratch/rhf-bling-report-final-lint.json e baseline-view-lint.json; configuração: scratch/bling-report-rhf-eslint.config.mjs.

**Limites e cobertura:** ERP122/132 itens encerrados (92,4%),10 pendentes no principal. Censo adicional, ERP ReportView/autosave e mobile/catálogo mantêm suas pendências. Transporte Supabase/Bling e gráficos foram simulados: não certifica o contrato live da API Bling, permissões/RLS, persistência real, pixels, compartilhamento ou concorrência remota. Timeout não cancela todo transporte já iniciado; trava incerta e UUID de retry pertencem à instância/contexto, sem idempotência persistida entre abas/reaberturas. Escrita e refresh não são uma transação; resposta confirmada é distinguida de falha de leitura posterior. Relatórios históricos sem dateRange mantêm a consulta sem período do contrato legado, sem inventar um intervalo. Sem chamada real ao Bling, gravação comercial, migration, transmissão, mensagem externa ou deploy. CC-e segue ausente do produto; regras fiscais não foram modificadas.


## Relatórios ERP — proprietário, autosave e filhos conferidos

**Problema e causa comprovada:** a View validava só os filtros, gravando configuração inteira sem recibo e sem impedir autosave no modo público. Criação/atualização usavam o hook com persistência direta sem resolver do agregado; update aceitava zero linhas como resultado, e o modal fechava antes da confirmação. A preparação calculateABC(..., true) retornava results/allProducts vazios, impedindo criar análises úteis; três dos quatro testes iniciais reproduziram a inconsistência (scratch/rhf-sales-report-calculation-baseline-tests.log). Atualização CSV sem arquivo reutilizava allProducts com nomes de campos incompatíveis com SaleItem, convertendo receita/quantidade em zeros. Exclusões chamavam efeito dentro de updater e fechavam sem esperar o callback. Referências de produto validavam apenas adição; exclusão/leitura/refresh não tinham contratos/recibos/prazos. Leitura de arquivo não tinha resolver, cleanup ou prazo.

**Solução e preservação:** extraída a persistência já conferida do Bling para useSavedSalesReports, com schema conforme o módulo, intents separados de criação, atualização, configuração e exclusão, consultas list/get/mappings e contexto usuário/relatório/modo. A mesma prova de49 testes passou antes/depois da extração (scratch/rhf-sales-report-extraction-tests.log), antes de acrescentar o ERP. Ambos usam resolver RHF real até resposta/recibo; gravação completa exige dados calculados explícitos e configuração, enquanto filtros preservam o snapshot antigo e validam só o contrato apropriado. UUID estável em recusa conhecida, comparação de recibo e ID, trava/fila, prazo20s de escrita e15s de consulta. Incerto congela novas gravações na instância/contexto; refresh posterior a confirmação não repete a mutação. O modo público bloqueia gravação, inclusive para operador autenticado, e conserva a leitura compartilhada de relatório ERP ou Bling.

Index prepara ERP/CSV dentro do resolver proprietário, aguarda consulta/cálculo e confirmação, preserva modal e navega só após recibo. View restaura o baseline antes de autosave, valida/aplica filtros e URL, só grava mudança real após debounce1s, serializa snapshots atuais e descarta trabalhos cancelados. Última edição sobrevive ao recibo anterior; alteração manual aguarda o autosave já iniciado e conserva filtros atuais. Falha mostra aviso persistente e ação específica de retry sem apagar o digitado. Contexto antigo não preenche a tela de outro usuário/relatório. Atualização/gerência de itens espera confirmação antes de fechar; efeito saiu do updater.

O cálculo puro agora devolve o resultado completo em preparação e visualização; o hook decide se aplica estado. allProducts mantém também os excluídos, inclusive ao excluir tudo, para re-inclusão posterior. Preparação não muda totais/datas antes de confirmação. CSV novo tem conversão compartilhada de valores locais, conserva perdas e cálculo de lucro ausente e recusa data/número inválido. CSV sem novo arquivo reconstrói SaleItem explicitamente dos agregados completos; histórico incompleto pede reanexar arquivo, sem fabricar receita. Estruturas legadas de allProducts são toleradas na leitura/configuração sem se tornarem payload completo de gravação.

Modal compartilhado usa resolver de arquivo até FileReader/parse, prazo10s, AbortController/cleanup e erro/status; fechar/enviar fica protegido durante processamento. Callback recusado/rejeitado conserva modal/seleção. Referências têm proprietário real para lista, adição e exclusão confirmada, recibo/ID, trava/prazo/contexto e falha de refresh distinta de mutação. A API de consulta ERP limita etapa canônica/fallback/resolução a15s e o proprietário30s; timeout/troca de contexto não aciona novo fallback. Removidos os quatro exports sem consumidores de persistência direta em salesReportApiService, substituídos pelo proprietário compartilhado.

**Arquivos e linhas:**

| Arquivo | Alteração |
|---|---|
| shared-utils/salesReportFormSchemas.ts:24 | Produto/dados calculados; contratos ERP de escrita51, leitura histórica58, itens62, consulta/csv/exportação66–72, preparação73 e referências81–86; Bling preservado. |
| erp/src/pages/App/SalesOrder/Reports/hooks/useSavedSalesReports.ts:22 | Proprietário extraído; formulários/intents, query50, gravação87 e config144. Duas famílias preservadas, backend continua responsável por permissão e consistência remota. |
| erp/src/pages/App/SalesOrder/ReportsBling/useSalesReport.ts:47 | Usa a persistência compartilhada; orquestração/cálculo/importação Bling preservados. |
| erp/src/pages/App/SalesOrder/Reports/hooks/useSalesReport.ts:28 | Integra persistência; preparação sem aplicar estado; consultas70, importação90, exportação108 e restauração110 executam resolvers reais antes de seus efeitos. |
| erp/src/pages/App/SalesOrder/Reports/Index.tsx:29 | Preparação45–67 até confirmação/navegação; modal aguardado, falha/progresso e exclusão confirmada. |
| erp/src/pages/App/SalesOrder/Reports/components/ReportView.tsx:93 | Proprietários e contexto; leitura205, atualização333, filtros/URL374 e autosave399; callbacks filhos aguardados e modo público protegido. |
| erp/src/pages/App/SalesOrder/Reports/modals/ReportConfigModal.tsx:77 | Arquivo/readback local e lifetime; callback99 e fechamento185; upload136 e status/erro/finalização351. |
| erp/src/pages/App/SalesOrder/Reports/modals/ItemExclusionModal.tsx:24 | Callback aguardado, recusa/rejeição preservam seleção e impedem fechamento. |
| erp/src/pages/App/SalesOrder/Reports/modals/ProductReferenceModal.tsx:60 | Consulta e recibos; escrita78; add111/delete116; erros/status/controles. |
| erp/src/pages/App/SalesOrder/Reports/utils/reportCsvInput.ts:6 | Leitor nativo limitado/abortável e mapper28 com contratos de dados. |
| erp/src/pages/App/SalesOrder/Reports/utils/salesReportCalculations.ts:130 | Agregado preserva excluídos; resultados completos202–204 para preparar ou exibir. Métricas e classificação existentes mantidas. |
| erp/src/pages/App/SalesOrder/Reports/services/salesReportApiService.ts:8 | Consulta limitada/contextual; fallback só continua enquanto atual; exports antigos de escrita/listagem retirados. |
| erp/src/pages/App/SalesOrder/Reports/hooks/useSalesReport.test.tsx:1 |29 provas do hook real: payload, config, fila, recibo, consulta, contexto e erros. |
| erp/src/pages/App/SalesOrder/Reports/reportsOwner.test.tsx:1 |16 provas da composição real de Index/View/referências com RHF/hook reais, transportes/roteador/gráficos/Auth simulados. |
| erp/src/pages/App/SalesOrder/Reports/modals/reportModalLifecycle.test.tsx:1 |Sete provas de callbacks, arquivo inválido, prazo/aborto e conversão CSV. |
| erp/src/pages/App/SalesOrder/Reports/utils/salesReportCalculations.test.ts:1 |Cinco provas do cálculo/preparação/excluídos. |
| erp/src/pages/App/SalesOrder/Reports/services/salesReportApiService.test.ts:1 |Cinco provas do serviço real canônico/fallback/contexto/prazos; Supabase/canonicalização simulados. |

**Verificação e limites:**111 testes em oito arquivos aprovados, incluindo40 regressões Bling e nove do modal compartilhado. Lint de17 arquivos sem erros; nove avisos de código não utilizado da View já constavam no baseline16, sem aviso novo. TypeScript global312 diagnósticos fora dos arquivos deste lote; não há aprovação global. Build ERP completo com startup fiscal aprovado em1m42s. As duas tentativas anteriores falharam em imports do módulo de IA de produtos fora do lote, corrigidos por outra frente no checkout antes do build final; não houve reversão dessas mudanças. Logs: scratch/rhf-sales-report-final-{tests,build,build-retry,build-verified,tsc}.log, final-lint.json, baseline-view-lint.json e configuração scratch/sales-report-rhf-eslint.config.mjs. Leitura da skill Supabase/React e consulta do changelog/documentação de retorno de delete efetuadas; confirmação .select() segue o [contrato documentado](https://supabase.com/docs/reference/javascript/delete), sem alterar SDK/RLS/schema.

**Cobertura:** um item existente encerrado, agregado ERP de relatórios e filhos:123/132 (93,2%),9 pendentes no principal. A contagem não duplica o proprietário compartilhado nem os filhos já existentes. Censo adicional, mobile e catálogo continuam abertos; não há conclusão global. Inventário e continuidade sincronizados em docs/audits/fiscal-2026-10-14/form-migration-inventory.md:7, docs/forms/migracao-rhf-zod-2026-10-14.md:3, docs/forms/continuidade-formularios-2026-10-16.md:5 e docs/fiscal/README.md:9.

Transportes Supabase/Bling, Auth, canonicalização e gráficos foram simulados; FileReader/callbacks também são simulados nas falhas. Não certifica RLS, persistência real, atomicidade/concorrência entre abas, pixels/print ou dados live. Timeout não cancela todo transporte já iniciado; bloqueios de incerteza/UUID pertencem à instância/contexto. Configuração é um snapshot completo, sem controle transacional de concorrência remota. Métodos retidos de export/import/restauração validam no proprietário, mas não ganharam acionador operacional. Biblioteca de configuração do Bling continua sem reativação. Sem escrita real, chamada paga, migration, transmissão, mensagem externa ou deploy. CC-e segue ausente e elegibilidade fiscal não foi modificada.

## Desacoplamento de Características Técnicas do Cadastro/ERP e Ocultação para Estoquista

**Problema e sintomas observados:**
1. Asteriscos vermelhos (`*`) estavam visíveis em características técnicas nos componentes `TechnicalFieldRow.tsx` e `VariationTechnicalFieldItem.tsx`, sugerindo que eram campos obrigatórios para o cadastro/salvamento do produto no ERP.
2. O asterisco vermelho de `Preço de Venda` no formulário principal continuava visível mesmo quando o produto possuía variações (onde cada variação define ou sincroniza seu próprio preço).
3. A aba de características técnicas (`technical` no produto principal e `tecnico` no modal de variações) continuava visível para usuários com perfil estoquista (`isStockistOnly`), contrariando o princípio de que o estoquista apenas ativa produtos no ERP e não publica no Catálogo Digital.
4. A função `getVariationRegistrationIssue` bloqueava o cadastro de variações se características ou dimensões não estivessem preenchidas, impedindo que estoquistas e operadores salvassem o produto sem preencher requisitos que são de competência exclusiva da publicação no Catálogo Digital.

**Causa raiz técnica comprovada:**
- A renderização do asterisco em `TechnicalFieldRow.tsx` e `VariationTechnicalFieldItem.tsx` checava `field.isRequired`, propriedade do schema técnico que dita conformidade para o Catálogo Digital (`checkEcomLegibility`), e não obrigatoriedade de cadastro no ERP.
- As abas `technical` em `productFormTabs.ts` e `tecnico` em `variationModalTabs.ts` não estavam condicionadas a `!isStockistOnly`.
- As regras `missingDimensions` e `missingCharacteristics` foram indevidamente inseridas no fluxo de validação de registro da variação em `shared-utils/productVariationRules.ts` e `mobile/src/features/products/domain/productRegistrationRules.ts`.
- `ProductPricingFields.tsx` exibia `*` incondicionalmente no campo Preço de Venda, sem considerar `!formData.hasVariations`.

**Solução técnica implementada:**
1. **Remoção de Asteriscos Vermelhos de Características:** Excluído o render de `<span className="text-red-500">*</span>` de `TechnicalFieldRow.tsx` e `VariationTechnicalFieldItem.tsx`.
2. **Ocultação de Características para Estoquista (`isStockistOnly`):**
   - Condicionada a aba `technical` em `productFormTabs.ts` e `tecnico` em `variationModalTabs.ts` a `!isStockistOnly`.
   - Adicionados guards em `useProductFormModal.ts` e `useVariationForm.ts` para forçar redirecionamento a abas permitidas caso uma aba oculta esteja ativa em sessão de estoquista.
3. **Condicionamento de Preço de Venda em Produtos com Variações:**
   - Em `ProductPricingFields.tsx`, o asterisco de `Preço de Venda` agora só é exibido quando `!formData.hasVariations`.
4. **Desacoplamento de Características do Cadastro de Variações:**
   - Em `shared-utils/productVariationRules.ts` e `mobile/src/features/products/domain/productRegistrationRules.ts`, removida a checagem de dimensões e características obrigatórias em `getVariationRegistrationIssue` e `getMobileVariationRegistrationIssue`.
   - Essas checagens permanecem estritamente ativas nos validadores de publicação do Catálogo Digital (`checkEcomLegibility` e `validateCatalogPublication`).
5. **Atualização e Criação de Testes:**
   - Criado `erp/src/pages/App/Products/modals/productFormTabs.test.ts` cobrindo a ocultação de abas para estoquistas.
   - Atualizados `TechnicalFieldRow.test.tsx`, `variationRegistrationRules.test.ts`, `useProductFormSubmit.test.tsx`, `mobileProductFormSchema.test.ts` e `productRegistrationRules.test.ts`.

**Arquivos e linhas modificados:**
| Arquivo | Modificação |
|---|---|
| `erp/src/pages/App/Products/components/tabs/technical/TechnicalFieldRow.tsx` | 74–81: removido asterisco vermelho `*` de características. |
| `erp/src/pages/App/Products/components/variationTabs/VariationTechnicalFieldItem.tsx` | 168–174: removido asterisco vermelho `*` de características da variação. |
| `erp/src/pages/App/Products/modals/productFormTabs.ts` | 19–26: aba `technical` condicionada a `!isStockistOnly`. |
| `erp/src/pages/App/Products/hooks/form/useProductFormModal.ts` | 170–175: guard de redirecionamento para aba `technical` em `isStockistOnly`. |
| `erp/src/pages/App/Products/components/variationModal/variationModalTabs.ts` | 20–26: aba `tecnico` condicionada a `!isStockistOnly`. |
| `erp/src/pages/App/Products/hooks/variation/useVariationForm.ts` | 239–246, 347–352: guard de aba e filtragem de foco de erro para `isStockistOnly`. |
| `erp/src/pages/App/Products/components/tabs/ProductPricingFields.tsx` | 52–57: asterisco vermelho de `Preço de Venda` condicionado a `!formData.hasVariations`. |
| `shared-utils/productVariationRules.ts` | 2–5, 53–87: removidas checagens de características e dimensões do cadastro de variação. |
| `mobile/src/features/products/domain/productRegistrationRules.ts` | 1–8, 122–160: removidas checagens de características e dimensões de variação no mobile. |
| `erp/src/pages/App/Products/modals/productFormTabs.test.ts` | Novo arquivo: 2 testes validando ocultação de abas técnicas para estoquista. |
| `erp/src/pages/App/Products/components/tabs/technical/TechnicalFieldRow.test.tsx` | 12–34, 202–211: testes ajustados para garantir ausência de asterisco em características. |
| `erp/src/pages/App/Products/domain/variationRegistrationRules.test.ts` | 47–104: testes ajustados para validar que ausência de características não bloqueia cadastro de variação. |
| `erp/src/pages/App/Products/hooks/form/useProductFormSubmit.test.tsx` | 138–175: testes atualizados validando que características não bloqueiam cadastro e roteamento correto de variação. |
| `mobile/src/features/products/domain/productRegistrationRules.test.ts` | 131–145: teste atualizado confirmando que variação sem dimensões é aceita no cadastro mobile. |
| `mobile/src/features/products/domain/mobileProductFormSchema.test.ts` | 44–64: teste atualizado confirmando que dimensões são exigidas apenas ao publicar no catálogo. |
| `erp/vitest.config.ts` | 18: incluído caminho dos testes mobile para execução unificada. |

**Validações e Testes Executados:**
- **Testes Unitários Mobile:** 21 arquivos de testes em `mobile/src/features/products/` executados com **140 testes aprovados** (100%).
- **Testes Unitários ERP:** 74 testes da aba técnica, 106 testes dos hooks de formulário, 55 testes dos modais e 29 testes de regras de domínio executados com **100% de aprovação**.

