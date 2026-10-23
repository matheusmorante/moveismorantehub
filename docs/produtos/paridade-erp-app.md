# Auditoria de paridade do módulo Produtos: ERP → App Mobile

**Status:** em andamento. Este inventário acompanha as execuções cíclicas da auditoria.

> **Recuperação do inventário — 23/10/2026:** o arquivo do workspace foi encontrado com 0 bytes após falta de espaço no volume C:. A versão rastreada no Git foi restaurada; ela continha os ciclos 1–5. Os ciclos 8–12 abaixo foram recompostos apenas a partir dos registros atuais em `docs/geral/roadmap_pendente.md` e `docs/forms/inventario-mobile-catalogo-2026-10-15.md`. Não há evidência localizada para reconstituir os ciclos 6–7, então eles permanecem sem status de conclusão.

## Regras e referências consultadas

- `AGENTS.md` e `docs/geral/USER_RULES.md`.
- Skills de replicação ERP → app. A cópia encontrada neste workspace está em `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/erp-web-to-mobile-replication/SKILL.md`; ela está em cache gerado e não foi tratada como fonte canônica. Nenhuma cópia canônica foi encontrada em `.agents/skills` na raiz, `erp/` ou `mobile/` durante este ciclo.
- `docs/negocio/produtos/estrutura-produto-variacao.md` e `docs/negocio/produtos/operacoes-troca-pai-merge.md`.
- `docs/arquitetura/offline-e-sincronizacao.md` e `docs/mobile/arquitetura_offline_first.md`.
- Regras em `rules/`; nenhuma regra específica de Produtos foi localizada. A regra de escrita de movimentos de estoque não se aplica ao recorte auditado.
- A skill atual não foi localizada fora do cache de build `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/erp-web-to-mobile-replication/SKILL.md`; suas instruções foram usadas como orientação, sem tratá-la como fonte canônica.

## Ciclo 1 — modos simples/variações e composição

**Recorte:** distinção entre produto simples, produto com múltiplas variações e composição; seleção de componentes e validação de ativação.

### Resultado da comparação de código

- [x] O modo simples/variável do app usa a mesma regra operacional do ERP no formulário: produto simples tem uma variação; o modo com variações precisa de múltiplas linhas. O rascunho preserva o modo salvo enquanto ainda pode estar incompleto. Referências: `mobile/src/features/products/domain/mobileProductVariationMode.ts`, `mobile/src/features/products/screens/ProductFormScreen.tsx`, `mobile/src/features/products/modals/tabs/ProductFormBasicTab.tsx`; ERP: `erp/src/pages/App/Products/components/tabs/ProductGeneralTab.tsx` e `erp/src/pages/App/Products/ProductList/utils/catalog/productListTransformers.ts`.
- [x] A aba de variações do app aparece somente quando o modo multi-variação está habilitado. A edição dos componentes da composição ocorre por variação, como no ERP: `mobile/src/features/products/modals/tabs/ProductFormVariationsTab.tsx` e `ProductFormCompositionTab.tsx`; ERP: `erp/src/pages/App/Products/modals/VariationFormModal.tsx` e `erp/src/pages/App/Products/components/variationTabs/VariationCompositionItemsTab.tsx`.
- [x] A busca de componentes do app exclui composições, respeita fornecedor e seleciona produtos ou variações ativas não mescladas, preservando o UUID do produto e, quando aplicável, o UUID da variação. O fluxo ERP equivalente está em `erp/src/components/ProductAutocomplete.tsx` e `erp/src/components/hooks/useProductAutocomplete.ts`.
- [x] A validação de ativação é compartilhada em `shared-utils/productActivationValidation.ts`; o serviço mobile e o hook ERP passam os dados do produto, variações e componentes para a mesma regra.
- [x] A fórmula de disponibilidade de composição é compartilhada em `shared-utils/compositionMath.ts`; o ERP mantém um reexport de compatibilidade em `erp/src/pages/utils/compositionMath.ts` e o app importa a mesma função.
- [x] O formulário mobile passa pelo wrapper RHF com `zodResolver` em `mobile/src/hooks/useZodForm.ts` e pelo schema de domínio `shared-utils/mobileProductFormSchema.ts`.
- [x] A composição simples pode manter componentes no produto pai e a composição com variações pode manter componentes por variação. A documentação informa que o ERP não expõe edição de componentes no pai de uma composição simples; o app também não foi encontrado com esse editor. Portanto, não foi criado um fluxo mobile que não existe no ERP. O app preserva os dados raiz ao carregar e salvar.
- [x] Não foi encontrada neste recorte uma diferença funcional comprovada que justificasse alterar o código mobile. O workspace já continha alterações não commitadas, inclusive no módulo de Produtos; elas foram preservadas.

