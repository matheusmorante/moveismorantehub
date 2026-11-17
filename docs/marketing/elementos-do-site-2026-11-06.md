# Elementos do site — biblioteca de modelos — 06/11/2026 (atualizado em 17/11/2026)

Pedido: criar em Marketing do ERP um CRUD de modelos de imagem para o carrossel e a faixa superior do catálogo digital, com nome e arquivo, começando sem imagens predefinidas.

## Operação

Acesso: **Marketing → Elementos do site**, rota `/marketing/site-elements`, no menu desktop e no menu responsivo do ERP.

| Seção | Medida padrão | Arquivos |
| --- | --- | --- |
| Carrossel de imagens | 1920 × 620 px | PNG, JPG ou WebP, até 5 MB |
| Barra de destaque do topo — celular | 900 × 600 px (3:2) | PNG, JPG ou WebP, até 5 MB |
| Barra de destaque do topo — tablet | 1600 × 600 px (8:3) | PNG, JPG ou WebP, até 5 MB |
| Barra de destaque do topo — desktop | 2880 × 720 px (4:1) | PNG, JPG ou WebP, até 5 MB |

“Barra de destaque do topo” substitui o nome “Promo Bar Top”. O banner de salvados do catálogo já usa a proporção 1920/620; a altura de 80 px padroniza a faixa superior deste cadastro.

1. Abrir a seção e escolher **Novo modelo** ou **Adicionar primeiro modelo**.
2. Informar **Nome do modelo**. Para o carrossel, selecionar a imagem no tamanho indicado. Para a barra de destaque, selecionar uma imagem em cada proporção; o recortador ajusta cada arquivo ao formato escolhido e mostra as três prévias.
3. Escolher **Salvar modelo**. Um novo cadastro aparece na primeira página da seção.
4. Em **Editar**, alterar o nome e/ou selecionar outro arquivo; manter a imagem atual permite apenas renomear.
5. Em **Excluir**, confirmar a remoção. O arquivo é removido depois da confirmação da exclusão do registro. Falha na limpeza do arquivo gera aviso específico.

Cada seção consulta somente o próprio tipo, em páginas fixas de 15 modelos. Não há modelos de demonstração, imagens predefinidas ou fallback de cadastros locais. Erro de consulta tem mensagem e ação para atualizar; não aparece como biblioteca vazia.

Este trabalho cria a biblioteca solicitada. Cadastrar um modelo não o publica automaticamente no catálogo digital; seleção, ordenação e publicação no site não integram este escopo.

## Arquivos e acesso

- `erp/src/pages/App/Marketing/SiteElements/index.tsx`: página, abas, prévias, estados, paginação e invalidação das consultas por usuário.
- `SiteElementFormModal.tsx`: React Hook Form + `zodResolver`, valores parseados, conferência de arquivo/dimensões, prazo de leitura, foco/teclado e feedback de salvamento.
- `SiteElementDeleteDialog.tsx`: confirmação RHF/Zod, proteção de efeitos duplicados, foco/teclado e erro visível.
- `siteElementService.ts`: CRUD remoto com projeção explícita, tipo/ordenação/paginação no servidor, cancelamento de leituras obsoletas, timeout e concorrência por `updated_at`.
- `shared-utils/siteElementSchemas.ts`: contratos distintos de criação/edição e exclusão, tipos, medidas e limites. SVG, arquivo vazio, acima de 5 MB e dimensões divergentes são recusados.
- `erp/src/pages/App/Marketing/Posts/FixedAspectImageCropper.tsx`: recortador reutilizado com dimensões de saída configuráveis; os recortes da barra são gerados em WebP nas medidas exatas de cada breakpoint.
- `erp/src/Router.tsx`, `components/layout/nav/menus/MarketingNavMenu.tsx`, `components/layout/hooks/useDesktopNavPermissions.ts`, `components/layout/mobileNavMenuItems.ts`, `components/layout/MobileNav.tsx`, `components/access/RolePermissionsMatrix.tsx` e `pages/utils/permissionConfig.ts`: entrada e permissão `manageSiteElements`, padrão administrador/gestor e configurável na matriz.

`public.site_element_models` continua guardando os modelos de carrossel. `public.site_element_top_bar_models` guarda cada modelo da barra com os três caminhos e metadados das imagens. As tabelas usam RLS e a permissão existente `manageSiteElements`; não há acesso anônimo. Os arquivos usam o bucket público `products` existente, em `site-elements/<tipo>/<id>/<uuid>.<extensão>`; as políticas de Storage não foram ampliadas.

A imagem nova é enviada antes da gravação do registro; a antiga só é removida após confirmação de substituição/exclusão. Resposta de banco incerta preserva o novo arquivo, pois o servidor pode já tê-lo referenciado. Recusa conhecida ou conflito confirmado permite limpar somente o arquivo recém-enviado. Não há transação PostgreSQL aberta durante upload.

## Migrations aplicadas e conferidas

Projeto operacional: `hkoxhourxwlddgsfdgws`, schema `public`.

