# Roadmap de Testes Cíclico do Morante Hub (ERP & Mobile)

> Este documento é o **cursor persistente de estado** do roteiro de testes contínuo do Morante Hub.  
> O roteiro é **estritamente cíclico**: ao concluir o Módulo 9, o ciclo recomeça no Módulo 1 (Ciclo N → Ciclo N+1).  
> Sempre que solicitado *"continue os testes"*, a execução retoma exatamente a partir da próxima etapa pendente indicada no cursor abaixo.

---

## 📌 Cursor de Estado Atual

| Campo | Valor |
|---|---|
| **Ciclo Atual** | **Ciclo 1** |
| **Módulo Atual** | **[MÓDULO 3] Logística, Entregas e Montagens (ERP & Mobile)** |
| **Próxima Etapa / Goal** | **Etapa 3.3 - Marcador do Depósito Móveis Morante diferenciado (`🏬`) sem ações de entrega** |
| **Status do Goal** | ⏳ `PRONTO_PARA_EXECUTAR` |
| **Ambiente Ativo** | Local / Staging (Docker inativo no host - usando isolamento in-memory e `testRunId`) |
| **Último testRunId** | `TESTE_HUB_20260917_101000_M2_ALL_APPROVED` |
| **Data da Última Atualização** | 2026-09-17 10:35:00 |

---

## 🛡️ Regras de Ouro e Segurança de Dados

1. **PROIBIDO TOCAR DADOS REAIS**: Qualquer dado inserido, editado ou removido deve conter o identificador `[TESTE_AUT]` ou `testRunId`.
2. **TEARDOWN GARANTIDO**: Todo teste que criar registros no banco de dados deve executar limpeza completa em bloco `finally`.
3. **DOCKER PREFERENCIAL**: Se o comando `docker ps` retornar contêineres ativos, a execução de testes de integração é redirecionada para o contêiner de teste isolado. Caso contrário, utiliza mocks e transações locais seguras.

---

## 🗺️ Mapa de Módulos (Ordem de Criticidade)

```
[MÓDULO 1] Vendas & Pedidos de Venda (SalesOrder)
    ↓
[MÓDULO 2] Estoque, Movimentações, CMPM e CMV
    ↓
[MÓDULO 3] Logística, Entregas e Montagens (ERP & Mobile)
    ↓
[MÓDULO 4] Fiscal (NF-e / NFC-e SEFAZ-PR Direto)
    ↓
[MÓDULO 5] Financeiro, Recebimentos e Contas a Receber
    ↓
[MÓDULO 6] Produtos, Variações & Catálogo Digital
    ↓
[MÓDULO 7] Pessoas, Clientes, Fornecedores & Geocodificação
    ↓
[MÓDULO 8] Catálogo Digital & Integração Meta
    ↓
[MÓDULO 9] Relatórios Gerenciais, DRE & Métricas Comerciais
    ↓
[REINÍCIO DO CICLO] ↺ Retorna ao [MÓDULO 1] (Ciclo N+1)
```

---

## 📋 Grade de Execução do Ciclo 1

### [MÓDULO 1] Vendas & Pedidos de Venda (`SalesOrder`) — Criticidade: ALTA (VITAL)
- [x] **Etapa 1.1**: Código Sequencial Único (`orderIndex`, formato `#00XXXX`, não-nulo, unicidade e blindagem em updates parciais).  
  *Tipo:* Unitário / Integração (`vitest run src/pages/utils/orderChangeDetector.test.ts`) — **12/12 testes aprovados** (2026-09-05)
- [x] **Etapa 1.2**: Ciclo de vida e transições de status (`draft` → `scheduled` / `fulfilled` / `cancelled`).  
  *Tipo:* Unitário / Regra de Negócio (`vitest run src/pages/utils/__tests__/orderStatusTransitionRules.test.ts`) — **14/14 testes aprovados** (2026-09-17)
- [x] **Etapa 1.3**: Ações pós-venda (`PostOrderActionsModal` - não perde código e não reverte status).  
  *Tipo:* Integração / Interface (`vitest run src/pages/utils/__tests__/postSaleActions.test.ts`) — **5/5 testes aprovados** (2026-09-17)
- [x] **Etapa 1.4**: Manuseio de itens e montagens (Preservação estrita, badges amarelo e vermelho, ícone `Drill`).  
  *Tipo:* Unitário / Interface (`vitest run src/pages/App/SalesOrder/OrderHistoryList/OrderAssemblyBadges.test.tsx`) — **10/10 testes aprovados** (2026-09-17)
- [x] **Etapa 1.5**: Cálculos financeiros do pedido (Descontos R$ e %, frete, total líquido, cálculo de troco).  
  *Tipo:* Unitário (`vitest run src/pages/utils/__tests__/calculations.test.ts`) — **7/7 testes aprovados** (2026-09-17)
- [x] **Etapa 1.6**: Modal de pedido em tela cheia (Full screen, scroll do body bloqueado, sem barra vertical nos inputs).  
  *Tipo:* Unitário / Interface (`vitest run src/pages/App/SalesOrder/__tests__/orderModalBehavior.test.tsx`) — **2/2 testes aprovados** (2026-09-17)

### [MÓDULO 2] Estoque, Movimentações, CMPM e CMV — Criticidade: ALTA (VITAL)
- [x] **Etapa 2.1**: Entradas de estoque e recálculo determinístico do CMPM.  
  *Tipo:* Unitário (`vitest run src/pages/utils/__tests__/movingAverageCostRules.test.ts`) — **5/5 testes aprovados** (2026-09-17)
- [x] **Etapa 2.2**: Saída única na efetivação de venda com materialização do CMV histórico.  
  *Tipo:* Unitário (`vitest run src/pages/utils/__tests__/saleInventoryRules.test.ts`) — **5/5 testes aprovados** (2026-09-17)
- [x] **Etapa 2.3**: Idempotência de movimentos (bloqueio contra duplicidade por reenvio ou refresh).  
  *Tipo:* Unitário (`vitest run src/pages/utils/__tests__/inventoryOperationsSafety.test.ts`) — **5/5 testes aprovados** (2026-09-17)
- [x] **Etapa 2.4**: Cancelamento de pedido (estorno de saídas e recomposição do estoque físico).  
  *Tipo:* Unitário (`vitest run src/pages/utils/__tests__/inventoryOperationsSafety.test.ts`) — **5/5 testes aprovados** (2026-09-17)
- [x] **Etapa 2.5**: Devoluções de venda atendidas (entrada com recuperação do CMV histórico da venda).  
  *Tipo:* Unitário (`vitest run src/pages/utils/__tests__/returnInventoryRules.test.ts`) — **3/3 testes aprovados** (2026-09-17)

### [MÓDULO 3] Logística, Entregas e Montagens (ERP & App Mobile) — Criticidade: ALTA (VITAL)
- [x] **Etapa 3.1**: Semântica de agendamento (Períodos sem cadeado e sem `#1, #2, #3`; horário fixo com `🔒`).  
  *Tipo:* Unitário (`vitest run src/features/logistics/utils/scheduleSlots.test.ts`) — **6/6 testes aprovados** (2026-09-17)
- [x] **Etapa 3.2**: Hub de Entregas Mobile (Hoje, Cronograma, Mapa interativo com cards dinâmicos).  
  *Tipo:* Interface E2E Browser Subagent — **Auditado com Sucesso** (2026-09-17)
- [x] **Etapa 3.3**: Marcador do Depósito Móveis Morante diferenciado (`🏬`) sem ações de entrega.
  *Tipo:* Interface E2E
- [x] **Etapa 3.4**: Iniciar Entrega → Tela de etapas → Abrir rota externa no Google Maps Android.  
  *Tipo:* Unitário (`googleMapsNavigationDeliveryFlow.test.ts`) / Mobile
- [ ] **Etapa 3.5**: Mobile Offline-First (Eventos atômicos, ciclo de 4 estados e autoridade do backend).  
  *Tipo:* Unitário / Mock de Sync

### [MÓDULO 4] Fiscal (NF-e / NFC-e SEFAZ-PR Direto) — Criticidade: ALTA (VITAL)
- [ ] **Etapa 4.1**: Lista de itens da venda no modal fiscal (sem numeração fixa `#1, #2...`, destaque para itens temporários).  
  *Tipo:* Interface / Unitário
- [ ] **Etapa 4.2**: Campos tributários padronizados via `<select>` (CFOP, CSOSN/CST, Origem, CEST e `NcmSelect`).  
  *Tipo:* Interface / Schema
- [ ] **Etapa 4.3**: Geração e validação de nós XML contra schemas oficiais do SEFAZ-PR.  
  *Tipo:* Unitário (`vitest run src/pages/utils/nfe/`)
