# Plano e Registro de Refatoração Modular — Editor de Etiquetas de Preço (PriceLabelArtEditor)

## Contexto e Objetivos
Aplicação dos princípios de Engenharia de Software, SOLID (especialmente Responsabilidade Única - SRP e Inversão de Dependências - DIP) e Código Limpo na arquitetura de impressão de etiquetas do ERP Morante Hub.
O modal original (`PriceLabelArtEditorModal.tsx`) possuía 3.216 linhas acumulando estado, histórico, canvas html2canvas, persistência remota e múltiplos submodais e interfaces de usuário inline.

---

## Fases Concluídas com Sucesso

### 1. Atualização da Skill e Diretrizes (`principios-de-programacao`)
- **Regra ajustada:** Removido o limite arbitrário de 30 a 150 linhas em `c:\Users\Rosilene\Desktop\morantehub\.agents\skills\modularizacao_codigo\SKILL.md`.
- **Nova diretriz:** O tamanho ideal de um arquivo é mensurado pelo cumprimento do SOLID e do Código Limpo (SRP), e não por limites artificiais de linhas.

### 2. Organização e Higienização de `erp/src/pages/utils/`
- **Ação:** 47 arquivos isolados `.test.ts` que estavam soltos na raiz de `pages/utils/` foram movidos para a subpasta canônica `erp/src/pages/utils/__tests__/`.
- **Compatibilidade de imports:** Todos os imports relativos (`../`) foram mapeados e corrigidos para garantir resolução estável de módulos sem quebras de build.

### 3. Extração da Camada de Aplicação / Estado (`usePriceLabelState.ts`)
- **Arquivo criado:** `erp/src/pages/App/Stock/LabelPrinting/hooks/usePriceLabelState.ts`
- **Responsabilidade:** Isolamento de mais de 118 variáveis de estado e setters (`useState`, `useRef`), desacoplando a camada de UI de gerenciamento interno de estados do layout.
- **Orquestração de Histórico:** Extraída toda a lógica de `applySnapshot`, `applyMagnitudeSnapshot`, `handleUndo`, `handleRedo`, pilhas `undoStackRef`/`redoStackRef` e atalhos globais de teclado (`Ctrl+Z`, `Ctrl+Y`).

### 4. Extração da Camada de Infraestrutura / Exportação (`priceLabelExportService.ts`)
- **Arquivo criado:** `erp/src/pages/App/Stock/LabelPrinting/services/priceLabelExportService.ts`
- **Responsabilidade:** Toda a manipulação do `html2canvas`, conversão para Blob, cópia para clipboard do navegador e download de imagem PNG foi isolada neste serviço.
- **Benefício:** O componente modal `PriceLabelArtEditorModal.tsx` não importa mais `html2canvas` diretamente nem cuida de APIs de baixo nível de clipboard/canvas.

### 5. Extração da Camada de Infraestrutura / Persistência (`priceLabelPersistenceService.ts`)
- **Arquivo criado:** `erp/src/pages/App/Stock/LabelPrinting/services/priceLabelPersistenceService.ts`
- **Responsabilidade:** Consultas ao Supabase (`label_art_configs` e `opportunities`), tratamento de erros e upserts seguros.
- **Benefício:** `PriceLabelArtEditorModal.tsx` desacoplado 100% de chamadas diretas ao cliente do Supabase.

### 6. Extração dos Modais Internos Inline (UI Layer)
Foram extraídos 4 componentes filhos especializados na pasta `components/modals/`:
1. `PriceLabelLayersModal.tsx`: Visualização, seleção múltipla e reordenação das camadas da etiqueta.
2. `PriceLabelOpportunitySelectModal.tsx`: Seleção do contexto de oportunidade e temas visuais.
3. `PriceLabelDataFillModal.tsx`: Busca e preenchimento manual de produtos para etiquetagem.
4. `PriceLabelTestValuesModal.tsx`: Simulador de dígitos (0 a 9) com sliders para validação geométrica de dezenas, centenas, milhares e preços antigos.

### 7. Extração do Serviço de Catálogo (`priceLabelCatalogService.ts`)
- **Arquivo criado:** `erp/src/pages/App/Stock/LabelPrinting/services/priceLabelCatalogService.ts`
- **Responsabilidade:** Busca com fallback resiliente: consulta cache em memória/local primeiro; se disponível, sincroniza com Supabase; em caso de erro/timeout/offline, preserva os dados do cache local e normaliza os dados de catálogo sem vazar dependências do banco na camada de interface (`PriceLabelDataFillModal.tsx`).

### 8. Blindagem por Testes Automatizados (Vitest + JSDOM)
- **Suite completa com 37 testes automatizados passando (100% de sucesso):**
  1. `priceLabelCatalogService.test.ts` (6 testes): Busca, deduplicação por SKU/código/nome, fallback offline e tolerância a falhas.
  2. `priceLabelPersistenceService.test.ts` (7 testes): Leitura de `art_config`, upserts transacionais, captura de erros e listagem de oportunidades.
  3. `priceLabelExportService.test.ts` (6 testes): Ocultamento de elementos de exportação, bloco `finally` garantindo restauração do DOM mesmo após exceções, conversão para Blob, download PNG e cópia para clipboard.
  4. `priceLabelState.test.ts` (5 testes): Undo/Redo com restauração real de snapshots (posição x/y, rotação, escala por grandeza), pilha de histórico com debounce e proteção de atalhos (`Ctrl+Z`/`Ctrl+Y`) em campos de texto (`input`/`textarea`).
  5. `priceLabelDataFillModal.test.tsx` (7 testes): Comportamento de busca, debounce de 150ms, seleção de produto, sincronização de inputs manuais e fechamento.
  6. `physicalLabelUniqueness.test.ts` (6 testes): Unicidade física de layout de etiquetas.

---

## Métricas de Impacto
- **Linhas reduzidas no modal principal:** De 3.216 linhas para ~2.072 linhas (~1.144 linhas decompostas em módulos de responsabilidade única).
- **Acoplamento:** Zero dependência direta de `html2canvas` e `supabase` no modal principal e nos submodais de UI.
- **Cobertura de testes:** 37 testes unitários e de integração de componentes cobrindo todos os fluxos críticos.
- **Qualidade de código:** 0 erros de ESLint nos arquivos da funcionalidade.
