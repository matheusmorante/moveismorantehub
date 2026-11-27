# Auditoria contínua de consumo e desempenho do Supabase

Este diretório guarda os diagnósticos incrementais, propostas, decisões e métricas da auditoria do MoranteHub. A automação está ativa e executa a cada 15 minutos no projeto local do Codex. Avisos automáticos são limitados a falhas de execução para evitar alertas repetidos; achados e pedidos de aprovação ficam nos arquivos e no resultado de cada execução.

Desde 27/11/2026, o foco da automação é exclusivamente identificar as origens de Log Query e Log Ingestion. Otimizações gerais ficam suspensas enquanto a causa raiz permanecer desconhecida. Consulte os registros [Log Query](causa-raiz-log-query.md), [Log Ingestion](causa-raiz-log-ingestion.md), [linha do tempo](linha-do-tempo-consumo.md) e [experimentos propostos](experimentos-isolamento.md).

## Estado inicial — 26/11/2026

- Projeto Supabase operacional consultado: MoranteHub, referência hkoxhourxwlddgsfdgws, região sa-east-1.
- A primeira execução analisou somente leitura o intervalo de logs de 10:55 a 11:20 BRT e os contadores cumulativos do PostgreSQL.
- Os valores de Log Query e Log Ingestion informados na solicitação são uma linha de base relatada pelo operador, não uma leitura atual do medidor oficial.
- Nenhum código, dado, configuração do Supabase, cron job, migration, commit, deploy ou OTA foi alterado.

## Propostas aprovadas em 26/11/2026

As otimizações da agenda, da listagem de pedidos, dos alertas e do dispatcher fiscal foram aplicadas ao Supabase operacional. O recorte do `auto_explain` tem uma medição amostral e aguarda comparação com o medidor oficial. [Decisões e resultados](historico.md#2026-11-26--implementação-das-quatro-propostas-aprovadas).

## Arquivos

- [Diagnósticos](diagnosticos.md): problemas observados, evidências, impacto e confiança.
- [Propostas](propostas.md): opções de correção e decisões por identificador.
- [Histórico](historico.md): execuções, decisões e validações.
- [Métricas](metricas.md): valores medidos e limitações de cada fonte.
- [Causa raiz de Log Query](causa-raiz-log-query.md): histórico acessível de consultas, suspeitas e limites de atribuição.
- [Causa raiz de Log Ingestion](causa-raiz-log-ingestion.md): fontes candidatas e evidências de volume de logs.
- [Linha do tempo do consumo](linha-do-tempo-consumo.md): medições, janelas consultadas e lacunas de histórico.
- [Experimentos de isolamento](experimentos-isolamento.md): próximos passos propostos; nenhum teste de isolamento foi iniciado.

## Histórico existente

Antes de iniciar novos recortes, consulte também o [roadmap anterior de otimização de consumo](../auditorias/roadmap-otimizacao-consumo-supabase.md) e a [auditoria dos filtros de pedidos no servidor](../auditorias/pedidos-filtros-servidor-2026-11-04.md). O SCE-033 já removeu a segunda avaliação desnecessária de agenda para ERP e logística, e a migration 20261121155207 já estendeu o timeout somente das RPCs de pedidos revisadas. Não reabrir essas correções sem regressão ou alteração relevante.

## Guardas

As execuções da automação podem ler o repositório, consultar o Supabase operacional com consultas de leitura e atualizar apenas estes documentos de auditoria. O operador aprova cada implementação explicitamente no chat.

Registrar Log Query, Log Ingestion, custo SQL, chamadas e egress com a fonte e a janela de cada medida. Para identificar a origem, começar por análise estática, histórico de ferramentas e Usage oficial. A autorização permanente do operador permite consultas de leitura a logs quando indispensáveis para uma hipótese concreta: no máximo uma por execução, em janela inédita de até 15 minutos, com limites inicial e final explícitos e filtro na consulta, sem payload sensível e sem polling. Não repetir intervalos anteriores. A ferramenta supabase.query_logs pode assumir as últimas 24 horas se a janela não for informada. A autorização não permite alterações no projeto ou em logging.