- [ ] **Etapa 4.4**: Emissão de DANFE, cancelamento e contingência.  
  *Tipo:* Integração SEFAZ (Ambiente Homologação com dados `[TESTE_AUT]`)

### [MÓDULO 5] Financeiro, Recebimentos e Contas a Receber — Criticidade: ALTA
- [ ] **Etapa 5.1**: Lançamentos financeiros automáticos na finalização de pedidos.  
  *Tipo:* Integração / Unitário
- [ ] **Etapa 5.2**: Formas de pagamento (Dinheiro, PIX, Cartões, Boleto, Promissória) e baixas parciais/totais.  
  *Tipo:* Unitário / Regra de Negócio
- [ ] **Etapa 5.3**: Fechamento de caixa diário e conciliação por operador.  
  *Tipo:* Integração

### [MÓDULO 6] Produtos, Variações & Catálogo Digital — Criticidade: MÉDIA-ALTA
- [ ] **Etapa 6.1**: Independência de status: Ativo/Desativado no ERP vs Publicado/Oculto no Catálogo.
  *Tipo:* Unitário / Regra de Negócio
- [ ] **Etapa 6.2**: Rascunhos na listagem com bloqueio de ativação e opção de descarte nos 3 pontinhos.
  *Tipo:* Unitário / Interface
- [ ] **Etapa 6.3**: Variações filhas herdando do produto pai e layout (Cards brancos, pai cinza).
  *Tipo:* Unitário (`vitest run src/pages/utils/productVariationDefaults.test.ts`)
- [ ] **Etapa 6.4**: Fotos 1:1 (`SquareImageCropper`) sem bordas internas e livre de Canvas Tainted CORS.
  *Tipo:* Interface E2E
- [ ] **Etapa 6.5**: Responsividade: Cards em `< 1280px` e Tabela em `>= 1280px`.
  *Tipo:* Interface E2E
- [ ] **Etapa 6.6**: Roteiro funcional completo de criação e edição de produto, incluindo a variação principal obrigatória e variações filhas.
  *Tipo:* E2E / Unitário / Contrato
- [ ] **Etapa 6.7**: Roteiro funcional completo de criação e edição de composição, componentes, quantidades e explosão do kit.
  *Tipo:* E2E / Unitário / Integração isolada

#### Matriz complementar obrigatória — Produto, Variações e Composição

Esta matriz complementa os testes existentes (`products-variations-e2e.spec.ts`, `products-draft-flow.spec.ts`, `products-variation-validation.spec.ts` e `compositions.spec.ts`). Cada cenário deve usar `testRunId`, não alterar dados reais e executar teardown. O resultado esperado deve ser afirmado; não basta verificar que a tela continua aberta.

**A. Produto — criação e edição**

| ID | Cenário | Resultado esperado |
|---|---|---|
| P-01 | Abrir “Novo Produto”, cancelar pelo botão e fechar por `X`/Escape | Modal fecha, nenhuma gravação é feita e alterações não confirmadas são descartadas |
| P-02 | Tentar cadastrar sem nome, categoria, preço ou demais campos obrigatórios | Botão fica desabilitado ou erro específico é exibido; não cria produto nem variação órfã |
| P-03 | Criar produto simples | Sistema cria exatamente uma variação principal vendável automaticamente |
| P-04 | Criar produto com categoria que exige atributos | Cada pendência é apontada; cadastro não é concluído enquanto a variação não tiver os valores obrigatórios |
| P-05 | Salvar produto como rascunho, recarregar e retomar | Rascunho permanece na lista, com badge, dados preservados e ações de continuar/descartar disponíveis |
| P-06 | Concluir rascunho | Produto deixa de ser rascunho, fica elegível à ativação/publicação conforme regra e não reabre modal de canais indevidamente |
| P-07 | Editar produto cadastrado e salvar | Alterações persistem após recarregar; não cria novo UUID, nova variação automática ou modal de canais |
| P-08 | Editar produto e cancelar/fechar sem salvar | Nenhuma alteração parcial é persistida |
| P-09 | Ativar/desativar ERP e publicar/ocultar catálogo em combinações independentes | Cada botão altera somente seu próprio status; rascunho continua bloqueado |
| P-10 | Usar menu de três pontos: editar, duplicar/ações disponíveis e descartar rascunho | Cada ação abre a confirmação/tela correta; exclusão de rascunho não remove produto cadastrado por engano |
| P-11 | Recarregar durante salvamento ou clicar duas vezes em salvar | Operação é atômica/idempotente, sem duplicar produto, variação ou requisição |
| P-12 | Informar preço de venda, preço promocional, custo, estoque inicial, estoque mínimo e dimensões/peso | Máscaras, limites e conversões numéricas são corretos; preço promocional não supera o preço normal; valores persistem no pai/variação correto |
| P-13 | Cadastrar/editar dados fiscais obrigatórios e inválidos | Campos aceitam somente valores válidos, exibem erro por campo e não salvam cadastro inconsistente |
| P-14 | Associar/remover categoria com atributos obrigatórios | Associação não inventa valores; pendências aparecem na conciliação e remover a obrigatoriedade não apaga atributos já salvos |
| P-15 | Upload, troca, remoção e limite de fotos do produto | Foto principal, ordem e remoção persistem; limite é respeitado e erro de upload não salva URL quebrada |
| P-16 | Editar produto com falha de rede/permissão durante o salvamento | Botão entra em estado de processamento, erro é informado e o formulário não finge sucesso nem perde dados locais |
| P-17 | Importar/sincronizar produto externo ou do WhatsApp | Produto nasce como rascunho, com uma variação válida, sem sobrescrever SKU/UUID existente e com retry idempotente |
| P-18 | Clicar em cada item pendente dos indicadores ERP/Catálogo | Formulário navega para a aba/campo correto, mantém o erro destacado e não altera dados ao apenas navegar |
| P-19 | Tentar abrir Características e Descrição sem categoria, nome ou requisitos prévios | Aba fica bloqueada com indicação visual/tooltip; ao corrigir o pré-requisito, desbloqueia sem perder os dados já digitados |
| P-20 | Alternar “Diferenciar Título no Catálogo” ligado/desligado | Campo de título aparece/desaparece; desligar sincroniza título e marketplaceTitle com o nome, sem apagar o nome interno |
| P-21 | Criar produto do tipo serviço | Abas de estoque, variações e fotos incompatíveis não aparecem; validações e salvamento não exigem dados físicos indevidos |
| P-22 | Navegar por todas as abas antes de salvar e voltar à aba anterior | Dados permanecem intactos, aba ativa e indicadores de erro continuam coerentes |
| P-23 | Clicar em “Próxima etapa” com erro pendente e no botão “Salvar alterações” enquanto salva | Fluxo não avança sem requisito; botão de salvar mostra processamento, fica protegido contra duplo clique e restaura estado após sucesso/erro |
| P-24 | Abrir/fechar gerenciador de categorias a partir do formulário | Abre a tela correta sem submeter o produto, e o retorno/recarregamento atualiza categorias sem duplicar seleção |
| P-25 | Editar produto publicado removendo título, descrição, foto, preço ou dimensão obrigatória | Sistema impede a alteração enquanto publicado ou exige despublicação; status e dados anteriores permanecem íntegros |
| P-26 | Duplicar produto simples e produto com múltiplas variações | Novo pai e novas variações recebem UUIDs próprios e SKUs não conflitantes; nenhum pedido, movimento, fornecedor ou histórico é copiado como fato |
| P-27 | Restaurar produto da lixeira e alternar filtros ativo/desativado/lixeira | Produto restaurado reaparece no filtro correto, sem reativar/publicar automaticamente nem perder variações |
| P-28 | Excluir produto com variação usada em venda, estoque, compra, composição ou assistência | Exclusão física é bloqueada ou convertida em inativação controlada; históricos e vínculos permanecem consultáveis |
| P-29 | Abrir histórico de vendas, movimentações e etiquetas a partir do produto/variação | A ação usa `variationId` UUID da linha, mostra somente os fatos da variação correta e permite impressão sem alterar cadastro |
| P-30 | Gerar mensagem/enviar produto por WhatsApp | Usa preço promocional válido quando existente, SKU e nome atuais; falha de clipboard/compartilhamento informa erro sem alterar produto |
| P-31 | Alterar SKU de variação já presente em venda, compra, recebimento, devolução, inventário, assistência e relatório | Todos os históricos continuam localizáveis pelo UUID original; SKU antigo permanece apenas como snapshot/comercial quando aplicável |
| P-32 | Abrir Produtos com perfil sem `viewProducts`, `productConfig` ou `deleteProducts` | Tela e ações são ocultadas/bloqueadas conforme permissão; tentativa direta não permite mutação e não expõe dados indevidos |
| P-33 | Selecionar vários produtos e usar lixeira, restaurar e exclusão permanente | Seleção é por UUID, confirmação aparece, sucesso parcial é reportado por item e nenhuma linha não autorizada é alterada |
| P-34 | Publicar produto/variação e simular falha de persistência | Alteração otimista é revertida na interface, status anterior permanece e não aparece sucesso falso |
| P-35 | Cadastrar estoque inicial simples, múltiplos lotes e estoque inicial em cada variação | Cada entrada gera movimento único com `variationId`, custo final correto, IPI/frete aplicados e sem lançar quantidade zero/negativa |
| P-36 | Salvar fornecedor principal e fornecedores/códigos alternativos | Fornecedor obrigatório é validado, códigos são normalizados e a alteração não quebra vínculos de compra ou recebimento |
| P-37 | Configurar alertas de estoque mínimo/zero no cadastro e editar depois | Configuração persiste por produto/variação, respeita o toggle mestre e não dispara alerta para rascunho/inativo indevidamente |
| P-38 | Pesquisar, filtrar, ordenar, paginar e alternar colunas na listagem | Resultado, contagem, página, filtros e visibilidade de colunas permanecem coerentes; seleção não atravessa páginas por engano |
| P-39 | Publicar produto com múltiplas variações sem preço válido em uma delas | Publicação é bloqueada ou aponta a variação pendente; não considera apenas a existência da lista de variações como preço válido |
| P-40 | Publicar produto sem foto do pai, mas com foto explícita em uma variação | Regra de catálogo usa a foto efetiva permitida pelo domínio e o feed não publica item sem imagem válida |
| P-41 | Preencher unidade, condição, marca, código de barras, SEO, ambiente, linha e complementos do título | Valores e máscaras persistem, entram no título somente quando configurados e não alteram SKU/UUID |
| P-42 | Configurar oportunidade de venda, produto usado/salvado e campos “não se aplica” | Estado comercial e campos de exceção são preservados na edição e não são confundidos com campo vazio obrigatório |
| P-43 | Salvar produto com aviso de estoque mínimo/zero desligado e ligado | Configuração é persistida, o toggle mestre controla os avisos e não cria movimentação de estoque por si só |
| P-44 | Usar ações de IA para sugerir categoria, título, descrição, NCM, dados fiscais e preço | Cada ação exige os pré-requisitos, mostra loading, permite aceitar/descartar a sugestão e não sobrescreve silenciosamente dados existentes |
| P-45 | Alterar o contexto enquanto uma sugestão de NCM/IA está em andamento ou atingir quota/erro | Resultado obsoleto não é aplicado, loading termina, mensagem é exibida e o formulário continua editável |
| P-46 | Usar `Ctrl/Cmd+S`, Escape e fechar enquanto há modal de categoria, conversão ou variação pendente | Atalho salva uma vez; Escape fecha somente a camada ativa; variação nova não salva é removida e alterações do pai não são descartadas indevidamente |
| P-47 | Converter produto simples para estrutura com variação e retornar ao cadastro | Código/estoque migram para a variação principal, pai e variação ficam coerentes e nenhum UUID/histórico é recriado |
| P-48 | Verificar se cada ação de IA, conversão e geração de variações está realmente acessível por botão no formulário | Ação declarada no hook tem caminho de UI, loading e resultado; função sem botão/prop conectada fica registrada como bloqueio, não como cobertura |

