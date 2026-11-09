# Histórico de Correções e Implementações — 09/11/2026

## Controle de Limites de Uso e Cotas de IA no ERP, Mobile e WhatsApp (Teto R$ 30,00/mês)

### 1. Problema Identificado e Sintomas Observados
- Necessidade de impor um teto orçamentário mensal estrito de **no máximo R$ 30,00 por mês** para todo o consumo de Inteligência Artificial no ecossistema (ERP, Mobile e WhatsApp com o assistente comercial Lizandro).
- Ausência de controle multidimensional por:
  1. Horário de funcionamento comercial (08:00 às 22:00 no fuso de Brasília) com janela noturna de contingência restrita (máx 5 req/hora) para impedir custos abusivos fora de expediente.
  2. Cota diária de requisições, tokens e teto financeiro diário preventivo (R$ 1,50/dia).
  3. Cota horária para impedir rajadas e picos de tráfego (máx 60 req/hora).
  4. Cota anti-loop / circuit breaker por minuto (máx 15 req/minuto).
  5. Travamento preventivo a 95% do orçamento mensal (R$ 28,50) para impedir extrapolação do teto de R$ 30,00.
  6. Ausência de cálculo preciso de tokens (prompt + completion tokens) convertidos para Reais (BRL) baseado nas tabelas reais dos modelos utilizados (Gemini Flash e OpenAI GPT-4o-mini / Luna).

### 2. Causa Raiz Técnica Comprovada
- As tabelas `api_configurations` e `api_usage_logs` operavam com um multiplicador genérico `price_per_unit = 0.005` aplicado indiscriminadamente a tokens ou chamadas, gerando valores inflacionados em testes sintéticos e sem distinção de tokens consumidos versus chamadas executadas.
- Não existia RPC atômica no PostgreSQL avaliando conjuntamente:
  - Fuso horário oficial de Brasília (`America/Sao_Paulo`).
  - Consumo acumulado no mês corrente em BRL somando todas as fontes de IA (`gemini_flash`, `gemini_antigravity`, `openai_gpt`, `whatsapp_ai_agent`).
  - Requisições na última hora e no dia corrente.
- No WhatsApp AI Agent, em caso de esgotamento de cota ou horário não permitido, o assistente falhava ou tentava chamadas subsequentes em vez de realizar um handoff gracioso para atendentes humanos.

### 3. Lista Exata de Arquivos e Linhas Modificados / Criados
- **SQL / Migrations (Supabase Operacional `hkoxhourxwlddgsfdgws`)**:
  - `supabase/migrations/20261109030000_ai_usage_limits_and_quotas.sql`: Migration completa com criação de colunas `max_monthly_budget_brl numeric DEFAULT 30.0` em `api_configurations`, inserção de limites padrão unificados, inicialização em `settings.data.aiUsageLimits`, e criação das funções atômicas `public.check_and_reserve_ai_quota` e `public.record_ai_token_usage`.
- **Compartilhado (Schemas Zod e Tipagens)**:
  - `shared-utils/aiUsageLimitSchemas.ts`: Schemas Zod com `operatingHoursQuotaSchema`, `aiUsageLimitsSchema` e constante `DEFAULT_AI_USAGE_LIMITS` (R$ 30,00/mês, 95% hard limit, 250 req/dia, 60 req/h, 350k tokens/dia, 90k tokens/h, 15 req/min circuit breaker, 08h-22h Brasília).
  - `shared-utils/customerSupportFormSchemas.ts`: Re-exportação dos schemas de cotas para a Central de Atendimento.
- **Backend Serverless (ERP & WhatsApp)**:
  - `erp/api/secure-integrations.ts`: Adição da checagem autoritativa de cota via `check_and_reserve_ai_quota` e registro atômico de tokens pós-resposta em `handleGemini` e `handleOpenAi`.
  - `erp/src/pages/utils/customerSupport/whatsappAiAgent/whatsappAiModelRunner.ts`: Verificação pré-flight de cota em `runAiTurnWithFallback` (com mensagem amigável e transbordo humano `encaminharParaAtendimentoHumano`) e gravação de tokens consumidos com proteção `typeof supabase?.rpc === 'function'`.
- **Frontend ERP e Monitoramento**:
  - `erp/src/services/apiMonitoring/apiMonitoringTypes.ts`: Adicionado provedor `'openai'` e identificadores de serviço `openai_gpt` e `gemini_antigravity`.
  - `erp/src/services/apiMonitoring/apiConfigService.ts`: Registrada configuração de limites e cota para `openai_gpt`.
  - `erp/src/services/apiMonitoring/apiUsageGuard.ts`: Integração com `check_and_reserve_ai_quota` do Supabase e bloqueio por teto financeiro de R$ 30,00.
  - `erp/src/pages/utils/settings/types.ts`: Adicionada propriedade `aiUsageLimits?: AiUsageLimitsConfig` em `AppSettings`.
  - `erp/src/pages/utils/settings/defaults.ts`: Defaults de `aiUsageLimits`.
  - `erp/src/pages/utils/settings/migrations.ts`: Migração de dados de `aiUsageLimits`.
  - `erp/src/pages/App/CustomerSupport/components/aiAgentModal/AiAgentTabQuotas.tsx`: Componente de UI responsivo com `react-hook-form` + `zodResolver(aiUsageLimitsSchema)` e cards de métricas em tempo real (R$ 30,00, diário, horário e janela noturna).
  - `erp/src/pages/App/CustomerSupport/components/aiAgentModal/AiAgentModalTabs.tsx`: Adicionada a aba `limites_cotas` com ícone `bi-shield-check`.
  - `erp/src/pages/App/CustomerSupport/components/WhatsAppAiAgentModal.tsx`: Renderização controlada da aba de limites e cotas.
  - `erp/src/pages/App/CustomerSupport/components/aiAgentModal/index.ts`: Exportação de `AiAgentTabQuotas`.
