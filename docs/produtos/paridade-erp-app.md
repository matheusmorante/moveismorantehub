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
- [x] O rótulo de tipo geral existe nas duas interfaces. A auditoria inicial encontrou que “Somente Produtos” no ERP inclui `item_type` produto, composição e nulo, enquanto o app consultava apenas `item_type = product`. A diferença foi corrigida no Ciclo 29 com predicado compartilhado e inclusão de composições condicionada a `viewProductCompositions`; sem a permissão, a exclusão mobile continua. O estado padrão **Todos** no app permanece em ciclo próprio.
- [x] O ERP oferece `Limpar`/`Limpar Filtros`; o mobile não oferecia uma ação equivalente. O app agora limpa busca aplicada e exibida, status, tipo geral, categoria e status do catálogo, restaura a inclusão de desativados e volta à primeira página. A ação preserva o modo Lixeira e o controle de itens mesclados, como os estados independentes correspondentes no ERP.
- [x] O filtro de categoria mobile usa UUIDs e considera `products.category_id`, a relação normalizada `product_categories` e o nome legado em `products.category`, conforme a classificação de produto por múltiplas categorias descrita em `docs/negocio/produtos/estrutura-produto-variacao.md`.
- [x] Divergência do filtro de categoria corrigida no Ciclo 32: `ProductFilters` envia o UUID, e agora ERP e mobile consultam `category_id`, `product_categories` e o nome legado da categoria pelo mesmo helper compartilhado. O salvamento ERP grava `category_id`/`product_categories` e remove o texto legado (`productPersistenceService.ts`); nenhum cliente foi reduzido ao contrato textual antigo.
- [x] O filtro de rascunhos foi alinhado no Ciclo 31: ERP e mobile usam o predicado compartilhado `is_draft = true OR status = 'draft'`, coerente com os mappers dos dois clientes.
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

### Ciclo 15 — fotos: saída do recorte quadrado

**Recorte:** palco, margem branca e seleção do modal de recorte mobile.

- [x] O ERP usa um palco quadrado 1080×1080 branco, encaixa a imagem dentro da margem configurável de 0–35% e recorta a seleção do palco; a seleção pode incluir a margem. A interface mobile agora segue esse modelo, começa com a área 1:1 completa, permite mover/redimensionar dentro do palco, voltar a centralizar e ajustar a margem em passos de 5%.
- [x] O app usa o `Svg.toDataURL` do `react-native-svg` já instalado (15.15.4) para rasterizar o palco mostrado, mede o raster gerado no dispositivo e converte a seleção de pontos de layout para pixels. `expo-image-manipulator` recorta esse raster, redimensiona a saída a 1080×1080 e salva WebP; reduz a qualidade de 0.95 até 0.55 quando necessário para tentar atingir o alvo de 0.3 MB do ERP. A composição usa somente `Rect` e `Image` SVG locais; não adiciona dependência nem usa o `extent` web-only do Expo.
- [x] O recorte continua validado pelo schema compartilhado `squareImageCropFormSchema` via `useZodForm`/`zodResolver`; upload e substituição HTTPS continuam passando por seus schemas e serviços atuais.
- [x] Vitest focado: **1 arquivo / 3 testes** de geometria, margem, limites de seleção e mapeamento de coordenadas passou. `git diff --check` passou. TypeScript completo do mobile continua não zero com **41 diagnósticos em outros módulos**, sem diagnóstico em `ProductSquareImageCropModal.tsx` e `mobileProductImageCrop.ts`; o `tsconfig` exclui o arquivo Vitest.
- [ ] A geração e leitura nativa do PNG, a qualidade visual em Android/iOS e a dimensão final no runtime do aparelho ainda precisam de validação em dispositivo. Não foi executado runner nativo; a restrição vigente permite Playwright para UI e Vitest/RTL para lógica. Expo Web não certifica essa captura.
- [ ] A comparação visual autenticada do modal continua pendente: Playwright disponível segue em `/login`, sem credencial geral de teste localizada. Upload remoto também não foi executado.

### Ciclo 16 — descrição: geração por características e texto informativo

**Recorte:** aba Descrição, modal de geração e instrução/payload enviados pelo proxy mobile.

### Resultado da comparação e correções

- [x] O ERP oferece dois modos no `ProductDescriptionInformativeModal`: gerar pelas características do cadastro e gerar por texto informativo. O mobile tinha somente o primeiro. A aba mobile agora abre `ProductDescriptionAiModal` com ambos os modos e seleciona características quando os pré-requisitos estão preenchidos; caso contrário, abre texto informativo, como o ERP.
- [x] A lista de pré-requisitos para características usa a função de características obrigatórias já existente no domínio mobile, excluindo Cor da descrição. O texto informativo usa `productAiDescriptiveTextFormSchema` (mínimo de 5 caracteres) em React Hook Form com `zodResolver`, exibe o erro e não chama o serviço com conteúdo inválido. Ambos atualizam a descrição no formulário proprietário e notificam o blur/sucesso; não persistem fora do fluxo normal de salvar produto.
- [x] O ERP envia prompts distintos para os dois modos e exige estrutura comercial com `Características:` e `Dimensões:` quando aplicáveis. O proxy mobile usava uma instrução genérica comum. O app agora informa o modo `characteristics` ou `informative_text`; o proxy valida esse discriminador e escolhe instruções equivalentes por modo. A operação allowlisted, autenticação, cota, timeout e sanitização da resposta foram preservados. As instruções mantêm as proteções contra conteúdo usado como instrução, especificações inventadas, menção de Cor e o rótulo Modelo/Linha com barra.
- [x] A área de toque do botão de abertura foi elevada a 44 px; o rótulo da aba ativa conserva a cor de destaque no tema escuro.

### Validação executada e limites

- Mobile: Vitest focado em `mobileProductAiService.test.ts`: **1 arquivo / 10 testes aprovados**, incluindo o discriminador enviado em cada modo e o bloqueio do texto informativo inválido antes do proxy.
- TypeScript mobile: a execução atual terminou com o diagnóstico em `shared-utils/productAiFormSchemas.ts:11` (assinatura de `z.enum`); a filtragem não apontou erro nos componentes e serviço mobile alterados. O proxy Edge não foi implantado nem exercitado contra o Gemini real.
- Playwright continua na tela `/login`; sem credencial geral disponível nas variáveis já consultadas. Não houve contorno de autenticação. Expo Web não foi validado nesta aba e não comprovaria o runtime nativo.
- [ ] Permanecem pendentes a comparação visual autenticada e a confirmação do formato gerado pelo serviço real; não houve chamada externa à IA nem deploy da Edge Function.

### Ciclo 17 — Estoque e Precificação: edição de preço promocional

**Recorte:** carregamento dos campos de desconto ao editar um produto e indicador de preço obrigatório no modo simples/multi-variação.

#### Resultado da comparação e correções

- [x] O ERP calcula os campos auxiliares de desconto ao abrir um produto: `useProductFormLoad` chama `initializeDiscounts` tanto no carregamento inicial quanto após receber os dados completos. O app carregava `unitPrice` e `promoPrice`, mas não preenchia `% Desconto` nem `R$ Desconto`, deixando os campos vazios mesmo quando o preço promocional estava salvo.
- [x] `deriveProductDiscountFields` agora é a regra pura compartilhada pelo hook ERP e pelo carregamento de produto no mobile. O app normaliza os valores localizados antes do cálculo; quando a promoção é positiva e inferior ao preço de venda, exibe o desconto fixo com duas casas e o percentual com uma casa. Sem desconto válido, os dois campos ficam vazios.
- [x] O indicador vermelho de obrigatoriedade no app agora só acompanha “Preço de Venda” quando `hasVariations` é falso, como no `ProductPricingFields` do ERP. A regra de validação/salvamento não mudou.
- [x] Os campos de desconto continuam auxiliares de apresentação; o serviço mobile persiste preço de venda e preço promocional (`unit_price`/`promo_price`), sem criar um campo de desconto independente. Não houve alteração de schema, payload ou gravação remota.

#### Validação executada e limites

- Mobile: Vitest focado em `productDiscountFields.test.ts`: **1 arquivo / 5 testes aprovados** para promoção válida, preço zero, promoção zero, preço igual e promoção acima do preço.
- `git diff --check`: aprovado.
- TypeScript completo no mobile e ERP permanece não zero por diagnósticos em módulos não relacionados; não há diagnóstico reportado nos arquivos deste ciclo. A verificação ERP foi filtrada para confirmar especificamente os arquivos tocados.
- Não houve comparação visual autenticada nesta execução. A última evidência registrada para Playwright continua na rota `/login`; nenhuma guarda foi contornada. A validação de runtime nativo permanece pendente, e Expo Web não a comprova.

#### Pendências de Preços e Estoque

- [x] Os handlers de percentual, valor fixo e preço promocional foram alinhados pelo cálculo compartilhado no Ciclo 19; ver evidências abaixo.
- [x] Os padrões IPI/frete do fornecedor foram alinhados no Ciclo 18, junto do cálculo de custo final com frete `none`; ver evidências abaixo.
- [x] Cálculo do custo final e sincronização herdada conferidos no Ciclo 18; ver evidências abaixo.
- [x] A conversão do campo de estoque mínimo foi alinhada ao ERP no Ciclo 20; permanecem os demais estados de validação/erro da aba.
- [ ] A inspeção visual autenticada e a confirmação em aparelho continuam pendentes.

