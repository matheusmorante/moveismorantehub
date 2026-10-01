# Plano e Registro de Refatoração Modular — Impressão de Etiquetas (Preço e Identificação)

## Contexto e Objetivos
Aplicação dos princípios de Engenharia de Software, SOLID (especialmente Responsabilidade Única - SRP e Inversão de Dependências - DIP) e Código Limpo na arquitetura de impressão de etiquetas do ERP Morante Hub. A refatoração cobre a entrada do módulo, suas seções, hooks, modais, serviços, tipos, utilitários e testes.
O `PriceLabelArtEditorModal.tsx` já foi dividido por etapas anteriores, mas continua sendo um editor grande; novas divisões devem seguir responsabilidades coesas e preservar os fluxos existentes, sem metas numéricas de linhas ou arquivos.

---

## Fases Concluídas com Sucesso

### 1. Atualização das Skills e Diretrizes
- **Organização de arquivos e diretórios:** Removido o gatilho arbitrário de pastas com mais de 8 a 10 arquivos soltos em `.agents/skills/organizacao-arquivos-diretorios/SKILL.md`.
- **Nova diretriz:** A raiz de um módulo pode manter arquivos que formem um conjunto coeso. Subpastas são criadas, fundidas ou removidas quando deixam responsabilidades, propriedade e descoberta mais claras; a quantidade isolada não é critério.
- **Modularização:** `modularizacao_codigo` orienta divisões por responsabilidade e limites entre camadas, sem usar cotas de linhas como medida de qualidade.

### 2. Convenção de organização para o módulo de etiquetas
- `Index.tsx`: ponto de entrada e composição das seções da tela.
- `sections/`: composição das áreas da tela e ligação das ações recebidas por props estritas.
- `hooks/`: estado e orquestração de interação; acesso a dados remotos ou armazenamento local fica em serviços.
- `modals/`: fluxos de edição e confirmação pertencentes à funcionalidade. `components/modals/` abriga diálogos reutilizáveis pelos componentes do editor.
- `services/`: Supabase, armazenamento local, exportação e integrações de impressão.
- `types/`: contratos do módulo; `utils/`: transformação e cálculo sem efeitos colaterais; `__tests__/`: testes do módulo.
- Arquivos coesos podem permanecer na raiz; criar uma subpasta só para satisfazer uma contagem não é recomendado.

### 3. Organização e Higienização de `erp/src/pages/utils/`
- **Ação:** 47 arquivos isolados `.test.ts` que estavam soltos na raiz de `pages/utils/` foram movidos para a subpasta canônica `erp/src/pages/utils/__tests__/`.
- **Compatibilidade de imports:** Todos os imports relativos (`../`) foram mapeados e corrigidos para garantir resolução estável de módulos sem quebras de build.

### 4. Extração da Camada de Aplicação / Estado (`usePriceLabelState.ts`)
- **Arquivo criado:** `erp/src/pages/App/Stock/LabelPrinting/hooks/usePriceLabelState.ts`
- **Responsabilidade:** Isolamento de mais de 118 variáveis de estado e setters (`useState`, `useRef`), desacoplando a camada de UI de gerenciamento interno de estados do layout.
- **Orquestração de Histórico:** Extraída toda a lógica de `applySnapshot`, `applyMagnitudeSnapshot`, `handleUndo`, `handleRedo`, pilhas `undoStackRef`/`redoStackRef` e atalhos globais de teclado (`Ctrl+Z`, `Ctrl+Y`).

### 5. Extração da Camada de Infraestrutura / Exportação (`priceLabelExportService.ts`)
- **Arquivo criado:** `erp/src/pages/App/Stock/LabelPrinting/services/priceLabelExportService.ts`
- **Responsabilidade:** Toda a manipulação do `html2canvas`, conversão para Blob, cópia para clipboard do navegador e download de imagem PNG foi isolada neste serviço.
- **Benefício:** O componente modal `PriceLabelArtEditorModal.tsx` não importa mais `html2canvas` diretamente nem cuida de APIs de baixo nível de clipboard/canvas.

### 6. Extração da Camada de Infraestrutura / Persistência (`priceLabelPersistenceService.ts`)
- **Arquivo criado:** `erp/src/pages/App/Stock/LabelPrinting/services/priceLabelPersistenceService.ts`
- **Responsabilidade:** Consultas ao Supabase (`label_art_configs` e `opportunities`), tratamento de erros e upserts seguros.
- **Benefício:** `PriceLabelArtEditorModal.tsx` desacoplado 100% de chamadas diretas ao cliente do Supabase.

