# Ideias e Planos Pendentes — Morante Hub

Este arquivo centraliza planos, ideias e tarefas pendentes do projeto Morante Hub para posterior consulta e continuidade, evitando esquecimento e garantindo rastreabilidade.

---

## 0. Desligamento do READ Legado e Paridade 100% de Pedidos
- **Status**: Concluído com Sucesso! 🚀
- **Data**: 12/09/2026
- **Solicitação**: Desligamento operacional da leitura legada (`order_data` e `orders.items`) no ERP e Mobile, mantendo integridade com as tabelas normalizadas (`orders`, `order_items`, `order_payments`), mantendo dual-write ativo e limpando dados residuais de teste.
- **Implementações Executadas**:
  1. **Auditoria Definitiva de Paridade Executada**:
     - 875 de 875 pedidos de produção auditados e 100% equivalentes.
     - 1.539 itens e 974 pagamentos perfeitamente mapeados e correspondentes.
     - Relatório formal gerado em `docs/auditorias/order-normalization-parity-report.md`.
     - Matriz canônica de paridade gerada em `erp/src/types/orderParityMapping.ts`.
  2. **Desligamento do READ Legado**:
     - `orderMapper.ts`: Mapeamento de itens migrado para priorizar `order_items` vindo do join relacional, mapeando colunas físicas (`product_id`, `variation_id`, `unit_price`, `unit_discount`, `cost_price`, `handling_type`) com fallback de segurança.
     - `orderSearchQueries.ts`: `fetchOrderById` atualizado para fazer join explícito com `order_items (*)` e `order_payments (*)`.
     - `orderSyncQueries.ts`: `subscribeToOrders` e queries de listagem padronizadas para consumir via `mapOrderFromDatabase` com colunas físicas normalizadas.
     - `orderLifecycleOperations.ts`: `permanentDeleteDraftOrder` e `undoReturn` atualizados para consumir e alterar o status relacional físico de `orders`.
  3. **Limpeza de Dados de Teste no Banco de Dados**:
     - Pedidos de teste (`id LIKE 'test_%'` e `order_number LIKE '99000%'`) excluídos com sucesso das tabelas `orders`, `order_items` e `order_payments`.
     - Zero pedidos de teste e zero clientes de teste remanescentes no banco de dados em produção.
     - Preservação estrita das regras de negócio (sem exclusão física indevida de produtos para não violar integridade referencial).
  4. **Garantia de Regras Invioláveis**:
     - WRITE (dual-write na RPC `save_order_transaction`) mantido 100% ativo.
     - Snapshots históricos autorizados (`item_snapshot`, `fullAddress`, `routeGeoJSON`) intactos.
  5. **Diretriz de Identificador Único Obrigatório de Testes**:
     - Qualquer rotina de teste (Playwright, E2E, Vitest de integração ou testes manuais) que persista dados no banco deve usar obrigatoriamente um identificador único padronizado (`testRunId`, prefixo `[TESTE_AUT]` ou sufixo `_test_<runId>`).
     - É estritamente proibido criar dados de teste com identificação ambígua.
     - O teardown / cleanup no `finally` deve referenciar esse ID único para garantir 100% de remoção sem resíduos na interface.

---

## 0. Auditoria e Normalização Segura do Banco Supabase / PostgreSQL
- **Status**: Concluído com Sucesso! 🚀
- **Data**: 12/09/2026
- **Solicitação**: Auditoria completa e normalização segura de campos JSONB em entidades de negócio (pedidos, itens de pedido, recebimentos, notas fiscais, compras, financeiro, produtos e variações), seguindo boas práticas de PostgreSQL, sem perda de dados, com estratégia incremental e preservação de snapshots históricos.
- **Implementações e Migrações Executadas**:
  1. **Auditoria Real do Catálogo**:
     - `orders`: 849 registros históricos totalmente preservados.
     - `inbound_invoices`: 1 nota com 21 itens.
     - `purchases`: 8 compras com 6 itens.
     - `product_variations`: 269 variações já consolidadas em tabela própria com FK.
     - `products`: 83 colunas estruturadas já existentes; JSONBs remanescentes mantidos para metadados fiscais e atributos dinâmicos.
  2. **Novas Tabelas Relacionadas Criadas (Categoria B)**:
     - `inbound_invoice_items`: Normalização de 1:N de itens de NF-e (21 itens migrados, FK para `inbound_invoices`, índices em `ean`, `ncm`, `product_id`, `variation_id`).
     - `purchase_items`: Normalização 1:N de compras (6 itens migrados, FK para `purchases`).
     - `goods_receipt_items`: Normalização 1:N de recebimentos físicos de mercadorias (tabela criada com FK, RLS e índices para CMPM/CMV).
     - `order_items`: Normalização 1:N de pedidos de venda (1.508 itens migrados, FK para `orders`, índices B-Tree e RLS).
     - `order_payments`: Normalização 1:N de formas de pagamento e parcelas (949 pagamentos migrados, FK para `orders`).
  3. **Colunas Estruturadas Adicionadas em `orders` (Categoria A)**:
     - `order_type`, `order_index`, `scheduled_date`, `scheduled_start_time`, `scheduled_end_time`, `delivery_method`, `delivery_status`, `delivery_arrived_at`, `delivery_started_at`, `delivery_finished_at`, `marketing_origin`, `items_subtotal`, `total_discount`, `total_cost`, `stock_processed`, `is_stock_checked`, `is_registered_in_bling`, `deleted`, `deleted_at`, `return_order_id`, `linked_order_id`.
     - Índices B-Tree especializados em `status`, `order_type`, `order_number`, `order_index`, `customer_id`, `seller_id`, `scheduled_date`, `delivery_method`, `delivery_status`, `stock_processed`, `deleted` e `created_at DESC`.
  4. **View `order_list_items` Otimizada**:
     - Atualizada para ler preferencialmente das novas colunas físicas, acelerando a listagem de pedidos no ERP e no Mobile sem full scan JSONB.
  5. **Arquitetura Definitiva Transacional (RPC `save_order_transaction`)**:
     - Implementada a RPC atômica `public.save_order_transaction` no PostgreSQL.
     - Persiste em uma única transação: `orders` (cabeçalho), `order_items` (itens normalizados com `item_snapshot`), `order_payments` (parcelas) e `order_data` (snapshot de compatibilidade temporário).
     - Garantia de `ROLLBACK` total caso qualquer etapa falhe, impedindo pedidos parcialmente salvos.
     - `orderHistoryService.ts` atualizado para invocar a RPC com fallback resiliente.
  6. **Trigger de Fallback Legado Anti-Colisão (`sync_order_items_fallback`)**:
     - Trigger temporário `AFTER INSERT OR UPDATE ON orders` que só atua se a requisição vier de clientes legados e se `order_items` estiver vazio para o pedido.
     - Detecta automaticamente quando a RPC moderna já executou (`morante.in_order_transaction = true`), evitando duplicação, concorrência e trabalho redundante no banco.
  7. **Migração de Readers e Writers Operacionais (Etapa 2 Concluída)**:
     - `orderMapper.ts`: Migrado para priorizar a leitura de pagamentos da tabela normalizada `order_payments`, com fallback seguro e não-duplicante para `order_data.payments`.
     - `orderSearchQueries.ts`: `fetchOrderById` atualizado para carregar `order_payments(*)` de forma eficiente via PostgREST join relacional.
     - `operationalSchedule.ts`: `getOperationalScheduleDate` migrado para priorizar as colunas normalizadas `scheduled_date`, `scheduled_start_time` e `scheduled_end_time` com fallback para JSONB.
     - `AgendaScreen.tsx`: Query ajustada para carregar colunas estruturadas de agendamento e filtrar por `deleted` relacional.
     - `aiSummaryService.ts`: Migrado para filtrar primariamente por `orders.deleted` relacional.
     - `order_fallback_telemetry`: Criada tabela leve de telemetria no PostgreSQL que monitora se e quando o fallback precisa atuar (`execution_count`, `items_fallback_count`, `payments_fallback_count`, `last_triggered_at`, `last_order_id`).
     - **Comprovado em Banco:** Updates operacionais leves de campo (ex: `delivery_status = 'in_service'`) são 100% no-op para o trigger e não acionam telemetria nem reconstroem filhos.
     - **Preservação Categoria C:** Mantidos permanentemente como JSONB: `item_snapshot`, endereço histórico da entrega, checklists operacionais com fotos e `payment_details` de adquirentes.
  8. **Otimização de Egress e Eliminação de `select('*')`**:
     - `fetchOrderById` migrado de `select('*, order_payments(*)')` para projeção explícita estrita de 34 colunas físicas de `orders` + 8 campos estruturais de `order_payments`, preservando `order_data` exclusivamente para os snapshots históricos e metadados Categoria C.
  9. **Critérios para Descontinuação Futura do Fallback**:
     - Somente após a telemetria do trigger registrar 0 acionamentos por 30+ dias em produção e a fila offline do mobile adotar o contrato direto de persistência.

---