### Ciclo 18 — Estoque e Precificação: padrões do fornecedor e custo final

**Recorte:** seleção de fornecedor, defaults de IPI/frete e cálculo do custo final para produto e variações.

#### Resultado da comparação e correções

- [x] No ERP, `ProductSupplierField` aplica `defaultIpiPercent`, `defaultFreightCost` e `defaultFreightType` do fornecedor escolhido. O serviço mobile consultava somente nome/apelido e origens de estoque, e sua aba de preços apenas incluía o ID do fornecedor. O DTO e a consulta mobile agora incluem os três defaults; `resolveProductSupplierPricingDefaults` compartilhado mantém o valor atual quando o fornecedor não tem um default e aplica zeros e `none` como valores explícitos.
- [x] A seleção mobile recalcula `finalPurchasePrice` com os defaults. Os valores continuam no formulário proprietário e passam pela validação RHF/Zod existente ao salvar; o wrapper de `setFormData` mantém a propagação para variações herdadas. A tabela e o payload de produto não mudaram.
- [x] A auditoria encontrou uma divergência interna no ERP: a aba principal interpretava `freightType: 'none'` como percentual, o sincronizador como frete fixo e o editor de variação como percentual. A UI mobile já oferece explicitamente “Sem frete” e não soma o frete nesse estado; o mapeamento ERP de fornecedor também normaliza default nulo para `none`. `calculateProductFinalPurchasePrice` agora é a regra compartilhada entre o app, a aba/sincronização do ERP e o editor de variações. `none` não soma frete; IPI e frete fixos ou percentuais preservam seus contratos, e IPI `none` também não é somado.
- [x] A fórmula se mantém limitada ao custo final editado no cadastro. O cálculo distinto da lista de estoque inicial não foi alterado. Nenhuma gravação remota ou implantação foi feita.

#### Validação executada e limites

- Mobile: `npm run test:unit:mobile --prefix erp -- src/features/products/domain/productSupplierPricingDefaults.test.ts` — **1 arquivo / 5 testes aprovados**, cobrindo defaults do fornecedor e cálculos com frete fixo, percentual, sem frete e tipos de IPI.
- ERP: `npm run test:unit --prefix erp -- src/pages/App/Products/hooks/variation/variationFormDefaults.test.ts` — **1 arquivo / 7 testes aprovados**, incluindo custo de variação sem frete.
- `git diff --check`: aprovado. As verificações TypeScript completas de ERP e mobile terminaram com código 2 por diagnósticos fora dos caminhos deste ciclo. A filtragem dos arquivos tocados encontrou **0 diagnósticos no mobile e 0 no ERP**; foi incluído `unit: 'UN'` no fixture do teste de variações, que estava sem um campo obrigatório.
- Não houve comparação visual autenticada nesta execução. A última evidência de acesso continua sendo `/login`; a inspeção autenticada do ERP/app e a validação em dispositivo nativo seguem pendentes. Expo Web não comprova comportamento nativo.

#### Pendências de Preços e Estoque

- [x] Os casos de valores apagados, zero e promoção igual ao preço de venda foram cobertos no Ciclo 19.
- [x] A entrada de estoque mínimo foi alinhada ao ERP no Ciclo 20; permanecem os estados de validação/erro e os demais estados da aba.
- [ ] A inspeção visual autenticada e a confirmação em aparelho continuam pendentes.

### Ciclo 19 — Estoque e Precificação: handlers manuais de desconto

**Recorte:** edição do preço de venda, percentual de desconto, valor fixo e preço promocional no produto pai, com propagação às variações herdadas.

#### Resultado da comparação e correções

- [x] A regra pura agora é compartilhada em `productDiscountFields.ts`: percentagem para valor promocional, valor fixo para percentagem e preço promocional para os campos derivados. ERP e app usam a mesma regra; cada tela mantém seu formato de estado (número/`undefined` no ERP, texto no app).
- [x] Percentual ou valor fixo zero, promoção direta zero e campos apagados agora normalizam para ausência de preço promocional. Antes, percentual zero no ERP podia gravar o próprio preço de venda como promoção; no app, a string `'0'` podia chegar ao payload como número zero enquanto o ERP convertia esse estado para `null`.
- [x] Ao digitar preço promocional igual ou acima do preço de venda, ambos preservam o valor digitado, mas limpam os campos auxiliares de desconto. Isso remove os valores antigos que o ERP mantinha visíveis após a promoção deixar de representar um desconto; o helper de carregamento já seguia essa regra.
- [x] Alterar o preço de venda recalcula os campos derivados pela regra compartilhada. Percentual zero não recria uma promoção igual ao preço. A limpeza/atualização continua propagada para variações com `syncPromoPrice` habilitado.
- [x] Percentual e valor fixo permanecem auxiliares de edição; o payload do produto segue persistindo somente os campos existentes `unit_price` e `promo_price`. O schema e o fluxo de submissão RHF/Zod do formulário proprietário não mudaram, e nenhuma gravação remota foi feita.

#### Validação executada e limites

- Mobile: `npm run test:unit:mobile --prefix erp -- src/features/products/domain/productDiscountFields.test.ts` — **1 arquivo / 11 testes aprovados**, cobrindo cálculo percentual/fixo, zero, invalidez e preço promocional igual/acima do preço de venda.
- ERP: `npm run test:unit --prefix erp -- src/pages/App/Products/hooks/form/useProductFormPricing.test.tsx` — **1 arquivo / 3 testes aprovados**, cobrindo percentual zero, promoção igual ao preço, promoção zero e propagação às variações herdadas.
- `git diff --check`: aprovado. As verificações TypeScript completas de ERP e mobile terminaram com código 2 por diagnósticos fora dos caminhos deste ciclo; os arquivos tocados apresentaram **0 diagnósticos em cada projeto**.
- Não houve comparação visual autenticada nesta execução. A última evidência de acesso continua sendo `/login`; a validação visual com conta e a validação em dispositivo nativo permanecem pendentes. Expo Web não comprova comportamento nativo.

#### Pendências de Preços e Estoque

- [x] Conversão da entrada de estoque mínimo alinhada ao ERP no Ciclo 20.
- [ ] Conferir os demais estados de validação/erro e da aba.
- [x] No produto pai, entradas negativas e descontos acima de 100%/do preço foram conferidos no Ciclo 21; descontos próprios das variações seguem pendentes.
- [ ] A inspeção visual autenticada e a confirmação em aparelho continuam pendentes.

### Ciclo 20 — Estoque e Precificação: edição do estoque mínimo

**Recorte:** campo Estoque Mínimo do produto simples na aba Estoque e Precificação.

#### Resultado da comparação e correção

- [x] O ERP converte cada edição com `parseInt` e transforma campo vazio/inválido em `0`; o app mantinha o texto e permitia que valores fracionários chegassem ao payload. Ambos os schemas impedem valores negativos na submissão final e em rascunho.
- [x] `parseProductMinimumStockInput` agora centraliza a conversão e é usado pelo ERP e pelo app. A digitação alterada segue o mesmo comportamento; dados fracionários já carregados continuam preservados enquanto o campo não for editado. O payload e o schema não mudaram.
- [x] O campo permanece oculto quando o produto está no modo multi-variação em ambas as interfaces. A validação continua no formulário proprietário por RHF/Zod no mobile e pelo schema compartilhado do domínio no ERP.

#### Validação executada e limites

- Mobile: `npm run test:unit:mobile --prefix erp -- src/features/products/domain/productMinimumStockInput.test.ts` — **1 arquivo / 1 teste aprovado**, cobrindo inteiro, decimal truncado, vazio, entrada inválida, negativo encaminhado à validação e valor numérico.
- `git diff --check`: aprovado; o Git reportou apenas avisos de normalização CRLF/LF em arquivos já modificados.
- TypeScript completo de ERP e mobile terminou com código 2 por diagnósticos em outros módulos; a filtragem dos arquivos tocados neste ciclo não encontrou diagnóstico.
- Playwright abriu o ERP em janela visível na porta 5173 e confirmou que a rota redireciona para `/login`. A comparação autenticada da aba não foi possível sem acesso à sessão; nenhuma guarda foi contornada. A tela do app/Expo Web não foi aberta, e isso não comprova runtime nativo.
- A origem canônica da skill continua pendente: a busca encontrou apenas a cópia incluída no backup de build em `erp/.vercel`; o arquivo foi lido como orientação, não tratado como fonte canônica.

#### Pendências de Preços e Estoque

- [x] A conversão de estoque mínimo na edição do campo foi alinhada no Ciclo 20.
- [x] Limites negativos e acima do preço no desconto do produto pai foram conferidos no Ciclo 21; falta auditar os campos próprios das variações.
- [ ] Conferir estados de validação/erro e demais estados da aba.
- [ ] Fazer comparação visual autenticada e validar em aparelho; Expo Web não comprova comportamento nativo.

### Ciclo 21 — Estoque e Precificação: limites de desconto no produto pai

**Recorte:** desconto percentual, desconto fixo e campos de preço no produto simples ou no pai de uma família com variações.

#### Resultado da comparação e correção

