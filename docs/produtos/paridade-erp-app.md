# Auditoria de paridade do módulo Produtos: ERP → App Mobile

**Status:** em andamento. Este inventário acompanha as execuções cíclicas da auditoria. A Conciliação de Produtos segue exclusiva do ERP pela exceção dos Ciclos 127/131. A projeção técnica escolhida pelo usuário está aplicada nos dois writers desde o Ciclo 139, com `technical_specs` preservado por compatibilidade; o Ciclo 180 acrescentou 7 testes Vitest do helper compartilhado para simples, família, precedência, preservação e falha de leitura. O autosave seguro do Ciclo 117 já tem a RPC de ACK instalada no remoto pelo Ciclo 178; ainda falta provar resposta/idempotência com uma fixture previamente autorizada. O claim offline decidido pelo usuário está implementado e testado localmente (Ciclos 143/170), mas o backend remoto continua em v1: a migration necessária cria objetos em `app_private`, enquanto o `AGENTS.md` §13 autoriza migrations apenas em `public`; a pergunta sobre autorizar essa migration específica ou redesenhar o armazenamento continua pendente — a confirmação do modelo de ownership não concede essa autorização de schema. Não ativar as flags v2 nem declarar ownership remoto seguro antes dessa decisão e da validação. O Ciclo 181 comprovou acesso autenticado do ERP à lista e ao editor de composição por Playwright; outras abas/perfis e o aplicativo ainda não foram validados. O Ciclo 184 adicionou ao app o filtro administrativo para exibir registros de teste e compartilhou com o ERP o predicado PostgREST para marcadores em `technical_specs`; validação visual e Android/iOS seguem pendentes. Permanecem pendentes a confirmação de efeitos externos Meta/R2 e diagnósticos TypeScript globais em arquivos fora dos recortes recentes. Os demais ciclos e limitações seguem registrados abaixo; não declarar conclusão global enquanto houver estados sem conferência.

**Atualização do Ciclo 328:** as sugestões de componentes na aba Composição agora exibem o preço promocional com a mesma precedência do ERP, usando regra compartilhada. O preço regular que é gravado na linha do componente não foi alterado.

**Atualização do Ciclo 329:** o usuário confirmou alinhar ERP e app à documentação ao converter uma família salva de duas variações em produto simples. Os dois clientes já reativam a herança do pai para os campos comerciais documentados, mantendo UUID/SKU, saldo físico e atributos próprios; não foi necessária nova alteração de produção.

**Atualização do Ciclo 330:** cobri com Vitest o callback de remoção do componente na aba móvel de Composição: a linha selecionada sai do estado do formulário e as demais permanecem. O teste ERP do formulário também passou; nenhum código de produção mudou.

**Atualização do Ciclo 331:** corrigi a geração em lote nos dois clientes para usar no nome automático apenas valores de atributos com `showName !== false`; os atributos ocultos continuam persistidos e disponíveis para filtros e validação.

**Atualização do Ciclo 332:** esclareci o controle `showName` no modal ERP e no modal mobile. Os rótulos agora dizem se o valor da característica entra no nome automático, sem sugerir que “só o valor” aparece quando a opção está desligada.

**Atualização do Ciclo 333:** no cadastro de tipos de produto, o app agora exibe indicador de gravação e desativa o botão durante a inserção, como o ERP. O formulário continua validando pelo schema compartilhado e serviço/payload permanecem iguais.

**Atualização do Ciclo 335:** a busca de categorias no app agora preserva espaços nas pontas do termo, como a busca ERP existente; a regressão confirma também que termo composto só por espaços não ativa filtro. Testes do domínio de categorias: **48/48**.

**Atualização do Ciclo 336:** documentei como adaptação nativa justificada a orientação contextual dos estados vazios de Categorias/Ambientes no app: diferencia busca sem resultado de cadastro vazio e indica a recuperação pelo toque. Não altera filtro, dados ou ações; o ERP conserva sua mensagem de tabela.

**Atualização do Ciclo 305:** o usuário confirmou que a ação do Catálogo deve ficar bloqueada para perfis sem a permissão correspondente. ERP/app já bloqueiam a interface; a migration local de proteção no banco corresponde a esse contrato, mas permanece não aplicada e não comprovada no remoto.

**Atualização do Ciclo 303:** o status do Catálogo permanece visível e bloqueado para perfil sem `productConfig`; o salvamento não publica nem oculta. Rascunho e pendências de legibilidade são bloqueios separados da autorização. O ERP agora usa fallback fechado (`canManageCatalog=false`) quando um chamador omite a permissão, convergindo com o default mobile. Vitest ERP passou em **10/10**.

**Atualização do Ciclo 302:** não foi possível validar a tecla de busca em Android: `adb devices -l` não listou telefone e o comando Maestro não está instalado. Não instalei/substituí build nem alterei dados; a prova nativa segue pendente.

**Atualização do Ciclo 243:** na família com múltiplas variações, o app agora limita a 15 as fotos próprias ao carregar e gravar, sem limitar a galeria do pai nem a galeria herdada de produto simples. Reordenação e desvínculo de URL legado não dependem mais de a foto ainda existir na galeria do pai; novas seleções continuam restritas às fotos disponíveis. Vitest mobile **55/55**, modal ERP **9/9** e `git diff --check` passaram. A verificação TypeScript mobile ainda encerra com 10 diagnósticos globais, sem referências aos arquivos alterados. Sem Playwright autenticado, Android/Maestro ou escrita remota.

**Atualização do Ciclo 154:** a entrada de estoque continua atualizando `stock` e CMPM/`costPrice`; ela não recalcula `finalPurchasePrice` no ERP. Como a documentação vigente não cria essa regra e a hidratação do formulário ERP/mobile usa o mesmo cálculo compartilhado, foi preservado o resultado atual do ERP conforme a instrução permanente do usuário para divergências sem contrato documentado.

**Atualização do Ciclo 155:** o seletor de características de categoria no app agora segue o mínimo de duas letras e a normalização compartilhada do ERP. Leituras do catálogo/vínculos têm limite de 15 s nos dois clientes; o formulário continua falhando fechado quando não consegue carregar a configuração atual. O campo-filho foi vinculado ao proprietário RHF/Zod no inventário de formulários.

**Atualização do Ciclo 156:** a tela nativa do Catálogo Meta agora alerta que o feed CSV é legado, orienta usar a Graph API e manda confirmar publicação/remoção pelo `retailer_id` ou SKU no catálogo externo. Não houve chamada de rede ou alteração do endpoint CSV.

**Atualização do Ciclo 160:** a releitura estática confirmou que a projeção de atributos obrigatórios alcança tanto a variação operacional única de produto simples quanto cada linha de uma família, via helper compartilhado usado pelos writers ERP e mobile. Foram corrigidos os marcadores históricos dos Ciclos 38–39 que ainda diziam que essa persistência e a interface mobile da Conciliação estavam pendentes. Prova remota de dados, UI autenticada e runtime Android/iOS permanecem pendentes.

**Atualização do Ciclo 161:** alinhei o payload mobile ao ERP ao apagar a característica `Marca`: o app agora preserva `brand: ''` (e omite a chave quando o campo não foi fornecido), em vez de converter string vazia para `null`. O teste focado do serviço passou em 27/27 após estabilizar o mock da leitura de atributos obrigatórios; a validação visual autenticada e nativa segue pendente.

**Atualização do Ciclo 162:** reauditei `channelBaseDescriptions.whatsapp` em todos os caminhos ativos de envio Graph revisados e acrescentei cobertura Vitest para os serviços ERP/mobile. Os fluxos por lote e o envio individual ERP incluíram a base configurada nos payloads testados, sem duplicar o prefixo. Não encontrei um caminho ativo revisado que publique a descrição sem a base configurada; não houve chamada à Meta.

**Atualização do Ciclo 163:** revalidei estaticamente o autosave de rascunhos contra o hook ERP, a fila mobile e a RPC versionada local. A fila/version-ack mobile passou novamente em 35/35 testes Vitest. O estado remoto continua pendente conforme a última evidência registrada no Ciclo 141; não apliquei migration nem fiz chamadas remotas.

**Atualização do Ciclo 164:** reexecutei os testes atuais da conversão família→produto simples nos dois clientes. ERP passou em 12/12 e mobile em 8/8; a leitura confirmou o helper compartilhado e a preservação explícita do saldo, UUID, SKU e atributos da variação sobrevivente. UI autenticada/nativa e persistência remota seguem sem prova.

**Atualização do Ciclo 165:** no upload direto de fotos do formulário mobile, substituí a chave R2 baseada em `Date.now()` + nome informado por UUID + nome sanitizado, como no ERP. A API de upload continua recebendo o mesmo contrato; teste Vitest cobre nomes repetidos e fallback quando `crypto.randomUUID` não existe (6/6). Sem upload remoto ou validação visual/nativa.

**Atualização do Ciclo 166:** a aba Fotos mobile agora gera as versões WebP média e miniatura requisitadas pelos leitores de imagem, usando perfis compartilhados com o ERP (1000 px/0,5 MiB/0,85 e 200 px/0,05 MiB/0,75). O upload original permanece obrigatório e é o único URL persistido; falhas nos derivados usam fallback para o original. A validação Vitest passou em **10/10 do serviço de fotos**, mais **3/3 do domínio de recorte**, e **24/24 ERP**; a verificação TypeScript isolada dos arquivos mobile alterados passou. Playwright autenticado/R2 e Android/iOS continuam pendentes; o TypeScript global mobile segue bloqueado por sintaxe preexistente em `CategoryAttributesPicker.tsx:154`.

**Atualização do Ciclo 167:** o recorte de foto de uma variação agora valida por RHF/Zod se o URL de origem ainda está na galeria exibida antes do processamento/upload e repete a validação antes de aplicar a substituição. A rotina ERP já verificava a origem antes do upload e na etapa de troca; no mobile, uma origem obsoleta podia subir um arquivo órfão e fechar o recorte sem substituir nenhuma referência. O schema compartilhado novo e seu Vitest passaram em **2/2**; validação TypeScript direcionada foi executada, sem diagnóstico nos arquivos alterados, mas o comando terminou com incompatibilidades preexistentes fora deles. Playwright autenticado, R2 real e Android/iOS permanecem pendentes.

**Atualização do Ciclo 168:** a aba Fotos do produto pai passou a fornecer ao modal de recorte a lista atual da galeria. Assim, o mesmo schema RHF/Zod rejeita a origem removida antes de processar/enviar e volta a verificá-la antes de aplicar a substituição, alinhando o estado do produto pai à validação já usada nas fotos de variação.

**Atualização do Ciclo 169:** no envio final de produto simples com `minStock` negativo, ERP e app bloqueiam pelo resolver Zod e mantêm a aba ativa sem redirecionar para Estoque e Precificação. A comparação das rotas mostrou equivalência, não uma diferença exclusiva mobile. Os outros estados de preço/estoque e as validações visuais/nativas seguem em aberto.

**Atualização do Ciclo 175:** removido o bloqueio de parser no seletor mobile de atributos de categoria. O TypeScript global deixou de reportar `TS1005` nesse arquivo; continuam 12 diagnósticos em outras áreas do app/shared-utils, registrados no ciclo abaixo.

**Atualização do Ciclo 176:** corrigida a assinatura Zod v4 do schema compartilhado de descrições por IA. O compilador mobile deixou de apontar `productAiFormSchemas.ts`; permanecem 11 diagnósticos globais em arquivos alheios ao schema, conforme evidências do ciclo abaixo.

**Atualização do Ciclo 177:** o resultado timeout/valor do helper compartilhado de atributos agora é discriminado por presença de `value`, resolvendo o diagnóstico TypeScript sem alterar o prazo ou o fail-closed já aplicado a ERP e mobile. A checagem global reduziu de 11 para 10 diagnósticos; o helper passou em **3/3** testes Vitest dedicados.

**Atualização do Ciclo 183:** o app passou a distinguir uma falha de atualização da mesma consulta de uma falha após mudar filtro/página. Assim mantém na tela somente o último snapshot que corresponde à consulta atual, como o ERP, sem ocultar resultados válidos por causa de um refresh malsucedido nem vazar itens de filtros anteriores. O helper puro de snapshot passou em **6/6** testes Vitest; UI e runtime Android/iOS continuam pendentes.

**Atualização do Ciclo 184:** o filtro administrativo de registros de teste foi acrescentado à lista mobile, validado pelo schema RHF/Zod antes da consulta e protegido pela permissão administrativa derivada da sessão. O predicado PostgREST dos marcadores JSON em `technical_specs` agora é único e compartilhado entre o filtro da lista ERP, as estatísticas ERP e o serviço mobile, mantendo a exclusão no servidor antes de paginação; a visualização habilitada também alcança as cargas completas por ID. Vitest focado: mobile **26/26**, ERP **12/12**. Os checks TypeScript globais continuam não zero por diagnósticos fora dos arquivos alterados; Playwright e Android/iOS não foram executados, conforme as limitações de sessão já registradas no Ciclo 182. Nenhum dado remoto foi gravado; o runner ERP executou o `build:support` previsto pelo script do pacote e alterações preexistentes de suporte/guia foram preservadas.

**Atualização do Ciclo 201:** o descarte de rascunho mobile agora usa a RPC `delete_unreferenced_product`, igual ao ERP, sem excluir variações diretamente, ignorar falhas ou converter falha em exclusão lógica silenciosa. A tela impede a chamada sem as permissões que tornam o item disponível (`productConfig` e `deleteProducts`); a RPC também verifica `deleteProducts`, referências/estoque e concorrência antes de excluir. A confirmação passa pelo resolver RHF/Zod e só remove o item local após resposta de sucesso. A implantação remota da função e a validação Android/iOS permanecem pendentes; não houve consulta ou escrita remota.

**Atualização do Ciclo 202:** “Mover para lixeira” no app agora repete o gate de permissão na tela, executa a confirmação por RHF/Zod e aplica timeout de 10 s ao RPC transacional; somente resposta de sucesso agenda o Graph. Vitest focado passou em **79/79**. A RPC operacional e o comportamento Android/iOS não foram consultados.

**Atualização do Ciclo 157:** foram reconciliados marcadores antigos de “próximo recorte” já cobertos por ciclos posteriores (variações, projeção de atributos, composição, lista, preço/estoque, responsável do inventário e Meta). As limitações de UI autenticada/nativa, persistência externa e RPC de saldo/CMPM continuam pendentes; nenhuma foi fechada por evidência estática.

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
- [x] Os filtros de status ativo/inativo ficam suspensos enquanto há busca textual, mantendo o rascunho de filtro, como no ERP. A busca não considera a descrição: o contrato atual consulta nome/código do pai e nome/SKU de variações pela regra compartilhada. Esta descrição substitui a frase histórica incorreta, corrigida no Ciclo 301.
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

#### Evidência e correção

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

#### Evidência e correção

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

### Ciclo 298 — promoção conforme propriedade no card de produto simples — 25/10/2026

**Recorte:** estado da lista no card de produto simples/variação operacional única. Conferi preço regular e promoção efetivos herdados do pai, promo ausente/zero/inválida e os dados que chegam ao card ERP e mobile.

#### Auditoria e correção

- [x] ERP: `fetchProductsPage` mapeia o pai com `mapFromDB`, a lista usa `flattenProductsForList` e calcula `allVariations` com `resolveProductVariationPricing`. O card e a célula da tabela selecionam a variação única já efetiva; só mostram o preço promocional quando ele é numérico, maior que zero e menor que o preço regular. O modelo de produto salvo com uma variação restaura a herança pai→filho na redução, conforme Ciclo 119 e `estrutura-produto-variacao.md`.
- [x] App: `mobileProductFetchService` resolve preço e promoção separadamente conforme `syncUnitPrice`/`syncPromoPrice`, sem alterar as flags. Divergência encontrada no card: `useMobileProductCardState` fazia fallback `singleVariation.promoPrice ?? product.promoPrice` sem considerar o dono do campo. Numa variação com promoção própria vazia/nula, o card mostrava a promoção do pai; ERP preservava a ausência do valor próprio.
- [x] Corrigido no app: `resolveMobileProductCardPricing` em `mobileProductCardRules.ts` agora usa o helper compartilhado `resolveProductVariationPricing` e só consulta o preço promocional do pai se a variação herda esse campo. Variação sem promoção própria permanece sem promoção, mesmo que o pai tenha uma; com herança ativa, o card continua mostrando a promoção válida do pai. Não mudei flags, payloads, persistência, preço de formulário, gate do Catálogo ou ações de Conciliação.
- [x] A condição de exibição permanece equivalente ao ERP: promoção ausente, zero, inválida, igual ou acima do preço regular não produz badge nem preço antigo riscado; promoção positiva menor que o preço regular é exibida. As regressões cobrem herança válida, valor próprio ausente/zero/inválido e promoção de pai ausente/zero/igual/maior/inválida.
- [x] Código e testes deste recorte: `mobile/src/features/products/domain/mobileProductCardRules.ts`, `mobile/src/features/products/domain/mobileProductCardRules.test.ts` e `mobile/src/features/products/hooks/useMobileProductCardState.ts`. Os testes ERP existentes em `productListTransformers.test.ts` e `ProductCardVariationItem.test.tsx` e o teste de leitura mobile `mobileProductFetchService.test.ts` foram executados como cobertura adjacente.

#### Validação e limites

- Vitest/RTL focado: **100/100 em 4 arquivos** — testes de transformação da lista ERP, card/linha de variação ERP, fetch mobile e regras de apresentação do card mobile.
- `npx tsc --noEmit --pretty false` em `mobile/` terminou com código 1 por **15 diagnósticos globais** em `e2e/categories-characteristics.spec.ts`, campos numéricos comuns, finanças, agenda, inventário, notas fiscais, configuração Vitest e `shared-utils/commercialScheduling`; nenhum aponta aos arquivos deste ciclo.
- `git diff --check` passou para os arquivos/documentos deste recorte; Git sinalizou somente conversões CRLF/LF no working tree.
- Sem Playwright autenticado: a sessão anterior redireciona para login e o fluxo disponível pode limpar rascunhos. Sem Maestro em aparelho físico; não usei Expo Web como prova nativa. Sem Supabase/PostgreSQL/Docker local, consulta ou escrita remota, DML, RPC real, migration, Meta Graph API ou deploy. Nenhuma regra operacional do Estoque mudou; o Guia Prático não se aplica.
- Regras e fontes consultadas antes da correção: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/mobile/arquitetura_offline_first.md`, auditoria de arquitetura de produtos, inventário de formulários, este inventário e roadmap. Não há `AGENTS.md` aninhado nas árvores ERP/mobile/`shared-utils` usadas. A skill atual não está nas pastas canônicas `.agents/skills`/`skills` nem no perfil; a cópia `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/erp-web-to-mobile-replication/SKILL.md` foi consultada somente como orientação em cache.

**Conclusão do recorte:** o card mobile agora respeita a propriedade da promoção como ERP, inclusive quando a promoção própria está ausente. Quando a variação herda, ambos mostram somente promoção positiva e abaixo do preço regular. A auditoria geral de Produtos continua aberta.

#### Próximo recorte identificado

O item que este ciclo havia encaminhado foi auditado no Ciclo 299; resultado e evidências estão registrados abaixo.

### Ciclo 299 — alias legado de preço de venda na lista — 25/10/2026

**Recorte:** mapeamento de preço de venda do produto pai e da variação operacional herdada na lista de Produtos.

#### Auditoria e correção

- [x] `unit_price` é a fonte atual e `price` é fallback legado: as escritas do ERP/mobile preenchem os dois campos; as migrations de busca/ativação usam `COALESCE(unit_price, price, 0)` nessa ordem. O schema-base preserva `price NOT NULL`, enquanto `unit_price` foi adicionado nullable sem backfill. A migration de ativação deixa elegível um produto com preço legado positivo quando `unit_price` está nulo. Isso comprova um estado persistido permitido, embora nenhuma linha remota tenha sido consultada.
- [x] Divergência comprovada na cadeia: ERP `LIGHT_COLUMNS` buscava somente `unit_price`; com essa projeção, um pai sem valor na coluna nova virava zero no `mapFromDB`. O app seleciona `*`/ambos os aliases e resolvia `unit_price ?? price`, exibindo o valor legado. No ERP, quando ambos eram carregados, `mapFromDB` também dava prioridade ao alias antigo `price`, diferente do fetch mobile e das queries atuais de catálogo.
- [x] `product_variations.use_parent_price` tem default `true` e aceita `null`. O app e `resolveProductVariationPricing` tratam somente `false` como preço próprio; o mapper ERP usava truthiness e, para `null`, selecionava incorretamente o preço próprio da variação. O mapper ERP agora adota o mesmo teste explícito `!== false`.
- [x] Criada `shared-utils/productUnitPrice.ts` para centralizar precedência `unit_price` → `unitPrice` → `price` → zero. O ERP agora seleciona `price` para permitir o fallback e usa o helper no mapeamento do produto, da variação padrão e das variações herdadas. O fetch mobile também usa o mesmo helper em suas projeções de produto e variações, mantendo o valor legado apenas quando falta o canônico.
- [x] Regras de preço próprio de variação, flags de herança, payloads de gravação e schema do banco não foram alterados. Nenhuma migration foi criada ou aplicada; a Conciliação de Produtos continua exclusiva do ERP.
- [x] Fontes consultadas antes da mudança: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/mobile/arquitetura_offline_first.md`, `docs/produtos/auditoria-arquitetura-organizacao-produtos.md`, este inventário e `docs/geral/roadmap_pendente.md`. Não há `AGENTS.md` aninhado nas árvores ERP/mobile/`shared-utils`. A skill atual não foi localizada nas pastas canônicas `.agents/skills`/`skills` nem no perfil; a cópia `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/erp-web-to-mobile-replication/SKILL.md` foi consultada somente como orientação em cache.

#### Validação e limitações

- [x] Vitest focado: mapper do produto, mapper de variações, serviço/fetch da lista mobile e fiscal mapper — **4 arquivos, 48/48 testes aprovados**. Cobertura inclui alias divergente, `unit_price` nulo, fallback legado e herança ERP com flag `null`.
- [x] `tsc --noEmit` ERP terminou com exit 2 e **415 diagnósticos** já distribuídos pelo projeto; filtragem confirmou **zero** em `productMapper.ts`, `productVariationMapper.ts`, `productQueryService.ts`, `productMapperPricing.test.ts`, `mobileProductFetchService.ts` e `productUnitPrice.ts`. O `tsc` mobile terminou não-zero com **15 diagnósticos globais** em Node typings, inputs numéricos, finanças, agenda, estoque, notas fiscais, configuração Vitest e `commercialScheduling`; nenhum aponta os arquivos deste recorte.
- [ ] Não foi feita leitura/escrita remota, DML, RPC, migration, deploy ou chamada externa. UI autenticada e runtime Android/iOS não foram exercitados; Expo Web não comprovaria comportamento nativo.
- [x] `git diff --check` dos arquivos tocados passou; Git sinalizou apenas normalização CRLF/LF nos arquivos existentes.

