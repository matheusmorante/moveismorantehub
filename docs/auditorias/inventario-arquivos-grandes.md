# Inventário de arquivos TypeScript acima de 500 linhas do MoranteHub — Atualizado em 02/11/2026.

Atualizado em 02/11/2026. O catálogo inclui somente arquivos `.ts` e `.tsx` acima de 500 linhas; use `.tsx` quando houver JSX e `.ts` nos módulos sem JSX. As responsabilidades ainda não revisadas são inferidas pelo caminho.

## Resultado desta execução
- Escopo de extensão: `.ts` e `.tsx`; formatos diferentes ficam fora deste catálogo e desta automação.
- Arquivos TypeScript acima de 500 linhas atualmente catalogados: 111.
- Contagens reconciliadas por linhas físicas, incluindo linhas em branco; novos caminhos acima de 500 foram incluídos e os abaixo desse limite removidos.
- **Causa:** `AIChatAssistant.tsx` repetia o mesmo rodapé de entrada nos layouts drawer e flutuante. **Arquivos:** `erp/src/components/shared/AIChatAssistant.tsx`, novo `AIChatAssistantInputFooter.tsx` e este inventário. **Solução:** o JSX duplicado foi centralizado em um componente de apresentação com props planas; controle do texto, envio, microfone e modo de voz continuam no assistente. **Revisão estática:** os dois blocos originais tinham 41 linhas e foram comparados como idênticos; o componente mantém textos, classes, acessibilidade e condições para chamada de voz, e os seletores existentes dos testes permanecem na mesma UI. Export default, chamador em `AppLayout.tsx` e consumidores foram conferidos. O assistente ficou com 533 linhas e o componente novo tem 63; catálogo reconciliado com 111 arquivos acima do limite. Nenhum teste foi executado; validação dinâmica pendente.
- **Causa:** `ChatComposer.tsx` acumulava apresentação do áudio gravado e do estado de gravação junto à orquestração do formulário. **Arquivos:** `erp/src/pages/App/CustomerSupport/components/chat/ChatComposer.tsx`, novo `ChatAudioRecordingPanels.tsx` e este inventário. **Solução:** preview, painel de gravação e alerta visual foram extraídos para componentes de apresentação com props planas; estado, gravação, descarte, handlers, formulário e envio continuam no composer. **Revisão estática:** estrutura, classes, textos, rótulos acessíveis e tipos dos botões conferidos no diff; `ChatArea`, barrel da pasta e referências de `ChatComposer` mantêm o export existente. O composer ficou com 1044 linhas e o módulo visual segue abaixo de 500; catálogo reconciliado com 111 arquivos acima do limite. Nenhum teste foi executado; validação dinâmica pendente.
- **Causa:** `ProductCatalogPanel.tsx` mantinha a adaptação de produtos e variações ao item selecionável e a chave da seleção junto à coordenação do painel. **Arquivos:** `erp/src/components/catalog/ProductCatalogPanel.tsx`, novo `erp/src/components/catalog/productCatalogItems.ts` e este inventário. **Solução:** `priceOf`, `productImageOf`, `makeCatalogItem` e `itemKey` foram extraídos juntos; filtros, seleção, consulta e geração do PDF mantêm a mesma sequência. **Revisão estática:** as 27 linhas movidas mantiveram SHA-256 idêntico ao baseline após desconsiderar somente os novos modificadores `export`; imports de tipos, chamador em `ChatComposer`, barrel público e referências locais conferidos. O painel ficou com 757 linhas e o helper novo com 30. Varredura reconciliada com 111 arquivos acima de 500 linhas; `ReceiptsScreen.tsx` (711) teve a contagem atualizada sem editar seu diff local. Nenhum teste foi executado; validação dinâmica pendente.
- **Causa:** `digital-catalog/src/app/perfil/page.tsx` reunia a composição das abas com a apresentação do fluxo de troca de e-mail. **Arquivos:** `digital-catalog/src/app/perfil/page.tsx`, novo `digital-catalog/src/app/perfil/components/ProfileEmailTab.tsx` e este inventário. **Solução:** as 163 linhas de apresentação da aba foram movidas para um componente irmão; estado, handlers, formulários `useZodForm`, validação Zod, bloqueio concorrente e chamadas Supabase continuam na página, preservando contratos e estado ao alternar abas. **Revisão estática:** JSX comparado linha a linha após normalizar indentação (163 linhas; SHA-256 16B93A2E0A23176B8C0C2F8664A10516A7B8EF6B2211594FDC23AB8CF20C18E0); import, consumidor único, componentes, formulários e export default/rota revisados. A página ficou com 445 linhas e saiu do catálogo; o componente novo tem 218 linhas. Varredura reconciliada com 111 arquivos acima de 500 linhas; contagem atual de `ReceiptsScreen.tsx` (700) foi registrada sem editar seu diff local. Nenhum teste foi executado; validação dinâmica pendente.
- **Causa:** `useTechnicalFieldApplicability.ts` reunia a avaliação recursiva de dependências configuradas/legadas com a montagem de campos, grupos e sugestões. **Arquivos:** `erp/src/pages/App/Products/components/tabs/technical/hooks/useTechnicalFieldApplicability.ts`, novo `technicalFieldDependencyResolver.ts` e este inventário. **Solução:** a resolução de valores e a avaliação recursiva foram extraídas para uma factory pura; o hook fornece o callback que preserva a regra local de referência ativa e mantém seu retorno existente. **Revisão estática:** as 72 linhas transferidas mantiveram SHA-256 idêntico ao baseline; callback, fallbacks legados, ordem de busca e chamador único em `useProductTechnicalTab.ts` foram conferidos. O hook ficou com 562 linhas e o helper tem 105; catálogo permanece com 112 arquivos acima de 500 linhas. Nenhum teste foi executado; validação dinâmica pendente.
- **Causa:** `financialSlotFilling.ts` ainda concentrava a identificação e atualização do credor de empréstimo entre os demais passos do fallback. **Arquivos:** `mobile/src/services/financial/financialSlotFilling.ts`, novo `mobile/src/services/financial/patchers/loanCreditorSlotPatcher.ts` e este inventário. **Solução:** a etapa passou para um patcher irmão e é chamada no mesmo ponto da sequência, após a validação dos campos comuns e antes da finalidade da despesa; o fallback público permanece inalterado. **Revisão estática:** as 68 linhas de lógica transferidas mantiveram SHA-256 idêntico ao baseline; a ordem, os imports de tipo/validação/banco, os chamadores em `financialAiAssistantService` e `multiTurnIntentClassifier` e o export público foram conferidos. O arquivo ficou com 624 linhas e o patcher tem 82; catálogo permanece com 112 arquivos acima de 500 linhas. Nenhum teste foi executado; validação dinâmica pendente.
- **Causa:** `VariationTechnicalTab.tsx` reunia a apresentação/orquestração da aba com a resolução de visibilidade de características variáveis por categoria, seleção, valores e dependências. **Arquivos:** `erp/src/pages/App/Products/components/variationTabs/VariationTechnicalTab.tsx`, novo `variationTechnicalFieldResolution.ts` e este inventário. **Solução:** o cálculo foi extraído para helper puro; a tela preserva o mesmo `useMemo`, dependências, ordem dos campos, props e export público. **Revisão estática:** o bloco transferido (linhas 289–405 do baseline) manteve SHA-256 idêntico após normalizar a indentação; chamador em `VariationFormModal`, import no teste existente, imports do helper e contrato público foram conferidos. A tela ficou com 560 linhas e o helper tem 174; catálogo permanece com 112 arquivos acima de 500 linhas. Nenhum teste foi executado; validação dinâmica pendente.
- **Causa:** `ReceiptsScreen.tsx` mantinha a configuração estática de apresentação junto à listagem e coordenação dos recebimentos. **Arquivos:** `mobile/src/features/stock/receipts/screens/ReceiptsScreen.tsx`, novo `mobile/src/features/stock/receipts/screens/receiptsScreen.styles.ts` e este inventário. **Solução:** `StyleSheet.create` foi movido para o módulo irmão; `ReceiptsScreen` importa a mesma configuração e mantém o uso de `StyleSheet.absoluteFill`. **Revisão estática:** bloco de estilos comparado linha a linha ao baseline (com o novo `export`); nomes e referências, chamador, barrel e export público da tela conferidos. A tela ficou com 663 linhas e o módulo de estilos tem 186; o catálogo permanece com 112 arquivos acima de 500 linhas. Nenhum teste foi executado; validação dinâmica pendente.
- **Causa:** `ProductFormVariationsTab.tsx` reunia a apresentação da aba com a consulta assíncrona de vínculos de estoque/vendas usada para proteger a remoção de variações. **Arquivos:** `mobile/src/features/products/modals/tabs/ProductFormVariationsTab.tsx`, novo `mobile/src/features/products/hooks/useMobileProductVariationUsage.ts` e este inventário. **Solução:** estado, busca paralela, descarte de respostas obsoletas e fallback conservador foram movidos para um hook; a aba mantém o mesmo mapa de uso e a chamada individual de bloqueio na remoção. **Revisão estática:** estado inicial, critérios de consulta, dependências do efeito, fallback em falha, chamador em `ProductFormScreen` e segundo uso do serviço foram conferidos; não houve mudança no contrato de `ProductFormVariationsTab`. A aba ficou com 1339 linhas e o hook tem 51. O catálogo permanece com 112 arquivos acima de 500 linhas. Nenhum teste foi executado; validação dinâmica pendente.
- **Causa:** `ReportView.tsx` concentrava a adaptação dos resultados persistidos e dos produtos de relatórios antigos junto à coordenação da tela. **Arquivos:** `erp/src/pages/App/SalesOrder/Reports/components/ReportView.tsx`, novo `erp/src/pages/App/SalesOrder/Reports/utils/savedSalesReportHydration.ts` e este inventário. **Solução:** normalização de médias, quadrantes, resultados mensais e compatibilidade de `allProducts` foi extraída para funções puras; `loadReport` mantém a sequência original de validação, setters, filtros, datas e retorno. **Revisão estática:** cálculos, fallbacks, comparações de quadrantes e ordem dos efeitos laterais foram comparados ao bloco de origem; rota e único chamador da normalização foram conferidos. `ReportView.tsx` ficou com 1611 linhas e o helper com 76. O catálogo permanece com 112 arquivos acima de 500 linhas. Nenhum teste foi executado; validação dinâmica pendente.
- **Causa:** `whatsappWebhookProcessor.ts` misturava o parsing puro dos conteúdos recebidos com a coordenação do webhook. **Arquivos:** `erp/src/pages/utils/customerSupport/whatsappWebhookProcessor.ts`, novo `whatsappMessageContent.ts` (418 linhas) e este inventário. **Solução:** parser e helpers foram extraídos; o processador importa o parser e reexporta `extractMessageContent` pelo caminho público existente. **Revisão estática:** os 416 linhas movidas mantiveram o hash SHA-256 do bloco original; rota, bundle, consumidores e exports foram conferidos. O processador ficou com 422 linhas, ambos abaixo do limite, e saíram do catálogo. Nenhum teste foi executado; validação dinâmica pendente.
- **Causa:** `customerSupportService.ts` acumulava consultas, paginação e buscas do histórico de mensagens junto às operações da Central. **Arquivos:** `erp/src/pages/utils/customerSupport/customerSupportService.ts`, novo `customerSupportHistoryService.ts` (458 linhas), `docs/auditorias/egress-supabase-morantehub.md` e este inventário. **Solução:** o serviço de histórico passou a deter leitura/contexto de mensagens, atividades, anexos e buscas; o módulo original reexporta funções, tipos e seletores para manter os imports existentes. **Revisão estática:** o bloco extraído (439 linhas) manteve hash SHA-256 idêntico ao trecho de origem; chamadores nos hooks, componentes e testes existentes, exports e referências atuais no relatório foram conferidos. O serviço original ficou com 641 linhas; o novo módulo segue abaixo do limite e, por isso, não entra no catálogo. Nenhum teste foi executado; validação dinâmica pendente.
- **Causa:** `PurchasesScreen.tsx` concentrava a apresentação do menu de alteração de status junto à coordenação da lista de compras. **Arquivos:** `mobile/src/features/stock/purchases/screens/purchases-screen/PurchasesScreen.tsx`, novo `PurchaseStatusMenu.tsx` e este inventário. **Solução:** o JSX do menu foi extraído para um componente irmão; opções, status atual, rótulos, visibilidade, callbacks e transições continuam sob controle da tela. **Revisão estática:** cópia/modal, estado desativado do status atual, fechamento, cores e callbacks foram comparados com o bloco anterior; export e chamadores públicos não mudaram. Diffs locais independentes no cabeçalho e no filtro de fornecedor foram preservados. `PurchasesScreen.tsx` ficou com 486 linhas e o componente novo tem 79; a tela saiu do catálogo, que agora contém 112 arquivos acima de 500 linhas. Nenhum teste foi executado; validação dinâmica pendente.
- **Causa:** `useMobileProducts.ts` acumulava o estado do campo de busca, validação Zod, debounce, proteção contra validações obsoletas e submissão junto à consulta e às ações da lista. **Arquivos:** `mobile/src/features/products/hooks/useMobileProducts.ts`, novo `useMobileProductListSearch.ts` e este inventário. **Solução:** ciclo de busca e sua redefinição foram extraídos para um hook irmão; a API retornada por `useMobileProducts` e o consumo da tela permanecem iguais. **Revisão estática:** schema/resolver, debounce de 350 ms, sequência de validação, limpeza do timer ao submeter, reset de filtros, valores enviados à consulta e nomes/assinaturas retornados foram comparados com o bloco anterior; serviço de busca e consumidor `NativeProductsScreen` não mudaram. `useMobileProducts.ts` ficou com 609 linhas e o hook novo tem 86. O catálogo permanece com 113 arquivos acima de 500 linhas. Nenhum teste foi executado; validação dinâmica pendente.
- **Causa:** `ProductFormScreen.tsx` concentrava a renderização do checklist de prontidão com a orquestração do formulário. **Arquivos:** `mobile/src/features/products/screens/ProductFormScreen.tsx`, novo `ProductFormReadinessChecklist.tsx` e este inventário. **Solução:** a apresentação dos itens, seus estados acessíveis e a navegação para a aba correspondente foram extraídas para um componente irmão; estado e callbacks continuam controlados pela tela. **Revisão estática:** rótulos, estilos, ordem, resolução de abas disponíveis, fechamento do checklist e chamadas de `handleTabChange` foram conferidos contra o bloco anterior; os chamadores públicos da tela não mudaram. `ProductFormScreen.tsx` ficou com 1595 linhas e o componente novo tem 127. O catálogo permanece com 113 arquivos acima de 500 linhas. Nenhum teste foi executado; validação dinâmica pendente.
- **Causa:** `productCharacteristics.ts` ainda reunia a transformação de agrupamento/ordenação de tópicos legados e grupos persistidos com as regras gerais de aplicabilidade e validação. **Arquivos:** `mobile/src/features/products/domain/productCharacteristics.ts`, novo `productCharacteristicGrouping.ts` e este inventário. **Solução:** `getDimensionSortRank` e `groupProductTechnicalFields` foram extraídos; o módulo original reexporta os mesmos nomes, sem alterar os chamadores. **Revisão estática:** os dois corpos foram comparados byte a byte com o baseline; imports, tipos, consumidor mobile e referências existentes foram conferidos. O diff local do consumidor trata somente do input de busca; a alteração na dependência compartilhada limita-se às constantes de autocomplete usadas por outra responsabilidade. `productCharacteristics.ts` ficou com 776 linhas e o novo módulo com 112; o catálogo permanece em 113 arquivos acima de 500 linhas. Nenhum teste foi executado; validação dinâmica pendente.
- **Causa:** `useFinancialAiChat.ts` acumulava o estado e o ciclo de vida de gravação/transcrição e Gemini Live junto à coordenação de mensagens e registros financeiros. **Arquivos:** `mobile/src/features/finance/hooks/useFinancialAiChat.ts`, novo `useFinancialAiVoiceSession.ts` e este inventário. **Solução:** a sessão de voz foi extraída para um hook irmão; o hook original mantém a fachada plana consumida por `FinancialAiChatView`, enquanto operação, input, mensagens e publicação de cartões são conectados por callbacks e referências explícitas. **Revisão estática:** ordem de validação Zod, timers, limites de sessão/usuário, cancelamento, fallbacks, alertas, mensagens de transcrição e publicação dos cartões foram conferidos; chamadores mantêm os mesmos nomes e formatos de retorno. `useFinancialAiChat.ts` ficou com 467 linhas e `useFinancialAiVoiceSession.ts` com 262, ambos abaixo do limite. A varredura física atualizou o catálogo para 113 arquivos acima de 500 linhas. Nenhum teste foi executado; validação dinâmica pendente.
- **Causa:** `aiProductCharacteristicsService.ts` misturava a montagem de dois prompts de extração com o envio e a normalização das respostas da IA. **Arquivos:** `erp/src/pages/utils/aiService/aiProductCharacteristicsService.ts`, novo `aiProductCharacteristicsPrompts.ts` e este inventário. **Solução:** os construtores de prompt foram movidos sem alterar seus textos ou assinaturas; o serviço importa e reexporta os mesmos nomes para manter os consumidores atuais. **Revisão estática:** os dois blocos foram comparados com o baseline e os imports do teste existente e do catálogo foram conferidos; o serviço ficou com 350 linhas e o módulo de prompts com 164. O inventário agora tem 114 arquivos acima de 500 linhas. Nenhum teste foi executado; validação dinâmica pendente.
- **Causa:** `deliveryFlowService.ts` reunia três transições de retrocesso e o cancelamento junto às operações de avanço. **Arquivos:** `mobile/src/features/orders/services/deliveryFlowService.ts`, novo `deliveryFlowRollbackActions.ts` e este inventário. **Solução:** as quatro operações foram isoladas em um módulo coeso, mantendo a fachada `deliveryFlowService`, nomes e assinaturas dos métodos; o registro offline segue injetado pelo serviço original. **Revisão estática:** ordem das atualizações no Supabase/cache/evento, campos removidos e payloads, tratamento de erro, consumidor `useDeliveryFlowActions`, referências dos testes existentes e dependência de cache foram conferidos contra o bloco anterior. O serviço ficou com 386 linhas e o módulo de retrocessos com 172; o catálogo agora tem 115 arquivos acima de 500. Nenhum teste foi executado; validação dinâmica pendente.
- **Causa:** `usePriceLabelArtworkSession.ts` misturava a hidratação do layout global e a consulta de oportunidades com autosave, fechamento e ações do editor. **Arquivos:** `erp/src/pages/App/Stock/LabelPrinting/modals/price-label-editor/usePriceLabelArtworkSession.ts`, novo `usePriceLabelArtworkQueries.ts` e este inventário. **Solução:** validação, carregamento, fallbacks, cores iniciais, cancelamento, timeout, seleção de oportunidade e erros/retries de consulta foram isolados num hook irmão; o hook de sessão mantém sua API plana para o modal e usa a configuração carregada no mesmo autosave. **Revisão estática:** os dois efeitos, ordem de prioridades do snapshot, guardas de sessão/seleção, setters, erros, revisão de retry e consumidores foram comparados com o bloco anterior; o modal continua chamando a mesma sessão. O hook de sessão ficou com 533 linhas e o hook de consultas com 214; total catalogado permanece 116. Nenhum teste foi executado; validação dinâmica pendente.
- **Causa:** `useLabelGridModelSession.ts` concentrava as 88 declarações de estado e a API plana dos setters junto da hidratação do modelo e da composição do estado para salvar/pré-visualizar. **Arquivos:** `erp/src/pages/App/Stock/LabelPrinting/modals/label-grid-model-editor/useLabelGridModelSession.ts`, novo `useLabelGridModelSessionState.ts` e este inventário. **Solução:** armazenamento dos valores e setters estáveis foi isolado no hook irmão; o hook de sessão mantém hidratação, campos derivados, mapeamento e a mesma API plana para o modal e o hook de interações. **Revisão estática:** declarações iniciais, ordem e conteúdo do estado exposto, chamadas de hidratação e mapeamento de `buildEditorState` foram comparados ao baseline; setters memoizados continuam estáveis e foram incluídos nas dependências do efeito. Os módulos ficaram com 320 e 394 linhas e saíram do catálogo. Nenhum teste foi executado; validação dinâmica pendente.
- Varredura completa mantém 117 arquivos acima do limite; contagens reconciliadas sem editar fontes com diffs locais: `ReceiptsScreen.tsx` (847), `PurchaseItemsSection.tsx` (600) e `ProductTechnicalFieldInput.tsx` (509). O hook `useLabelGridModelSession.ts` (614) e seus chamadores foram revisados; a hidratação depende dos setters locais e a composição de estado integra esse contrato, sem uma extração independente segura nesta execução. Nenhum teste foi executado; validação dinâmica pendente.
- **Causa:** `whatsappWebhookProcessor.ts` acumulava o parsing de prévias de modelos da Meta com a coordenação do webhook. **Arquivos:** `erp/src/pages/utils/customerSupport/whatsappWebhookProcessor.ts`, novo `erp/src/pages/utils/customerSupport/whatsappTemplatePreview.ts` e este inventário. **Solução:** tipo e helpers de parsing de header, parâmetros, botões e mídia foram extraídos; `extractMessageContent` e os exports usados pelas rotas permanecem na fachada. **Revisão estática:** bloco movido comparado ao original; o build esbuild já empacota imports relativos e os consumidores existentes continuam usando os mesmos exports. O processador ficou com 836 linhas e o helper com 112. Contagens locais preservadas atualizadas: `NewGoodsReceiptModal.tsx` (1475), `PurchaseItemsSection.tsx` (585) e `ReceiptSourcePicker.tsx` (722). Nenhum teste foi executado; validação dinâmica pendente.
- Varredura atualizada do catálogo encontrou 117 arquivos acima de 500 linhas; contagens reconciliadas sem editar três fontes com diffs locais: `PurchaseItemsSection.tsx` (572), `NewGoodsReceiptModal.tsx` (1478) e `useReceiptForm.ts` (550). Nenhuma refatoração adicional segura foi identificada entre os candidatos limpos; dependências de produto/estoque estão em alterações locais, e os demais candidatos já foram revisados ou não têm consumidor ativo.
- Nova varredura mantém 117 arquivos acima de 500 linhas; contagens atualizadas sem editar fontes com diff local: `ReceiptsScreen.tsx` (810), `NewGoodsReceiptModal.tsx` (1481), `stockReceiptsService.ts` (786), `PurchaseItemsSection.tsx` (595) e `ReceiptSourcePicker.tsx` (726).
- Contagens físicas reconciliadas sem editar fontes com diffs locais: `NewGoodsReceiptModal.tsx` (1513) e `PurchaseItemsSection.tsx` (593). A varredura completa encontrou 117 arquivos acima de 500 linhas.
- **Causa:** `api/whatsapp-support-send.ts` acumulava a classificação de anexos e a inspeção de WebP com a coordenação do handler HTTP. **Arquivos:** `api/whatsapp-support-send.ts`, novos `api/whatsappSupportFileClassifier.ts`, `api/whatsappSupportRequestError.ts` e este inventário. **Solução:** classificação MIME/WebP e seus tipos foram extraídos; a classe de erro compartilhada manteve a captura HTTP por `instanceof`, e o endpoint reexporta `classifyWhatsAppSupportFile` para preservar o import existente. **Revisão estática:** correspondência de MIME, validação WebP, limites, códigos de erro, uso no envio e import do teste existente revisados; o endpoint ficou com 616 linhas. Varredura completa atualizou contagens locais preservadas e incluiu `PurchaseItemsSection.tsx`. Validação dinâmica pendente (não executada).
- **Causa:** `mobileProductFetchService.ts` reunia a consulta das páginas com a projeção dos itens do modo resumido. **Arquivos:** `mobileProductFetchService.ts`, novo `mobileProductSummaryMapper.ts` e este inventário. **Solução:** a filtragem de variações mescladas e a montagem dos resumos foram extraídas para um mapper irmão; paginação, filtros, disponibilidade de composições, elegibilidade da Lixeira e API pública continuam no serviço. **Revisão estática:** valores, ordem, campos e fallback de variação virtual foram comparados ao bloco anterior; consumidores e teste existente foram localizados. O serviço ficou com 566 linhas e o mapper com 85. Validação dinâmica pendente (não executada).
- Contagens físicas reconciliadas sem editar três arquivos com diffs locais de terceiros: `NewGoodsReceiptModal.tsx` (1263), `PurchaseItemsSection.tsx` (537) e `ReceiptsScreen.tsx` (733); permanecem preservados.
- Nos candidatos revisados, `ModelFormModal.tsx` não tem consumidor ativo; `offlineSyncManager.ts` depende de `stockReceiptsService.ts`, que está em diff local; e as transições restantes de `deliveryFlowService.ts` não apresentam uma unidade independente pequena. Sem refatoração segura nesta execução; preservar os módulos e reavaliar após o trabalho local acoplado.
- **Causa:** `financialSlotFilling.ts` e `financialUnknownFieldExtractor.ts` repetiam a detecção das mesmas frases de desconhecimento e a transição correspondente do rascunho permanecia dentro do fallback geral. **Arquivos:** `financialSlotFilling.ts`, `financialUnknownFieldExtractor.ts`, novo `patchers/unknownAnswerPatcher.ts` e este inventário. **Solução:** o tratamento de respostas desconhecidas foi extraído para o patcher, e o predicado das frases passou a ser compartilhado com o extrator; a ordem de execução e o contrato público do fallback foram preservados. **Revisão estática:** frases, cópia do rascunho, filtros de campos faltantes, intenção resultante, validação e chamadores/export público foram conferidos. `financialSlotFilling.ts` ficou com 691 linhas, o extrator com 87 e o patcher com 23. Validação dinâmica pendente (não executada).
- **Causa:** `Router.tsx` misturava a autorização e o redirecionamento específico para impressão de etiquetas de identificação com o mapa de rotas. **Arquivos:** `erp/src/Router.tsx`, novo `erp/src/pages/App/Stock/LabelPrinting/ProductIdentificationLabelRoute.tsx` e este inventário. **Solução:** a unidade foi movida para o diretório proprietário, mantendo o mesmo componente no caminho `/estoque/etiquetas`. **Revisão estática:** rota, imports relativos, permissões, estado da localização e referências conferidos; diff verificado. Validação dinâmica pendente (não executada).
- **Causa:** `ManageAttributesModal.tsx` acumulava a apresentação da lista existente de características com a coordenação do formulário e das operações do modal. **Arquivos:** `erp/src/pages/App/Products/components/modals/attributes/ManageAttributesModal.tsx`, novo `ManageAttributesExistingList.tsx` e este inventário. **Solução:** listagem, estados de carregamento/vazio, linhas de valores e controles foram extraídos; estados, handlers, validação e persistência continuam no proprietário. **Revisão estática:** controles, rótulos, proteção de características padrão, callbacks e chamador `VariationFormModal` conferidos; o proprietário ficou com 415 linhas e o componente com 166. Validação dinâmica pendente (não executada).
- **Causa:** `customerSupportService.ts` misturava acesso a dados com a normalização pura de registros de conversa e mensagem. **Arquivos:** `customerSupportService.ts`, novo `customerSupportMappers.ts` e este inventário. **Solução:** três mapeadores foram extraídos; os usos internos e os exports históricos continuam disponíveis pela fachada original. **Revisão estática:** corpos comparados ao baseline, importadores e chamadas internas conferidos; o serviço ficou com 1071 linhas e o módulo de mapeamento com 83. Validação dinâmica pendente (não executada).
- **Causa:** `financialTextParser.ts` concentrava a classificação de categoria/finalidade do movimento junto da extração de valor, forma de pagamento e data. **Arquivos:** `financialTextParser.ts`, novo `financialMovementClassification.ts` e este inventário. **Solução:** a regra de classificação foi isolada como função pura; o parser mantém o mesmo encadeamento e os exports consumidos pelos serviços continuam iguais. **Revisão estática:** bloco comparado ao original, usos de finalidade/ambiguidade e chamadores conferidos; o parser ficou com 473 linhas e o classificador com 123. Validação dinâmica pendente (não executada).
- **Causa:** `QRScannerModal.tsx` misturava o ciclo de leitura pela câmera com a interface e o formulário de entrada manual do código. **Arquivos:** `QRScannerModal.tsx`, novo `ManualScanForm.tsx` e este inventário. **Solução:** a apresentação e o formulário RHF/Zod foram extraídos para um componente irmão; o modal mantém o estado e repassa submissão e retorno à câmera pelas mesmas props. **Revisão estática:** schema, props dos quatro chamadores e callbacks preservados; o modal ficou com 497 linhas e o formulário com 55. Validação dinâmica pendente (não executada).
- **Causa:** `ProductSquareImageCropModal.tsx` misturava a coordenação do processamento da imagem com os controles independentes de tamanho, moldura e centralização da área de recorte. **Arquivos:** `ProductSquareImageCropModal.tsx`, novo `ProductSquareCropControls.tsx` e este inventário. **Solução:** os controles visuais foram extraídos; o modal continua proprietário dos estados, limites e callbacks de alteração. **Revisão estática:** rótulos, acessibilidade, condições de desativação e deltas foram conferidos contra o bloco original; o modal ficou com 554 linhas e o novo componente com 89. Validação dinâmica pendente (não executada).
- **Causa:** `CustomerSupport/Index.tsx` concentrava o estado e os efeitos do layout responsivo/persistido dos painéis junto à coordenação das conversas. **Arquivos:** `Index.tsx`, `hooks/index.ts`, novo `hooks/useCustomerSupportPanelLayout.ts` e este inventário. **Solução:** um hook passou a agrupar estado, referências, preferências de layout, detecção de viewport, handlers dos painéis e cálculo dos estilos; a página mantém a coordenação de conversas e sua exportação default. **Revisão estática:** ordem/condições dos efeitos, valores iniciais, persistência, transições e referências dos dois painéis foram comparados; `Index.tsx` ficou com 449 linhas e o hook com 127. Validação dinâmica pendente (não executada).
- `WhatsAppConfigSection.tsx` teve as opções e a geração dos parâmetros de exemplo extraídas para `whatsappTemplateVariables.ts`, preservando os rótulos, valores e a chamada existente de envio.
- `CharacteristicsDiffTable.tsx` delega a montagem das linhas a `characteristicsDiffRows.ts`; as regras de seleção e a exportação do tipo `DiffRowItem` foram preservadas.
- `Marketing/Posts/index.tsx` delega a resolução da oportunidade do preview a `postPreviewOpportunityResolver.ts`; o componente passou a 500 linhas e saiu do catálogo.
- `Profile/Index.tsx` delega o cartão lateral (avatar, acesso ao app e logout) a `ProfileSidebarCard.tsx`; a validação e o upload do avatar continuam na página proprietária.
- `digital-catalog/src/app/perfil/page.tsx` delega o cabeçalho da conta a `ProfileAccountHeader.tsx`; os fluxos de nome, e-mail e senha continuam na página.
- `digital-catalog/src/app/perfil/page.tsx` delega a apresentação da aba de senha a `ProfilePasswordTab.tsx`; estados, formulários Zod e operações permanecem na página.
- `CustomerSearchModal.tsx` delega a composição, deduplicação e ordenação de registros para `customerSearchList.ts`; o modal passou a 411 linhas e saiu do catálogo.
- **Causa:** `useOrderHistory.ts` acumulava a responsabilidade de estado e transições da seleção junto da consulta e das ações do histórico. **Arquivos:** `useOrderHistory.ts`, novo `useOrderHistorySelection.ts` e este inventário. **Solução:** seleção por linha, seleção da página filtrada e limpeza agora ficam no hook dedicado; a interface consumidora e a integração com ações em lote mantêm o mesmo contrato. **Revisão estática:** referências no histórico, tabela e operações em lote conferidas; validação dinâmica pendente.
- **Causa:** `PersonCard.tsx` repetia os menus de ações de clientes, fornecedores e funcionários em dois layouts do cartão. **Arquivos:** `PersonCard.tsx`, novo `PersonCardActionsMenu.tsx` e este inventário. **Solução:** o componente novo centraliza o menu, os estados de abertura e as ações por tipo; `PersonCard` mantém a apresentação dos cartões e o atalho de histórico do cliente. **Revisão estática:** condições de ação, callbacks, acessibilidade, classes e referências em `PersonTable` e `PersonCard.test.tsx` conferidos; o cartão caiu para 335 linhas e o novo componente tem 199. Validação dinâmica pendente.
- **Causa:** `DeliveriesHubScreen.tsx` concentrava a navegação das abas com a composição do mapa, seleção de parada, filtros, localização e métricas de rota. **Arquivos:** `DeliveriesHubScreen.tsx`, novo `components/deliveryMap/DeliveriesMapExperience.tsx` e este inventário. **Solução:** a composição e o estado do mapa foram isolados em componente próprio; ele continua montado junto à tela, preservando os hooks de GPS/equipe e o ciclo do bottom sheet, enquanto a visualização do mapa segue condicionada à aba ativa. **Revisão estática:** chamada em `MainNavigator`, props, callbacks, efeitos de limpeza e dependências de mapa/localização conferidos; a tela ficou com 467 linhas e o novo componente tem 258. Validação dinâmica pendente.
- **Causa:** `MobileProductCard.tsx` ainda concentrava o resumo visual de preço/estoque e os estados de canais junto da identidade e coordenação das ações do cartão. **Arquivos:** `MobileProductCard.tsx`, novo `MobileProductCardSummary.tsx` e este inventário. **Solução:** a apresentação do preço, estoque e badges de canal foi extraída; callbacks, condições de visibilidade e permissões continuam calculados no cartão proprietário. **Revisão estática:** props, callbacks de ativação/publicação, estados de rascunho/mesclagem e referências em `NativeProductsScreen` e `MobileProductCard.exitBadge.test.tsx` conferidos; o cartão ficou com 509 linhas e o novo componente tem 102. Validação dinâmica pendente.
- `ChatComposer.tsx` delega os formatos e as transformações puras de texto para `chatMessageFormatting.ts`; foco, seleção do textarea, formulário e envio continuam no componente.
- `AIChatAssistant.tsx` delega a resolução de contexto da rota para `getAgentPageContext.ts`; as chamadas de validação e renderização usam o mesmo caminho ativo.
- `ProductCatalogPanel.tsx` delega a hierarquia ordenada de categorias para `productCatalogCategoryTree.ts`; seleção, filtros e paginação continuam no painel.
- `CustomerSupport/Index.tsx` delega o estado e os efeitos do layout responsivo/persistido a `useCustomerSupportPanelLayout.ts`; a coordenação de conversas e a montagem das áreas permanecem na página.
- `PriceLabelArtRenderer.tsx` e `PriceLabelDealPriceGroup.tsx` compartilham o componente `PriceLabelArtTransformHandles.tsx` para os controles repetidos de redimensionar e girar; camadas, cores, textos de ajuda e callbacks foram preservados.
- `ProductSquareImageCropModal.tsx` mantém o fluxo de recorte e delega os estilos estáticos ao módulo irmão `productSquareImageCropModal.styles.ts`; os dois chamadores e os estilos foram conferidos.
- `MobileProductCard.tsx` delega a apresentação da identidade do produto (imagem, título, composição e badges) a `MobileProductCardIdentity.tsx`; ações, preços, status e lista de variações continuam no card.
- `Agendamento.tsx` delega o cabeçalho, os toggles e a seleção do modo a `SchedulingControls.tsx`; callbacks e composição do agendamento permanecem no componente proprietário.
- `BodyRowMobile.tsx` e `BodyRowDesktop.tsx` usam `stockOriginProductKinds.ts` para compartilhar a mesma configuração de categorias de produto por origem de estoque.
- `WhatsAppConfigSection.tsx` delega a apresentação do campo e botão de teste de modelo para `WhatsAppTemplateSendTestControl.tsx`; validação e envio continuam no componente proprietário.
- `usePriceLabelCanvasInteractions.ts` delega o arraste magnético e as guias do canvas para `usePriceLabelCanvasDragInteraction.ts`; redimensionamento, rotação e o contrato do hook principal permanecem no módulo proprietário.
- Contagens físicas reconciliadas sem editar sete arquivos com diffs locais de terceiros: `NewGoodsReceiptModal.tsx` (1203), `InventoryScopeScreenContent.tsx` (590), `ReceiptsScreen.tsx` (613), `stockReceiptsService.ts` (743), `useReceiptForm.ts` (559), `ProductFormPricesTab.tsx` (656) e `ReceiptSourcePicker.tsx` (698); todos seguem preservados.
- `ChatComposer.tsx` delega a interface do seletor de pedidos/orçamentos para `SupportOrderPickerDialog.tsx`; carregamento, seleção ligada ao formulário e preparação do PDF continuam no composer.
- `AIChatAssistant.tsx` delega a renderização duplicada do histórico e o auto-scroll para `AIChatAssistantMessages.tsx`; envio, voz, validação e persistência permanecem no assistente.
- `offlineSyncManager.ts` delega a preparação e o upload dos comprovantes locais de entrega de eventos pendentes para `deliveryProofQueuePreparation.ts`; a orquestração da fila e a ordem de sincronização permanecem no gerente.
- O alvo limpo `useFinancialAiChat.ts` teve seus schemas Zod específicos extraídos; arquivos com alterações locais próprias e dependências diretas foram preservados.
- Os estilos estáticos de `ProductFormBasicTab.tsx`, `ProductFormPhotosTab.tsx`, `ProductFormPricesTab.tsx`, `ProductFormScreen.tsx`, `ProductFormTechnicalTab.tsx`, `ProductFormVariationsTab.tsx`, `MobileMoveVariationModal.tsx`, `AttributesManagerModal.tsx` e `ProductTechnicalFieldInput.tsx` foram separados para módulos irmãos `.ts`; telas e chamadores mantiveram seus contratos.
- As operações de ambientes do ERP foram isoladas em `environmentService.ts`; `categoryService.ts` manteve os exports existentes como fachada.
- A consulta/agrupação das métricas de dashboard de APIs foi isolada em `apiUsageDashboardService.ts`; `ApiUsageTracker.getDashboardMetrics` manteve a assinatura pública.
- A configuração estática de menus de `MobileNav.tsx` foi isolada em `mobileNavMenuItems.ts`; permissões e renderização permaneceram no componente.
- As ferramentas financeiras do agente mobile foram agrupadas em `mobileAgentFinanceTools.ts`; `mobileAgentTools` preservou suas chaves públicas por spread no mesmo ponto.
- A leitura/normalização dos formatos atuais e legados de atributos de produto foi isolada em `productCharacteristicAttributes.ts`; exports públicos do módulo de domínio foram preservados.
- A sincronização do repositório local e dos caches de pedidos foi separada de `deliveryFlowService.ts` para `deliveryOrderCacheSync.ts`; as dez transições continuam chamando o mesmo helper na mesma ordem.
- A interface da recuperação de senha mobile foi extraída para `PasswordRecoveryScreen.tsx`; `LoginScreen.tsx` mantém os estados, handlers e validação RHF.
- A busca exclui .git, dependências, builds, caches, `tmp`, arquivos gerados, mapas, relatórios/dumps, evidências e binários.

