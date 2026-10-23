# Auditoria de paridade do módulo Produtos: ERP → App Mobile

**Status:** em andamento. Este inventário acompanha as execuções cíclicas da auditoria.

## Regras e referências consultadas

- `AGENTS.md` e `docs/geral/USER_RULES.md`.
- Skills de replicação ERP → app. A cópia encontrada neste workspace está em `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/erp-web-to-mobile-replication/SKILL.md`; ela está em cache gerado e não foi tratada como fonte canônica. Nenhuma cópia canônica foi encontrada em `.agents/skills` na raiz, `erp/` ou `mobile/` durante este ciclo.
- `docs/negocio/produtos/estrutura-produto-variacao.md` e `docs/negocio/produtos/operacoes-troca-pai-merge.md`.
- `docs/arquitetura/offline-e-sincronizacao.md` e `docs/mobile/arquitetura_offline_first.md`.
- Regras em `rules/`; nenhuma regra específica de Produtos foi localizada. A regra de escrita de movimentos de estoque não se aplica ao recorte auditado.

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

### Pendências para próximos ciclos

- [ ] Com conta de teste disponível, comparar com Playwright o seletor Simples/Com variações, a lista expandida e o editor de componentes da variação composta entre ERP e Expo Web, uma aba/estado por execução.
- [x] Auditar a busca textual da lista no Ciclo 3; ficam pendentes os filtros e os estados visuais da lista.
- [x] Auditar o estado de filtros e adicionar a limpeza no mobile no Ciclo 4; a correção do contrato de categoria do ERP está pendente.
- [ ] Retomar a ordenação após definir o contrato do ERP, pois os controles atuais não alteram a consulta.
- [ ] Auditar abas restantes do formulário: informações básicas, fotos, características, descrição, preço/estoque e fiscal, conferindo as particularidades documentadas e o inventário RHF/Zod.
- [ ] Auditar ações da lista, categorias/atributos e demais estados (vazio, erro, sem resultados, permissões e confirmação).
- [ ] Confirmar origem canônica da skill `erp-web-to-mobile-replication`; a cópia consultada está apenas em cache de build.

**Critério de encerramento global:** concluir cada área aplicável, registrar exceções justificadas e manter pendentes explícitas as validações que dependam de runtime nativo; não declarar equivalência nativa com base somente no Expo Web.
