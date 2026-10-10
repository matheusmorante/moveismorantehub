# Auditoria de cancelamento, estorno e devolução — 08/10/2026

> **Snapshot histórico:** achados e classificações refletem a inspeção de 08/10, com atualizações pontuais registradas em seguida. O estado atual por fluxo e o resultado Vitest de 09/10 estão em [status-testes-homologacao.md](status-testes-homologacao.md); não reutilize as pendências abaixo sem conferir o código atual.

## Atualização após implementação no workspace

Em 08/10/2026, a decisão por pedido passou a avaliar cada NF/NFH autorizada separadamente. A tela mantém o pedido cancelado após sucesso comercial, recarrega os dados fiscais e apresenta falha ou confirmação pendente por documento, com retry restrito ao ID da nota. Falhas locais conhecidas antes da transmissão também são registradas no histórico do evento. A validação cobre testes focados e lint; não houve transmissão fiscal nem teste E2E remoto nesta alteração.

F02 e F04 foram endereçados no código local descrito acima. F05 foi parcialmente endereçado: falhas locais específicas do endpoint de cancelamento deixam um evento rejeitado e rastreável, mas ainda não existe uma intenção fiscal criada atomicamente na transação comercial. Os demais itens deste relatório continuam pendentes até validação ou implementação própria.

## Resultado

O fluxo possui a estrutura principal, mas ainda há falhas de reconciliação e de apresentação de sucesso parcial que impedem considerar o conjunto pronto para liberação geral em Produção. Os achados abaixo foram confirmados por leitura do código atual, testes focados e inspeção somente leitura das funções e restrições do Supabase configurado.

Foram identificados oito pontos de correção ou conclusão funcional. Os cinco primeiros devem ser tratados antes da liberação. As limitações da devolução devem continuar explícitas enquanto os cenários fiscais correspondentes não estiverem implementados e aprovados.

Esta auditoria não alterou os fluxos fiscais nem transmitiu documentos ou eventos. Também não executou movimentações em pedidos operacionais. A avaliação considera o checkout local de 08/10/2026; não comprova qual revisão de código está atualmente publicada.

## Escopo e evidência

- Cancelamento iniciado pelo pedido e pela área fiscal; pré-validação central; evento 110111; consulta e reconciliação.
- Preparação, revisão e transmissão dos rascunhos de estorno e devolução.
- Regras de circulação, retorno físico, alocação de itens, ambiente fiscal e rótulos dos cards.
- Supabase: projeto configurado `hkoxhourxwlddgsfdgws`; leitura de definições de funções, constraints, índices e histórico da migration fiscal. Nenhum registro operacional foi modificado nesta auditoria.
- A migration fiscal originalmente identificada como `20261008120000` consta aplicada sob a versão remota `20261008180854`, com o arquivo local correspondente. Ela permite origem modelo 65 para estorno; mantém a origem de devolução restrita ao modelo 55.
- Testes locais com mocks de banco/SEFAZ e validação de XML sintético contra o XSD de NF-e fixado no repositório. Inspeção de função PostgreSQL não equivale a execução de testes de rollback, RLS ou concorrência.

## Achados prioritários

### F01 — Alta: a consulta dos fluxos novos não reconcilia os eventos de cancelamento

