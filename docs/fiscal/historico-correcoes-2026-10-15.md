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
- **Evidência:** oito falhas iniciais em 22 testes (scratch/rhf-sales-order-before.log), seis nos casos novos e duas em testes existentes. Apenas a fixture do orçamento legado era inválida: tentava finalizar sem produto/atendente e foi corrigida para representar um orçamento válido, mantendo `quoted` sem relaxar a regra. O teste já existente do marcador passou ao corrigir o contrato de rascunho. A rodada final tem 45 testes aprovados em quatro arquivos: 19 do proprietário manual, oito de autosave, 13 de distância e cinco de manuseio. O autosave mantém seu callback real já existente e ganha provas de valores parseados, ID e bloqueio de números inválidos/ação manual. Nenhuma transmissão, gravação comercial remota, nova regra tributária ou alteração de snapshot fiscal/SQL.

## Consulta de distância no pedido: entrada validada e respostas obsoletas

- **Causas comprovadas:** o cálculo acionado por botão ou mudança de cliente ainda chamava Maps sem RHF; coordenadas sem texto eram descartadas e o cache ignorava coordenadas/placeId. `!isNaN` aceitava distância infinita/negativa e um preço inválido podia substituir o frete. Uma tentativa inválida ou troca do endereço sem novo cálculo não invalidava a resposta anterior. A espera não tinha limite local.
- **Solução:** contrato compartilhado explícito de endereço/rota em `shared-utils/routeFormSchemas.ts`; `useOrderDistanceCalculator` executa o resolver antes do serviço e usa somente o endereço parseado. Validação é serializada, consultas atuais usam revisão e compartilham o pedido idêntico pendente; coordenadas/localização integram a chave. Resposta e preço inválidos não alteram dados. Prazo local de 15s libera a interface sem retry nem aplicação tardia do resultado. Mudança de endereço invalida a resposta anterior e conserva a consulta já iniciada para o endereço novo. Nenhum provedor real foi acessado.
- **Prova final:** oito falhas em 11 testes antes da correção (scratch/rhf-order-distance-before.log). Os 13 casos finais passaram, incluindo troca do endereço pelos props do formulário e consulta iniciada antes do render correspondente. Junto de pedido/autosave/manuseio: 45 testes aprovados em scratch/rhf-sales-order-distance-final-tests.log. Lint dos três hooks e do formatador sem erros/avisos (rhf-sales-order-distance-final-lint.log); build ERP completo aprovado (rhf-sales-order-distance-final-build.log), com aviso existente de chunks grandes. TypeScript global continua reprovando fora deste lote, sem diagnósticos de seus arquivos fonte (rhf-sales-order-distance-final-tsc.log). Serviços, código comercial e notificações são simulados; não há prova de Maps real, navegador, persistência/concorrência PostgreSQL ou transmissão fiscal. A rota independente do mapa e o autocomplete continuam pendentes no inventário.

### Proteção do contexto e data do pedido

- **Troca de pedido:** um teste integrado com o hook real reproduziu a aplicação do frete de uma consulta anterior sobre o pedido recém-carregado, mesmo quando os endereços tinham a mesma chave. `loadOrderForEditing` agora invalida explicitamente a aplicação pendente e o cache daquele contexto. O pedido remoto de Maps não é cancelado; sua resposta não altera o novo registro. Prova antes do ajuste em scratch/rhf-order-context-before.log.
- **Data apagada ou inválida:** `formatToStorageDate` fabricava um timestamp atual antes do resolver, ocultando o campo vazio. Seus dois consumidores são a criação do snapshot e a prévia do próprio pedido. Agora retorna vazio para entrada ausente/inválida; a conclusão é bloqueada pela regra já existente e o rascunho continua incompleto. O carregamento mantém a data ausente em branco, evitando herdar a data anterior/atual ao reabrir um rascunho; a conversão de datas preenchidas e o valor inicial de novos pedidos permanecem. `buildOrderPersistencePayload` mantém a data no JSON de pedido, sem nova coluna/cast ou mudança de SQL. Três testes reproduziram o preenchimento artificial (rhf-order-date-before.log) e um adicional a reabertura (rhf-order-draft-date-reopen-before.log). Consolidação final: 45 testes aprovados, lint sem erros/avisos e build ERP aprovado, conforme os logs do lote. O TypeScript global reprova fora destes arquivos, sem diagnósticos dos arquivos alterados.

### Localização do lote de pedidos e distância

Intervalos do diff entre a base c9747395 e o checkout após a consolidação, incluindo o commit intermediário 910b64ca. São referências do conteúdo final deste lote; o índice anterior abaixo preserva as demais correções do dia.

- `erp/src/pages/App/SalesOrder/hooks/useSalesOrderForm.ts`: 28, 31, 66–68, 118, 167 (remoção), 190, 193–194, 199–201, 203–204, 310, 320, 341–348, 351, 354 (remoção), 357 (remoção), 361–387, 389–392, 401, 406, 409 (remoção), 412 (remoção), 416–425, 427–446, 448–451, 460.
- `erp/src/pages/App/SalesOrder/hooks/orderDateFormatting.ts`: 12, 14.
- `erp/src/pages/App/SalesOrder/hooks/useSalesOrderForm.test.tsx`: 1–165.
- `erp/src/pages/App/SalesOrder/hooks/useOrderAutoSave.test.tsx`: 31, 154, 201–222.
- `erp/src/pages/App/SalesOrder/hooks/useOrderDistanceCalculator.ts`: 1, 3, 7–10, 12–20, 25, 28–29, 31–50, 53–64, 68–69, 71, 73–77, 79, 81–102, 104, 108, 110.
- `erp/src/pages/App/SalesOrder/hooks/useOrderDistanceCalculator.test.tsx`: 1–92.
- `erp/src/pages/App/SalesOrder/__tests__/salesOrderHandlingPersistence.test.ts`: 86–89.
- `shared-utils/routeFormSchemas.ts`: 1–24.

## Autocomplete compartilhado e mapa de frete: contratos e respostas concorrentes

- **Problemas e causas comprovadas:** busca, seleção e complemento não executavam RHF antes dos serviços/callbacks; texto/contexto seguiam brutos. A seleção herdava coordenadas de outro endereço, e detalhes atrasados podiam substituir edição de número ou localização manual. O baseline era capturado somente após aguardar validação; na busca rápida do mapa o contexto usava o texto da consulta em vez da rua do formulário. Timers não eram encerrados na desmontagem e consultas sem retorno mantinham a busca pendente. O cálculo independente também não protegia respostas antigas nem validava rota/preço antes de mostrar o frete.
- **Solução aplicada:** schemas de busca, opção disponível, endereço selecionado, localização e frete explícitos em shared-utils; RHF/resolver real antes dos efeitos, valores parseados e erro visível. Prazos locais de 15s, revisão de consulta e baseline capturado antes de qualquer espera; edições de campos físicos/mapas/coordenadas impedem complemento antigo. A mescla funcional comum aos cinco consumidores invalida localização antiga e conserva campos não relacionados. O mapa usa o autocomplete compartilhado, protege concorrência e só apresenta rota/preço válidos. Não há formulário de cadastro aninhado nem mudança de política fiscal.
- **Verificação:** 73 testes em seis arquivos (scratch/rhf-address-freight-final-tests.log); antes da correção, 11/12 casos do autocomplete e dez casos do mapa falharam. Três regressões adicionais de concorrência foram comprovadas; um quarto caso tinha seletor de teste incorreto, que foi ajustado. Todos os 27 casos atuais de autocomplete/mapa passam, mais seis de pessoa e regressões do pedido/autosave/distância. Build ERP passou; lint sem erros e cinco avisos existentes. TypeScript global reprova fora do lote, sem diagnósticos dos arquivos fonte/testes listados. Não houve Maps real, renderização WebGL, escrita comercial, SQL, SEFAZ ou deploy.

### Arquivos e linhas do lote de endereço/mapa

Intervalos do checkout comparados à base 910b64ca; arquivos novos listam todo o conteúdo.

- `shared-utils/routeFormSchemas.ts`: 18–19, 22–47
- `shared-utils/addressSelection.ts`: 1–56
- `erp/src/components/shared/AddressAutocompleteInput.tsx`: 1, 5–9, 11, 14, 16–20, 24–27, 30–37, 40–55, 58–59, 61–63, 65–69, 71–78, 80–88, 90–135, 137–153, 168, 194–198, 204, 211, 218–220
- `erp/src/components/shared/AddressAutocompleteInput.test.tsx`: 1–104
- `erp/src/pages/App/Registrations/shared/modals/personForm/PersonAddressSection.tsx`: 1, 99–100, 103
- `erp/src/pages/App/Registrations/shared/modals/personForm/usePersonForm.ts`: 1, 347
- `erp/src/pages/App/Registrations/shared/modals/personForm/usePersonForm.test.tsx`: 87–99
- `erp/src/pages/App/SalesOrder/components/ShippingData.tsx`: 1, 121, 218–219, 222
- `erp/src/pages/App/SalesOrder/AssistanceOrderModalComponents/AssistanceCustomerSection.tsx`: 1, 14, 27, 31, 115–119
- `erp/src/pages/App/Settings/components/fiscal/CompanyFiscalDataSection.tsx`: 1, 62–69
- `erp/src/pages/App/SalesOrder/components/OrderRouteMap.tsx`: 5, 9–12, 19–29, 32–41, 43–48, 50–62, 64–65, 174, 186–192, 197–199, 207, 211, 214, 219, 223, 226, 253–254, 273
- `erp/src/pages/App/SalesOrder/components/OrderRouteMap.test.tsx`: 1–77

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
- `erp/src/pages/App/Products/components/modals/variations/CartesianVariationModal.tsx`: 19, 88–96, 291
- `erp/src/pages/App/Products/components/modals/variations/variationOperationForms.test.tsx`: 1–78 (arquivo novo)
- `erp/src/pages/utils/technicalValuesService.ts`: 244–261
- `supabase/migrations/20261015160000_add_feet_characteristics.sql`: 1–76 (arquivo novo)

## Características de Pés no Catálogo (Possui pés, Quantidade de pés, Material dos pés)

- **Demanda e regra de negócio:** Necessidade de padronizar as características relacionadas aos pés dos produtos do catálogo ("Possui pés", "Quantidade de pés" e "Material dos pés"), permitindo que produtos tenham essas informações de forma estruturada e categorizada.
- **Implementação no banco de dados (`supabase`):**
  1. Criação dos atributos `Possui pés` (tipo radio, opções: "Sim", "Não") e `Quantidade de pés` (tipo radio, opções de 0 a 12 pés e "Não possui") na tabela `public.attributes` e `public.attribute_values`.
  2. Expansão das opções de `Material dos pés` para incluir "Sem pés / Sapata", "Não possui", "Não se aplica", "Madeira", "MDF", "Alumínio", além das opções pré-existentes.
  3. Vinculação automática via `public.category_attributes` para todas as 36 categorias de móveis que aceitam pés (Guarda-Roupas, Cômodas, Balcões, Sofás, Camas/Bases, Racks, Mesas de Cabeceira, etc.).
  4. Atualização compatível do acervo existente de produtos (71 produtos atualizados atomicamente no PostgreSQL com preservação de integridade contra artefatos de teste).
- **Implementação no frontend ERP:**
  - `erp/src/pages/utils/technicalValuesService.ts`: adicionada ordenação canônica específica no agrupador de `Acessórios`, mantendo a sequência lógica: `Possui pés` -> `Quantidade de pés` -> `Material dos pés` -> `Pés reguláveis` -> `Rodízios` -> `Tipo de puxador` -> `Material dos puxadores`.
- **Validação:**
  - Suíte de testes unitários executada com sucesso (`technicalValuesService.test.ts`, `useProductFormModal.variation.test.tsx`, `useVariationForm.test.tsx`).

## Subtópicos Dedicados de Características (Portas, Gavetas, Prateleiras e Pés)

- **Demanda e regra de negócio:** No módulo de características (gestão de atributos) e nas abas de especificações técnicas do produto e de suas variações (ERP e Mobile), atributos anteriormente misturados em tópicos genéricos como `Estrutura`, `Funcionalidades` ou `Acessórios` agora devem ser apresentados em subtópicos/tópicos dedicados para:
  1. **Portas:** `Quantidade de portas`, `Tipo de portas`, `Material das portas`.
  2. **Gavetas:** `Quantidade de gavetas`, `Tipo/material da corrediça`, `Material das gavetas`, `Gavetas com chave`.
  3. **Prateleiras:** `Quantidade de prateleiras`, `Material das prateleiras`, `Peso suportado por prateleira`.
  4. **Pés:** `Possui pés`, `Quantidade de pés`, `Material dos pés`, `Pés reguláveis`, `Rodízios`.
