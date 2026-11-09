# Integração GPT-6 Luna — Central de Atendimento WhatsApp (Seu Lizandro) e Governança de IA

**Data:** 09/11/2026  
**Status:** Operacional e Homologado em Produção / Desenvolvimento  
**Provedor Primário:** OpenAI (`gpt-6-luna`)  
**Provedor de Failover Contínuo:** Google Gemini (`gemini-3.8-flash`)  

---

## 1. Contexto e Objetivos

O modelo **GPT-6 Luna** (`gpt-6-luna`) da OpenAI foi homologado e integrado como motor de inteligência artificial de alta performance e baixo custo para a Central de Atendimento ao Cliente do WhatsApp (Seu Lizandro Comercial), bem como para os proxies e gateways de IA do ERP MoranteHub.

### Características Oficiais do GPT-6 Luna
- **Janela de Contexto:** 1.050.000 tokens.
- **Saída Máxima:** 128.000 tokens (`max_completion_tokens`).
- **Suporte a Raciocínio (Reasoning):** Níveis `none`, `low`, `medium` (padrão), `high`, `xhigh` e `max`.
- **Function Calling em Chat Completions (`v1/chat/completions`):** Exige `reasoning_effort: 'none'` ao utilizar ferramentas e declarações de funções.
- **Preços Oficiais:**
  - Tokens de Entrada (Input): US$ 0,10 / 1M tokens.
  - Tokens em Cache (Cached Input): US$ 0,01 / 1M tokens (desconto de 90%).
  - Tokens de Saída (Output): US$ 0,50 / 1M tokens.

---

## 2. Ajustes Técnicos Implementados

### 2.1. Execução de Turnos OpenAI (`openAiTurnRunner.ts`)
- **Detecção do Modelo Luna / Raciocínio:**
  Identifica modelos da família Luna e reasoning (`luna` ou prefixo `o`).
- **Parâmetros de Requisição no Chat Completions:**
  - Aplica `reasoning_effort: 'none'` quando `tools` estiverem presentes, atendendo estritamente à especificação técnica da OpenAI.
  - Define `max_completion_tokens: 2048` em substituição ao legado `max_tokens`.
  - Omite o parâmetro `temperature` para modelos de raciocínio, prevenindo erros `400 Bad Request` por incompatibilidade de hiperparâmetros.
- **Captura e Contabilização de Cache:**
  - Extrai `usage.prompt_tokens_details.cached_tokens`.
  - Propaga `p_cached_tokens` para a RPC atômica `record_ai_token_usage`.

### 2.2. Resiliência do Classificador de Erros (`whatsappAiErrorClassifier.ts`)
- Configurado `canFallback: true` para o erro `bad_request` (HTTP 400).
- **Garantia de Não-Interrupção:** Caso o provedor primário rejeite algum parâmetro ou formato inesperado em tempo de execução, o fluxo do WhatsApp não é descartado: a conversa sofre failover automático e transparente para o Gemini 3.8 Flash, garantindo que o cliente receba atendimento imediato.

### 2.3. Governança e Tarifação no Banco de Dados Supabase
- **Resolução do Erro PostgreSQL 42725 (Função Ambígua):**
  - Removidas sobrecargas legadas `check_and_reserve_ai_quota(text, text, integer, text)` e `record_ai_token_usage(...)`.
  - Assinatura canônica unificada de `check_and_reserve_ai_quota`:
    ```sql
    check_and_reserve_ai_quota(p_provider text, p_service text, p_estimated_tokens integer, p_module_source text, p_reserve boolean DEFAULT true)
    ```
- **Cálculo de Custos e Cache em BRL (`record_ai_token_usage`):**
  - Câmbio conservador com IOF: R$ 6,30 por USD.
  - Entrada OpenAI GPT-6 Luna: R$ 0,000630 / 1k tokens.
  - Entrada em Cache: R$ 0,000063 / 1k tokens.
  - Saída OpenAI GPT-6 Luna: R$ 0,003150 / 1k tokens.
  - Suporte à reconciliação de reservas orçamentárias (`p_reservation_id`).

