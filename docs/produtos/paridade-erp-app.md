# Auditoria de paridade do módulo Produtos: ERP → App Mobile

**Status:** em andamento. Este inventário acompanha as execuções cíclicas da auditoria. A exceção vigente do Ciclo 127, reafirmada no Ciclo 131, determina que a Conciliação de Produtos seja exclusiva do ERP; a tela e os adaptadores mobile foram removidos e não são uma diferença de paridade pendente. A decisão do Ciclo 130 foi aplicada no Ciclo 139: ambos os writers ERP e o writer mobile projetam em `product_variations.attributes` somente valores preenchidos e exigidos, mantêm `technical_specs` por compatibilidade, preservam atributos existentes e usam `showName: false` em novos campos projetados sem identidade. O Ciclo 143 implementa localmente claim por primeira conta autorizada para preservar contagem offline; o endpoint e a v2 ainda não estão no remoto e não podem ser considerados operacionais. O Ciclo 144 alinhou a leitura/edição de overrides técnicos já persistidos em variações antigas. O Ciclo 147 encaminha mover para a lixeira e restaurar ao dispatcher Meta nos dois clientes; a confirmação do efeito no catálogo externo continua pendente. O Ciclo 148 reabilitou o cadastro global de fornecedor em 3/3 vínculos sem relaxar o limite de associação, e o Ciclo 149 adicionou a orientação de busca de componentes abaixo de três caracteres. Os Ciclos 151 e 152 alinharam os gates preventivos de lixeira e de remoção de variação com histórico; o Ciclo 153 bloqueou ativação/desativação quando a linha virtual da lista fica obsoleta. Continuam pendentes, entre outros pontos, a ativação autorizada da RPC de ACK de autosave (a coluna e função versionada ainda não existem no remoto, conforme Ciclo 141), reconciliação/aplicação autorizada da migration de claim e provas de saldo/CMPM em ambas as plataformas. Os demais ciclos e suas limitações seguem registrados abaixo; não declarar conclusão global enquanto houver estados sem conferência.

**Atualização do Ciclo 154:** a entrada de estoque continua atualizando `stock` e CMPM/`costPrice`; ela não recalcula `finalPurchasePrice` no ERP. Como a documentação vigente não cria essa regra e a hidratação do formulário ERP/mobile usa o mesmo cálculo compartilhado, foi preservado o resultado atual do ERP conforme a instrução permanente do usuário para divergências sem contrato documentado.

**Atualização do Ciclo 155:** o seletor de características de categoria no app agora segue o mínimo de duas letras e a normalização compartilhada do ERP. Leituras do catálogo/vínculos têm limite de 15 s nos dois clientes; o formulário continua falhando fechado quando não consegue carregar a configuração atual. O campo-filho foi vinculado ao proprietário RHF/Zod no inventário de formulários.

> **Exceção vigente — decisão do usuário no Ciclo 127, reafirmada no Ciclo 131:** a Conciliação de Produtos permanece somente no ERP. A tela, o acesso pelo menu/estado de produtos, o adaptador de serviços e os helpers de ciclo de vida específicos do mobile foram removidos. Não tratar sua ausência no aplicativo como diferença de paridade, não propor nova implementação e não a reintroduzir sem pedido explícito posterior. Permanecem no ERP a rota, a permissão e os serviços compartilhados que ele consome; a regra permanente está em `AGENTS.md`, `rules/products/product-reconciliation-erp-only.yml` e na automação recorrente.

> **Recuperação do inventário — 23/10/2026:** o arquivo do workspace foi encontrado com 0 bytes após falta de espaço no volume C:. A versão rastreada no Git foi restaurada; ela continha os ciclos 1–5. Os ciclos 8–12 abaixo foram recompostos apenas a partir dos registros atuais em `docs/geral/roadmap_pendente.md` e `docs/forms/inventario-mobile-catalogo-2026-10-15.md`. Não há evidência localizada para reconstituir os ciclos 6–7, então eles permanecem sem status de conclusão.

## Regras e referências consultadas

- `AGENTS.md` e `docs/geral/USER_RULES.md`.
- Skills de replicação ERP → app. A cópia encontrada neste workspace está em `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/erp-web-to-mobile-replication/SKILL.md`; ela está em cache gerado e não foi tratada como fonte canônica. Nenhuma cópia canônica foi encontrada em `.agents/skills` na raiz, `erp/` ou `mobile/` durante este ciclo.
- `docs/negocio/produtos/estrutura-produto-variacao.md` e `docs/negocio/produtos/operacoes-troca-pai-merge.md`.
- `docs/negocio/estoque/inventario-e-ajustes.md`, `docs/negocio/estoque/movimentacoes-e-custo.md` e `docs/negocio/estoque/contrato-indice-inventario-offline.md`.
- `docs/arquitetura/offline-e-sincronizacao.md` e `docs/mobile/arquitetura_offline_first.md`.
- Regras em `rules/`; `rules/products/product-reconciliation-erp-only.yml` protege a exceção ERP-only registrada nos Ciclos 127/131. A regra `rules/stock/no-inventory-move-write-in-ui.yml` foi consultada no Ciclo 93 e delimita a pendência: qualquer futura ação mobile de entrada precisa gravar por serviço/RPC de estoque autorizado, nunca diretamente pela UI.
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

- [x] A ordenação foi auditada no Ciclo 80: embora a tabela ERP XL mostre ícones, o callback da página é inerte e a ação não altera filtros nem consulta; essa tabela fica oculta no layout de cards. A lista efetivamente disponível em ERP e mobile inicia em `created_at DESC`, portanto não se adicionou seletor mobile sem equivalente funcional.

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
- [x] Diferença de recorte resolvida no Ciclo 15: o ERP compõe o resultado no palco branco 1080×1080; o mobile agora rasteriza o mesmo palco com `react-native-svg`, converte a seleção de layout para pixels e recorta essa imagem pelo Expo ImageManipulator. A geometria e a margem continuam cobertas pelo schema compartilhado; a confirmação visual em Android/iOS permanece pendente.

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
- [x] Retificação do Ciclo 47: `Router.tsx` tem rotas ativas `/products/reconciliation` e `/products/reconciliation/suppliers`, ambas sob `PermissionRoute action="viewProductReconciliation"`. `SupplierReconciliation.tsx` é uma reexportação/alias de `ProductReconciliation`; o nome da rota não limita a página a fornecedores.
- [x] `shared-utils/productSinkCategoryRules.ts` agora concentra o ID e os predicados de Pias. ERP reexporta esses predicados por `technicalValuesService`; `getApplicableProductTechnicalFields` no mobile aplica as mesmas regras de visibilidade. A busca, valores existentes, validação RHF/Zod e payloads não foram alterados.
- [x] A exceção por categoria faz o app ocultar `Material da estrutura` em Pias e ocultar `Material da pia`, `Concretada?` e `Possui cuba de inox?` em outras categorias, exceto quando esses campos forem adicionados manualmente, como no ERP.

#### Validação executada e limites

- [x] Vitest mobile `productCharacteristics.test.ts`: **16 testes aprovados**, incluindo categoria pelo UUID, fallback por vínculo e valores legados em outra categoria.
- [x] Vitest ERP `ProductTechnicalTab.test.tsx`: **4 testes aprovados**; a execução confirmou a resolução da regra compartilhada no caminho ERP.
- [x] `git diff --check` nos arquivos deste ciclo não apontou erro. A verificação global continua reportando uma linha em branco no fim de `mobile/src/services/stock/stockSefazService.ts`, arquivo fora deste recorte e preservado.
- [ ] Não houve inspeção autenticada do estado visual neste ciclo. A evidência anterior de Playwright segue em `/login`; nenhuma autenticação foi contornada. Expo Web e runtime nativo continuam sem validação.
- [ ] A cobertura confirma a seleção dos campos, não a persistência remota nem o ciclo de valores RHF do produto simples versus cada variação. A validação do formulário e os caminhos de salvamento não foram alterados; esse contrato permanece para auditoria específica.
- [x] Retificação no Ciclo 47: a rota ERP está ativa e a tela reúne pendências de fornecedores, categorias, NCM, atributos e preços. A decisão de ativar a rota no ERP não é mais pendente.
- [x] Retificação no Ciclo 115: esta evidência do Ciclo 47 ficou obsoleta depois do Ciclo 48. `NativeProductsScreen` abre `NativeProductReconciliationScreen` sob `viewProductReconciliation`; edição individual e operações em lote foram completadas nos Ciclos 49–50. A validação visual autenticada e no runtime Android/iOS continua pendente e não é inferida do Expo Web.
- [ ] A skill `erp-web-to-mobile-replication` continua disponível somente no cache de build; nenhuma versão canônica foi encontrada nos diretórios do projeto.

#### Próximo recorte identificado

- [x] A auditoria da herança de `technicalValues` do pai para a variação única foi concluída no Ciclo 39. A persistência canônica em `product_variations.attributes` permanece em aberto porque o código ERP e o mobile guardam os campos globais no JSON do produto/`variationDetails`, em desacordo com a documentação de domínio. Retificação no Ciclo 47: a rota ERP de `ProductReconciliation` está ativa; falta paridade nativa no mobile.

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
- [ ] A documentação de domínio (`estrutura-produto-variacao.md`, linhas 60–64) determina que valores obrigatórios por categoria tenham seu valor efetivo em `product_variations.attributes`. O caminho de gravação ERP/mobile não faz essa projeção para valores globais: usa `technical_specs.technicalValues`/`variationDetails`, enquanto `product_variations.attributes` recebe apenas `variation.attributes`. **Decisão pendente do Ciclo 130:** corrigir o writer do ERP e do mobile para cumprir o contrato documentado ou manter o contrato de código atual e ajustar documentação/consumidores ERP. Esta pendência não reabre a Conciliação mobile, que é exclusiva do ERP desde o Ciclo 127. Nenhuma mudança de payload foi feita sem essa decisão.
- [x] Retificação no Ciclo 47: `ProductReconciliation.tsx` é alcançável pelas duas rotas ERP e a ação mobile abre a mesma página ERP no navegador externo. A implementação de uma interface React Native permanece pendente; não é necessário ativar a rota web.
- [ ] A skill `erp-web-to-mobile-replication` só foi encontrada na cópia de cache de build; a versão canônica continua sem localização.

#### Próximo recorte identificado

- [ ] Auditar leitura e edição de valores próprios nas variações de famílias com duas ou mais variações, sem repetir o bloqueio da variação simples concluído no Ciclo 40. A divergência do formato de persistência de atributos por categoria segue pendente; a Conciliação mobile foi retirada por decisão do usuário no Ciclo 127 e reafirmada no 131.

### Ciclo 40 — bloqueio de características na variação única

**Recorte:** controles da aba Características da variação operacional única; preservar edição do produto pai e personalização em famílias com duas ou mais variações.

#### Evidência registrada antes da correção

- [x] O ERP deriva `isSingleVariation` no modal da variação, passa o estado à aba técnica e desabilita a edição do campo e a alternância Profundidade/Comprimento em `VariationTechnicalFieldItem.tsx`. A remoção de característica manual continua disponível.
- [x] O documento `docs/negocio/produtos/estrutura-produto-variacao.md` define a variação única como produto simples herdado do pai, com controles de personalização bloqueados enquanto existir uma única variação; os controles voltam ao adicionar a segunda.
- [x] O mobile já calculava `variations.length === 1` na aba Variações, porém não passava o estado à `ProductFormTechnicalTab`. Ela permitia editar `technicalValues`, tirar herança e alternar profundidade/comprimento em campos variáveis, enquanto o ERP bloqueava esses controles. A cópia dos valores técnicos feita no Ciclo 39 tornou o campo próprio editável em mais casos.
- [x] `ProductFormVariationsTab.tsx` passa `isSingleVariation` ao formulário técnico. Uma variação bloqueia o campo técnico e a alternância Profundidade/Comprimento; duas ou mais liberam esses controles. A ação mobile de herança/personalização mencionada no registro original foi retirada no Ciclo 44 por não existir no campo correspondente do ERP. A edição do produto pai e a remoção de campos manuais permanecem fora do bloqueio.

#### Validação executada e limites

- [x] Vitest/RTL `productSingleVariationTechnicalLock.test.tsx`: **2 testes aprovados**, confirmando bloqueio na variação única e disponibilidade dos controles em família multi-variação.
- [x] `git diff --check` focal aprovado.
- [ ] A checagem visível com Playwright abriu `http://localhost:5173/products` e foi redirecionada a `/login`; nenhuma interação ou gravação ocorreu. Expo Web e runtime Android/iOS não foram validados. Expo Web não comprova comportamento nativo.
- [ ] `npx tsc --noEmit --pretty false` no mobile terminou com código 1 devido a diagnósticos globais preexistentes em outros módulos, inclusive `ProductAiCharacteristicsAssistant.tsx`; nenhum diagnóstico foi emitido para os dois arquivos alterados neste ciclo.
- [ ] Nenhum dado remoto foi gravado. A persistência de atributos e a leitura em registros reais permanecem pendentes conforme o item de Ciclo 39.
- [ ] A skill `erp-web-to-mobile-replication` continua acessível apenas pela cópia de backup/cache de build; sua origem canônica ainda não foi localizada.

#### Próximo recorte identificado

- [x] Auditar leitura/edição de atributos próprios em família com duas ou mais variações: diferença encontrada e corrigida no Ciclo 144; as demais áreas pendentes continuam abertas.

### Ciclo 41 — dependências de características na edição de variação

**Recorte:** estados dependentes da aba Características de uma variação em famílias com múltiplas variações; não altera os controles de características do produto pai.

#### Evidência registrada antes da correção

- [x] No ERP, `VariationTechnicalFieldItem.tsx` combina valores do pai, atributos da variação e valores técnicos do formulário e chama `getCharacteristicDependencyState`. Quando a condição do atributo não está satisfeita, o campo fica desabilitado, o marcador de obrigatório é suprimido e a interface apresenta o motivo.
- [x] O mobile já usava a validação compartilhada de dependências no schema, mas a aba `ProductFormTechnicalTab` não aplicava a mesma condição à edição visual da variação. Um valor próprio existente ainda podia ser editado mesmo quando a característica principal do pai desativava o atributo dependente.
- [x] A documentação de produto não define exceção mobile para esse estado; o fluxo do ERP é a referência comportamental.

#### Correção aplicada e validação

- [x] `shared-utils/productCharacteristicDependencies.ts` reexporta o predicado canônico `getCharacteristicDependencyState` do serviço ERP, seguindo o padrão existente de regras de produto compartilhadas.
- [x] Na aba móvel da variação, o estado combina valores efetivos do pai e valores próprios, desabilita o campo e o controle de aplicabilidade quando dependente, oculta o asterisco de obrigatoriedade e oferece botão acessível para revelar o motivo. O valor já salvo permanece no estado e no payload; a correção não limpa nem reescreve dados.
- [x] Vitest/RTL mobile `productSingleVariationTechnicalLock.test.tsx`: **4 testes aprovados** — 2 cobrem o bloqueio da variação única do Ciclo 40 e 2 confirmam bloqueio/liberação do campo dependente e a apresentação do motivo.
- [x] Vitest ERP `technicalValues/furniture.test.ts`: **4 testes aprovados** para a regra de dependência usada como referência.
- [x] `git diff --check` aprovado; Git emitiu somente avisos de finais de linha CRLF em arquivos já modificados no workspace.
- [ ] TypeScript completo mobile segue não zero por diagnósticos globais preexistentes; nenhum diagnóstico foi reportado nos arquivos modificados deste recorte.
- [ ] Playwright visível abriu `http://localhost:5173/products`, mas a aplicação redirecionou para `/login`. As variáveis Vercel de desenvolvimento foram inspecionadas sem descriptografar valores: não há conta geral de teste; as credenciais encontradas são do operador fiscal e não foram reutilizadas. Nenhum acesso foi contornado e nenhum Produto foi gravado.
- [ ] Expo Web e runtime Android/iOS não foram validados. O teste de componente não comprova o comportamento nativo.
- [ ] A skill `erp-web-to-mobile-replication` continua localizada apenas em cache de build, sem versão canônica encontrada.

#### Próximo recorte identificado

- [x] Divergência do default de `showName` ao criar override de Cor corrigida no Ciclo 42. O helper comum agora mantém `Cor` oculta no nome por padrão em ambos os formulários e preserva preferências existentes; veja o ciclo abaixo.
- [ ] Continua pendente a decisão sobre a persistência de atributos globais em `product_variations.attributes` versus `technical_specs` (Ciclo 130). A tela nativa de Conciliação que aparecia como pendência histórica foi removida no Ciclo 127 por decisão ERP-only, reafirmada no Ciclo 131.

### Ciclo 42 — visibilidade padrão de Cor no override da variação

**Recorte:** criação de um override de característica técnica em uma variação de família; mantém a visibilidade de atributos já existentes e os demais estados da aba fora do recorte.

#### Evidência e correção

- [x] `estrutura-produto-variacao.md` define que `showName` ausente significa `true`, mas a tela ERP possui exceção de criação para `Cor`: `VariationTechnicalTab.handleSetOverride` grava `showName: false`. O mobile chamava o upsert genérico, que criava qualquer novo atributo com `true`.
- [x] A regra de default foi centralizada em `shared-utils/productVariationAttributeDefaults.ts` e é usada pelo ERP e pela aba técnica mobile. `upsertProductCharacteristicAttribute` aceita o default do override sem mudar outros call sites; o parser mobile continua interpretando registros antigos sem `showName` como visíveis. O upsert preserva valores explícitos existentes.
- [x] `VariationTechnicalTab.test.tsx` cobre Cor nova oculta e preferência existente preservada. `productCharacteristics.test.ts` cobre Cor, outro atributo, preferências explícitas e registro legado. `productSingleVariationTechnicalLock.test.tsx` cobre o fluxo mobile da variação; `mobileProductMutationService.test.ts` confirma a serialização de `showName: false`.

#### Validação e limites

- [x] Vitest ERP da aba: **6 testes aprovados**; Vitest/RTL mobile da aba: **5 testes aprovados**; domínio mobile: **18 testes aprovados**; serviço de mutação mobile: **21 testes aprovados**.
- [x] `git diff --check` aprovado, com avisos de CRLF em arquivos já modificados. TypeScript completo mobile continua não zero por **61 diagnósticos globais** em outros módulos; a saída filtrada não apontou os arquivos deste ciclo.
- [ ] Playwright não pôde abrir a tela neste ciclo. `npm run dev` na raiz foi executado conforme a regra do projeto, mas o build fiscal interrompeu a inicialização com `Vercel Hobby limit exceeded: 13 API functions`; as portas 5173 e 3000 não ficaram disponíveis. Nenhum guard foi contornado e nenhuma gravação ocorreu. Expo Web e runtime Android/iOS seguem pendentes.
- [ ] A skill `erp-web-to-mobile-replication` continua disponível apenas na cópia do cache/backup de build; sua origem canônica não foi encontrada. Não foram encontrados arquivos de regras de produto em `rules/`.

#### Próximo recorte identificado

- [x] O fallback visual do pai em característica variável sem override foi corrigido no Ciclo 43. O campo mobile agora começa vazio e editável, como no ERP; veja o ciclo abaixo.
- [ ] Continua pendente a decisão sobre a persistência de atributos globais em `product_variations.attributes` versus `technical_specs` (Ciclo 130). A Conciliação permanece exclusiva do ERP pelos Ciclos 127/131 e não deve ser recriada no app.

### Ciclo 43 — campo variável sem override próprio

**Recorte:** valor exibido em uma característica variável da aba da variação, numa família com várias variações; preserva overrides existentes.

#### Evidência e correção

- [x] O ERP `VariationTechnicalTab` passa `isVariable` para `VariationTechnicalFieldItem`. `resolveVariationFieldState` resolve esse campo somente de `variationAttributeValues` e `formData.technicalValues`; sem override o resultado é `undefined`, que o input renderiza como vazio e editável.
- [x] O mobile já obtinha os valores próprios por `getEffectiveVariationTechnicalValues({}, formData, variableTechnicalFieldNames)`, mas o renderizador usava `parentValue` sempre que não havia valor próprio. Com isso, exibia o valor do pai num campo variável sem override, diferente do ERP.
- [x] `ProductFormTechnicalTab` agora aplica o fallback do pai somente fora de campos variáveis. Em variação, um campo variável sem valor próprio aparece vazio e continua editável; um valor próprio continua sendo exibido. Nenhum payload ou regra de persistência foi alterado.
- [x] A regressão mobile reproduziu o valor herdado “Azul” antes da correção e passou depois. A suíte atualizada também mantém a criação do override Cor com `showName: false`. A caracterização ERP foi ajustada para passar `isVariable` como faz o fluxo real e confirma input vazio; o helper cobre a ausência de herança.

#### Validação e limites

- [x] Vitest/RTL mobile `productSingleVariationTechnicalLock.test.tsx`: **6 testes aprovados**. Vitest ERP `VariationTechnicalFieldItem.test.tsx`: **7 testes aprovados**.
- [x] `git diff --check` aprovado, com avisos de CRLF em arquivos do workspace. TypeScript mobile completo terminou com código 2 e **61 diagnósticos globais**; a saída filtrada não apontou `ProductFormTechnicalTab`, os testes ou os helpers de Produtos.
- [ ] Não foi possível validar visualmente via Playwright: a pilha raiz continua sem subir por causa do guard observado na tentativa de `npm run dev` (limite Vercel Hobby excedido em 13 funções), e as portas 5173/3000 seguem fechadas. Nenhuma guarda foi contornada, nenhum dado foi gravado; Expo Web e aparelho também permanecem sem validação.
- [ ] A skill `erp-web-to-mobile-replication` continua acessível apenas pela cópia de cache/backup de build; não foi encontrada origem canônica.

#### Próximo recorte identificado

- [x] Os controles mobile `Personalizar <campo>`/`Herdar <campo> do produto pai` foram auditados e removidos no Ciclo 44; veja o ciclo abaixo.
- [x] A leitura/edição dos valores próprios em famílias multi-variação foi corrigida no Ciclo 144; a decisão de persistência `product_variations.attributes` foi aplicada no Ciclo 139. A validação autenticada/visual continua pendente e a Conciliação permanece ERP-only por decisão dos Ciclos 127/131.

### Ciclo 44 — controles de herança/personalização na variação

**Recorte:** ações da característica variável na aba técnica da variação; preserva o input direto e a alternância de dimensão.

#### Evidência e correção

- [x] A tela ERP passa `isVariable` a `VariationTechnicalFieldItem`, que edita o valor por `onSetOverride` e só oferece remoção para campos manuais. Não há botão para copiar o valor do pai nem para “herdá-lo” removendo o override.
- [x] O mobile oferecia `Personalizar <campo>` copiando o valor do pai e, quando havia override, `Herdar <campo> do produto pai`, que apagava o valor próprio. Para campos variáveis, o ERP não herda o valor do pai; após o Ciclo 43, a ação chamada “Herdar” deixava o campo vazio. A busca de documentação não localizou uma exceção mobile ou necessidade de plataforma que justificasse esses botões.
- [x] Os botões e a rotina `resetVariationOverride` (sem outros chamadores) foram removidos. O campo permanece diretamente editável quando a família permite; o bloqueio de edição da variação única e a alternância Profundidade/Comprimento foram preservados. Os dados não são apagados por essa correção e o formato de persistência permanece inalterado.
- [x] Retificação do Ciclo 40: os botões mobile tinham sido registrados como equivalentes ao bloqueio ERP, mas não existiam no componente de referência. O bloqueio da variação única continua válido para o campo e a alternância; a ação mobile adicional foi removida neste ciclo.

#### Validação e limites

- [x] Vitest/RTL mobile `productSingleVariationTechnicalLock.test.tsx`: **6 testes aprovados**, cobrindo ausência dos controles, campo próprio, campo vazio, bloqueio da variação única e dependências. Vitest ERP `VariationTechnicalFieldItem.test.tsx`: **7 testes aprovados**.
- [x] `git diff --check` aprovado, com avisos de CRLF em arquivos já modificados. TypeScript mobile completo encerrou com código 2 e **61 diagnósticos globais**; a saída filtrada não apontou os arquivos de Produtos deste ciclo.
- [ ] Playwright não foi executado: as portas 5173 e 3000 estão fechadas. A tentativa anterior de inicializar a pilha raiz parou no guard Vercel Hobby de 13 funções; não contornei o guard. Não houve gravação remota. Expo Web e runtime Android/iOS seguem pendentes.
- [ ] A skill `erp-web-to-mobile-replication` continua disponível somente na cópia de cache/backup de build; sua origem canônica não foi localizada.

#### Próximo recorte identificado

- [x] Auditar a limpeza de valor próprio variável no Ciclo 45; a representação e a reabertura já eram equivalentes, e a falta de acesso mobile para limpar opções simples foi corrigida neste ciclo.
- [x] A leitura/edição de valores próprios em famílias multi-variação foi corrigida no Ciclo 144; o contrato de projeção de atributos foi aplicado no Ciclo 139. Validação visual autenticada/nativa segue pendente; a Conciliação permanece ERP-only por decisão dos Ciclos 127/131.

### Ciclo 45 — limpar valor próprio em característica variável

**Recorte:** apagar o valor de uma característica variável numa variação de uma família multi-variação e acompanhar o estado até gravação e reabertura.

#### Comparação e resultado

- [x] O input de texto do ERP envia `''` ao limpar o campo. `VariationTechnicalTab.handleSetOverride` mantém `technicalValues: { Cor: '' }` como override próprio e remove a característica correspondente de `attributes`.
- [x] O input de texto mobile também envia `''`. `ProductFormTechnicalTab.setTechnicalValue` mantém a chave vazia em `technicalValues` e `upsertProductCharacteristicAttribute` remove a entrada de `attributes`. O leitor considera a chave vazia um valor próprio, então ela não volta a herdar o valor do pai.
- [x] A inspeção do componente real revelou uma diferença de entrada que o teste anterior simulava: `ChoiceDropdown` do ERP inclui uma opção vazia; campos simples de escolha e respostas Sim/Não mobile não ofereciam ação equivalente para limpar. Antes da correção, o operador não conseguia chegar ao mesmo estado vazio em campos de escolha mobile. O `ChoiceSearch` de opções pesquisáveis do ERP não oferece limpeza; esse estado não recebeu ação extra no app.
- [x] Os dois mapeadores mantêm o override vazio em `technical_specs.variationDetails`, associado ao UUID da variação. Os atributos vazios não são serializados na linha de `product_variations`; na leitura ERP e mobile, o detalhe com `technicalValues: { Cor: '' }` é restaurado e continua prevalecendo sobre o valor do pai.
- [x] `ProductTechnicalFieldInput` agora oferece a ação acessível `Limpar <campo>` para campos Sim/Não e escolhas simples que correspondem ao `ChoiceDropdown` ERP. A ação envia `''` pelo callback existente, que já atualiza `technicalValues` e remove `attributes`; não alterou schemas, serviços ou payloads. A escolha pesquisável mantém o contrato ERP sem uma ação adicional.
- [x] O estado de payload e reabertura já era equivalente entre ERP e mobile; foram adicionadas regressões para o estado vazio explícito, remoção do atributo, gravação e leitura, além da diferença de interface recém corrigida.
- [ ] A divergência entre o contrato de negócio que aponta valores em `product_variations.attributes` e a gravação atual em `technical_specs.variationDetails` continua sem decisão. O ciclo confirmou a representação atual equivalente entre ERP e app; não migrou nem alterou o contrato de persistência.

#### Validação executada e limites

- [x] Vitest: **69 testes aprovados** em cinco arquivos ERP/mobile de UI, mapeamento, domínio, gravação e leitura; Vitest/RTL mobile: **9 testes aprovados**, incluindo interação com o componente real para limpar escolha simples e resposta Sim/Não.
- [x] O usuário confirmou que liberou espaço no volume C:. O volume apresentou **1,26 GiB livres**; `git diff --check` passou.
- [ ] TypeScript mobile completo encerrou com código 1 por diagnósticos existentes em outros módulos de entrega, pedidos, estoque, infraestrutura e `shared-utils`; a saída não contém diagnóstico em `ProductTechnicalFieldInput` nem no teste mobile deste estado.
- [ ] `npm run dev` foi executado na raiz conforme a regra do projeto. A inicialização parou no guard do build fiscal: `Vercel Hobby limit exceeded: 13 API functions`; as portas 5173 e 3000 permaneceram fechadas. Por isso não foi possível executar Playwright visível. Nenhuma guarda foi contornada e nenhum dado remoto foi gravado. Expo Web e runtime Android/iOS não foram validados.
- [ ] A skill `erp-web-to-mobile-replication` continua acessível somente na cópia de cache/backup de build descrita acima; sua fonte canônica não foi encontrada.

#### Próximo recorte identificado

- [x] Comparar leitura, edição e salvamento de valores próprios distintos entre várias variações no Ciclo 46; os dois lados relacionam os detalhes por UUID e mantêm a alteração na variação selecionada.
- [ ] Manter pendente a decisão do contrato `product_variations.attributes` versus `technical_specs` (Ciclo 130). A antiga pendência de paridade mobile da Conciliação foi superada pela decisão ERP-only dos Ciclos 127/131.

### Ciclo 46 — valores técnicos próprios em várias variações existentes

**Recorte:** reabrir uma família com valores técnicos próprios diferentes, editar uma variação e salvar sem misturar os valores entre variações.

#### Comparação e resultado

- [x] No ERP, `getVariationDetails(product, id)` busca o detalhe pelo UUID e `mapDbVariations` o aplica à variação correspondente. A aba técnica edita o `formData` da variação selecionada; o fluxo de formulário identifica essa variação por `editingVariationId` e atualiza a lista pelo UUID.
- [x] No mobile, `fetchMobileProductsPage` indexa `technical_specs.variationDetails` por UUID antes de hidratar cada registro. `ProductFormVariationsTab` aplica o updater à posição da variação aberta e substitui somente essa posição; `saveMobileProduct` grava cada objeto de detalhe junto com seu UUID.
- [x] A ordem do array de detalhes não determina a associação no carregamento ERP ou mobile. Valores distintos continuam pertencendo aos seus UUIDs mesmo quando os detalhes chegam em ordem diferente.
- [x] Nenhuma divergência funcional foi encontrada neste recorte; não foi necessária mudança no código de produção. Foram acrescentados testes de regressão para a leitura por UUID no ERP e no mobile, e para o payload de duas variações com valores próprios distintos.
- [ ] Permanece sem decisão a divergência documental: `docs/negocio/produtos/estrutura-produto-variacao.md` define `product_variations.attributes` como fonte do valor efetivo, enquanto os dois clientes também persistem `technicalValues` em `technical_specs.variationDetails`. Como o comportamento atual é equivalente entre ERP e app, este ciclo preservou o contrato existente e não alterou gravação ou migração.

#### Validação e limites

- [x] Vitest ERP `productVariationMapper.test.ts`: **6 testes aprovados**. Vitest mobile `mobileProductFetchService.test.ts` e `mobileProductMutationService.test.ts`: **40 testes aprovados**. Total: **46 testes** nos três arquivos.
- [ ] TypeScript completo ERP e mobile terminou não zero por diagnósticos em outros arquivos do workspace; a saída filtrada não apontou os três arquivos de teste alterados neste ciclo.
- [x] `git diff --check` passou nos arquivos do ciclo; o Git avisou que alguns arquivos atuais em CRLF serão normalizados para LF em futura gravação.
- [ ] Playwright visual/autenticado, Expo Web e runtime Android/iOS continuam sem validação. A última inicialização da pilha raiz parou no guard Vercel Hobby de 13 funções, deixando 5173/3000 fechadas; nenhuma guarda foi contornada e nenhuma gravação remota foi feita.
- [ ] A skill `erp-web-to-mobile-replication` continua localizada somente no cache/backup de build; a fonte canônica não foi encontrada.

#### Próximo recorte identificado

- [x] Auditar a rota web de `ProductReconciliation` no Ciclo 47; veja o resultado abaixo.
- [x] A intenção antiga de replicar a Conciliação em React Native foi superada pela decisão do usuário no Ciclo 127, reafirmada no Ciclo 131. Prosseguir somente com outros estados de Produtos e manter o contrato de atributos técnicos como pendência independente do Ciclo 130.

### Ciclo 47 — rota ativa da conciliação e acesso mobile

**Recorte:** identificar a rota e a permissão do fluxo ERP de conciliação, e comparar o acesso oferecido pelo módulo mobile.

#### Resultado da auditoria

- [x] O ERP registra `/products/reconciliation` e `/products/reconciliation/suppliers` no `Router.tsx`, dentro de `PermissionRoute action="viewProductReconciliation"`. Os dois caminhos renderizam `SupplierReconciliation`, que reexporta `ProductReconciliation`; portanto, a rota está ativa e a tela não é limitada à conciliação de fornecedores.
- [x] O menu ERP apresenta “Conciliação de fornecedores” e direciona para `/products/reconciliation/suppliers`, que abre a página geral de pendências de fornecedor, categoria, NCM, atributos e preço.
- [x] O mobile verifica `viewProductReconciliation`, mas `NativeProductsScreen.handleOpenReconciliation` chama `Linking.openURL(`${WEB_URL}/products/reconciliation/suppliers`)`. A ação abre a página ERP via navegador externo; não foi localizada uma tela React Native equivalente.
- [x] Corrigidas neste inventário e no roadmap as afirmações anteriores de que a rota não estava ativa e de que ela continha somente conciliação de fornecedores. Não há decisão pendente sobre ativar a rota web.
- [ ] A documentação consultada não justifica o navegador externo como particularidade permanente do mobile. O acesso do app, portanto, não completa a paridade de interface; a página nativa continua pendente.
- [x] Os formulários ERP dessa tela já constam no inventário RHF/Zod e usam schemas explícitos em `shared-utils/reconciliationFormSchemas.ts`. A detecção de pendências em `pendencyDetector.ts` ainda está em `erp/`; deve ser reutilizada/extraída como regra pura antes de criar um segundo detector mobile.

#### Validação e limites

- [x] Vitest ERP para `ProductReconciliation.test.tsx`, `reconciliationQueries.test.ts` e `pendencyDetector.test.ts`: **21 testes aprovados**. Os testes usam mocks e não comprovam persistência remota.
- [ ] Playwright autenticado, Expo Web e runtime Android/iOS não foram usados neste recorte; o acesso visível à tela permanece pendente. O guard Vercel Hobby de 13 funções ainda impede a inicialização local da pilha raiz, conforme a evidência do Ciclo 46.
- [ ] A skill `erp-web-to-mobile-replication` continua encontrada apenas no cache/backup de build, sem fonte canônica localizada.

#### Próximo recorte identificado

- [x] Consulta, estados, resumo e filtros foram implementados no Ciclo 48; edição individual no Ciclo 49; seleção/lotes e confirmações no Ciclo 50. A validação visual autenticada e no runtime Android/iOS continua pendente.

### Ciclo 48 — consulta, filtros e lista nativa da conciliação

**Recorte:** estado inicial da tela de conciliação no app: carregar lista e resumo, filtrar por pendência/categoria/busca/criticidade, paginar e representar carregamento, erro, vazio e atualização. Edição individual e operações em lote permanecem fora deste recorte.

#### Implementação e paridade de regra

- [x] Os tipos, a detecção de pendências e o resumo foram movidos para `shared-utils/productReconciliationTypes.ts` e `shared-utils/productReconciliation.ts`. Os caminhos ERP antigos continuam como reexports, mantendo os importadores existentes; app e ERP passam a usar a mesma classificação de fornecedor, categoria, NCM, preço e atributos incompletos.
- [x] A consulta, o mapeamento de produtos/variações, os filtros SQL e em memória, a leitura de fornecedor, a paginação e o resumo agora têm uma fonte comum em `shared-utils/productReconciliationQueries.ts`. O adaptador ERP preserva seu cliente Supabase e o predicado de peso já usado pela tela; o serviço mobile injeta o cliente Supabase nativo e o predicado já existente no domínio mobile. Erros de leitura e atributos JSON inválidos continuam propagados como no ERP.
- [x] `NativeProductsScreen` conserva a guarda `viewProductReconciliation`, mas deixa de abrir a rota web via `Linking`; a ação abre `NativeProductReconciliationScreen`. A tela inicial traz resumo, chips dos tipos, categoria por UUID, busca com debounce de 400 ms, filtro de críticos, limpeza de filtros, atualização por gesto, paginação e lista de pendências do produto/variação.
- [x] A consulta dos filtros passa por `useZodForm` e `reconciliationQueryFormSchema` compartilhado antes de chamar o serviço. A tela aplica timeout de 15 s e controla revisões para ignorar respostas antigas/desmontadas. Estados de carregamento, erro com nova tentativa e lista vazia/sucesso estão representados.
- [x] O estado de falha das categorias foi comparado estaticamente no Ciclo 124: ERP e mobile capturam a falha, deixam a lista sem opções e não apresentam mensagem específica; não foi identificada divergência que justificasse alterar esse feedback. A diferença de atualização ao retornar ao foco/primeiro plano e o loading mobile foram tratados no Ciclo 124. A comparação visual autenticada permanece pendente.
- [ ] A lista ainda é somente de consulta: edição inline de pai/variações, seleção, aplicação em lote, confirmações e feedback de gravação serão comparados e implementados nos próximos ciclos.

#### Validação e limites

- [x] Vitest ERP: **21 testes aprovados** em `ProductReconciliation.test.tsx`, `reconciliationQueries.test.ts` e `pendencyDetector.test.ts`, confirmando que os reexports e o serviço comum preservam a tela existente.
- [x] Vitest mobile: **1 teste aprovado** em `mobileProductReconciliationService.test.ts`, verificando que o adaptador usa o cliente mobile e retorna o resultado produzido pelo serviço compartilhado.
- [x] TypeScript completo ERP e mobile encerrou com código 2 por diagnósticos globais fora deste recorte. A saída filtrada não encontrou diagnósticos em `NativeProductReconciliationScreen`, `NativeProductsScreen`, `mobileProductReconciliationService` ou nos wrappers/arquivos compartilhados de conciliação.
- [x] `git diff --check` passou; o Git emitiu avisos de normalização CRLF em arquivos que já tinham alterações no workspace.
- [ ] Validação de UI do Ciclo 49: `npm run dev` concluiu o build de 12/12 funções, mas encerrou com `EADDRINUSE` em `127.0.0.1:3000`; na checagem, ERP em `5173` retornou HTTP 200 e a raiz de `3000` retornou HTTP 404. Playwright visível foi tentado e redirecionou para `/login`; o Vercel Development não tem credenciais gerais de teste. Há apenas credenciais de operador fiscal de homologação entre as variáveis candidatas, que não foram reutilizadas para autenticação do ERP. Expo Web/runtime Android/iOS e gravação remota seguem pendentes; os testes de consulta usam mocks.
- [ ] A skill `erp-web-to-mobile-replication` continua localizada somente no cache/backup de build, sem origem canônica encontrada.

#### Próximo recorte identificado

- [x] A edição individual do pai e das variações foi implementada no Ciclo 49; seleção, operações em lote e confirmações foram comparadas no Ciclo 50.

### Ciclo 49 — edição individual no card nativo de conciliação

**Recorte:** trocar a card nativa apenas de leitura pela edição individual de campos pendentes no produto pai e em suas variações. Seleção e aplicação em lote continuam fora deste recorte.

#### Comparação e correções

- [x] `NativeProductReconciliationScreen` agora monta `NativeProductReconciliationCard` na lista e preserva o acesso protegido já existente. O card acompanha o ERP: campos do pai para fornecedor, categoria, NCM e preço; campos de variação para atributos e preço; expansão das variações, status por pendências ativas, salvamento condicionado a alterações, feedback de sucesso/erro e atualização da consulta após salvar.
- [x] O card usa `useZodForm`/RHF com `createReconciliationProductFormSchema` para validar os valores parseados antes do serviço e `reconciliationSupplierSearchSchema` na busca de fornecedor. Busca compartilhada com o ERP mantém tipo de pessoa, exclusão lógica, ordenação, limite 20, debounce de 350 ms e timeout de 15 s. A gravação mantém timeout de 25 s; uma resposta incerta bloqueia repetição na sessão.
- [x] Consultas e mutações de fornecedor, NCM, categoria e variações usam serviços compartilhados pelo ERP e pelo app. O NCM mantém a leitura e o merge dos demais campos de `products.fiscal`; vínculos de categoria e escopo de variação seguem o contrato do ERP (`id` da variação + `product_id`). O atributo efetivo permanece em `product_variations.attributes`, inclusive na variação operacional única do produto simples, conforme `estrutura-produto-variacao.md`.
- [x] O atributo de lista permite cadastrar valor em um atributo existente, estado disponível no `VariationAttributeValueInput` ERP e antes ausente no app. A busca `ilike` antes do insert e a validação de resultado foram extraídas para `shared-utils/productAttributeValueService.ts`; o app usa `bulkAttributeFormSchema`, timeout de 15 s e bloqueia nova tentativa quando a gravação não é confirmada. Máscara decimal, casas de peso, unidade e limite de 50 portas/gavetas agora vêm de `shared-utils/attributeInputFormatting.ts` compartilhado pelo ERP e mobile.
- [x] A documentação consultada não define exceção de experiência mobile para este card. A adaptação limita-se a controles React Native; categorias carregadas pelo serviço atual ainda retornam lista vazia quando a consulta interna falha, conforme limitação registrada no Ciclo 48.

#### Validação e limites

- [x] Vitest ERP: **30 testes aprovados** em `reconciliationMutations.test.ts`, `ReconciliationProductCard.test.tsx` e `VariationAttributeValueInput.test.tsx`. Inclui preservação dos campos fiscais ao atualizar NCM pelo card.
- [x] Vitest mobile: **8 testes aprovados** em `mobileProductReconciliationService.test.ts` e `attributeInputFormatting.test.ts`, cobrindo cliente mobile, busca, persistência compartilhada do pai/variação, valor de atributo existente/novo, bloqueio de formulário inválido e formatação numérica.
- [x] TypeScript integral ERP e mobile encerrou com código 2 por erros globais fora do recorte (**428 ERP, 41 mobile**); a saída filtrada não apontou diagnósticos nos arquivos alterados deste ciclo. `git diff --check` passou; avisos restantes são de normalização CRLF em arquivos já alterados no workspace.
- [ ] A card nativa não tem cobertura de renderização React Native configurada (`@testing-library/react-native`/`react-test-renderer` ausentes). Playwright foi tentado: o servidor ERP respondeu, mas a rota redirecionou para `/login`; o Vercel Development não contém credenciais gerais de teste, somente credenciais de operador fiscal de homologação, que não foram reutilizadas para autenticar o ERP. `npm run dev` encerrou com `EADDRINUSE` em `127.0.0.1:3000` após compilar 12/12 funções. Expo Web e runtime Android/iOS seguem sem validação; Expo Web não provaria runtime nativo. Testes usam cliente mockado; não houve gravação remota.
- [ ] A skill `erp-web-to-mobile-replication` permanece acessível somente pela cópia em cache/backup de build; não foi encontrada fonte canônica no projeto nem nos diretórios atuais de skills.

#### Próximo recorte identificado

- [x] Seleção, operações em lote e confirmações da conciliação foram auditadas e alinhadas no Ciclo 50; a seleção de todos os resultados agora envia IDs reais às mutações.

### Ciclo 50 — seleção e operações em lote na conciliação nativa

**Recorte:** seleção manual e por página, seleção de todo o filtro, ações de fornecedor/categoria/NCM/atributo e estados de validação, confirmação, sucesso, erro e resultado incerto.

#### Comparação e correções

- [x] ERP e app oferecem seleção individual, de todos os produtos visíveis na página e de todos os produtos pendentes que correspondem ao filtro. A seleção global agora usa `fetchProductReconciliationSelectionWithClient` em blocos de 500 produtos, com ordenação estável por UUID e os mesmos filtros/detector compartilhados. O resultado contém os IDs reais que serão mutados; antes, o ERP podia sinalizar “todos do filtro” sem expandir essa seleção para as mutações.
- [x] Os detalhes mínimos de produto selecionado (UUID, categoria e pendências) são mantidos entre páginas. A opção de atribuir atributo em lote só é habilitada quando todos os produtos selecionados pertencem à mesma categoria, e os atributos disponíveis são derivados das pendências selecionadas, como no ERP.
- [x] Fornecedor, categoria, NCM e atributo em lote passam por `reconciliationBatchFormSchema` e pelo schema contextual `createReconciliationBatchFormSchema` via `useZodForm`/RHF no app. O modal valida as escolhas de fornecedor/categoria e o tipo/valor de atributo antes de chamar o serviço. O ERP também fixa `replaceExisting=false` no fluxo ativo de fornecedor; o app mantém o mesmo comportamento e o texto “sem substituir vínculos existentes”.
- [x] A persistência das quatro operações foi extraída para `shared-utils/productReconciliationBatchMutations.ts`, chamada pelos wrappers ERP e pelo adaptador mobile. Categoria confirma todos os produtos e recria os vínculos N:N; NCM confirma a atualização produto a produto e preserva o restante de `products.fiscal`; atributo atualiza as variações dos produtos selecionados preservando metadados. Fornecedor conta os registros retornados, sem exigir atualização dos que mantêm o vínculo atual.
- [x] O modal nativo compara a seleção congelada ao confirmar, usa timeout de 25 segundos e bloqueia uma segunda submissão quando o resultado é incerto. Erros permanecem visíveis; no sucesso, o modal fecha como o ERP e a tela mostra por cinco segundos a quantidade de registros confirmados, depois atualiza lista e seleção. A mensagem de sucesso é a adaptação nativa ao toast web.
- [x] Corrigido um import de tipo que apontava para o módulo de schemas em vez do módulo de tipos. A tela agora declara a lista usada para compatibilidade a partir dos campos mínimos realmente mantidos em cache.
- [x] O total e os recortes da paginação foram auditados no Ciclo 105: ERP e mobile chamam a mesma consulta compartilhada, que conta produtos brutos antes do detector e busca janelas de 3 páginas com offsets sobrepostos. Isso pode superestimar páginas e repetir produtos entre páginas nos dois clientes. Não é uma diferença ERP→app; uma correção exigiria mudar a estratégia compartilhada de paginação/contagem, sem contrato documentado. O defeito foi separado de paridade e registrado para decisão de escopo no Ciclo 105.

#### Validação e limites

- [x] Vitest: **71 testes aprovados em 9 arquivos** — tela ERP (8), card ERP (10), formulários ERP (12), serviços ERP de consulta/mutação/lote (24), seleção e schema mobile (6) e serviço mobile (11). Incluem seleção em bloco após a primeira página, ordenação por UUID, preservação de campos fiscais no NCM em lote, vínculos de categoria, metadados de atributos, seleção repetida, erros e confirmações dos formulários ERP.
- [x] `git diff --check` nos arquivos do recorte passou. TypeScript completo ERP e mobile termina com código 2 por diagnósticos globais em outros módulos; a filtragem por arquivos da conciliação e schemas compartilhados não encontrou diagnósticos do Ciclo 50.
- [ ] Playwright visível abriu `/products/reconciliation/suppliers`, mas a rota redirecionou para `/login`; não houve sessão autenticada nem interação com Produtos. As variáveis de Development conhecidas contêm somente credenciais de operador fiscal, que não foram reutilizadas para autenticar o ERP. Expo Web e runtime Android/iOS seguem sem validação; Expo Web não prova comportamento nativo. Os testes de serviço usam clientes mockados; não houve gravação remota.
- [ ] A skill `erp-web-to-mobile-replication` continua localizada somente na cópia do cache/backup de build; a origem canônica não foi encontrada.

#### Próximo recorte identificado

- [ ] Continuar a comparação de outras abas e estados de Produtos: descrição, preço, estoque, fiscal, imagens/variações, ações de lista, permissões, estados de erro e persistência de atributos por categoria. A divergência entre `product_variations.attributes` e `technical_specs` e a validação visual/nativa continuam pendentes.

### Pendências para próximos ciclos

- [ ] Reconstituir evidências dos Ciclos 6–7, caso existam em registros adicionais.
- [x] Auditar a busca textual da lista no Ciclo 3 e os estados de carregamento, erro, vazio e busca sem resultados no Ciclo 5; permanece pendente a comparação visual autenticada.
- [x] Auditar o estado de filtros e adicionar a limpeza no mobile no Ciclo 4; alinhar o filtro por UUID e relações N:N no Ciclo 32 e a persistência do formulário por UUID no Ciclo 36; conferir duplicação no Ciclo 37 e seleção técnica da categoria Pias no Ciclo 38. Os Ciclos 40–46 alinharam os estados técnicos das variações, inclusive override vazio em `technical_specs.variationDetails` e overrides próprios em famílias com múltiplas variações; a projeção exigida por categoria em `product_variations.attributes` foi concluída no Ciclo 139. Persistem provas remotas, visuais autenticadas e nativas.
- [x] Ordenação livre da galeria do produto pai e sincronização da variação única alinhadas no Ciclo 13; a seleção em lote e sua ordem no seletor da variação foram alinhadas no Ciclo 14; o palco branco, margem e processamento quadrado 1080×1080 foram implementados no Ciclo 15. Permanecem pendentes a validação da captura em dispositivo, a comparação visual autenticada e o upload remoto.
- [ ] Concluir auditoria das abas e estados ainda não cobertos: estados manuais/visuais da descrição, preço/estoque, fiscal, comparação visual do seletor, ações remanescentes da lista, permissões e confirmações. A restauração na lixeira para o perfil somente etiquetas foi alinhada ao ERP no Ciclo 146. O estado vazio foi revisado no Ciclo 57, a seleção inválida no Ciclo 58, o fallback das fotos vinculadas no Ciclo 59 e a falha de imagem na grade no Ciclo 60. Atributos exigidos por categoria foram projetados no Ciclo 139 e overrides próprios em múltiplas variações foram corrigidos no Ciclo 144.
- [x] Auditar e alinhar a persistência de `products.brand` no Ciclo 35; continua pendente a prova de gravação remota real, sem fixture de propriedade comprovada.
- [x] Ciclo 26 corrigiu o crash de `variations: [null]` durante a validação contextual do ERP e confirmou que o schema mobile também retorna erro sem exceção.
- [ ] Continuar os demais estados de validação/erro da aba Estoque e Precificação; fazer comparação visual autenticada/validação em aparelho.
- [x] Filtro por UUID da categoria alinhado no Ciclo 32; persistência por UUID no Ciclo 36; passagem de categorias pelo fluxo ativo de duplicação conferida no Ciclo 37; seleção de campos de Pias alinhada no Ciclo 38; herança de `technicalValues` para a variação simples alinhada ao ERP no Ciclo 39; bloqueio na variação única no Ciclo 40; dependências técnicas na variação no Ciclo 41; default de `showName` de Cor no Ciclo 42; campo variável sem override sem fallback visual do pai no Ciclo 43; remoção dos controles de herança/personalização sem equivalência ERP no Ciclo 44; persistência de override vazio ao limpar e reabrir no Ciclo 45; e valores técnicos próprios identificados por UUID em múltiplas variações conferidos no Ciclo 46. O filtro de rascunhos foi alinhado no Ciclo 31 e os tipos gerais **Somente Produtos** e **Todos** nos Ciclos 29–30.
- [x] A divergência de projeção para `product_variations.attributes` foi resolvida no Ciclo 139, mantendo `technical_specs` por compatibilidade. O helper legado `duplicateMobileProduct`, sem call sites, foi removido no Ciclo 145; a duplicação ativa continua abrindo rascunho no formulário RHF/Zod. A comparação visual/nativa da Conciliação é somente histórica: o módulo não deve ser reintroduzido no app conforme Ciclos 127/131.
- [ ] Comparar com Playwright os estados autenticados entre ERP e Expo Web assim que houver conta de teste disponível; validar o runtime nativo separadamente, sem inferi-lo do Expo Web.
- [ ] Confirmar origem canônica da skill `erp-web-to-mobile-replication`; a cópia consultada está apenas em cache de build.

### Ciclo 51 — erro de preço raiz direciona para Estoque e Precificação

**Achado registrado antes das correções deste ciclo:** na submissão final, o ERP trata `errors.unitPrice` de forma explícita em `useProductFormSubmit`: seleciona a aba `estoque`, marca o campo e mostra o aviso “Por favor, informe o Preço de Venda do produto na aba Estoque e Precificação.”. O mobile executa o resolver RHF/Zod real, mas `resolveMobileProductFormErrorNavigation` não reconhecia o caminho raiz `unitPrice`, então permanecia na aba atual. O mobile também mostrava a mensagem genérica do schema para preço numérico negativo e “Informe o preço de venda do produto.” para preço ausente/zero. Não encontrei particularidade mobile que justifique esses desvios de navegação e feedback; regra de validação e payload permanecem iguais.

#### Ajuste e validação

- [x] `resolveMobileProductFormErrorNavigation` agora converte o caminho raiz `unitPrice` em `{ tab: 'estoque' }`, equivalente à seleção de aba feita no ERP. `resolveMobileProductFormErrorMessage` também usa o aviso do ERP para preço inválido e para o preço ausente/zero. O resolver real continua bloqueando o serviço; schema e payload não mudaram.
- [x] Testes de navegação e de mensagem usam `flattenFormErrors` para os caminhos raiz `unitPrice` e `estoque`. Vitest: **1 arquivo / 9 testes aprovados**; `git diff --check` passou.
- [x] A verificação TypeScript mobile encerrou com código 1 por diagnósticos globais em outros módulos; a filtragem não apontou erro nos arquivos alterados neste ciclo.
- [ ] Não houve sessão autenticada de Playwright neste recorte. A última evidência visível de acesso permaneceu em `/login`; comparação visual autenticada, Expo Web e validação em aparelho continuam pendentes. Expo Web não comprova comportamento nativo.
- [ ] Permanecem pendentes os demais estados numéricos/de erro desta aba, junto da inspeção visual autenticada e nativa. A skill de replicação continua localizada apenas na cópia de cache/backup de build descrita no início do inventário.

### Ciclo 52 — destaque visual do preço inválido no formulário mobile

**Achado registrado antes da correção:** depois do erro de `unitPrice`, o ERP não apenas troca para Estoque e Precificação e mostra o aviso: `ProductPricingFields` também colore o rótulo e a borda do campo em vermelho, define `aria-invalid` e limpa o erro no blur quando o valor fica positivo. O mobile agora direciona o erro e mostra o aviso (Ciclo 51), mas `ProductFormPricesTab` não recebe estado de validação e exibe o campo sem destaque. Não encontrei exceção mobile documentada para essa diferença. A sessão Playwright visível desta execução redirecionou para `/login`; as únicas credenciais Vercel identificadas são do operador fiscal e não serão reutilizadas para login geral.

- [x] `ProductFormScreen` guarda o estado de preço inválido devolvido pelo resolver RHF/Zod e envia esse estado ao proprietário `ProductFormPricesTab`. O rótulo e a borda do campo ficam vermelhos, com `accessibilityLabel`/`accessibilityHint`; no blur, a mesma regra de preço localizado limpa o erro somente quando o preço fica positivo. Erros de fornecedor que também usam o caminho `estoque` não marcam o preço.
- [x] `isMobileProductUnitPriceError` reconhece tanto o campo numérico `unitPrice` quanto a mensagem específica de preço ausente/zero, sem mudar schema, cálculo, serviço ou payload. A tentativa de salvar ainda executa o `zodResolver` real antes de qualquer chamada.
- [x] Vitest mobile: **34 testes aprovados em 2 arquivos** (`mobileProductFormErrorNavigation.test.ts` e `mobileProductFormSchema.test.ts`); inclui erro de preço vs. fornecedor e preserva validação de formulário. TypeScript mobile encerrou com código 2 por diagnósticos globais em outros módulos; a filtragem não encontrou diagnósticos nos arquivos alterados. `git diff --check` passou (aviso de normalização CRLF/LF no arquivo da aba).
- [x] Tentativa Playwright visível em `http://127.0.0.1:5173/products`: a guarda redirecionou para `/login`. A listagem da Vercel Development mostrou apenas credenciais de operador fiscal; não as reutilizei para login geral. A comparação visual autenticada, Expo Web e aparelho seguem pendentes; não houve escrita remota.

#### Próximo recorte identificado

- [ ] Continuar em outro estado da aba Estoque e Precificação, incluindo validação/correção de outros campos e feedback de erro; a validação visual autenticada e em aparelho continua pendente.
- [ ] Continuar outros estados numéricos/de erro da aba Estoque e Precificação e validar em sessão autenticada/aparelho. A origem canônica da skill de replicação continua não localizada fora da cópia de cache/backup de build.

### Ciclo 53 — destaque do erro de fornecedor obrigatório no cadastro mobile

**Achado registrado antes da correção:** `ProductSupplierField` no ERP realça rótulo e campo, define `aria-invalid` e apresenta o alerta inline “Adicione ao menos um fornecedor.” quando a validação final marca `mainSupplierId`. O schema mobile já reutiliza `hasRequiredProductSupplier` e a mensagem compartilhada, bloqueia a submissão e direciona o formulário para Estoque e Precificação (`estoque`), mas `ProductFormPricesTab` não recebe o estado de erro do fornecedor e não o destaca junto ao seletor. Não encontrei exceção documentada para esse feedback mobile; este recorte preserva regra, mensagem do resolver, permissões e payload.

- [x] `ProductFormScreen` preserva o erro identificado pelo `zodResolver` real e passa o estado a `ProductFormPricesTab`, que colore o título e a borda da busca, anuncia a ajuda acessível e exibe o alerta “Adicione ao menos um fornecedor.”, acompanhando `ProductSupplierField` do ERP. A mensagem geral do resolver continua vindo de `PRODUCT_SUPPLIER_REQUIRED_MESSAGE`; schema, regra, serviço e payload não mudaram.
- [x] A seleção de fornecedor e a troca para fabricação própria limpam o destaque, como o ERP limpa o erro ao preencher `mainSupplierId` ou escolher origem própria. Erros de preço não marcam fornecedores; o envio continua bloqueado pelo resolver enquanto faltar fornecedor.
- [x] Vitest mobile: **37 testes aprovados em 2 arquivos** (`mobileProductFormErrorNavigation.test.ts` e `mobileProductFormSchema.test.ts`), incluindo erro de fornecedor e separação do erro de preço. `git diff --check` passou (aviso de normalização CRLF/LF em arquivos alterados).
- [x] TypeScript mobile terminou com código 2 por **35 diagnósticos globais**; a filtragem não encontrou diagnósticos nos arquivos alterados. Playwright visível tentou abrir `/products`, mas a rota foi redirecionada a `/login`; nenhuma credencial fiscal foi reutilizada. Sem sessão autenticada, a comparação visual do campo, Expo Web e aparelho permanecem pendentes; não houve escrita remota.

#### Próximo recorte identificado

- [ ] Continuar a auditoria de outro estado da aba Estoque e Precificação e depois avançar para as abas pendentes. A validação visual autenticada e em aparelho permanece pendente.

### Ciclo 54 — feedback de Estoque Mínimo negativo no formulário mobile

**Achado registrado antes da correção:** ERP e app usam `parseProductMinimumStockInput` e bloqueiam valores negativos no schema antes do serviço; ambos mantêm o campo sem destaque próprio e não têm navegação específica para esse erro. A diferença está no feedback: na finalização, `useProductFormSubmit` marca `minStock` e escolhe o fallback “Preencha todos os campos obrigatórios.”; em rascunho, o resolver ERP apresenta “Informe um valor finito maior ou igual a zero.”. O app mostra sempre “Informe um número finito maior ou igual a zero.”. Não encontrei exceção mobile documentada. O recorte preservará regra, parser, campos e payload, alinhando a mensagem por modo.

- [x] `resolveMobileProductFormErrorMessage` agora considera o modo da submissão: na finalização de produto, o erro negativo de `minStock` mostra o fallback do ERP “Preencha todos os campos obrigatórios.”; no rascunho, mostra a mensagem do schema ERP “Informe um valor finito maior ou igual a zero.”. A classificação parte do erro real do `zodResolver`; schema, parser compartilhado, navegação, cálculo, serviço e payload permanecem inalterados.
- [x] Testes confirmam que o resolver mobile bloqueia `minStock: -1` em rascunho e finalização, e que o feedback respeita o modo. Vitest: **41 testes aprovados em 2 arquivos** (`mobileProductFormErrorNavigation.test.ts` e `mobileProductFormSchema.test.ts`).
- [x] TypeScript mobile terminou com código 2 por **35 diagnósticos globais**; a filtragem não encontrou diagnósticos nos arquivos do ciclo. `git diff --check` passou. Playwright visível tentou abrir `/products` e confirmou redirecionamento para `/login`; sem autenticação, a comparação visual do formulário e a validação em Expo Web/aparelho continuam pendentes. Nenhuma escrita remota foi feita.

#### Próximo recorte identificado

- [ ] Continuar a auditoria dos demais estados de Estoque e Precificação; a validação visual autenticada e em aparelho permanece pendente.

**Critério de encerramento global:** concluir cada área aplicável, registrar exceções justificadas e manter pendentes explícitas as validações que dependam de runtime nativo; não declarar equivalência nativa com base somente no Expo Web.

### Ciclo 55 — validação e feedback do nome na aba Geral

**Achado registrado antes da correção:** `createProductFormSchema` no ERP (`shared-utils/productDomainValidation.ts`) exige apenas que nome/título/marketplaceTitle tenha conteúdo após trim, inclusive em rascunhos. O schema mobile (`shared-utils/mobileProductFormSchema.ts`) exige pelo menos dois caracteres em toda submissão, inclusive rascunho. A regra de dois caracteres existe separadamente para legibilidade/ativação de variações e para liberar a aba Descrição, mas não é a regra de preenchimento do nome no formulário. Além disso, `useProductFormSubmit` encaminha erro `name` para Geral e o ERP marca o rótulo/campo; o mobile ainda não mapeia o caminho raiz `name` nem realça o campo. Não encontrei particularidade mobile documentada que justifique a divergência. O recorte preservará regras de ativação, navegação da Descrição, serviço e payload.

- [x] `shared-utils/productNameRequirement.ts` agora centraliza normalização, schema de entrada e mensagem de nome obrigatório; o schema do ERP e o mobile reutilizam a mesma regra pura. Ambos bloqueiam valor vazio após trim e aceitam um caractere no cadastro/rascunho. A regra separada de dois caracteres para ativação/legibilidade e o bloqueio da aba Descrição permanecem intactos.
- [x] O caminho raiz `name` agora direciona para Geral, preserva o estado retornado pelo `zodResolver`, realça rótulo/borda/texto do campo e anuncia a mensagem acessível. O destaque limpa no blur após nome não vazio, seguindo o ERP. Finalização mostra o fallback genérico do ERP; rascunho mostra a mensagem do schema. O resolver ainda bloqueia a submissão vazia antes de qualquer serviço; payload e mutação não mudaram.
- [x] Vitest: **48 testes mobile em 2 arquivos** e **9 testes ERP de validação** aprovados. Cobertos: um caractere aceito nos modos draft/final, texto vazio/whitespace bloqueado com mensagem de domínio, caminho `name` para Geral e mensagens ERP por modo.
- [x] TypeScript mobile terminou com código 2 por **26 diagnósticos globais**; a filtragem não encontrou diagnósticos nos arquivos deste ciclo. `git diff --check` passou, com avisos de normalização CRLF já presentes em arquivos do workspace.
- [ ] Playwright visível abriu `/products`, mas a guarda redirecionou para `/login`; sem sessão autenticada, a comparação visual ERP e Expo Web não foi feita. A tela React Native não tem renderer configurado (`@testing-library/react-native`/`react-test-renderer` ausentes), então este ciclo não comprova renderização/runtime nativos. Nenhuma gravação remota foi feita.
- [ ] A skill `erp-web-to-mobile-replication` continua acessível apenas pela cópia em cache/backup de build; a origem canônica não foi localizada.

#### Próximo recorte identificado

- [ ] Continuar uma aba/estado por execução: descrição, fotos por variação, fiscal, permissões, ações da lista e estados restantes de preço/estoque. Comparação visual autenticada e validação nativa permanecem pendentes.

### Ciclo 56 — resposta da IA removida pela sanitização na aba Descrição

**Achado registrado antes da validação:** ERP e mobile removem linhas de `Cor` do texto gerado. Quando o serviço retorna somente `Cor: Azul`, o ERP sanitiza para `''`, devolve `improvedDescription` vazio e a aba não atualiza a descrição nem mostra sucesso/erro. O mobile valida o resultado sanitizado com `productAiGeneratedTextSchema`, rejeita o texto vazio e a aba apresenta alerta de falha, preservando a descrição anterior. Esta diferença de feedback é mantida como exceção mobile justificada: comunica uma resposta inválida sem gravar vazio nem parecer uma geração bem-sucedida. A sanitização do catálogo permanece igual; não há chamada real à IA.

- [x] `mobileProductAiService.test.ts` agora fixa o caso mockado `Cor: Azul`: após a sanitização retirar a única linha, o serviço rejeita a resposta com mensagem explícita. A aba só atualiza `formData.description` depois de o serviço resolver, portanto o valor anterior é preservado. Não foi adicionada chamada de IA nem gravação.
- [x] Vitest: **11 testes mobile** de `mobileProductAiService.test.ts` e **6 testes ERP** de `aiProductCatalogService.test.ts` passaram. O serviço mobile usa proxy mockado; o ERP usa `callGeminiDirect` mockado. A exceção limita-se ao feedback para conteúdo sanitizado vazio; respostas válidas, validação do texto, prompt e payload não mudaram.
- [ ] A tela de IA não foi renderizada em sessão autenticada ou em runtime nativo; a leitura de código e os mocks não comprovam a aparência do alerta no aparelho. A Edge Function mobile não foi implantada/exercitada e nenhuma IA real foi chamada.

#### Próximo recorte identificado

- [x] O estado vazio ao vincular fotos a uma variação foi auditado no Ciclo 57. A comparação autenticada da interface e a validação nativa seguem pendentes.

### Ciclo 57 — galeria do produto pai vazia ao vincular fotos da variação

**Achado e decisão registrados antes de alterar a experiência:** no ERP, o botão de vínculo continua abrindo o modal com a galeria vazia; o modal informa que não há foto no produto pai, orienta a adicioná-las na aba principal e deixa “Confirmar (0)” disponível. O schema compartilhado permite array vazio, então confirmar aplica `[]` e desvincula todas as fotos. No mobile, `ProductVariationPhotosEditor` desabilita o botão quando não há URL disponível e mostra a orientação inline; as fotos já vinculadas continuam listadas e podem ser removidas individualmente. Não existe particularidade documentada anterior para esse estado. A diferença fica registrada como adaptação mobile justificada: não abrir um seletor sem opções, dar a orientação no contexto da variação e manter o caminho de remoção acessível. O contrato RHF/Zod compartilhado, o limite, a seleção em lote e a confirmação quando há opções permanecem equivalentes.

- [x] Inspecionados ERP `VariationPhotosTab` e `VariationParentImagesSelectModal`, `createVariationImageSelectionFormSchema`/`toggleAllParentProductImages` em `shared-utils` e o editor mobile. A galeria vazia não faz consulta ou gravação própria; são dados fornecidos pelo formulário proprietário. No mobile a lista de fotos selecionadas preserva seus botões de remoção mesmo quando a galeria do pai ficou vazia.
- [x] O teste Vitest existente do modal ERP passou: **9 testes** em `VariationParentImagesSelectModal.test.tsx`, cobrindo validação, ordem, limite, seleção em lote, limpeza e bloqueio durante callback. Ele não cobre o texto/estado vazio; essa parte foi confirmada pela leitura dos ramos de renderização e da chamada. A tentativa inicial via `npx vitest` isolado falhou porque o runner em cache não tinha `happy-dom`; o runner local do ERP executou a suíte corretamente.
- [ ] A sessão Playwright permanece protegida em `/login`, então não houve comparação visual autenticada. O projeto mobile não declara `@testing-library/react-native` nem `react-test-renderer`; o ramo visual do modal e a interação nativa não foram renderizados. Expo Web não comprova comportamento nativo.

#### Próximo recorte identificado

- [x] A seleção inválida/erro de foto indisponível foi auditada no Ciclo 58; permanecem estados de imagem não cobertos e a comparação autenticada/nativa.

### Ciclo 58 — foto indisponível ao confirmar seleção da variação

**Resultado da comparação:** ERP e mobile bloqueiam antes de aplicar a seleção quando uma URL rascunhada não existe mais na galeria do produto pai. Ambos usam `createVariationImageSelectionFormSchema` de `shared-utils`, executado pelo `useZodForm` com `zodResolver`; a mesma mensagem de domínio é `Selecione apenas fotos disponíveis no produto pai.`. ERP apresenta o erro por toast; mobile usa `Alert.alert('Seleção de fotos inválida', mensagem)`, adaptação de feedback própria da plataforma. Em ambos, o erro não chama a confirmação/mutação e o modal permanece aberto para corrigir ou cancelar. Não há diferença de regra/payload a corrigir neste estado.

- [x] Comparados o modal ERP, `ProductVariationPhotosEditor`, schema compartilhado e as implementações ERP/mobile de `useZodForm`. O callback que aplica as URLs só é chamado dentro de `onValid`; o callback de erro apenas mostra a mensagem. A confirmação bem-sucedida fecha o modal nos dois fluxos.
- [x] Vitest ERP: **9 testes aprovados** em `VariationParentImagesSelectModal.test.tsx`; o caso `removed.jpg` confirma a mensagem, ausência de `onConfirm` e modal aberto. A busca não encontrou renderer mobile (`@testing-library/react-native`/`react-test-renderer`) nem teste mobile deste componente; equivalência da condição e mensagem mobile foi confirmada por código e schema compartilhado, mas a apresentação do alerta nativo não foi renderizada.
- [ ] Playwright autenticado e validação nativa continuam pendentes; a sessão ERP disponível está protegida em `/login`. Nenhuma gravação remota foi feita.

#### Próximo recorte identificado

- [x] A falha ao carregar a thumbnail da foto já vinculada foi identificada para o Ciclo 59; comparação visual autenticada e validação nativa continuam pendentes.

### Ciclo 59 — falha ao carregar foto já vinculada à variação

**Achado registrado antes da correção:** o ERP exibe a foto selecionada pela variação por meio de `ProductImage` com `size="thumbnail"`; em caso de erro, tenta medium, URL original e então apresenta um placeholder. O `ProductVariationPhotosEditor` mobile renderizava esse mesmo cartão com `Image` direto, sem `onError`, então uma URL quebrada ficava sem a cascata de fallback. Não há particularidade mobile documentada que justificasse a diferença. A implementação mobile existente `components/shared/ProductImage` já tinha a cascata de thumbnail → medium → original → fallback local e foi reutilizada somente na miniatura da foto vinculada; a grade do seletor ficou fora deste recorte porque o ERP também usa `<img>` direto nela.

- [x] `ProductVariationPhotosEditor` agora usa o componente mobile `ProductImage` com `size="thumbnail"` nos cartões selecionados, mantendo dimensões, rótulos acessíveis, ações e contrato de imagens. `ProductImageProps` passou a omitir também `src` das props RN antes de declarar sua forma anulável; isso removeu o conflito de tipo que o verificador apontava nesse componente reutilizado.
- [x] Os testes de referência ERP (`ProductImage.test.tsx` e `imageUrlUtils.test.ts`) passaram: **10 testes** cobrem derivação de URL, cascata thumbnail → medium → original e placeholder. TypeScript mobile terminou com código 1 por **48 erros em outros caminhos**; a filtragem não encontrou diagnóstico em `ProductVariationPhotosEditor.tsx` nem em `components/shared/ProductImage.tsx`. `git diff --check` passou, com avisos de normalização CRLF existentes no workspace.
- [ ] A tentativa Playwright visível em `/products` redirecionou via OAuth ao login do Google. A lista de nomes de variáveis da Vercel não contém conta geral de teste; as credenciais listadas são de operador fiscal de homologação e não foram decriptadas nem reutilizadas. Não foi possível comparar visualmente o formulário autenticado. O renderer React Native não está instalado; comportamento nativo continua pendente.
- [ ] A skill de replicação segue encontrada somente no backup/cache `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/erp-web-to-mobile-replication/SKILL.md`; não foi localizada fonte canônica fora do cache.

#### Próximo recorte identificado

- [x] A falha de carregamento de imagem dentro da grade do seletor do produto pai foi auditada no Ciclo 60. A comparação visual autenticada e a validação nativa seguem pendentes.

### Ciclo 60 — imagem indisponível na grade do seletor do produto pai

**Resultado da comparação:** ERP e mobile apresentam as imagens da grade com os elementos nativos de cada plataforma: o ERP usa `<img src alt>` sem `onError` e sem cadeia de URL alternativa; o mobile usa `Image source` sem `onError` ou fallback. No mobile, a legenda `Capa do produto`/`Foto N` e o rótulo acessível do botão continuam visíveis/disponíveis mesmo quando a origem da imagem falha, e a opção permanece selecionável. O estado de carregamento/falha não altera a seleção, validação compartilhada, callback nem payload. Deixar o erro visual ao renderizador da plataforma é uma adaptação justificada: adicionar no grid o `ProductImage` da miniatura vinculada introduziria tentativas de thumbnail/medium/original que o ERP não executa nesta grade. Não foi necessária mudança de código.

- [x] Comparados `VariationParentImagesSelectModal` no ERP, o grid do modal em `ProductVariationPhotosEditor` e o contrato de seleção. Nenhuma consulta ou serviço de imagem é acionado pelo grid; links quebrados não removem nem desabilitam a foto, e a seleção continua sendo validada pela mesma `createVariationImageSelectionFormSchema`.
- [ ] A sessão Playwright atual está em `/login`, sem acesso à modal autenticada. Não há renderer de componentes React Native instalado; não foi possível observar a apresentação do erro em Android/iOS nem comparar o desenho visual do navegador com o aparelho. Nenhum teste foi executado neste ciclo sem alteração de código; não foi feita gravação remota.
- [ ] A skill de replicação segue disponível apenas na cópia de cache/backup de build; a fonte canônica do projeto continua não localizada.

#### Próximo recorte identificado

- [x] A busca por descrição no NCM enquanto outro código estava selecionado foi auditada e alinhada no Ciclo 62; avançar para permissões, ações da lista e estados restantes de preço/estoque.

### Ciclo 61 — digitação manual de NCM já existente

**Achado registrado antes da correção:** ao digitar um NCM de 8 dígitos no campo sem escolher uma sugestão, o ERP limpa a descrição fiscal antiga quando o código muda e preenche a descrição oficial do catálogo quando ela está vazia. O mobile já consulta o mesmo catálogo e mostra descrição oficial/alias, mas só atualiza `fiscal.ncm`; não limpa a descrição anterior nem grava a descrição oficial consultada. A divergência afeta o JSON fiscal salvo pelo formulário, embora a descrição visual apareça no cartão do catálogo. Não há particularidade mobile documentada que justifique persistir texto desatualizado. O recorte é somente a digitação direta de código completo; busca textual e demais campos fiscais ficam para outros ciclos.

- [x] Comparados `ProductNcmSelector`/`ProductFiscalTab` no ERP, `ProductFormFiscalTab` e `fetchMobileNcmCatalogEntry` no app, e os payloads controlados pelo formulário. O campo mobile é filho do proprietário `ProductFormScreen`, que executa `useZodForm` com `zodResolver` antes de `onSave`; a correção não criará um caminho de submissão paralelo.
- [x] Consultados o índice fiscal reconciliado em 23/10, todos os invariantes FISCAL-001–023, os históricos de 14/10 e 13/10, o índice dos manuais oficiais e as referências de NCM vigentes de 22/10 e 23/10. O ajuste só mantém a descrição catalogal coerente com o NCM escolhido; não altera classificação, regra tributária, emissão ou XML. A skill de replicação segue acessível somente no cache de build descrito na seção de regras deste inventário.
- [x] `shared-utils/productFiscalNcm.ts` agora concentra a troca de NCM (limpa descrição obsoleta e preserva os demais campos) e o preenchimento condicional da descrição oficial para o mesmo código ainda selecionado. O ERP e o app usam a regra compartilhada; o mobile aguarda a consulta apenas após digitação manual e mantém o caminho de seleção por sugestão.
- [x] A gravação mobile continua no formulário proprietário `ProductFormScreen`, após o `zodResolver` real de `useZodForm`. Nenhum serviço/payload de emissão, permissão ou gravação remota foi alterado.
- [x] Vitest ERP: **7 testes aprovados** em `ProductNcmSelector.test.tsx`; o caso novo comprova troca manual, limpeza da descrição, preenchimento oficial e preservação do CEST. TypeScript integral ERP e mobile terminou com código 2 por diagnósticos globais; a filtragem não encontrou erros em `ProductNcmSelector.tsx`, `ProductFormFiscalTab.tsx` ou `productFiscalNcm.ts`. `git diff --check` passou.
- [ ] A UI autenticada não foi alcançada; o último registro Playwright disponível está em `/login` (Ciclo 60). O mobile não declara renderer React Native, então a renderização nativa não foi comparada. Expo Web, inspeção em aparelho e seleção visual autenticada permanecem pendentes; nenhum banco remoto, XML fiscal, SEFAZ ou deployment foi usado.
- [ ] A fonte canônica da skill `erp-web-to-mobile-replication` ainda não foi localizada; somente a cópia no cache/backup de build está acessível.

### Ciclo 62 — busca textual de NCM com código anterior selecionado

**Achado registrado antes da correção:** ao substituir no campo do NCM selecionado uma busca por descrição (por exemplo, `cama casal`), o ERP grava a consulta textual em `fiscal.ncm` e, pela regra compartilhada, limpa `ncmDescription` do código anterior; os demais campos fiscais, como CEST, são preservados. No mobile, o texto visível e `ncmSearch` mudam, mas `formData.fiscal.ncm`, o cartão do NCM antigo e o payload de salvamento continuam com o código anterior até que se escolha um resultado ou se apague o campo. Não há particularidade mobile documentada para esse estado. A diferença afeta dados enviados pelo formulário, não só a apresentação.

- [x] Comparados `ProductNcmSelector` e o fluxo ERP de salvamento com `ProductFormFiscalTab`, o schema RHF/Zod proprietário e o serviço de mutação mobile. A busca por descrição sem seleção permanece texto de formulário nos dois fluxos; seleção continua substituindo a consulta por código e descrição oficial.
- [x] Confirmado que o helper `updateProductFiscalNcmCode` já compartilhado aceita a consulta como valor, limpa a descrição quando os dígitos do código selecionado mudam e preserva os demais campos fiscais. A correção não muda schema, contrato de submissão, classificação tributária, emissão nem XML.
- [x] `ProductFormFiscalTab` agora envia cada busca não vazia que não seja um NCM completo à mesma função compartilhada, sincronizando o formulário ao texto mostrado e descartando a descrição do código anterior quando aplicável. Limpar o campo continua limpando o NCM; digitar 8 dígitos e escolher um resultado mantêm seus caminhos próprios. A seleção mantém código/descrição oficiais e os demais campos fiscais, como CEST.
- [x] A correção permanece no formulário proprietário: `ProductFormScreen` executa `useZodForm`/`zodResolver` antes do serviço de salvamento. Nenhum submit novo, schema permissivo ou contrato fiscal foi introduzido.
- [x] Vitest ERP: **8 testes aprovados** em `ProductNcmSelector.test.tsx`; o caso novo comprova busca textual, descarte da descrição antiga e preservação do CEST no estado ERP de referência. TypeScript mobile encerrou com código 1 por diagnósticos globais; a filtragem não encontrou apontamentos em `ProductFormFiscalTab.tsx` ou `productFiscalNcm.ts`. `git diff --check` passou.
- [ ] A UI autenticada não foi acessada neste ciclo; o último estado visual disponível está em `/login`. Não há renderer React Native instalado, então o componente mobile e seu payload não foram renderizados em teste; Expo Web e aparelho permanecem pendentes. Sem gravação remota, operação fiscal, XML ou deployment.
- [ ] A fonte canônica da skill `erp-web-to-mobile-replication` ainda não foi localizada; somente a cópia no cache/backup de build está acessível.

#### Próximo recorte identificado

- [x] O primeiro estado de permissão da lista (perfil de impressão de etiquetas em produto simples rascunho) foi auditado no Ciclo 63; continuar pelos demais perfis e ações da lista, depois pelos estados restantes de preço/estoque.

### Ciclo 63 — perfil de impressão de etiquetas em produto simples rascunho

**Achado registrado antes da correção:** no card ERP, um perfil somente de impressão de etiquetas abre o menu de uma variação única apenas quando o produto não é rascunho; a ação de imprimir também exige permissão e que a variação não esteja mesclada. No card mobile, a disponibilidade do menu depende apenas da permissão de impressão, e o callback de etiqueta não exclui rascunho. Assim, o mobile oferece impressão de identificação para uma variação única em rascunho, estado que o ERP bloqueia. Não foi localizada particularidade documentada que justifique a diferença. Este recorte cobre somente perfil de etiquetas + produto simples rascunho; outras ações de lista/perfis ficam para ciclos posteriores.

- [x] Comparados `ProductCardActions` no ERP, `useMobileProductCardState`/`MobileProductCard` e `MobileProductVariationActionsMenu` no aplicativo, além da permissão compartilhada `printProductIdentificationLabels`. O reconhecimento de perfil e o limite de rascunho no ERP foram verificados; a origem do produto simples como pai com uma variação operacional segue `estrutura-produto-variacao.md`.
- [x] A regra de permissão base já vem de `shared-utils/productPermissions.ts` e é usada pelos dois clientes. A diferença comprovada está no predicado da ação de impressão: mobile não considera rascunho; o ERP também bloqueia variação mesclada. Não há regra de estoque, gravação nem formulário neste estado.
- [x] `getProductIdentificationLabelActionAvailability` em `shared-utils/productPermissions.ts` agora centraliza a elegibilidade nos dois clientes: o menu label-only exige permissão, variação única e produto fora de rascunho; a impressão também bloqueia variação mesclada. ERP (card e tabela) e mobile (hook e card) usam esse predicado. O contrato de impressão, payload e serviço não mudaram.
- [x] Vitest focado: **24 arquivos e 199 testes aprovados** na suíte `ProductList` e no teste de domínio `productPermissions.test.ts`. TypeScript integral ERP e mobile terminou com código 2 por diagnósticos globais; a filtragem não encontrou diagnósticos nos arquivos tocados. Nenhum teste de persistência foi necessário para essa regra de visibilidade.
- [ ] Playwright visível abriu `/products` e redirecionou para `/login`; não havia credenciais gerais de ERP no ambiente e credenciais fiscais não foram usadas. O renderer React Native não está instalado; Expo Web não comprova comportamento nativo. A inspeção visual autenticada e a validação em aparelho permanecem pendentes. Nenhum dado remoto foi gravado.
- [ ] A skill `erp-web-to-mobile-replication` continua acessível somente no backup/cache `.vercel`; não foi localizada cópia canônica do projeto fora desse diretório.

#### Próximo recorte identificado

- [x] O perfil sem permissão de impressão foi auditado no Ciclo 64; foi encontrada uma regressão de visibilidade das ações mover/mesclar no menu de tabela do ERP, registrada abaixo antes da correção.

### Ciclo 64 — perfil sem permissão de etiqueta em produto simples ativo

**Achado registrado antes da correção:** com um perfil de Gestor que mantém edição, mas é removido da configuração de `printProductIdentificationLabels`, a ação de imprimir deve desaparecer sem afetar outras ações. Após o Ciclo 63, `ParentProductActions` passou a colocar `Mover para outro produto pai` e `Mesclar com outra variação` dentro do mesmo condicional `identificationLabelAvailability.canPrintLabel` da etiqueta. Isso faz a tabela ERP ocultar essas operações quando o Gestor não tem permissão de impressão, embora `ProductCardActions` do ERP e o card mobile as mantenham para perfis editáveis em produto ativo, simples e não mesclado. A permissão de impressão e a capacidade de editar/mover/mesclar são distintas; não foi encontrada particularidade mobile que justifique a diferença.

- [x] Comparados a matriz compartilhada, a configuração dinâmica de permissões no ERP e mobile, `ProductCardActions`, `ParentProductActions`, `MobileProductCard` e o menu de variação. A configuração explícita sem o Gestor é preservada nos dois resolvedores de permissão; ela não remove `productConfig`.
- [x] Separada a condição da etiqueta das ações de mover/mesclar em `ParentProductActions`: a impressão continua exigindo `identificationLabelAvailability.canPrintLabel`; mover e mesclar voltaram a depender apenas de variação única operacional, não rascunho, não mesclada e callbacks fornecidos. Um teste novo reproduziu a ausência das duas ações antes da correção e passou depois.
- [x] Vitest focado ERP/mobile: **24 arquivos e 200 testes aprovados**. `tsc --noEmit -p erp/tsconfig.json` terminou com código 2 por diagnósticos globais, sem nenhum nos arquivos tocados. `git diff --check` passou.
- [x] A permissão `printProductIdentificationLabels` controla a etiqueta de identificação; a ação separada `Etiq. de Preço` continua presente no ERP e no mobile conforme seus gates atuais, sem ser confundida com essa permissão.
- [ ] Playwright visível abriu `/products`, que redirecionou para `/login`. A listagem de variáveis da Vercel Development (sem decriptar valores) não encontrou credenciais gerais de ERP; nenhuma credencial fiscal foi usada. A comparação autenticada continua pendente. Renderer React Native não está instalado; Expo Web não comprova comportamento nativo. Nenhum dado remoto foi gravado.
- [ ] A skill `erp-web-to-mobile-replication` continua localizada somente no backup/cache `.vercel`, sem fonte canônica fora desse diretório.

#### Próximo recorte identificado

- [x] Confirmado no Ciclo 65 que `viewStockLabels` é a permissão separada para imprimir etiquetas de produtos e preços. O perfil Gestor sem `printProductIdentificationLabels`, mas com `viewStockLabels`, pode manter a etiqueta de preço.

### Ciclo 65 — etiqueta de preço com impressão de identificação negada

**Achado:** o perfil Gestor pode perder a permissão específica `printProductIdentificationLabels` e ainda manter acesso à etiqueta de preço por `viewStockLabels`. A matriz genérica de Estoque descreve essa permissão como acesso a “etiquetas de produtos e preços” e seus papéis padrão incluem Gestor, Entregador e Estoquista. `ProductIdentificationLabelRoute` abre todas as categorias quando `viewStockLabels` está liberada; o fallback de `printProductIdentificationLabels` permite somente identificação. Portanto, no estado auditado — Gestor sem impressão de identificação, mas com acesso a etiquetas de estoque — a ação de preço deve permanecer disponível.

- [x] Comparados `ParentProductActions` (menu da tabela ERP), `LabelPrintSelectionModal`, `ProductIdentificationLabelRoute`, `MobileProductCard` e `buildProductPriceLabelUrl`. O menu da tabela ERP e os menus do card/variação mobile mantêm a ação para este perfil não label-only; o mobile encaminha `cat=precos`, `productId` e `autoAddProduct=true` à tela ERP, que carrega o produto selecionado.
- [x] Não foi observada divergência no estado Gestor avaliado: `viewStockLabels` continua concedida e o guard libera as etiquetas de preço. Não houve alteração de código nem teste executado neste ciclo de inspeção somente leitura.
- [x] A adaptação mobile de abrir a tela ERP para impressão de preço já está registrada em `docs/forms/migracao-rhf-zod-2026-10-14.md` (22/10). Nenhum novo serviço, payload de cadastro ou escrita remota é necessário para este estado; a gravação/fila de impressão não foi exercitada.
- [ ] A comparação visual autenticada e o fluxo real de impressão permanecem pendentes: o último Playwright acessível estava em `/login`; não foram usadas credenciais fiscais. Expo Web não comprova comportamento nativo.
- [ ] A cópia da skill de replicação continua somente no backup/cache `.vercel`; nenhuma fonte canônica do projeto foi localizada.

#### Próximo recorte identificado

- [x] O perfil Gestor sem `viewStockLabels` e sem `printProductIdentificationLabels` foi auditado no Ciclo 66. ERP e mobile exibem a ação de etiqueta de preço para Gestor que ainda edita Produtos, e o guard da tela bloqueia a rota; a exposição sem autorização é um problema compartilhado dos dois clientes, não uma diferença a corrigir só no app.

### Ciclo 66 — etiqueta de preço sem permissões de etiquetas

**Resultado da comparação:** no cenário de Gestor que mantém acesso/edição do catálogo, mas não possui `viewStockLabels` nem `printProductIdentificationLabels`, a ação de etiqueta de preço continua visível nos dois clientes. No ERP, `ParentProductActions` oculta o menu apenas para o perfil classificado como label-only; “Etiq. de Preço” não verifica `viewStockLabels`. No app, `NativeProductsScreen` passa a classificação compartilhada de label-only, e `MobileProductCard` expõe a ação ao perfil não label-only fora da lixeira. O menu de variação única aplica o mesmo critério e bloqueia variação mesclada.

- [x] Conferidos os contratos e permissões: `viewStockLabels` é o acesso ao módulo “Etiquetas de produtos e preços” (`permissionConfig.ts`); a ação `printProductIdentificationLabels` é separada e específica de identificação (`shared-utils/productPermissions.ts`). O perfil Gestor não é classificado como label-only pelo helper compartilhado. O backend de permissões ERP/app considera `rolePermissions`, mas nenhum dos dois menus usa o acesso a etiquetas como predicado da ação de preço.
- [x] Conferidos os efeitos: o ERP abre `LabelPrintSelectionModal`, que valida a seleção via RHF/Zod e navega para `/estoque/etiquetas`; o mobile abre a mesma rota ERP com `cat=precos`, `productId` e `autoAddProduct=true`. `ProductIdentificationLabelRoute` só entrega o módulo completo se `viewStockLabels` for concedida e redireciona para `/` quando também falta a permissão de identificação. Assim, a ação visível termina bloqueada pelo guard em ambos. A diferença de entrada (modal ERP versus abertura direta pelo mobile) é a adaptação já documentada em `docs/forms/migracao-rhf-zod-2026-10-14.md`.
- [x] Não houve alteração de código: esconder a ação apenas no mobile criaria uma divergência do ERP. O achado é uma falha de autorização/UX compartilhada; um eventual ajuste deve condicionar a ação a `viewStockLabels` nos dois clientes e manter o guard da rota. Não foi preciso decidir nem alterar essa política para fechar a comparação deste estado.
- [x] A pilha `npm run dev` iniciou ERP em `5173` (Vite `strictPort`) e API em `3000`. Playwright visível abriu `/products`, cujo snapshot redirecionou para `/login`; nenhuma sessão foi criada/simulada e o fluxo de impressão não foi submetido. O navegador permanece na tela de login; a pilha foi encerrada após a checagem.
- [x] **Observação de segurança do ambiente:** durante a janela do servidor, o log local registrou um `POST /api/testing/test-artifact-operator` e dois `POST /api/nfe/inbound-manifestation` (todos responderam `204`/`200`). O usuário confirmou que as manifestações eram esperadas em outra sessão. Elas não foram chamadas pelos passos Playwright deste ciclo, não foram repetidas e não foram usadas como evidência de Produtos. A origem do POST ao operador de artefatos de teste continua sem confirmação; ele também não foi repetido. Não se afirma ausência de outros efeitos da sessão externa.
- [ ] Não foram executados testes lógicos neste ciclo sem alteração de código. Nenhuma comparação visual autenticada, consulta de produto ou impressão foi feita. Expo Web/runtime nativo não foram validados; nenhuma guarda foi contornada.
- [ ] A skill de replicação continua acessível somente no backup/cache de build `.vercel`; a fonte canônica fora do cache não foi localizada.

#### Próximo recorte identificado

- [ ] Auditar um Gestor que possui `printProductIdentificationLabels`, mas não `viewStockLabels`: verificar se a ação de identificação continua disponível enquanto etiqueta de preço é exposta e depois redirecionada pelo guard para `cat=identificacao`.

### Ciclo 67 — identificação permitida e etiqueta de preço sem acesso ao estoque

**Achado registrado antes da correção:** este perfil exige uma configuração explícita de `rolePermissions`, pois Gestor recebe ambas as permissões por padrão. Com `printProductIdentificationLabels` concedida e `viewStockLabels` removida, o predicado compartilhado do ERP e do app mantém a ação de identificação para produto operacional elegível. Porém o clique mobile constrói somente `productId`, `variationId` e `fillSheet=1`; `useLabelProducts` ignora `productId` sem `autoAddProduct=true`, enquanto o ERP navega com `location.state.product` e a fila recebe esse produto. Assim, a ação mobile abre a categoria de identificação permitida, mas sem o produto pré-selecionado.

- [x] Confirmado que a ação “Imprimir Etiqueta de Identificação” permanece disponível para o perfil autorizado; a disponibilidade compartilhada exige permissão, variação operacional única e produto fora de rascunho, e bloqueia impressão da variação mesclada. A rota permite `cat=identificacao` sem `viewStockLabels` quando a permissão específica de identificação existe.
- [x] Confirmado que “Etiq. de Preço” também permanece visível no ERP e no app para o Gestor não classificado como label-only, mesmo sem `viewStockLabels`. Ao clicar, o guard não permite a categoria de preço: redireciona para `cat=identificacao`. O ERP preserva `location.state` e a seleção do modal; o mobile perdia `productId` e `autoAddProduct` ao substituir toda a query. Na época, a decisão de visibilidade ficou pendente; ela foi resolvida no Ciclo 103 pela regra vigente de paridade: manter o mesmo gate nos dois clientes e corrigir apenas a perda do produto no redirecionamento mobile.
- [x] A comparação direta de identificação encontrou a diferença app/ERP no prefill, antes de qualquer edição. O helper mobile `buildProductIdentificationLabelUrl` agora envia `autoAddProduct=true` e a variação quando existe; a consulta ERP busca a relação `product_variations(*)` somente nesse contexto, seleciona pelo UUID da variação (inclusive para o produto simples) e reutiliza `parseVariationImages` do mapper ERP. O caminho sem variação continua selecionando o produto pai.
- [x] O deep link mobile de identificação agora interpreta `fillSheet=1` como no ERP e adiciona ao menos 10 unidades, respeitando a capacidade do modelo atual (mesma regra dos links ERP, que enviam `quantity: 10` e `fillSheet: true`). O contrato da fila e as permissões não foram alterados.
- [x] Vitest focado: **14 testes aprovados em 3 arquivos**, cobrindo a URL, seleção do UUID de variação e preenchimento da folha. `git diff --check` passou.
- [ ] `tsc --noEmit -p erp/tsconfig.json` terminou com código 1 por diagnósticos globais do projeto; a filtragem da saída não encontrou apontamentos em `useLabelProducts.ts` ou `useLabelPrintingState.ts`. Os componentes mobile não foram cobertos por TypeScript porque `mobile/node_modules` não está instalado neste workspace.
- [ ] Playwright autenticado não foi repetido neste ciclo: não há credencial geral disponível no contexto e a rota de Produtos anteriormente redirecionou para `/login`. Nenhum guard foi contornado, nenhuma impressão ou escrita remota foi realizada. Expo Web não comprova runtime nativo.
- [ ] A skill de replicação continua acessível somente no backup/cache `erp/.vercel`; a fonte canônica fora do cache não foi localizada.

#### Próximo recorte identificado

- [x] Auditoria de etiqueta de identificação numa família com múltiplas variações concluída no Ciclo 68: seleção por UUID, quantidade da folha e bloqueio de variação mesclada conferidos. A decisão sobre visibilidade da etiqueta de preço sem `viewStockLabels`, que estava aberta naquele momento, foi encerrada no Ciclo 103 sem alterar o gate dos clientes.

### Ciclo 68 — etiqueta de identificação em família multi-variação

**Resultado da comparação:** não foi encontrada diferença funcional app/ERP no recorte de identificação por variação quando o perfil tem `printProductIdentificationLabels`. As ações do ERP enviam o UUID da variação e do pai, enfileiram quantidade 10 e sinalizam `fillSheet`; a entrada mobile usa os mesmos UUIDs pela query string e o fluxo de etiquetas resolvido no Ciclo 67 carrega a variação escolhida, suas imagens e aplica `max(capacidade do modelo, 10)`.

- [x] Comparados `ChildVariationActions` e `VariationItemActions` no ERP com `MobileProductVariationCard`/`MobileProductVariationActionsMenu`. A etiqueta só aparece com permissão; variação mesclada mantém aviso e não mostra a ação nos dois clientes (ERP verifica `mergedToVariationId`; mobile normaliza `merged_to_variation_id`/`mergedToVariationId`).
- [x] Conferido o encadeamento do prefill: o ERP coloca `variationId || id` e `productId || parentId` no estado; mobile envia `parentProduct.id` e `v.id`; `useLabelProducts` seleciona a linha por UUID, preserva o pai, SKU e fotos via `parseVariationImages`; a fila registra `productId` do pai e `variationId` da seleção. O pai de duas ou mais variações segue o modelo de família de `estrutura-produto-variacao.md`.
- [x] Adicionado caso de Vitest com duas variações irmãs que confirma que o link enfileira apenas o UUID, SKU e preço da variação escolhida. Vitest focado: **20 testes aprovados em 4 arquivos**, incluindo permissão compartilhada, seleção múltipla e quantidade da folha; `git diff --check` passou. Não houve alteração de comportamento neste ciclo.
- [ ] Não houve renderização autenticada via Playwright; a rota exige sessão e ciclos anteriores redirecionaram para `/login`. Não houve consulta ou impressão remota. O renderer mobile não está instalado; Playwright/Expo Web não comprovariam o runtime nativo.
- [ ] O TypeScript integral ERP continua com diagnósticos globais (código 1 no último ciclo); TypeScript mobile segue sem execução neste workspace, sem `mobile/node_modules`.
- [ ] A skill de replicação permanece localizada somente em cache/backup de build `erp/.vercel`; nenhuma fonte canônica foi localizada.

#### Próximo recorte identificado

- [x] Auditoria de etiqueta de preço por variação individual concluída no Ciclo 69: família com `viewStockLabels` concedida e `printProductIdentificationLabels` negada não oferece ação de preço por filha em nenhum cliente. O menu do pai oferece preço nos dois; a divergência de permissão já registrada para `viewStockLabels` negada permanece pendente.

### Ciclo 69 — etiqueta de preço em família multi-variação

**Resultado da comparação:** não foi encontrada diferença funcional ERP/app para imprimir etiqueta de preço diretamente de uma variação individual numa família com duas ou mais variações. O ERP não inclui a ação no menu `ChildVariationActions`; o mobile não passa `onPrintPriceLabel` ao `MobileProductVariationActionsMenu` de `MobileProductVariationCard`. Ambos mantêm a ação no menu do produto pai (`ParentProductActions` / `MobileProductActionsMenu`) e iniciam a seleção de etiqueta para o pai, sem `variationId`.

- [x] Conferidos os contratos do domínio: `estrutura-produto-variacao.md` define família multi-variação como duas ou mais linhas, cada uma com UUID próprio; a impressão por filha não está documentada como exceção de plataforma. `viewStockLabels` autoriza a rota de etiquetas e `printProductIdentificationLabels` governa a ação de identificação; a disponibilidade de etiqueta de preço não usa a permissão de identificação.
- [x] Comparados os estados/permissões. No ERP, o menu pai abre `onOpenLabelModal('price')`; o menu filho só oferece identificação, mover e mesclar, e oculta as ações para variação mesclada. No mobile, o menu pai passa `onPrintPriceLabel` para produto elegível; o menu da filha recebe apenas `onPrintLabel` para identificação e as ações operacionais. O link mobile de preço continua com `cat=precos`, `productId` do pai e `autoAddProduct=true`, sem seleção de variação.
- [x] Lógica compartilhada consultada: `getProductIdentificationLabelActionAvailability` cobre apenas elegibilidade de identificação; não existe predicado compartilhado de etiqueta de preço por variação. Nenhum helper ou payload foi necessário mudar porque os dois clientes não oferecem esse fluxo por filha.
- [x] Sem alteração de código ou teste neste ciclo, por se tratar de comparação estática sem divergência. A evidência de Vitest 20/20 do Ciclo 68 não foi repetida e não valida este estado de interface.
- [ ] Playwright autenticado, impressão real e consulta remota continuam pendentes: os ciclos visíveis anteriores chegaram a `/login`; não houve gravação ou tentativa de contornar guardas. Expo Web não comprova runtime nativo. TypeScript mobile não foi executado por ausência de `mobile/node_modules`; o TypeScript integral ERP permanece com diagnósticos globais registrados no Ciclo 68.
- [ ] Skill `erp-web-to-mobile-replication` continua disponível somente no backup/cache de build `erp/.vercel`; as buscas em `.agents/skills` do projeto e no diretório de skills do usuário não localizaram fonte canônica.
- [x] A decisão compartilhada do Ciclo 67 sobre a visibilidade de “Etiqueta de Preço” foi resolvida no Ciclo 103: preservar a disponibilidade atual igual à ERP nos dois clientes; o redirecionamento autorizado para identificação mantém o contexto do produto no mobile.

#### Próximo recorte identificado

- [x] Auditoria de etiqueta de identificação em composições simples e multi-variações concluída no Ciclo 70; gate de perfil sem permissão também foi comparado e corrigido no mobile.

### Ciclo 70 — etiqueta de identificação em produto composto

**Achado registrado antes da correção:** o ERP não mostra o menu da variação quando o perfil é identificado como exclusivo de etiquetas de identificação, mas não tem `printProductIdentificationLabels`: `ChildVariationActions` retorna `null`. O mobile deixa o botão de três pontos sempre visível em `MobileProductVariationCard`; nessa combinação o menu abre sem nenhuma ação, apresentando só o título e o botão de fechar. A diferença também afeta as variações de uma composição. A regra é documentada pelo gate do ERP e pode ser compartilhada sem mudar a disponibilidade de edição para outros perfis.

- [x] Conferido o fluxo ERP de produto simples composto por pai e uma variação real: `flattenProductsForList` obtém a linha de `product.variations`; `ProductTable` entrega essa única variação a `ParentProductActions`, cuja elegibilidade compartilhada exige permissão, não rascunho e variação não mesclada. O tipo `composition` e `combo_items` não alteram a contagem.
- [x] Conferido o fluxo mobile equivalente: `mobileProductFetchService` monta `allVariations` somente a partir de `product_variations`; guarda os componentes em `comboItems` separado; `useMobileProductCardState` usa apenas `allVariations` para determinar a variação única e consome o mesmo helper compartilhado de elegibilidade.
- [x] Para família composta com duas ou mais variações, ERP cria linhas filhas e mobile expande `MobileProductVariationList`; ambas oferecem identificação por UUID de cada variação elegível. Componentes de composição (`combo_items` do pai ou da variação) não entram na lista de variações em nenhum cliente.
- [x] Centralizado `canShowProductVariationActionsMenu` em `shared-utils/productPermissions.ts` e consumido no `ChildVariationActions` ERP e no botão/modal de `MobileProductVariationCard`. O mobile oculta o menu vazio apenas para perfil exclusivo de etiquetas sem a permissão de identificação; perfis operacionais mantêm o menu mesmo sem poder imprimir. O helper foi coberto nos três casos de permissão.
- [x] Vitest focado ERP/mobile: **34 testes aprovados em 4 arquivos**, cobrindo transformação da lista, ações do pai, os três casos do helper compartilhado e serviços de busca mobile. São provas unitárias separadas; não há renderização da tela mobile neste teste. TypeScript ERP terminou com código 2 e 710 linhas de saída; mobile terminou com código 2 e 74 linhas; nenhum dos projetos apontou diagnóstico nos arquivos alterados. `git diff --check` passou.
- [ ] Comparação visual autenticada ainda não foi feita: sessões anteriores redirecionaram para `/login`. `@testing-library/react-native` não está instalado; o Vitest cobriu a regra pura, não o render nativo. Expo Web não comprova comportamento nativo. Sem leitura ou escrita remota; nenhuma guarda foi contornada.
- [ ] A skill `erp-web-to-mobile-replication` segue encontrada apenas no cache/backup `.vercel`; buscas nas pastas canônicas do projeto e do usuário não encontraram fonte atual.
- [x] A decisão compartilhada do Ciclo 67 sobre mostrar ou ocultar etiqueta de preço quando `viewStockLabels` está negada foi resolvida no Ciclo 103, independentemente deste ajuste de identificação.
- [ ] Auditar disponibilidade de estoque de composição simples e multi-variação no ERP/app: composição do saldo por componentes do pai versus componentes por variação, seleção por UUID do componente e estados sem estoque/composição incompleta.

### Ciclo 71 — disponibilidade de estoque em composição

**Resultado da comparação:** a disponibilidade calculada de composições simples e com variações é equivalente para o contrato canônico `comboItems`/`productId`/`variationId`/`quantity`. ERP e mobile consultam estoque do componente, resolvem a linha física pelo UUID da variação quando informado, agregam usos repetidos do mesmo componente e usam `calculateCompositionAvailability` compartilhado (menor `floor(max(0, saldo) / quantidade)`). Quantidade vazia, componente ausente, resposta de consulta inválida ou falha de consulta resultam em disponibilidade zero nos dois clientes.

- [x] Comparados `applyCompositionAvailability` em `erp/src/pages/utils/productService/productQueryService.ts` e `applyMobileCompositionAvailability` em `mobile/src/features/products/services/mobileProductFetchService.ts`: componentes do pai e das variações são coletados; uma variação usa sua própria composição quando preenchida e recorre aos componentes do pai quando não tem componentes próprios; o saldo do pai agrega os saldos calculados das variações que têm composição própria.
- [x] Comparado o estado visual: produto composto simples mostra o saldo calculado nos dois clientes; composição de uma variação mostra o saldo da linha física; família com múltiplas variações deixa o saldo do pai vazio/oculto e apresenta saldo por variação filha. No ERP isso decorre da célula `stock` em `ProductRowStandardCells`; no mobile, do card pai sem preço/estoque quando há várias variações e dos cards filhos.
- [x] Regra física e matemática vêm de `docs/arquitetura/estrutura_banco_supabase.md` (estoque físico por variação e saldo cacheado) e `shared-utils/compositionMath.ts`. A documentação de estrutura de produtos mantém componentes (`combo_items`) separados das variações reais. Não foi encontrada divergência suportada que justifique alterar o aplicativo.
- [x] O teste Vitest focado já executado durante este recorte aprovou **33 testes em 3 arquivos**: matemática de composição, mapper de variação e serviço de busca mobile. Este ciclo não mudou código; nenhuma nova suíte foi executada.
- [ ] A normalização mobile tolera aliases históricos `product_id`/`variation_id`, enquanto o contrato ERP usa campos camel case. Os formulários e mapeadores atuais gravam o formato camel; como nenhum dado remoto foi consultado, a presença de linhas históricas em snake case não foi comprovada e essa compatibilidade não foi removida.
- [ ] O comportamento de estoque real, baixa/consumo de componentes, consulta com usuário autenticado e escrita remota não foi validado. As regras de acesso não foram contornadas; a validação de UI autenticada e runtime nativo continua pendente (Expo Web não comprova comportamento nativo).
- [ ] A skill `erp-web-to-mobile-replication` continua localizada apenas no backup/cache de build `erp/.vercel`; as buscas em `.agents/skills` do projeto e no diretório de skills do usuário não encontraram uma fonte canônica atual.
- [x] A decisão compartilhada do Ciclo 67 sobre a ação “Etiqueta de Preço” foi resolvida no Ciclo 103 conforme a regra geral de paridade: manter o gate igual nos dois clientes e reter o produto no redirecionamento mobile.

### Ciclo 72 — seleção e busca de componentes na edição de composição

**Resultado da comparação:** a seleção do produto ou da variação grava o mesmo UUID físico, descrição, preço, estoque e quantidade inicial. O formulário proprietário do mobile continua validando por RHF + `zodResolver` e os schemas de domínio compartilhados; quantidade menor que 1 é rejeitada no mesmo limite do ERP, e valores fracionários maiores ou iguais a 1 são aceitos nos dois. A serialização mobile já normaliza e persiste `combo_items` no formato camel canônico tanto no produto quanto na variação; nenhuma gravação remota ou reabertura de registro real foi feita.

- [x] Comparado o autocomplete ERP (`VariationCompositionItemsTab`, `ProductAutocomplete` e `useProductAutocomplete`) com `ProductFormCompositionTab` e `mobileProductCompositionService`: produtos ativos, não rascunhos, não compostos, fornecedor selecionado, variações operacionais e exclusão de variações mescladas. Variações mantêm o UUID próprio e são elegíveis separadamente.
- [x] Corrigida divergência comprovada: o app impedia repetir o mesmo componente, enquanto o ERP permite linhas repetidas. A validação por linha continua exigindo componente selecionado e quantidade mínima 1; não foi criada validação de unicidade.
- [x] Alinhada a lista de sugestões de 5 para até 15, como o limite do autocomplete ERP, e adicionada espera máxima de 10 segundos à consulta mobile, igual à referência web. Timeout produz estado de erro recuperável; não foi adicionado cancelamento da solicitação de rede subjacente.
- [x] Alinhados os estados da busca mobile: rótulo de carregamento, mensagem de lista vazia, limpeza de resultados antigos ao editar a busca e ação acessível para tentar novamente após falha. A lista de até 15 resultados tem rolagem própria para a tela mobile.
- [x] Conferidos `productAutocompleteFormSchema`, os schemas de composição em `shared-utils/productVariationValidation.ts` e `shared-utils/mobileProductFormSchema.ts`, a validação real do formulário proprietário em `ProductFormScreen` e a normalização do payload em `mobileProductMutationService`; nenhum contrato de escrita foi modificado neste recorte.
- [x] Vitest focado: **89 testes aprovados em 4 arquivos** (modal ERP de variação, busca de componentes mobile, schema do formulário mobile e mutação mobile). Inclui limite de 15 resultados e estado de timeout. `git diff --check` passou.
- [ ] TypeScript mobile encerrou com código 1 por diagnósticos globais em outros módulos (DistanceInput, logística/entregas, pedidos, estoque e IA/offline); nenhum diagnóstico foi apontado nos arquivos deste recorte.
- [ ] Playwright autenticado, renderização no Expo/aparelho, gravação/leitura remota e reabertura de uma composição real continuam pendentes. Expo Web não prova comportamento nativo. Nenhuma guarda foi contornada e nenhuma escrita remota foi feita.
- [ ] A skill `erp-web-to-mobile-replication` segue disponível apenas em cópia de cache/backup `.vercel`; buscas no `.agents/skills` do projeto e no diretório de skills do usuário não localizaram a fonte canônica atual.
- [x] A questão do Ciclo 67 sobre a ação “Etiqueta de Preço” sem `viewStockLabels` foi encerrada no Ciclo 103 e não altera as regras de composição.

#### Próximo recorte identificado

- [x] A cadeia de ativação e disponibilidade de composição foi comparada nos Ciclos 73–74: componentes por variação, validação compartilhada e RHF/Zod, gravação e recarga da lista, e estados de sucesso/falha. O Ciclo 153 complementou a guarda para uma variação virtual que ficou obsoleta depois da leitura da lista; validação visual autenticada e persistência real continuam pendentes.

### Ciclo 73 — gravação e reabertura dos componentes da composição

**Resultado da comparação:** o fluxo existente conserva a lista de componentes de forma independente no produto pai e em cada variação. No ERP, `getFullProduct` carrega as linhas de `product_variations`, `mapDbVariations` hidrata `comboItems` do campo `combo_items` e o modal parte do objeto persistido; ao salvar variação existente, o serviço atualiza essa mesma coluna. No mobile, a consulta da lista carrega o pai e as variações, a tela restaura ambas as listas e a mutação envia o formato canônico ao RPC transacional. Não foi comprovada diferença de persistência que exija alteração de produção neste recorte.

- [x] Conferido o ciclo ERP de edição: `useProductFormLoad` obtém o produto completo; `mapFromDB`/`mapDbVariations` mapeiam `products.combo_items` e `product_variations.combo_items` separadamente; `buildInitialVariationFormData` preserva os campos da variação; o modal aplica `createProductVariationSubmissionSchema` por `useZodForm` antes de chamar `handleSaveVariation`.
- [x] Conferidas remoção e quantidade no editor ERP: operam por índice sobre a lista da variação. `saveVariation` faz upsert com a lista completa em `combo_items`; em rascunho, o snapshot do produto conserva `variations[].comboItems` e persiste a agregação pelo fluxo de rascunho.
- [x] Conferido o ciclo mobile de leitura: `fetchMobileProductsPage` seleciona `product_variations(*)`, mapeia `combo_items` do pai e da variação, restaura o snapshot de rascunho e `ProductFormScreen` passa ambas as listas ao formulário. O modo de edição do componente remove por índice, atualiza a quantidade no item correspondente e conserva a lista no estado de sua variação.
- [x] Conferida a gravação mobile: o formulário executa o schema real por RHF/Zod; `mobileProductMutationService` normaliza `comboItems` para `combo_items` camel canônico no pai e nas variações, grava tudo numa chamada a `save_mobile_product_transaction`, exige confirmação de ID retornado e propaga falhas. A tela fecha após confirmação; a lista é recarregada pelo hook. Nenhuma chamada remota foi executada neste ciclo.
- [x] Adicionado teste de reidratação mobile que confirma que os componentes do pai e da variação chegam separados após a leitura da página. Vitest focado: **50 testes aprovados em 4 arquivos**, cobrindo reidratação mobile, payload da mutação mobile, lista de raiz e mapper ERP de variação. `git diff --check` passou.
- [ ] Não houve renderização autenticada via Playwright nem validação Expo/aparelho. Expo Web não prova comportamento nativo. O teste de serviço usa mocks e não comprova gravação/leitura do banco remoto.
- [ ] A composição simples no nível do pai permanece sem editor nos formulários atuais ERP e mobile, conforme `estrutura-produto-variacao.md`; o modelo/validação/persistência aceitarem `combo_items` no pai não é evidência para criar um fluxo visual novo.
- [ ] A skill `erp-web-to-mobile-replication` segue localizada somente em cache/backup `.vercel`; `.agents/skills` do projeto/usuário não contém fonte canônica atual. A orientação disponível foi aplicada e a limitação permanece registrada.
- [x] A questão do Ciclo 67 sobre “Etiqueta de Preço” com `viewStockLabels` negada foi encerrada no Ciclo 103; não altera o formulário de composição.

### Ciclo 74 — ativação de composição e status derivado do produto pai

**Achado registrado antes da correção de interface:** os critérios para ativar composição por variação já são compartilhados pelo ERP e pelo mobile, mas o mobile oferecia uma ação adicional para ativar/desativar a família pelo menu do produto pai. O ERP trata o status do pai como derivado das variações e bloqueia o badge nessa linha; o menu pai ERP também não oferece alternância de status. No app, o menu do pai chamava o serviço com o UUID do produto, que grava o status do pai e de todas as variações reais, fluxo ausente na interface ERP.

- [x] Conferidos os critérios compartilhados em `shared-utils/productActivationValidation.ts`: nome/categoria/fornecedor no pai; preço do pai quando herdado ou da variação quando próprio; rascunho e estoque não convencional bloqueados; composição por variação exige pelo menos dois componentes vinculados à própria variação. ERP e mobile usam o mesmo validador; o serviço mobile também recarrega o produto e valida os componentes persistidos antes de ativar.
- [x] Conferida a comparação de status: `ChannelStatusBadges` ERP não permite alternar pai (`isParent`), e `ParentProductActions` não contém ação de ativação. A família pode ser alterada por variação nos dois clientes; o ERP recalcula o status do pai como derivado. `MobileProductCard` mantém a alternância individual no card de produto simples/variação única e nas linhas filhas, mas `MobileProductActionsMenu` expunha uma alternância adicional no pai de família.
- [x] Não foi localizada particularidade mobile documentada que justifique a operação em lote pelo menu pai. A diferença foi registrada antes de editar a UI; nenhuma regra de elegibilidade, payload ou persistência do serviço será modificada.
- [x] Corrigida a ação no menu mobile: `canToggleProductActivationFromCardMenu` bloqueia somente o pai de família (duas ou mais variações), preservando o menu de produto simples e as alternâncias de cada variação. O status do pai continua sendo atualizado como resultado derivado da operação individual da variação.
- [x] Feedback observado: ERP usa atualização otimista com toast e rollback; mobile aguarda a resposta limitada por timeout, atualiza o badge após sucesso e usa `Alert` mais recarga da lista em falha. A atualização confirmada do badge fornece feedback de sucesso inline, e o alerta é nativo; essa diferença de plataforma foi registrada sem alterar a sequência de persistência do mobile.
- [x] Vitest focado: **36 testes mobile em 2 arquivos** (regras do card e mutação, incluindo composição incompleta e validação dos componentes da variação) e **25 testes ERP em 3 arquivos** (validação, persistência e atualização otimista de status), total de **61 testes aprovados**. `git diff --check` passou; Git emitiu avisos de normalização CRLF de arquivos previamente modificados, sem erro de whitespace.
- [ ] TypeScript mobile encerrou com código 2 e **73 diagnósticos globais** em outras áreas; nenhum diagnóstico foi reportado em `MobileProductCard.tsx`, `mobileProductCardRules.ts` ou `mobileProductCardRules.test.ts`.
- [ ] Não houve execução Playwright autenticada neste recorte; o acesso anterior à rota de Produtos redirecionou para `/login`. Expo Web, aparelho/runtime nativo e persistência remota não foram verificados. Os testes de serviços usam Supabase mockado; nenhuma escrita remota foi feita.
- [ ] A skill `erp-web-to-mobile-replication` foi consultada na cópia de backup/cache `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/erp-web-to-mobile-replication/SKILL.md`; não foi localizada fonte canônica atual em `.agents/skills` do projeto ou do usuário.

#### Próximo recorte identificado

- [x] Lista de Produtos retomada no Ciclo 75; auditoria de concorrência e estado de falha descrita abaixo.

### Ciclo 75 — resposta obsoleta ao alternar busca/filtros da lista

**Achado registrado antes da correção:** o ERP associa cada carregamento à chave TanStack Query formada por filtros, página e tamanho. No mobile, uma alteração de busca/filtro inicia outra chamada assíncrona, mas `loadProducts` ainda aceita o resultado e o `finally` de qualquer chamada altera `loading`/`refreshing`. Se a solicitação mais antiga terminar depois da atual, ela pode substituir a lista/falha mais nova ou encerrar seu indicador de carregamento.

- [x] Conferido o ERP em `ProductList/hooks/data/useProducts.ts`: `useQuery` usa `queryKey: ['products', queryFilters, queryPage, itemsPerPage]`, separando snapshots por cada combinação e sem anexar um resultado atrasado à chave ativa.
- [x] Conferido o mobile em `useMobileProducts.ts`: busca com debounce e filtros reiniciam página e recriam `loadProducts`; a tela prioriza `loadError` sobre a lista, mas respostas/finalizações antigas escrevem estado sem identificar a solicitação vigente. `productListFormSchema` ainda é executado pelo `useZodForm` antes da consulta.
- [x] No erro genérico sem resultados, o ERP orienta “Não foi possível carregar os produtos.”; o mobile dizia “Não foi possível carregar as informações. Tente novamente.”. Ambos oferecem ação de retry; não foi encontrada particularidade documentada que justifique a diferença da mensagem.
- [x] `createMobileProductListRequestGuard` agora emite IDs monotônicos e identifica somente a chamada vigente. `useMobileProducts` ignora respostas/erros obsoletos e impede que o `finally` de chamada antiga altere loading/refreshing; troca de query, desativação da tela e unmount invalidam trabalho pendente. A solicitação remota não é cancelada.
- [x] Alinhada a mensagem genérica de falha ao ERP (“Não foi possível carregar os produtos.”); a exceção de busca ampla e o botão nativo de retry foram preservados.
- [x] Vitest focado: **25 testes mobile em 3 arquivos** (guard, filtros e busca/paginação do serviço) e **7 testes ERP** de estado/query, total de **32 aprovados**. `git diff --check` passou; nenhum teste executou escrita remota.
- [x] Exceção de feedback registrada: após falha num pull-to-refresh com dados do mesmo filtro, o ERP continua mostrando o último snapshot; o mobile apresenta erro e retry no lugar da lista. A tela móvel deixa explícita a falha da atualização, sem apresentar como recém-atualizados dados possivelmente antigos. Em falha de busca/filtro novo, ambos evitam apresentar resultados de outra chave.
- [ ] Não foi possível cobrir o hook com RTL no runner mobile: `@testing-library/react` e `react-test-renderer` não estão instalados nesse workspace; a tentativa de arquivo TSX falhou no carregamento do Vitest. A regressão testada cobre a guarda pura, mas não a integração React do hook.
- [ ] TypeScript mobile encerrou com código 2 e **73 diagnósticos globais**; nenhum diagnóstico em `useMobileProducts.ts` ou `mobileProductListRequest.ts`.
- [ ] Playwright autenticado, Expo Web/aparelho e leitura remota não foram executados; ciclos anteriores chegaram a `/login`. O comportamento de serviço não foi validado contra o banco e nenhuma guarda foi contornada.
- [ ] A skill `erp-web-to-mobile-replication` segue consultada somente na cópia de backup/cache `.vercel`; não foi encontrada fonte canônica atual nas pastas `.agents/skills` do projeto ou do usuário.

#### Próximo recorte identificado

- [ ] Auditar filtros por categoria, tipo padrão/serviço/composição e mesclados, incluindo estados vazios/sem resultados em produto simples, família e composição.

### Ciclo 76 — visibilidade de variações mescladas na lista

**Resultado da comparação:** o estado padrão e a alternância para mostrar registros mesclados seguem a mesma regra no ERP e no mobile. No modo oculto, as linhas mescladas saem da lista de filhos; o pai desaparece apenas quando todas as suas variações operacionais estão mescladas. Ao habilitar a opção, pai e linhas mescladas voltam. Não foi encontrada diferença funcional que justifique uma alteração neste recorte.

- [x] Conferidos os controles e o estado: `useProductsPageState` e `ProductsTopToolbar` alimentam `includeMergedVariations`; no app, `useMobileProducts` envia `showMergedProducts` como `includeMerged`, controlado pelo menu e pela folha de filtros. O padrão inicial é ocultar mesclados nos dois.
- [x] Conferidas as transformações: ERP filtra as variações mescladas de `allVariations` em `useProducts` e remove a linha filha mesclada e o pai totalmente mesclado; mobile usa `getMobileProductVariationRecords`, calcula `isParentMerged` com os registros operacionais completos e remove o pai totalmente mesclado. A regra de linhas `DEFAULT-*` obsoletas também corresponde a `mapDbVariations` no ERP.
- [x] Conferida a apresentação após filtrar: quando resta exatamente uma variação visível, os cards ERP e mobile derivam a representação de variação única da mesma lista filtrada; famílias com mais de uma linha restante continuam expansíveis. Em composição, `combo_items` segue separado e não é contado como variação, conforme os ciclos 70–71 e `estrutura-produto-variacao.md`.
- [x] Nenhuma alteração de código ou novo teste foi necessário: a comparação deste recorte foi estática, sem chamada ao banco ou escrita remota.
- [ ] Playwright autenticado e validação no runtime nativo não foram executados neste ciclo. Expo Web não comprova comportamento nativo. A skill `erp-web-to-mobile-replication` continua disponível apenas na cópia de cache/backup `.vercel`; não foi encontrada fonte canônica em `.agents/skills` do projeto/usuário. A limitação permanece registrada.

#### Próximo recorte identificado

- [ ] Auditar o filtro de tipo padrão/serviço/composição junto com categorias, inclusive composição simples, família com variações, lista vazia e busca sem resultados.

### Ciclo 77 — “Somente Produtos” sem permissão de composições

**Achado registrado antes da correção:** o ERP seleciona produtos, composições e registros legados sem `item_type` para **Somente Produtos**. O app preserva corretamente o bloqueio de composições quando `viewProductCompositions` está ausente, mas sua branch usa somente `item_type = product`; isso também exclui registros legados com tipo nulo, que o próprio mapper mobile classifica como produto (`item_type || 'product'`). A permissão deve continuar excluindo composições; o ajuste proposto limita-se a incluir produtos legados sem tipo.

- [x] Conferidos `ProductFilters.tsx`, `productFilterBuilder.ts` e `PRODUCT_LIST_PRODUCT_ITEM_TYPE_FILTER`: a opção **Somente Produtos** ERP inclui `product`, `composition` e `NULL` legado.
- [x] Conferidos Ciclos 29–30 e a implementação atual de `mobileProductFetchService`: com permissão, o app usa o predicado compartilhado; sem permissão, exclui composição por `IS DISTINCT FROM` e restringe o tipo com igualdade estrita a `product`.
- [x] O mapper mobile define `itemType: product.item_type || 'product'`; portanto, `NULL` é interpretado como produto. A exceção de permissão para composição não se aplica a esses registros.
- [x] Adicionada a constante compartilhável `PRODUCT_LIST_PRODUCT_AND_LEGACY_ITEM_TYPE_FILTER` (`item_type.eq.product,item_type.is.null`). A consulta mobile sem permissão ainda exige `item_type IS DISTINCT FROM composition`; **Somente Produtos** agora aceita o produto legado sem abrir composições.
- [x] O teste do serviço mobile confirma o predicado legado e mantém a exclusão de composições. Vitest focado: **18 testes aprovados** em `mobileProductFetchService.test.ts`; `git diff --check` passou.
- [ ] Playwright autenticado e consulta a registros reais não foram executados. Os testes exercitam apenas o contrato de query mockado; nenhuma leitura/escrita remota foi feita. Expo Web e runtime nativo seguem pendentes.
- [ ] A skill `erp-web-to-mobile-replication` continua disponível somente no cache/backup `.vercel`; não há cópia canônica localizada em `.agents/skills` do projeto ou do usuário.

#### Próximo recorte identificado

- [x] Ciclo 78 iniciou a auditoria da combinação de tipo e categoria e do estado vazio resultante.

### Ciclo 78 — combinação de tipo/categoria e lista sem resultados

**Achado registrado antes da alteração visual:** ERP oferece tipos gerais e categorias do sistema em opções do mesmo seletor; o usuário escolhe um eixo por vez. O app apresenta **Tipo geral** e **Categoria** como controles separados, e consulta cada um como restrição adicional. Isso permite filtros conjuntos mais estreitos no app sem retirar qualquer opção isolada disponível no ERP; manter a combinação é uma extensão mobile útil e específica da apresentação, agora registrada como exceção. Não foi encontrada diferença de predicado da categoria: os dois clientes reaproveitam `fetchProductListCategoryFilter` para categoria primária, nome legado e vínculos N:N.

- [x] Conferido no ERP `ProductFilters.tsx` e `productFilterBuilder.ts`: o campo único envia `Produtos`, `Serviços` ou o UUID de uma categoria; a opção Produtos usa o predicado compartilhado de tipo, e uma categoria usa o helper compartilhado.
- [x] Conferidos no app `ProductsHeaderFiltersSheet`, `useMobileProducts` e `mobileProductFetchService`: o modo padrão permite selecionar tipo geral e categoria em controles distintos; o query builder aplica o tipo e o mesmo helper de categoria como restrições da consulta. O módulo Composições fixa `item_type = composition` e continua aceitando categoria. As permissões de composição e os registros de tipo legado seguem as regras registradas nos Ciclos 29, 30, 32 e 77.
- [x] Documentada a extensão mobile: combinar categoria e tipo geral é uma capacidade adicional, não necessária para completar qualquer filtro isolado do ERP; será preservada sem alterar a hierarquia de simples, famílias e composições.
- [x] O estado vazio também foi comparado antes de editar: ERP informa “Nenhum item encontrado” e orienta ajustar filtros ou adicionar produto/serviço. Mobile mantém títulos contextuais de produto, composição e lixeira, mas não oferece orientação para rever filtros nos estados vazios de produto/composição. A especificidade de composição e lixeira é útil; a ausência da orientação de recuperação não tem exceção documentada.
- [x] `NativeProductsScreen.tsx` agora acrescenta orientação para ajustar filtros ou adicionar um produto/serviço/composição nos estados vazios correspondentes; a mensagem específica da lixeira permanece sem alteração.
- [x] `git diff --check` passou. Nenhum teste de lógica foi necessário para a mudança de texto/estilo. Playwright abriu a aplicação ERP local, mas `/products` foi redirecionado a `/login`; a listagem autenticada não pôde ser conferida. A inspeção somente de metadados do ambiente Vercel não encontrou conta geral de teste para Produtos; as entradas de operador disponíveis são específicas de NF-e e não foram usadas. Expo Web/aparelho e estado vazio mobile seguem sem validação visual; Expo Web não provaria comportamento nativo.
- [ ] Não há prova visual autenticada de espaçamento, contraste ou quebra de linha da orientação em tela móvel; a mudança é pequena e está limitada ao texto e estilos do estado vazio existente.

#### Próximo recorte identificado

- [x] O recorte seguinte foi concluído no Ciclo 79, descrito abaixo.

### Ciclo 79 — busca sem resultados e reset de página nos filtros

**Achado registrado antes da correção:** a busca usa o mesmo limite de três caracteres, debounce de 350 ms e normalizador de termos compartilhado no ERP e no app. As consultas de categoria/tipo e a apresentação sem resultados já foram comparadas nos Ciclos 77–78. O tamanho de página também é 15 nos dois clientes e ambos usam `FixedPageSlots`. Foi encontrada uma diferença na transição de filtros enquanto a lista está em uma página posterior: o ERP deriva a página efetiva como 1 no primeiro render com nova chave e tem teste que confirma que não solicita a página antiga; o hook mobile dispara `loadProducts(false, currentPage)` antes do efeito separado que redefine `currentPage`, podendo iniciar uma consulta redundante para a página anterior antes da guarda invalidar a resposta.

- [x] Conferidos `useProductsPageState.ts`, `useProducts.ts` e `useProductsQueryState.test.tsx`: busca abaixo de três caracteres limpa o termo aplicado após debounce; busca válida usa 350 ms; `queryPage` passa a 1 imediatamente quando a chave dos filtros muda. O teste ERP “starts filtered queries on page one without requesting the old page first” cobre página 3 → novo filtro.
- [x] Conferidos `mobileProductListFilters.ts`, `useMobileProducts.ts`, `mobileProductFetchService.ts` e `productListSearch.ts`: busca aplicada tem a mesma normalização/debounce; `buildProductSearchTerms` e os filtros compartilhados são reutilizados; consulta móvel usa `count: exact` e o mesmo intervalo de página. O estado sem resultados mostra a orientação adicionada no Ciclo 78.
- [x] `MobileProductPagination` usa `normalizePageNumber`/`FixedPageSlots` compartilhados. O tamanho padrão de 15 linhas coincide com o ERP. Categoria, tipo e busca reiniciam o estado para página 1, mas a ordem dos efeitos podia iniciar primeiro a chamada com o número antigo.
- [x] `useMobileProducts.ts` agora deriva a página efetiva como 1 assim que a chave dos filtros muda, antes de chamar a consulta; o estado visual também volta a 1 no mesmo efeito. A callback de carregamento não depende mais da página capturada, e os caminhos de atualização manual continuam passando a página atual. O guard contra respostas obsoletas foi preservado.
- [x] `resolveMobileProductListRequestPage` ganhou testes para transição de filtros na página 3 e para preservação de página quando a consulta não muda. Vitest focado: **4 testes aprovados** em `mobileProductListRequest.test.ts`; `git diff --check` passou.
- [ ] `npx tsc --noEmit -p tsconfig.json` encerrou com código 1 por diagnósticos globais do workspace, incluindo testes/e2e, componentes comuns, finanças, produtos IA, agenda e repositórios; a validação ampla não comprova compilação geral nem substitui uma integração RTL do hook.
- [ ] Playwright permanece no login (`http://localhost:5173/login`); não há conta geral de teste para Produtos nas variáveis de ambiente listadas, e credenciais exclusivas de NF-e não foram usadas. A interação autenticada de busca/paginação e Expo Web/aparelho não foram validados; a suíte cobre a função pura de resolução, não a integração React do hook. Nenhuma escrita remota foi feita.

#### Próximo recorte identificado

- [x] A auditoria de ordenação foi concluída no Ciclo 80, descrito abaixo.

### Ciclo 80 — ordenação da lista

**Resultado da comparação:** não há diferença funcional de ordenação para replicar no aplicativo. O ERP usa `created_at DESC` como ordem inicial; o app usa o mesmo padrão. Os controles com ícones de ordenação do ERP só aparecem na tabela XL, oculta nos layouts móveis, e o `handleSort` da página atual é um no-op. A ausência de um seletor de ordenação no app preserva o comportamento efetivamente disponível na lista responsiva do ERP.

- [x] Conferidos `ProductFilters.tsx` e `productQueryService.ts`: o filtro registra `createdAt`/`desc` como padrão; a query usa `created_at DESC` quando não há `sortBy`, com mapeamento de chaves `description`, `unitPrice`, `stock`, `code`, `createdAt` e `category` quando fornecidas.
- [x] Conferidos `ProductTable.tsx`, `ProductList/index.tsx` e `App/Products/Index.tsx`: a tabela com cabeçalhos ordenáveis está em `xl:block`; a versão por cards ocupa larguras menores. O callback `handleSort` conectado pela página atual não atualiza `filters` nem chama outra ordenação (`// Ordenação gerenciada internamente pela ProductList`). A query também não recebe nova chave ao tocar nos ícones.
- [x] Conferidos `NativeProductsScreen.tsx`, `ProductsHeaderFiltersSheet.tsx`, `useMobileProducts.ts` e `mobileProductFetchService.ts`: o app lista cards sem opção de ordenar e solicita `created_at DESC`. Isso coincide com a ordem padrão visível nos cards do ERP; não foi encontrada nota de particularidade mobile que exija outra classificação.
- [x] O serviço ERP aceita `sortBy` caso outro chamador o forneça, mas a página atual não expõe ordenação funcional no layout móvel. Não foi adicionada uma ação mobile sem equivalente funcional no ERP.
- [x] Nenhum código ou teste foi necessário; comparação estática, sem chamadas ao banco ou escrita remota. A rota `/products` segue protegida por `/login`, então não houve comparação visual autenticada; o comportamento nativo também não foi avaliado.

#### Próximo recorte identificado

- [ ] Retomar as pendências funcionais do inventário, começando pela cadeia de leitura/edição de preço e estoque no formulário de produtos simples e variações; manter bloqueadas as decisões que ainda aguardam definição do usuário.

### Ciclo 81 — diretório de fornecedores na aba Estoque e Precificação

**Achado registrado antes de alterar o aplicativo:** o ERP fornece o seletor de fornecedores por `subscribeToPeople('suppliers')`. A consulta inclui todos os registros não excluídos, aceita `person_type` singular/plural sem diferenciar caixa e não restringe `active`; portanto, fornecedores inativos continuam selecionáveis no cadastro do produto. O mobile usa `fetchActiveMobileProductSuppliers`, restringe a `active = true`, exige `deleted = false` e usa comparação exata de `person_type`. Isso exclui fornecedores inativos e linhas legadas com `deleted = NULL`, além de divergir para variantes de caixa em `person_type`. Não foi localizada particularidade mobile documentada que justifique o filtro mais restritivo. A mudança proposta alinha o diretório de opções ao contrato consultado pelo ERP, sem alterar validação de fornecedor, autorização, associação ou payload do produto.

**Achado adicional registrado antes da correção da consulta:** após carregar linhas, o ERP aplica `isTestPerson` e omite artefatos de teste; o serviço mobile não tinha o mesmo filtro. A busca mobile também passará a usar o predicado compartilhado, preservando essa exclusão ao incluir fornecedores inativos.

- [x] Conferidos o carregamento de `ProductInventoryTab`/`ProductSupplierField`, `subscribeToPeople`, `fetchAllPeopleRows`, `mapAndSortPeople` e `mapFromDB`: o ERP exclui soft-deletions (`deleted = false OR NULL`) e artefatos de teste, mas não filtra `active`; tipo é consultado com `ilike` para `supplier`/`suppliers`.
- [x] Conferido o serviço mobile e seu uso exclusivamente na busca do formulário de preço/estoque: a consulta filtra `active = true`, `deleted = false` e enumera tipos em minúsculas com `.in(...)`.
- [x] `mobileSupplierService.ts` agora reproduz filtros, correspondência sem distinção de caixa e ordenação estável do ERP, sem restringir `active`, aceitando `deleted = false OR NULL`; o seletor de `ProductFormPricesTab` usa `fetchMobileProductSuppliers`.
- [x] `isTestPerson` foi movido para `shared-utils/personTestVisibility.ts`, mantendo a regra original do ERP e fazendo ambos os diretórios reutilizarem o mesmo predicado. A consulta mobile inclui `address`/`observation` para detectar metadados de artefato; registros de teste continuam excluídos.
- [x] Vitest mobile `mobileSupplierService.test.ts`: **2 testes aprovados**, cobrindo fornecedor inativo/legado, filtros e ordenação, artefato de teste e a exceção do operador de teste. Vitest ERP `personDeduplication.test.ts`: **3 testes aprovados** após a extração compartilhada.
- [x] `git diff --check` passou; Git reportou apenas avisos de normalização CRLF/LF em arquivos já modificados no workspace.
- [ ] Não houve consulta nem gravação remota. Playwright autenticado, Expo Web e aparelho não foram executados; `/products` continua atrás de login nos ciclos anteriores. O comportamento da lista de sugestões autenticada e nativa permanece sem prova visual.
- [ ] A skill `erp-web-to-mobile-replication` não foi localizada nas pastas canônicas `.agents/skills`/`skills` do projeto nem nas pastas do usuário; o caminho de cache/back-up conhecido dos ciclos anteriores também não existe nesta execução. As regras de replicação ainda visíveis no histórico/inventário foram seguidas, e a limitação foi registrada.

#### Próximo recorte identificado

- [x] Ciclo 82 confirmou e corrigiu o recálculo do custo final ao reabrir produto simples/família; preço de venda próprio/herdado foi preservado no mapeamento. Persistência real e validação visual autenticada/nativa seguem pendentes.

### Ciclo 82 — reabertura da aba Estoque e Precificação: custo final derivado

**Achado registrado antes da correção:** o ERP recalcula `finalPurchasePrice` ao montar o formulário a partir de custo, IPI e frete. O mobile hidrata e exibe o valor salvo em `final_purchase_price` sem recomputá-lo até que o operador altere um desses campos ou selecione fornecedor. Se o total persistido estiver ausente ou desatualizado em relação às três entradas, a reabertura mostra valor incorreto enquanto o ERP apresenta o cálculo atual. O cálculo comum está em `shared-utils/productPurchasePricing.ts`; não há particularidade mobile documentada que justifique divergir.

- [x] Conferido o ERP: `useProductFormSync` recalcula o custo final ao montar e sempre que custo/IPI/frete mudam, usando `calculateProductFinalPurchasePrice`; o valor calculado também alimenta a sincronização do pai para os campos herdados da família.
- [x] Conferido o mobile: o carregamento completo inclui as colunas de preço/custo e variações, mas `ProductFormScreen` inicializa `finalPurchasePrice` diretamente do valor persistido. `ProductFormPricesTab` recalcula apenas em alteração de campo ou seleção de fornecedor. A aba apresenta o total inicializado e o payload posterior reaproveita esse estado.
- [x] Conferidos contrato do modelo e cálculos: produto simples deriva preço/custo da variação única; família mantém campos herdados ou próprios conforme flags existentes. A fórmula canônica de custo com IPI percentual e frete já é compartilhada; a correção deve recalcular o total do pai no snapshot de reabertura antes de sincronizar valores herdados, sem mudar flags ou payloads de preço de venda.
- [x] A correção de hidratação foi aplicada conforme os resultados documentados abaixo; nenhum dado remoto foi lido ou gravado.
- [ ] A reabertura autenticada via Playwright e o runtime nativo não foram validados; Expo Web não prova comportamento nativo. A skill canônica `erp-web-to-mobile-replication` não foi localizada em `.agents/skills`/`skills` do projeto/usuário nem na cópia de cache conhecida nesta execução; as regras do repositório e as orientações disponíveis do inventário continuam aplicadas.

#### Próximo recorte identificado

- [x] Depois da correção, o teste de reidratação da lista prova que campos herdados e próprios de preço promocional/venda e custo mantêm seus valores e flags; seguir auditoria de edição/reabertura do formulário de cada variação.
- [ ] Persistência real e validação visual autenticada/nativa seguem pendentes; `/products` permanece atrás de login nos ciclos anteriores.

**Correção aplicada e validação:** o mobile agora deriva o custo final ao hidratar tanto um produto existente quanto `initialData`/rascunho, usando o cálculo compartilhado e os valores camel/snake case de custo, IPI e frete. O total salvo deixa de prevalecer sobre suas entradas quando estiver desatualizado; não houve alteração de preço de venda, flags ou payload de persistência.

- [x] `mobile/src/features/products/domain/productPurchasePrice.ts` centraliza a adaptação de campos localizados/legados e chama `calculateProductFinalPurchasePrice` compartilhado. `ProductFormScreen` usa o helper nas duas rotas de inicialização antes de renderizar/sincronizar o snapshot; `ProductFormPricesTab` mantém o recálculo ao editar campos.
- [x] Adicionado teste Vitest de total obsoleto com frete percentual e de campos camel case/IPI fixo: **2 testes aprovados**. `mobileProductFetchService.test.ts` reforça reabertura de preço de venda/promo herdado e próprio e custo próprio por UUID. Mobile Vitest focado: **20 testes em 2 arquivos aprovados**.
- [x] ERP como referência: `productVariationMapper.test.ts`, **6 testes aprovados**, confirmou o mapper ERP. O teste focado adicional `useProductFormSync.test.tsx` teve **1 aprovado e 1 falha alheia ao recálculo**: o teste espera imagens vazias na variação, enquanto o estado atual herda a imagem do pai; nenhum arquivo ERP foi alterado neste ciclo.
- [x] `git diff --check` passou nos arquivos do recorte. TypeScript mobile integral permanece não zero por erros globais (incluindo inputs compartilhados e áreas Finance, IA e Agenda); nenhum diagnóstico listado no `ProductFormScreen.tsx` nem no novo helper/teste.
- [ ] Sem consulta ou gravação remota. Não houve Playwright autenticado, Expo Web ou aparelho; Expo Web tampouco comprova comportamento nativo. A skill canônica `erp-web-to-mobile-replication` não foi encontrada nesta execução, e essa limitação segue registrada.

#### Próximo recorte identificado

- [ ] Auditar leitura, reabertura, edição e persistência dos campos de custo e preço da própria variação (custo próprio/herdado, venda e promoção) no formulário filho, sem validar escrita remota enquanto ownership/autenticação não estiverem comprovados.

### Ciclo 83 — variação filha: preço herdado/próprio e preço promocional

**Achado registrado antes do teste de persistência:** a tela ERP e a aba mobile usam `syncUnitPrice` como alternância visual conjunta de preço de venda, desconto e promoção. Há também o campo de persistência separado `syncPromoPrice`. O ERP alterna/edita somente `syncUnitPrice`; na gravação, porém, `productPersistenceService` consulta `syncPromoPrice` separadamente. Assim, ao digitar preço promocional próprio com `syncPromoPrice` ainda herdado, o formulário ERP pode mostrar o valor digitado e a gravação substituir esse valor pela promoção do pai. O mobile já desliga as duas flags ao alternar para personalização ou editar venda/promo, e o serviço grava a promoção própria quando `syncPromoPrice` é falso. Preservar esse comportamento mobile evita descartar a entrada do operador; a diferença não tinha justificativa específica nos documentos anteriores e fica registrada aqui como exceção funcional de segurança de dados, sem alterar a UI existente.

- [x] Comparados a abertura e as telas: ERP usa `buildInitialVariationFormData`/`VariationPricingTab` e `useVariationPricing` no modal de filha; mobile restaura flags pelo UUID em `mobileProductFetchService` e edita o agregado de variações dentro do formulário pai em `ProductFormVariationsTab`. Ambos exibem/lockam o grupo pelo flag de preço herdado. O teste de leitura do Ciclo 82 já cobre uma filha herdada e outra com preço, promoção e custo próprios.
- [x] Comparadas submissão e persistência: ERP modal executa schema de variação via `useZodForm`; mobile submete o schema do formulário pai com RHF/Zod antes da mutação. Ambos mantêm os flags próprios/herdados no payload, mas a atualização do ERP não desliga `syncPromoPrice` junto com o grupo; mobile já o faz.
- [x] Custo próprio por variação permanece dado interno restaurado de `technical_specs.variationDetails` e persistido em `cost_price`; nenhuma das telas atuais apresenta campo de edição de custo da filha (o callback `updateCost` do modal ERP não é consumido pela aba de precificação). Não se deve inventar controle mobile ausente no ERP.
- [x] O teste Vitest do payload mobile demonstra que promoção própria continua independente do preço de venda herdado: o preço de venda segue em 100 com `use_parent_price=true`, a promoção própria segue em 65 com `use_parent_promo_price=false`, e o custo próprio segue em 40. A flag e os valores também permanecem no snapshot `variationDetails` da RPC mockada.
- [x] Vitest mobile focado: `mobileProductMutationService.test.ts` + `mobileProductFetchService.test.ts`: **42 testes aprovados**. ERP como referência: `useVariationPricing.test.tsx` + `productVariationMapper.test.ts`: **13 testes aprovados**. `git diff --check` passou.
- [x] Nenhuma alteração de comportamento no código de produção foi necessária neste recorte: o mobile já mantém independentes os valores e flags suportados pelo payload. Nenhum código ERP foi alterado e nenhum serviço remoto foi chamado.
- [ ] Não houve Playwright autenticado, Expo Web ou aparelho. Persistência remota/visual nativa e a skill canônica continuam sem prova/localização, como registrado nos ciclos anteriores.

#### Próximo recorte identificado

- [x] Auditar reabertura e edição repetida do preço promocional próprio, inclusive valor vazio/zero e promoção maior que o preço de venda: concluído no Ciclo 84. Os estados de edição/reabertura de preço e estoque foram cobertos nos Ciclos 85–95; o comportamento ERP de `finalPurchasePrice` após entrada foi preservado nos dois clientes, conforme Ciclo 154.

### Ciclo 84 — reabertura e edição repetida do preço promocional próprio

**Achado registrado antes da correção:** o Ciclo 22 documenta que `discountPercent` e `discountFixed` são auxiliares não persistentes e que o serviço mobile os remove dos novos `technical_specs.variationDetails`. Entretanto, `fetchMobileProductsPage` ainda espalha detalhes históricos sem filtrar esses campos. Se um snapshot legado de variação tiver valores auxiliares obsoletos/inválidos, eles chegam ao formulário e `ProductFormVariationsTab` os prefere aos descontos derivados de `price`/`promoPrice`; isso pode mostrar desconto inconsistente e, se inválido, bloquear o schema RHF/Zod apesar do preço promocional persistido ser válido. O ERP recalcula esses campos ao abrir a variação a partir do preço e da promoção. A existência de registros legados específicos não foi consultada remotamente; a falha de hidratação é demonstrada pelo caminho estático e pelo contrato histórico de gravação.

- [x] Reabertura de uma promoção própria válida: o mapper lê preço de venda e promoção da linha de variação quando as flags são próprias; a aba deriva os descontos dos valores efetivos. Promoção vazia/zero resulta em ausência de promoção nos dois clientes; promoção maior que venda permanece como entrada promocional, mas ambos deixam os descontos derivados vazios e não a exibem como desconto efetivo na listagem. Os valores `discountPercent`/`discountFixed` não devem substituir preço/promo canônicos.
- [x] Corrigida a hidratação em `mobileProductFetchService.ts`: remove `discountPercent` e `discountFixed` do snapshot de detalhes antes de mesclar os demais dados. Os preços persistidos seguem intactos; a aba deriva os descontos dos valores de venda/promo como o ERP.
- [x] Regressão em `mobileProductFetchService.test.ts`: fixture contém desconto percentual 150 e desconto fixo 2000, incompatíveis com preço 1425 e promoção 1200; o mapeamento mantém venda/promo próprios e não repassa os campos auxiliares históricos.
- [x] Vitest mobile: fetch, mutação, schema RHF/Zod e cálculo compartilhado — **90/90 testes**. ERP de referência (`variationFormDefaults` e `useVariationPricing`) — **14/14 testes**. `git diff --check` passou.
- [x] A comparação da promoção própria mostra o mesmo contrato no estado canônico: valor promocional menor gera descontos derivados; vazio/zero significa sem promoção; promo maior que a venda não gera desconto. Foi mantida a independência mobile de `syncUnitPrice` e `syncPromoPrice` documentada no Ciclo 83.
- [ ] Validar visual autenticado/Expo/aparelho e persistência remota conforme os gates; não houve consulta ou gravação remota neste ciclo. Expo Web não comprova comportamento nativo. A skill canônica `erp-web-to-mobile-replication` segue não localizada.

#### Próximo recorte identificado

- [x] Prosseguir para os estados de edição/reabertura de preço e estoque: recortes executados nos Ciclos 85–95. Permanecem separadas as pendências de validação autenticada/nativa; a semântica de `finalPurchasePrice` após entrada foi resolvida como preservação do comportamento ERP no Ciclo 154.

### Ciclo 85 — campos de custo na aba Estoque e Precificação

**Achado registrado antes da mudança:** o mobile exibia um card editável `Custo de Compra` com preço de custo, IPI, tipo/valor de frete e custo final. O ERP (`ProductInventoryTab`) não oferece esses controles: mostra origem/fornecedor, estoque mínimo e os campos de venda/desconto/preço promocional. A documentação do ERP diz que preço de custo não é requisito de ativação e é alimentado por compras ou saldo inicial. O inventário de formulários mobile descreve os controles e o Ciclo 18 alinhou os defaults do fornecedor/cálculo, porém não há justificativa registrada para a edição manual de custo ser exclusiva do app. O escopo autorizado é alinhar a interface mobile ao ERP, preservando os valores existentes e o payload do modelo.

- [x] Removidos da aba mobile o card de custo/IPI/frete e o handler que existia apenas para editar esses campos. A tela agora coincide com as seções do ERP para esse estado.
- [x] Preservados custo, IPI, frete, `finalPurchasePrice` e flags de sincronização no mapeamento, no formulário pai e no payload. A seleção de fornecedor ainda aplica defaults e recalcula o custo final pelo mesmo helper compartilhado do ERP; custos existentes continuam podendo chegar de compras/saldo inicial.
- [x] Vitest mobile: cálculo de custo, fornecedores, mínimo de estoque, descontos, fetch e mutação — **67 testes em 6 arquivos aprovados**. ERP `productVariationMapper.test.ts`: **6 testes aprovados**, incluindo leitura de custo e flags próprios/herdados. `git diff --check` passou.
- [ ] Não houve comparação UI por Playwright, aparelho/Expo Web ou consulta/gravação remota. A rota ERP segue protegida por autenticação; Expo Web não comprova comportamento nativo. A skill canônica `erp-web-to-mobile-replication` continua não localizada. A atualização de custo pelo fluxo de compras/saldo inicial não foi exercitada na UI neste ciclo.

#### Próximo recorte identificado

- [x] Ciclo 86 cobre as origens no cadastro rápido de fornecedor iniciado pela aba Produtos; filtro de compatibilidade concluído no Ciclo 87 e seleção visual/inicial da origem concluída no Ciclo 88. Permanecem estados assíncronos do seletor, estoque mínimo e custo trazido por compras/saldo inicial.

### Ciclo 86 — origens de estoque no cadastro rápido de fornecedor

**Achado:** na aba ERP, o cadastro rápido de fornecedor permite indicar os tipos de produto fornecidos (`Convencional`, `Salvados` e `Usados`). O formulário rápido aberto pela aba mobile de Produtos não apresentava nem persistia `stock_origins`; depois de salvar, o vínculo podia ser recusado para produtos `Salvados`/`Usados` porque o fornecedor ficava sem a origem correspondente.

- [x] O formulário de fornecedor aberto pela aba Produtos agora oferece as três origens com controles acessíveis. A alteração é opcional (`showStockOriginOptions`) e não expõe os controles nos demais pontos de cadastro de fornecedor mobile.
- [x] O schema de domínio para fornecedor valida os valores aceitos; o formulário existente executa `zodResolver` antes de chamar o serviço. A serialização grava `stock_origins` apenas quando o campo foi informado, preservando payloads e comportamento dos outros formulários.
- [x] O helper compartilhado alterna as origens e mapeia camelCase/`stock_origins`, preservando ausência e `null`. Arquivos centrais: `shared-utils/personStockOrigins.ts`, `shared-utils/personDomainValidation.ts`, `mobile/src/features/stock/suppliers/hooks/useSupplierForm.ts`, `mobile/src/features/stock/suppliers/modals/supplier-form/SupplierFormContent.tsx`, `mobile/src/services/stock/stockSuppliersService.ts` e `mobile/src/features/products/modals/tabs/ProductFormPricesTab.tsx`.
- [x] Vitest: **3/3 testes** cobrindo schema, alternância e mapeamento de payload. `git diff --check` passou. A checagem TypeScript integral continua com 42 diagnósticos globais; nenhum aponta para os arquivos alterados neste recorte.
- [ ] A interface autenticada não foi aberta via Playwright e não houve leitura/gravação remota. Expo Web ou teste unitário não comprova comportamento nativo nem persistência real. As telas de cadastro de fornecedor fora do recorte de Produtos permanecem sem seletor de origem.
- [ ] A skill canônica `erp-web-to-mobile-replication` continua não localizada nas pastas de skills atuais; as cópias em cache de build não foram tratadas como fonte canônica.

#### Próximo recorte identificado

- [x] Ciclo 87 alinhou a origem usada pelo filtro de fornecedores à regra canônica `productKind` do ERP; os estados de estoque mínimo e custo proveniente de compras/saldo inicial seguem pendentes.
- [ ] Validar interface autenticada e persistência somente quando os gates aplicáveis estiverem disponíveis. Expo Web não comprova comportamento nativo.

### Ciclo 87 — compatibilidade do fornecedor com a origem do produto

**Achado:** `ProductSupplierField` do ERP deriva a origem exigida somente de `productKind`. O mobile também aceitava `condition` como segunda condição (`productKind === 'salvado' || condition === 'salvado'`, idem para usado). Em registros/formulários com esses campos divergentes, o app podia oferecer ou recusar fornecedor diferente do ERP, apesar de `productKind` ser a chave canônica e o mapeamento mobile já hidratá-la a partir dos dados persistidos.

- [x] Criado `shared-utils/productSupplierStockOrigin.ts` com a conversão de `productKind` para `normal`/`salvados`/`usados` e o predicado de compatibilidade. ERP e mobile usam agora a mesma regra para sugestões e para impedir a inclusão de fornecedor incompatível.
- [x] A regra de ausência de configuração segue o ERP: `stockOrigins = null/undefined` equivale a `['normal']`; array vazio não é convertido em origem convencional.
- [x] Vitest mobile: **6 testes aprovados** para os três tipos, valor padrão e compatibilidade. `git diff --check` passou. TypeScript integral terminou com código 2 nos dois projetos (mobile: 23 diagnósticos; ERP: 429); nenhum diagnóstico aponta para `ProductFormPricesTab`, `ProductSupplierField` ou o helper compartilhado.
- [x] Os estados de carregamento/erro/vazio/busca sem resultados do seletor foram auditados e distinguidos no Ciclo 89. A validação visual autenticada/nativa e a persistência remota continuam pendentes.
- [x] O indicador visual e a escolha inicial na aba `ProductFormBasicTab` foram alinhados ao campo canônico `productKind` no Ciclo 88; a validação autenticada/nativa ainda está pendente.
- [ ] A skill canônica `erp-web-to-mobile-replication` não foi encontrada em `.agents/skills`/`skills` do projeto nem no perfil do usuário. A cópia acessível em cache de build foi consultada apenas como orientação, sem ser tratada como fonte canônica.

#### Próximo recorte identificado

- [x] Ciclo 88 alinhou o estado inicial e a seleção visual da origem no formulário mobile ao ERP. O Ciclo 89 cobriu os estados assíncronos do seletor de fornecedores; estoque mínimo e custo de compras/saldo inicial permanecem pendentes, uma parte por ciclo.
- [ ] Validar interface autenticada e persistência somente quando os gates aplicáveis estiverem disponíveis. Expo Web não comprova comportamento nativo.

### Ciclo 88 — estado inicial da origem do produto na aba básica — 24/10/2026

**Achado:** o ERP inicia produto novo sem `productKind` selecionado e apresenta a opção vazia “Selecione”; a validação de rascunho aceita esse estado, enquanto a finalização exige tipo válido. O mobile preenchia `productKind: 'normal'` ao abrir o formulário e o indicador visual de origem podia ser ativado por `condition`, mesmo quando divergente do campo canônico.

- [x] `ProductFormScreen` agora inicia produto novo com `productKind: undefined`; o usuário escolhe explicitamente `normal`, `salvado` ou `usado`. Produtos existentes continuam hidratados por seus dados persistidos.
- [x] `ProductFormBasicTab` seleciona o indicador apenas pelo `productKind` canônico compartilhado; `condition` divergente não marca uma segunda origem. O helper de fornecedores conserva o default convencional usado pela filtragem ERP.
- [x] Mantidos os schemas RHF/Zod de domínio existentes: rascunho pode permanecer sem tipo; o resolver de finalização impede concluir sem origem válida. A seleção de origem atualiza o formulário proprietário e não introduz submissão própria.
- [x] Vitest mobile: **12/12 testes** para mapeamento/seleção canônica; referências ERP: **15/15 testes**. `git diff --check` passou. TypeScript integral continuou com 23 diagnósticos mobile e 430 ERP; nenhum aponta para arquivos deste recorte.
- [ ] Playwright visual só alcançou `/login`. Não foram encontradas credenciais de autenticação ERP no ambiente Development da Vercel; não houve tentativa de contornar a guarda, consulta/gravação remota ou prova em renderer nativo. A tentativa de iniciar a pilha padrão `npm run dev` encontrou a porta 3000 ocupada por processos preexistentes; esses processos foram preservados. A sessão visível ficou no login.
- [ ] A skill canônica `erp-web-to-mobile-replication` continua ausente dos diretórios atuais; a cópia no cache de build foi consultada apenas como orientação. Expo Web e testes unitários não comprovam comportamento nativo.

### Ciclo 89 — estados assíncronos do seletor de fornecedores — 24/10/2026

**Achado pré-registrado antes da alteração:** o ERP recebe fornecedores via `subscribeToPeople`; o campo mostra sugestões quando há resultados e não apresenta mensagens próprias de espera, falha ou lista vazia. O mobile carregava a lista de forma assíncrona, começava com `suppliers = []` e convertia falhas do Supabase em lista vazia; por isso a aba podia informar “Nenhum fornecedor cadastrado” antes de terminar a consulta ou depois de uma falha.

- [x] `mobileSupplierService` agora expõe o resultado de leitura com sucesso/falha sem remover o wrapper de array já existente. Consulta Supabase limitada a 10 segundos com `withTimeout`; timeout, resposta de erro e exceção retornam falha recuperável, sem gravar dados.
- [x] `ProductFormPricesTab` diferencia carregamento, falha com ação “Tentar novamente”, resposta válida sem fornecedores e busca sem resultados. A opção “Novo” continua disponível quando aplicável; um cadastro rápido bem-sucedido recupera o estado vazio/erro e atualiza as opções.
- [x] Busca e seleção continuam locais; a escolha do fornecedor atualiza o `ProductFormScreen`, formulário proprietário RHF/Zod. Retry só recarrega opções, não submete formulário nem altera produto.
- [x] Vitest focado `mobileSupplierService.test.ts`: **4/4 testes**, incluindo lista vazia válida versus falha e timeout de 10s. `git diff --check` passou. TypeScript integral mobile continua não zero por **11 erros globais** em arquivos/áreas não alterados neste recorte; nenhum diagnóstico nos arquivos de Produto/serviço alterados.
- [ ] UI mobile não foi validada em renderer nativo; Playwright ERP autenticado continua no `/login` pela ausência de credenciais ERP disponíveis no ambiente Development. Não houve consulta/gravação remota de produtos. A cópia da skill de replicação no cache segue apenas como orientação, não fonte canônica.

### Ciclo 90 — valor inicial do estoque mínimo — 24/10/2026

**Achado pré-registrado antes da correção:** ERP `getInitialProductFormData()` define `minStock: 0`, exibido como valor no campo de produto novo. O mobile definia `minStock: ''`, que aparecia como placeholder `0`. Ambos escondem o campo para produtos com variações, usam `parseProductMinimumStockInput`, rejeitam negativos pelo schema e convertem vazio para zero no payload. A diferença era somente o primeiro valor visual do cadastro simples; nenhuma particularidade mobile documentava essa exceção.

- [x] O default de produto novo em `ProductFormScreen` agora é `minStock: 0`, como no ERP. A hidratação de produto existente permanece inalterada, então `null`/ausência persistidos continuam em branco e valores fracionários legados continuam visíveis até edição.
- [x] Schema RHF/Zod, parser compartilhado, bloqueio de negativos, conversão de edição e mapper de payload não foram alterados. A tela continua escondendo o campo para produtos com variações, igual ao ERP.
- [x] Vitest mobile: **53/53 testes** em três arquivos (parser, schema do formulário, payload da mutação); referência ERP: **3/3 testes** de dados iniciais. `git diff --check` passou. TypeScript integral mobile segue com **11 erros globais** fora dos arquivos tocados, sem diagnósticos no recorte.
- [ ] Não houve comparação visual autenticada/nativa. Playwright ERP permanece bloqueado pela tela `/login` sem credenciais ERP no ambiente Development; sem acesso a renderer nativo. Não houve consulta/gravação remota. Skill canônica `erp-web-to-mobile-replication` ausente; apenas cópia em cache foi consultada como orientação.

#### Próximo recorte identificado

- [ ] Auditar o fluxo de custo recebido por compras/saldo inicial, uma parte por ciclo.
- [ ] Validar os estados do formulário em tela autenticada e renderer nativo quando o ambiente/gates estiverem disponíveis.
- [ ] Validar esta seleção de origem na interface autenticada e em dispositivo/renderer nativo quando os gates e ambiente estiverem disponíveis.

### Ciclo 91 — custo de aquisição no cadastro simples pela NF-e — 24/10/2026

**Achado:** o cadastro rápido do ERP para item da NF-e inicia `costPrice` com `itemCostWithAdditionalCosts`, permite revisar o custo de aquisição e exige valor não negativo ao confirmar. O mobile calculava valor inicial equivalente para os custos válidos da nota (`landedUnitCost`) e já o enviava no formulário, mas a aba Estoque e Precificação não mostrava o campo após a remoção do card geral no Ciclo 85. Assim, o operador não conseguia corrigir um custo divergente antes de salvar o produto simples. A diferença entre os cálculos permanece somente para `unitCost` negativo, entrada inválida rejeitada pelo schema do ERP.

- [x] O formulário mobile iniciado por **Cadastrar produto novo** na NF-e agora exibe **Custo de aquisição da NF-e** em Estoque e Precificação, pré-preenchido com o cálculo já existente; o operador pode revisar o valor antes de salvar. A opção não aparece no cadastro normal nem no caminho de nova variação em produto-pai existente.
- [x] A validação continua no proprietário `ProductFormScreen`, via `useZodForm` com `zodResolver` e schema de domínio explícito. Custo vazio impede a finalização, rascunho pode permanecer incompleto, zero é aceito e negativo mostra a mensagem do ERP. O erro navega até a aba e realça o campo.
- [x] A edição atualiza `costPrice` e mantém `finalPurchasePrice` coerente usando o helper existente; o serviço de produto conserva o mapeamento `cost_price` já coberto por teste. Cadastro mantém saldo zero e o vínculo da nota segue no fluxo existente; não foi feito movimento de estoque nem alteração do XML.
- [x] Vitest focado: **76/76 testes** em schema, navegação do erro e mutação de produto; `git diff --check` passou. TypeScript integral mobile terminou com 23 diagnósticos globais, nenhum nos arquivos deste recorte.
- [ ] Playwright não abriu navegador visível porque o wrapper local depende de WSL e este Windows não tem distribuição instalada. UI autenticada, renderer nativo e persistência remota seguem sem prova; nenhum dado remoto foi lido ou gravado. A skill canônica `erp-web-to-mobile-replication` continua ausente dos diretórios de skills atuais; a cópia em cache foi consultada apenas como orientação.

#### Próximo recorte identificado

- [x] Auditado e corrigido no Ciclo 92: a variação nova vinculada ao produto-pai recebe o custo próprio calculado da NF-e, sem alterar o pai; ver evidências abaixo.
- [ ] Em ciclo posterior, rastrear custo de produto proveniente de saldo inicial; não foi alterado neste recorte.
- [ ] Validar a operação em UI autenticada e runtime nativo quando os ambientes estiverem acessíveis.

### Ciclo 92 — custo da NF-e na variação de produto-pai existente — 24/10/2026

**Achado:** no estado ERP **Nova variação de produto existente**, o formulário não oferece um campo editável de custo; o fluxo usa o custo final do item da nota e grava esse valor como custo próprio da nova variação (`syncCostPrice = false`), sem alterar o produto-pai. No mobile, o cadastro rápido abria `ProductFormScreen` sobre o pai, descartava os defaults da NF-e e a nova linha iniciava com `costPrice` do pai e `syncCostPrice = true`. Como `saveQuickRegisteredProduct` vincula a última variação acrescentada, o custo do item não chegava à variação ligada.

- [x] Conferidos ERP, código compartilhado e mobile. O ERP calcula o custo pelo item da NF-e (`itemCostWithAdditionalCosts`), prepara a variação e desliga a herança antes de `saveVariation`; o mapper de persistência usa o custo da variação quando essa flag está desligada. No mobile, `landedUnitCost` aplica a mesma conta para os campos de entrada válidos pelos schemas da NF-e.
- [x] `withOwnInboundVariationCost`, em `shared-utils/inboundQuickRegisterRules.ts`, centraliza a atribuição do custo próprio e é usado pelo ERP e pelo formulário mobile. O modal mobile passa o custo da linha selecionada ao pai; antes do resolver RHF/Zod, `ProductFormScreen` atribui o valor somente à última variação nova que será vinculada, mantendo as variações existentes e o custo do pai.
- [x] A tela não ganhou campo de custo neste modo, pois o estado correspondente do ERP também não permite editá-lo. O valor passa pelo schema explícito das variações antes da mutação e mantém o payload `cost_price`/`syncCostPrice` já suportado; nenhuma movimentação de estoque ou alteração no XML é criada.
- [x] Vitest focado: **64/64 testes** em dois arquivos — cadastro rápido ERP (40) e mutação mobile (24). O teste ERP confirma `costPrice` do item e `syncCostPrice: false`; o teste mobile existente cobre a serialização do custo próprio. `git diff --check` passou. TypeScript integral terminou com 426 diagnósticos ERP e 23 mobile, todos fora dos arquivos deste recorte.
- [ ] Playwright visível não foi repetido: o wrapper já havia falhado neste Windows por depender de WSL sem distribuição instalada. UI autenticada, runtime nativo e persistência remota permanecem sem prova; nenhuma leitura ou gravação remota foi feita. A skill canônica `erp-web-to-mobile-replication` não foi encontrada fora do cache Vercel; a cópia em cache foi consultada somente como orientação.
- [x] Particularidade preservada: o app abre o formulário completo do pai e ainda permite acrescentar mais de uma variação; o vínculo da NF continua apontando para a última. Só essa variação recebe o custo do item, para que o restante da família não herde indevidamente o custo de uma única linha da nota.

#### Próximo recorte identificado

- [x] Ciclo 93 auditou o caminho de custo da entrada vinculada a pedido de compra; o estado de saldo inicial permanece em ciclo separado.
- [ ] Validar o estado em UI autenticada e runtime nativo quando o ambiente e os gates estiverem disponíveis.

### Ciclo 93 — custo da entrada de compra e saldo inicial — 24/10/2026

**Recorte:** uma etapa do estado de Estoque/Compras — como uma entrada vinculada à compra atualiza o custo próprio de produto/variação, e se o formulário mobile oferece essa operação.

#### Evidência da comparação

- [x] ERP: `erp/src/pages/App/Stock/Purchases/modals/PurchaseStockEntryModal.tsx` valida com `purchaseInventoryEntryFormSchema` via `useZodForm`, envia uma movimentação `entry` por item com `unitCost`, `relatedEntityId` e `relatedEntityType: 'purchase_order'`, e marca `stockProcessed` somente depois de confirmar os movimentos. A tela `StockScreen.tsx` monta essa modal a partir do estado de rota `location.state?.purchaseForStockEntry`.
- [x] Serviço ERP: `saveInventoryMove` confirma a linha persistida e chama `recalculateProductStockOnMove`. Para uma entrada de variação, a função atualiza o estoque e calcula média ponderada no `costPrice` próprio da variação; depois calcula `costPrice` médio do pai com os saldos/custos das variações. Para produto sem variações, atualiza saldo e média ponderada do custo do produto.
- [x] Limite do efeito ERP: `recalculateProductStockOnMove` atualiza `stock`, `costPrice` e, quando há variações, `variations`; não envia `finalPurchasePrice` ao `updateProduct`. Portanto, a entrada de compra observada não recalcula `final_purchase_price`. Não foi inferida regra para alterar esse campo fora do contrato existente.
- [x] A modal de entrada existe no ERP e é montada pela tela de Estoque, mas a busca de referências por `purchaseForStockEntry` localizou somente a leitura e montagem no `StockScreen`; nenhum chamador atual no repositório foi encontrado para fornecer esse estado de rota. O código consultado não comprova um caminho de usuário alcançável para a modal.
- [x] Mobile: o detalhe do pedido só exibe “Processado/Não processado” e oferece ações de status, edição e cancelamento. `PurchasesScreen` altera `status` ou chama `cancelMobilePurchase`; `mobilePurchaseService` não contém fluxo de criação/confirmação de movimentações de compra. Não foi encontrada ação mobile equivalente para gravar entrada, atualizar custo de produto/variação e concluir `stockProcessed`.
- [x] A comparação cobre somente a etapa de entrada vinculada à compra. O fluxo de saldo inicial e o finalizador de inventário continuam em recortes próprios; a documentação de inventário offline registra contrato compartilhado para finalização entre ERP e app, mas não prova atualização de custo pelo saldo contado.

#### Resultado e pendências

- [x] A decisão sobre “Registrar entrada no estoque” foi resolvida pela regra vigente do usuário: não criar uma ação mobile sem equivalente acessível no ERP. `PurchaseStockEntryModal` permanece sem chamador para a rota `purchaseForStockEntry`, e a documentação atual separa pedido planejado de recebimento que efetiva estoque. A movimentação deve ocorrer no recebimento confirmado, não no pedido de compra.
- [x] O ERP tem uma ação acessível distinta, “Conferir Pedido”, que salva quantidades conferidas e dados da NF, mas termina instruindo o usuário a registrar um recebimento em Recebimentos de Mercadorias. Isso não é o lançamento de estoque da modal inatingível. A ausência dessa ação de conferência no detalhe mobile é um achado adjacente do módulo Estoque/Compras, fora do escopo atual de paridade do módulo Produtos; foi deixado no roadmap para um ciclo próprio.
- [x] Semântica após entrada foi conferida novamente no Ciclo 154. O ERP atualiza `stock`/`costPrice` e preserva o valor persistido de `finalPurchasePrice`; `docs/negocio/recebimentos/recebimento-de-compras.md` e `docs/negocio/estoque/movimentacoes-e-custo.md` definem CMPM, mas não adicionam efeito em `finalPurchasePrice`. Ao abrir o formulário, ERP e mobile recalculam visualmente com a mesma função compartilhada. Pela instrução permanente do usuário, manter o comportamento ERP até existir contrato de domínio; sem mudança de código.
- [x] Ciclo 94 conferiu a aba de Estoque e Precificação do formulário para quantidade inicial. O inventário físico/finalizador RPC segue em estado separado; o atalho mobile “Lançar Estoque” do menu de Produto/variação foi retirado no Ciclo 101 após comprovar que não existe como ação visível no ERP.
- [ ] Validação de UI autenticada e renderer nativo continua pendente; não houve consulta/gravação remota. A skill canônica `erp-web-to-mobile-replication` não foi localizada fora da cópia em cache de build, consultada apenas como orientação.

### Ciclo 94 — quantidade inicial no formulário de Produto — 24/10/2026

**Recorte:** aba Estoque e Precificação na criação/edição de produto simples e família com variações; identificar se o formulário permite definir quantidade/custo inicial.

#### Evidência da comparação

- [x] ERP: `getInitialProductFormData()` inicia o produto com `stock: 0`, custo e custo final zero, e `launchInitialStock: false`. A aba ativa `ProductInventoryTab` exibe fornecedor, estoque mínimo e campos de preço; não há campo de estoque atual nem uma lista de entradas iniciais. `InitialStockList.tsx` permanece no projeto, mas não tem call site no formulário ativo.
- [x] Mobile: a tela usa `stock: ''` como estado interno do pai novo, sem controle de estoque no formulário. O default da variação operacional única, da nova variação e das variações em lote é `stock: 0`, como no ERP. Para produto existente, `stock`/`initialStock` são hidratados para a tela, mas não aparecem como campo editável. O payload da RPC mobile omite `stock` e `initial_stock` do produto raiz e também não inclui `stock` nos objetos `p_variations`; o ERP `mapToDB` inclui `stock` raiz quando definido, e `productPersistenceService` inclui estoque ao gravar variações.
- [x] O mobile remove `launchInitialStock`, `initialStock`, `initialCost` e `initialStockEntries` de `variationDetails`. O mapper ERP também remove esses campos ao montar o snapshot das variações; a tela do produto não oferece o lançamento inicial em nenhum dos clientes.
- [x] A interface comparada não tem divergência funcional suportada que peça um campo de quantidade/custo inicial no app. A operação de quantidade fica no módulo Estoque; o custo inicial de cadastro simples pela NF-e foi tratado no Ciclo 91. Nenhum novo caminho foi criado a partir de um componente legado sem uso.
- [x] Persistência do formulário mobile confirmada no Ciclo 104 por leitura somente da definição ativa da RPC `public.save_mobile_product_transaction` no projeto remoto operacional existente: criação grava `stock`/`initial_stock` do produto pai como zero e `stock` de variação nova como zero; edição do pai não atualiza `stock`/`initial_stock`, e edição de variação lê o saldo existente sob lock e grava o mesmo valor. Portanto, omitir esses campos do payload mobile não apaga o saldo atual. A função não está versionada em `supabase/migrations`; nenhum dado de negócio foi consultado e nenhuma gravação/operação foi feita. A consistência da projeção e do CMPM depois de movimentos continua coberta pela pendência separada do Ciclo 95.

#### Resultado e próximo recorte

- [x] A comparação de UI não encontrou entrada de saldo inicial no formulário de Produtos; as variações novas iniciam com quantidade zero nos dois clientes, e o produto pai ERP começa com zero. O estado interno mobile do pai não é campo editável nem enviado no payload. Nenhum código foi alterado.
- [x] Próximo estado: finalização da contagem física em ERP e mobile, registrada no Ciclo 95. Payload e validação de UUID correspondem; a preservação do saldo pelo salvamento de Produto foi confirmada no Ciclo 104, mas o efeito de saldo/CMPM da RPC de inventário continua pendente.
- [ ] Validação visual autenticada e em renderer nativo continua pendente. Nenhuma consulta ou gravação remota foi feita neste ciclo. A skill canônica `erp-web-to-mobile-replication` permanece ausente; a cópia em cache de build foi usada somente como orientação.

### Ciclo 95 — finalização da contagem física — 24/10/2026

**Recorte:** uma etapa do estado de Revisão/Finalização do inventário físico — contrato enviado ao backend, confirmação, retentativa e limites de espera.

**Divergência pré-registrada antes da correção:** o hook ERP limita o commit a 30 s e a consulta de retomada a 5 s; o finalizador mobile aguardava diretamente `supabase.rpc` tanto no envio inicial quanto no sincronismo da outbox. Uma resposta que nunca termina podia manter a finalização móvel sem feedback nem liberar o estado de salvamento.

#### Evidência da comparação

- [x] ERP e mobile validam a conclusão com `inventoryAuditCompletionSchema` compartilhado, enviado pelo `useZodForm`; ambos exigem pelo menos um item contado, incluem cada item contado uma vez e exigem identidade de variação para cada ajuste antes de chamar o serviço.
- [x] Os dois clientes selecionam `finalize_inventory_transaction` ou `finalize_inventory_transaction_v2` pela versão congelada da submissão e enviam os mesmos parâmetros: `p_audit_id`, `p_code`, `p_observation`, `p_items` e `p_responsible_name`. No v1, enviam os itens contados divergentes; no v2, todos os itens contados com `countedAt`. Os itens levam o UUID do produto e da variação, quantidade física e saldo reconciliado anterior. Não é enviado custo.
- [x] A diferença offline do mobile é adaptação documentada: grava rascunho e submissão congelada no SQLite/outbox e sincroniza quando conectado; o ERP usa IndexedDB e envolve a chamada interativa com timeout e consulta da outbox. A falha/timeout mantém os dados locais e o mesmo `auditId` para retomada.
- [x] O mobile agora limita a espera da RPC direta e do retry da outbox a **30 s** via `shared-utils/withTimeout`. Timeout registra falha, marca o rascunho pendente, preserva a submissão imutável e informa que a confirmação está pendente; o cliente não interpreta o timeout como sucesso nem cria outra identidade para o retry, mantendo o mesmo `auditId`.
- [x] A página 21 do guia agora explica como retomar quando a confirmação ficar pendente. `docs/estoque/guia-pratico/gerar_guia.py` gerou novamente 24 páginas/22 imagens e atualizou os dois PDFs; os SHA-256 conferem e a página 21 foi renderizada/revisada, sem corte ou sobreposição. O link de acesso no submenu Estoque permanece no mesmo caminho.
- [x] Vitest focado, via `npm run test:unit:mobile --prefix erp -- src/features/stock/inventory/services/inventoryFinalizer.test.ts`: **6/6 testes aprovados**, incluindo timeout do envio e do retry com retenção do rascunho. `git diff --check` passou.
- [ ] `tsc --noEmit -p mobile/tsconfig.json` continua não zero por **11 diagnósticos globais**; nenhum aponta para os arquivos alterados deste ciclo. Dois erros já existentes na área próxima do inventário estão em `useInventoryAuditWorkflow.ts` e `useInventoryPersistenceQueue.ts` (tipos do resultado Zod); os demais são em formulários/serviços fora do recorte.
- [ ] Limitação de fonte: a busca literal nas migrations locais não encontrou definições de `finalize_inventory_transaction` nem `finalize_inventory_transaction_v2`; só há chamadas de cliente e testes/simulações. `docs/negocio/estoque/contrato-indice-inventario-offline.md` afirma que a v2 está em migration versionada. A divergência documental impede comprovar aqui o efeito real no saldo e no CMPM. Nenhuma consulta remota ou execução de teste SQL/CJS foi feita.

#### Resultado e pendências

- [x] Corrigida a espera sem limite na finalização e no sincronismo da outbox mobile; o contrato de payload/UUID e o fluxo offline existentes foram preservados. Não houve gravação em `inventory_moves` pela UI nem novo efeito de estoque.
- [ ] UI autenticada e runtime nativo não foram validados. O diálogo afetado é `Alert` do React Native; Playwright/Expo Web não comprova sua apresentação nativa. Nenhuma operação remota foi executada.
- [ ] Próximo estado a comparar: responsável do inventário. O ERP permite selecionar um colaborador no escopo e guarda seu nome; a tela mobile define `responsibleId` como o perfil atual e não tem seleção equivalente. Confirmar o contrato de responsável antes de alterar essa aba.
- [x] Ciclo 101 retirou o caminho mobile manual “Lançar Estoque” do menu Produto/variação; permanece pendente apenas a prova do efeito da RPC em saldo/CMPM descrita no Ciclo 95.
- [ ] Validar o efeito de saldo/CMPM quando a fonte da RPC local/remota estiver disponível sob os gates; a cópia da skill `erp-web-to-mobile-replication` continua localizada apenas no cache de build e foi usada como orientação, não como fonte canônica.

### Ciclo 96 — responsável e identificação do colaborador no inventário — 24/10/2026

**Recorte:** apenas seleção, persistência offline e envio da identidade do responsável pelo inventário.

**Divergência pré-registrada antes da correção:** o ERP seleciona um registro elegível de `people` (`person_type='employees'` ou posição preenchida) e grava seu ID/nome no escopo e na observação final. O mobile não oferece essa seleção, atribui `responsibleId` ao ID do perfil autenticado e monta `responsibleName` pelo nome do usuário atual. A sincronização atual do catálogo offline contém apenas fornecedores, portanto não oferece responsáveis após reinício/offline.

#### Evidências da comparação

- [x] ERP carrega `employees` por `fetchPersons('employees')`; a consulta filtra colaboradores não excluídos por tipo ou posição. O sincronizador ERP `syncMissingEmployeesFromProfiles()` pode criar/atualizar registros em `people` usando e-mail de `profiles`; um `people.id` continua sendo distinto do ID de perfil. Mobile não usa esse helper com efeitos colaterais: a nova consulta é somente leitura, usa o filtro de elegibilidade do ERP e seleciona somente identificação, nome, cargo/função, papel e estado, sem contato/endereço.
- [x] A elegibilidade e a apresentação do nome foram extraídas para `shared-utils/inventoryResponsible.ts` e reutilizadas pelo ERP e app. No mobile, o perfil autenticado só vira default se seu ID corresponder a um colaborador elegível da lista. Não se inferiu associação por e-mail nem se substituiu o ID do ator autenticado pelo ID da pessoa selecionada.
- [x] O escopo mobile agora oferece busca por duas ou mais letras, seleção/limpeza e nome selecionado. `mobileInventoryAuditScopeSchema` exige colaborador e nome antes da montagem/carregamento do escopo; ausência de seleção bloqueia o serviço e exibe erro. A lista mínima é cacheada no índice offline, mantendo o último mapa se a consulta exceder 15 s.
- [x] Identidade selecionada percorre `ScopeConfiguration`, rascunho SQLite e submissão final. Migração SQLite v4 adiciona `responsible_name` sem apagar rascunhos anteriores; restauração local/remota mantém nome quando disponível e legados ainda usam o fallback de perfil. O finalizador grava o colaborador selecionado na observação e `p_responsible_name`, mantendo `userId` como ator autenticado.
- [x] A comparação encontrou uma lacuna no estado sem cache: o serviço limitava nova tentativa por cinco minutos e a mensagem da lista não oferecia ação. A tela agora expõe “Tentar sincronizar lista”; a ação limpa somente o cache em memória/intervalo de tentativa, relê o SQLite e sincroniza novamente. O indicador geral de sincronização vem do resultado pós-sincronização, evitando mostrar um timestamp anterior.
- [x] O contrato de inventário offline e o guia do estoque foram atualizados para cobrir mapa de colaboradores, nome persistido, busca e repetição da sincronização. Os dois PDFs foram regenerados com 24 páginas e SHA-256 idêntico; a página **19** (“Defina o que será contado”) foi renderizada e revisada. O fluxo de acesso pelo submenu e os caminhos dos dois PDFs permanecem os mesmos.
- [ ] `duplicateInventorySession()` ainda inicializa uma nova contagem copiada diretamente na operação com ID do perfil atual e sem nome de colaborador; o ERP abre a cópia no escopo e requer seleção. Tratar esse caminho de duplicação em estado/ciclo próprio antes de declarar paridade completa.

#### Correções e validação

- [x] Vitest mobile: **22/22 testes em 6 arquivos**, incluindo cache de colaboradores, filtro de elegibilidade, repetição manual da sincronização, seleção/estado sem sincronização, esquema, payload final, restauração SQLite e migração v4. Vitest ERP para `InventoryScopeModal`: **20/20**.
- [x] `git diff --check` passou (somente avisos de normalização CRLF em arquivos previamente modificados). `tsc --noEmit -p mobile/tsconfig.json` permanece não zero por **11 diagnósticos globais**; os dois diagnósticos na área de inventário são os erros preexistentes de `physicalCount` opcional após parsing Zod em `useInventoryAuditWorkflow.ts` e `useInventoryPersistenceQueue.ts`, sem erro novo na UI do escopo, seletor, catálogo, schema, responsável compartilhado ou SQLite. O ERP compilou o modal/selector no Vitest; não foi feita compilação integral.
- [ ] Limitação de fonte: nenhum acesso remoto foi usado para validar a projeção PostgREST `address->>role`/`address->roles`, RLS e formato real das linhas de `people`. Nenhum dado de negócio foi consultado ou gravado remotamente.
- [ ] UI autenticada e renderer/aparelho React Native não foram validados. O teste visual estático do seletor e Expo Web não comprovam comportamento nativo. A skill `erp-web-to-mobile-replication` continua disponível somente em uma cópia de cache de build, usada como orientação e não como fonte canônica.

#### Resultado e próximo recorte

- [x] Corrigido o início normal do inventário: app e ERP selecionam um `people.id` elegível, persistem ID/nome e mantêm identidade do ator separada. A sincronização mobile é read-only e preserva funcionamento por índice offline; a lista sem cache agora permite repetição explícita.
- [x] A duplicação/cópia de inventário e sua escolha de responsável foram corrigidas e validadas no Ciclo 97. A ação “Lançar Estoque” do menu de Produto/variação foi retirada no Ciclo 101; permanece a limitação de prova do efeito RPC em saldo/CMPM descrita no Ciclo 95.

### Ciclo 97 — escopo e responsável ao duplicar inventário — 24/10/2026

**Recorte:** somente o estado de configuração antes de iniciar uma nova contagem criada pela ação Duplicar.

**Divergência pré-registrada antes da correção:** ERP abre a duplicação na configuração do escopo, preserva as identidades dos itens copiados, atualiza os dados pelo catálogo disponível e exige seleção de responsável antes de iniciar. O mobile converte imediatamente o snapshot antigo em rascunho local, reutiliza o perfil autenticado como `responsibleId` e entra direto na operação, sem a etapa de escolha.

#### Evidência da comparação

- [x] ERP: `InventoryAuditModal` passa `copiedItems` ao `InventoryScopeModal`. A modal valida produtos não removidos, variações com UUID ainda presentes e identidades de origem sem repetição; uma origem legada sem UUID expande as variações não mescladas atuais. O ramo defensivo do builder para produto sem variações não é um formato operacional suportado: a regra vigente exige pelo menos uma linha em `product_variations` para todo produto. A seleção copia nomes, estoque e vínculos do catálogo ativo, abre automaticamente a seleção personalizada e ainda exige um colaborador elegível no formulário RHF/Zod.
- [x] Mobile antes da correção: `useInventoryAuditWorkflow` chamava `duplicateInventorySession()` assim que recebia `copiedItems`, reutilizava nome/saldo históricos, limpava somente `physicalCount`, atribuia `responsibleId` ao perfil de autenticação e entrava na contagem sem abrir o seletor de responsável.
- [x] Mobile após a correção: duplicar passa pela tela de escopo. Ela consulta o índice de catálogo offline já usado pelo inventário, resolve IDs de produto/variação contra os registros operacionais disponíveis e pré-seleciona esses itens no escopo personalizado. Variação removida/ausente, produto indisponível, fonte vazia e identidade duplicada apresentam erro e impedem iniciar. Sem UUID, a cópia expande as variações atuais; para produto simples que tem uma variação atual, usa essa linha e seu saldo.
- [x] Os dados escolhidos vêm do índice disponível naquele dispositivo: nomes, saldo de referência, SKU, código, etiqueta e fornecedor são reconstruídos da linha atual, sem reaproveitar quantidade contada, horário, etiqueta escaneada ou outros valores do snapshot antigo. O colaborador obrigatório continua validado pelo `mobileInventoryAuditScopeSchema`; ID e nome são enviados ao mesmo `handleConfirmScope`, que só gera/persiste novo ID e rascunho depois de confirmar. O perfil autenticado continua sendo o ator da operação.
- [x] A identidade do inventário duplicado continua nomeada `Inventário #<código> (Cópia)` — particularidade mobile preservada. Depois da resolução, o app bloqueia a mudança do tipo e a edição da lista, exibindo os itens copiados para conferência e permitindo escolher o responsável antes de continuar, como o passo de configuração do ERP. A cópia incompleta continua mostrando erro e não cria rascunho.
- [x] O catálogo operacional mobile/ERP enumera linhas de variação (`getOfflineInventoryCatalogProducts`/`selectOfflineInventoryCatalogProducts`). A regra vigente de Produtos garante pelo menos uma variação por produto; o fallback ERP para pai sem variações é defensivo para dados legados/inconsistentes, não uma forma de produto suportada. O app preserva a identidade por variação e não inventa saldo de pai.

#### Resultado, validação e pendências

- [x] Corrigido o atalho de duplicação: nenhum draft ou item de contagem nasce antes da etapa de responsável/escopo. O novo fluxo preserva as identidades quando disponíveis, atualiza pelo catálogo offline, rejeita entradas inválidas e não copia contagem/etiquetas históricas.
- [x] Vitest mobile: **26/26 testes em seis arquivos** (`inventoryScopeCopy`, seletor de escopo com lista de cópia bloqueada, lista de responsáveis, filtro/nome do responsável, construção de catálogo e sincronização). `git diff --check` passou; ficaram somente avisos de normalização CRLF dos arquivos existentes.
- [x] TypeScript mobile continua não zero por **11 diagnósticos globais** sem ocorrência nos arquivos adicionados/alterados do ciclo. Os dois diagnósticos na área próxima do inventário são os erros preexistentes de `physicalCount` opcional após parsing Zod em `useInventoryAuditWorkflow.ts` e `useInventoryPersistenceQueue.ts`; demais erros são de campos numéricos, agenda, movimentação, serviços e tipos/schema fora deste recorte.
- [x] Guia de estoque: a página 19 (“Defina o que será contado”) agora explica revisar itens/saldos do catálogo disponível e responsável ao duplicar, e que contagem/etiquetas não são copiadas. `gerar_guia.py` gerou 24 páginas/22 imagens; os PDFs servido e de entrega estão idênticos (SHA-256 `303A5310E064A8E47DBA3D54AFE83FF138BFD8C0398F5CFF2666C92F4E7E8383`). A página 19 foi renderizada e revisada: texto legível, sem cortes, sobreposições ou alteração de acesso pelo submenu.
- [x] Limite de domínio confirmado: produto sem variações não é uma forma operacional válida segundo `docs/negocio/produtos/estrutura-produto-variacao.md`. Cópias antigas sem `variationId` são resolvidas pelas variações atuais; dados sem produto/variação operacional correspondente são rejeitados. Não há pendência de paridade para criar uma linha de pai sem variação.
- [ ] A seleção usa o índice de catálogo offline disponível. Não houve consulta ou gravação remota durante a validação.
- [ ] UI autenticada, Playwright e renderer/aparelho React Native continuam pendentes. Expo Web não comprova comportamento nativo. A skill canônica `erp-web-to-mobile-replication` permanece ausente fora da cópia de cache de build, consultada somente como orientação.

#### Resultado e próximo estado

- [x] Cópia de inventário alinhada em contrato e fluxo ao ERP, mantendo a identificação visual “(Cópia)” como particularidade mobile. O rascunho só é criado após validar escopo e responsável.
- [x] Ciclo 98 encontrou uma divergência na origem: o ERP contém `openLaunchStock`, o alvo e `StockLaunchModal`, mas nenhum item visível de lançamento no menu de Produto/Variação. A regra geral do usuário determinou seguir o ERP sem uma particularidade mobile documentada. A retirada foi executada no Ciclo 101, preservando a UI atual do ERP. Permanece a limitação de prova de saldo/CMPM pela RPC registrada no Ciclo 95.

### Ciclo 98 — ação “Lançar Estoque” a partir de Produtos — 24/10/2026

**Recorte pré-registrado:** um caminho de UI, do menu de Produto/Variação até a configuração inicial de uma movimentação manual no mobile, incluindo os casos de produto simples, variação individual e produto composto.

**Evidência do ERP:** `Index.tsx` passa `openLaunchStock` como `onLaunchStock`; `useProductsModals.ts` conserva o produto/variação e `ProductsModalsContainer.tsx` renderiza `StockLaunchModal`. Porém, nos componentes `ParentProductActions`, `ProductCardActions` e `VariationItemActions`, `onLaunchStock` só aparece declarado como prop, sem ser consumido ou chamado. Na UI autenticada em Development via Playwright, `/products` exibiu 15 botões “Mais opções”; ao abrir o primeiro menu, não havia botão/texto “Lançar Estoque” nem modal de lançamento. Isso contradiz a suposição pré-registrada de que a ação estava disponível no ERP.

**Trabalho mobile preparado, ainda não contado como paridade:** o app agora propaga pai/variação até Movimentações, abre modal com RHF + `zodResolver` e usa serviço de estoque; composição só mostra informação, sem operação. A lista de Movimentações pode ser filtrada ao alvo. O serviço valida associação e concorrência, usa mapeamento/projeção compartilhados, verifica a persistência e bloqueia retry ambíguo. A UI não acessa `inventory_moves` diretamente. Como a ação não foi comprovada na UI ERP, manter esta implementação como candidata e não declarar o caminho alinhado até a decisão abaixo; ela cria uma ação mobile que atualmente não existe na lista ERP.

**Decisão de escopo aplicada:** a instrução geral do usuário para manter no app o comportamento do ERP quando não houver exceção mobile documentada resolve a alternativa: não adicionar ação ao ERP durante a replicação; retirar o caminho exclusivo do mobile em um ciclo próprio. Nenhum movimento foi enviado.

**Validação e limites:** Playwright headed autenticado por credenciais do ambiente Vercel Development, sem salvar estado de sessão: `/products` carregou; foram observados 15 menus de produto, nenhum botão “Lançar Estoque” no primeiro menu aberto e nenhum modal. Não houve escrita remota. Vitest focado: 25/25 testes de shared/mobile e 18/18 testes ERP passaram. `tsc --noEmit` mobile ainda retorna 23 diagnósticos globais preexistentes, sem apontamentos no escopo tocado. `git diff --check` limpo, exceto avisos CRLF preexistentes. O guia prático foi ajustado para não ensinar uma ação que a UI ERP não expõe; PDFs sincronizados com SHA-256 idêntico, 24 páginas, página 22 renderizada e revisada sem cortes. Expo Web/nativo não foi validado. A skill canônica `erp-web-to-mobile-replication` continua ausente em `.agents/skills`; a cópia de cache não foi tratada como fonte atual.

### Ciclo 99 — filtro “Somente Produtos” e composições — 24/10/2026

**Recorte pré-registrado:** uma seleção de filtro na lista ERP, `Somente Produtos`; comparar sua presença/predicado com a lista padrão mobile, incluindo a classificação de composições, o modo separado `Composições` do app e os limites de permissão. Conferir somente o estado desse filtro, sem alterar dados.

#### Evidência e resultado

- [x] ERP `ProductFilters.tsx` mostra a opção “Somente Produtos”; a UI autenticada em `/products` carregou em navegador visível e a opção foi selecionada. A consulta de listagem enviada pelo ERP continha o predicado compartilhado `item_type.eq.product,item_type.eq.composition,item_type.is.null`: inclui produtos, composições e linhas legadas sem `item_type`.
- [x] A lista padrão mobile corresponde ao ERP quando a permissão `viewProductCompositions` está disponível: usa `PRODUCT_LIST_PRODUCT_ITEM_TYPE_FILTER`. Sem essa permissão, a lista padrão inclui produto e `NULL` legado, mas exclui composição. O modo separado “Composições” é condicionado à mesma permissão e consulta `item_type = composition`; não expõe tipos de produto como composições.
- [x] Não foi encontrada diferença suportada neste recorte; nenhuma mudança de código foi necessária. O modo separado e o controle de permissão do mobile já estavam documentados nos Ciclos 29–30 e 77.
- [x] Vitest focado mobile `mobileProductFetchService.test.ts`: **18/18 aprovados**. Vitest ERP `productFilterBuilder.test.ts`: **12/12 aprovados**. A conferência autenticada do ERP observou o estado visual e o predicado de consulta; nenhum dado de negócio foi alterado.
- [x] O processo da pilha local usado para a validação foi encerrado; não havia listener nas portas 5173 e 3000 ao final desta execução.
- [ ] O comportamento visual do app não foi exercitado em aparelho ou renderer nativo. Expo Web, caso usado em validação futura, não provará comportamento nativo. Nenhuma consulta remota direta ou escrita de negócio foi realizada.
- [ ] A skill canônica `erp-web-to-mobile-replication` continua não localizada em `.agents/skills`/skills do projeto; a cópia disponível em cache de build permanece apenas uma orientação, conforme registrado nos ciclos anteriores.

**Conclusão do recorte:** filtro “Somente Produtos”, inclusão de composições e registros legados, modo separado e permissão foram comparados; paridade de lógica confirmada, sem correção de código pendente neste estado.

### Ciclo 100 — modal “Histórico de Preços” do produto — 24/10/2026

**Recorte pré-registrado:** um caminho da lista de Produtos — abrir Histórico de Preços para o produto/variação e comparar o contrato de leitura, linha histórica e estados de carregamento/erro/vazio/sucesso. Sem executar escrita.

**Divergências encontradas antes de qualquer alteração:** o ERP passa `onShowHistory` de `Index.tsx` à lista, mas os componentes de ações de produto, card e variação não chamam esse callback; o modal ERP e `loadPriceHistory` existem, porém o menu da lista não oferece a ação. O mobile oferece a ação e abre modal próprio. Dentro do modal, o mobile lê `product_price_history` sem timeout/resolver explícito, espera `new_price`/`price` (campos que não aparecem no tipo ERP) e transforma ausência em `R$ 0,00`; o ERP usa `new_unit_price`, apresenta os preços anterior/atual de venda e custo e classifica a alteração. O modal ERP ainda oferece recarga visível após erro e limita a consulta a 15 segundos; o estado de erro mobile não tem recarga e pode ficar carregando sem limite.

#### Correção, evidência e pendências

- [x] Consultados `ParentProductActions`, `ProductCardActions` e `VariationItemActions`: `onShowHistory` é declarado/propagado, mas nenhum desses consumidores o invoca. `PriceHistoryModal` continua montado no contêiner ERP, porém sem caminho de abertura na lista; não foi alterado o ERP para criar uma ação que o usuário não encontra lá.
- [x] Não foi localizada particularidade de produto no app que justifique essa ação mobile adicional. `docs/forms/migracao-rhf-zod-2026-10-14.md` trata o proprietário RHF/Zod ERP do modal/lote, sem registrar a ação como exceção mobile; a orientação geral explícita do usuário determina seguir o ERP quando não houver justificativa documentada.
- [x] Removida do app a opção “Histórico de Preços” dos menus de produto, variação única e variações de família, com os repasses de callback, estado de abertura e modal/serviço mobile sem outros consumidores. A disponibilidade dos demais itens, permissões e menus não foi alterada.
- [x] Vitest focado mobile para `mobileProductCardRules.test.ts` e `productPermissions.test.ts`: **21/21 testes aprovados**. A busca de referências confirmou ausência de `onShowHistory`, `ProductPriceHistoryModal` e `fetchMobileProductPriceHistory` no código mobile. `git diff --check` passou; Git avisou apenas sobre a normalização CRLF/LF em arquivos já modificados no workspace.
- [ ] `tsc --noEmit -p mobile/tsconfig.json` permanece não zero por **11 diagnósticos globais** em arquivos fora deste recorte; nenhum aponta aos arquivos de menu/card/tela modificados.
- [ ] Não houve consulta nem gravação de dados de negócio, e esta execução não fez conferência visual autenticada do menu por Playwright; a conclusão de disponibilidade ERP é baseada na cadeia real de callbacks/componentes. Runtime nativo não foi testado; Expo Web não provaria comportamento nativo.
- [ ] A aba ERP “Entradas (Lotes/Custo)” do modal histórico não foi objeto deste recorte; a retirada acima trata apenas do caminho de produto “Histórico de Preços” sem invocação no menu ERP. A skill canônica `erp-web-to-mobile-replication` permanece não localizada fora do cache de build/backup descrito nos ciclos anteriores.

**Conclusão do recorte:** a ação mobile exclusiva foi retirada para seguir a interface ERP efetivamente conectada. O conteúdo da modal não foi alterado; seu código e serviço sem outros consumidores foram removidos. O caminho “Lançar Estoque” separado no Ciclo 98 foi concluído no Ciclo 101.

### Ciclo 101 — ação “Lançar Estoque” no menu mobile de Produtos — 24/10/2026

**Recorte:** um caminho de UI do menu de Produto/Variação até a configuração de lançamento manual; cobertos pai de produto simples, pai com variações, variação única e composição. Sem criar ou alterar movimentações.

#### Evidência e correção

- [x] ERP: a observação Playwright autenticada do Ciclo 98 encontrou 15 menus sem “Lançar Estoque”; `onLaunchStock` permanece apenas declarado/propagado pelos componentes ERP, sem chamada pelos itens visíveis. A decisão geral do usuário é seguir a interface ERP quando não houver exceção mobile documentada.
- [x] Documentação: a busca por “Lançar Estoque”/lançamento avulso não encontrou exceção mobile; `docs/estoque/guia-pratico/README.md` e a página 22 do guia (Histórico) já dizem que a lista de Produtos não disponibiliza lançamento avulso. Após a retirada, esse texto representa o app e o ERP. Não foi necessária alteração nem regeneração dos PDFs; caminhos e submenu do guia foram preservados.
- [x] Mobile: removidos o item e o callback de `MobileProductActionsMenu` e `MobileProductVariationActionsMenu`, seus repasses nos cards/lista/tela de Produtos e o redirecionamento da navegação para Estoque com produto pré-selecionado. Removidos a modal, o resolvedor de alvo, o serviço manual, os estados/efeitos de lançamento em `StockMovesScreen` e a abertura automática de Movimentações em `NativeStockScreen`. A tela de Movimentações preserva filtro, leitura, edição e estorno de registros. Schemas, mapper e projeção compartilhados usados pelo ERP foram mantidos.
- [x] A ação não possui chamada de substituição no menu de Produtos; pai, variação e composição deixam de oferecer esse atalho. O módulo Estoque continua acessível pela navegação própria; nenhuma gravação remota foi feita.

#### Validação e limites

- [x] Busca final em `mobile/` não encontra `onLaunchStock`, `StockLaunchModal`, alvo de lançamento ou `saveManualStockMovement`; a modal e o domínio exclusivos foram removidos, e não restaram referências/imports pendentes.
- [x] Vitest mobile focado em `mobileProductCardRules.test.ts` e `productPermissions.test.ts`: **21/21 testes passaram**. `git diff --check` terminou sem erros de whitespace (Git emitiu apenas avisos de normalização CRLF em arquivos previamente modificados).
- [ ] `npx tsc --noEmit -p mobile/tsconfig.json` continua não zero por **11 diagnósticos globais** já conhecidos em arquivos não alterados; nenhum dos diagnósticos aponta aos arquivos deste ciclo.
- [ ] Não foi aberto o menu mobile em Playwright nem em renderer/aparelho nativo neste ciclo; a observação Playwright da ausência ERP é a do Ciclo 98. Expo Web não comprovaria comportamento nativo. Nenhuma consulta ou escrita de negócio foi executada.
- [ ] A skill canônica `erp-web-to-mobile-replication` segue sem localização fora do cache de build; a versão acessível foi consultada apenas como orientação. A limitação permanece registrada no início do inventário.

**Conclusão do recorte:** ação mobile exclusiva removida, sem criar uma alternativa no ERP nem enviar movimentos. O caminho de produto para lançamento avulso agora corresponde ao menu ERP observado; permanecem preservados os demais estados de consulta e manutenção de Movimentações.

### Ciclo 102 — pedido de compra e recebimento de estoque — 24/10/2026

**Recorte:** detalhe de pedido de compra e a diferença entre conferência do pedido, movimentação de estoque e recebimento efetivo.

#### Evidência da comparação

- [x] ERP: `PurchaseDetailsFooter` expõe “Conferir Pedido” e `PurchasesPage` abre `PurchaseReceiptCheckModal`. `usePurchaseReceiptCheckForm` usa `createPurchaseReceiptCheckFormSchema` via `useZodForm`, persiste quantidades recebidas, dados da NF, status e observação. A confirmação informa: “Registre o recebimento em Recebimentos de Mercadorias para movimentar o estoque.” Este fluxo não cria `inventory_moves`, não atualiza saldo/CMPM nem marca `stockProcessed`.
- [x] O ERP monta `PurchaseStockEntryModal` apenas se receber `location.state.purchaseForStockEntry`; a busca do estado em todo o repositório localizou a leitura/montagem em `StockScreen`, sem chamador. A modal em si cria movimentos `entry`, mas não há acesso de usuário comprovado a esse lançamento direto a partir do pedido.
- [x] Mobile: o detalhe de compra oferece edição, mudança de status e cancelamento; exibe o estado do recebimento, sem ação de conferência 3-Way Match ou lançamento de estoque. `usePurchaseForm` preserva o `stockProcessed` existente; as chamadas móveis não criam movimento de compra. Há uma tela separada de Recebimentos.
- [x] `docs/negocio/recebimentos/recebimento-de-compras.md` define que pedido é apenas planejado, não altera saldo nem CMPM, e que só a confirmação do recebimento cria entradas. `docs/negocio/estoque/movimentacoes-e-custo.md` mantém `inventory_moves` como fatos auditáveis; a regra `rules/stock/no-inventory-move-write-in-ui.yml` veda gravação direta pela UI.
- [x] Decisão: não adicionar “Registrar entrada no estoque” ao detalhe mobile do pedido, pois esse caminho não está acessível no ERP e conflita com o fluxo documentado de recebimento. A ação ERP “Conferir Pedido” é uma diferença real do módulo Estoque/Compras, mas não pertence à superfície do módulo Produtos auditada nesta tarefa; seguirá como pendência separada no roadmap.
- [x] Nenhum código ou guia operacional foi alterado: o fluxo de estoque não mudou. Nenhuma consulta ou gravação de dados comerciais foi realizada. Nenhum teste foi executado, pois a auditoria não alterou código.
- [ ] Limitação visual/autenticada: Playwright abriu o ERP local de forma visível e a rota redirecionou para `/login`. O ambiente local não disponibilizou credenciais gerais de teste; a credencial de finalidade fiscal não foi usada fora desse propósito e nenhuma guarda foi contornada. Assim, os call sites e estados foram comparados em código, sem confirmação do detalhe autenticado. A UI nativa continua sem validação; Expo Web não prova runtime nativo.
- [ ] A skill canônica `erp-web-to-mobile-replication` não foi localizada fora de uma cópia em cache de build; essa cópia foi consultada como orientação. A exceção de `finalPurchasePrice` foi encerrada pelo critério de paridade com o ERP no Ciclo 154; validação visual autenticada/nativa e persistência remota permanecem independentes.

### Ciclo 103 — redirecionamento de etiqueta preserva produto selecionado — 24/10/2026

**Recorte:** somente o estado de perfil com `printProductIdentificationLabels` autorizado e `viewStockLabels` negado ao abrir a ação “Etiq. de Preço” de um produto.

#### Evidências e correção

- [x] Comparação dos três lados: ERP expõe “Etiq. de Preço” para o perfil Gestor não classificado como label-only, e `ProductIdentificationLabelRoute` mantém `location.state` ao forçar `cat=identificacao`; o mobile usa `buildProductPriceLabelUrl`, enviando `productId` e `autoAddProduct=true`, mas a rota ERP substituía a query inteira por `?cat=identificacao`. `useLabelProducts` só carrega e pré-seleciona o produto da query quando `autoAddProduct=true`. A regra compartilhada separa `viewStockLabels` de `printProductIdentificationLabels`; nenhuma permissão foi alterada nem se criou acesso à categoria de preços.
- [x] Decisão aberta desde o Ciclo 67 resolvida pela instrução vigente de replicar o ERP sem particularidade mobile documentada: manter a mesma visibilidade/gate nos dois clientes. Corrigir somente a perda de contexto no redirecionamento mobile; o destino autorizado continua em identificação, como ocorre no ERP para esse perfil.
- [x] Criado `buildIdentificationOnlyLabelSearch`: força `cat=identificacao`, remove o alias legado `category` e preserva os demais parâmetros, incluindo `productId`, `variationId`, `autoAddProduct` e `fillSheet`. `ProductIdentificationLabelRoute` continua preservando `location.state`.
- [x] Vitest focado: **3/3 testes** para parâmetros da categoria, preservação do produto/variação e query vazia. `git diff --check` aprovado.
- [ ] `tsc --noEmit -p erp/tsconfig.json --pretty false` terminou com código 2 por diagnósticos globais. A filtragem dos arquivos tocados só encontrou o erro preexistente TS1261 em `Router.tsx:56` (`NewSaleOrder`/`newSaleOrder` com diferenças de maiúsculas); não houve diagnóstico no novo utilitário nem no bloco de redirecionamento alterado.
- [ ] Playwright foi mantido visível e abriu o deep link de desenvolvimento, mas a rota redirecionou para `/login`; não foi possível validar o perfil autorizado sem contornar a autenticação. Nenhuma consulta ou gravação comercial ocorreu. Expo Web/runtime nativo não foi validado.
- [ ] A skill canônica `erp-web-to-mobile-replication` segue ausente fora da cópia de cache em `.vercel`; a cópia disponível foi usada somente como orientação. Nenhuma regra aplicável de produto/etiquetas foi encontrada em `rules/`.

#### Resultado e próximo estado

- [x] O app agora conserva o produto escolhido ao seguir o mesmo redirecionamento de permissão do ERP. O gate e a categoria forçada permanecem intactos. A mudança é apenas de navegação/prefill; não altera os passos operacionais documentados no guia de Estoque.
- [ ] Próximo recorte: continuar pela próxima pendência aberta do módulo Produtos; UI autenticada e validação em runtime nativo permanecem limitações transversais.

### Ciclo 104 — preservação de saldo no salvamento mobile de Produto — 24/10/2026

**Recorte:** contrato de persistência do saldo atual de produto pai e variações durante criação/edição do formulário mobile; sem abrir operação de estoque.

#### Evidência e decisão

- [x] Retomada pela pendência do Ciclo 94 e pelo item correspondente no roadmap. Reconfirmados os formulários: ERP não expõe estoque atual/inicial como campo na aba `ProductInventoryTab`; mobile também não oferece esse campo. O payload de `mobileProductMutationService` omite `stock`/`initial_stock` no pai e `stock` nas variações.
- [x] Como a função não está nas migrations locais, foi consultada somente a definição de `public.save_mobile_product_transaction` no projeto Supabase remoto já existente `MoranteHub` (`hkoxhourxwlddgsfdgws`), por uma leitura de `pg_proc`/`pg_get_functiondef`, sem selecionar linhas comerciais, chamar a RPC de salvamento, criar fixtures ou gravar dados.
- [x] A definição remota confirma: inserts do pai definem `initial_stock = 0` e `stock = 0`; inserts de variação definem `stock = 0`; updates do pai não atribuem `stock` nem `initial_stock`; updates de variação leem o `stock` atual da linha sob lock e o regravam sem alteração. O payload móvel incompleto, portanto, não zera os saldos correntes ao editar; o padrão de novos cadastros permanece zero, em acordo com os formulários e com o ledger de estoque.
- [x] Decisão: não alterar o payload mobile para enviar saldos absolutos nem alterar a RPC. Isso preserva a regra offline-first de não gravar estado absoluto pela tela de Produto e mantém o contrato de movimentos como fatos e saldo como projeção.
- [x] Nenhum código, migration, PDF operacional ou dado de negócio foi alterado. Nenhum teste foi executado, pois esta execução apenas auditou a definição da RPC e atualizou o registro. `git diff --check` foi verificado após a documentação.
- [ ] Limitação: a definição da RPC continua fora do histórico local de migrations; a inspeção comprova o código atualmente implantado no projeto consultado, mas não elimina risco de divergência entre remoto e fonte versionada. A atualização da projeção saldo/CMPM após a finalização de inventário e outros movimentos segue pendente no Ciclo 95 e não foi exercitada.
- [ ] Validação autenticada de UI e renderer nativo permanecem pendentes; Expo Web não comprova comportamento nativo. A skill canônica `erp-web-to-mobile-replication` continua não localizada fora da cópia em cache de build registrada no início.

**Conclusão do recorte:** a diferença observada era de serialização, não de efeito: a RPC preserva saldos correntes no update e inicializa novos registros em zero. O formulário segue sem campo de quantidade inicial em ambos os clientes; nenhuma correção de produto foi necessária.

### Ciclo 105 — total e recortes da paginação na conciliação de Produtos — 24/10/2026

**Recorte:** uma lista/estado da Central de Conciliação: total exibido, janelas consultadas e itens que aparecem ao navegar entre páginas. Nenhuma mutação de produto.

#### Evidência da comparação

- [x] ERP (`ProductReconciliation`) e mobile (`NativeProductReconciliationScreen`) chamam seus wrappers para a mesma `fetchProductsForReconciliationWithClient` em `shared-utils/productReconciliationQueries.ts`; os dois calculam as páginas a partir de `result.count` e exibem o total de produtos.
- [x] O SQL aplica filtros gerais de produto/fornecedor/categoria/busca e retorna `rawCount`; depois o código local executa `detectProductPendencies` e filtra os produtos com pendências. A resposta usa `Math.max(pendingProducts.length, rawCount)`, portanto `count` não é a quantidade exata de produtos pendentes quando a consulta bruta inclui produtos conformes.
- [x] Cada página consulta de `(page - 1) * pageSize` até `from + pageSize * 3 - 1` (três páginas de linhas brutas), filtra localmente e retorna os primeiros `pageSize` pendentes do recorte. As janelas consecutivas se sobrepõem em duas páginas brutas; uma pendência na região compartilhada pode aparecer de novo ao avançar. O detector e filtros de pendência dependem de atributos/valores de variações e não são todos traduzidos para o filtro SQL.
- [x] Comparação ERP/mobile: a origem comum e os cálculos de total/página são iguais. Não há ausência exclusiva do app a corrigir neste estado, embora o defeito de contagem/duplicação comum degrade ambas as listas.
- [x] Nenhuma regra em `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, notas mobile ou `rules/` define estratégia de contagem/paginação da conciliação. A skill consultável está somente em `.vercel` como cache, usada como orientação; a versão canônica do projeto não foi localizada.
- [x] Nenhum código ou teste foi alterado/executado. Nenhuma consulta ao banco ou gravação foi realizada; a causa é comprovável pela cadeia compartilhada estática. Não houve alteração de operação do estoque, portanto os PDFs do guia não mudam.
- [ ] Correção segura depende da escolha entre manter a paginação numerada/contagem exata, o que requer enumerar todos os candidatos a pendência por filtro (varredura compartilhada potencialmente custosa), ou substituir nos dois clientes por navegação incremental com `hasMore`, sem prometer total exato. Não há estratégia definida nos documentos atuais; perguntar ao usuário antes de mudar o contrato de paginação.
- [ ] Playwright autenticado e renderer React Native continuam pendentes; telas protegidas permanecem sem sessão geral de teste. Expo Web não comprova comportamento nativo.

**Conclusão do recorte:** a paginação ERP/mobile tem paridade de implementação porque consome a mesma função, mas compartilha um defeito. A correção não é exclusiva do mobile e não foi inferida sem decisão sobre custo de consulta versus contrato visual de páginas.

### Ciclo 106 — autorização e contrato da finalização remota de inventário — 24/10/2026

**Recorte:** inspeção somente de metadados e definições das RPCs de finalização de inventário no projeto Supabase operacional já configurado; sem chamar as funções, ler saldos/linhas comerciais ou executar qualquer operação.

#### Evidência e risco

- [x] Retomada da pendência de finalização física registrada no Ciclo 95, consultando `docs/negocio/estoque/inventario-e-ajustes.md`, `docs/negocio/estoque/movimentacoes-e-custo.md`, `docs/negocio/estoque/contrato-indice-inventario-offline.md` e `docs/testing/SUPABASE_REMOTE_TEST_POLICY.md`. A documentação descreve a RPC v2 como versionada, com rebase das movimentações posteriores à contagem; exige manter `inventory_moves` como fatos e tratar saldo/CMPM como projeções.
- [x] A busca em `supabase/migrations/` não encontrou definição local de `finalize_inventory_transaction` nem `finalize_inventory_transaction_v2`. A leitura remota somente de `pg_proc`/`pg_namespace` no projeto operacional configurado (`MoranteHub`, referência `hkoxhourxwlddgsfdgws`) encontrou apenas `public.finalize_inventory_transaction(uuid,text,jsonb,jsonb,text)`; não encontrou a v2. Se a flag de versão de qualquer cliente estiver ativa, a função v2 correspondente não existe nesse schema/projeto consultado.
- [x] A definição atual da v1 é `SECURITY DEFINER`, fixa `search_path` em `public, extensions` e concede `EXECUTE` à role `authenticated` (e `service_role`); `anon` não tem execução. A análise estática do corpo não localizou `auth.uid()`, verificação de permissão/ator nem verificação de ownership/escopo do inventário antes de efetivar os itens. Portanto, a guarda visual de rota não é uma barreira de autorização da RPC: qualquer sessão autenticada que alcance o endpoint pode invocá-la sem a permissão de estoque correspondente. Achado de segurança que requer correção no servidor antes de considerar finalização segura.
- [x] A v1 aceita contagens divergentes, registra um movimento `adjustment` de quantidade zero com `previousStock`/`targetStock` na observação e escreve diretamente o saldo-alvo na variação ou no produto pai. A função não implementa o rebase das movimentações posteriores descrito para v2 e não calcula CMPM/custo. A diferença é comprovável na definição; não foi executada operação para observar efeitos em registros.
- [x] A inspeção não sustenta afirmar que os clientes nunca reprocessam movimentos posteriores: os serviços ERP e mobile têm `recalculateInventoryAuditBalance`, usam o `targetStock` da âncora e somam entradas/saídas efetivas subsequentes após mutações. Essa recomposição é do cliente e lê no máximo 500 movimentos; não substitui a atomicidade da RPC nem comprova a projeção no momento da finalização. O fluxo de custo/CMPM continua sem prova.
- [x] A consulta foi estritamente de catálogo de funções/ACL e definição SQL, sem ler dados de negócio, executar RPC, criar fixtures ou escrever no Supabase. Não houve alteração de código/migration, deploy, teste ou PDF; a operação do estoquista não mudou neste ciclo.
- [ ] A correção deve ser versionada em migration e restaurar uma guarda de servidor que valide usuário, permissão de mutação e escopo/ownership do inventário e dos produtos. A documentação e o código consultados ainda não estabelecem qual permissão existente deve governar a finalização (`manualStockMovement`, `viewStockInventory` ou outra); não inferir esse gate nem revogar acesso de `authenticated` sem preservar o fluxo legítimo. A nova definição também deve alinhar a versão v2 documentada, ou corrigir explicitamente o contrato/versionamento.
- [ ] Provar rebase/saldo/CMPM com o gate remoto autorizado e com fixtures de ownership comprovado continua pendente; respeitar `SUPABASE_REMOTE_TEST_POLICY.md`. Não chamar a RPC nem contornar autenticação para produzir evidência. UI autenticada e renderer nativo também permanecem sem validação; Expo Web não comprova comportamento nativo. A skill canônica `erp-web-to-mobile-replication` segue não localizada fora da cópia em cache de build.

**Conclusão do recorte:** foi confirmado um risco concreto de autorização em uma RPC `SECURITY DEFINER` acessível a `authenticated`, além da ausência remota da v2 descrita em documentação. O achado foi registrado sem operação de negócio nem mudança remota. A correção fica pendente da fonte versionada e da definição documentada do gate de mutação.

### Ciclo 107 — falha e repetição da consulta de Conciliação de Produtos — 24/10/2026

**Recorte:** estado de erro/timeout da consulta da lista de produtos pendentes na Conciliação, incluindo a recuperação manual. Sem alterar produto ou operação de estoque.

#### Evidência da comparação

- [x] O ERP (`ProductReconciliation.tsx`) e o mobile (`NativeProductReconciliationScreen.tsx`) validam `{page, pageSize, filters}` pela mesma `reconciliationQueryFormSchema`, executada por `useZodForm`/`validateValues` antes do serviço.
- [x] Ambos chamam wrappers próprios para a mesma query de domínio `fetchProductsForReconciliationWithClient`; ambos têm limite de 15 s, o mesmo código de timeout `reconciliacao:consultar-produtos`, texto de timeout e fallback de erro genérico.
- [x] As duas telas usam revisão incremental da requisição e ignoram sucesso/erro atrasado de uma consulta obsoleta. Em falha mantendo resultados anteriores, o erro é anunciado como alerta e os itens carregados permanecem na tela; em falha sem dados, ambas mostram o estado “A consulta não foi concluída” e oferecem “Atualizar consulta”. O mobile dispõe o retry dentro do cartão de erro e o ERP junto ao estado vazio, mas o caminho e o efeito são equivalentes.
- [x] Nenhuma divergência de contrato, validação, timeout, preservação dos itens existentes ou repetição foi comprovada neste estado; não foi necessária correção de código.
- [x] Regras consultadas: root `AGENTS.md`, `docs/geral/USER_RULES.md`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, notas em `docs/produtos/` e arquivos disponíveis em `rules/`. Nenhuma regra de produto altera a decisão de manter este estado equivalente; a skill canônica `erp-web-to-mobile-replication` não foi encontrada em `.agents/skills` na raiz, ERP ou mobile. A cópia em cache `.vercel` permanece apenas orientação.
- [x] Não houve alteração de código nem execução de testes, Playwright ou consulta/gravação remota neste ciclo. O guia operacional não foi alterado, pois a operação do estoquista não mudou. `git diff --check` não apontou erro de whitespace; Git emitiu apenas os avisos conhecidos de normalização CRLF/LF.
- [ ] A validação visual autenticada e o comportamento em renderer/aparelho nativo seguem pendentes. Expo Web não comprova comportamento nativo.

**Conclusão do recorte:** o estado de falha/timeout e o retry da lista de Conciliação têm paridade funcional entre ERP e app; não há correção suportada neste estado.

### Ciclo 108 — estado sem resultados na Conciliação de Produtos — 24/10/2026

**Recorte:** estado de sucesso com `products.length === 0` na lista de Conciliação, incluindo mensagem, explicação de conformidade e relação com a paginação. Sem mutação.

#### Evidência da comparação

- [x] ERP e mobile apresentam o mesmo título “Nenhum produto com pendências encontrado!” e explicação de que os produtos estão em conformidade para os filtros atuais; ambos usam indicação visual positiva e não oferecem ação de correção quando a resposta não contém cards.
- [x] A query compartilhada retorna `data` a partir das pendências detectadas apenas no recorte bruto de cada página, mas deriva `count` de `rawCount` de produtos antes do filtro local. Os controles de página aparecem em ambos quando `count > 0`, independentemente de `data.length`.
- [x] Consequência estática: uma página sem pendências pode renderizar o estado apresentado como global enquanto `count` mantém páginas navegáveis e outras janelas ainda podem conter pendências. Isso é uma imprecisão comum aos dois clientes, não uma divergência ERP→app. Nenhuma consulta com dados reais foi feita para afirmar que um usuário a encontrou.
- [x] A escolha entre paginação numerada com contagem real/enumeração e navegação incremental `hasMore` continua aberta no Ciclo 105. A semântica final da mensagem vazia depende dessa escolha; não alterar apenas um cliente nem prometer conformidade global sem uma consulta que a comprove.
- [x] Regras consultadas: root `AGENTS.md`, `docs/geral/USER_RULES.md`, documentos vigentes de estrutura/variações e mover/merge, notas de `docs/produtos/` e arquivos disponíveis em `rules/`. Nenhuma particularidade mobile justifica diferença de cópia; a skill canônica não foi localizada, apenas a cópia em cache `.vercel` permanece acessível.
- [x] Nenhum código, teste, UI Playwright, banco, guia ou PDF foi alterado/consultado neste ciclo; foram feitas apenas leitura estática dos dois componentes e da query compartilhada. `git diff --check` foi conferido após o registro.
- [x] Naquele ciclo, UI autenticada e renderer/aparelho nativo não foram validados. A necessidade de decidir um contrato mobile foi encerrada pela decisão do Ciclo 127: a Conciliação saiu do app; o defeito de contagem/paginação permanece questão técnica somente do ERP, sem correção neste trabalho.

**Conclusão do recorte:** a mensagem vazia é equivalente, mas pode ser semanticamente prematura por causa do defeito compartilhado de paginação. A recomendação de escolher um contrato para os dois clientes foi superada no Ciclo 127: a Conciliação não terá tela mobile, e a inconsistência permanece restrita ao ERP.

**Retificação no Ciclo 127:** o usuário decidiu manter a Conciliação somente no ERP e removê-la do app. Portanto não há mais contrato mobile de paginação/estado vazio a escolher; a inconsistência comum de paginação descrita neste ciclo fica restrita ao ERP e não deve motivar a recriação de uma interface mobile.

### Ciclo 109 — alteração de filtros da Conciliação de Produtos — 24/10/2026

**Recorte:** mudança do tipo de pendência e do filtro de criticidade na lista de Conciliação, incluindo reinício da página e invalidação da seleção filtrada. Busca por texto permanece fora deste estado.

#### Evidência da comparação

- [x] ERP: `ReconciliationSummaryHeader` atualiza `pendencyType`/`onlyCritical` em `filters`; `ReconciliationFiltersBar` recebe o mesmo `setFilters`. O efeito dependente de `filters` volta a página para 1, invalida `selectionRevision` e limpa os estados de seleção de todos filtrados e erro de seleção.
- [x] Mobile: os chips de tipo e o indicador de críticos usam `updateFilters`, que define página 1 junto com o próximo filtro. O efeito dependente de `filters` também invalida a seleção filtrada e limpa os mesmos flags/erro. As seleções individuais por ID são preservadas nos dois clientes, sem diferença de contrato de lote.
- [x] Ambos submetem `{page,pageSize,filters}` ao mesmo schema Zod e recarregam a consulta após a mudança. No app, página e filtro são atualizados no mesmo evento. No ERP, o efeito de `filters` solicita página 1 após o commit; quando estava numa página posterior, o efeito de carregamento pode iniciar antes uma consulta intermediária da nova combinação na página antiga. A revisão incremental invalida essa resposta e a consulta da página 1 prevalece. É trabalho redundante no ERP, não falta funcional no app.
- [x] Conclusão de paridade: filtros atuais, reset de página, cancelamento lógico de operação “selecionar todos filtrados” e preservação das seleções explícitas são equivalentes no resultado. Nenhuma alteração foi necessária no mobile; não foi expandido o recorte para campo de busca, paginação ou a estratégia compartilhada de contagem (Ciclos 105 e 108).
- [x] Regras consultadas antes do registro: root `AGENTS.md`, `docs/geral/USER_RULES.md`, docs vigentes de estrutura de Produto e operações de mover/merge, notas de Produtos, árvore `rules/` e skill de replicação acessível somente em cache `.vercel`; não foi encontrada cópia canônica em `.agents/skills` da raiz/ERP/mobile.
- [x] Somente leitura estática de `ProductReconciliation.tsx`, `NativeProductReconciliationScreen.tsx` e esquema/query compartilhados. Nenhum código, teste, Playwright, dado remoto, PDF ou operação do estoque foi alterado/executado. `git diff --check` foi conferido após a documentação.
- [ ] UI autenticada e renderer/aparelho nativo continuam pendentes; Expo Web não comprova comportamento nativo.

**Conclusão do recorte:** a mudança de filtros mantém os mesmos itens/seleção e leva os dois clientes à página 1; a única diferença observada é uma consulta intermediária evitável no ERP quando a lista estava em página posterior.

### Ciclo 110 — permissão dedicada para finalizar inventários — 24/10/2026

**Recorte:** autorização da confirmação final de inventários no ERP, app e RPC; persistência da permissão, estados sem acesso e instrução operacional. Não executar o RPC nem gravar no Supabase.

#### Evidência e correção

- [x] O usuário escolheu a permissão dedicada `finalizeStockInventory`. O catálogo de permissões agora a exibe como “Finalizar inventários”, separada de `viewStockInventory`; o padrão adotado é Gestor e Estoquista, igual ao padrão de `manualStockMovement`, e Administrador mantém acesso total. A migração de configurações v10 inicializa o novo item sem sobrescrever listas explícitas já existentes.
- [x] ERP e mobile consultam o gate antes de apresentar uma ação finalizável: o botão de confirmação fica desabilitado e explica a permissão necessária. A leitura, a contagem e o retorno à contagem continuam disponíveis aos perfis que podem acessar o inventário. Os call sites da tela passam a exigir `canFinalize`/`canUsePermission` carregado.
- [x] Criada pela CLI Supabase a migration local `supabase/migrations/20261024111703_secure_finalize_stock_inventory.sql`. Ela mantém o contrato v1, define helper `SECURITY DEFINER` com `search_path` vazio, exige `auth.uid()` e o papel listado em `public.settings.data.rolePermissions.finalizeStockInventory` antes de qualquer efeito, configura ACL explícita e preenche o default remoto sem substituir uma lista existente. A criação do arquivo não aplicou a migration ao projeto remoto.
- [x] O padrão de Gestor e Estoquista foi inferido de `manualStockMovement`, que já autoriza os mesmos perfis a registrar entradas/saídas manuais; perfis com lista explícita vazia permanecem sem autorização. Essa decisão é visível e ajustável em Configurações > Permissões.
- [x] O texto da página 21 do guia informa que “Finalizar inventários” é separado de “Acessar”, e que apenas administradores ou perfis autorizados podem confirmar. `gerar_guia.py` gerou 24 páginas/22 imagens, conferiu as cópias idênticas e a renderização da página 21 foi revisada; o acesso no submenu Estoque permaneceu no mesmo caminho.
- [x] Vitest ERP: `settingsModules.test.ts` e `InventoryReviewModal.test.tsx`, **27/27**. Vitest mobile `authProfilePermissions.test.ts`, **3/3**. Nenhum teste ad hoc Node/CJS/SQL foi executado.
- [ ] A migration não foi aplicada ao projeto Supabase remoto, conforme a restrição vigente de não realizar gravações/deploy externos. Portanto, a RPC remota v1 continua sem a nova guarda até que a migration seja revisada e aplicada por fluxo autorizado. Nenhuma RPC, consulta de negócio, fixture ou operação de estoque foi executada; não foi iniciado Supabase/Postgres/Docker local.
- [ ] A guarda resolve a autorização de perfil, mas ainda não valida ownership/escopo do `p_audit_id` nem compara `p_observation` com um rascunho autoritativo no servidor. Os rascunhos hoje são locais (SQLite/IndexedDB); um perfil autorizado ainda consegue enviar valores auto-consistentes forjados. Também permanece ausente no projeto consultado a v2 documentada com rebase/CMPM. Não declarar a finalização plenamente segura ou com paridade de saldo/CMPM até versionar e provar esses contratos sob `docs/testing/SUPABASE_REMOTE_TEST_POLICY.md`.
- [ ] Playwright autenticado não foi executado porque a especificação de inventário existente grava operação de estoque e não há evidência de fixture própria/ownership conforme a política remota. O comportamento nativo também não foi testado; Expo Web não comprova runtime nativo. A skill canônica `erp-web-to-mobile-replication` continua ausente fora da cópia em cache já registrada.

**Conclusão do recorte:** a permissão dedicada e os gates visuais estão implementados e testados no código local, com o guia sincronizado. O risco remoto segue aberto até a migration ser aplicada; ownership do inventário, integridade da contagem e o contrato v2 continuam limitações independentes.

### Ciclo 111 — busca textual na Conciliação de Produtos — 24/10/2026

**Recorte:** busca por texto, debounce, composição com filtros ativos, reset de página e resposta de busca obsoleta. Sem abrir/alterar cadastros ou executar operações de estoque.

#### Evidência da comparação

- [x] ERP (`ReconciliationFiltersBar.tsx`): mantém rascunho local, aplica após 400 ms e usa referência ao estado mais recente dos filtros para não perder uma categoria alterada durante o debounce. Limpar filtros zera busca e filtros; a tela reinicia a página e invalida “selecionar todos filtrados”. O teste `ProductReconciliation.test.tsx` cobre resposta antiga, composição de busca com categoria e o debounce.
- [x] Mobile (`NativeProductReconciliationScreen.tsx`): mantém `searchDraft`, espera os mesmos 400 ms e atualiza o estado com callback funcional para preservar os outros filtros; a atualização retorna à página 1. O efeito de filtro invalida a seleção filtrada em andamento. O botão de limpeza limpa busca e filtros.
- [x] Ambos validam `{page,pageSize,filters}` com `reconciliationQueryFormSchema` via RHF/Zod e consomem o mesmo serviço de query compartilhado. Revisão incremental descarta respostas atrasadas. Não foi encontrada divergência funcional da busca entre ERP e app neste estado.
- [x] Pendência do contrato resolvida no Ciclo 126: a query compartilhada agora pesquisa `product_variations.sku`, acrescenta os produtos pais encontrados à busca por nome/código e reaplica o mesmo predicado à seleção “todos filtrados”. O limite de 100 correspondências de variação reaproveita o erro de busca ampla já usado pelo catálogo, sem entregar seleção parcial.
- [x] A skill de replicação foi consultada na cópia em cache `.vercel` somente como orientação. Nenhuma fonte canônica foi localizada em `.agents/skills` do projeto, ERP/mobile ou diretório de skills disponível. As regras do repositório/root `AGENTS.md`, `docs/geral/USER_RULES.md`, documentos de produto, notas atuais de `docs/produtos/` e regras disponíveis foram conferidos; não existe regra específica que defina a busca por SKU na Conciliação.
- [x] Auditoria estática dos componentes, schema, wrappers e query compartilhada. Nenhum código de produto foi alterado; nenhum teste, Playwright, banco, RPC ou dado de negócio foi executado/acessado neste ciclo. A validação visual autenticada e a prova em runtime nativo continuam pendentes; Expo Web não comprova comportamento nativo. A implementação de busca é comum aos clientes, portanto o achado não caracteriza ausência exclusiva do app.

**Conclusão do recorte:** busca, debounce, atualização de filtros, limpeza, paginação e invalidação de respostas têm equivalência de código ERP/mobile por compartilhamento. A query comum agora inclui SKU de variação sob o contrato já anunciado pelas interfaces.

### Ciclo 112 — navegação e limite de página na Conciliação — 24/10/2026

**Recorte:** controles para percorrer páginas e comportamento quando uma edição reduz o total de pendências. A decisão de Ciclo 105 sobre contagem exata versus `hasMore` continua independente e não foi presumida.

#### Evidência da comparação e correção

- [x] ERP (`FixedPageSlots.tsx`) usa `getFixedPageSlots` e `normalizePageNumber` de `shared-utils/fixedPagination.ts`: exibe cinco posições numeradas próximas à página atual, permite ir diretamente a qualquer posição visível e limita o estado atual ao total de páginas. A tela monta o paginador enquanto `totalCount > 0`.
- [x] Mobile antes da correção apresentava apenas “Anterior/Próxima” e não limitava `page` quando `totalCount` caía depois de salvar um card em uma página posterior. O card chama `loadData` após sucesso; se o total passasse de, por exemplo, seis páginas para três, a consulta ficaria na página seis, com contador inválido e lista sem itens, ao passo que o ERP solicitava a última página válida.
- [x] O mobile agora reutiliza `getFixedPageSlots`/`normalizePageNumber`, atualiza a página se o limite mudar e fornece os mesmos cinco slots numerados, com destaque azul/texto branco para a página atual, área de toque 44×44, rótulos acessíveis e bloqueio de navegação não atual durante carregamento. A busca/filtros seguem reiniciando a página em 1 e a seleção continua preservada entre páginas, conforme o fluxo ERP.
- [x] Regras consultadas antes da mudança: `AGENTS.md` raiz (incluindo área mínima de toque), `docs/geral/USER_RULES.md`, docs vigentes de estrutura e operações de produto, notas e inventário em `docs/produtos/`, `rules/` disponível e a skill de replicação consultável somente na cópia de cache `.vercel`. Não há AGENTS.md mais específico em `mobile/`, `erp/` ou `shared-utils/`, nem regra que justifique controles mobile diferentes.
- [ ] Playwright foi aberto em navegador visível na porta local 5173, mas o ERP redirecionou para `/login`; o inventário de variáveis Vercel Development não contém credencial geral de teste (há apenas operador fiscal, que não foi reutilizado). Nenhuma guarda foi contornada. Expo/Web não demonstra comportamento nativo; esse estado requer validação autenticada e posterior conferência no app/aparelho.
- [x] Não houve gravação externa, chamada ao Supabase, mudança de estoque ou necessidade de atualizar o guia de estoque. Não foram adicionados nem executados testes neste ciclo; a revisão focou a implementação estática e a utilidade compartilhada, já coberta pelo teste `FixedPageSlots.test.tsx` no ERP. `npx tsc --noEmit --pretty false --project mobile/tsconfig.json` encerrou com código 2 e 20 diagnósticos globais; nenhum corresponde ao arquivo mobile alterado nem a `fixedPagination.ts`.

**Conclusão do recorte:** a ausência de salto numérico e de clamp após diminuição do total foi corrigida no app com a regra compartilhada do ERP. A validação visual autenticada e nativa permanece pendente; o erro compartilhado de contagem/paginação do Ciclo 105 segue aberto.

### Ciclo 113 — consulta e revisão ao mover variação para outro pai — 24/10/2026

**Recorte:** preparação da operação de mover variação: carregar pais de destino, confirmar a quantidade de variações na origem, validar colisão de atributos, exibir falhas e permitir repetição segura da consulta. Nenhuma RPC de movimento foi executada.

#### Evidência da comparação e correção

- [x] A documentação `docs/negocio/produtos/operacoes-troca-pai-merge.md` exige preservar o UUID e histórico da variação, validar a combinação no pai de destino, avisar quando o pai de origem ficará vazio e só então mover; `docs/negocio/produtos/estrutura-produto-variacao.md` confirma UUID estável e pelo menos uma variação por pai.
- [x] ERP (`useMoveVariationFamily.ts` e `productVariationFamilyQueries.ts`) submete a consulta/confirmação aos schemas de domínio compartilhados via RHF/Zod, pagina os pais e as variações de destino em blocos de 1.000 com ordenação estável, limita chamadas a 10 s, trata falha na contagem como erro impeditivo, oferece “Consultar novamente”/“Validar destino novamente” e não habilita o movimento até o contexto e a checagem de conflito concluírem.
- [x] Mobile, antes da correção, consumia a página padrão de produtos/variações sem paginação nem ordem secundária; contava origem por `Promise.allSettled` e ignorava falha da contagem, embora essa contagem determine se o pai antigo será removido; falha de carregamento aparecia somente em `Alert`, e a falha de colisão não tinha botão de retry. A consulta de conflito também podia declarar “sem conflito” olhando apenas a primeira página.
- [x] O serviço mobile agora pagina pais (ordem nome/UUID) e variações (UUID), valida IDs/shape com os schemas Zod compartilhados, usa `sameFamilyAttributes` compartilhado e aplica timeout de 10 s por página. A preparação paralela de pais + contagem agora falha como unidade e só libera a operação com contagem exata válida; timeout global de 32 s, timeout de 11 s na revisão de conflito, invalidação de respostas/continuações antigas, erro visível e botão de retry para ambas as etapas.
- [x] A submissão móvel agora estende `variationFamilyCommandSchema` (origem/destino/atributos/nome/fotos e diferença entre pais) e continua passando pelo `useZodForm`/`zodResolver`. A confirmação permanece bloqueada até a consulta da origem, da lista de destinos e dos conflitos terminar com sucesso e o atraso de revisão de 5 s completar.
- [x] Foram adicionados testes de paginação de 1.001 pais, detecção de conflito na página posterior a 1.000 e falha de contagem impeditiva. Vitest mobile `mobileProductVariationActionsService.test.ts`: **1 arquivo, 8/8 testes aprovados**. `git diff --check` não reportou erros de whitespace; apenas avisos do Git sobre normalização CRLF/LF.
- [ ] A verificação Playwright visível abriu `http://localhost:5173/products`, mostrou brevemente “Sincronizando Sessão...” e redirecionou a `/login`. Não há sessão geral autorizada disponível; nenhuma credencial fiscal foi usada e nenhuma guarda foi contornada. Não foi possível inspecionar visualmente o modal ERP autenticado nem o modal React Native em aparelho; Expo Web não provaria o comportamento nativo.
- [ ] `npx tsc --noEmit --pretty false --project mobile/tsconfig.json` terminou com código 1 por 11 diagnósticos globais em outros módulos/configurações; nenhum aponta para os arquivos do Ciclo 113. Não houve leitura de dados comerciais, RPC, gravação, início de Supabase/PostgreSQL/Docker local ou alteração do saldo/estoque.
- [x] A skill de replicação continua acessível apenas pela cópia de cache `.vercel`, usada como orientação. Root `AGENTS.md`, `docs/geral/USER_RULES.md`, regras de formulário/teste, `rules/`, as duas referências de produto, notas de Produtos e o item atual do roadmap foram conferidos; não foi encontrada particularidade mobile documentada para mover pai. A regra de movimentos de estoque da UI foi revisada; este recorte trata apenas da consulta/revisão de uma operação de Produtos e não altera o procedimento do estoquista, portanto os PDFs do guia não requerem atualização.

#### Pendências da operação avançada

- [x] Pendente naquele ciclo; resolvido no Ciclo 114: o mobile agora revalida o `product_id` antes da RPC, valida acknowledgement, lê a variação de volta, verifica pai/SKU/nome/atributos/fotos e confirma o vínculo de `product_images`. Resultado incerto bloqueia repetição durante a sessão.
- [x] Diferença de UI sem exceção documentada resolvida no Ciclo 120: mobile permitia adicionar atributos adicionais até oito, enquanto no ERP “Adicionar atributo” fica disponível somente quando a lista está vazia. Como não foi localizada particularidade mobile documentada e a regra geral do usuário é alinhar diferenças sem justificativa ao ERP, ambos agora usam o predicado compartilhado que permite somente adicionar a primeira linha; atributos já existentes continuam editáveis.

**Conclusão do recorte:** as etapas de consulta e revisão do movimento agora falham de forma visível e recuperável, enumeram todas as páginas e não prosseguem sem confirmar a contagem da origem e a colisão no destino. A paridade de leitura/preparação foi corrigida naquele ciclo; o Ciclo 114 também concluiu a proteção do cliente na mutação. A divergência de adição de atributos foi resolvida no Ciclo 120. Estados visuais autenticados/nativos e confirmação do contrato backend seguem pendentes.

### Ciclo 114 — confirmação, timeout e sincronização da movimentação de variação — 24/10/2026

**Recorte:** estado da mutação “Mover variação para outro produto pai”, incluindo dados obsoletos, chamada incerta, resposta da RPC, leitura de volta da variação, remoção do pai vazio, fotos do pai e atualização da lista. A operação não foi executada contra o Supabase.

#### Evidência da comparação e correção

- [x] ERP (`useMoveVariationFamily.ts`, `productVariationActionsService.ts` e `variationService.ts`) mantém uma trava por UUID de origem durante a sessão, evita submissões duplicadas, grava atributos/valores em série, usa timeout de 20 s na RPC e marca timeout, status de rede/servidor ou acknowledgement inválido como incertos. Depois valida `variationFamilyAckSchema`, relê a variação e confere UUID, novo pai, SKU, nome, atributos, `showName` e URLs de imagem; confirma também a remoção do pai quando a RPC a declara e sincroniza/verifica as relações normalizadas de `product_images`.
- [x] Mobile antes desta correção chamava a RPC sem trava por UUID, timeout, validação do acknowledgement, reconsulta do `product_id` de origem ou leitura de confirmação da variação. Erro de sincronização das fotos era apenas registrado em `console.warn` e o movimento ainda aparecia como sucesso. Se `onMoved()` falhasse depois de um movimento já confirmado, a interface mostrava incorretamente “Não foi possível mover”.
- [x] `mobileProductVariationActionsService.ts` agora executa validação do payload com `variationFamilyCommandSchema`, consulta com timeout o vínculo atual antes de gravar atributos e novamente imediatamente antes da RPC, usa `variationFamilyAckSchema`, timeout de 20 s e a classificação de resultado incerto compartilhada `VariationFamilyUnconfirmedError`. Erros transitórios não liberam repetição silenciosa; somente rejeição com código determinístico confirmado é apresentada como falha segura para nova tentativa.
- [x] A resposta da RPC é confirmada por leitura de `product_variations` com igualdade de pai, SKU, nome, atributos e estado explícito de `showName`. O serviço confirma a remoção do pai de origem e não deixa a sincronização complementar das fotos falhar silenciosamente: consulta as URLs existentes, insere somente ausentes, exige acknowledgement de todas e transforma qualquer erro após envio em estado incerto. O UUID de origem permanece a identidade da linha e nenhuma movimentação de estoque é emitida.
- [x] O modal usa um guard em memória por UUID durante a sessão do componente, token e lock síncronos contra duplo toque; em resultado incerto bloqueia edição e nova tentativa, mas permite fechar a modal para consultar a lista. A guarda permanece ao reabrir o mesmo UUID, pois o componente da tela conserva o mapa. Esta é uma adaptação nativa documentada: o hook ERP bloqueia também o cancelamento em estado incerto, mas deixar a modal RN sem saída impediria o usuário de conferir o cadastro. A canonização dos atributos é sequencial e usa `variationFamilyAttributeSchema`, `toTitleCase`, consultas literais `imatch` com curingas escapados, timeout e acknowledgement. Após confirmação, o movimento é marcado concluído antes do refresh; falha de refresh informa que a variação foi movida e que a lista deve ser recarregada, sem sugerir que se repita a RPC.
- [x] A normalização de imagens legadas (listas, CSV, JSON array e objetos `url`/`image_url`) foi extraída para `shared-utils/productVariationImages.ts`; ERP reexporta o helper existente e o mobile usa o mesmo parser tanto para o payload quanto para a verificação pós-movimento.
- [x] Vitest autorizado (mocks; sem banco real): testes do serviço mobile, parser compartilhado e reexport ERP — **3 arquivos, 29/29 aprovados**. Cobrem pai obsoleto bloqueado antes da RPC, recusa determinística segura, falha transitória e acknowledgement inválido incertos, confirmação de fotos, falha de inserção de fotos bloqueada, escaping de metacaracteres dos atributos e preservação de `showName:false`. `git diff --check` não apontou erros; apenas avisos Git de normalização CRLF/LF.
- [ ] `npx tsc --noEmit --pretty false --project mobile/tsconfig.json` continua não zero por 11 diagnósticos globais em `DistanceInput`, `MeasurementInput`, `useAgendaData`, hooks de auditoria/fila de inventário, modal de edição de movimentação, serviço financeiro, configuração Vitest e utilitários compartilhados de agenda/IA. Nenhum diagnóstico aponta para os arquivos do Ciclo 114.
- [x] O formulário de confirmação continua usando `useZodForm`/`zodResolver` com o schema de comando do domínio antes de qualquer efeito; os demais parâmetros persistem obrigatórios no backend. Nenhuma escrita direta em `inventory_moves` foi adicionada. A alteração não muda o procedimento operacional do estoquista e, portanto, não exige nova revisão dos PDFs do guia.

#### Limitações e pendências

- [ ] A função SQL `move_variation_to_parent` não está versionada nas migrations locais consultadas. Não foram inspecionados metadados ou dados remotos nem executadas RPCs; assim, continuam sem prova o contrato real de `newSku/sourceParentRemoved`, a validação/ownership no backend, o atomic commit e qualquer idempotência servidor. O guard por UUID é memória da sessão, como no ERP, e não é uma garantia durável. A revalidação do pai reduz repetição de operação já refletida no cadastro, mas não fecha uma corrida entre leitura e RPC sem uma garantia server-side; se a modal/componente for desmontada ou o app reiniciado, o guard em memória também se perde.
- [ ] Não foi possível validar visualmente a modal autenticada nem o componente React Native em aparelho/emulador. A sessão ERP disponível redireciona `/products` para `/login`; não foi contornada autenticação. Expo Web não comprova o comportamento nativo.
- [x] A diferença de UI de adição de atributos registrada no Ciclo 113 foi resolvida no Ciclo 120: o app agora segue o limite ERP; as linhas de atributo existentes continuam editáveis.
- [x] Retificação dos Ciclos 105/111: a escolha do contrato de paginação deixou de ser necessária para o app quando a Conciliação foi definida como ERP-only no Ciclo 127 (reafirmada no 131); a busca por SKU de variação foi corrigida no Ciclo 126. A paginação continua uma questão técnica restrita ao ERP, sem ser bloqueio deste recorte.

**Conclusão do recorte:** o cliente mobile agora protege a confirmação com verificação de origem, acknowledgement explícito, leitura de volta, sincronização comprovada das fotos e bloqueio da repetição quando o resultado não é certo. O contrato/autorização/idempotência do servidor e a validação visual autenticada/nativa permanecem limitações; não afirmar segurança transacional integral sem a fonte SQL e prova backend.

### Ciclo 115 — erro de categoria obrigatória no formulário de Produto — 24/10/2026

**Recorte:** submissão de produto sem categoria e feedback do campo correspondente na aba Geral. Preservar a compatibilidade legada `categoryId`, rascunhos, serviços e payloads.

#### Evidências da comparação e correção

- [x] ERP (`productDomainValidation.ts`, `useProductFormSubmit.ts` e `ProductGeneralTab.tsx`) emite erro no caminho `categoryIds`, volta à aba Geral, realça rótulo e campo de categoria e apresenta o fallback “Preencha todos os campos obrigatórios.”. A seleção da primeira categoria remove o erro.
- [x] Mobile antes do ciclo exigia categoria para produto não serviço, mas emitia erro no caminho amplo `geral`, usava mensagem diferente e não encaminhava estado de validação ao rótulo/lista da categoria. A tela mostrava somente o alerta geral, sem realce do campo que precisava de correção.
- [x] `shared-utils/productCategoryRequirement.ts` concentra a mensagem e a regra comum; os schemas ERP e mobile a reutilizam. O schema móvel agora identifica o erro como `categoryIds`, com caminho/mensagem ERP, preservando o fallback `categoryId` legado. A submissão continua executando o `zodResolver` real; erro bloqueia qualquer chamada de salvamento. Serviço e payload não foram alterados.
- [x] Um teste revelou que `getMobileVariationRegistrationIssue` preferia um `categoryIds: []` explícito ao `categoryId` singular, apesar do formulário e do serviço aceitarem o fallback. O predicado compartilhado agora decide também esse bloqueio, e a regressão cobre a lista vazia com categoria legada; não mudou a precedência quando a lista contém IDs.
- [x] `ProductFormScreen` reconhece o erro de categoria mesmo quando outra validação é apresentada primeiro, retorna à aba Geral e passa o estado ao formulário proprietário. O rótulo da categoria e a borda da lista ficam em vermelho; a busca da lista anuncia a instrução acessível. Escolher ao menos uma categoria limpa o estado; remover a última não limpa o erro.
- [x] A retificação do registro do Ciclo 47 e dos recortes seguintes foi feita no mesmo inventário: a alegação de que a Conciliação abria navegador externo era anterior ao Ciclo 48; a tela nativa sob `viewProductReconciliation` existe, e os ciclos 49–50 completaram edição individual e operações em lote. A comparação visual autenticada e no runtime nativo continua pendente.
- [x] Regras consultadas antes da mudança: `AGENTS.md`, `docs/geral/USER_RULES.md`, estrutura de produto/variação e operação mover/merge, inventário vigente e regras disponíveis. A skill `erp-web-to-mobile-replication` foi encontrada somente no cache `.vercel` documentado no início deste inventário; foi usada como orientação, sem tratar a cópia como canônica. Não há `AGENTS.md` adicional em `mobile/`, `erp/` ou `shared-utils/`.

#### Validação e limitações

- [x] Vitest mobile `mobileProductFormSchema.test.ts`, `mobileProductFormErrorNavigation.test.ts` e `productRegistrationRules.test.ts`: **68/68 testes aprovados**, incluindo categoria legada com `categoryIds` vazio, rascunho sem categoria, schema/caminho/mensagem e roteamento do erro.
- [x] Vitest ERP `productFormValidation.test.ts`: **9/9 testes aprovados**; confirma que a extração da regra de domínio preserva a validação de referência.
- [x] `git diff --check` sem erros de whitespace; Git emitiu apenas avisos de normalização CRLF/LF nos arquivos do workspace.
- [ ] TypeScript mobile terminou com código 1 por **11 diagnósticos globais preexistentes** em `DistanceInput`, `MeasurementInput`, `useAgendaData`, hooks de inventário, modal de edição de movimentação, assistente financeiro, configuração Vitest e utilitários de agenda/IA. Nenhum diagnóstico aponta para os arquivos deste ciclo.
- [ ] O formulário React Native não foi renderizado em aparelho/Expo neste ciclo; não foi feita comparação visual autenticada via Playwright. O registro de acesso anterior ao ERP continuava em `/login`; nenhuma guarda foi contornada. Nenhuma consulta/gravação remota foi executada, e o guia de Estoque não foi alterado porque o fluxo operacional do estoquista não mudou.

**Conclusão do recorte:** o caminho de validação e o feedback de categoria ausente agora correspondem à regra ERP na aba Geral, mantendo a compatibilidade móvel de categoria singular legada. Permanecem pendentes a inspeção visual autenticada e a conferência do renderer/runtime nativo; Expo Web não comprova comportamento nativo.

### Ciclo 116 — rascunho de Produto ao sair do formulário — 24/10/2026

**Recorte:** fechar o formulário com alterações pendentes em produto novo e em rascunho existente. Auditoria estática; nenhuma gravação executada.

#### Evidência da diferença e limite da correção

- [x] ERP (`useProductFormModal.ts`, `useProductFormDraft.ts`, `useProductDraftCapture.ts`): em rascunhos, agenda salvamento após 500 ms nos campos ao perder foco, seleção de lista e opção de busca. O snapshot é validado com o schema de domínio via `useZodForm`/`zodResolver`; ao fechar, descarrega uma gravação pendente/em erro e só fecha após confirmação. Produto novo essencialmente vazio fecha sem confirmação. Para produto não rascunho com alterações, usa confirmação explícita.
- [x] Mobile (`ProductFormScreen.tsx`): o formulário usa schemas draft/final via RHF/Zod e oferece “Salvar rascunho”, mas não agenda salvamento de rascunho; sair após qualquer alteração chama `Alert` para continuar editando ou descartar. Não existe atualização automática do rascunho após os campos perderem foco.
- [x] `docs/mobile/arquitetura_offline_first.md` classifica criação/edição de produtos como online-first estrito, então o modo offline não explica por si só a ausência de autosave. Não foi encontrada uma particularidade documentada para o salvamento manual.
- [x] O callback da lista `useMobileProducts.handleSave` chama `saveMobileProduct` e recarrega toda a lista em cada salvamento. O serviço retorna somente o ID da RPC; edições passam `expected_updated_at` do registro no formulário. O RPC não possui definição versionada nas migrations locais consultadas. Reutilizar o callback em todo blur sem fila, resposta de versão e caminho que não recarregue a lista pode gerar chamadas redundantes e versionamento obsoleto.
- [x] Decisão registrada em 24/10/2026: o usuário escolheu implementar autosave seguro para rascunhos, com gravações serializadas e confirmação de versão; correção executada no Ciclo 117. O botão de salvar manual permanece compatível com a RPC atual.
- [x] A diferença está registrada antes de qualquer mudança de UX. Consulta em ERP/shared/mobile foi estática; sem teste, Playwright, Expo, RPC, leitura ou gravação remota. Nenhuma operação do estoquista mudou, portanto o guia de Estoque não foi alterado. A skill de replicação continua acessível somente no cache `.vercel`, conforme a limitação registrada no início.

**Conclusão do recorte na auditoria:** o fechamento de alterações em produto ativo já confirma nos dois clientes; a falta de autosave automático para rascunhos foi encaminhada à decisão do usuário, que escolheu implementação segura e teve a correção registrada no Ciclo 117.

### Ciclo 117 — autosave seguro de rascunhos de Produto — 24/10/2026

**Recorte:** autosalvar produto novo nomeado e rascunho existente após pausa de 500 ms, serializar snapshots, confirmar a versão persistida e descarregar ao fechar. Produto ativo continua usando confirmação de descarte; o cadastro rápido de Produto na NF de entrada mantém o autosave desabilitado.

#### Evidência da comparação e correção

- [x] A decisão do Ciclo 116 foi respondida pelo usuário: implementar autosave seguro. ERP (`useProductFormDraft.ts`/`useProductDraftCapture.ts`) já usa debounce de 500 ms, valida o snapshot pelo formulário draft RHF/Zod, serializa atualizações e descarrega o último rascunho ao fechar. O mobile agora aplica debounce de 500 ms apenas a produto novo nomeado ou produto em rascunho; a chamada passa por `draftForm.enqueueAndRun`/`zodResolver` real antes do serviço. Erros de validação ou persistência são apresentados e não avançam a revisão confirmada. Produto novo ainda sem nome fecha sem confirmação, como `isBasicallyEmpty` no ERP.
- [x] `mobileProductDraftSaveQueue.ts` ordena as gravações, substitui snapshots ainda pendentes pelo mais recente, ignora revisões duplicadas/atrasadas e descarta a fila posterior quando a gravação corrente falha ou rejeita. Se a resposta RPC for incerta, a tela conserva o payload e o `operation_id` exatos e os repete antes de enviar revisões novas; o botão manual não tenta uma segunda operação enquanto esse ACK estiver pendente. Somente o erro explícito de função versionada ausente é tratado como falha definitiva sem gravação e pode cair no salvamento manual legado. No fechamento, a tela espera a revisão mais recente; em falha fica aberta e oferece continuar, tentar novamente ou descartar. Estados de salvamento/sucesso/erro são acessíveis; botões não permitem submissão concorrente.
- [x] O serviço mantém a gravação manual na RPC legada `save_mobile_product_transaction`, incluindo recarga da lista. O autosave usa isoladamente `save_mobile_product_transaction_with_version`, não recarrega a lista a cada pausa; o pai atualiza a lista uma vez após o fechamento de um formulário autosalvo. A tela guarda o UUID e `updated_at` somente após ACK válido e envia a versão confirmada como `expected_updated_at` na próxima edição serializada.
- [x] A migration `20261024113000_mobile_product_save_version_ack.sql` adiciona `result_updated_at` à tabela idempotente existente e cria a RPC versionada, que chama a gravação atual dentro da mesma transação, registra a versão retornada pelo produto junto ao `operation_id` e repete o mesmo ACK para retry idempotente. Uma operação legada sem versão confirmável falha explicitamente; a RPC legada não foi substituída. `mobileProductSaveAcknowledgement.ts` exige uma única linha com UUID e timestamp válidos antes de confirmar sucesso e diferencia o erro definitivo de função ainda não migrada.
- [x] `InboundQuickProductModal.tsx` define `enableDraftAutoSave={false}`, preservando a particularidade documentada do cadastro rápido vinculado à NF de entrada. Produto concluído não passa a autosalvar como rascunho.
- [x] Arquivos alterados neste recorte: `ProductFormScreen.tsx`, `NativeProductsScreen.tsx`, `useMobileProducts.ts`, `mobileProductMutationService.ts` e teste do serviço; novos `mobileProductDraftSaveQueue.ts`/teste, `mobileProductSaveAcknowledgement.ts`/teste e migration de ACK versionado. Alterações de categoria existentes de ciclos anteriores foram preservadas.
- [x] Regras consultadas antes da correção: `AGENTS.md`, `docs/geral/USER_RULES.md`, regras dos diretórios alvo, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/mobile/arquitetura_offline_first.md`, inventário, roadmap e regra de formulários RHF/Zod. A skill `erp-web-to-mobile-replication` foi localizada apenas na cópia gerada em cache `.vercel`; foi usada como orientação, não como fonte canônica. Não houve mudança na operação do estoquista, portanto o guia prático de Estoque não precisou ser atualizado.

#### Validação e limitações

- [x] Vitest mobile focado em fila, parser de ACK e serviço de mutação: **3 arquivos, 33/33 testes aprovados**, incluindo serialização, coalescência de snapshots, deduplicação da revisão em andamento, proteção contra snapshot atrasado, descarte de fila em erro/rejeição, formato inválido de ACK, detecção de RPC não migrada, caminho RPC versionado e preservação do caminho legado.
- [x] `git diff --check` sem erros; Git emitiu somente avisos de normalização CRLF/LF.
- [ ] TypeScript mobile completo termina com código 1 por **11 diagnósticos globais** em componentes/serviços de Medidas, agenda, auditoria/fila de inventário, edição de movimentação, assistente financeiro, configuração Vitest e utilitários de agenda/IA. Nenhum diagnóstico aponta para os arquivos do ciclo.
- [ ] A migration está apenas versionada localmente e **não foi aplicada ao Supabase remoto**; sem ela, o autosave recebe erro de RPC ausente, mantém mensagem/controle de retry e o botão manual continua usando o contrato antigo. A execução da migration não foi autorizada neste trabalho. O corpo da RPC legada não está versionado junto do projeto, então atomicidade e idempotência ponta a ponta precisam de confirmação quando houver processo autorizado de aplicação/validação backend.
- [ ] O formulário React Native não foi aberto em dispositivo/runtime nativo; Expo Web não comprovaria seu comportamento nativo. A comparação visual autenticada no ERP continua limitada pelo redirecionamento da rota Produtos para `/login`; nenhuma guarda foi contornada. Nenhuma RPC, consulta comercial ou gravação remota foi executada.

**Conclusão do recorte:** a paridade de autosave foi implementada no cliente e a RPC versionada foi preparada em migration, com fila serial e ACK necessário para avançar a versão. A ativação operacional depende de aplicação autorizada da migration e confirmação backend; validação visual autenticada e runtime nativo permanecem pendentes.

### Ciclo 118 — identidade do produto no ACK versionado de autosave — 24/10/2026

**Recorte:** conferir que o UUID retornado pelo ACK do autosave corresponde ao `p_product_id` enviado antes de atualizar a identidade e a versão mantidas pelo formulário.

#### Evidência da comparação e correção

- [x] ERP: o fluxo de persistência de rascunho (`productDraftPersistence.ts`) atualiza e devolve a versão da mesma identidade `product.id`; o update filtra pelo UUID-alvo e retorna `id, updated_at`.
- [x] Shared/mobile: `parseMobileProductSaveAcknowledgement` já exigia uma única linha com `product_id` UUID e timestamp legível, mas não conhecia o ID solicitado. `saveMobileProduct` envia `savedProductId` em `p_product_id`; antes deste ciclo, qualquer UUID válido da resposta passava e `ProductFormScreen` usava esse ID para preparar a próxima gravação.
- [x] O serviço agora compara `acknowledgement.productId` com `savedProductId` e rejeita o ACK divergente com erro explícito. O catch do autosave trata a resposta como não confirmada, conserva a operação/payload para repetir e não avança o UUID nem `updated_at` locais.
- [x] Teste de regressão no serviço usa ACK com timestamp/UUID válidos, mas UUID diferente do pedido, e espera rejeição; o cenário de ACK correspondente continua coberto.
- [x] Regras consultadas: `AGENTS.md` raiz (sem AGENTS adicionais nos diretórios Mobile/Shared/Database envolvidos), `docs/geral/USER_RULES.md`, estrutura produto/variação, operação mover/merge, `docs/testing/SUPABASE_REMOTE_TEST_POLICY.md`, inventário, roadmap e regra de formulário RHF/Zod. Não foi localizada regra específica em `rules/`. Skill canônica `erp-web-to-mobile-replication` não foi encontrada em `.agents/skills` ou no diretório do projeto; a cópia em cache `.vercel` foi usada somente como orientação.

#### Validação e limitações

- [x] Vitest focado: `mobileProductMutationService.test.ts` e `mobileProductSaveAcknowledgement.test.ts` — **29/29 testes aprovados**. O runner disponível em `erp/node_modules` foi invocado com a configuração mobile; não houve instalação ou alteração de dependências.
- [x] `git diff --check` sem erros; somente avisos Git de normalização CRLF/LF.
- [ ] `npx vitest` executado diretamente em `mobile/` não iniciou, pois `mobile/node_modules/vitest` está ausente e o config não resolveu `vitest/config`; a suíte foi repetida com o Vitest existente do ERP e passou. TypeScript integral não foi executado neste ciclo.
- [ ] A migration versionada segue sem aplicação remota; não houve consulta de negócio, chamada RPC ou escrita. Playwright autenticado continua indisponível pela guarda `/login`; renderer/aparelho React Native não foi validado, e Expo Web não comprovaria comportamento nativo.

**Conclusão do recorte:** o mobile agora só aceita a versão de autosave quando identidade e timestamp pertencem à resposta estruturalmente válida e ao UUID de destino enviado. A prova da instalação/contrato real da RPC continua pendente até o processo remoto autorizado; nenhuma gravação externa foi feita.

### Ciclo 119 — confirmação e herança na conversão de duas variações para produto simples — 24/10/2026

**Recorte:** reduzir uma família salva de duas variações para uma, preservar a identidade e o saldo da variação sobrevivente e confirmar a conversão com as orientações sobre fotos. O resultado final precisa refletir a herança pai→variação única descrita no contrato de domínio.

#### Evidência da comparação e correção

- [x] O modal ERP `VariationToSimpleWarningModal.tsx` abre quando a família tem duas variações, explica a conversão e como retornar ao modo “Com variações”, informa que fotos da variação removida não são excluídas automaticamente da Galeria e executa `variationToSimpleConfirmationSchema` por `useZodForm` antes de `onConfirm`.
- [x] Antes do ciclo, remover uma das duas variações em produto salvo preservava os campos próprios da sobrevivente no ERP e no app (o app preservava apenas suas fotos específicas no handler). Isso divergia de `docs/negocio/produtos/estrutura-produto-variacao.md`, que define nome, preços, dimensões, descrição e fotos da variação única como herdados do pai e afirma que a herança/sincronização é reativada ao voltar de duas variações para uma.
- [x] Em 24/10/2026, o usuário escolheu alinhar ERP e app à documentação. O helper puro compartilhado `shared-utils/simpleProductVariationInheritance.ts` agora aplica os campos herdados e reativa as flags de sincronização; ERP (`useProductFormVariations.ts` e `useProductFormModal.ts`) e app (`productVariationParentSync.ts` e `ProductFormVariationsTab.tsx`) chamam essa mesma regra tanto na remoção do rascunho quanto na exclusão física bem-sucedida de uma variação salva.
- [x] UUID e SKU da variação sobrevivente, seus atributos e seu saldo permanecem intactos. A lista de campos herdados segue a documentação; atributos continuam armazenados em `product_variations.attributes`, e estoque não é uma propriedade que a documentação define como herdada. Não é criada movimentação nem ajuste de saldo nesta transição. As fotos do pai voltam a refletir a galeria da variação única; fotos da variação removida não são apagadas da Galeria automaticamente e o alerta orienta a revisá-la.
- [x] A confirmação mobile mantém o `Alert.alert` nativo, valida o identificador da variação e a confirmação com o `variationToSimpleConfirmationSchema` compartilhado via `useZodForm` antes de atualizar `formData`; UUID, SKU ou ID temporário de rascunho identificam a variação. A remoção comum quando restam duas ou mais não foi alterada.
- [x] Regras consultadas: `AGENTS.md`, `docs/geral/USER_RULES.md`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/produtos/auditoria-arquitetura-organizacao-produtos.md`, regras pertinentes em `rules/`, inventário e roadmap. Não existem `AGENTS.md` canônicos em `mobile/` ou nos diretórios ERP envolvidos; arquivos em `.vercel` são cópias de build. A skill canônica `erp-web-to-mobile-replication` continua não localizada fora do cache `.vercel`, usado apenas como orientação.

#### Validação e limitações

- [x] Vitest ERP `useProductFormVariations.test.tsx` e `VariationToSimpleWarningModal.test.tsx`: **12/12 testes aprovados**. Vitest mobile `productVariationParentSync.test.ts`: **8/8 testes aprovados**; a cobertura confirma a herança compartilhada, preservação de UUID/SKU/atributos/saldo, sincronização de fotos e validação da confirmação.
- [x] Após a confirmação mais recente do usuário de alinhar ERP e app à documentação, os mesmos testes focados foram reexecutados no estado atual: ERP **12/12** e mobile **8/8** aprovados. A resposta reafirma a decisão já implementada; não exigiu nova alteração de código.
- [x] `git diff --check` passou; Git emitiu somente avisos de normalização CRLF/LF.
- [ ] TypeScript integral do ERP termina com código 2 por diagnósticos de projeto fora dos arquivos deste recorte; a saída filtrada pelos caminhos alterados não encontrou diagnóstico. TypeScript integral mobile também termina não zero por diagnósticos globais em outros arquivos, sem apontamentos nos arquivos alterados deste ciclo.
- [ ] A tela ERP autenticada continua inacessível pela rota disponível (`/login`), e o alerta não foi validado em aparelho/runtime nativo. Expo Web não comprova comportamento nativo. Nenhuma RPC, consulta ou gravação remota foi executada.

**Conclusão do recorte:** a redução de duas variações para uma agora reativa no ERP e no app a herança dos campos definidos pela documentação, preservando os dados próprios da sobrevivente que não são herdados. A decisão do usuário foi aplicada e coberta por testes focados; a validação visual autenticada e nativa permanece pendente.

### Ciclo 120 — disponibilidade para adicionar atributos ao mover variação — 24/10/2026

**Recorte:** estado dos atributos no modal “Mover variação para outro produto pai”. Verificar quando é possível criar uma linha e preservar a edição das linhas já carregadas.

#### Evidência da comparação e correção

- [x] ERP (`AttributeConflictResolver.tsx`) só mostra “Adicionar atributo” quando a lista está vazia; quando há uma ou mais linhas, conserva os campos para editar nome/valor, sem botão para criar outra linha. A operação e a validação continuam passando por `variationFamilyConflictSchema`/`variationFamilyCommandSchema` via RHF/Zod.
- [x] Mobile (`MobileMoveVariationModal.tsx`) mostrava “＋ Atributo” sempre e permitia até oito linhas, embora a tela ERP ofereça adicionar somente a primeira. A busca no inventário/notas de particularidades não encontrou justificativa mobile para essa diferença. A instrução persistente do usuário determina manter no app o comportamento ERP quando não há exceção documentada.
- [x] `canAddVariationFamilyAttribute` em `shared-utils/variationFamilyFormSchemas.ts` concentra a regra; ERP usa o predicado na renderização e também protege `addAttribute` no hook. Mobile usa-o para exibir a ação e em uma atualização funcional de estado, impedindo que um toque atrasado crie segunda linha. Linhas legadas já carregadas continuam editáveis em ambos; o rótulo visível mobile foi alinhado a “Adicionar atributo”. Schema, valores, revisão de conflito, operação e payload não mudaram.
- [x] `MoveVariationFamily.test.tsx` cobre helper e UI ERP: com linha existente, o botão não aparece e os campos permanecem; sem linha, a ação aparece. `mobileProductVariationActionsService.test.ts` cobre a mesma função compartilhada no conjunto mobile. A mudança não altera passos do estoquista nem o procedimento de Estoque; os PDFs do guia não precisam de atualização.
- [x] Regras consultadas antes da alteração: `AGENTS.md`, `docs/geral/USER_RULES.md`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, inventário, roadmap, `rules/` e a skill ERP→Mobile disponível somente no cache `.vercel` (usada como orientação, não fonte canônica). Não há `AGENTS.md` canônico nos diretórios ERP, mobile ou shared-utils e não foi localizada particularidade mobile documentada para esta ação.

#### Validação e limitações

- [x] Vitest ERP `MoveVariationFamily.test.tsx`: **36/36 testes aprovados**. Vitest mobile `mobileProductVariationActionsService.test.ts`: **17/17 aprovados**. `git diff --check` passou, com avisos de normalização CRLF/LF.
- [ ] TypeScript integral ERP e mobile terminam não zero por diagnósticos globais em arquivos fora dos caminhos alterados; os filtros não encontraram diagnóstico em `AttributeConflictResolver.tsx`, `useMoveVariationFamily.ts`, `MobileMoveVariationModal.tsx` ou nos testes do ciclo.
- [ ] Playwright autenticado não pode confirmar o modal ERP na rota protegida disponível, que redireciona para `/login`; o componente React Native não foi renderizado em aparelho. Expo Web não comprova comportamento nativo. Nenhuma RPC, consulta ou gravação de negócio foi feita.

**Conclusão do recorte:** o app agora corresponde ao ERP: novos atributos só podem ser iniciados quando a variação não tem linhas, e os atributos existentes permanecem editáveis. A operação de mover e seus dados não mudaram.

### Ciclo 121 — reafirmação da conversão de duas variações para simples — 24/10/2026

**Recorte:** resposta do usuário reafirmando que ERP e app devem seguir a documentação ao reduzir família salva para uma variação; verificação do estado atual da correção já entregue no Ciclo 119.

- [x] Reconsultados o contrato de herança em `docs/negocio/produtos/estrutura-produto-variacao.md`, a confirmação ERP e o uso do helper compartilhado por ERP/mobile. O código mantém os campos definidos como herdados e conserva UUID/SKU, atributos e saldo da variação sobrevivente. A resposta confirma a decisão que já havia orientado o Ciclo 119; nenhuma alteração de código adicional foi necessária.
- [x] Reexecutado Vitest ERP `useProductFormVariations.test.tsx` + `VariationToSimpleWarningModal.test.tsx`: **12/12**; Vitest mobile `productVariationParentSync.test.ts`: **8/8**.
- [x] A execução ERP também rodou o `build:support` que o script `test:unit` aciona; a leitura de `erp/scripts/build-customer-support.cjs` confirma que ele grava artefatos de API em `erp/server/`. Entre os snapshots de status antes e depois apareceu uma alteração em `erp/src/pages/App/CustomerSupport/components/chat/ChatMessageTimeline.tsx`; o diff troca `useEffect` por `useLayoutEffect`, o script não produz esse TSX, e o arquivo foi preservado sem atribuí-lo a este ciclo. Nenhum servidor, RPC, consulta ou escrita remota foi usado.
- [ ] Playwright autenticado continua redirecionando a rota protegida a `/login`; a confirmação nativa ainda precisa de validação em aparelho. Expo Web não prova comportamento nativo.

**Conclusão do recorte:** a decisão confirmada está refletida no comportamento e os testes focados continuam aprovados. A auditoria global de Produtos permanece em andamento pelas pendências dos Ciclos 105/111, pela validação autenticada/nativa e pelas limitações de backend registradas nos ciclos pertinentes.

### Ciclo 122 — indicador de atributo obrigatório na aba técnica da variação — 24/10/2026

**Recorte:** aba “Características específicas” de uma variação filha. Alinhar o indicador visual de obrigatoriedade ao ERP sem alterar o cadastro de atributos, o valor persistido nem os estados de aplicabilidade.

#### Evidências da comparação e correção

- [x] A versão atual do ERP (`VariationTechnicalFieldItem.tsx`/`VariationTechnicalTab.tsx`) não mostra asterisco de obrigatório para características da variação e não inclui uma lista transitória `requiredTechnicalFields` no payload final. `docs/negocio/produtos/estrutura-produto-variacao.md` mantém `category_attributes` como fonte da obrigatoriedade de catálogo, diz que o valor pertence a `product_variations.attributes` e encaminha valores ausentes à Central de Conciliação; associar categoria ou criar requisito não inventa/preenche um valor. Não foi localizada justificativa para o app comunicar um requisito de preenchimento mais forte nesta aba.
- [x] No app, a aba técnica compartilhada mostrava o `*` vermelho também para campos de variação filha (`parentData`). `ProductFormTechnicalTab.tsx` agora só exibe esse indicador no formulário do produto pai (`!parentData`). A mudança limita-se ao rótulo; não altera aplicabilidade, dependências, edição, valores efetivos, validação RHF/Zod nem persistência.
- [x] A execução dos testes revelou um defeito já presente no estado ERP em edição: após a mudança que removeu `variationToSave`, o sucesso ainda executava `setFormData(variationToSave)`, gerando `ReferenceError` depois do callback de gravação e mantendo o modal aberto. A atualização agora usa `values.variation`, o objeto parseado pelo `zodResolver` que foi enviado ao callback/serviço. Os cinco testes de sucesso/retomada do modal que falhavam passaram.
- [x] Um teste novo de variação com campo de catálogo ausente falhava por outra razão: criava um UUID novo e mantinha o SKU `001-01`, já usado por uma irmã. O fixture agora usa o SKU único `001-03`, para isolar a regra que pretende cobrir; a validação correta de SKUs duplicados continua intacta.
- [x] Regras e docs consultados antes das mudanças: `AGENTS.md`, `docs/geral/USER_RULES.md`, inventário/roadmap, estrutura produto/variação, operação mover/merge e regra de formulário RHF/Zod. A regra disponível em `rules/` é de escrita de movimentos de estoque e não se aplica a este recorte. Não há `AGENTS.md` adicional em `erp/`, `mobile/` ou `shared-utils/`. A skill `erp-web-to-mobile-replication` segue encontrada apenas no cache `.vercel`; usada como orientação, sem declarar essa cópia como fonte canônica.

#### Validação e limitações

- [x] Vitest ERP (`VariationTechnicalTab.test.tsx` e `VariationFormModal.test.tsx`): **43/43 aprovados**. Cobrem a aba técnica, validação/salvamento pelo resolver real e proteção de callback/modal.
- [x] Vitest mobile, pela configuração `erp/vitest.mobile.config.ts` (`productCharacteristics.test.ts`, `mobileProductFormSchema.test.ts`, `technicalFieldInputRules.test.ts`): **61/61 aprovados**. Uma primeira tentativa do script móvel na raiz do repositório não encontrou o script; a execução foi repetida pela configuração móvel aprovada do pacote ERP, sem alterar dependências.
- [x] `git diff --check` passou; Git emitiu apenas avisos de normalização CRLF/LF em arquivos já modificados no workspace.
- [ ] O rótulo mobile foi verificado estaticamente, sem teste de renderer para o `*`; nenhum navegador Playwright autenticado ou runtime/aparelho nativo foi usado neste recorte. A última verificação protegida documentada redireciona `/products` para `/login`; não contornei a guarda. Expo Web não prova comportamento nativo.
- [ ] Não foram executados TypeScript integral, consulta/RPC/gravação remota, Supabase/PostgreSQL/Docker local ou operação de estoque. Nenhum procedimento operacional do estoquista mudou; PDFs do Guia Prático de Estoque não requerem atualização.

**Conclusão do recorte:** o app deixa de marcar os atributos da variação como obrigatórios de preenchimento na aba técnica, como o ERP e o contrato de catálogo/conciliação. O valor continua editável e o schema ainda rejeita linha de atributo incompleta ou combinação/SKU inválidos. O salvamento confirmado do modal ERP também voltou a completar seu fluxo. A auditoria global de Produtos continua aberta pelas pendências registradas em outros ciclos e pelas validações autenticada/nativa/backend.

### Ciclo 123 — reconciliação dos próximos recortes de preço/estoque — 24/10/2026

- [x] Conferidos os apontamentos históricos ainda abertos nos Ciclos 83–84 contra os ciclos posteriores: a reabertura/edição de preço promocional foi auditada no Ciclo 84; os estados de estoque e precificação foram percorridos nos Ciclos 85–95. Os próximos passos antigos foram atualizados com essas referências, sem alterar comportamento ou reclassificar como resolvidas as pendências de validação autenticada/nativa.
- [x] A exceção de preservação de promoção própria com preço de venda herdado continua registrada no Ciclo 83. A regra de `finalPurchasePrice` após entrada foi reconciliada no Ciclo 154: sem contrato adicional, preservar a implementação atual do ERP nos dois clientes. Nenhuma regra de negócio nova foi inferida.
- [x] O usuário reafirmou que a transição de família salva de duas variações para produto simples deve seguir a documentação; essa escolha já está implementada e verificada nos Ciclos 119 e 121 (ERP 12/12, mobile 8/8), sem nova alteração necessária.
- [x] Consultados os metadados das variáveis Vercel do projeto sem descriptografar valores: não há conta geral de teste identificada; as únicas variáveis com nome de credencial de operador são as do operador fiscal de homologação. Não usei credenciais fiscais para autenticar o ERP nem contornei `/login`.
- [x] A sessão local existente em `5173` foi aberta com Playwright visível e navegação a `/products`; a rota redirecionou para `/login`. Preservei os processos ativos nas portas `5173`/`3000`, não reiniciei a pilha, não submeti o formulário e não acessei dados de Produtos. `erp/vite.config.ts` confirma `port: 5173` e `strictPort: true`.
- [ ] Validação Playwright autenticada e em renderer/aparelho nativo segue pendente; Expo Web não comprova comportamento nativo.

### Ciclo 124 — atualização das categorias ao retomar a Conciliação nativa — 24/10/2026

**Recorte e achado pré-registrado antes da alteração:** atualizar a lista de categorias do filtro da tela nativa quando o app retorna ao primeiro plano, preservando a lista atual durante a consulta e indicando carregamento.

- [x] ERP (`CategoryAutocomplete.tsx`) refaz a consulta ao receber `window.focus` e mostra indicador durante a atualização. Mobile (`NativeProductReconciliationScreen.tsx`) consultava `fetchMobileCategories` somente ao montar; a lista podia ficar desatualizada após retorno do app em segundo plano e não havia indicador no seletor.
- [x] Estado de falha equivalente: os dois serviços capturam falhas de consulta de categorias e a UI não exibe erro próprio. O mobile usa fallback `[]` por timeout e erro absorvido em `fetchMobileCategories`; o ERP recebe dados ausentes, mantém a busca sem categorias e encerra o loading sem mensagem. Não há diferença comprovada que justifique alterar o feedback de erro neste ciclo.
- [x] Não foi encontrada particularidade documentada para manter categorias de filtro desatualizadas após retorno ao app. `docs/mobile/arquitetura_offline_first.md` não define esse estado como exceção; o caminho da Conciliação está sob estado nativo montado somente enquanto a tela está aberta.
- [x] `NativeProductReconciliationScreen` agora atualiza categorias quando `AppState` retorna de `inactive`/`background` para `active`, equivalente ao foco ERP; mantém as opções atuais durante a nova chamada, indica carregamento e ignora respostas antigas/desmontadas por revisão. O feedback de falha continua equivalente ao ERP.

#### Validação e limitações

- [x] Vitest mobile `mobileAppLifecycle.test.ts`: **4/4**; testa retomada de `inactive`/`background` e rejeita transições que não representam retorno ao primeiro plano.
- [x] `git diff --check` passou nos arquivos deste recorte; Git só emitiu avisos de normalização CRLF/LF.
- [ ] TypeScript integral mobile terminou não zero por erros globais em `DistanceInput`, `MeasurementInput`, `useAgendaData`, fila/hooks de inventário, edição de movimentação, assistente financeiro, configuração Vitest e utilitários compartilhados de agenda/IA. Nenhum erro aponta para `NativeProductReconciliationScreen.tsx` ou `mobileAppLifecycle.ts`.
- [ ] Playwright visível continua em `/login`; não foi possível comparar visualmente a Conciliação autenticada, e nenhum renderer/aparelho nativo foi usado. Expo Web não prova comportamento nativo. Nenhuma consulta ou escrita de produto foi executada.
- [x] Regras consultadas: `AGENTS.md`, `docs/geral/USER_RULES.md`, documentação de estrutura de produto/variação, operação mover/merge, particularidades mobile e inventário/roadmap. O único arquivo de regra disponível em `rules/` regula escrita de movimento de estoque e não se aplica. Não há `AGENTS.md` em `mobile/`. A skill canônica `erp-web-to-mobile-replication` não está nos diretórios atuais de skills; a cópia de cache previamente localizada foi usada somente como orientação.

**Conclusão do recorte:** categorias do filtro nativo são atualizadas quando a tela retorna ao primeiro plano, com indicador de carga e proteção contra respostas obsoletas. O tratamento de falha continua equivalente ao ERP. A prova visual autenticada e a validação nativa permanecem pendentes.

### Ciclo 125 — agendamento recorrente da auditoria — 24/10/2026

- [x] O usuário havia solicitado execução automática a cada duas horas. A automação heartbeat existente estava a cada dez minutos; foi atualizada para duas horas, preservando ID, thread, nome, prompt e status ativo. O metadado local confirma `RRULE:FREQ=HOURLY;INTERVAL=2`; as notificações ficam restritas a falhas. A auditoria de paridade continua aberta e o inventário segue como ponto de retomada.

### Ciclo 126 — pesquisa de SKU de variação na Conciliação — 24/10/2026

**Recorte:** busca textual na Conciliação de Produtos. ERP e app usam os mesmos filtros/copy e a query compartilhada; corrigir a promessa “Nome, SKU ou código” sem alterar os demais critérios de pendência.

- [x] Inspecionados os campos do formulário e ambos os clientes: ERP (`ReconciliationFiltersBar.tsx`) e app (`NativeProductReconciliationScreen.tsx`) apresentam o mesmo placeholder e delegam para `fetchProductsForReconciliationWithClient`. Antes, o predicado compartilhado cobria apenas nome/código do pai, apesar de carregar `product_variations.sku` para os cards.
- [x] A query comum agora resolve os IDs de produto pai por `product_variations.sku ilike`, limitado a `PRODUCT_VARIATION_SEARCH_MATCH_LIMIT + 1` do helper de busca de produtos. Exceder o limite falha com a mensagem compartilhada de termo amplo; uma lista parcial não é apresentada como resultado completo. Os IDs encontrados entram no OR de nome/código e o mesmo caminho é usado em “selecionar todos filtrados”. Filtros de fornecedor, categoria e pendência permanecem combinados com a busca, e o payload de cada card conserva todas as variações do produto.
- [x] O contrato já é consumido por ERP e mobile por wrappers finos; nenhuma regra específica foi duplicada em tela. Foram adicionadas regressões para SKU encontrado no resultado paginado e na seleção completa e para bloqueio de consulta acima do limite.
- [x] Regras e documentação consultadas antes da alteração: `AGENTS.md`, `docs/geral/USER_RULES.md`, documentação vigente de produto/variação e mover/merge, inventário, roadmap e `rules/` (a regra de escrita de movimento de estoque não se aplica à busca). Não há `AGENTS.md` adicional em `shared-utils/`, `erp/` ou `mobile/`. A skill canônica `erp-web-to-mobile-replication` continua não localizada em `.agents/skills`/`skills`; a cópia `.vercel` registrada no inventário foi usada somente como orientação.
- [x] Vitest ERP `reconciliationQueries.test.ts`: **9/9**. A suíte usa client mockado; nenhuma consulta, RPC, fixture, dado ou gravação remota ocorreu. `git diff --check` foi executado nos arquivos do recorte. Não mudou o procedimento operacional do estoquista, então os PDFs do guia não precisam de atualização.
- [ ] Playwright autenticado ainda é bloqueado pelo redirecionamento `/products` → `/login`; o app não foi validado em renderer/aparelho nativo. A mudança não altera a UI, e Expo Web não comprova comportamento nativo. Nenhum contorno de guarda foi feito.

**Conclusão do recorte:** a busca por SKU próprio de variação agora retorna o produto pai na Conciliação e seleciona o conjunto completo compatível com o filtro em ambos os clientes. A contagem/paginação compartilhada do Ciclo 105 continua pendente da escolha de contrato.

### Ciclo 127 — Conciliação de Produtos exclusiva do ERP — 24/10/2026

**Decisão de escopo:** o usuário definiu que a Conciliação deve permanecer no ERP e sair do aplicativo, com uma regra permanente para evitar nova replicação.

- [x] Antes da mudança, foram conferidos a tela nativa e todos os consumidores mobile. A funcionalidade tinha uma tela, card de edição individual, barra/modal de operações em lote, adaptador de serviço, entrada no menu do cabeçalho e CTA para perfis sem outros modos de Produto. `viewProductReconciliation` também podia, sozinha, expor o módulo Produtos no app.
- [x] Removidos do mobile a tela e seus componentes, o adaptador específico, os utilitários de foreground usados somente pela tela, os testes exclusivos do serviço/seleção/lote e os pontos de entrada no `NativeProductsScreen` e `ProductsHeaderMenuDropdown`. A agregação de módulos mobile deixou de usar a permissão de Conciliação como porta de entrada.
- [x] Arquivos removidos: `NativeProductReconciliationScreen.tsx`, `NativeProductReconciliationCard.tsx`, `NativeProductReconciliationBatchBar.tsx`, `NativeProductReconciliationBatchModal.tsx`, `mobileProductReconciliationService.ts` e seu teste, `productReconciliationSelection.test.ts`, `productReconciliationBatchSchema.test.ts` e `mobileAppLifecycle.ts`/teste. Arquivos de exposição alterados: `NativeProductsScreen.tsx`, `ProductsHeader.tsx`, `ProductsHeaderMenuDropdown.tsx`, `authProfilePermissions.ts` e seu teste.
- [x] Mantidos sem alteração a rota/telas ERP, a definição compartilhada da permissão, as queries, mutações, schemas e seleção comuns consumidos pelo ERP. Em particular, a busca de SKU do Ciclo 126 continua valendo para a Conciliação ERP. Nenhum endpoint, contrato de dados, estoque, operação remota ou autorização do ERP foi alterado.
- [x] Criada a regra de código `rules/products/product-reconciliation-erp-only.yml`: nomes de telas/componentes/adaptadores e pontos de entrada de Conciliação no diretório de Produtos mobile geram erro. A automação recorrente também recebeu uma instrução explícita para preservar esta exceção e nunca tratá-la como pendência de paridade.
- [x] A decisão substitui a necessidade de escolher um contrato de paginação para o app no Ciclo 105. O defeito compartilhado de contagem/janelas sobrepostas permanece apenas como questão técnica da Conciliação ERP; este ciclo não o corrigiu nem altera o ERP.
- [x] Regras consultadas: instruções fornecidas do `AGENTS.md` raiz, `docs/geral/USER_RULES.md`, `rules/stock/no-inventory-move-write-in-ui.yml`, regra da skill `safe-refactor`, documentação de estrutura de produto/variação e mover/merge, inventário, roadmap e notas disponíveis em `docs/produtos/`/`docs/mobile/`. Não existe `AGENTS.md` adicional em `mobile/` ou `rules/products/`. A skill de replicação continua acessível somente na cópia em cache `.vercel`, não tratada como canônica.
- [x] Vitest da agregação de permissões mobile: `authProfilePermissions.test.ts`, **4/4**. O novo teste confirma que a permissão `viewProductReconciliation` continua reconhecida para o guard ERP, mas sozinha não expõe o módulo Produtos no app.
- [x] A regra ast-grep foi executada diretamente em 110 arquivos de Produtos/auth mobile sem ocorrências. Fixtures temporários de nome de componente e rota de conciliação foram detectados como erros pela regra e removidos em seguida; nenhum arquivo de fixture permaneceu no workspace.
- [x] Vitest ERP para a conciliação preservada: **45/45** em 5 arquivos (tela, card, consultas, mutações e operações em lote). Nenhuma chamada ou gravação remota ocorreu.
- [ ] TypeScript completo mobile terminou com código 2 e 22 diagnósticos globais em outros módulos/configuração compartilhada; nenhum aponta para os arquivos de entrada mobile alterados (`NativeProductsScreen`, cabeçalho ou `authProfilePermissions`).
- [ ] Não foi feita validação visual autenticada nem de runtime nativo. Não há mais entrada de Conciliação no código mobile; a prova de navegação visual segue limitada pelo estado de autenticação do ambiente. Expo Web não provaria comportamento nativo.
- [x] A remoção não altera os procedimentos de movimentação, contagem ou ajustes do estoque. O guia prático do estoquista não precisou de atualização.

**Conclusão do recorte:** o aplicativo já não oferece Conciliação de Produtos e a regra persistente bloqueia a volta de telas/serviços/entradas mobile. A Conciliação do ERP e o código compartilhado que ela usa foram preservados. A auditoria geral de Produtos continua em andamento nas demais abas e estados.

### Ciclo 128 — atributos obrigatórios e opcionais na configuração de categoria — 24/10/2026

**Achado pré-registrado antes da alteração:** a configuração ERP persiste `category_attributes.is_required` e oferece um controle por atributo selecionado para alternar obrigatório/opcional; nomes globais obrigatórios são fixos e Peso fica sempre opcional. O app não representa `isRequired` no estado nem no formulário e salvava toda seleção como obrigatória, exceto Peso. Na edição, a consulta mobile também omitia `is_required`; adicionalmente, absorvia erros como lista vazia, permitindo salvar e apagar vínculos existentes quando a leitura falhava.

- [x] Extraído para `shared-utils/categoryAttributeSelection.ts` o schema Zod explícito e as regras compartilhadas de nomes fixos, estado inicial, bloqueio do controle e persistência. ERP e app agora usam a mesma política: Cor, Modelo, Marca, dimensões, Comprimento e nomes Modelo/Linha predefinidos são obrigatórios; Peso permanece opcional; atributos comuns mantêm o estado escolhido.
- [x] No ERP, modal e serviço passaram a consumir o contrato/helper compartilhado sem mudar a experiência já existente. A validação de formulário continua em `useZodForm`/`zodResolver` antes do serviço.
- [x] No mobile, `CategoryAttributesPicker` agora oferece `Switch` acessível para alternar atributos comuns e mostra as seleções/configurações em uma seção independente da lista do catálogo; seleções permanecem visíveis se a consulta do catálogo falhar. Campos fixos não permitem estado incompatível e Peso permanece opcional.
- [x] `fetchMobileCategoryAttributes` lê também `category_attributes.is_required` e retorna vínculos obrigatórios e opcionais com a política compartilhada. Erros agora chegam ao hook; falha ao carregar a configuração marca o estado de erro e o resolver impede salvar a categoria. `saveMobileCategory` recebe seleções tipadas completas, deduplica por ID como o ERP e persiste `is_required` sem transformar atributos opcionais em obrigatórios.
- [x] Alinhada a lista de novas opções: `isCategoryAttributeSelectable` é compartilhada entre `AttributeAutocomplete` ERP e `CategoryAttributesPicker` mobile e exclui Reclinável/Linha/Modelo. A lista de selecionados continua separada e exibe vínculos existentes desses nomes para remoção/consulta, sem removê-los silenciosamente. Modelo/Linha permanece selecionável conforme o ERP.
- [x] O schema RHF/Zod do cadastro/edição mobile usa o contrato Zod compartilhado e continua bloqueando nome/vínculos inválidos antes da chamada de serviço. O fluxo de ambiente permanece igual.
- [x] Vitest mobile: `categoryEnvironmentServices.test.ts`, `categoryEnvironmentRules.test.ts` e `categoryAttributeSelection.test.ts`, **47/47**. Vitest ERP: `useCategoriesAndEnvironments.test.tsx`, **8/8**. Os testes cobrem ida e volta do `is_required`, Peso forçado opcional, nomes globalmente obrigatórios, atributos excluídos de novas opções, persistência opcional e erro de consulta não absorvido.
- [x] `git diff --check` aprovado (avisos apenas de normalização CRLF já presentes nos arquivos). TypeScript integral mobile e ERP terminam com código 2 por diagnósticos globais fora dos arquivos deste recorte; a filtragem encontrou zero diagnóstico nas áreas de helper/schema compartilhado, autocomplete ERP, serviço/formulário mobile e tela/modal/hook de categorias.
- [ ] A suíte mobile não permite um teste RTL do hook neste ambiente: `@testing-library/react` não está resolvível a partir da raiz de testes do app. Não foi adicionada dependência nem contornada a configuração; os contratos de serviço/schema passaram em Vitest. Playwright autenticado não foi executado neste ciclo e a navegação visual permanece limitada ao estado de login já registrado; Expo Web não prova runtime nativo.
- [x] Nenhuma consulta, RPC ou gravação remota ocorreu. A mudança é de cadastro de Produtos/Categorias, sem alteração do procedimento operacional de estoque; o guia PDF do estoquista não requer atualização.
- [x] Evidência consultada: `docs/negocio/produtos/estrutura-produto-variacao.md` define `category_attributes` como fonte da obrigatoriedade, sem alterar os valores já presentes nas variações. Código ERP em `CategoryEnvironmentModal.tsx` e `categoryService.ts`; código mobile em `CategoryAttributesPicker.tsx`, `useCategoryFormModal.ts` e `mobileCategoryService.ts`.
- [x] Antes da edição, foram lidos `AGENTS.md` raiz, `docs/geral/USER_RULES.md`, a documentação vigente de estrutura/variações e operações de troca de pai/merge, `docs/mobile/arquitetura_offline_first.md`, o inventário e roadmap. Não há `AGENTS.md` dentro de `erp/`, `mobile/` ou `shared-utils/`. Nenhuma regra aplicável adicional em `rules/` altera a configuração de categoria. A skill de replicação continua disponível apenas na cópia em cache `.vercel`, não tratada como canônica; não foi encontrada em `.agents/skills` ou nos diretórios de skills pesquisados.
- [x] Achado adicional pré-registrado antes da segunda edição do recorte: o `AttributeAutocomplete` ERP exclui `Reclinável`, `Linha` e `Modelo` das opções de novos vínculos, enquanto a lista mobile os mostrava. A correção filtrará somente novas opções e preservará/mostrará vínculos existentes na seção separada de selecionados.

**Conclusão do recorte:** configuração e seleção de atributos da categoria agora têm o mesmo contrato, regras fixas e opções elegíveis no ERP e app; falhas de leitura não apagam a configuração existente e vínculos legados ocultos da lista de adição continuam visíveis/preservados. Continua aberta a auditoria global de Produtos e a validação autenticada/nativa.

### Ciclo 129 — indicador de obrigatoriedade na aba técnica do produto pai — 24/10/2026

**Achado pré-registrado antes da mudança:** a aba técnica mobile mostra `*` nos campos marcados como obrigatórios do produto pai. A aba ERP (`ProductTechnicalTab` → `TechnicalFieldRow`) não mostra esse indicador nos rótulos. A condição mobile não exige valor por schema nesta aba; este ciclo limitar-se-á à apresentação do rótulo e manterá inalteradas seleção/ordem de campos, aplicabilidade, bloqueios, valores, validação RHF/Zod e payload.

- [x] Confirmada a diferença lendo a linha ERP: ela renderiza nome/unidade e o controle contextual, mas não acrescenta asterisco; erros reais continuam comunicados por estado de validação próprio. O mobile acrescentava o asterisco ao rótulo do produto pai. Não há particularidade mobile documentada que justifique o indicador extra; o contrato de atributos por categoria continua dizendo que valores ausentes ficam como pendências, sem geração automática.
- [x] Removido somente o asterisco do rótulo na aba técnica mobile. Mantidos predicados de obrigatoriedade usados para agrupar campos, controlar aplicabilidade e restringir escopos; sem alteração do formulário, validação RHF/Zod, valores ou chamadas/payload.
- [x] Consultadas as regras e referências antes da mudança: `AGENTS.md` raiz, `docs/geral/USER_RULES.md`, este inventário/roadmap, documentação vigente de produto/variação e operações de mover/merge, nota `docs/mobile/arquitetura_offline_first.md` e regras em `rules/`. Não há `AGENTS.md` aplicável dentro de `erp/`, `mobile/` ou `shared-utils/`; a varredura apontou apenas cópias de build em `.vercel`. A skill de replicação continua disponível somente na cópia de cache registrada acima; foi usada como orientação, não como fonte canônica.
- [x] `git diff --check` nos arquivos deste recorte passou; Git mostrou apenas avisos de normalização CRLF/LF. Não foi executado teste automatizado neste ciclo; validação de UI autenticada segue pendente porque a rota protegida redireciona para `/login`, e não foi usado renderer/aparelho nativo. Expo Web não comprova comportamento nativo.
- [x] Nenhuma consulta ou gravação remota foi feita; a tela continua na política de formulário existente e não alterou procedimento do estoquista, então os PDFs do Guia Prático de Estoque não requerem atualização.

**Conclusão do recorte:** o rótulo técnico do produto pai mobile não anuncia mais obrigatoriedade visual que a aba ERP não apresenta. Regras de seleção e dados permanecem inalterados. A auditoria global segue em andamento pelas pendências dos demais ciclos e validações autenticada/nativa/backend.

### Ciclo 130 — contrato de persistência dos atributos exigidos pela categoria — 24/10/2026

**Recorte:** leitura e gravação dos valores técnicos do produto simples e das variações de uma família, limitado à divergência entre a documentação de domínio e os writers atuais.

**Retificação após resposta do usuário:** projetar para `product_variations.attributes` somente valores técnicos preenchidos e exigidos, manter `technical_specs`/`variationDetails` por compatibilidade, preservar atributos existentes quando a exigência da categoria for removida e usar `showName: false` nos novos atributos projetados sem identidade.

- [x] Confirmado no documento vigente que `category_attributes` define a obrigatoriedade e que o valor efetivo deve ficar em `product_variations.attributes`, inclusive na variação única. Valores ausentes não são preenchidos; devem continuar detectáveis como pendências.
- [x] ERP e mobile atualmente persistem `product.technicalValues` e cópias de `variation.technicalValues`/`variationDetails` em `products.technical_specs`. Os dois writers serializam `product_variations.attributes` a partir de `variation.attributes`; os mappers leem o JSON de `technical_specs` para hidratar valores técnicos e não os projetam nos atributos da variação. Portanto, a divergência do Ciclo 39 permanece no ERP e no app, não é apenas falta de paridade entre clientes.
- [x] A divergência afeta mais que o local de armazenamento: `product_variations.attributes` também alimenta nome automático (`showName`), detecção de combinações duplicadas e as consultas/ações da Conciliação ERP. Uma projeção indiscriminada dos campos técnicos pode mudar nomes, unicidade e resultados da conciliação; remover um vínculo de categoria não pode apagar um valor já gravado no atributo.
- [x] Revisitados os pontos de entrada de leitura/gravação em `productMapper.ts`, `productVariationMapper.ts`, `productPersistenceService.ts`, `ProductTechnicalTab`/formulário, `mobileProductFetchService.ts` e `mobileProductMutationService.ts`, além dos consumidores de atributos em `shared-utils/productVariationNameValidation.ts`, `mobile/src/features/products/domain/productRegistrationRules.ts` e serviços compartilhados de Conciliação. O app não tem tela própria de Conciliação desde o Ciclo 127; essa exceção ERP-only permanece vigente.
- [x] Regras/documentos consultados antes do registro: `AGENTS.md`, `docs/geral/USER_RULES.md`, inventário e roadmap, `docs/negocio/produtos/estrutura-produto-variacao.md`, operações mover/merge, `docs/mobile/arquitetura_offline_first.md`, regra persistente ERP-only e skill de replicação disponível apenas no cache `.vercel` (usada como orientação, não como fonte canônica). Nenhum `AGENTS.md` específico existe nos diretórios `erp/`, `mobile/` ou `shared-utils/`.
- [x] **Decisão do usuário recebida:** projetar em `product_variations.attributes` somente valores preenchidos e exigidos, manter `technical_specs`/`variationDetails` por compatibilidade, preservar valores/atributos existentes quando a exigência de categoria for removida e usar `showName:false` nos novos atributos projetados sem identidade. A implementação em ambos os writers foi separada para o Ciclo 139 após auditoria dos consumidores; nenhuma alteração de payload foi feita durante este registro da decisão.
- [ ] Não houve teste, consulta ou gravação remota neste recorte de auditoria estática. Sem validação visual autenticada ou em runtime nativo; Expo Web não provaria comportamento nativo.

**Conclusão do recorte:** existe uma divergência real entre o contrato documentado e ambos os writers. O formato de `attributes` possui efeitos colaterais em nome, unicidade e Conciliação; o usuário autorizou uma projeção somente de valores preenchidos e exigidos, com compatibilidade e preservação, para implementação separada no Ciclo 139. Nenhuma projeção de payload foi introduzida durante a auditoria/decisão do Ciclo 130.

### Ciclo 131 — reafirmação da Conciliação ERP-only — 24/10/2026

- [x] Em resposta à pergunta sobre paginação da Conciliação, o usuário determinou manter o recurso somente no ERP, removê-lo do app e impedir sua reintrodução. Isso reafirma a decisão já aplicada no Ciclo 127; a ausência da tela mobile não é pendência de paridade.
- [x] Conferidos `rules/products/product-reconciliation-erp-only.yml` e a automação recorrente ativa de duas em duas horas: ambos já proíbem a reintrodução e preservam explicitamente a superfície ERP. Para tornar a regra disponível a qualquer agente do repositório, ela também foi registrada na seção 12 do `AGENTS.md` raiz.
- [x] Retificadas referências antigas do roadmap/inventário que ainda listavam a implementação React Native ou a validação visual da Conciliação como trabalho mobile pendente. A decisão não altera o defeito de contagem/paginação, que continua uma questão técnica exclusiva do ERP.
- [x] A pergunta do Ciclo 130 sobre armazenar valores técnicos globais em `product_variations.attributes` versus `technical_specs` permanece separada e sem resposta; esta escolha sobre a Conciliação não a resolve.
- [x] Retificação posterior: a resposta do usuário chegou após este ciclo e escolheu a projeção compatível descrita no Ciclo 130; implementação autorizada como próximo recorte do Ciclo 139.
- [x] Nenhum código funcional foi alterado neste ciclo. A remoção mobile já estava aplicada no Ciclo 127; não houve execução de teste, Playwright, consulta/gravação remota ou validação nativa. Foi feita apenas verificação estática do estado das regras e da automação, seguida de `git diff --check`.

**Conclusão do recorte:** a decisão está persistida no `AGENTS.md`, na regra de código, no prompt recorrente e neste inventário. A Conciliação deve continuar existindo no ERP, mas não deve voltar ao aplicativo sem um novo pedido explícito.

### Ciclo 132 — resumo do Catálogo Meta no mobile — 24/10/2026

**Achado pré-registrado antes da alteração:** a rota ERP `/products/meta-catalog`, protegida por `viewMetaCatalog`, mostra contagens de produtos simples publicados, variações publicadas e itens não publicados. O app oferece o mesmo acesso por `viewMetaCatalog`, mas o handler abre essa rota em navegador externo; não há tela nativa nem nota documentada justificando essa diferença.

- [x] ERP: o resumo vem de `fetchMetaCatalogStats`, que lê status de `products` e `product_variations` e aplica `calculateMetaCatalogStats`. A tela mostra reticências durante a leitura e valores depois da resposta; em falha, registra console e deixa os zeros iniciais, sem estado de erro explícito.
- [x] Mobile: `NativeProductsScreen` e o menu de Produtos expõem `handleOpenMetaCatalog`, mas ele somente chama `Linking.openURL`. O serviço `mobileProductMetaCatalogSyncService` já reutiliza payloads compartilhados e executa sincronização automática por produto; esse serviço não implementa o estado de resumo da página.
- [x] Contratos compartilháveis: o cálculo de contagens é puro, mas até aqui vive dentro do diretório ERP. `shared-utils/metaCatalogPayload.ts`, `productMetaCatalogSyncItems.ts` e `metaCatalogBatchPayload.ts` são compartilhados. A permissão de leitura do app já é `viewMetaCatalog` com perfil mínimo `manager`, equivalente ao guard da rota ERP.
- [x] Nenhuma particularidade em `docs/mobile/` ou `docs/produtos/` define a tela de resumo como ERP-only. `AGENTS.md` diz que o feed CSV antigo não é fonte vigente de sincronização/remoção; este recorte fica limitado ao resumo de leitura e preserva um link explícito para abrir o painel ERP completo. Nenhum pedido para remover produto da Meta será executado.
- [x] Extraído o cálculo puro sem alterar seus critérios para `shared-utils/metaCatalogStats.ts`; o módulo ERP continua importando pelo caminho anterior, agora reexportado para manter seus consumidores. O serviço mobile `mobileMetaCatalogStatsService.ts` lê as mesmas colunas de produtos/variações com timeout de 15 s e sem chamadas de escrita.
- [x] `NativeMetaCatalogScreen.tsx` mostra os três totais, loading, atualização por botão/gesto, erro com repetição e mantém o acesso externo ao painel ERP completo. A tela segue o mesmo gate `viewMetaCatalog` do menu e da rota ERP. Nenhuma sincronização Graph, download CSV, consulta de status Meta ou remoção de produto foi executada.
- [x] `git diff --check` passou após o ajuste final. TypeScript mobile foi executado (`tsc -p tsconfig.json --noEmit --pretty false`) e terminou não zero por diagnósticos globais existentes em `DistanceInput`, financeiro, assistente de características, geração de variações, estoque, agenda/configuração Vitest e tipos compartilhados. Nenhum diagnóstico apontou para os arquivos deste ciclo.
- [ ] Não foram adicionados nem executados testes, conforme a restrição desta execução. Não houve Playwright autenticado nem validação no renderer/aparelho nativo; Expo Web não comprovaria o comportamento nativo. A consulta ao Supabase não foi executada em runtime e nenhum dado foi gravado.
- [x] O próximo estado — ação manual de sincronização via Graph API — foi auditado e replicado no Ciclo 133, sem executar a ação. A revisão em separado do feed CSV/instruções antigas permanece pendente: `AGENTS.md` determina que o CSV legado não é fonte de sincronização/remoção nem confirmação de remoção da Meta.

**Conclusão do recorte:** o estado de resumo antes acessível no app somente por navegador agora tem tela nativa de consulta, com o mesmo cálculo ERP compartilhado e estados de espera, atualização e erro recuperável. A paridade completa do Catálogo Meta continua aberta para os estados de sincronização manual e instruções compatíveis com a regra vigente de catálogo.

### Ciclo 133 — sincronização manual Meta via Graph API — 24/10/2026

**Achado pré-registrado antes da alteração:** a rota ERP `/products/meta-catalog` oferece uma ação administrativa de sincronização completa via `items_batch`. A tela nativa adicionada no Ciclo 132 tinha resumo e acesso ao ERP, mas não replicava o envio manual, o progresso por lote nem o tratamento de falhas.

- [x] ERP: `MetaCatalog/index.tsx` só habilita a ação para `isAdmin`, carrega fontes de produtos/variações/oportunidades em `metaCatalogDataService.ts`, monta itens por `buildMetaCatalogItems` compartilhado e chama `syncBatchProductsToCatalog`. O serviço usa `META_CATALOG_BATCH_LIMIT` (50), o payload compartilhado, avança progresso depois de cada resposta HTTP sem erro e devolve `handles`; a tela não consulta o status final desses handles.
- [x] Mobile: criado `mobileMetaCatalogSyncService.ts`, que chama o mesmo builder do ERP, lê todas as páginas de produtos e variações em ordem de ID (500 por página, timeout de 15 s), e busca apenas oportunidades referenciadas em blocos. Falha ao ler produto/variação interrompe a ação; falha de oportunidade é não bloqueante, como no ERP.
- [x] O envio manual reutiliza o transporte autenticado já existente em `mobileProductMetaCatalogSyncService.ts`, com `sync_catalog_batch`, o payload comum `buildMetaCatalogBatchPayload`, lote máximo de 50 e timeout de 20 s. O envio automático por produto também passou a usar o mesmo helper de lotes. O progresso mobile indica itens aceitos nas respostas do proxy, e o texto não afirma que o processamento assíncrono na Meta terminou.
- [x] `NativeMetaCatalogScreen.tsx` agora apresenta botão manual somente habilitado para administrador, bloqueio redundante no serviço, progresso e percentual, mensagem de conclusão, erro recuperável e orientação para conferir o catálogo Meta antes de repetir após uma resposta incerta. Após sucesso, atualiza o resumo. A ligação usa o `isAdmin` do `AuthContext`; a rota de entrada continua sob `viewMetaCatalog`.
- [x] Proxy conferido: `planMetaGraphRequest('sync_catalog_batch')` continua usando o proxy autenticado `/api/meta-graph` e autorização `productConfig`, como a ação ERP existente. A UI ERP e mobile restringem a ação a administradores; esta alteração não muda o contrato/API do proxy. O endpoint de status assíncrono não é chamado pelo ERP e continua fora deste recorte.
- [x] A exceção do CSV legado em `AGENTS.md` foi respeitada: a nova ação envia pelo Graph API e não usa feed CSV como fonte nem como prova de remoção.
- [x] `git diff --check` passou. O TypeScript mobile (`npx tsc -p tsconfig.json --noEmit --pretty false`) encerrou com erros globais existentes em arquivos de distância/medição, financeiro, assistente IA e geração de variações, ações de variação, agenda, estoque, configuração do Vitest e tipos compartilhados. Nenhum erro foi apontado nos arquivos deste ciclo.
- [ ] Não foram adicionados nem executados testes. Não houve Playwright autenticado ou execução no aparelho/renderer nativo. Não foram feitas consultas Supabase em runtime, chamadas à Meta, downloads CSV ou gravações externas.
- [ ] Limitações: as páginas são leituras sequenciais e não formam um snapshot transacional único; a Meta pode continuar processando `handles` após o progresso chegar a 100%; após timeout, o lote pode ter sido aceito mesmo sem resposta. A tela aconselha verificar o catálogo antes de repetir, mas não implementa consulta de status. O proxy continua autorizando `productConfig` no backend, igual ao contrato ERP; o gate `isAdmin` permanece na UI em ambos os clientes.
- [x] O feed CSV e os textos/instruções do painel Meta foram revistos no Ciclo 134. A seção do feed ainda presente nas Configurações ERP é outro estado e continua pendente; a rota do catálogo digital foi mantida no código, sem validação externa de configuração do Commerce Manager.

**Conclusão do recorte:** a ação manual e o progresso por lote foram levados à tela nativa usando o mesmo builder e payload compartilhados do ERP, com gate administrativo, timeouts e feedback para sucesso/falha. A chamada real à Meta e a conclusão assíncrona não foram validadas. O restante do painel ainda requer auditoria.

### Ciclo 134 — feed CSV legado no painel Catálogo Meta — 24/10/2026

**Achado pré-registrado antes da alteração:** `AGENTS.md` determina que o CSV antigo não é mais fonte de sincronização e não comprova remoção no catálogo da Meta. Apesar disso, `MetaCatalog/index.tsx` ainda oferecia copiar/baixar o CSV, instruía cadastro de atualização programada diária/horária e dizia que ocultar/inativar produto removia o item do CSV.

- [x] A tela ERP agora removeu os controles de copiar/baixar CSV, o link público e o passo a passo de configuração. O antigo bloco de inclusão/removal por CSV foi retirado porque contradizia o fluxo vigente e poderia ser lido como confirmação de remoção externa.
- [x] O painel substituiu esse conteúdo por aviso explícito: a rota CSV permanece no código do catálogo digital, mas não deve ser configurada como fonte de sincronização; usar Graph API; verificar publicação/remoção diretamente no Catálogo Meta pelo `retailer_id`/SKU. O subtítulo do painel também não apresenta mais o CSV como fluxo ativo.
- [x] No app, `NativeMetaCatalogScreen` não tinha ação CSV própria: oferece resumo, sincronização Graph e acesso à página ERP. Esse acesso foi preservado; agora a página ERP abre o aviso vigente em vez de instruções antigas.
- [x] Fontes conferidas: `digital-catalog/src/app/api/facebook-catalog.csv/route.ts`, alias `/api/facebook-catalog`, rewrite em `next.config.ts` e `facebook-catalog-feed/feed-service.ts` continuam implementados. Não foram removidos nem chamados. A UI de Configurações em `WhatsAppConfigSection.tsx` ainda expõe o link CSV e fica como estado distinto a revisar no próximo ciclo.
- [x] `git diff --check` passou. O TypeScript completo ERP terminou não zero com extensa saída de diagnósticos da base; o filtro por `MetaCatalog` encontrou somente erro no teste não alterado `services/metaCatalogBatchSync.test.ts` (`mock.calls` sem o segundo argumento), sem diagnóstico em `MetaCatalog/index.tsx`. A verificação não executou testes.
- [ ] Nenhum download do CSV, request remoto, Playwright autenticado, chamada Graph API ou consulta ao Commerce Manager foi feito. Não é possível confirmar se ainda existe feed programado no catálogo Meta externo; o endpoint público continua no código por compatibilidade, sem afirmar que está desconectado externamente.
- [ ] Próximo estado: revisar em Configurações a seção `Catálogo Meta (Feed CSV)`, incluindo copiar/baixar e sua mensagem de uso. Também verificar outras instruções do feed no app/ERP e manter a rota em código até haver decisão sobre seu descomissionamento e eventual configuração externa.

**Conclusão do recorte:** o painel principal não recomenda mais o feed CSV como sincronização e não atribui ao CSV a confirmação de remoção na Meta. Naquele ciclo, a seção de Configurações ainda aguardava auditoria separada; a configuração externa do Commerce Manager não foi consultada.

### Ciclo 135 — orientação do Catálogo Meta nas Configurações — 24/10/2026

**Achado pré-registrado antes da mudança:** `WhatsAppConfigSection.tsx` ainda apresentava copiar/baixar o feed CSV e recomendava cadastrá-lo como Data Feed agendado no Commerce Manager, em desacordo com a regra vigente de que o CSV legado não é fonte da sincronização nem prova publicação/remoção.

- [x] Removidos dessa seção o link CSV, os controles copiar/baixar e a instrução de atualização automática. No lugar, a tela informa que a sincronização disponível é manual via Graph API em Produtos → Catálogo Meta e instrui conferir publicação/remoção diretamente no catálogo Meta por `retailer_id` ou SKU.
- [x] Preservados o campo `Catalog ID`, a seção de descrição configurável, a página ERP e a rota CSV pública em código. O app já não tinha uma ação/feed CSV nessa tela: ele usa a sincronização manual Graph API do Ciclo 133 e mantém o acesso ao painel ERP.
- [x] A busca nas superfícies de Produtos ERP/mobile não encontrou outra orientação ou ação de feed CSV; os controles identificados estavam nesta configuração e no painel coberto pelo Ciclo 134. A rota Next.js e os serviços do feed continuam inalterados.
- [x] Regras e referências lidas antes da edição: `AGENTS.md` (feed antigo; Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, inventário/roadmap, documentação de variações e mover/merge, `docs/mobile/arquitetura_offline_first.md`, código do painel ERP e código Graph API ERP/mobile. A skill `erp-web-to-mobile-replication` foi lida na cópia encontrada sob `erp/.vercel/.../node_modules`; não foi localizada cópia canônica em `.agents/skills` do repositório nem em `C:\Users\mathe\.agents\skills`/`C:\Users\mathe\.codex\skills`.
- [ ] `git diff --check` e validação estática ainda pendentes. Não foram executados testes, Playwright autenticado, downloads/requisições do CSV, sincronização Graph API, consulta ao Commerce Manager ou gravação externa.
- [ ] Não se verificou se existe Data Feed agendado na conta Meta externa. A permanência da rota no código não indica que ela esteja conectada/desconectada no Commerce Manager.
- [ ] Achado separado para auditoria: a descrição `channelBaseDescriptions.whatsapp` continua dizendo que será inserida antes da descrição dos itens; no código inspecionado, o builder Graph usa `META_CATALOG_GLOBAL_PREFIX` e a descrição do próprio produto. O campo configurável não apareceu como consumidor no ERP/mobile/shared-utils pesquisados; preservado neste ciclo para evitar alterar outra configuração sem auditar seu contrato.

**Conclusão do recorte:** nenhuma superfície de Produtos ERP/mobile inspecionada recomenda usar CSV como fonte ativa. A seção de Configurações agora aponta à Graph API e à verificação direta na Meta. Rota e configuração externa não foram alteradas; auditoria global de Produtos continua aberta.

### Ciclo 136 — contrato de `channelBaseDescriptions.whatsapp` — 24/10/2026

**Achado pré-registrado:** o Ciclo 135 deixou pendente a descrição do campo: ela prometia inclusão automática no Catálogo Meta, mas o builder Graph consultado lê a descrição do produto e `META_CATALOG_GLOBAL_PREFIX`.

- [x] Busca por `channelBaseDescriptions` fora de `node_modules`, `.vercel` e `.git` encontrou o campo em schema/defaults, no editor `WhatsAppConfigSection` e em `ChannelDescriptionsSection`; não apareceu consumidor no serviço/gerador Graph. A tela mobile do Catálogo Meta não lê essa configuração e sua sincronização envia dados construídos dos produtos pelo helper compartilhado.
- [x] O payload Graph foi inspecionado: a descrição vem de `whatsapp_description`/`description` do produto, precedida por `META_CATALOG_GLOBAL_PREFIX`; o texto editável de configurações não é passado ao builder. `ChannelDescriptionsSection.tsx` também não é renderizado na tela ativa `Settings/index.tsx`, mas seu conteúdo genérico continua sendo uma referência de UI não conectada.
- [x] Corrigido somente o texto do campo ativo em `WhatsAppConfigSection.tsx`: identificado como configuração legada, informa que não altera o payload Graph atual e orienta atualizar a descrição do produto. A textarea e o valor persistido permanecem intactos. Nenhum schema, submissão ou payload foi alterado; a gravação de configurações já passa pelo fluxo RHF/Zod existente.
- [x] Sem equivalente no app: como o campo não tem efeito na sincronização atual, não foi criada uma configuração mobile sem efeito nem duplicada regra inexistente.
- [x] Decisão funcional respondida pelo usuário: conectar `channelBaseDescriptions.whatsapp` aos payloads Graph do ERP e do app. O usuário não autorizou mudança no Catálogo Digital; o ajuste será restrito aos envios Graph. Nenhuma sincronização foi executada durante a decisão.
- [x] `git diff --check` passou; os únicos avisos são a normalização CRLF/LF dos dois arquivos Markdown já modificados. Não foram executados testes ou Playwright. Nenhuma consulta Supabase, Graph API, catálogo Meta, feed CSV ou gravação externa ocorreu.
- [x] Regras e fontes consultadas antes da edição: `AGENTS.md` (formulários, Graph/CSV, Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, inventário/roadmap, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/mobile/arquitetura_offline_first.md`, `WhatsAppConfigSection`, `ChannelDescriptionsSection`, Settings, schema/defaults, `metaCatalogBatchPayload`/`metaCatalogPayload` e sincronização mobile. A skill de replicação foi relida na cópia de cache `.vercel`; a fonte canônica não foi encontrada em `.agents/skills` ou nos diretórios pessoais consultados.

**Conclusão do recorte:** o campo não participava do payload Graph antes da decisão; sua conexão foi autorizada e implementada no Ciclo 137. O texto ativo da configuração agora descreve esse efeito, e a tela de sincronização do app recebe a configuração remota sem criar editor mobile duplicado.

### Ciclo 137 — descrição-base WhatsApp nos payloads Graph — 24/10/2026

**Pré-registro:** o usuário autorizou conectar `channelBaseDescriptions.whatsapp` às descrições enviadas pela Graph API no ERP e no aplicativo. A implementação manterá o prefixo comercial compartilhado e colocará o texto configurado antes do conteúdo específico de cada produto; o Catálogo Digital não será alterado.

- [x] `shared-utils/metaCatalogPayload.ts` centraliza a composição como prefixo comercial + descrição-base WhatsApp + conteúdo do produto/oportunidade. Quando a entrada já começa pelo prefixo compartilhado, ele é removido antes da composição, evitando duplicá-lo no lote. Um default compartilhado preserva o valor padrão ERP existente; string vazia explícita continua sem texto configurável.
- [x] O serviço Graph ERP passa a configuração aos envios em lote e monta a descrição do envio individual com o mesmo helper. No app, os envios manuais e automáticos convergem para o mesmo serviço; ele recarrega `settings.data` com `getAppSettings({ forceRefresh: true })` e timeout de 15 s antes de enviar atualizações. Timeout/falha interrompe o envio; lotes somente de exclusão não dependem dessa leitura porque não enviam descrição.
- [x] O default ERP agora importa a mesma constante compartilhada. O editor ativo e a seção genérica de canais foram ajustados para dizer que a descrição WhatsApp é aplicada após o prefixo pela Graph API; o Catálogo Digital permanece sem alteração. O formulário de Configurações e sua submissão RHF/Zod não foram modificados.
- [x] Busca final dos callsites Graph confirmou os caminhos ERP individual/em lote e o serviço batch mobile como pontos de composição; a sincronização automática ERP usa o caminho em lote. `git diff --check` passou; somente avisos de normalização CRLF/LF em arquivos já modificados no worktree.
- [x] Não foram executados testes, Playwright, compilação TypeScript, consulta Supabase, chamada Graph/Meta, validação no catálogo externo ou gravação externa. A skill de replicação continua disponível apenas na cópia cache `.vercel`; sua origem canônica não foi localizada nos diretórios `.agents/skills` consultados. Não há validação em runtime nativo.

**Conclusão do recorte:** a descrição-base salva é enviada nos payloads Graph ERP/app, preservando o prefixo comercial e o conteúdo de cada item; a configuração vazia continua suportada e o Catálogo Digital não foi alterado. A implementação foi verificada estaticamente, sem publicar dados na Meta. A auditoria global de Produtos continua aberta para os itens e limitações registrados no inventário.

### Ciclo 138 — campos técnicos opcionais de uma variação — 24/10/2026

**Achado pré-registrado:** `VariationTechnicalTab.tsx` no ERP separa características obrigatórias e opcionais; as opcionais só aparecem se houver seleção manual, override próprio, atributo da variação ou valor selecionado no pai, e a busca permite adicionar uma característica variável. Na aba técnica mobile, o caminho com `parentData` marcava todos os campos variáveis como `isRequired`, incluía todos no grupo principal e ocultava a busca e a lista de campos opcionais. Não foi encontrada particularidade mobile documentada para esse comportamento.

#### Resultado da comparação e correção

- [x] O mobile passou a conservar `isRequired` real ao projetar os campos variáveis. A lista técnica da variação separa os campos globais obrigatórios dos opcionais e aplica a mesma seleção do ERP: mostra opcionais manuais, com override/atributo próprio ou com valor efetivo selecionado no pai; “Não se aplica”/“N/A” no pai não seleciona o campo.
- [x] A busca mobile passou a listar características variáveis opcionais, incluindo atributos exigidos pela categoria que ainda não tenham valor. A ação de adicionar continua atualizando o estado do formulário pai; `requiredFieldsOnly` mantém a busca indisponível para perfil estoquista. O lock da variação única e as dependências continuam aplicados aos campos já selecionados.
- [x] A remoção de um campo manual numa variação agora limpa tanto a chave em `technicalValues` como o atributo correspondente do próprio formulário da variação, seguindo a limpeza ERP e evitando reaparecimento do valor ao reabrir.
- [x] O estado continua submetido pelo formulário proprietário com `useZodForm`/`zodResolver`; nenhuma submissão ou writer isolado foi criado. Não houve mudança em `technical_specs`, `variationDetails` ou contrato de persistência. A decisão de projeção do Ciclo 130 foi recebida e será tratada separadamente no Ciclo 139.

#### Validação executada e limites

- [x] Comparação estática do ERP `VariationTechnicalTab`/`VariationTechnicalFieldItem`/`VariationTechnicalSearchControl` contra `ProductFormTechnicalTab` e o callsite `ProductFormVariationsTab`. Busca textual em `docs/mobile/` e `docs/negocio/produtos/` não encontrou particularidade que justificasse a diferença anterior.
- [x] `git diff --check` focal passou. Não foi localizada suíte de componente mobile existente para `ProductFormTechnicalTab`; nenhum teste, build/typecheck, Playwright autenticado ou runtime Android/iOS foi executado nesta execução. Expo Web não comprovaria comportamento nativo.
- [x] Nenhuma consulta/gravação Supabase, alteração de banco ou operação de estoque foi feita. O procedimento operacional do estoquista não mudou; os PDFs do guia de estoque não requerem atualização.

**Conclusão do recorte:** seleção, busca, remoção e agrupamento dos campos opcionais de uma variação agora acompanham o fluxo ERP, preservando estados e bloqueios já existentes no app. A auditoria global de Produtos continua aberta.

### Ciclo 139 — projeção técnica de atributos por categoria — 24/10/2026

**Recorte:** aplicar a decisão do Ciclo 130 nos escritores ERP e mobile, sem backfill, alteração de schema ou escrita remota.

#### Resultado da auditoria e correção

- [x] `shared-utils/productCategoryRequiredAttributes.ts` consulta `category_attributes` apenas para as categorias selecionadas, valida identidade/nome do vínculo, agrupa obrigatoriedades e ignora Peso, que continua no tratamento técnico próprio dos formulários. A projeção pura considera valor próprio preenchido da variação; sem override, valor existente em `attributes` e depois herança técnica do pai. Não cria atributo para valor vazio, preserva os outros atributos e o `showName` já existente e grava novos valores projetados com `showName: false`.
- [x] O writer principal ERP (`erp/src/pages/utils/productService/productPersistenceService.ts`) e o writer do modal/registro rápido ERP (`erp/src/pages/utils/productService/productVariationActionsService.ts`) reutilizam o helper antes da gravação. A persistência continua em `product_variations.attributes`; `products.technical_specs`, inclusive `technicalValues` e `variationDetails`, permanece compatível. A consulta das regras tem timeout de 15 s e falha antes de alterar o produto/variação se não confirmar a leitura.
- [x] O writer mobile (`mobile/src/features/products/services/mobileProductMutationService.ts`) usa a mesma consulta/projeção antes da reserva de código e da RPC atômica. Cadastro, edição e registro rápido que converge para `saveMobileProduct` seguem o mesmo caminho. O payload mantém `technical_specs`/`variationDetails`; serviço sem categoria não consulta regras, e serviço não recebe projeção técnica. O mock existente do serviço passou a isolar a consulta; nenhum caso de teste foi adicionado.
- [x] A auditoria de leitura confirmou que `productVariationMapper.ts` no ERP e `mobileProductFetchService.ts` preservam `attributes`, enquanto os mappers continuam hidratando dados técnicos de `technical_specs`. Os consumidores de nome (`shared-utils/productVariationNameValidation.ts` e `mobile/src/features/products/domain/productVariationName.ts`) excluem `showName: false`; unicidade/composição de combinações continua considerando os valores independente da visibilidade. Mover/merge preservam atributos recebidos. A Conciliação continua exclusivamente ERP conforme os Ciclos 127/131.
- [x] Correção aditiva sobre JSON existente: nenhum schema, migration ou backfill foi criado. Rollback do código interrompe novas projeções e não remove atributos já persistidos. Nenhuma consulta ou gravação no Supabase remoto foi feita.

#### Validação e limites

- [x] TypeScript isolado do helper passou com `npx tsc --noEmit --target ES2020 --lib ES2020,DOM --strict --skipLibCheck shared-utils/productCategoryRequiredAttributes.ts`. As compilações integrais explícitas terminaram ERP com código 2/688 linhas de diagnóstico e mobile com código 2/44 linhas; a filtragem não encontrou diagnósticos em `productCategoryRequiredAttributes.ts`, `productPersistenceService.ts`, `productVariationActionsService.ts` ou `mobileProductMutationService.ts`. Portanto, a base integral continua não zero, mas os caminhos deste recorte não apareceram entre os diagnósticos.
- [x] `git diff --check` não encontrou erro de whitespace; reportou apenas avisos CRLF/LF em arquivos já modificados no workspace.
- [ ] Nenhum teste foi executado nesta execução. Playwright autenticado, Expo Web e aparelho Android/iOS não foram validados; Expo Web não comprova runtime nativo. Persistência/ownership real continua sem validação. A skill de replicação só está acessível na cópia de cache `.vercel`, sem fonte canônica localizada.

**Conclusão do recorte:** a divergência entre o contrato documentado e os escritores ERP/mobile foi corrigida com uma projeção pura compartilhada e preservação de compatibilidade/atributos existentes. O Ciclo 139 está concluído em código e registro; a auditoria global de Produtos permanece aberta para estados, evidências visuais/nativas e demais pendências deste inventário.

### Ciclo 140 — revisão estática das dependências da migration de autosave — 24/10/2026

**Recorte:** revisar a cadeia versionada do ACK de autosave e o tratamento mobile para a RPC ausente/resultado incerto, sem executar CLI, migration, consulta ou gravação no banco.

- [x] Busca exata em `supabase/migrations/` encontrou `mobile_product_save_operations` e `save_mobile_product_transaction` somente em `20261024113000_mobile_product_save_version_ack.sql`. Não há migration local que crie a tabela nem que defina a RPC legada chamada pelo wrapper. O artefato histórico `docs/audits/fiscal-2026-10-05/evidence/remote-migrations.json` lista `20261001143132_save_mobile_product_transaction` e migrations subsequentes no remoto naquela data, enquanto o snapshot de advisors registra a tabela com RLS; esses arquivos são evidência histórica, não confirmação do estado remoto atual.
- [x] A migration de ACK faz `ALTER TABLE`, cria função `SECURITY DEFINER` com `search_path` vazio, exige `auth.uid()`, chama a RPC legada na mesma transação, vincula o `updated_at` ao `operation_id` e restringe `EXECUTE` a `authenticated`. Seu SQL pressupõe que a tabela e a RPC legada estejam provisionadas; a definição legada não pode ser reconstruída com segurança a partir do repositório.
- [x] Revisão do serviço/tela mobile confirmou que o autosave chama a RPC versionada. Só o erro explícito de função ausente permite continuar pelo botão manual legado; timeout e outras respostas incertas preservam o mesmo payload/`operation_id` para retry e bloqueiam uma revisão posterior. A fila de autosave permanece serial/coalescida e o fechamento continua condicionado à confirmação.
- [x] Nenhum código de produto ou SQL foi alterado neste ciclo. Nenhuma CLI, infraestrutura local, teste, chamada RPC, consulta, migration ou escrita remota foi executada. `git diff --check` após o registro não apontou erros de whitespace; houve apenas avisos CRLF/LF nos arquivos Markdown já modificados.
- [ ] **Pendência de proveniência:** a migration legada existe no histórico Git, mas foi removida junto com 109 SQLs no commit `617cc3c4`; o arquivo local tinha versão `20261001120000`, enquanto o remoto registra a migration como `20261001143132`, e a reconciliação de 10/10 diz que não há correspondência nominal exata nem mapeamento completo de efeitos. O Ciclo 141 confirmou a função instalada contra a fonte histórica final, mas não torna seguro restaurar o arquivo antigo nem declara a cadeia local reproduzível. A aplicação da migration de ACK e validação remota continuam pendentes.
- [ ] Permanecem pendentes a validação remota autenticada da migration/RPC, o fluxo visual autenticado e o runtime nativo. Não houve mudança na operação do estoquista; PDFs do Guia Prático de Estoque não requerem atualização neste ciclo.

**Conclusão do recorte:** a revisão estática confirmou o limite de versionamento e que o cliente falha de modo visível/seguro quando a RPC versionada não está disponível. Isso não comprova implantação, atomicidade/idempotência do corpo legado nem persistência remota. A auditoria global de Produtos continua aberta.

### Ciclo 141 — reconciliação da fonte histórica e estado remoto do autosave — 24/10/2026

**Recorte:** confirmar se a fonte antiga da tabela/RPC pode ser reconciliada com o projeto operacional e se o ACK versionado já está instalado. Consultas restritas a metadados, histórico e definição de função; sem linhas comerciais, chamada de RPC ou DDL.

- [x] O conector Supabase encontrou o projeto `MoranteHub` (`hkoxhourxwlddgsfdgws`) ativo/saudável, mesmo ref registrado na reconciliação do repositório; não foram listadas branches de desenvolvimento. O histórico atual contém a base `20261001143132_save_mobile_product_transaction`, as migrations `20261001143633_restrict_mobile_product_save_rpc` e `20261001145413_fix_mobile_product_variation_history_checks`, e não contém a migration de ACK `20261024113000_mobile_product_save_version_ack`.
- [x] Leitura somente de `information_schema`/`pg_constraint` confirmou que `mobile_product_save_operations` possui `user_id`, `operation_id`, `request_payload`, `product_id`, `created_at` e chave primária `(user_id, operation_id)`. A coluna `result_updated_at` ainda não existe. `to_regprocedure` confirmou que `save_mobile_product_transaction_with_version(uuid,timestamptz,boolean,uuid,jsonb,jsonb,uuid[],jsonb)` não está instalada. Portanto o autosave seguro permanece indisponível no remoto atual e o cliente precisa seguir exibindo o erro/fallback controlado registrado nos Ciclos 117–118.
- [x] A RPC legada instalada tem a assinatura esperada, `SECURITY DEFINER`, `search_path` vazio, owner `postgres` e ACL observada apenas para `postgres`/`authenticated`. O corpo retornado pelo catálogo remoto coincide, após normalização de caixa e whitespace, com o corpo da última fonte histórica localizada em `git show 617cc3c4^:supabase/migrations/20261001150000_fix_mobile_product_variation_history_checks.sql`; a fonte inclui ledger idempotente por `(user_id, operation_id)`, guarda de `expected_updated_at`, preservação do saldo de variação em edição e verificação de vínculos históricos.
- [x] A fonte local histórica foi removida em `617cc3c4` junto com 109 arquivos SQL. `docs/audits/fiscal-2026-10-10/evidence/migration-history-reconciliation.json` registra que zero migrations remotas têm nome exato correspondente entre aquelas removidas e que o mapeamento de fonte/efeitos está incompleto. Embora o corpo da função instalada tenha sido reconciliado com a fonte histórica final, a diferença de versão/nome e a reconciliação incompleta impedem restaurar ou renomear migrations antigas por suposição.
- [x] Não foi executado DDL, migration, RPC ou consulta de dado comercial; nenhuma infraestrutura local foi iniciada e nenhum teste foi executado neste ciclo. A prova foi limitada ao histórico do projeto, catálogo de metadados e definição de função; não comprova uma instalação limpa reproduzível nem operação de usuário.
- [ ] **Ação operacional pendente:** a migration local `20261024113000_mobile_product_save_version_ack.sql` precisa de autorização específica para aplicação ao projeto remoto e validação autenticada da RPC/ACK com fixture própria. Não apliquei a migration. A cadeia histórica completa continua sem proveniência reconciliada suficiente para restaurar os 109 arquivos removidos.

**Conclusão do recorte:** a função base instalada corresponde à fonte histórica final, mas o ACK versionado ainda não está no remoto; autosave automático não pode ser considerado operacional. Nenhuma gravação externa foi feita; a auditoria global continua aberta.

### Ciclo 142 — proveniência e segurança da RPC v2 de inventário — 24/10/2026

**Recorte:** comparar a RPC v2 descrita no contrato offline, a fonte histórica Git, o gate `finalizeStockInventory` decidido pelo usuário e o estado remoto atual. Sem modificar contagens, estoque ou movimentações.

- [x] O histórico Git contém `supabase/migrations/20260925210000_finalize_inventory_counted_at_v2.sql` no commit `62a896f8`; ela foi removida no commit `617cc3c4` durante a retirada de 109 arquivos SQL. O histórico remoto atual não contém migration da função v2 e `pg_proc` expõe somente `finalize_inventory_transaction(uuid,text,jsonb,jsonb,text)`. A v2 não está instalada no projeto operacional.
- [x] A fonte histórica v2 calcula `target = physicalCount + entradas/saídas posteriores a countedAt`, rejeita ajuste posterior concorrente para revisão manual, verifica duplicidade/snapshot e grava ajuste auditável. Entretanto, a função é `SECURITY DEFINER` com `search_path` `public, extensions`, não verifica `auth.uid()` ou `finalizeStockInventory`, não vincula `audit_id` a uma identidade proprietária e concede execução a `authenticated` e `service_role`. A migration local de permissão do Ciclo 110 protege somente a RPC v1; não cria a v2.
- [x] O contrato offline confirma que rascunho e outbox são locais e que a RPC recebe `audit_id`, código, observação, itens e responsável, sem `user_id` autenticado do criador. A sincronização mobile compara o usuário local da outbox com a sessão atual antes do envio, mas essa checagem no cliente não prova ownership para o servidor. O `audit_id` e a submissão só passam a existir no servidor na finalização.
- [x] Atualizado `docs/negocio/estoque/contrato-indice-inventario-offline.md` para separar contrato desejado da v2 da implementação atual e não chamar o SQL histórico de migration vigente. A documentação registra que a fonte antiga não deve ser reativada sem novo forward migration protegido e que a prova de CMPM continua ausente. Nenhuma etapa operacional mudou; os PDFs do guia prático permanecem sem alteração neste ciclo.
- [x] **Decisão de domínio respondida no Ciclo 143 e confirmada novamente pelo usuário:** preservar a contagem offline; a primeira conta autenticada com `finalizeStockInventory` que envia a submissão reivindica o `audit_id`, e retries ficam vinculados à mesma conta/versão/hash. A implementação local e seus limites seguem detalhados no Ciclo 143.
- [x] Somente código/documentação e metadados da RPC foram inspecionados. Nenhum DDL, RPC, teste, escrita remota ou operação de estoque foi executado. A implementação v2 fica pendente dessa decisão e de validação de saldo/CMPM; sem autorização, a flag `EXPO_PUBLIC_INVENTORY_RPC_V2`/`VITE_INVENTORY_RPC_V2` deve permanecer desligada.

**Conclusão do recorte:** a fonte histórica oferece o rebase desejado, mas não atende ao gate escolhido pelo usuário e não resolve ownership dos rascunhos offline. A v2 não deve ser restaurada tal como estava; a definição do proprietário do inventário criado offline bloqueia a nova RPC segura. A auditoria global de Produtos permanece aberta.

### Ciclo 143 — claim de ownership no primeiro envio autorizado — 24/10/2026

**Recorte:** implementar localmente a decisão do usuário para inventários iniciados offline: o primeiro envio autenticado e permitido reivindica o `audit_id`; a revisão deste ciclo não aplica migration nem altera estoque remoto.

- [x] Decisão recebida: a primeira conta autenticada com `finalizeStockInventory` que envia o snapshot congelado fica como owner; retries só passam com essa conta, mesma versão e mesmo hash. O responsável operacional da contagem pode ser diferente e não é fonte de autorização. `auth.uid()` é a única identidade gravada no claim; `userId` do payload não é aceito como prova e novos outboxes deixam de emiti-lo.
- [x] Migration aditiva local `supabase/migrations/20261024165305_inventory_audit_submission_claims.sql`: instala/reafirma o helper de permissão e seu default; cria `app_private.inventory_audit_submission_claims` com RLS e privilégios de cliente revogados; cria hash SHA-256 do snapshot JSONB; valida o envelope e contagem v2; expõe claim `SECURITY DEFINER` com `search_path` vazio, gate autenticado, lock por audit_id e replay idempotente; restringe `EXECUTE` a authenticated.
- [x] O primeiro claim persiste em transação separada antes da RPC de estoque para sobreviver a timeout/conflict. Cliente ERP e mobile chama o claim para ambas as versões; a RPC v1 preserva o contrato para versões antigas e pode criar o claim atomicamente no caminho legado. A v1 exige owner/hash/versão iguais quando já reivindicada e reconhece marcadores concluídos de versões antigas sem criar ownership retroativo. A v2 requer claim v2 do usuário atual e hash exato, calcula `physicalCount + movimentos posteriores a countedAt`, recusa ajuste posterior concorrente para revisão manual e atualiza o estado final do claim na mesma transação dos movimentos/saldos.
- [x] Retry após timeout mantém o payload congelado e pode repetir claim/finalizer sob o limite de 30 s existente no mobile; o conflito de owner/hashes retorna erro sem lançar novo ajuste. A sync background exige sessão autenticada com leitura limitada a 10 s; o servidor continua sendo a autoridade final de permissão e owner. O estado do responsável/contagem não é sobrescrito.
- [x] Guia Prático do Estoque atualizado na seção/página 22 para explicar primeiro envio, identidade de conta versus responsável da contagem, retry pelo mesmo login e orientação em caso de conflito. Os dois PDFs foram regenerados, renderizados e conferidos neste ciclo; o guia reteve 26 páginas e as cópias são idênticas.
- [x] A migração foi criada com Supabase CLI, sem iniciar banco local e sem aplicá-la. A checagem de metadados operacional já feita neste ciclo confirmou apenas RPC v1; claim, RPC v2 e gate protegido ainda não estão no remoto.
- [ ] **Pendência operacional:** a nova migration local `20261024165305_inventory_audit_submission_claims.sql` é posterior à última migration remota `20261024122401`, mas a árvore local contém migrations anteriores (gate v1 `20261024111703` e ACK de autosave `20261024113000`) que não constam no histórico remoto. Reconciliar migration history/efeitos com `docs/testing/SUPABASE_REMOTE_TEST_POLICY.md` antes de qualquer apply. Aplicação remota e fixture autenticada exigem autorização específica posterior; não declarar proteção ativa, não ativar `EXPO_PUBLIC_INVENTORY_RPC_V2`/`VITE_INVENTORY_RPC_V2` e não usar gravação operacional.
- [ ] Não foram executados testes nem Playwright; revisão estática não comprova sintaxe/ACL no servidor, concorrência do primeiro claim, integridade transacional, retries, reconciliação de saldo/CMPM, sessão real, renderer mobile ou Android/iOS. Expo Web não prova comportamento nativo. A skill canônica de replicação continua ausente fora da cópia `.vercel`.

**Conclusão do recorte:** a decisão está implementada no código local e no contrato, preservando a criação offline e separando identidade autenticada de responsável da contagem. O remoto ainda não contém essa proteção; dependem de reconciliação, autorização e validação autenticada antes de ativar v2. A auditoria global de Produtos permanece aberta.

### Ciclo 144 — leitura de overrides técnicos próprios em famílias com várias variações — 24/10/2026

**Recorte:** aba Características de uma variação já salva em produto com duas ou mais variações; leitura e edição de valores próprios antigos que não constam em `variableTechnicalFields`.

#### Divergência registrada antes da correção

- [x] O ERP mapeia `product_variations.attributes` em `productVariationMapper.ts`; `VariationTechnicalTab` lê os atributos da própria variação e `VariationTechnicalFieldItem` considera qualquer override próprio de `technicalValues`/atributo, além da herança do pai.
- [x] O mobile recebe os mesmos `v.attributes` e combina `technical_specs.variationDetails` pelo UUID no `mobileProductFetchService.ts`. Porém, `ProductFormTechnicalTab` passava `variableTechnicalFieldNames` para `getEffectiveVariationTechnicalValues`; um override salvo fora da lista configurada era filtrado da edição, não selecionava o campo opcional e não participava das dependências, embora continuasse no objeto carregado.
- [x] Não foi encontrada particularidade mobile que justifique ocultar um override já existente. A regra de produto mantém os atributos em `product_variations.attributes` e a projeção do Ciclo 139 preserva atributos existentes.
- [x] Correção aplicada após o registro: usar todos os valores próprios carregados para compor seleção, exibição e dependências; manter a lista de campos variáveis somente para decidir se o valor vazio herda do pai. Sem mudança de schema, payload, RPC ou banco.

#### Validação e limites pré-registrados

- [x] Comparação estática dos mapeadores ERP/mobile e dos componentes de estado `VariationTechnicalTab`/`ProductFormTechnicalTab`; formulário proprietário mobile continua usando `useZodForm` com schema de produto explícito.
- [ ] A comparação visual autenticada não pôde ser iniciada: a skill de Playwright exige browser visível e seu wrapper chama WSL, que informa não haver distribuição instalada. As variáveis Vercel do projeto listam apenas credenciais fiscais, não reutilizadas para Produtos. Não foi tentado acesso sem autenticação.
- [ ] Não executar testes ou runners nesta etapa; Expo Web não prova runtime nativo. Nenhuma consulta ou gravação remota foi feita.

#### Correção aplicada

- [x] `ProductFormTechnicalTab.tsx` agora resolve todos os valores próprios já carregados (`attributes` e `technicalValues`) para seleção dos opcionais, estado efetivo e dependências, como o ERP. `variableTechnicalFieldNames` continua controlando a classificação variável e a herança; removi apenas o filtro que escondia overrides existentes fora da lista configurada. A rota de leitura por `productVariationMapper.ts`/`mobileProductFetchService.ts`, schema RHF/Zod, payload e persistência não mudaram.
- [x] Revisão do diff e `git diff --check` restrito aos arquivos do ciclo passaram. Nenhum teste foi adicionado ou executado. Não foi feita gravação remota; a visualização autenticada e o runtime nativo continuam pendentes.

### Ciclo 145 — remoção do helper legado de duplicação direta — 24/10/2026

**Recorte:** helper exportado sem consumidores que persistia a cópia diretamente pelo serviço, contornando o formulário proprietário de produto.

#### Evidência e correção

- [x] Busca de `duplicateMobileProduct` em `mobile`, `erp` e `shared-utils` encontrou somente sua definição em `mobileProductMutationService.ts`; não havia importadores ou call sites.
- [x] A duplicação ativa do mobile continua em `NativeProductsScreen.handleDuplicate`: busca o produto completo, gera novo código/IDs para pai e variações, abre um rascunho inativo e entrega a persistência ao formulário. Esse fluxo passa pelo formulário React Hook Form + zodResolver e não grava apenas por abrir a ação.
- [x] Removida apenas a exportação morta que chamava `saveMobileProduct(copy)` sem o formulário e sem restaurar o snapshot de relações N:N. Nenhum fluxo ativo, payload ou RPC foi alterado; o serviço de salvamento segue usado pela submissão normal.

#### Validação e limites

- [x] `rg` confirmou ausência de referências ao símbolo após a remoção; revisão do diff restrita ao helper e `git diff --check` foram feitos.
- [ ] Nenhum teste ou runner foi executado nesta etapa. Sem gravação remota, UI autenticada ou runtime nativo; a retirada de helper sem consumidores não comprova a experiência em aparelho. A skill de replicação segue disponível apenas na cópia de cache de build.

**Conclusão do recorte:** não havia uma lacuna de duplicação no fluxo ativo. A implementação duplicada, sem consumidores e capaz de contornar RHF/Zod, foi retirada; a paridade visual/nativa da ação continua pendente.

### Ciclo 146 — gate de perfil na ação Restaurar da lixeira — 24/10/2026

**Recorte:** cartão da lixeira, perfil classificado como somente etiquetas; paridade de visibilidade da ação restaurar produto.

#### Divergência registrada antes da correção

- [x] No ERP, `ProductCardHeader` só mostra Restaurar quando `showTrash && !isLabelOnlyProfile`; a tabela `ParentProductActions` aplica o mesmo predicado. O helper de perfil é compartilhado (`shared-utils/productPermissions.ts`).
- [x] No mobile, `NativeProductsScreen` calcula `isLabelOnlyProfile` com o mesmo helper e mostra Lixeira a quem possui `canDeleteProducts` (permissão padrão do vendedor, que é um perfil somente etiquetas); porém `MobileProductCard` mostrava o botão sempre que `showTrash && onRestore`, sem usar a classificação que já recebia.
- [x] Não há particularidade mobile documentada justificando permitir essa operação no perfil somente etiquetas. A ação invoca a RPC de restauração diretamente, tal como no ERP; nenhum contrato de backend foi alterado.

#### Correção e validação

- [x] O botão mobile agora exige `!isLabelOnlyProfile`, espelhando os dois pontos de renderização do ERP. O handler, a consulta, o gate de backend e os demais perfis permanecem inalterados.
- [x] Revisão estática confirmou que a prop de perfil é calculada e encaminhada ao cartão e que os dois clientes usam o mesmo helper. `git diff --check` restrito aos arquivos do ciclo não apontou erros.
- [ ] Nenhum teste ou runner foi executado; a comparação visual autenticada e runtime Android/iOS continuam pendentes. Expo Web não prova comportamento nativo; não houve consulta ou gravação remota.

**Conclusão do recorte:** removida a diferença de visibilidade da restauração na lixeira para perfis somente etiquetas. A auditoria das demais ações/permissões da lista continua aberta.

### Ciclo 147 — sincronização da lixeira com a Meta Graph API — 24/10/2026

**Recorte:** mover uma família de produtos para a lixeira e restaurá-la, incluindo seus itens do Catálogo Meta.

#### Divergência comprovada

- [x] ERP e app chamavam `move_product_to_trash` / `restore_product_from_trash`, mas os dois caminhos encerravam a operação sem agendar a sincronização individual com a Graph API. As mutações comuns de status/ativação já agendavam essa sincronização.
- [x] `move_product_to_trash` persiste `deleted`, `deleted_at`, `active = false` e `status = 'hidden'` no pai e desativa/oculta as variações. O helper existente `buildProductMetaCatalogSyncItems` projeta um item `deleted: true`/`status: 'hidden'` para o pai e para cada variação de um pai inelegível; para um pai restaurado e elegível, usa a projeção normal de publicação.
- [x] O helper Graph é compartilhado entre a implementação ERP e mobile no que diz respeito à regra de itens, e cada cliente já possuía o dispatcher próprio (`triggerProductMetaCatalogSync` / `triggerMobileProductMetaCatalogSync`). Nenhuma particularidade documentada justificava deixar a lixeira fora da sincronização.

#### Correção aplicada

- [x] ERP e app agora agendam seus dispatchers Meta somente após o RPC confirmar sucesso, tanto ao mover para a lixeira quanto ao restaurar. Os fluxos em lote também passam pelos mesmos serviços e herdam o agendamento.
- [x] Permissões, RPCs, confirmações, retenção, payload Graph e comportamento do Catálogo Digital não foram alterados. O dispatcher continua em segundo plano com debounce de 400 ms, como as demais mutações existentes.

#### Validação e limites

- [x] Comparação estática do RPC, dos serviços ERP/mobile e do helper de montagem do lote Graph; revisado o diff e `git diff --check` dos arquivos do ciclo.
- [ ] Nenhum teste ou runner foi executado. Não houve chamada externa à Meta nem consulta ao Catálogo Meta por `retailer_id`/SKU; portanto esta correção confirma o agendamento local, não a remoção/restauração efetiva de nenhum item em um catálogo remoto. O acionamento de Graph permanece assíncrono e suas falhas são registradas pelo dispatcher.
- [ ] Comparação autenticada no navegador e runtime Android/iOS continuam pendentes; Expo Web não comprova o comportamento nativo.

**Conclusão do recorte:** ERP e app agora encaminham mudanças de ciclo de vida da lixeira ao mecanismo Graph já existente. A comprovação operacional no Catálogo Meta segue pendente e não foi inferida a partir do status local.

### Ciclo 148 — cadastro de fornecedor quando o produto já atingiu o limite — 24/10/2026

**Recorte:** estado de três fornecedores vinculados na aba Estoque e Precificação; ação “Novo”.

#### Divergência registrada antes da correção

- [x] ERP mantém “Novo” habilitado ao atingir três fornecedores. O `addSupplier` bloqueia apenas a associação quando o limite foi alcançado; o modal ainda permite cadastrar o fornecedor globalmente.
- [x] O app aplicava o mesmo limite de três para associação, mas também desabilitava “Novo”, impedindo abrir o cadastro global. O modal é o formulário normal de fornecedor com schema de domínio e resolver RHF/Zod; não há regra documentada que justifique essa diferença mobile.
- [x] O novo fornecedor pode ser salvo globalmente sem ser associado ao produto quando a lista já está cheia; o ERP já se comporta assim. A correção proposta é remover apenas o bloqueio visual/de toque do botão “Novo”, preservando o limite na associação.

#### Correção e validação

- [x] Removidos do botão mobile “Novo” apenas o `disabled` e o estilo condicionado ao limite. `addSupplier` continua rejeitando a associação quando já existem três fornecedores, e as sugestões permanecem desabilitadas nesse estado; o cadastro global segue passando pelo formulário e schema existentes.
- [x] Busca, validação compartilhada de origem de estoque, defaults de IPI/frete e inclusão/remoção de vínculos continuam usando os mesmos helpers/contratos observados nos dois clientes.
- [x] Revisão estática do estado “3/3”, do callback de sucesso do modal e do predicado ERP; `git diff --check` no componente alterado passou.
- [ ] Nenhum teste ou runner foi executado. Cadastro remoto, UI autenticada e runtime nativo não foram exercitados; Expo Web não comprova o comportamento nativo.

**Conclusão do recorte:** “Novo” fica disponível com três fornecedores vinculados, como no ERP; o limite continua valendo somente para associar fornecedor ao produto.

### Ciclo 149 — orientação para busca curta de componentes — 24/10/2026

**Recorte:** busca de componentes na aba Composição, após digitar um ou dois caracteres.

#### Divergência registrada antes da correção

- [x] O ERP (`ProductAutocomplete`) abre o estado de sugestões com a instrução “Digite pelo menos três caracteres para buscar.” quando o termo não vazio ainda tem menos de três caracteres.
- [x] O mobile usa o mesmo limiar de três caracteres e não consulta a lista antes dele, mas não mostra instrução nesse estado intermediário; o usuário fica sem retorno até atingir o limiar.
- [x] A cópia do schema `productAutocompleteFormSchema`, os filtros de fornecedor/tipo/atividade, mensagens de busca sem resultado e erro/repetição já foram comparados. Nenhuma particularidade mobile documentada justifica omitir a orientação curta.

#### Correção e validação

- [x] O app agora exibe a mesma instrução enquanto a consulta está ociosa e o texto tem 1–2 caracteres. O limiar, debounce, schema, chamada de busca e estados de carregamento/erro/sem resultados não foram alterados.
- [x] `git diff --check` nos arquivos do ciclo passou.
- [ ] Nenhum teste ou runner foi executado. A validação visual autenticada e o runtime Android/iOS continuam pendentes; Expo Web não comprova comportamento nativo.

**Conclusão do recorte:** o estado mobile de busca curta de componentes agora orienta o usuário como o ERP, sem disparar a consulta prematuramente.

### Ciclo 151 — permissão e elegibilidade para mover produto à lixeira — 24/10/2026

**Recorte:** cartão da lista no estado normal; perfil sem `deleteProducts`, perfil somente etiquetas, rascunho, produto salvo elegível e produto bloqueado.

- [x] O ERP calcula `canDeleteProducts` com `canPerform('deleteProducts', roles)` e usa essa permissão nas ações da lista. O catálogo de ações é derivado de `shared-utils/productPermissions.ts`.
- [x] O app usa `canUseProductPermission('deleteProducts')`, que consulta o mesmo catálogo compartilhado; `MobileProductCard` também remove a ação para perfis somente etiquetas, pelo mesmo predicado compartilhado `isProductIdentificationLabelOnlyProfile` usado no ERP.
- [x] Nos dois clientes, rascunhos oferecem “Descartar Rascunho”, e produto salvo oferece “Mover para lixeira” somente a quem tem a permissão. Sem permissão, o item de menu não aparece; elegibilidade de domínio negativa desabilita a ação e não executa o callback. Card/grid e tabela ERP têm o mesmo gate.
- [x] A consulta mobile `get_products_trash_eligibility` tem timeout de 10 s, aguarda antes de entregar a lista e falha fechada com motivo explícito se não confirmar elegibilidade. A RPC local `20261013193600_product_trash_lifecycle.sql` produz uma linha para cada UUID pedido, inclusive produto ausente, impedimento, rascunho ou item já na lixeira.
- [x] **Adaptação mobile justificada:** o ERP expõe no tooltip um estado `can_trash === undefined` (“Verificando elegibilidade...”); o app conclui a consulta antes de apresentar o cartão e transforma timeout/erro em bloqueio com mensagem (“Não foi possível confirmar a elegibilidade para a lixeira.”). Isso conserva o gate, evita habilitação otimista e não deixa consulta assíncrona sem limite, conforme `AGENTS.md`; nenhum bloqueio foi relaxado.
- [x] Regras e fontes comparadas: `AGENTS.md`, `docs/geral/USER_RULES.md`, inventário/roadmap, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `rules/products/product-reconciliation-erp-only.yml`, skill de replicação disponível apenas na cópia cache `.vercel`, `useProducts.ts`, `permissionService.ts`, `permissionConfig.ts`, `productPermissions.ts`, `NativeProductsScreen.tsx`, `MobileProductCard.tsx`, menus de ação e migration de elegibilidade.
- [ ] Nenhum teste ou runner foi executado. Playwright autenticado e runtime Android/iOS não foram exercitados; Expo Web não comprova comportamento nativo. Nenhuma consulta ou gravação remota ocorreu. Como a operação do estoquista não mudou, os PDFs do Guia Prático de Estoque não precisam de atualização.

**Conclusão do recorte:** os gates de permissão e de elegibilidade para mover o produto à lixeira são equivalentes; a consulta mobile permanece fail-closed e limitada por timeout, com a diferença de estado assíncrono registrada como adaptação de plataforma. A auditoria global continua aberta.

### Ciclo 152 — remoção de uma variação com histórico — 24/10/2026

**Recorte:** aba Variações do formulário de produto salvo; estado de verificação de vínculos, variação bloqueada por histórico e confirmação da remoção/conversão para produto simples.

#### Divergência registrada antes da correção

- [x] O ERP (`ProductVariationsTab`) consulta os vínculos das variações salvas ao abrir/alterar a lista. Até a resposta, a remoção fica desabilitada com “Verificando vínculos de estoque e vendas.”; se houver uso ou erro, permanece bloqueada com motivo acessível. A verificação cobre `inventory_moves`, `order_items`, `goods_receipt_items` e `inbound_invoices`, com timeout de 10 s e falha fechada.
- [x] O mobile já consultava as mesmas quatro fontes, também com timeout e falha fechada, mas apenas após o toque na lixeira. A ação permanecia habilitada durante a consulta e, para vínculos confirmados, só então exibia o bloqueio. A remoção continuava local ao formulário; a confirmação de converter duas variações em uma já validava `variationToSimpleConfirmationSchema` pelo formulário proprietário RHF/Zod.
- [x] A diferença está no estado/feedback preventivo da ação, não no conjunto de vínculos ou no resultado seguro. Variações novas sem UUID persistido continuam removíveis no rascunho local; a checagem não deve tratá-las como registros históricos.
- [x] O mobile agora pré-consulta os vínculos ao abrir/alterar a lista de variações de produto salvo. A lixeira fica desabilitada enquanto o estado é desconhecido e quando há uso ou falha; a tela explica cada estado. Itens sem ID permanecem removíveis como rascunhos locais, enquanto IDs presentes passam pelo gate fail-closed.
- [x] A ação continua repetindo a consulta no `handleRemove` antes de abrir a confirmação, para não confiar indefinidamente no resultado preventivo. A confirmação de conversão continua usando `variationToSimpleConfirmationSchema` via `useZodForm`; nenhuma gravação, RPC ou cálculo de saldo foi alterado. A checagem só lê as quatro fontes já consultadas pelo ERP.
- [x] Fontes comparadas: `AGENTS.md`, `docs/geral/USER_RULES.md`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, regras em `rules/products/`, skill de replicação disponível somente no cache `.vercel`, `ProductVariationsTab.tsx`, `productDependencyCheck.ts`, `ProductFormVariationsTab.tsx` e `mobileProductMutationService.ts`. Nenhuma particularidade documentada justifica a diferença preventiva.
- [x] `git diff --check` passou nos arquivos do ciclo. Nenhum teste ou runner foi executado. A comparação visual autenticada e o runtime Android/iOS continuam pendentes; Expo Web não comprova comportamento nativo. Não houve consulta ou gravação remota. Como a operação do estoquista não mudou, os PDFs do Guia Prático de Estoque não requerem atualização.

**Conclusão do recorte:** em produto salvo, o app agora bloqueia preventivamente a remoção enquanto consulta vínculos e para variação com histórico/resultado inconclusivo, como no ERP. A verificação no toque permanece como segunda barreira; UUID/SKU, atributos, saldo, herança do produto simples, confirmação RHF/Zod e gravação permanecem inalterados. A auditoria global continua aberta.

### Ciclo 150 — confirmação da propriedade do inventário offline — 24/10/2026

**Recorte:** reconciliar a resposta mais recente do usuário sobre ownership com a pendência histórica do Ciclo 142.

- [x] O usuário confirmou que a primeira conta autenticada e autorizada que envia uma submissão criada offline reivindica o `audit_id`. O inventário já registrava essa decisão e a implementação local no Ciclo 143, mas a pergunta original ainda aparecia como pendente; agora está marcada como resolvida e ligada à evidência posterior.
- [x] Conferência do contrato offline e do Ciclo 143 confirma que `auth.uid()` é a identidade de acesso, distinta da pessoa responsável pela contagem; retries exigem a mesma conta, versão e hash. O código local já segue essa decisão nos clientes ERP/mobile e na migration aditiva, sem usar `userId` do payload como ownership.
- [ ] A decisão não autoriza por si só aplicar migrations no projeto remoto. A reconciliação da cadeia, a autorização explícita para apply/fixture e a validação autenticada permanecem pendentes; a RPC v2 continua desligada. Nenhuma RPC, DDL, consulta ou escrita remota foi executada neste ciclo.
- [x] Nenhuma ação do estoquista mudou neste registro; PDFs do Guia Prático de Estoque não requerem alteração. Não foram executados testes, Playwright ou validação Android/iOS; Expo Web não comprova comportamento nativo.

**Conclusão do recorte:** a decisão de domínio está resolvida e implementada localmente; a proteção não deve ser considerada ativa no remoto enquanto a migration e o fluxo autenticado não forem reconciliados e validados. A auditoria global permanece aberta.

### Ciclo 153 — ativação de produto simples com variação virtual obsoleta — 24/10/2026

**Recorte:** ação de ativar/desativar no card de um produto simples cujo único registro exibido é a variação virtual criada porque a consulta não encontrou linhas em `product_variations`. Sem executar mutação remota.

#### Divergência registrada antes da correção

- [x] A lista mobile cria uma variação virtual identificada por `virtual-${product.id}` quando não há variação persistida. Porém, o card descartava esse ID e chamava o handler com o ID do produto pai; o hook não conseguia distinguir a linha virtual do comando direto no pai.
- [x] O ERP conserva a identidade sintética da linha no `serverProducts` e, antes de persistir seu status, consulta `product_variations` pelo produto pai. Se a lista mudou e uma linha real apareceu desde a leitura, ERP falha fechado com “As variações deste produto mudaram. Atualize a lista antes de alterar o status.”, tanto para ativação quanto para desativação.
- [x] No mobile, ativar reconsulta o produto e suas variações, mas não confirma que uma linha ainda é virtual; desativar não faz essa reconsulta e atualiza o pai e todas as linhas existentes. Uma variação inserida após o carregamento podia, portanto, ter seu status alterado por uma ação iniciada na linha virtual antiga.
- [x] A divergência limita-se à identidade e à guarda de snapshot. Critérios de elegibilidade continuam no `validateProductActivationRequirements` compartilhado; a validação real do formulário de composição segue no RHF/Zod. Nenhuma exceção mobile documentada justifica ignorar a linha obsoleta.
- [x] Corrigido: o card conserva o ID sintético para a variação única; o hook transmite o marcador `isVirtualVariation` ao serviço; antes de qualquer alteração do status, o serviço confirma se ainda não há uma linha persistida. A verificação usa timeout, propaga falhas sem escrita e mostra a mensagem de lista obsoleta idêntica à do ERP. Na ativação, aproveita as variações já reconsultadas para a validação; na desativação, faz consulta limitada a uma linha. Status, payloads de gravação e validações de negócio não mudaram.
- [x] O erro segue o feedback já existente no handler mobile: `Alert` com a causa e recarga da lista. Em sucesso, o hook só atualiza o estado visível após a mutação resolver. O serviço ERP mantém seu fluxo sem mudança.
- [x] Revisão dos call sites: o marcador novo é opcional; chamadas diretas a produto pai e variação física mantêm o comportamento anterior. A identidade sintética só é passada para a ação do card de variação virtual.
- [ ] Regras consultadas antes da mudança: `AGENTS.md` (formulários RHF/Zod e resiliência; sem infraestrutura local), `docs/geral/USER_RULES.md`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, regra de reconciliação ERP-only e skill `erp-web-to-mobile-replication` disponível somente na cópia de cache/backup `.vercel` (fonte canônica não encontrada). O diretório mobile não contém outro `AGENTS.md`.

**Conclusão do recorte:** paridade corrigida para a linha virtual obsoleta. O app agora falha fechado antes de alterar pai/variações se a lista deixou de representar um produto simples; ativação e desativação usam a mesma guarda do ERP. `git diff --check` passou (Git apenas avisou sobre normalização CRLF já existente). Nenhum teste/runner, Playwright, consulta ou gravação remota foi executado; runtime Android/iOS continua pendente e Expo Web não provaria comportamento nativo. Nenhuma operação do estoquista mudou, portanto o Guia Prático de Estoque não requer atualização. A auditoria global permanece aberta.

### Ciclo 154 — custo final após entrada de estoque — 24/10/2026

**Recorte:** efeito de uma entrada de estoque/recebimento no custo médio e no `finalPurchasePrice`, e leitura subsequente pela aba Estoque e Precificação do formulário de Produto. Sem mutação de dados.

- [x] A implementação ERP atual foi confirmada em `inventoryStockCalculator.ts`: a projeção compartilhada `applyInventoryMoveToStockProjection` retorna saldo, `costPrice` e variações; `recalculateProductStockOnMove` encaminha somente esses campos a `updateProduct`. Não há atribuição ou payload de `finalPurchasePrice` nesse caminho.
- [x] A documentação vigente de recebimentos descreve o CMPM da variação na confirmação; a documentação de movimentações define a média ponderada do custo. Nenhuma delas determina recalcular `finalPurchasePrice` pelo recebimento.
- [x] No estado de formulário, `useProductFormSync` (ERP) e `resolveMobileProductFinalPurchasePrice` (app) chamam `calculateProductFinalPurchasePrice` de `shared-utils`. Assim, ambos recalculam a apresentação ao reabrir o produto a partir do custo/IPI/frete atual, ainda que o campo persistido não tenha sido tocado pela entrada.
- [x] Aplicada a instrução permanente do usuário: quando não existe contrato de domínio para divergir, manter no app o comportamento atual do ERP. O campo persistido continua sem atualização pelo movimento e o formulário mantém sua derivação comum; nenhuma alteração de código ou regra comercial foi inventada. A operação do estoquista e os PDFs do Guia Prático não mudaram.
- [x] Regra de segurança consultada: `rules/stock/no-inventory-move-write-in-ui.yml` exige que movimentos usem o fluxo autorizado; este recorte não grava nem altera `inventory_moves`. Skill `erp-web-to-mobile-replication` verificada na cópia de cache `.vercel` como orientação; continua sem fonte canônica no `.agents/skills` do projeto.
- [x] Pendência documental de paridade encerrada. O ponto permanece como exceção observada e só deve mudar se surgir regra explícita de domínio ou se o próprio ERP alterar o contrato.
- [x] `git diff --check` dos documentos passou (exit code 0; Git avisou somente sobre normalização CRLF/LF preexistente). Nenhum teste, Playwright, leitura/escrita remota ou runtime nativo foi executado. A UI visual autenticada e Android/iOS continuam pendentes; Expo Web não comprova comportamento nativo.

**Conclusão do recorte:** não havia diferença móvel suportada: movimento de estoque mantém `finalPurchasePrice` conforme o ERP, e a leitura do formulário usa a fórmula compartilhada nos dois clientes. A auditoria global permanece aberta.

### Ciclo 155 — seleção de características da categoria — 24/10/2026

**Recorte:** busca e carregamento da lista de características no modal de categoria. O formulário proprietário foi auditado junto com o componente filho, sem gravar dados.

#### Divergências registradas antes da correção

- [x] O ERP usa `AttributeAutocomplete`: só apresenta sugestões a partir de dois caracteres, filtra a lista em memória ignorando acentos e mostra estado sem resultados. O app exibia todos os atributos selecionáveis em uma lista sem busca, permitindo adicionar com um toque. Ambos usam os mesmos critérios compartilhados de atributo selecionável, obrigatoriedade e seleção; não foi encontrada particularidade mobile documentada que justifique a diferença de fluxo.
- [x] As consultas de lista e configuração de atributos não tinham limite de espera nos dois clientes. No app, `loadingAllAttrs` ou `isLoadingAttributes` podia permanecer ativo indefinidamente; no ERP, o autocomplete podia manter seu spinner ativo e a consulta de configuração manter a edição bloqueada. `AGENTS.md` proíbe consultas que bloqueiem indefinidamente a interface.
- [x] `CategoryAttributesPicker` não possui submissão nem persistência própria: seu estado é controlado por `useCategoryFormModal`. O pai submete `name`, vínculos e atributos por `useZodForm` (React Hook Form + `zodResolver` real e `categoryAttributeSelectionsSchema`) antes de chamar `saveMobileCategory`; erro/timeout ao ler vínculos mantém a edição bloqueada. O modal é somente apresentação. A linha correspondente do inventário de formulários será encerrada como campo-filho controlado.
- [x] Regras/documentos verificados antes da implementação: `AGENTS.md`, `docs/geral/USER_RULES.md`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, inventário de formulários e regra de Conciliação ERP-only. A skill de replicação foi lida na cópia de cache `.vercel`; sua fonte canônica não foi localizada. Não existe `AGENTS.md` em `mobile/`, `erp/` ou `shared-utils/`.

- [x] O app agora usa busca local com mínimo de duas letras e a mesma normalização acento-insensível do ERP; os resultados filtrados continuam usando os helpers compartilhados de seleção e obrigatoriedade. Valores selecionados, remoção e switches de obrigatório/opcional continuam pertencendo ao formulário pai.
- [x] `shared-utils/catalogAttributesLoadTimeout.ts` limita a 15 s a leitura do catálogo mobile, dos vínculos da categoria no app e no ERP, e do catálogo usado pelo autocomplete ERP. Erro e timeout encerram o indicador; a lista do app mostra alerta e preserva seleções. Falha ao ler vínculos mantém o formulário bloqueado para evitar sobrescrever configuração desconhecida, com orientação para reabrir e tentar novamente.
- [x] `removeAccents` e `normalizeSearchTerm` agora têm fonte compartilhada em `shared-utils/productText.ts`; `erp/src/pages/utils/textUtils.ts` os reexporta para manter os consumidores atuais, e o seletor mobile usa exatamente o mesmo helper.
- [x] O proprietário foi confirmado nos dois clientes: no mobile, `useCategoryFormModal` valida o snapshot por React Hook Form e `zodResolver` real usando `categoryAttributeSelectionsSchema` antes de `saveMobileCategory`; o `CategoryAttributesPicker` apenas lê opções e altera estado controlado. No ERP, `useCategoriesAndEnvironments` usa o mesmo schema e wrapper RHF antes de `createCategory`/`updateCategory`; `AttributeAutocomplete` é campo filho de pesquisa/seleção, sem submit próprio.
- [x] Atualizado `docs/forms/inventario-mobile-catalogo-2026-10-15.md`: o campo-filho não é um formulário independente; callback e efeito de persistência pertencem ao hook proprietário com resolver real.
- [x] Arquivos deste recorte: `mobile/src/features/products/categories/components/CategoryAttributesPicker.tsx`, `mobile/src/features/products/categories/modals/MobileCategoryEnvironmentModal.tsx`, `mobile/src/features/products/services/mobileAttributeService.ts`, `mobile/src/features/products/services/mobileCategoryService.ts`, `erp/src/components/AttributeAutocomplete.tsx`, `erp/src/pages/utils/categoryService.ts`, `erp/src/pages/utils/textUtils.ts`, `shared-utils/productText.ts` e `shared-utils/catalogAttributesLoadTimeout.ts`.
- [ ] Limitações: nenhuma consulta ou gravação remota foi feita. Não houve teste/Vitest, Playwright autenticado, Expo Web nem validação Android/iOS; a fonte canônica da skill de replicação continua ausente, então a cópia `.vercel` foi usada apenas como orientação. Expo Web não comprovaria o comportamento nativo. A autenticação geral para UI permanece pendente conforme os ciclos anteriores.
- [x] `git diff --check` passou (exit code 0); Git avisou somente sobre normalização CRLF/LF preexistente nos documentos.

**Conclusão do recorte:** o fluxo de seleção mobile agora aplica o limiar e a busca normalizada do ERP; as leituras de catálogo/configuração em ambas as plataformas têm prazo finito, preservam o fail-closed e não deixam os indicadores de carregamento presos indefinidamente. O componente-filho foi vinculado ao formulário proprietário com RHF/Zod. A auditoria global permanece aberta.