### Validação executada

- Mobile: Vitest focado para `mobileProductVariationMode`, `mobileProductCompositionItems` e `mobileProductCompositionService`: **3 arquivos, 13 testes aprovados**.
- ERP: Vitest focado para `useProductsActivationValidation` e `productListTransformers`: **2 arquivos, 15 testes aprovados**.
- Não houve comparação visual/interativa via Playwright neste ciclo. A paridade visual deste recorte continua pendente; os testes de lógica não comprovam interface ou comportamento nativo.

## Ciclo 2 — tentativa de comparação visual (acesso)

**Recorte:** abertura visível do ERP para iniciar a comparação do seletor Simples/Com variações.

- [x] Playwright foi aberto em modo visível na porta `5173`; a UI mostrou `http://localhost:5173/login`, com campos de e-mail e senha. A sessão de navegador foi mantida aberta.
- [x] As variáveis do projeto Vercel foram consultadas sem descriptografar valores. Não foi localizada credencial de teste de login do ERP/app. As variáveis de operador encontradas são exclusivas dos cenários fiscais e não foram reutilizadas para autenticação geral.
- [x] O setup E2E local documenta fallback de sessão mockada quando a senha não está configurada; esse fallback não foi usado, pois não comprova autenticação nem preserva a guarda de acesso.
- [ ] A tela de Produtos do ERP e a correspondente tela Expo Web não foram alcançadas. Nenhuma conclusão visual ou funcional foi tirada deste ciclo e nenhum código de produto foi alterado.
- [ ] Para destravar a comparação visual, disponibilizar uma conta de teste do aplicativo nas variáveis de desenvolvimento da Vercel, sem compartilhar a senha no chat. Depois, retomar pelo seletor simples/variações.

## Ciclo 3 — busca textual da lista

**Recorte:** contrato de busca por nome na lista de Produtos, incluindo debounce, termos de produto/variação e limite de correspondências.

### Resultado da comparação e correções

- [x] O ERP e o app agora compartilham `PRODUCT_LIST_SEARCH_MIN_LENGTH`, o debounce de 350 ms e a construção dos termos em `shared-utils/productListSearch.ts`. A busca continua exigindo pelo menos 3 caracteres; apagar o texto limpa a busca imediatamente e reduzir para 1–2 caracteres limpa o filtro após o debounce. Antes, o app mantinha a consulta anterior ao digitar um termo curto, apesar de mostrar o novo texto.
- [x] A busca de nomes de produto e variação usa a mesma construção de termos no ERP e no app. O ERP já detectava mais de 100 correspondências buscando até 101; o app limitava a 100 e podia mostrar uma lista truncada como se estivesse completa. O serviço mobile agora busca até 101 e apresenta a mesma mensagem de refinamento do ERP quando ultrapassa 100.
- [x] Os filtros de status ativo/inativo ficam suspensos enquanto há busca textual, mantendo o rascunho de filtro, como no ERP. A busca continua restrita a nomes; não foi ampliada para código ou descrição sem suporte no comportamento ERP.
- [x] O tipo do hook ERP `useProductsPageState` foi apontado para o arquivo existente em `erp/src/pages/types/product.type.ts`; isso removeu o diagnóstico de import no arquivo alterado e permitiu verificar sua tipagem no contexto atual.
- [ ] A comparação visual/funcional via Playwright segue pendente: a sessão disponível ainda abre em `/login`, sem credencial geral de teste nas variáveis de desenvolvimento consultadas. A inspeção deste ciclo foi de código e testes; Expo Web também não comprovaria comportamento nativo.

### Validação executada

- Mobile: Vitest focado em `mobileProductListFilters.test.ts`, `mobileProductSearch.test.ts` e `mobileProductFetchService.test.ts`: **3 arquivos, 16 testes aprovados**.
- ERP: Vitest focado em `productFilterBuilder.test.ts`: **1 arquivo, 9 testes aprovados**.
- TypeScript: os comandos de verificação completa dos projetos continuam não zero por diagnósticos preexistentes em outros arquivos. A filtragem dos resultados não encontrou diagnósticos nos arquivos alterados deste ciclo, tanto no mobile quanto no ERP.