- **Implementação técnica:**
  1. `CHARACTERISTIC_TOPICS` em `erp/src/pages/utils/technicalValuesService.ts` e `mobile/src/features/products/domain/productCharacteristics.ts`:
     - Criados tópicos dedicados `{ title: 'Portas', matches: /\b(portas?)\b/i }`.
     - Criados tópicos dedicados `{ title: 'Gavetas', matches: /\b(gavetas?|corredi[çc]as?)\b/i }`.
     - Criados tópicos dedicados `{ title: 'Prateleiras', matches: /\b(prateleiras?)\b/i }`.
     - Criados tópicos dedicados `{ title: 'Pés', matches: /\b(p[eé]s?|rod[ií]zios?)\b/i }`.
     - Ajustado regex de `Medidas e peso` com lookahead negativo `\bpeso\b(?!.*(prateleira|gaveta))` para garantir que pesos específicos como "Peso suportado por prateleira" sejam direcionados ao seu tópico próprio.
     - Removidos termos de portas, gavetas e pés dos tópicos `Estrutura`, `Funcionalidades` e `Acessórios`.
     - Removida qualquer menção a sapatas (no banco de dados, produtos sem pés receberam "Não possui" e a opção transitória "Sem pés / Sapata" foi excluída de `public.attribute_values`).
  2. Mapas canônicos de ordenação:
     - Definidos `DOORS_SORT_ORDER`, `DRAWERS_SORT_ORDER`, `SHELVES_SORT_ORDER`, `FEET_SORT_ORDER` e `ACCESSORIES_SORT_ORDER`.
     - Implementada ordenação previsível nos agrupadores `groupCharacteristicsByTopic` (ERP) e `groupProductTechnicalFields` (Mobile).
- **Arquivos modificados:**
  - `erp/src/pages/utils/technicalValuesService.ts`: 55–74, 115–158, 288–335
  - `erp/src/pages/utils/__tests__/technicalValuesService.test.ts`: 28–98
  - `mobile/src/features/products/domain/productCharacteristics.ts`: 67–88, 111–154, 545–585
- **Validação:**
  - 22 testes unitários em `erp/src/pages/utils/__tests__/technicalValuesService.test.ts` aprovados com 100% de sucesso.
  - Testes de renderização de abas de variação `VariationTechnicalTab.test.tsx` aprovados com 100% de sucesso.

## Consolidação das Opções de Puxadores (`Tipo de puxador` e `Material dos puxadores`)

- **Demanda e regra de negócio:** Simplificar e padronizar as opções de tipo de puxador no catálogo de produtos:
  - Simplificar os nomes das opções para termos diretos e objetivos: `Alça`, `Perfilado`, `Cava`, `Passante` e `Concha`.
  - Adicionar as opções `MDF` e `MDP` nas opções oficiais de `Material dos puxadores`.
- **Implementação no banco de dados (`supabase`):**
  - `public.attribute_values`: opções finais de `Tipo de puxador`: 1. `Alça`, 2. `Perfilado`, 3. `Cava`, 4. `Passante`, 5. `Concha`.
  - Inseridos `MDF` (`sort_order = 1`) e `MDP` (`sort_order = 2`) para `Material dos puxadores`.
  - Atualizados produtos existentes no catálogo que continham valores anteriores (ex: Guarda-Roupa Florida para `Alça`, Cozinha Dália para `Perfilado`).
  - Migration salva: `supabase/migrations/20261015170000_update_puxadores_characteristics.sql`.

## Auditoria e Preenchimento das Características de Puxadores com Base nas Descrições

- **Demanda e regra de negócio:** Auditar todos os produtos do catálogo cuja descrição mencione ou explique puxadores. Povoar atomicamente as características técnicas do produto (`Tipo de puxador` e `Material dos puxadores`) estritamente com base no que está descrito textualmente. Se a descrição não explicar o tipo ou o material (ou apenas citar cor/tonalidade como "cor bronze", ou contagem numérica como "6 puxadores"), a respectiva característica não deve ser informada (permanecendo nula/vazia).
- **Censo e classificação dos produtos:**
  - Total de produtos com menção a puxadores no acervo do catálogo: **85 produtos**.
  - **Produtos atualizados:** **78 produtos** (que explicam expressamente tipo e/ou material).
    - `Tipo de puxador` identificado e preenchido em 12 produtos:
      - `Passante`: 1 produto (ex.: Armário Aéreo 80cm Florença Móveis Sul - "puxadores tipo passante").
      - `Perfilado`: 4 produtos (ex.: Balcão para Pia de 1,60m 1° Linha - "puxadores perfilados"; Cozinha Modulada JK - "puxadores perfilados"; Guarda Roupa Florence - "puxadores em perfil MDF"; Guarda Roupa Vitória - "puxadores em perfil de alumínio"; Jogo de Cozinha Modulado 4 Peças 2,00 m - "Puxador em perfil").
      - `Cava`: 5 produtos (ex.: Balcão para Pia Florença - "puxador invisível, em mdf"; Cômoda Geórgia - "Gavetas com puxadores usinados"; Cômoda Texas 1,47m e Cômoda Texas 4G - "Puxadores usinados").
      - `Alça`: 2 produtos (ex.: Torre Quente Luciane - "puxadores tipo aste em Alumínio Preto"; Guarda Roupa Florida - "Alça").
    - `Material dos puxadores` identificado e preenchido em 73 produtos:
      - `Plástico / ABS`: 34 produtos (plástico, ABS, PVC, polipropileno, VPS).
      - `MDF`: 23 produtos (MDF, perfil MDF, MDF 18/25mm).
      - `Alumínio / Metal`: 11 produtos (alumínio polido, alumínio, metal).
      - `Madeira`: 2 produtos (madeira, madeira envelopada).
      - `Madeira Maciça`: 1 produto (Cômoda Malta 4G 1P - "Puxadores em Madeira Maciça").
  - **Produtos mantidos nulos/vazios (7 produtos):**
    - Produtos cuja descrição menciona apenas cor/tonalidade ou contagem numérica, sem especificar tipo nem material:
      1. *Guarda Roupa Americano Henn 2,62m 6 Portas* ("puxadores em tonalidade bronze").
      2. *Guarda Roupa Casal Ripado 6 Portas com Pés Siena Faimec* ("6 Puxadores").
      3. *Guarda Roupa Chile 3 Portas c/ Pés* ("puxadores na cor bronze").
      4. *Guarda Roupa Infantil com Cômoda Q Encanto Slim 4970 Branco Acetinado* ("Puxadores metalizados dourados").
      5. *Multiuso Jade para Lavandeira com Pés Branco* ("2 puxadores na cor bronze").
      6. *Penteadeira Camarim Bella com Espelho Moval* ("Puxadores na Cor Bronze: Sim").
      7. *Penteadeira Camarim Sonhos com Espelho Moval* ("puxadores modernos na cor bronze").
- **Implementação no banco de dados (`supabase`):**
  - Migration criada e executada: `supabase/migrations/20261015180000_audit_puxadores_from_descriptions.sql`.
  - Operação atômica em PostgreSQL via `UPDATE ... FROM (VALUES ...) AS t(id, tipo, material)`.
  - Proteção estrita preservada: `NOT public.test_artifact_is_test(to_jsonb(p)) AND COALESCE(public.test_artifact_row_data('products', to_jsonb(p))->>'is_test', 'false') != 'true'`.
- **Ajuste subsequente das opções de material (Madeira -> Madeira Maciça):**
  - Por determinação direta do usuário (*"PUXADOR MATERIAL NAO PRECISA DAQUELE MADEIRA POIS JA TEM O MDF, E MADEIRA MACIÇA"*), a opção genérica `Madeira` foi removida/substituída por `Madeira Maciça` em `public.attribute_values` (`Material dos puxadores`).
  - Os 2 produtos que haviam sido classificados com `Madeira` (*Guarda Roupa 2,70m Ripado Siena Bianchi* e *Treliche Infantil Jade*) foram migrados para `Madeira Maciça`.
  - Migration executada: `supabase/migrations/20261015190000_replace_madeira_with_madeira_macica_in_puxadores.sql`.
- **Remoção de 'Sem puxador' e 'Embutido / Cava' de Material dos puxadores:**
  - Por determinação direta do usuário (*"TIRE A OPÇAO SEM PUXADOR, FICA VAZIO SE A PESSOA NA OSELECIONOU NADA. EMBUTIDO / CAVA NAO É SOBRE MATERIAL E SIM TIPO, ENTAO PODE TIRAR"*), as opções `Sem puxador` e `Embutido / Cava` foram excluídas de `public.attribute_values` para o atributo `Material dos puxadores`.
  - O campo permanece vazio quando o produto não possui ou o usuário não seleciona material; e "Cava" já pertence exclusivamente ao atributo `Tipo de puxador`.
  - Opções finais de `Material dos puxadores`: `MDF`, `MDP`, `Madeira Maciça`, `Alumínio / Metal`, `Plástico / ABS`.
  - Migration executada: `supabase/migrations/20261015200000_remove_sem_puxador_and_embutido_cava.sql`.
- **Varredura exaustiva dos 378 produtos do catálogo e remoção de valores não comprovados:**
  - Realizada verificação completa em todos os 378 produtos ativos do catálogo para assegurar 100% de conformidade com a regra (*"se não tiver explicando na descrição, então não informe"*).
  - Identificados 2 produtos que possuíam especificações de puxadores herdadas de migrações em lote antigas, sem qualquer menção a puxadores em suas descrições:
    1. *Estante Multiuso Open 56cm* (possuía `Não se aplica` sem ter portas, gavetas ou puxadores no texto).
    2. *Guarda Roupa Faimec Portugal 2 Portas Branco* (possuía `Plástico / ABS` sem possuir texto de descrição cadastrado).
  - Ambos tiveram os atributos de puxador removidos do `technical_specs` via migration: `supabase/migrations/20261015210000_clean_unverified_handle_specs.sql`.
- **Validação consolidada:**
  - Censo final em 378 produtos:
    - 78 produtos com puxador comprovado na descrição: com especificações ativas e exatas (`with_tipo = 12`, `with_material = 71`).
    - 300 produtos sem explicação de puxador no texto: 100% vazios/nulos nas características de puxador.
  - Distribuição final de `Material dos puxadores`: `Plástico / ABS` (34), `MDF` (23), `Alumínio / Metal` (11), `Madeira Maciça` (3).
  - Distribuição final de `Tipo de puxador`: `Perfilado` (5), `Cava` (4), `Alça` (2), `Passante` (1).
  - Nenhum artefato de teste afetado e aderência estrita às descrições.

## Importação de pessoas: leitura, mapeamento e gravação do lote

- **Problemas e causas comprovadas:** arquivo/mapeamento eram processados sem resolver; a submissão validava o lote e terminava antes de gravar. O modal não atualizava estados por bloco, podendo repetir registros já confirmados após falha posterior, e callbacks/timer de fechamento podiam alcançar uma sessão reaberta. Flags de dispensa e origem não tinham reconhecimento automático e seus cabeçalhos podiam ocupar as colunas de telefone/logradouro.
- **Solução:** contratos de CSV/codificação e colunas/prévia explícitos em shared-utils; leitura, mapeamento e persistência executam RHF + resolver antes dos efeitos. A prévia mantém erros por linha e a importação reaplica o domínio vigente apenas às linhas válidas escolhidas, entregando payload parseado. Gravação permanece no callback protegido, com trava comum, prazo, contexto e progresso por bloco. Estados confirmados/incertos não voltam à seleção; a sessão conserva a incerteza para conferência, sem fechar automaticamente após importar os registros restantes. Timer e FileReader são encerrados no ciclo de vida; uma resposta antiga não inicia os próximos blocos nem chama callbacks na sessão nova. Prazo local libera a interface sem cancelar nem repetir a gravação no provedor. Nome/colunas/opções são validados, aspas abertas rejeitadas e mapeamento evita confundir flags com endereço/telefone. Serviço, mapper, SQL e regras fiscais não foram alterados.
- **Verificações:** 16 testes do proprietário aprovados (scratch/rhf-person-import-final-tests.log); 89 testes conjuntos em sete arquivos (rhf-address-import-final-tests.log). Seis de sete casos iniciais falhavam antes da correção, após alinhar duas fixtures sem relaxar validações (rhf-person-import-before-corrected-fixtures.log). Testes cobrem CSV inválido/aspas/codificação, colunas, regras por linha/seleção, concorrência, blocos confirmados/incertos, prazos, retorno tardio, troca de destino e fechamento/reabertura. Lint do modal sem erros/avisos e build ERP aprovado. Três erros próprios apontados pelo TypeScript foram corrigidos; relatório final rhf-person-import-types-corrected.log continua reprovado fora do lote, sem diagnósticos nos arquivos abaixo. Nenhuma persistência real, alteração de SQL, transmissão ou deploy.

### Arquivos e linhas da importação de pessoas

Intervalos do checkout comparados à base 910b64ca; arquivos novos listam todo o conteúdo.