- **Testes Automatizados**:
  - `erp/src/pages/App/CustomerSupport/__tests__/aiUsageLimitsAndQuotas.test.ts`: 8 testes unitários cobrindo validação Zod, ApiUsageGuard, travamento de teto mensal, bloqueio noturno e handoff gracioso.

### 4. Solução Técnica Implementada
1. **Governança Orçamentária no PostgreSQL**:
   - `check_and_reserve_ai_quota`: Avalia atomicamente em nível de banco de dados se a chamada está dentro da janela permitida (08h às 22h no horário de Brasília), se respeita a cota noturna (5 req/h), a cota diária (250 req/dia e R$ 1,50/dia), a cota horária (60 req/h) e o teto mensal acumulado de R$ 30,00 com bloqueio rígido em 95% (R$ 28,50).
   - `record_ai_token_usage`: Grava o consumo real de tokens (prompt + completion) convertendo para BRL com precisão de frações de centavos (Gemini: R$ 0,001 por 1.000 tokens; OpenAI GPT-4o-mini / Luna: R$ 0,002 por 1.000 tokens).
2. **Defesa em Camadas (Defense-in-Depth)**:
   - *Camada 1 (Client/ERP UI)*: `ApiUsageGuard` no frontend para feedback imediato e prevenção de chamadas desnecessárias.
   - *Camada 2 (Proxy Serverless Vercel)*: `erp/api/secure-integrations.ts` valida a cota antes de despachar para OpenAI ou Google Gemini, retornando HTTP 429 caso excedido.
   - *Camada 3 (Agente WhatsApp)*: `whatsappAiModelRunner.ts` intercepta no pré-flight sem consumir rede dos provedores, gerando mensagem acolhedora e disparando a ferramenta de handoff para atendimento humano.
   - *Camada 4 (PostgreSQL Atomic Lock & Daily Ledger)*: Registro atômico em `api_usage_daily` e `api_usage_logs`.

### 5. Testes Executados e Validações
- **Suíte de Limites de IA e Cotas**:
  - `vitest run src/pages/App/CustomerSupport/__tests__/aiUsageLimitsAndQuotas.test.ts` (8 testes aprovados).
- **Suíte de Concorrência e Resiliência WhatsApp**:
  - `vitest run src/pages/App/CustomerSupport/__tests__/whatsappAiAgentConcurrency.test.ts` (6 testes aprovados).
- **Suíte de Serviço do Agente Comercial (Lizandro)**:
  - `vitest run src/pages/App/CustomerSupport/__tests__/whatsappAiAgentService.test.ts` (20 testes aprovados).
- **Suíte de Interface do Modal do Agente**:
  - `vitest run src/pages/App/CustomerSupport/__tests__/whatsAppAiAgentModal.test.tsx` (4 testes aprovados).
- **Guarda de Funções Serverless da Vercel**:
  - `node erp/scripts/check-fiscal-startup.cjs`: 11/12 funções (dentro do limite Hobby de 12).
- **Compilação dos Bundles de Suporte**:
  - `npm --prefix erp run build:support`: compilado com sucesso (código 0).
- **Conferência dos Servidores de Desenvolvimento**:
  - Porta 5173 (ERP): HTTP 200 OK.
  - Porta 3000 (API): Conexão ativa e respondendo cabeçalhos HTTP/JSON.


---

## Refatoração de Arquitetura, Princípios de Programação e Modularização de Arquivos

### 1. Problema Identificado e Oportunidade de Melhoria
- Acúmulo de responsabilidades concorrentes e violação de princípios SOLID (especialmente SRP e DRY) em arquivos centrais do subsistema de atendimento e monitoramento de APIs:
  1. `shared-utils/whatsappAiAgentSchemas.ts`: Schemas Zod de validação continham mais de 400 linhas de dados estáticos embutidos (`DEFAULT_KNOWLEDGE_ARTICLES`, `DEFAULT_SITUATION_RULES`, `DEFAULT_WORKFLOWS`).
  2. `erp/src/pages/utils/customerSupport/whatsappAiAgent/whatsappAiAgentOrchestrator.ts`: Sequência de 6 verificações de pré-condições repetindo liberações em memória e retornos de bloqueio idênticos.
  3. `erp/src/services/apiMonitoring/apiMonitoringTypes.ts`: O union type `ApiServiceId` terminava com `| string`, colapsando a inteligência de autocomplete do TypeScript. Tipos de domínio, entidades de banco e agregadores de dashboard misturados sem separação declarativa.
  4. `erp/src/services/apiMonitoring/apiConfigService.ts`: Classe de serviço continha 185 linhas de dicionários estáticos (`DEFAULT_API_CONFIGURATIONS`) no mesmo arquivo.
  5. `erp/src/pages/utils/customerSupport/whatsappAiAgent/whatsappAiModelRunner.ts`: Classificador de erros de rede/provedor (`classifyAiModelError`) misturado com o runner de loops LLM (OpenAI e Gemini).
  6. `erp/api/secure-integrations.ts`: Funções de proxy de IA (`handleGemini` e `handleOpenAi`) duplicavam validação de cota, cálculo de tokens e formatação de resposta HTTP 429, com o handler de rotas do Google Maps intercalado no meio.
  7. `erp/src/pages/utils/customerSupport/whatsappAiAgent/whatsappAiAgentDispatcher.ts`: Montagem de payloads e persistência em banco duplicados entre os modos "assistido" e "automático".

