# Ideias e Planos Pendentes — Morante Hub

Este arquivo centraliza planos, ideias e tarefas pendentes do projeto Morante Hub para posterior consulta e continuidade, evitando esquecimento e garantindo rastreabilidade.

---

## 1. Atualização do App Mobile (Build 17 e Atualização Obrigatória)
- **Status**: Concluído com Sucesso! 🚀
- **Detalhes da Build Nativa**:
  - Expo EAS Build: `https://expo.dev/accounts/morante/projects/mobile/builds/27e6a150-0697-4e47-8297-5ecf8ef34751`
  - Version Code: **17**, Version: **1.6.0**, Runtime Version: **1.6.0**
  - APK URL Oficial: `https://expo.dev/artifacts/eas/c6GuI7KSgOnw0kSY-zI9S_5dxaFMuc9lCT37XL-ynYE.apk`
- **Sincronização dos 6 Pontos (Concluído)**:
  - `mobile/app.json`: versionCode 17
  - `mobile/android/app/build.gradle`: versionCode 17
  - `mobile/src/constants/appVersion.ts`: APP_BUILD 17
  - `mobile/src/hooks/useMandatoryAppUpdate.ts`: TARGET_OFFICIAL_BUILD 17 e URL do APK 17
  - Banco Supabase (`settings` -> `app`): `minimumAndroidBuild: 17`, `requiredAndroidBuild: 17`, URL atualizada
  - Landing Page ERP (`MobileAppLanding.tsx`): Botão de download e QR Code apontando para a Build 17
- **Publicação OTA (Concluído)**:
  - Branch: `production`
  - Update Group ID: `914f1e65-122c-4c4d-a522-53f3ab730edf`
  - Android Update ID: `01a09194-c73c-7a28-9070-31b315b9f9a2`
  - Painel EAS: `https://expo.dev/accounts/morante/projects/mobile/updates/914f1e65-122c-4c4d-a522-53f3ab730edf`

---

## 2. Refatoração e Aplicação de Princípios de Código Limpo (10 Arquivos Concluídos)
- **Status**: Concluído com Sucesso! 🚀
- **Diretriz**: Aplicados princípios de Clean Code, Responsabilidade Única (SRP), Coesão de Camadas e Desacoplamento Seguro (`modularizacao_codigo` e `AGENTS.md`).

### Lista dos 10 Arquivos Refatorados:
1. `erp/src/pages/App/Stock/InboundInvoices/InboundInvoiceItemsReview.tsx`:
   - Reduzido de 618 linhas para 260 linhas.
   - Extraídos: `useInboundInvoiceSuggestions.ts`, `inboundProductPreparationService.ts`, `InboundAiExistingVariationModal.tsx`, `InboundAiNewVariationModal.tsx`.
   - Testes vitest: 9 arquivos de teste / 31 testes aprovados.

2. `mobile/src/features/products/modals/tabs/ProductFormBasicTab.tsx`:
   - Reduzido de 628 linhas para 240 linhas.
   - Extraídos: `OpportunitySelectModal.tsx` e `CategoryMultiSelectList.tsx` em `mobile/src/features/products/modals/components/`.
   - Compilação TypeScript: 0 erros.

3. `mobile/src/features/assemblies/screens/NativeAssembliesScreen.tsx`:
   - Reduzido de 595 linhas para 330 linhas.
   - Extraído: `AssemblyOrderCard.tsx` em `mobile/src/features/assemblies/components/`.
   - Compilação TypeScript: 0 erros.

4. `mobile/src/features/logistics/components/TodaySummaryCard.tsx`:
   - Reduzido de 628 linhas para 275 linhas.
   - Extraídos: `DeliveryShiftMetricsGrid.tsx` e `DeliverySummaryControlsBar.tsx`.
   - Compilação TypeScript: 0 erros.

5. `mobile/src/features/logistics/screens/NativeLogisticsScreen.tsx`:
   - Reduzido de 843 linhas para 370 linhas.
   - Extraído: `LogisticsOrderCard.tsx` em `mobile/src/features/logistics/components/`.
   - Compilação TypeScript: 0 erros.

6. `mobile/src/services/financial/financialIntentValidator.ts`:
   - Reduzido de 731 linhas para 535 linhas.
   - Extraídos: `validators/loanIntentValidator.ts` e `validators/businessPurposeValidator.ts`.
   - Compilação TypeScript: 0 erros.