- `shared-utils/personImportFormSchemas.ts`: 1–27
- `erp/src/pages/App/Registrations/shared/modals/PersonImportModal.tsx`: 7–8, 20, 23, 26–31, 40–43, 45, 49, 53–54, 60, 62–70, 73–81, 83, 125, 129–172, 175, 186, 188, 194–253, 257–260, 262–291, 293, 298, 308–309, 318, 339, 346, 355, 357, 365–368, 372–374, 390, 392, 403, 432–434, 448–449, 464, 468, 502, 504, 524, 551, 554–555, 561–562
- `erp/src/pages/App/Registrations/shared/modals/PersonImportModal.test.tsx`: 1–115

## Reconciliação de produtos: contratos, consultas e confirmação de gravações

- **Sintomas e causas comprovadas:** serviços aceitavam entradas inválidas, contavam registros sem confirmação e ignoravam erros de leitura/gravação em NCM, categoria e atributos. Uma variação podia ser atualizada sem restringir seu produto. O proprietário descartava replaceExisting e os modais encerravam a validação antes do callback/fechavam após falha. Consultas ocultavam falhas de configuração/fornecedor, mapeavam incorretamente relações em lista, descartavam metadados/zero e tornavam JSON inválido uma lista vazia. Campos corretos sumiam antes de salvar, edições durante gravação eram marcadas como concluídas e o fornecedor inline não tinha opções para buscar. Valor inteiro fracionário também passava pelo card como string.
- **Solução aplicada:** contratos explícitos comuns para seleção, lote por intenção, consulta/paginação, NCM e correção parcial de produto/variações. Modais compartilham ciclo RHF real até o callback, validam opções/tipos atuais e mostram falha/incerteza. O seletor de categoria também impede alteração durante a confirmação, inclusive por callback de sugestões. O proprietário valida todo o lote antes do serviço e a consulta antes de enviar filtros; conserva snapshot de seleção, revisões e prazos. replaceExisting é encaminhado. Card conserva campos editáveis até confirmar, mantém alterações posteriores e valida valores fornecidos conforme tipos disponíveis sem exigir conclusão dos demais campos. Busca de fornecedor e campo visual foram compartilhados entre card/modal. Cada resposta dos serviços é verificada, atualizações de variação incluem o produto de origem, NCM conserva o JSON fiscal e atributos conservam metadados/zero; dados malformados são rejeitados. Erro não é exibido como sucesso/conformidade.
- **Limites:** categoria e demais operações compostas continuam com múltiplas chamadas; sem comprovar atomicidade, rollback ou concorrência remota. Validar formulário/estrutura não substitui autorização, integridade e demais regras contextuais no banco. Prazo limita a espera e não cancela a operação no provedor; não há retry automático ou aplicação de sucesso tardio à interface. Nenhuma tabela fiscal, regra tributária, SQL, dado comercial, SEFAZ ou deploy foi executado/alterado remotamente.
- **Provas:** 56 testes em seis arquivos (scratch/rhf-reconciliation-final-tests.log): 13 de mutação, seis de consulta, 12 de modais, dez do card, oito do proprietário e sete existentes de detecção. Os relatórios anteriores comprovam 13 falhas de serviço, seis de consulta e uma de atributo inteiro inline. Houve ajuste de seletores de teste para localizar o diálogo/campo correto e o texto durante carregamento, sem retirar validações. Lint das fontes sem erros/avisos; build ERP completo aprovado (rhf-reconciliation-verified-lint.log, rhf-reconciliation-verified-build.log). TypeScript global reprova fora dos arquivos deste lote, sem diagnósticos de reconciliação (rhf-reconciliation-verified-tsc.log). RHF e schemas reais; HTTP/Supabase e certos filhos de campos simulados. Sem validação visual no navegador ou consulta/transação real no banco.

### Arquivos e linhas da reconciliação

Intervalos do checkout comparados à base 910b64ca; arquivos novos listam todo o conteúdo.

- `erp/src/pages/App/Products/Reconciliation/ProductReconciliation.tsx`: 1–4, 54–59, 61–63, 65–74, 115–120, 122–136, 138–141, 246–248, 255–262
- `erp/src/pages/App/Products/Reconciliation/components/ReconciliationFiltersBar.tsx`: 1–2, 15–16, 20–21, 25, 68
- `erp/src/pages/App/Products/Reconciliation/components/ReconciliationProductCard.test.tsx`: 3–6, 12–20, 72–107
- `erp/src/pages/App/Products/Reconciliation/components/ReconciliationProductCard.tsx`: 1–2, 9–10, 21–23, 47, 51, 64–65, 94, 100, 149–150, 156–158, 160, 240, 268, 270, 281, 286–289, 295, 301, 320, 339, 417–418, 420, 452
- `erp/src/pages/App/Products/Reconciliation/modals/ApplyAttributeModal.tsx`: 1–3, 9, 38–42, 46, 73, 80, 108, 120, 152–153
- `erp/src/pages/App/Products/Reconciliation/modals/ApplyCategoryModal.tsx`: 1–2, 10, 22–26, 30, 57, 62, 64, 67, 71, 77, 89–90
- `erp/src/pages/App/Products/Reconciliation/modals/ApplyNcmModal.tsx`: 1–2, 9, 16–20, 24, 51, 61, 80–81
- `erp/src/pages/App/Products/Reconciliation/modals/ApplySupplierModal.tsx`: 1–2, 4–6, 11, 27–30, 32–33, 38, 40, 95, 119–120
- `erp/src/pages/App/Products/Reconciliation/services/reconciliationMutations.ts`: 2–16, 18–25, 28, 31–32, 34–42, 45–46, 48–55, 57–58, 61–62, 64–74, 76–77, 80, 82–91, 93–98, 100–105, 108
- `erp/src/pages/App/Products/Reconciliation/services/reconciliationQueries.ts`: 1, 16–23, 38–39, 127, 132, 167, 170–171, 181, 183
- `erp/src/pages/App/Products/Reconciliation/ProductReconciliation.test.tsx`: 1–73
- `erp/src/pages/App/Products/Reconciliation/components/SupplierSearchField.tsx`: 1–122
- `erp/src/pages/App/Products/Reconciliation/components/useReconciliationSupplierSearch.ts`: 1–44
- `erp/src/pages/App/Products/Reconciliation/modals/reconciliationForms.test.tsx`: 1–97
- `erp/src/pages/App/Products/Reconciliation/modals/useReconciliationSubmit.ts`: 1–45
- `erp/src/pages/App/Products/Reconciliation/services/reconciliationMutations.test.ts`: 1–59
- `erp/src/pages/App/Products/Reconciliation/services/reconciliationQueries.test.ts`: 1–37
- `shared-utils/reconciliationFormSchemas.ts`: 1–63


## Formulários financeiros: contratos e comandos atômicos preparados — em validação

A [revisão financeira de 15/10](../forms/revisao-financeiro-2026-10-15.md) registra as causas comprovadas no código e nos catálogos do Supabase operacional, os quatro proprietários alterados, schemas/serviços, a migration 20261015185418 ainda não aplicada e o roteiro de 15 checks sem escrita comercial. Baixas e recorrência passam localmente por comandos únicos, sem fallback para duas gravações. Parcelas conservam centavos/datas; trava comum, prazo dentro do resolver, erros visíveis e contexto do proprietário preservados. Primeira rodada: 31 testes locais aprovados, ampliada para 35; validação final e linhas exatas em fechamento. Nenhum DDL, fixture, Auth, deploy ou transmissão fiscal executado. Os quatro itens permanecem pendentes no inventário principal.

### Financeiro — fechamento local e limites de prova

54 testes em oito arquivos aprovados (`scratch/rhf-finance-final-tests.log`): 12 de proprietários pagar/lançamento, três receber, cinco Rede, quatro calendário/centavos, quatro ciclo RHF, 13 serviço real/composição com hook e oito consumidor do assistente. Lint das fontes passou sem avisos (`rhf-finance-lint-verified.log`). Transporte HTTP/Supabase simulado: não comprova RPC/RLS/concorrência/rollback no PostgreSQL. Foi acrescentado teste de resposta truncada/gateway/cardinalidade sem segundo INSERT; o serviço marca resultado incerto, e o aviso aparece dentro do modal. Guardas antes de I/O e de feedback impedem efeitos tardios ao desmontar durante o resolver. A primeira compilação passou; rechecagem final após revisão em andamento. O script local de advisors não foi executado porque contraria a política remota vigente. Nenhum segredo foi lido no banco nem incluído em logs de teste.

Arquivos/intervalos modificados do lote financeiro, contra baseline `94097f55` (linhas atuais; arquivos novos completos):

- `erp/src/pages/App/Finance/Payables/PayableModal.tsx`: 5–6, 9–10, 18–26, 32, 41, 46, 50, 52–59, 73–82, 85–90, 95, 114, 121–123, 125, 353, 357, 359–360, 372, 378–379
- `erp/src/pages/App/Finance/Receivables/ReceivableModal.tsx`: 5–6, 9–10, 18–25, 31, 40, 44, 46–53, 67–72, 75–80, 85, 104, 111–113, 115, 205, 209, 211–212, 224, 230–231
- `erp/src/pages/App/Finance/Transactions/index.tsx`: 7–8, 10–11, 34–36, 40, 53–55, 65–69, 81–87, 109, 129, 339, 341, 343–345, 352, 355, 365, 413, 416, 422–425
- `erp/src/pages/App/Finance/Settings/index.tsx`: 1, 4, 7–8, 22–24, 36–38, 40–53, 56–58, 71–74, 105–109, 304
- `erp/src/pages/App/Finance/financialForms.test.tsx`: 3, 11, 25, 54–64, 99–100, 118, 125–175
- `erp/src/pages/App/Finance/Receivables/receivableForm.test.tsx`: 7, 9, 13, 34, 40–42
- `erp/src/pages/App/Finance/Settings/index.test.tsx`: 3, 39–52
- `erp/src/pages/services/financeService.ts`: 2–4, 14–26, 75–100, 135–136, 138, 141–142, 146–152, 156–157, 159, 163–164, 214–215, 217, 220–221, 225–226, 228, 232–233, 289, 291, 293, 295, 298–300, 302, 307, 310, 315–316, 360–361, 366–368, 373, 378, 380–381
- `erp/src/pages/types/finance.type.ts`: 52–53
- `shared-utils/financialFormSchemas.ts`: 5–7, 38–43, 65–68, 84–89, 94–134
- `shared-utils/accountFormSchemas.ts`: 47
- `erp/src/pages/App/Finance/useFinancialOperation.ts`: 1–61
- `erp/src/pages/App/Finance/financialDomain.test.ts`: 1–27
- `erp/src/pages/App/Finance/useFinancialOperation.test.tsx`: 1–60
- `erp/src/pages/services/financeCommands.test.ts`: 1–98
- `supabase/migrations/20261015194122_complete_financial_form_commands.sql`: 1–222 (artefato original 20261015185418_complete_financial_form_commands.sql, mesmo conteúdo)
- `supabase/tests/financial_form_commands_catalog.sql`: 1–40

Fechamento financeiro local: **54 testes em oito arquivos, lint sem erros/avisos e build final aprovado (1m19s)**. Typecheck final registra 271 diagnósticos externos e zero nos arquivos do lote (`rhf-finance-final-tsc.log`); diff-check restrito ao lote passou. A revisão final não trouxe novos achados. Fonte/intervalos acima permanecem válidos; o plano financeiro registra hashes dos artefatos para autorização. Migration e 15 checks remotos continuam não executados; **71/127, 56 pendentes** no inventário principal. A conclusão dos comandos no PostgreSQL permanece sem prova remota de concorrência/rollback/replay.

### Financeiro — execução remota autorizada e checkpoint de formulários

O usuário autorizou expressamente a migration de referência 20261015185418 e os 15 checks, sem massa comercial, Auth, emissão ou deploy. Preflight de catálogo confirmou as estruturas ausentes e a política Rede original. Aplicação MCP `success=true`, registro remoto `20261015194122_complete_financial_form_commands`; arquivo local alinhado à versão remota sem alterar SQL/hash e sem reparar manualmente o histórico. **15/15 checks aprovados**. [Evidência estruturada](../audits/fiscal-2026-10-15/evidence/financial-form-commands-catalog-remote.json) e [matriz, objetos, arquivos, retenção e pendências](../forms/revisao-financeiro-2026-10-15.md). Advisors relevantes registrados com links de remediação, sem DDL adicional fora da autorização.

Os quatro formulários foram marcados como conferidos quanto ao resolver/payload/erros/ciclo; **ERP principal 75/127 (59,1%), 52 pendentes**. A contagem não atesta a operação comercial das novas RPCs: concorrência, rollback, replay e RLS por operador continuam sem fixtures e sem prova real. Nenhum dado comercial, segredo, Auth, deploy ou transmissão fiscal foi criado/alterado por testes. Mobile/catálogo continuam em conferência.

## Remoção do Botão "Não se aplica" e Persistência de Características Selecionadas na Pesquisa

