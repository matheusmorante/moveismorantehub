# Histórico de correções — 15/10/2026

## Formulário de produto: contrato compartilhado e submissão

- **Problema identificado:** o schema utilizado pelo cadastro com aba fiscal aceitava variações com `z.any()` e não validava números do produto. O handler de salvar liberava o resolver antes de chamar o serviço e remontava as variações usando o estado bruto. Os botões de rascunho e conclusão usavam instâncias distintas, permitindo duas intenções manuais simultâneas.
- **Causa comprovada:** `createProductFormSchema` declarava somente campos básicos/fiscais e `variations: z.array(z.any())`; `useProductFormSubmit` retornava os dados do callback de validação e só depois persistia. O payload normalizado sobrescrevia `validatedData.variations` com `formData.variations`.
- **Solução:** reutilizados os campos numéricos e o contrato de variação já existente em `productVariationDraftSchema`. No agregado, campos da variação são opcionais para preservar rascunhos incompletos; valores presentes são validados, e metadados existentes são preservados. Regras contextuais de conclusão e regras fiscais de fornecedor/NCM permanecem como estavam. O serviço recebe o agregado parseado, incluindo as variações; uma trava comum protege as duas intenções manuais e o resolver acompanha a gravação. Erros de rascunho ficam visíveis; erro no conteúdo de uma variação não é apresentado como ausência de variações.
- **Concorrência com autosave:** a submissão manual pausa novos rascunhos, descarta a fila ainda não iniciada, aguarda a gravação em andamento e reaproveita sua identidade/versão. Depois de concluir, chamadas atrasadas não reescrevem o cadastro como rascunho. Ao salvar manualmente um rascunho ou ocorrer falha, o autosave volta a ser permitido; reabrir o formulário reinicia o bloqueio. A versão devolvida também atualiza o estado do formulário. Não houve mudança de tributação, XML, transmissão ou banco.
- **Arquivos e linhas:** `shared-utils/productDomainValidation.ts:2–8`, `:22–23`, `:44`; `erp/src/pages/App/Products/hooks/form/useProductFormSubmit.ts:2`, `:12–13`, `:24`, `:54–262` (escopo do handler, preservando a lógica contextual existente); `erp/src/pages/App/Products/hooks/form/useProductFormDraft.ts:30`, `:35–40`, `:49`, `:126–147`; testes em `erp/src/pages/App/Products/hooks/form/useProductFormSubmit.test.tsx:2`, `:7–9`, `:53–125` e `erp/src/pages/App/Products/hooks/form/useProductFormDraft.test.tsx:19–30`.
- **Validação:** a rodada consolidada passou em 103 testes em 16 arquivos (`scratch/rhf-all-form-owners-2026-10-15.log`), incluindo 18 de submissão e quatro de rascunho de produto. As provas conjuntas aguardam criação lenta, concluem o mesmo ID com o preço atual, bloqueiam reescrita posterior e permitem autosave depois de salvar rascunho ou falhar a gravação manual. Lint focado sem erros; typecheck fiscal passou. Compilação e diagnósticos globais da última rodada são registrados abaixo. Esta seção não declara conclusão da auditoria de domínio ou do emissor. Serviços simulados, sem gravação comercial/fiscal remota.

Estado geral e inventário de formulários: [migração RHF + zodResolver](../forms/migracao-rhf-zod-2026-10-14.md). As pendências fiscais continuam no [índice vigente](README.md) e no histórico de [14/10](historico-correcoes-2026-10-14.md).

## Imports dos modais de pedidos

- **Problema e causa comprovada:** a compilação ERP falhou ao resolver `../../utils/returnPolicy` a partir de `SalesOrder/hooks/useSalesOrderModals.ts`. O hook estava usando caminhos relativos correspondentes ao diretório anterior; seis imports de utilitários, preparação fiscal e tipos/serviço de devolução apontavam para diretórios incorretos.
- **Solução:** utilitários passaram a usar o alias existente `@/pages/utils`; os imports do módulo `FiscalDocuments` apontam dois níveis acima de `hooks`. Nenhuma política de devolução, ambiente, confirmação ou transmissão foi alterada.
- **Arquivo e linhas:** `erp/src/pages/App/SalesOrder/hooks/useSalesOrderModals.ts:6`, `:7`, `:8`, `:9`, `:10`, `:14`.
- **Prova:** os três testes de importação/ações do hook e dois da política de devolução passaram (`scratch/rhf-sales-order-imports-tests.log`). Preservam elegibilidade de devolução comercial, seleção de ambiente, confirmação posterior no modal e bloqueio de preparação duplicada; nenhuma transmissão é feita. Compilação completa ERP passou em `scratch/rhf-erp-build-product-label.log` após o ajuste, antes da continuação de pessoas/cancelamento. Lint do hook/teste sem erros e com um aviso. Teste adicionado em `erp/src/pages/App/SalesOrder/hooks/useSalesOrderModals.test.tsx:1–59`. Nenhuma chamada remota foi utilizada.

