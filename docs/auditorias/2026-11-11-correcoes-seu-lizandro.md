# Correções da segunda auditoria — Seu Lizandro

Em 11/11/2026 foi preparada uma implementação de recuperação do atendimento WhatsApp e corrigidos os caminhos descritos abaixo. O sistema **não está homologado para ativação automática para todos os clientes**: não houve deploy desta implementação, o agendamento independente do webhook não foi ativado e faltam as provas reais controladas de concorrência e integração.

## Implementação preparada

- Uma RPC grava a mensagem recebida e o trabalho da IA na mesma transação. O trabalho tem estado, tentativas limitadas, backoff, trava por conversa, resposta preparada e estado de envio. Falha irrecuperável ou resultado incerto da Meta demanda intervenção humana.
- Se a Meta confirmou o envio e seu identificador foi gravado, a recuperação tenta completar o histórico sem reenviar. Se o resultado externo for incerto, a implementação não repete o envio automaticamente.
- Cada chamada OpenAI do atendimento e do simulador verifica e reserva cota. O lançamento do consumo e inserções de log usam a mesma trava transacional da reserva. A resposta sem consumo confirmado e falhas de rede do simulador não liberam a reserva antecipadamente.
- A transferência exige confirmação do banco. Uma regra de encaminhamento imediato finaliza o turno sem chamar o modelo. Erros de histórico interrompem a geração. O encadeamento antigo preserva os dados de contato ao processar a mensagem seguinte.
- A consulta do catálogo filtra produtos ativos e variações ativas e não mescladas. A projeção usa colunas existentes e respeita a herança de preço da variação.
- A RPC de métricas verifica o papel de administrador no servidor. O painel também oculta as métricas para os demais usuários e confirma o salvamento das configurações. Essa proteção não cobre as tabelas de uso legadas descritas nas pendências.
- O controle manual de ligar e desligar fica junto ao ícone do agente na barra esquerda da Central. A leitura inicial e a gravação exigem confirmação do servidor; o formulário de configuração atualiza somente os campos do agente e preserva o estado de ativação. O backend ainda restringe o atendimento aos números de teste cadastrados. O agente permanece desligado no banco operacional.

## Banco operacional

No projeto `hkoxhourxwlddgsfdgws`, foram aplicadas e confirmadas no histórico as migrations:

1. `supabase/migrations/20261111031003_whatsapp_ai_durable_jobs.sql` — fila, captura transacional, processamento, confirmação e encaminhamento.
2. `supabase/migrations/20261111031046_whatsapp_ai_quota_serialization.sql` — reserva protegida do atendimento e serialização do registro de uso.
3. `supabase/migrations/20261111031115_admin_ai_quota_metrics.sql` — autorização na RPC de métricas.
4. `supabase/migrations/20261111040444_restrict_anonymous_api_usage.sql` — retira acesso anônimo às tabelas de uso e à RPC de registro e retira exclusão de usuários autenticados, preservando os acessos ainda usados por ERP e app.
5. `supabase/migrations/20261111040950_update_whatsapp_ai_agent_settings.sql` — função de escrita específica para o agente, com conferência administrativa, comparação do estado anterior e preservação da ativação durante a edição. Sua criação não altera dados nem ativa o agente.

As conferências por metadados mostraram RLS na fila, ausência de acesso à fila para `anon` e `authenticated`, acesso de processamento ao `service_role`, trigger de serialização instalado e guarda administrativa na função de métricas. Após as duas últimas migrations, também foi confirmado que `anon` não acessa as tabelas de uso nem executa as duas funções afetadas, que usuários autenticados ainda leem e alteram os registros de uso e que o agente segue desligado. Essas conferências **não** executaram transações de teste, não provaram concorrência real nem testaram os papéis com sessões reais. O trigger afeta inserções de logs de IA compartilhados e pode aumentar contenção; não houve medição comparável de latência ou consumo.