**Evidência:** [consult.ts](../../api/nfe/consult.ts#L49) desvia os documentos do fluxo normal para `reconcileNormalSale` e os documentos HML para `consultAuthorizedHmlTechnical`, antes do tratamento de cancelamento existente a partir da linha 118.

No fluxo normal, [reconcileNormalSale](../../api/nfe/normal-sale/outboundAttempt.ts#L285) retorna o resultado local quando a tentativa de emissão já está autorizada. Nesse caminho não faz uma consulta nova à SEFAZ nem reconcilia o evento 110111. Em HML, [consultAuthorizedHmlTechnical](../../api/nfe/emitHmlTechnical.ts#L505) trata a situação cancelada como divergência que exige reconciliação manual e não grava o evento/documento reconciliados.

**Consequência:** depois de timeout ou persistência parcial do cancelamento, o botão de consulta pode manter a pendência ou devolver apenas a autorização anteriormente salva. O caminho genérico de reconciliação não atende igualmente às notas novas.

**Correção necessária:** consultar e reconciliar a situação fiscal e os eventos do documento independentemente do fluxo que o emitiu. Preservar a tentativa original, XML, protocolo e ambiente. Uma consulta não deve transmitir novamente. Cobrir os dois fluxos novos, tanto para cancelamento confirmado quanto para ausência de registro do evento.

### F02 — Alta: Produção e Homologação são contadas juntas na decisão de cancelamento

**Evidência:** [order-cancellation-policy.ts](../../api/nfe/order-cancellation-policy.ts#L173) conta documentos autorizados por pedido sem separar o ambiente; o caminho por pedido faz a mesma agregação a partir da linha 280 e bloqueia quando a quantidade é diferente de um na linha 401.

**Consequência:** uma NF de Produção e uma NFH autorizada do mesmo pedido são interpretadas como múltiplos documentos concorrentes e podem provocar revisão manual indevida. O caminho por documento também recebe a contagem conjunta.

**Correção necessária:** decidir e registrar o tratamento por documento e ambiente. A duplicidade deve ser avaliada dentro do ambiente correspondente. O cancelamento comercial continua único; pendências fiscais dos demais documentos devem permanecer visíveis. Nunca selecionar Produção ou HML implicitamente nem dispensar a confirmação de Produção.

### F03 — Alta: resultado do evento e status da nota são persistidos separadamente

**Evidência:** [cancel.ts](../../api/nfe/cancel.ts#L369) atualiza a tentativa em `nfe_document_events`; depois atualiza `nfe_documents`, na linha 397. A recuperação de uma tentativa anterior também realiza gravações separadas.

**Consequência:** a SEFAZ pode confirmar o cancelamento e apenas uma parte do estado local ser gravada. Há sinalização de `reconciliationRequired`, o que reduz o risco de esconder a divergência, mas não torna as gravações locais atômicas. F01 ainda dificulta concluir a recuperação nos fluxos novos.

**Correção necessária:** criar uma RPC transacional e idempotente para persistir resultado, XML de resposta, protocolo, histórico e estado do documento conjuntamente. A chamada externa continua após o commit comercial. Falha local posterior à confirmação da SEFAZ deve permanecer reconciliável, sem novo envio e sem repetir estoque.

### F04 — Alta: a tela fiscal perde a informação de que o cancelamento comercial já foi confirmado

**Evidência:** [fiscalCancellationService.ts](../../erp/src/pages/App/FiscalDocuments/services/fiscalCancellationService.ts#L48) confirma o pedido antes de executar o tratamento fiscal, mas devolve `commercialCommitted` somente se toda a função terminar. [useFiscalCancelModal.ts](../../erp/src/pages/App/FiscalDocuments/hooks/useFiscalCancelModal.ts#L68) só atualiza a variável depois desse retorno.

**Consequência:** se a etapa fiscal lançar erro após o commit comercial, o `catch` considera que o commit não ocorreu. Exibe uma mensagem genérica e não entra no caminho de fechar/atualizar a lista reservado ao sucesso comercial parcial. O pedido e o estoque podem já estar alterados no banco enquanto a tela mantém a apresentação anterior.

**Correção necessária:** transportar explicitamente o resultado comercial quando a etapa fiscal falhar, por resultado discriminado ou erro estruturado, e atualizar a interface após todo commit comercial confirmado. Repetir a ação fiscal não deve repetir a operação de estoque.

### F05 — Alta: falhas anteriores à reserva do evento não ficam registradas como falha fiscal

**Evidência:** em [cancel.ts](../../api/nfe/cancel.ts#L285), bloqueio de Produção e certificado indisponível são detectados antes da criação da tentativa. A RPC comercial inspecionada não registra uma intenção fiscal durável. O pedido inicia o tratamento fiscal pelo navegador após o commit e apresenta erros por toast em [useOrderHistoryOperations.ts](../../erp/src/pages/App/SalesOrder/OrderHistoryList/useOrderHistoryOperations.ts#L184).

Existe uma proteção visual útil: [orderFiscalBadgeRules.ts](../../erp/src/pages/utils/nfe/orderFiscalBadgeRules.ts#L240) deriva uma pendência quando o pedido está cancelado, a nota autorizada e não há evento/estorno. Portanto, a pendência não desaparece simplesmente por faltar evento.

**Consequência:** o motivo da falha anterior à reserva não sobrevive ao recarregamento. O card passa a mostrar pendência genérica, sem conseguir manter o aviso vermelho “Falha na tentativa de cancelamento”. Fechar a página entre o commit comercial e a requisição fiscal também deixa a continuidade dependente de ação posterior na interface.

**Correção necessária:** persistir a intenção de tratamento fiscal junto da operação comercial, com documento, ambiente, estado e motivo técnico sanitizado. Distinguir não iniciado, falha antes do envio e resultado incerto. Retomar pela interface sem novo efeito comercial e sem reenvio automático quando houver incerteza.

## Cobertura funcional a concluir

### F06 — Média: falta cancelar a própria NF-e de estorno ou de devolução

**Evidência:** [cancel.ts](../../api/nfe/cancel.ts#L81) aceita apenas `document_type='outbound'`. A ação da interface também está limitada a esse tipo em [FiscalDocumentRowActions.tsx](../../erp/src/pages/App/FiscalDocuments/components/FiscalDocumentRowActions.tsx#L188).

**Consequência:** o ERP possui apresentação para NFE cancelada, mas não oferece o fluxo correspondente de cancelamento da própria nota de estorno ou devolução autorizada.

**Conclusão necessária:** implementar o evento fiscal para esses documentos com sua elegibilidade específica, confirmação de Produção e reconciliação. Cancelar o documento de ajuste/retorno não deve reaplicar o cancelamento comercial da venda nem reverter automaticamente o retorno físico. Rever os vínculos de rascunhos e alocações mantendo o histórico.

### F07 — Média: a devolução fiscal ainda cobre um conjunto restrito de vendas

**Evidência:** [returnFiscalRules.ts](../../api/nfe/returnFiscalRules.ts#L124) aceita modelo 55 como origem por padrão. A [migration aplicada](../../supabase/migrations/20261008180854_allow_nfce_source_for_nfe_estorno.sql#L83) mantém essa restrição para `return`, apesar de ampliar `estorno` para 55/65.

Também há bloqueios explícitos de operação interestadual, exterior, destinatário contribuinte e destinatário que não seja consumidor final em [fiscalOperationContext.ts](../../shared-utils/fiscalOperationContext.ts#L178). Bases ou valores tributários não zero são bloqueados pela matriz atual na linha 99.

**Conclusão necessária:** implementar e aprovar a devolução vinculada a NFC-e modelo 65 e as matrizes efetivamente utilizadas pela empresa, com referências, CFOP, tributos e totais proporcionais. Até essa aprovação, preservar os bloqueios e apresentar a limitação concreta ao usuário. A migration de estorno não resolve esses cenários de devolução.

### F08 — Média: falta a validação XSD específica do evento de cancelamento

**Evidência:** [cancel.ts](../../api/nfe/cancel.ts#L307) monta e assina o evento, mas não passa por um validador do schema do evento antes do envio. [nfeSigner.ts](../../api/nfe/nfeSigner.ts#L87) assina XML; não valida o leiaute. Os XSDs versionados inspecionados cobrem a NF-e, sem o pacote específico de cancelamento.

**Conclusão necessária:** versionar e validar o schema oficial aplicável ao evento e ao envelope de envio, com testes de assinatura, caracteres, data/fuso e retorno. A validação existente da NF-e de estorno/devolução não cobre o XML do evento 110111.

## O que já está implementado e deve ser preservado

| Regra | Evidência atual | Limite da evidência |
| --- | --- | --- |
| Pedido e estoque na mesma operação | RPC remota `create_order_with_inventory_transaction`: lock por pedido, gravação de cabeçalho/itens/pagamentos e movimentações dentro da transação | Código inspecionado; rollback e concorrência não executados nesta auditoria |
| Retorno físico antes da entrada de estoque | RPC só cria entrada para devolução `fulfilled`; a API fiscal exige recebida/coletada | Testes locais de regra e inspeção; falta integração real isolada |
| Coleta agendada e cliente que trouxe à loja | Modal cria `scheduled` para coleta e `fulfilled` para recebimento na loja; confirmação de coleta explicita o retorno físico | Interface inspecionada; teste visual/E2E pendente |
| Circulação bloqueia cancelamento por operação não realizada | Política central e guard no banco; `fulfilled` inclui entrega/retirada | Testes focados passaram; falta provar transições concorrentes no PostgreSQL |
| Estorno preserva a nota original | Novo documento vinculado, sem transformar a original em cancelada e sem entrada fiscal adicional de estoque | Planejamento, API e RPC inspecionados |
| Resultado incerto não provoca reenvio imediato | Rascunho guarda chave/XML; nova tentativa depende de consulta e estado elegível | Endpoint simulado passou; F01 continua pendente no cancelamento |
| Revisão e confirmação de Produção | Flags de revisão, conferência de apuração e confirmação explícita no servidor | Código e testes locais; não houve transmissão real |
| Rótulos NF/NFH rejeitados e falha de cancelamento | Âmbar com triângulo para rejeição; nota original continua autorizada quando o evento falha; aviso vermelho separado | Regras passaram; o teste de interface não iniciou por dependência nativa |
| Escurecimento do card cancelado | Overlay `z-10`; rótulos fiscais sem elevação acima dele; carimbo `z-20` | Confirmado na estrutura/CSS; sem comparação visual em navegador nesta auditoria |

## Conferência do estorno com a orientação oficial

O preenchimento principal implementado corresponde aos requisitos específicos consultados: modelo 55, `finNFe=3`, natureza “Nota Fiscal de Estorno”, operação inversa, referência à chave original, CFOP conferido e justificativa/referência legal em `infAdFisco`. A referência é a [NPF 038/2022, art. 1º](https://www.sefanet.pr.gov.br/dados/SEFADOCUMENTOS/103202200038.pdf). Esta correspondência de campos não comprova, sozinha, a correção da tributação de cada operação.

O servidor também exige confirmação da revisão de apuração e, se o mês for posterior ao da autorização original, texto sobre diferenças/acréscimos ou justificativa de não aplicação: [transmit-operation-draft.ts](../../api/nfe/transmit-operation-draft.ts#L718). A análise tributária concreta continua pertencendo à revisão fiscal.

O cancelamento é um evento agregado à nota original, conforme a [SEFA/PR — Eventos NF-e](https://sped.fazenda.pr.gov.br/NFe/Pagina/Eventos-NF-e). Os prazos da política central foram comparados com as [orientações de NF-e da SEFA/PR](https://atendimento.fazenda.pr.gov.br/sacsefa/portal/assuntosReferente/23) e as [orientações de NFC-e](https://atendimento.fazenda.pr.gov.br/sacsefa/portal/assuntosReferente/22): 168 horas para modelo 55 e 30 minutos para modelo 65. Os testes locais incluem o instante do limite.

## Outros ajustes a planejar

- **Numeração consumida antes de transmissão:** o rascunho reserva número antes da construção/validação final e antes da disputa de estado. Falha de XSD ou concorrência pode consumir número sem envio. O endpoint informa a reserva na resposta, mas é necessário comprovar um acompanhamento durável dessas lacunas e o procedimento fiscal aplicável. Não reutilizar números por ajuste manual da sequência. Evidência: [transmit-operation-draft.ts](../../api/nfe/transmit-operation-draft.ts#L750) e testes de falha de schema.
- **Revisão por formulário:** parte da conferência do estorno usa edição direta de XML. Para origem NFC-e sem destinatário identificado, os dados exigidos pelo modelo 55 precisam ser completados e validados. Planejar campos estruturados e mensagens específicas, preservando a revisão fiscal.
- **Financeiro:** esta auditoria verificou a persistência dos pagamentos do pedido na RPC, mas não validou liquidação, reembolso ou reversão de lançamentos financeiros no banco real. Esses efeitos precisam de cenário de integração próprio quando forem parte da operação comercial.

## Testes e verificações executados

Resultados consolidados: **117 testes existentes aprovados**, distribuídos em 16 arquivos; **um teste existente de reconciliação excedeu o timeout**, inclusive isolado com 30 segundos. Um teste de interface não conseguiu iniciar. Um diagnóstico temporário da consulta genérica passou com os dois fluxos novos substituídos por mocks; isso não aprova o teste original nem cobre F01.

| Teste | Executado | Projeto/ref | Massa sintética/testRunId | Resultado | Limitação/evidência pendente |
| --- | --- | --- | --- | --- | --- |
| Política, elegibilidade, planejamento, revisão, XML e reconciliação: 7 arquivos | Sim | Local | Fixtures locais, mocks e XML sintético | 44 passaram; 1 timeout | SEFAZ/banco simulados; o XML de estorno e devolução foi validado no XSD local fixado |
| Reconciliação original isolada | Sim | Local | Mocks do teste | Timeout em 5s e 30s | Investigar importação/dependências e isolamento do teste |
| Diagnóstico isolando os módulos dos fluxos novos | Sim | Local | Cópia temporária com mocks adicionais | 1 passou | Diagnóstico adicional; arquivo removido; não contado nos 117 existentes |
| Cancelamento, política da API, efeitos, transmissão de rascunho e capacidade de devolução: 5 arquivos | Sim | Local | Mocks de Supabase/SEFAZ, identificadores sintéticos | 47 passaram | Não comprova integração externa, RLS ou transação PostgreSQL |
| Estoque/quantidade/cancelamento de devolução, política de retorno e rótulos: 5 arquivos | Sim | Local | Fixtures em memória | 26 passaram | O comando conjunto terminou com erro de ambiente do teste de interface |
| Ações da linha fiscal em React/jsdom | Tentado | Local | Fixtures de componente | Não iniciou | Falta `canvas.node` na dependência nativa de jsdom |
| Typecheck focado dos 8 endpoints e dependências | Sim | Local | Não se aplica | Não aprovado | Configuração NodeNext incompatível com imports do ERP, aliases e tipos DOM; depreciação do TypeScript 6; ver detalhes abaixo |
| Funções, constraints, índices e migration fiscal | Sim, somente leitura | `hkoxhourxwlddgsfdgws` | Nenhuma fixture criada | Inspeção concluída | Não executa rollback, idempotência ou concorrência |
| Integração PostgreSQL/pgTAP com fixtures isoladas | Não | Projeto remoto configurado | A criar: `TEST_AUT_<uuid>` | Pendente | Nenhuma escrita remota de teste foi feita nesta auditoria |
| E2E e smoke fiscal HML pela interface | Não | Banco remoto; fiscal ambiente 2 | A definir conforme política fiscal | Pendente | Nenhuma transmissão ou cancelamento real foi autorizado/executado nesta auditoria |

### Comandos utilizados

Todos os comandos de teste abaixo partem da raiz do projeto. A segunda e a terceira execuções de reconciliação foram diagnóstico do timeout, sem mudança de código funcional.

```powershell
npm run test:unit --prefix erp -- src/pages/utils/nfe/__tests__/fiscalCancellationPolicy.test.ts src/pages/utils/nfe/__tests__/cancellationEligibility.test.ts src/pages/utils/nfe/__tests__/fiscalOperationPlanning.test.ts src/pages/utils/nfe/__tests__/fiscalOperationReview.test.ts src/pages/utils/nfe/__tests__/fiscalOperationXml.test.ts src/pages/utils/nfe/__tests__/returnFiscalRules.test.ts src/pages/utils/nfe/__tests__/cancellationReconciliation.test.ts

npm run test:unit --prefix erp -- src/pages/utils/nfe/__tests__/cancellationReconciliation.test.ts --maxWorkers=1 --minWorkers=1
npm run test:unit --prefix erp -- src/pages/utils/nfe/__tests__/cancellationReconciliation.test.ts --maxWorkers=1 --minWorkers=1 --testTimeout=30000

npm run test:unit --prefix erp -- src/pages/utils/nfe/__tests__/cancelEndpoint.test.ts src/pages/utils/nfe/__tests__/orderCancellationPolicyEndpoint.test.ts src/pages/utils/nfe/__tests__/orderCancellationEffects.test.ts src/pages/utils/nfe/__tests__/transmitOperationDraft.test.ts src/pages/utils/nfe/__tests__/returnCapacityEndpoint.test.ts --maxWorkers=1 --minWorkers=1 --testTimeout=15000

npm run test:unit --prefix erp -- src/pages/utils/__tests__/returnInventoryRules.test.ts src/pages/utils/__tests__/returnQuantityRules.test.ts src/pages/utils/__tests__/returnCancellation.test.ts src/pages/utils/__tests__/returnPolicy.test.ts src/pages/utils/nfe/__tests__/orderFiscalBadgeRules.test.ts src/pages/App/FiscalDocuments/__tests__/fiscalDocumentRowActions.test.tsx --maxWorkers=1 --minWorkers=1
```

O typecheck usou uma configuração temporária derivada de `api/tsconfig.nfe.json`, incluindo `cancel`, `consult`, `order-cancellation-policy`, `operation-drafts`, `transmit-operation-draft`, `return-fiscal-eligibility`, `return-capacity` e `order-fiscal-badges`. O include permanente não contempla diretamente vários desses endpoints. A primeira execução parou em TS5101; o diagnóstico com `--ignoreDeprecations 6.0` encontrou TS6059 e incompatibilidades de imports/tipos. Com `--rootDir .`, permaneceram TS2835, TS2307, ausência de tipos DOM e erros derivados. A configuração temporária foi removida. Nenhuma alteração funcional foi feita, portanto esses resultados não são classificados como erros introduzidos por esta auditoria.

Não foi executado lint de código, pois a entrega desta tarefa é exclusivamente este relatório. Não foram executadas suíte completa, carga, fault injection, reset de banco ou transmissão por CLI.

## Ordem recomendada de conclusão

1. Corrigir F01–F05 e adicionar regressões focadas para os fluxos novos, dois ambientes no mesmo pedido, falha após commit e falha antes da reserva fiscal.
2. Provar no PostgreSQL remoto, com fixtures isoladas, atomicidade, repetição, concorrência e permissões das RPCs; comprovar que reprocessar a pendência fiscal não duplica estoque/financeiro.
3. Concluir o cancelamento das próprias notas de estorno/devolução e o XSD de eventos. Implementar as matrizes adicionais de devolução que forem aprovadas para a empresa.
4. Corrigir o ambiente dos testes de interface e a configuração de typecheck; concluir as verificações focadas sem ampliar para a suíte inteira.
5. Validar pela interface, em HML: cancelamento 55/65, consulta após resposta incerta, estorno 55 originado de 55/65, devolução parcial/total após recebimento/coleta, rejeição e reprocessamento. Preservar todos os documentos reais gerados e suas evidências.

**Critério de liberação:** F01–F05 resolvidos, escopo fiscal suportado declarado, verificações estáticas aprovadas e evidência de integração real dos cenários liberados. Estorno continua sujeito à revisão fiscal; autorização SEFAZ e integridade de persistência devem ser comprovadas separadamente.

## Atualização de 2026-10-09 — Etapa 5

### Implementado nesta atualização

- A ação **Gerar devolução** deixou de ser ocultada apenas pela existência de vínculo/devolução anterior. A disponibilidade continua determinada por `canGenerateReturn`; o formulário e a reserva de quantidades permanecem no fluxo existente.
- O rótulo NFD agora agrupa documentos `document_type='return'` associados aos pedidos de devolução vinculados às vendas visíveis na página. A busca é limitada aos IDs enviados, validada pela sessão/RLS, em lotes e sem carregar `order_data` completo; não há consulta N+1.
- O contador usa IDs distintos de documentos fiscais persistidos. Devoluções sem documento, rascunhos e eventos não entram na contagem. Estados agregados não mostram check verde quando há mistura; cancelamentos ainda incertos ficam em estado de atenção.
- O detalhe da NFD mostra número/série/modelo/ambiente/status, data de autorização do protocolo quando disponível, pedido de devolução, valor e quantidade de itens, e encaminha para o documento fiscal existente, onde permanecem XML/DANFE e ações individuais. O mesmo rótulo não é repetido nos pedidos de devolução.
- A data exata `dhEmi` não é carregada neste resumo: ela exigiria consultar o XML completo, então este ponto fica pendente para uma fonte compacta de data de emissão.
- Nenhuma migration foi criada ou aplicada. Não houve escrita no Supabase nem transmissão à SEFAZ.

### Cancelamento fiscal da NFD e limite operacional

O cancelamento comercial já existente da devolução é distinto: a devolução agendada é marcada cancelada; a atendida usa `undoReturn`, que tenta reverter movimentos de estoque, atualiza o pedido de devolução e limpa o vínculo auxiliar na venda. Essas gravações são feitas em chamadas separadas, sem RPC transacional. Portanto, esse helper não foi reutilizado depois de uma confirmação fiscal.

A preparação atual da NF-e de devolução exige que o pedido esteja `fulfilled`; o modal usa esse estado quando o cliente já entregou a mercadoria e a coleta só o alcança após confirmação física. Assim, no fluxo correto, uma NFD autorizada representa retorno físico já confirmado. A SEFAZ condiciona o cancelamento à operação ainda não ter ocorrido/à mercadoria ainda não ter saído; não foi inventado um caso elegível para forçar o cenário. As fontes consultadas são a [SEFA/PR — Eventos NF-e](https://sped.fazenda.pr.gov.br/NFe/Pagina/Eventos-NF-e) e as [Perguntas frequentes do Portal Nacional da NF-e](https://www.nfe.fazenda.gov.br/portal/consulta.aspx/perguntasFrequentes.aspx?AspxAutoDetectCookieSupport=1&tipoConteudo=3Ow1nfTBzIo%3D).

**F06 continua pendente:** não existe ação fiscal individual para cancelar a própria NFD e também não há fluxo transacional/reconciliável para, após confirmação da SEFAZ, cancelar uma devolução ainda não realizada. Até implementar esse ciclo com idempotência e preservação de estoque/histórico, o E2E de cancelamento e reabertura de saldo permanece bloqueado por ausência de cenário real elegível e de integração segura. F07, F08 e os itens F01–F05 deste relatório também não foram alterados nesta atualização.

### Verificações desta atualização

- Regras de NFD, componente de detalhes e política de múltiplas devoluções: **29 testes aprovados em 3 arquivos**.
- ESLint focado nos arquivos ERP alterados: **aprovado** usando `--config ./eslint.config.mjs`.
- TypeScript do ERP: o comando geral ainda termina com erros em outros módulos; a saída filtrada não apresentou diagnóstico nos arquivos desta alteração.
- E2E SEFAZ-PR/HML, integração PostgreSQL, rollback, concorrência e reconciliação real: **não executados**. Nenhuma fixture foi criada no Supabase operacional.
- Nenhuma numeração de homologação ou produção foi consumida nesta atualização.

**Resultado:** o ajuste de múltiplas devoluções e o agrupamento NFD estão implementados com cobertura local. A Etapa 5 não está concluída; o cancelamento fiscal de NFD, a prova comercial/estoque no banco e os cenários HML permanecem pendentes.

### Atualização de regras e evidências — 10/10/2026

O usuário confirmou que “Desfazer atendido” deve corrigir um clique equivocado de `fulfilled` para `scheduled`, sem efeito em estoque ou NF. A transição permanece disponível para venda/showroom; evidências físicas independentes de entrega, retirada ou trânsito continuam bloqueando cancelamento posterior. O teste focado cobre a correção, estoque preservado e bloqueio quando existe registro de entrega.

O cancelamento comercial de uma devolução agora opera sobre o pedido de devolução selecionado, recarrega seu estado e versão, e falha se o retorno físico/entrada de estoque já foi confirmado. Não inverte estoque e não limpa o vínculo histórico da venda. A suíte local também verifica repetição idempotente e recusa de seleção ambígua pela venda. Ainda falta integração concorrente PostgreSQL.

A ação fiscal da tela por linha agora passa o ID do documento selecionado ao serviço central; os documentos irmãos não são incluídos por essa solicitação individual. O fluxo de cancelamento comercial iniciado na venda continua tendo política própria para os documentos associados. A correção de clique equivocado em “Atendido” preserva os indicadores de estoque e não chama efeitos fiscais. A matriz local distingue CFOP candidato de rota autorizada: sem regra interestadual aprovada, a emissão permanece bloqueada. **33 arquivos focados e 259 testes passaram** em 10/10, distribuídos em lotes; o agrupamento principal passou em 32 arquivos/250 testes e o recebimento de mercadorias em 9/9. O agrupamento principal saiu com três erros não tratados porque o binário `canvas.node` exigido pelo jsdom não está disponível para Node 22; duas suítes fiscais de interface não iniciaram. Nenhuma gravação remota ou transmissão HML ocorreu. A checagem TypeScript ampla ainda falha em erros distribuídos no ERP. O [plano cíclico de testes fiscais](plano-ciclo-testes-fiscais.md) lista os casos cobertos, pendentes e bloqueados.

F06 continua pendente: cancelamento de NFD/estorno, preservação de múltiplas linhagens e reemissão ainda precisam de fonte fiscal aplicável, suporte de API/modelagem, testes locais e integração protegida antes de qualquer transmissão.