### 2. Solução Implementada
1. **Separação de Catálogos Padrão (SRP)**:
   - Criado `shared-utils/whatsappAiAgentDefaults.ts` com os arrays estáticos de sementes (`DEFAULT_KNOWLEDGE_ARTICLES`, `DEFAULT_SITUATION_RULES`, `DEFAULT_WORKFLOWS`), reexportados transparentemente por `shared-utils/whatsappAiAgentSchemas.ts` mantendo 100% de compatibilidade sem breaking changes.
2. **Avaliação Pura de Pré-condições (DRY)**:
   - Extraída a função `evaluateTurnPreconditions` em `whatsappAiAgentOrchestrator.ts`, isolando as checagens de agente ativo, modo de suporte, autorização de telefone de teste e disponibilidade da conversa.
3. **Refinamento de Tipagens de Domínio**:
   - Atualizado `ApiServiceId` em `apiMonitoringTypes.ts` com `| (string & {})` para restaurar o autocomplete dos identificadores de serviço conhecidos. Tipos agrupados em 5 seções canônicas com JSDoc.
4. **Isolamento de Configurações de API**:
   - Extraído `erp/src/services/apiMonitoring/defaultApiConfigurations.ts` contendo `DEFAULT_API_CONFIGURATIONS`, reduzindo `apiConfigService.ts` a uma classe de serviço concisa.
5. **Classificador Autônomo de Erros**:
   - Criado `erp/src/pages/utils/customerSupport/whatsappAiAgent/whatsappAiErrorClassifier.ts` isolando `classifyAiModelError`, `AiModelErrorType` e `AiModelErrorInfo`.
6. **Consolidação dos Proxies de IA no Backend**:
   - Criadas as funções `checkAiQuotaOrReject` e `recordAiUsageTokensSafe` em `erp/api/secure-integrations.ts`, agrupando handlers de IA e eliminando código duplicado com guardas contra contextos sem `rpc`.
7. **Isolamento de Persistência no Despacho WhatsApp**:
   - Criados `buildAiMessagePayload`, `recordDispatchOutcomeSafe` e `persistOutboundMessageAndSyncConversation` em `whatsappAiAgentDispatcher.ts`.

### 3. Validações e Testes
- Suíte completa de 50 testes automatizados aprovada:
  - `aiUsageLimitsAndQuotas.test.ts` (8 testes)
  - `whatsAppAiAgentModal.test.tsx` (4 testes)
  - `whatsappAiAgentConcurrency.test.ts` (6 testes)
  - `whatsappAiAgentService.test.ts` (20 testes)
  - `secureIntegrationsMetaCredentials.test.ts` (12 testes)
- Limite de funções Vercel mantido em 11/12 (aprovado via `check-fiscal-startup.cjs`).
- Bundles de suporte reconstruídos via `build:support`.

---

## Remoção da Seleção de Categoria por IA no Cadastro de Produto

### 1. Problema Identificado e Sintomas Observados
- Os formulários do ERP e do aplicativo podiam preencher `categoryIds` com a categoria retornada pelo endpoint de classificação por IA, quando ainda não havia um ID de categoria selecionado.
- Isso permitia que a classificação fiscal por IA também alterasse a categoria do produto, embora a seleção automática de categoria deva usar apenas as regras determinísticas baseadas no nome.

### 2. Causa Raiz Técnica Comprovada
- Os hooks `useProductJevClassification` e `useMobileProductJevClassification` tipavam `category` na resposta de `/api/products/classify` e aplicavam `result.category.id` ao formulário.
- No ERP, um `skipAutomaticCategory` adicional suprimia a chamada subsequente após a categoria ser aplicada pela IA. O app mobile aplicava o mesmo resultado diretamente.

### 3. Lista Exata de Arquivos e Linhas Modificados
- `erp/src/pages/App/Products/hooks/fiscal/useProductJevClassification.ts:8,189-202` — a resposta consumida não inclui mais `category`; o estado do formulário só é atualizado com NCM validado.
- `mobile/src/features/products/hooks/useMobileProductJevClassification.ts:7,126-139` — removida a aplicação de `categoryIds`, `categoryId` e `category` vindos da IA; mantido o preenchimento do NCM.
- `erp/src/pages/App/Products/hooks/fiscal/useProductJevClassification.test.tsx:73,86` — expectativa existente atualizada para confirmar que a categoria retornada é ignorada.
- `docs/fiscal/README.md:8` — inclusão desta referência vigente.
- `docs/fiscal/historico-correcoes-2026-11-09.md` — registro desta alteração.

### 4. Solução Técnica Implementada
1. Removida dos dois clientes a leitura da categoria retornada pelo classificador e qualquer gravação automática desse valor no formulário.
2. Mantida a categoria enviada como contexto para a classificação fiscal de NCM, preservando esse fluxo e as validações de vigência do código fiscal.
3. Preservada a seleção automática determinística por nome no ERP e no app, assim como a escolha manual existente.

### 5. Testes Executados e Validações
- Atualizada a expectativa existente do hook fiscal do ERP para confirmar que a resposta pode preencher o NCM vigente, mas não muda a categoria.
- Revisão estática dos dois hooks confirmou que eles não leem nem aplicam `result.category`.
- Nenhum teste ou build foi executado nesta alteração.

## Novas correspondências determinísticas de categoria por nome