## Formulário de cancelamento fiscal: resolver durante a operação

- **Problema e causa comprovada:** `useFiscalCancelModal.handleConfirmCancel` validava retornando somente os dados do callback e liberava a trava antes de executar `executeFiscalCancellation`. O formulário possui contratos distintos para cancelamento e abertura de estorno fiscal; suas travas não eram compartilhadas durante a operação.
- **Solução:** o callback do resolver engloba execução, feedback e atualização da lista. Uma trava síncrona comum protege as duas intenções e é liberada inclusive em validação inválida ou falha de serviço. Justificativa, confirmação por operação de Produção, elegibilidade contextual e idempotência do backend permanecem preservadas. Não foi inserido ou alterado nenhum campo em snapshots fiscais.
- **Arquivos/linhas:** `erp/src/pages/App/FiscalDocuments/hooks/useFiscalCancelModal.ts:1`, `:26`, `:36`, `:55`, `:64–139`; regressão em `erp/src/pages/App/FiscalDocuments/__tests__/fiscalOperationForms.test.tsx:200–223`.
- **Validação:** os 13 testes de `fiscalOperationForms.test.tsx` passaram (`scratch/rhf-fiscal-cancel-owner-tests.log`). A regressão mantém uma única chamada enquanto o serviço aguarda, bloqueia trocar o documento/acionar estorno simultâneo e permite tentar novamente depois da falha. Os testes existentes preservam justificativa Unicode, confirmação explícita para cancelamento de Produção e ausência dessa confirmação para somente preparar estorno. Nenhuma nota foi transmitida/cancelada nem pedido alterado remotamente; o serviço é simulado.

## Cadastro de pessoas: submissão e consultas auxiliares

- **Problema e causa comprovada:** o formulário de cliente/fornecedor/colaborador liberava o resolver antes das consultas de duplicidade e da persistência; consultas usavam estado bruto, enquanto somente o salvamento principal usava o resultado parseado. As buscas por e-mail e CEP tinham validação manual independente e podiam aplicar uma resposta antiga depois de o campo mudar. Falhas de consulta antes do `try` do salvamento escapavam do tratamento visual.
- **Solução:** o callback RHF cobre consultas, persistência e sincronização já existentes, com campos parseados. Consultas auxiliares usam contratos próprios: e-mail reaproveita o campo do schema de autenticação, e CEP preserva a normalização e os oito dígitos já exigidos. As consultas liberam o resolver antes do I/O e ignoram respostas obsoletas por revisão/identidade do campo. Falhas têm feedback visível. Regras de CPF/CNPJ, IE, destinatário, papéis, permissões e identificação de artefatos de teste permanecem preservadas.
- **Arquivos/linhas:** `shared-utils/lookupFormSchemas.ts:4–9`; `erp/src/pages/App/Registrations/shared/modals/personForm/usePersonForm.ts:24`, `:129–132`, `:190–226`, `:361–381`, `:402–497`; testes em `erp/src/pages/App/Registrations/shared/modals/personForm/usePersonForm.test.tsx:1–105`.
- **Validação:** cinco testes do proprietário e seis do schema existente passaram (`scratch/rhf-person-owner-tests.log`). Cobrem bloqueio antes de consultar, prazo parseado, criação concorrente, recuperação após erro, e-mail parseado e descarte de resposta antiga de CEP. Não há alteração de banco, XML, transmissão ou fato fiscal.

## Verificação consolidada

### Continuação: operações do rascunho fiscal

