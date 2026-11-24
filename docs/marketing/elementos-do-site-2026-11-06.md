# Elementos do site — biblioteca de modelos — 06/11/2026 (atualizado em 24/11/2026)

Pedido: criar em Marketing do ERP um CRUD de modelos de imagem para o carrossel e a faixa superior do catálogo digital, com nome e arquivo, começando sem imagens predefinidas.

## Operação

Acesso: **Marketing → Elementos do site**, rota `/marketing/site-elements`, no menu desktop e no menu responsivo do ERP.

| Seção | Medida após o recorte | Arquivos |
| --- | --- | --- |
| Carrossel de imagens — desktop | 1920 × 600 px | PNG, JPG ou WebP, até 5 MB |
| Carrossel de imagens — tablet | 1200 × 600 px | PNG, JPG ou WebP, até 5 MB |
| Carrossel de imagens — mobile | 800 × 800 px | PNG, JPG ou WebP, até 5 MB |
| Barra de avisos | Texto responsivo, sem imagem | Cor do fundo e do texto, peso e tamanho da fonte; início e fim opcionais |

“Barra de avisos” (Announcement Bar) substitui o nome “Promo Bar Top”. O aviso herda a família tipográfica do site; não tem imagem nem link de redirecionamento. A altura cresce quando o texto quebra em mais linhas. O banner de salvados do catálogo já usa a proporção 1920/620.

A administração dos elementos fica no ERP. O aplicativo nativo não tem uma tela de cadastro desses elementos; a barra aparece no Catálogo Digital responsivo.

1. Abrir a seção e escolher **Novo modelo** no carrossel ou **Novo aviso** na barra de avisos.
2. Na barra, informar o **Texto do aviso**, escolher **Cor de fundo**, **Cor do texto**, **Peso da fonte** e **Tamanho da fonte**; a prévia acompanha as alterações. **Início da exibição** e **Fim da exibição** são opcionais. O fim deve ser posterior ao início. Deixe ambos vazios para não limitar a data.
3. Escolher **Salvar aviso**. Avisos novos começam **Inativos**. No cartão, ligar o interruptor para selecionar o aviso. O ERP desativa o anterior na mesma operação.
4. No carrossel, selecionar e recortar a arte em **Desktop**, **Tablet** e **Mobile**. Clicar em **Concluir** em cada recorte para gerar a respectiva prévia. **Cancelar** fecha o recorte e preserva o rascunho, inclusive a imagem anterior em uma edição.
5. Em **Editar**, alterar o aviso e seu estilo ou substituir as imagens desejadas do carrossel. No carrossel, o campo opcional **Link de destino** indica a página que abre ao clicar em qualquer versão do banner. Aceita um caminho iniciado por `/` ou uma URL HTTP ou HTTPS completa. Modelos antigos de 1920 × 620 px ainda podem ser renomeados; para atualizar a arte, confirmar as três novas versões.
6. No cartão de qualquer aviso ou modelo de carrossel, usar o interruptor **Ativo** ou **Inativo** à esquerda de **Editar**. Na barra de avisos, desligar o único aviso ativo deixa a vitrine sem aviso.
7. Em **Excluir**, confirmar a remoção. Avisos removem somente o registro. No carrossel, os arquivos são removidos depois da confirmação da exclusão do registro; falha na limpeza gera aviso.

Cada seção consulta somente o próprio tipo, em páginas fixas de 15 modelos. Não há modelos de demonstração, imagens predefinidas ou fallback de cadastros locais. Em caso de erro de consulta, a mensagem orienta a recarregar a página.

O carrossel da página inicial exibe um slide por modelo responsivo ativo, do mais recente ao mais antigo. A página oculta o carrossel quando a consulta não retorna modelos elegíveis.

A barra fica acima do cabeçalho e exibe somente o aviso ativo. Com início definido, ele aparece nos carregamentos a partir desse horário. Com fim definido, a faixa some ao vencer, inclusive em uma página que já estava aberta. Se o aviso ativo estiver fora do período, o topo fica sem faixa. Se os dois campos estiverem vazios, a faixa aparece enquanto o aviso estiver ativo.

## Arquivos e acesso

- `erp/src/pages/App/Marketing/SiteElements/index.tsx`: página, abas, prévias, estados, paginação e invalidação das consultas por usuário.
- `SiteElementFormModal.tsx` usa React Hook Form com `zodResolver` no carrossel. `AnnouncementBarFormModal.tsx` usa o mesmo fluxo RHF/Zod para texto, cores, peso/tamanho da fonte e agenda, sem campo de imagem ou destino.
- `SiteElementDeleteDialog.tsx`: confirmação RHF/Zod, proteção de efeitos duplicados, foco/teclado e erro visível.
- `siteElementService.ts`: CRUD remoto com projeção explícita, tipo/ordenação/paginação no servidor, cancelamento de leituras obsoletas, timeout e concorrência por `updated_at`.
- `shared-utils/siteElementSchemas.ts`: contratos distintos de criação/edição e exclusão, tipos, medidas e limites. SVG, arquivo vazio, acima de 5 MB e dimensões divergentes são recusados.
- `erp/src/pages/App/Marketing/Posts/FixedAspectImageCropper.tsx` fornece os três recortes do carrossel. O diálogo informa erros de leitura e mantém o cancelamento disponível durante o processamento.
- `erp/src/Router.tsx`, `components/layout/nav/menus/MarketingNavMenu.tsx`, `components/layout/hooks/useDesktopNavPermissions.ts`, `components/layout/mobileNavMenuItems.ts`, `components/layout/MobileNav.tsx`, `components/access/RolePermissionsMatrix.tsx` e `pages/utils/permissionConfig.ts`: entrada e permissão `manageSiteElements`, padrão administrador/gestor e configurável na matriz.