### 1. Problema Identificado e Sintomas Observados
- O mapa não cobria nomes que omitem o termo principal da categoria, como “Bancada ... P/TV” sem “rack”, “Armário Suspenso” sem “aéreo”, além de aliases comerciais como “Bicama”, “Mesa Gamer”, “Mesa para Computador” e “Closet”.
- A regra anterior tratava “cadeira presidente” como cadeira de escritório. O nome genérico “cadeira” não identifica se o produto é para escritório ou sala de jantar, então a sugestão precisava exigir esse contexto no nome.
- Quando não havia correspondência forte pelo nome, o formulário podia deixar a categoria sem sugestão e exigir que o operador a localizasse manualmente.

### 2. Causa Raiz Técnica Comprovada
- `CATEGORY_ALIAS_RULES` não continha essas variações comerciais. A categoria é resolvida comparando tokens localmente, sem chamar IA; a lacuna estava na cobertura dos aliases.
- O alias `cadeira presidente` e a ausência de uma validação contextual permitiam selecionar cadeira de escritório sem a palavra “escritório”; a categoria de jantar também aceitava o token `jantar` sem exigir “sala”.
- O resolvedor compartilhado atende os formulários do ERP e do app e também a preparação de produto novo na NF-e de entrada do ERP (`useInboundInvoiceProductCreation`).

### 3. Lista Exata de Arquivos e Linhas Modificados
- `shared-utils/productCategoryResolution.ts:27-28,32,57-58,80,88-89,94,111,118,237-257` — aliases comerciais adicionados, removidos aliases de cadeira sem ambiente explícito e incluída a validação contextual; algoritmo e limites de confiança preservados.
- `docs/estoque/guia-pratico/gerar_guia.py:431` — orientação da página 9 ajustada para conferir a Categoria sugerida pelo nome.
- `docs/estoque/guia-pratico/README.md:3-5,159,175` — atualização da data e registro da orientação da página 9.
- `shared-utils/stockGuide.json:4` — data da edição atualizada para 09/11/2026.
- `erp/public/guias/guia-pratico-estoque.pdf` e `output/pdf/guia-pratico-do-estoque.pdf` — PDFs regenerados com a orientação atualizada e conferidos como cópias idênticas.
- `docs/fiscal/README.md:11` — esta referência foi adicionada ao índice vigente.

### 4. Solução Técnica Implementada
1. Adicionados termos específicos: `closet` → Guarda-Roupas; `armario suspenso cozinha` e `modulo aereo` → Armários Aéreos; `mesa gamer` e `mesa computador` → Mesas para Escritório; `bicama` → Camas/Bases Box; `bancada tv` → Racks.
2. Mantidos `AUTO_SELECT_MIN_SCORE = 0.86` e `AUTO_SELECT_MIN_MARGIN = 0.12`; a resolução segue local, determinística e compartilhada entre ERP e app. Termos mais ambíguos, como “cama auxiliar” isolada, não foram adicionados.
3. Categorias de cadeiras exigem “escritório” para a categoria de escritório ou “sala” e “jantar” no nome para a categoria de sala de jantar. Categorias genéricas contendo “cadeira” também ficam sem sugestão quando esses contextos não aparecem; o conjunto mesa e cadeiras preserva sua regra própria.
4. O guia orienta o operador a revisar a categoria sugerida e selecioná-la manualmente para cadeiras sem contexto explícito.

### 5. Testes Executados e Validações
- Consultadas páginas públicas de varejo com esses nomes e conferida a correspondência entre os termos e as categorias.
- Revisão estática confirmou os consumidores do resolvedor no ERP e no app e que o cadastro rápido da NF-e permite revisar a categoria antes de salvar.
- Executado `git diff --check` nos arquivos de código e documentação.
- O gerador do guia confere as cópias, o número de páginas e a presença de texto; a página alterada foi renderizada e revisada visualmente.
- Nenhum teste automatizado ou build foi executado nesta alteração.

---

## Migração do Classificador de NCM e OCR Local da Chave de NF-e

### 1. Problema Identificado e Sintomas Observados
- A classificação de NCM e a extração de dados de NF-e ainda tinham fluxos vinculados ao provedor Gemini.
- A chave de acesso de uma NF-e podia ser tratada como mais um campo de inferência visual. A chave tem estrutura e dígito verificador conhecidos, então submetê-la ao modelo de linguagem acrescentava dependência de IA e risco de correção/invenção indevida.

### 2. Causa Raiz Técnica Comprovada
- O endpoint de classificação de produto encaminhava a escolha de categoria/NCM ao modelo anterior, embora as opções válidas já fossem consultadas no catálogo oficial.
- O serviço de análise de PDF/imagem não extraía a chave localmente antes do envio. A Edge Function aceitava a chave no resultado estruturado do modelo de visão.