- **Problema e causa comprovada:** `useNfeOperationDraft` tinha três instâncias de formulário (preparação, revisão e transmissão), mas retornava os dados parseados e liberava cada resolver antes do serviço. Duas intenções podiam sobrepor gravação da revisão e transmissão do mesmo rascunho.
- **Solução:** cada callback agora engloba sua operação completa, inclusive carregamento do rascunho preparado. Uma trava síncrona comum impede sobreposição entre as três intenções e é liberada em validação inválida/falha. Contratos, XMLs fornecidos, ambiente, confirmação de Produção e decisões de consulta/retry do backend permanecem preservados; não há retry automático ou alteração de snapshot.
- **Arquivos:** `erp/src/pages/App/FiscalDocuments/hooks/useNfeOperationDraft.ts`; regressões no arquivo existente `erp/src/pages/App/FiscalDocuments/__tests__/fiscalOperationForms.test.tsx`. Linhas exatas no levantamento do diff abaixo.
- **Prova:** 16 testes no arquivo fiscal passaram; a rodada consolidada atualizou o resultado para 103 testes em 16 arquivos (`scratch/rhf-all-form-owners-2026-10-15.log`). A prova do proprietário mantém uma única preparação, bloqueia transmissão enquanto salva revisão e bloqueia duplicidade/edição durante transmissão pendente. O resultado incerto não aciona callback de autorização nem reenvio automático. Lint dos arquivos fiscais sem erros ou avisos (`scratch/rhf-fiscal-draft-owner-lint.log`). Serviços simulados, sem transmissão SEFAZ.

103 testes em 16 arquivos passaram; compilação completa ERP passou em `scratch/rhf-erp-build-person-cancel-final.log`, incluindo startup fiscal/WASM/XSD. Typecheck fiscal passou em `scratch/rhf-person-cancel-fiscal-tsc.log`. O TypeScript global continua reprovado fora deste lote, sem diagnósticos dos arquivos alterados nesta continuação (`scratch/rhf-person-cancel-tsc.log`). Lint focado sem erros; avisos existentes estão nos logs `rhf-product-label-lint`, `rhf-person-cancel-lint` e `rhf-sales-order-imports-lint`. Nenhum teste realizou gravação remota ou transmissão SEFAZ. A migração global de formulários e a prontidão fiscal ponta a ponta continuam abertas.

## Continuação: submissão das devoluções e importação de XML

- **Problema e causa comprovada:** os dois modais de devolução encerravam o callback do resolver antes de salvar e utilizavam novamente estado não parseado para coleta/observações; o modal vinculado também ignorava os itens retornados pelo resolver. A importação validava a nota, mas soltava a proteção antes de consultar/gravar; arquivo e texto não passavam por RHF antes da leitura/interpretação, e dois caminhos podiam iniciar no mesmo ciclo de renderização.
- **Solução aplicada:** callbacks do resolver abrangem montagem e gravação. Os schemas de devolução descrevem agendamento e observações, mantendo agendamento vazio permitido nesta migração e preservando as regras existentes de status/estoque/transmissão. A nota de entrada, o fornecedor e os vínculos de itens derivam do resultado parseado; schemas próprios de arquivo XML e texto executam antes da leitura/parser. Uma referência síncrona comum protege arquivo e texto durante toda a importação, inclusive erros e duplicidade.
- **Arquivos:** shared-utils/returnFormSchemas.ts; shared-utils/fileFormSchemas.ts; erp/src/pages/App/SalesOrder/OrderActions/ReturnOrderModal.tsx; erp/src/pages/App/SalesOrder/modals/UnlinkedReturnOrderModal.tsx; erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundDocumentImport.ts. Linhas e testes serão registrados após a validação.
- **Limites:** sem alteração de RPC, migration, snapshot fiscal ou política de Produção. Nenhuma consulta externa real, gravação comercial remota ou transmissão SEFAZ executada. A divergência preexistente do texto de recebimento em loja versus status da devolução sem vínculo fica para a auditoria de regra comercial; não foi alterada por suposição.
- **Validação:** 87 testes em dez arquivos aprovados em scratch/rhf-returns-import-regression.log, incluindo 14 do modal vinculado, quatro do sem vínculo, quatro do campo filho de quantidade e 12 da importação. Lint ERP: zero erros e um aviso preexistente do efeito de importação. TypeScript global reprova fora dos arquivos desta rodada, sem diagnósticos dos proprietários/contratos alterados. Build ERP completo aprovado, incluindo startup fiscal/XSD, em scratch/rhf-erp-build-returns-import.log. Não representa conclusão global dos formulários ou do sistema fiscal.

- **Correção adicional na mesma rodada:** ReturnItemsSelection truncava quantidade decimal com parseInt e convertia vazio/zero em 1; ReturnOrderModal descartava NaN/zero antes do resolver. Agora entradas inválidas permanecem editáveis/selecionadas, quantidades decimais chegam intactas ao proprietário e o resolver rejeita a linha inválida antes de qualquer salvamento. Os botões de incremento/decremento mantêm os limites anteriores. Arquivos: ReturnItemsSelection.tsx e seu novo teste; ReturnOrderModal.tsx e teste de seleção com duas linhas.

## Entradas alternativas de importação e chave alfanumérica na persistência