### Achado separado: ordenação

- [ ] O ERP exibe controles de ordenação, mas `handleSort` em `erp/src/pages/App/Products/Index.tsx` não executa a ordenação; a consulta mobile mantém `created_at desc` e não oferece controles. Como não há contrato ERP funcional para replicar, a ordenação não foi alterada neste ciclo. **Decisão pendente:** implementar primeiro uma ordenação funcional no ERP ou definir os critérios esperados antes de expor ordenação no app.

## Ciclo 4 — filtros da lista e limpeza

**Recorte:** status ERP, tipo geral, publicação no Catálogo Digital, categoria e ação para limpar filtros.

### Resultado da comparação e correção

- [x] Os controles de status e publicação no Catálogo Digital correspondem aos do ERP: Ativos/Desativados/Rascunhos e Publicados/Ocultados. A seleção no app passa por `productListFormSchema` antes da consulta; estados ativo, desativado e rascunho seguem cláusulas próprias no serviço mobile.
- [ ] O rótulo de tipo geral existe nas duas interfaces, mas sua consulta difere: “Somente Produtos” no ERP inclui `item_type` produto, composição e nulo; no app, a lista padrão exclui composições e “Somente Produtos” consulta apenas `item_type = product`, mantendo composições em modo separado. O ERP também tem uma rota de Composições, mas não foi encontrada documentação que confirme se essa separação mobile deve prevalecer sobre o filtro ERP. Não alterei esse comportamento.
- [x] O ERP oferece `Limpar`/`Limpar Filtros`; o mobile não oferecia uma ação equivalente. O app agora limpa busca aplicada e exibida, status, tipo geral, categoria e status do catálogo, restaura a inclusão de desativados e volta à primeira página. A ação preserva o modo Lixeira e o controle de itens mesclados, como os estados independentes correspondentes no ERP.
- [x] O filtro de categoria mobile usa UUIDs e considera `products.category_id`, a relação normalizada `product_categories` e o nome legado em `products.category`, conforme a classificação de produto por múltiplas categorias descrita em `docs/negocio/produtos/estrutura-produto-variacao.md`.
- [ ] Divergência no ERP que impede espelhamento literal: `ProductFilters` oferece o UUID da categoria, mas `productFilterBuilder` compara esse valor somente ao campo textual `products.category`. O salvamento ERP remove esse campo e grava `category_id`/`product_categories` (`productPersistenceService.ts`); portanto, produtos atuais podem não aparecer no filtro ERP. O mobile já cobre a relação canônica e não foi reduzido. **Decisão pendente:** confirmar se devo corrigir a consulta ERP para a relação canônica nesta frente de paridade.
- [ ] O filtro mobile de rascunhos aceita `is_draft = true` ou `status = 'draft'`; o ERP usa `is_draft = true`. É uma tolerância mobile para registros legados, ainda sem justificativa documentada suficiente para classificá-la como particularidade confirmada.
- [ ] Não houve inspeção visual via Playwright neste ciclo: a sessão disponível continua em `/login`, e o acesso à tela de produtos sem autenticação não foi contornado.

### Validação executada

- Mobile: Vitest em `mobileProductListFilters.test.ts`: **1 arquivo, 5 testes aprovados**.
- TypeScript mobile: verificação completa não zero por erros preexistentes fora dos arquivos alterados; não houve diagnóstico nos arquivos alterados deste ciclo.
- O teste de UI e a comparação visual seguem pendentes até a tela autenticada estar acessível. Expo Web, quando disponível, não comprova comportamento nativo.

## Ciclo 5 — carregamento, erro e lista vazia

**Recorte:** estados da lista de Produtos após consulta, falha, ausência de itens e busca sem resultados.

### Resultado da comparação e correção

