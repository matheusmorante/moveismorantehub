# AUDITORIA COMPLETA — CRIADOR DE POSTS / GERAÇÃO ESTRUTURADA DE IMAGEM

Data da auditoria: 06/09/2026  
Escopo: ERP web, rota /marketing/posts, estruturas Supabase, integração Gemini, código legado e testes relacionados.  
Método: inspeção estática do runtime e do schema versionado, rastreamento de imports, observação da tela em execução e execução local de 35 testes. Nenhuma chamada de IA foi realizada e nenhum código funcional foi alterado durante a auditoria.

## 1. Resumo executivo

O Criador de Posts atual é uma implementação híbrida e incompleta em relação ao pipeline estruturado que também existe no repositório.

O runtime visível na rota /marketing/posts usa:

- uma camada nova de campanhas, modelos de elementos, vínculos e preview;
- o hook legado usePostEditor para buscar e preparar o produto;
- generateRoom para uma única geração de imagem: ambientação da foto principal;
- PostCreatorPreview para sobrepor alguns dados comerciais de forma local e determinística.

O runtime atual não usa a interface GenerationContext declarada em types/postCreator.ts, não usa generatePostModelPreview, não monta o prompt multimodal completo, não envia referências dos modelos à IA, não gera assets de modelo e não produz/exporta uma imagem final rasterizada com todas as sobreposições.

Há, em paralelo, um pipeline mais completo em postModelPreviewGenerator.ts. Ele possui prompt estruturado, assets semânticos, imagens primary/secondary/variations, regras anti-alucinação e validação pre-flight. Porém esse pipeline é acessado por ModelFormModal, componente que não é montado pela rota atual. Portanto, seus testes passam, mas suas garantias não protegem o botão atual Gerar Preview.

O preview atual é composto em duas camadas:

1. Gemini recebe somente a foto principal do produto e gera uma ambientação sem textos.
2. React exibe essa imagem como fundo e sobrepõe título, selo e bloco comercial em HTML/CSS.

Essa composição não é exportada nem salva como imagem final. O que é salvo como preview é apenas a imagem de ambientação retornada pelo Gemini, normalmente uma data URL base64.

Principais conclusões:

- campanhas e modelos novos existem e são persistidos em Supabase com fallback em LocalStorage;
- cada campanha é apresentada como tendo um modelo por elemento, mas a garantia de banco depende de uma migration posterior cuja aplicação não foi confirmada;
- selo de oportunidade do runtime novo usa products.opportunity_id e opportunities.id, corretamente por UUID;
- o código legado ainda contém reconhecimento por nome para Queima, Última Unidade e Liquidação;
- prompts e anexos dos modelos novos não entram no prompt atual;
- regras de múltiplas fotos estão escritas nas regras globais, mas somente a imagem principal é enviada à geração atual;
- o cache de preview é exclusivamente recuperado do LocalStorage, embora também seja escrito no Supabase;
- alterações de prompt/anexo podem reutilizar preview antigo porque o hash não inclui diretamente esses campos e o generation_input_hash não é recalculado pelo formulário;
- erros de persistência Supabase são silenciosamente absorvidos, dando aparência de sucesso por causa do fallback local;
- a chave Gemini pode ser usada diretamente no frontend e na URL do endpoint, ponto crítico de segurança e custo;
- existe limite de 5 imagens/dia no gateway, mas as verificações por minuto e hora declaradas não são aplicadas.

## 2. Arquitetura e fronteiras reais

### 2.1 Runtime atual

Fluxo de importação efetivamente montado:

    Router.tsx
      -> Marketing/Posts/index.tsx
        -> usePostEditor
          -> productService
          -> postProduct
          -> imageSubjectBounds
          -> composition defaults e services legados
        -> postCreatorService
          -> Supabase
          -> postCreatorLocalStore
        -> CampaignElementsPanel
        -> CampaignManagerModal
        -> GeneralCampaignRules
        -> PreviewProductPicker
        -> PostCreatorModelModal
        -> ElementModelDetailsModal
        -> PostCreatorPreview
        -> generationHash
        -> generateRoom
          -> AiGateway
            -> quota, concorrência, deduplicação, circuit breaker
            -> Gemini generateContent

### 2.2 Código carregado, mas sem função visível na tela nova

usePostEditor ainda cria template, layers, seleção de layer, overrides, slogan e métodos de composição legados. A tela nova só consome:

- products;
- product;
- search;
- setSearch;
- selectProduct;
- loading;
- data.

Os demais estados e métodos são criados, mas não são renderizados nem acionados por index.tsx. Ao selecionar produto, ainda ocorre detecção de bounds e atualização de layers legadas, embora essas layers não participem do PostCreatorPreview atual.

### 2.3 Pipeline estruturado não conectado

ModelFormModal, postModelPreviewGenerator, postModelPromptBuilder, postModelAssetResolver, postTemplateService e GenerationContextModal formam outro domínio de “modelo de post”. Ele não é o mesmo que ElementModel e não é chamado pelo botão atual.

## 3. Mapa de arquivos

### 3.1 Entrada e UI ativa

- erp/src/Router.tsx — registra a página MarketingPosts.
- erp/src/pages/App/Marketing/Posts/index.tsx — orquestra campanha, produto, formato, modelos vinculados, cache e geração atual.
- components/PreviewProductPicker.tsx — busca visual, seleção, limpeza e indicação do produto padrão.
- components/CampaignElementsPanel.tsx — biblioteca em accordion; um tópico por tipo; selo subdividido por oportunidade.
- components/CampaignManagerModal.tsx — CRUD visual de campanhas; criação manual e edição automática com debounce de 700 ms.
- components/PostCreatorModelModal.tsx — criação/edição de ElementModel; nome, oportunidade para selo, prompt e anexos inline; edição automática com debounce.
- components/ElementModelDetailsModal.tsx — leitura de nome, tipo, prompt e anexos.
- components/GeneralCampaignRules.tsx — accordion fechado por padrão; carrega e salva a regra global; debounce de 700 ms.
- components/PostCreatorPreview.tsx — composição visual HTML/CSS do preview; não gera arquivo final.

### 3.2 Tipos e persistência ativa

- types/postCreator.ts — tipos PostCampaign, ElementModel, CampaignElementModel, PostPreviewCache, GenerationContext e enums de elementos/estados.
- services/postCreatorService.ts — leitura/escrita Supabase com cache/fallback LocalStorage.
- services/postCreatorLocalStore.ts — coleções locais versionadas por chave v1.
- services/generationHash.ts — SHA-256 do JSON de entrada; inclui helper de hash de modelo não usado pelo runtime.

