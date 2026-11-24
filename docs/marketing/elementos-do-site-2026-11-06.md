# Elementos do site — biblioteca de modelos — 06/11/2026 (atualizado em 24/11/2026)

Pedido: criar em Marketing do ERP um CRUD de modelos de imagem para o carrossel e a faixa superior do catálogo digital, com nome e arquivo, começando sem imagens predefinidas.

## Operação

Acesso: **Marketing → Elementos do site**, rota `/marketing/site-elements`, no menu desktop e no menu responsivo do ERP.

| Seção | Medida após o recorte | Arquivos |
| --- | --- | --- |
| Carrossel de imagens — desktop | 1920 × 600 px | PNG, JPG ou WebP, até 5 MB |
| Carrossel de imagens — tablet | 1200 × 600 px | PNG, JPG ou WebP, até 5 MB |
| Carrossel de imagens — mobile | 800 × 800 px | PNG, JPG ou WebP, até 5 MB |
| Barra de destaque do topo — desktop | 2880 × 720 px (4:1) | Uma imagem PNG, JPG ou WebP, até 5 MB |

“Barra de destaque do topo” substitui o nome “Promo Bar Top”. O banner de salvados do catálogo já usa a proporção 1920/620.

1. Abrir a seção e escolher **Novo modelo** ou **Adicionar primeiro modelo**.
2. Informar **Nome do modelo**. No carrossel, selecionar e recortar a arte em **Desktop**, **Tablet** e **Mobile**. Clicar em **Concluir** em cada recorte para gerar a respectiva prévia. **Cancelar** fecha o recorte e preserva o rascunho, inclusive a imagem anterior em uma edição. Na barra de destaque, ajustar a imagem desktop de 2880 × 720 px e clicar em **Aplicar recorte**.
3. Escolher **Salvar modelo**. Um novo cadastro aparece na primeira página da seção.
4. Em **Editar**, alterar o nome ou substituir as imagens desejadas. No carrossel, o campo opcional **Link de destino** indica a página que abre ao clicar em qualquer versão do banner. Aceita um caminho iniciado por `/` ou uma URL HTTP ou HTTPS completa. Modelos de 1920 × 620 px ainda podem ser renomeados. Para atualizar a arte de um modelo antigo, confirmar as três novas versões.
5. No carrossel, usar o interruptor **Ativo** ou **Inativo** à esquerda de **Editar**. A vitrine seleciona os modelos ativos com as três imagens. O cartão inativo permanece na biblioteca para reativação.
6. Em **Excluir**, confirmar a remoção. Os arquivos são removidos depois da confirmação da exclusão do registro. Falha na limpeza gera aviso.

Cada seção consulta somente o próprio tipo, em páginas fixas de 15 modelos. Não há modelos de demonstração, imagens predefinidas ou fallback de cadastros locais. Em caso de erro de consulta, a mensagem orienta a recarregar a página.

O carrossel da página inicial exibe um slide por modelo responsivo ativo, do mais recente ao mais antigo. A página oculta o carrossel quando a consulta não retorna modelos elegíveis.

## Arquivos e acesso

- `erp/src/pages/App/Marketing/SiteElements/index.tsx`: página, abas, prévias, estados, paginação e invalidação das consultas por usuário.
- `SiteElementFormModal.tsx` usa React Hook Form com `zodResolver`. O formulário só recebe a nova imagem após a confirmação do recorte e valida o arquivo e as medidas de saída antes de salvar.
- `SiteElementDeleteDialog.tsx`: confirmação RHF/Zod, proteção de efeitos duplicados, foco/teclado e erro visível.
- `siteElementService.ts`: CRUD remoto com projeção explícita, tipo/ordenação/paginação no servidor, cancelamento de leituras obsoletas, timeout e concorrência por `updated_at`.
- `shared-utils/siteElementSchemas.ts`: contratos distintos de criação/edição e exclusão, tipos, medidas e limites. SVG, arquivo vazio, acima de 5 MB e dimensões divergentes são recusados.
- `erp/src/pages/App/Marketing/Posts/FixedAspectImageCropper.tsx` fornece os três recortes do carrossel e o de 2880 × 720 px da barra desktop. O diálogo informa erros de leitura e mantém o cancelamento disponível durante o processamento.
- `erp/src/Router.tsx`, `components/layout/nav/menus/MarketingNavMenu.tsx`, `components/layout/hooks/useDesktopNavPermissions.ts`, `components/layout/mobileNavMenuItems.ts`, `components/layout/MobileNav.tsx`, `components/access/RolePermissionsMatrix.tsx` e `pages/utils/permissionConfig.ts`: entrada e permissão `manageSiteElements`, padrão administrador/gestor e configurável na matriz.