### 7. Extração dos Modais Internos Inline (UI Layer)
Foram extraídos 4 componentes filhos especializados na pasta `components/modals/`:
1. `PriceLabelLayersModal.tsx`: Visualização, seleção múltipla e reordenação das camadas da etiqueta.
2. `PriceLabelOpportunitySelectModal.tsx`: Seleção do contexto de oportunidade e temas visuais.
3. `PriceLabelDataFillModal.tsx`: Busca e preenchimento manual de produtos para etiquetagem.
4. `PriceLabelTestValuesModal.tsx`: Simulador de dígitos (0 a 9) com sliders para validação geométrica de dezenas, centenas, milhares e preços antigos.

### 8. Extração do Serviço de Catálogo (`priceLabelCatalogService.ts`)
- **Arquivo criado:** `erp/src/pages/App/Stock/LabelPrinting/services/priceLabelCatalogService.ts`
- **Responsabilidade:** Busca com fallback resiliente: consulta cache em memória/local primeiro; se disponível, sincroniza com Supabase; em caso de erro/timeout/offline, preserva os dados do cache local e normaliza os dados de catálogo sem vazar dependências do banco na camada de interface (`PriceLabelDataFillModal.tsx`).

### 9. Blindagem por Testes Automatizados
- **Cobertura histórica registrada:** 37 testes dos serviços, do estado, dos modais e da unicidade física.
- **Validação focada desta etapa:** 41 testes passaram em 8 arquivos, incluindo cache, layouts e arte remotos, imagens, seleção de modelo, fallback offline e unicidade dos identificadores de etiquetas.
- **Ambiente:** o teste novo de hook usa `happy-dom`; a dependência nativa `canvas.node` não está instalada para testes em JSDOM neste ambiente.
  1. `priceLabelCatalogService.test.ts` (6 testes): Busca, deduplicação por SKU/código/nome, fallback offline e tolerância a falhas.
  2. `priceLabelPersistenceService.test.ts` (7 testes): Leitura e gravação de `art_config`, captura de erros e listagem de oportunidades.
  3. `priceLabelExportService.test.ts` (6 testes): Ocultamento de elementos de exportação, bloco `finally` garantindo restauração do DOM mesmo após exceções, conversão para Blob, download PNG e cópia para clipboard.
  4. `priceLabelState.test.ts` (5 testes): Undo/Redo com restauração real de snapshots (posição x/y, rotação, escala por grandeza), pilha de histórico com debounce e proteção de atalhos (`Ctrl+Z`/`Ctrl+Y`) em campos de texto (`input`/`textarea`).
  5. `priceLabelDataFillModal.test.tsx` (7 testes): Comportamento de busca, debounce de 150ms, seleção de produto, sincronização de inputs manuais e fechamento.
  6. `physicalLabelUniqueness.test.ts` (6 testes): Unicidade física de layout de etiquetas.

---

### 10. Serviços e contratos extraídos nesta etapa
- `labelImageService.ts` concentra a leitura, inclusão e remoção remota de imagens de etiqueta; `LabelImageModal.tsx` fica responsável pela interação e apresentação.
- `labelLayoutService.ts` concentra leitura, criação, atualização e remoção de layouts, além das gravações de arte e posição de preço por grupo.
- `labelStorageService.ts` concentra o cache de layouts, logos, rótulos e preferências locais, com validação dos dados lidos.
- `useLabelLayouts.ts` e `useLabelModalsAndAssets.ts` não acessam diretamente Supabase ou `localStorage`; esses efeitos passam pelos serviços.
- `Index.tsx` não usa casts `any` para encaminhar estado; props de seção usam os tipos de produto, categoria, layout, fila, refs e configuração correspondentes. A ligação de seleção de categoria agora usa explicitamente `onSelectCategory`.
- A gravação remota e os fallbacks locais existentes foram mantidos na camada de aplicação; os testes cobrem a resposta de erro usada por esses fallbacks.

## Estado atual e validação
- **Lint direcionado:** sem erros ou avisos nos arquivos alterados.
- **TypeScript:** a compilação segmentada não encontrou diagnósticos em `LabelPrinting`. O comando segmentado ainda falha em `MaskedNumericInput.tsx` (propriedade `inputMode` incompatível); o `tsc` global também encontra falhas fora do módulo.
- **Limites de responsabilidade revisados:** `PriceLabelArtEditorModal.tsx` coordena a edição da arte, `LabelGridModelModal.tsx` edita o modelo de grade, `PriceLabelArtRenderer.tsx` renderiza a arte, `LabelItem.tsx` compõe uma etiqueta e `usePriceLabelState.ts` mantém o estado e o histórico do editor. As extrações existentes cobrem estado, exportação, persistência e submodais; não há divisão pendente determinada pelo tamanho desses arquivos. Novas extrações devem responder a uma responsabilidade distinta que apareça no fluxo, sem usar contagem de linhas como meta.