**Conclusão do recorte:** ERP e app agora usam a mesma precedência no pai e na variação herdada. `unit_price` prevalece inclusive quando diverge do alias antigo; se for nulo, o preço legado é exibido nos dois. Uma flag de herança `null` também segue o default compartilhado e herda o preço do pai. A auditoria geral de Produtos permanece aberta.

### Ciclo 300 — preço canônico na validação de ativação mobile — 25/10/2026

**Recorte:** estado de ativação/desativação de produto simples e variação, especialmente o preço do pai usado pela validação compartilhada.

#### Evidência da divergência

- [x] O ERP envia `targetProd.unitPrice` ao `validateProductActivationRequirements`; a lista hidrata esse campo por `mapFromDB`, agora com precedência compartilhada `unit_price` → alias camel → legado `price` (Ciclo 299).
- [x] O serviço mobile consulta a linha persistida antes de ativar e construía `unitPrice` por `row.price ?? row.unit_price`. Quando os aliases divergiam, a validação podia permitir ativação com `unit_price = 0` e `price > 0`, ou bloquear preço canônico positivo com alias legado zerado.
- [x] A regra de domínio compartilhada valida preço do pai para produto simples e variação herdada; os gates existentes de permissão, rascunho, salvados, categoria, fornecedor e composição permanecem no mesmo caminho.

#### Correção aplicada e validação

- [x] `mobileProductMutationService` agora usa `resolveProductUnitPrice`, o mesmo helper já aplicado às leituras da lista ERP e mobile. Nenhuma regra de permissão/status, query, payload de escrita ou RPC foi alterada.
- [x] Adicionada regressão em `mobileProductMutationService.test.ts`: com `unit_price = 100` e `price = 0`, a ativação prossegue pelo preço canônico; a implementação anterior falhava esse cenário. Os testes existentes continuam cobrindo preço herdado zerado e ausência de mutação quando inválido.
- [x] Vitest/RTL focado: **61/61 testes** em `mobileProductMutationService.test.ts`.
- [x] Sem Playwright autenticado ou teste Android/Maestro; o teste de serviço não executa gravação remota. Sem Supabase/PostgreSQL/Docker local, consulta ou escrita remota, RPC real ou deploy. `git diff --check` passou; Git sinalizou apenas a normalização CRLF/LF dos arquivos existentes.
- [x] Regras consultadas antes da mudança: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/mobile/arquitetura_offline_first.md`, `docs/produtos/auditoria-arquitetura-organizacao-produtos.md`, este inventário e `docs/geral/roadmap_pendente.md`. Não há `AGENTS.md` aninhado nas árvores ERP/mobile/`shared-utils` utilizadas. A skill canônica não está nas pastas `.agents/skills`/`skills`; a cópia em `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/erp-web-to-mobile-replication/SKILL.md` foi usada apenas como orientação em cache.

**Conclusão do recorte:** a validação de ativação mobile agora recebe o mesmo preço efetivo que a lista ERP e aplica a precedência canônica já compartilhada. Os gates de ativação permanecem inalterados. A auditoria geral de Produtos continua aberta.

### Ciclo 301 — submissão imediata da busca mobile — 25/10/2026

**Recorte:** busca textual na lista de Produtos e Composições, incluindo tecla de submissão, termos consultados, estados sem termo/sem resultados/erro e interação com filtros e paginação.

#### Evidência da comparação

- [x] A regra de termos é compartilhada em `shared-utils/productListSearch.ts`: nome e código do produto pai; nome e SKU das variações; normalização de acentos, hífen e variantes `i/y`; descrição não participa. As consultas ERP (`productFilterBuilder.ts`) e mobile (`mobileProductFetchService.ts`) usam os mesmos builders, consultam variações até `limite + 1` e propagam a mesma mensagem quando há mais de 100 correspondências.
- [x] ERP e app compartilham mínimo de 3 caracteres e debounce de 350 ms. O ERP também aplica imediatamente no Enter pelo `handleSearchKeyDown`, cancelando o debounce pendente; limpa o termo aplicado se o campo estiver vazio e ignora submissão de 1–2 caracteres. No app, `ProductsHeader` não encaminhava `onSubmitEditing`; o campo só aplicava via debounce.
- [x] Na mudança de busca, o ERP reinicia a consulta na página 1 e limpa seleção; o app troca a chave dos filtros, solicita a página 1 e mantém o controle de requisições obsoletas. Filtros de categoria, publicação e modo continuam combinados; Ativos/Desativados são suspensos durante busca nos dois, enquanto a seleção de Rascunhos permanece específica.
- [x] Com termo vazio não é feita busca de variações em nenhum cliente. Os dois apresentam estado vazio quando a consulta retorna zero; falhas da consulta de variações impedem resultado parcial. O retry configurado do ERP é uma nova tentativa e o app faz uma repetição, conforme os contratos existentes. Loading, alertas e componentes visuais seguem adaptados à plataforma.
- [x] A descrição anterior do Ciclo 3 que dizia “restrita a nomes” estava incorreta para a implementação atual. Foi substituída pelo contrato comprovado nome/código/SKU, sem estender a busca a descrição.

#### Correção aplicada e validação

- [x] O app expõe `submitSearchTerm`: ao submeter via teclado, cancela o timer pendente e aplica imediatamente um termo válido; em branco limpa; com 1–2 caracteres ignora a ação, preservando o filtro aplicado, como no Enter do ERP. A digitação continua usando o debounce compartilhado de 350 ms e o mínimo de três caracteres.
- [x] `ProductsHeader` encaminha `TextInput.onSubmitEditing`, configura `returnKeyType="search"` e atualiza o placeholder para “Buscar por nome, código ou SKU”, que corresponde aos campos realmente pesquisados. O pedido continua passando pelo `productListFormSchema`/`useZodForm` antes de `fetchMobileProductsPage`.
- [x] Vitest ERP: **22/22** em `productFilterBuilder.test.ts` e `ProductSearchDebounce.test.tsx`. Vitest mobile: **47/47** em `mobileProductListFilters.test.ts`, `mobileProductSearch.test.ts` e `mobileProductFetchService.test.ts`; nova cobertura do resolver de submissão testa termo válido, vazio e curto.
- [x] `tsc --noEmit` mobile terminou com exit 1 por **15 diagnósticos globais** em E2E, componentes de campos numéricos, finanças, agenda, estoque/faturas, configuração Vitest e `commercialScheduling`; nenhum aponta aos arquivos alterados neste ciclo.
- [x] `git diff --check` passou; Git mostrou apenas avisos de normalização CRLF/LF em arquivos existentes.
- [ ] Não houve execução visual autenticada por Playwright nem validação da tecla em Android físico/Maestro. Playwright/Expo Web não comprova `TextInput.onSubmitEditing` no runtime nativo. Não houve Supabase/PostgreSQL/Docker local, consulta/escrita remota, mutação de Produto ou deploy.
- [x] Regras consultadas antes da mudança: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/mobile/arquitetura_offline_first.md`, inventário de formulários, este inventário e roadmap. A busca não possui uma particularidade mobile separada localizada em `docs/`; o contrato estava registrado neste inventário. Não há `AGENTS.md` aninhado nas árvores ERP/mobile/`shared-utils`. A skill canônica não existe em `.agents/skills`/`skills`; a cópia em cache em `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/erp-web-to-mobile-replication/SKILL.md` foi consultada apenas como orientação.

**Conclusão do recorte:** termos pesquisados, normalização, limite, filtros combinados, paginação, vazio e erro já convergiam; a submissão pelo teclado era a diferença funcional. O app agora aplica a consulta imediatamente sem alterar o contrato do servidor ou os filtros. A auditoria geral de Produtos continua aberta.

#### Próximo recorte identificado

### Ciclo 302 — tentativa de validação nativa da busca — 25/10/2026

**Recorte:** disponibilidade de aparelho físico e Maestro para validar `TextInput.onSubmitEditing` do Ciclo 301.

- [x] `adb devices -l` retornou a lista vazia (“List of devices attached”) e `Get-Command maestro` não encontrou o executável. O README do Maestro do projeto exige telefone físico pareado via Wi‑Fi ADB; emulador/USB não foram usados como substituto.
- [x] Não instalei ou substituí build, não limpei dados e não iniciei servidor; nenhuma consulta/escrita remota, alteração de Produto ou deploy ocorreu.
- [ ] A tecla de busca continua sem comprovação Android nativa; Playwright/Expo Web não prova `onSubmitEditing` no React Native.

**Conclusão do recorte:** a validação nativa está bloqueada pela indisponibilidade local de telefone Wi‑Fi ADB e Maestro. A implementação lógica e a submissão acessível permanecem cobertas pelo Ciclo 301. A auditoria prossegue para outro estado funcional sem instalar ferramentas ou alterar dados do aparelho.

### Ciclo 303 — bloqueio do Catálogo Digital sem permissão — 25/10/2026

**Recorte:** interação com o badge de publicação/ocultação na lista de Produtos para perfil sem `productConfig`.

#### Contrato confirmado e correção

- [x] No ERP, `erp/src/pages/App/Products/Index.tsx` calcula `readOnly = !canPerform('productConfig', roles)`; a lista propaga esse estado e os componentes de card/linha derivam `canManageCatalog` dele. No app, `NativeProductsScreen.tsx` usa `canUseProductPermission('productConfig')` e encaminha o resultado aos cards e variações.
- [x] Ambos mantêm o status do Catálogo visível, mas bloqueiam publicar/ocultar sem a permissão. A permissão de abrir a tela de administração Meta (`viewMetaCatalog`) é separada. Rascunho também fica bloqueado; produto finalizado com dados obrigatórios ausentes pode abrir a ação, mas a validação compartilhada rejeita a publicação e não altera o status. Salvar o produto não publica nem oculta automaticamente.
- [x] Identificado um fallback permissivo isolado no componente ERP: `ChannelStatusBadges` assumia `canManageCatalog=true` se um futuro chamador esquecesse de informar a permissão, enquanto o badge mobile assume falso. O default ERP agora é `false`; callers autorizados mantêm `true` explícito derivado da sessão. O handler também já retornava sem mutação quando a permissão é falsa.
- [x] Adicionada regressão RTL que passa callback sem permissão explícita e confirma botão desabilitado, dica acessível e ausência de callback; testes de cenários autorizados passaram a informar `canManageCatalog=true` explicitamente.
- [x] O esclarecimento do usuário confirma que o controle pode ficar bloqueado para quem não tem a permissão correspondente. “Gate” neste contexto significa essa guarda de acesso; um trigger SQL é uma proteção adicional do servidor, não o botão nem uma regra de elegibilidade do Catálogo.

#### Validação e limites

- [x] Vitest/RTL ERP `ChannelStatusBadges.test.tsx`: **10/10**.
- [x] `git diff --check` passou; somente avisos de normalização CRLF/LF.
- [ ] Sem Playwright autenticado ou teste Android/iOS; nenhuma chamada à Meta, consulta/escrita remota, migration ou deploy ocorreu. A proteção server-side por trigger continua como pendência independente registrada nos ciclos 208/222; não foi alterada neste recorte.
- [x] Regras consultadas: `AGENTS.md` (fornecido pelo usuário e lido para a seção de testes), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, inventário, roadmap e skill `erp-web-to-mobile-replication`. A busca confirmou que a skill não está nas pastas canônicas `.agents/skills`/`skills`; apenas a cópia de cache sob `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/` estava acessível e foi usada somente como orientação. Não há `AGENTS.md` aninhado em ERP/mobile; o arquivo aninhado em `digital-catalog/` não se aplica a este recorte.

**Conclusão do recorte:** o gate visual de permissão agora falha fechado também quando o componente ERP não recebe a prop. A ausência de `productConfig`, o estado de rascunho e os requisitos de elegibilidade para publicar são condições distintas; salvar por si só não muda o status do Catálogo.

#### Próximo recorte identificado

Continuar na próxima execução pela cadeia funcional de publicação já aprovada: confirmar em perfil autorizado a chamada após persistência e o tratamento dos erros do servidor, sem executar Graph API nem alterar dados externos. A validação nativa da busca do Ciclo 301 continua pendente até haver telefone físico Wi‑Fi ADB e Maestro.

### Ciclo 304 — erros e ordenação da mutação do Catálogo Digital — 25/10/2026

**Recorte:** publicação/ocultação de produto ou variação após a guarda de permissão, com atenção à ordem das gravações, à sincronização Meta e a falhas ambíguas.

#### Evidência e correção

- [x] Após os gates de `productConfig` e de elegibilidade documentados no Ciclo 303, o ERP e o app aguardam as escritas do produto/variação antes de solicitar a sincronização Meta em segundo plano. A sincronização não participa da confirmação de sucesso da persistência e não foi chamada externamente neste ciclo.
- [x] Divergência encontrada ao ocultar uma variação: o app já interrompia a operação se a consulta de irmãs publicadas falhasse; o ERP ignorava o `error` e podia ocultar o pai sem saber se ainda havia outra variação publicada. `persistCatalogStatus` agora propaga o erro antes da gravação do pai e antes do trigger Meta, alinhando-se ao comportamento mobile.
- [x] Erros genéricos podiam receber no app a mensagem incorreta “O status do produto não foi alterado”, inclusive se a gravação tivesse sido parcial ou se a reconsulta posterior à gravação falhasse. `getProductCatalogMutationFailureNotice` agora é compartilhado e orienta atualização da lista sem afirmar que o estado persistido permaneceu intacto; a negação SQLSTATE `42501` mantém a mensagem específica de permissão nos dois clientes.
- [x] Testes de serviço ERP comprovam que a falha na consulta de irmãs impede a gravação do pai e a sincronização Meta, e que no sucesso a ordem é gravação da variação → leitura das irmãs → gravação do pai → trigger. O serviço mobile já tinha cobertura para propagação de `42501` sem trigger e para sucesso; não foi alterado neste ciclo.

#### Validação e limitações