## Testes e builds

- 85 testes em 18 arquivos focados passaram no Vitest, incluindo um fluxo integrado com Supabase, OpenAI e Meta simulados que falha na primeira chamada ao modelo e envia uma resposta na tentativa seguinte. Os testes de resultado incerto, recuperação de envio, falha de transferência, duas chamadas ao modelo, variações e histórico também usam mocks. O endpoint de recuperação foi exercitado com credencial válida, inválida e ausente em ambiente simulado.
- As suítes `aiUsageLimitsAndQuotas.test.ts`, `whatsappAiAgentConcurrency.test.ts` e `whatsappAiAgentIntegrationE2E.test.ts` foram atualizadas para os contratos atuais e passaram. A revisão identificou e corrigiu a perda do telefone ao encadear uma mensagem na implementação anterior.
- `npm run build:support` e `npm run build` passaram. A compatibilidade do BigInt foi limitada às dependências de segmentação carregadas sob demanda; a remoção de fundo informa quando o navegador não oferece BigInt. A verificação global do TypeScript ainda apresentou erros em vários arquivos, inclusive contratos preexistentes da Central.
- Nove testes do botão e do serviço de configurações passaram com o servidor simulado: autorização na interface, acionamento manual, necessidade de número de teste, resposta não confirmada e concorrência com outra sessão. Dois testes verificaram a transformação dos literais BigInt. Esses testes não acionaram o agente no banco remoto.
- Após integrar o botão à Central, uma execução final passou em 82 testes de 20 arquivos, incluindo os cenários do agente, a transformação de BigInt e a exclusão de pastas da Central. As dependências externas nesses testes são simuladas.
- Não foram feitas chamadas reais à OpenAI ou à Meta, mensagens a clientes, fixtures graváveis ou testes de concorrência no banco remoto.

## Pendências e riscos

1. O código local depende das migrations e ainda precisa ser publicado. O endpoint protegido `operation=ai-recovery` existe no código, mas não há agendamento ativado; sem ele, um trabalho pendente não tem recuperação garantida independente de novos webhooks.
2. O projeto Vercel está no plano Hobby, que não permite o agendamento por minuto previsto para a recuperação. O Vercel Schedules em beta permite a cada 15 minutos, sujeito a janela de execução de 15 minutos e limite mensal compartilhado de 5.000 execuções; seu uso e a capacidade da fila exigem avaliação antes de configurar a recuperação. Ainda é necessário um agendador compatível e autenticação segura. Essas configurações de produção não foram alteradas. A fila `pg_net` existente não foi usada para segredo porque seus dados estão legíveis para papéis amplos.
3. Mensagens antigas recebidas antes da nova RPC não foram retroativamente enfileiradas: não é seguro presumir que não houve envio anterior. Exigem conferência específica.
4. **Bloqueio de segurança:** o acesso anônimo foi retirado, mas usuários `authenticated` ainda podem ler, inserir e atualizar `api_usage_logs` e `api_usage_daily` e executar `record_api_usage_atomic`. Como a verificação de orçamento lê `api_usage_logs`, esses dados ainda podem ser consultados ou adulterados por usuários autenticados e a cota global não pode ser considerada rigorosa. A checagem foi feita somente por metadados de políticas e privilégios. Não foram feitas alterações amplas de RLS, pois há consumidores diretos no ERP e app e falta uma transição compatível.
5. Embora a RPC de métricas esteja protegida, `settings.data.aiUsageLimits` continua legível por usuários autenticados devido à política geral de configurações. Separar os limites requer migração coordenada de dados e consumidores.
6. Uma chamada do atendimento com custo incerto mantém sua reserva até o fim do mês. Isso é conservador, mas pode bloquear cota sem consumo efetivo e não há conciliação automática do valor incerto. Os custos em reais são estimativas baseadas nas taxas existentes, não a fatura da OpenAI. Outros caminhos legados de atualização de logs ainda merecem revisão antes de afirmar que a cota global é rigorosa em todos os cenários.
7. A ausência de duplicidade e perda ainda precisa ser demonstrada com concorrência real, falhas de Supabase e Meta e fixtures próprias autorizadas. Não se deve inferir isso apenas dos testes simulados.
8. O formulário do próprio agente preserva o estado ao salvar, mas outros caminhos legados no ERP e no app ainda regravam o documento inteiro de configurações. Uma gravação de outra sessão com dados antigos pode sobrescrever o estado do agente; é necessária uma transição coordenada desses caminhos para atualizações parciais antes de garantir exclusividade completa do botão.