- **Demanda e regra de negócio:**
  1. Remoção completa do botão/switch de "Não se aplica" das linhas de características técnicas do produto (`TechnicalFieldRow.tsx`) e de variações (`VariationTechnicalFieldItem.tsx`). O comportamento deve ser natural: se o operador preenche ou seleciona uma opção, ela se aplica; se não preenche ou deixa em branco, ela simplesmente não se aplica e não é informada, sem a necessidade de botão, switch, aviso ou rótulo.
  2. Correção visual de obrigatoriedade: o asterisco vermelho (`*`) é exibido unicamente em campos que são verdadeiramente obrigatórios (`field.isRequired`), sem marcar campos opcionais como obrigatórios quando preenchidos.
  3. Desbloqueio e sanitização de inputs: remoção de estados `disabled` atrelados a "Não se aplica" e normalização de valores legados de "Não se aplica" / "N/A" para string vazia `''`, permitindo edição livre e direta.
  4. Persistência de características preenchidas/selecionadas na busca: qualquer característica que já possua valor preenchido ou selecionado (ou tenha sido adicionada manualmente) deve permanecer visível na tela em seu respectivo grupo temático, mesmo quando o operador digita termos diferentes ou altera a pesquisa no campo de busca de características.

- **Arquivos modificados:**
  - `erp/src/pages/App/Products/components/tabs/technical/TechnicalFieldRow.tsx`: removido o botão switch `role="switch"` de "Se aplica?"; asterisco `*` condicionado estritamente a `field.isRequired`; input mantido sempre habilitado sem bloquear por "Não se aplica".
  - `erp/src/pages/App/Products/components/tabs/technical/TechnicalFieldRow.test.tsx`: atualizado teste para validar que campos opcionais não exibem switch e permitem preenchimento natural sem asterisco.
  - `erp/src/pages/App/Products/components/tabs/technical/technicalTabUtils.ts`: adicionada função utilitária `hasCharacteristicValue(field, formData)` para identificar valores efetivamente selecionados/preenchidos (incluindo dimensões canônicas e marca); simplificada a apuração de `computeTechnicalFieldItemState` e `isOptionalFieldSelected`.
  - `erp/src/pages/App/Products/components/tabs/technical/technicalTabUtils.test.ts`: adicionada suíte de testes unitários para `hasCharacteristicValue` validando marca, dimensões e características gerais.
  - `erp/src/pages/App/Products/components/tabs/technical/useProductTechnicalTab.ts`: ajustada a filtragem dos grupos de campos (`fieldGroups`) para manter sempre visíveis todas as características preenchidas/selecionadas (`filledOrManualOptionalFields`) independentemente do termo de pesquisa ativo, exibindo adicionalmente as características correspondentes à busca; quando a busca está vazia, todas as características da categoria são exibidas naturalmente.
  - `erp/src/pages/App/Products/components/tabs/technical/useProductTechnicalTab.test.ts`: adicionado teste unitário comprovando que características preenchidas permanecem visíveis durante e após alterações no campo de pesquisa.
  - `erp/src/pages/App/Products/components/variationTabs/VariationTechnicalFieldItem.tsx`: removido o switch de aplicabilidade e simplificada a resolução de estado do campo na variação.

- **Validação de testes:**
  - Executados com 100% de sucesso todos os 40 testes em `src/pages/App/Products/components/tabs/technical/` e 34 testes em `src/pages/App/Products/components/variationTabs/`.



## Cadastro de serviços — conferência do formulário e fronteira de gravação

**Problema e causa:** o formulário validava com RHF/Zod, mas preservava estado entre abertura/identidades, fechava durante gravação e não limitava a espera. O serviço de atualização ignorava erro na leitura do snapshot e podia gravar um objeto incompleto; o mapper permitia que um id antigo dentro de service_data substituísse a identidade da linha. O schema final propagava campos arbitrários e não distinguia contrato parcial de rascunho/finalização.

**Solução:** proprietário remonta por serviço e abertura, envia apenas valores editáveis parseados mais identidade/isDraft=false, mantém o resolver ativo durante a espera de até 30s, trava submissões/fechamento, exibe progresso/erros e não executa gravação/feedback após desmontagem. Resultado incerto bloqueia repetição nesta sessão. Serviço reutiliza schemas explícitos de finalização, rascunho e patch; falha de leitura impede escrita e metadados persistidos são preservados. Patch não injeta preços/defaults ausentes no rascunho. Valor zero e active=false continuam permitidos. Row id prevalece sobre id legado do JSON. Switch de ativo usa botão acessível por teclado.

**Prova:** 17 testes em dois arquivos (`scratch/rhf-service-final-tests.log`): nove do proprietário com RHF real, oito do serviço real com transporte simulado. Testes cobrem valores zero/inativo, rascunho incompleto, patch com metadados, falha antes de UPDATE, identidade, erro incerto, prazo, envio duplicado e troca/desmontagem do proprietário. CurrencyInput é simulado nos testes de componente. Lint das três fontes sem erros/avisos (`rhf-service-lint.log`). TypeScript global registra 275 erros externos e zero dos arquivos deste lote (`rhf-service-tsc.log`), diferente do checkpoint anterior devido a alterações externas simultâneas. Revisão de diff sem novos achados. Build do lote em andamento; inventário ainda não incrementado. Sem gravações no banco, Auth, deploy ou transmissão fiscal.

Arquivos/linhas modificados contra baseline `94097f55`:

- `erp/src/pages/App/Services/ServiceFormModal.tsx`: 1, 8, 16–17, 19, 21–45, 48–57, 61–62, 66, 76–77, 84–85, 87, 131, 138, 140, 146, 154
- `erp/src/pages/utils/serviceService.ts`: 3, 7, 9, 15–25, 54–55, 60–76, 83–103, 105–113
- `shared-utils/serviceFormSchema.ts`: 3–4, 7–8, 10–19
- `erp/src/pages/App/Services/ServiceFormModal.test.tsx`: 1–94
- `erp/src/pages/utils/serviceService.test.ts`: 1–54

Serviços: compilação do lote aprovada em 1m23s (`scratch/rhf-service-build.log`, avisos existentes de bundle). Inventário agora **76/127 (59,8%), 51 pendentes**. Não houve mudança de escopo dos demais proprietários; provas reais de navegação, persistência e concorrência não são substituídas pelos mocks.


## Configuração de APIs — confirmação da persistência e resolver do proprietário

**Problemas/causas comprovados:** saveConfiguration publicava memória/localStorage antes do Supabase e retornava true mesmo quando o banco devolvia error. getAllConfigurations trocava monthly_limit=0 por 10000 com operador ||. O schema/UI exigiam no mínimo dez chamadas/minuto apesar do default instalado gemini_image=5. O modal não reiniciava por abertura/serviço, não limitava gravação e podia fechar/emitir feedback de uma identidade anterior.

**Solução local:** schemas compartilhados explícitos de campos editáveis e comando; zero, false e custos fracionários são preservados; limite por minuto inteiro/positivo aceita todos os defaults instalados. A gravação valida de novo, exige retorno da mesma service_id e só então publica caches. Erro de banco não gera sucesso; resposta perdida/truncada/cardinalidade marca incerteza. O proprietário mantém RHF/resolver ativo na operação, trava desde antes da validação, espera até 30s, mostra erro/progresso dentro do modal e ignora respostas após desmontagem/troca. Não altera o guard crítico fiscal nem cria chave/flag global de produção.

**Validação:** 23 testes em três arquivos (`scratch/rhf-api-config-first-tests.log`): oito proprietário, oito serviço real/cache e sete regressões existentes do guard. RHF/Zod reais; transporte e ApiUsageGuard simulados no teste do formulário, guard real testado isoladamente. Lint das fontes sem erros/avisos (`rhf-api-config-lint.log`). Build e TS em andamento; item permanece pendente no inventário. Não houve rede para APIs externas, persistência remota, DDL, Auth, deploy ou transmissão fiscal.

Arquivos/linhas contra baseline `94097f55`:

- `erp/src/pages/App/ApiUsage/components/ApiConfigEditModal.tsx`: 1–3, 18–28, 30–63, 67, 75–76, 82–83, 90–91, 93, 116, 208, 255, 268, 273, 280
- `erp/src/services/apiMonitoring/apiConfigService.ts`: 5, 233, 295–297, 301–323, 325–331
- `shared-utils/apiConfigFormSchema.ts`: 14, 17–26
- `erp/src/pages/App/ApiUsage/components/ApiConfigEditModal.test.tsx`: 1–96
- `erp/src/services/apiMonitoring/__tests__/apiConfigService.test.ts`: 1–54

Configuração de APIs: revisão adicional encontrou possível substituição de configurações alheias ao salvar antes da primeira leitura; a publicação agora reutiliza baseline memória/localStorage e um teste garante que outra API desativada/com limite personalizado é preservada sem I/O extra. Rodada ampliada: **24 testes em três arquivos**, `scratch/rhf-api-config-final-tests.log`; revisão final sem novos achados. TypeScript da rodada prévia registra 275 erros externos, zero do lote. Nova compilação/verificações após o ajuste do cache em fechamento; item continua pendente até concluir os gates.

Configuração de APIs — intervalos finais após correção da publicação de cache, contra `94097f55`:

- `erp/src/pages/App/ApiUsage/components/ApiConfigEditModal.tsx`: 1–3, 18–28, 30–63, 67, 75–76, 82–83, 90–91, 93, 116, 208, 255, 268, 273, 280
- `erp/src/services/apiMonitoring/apiConfigService.ts`: 5, 199–209, 216, 231, 293–295, 299–321, 323–329
- `shared-utils/apiConfigFormSchema.ts`: 14, 17–26
- `erp/src/pages/App/ApiUsage/components/ApiConfigEditModal.test.tsx`: 1–96
- `erp/src/services/apiMonitoring/__tests__/apiConfigService.test.ts`: 1–62

Typecheck final: 275 diagnósticos globais, zero nos arquivos do lote (`scratch/rhf-api-config-final-tsc.log`). Lint final sem erros/avisos (`rhf-api-config-final-lint.log`). A revisão final do cache não trouxe novos achados. A compilação final passou em 1m25s (`scratch/rhf-api-config-final-build.log`, avisos existentes de bundle); o proprietário foi conferido e o inventário passou a **77/127 (60,6%), 50 pendentes**. Não há nova alteração de SQL nem prova de permissão/persistência real neste lote.


## Movimentação de estoque do pedido — validação do lote e confirmação das etapas

**Problemas e causas comprovados:** StockActionModal encerrava o resolver após validar só o motivo; criava movimentos em loop sem validar quantidades/identidades do lote, ignorava o retorno do serviço e mantinha Escape/fechamento/duplicação disponíveis. saveInventoryMove podia retornar undefined após INSERT sem linhas, e falha na atualização posterior do saldo não distinguia INSERT já confirmado. O cálculo de saldo retornava silenciosamente quando o produto não vinha da consulta ou a variação estava ausente. O mapper tratava uma entrada efetiva cujo label começa com Estorno como registro estornado, apesar do status explícito efetivo, e perdia unitPrice=0.

**Solução em validação:** schema explícito compartilhado para a operação do pedido e para criação de movimento, aceitando aliases existentes e ajuste negativo não zero. Todo o lote passa pelo resolver real antes do primeiro efeito. O serviço valida novamente e exige retorno de uma linha da mesma origem/produto/variação/tipo/quantidade/data/preço. Recebimento mantém o contrato de deduplicação existente, rejeitando replay com payload divergente. Falha após INSERT confirma a identidade do movimento persistido e sinaliza saldo pendente. O modal mantém RHF ativo durante a gravação, trava antes da validação, espera até 30s por movimento, mostra progresso/erro no diálogo e impede repetição nesta sessão após lote parcial ou resultado incerto. Ao mudar pedido/intenção/itens ou desmontar durante validação, não inicia/continua o lote antigo nem fecha outro contexto. Dados fiscais e metadata JSON não são reescritos por essas validações.

**Limites:** o lote continua sequencial; INSERT e saldo continuam em chamadas distintas. Não há afirmação de transação conjunta, rollback, idempotência entre sessões ou retomada automática segura. Recebimento pré-existente é confirmado contra payload, sem prometer recálculo retroativo do saldo. Recalcular com âncora de inventário ainda tem limite de 500 movimentos, fora desta correção do formulário. Nenhuma exclusão compensatória nem repetição automática foi adicionada. Backend/SQL mantêm as regras de permissão, pertencimento e identidade de teste.

**Prova local inicial:** 40 testes em seis arquivos (`scratch/rhf-order-stock-first-tests.log`), com RHF, Zod, serviço/mapper e cálculo de fallback reais conforme o caso; transporte/Supabase e recálculos são simulados nos testes do serviço, e o teste de modal simula o serviço. Inclui 12 do proprietário, 13 da criação/mapper, três do fallback, seis das regras de elegibilidade, cinco invariantes já existentes e um de saldo com âncora. Não equivale a prova PostgreSQL de concorrência/persistência. Sem banco, Auth, DDL, deploy ou transmissão SEFAZ. Build/TS/revisão em andamento; item ainda pendente no inventário.

Arquivos/intervalos atuais contra `94097f55`:

- `erp/src/pages/App/SalesOrder/OrderActions/StockActionModal.tsx`: 1, 6–7, 18–28, 31–37, 39–43, 53–55, 57–88, 90–91, 101, 127, 135–136, 148, 168, 176, 188
- `erp/src/pages/utils/inventoryService/inventoryMutationService.ts`: 3, 23–36, 38, 40–43, 44, 47–48, 50, 52–55, 57–61, 63–66, 68–71, 73–77
- `erp/src/pages/utils/inventoryService/inventoryMapper.ts`: 2, 73–74, 80, 108
- `erp/src/pages/utils/inventoryService/inventoryStockCalculator.ts`: 7, 13–14, 22, 26
- `shared-utils/inventoryMoveSchemas.ts`: 1–45
- `erp/src/pages/App/SalesOrder/OrderActions/StockActionModal.test.tsx`: 1–115
- `erp/src/pages/utils/inventoryService/inventoryMutationService.test.ts`: 1–100
- `erp/src/pages/utils/inventoryService/inventoryStockCalculator.test.ts`: 1–31

### Complemento — lançamento manual e entrada por compra

**Causas comprovadas:** o efeito de abertura do lançamento manual também dependia de `isSaving`, apagando quantidade/motivo ao iniciar a gravação. O resolver era encerrado antes do serviço. Na entrada por compra, somente data/observação eram validadas, linhas eram gravadas sem conferência integral prévia e `updatePurchase` não comprovava a linha/flag atualizada. Nenhum dos dois proprietários distinguia resultado incerto, lote parcial ou resposta de uma abertura anterior. A revisão de compatibilidade do serviço também identificou custos médios fracionários que podem ser persistidos arredondados em centavos; comparar o custo original por igualdade estrita rejeitava gravação válida.

**Solução local:** contratos compartilhados distintos para lançamento manual e compra. O ajuste manual transforma o saldo desejado na diferença, aceita zero/negativo conforme contrato anterior, rejeita diferença não finita e confere alteração do saldo durante a validação. Compra exige identidade, estado elegível, itens/quantidades/custos e catálogo completo antes do primeiro efeito. Ambos mantêm o resolver durante a operação, preservam campos, bloqueiam fechamento/duplicação enquanto gravam, limitam espera, mostram erros no diálogo e descartam respostas após troca/desmontagem. Compra exige confirmação de cada movimento e da conclusão, bloqueia repetição após falha parcial e não inicia conclusão com movimento não confirmado. A conclusão exige retorno da mesma compra com `stockProcessed=true`, preservando as regras SQL e filtrando compra cancelada. Erro de leitura interrompe `updatePurchase`. O serviço de movimento aceita arredondamento monetário em centavos e calcula o saldo pelo custo realmente retornado pelo banco; divergências continuam rejeitadas.

**Prova local parcial:** 77 testes em nove arquivos (`scratch/rhf-stock-entry-tests.log`); inclui 10 do lançamento manual, 13 da entrada por compra, 12 da ação de pedido, 15 da criação/mapper, três do fallback, 12 do serviço de compras e 12 regressões de elegibilidade/saldo/segurança. RHF e schemas reais; os testes dos proprietários simulam os serviços e os testes de serviços simulam Supabase/recálculos. Revisão do lançamento manual sem achados; revisão da compra, lint, TS e build em andamento. Inventário ainda não avançado. Sem banco, massa comercial, Auth, DDL, deploy ou transmissão. As limitações de atomicidade/replay entre sessões e de recálculo por âncora acima permanecem.

Arquivos/intervalos deste lote contra `94097f55`:

- `erp/src/pages/App/SalesOrder/OrderActions/StockActionModal.tsx`: 1, 6–7, 18–28, 31–37, 39–43, 53–55, 57–88, 90–91, 101, 127, 135–136, 148, 168, 176, 188
- `erp/src/pages/App/Stock/modals/StockLaunchModal.tsx`: 1, 7–8, 29–34, 40–43, 47–50, 52–56, 85, 87–90, 92–93, 95–119, 121–122, 135, 165, 174–175, 202, 232, 236, 242, 265, 269, 276, 283, 287, 289, 302, 324
- `erp/src/pages/App/Stock/Purchases/modals/PurchaseStockEntryModal.tsx`: 1, 9–10, 18–23, 25–28, 30–39, 42, 44, 47–48, 51–56, 59–61, 63–77, 83, 85, 87, 89–114, 116–117, 120, 132, 146, 154–155, 196, 198, 215, 224, 234
- `erp/src/pages/utils/inventoryService/inventoryMutationService.ts`: 3, 23–46, 48, 50–53, 54, 57–58, 60, 62–65, 67–71, 73–76, 78–87
- `erp/src/pages/utils/inventoryService/inventoryMapper.ts`: 2, 73–74, 80, 108
- `erp/src/pages/utils/inventoryService/inventoryStockCalculator.ts`: 7, 13–14, 22, 26
- `erp/src/pages/utils/purchaseService.ts`: 3, 215, 220, 222, 258–268
- `shared-utils/inventoryMoveSchemas.ts`: 1–78
- `erp/src/pages/App/SalesOrder/OrderActions/StockActionModal.test.tsx`: 1–115
- `erp/src/pages/App/Stock/modals/StockLaunchModal.test.tsx`: 1–108
- `erp/src/pages/App/Stock/Purchases/modals/PurchaseStockEntryModal.test.tsx`: 1–103
- `erp/src/pages/utils/inventoryService/inventoryMutationService.test.ts`: 1–117
- `erp/src/pages/utils/inventoryService/inventoryStockCalculator.test.ts`: 1–31
- `erp/src/pages/utils/__tests__/purchaseService.test.ts`: 259–286

**Fechamento do lote de estoque:** a revisão da conclusão encontrou que `neq(status,cancelled)` também excluía status SQL nulo, embora o mapper o normalize para `ordered`. O filtro final usa `status.neq.cancelled,status.is.null`; o teste de confirmação cobre status bruto nulo. Removido import sem uso do serviço. A revisão posterior não encontrou novos achados. Os **77 testes em nove arquivos** passaram novamente (`scratch/rhf-stock-entry-final-tests.log`), lint final sem erros/avisos (`rhf-stock-entry-final-lint.log`), TS global com 275 diagnósticos externos e zero do lote (`rhf-stock-entry-final-tsc.log`), compilação final aprovada em **1m40s** (`rhf-stock-entry-final-build.log`). A compilação inclui avisos de tamanho de bundles e da importação `crypto` no módulo de garantia alterado em paralelo; esse módulo não foi modificado nesta correção. Três proprietários conferidos: inventário principal passa a **80/127 (63,0%), 47 pendentes**, sem declarar conclusão global ou prova de negócio no PostgreSQL.


## Inventário — escopo, contagem parcial e conclusão no ciclo do resolver

**Problemas/causas comprovados:** o modal de escopo validava só campos básicos e encerrava RHF antes de chamar um callback tipado void que iniciava o rascunho de modo assíncrono. A revisão não possuía resolver antes da consulta/confirmação. O workflow permitia novas contagens durante a conclusão e não congelava a edição após falha com submissão já persistida; callbacks antigos podiam alcançar outra abertura e esperas não tinham limite. O schema de rascunho rejeitava a linha manual ainda sem produto que a interface permite adicionar. A revisão/conclusão precisa distinguir linha sem contagem (que não gera ajuste) de linha contada sem produto (inválida).

**Solução em validação:** o modal de escopo reutiliza o contrato de snapshot completo e aguarda a confirmação dentro do resolver; erro/prazo/opções indisponíveis não viram sucesso. O workflow retorna confirmação booleana, trava início/salvar/concluir e campos filhos, mantém a fila de snapshots validada antes do IndexedDB e impõe limites de espera. Identidade de abertura e montagem descartam comandos/respostas antigos; voltar do código remoto tardio conserva código LOCAL único. Rascunhos aceitam identidades ainda incompletas com números válidos; consulta/conclusão aceitam linha manual sem contagem, mas nenhuma linha contada sem produto pode seguir. Conclusão confere a aritmética das diferenças, congela contagens durante envio e após submissão persistida/resultado incerto, sem reenvio automático. Contexto fiscal, numeração de NF e snapshots de emissão não foram alterados.

**Prova inicial:** 25 testes de escopo/workflow (RHF/schemas reais; IndexedDB simulado por fake-indexeddb; sincronização/código/finalização remotos simulados). Logs scratch/rhf-inventory-workflow-guards-tests.log. Revisão do código, integração do modal de revisão, lint/TS/build ainda em andamento. Inventário principal permanece 80/127, sem incrementar pendências em validação. Nenhuma escrita de negócio remota, SQL/migration, Auth, SEFAZ ou deploy. Estes testes não comprovam transação/rollback/concorrência no PostgreSQL.

Arquivos/intervalos atuais contra 94097f55:

- `shared-utils/inventoryAuditFormSchemas.ts`: 14–34, 46, 53, 62–63
- `erp/src/pages/App/Stock/Inventory/hooks/useInventoryAuditWorkflow.ts`: 17, 43, 61–79, 117, 120–121, 128, 131, 133, 141–142, 152, 156–157, 170, 173, 175–176, 178–181, 257–258, 266–270, 273, 275–276, 303–304, 306, 310, 319–326, 328–334, 336–338, 341, 343–351, 354–355, 358–360, 378, 384–392, 395–396, 401, 439–444, 450–464, 466–467, 469–470, 488
- `erp/src/pages/App/Stock/Inventory/hooks/useInventoryAuditWorkflow.test.tsx`: 29–30, 38–43, 47–49, 60, 196–321
- `erp/src/pages/App/Stock/Inventory/modals/InventoryAuditModal.tsx`: 24–27, 49–50, 58, 140, 149–151, 173, 176, 184, 194, 206, 216
- `erp/src/pages/App/Stock/Inventory/modals/InventoryScopeModal.tsx`: 1, 3–4, 20, 41, 46–63, 65–106, 107, 128–130, 139–144, 146–161, 169–170, 178
- `erp/src/pages/App/Stock/Inventory/modals/InventoryScopeModal.test.tsx`: 1–157

### Integração e restauração do inventário — prova ampliada

A revisão encontrou uma corrida real: rascunho/outbox eram consultados sem bloquear o novo escopo. A restauração agora possui prazo, confirmação de ambas as leituras, progresso/erro no proprietário e comandos bloqueados até terminar. Erro não libera um inventário novo sob a identidade antiga; fechamento/troca descarta a leitura tardia. O modal proprietário desmonta por abertura/sessão/cópia. A fila local interrompe novas gravações daquela abertura após timeout incerto, evitando reenvio silencioso; a conclusão confirmada também não é repetida.

O caminho Duplicar recebia copiedItems, mas o workflow os ignorava. A seleção foi reconectada ao escopo real, que usa produtos/variações e saldos atuais e não reaplica contagens/etiquetas antigas. Cópia vazia, duplicada ou com produto/variação indisponível é informada antes de iniciar. A mensagem anterior anunciava inventário criado antes da confirmação; agora informa apenas a seleção. A diferença entre consulta, rascunho incompleto e conclusão foi mantida; nenhuma linha contada pode ser omitida ou ter identidade duplicada na revisão. Consulta de revisão executa resolver antes do Supabase, preserva a paginação e o fallback offline/erro com estimativas locais explícitas, interrompe próximas páginas após prazo/contexto inválido e rejeita saldos retornados não finitos. Confirmação aguarda o callback no resolver e apresenta falha/pendência no diálogo.

Prova atual: **77 testes em 13 arquivos** (scratch/rhf-inventory-final-tests.log), com 19 do escopo, 17 da revisão, 16 do workflow, três do proprietário e 22 regressões existentes dos serviços/telas. Lint final sem erros/avisos (rhf-inventory-final-lint.log). Typecheck ERP: 275 diagnósticos globais externos e zero nos arquivos do lote (rhf-inventory-final-tsc.log), depois de corrigir seis incompatibilidades locais de tipos de snapshot/fixture. Build em andamento; os quatro itens permanecem pendentes até fechar a compilação e os gates. Serviços de rede são simulados; fake-indexeddb verifica as transações/filas locais, sem comprovar comportamento PostgreSQL nem dispositivo mobile real.

Intervalos finais desta implementação contra 94097f55:

- `shared-utils/inventoryAuditFormSchemas.ts`: 14–34, 46, 53, 62–63, 68–71
- `erp/src/pages/App/Stock/Inventory/hooks/useInventoryAuditWorkflow.ts`: 6, 16, 30, 41–42, 60–81, 119, 122–124, 131, 134, 136, 144–146, 156, 160–161, 169, 175–176, 178, 180, 182–183, 185–188, 210, 212, 262, 265–267, 273, 275–279, 282, 284–285, 312–313, 315, 319, 328–335, 337–343, 345–347, 350, 352–360, 363–364, 367–369, 387, 393–401, 404–405, 410, 448–454, 460–474, 476–477, 479–480, 498–500
- `erp/src/pages/App/Stock/Inventory/hooks/useInventoryAuditWorkflow.test.tsx`: 29–32, 40–45, 49–51, 62, 196–197, 200–396
- `erp/src/pages/App/Stock/Inventory/modals/InventoryAuditModal.tsx`: 24–27, 49–53, 60, 135–140, 146, 148, 156–159, 181, 184, 187, 192, 202, 214, 224
- `erp/src/pages/App/Stock/Inventory/modals/InventoryAuditModal.test.tsx`: 1–37
- `erp/src/pages/App/Stock/Inventory/modals/InventoryScopeModal.tsx`: 1, 3–4, 11, 20, 22, 30, 44, 46, 50–60, 62–71, 73–140, 161–163, 172–177, 179–194, 202–203, 211
- `erp/src/pages/App/Stock/Inventory/modals/InventoryScopeModal.test.tsx`: 1–184
- `erp/src/pages/App/Stock/Inventory/modals/InventoryReviewModal.tsx`: 1, 4–13, 22, 25–29, 37, 39–59, 62–64, 67–68, 69, 104–105, 110–111, 120–121, 123–180, 182–183, 188–228, 235, 247–250, 258–259, 365–367, 373–375
- `erp/src/pages/App/Stock/Inventory/modals/InventoryReviewModal.test.tsx`: 2–7, 10, 15–38, 68, 79–214
- `erp/src/pages/App/Stock/Inventory/hooks/useInventoryScopeBuilder.ts`: 152, 154, 163
- `erp/src/pages/App/Stock/Inventory/components/InventoryAuditContextMenu.tsx`: 78

**Fechamento desta rodada:** build ERP aprovado em **2m07s** (scratch/rhf-inventory-build.log), lint final sem erros/avisos, 77 testes em 13 arquivos aprovados e TS global com 275 diagnósticos fora do lote. A correção da restauração foi comprovada por leitura atrasada/falha na outbox e pela UI que não exibe Novo Inventário enquanto a leitura não termina. Quatro caminhos do inventário principal passaram a conferidos: **84/127 (66,1%), 43 pendentes**. Sem banco, dados comerciais, Auth, SQL/migration, deploy ou SEFAZ.

**Conferência mobile limitada:** a execução inicial em scratch/rhf-inventory-mobile-regressions.log revelou duas condições anteriores ao lote: o runner erp/vitest.mobile.config.ts força parser TSX sobre arquivos .ts com generics (falha ao coletar inventoryFinalizer) e o identificador MH:L:000XXX|SKU-1 é tratado como qr válido, contrariando o teste do scanner. Os arquivos do scanner/catalogo SQLite estavam idênticos a 94097f55, e esses testes não importam o schema alterado. O config nativo mobile não carregou porque vitest/config não está instalado naquele pacote (rhf-inventory-mobile-finalizer-native-config.log). Um runner temporário que conserva parser por extensão (scratch/vitest-mobile-inventory.config.mjs, sem alterar dependências/código de produto) permitiu executar **6/6 regressões** de finalização/conflitos mobile (rhf-inventory-mobile-parser-corrected.log). A falha QR real segue registrada para o lote mobile; não foi ocultada nem convertida em prova de seus formulários.

**Limites:** rede/RPC simulados e armazenamento local testado via fake-indexeddb; nenhum teste em dispositivo real ou PostgreSQL. O timeout não cancela operação já iniciada; confirmação incerta bloqueia repetição e exige conferir o estado. Contratos remotos de finalização, outbox e metadata fiscal não foram modificados. Editor ERP InventoryMoveEditModal foi localizado como dormente, apesar de montado no histórico: não há chamada de setEditingMove com valor não nulo. O consumidor ativo de updateInventoryMove é PriceHistoryModal, distinto e ainda pendente. Não foi reativada edição do ledger nesta rodada.

## Histórico de preços — resolver e comando transacional de lote em validação

**Problemas e causas comprovados:** PriceHistoryModal validava quantidade/custo, mas encerrava o resolver antes da gravação; CurrencyInput não estava importado, impedindo abrir a edição. Consulta e gravação não possuíam limites de espera nem proteção contra respostas de outra abertura. updateInventoryMove ignorava erros/ausência de confirmação do UPDATE e gravava saldo em outra chamada pelo serviço genérico de produtos, que pode ignorar falhas de variações. Seu delta simples incluía entrada revertida/cancelada e entrada anterior a uma contagem absoluta de inventário. Dois clientes podiam ler o mesmo saldo e perder uma alteração. Conferir o saldo depois da chamada não elimina essa corrida.

**Correção implementada localmente:** consulta e edição têm schemas explícitos; RHF aguarda a gravação e a recarga, com trava, proprietário por abertura/produto, erros visíveis e prazos de15s/30s. Zero permanece válido. Snapshot de produto/quantidade/custo anterior segue com os valores parseados. Gravação sem confirmação bloqueia repetição naquela abertura. O serviço chama update_inventory_batch, sem fallback para UPDATE de movimento/saldo no cliente; exige snapshot e somente quantidade/custo. A consulta anterior possui prazo próprio de10s e não inicia RPC se terminar tarde. O serviço confere ID/payload/delta da confirmação, publica o retorno real e invalida consultas de produtos. Falhas SQL conhecidas viram mensagens em português, sem tokens internos. A migration aditiva prepara autenticação/permissão productConfig e locks produto→movimento→variação, atualizando movimento e saldo na mesma transação. Entrada revertida, âncora própria/posterior e contagem revertida com previousStock conservam a regra de saldo existente; cronologia ambígua falha antes das escritas. Fração incompatível com stock INTEGER e valores não finitos são rejeitados. RLS e triggers existentes executam normalmente; não há nova coluna/tabela nem mudança na política fiscal global. Enquanto a RPC não estiver aplicada, o serviço apresenta indisponibilidade e não retorna ao caminho inseguro. Rollback de implantação: desativar o comando no frontend e manter as funções/histórico aditivos.

**Arquivos/intervalos deste lote contra 94097f55:**

- erp/src/pages/App/Products/modals/PriceHistoryModal.tsx:1, 3–5, 23–26, 37–40, 42–47, 49, 51, 56–57, 60–62, 64–72, 74–77, 79–82, 84, 86, 90, 92–117, 124, 154, 172–173, 187–188, 203–207, 215, 364, 388–390, 421–422, 434–435, 445, 447, 449–451.
- shared-utils/catalogFormSchemas.ts:40–47; shared-utils/inventoryMoveSchemas.ts:70–78.
- erp/src/pages/utils/inventoryService/inventoryMutationService.ts:3–6, 18–19, 138–193. A criação de movimento já conferida na rodada anterior foi preservada.
- erp/src/pages/App/Products/modals/PriceHistoryModal.test.tsx:1–124; erp/src/pages/utils/inventoryService/inventoryUpdateService.test.ts:1–124.
- supabase/migrations/20261015232214_update_inventory_batch_atomically.sql:1–255 (preparada/autorizada como20261015222500, renomeada para o registro remoto sem mudar conteúdo); supabase/tests/inventory_batch_command_catalog.sql:1–60.
- docs/audits/fiscal-2026-10-15/evidence/inventory-batch-schema-readonly.json e inventory-batch-advisors-before.json: novos registros completos somente de catálogo/funções/advisors, sem dados comerciais ou credenciais.

**Provas locais atuais:** 52 testes em quatro arquivos (scratch/rhf-price-history-final-tests.log), com RHF/Zod/CurrencyInput reais e serviços ou transporte simulados. Os testes incluem prazo da consulta anterior sem iniciar RPC tardia, baseline divergente, retorno de outro ID com os demais campos corretos, custo arredondado/zero, ausência de RPC sem fallback, resposta incerta/replay e mudança de proprietário. Lint final sem erros/avisos (rhf-price-history-final-lint.log). Revisões independentes do SQL/serviço e ciclo de vida sem achados restantes; SQL não é executado por esta suíte local. A instalação e os helpers remotos estão registrados no fechamento abaixo. Build final aprovado em 1m51s (rhf-price-history-final-build.log), com avisos de tamanho de bundles e de módulos de garantia alterados em paralelo. TS global com 273 diagnósticos externos e zero nos arquivos do lote (rhf-price-history-final-tsc.log); dois erros anteriores do modal foram eliminados com o import correto. As provas iniciais da versão cliente foram substituídas por estes testes da fronteira RPC; não são evidência do novo SQL.

**Consulta de referência anterior à aplicação, somente leitura:** projeto hkoxhourxwlddgsfdgws confirmado contra erp/.env.local. O banco confirma inventory_moves.product_id/variation_id text, quantity numeric e custo em centavos; saldo de variação integer e pai numeric. A função de sincronização do SKU único não grava stock. A migration financeira autorizada existia como20261015194122; a nova migration/RPC de lotes ainda não existia naquele catálogo. Advisors anteriores registram seis avisos de segurança e sete de performance, sem modificar políticas/objetos. Foi usada a verificação remota: o script npm legado aponta para --local, incompatível com a política canônica. [Tipos/funções](../audits/fiscal-2026-10-15/evidence/inventory-batch-schema-readonly.json) e [baseline de advisors](../audits/fiscal-2026-10-15/evidence/inventory-batch-advisors-before.json).

**Aplicação autorizada e fechamento do formulário:** o usuário autorizou somente a migration preparada20261015222500 e os15 checks, sem comando comercial, dados, Auth ou transmissão. Projeto/configuração e ausência prévia da RPC foram novamente conferidos; SHA256 aprovado79B5D6959A33C98BB7B5BBF9C48A4BBD8DA6C80EA872BDDAB6A8D9980C9BF9C4 preservado. apply_migration retornou sucesso e o histórico registrou20261015232214_update_inventory_batch_atomically; arquivo local renomeado para o mesmo registro, sem reaplicar. **15/15 checks de catálogo/helpers puros aprovados**: assinatura, cinco funções SECURITY INVOKER, search_path vazio, prazos, grants, metadata segura, números finitos/zero, status e permissões. Advisors depois conservam seis avisos de segurança e sete de performance anteriores. [Evidência remota completa](../audits/fiscal-2026-10-15/evidence/inventory-batch-command-catalog-remote.json).

Nenhum dado comercial criado/alterado, edição real de lote, Auth, deploy ou SEFAZ. Instalação/helpers foram exercitados; comando de negócio, atomicidade/rollback/concorrência e RLS com fixtures **não executados** e não inferidos de mocks/checks. Escritores legados fora da RPC não aderem automaticamente aos seus locks e os triggers de custo existentes continuam ativos; a política de CMV imutável não é declarada resolvida. Um caminho de formulário conferido: **85/127 (66,9%), 42 pendentes**, sem declarar conclusão global.

## Etiquetas — proprietário de logotipos, rótulos e confirmação local

**Problemas e causas comprovados:** writeJson capturava quota/Storage indisponível e os métodos de logos/rótulos retornavam void. O hook publicava o array antes de persistir, encerrava/limpava o formulário e anunciava sucesso mesmo na falha. A expressão de extraFields escolhia config.extraFields apesar de existir edição, podendo perder campos anteriores ou executar JSON.parse(undefined). Exclusão e seleção para fila não executavam resolver. Erros/pending adicionados aos filhos inicialmente não eram repassados pela fachada real; a revisão localizou esse elo e o teste de integração reproduziu a diferença. Logos padrão reaparecem sempre na leitura; anunciar sua exclusão era uma confirmação falsa.

**Solução implementada, fechamento em andamento:** writeJson confirma o mesmo JSON por setItem/getItem; logos/rótulos devolvem boolean e o proprietário exige true antes de estado/fechamento/sucesso. RHF valida as cinco intenções (criar logo, salvar rótulo, excluir cada tipo e adicionar à fila) com valores parseados, incluindo extraFields completos. Falhas mantêm campos/estado e aparecem em toast/inline. Trava comum, mounted e revisão por abertura/categoria/edição bloqueiam comandos antigos. UUID evita colisão de IDs locais. Os padrões continuam permanentes, conforme a leitura já existente; a remoção de logos próprios é persistente. Status/erro são encaminhados por useLabelPrintingState→ModalsSection→filhos, com campos e fechamento desabilitados durante o resolver. Modelos de grade/hidden IDs conservam seu contrato void/fallback anterior, sem declarar seus formulários concluídos.

**Arquivos/intervalos contra94097f55:**

- shared-utils/labelDesignFormSchemas.ts:349, 377–380.
- erp/src/pages/App/Stock/LabelPrinting/hooks/useLabelModalsAndAssets.ts:1, 5–6, 57–78, 95–115, 117–127, 130–151, 153–183, 185–194, 198–199.
- erp/src/pages/App/Stock/LabelPrinting/hooks/useLabelPrintingState.ts:235–236.
- erp/src/pages/App/Stock/LabelPrinting/services/labelStorageService.ts:29–42, 112–114, 129–131; __tests__/labelStorageService.test.ts:32–139.
- erp/src/pages/App/Stock/LabelPrinting/modals/LabelNewAssetModal.tsx:9–11, 21–22, 25, 34, 37, 57–58, 77, 88–89, 97.
- erp/src/pages/App/Stock/LabelPrinting/modals/LabelCustomDesignModal.tsx:14–16, 29–30, 33, 42, 45, 66, 74–75, 88, 137, 165–166, 174.
- erp/src/pages/App/Stock/LabelPrinting/sections/ModalsSection.tsx:67–68, 184–185, 207–208; types/LabelPrintingSections.types.ts:92–94, 121.
- erp/src/pages/App/Stock/LabelPrinting/__tests__/labelAssetOwners.test.tsx:1–140; __tests__/labelAssetPage.test.tsx:1–47.