## 0. Renomeação da Aba de Entregas para 'Operações' com Ícone Route
- **Status**: Concluído com Sucesso! 🚀
- **Data**: 12/09/2026
- **Solicitação**: Na barra inferior de abas do app mobile, mudar o nome da aba de "Entregas" para "Operações" e utilizar o ícone `Route` da Lucide (`https://lucide.dev/icons/route`).
- **Implementações Realizadas**:
  - Em `mobile/src/features/dashboard/components/NativeBottomNav.tsx`:
    - Importado o ícone `Route` de `lucide-react-native`.
    - Atualizado o item da aba com `label: 'Operações'` e `icon: Route`.
    - Preservada a chave interna `key: 'entregas'` e as rotas operacionais sem quebra de estado ou navegação existente.

---

## 0.1. Ícones de Navegação no Mapa: Seta Azul Pura & Equipe com Nome no Hover
- **Status**: Concluído com Sucesso! 🚀
- **Data**: 12/09/2026
- **Solicitação**:
  1. O ícone da minha posição (usuário logado / motorista) no mapa deve ser **apenas a seta mesmo, na cor azul**, sem círculo em volta nem halo.
  2. A localização de quem está em processo de entrega (membros da equipe) deve continuar sendo o **caminhão (`🚚`)**, com o nome do usuário sendo mostrado **apenas quando houver hover** em cima do ícone do caminhão (e toque no nativo).