**B. Variações — sempre obrigatórias no produto**

| ID | Cenário | Resultado esperado |
|---|---|---|
| V-01 | Abrir aba Variações em produto novo | Existe uma variação principal; nunca existe produto sem variação |
| V-02 | Tentar excluir a única variação | Ação é bloqueada com mensagem; a variação principal permanece |
| V-03 | Adicionar variação sem atributo na principal | Botão é desabilitado ou fluxo redireciona para Identificação e Atributos com mensagem clara |
| V-04 | Adicionar variação com combinação válida de atributos | Nova filha é criada uma única vez, com UUID próprio, SKU/nome coerentes e sem duplicidade |
| V-05 | Repetir a mesma combinação de atributos | Cadastro é bloqueado; não cria segunda variação com a mesma combinação |
| V-06 | Editar nome, SKU, preço, estoque, dimensões, peso, fiscal e fotos da variação | Valores persistem na variação correta; UUID permanece imutável e SKU continua sendo código comercial único |
| V-07 | Alterar dados do pai com herança habilitada/desabilitada | Apenas campos configurados para sincronização são propagados; sobrescritas explícitas são preservadas |
| V-08 | Alternar `showName` em atributos | Atributo continua salvo para filtros/regras, mas só os valores visíveis compõem o nome |
| V-09 | Excluir/editar variação filha vinculada a venda, estoque ou composição | Sistema aplica bloqueio ou confirmação/regra de integridade; nunca troca UUID nem rompe vínculos históricos |
| V-10 | Abrir/fechar modal de variação, concluir e cancelar | Concluir grava somente a variação; cancelar descarta mudanças; sem loop, tela branca ou `Maximum update depth exceeded` |
| V-11 | Trocar SKU de uma variação existente | SKU pode mudar se único; UUID e referências de vendas, estoque, compras e composição permanecem iguais |
| V-12 | Ultrapassar o limite de fotos da variação ou inserir URLs repetidas | Operação é bloqueada com mensagem; não grava duplicatas nem excede o limite |
| V-13 | Mover variação para outro produto pai | Exige UUID válido, preserva dados permitidos e vínculos, gera SKU coerente e trata atomicamente erro da RPC |
| V-14 | Mesclar variação não canônica em variação canônica | Relações são transferidas, origem fica inativa/oculta, UUID canônico é preservado e histórico não é perdido |
| V-15 | Editar fornecedor/códigos de fornecedor da variação | Permite vários códigos por fornecedor, impede conflito da tupla e mantém auto-match de códigos históricos |
| V-16 | Desativar/publicar uma variação individual dentro de pai ativo | Estado da variação respeita a regra do catálogo; item oculto não aparece no feed nem fica selecionável para venda |
| V-17 | Alternar preço herdado/personalizado | Campo personalizado fica bloqueado quando herdado; ao personalizar, permite edição sem alterar o preço do pai; ao reativar herança, retoma o valor vigente do pai |
| V-18 | Aplicar desconto percentual e fixo na variação | Valores são limitados ao intervalo válido, cálculo não gera preço negativo e alternância de modo preserva apenas o valor aplicável |
| V-19 | Alternar descrição sincronizada/manual e editar a descrição | Texto herdado fica somente leitura; modo manual permite edição; alteração do pai só propaga quando sincronizado |
| V-20 | Alternar sincronização de característica técnica e “aplica-se/não se aplica” | Campo herdado fica bloqueado; override é persistido, reversível e não cria vínculo incorreto com o pai |
| V-21 | Adicionar atributo/valor existente, cadastrar novo valor e remover atributo | Busca, cadastro e remoção atualizam a combinação sem duplicar valor e sem deixar atributo sem valor ao concluir |
| V-22 | Abrir seletor de fotos do pai, ordenar, definir principal e remover foto da variação | Herança e fotos explícitas ficam distintas; ordem/principal persistem e a remoção não apaga foto do pai |
| V-23 | Abrir a variação mesclada no menu de ações | Interface informa que ela é mantida apenas para histórico e não oferece ações destrutivas |
| V-24 | Tentar mover/mesclar sem fornecedor, sem atributo válido, com UUID inválido, alvo igual à origem ou alvo inexistente | Operação é bloqueada antes da RPC, mensagem específica é exibida e nenhuma alteração parcial ocorre |
| V-25 | Executar mover/mesclar com falha, concorrência ou cancelamento do modal | RPC é atômica, não há troca parcial de pai/UUID/status e o usuário pode cancelar sem mutação |
| V-26 | Consultar histórico após alterar SKU ou mover pai | Busca e filtros priorizam UUID; fallback por SKU só atende legado de leitura e não mistura variações diferentes |
| V-27 | Tentar mesclar em ambiente sem `merged_to_variation_id`, histórico de merge ou FK de estoque validada | Funcionalidade permanece bloqueada com aviso operacional; não é permitido liberar o fluxo apenas pelo botão da interface |
| V-28 | Cadastrar estoque inicial da variação em lote único e múltiplos lotes | Movimentos apontam para o UUID da variação, somam quantidades uma vez e calculam custo com IPI/frete de cada lote |
| V-29 | Editar fiscal, condição, frete e IPI com sincronização ligada/desligada | Herdado bloqueia edição e acompanha o pai; personalizado persiste somente na variação e não altera outra variação |
| V-30 | Informar código de barras duplicado, vazio e válido | Duplicidade é bloqueada ou explicitamente resolvida; código válido persiste na variação correta e não substitui o UUID |
| V-31 | Salvar variação com nome/título gerado por atributos em ordens diferentes | Nome, título e marketplaceTitle respeitam a ordem dos atributos e não duplicam o nome do pai |
| V-32 | Publicar variação com foto própria quando o pai não tem foto e ocultar depois | Validação usa a imagem efetiva da variação; ocultar remove o item do feed sem alterar a foto do pai |
| V-33 | Categoria exige atributo e variação possui apenas característica técnica preenchida | Pendência de atributo continua sendo apontada; característica técnica não substitui o valor obrigatório da categoria |
| V-34 | Abrir dados fiscais da variação e editar NCM, CEST, origem, CST/CSOSN, CFOP, PIS/COFINS e ISS | Aba/fluxo fiscal existe quando aplicável, valida cada campo e persiste no UUID da variação; se não existir, registra defeito de cobertura de interface |
| V-35 | Sincronizar/desvincular custo, condição, fiscal, IPI e frete do pai | Cada flag controla somente seu campo correspondente, sem propagar campos não selecionados |
| V-36 | Produto com variação simples sem atributos versus variação com atributos visíveis/ocultos | Produto simples mantém a variação principal; nomes de variações com `showName` não concatenam o pai duas vezes |
| V-37 | Gerar variações por combinações cartesianas com valores válidos, vazios e repetidos | Combinações esperadas são geradas uma vez, sem atributos vazios/duplicados e com SKU distinto |
| V-38 | Regenerar SKUs genéricos e colidentes | Somente SKUs genéricos são regenerados, limite de tamanho é respeitado e UUID, atributos e histórico permanecem iguais |
| V-39 | Remover variação filha com movimentação, sem movimentação e remover a última variação | Uso bloqueia exclusão com mensagem; variação livre pode ser excluída; a última nunca deixa o produto sem variação |
| V-40 | Criar variação nova, abrir modal e cancelar por botão, X ou Escape | Variação pendente é removida do estado; variações existentes não sofrem alteração parcial |
| V-41 | Editar uma variação pela linha, pelo menu e pelo modo de composição | Todos os pontos abrem o mesmo UUID correto, salvam uma vez e não editam outra linha por índice visual |
| V-42 | Abrir o modal cartesiano e regenerar SKUs a partir da aba Variações | Botões existem e chamam os handlers corretos; se `onOpenCartesianModal`/`regenerateAllSkus` não forem passados pelo modal principal, registrar caminho não conectado |