**Provas e limites atuais:** 51 testes em cinco arquivos (scratch/rhf-label-assets-tests.log):14 do proprietário com RHF/schemas/armazenamento reais no Happy DOM, dois pela fachada/seção/modais reais (peers fora do escopo simulados), 15 do armazenamento e20 regressões de layouts/fallback. Quota, ausência/escrita silenciosa/readback, zero/metadata, comandos antigos, duplicidade, erros visíveis e exclusão persistente foram exercitados. Revisão posterior sem achados restantes. Lint com zero erros e um aviso anterior useEffect queue em useLabelPrintingState:90; TS/build em andamento. Nenhuma operação Supabase/biblioteca remota, dado comercial, Auth, SQL, deploy ou SEFAZ. Não prova concorrência entre abas/dispositivos, persistência de navegador real ou os fluxos remotos de imagens/grade. Inventário ainda85/127, sem incremento nesta etapa.

**Fechamento do lote local de etiquetas:** 51 testes em cinco arquivos aprovados, revisão final sem achados restantes, build aprovado em **1m43s** (scratch/rhf-label-assets-build.log). Lint com zero erros e um aviso anterior de queue no effect da fachada (rhf-label-assets-lint.log). TS global com 276 diagnósticos; o único no módulo de etiquetas é o erro anterior Index.tsx:38 do contrato de cópia para categoria Promise<void|false> vsPromise<void>, já presente no log anterior de preços. Não há diagnóstico nos demais arquivos alterados ou nos novos testes/schemas (rhf-label-assets-final-tsc.log). Esse contrato de cópia segue na lista de manutenção; não foi ocultado nem alterado para passar o gate. Proprietário e dois filhos conferidos: **88/127 (69,3%), 39 pendentes**. Biblioteca remota, upload inicial, criador dormente, grade e persistência multiaba/dispositivo não são cobertos por esse fechamento. Nenhum Supabase, dados comerciais, Auth, SQL, deploy ou SEFAZ nesta rodada.

## Ações pós-venda: modal de Informações da Entrega e renomeação de Emissão de NF de saída

- **Problema identificado:**
  1. O cabeçalho do modal de ações pós-venda exibia um rótulo redundante "Cadastrado".
  2. As ações de entrega ficavam misturadas na grade principal do modal pós-venda.
  3. O botão de informações sobre a entrega não deve reter checkmark ou borda verde; essa marcação visual deve pertencer exclusivamente aos botões de ação executados dentro do modal de entrega.
  4. O botão "Emitir nota fiscal de saída" precisava ser renomeado para "Emissão de NF de saída".
  5. Testes automatizados que mockavam apenas `useAuth` falhavam ao carregar o componente devido ao import direto de `AuthContext`.

- **Causa raiz técnica:**
  1. O cabeçalho renderizava estaticamente o badge com texto "Cadastrado".
  2. Falta de um modal dedicado agrupando as ações `printShippingOrder`, `sendShippingOrder`, `sendCustomerOrder` e `sendCustomerOrderDirectApi`.
  3. `orderActionsConfig.ts` continha o rótulo `'Emitir nota fiscal de saída'` para a ação `issueNfe`.
  4. Componentes importavam `AuthContext` diretamente via `useContext(AuthContext)` em vez do hook `useAuth()`.

- **Solução implementada:**
  1. Remoção do rótulo "Cadastrado" do cabeçalho em `PostOrderActionsModal.tsx`.
  2. Criação do botão "Envio de informações sobre a entrega" na grade principal, abrindo o componente `DeliveryInfoModal.tsx`. O botão externo não recebe checkmark ou anel verde ao ser clicado.
  3. Criação de `DeliveryInfoModal.tsx` com as ações "Enviar para o Cliente", "Enviar para a Equipe" e "Imprimir informações da entrega", além do botão Beta de envio direto via API para administradores. Os botões internos recebem o checkmark (`bi-check`) e borda verde (`border-emerald-500 ring-2 ring-emerald-500`) ao serem executados.
  4. Renomeação do botão `issueNfe` para "Emissão de NF de saída" em `orderActionsConfig.ts`.
  5. Refatoração do acesso ao contexto para usar `useAuth()`, com mock adequado em `PostOrderActionsModal.test.tsx` e consultas de testes ajustadas.

- **Arquivos modificados:**
  - `erp/src/pages/App/SalesOrder/OrderActions/orderActionsConfig.ts`
  - `erp/src/pages/App/SalesOrder/OrderActions/PostOrderActionsModal.tsx`
  - `erp/src/pages/App/SalesOrder/OrderActions/DeliveryInfoModal.tsx`
  - `erp/src/pages/App/SalesOrder/OrderActions/PostOrderActionsModal.test.tsx`
  - `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/useNfeEmission.test.tsx`
  - `erp/tests/e2e/fiscal/fiscal-ui-navigation.spec.ts`

- **Validação e testes de não-regressão:**
  - `PostOrderActionsModal.test.tsx`: 9/9 testes aprovados.
  - `useNfeEmission.test.tsx`: 69/69 testes aprovados.
  - `postSaleActions.test.ts`: 6/6 testes aprovados.
  - Suíte completa `src/pages/App/SalesOrder/OrderActions`: 17 arquivos e 167 testes aprovados.
  - Lint verificado com 0 erros.

## Atualização de cliente no pedido de venda: separação entre cadastro operacional e artefato de teste

- **Problema identificado:**
  Ao tentar atualizar dados (como número de celular) de um cliente operacional real (ex: "Matheus Morante dos Santos") a partir do pedido de venda ou do modal de clientes, a operação falhava com o erro:
  `Error: Todos os artefatos devem pertencer à mesma execução e operador.` originado em `assertTestArtifactLinks` / `assertOwnedByTestContext` via `updatePerson`.

- **Causa raiz técnica comprovada:**
  Em modo de desenvolvimento (`import.meta.env.DEV`), administradores autenticados têm um contexto de teste (`testArtifactContext`) vinculado em `sessionStorage` pelo `AuthContext` para permitir alternar o modo de teste ao cadastrar novos registros.
  No entanto, em `personMutationService.ts` (`updatePerson`), a verificação de `assertOwnedByTestContext` era chamada incondicionalmente para qualquer cliente encontrado no banco sempre que `getTestArtifactContext()` estivesse ativo. Como clientes operacionais reais não possuem a flag e metadados `testArtifact`, a asserção tratava o cliente real como se fosse um artefato de teste não vinculado, bloqueando a atualização legítima.

- **Solução técnica implementada:**
  1. Em `personMutationService.ts` (`updatePerson`), adicionada a checagem `isIdentifiedTestArtifact(currentPersonForOwnership)` antes de acionar `assertOwnedByTestContext`, alinhando o comportamento ao que já é praticado em `orderUpdateService.ts` e `productMutationService.ts`.
  2. Clientes operacionais reais (`!isIdentifiedTestArtifact`) agora são atualizados normalmente sem exigência ou estampa de contexto de teste.
  3. Artefatos de teste legítimos continuam tendo sua posse validada (`assertOwnedByTestContext`) e sua identificação preservada durante atualizações.
  4. Artefatos de teste pertencentes a outras execuções continuam sendo estritamente bloqueados contra mutação acidental.
  5. Atualizados os testes unitários em `personMutationService.test.ts` para validar a permissão de atualização de clientes operacionais e o bloqueio de artefatos de terceiros.

- **Arquivos e linhas modificados:**
  - `erp/src/pages/utils/personService/personMutationService.ts`
  - `erp/src/pages/utils/personService/personMutationService.test.ts`

- **Validação e não-regressão:**
  - `personMutationService.test.ts`: 7/7 testes aprovados.
  - Suíte completa `personService`: 5 arquivos e 30 testes aprovados.
  - `usePersonForm.test.tsx`: 6/6 testes aprovados.
  - ESLint nos arquivos modificados: 0 erros e 0 warnings.

## Refatoração de princípios de engenharia no módulo de pessoas e clientes (`usePersonForm`)

- **Problema identificado:**
  O hook `usePersonForm.ts` constituía um monólito de 522 linhas acumulando múltiplas responsabilidades desvinculadas:
  1. Inicialização de estado e resolução de rota de entrega.
  2. Mutação de campos de endereço, consulta assíncrona de CEP via ViaCEP com debounce/invalidação e controle de concorrência por revisão, além de atualização automática de "Consumidor Final" no estado.
  3. Gerenciamento da coleção de contatos adicionais (adicionar, remover, atualizar campos).
  4. Atribuição e alternância de papéis de colaboradores (`roles`), seleção de cargo primário e sincronização assíncrona com perfis de autenticação (`user_profiles`).
  5. Pipeline de submissão com bifurcações condicionais espalhadas (`if (isEmployee) ... else if (collectionName === 'suppliers') ...`) misturando regras específicas de colaboradores, fornecedores e clientes com validação de duplicatas e chamadas de mutação.

- **Princípios de software aplicados:**
  1. **SRP (Single Responsibility Principle):** Cada preocupação foi extraída para seu próprio hook ou utilitário especializado:
     - `personFormState.ts`: Helpers puros de domínio (`EMPTY_PERSON_ADDRESS`, `createInitialPersonState`, `isFinalConsumer`, `resolveShippingRouteUrl`).
     - `usePersonAddress.ts`: Responsável exclusivamente pelo ciclo de vida do endereço, busca de CEP e detecção de Consumidor Final.
     - `usePersonContacts.ts`: Gerenciamento da lista dinâmica de contatos adicionais.
     - `useEmployeeRoles.ts`: Gestão de cargos/papéis de colaborador e sincronização de email com perfil de autenticação.
     - `personSubmitStrategy.ts`: Estratégias desacopladas de submissão por tipo de coleção.
     - `usePersonSubmit.ts`: Orquestração do pipeline de submissão com React Hook Form.
  2. **OCP (Open/Closed Principle) & Strategy Pattern:** Substituição de branches condicionais pela interface polimórfica `PersonCollectionStrategy`:
     - `customerStrategy`: Permite duplicidade com aviso amigável (`toast.warn`), lida com opções de artefato de teste e sanitiza cargo vazio.
     - `employeeStrategy`: Bloqueia e-mails e duplicatas existentes (`toast.error`), garante cargo primário (`getPrimaryRole`) e sincroniza com `user_profiles`.
     - `supplierStrategy`: Bloqueia nomes e cadastros duplicados (`toast.error`).
     Novas entidades ou coleções podem ser adicionadas implementando `PersonCollectionStrategy` sem modificar a lógica dos formulários.
  3. **Facade Pattern & 100% Retrocompatibilidade:**
     `usePersonForm.ts` foi mantido como uma fachada coesa e concisa, delegando para os sub-hooks e expondo a interface pública exata consumida por `PersonFormModal.tsx` e `CustomerData.tsx`, além da constante `EMPLOYEE_ROLES`.
  4. **DIP (Dependency Inversion Principle) & Clean Architecture:**
     Lógicas puras de cálculo e mapeamento foram isoladas em `personFormState.ts`, livres de hooks do React ou acoplamento a UI.
  5. **Regra Obrigatória 5 (React Hook Form + zodResolver):**
     O fluxo de submissão preserva a execução mandatória do resolver Zod via `form.validateAndRun` antes de persistir alterações com `savePerson`.

- **Arquivos modificados e criados:**
  - `erp/src/pages/App/Registrations/shared/modals/personForm/personFormState.ts` (criado)
  - `erp/src/pages/App/Registrations/shared/modals/personForm/usePersonAddress.ts` (criado)
  - `erp/src/pages/App/Registrations/shared/modals/personForm/usePersonContacts.ts` (criado)
  - `erp/src/pages/App/Registrations/shared/modals/personForm/useEmployeeRoles.ts` (criado)
  - `erp/src/pages/App/Registrations/shared/modals/personForm/personSubmitStrategy.ts` (criado)
  - `erp/src/pages/App/Registrations/shared/modals/personForm/usePersonSubmit.ts` (criado)
  - `erp/src/pages/App/Registrations/shared/modals/personForm/usePersonForm.ts` (refatorado em fachada)
  - `erp/src/pages/App/Registrations/shared/modals/personForm/PersonAddressSection.tsx` (integração do `routeUrl`)
  - `erp/src/pages/App/Registrations/shared/modals/personForm/index.ts` (exportação limpa de hooks, tipos e estratégias)