- [x] ERP e app chamam as mesmas funções de `productDiscountFields.ts`. Percentual negativo não cria promoção; percentual acima de 100% e desconto fixo acima do preço deixam o preço promocional ausente. Somente `unitPrice` e `promoPrice` são persistidos; os descontos percentuais/fixos são auxiliares.
- [x] O ERP tinha um desvio ao passar os retornos de `CurrencyInput` por `String(...)`. Um valor negativo colado no preço de venda, no preço promocional ou no desconto fixo perdia o sinal no `parsePrice` e podia ser reinterpretado como positivo. `ProductPricingFields` e `ProductInventoryTab` agora preservam os retornos numéricos. Preço de venda negativo permanece negativo e o schema do formulário bloqueia o salvamento; preço promocional/desconto negativos não criam promoção, igual ao mobile.
- [x] O input percentual ERP declara `min=0` e `max=100`, mas o modal não contém `<form>` e o rodapé dispara `handleSubmit` por botão `type="button"`; essa validade HTML não bloqueia a submissão nem gera erro visível. O mobile não tem atributos RN equivalentes. Como a regra compartilhada evita persistir uma promoção acima do limite em ambos, a diferença fica registrada como particularidade de plataforma sem efeito no payload.

#### Validação executada e limites

- Mobile: `npm run test:unit:mobile --prefix erp -- src/features/products/domain/productDiscountFields.test.ts` — **1 arquivo / 13 testes aprovados**, incluindo entrada negativa e limites acima de 100% e do preço.
- ERP: `npm run test:unit --prefix erp -- src/pages/App/Products/hooks/form/useProductFormPricing.test.tsx` — **1 arquivo / 7 testes aprovados**, incluindo propagação, preço negativo, desconto fixo negativo e percentual acima de 100%.
- TypeScript completo do ERP terminou com código 2 por diagnósticos em outros módulos; a filtragem dos arquivos ERP tocados não encontrou diagnóstico. Não houve alteração de código de produção mobile neste ciclo.
- `git diff --check`: aprovado, com avisos existentes de normalização CRLF/LF.
- Playwright manteve a janela visível na porta 5173 e confirmou que o ERP continua em `/login`; sem sessão autenticada, os campos não puderam ser exercitados pela UI e nenhuma guarda foi contornada. Expo Web e runtime nativo não foram abertos nesta execução.
- A cópia da skill usada permanece somente no backup de build em `erp/.vercel`; a fonte canônica segue pendente de localização.

#### Pendências de Preços e Estoque

- [x] Limites negativos e máximos dos descontos do produto pai conferidos no Ciclo 21.
- [x] Descontos próprios das variações e validação da submissão mobile conferidos no Ciclo 22.
- [ ] Conferir os outros estados de validação/erro da aba e de submissão.
- [ ] Fazer comparação visual autenticada e validar em aparelho; Expo Web não comprova comportamento nativo.

### Ciclo 22 — Estoque e Precificação: descontos próprios das variações

**Recorte:** preço de venda próprio, desconto percentual, desconto fixo e preço promocional em variações de uma família, incluindo preservação da entrada e bloqueio na submissão.

#### Resultado da comparação e correção

- [x] O ERP mantém os valores de desconto percentual e fixo em estado de edição e usa o schema de submissão da variação para rejeitar percentual fora de 0–100 ou valor fixo acima do preço. O app calculava os campos apenas a partir do preço promocional; descontos fora do limite viravam promoção zero e os textos digitados desapareciam sem bloquear o salvamento.
- [x] Os handlers de preço próprio do ERP e do app agora reutilizam a regra compartilhada productDiscountFields.ts. O app guarda os valores digitados na variação enquanto ela é editada e recalcula o outro campo e a promoção com a função compartilhada, inclusive quando o preço de venda muda.
- [x] A validação de percentual e desconto fixo da variação passou a usar getProductDiscountValidationIssues nos dois schemas. No app, o schema do formulário proprietário RHF/Zod aplica a regra às variações com preço próprio, antes de salvar rascunho ou concluir; o erro é roteado para a aba Variações. Preço herdado e variação única seguem fora dessa validação própria.
- [x] Os descontos percentual e fixo são auxiliares de edição, não campos persistentes. O serviço mobile os remove de technical_specs.variationDetails e eles não chegam à RPC; o payload transacional mantém os campos já existentes de preço e promoção, junto aos demais campos permitidos da variação. Nenhuma gravação remota foi feita.

#### Validação executada e limites

- Mobile: npm run test:unit:mobile --prefix erp -- src/features/products/domain/productDiscountFields.test.ts src/features/products/domain/mobileProductFormSchema.test.ts src/features/products/services/mobileProductMutationService.test.ts — **3 arquivos / 57 testes aprovados**, cobrindo limites, erro no schema final e de rascunho, payload e retirada dos campos auxiliares.
- ERP: `productVariationSubmissionDiscount.test.ts` — **1 teste aprovado**, cobrindo os dois limites no schema compartilhado usado pela submissão da variação; `useVariationPricing.test.tsx` — **7 testes aprovados**, incluindo desconto acima de 100% mantido para validação e normalização de zero.
- O arquivo adjacente `useVariationForm.test.tsx` foi repetido isoladamente: **12 de 13 testes passaram**. O teste “não vincula automaticamente fotos do produto pai e preserva fotos vinculadas manualmente” falhou porque esperava zero fotos herdadas e recebeu 20. O arquivo de teste e o código de fotos não foram alterados neste ciclo; essa falha permanece fora do recorte.
- `git diff --check`: aprovado, com avisos de normalização CRLF/LF em arquivos modificados. As verificações TypeScript completas de ERP e mobile retornaram código 2. Os filtros mais recentes não encontraram diagnóstico nos arquivos de implementação alterados; uma execução ERP também apontou `TS18047` em `useVariationForm.test.tsx:276`, uma asserção adjacente não alterada neste ciclo. O filtro mobile dos arquivos alterados não encontrou diagnóstico.
- Playwright abriu o ERP em navegador visível na porta 5173 e confirmou que a rota vai para /login. A listagem das variáveis de desenvolvimento da Vercel não apresentou credenciais gerais de conta de teste do ERP; não usei variáveis de operador fiscal nem contornei autenticação. A comparação visual autenticada continua pendente. Expo Web e runtime nativo não foram validados.
- A única cópia acessível da skill de replicação continua dentro do backup de build em erp/.vercel; foi usada como orientação, não como fonte canônica. A origem canônica segue pendente.

### Ciclo 23 — direcionamento do erro de desconto próprio para a variação

**Recorte:** caminho de erro emitido pelo RHF/Zod ao validar desconto percentual ou fixo em uma variação com preço próprio.

#### Resultado da comparação e correção

- [x] No ERP, o modal edita uma variação por vez; em erro de desconto, a validação compartilhada bloqueia o save, mostra toast/banner e abre a aba `estoque` (Precificação) da mesma variação.
- [x] No mobile, o schema do formulário proprietário emite caminhos aninhados como `variacoes[0].discountPercent`. `flattenFormErrors` os transforma em `variacoes_0_discountPercent`, mas `ProductFormScreen` antes só reconhecia IDs de abas exatos; o alerta mostrava o erro, porém a tela permanecia na aba atual e nenhuma variação era aberta.
- [x] `resolveMobileProductFormErrorNavigation` mapeia o caminho ao tab `variacoes` e ao índice da variação; o formulário proprietário passa esse destino à aba, que expande a linha e abre `estoque` (Precificação). A regra RHF/Zod e a mensagem de domínio continuam as mesmas; não foi adicionada validação duplicada.

#### Validação executada e limites

- Mobile: `mobileProductFormErrorNavigation.test.ts` e `mobileProductFormSchema.test.ts` — **2 arquivos / 21 testes aprovados**. O teste percorre o caminho aninhado produzido por `flattenFormErrors` e confirma o destino para os dois campos de desconto.
- TypeScript mobile completo retornou código 1; a filtragem dos arquivos alterados deste ciclo não encontrou diagnóstico.
- `git diff --check`: aprovado; Git reportou avisos de normalização CRLF/LF em arquivos modificados.
- A validação visual continua pendente: a última sessão de Playwright registrada está em `/login`; esta execução não autenticou nem contornou a guarda. Expo Web e runtime nativo não foram validados.

### Ciclo 24 — direcionamento de preço inválido para a variação

**Recorte:** erro de preço de venda inválido em família multi-variação, tanto quando a variação usa preço próprio quanto quando herda preço zerado do produto pai.

#### Resultado da comparação e correção

- [x] O ERP valida cada variação pela regra compartilhada `getVariationRegistrationIssue`; em preço inválido, seleciona a primeira variação com erro, abre Variações e direciona para Estoque e Precificação. A regra de preço herdado/próprio consta em `docs/negocio/produtos/estrutura-produto-variacao.md`.
- [x] O schema mobile antes emitia um erro genérico em `estoque` quando nenhum preço da família era positivo e reduzia erros específicos da variação ao caminho raiz `variacoes`. Agora suprime o erro genérico do produto pai em modo multi-variação e mantém o caminho `variacoes[index].price`, com a mensagem de domínio; o roteador RHF abre a variação indicada e seu painel de precificação.
- [x] Preço próprio zerado na segunda variação e preço do pai zerado herdado por ambas estão cobertos. O primeiro caso direciona para o índice 1; o segundo para o índice 0, como o ERP, que foca o primeiro registro inválido.

#### Validação executada e limites