### 3. Lista Exata de Arquivos e Linhas Modificados
- `api/products/classify.ts:26,278-349,378-436,508-527` — seleção do NCM entre opções do catálogo pelo GPT-6 Luna, com esquema restrito a IDs oferecidos; resposta revalidada contra a vigência do catálogo.
- `erp/src/pages/utils/aiService/aiFiscalClassificationService.ts:1,27,65-80` — chamadas atuais encaminhadas ao adaptador OpenAI e instrução explícita para não gerar nem alterar NCM.
- `erp/src/pages/utils/inboundNfe/services/accessKeyOcr.ts:1-40` — novo OCR local de imagem/PDF e validação compartilhada da chave.
- `erp/src/pages/utils/inboundNfe/services/inboundDocumentImportService.ts:3,23,45-55,129` — OCR executado antes do envio; somente chave validada é enviada à Edge Function; extração dos demais campos usa `gpt-6-luna`.
- `shared-utils/fiscalIdentifiers.ts:3,34-52` — extração sem correção de caracteres, formato de chave alfanumérico, modelo 55 e dígito verificador.
- `erp/src/components/shared/QRScannerModal.tsx:6,267-303,412` — leitura local pelo Tesseract na câmera e validação pela mesma função fiscal.
- `mobile/src/features/stock/invoices/utils/accessKey.ts:1-4` — extração da chave delegada ao mesmo validador estrito compartilhado pelo ERP.
- `mobile/src/features/stock/inventory/screens/inventory-scanner/inventoryScannerOcr.ts:19-22` — OCR web permite os caracteres alfanuméricos do CNPJ da chave.
- `mobile/src/features/stock/invoices/utils/accessKey.test.ts:3,8,17-18` — fixture alfanumérica ajustada para calcular dígito verificador válido; teste não executado.
- `supabase/functions/analyze-inbound-invoice/index.ts:7-50,89-108,123,156-213` — aceita chave já extraída localmente, valida-a novamente no servidor, exclui a chave do esquema/prompt do modelo e mantém GPT-6 Luna para os demais campos do documento.
- `erp/package.json:38` e `erp/package-lock.json` — inclusão de PDF.js para rasterizar a primeira página localmente antes do OCR.
- `erp/src/pages/App/SystemDocs/ArchitectureDocsSection.tsx:319` — descrição arquitetural atualizada para identificar o OCR local sem IA.
- `docs/fiscal/README.md:8` — inclusão desta referência vigente.

### 4. Solução Técnica Implementada
1. O NCM é escolhido somente entre registros atuais retornados pelo catálogo oficial; o código escolhido é revalidado no banco e não é inventado pelo modelo.
2. A chave da NF-e é reconhecida localmente: Tesseract.js no ERP e no app web, ML Kit no app nativo. PDFs têm a primeira página renderizada por PDF.js no navegador. Ambas as plataformas passam o texto pelo mesmo validador, que exige estrutura válida, modelo 55 e dígito verificador correto; caracteres não são corrigidos automaticamente.
3. Se o OCR não encontrar uma chave válida, o fluxo segue para revisão manual. A Edge Function não usa uma chave produzida pelo modelo.
4. A IA continua sendo usada por GPT-6 Luna para extrair outros campos e itens do documento. O OCR determinístico cobre especificamente a chave de acesso.
5. A tela de importação operacional do ERP continua aceitando XML oficial; o serviço de análise de imagem/PDF adaptado neste ciclo não possui chamador na interface atual. A leitura de chave por câmera está disponível no fluxo ativo de ERP e app.

### 5. Testes Executados e Validações
- Revisão estática confirmou que o endpoint NCM limita a resposta às opções oferecidas e revalida a escolha antes de retorná-la.
- Revisão estática confirmou OCR local, validador compartilhado entre ERP e app, validação adicional no servidor e remoção da chave do esquema solicitado ao modelo.
- O bundle local do handler seguro foi regenerado para eliminar o artefato antigo com chamada Google. Não executei testes, build do app ou Edge Function, nem chamada de IA. Não foi enviada nem consultada uma NF real; leitura em câmera/PDF permanece sem validação dinâmica neste ciclo.

## Persistência atômica das notas fiscais recebidas da distribuição

### 1. Problema identificado e sintomas
- A função de sincronização lia itens e XML da nota por chave de acesso e, se a nota não tivesse dados completos, fazia uma segunda chamada para gravar os metadados recebidos.
- A conferência e a gravação separadas permitiam uma corrida entre execuções concorrentes e podiam transferir ao código da função XML e itens desnecessários.

### 2. Causa raiz técnica
- persistParsedInvoice em supabase/functions/sefaz-inbound-sync/utils/nsuRecovery.ts fazia select seguido de upsert. O mesmo helper é usado no lote normal e na recuperação individual de um NSU.
- A tabela tem chave única por chave de acesso, validação de CNPJ e proteção para conservar itens/XML completos. Também era necessário preservar um resumo resNFe armazenado enquanto o operador ainda não importou o XML completo.

### 3. Arquivos e objetos alterados
- supabase/functions/sefaz-inbound-sync/utils/nsuRecovery.ts — consulta e gravação separadas substituídas por uma chamada RPC que devolve somente verdadeiro/falso.
- supabase/migrations/20261109203542_persist_sefaz_inbound_invoice_atomically.sql — função public.persist_sefaz_inbound_invoice(jsonb, boolean), aplicada com versão remota 20261109203542 no projeto operacional.
- docs/auditorias/roadmap-otimizacao-consumo-supabase.md — evidência, limites e estado da SCE-052.

### 4. Solução e invariantes preservados
- A função processa o conflito pela chave numa operação. Só atualiza nota existente quando ela ainda não contém itens nem XML fiscal completo.
- Quando chega XML completo pela distribuição automática, guarda metadados e não substitui o resumo ou XML completo do fluxo manual do ERP.
- A revisão comparou o conjunto de campos produzido por parseNfeXml com o conjunto persistido. Campos de vínculo, recibo e importação não são sobrescritos.
- A função usa SECURITY INVOKER, search_path vazio e execução somente para service_role. Privilégios da tabela, regras de acesso e gatilhos existentes não foram modificados.
- Preços, estoque, consulta fiscal externa, atualização da lista por outros consumidores e modo offline não mudam. O gatilho de aviso da lista retorna sem enviar aviso quando auth.uid() é nulo, como no caminho técnico do sincronizador.

### 5. Validações e limites
- Revisão estática do parser, helper, SQL, chave única, gatilhos e privilégios; migration aplicada e metadados remotos da função conferidos sem ler linhas operacionais.
- Nenhum teste, DML, fixture, XML real ou chamada à SEFAZ foi executado. A função Edge não foi publicada; a redução de chamadas ainda não está ativa para usuários.
- A redução estrutural é uma chamada por documento que antes precisava ser salvo. Frequência, bytes faturáveis, plano, CPU e latência antes/depois não foram medidos. Não declarar economia numérica de egress ou banco.
- Para reverter, restaurar no helper a consulta e upsert anteriores, deixando a função aditiva sem uso. Não apagar dados, chave ou gatilhos.