- **Validação e não-regressão:**
  - `usePersonForm.test.tsx`: 6/6 testes aprovados.
  - `PersonFormModal.test.tsx`: 1/1 teste aprovado.
  - Suíte completa `personService`: 5 arquivos e 30 testes aprovados.
  - ESLint em todos os arquivos de `personForm`: 0 erros e 0 warnings.

## Etiquetas — biblioteca de imagens, consulta e alterações confirmadas

Problema e causa comprovada: o proprietário ativo `LabelImageModal` concluía o resolver antes do FileReader/INSERT; não tratava erro/aborto da leitura nem limitava a consulta. Falhas de consulta eram apenas registradas no console e pareciam biblioteca vazia. Exclusão não tinha resolver e o serviço não confirmava a linha afetada. Seleção acionava diretamente o callback sem validar ID/imagem. Cliques concorrentes e respostas de aberturas/categorias antigas podiam publicar efeitos.

Arquivos e linhas deste lote:

- `shared-utils/labelImageFormSchemas.ts:1–10,17–23`: contratos explícitos de consulta/ordenação, upload com arquivo/nome/categoria, criação, exclusão, seleção, registro histórico e resultado incerto (linhas atualizadas após acrescentar os contratos locais).
- `erp/src/pages/App/Stock/LabelPrinting/modals/LabelImageModal.tsx:1–133,139–284`: quatro intenções sob RHF; valores parseados antes dos serviços, trava comum até concluir, prazo de consulta 15s/leitura 10s/gravação e exclusão 20s/seleção 15s, aborto de FileReader, proprietário por abertura/categoria e mensagens/estado de progresso. Consulta libera a validação antes do I/O, mantendo revisão própria para StrictMode/recarga. Resultado incerto bloqueia repetição na mesma abertura, inclusive após consulta; a conferência e reabertura ficam sob decisão do operador.
- `erp/src/pages/App/Stock/LabelPrinting/services/labelImageService.ts:3–53`: schema antes de I/O; ordenação efetivamente aplicada; registros históricos conservam categorias e metadata. INSERT exige ID positivo e campos iguais ao payload parseado; DELETE exige exatamente o ID solicitado. Zero linhas é falha conhecida, resposta ausente/divergente ou falha de transporte/cardinalidade é incerta. Não há retransmissão automática.
- `erp/src/pages/App/Stock/LabelPrinting/__tests__/labelImageService.test.ts:16–132`, `__tests__/LabelImageModal.test.tsx:1–220` e `__tests__/labelAssetPage.test.tsx:8–71`: transporte simulado, RHF/Zod reais e seleção pela fachada/seção reais; preservação da fila de logos e da imagem das demais categorias. O arquivo de teste de página conserva os dois cenários de ativos locais anteriores.

Validação: 54 testes em quatro arquivos aprovados (`scratch/rhf-label-library-tests.log`), incluindo 14 regressões do proprietário local. ESLint do lote sem erros/avisos (`scratch/rhf-label-library-lint.log`); build aprovado em 1m33s (`scratch/rhf-label-library-build.log`). TypeScript global tem 295 diagnósticos, nenhum nos arquivos deste lote; persiste o diagnóstico anterior do contrato de cópia em `LabelPrinting/Index.tsx:38` (`scratch/rhf-label-library-tsc.log`). Proprietário conferido: ERP **89/127 (70,1%), 38 pendentes**. Sem nova migration, execução de CRUD remoto, dados comerciais, Auth, deploy ou SEFAZ. Mocks não comprovam RLS/rollback/concorrência no PostgreSQL. Upload inicial da fachada, grade, criador dormente e outros caminhos de etiquetas conservavam suas pendências neste checkpoint.

## Etiquetas — uploads locais e amostra com proprietário

Problema e causa comprovada: o upload inicial já validava o arquivo, mas não possuía prazo de leitura, aborto, proteção de categoria/abertura nem erro/progresso na biblioteca de ativos. O upload por item usava o índice anterior: reordenar ou remover a etiqueta durante FileReader podia aplicar imagem em outro destino. A prévia de grade não validava sua limpeza, não limitava o callback e permitia uma leitura antiga restaurar a amostra. Alertas de falha podiam atravessar a mudança de contexto.

Solução: leitura comum com prazo de 10s, aborto e validação de resultado não vazio; cada proprietário mantém o resolver real e sua trava até terminar. A fila confere a referência do item antes e dentro do updater: reordenação preserva o destino, remoção/edição descartam o resultado sem sobrescrever outro item. Categoria/modo/path/abertura invalidam leituras; erros antigos são limpos no contexto novo. Amostra usa ações distintas upload/clear e aguarda callback com prazo de 15s. A geometria incompleta do rascunho continua permitida; contexto é comparado por valores e identidade explícita do editor, sem usar referências de objetos/callbacks criados a cada render. A montagem real encaminha categoria/modelo/abertura.

Arquivos e linhas deste lote:

- `shared-utils/labelImageFormSchemas.ts:11–16` e `shared-utils/readImageFile.ts:1–25`: contratos locais de arquivo/categoria, item/índice/blank e ações de amostra; leitura limitada e abortável usada somente com o arquivo parseado.
- `erp/src/pages/App/Stock/LabelPrinting/hooks/useLabelPrintingState.ts:5–6,97–150,246–247`: upload inicial com contexto, trava, erro/progresso e aplicação dos valores parseados, preservando logo, imagem selecionada e fila de preços.
- `erp/src/pages/App/Stock/LabelPrinting/components/LabelQueue.tsx:7–8,30–37,49–72,125,139–140,235–252`: vínculo com item, descarte seguro, estado visível e inputs protegidos. Campos contínuos continuam rascunhos do proprietário da fila.
- `erp/src/pages/App/Stock/LabelPrinting/components/LabelGridSheetPreview.tsx:1–84,88–126`: upload/limpeza com resolver, contexto, trava, erro/progresso, aborto e callback aguardado. `modals/LabelGridModelModal.tsx:1389` encaminha ownerKey na montagem ativa; salvar o modelo completo não foi conferido por este ajuste.
- `erp/src/pages/App/Stock/LabelPrinting/modals/LabelAssetLibraryModal.tsx:12–14,24–53,73–82,91,108,127–138`, `sections/ModalsSection.tsx:69–70,191–193` e `types/LabelPrintingSections.types.ts:95–96`: biblioteca controlada recebe e mostra estados/erros da fachada; upload, seleção, exclusão e fechamento ficam protegidos durante operação. A validação continua nos proprietários.
- `erp/src/pages/App/Stock/LabelPrinting/__tests__/labelQueueImage.test.tsx:1–103`, `__tests__/LabelGridSheetPreview.test.tsx:1–130`, `hooks/useLabelPrintingState.test.tsx:18–90` e `__tests__/labelAssetPage.test.tsx:8–86`: regressões reais de resolver, alvo, contexto, prazos, erros e fachada/seção/biblioteca; FileReader e transporte simulados.

Validação final: **91 testes em oito arquivos aprovados** (`scratch/rhf-label-local-images-tests.log`), incluindo regressões da biblioteca remota e ativos locais. Revisão pediu limpar alertas antigos; a correção e as regressões de troca de categoria/reabertura passaram. ESLint sem erros e dois avisos anteriores (updateExtraField sem uso na fila; dependência queue no efeito da fachada; `rhf-label-local-images-lint.log`). Build final aprovado em **1m42s** (`rhf-label-local-images-final-build.log`). TS global mantém **295 diagnósticos**, nenhum nos arquivos deste lote; o contrato anterior de cópia em `LabelPrinting/Index.tsx:38` segue pendente (`rhf-label-local-images-final-tsc.log`). Inventário explicita dois proprietários antes só no censo/texto (upload da fachada e amostra); fila já constava. **ERP 91/129 (70,5%), 38 pendentes**, sem inferir conclusão global móvel/catálogo ou fiscal. Nenhuma operação remota, migration, dados comerciais, Auth, deploy ou emissão fiscal. Criador dormente permanece dormente; o lote não conclui salvar/excluir/copiar modelos ou impressão completa.

## Etiquetas — fronteiras de persistência de modelos em validação

Problemas e causas comprovadas: serviço aceitava qualquer data como criação/edição, sem conferir payload ou ID, e DELETE não confirmava linha. Consulta malformada podia parecer vazia. Mapper usava || para fontes/escala, trocando zero por padrões, e arredondava campos NUMERIC. NULLs opcionais chegavam incompatíveis ao contrato de domínio. O fallback local não confirmava Storage e também aceitava resultado remoto incerto. Rejeição da persistência escapava do editor sem erro visível. Na revisão, String(id ausente) produzia identificação fictícia e localeCompare empatava chaves Unicode distintas na confirmação JSON; ambos foram corrigidos com regressões.

Arquivos e linhas modificados:

- `shared-utils/labelLayoutFormSchemas.ts:1–11`: contratos remotos de modelo/registro/seleção e erro incerto explícito; reaproveita o schema completo já existente.
- `erp/src/pages/App/Stock/LabelPrinting/services/labelLayoutService.ts:5–6,55–144`: schema antes do I/O, prazos 15s/20s, lista real, ID bruto válido antes do mapper, confirmação de campos serializados/JSONB/fontes TEXT e DELETE exato. Falhas incertas não viram autorização de replay. Operações de arte separadas não foram conferidas neste lote.
- `erp/src/pages/App/Stock/LabelPrinting/services/labelLayoutMapper.ts:3–194,203–336`: zero/frações preservados nos campos NUMERIC, grade inteira mantida, objeto de arte vazio quando ausente, números TEXT finitos normalizados e NULLs opcionais apenas no topo removidos. Campos/JSON persistíveis continuam explicitamente mapeados; não espalha propriedades arbitrárias em colunas SQL.
- `erp/src/pages/App/Stock/LabelPrinting/services/labelModelMapper.ts:81,86,116,178`: seleção conserva zero nas fontes e escala.
- `erp/src/pages/App/Stock/LabelPrinting/services/labelStorageService.ts:78–80,89–91` e `services/labelGridModelPersistence.ts:5,76–111,128–130`: confirmação local devolvida; modelo validado antes da operação, erro incerto não gera fallback, IDs locais únicos e fallback só retorna após Storage confirmado. Sucesso remoto confirmado permanece sucesso mesmo se seu cache falhar.
- `erp/src/pages/App/Stock/LabelPrinting/modals/LabelGridModelModal.tsx:24,627–643,733–746,1087–1102,1135`: erro/estado visíveis, trava síncrona até concluir, fechamento protegido, callback assíncrono explicitado e replay incerto bloqueado na abertura. Não conclui o contexto/callback de gravação em ModalsSection nem bloqueio de todos os campos filhos.
- `erp/src/pages/App/Stock/LabelPrinting/types/LabelGridModelTypes.ts:1,126`: artConfig reutiliza o tipo já consumido por LabelConfig, incluindo globalSnapshot/metadata. O tipo anterior só declarava opportunities e contradizia o schema e a persistência existentes; não foi removida validação para silenciar testes.
- `erp/src/pages/App/Stock/LabelPrinting/__tests__/labelLayoutService.test.ts:1–224`, `__tests__/labelLayoutMapper.test.ts:1–33`, `__tests__/labelGridModelPersistence.test.ts:38,136–170`, `__tests__/labelStorageService.test.ts:50,83–104` e `__tests__/LabelGridModelBoundary.test.tsx:1–61`: regressões de input/ack, IDs ausentes/divergentes, JSON Unicode/ordenação, zeros/frações/NULL/TEXT, Storage, fallback e erro/duplicação/fechamento pelo editor real. Elementos visuais internos são simulados; isso não comprova o proprietário completo.

Validação final: **113 testes em dez arquivos aprovados** (`scratch/rhf-label-layout-boundary-tests.log`), incluindo regressões de ativos locais/amostra/hook. ESLint sem erros/avisos (`rhf-label-layout-boundary-lint.log`); build aprovado em **2m** (`rhf-label-layout-boundary-build.log`). TS final tem **306 diagnósticos**, nenhum nos arquivos deste lote; três diagnósticos iniciais nos novos testes foram corrigidos alinhando o contrato de arte. Os 11 adicionais em relação ao checkpoint anterior estão em `printAssistanceOs.ts`/`printReturnOs.ts`, externos ao lote; o erro anterior de cópia em `LabelPrinting/Index.tsx` continua (`rhf-label-layout-boundary-final-tsc.log`). As últimas alterações de tipos e opções de teste não alteram o JavaScript compilado. Nenhum CRUD remoto, dados comerciais, migration, Auth, deploy ou SEFAZ. Arte externa/fontes são desabilitadas no teste final do editor. Migrations/snapshot locais mostram art_config NOT NULL/default{} e duas fontes TEXT; ajustes aceitam também os formatos numéricos, sem inferir vigência remota desse snapshot. A origem simbólica dos padrões versus base_model_id UUID continua localizada, sem mascarar nem alterar SQL. Cópia, exclusão, consulta/contexto e recarga do fallback ainda exigem conclusão nos chamadores reais; não marcar itens de formulário completos por esta camada. Inventário preservado em **91/129 (70,5%), 38 pendentes**.