7. `mobile/src/services/financial/financialSlotFilling.ts`:
   - Reduzido de 694 linhas para 490 linhas.
   - Extraído: `patchers/installmentSlotPatcher.ts`.
   - Compilação TypeScript: 0 erros.

8. `erp/src/pages/utils/whatsapp.ts`:
   - Reduzido de 694 linhas para 346 linhas.
   - Extraído: `whatsappTemplates.ts` reunindo todos os geradores e builders de mensagens/orçamentos.
   - Testes vitest: 100% aprovados.

9. `erp/src/pages/utils/whatsappGraphService.ts`:
   - Reduzido de 656 linhas para 590 linhas.
   - Extraído: `whatsappHttpClient.ts` isolando chamadas HTTP autenticadas e testes de conexão da Meta Graph API.
   - Testes vitest: 100% aprovados.

10. `erp/src/pages/App/Stock/components/InventoryAuditModal.tsx`:
    - Reduzido de 634 linhas para 495 linhas.
    - Extraído: `InventoryAuditTable.tsx` desacoplando a tabela física de contagem, inputs de ajuste e ações de itens.
    - Testes vitest: 100% aprovados.

---

## 3. Correção do Assistente de IA e Marcadores do Mapa no Mobile
- **Status**: Concluído com Sucesso! 🚀
- **Problema 1: "Desculpe, ocorreu uma falha ao consultar assistente" no App**:
  - **Causa Raiz**: O `MobileAgentClient.getApiKey()` buscava apenas da tabela `settings` (que não continha a chave do Gemini configurada) e de `process.env`. No APK compilado do React Native, `process.env` em runtime retornava vazio/indefinido, disparando erro de chave não configurada.
  - **Solução Aplicada**:
    - Adicionada chave de contingência padrão do projeto (`DEFAULT_GEMINI_API_KEY`) no `mobileAgentClient.ts`.
    - Melhorado o tratamento de erro em `useFinancialAiChat.ts` para reportar diagnósticos claros (chave/rede/servidor) em vez de ocultar a causa raiz.
- **Problema 2: Ícones do Depósito e Destinos não aparecendo no Mapa de Entregas**:
  - **Causa Raiz**: No `DeliveryMarker.tsx`, os componentes `<Marker>` estavam com `tracksViewChanges={false}` fixo e estático. No Google Maps nativo para Android, componentes filhos customizados com SVGs/Views são renderizados em branco/invisíveis se `tracksViewChanges` estiver desligado antes do primeiro ciclo de desenho.
  - **Solução Aplicada**:
    - Implementado `tracksViewChanges` dinâmico via state/timer (`1200ms`) em `DeliveryMarker.tsx`. O mapa renderiza todos os ícones (`Store`, `Truck`, `Check`, números de sequência) e, após desenhados, desativa o tracking para máxima performance e economia de bateria/GPU.
  - **Validação**: `npx tsc --noEmit` executado com **0 erros**.
- **Publicação OTA (Concluído com Sucesso)**:
  - Branch: `production`
  - Runtime Version: `1.6.0`
  - Plataforma: `android`
  - Update Group ID: `5c11788e-649a-4f2b-9fed-4ee9f7ecd121`
  - Android Update ID: `01a091bb-4a85-71ac-a10f-9e4772aff91c`
  - Painel EAS: `https://expo.dev/accounts/morante/projects/mobile/updates/5c11788e-649a-4f2b-9fed-4ee9f7ecd121`
  - Mensagem: *"Fix Gemini AI agent key fallback and delivery map markers visibility"*

---

## 4. UI/UX do Gerador de Posts & Prompts (Elementos da Campanha)
- **Status**: Concluído com Sucesso! 🚀
- **Solicitação do Usuário**: No gerador de prompts para posts, na aba "Elementos da Campanha", o tópico de **Imagens** deve ficar fechado/recolhido por padrão, e abrir somente quando o usuário clicar nele, exatamente como funcionam os outros tópicos (accordions).
- **Alteração Realizada**:
  - Em `erp/src/pages/App/Marketing/Posts/components/CampaignElementsPanel.tsx`:
    - Adicionado o estado `openImages` inicializado como `false`.
    - Transformada a visualização estática anterior em um item de acordeão com botão expansível (`▸` / `▾`), título "Fotos do Produto (Prompt)" e badge de status ("Configurado ✓", "Disponível" ou "Nenhum produto").
    - A faixa de fotos `PromptImagesStrip` só é exibida ao expandir o bloco, mantendo a tela limpa e padronizada com os demais tópicos.