**C. Composição — criação, edição e componentes**

| ID | Cenário | Resultado esperado |
|---|---|---|
| C-01 | Abrir “Nova Composição” e cancelar/fechar | Modal fecha sem registro parcial; lista permanece inalterada |
| C-02 | Salvar sem nome, SKU ou componente obrigatório | Botão bloqueia ou exibe erro específico; nenhuma composição incompleta é criada |
| C-03 | Criar composição com um ou mais produtos/variações reais | Nome/SKU e componentes são persistidos; toast de sucesso aparece uma única vez |
| C-04 | Adicionar componente, aumentar/diminuir quantidade e informar zero, negativo ou decimal inválido | Quantidade válida é aceita; limites inválidos são bloqueados e o total é recalculado corretamente |
| C-05 | Adicionar o mesmo componente duas vezes | Sistema consolida a quantidade ou bloqueia duplicidade conforme regra; nunca gera linhas conflitantes |
| C-06 | Remover componente pelo botão de lixeira e cancelar a remoção, se houver confirmação | Componente só desaparece após confirmação; estado vazio aparece quando não houver itens |
| C-07 | Pesquisar por nome/SKU, limpar pesquisa e fechar seletor | Resultados corretos são exibidos; fechar não adiciona item; não há seleção acidental |
| C-08 | Editar composição existente (nome, SKU, componentes e quantidades) e salvar | Alterações persistem após recarregar, preservam UUID da composição e mantêm os componentes corretos |
| C-09 | Editar composição e cancelar/fechar | Valores originais permanecem; não salva alterações parciais |
| C-10 | Tentar composição circular (composição contendo a si mesma ou ciclo entre composições) | Sistema bloqueia com mensagem de regra; não cria ciclo de explosão |
| C-11 | Componente desativado, rascunho ou variação inexistente | Seleção é bloqueada ou sinalizada; não permite vínculo inválido |
| C-12 | Excluir composição pelo menu de ações | Confirmação/controle de permissão aparece; exclusão não remove produtos/variações componentes |
| C-13 | Recarregar ou clicar duas vezes em salvar | Composição e itens são gravados uma única vez, sem duplicidade |
| C-14 | Selecionar composição em novo pedido | Composição explode para componentes originais com quantidades multiplicadas; a linha do kit não substitui silenciosamente os itens reais |
| C-15 | Alterar composição depois de uma venda existente | Snapshot/histórico da venda permanece intacto; nova composição vale apenas para operações futuras |
| C-16 | Alternar `pricing_mode` entre soma, preço fixo e desconto | Total/preço manual é calculado conforme o modo; valores inválidos não são aceitos e a mudança persiste |
| C-17 | Consultar disponibilidade com estoque zero, negativo, múltiplos componentes e quantidade maior que um | Disponibilidade é o menor quociente por componente, nunca negativa, e considera a variação correta |
| C-18 | Salvar composição quando a atualização dos itens falha após apagar itens antigos | Operação é transacional ou recuperável; não deixa composição sem itens nem informa sucesso falso |
| C-19 | Alternar ativo/inativo e publicado/oculto da composição | Estados são independentes; composição inativa/oculta não é retornada em seletores/ catálogo conforme regra |
| C-20 | Editar a variação da composição (nome, SKU, atributos e ativo) | UUID da variação da composição é preservado, SKU único é validado e itens continuam vinculados à variação correta |
| C-21 | Tentar salvar item sem `product_id`, com `variation_id` inexistente ou quantidade fracionária | Banco/UI bloqueia o vínculo inválido e a composição permanece no estado anterior |
| C-22 | Excluir composição com pedidos ou movimentos históricos vinculados | Sistema bloqueia ou faz inativação controlada; nunca apaga fatos históricos nem componentes usados no histórico |
| C-23 | Adicionar componente sem fornecedor, de fornecedor diferente ou outra composição | Busca respeita o fornecedor do pai, exclui composições quando aplicável e impede vínculo incompatível |
| C-24 | Adicionar linha vazia e tentar concluir sem selecionar produto | Linha inválida é destacada ou removida; não grava componente com identificador vazio |
| C-25 | Editar quantidade para vazio, texto, zero, negativo, decimal e valor muito grande | Campo aceita somente inteiro maior que zero dentro do limite; subtotal e disponibilidade não usam `NaN`/zero indevido |
| C-26 | Verificar preço unitário e preço sugerido dos componentes | Preço vem do produto/variação selecionado, subtotal é quantidade × preço e a sugestão soma todos os componentes sem arredondamento indevido |
| C-27 | Reabrir seletor após selecionar componente e pesquisar outro | Item já selecionado permanece intacto; novo resultado não substitui linha anterior nem duplica seleção |
| C-28 | Salvar composição sem componentes e tentar selecioná-la em uma venda | Sistema bloqueia a conclusão ou sinaliza composição vazia; não gera baixa de estoque artificial |
| C-29 | Editar composição com uma variação e remover todos os itens | Regra de composição vazia é aplicada explicitamente; estado salvo não fica diferente do estado mostrado na tela |
| C-30 | Atualizar componente para outra variação do mesmo produto | `product_id` e `variation_id` ficam coerentes, descrição/preço/estoque são atualizados e histórico anterior não é alterado |
| C-31 | Duplicar composição com uma ou várias variações | Nova composição/variação recebe UUID e SKU próprios, componentes são copiados como configuração sem copiar vendas/movimentos históricos |
| C-32 | Inativar composição usada em pedido ou estoque e consultar histórico | Operação preserva fatos anteriores, remove a composição apenas de seletores futuros e mantém leitura do histórico |
| C-33 | Selecionar componente via SKU, código de fornecedor e UUID | SKU/código servem apenas para localizar; após seleção e gravação, o vínculo persistido é o UUID da variação |
| C-34 | Composição contendo uma variação cujo SKU foi alterado | Composição continua apontando para a mesma variação pelo UUID e exibe o novo código sem recriar o item |
| C-35 | Tentar selecionar outra composição como componente | Autocomplete não oferece composição ou o salvamento bloqueia o ciclo; nenhuma composição aninhada inválida é gravada |
| C-36 | Salvar item com quantidade não inteira apesar de alteração direta no payload | Constraint/validador rejeita valor fracionário e mantém a versão anterior dos itens |
| C-37 | Composição com produto pai e variação filha do mesmo produto | Sistema aplica regra explícita para não contar estoque duas vezes nem criar componentes ambíguos |
| C-38 | Falha ao recalcular disponibilidade ou RPC indisponível | Tela informa indisponibilidade, não exibe estoque como zero válido e não permite concluir operação dependente de cálculo inconsistente |
| C-39 | Tentar ativar/publicar composição com zero, um e dois componentes válidos | Ativação exige pelo menos dois componentes quando essa é a regra do validador; mensagem aponta o requisito e não ativa parcialmente |
| C-40 | Inativar um componente e tentar ativar/usar a composição | Seleção e validação tratam componente inativo explicitamente; composição não promete disponibilidade com item indisponível |
| C-41 | Criar composição pela rota `/products/compositions`, recarregar e encontrá-la no seletor de venda | Cadastro, consulta, preço, variação e itens usam o mesmo contrato/persistência; se `products.item_type=composition` não aparecer em `getCompositions`, registrar bloqueio de integração |
| C-42 | Editar composição pelo formulário de produto versus serviço `saveComposition` | Os dois caminhos não podem criar modelos incompatíveis nem sobrescrever itens; se um caminho não for usado, marcá-lo como legado/fora de operação |
| C-43 | Alterar preço/estoque de componente após composição criada e abrir venda novamente | Preço e disponibilidade futuros são recalculados conforme a regra, sem modificar snapshot de venda já gravada |
| C-44 | Usar gerar nome da composição por IA com lista vazia, sucesso e erro | Sem componentes exibe aviso; com componentes mostra loading e aplica resultado somente após sucesso, sem apagar componentes |