`public.site_element_models` guarda os modelos de carrossel com suas três versões. `public.site_element_top_bar_models` guarda a imagem desktop de cada modelo da barra. Os campos de celular e tablet da barra servem à compatibilidade com registros legados. O ERP usa a permissão `manageSiteElements` para administrar os dois tipos. A leitura anônima do carrossel se limita às colunas públicas e aos modelos ativos e completos. Os arquivos usam o bucket `products` em `site-elements/<tipo>/<id>/<uuid>.<extensão>`.

A imagem nova é enviada antes da gravação do registro; a antiga só é removida após confirmação de substituição/exclusão. Resposta de banco incerta preserva o novo arquivo, pois o servidor pode já tê-lo referenciado. Recusa conhecida ou conflito confirmado permite limpar somente o arquivo recém-enviado. Não há transação PostgreSQL aberta durante upload.

## Migrations aplicadas e conferidas

Projeto operacional: `hkoxhourxwlddgsfdgws`, schema `public`.

1. `supabase/migrations/20261106201903_create_site_element_models.sql`: tabela, constraints, permissão, RLS e trigger de `updated_at`.
2. `supabase/migrations/20261106201956_restrict_site_element_model_grants.sql`: restringe os privilégios padrão da tabela nova ao CRUD; revoga `TRUNCATE`, `REFERENCES` e `TRIGGER` de `authenticated`.
3. `supabase/migrations/20261106205039_replace_site_element_models_path_constraint.sql`: corrige a constraint do caminho da imagem. A consulta de pré-validação encontrou que a expressão regular da primeira migration rejeitava um caminho UUID `.png` no formato que o serviço envia. A correção troca a tabela vazia sob lock, mantém a antiga como `site_element_models_legacy_path_check` sem privilégios para `PUBLIC`, `anon` ou `authenticated`, e cria a tabela ativa com validação de escopo, UUID, extensão e MIME. A retenção da tabela antiga evita `DROP`, proibido pelas regras do repositório.
4. `supabase/migrations/20261117141017_add_responsive_site_element_images.sql`: cria a tabela de barra, exige desktop 2880 × 720, valida escopo do caminho, extensão/MIME, tamanho e mantém o mesmo controle de RLS. A tabela antiga não foi alterada.
5. `supabase/migrations/20261118204517_site_element_top_bar_desktop_only.sql`: torna opcionais os campos legados de celular/tablet para permitir modelos novos com apenas uma imagem desktop; preserva esses campos em modelos antigos.
6. `supabase/migrations/20261124193425_add_site_element_carousel_activation.sql` adiciona o estado obrigatório `active` com valor inicial verdadeiro na tabela do carrossel. O histórico remoto e a leitura posterior confirmaram a migration, o valor inicial dos modelos existentes, a política de Marketing e o gatilho de versão.
7. `supabase/migrations/20261124200239_add_responsive_site_element_carousel_assets.sql` guarda as versões de tablet e mobile e permite desktop de 1920 × 600 px junto das duas versões. A migration mantém os registros de 1920 × 620 px e a política de Marketing. A leitura anônima alcança apenas modelos ativos completos e os campos usados para mostrar e ordenar os banners.
8. `supabase/migrations/20261124202814_add_site_element_carousel_link_url.sql` permite guardar o destino opcional e inclui a coluna na projeção pública já limitada aos carrosséis ativos e completos.

Na atualização de 17/11/2026, o histórico remoto confirmou a migration `20261117141017`; a tabela nova foi conferida com RLS ativo, acesso de leitura para `authenticated`, sem acesso de leitura para `anon`, sem privilégio de `TRUNCATE` e sem registros criados. Em 18/11/2026, antes da migration seguinte, o histórico confirmou a migration `20261117141017` aplicada, o ref local correspondeu ao projeto operacional e a tabela continuava vazia. A biblioteca não publica nem seleciona esses modelos no catálogo.

SQL revisado integralmente, histórico remoto/precondições consultados e aplicação pelo conector autenticado. A migration `20261118204517` foi aplicada após confirmar que o ref local e o projeto operacional coincidem. A tabela estava vazia antes da alteração; as doze colunas legadas de celular/tablet agora aceitam `NULL`, sem remover registros nem arquivos. Nenhuma fixture, imagem ou registro operacional foi criado.

## Evidências e limites

Comando: `npm run test:unit --prefix erp -- src/pages/App/Marketing/SiteElements/ src/components/layout/hooks/__tests__/useDesktopNavPermissions.test.ts`.