`public.site_element_models` guarda os modelos de carrossel com suas três versões. `public.site_element_top_bar_models` guarda o formato legado da barra por imagem. `public.site_element_announcement_bars` guarda texto, estilo, período e ativação. O ERP usa a permissão `manageSiteElements` para administrar os dois tipos. A política anônima da barra deixa passar somente o aviso ativo dentro do período. O catálogo lê texto, estilo e a data de fim dessa faixa para removê-la quando vencer. A leitura anônima do carrossel é limitada aos modelos ativos e completos. Os arquivos no bucket `products` são exclusivos do carrossel.

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
9. `supabase/migrations/20261124225621_add_site_element_announcement_bars.sql` cria a tabela textual com validações de conteúdo/estilo/agenda, ativação independente, RLS, leitura pública mínima e gatilho de `updated_at`. A tabela de imagens legada foi preservada.
10. `supabase/migrations/20261124232124_enforce_single_active_site_element_announcement.sql` limita a tabela a um aviso ativo, define novos avisos como inativos e cria o comando de troca para operadores autorizados. Libera a leitura do fim de exibição somente para a faixa que já está visível pela política pública.

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

A biblioteca do ERP lê uma página de até 15 registros com contagem no servidor. A chave React Query inclui usuário, tipo e página. A troca usa um pedido de gravação seguido da releitura da página aberta para atualizar o aviso anterior e o recém-ativado, com suas novas versões. O catálogo faz uma leitura por carregamento completo para obter até uma linha com texto, estilo e fim da exibição. O banco aplica o filtro antes da consulta retornar. Quando a faixa vence, o navegador a remove sem novo pedido. O roadmap registra os limites de medição.

### Atualização de 17/11/2026

A biblioteca permite um arquivo desktop por modelo da barra. Os campos responsivos antigos foram tornados opcionais para compatibilidade, sem remover imagens ou registros existentes. O cadastro e as prévias são somente do ERP; a busca no projeto não encontrou consumidor público de `site_element_models` no Catálogo Digital, então não houve mudança na renderização nem publicação no catálogo. A tabela estava sem modelos antes da alteração. A validação automatizada não foi executada neste ciclo.

### Atualização de 24/11/2026

O carrossel passou a abrir o recortador ao selecionar um arquivo válido. A imagem fica no navegador até **Salvar modelo**. **Concluir** gera a prévia com 1920 × 620 px. **Cancelar** descarta a seleção em andamento, mesmo durante a geração da imagem, e devolve o controle ao formulário.

Vitest/RTL aprovou 28 testes em seis arquivos. A cobertura inclui a validação pelo resolver, a saída pedida ao canvas e a preservação do rascunho ao cancelar.

Playwright com Chromium headless conferiu o fluxo autenticado em **Marketing → Elementos do site** no ERP de desenvolvimento, na porta 5173, e repetiu a prova com o formulário isolado. Uma imagem de 1200 × 900 px foi ajustada e gerou uma prévia de 1920 × 620 px. O teste também conferiu o retorno de foco ao cancelar, a rejeição de uma imagem ilegível e, no formato anterior da barra, a prévia de 2880 × 720 px. A configuração atual em texto está descrita na atualização ao fim deste documento. A persistência no Storage e no banco segue fora da validação daquele recorte.

#### Ativação de modelos do carrossel

O interruptor grava a situação do modelo com a permissão `manageSiteElements`. Modelos existentes e novos começam ativos. A lista administrativa exibe os dois estados e mantém a ordem e a página atual. Na vitrine, entram os modelos ativos e completos.

`SiteElementModelActions` executa o resolver antes do serviço. A atualização filtra pela identificação, pelo tipo carrossel e pela versão `updated_at`. O mesmo pedido retorna apenas a identificação, o estado e a nova versão para atualizar o cartão no cache. A consulta da página inclui um booleano por modelo no pedido existente. Em caso de falha, a lista do carrossel é conferida novamente.

