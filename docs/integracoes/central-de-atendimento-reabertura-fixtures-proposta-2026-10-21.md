# Proposta limitada de prova da reabertura — 21/10/2026

**Aguardando autorização específica. Nenhuma massa nova foi criada.** A execução anterior está encerrada e não será reutilizada. A restrição do contrato legado já foi aplicada como `20261021162004`, independentemente desta proposta.

## Objetos e limites concretos

- Projeto operacional `hkoxhourxwlddgsfdgws`, schema `public`; nenhum projeto, branch, schema, tabela de segregação ou coluna física novo.
- Execução `8eaed14f-364d-47ab-be41-66be54b3fb65`, cenário `support-reopening`. Operador esperado `13eab361-be48-4e49-be4b-4ad79813b812`, a confirmar por login em memória e gate real antes de qualquer provisionamento.
- Até **cinco conversas sintéticas**: quatro pelo provisionador existente, mais um contato derivado criado pelo processador compartilhado. Nomes começam por `Teste reabertura` e contêm o identificador curto `8eaed14f`. Canal `test-artifact:<runId>`; telefones/IDs sintéticos, sem números reais.
- Até **68 mensagens/eventos persistidos no total**, incluindo âncoras, comentários, mensagens recebidas, atribuições, mudanças de status, reaberturas e limpeza. O banco reserva cinco linhas para fechamento normal: outras operações param no limite de 63. A execução pode consumir menos que o teto.
- **Zero pastas, clientes, produtos ou pedidos novos**. Nenhum vínculo comercial, alteração de estoque/financeiro, documento fiscal, upload/download Meta ou envio de mensagem externa. Não haverá deploy nesta operação.
- Solicitação revisável: `scratch/central-support-reopening-request-2026-10-21.json`, ainda com `approved=false`. O UUID identifica a execução; IDs de conversas/mensagens serão gerados pelo banco e conferidos após o provisionamento autorizado.

## SQL preparado, ainda não aplicado

1. [Recebimento/reabertura](sql/customer-support-inbound-reopening.sql): cria a RPC transacional `customer_support_receive_message`, exclusiva de service role, sem uso pelo webhook publicado nesta etapa.
2. [Guardas da prova](sql/customer-support-reopening-test-guards.sql): mantém os triggers existentes e as regras operacionais/antigas; amplia somente o cenário próprio `support-reopening` para texto inbound sintético e o evento automático ligado à mensagem persistida. Limita cinco conversas/68 registros, com reserva de limpeza. A identidade é validada pelo helper canônico e pela âncora persistida, não apenas por nome/prefixo/flag.
3. Atualiza o manifesto para informar os limites desse cenário. Adiciona `customer_support_test_receive_message`, restrita a administrador autenticado com acesso à Central e âncora da própria execução. A helper só chama a RPC compartilhada, força ausência de vínculo comercial e aceita apenas texto/ID de mensagem sintético. O único contato novo possível tem identificador derivado determinístico dentro da execução.

A helper pode provocar uma exceção controlada **depois** que a RPC compartilhada termina, dentro da mesma transação. Isso permite provar rollback integral sem desligar triggers/guardas, alterar funções operacionais, manter transações abertas durante I/O ou fazer fault injection fora da própria massa. Não há SQL arbitrário, GUC de autorização ou impersonação de operador.

As bases das funções alteradas foram comparadas com as definições atuais do projeto remoto. O catálogo confirmou os tipos, constraints únicas e os únicos dois triggers das tabelas, ambos de proteção das fixtures. Não há trigger de notificação nessas tabelas. O novo SQL não cria notificações ou chamadas HTTP.

A consulta de consumidores no catálogo encontrou somente 13 funções da própria Central e nenhuma view/materialized view referenciando essas tabelas/RPCs. A busca nos clientes ERP, aplicativo, API e MCP encontrou os acessos apenas no módulo da Central; nenhum consumidor dos cinco destinos operacionais foi encontrado para essas fontes. As três inspeções estáticas novas das guardas passaram junto com os 12 casos locais anteriores (15/15); isso não comprova a execução PostgreSQL proposta.

## Harness preparado

`erp/tests/support-reopening/receive.test.ts` contém etapas separadas de provisionamento, backend e limpeza, selecionadas explicitamente. `context.ts` valida o envelope aprovado, runId/owner/cotas exatos, ambiente Vercel, URL operacional, login em memória e gate 204. Um manifesto encerrado é recusado; a etapa backend iniciada não é repetida automaticamente. `reopening.spec.ts` usa a janela visível/CDP, confere servidor Vite na 5173 antes de navegar, valida ownership e limita pela interceptação todas as escritas às próprias conversas, status, leitura e dois recebimentos sintéticos conhecidos. Não cria pastas ou massa pela UI, nem registra credenciais.