- **Causa comprovada:** os modais de chave/XML/consulta direta encerravam a validação antes da operação, e o scanner usava apenas safeParse. A leitura de arquivo do modal XML não executava resolver. Além disso, o caminho ativo inboundInvoicesService → inboundInvoicesMutationService / inboundInvoicesQueryService ainda removia letras da chave com replace(/\D/g, ''), apesar de o formulário aceitar e normalizar a chave completa.
- **Correção:** os callbacks RHF acompanham as operações, inclusive scanner. A leitura XML valida File antes de text(), ignora resultado de uma abertura anterior e divide a trava síncrona com a importação de texto. Consulta direta protege arquivo e consulta nos dois sentidos, preservando confirmação de Ciência da Emissão e ambiente da reconsulta. Os serviços ativos de gravação, duplicidade, exclusão por chave e marcação de recebimento reutilizam normalizeFiscalIdentifier, preservando letras; as chamadas SQL continuam parametrizadas pelo cliente. Nenhum serviço Supabase foi chamado de verdade.
- **Arquivos:** InboundAccessKeyModal.tsx, InboundXmlImportModal.tsx, InboundDocumentImportModal.tsx, useInboundDocumentImport.ts; inboundInvoicesMutationService.ts e inboundInvoicesQueryService.ts. Linhas e testes abaixo após a validação.
- **Limites:** não altera política preexistente de cache offline/fallback nem reconstitui registros históricos já truncados. Não houve exclusão real, manifestação, transmissão, DDL ou alteração de Produção. As cópias antigas inboundMutationsService/inboundQueriesService não têm consumidores na busca estática realizada e não foram ativadas ou modificadas.
- **Validação:** 12 testes dos três modais e cinco do gateway ativo aprovados, além das regressões anteriores; rodada consolidada 106 testes em 13 arquivos (scratch/rhf-returns-inbound-final-tests.log). Lint final dos proprietários e serviços: zero erros e um aviso preexistente (scratch/rhf-returns-inbound-final-lint.log). TypeScript global segue com erros fora deste lote; não há diagnósticos dos arquivos modificados em scratch/rhf-returns-inbound-final-tsc.log após corrigir o fixture do teste. Build ERP completo aprovado em scratch/rhf-erp-build-returns-inbound-final.log, incluindo startup fiscal/XSD. Os últimos ajustes de fixture e scanner também passaram em 17 testes focados (scratch/rhf-inbound-last-adjustment.log).

## Salvamento intermediário de variação no formulário de produto

- **Causa comprovada:** handleSaveVariation em useProductFormModal validava os campos e encerrava o callback antes de persistir a variação ou o agregado de rascunho. Duas chamadas concorrentes eram aceitas; os dois testes de operação pendente (produto cadastrado e rascunho) falharam no código anterior em scratch/rhf-variation-parent-before.log.
- **Correção:** o callback do resolver agora engloba checagem de SKU, montagem do agregado e gravação. Retorna false quando a validação/operação falha ou há concorrência, preservando a retomada. useVariationForm já mantinha o callback ativo; seu payload agora deriva exclusivamente dos valores parseados, inclusive fallback de SKU, sem reintroduzir campos do estado original.
- **Arquivos:** erp/src/pages/App/Products/hooks/form/useProductFormModal.ts, erp/src/pages/App/Products/hooks/variation/useVariationForm.ts, teste novo useProductFormModal.variation.test.tsx e testes do proprietário de variação. As regras existentes de variação única, dados herdados, fiscal, SKU e rascunho/finalização foram preservadas; nenhum dado remoto foi gravado.
- **Validação:** 19 testes dos proprietários de variação aprovados, com dois testes de concorrência que falhavam no código anterior; regressão de produtos/categorias/adapter passou em 68 testes. Foram separados os contratos de variação única herdada e independente incompleta. Serviços simulados; lint zero erros/três avisos preexistentes. Linhas exatas no anexo.

## Seleção de fotos já existentes no produto pai

- **Causa comprovada:** VariationParentImagesSelectModal confirmava a seleção diretamente, sem executar resolver. Esse modal de botões não aparecia no censo de inputs nativos, demonstrando que o censo não é prova de completude.
- **Correção:** schema explícito compartilhado valida identidade não vazia, limite configurado, ausência de duplicatas e pertencimento às fotos disponíveis. Confirmação usa o resultado parseado e conserva a trava até concluir o callback; falha apresenta erro e mantém o modal aberto. Seleção vazia continua permitida para desvincular todas as fotos.
- **Arquivos:** shared-utils/productImageFormSchemas.ts; erp/src/pages/App/Products/components/modals/variations/VariationParentImagesSelectModal.tsx; teste novo do modal. Nenhum upload, Storage ou dado remoto foi acionado.
- **Validação:** sete testes do modal/contrato e dois de regressão do filho de fotos aprovados; lint sem erros/avisos. Não executa upload remoto. Linhas exatas no anexo.

