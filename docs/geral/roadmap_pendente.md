# 📋 Planos Pendentes e Roadmap — Móveis Morante Hub
> **Última atualização:** Setembro de 2026  
> **Status:** Documento vivo de planejamento operacional e técnico.

> **Aviso fiscal:** O status e as pendências de NF-e/NFC-e de saída foram migrados para o roadmap canônico [docs/fiscal/roadmap-configuracao-emissao-producao.md](../fiscal/roadmap-configuracao-emissao-producao.md). Consulte-o como fonte de verdade; os itens fiscais abaixo podem estar desatualizados e não devem ser usados para determinar prontidão de produção.

---

## 🎯 Status Geral das Entregas

### ✅ Funcionalidades Já Concluídas (Setembro 2026)
- [x] **Independência Total de Canais (ERP vs Catálogo)**: Status `active` no ERP e `status` no Catálogo totalmente desacoplados. Produtos desativados permanecem na listagem normal.
- [x] **Botões Bipartidos "Status de Canais"**: Implementados na tabela, nos cards e na listagem de variações.
- [x] **Requisitos Inteligentes de Ativação**: Custo desobrigado da ativação (preenchido em compras); validação dinâmica destacando apenas campos pendentes.
- [x] **Remoção de Coluna de Visibilidade Redundante**: Sidebar e cabeçalhos de tabela limpos e focados.
- [x] **Observações por Item (`observation`)**: Campo no item do pedido concatenado com `" - "` nos impressos, ordens de serviço, recibo e WhatsApp.
- [x] **Assinatura Digital ICP-Brasil nos Recibos**: Carimbo criptográfico oficial com QR Code dinâmico determinístico, sem assinatura manual em papel.
- [x] **Vendedores Habilitados**: Filtro exclusivo para colaboradores ativos com credenciais válidas; snapshot de `sellerId` e `seller` persistidos.
- [x] **Código Sequencial Obrigatório (`orderIndex`)**: Geração imediata de 6 dígitos `#000000` na abertura de pedidos; blindagem contra `undefined`.
- [x] **Padronização do Ícone de Montagem (`DrillIcon`)**: Componente de parafusadeira preenchida em todos os módulos.
- [x] **Autosave de Rascunhos**: Em pedidos, pessoas e produtos com recuperação transparente.
- [x] **Replicação ERP → App Mobile: Submenu de Ambientes e Categorias**: Portada a experiência completa e unificada do módulo do ERP para o App Mobile com paridade total (nomenclatura oficial "Ambientes e Categorias", abas "Por ambiente" e "Por categoria", botão contextual de criação posicionado diretamente abaixo das abas, alerta de órfãos com atalho dinâmico, contadores e badges de produtos vinculados, desvinculação cirúrgica com chip e confirmação, exclusão com validação de bloqueio de integridade referencial tanto nos cards quanto no modal de edição com lixeira, e sincronização automática com os filtros do catálogo de produtos).
- [x] **Replicação ERP → App Mobile: Módulo de Movimentações de Estoque**: Paridade funcional e de regras de negócio completa com o ERP Web (cálculo cronológico de saldo em tempo real `calculateInventoryTimelineBalance`, badge destacada de Saldo em Estoque do produto/variação selecionada, modal nativo com justificativa/observação obrigatória para estorno seguro `InventoryMoveDeleteModal`, bloqueio de estorno de lançamentos vinculados a pedidos de venda ou compra `isOrderLinked`, filtragem de marcadores de auditoria com quantidade zero `isInventoryAuditMarker`, modal temático de edição controlada `InventoryMoveEditModal` e limpeza padronizada de observações operacionais).
- [x] **Modularização e Clean Code (Mobile)**: Refatoração estrutural dos módulos de Ambientes/Categorias e Movimentações com base nas skills `principios-de-programacao` e `organizacao-arquivos-diretorios`. Redução drástica de complexidade (`MobileCategoryEnvironmentModal` de ~520 para ~200 linhas; `StockMovesScreen` de ~480 para ~190 linhas), extração de componentes coesos (`CategoryAttributesPicker`, `CategoryLinksPicker`, `StockPeriodModal`, `StockProductSearchFilter`, `StockBalanceBadge`, `StockMoveTypeSelector`), separação do hook de formulário `useCategoryFormModal` e 100% de testes automatizados aprovados.
- [x] **Bloqueio Visual e Operacional do Canal ERP para Salvados e Usados**: Produtos cuja origem do estoque é "Salvados" ou "Usados" têm o canal do ERP desativado permanentemente (tanto no modal de canais pós-cadastro quanto nos cards/listagens de produtos), renderizando com aspecto visual acinzentado, meio transparente (50% de opacidade), cursor bloqueado, sem ação ao clicar e com mensagens informativas.
- [x] **Padronização de Especificações Técnicas (Marca, Modelo, Lugares, Reclinável)**:
  - Marca e Modelo convertidos em campos de texto digitáveis (`text_short`) sem menus de seleção/combobox, permitindo digitação livre e mantendo sincronia com os metadados do produto.
  - "Quantidade de lugares" definida como número inteiro (`integer`), com `type="number"`, `step="1"`, `min="0"` e placeholder `'Digite o número de quantidades'`.
  - "Reclinável" desativado e removido do formulário de características e do banco Supabase, eliminando redundância em relação ao tipo do sofá.
