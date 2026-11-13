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

## Atualização — busca ampla de móveis e cards do catálogo (11/11/2026)

O prompt configurado agora trata um pedido amplo por tipo de móvel (por exemplo, “balcão para pia”) como interesse em ver os modelos correspondentes. A IA consulta o catálogo imediatamente, usa características informadas — como medida, cor e material — como filtros, e não pergunta primeiro qual modelo o cliente quer. Quando a combinação exata não tem resultado, deve mostrar os modelos da mesma categoria sem aquele filtro, identificando-os como alternativas. A conversa humana confirmou esse padrão de apresentar opções do mesmo tipo antes de perguntar preferência.

**Área de entrega corrigida:** a loja fica em Colombo/PR e realiza entregas somente em Curitiba e na Região Metropolitana. A IA não deve pedir endereço para cotar, prometer frete, prazo ou exceção quando o destino estiver fora dessa área. Dentro da área atendida, o frete é grátis apenas a menos de 5 km da loja; para distâncias maiores, a equipe confirma o valor e o prazo com o endereço completo. A previsão de 1 a 5 dias úteis aplica-se somente à área atendida e depende de confirmação.

A ferramenta `buscarProdutos` pode devolver IDs de itens publicados do catálogo Meta. No modo `automatico`, o dispatcher envia os cards de produto/lista nativos do WhatsApp (até 30 itens por mensagem); quando houver mais correspondências, a resposta deve informar que há outras opções e convidar a filtrar. Cores, medidas e demais atributos de variações são usados para restringir os cards ao que o cliente pediu.

### Correção da busca por balcões para pia — 11/11/2026

Na simulação “balcões para pia”, o atendente encaminhava a busca porque o filtro de produtos expandia termos acentuáveis para várias colunas e gerava uma URL PostgREST de 25.903 bytes, rejeitada com HTTP 400. A busca de produtos de pia agora aplica as duas condições de tipo diretamente ao nome/título; só acrescenta a busca geral de atributos se o cliente informar detalhes adicionais. As medidas continuam pesquisáveis por atributos cadastrados nas variações, descrições e campos de produto compatíveis.

**Validação manual no sandbox:** em 11/11/2026, a ferramenta `buscarProdutos` retornou sucesso em 6,3 s, com cinco modelos, nomes, preços e situação de estoque. O filtro reduziu a URL consultada a 3.776 bytes e a API respondeu HTTP 200. A resposta informou que os modelos encontrados estavam sem estoque. O sandbox não envia texto nem cards ao WhatsApp; essa simulação apenas mostrou a lista ao operador. A configuração continuou `Desligado` e `Assistido`; o atendimento automático não foi ligado e nenhuma mensagem foi enviada a clientes.

O modo atual permanece `assistido` e o agente permanece desligado. Nesse modo, o dispatcher salva somente uma sugestão para revisão humana e não envia cards nem texto pela Meta. O envio nativo de cards só acontece se o operador alterar manualmente o modo e ligar o atendimento.

**Estado desta atualização:** prompt salvo pela tela de configurações usando o RPC existente; a própria Central confirmou `Desligado` e `Modo: Assistido`. O código do fluxo de cards foi revisado estaticamente; não foram enviados cards a clientes e não foram executados testes/build nesta alteração.

### Correção do HTTP 429 no sandbox — 11/11/2026

Ao simular “balcões para pia”, uma chamada retornou HTTP 200 e o turno seguinte exibiu HTTP 429 sem explicar a causa. A leitura agregada da quota mostrou que a estimativa usada para reservar tokens na simulação estava muito acima do uso real: 19 reservas totalizavam 630.442 tokens, enquanto 18 chamadas bem-sucedidas reportaram 55.490. A estimativa antiga multiplicava os bytes do corpo JSON por dois e adicionava 3.072 tokens. Os registros não preservaram o motivo exato do 429 original, então o bloqueio de quota é a causa provável, não uma confirmação direta.

Em `erp/api/_lib/secureIntegrations/handlers/openAiHandler.ts` e `erp/src/pages/utils/customerSupport/whatsappAiAgent/runners/openAiTurnRunner.ts`, as reservas agora usam `max(3.072, ceil(bytes JSON / 3) + max_output_tokens)`. Isso alinha a reserva da API de simulação à reserva própria do atendimento real. O teto de saída e os limites de quota permaneceram iguais. O runner também aceita erros como texto no nível superior ou como objeto estruturado, exibindo a razão da quota quando ela está presente. `npm run build:support --prefix erp` regenerou `erp/server/secure-api/secure-integrations.cjs`.

**Validação manual:** no sandbox, a pergunta retornou cinco modelos, preços e a informação de que todos estavam sem estoque. Duas chamadas posteriores foram registradas como HTTP 200, com 7.649 tokens de uso e 15.737 reservados ao todo. Não foram executados testes automatizados. O estado continuou `Desligado` e `Assistido`; nenhuma mensagem ou card foi enviado pela Meta. A diferença entre tokens reservados e reportados é telemetria interna e não mede egress faturável.

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
