# Experimentos de isolamento — Log Query e Log Ingestion

**Nenhum experimento de isolamento foi iniciado.** As leituras de histórico e metadados desta auditoria já foram autorizadas. Uma consulta de logs fica autorizada quando indispensável a uma hipótese concreta: no máximo uma por execução, em janela inédita de até 15 minutos, com limites explícitos, sem payload sensível e sem repetição. Não desligar logging, Log Drains, integrações, funções, jobs, ERP ou aplicativo.

## E0 — Fixar escopo do medidor oficial

- **Objetivo:** verificar se os valores pertencem ao projeto MoranteHub ou à organização inteira e se são diários ou acumulados no período selecionado.
- **Coleta:** abrir Usage, selecionar o projeto MoranteHub, mostrar o período completo e capturar o tooltip diário. Repetir para Log Query e Log Ingest. Registrar data/hora e estado do seletor.
- **Custo/risco:** consulta visual ao medidor oficial; nenhum Logs Explorer e nenhuma alteração no projeto.
- **Critério:** a nova leitura mostra projeto, datas e valores comparáveis. Até lá, manter os 430,268 GB e 0,942 GB como valores relatados e as capturas posteriores como pontos diários de escopo desconhecido.

## E1 — Proposta: período sem consultas de logs pelo Codex e agentes

- **Objetivo:** isolar a contribuição de consultas iniciadas por Codex/agentes a Log Query.
- **Procedimento proposto:** após decisão explícita do operador, manter tráfego do ERP/app e demais fontes de consulta conforme estavam e não usar ferramentas de consulta de logs pelo Codex/agentes por 24 horas. Registrar Usage do projeto no início e no fim, considerando o atraso horário.
- **Limite:** a automação não interromperá sessões, ferramentas ou agentes. O plano não pede ao operador que desative integrações. Sem escopo de Usage idêntico, a variação não é comparável.
- **Interpretação:** variação é evidência comparativa, não atribuição direta; outras fontes e atraso do medidor permanecem possíveis.

## E2 — Proposta: isolar consultas MCP Supabase

- **Objetivo:** testar separadamente se chamadas supabase.query_logs via MCP contribuem para Log Query.
- **Procedimento proposto:** somente depois de aprovação explícita, escolher uma janela de 24 horas sem chamadas MCP de logs, mantendo os outros canais e o tráfego do ERP/app conforme estavam. Comparar Usage do mesmo projeto e período equivalente.
- **Limite:** não desinstalar, desativar ou reconfigurar o MCP. A automação não executa o isolamento. A contribuição histórica em bytes continua sem medição.

## E3 — Proposta: isolar atividade do Logs Explorer

- **Objetivo:** distinguir consultas iniciadas no Dashboard das feitas via MCP ou CLI.
- **Procedimento proposto:** se aprovado pelo operador, comparar uma janela de 24 horas sem novas consultas no Logs Explorer com uma janela equivalente de uso normal; manter outros canais constantes e registrar o medidor oficial do mesmo escopo.
- **Limite:** não abrir o Explorer para medir nem deixar uma aba consultando em polling. O experimento não altera acesso, retenção ou logging.

## E4 — Proposta: isolar a recorrência histórica de Egress

- **Objetivo:** testar a automação de três horas descrita em um relatório histórico, caso seu estado e identidade sejam confirmados.
- **Bloqueio:** o relatório comprova que a recorrência estava ativa em um checkpoint passado, mas o ID, histórico de execuções e estado atual não estão acessíveis nesta revisão.
- **Procedimento proposto:** após identificar a automação e receber aprovação explícita, comparar uma janela de 24 horas sem chamadas de logs por essa automação, mantendo os demais consumidores e tráfego constantes. Não alterar sua configuração nem interrompê-la automaticamente.

## E5 — Amostra de fontes por query_logs, proposta anterior expirada

- **Hipótese:** auto_explain pode contribuir para Log Ingestion; cinco planos representaram 81,7% do texto event_message em uma amostra de 15 minutos.
- **Consulta proposta anteriormente:** uma agregação por source, count() e sum(length(event_message)) estava planejada para 27/11/2026 18:30–18:45 UTC (15:30–15:45 BRT).
- **Situação:** a janela passou e não foi consultada. Não repetir nem reutilizar essa janela. A autorização permanente posterior permite uma hipótese futura indispensável em uma janela inédita de até 15 minutos, com limites temporais explícitos.
- **Custo/limite:** mesmo agregada, a chamada examina dados e pode contribuir para Log Query. O comprimento de event_message é um indicador amostral, não bytes oficiais de ingestão, e não identifica o cliente que leu logs.

## E6 — Acompanhar auto_explain sem alterar configuração

- **Objetivo:** conferir se a predominância de planos se repete em outra janela e nos medidores do projeto.
- **Procedimento proposto:** usar E0 e, se houver decisão e autorização, uma amostra nova com janela explicitamente limitada. Não mudar o limiar ou desativar logging nesta fase. Depois de comparar amostras e Usage de escopo correspondente, apresentar uma proposta separada se os planos permanecerem dominantes.
- **Critério:** repetição do padrão em recortes comparáveis, bytes de mensagens por fonte e aumento correspondente de Log Ingest no mesmo escopo. Nenhum desses sinais isolados confirma o impacto mensal.

## Aprovação e bloqueios

E0 ainda depende de uma leitura oficial com projeto/período visíveis; o conector atual não expõe o medidor oficial. E1–E4 permanecem propostas de isolamento, não foram executadas e não autorizam desligar ferramenta, integração ou automação. E5 expirou e sua janela não deve ser reutilizada. Uma eventual consulta de logs segue os limites de leitura autorizados no início deste documento.