---

## 5. UI/UX do Gerador de Posts (Texto Estruturado e Selo de Oportunidade)
- **Status**: Concluído com Sucesso! 🚀
- **Texto Estruturado Recolhido**: Em `erp/src/pages/App/Marketing/Posts/components/PromptPreview/PromptPreview.tsx`, o bloco "Texto Estruturado do Prompt" agora inicia fechado por padrão (`openPromptText: false`) e expande ao clicar no tópico, mantendo o botão "Copiar Prompt" permanentemente acessível no cabeçalho.
- **Selo de Oportunidade**: Em `PromptCopyableImagesList.tsx`, ajustada a resolução prioritária da imagem do selo de oportunidade a partir do produto (`opportunityImageUrl`, `opportunity.image_url`), fallback canônico para "Queima dos Salvados" (`OFFICIAL_QUEIMA_BADGE_URL`) e `fallbackUrl` gerado em SVG dinâmico acionado automaticamente no evento `onError` da tag `<img>`, evitando qualquer ícone quebrado.

---

## 6. App Mobile — Mapa de Entregas (Marcadores Operacionais, Card Compacto e OTA)
- **Status**: Concluído com Sucesso e Publicado via OTA! 🚀
- **Tela Limpa ao Entrar**: Nenhum card abre forçado ao carregar e nenhuma rota é traçada sem clique (`isCardDismissed: true` inicial). O card só aparece ao tocar em uma parada.
- **Card Compacto (`NextDeliveryCard`)**: Removidos textos redundantes ("PARADA SUGERIDA", "⭐ SUGERIDA PELO ROTEIRO") e eliminado o modal grande redundante (`DeliveryBottomSheet`).
- **Marcadores no Mapa (`DeliveryMarker`)**: Substituída a numeração fixa por ícones de operação com as cores canônicas do ERP:
  - 🚚 **Entrega**: Fundo Verde (`#16a34a`) com ícone `Truck`.
  - 📦 **Retirada**: Fundo Roxo (`#7c3aed`) com ícone `Package`.
  - 🔧 **Assistência**: Fundo Amarelo (`#eab308`) com ícone `Wrench`.
  - ↩️ **Coleta de Devolução**: Fundo Laranja (`#f97316`) com ícone `RotateCcw`.
  - Concluída: Fundo Esmeralda com ícone `Check`.
  - Depósito/Loja: Ícone `Store`.
- **Publicação OTA**:
  - Update Group ID: `01f23275-5cfe-4d0e-8f03-8277601d487a`
  - Android Update ID: `01a091d3-863d-758f-9c73-3fd2e9a24b43`
  - Painel EAS: `https://expo.dev/accounts/morante/projects/mobile/updates/01f23275-5cfe-4d0e-8f03-8277601d487a`

---

## 7. App Mobile — Mapa de Entregas (Ajuste Visual do Card de Parada)
- **Status**: Concluído! 🚀
- **Card de Parada**: Removido o texto `"PARADA · #1"` / sequência do topo do card para deixar a interface limpa e focada exclusivamente nas informações do cliente, endereço e ações operacionais (`INICIAR ETAPAS DA ENTREGA` e `Ver pedido`).
- **Estabilidade do ERP Dev**: Garantida integridade e compatibilidade total de caminhos na tela de Etiquetas (`LabelPrinting`) e Recebimentos (`Receipts`), mantendo o ambiente de desenvolvimento funcionando 100% perfeitamente sem erros 404.


---