| Teste | Executado | Projeto/ref | Massa sintética/runId | Resultado | Limitação |
| --- | --- | --- | --- | --- | --- |
| Vitest/RTL: schemas, serviço, formulário, exclusão, listagem/abas e navegação | Sim | Sem escrita remota | Valores unitários em memória | 24 testes em 6 arquivos passaram | Mocks não comprovam persistência ou RLS PostgreSQL |
| Inspeção de histórico, schema, constraints, RLS, grants e contagem | Sim, somente leitura | `hkoxhourxwlddgsfdgws` | Não se aplica | Cinco migrations presentes; zero modelos antes da migration de compatibilidade; colunas legadas de celular/tablet nullable | CRUD/Storage graváveis não exercitados: sem fixture autorizada |
| ERP completo em Playwright visível | Tentado | Vite `localhost:5173`, `strictPort`; remoto operacional configurado | Nenhuma fixture | Erro de importação antes de renderizar a aplicação | `productMetaCatalogSync.ts` importa `fetchActiveCampaignLabelIndex`, removido em alteração local de `metaCatalogDataService.ts`; estes arquivos não foram modificados neste trabalho |
| Build ERP | Sim | Local | Não se aplica | 6.231 módulos transformados; falha na mesma exportação ausente | Bundle completo não aprovado |
| TypeScript global | Sim | Local | Não se aplica | 501 diagnósticos; nenhum nos arquivos novos do módulo | Diagnósticos externos incluem `UserProfile` ausente e casing `NewSaleOrder/newSaleOrder` |
| ESLint | Tentado | Local | Não se aplica | Processo não inicia: `ERR_PACKAGE_PATH_NOT_EXPORTED` em `zod-validation-error/v4` | Dependências/configuração globais não foram alteradas |

O cadastro de Marketing → Elementos do site fica no ERP. A página inicial do Catálogo Digital usa as versões da biblioteca depois que o modelo está ativo e completo.

## Consumo

Uma leitura REST traz somente os campos usados por até 15 modelos do tipo selecionado, junto da contagem. A query tem cancelamento e chave por usuário/tipo/página. Não há leitura integral de candidatos, filtro remoto no cliente, assinatura Realtime ou consulta por cartão. A barra agora gera uma única prévia desktop e faz um upload por modelo, em vez de três uploads e três prévias. Não há baseline, amostragem de bytes/latência ou medição de egress faturável. Escritas e limpeza ocorrem somente por ação do operador. Cobertura registrada no roadmap cumulativo de consumo.

### Atualização de 17/11/2026

A biblioteca permite um arquivo desktop por modelo da barra. Os campos responsivos antigos foram tornados opcionais para compatibilidade, sem remover imagens ou registros existentes. O cadastro e as prévias são somente do ERP; a busca no projeto não encontrou consumidor público de `site_element_models` no Catálogo Digital, então não houve mudança na renderização nem publicação no catálogo. A tabela estava sem modelos antes da alteração. A validação automatizada não foi executada neste ciclo.

### Atualização de 24/11/2026

O carrossel passou a abrir o recortador ao selecionar um arquivo válido. A imagem fica no navegador até **Salvar modelo**. **Concluir** gera a prévia com 1920 × 620 px. **Cancelar** descarta a seleção em andamento, mesmo durante a geração da imagem, e devolve o controle ao formulário.

Vitest/RTL aprovou 28 testes em seis arquivos. A cobertura inclui a validação pelo resolver, a saída pedida ao canvas e a preservação do rascunho ao cancelar.

Playwright com Chromium headless conferiu o fluxo autenticado em **Marketing → Elementos do site** no ERP de desenvolvimento, na porta 5173, e repetiu a prova com o formulário isolado. Uma imagem de 1200 × 900 px foi ajustada e gerou uma prévia de 1920 × 620 px. O teste também conferiu o retorno de foco ao cancelar, a rejeição de uma imagem ilegível e a prévia de 2880 × 720 px da barra de destaque. A persistência no Storage e no banco segue fora da validação deste recorte.

#### Ativação de modelos do carrossel

O interruptor grava a situação do modelo com a permissão `manageSiteElements`. Modelos existentes e novos começam ativos. A lista administrativa exibe os dois estados e mantém a ordem e a página atual. Na vitrine, entram os modelos ativos e completos.

`SiteElementModelActions` executa o resolver antes do serviço. A atualização filtra pela identificação, pelo tipo carrossel e pela versão `updated_at`. O mesmo pedido retorna apenas a identificação, o estado e a nova versão para atualizar o cartão no cache. A consulta da página inclui um booleano por modelo no pedido existente. Em caso de falha, a lista do carrossel é conferida novamente.