- **Verificação final dos proprietários de variações/fotos:** build ERP completo aprovado, incluindo startup fiscal/XSD (scratch/rhf-erp-build-variation-category.log). TypeScript global reprova fora dos arquivos desta rodada; nenhum diagnóstico destes proprietários, contratos e testes no relatório scratch/rhf-variation-category-photo-tsc.log. Provas locais, sem escrita comercial remota.

## Intenções assistidas de descrição e cadastro inline de valores

- **Causa comprovada:** VariationDescriptionTab e VariationTechnicalDescriptionSection chamavam improveProductDescription sem resolver; VariationAttributeValueInput encerrava o callback de validação antes de saveAttributeValue. O callback de cadastro poderia executar duas vezes antes da atualização do estado React.
- **Correção:** schema explícito de descrição compartilha campos de texto, medidas/peso canônicos e valores técnicos dinâmicos (tipos escalares/listas já suportados). As duas intenções assistidas executam RHF antes da chamada e usam os valores parseados; título vazio/números inválidos bloqueiam o efeito. O resolver do cadastro inline acompanha a gravação e atualização dos callbacks; erro preserva entrada e permite retomar.
- **Arquivos:** shared-utils/productAiFormSchemas.ts; VariationDescriptionTab.tsx; VariationTechnicalDescriptionSection.tsx; VariationAttributeValueInput.tsx e seus testes. Campos editáveis normais permanecem no proprietário useVariationForm; nenhuma chamada real à IA ou gravação remota foi autorizada/executada nesta rodada.
- **Validação:** 52 testes em oito arquivos aprovados (scratch/rhf-variation-assisted-regression.log), incluindo dez das intenções assistidas e seis do cadastro inline. Lint sem erros/avisos. TypeScript global reprova fora dos arquivos alterados, sem diagnóstico deste lote em scratch/rhf-variation-assisted-tsc.log. O teste DOM do cadastro inline passou a usar happy-dom pois jsdom falhava antes de executar por falta do binário opcional de canvas; não há uso de canvas neste componente. Linhas exatas no anexo; build ERP completo aprovado (scratch/rhf-erp-build-variation-assisted.log), incluindo startup fiscal/XSD.

## Proprietário das sugestões assistidas do produto

- **Causa comprovada:** useProductFormAi não executava RHF nas sete intenções de categoria/combo/textos/título/fiscal/aperfeiçoamento/preços. Guardas parciais não impediam números não finitos, canal inválido ou duas chamadas antes da atualização React. Falhas em parte dos caminhos eram apenas registradas no console. Aperfeiçoamento aceitava nome alternativo pela descrição, mas enviava formData.name vazio ao serviço.
- **Correção:** schemas explícitos compartilhados por intenção e sete instâncias RHF. Todos os callbacks recebem valores parseados e mantêm o bloqueio até concluir o serviço; flags de processamento pertencem ao callback válido. Os requisitos existentes de categoria + pelo menos uma medida para aperfeiçoar e custo positivo para preços foram preservados. Derivações de nome, dimensões e margem usam os valores parseados; medidas ausentes não viram texto undefined. Erros de serviço ficam visíveis, preservando a notificação de quota. Categoria automática inválida permanece silenciosa; nenhuma classificação NCM é disparada ao abrir.
- **Fiscal:** contexto de empresa é lido localmente, CNPJ normalizado sem remover letras e dados sugeridos continuam como campos revisáveis antes de salvar. Mantida a regra de CST existente para produto/serviço e o aviso de revisar CFOP. Não altera emissão, snapshots, certificado ou autorização por operação.
- **Arquivos:** shared-utils/productAiFormSchemas.ts; erp/src/pages/App/Products/hooks/form/useProductFormAi.ts e seus testes. Nenhuma chamada real a IA, SEFAZ, Supabase ou gravação de produto.
- **Validação:** rodada final de produtos/sugestões/conversão aprovada em 133 testes de 13 arquivos (scratch/rhf-product-ai-conversion-final-tests.log); 49 testes do proprietário/abertura e dez dos modais. Lint sem erros/avisos. TypeScript global reprova fora deste lote, sem diagnósticos dos arquivos alterados em scratch/rhf-product-ai-conversion-final-tsc.log. Build ERP completo aprovado (scratch/rhf-erp-build-product-ai-conversion-final.log), incluindo startup fiscal/XSD. Linhas exatas no anexo.

