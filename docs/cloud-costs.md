# Documentação de Controle de Custos e APIs Cloud (`docs/cloud-costs.md`)

Este documento registra todas as integrações Cloud, APIs externas, limites de cota, modelos de faturamento e regras de segurança para manter o custo do workspace em **R$ 0,00** ou dentro dos limites estritos de segurança.

**Data da última revisão:** 05/09/2026

---

## 1. Google Cloud Platform

### Projeto: `erp-ecommerce-489701`
- **Conta de Faturamento:** Ativa (Billing Account vinculada).
- **Meta Orçamentária:** R$ 0,00 / mês (Consumo 100% dentro do Free Tier).

#### APIs Ativas e Limites Físicos no Google Cloud (Daily Quotas)
| Serviço | Identificador Técnico | Finalidade no ERP | Limite Físico Configurado no Google Cloud | Proteção no Código (ERP) |
|---|---|---|---|---|
| **Directions API** | `directions-backend.googleapis.com` | Cálculo de rota, distância (km) e duração para precificação de frete | **100 req / dia** (Bloqueio automático ao atingir) | Circuit Breaker (20 req/min) + Cache |
| **Maps JavaScript API** | `maps-backend.googleapis.com` | Carregamento da biblioteca de mapas e componentes web | **100 map loads / dia** (Bloqueio automático ao atingir) | Carregamento único singleton (`__googleMapsPromise`) |

#### APIs Desativadas no Google Cloud (Zero Resíduo)
As seguintes APIs foram **desabilitadas** no projeto para eliminar riscos de chamadas acidentais ou cobranças inesperadas:
- ❌ `navigationsdk.googleapis.com` (Navigation SDK)
- ❌ `roads.googleapis.com` (Roads API)
- ❌ `areainsights.googleapis.com` (Places Aggregate API)
- ❌ `distance-matrix-backend.googleapis.com` (Distance Matrix API)
- ❌ `placewidgets.googleapis.com` (Places UI Kit)
- ❌ `maps-embed-backend.googleapis.com` (Maps Embed API)
- ❌ `maps-android-backend.googleapis.com` (Maps SDK for Android)
- ❌ `routes.googleapis.com` (Routes API)

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