| Verificação | Executada | Projeto/ref | Massa sintética/runId | Resultado | Limite |
| --- | --- | --- | --- | --- | --- |
| Migration e leitura de metadados | Sim | `hkoxhourxwlddgsfdgws` | Não se aplica | Coluna booleana obrigatória com padrão ativo. Política de Marketing e gatilho de versão conferidos | Verificação de schema e leitura |
| Playwright no ERP de desenvolvimento | Sim | `hkoxhourxwlddgsfdgws` | Não se aplica | Estado real exibido no interruptor à esquerda de **Editar**, também conferido na ordem de foco | Gravações de negócio bloqueadas na verificação |
| Vitest/RTL | Sim | Testes isolados | Dados simulados em memória | 32 testes aprovados, incluindo os dois sentidos da alternância, o bloqueio de clique duplicado e o tratamento de versão desatualizada | A prova de gravação remota depende de fixture autorizada |

#### Carrossel responsivo

O servidor da página inicial lê os modelos elegíveis em um pedido com projeção explícita e revalidação de 60 segundos. O `picture` seleciona a versão mobile até 767 px, tablet de 768 a 1023 px e desktop a partir de 1024 px. A primeira imagem tem prioridade de carregamento e as demais usam carregamento preguiçoso. [Seleção de imagens no padrão HTML](https://html.spec.whatwg.org/multipage/embedded-content.html#the-picture-element)

O recortador gera WebP quando o navegador oferece codificação nesse formato. A compressão tenta chegar a 300 KB no desktop, 200 KB no tablet e 150 KB no mobile. Os valores são metas de compressão. O limite aceito pelo cadastro é de 5 MB por arquivo.

A lista administrativa consulta os caminhos e nomes usados pelo cartão e pelo editor em um único pedido por página. O cartão carrega a prévia desktop. O editor carrega as outras versões ao abrir. O salvamento envia somente as imagens alteradas, grava o conjunto em uma atualização com controle de versão e limpa os arquivos substituídos após a confirmação. Se um envio falhar no meio do processo, limpa os arquivos novos já confirmados e preserva o modelo anterior.

| Verificação | Executada | Projeto/ref | Massa sintética/runId | Resultado | Limite |
| --- | --- | --- | --- | --- | --- |
| Migration e metadados | Sim | `hkoxhourxwlddgsfdgws` | Não se aplica | Registro legado preservado. Constraints e projeção pública conferidas | Verificação de schema e leitura |
| Vitest/RTL | Sim | Testes isolados | Dados em memória | 33 testes aprovados, incluindo três recortes, compatibilidade com o cadastro legado e falha parcial de upload | Gravação remota depende de fixture autorizada |
| Playwright no ERP de desenvolvimento | Sim | `hkoxhourxwlddgsfdgws` | Imagens em memória | Recortes reais nas três medidas. O formulário bloqueou salvar enquanto faltavam arquivos. O cadastro legado abriu para edição | Escritas bloqueadas durante a prova |
| Playwright no Catálogo Digital de desenvolvimento | Sim | `hkoxhourxwlddgsfdgws` para a leitura pública | Banners em memória para os breakpoints | Seleção de mobile a 767 px, tablet a 768 e 1023 px e desktop a 1024 px. Prioridade da primeira imagem e carregamento preguiçoso da segunda conferidos. Página inicial real exibiu Salvados enquanto o carrossel público estava vazio | Nenhum modelo completo foi gravado para teste |

#### Link de destino do carrossel

O destino é único para as três versões da imagem. O formulário valida o endereço antes de salvar. O Catálogo Digital usa esse valor no link que envolve o banner e mantém a renderização da imagem quando o campo está vazio. A consulta pública inclui o destino na mesma leitura de metadados já usada pelo slider.

O destino **/?type=salvados#produtos** foi salvo pela interface do ERP no modelo de Salvados identificado pelas três imagens da captura. A leitura posterior confirmou o endereço e as imagens do modelo ativo. O destino aplica o filtro de Salvados e posiciona a janela na seção de produtos.

#### Slides da página inicial

Na página inicial, cada modelo ativo e completo alimenta um slide. Cada slide exibe a imagem selecionada pelo breakpoint e usa o destino cadastrado. O carrossel oculta as setas quando há apenas um slide e fica oculto quando a lista está vazia. A seção de vantagens e a lista de produtos continuam disponíveis no início do catálogo.

Vitest/RTL aprovou 36 testes, incluindo a pré-carga e o salvamento do link, o bloqueio de endereços inválidos e a remoção do destino ao esvaziar o campo. O Playwright clicou no banner real de Salvados no catálogo de desenvolvimento e encontrou a lista filtrada na seção de produtos. Com uma lista vazia simulada, a página exibiu vantagens e produtos com o carrossel oculto. Com dois modelos simulados, exibiu dois slides e selecionou mobile, tablet e desktop nos pontos de corte.