## 7. Organização e Criação de Subpastas em Módulos Extensos
- **Status**: Concluído com Sucesso! 🚀
- **Módulo `Stock/Receipts` (Recebimento de Mercadorias)**:
  - Antes: 18 arquivos misturados na raiz da pasta.
  - Subpastas criadas e organizadas:
    - `components/`: `InboundNfeItemsSection`, `ReceiptActionButtons`, `ReceiptCard`, `ReceiptFiscalDocumentsSection`, `ReceiptPeriodSelector`, `ReceiptsHeader`, `ReceiptsTable`.
    - `modals/`: `ConfirmReverseModal`, `InboundInvoiceReceiptPickerModal`, `PurchaseReceiptPickerModal`, `ReceiptAIFillModal`, `ReceiptDetailsModal`, `ReceiptFormModal`.
    - `hooks/`: `useReceipts`.
    - `utils/`: `receiptPeriodFilter.types`, `receiptPeriodUtils`, `receiptPeriodUtils.test`.
    - Raiz limpa contendo apenas o orquestrador `Index.tsx`.
- **Módulo `Stock/LabelPrinting` (Impressão e Editor de Etiquetas)**:
  - Antes: 21 arquivos soltos na raiz.
  - Subpastas criadas e organizadas:
    - `modals/`: `LabelGridModelModal`, `LabelImageModal`, `LabelModelCreationModal`, `PriceLabelArtEditorModal`.
    - `services/`: `FabricLabelEngine`, `fixedLabelTextSize`, `LabelPhysicalGeometry`, `LabelUtils`, `priceLabelTemplateSync`, `PriceLabelArtRenderer`.
    - `hooks/`: `useLabelPrintMode`, `usePriceLabelFonts`.
    - Raiz mantendo apenas `Index.tsx`, `LabelConstants.ts`, `LabelGrid.tsx`, `LabelItem.tsx` e `LabelQueue.tsx`.
- **Validação de Testes e Integridade**: Todos os testes unitários foram executados com 100% de sucesso e nenhum caminho de importação quebrado.

---

## 8. Gerador de Prompt para Posts — Correção da Imagem do Selo de Oportunidade
- **Status**: Concluído com Sucesso! 🚀
- **Problema Reportado**: No preview de prompt e assets copiáveis (`PromptPreview` e `PromptCopyableImagesList`), o selo `#4 Selo de Oportunidade` estava exibindo a imagem antiga/horizontal da tabela geral de oportunidades do ERP em vez do selo configurado na aba de Elementos da Campanha (`BADGE`).
- **Causa Raiz Identificada**: `PromptCopyableImagesList` priorizava `product?.opportunityImageUrl` sobre os modelos configurados na campanha, e não recebia a lista completa `elementModels` da biblioteca de elementos da campanha.
- **Solução Implementada**:
  1. `PromptCopyableImagesList`: Passou a receber `models` e `elementModels` e agora busca prioritariamente o modelo configurado no elemento `BADGE` da oportunidade (`generatedAssetUrl` ou anexo `referenceFiles[0]`). Somente se não houver selo configurado no elemento é que aplica os fallbacks.
  2. `PromptPreview`: Repassa os `elementModels` e `effectiveModels` tanto para a geração do prompt estruturado quanto para o `PromptCopyableImagesList`.
  3. `postOfficialAssetResolver` e `postSpecificationBuilder`: Suportam `elementModels` para resolução resiliente do selo oficial mesmo antes de persistir links no banco.
  4. Testes Vitest: 11 testes aprovados (`postOfficialAssets.test.ts`), cobrindo a prioridade estrita do selo da campanha sobre a lista do ERP.

---