- [x] Vitest focado (ERP + serviço mobile): **81/81** em quatro arquivos — helper de aviso compartilhado (5), hook de lista ERP (12), persistência de status ERP (3) e serviço de mutação mobile (61).
- [x] `git diff --check` passou nos arquivos tocados; Git emitiu somente avisos de normalização CRLF/LF em arquivos existentes.
- [ ] O caminho foi exercitado com mocks, sem sessão real de perfil autorizado e sem persistência remota. Playwright autenticado não foi executado; não houve Graph API, confirmação no Catálogo Meta, leitura/escrita remota, migration ou deploy. A prova Android nativa segue pendente por falta de aparelho Wi‑Fi ADB/Maestro (Ciclo 302); Expo Web não foi usado como substituto.
- [x] Regras consultadas: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/mobile/arquitetura_offline_first.md`, este inventário, roadmap e a skill `erp-web-to-mobile-replication`. A busca não localizou skill canônica em `.agents/skills`/`skills`; somente a cópia em cache sob `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/` estava acessível e foi usada como orientação. `AGENTS.md` aninhado existe apenas em `digital-catalog/` e não se aplica a este recorte.

**Conclusão do recorte:** a gravação do pai não ocorre mais com leitura incerta das variações, e ambas as interfaces dão feedback honesto em falhas cujo resultado não foi confirmado. A guarda de perfil permanece separada da prontidão de publicação; nenhum acesso ou efeito externo foi simulado como prova real. A auditoria geral de Produtos continua aberta.

### Ciclo 305 — confirmação do gate de permissão do Catálogo — 25/10/2026

**Recorte:** ações do menu/status na lista de Produtos para perfis sem `productConfig`, retomando a dúvida do usuário sobre o que o “gate” bloqueia.

#### Evidência

- [x] O usuário confirmou que, para perfil sem a permissão correspondente, a ação do Catálogo pode ficar bloqueada. Neste fluxo, `productConfig` autoriza publicar/ocultar; não é o mesmo que o produto estar em rascunho nem que passar pela validação de requisitos.
- [x] O ERP calcula `readOnly = !canManageProducts` a partir de `productConfig`. Sem ela, o card mostra “Ver detalhes” em vez do menu de ações; `ChannelStatusBadges` conserva o status visível e desabilitado, inclusive como fallback quando o caller não informa `canManageCatalog` (Ciclo 303).
- [x] O app deriva `canEditProducts` de `productConfig`; `MobileProductCard` passa `canChangeCatalog=false` sem essa permissão e mantém o status legível. Detalhes de leitura continuam em ação separada. Os demais itens do menu de edição e as regras de rascunho/lixeira foram conferidos contra os Ciclos 190–198; `Pedidos Vinculados` para leitura foi fechado no Ciclo 191.
- [x] O estado da UI corresponde às regras compartilhadas de identidade de perfil/etiqueta em `shared-utils/productPermissions.ts`; a publicação continua validada pelo helper de elegibilidade usado pelos dois clientes. Salvar o formulário não publica o produto automaticamente.
- [x] Revisão estática da migration local `supabase/migrations/20261025002304_protect_product_catalog_status_permission.sql`: os triggers em `products` e `product_variations` protegem mudança de `status` e inserção já `published`, verificam `auth.uid()`, perfil e `rolePermissions.productConfig` e falham fechados para configuração explícita malformada. É uma camada de servidor distinta do bloqueio visual; não substitui a validação de conteúdo do Catálogo.

#### Limitações

- [ ] A migration não foi aplicada nem exercitada no banco remoto neste ciclo; enquanto permanecer ausente, uma escrita direta autenticada ainda pode tentar contornar o gate visual. A instrução da automação desta execução proíbe gravações externas, então a confirmação do comportamento do PostgreSQL segue pendente. Não use mocks ou a revisão do SQL como prova de RLS/trigger.
- [x] Não houve alteração de código, chamada Graph API, leitura ou gravação remota, migration aplicada, Playwright autenticado, Maestro ou deploy; por isso não foi executado teste automatizado neste recorte de confirmação/revisão estática. A orientação oficial do Supabase descreve RLS como controle no banco e recomenda `SECURITY INVOKER` por padrão: [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) e [Database Functions](https://supabase.com/docs/guides/database/functions).
- [x] Regras consultadas: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, documentos de estrutura e operações de variação, arquitetura offline-first, este inventário, roadmap, skill `erp-web-to-mobile-replication` e skill `supabase`. A skill de replicação segue acessível apenas na cópia em cache sob `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/`; a busca não encontrou `AGENTS.md` aninhado em `erp/`, `mobile/` ou `shared-utils`.

**Conclusão do recorte:** a regra que o usuário aprovou é bloquear a ação para quem não tem `productConfig`, mantendo o status visível. Rascunho e falta de requisitos também bloqueiam a publicação, por razões diferentes. O gate de interface está alinhado; o gate de banco permanece pendente de execução remota, sem ser apresentado como concluído.

#### Próximo recorte identificado

Revisar outro estado da lista de Produtos, mantendo a confirmação autenticada do perfil e a verificação externa Meta como limitações explícitas até haver sessão segura; não reutilizar Conciliação de Produtos no app.

### Ciclo 306 — confirmação do status visível sem `productConfig` — 25/10/2026

**Recorte:** releitura do badge Publicado/Oculto em cards de produto e variação para o perfil sem permissão de editar Produtos, após o esclarecimento do usuário sobre o “gate” do Catálogo.

#### Evidência

- [x] O usuário confirmou que a ação pode ser bloqueada para quem não tem permissão. O significado aplicado é: `productConfig` permite publicar/ocultar; sem essa permissão, o estado continua legível e o controle não executa a mutação. Ser rascunho e não atender aos requisitos de publicação continuam condições independentes.
- [x] `NativeProductsScreen` deriva `canChangeCatalog` de `canUseProductPermission('productConfig')` e mantém `showCatalogStatus` ligado para perfis a quem o status não deve ser ocultado. O mesmo par de props chega aos cards pai, variação única e lista expandida; `MobileChannelBadges` encaminha clique somente quando a regra de interação permite.
- [x] Revisão do helper mobile confirma botão bloqueado e dica de acessibilidade quando falta a permissão; a cobertura também diferencia produto finalizado, rascunho e variação mesclada.
- [x] Vitest focado de `mobile/src/features/products/domain/mobileProductCardRules.test.ts`: **61/61**. O teste RTL ERP `ChannelStatusBadges.test.tsx` passou **10/10** no Ciclo 303.

#### Limitações

- [ ] Não repeti o login Playwright: o Ciclo 182 identificou a limpeza automática `runDraftCleanup` no Dashboard ao autenticar, com tentativas de marcar rascunhos antigos como excluídos. Não há fixture própria autorizada para esse perfil; os testes de regra/helper não substituem observação de interface nem execução autenticada.
- [ ] A migration `20261025002304_protect_product_catalog_status_permission.sql` permanece local e não aplicada. A UI bloqueia a ação, mas a proteção contra escrita direta no banco não foi comprovada. Nenhuma chamada Meta, consulta/escrita remota ou DDL ocorreu.
- [x] Skill de replicação acessível somente na cópia de build/cache sob `erp/.vercel`; não foi tratada como fonte canônica. A skill Supabase e as regras de segurança do repositório foram consultadas; as policies locais permitem leitura do próprio perfil e da configuração de permissões.

**Conclusão do recorte:** a interpretação do usuário está refletida na interface e coberta pela regra mobile: status do Catálogo permanece visível, mas a ação é bloqueada sem `productConfig`. O código de produção não precisou de alteração. O próximo ciclo segue para outro estado da lista de Produtos; a autenticação que pode disparar limpeza e a proteção server-side não devem ser declaradas validadas por esta evidência.

### Ciclo 307 — mensagens das pré-condições de mover/mesclar na lista — 25/10/2026

**Recorte:** alertas do menu de ações de variação quando falta fornecedor ou, para mover, característica/valor.

- [x] ERP `ProductCardActions.tsx` e app `MobileProductVariationActionsMenu.tsx` já aplicavam as mesmas pré-condições: fornecedor para mover e mesclar; característica com valor para mover. O merge não exige atributo em nenhum cliente.
- [x] Alinhei os textos dos corpos dos alertas mobile aos toasts do ERP. Mantive os títulos curtos próprios do `Alert` nativo e não alterei gates, callbacks, serviços, payloads ou permissões. As props obrigatórias e a normalização dos atributos existentes foram preservadas.
- [x] Vitest focado `mobileProductVariationActionsService.test.ts`: **19/19**. `git diff --check` passou; Git emitiu somente aviso de normalização CRLF/LF no arquivo existente.

#### Limitações

- [ ] Não há teste de componente localizado para `MobileProductVariationActionsMenu`; o Vitest valida a derivação das pré-condições, não renderiza o novo texto de alerta. Sem Playwright autenticado ou validação Android/iOS/Maestro. A tentativa de autenticação continua evitada devido à limpeza de rascunhos do Dashboard (Ciclo 182); Expo Web não prova o `Alert` nativo.
- [x] Sem consulta/escrita remota, ação real de mover/mesclar, Supabase/PostgreSQL/Docker local, chamada Meta ou deploy. A Conciliação permanece exclusiva do ERP.
- [x] Regras consultadas: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, documentação de estrutura e operações de variação, este inventário, roadmap e skill `erp-web-to-mobile-replication`. Não há `AGENTS.md` aninhado nos diretórios ERP/mobile/`shared-utils`; a skill canônica não foi localizada fora da cópia de build/cache em `erp/.vercel`, consultada apenas como orientação.

**Conclusão do recorte:** mensagens das duas pré-condições agora correspondem ao ERP; a interface conserva títulos adaptados à plataforma. A auditoria geral de Produtos continua aberta.

#### Próximo recorte identificado

Retomar outro estado funcional da lista de Produtos, sem autenticar enquanto o Dashboard puder limpar rascunhos; manter pendentes a validação visual autenticada e a validação nativa até haver condição segura.

### Ciclo 308 — alternância Ativo/Desativado na lista — 25/10/2026

**Recorte:** acionamento do status ERP em produto simples/variação e confirmação antes de desativar.

- [x] Comparei `ChannelStatusBadges.handleERPClick` com `MobileChannelBadges.handleToggleERP`: ambos impedem a alteração para pai (status derivado), rascunho, origem não convencional/mesclada ou perfil sem permissão. A reativação passa pela regra compartilhada `productActivationValidation`; desativação não executa essa validação nos dois clientes.
- [x] O badge de status ERP chama diretamente a alternância nos dois clientes, sem confirmação intermediária. A confirmação em `deactivateSingleProduct` é do callback separado de descarte/desativação via `onDelete`, não do botão de status. Portanto não acrescentei uma confirmação redundante ao app.
- [x] O menu mobile oferece adicionalmente um atalho “Desativar/Reativar Produto”, que chama o mesmo handler de status do badge; não cria uma operação diferente. No app a alteração local só ocorre após a mutação retornar sucesso e a lista é recarregada; o ERP atualiza otimisticamente, mostra toast e reverte em erro. São estratégias de atualização por plataforma, com resultado persistido equivalente no sucesso.
- [x] O modo de erro dá feedback em ambos (toast ERP; `Alert` e refetch mobile). A ausência de toast de sucesso no app é compensada pela mudança visível do badge após a resposta e recarga; nenhuma divergência de regra ou confirmação exige correção neste estado.

#### Limitações

- [ ] Comparação estática dos handlers e callbacks; sem Playwright autenticado ou runtime Android/iOS/Maestro. Não rodei testes por não haver mudança de código; os testes focados de persistência/validação de ativação e seus resultados anteriores permanecem registrados nos Ciclos 207, 300 e 306.
- [x] Sem operação real de status, consulta/escrita remota, Supabase/PostgreSQL/Docker local ou deploy. Não acessei Conciliação no mobile.
- [x] Regras consultadas: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, inventário, roadmap e skill `erp-web-to-mobile-replication`. Não há `AGENTS.md` aninhado nos diretórios ERP/mobile/`shared-utils`; a skill canônica segue não localizada e a cópia de cache sob `erp/.vercel` serve somente como orientação.

**Conclusão do recorte:** o status ERP não pede confirmação antes da desativação; a confirmação de `deactivateSingleProduct` pertence ao callback de exclusão separado. O app preserva gates e validação compartilhada e acrescenta somente um atalho mobile ao mesmo controle. Nenhuma alteração de código foi necessária.

#### Próximo recorte identificado

Continuar a auditoria de outro estado da lista de Produtos; manter a verificação visual autenticada e nativa como limitações e evitar login enquanto o Dashboard puder limpar rascunhos.

### Ciclo 309 — regressão do `brand` no fallback ERP sem cache — 25/10/2026

**Recorte:** atualização de Produto quando `updateProduct` não encontra o registro no cache local e precisa persistir o payload mapeado diretamente.

- [x] A pendência do Ciclo 297 era somente de cobertura: o ERP já havia parado de remover `brand` antes de `mapToDB`. Confirmei o caminho `index === -1` de `updateProduct`, que atualiza `products` com `mapToDB(persistenceProduct)`, e o caminho mobile, que inclui `brand` na RPC transacional junto de `technical_specs`.
- [x] Adicionei regressão em `erp/src/pages/utils/productService/productMutationService.test.ts`, com cache local vazio, que confirma o filtro pelo UUID e a preservação de `brand: 'Morante'` no payload de `products`.
- [x] Vitest focado ERP, executado dentro de `erp/` usando `vitest.config.ts`: **15/15**. A primeira tentativa na raiz usou configuração sem alias ERP e falhou antes de coletar testes; a invocação correta passou. Encerrei o processo watch. `git diff --check` passou, com aviso de normalização CRLF/LF.

#### Limitações

- [ ] Sem Playwright autenticado ou validação em Android/iOS; este recorte é de persistência, sem alteração de UI. Não houve escrita/consulta remota, Supabase/PostgreSQL/Docker local ou deploy. Mocks comprovam o payload do serviço, não a gravação no banco.
- [x] Regras consultadas: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, documentação de estrutura e operações de variação, este inventário, roadmap e skill `erp-web-to-mobile-replication`. Não há `AGENTS.md` aninhado nos diretórios ERP/mobile/`shared-utils`; a fonte canônica da skill não foi localizada e a cópia em cache em `erp/.vercel` foi usada apenas como orientação.

**Conclusão do recorte:** a pendência de regressão do fallback ERP foi encerrada; produto ausente do cache preserva a coluna `brand` no payload mapeado, alinhado ao caminho mobile. A auditoria geral permanece aberta.

#### Próximo recorte identificado

Prosseguir por outro estado funcional ainda sem evidência, mantendo pendentes Playwright autenticado e validação nativa até haver condição segura.

### Ciclo 310 — mensagens e estados do menu de ações da variação — 25/10/2026

**Recorte:** apresentação das ações e pré-condições de mover/mesclar no menu mobile de uma variação.

- [x] Comparei `ProductCardActions` do ERP com `MobileProductVariationActionsMenu`: o ERP apresenta os bloqueios como toast e o app usa `Alert`; os textos e critérios de fornecedor/característica permanecem equivalentes. Mesclar exige fornecedor, mas não característica; mover exige ambos.
- [x] Acrescentei `MobileProductVariationActionsMenu.test.tsx` com mock explícito das primitivas React Native e dos ícones. Os quatro casos verificam ações disponíveis, mensagens e bloqueio dos callbacks por falta de pré-condição, diferença entre mover e mesclar, estado mesclado somente para histórico e motivo acessível quando a lixeira está bloqueada.
- [x] Vitest focado mobile: **4/4**; nenhum arquivo de produção alterado. Os callbacks foram capturados no render React server-side para verificar o contrato do componente com mocks.

#### Limitações

- [ ] O teste não exercita a entrega real de `Alert.alert` nem gesto/toque de React Native em aparelho; sem Playwright autenticado ou runtime Android/iOS/Maestro. A tentativa Playwright permanece evitada enquanto o login pode disparar a limpeza automática de rascunhos descrita no Ciclo 182.
- [x] Sem operação real de mover/mesclar/lixeira, consulta/escrita remota, Supabase/PostgreSQL/Docker local, chamada Meta ou deploy. A Conciliação continua exclusiva do ERP.
- [x] Regras consultadas: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, documentação de estrutura e operações de variação, inventário, roadmap e skill `erp-web-to-mobile-replication`. Não há `AGENTS.md` aninhado sob `mobile/`, `erp/`, `shared-utils/` ou `docs/`; a fonte canônica da skill não foi localizada, e a cópia em cache sob `erp/.vercel` foi usada apenas como orientação.

**Conclusão do recorte:** os textos e gates do menu mobile agora têm regressão focada no componente; nenhuma divergência de regra frente ao ERP foi identificada. A auditoria geral permanece aberta.

#### Próximo recorte identificado

Prosseguir por outro estado funcional da lista de Produtos; manter a comparação autenticada e a validação nativa como limitações explícitas.

### Ciclo 311 — ação Duplicar no menu de produto simples — 25/10/2026

**Recorte:** menu acionado no card de um produto simples representado por produto pai com uma variação operacional.

- [x] A referência ERP `ProductCardActions` mostra **Duplicar** para produto pai (`!product.isVariation`) mesmo quando o card tem `singleVariation`; a ação recebe o objeto do produto pai. Antes do ciclo, o app abria `MobileProductVariationActionsMenu` nesse estado, sem callback de duplicação, embora `MobileProductCard` já tivesse `onDuplicate` no menu de outros produtos.
- [x] Adicionei `onDuplicate` opcional ao menu mobile de variação única e o conectei em `MobileProductCard` somente quando `canEdit`, perfil não é label-only e `cardActionAvailability.canDuplicate` permitem. O callback entrega o produto pai à rotina existente `handleDuplicate`, que carrega os dados completos e abre um rascunho; não dupliquei lógica de negócio. O menu de variação expandida não recebe essa ação.
- [x] Vitest focado: componente do menu **5/5** e `mobileProductCardRules.test.ts` **61/61** (**66/66** no comando). O novo caso confirma que duplicar fecha o menu e invoca o callback uma vez.
- [x] `git diff --check` sem erros (aviso de normalização CRLF/LF no roadmap). TypeScript mobile global terminou com **15 diagnósticos em arquivos alheios**; nenhum nos arquivos alterados. A primeira invocação de `tsc` apontou caminho de `tsconfig` inexistente; a invocação corrigida executou a checagem do projeto.

#### Limitações

- [ ] Sem Playwright autenticado ou teste Android/iOS/Maestro; o teste valida o contrato do componente com React Native mockado, não o gesto real nem a abertura do formulário no aparelho. A autenticação segue evitada por risco de limpeza de rascunhos no Dashboard (Ciclo 182).
- [x] Sem leitura/escrita remota, criação real de rascunho, Supabase/PostgreSQL/Docker local ou deploy. A Conciliação de Produtos continua exclusiva do ERP.
- [x] Regras consultadas: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, documentação de estrutura e operações de variação, inventário, roadmap e skill `erp-web-to-mobile-replication`. Não há `AGENTS.md` aninhado sob `mobile/`, `erp/`, `shared-utils/` ou `docs/`; a fonte canônica da skill não foi localizada, e a cópia de cache sob `erp/.vercel` serviu apenas como orientação.

**Conclusão do recorte:** a ação de duplicar produto simples que faltava no menu da variação única agora usa a rotina existente do app e preserva os gates ERP de edição/tipo/perfil. A auditoria geral permanece aberta.

#### Próximo recorte identificado

Prosseguir por outro estado funcional da lista de Produtos; manter pendentes Playwright autenticado e validação nativa até haver sessão segura e aparelho disponível.

### Ciclo 312 — resumo dos componentes no card de composição — 25/10/2026

**Recorte:** informação visível sob o título na lista de Produtos para composição/combos.

#### Evidência e correção

- [x] O card e a célula de descrição do ERP exibem abaixo do título os nomes curtos dos componentes de `comboItems` quando o registro é composição ou combo legado (`isCombo`). O mobile já recebia `combo_items` na projeção da lista e preservava `description`, mas o card apresentava apenas o selo “Composição”, sem o resumo.
- [x] O mobile agora reutiliza `getMobileProductRootCompositionItems` para normalizar componentes e adiciona `getMobileProductCompositionCardItems` como transformação de apresentação equivalente ao ERP (`description` antes de ` - `; fallback “Item sem nome”). Aceita aliases camel/snake e composições legadas `isCombo`/`is_combo`.
- [x] O resumo é exibido sob o nome do card, com limite de duas linhas e rótulo acessível; nenhum cálculo de saldo, quantidade, componente persistido ou fluxo de estoque foi alterado.
- [x] Vitest focado em `mobileProductCardDisplay.test.ts`: **5/5**. Inclui nomes curtos, aliases/dados serializados, produto não composto e fallback sem descrição.
- [x] `git diff --check` passou; Git só avisou que normalizará CRLF/LF no roadmap. A checagem `tsc --noEmit -p tsconfig.json` mobile terminou com **15 diagnósticos globais**, todos em arquivos/configurações fora deste recorte; nenhum aponta para os arquivos alterados.

#### Limitações

- [ ] Não houve Playwright autenticado nem renderização em telefone/Maestro; o teste cobre a transformação pura, não o layout real do card React Native. Expo Web não foi usado como prova de comportamento nativo. A autenticação continua sem ser repetida devido ao risco documentado de limpeza de rascunhos no Dashboard (Ciclo 182).
- [x] Sem consulta ou escrita remota, Supabase/PostgreSQL/Docker local, acesso à Meta ou deploy. A Conciliação de Produtos permanece exclusiva do ERP.
- [x] Regras consultadas: `AGENTS.md` (regras fornecidas pelo usuário e arquivo da raiz, seções de formulários/testes/Conciliação), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/produtos/auditoria-arquitetura-organizacao-produtos.md`, `docs/mobile/arquitetura_offline_first.md`, este inventário, roadmap e skill `erp-web-to-mobile-replication`. A skill não foi encontrada em fonte canônica `.agents/skills`/`skills`; somente a cópia de cache em `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/` estava acessível e foi usada como orientação. Não há `AGENTS.md` aninhado em `mobile/`, `erp/`, `shared-utils/` ou `docs/`.

**Conclusão do recorte:** o card mobile de composição agora apresenta a mesma lista resumida de componentes que a lista ERP, preservando os dados e o contrato de estoque. A auditoria geral continua aberta.

#### Próximo recorte identificado

Prosseguir por outro estado da lista de Produtos, mantendo pendentes a validação visual autenticada e a prova nativa até haver uma condição segura; considerar os ciclos 303–306 como confirmação já concluída do bloqueio de publicação sem `productConfig`.

### Ciclo 313 — categoria primária legada no card/lista mobile — 25/10/2026

**Recorte:** apresentação da categoria em produto de lista cujo `category_id` está preenchido, mas não tem linha em `product_categories`.

#### Evidência e correção

- [x] O mapper ERP preenche `categoryIds` pelas relações normalizadas e usa `category_id` como fallback quando não há relações (`erp/src/pages/utils/productService/productMapper.ts`). O card ERP consulta esses IDs na árvore de categorias antes de recorrer ao texto legado `product.category`.
- [x] A consulta completa mobile carregava o `category_id`, mas o pós-processamento só buscava nomes dos IDs vindos de `product_categories`; assim, cards de linhas legadas sem relação exibiam apenas o texto de `products.category` (que pode estar vazio) em vez do nome da categoria.
- [x] Criei `getMobileProductListCategoryIds` e `getMobileProductListCategoryLabel` no domínio da apresentação: relações normalizadas têm precedência e `category_id` só entra como fallback, preservando o contrato ERP quando coexistem ambos. O lookup agora inclui o ID legado e a categoria é resolvida antes do texto de compatibilidade. Acrescentei `category_id` também à projeção compacta de resumo, mesmo sem call site produtivo localizado no momento.
- [x] A cobertura de serviço reproduz uma linha sem `product_categories`, com `category_id` válido e label textual vazio; agora roda tanto pela consulta completa usada pela lista quanto pela projeção compacta, verificando seleção da coluna/projeção, query de nome e label final. Testes focados de apresentação e fetch mobile: **46/46** em dois arquivos.
- [x] `git diff --check` passou; Git avisou somente sobre normalização CRLF/LF nos arquivos de fetch. `tsc --noEmit -p tsconfig.json` mobile terminou com **15 diagnósticos globais preexistentes**, em arquivos fora deste recorte, sem erros nos arquivos alterados.

#### Limitações

- [ ] Não houve Playwright autenticado nem renderização em telefone/Maestro; os testes validam a derivação e o mapeamento com mocks, não o visual do card nem uma leitura real do banco. Expo Web não foi usado como substituto do runtime nativo. A autenticação continua pendente pelo risco de limpeza de rascunhos no Dashboard descrito no Ciclo 182.
- [x] Sem leitura/escrita remota, Supabase/PostgreSQL/Docker local ou deploy. A Conciliação de Produtos permanece exclusiva do ERP.
- [x] Regras consultadas antes da mudança: `AGENTS.md` (arquivo raiz e regras de testes, formulários e Conciliação; `rg` localizou somente outro AGENTS em `digital-catalog/`, fora do escopo), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, documentação de estrutura e operações de variação, auditoria de arquitetura de Produtos, arquitetura offline-first, inventário, roadmap e skill `erp-web-to-mobile-replication`. A skill não foi encontrada na fonte canônica `.agents/skills`/`skills`; somente a cópia em `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/` estava acessível e foi usada como orientação.

**Conclusão do recorte:** a lista mobile agora resolve a categoria do registro legado por ID na mesma ordem de precedência do mapper/card ERP. O texto `category` continua como fallback para registros antigos sem ID resolvível. A auditoria geral permanece aberta.

#### Próximo recorte identificado

Prosseguir pelo estado de erro/indisponibilidade da consulta de nomes de categoria durante a lista; manter pendentes a validação visual autenticada e a validação Android/iOS até haver uma condição segura e aparelho físico disponível.

### Ciclo 314 — falha na consulta do nome da categoria na lista — 25/10/2026

**Recorte:** estado de erro da lista quando a resolução do nome de uma categoria relacionada falha.

#### Evidência e conclusão

- [x] ERP: `fetchProductsPage` inclui `product_categories(...categories...)` na consulta que alimenta a lista e usa `throwOnError: true` em `erp/src/pages/App/Products/ProductList/hooks/data/useProducts.ts`. Com erro sem dados atuais, `ProductList` mostra “Não foi possível carregar os produtos.” e a ação “Tentar novamente”.
- [x] Mobile: a consulta de nomes em `categories` propaga `categoryError` quando `throwOnError` está ligado; o caller da lista habilita essa opção. `useMobileProducts` converte a falha para a mesma mensagem e o estado vazio de `NativeProductsScreen` apresenta “Tentar novamente”. O caminho já preserva o contrato ERP; nenhuma mudança de produção foi necessária.
- [x] Acrescentei regressão de serviço em que a consulta principal retorna um produto e a consulta de categorias falha; o erro de categoria precisa ser propagado para que o estado de erro/retry não pareça uma lista vazia. Vitest de apresentação + fetch: **47/47** em dois arquivos.
- [x] `git diff --check` passou. Nenhuma consulta ao banco real, escrita remota, ambiente local proibido ou deploy.

#### Limitações