- Mobile: `mobileProductFormErrorNavigation.test.ts` e `mobileProductFormSchema.test.ts` — **2 arquivos / 23 testes aprovados**, incluindo os dois cenários de preço e o caminho `variacoes_1_price` após `flattenFormErrors`.
- TypeScript mobile completo terminou com código 2 por diagnósticos de outras áreas do projeto. A primeira execução também identificou um estreitamento de tipo incompleto no efeito que abre a variação; o fluxo agora verifica o objeto de destino antes de ler seu painel. A execução final filtrada não apontou diagnóstico nos arquivos deste ciclo.
- `git diff --check`: aprovado; Git reportou somente avisos de normalização CRLF/LF em arquivos previamente modificados.
- A comparação visual autenticada segue pendente: a sessão disponível está em `/login`; não contornei a autenticação. Expo Web e runtime Android/iOS não foram validados.

### Ciclo 25 — direcionamento de variação sem foto

**Recorte:** erro de validação final quando falta uma foto vinculada à variação, em produto simples ou família multi-variação.

#### Resultado da comparação e correção

- [x] No ERP, `validateProductFormSubmission` escolhe a primeira variação sem foto e informa `invalidVariation` na aba `fotos`; `useProductFormSubmit` seleciona essa variação. `useVariationForm` abre a aba Fotos quando a variação não tem imagens. A regra de galeria herdada da variação única e galerias próprias em famílias consta em `docs/negocio/produtos/estrutura-produto-variacao.md`.
- [x] O schema mobile aplicava a mesma exigência e identificava a variação pelo nome, mas emitia o erro apenas no caminho raiz `variacoes`, deixando a linha recolhida em Informações Básicas. Agora emite `variacoes[index].images`; o roteador expande a variação que falhou e abre Fotos vinculadas. Na variação única, a tela mostra a galeria herdada e a instrução para adicionar fotos ao produto pai.
- [x] O erro continua sendo de conclusão: rascunhos incompletos podem ser salvos sem fotos, como no ERP.

#### Validação executada e limites

- Mobile: `mobileProductFormErrorNavigation.test.ts` e `mobileProductFormSchema.test.ts` — **2 arquivos / 25 testes aprovados**, cobrindo ausência de foto em multi-variação, produto simples sem nenhuma galeria, caminho de roteamento ao painel Fotos e rascunho sem imagens.
- ERP: `productFormValidation.test.ts` — **7 testes aprovados**, confirmando o bloqueio por foto e a permissão de rascunho. Corrigi apenas os fixtures de `useProductFormSubmit.test.tsx` para que `hasVariations: false` represente os casos completos com uma variação, conforme o contrato documentado. A execução daquele ciclo deixou 1 falha em 21 testes, causada por `variations: [null]`; o crash de `getVariationRegistrationIssue` foi corrigido e coberto no Ciclo 26. Nenhum código de produção ERP foi alterado durante o Ciclo 25.
- TypeScript mobile completo terminou com código 2 por **105 linhas de diagnóstico em outras áreas**; o filtro não encontrou diagnóstico no schema, roteador e componentes envolvidos neste ciclo.
- `git diff --check`: aprovado, com avisos de normalização CRLF/LF em arquivos existentes.
- A comparação visual autenticada segue pendente: o acesso documentado para o ERP permanece em `/login`. Expo Web e runtime Android/iOS não foram validados.

### Ciclo 26 — variação nula não interrompe validação

**Recorte:** submissão do formulário quando a lista de variações contém uma entrada estruturalmente inválida, especificamente `variations: [null]`.

#### Resultado da comparação e correção

- [x] No ERP, o schema Zod já rejeitava a entrada nula, mas `validateProductFormSubmission` continuava a validação contextual para reunir erros. `getVariationRegistrationIssue` então lia `variation.name` e lançava exceção antes de retornar os erros do formulário.
- [x] O helper compartilhado agora ignora a variação atual nula/não-objeto nessa etapa contextual. O erro de estrutura continua vindo do schema, e a submissão não chega a `saveProduct`; regras de negócio não foram enfraquecidas.
- [x] O schema mobile também rejeita `[null]` por `safeParse` sem lançar exceção. O caminho de submissão permanece bloqueado pelo resolver; não foi necessária uma regra mobile duplicada.

#### Validação executada e limites

- ERP: `variationRegistrationRules.test.ts`, `productFormValidation.test.ts` e `useProductFormSubmit.test.tsx` — **3 arquivos / 38 testes aprovados**. A cobertura verifica o helper com entrada nula e o fluxo real que impede salvar o produto malformado.
- Mobile: `mobileProductFormErrorNavigation.test.ts` e `mobileProductFormSchema.test.ts` — **2 arquivos / 26 testes aprovados**, incluindo a rejeição de `[null]` sem exceção.
- TypeScript global ERP e mobile terminou com códigos **2** e **1**, respectivamente, por diagnósticos em outros módulos; a filtragem não encontrou diagnósticos nos arquivos de produtos/shared-utils deste ciclo.
- `git diff --check`: aprovado; apenas avisos de normalização CRLF/LF em arquivos já modificados.
- Este ciclo não fez escrita remota. Comparação visual autenticada e runtime Android/iOS seguem sem validação; Expo Web não comprova comportamento nativo. A skill de replicação continua disponível apenas na cópia de cache documentada acima.

### Ciclo 27 — nome e busca de fornecedor

**Recorte:** estado da busca, nome exibido nas sugestões e identificação dos fornecedores vinculados no formulário Estoque e Precificação.

#### Achado registrado antes de alterar a experiência

- [x] O ERP usa a mesma precedência para busca e rótulo: `fullName`, `socialName`, `nickname` e `tradeName` (primeiro valor disponível). O mobile exibia `nickname` antes de `full_name` e pesquisava um texto composto com ambos, então um fornecedor podia aparecer com rótulo diferente e ser localizado por um termo que o ERP não encontra. O serviço mobile não selecionava `social_name`, campo presente em `people` e usado pelo modelo ERP.
- [x] Não encontrei justificativa para essa diferença nas particularidades mobile/documentação de formulários. O helper compartilhado espelha a precedência do ERP; no DTO mobile, `tradeName` corresponde ao campo persistido `nickname`, sem adicionar coluna inexistente à consulta.

#### Resultado da comparação e correção

- [x] `shared-utils/productSupplierDisplayName.ts` centraliza o rótulo e a busca usando a precedência `fullName` → `socialName` → `nickname` → `tradeName`, aceitando os formatos camelCase e snake_case. ERP usa o helper em `ProductSupplierField.tsx`; mobile usa o mesmo nome resolvido nas sugestões e nos fornecedores vinculados.
- [x] `mobileSupplierService.ts` agora seleciona `social_name` de `people`. `trade_name` continua sendo apenas o alias de compatibilidade de `nickname` no DTO; nenhuma coluna nova foi presumida.
- [x] A tela ERP foi conferida autenticada via Playwright: Produtos → Novo Produto → Estoque e Precificação. O campo informa busca por nome/razão social, aceita duas letras; a consulta `mo` mostrou quatro sugestões e a seleção temporária de “Movelipe” exibiu o mesmo rótulo no formulário. Recarreguei a página para descartar o estado em memória. A rede mostrou leituras de `people`/`products` e nenhuma mutação de produto; somente a verificação do operador de teste e telemetria foram POST.
- [ ] O aplicativo não foi exercitado visualmente em Expo Web nem em runtime nativo neste ciclo. Expo Web não comprova comportamento Android/iOS.

#### Validação executada e limites

- Mobile: `productSupplierDisplayName.test.ts` e `mobileSupplierService.test.ts` — **2 arquivos / 4 testes aprovados**, cobrindo precedência ERP, `social_name` e seleção da coluna no serviço.
- TypeScript completo de ERP e mobile terminou com código 2 por diagnósticos em outros módulos; a filtragem dos arquivos alterados do Ciclo 27 não encontrou diagnóstico.
- `git diff --check`: aprovado; Git emitiu somente avisos de normalização CRLF/LF em arquivos já modificados.
- A skill `erp-web-to-mobile-replication` continua localizada somente na cópia em cache de build descrita no início deste inventário; nenhuma fonte canônica foi encontrada.

#### Pendências de Preços e Estoque

- [x] Limites de descontos no produto pai (Ciclo 21) e nas variações próprias (Ciclo 22).
- [x] Erro de desconto próprio direciona à variação e ao painel de precificação correspondente (Ciclo 23).
- [x] Erro de preço inválido em família multi-variação direciona à variação e ao painel correspondente (Ciclo 24).
- [x] Ausência de foto direciona à variação que falhou e ao painel Fotos (Ciclo 25).
- [ ] Conferir os demais estados de validação/erro e de submissão da aba.
- [ ] Fazer comparação visual autenticada e validar em aparelho; Expo Web não comprova comportamento nativo.

### Ciclo 28 — fornecedor obrigatório na finalização

**Recorte:** submissão final de mercadoria adquirida de terceiros sem fornecedor principal, mantendo o contrato mais permissivo do rascunho.

#### Achado registrado antes da correção

- [x] A schema compartilhada do ERP e a schema mobile bloqueiam a finalização de produto adquirido de terceiros sem `mainSupplierId`/`supplierId`; fabricação própria dispensa fornecedor e rascunhos incompletos continuam permitidos. No mobile, o erro ainda mantém o caminho `estoque` para abrir a aba correta.
- [x] A UI ERP apresenta “Selecione um fornecedor.”; a mensagem mobile atual é “Selecione o fornecedor principal na aba Estoque e Precificação.”. Não encontrei exceção documentada para a diferença; vou compartilhar a regra e a mensagem, preservando o destino de navegação nativo.
- [x] Playwright confirmou o estado ERP inicial da aba: padrão “Adquirido de Terceiros”, aviso de exigência de fornecedor e rótulo “Fornecedores *”. Nenhum campo foi preenchido nem submetido; a evidência não prova o comportamento Android/iOS.