### 3.3 Produto e imagens ainda ativos

- components/Editor/usePostEditor.ts — busca produto, restaura produto padrão, carrega produto completo, calcula dados comerciais e ainda mantém estado legado.
- services/postProduct.ts — escolhe preço e imagens por variação, formata BRL e monta slots.
- services/imageSubjectBounds.ts — baixa imagem, usa canvas 256 px e estima bounds do móvel; resultado só alimenta layers legadas.
- erp/src/pages/utils/productService.ts — consulta products, product_variations, product_images e categorias; possui fallback local.
- erp/src/pages/types/product.type.ts — Product e Variation.
- postPriceVisibility.ts — decide quando preço anterior é válido.

### 3.4 IA ativa

- services/compositionAi.ts — generateRoom é a chamada de imagem usada; composeWithAi é legado e não é chamado pela tela atual.
- erp/src/services/aiGateway/AiGateway.ts — gateway Gemini comum.
- aiGateway/config/aiLimitsConfig.ts — modelos e limites declarados.
- aiGateway/core/AiDeduplicator.ts — deduplica payload igual em voo por 15 s.
- aiGateway/core/AiConcurrencyLimiter.ts — limita concorrência global e por categoria.
- aiGateway/core/AiCircuitBreaker.ts — abre após erros/rajadas.
- aiGateway/core/AiQuotaManager.ts — consulta e pré-aloca uso diário em api_usage_logs.
- aiGateway/core/parseGeminiResponse.ts — extrai primeira imagem inline não marcada como thought.

### 3.5 Pipeline estruturado existente, mas desconectado

- components/ModelFormModal.tsx — editor do tipo antigo PostTemplate e ponto de chamada de generatePostModelPreview.
- components/GenerationContextModal.tsx — visualização de contexto/debug do pipeline antigo.
- components/TemplateGrid.tsx e DeleteTemplateModal.tsx — listagem/exclusão do domínio PostTemplate.
- types/postTemplate.ts — entidade PostTemplate, assets, prompt nodes e GeneratedPost.
- services/postTemplateService.ts — CRUD/cache de PostTemplate.
- services/postTemplateMapper.ts — mapeamento banco/tipo.
- services/postTemplatePrompt.ts — prompt de templates antigos.
- services/postModelPreviewGenerator.ts — pipeline multimodal completo, não usado na rota.
- services/postModelPromptBuilder.ts — interpolação, regras de oportunidade por nome e anti-alucinação.
- services/postModelAssetResolver.ts — resolução de referência, logo, selo e parcelamento com fallbacks hardcoded.
- services/postGenerationGuidelines.ts — regra global local/versionada do pipeline antigo.

### 3.6 Editor visual legado

- components/Editor/PostCanvas.tsx — canvas/layers.
- components/Editor/LayerControlPanel.tsx — propriedades de layer.
- components/Editor/VariationGalleryView.tsx — galeria de variações.
- components/Editor/ProductPostControls.tsx — controles do post antigo.
- components/Editor/ElementModelsPanel.tsx — modelos por elemento antigos.
- components/Editor/TemplateSelector.tsx e useTemplateWorkspace.ts — workspace de templates.
- components/Editor/ModelProductPicker.tsx — seletor de produto alternativo.
- components/Editor/FittedLayerText.tsx e PaymentBrands.tsx — renderização visual.
- services/compositionDefaults.ts — layers padrão com coordenadas, prioridade e bindings.
- services/compositionLayoutEngine.ts, compositionValidator.ts, layoutGeometry.ts e layoutRules.ts — layout determinístico/validação.
- services/templateService.ts, templateMetadata.ts, templateAutosave.ts e legacyTemplates.ts — persistência do editor antigo.
- postImageGrid.ts, variationGridImages.ts, ImageGridControls.ts e PostImageSourcePicker.tsx — grid e seleção de imagens antigos.
- ElementImageGallery.tsx, FixedAspectImageCropper.tsx, HeaderFooterModelEditor.tsx, TextAlignmentControls.tsx, TextBackgroundControls.tsx, TextColorPicker.tsx e textAlignment.ts — edição manual antiga.
- OpportunitySealLibrary.tsx, OpportunitySealImageEditor.tsx e opportunitySealImage.ts — biblioteca/editor de selo antigo.
- InstallmentImageGallery.tsx, InstallmentByImageGallery.tsx, InstallmentImageEditor.tsx e installmentBadgeImage.ts — assets de parcelamento antigos.
- AvatarLibrary.tsx — assets visuais antigos.

### 3.7 Ambientação e exportação legadas

- components/Ambientation/AmbientationStudioModal.tsx e services/ambientationService.ts — fluxo separado de ambientação; não montado na tela atual.
- components/Export/PostExportModal.tsx e services/exportPostImage.ts — exportação do canvas antigo; não montados no runtime novo.
- components/Assets/AssetCard.tsx, AssetLibraryModal.tsx e services/assetService.ts — biblioteca antiga.
- components/Campaigns/CampaignSelector.tsx e services/campaignService.ts — campanhas antigas, distintas de PostCampaign.

### 3.8 Banco

- 20260906120000_create_post_creator_campaigns.sql — quatro tabelas principais, índices ativos e RLS.
- 20260906123000_restore_legacy_queima_opportunity_badge.sql — seed/upsert do selo Queima pelo opportunity slug salvado.
- 20260906124000_restore_legacy_morante_logo_model.sql — seed do logo oficial.
- 20260906125000_limit_campaign_to_one_model_per_element.sql — deduplicação e índices de unicidade final.
- 20260906126000_seed_default_campaign_element_models.sql — modelos textuais da Campanha Padrão.
- 20260906127000_create_post_creator_global_rules.sql — regra global única.

## 4. Fluxo funcional atual

