# Dashboard: substituição da carga massiva por indicadores agregados

## Problema e causa comprovada

O monitor registrou 16 consultas a `get_dashboard_orders_by_effective_date`, somando 5.709 registros. O caminho ativo `useDashboardQueries` → `fetchAllOrdersForDashboard` paginava pedidos e itens completos dos dois períodos para calcular CMV, gráfico, rankings e contagens no navegador. Além disso, consultava todos os pedidos agendados/rascunhos. Foco e reconexão usavam `always`, repetindo consultas mesmo com cache recente.

O cache anterior eliminava uma duplicação no handshake inicial, mas mantinha a transferência proporcional à quantidade de pedidos. Esta alteração substitui esse caminho; não suprime o alerta nem apaga o histórico de consultas.

## Implementação

- Migration `supabase/migrations/20261104164915_dashboard_compact_metrics.sql`, aplicada ao schema `public` do projeto operacional `hkoxhourxwlddgsfdgws`. O nome e a versão foram conferidos no histórico remoto após a aplicação.
- `get_dashboard_metrics` devolve um único objeto JSON: estatísticas corrente/anterior, série agrupada por hora/dia/mês no fuso do navegador, cinco produtos por ranking e contagens operacionais/logísticas. Pedidos e itens são processados no banco e não integram a resposta.
- Reutiliza internamente `get_dashboard_sales_summary` para os cabeçalhos incrementais, com cálculo direto no servidor quando o consolidado não estiver pronto. Mantém CMV dos itens normalizados, sinal negativo de devoluções efetivadas, custos ausentes, datas comerciais e exclusões de dados de teste.
- O acesso exige administrador/gerente no perfil autenticado. Preserva as guardas de isolamento de pedidos/itens e interrompe a leitura se o escopo mudar. `anon` e `PUBLIC` não recebem `EXECUTE`.
- `dashboardMetrics.ts` valida a resposta com Zod, limita cada ranking a cinco entradas, repassa cancelamento e encerra a espera em 15 segundos. Resposta inválida/erro apresenta a falha existente do Dashboard, sem fallback para download detalhado.
- `useDashboardQueries.ts` faz uma consulta agregada por período, mantém as consultas limitadas de recentes/mapa e agrupa eventos de pedidos/itens. Usa cache de 60 segundos e atualização por foco/reconexão apenas quando os dados estão vencidos. O handshake, failsafe, revalidação ao retornar e separação por usuário/papel foram preservados.
- `useDashboardData`, `useDashboardProducts`, `useDashboardOperational`, `OperationPanel`, `LogisticsPanel` e `Index` consomem agregados e contagens. A leitura dos rascunhos de recebimento continua no armazenamento local existente. A RPC detalhada antiga permanece por compatibilidade, sem chamador no caminho ativo do Dashboard.
- A busca dos consumidores em `mobile/src` não encontrou essa RPC nem um Dashboard nativo com estes indicadores. Não houve alteração mobile nem publicação OTA nesta correção.

## Evidências

| Verificação | Executado | Projeto/ref | Massa sintética | Resultado / limite |
| --- | --- | --- | --- | --- |
| Vitest/RTL, contrato, cache, datas, faturamento e gráfico | Sim | Local | Somente objetos unitários | 43 testes passaram; inclui 16 eventos agrupados, foco com cache recente, descarte de resposta cancelada, timeout e retry |
| Comparação SQL somente leitura com a RPC detalhada anterior | Sim | `hkoxhourxwlddgsfdgws` | Nenhuma | Períodos de 06/09 a 04/11/2026: 230 pedidos elegíveis; estatísticas iguais, zero diferenças nos pontos do gráfico e nos valores dos produtos retornados |
| Playwright em Chrome visível, operador autorizado | Sim | ERP local 5173 e projeto operacional | Nenhuma | Login pela UI, carga inicial, mês, ano e retorno ao período em cache; sem erro de página nem mutação de negócio |
| ACL e histórico da migration | Sim | `hkoxhourxwlddgsfdgws` | Nenhuma | `anon` sem execução; `authenticated` com execução sujeita à autorização interna; versão remota confirmada |
| TypeScript geral | Sim | Local | Nenhuma | 503 erros no checkout, nenhum nos arquivos alterados; dois em `RegionalHeatmap.tsx`, que não foi modificado. Log: `output/checks/dashboard-types-20261104.log` |

Medição real de respostas do PostgREST na sessão Playwright:

| Período | Chamadas agregadas | Objetos de resposta | Bytes JSON | Pontos não vazios |
| --- | ---: | ---: | ---: | ---: |
| Últimos 30 dias, carga inicial | 1 | 1 | 7.248 | 25 |
| Este mês | 1 | 1 | 3.666 | 3 |
| Este ano | 1 | 1 | 5.245 | 9 |
| Retorno a Últimos 30 dias | 0 | 0 | 0 | Cache reutilizado |

Nessa navegação houve **zero** chamadas a `get_dashboard_orders_by_effective_date`. Os KPIs renderizados coincidiram com a resposta agregada. As medidas são de uma sessão e do volume operacional existente, não um teste de carga ou de concorrência.

O advisor registra o aviso genérico [SECURITY DEFINER executável por authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). O acesso é intencional para a RPC do painel, com validação interna de administrador/gerente, `search_path` vazio, ACL sem acesso anônimo e guardas de escopo; não foi ampliada a RLS.

## Publicação em produção — 04/11/2026

O cliente compacto foi publicado em `morantehub.vercel.app` no deployment `dpl_FLGf6aFF2pmTagreRmxR7CKqyPsk`. A publicação partiu do commit que estava em produção (`08c5e55b9c92825b24185246a38f04b8e4ed182b`) e incluiu apenas os arquivos necessários ao dashboard. A migration `20261104164915_dashboard_compact_metrics` já estava aplicada no projeto remoto; a assinatura e as permissões da função foram conferidas novamente.

O build da Vercel concluiu e os 43 testes unitários focados passaram. O Playwright verificou a versão preparada e depois o endereço principal, com o operador autorizado e sem alterações comerciais. Na produção, o carregamento inicial fez uma chamada a `get_dashboard_metrics` (7.248 bytes) e nenhuma a `get_dashboard_orders_by_effective_date`; ao trocar para o mês, a resposta agregada teve 3.667 bytes. Os valores mostrados na interface coincidiram com a resposta. São medições de uma sessão, não uma estimativa da economia mensal nem do tráfego dos navegadores que ainda mantiverem a versão antiga em cache.

Uma primeira execução do runner incluiu por engano um teste independente de pedidos, que parou por não encontrar a lista de pedidos aberta. A execução direcionada ao dashboard passou. A carga do estoque e as demais leituras de pedidos/produtos do painel permanecem oportunidades separadas de otimização.

O deployment foi criado diretamente a partir da cópia isolada; os arquivos correspondentes seguem como alterações locais e ainda não constam no `main` remoto. Uma publicação futura a partir do `main` sem esses arquivos pode restaurar o comportamento anterior. Não foram criados registros sintéticos, alterados pedidos, emitidos documentos fiscais ou executadas operações de estoque. A otimização é interna e não altera a operação do estoquista nem exige revisão do guia PDF.