## Arquivos `.ts` e `.tsx` com mais de 500 linhas

| Caminho | Linhas | Área/responsabilidade inferida | Estado e ação |
|---|---:|---|---|
| `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/useNfeEmission.test.tsx` | 2482 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/products/services/mobileProductMutationService.test.ts` | 2027 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/products/screens/ProductFormScreen.tsx` | 1595 | Orquestra o formulário mobile de produto, suas abas, validação, salvamento e rascunho | Checklist de prontidão extraído para `ProductFormReadinessChecklist.tsx`; tela mantém estado e navegação. Revisão estática registrada acima; validação dinâmica pendente. |
| `erp/src/pages/App/SalesOrder/Reports/components/ReportView.tsx` | 1611 | Tela de análise e relatórios de vendas, com filtros, carregamento, ordenação e visualizações | Sidebar e normalização dos snapshots persistidos extraídas para módulos irmãos; estados e callbacks permanecem no proprietário. Revisão estática feita; validação dinâmica pendente. |
| `mobile/src/features/products/modals/tabs/ProductFormVariationsTab.tsx` | 1339 | Renderização e coordenação da aba de variações do formulário mobile de produto | Consulta assíncrona de vínculos extraída para `useMobileProductVariationUsage`; edição e bloqueios de remoção mantêm contratos. Revisão estática feita; validação dinâmica pendente. |
| `mobile/src/features/products/services/mobileProductFetchService.test.ts` | 1646 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/utils/nfe/danfe/danfeNfceA4.ts` | 1505 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/products/modals/tabs/ProductFormTechnicalTab.tsx` | 1251 | Renderização e coordenação do formulário mobile de características técnicas de produtos | A definição estática de estilos foi movida para `productFormTechnicalTab.styles.ts`; os chamadores e a API da tela permanecem iguais. Referências revisadas estaticamente; validação dinâmica pendente. Diff local presente; preservar e não editar. |
| `erp/src/pages/utils/nfe/__tests__/transmitOperationDraft.test.ts` | 1435 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/tests/support-readonly/support-login.spec.ts` | 1336 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Settings/components/fiscal/NcmManagementPanel.tsx` | 1275 |  | Alteração local presente; preservar e não editar. |
| `erp/src/pages/utils/__tests__/complementaryFinancialAssistant.test.ts` | 1242 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/utils/nfe/__tests__/hmlTechnicalEmission.test.ts` | 1223 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/utils/nfe/__tests__/hmlNormalSaleRuleSet.test.ts` | 1216 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/products/domain/productCharacteristics.ts` | 776 | Regras de aplicabilidade, dependências, seleção e validação de características técnicas no mobile | Tipos, atributos legados/atuais e agrupamento/ordenação ficam em módulos irmãos; os exports públicos permanecem na fachada. Revisão estática feita; validação dinâmica pendente. |
| `erp/src/pages/App/Stock/LabelPrinting/modals/PriceLabelArtEditorModal.tsx` | 1144 | Orquestra estado e apresentação do editor de arte das etiquetas de preço | Componentes e hooks irmãos isolam preview, barras, atalhos, interações, sessão e consultas/hidratação de arte; avaliar outra responsabilidade apenas após mapear um limite específico. |
| `erp/src/pages/App/CustomerSupport/components/chat/ChatComposer.tsx` | 1044 | Coordena formulários, anexos, gravação e envio do chat de atendimento | Formatação de texto, seletor comercial, geração do resumo PDF e apresentação do gravador foram extraídos para módulos irmãos; estado e contratos do formulário e envio continuam no composer. Revisão estática feita; validação dinâmica pendente. |
| `erp/src/pages/utils/customerSupport/customerSupportService.ts` | 641 | Operações da central de atendimento, incluindo listagem, mutações e envio de mensagens | Mapeadores e consultas/paginação/buscas do histórico extraídos para módulos irmãos; a fachada reexporta os contratos públicos existentes. Revisão estática feita; validação dinâmica pendente. |
| `erp/src/pages/utils/__tests__/latestRulesBattery.test.ts` | 1134 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/utils/nfe/__tests__/interstateOutboundFiscalMatrix.test.ts` | 1020 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/services/offline/__tests__/offlineSyncAndModules.test.ts` | 1007 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/e2e/delivery-flow.spec.ts` | 1003 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/products/domain/productCharacteristics.test.ts` | 976 |  | Alteração local presente; preservar e não editar. |
| `erp/src/pages/App/Stock/LabelPrinting/hooks/usePriceLabelState.ts` | 962 | Estado e snapshots do editor de artes de etiquetas de preço | Sem diff próprio; os setters alimentam a aplicação/restauração de snapshots e o hook de histórico. Nenhuma extração isolada segura foi identificada; manter até haver um limite de responsabilidade comprovável. |
| `erp/src/pages/App/CustomerSupport/__tests__/customerSupport.test.ts` | 950 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `api/nfe/interstate-outbound-fiscal-matrix/resolver.ts` | 932 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/components/catalog/ProductCatalogPanel.tsx` | 757 | Coordena filtros, seleção e preparação de produtos do catálogo para o atendimento | Geração do PDF e apresentação compartilhada de preço/link estão em `productCatalogPresentation.ts`; adaptação de produto/variação e identidade da seleção extraídas para `productCatalogItems.ts`. API pública e consumidor mantidos; revisão estática feita, validação dinâmica pendente. |
| `mobile/src/features/products/domain/mobileProductFormSchema.test.ts` | 890 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/products/modals/tabs/ProductFormBasicTab.tsx` | 636 | Renderização e coordenação da aba básica do formulário mobile de produto (nome, categorias, origem e campos relacionados) | Estilos estáticos movidos para `productFormBasicTab.styles.ts`; import e chamador revisados estaticamente. Sem validação dinâmica. Diff local presente; preservar e não editar. |
| `api/nfe/transmit-operation-draft.ts` | 873 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/tests/e2e/products/categories-deletion-safety.spec.ts` | 867 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/products/services/mobileProductMutationService.ts` | 542 | Persiste produtos mobile, trata exclusão/restauração e verifica vínculos de variações; mantém a fachada pública | As mutações de ativação e publicação foram movidas para `mobileProductStatusMutationService.ts`; o timeout compartilhado fica em `mobileProductMutationTimeout.ts`. Revisão estática feita; validação dinâmica pendente. |
| `mobile/src/features/products/modals/MobileMoveVariationModal.tsx` | 701 | Modal para validar e mover uma variação de produto entre famílias | Estilos estáticos movidos para `mobileMoveVariationModal.styles.ts`; import revisado. O chamador tem diff local preexistente e foi preservado. Validação dinâmica pendente. Diff local presente; preservar e não editar. |
| `mobile/src/features/products/screens/NativeProductsScreen.tsx` | 829 | Tela principal de produtos no app mobile | Arquivo tem alteração local; contagem reconciliada, preservar e não editar. |
| `mobile/src/features/products/modals/tabs/ProductFormPricesTab.tsx` | 656 | Renderização e coordenação da aba de preços, origem comercial e fornecedores do formulário mobile de produto | Estilos estáticos movidos para `productFormPricesTab.styles.ts`; imports e chamadores revisados estaticamente. Diff local presente; contagem física reconciliada, preservar e não editar. |
| `mobile/src/features/products/modals/AttributesManagerModal.tsx` | 647 | Interface e coordenação do gerenciamento de características e valores de produtos no app | Estilos estáticos movidos para `attributesManagerModal.styles.ts`; import e chamador revisados estaticamente. Sem validação dinâmica. Diff local presente; preservar e não editar. |
| `erp/src/components/shared/AIChatAssistant.tsx` | 533 | Assistente de IA do ERP: coordena conversa, histórico, voz e layouts drawer/flutuante | Mensagens/auto-scroll, contexto de rota e rodapé compartilhado do chat extraídos para módulos irmãos; envio, voz, validação, persistência e API default permanecem no assistente. Revisão estática feita; validação dinâmica pendente. |
| `mobile/src/services/financial/financialSlotFilling.ts` | 624 | Preenchimento determinístico de campos ausentes em intenções financeiras | Tratamento do credor de empréstimo extraído para `patchers/loanCreditorSlotPatcher.ts`; ordem, validação e export público preservados. Revisão estática feita; validação dinâmica pendente. |
| `supabase/functions/sefaz-inbound-sync/index.ts` | 795 |  | Alteração local presente; preservar e não editar. |
| `api/nfe/fiscalXmlAudit.ts` | 790 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/FiscalDocuments/__tests__/issuedFiscalDocumentDetailsModal.test.tsx` | 777 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `scripts/testing/fiscal-audit.ts` | 766 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/products/modals/tabs/ProductFormFiscalTab.tsx` | 755 | Aba fiscal do formulário mobile de produto (responsabilidade inferida pelo caminho) | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. Diff local presente; preservar e não editar. |
| `erp/src/pages/App/Products/hooks/form/useProductFormModal.ts` | 749 |  | Alteração local presente; preservar e não editar. |
| `erp/src/pages/utils/__tests__/paymentMethodRules.test.ts` | 748 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/utils/nfe/__tests__/nfeServiceServerBoundary.test.ts` | 740 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/products/services/mobileProductFetchService.ts` | 566 | Consulta e normalização das páginas de produtos do aplicativo mobile | A projeção dos resultados `summaryOnly` foi extraída para `mobileProductSummaryMapper.ts`; consulta, filtros e enriquecimentos permanecem no serviço. Consumidores revisados estaticamente; validação dinâmica pendente. |
| `mobile/src/features/stock/receipts/modals/NewGoodsReceiptModal.tsx` | 1513 | Modal de cadastro de recebimento de mercadorias no estoque mobile | Diff local preexistente; contagem física reconciliada, preservar e não editar nesta execução. |
| `mobile/src/features/products/services/mobileProductTechnicalService.test.ts` | 717 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `api/whatsapp-support-send.ts` | 616 | Endpoint de envio de mensagens e arquivos do atendimento pelo WhatsApp/Meta | Classificação MIME/WebP extraída para `whatsappSupportFileClassifier.ts`; erro HTTP e export público do classificador preservados. Revisão estática feita; validação dinâmica pendente. |
| `api/nfe/fiscalSnapshot.ts` | 703 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `api/nfe/emit.ts` | 699 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/services/financial/financialIntentValidator.ts` | 614 | Validação de intenções financeiras, extração de fatos e processamento da entrada | Consumido por `financialSlotFilling.ts`, que está em diff local; preservar enquanto a dependência direta estiver em atividade. |
| `erp/src/pages/App/Products/components/variationTabs/VariationTechnicalTab.tsx` | 560 | Tela da aba técnica de variações; coordena consulta, estado e apresentação | Resolução de visibilidade de características extraída para `variationTechnicalFieldResolution.ts`; memoização, dependências, props e export público preservados. Revisão estática feita; validação dinâmica pendente. |
| `mobile/src/features/products/hooks/useMobileProducts.ts` | 609 | Validação e operações da listagem mobile de produtos | Busca e debounce extraídos para `useMobileProductListSearch.ts`; a API pública do hook foi preservada. Revisão estática registrada acima; validação dinâmica pendente. |
| `erp/src/pages/utils/orderMutation/__tests__/orderCreationAtomicity.test.ts` | 666 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Stock/LabelPrinting/modals/price-label-editor/usePriceLabelArtworkSession.ts` | 533 | Controla autosave, fechamento, erros e ações da sessão de edição da arte de etiquetas | Consulta/hidratação do layout e das oportunidades extraída para `usePriceLabelArtworkQueries.ts`; API plana e chamada do modal preservadas. Revisão estática feita; validação dinâmica pendente. |
| `erp/src/pages/utils/nfe/fiscalIssuePresentation.ts` | 646 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/SalesOrder/hooks/useSalesOrderForm.ts` | 556 | Coordena estado, validação, edição e submissão do formulário de pedidos; delega o cache de manuseio por entrega ao hook irmão | O cache e a troca de método de entrega foram extraídos para `useOrderItemHandlingByDeliveryMethod.ts`; fachada `state/actions` e `actions.setDeliveryMethod` preservadas. Revisão estática feita; validação dinâmica pendente. |
| `mobile/src/features/products/modals/components/ProductSquareImageCropModal.tsx` | 554 | Modal de recorte quadrado de fotos de produto, da preparação da imagem à confirmação do recorte | Controles de tamanho, moldura e centralização extraídos para `ProductSquareCropControls.tsx`; estados, limites e callbacks permanecem no modal. Revisão estática feita; validação dinâmica pendente. |
| `erp/src/pages/App/Products/components/tabs/technical/useProductTechnicalTab.test.ts` | 641 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Products/ProductList/hooks/actions/catalogPublicationValidation.test.ts` | 634 |  | Alteração local presente; preservar e não editar. |
| `api/nfe/operation-drafts.ts` | 629 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Products/components/tabs/technical/hooks/useTechnicalFieldApplicability.ts` | 562 | Calcula aplicabilidade, visibilidade, dependências e agrupamento das características técnicas do produto | Avaliação recursiva de dependências extraída para `technicalFieldDependencyResolver.ts`; retorno do hook e chamador único preservados. Revisão estática feita; validação dinâmica pendente. |
| `erp/src/pages/App/Stock/Inventory/hooks/useInventoryAuditWorkflow.ts` | 627 |  | Alteração local presente; preservar e não editar. |
| `mobile/src/features/stock/inventory/screens/InventoryScopeScreenContent.tsx` | 590 | Conteúdo de escopo do inventário de estoque no mobile (responsabilidade inferida pelo caminho) | Diff local de terceiros; contagem física reconciliada, preservar e não editar. |
| `erp/src/pages/App/FiscalDocuments/components/tabs/IssuedFiscalDocumentLinkedTab.tsx` | 606 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/tests/e2e/orders/order-normalization.spec.ts` | 602 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Stock/Inventory/components/InventoryOperationScreen.tsx` | 594 |  | Alteração local presente; contagem reconciliada sem editar o arquivo. |
| `erp/src/pages/App/SalesOrder/ItemsTable/BodyRowMobile.tsx` | 575 | Renderiza linhas mobile/tablet de itens de venda, com modos compacto e expandido | Configuração compartilhada de categorias por origem movida para `stockOriginProductKinds.ts`; referências estáticas revisadas. Validação dinâmica pendente. |
| `erp/src/pages/utils/nfe/__tests__/cancelEndpoint.test.ts` | 576 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/Stock/LabelPrinting/modals/label-grid-model-editor/useLabelGridModelInteractions.ts` | 576 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/utils/inboundNfe/services/inboundInvoicesQueryService.ts` | 577 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/Router.tsx` | 539 | Declara as rotas do ERP e aplica os escopos de autenticação, permissão e contexto | A guarda de impressão exclusiva de etiquetas de identificação foi extraída para `pages/App/Stock/LabelPrinting/ProductIdentificationLabelRoute.tsx`; rota pública local preservada. Referências revisadas estaticamente; validação dinâmica pendente. |
| `api/nfe/inbound-manifestation.ts` | 561 |  | Alteração local presente; preservar e não editar. |
| `erp/src/pages/utils/nfe/__tests__/normalOutboundEmission.test.ts` | 557 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/SalesOrder/ItemsTable/BodyRowDesktop.tsx` | 550 | Renderiza linhas de itens de venda na tabela desktop, compacta ou expandida | Configuração compartilhada de categorias por origem movida para `stockOriginProductKinds.ts`; referências estáticas revisadas. Validação dinâmica pendente. |
| `erp/src/pages/App/SalesOrder/PaymentsTable/BodyRow.tsx` | 547 | Renderiza a linha de pagamento, seus valores, taxas e controles por método | Diff local ativo inclui vencimento de parcelas promissórias; preservar e não refatorar enquanto a alteração estiver em andamento. |
| `erp/src/pages/App/Marketing/Posts/components/ModelFormModal.tsx` | 550 | Modal legado de configuração de modelos e prévia de post | Sem consumidor ativo em `.ts`/`.tsx` localizado; preservar sem refatorar até eventual reintegração. |
| `erp/src/pages/App/CustomerSupport/__tests__/customerSupportInbox.test.tsx` | 549 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/SalesOrder/OrderHistoryList/useOrderHistory.ts` | 536 | Coordena consulta, filtros, paginação, ações e estados do histórico de pedidos | A seleção de pedidos foi extraída para `useOrderHistorySelection.ts`; chamadas existentes mantidas. Contratos e dependências revisados estaticamente; validação dinâmica pendente. |
| `erp/src/pages/App/SalesOrder/OrderActions/ReturnOrderModal.test.tsx` | 535 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/NfeCustomerTab.tsx` | 531 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/stock/receipts/modals/ReceiptSourcePicker.tsx` | 726 |  | Diff local de terceiros; contagem física reconciliada, preservar e não editar. |
| `api/nfe/fiscalDatabaseTypes.ts` | 512 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `api/nfe/emitHmlTechnical.ts` | 508 |  | Sem diff próprio; revisar responsabilidade e chamadores antes de qualquer mudança. |
| `mobile/src/features/stock/receipts/screens/ReceiptsScreen.tsx` | 711 | Tela mobile de recebimentos: consulta e apresenta a lista de entradas | Configuração estática movida para `receiptsScreen.styles.ts`; export público e chamador mantidos. Revisão estática feita; validação dinâmica pendente. Diff local preservado; contagem reconciliada. |
| `mobile/src/services/stock/stockReceiptsService.ts` | 786 | Serviço mobile de recebimentos: consulta, criação e sincronização de entradas | Diff local de terceiros; contagem física reconciliada, preservar e reavaliar quando a atividade atual terminar. |
| `api/nfe/orderEditFiscalAudit.ts` | 510 | Audita alterações em pedidos com implicações fiscais | Fluxo fiscal; consultar a documentação vigente antes de qualquer alteração. |
| `erp/src/pages/App/Products/components/tabs/technical/ProductTechnicalTab.test.tsx` | 526 | Testes da aba técnica de produto ERP | Arquivo de testes; preservar e revisar junto do código proprietário. |
| `erp/src/pages/App/Products/hooks/form/useProductFormSubmit.test.tsx` | 525 | Testes de submissão do formulário ERP de produto | Arquivo de testes; preservar e revisar junto do código proprietário. |
| `erp/src/pages/App/Products/hooks/variation/useVariationForm.ts` | 526 | Hook de estado e operações do formulário de variação | Sem diff próprio; revisar responsabilidade e chamadores antes de refatorar. |
| `erp/src/pages/App/Products/services/technicalFieldService.test.ts` | 512 | Testes do serviço ERP de definição de campos técnicos | Arquivo de testes; preservar e revisar junto do código proprietário. |
| `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/hooks/useNfeItemEnrichment.ts` | 545 | Enriquece itens do fluxo de emissão da NF-e | Sem diff próprio; revisar responsabilidade e chamadores antes de refatorar. |
| `erp/src/pages/App/SalesOrder/ShippingComponents/__tests__/Agendamento.test.tsx` | 566 | Testes da interface de agendamento de entrega | Arquivo de testes; preservar e revisar junto do código proprietário. |
| `erp/src/pages/App/SalesOrder/ShippingComponents/Agendamento.tsx` | 513 | Fluxo de agendamento de entrega na criação de pedido | Com diff local; preservar e reavaliar quando a atividade atual terminar. |
| `erp/src/pages/App/Stock/Receipts/hooks/useReceiptForm.ts` | 550 | Hook do formulário ERP de recebimento de mercadorias | Diff local de terceiros; contagem física reconciliada, preservar e reavaliar quando a atividade atual terminar. |
| `erp/src/pages/utils/__tests__/divergenciasCorrecao.test.ts` | 550 | Testes de divergências e correções fiscais | Arquivo de testes; preservar e revisar junto do código proprietário. |
| `erp/src/pages/utils/__tests__/financialInvariants.test.ts` | 535 | Testes de invariantes financeiros | Arquivo de testes; preservar e revisar junto do código proprietário. |
| `erp/src/pages/utils/inboundNfe/services/inboundDeterministicScorer.ts` | 557 | Pontua correspondência determinística de itens da NF-e de entrada | Sem diff próprio; revisar responsabilidade e chamadores antes de refatorar. |
| `erp/src/pages/utils/nfe/__tests__/danfeGeneratorModules.test.ts` | 543 | Testes de módulos de geração de DANFE | Fluxo fiscal; consultar a documentação vigente antes de qualquer alteração. |
| `erp/src/pages/utils/nfe/__tests__/fiscalRecipientIe.test.ts` | 528 | Testes de inscrição estadual do destinatário fiscal | Fluxo fiscal; consultar a documentação vigente antes de qualquer alteração. |
| `erp/src/pages/utils/nfe/__tests__/orderCancellationPolicyEndpoint.test.ts` | 546 | Testes da política fiscal de cancelamento por endpoint | Fluxo fiscal; consultar a documentação vigente antes de qualquer alteração. |
| `erp/src/pages/utils/nfe/__tests__/transportFiscalRules.test.ts` | 565 | Testes de regras fiscais de transporte | Fluxo fiscal; consultar a documentação vigente antes de qualquer alteração. |
| `mobile/src/features/stock/purchases/modals/purchase-form/PurchaseItemsSection.tsx` | 600 | Seção de itens para edição de pedidos e recebimentos de compra no app | Diff local preexistente junto ao formulário de compra; contagem física reconciliada, preservar e revalidar após a atividade local terminar. |
| `mobile/src/features/products/categories/domain/categoryEnvironmentServices.test.ts` | 556 | Testes de serviços de ambientes de categoria | Arquivo de testes; preservar e revisar junto do código proprietário. |
| `mobile/src/features/products/components/MobileProductCard.tsx` | 503 | Cartão mobile com dados e ações de produto | Com diff local; contagem física reconciliada, preservar e reavaliar quando a atividade atual terminar. |
| `mobile/src/features/products/modals/tabs/ProductTechnicalFieldInput.tsx` | 514 | Campo reutilizável de características técnicas do formulário mobile de produto | Estilos estáticos permanecem no módulo irmão; sem diff próprio, fronteiras da lógica e chamadores ainda podem ser revisados. Validação dinâmica pendente. |
| `mobile/src/features/products/services/mobileProductVariationActionsService.ts` | 505 | Coordena operações de variações de produto no app | Sem diff próprio; revisar responsabilidade e chamadores antes de refatorar. |
| `mobile/src/features/stock/inventory/inventoryParity.test.ts` | 567 | Testes de paridade de inventário mobile | Arquivo de testes; preservar e revisar junto do código proprietário. |
| `mobile/src/services/offline/offlineSyncManager.ts` | 506 | Coordena fila de sincronização e operações pendentes offline | Consome `stockReceiptsService.ts`, em diff local; preservar enquanto a dependência direta estiver em atividade. |

## Histórico de melhorias
### 01/11/2026 — Extração da preparação de comprovantes da fila offline

- **Causa:** `offlineSyncManager.ts` coordenava as filas offline e também implementava a preparação dos comprovantes locais de entregas sem acompanhamento, incluindo upload e persistência progressiva do payload.
- **Solução:** o método `prepareDeliveryProofs` foi movido para `deliveryProofQueuePreparation.ts`; o gerente mantém a chamada no mesmo ponto, antes do envio limitado por timeout.
- **Arquivos:** `mobile/src/services/offline/offlineSyncManager.ts`, `mobile/src/services/offline/deliveryProofQueuePreparation.ts` e este inventário. A API pública `offlineSyncManager` e seus chamadores não mudaram.
- **Revisão estática:** o corpo foi comparado ao original após remover a indentação e permaneceu idêntico; imports, envio sequencial, chave de idempotência, atualização do payload após cada upload e chamadores foram conferidos. O gerente ficou com 506 linhas e o helper com 68. O catálogo continua com 124 arquivos e sem divergências de caminhos; nenhum teste foi executado, validação dinâmica pendente.

### 01/11/2026 — Extração do feed de mensagens do assistente do ERP

- **Causa:** `AIChatAssistant.tsx` mantinha duas cópias da renderização de mensagens, badges de ferramentas e indicador de carregamento, uma para cada layout; também continha o auto-scroll acoplado à tela inteira.
- **Solução:** extraído o feed para `AIChatAssistantMessages.tsx`, que centraliza a apresentação e o auto-scroll e conserva o espaçamento específico de drawer e floating. Envio, validação, voz, persistência e API pública do assistente ficaram no componente proprietário.
- **Arquivos:** `erp/src/components/shared/AIChatAssistant.tsx`, `erp/src/components/shared/AIChatAssistantMessages.tsx` e este inventário. `AppLayout.tsx` e os chamadores existentes seguem usando a mesma fachada.
- **Revisão estática:** as duas versões do feed, classes de espaçamento, conteúdo e indicador foram comparadas; referências e imports do assistente foram conferidos. A tela ficou com 623 linhas e o novo componente com 124. A varredura encontrou e reconciliou a contagem de `InventoryOperationScreen.tsx` (595 → 590), sem editar seu código local. Nenhum teste foi executado; validação dinâmica pendente.

### 01/11/2026 — Extração da tela de recuperação de senha mobile

- **Causa:** `LoginScreen.tsx` reunia o login e a apresentação das três etapas de recuperação de senha.
- **Solução:** a interface de recuperação foi movida para `PasswordRecoveryScreen.tsx`; `LoginScreen` continua proprietário dos estados, das chamadas de autenticação e dos formulários `useZodForm` com os mesmos schemas e handlers.
- **Arquivos:** `mobile/src/components/LoginScreen.tsx`, `mobile/src/components/PasswordRecoveryScreen.tsx` e este inventário. O ponto de entrada `mobile/App.tsx` manteve a mesma importação e props.
- **Revisão estática:** JSX e ações da recuperação conferidos, imports de ícones revisados, schemas e validações RHF permaneceram no componente proprietário. `git diff --check` passou; `LoginScreen.tsx` ficou com 363 linhas e a nova tela com 243. Nenhum teste foi executado; validação dinâmica pendente.

### 01/11/2026 — Extração da sincronização dos caches de entrega mobile

- **Causa:** `deliveryFlowService.ts` coordenava as transições do fluxo de entrega e também implementava a atualização do repositório local e dos dois caches offline de pedidos.
- **Solução:** `syncLocalOrderCaches` foi movida sem alteração para `deliveryOrderCacheSync.ts`; as dez chamadas continuam aguardadas antes do registro do evento offline, e a API pública `deliveryFlowService` permanece igual.
- **Arquivos:** `mobile/src/features/orders/services/deliveryFlowService.ts`, `mobile/src/features/orders/services/deliveryOrderCacheSync.ts` e este inventário.
- **Revisão estática:** corpo extraído comparado ao baseline e preservado; as dez chamadas aguardadas continuam antes do evento offline. O chamador `useDeliveryFlowActions`, os imports e a API pública foram conferidos. `git diff --check` e contagens do catálogo (104/104) passaram; serviço com 481 linhas e helper com 56. Nenhum teste foi executado; validação dinâmica pendente.

### 01/11/2026 — Separação dos schemas do chat financeiro mobile

- **Causa:** `useFinancialAiChat.ts` misturava a coordenação de mensagens e voz com a definição dos schemas Zod específicos do chat.
- **Solução:** os schemas de mensagem, confirmação de intenção e transação foram movidos sem alteração para `financialAiChatSchemas.ts`; o hook continua submetendo os mesmos schemas por `useZodForm` e usando a validação de confirmação nos mesmos pontos.
- **Arquivos:** `mobile/src/features/finance/hooks/useFinancialAiChat.ts`, `mobile/src/features/finance/hooks/financialAiChatSchemas.ts` e este inventário.
- **Revisão estática:** usos, imports e validações de confirmação conferidos; a API retornada pelo hook não mudou. `git diff --check`, contagens do catálogo (105/105) e revisão final passaram. O hook ficou com 604 linhas e o novo módulo com 21. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Extração do parser e serializador de atributos de produto mobile

- **Causa:** `productCharacteristics.ts` misturava regras de aplicabilidade e agrupamento com compatibilidade de formatos legados/atuais de atributos de variação.
- **Solução:** normalização de nomes, parsing/normalização de valores, leitura dos atributos `showName`, resumo de cores e operações de upsert/remoção foram movidos para `productCharacteristicAttributes.ts`. O módulo original importa os helpers usados pela lógica restante e reexporta a API pública existente.
- **Arquivos:** `mobile/src/features/products/domain/productCharacteristics.ts`, `mobile/src/features/products/domain/productCharacteristicAttributes.ts` e este inventário.
- **Validação estática:** blocos transferidos preservados com apenas exportação dos helpers internos necessária ao consumidor; referências existentes continuam pelo caminho público `productCharacteristics.ts`; contagens finais de 883 e 113 linhas. `git diff --check` passou; nenhum teste foi executado e a validação dinâmica permanece pendente.

### 31/10/2026 — Isolamento das ferramentas financeiras do agente mobile

- **Causa:** `mobileAgentTools.ts` reunia ferramentas de operações, produtos, feedback e um grupo independente de consultas e preparações financeiras.
- **Solução:** as seis ferramentas financeiras foram movidas sem alteração de implementação para `mobileAgentFinanceTools.ts`; o objeto público mantém as mesmas chaves e a posição do grupo por spread, preservando o despacho pelo nome.
- **Arquivos:** `mobile/src/services/aiAgent/mobileAgentTools.ts`, `mobile/src/services/aiAgent/mobileAgentFinanceTools.ts` e este inventário.
- **Validação estática:** o bloco foi comparado integralmente ao original e não depende de `this`; dispatcher e declarações continuam apontando para os mesmos nomes em `mobileAgentTools`; contagens finais de 345 e 368 linhas. `git diff --check` e revisão das referências; nenhum teste executado, validação dinâmica pendente.

### 31/10/2026 — Separação da configuração da navegação mobile do ERP

- **Causa:** `MobileNav.tsx` mantinha a árvore estática de menus junto da filtragem por permissão e da renderização.
- **Solução:** a configuração `menuItems` foi movida sem alteração para `mobileNavMenuItems.ts`; o alias de import mantém o uso existente no componente e a lógica de permissões continua no mesmo lugar.
- **Arquivos:** `erp/src/components/layout/MobileNav.tsx`, `erp/src/components/layout/mobileNavMenuItems.ts` e este inventário.
- **Validação estática:** configuração comparada integralmente ao bloco original; `AppLayout` e o export do componente permanecem inalterados; contagens finais de 327 e 283 linhas. `git diff --check` e revisão das referências pendentes; nenhum teste executado, validação dinâmica pendente.

### 31/10/2026 — Extração da transformação de eventos offline

- **Causa:** `offlineSyncManager.ts` misturava a orquestração da fila com a transformação pura de cada evento em patch de estado.
- **Solução:** `eventPatch` foi movida sem alteração de lógica para `offlineEventPatch.ts`; `recordEvent` conserva a mesma chamada e os chamadores do gerenciador não mudaram.
- **Arquivos:** `mobile/src/services/offline/offlineSyncManager.ts`, `mobile/src/services/offline/offlineEventPatch.ts` e este inventário.
- **Validação estática:** o bloco transferido foi comparado ao original com apenas a exportação adicionada; referências verificadas no módulo offline e nos chamadores do gerenciador; contagens finais de 571 e 78 linhas. `git diff --check` passou para o arquivo rastreado. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Separação da consulta de métricas de APIs

- **Causa:** `ApiUsageTracker` reunia o registro de consumo e a consulta/agrupação do dashboard, que constitui uma responsabilidade de leitura independente.
- **Solução:** a implementação de `getDashboardMetrics` foi movida para `apiUsageDashboardService.ts`; a classe mantém o método estático com a mesma assinatura e delega ao novo serviço.
- **Arquivos:** `erp/src/services/apiMonitoring/apiUsageTracker.ts`, `erp/src/services/apiMonitoring/apiUsageDashboardService.ts` e este inventário.
- **Validação estática:** bloco de implementação conferido por reconstrução normalizada; os dois chamadores continuam usando `ApiUsageTracker.getDashboardMetrics`; o arquivo original ficou com 218 linhas e o novo com 376. `git diff --check` passou para o arquivo rastreado; nenhuma validação dinâmica ou teste foi executado.

### 31/10/2026 — Isolamento das operações de ambientes do ERP

- **Causa:** `categoryService.ts` agrupava a consulta e as mutações de ambientes com as responsabilidades de categorias e características.
- **Solução:** o tipo `Environment` e as funções de buscar, criar, atualizar, excluir e desvincular ambientes foram movidos sem alteração para `environmentService.ts`. `categoryService.ts` mantém a API anterior por importação/reexportação e `fetchGroupsAndCategories` segue usando `fetchEnvironments`.
- **Arquivos:** `erp/src/pages/utils/categoryService.ts`, `erp/src/pages/utils/environmentService.ts` e `docs/auditorias/inventario-arquivos-grandes.md`.
- **Validação estática:** tipo e blocos de funções comparados ao baseline; chamadores, testes e reexports revisados. O chamador `useCategoriesAndEnvironments.ts` tinha alterações locais preexistentes e foi preservado. `git diff --check` passou; `categoryService.ts` ficou com 423 linhas e `environmentService.ts` com 144. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Separação dos estilos da tela do formulário de produto mobile

- **Causa:** `ProductFormScreen.tsx` concentrava a coordenação do formulário multiaba e uma definição estática de estilos compartilhados pela tela.
- **Solução:** o bloco `StyleSheet` foi movido sem alteração para `productFormScreen.styles.ts`, no mesmo diretório; a tela ficou com 1686 linhas e manteve sua API.
- **Arquivos:** `mobile/src/features/products/screens/ProductFormScreen.tsx`, `mobile/src/features/products/screens/productFormScreen.styles.ts` e `docs/auditorias/inventario-arquivos-grandes.md`.
- **Validação estática:** bloco comparado ao baseline sem diferenças; alias `ProductFormModal` e uso em `InboundQuickProductModal.tsx` revisados, sem alterações nos chamadores; `git diff --check` passou. O novo módulo ficou com 236 linhas. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Separação dos estilos do campo técnico mobile

- **Causa:** `ProductTechnicalFieldInput.tsx` agrupava o controle e seus modos de entrada com a definição estática de estilos.
- **Solução:** o bloco `StyleSheet` foi movido sem alteração para `productTechnicalFieldInput.styles.ts`, no mesmo diretório; o componente ficou com 506 linhas e manteve a mesma API.
- **Arquivos:** `mobile/src/features/products/modals/tabs/ProductTechnicalFieldInput.tsx`, `mobile/src/features/products/modals/tabs/productTechnicalFieldInput.styles.ts` e `docs/auditorias/inventario-arquivos-grandes.md`.
- **Validação estática:** bloco comparado ao baseline sem diferenças; import e uso em `ProductFormTechnicalTab.tsx` revisados; `git diff --check` passou. O módulo de estilos ficou com 91 linhas. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Separação dos estilos do gerenciador de características mobile

- **Causa:** `AttributesManagerModal.tsx` reunia a coordenação do gerenciamento de características e uma definição estática de estilos.
- **Solução:** o bloco `StyleSheet` foi movido sem alteração para `attributesManagerModal.styles.ts`, no mesmo diretório; o componente ficou com 646 linhas e manteve a mesma API.
- **Arquivos:** `mobile/src/features/products/modals/AttributesManagerModal.tsx`, `mobile/src/features/products/modals/attributesManagerModal.styles.ts` e `docs/auditorias/inventario-arquivos-grandes.md`.
- **Validação estática:** bloco comparado ao baseline sem diferenças; import e chamador em `ProductConfigModal.tsx` revisados; `git diff --check` passou. O novo módulo ficou com 160 linhas. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Separação dos estilos do modal de movimentação de variação

- **Causa:** `MobileMoveVariationModal.tsx` mantinha a apresentação estática do modal junto à validação e coordenação da movimentação de variações.
- **Solução:** o bloco `StyleSheet` foi movido sem alteração para `mobileMoveVariationModal.styles.ts`, no mesmo diretório; o componente ficou com 701 linhas e manteve a mesma API.
- **Arquivos:** `mobile/src/features/products/modals/MobileMoveVariationModal.tsx`, `mobile/src/features/products/modals/mobileMoveVariationModal.styles.ts` e `docs/auditorias/inventario-arquivos-grandes.md`.
- **Validação estática:** bloco comparado ao baseline sem diferenças; import revisado. O chamador em `NativeProductsScreen.tsx` foi inspecionado e seu diff local preexistente foi preservado. `git diff --check` passou; o novo módulo ficou com 149 linhas. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Separação dos estilos da aba de variações do produto mobile

- **Causa:** `ProductFormVariationsTab.tsx` reunia a coordenação do formulário de variações e uma definição estática extensa de estilos.
- **Solução:** o bloco `StyleSheet` foi movido sem alteração para `productFormVariationsTab.styles.ts`, no mesmo diretório; o componente ficou com 1373 linhas e manteve a mesma API.
- **Arquivos:** `mobile/src/features/products/modals/tabs/ProductFormVariationsTab.tsx`, `mobile/src/features/products/modals/tabs/productFormVariationsTab.styles.ts` e `docs/auditorias/inventario-arquivos-grandes.md`.
- **Validação estática:** bloco comparado ao baseline sem diferenças; import e chamador em `ProductFormScreen.tsx` revisados; `git diff --check` passou. O novo módulo ficou com 406 linhas. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Separação dos estilos da aba de preços do produto mobile

- **Causa:** `ProductFormPricesTab.tsx` reunia a renderização e a coordenação de preços, origem comercial e fornecedores com uma definição estática de estilos.
- **Solução:** o bloco `StyleSheet` foi movido sem alteração para `productFormPricesTab.styles.ts`, no mesmo diretório; o componente ficou com 652 linhas e manteve a mesma API.
- **Arquivos:** `mobile/src/features/products/modals/tabs/ProductFormPricesTab.tsx`, `mobile/src/features/products/modals/tabs/productFormPricesTab.styles.ts` e `docs/auditorias/inventario-arquivos-grandes.md`.
- **Validação estática:** bloco comparado ao baseline sem diferenças; imports e referências em `ProductFormScreen.tsx` e `ProductFormPricesTab.header.test.tsx` revisados; `git diff --check` passou. O módulo de estilos ficou com 164 linhas. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Separação dos estilos da aba de fotos do produto mobile

- **Causa:** `ProductFormPhotosTab.tsx` mantinha uma definição estática de estilos de 250 linhas junto à coordenação das fotos e do recorte.
- **Solução:** o bloco `StyleSheet` foi movido sem alteração para `productFormPhotosTab.styles.ts`, no mesmo diretório; o componente ficou com 464 linhas e manteve a mesma API.
- **Arquivos:** `mobile/src/features/products/modals/tabs/ProductFormPhotosTab.tsx`, `mobile/src/features/products/modals/tabs/productFormPhotosTab.styles.ts`, `mobile/src/features/products/screens/ProductFormScreen.tsx` e `docs/auditorias/inventario-arquivos-grandes.md`.
- **Validação estática:** bloco comparado ao baseline sem diferenças; o chamador em `ProductFormScreen.tsx` e os imports foram revisados; `git diff --check` passou. O módulo de estilos ficou com 281 linhas. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Separação dos estilos da aba básica do produto mobile

- **Causa:** `ProductFormBasicTab.tsx` mantinha a definição estática de estilos junto à coordenação dos campos básicos do produto.
- **Solução:** o bloco `StyleSheet` foi movido sem alteração para `productFormBasicTab.styles.ts`, no mesmo diretório; a tela permanece com 635 linhas e mantém a mesma API.
- **Arquivos:** `mobile/src/features/products/modals/tabs/ProductFormBasicTab.tsx`, `mobile/src/features/products/modals/tabs/productFormBasicTab.styles.ts` e `docs/auditorias/inventario-arquivos-grandes.md`.
- **Validação estática:** bloco comparado ao baseline sem diferenças; import e chamador em `ProductFormScreen.tsx` revisados; `git diff --check` passou. O novo módulo ficou com 253 linhas. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Separação dos estilos da aba técnica do produto mobile

- **Causa:** `ProductFormTechnicalTab.tsx` mantinha a definição estática de estilos junto à coordenação do formulário e das características técnicas.
- **Solução:** o bloco `StyleSheet` foi movido sem alteração para `productFormTechnicalTab.styles.ts`, no mesmo diretório; a tela ficou com 1251 linhas.
- **Arquivos:** `mobile/src/features/products/modals/tabs/ProductFormTechnicalTab.tsx`, `mobile/src/features/products/modals/tabs/productFormTechnicalTab.styles.ts` e `docs/auditorias/inventario-arquivos-grandes.md`.
- **Validação estática:** bloco comparado ao baseline, imports e dois chamadores revisados e `git diff --check` passou. O novo módulo ficou com 211 linhas. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Separação dos estilos da tela de montagens

- **Causa:** `NativeAssembliesScreen.tsx` mantinha uma definição estática de `StyleSheet` junto com a tela e seu fluxo de dados.
- **Solução:** os estilos foram movidos sem alteração para `nativeAssembliesScreen.styles.ts`, no mesmo diretório; a tela importa o objeto e ficou com 459 linhas.
- **Arquivos:** `mobile/src/features/assemblies/screens/NativeAssembliesScreen.tsx`, `mobile/src/features/assemblies/screens/nativeAssembliesScreen.styles.ts` e `docs/auditorias/inventario-arquivos-grandes.md`.
- **Validação estática:** bloco comparado ao baseline, imports e dois chamadores revisados e `git diff --check` passou. O módulo de estilos ficou com 57 linhas. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Separação dos estilos do detalhe de entrega no mapa

- **Causa:** `DeliveryBottomSheet.tsx` mantinha a definição estática de `StyleSheet` junto com a renderização do modal.
- **Solução:** o bloco de estilos foi movido sem alterações para `deliveryBottomSheet.styles.ts`, no mesmo diretório; o componente importa o mesmo objeto de estilos e ficou com 256 linhas.
- **Arquivos:** `mobile/src/features/logistics/components/deliveryMap/DeliveryBottomSheet.tsx`, `mobile/src/features/logistics/components/deliveryMap/deliveryBottomSheet.styles.ts` e `docs/auditorias/inventario-arquivos-grandes.md`.
- **Validação estática:** bloco comparado ao baseline, import e uso pelo chamador revisados e `git diff --check` passou. O módulo de estilos ficou com 266 linhas. Nenhum teste foi executado; validação visual/dinâmica pendente.

### 31/10/2026 — Separação da construção de perguntas financeiras agrupadas

- **Causa:** `financialIntentValidator.ts` também concentrava a formatação de perguntas para lotes de intenções, responsabilidade independente da validação e processamento.
- **Solução:** `buildGroupedQuestion` foi extraída sem alteração do corpo para `financialQuestionBuilder.ts`; o módulo original mantém a função importada para uso interno e o export público. O validador ficou com 614 linhas.
- **Arquivos:** `mobile/src/services/financial/financialIntentValidator.ts`, `mobile/src/services/financial/financialQuestionBuilder.ts` e `docs/auditorias/inventario-arquivos-grandes.md`.
- **Validação estática:** corpo comparado ao baseline, chamadas internas e reexport da fachada revisados e `git diff --check` passou. O novo módulo ficou com 76 linhas. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Separação da disponibilidade de produtos compostos no mobile

- **Causa:** `mobileProductFetchService.ts` combinava a consulta e normalização de produtos com o enriquecimento de saldo disponível para composições.
- **Solução:** `applyMobileCompositionAvailability` foi extraída sem alteração do corpo para `mobileProductCompositionAvailability.ts`; as duas chamadas, para resumo e listagem completa, permanecem no fluxo original. O serviço de busca ficou com 634 linhas.
- **Arquivos:** `mobile/src/features/products/services/mobileProductFetchService.ts`, `mobile/src/features/products/services/mobileProductCompositionAvailability.ts` e `docs/auditorias/inventario-arquivos-grandes.md`.
- **Validação estática:** corpo comparado ao baseline, imports e duas referências revisados e `git diff --check` passou. O novo módulo ficou com 106 linhas. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Extração do reconhecedor de campos desconhecidos do financeiro

- **Causa:** `financialTextParser.ts` importava o extrator de `financialSlotFilling.ts`, que por sua vez importa `parsePtBrNumber` do parser, formando um ciclo de dependências evitável.
- **Solução:** o corpo de `extractUnknownFieldsFromText` foi movido para `financialUnknownFieldExtractor.ts`; o módulo antigo mantém o export público e o parser importa o novo módulo diretamente. `financialSlotFilling.ts` ficou com 716 linhas.
- **Arquivos:** `mobile/src/services/financial/financialSlotFilling.ts`, `mobile/src/services/financial/financialTextParser.ts` e `mobile/src/services/financial/financialUnknownFieldExtractor.ts`.
- **Validação estática:** corpo extraído comparado ao baseline, referências e imports revisados e `git diff --check` passou. O novo módulo ficou com 83 linhas. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Separação das definições de características do produto mobile

- **Causa:** o módulo de características reunia interfaces e definições estáticas com normalização, serialização, agrupamento e validação de domínio.
- **Solução:** os tipos e as definições estáticas foram extraídos para `mobile/src/features/products/domain/productCharacteristicDefinitions.ts`; `productCharacteristics.ts` preserva os exports existentes e ficou com 977 linhas.
- **Arquivos:** `mobile/src/features/products/domain/productCharacteristics.ts` e `mobile/src/features/products/domain/productCharacteristicDefinitions.ts`.
- **Validação estática:** chamadores permanecem no caminho público existente; imports, exports e referências foram revisados; `git diff --check` passou. O novo módulo ficou com 191 linhas. Nenhum teste foi executado; validação dinâmica pendente.

### 31/10/2026 — Separação dos formatadores de nomes de produto

- **Causa:** `mobile/src/utils/orderUtils.ts` agrupava formatação de nomes e resumos de itens com utilitários de pedido de outras responsabilidades (662 linhas).
- **Solução:** os quatro formatadores foram movidos sem alterar seus corpos para `mobile/src/utils/productNameFormatters.ts`. Três chamadores agora importam do módulo dedicado; os exports antigos continuam reexportados por `orderUtils.ts`.
- **Arquivos:** `mobile/src/utils/orderUtils.ts`, `mobile/src/utils/productNameFormatters.ts`, `mobile/src/utils/aiSummaryHelper.ts`, `mobile/src/features/assemblies/components/AssemblyOrderCard.tsx` e `mobile/src/components/orders/OrderItemChip.tsx`.
- **Validação estática:** os blocos extraídos foram comparados e preservados a partir do baseline limpo; imports e reexports foram conferidos; `git diff --check` passou. `orderUtils.ts` ficou com 499 linhas e o novo módulo com 169. Nenhum teste foi executado.


### 31/10/2026 — Separação dos estilos do resumo de entregas

- **Causa:** `TodaySummaryCard.tsx` concentrava renderização e um bloco de estilos de 234 linhas no mesmo arquivo (900 linhas antes da mudança).
- **Solução:** o bloco `StyleSheet.create` foi movido sem alteração para `todaySummaryCard.styles.ts`; o componente importa `styles` do módulo dedicado e mantém a mesma API.
- **Arquivos:** `mobile/src/features/logistics/components/today-summary/TodaySummaryCard.tsx` e `mobile/src/features/logistics/components/today-summary/todaySummaryCard.styles.ts`.
- **Validação estática:** bloco de estilos preservado; referências `styles.*` continuam no componente; `git diff --check` passou. O componente ficou com 668 linhas e o módulo de estilos com 234. Nenhum teste foi executado.


### 01/11/2026 — Separação das definições de variáveis do WhatsApp

- **Causa:** `WhatsAppConfigSection.tsx` mantinha no componente as opções de quantidade de variáveis e os valores de exemplo usados no comando de teste do modelo.
- **Solução:** as opções e `getWhatsAppTemplateSampleVariables` foram movidos para `whatsappTemplateVariables.ts`; o componente continua controlando o formulário e chamando o mesmo serviço, com os mesmos parâmetros.
- **Arquivos:** `erp/src/pages/App/Settings/components/integrations/WhatsAppConfigSection.tsx` e `erp/src/pages/App/Settings/components/integrations/whatsappTemplateVariables.ts`.
- **Validação estática:** valores, rótulos, condição para 8 variáveis e `slice` foram preservados; o componente, a fachada da seção, o chamador e o teste existente foram localizados. O arquivo de produção ficou com 512 linhas e o helper com 33. Nenhum teste foi executado; validação dinâmica pendente. O diff global também aponta linhas vazias no EOF em três arquivos não relacionados; foram preservados.

### 01/11/2026 — Extração da montagem das linhas de comparação de características

- **Causa:** `CharacteristicsDiffTable.tsx` agrupava renderização da tabela, classificação de valores já preenchidos e montagem das sugestões gerais, dimensões e características técnicas.
- **Solução:** a montagem pura das linhas e o tipo `DiffRowItem` foram movidos para `characteristicsDiffRows.ts`; a tabela mantém a memoização, a mesma dependência derivada de `identifiedProduct` e reexporta o tipo existente.
- **Arquivos:** `erp/src/pages/App/Products/modals/characteristicsAi/CharacteristicsDiffTable.tsx` e `erp/src/pages/App/Products/modals/characteristicsAi/characteristicsDiffRows.ts`.
- **Validação estática:** ordem das linhas, valores, chaves, critérios `Number(value) > 0`, confiança e classificação de campos preenchidos foram comparados ao código anterior; chamadores e barrel foram localizados. A tabela ficou com 385 linhas e o helper com 117. Nenhum teste foi executado; validação dinâmica pendente.

### 01/11/2026 — Extração da resolução de oportunidade do preview de posts

- **Causa:** `Marketing/Posts/index.tsx` combinava montagem da tela com a resolução dos campos legados de oportunidade presentes no produto usado pelo preview.
- **Solução:** a busca por ID, nome ou slug foi movida para `postPreviewOpportunityResolver.ts`; o componente conserva a mesma memoização e todos os consumidores recebem a mesma oportunidade resolvida.
- **Arquivos:** `erp/src/pages/App/Marketing/Posts/index.tsx` e `erp/src/pages/App/Marketing/Posts/services/postPreviewOpportunityResolver.ts`.
- **Validação estática:** condições, ordem de prioridade e retorno da busca foram comparados ao código anterior; uso em selo, dados do preview e chamadores do módulo foram revisados. O componente ficou com 500 linhas e o helper com 24. Nenhum teste foi executado; validação dinâmica pendente.

### 01/11/2026 — Extração do cartão lateral do perfil

- **Causa:** `Profile/Index.tsx` misturava os formulários de perfil e senha com a apresentação do avatar, informações básicas, links de instalação do app e ação de logout.
- **Solução:** esse bloco foi extraído para `ProfileSidebarCard.tsx`. A página continua proprietária do upload e da validação Zod do avatar, além de preservar o export padrão e as props necessárias.
- **Arquivos:** `erp/src/pages/App/Profile/Index.tsx` e `erp/src/pages/App/Profile/components/ProfileSidebarCard.tsx`.
- **Validação estática:** o import da rota `/profile`, o import do componente no teste existente, o campo de arquivo, os textos/links e `avatarForm.validateAndRun` foram conferidos. A página ficou com 450 linhas e o novo componente com 104; o catálogo foi reconciliado para 124 arquivos acima de 500 linhas. Nenhum teste foi executado; validação dinâmica pendente.

### 01/11/2026 — Extração do cabeçalho da conta no catálogo digital

- **Causa:** `digital-catalog/src/app/perfil/page.tsx` concentrava operações de conta e a apresentação independente do cabeçalho com identidade e logout.
- **Solução:** o cabeçalho foi movido para `ProfileAccountHeader.tsx`; os valores exibidos e o handler existente são recebidos por props, sem alterar os fluxos de conta.
- **Arquivos:** `digital-catalog/src/app/perfil/page.tsx`, `digital-catalog/src/app/perfil/components/ProfileAccountHeader.tsx` e este inventário.
- **Validação estática:** conteúdo, rótulos, condição do badge de administrador, callback de logout, link de retorno e rota `/perfil` foram revisados; todos os formulários e seus schemas Zod permaneceram na página. A página ficou com 772 linhas e o componente com 67. Nenhum teste foi executado; validação dinâmica pendente.

### 01/11/2026 — Extração das transformações de formatação do chat

- **Causa:** `ChatComposer.tsx` acumulava configuração visual dos formatos do WhatsApp e a transformação pura do texto selecionado junto à coordenação do formulário e do textarea.
- **Solução:** as opções e os cálculos de texto/cursor foram extraídos para `chatMessageFormatting.ts`; o componente continua controlando foco, seleção, validação RHF/Zod e envio.
- **Arquivos:** `erp/src/pages/App/CustomerSupport/components/chat/ChatComposer.tsx`, `erp/src/pages/App/CustomerSupport/components/chat/chatMessageFormatting.ts` e este inventário.
- **Validação estática:** lógica de inclusão/remoção dos marcadores, ordem numerada, seleção/cursor e opções visíveis foram comparados ao código anterior; consumidor, chamador e reexport da pasta foram localizados. O componente ficou com 1114 linhas e o helper com 75. Nenhum teste foi executado; validação dinâmica pendente.

### 01/11/2026 — Extração do cálculo de estilos responsivos do atendimento

- **Causa:** `CustomerSupport/Index.tsx` misturava a composição da página e o cálculo detalhado de estilos responsivos para os painéis da caixa de entrada e das conversas.
- **Solução:** o cálculo puro dos dois objetos de estilo foi movido para `customerSupportPanelStyles.ts`; o estado e a renderização continuam na página.
- **Arquivos:** `erp/src/pages/App/CustomerSupport/Index.tsx`, `erp/src/pages/App/CustomerSupport/customerSupportPanelStyles.ts` e este inventário.
- **Validação estática:** posições, larguras, limites, visibilidade, pointer events e transições mobile/desktop foram comparados ao código anterior; uso dos estilos, rota do módulo e estado dos painéis foram revisados. A página ficou com 520 linhas e o helper com 72. Nenhum teste foi executado; validação dinâmica pendente.

### 01/11/2026 — Separação dos estilos do modal de recorte de foto

- **Causa:** `ProductSquareImageCropModal.tsx` concentrava a preparação/interação do recorte e 37 definições estáticas de apresentação no mesmo módulo.
- **Solução:** as definições foram movidas sem alteração para `productSquareImageCropModal.styles.ts`; o modal importa a mesma coleção `styles` e continua proprietário do fluxo, dos formulários e das operações de imagem.
- **Arquivos:** `mobile/src/features/products/modals/components/ProductSquareImageCropModal.tsx`, `mobile/src/features/products/modals/components/productSquareImageCropModal.styles.ts` e este inventário.
- **Validação estática:** o bloco de estilos foi comparado ao baseline e permaneceu idêntico; os dois chamadores e as referências `styles.*` foram localizados. O modal ficou com 606 linhas e o módulo de estilos com 39. Nenhum teste foi executado; validação visual/dinâmica pendente.

### 01/11/2026 — Extração da identidade visual do card mobile de produto

- **Causa:** `MobileProductCard.tsx` misturava a coordenação de ações, status e variações com o bloco de apresentação de imagem, título, composição e badges do produto.
- **Solução:** o bloco foi extraído para `MobileProductCardIdentity.tsx`, recebendo os mesmos valores já derivados pelo hook do card; a API pública e os handlers permanecem no componente original.
- **Arquivos:** `mobile/src/features/products/components/MobileProductCard.tsx`, `mobile/src/features/products/components/MobileProductCardIdentity.tsx` e este inventário.
- **Validação estática:** condições, dados, rótulos, acessibilidade e estilos da seção foram comparados ao bloco anterior; o único chamador e o teste existente foram localizados, sem alteração de suas interfaces. O card ficou com 534 linhas e o novo componente com 115. Nenhum teste foi executado; validação visual/dinâmica pendente.

### 01/11/2026 — Extração dos controles de transformação das artes de etiqueta

- **Causa:** o renderer repetia a mesma renderização dos controles de redimensionar e girar em quatro camadas; o grupo de preço anterior repetia a mesma estrutura em três elementos.
- **Solução:** controles e handlers foram extraídos para `PriceLabelArtTransformHandles.tsx`; as camadas mantêm seus IDs, classes de redimensionamento e rótulos, inclusive o texto específico do preço promocional.
- **Arquivos:** `erp/src/pages/App/Stock/LabelPrinting/components/PriceLabelArtRenderer.tsx`, `erp/src/pages/App/Stock/LabelPrinting/components/PriceLabelDealPriceGroup.tsx`, `erp/src/pages/App/Stock/LabelPrinting/components/PriceLabelArtTransformHandles.tsx` e este inventário.
- **Validação estática:** as sete chamadas e os dois chamadores do renderer foram localizados; os callbacks, condições de seleção, classes, títulos e ícone foram comparados com o código anterior. `PriceLabelArtRenderer.tsx` ficou com 477 linhas e saiu do catálogo; o helper tem 49 linhas. `git diff --check` passou. Nenhum teste foi executado; validação visual/dinâmica pendente.

### 01/11/2026 — Extração dos controles do agendamento de vendas

- **Causa:** `Agendamento.tsx` concentrava a composição dos campos e a apresentação do cabeçalho, toggles de pendência/retirada imediata e abas de modo.
- **Solução:** o bloco visual foi extraído para `SchedulingControls.tsx`; os handlers de alteração continuam no componente proprietário, que mantém a fachada e os exports existentes.
- **Arquivos:** `erp/src/pages/App/SalesOrder/ShippingComponents/Agendamento.tsx`, `erp/src/pages/App/SalesOrder/ShippingComponents/agendamento/SchedulingControls.tsx` e este inventário.
- **Validação estática:** rótulos, classes, atributos ARIA, condições de exibição e sequência das alterações dos handlers foram comparados ao bloco anterior; os chamadores e imports de tipos públicos foram localizados. `Agendamento.tsx` ficou com 513 linhas e o novo componente com 120. Nenhum teste foi executado; validação dinâmica pendente.

### 01/11/2026 — Centralização das categorias por origem de estoque nas linhas de venda

- **Causa:** `BodyRowMobile.tsx` e `BodyRowDesktop.tsx` repetiam a mesma configuração de categorias aceitas para cada origem de estoque.
- **Solução:** a constante foi centralizada em `stockOriginProductKinds.ts`; ambos os autocompletes preservam os mesmos valores e a mesma seleção por `item.condition`.
- **Arquivos:** `erp/src/pages/App/SalesOrder/ItemsTable/BodyRowMobile.tsx`, `erp/src/pages/App/SalesOrder/ItemsTable/BodyRowDesktop.tsx`, `erp/src/pages/App/SalesOrder/ItemsTable/stockOriginProductKinds.ts` e este inventário.
- **Validação estática:** duplicidade, imports e os dois usos de `allowedProductKinds` foram revisados; os componentes passaram a 575 e 550 linhas e o helper tem 6. Nenhum teste foi executado; validação dinâmica pendente.

### 01/11/2026 — Extração do controle de envio de teste de modelo WhatsApp

- **Causa:** `WhatsAppConfigSection.tsx` reunia configuração e coordenação de ações com a apresentação do controle para enviar um teste de modelo.
- **Solução:** campo de telefone e botão foram extraídos para `WhatsAppTemplateSendTestControl.tsx`; validação Zod, estado, guarda contra repetição e envio permanecem no componente proprietário.
- **Arquivos:** `erp/src/pages/App/Settings/components/integrations/WhatsAppConfigSection.tsx`, `erp/src/pages/App/Settings/components/integrations/WhatsAppTemplateSendTestControl.tsx` e este inventário.
- **Validação estática:** props e elementos renderizados foram comparados ao bloco anterior; facade, chamador de configurações e seletores usados pelo teste existente foram localizados. O componente proprietário ficou com 486 linhas e saiu do catálogo; o controle tem 53. Nenhum teste foi executado; validação dinâmica pendente.

### 01/11/2026 — Extração da interação de arraste do canvas de etiquetas

- **Causa:** `usePriceLabelCanvasInteractions.ts` misturava o arraste magnético com guias do canvas às interações distintas de redimensionamento e rotação.
- **Solução:** o estado e callback de arraste foram extraídos para `usePriceLabelCanvasDragInteraction.ts`; o hook original conserva sua interface exportada e continua retornando os três handlers usados pelo preview.
- **Arquivos:** `erp/src/pages/App/Stock/LabelPrinting/modals/price-label-editor/usePriceLabelCanvasInteractions.ts`, `erp/src/pages/App/Stock/LabelPrinting/modals/price-label-editor/usePriceLabelCanvasDragInteraction.ts` e este inventário.
- **Validação estática:** guardas, cálculo de escala, seleção múltipla, posições, snap, guias, listeners e cleanup foram comparados com a implementação anterior; caller e props do preview foram localizados. O hook principal ficou com 489 linhas e saiu do catálogo; o hook novo tem 277. Nenhum teste foi executado; validação dinâmica pendente.

### 01/11/2026 — Extração da interface do seletor de pedidos no atendimento

- **Causa:** `ChatComposer.tsx` misturava a coordenação de anexos e envio com a interface independente do seletor de pedidos e orçamentos.
- **Solução:** o diálogo foi extraído para `SupportOrderPickerDialog.tsx`; filtro, mensagens de estado, seleção visual e envio do formulário continuam conectados pelos mesmos valores e callbacks do composer.
- **Arquivos:** `erp/src/pages/App/CustomerSupport/components/chat/ChatComposer.tsx`, `erp/src/pages/App/CustomerSupport/components/chat/SupportOrderPickerDialog.tsx` e este inventário.
- **Validação estática:** props, rótulos, acessibilidade, filtro, seleção RHF, erro de campo e prevenção de submit padrão foram comparados com o bloco original; `ChatArea` e as referências públicas de `ChatComposer` foram localizados. O composer ficou com 1099 linhas e o diálogo com 84. Nenhum teste foi executado; validação dinâmica pendente.

### 01/11/2026 — Extração do mapeamento de rota para contexto do assistente de IA

- **Causa:** `AIChatAssistant.tsx` misturava a orquestração da conversa com a classificação pura da rota em módulo e nome de página para o contexto enviado à IA.
- **Solução:** a função foi extraída para `getAgentPageContext.ts`, na pasta dos serviços do agente; as três chamadas continuam fornecendo `location.pathname` e o componente mantém a mesma API.
- **Arquivos:** `erp/src/components/shared/AIChatAssistant.tsx`, `erp/src/services/aiAgent/getAgentPageContext.ts` e este inventário.
- **Revisão estática:** ordem das condições, rótulos de módulo, derivação de página e `currentPath` foram preservados literalmente; os três usos no formulário, envio e cabeçalho foram localizados. O componente passou de 623 para 596 linhas e permanece catalogado. Nenhum teste foi executado; validação dinâmica pendente.

### 01/11/2026 — Extração da transformação da árvore de categorias do catálogo

- **Causa:** `ProductCatalogPanel.tsx` combinava a seleção e preparação do catálogo com a transformação pura das relações de categorias em uma lista ordenada e indentada.
- **Solução:** a função e os tipos locais foram movidos para `productCatalogCategoryTree.ts`; filtros, consultas e a API pública do painel permaneceram no componente.
- **Arquivos:** `erp/src/components/catalog/ProductCatalogPanel.tsx`, `erp/src/components/catalog/productCatalogCategoryTree.ts` e este inventário.
- **Revisão estática:** algoritmo, ordenação por `pt-BR`, proteção contra relações ausentes/ciclos e cálculo de profundidade foram preservados; uso no painel e export público pelo `index.ts` foram conferidos sem mudança. O painel passou de 928 para 891 linhas; o helper tem 39. Nenhum teste foi executado; validação dinâmica pendente.

### 01/11/2026 — Extração da apresentação da aba de senha do perfil

- **Causa:** `page.tsx` concentrava a apresentação dos dois modos de alteração/recuperação de senha junto da coordenação de estado, validação e operações da conta.
- **Solução:** a aba foi extraída para `ProfilePasswordTab.tsx`; estado, handlers, `useZodForm`/Zod e chamadas de autenticação permanecem na página e são passados por props.
- **Arquivos:** `digital-catalog/src/app/perfil/page.tsx`, `digital-catalog/src/app/perfil/components/ProfilePasswordTab.tsx` e este inventário.
- **Revisão estática:** campos, rótulos, atributos, mensagens, estados de carregamento e callbacks dos dois modos foram comparados com o bloco anterior; `ProfilePage`, a rota `/perfil` e os seis formulários com schemas permanecem sob os mesmos chamadores. A página passou de 772 para 595 linhas; o novo componente tem 260. Nenhum teste foi executado; validação dinâmica pendente.

### 01/11/2026 — Extração da composição dos resultados da busca de clientes

- **Causa:** `CustomerSearchModal.tsx` misturava interação e apresentação da busca com a composição, deduplicação, enriquecimento por histórico e ordenação dos registros.
- **Solução:** o builder e seu tipo local foram extraídos para `customerSearchList.ts`; o modal mantém a mesma memoização por `people` e `orders`, os filtros e a fachada default usada pelos chamadores.
- **Arquivos:** `erp/src/pages/App/SalesOrder/modals/CustomerSearchModal.tsx`, `erp/src/pages/App/SalesOrder/modals/customerSearchList.ts` e este inventário.
- **Revisão estática:** regras de descarte de artefatos de teste, união cadastro/histórico, enriquecimento do endereço, contagem de pedidos e ordenação foram preservadas; referências em `AssistanceOrderModal` e `UnlinkedReturnOrderModal` continuam apontando para a mesma interface. O modal passou de 511 para 411 linhas; o helper tem 109. Nenhum teste foi executado; validação dinâmica pendente.

### 01/11/2026 — Extração da apresentação dos canais pós-salvamento

- **Causa:** `ProductSaveResultModal.tsx` concentrava a apresentação dos dois canais junto da coordenação de salvamento, validação e ações.
- **Solução:** os cartões ERP/Catálogo e seus estados visuais foram extraídos para `ProductSaveResultChannels.tsx`; handlers, validações, permissões e contratos continuam no modal proprietário.
- **Arquivos:** `erp/src/pages/App/Products/components/modals/product/ProductSaveResultModal.tsx`, novo `ProductSaveResultChannels.tsx` e este inventário.
- **Revisão estática:** JSX extraído comparado ao bloco anterior, callbacks/readiness conferidos e chamadores existentes preservados. O modal passou a 300 linhas e o componente extraído tem 336. Nenhum teste foi executado; validação dinâmica pendente.

### 01/11/2026 — Extração da barra lateral de filtros de relatórios

- **Causa:** ReportView.tsx misturava consulta e renderização do relatório com apresentação dos filtros, seleção de fornecedores, refinamento e ordenação.
- **Solução:** a barra lateral foi extraída para ReportFiltersSidebar.tsx; valores, setters e callbacks continuam sob controle do componente proprietário.
- **Arquivos:** erp/src/pages/App/SalesOrder/Reports/components/ReportView.tsx, novo ReportFiltersSidebar.tsx e este inventário.
- **Revisão estática:** bloco JSX comparado ao original, props e referências do roteador/chamador conferidos; ReportView.tsx passou a 1655 linhas e o painel tem 225. Nenhum teste foi executado; validação dinâmica pendente.

### 02/11/2026 — Extração das mutações de status de produto mobile

- **Causa:** `mobileProductMutationService.ts` concentrava persistência de produtos e operações de ativação/publicação do catálogo digital numa única unidade.
- **Solução:** `toggleMobileProductActive` e `toggleMobileProductCatalog` passaram a compor `mobileProductStatusMutationService.ts`. O timeout de mutação compartilhado foi movido para `mobileProductMutationTimeout.ts`.
- **Arquivos:** `mobile/src/features/products/services/mobileProductMutationService.ts`, novos `mobileProductStatusMutationService.ts` e `mobileProductMutationTimeout.ts`, e este inventário.
- **Revisão estática:** os dois corpos de mutação e o corpo do timeout foram comparados ao baseline, sem mudança de ordem, validação, fallbacks ou tratamento de erros. A fachada mantém os dois exports; `useMobileProducts` e o teste existente continuam importando pelo caminho original. A fachada ficou com 542 linhas, o serviço de status com 308 e o helper com 14; a contagem do catálogo permanece 112. Nenhum teste foi executado; validação dinâmica pendente.

### 02/11/2026 — Extração da memória de manuseio por método de entrega

- **Causa:** `useSalesOrderForm.ts` concentrava a coordenação do pedido e o cache que lembra/restaura o manuseio dos itens ao alternar entre entrega e retirada.
- **Solução:** o novo `useOrderItemHandlingByDeliveryMethod.ts` passou a cuidar da identidade dos itens, memória por método, restauração e reset ao substituir a lista. A forma pública de `state/actions` e os nomes dos callbacks permanecem iguais.
- **Arquivos:** `erp/src/pages/App/SalesOrder/hooks/useSalesOrderForm.ts`, novo `useOrderItemHandlingByDeliveryMethod.ts` e este inventário.
- **Revisão estática:** identidade por snapshot/produto/variação, fallbacks, preservação de serviços e composições, regra de responsável por montagem, ordem de hidratação e limpeza das chaves de erro foram conferidas; `NewSaleOrder`, `OrderEditModal` e referências dos testes existentes foram localizados. O hook principal ficou com 556 linhas e o novo hook tem 139; o catálogo permanece com 112 arquivos acima de 500 linhas. Nenhum teste foi executado; validação dinâmica pendente.

### 02/11/2026 — Extração da geração de resumos PDF de pedidos

- **Causa:** `ChatComposer.tsx` coordenava o formulário e envio do chat junto à classificação, formatação de valores e montagem do documento PDF de pedido/orçamento.
- **Solução:** classificação, formatação monetária e geração do blob foram movidas para `supportOrderSummaryPdf.ts`; o composer e o seletor mantêm as mesmas props e fluxos.
- **Arquivos:** `erp/src/pages/App/CustomerSupport/components/chat/ChatComposer.tsx`, novo `supportOrderSummaryPdf.ts` e este inventário.
- **Revisão estática:** classificador e formatador comparados ao baseline; corpo do PDF idêntico após normalizar a chamada do formatador. `ChatArea`, barrel `chat/index.ts`, seletor e referências de `ChatComposer` foram conferidos. O composer ficou com 1055 linhas, o helper tem 53 e a varredura segue com 112 arquivos acima do limite. Nenhum teste foi executado; validação dinâmica pendente.

### 02/11/2026 — Extração da apresentação e geração de PDF do catálogo

- **Causa:** `ProductCatalogPanel.tsx` reunia a seleção interativa e consultas ao catálogo com transformação de texto, links e geração de PDF com carregamento de imagens.
- **Solução:** tipo do item, formatação de preço/link e geração do documento foram movidos para `productCatalogPresentation.ts`; filtros, estado, confirmação, progresso e tratamento de falha seguem no painel.
- **Arquivos:** `erp/src/components/catalog/ProductCatalogPanel.tsx`, novo `productCatalogPresentation.ts` e este inventário.
- **Revisão estática:** blocos movidos e sua ordem foram comparados ao baseline; props, barrel `components/catalog/index.ts` e chamador em `ChatComposer` permanecem iguais. O painel ficou com 781 linhas, o módulo novo tem 120; a varredura identificou 113 arquivos acima de 500 linhas e incluiu `PaymentsTable/BodyRow.tsx` (535), que tem diff local preservado. Nenhum teste foi executado; validação dinâmica pendente.

## Validação e próximos passos

- Contagem de linhas conferida por leitura sequencial das extensões de texto/código. Nenhum teste foi executado.
- Antes de refatorar um candidato, confirmar o estado limpo do próprio arquivo, entender sua responsabilidade e localizar todos os chamadores. Arquivos fiscais, banco/schema, estoque e caminhos ERP/app seguem os gates específicos do `AGENTS.md`.
