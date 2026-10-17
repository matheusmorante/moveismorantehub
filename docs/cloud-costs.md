# Documentação de Controle de Custos e APIs Cloud (`docs/cloud-costs.md`)

Este documento registra todas as integrações Cloud, APIs externas, limites de cota, modelos de faturamento e regras de segurança para manter o custo do workspace em **R$ 0,00** ou dentro dos limites estritos de segurança.

**Data da última revisão:** 16/10/2026

---

## 1. Google Cloud Platform

### Projeto: `erp-ecommerce-489701`
- **Conta de Faturamento:** Ativa (Billing Account vinculada).
- **Meta Orçamentária:** R$ 0,00 / mês (Consumo 100% dentro do Free Tier).

#### Serviços Google Cloud e limites registrados
| Serviço | Identificador Técnico | Finalidade no ERP / Mobile | Limite Físico Configurado no Google Cloud | Proteção no Código |
|---|---|---|---|---|
| **Routes API (Maps JavaScript)** | `routes.googleapis.com` | Cálculo de rota, distância (km) e duração para frete | **300 req / dia** (Configurado no Google Cloud Console) | Cache 24h em memória + Guard ERP (limite 9.000 req/mês, bloqueio em 95%) + Circuit Breaker (20 req/min) + deduplicação simultânea + proibição de loops automáticos em listas |
| **Maps JavaScript API** | `maps-backend.googleapis.com` | Carregamento da biblioteca de mapas e componentes web | **100 map loads / dia** (Bloqueio automático ao atingir) | Carregamento único singleton (`__googleMapsPromise`) |
| **Places API** | `places-backend.googleapis.com` | Autocomplete de endereços de clientes | **100 req / dia** (Bloqueio automático ao atingir) | Debounce 600ms + Min 3 caracteres |
| **Geocoding API** | `geocoding-backend.googleapis.com` | Resolução de coordenadas a partir de logradouro/CEP | **100 req / dia** (Bloqueio automático ao atingir) | Cache de geocodificação em memória |
| **Maps SDK for Android** | `maps-android-backend.googleapis.com` | Renderização nativa de mapas no App Mobile Android | **100 map loads / dia** (Bloqueio automático ao atingir) | Fallback estático + controle de montagem |

#### APIs Desativadas no Google Cloud (Zero Resíduo)
As seguintes APIs foram **desabilitadas** no projeto por não serem utilizadas:
- ❌ `navigationsdk.googleapis.com` (Navigation SDK)
- ❌ `roads.googleapis.com` (Roads API)
- ❌ `areainsights.googleapis.com` (Places Aggregate API)
- ❌ `distance-matrix-backend.googleapis.com` (Distance Matrix API)
- ❌ `placewidgets.googleapis.com` (Places UI Kit)
- ❌ `maps-embed-backend.googleapis.com` (Maps Embed API)

#### Resolução do incidente de esgotamento de cota da Routes API (16/10/2026)
- **Causa Raiz Identificada:**
  1. No hook `useDeliverySchedule.ts`, havia um `useEffect` em segundo plano que procurava pedidos agendados sem `shipping.distance` e tentava calculá-los em lotes de 5 via Google Routes API, chamando `updateOrder` logo em seguida.
  2. Porém, a query `fetchScheduledAndDraftOrders()` não incluía a coluna `shipping_data:order_data->shipping` no `select`. Portanto, na memória do frontend, `order.shipping.distance` era **sempre `undefined`**.
  3. Cada batch chamava a Routes API 5 vezes e salvava no Supabase (`updateOrder`). O evento `postgres_changes` notificava o Realtime, que chamava `loadOrders`, que recarregava os pedidos ainda sem `shipping.distance`, disparando novamente o `useEffect`.
  4. Esse ciclo recursivo executava centenas de requisições por minuto na abertura da tela de Agendamento de Entregas (ex: 216 chamadas em 2 minutos), esgotando completamente a cota diária de 300 req/dia do Google Cloud Console (`RESOURCE_EXHAUSTED`).
- **Ações Corretivas Implementadas:**
  1. **Eliminação do Loop:** O `useEffect` de cálculo automático em lote no `useDeliverySchedule.ts` foi completamente removido. O cálculo de rota deve ocorrer exclusivamente no momento da criação/edição do pedido ou sob demanda explícita no modal (`OrderDetailsModal.tsx`).
  2. **Carregamento Otimizado de Frete:** `fetchScheduledAndDraftOrders` agora inclui `shipping_data:order_data->shipping`, permitindo que os pedidos exibam a distância e duração já previamente salvas no banco sem requisições adicionais.
  3. **Cache de Rotas 24h:** Adicionado cache em memória (`routeCache`) com TTL de 24 horas indexado pelas coordenadas arredondadas em `routeCalculation.ts`. Consultas para o mesmo destino não disparam novas requisições para a Routes API.
  4. **Circuit Breaker Ativo:** Atualizado no banco (`api_configurations`) o limite do Circuit Breaker para 20 req/min (alinhado à documentação), impedindo que qualquer anomalia futura consuma a cota diária.

---

### Projeto: `morantemobile`
- **Conta de Faturamento:** Nenhuma vinculada (Billing desativado).
- **Serviços Ativos:** Firebase Cloud Messaging (FCM), Firebase Auth, Remote Config. Todos 100% gratuitos por padrão no plano Spark.

---

## 2. Google Gemini Generative AI

- **Modelo:** `gemini-2.5-flash`
- **Finalidade:** Classificação fiscal inteligente de NCM no cadastro de produtos e extração de dados em áudios/pedidos.
- **Proteções Aplicadas:**
  - Rate limit no front-end (`ApiUsageGuard`).
  - Chamadas sob demanda disparadas apenas após digitação consistente do usuário ou clique explícito.

---

## 3. Diretrizes de Segurança de Chaves (API Keys)

1. **Restrições de Aplicação:** Chaves expostas no front-end web devem utilizar restrição por *HTTP Referrers* (ex: domínios autorizados da Morante Hub e `localhost`).
2. **Restrições de API:** Cada chave possui autorização estrita apenas para os serviços que efetivamente utiliza.
3. **Secrets:** Nenhuma credencial administrativa ou Service Account com poderes de faturamento é incluída no código-fonte do cliente.