**D. Ambientes e Categorias — criação, vínculos e órfãs**

| ID | Cenário | Resultado esperado |
|---|---|---|
| AC-01 | Abrir tela/modal de Ambientes e Categorias | Exibe abas/visualização por Ambiente e por Categoria, contador de categorias órfãs e botões de novo ambiente e nova categoria |
| AC-02 | Filtrar categorias por Todas, Com Ambiente e Sem Ambiente (Órfãs) | Lista filtra reativamente; categorias órfãs (parents vazio) são isoladas; badge de total de órfãs reflete a contagem exata |
| AC-03 | Busca textual por nome de ambiente e categoria | Busca case-insensitive e com trim filtra instantaneamente na lista; termo sem match exibe lista vazia |
| AC-04 | Criar novo ambiente com nome válido | Ambiente é salvo com nome em maiúsculas (UPPERCASE), tipo 'environment' e aparece na lista sem recarregar a tela inteira |
| AC-05 | Tentar criar ambiente ou categoria com nome vazio ou apenas espaços | Validação bloqueia o salvamento e alerta que o nome não pode estar vazio |
| AC-06 | Tentar criar ambiente ou categoria com nome duplicado | Validação bloqueia e alerta duplicidade (case-insensitive); não cria registro repetido |
| AC-07 | Editar nome de ambiente/categoria mantendo o próprio nome | Sistema permite salvar sem acusar falsa duplicidade contra si mesmo |
| AC-08 | Vincular e desvincular categorias a um ambiente pelo modal | Relacionamento N:N (`category_relationships`) é atualizado atomicamente; a categoria passa a exibir o novo ambiente |
| AC-09 | Desvincular categoria de um ambiente diretamente na lista | Categoria perde o vínculo com o ambiente selecionado, mas continua existindo no sistema; se não tiver outros ambientes, passa a ser contada como órfã |
| AC-10 | Tentar excluir ambiente com categorias vinculadas | Exclusão é bloqueada com mensagem explícita orientando a desvincular ou remover as categorias antes |
| AC-11 | Excluir ambiente sem categorias vinculadas | Ambiente é removido do sistema com confirmação destrutiva e lista é atualizada |
| AC-12 | Associar características/atributos a uma categoria no modal | Atributos selecionados são vinculados na tabela `category_attributes`; formulário exibe checkbox roxo marcado |
| AC-13 | Desmarcar características de uma categoria | Desmarcação remove o vínculo de `category_attributes` sem apagar os atributos globais do sistema |
| AC-14 | Tentar excluir categoria com produtos vinculados | Sistema bloqueia com mensagem informando a quantidade de produtos vinculados (direto + N:N) |
| AC-15 | Excluir categoria com zero produtos vinculados | Categoria é removida com sucesso, limpando em cascata relacionamentos de ambiente e de atributos |
| AC-16 | Acessar atalho de categorias órfãs pelo cabeçalho | Alterna imediatamente a visão para Categoria e aplica o filtro 'Sem Ambiente' |

**E. Características e Atributos Globais — menu de atributos e variações**

| ID | Cenário | Resultado esperado |
|---|---|---|
| AT-01 | Abrir modal de Atributos e Variações | Lista todos os atributos cadastrados em ordem alfabética com suas opções/valores e tipo de dado |
| AT-02 | Criar nova característica com tipo de dado (texto, inteiro, decimal, lista) | Atributo é persistido com tipo correspondente (`text_short`, `integer`, `decimal`, `radio`), unidade opcional e flag de obrigatoriedade global |
| AT-03 | Tentar criar característica com nome vazio ou tipo inválido | Validação bloqueia e alerta o usuário antes de submeter ao backend |
| AT-04 | Tentar cadastrar característica com nome duplicado | Validação bloqueia e alerta duplicidade (case-insensitive) |
| AT-05 | Editar nome, tipo ou unidade de característica existente | Alterações persistem no ID original sem alterar o histórico de produtos vinculados |
| AT-06 | Adicionar opção/valor a uma característica (ex: Cor -> Azul) | Novo valor é inserido em `attribute_values` vinculado ao `attribute_id` e exibido na lista expandida |
| AT-07 | Tentar adicionar opção com valor vazio ou duplicado na mesma característica | Validação bloqueia e informa que o valor não pode estar vazio ou já está cadastrado |
| AT-08 | Excluir uma opção/valor da característica | Opção é removida de `attribute_values` após confirmação |
| AT-09 | Excluir característica global | Alerta de confirmação avisa que removerá a característica e todos os seus valores; cascata remove `attribute_values` e a linha em `attributes` |
| AT-10 | Alternar obrigatoriedade global (Obrigatória / Opcional) | Flag `is_globally_required` é atualizada e respeitada nos cadastros de produto |
| AT-11 | Consultar características disponíveis na seleção de categoria | Lista de características no `CategoryAttributesPicker` reflete imediatamente os atributos cadastrados no gerenciador |
| AT-12 | Falha de carregamento ou rede no modal de características | Exibe mensagem de erro amigável com opção de tentar novamente sem quebrar o aplicativo |

**F. Critérios de evidência e cobertura**

- Toda ação de botão deve validar visibilidade, habilitado/desabilitado, confirmação, toast/erro e efeito persistido.
- Os cenários de produto devem executar pelo menos uma vez com produto simples (1 variação) e uma vez com produto com múltiplas variações.
- Os cenários de composição devem usar componentes por `variation_id`/UUID, não por SKU, e verificar que o UUID não muda em edição.
- Devem ser cobertos os modos de preço (`sum`, `fixed`, `discount`), disponibilidade por menor quociente, composição sem itens e falha entre atualização do cabeçalho e dos itens.
- A auditoria deve incluir operações especiais de variação: limite de fotos, mover para outro pai, mesclar em variação canônica e códigos de fornecedor.
- Também devem ser cobertos os indicadores de requisitos, bloqueio/desbloqueio das abas, produto serviço, título do catálogo, sincronizações pai/filha, descontos e herança de fotos.
- Na composição, validar explicitamente fornecedor, linha vazia, tipos/limites de quantidade, preço sugerido, reabertura do seletor e composição sem componentes.
- A troca de SKU deve ser verificada nos históricos de venda, compra, recebimento, devolução, inventário, assistência, estoque e relatórios; SKU é código comercial, nunca identidade relacional.
- Duplicação, lixeira, restauração, histórico, etiquetas e WhatsApp são ações da listagem que também precisam comprovar não duplicação de fatos nem mutação indevida do cadastro.
- Mover/merge não pode ser considerado aprovado enquanto RPC transacional, `merged_to_variation_id`, FK/tipo de `inventory_moves.variation_id` e histórico auditável não estiverem disponíveis.
- Incluir cobertura de permissões, ações em lote, rollback de publicação, estoque inicial por variação, custos de lote, fornecedor, alertas e paginação.
- Composição deve impedir composição aninhada/circular, duplicidade de estoque pai/filha e sucesso visual quando a disponibilidade não pôde ser calculada.
- A publicação deve validar preço e imagem efetivos por variação, e atributos obrigatórios de categoria não podem ser substituídos por características técnicas.
- O roteiro deve comprovar os campos comerciais/fiscais/SEO do pai e da variação; ausência de aba ou persistência fiscal da variação é defeito, não cenário aprovado.
- A aba de variações também exige cobertura de geração cartesiana, regeneração de SKU, cancelamento de variação pendente e exclusão condicionada por movimentação.
- As ações de IA e atalhos/fechamentos são parte do formulário e devem ter evidência de loading, cancelamento, erro e não sobrescrita.
- O contrato de composição precisa ser conferido entre a rota de cadastro, `productMutationService`, `compositionService` e `useProductSearch`; divergência de tabelas/modelos é bloqueio de integração, não cobertura presumida.
- Funções declaradas em hooks, mas não passadas como props pelo `ProductFormModal` (`handleGenerateComboName`, `handleAutoFillFiscalWithAI`, conversão, modal cartesiano e regeneração de SKU), devem permanecer como `AVISO` de caminho não conectado até existir botão real.