- [ ] A cobertura comprova a propagação pelo serviço com mocks; não exercita a renderização/retry real da tela. Playwright autenticado segue pendente; não houve validação em aparelho/Maestro. Expo Web não foi usado como prova nativa.
- [x] Regras consultadas antes da mudança: `AGENTS.md` (runner permitido e Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, estrutura de produtos/variações, arquitetura offline-first, auditoria de arquitetura, inventário, roadmap e skill `erp-web-to-mobile-replication`. Só foi encontrada a cópia em cache sob `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/`; ela orientou a revisão, sem ser tratada como fonte canônica.

**Conclusão do recorte:** tanto ERP quanto mobile tratam a falha de resolução de categorias como erro de carga, com mensagem genérica e possibilidade de tentar novamente; não há diferença funcional comprovada para corrigir. A auditoria geral continua aberta.

#### Próximo recorte identificado

Na mesma lista, comparar a falha de atualização quando já existe um snapshot anterior e o critério de mantê-lo ou limpá-lo. Permanecem pendentes as validações visuais autenticada e nativa.

### Ciclo 315 — snapshot da lista após falha de atualização — 25/10/2026

**Recorte:** lista de Produtos com dados já carregados, durante atualização da mesma consulta ou falha de uma consulta com filtros/página diferentes.

#### Evidência e conclusão

- [x] ERP usa como chave de consulta filtros, página e tamanho da página; `shouldClearQueryListSnapshot` mantém resultado quando a mesma chave conserva dados e limpa a cópia local somente quando a consulta atual não tem dados e terminou com erro (`erp/src/pages/App/Products/ProductList/hooks/data/useProducts.ts`, `erp/src/pages/utils/queryListSnapshot.ts`). A tela mostra erro/retry somente quando não há produtos visíveis.
- [x] Mobile inclui filtros e tamanho da página em `requestFiltersKey` e acrescenta a página ao snapshot. `shouldClearMobileProductListSnapshot` mantém o snapshot quando a atualização falha para a mesma chave e limpa quando ainda não houve sucesso para a chave solicitada. `useMobileProducts` mantém o conteúdo em erro de mesmo snapshot e `NativeProductsScreen` só troca a lista pela mensagem com retry quando não há produtos.
- [x] Os comportamentos cobertos pelos helpers são equivalentes: mesma chave com falha mantém; chave nova sem resposta confirmada limpa; enquanto não há erro, o snapshot anterior não é descartado apenas por estar carregando. Vitest dos helpers ERP e mobile: **18/18** em dois arquivos.
- [x] Não encontrei diferença de produção que justificasse correção; `git diff --check` passou. Nenhuma alteração funcional foi feita neste ciclo.

#### Limitações

- [ ] A comparação cobriu helpers e leitura estática dos hooks/telas, sem exercitar a refetch real no React Query ou a renderização/retry da UI. Playwright autenticado e validação nativa continuam pendentes; Expo Web não comprovaria runtime nativo.
- [x] Regras consultadas: `AGENTS.md` (Vitest/RTL, restrições de infra e Conciliação exclusiva do ERP), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, estrutura de produtos/variações, operações mover/merge, arquitetura offline-first, auditoria de arquitetura, inventário, roadmap e skill `erp-web-to-mobile-replication`. A skill atual não foi localizada em fonte canônica `.agents/skills`/`skills`; a cópia acessível em `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/` foi usada apenas como orientação.

**Conclusão do recorte:** a política de retenção/limpeza da lista em falhas de atualização mantém o contrato ERP no mobile para snapshot, filtro, página e tamanho da página. A auditoria geral permanece aberta.

#### Próximo recorte identificado

Na lista, revisar a transição de filtros/página após retry e a sincronização do indicador de paginação, sem reabrir a exceção permanente da Conciliação ERP-only. Permanecem pendentes as validações visuais autenticada e nativa.

### Ciclo 316 — paginação após retry e mudança de filtro — 25/10/2026

**Recorte:** transição da página corrente, tamanho de página e indicador após retry/refetch, mudança de filtro e redução da contagem.

#### Evidência e conclusão

- [x] ERP reinicia a página para 1 ao mudar filtros ou tamanho, conserva resultados da mesma consulta durante refetch com falha e ajusta a página depois de uma resposta bem-sucedida que reduza o número de páginas (`useProductsQueryState.test.tsx`).
- [x] Mobile faz a nova consulta na página 1 imediatamente ao mudar os filtros, inclui tamanho e página na chave do snapshot, conserva a página selecionada até ter resposta confirmada e então a ajusta para a última página válida. `retryMobileProductListReadOnce` e o QueryClient ERP fazem uma repetição antes de expor a falha (ERP `retry: 1`).
- [x] Os slots de navegação usam `getFixedPageSlots`/`normalizePageNumber` compartilhados. O mobile omite o bloqueio por `loading` no componente de slots, porém oculta seu rodapé durante carregamento bloqueante e o mantém no pull-to-refresh; no ERP, o carregamento inicial também substitui o conteúdo e o refetch com cache mantém os slots disponíveis.
- [x] O indicador textual difere por plataforma: ERP mostra “Página n · N itens no catálogo”; app mostra o intervalo “Exibindo x-y de N produtos”. Ambos derivam a mesma página, contagem e tamanhos válidos (10/15); o intervalo é uma adaptação compacta do rodapé nativo e não altera a paginação.
- [x] Vitest/RTL do hook ERP e teste de lógica da paginação mobile: **27/27** em dois arquivos. As mensagens de `console` sobre mutações do Catálogo em dois testes ERP são saídas esperadas desses casos e não falhas. `git diff --check` sem erro; nenhuma mudança de produção foi necessária.

#### Limitações

- [ ] A suíte exercita o hook ERP e helpers mobile, mas não monta o hook/tela mobile nem valida toque e renderização real. Não houve Playwright autenticado ou aparelho/Maestro; Expo Web não comprovaria comportamento nativo.
- [x] Regras consultadas: `AGENTS.md` (testes permitidos, sem banco local, formulários e Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, estrutura de produtos/variações, operações mover/merge, arquitetura offline-first, auditoria de arquitetura, inventário, roadmap e skill `erp-web-to-mobile-replication`. A versão da skill não foi encontrada em `.agents/skills`; usei somente a cópia acessível no backup de dependências do ERP como orientação.

**Conclusão do recorte:** mudança de filtro, página após retry, clamping e número visível de itens mantêm contrato equivalente. A diferença na frase do indicador foi registrada como adaptação de apresentação para a tela mobile. A auditoria geral continua aberta.

#### Próximo recorte identificado

Continuar no módulo Produtos pelo estado de filtros da lista (catálogo, tipo e status) e verificar payload/contagem sem reabrir a Conciliação, que permanece exclusiva do ERP. As validações visuais autenticada e nativa continuam pendentes.

### Ciclo 317 — interseção de tipo, situação e Catálogo Digital na lista — 25/10/2026

**Recorte:** combinação dos filtros da lista por tipo (padrão/composição e produto/serviço), situação no ERP (ativo/desativado/rascunho) e status no Catálogo Digital (publicado/ocultado), incluindo a contagem antes da paginação.

#### Evidência e conclusão

- [x] No ERP, `ProductFilters` separa “Situação no ERP” (`activeOnly`/`isDraft`) de “Catálogo Digital” (`status`). `ProductList` acrescenta `itemType = composition` no modo Composições; no modo padrão mantém os filtros de tipo recebidos. `applyProductFiltersAndSort` combina `itemType`/`excludeItemType`, `isDraft`, ativo e `status` na mesma query antes de aplicar `.range`. `fetchProductsPage` solicita `count: 'exact'` e devolve essa contagem do conjunto filtrado.
- [x] No app, `ProductsHeaderFiltersSheet` oferece as mesmas escolhas de situação e Catálogo e o filtro de tipo geral produto/serviço; o modo Composições é mantido separadamente. `useMobileProducts` passa cada dimensão em campo próprio (`statusFilter`, `catalogStatus`, `itemType`, `generalType`), e `fetchMobileProductsPage` aplica as condições na query `products`, solicita contagem exata e só então pagina. Assim como no ERP, a condição de Catálogo na lista compara `products.status` do registro-pai; não foi introduzido um filtro distinto por status das linhas de variação.
- [x] Os testes já existentes cobrem interseção situação+Catálogo em composições, status de Catálogo em produtos padrão e ordem dos filtros antes do intervalo no ERP (`productFilterBuilder.test.ts`). No app, cobrem a mesma interseção, `count: 'exact'`, `total` resultante e intervalo (`mobileProductFetchService.test.ts`); `mobileProductListFilters.test.ts` verifica campos independentes e validação pelo schema RHF/Zod.
- [x] Resultado: não foi encontrada diferença de payload, semântica de filtro ou contagem que justifique mudança de produção. O filtro geral adicional do app é uma adaptação de seleção nativa que encaminha o equivalente produto/serviço usado no ERP; as escolhas de Composições continuam condicionadas ao modo e permissões existentes.
- [x] Vitest focado: ERP **17/17**; app **46/46** em dois arquivos. O pacote `mobile/` não possui Vitest próprio instalado; a primeira tentativa não resolveu `vitest/config`. A repetição com Vitest 2.1.9 já instalado em `erp/node_modules`, disponibilizado por `NODE_PATH` sem instalar dependências, passou integralmente.
- [x] Esclarecimento posterior do usuário: para perfil sem a permissão pertinente, é aceitável bloquear a ação do Catálogo. Isso reafirma o gate registrado nos Ciclos 196/198/203; não muda a consulta nem mistura permissão com a validação de rascunho/conformidade.

#### Limitações

- [ ] A comparação deste recorte foi estática, apoiada pelos testes de construção das queries; não houve Playwright autenticado ou renderização em aparelho/Maestro. Portanto, labels, toque e comportamento do modal nativo seguem sem validação visual; Expo Web não comprovaria o runtime nativo.
- [x] Sem consulta ou escrita remota, Supabase/PostgreSQL/Docker local, Meta ou deploy. A Conciliação permanece somente no ERP.
- [x] Regras e documentação consultadas: `AGENTS.md` (formulários, testes e Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/mobile/arquitetura_offline_first.md`, auditoria de arquitetura de Produtos, inventário, roadmap e skill `erp-web-to-mobile-replication`. A skill atual não foi encontrada na fonte canônica do projeto; somente a cópia de cache em `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/` estava acessível e foi usada como orientação.

**Conclusão do recorte:** filtros de tipo, situação no ERP e Catálogo Digital se intersectam no servidor e a contagem considera a mesma seleção antes do intervalo, com contratos equivalentes. Nenhuma mudança de código foi necessária. A auditoria geral continua aberta.

#### Próximo recorte identificado

Continuar em outro estado da lista de Produtos; manter pendentes a comparação Playwright autenticada e a validação nativa em telefone físico/Maestro. Não reabrir a Conciliação de Produtos, exclusiva do ERP.

### Ciclo 318 — visibilidade de variações mescladas na lista — 25/10/2026

**Recorte:** alternância “Mostrar mesclados” em famílias mistas e em famílias cujas variações foram todas mescladas.

#### Evidência e conclusão

- [x] ERP: `ProductsTopToolbar` publica o toggle em todos os modos dessa tela; `useProductsPageState` envia `showMergedProducts` como `includeMergedVariations`. Quando desligado, `useProducts` oculta a linha de cada variação com `mergedToVariationId`, remove o pai somente quando todas as variações estão mescladas e mantém no pai apenas as variações não mescladas. Ligá-lo revela as linhas mescladas e o pai integralmente mesclado. A troca do toggle reinicia a página e limpa a seleção.
- [x] App: `ProductsHeaderMenuDropdown` oferece a mesma ação nos modos Produtos e Composições; a folha de filtros repete o controle no modo Produtos. `useMobileProducts` inclui a opção na chave da consulta, volta à página 1 e invalida respostas da consulta anterior. `fetchMobileProductsPage` mantém uma família mista e apresenta somente suas variações não mescladas por padrão; remove o pai quando todas estão mescladas; com `includeMerged` habilitado, apresenta o pai e as variações, marcadas com `isMerged`.
- [x] A contagem nos dois serviços é dos registros-pai filtrados e não é reduzida pela transformação local que oculta variações mescladas. A família mista versus integralmente mesclada segue a mesma regra; não há payload ou contrato backend adicional.
- [x] A folha de filtros mobile oculta o toggle quando `mode === 'composition'`, mas o menu do cabeçalho o mantém disponível nesse modo. A tela de Composições dedicada no app é uma extensão mobile: `/products/compositions` no ERP redireciona para `/products`. A localização no menu versus toolbar é adaptação de plataforma e não bloqueia o acesso à ação no modo composto; não justifica criar uma rota ERP ou ampliar o escopo.
- [x] Vitest focado: transformação ERP `productListTransformers.test.ts` **4/4**; fetch e guarda de solicitações mobile `mobileProductFetchService.test.ts` + `mobileProductListRequest.test.ts` **51/51**. Não foi necessária alteração de produção.

#### Limitações

- [ ] Os testes cobrem transformação, filtragem e invalidação de solicitações, sem montar as telas ou validar toque, posição e feedback visual. Não houve Playwright autenticado nem aparelho/Maestro; Expo Web não comprovaria o comportamento nativo. A presença do controle no menu foi confirmada estaticamente.
- [x] Sem leitura/escrita remota, Supabase/PostgreSQL/Docker local ou deploy. A Conciliação de Produtos permanece exclusivamente no ERP.
- [x] Regras consultadas: `AGENTS.md` (RHF/Zod, runners autorizados, banco local proibido e Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, estrutura de produto/variação, operações de mover/merge, arquitetura offline-first, inventário, roadmap e skill `erp-web-to-mobile-replication`. A busca não encontrou skill canônica em `.agents/skills`/`skills`; foi consultada somente a cópia de cache no backup de dependências ERP como orientação.

**Conclusão do recorte:** o toggle usa a mesma regra de visibilidade para variações mescladas e preserva o contrato de contagem nos dois clientes. Nenhuma mudança de código foi necessária. A auditoria geral continua aberta.

#### Próximo recorte identificado

Prosseguir para outro estado funcional da lista ou das variações. Manter pendentes a comparação visual autenticada e a prova nativa por telefone físico/Maestro; não reabrir a Conciliação, exclusiva do ERP.

### Ciclo 319 — revisão das policies consultadas pela guarda do Catálogo — 25/10/2026

**Recorte:** coerência entre o trigger local que bloqueia a publicação/ocultação sem `productConfig` e as permissões de leitura das tabelas que ele consulta.

#### Evidência

- [x] A migration local `supabase/migrations/20261025002304_protect_product_catalog_status_permission.sql` cria a função e os triggers em `public.products` e `public.product_variations`. A função usa `SECURITY INVOKER`, `search_path = ''`, `auth.uid()`, valida os papéis do próprio perfil e lê `settings.data.rolePermissions.productConfig`; mantém a decisão do usuário: a ação de Catálogo exige `productConfig`, enquanto a interface mantém o status visível. A inserção já `published` e a mudança de status são os únicos eventos novos bloqueados; salvar outros dados não publica nem oculta por si só.
- [x] A migration local `20260827221000_secure_profiles_access_management.sql` limita a policy de leitura de `profiles` à própria linha (ou administrador), que corresponde ao `WHERE profile.id = auth.uid()` do trigger. A policy `Anyone can read settings` da migration `20260827233000_secure_settings_writes.sql` permite a leitura da configuração; `20260928171344_restrict_settings_data_api.sql` concede explicitamente `SELECT` em `settings` a `authenticated`.
- [x] A revisão não encontrou um `GRANT SELECT ON public.profiles TO authenticated` explícito nas migrations versionadas. RLS/policy limita linhas, mas não substitui o privilégio de tabela. A documentação atual do Supabase também separa esses dois controles: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) e [funções](https://supabase.com/docs/guides/database/functions). Não concluo que o grant esteja ausente do projeto — os privilégios padrão do projeto podem fornecê-lo —, apenas que os arquivos versionados não o comprovam.
- [x] A migration segue local e sem aplicação remota; não foi executada leitura de ACL, chamada de teste, escrita, migration, deploy ou integração PostgreSQL nesta execução. Assim, nem o grant efetivo de `profiles`, nem a execução real do trigger foram comprovados. A política vigente do projeto proíbe banco local e exige que RLS, triggers e persistência sejam verificados no Supabase remoto operacional; mocks ou leitura SQL estática não bastam.
- [x] Nenhum arquivo de produção ou migration foi alterado. A skill `erp-web-to-mobile-replication` não foi encontrada na fonte canônica `.agents/skills`; consultei a cópia de cache do backup ERP apenas como orientação. Também foram lidos `AGENTS.md` (seções 7, 12 e 13), `docs/geral/USER_RULES.md`, `docs/testing/SUPABASE_REMOTE_TEST_POLICY.md`, a documentação de estrutura e operações de produtos, as policies versionadas e o inventário/roadmap. Não há `AGENTS.md` aninhado em `docs/`, `shared-utils/` ou `supabase/`.

#### Limitações

- [ ] A proteção server-side continua pendente: confirmar no projeto operacional o privilégio efetivo de leitura de `profiles` para `authenticated`, aplicar a migration autorizada somente após revisar estado e precondições remotos, e exercitar allow/deny através de fixture autorizada. Não substituir esse passo por grant amplo ou `SECURITY DEFINER` em resposta a uma falha de privilégio.
- [ ] A inspeção estática não valida RLS, execução do trigger nem que cada escritor operacional de status apresenta contexto de usuário autenticado. As validações visuais de ERP e nativas permanecem limitadas às evidências dos Ciclos 305–306.

**Conclusão do recorte:** as policies de linha e a configuração de permissão são coerentes com a identidade consultada pelo trigger; o grant SQL efetivo em `profiles` e a proteção executada ainda não estão provados. Não houve alteração funcional nem teste nesta revisão. A auditoria geral continua aberta.

#### Próximo recorte identificado

Continuar por outro estado da lista de Produtos. Manter o trigger de Catálogo como pendência de verificação no Supabase remoto operacional, sem declarar a proteção pronta; não revisitar a Conciliação, exclusiva do ERP.

### Ciclo 320 — seleção em lote na lista responsiva de produtos — 25/10/2026

**Recorte:** possibilidade de selecionar cards de Produto e acionar operações em lote no estado ERP abaixo de XL, comparada à lista React Native.

#### Evidência

- [x] O ERP alterna a tabela para cards em telas menores que 1280 px ou quando detecta WebView/mobile. `ProductTable` esconde o contêiner da tabela nesse estado e mantém a lista de cards visível. As caixas de seleção por linha e “selecionar todos” pertencem a `ProductRow`/`ProductTable`, dentro da tabela.
- [x] `ProductCard` recebe `isSelected` e `onToggleSelection`, mas nesta versão só usa `isSelected` para realçar a borda. Não chama `onToggleSelection` nem apresenta controle de seleção; portanto, a seleção em lote da página não pode ser iniciada pelo layout de cards do ERP. A barra de lote fica fora do contêiner da tabela e pode permanecer visível se uma seleção for feita antes de reduzir a janela; esse caso de transição entre larguras não oferece uma ação de seleção nova nos cards.
- [x] `NativeProductsScreen` renderiza `MobileProductCard` sem propriedades ou estado de seleção em lote; `MobileProductCard` não oferece controle para seleção. As ações individuais de Produto/variação e lixeira continuam disponíveis pelos gates já auditados. Assim, no estado de cards correspondente ao app, ERP e mobile não iniciam seleção nem lote.
- [x] A falta de seleção em lote no app não é tratada como diferença de paridade: ela acompanha o estado responsivo de cards do próprio ERP. Não foi criado um fluxo mobile adicional para desativar/restaurar múltiplos Produtos. A busca em `docs/mobile/`, `docs/produtos/`, `docs/negocio/produtos/` e `docs/forms/` não encontrou uma particularidade separada para seleção de cards; a justificativa está documentada aqui a partir do breakpoint e dos componentes ERP.
- [x] Inspecionei implementação ERP, utilitário/estado de seleção (`productSelection.ts`, `useProducts`) e lista/cartão mobile. O escopo não atravessou a Conciliação, protegida por `rules/products/product-reconciliation-erp-only.yml`. Nenhum código foi alterado; não houve teste automatizado ou validação visual porque a conclusão é estática e não altera UI.
- [x] Regras/referências consultadas: `AGENTS.md` (formulários, runners permitidos e Conciliação ERP-only), `docs/geral/USER_RULES.md`, regra de Conciliação, skill `erp-web-to-mobile-replication` (somente cópia acessível no cache do backup ERP; fonte canônica não localizada), estrutura de produto/variação, operações mover/merge, inventário e roadmap. Não há `AGENTS.md` aninhado nos diretórios envolvidos.

#### Limitações

- [ ] Não fiz comparação visual autenticada em Playwright nem teste em Android físico/Maestro. O recorte não afirma equivalência visual ou comportamento nativo; apenas compara o caminho de seleção presente nos componentes.
- [ ] Na UI ERP, uma seleção iniciada na tabela desktop pode manter a barra de lote ao reduzir a largura, pois a barra não está no contêiner oculto da tabela. Não alterei esse caso de redimensionamento: ele não é um caminho para iniciar seleção a partir do estado mobile do aplicativo.

**Conclusão do recorte:** na apresentação responsiva de cards, ambos os clientes não permitem iniciar seleção em lote; o app não tem uma operação a replicar nesse estado. Nenhuma alteração de produção é necessária para esta parte. A auditoria geral continua aberta.

#### Próximo recorte identificado

Retomar outra aba/estado de cadastro ou edição de Produto e comparar um único fluxo de entrada com o respectivo formulário ERP e schema compartilhado; manter pendentes as validações visuais autenticada/nativa e a proteção remota do Catálogo.

### Ciclo 321 — identidade UUID da variação padrão no cadastro simples — 25/10/2026

**Recorte:** abertura de **Novo Produto** sem dados iniciais, criação da variação operacional única e identidade usada no primeiro e nos próximos autosaves.

#### Evidência e correção

- [x] O ERP abre o formulário simples por `openNewProduct('standard')`; `useProductFormLoad` materializa a variação por `ensureProductFormVariation`/`ensureDefaultVariation`. A variação padrão recebe UUID v4 antes de salvar, SKU derivado do código e valores herdados do pai. Isso respeita a identidade estável descrita em `docs/negocio/produtos/estrutura-produto-variacao.md`.
- [x] No mobile, `NativeProductsScreen.handleOpenNew` abre o mesmo estado sem dados. Antes deste ciclo, a variação provisória era identificada como `new_${productCode}-01`. `saveMobileProduct` converte IDs que não sejam UUID em um UUID novo para cada payload; após o ACK do autosave o formulário atualizava a identidade do pai, mas deixava esse ID provisório na variação. Assim uma nova edição/serialização podia enviar outra identidade para a mesma variação.
- [x] A variação simples criada no formulário mobile agora usa `createMobileProductVariationId`, a mesma fonte usada pela geração de variações múltiplas. O UUID existe antes do primeiro autosave e é conservado pelas sincronizações de formulário; o persistidor já preserva IDs UUID recebidos no payload. A cobertura verifica a forma UUID gerada, UUIDs distintos na geração em lote e a passagem dos IDs estáveis até `p_variations`.
- [x] Os valores-padrão restantes foram comparados sem ampliar a mudança: flags de rascunho/ativo e `condition` divergem transitoriamente entre os objetos iniciais; ambos os clientes normalizam o primeiro autosave para rascunho inativo e a finalização de cadastro novo para ativo/oculto, e o campo de origem do estoque continua exigido. Não há correção adicional suportada neste estado.
- [x] Regras consultadas: `AGENTS.md` (RHF/Zod, runners e exceção ERP-only da Conciliação), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/mobile/arquitetura_offline_first.md`, inventário de formulários, roadmap e skill `erp-web-to-mobile-replication`. A busca não encontrou cópia canônica no projeto; usei a cópia acessível no cache do backup do ERP apenas como orientação. Não há `AGENTS.md` aninhado em `mobile/`, `shared-utils/` ou `docs/`.

#### Validação e limitações

- [x] Vitest focado, via runner ERP permitido: `mobileProductVariationGeneration.test.ts` e `mobileProductMutationService.test.ts` — **2 arquivos, 65 testes aprovados**.
- [ ] A inspeção é de implementação e lógica; não houve Playwright autenticado nem aparelho Android físico/Maestro. Expo Web não comprova comportamento nativo.
- [ ] O teste não cria fixture nem chama a RPC remota; a identidade no contrato serializado do cliente está coberta, mas a persistência/idempotência completa da RPC segue dependente da fixture remota previamente autorizada registrada no início do inventário.
- [x] Sem Supabase/PostgreSQL/Docker local, leitura/escrita remota, deploy ou alteração fiscal. A Conciliação continua exclusiva do ERP.

**Conclusão do recorte:** foi corrigida a divergência comprovada de identidade da variação simples durante o ciclo de cadastro/autosave; a regra de negócio de persistência continua no serviço existente. A auditoria geral segue aberta.

#### Próximo recorte identificado

Retomar outro estado de cadastro/edição que não esteja encerrado no inventário; manter como pendências separadas a validação visual autenticada/nativa e a estabilidade do contrato remoto do autosave com fixture autorizada.

### Ciclo 322 — nome padrão ao adicionar variação individual — 25/10/2026

**Recorte:** ação **Adicionar variação** no formulário de Produto, após entrar no modo com variações.

#### Evidência e correção

- [x] O ERP usa `createDefaultNewVariation`: nomeia pelo nome do produto, depois pela descrição, e usa `Nova Variação` como último fallback; aplica `toTitleCase` compartilhado. O `textUtils.ts` do ERP reexporta a mesma função de `shared-utils/productText.ts` usada pelo app.
- [x] No mobile, `handleAdd` antes usava somente `formData.name`, mantinha a capitalização digitada e recorria a `Produto`. Isso divergia quando só a descrição estava preenchida ou ambos os campos estavam vazios, além de não aplicar o formato do ERP. Agora usa `getInitialMobileVariationName`, função pura coberta por testes, que replica o contrato do domínio ERP. UUID estável da variação continua sendo alocado pela correção do Ciclo 321; campos extras de apresentação/canal e valores mobile permanecem intactos.
- [x] Revisei a regra de drafts/estado inicial: não alterei o contrato de status nesta ação; o serviço mobile normaliza o autosave e a finalização em seus caminhos próprios, como registrado no Ciclo 321.
- [x] Regras e referências consultadas: `AGENTS.md` (formulários RHF/Zod, runners e Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, documentação de estrutura produto/variação e mover/merge, `docs/mobile/arquitetura_offline_first.md`, skill `erp-web-to-mobile-replication`, inventário e roadmap. Não há `AGENTS.md` aninhado em `mobile/`, `shared-utils/` ou `docs/`. A busca não encontrou fonte canônica da skill no projeto; a cópia encontrada no cache do backup ERP foi usada apenas como orientação.

#### Validação e limitações

- [x] Vitest pelo runner ERP permitido — `mobileProductVariationGeneration.test.ts` e `mobileProductMutationService.test.ts`: **2 arquivos, 66 testes aprovados**.
- [x] `git diff --check` sem erros; Git avisou apenas que pode normalizar CRLF do arquivo TSX já alterado.
- [ ] Sem comparação Playwright autenticada nem teste em Android físico/Maestro; Expo Web não comprova comportamento nativo. Sem fixture ou RPC remota, acesso/escrita externa ou deploy. A persistência completa do autosave segue como limitação remota autorizada/pendente; a Conciliação permanece exclusiva do ERP.

**Conclusão do recorte:** o default de nome da ação de adicionar variação individual agora coincide com o ERP e tem cobertura de lógica. A auditoria geral continua aberta.

#### Próximo recorte identificado

Continuar por outro estado do formulário/aba de Produto, uma ação por execução. Manter pendentes a comparação visual autenticada/nativa e as provas remotas de persistência/gates já listadas; não revisitar a Conciliação, exclusiva do ERP.

### Ciclo 323 — flags de herança das dimensões ao adicionar variação — 25/10/2026

**Recorte:** contrato de herança de dimensões da variação criada pela ação **Adicionar variação**.

#### Evidência

- [x] O helper ERP `createDefaultNewVariation` inclui `syncDimensions: true` e também as quatro flags por eixo (`syncWidth`, `syncHeight`, `syncDepth`, `syncWeight`). O `handleAdd` mobile inicializa as quatro flags por eixo como `true`, mas não inclui a flag agregada `syncDimensions`.
- [x] A diferença agregada não chega a mudar a operação: não há leitor/controle ativo de `syncDimensions` fora dos defaults ERP; a documentação de domínio define a herança por dimensão. Ambos os escritores persistem `use_parent_dimensions` a partir de `syncWidth`; o mapper ERP restaura cada flag por eixo a partir do detalhe próprio, com fallback para `use_parent_dimensions`. O app mantém e sincroniza as quatro flags por eixo em seu estado de formulário.
- [x] A identidade (UUID), nome, SKU, preços herdados, estado de canal e demais defaults da ação foram comparados nos Ciclos 321–322. Não encontrei divergência funcional apoiada por esse campo agregado; não repliquei metadado sem consumidor no app nem alterei o payload.
- [x] Fontes conferidas nesta execução: `createDefaultNewVariation`, `useProductFormVariations.addVariation`, `ProductFormVariationsTab.handleAdd`, `variationFormDefaults`, `productVariationMapper`, os dois persistidores e a regra `use_parent_dimensions`; documentação de estrutura produto/variação, mover/merge, arquitetura offline-first e skill `erp-web-to-mobile-replication`. A skill existe somente na cópia do cache de build do ERP no workspace, sem fonte canônica localizada. `AGENTS.md` e `docs/geral/USER_RULES.md` foram relidos; a regra ERP-only de Conciliação permanece preservada.

#### Validação e limitações

- [x] Comparação estática de criação → estado do formulário → persistência → hidratação; nenhum código de produção foi alterado, então não executei teste automatizado.
- [ ] Sem Playwright autenticado nem aparelho Android/Maestro. Expo Web não comprova comportamento nativo. Não houve leitura/escrita remota, fixture, migration ou deploy.

**Conclusão do recorte:** `syncDimensions` é uma diferença de representação sem efeito adicional comprovável; as flags persistidas por eixo e o contrato `use_parent_dimensions` permanecem equivalentes. Nenhuma correção é necessária para este estado. A auditoria geral continua aberta.

#### Próximo recorte identificado

Auditar uma ação diferente do formulário de Produto em um único estado, usando o roteiro de cadeia ponta a ponta. Manter abertas as validações visuais autenticada/nativa e os cenários remotos já listados; não revisitar a Conciliação, exclusiva do ERP.

### Ciclo 324 — debounce da busca de componentes da composição — 25/10/2026

**Recorte:** consulta de sugestões no campo de componentes da aba de Composição, sem alterar a montagem, a validação ou a persistência dos itens.

#### Evidência e correção

- [x] O fluxo ERP ativo usa `VariationCompositionItemsTab` → `ProductAutocomplete` → `useProductAutocomplete`; após a mesma validação RHF/Zod de consulta mínima de três caracteres, aguardava 300 ms. O app usa `ProductFormCompositionTab` e o mesmo schema, mas aguardava 500 ms.
- [x] Centralizei `PRODUCT_AUTOCOMPLETE_DEBOUNCE_MS = 300` em `shared-utils/productAutocompleteFormSchema.ts`; ERP e app agora consomem a mesma constante. O valor escolhido conserva o comportamento ERP e reduz em 200 ms a latência da busca móvel. Fornecedor, normalização/validação do query, limite, filtros, payloads, estados de loading/erro/retry e persistência não foram alterados por esta correção.
- [x] Os testes ERP de apresentação/hook e do serviço mobile de busca de componentes passaram: **3 arquivos, 10/10 testes**. Antes de validar, corrigi o mock de `ProductAutocomplete.form.test.tsx`, que não exportava `normalizeProductSearchSeparators`, helper já consumido pelo hook; as três falhas anteriores exibiam erro por ausência desse mock, e não falha do serviço ou do novo intervalo.
- [ ] Diferença de escopo permanece sem decisão: o serviço mobile limita candidatos a `item_type = standard`, enquanto o autocomplete de composição ERP exclui composições mas não aplica filtro explícito equivalente a `productsOnly`, podendo oferecer serviços. A documentação confirma que a disponibilidade das composições deriva de estoque físico dos componentes, mas não declara expressamente se serviços podem ser escolhidos como componentes. **Pergunta pendente:** serviços devem ser aceitos como componentes de composição no ERP e no app, ou o app deve manter a exclusão atual e o ERP passar a aplicá-la?
- [x] Fontes consultadas: `VariationCompositionItemsTab`, `ProductAutocomplete`, `useProductAutocomplete`, `ProductFormCompositionTab`, `mobileProductCompositionService`, schema compartilhado, testes focados, documentação de estrutura produto/variação, operações de mover/merge, arquitetura offline-first, `AGENTS.md`, `docs/geral/USER_RULES.md`, regra `rules/products/product-reconciliation-erp-only.yml`, inventário e roadmap. Não há `AGENTS.md` aninhado nos diretórios ERP/mobile/shared-utils/docs deste recorte. A skill `erp-web-to-mobile-replication` segue acessível apenas na cópia de cache do backup ERP; não localizei fonte canônica no projeto.

#### Validação e limitações

- [x] Vitest permitido via runner ERP: `ProductAutocomplete.form.test.tsx`, `ProductAutocomplete.variationDisplay.test.tsx` e `mobileProductCompositionService.test.ts` — **3 arquivos, 10 testes aprovados**.
- [x] `git diff --check` final sem erros; Git emitiu somente avisos de normalização CRLF/LF nos arquivos previamente alterados.
- [ ] Sem Playwright autenticado nem teste em telefone Android/Maestro; Expo Web não comprova comportamento nativo. Não houve consulta ou escrita remota, alteração de backend/migration, acesso à Meta ou deploy.

**Conclusão do recorte:** ERP e app agora usam o mesmo atraso de busca de 300 ms. O contrato de elegibilidade do tipo `service` fica pendente de definição explícita; não ampliei nem reduzi candidatos nesta execução.

#### Próximo recorte identificado

Após definir se um serviço pode compor uma composição, auditar somente o filtro de tipo do autocomplete e atualizar as regras/documentação dos dois clientes em conjunto; até lá, preservar a filtragem mobile atual. Seguir depois para outra aba/estado, mantendo pendentes as validações visuais autenticada/nativa e remotas já listadas. Não reintroduzir Conciliação no app.

### Ciclo 325 — quantidade dos componentes da composição — 25/10/2026

**Recorte:** editar, validar e exibir a quantidade necessária de cada linha de `comboItems` no formulário de composição por variação.

#### Evidência

- [x] No ERP, o campo usa `type="number"`, `min="1"` e atualiza o estado somente quando `Number(value) >= 1`; o botão do modal aciona `handleSubmit` diretamente. O schema `productVariationDraftSchema` valida o valor numérico e `createProductVariationFormSchema` rejeita quantidade abaixo de um antes do salvamento da variação.
- [x] No app, o `TextInput` usa `decimal-pad`; `parseLocalizedNumber` aceita a notação local, não grava texto vazio/inválido ou valor abaixo de um no estado do produto, o blur restaura a última quantidade válida e os botões diminuem/aumentam em passos unitários com mínimo de um. O `ProductFormScreen` submete e autosalva através dos proprietários RHF/Zod; `createMobileProductFormSchema` verifica o mínimo na finalização para componentes do pai e de cada variação.
- [x] Os schemas de conclusão aceitam valores numéricos `>= 1` nos dois clientes, sem regra explícita de inteiro no domínio. O `step` implícito do HTML não é a regra usada pelo botão ERP, que é `type="button"` e invoca o submit controlado; por isso não tratei a aparência `number` vs `decimal-pad` como contrato de quantidade inteira.
- [x] Os drafts preservam linhas incompletas enquanto não se finaliza; mantive separados esses contratos conforme `AGENTS.md` (draft incompleto vs finalização). Nenhuma lógica de submissão/persistência foi alterada neste ciclo.
- [ ] Diferença visual apenas para estado legado inválido: o subtotal ERP multiplica pelo valor armazenado diretamente; o app usa `Math.max(1, quantity)` e mostra um subtotal de pelo menos uma unidade. Para dados válidos, ambos calculam `unitPrice × quantity`; não encontrei fluxo atual que permita o operador gravar zero pelo controle. A apresentação de registros legados inválidos não foi alterada.
- [x] Fontes consultadas: `VariationCompositionItemsTab`, `VariationModalFooter`, `useVariationForm`, `productVariationValidation`, `ProductFormCompositionTab`, `ProductFormScreen`, `mobileProductFormSchema`, `mobileProductCompositionService`, testes/schema de variações e composição, `docs/forms/inventario-mobile-catalogo-2026-10-15.md`, `docs/forms/migracao-rhf-zod-2026-10-14.md`, documentação de estrutura produto/variação e mover/merge, `AGENTS.md`, `docs/geral/USER_RULES.md`, regra ERP-only da Conciliação, inventário, roadmap e skill. Não há `AGENTS.md` aninhado nos diretórios envolvidos. A skill do projeto permanece localizada apenas na cópia de cache de build registrada no Ciclo 324; não foi tratada como canônica.

#### Validação e limitações

- [x] Comparação estática da entrada, parser, schema RHF/Zod, submit/autosave e cálculo do subtotal. Sem mudança de produção, portanto sem nova execução de teste.
- [ ] Sem Playwright autenticado nem Android físico/Maestro; Expo Web não comprova teclado, blur ou comportamento nativo. Sem acesso/escrita remota, migration ou deploy.

**Conclusão do recorte:** para quantidades válidas, o limite, o valor persistido e o incremento estão alinhados; não há correção de produção necessária. O preview de dados legados zero permanece registrado como exceção de apresentação. A auditoria geral continua aberta.

#### Próximo recorte identificado

Prosseguir para outro estado/ação de Produtos. Manter pendente a resposta sobre serviços como componentes, registrada no Ciclo 324, e não alterar o filtro até a decisão. Preservar as pendências de UI autenticada, runtime Android/Maestro e prova remota; Conciliação segue exclusiva do ERP.

### Ciclo 326 — remoção de componente da composição — 25/10/2026

**Recorte:** ação **Remover Item** sobre uma linha de componentes na aba de Composição de uma variação.

#### Evidência

- [x] O ERP `VariationCompositionItemsTab.handleRemoveItem` clona `comboItems`, remove somente o índice escolhido e atualiza o estado local da variação. O botão de lixeira chama o handler diretamente, sem confirmação. O total sugerido é recalculado a partir das linhas restantes.
- [x] O app `ProductFormCompositionTab.handleRemove` também filtra somente a linha escolhida e não apresenta confirmação. Ele limpa `quantityInputs`, estado transitório indexado por posição, para impedir que um texto não confirmado de uma linha passe a ser exibido na próxima após a remoção/reindexação. A tela pai repassa o setter da variação selecionada e persiste sua cópia em `formData.variations`; não remove produto/variação do catálogo nem toca em estoque.
- [x] O total sugerido do app é refeito depois da atualização, assim como o ERP para componentes válidos. A mutação mobile envia a lista resultante em `product_variations.combo_items` após `normalizeComboItems`; o ERP envia o `combo_items` da variação no `saveVariation`. Um produto pai, uma variação distinta ou outras linhas não são alterados pela remoção.
- [x] A diferença do momento de persistência permanece o comportamento documentado do formulário: no app, mudança em rascunho pode entrar na fila serializada de autosave RHF/Zod; no ERP, a variação fica no estado local até **Salvar Alterações**. Em produto não rascunho, a remoção também permanece no estado do formulário até sua finalização. Não alterei autosave nem modal de confirmação.
- [x] Regras consultadas: `AGENTS.md` (RHF/Zod, validação e Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, skill de replicação disponível apenas no cache ERP, documentação de produto/variação e mover/merge, inventário de formulários, inventário de paridade e roadmap. Não há `AGENTS.md` aninhado em `erp/src/pages/App/Products`, `mobile/src/features/products` ou `docs/`.

#### Validação e limitações

- [x] Revisão estática do handler → setter da variação proprietária → autosave/submissão RHF/Zod → payload `combo_items`; nenhuma diferença funcional de exclusão foi encontrada e nenhum código de produção foi alterado, portanto não executei teste automatizado.
- [ ] O arquivo `VariationFormModal.test.tsx` contém cobertura ERP para o acionamento de **Remover Item**, mas não encontrei teste dedicado de UI para o componente React Native. Isso não impediu a conclusão estática do handler; toque, blur e re-render não foram provados em Android físico/Maestro. Sem Playwright autenticado, consulta/escrita remota ou deploy.

**Conclusão do recorte:** a exclusão de linha e o escopo da alteração coincidem. A limpeza de buffers por índice é adaptação local do app para sua entrada nativa. A remoção em rascunho segue autosave serializado e não altera imediatamente o backend fora desse fluxo.

#### Próximo recorte identificado

Continuar por outro estado de Produtos, uma ação por execução. Manter pendente a resposta do Ciclo 324 sobre serviços como componentes e não mudar o filtro até definição; preservar as limitações de validação visual autenticada, runtime nativo e persistência remota. A Conciliação permanece exclusiva do ERP.

### Ciclo 327 — componente simples legado com variação virtual — 25/10/2026

**Recorte:** selecionar um produto simples legado sem linha real em `product_variations` para integrar `combo_items` de uma variação composta.

#### Evidência e correção

- [x] O mapper ERP gera uma linha visual `isVirtual: true` com ID composto (`productId_sku-01`) quando o produto legado não tem variação persistida. O autocomplete ERP oferecia essa linha; `handleSelectProduct` gravava seu ID em `combo_items.variationId`.
- [x] O serviço mobile de composição já remove variações virtuais das sugestões reais e, quando só existe esse fallback, oferece o produto pai sem `variationId`. O contrato de domínio mantém `variationId` opcional; a documentação determina identidade estável UUID para variações reais e estoque de componentes simples no pai.
- [x] A consulta ERP de disponibilidade usa `variationId` para procurar uma linha em `product_variations`. Como o ID visual virtual não existe no banco, a referência legada produzia estoque calculado zero apesar de haver saldo no pai. Alinhei a seleção ERP ao app: para `isVirtual`, guarda `undefined` e usa a disponibilidade do produto pai; para variação real, conserva o UUID selecionado. Descrição, preço, estoque inicial do item, quantidade e seleção de variação real permanecem inalterados.
- [x] A revisão confirmou que essa exceção só é usada no fallback legado sem variação persistida; produtos operacionais atuais continuam selecionando a variação real. O estado segue pertencendo ao formulário da variação e passa pelo schema RHF/Zod existente antes de `onSave`.
- [x] Fontes consultadas: `createDefaultVariation`/`mapDbVariations`, `useProductAutocomplete`, `VariationCompositionItemsTab`, `ProductFormCompositionTab`, `searchMobileProductCompositionCandidates`, `applyCompositionAvailability`, persistência ERP/mobile, tipos `ComboItem`/`Variation`, `docs/negocio/produtos/estrutura-produto-variacao.md`, operações de mover/merge, particularidades offline-first, inventários de formulários/paridade, roadmap, `AGENTS.md`, `docs/geral/USER_RULES.md`, regra ERP-only da Conciliação e skill `erp-web-to-mobile-replication`. Não há `AGENTS.md` aninhado nos diretórios deste recorte. A skill não foi encontrada em fonte canônica do projeto; foi consultada somente na cópia de cache registrada anteriormente.

#### Validação e limitações

- [x] Acrescentei regressão RTL que escolhe o produto legado pelo autocomplete, submete o formulário e confirma que o payload retém `productId`, descrição/preço/estoque/quantidade e não envia o ID virtual como `variationId`.
- [x] Vitest permitido via runner ERP: `VariationFormModal.test.tsx` e `mobileProductCompositionService.test.ts` — **2 arquivos, 41/41 testes aprovados**. A suíte mantém mensagens esperadas de timeout/rede em seus casos de erro.
- [ ] Sem Playwright autenticado, aparelho Android/Maestro ou leitura/escrita remota; a regressão de formulário usa os serviços mockados e não comprova recálculo persistido de disponibilidade no banco. Não apliquei migration nem deploy.

**Conclusão do recorte:** ERP e app passam a referenciar o pai para o fallback simples virtual, evitando chave sintética em `combo_items`; referências a variações reais continuam intactas. A auditoria geral permanece aberta.

#### Próximo recorte identificado

Continuar por outra aba/estado de Produtos. Não alterar a elegibilidade de serviços como componentes sem a definição pendente do Ciclo 324. Manter abertas as comparações visuais autenticadas, validação nativa e prova de persistência remota; a Conciliação continua exclusiva do ERP.

### Ciclo 328 — preço exibido nas sugestões de componentes — 25/10/2026

**Recorte:** valor exibido para um produto/variação candidata no autocomplete da aba Composição de uma variação.

#### Evidência e correção

- [x] O ERP exibia o primeiro valor truthy nesta ordem: promoção da variação, preço regular da variação, promoção do pai, preço regular do pai, zero. A aba mobile exibia sempre preço regular e o mapper das sugestões descartava os campos promocionais.
- [x] Extraí a precedência de apresentação para `shared-utils/productAutocompleteDisplayPrice.ts`; o ERP e o mobile usam o mesmo helper. O serviço mobile agora preserva os preços promocionais normalizados do produto e da variação na sugestão.
- [x] O `handleAddItem` segue gravando o preço regular (`variationPrice`/`unitPrice`) no `comboItems`; preço promocional afeta somente o texto da sugestão, igual ao contrato atual de seleção do ERP. Busca, elegibilidade de tipos, quantidade, estoque, persistência e estado RHF/Zod do formulário proprietário não mudaram.
- [x] Fontes comparadas: `ProductAutocomplete`, `useProductAutocomplete`, `VariationCompositionItemsTab`, `ProductFormCompositionTab`, `mobileProductCompositionService`, `mobileProductFetchService`, tipos Product/Variation/ComboItem, testes ERP/mobile, schema de busca compartilhado, documentação de estrutura de produtos/variações, operações mover/merge, particularidades mobile offline-first, inventário de formulários, `AGENTS.md`, `docs/geral/USER_RULES.md`, regra de Conciliação ERP-only, inventário e roadmap. Não há `AGENTS.md` aninhado nos diretórios-fonte; a skill de replicação segue disponível apenas na cópia de cache do backup ERP, não tratada como fonte canônica.

#### Validação e limitações

- [x] Vitest focado pelo runner ERP: helper compartilhado, sugestão visual ERP e serviço mobile — **3 arquivos, 10/10 testes aprovados**. Os testes cobrem precedência, fallback de zero, renderização da promoção e preservação dos valores no candidato.
- [x] `git diff --check` não apontou erros de whitespace; exibiu apenas avisos de normalização CRLF já comuns na árvore de trabalho.
- [ ] ESLint direcionado não iniciou: o executável encontrado é ESLint 10, mas o projeto não tem `eslint.config.*` compatível (`.eslintrc` legado); comando encerrou com código 1 antes de analisar os arquivos. O TypeScript ERP local não concluiu em aproximadamente um minuto e foi interrompido sem emitir diagnósticos. Sem Playwright autenticado, runtime Android/Maestro ou prova de persistência remota; não houve chamadas ou gravações externas.

**Conclusão do recorte:** a lista de candidatos de composição no mobile agora mostra a mesma escolha de preço promocional do ERP, sem alterar o valor regular usado para compor o item. A auditoria permanece aberta.

#### Próximo recorte identificado

Continuar em outra aba/estado de Produtos. A decisão do Ciclo 324 sobre permitir serviços como componentes continua pendente; manter o filtro mobile sem mudanças até decisão. Preservar limitações de UI autenticada, validação nativa e prova remota; a Conciliação continua exclusiva do ERP.

### Ciclo 329 — conversão de família salva em produto simples — 25/10/2026

**Recorte:** remover uma das duas variações de um produto salvo e verificar a transição da variação restante para produto simples.

#### Decisão e evidência

- [x] O usuário escolheu alinhar ERP e app à documentação vigente. `estrutura-produto-variacao.md` determina que, quando restar uma variação operacional, nome, preços, descrição, dimensões e imagens voltam a herdar do pai; a interface reativa a sincronização.
- [x] O helper compartilhado `inheritSimpleProductVariationFromParent` aplica nome/títulos, preços, descrição, condição/fiscal, dimensões, custos acessórios e imagens do pai, e reativa as flags de herança. IDs e SKU da variação sobrevivente são preservados pelo spread de seus dados.
- [x] Como a documentação não define estoque como campo herdado e atributos existentes devem continuar preservados, os dois clientes passam `preserveVariationStock: true` e `preserveVariationAttributes: true` para produto salvo. Isso evita alteração implícita de saldo ou exclusão dos atributos da variação que sobrevive; não equivale a uma movimentação de estoque.
- [x] ERP `useProductFormVariations.removeVariation` reativa a herança após reduzir para uma linha; o caminho de exclusão física bem-sucedida em `useProductFormModal` também remapeia a linha restante com as mesmas opções. O mobile `ProductFormVariationsTab.handleRemove` só confirma a conversão após a verificação de histórico e usa o wrapper `inheritMobileSimpleVariationFromParent`, que delega ao mesmo helper compartilhado; em seguida define `hasVariations: false`.
- [x] A cobertura de domínio mobile e do hook ERP já confirma o comportamento com pai em saldo 12 e variação sobrevivente em saldo 7, além da preservação dos atributos, UUID/SKU, herança de preços/campos comerciais e reativação das flags. O código existente atende à escolha do usuário; nenhuma nova alteração de produção ou ajuste da documentação foi necessário.
- [x] Fontes consultadas nesta execução: `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `simpleProductVariationInheritance.ts`, `useProductFormVariations.ts`, `useProductFormModal.ts`, `ProductFormVariationsTab.tsx`, `productVariationParentSync.ts` e testes de herança ERP/mobile; `AGENTS.md`, `docs/geral/USER_RULES.md`, regras pertinentes, skill de replicação, inventário e roadmap. A skill do projeto continua localizada apenas no cache de build do ERP; não foi tratada como fonte canônica.

#### Validação e limitações

- [x] Vitest focado pelo runner permitido, nos quatro arquivos ERP/mobile do helper, remoção e persistência: **4 arquivos, 83/83 testes aprovados** (resultado registrado nesta execução antes da atualização documental).
- [ ] A comparação foi estática nos caminhos de UI; sem Playwright autenticado nem aparelho Android/Maestro. A exclusão física e a persistência completa dessa conversão não foram executadas contra backend remoto; nenhum dado ou serviço externo foi alterado. Expo Web não comprovaria o comportamento nativo.

**Conclusão do recorte:** a transição 2→1 reativa a herança documentada nos dois clientes sem mudar saldo físico nem remover atributos, como confirmado pelo usuário. Não há diferença funcional comprovada que exija correção neste recorte; a auditoria geral permanece aberta.

#### Próximo recorte identificado

Continuar em outro estado do módulo Produtos. Manter pendente a decisão do Ciclo 324 sobre serviços como componentes, as validações visuais autenticadas/nativas e as provas remotas já registradas; não reabrir a Conciliação de Produtos, exclusiva do ERP.

### Ciclo 330 — remoção de componente na aba móvel de Composição — 25/10/2026

**Recorte:** selecionar **Remover Item** em uma linha de `comboItems` da aba de Composição de uma variação, sem remover o pai, a variação ou alterar saldo físico.

#### Evidência e cobertura

- [x] A revisão anterior (Ciclo 326) confirmou que ERP `VariationCompositionItemsTab.handleRemoveItem` e app `ProductFormCompositionTab.handleRemove` retiram somente a linha selecionada. O app também limpa buffers temporários de quantidade indexados por posição antes da reindexação; ambos atualizam o estado pertencente ao formulário da variação.
- [x] Acrescentei `mobile/src/features/products/modals/tabs/ProductFormCompositionTab.test.tsx`: renderiza a aba com primitives React Native mockadas, aciona o callback da segunda linha e aplica o updater recebido pelo proprietário; o estado resultante conserva a primeira linha e remove apenas a segunda.
- [x] Reexecutei o teste ERP `VariationFormModal.test.tsx`. A regressão já cobre a interação **Remover Item** pelo formulário real de variação e confirma que a linha restante é submetida com sua quantidade editada, sem chamadas de mutação fora do teste.
- [x] O formulário não ganhou um proprietário/submissão paralelos: `ProductFormScreen` segue responsável pelo estado e pela validação RHF/Zod do produto; a aba de composição só propõe atualizações em `comboItems`, conforme a cobertura de formulário registrada no inventário de migração.
- [x] Regras e fontes consultadas: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, skill `erp-web-to-mobile-replication` (somente cópia de cache ERP localizada; não tratada como fonte canônica), `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, inventário de formulários e roadmap. Não foi localizado `AGENTS.md` aninhado nos diretórios ERP/mobile/shared-utils/docs deste recorte.

#### Validação e limites

- [x] Vitest mobile pelo runner permitido: teste de componente `ProductFormCompositionTab.test.tsx` — **1/1** aprovado.
- [x] Vitest ERP pelo runner permitido: `VariationFormModal.test.tsx` — **37/37** aprovados, incluindo remoção de linha e salvamento da linha restante.
- [x] `git diff --check` sem erros de whitespace; avisos de CRLF/LF podem ocorrer nos arquivos já modificados.
- [ ] O teste mobile chama o callback capturado num renderer de teste com componentes nativos mockados; não comprova toque/gesto, blur ou re-render em telefone. Sem Playwright autenticado nem Android físico/Maestro; nenhuma persistência remota, consulta/escrita externa, migration ou deploy foi feita. Expo Web não comprovaria o gesto nativo.

**Conclusão do recorte:** a ação móvel agora possui cobertura explícita para escopo da remoção; o comportamento funcional continua alinhado ao ERP e não precisou de correção de produção. A auditoria geral permanece aberta.

#### Próximo recorte identificado

Continuar em outro estado de Produtos. A elegibilidade de serviços como componentes permanece pendente de decisão; manter o filtro existente no app até definição. Seguem pendentes a inspeção visual autenticada e as provas nativas/remotas registradas, sem reintroduzir a Conciliação no aplicativo.

### Ciclo 331 — visibilidade de atributos na geração em lote — 25/10/2026

**Recorte:** modal de geração cartesiana da aba Variações: formar os nomes automáticos das linhas recém-geradas respeitando `showName`.

#### Evidência e correção

- [x] A documentação vigente define `showName: false` como atributo que permanece disponível para filtro/regra, mas cujo **valor não entra no nome automático**; ausência do campo equivale a `true`.
- [x] ERP e app mantinham todos os valores no nome criado em lote, embora a edição normal de nomes e os cards já omitam valores explicitamente ocultos. O teste mobile existente inclusive esperava “Camiseta Azul P” com `Tamanho.showName=false`, contradizendo o contrato documentado.
- [x] Extraí `getVariationNameAttributeValues` para `shared-utils/productVariationNameValidation.ts`; a finalização compartilhada, a projeção de nomes do ERP e ambos os geradores em lote reutilizam a mesma regra. O valor oculto continua em `attributes` com `showName:false`; só deixa de compor `name`.
- [x] A seleção cartesiana, os valores de atributos, SKUs, identidade UUID, estado inicial, campos técnicos variáveis, submissão RHF/Zod e persistência não foram alterados.
- [x] Fontes consultadas: `AGENTS.md`, `docs/geral/USER_RULES.md`, regra ERP-only da Conciliação, skill de replicação (encontrada apenas no cache de build do ERP; sem versão canônica atual em `.agents/skills`/`skills`), estrutura de produto/variação, operações mover/merge, inventário de formulários e roadmap, `CartesianVariationModal`, `buildBulkVariations`, `variationFormDefaults`, `variationFormSubmitRules`, `ProductVariationGenerationModal`, `ProductFormVariationsTab`, esquemas Zod, helper compartilhado e testes ERP/mobile. Não foi encontrado `AGENTS.md` aninhado nos diretórios deste recorte.

#### Validação e limites

- [x] Vitest focado: ERP `variationGenerationRules.test.ts` + `variationNaming.test.ts` **11/11**, `variationFormDefaults.test.ts` **8/8**; mobile `mobileProductVariationGeneration.test.ts` + `productVariationName.test.ts` **20/20**. Total do recorte: **39/39**.
- [x] `git diff --check` sem erros de whitespace; apenas avisos de normalização CRLF/LF. `tsc` global do mobile saiu com 15 diagnósticos de outros módulos/infraestrutura; o `tsc` global do ERP saiu não-zero com muitos diagnósticos preexistentes e saída truncada, portanto não serve como validação limpa do repositório. Os Vitest focados transpilaram e passaram.
- [ ] Sem Playwright autenticado ou runtime Android/Maestro nesta execução. A correção é da transformação de domínio; nenhuma consulta/escrita remota, migration ou deploy foi realizada. Expo Web não comprova o comportamento nativo.

**Conclusão do recorte:** os dois geradores passam a respeitar a regra de visibilidade já usada pelo restante do domínio, preservando todos os atributos. A auditoria geral permanece aberta.

### Ciclo 332 — rótulo do controle de visibilidade no gerador — 25/10/2026

**Recorte:** controle que define se o valor de uma característica aparece no nome automático, no modal ERP e no modal nativo do app.

#### Evidência e correção

- [x] O contrato documentado em `estrutura-produto-variacao.md` é sobre incluir ou ocultar o **valor** no nome automático. No mobile, “Com rótulo”/“Só valor” descrevia uma semântica diferente; no ERP, “Mostrar Nome”/“Ocultar Nome” não especificava que se referia ao valor da característica.
- [x] Os dois modais agora mostram `Valor no Nome` ou `Valor Oculto`; o tooltip ERP e o rótulo de acessibilidade mobile descrevem que o valor está exibido/oculto no nome automático. A seleção, `showName`, atributos persistidos, geração, validação RHF/Zod e payload permanecem iguais.
- [x] Fontes consultadas: `AGENTS.md`, `docs/geral/USER_RULES.md`, regra ERP-only da Conciliação, skill de replicação (somente cópia de cache no backup de build, sem fonte canônica atual), documentação de estrutura produto/variação e mover/merge, inventário de formulários, roadmap, `CartesianVariationModal`, `ProductVariationGenerationModal` e helper compartilhado. Não há `AGENTS.md` aninhado nos diretórios envolvidos.

#### Validação e limites

- [x] Revisão estática dos rótulos nos dois componentes e `git diff --check` dos arquivos deste recorte passaram (exit code 0; Git avisou somente sobre normalização CRLF/LF). Nenhum teste de lógica foi executado porque não houve mudança de comportamento.
- [ ] Não houve autenticação Playwright porque o inventário ainda registra possível limpeza automática de rascunhos ao abrir o Dashboard (Ciclo 182). Não há dispositivo Android/Maestro disponível nesta sessão; nenhuma alteração remota, migration ou deploy foi feita. A renderização de Expo Web não comprovaria o texto no runtime nativo.

**Conclusão do recorte:** a UI passa a descrever o efeito documentado do controle nos dois clientes, sem alterar comportamento ou dados. A auditoria geral permanece aberta.

### Ciclo 333 — estado de gravação no cadastro de tipo de produto — 25/10/2026

**Recorte:** adicionar um tipo de produto na tela nativa de Configurações de Produto.

#### Evidência e correção

- [x] O ERP ativo (`ProductTypes/Index.tsx`) separa `fetching` da lista de `loading` da mutação; durante a inclusão, desativa o botão e troca o ícone por indicador de progresso. O modal ERP legado apresenta o mesmo estado, embora não tenha callsites ativos localizados.
- [x] O mobile já submetia `catalogNameFormSchema` pelo `useZodForm.validateAndRun` real e o serviço normalizava o nome antes do mesmo `INSERT` em `product_types`. Contudo, durante o I/O o botão continuava com ícone de adicionar e sem estado acessível de ocupado. `validateAndRun` já bloqueia uma segunda submissão, mas essa proteção não dava feedback ao operador.
- [x] Acrescentei estado `saving` independente do carregamento da lista. A ação agora fica desativada enquanto a inserção e atualização da lista terminam, mostra `ActivityIndicator` e expõe `busy`/nome acessível; em falha, `finally` restaura o botão e o alerta existente continua responsável pelo erro. Validação Zod, normalização, serviço, payload, permissões e confirmação de exclusão não foram alterados.
- [x] O ERP emite toast de sucesso; o app, após resposta bem-sucedida, limpa o campo e atualiza a lista. Mantive essa confirmação não modal própria do app: `Alert` seria bloqueante e não há componente de toast móvel compartilhado. A limpeza do campo e a lista atualizada comunicam o resultado sem interromper a tarefa.
- [x] Fontes comparadas antes da alteração: `ProductTypes/Index.tsx`, `productCatalogMetadataService.ts`, `ProductTypeManagementModal.tsx`, `ProductTypesManagerModal.tsx`, `ProductConfigModal.tsx`, `NativeProductsScreen.tsx`, `mobileProductTypeService.ts`, `useZodForm.ts` e `catalogNameFormSchema`. Regras/docs consultadas: `AGENTS.md` (RHF/Zod e runners), `docs/geral/USER_RULES.md`, regra `product-reconciliation-erp-only.yml`, estrutura de produto/variação, operações mover/merge, nota offline-first, inventários de produtos/formulários e roadmap. Não há `AGENTS.md` aninhado no caminho. A skill de replicação permanece disponível apenas na cópia de cache do backup `.vercel`; não foi tratada como fonte canônica.

#### Validação e limites

- [x] Revisão estática confirmou que `saving` é ativado somente depois da validação do resolver e é sempre limpo no `finally`; a lista mantém seu estado `loading` separado.
- [ ] A tentativa de Vitest/RTL não coletou: com `jsdom`, a dependência `canvas.node` está ausente; usando o `happy-dom` já instalado, o módulo `@testing-library/react` não resolve a partir do pacote mobile. Removi o teste temporário não executado; nenhuma dependência ou configuração de runner foi alterada. Não há teste focado aprovado neste ciclo.
- [ ] Sem Playwright autenticado (o inventário registra risco de limpeza de rascunhos ao abrir o Dashboard no Ciclo 182) e sem dispositivo físico/Maestro disponível. Não houve consulta ou escrita remota, alteração de migration ou deploy; mocks/checagem estática não comprovam a persistência do cadastro. Expo Web não comprovaria o comportamento nativo.
- [x] `git diff --check` dos arquivos do recorte passou (exit code 0; avisos de normalização CRLF/LF apenas nos arquivos históricos já em estado modificado).

**Conclusão do recorte:** o botão mobile agora comunica e bloqueia a gravação em andamento, seguindo o estado equivalente do ERP sem duplicar regras ou mudar o contrato de cadastro. A auditoria geral permanece aberta.

### Ciclo 334 — bloquear mudanças no modal de categoria durante o salvamento — 25/10/2026

**Recorte:** criação/edição de Categoria ou Ambiente, enquanto `useCategoryFormModal` aguarda o serviço assíncrono.

#### Evidência e correção

- [x] O modal ERP ativo (`erp/src/pages/App/Products/Categories/modals/CategoryEnvironmentModal.tsx`) desativa o campo de nome e as caixas de seleção de vínculos enquanto `isSubmitting` está ativo.
- [x] O proprietário mobile (`mobile/src/features/products/categories/hooks/useCategoryFormModal.ts`) primeiro executa `catalogNameFormSchema` e `categoryAttributeSelectionsSchema` por `useZodForm.validateAndRun`; somente então ativa `isSubmitting`, chama o mesmo serviço de domínio móvel e aguarda o refresh. Antes do ajuste, o `TextInput` de nome e as linhas de `CategoryLinksPicker` ainda aceitavam alteração durante esse I/O, embora atributos, cancelar e salvar já fossem bloqueados.
- [x] Alinhei os controles móveis: o nome recebe `editable={!isSubmitting}` e opacidade reduzida, e `CategoryLinksPicker` recebe `disabled={isSubmitting}`. As linhas nativas passam a usar `disabled`, estado de acessibilidade `checked`/`disabled` e apresentação atenuada. O modo não desativado continua sendo o padrão reutilizável do picker.
- [x] O formulário e o hook proprietário não mudaram; schema, parse, validação, serviço, efeitos e payload permanecem iguais. Nenhuma regra compartilhada de negócio precisava de alteração, pois a diferença é interação de plataforma durante uma gravação.
- [x] Fontes consultadas: `AGENTS.md` (formulários RHF/Zod e runners permitidos), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, skill `erp-web-to-mobile-replication` (localizada somente na cópia de cache dentro do backup `.vercel`; não foi considerada fonte canônica), `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/mobile/arquitetura_offline_first.md`, inventários de paridade/formulários e roadmap. Confirmado que o picker ativo tem apenas este callsite e que não há `AGENTS.md` aninhado no caminho.

#### Validação e limites

- [x] Vitest mobile focado `CategoryLinksPicker.test.tsx`: **2/2** aprovados; cobre estado desativado/acessível durante save e estado disponível fora do save, com primitives React Native mockadas.
- [x] Revisão estática confirmou que o nome fica não editável, os vínculos ficam desativados e o estado é limpo no `finally` do proprietário. `git diff --check` sem erros no recorte; avisos de normalização CRLF/LF podem ocorrer em arquivos existentes.
- [x] `tsc --noEmit -p mobile/tsconfig.json` não concluiu limpo por diagnósticos existentes em `DistanceInput.tsx`, `MeasurementInput.tsx`, `useAgendaData.ts`, hooks de inventário, `InventoryMoveEditModalContent.tsx`, `financialAiAssistantService.ts`, configuração Vitest e `shared-utils/commercialScheduling`; nenhum diagnóstico apontou os arquivos alterados neste ciclo.
- [ ] Sem Playwright autenticado: a abertura do Dashboard ainda tem o risco documentado de limpar rascunhos. Sem aparelho Android físico/Maestro disponível; a prova com primitives mockadas não confirma gestos, leitor de tela ou rendering nativo. Não houve leitura/escrita remota, migration ou deploy; Expo Web não comprova comportamento nativo.

**Conclusão do recorte:** durante a gravação, o operador não consegue alterar localmente nome/vínculos diferentes do snapshot já submetido; os controles correspondem ao bloqueio do ERP sem alterar a operação de negócio. A auditoria geral permanece aberta.

### Ciclo 335 — busca de categorias com espaços nas extremidades — 25/10/2026

**Achado registrado antes da correção:** `CategoriesListSection` do ERP só usa `searchTerm.trim()` para decidir se há termo, mas compara com `searchTerm.toLowerCase()` sem remover espaços. O app recebe o mesmo texto bruto de `MobileCategoriesHeader`, porém `filterCategories` removia os espaços antes da comparação; assim, a busca com espaços antes/depois do nome localiza a categoria apenas no mobile. Não foi encontrada regra de domínio ou particularidade documentada que justifique essa divergência. A busca da lista é local, e a arquitetura online-first de cadastro/edição não muda esse escopo.

**Decisão de execução:** conforme a instrução permanente para divergências sem justificativa documentada, alinhar o app ao comportamento vigente do ERP; não mudar o ERP nem ampliar para a busca de Ambientes, cujo código já compara o termo bruto nos dois clientes. Preservar o guard existente para termo vazio/composto só de espaços. Antes da alteração foram comparados o ERP ativo, o helper e teste mobile, o estado bruto da busca nos dois headers e a ausência de um helper de filtro compartilhado aplicável.

#### Evidência e correção

- [x] `filterCategories` agora compara com `searchTerm.toLowerCase()` depois do mesmo guard por `searchTerm.trim()` usado no ERP. A regressão cobre termo simples correspondente, o mesmo termo cercado por espaços sem correspondência e termo só de espaços sem filtro; filtros de vínculo, estado de busca, serviços e payloads não mudaram.
- [x] Não foi encontrado helper compartilhado de busca de categorias nos módulos compartilhados; mantive a adaptação mínima no helper já proprietário da lista mobile, sem refatoração transversal do ERP.
- [x] Fontes conferidas antes da edição: `AGENTS.md` (validação RHF/Zod e runner Vitest permitido), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, skill de replicação (somente cópia de cache dentro de backup `.vercel` disponível; não é fonte canônica), `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/mobile/arquitetura_offline_first.md`, `docs/produtos/auditoria-arquitetura-organizacao-produtos.md`, inventários de paridade/formulários e roadmap. Não há `AGENTS.md` aninhado em `mobile/src/features/products/categories/domain/`.

#### Validação e limites

- [x] Vitest mobile do diretório `categories/domain`: **48/48** em três arquivos (`categoryEnvironmentRules`, seleção de atributos e serviços).
- [x] `git diff --check` sem erros nos arquivos do recorte; apenas avisos de normalização CRLF/LF em arquivos já modificados.
- [x] `tsc --noEmit -p mobile/tsconfig.json` continua com **10 diagnósticos globais fora do recorte** (inputs de medidas, agenda, inventário, movimentação de estoque, assistente financeiro, configuração Vitest e tipos de agendamento compartilhados); nenhum diagnóstico apontou `categoryEnvironmentRules.ts` ou seu teste.
- [ ] Sem Playwright autenticado: o risco documentado de limpeza de rascunhos ao abrir Dashboard permanece. Sem telefone físico/Maestro; nenhuma leitura/escrita remota, migration ou deploy. Expo Web não comprova a busca no runtime nativo.

**Conclusão do recorte:** a busca local de categorias no mobile agora tem a mesma comparação case-insensitive com texto bruto do ERP para entradas com espaços externos; o guard de texto vazio continua preservado. A auditoria geral permanece aberta.

### Ciclo 336 — estado vazio e sem resultados de Categorias e Ambientes — 25/10/2026

**Recorte:** feedback das listas de Categoria e Ambiente quando os dados estão vazios ou a busca/filtro não retorna itens.

#### Evidência e conclusão

- [x] `CategoriesListSection` ERP apresenta a mesma linha genérica “Nenhuma categoria encontrada.” tanto no estado inicial sem registros quanto quando busca/filtro não encontra itens. `EnvironmentsTable` ERP diferencia “Nenhum ambiente cadastrado” da busca sem correspondência e oferece a orientação “Tente buscar por outro termo ou limpe a busca.”; quando vazio, orienta criar pelo botão acima.
- [x] `MobileCategoriesList` mantém o título “Nenhuma categoria encontrada”, mas contextualiza a recuperação: sugere outro termo/ajuste do filtro ou orienta tocar em “Categoria” para criar. `MobileEnvironmentsList` separa explicitamente busca sem resultados e lista sem cadastro, preserva a orientação de limpar/refazer a busca e traduz a ação de criação para o botão mobile.
- [x] A diferença é apenas feedback de apresentação: filtro e busca continuam locais sobre as mesmas coleções carregadas, e os textos não mudam cadastro, vínculos, contagens ou serviços. Mantive a adaptação nativa com ícone/card e instrução de toque; a lista ERP permanece como referência de regra e mantém a ação de criar disponível no cabeçalho.
- [x] Registrei esta particularidade mobile no inventário persistente como exceção de apresentação justificada, em vez de remover orientação contextual sem alterar qualquer contrato funcional. Nenhuma alteração de código foi necessária.
- [x] Fontes comparadas: `CategoriesListSection.tsx`, `EnvironmentsTable.tsx`, `MobileCategoriesList.tsx`, `MobileEnvironmentsList.tsx`, `MobileCategoriesHeader.tsx`, `NativeCategoriesScreen.tsx` e `filterCategories`/`filterEnvironments`; regras e referências: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, skill de replicação (somente cópia de cache localizada em backup `.vercel`), `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/mobile/arquitetura_offline_first.md`, `docs/produtos/auditoria-arquitetura-organizacao-produtos.md`, inventário e roadmap. Não há `AGENTS.md` aninhado nos caminhos consultados.

#### Validação e limites

- [x] Revisão estática confirmou os ramos de lista vazia versus busca/filtro sem resultado nos quatro componentes. Não executei testes: não houve mudança de lógica ou de código.
- [x] `git diff --check` sem erros no registro; avisos de CRLF/LF são apenas de normalização dos arquivos históricos já modificados.
- [ ] Sem Playwright autenticado, devido ao risco documentado de limpeza de rascunhos ao abrir Dashboard; sem aparelho físico/Maestro. A inspeção de JSX prova as mensagens condicionais, mas não layout/legibilidade visual ou leitor de tela nativo. Nenhuma consulta/escrita remota, migration ou deploy; Expo Web não comprova runtime nativo.

**Conclusão do recorte:** estados de dados vazios e ausência de correspondência estão funcionalmente alinhados; as instruções extras do app são mantidas como adaptação mobile de apresentação e recuperação, sem diferença de domínio. A auditoria geral permanece aberta.

#### Próximo recorte identificado

Na aba Por ambiente, comparar o gesto de pull-to-refresh como affordance mobile exclusiva; manter pendente a validação visual autenticada e Android/Maestro.

### Ciclo 337 — busca de Ambiente por nome e categoria vinculada — 25/10/2026

**Achado registrado antes da alteração:** `EnvironmentsTable` (ERP) e `MobileEnvironmentsList` filtram com a mesma condição: termo vazio/só espaços preserva a coleção, termo não vazio é comparado sem diferenciar maiúsculas, usa o texto bruto e inclui o ambiente quando o nome dele ou de uma categoria vinculada coincide. Os dois serviços projetam os mesmos IDs filhos por `category_relationships.parent_id`. Portanto não havia diferença de comportamento no estado ativo. Contudo, `filterEnvironments` no domínio mobile não tem callsite de produção, remove espaços do termo e não consulta categorias vinculadas; o teste existente verificava apenas esse helper isolado, não o filtro usado pela tela.

**Decisão de execução:** registrar o falso sinal de cobertura e consolidar o filtro puro existente nas telas ERP e mobile em uma função compartilhada, mantendo exatamente o comportamento ativo já estabelecido pelo ERP. Não alterar consultas, relações, payloads, busca por Categoria, instruções de estados vazios ou a exceção de Conciliação ERP-only.

#### Evidência e correção

- [x] Extraí a regra ativa para `shared-utils/categoryEnvironmentSearch.ts`; `EnvironmentsTable` do ERP e `MobileEnvironmentsList` agora chamam a mesma função. Para termo vazio ou só espaços, a lista original é preservada; termos não vazios continuam case-insensitive, sem trim, e correspondem ao ambiente ou a uma categoria vinculada pelo ID. Consultar categorias para a correspondência não liga categorias órfãs a ambientes.
- [x] Removi `filterEnvironments` do domínio mobile porque não tinha callsites de produção e divergiam da tela; substituí o teste enganoso, que exercitava apenas esse helper, por cinco casos do helper efetivamente usado: termo vazio, whitespace-only, nome do ambiente, categoria vinculada, órfã e espaços externos. O helper agora é verificado pela mesma função consumida nos dois clientes.
- [x] Antes da alteração, conferi `AGENTS.md` raiz e as regras de formulário/testes, `docs/geral/USER_RULES.md`, a regra `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, a documentação offline-first e os inventários de Produtos/formulários/roadmap. Não há `AGENTS.md` aninhado nos caminhos tocados. A skill de replicação só foi localizada em cópia de cache no backup `.vercel`; usada como orientação de procedimento, não tratada como fonte canônica.

#### Validação e limites

- [x] Vitest mobile, diretório de domínio `categories`: **52/52** em 4 arquivos (inclui os 5 novos cenários da função compartilhada).
- [x] `git diff --check` dos arquivos do ciclo: exit code 0; apenas avisos de normalização CRLF/LF. Os caminhos relativos ERP e mobile foram resolvidos para o helper compartilhado.
- [x] `rg` não encontrou chamadas restantes a `filterEnvironments(`; as telas usam `filterEnvironmentsBySearch`.
- [ ] `npx tsc --noEmit -p mobile/tsconfig.json` continua sem conclusão limpa (exit 1), com diagnósticos fora dos arquivos deste ciclo: `e2e/categories-characteristics.spec.ts` (`node:crypto`); `DistanceInput.tsx` e `MeasurementInput.tsx` (`typingMode`); `useFinancialAiChat.ts` (inferência/retorno implícito); `CreateEventModal.tsx` (tipo possivelmente `undefined`); `useAgendaData.ts` (argumento ausente); `inventoryOutboxSync.ts` (`data` em `never`); `InvoicesScreenContent.tsx` (string nullable); `financialAiAssistantService.ts` (campo `role`); `vitest.config.ts` (módulo `vitest/config`); e dois diagnósticos em `shared-utils/commercialScheduling` (`period` e resolução de `Shipping.type`). O diagnóstico inicial do caminho mobile incorreto foi corrigido; a nova execução não apontou os arquivos alterados.
- [ ] No diretório `erp`, `npx tsc --noEmit -p tsconfig.json --pretty false` foi iniciado, mas não produziu saída por mais de dois minutos; encerrei o processo como inconclusivo. A resolução do caminho relativo ERP foi confirmada diretamente; typecheck completo ERP permanece pendente.
- [ ] Playwright autenticado não executado, devido ao risco já documentado de limpar rascunhos ao abrir o Dashboard; não há dispositivo Android físico/Maestro disponível nesta execução. Nenhum teste de Expo Web foi tratado como prova nativa. Não houve acesso ou gravação em banco remoto, migration ou deploy.

**Conclusão do recorte:** busca ativa de Ambientes equivalente no ERP e no app e agora implementada por uma única função compartilhada; a antiga cobertura unitária falsa foi substituída por cobertura da regra efetiva. Próximo recorte: estados de carregamento, erro/recarga e vazio da lista Por ambiente. A auditoria geral permanece aberta.

### Ciclo 338 — estado de carregamento inicial da aba Por ambiente — 25/10/2026

**Recorte:** estado inicial, antes da primeira resposta de ambientes, categorias e contagens.

#### Evidência da comparação

- [x] ERP (`Categories/Index.tsx`) e mobile (`NativeCategoriesScreen.tsx`) substituem a tela pelo indicador de carregamento enquanto `loading` está ativo; nenhum dos dois permite interagir com a lista antes de todas as três consultas do `Promise.all` terminarem.
- [x] Ambos iniciam a consulta no efeito de montagem e mantêm uma coleção inicial vazia até sucesso. O app mostra o texto “Carregando ambientes e categorias...” sob o `ActivityIndicator`; o ERP mostra o spinner central sem texto. Mantive essa informação explícita no app por clareza da adaptação nativa e pela regra geral do `AGENTS.md` de feedback claro em operações assíncronas. Não é diferença de regra nem justificativa para retirar o texto do mobile.
- [x] Os hooks usam a mesma unidade de carga (ambientes, categorias e contagens) e só desligam `loading` no `finally`; falha inicial e atualização silenciosa ficam fora deste recorte e serão avaliadas separadamente.
- [x] Fontes consultadas antes de registrar: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, skill `erp-web-to-mobile-replication` (só disponível em cópia cache `.vercel`, sem fonte canônica atual), estrutura produto/variação, operação mover/merge, arquitetura offline-first e inventários/roadmap. Não há `AGENTS.md` aninhado nos diretórios de ERP/mobile/`shared-utils` envolvidos.

#### Validação e limites

- [x] Comparação estática dos dois owners (`Index.tsx`/hook ERP e `NativeCategoriesScreen.tsx`/hook mobile); nenhuma mudança de código necessária.
- [ ] Sem Vitest/RTL porque não houve alteração de lógica; Playwright autenticado permanece pendente devido ao risco já registrado de limpeza de rascunhos ao abrir o Dashboard. Sem aparelho físico/Maestro disponível; a inspeção do JSX nativo não é prova de runtime Android/iOS. Nenhum acesso ou escrita remota, migration ou deploy.

**Conclusão do recorte:** estado bloqueante de carregamento inicial equivalente nos dois clientes; texto explicativo do app é uma adaptação de feedback necessária à plataforma e fica preservado. Próximo recorte: falha das consultas no primeiro carregamento da aba Por ambiente. A auditoria geral permanece aberta.

### Ciclo 339 — falha inicial das consultas da aba Por ambiente — 25/10/2026

**Recorte:** erro de consulta no primeiro carregamento, antes de existir conteúdo em memória.

#### Achados registrados antes de decidir manter ou alterar

- [x] `fetchEnvironments` do ERP captura falhas da consulta e retorna `[]`; também captura falhas de rede/exceções e retorna `[]`. Assim, o `Promise.all` do hook ERP conclui como sucesso, não aciona `toast.error` do catch principal e a tela termina mostrando o estado “Nenhum ambiente cadastrado”.
- [x] `fetchMobileEnvironments` propaga tanto erros retornados pelo Supabase quanto exceções. O hook mobile captura a rejeição, abre `Alert.alert('Erro ao carregar', 'Não foi possível carregar as categorias e ambientes.')` e não substitui as coleções; após `finally`, a tela também mostra a apresentação vazia inicial.
- [x] Na leitura das relações `category_relationships`, ERP retorna os ambientes sem suas categorias em caso de erro; mobile propaga a falha e evita renderizar vínculos como se fossem conhecidos. Para consulta principal de `categories`, os dois serviços suprimem o erro e retornam lista vazia; na falha da consulta de relações das categorias, ambos preservam nomes sem relações conhecidas.
- [x] A diferença foi mantida deliberadamente: a regra ativa do `AGENTS.md` exige feedback claro para chamadas assíncronas, e `docs/mobile/arquitetura_offline_first.md` classifica retaguarda/cadastro como online-first estrito. O aviso nativo é mais transparente que a tela ERP, e rejeitar a leitura relacional evita afirmar vínculos possivelmente falsos. Alterar ERP ou enfraquecer o serviço mobile para suprimir o erro não é necessário para paridade segura; o pós-alerta ainda usa o layout vazio compartilhado e fica como limitação visual a reavaliar se houver especificação de um estado de erro dedicado.
- [x] Fontes consultadas antes desta decisão: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, skill `erp-web-to-mobile-replication` (encontrada somente na cópia cache `.vercel`), docs vigentes de estrutura/variação e mover/merge, nota offline-first, inventários de Produtos/formulários e roadmap. Nenhum `AGENTS.md` aninhado nos caminhos ERP/mobile foi encontrado.

#### Validação e limites

- [x] Comparação estática de `categoryService.ts`, `mobileCategoryService.ts`, `useCategoriesAndEnvironments.ts`, `useMobileCategoriesAndEnvironments.ts` e respectivos owners de tela. Nenhuma mudança de código ou contrato foi necessária; sem teste de código.
- [ ] Sem Playwright autenticado para observar a apresentação do toast/alerta, conforme risco documentado de limpeza de rascunhos ao abrir Dashboard; sem aparelho físico/Maestro nesta sessão. Nenhuma consulta remota, escrita, migration ou deploy.

**Conclusão do recorte:** o mobile mantém seu tratamento explícito e mais conservador de falha inicial, especialmente para não inventar estado de relacionamentos; essa diferença está documentada como exceção de resiliência. ERP ainda pode apresentar erro de leitura de ambiente como lista vazia, mas a correção desse comportamento ERP fica fora do ajuste de paridade mobile. Próximo recorte: falha de recarga após mutação bem-sucedida. A auditoria geral permanece aberta.

### Ciclo 340 — falha de recarga após mutação em Por ambiente — 25/10/2026

**Recorte:** leitura de atualização disparada depois de criar/editar/excluir Ambiente ou Categoria e depois de desvincular.

#### Evidência da comparação

- [x] No ERP, os serviços de mutação concluem antes do refresh. O handler mostra `toast.success`, fecha o formulário e chama `loadData(true)`. Se essa leitura falhar, `loadData` captura o erro e exibe `toast.error('Erro ao carregar dados.')`; as listas anteriores permanecem porque `setEnvironments`/`setCategories` só são chamados depois de todo o `Promise.all`.
- [x] No app, `useCategoryFormModal` conclui o serviço, fecha o modal e chama `onSuccess`; o proprietário chama `loadData(true)`. Em falha da leitura, o hook mantém as listas anteriores, mostra `Alert.alert('Erro ao carregar', 'Não foi possível carregar as categorias e ambientes.')` e o `finally` encerra `refreshing`. O alerta identifica falha de leitura, não da mutação já concluída. A tela também usa `RefreshControl`, então o estado do spinner fica visível durante a recarga nativa.
- [x] ERP mantém `refreshing` interno e dispara leituras silenciosas pós-mutação, mas `Index.tsx` não conecta essa flag a um controle visual. A mensagem de sucesso antecede a recarga; no app o fechamento do modal conclui a interação e o `RefreshControl` pode sinalizar a atualização. Preservada a confirmação atual, sem introduzir um `Alert` bloqueante de sucesso nem retirar o feedback de erro.
- [x] É uma adaptação de feedback específica de plataforma, não divergência no resultado de negócio: após leitura bem-sucedida ambos substituem as coleções; após falha ambos preservam os dados em memória. O `AGENTS.md` exige retorno visual claro em operações assíncronas e o app é online-first para cadastro, conforme `docs/mobile/arquitetura_offline_first.md`.
- [x] Fontes consultadas antes do registro: `AGENTS.md`, `docs/geral/USER_RULES.md`, regra `product-reconciliation-erp-only.yml`, skill `erp-web-to-mobile-replication` (somente cópia cache `.vercel` disponível), estrutura de produto/variação, operação mover/merge, offline-first, inventário de paridade e roadmap. Não há `AGENTS.md` aninhado nas áreas consultadas.

#### Validação e limites

- [x] Revisão estática de `useCategoriesAndEnvironments.ts`, `useCategoryFormModal.ts`, `useMobileCategoriesAndEnvironments.ts`, `NativeCategoriesScreen.tsx` e respectivos services; nenhuma alteração de código/contrato necessária.
- [ ] Sem Vitest/RTL porque não houve alteração de código. Sem Playwright autenticado para observar toast/alerta e atualização visual; sem dispositivo físico/Maestro para comprovar RefreshControl Android/iOS. Não houve acesso ou escrita remota, migration ou deploy.

**Conclusão do recorte:** mutação e estado de dados continuam preservados se a leitura pós-mutação falhar; feedback de sucesso/erro é adaptado ao runtime sem alertar que a mutação falhou. Próximo recorte: affordance de pull-to-refresh existente só no app e sua interação com o estado Por ambiente. A auditoria geral permanece aberta.

### Ciclo 341 — pull-to-refresh na aba Por ambiente — 25/10/2026

**Recorte:** gesto nativo de atualização da lista, sem mutação de negócio.

#### Evidência da comparação

- [x] `NativeCategoriesScreen` liga o `RefreshControl` do `ScrollView` a `refresh`; o hook chama `loadData(true)`, que consulta ambientes, categorias e contagens em conjunto. O gesto não altera estado ou payload persistido.
- [x] Enquanto `refreshing` está ativo, o app conserva a lista visível e exibe o indicador próprio do `RefreshControl`; o estado inicial bloqueante não volta a substituir a tela. Em sucesso, todos os dados são atualizados juntos; em falha, os dados anteriores são mantidos, o alerta comunica o erro e o `finally` desliga o indicador.
- [x] `CategoriesHeader`/`Index.tsx` do ERP não expõem botão ou controle equivalente para leitura manual; `refreshing` é interno ao hook e a página somente chama `loadData(true)` depois de mutações. Recarregar o navegador inteiro não é equivalente ao refresh de dados dentro da tela.
- [x] Preservada a affordance adicional mobile: é um padrão nativo de atualização apenas de leitura, útil em uma tela online-first, sem duplicar regra nem substituir a tela ERP. O estado de dados obtido continua sob o mesmo serviço e contrato de consulta.
- [x] Fontes consultadas antes do registro: `AGENTS.md`, `docs/geral/USER_RULES.md`, regra `product-reconciliation-erp-only.yml`, skill `erp-web-to-mobile-replication` (somente cache `.vercel`, sem fonte canônica), estrutura de produto/variação, operações mover/merge, offline-first, inventário e roadmap. Não há `AGENTS.md` aninhado nos caminhos ERP/mobile envolvidos.

#### Validação e limites

- [x] Revisão estática do `RefreshControl`, do callback `refresh` e de `loadData(true)` em mobile, comparada à ausência de acionador manual em `CategoriesHeader`/`Index.tsx` ERP. Nenhuma mudança de código necessária; sem teste Vitest/RTL.
- [ ] Sem Playwright autenticado para o ERP (risco de limpeza de rascunhos já registrado) e sem dispositivo Android físico/Maestro. Expo Web não comprova gesto, indicador ou lifecycle nativos; nenhum refresh remoto, escrita, migration ou deploy realizado.

**Conclusão do recorte:** pull-to-refresh é uma affordance exclusivamente mobile, segura e de leitura; deve permanecer como particularidade de plataforma, sem exigir botão equivalente no ERP. Próximo recorte: filtro de Categorias com/sem Ambiente e persistência ao alternar a aba.

### Ciclo 342 — filtro Sem ambiente e retenção ao alternar a aba — 25/10/2026

**Recorte:** acionador de categorias órfãs, três filtros da lista e retorno de Por categoria para Por ambiente e vice-versa.

#### Evidência da comparação

- [x] ERP e mobile definem órfã como categoria sem `parents` ou com lista vazia; total e subconjunto Sem ambiente usam esse predicado. Com ambiente é o complemento, e Todas mantém a coleção completa. Termo de busca combina com os filtros nas duas telas; normalização do nome e espaços já está registrada no Ciclo 335.
- [x] Ambos exibem contagem/atalho para órfãs somente quando o total é maior que zero. O atalho seleciona Por categoria e solicita `sem_ambiente`. Na entrada pelo atalho, a categoria resultante é a mesma em ambos.
- [x] Divergência de estado registrada antes de decidir: ERP mantém `filterType` local em `CategoriesListSection`; ao alternar para Por ambiente, o componente desmonta e, no retorno, restaura `initialFilter` (controlado pelo estado do hook, normalmente `todas`). Mobile mantém `categoryFilter` no hook e o passa controlado a `MobileCategoriesList`, então uma seleção manual permanece ao alternar as visualizações.
- [x] O estado controlado mobile também mantém responsivo o atalho: depois de visitar Sem ambiente, escolher outro filtro e apertar novamente “Ver categorias”, o app atualiza o filtro para órfãs. No ERP, se o valor parent `initialFilter` já for `sem_ambiente` mas o filtro local tiver sido trocado, repetir o atalho não muda a prop e não força a atualização local. Isso é uma limitação do estado ERP, não um requisito de reproduzir no app.
- [x] Preservada a retenção mobile como diferença de interação justificada: alternar visualizações não perde a seleção manual e o link de pendências leva de volta ao filtro solicitado. A diferença fica registrada como particularidade do app; não alterei nem ERP nem mobile. Os dados/resultados do filtro não divergem para a mesma seleção.
- [x] Fontes conferidas antes do registro: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, skill de replicação (localizada apenas na cópia cache `.vercel`, sem fonte canônica), estrutura de produto/variação, mover/merge, arquitetura offline-first, inventário e roadmap. Nenhum `AGENTS.md` aninhado em ERP/mobile/`shared-utils`.

#### Validação e limites

- [x] Revisão estática de `CategoriesListSection`, `MobileCategoriesList`, `CategoriesHeader`, `MobileCategoriesHeader`, `handleViewOrphans` e `filterCategories`/`getOrphanCategories`; nenhuma mudança de código necessária.
- [ ] Sem teste de código, Playwright autenticado ou dispositivo Android físico/Maestro nesta execução; comparação das transições foi derivada dos proprietários e ciclos de montagem do React. Nenhuma consulta/escrita remota, migration ou deploy.

**Conclusão do recorte:** predicados, totais e filtro órfão são equivalentes; o mobile preserva a seleção ao alternar visualizações e tem atalho mais responsivo no caso citado. Esta retenção é mantida como adaptação documentada. Próximo recorte: seleção e lista de Categorias — contagem/produtos vinculados e associações exibidas. A auditoria geral permanece aberta.

### Ciclo 343 — contagem de produtos e ambientes associados por Categoria — 25/10/2026

**Recorte:** origem da contagem de produtos vinculados, apresentação do total no card/linha de Categoria e resolução visual dos Ambientes associados.

#### Evidência da comparação

- [x] No caminho de sucesso, `fetchCategoryProductCounts` (ERP) e `fetchMobileCategoryProductCounts` consultam as mesmas fontes: `product_categories(category_id, product_id)` e `products(id, category_id)` para `category_id` não nulo. Ambos unem as fontes em um `Set` por categoria e produto, então uma mesma associação presente na relação N:N e no campo primário conta uma vez; ambos aplicam `productCount || 0` ao montar os nós. O formato e os valores apresentados (0 produtos, 1 produto e N produtos) são equivalentes.
- [x] As duas listas derivam os nomes associados pelas relações `category_relationships(parent_id, child_id)`: ERP projeta os filhos em `EnvironmentNode.categories`; mobile projeta `categoryIds` no serviço e o hook adapta esse campo para `EnvironmentNode.categories`. As telas fazem lookup por ID, exibem o nome do Ambiente e sinalizam quando a Categoria não tem Ambiente. No caso de falha da leitura relacional, as diferenças de erro/fallback já estão cobertas no Ciclo 339; este recorte não altera esses contratos.
- [x] Apresentação responsiva ERP limita os nomes visíveis aos três primeiros e indica `+N`, com os demais nomes em atributo `title`; a tela nativa mobile mostra todos os nomes como chips, sem truncar a associação. Mantive a lista completa no app: ela evita esconder vínculos sem oferecer tooltip nativo e preserva descoberta pelo toque/leitura, enquanto a quebra de linha é controlada pelo layout nativo. A diferença é apenas de apresentação, sem alteração da associação persistida.
- [x] Os textos para Categoria órfã são “Sem ambiente” no ERP e “Sem ambiente vinculado” no mobile; o segundo explicita o sentido do badge, sem mudar o predicado, que foi comparado no Ciclo 342.
- [x] Há uma diferença de compatibilidade no conjunto de Categorias exibido: `fetchCategories` no ERP consulta apenas `type = 'category'`; `fetchMobileCategories` consulta todos os registros e exclui apenas `type = 'environment'` via `isProductCategoryOption`. A função compartilhada e testes existentes tratam tipos ausentes/nulos como opções legadas (incluindo teste no serviço mobile e teste do serviço de opções ERP). Preservei esse suporte no mobile, registrando a diferença aqui em vez de ocultar cadastros legados sem evidência de saneamento; a presença desses registros no banco operacional não foi consultada.
- [x] Não encontrei divergência de contagem nem perda de vínculos no caminho carregado com sucesso que justificasse alterar o serviço. Nenhum código de produção foi alterado neste ciclo.
- [x] Fontes conferidas antes do registro: `AGENTS.md` (incluindo a regra de formulários RHF/Zod, runners e Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/mobile/arquitetura_offline_first.md`, inventário e roadmap. Não há `AGENTS.md` aninhado nos caminhos ERP/mobile/`shared-utils`. A fonte canônica da skill `erp-web-to-mobile-replication` não existe em `.agents/skills` nem em `skills/`; como anotado nos ciclos anteriores, a única cópia acessível é o backup de cache `.vercel` e permanece limitada a orientação.

#### Validação e limites

- [x] Comparação estática de `categoryService.ts`, `mobileCategoryService.ts`, `useCategoriesAndEnvironments.ts`, `useMobileCategoriesAndEnvironments.ts`, `CategoriesListSection.tsx` e `MobileCategoriesList.tsx`, incluindo os testes existentes de categorias legadas e deduplicação de contagem. Nenhuma alteração de lógica/código foi feita; não executei testes.
- [ ] Sem Playwright autenticado para observar a apresentação do ERP: abrir o Dashboard mantém o risco documentado de limpar rascunhos. Sem aparelho Android físico/Maestro para conferir chips e leitura no runtime nativo; Expo Web não comprovaria esse comportamento. Não consultei nem gravei dados remotos, não apliquei migration e não fiz deploy.

**Conclusão do recorte:** no estado de sucesso, contagem e relações Categoria–Ambiente são equivalentes. O app conserva todos os nomes e oferece compatibilidade adicional com categorias legadas sem tipo; ambas ficam registradas como particularidades de apresentação/compatibilidade, não como diferença a remover sem prova de domínio em contrário. Próximo recorte: confirmar o bloqueio de exclusão de Categoria quando a contagem de produtos vinculados é positiva. A auditoria geral permanece aberta.

### Ciclo 344 — bloqueio de exclusão de Categoria em uso — 25/10/2026

**Recorte:** estado preventivo da ação na lista e no modal de edição, revalidação no serviço e mensagem quando os vínculos diretos e N:N apontam para o mesmo produto.

#### Divergência registrada antes da correção

- [x] A contagem exibida e usada na guarda visual vem da deduplicação entre `product_categories` e `products.category_id` (Ciclo 343). O ERP também deduplica a mensagem do serviço: após as contagens `head`, lê os IDs dos dois vínculos e une os IDs em um `Set`.
- [x] `deleteMobileCategory` já mantém guarda de servidor e valida `error` em ambas as consultas de contagem, falhando fechado; porém sua mensagem soma os totais brutos de `product_categories` e `products`. Se o mesmo produto tiver as duas referências, a exclusão continua bloqueada mas a mensagem mobile pode superestimar o total mostrado na tela. A suíte atual testa os totais independentes e não esse cruzamento.
- [x] No ERP, lista e modal usam `SecureDeleteButton` realmente desabilitado quando o snapshot tem contagem positiva; no mobile, lista e modal chamam `canDeleteCategory`, exibem um `Alert` de bloqueio no toque e a operação volta a validar o estado atual no serviço. O toque com alerta é adaptação nativa; não será convertido em botão inerte.
- [x] Diferença registrada antes da correção: a regra do ERP exibe o número de Produtos distintos, portanto o app deve comunicar o mesmo total quando existe sobreposição. Plano mínimo: compartilhar a projeção pura de contagens por Categoria e reutilizá-la para deduplicar a resposta detalhada da guarda mobile, preservando o fail-closed mobile e o bloqueio preventivo da interface.
- [x] Achado adicional antes da correção do estado de falha: os serviços de contagem da lista não verificavam `pcRes.error`/`prodRes.error` e suprimiam exceções retornando `{}`. Se a API resolve a requisição com erro e dados nulos, a lista apresenta zero e libera o acionador visual; a revalidação do serviço impede a exclusão final, mas o aviso só surge depois da confirmação. O `loadData` de ambos já captura a rejeição e preserva os nós anteriores; o erro será propagado para mostrar o feedback existente em vez de comunicar uma contagem incerta como zero.

#### Correção aplicada

- [x] Extraí `countDistinctProductsByCategory` para `shared-utils/categoryProductCounts.ts`; `fetchCategoryProductCounts` e `fetchMobileCategoryProductCounts` agora usam a mesma regra para compor a contagem da tela. A guarda `deleteCategory` do ERP e `deleteMobileCategory` do app também usam essa regra para informar o total real, sem somar duas vezes o mesmo Produto encontrado em `product_categories` e `products.category_id`.
- [x] Na guarda mobile, se as contagens exatas são positivas, o serviço lê os IDs de cada origem, verifica erros dessas leituras e deduplica antes de apresentar a mensagem. Mantém o fallback para a contagem positiva inicial se os dados vierem vazios, então a nova etapa nunca converte vínculo positivo/incerto em permissão para excluir.
- [x] O ERP agora verifica os erros das consultas `head` e da leitura detalhada antes de prosseguir; isso alinha a segurança ao mobile, que já verificava os erros `head`. Falha em qualquer consulta de guarda interrompe a exclusão. Ambos os serviços de contagem da tela agora verificam `.error` e propagam a rejeição, em vez de retornar `{}` como se o total fosse zero; os hooks existentes mostram toast/Alert e só substituem os nós após as três leituras concluírem.
- [x] Preservadas as adaptações de interação: ERP mantém a ação realmente desabilitada e explica o motivo via tooltip acessível; mobile mantém o toque que apresenta `Alert` e a confirmação nativa para Categoria sem produtos. A última revalidação no serviço continua sendo a autoridade contra contagem desatualizada. Nenhum formulário, vínculo, permissão, consulta remota, migration ou UI de Conciliação foi alterado.
- [x] Arquivos de produção: `shared-utils/categoryProductCounts.ts`, `erp/src/pages/utils/categoryService.ts` e `mobile/src/features/products/services/mobileCategoryService.ts`. Cobertura: `erp/src/pages/utils/categoryProductCounts.test.ts`, `erp/src/pages/utils/__tests__/categoryDeletionRules.test.ts` e `mobile/src/features/products/categories/domain/categoryEnvironmentServices.test.ts`.

#### Validação e limites

- [x] Vitest ERP focado: **10/10** em dois arquivos (helper, bloqueio por vínculo, IDs repetidos entre fontes, falha de consultas `head`/detalhadas e propagação de erro de contagem).
- [x] Vitest mobile: **18/18** em `categoryEnvironmentServices.test.ts`, incluindo contagem de tela deduplicada, bloqueio de exclusão com referência cruzada, erro de leitura de IDs, erro de contagem, e ausência de chamadas de remoção após falha/uso. Executado pela configuração `erp/vitest.mobile.config.ts`, que aponta para `mobile/`; a configuração própria de mobile ainda falha ao resolver `vitest/config`, então não reinstalei dependências.
- [x] `git diff --check` nos arquivos do ciclo: exit code 0; apenas aviso preexistente de normalização CRLF/LF em arquivos alterados. O teste confirma a lógica mockada, não persistência real.
- [ ] Sem Playwright autenticado; abrir o Dashboard mantém o risco documentado de limpar rascunhos. Sem Android físico/Maestro; nenhuma gravação/consulta remota, migration ou deploy. Typecheck integral não executado; Expo Web não comprova comportamento nativo.
- [x] Regras e documentação consultadas antes das alterações: `AGENTS.md` (regras de formulários, testes e Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/mobile/arquitetura_offline_first.md`, inventário e roadmap. Não há `AGENTS.md` aninhado em ERP/mobile/`shared-utils`. Skill canônica `erp-web-to-mobile-replication` ausente em `.agents/skills` e `skills/`; só o backup de cache `.vercel` continua acessível como orientação.

**Conclusão do recorte:** a tela nunca trata uma leitura de contagem falha como zero; o toque de exclusão é bloqueado preventivamente quando há Produtos e a revalidação rejeita vínculo atual/resultado incerto; mensagens ERP/mobile usam contagem distinta e já não divergem quando as duas fontes repetem o mesmo ID. A confirmação/toast/Alert continuam adaptados à plataforma. Próximo recorte: conferir contagem de Categoria em falha de refresh posterior a alteração e continuidade do estado visual, sem gravar dados. A auditoria geral permanece aberta.

### Ciclo 345 — contagem preservada quando falha o refresh pós-mutação — 25/10/2026

**Recorte:** atualização de Categorias/Ambientes depois de salvar, excluir ou desvincular, quando a consulta de contagem de produtos falha.

#### Evidência da comparação

- [x] `loadData` do ERP e `loadData` mobile consultam ambientes, categorias e contagens com `Promise.all`; preparam os nós localmente e só chamam `setEnvironments`/`setCategories` depois que todas as três leituras resolvem. Como os serviços de contagem agora propagam tanto `.error` quanto exceções (Ciclo 344), falha dessa consulta não mapeia a categoria para `productCount: 0` nem substitui parcialmente as listas. Os nós anteriores e suas contagens permanecem visíveis.
- [x] Depois de uma mutação concluída, o ERP mantém o retorno de sucesso da ação e exibe também o erro genérico de atualização se o refresh falhar. No app, salvar fecha o modal após o serviço concluir; o refresh apresenta `Alert` dizendo que não foi possível carregar categorias/ambientes. Excluir/desvincular também aguardam o refresh e recebem o mesmo alerta. O alerta identifica falha de leitura, e não solicita repetir a mutação. As rotas de serviço não são chamadas novamente pelo catch de `loadData`.
- [x] As mutações da aba — criar/editar Categoria/Ambiente, excluir categoria sem produtos e desvincular Categoria — não alteram associações de Produtos existentes; portanto preservar os nós/contagens anteriores em falha não publica uma contagem parcial como nova. Se uma ação posterior tentar excluir Categoria usando um snapshot antigo, a guarda de serviço volta a consultar as relações e falha fechada em erro/incerteza, conforme Ciclo 344.
- [x] Diferença visual mantida como feedback de plataforma: o ERP usa toast não bloqueante e o app usa `Alert` nativo; ambos terminam o refresh e mantêm os dados completos anteriores. Não alterei wording nem introduzi confirmação de sucesso no app, pois o modal fecha só depois da mutação e o alerta informa especificamente que a leitura falhou.
- [x] Fontes conferidas para esta revisão: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, documentação de estrutura de produto/variação, mover/merge, offline-first, este inventário e o item de paridade na roadmap. `rg --files --hidden` não localizou `AGENTS.md` aninhado em `erp/`, `mobile/` ou `shared-utils/`. A skill canônica `erp-web-to-mobile-replication` segue ausente em `.agents/skills`, `skills/` e nas skills globais examinadas; a limitação da cópia cache já está anotada nos ciclos anteriores.

#### Validação e limites

- [x] Revisão estática do `loadData` de ambos os hooks, `fetchCategoryProductCounts`, `fetchMobileCategoryProductCounts`, do save modal mobile e das mutações pós-refresh; nenhum código de produção precisou de alteração neste recorte.
- [ ] Não executei Vitest/RTL porque não houve alteração de lógica. Sem Playwright autenticado para provocar falha visualmente (o risco de limpeza de rascunhos do Dashboard continua registrado) e sem dispositivo Android físico/Maestro; Expo Web não comprova `Alert`/`RefreshControl` nativos. Não houve consulta ou escrita remota, migration ou deploy.

**Conclusão do recorte:** a falha da contagem durante atualização não zera nem parcialmente atualiza o estado visível em ERP ou app; ambos preservam a contagem anterior e comunicam que a carga falhou. Não identifiquei divergência de regra que justifique patch. A falha das relações já havia sido comparada no Ciclo 339; o próximo recorte passa ao contrato de criação/edição de Categoria/Ambiente no app. A auditoria geral permanece aberta.

### Ciclo 346 — contrato de gravação de Categoria/Ambiente no mobile — 25/10/2026

**Recorte:** nome persistido, slug e metadados do fluxo de criação/edição na aba Categorias/Ambientes.

#### Divergências comprovadas

- [x] ERP e app já executam os schemas Zod reais antes de chamar seus serviços. Ambos deixam o campo de nome em maiúsculas na UI e transformam o valor validado; no ERP, `createCategory`/`updateCategory` e `createEnvironment`/`updateEnvironment` normalizam o valor persistido via `toTitleCase`. Antes deste ciclo, `saveMobileCategory` e `saveMobileEnvironment` apenas removiam espaços externos e persistiam o texto em caixa alta recebido do formulário.
- [x] O ERP gera um slug normalizado e único ao criar Categoria e Ambiente. O serviço mobile não enviava `slug`; a migration `supabase/migrations/20260828080000_add_category_seo_columns.sql` adiciona a coluna como texto e faz somente backfill dos registros existentes, sem declarar default. A página pública `digital-catalog/src/app/categorias/[slug]/page.tsx` procura a categoria pelo `categories.slug`, então uma categoria criada no app sem slug não podia ser localizada por esse caminho.
- [x] Ao criar Categoria, o handler ERP também envia `meta_title: "<nome validado> | Móveis Morante"`; o serviço mobile não persistia esse metadado. Ao editar, o ERP preserva o slug salvo quando o formulário não envia alteração SEO; o app seguirá preservando esse mesmo comportamento.
- [x] Não há particularidade documentada que justifique nomes persistidos em caixa alta ou omissão de slug/meta_title no app; o campo visual em caixa alta foi preservado como adaptação de interface.

#### Correção aplicada

- [x] Extraí `normalizeSlug` e `resolveUniqueSlug` para `shared-utils/uniqueSlug.ts`; `erp/src/pages/utils/uniqueSlug.ts` reexporta a implementação comum, mantendo os call sites ERP existentes, e o mobile passou a usar as mesmas regras de normalização, colisão e sufixo numérico.
- [x] Os serviços mobile agora usam `toTitleCase` compartilhado ao criar/editar Categoria e Ambiente. Ao criar, ambos gravam slug único; Categoria também recebe o mesmo `meta_title` padrão do handler ERP. Em edição, os slugs existentes continuam intocados, conforme o fluxo ERP sem edição SEO.
- [x] Os testes móveis foram ajustados para provar nome title case, slug de Ambiente, colisão com sufixo numérico de Categoria, metadado default e nome normalizado na edição. O schema/resolver e a tela não mudaram; as submissões continuam passando por `useZodForm`.
- [x] Arquivos de produção: `shared-utils/uniqueSlug.ts`, `erp/src/pages/utils/uniqueSlug.ts` e `mobile/src/features/products/services/mobileCategoryService.ts`. Cobertura: `erp/src/pages/utils/uniqueSlug.test.ts` e `mobile/src/features/products/categories/domain/categoryEnvironmentServices.test.ts`.

#### Validação e limites

- [x] Vitest ERP `uniqueSlug.test.ts`: **3/3**. Vitest mobile `categoryEnvironmentServices.test.ts`: **18/18**. Regressão ERP de persistência comercial (`productPersistenceService.test.ts` e `productDraftPersistence.test.ts`): **11/11** após mover o helper compartilhado.
- [x] `git diff --check` nos arquivos do ciclo passou; Git emitiu apenas avisos de normalização CRLF/LF em arquivos já alterados.
- [ ] Sem Playwright autenticado e sem dispositivo Android físico/Maestro; Expo Web não confirma comportamento nativo. Nenhuma Categoria/Ambiente foi gravada remotamente, nenhuma migration foi aplicada e não houve deploy. Os testes cobrem queries/payloads mockados, não persistência operacional.
- [x] Regras conferidas: `AGENTS.md` (RHF/Zod, testes permitidos e Conciliação ERP-only), `docs/geral/USER_RULES.md`, regra de Conciliação, `digital-catalog/AGENTS.md` para a leitura da rota pública, documentação de estrutura/variação, mover/merge, offline-first, inventário e roadmap. A skill `erp-web-to-mobile-replication` não foi localizada nas skills canônicas de projeto ou globais examinadas; a limitação da cópia em cache permanece registrada nos ciclos anteriores. Não há `AGENTS.md` aninhado em `erp/`, `mobile/` ou `shared-utils/`.

**Conclusão do recorte:** Categoria/Ambiente criados no app agora recebem os mesmos nomes normalizados, slugs únicos e — para Categoria — metadado default do ERP, sem mudar a UI ou a resolução de formulário. A mudança é validada por Vitest, mas a persistência remota e a rota pública não foram exercitadas. Próximo recorte: cobertura de duplicidade e falha parcial nos vínculos Categoria–Ambiente dos formulários. A auditoria geral permanece aberta.

### Ciclo 347 — vínculos de Categoria/Ambiente na criação e edição — 25/10/2026

**Recorte:** duplicidade da seleção e sequência de gravação das relações `category_relationships` / `category_attributes` no cadastro e na edição.

#### Comparação e correção

- [x] ERP e app evitam duplicação por interação normal: ambos alternam a seleção com uma guarda `includes`; o helper mobile `toggleNodeLink` e o toggle inline do ERP adicionam uma única vez e removem a seleção ao tocar novamente. A tela inicializa a seleção pelas relações existentes. A migração `20261008010903_rename_dining_category_labels_and_add_kitchen_parent.sql` também usa `ON CONFLICT (parent_id, child_id)`, evidenciando a unicidade do par persistido. A validação Zod aceita arrays de strings sem um refinamento `.unique()` nos dois clientes; chamadas de serviço com arrays artificiais repetidos podem ser rejeitadas pelo índice do banco, mas não encontrei divergência ERP/mobile que justifique normalizar apenas o app.
- [x] Divergência comprovada: ao criar Ambiente, o app gravava a linha `categories` e em seguida executava `DELETE` de relações para o ID recém-criado antes do `INSERT`; ao criar Categoria, fazia exclusões equivalentes em `category_relationships` e `category_attributes`. O ERP não apaga vínculos na criação: insere somente a linha-base e depois os vínculos selecionados. A chamada extra no app era um ponto de falha dispensável após a linha-base já estar gravada.
- [x] Ajustei `saveMobileEnvironment` e `saveMobileCategory` para executar `DELETE` somente nos caminhos de edição. Criações continuam inserindo os vínculos e atributos selecionados; edições mantêm a sequência ERP de atualizar a linha-base, excluir associações antigas e inserir as novas.
- [x] A suíte agora afirma que criação não chama os deletes e que edição ainda os executa. Acrescentei cobertura de falha de inserção de vínculo em criação de Categoria: o serviço propaga o erro sem apagar associações; o teste também deixa explícito que o registro-base já foi inserido antes da falha.

#### Limitação compartilhada e validação

- [x] Categoria e Ambiente permanecem operações multi-etapa, sem transação/RPC atômica, tanto no ERP quanto no app. Falha ao inserir relação após a inserção/edição da linha-base pode deixar cadastro parcialmente aplicado; falha após remoção na edição pode deixar a linha sem vínculos. Não alterei somente o app nem introduzi contrato/RPC diferente do ERP; uma correção atômica requer decisão e implementação conjunta.
- [x] Os dois formulários continuam submetendo pelo `useZodForm` e schemas Zod explícitos existentes; o recorte não alterou validação, UI ou payloads dos formulários.
- [x] Vitest via `erp/vitest.mobile.config.ts`: `categoryEnvironmentServices.test.ts` **19/19** e `categoryEnvironmentRules.test.ts` **19/19** (38/38). `git diff --check` aplicado aos arquivos deste ciclo passou, sem erros.
- [ ] Sem Playwright autenticado ou aparelho Android físico/Maestro nesta execução; Expo Web não prova o fluxo nativo. Nenhuma gravação remota, migration ou deploy foi feita. Os testes usam Supabase mockado e não comprovam transação/índice operacional.
- [x] Regras conferidas: `AGENTS.md` (RHF/Zod, runners e Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/mobile/arquitetura_offline_first.md`, este inventário e o item correspondente no roadmap. Não há `AGENTS.md` aninhado nos caminhos tocados. A skill `erp-web-to-mobile-replication` não foi localizada em `.agents/skills`, `skills/`, skills globais nem entre arquivos `SKILL.md` do projeto; orientação canônica indisponível, limitação já documentada nos ciclos anteriores.

**Conclusão do recorte:** a criação mobile não tenta mais excluir associações inexistentes e segue a sequência do ERP; as edições preservam o contrato já comum. Seleção por UI e unicidade persistida impedem duplicidade no caminho normal. Arrays repetidos injetados diretamente e falha parcial por ausência de transação continuam riscos comuns aos dois clientes, fora de uma correção mobile-only. A auditoria geral permanece aberta.

### Ciclo 348 — atributos técnicos obrigatórios da Categoria na edição do Produto — 25/10/2026

**Recorte:** aba técnica do formulário de Produto, com foco na precedência entre exigência da Categoria para publicação e exceção de apresentação para `Altura` em Colchões.

#### Evidência e correção

- [x] A edição carrega os campos técnicos e marca `isRequiredForCatalog` quando uma Categoria selecionada os exige. O contrato vigente mantém a exigência de publicação separada da obrigatoriedade geral do formulário; associação da Categoria não inventa valor. Para Colchões, `Altura` é normalmente ocultada e `Espessura do colchão` é a medida específica.
- [x] Divergência reproduzível por inspeção da lógica: o ERP avalia a exigência de catálogo antes da exceção visual de Colchões. O app avaliava primeiro a exceção de `Altura`, ocultando o campo mesmo quando a Categoria selecionada o exigia. Isso impedia o operador de preencher um requisito de publicação.
- [x] Extraí `isProductTechnicalAttributeRequiredByCategories` para `shared-utils/productCategoryRequiredAttributes.ts` e passei a usar o mesmo predicado no seletor técnico do ERP e do app. No app, a regra de requisito de catálogo agora precede a exceção de `Altura`; a distinção permanece: o campo aparece e recebe `isRequiredForCatalog: true`, mas não se torna `isRequired` do formulário por esse motivo.
- [x] Adicionei regressão para `Altura` exigida na categoria de colchão e controle para `Altura` sem requisito, que continua oculta. O schema Zod, a submissão, o payload de salvamento e demais regras de obrigatoriedade não foram alterados neste recorte.

#### Validação e limites

- [x] Vitest mobile: `productCharacteristics.test.ts` **27/27** e `mobileProductMutationService.test.ts` **61/61** (**88/88** no total), via configuração `erp/vitest.mobile.config.ts`.
- [x] Vitest ERP: `productCategoryRequiredAttributes.test.ts` **18/18** e `useProductTechnicalTab.test.ts` **8/8** (**26/26** no total).
- [x] `git diff --check` nos arquivos do ciclo passou; somente avisos de normalização CRLF/LF em arquivos já alterados.
- [ ] Sem Playwright autenticado e sem aparelho Android físico/Maestro nesta execução; Expo Web não comprovaria o comportamento nativo. Não consultei nem gravei dados remotos, não apliquei migration e não fiz deploy. Os testes mockados validam a projeção/regra, não o comportamento persistido no PostgreSQL.
- [x] Regras consultadas: `AGENTS.md` (RHF/Zod, validadores permitidos e Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, documentação de estrutura de produto/variação, operações de mover/merge, notas mobile e inventário/roadmap. Skill canônica `erp-web-to-mobile-replication` não encontrada nas fontes do projeto; foi usada somente a orientação acessível em cache, cuja origem canônica não foi confirmada.

**Conclusão do recorte:** quando a Categoria exige `Altura` para publicação, ERP e app agora mantêm o campo disponível; sem essa exigência, o app continua aplicando a particularidade documentada de Colchões. Próximo: seguir o valor preenchido na aba técnica até o payload de salvamento e a recarga da edição, cobrindo Produto simples e variações sem conflitar com atributos próprios. A auditoria geral permanece aberta.