## Reserva atômica do intervalo da distribuição de documentos fiscais

### 1. Problema identificado e sintomas
- A sincronização normal lia todas as colunas do controle do cursor, conferia no código o estado e o intervalo de espera e depois enviava uma segunda chamada para reservar a próxima consulta.
- A leitura e a reserva eram pedidos separados. A atualização condicional protegia contra duas consultas externas simultâneas, mas cada tentativa elegível fazia duas viagens internas ao banco antes de iniciar a ponte fiscal.

### 2. Causa raiz técnica
- `supabase/functions/sefaz-inbound-sync/index.ts` consultava `sefaz_nsu_control` com `select("*")`, avaliava `syncing`, o limite de uma hora e `rate_limited`, e depois fazia `UPDATE` condicional para gravar `status`, horários, ambiente e CNPJ.
- Não foi encontrada migration local que crie essa relação. Antes da alteração, metadados autorizados do projeto operacional confirmaram, sem ler linhas, a chave `id='default'`, as colunas usadas, os privilégios atuais e a existência de RLS. A migration nova acrescenta somente a função; não tenta criar a tabela nem altera as permissões dela.

### 3. Arquivos e objetos alterados
- `supabase/functions/sefaz-inbound-sync/index.ts:80-178` — sincronização normal passa a chamar `reserve_sefaz_nsu_sync_interval` uma vez e recebe cursor, resultado e horário de próxima tentativa. Leitura de status e recuperação continuam em caminhos separados.
- `supabase/migrations/20261109211535_reserve_sefaz_nsu_sync_interval.sql:1-143` — função `public.reserve_sefaz_nsu_sync_interval(text,text)`, aplicada e registrada com a versão remota `20261109211535` no projeto MoranteHub.
- `docs/fiscal/README.md:10` — referência para este registro.
- `docs/auditorias/roadmap-otimizacao-consumo-supabase.md:143,149,292,299,350,4976-4996` — cobertura, estados, evidências, limites e próximo recorte da SCE-053.

### 4. Solução e invariantes preservados
1. A função do banco bloqueia brevemente a linha `default`, lê o cursor e o estado, confere a espera mínima de uma hora e reserva a sincronização numa operação curta. O pedido termina antes da função Edge fazer qualquer chamada de rede à ponte fiscal ou à SEFAZ.
2. A proteção de sincronização em andamento continua em três minutos. O cursor, o ambiente de homologação/produção, o bloqueio da reserva, a espera de uma hora e as respostas de sincronização em andamento, limite e conflito foram mantidos no caminho normal.
3. A consulta somente de status, o caminho de recuperação de NSUs pendentes e o fluxo manual/chave de acesso não usam a nova função. Nenhum valor de nota, XML, certificado, preço ou estoque foi lido ou alterado.
4. A função usa `SECURITY INVOKER`, `search_path` vazio e só permite execução pelo papel `service_role`; não altera grants, políticas RLS, tabela, gatilhos ou dados existentes.

### 5. Validações, economia e limites
- Revisão estática do SQL, da sequência da função Edge e dos caminhos excluídos. A consulta REST anterior mais a atualização condicional viram uma chamada RPC por tentativa normal elegível; tentativas barradas na primeira leitura já precisavam de uma chamada. O volume de tentativas não foi medido.
- A consulta antiga recebia todas as colunas e o pedido de reserva retornava o identificador; a RPC retorna cinco campos. Os bytes reais e o medidor oficial de egress não foram medidos. Não se declara redução faturável.
- O banco ainda lê o registro e atualiza a reserva; agora o faz com bloqueio explícito de linha numa transação curta. Carga, CPU, plano, tempo de espera por bloqueio e latência não foram medidos. Menos viagens do cliente não prova redução do trabalho do banco.
- A migration remota e os metadados da função foram conferidos: assinatura e retorno esperados, `SECURITY INVOKER`, `search_path` vazio, execução negada a `anon`/`authenticated` e permitida a `service_role`. `git diff --check` focalizado passou com avisos apenas de finais de linha do Windows. Não executei testes, DML, fixtures, consulta à SEFAZ, acesso a XML/certificados ou publicação. A função Edge permanece no checkout; portanto, usuários ainda não recebem esta mudança.
- Reversão: restaurar no código a leitura e atualização condicionada anteriores, deixando a função aditiva sem uso. Não apagar função, registros, tabela ou histórico operacional. A ausência de uma migration local de criação de `sefaz_nsu_control` continua registrada como divergência de baseline; a função aplicada depende da relação já existente no projeto operacional.

## Seleção explícita dos campos do status da distribuição fiscal

### 1. Problema identificado e sintomas
- As consultas de status no ERP e no endpoint fiscal solicitavam todas as colunas de `sefaz_nsu_control`, embora a tela e a resposta usassem somente os dados do estado, do cursor e do horário de próxima tentativa.
- A projeção ampla podia transferir campos sem uso nessa consulta. O volume efetivo não foi medido.

### 2. Causa raiz técnica
- `fetchSefazSyncStatus` e o ramo `action === "status"` usavam `.select('*')`/`.select("*")`.
- O formatador `buildSyncStatusData` lê nove propriedades. O aplicativo móvel já selecionava seis propriedades explicitamente.
- Metadados do projeto operacional confirmaram 14 colunas na relação, incluindo as nove selecionadas. Nenhuma linha foi consultada. A migration que cria `sefaz_nsu_control` continua ausente do histórico local.

