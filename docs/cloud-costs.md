# Documentação de Controle de Custos e APIs Cloud (`docs/cloud-costs.md`)

Este documento registra todas as integrações Cloud, APIs externas, limites de cota, modelos de faturamento e regras de segurança para manter o custo do workspace em **R$ 0,00** ou dentro dos limites estritos de segurança.

**Data da última revisão:** 12/10/2026

---

## 1. Google Cloud Platform

### Projeto: `erp-ecommerce-489701`
- **Conta de Faturamento:** Ativa (Billing Account vinculada).
- **Meta Orçamentária:** R$ 0,00 / mês (Consumo 100% dentro do Free Tier).

#### Serviços Google Cloud e limites registrados
| Serviço | Identificador Técnico | Finalidade no ERP / Mobile | Limite Físico Configurado no Google Cloud | Proteção no Código |
|---|---|---|---|---|
| **Routes API (Maps JavaScript)** | `routes.googleapis.com` | Cálculo de rota, distância (km) e duração para frete | **Ativa (confirmada em 12/10/2026); quota diária personalizada não verificada** | Guard ERP (limite padrão 1.000 req/mês, bloqueio em 95%) + Circuit Breaker (20 req/min) + deduplicação simultânea |
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

#### Modelo de custo da Routes API
- O código usa `Route.computeRoutes` com os campos `distanceMeters`, `durationMillis` e `path`, classificados na SKU Essentials.
- A tabela global do Google informa 10.000 requisições mensais sem cobrança e, acima da franquia, USD 5 por 1.000 eventos na primeira faixa paga. O faturamento agrega o uso dos projetos vinculados à mesma conta de cobrança.
- O guard interno mantém um teto conservador padrão de 1.000 requisições mensais (bloqueio a partir de 950), abaixo da franquia publicada. A documentação oficial informa limite técnico de 3.000 consultas por minuto e permite configurar quota diária no Console.
- Para manter no máximo 70% da franquia mensal apenas com este projeto, a quota diária calculada é `floor(10.000 × 0,70 / 31) = 225` requisições/dia. O Google agrega consumo de projetos ligados à mesma conta de faturamento; reduza a quota conforme o consumo dos demais projetos.
- A Routes API está ativa conforme confirmação do usuário pelo Console em 12/10/2026. Ainda não foram conferidas a quota diária efetiva nem as restrições da chave de navegador para domínios oficiais e APIs necessárias.

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
