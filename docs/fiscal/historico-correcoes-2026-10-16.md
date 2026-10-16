# Histórico de correções — 16/10/2026

## Formulário de variações — composição em conferência

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

## Recebimento da devolução comercial — confirmação em conferência

Problema comprovado: `ReturnFulfillmentConfirmModal` disparava um callback sem resolver nem await e o histórico limpava a confirmação antes do commit. O serviço genérico também aceitava ausência de erro da RPC sem conferir identidade/status do recibo. Isso podia fechar a confirmação e iniciar a etapa fiscal sem confirmação comercial suficiente.

Correções locais em validação: `shared-utils/returnFormSchemas.ts` explicita intenção física, contexto agendado/método e recibo de identidade/status. O modal executa RHF/zodResolver reais, preserva o atraso de cinco segundos, bloqueia cliques/cancelamento durante a operação, mostra erros/progresso e invalida a abertura antiga. `useOrderHistory.ts` mantém a confirmação até o recibo comercial, executa seu resolver próprio, protege sessão/fila/prazos e bloqueia repetição de resultado incerto. A emissão fiscal automática existente é iniciada somente após confirmação comercial e não compõe o sucesso comercial nem provoca nova submissão física.

O caminho específico de `orderUpdateService.ts` verifica contexto antes de enviar, limita a RPC a 30s e exige ID/status/tipo/método confirmados, antes de publicar notificações. `orderMutationTypes.ts` registra a guarda opcional desse caminho; `orderMutationService.ts` preserva o retorno void dos consumidores legados. O histórico espera no máximo 35s e o modal no máximo 40s; resultado incerto exige consultar o pedido, sem repetição automática. A guarda após as leituras impede iniciar a gravação quando o contexto/prazo já venceu.

Evidência de contrato: somente leitura de `pg_proc/pg_get_functiondef` no projeto operacional `hkoxhourxwlddgsfdgws`, confirmado no vínculo local e URL configurada do ERP. A função `create_order_with_inventory_transaction(text,jsonb,jsonb,jsonb,boolean)` devolve JSON da transação com `order_data` persistido; o wrapper de versão local retorna esse mesmo resultado. Não foram executadas a função comercial, DDL, fixtures, notificações, transmissões SEFAZ ou deploy. A consulta de catálogo não comprova efeitos, concorrência, RLS ou atomicidade comportamental. Os arquivos/linhas e testes finais serão registrados após a composição real. Inventário permanece sem marcar este proprietário até essa validação.

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