#### Resultado da comparação e correção

- [x] `shared-utils/productSupplierRequirement.ts` centraliza a regra de fornecedor e a mensagem “Selecione um fornecedor.”. A validação de domínio do ERP e o schema mobile usam o mesmo helper; `useProductFormSubmit` também usa a constante compartilhada para o feedback do ERP.
- [x] Terceiros sem `mainSupplierId`/`supplierId` continuam bloqueados na finalização; fabricação própria pode concluir sem fornecedor; rascunhos seguem permitidos sem fornecedor. O mobile conserva o caminho `estoque`, que direciona ao painel nativo correspondente.
- [x] A sessão visível do ERP está na lista `/products`, sem modal aberto. Nenhum produto foi submetido ou gravado neste ciclo.
- [ ] O estado de erro após submissão não foi exercitado visualmente, pois concluir um formulário real poderia gravar dados. Expo Web e runtime Android/iOS não foram validados.

#### Validação executada e limites

- ERP: `productFormValidation.test.ts` e `useProductFormSubmit.test.tsx` — **2 arquivos / 30 testes aprovados**, cobrindo a exigência na finalização, fabricação própria, rascunho e bloqueio do efeito.
- Mobile: `mobileProductFormSchema.test.ts` — **1 arquivo / 22 testes aprovados**, cobrindo a mensagem equivalente, caminho `estoque`, fabricação própria e continuidade dos cenários existentes.
- TypeScript completo terminou com código 2 em ambos os projetos: **687 linhas de diagnóstico no ERP** e **105 no mobile**. O filtro dos arquivos do ciclo não encontrou diagnóstico.
- `git diff --check`: aprovado; os avisos exibidos foram apenas de normalização CRLF/LF em arquivos já modificados.
- A skill `erp-web-to-mobile-replication` continua disponível apenas na cópia em cache de `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/`; não foi localizada fonte canônica no projeto nem em `C:\Users\mathe\.agents\skills`/`C:\Users\mathe\.codex\skills`.

### Ciclo 29 — filtro geral “Somente Produtos”

**Recorte:** seleção explícita de **Somente Produtos** na lista; o estado padrão **Todos** fica para outro ciclo.

#### Achado registrado antes da correção

- [x] Na UI ERP, o drawer **Filtros Avançados** oferece **Somente Produtos**. Playwright visível selecionou e aplicou a opção; não houve mutação de cadastro. `productFilterBuilder` implementa o filtro como `item_type` produto, composição ou nulo legado.
- [x] O mobile mostra o mesmo rótulo em `ProductsHeaderFiltersSheet`, mas a consulta padrão da lista exclui `item_type = composition` e depois reduz **Somente Produtos** a `item_type = product`.
- [x] O mobile também possui a permissão `viewProductCompositions` e um módulo separado de Composições. A correção deve incluir composições no filtro de Produtos somente quando essa permissão estiver concedida, preservando a restrição de acesso. Não encontrei justificativa para a diferença entre ERP e mobile quando o usuário tem acesso a ambos os módulos.
- [x] Esta evidência cobre somente a seleção **Somente Produtos**. A lista padrão **Todos** no mobile continua excluindo composições e será auditada como estado separado.

#### Correção aplicada e validação

- [x] O predicado `item_type.eq.product,item_type.eq.composition,item_type.is.null` agora tem uma constante compartilhada (`shared-utils/productListTypeFilters.ts`), consumida pelo filtro ERP e pela consulta mobile.
- [x] O mobile usa esse predicado em **Somente Produtos** apenas no modo padrão e quando `NativeProductsScreen` confirma a permissão `viewProductCompositions`. Sem essa permissão, mantém a exclusão de composições; o módulo próprio de Composições e o estado padrão **Todos** permanecem inalterados.
- [x] O filtro continua validado por `productListFormSchema` no hook `useMobileProducts`; o sinal de permissão vem do controle de acesso da tela e não de entrada editável.
- [x] Vitest: `productFilterBuilder.test.ts` — **10 testes aprovados**; `mobileProductFetchService.test.ts` — **11 testes aprovados**. `git diff --check` passou.
- [x] Playwright visível confirmou no ERP a seleção e aplicação de **Somente Produtos**, restaurando depois **Todas as Categorias**; nenhum produto foi gravado. Os testes do serviço verificam o predicado enviado, sem alegar leitura de composição real no banco.
- [x] TypeScript ERP/mobile: ambas as verificações terminaram com código 2 por diagnósticos globais preexistentes (687 linhas ERP, 105 mobile); nenhum diagnóstico filtrado apontou para os arquivos alterados neste ciclo.
- [ ] Expo Web e runtime nativo não foram validados; o Playwright desta etapa cobriu somente a tela do ERP.
- [ ] A skill `erp-web-to-mobile-replication` segue disponível somente na cópia do cache de build; a fonte canônica não foi localizada.

### Ciclo 30 — tipo geral “Todos” na lista padrão

**Recorte:** valor geral `all` no modo Produtos do app, correspondente a **Todas as Categorias** na consulta padrão do ERP.

#### Achado registrado antes da correção

- [x] A UI autenticada do ERP exibe **Todas as Categorias** selecionado por padrão (`http://localhost:5173/products`); o catálogo mostra 273 itens. O drawer de filtros foi aberto via Playwright e fechado sem aplicar alteração ou gravar produtos.
- [x] O estado ERP começa com `filters = {}`; no modo `standard`, `ProductList` mantém `itemType` indefinido. `useProducts`/`productFilterBuilder` não acrescentam filtro de tipo nessa situação, então a consulta padrão não exclui composições.
- [x] O mobile define `generalTypeFilter = 'all'` por padrão e passa `itemType: 'standard'`; `mobileProductFetchService` ainda aplica `item_type IS DISTINCT FROM composition`, inclusive nesse estado. Assim, a lista mobile omite composições.
- [x] A correção deve respeitar `viewProductCompositions`: incluir composições em **Todos** quando autorizado e conservar a exclusão quando a permissão não estiver concedida. A consulta ERP de tipo geral **Todos** não impõe filtro e também inclui serviços e tipos legados; o estado **Somente Produtos** segue coberto no Ciclo 29.
- [x] Esta evidência compara estado visual e contratos de query; não afirma que um registro de composição real foi consultado. A tela móvel ainda não foi exercitada em Expo Web/aparelho.

#### Correção aplicada e validação

- [x] O serviço mobile recebe `canViewCompositions` da tela. No modo padrão com tipo geral `all`, usuários autorizados deixam de receber a exclusão `item_type IS DISTINCT FROM composition`; sem essa permissão, a exclusão permanece. A consulta de **Somente Produtos** continua usando o predicado compartilhado do Ciclo 29; **Somente Serviços** continua limitada a `item_type = service`.
- [x] A tela só alcança a consulta pela lista cujo estado passa por `productListFormSchema` em `useMobileProducts`; a permissão é contextual e não um campo de formulário.
- [x] Vitest `mobileProductFetchService.test.ts`: **13 testes aprovados**, incluindo os estados **Todos** e **Somente Produtos** com e sem permissão. `git diff --check` passou.
- [x] Playwright confirmou no ERP **Todas as Categorias** selecionado e o total visual de 273 itens. Abri e fechei o drawer sem aplicar filtros ou gravar produtos. A sessão reportou 35 erros de console acumulados, incluindo um 404/HMR do Vite para `shared-utils/commercialScheduling/validationRules.ts`; o arquivo existe no workspace atual e o erro não foi reproduzido durante a interação deste ciclo. Isso limita a prova visual aos componentes que permaneceram carregados e não confirma a presença de uma composição específica nos resultados.
- [x] TypeScript mobile terminou com código 2 por **105 linhas de diagnósticos globais**; o filtro não encontrou diagnóstico em `mobileProductFetchService.ts`, `useMobileProducts.ts`, `NativeProductsScreen.tsx` ou na constante compartilhada.
- [ ] Expo Web e runtime nativo não foram validados; nenhuma leitura direta de composição real foi feita nesta etapa.
- [ ] A skill `erp-web-to-mobile-replication` segue disponível somente na cópia do cache de build; a fonte canônica não foi localizada.

### Ciclo 31 — filtro de situação “Rascunhos”

**Recorte:** consulta da situação **Rascunhos (Em Cadastro)** na lista, sem alterar contratos de salvar rascunho ou concluir produto.

#### Achado registrado antes da correção

- [x] Playwright autenticado mostrou a opção ERP **Rascunhos (Em Cadastro)** no filtro **Situação no ERP**. O drawer permaneceu sem seleção aplicada; nenhum produto foi gravado.
- [x] `ProductFilters` mapeia essa opção para `isDraft: true`, mas `productFilterBuilder` consulta somente `is_draft = true`.
- [x] O mapper ERP já define `isDraft` por `is_draft` **ou** `status = 'draft'`; o filtro mobile já consulta `is_draft = true OR status = 'draft'` e seu mapper usa a mesma interpretação. Portanto, o filtro ERP omitia registros que o próprio ERP e o mobile classificam como rascunhos.
- [x] `docs/negocio/produtos/estrutura-produto-variacao.md` preserva rascunhos incompletos e o modo salvo; não há regra de domínio que justifique excluir do filtro um item marcado `status = 'draft'`.
- [x] A correção proposta é compartilhar o predicado de listagem entre ERP e mobile. A prova cobre o contrato de consulta e a classificação por código; não afirma a existência de registros legados com `status = 'draft'` no banco remoto.