- [x] O ERP exibe carregamento com “Sincronizando catálogo...”; o app mostra `ActivityIndicator` e “Carregando produtos...”. Ambos substituem a lista enquanto a carga inicial está em andamento.
- [x] O ERP executa `fetchProductsPage(..., { throwOnError: true })` e, em caso de falha sem dados atuais, mostra estado de erro e ação “Tentar novamente”. O mobile já tinha `loadError`, botão de nova tentativa e tratamento da exceção no hook, mas a consulta da lista não ativava `throwOnError`. Como `fetchMobileProductsPage` converte erros de consulta em `{ data: [], total: 0 }` por padrão, falhas da lista podiam aparecer como ausência de produtos.
- [x] A chamada de listagem em `useMobileProducts` agora define `throwOnError: true`. A exceção alcança o `catch` existente, que mostra o estado de erro e preserva a ação de nova tentativa. Outros chamadores do serviço mantêm o comportamento tolerante padrão.
- [x] A ausência de itens possui mensagem específica no app para composições e lixeira e mensagem geral para produtos; a lista ERP usa mensagem geral. Para busca sem resultados, ambos apresentam estado vazio sem erro. Não foi identificada diferença funcional que exija outra alteração neste recorte.
- [ ] A comparação visual permanece pendente: Playwright abriu `http://localhost:5173/login` e mostrou a tela de autenticação; não foi possível acessar Produtos no ERP ou no Expo Web. Não houve tentativa de contornar a guarda. A cópia consultada da skill continua somente em cache de build, sem fonte canônica localizada.

### Validação executada

- Mobile: Vitest focado em `mobileProductFetchService.test.ts`: **1 arquivo, 9 testes aprovados**, incluindo propagação de erro com `throwOnError` habilitado.
- TypeScript mobile: a verificação completa ainda retorna diagnósticos preexistentes em outros módulos; não houve diagnóstico em `useMobileProducts.ts` nem no teste alterado.
- `git diff --check`: aprovado. A tela autenticada e o comportamento nativo não foram validados visualmente neste ciclo.

## Ciclos 6–13 — evidências recuperadas e atualizações recentes

### Ciclos 6–7 — histórico não reconstruído

- [ ] A cópia rastreada recuperada termina no Ciclo 5, e as referências atuais consultadas não descrevem os Ciclos 6–7. Não atribuir conclusão a esses ciclos sem localizar evidência adicional.

### Ciclo 8 — ambiente e categoria no formulário básico

- [x] O registro do roadmap informa que a resolução de ambiente pelas categorias passou a usar a travessia compartilhada ERP/app em `shared-utils/productCategoryResolution.ts`; o campo `environment` foi explicitado no schema Zod mobile e o seletor Oportunidade foi bloqueado no ERP. A validação visual autenticada permanece pendente.

### Ciclo 9 — informações básicas e título

- [x] O registro do roadmap confirma que `ProductTitleTab` não está conectado ao formulário ativo do ERP e que o mobile alinhou a sincronização de `name`, `title` e `marketplaceTitle` ao fluxo ativo. A inspeção visual autenticada não foi possível; não tratar a aba desconectada do ERP como paridade visual comprovada.

### Ciclos 10–12 — remoção, limite, substituição e recorte de fotos

- [x] A remoção de imagem do produto pai usa `removeProductImageGlobally`, compartilhada entre ERP e mobile. O limite de seleção passou a ser aplicado a arquivos/assets antes de leitura e upload, por `limitProductImageSelection`. A substituição é centralizada em `replaceProductImageGlobally` em `shared-utils/productImageOperations.ts`, com propagação compatível para produto pai, variação única e referências legadas.
- [x] O checkpoint de formulários registra 12 testes mobile e 24 ERP aprovados para o conjunto de operações de fotos dos Ciclos 10–12. Isso prova os casos cobertos pelos testes, não upload remoto real nem comportamento nativo.
- [ ] Diferença de recorte ainda sem decisão: o ERP compõe o resultado em um palco branco de 1080×1080; o recorte nativo do mobile conserva somente os pixels da origem. A documentação do projeto não justifica a diferença e `expo-image-manipulator` não oferece `extent` nativo no setup conferido. Definir a estratégia nativa para reproduzir o fundo branco antes de encerrar esta parte.

### Ciclo 13 — fotos: ordenação da galeria do produto pai

