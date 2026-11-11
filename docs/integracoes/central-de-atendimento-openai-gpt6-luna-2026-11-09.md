# Motor de IA da Central de Atendimento WhatsApp

**Revisão do código:** 11/11/2026

**Escopo:** atendente WhatsApp do ERP MoranteHub (Seu Lizandro).
**Estado:** descreve o código e a configuração consultada nesta revisão; não comprova todas as versões publicadas nem o comportamento de um atendimento real.

## Provedor e ativação

- O atendente WhatsApp usa somente OpenAI `gpt-6-luna`, chamado pelo backend através de `https://api.openai.com/v1/responses`.
- **Não existe failover do atendente para Gemini.** Gemini ainda pode aparecer em outras integrações de IA do ERP; isso não significa que seja provedor alternativo neste fluxo.
- O agente inicia desligado. A conversa de teste é aberta pelo ícone do agente no painel esquerdo da Central; nela, um administrador pode ligar ou desligar manualmente o atendimento de clientes e abrir as configurações. Salvar prompt, ferramentas ou telefones de teste preserva o estado de ativação.
- `testMode` permanece `true` e cada execução valida a lista de telefones autorizados. No modo automático, uma resposta a um número dessa lista é enviada de verdade pela API da Meta; a simulação do chat de teste não faz esse despacho.
- A consulta de estado remoto em 11/11/2026 encontrou `enabled=false`, `testMode=true` e zero telefones de teste cadastrados. Foram consultados apenas esses indicadores, sem obter os números ou o prompt; nenhuma configuração foi alterada.
- Apenas mensagem de texto com conteúdo não vazio cria job para execução do agente. Outros tipos de mensagem podem ser armazenados pela Central, mas não são enviados a este modelo pelo pipeline atual.

## Contexto enviado e ferramentas

O pipeline carrega até dez mensagens recentes da conversa, a instrução do agente e o contexto correspondente às regras, artigos de conhecimento e workflow. Declarações e resultados das ferramentas habilitadas também podem seguir para o modelo durante o turno. A chave `OPENAI_API_KEY` é consumida no servidor. Esta revisão não avaliou retenção ou tratamento de conteúdo pela OpenAI.

As ferramentas do atendente incluem busca e detalhes de produtos, categorias/características, informações comerciais da loja, consulta dos pedidos associados ao cliente, frete/distância e encaminhamento para atendimento humano. Não foi encontrada ferramenta de criação ou alteração de venda/pedido nesse conjunto.

## Tratamento de erros e recuperação

- O runner repete **uma vez** uma resposta HTTP 502 ou 503 antes de qualquer chamada de ferramenta.
- Não há troca de provedor quando a OpenAI continua indisponível. O job durável aplica novas tentativas e pode terminar em encaminhamento para conferência humana, conforme o estado da execução.
- A chamada de recuperação `GET /api/whatsapp-webhook?operation=ai-recovery` exige `Authorization: Bearer <CRON_SECRET>` e processa um job por chamada.
- Em 11/11/2026, a listagem de Cron Jobs da Vercel do projeto `morantehub` retornou `crons: []`. Nenhum agendador externo foi consultado nesta revisão. O endpoint existe, mas a recuperação periódica da fila não está confirmada até localizar um agendador efetivo.
- O handler do webhook tem `maxDuration` de 60 segundos em `erp/vercel.json`. Como o endpoint atual processa um job por chamada, a capacidade de recuperação depende do intervalo e da repetição do agendador.

## Modos de despacho

| Modo | Efeito |
| --- | --- |
| `automatico` | Envia a resposta pela Meta, com idempotência e revalidação de conversa/configuração antes do envio. |
| `assistido` | Salva uma sugestão para o atendente aprovar; não envia pela Meta. |
| `humano` | Não executa o agente. |

Resultado de envio incerto não é repetido automaticamente. O sistema sinaliza a necessidade de conferência humana para evitar duplicidade.

## Quotas, persistência e proveniência

Chamadas reais reservam quota antes do modelo e contabilizam tokens/uso pela RPC `record_ai_token_usage`. O painel apresenta métricas agregadas de uso. Turnos, tentativas de fila e despachos ficam registrados em tabelas técnicas; a mensagem salva contém metadados de proveniência, como ferramentas, situação, modo e modelo. A Central não apresenta uma tela administrativa que reúna esses dados por atendimento real.

Esta documentação não fixa preços ou janela de contexto do modelo. Para análise financeira, use as tarifas e conversões configuradas no registro vigente de uso, em vez de copiar as estimativas antigas que estavam neste documento.

## Arquivos de referência

- `erp/src/pages/utils/customerSupport/whatsappAiAgent/whatsappAiModelRunner.ts`
- `erp/src/pages/utils/customerSupport/whatsappAiAgent/runners/openAiTurnRunner.ts`
- `erp/src/pages/utils/customerSupport/whatsappAiAgent/orchestrator/turnExecutionPipeline.ts`
- `erp/src/pages/utils/customerSupport/whatsappAiAgent/durableAiJob.ts`
- `erp/api/whatsapp-webhook.ts`
- `erp/src/pages/App/CustomerSupport/hooks/useWhatsAppAiAgentSwitch.ts`
- `supabase/migrations/20261111031003_whatsapp_ai_durable_jobs.sql`

## Validação desta revisão

As suítes direcionadas de ativação, integração, concorrência, quotas, pipeline, despacho, runner OpenAI, configuração, fila, endpoint de recuperação e ferramentas passaram: **81 testes aprovados em 16 arquivos**. O resultado é de testes Vitest com serviços simulados; não demonstra qualidade semântica do modelo, entrega real via Meta, estado atual remoto do agente ou execução de um Cron Job. Não houve chamada real à OpenAI nem envio de mensagem nesta revisão.
