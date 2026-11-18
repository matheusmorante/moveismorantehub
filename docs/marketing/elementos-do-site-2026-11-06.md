# Elementos do site — biblioteca de modelos — 06/11/2026 (atualizado em 18/11/2026)

Pedido: criar em Marketing do ERP um CRUD de modelos de imagem para o carrossel e a faixa superior do catálogo digital, com nome e arquivo, começando sem imagens predefinidas.

## Operação

Acesso: **Marketing → Elementos do site**, rota `/marketing/site-elements`, no menu desktop e no menu responsivo do ERP.

| Seção | Medida padrão | Arquivos |
| --- | --- | --- |
| Carrossel de imagens | 1920 × 620 px | PNG, JPG ou WebP, até 5 MB |
| Barra de destaque do topo — desktop | 2880 × 720 px (4:1) | Uma imagem PNG, JPG ou WebP, até 5 MB |

“Barra de destaque do topo” substitui o nome “Promo Bar Top”. O banner de salvados do catálogo já usa a proporção 1920/620; a altura de 80 px padroniza a faixa superior deste cadastro.

1. Abrir a seção e escolher **Novo modelo** ou **Adicionar primeiro modelo**.
2. Informar **Nome do modelo**. Para o carrossel, selecionar a imagem no tamanho indicado. Para a barra de destaque, selecionar uma imagem desktop; o recortador ajusta para 2880 × 720 px.
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
- `erp/src/pages/App/Marketing/Posts/FixedAspectImageCropper.tsx`: recortador reutilizado para a imagem desktop de 2880 × 720 px.
- `erp/src/Router.tsx`, `components/layout/nav/menus/MarketingNavMenu.tsx`, `components/layout/hooks/useDesktopNavPermissions.ts`, `components/layout/mobileNavMenuItems.ts`, `components/layout/MobileNav.tsx`, `components/access/RolePermissionsMatrix.tsx` e `pages/utils/permissionConfig.ts`: entrada e permissão `manageSiteElements`, padrão administrador/gestor e configurável na matriz.

`public.site_element_models` continua guardando os modelos de carrossel. `public.site_element_top_bar_models` guarda a imagem desktop de cada modelo da barra; os campos de celular e tablet permanecem opcionais apenas para compatibilidade com registros legados. O formulário do ERP aceita somente uma imagem desktop. As tabelas usam RLS e a permissão existente `manageSiteElements`; não há acesso anônimo. Os arquivos usam o bucket público `products` existente, em `site-elements/<tipo>/<id>/<uuid>.<extensão>`; as políticas de Storage não foram ampliadas.

A imagem nova é enviada antes da gravação do registro; a antiga só é removida após confirmação de substituição/exclusão. Resposta de banco incerta preserva o novo arquivo, pois o servidor pode já tê-lo referenciado. Recusa conhecida ou conflito confirmado permite limpar somente o arquivo recém-enviado. Não há transação PostgreSQL aberta durante upload.

## Migrations aplicadas e conferidas

Projeto operacional: `hkoxhourxwlddgsfdgws`, schema `public`.

1. `supabase/migrations/20261106201903_create_site_element_models.sql`: tabela, constraints, permissão, RLS e trigger de `updated_at`.
2. `supabase/migrations/20261106201956_restrict_site_element_model_grants.sql`: restringe os privilégios padrão da tabela nova ao CRUD; revoga `TRUNCATE`, `REFERENCES` e `TRIGGER` de `authenticated`.
3. `supabase/migrations/20261106205039_replace_site_element_models_path_constraint.sql`: corrige a constraint do caminho da imagem. A consulta de pré-validação encontrou que a expressão regular da primeira migration rejeitava um caminho UUID `.png` no formato que o serviço envia. A correção troca a tabela vazia sob lock, mantém a antiga como `site_element_models_legacy_path_check` sem privilégios para `PUBLIC`, `anon` ou `authenticated`, e cria a tabela ativa com validação de escopo, UUID, extensão e MIME. A retenção da tabela antiga evita `DROP`, proibido pelas regras do repositório.
4. `supabase/migrations/20261117141017_add_responsive_site_element_images.sql`: cria a tabela de barra, exige desktop 2880 × 720, valida escopo do caminho, extensão/MIME, tamanho e mantém o mesmo controle de RLS. A tabela antiga não foi alterada.
5. `supabase/migrations/20261118204517_site_element_top_bar_desktop_only.sql`: torna opcionais os campos legados de celular/tablet para permitir modelos novos com apenas uma imagem desktop; preserva esses campos em modelos antigos.

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

O app nativo não possui módulo correspondente de Marketing/Elementos do site nos caminhos de navegação/features conferidos. A busca no Catálogo Digital também não encontrou um consumidor público desses modelos; portanto o cadastro limita-se ao formato desktop, sem alterar a renderização do site. Sem publicação de ERP, catálogo ou OTA.

## Consumo

Uma leitura REST traz somente os campos usados por até 15 modelos do tipo selecionado, junto da contagem. A query tem cancelamento e chave por usuário/tipo/página. Não há leitura integral de candidatos, filtro remoto no cliente, assinatura Realtime ou consulta por cartão. A barra agora gera uma única prévia desktop e faz um upload por modelo, em vez de três uploads e três prévias. Não há baseline, amostragem de bytes/latência ou medição de egress faturável. Escritas e limpeza ocorrem somente por ação do operador. Cobertura registrada no roadmap cumulativo de consumo.

### Atualização de 17/11/2026

A biblioteca permite um arquivo desktop por modelo da barra. Os campos responsivos antigos foram tornados opcionais para compatibilidade, sem remover imagens ou registros existentes. O cadastro e as prévias são somente do ERP; a busca no projeto não encontrou consumidor público de `site_element_models` no Catálogo Digital, então não houve mudança na renderização nem publicação no catálogo. A tabela estava sem modelos antes da alteração. A validação automatizada não foi executada neste ciclo.