#### Auditoria de rastreabilidade — cenário → implementação → persistência

Legenda: `COBERTO` = existe cenário verificável e caminho implementado; `AVISO` = cenário existe, mas há defeito, caminho alternativo não conectado ou pré-requisito ausente; `LEGADO` = código existe, porém não é usado pelo fluxo principal e não deve ser tratado como cobertura do fluxo atual.

| Regra/comportamento auditado | Implementação percorrida | Cenários correspondentes | Resultado |
|---|---|---|---|
| Criação, edição e salvamento de produto | `ProductFormModal.tsx`, `useProductFormModal.ts`, `useProductFormSubmit.ts` (`handleSubmit`, `saveDraftManually`), `productMutationService.ts` (`saveProduct`, `updateProduct`) | P-01–P-08, P-11, P-16, P-22–P-24, P-46 | COBERTO; persistência e erro ainda exigem execução isolada |
| Produto pai e variação principal obrigatória | `productVariationDefaults.ts:ensureDefaultVariation`, `useProductFormVariations.ts` | P-03, V-01, V-02, V-36, V-39 | COBERTO; serviço é exceção explícita e precisa ser confirmado como regra de negócio |
| Criar/remover variações e variações pendentes | `ProductVariationsTab.tsx`, `useProductFormVariations.ts` (`addVariation`, `removeVariation`), `ProductFormModal.tsx` | V-02–V-05, V-37, V-39–V-40 | COBERTO |
| Editar variação por UUID | `VariationFormModal.tsx`, `useVariationForm.ts`, `productVariationActionsService.ts` (`saveVariation`) | V-06, V-10–V-11, V-41 | COBERTO; qualquer fallback por índice/SKU é risco legado |
| Geração cartesiana e regeneração de SKU | `useProductFormVariations.ts:generateBulkVariations/regenerateAllVariationSkus`, `productSkuService.ts` | V-04–V-05, V-37–V-38 | COBERTO |
| Mover variação de pai | `MoveVariationFamilyModal.tsx`, `useMoveVariationFamily.ts`, `moveVariationToFamily`, RPC `move_variation_to_parent` | V-13, V-24–V-26 | AVISO; RPC transacional e UUID válido existem, mas o contrato ainda não foi executado em banco isolado |
| Mesclar variação canônica | `MergeVariationModal.tsx`, `mergeVariationIntoCanonical`, RPC `merge_product_variation_into_canonical`, ADR-003 e auditoria de UUID | V-14, V-23–V-27 | AVISO/BLOQUEADO; RPC transacional existe, mas FK, histórico operacional e concorrência ainda aguardam integração isolada |
| Informações técnicas e atributos obrigatórios | `ProductTechnicalTab.tsx`, `VariationTechnicalTab.tsx`, `VariationAttributeValueInput.tsx`, `productVariationDefaults.ts`, `pendencyDetector.ts` | P-04, P-14, P-18–P-19, V-03, V-08, V-20–V-21, V-33 | COBERTO; exige diferenciar atributo de categoria de característica técnica |
| Herança pai → variação e sobrescrita | `variationParentSync.ts`, `VariationPricingTab.tsx`, `VariationTechnicalTab.tsx`, `useProductFormSync.ts` | P-07, V-07, V-17–V-20, V-29, V-35 | COBERTO |
| Nome, título, `showName` e ordem dos atributos | `ProductGeneralTab.tsx`, `VariationIdentificationTab.tsx`, `productVariationDefaults.ts` | P-20, P-41, V-08, V-31, V-36 | COBERTO |
| SKU, código de barras e identidade UUID | `productSkuService.ts`, `productMutationService.ts`, `productVariationActionsService.ts`, ADR-003 | P-26, P-31, V-04–V-06, V-11, V-26, V-30, V-38 | COBERTO; históricos legados por SKU permanecem risco conhecido |
| Preço, promoção, desconto, custo e preço sugerido | `ProductPricingFields.tsx`, `VariationPricingTab.tsx`, `productPricing.ts`, `useProductFormAi.ts` | P-12, P-44, V-06, V-17–V-18, C-16, C-26, C-43 | COBERTO; publicação por preço efetivo ainda tem risco |
| Estoque inicial, lotes, IPI e frete | `ProductInventoryTab.tsx`, `useProductFormPricing.ts`, `productMutationService.ts` | P-12, P-35, V-28 | COBERTO |
| Fiscal/NCM no produto | `ProductFiscalTab.tsx`, `ProductNcmSelector.tsx`, `productFiscalDefaults.ts`, `useProductFormAi.ts` | P-13, P-44–P-45 | COBERTO |
| Fiscal específico da variação | `VariationFiscalTab.tsx` existe, mas não é incluído em `VariationFormModal.getFormTabs()` | V-06, V-29, V-34–V-35 | AVISO; cenário registra ausência de integração da aba |
| Fotos do pai, crop, limite, ordem e fotos da variação | `useProductFormImages.ts`, `ProductEcommerceTab.tsx`, `VariationPhotosTab.tsx`, `SquareImageCropper.tsx` | P-15, P-40, V-06, V-12, V-22, V-32 | COBERTO |
| Fornecedor e códigos de fornecedor | `ProductSupplierField.tsx`, `productSupplierCodesService.ts`, regras de supplier codes | P-02, P-36, V-15, C-23, C-33 | COBERTO |
| Ativo/inativo, rascunho e publicado/oculto | `ProductFormFooter.tsx`, `useProductFormSubmit.ts`, `useProducts.ts`, `useProductsCatalogActions.ts` (`persistCatalogStatus`), `productActivationState.ts` | P-05–P-06, P-09, P-25, P-27, P-34, V-16, C-19, C-32 | AVISO; rollback de publicação e permissões precisam ser comprovados |
| Validação de publicação por preço/imagem efetivos | `validateCatalogPublication`, `checkEcomLegibility`, `checkERPLegibility` | P-39–P-40, V-16, V-32 | AVISO; `checkEcomLegibility` considera apenas a existência da lista de variações para preço |
| Exclusão, restauração, dependências e lixeira | `productDependencyCheck.ts` (`checkProductLinkedToSales`, `checkProductHasMoves`, `checkProductIsUsed`, `checkVariationIsUsed`), `useProducts.ts`, `useDeleteVariation.ts`, ações da lista | P-27–P-28, P-33, V-02, V-09, V-23–V-25 | AVISO; verificações de vendas, movimentação, uso do produto e uso da variação consultam exclusivamente `order_items`/tabelas normalizadas, sem fallback JSONB; falta validar a migration de resgate em banco isolado |
| Duplicação | `ProductList` ações de pai/card e callback `onDuplicate` | P-26, C-31 | AVISO; `Index.tsx` não passa `onDuplicate` ao `ProductList`, portanto o botão não está conectado nesse caminho |
| Permissões | `permissionService.ts`, `permissionConfig.ts` | P-32 | AVISO; não há uso de `canPerform` identificado no fluxo de Produtos |
| Composição e componentes | `VariationCompositionItemsTab.tsx`, `ProductVariationsTab.tsx`, `productToDbMapper.ts`, `productMapper.ts` | C-01–C-15, C-23–C-30, C-35–C-37, C-41–C-43 | COBERTO na UI do combo; persistência precisa validar `product_id`/`variation_id` |
| Quantidade, subtotal e preço sugerido | `VariationCompositionItemsTab.tsx` (`handleQuantityChange`, `suggestedPrice`) e migration `quantity CHECK` | C-04, C-21, C-24–C-26, C-36 | COBERTO; há diferença entre validação UI e constraint de banco a testar |
| Preço de composição (`sum`, `fixed`, `discount`) | `composition.type.ts`, migration `compositions`, `compositionService.ts` | C-16, C-26, C-43 | AVISO/LEGADO; não há controle `pricing_mode` visível no formulário principal |
| Disponibilidade | `compositionMath.ts`, `get_composition_availability` RPC, `getCompositionAvailability`, `calculateCompositionAvailability` | C-17, C-38, C-40, C-43 | AVISO; RPC consulta `products` para estoque de variação e precisa de contrato isolado |
| Composição aninhada/circular | `ProductAutocomplete excludeCombos`, `useProductsActivationValidation` | C-10, C-35, C-39–C-40 | COBERTO como intenção; falta prova de bloqueio no backend |
| Composição no pedido e snapshot histórico | `useProductSearch.ts`, `compositionService.ts`, fluxo de SalesOrder | C-14–C-15, C-41–C-43 | AVISO/BLOQUEADO; cadastro via `products.item_type=composition` e leitura via `compositions` precisam ser reconciliados |
| Ações IA/conversão/cartesiano declaradas nos hooks | `useProductFormAi.ts`, `ProductConversionModal.tsx`, `CartesianVariationModal.tsx`, `useProductFormVariations.ts` e `ProductFormModal.tsx` | P-44–P-48, V-37–V-38, V-42, C-44 | AVISO; parte dos handlers não chega à interface principal |
| Persistência, atomicidade e idempotência | `productMutationService.ts`, `compositionService.ts` (`saveComposition`), RPC `save_composition_transaction`, migrations de composição | P-11, P-16, V-25, C-08–C-09, C-13, C-18, C-21, C-36, C-42 | AVISO; serviço agora delega a uma RPC transacional, mas a migration ainda precisa ser aplicada e validada em banco isolado |