### 3. Arquivos alterados
- `erp/src/pages/utils/inboundNfe/services/sefazInboundSyncService.ts` — a consulta de status pede `status`, `last_sync_at`, `next_allowed_sync_at`, `last_nsu`, `max_nsu`, `last_cstat`, `last_xmotivo`, `last_docs_count` e `environment`.
- `supabase/functions/sefaz-inbound-sync/index.ts` — somente o ramo de consulta de status usa a mesma projeção; a leitura do caminho de recuperação não foi alterada.
- `docs/auditorias/roadmap-otimizacao-consumo-supabase.md` — estado da SCE-051, evidências, limites e próximo recorte.
- `docs/fiscal/README.md` — inclusão desta referência no índice vigente.

### 4. Solução e invariantes preservados
1. O ERP e a consulta de status da função recebem somente os nove campos que alimentam o indicador e o cursor. O app mantém sua seleção existente de seis campos.
2. A chave, os filtros, o formato da resposta, as permissões e as regras de intervalo/cooldown permanecem iguais. A leitura ampla usada na recuperação continua preservada neste recorte.
3. Não houve migration, alteração de dado, acesso a nota/XML/certificado/credencial nem chamada à SEFAZ. A função Edge continua sem publicação.

### 5. Validações, economia e limites
- Inspeção estática confirmou que todos os campos usados pelo ERP e por `buildSyncStatusData` estão na projeção. A relação tem 14 colunas nos metadados remotos; as duas consultas agora pedem nove, cinco a menos.
- O número de chamadas permanece uma leitura por consulta de status. Não há medida de bytes, do medidor oficial de egress, frequência de consulta, plano, CPU ou latência; portanto, não se declara economia faturável nem redução de carga.
- Nenhum teste foi executado. A consulta remota foi somente de metadados; não houve leitura de linhas ou dados fiscais. A Edge permanece não publicada.
- Para reverter, restaurar a seleção de todas as colunas apenas nas duas consultas de status alteradas; nenhuma mudança no banco ou nos dados precisa ser desfeita.

## Atualização do indicador após sincronização fiscal

### 1. Problema identificado e sintomas
- Depois de uma tentativa de sincronização de notas fiscais, o ERP e o aplicativo faziam outra consulta ao controle de status para atualizar o indicador.
- A resposta de sucesso já continha o cursor e o resultado da consulta, mas a função não confirmava se a gravação final do status havia sido aceita pelo banco. Usar qualquer resposta sem essa confirmação poderia exibir um estado antigo ou falso.

### 2. Causa raiz técnica
- Os dois componentes `SefazSyncStatusBadge` chamavam `loadStatus()` no encerramento da tentativa, ainda que a sincronização concluísse e gravasse o status.
- A função não verificava o erro retornado pelo `upsert` final. A recuperação automática também pode alterar o mesmo controle se a SEFAZ bloquear a consulta; por isso, uma tentativa principal bem-sucedida não basta para confirmar o estado final em todos os casos.

### 3. Arquivos alterados
- `supabase/functions/sefaz-inbound-sync/index.ts` — confere o resultado do `upsert` final e só adiciona `statusPersisted`, `statusUpdatedAt`, `nextAllowedSyncAt` e `statusDocsCount` à resposta quando a gravação terminou sem erro e a recuperação automática não deixou resultado incerto.
- `erp/src/pages/utils/inboundNfe/services/sefazInboundSyncService.ts` — tipa os campos opcionais retornados.
- `erp/src/pages/App/Stock/InboundInvoices/components/SefazSyncStatusBadge.tsx` — converte a confirmação em estado visível e mantém a leitura como fallback.
- `mobile/src/features/stock/invoices/components/SefazSyncStatusBadge.tsx` — aplica o mesmo critério no app e mantém a leitura como fallback.
- `docs/auditorias/roadmap-otimizacao-consumo-supabase.md` — estado, evidências, limites e próximo recorte da SCE-054.
- `docs/fiscal/README.md` — inclusão deste registro no índice vigente.

### 4. Solução e invariantes preservados
1. A função conserva a gravação existente e verifica o erro retornado. Ela não faz uma gravação adicional para preparar a resposta.
2. ERP e app dispensam `loadStatus()` apenas após resposta de sucesso com confirmação explícita e data válida. Se a gravação falhar, a resposta se perder, houver erro/timeout ou a recuperação automática deixar incerteza, a leitura continua.
3. A consulta periódica que decide quando iniciar nova sincronização permanece. Não mudaram a consulta à SEFAZ, a espera mínima, o cursor, permissões, documentos, preços ou estoque. O modo offline não recebeu novo cache.
4. Nenhuma migration, escrita remota, consulta a linha fiscal, chamada à SEFAZ ou publicação foi feita. A versão atualizada da Edge Function continua sem implantação.

### 5. Validações, economia e limites
- Revisão estática confirmou que, no sucesso com status confirmado, os dados necessários ao indicador correspondem à gravação final. O app usa a contagem gravada separada da contagem total de documentos, pois a recuperação automática pode acrescentar documentos depois da gravação principal.
- **Chamadas:** estruturalmente, há de zero a uma leitura a menos de status por tentativa; no resultado confirmado, uma. A leitura anterior à tentativa e as leituras após falha/desconexão continuam. Volume real não medido.
- **Bytes:** a função acrescenta quatro campos curtos de confirmação e deixa de enviar a leitura separada nesse caminho. Não medi os corpos HTTP nem o egress faturável; o total pode subir ou cair e não há economia numérica declarada.
- **Banco:** a gravação é a mesma e uma leitura desaparece no caminho confirmado. CPU, plano e latência não medidos.
- Não executei testes, DML, fixtures ou chamada à SEFAZ. `git diff --check` focalizado é registrado no ciclo do roadmap. A alteração só terá efeito para os usuários depois de uma publicação autorizada da Edge Function.
- Para reverter, restaurar a leitura no encerramento das tentativas e retirar os campos de confirmação da função; nenhuma alteração de banco ou de dados precisa ser desfeita.

