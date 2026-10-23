# Central — confirmação HTTP após processamento do webhook

**Data:** 22/10/2026. Correção local validada, sem publicação deste lote.

## Problema e causa comprovada

As rotas `api/whatsapp-webhook.ts` e `erp/api/whatsapp-webhook.ts` executavam o processador canônico e apenas registravam a quantidade de erros retornados. Mesmo quando uma consulta ou a RPC de recebimento falhava, respondiam HTTP 200 com EVENT_RECEIVED. O lote podia ter mensagens não persistidas e ainda assim receber confirmação de sucesso.

A primeira tentativa de teste descobriu que o standalone resolve outra cópia de supabase-js, na raiz. O mock original atingia apenas a dependência do ERP; a guarda de rede bloqueou essas tentativas e a prova não foi usada como regressão funcional. Após cobrir explicitamente as duas resoluções, **quatro regressões falharam com 200 em vez de 503**, sem chamadas externas: falha total e lote parcialmente processado nas duas rotas. Oito casos de preservação passaram antes da alteração.

## Correção

Quando `result.errors` não está vazio, ambas as rotas agora respondem **503** com mensagem pública genérica. Sucesso e duplicata validada pela RPC continuam retornando 200. O corpo não revela detalhes do erro de banco. A quantidade de erros continua registrada; o processador e seus logs internos não foram alterados.

São dois arquivos de execução; uma linha foi substituída por um bloco de quatro em cada rota. Assinatura HMAC sobre bytes originais, recusa de segredo ausente em produção, handshake, mídia e bloqueio de envio mantêm seus contratos. Não foi acrescentada fila, retentativa automática na aplicação, migration ou nova operação de banco.

## Provas

| Teste | Executado | Projeto / massa | Resultado | Limitação |
|---|---|---|---|---|
| Falha total e parcial antes/depois | Vitest, handlers e processador CJS real do build com clientes simulados | Sem banco, somente dados unitários | Quatro falhas antes; passaram depois | Não prova retentativa pela Meta nem persistência |
| Recibo inválido/erro de RPC, sucesso, duplicata, assinatura e segredo | Vitest nas duas entradas | Sem rede; guarda falha se qualquer fetch for chamado | **16/16** no arquivo de contrato final | Nenhum webhook legítimo enviado pela Meta |
| Resposta real do adaptador HTTP | Vitest usando listener HTTP efêmero e bundle de desenvolvimento real | Somente localhost; fetch ao host unitário interceptado, resposta de erro simulada | **503 real**, corpo genérico; uma consulta interceptada, nenhum acesso externo | Não usa o servidor de navegador nem prova PostgreSQL |
| Suíte da Central | Vitest/RTL, 24 arquivos | Isolado | **248 aprovados, seis ignorados**, 254 no total | Seis checks remotos de anon sem opt-in não executados nesta rodada |
| ESLint dos dois handlers e dois arquivos de prova | Executado com configuração do ERP estendida apenas no scratch para incluir API | Local | **Sem erros nem avisos** | A execução inicial não cobria as APIs por glob; não foi usada como prova delas |
| Suíte na cópia isolada | Vitest/RTL, 24 arquivos | Base de produção mais 21 caminhos selecionados | **248 aprovados/seis ignorados**, em 5,95s | Mesmos seis checks remotos sem opt-in |
| Build ERP completo isolado | npm run build | Base `bed981061157e1d07164b4cb9c8fdeb91e78abbb`, manifests de dependências equivalentes e sem credenciais | **Aprovado em 2m28s**, 5.913 módulos Vite | Avisos não fatais de anotação Zod, imports estáticos/dinâmicos e tamanho de chunks; não equivale a TypeScript global |

Os cenários de mídia/dispatch, bytes UTF-8/HMAC e inicialização Node nativa também passaram na suíte. O teste de listener efêmero é de contrato HTTP pelo Vitest; não é um teste de interface e não inicia uma segunda pilha de navegador. A UI 5173 foi validada no lote anterior com os mesmos sete arquivos de frontend/serviço do candidato combinado; não houve nova execução Playwright neste ajuste de backend.

Arquivos de prova: `erp/src/pages/App/CustomerSupport/__tests__/customerSupportWebhookAcknowledgement.test.ts` e `customerSupportLocalApi.test.ts`. Logs em `scratch/central-support-webhook-ack-before-2026-10-22.log` (problema inicial do harness), `scratch/central-support-webhook-ack-before-final-2026-10-22.log` (quatro regressões válidas), `scratch/central-support-webhook-ack-after-final-2026-10-22.log` e `scratch/central-support-webhook-ack-eslint-scoped-final-2026-10-22.log`.

## Retentativas e limites conhecidos

503 deixa explícito que o lote não foi concluído; não comprova que o provedor o reenviará. O núcleo de recebimento já delega deduplicação/identidade à RPC transacional; lotes parcialmente bem-sucedidos continuam usando esse contrato quando reapresentados. Não foi provocado reenvio real nem reutilizada autorização de fixtures encerrada.

A documentação atual da Meta consultada retornou 429 ou indisponibilidade. O [guia oficial arquivado do SDK](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/receivingMessages/) descreve 200 como confirmação após a qual não há reenvio. Ele é uma referência histórica, não prova do prazo atual de retentativas; este registro não adota um número de dias por fonte secundária.

O processador legado ainda tem outros limites fora deste patch: atualizações de status em tabelas externas não conferem todos os erros retornados e confirmação de entrega por botão tem efeitos anteriores à deduplicação da mensagem. Não se declara idempotência ou atomicidade de todos os fluxos do ERP. Esses pontos constam na auditoria de arquitetura e não foram alterados para ampliar o escopo deste lote.

Nenhum dado operacional, fixture, mensagem enviada, migration, commit, push, deploy ou promoção por este agente. O candidato anterior de leitura e o candidato de diretório permanecem congelados; não são ampliados por inferência de autorização. Auditoria A–R em andamento.

Candidato combinado: `C:\Users\mathe\morantehub-central-webhook-ack-release-20261022`, nove arquivos de execução e 21 caminhos selecionados. Inclui sete arquivos do pacote de diretório/leitura ainda não publicado e os dois handlers desta correção. Origem dos dados de interface preservada; nenhuma mudança fiscal local foi copiada. Logs adicionais: `scratch/central-support-webhook-ack-isolated-vitest-2026-10-22.log` e `scratch/central-support-webhook-ack-build-2026-10-22.log`.
