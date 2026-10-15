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
- **Validação:**
  - Consulta de verificação pós-migration confirmou 80 produtos com especificações ativas de puxadores no banco de dados (`with_tipo = 12`, `with_material = 73`).
  - Nenhum artefato de teste afetado e nenhuma divergência com os valores da descrição.

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