## Correção do HTTP 502 do proxy OpenAI causado pelo retorno thenable do PostgREST

### 1. Problema identificado e sintomas
- O proxy podia responder `HTTP 502` depois de uma resposta válida da OpenAI ao registrar o uso de tokens ou liberar a reserva de cota.
- O mesmo padrão podia interromper o runner da Central de Atendimento e o registro de telemetria da função `analyze-inbound-invoice`.

### 2. Causa raiz técnica
- `supabase.rpc()` devolve um builder PostgREST thenable, com `.then()` mas sem `.catch()` garantido. Chamar `.catch()` diretamente podia lançar `TypeError` no caminho de finalização da resposta.
- A falha ocorria no tratamento de reserva/telemetria, não na geração de conteúdo do modelo nem em uma regra fiscal.

### 3. Arquivos alterados
- `erp/api/_lib/secureIntegrations/aiQuotaBridge.ts` — linhas 67–98: libera reserva e registra uso de tokens por uma cadeia `Promise.resolve().then(...)`.
- `erp/src/pages/utils/customerSupport/whatsappAiAgent/runners/quotaReservationGuard.ts` — linhas 78–87: aplica o mesmo tratamento à liberação de reserva.
- `erp/src/pages/utils/customerSupport/whatsappAiAgent/runners/openAiTurnRunner.ts` — linhas 98–122: aplica o tratamento ao registro de uso da OpenAI na Central de Atendimento.
- `supabase/functions/analyze-inbound-invoice/index.ts` — linhas 164–199: protege o registro de telemetria de sucesso e falha da leitura de NF-e.
- `erp/server/secure-api/secure-integrations.cjs` e artefatos de API de atendimento — bundles gerados por `npm run build:support`.
- `erp/src/pages/App/CustomerSupport/__tests__/secureIntegrationsMetaCredentials.test.ts` — linhas 296–330: regressão com RPC thenable sem `.catch()` e resposta HTTP 200.
- `erp/src/pages/App/CustomerSupport/__tests__/whatsappAiAgentService.test.ts` — linhas 16–25, 201–216, 229–270, 332–390, 428–505 e 621–686: fixtures OpenAI Responses API para texto, uso de ferramentas, isolamento, erro e ausência de fallback para Gemini.
- `erp/src/pages/App/CustomerSupport/__tests__/whatsappAiAgentIntegrationE2E.test.ts` — linhas 12–20 e 200–456: cenários de produto, parcelamento/entrega, handoff, desativação durante a resposta, número não autorizado e modo assistido usando mocks da Responses API.
- `erp/src/pages/utils/aiService/aiProductCatalogService.test.ts` — linhas 1–10, 71, 119 e 138: mock atualizado para `callOpenAIDirect`.
- `erp/src/pages/utils/aiService/aiProductCharacteristicsService.test.ts` — linha 29: expectativa ajustada ao prompt OpenAI atual.

### 4. Solução e invariantes preservados
1. Os builders retornados por `.rpc()` agora são assimilados por uma Promise antes do tratamento de erro, sem descartar a liberação de reserva nem a telemetria.
2. Não houve mudança de schema, migration, permissões, filtros, regras de limite, parâmetros ou payload das RPCs. Chamadas de telemetria/liberação que antes paravam no `.catch()` inexistente podem agora ser efetivamente consumidas; a quantidade real não foi medida. A função fiscal não foi publicada.
3. Nenhuma mensagem foi enviada pela Meta e nenhum documento, dado operacional, chave ou certificado foi consultado ou alterado.

### 5. Validações, consumo e limites
- As nove suítes de chat de teste da Central, proxy OpenAI, ferramentas do agente para Assistências e criação/edição de produto passaram: 72/72 testes.
- Após atualizar fixtures antigas de Gemini para a Responses API, `whatsappAiAgentService.test.ts` e `whatsappAiAgentIntegrationE2E.test.ts` passaram juntas: 27/27 testes. Total das 11 suítes focadas: 99/99 testes aprovados.
- `geminiAgentService.test.ts` e `geminiAgentRequest.test.ts` passaram: 13/13 testes do fluxo conversacional do agente geral, despacho de ferramentas e limites de espera. Total desta rodada: 13 suítes e 112/112 testes aprovados.
- Os parâmetros e formatos das RPCs permanecem iguais. Nos caminhos em que um builder era descartado antes de executar por não ter `.catch()`, a correção permite que a telemetria/liberação prevista chegue ao banco; não medi frequência, chamadas efetivas, bytes, egress oficial, CPU ou latência.
- A primeira execução ampla teve 78 testes aprovados e 20 falhas em 11 arquivos por mocks legados de Gemini e formatos antigos. Depois do alinhamento das fixtures, as suítes de WhatsApp e as outras nove suítes focadas foram rerodadas e passaram.
- A validação visual autenticada ficou pendente: o Agent Desktop recusou ações com `lease_directory_untrusted`, e o ambiente Vercel de desenvolvimento não tinha credencial da conta operadora. Não foi feita chamada real à OpenAI. O `npm run dev` local foi reiniciado e a disponibilidade das portas 5173 e 3000 foi conferida separadamente.