### 2.4. Correção na Edge Function `analyze-inbound-invoice`
- Parâmetros da RPC `check_and_reserve_ai_quota` corrigidos para passar `{ p_provider: "gemini", p_service: "gemini_flash", p_estimated_tokens: 3000, p_module_source: "estoque_nfe_inbound", p_reserve: false }`.
- Parâmetros da telemetria `record_ai_token_usage` alinhados à assinatura canônica, eliminando inserções manuais duplicadas em `api_usage_logs`.

### 2.5. Modularização Arquitetural de `secure-integrations.ts`
- O monolito `erp/api/secure-integrations.ts` (652 linhas) foi decomposto em módulos de responsabilidade única (SRP) sob `erp/api/_lib/secureIntegrations/`:
  - `types.ts`: constantes de tamanho de payload, regex de modelos (GPT-6 Luna, Gemini), máscaras de rotas e helpers de requisição.
  - `aiQuotaBridge.ts`: desacoplamento da camada de persistência/RPCs de cota de IA (`checkAiQuotaOrReject`, `releaseAiReservationSafe`, `recordAiUsageTokensSafe`).
  - `handlers/metaGraphHandler.ts`: proxy para a Meta Graph API, cobrindo credenciais, subscrições WABA, SMB echoes e catalog batch sync/status.
  - `handlers/geminiHandler.ts`: proxy isolado para o Google Gemini com validação de payload, reserva de cota e telemetria atômica.
  - `handlers/openAiHandler.ts`: proxy isolado para a OpenAI (`gpt-6-luna`) com extração de `cached_tokens` e governança orçamentária.
  - `handlers/googleRoutesHandler.ts`: proxy para cálculo de rotas e coordenadas com validação estrita e permissão `viewDeliverySchedule`.
  - `secure-integrations.ts`: ponto de entrada mínimo e declarativo (router/dispatcher com CORS e tratamento de preflight).
- Bundle de produção CJS gerado com sucesso via `erp/scripts/build-customer-support.cjs`.

---

## 3. Validação Operacional e Testes

### 3.1. Teste de Conectividade Real com a API Oficial da OpenAI
Executado teste fim a fim contra `https://api.openai.com/v1/chat/completions` utilizando as credenciais da conta do operador carregadas em memória da Vercel:
1. **Geração Direta:**
   - Requisição: `model: 'gpt-6-luna'`, mensagem de teste.
   - Resposta: `HTTP 200 OK`, `content: "OK_LUNA_OPERACIONAL"`, tempo: ~2.7s.
   - Detalhes de tokens: 29 input, 26 output (sendo 12 de raciocínio).
2. **Function Calling com Ferramentas Comerciais:**
   - Requisição: `model: 'gpt-6-luna'`, `reasoning_effort: 'none'`, ferramenta `consultarEstoqueProduto`.
   - Resposta: `HTTP 200 OK`, chamada disparada com argumento `{"termo":"Guarda-Roupa Casal 6 Portas"}`, tempo: ~2.4s.

### 3.2. Bateria de Testes Automatizados (Vitest)
Executada bateria completa das suítes de Customer Support e AI Gateway:
- `src/services/aiGateway/__tests__/AiQuotaManager.test.ts` — 12 testes aprovados.
- `src/services/aiGateway/__tests__/AiGateway.test.ts` — 6 testes aprovados.
- `src/services/aiGateway/__tests__/aiQuotaNotifier.test.ts` — 3 testes aprovados.
- `src/pages/App/CustomerSupport/__tests__/secureIntegrationsMetaCredentials.test.ts` — 12 testes aprovados.
- `src/pages/App/CustomerSupport/__tests__/whatsappAiAgentConcurrency.test.ts` — 6 testes aprovados.
- `src/pages/App/CustomerSupport/__tests__/whatsappAiAgentIntegrationE2E.test.ts` — 7 testes aprovados.
- `src/pages/App/CustomerSupport/__tests__/aiUsageLimitsAndQuotas.test.ts` — 8 testes aprovados.
- `src/pages/App/CustomerSupport/__tests__/whatsappAiAgentService.test.ts` — 20 testes aprovados.

**Resultado:** 8 arquivos de teste, 74 testes executados, 100% aprovados.