- [x] **Origem Comercial do Produto no Cadastro (Produção Própria vs Adquirido de Terceiros)**:
  - Implementado botão superior de alternância (switch toggle e botões segmentados) no topo da aba Estoque e Precificação do ERP (`ProductManufacturingTypeToggle.tsx`).
  - Padrão do sistema: *Adquirido ou recebido de terceiros* (`third_party`, CFOP base 5.102).
  - Modo *Fabricação Própria* (`own_production`, CFOP base 5.101): dispensa automaticamente a seleção de fornecedor externo (fornecedor interno da Móveis Morante), removendo bloqueios de salvamento e badges de pendência.
  - Separação conceitual rigorosa: a característica física/comercial fica no produto (`merchandiseOrigin`), enquanto variáveis de venda (UF destino, contribuinte ICMS, consumidor final, operações especiais) são resolvidas dinamicamente pelo Pedido de Venda; devoluções vinculam-se de forma imutável à NF-e original autorizada (veja documento canônico `docs/fiscal/matriz-determinacao-cfop-produto-pedido.md`).
- [x] **Implantação Global do TanStack Query (React Query) para Otimização de Egress e Cache em Memória**:
  - `QueryClientProvider` centralizado implementado no ERP (`erp/src/lib/queryClient.ts`) e no Catálogo Digital (`digital-catalog/src/lib/react-query-provider.tsx`).
  - Módulo de Características (`Variations`): `useQuery` com `staleTime: 5 min` e invalidação reativa em `saveVariation`/`moveToTrash`.
  - Módulo de Pessoas (`usePeople`): Clientes, Funcionários e Fornecedores integrados via `useQuery` com `staleTime: 2 min`, busca condicional de lixeira (`enabled: showTrash`) e invalidação em mutações.
  - Módulo de Produtos (`useProducts`): `useQuery` integrado à paginação server-side com `staleTime: 1 min` e invalidação em ativação/lixeira/edição.
  - Módulo de Pedidos (`useOrderHistory`): `useQuery` com `staleTime: 30s`, deduplicação e sincronização com badges fiscais.
  - Catálogo Digital: `useQuery` para produtos públicos (`staleTime: 2 min`), metadados e categorias (`staleTime: 10 min`), e revalidação reativa via `BroadcastChannel`.