- **Contrato de retorno confirmado no serviço ativo:** aiProductCatalogService.generateComboName retorna objeto { name }, e generateProductDescription retorna { description }. O formulário atribuía o objeto inteiro a campos textuais (diagnósticos TS2345 no relatório scratch/rhf-product-ai-tsc.log). Agora lê os campos reais e valida texto não vazio antes de aplicá-los; retorno vazio/inválido não apaga o conteúdo anterior. Preços de retorno também exigem faixas reconhecidas, números finitos e preço não negativo, permitindo margem negativa e mantendo preço zero; retorno inválido não vira prévia válida. Os mocks foram corrigidos para representar o contrato real.

## Conversão e seleção cartesiana de variações

- **Causa comprovada:** conversão validava apenas o atributo, soltava o callback antes de onConvert e herdava stock/preço/custo sem validação, inclusive convertendo NaN em zero com ||. A variação de um produto em rascunho nascia active=true. O seletor cartesiano filtrava linhas incompletas antes do resolver e não aguardava onGenerate. Cinco testes falharam no código anterior em scratch/rhf-variation-operations-before.log.
- **Correção:** schema de conversão reutiliza números canônicos de variação sem exigir conclusão do pai. Geração de nome/SKU/estoque/custo usa valores parseados; callback é aguardado, erro mantém formulário aberto e permite retomar. Rascunho conserva a variação inativa/oculta, sem publicar nada. Seleção cartesiana valida todas as linhas, aguarda a geração e conserva seleção após falha.
- **Arquivos:** shared-utils/productVariationOperationFormSchemas.ts; shared-utils/catalogFormSchemas.ts; ProductConversionModal.tsx; CartesianVariationModal.tsx; variationOperationForms.test.tsx. O componente cartesiano não possui consumidor ativo na busca de referências realizada; seus testes provam o componente, sem alegar fluxo de interface ativo. A conversão é consumida por ProductFormModal/handleConvertProduct.
- **Validação:** dez testes dos modais e regressão consolidada de 133 testes aprovados; cinco casos falharam antes da correção. Lint sem erros/avisos. TypeScript global reprova fora dos arquivos alterados; build ERP completo aprovado, incluindo startup fiscal/XSD. Linhas exatas no anexo. Nenhuma gravação comercial, IA ou serviço remoto foi executado.

## Pedido de venda: rascunho manual, snapshot de submissão e artefatos de teste

- **Problemas comprovados:** salvar manualmente um rascunho exigia cliente/atendente embora o autosave aceitasse dados incompletos; o código comercial era obtido antes da validação. Uma alteração feita durante essa espera podia entrar em outra versão do payload. Ao reabrir um artefato de teste sem código comercial, a condição `id && orderIndex` descartava seu ID. Erros estruturais dos itens usavam `items_0_*`, enquanto os campos filhos leem `item_0_*`.
- **Causas e solução:** `useSalesOrderForm` usava o contrato final também no rascunho e encerrava o callback RHF antes da persistência. Agora escolhe o contrato de rascunho já compartilhado somente para `draft`, mantém a submissão inteira no callback, valida antes de obter o código e preserva o mesmo snapshot parseado durante a espera. Edição de pedido cadastrado conserva seu status e requisitos. A identidade existente de teste independe do código comercial; retorno de conclusão não reinjeta o código do formulário em artefato marcado. As chaves de erro são adaptadas aos campos filhos, com o motivo visível.
- **Arquivos:** `erp/src/pages/App/SalesOrder/hooks/useSalesOrderForm.ts` (contratos e callbacks salvar/concluir; carregamento de teste), novo `useSalesOrderForm.test.tsx`, `useOrderAutoSave.test.tsx` e `__tests__/salesOrderHandlingPersistence.test.ts`. Linhas finais e verificação consolidada serão anexadas após o fechamento do lote.
- **Evidência em andamento:** oito falhas iniciais em 22 testes (scratch/rhf-sales-order-before.log), incluindo duas expectativas antigas. Após a correção, os 12 testes novos do proprietário passaram; restou a fixture do orçamento legado, que tentava finalizar sem produto/atendente. A fixture foi corrigida para representar um orçamento válido, mantendo a expectativa `quoted`; a regra não foi relaxada. A rodada final está em validação. O autosave mantém seu callback real já existente e ganha provas de valores parseados, ID e bloqueio de números inválidos/ação manual. Nenhuma transmissão, gravação comercial remota, nova regra tributária ou alteração de snapshot fiscal/SQL.

## Consulta de distância no pedido: entrada validada e respostas obsoletas