1. `supabase/migrations/20261106201903_create_site_element_models.sql`: tabela, constraints, permissão, RLS e trigger de `updated_at`.
2. `supabase/migrations/20261106201956_restrict_site_element_model_grants.sql`: restringe os privilégios padrão da tabela nova ao CRUD; revoga `TRUNCATE`, `REFERENCES` e `TRIGGER` de `authenticated`.
3. `supabase/migrations/20261106205039_replace_site_element_models_path_constraint.sql`: corrige a constraint do caminho da imagem. A consulta de pré-validação encontrou que a expressão regular da primeira migration rejeitava um caminho UUID `.png` no formato que o serviço envia. A correção troca a tabela vazia sob lock, mantém a antiga como `site_element_models_legacy_path_check` sem privilégios para `PUBLIC`, `anon` ou `authenticated`, e cria a tabela ativa com validação de escopo, UUID, extensão e MIME. A retenção da tabela antiga evita `DROP`, proibido pelas regras do repositório.
4. `supabase/migrations/20261117141017_add_responsive_site_element_images.sql`: cria a tabela de barra responsiva, exige desktop 2880 × 720, celular 900 × 600 e tablet 1600 × 600, valida escopo do caminho, extensão/MIME, tamanho e mantém o mesmo controle de RLS. A tabela antiga não foi alterada.

Na atualização de 17/11/2026, o histórico remoto confirmou a migration `20261117141017`; a tabela nova foi conferida com RLS ativo, acesso de leitura para `authenticated`, sem acesso de leitura para `anon`, sem privilégio de `TRUNCATE` e sem registros criados. A biblioteca não publica nem seleciona esses modelos no catálogo.

SQL revisado integralmente, histórico remoto/precondições consultados e aplicação pelo conector autenticado. As três versões locais correspondem ao histórico remoto. Antes da correção, foi confirmado que a tabela estava vazia e não tinha chaves estrangeiras relacionadas. Conferência posterior: zero linhas na tabela ativa, RLS ativo, política por permissão, somente SELECT/INSERT/UPDATE/DELETE para `authenticated`, tabela legada sem privilégios e caminho de imagem gerado pelo serviço aceito pela constraint. Nenhuma fixture, imagem ou registro operacional foi criado.

## Evidências e limites

Comando: `npm run test:unit --prefix erp -- src/pages/App/Marketing/SiteElements/ src/components/layout/hooks/__tests__/useDesktopNavPermissions.test.ts`.

| Teste | Executado | Projeto/ref | Massa sintética/runId | Resultado | Limitação |
| --- | --- | --- | --- | --- | --- |
| Vitest/RTL: schemas, serviço, formulário, exclusão, listagem/abas e navegação | Sim | Sem escrita remota | Valores unitários em memória | 24 testes em 6 arquivos passaram | Mocks não comprovam persistência ou RLS PostgreSQL |
| Inspeção de histórico, schema, constraints, RLS, grants e contagem | Sim, somente leitura | `hkoxhourxwlddgsfdgws` | Não se aplica | Três migrations presentes; zero modelos; caminho padrão aceito; política/grants conferidos; tabela antiga sem grants | CRUD/Storage graváveis não exercitados: sem fixture autorizada |
| ERP completo em Playwright visível | Tentado | Vite `localhost:5173`, `strictPort`; remoto operacional configurado | Nenhuma fixture | Erro de importação antes de renderizar a aplicação | `productMetaCatalogSync.ts` importa `fetchActiveCampaignLabelIndex`, removido em alteração local de `metaCatalogDataService.ts`; estes arquivos não foram modificados neste trabalho |
| Build ERP | Sim | Local | Não se aplica | 6.231 módulos transformados; falha na mesma exportação ausente | Bundle completo não aprovado |
| TypeScript global | Sim | Local | Não se aplica | 501 diagnósticos; nenhum nos arquivos novos do módulo | Diagnósticos externos incluem `UserProfile` ausente e casing `NewSaleOrder/newSaleOrder` |
| ESLint | Tentado | Local | Não se aplica | Processo não inicia: `ERR_PACKAGE_PATH_NOT_EXPORTED` em `zod-validation-error/v4` | Dependências/configuração globais não foram alteradas |

O app nativo não possui módulo correspondente de Marketing/Elementos do site nos caminhos de navegação/features conferidos. Este trabalho incluiu o acesso responsivo do próprio ERP. Sem publicação de ERP, catálogo ou OTA.

## Consumo

Uma leitura REST traz somente os campos usados por até 15 modelos do tipo selecionado, junto da contagem. A query tem cancelamento e chave por usuário/tipo/página. Não há leitura integral de candidatos, filtro remoto no cliente, assinatura Realtime ou consulta por cartão. As três prévias da barra usam carregamento lazy e caminhos imutáveis/cache de um ano. Cada recorte responsivo mantém a dimensão exata e reduz a qualidade WebP progressivamente se necessário para ficar abaixo de 5 MB; se ainda exceder o limite, o recorte é rejeitado. O recortador antigo continua usando o limite de 0,8 MB. Não há baseline, amostragem de bytes/latência ou medição de egress faturável. Escritas e limpeza ocorrem somente por ação do operador. Cobertura registrada no roadmap cumulativo de consumo.

### Atualização de 17/11/2026

A biblioteca agora grava três arquivos por modelo de barra e recorta cada imagem ao formato de celular, tablet ou desktop. O cadastro e as prévias são somente do ERP; a busca no projeto não encontrou consumidor público de `site_element_models` no Catálogo Digital, então não houve mudança na renderização nem publicação no catálogo. A migration foi aplicada ao projeto operacional vazio para os modelos, sem fixture ou upload de imagem. A suíte de testes não foi executada neste ciclo.