1. Usuário abre /marketing/posts.
2. A página carrega campanhas e modelos em paralelo.
3. Seleciona a primeira campanha retornada; não há preferência persistida de campanha.
4. Carrega vínculos da campanha.
5. Busca oportunidades ativas por id e name.
6. usePostEditor inicia busca de até 30 produtos mesmo com pesquisa vazia.
7. Se houver produto padrão no LocalStorage, selectProduct o restaura automaticamente.
8. O usuário pode digitar no campo; sugestões só ficam visíveis a partir de dois caracteres, mas a consulta ocorre também com zero ou um caractere após debounce de 250 ms.
9. Ao selecionar produto, o sistema carrega o registro completo, persiste o id localmente, calcula preços/slots e detecta bounds da imagem.
10. A prévia local aparece imediatamente sem chamada à IA.
11. O usuário expande elementos, consulta o único modelo da campanha, abre detalhes ou edita.
12. Modelos/campanhas/regras existentes salvam automaticamente após 700 ms; novos registros ainda exigem o botão.
13. O usuário escolhe Feed 4:5 ou Story 9:16.
14. Ao clicar Gerar Preview, o sistema calcula hash e consulta somente o cache local.
15. Se encontrar cache UPDATED, usa a URL armazenada e não chama IA.
16. Sem cache, generateRoom baixa a foto principal, converte para base64 e chama Gemini.
17. A resposta de imagem vira imageUrl; é salva no LocalStorage e tentada no Supabase.
18. PostCreatorPreview exibe a ambientação e sobrepõe dados comerciais em React.

Não existem no fluxo atual:

- escolha manual de fotos;
- troca entre modelos A/B;
- geração de asset do modelo;
- botão Gerar Post final;
- exportação;
- histórico visível de previews;
- download;
- composição raster final persistida.

## 5. Modelo de dados novo

### PostCampaign

- id UUID, PK;
- name obrigatório;
- description opcional;
- general_guidelines opcional;
- active;
- created_at, updated_at.

general_guidelines existe, mas não é editado na UI atual nem usado na geração. A UI usa post_creator_global_rules, separado.

### ElementModel

- id UUID, PK;
- name;
- element_type;
- content_kind;
- opportunity_id, FK opportunities, obrigatório apenas para BADGE;
- prompt;
- reference_files JSONB;
- generated_asset_url;
- generation_input_hash;
- generation_version;
- status;
- created_at, updated_at.

Não contém campaign_id. O modelo é global e pertence à campanha por tabela de vínculo.

### CampaignElementModel

- campaign_id, FK com cascade;
- element_model_id, FK com restrict;
- element_type duplicado;
- opportunity_id;
- active;
- created_at;
- PK composta campaign_id + element_model_id.

### PostPreviewCache

- id UUID;
- campaign_id;
- product_id sem FK declarada;
- format 4:5 ou 9:16;
- input_hash único;
- image_url;
- status UPDATED ou STALE;
- created_at, updated_at.

### Global rules

- id boolean, conceitualmente linha única true;
- guidelines;
- updated_at.

Observação de compatibilidade: a migration versionada define PK/check/defaults. Nesta sessão, a criação operacional foi executada por SQL equivalente baseado em CREATE TABLE AS e índice único, após o editor SQL interferir nos fechamentos. Portanto, não se deve assumir que todos os constraints/defaults da migration 1270 estão presentes no banco vivo sem inspeção administrativa posterior.

### Diagrama

    opportunities 1 <- N products
    opportunities 1 <- N post_creator_element_models (somente BADGE)
    opportunities 1 <- N post_creator_campaign_element_models (somente BADGE)

    post_creator_campaigns 1
      |
      +-- N post_creator_campaign_element_models N -- 1 post_creator_element_models
      |
      +-- N post_creator_previews

    post_creator_global_rules
      -> uma configuração global independente de campanha

    Product
      -> product_variations
      -> product_images

Não existe FK entre post_creator_previews.product_id e products no SQL auditado.

## 6. Campanhas

Existe CRUD:

- listar ativas no select;
- criar;
- editar nome, descrição e active;
- excluir com window.confirm.

Persistência:

- LocalStorage é atualizado primeiro;
- Supabase recebe upsert/delete;
- erros remotos são ignorados;
- exclusão da campanha em banco remove links/previews por cascade, mas preserva modelos globais.

Regras reais:

- a campanha define os vínculos de modelos;
- a seleção carrega apenas seus links;
- modelos são globais, vínculos são por campanha;
- o título da biblioteca mostra a campanha selecionada;
- somente activeModels entram no hash e na prévia;
- campanha não altera opportunity_id do produto;
- campanha não altera grid, prompt Gemini ou composição atual, além de seu id participar do hash;
- general_guidelines da campanha não é usado;
- não há formato por campanha;
- não há campanha padrão persistida por usuário.

A UI impede criar segundo modelo para a mesma combinação element_type + opportunity_id na campanha. Para não-BADGE, opportunity_id é null. Para BADGE, um por oportunidade.

No banco, a migration inicial garante um ativo por chave; a migration 1250 passa a garantir um vínculo total por chave. A aplicação da 1250 não foi confirmada nesta sessão. Logo, o runtime deve tolerar vínculos antigos/inativos duplicados.

## 7. Elementos

Tipos implementados no domínio novo:

| Tipo | Rótulo | Kind padrão | Uso atual |
|---|---|---|---|
| TITLE | Título | DYNAMIC_CONTENT | Apenas existência muda texto para “Oferta especial” |
| PRODUCT_NAME | Nome do produto | DYNAMIC_CONTENT | Não é consultado pelo preview atual |
| PRICE | Preço | HYBRID | Não controla a exibição; preço aparece sempre |
| OLD_PRICE | Preço anterior | DYNAMIC_CONTENT | Não controla a exibição; depende apenas do produto |
| INSTALLMENT | Parcelamento | HYBRID | Não controla a exibição; string fixa é usada |
| BADGE | Selo de Oportunidade | STATIC_VISUAL | Asset gerado é sobreposto se compatível |
| BACKGROUND | Fundo/Decoração | STATIC_VISUAL | Prompt/asset não é usado diretamente |
| LOGO | Logo | STATIC_VISUAL | Não é renderizado no PostCreatorPreview atual |
| CTA | CTA | HYBRID | Não é renderizado no PostCreatorPreview atual |

Nenhum tipo é validado como obrigatório antes da geração. Produto, campanha, product id e imagem principal são os únicos pré-requisitos efetivos do botão.

## 8. Modelo de elemento e CRUD

UX:

- accordions fechados por padrão;
- um card por elemento não-BADGE;
- para BADGE, um subtópico por oportunidade ativa;
- sem modelo: botão Criar modelo/Criar selo;
- com modelo: card clicável abre detalhes;
- botão Editar abre formulário;
- não existem duplicar, desvincular, excluir modelo ou adicionar existente;
- não existe seletor entre vários modelos.

Criação:

- nome obrigatório;
- oportunidade obrigatória para BADGE;
- prompt opcional;
- anexos opcionais e restritos pelo input a image/*;
- novo modelo usa crypto.randomUUID;
- é salvo e imediatamente vinculado como active.

Edição:

- debounce de 700 ms;
- também há Salvar agora;
- mantém generatedAssetUrl, hash, version e status anteriores;
- editar prompt/anexo não recalcula geração, hash nem status.

Anexos:

- FileReader converte arquivo em data URL base64;
- o conteúdo integral vai para reference_files JSONB e LocalStorage;
- não há upload para Supabase Storage;
- tamanho/MIME real não são validados além do accept visual do navegador;
- anexos não são enviados à IA pelo runtime atual.

## 9. Selo de oportunidade

Nome real novo: BADGE, rótulo “Selo de Oportunidade”.

Fonte de verdade no runtime novo:

    products.opportunity_id -> opportunities.id

O índice carrega oportunidades ativas e filtra modelos:

    model.elementType não é BADGE
    ou nenhum produto foi selecionado
    ou model.opportunityId é igual a product.opportunityId

Produto sem oportunidade:

- productOpportunityId vira null;
- modelos BADGE com UUID são excluídos de generationModels;
- nenhum selo é renderizado.

Campanha:

- não muda a oportunidade;
- apenas define se há modelo de selo vinculado para aquele UUID.

Hardcodes ainda existentes:

- usePostEditor reconhece /queima|salvados/i para layers legadas e usa /assets/queima-salvados-original.png;
- postModelPromptBuilder reconhece Queima, Última Unidade e Liquidação por regex de nome;
- postModelAssetResolver possui fallbacks hardcoded de selo, logo e parcelamento.

Esses hardcodes não são a fonte de verdade do filtro novo, mas ainda executam parcialmente em usePostEditor ou existem no pipeline desconectado.

## 10. Produto para preview

O campo chama-se “Produto para preview padrão”.

Persistência:

- chave LocalStorage: morante_post_creator_default_preview_product_id;
- salva somente o id;
- restaura ao abrir a página;
- limpar remove a chave.

Busca:

- fetchProductsPage traz 30 produtos ativos, não rascunhos, ordenados;
- debounce de 250 ms;
- busca produto e nomes de variações;
- sugestões visíveis a partir de dois caracteres;
- a consulta acontece também com menos de dois caracteres, pois a restrição está só no componente visual.

Dados carregados pelo getFullProduct:

- products;
- product_variations;
- product_images;
- product_categories/categories.

Dados efetivamente usados pelo Criador atual:

- id;
- name/title/description como fallback;
- unitPrice/promoPrice;
- variations ativas;
- images de produto/variação;
- opportunityId.

Não são enviados ao preview atual: estoque, atributos, dimensões, material, categoria, descrição longa, frete, custo, fiscal e demais campos.

O produto fornece conteúdo; ele não modifica os registros ElementModel.

## 11. Imagens e variações

postProduct é a regra efetiva de seleção local:

### Com variações

- filtra variations com active diferente de false;
- a primeira variação ativa é a principal;
- preço vem da primeira variação, com fallback no produto;
- V1/F1 = primeiro slot e mainImageUrl;
- V1/F2 = segundo slot, mesmo se vazio;
- V2+/F1 = um slot por variação adicional;
- galleryImages contém slots a partir do segundo, apenas se URL existir.

### Sem variações

- Product/F1 = principal;
- Product/F2 = segundo slot;
- não usa terceira foto nesse fluxo.

### Escolha manual

usePostEditor suporta overrides e setPhoto, mas a tela nova não expõe controles de foto. Portanto a seleção é automática.

### O que vai à IA atual

Somente mainImageUrl, isto é, V1/F1 ou Product/F1.

Secondary e variation images não são passadas a generateRoom. As regras globais descrevem essas fotos, mas o payload não as contém.

### Uma variação

- F1 é usada;
- F2 é calculada em slots/galleryImages;
- F2 não é enviada à IA nem renderizada pela prévia nova;
- se F2 não existir, não há duplicação.

### Múltiplas variações

- V1/F1 é usada;
- V1/F2 e V2+/F1 são calculadas, mas ignoradas pelo botão atual;
- não há limite explícito em postProduct para variações adicionais;
- a associação semântica existe apenas nos ids de slot, não no payload atual.

variationGridImages.ts contém uma implementação mais explícita da mesma ordem e postImageGrid.ts possui grid determinístico, mas nenhum é importado pelo index atual.

## 12. Grid e composição

Na tela nova:

- não há grid configurável;
- não há drag-and-drop;
- produto local fica bottom 14%, left 5%, altura 60%, largura 61%;
- título fica left/top 6%;
- selo fica top/right 5%;
- preço fica bottom 8%, right 5%;
- o formato apenas troca aspect-ratio CSS.

Na geração Gemini:

- prompt pede produto inteiro à esquerda ocupando 60%;
- espaço negativo à direita;
- base livre para miniaturas;
- a IA decide pixels e ambiente.

No legado:

- compositionDefaults possui layers com x/y/width/height/zIndex;
- compositionLayoutEngine e validator fazem geometria determinística;
- postImageGrid calcula células;
- PostCanvas rasteriza/edita.

Essas garantias legadas não governam PostCreatorPreview.

## 13. Ambientação

Ambientação atual ocorre no clique Gerar Preview e é a única geração de imagem.

Entrada:

- URL da foto principal;
- nome do produto;
- texto fixo “paleta visual definida pela campanha”;
- regras globais concatenadas a uma instrução;
- formato textual 4:5 ou 9:16.

Processo:

1. fetch da imagem original;
2. Blob;
3. FileReader para base64;
4. payload Gemini com texto + inlineData;
5. Gemini retorna imagem inline;
6. parser converte em data URL.

Prompt base exige:

- preservar cor, proporções, portas, puxadores e materiais;
- mostrar o móvel inteiro à esquerda, 60% da largura;
- espaço negativo à direita e na base;
- sem textos, preços, marcas ou selos;
- ambiente por heurística textual do nome: quarto, sala, escritório ou sala de jantar.

Não há etapa separada de remoção de fundo. Não há validação visual posterior de fidelidade. Não há reaproveitamento de ambientação por produto fora do cache de preview.

O ambientationService legado mantém registros marketing_ambiented_images e promptUsed, mas não é usado pelo botão atual.

## 14. Geração atual do preview

Pipeline exato:

    campanha selecionada
    + produto selecionado
    + formato
    + ids/hashes dos activeModels
    + regras globais
    + URL da foto principal
      -> SHA-256
      -> cache local?
        -> sim: usar imageUrl
        -> não: generateRoom
          -> Gemini IMAGE
          -> data URL
          -> LocalStorage + tentativa de upsert Supabase
      -> PostCreatorPreview
        -> imagem ambientada
        -> overlays HTML/CSS

Não existe GenerationContextBuilder no fluxo atual. A interface GenerationContext é declarativa e não é instanciada.

## 15. Prompt atual

O prompt enviado pelo botão atual é construído dentro de generateRoom:

- proporção pedida;
- productName;
- fidelidade visual do móvel;
- layout esquerdo 60%;
- áreas negativas;
- proibição de textos/preços/marcas/selos;
- heurística de ambiente;
- palette recebida;
- global guidelines;
- instrução final duplicando a proibição de texto/preço/logo/selo.

Não entram:

- campaign.generalGuidelines;
- campaign.name/description;
- prompt dos ElementModels;
- anexos dos ElementModels;
- generatedAssetUrl de elementos;
- dados de preço;
- preço anterior;
- parcelamento;
- oportunidade;
- secondary image;
- variation images;
- logo;
- CTA;
- regras por contentKind.

Os dados comerciais são adicionados depois, localmente, e não fazem parte do prompt de IA atual.

## 16. Pipeline estruturado desconectado

generatePostModelPreview implementa:

- interpolação de placeholders conhecidos;
- assert de placeholders não resolvidos;
- regras anti-alucinação comercial;
- dados estruturados de nome, preço, preço anterior, parcelamento, formato e oportunidade;
- primary, secondary e variation images;
- referência visual principal;
- logo;
- selo;
- asset de parcelamento;
- assets adicionais;
- validação pre-flight;
- uma chamada IMAGE marketing_post_preview.

Ordem multimodal:

1. prompt final;
2. label + PRIMARY_IMAGE;
3. label + SECONDARY_IMAGE, se houver;
4. labels + VARIATION_IMAGE_N;
5. referência visual principal;
6. logo;
7. selo;
8. parcelamento;
9. demais assets.

Cada arquivo é baixado e convertido para inlineData base64. A função semântica é preservada por uma parte textual imediatamente anterior.

Esse pipeline usa PostTemplate, não ElementModel. Não há adaptador ligando os novos modelos a ele.

## 17. Conteúdo dinâmico versus estilo

O modelo de dados novo distingue:

- STATIC_VISUAL;
- DYNAMIC_CONTENT;
- HYBRID.

Porém o runtime atual não interpreta contentKind.

Dados reais não são rasterizados nos assets sementes:

- selo e logo são imagens estáticas;
- modelos de título/preço/parcelamento têm prompt, mas não asset.

PostCreatorPreview renderiza preço real e preço anterior em HTML. Isso é separação correta conceitualmente, porém incompleta:

- TITLE gera a constante “Oferta especial”, não o título do produto;
- PRODUCT_NAME não controla o nome;
- PRICE/INSTALLMENT aparecem mesmo sem modelo;
- logo e CTA não aparecem.

## 18. Formatos Feed e Story

Formatos novos: 4:5 e 9:16.

Efeitos:

- aspect-ratio CSS muda;
- formato entra no hash;
- formato entra no prompt como proporção textual;
- cada formato possui cache diferente.

Não há:

- resolução explícita 1080x1350 ou 1080x1920 no request;
- crop;
- recomposição determinística distinta;
- segundo request automático;
- geração simultânea;
- template separado por formato.

O Gemini recebe somente a proporção em texto e generationConfig solicita TEXT + IMAGE, sem width/height.

## 19. Preview, invalidação e histórico

Preview automático:

- ao selecionar produto, aparece composição local sem IA.

Preview de IA:

- somente no botão Gerar Preview.

Invalidação explícita:

- trocar formato: stale true;
- criar/editar modelo: stale true;
- trocar campanha: remove previewUrl e stale false.

Lacunas:

- trocar produto não limpa previewUrl em index.tsx;
- editar regras globais não seta stale;
- cache pode continuar válido após edição de prompt/anexo;
- stale é apenas estado de sessão;
- tabela tem status STALE, mas runtime nunca grava STALE;
- não há lista/histórico na UI.

Reload:

- previewUrl não é restaurado automaticamente;
- ao clicar gerar, o hash pode recuperar cache local.

## 20. Cache e hash

### LocalStorage novo

- morante_post_creator_campaigns_v1;
- morante_post_creator_models_v1;
- morante_post_creator_links_v1;
- morante_post_creator_previews_v1;
- morante_post_creator_global_guidelines;
- morante_post_creator_default_preview_product_id.

Sem TTL, sem limite de tamanho e sem limpeza automática.

### Hash do preview

SHA-256 de JSON.stringify de:

- campaign id;
- product id;
- format;
- array [model.id, model.generationInputHash];
- guidelines;
- primary photo URL.

Não entram diretamente:

- model.prompt;
- referenceFiles;
- generationVersion;
- status;
- generatedAssetUrl;
- preços;
- nome;
- oportunidade;
- secondary/variation images.

generationInputHash de modelos sementes é fixo ou null. O formulário não o recalcula. Portanto alterações significativas podem não invalidar o hash.

### Cache do gateway

AiDeduplicator deduplica somente requisições idênticas em voo:

- hash simples de 32 bits, não criptográfico;
- TTL de 15 s;
- remove 2 s após conclusão;
- não é cache de resultado persistente.

### Cache remoto

post_creator_previews recebe upsert, mas preview(inputHash) nunca consulta essa tabela. Outro navegador/dispositivo não reutiliza o preview remoto.

## 21. Chamadas de IA e custo potencial

### Chamada ativa: marketing_ambientation

- função: generateRoom;
- provider: Google Gemini API;
- modelo configurado: gemini-3.1-flash-image;
- endpoint: v1beta/models/{model}:generateContent;
- entrada: texto e uma imagem inline base64;
- saída: primeira imagem inline da resposta;
- gatilho: clique Gerar Preview sem cache local;
- automática: não;
- retry: não;
- timeout: não;
- fallback de imagem: não;
- limite declarado: concorrência 1, 2/min, 5/hora, 5/dia;
- limite efetivamente aplicado pelo código: concorrência e 5/dia; perMinute/perHour não são consultados no AiQuotaManager.

### Chamada carregada, não acionada: marketing_composition

- função: composeWithAi;
- modelo: gemini-2.5-flash;
- saída: JSON textual com slogan e estratégia;
- o index atual não chama editor.run.

### Chamada desconectada: marketing_post_preview

- função: generatePostModelPreview;
- modelo: categoria IMAGE;
- multimodal completa;
- só seria chamada pelo ModelFormModal antigo.

### Proteções

- deduplicação em voo;
- concorrência;
- circuit breaker após 4 erros por categoria ou rajada;
- quota diária fail closed;
- preallocation em api_usage_logs.

Pontos de custo:

- a inserção de preallocation não verifica o error retornado, então não é atomicidade comprovada;
- limites/minuto e hora são configuração morta;
- não há timeout;
- não há limite de tamanho das imagens base64;
- o endpoint usa chave no cliente;
- não há preço/free tier documentado no repositório, portanto não é possível afirmar custo unitário atual sem consulta oficial externa;
- o teto interno de cinco imagens/dia reduz exposição, mas não prova custo zero.

### Garantia de não gerar sem ação

Não geram IA:

- abrir accordion;
- abrir detalhes;
- editar campanha/modelo/regras;
- trocar campanha;
- trocar formato;
- trocar produto;
- pesquisar produto.

Selecionar produto faz fetch da foto para detecção local de bounds, mas não chama Gemini.

## 22. Persistência

| Dado | Supabase | LocalStorage | Estado |
|---|---|---|---|
| Campanhas | sim | sim | sim |
| Modelos | sim | sim | sim |
| Vínculos/active | sim | sim | sim |
| Regras globais | sim | sim | sim |
| Prompts | dentro do modelo | dentro do modelo | formulário |
| Anexos | JSONB data URL | JSON data URL | formulário |
| Assets gerados | URL no modelo | URL no modelo | carregado |
| Previews | escrito | lido/escrito | previewUrl |
| Produto padrão | não | id | produto carregado |
| Campanha selecionada | não | não | campaignId |
| Formato | não | não | format |
| Última alteração do cabeçalho | não | não | Date |
| Histórico | tabela implícita | array | sem UI |

Supabase é tentado depois do LocalStorage nas escritas. Falhas são engolidas. O usuário pode ver “salvo” mesmo quando apenas o navegador foi atualizado.

## 23. Estados e transições

ElementModelStatus:

- NO_PREVIEW;
- UPDATED;
- STALE;
- GENERATING;
- ERROR.

No runtime novo:

- criação usa NO_PREVIEW;
- seeds de logo/selo usam UPDATED;
- edição preserva o status;
- nenhuma transição automática para STALE/GENERATING/ERROR ocorre.

PostPreviewCache:

- UPDATED;
- STALE.

Somente UPDATED é criado e lido.

Estados de UI:

- busy gera preview;
- stale marca “Configuração alterada”;
- savingChanges controla spinner;
- lastUpdated é local e atualizado quando callback de salvamento termina;
- open controla accordions/modais.

## 24. Validações

Runtime atual:

- campanha existente;
- product.id;
- product.mainImageUrl;
- bloqueio contra clique enquanto busy;
- nome de campanha obrigatório no form;
- nome de modelo obrigatório;
- opportunityId obrigatório para BADGE;
- input file aceita image/*;
- formato limitado por tipo/UI;
- banco possui checks de element_type/content_kind/status/formato na migration.

Ausentes:

- prompt obrigatório;
- tamanho de anexo;
- MIME verificado;
- URL válida;
- referências obrigatórias;
- todos os elementos presentes;
- preço válido antes de gerar;
- compatibilidade asset/modelo;
- pre-flight do pipeline estruturado;
- confirmação de persistência remota;
- validação visual/fidelidade da resposta;
- FK de product_id no preview.

## 25. Fallbacks

- campanha vazia: Campanha Padrão em memória e tentativa de upsert;
- falha Supabase: LocalStorage;
- produto completo: cache local de produtos;
- nome: name, title, description, “Produto”;
- preço: primeira variação, senão produto;
- promoção inválida: preço normal e sem preço anterior;
- imagem: primeiro slot ou vazio;
- sem F2: não duplica;
- sem oportunidade: sem BADGE novo;
- Queima legado: asset local hardcoded;
- sem modelo: UI oferece criação;
- sem generatedAssetUrl: “Sem miniatura”;
- sem imagem de IA: preview local com gradiente;
- falha Gemini: toast de erro, sem imagem simulada;
- falha de bounds/CORS: undefined, efeito apenas legado;
- cota indisponível: fail closed.

## 26. Regras de negócio atuais

RULE-POST-001 — A campanha selecionada define os vínculos de modelos disponíveis.

RULE-POST-002 — Modelos de elemento são entidades globais; pertencimento à campanha ocorre pela tabela de vínculo.

RULE-POST-003 — A UI admite um modelo não-BADGE por elemento e campanha.

RULE-POST-004 — BADGE admite um modelo por campanha e opportunityId.

RULE-POST-005 — A oportunidade do produto vem de products.opportunity_id e não é alterada pela campanha.

RULE-POST-006 — Produto sem opportunityId não recebe selo no preview novo.

RULE-POST-007 — Um selo só participa quando model.opportunityId corresponde ao produto.

RULE-POST-008 — Somente oportunidades ativas são tópicos na biblioteca.

RULE-POST-009 — Primeira variação ativa fornece preço e foto principal.

RULE-POST-010 — Promoção válida usa promoPrice e expõe unitPrice como preço anterior.

RULE-POST-011 — Produto sem variações usa imagens do produto.

RULE-POST-012 — Ausência de imagem secundária não duplica a principal.

RULE-POST-013 — Geração de IA só ocorre por ação explícita no botão e em cache miss.

RULE-POST-014 — Formato é 4:5 ou 9:16 e participa do hash.

RULE-POST-015 — Regras globais são únicas para todas as campanhas.

RULE-POST-016 — Edição de regra, campanha e modelo existente usa debounce de 700 ms.

RULE-POST-017 — Novo modelo é vinculado ativo à campanha imediatamente após criação.

RULE-POST-018 — A IA de ambientação não deve gerar texto, preço, logo ou selo.

RULE-POST-019 — Dados comerciais são sobrepostos localmente após ambientação.

RULE-POST-020 — Cache válido exige status UPDATED e hash idêntico no LocalStorage.

RULE-POST-021 — Produto de preview padrão é persistido por id no navegador.

## 27. Cenários simulados

### Cenário A — produto com uma variação

Entrada:

- V1 ativa;
- unitPrice/promoPrice da V1;
- V1.images[0] e possivelmente [1].

Fluxo atual:

- V1/F1 vira primary;
- V1/F2 entra em galleryImages, mas não chega à geração;
- Gemini recebe somente V1/F1;
- preço real aparece em HTML;
- não há thumbnail de F2.

### Cenário B — várias variações

- V1/F1 primary;
- V1/F2 slot secundário;
- V2+/F1 slots de galeria;
- somente primary vai ao Gemini e ao preview novo;
- a IA não recebe mapeamento de variações;
- o pipeline desconectado saberia enviar todas semanticamente.

### Cenário C — produto com oportunidade

- product.opportunityId é comparado por UUID;
- activeModels mantém BADGE correspondente;
- se o modelo possui generatedAssetUrl, o selo aparece top/right;
- oportunidade não entra no prompt generateRoom.

### Cenário D — produto sem oportunidade

- BADGE é removido de generationModels;
- nenhum selo é renderizado;
- demais modelos permanecem;
- usePostEditor também oculta layer de selo legada.

### Cenário E — troca de modelo de preço

Não há UI de troca. Se o banco contiver vários vínculos, a página escolhe o link active. O service activate existe, mas não é chamado. Editar o modelo atual seta stale, porém não altera a renderização do preço nem garante novo hash.

### Cenário F — Feed e Story

- usuário seleciona formato;
- stale vira true;
- próximo clique calcula hash diferente;
- cache separado;
- Gemini recebe proporção textual;
- CSS troca aspect ratio;
- nenhuma resolução explícita é definida.

## 28. Código legado e conflitos

O editor antigo não está morto por completo:

- usePostEditor está ativo;
- productService, postProduct e imageSubjectBounds são usados;
- layers/templates/campaign legado são inicializados;
- regras hardcoded de badge atualizam layers após seleção.

O restante está majoritariamente sem ponto de montagem na rota nova:

- canvas e controles;
- grid configurável;
- exportação;
- geração multimodal estruturada;
- PostTemplate CRUD;
- ambientação separada;
- assets/campanhas antigas.

Riscos:

- duas entidades de campanha: MarketingCampaign e PostCampaign;
- duas entidades de modelo: MarketingTemplate/PostTemplate e ElementModel;
- duas regras globais: postGenerationGuidelines local e post_creator_global_rules;
- dois pipelines de IA;
- dois seletores de produto;
- dois sistemas de cache;
- hardcodes de oportunidade no legado versus UUID no novo.

## 29. Testes

Executados: 5 arquivos, 35 testes, todos aprovados.

### generationHash.test.ts — 2

- estabilidade do hash;
- mudança ao alterar prompt/referência/diretriz por meio de modelGenerationInput.

Lacuna: runtime não usa modelGenerationInput ao salvar modelo.

### composition.test.ts — 17

- ambiente, parsing Gemini;
- ordem de imagens;
- promoção/preço anterior;
- produto simples;
- layout/reparo/validação;
- bindings e limites de API.

Grande parte cobre o compositor legado, não PostCreatorPreview.

### postModelPreviewGenerator.test.ts — 9

- placeholders;
- anti-alucinação;
- oportunidades por nome;
- imagens semânticas;
- prompt;
- pre-flight.

Pipeline testado não é usado pelo botão atual.

### postTemplate.test.ts — 3

- interpolação;
- prompt estruturado;
- exclusão/persistência de PostTemplate.

Domínio antigo.

### templatePersistence.test.ts — 4

- merge local/remoto;
- versão mais recente;
- layouts;
- campanha local.

Domínio MarketingTemplate antigo.

Lacunas sem testes:

- index.tsx;
- PostCreatorPreview;
- CRUD novo;
- autosave novo;
- fallback Supabase novo;
- filtro BADGE por UUID;
- produto padrão;
- cache remoto;
- invalidação após edição;
- geração generateRoom integrada;
- formatos do preview novo;
- exclusão de campanha;
- anexos grandes.

## 30. Pontos de atenção

### CRÍTICO

CRIT-POST-001 — O botão atual ignora prompts, anexos e assets da maioria dos ElementModels.

CRIT-POST-002 — Regras de múltiplas fotos não são executadas; somente primary é enviada.

CRIT-POST-003 — O hash não invalida diretamente por prompt/referências/preço/nome/oportunidade, permitindo preview obsoleto.

CRIT-POST-004 — A chave Gemini pode existir no frontend e é enviada na query string.

CRIT-POST-005 — O que é persistido como preview não é a arte composta final; é só a ambientação.

### ALTO

HIGH-POST-001 — GenerationContext existe, mas não é usado.

HIGH-POST-002 — Pipeline estruturado testado está desconectado do runtime.

HIGH-POST-003 — Supabase errors são engolidos; UI não distingue remoto de local.

HIGH-POST-004 — data URLs de imagens/anexos podem exceder LocalStorage/JSONB.

HIGH-POST-005 — troca de produto pode manter previewUrl do produto anterior.

HIGH-POST-006 — status/versionamento de modelo não transiciona.

HIGH-POST-007 — unicidade final depende da migration 1250, não confirmada no banco vivo.

### MÉDIO

MED-POST-001 — campanha.generalGuidelines é campo morto.

MED-POST-002 — contentKind não influencia o runtime.

MED-POST-003 — PRODUCT_NAME, BACKGROUND, LOGO e CTA não controlam a prévia.

MED-POST-004 — TITLE dispara texto fixo “Oferta especial”, potencialmente não fornecido.

MED-POST-005 — busca consulta banco antes dos dois caracteres apesar de esconder sugestões.

MED-POST-006 — preview remoto nunca é lido.

MED-POST-007 — perMinute/perHour de IA não são aplicados.

MED-POST-008 — preallocation ignora erro do insert e não é transação/RPC atômica comprovada.

MED-POST-009 — última alteração do cabeçalho não é persistida e pode representar apenas fallback local.

### BAIXO

LOW-POST-001 — estados ingleses aparecem crus no card, como NO_PREVIEW.

LOW-POST-002 — plural/semântica visual não afeta comportamento, mas pode confundir.

LOW-POST-003 — grande quantidade de código antigo aumenta custo de manutenção.

## 31. Decisões de negócio necessárias

DECISION-POST-001 — O objetivo final é geração integral pela IA ou ambientação por IA + compositor determinístico?

DECISION-POST-002 — Prompt/anexos de ElementModel devem orientar a ambientação, gerar asset próprio ou orientar a arte final?

DECISION-POST-003 — Modelos realmente devem ser globais reutilizáveis ou exclusivos por campanha?

DECISION-POST-004 — Deve existir exatamente um modelo total ou um ativo entre vários?

DECISION-POST-005 — Trocar/editar modelo deve recompor localmente ou invalidar e cobrar nova geração?

DECISION-POST-006 — Preview remoto deve ser compartilhado entre usuários/dispositivos?

DECISION-POST-007 — O preview salvo deve incluir overlays comerciais?

DECISION-POST-008 — Título promocional pode ser fixo ou deve vir de dado aprovado?

DECISION-POST-009 — Produto sem F2 deve mostrar apenas F1, e qual composição ocupa o espaço?

DECISION-POST-010 — Quantas variações adicionais podem aparecer?

DECISION-POST-011 — Campanha deve ter regra própria além da regra global?

DECISION-POST-012 — Seeds/hardcodes legados de oportunidade devem continuar como fallback?

DECISION-POST-013 — Novos modelos/campanhas também devem ser criados sem botão após primeiro campo válido?

DECISION-POST-014 — Qual é a política de retenção/limite de previews e anexos?

## 32. Diagrama final real

    [products + variations + product_images]
                    |
                    v
             [usePostEditor]
                    |
              [postProduct]
                    |
          +---------+----------+
          |                    |
          v                    v
    [dados comerciais]   [somente PRIMARY]
          |                    |
          |              [generateRoom]
          |                    |
          |               [AiGateway]
          |                    |
          |                 [Gemini]
          |                    |
          |          [imagem ambientada base64]
          |                    |
          +---------+----------+
                    v
          [PostCreatorPreview HTML/CSS]
                    |
          [visualização, não arquivo final]

    [PostCampaign]
          |
    [CampaignElementModel]
          |
     [ElementModel]
          |
    [prompt/anexos/asset]
          |
          +---- entram no hash apenas por id + generationInputHash
          +---- não entram no prompt Gemini atual

Pipeline estruturado paralelo:

    [PostTemplate + produto + imagens semânticas + assets]
                    |
          [generatePostModelPreview]
                    |
          [prompt + multimodal completo]
                    |
                 [Gemini]

    Estado: não conectado à rota atual.

## 33. Conclusão

O módulo atual oferece uma boa estrutura administrativa inicial para campanha, elementos, oportunidades e persistência, mas o pipeline de geração ainda não consome essa estrutura de maneira funcional completa. A implementação visível se comporta como um gerador de ambientação com overlays parciais de preview, enquanto o pipeline estruturado mais sofisticado permanece paralelo e desconectado.

O maior risco de interpretação é considerar que “modelos de elementos” já dirigem a IA. Hoje eles quase não dirigem: participam do hash por identidade/hash preexistente e o selo pode fornecer asset visual ao overlay, mas seus prompts e anexos não chegam à chamada atual.

## 34. RESUMO PARA ANÁLISE PELO CHATGPT

O Criador de Posts do ERP está na rota /marketing/posts e usa uma arquitetura híbrida. A UI nova possui PostCampaign, ElementModel, vínculos CampaignElementModel, regras globais e PostPreviewCache. Campanhas e modelos são salvos primeiro em LocalStorage e depois tentados no Supabase. Falhas remotas são silenciosas.

O produto padrão é persistido por id no LocalStorage. O produto completo vem de products com product_variations, product_images e categorias. postProduct escolhe a primeira variação ativa: V1/F1 é primary, V1/F2 seria secondary e V2+/F1 seriam imagens de variações. Porém o botão atual envia somente primary à IA.

Campanha define quais modelos estão vinculados. Modelos são globais. A UI permite um modelo por elemento; BADGE permite um por opportunityId. A fonte nova de oportunidade é products.opportunity_id -> opportunities.id. Produto sem oportunidade não recebe selo. Campanha não altera oportunidade.

Elementos: TITLE, PRODUCT_NAME, PRICE, OLD_PRICE, INSTALLMENT, BADGE, BACKGROUND, LOGO e CTA. ElementModel contém nome, tipo, contentKind, opportunityId, prompt, referenceFiles, generatedAssetUrl, generationInputHash, generationVersion, status e datas. Anexos são data URLs base64 em JSONB/LocalStorage, sem Storage.

O botão Gerar Preview calcula SHA-256 de campaign id, product id, formato, ids/hashes dos modelos ativos, regras globais e URL primary. Consulta somente cache local. Em cache miss, generateRoom chama Gemini IMAGE com texto + a foto primary inline. O prompt pede ambientação, fidelidade do móvel, produto à esquerda e ausência de texto/logo/selo. Prompts, anexos e assets dos ElementModels não são enviados.

Depois da IA, PostCreatorPreview exibe a imagem ambientada e sobrepõe em HTML/CSS um título fixo, selo compatível e bloco de preço. Logo, CTA, background model e product-name model não controlam a saída. A composição final não é rasterizada/exportada; o preview persistido é apenas a ambientação base64.

Existe um pipeline completo separado, generatePostModelPreview, com prompt estruturado, placeholders, anti-alucinação, primary/secondary/variations e assets multimodais. Ele usa PostTemplate e ModelFormModal, mas não está conectado à rota atual. Seus testes não garantem o comportamento do botão atual.

Cache: LocalStorage sem TTL; preview remoto é escrito mas não lido. O hash não inclui diretamente prompt, referências, preço, nome ou oportunidade, e o formulário não recalcula generationInputHash. Isso pode reutilizar preview antigo.

IA: Gemini via endpoint generateContent. Categoria IMAGE usa gemini-3.1-flash-image, concorrência 1 e limite diário interno 5. Não há retry/timeout. Deduplicação é apenas em voo. Configurações por minuto/hora existem, mas não são aplicadas. A chave pode estar no frontend/query string.

Regras confirmadas: campanha restringe modelos; oportunidade vem do produto; selo exige UUID compatível; geração só por botão em cache miss; dados comerciais são overlays locais; formato separa cache; regras globais são únicas; produto padrão é local.

Principais problemas: estruturas novas não alimentam o prompt; múltiplas fotos não chegam à IA; GenerationContext é não usado; pipeline completo está desconectado; cache invalida incorretamente; persistência remota pode falhar silenciosamente; data URLs podem exceder armazenamento; preview não é arte final; chave Gemini exposta no cliente.

Principais dúvidas: escolher geração integral versus IA de ambientação + compositor determinístico; definir papel de prompts/anexos; decidir se modelos são globais ou exclusivos; decidir política de preview compartilhado, retenção, troca de modelo, limite de variações e regras próprias de campanha.
