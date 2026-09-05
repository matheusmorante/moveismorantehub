---
name: cloud-free-tier-guard
description: Proteção permanente contra cobranças inesperadas de serviços Cloud e APIs externas (Google Cloud, Google Maps Platform, Gemini, etc.), garantindo metas de R$ 0,00, limites diários rígidos com margem de segurança (70% do free tier), desativação de APIs não usadas, restrições estritas em API Keys e auditoria preventiva.
---

# Skill: Cloud Free Tier Guard (`cloud-free-tier-guard`)

## OBJETIVO

Proteger todos os projetos deste workspace contra cobranças inesperadas de serviços Cloud, APIs externas e especialmente **Google Cloud / Google Maps Platform**.

> [!IMPORTANT]
> **REGRA FUNDAMENTAL**: NENHUM serviço faturável deve ser configurado ou utilizado sem antes analisar seus limites gratuitos, modelo de cobrança, cotas disponíveis e mecanismos de proteção.
> **O objetivo padrão dos projetos é permanecer em R$ 0,00 de cobrança sempre que isso for tecnicamente possível.**

---

## 1. Gatilho Obrigatório Pré-Integração e Modificação

Sempre que:
- Habilitar uma API;
- Integrar uma API paga;
- Criar ou atualizar uma chave (API Key);
- Configurar Google Cloud / Google Maps Platform;
- Adicionar recursos de Maps, Routes, Places, Geocoding, Navigation, IA, etc.;
- Criar algum recurso Cloud ou modificar infraestrutura;
- Adicionar SDK que possa gerar cobrança;
- Alterar uma integração existente ou lógica de requisições;

**OBRIGATORIAMENTE responder e validar os 10 itens antes:**
1. Existe cobrança?
2. Qual é a unidade faturável real (requests, elementos, sessões, tokens, minutos, map loads)?
3. Existe free tier (crédito mensal ou cota gratuita)?
4. Qual é o limite gratuito atual oficial?
5. O limite é diário, mensal ou por SKU?
6. Qual a granularidade exata de tarifação?
7. Existe uma cota configurável (Daily Quota) no console capaz de travar o consumo?
8. Existe algum SKU mais caro que possa ser acionado por determinado parâmetro/recurso?
9. A API pode gerar cobrança mesmo com baixo volume?
10. Há risco de loops, retries, re-renders React ou abuso consumirem rapidamente a cota?

*NUNCA presumir preços ou limites com base em conhecimento desatualizado.*

---

## 2. Política de Cotas e Margem de Segurança

Se existir free tier, **NUNCA configurar a cota exatamente no limite gratuito máximo**. Utilizar sempre margem de segurança conservadora:

$$\text{TARGET\_FREE\_TIER\_USAGE} = 70\%$$

### Conversão Mensal → Diária:
Se o provedor oferece cota mensal e o console exige cota diária:
$$\text{Quota Diária} = \left\lfloor \frac{\text{Free Tier Mensal} \times 0.70}{31} \right\rfloor$$

*Exemplo:*
- Free tier: $10.000$ operações/mês.
- Máximo operacional com margem: $10.000 \times 0.70 = 7.000$/mês.
- Quota diária conservadora ($31$ dias): $\lfloor 7.000 / 31 \rfloor = 225$/dia.

Para serviços com comportamento imprevisível ou alta volatilidade, utilizar margem ainda mais rígida: **50% a 60% do free tier**.

---

## 3. Unidades Reais de Cobrança (Não Assumir 1 Request = 1 Unidade)

- **Route Matrix:** $\text{Origens} \times \text{Destinos} = \text{Elementos}$ (ex: $10 \times 10 = 100$ elementos faturáveis em 1 único request).
- **Navigation SDK:** Tarifação por destino/viagem de motorista.
- **Places API:** Autocomplete por sessão vs por request puro, Place Details por campo retornado (SKU Basic, Contact, Atmosphere).
- **Maps JavaScript:** Tarifação por Map Load (carregamento de mapa dinâmico).
- **Inteligência Artificial (Gemini / LLMs):** Tarifação por tokens (input + output), imagens, minutos de áudio.