Entradas da raiz: `npm run test:support:reopening`, com `SUPPORT_REOPENING_PHASE=provision|backend|cleanup`, e `npm run test:support:reopening:ui`. Ambos usam o launcher Vercel Development existente. Exigem `SUPPORT_REOPENING_INPUT` apontando para a solicitação revisada e `SUPPORT_REOPENING_MANIFEST` para um manifesto exclusivo novo. O envelope permanece `approved=false`; **não executar** antes da resposta autorizando esta operação.

Validação da preparação: seleção Vitest **207/207**, em 21 arquivos, incluindo seis negativas anônimas remotas reais; log `scratch/central-support-reopening-with-remote-denials-2026-10-21.log`. O checkpoint sem os remotos tinha 201 aprovados/seis ignorados. TypeScript do harness passou sem diagnósticos (`scratch/central-support-reopening-harness-types-2026-10-21.log`). ESLint não tem configuração correspondente para os cinco arquivos do harness, que foram ignorados com avisos; exit 0 não é prova de lint desses arquivos. Nenhum teste gravável novo nem navegador deste lote foi executado.

## Gates antes de gravar

- Launcher do Vercel Development do projeto/team corretos; credenciais somente em memória, sem argumentos, trace, screenshot ou storage state de autenticação.
- URL do Supabase exatamente operacional, identidade esperada, `is_administrator()`, `customer_support_can_view()` e endpoint real de operador retornando 204. Os env flags são apenas travas do runner, não prova de autorização/isolamento.
- Provas negativas sem criação: anon recusado, parâmetros inválidos recusados e operação anterior encerrada protegida contra reutilização. Depois, provisionamento separado por RPC normal e leitura da metadata persistida de cada âncora/owner/runId.
- As mensagens novas ficam ligadas às conversas próprias e à mesma identidade; novos eventos referenciam a mensagem recebida persistida. Customer ID permanece null e mídia ausente. A guarda rejeita mutação/remoção da identidade e mensagens de outro contexto.
- Isolamento dos cinco destinos operacionais (relatórios, agenda, cronograma, montagens e dashboard): a operação só escreve nas duas tabelas da Central, sem clientes/pedidos/estoque/financeiro vinculados; os writers e exclusões comerciais existentes não são alterados. Os históricos da Central permanecem acessíveis para auditoria, conforme a política. O código cliente da Central não produz notificações de recebimento, e o catálogo não contém triggers de push/notificação nessas tabelas.

## Casos planejados

| Caso | Operação normal e evidência esperada |
| --- | --- |
| Fechado | Fechar/atribuir/marcar por RPC normal; receber texto pela helper compartilhada; mesma conversa aberta, atendente/tags preservados, uma mensagem e um evento |
| Adiado | Adiar por RPC normal e receber texto; reabertura persistida; comentário posterior em conversa adiada não a reabre |
| Duplicata e novo fechamento | Repetir o ID; nenhum incremento/evento. Fechar de novo e repetir o mesmo ID; continua fechada |
| Fora de ordem | Receber ID inédito com timestamp anterior; reabre, preservando o resumo e datas mais recentes |
| Concorrência | Duas mensagens inéditas na mesma conversa; duas inserções/incrementos. Mesmo ID em paralelo; somente uma inserção/evento |
| Primeiro contato | Dois recebimentos para o único contato derivado; somente uma conversa, âncora/owner válidos, duas mensagens |
| Rollback | Exceção após a RPC; estado/resumo/contagem/histórico e criação nova revertidos. Retry do mesmo ID depois persiste uma vez |
| Permissões | Chamada direta da RPC de produção pelo usuário/anon recusada; somente a helper protegida opera as próprias fixtures |
| UI | Playwright visível no ERP iniciado em **5173** com strictPort: localizar a própria conversa, alterar estado pela UI, receber texto sintético e observar retorno à fila/linha do tempo sem duplicata |

Não haverá criação automática de massa pelo runner da UI nem uso de conversas operacionais como substituto. A prova de outro usuário e vínculos comerciais/mídia próprios continua separada; este lote não a declara concluída.

## Limpeza, retenção e falhas

Ao terminar, arquivar as cinco conversas pela RPC normal, preservando âncoras e histórico. Conferir contagens, ausência de vínculos comerciais e que nenhum destino externo foi chamado. O manifesto será marcado encerrado, impedindo novos writes por essa execução no harness. Não excluir histórico nem restaurar grants legados.

Se houver falha ou resposta incerta, primeiro inspecionar a própria execução. Não repetir o provisionamento ou um conjunto de casos automaticamente, não trocar runId para contornar guarda e não aumentar o teto sem nova autorização. Uma exceção controlada não deve deixar registros persistidos; isso será conferido pelo Vitest remoto. Se um gate falhar, manter os demais testes locais e registrar a prova gravável pendente.

Autorização solicitada conforme `docs/testing/SUPABASE_REMOTE_TEST_POLICY.md`: aplicar os dois SQLs revisados acima e executar esta operação limitada, com limpeza incluída. Publicar a nova regra exigirá aprovação posterior do candidato concreto.