## Arquivos trabalhados

- API: `erp/api/whatsapp-webhook.ts`, `erp/api/_lib/secureIntegrations/aiQuotaBridge.ts` e `erp/api/_lib/secureIntegrations/handlers/openAiHandler.ts`.
- Recebimento: `erp/src/pages/utils/customerSupport/webhook/whatsappInboundMessageHandler.ts` e `erp/src/pages/utils/customerSupport/whatsappWebhookProcessor.ts`.
- Fila e agente: `erp/src/pages/utils/customerSupport/whatsappAiAgent/durableAiJob.ts`, `whatsappAiAgentTypes.ts` e `whatsappAiModelRunner.ts`.
- Orquestração: `orchestrator/historyFetcher.ts`, `inboundTriggerHandler.ts`, `pendingMessageChainer.ts`, `turnChainExecutor.ts`, `turnEligibility.ts`, `turnExecutionPipeline.ts` e `turnHandoffHandler.ts` sob `erp/src/pages/utils/customerSupport/whatsappAiAgent/`.
- Despacho: `dispatcher/dispatchAssistedMode.ts`, `dispatchAutomaticMode.ts`, `dispatchOutcomeRecorder.ts`, `metaGraphSender.ts`, `preDispatchGuards.ts`, `prepareDispatchIdempotency.ts` e `types.ts` sob o mesmo diretório do agente.
- Cota e ferramentas: `runners/modelTurnTypes.ts`, `openAiTurnRunner.ts`, `quotaReservationGuard.ts`, `tools/catalogTools.ts`, `tools/handoffService.ts` e `shared-utils/agentProductSearch.ts`.
- Interface: `erp/src/pages/App/CustomerSupport/components/aiAgentModal/AiAgentTabQuotas.tsx`, `useWhatsAppAiAgentForm.ts`, `NavigationRail.tsx`, `Index.tsx`, `hooks/useWhatsAppAiAgentSwitch.ts` e `services/whatsappAiAgentSettings.ts`.
- Build: `erp/vite.config.js`, `erp/vite.config.ts`, `erp/vite-segmentation-compat.ts` e `erp/src/pages/utils/backgroundRemoval.ts`.
- Testes: os arquivos `durableAiJob.test.ts`, `durableAiJob.flow.test.ts`, `dispatcher/dispatchAutomaticMode.test.ts`, `orchestrator/historyFetcher.test.ts`, `orchestrator/turnExecutionPipeline.test.ts`, `runners/openAiTurnRunner.test.ts`, `tools/catalogTools.test.ts`, `tools/handoffService.test.ts`, `webhook/whatsappInboundMessageHandler.test.ts`, `aiAgentModal/AiAgentTabQuotas.test.tsx`, `CustomerSupport/__tests__/openAiSimulatorQuota.test.ts`, `customerSupportRecoveryEndpoint.test.ts`, `secureIntegrationsMetaCredentials.test.ts`, `aiUsageLimitsAndQuotas.test.ts`, `whatsappAiAgentConcurrency.test.ts` e `whatsappAiAgentIntegrationE2E.test.ts` nos respectivos diretórios do ERP.
- Também foi atualizado `docs/auditorias/roadmap-otimizacao-consumo-supabase.md` e criadas as cinco migrations citadas.