---

## 4. Google Maps Platform — Diretrizes Críticas

Atenção especial para:
- `Maps JavaScript API`
- `Directions API`
- `Routes API`
- `Places API / Places UI Kit / Places Aggregate API`
- `Geocoding API`
- `Distance Matrix API`
- `Roads API`
- `Navigation SDK`

**Ações Obrigatórias:**
1. Verificar SKUs acionados.
2. Desabilitar imediatamente todas as APIs não utilizadas no projeto Google Cloud.
3. Configurar **Daily Quota (Cotas Diárias)** no console do Google Cloud para impedir fisicamente qualquer excesso.
4. Restringir rigorosamente as API Keys.

---

## 5. APIs Não Utilizadas — Política Zero Resíduo

API não utilizada **NÃO DEVE** permanecer habilitada "por garantia".
- Se não for estritamente necessária no código ativo: **DESABILITAR**.
- Especialmente evitar manter APIs antigas e substitutas habilitadas ao mesmo tempo (ex: não manter Directions e Routes ativas simultaneamente sem necessidade real).

---

## 6. Restrições de API Keys

É **PROIBIDO** deixar uma chave de API irrestrita.
- **Aplicações Web:** Restringir por HTTP Referrers (somente domínios oficiais e `localhost` em desenvolvimento).
- **Mobile Android:** Restringir por Package Name + SHA-1 Fingerprint.
- **API Restrictions:** Permitir **SOMENTE** as APIs específicas que aquela chave utiliza. Nunca criar chave universal para múltiplos serviços diferentes.
- **Secrets no Frontend:** Proibido armazenar credenciais com permissões administrativas no cliente.

---

## 7. Arquitetura Defensiva e Proteção Contra Loops no Front-End

Toda integração deve implementar:
- **Debounce em Buscas/Autocomplete:** 300ms a 600ms e mínimo de 3 caracteres antes de disparar.
- **Cache Local e Persistente:** Supabase/LocalStorage/Memória para deduplicar requisições idênticas.
- **Circuit Breaker:** Bloqueio em memória se ocorrer mais de $X$ requisições por minuto (prevenção contra loops de `useEffect` / re-renders).
- **Hard Limit / Fail Closed:** Se atingir $95\%$ do teto mensal de segurança, bloquear a chamada preventiva no front-end em vez de gerar custo.

---

## 8. Orçamento (Budget) NÃO é Hard Cap

> [!WARNING]
> Google Cloud Budgets e Alertas são ferramentas de **monitoramento e notificação**. Eles **NÃO bloqueiam** requisições nem impedem o envio de faturas.
> A proteção real e garantida é formada por:
> **Daily Quota + Rate Limiting + Restrições de Chaves + Desativação de APIs + Circuit Breaker no Código.**

---

## 9. Template Obrigatório: CLOUD COST REVIEW

Sempre que uma nova API ou recurso faturável for proposto, produzir antes:

```markdown
### CLOUD COST REVIEW
- **API:**
- **Provider:**
- **Finalidade:**
- **SKU:**
- **Unidade Faturável:**
- **Preço Unitário:**
- **Free Tier Oficial:**
- **Janela do Free Tier:**
- **Cota Diária Recomendada (70%):**
- **Rate Limit / Circuit Breaker:**
- **Restrições da API Key:**
- **Risco Estimado:**
- **Alternativa Gratuita Disponível:**
- **Necessária?** SIM / NÃO
```

---

## 10. Proibições Absolutas

- ❌ Definir cota como ilimitada.
- ❌ Remover cota ou rate limit silenciosamente.
- ❌ Habilitar APIs "por garantia".
- ❌ Criar API Keys irrestritas.
- ❌ Assumir que alerta de Budget bloqueia cobrança.
- ❌ Configurar cota exatamente igual ao free tier (sem margem de segurança de 30%).
- ❌ Aumentar automaticamente uma cota ao receber `RESOURCE_EXHAUSTED` (429) sem antes investigar loops, cache e causas de consumo.
- ❌ Sacrificar proteções financeiras para resolver erros técnicos.