- [x] No ERP, o arraste da galeria move uma foto para qualquer posição e, quando há exatamente uma variação, sincroniza a ordem herdada nessa variação. O app oferecia apenas “Definir como Capa” e alterava somente `images` do pai; não permitia posições intermediárias e podia deixar a galeria local da variação única desatualizada.
- [x] A regra pura passou a ser compartilhada por `shared-utils/productImageOrdering.ts`, com `moveProductImageGlobally` para reordenar o pai e alinhar a variação única sem mutar a entrada. ERP e mobile usam a função compartilhada. O modal mobile agora oferece mover para cima/baixo com área de toque mínima de 44 px; variações múltiplas mantêm suas galerias próprias.
- [x] Vitest focado: **2 arquivos / 14 testes ERP** e **1 arquivo / 5 testes mobile** aprovados. A suíte adicional `VariationPhotosTab.test.tsx` falhou ao buscar o título `Clique para ver opções ou arraste para reordenar`; o componente e o teste dessa suíte não foram alterados neste ciclo, então a falha é inconclusiva e precisa de investigação separada. TypeScript completo reportou 413 diagnósticos ERP e 66 mobile, sem diagnóstico nos caminhos alterados.
- [ ] Playwright permaneceu na tela `/login`; não havia credencial geral de teste nas variáveis consultadas e nenhuma guarda foi contornada. A comparação visual autenticada e a validação nativa continuam pendentes. Expo Web não prova o runtime nativo.
- [x] O Ciclo 14 concluiu a comparação funcional do seletor de fotos por variação e adicionou ao mobile “Selecionar todas/Desmarcar todas” com o mesmo limite e ordem da galeria do ERP, além do indicador numérico da ordem selecionada.
- [ ] A comparação visual autenticada do seletor e a validação nativa continuam pendentes; Playwright ainda mostra `/login` sem conta geral de teste disponível.

### Ciclo 14 — fotos: seleção em lote da galeria do produto pai

- [x] O modal ERP permite selecionar individualmente e em lote, limpar a seleção, conferir a ordem de seleção e limitar a no máximo 15 fotos. A ação final executa `createVariationImageSelectionFormSchema` por `useZodForm` antes de aplicar as URLs ao rascunho da variação.
- [x] O app já mantinha seleção em rascunho, confirmação, validação pelo mesmo schema Zod e ordenação por toques/arrows, mas não tinha a ação em lote nem mostrava a posição de cada foto dentro do seletor. `toggleAllParentProductImages` foi adicionada a `shared-utils/productImageSelection.ts` e é usada no ERP e mobile; o app agora mostra “Selecionar todas/Desmarcar todas”, respeita o limite e exibe o número de ordem em cada foto selecionada.
- [x] A seleção continua local ao formulário até confirmar e salvar o produto; não houve escrita remota. O mobile mantém o modal nativo e apresenta a orientação de adicionar fotos ao pai com o botão desativado quando a galeria está vazia; é a adaptação nativa correspondente ao estado vazio do modal ERP.
- [x] Vitest ERP em `VariationParentImagesSelectModal.test.tsx`: **1 arquivo / 9 testes aprovados**, incluindo seleção em lote, limpeza, validação e ordem/limite compartilhados. TypeScript completo: **41 diagnósticos mobile** e **415 ERP**, sem diagnóstico nos arquivos tocados neste ciclo.
- [ ] Playwright não alcançou o seletor autenticado: a tela disponível é `/login`. A interação nativa não foi verificada em aparelho; Expo Web não substitui essa validação.

### Pendências para próximos ciclos

- [ ] Reconstituir evidências dos Ciclos 6–7, caso existam em registros adicionais.
- [x] Auditar a busca textual da lista no Ciclo 3 e os estados de carregamento, erro, vazio e busca sem resultados no Ciclo 5; permanece pendente a comparação visual autenticada.
- [x] Auditar o estado de filtros e adicionar a limpeza no mobile no Ciclo 4; a correção do contrato de categoria do ERP está pendente.
- [x] Ordenação livre da galeria do produto pai e sincronização da variação única alinhadas no Ciclo 13; a seleção em lote e sua ordem no seletor da variação foram alinhadas no Ciclo 14. Permanecem pendentes o resultado do crop nativo e a validação visual/nativa autenticada.
- [ ] Concluir auditoria das abas e estados ainda não cobertos: características, descrição, preço/estoque, fiscal, seletor de fotos por variação, ações da lista, categorias/atributos, permissões e confirmações.
- [ ] Resolver divergências da lista identificadas no Ciclo 4: tipo geral que inclui composição no ERP, filtro ERP por UUID comparado ao campo textual legado e critério mais tolerante do rascunho no app.
- [ ] Comparar com Playwright os estados autenticados entre ERP e Expo Web assim que houver conta de teste disponível; validar o runtime nativo separadamente, sem inferi-lo do Expo Web.
- [ ] Confirmar origem canônica da skill `erp-web-to-mobile-replication`; a cópia consultada está apenas em cache de build.

**Critério de encerramento global:** concluir cada área aplicável, registrar exceções justificadas e manter pendentes explícitas as validações que dependam de runtime nativo; não declarar equivalência nativa com base somente no Expo Web.