| Verificação | Executada | Projeto/ref | Massa sintética/runId | Resultado | Limite |
| --- | --- | --- | --- | --- | --- |
| Migration e leitura de metadados | Sim | `hkoxhourxwlddgsfdgws` | Não se aplica | Coluna booleana obrigatória com padrão ativo. Política de Marketing e gatilho de versão conferidos | Verificação de schema e leitura |
| Playwright no ERP de desenvolvimento | Sim | `hkoxhourxwlddgsfdgws` | Não se aplica | Estado real exibido no interruptor à esquerda de **Editar**, também conferido na ordem de foco | Gravações de negócio bloqueadas na verificação |
| Vitest/RTL | Sim | Testes isolados | Dados simulados em memória | 32 testes aprovados, incluindo os dois sentidos da alternância, o bloqueio de clique duplicado e o tratamento de versão desatualizada | A prova de gravação remota depende de fixture autorizada |

#### Carrossel responsivo

O servidor da página inicial lê os modelos elegíveis em um pedido com projeção explícita e sem cache persistente, para que uma ativação no ERP apareça no próximo carregamento do catálogo. O `picture` seleciona a versão mobile até 767 px, tablet de 768 a 1023 px e desktop a partir de 1024 px. A primeira imagem tem prioridade de carregamento e as demais usam carregamento preguiçoso. [Seleção de imagens no padrão HTML](https://html.spec.whatwg.org/multipage/embedded-content.html#the-picture-element)

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

### Atualização de 24/11/2026 — avisos em texto

A interface antiga mantinha os novos modelos da barra presos à tabela de imagens, embora a barra solicitada use somente texto e estilos. O banco remoto confirmou que a tabela legada estava vazia. Para não apagar nem reinterpretar o formato antigo, a migration `20261124225621` criou `public.site_element_announcement_bars`; o registro de imagem legado foi preservado.

No ERP, cada aviso passou a ter texto de até 240 caracteres, cor de fundo, cor do texto, peso, tamanho, início e fim opcionais e o interruptor **Ativo/Inativo**. A fonte herda a família do catálogo. A faixa ajusta sua altura ao texto.

A migration foi revisada antes da aplicação no Supabase operacional `hkoxhourxwlddgsfdgws`. Antes, foram conferidos o histórico remoto, a ausência da nova tabela, a tabela legada vazia e as funções existentes de permissão e `updated_at`. Depois, o histórico, as colunas, a RLS, as duas policies, o índice, o trigger e a leitura com papel `anon` foram conferidos; não foram inseridas fixtures ou avisos operacionais. Nenhum teste automatizado, build, gravação pela interface ou publicação foi executado nesta atualização.

**Arquivos desta atualização:** `erp/src/pages/App/Marketing/SiteElements/AnnouncementBarFormModal.tsx`, `SiteElementFormModal.tsx`, `SiteElementModelActions.tsx`, `SiteElementDeleteDialog.tsx`, `SiteElementDeleteDialog.test.tsx`, `siteElementService.ts`, `siteElementService.test.ts`, `index.tsx`, `index.test.tsx`, `siteElementSchemas.test.ts`, `shared-utils/schemas/siteElementSchemas.ts`, `digital-catalog/src/features/announcement-bar/server.tsx`, `digital-catalog/src/app/layout.tsx`, `digital-catalog/src/components/layout/site-chrome.tsx` e `supabase/migrations/20261124225621_add_site_element_announcement_bars.sql`.

### Atualização de 24/11/2026 — somente um aviso ativo

O interruptor delega a troca à função `set_site_element_announcement_activation`, que confere a permissão de Marketing e a versão do cartão antes de alterar o aviso anterior. Um índice único parcial também impede dois registros ativos em gravações diretas. A migration preservou o único aviso ativo já cadastrado, que estava sem datas e dentro das condições de leitura pública.

| Verificação | Executada | Projeto ou ambiente | Massa | Resultado e limite |
| --- | --- | --- | --- | --- |
| Histórico, índice único, padrão inativo, permissões e projeção pública | Sim | `hkoxhourxwlddgsfdgws` | Aviso existente, somente leitura | Índice válido, função restrita e um aviso elegível retornado para `anon`. Troca gravável em banco operacional pendente por falta de fixture autorizada. |
| Vitest e RTL | Sim | Local | Respostas em memória | 35 testes do ERP e 3 do catálogo aprovados. Cobertura da troca dos interruptores, comando com versão, criação inativa, limite de uma faixa e expiração em página aberta. |
| Playwright com Chromium headless | Sim | ERP em `localhost:5173` e catálogo em `localhost:3001` | Aviso existente em leitura e respostas de troca simuladas no navegador | ERP abriu a lista e o editor e conferiu os dois interruptores após a resposta simulada. Catálogo mostrou uma faixa acima do cabeçalho em 1366 e 393 px. |
| Consulta ao catálogo publicado | Sim | `www.moveismorante.com.br` | Acesso público | O domínio consultado ainda não apresentava a faixa. |

A suíte geral dos formulários do catálogo apresentou 18 falhas fora da barra de avisos. As mesmas falhas reapareceram com a configuração anterior do Vitest e sem o teste novo. O TypeScript do catálogo passou. O TypeScript do ERP ainda aponta erros fora do módulo de Elementos do site.
