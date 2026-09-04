# 📜 Diretrizes e Regras do Projeto (Móveis Morante Hub)

Este arquivo consolida as regras de ouro e diretrizes de desenvolvimento para o projeto, em conformidade com as exigências do usuário.

---

## 🛠️ Regras de Desenvolvimento

1. **Código Limpo, Modular e Gatilho Pré-Edição de Skills**:
   - Sempre siga o princípio de código limpo, legível, manutenível e com forte modularização (`modularizacao_codigo`).
   - **Gatilho Pré-Edição de Arquivo**: Antes de propor ou realizar qualquer edição (`replace_file_content` / `write_to_file`), o agente deve obrigatoriamente checar o arquivo contra as skills do workspace (`modularizacao_codigo`, `regras-de-negocio-erp`, `analise-compatibilidade-mudancas`, `mobile-offline-first`). Se o arquivo manipulado passar de 150–200 linhas ou acumular mais de uma responsabilidade, o agente deve alertar o usuário e planejar a modularização segura.
2. **Registro de Planos e Ideias**: Mantenha sempre um registro atualizado de ideias, planos pendentes e roadmap no arquivo [IDEIAS_E_PLANOS.md](file:///c:/Users/Rosilene/Desktop/morantehub/IDEIAS_E_PLANOS.md).
3. **Economia de Cota de Assinatura**: Otimize ao máximo o consumo de tokens e cotas do plano de assinatura, evitando chamadas repetitivas ou desnecessárias.
4. **Isolamento de Ambientes (Dev vs Prod)**:
   - Configure de maneira clara e adequada as variáveis de ambiente, rotas de API, conexões do Supabase e quaisquer dados ambíguos.
   - Garanta que as funcionalidades rodem perfeitamente tanto no ambiente de desenvolvimento local quanto no ambiente de produção (Vercel, etc.).
5. **Relato Imediato de Bugs**: Se encontrar algum bug impeditivo que cause lentidão ou bloqueie o progresso, relate-o imediatamente ao usuário.
6. **Comunicação Ativa**: Na presença de ambiguidades ou dúvidas sobre as demandas do usuário, sempre pergunte antes de fazer suposições.
7. **Documentação das Regras**: Este arquivo de regras (`RULES.md`) e `.agents/AGENTS.md` devem ser mantidos sempre no projeto para referência contínua.
8. **Idioma Oficial**: Toda a comunicação com o usuário e documentações específicas devem ser em **Português Brasileiro**.
9. **Git Push**: Nunca executar `git push` automaticamente sem autorização explícita do usuário.
10. **Consulta de Modularização ao Passar por Arquivos**: Somente perguntar explicitamente ao usuário no final da resposta sobre modularização se o arquivo **realmente infringir responsabilidade única, código limpo ou ultrapassar 200 linhas** (segundo a skill `modularizacao_codigo`, alvo de 30–100 linhas, aceitável até 150, estratégia conservadora: COPIAR → VALIDAR → CONECTAR → TESTAR → SÓ DEPOIS REMOVER). Arquivos pequenos e coesos não devem gerar perguntas repetitivas.

---

## 🏷️ Terminologia e Status de Produtos

1. **No ERP (Gestão, Listagem e Pedidos)**:
   - **"Produtos Ativos"** (`active: true`): Produtos operacionais no sistema para movimentações, pedidos e controle.
   - **"Produtos Desativados"** (`active: false`): Produtos desativados no sistema que permanecem na listagem normal com selo indicativo (sem tela separada).
   - **"Rascunhos"** (`is_draft: true` ou `status == 'draft'`): Aparecem diretamente na listagem normal de produtos com selo indicativo em âmbar (sem botão segregador no topo).
   - **Descarte de Rascunho nos 3 Pontinhos**: Rascunhos possuem a opção "Descartar Rascunho" no menu de 3 pontinhos tanto na tabela quanto nos cards.
   - **Bloqueio de Ativação e Publicação para Rascunhos**: Produtos em rascunho **não podem** ser ativados no ERP nem publicados no Catálogo. Ao tentar ativar ou publicar, o sistema bloqueia e emite alerta explicativo orientando o operador a concluir o cadastramento primeiro.
   - Requisitos de Ativação: Nome do produto, Preço de Venda (produtos simples ou variações), Categoria e Fornecedor. Preço de custo não é pré-requisito de ativação.
   - Ações: Botão interativo `ERP` na coluna "Status de Canais" e nos cards para Ativar / Inativar.
2. **No Catálogo Digital (E-commerce / Catálogo Online)**:
   - **"Publicado no Catálogo"** (`status: 'published'`): Visível e disponível no catálogo digital público.
   - **"Ocultado do Catálogo"** (`status: 'hidden'`): Oculto da vitrine do catálogo digital público.
   - Ações: Botão interativo `Catálogo` na coluna "Status de Canais" e nos cards para Publicar / Ocultar.
3. **Independência Total entre Canais**:
   - Ativar ou desativar no ERP não altera nem despublica do catálogo digital, e vice-versa.
4. **Paridade Rigorosa no App Mobile (`MobileProductCard` / `MobileProductVariationList`)**:
   - O aplicativo mobile segue rigorosamente os mesmos comportamentos do ERP:
     - Rascunhos e desativados aparecem na listagem normal com selos `Rascunho` (âmbar) e `Desativado` (vermelho).
     - Botões bipartidos de canais (`ERP` azul suave e `Catálogo` roxo suave).
     - Bloqueio preventivo ao clicar em ERP ou Catálogo para rascunhos, alertando sobre a necessidade de finalizar o cadastro.
     - Menu de 3 pontinhos com "Editar Produto" e "Descartar Rascunho" (exclusão permanente com remoção das variações filhas).
     - Variações com cards individuais de fundo branco puro (`#ffffff`), cantos arredondados e botões bipartidos.

---

## 🛠️ Outras Diretrizes Importantes

1. **Ícone de Montagem (`Drill`)**: Utilizar exclusivamente o ícone de furadeira/parafusadeira preenchido (`DrillIcon`) para montagens.
2. **Código Sequencial do Pedido (`orderIndex`)**: Geração automática de 6 dígitos obrigatória na abertura; nunca permitir pedidos sem código.
3. **Observações por Item**: Anexadas ao nome do produto com `" - "` nos impressos, ordens de serviço, recibos e WhatsApp.
4. **Assinatura Digital de Recibo**: Carimbo digital oficial ICP-Brasil/A1 com QR Code dinâmico determinístico, sem assinatura manual em papel.
5. **Rótulo de Movimentação de Estoque em Pedidos (`InventoryMovementBadge`)**:
   - **Amarelo com ícone `PackageCheck`**: Indica saída/entrada parcial quando apenas parte dos itens do pedido tiveram movimentação no estoque gerada (pedidos mistos com itens sem cadastro/temporários ou serviços, saídas parciais de itens ou devoluções parciais).
   - **Verde com ícone `PackageCheck`**: Saída/entrada completa gerada para todos os itens.
   - **Cinza com ícone `Package`**: Sem movimentação lançada.
   - **Vermelho com ícone `PackageX`**: Movimentação estornada / cancelada.
   - **Detalhamento de Itens no Hover / Modal Flutuante (`InventoryBadgePopover`)**: O popover lista todos os itens da venda com **Nome do Produto**, **Quantidade** e **Status Individual da Movimentação**:
     - *Efetivada*: Saída/movimentação lançada e ativa no estoque.
     - *Estornada*: Saída estornada / cancelada.
     - *Não efetivada*: Produto cadastrado que ainda não teve saída lançada.
     - *Sem Cadastro*: Avisa com destaque visual âmbar `SEM CADASTRO` que itens temporários ou sem cadastro não movimentam estoque.
6. **Padronização Global de Logradouro com Google Places API (`AddressAutocompleteInput`)**:
   - Todo campo onde o usuário digita endereço ou logradouro no ERP (`PersonFormModal` - clientes/fornecedores/colaboradores, `ShippingData` - entrega de pedidos, `AssistanceCustomerSection` - assistência técnica, `CompanyFiscalDataSection` - dados fiscais da empresa emitente, `OrderRouteMap` - mapa da rota) utiliza exclusivamente o componente unificado `AddressAutocompleteInput`.
   - **UF Padrão "PR" (Paraná) e Filtro de Estado**: O campo de UF / Estado vem preenchido por padrão como `PR` em todos os formulários. A busca de sugestões (`searchAddressSuggestions`) recebe o estado selecionado (`stateHint`) e restringe as consultas ao estado especificado, evitando trazer ruas e bairros aleatórios de outros estados do país.
   - As sugestões flutuantes são renderizadas via portal (`DropdownPortal`) com z-index `99999999` para evitar quebras visuais em modais full screen.
   - Utiliza cache no Supabase (`address_cache`) antes de requisitar a Places API para economizar cotas e custos.
7. **Monitoramento de APIs Externas e Hard Limits (`/api-usage`)**:
   - Registro atômico no banco (`record_api_usage_atomic`) para auditoria de consumo (Google Maps, Gemini AI, WhatsApp, SEFAZ).
   - Bloqueio preventivo (Hard Limit a 95% do teto configurado) e Circuit Breaker contra loops anômalos.
8. **Módulo Unificado de Entregas no Mobile (`DeliveriesHubScreen`)**:
   - O aplicativo mobile concentra todo o fluxo logístico em uma única tela de Entregas com 3 abas no topo: `[ Hoje ]` (roteiro operacional do dia e próxima parada), `[ Cronograma ]` (visão diária/semanal) e `[ Mapa ]` (Google Maps interativo em tela cheia).
   - A barra inferior utiliza a aba central **"Entregas"** (ícone `Truck`).
9. **Modularização do Formulário de Pessoas (`PersonFormModal` e `personForm/`)**:
   - O formulário foi modularizado segundo a skill `modularizacao_codigo`: lógica isolada no hook `usePersonForm.ts`, e apresentação dividida em `PersonIdentificationSection.tsx`, `PersonEmployeeRolesSection.tsx`, `PersonContactsSection.tsx`, `PersonAddressSection.tsx` e `PersonObservationsSection.tsx`, mantendo o modal orquestrador limpo e preservando 100% das regras de negócio de clientes, fornecedores e colaboradores.
10. **Preenchimento Automático de Desconto e Preço Líquido ao Selecionar Produto (`productPricing.ts`)**:
    - Ao selecionar um produto ou variação na lista de itens do formulário de pedido, se houver preço promocional ativo (`promoPrice > 0 && promoPrice < unitPrice`), o sistema preenche automaticamente o **Preço Unitário de Tabela** (`unitPrice`), calcula e insere o **Desconto** (`unitDiscount` = `unitPrice - promoPrice`) e reflete o **Preço Final Líquido** (`Preço Un. Líq.` = `promoPrice`), calculando o Total do Item com base no valor promocional.