#### Auditoria de interface e caminhos alternativos

| Componente/caminho | Ação real | Cenários | Situação |
|---|---|---|---|
| `ProductFormFooter` | Salvar rascunho, cancelar/descartar, próxima etapa, cadastrar/salvar | P-01–P-08, P-23, P-46 | COBERTO |
| `ProductFormHeader` | Fechar, tabs, indicadores ERP/Catálogo e navegação para pendência | P-18–P-24, P-46 | COBERTO |
| `ProductGeneralTab` | Nome, título, categoria, remover categoria, gerenciar categoria | P-02, P-14, P-20, P-24, P-41 | COBERTO |
| `ProductEcommerceTab`/cropper | Upload, drag/drop/paste, ordenar, foto principal, remover | P-15, P-40, V-12, V-22, V-32 | COBERTO |
| `ProductInventoryTab`/pricing | Fornecedor, estoque mínimo, custo, estoque inicial, sugestão de preço | P-12, P-35–P-37, P-44 | COBERTO |
| `ProductFiscalTab` | NCM, auto preenchimento, sugestão/aceite, campos fiscais | P-13, P-44–P-45 | COBERTO |
| `ProductVariationsTab`/`VariationRow` | Adicionar, editar, remover, editar composição, gerar/regenerar | V-02–V-05, V-37–V-41 | COBERTO |
| `VariationFormModal` | Tabs, X, fundo, cancelar, concluir, atributos, fotos, preço, técnico, descrição, componentes | V-06, V-10, V-17–V-22, V-29, V-34–V-35 | AVISO fiscal; demais caminhos cobertos |
| Lista tabela/card/menu | Editar, duplicar, histórico, estoque, etiquetas, WhatsApp, lixeira/restaurar | P-26–P-33 | AVISO; card/tabela não expõem exatamente o mesmo conjunto e duplicação não está conectada no `Index` |
| `ProductList` filtros/paginação/bulk | Busca, filtros, colunas, seleção, ações em lote | P-32–P-33, P-38 | AVISO permissões; comportamento visual coberto |
| `VariationCompositionItemsTab` | Adicionar linha, autocomplete, quantidade, remover, subtotal, preço sugerido | C-03–C-07, C-23–C-30, C-35–C-37 | COBERTO na interface |
| `compositionService`/`useProductSearch` | Consultar, disponibilidade e selecionar em venda | C-17, C-38, C-41–C-43 | AVISO/BLOQUEADO por possível modelo divergente |

#### Correções de qualidade do próprio roteiro

- Os cenários P-26, P-32, P-34, V-34, C-16 e C-41–C-42 não são considerados aprovação funcional: foram mantidos porque registram caminhos incompletos ou não conectados encontrados no código.
- Também ficam como `AVISO` de caminho não conectado P-43, P-44, P-48, V-37–V-38, V-42 e C-44 quando a função existe no hook, mas não há botão/prop no modal principal.
- Não foram encontrados IDs duplicados na matriz. Nenhum cenário foi removido nesta rodada; os cenários que poderiam parecer redundantes foram consolidados nas linhas de rastreabilidade por compartilharem a mesma implementação.
- A matriz não deve ser lida como “todos passaram”: `COBERTO` significa que existe um caso verificável, enquanto `AVISO/BLOQUEADO` exige correção ou contrato antes de aprovação.
- Cenários que dependam de estoque, venda ou persistência devem usar mock/fixture ou ambiente isolado; sem isolamento seguro, registrar `AVISO` e não escrever em banco compartilhado.
- Falhas devem registrar sintoma, causa imediata, causa raiz e teste de regressão; não usar `skip`, assertions opcionais ou `waitForTimeout` para mascarar comportamento.

#### Matriz de execução e rastreabilidade — primeira rodada

Esta seção não cria novos cenários. Ela liga os IDs existentes a testes automatizados, registra o status da execução e separa o que depende de banco isolado ou interação manual.

| Tipo | IDs do roteiro | Teste automatizado / arquivo | Status atual |
|---|---|---|---|
| Vitest — regras de composição | C-04, C-17, C-21, C-25–C-26, C-36, C-38 | `src/pages/utils/__tests__/compositionMath.test.ts` | PASSOU: 10 testes |
| Vitest — composição transacional | C-08, C-13, C-18, C-21, C-42 | `src/pages/utils/compositionService.test.ts` + RPC `save_composition_transaction` | PASSOU no contrato do serviço: 2 testes; RPC ainda depende de migração aplicada em ambiente isolado |
| Vitest — regras de variação/identidade | V-03, V-05, V-08, V-21, V-31, V-33, V-36 | `src/pages/utils/productVariationDefaults.test.ts` | PASSOU: 16 testes |
| Vitest — legibilidade ERP/Catálogo | P-02, P-04, P-12–P-13, P-39–P-40, V-06, V-16, V-32 | `src/pages/App/Products/utils/productLegibilityRules.test.ts` | PASSOU: 10 testes |
| Vitest — ativação e publicação | P-09, P-27, P-34, V-16 | `src/pages/App/Products/ProductList/utils/productActivationState.test.ts`, `catalogPublicationValidation.test.ts` | PASSOU: 9 testes |
| Vitest — persistência e dependências de produto | P-09, P-27–P-28, P-33, P-35, V-09, V-39 | `src/pages/utils/productService/productMutationService.test.ts`, `productDependencyCheck.test.ts` | PASSOU: 6 testes; verificações de vendas/uso consultam somente fontes normalizadas e falham fechado em erro |
| Vitest — histórico de produto sem fallback | P-28, V-09, V-23–V-25 | `src/pages/utils/orderSearchQueries.test.ts` | PASSOU: 2 testes; histórico consulta `order_items` e não consulta `orders.order_data` |
| Playwright — variações e cadastro | P-03–P-04, P-07, P-11, P-22–P-23, P-46–P-47, V-01–V-12, V-40–V-41 | `tests/e2e/products/products-variations-e2e.spec.ts`, `products-draft-flow.spec.ts`, `products-variation-validation.spec.ts` | NÃO EXECUTADO: ambiente E2E aponta para Supabase de produção; `.env.local-test` ausente |
| Playwright — composição e explosão no pedido | C-01–C-07, C-14–C-15, C-41–C-43 | `tests/e2e/products/compositions.spec.ts` | NÃO EXECUTADO pelo mesmo bloqueio de ambiente; o arquivo existente ainda usa esperas artificiais e precisa ser endurecido antes da aprovação |
| Integração/Supabase — UUID, rollback, estoque e merge/movimentação | P-11, P-28, P-35, V-09, V-13–V-14, V-24–V-27, C-18, C-21, C-36, C-42 | RPCs, migrations e contratos de persistência | PENDENTE: requer banco local/staging isolado, `testRunId` e teardown confirmado |
| Manual/integrações externas | P-44–P-45, P-48, V-34, V-42, C-44 | IA, fiscal da variação, conversão e ações sem prop/botão conectado | AVISO/BLOQUEADO; não aprovar por leitura estática |