- **Implementações Realizadas**:
  1. **Minha Posição (Apenas a Seta Azul Pura)**:
     - Removidos círculo azul de fundo, borda branca e halo.
     - Marcador agora renderiza **apenas o glifo da seta de navegação** (`Navigation` de `lucide-react-native` rotacionado em -45° para apontar para o Norte/trajeto) em azul royal (`#2563eb` preenchido com contorno `#1d4ed8` e drop shadow suave de profundidade).
     - Aplicado no app nativo ([DeliveryMarker.tsx](file:///c:/Users/Rosilene/Desktop/morantehub/mobile/src/features/logistics/components/deliveryMap/DeliveryMarker.tsx)) e no mapa Web/Leaflet ([DeliveryMapView.web.tsx](file:///c:/Users/Rosilene/Desktop/morantehub/mobile/src/features/logistics/components/deliveryMap/DeliveryMapView.web.tsx)).
  2. **Equipe com Nome Apenas no Hover/Toque**:
     - No web (`DeliveryMapView.web.tsx`): a badge do nome do entregador (`.team-member-badge`) oculta por padrão (`opacity: 0; visibility: hidden;`), revelando-se sob hover (`.team-member-container:hover .team-member-badge`).
     - No app nativo (`DeliveryMarker.tsx`): o nome agora é condicionado a interação/toque no marcador (`showTeamName`), mantendo o mapa limpo.
  3. **Manutenção de Status Operacional**: O indicador de integridade (bolinha verde se ativo ou `?` vermelho se sem sinal de GPS) continua presente no topo do caminhãozinho da equipe.

---

## 0.1. Calibração da Posição da Loja e Precisão Contínua do GPS no Mapa
- **Status**: Concluído com Sucesso! 🚀
- **Data**: 12/09/2026
- **Problema**: Usuários dentro da loja física apareciam deslocados/afastados do pin da loja e sobre a rua.
- **Causa Raiz**:
  1. A coordenada da loja (`storeOriginCoords`) estava em `[-49.16948, -25.35205]`, cerca de 20 metros recuada no fundo do lote, longe do salão e da frente da loja.
  2. O serviço de localização (`locationService.ts`) utilizava `Location.Accuracy.Balanced` (baseado em triangulação de Wi-Fi/torres celulares), que tem margem de erro de 30-50m, provocando drift para a rua.
  3. O hook `useDriverLocation.ts` capturava a posição uma única vez na inicialização sem monitoramento ativo por satélite.
  4. O âncora visual do marcador do membro da equipe (`anchor: { x: 0.5, y: 0.5 }`) projetava o caminhão 14px abaixo da coordenada real de GPS devido à etiqueta com o nome.
- **Soluções Aplicadas**:
  1. **Calibração da Loja Física (R. Cascavel, 306)**: Atualizadas as coordenadas da loja para `latitude: -25.35212, longitude: -49.16933` no Supabase (`settings.storeOriginCoords`), no ERP e no Mobile.
  2. **GPS de Alta Precisão (Satélite GNSS)**: Alterado `accuracy` para `Location.Accuracy.High` e reduzido o tempo de cache para 10s.
  3. **Monitoramento Contínuo com Calibração Ativa**: Implementado `watchDriverLocation` com `Location.watchPositionAsync`, atualizando a posição em tempo real a cada 2 metros ou 3 segundos conforme os satélites refinam a posição.
  4. **Correção de Âncora Visual**: Ajustado `anchor: { x: 0.5, y: 0.72 }` para alinhar o corpo do caminhãozinho perfeitamente no ponto exato do GPS.

---

## 0.1. Compartilhamento de Localização Condicional à Entrega & Modal de Confirmação de Privacidade
- **Status**: Concluído com Sucesso! 🚀
- **Data**: 12/09/2026
- **Melhorias Aplicadas**:
  1. **Privacidade Operacional (Visibilidade Condicional)**: A localização de um usuário só fica visível para os outros membros no mapa quando ele estiver ativamente com uma entrega em andamento (`is_delivering = true`), da 1ª etapa até a finalização do pedido.
  2. **Encerramento Imediato**: Ao finalizar o pedido (`DELIVERY_FINISH`), registrar insucesso (`unattended`) ou cancelar a rota, o app aciona `stopDeliveringBroadcast` e o usuário é ocultado imediatamente do mapa dos colegas.
  3. **Modal de Confirmação de Privacidade**: Criado `DeliveryStartConfirmModal.tsx`, que intercepta o início da saída e esclarece: *"Ao iniciar a entrega, a sua posição em tempo real ficará visível no mapa para os outros membros da equipe até que todas as etapas deste pedido sejam finalizadas."*
  4. **Banco Supabase**: Aplicada migration `20260912123500_add_delivering_state_to_team_locations.sql` adicionando `is_delivering`, `active_order_id` e `active_order_code` com índice condicional.
  5. **Testes Unitários**: Criada suíte `teamLocationPrivacy.test.ts` com 3 testes aprovados (100%).

---

## 0.1. Centralização do Modal de Pedido no Meio da Tela & Botões Verticais
- **Status**: Concluído com Sucesso! 🚀
- **Data**: 12/09/2026
- **Melhorias Aplicadas**:
  1. **Posicionamento no Meio da Tela**: O modal de parada no mapa (`DeliveryBottomSheet.tsx`) foi centralizado vertical e horizontalmente (`justifyContent: 'center'`, `paddingHorizontal: 18`, `paddingVertical: 24`, `maxHeight: '82%'`), removendo o estilo encostado na base e o drag handle.
  2. **Botões de Ação Verticais (Empilhados)**:
     - **Botão Primário (Topo)**: `[ ▶ INICIAR ETAPAS DA ENTREGA ]` com largura total (100%), altura 46px, texto destacado (13px, bold 900) e azul sólido.
     - **Botão Secundário (Abaixo)**: `[ 📄 Detalhes do Pedido ]` com largura total (100%), altura 44px, texto (13px, bold 800) e contorno suave.
  3. **Usabilidade Otimizada**: Visibilidade total sobre o mapa sem sobrepor a barra de navegação inferior e fácil acionamento pelo motorista.

---

## 0.1. Unificação do Seletor de Período (Hoje/Dias Seguintes) e Ajuste no Cabeçalho de Operações
- **Status**: Concluído com Sucesso! 🚀
- **Data**: 12/09/2026
- **Melhorias Aplicadas**:
  1. **Remoção do Seletor Redundante no Resumo**: O card de resumo (`TodaySummaryCard.tsx`) não possui mais botão de filtro duplicado internamente; agora recebe o período ativo (`periodFilter`) vindo do filtro mestre no cabeçalho da tela (`DeliveriesHubScreen.tsx`).
  2. **Estilo Fiel de Cápsula com Pílula Ativa Branca**: O seletor "Hoje / Dias Seguintes" no topo da Operação foi estilizado exatamente como o design de referência: cápsula azul arredondada (`#0055ff`, `borderRadius: 22`), com a pílula ativa em branco e tipografia em destaque (`#0055ff`, `fontWeight: '900'`) e a inativa com texto branco suave.
  3. **Cabeçalho Mais Alto e Arejado**: Aumentado o espaçamento superior e inferior do cabeçalho da tela de Operações (`paddingBottom: 14`, `titleRow` com `marginBottom: 12` e respiro seguro para a barra de status).

---

## 0.1. Correção de Localização de Entrega no Mapa & Redesign do Modal de Parada
- **Status**: Concluído com Sucesso! 🚀
- **Data**: 12/09/2026
- **Problema 1 (Coordenadas Erradas no Pedido #002550 - R. Evaristo da Veiga, 312, Campo Pequeno)**:
  - A entrega do pedido #002550 aparecia no mapa do app em local errado (Rua Abel Scuissiato, 312, Maracanã), a mais de 1,1 km de distância da localização real.
  - **Causa Raiz**:
    1. O endereço continha complemento no campo de texto de rua/busca (`destination=Rua%20Evaristo%20da%20Veiga%20312%20Muro%20Marrom`) sem coordenadas na URL.
    2. Durante o cálculo de rota no ERP, a busca do Google Maps não encontrou a rua com o texto adicional e recaiu sobre o número 312 mais relevante da cidade (Rua Abel Scuissiato, 312), gravando `destinationCoords: [-49.1860165, -25.3644204]`.
    3. Havia fallbacks cegos de aproximação por bairro/cidade em `maps.ts` (`getNeighborhoodCoords`) e no `DeliveryMap.tsx` que geravam coordenadas arbitrárias ao invés de indicar ausência de precisão.
  - **Solução Aplicada**:
    1. Atualizado o registro do pedido #002550 no Supabase (`orders`) com as coordenadas exatas: `latitude: -25.3600699, longitude: -49.1962085` (`destinationCoords: [-49.1962085, -25.3600699]`) e URL do Google Maps limpa com coordenadas diretas.
    2. Removidos fallbacks arbitrários de bairro em `maps.ts` e `DeliveryMap.tsx`: se um endereço não for localizado com precisão pelo geocodificador, o sistema não gera coordenadas genéricas falsas.
- **Problema 2 (Ajustes no Modal de Detalhes da Parada no Mapa do App - `DeliveryBottomSheet.tsx`)**:
  - Modal era encostado embaixo, alto demais, com seções pesadas de cobrança e sanfona de itens, sem botão direto para abrir os detalhes do pedido e com rótulo "volumes" em vez de "itens".
  - **Soluções Aplicadas**:
    1. **Layout Compacto e Flutuante**: O modal agora é um card flutuante com bordas arredondadas (`borderRadius: 22`), margens laterais (`paddingHorizontal: 16`) e respiro inferior (`paddingBottom: 24`), sem encostar na base da tela.
    2. **Remoção de Cobrança / Valor a Receber**: Removida a seção de pagamento pendente/valor a receber.
    3. **Remoção de Sanfona de Itens**: Removida a lista expansível de itens da entrega.
    4. **Troca de Volumes para Quantidade de Itens**: A pílula agora exibe a contagem de produtos/itens distintos do pedido: `${item.itemsCount} ${item.itemsCount === 1 ? 'item' : 'itens'}`.
    5. **Botão "Detalhes do Pedido"**: Adicionado botão secundário destacado com ícone `FileText` que chama `onViewOrder(item)` e abre o `OrderDetailsModal` full screen.

---

## 0.1. Correção do Código Sequencial em Recebimentos de Mercadorias (Card #—)
- **Status**: Concluído com Sucesso! 🚀
- **Problema**: Os cards de recebimento de mercadoria exibiam `#—` (sem código) quando o recebimento era finalizado ou rascunho sem `receiptIndex` gravado.
- **Causa Raiz**:
  1. `finalizeGoodsReceipt` em `goodsReceiptService.ts` não preservava nem gerava `receiptIndex`, sobrescrevendo o registro local e persistindo `undefined`.
  2. `ReceiptFormModal.tsx` não mantinha `receiptIndex` no estado e não o enviava na chamada de finalização.
  3. Não havia rotina de auto-cura para registros legados ou já salvos sem `receiptIndex`.
- **Solução Implementada**:
  - `goodsReceiptCode.ts`: Criado helper `getGoodsReceiptIndex` compatível com camelCase (`receiptIndex`) e snake_case (`receipt_index`), com tratamento seguro em `formatGoodsReceiptCode` e `getNextGoodsReceiptIndex`.
  - `goodsReceiptService.ts`: `finalizeGoodsReceipt` e `reverseGoodsReceipt` agora preservam/geram o `receiptIndex`. Implementada função `ensureReceiptIndexes` com auto-cura e sincronização transparente com o Supabase.
  - `ReceiptFormModal.tsx`: Estado `receiptIndex` integrado com exibição no cabeçalho do modal e persistência contínua.
- **Melhoria no Formulário de Recebimento (Busca de Fornecedor com 2 Dígitos)**:
  - Implementado parâmetro `minChars` em `SupplierAutocomplete` e `useSupplierAutocomplete`.
  - No formulário de recebimento (`ReceiptFormModal.tsx`), configurado `minChars={2}` para só abrir e listar sugestões de fornecedor quando o usuário digitar pelo menos 2 caracteres, evitando listas intrusivas ao focar no campo.
  - Testes: Criada suíte unitária `useSupplierAutocomplete.test.ts` com 4 testes aprovados (100%).

---

## 1. Atualização do App Mobile (Build 17 e Atualização Obrigatória)
- **Status**: Concluído com Sucesso! 🚀
- **Detalhes da Build Nativa**:
  - Expo EAS Build: `https://expo.dev/accounts/morante/projects/mobile/builds/27e6a150-0697-4e47-8297-5ecf8ef34751`
  - Version Code: **17**, Version: **1.6.0**, Runtime Version: **1.6.0**
  - APK URL Oficial: `https://expo.dev/artifacts/eas/c6GuI7KSgOnw0kSY-zI9S_5dxaFMuc9lCT37XL-ynYE.apk`
- **Sincronização dos Pontos de Download do APK Oficial (Concluído)**:
  - `mobile/app.json`: versionCode 17
  - `mobile/android/app/build.gradle`: versionCode 17
  - `mobile/src/constants/appVersion.ts`: APP_BUILD 17
  - `mobile/src/hooks/useMandatoryAppUpdate.ts`: TARGET_OFFICIAL_BUILD 17 e URL do APK 17
  - Banco Supabase (`settings` -> `app`): `minimumAndroidBuild: 17`, `requiredAndroidBuild: 17`, URL atualizada
  - Landing Page ERP (`MobileAppLanding.tsx`): Botão de download e QR Code apontando para a Build 17
  - Perfil do Usuário ERP (`erp/src/pages/App/Profile/Index.tsx`): Botão "Baixar App Android Oficial"
  - Menu de Perfil no Topo do ERP (`erp/src/AppLayout.tsx`): Botão "Baixar App Android"
  - Menu de Logística do ERP (`erp/src/components/layout/DesktopNav.tsx`): Botão "Baixar App Android"
- **Publicação OTA (Concluído com Sucesso)**:
  - Data: 12/09/2026
  - Mensagem: *"Ajustes layout operacao e botoes mapa"*
  - Branch: `production`
  - Runtime Version: `1.6.0`
  - Plataforma: `android`
  - Update Group ID: `a37f10fd-05e9-4e09-b678-5d0f3d8ee131`
  - Android Update ID: `01a09638-87b4-7e32-9c2d-595bca816de0`
  - Painel EAS: `https://expo.dev/accounts/morante/projects/mobile/updates/a37f10fd-05e9-4e09-b678-5d0f3d8ee131`

---

## 2. Refatoração e Aplicação de Princípios de Código Limpo (10 Arquivos Concluídos)
- **Status**: Concluído com Sucesso! 🚀
- **Diretriz**: Aplicados princípios de Clean Code, Responsabilidade Única (SRP), Coesão de Camadas e Desacoplamento Seguro (`modularizacao_codigo` e `AGENTS.md`).

### Lista dos 10 Arquivos Refatorados:
1. `erp/src/pages/App/Stock/InboundInvoices/InboundInvoiceItemsReview.tsx`:
   - Reduzido de 618 linhas para 260 linhas.
   - Extraídos: `useInboundInvoiceSuggestions.ts`, `inboundProductPreparationService.ts`, `InboundAiExistingVariationModal.tsx`, `InboundAiNewVariationModal.tsx`.
   - Testes vitest: 9 arquivos de teste / 31 testes aprovados.

2. `mobile/src/features/products/modals/tabs/ProductFormBasicTab.tsx`:
   - Reduzido de 628 linhas para 240 linhas.
   - Extraídos: `OpportunitySelectModal.tsx` e `CategoryMultiSelectList.tsx` em `mobile/src/features/products/modals/components/`.
   - Compilação TypeScript: 0 erros.

3. `mobile/src/features/assemblies/screens/NativeAssembliesScreen.tsx`:
   - Reduzido de 595 linhas para 330 linhas.
   - Extraído: `AssemblyOrderCard.tsx` em `mobile/src/features/assemblies/components/`.
   - Compilação TypeScript: 0 erros.

4. `mobile/src/features/logistics/components/TodaySummaryCard.tsx`:
   - Reduzido de 628 linhas para 275 linhas.
   - Extraídos: `DeliveryShiftMetricsGrid.tsx` e `DeliverySummaryControlsBar.tsx`.
   - Compilação TypeScript: 0 erros.

5. `mobile/src/features/logistics/screens/NativeLogisticsScreen.tsx`:
   - Reduzido de 843 linhas para 370 linhas.
   - Extraído: `LogisticsOrderCard.tsx` em `mobile/src/features/logistics/components/`.
   - Compilação TypeScript: 0 erros.

6. `mobile/src/services/financial/financialIntentValidator.ts`:
   - Reduzido de 731 linhas para 535 linhas.
   - Extraídos: `validators/loanIntentValidator.ts` e `validators/businessPurposeValidator.ts`.
   - Compilação TypeScript: 0 erros.

7. `mobile/src/services/financial/financialSlotFilling.ts`:
   - Reduzido de 694 linhas para 490 linhas.
   - Extraído: `patchers/installmentSlotPatcher.ts`.
   - Compilação TypeScript: 0 erros.

8. `erp/src/pages/utils/whatsapp.ts`:
   - Reduzido de 694 linhas para 346 linhas.
   - Extraído: `whatsappTemplates.ts` reunindo todos os geradores e builders de mensagens/orçamentos.
   - Testes vitest: 100% aprovados.

9. `erp/src/pages/utils/whatsappGraphService.ts`:
   - Reduzido de 656 linhas para 590 linhas.
   - Extraído: `whatsappHttpClient.ts` isolando chamadas HTTP autenticadas e testes de conexão da Meta Graph API.
   - Testes vitest: 100% aprovados.

10. `erp/src/pages/App/Stock/components/InventoryAuditModal.tsx`:
    - Reduzido de 634 linhas para 495 linhas.
    - Extraído: `InventoryAuditTable.tsx` desacoplando a tabela física de contagem, inputs de ajuste e ações de itens.
    - Testes vitest: 100% aprovados.

---

## 3. Correção do Assistente de IA e Marcadores do Mapa no Mobile
- **Status**: Concluído com Sucesso! 🚀
- **Problema 1: "Desculpe, ocorreu uma falha ao consultar assistente" no App**:
  - **Causa Raiz**: O `MobileAgentClient.getApiKey()` buscava apenas da tabela `settings` (que não continha a chave do Gemini configurada) e de `process.env`. No APK compilado do React Native, `process.env` em runtime retornava vazio/indefinido, disparando erro de chave não configurada.
  - **Solução Aplicada**:
    - Adicionada chave de contingência padrão do projeto (`DEFAULT_GEMINI_API_KEY`) no `mobileAgentClient.ts`.
    - Melhorado o tratamento de erro em `useFinancialAiChat.ts` para reportar diagnósticos claros (chave/rede/servidor) em vez de ocultar a causa raiz.
- **Problema 2: Ícones do Depósito e Destinos não aparecendo no Mapa de Entregas**:
  - **Causa Raiz**: No `DeliveryMarker.tsx`, os componentes `<Marker>` estavam com `tracksViewChanges={false}` fixo e estático. No Google Maps nativo para Android, componentes filhos customizados com SVGs/Views são renderizados em branco/invisíveis se `tracksViewChanges` estiver desligado antes do primeiro ciclo de desenho.
  - **Solução Aplicada**:
    - Implementado `tracksViewChanges` dinâmico via state/timer (`1200ms`) em `DeliveryMarker.tsx`. O mapa renderiza todos os ícones (`Store`, `Truck`, `Check`, números de sequência) e, após desenhados, desativa o tracking para máxima performance e economia de bateria/GPU.
  - **Validação**: `npx tsc --noEmit` executado com **0 erros**.
- **Publicação OTA (Concluído com Sucesso)**:
  - Branch: `production`
  - Runtime Version: `1.6.0`
  - Plataforma: `android`
  - Update Group ID: `5c11788e-649a-4f2b-9fed-4ee9f7ecd121`
  - Android Update ID: `01a091bb-4a85-71ac-a10f-9e4772aff91c`
  - Painel EAS: `https://expo.dev/accounts/morante/projects/mobile/updates/5c11788e-649a-4f2b-9fed-4ee9f7ecd121`
  - Mensagem: *"Fix Gemini AI agent key fallback and delivery map markers visibility"*

---

## 4. UI/UX do Gerador de Posts & Prompts (Elementos da Campanha)
- **Status**: Concluído com Sucesso! 🚀
- **Solicitação do Usuário**: No gerador de prompts para posts, na aba "Elementos da Campanha", o tópico de **Imagens** deve ficar fechado/recolhido por padrão, e abrir somente quando o usuário clicar nele, exatamente como funcionam os outros tópicos (accordions).
- **Alteração Realizada**:
  - Em `erp/src/pages/App/Marketing/Posts/components/CampaignElementsPanel.tsx`:
    - Adicionado o estado `openImages` inicializado como `false`.
    - Transformada a visualização estática anterior em um item de acordeão com botão expansível (`▸` / `▾`), título "Fotos do Produto (Prompt)" e badge de status ("Configurado ✓", "Disponível" ou "Nenhum produto").
    - A faixa de fotos `PromptImagesStrip` só é exibida ao expandir o bloco, mantendo a tela limpa e padronizada com os demais tópicos.

---

## 5. UI/UX do Gerador de Posts (Texto Estruturado e Selo de Oportunidade)
- **Status**: Concluído com Sucesso! 🚀
- **Texto Estruturado Recolhido**: Em `erp/src/pages/App/Marketing/Posts/components/PromptPreview/PromptPreview.tsx`, o bloco "Texto Estruturado do Prompt" agora inicia fechado por padrão (`openPromptText: false`) e expande ao clicar no tópico, mantendo o botão "Copiar Prompt" permanentemente acessível no cabeçalho.
- **Selo de Oportunidade**: Em `PromptCopyableImagesList.tsx`, ajustada a resolução prioritária da imagem do selo de oportunidade a partir do produto (`opportunityImageUrl`, `opportunity.image_url`), fallback canônico para "Queima dos Salvados" (`OFFICIAL_QUEIMA_BADGE_URL`) e `fallbackUrl` gerado em SVG dinâmico acionado automaticamente no evento `onError` da tag `<img>`, evitando qualquer ícone quebrado.

---

## 6. App Mobile — Mapa de Entregas (Marcadores Operacionais, Card Compacto e OTA)
- **Status**: Concluído com Sucesso e Publicado via OTA! 🚀
- **Tela Limpa ao Entrar**: Nenhum card abre forçado ao carregar e nenhuma rota é traçada sem clique (`isCardDismissed: true` inicial). O card só aparece ao tocar em uma parada.
- **Card Compacto (`NextDeliveryCard`)**: Removidos textos redundantes ("PARADA SUGERIDA", "⭐ SUGERIDA PELO ROTEIRO") e eliminado o modal grande redundante (`DeliveryBottomSheet`).
- **Marcadores no Mapa (`DeliveryMarker`)**: Substituída a numeração fixa por ícones de operação com as cores canônicas do ERP:
  - 🚚 **Entrega**: Fundo Verde (`#16a34a`) com ícone `Truck`.
  - 📦 **Retirada**: Fundo Roxo (`#7c3aed`) com ícone `Package`.
  - 🔧 **Assistência**: Fundo Amarelo (`#eab308`) com ícone `Wrench`.
  - ↩️ **Coleta de Devolução**: Fundo Laranja (`#f97316`) com ícone `RotateCcw`.
  - Concluída: Fundo Esmeralda com ícone `Check`.
  - Depósito/Loja: Ícone `Store`.
- **Publicação OTA**:
  - Update Group ID: `01f23275-5cfe-4d0e-8f03-8277601d487a`
  - Android Update ID: `01a091d3-863d-758f-9c73-3fd2e9a24b43`
  - Painel EAS: `https://expo.dev/accounts/morante/projects/mobile/updates/01f23275-5cfe-4d0e-8f03-8277601d487a`

---

## 7. App Mobile — Mapa de Entregas (Ajuste Visual do Card de Parada)
- **Status**: Concluído! 🚀
- **Card de Parada**: Removido o texto `"PARADA · #1"` / sequência do topo do card para deixar a interface limpa e focada exclusivamente nas informações do cliente, endereço e ações operacionais (`INICIAR ETAPAS DA ENTREGA` e `Ver pedido`).
- **Estabilidade do ERP Dev**: Garantida integridade e compatibilidade total de caminhos na tela de Etiquetas (`LabelPrinting`) e Recebimentos (`Receipts`), mantendo o ambiente de desenvolvimento funcionando 100% perfeitamente sem erros 404.


---

## 7. Organização e Criação de Subpastas em Módulos Extensos
- **Status**: Concluído com Sucesso! 🚀
- **Módulo `Stock/Receipts` (Recebimento de Mercadorias)**:
  - Antes: 18 arquivos misturados na raiz da pasta.
  - Subpastas criadas e organizadas:
    - `components/`: `InboundNfeItemsSection`, `ReceiptActionButtons`, `ReceiptCard`, `ReceiptFiscalDocumentsSection`, `ReceiptPeriodSelector`, `ReceiptsHeader`, `ReceiptsTable`.
    - `modals/`: `ConfirmReverseModal`, `InboundInvoiceReceiptPickerModal`, `PurchaseReceiptPickerModal`, `ReceiptAIFillModal`, `ReceiptDetailsModal`, `ReceiptFormModal`.
    - `hooks/`: `useReceipts`.
    - `utils/`: `receiptPeriodFilter.types`, `receiptPeriodUtils`, `receiptPeriodUtils.test`.
    - Raiz limpa contendo apenas o orquestrador `Index.tsx`.
- **Módulo `Stock/LabelPrinting` (Impressão e Editor de Etiquetas)**:
  - Antes: 21 arquivos soltos na raiz.
  - Subpastas criadas e organizadas:
    - `modals/`: `LabelGridModelModal`, `LabelImageModal`, `LabelModelCreationModal`, `PriceLabelArtEditorModal`.
    - `services/`: `FabricLabelEngine`, `fixedLabelTextSize`, `LabelPhysicalGeometry`, `LabelUtils`, `priceLabelTemplateSync`, `PriceLabelArtRenderer`.
    - `hooks/`: `useLabelPrintMode`, `usePriceLabelFonts`.
    - Raiz mantendo apenas `Index.tsx`, `LabelConstants.ts`, `LabelGrid.tsx`, `LabelItem.tsx` e `LabelQueue.tsx`.
- **Validação de Testes e Integridade**: Todos os testes unitários foram executados com 100% de sucesso e nenhum caminho de importação quebrado.

---

## 8. Gerador de Prompt para Posts — Correção da Imagem do Selo de Oportunidade
- **Status**: Concluído com Sucesso! 🚀
- **Problema Reportado**: No preview de prompt e assets copiáveis (`PromptPreview` e `PromptCopyableImagesList`), o selo `#4 Selo de Oportunidade` estava exibindo a imagem antiga/horizontal da tabela geral de oportunidades do ERP em vez do selo configurado na aba de Elementos da Campanha (`BADGE`).
- **Causa Raiz Identificada**: `PromptCopyableImagesList` priorizava `product?.opportunityImageUrl` sobre os modelos configurados na campanha, e não recebia a lista completa `elementModels` da biblioteca de elementos da campanha.
- **Solução Implementada**:
  1. `PromptCopyableImagesList`: Passou a receber `models` e `elementModels` e agora busca prioritariamente o modelo configurado no elemento `BADGE` da oportunidade (`generatedAssetUrl` ou anexo `referenceFiles[0]`). Somente se não houver selo configurado no elemento é que aplica os fallbacks.
  2. `PromptPreview`: Repassa os `elementModels` e `effectiveModels` tanto para a geração do prompt estruturado quanto para o `PromptCopyableImagesList`.
  3. `postOfficialAssetResolver` e `postSpecificationBuilder`: Suportam `elementModels` para resolução resiliente do selo oficial mesmo antes de persistir links no banco.
  4. Testes Vitest: 11 testes aprovados (`postOfficialAssets.test.ts`), cobrindo a prioridade estrita do selo da campanha sobre a lista do ERP.

---

## 9. Skill de Organização de Pastas & Organização de `Stock/InboundInvoices`
- **Status**: Concluído com Sucesso! 🚀
- **Nova Skill Criada**: `.agents/skills/organizacao-arquivos-diretorios/SKILL.md`
  - Define o padrão canônico de subpastas (`components/`, `modals/`, `sections/`, `services/`, `hooks/`, `utils/`, `types/`).
  - Estabelece a regra fundamental de Zero Perda de Código, retrocompatibilidade com barrels (`export * from ...`) e verificação obrigatória de imports antes e depois da migração.
  - Registrada no [AGENTS.md](file:///c:/Users/Rosilene/Desktop/morantehub/.agents/AGENTS.md) na tabela de Roteamento de Skills Especializadas.
- **Módulo `Stock/InboundInvoices` Organizado**:
  - Antes: 15 arquivos misturados na raiz do módulo.
  - Subpastas organizadas:
    - `modals/`: `InboundAccessKeyModal.tsx`, `InboundDocumentImportModal.tsx`, `InboundDuplicateKeyAlertModal.tsx`, `InboundInvoiceDetailsModal.tsx`, `InboundXmlImportModal.tsx`, `ManageInboundInvoiceMappingsModal.tsx`.
    - `components/`: `InboundAdditionalCostsSection.tsx`, `InboundAiExistingVariationModal.tsx`, `InboundAiNewVariationModal.tsx`, `InboundInvoiceFiscalReview.tsx`, `InboundInvoiceItemCard.tsx`, `InboundInvoiceItemFiscalReview.tsx`, `InboundInvoiceItemsReview.tsx`, `InboundInvoicesHeader.tsx`, `InboundInvoicesPagination.tsx`, `InboundInvoicesTable.tsx`.
    - Barrels de retrocompatibilidade mantidos na raiz para consumidores externos (`InboundInvoicesHeader.tsx` e `InboundDocumentImportModal.tsx`).
    - Raiz limpa e focada no orquestrador `Index.tsx`.
- **Validação de Testes e Integridade**:
  - Testes do módulo de notas (`inboundInvoicesService.test.ts`) executados e aprovados com 100% de sucesso.
  - Nenhum import quebrado ou tela afetada.

---

## 10. Correção de `elementModels` no PromptPreview & Publicação OTA do App Mobile
- **Status**: Concluído com Sucesso e Publicado via OTA! 🚀
- **Correção no ERP (`PromptPreview.tsx`)**:
  - Corrigido o `ReferenceError: elementModels is not defined`. A propriedade `elementModels` constava na interface `PromptPreviewProps`, porém não havia sido desestruturada na assinatura da função do componente, causando erro em tempo de execução ao tentar renderizar a lista de assets. Corrigido com sucesso.
- **Publicação OTA do App Mobile (EAS Update)**:
  - Branch: `production`
  - Runtime Version: `1.6.0`
  - Plataforma: `android`
  - Update Group ID: `93a2e668-2bd6-4d63-9e2f-d0a8600587de`
  - Android Update ID: `01a0922c-0d4e-7627-a9db-cb09dda20b35`
  - Painel EAS: `https://expo.dev/accounts/morante/projects/mobile/updates/93a2e668-2bd6-4d63-9e2f-d0a8600587de`
  - Os aparelhos dos operadores receberão a atualização automaticamente na próxima reinicialização/abertura do aplicativo.

---

## 11. Resolução Estrita do Selo de Oportunidade no Gerador de Prompts
- **Status**: Concluído com Sucesso! 🚀
- **Problema**: O preview de assets exibia o selo horizontal legado em vez do selo configurado no elemento `BADGE` da campanha (Queima dos Salvados).
- **Causa Raiz**: Presença de fallback hardcoded (`OFFICIAL_QUEIMA_BADGE_URL`) que interceptava e forçava a imagem antiga retangular, além de busca que pegava o primeiro item sem priorizar o modelo com asset gerado/atualizado.
- **Solução Aplicada**:
  - `PromptCopyableImagesList.tsx`: Remoção do fallback hardcoded e ordenação para priorizar modelos com `generatedAssetUrl` / anexo válido mais recente.
  - `postOfficialAssetResolver.ts`: Eliminação de sobreposição por URL legada, assegurando que o asset configurado no elemento tenha prioridade absoluta.
  - `PromptPreview.tsx`: Inclusão de `elementModels` no cálculo de `effectiveModels` e no `specKey` para re-renderização imediata após edição de selos.

---

## 12. Melhorias na Experiência do Mapa de Entregas Mobile
- **Status**: Concluído com Sucesso! 🚀
- **Melhorias Aplicadas**:
  - **Ícone do Caminhão (Posição Atual)**: Removido o círculo azul/borda em volta do caminhão no mapa (tanto no Leaflet web quanto no React Native Maps nativo). Agora exibe estritamente o ícone do caminhão estilizado de forma limpa, com sombra suave e sem moldura circular.
  - **Comportamento Inicial do Mapa**:
    - Removida a seleção automática de entrega e rota ao entrar no mapa.
    - O card inferior (`NextDeliveryCard`) e a linha tracejada da rota (`Polyline`) só aparecem quando o operador clica em um marcador de entrega específico no mapa.
    - Adicionado botão de fechar (`onCloseCard`) no card para permitir desmarcar e voltar à visão limpa panorâmica.

---

## 13. UI/UX do Recebimento de Mercadorias (Seleção Direta de Produto no Item e Layout Compacto)
- **Status**: Concluído com Sucesso! 🚀
- **Solicitação do Usuário**:
  - No recebimento de mercadorias, remover o bloco/input separado de adicionar item no topo que ocupava muito espaço vertical.
  - O input de seleção de produto deve ficar diretamente no próprio item / linha.
  - O botão de adicionar novo item deve ficar na mesma linha do título "Adicionar Item", reduzindo drasticamente o consumo de espaço em tela.
- **Implementação Realizada**:
  - `erp/src/components/PurchaseItemsSection.tsx`:
    - No modo de recebimento (`isReceiptMode = true`), o cabeçalho "ITENS DO RECEBIMENTO" agora possui o botão compacto `+ Adicionar Item` alinhado à direita na mesma linha.
    - O formulário vertical separado no topo com input e botão `+` foi removido no modo de recebimento.
    - Cada item agora suporta seleção direta de produto via `ProductAutocomplete` na própria linha/card: se o item for novo ou não tiver produto vinculado, o input inline aparece diretamente na linha. Após selecionar o produto, a descrição e o custo base são preenchidos automaticamente.
    - O botão de alterar produto permite trocar o produto do item a qualquer momento diretamente na linha.
  - `erp/src/pages/App/Stock/Receipts/ReceiptFormModal.tsx`:
    - Validação em `handleFinalize` para impedir confirmação caso haja algum item adicionado sem produto selecionado (`items.some((item) => !item.productId)`).
- **Validação de Testes**:
  - `goodsReceiptCode.test.ts`: 7 testes aprovados.
  - `useSupplierAutocomplete.test.ts`: 4 testes aprovados.
  - `receiptPeriodUtils.test.ts`: 6 testes aprovados.

---

## 14. Remoção de Produtos de Teste da Lista de Produtos
- **Status**: Concluído com Sucesso! 🚀
- **Solicitação do Usuário**: Remover os produtos de teste da lista de produtos do ERP.
- **Investigação da Causa Raiz**:
  - 66 produtos com nomes como `"Pai B Teste Concorrencia"`, `"Pai A Teste Origem"`, `"Pai Origem Rollback"`, `"Pai B Concorrencia Mesma Var"` e `"Pai C Concorrencia Mesma Var"` estavam salvos com `deleted: false`, fazendo com que aparecessem na lista de produtos.
  - Esses produtos foram gerados durante execuções de testes de concorrência (`moveVariationConcurrency.test.ts`). O cleanup do teste tentava realizar `DELETE` físico via chave anon, mas uma trigger de integridade do Postgres impedia a exclusão física (`"Não é permitido excluir produtos do banco de dados para preservar o histórico. Utilize o campo active como false para desativar o produto."`).
- **Solução Aplicada**:
  1. Todos os 66 produtos de teste foram atualizados no banco de dados com `deleted: true`, `active: false` e `status: 'trash'`, sendo removidos imediatamente da lista de produtos ativa.
  2. Ajustado o cleanup dos testes em `erp/src/pages/utils/moveVariationConcurrency.test.ts` para realizar o soft delete correto (`update({ deleted: true, active: false, status: 'trash' })`), garantindo que novas execuções dos testes não voltem a poluir a listagem de produtos.
- **Validação**:
  - Consulta ao banco confirmou **0 produtos de teste restantes** na lista ativa (`Remaining test products in active list: 0`).
  - Suíte `moveVariationConcurrency.test.ts` executada com **3 testes aprovados (100%)** e cleanup validado.

---

## 15. Padrão Visual Canônico de Inputs (Fundo Branco vs Cinza, Borda Inferior e Focus Azul)
- **Status**: Concluído com Sucesso! 🚀
- **Regra Canônica de UI/UX**:
  - **Campos Editáveis**:
    - **Fundo**: Branco (`bg-white dark:bg-slate-900`).
    - **Borda**: Apenas embaixo (`border-0 border-b-2 border-slate-200 dark:border-slate-700 rounded-none`).
    - **Foco (Focus)**: Borda inferior azul (`focus:border-blue-600 dark:focus:border-blue-500 outline-none`).
  - **Campos Não-Editáveis (Calculados / Fixados / Somente Leitura)**:
    - **Fundo**: Cinza (`bg-slate-100` / `bg-slate-50 dark:bg-slate-800/60`), sem borda de foco azul.
- **Arquivos Ajustados**:
  - `erp/src/components/PurchaseItemsSection.tsx` (tabela desktop e cards mobile nos itens do recebimento e compras).
  - `erp/src/pages/App/Stock/Receipts/ReceiptFormModal.tsx` (data do recebimento e campos de despesas `ToggleValueField`).
  - `erp/src/pages/App/Stock/Receipts/InboundNfeItemsSection.tsx` (itens da NF-e vinculados).
  - `erp/src/components/SupplierAutocomplete.tsx` (input de busca e seleção de fornecedores).
  - `docs/negocio/operacao/padroes-visuais-ui.md` (Seção 6 oficializada).

---

## 16. Subtotal e Total do Item Final no Recebimento de Mercadorias e Compras
- **Status**: Concluído com Sucesso! 🚀
- **Solicitação do Usuário**:
  - "Total do item deve se chamar total do item final, antes dele crie um campo de subtotal que é o valor total antes do frete, desconto, outras despesas".
- **Regra de Negócio e Visual**:
  - **Subtotal**: Calculado como `quantity * baseCost` (ou `quantity * unitCost` na importação de NF-e). É o valor bruto do item antes da aplicação de frete, desconto, outras despesas ou IPI rateados.
    - Como campo calculado/não-editável, segue o padrão canônico com fundo cinza (`bg-slate-50/70 dark:bg-slate-900/30`).
  - **Total do item final**: Nome oficial atualizado (antigo "Total do item"). Representa o montante geral do item após a incidência de todos os custos, fretes, descontos e despesas adicionais (`quantity * unitCostFinal`).
    - Fundo cinza (`bg-slate-100/60 dark:bg-slate-900/50`).
- **Arquivos Atualizados**:
  - `erp/src/components/PurchaseItemsSection.tsx`:
    - Tabela desktop: Adicionada a coluna `Subtotal` imediatamente antes de `Total do item final`. O cabeçalho foi renomeado de "Total do item" para "Total do item final".
    - Linha de itens: Inserida a célula de `Subtotal` (`formatCurrency(itemSubtotal)`). `colSpan` do `tfoot` e da linha vazia ajustados de forma consistente (8 e 10 respectivamente).
    - Cards mobile: Inserido o bloco de `Subtotal` antes do `Total do item final`.
  - `erp/src/pages/App/Stock/Receipts/InboundNfeItemsSection.tsx`:
    - Grid expandida para 8 colunas.
    - Inserido card de `Subtotal` (`item.quantity * item.unitCost`) antes do card de `Total do item final`.
- **Validação de Testes**:
  - Testes unitários do recebimento e componentes executados: 17 testes aprovados (100%).

---

## 17. Largura Mínima dos Campos de Métricas dos Itens (Responsividade Fluida por Conteúdo Interno)
- **Status**: Concluído com Sucesso! 🚀
- **Solicitação do Usuário**:
  - "a alrgura minima desses campso é igual ao tamanho do conteudo interno deles, entao se precisa chegar ao taamanho minimo para caber outros campos na linha, nao tem problema, pode diminuir ate chegar no minimo"
- **Solução Implementada**:
  - Em vez de uma grid fixa com colunas engessadas (`grid-cols-2 sm:grid-cols-3` ou `grid-cols-8`) que forçava espaços em branco gigantescos e quebras de linha artificiais, foi implementado layout flexível responsivo:
    - Container: `flex flex-wrap gap-2 pt-2 items-stretch`.
    - Cada campo (Custo unitário, Desconto, Frete, Outras despesas, Custo final, Subtotal e Total do item final):
      - `flex-1 min-w-fit`: Permite diminuir até a largura mínima intrínseca necessária para o seu conteúdo interno (`min-w-fit` / `whitespace-nowrap`).
      - Se a tela/janela tiver espaço, acomoda o máximo de campos possíveis na mesma linha (cabendo de 4 a todos os 7 campos lado a lado).
      - Os campos que dividem a linha expandem harmoniosamente com `flex-1` para preencher 100% da largura, sem sobrar lacunas vazias.
  - Aplicado em:
    - `erp/src/components/PurchaseItemsSection.tsx` (cards de itens de recebimento e compras).
    - `erp/src/pages/App/Stock/Receipts/InboundNfeItemsSection.tsx` (itens vinculados de NF-e).

---

## 18. Alinhamento Estrutural e Modal Full Screen no Recebimento com NF-e
- **Status**: Concluído com Sucesso! 🚀
- **Solicitação do Usuário**:
  - "o modal de adicionar nfe que abre ao cadasstrar recibimento de mercadoria com nfe, deve seer o mesmo form do cadastro normmal da nf de entrada do moidul oide nf entrada, a diferença é soi que esta em modal msm"
  - Clarificação: "a opçao 2 mas em um modal full screen esse form" (manter o picker seletor de notas existentes, mas a tela de preenchimento/conferência do recebimento com base na NF-e ter a mesma estrutura do form de NF de entrada, e ser renderizado em modal full screen).
- **Implementações Realizadas**:
  1. **Full Screen no Cadastro de NF de Entrada (`InboundDocumentImportModal.tsx`)**:
     - O modal de importação e cadastro de NF de entrada foi atualizado de `max-w-5xl` para **Full Screen** (`w-screen h-screen rounded-none`), proporcionando máximo aproveitamento de tela tanto no módulo de NF de entrada quanto ao ser disparado pelo picker de recebimento ("+ Cadastrar nova NF de entrada").
  2. **Full Screen no Recebimento com NF-e (`ReceiptFormModal.tsx`)**:
     - Quando `initialInboundInvoice` está ativo, o modal agora opera em **Full Screen** (`h-screen w-screen rounded-none`) com cabeçalho rico, identificação da NF-e e emitente.
  3. **Mesma Estrutura de Formulário do Módulo de NF de Entrada**:
     - **Resumo Fiscal Oficial**: Inserido o componente canônico `<InboundInvoiceFiscalReview invoice={initialInboundInvoice} />` no topo, exibindo Natureza da Operação, Total dos Produtos, Total da NF, Frete, IPI, Desconto, Seguro e Outras Despesas.
     - **Dados da NF e Fornecedor**: Card padronizado exibindo Emitente, CNPJ, Chave de Acesso formatada em blocos de 4 dígitos e fornecedor vinculado no ERP.
     - **Itens da NF-e (`InboundNfeItemsSection.tsx`)**: Cabeçalho com indicador dinâmico de progresso de vínculos (`X de Y itens vinculados ao ERP`), dados fiscais detalhados por item (Cód. fornecedor, Descrição, NCM, CFOP, Unidade) e métricas alinhadas com o padrão (`min-w-fit`).
     - **Footer Fixo**: Total final com destaque, indicador de vínculos, botão de cancelar e confirmação de recebimento.
- **Validação de Testes**:
  - Bateria de testes de código de recebimento, autocomplete e filtros executada: 17 testes aprovados (100%).

---

## 19. Regra Global de 2 Dígitos para Pesquisa/Sugestões de Fornecedor no ERP e App Mobile
- **Status**: Concluído com Sucesso! 🚀
- **Solicitação do Usuário**:
  - "todos os campos de pesquisa de fornecedor do nnosso erp e do app deve ter de dgitiar 2 digitos para aparecer as sdugestoes"
- **Princípio e Experiência do Usuário (UX)**:
  - Eliminar poluição visual e abertura intrusiva de listas gigantes ao apenas focar ou clicar no campo de fornecedor.
  - Exigir obrigatoriamente a digitação de pelo menos 2 caracteres (`query.trim().length >= 2`) antes de disparar filtros ou apresentar o dropdown/cards com sugestões.
  - Informar de forma amigável no placeholder e dicas textuais que são necessários 2 caracteres para pesquisar.
- **Implementações Realizadas**:
  1. **ERP — Hook Central `useSupplierAutocomplete.ts`**:
     - Parâmetro padrão de `minChars` alterado para `minChars = 2`.
     - Sugestões só são calculadas e o menu flutuante só é aberto quando `query.trim().length >= minChars`.
  2. **ERP — Componente Global `SupplierAutocomplete.tsx`**:
     - Prop padrão atualizada para `minChars = 2`.
     - Placeholder padrão atualizado para `"Digite 2 ou mais letras para buscar fornecedor..."`.
     - Como `SupplierAutocomplete` é o componente oficial de seleção de fornecedores em todo o ERP, todas as telas herdaram a regra instantaneamente:
       - **Compras**: `Purchases/PurchaseFormModal.tsx`
       - **Recebimento de Mercadorias**: `Receipts/ReceiptFormModal.tsx` e `Receipts/PurchaseReceiptPickerModal.tsx`
       - **Filtros de Recebimentos**: `Receipts/ReceiptsHeader.tsx`
       - **Estoque & Auditoria**: `Stock/components/InventoryAuditModal.tsx`
  3. **ERP — Cadastro e Edição de Produtos (`ProductSupplierField.tsx`)**:
     - Busca com debounce e filtro interno ajustada com a guarda: `if (query.length < 2) return [];`.
     - Placeholder atualizado para `"Digite 2 ou mais letras para buscar fornecedor..."`.
  4. **App Mobile — Cadastro e Edição de Produtos (`ProductFormPricesTab.tsx`)**:
     - Implementado campo de busca estilizado com ícone de lupa, botão para limpar campo e feedback interativo.
     - Filtro `visibleSuppliers` implementado com verificação estrita: `if (q.length < 2) return selectedSup ? [selectedSup] : [];`.
     - Mensagem de orientação caso o usuário digite apenas 1 caractere: `"Digite pelo menos 2 caracteres para exibir as sugestões."`.
     - Preserva o fornecedor atualmente selecionado visível no card para fácil identificação e desmarcação.
  5. **Testes Unitários Automatizados**:
     - Atualizada a suíte `erp/src/components/supplier-autocomplete/useSupplierAutocomplete.test.ts`.
     - Validação do valor padrão `minChars = 2` e testes de digitação de 0, 1 e 2 caracteres.
     - 5 testes executados e 100% aprovados.

---

## 20. Alinhamento dos Ícones de Tipo de Pedido e Caminhão de Local Atual no Mapa de Entregas
- **Status**: Concluído com Sucesso! 🚀
- **Solicitação do Usuário**:
  - "aqui na foto é no wb expo em dev, os icones estao em numeros, mas o certo é icone de tipo do pedido, igual fica no app em produçao. ja o icone do local aatual, ta certo, é so um caminhao sem container, mas o app q nao ta terndo esse caminhçao igual o do web"
- **Diagnóstico da Causa Raiz**:
  1. **Números no Web (`DeliveryMapView.web.tsx`)**: O mapa web embutido em Leaflet renderizava `p.seq` (os números `1`, `2`, `3`...) dentro dos círculos das paradas, enquanto no app nativo em produção (`DeliveryMarker.tsx`) eram renderizados os ícones semânticos de atividade (`Truck`, `Package`, `Wrench`, `RotateCcw`, `Check`, `AlertTriangle`) com suas respectivas cores de status.
  2. **Caminhão do Local Atual no App Nativo (`DeliveryMarker.tsx`)**: O marcador nativo do motorista utilizava `<Truck size={28} color="#2563eb" fill="#2563eb" />` do Lucide, que desenha um caminhão baú fechado/container retangular. No web, por sua vez, era renderizado o emoji nativo `🚚`, que representa um caminhão sem container alto (estilo picape/mini truck com caçamba aberta).
  3. **Camada de Tiles no Web**: O mapa web do Leaflet utilizava os tiles do CartoDB que exibiam a marca d'água "API KEY REQUIRED".
- **Soluções Implementadas**:
  1. **Sincronização dos Ícones de Pedido no Web (`DeliveryMapView.web.tsx`)**:
     - Integrada a função canônica `getOperationActivityType`.
     - Adicionados os mesmos SVGs vetoriais dos ícones oficiais:
       - **Entrega**: Caminhão (`Truck`) com fundo verde (`#16a34a`).
       - **Retirada**: Pacote (`Package`) com fundo roxo (`#7c3aed`).
       - **Assistência Técnica**: Chave (`Wrench`) com fundo amarelo (`#eab308`).
       - **Coleta de Devolução**: Retorno (`RotateCcw`) com fundo laranja (`#f97316`).
       - **Concluída**: Check (`✓`) com fundo verde esmeralda (`#10b981`).
       - **Não Atendida**: Alerta (`!`) com fundo vermelho (`#ef4444`).
     - Adicionado o pino indicador inferior (`pinTip`), alinhando o formato visual exatamente com o do app nativo.
     - Atualizados os tiles para OpenStreetMap limpo sem marcas d'água.
  2. **Caminhão Sem Container no App Nativo (`DeliveryMarker.tsx`)**:
     - O marcador de motorista do app nativo agora utiliza o emoji `🚚` (`<Text style={styles.driverEmoji}>🚚</Text>`), idêntico ao do web, proporcionando o caminhãozinho sem container em ambas as plataformas.

---

## 21. Rastreamento em Tempo Real dos Outros Usuários no Mapa com Alerta de Sinal Vermelho "?"
- **Status**: Concluído com Sucesso! 🚀
- **Solicitação do Usuário**:
  - "quero que os outros usuarios parecem no mapa tbm, se a pessoa desligar ou ficar sem gps, ponteiro dele no mapa fica parado na ultima localziaçao que tava com sinal de ? do lado em vermelho"
- **Princípio e Experiência Operacional**:
  - Toda a equipe (motoristas, entregadores, montadores) pode acompanhar a localização geográfica mútua no mapa de operações em tempo real.
  - Se um membro da equipe desligar o GPS, fechar o aplicativo ou ficar sem sinal por mais de 3 minutos:
    - O ponteiro dele **permanece visível no mapa, exatamente na última localização conhecida**.
    - Ao lado do caminhãozinho, é exibido um **badge circular vermelho com o sinal `?` em destaque**.
    - O popup explicativo informa: *"⚠️ Sem sinal de GPS / Desligado • Visto pela última vez às HH:mm"*.
  - Quando o usuário está com GPS ativo e sinal recente, o caminhãozinho é exibido com badge ativo e nome do membro.
- **Implementações Realizadas**:
  1. **Banco de Dados Supabase (`team_locations`)**:
     - Criada migration oficial `20260912110000_create_team_locations.sql` com colunas:
       - `user_id`: Identificador único do membro da equipe.
       - `user_name`: Nome da pessoa exibido no marcador.
       - `latitude`, `longitude`: Coordenadas do último sinal de GPS.
       - `is_gps_active`: Booleano que indica se o sinal está ativo.
       - `last_seen`: Timestamp do último ping recebido.
     - Habilitado Row Level Security (RLS) e ativado **Supabase Realtime** (`supabase_realtime`) para propagação imediata entre os aparelhos conectados.
  2. **Camada de Domínio Puro (`teamLocationStatus.ts`)**:
     - Função `evaluateDisconnectedState`: Detecta se `!is_gps_active` ou se o tempo decorrido desde `last_seen` ultrapassou 3 minutos (`DISCONNECT_THRESHOLD_MS = 180.000 ms`).
     - Função `formatTeamMemberStatusLabel`: Gera os textos de status para tooltips e listas.
  3. **Serviço de Comunicação e Hook (`teamLocationService.ts` e `useTeamLocations.ts`)**:
     - `broadcastMyLocation`: Persiste a localização do usuário logado e atualiza para `is_gps_active = false` caso o GPS seja desligado, preservando a última latitude e longitude.
     - `subscribeToTeamLocations`: Escuta eventos de banco via Realtime Postgres Changes e atualiza a lista instantaneamente.
  4. **Marcador Nativo Android (`DeliveryMarker.tsx`)**:
     - Suporte a `isTeamMember` e `teamMember`.
     - Exibe o caminhãozinho `🚚`, pílula com o nome do colega e o badge circular vermelho com o símbolo `?` quando desligado ou sem sinal.
  5. **Marcador Web Leaflet (`DeliveryMapView.web.tsx`)**:
     - Renderiza os outros membros da equipe com pins HTML personalizados, nome do membro, caminhão e badge flutuante vermelho com `?`.
  6. **Integração nas Telas de Operação**:
     - Conectado em `DeliveriesHubScreen.tsx`, `TodayDeliveriesScreen.tsx`, `NativeLogisticsScreen.tsx` e `App.tsx`.
  7. **Validação e Testes**:
     - Testes unitários de domínio executados: **6 de 6 testes aprovados**.
     - Compilação TypeScript (`npx tsc --noEmit`): **0 erros**.

---

## 22. Correção Crítica na Persistência de Manuseios em Pedidos de Venda
- **Status**: Concluído com Sucesso! 🚀
- **Solicitação do Usuário**:
  - "os manuseios nao esta persistindo, na ediçao de um pedido de venda, ou estao persistindo como manuseio de montagem no local da entrega, msm que eu selecione outro, verifique e corrija isso, pois o manuseio selecionado deve persistir como manuseio selecionado realmente."
- **Diagnóstico e Causa Raiz**:
  1. **Efeito Destrutivo no Hook (`useSalesOrderForm.ts`)**:
     - Havia um `useEffect` nas linhas 213–221 que escutava `shipping.orderType` e forçava `setItems(currentItems => currentItems.map(item => ({ ...item, handlingType: shipping.orderType })))`.
     - Ao abrir o modal de edição de qualquer pedido existente (`loadOrderForEditing`), `shipping.orderType` era carregado do banco (onde frequentemente havia o valor legado ou padrão `"Na caixa > Montagem no local da entrega"`).
     - Como a referência inicial começava vazia `""`, o efeito disparava no primeiro render e **sobrescrevia o manuseio de todos os itens do pedido**, anulando as escolhas operacionais salvas.
  2. **Assimetria de Sincronização**:
     - O manuseio no Morante Hub pertence a cada item individualmente (`item.handlingType`). Quando o usuário alterava o manuseio de um item na tabela de produtos, o valor de `shipping.orderType` não era sincronizado com o item, mantendo o shipping em descompasso com o que o usuário escolheu.
  3. **Migração Agressiva (`handlingMigration.ts`)**:
     - A função `migrateOrderHandlings` aplicava o `fallbackHandling = order.shipping?.orderType` mesmo quando o item já possuía um manuseio válido preenchido, e dava prioridade ao `order.shipping.orderType` em vez de extrair o manuseio prioritário dos itens (`firstItemHandling`).
- **Soluções Implementadas**:
  1. **Remoção do Efeito Destrutivo em `useSalesOrderForm.ts`**:
     - Removido o efeito que sobrescrevia itens a partir de `shipping.orderType`.
     - Implementada sincronização unidirecional correta: `shipping.orderType` acompanha o manuseio definido nos itens (`firstHandling = items.find(i => i.handlingType?.trim())?.handlingType`).
     - Em `getOrderData` e `currentOrder`, assegurado que `shipping.orderType` reflete o manuseio selecionado nos itens.
  2. **Garantia de Atualização no Modal de Edição (`OrderEditModal.tsx`)**:
     - No momento de submissão da edição (`handleUpdate`), `updatedOrder` garante explicitamente que `items` e `shipping.orderType` refletem o estado mais recente de `form.state.items`, sem risco de reversão para valores legados.
  3. **Preservação Estrita em `handlingMigration.ts`**:
     - Ajustado para que `fallbackHandling` seja aplicado exclusivamente quando o item não possui nenhum manuseio informado (`!item.handlingType?.trim()`).
     - `migratedOrderType` prioriza o manuseio real dos itens (`firstItemHandling || resolveHandlingLabel(order.shipping?.orderType)`).
  4. **Bateria de Testes Automatizados**:
     - Criado teste unitário `src/pages/utils/handlingMigration.test.ts` (4 testes cobrindo preservação de manuseios individuais, fallbacks e legados do Bling).
     - Criado teste de integração de hook `src/pages/App/SalesOrder/salesOrderHandlingPersistence.test.ts` (2 testes em ambiente jsdom validando que o carregamento para edição e a alteração de manuseio persistem perfeitamente).
     - **Todos os 6 testes aprovados com 100% de sucesso**.

---

## 23. Remoção do Tooltip do Mapa e Preservação do Modal Resumido do Pedido
- **Status**: Concluído com Sucesso! 🚀
- **Solicitação do Usuário**:
  - "vc retirou o odal de pedido de quando clcia no icoene do pedido no mapa, eu so queria que tirasse o tooltip o pedido, nao o modal resimido do pedido que tem ate o botao de mostrar detalhes do pedido"
- **Ajustes Realizados**:
  1. **Remoção Estrita do Tooltip/Balão do Mapa (`DeliveryMapView.web.tsx`)**:
     - O `m.bindPopup(...)` dos marcadores de paradas foi removido do Leaflet.
     - Aquele balãozinho branco flutuante com o triângulo verde sobre o mapa não abre mais ao tocar ou clicar no ícone do pedido.
  2. **Preservação do Modal Resumido do Pedido (`DeliveryBottomSheet`)**:
     - Ao clicar no ícone do pedido no mapa, abre normalmente o **modal resumido do pedido** (`DeliveryBottomSheet`), que exibe a contagem de itens, o container avermelhado de observações com rótulos individuais e o botão *"Ver Detalhes do Pedido"*.
     - O botão *"Ver Detalhes do Pedido"* dentro do modal resumido abre o modal maior e completo (`OrderDetailsModal`).
  3. **Observações da Entrega em Flex Wrap Horizontal**:
     - O container de observações (`obsTagsContainer`) foi ajustado de `flexDirection: 'column'` para `flexDirection: 'row'`, com `flexWrap: 'wrap'` e `gap: 6`.
     - Os rótulos de observação agora ficam organizados lado a lado, aproveitando a largura do modal e quebrando linha apenas quando necessário, tornando o card muito mais compacto e limpo.
  4. **Validação**:
     - Compilação TypeScript do mobile (`npx tsc --noEmit`): **0 erros**.
     - Testes unitários do mobile: **100% aprovados**.

---

## 24. Exibição de Distância (KM) e Tempo Estimado no Modal Resumido de Entrega
- **Status**: Concluído com Sucesso! 🚀
- **Solicitação do Usuário**:
  - "nesse modal tem que ter a km e tempo estimado"
- **Implementações Realizadas**:
  1. **Propagação de Métricas da Routes API (`DeliveriesHubScreen.tsx`)**:
     - O hook `useRoutesApi` já calcula em tempo real o trajeto da localização atual até a parada selecionada. As métricas `distanceKm` e `durationMin` foram passadas diretamente como props para o `<DeliveryBottomSheet ... />`.
  2. **Pílulas Elegantes de KM e Duração (`DeliveryBottomSheet.tsx`)**:
     - Calculados `effectiveKm` e `effectiveDuration` com suporte a tempo real da Routes API e fallback inteligente para o cadastro do pedido.
     - Inseridas as novas pílulas na linha de métricas (`pillsRow`):
       - **Quilometragem**: `<Navigation size={12} /> {effectiveKm} km` em pílula azul suave (`#eff6ff` / `#1e293b`).
       - **Tempo Estimado**: `<Timer size={12} /> ~{effectiveDuration} min` em pílula ciano suave (`#f0f9ff` / `#0c4a6e30`).
  3. **Validação**:
     - Compilação TypeScript do mobile (`npx tsc --noEmit`): **0 erros**.
     - Testes unitários do mobile: **100% aprovados**.