- **Causas comprovadas:** o cálculo acionado por botão ou mudança de cliente ainda chamava Maps sem RHF; coordenadas sem texto eram descartadas e o cache ignorava coordenadas/placeId. `!isNaN` aceitava distância infinita/negativa e um preço inválido podia substituir o frete. Uma tentativa inválida ou troca do endereço sem novo cálculo não invalidava a resposta anterior. A espera não tinha limite local.
- **Solução em validação:** contrato compartilhado explícito de endereço/rota em `shared-utils/routeFormSchemas.ts`; `useOrderDistanceCalculator` executa o resolver antes do serviço e usa somente o endereço parseado. Validação é serializada, consultas atuais usam revisão e compartilham o pedido idêntico pendente; coordenadas/localização integram a chave. Resposta e preço inválidos não alteram dados. Prazo local de 15s libera a interface sem retry nem aplicação tardia do resultado. Mudança de endereço invalida a resposta anterior e conserva a consulta já iniciada para o endereço novo. Nenhum provedor real foi acessado.
- **Prova em andamento:** oito falhas em 11 testes antes da correção (scratch/rhf-order-distance-before.log). Os 11 casos passaram após a primeira correção; foram adicionadas duas regressões para a troca do endereço pelos props do formulário. TypeScript/lint/testes finais estão em validação. Os arquivos e linhas finais serão consolidados abaixo.

## Linhas verificadas no diff desta rodada

Intervalos adicionados/modificados no checkout desta revisão, incluindo reindentação dos callbacks. Arquivos novos listam todo o conteúdo.