#### Correção aplicada e validação

- [x] `shared-utils/productListDraftFilters.ts` define `is_draft.eq.true,status.eq.draft`; o builder ERP e o serviço mobile agora usam a mesma constante.
- [x] Vitest focado: **11 testes ERP** em `productFilterBuilder.test.ts` e **14 testes mobile** em `mobileProductFetchService.test.ts` aprovados. `git diff --check` passou.
- [x] TypeScript completo terminou não zero com **687 linhas de diagnósticos globais no ERP** e **105 no mobile**; a filtragem não encontrou diagnósticos nos arquivos alterados deste ciclo.
- [x] Playwright confirmou a opção de rascunhos no ERP. O filtro não foi aplicado e nenhum produto foi gravado; a prova valida a opção e os contratos por código, não resultados de registros remotos.
- [ ] Expo Web e runtime nativo não foram validados. A skill `erp-web-to-mobile-replication` continua acessível somente na cópia em cache de build; não foi localizada fonte canônica.

### Ciclo 32 — filtro por categoria da lista

**Recorte:** aplicar a categoria selecionada pelo UUID no estado da lista, sem alterar o cadastro de categorias ou produtos.

#### Evidência anterior à correção

- [x] O seletor ERP em `ProductFilters.tsx` usa `cat.id` no valor da opção; o campo não envia o nome da categoria.
- [x] `productPersistenceService.ts` remove `products.category` antes de persistir, grava o UUID em `products.category_id` e sincroniza as categorias selecionadas em `product_categories`.
- [x] Antes da correção, `productFilterBuilder.ts` comparava o UUID do filtro somente com `products.category`. O app já incluía `category_id`, as relações `product_categories` e o nome legado no predicado.
- [x] A documentação de estrutura classifica Produtos em zero ou mais Categorias; portanto, filtrar somente a categoria primária não cobre vínculos secundários.
- [x] Supabase informa que `.or()` não combina filtros de tabelas distintas; o helper consulta os IDs de vínculos e os inclui no predicado da tabela `products` ([documentação de filtros `or`](https://supabase.com/docs/reference/javascript/using-filters-or)).

#### Correção aplicada e validação

- [x] `shared-utils/productListCategoryFilters.ts` agora busca, em paralelo, o nome legado da categoria e os IDs de Produtos relacionados; monta um predicado comum para `category_id`, `category` legado e IDs N:N. Nomes com caracteres reservados são citados/escapados e os IDs repetidos são removidos.
- [x] Builder ERP e serviço mobile reutilizam o helper, propagam falhas das leituras auxiliares e conservam os demais filtros da lista.
- [x] Vitest focado: **17 testes ERP** (`productFilterBuilder.test.ts` e `productListCategoryFilters.test.ts`) e **15 testes mobile** (`mobileProductFetchService.test.ts`) aprovados.
- [x] TypeScript completo terminou não zero por diagnósticos globais: **687 linhas no ERP** e **105 no mobile**; a filtragem não encontrou diagnósticos nos arquivos alterados neste ciclo. `git diff --check` passou.
- [ ] Playwright visível usou a porta 5173, mas `/products` redirecionou para `/login`. As variáveis Vercel consultadas não incluem conta geral de teste; as variáveis fiscais não foram reutilizadas. A opção da categoria não foi selecionada visualmente e não houve leitura de produtos no banco remoto nem escrita de dados.
- [ ] Expo Web e runtime nativo não foram validados; a interface móvel permanece fora desta prova de query.

### Ciclo 33 — resumo Modelo/Linha no modal de descrição com IA

**Recorte:** estado de características no modal de geração da aba Descrição.

#### Evidência da divergência

- [x] O `ProductDescriptionInformativeModal` do ERP mostra Modelo e Linha em linhas separadas quando ambos existem; quando há apenas um valor ou o atributo combinado `Modelo/Linha`, mostra o rótulo “Modelo / Linha”.
- [x] A aba mobile já calculava `modelOrLine` a partir das chaves combinadas e dos valores individuais, mas não o passava ao modal. O modal sempre apresentava “Modelo” e só apresentava “Linha” separadamente, deixando o resumo com um traço quando o valor estava no atributo combinado.
- [x] A validação, o schema Zod e a chamada de geração já eram compartilhados/equivalentes; a diferença estava apenas na apresentação dos dados no modal.

#### Correção aplicada e validação

- [x] `buildProductDescriptionModelSummary` agora preserva a apresentação separada quando Modelo e Linha existem e usa “Modelo / Linha” com fallback ao valor individual quando existe apenas um.
- [x] A aba mobile envia ao modal o `modelOrLine` já resolvido pelo formulário. Payload de IA, validação e persistência do produto não mudaram.
- [x] Vitest focado: **3 testes** do resumo e **10 testes** do serviço mobile de IA aprovados.
- [x] TypeScript completo do mobile terminou não zero com erros globais em outros módulos e no schema compartilhado existente; não foram reportados diagnósticos nos arquivos do modal e do resumo.
- [ ] O teste já existente da aba ERP não iniciou: Vitest não resolveu `react/jsx-dev-runtime` no ambiente atual, então nenhum teste dessa suíte foi executado.
- [ ] Playwright visível abriu `/products` na porta 5173 e foi redirecionado para `/login`. Nenhuma autenticação foi contornada; o modal não foi aberto no navegador e não houve chamada real à IA nem gravação de produto.
- [ ] Expo Web e runtime nativo não foram validados. A paridade visual autenticada e o comportamento nativo do modal continuam pendentes.

### Ciclo 34 — característica Marca na aba técnica

**Recorte:** edição da característica Marca e sincronização com o estado raiz do formulário.

#### Evidência da divergência

- [x] O ERP atualiza `technicalValues.Marca` e também `formData.brand` em `applyTechnicalValueChangeToProduct`; sua aba de Descrição usa `brand` antes do fallback técnico.
- [x] O mobile atualizava `technicalValues` e, para variações, `attributes`, mas não sincronizava `formData.brand` ao editar Marca. A aba de Descrição prioriza `formData.brand`, e o payload mobile também lê esse campo raiz; um valor anterior podia continuar sendo usado.
- [x] A regra de sincronização era pequena e pura, mas estava isolada no helper ERP; foi compartilhada para manter o mesmo mapeamento nos dois formulários.

#### Correção aplicada e validação

- [x] `shared-utils/productTechnicalRootPatch.ts` define a atualização de Marca no campo raiz. ERP e mobile agora usam o mesmo helper; apagar Marca também limpa o valor raiz mobile. Valores técnicos e atributos da variação continuam seguindo seus caminhos existentes.
- [x] A cobertura do formulário RHF/Zod não mudou: os campos continuam pertencendo ao `ProductFormScreen` e passam pelo resolver principal antes do serviço.
- [x] Vitest focado: **15 testes aprovados** — 3 do helper compartilhado, 2 do serviço mobile de características e 10 de sincronização técnica ERP.
- [x] A filtragem TypeScript não encontrou diagnósticos nos arquivos tocados; as verificações completas do workspace continuam não zero por diagnósticos globais em outros módulos.
- [ ] A suíte visual pelo Playwright permanece na tela `/login`; não houve acesso à aba nem salvamento de Produto.
- [x] A divergência de persistência foi auditada no Ciclo 35; veja a evidência e o alinhamento abaixo.
- [ ] Expo Web e runtime nativo não foram validados.

### Ciclo 35 — persistência da característica Marca

**Recorte:** contrato de gravação de `products.brand` e de `technical_specs.technicalValues.Marca`.

#### Evidência da divergência

- [x] A migration `supabase/migrations/20260817000000_fix_product_images_and_columns.sql` cria a coluna direta `products.brand`. `mapToDB` do ERP já a inclui, e `mapFromDB` lê esse campo.
- [x] Antes da correção, `erp/src/pages/utils/productService/productPersistenceService.ts` e `erp/src/pages/utils/productService/productMutationService.ts` removiam `brand` antes da gravação: `syncProductToSupabase` e o caminho de atualização sem produto no cache em `saveProduct`. `mobile/src/features/products/services/mobileProductMutationService.ts` envia `brand` e `technical_specs.technicalValues` na RPC `save_mobile_product_transaction`.
- [x] A definição atual da RPC foi inspecionada no projeto Supabase remoto, schema `public`, por consulta SQL somente de leitura. Ela inclui `brand` tanto no `INSERT` quanto no `UPDATE`, e também grava `technical_specs`; nenhuma linha de Produto foi alterada nessa inspeção. A função não está versionada nas migrations locais.
- [x] A documentação vigente não define `brand` como exceção mobile nem explica sua remoção pelo ERP. O campo raiz também é mantido pelo handler compartilhado da característica `Marca` e é lido no mapeamento dos dois clientes.

#### Correção aplicada e validação

- [x] Os escritores ERP deixaram de remover a coluna `brand`, alinhando o contrato web ao mobile e ao schema atual. O mobile mantém os dois campos: `brand` para a coluna raiz e `Marca` em `technicalValues` para as características.
- [x] O formulário continua pertencendo ao `ProductFormScreen` e passa pelo RHF/Zod existente; esta correção só altera a persistência após validação.
- [x] Vitest ERP: **1 teste** em `productPersistenceService.test.ts` confirma `brand` no payload de `syncProductToSupabase`. Vitest mobile: **20 testes** em `mobileProductMutationService.test.ts` aprovados, incluindo `brand` e `technicalValues.Marca` no payload da RPC.
- [x] `git diff --check` passou sem erros de whitespace; Git emitiu apenas avisos de finais de linha CRLF em arquivos do workspace. Não houve alteração de schema nem gravação remota.
- [ ] Playwright segue sem sessão autenticada em `/login`; este recorte de persistência não alterou UI. Não houve inspeção autenticada, gravação remota ou validação em aparelho. Expo Web não comprova comportamento nativo.
- [ ] O caminho alternativo do ERP para atualizar registro ausente do cache teve a mesma exclusão removida, mas não foi exercitado por teste específico neste ciclo.

#### Próximo recorte identificado

- [x] A auditoria do campo raiz `category` foi concluída no Ciclo 36; veja o contrato normalizado por UUID e a preservação de leitura legada abaixo.

### Ciclo 36 — persistência normalizada de categorias

**Recorte:** gravar a seleção de categorias do formulário móvel pelo contrato ERP (`category_id` primário e vínculos `product_categories`), mantendo o rótulo textual legado apenas para leitura/apresentação de registros antigos.

#### Evidência da divergência

- [x] A aba Geral do ERP seleciona categorias por UUID em `categoryIds`. O mapper coloca o primeiro UUID em `category_id`; `productPersistenceService.ts` remove `category` e sincroniza a seleção completa em `product_categories`.
- [x] O formulário mobile também edita UUIDs: `handleToggleCategory` atualiza `categoryIds` e `categoryId` (primeiro UUID) e mantém `category` como rótulo visual. `ProductFormScreen.tsx` hidrata os IDs pelas relações ou pelo `category_id` primário; a leitura do campo legado continua disponível.
- [x] Antes da correção, `saveMobileProduct` enviava o rótulo raiz `category`, dava precedência a `categoryId` mesmo quando `categoryIds` continha outra seleção e enviava `p_category_ids` diretamente do array, sem fallback para o ID singular exibido pelo formulário.
- [x] A definição atual da RPC `public.save_mobile_product_transaction` foi inspecionada no Supabase remoto por consulta somente de leitura: `p_product` é aplicado no INSERT/UPDATE via `jsonb_populate_record` e `p_category_ids` substitui os vínculos N:N. Omitir `category` do payload limpa essa coluna, como no ERP. Nenhuma linha foi alterada; a RPC não está versionada nas migrations locais.
- [x] A documentação de domínio permite zero ou mais categorias por produto e identifica as relações N:N como parte do modelo. A auditoria histórica também registra produtos sem `category_id` e divergências entre ID primário e relações, portanto o rótulo legado não foi usado como fonte de verdade para novas gravações.

#### Correção aplicada e validação

- [x] O serviço mobile normaliza os IDs com a mesma precedência visual do formulário: usa a lista múltipla quando preenchida e recorre ao `categoryId` quando só há seleção singular. O primeiro ID alimenta `category_id`, a lista completa vai para `p_category_ids` e o texto `category` deixa de ser enviado.
- [x] Os fallbacks de leitura de `category` para apresentação de registros legados foram preservados. O formulário continua passando pelo RHF/Zod existente; nenhuma regra de validação ou interface foi alterada.
- [x] Vitest mobile: **21 testes** de `mobileProductMutationService.test.ts` aprovados, incluindo múltiplas categorias, `categoryId` obsoleto, fallback singular e ausência de `category` no payload. `git diff --check` passou; Git emitiu avisos de finais de linha CRLF.
- [ ] TypeScript mobile completo terminou não zero com **105 linhas de diagnósticos globais** em arquivos diversos do app e dependências compartilhadas. A saída inclui erros fora do serviço de mutação deste ciclo; a verificação completa não serve como prova verde do workspace.
- [ ] Playwright não foi repetido neste recorte, que alterou somente o payload de persistência e não a UI. A última tentativa registrada permanece redirecionada para `/login`; comparação autenticada, Expo Web, runtime nativo e gravação remota real seguem pendentes. Expo Web não comprova comportamento nativo.
- [x] A origem canônica da skill foi procurada em `.agents/skills` e no diretório de skills do projeto; só foi encontrada a cópia no backup de build sob `erp/.vercel/builders-backup-72ebb3b0/...`. Ela foi aplicada como orientação e a limitação de origem permanece registrada.

#### Próximo recorte identificado

- [x] Ações ativas de lista/duplicação e a passagem de categorias foram auditadas no Ciclo 37; veja o rastreamento ERP/mobile abaixo.

### Ciclo 37 — categorias nas ações de lista e duplicação

**Recorte:** confirmar que a ação ativa de duplicar recarrega o produto completo e preserva os vínculos N:N ao abrir a cópia no formulário, antes de qualquer gravação.

#### Evidência de paridade

- [x] No ERP, `ProductList` recebe `openDuplicateProduct` quando `canManageProducts` permite. O handler busca `getFullProduct(id)`, cuja consulta carrega `product_categories(*, categories(*))`; `mapFromDB` cria `categoryIds` pelas relações (ou usa `category_id` quando não há relações) e chama `restoreProductDraft`, wrapper do helper compartilhado `restoreProductDraftSnapshot`.
- [x] No mobile, `NativeProductsScreen.handleDuplicate` respeita `canEditProducts` e faz nova consulta por `productId` sem `summaryOnly`. A projeção completa inclui `*` e `product_categories(category_id)`; o mapper conserva as relações no objeto retornado e aplica o mesmo `restoreProductDraftSnapshot` compartilhado.
- [x] O `ProductFormScreen` mobile inicializa `categoryIds` das relações carregadas e usa `category_id` como fallback quando não há relações, equivalente ao `mapFromDB` do ERP. A interface de lista pode usar uma projeção resumida sem `category_id`, mas o fluxo ativo de duplicação recarrega a projeção completa antes de abrir o formulário.
- [x] Ambos os handlers clonam o produto completo, criam novo código e identificadores de variação e abrem um rascunho inativo para edição. O salvamento permanece no fluxo do formulário; a cópia não é persistida ao apenas abrir o modal.
- [x] `duplicateMobileProduct` tem somente a declaração no repositório, sem call sites encontrados. É um helper legado que chama `saveMobileProduct` diretamente; não participa da ação ativa de lista e deve ser avaliado antes de qualquer reutilização, pois contorna o formulário RHF/Zod e não normaliza relações N:N recebidas apenas em `product_categories`.

#### Resultado e validação

- [x] Não foi encontrada diferença de categoria no fluxo ativo de duplicação; nenhuma alteração de produto foi necessária neste ciclo.
- [x] Vitest mobile: **15 testes** em `mobileProductFetchService.test.ts` aprovados. Essa suíte cobre o serviço de consulta; não contém teste de interface da ação de duplicar.
- [ ] Playwright visível abriu `/products` e foi redirecionado a `/login`. A lista de variáveis Vercel de desenvolvimento contém credenciais de operador fiscal, mas nenhuma conta geral de teste ERP; não houve bypass de autenticação nem cópia salva. A inspeção visual autenticada e Expo Web permanecem pendentes.
- [ ] Runtime Android/iOS e abertura nativa do formulário de duplicação não foram validados. Expo Web não comprova comportamento nativo.
- [x] Skill de replicação aplicada pela cópia de backup em `erp/.vercel/builders-backup-72ebb3b0/...`; a origem canônica ainda não foi localizada fora do cache de build.

#### Próximo recorte identificado

- [x] Iniciada no Ciclo 38 a auditoria da seleção dos campos técnicos por categoria; persistência de valores e acesso ativo à Central continuam pendentes.

### Ciclo 38 — seleção de atributos técnicos por categoria no formulário

**Recorte:** campos técnicos do Produto pai quando a categoria selecionada define atributos aplicáveis; sem alterar a validação de finalização nem a conciliação.

#### Evidência registrada antes de qualquer correção de código

- [x] O ERP ativo passa por `ProductTechnicalTab` → `useTechnicalFieldApplicability` → `getApplicableTechnicalFields`. O seletor detecta Pias pela categoria `1b5a4933-f762-4918-ae68-70e109e8c45d` ou por vínculo de `Material da pia`/`Concretada?`; suprime `Material da estrutura` nessa categoria e mantém `Material da pia`, `Concretada?` e `Possui cuba de inox?` fora de outras categorias, salvo adição manual.
- [x] O mobile usa `ProductFormTechnicalTab` → `getApplicableProductTechnicalFields`, que aplica categorias, obrigatoriedades globais, peso e colchões, mas não as regras de Pias. Sem exceção mobile documentada, campos de pia com vínculo/valor legado podem aparecer em categorias diferentes e `Material da estrutura` pode aparecer em Pias.
- [x] Os dois serviços consultam `category_attributes` e carregam os vínculos obrigatórios; o schema mobile não exige todos esses valores para finalizar. A documentação de domínio determina que valores ausentes virem pendências, sem preenchimento automático; esta correção fica restrita à seleção de campos e preserva a validação do formulário.
- [x] A tela ERP `ProductReconciliation.tsx` contém a detecção/correção dessas pendências, mas não há rota ativa para ela: `Router.tsx` aponta `/products/reconciliation` para `SupplierReconciliation`. A ação mobile também abre somente `/products/reconciliation/suppliers`. Não há fluxo ativo comparável para implementar nesta etapa; confirmar a rota da Central de Produtos permanece pendente.
- [x] `shared-utils/productSinkCategoryRules.ts` agora concentra o ID e os predicados de Pias. ERP reexporta esses predicados por `technicalValuesService`; `getApplicableProductTechnicalFields` no mobile aplica as mesmas regras de visibilidade. A busca, valores existentes, validação RHF/Zod e payloads não foram alterados.
- [x] A exceção por categoria faz o app ocultar `Material da estrutura` em Pias e ocultar `Material da pia`, `Concretada?` e `Possui cuba de inox?` em outras categorias, exceto quando esses campos forem adicionados manualmente, como no ERP.

#### Validação executada e limites

- [x] Vitest mobile `productCharacteristics.test.ts`: **16 testes aprovados**, incluindo categoria pelo UUID, fallback por vínculo e valores legados em outra categoria.
- [x] Vitest ERP `ProductTechnicalTab.test.tsx`: **4 testes aprovados**; a execução confirmou a resolução da regra compartilhada no caminho ERP.
- [x] `git diff --check` nos arquivos deste ciclo não apontou erro. A verificação global continua reportando uma linha em branco no fim de `mobile/src/services/stock/stockSefazService.ts`, arquivo fora deste recorte e preservado.
- [ ] Não houve inspeção autenticada do estado visual neste ciclo. A evidência anterior de Playwright segue em `/login`; nenhuma autenticação foi contornada. Expo Web e runtime nativo continuam sem validação.
- [ ] A cobertura confirma a seleção dos campos, não a persistência remota nem o ciclo de valores RHF do produto simples versus cada variação. A validação do formulário e os caminhos de salvamento não foram alterados; esse contrato permanece para auditoria específica.
- [ ] A tela ERP `ProductReconciliation.tsx` continua sem rota ativa e a ação mobile ainda abre conciliação de fornecedores. **Pergunta pendente:** a página de conciliação de atributos/produtos deve ser ativada no ERP antes de replicar seu acesso no mobile?
- [ ] A skill `erp-web-to-mobile-replication` continua disponível somente no cache de build; nenhuma versão canônica foi encontrada nos diretórios do projeto.

#### Próximo recorte identificado

- [x] A auditoria da herança de `technicalValues` do pai para a variação única foi concluída no Ciclo 39. A persistência canônica em `product_variations.attributes` permanece em aberto porque o código ERP e o mobile guardam os campos globais no JSON do produto/`variationDetails`, em desacordo com a documentação de domínio; a decisão sobre a rota de `ProductReconciliation` continua separada.

### Ciclo 39 — valores técnicos herdados pela variação simples

**Recorte:** estado do formulário para a variação operacional única recém-criada; preservar os valores próprios de produtos salvos e famílias com várias variações.

#### Evidência registrada antes da correção

- [x] O ERP sincroniza os `technicalValues` do pai para a única variação quando o produto é novo e não está no modo multi-variação (`useProductFormSync.ts`). Produtos salvos e famílias não entram nesse efeito.
- [x] O helper mobile `syncMobileVariationsWithParent` atualizava preço, descrição, dimensões e outros campos herdados, mas não copiava `technicalValues`. A aba Técnica guarda os valores do pai em `formData.technicalValues`; a variação simples podia, portanto, chegar ao `variationDetails` do payload sem a cópia que o ERP mantinha.
- [x] A regra foi extraída para `shared-utils/simpleProductVariationTechnicalValues.ts` e usada nos dois formulários. No mobile, a sincronização só atua em uma variação, em modo simples e sem ID persistido; valores próprios de famílias e de produtos já salvos ficam intactos.
- [x] O ajuste mantém o formato do ERP: valores técnicos do pai são persistidos em `technical_specs.technicalValues` e nas cópias de formulário em `technical_specs.variationDetails`; o campo da tabela `product_variations.attributes` continua recebendo `variation.attributes`.

#### Validação executada e limites

- [x] Vitest mobile `productVariationParentSync.test.ts`: **7 testes aprovados**, cobrindo herança em produto simples novo e preservação em produto salvo/família.
- [x] Vitest ERP `useProductFormSync.test.tsx`: **2 testes aprovados**, incluindo a herança existente usada como referência.
- [x] TypeScript completo nos projetos mobile e ERP terminou com código 2 por diagnósticos globais preexistentes em outros módulos; a saída filtrada não apontou os arquivos deste ciclo. `git diff --check` focal não encontrou erros, apenas avisos CRLF.
- [ ] Nenhum teste gravou no banco remoto. A cobertura valida o estado de formulário e a regra ERP; runtime nativo, Playwright autenticado e leitura de persistência remota continuam pendentes.
- [ ] A documentação de domínio (`estrutura-produto-variacao.md`, linhas 60–64) determina que valores obrigatórios por categoria tenham seu valor efetivo em `product_variations.attributes`. O caminho de gravação ERP/mobile não faz essa projeção para valores globais: usa `technical_specs.technicalValues`/`variationDetails`, enquanto `product_variations.attributes` recebe apenas `variation.attributes`. **Decisão pendente:** corrigir o writer do ERP e do mobile para cumprir o contrato documentado, ou manter o contrato de código atual e ajustar documentação/conciliação. Nenhuma mudança de payload foi feita sem essa decisão.
- [ ] A página `ProductReconciliation.tsx` continua sem rota ativa e a ação mobile ainda abre conciliação de fornecedores. **Pergunta pendente:** ativar primeiro a rota da Central de atributos no ERP antes de replicar seu acesso no mobile?
- [ ] A skill `erp-web-to-mobile-replication` só foi encontrada na cópia de cache de build; a versão canônica continua sem localização.

#### Próximo recorte identificado

- [ ] Resolver o contrato dos valores de `category_attributes` entre `technical_specs.variationDetails` e `product_variations.attributes`; em seguida, auditar a leitura/edição de valores próprios em cada variação sem repetir a regra de herança simples.

### Pendências para próximos ciclos

- [ ] Reconstituir evidências dos Ciclos 6–7, caso existam em registros adicionais.
- [x] Auditar a busca textual da lista no Ciclo 3 e os estados de carregamento, erro, vazio e busca sem resultados no Ciclo 5; permanece pendente a comparação visual autenticada.
- [x] Auditar o estado de filtros e adicionar a limpeza no mobile no Ciclo 4; alinhar o filtro por UUID e relações N:N no Ciclo 32 e a persistência do formulário por UUID no Ciclo 36; conferir duplicação no Ciclo 37 e seleção técnica da categoria Pias no Ciclo 38. Persistência dos valores por variação e comparação visual autenticada permanecem pendentes.
- [x] Ordenação livre da galeria do produto pai e sincronização da variação única alinhadas no Ciclo 13; a seleção em lote e sua ordem no seletor da variação foram alinhadas no Ciclo 14; o palco branco, margem e processamento quadrado 1080×1080 foram implementados no Ciclo 15. Permanecem pendentes a validação da captura em dispositivo, a comparação visual autenticada e o upload remoto.
- [ ] Concluir auditoria das abas e estados ainda não cobertos: características, estados manuais/visuais da descrição, preço/estoque, fiscal, seletor de fotos por variação, demais ações da lista, persistência de atributos por categoria, permissões e confirmações.
- [x] Auditar e alinhar a persistência de `products.brand` no Ciclo 35; continua pendente a prova de gravação remota real, sem fixture de propriedade comprovada.
- [x] Ciclo 26 corrigiu o crash de `variations: [null]` durante a validação contextual do ERP e confirmou que o schema mobile também retorna erro sem exceção.
- [ ] Continuar os demais estados de validação/erro da aba Estoque e Precificação; fazer comparação visual autenticada/validação em aparelho.
- [x] Filtro por UUID da categoria alinhado no Ciclo 32; persistência por UUID no Ciclo 36; passagem de categorias pelo fluxo ativo de duplicação conferida no Ciclo 37; seleção de campos de Pias alinhada no Ciclo 38; herança de `technicalValues` para a variação simples alinhada ao ERP no Ciclo 39. O filtro de rascunhos foi alinhado no Ciclo 31 e os tipos gerais **Somente Produtos** e **Todos** nos Ciclos 29–30.
- [ ] Permanecem pendentes a resolução da divergência entre o contrato documentado de `product_variations.attributes` e a persistência atual em `technical_specs`, a decisão sobre a rota de `ProductReconciliation` e a auditoria do helper legado sem call sites.
- [ ] Comparar com Playwright os estados autenticados entre ERP e Expo Web assim que houver conta de teste disponível; validar o runtime nativo separadamente, sem inferi-lo do Expo Web.
- [ ] Confirmar origem canônica da skill `erp-web-to-mobile-replication`; a cópia consultada está apenas em cache de build.

**Critério de encerramento global:** concluir cada área aplicável, registrar exceções justificadas e manter pendentes explícitas as validações que dependam de runtime nativo; não declarar equivalência nativa com base somente no Expo Web.