- [x] **Auditoria de Integridade e Endurecimento do TanStack Query (Meta 100 MB/dia Egress)**:
  - *Atualização imediata*: Invalidação reativa explícita (`queryClient.invalidateQueries`) em mutações de produtos (`saveProduct`, `updateProduct`, `deactivateProduct`), pessoas (`savePerson`, `updatePerson`, `moveToTrash`, `restorePerson`, `permanentDeletePerson`), características (`saveVariation`, `moveToTrash`) e pedidos (`executeSaveOrder`, `executeUpdateOrder`), eliminando inconsistências comerciais e fiscais.
  - *Separação entre usuários*: `queryClient.clear()` implementado no `logout` do `AuthContext` e nos eventos de perda/troca de sessão do Supabase Auth (`onAuthStateChange`), impedindo vazamento de dados privados em memória RAM.
  - *Filtros e paginação*: QueryKeys totalmente estáveis e serializadas com todos os filtros e página (`queryKey: ['products', queryFilters, currentPage, itemsPerPage]`), garantindo precisão nos resultados.
  - *Eliminação de consultas duplicadas*: Removidos `useEffect` com fetches legados redundantes em paralelo com `useQuery`.
  - *Redução de bytes por requisição*: Substituído `select('*')` por projeção estrita de colunas (`PERSON_QUERY_COLUMNS`) em `personQueryService.ts`, reduzindo a carga útil de transferência de rede do Supabase.
  - *Comprovação automatizada*: Bateria de testes em `src/pages/utils/__tests__/tanstackQueryCachePolicy.test.ts` (8 testes aprovados) e regressão completa de 44 testes em pedidos, produtos e transições aprovada.

---

## 🚀 Próximas Frentes de Desenvolvimento

### 1. 🏛️ Emissão Direta de NF-e e NFC-e no SEFAZ-PR
- [ ] Redefinir o plano de testes fiscais em homologação; os critérios e instruções anteriores foram removidos em 2026-10-03.
- [ ] Geração do DANFE em PDF com chave de acesso e código de barras via Edge Function.
- [ ] Fluxo de cancelamento e inutilização de numeração diretamente pelo ERP.
- [ ] Envio automático do XML e DANFE ao cliente via WhatsApp e e-mail.

### 2. 📱 Mobile: Conferência Cega e Recebimento no Depósito
- [ ] Módulo de contagem física cega de mercadoria no aplicativo móvel.
- [ ] Leitura de código de barras / QR Code via câmera nativa do dispositivo.
- [ ] Modo offline com persistência de eventos no SQLite e sincronização com fila de 4 estados (`PENDING` → `SYNCING` → `CONFIRMED` / `REJECTED`).
- [ ] Alerta imediato de divergência entre nota do fornecedor e mercadoria recebida.

### 3. 🎙️ BI por Voz (Sales Intelligence)
- [ ] Interface no mobile/web para áudio rápido do vendedor no balcão após o atendimento.
- [ ] Armazenamento persistente do áudio original no Supabase Storage / R2 para auditoria e histórico (mesmo em caso de falha da IA).
- [ ] Transcrição e extração de JSON via Gemini API (`produto`, `resultado`, `motivo_objeção`, `demanda_não_atendida`).
- [ ] Pipeline de consolidação e análise estratégica via NotebookLM.

### 4. 💰 Módulo de Comissões e Metas de Vendedores
- [ ] Painel analítico de comissões por vendedor com base nos snapshots históricos de `sellerId`.
- [ ] Regras de comissão diferenciadas por categoria de produto e forma de pagamento.
- [ ] Abatimento líquido de devoluções atendidas no cálculo de comissão do período.

---

## 📝 Arquitetura do Ecossistema
- **ERP:** React + Vite + TypeScript + Tailwind CSS (`erp/`)
- **Catálogo Digital:** Next.js + Tailwind CSS + Cloudflare R2 (`digital-catalog/`)
- **Mobile:** React Native + Expo (Offline-First pragmático) (`mobile/`)
- **API & Fiscal:** Node.js Serverless + SEFAZ-PR direta (`api/`)
- **Banco de Dados:** PostgreSQL 15+ no Supabase (`supabase/`)