- `erp/src/pages/App/FiscalDocuments/__tests__/fiscalOperationForms.test.tsx`: 98–144, 200–223
- `erp/src/pages/App/FiscalDocuments/hooks/useFiscalCancelModal.ts`: 1, 26, 36, 55, 64, 66–68, 70–76, 78, 80–118, 120–128, 130–137, 139
- `erp/src/pages/App/FiscalDocuments/hooks/useNfeOperationDraft.ts`: 1, 149–150, 152, 154, 156–169, 171, 199, 201, 203–220, 222, 227, 229, 231–262, 264
- `erp/src/pages/App/Products/hooks/form/useProductFormDraft.test.tsx`: 19–30
- `erp/src/pages/App/Products/hooks/form/useProductFormDraft.ts`: 30, 35–38, 40, 49, 126–142, 146–147
- `erp/src/pages/App/Products/hooks/form/useProductFormSubmit.test.tsx`: 2, 7–9, 53–125
- `erp/src/pages/App/Products/hooks/form/useProductFormSubmit.ts`: 2, 12–13, 24, 54, 56, 58–74, 76–95, 97–127, 129, 131–135, 138–146, 148–151, 153–165, 167–180, 182–188, 190–199, 201–223, 225–240, 242–258, 260, 262
- `erp/src/pages/App/Registrations/shared/modals/personForm/usePersonForm.ts`: 24, 129–132, 190, 192–194, 197–198, 204–205, 214, 226, 361–365, 367–369, 380–381, 405–407, 409–415, 417–423, 425–432, 435–447, 450–459, 461–475, 479–488
- `erp/src/pages/App/SalesOrder/hooks/useSalesOrderModals.ts`: 6–10, 14
- `shared-utils/lookupFormSchemas.ts`: 4–9
- `shared-utils/productDomainValidation.ts`: 2–8, 22–23, 44
- `erp/src/pages/App/SalesOrder/hooks/useSalesOrderModals.test.tsx`: 1–53 (arquivo novo)
- `erp/src/pages/App/Registrations/shared/modals/personForm/usePersonForm.test.tsx`: 1–104 (arquivo novo)
- `shared-utils/returnFormSchemas.ts`: 11–29, 31, 33, 37
- `shared-utils/fileFormSchemas.ts`: 3–8
- `erp/src/pages/App/SalesOrder/OrderActions/ReturnOrderModal.tsx`: 78, 226, 243–244, 247, 276, 298–323, 325–335, 337–377, 379–397, 399
- `erp/src/pages/App/SalesOrder/OrderActions/ReturnOrderModal.test.tsx`: 6, 27, 31, 52, 72–81, 476–534
- `erp/src/pages/App/SalesOrder/OrderActions/ReturnItemsSelection.tsx`: 39, 43, 130, 138–140, 142, 149
- `erp/src/pages/App/SalesOrder/OrderActions/ReturnItemsSelection.test.tsx`: 1–32 (arquivo novo)
- `erp/src/pages/App/SalesOrder/modals/UnlinkedReturnOrderModal.tsx`: 66, 78–131
- `erp/src/pages/App/SalesOrder/modals/UnlinkedReturnOrderModal.test.tsx`: 1–72 (arquivo novo)
- `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundDocumentImport.ts`: 1, 5–6, 65–69, 82–94, 96–111, 113–133, 137–149, 156–157, 160–167, 169, 171, 181–182, 185–189, 191, 193, 223
- `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundDocumentImport.test.tsx`: 1–112 (arquivo novo)
- `erp/src/pages/App/Stock/InboundInvoices/modals/InboundAccessKeyModal.tsx`: 41–50, 140, 143
- `erp/src/pages/App/Stock/InboundInvoices/modals/InboundXmlImportModal.tsx`: 4, 23–27, 45, 47, 49–67, 71–72, 74–80, 82, 84, 137, 143, 167, 187, 190
- `erp/src/pages/App/Stock/InboundInvoices/modals/InboundDocumentImportModal.tsx`: 34, 45, 52–58, 61–62, 67–68, 71–72, 74–95, 97–116, 118, 120, 132, 156, 196, 206, 264, 268, 272, 303, 323
- `erp/src/pages/App/Stock/InboundInvoices/modals/inboundImportForms.test.tsx`: 1–133 (arquivo novo)
- `erp/src/pages/utils/inboundNfe/services/inboundInvoicesMutationService.ts`: 6, 18, 26, 28, 39, 44, 172
- `erp/src/pages/utils/inboundNfe/services/inboundInvoicesQueryService.ts`: 6, 373, 378
- `erp/src/pages/utils/inboundNfe/__tests__/inboundInvoiceKeyPersistence.test.ts`: 1–60 (arquivo novo)
- `erp/src/pages/App/Products/hooks/form/useProductFormModal.ts`: 398–412, 414–427, 429–451, 453
- `erp/src/pages/App/Products/hooks/form/useProductFormModal.variation.test.tsx`: 1–71 (arquivo novo)
- `erp/src/pages/App/Products/hooks/variation/useVariationForm.ts`: 448, 450
- `erp/src/pages/App/Products/hooks/variation/useVariationForm.test.tsx`: 2, 115, 118, 120, 222–250
- `shared-utils/productImageFormSchemas.ts`: 1–14 (arquivo novo)
- `erp/src/pages/App/Products/components/modals/variations/VariationParentImagesSelectModal.tsx`: 3–5, 13, 25, 65–73, 223
- `erp/src/pages/App/Products/components/modals/variations/VariationParentImagesSelectModal.test.tsx`: 1–53 (arquivo novo)
- `shared-utils/productAiFormSchemas.ts`: 1–55 (arquivo novo)
- `erp/src/pages/App/Products/components/variationTabs/VariationDescriptionTab.tsx`: 6–7, 27, 50–68
- `erp/src/pages/App/Products/components/variationTabs/VariationTechnicalDescriptionSection.tsx`: 6–7, 29, 38–63
- `erp/src/pages/App/Products/components/variationTabs/VariationAttributeValueInput.tsx`: 60–74
- `erp/src/pages/App/Products/components/variationTabs/VariationAttributeValueInput.test.tsx`: 1, 3, 7, 136–159
- `erp/src/pages/App/Products/components/variationTabs/variationDescriptionOwners.test.tsx`: 1–44 (arquivo novo)
- `erp/src/pages/App/Products/components/modals/attributes/ManageAttributesModal.test.tsx`: 2, 7–8, 12, 26–30, 53–92
- `erp/src/pages/utils/productService/productVariationActionsService.ts`: 19–29
- `supabase/migrations/20261015150000_optimize_test_artifact_index_lookups.sql`: 1–138 (arquivo novo)
- `shared-utils/productVariationOperationFormSchemas.ts`: 1–10 (arquivo novo)
- `shared-utils/catalogFormSchemas.ts`: 24
- `erp/src/pages/App/Products/hooks/form/useProductFormAi.ts`: 2–8, 51–69, 71–80, 82–87, 89, 93–105, 109–129, 133–145, 149–161, 163–170, 172, 176–192, 194, 198–209, 211–219
- `erp/src/pages/App/Products/hooks/form/useProductFormAi.test.ts`: 1
- `erp/src/pages/App/Products/hooks/form/useProductFormAi.owners.test.tsx`: 1–192 (arquivo novo)
- `erp/src/pages/App/Products/components/modals/product/ProductConversionModal.tsx`: 4, 6, 12, 26, 44–83, 168
- `erp/src/pages/App/Products/components/modals/variations/CartesianVariationModal.tsx`: 19, 88–96, 291
- `erp/src/pages/App/Products/components/modals/variations/variationOperationForms.test.tsx`: 1–78 (arquivo novo)