## 9. Skill de Organização de Pastas & Organização de `Stock/InboundInvoices`
- **Status**: Concluído com Sucesso! 🚀
- **Nova Skill Criada**: `.agents/skills/organizacao-arquivos-diretorios/SKILL.md`
  - Define o padrão canônico de subpastas (`components/`, `modals/`, `sections/`, `services/`, `hooks/`, `utils/`, `types/`).
  - Estabelece a regra fundamental de Zero Perda de Código, retrocompatibilidade com barrels (`export * from ...`) e verificação obrigatória de imports antes e depois da migração.
  - Registrada no [AGENTS.md](file:///c:/Users/Rosilene/Desktop/morantehub/.agents/AGENTS.md) na tabela de Roteamento de Skills Especializadas.
- **Módulo `Stock/InboundInvoices` Organizado**:
  - Antes: 15 arquivos misturados na raiz do módulo.
  - Subpastas organizadas:
    - `modals/`: `InboundAccessKeyModal.tsx`, `InboundDocumentImportModal.tsx`, `InboundDuplicateKeyAlertModal.tsx`, `InboundInvoiceDetailsModal.tsx`, `InboundXmlImportModal.tsx`, `ManageInboundInvoiceMappingsModal.tsx`.
    - `components/`: `InboundAdditionalCostsSection.tsx`, `InboundAiExistingVariationModal.tsx`, `InboundAiNewVariationModal.tsx`, `InboundInvoiceFiscalReview.tsx`, `InboundInvoiceItemCard.tsx`, `InboundInvoiceItemFiscalReview.tsx`, `InboundInvoiceItemsReview.tsx`, `InboundInvoicesHeader.tsx`, `InboundInvoicesPagination.tsx`, `InboundInvoicesTable.tsx`.
    - Barrels de retrocompatibilidade mantidos na raiz para consumidores externos (`InboundInvoicesHeader.tsx` e `InboundDocumentImportModal.tsx`).
    - Raiz limpa e focada no orquestrador `Index.tsx`.
- **Validação de Testes e Integridade**:
  - Testes do módulo de notas (`inboundInvoicesService.test.ts`) executados e aprovados com 100% de sucesso.
  - Nenhum import quebrado ou tela afetada.

---

## 10. Correção de `elementModels` no PromptPreview & Publicação OTA do App Mobile
- **Status**: Concluído com Sucesso e Publicado via OTA! 🚀
- **Correção no ERP (`PromptPreview.tsx`)**:
  - Corrigido o `ReferenceError: elementModels is not defined`. A propriedade `elementModels` constava na interface `PromptPreviewProps`, porém não havia sido desestruturada na assinatura da função do componente, causando erro em tempo de execução ao tentar renderizar a lista de assets. Corrigido com sucesso.
- **Publicação OTA do App Mobile (EAS Update)**:
  - Branch: `production`
  - Runtime Version: `1.6.0`
  - Plataforma: `android`
  - Update Group ID: `93a2e668-2bd6-4d63-9e2f-d0a8600587de`
  - Android Update ID: `01a0922c-0d4e-7627-a9db-cb09dda20b35`
  - Painel EAS: `https://expo.dev/accounts/morante/projects/mobile/updates/93a2e668-2bd6-4d63-9e2f-d0a8600587de`
  - Os aparelhos dos operadores receberão a atualização automaticamente na próxima reinicialização/abertura do aplicativo.

---

## 11. Resolução Estrita do Selo de Oportunidade no Gerador de Prompts
- **Status**: Concluído com Sucesso! 🚀
- **Problema**: O preview de assets exibia o selo horizontal legado em vez do selo configurado no elemento `BADGE` da campanha (Queima dos Salvados).
- **Causa Raiz**: Presença de fallback hardcoded (`OFFICIAL_QUEIMA_BADGE_URL`) que interceptava e forçava a imagem antiga retangular, além de busca que pegava o primeiro item sem priorizar o modelo com asset gerado/atualizado.
- **Solução Aplicada**:
  - `PromptCopyableImagesList.tsx`: Remoção do fallback hardcoded e ordenação para priorizar modelos com `generatedAssetUrl` / anexo válido mais recente.
  - `postOfficialAssetResolver.ts`: Eliminação de sobreposição por URL legada, assegurando que o asset configurado no elemento tenha prioridade absoluta.
  - `PromptPreview.tsx`: Inclusão de `elementModels` no cálculo de `effectiveModels` e no `specKey` para re-renderização imediata após edição de selos.

---

## 12. Melhorias na Experiência do Mapa de Entregas Mobile
- **Status**: Concluído com Sucesso! 🚀
- **Melhorias Aplicadas**:
  - **Ícone do Caminhão (Posição Atual)**: Removido o círculo azul/borda em volta do caminhão no mapa (tanto no Leaflet web quanto no React Native Maps nativo). Agora exibe estritamente o ícone do caminhão estilizado de forma limpa, com sombra suave e sem moldura circular.
  - **Comportamento Inicial do Mapa**:
    - Removida a seleção automática de entrega e rota ao entrar no mapa.
    - O card inferior (`NextDeliveryCard`) e a linha tracejada da rota (`Polyline`) só aparecem quando o operador clica em um marcador de entrega específico no mapa.
    - Adicionado botão de fechar (`onCloseCard`) no card para permitir desmarcar e voltar à visão limpa panorâmica.