**Bateria unitária executada na rodada anterior:** 53 testes passaram nos oito arquivos focados. **Correção de fonte única executada nesta rodada:** 10/10 testes passaram em 3 arquivos focados (`productDependencyCheck`, `orderSearchQueries` e `compositionService`). Os 134 cenários ainda não estão aprovados funcionalmente; a aprovação depende da execução dos grupos de integração e E2E em ambiente seguro.

### [MÓDULO 7] Pessoas, Clientes, Fornecedores & Geocodificação — Criticidade: MÉDIA
- [ ] **Etapa 7.1**: Cadastro PF/PJ com validação de CPF/CNPJ e estado padrão Paraná (`PR`).  
  *Tipo:* Unitário / Form
- [ ] **Etapa 7.2**: Autocomplete de logradouros (Google Places restrito a endereços sem estabelecimentos).  
  *Tipo:* Integração
- [ ] **Etapa 7.3**: Fallback resiliente de geocodificação no Google Maps (proteção de cota Free Tier).  
  *Tipo:* Unitário / API

### [MÓDULO 8] Catálogo Digital & Integração Meta — Criticidade: MÉDIA
- [ ] **Etapa 8.1**: Catálogo Web: exibição fiel de itens publicados, preços e variações.  
  *Tipo:* Interface E2E
- [ ] **Etapa 8.2**: Geração do feed de produtos para integração Meta (Instagram/Facebook Shopping).  
  *Tipo:* Unitário / Integração

### [MÓDULO 9] Relatórios Gerenciais, DRE & Métricas Comerciais — Criticidade: MÉDIA
- [ ] **Etapa 9.1**: Apuração de faturamento bruto vs faturamento líquido (dedução de devoluções).  
  *Tipo:* Unitário
- [ ] **Etapa 9.2**: Cálculo de margem de contribuição e lucro bruto com base no CMV real.  
  *Tipo:* Unitário
- [ ] **Etapa 9.3**: Cálculo de comissões operacionais de vendedores e montadores.  
  *Tipo:* Unitário

---

## 📜 Histórico de Execuções e Achados

| Data / Hora | Ciclo | Módulo | Etapa | Resultado | Evidência / Notas |
|---|---|---|---|---|---|
| 2026-09-05 12:50 | Ciclo 1 | N/A | Setup | ✅ INICIALIZADO | Skill e roteiro cíclico criados e estruturados |
| 2026-09-05 12:51 | Ciclo 1 | Módulo 1 (Vendas) | Etapa 1.1 | ✅ APROVADO | 12/12 testes unitários de detecção de alterações e regras de pedidos (`TESTE_HUB_20260905_125109_M1_SALES`) |
| 2026-09-17 09:25 | Ciclo 1 | Módulo 1 (Vendas) | Etapa 1.2 | ✅ APROVADO | 14/14 testes unitários de ciclo de vida e transições de status (`TESTE_HUB_20260917_092520_M1_STATUS`) |
| 2026-09-17 09:33 | Ciclo 1 | Módulo 1 (Vendas) | Etapa 1.3 | ✅ APROVADO | 5/5 testes de integração de ações pós-venda e blindagem de integridade (`TESTE_HUB_20260917_093307_M1_POST_SALE`) |
| 2026-09-17 10:23 | Ciclo 1 | Módulo 3 (Logística) | Etapa 3.1 | ✅ APROVADO | 6/6 testes unitários para a semântica de extração de agendamento e badges visuais (`TESTE_HUB_20260917_102300_M3_SCHEDULE`) |
| 2026-09-17 10:34 | Ciclo 1 | Módulo 3 (Logística) | Etapa 3.2 | ✅ APROVADO | Auditoria E2E Web concluída: renderização das abas Hoje, Cronograma e Mapa Leaflet sem erros e com cadeados de slot funcionais |
| 2026-09-17 23:24 | Ciclo 1 | Módulo 2 (Estoque) | Mobile E2E | ✅ APROVADO | Auditoria E2E Playwright concluída: renderização NFs de Entrada, Recebimentos e Fluxo da Tela de Contagem de Inventário sem erros |
| 2026-09-25 | Ciclo 1 | Módulo 6 (Produtos) | Auditoria de cobertura | ⚠️ AVISO | Segunda varredura adicionou lacunas de preço/estoque/fiscal/fotos, falha de rede, importação, limite de fotos, mover/mesclar variações, fornecedores, modos de preço, disponibilidade, atomicidade, status e integridade histórica de composições. Matriz complementar ampliada nas Etapas 6.6 e 6.7; execução permanece pendente. |
| 2026-09-25 | Ciclo 1 | Módulo 6 (Produtos) | Auditoria em ciclos — rodada 1 | ⚠️ AVISO | Nova rodada encontrou lacunas de indicadores e navegação do formulário, produto serviço, sincronizações pai/filha, descontos, herança de fotos, fornecedor da composição, linhas vazias, limites de quantidade e preço sugerido. Cenários P-18 a P-24, V-17 a V-23 e C-23 a C-30 adicionados; nova varredura pendente. |
| 2026-09-25 | Ciclo 1 | Módulo 6 (Produtos) | Auditoria em ciclos — rodada 2 | ⚠️ AVISO | Incluídos cenários de bloqueio de edição publicada, duplicação sem fatos, lixeira/restauração, dependências, histórico/etiquetas/WhatsApp, troca de SKU em históricos e contrato UUID em composições. Merge permanece bloqueado pelos pré-requisitos arquiteturais documentados; nova varredura pendente. |
| 2026-09-25 | Ciclo 1 | Módulo 6 (Produtos) | Auditoria em ciclos — rodada 3 | ⚠️ AVISO | Incluídos permissões, operações em lote, rollback de publicação, estoque inicial por variação, custos de lote, fornecedor, alertas, paginação, código de barras e composição aninhada. Achado de implementação: `checkProductLinkedToSales` retorna `null`; exclusão com histórico deve falhar até existir verificação real. Nova varredura pendente. |
| 2026-09-25 | Ciclo 1 | Módulo 6 (Produtos) | Auditoria em ciclos — rodada 4 / fechamento | ⚠️ AVISO | Fechada a matriz com publicação por preço/foto efetivos de cada variação, atributos de categoria versus características técnicas, campos comerciais/fiscais/SEO, alertas e sincronização granular pai/filha. Não foram encontradas novas categorias de cenário no escopo após a conferência final; execução dos cenários e correção dos achados permanecem pendentes. |
| 2026-09-25 | Ciclo 1 | Módulo 6 (Produtos) | Auditoria de rastreabilidade — rodada 5 | ⚠️ AVISO | Rastreabilidade cenário → componente → persistência adicionada. Foram identificados caminhos não conectados (duplicação, permissões, fiscal da variação, ações IA/cartesiano/regeneração), divergência potencial `products.item_type=composition` × `compositions` e ausência de transação em `saveComposition`. Última passagem estrutural ainda pendente. |
| 2026-09-25 | Ciclo 1 | Módulo 6 (Produtos) | Auditoria em ciclos — rodada 6 / passagem final | ⚠️ AVISO | Varredura final refeita desde o início sobre matriz, componentes, handlers, botões, persistência e caminhos alternativos. Nenhuma nova lacuna relevante foi encontrada. Permanecem somente os AVISOS/BLOQUEIOS já rastreados; matriz final: 48 Produto, 42 Variações e 44 Composição, sem IDs faltantes ou duplicados. |
| 2026-09-25 | Ciclo 1 | Módulo 6 (Produtos) | Execução automatizada — rodada 1 | ⚠️ AVISO | 53 testes unitários passaram em 8 arquivos focados, incluindo regressão para `checkProductLinkedToSales` e contrato do salvamento transacional de composição. Playwright/E2E e Supabase de integração não executados por ausência de ambiente isolado; configuração detectada aponta para projeto de produção. |
| 2026-09-25 10:23 | Ciclo 1 | Módulo 6 (Mobile) | Ambientes e Categorias (Matrizes D e E) | ✅ APROVADO | 35/35 testes Vitest (18 regras de domínio + 17 serviços de persistência) e 6/6 testes Playwright E2E aprovados, incluindo ciclo completo de CRUD real (criar ambiente, criar categoria vinculada, visualizar chip, editar nome, excluir com diálogo e teardown). Corrigido bug de schema (colunas `active`/`updated_at` inexistentes em `categories`) e polyfill de `Alert.alert` no web. |
| 2026-09-25 | Ciclo 1 | Módulo 6 (Produtos) | Correção de fonte única — rodada 2 | ⚠️ AVISO | Removido o fallback operacional para `orders.order_data` nas checagens de produto/variação e no histórico de vendas. Criado resgate único de `items`/`assistanceItems` para `order_items`, preenchendo somente dados ausentes e desativando o trigger legado. 10/10 testes focados passaram; migration ainda não aplicada remotamente e integração/E2E permanecem pendentes em ambiente isolado. |
