# Relatório de auditoria — testes fiscais de Homologação

**Data:** 11/10/2026
**Conclusão:** prontidão parcial; a suíte fiscal completa ainda não está pronta para execução segura e repetível.

> **Nota de atualização — 12/10/2026:** este documento preserva os achados e resultados observados em 11/10. Os trechos que descrevem factories estáticas (`syntheticSales*Fixture`) e `nfe-hml-automated.cjs` registram o estado histórico, não o código atual: esses geradores e o emissor direto foram removidos. O fluxo atual exige `runId` e UUID do pedido já persistidos, resolve ownership/metadata com leitura autenticada do Supabase e mantém transmissão somente pela UI do ERP. A prontidão ponta a ponta segue pendente até haver cenário autorizado persistido e cobertura dos ciclos fiscais completos. Veja [`fiscal-interface-e2e.md`](fiscal-interface-e2e.md) e [`status-testes-homologacao.md`](../fiscal/status-testes-homologacao.md) para o estado atual.


## Resumo executivo

Há progresso real na definição dos artefatos: presets de cliente, produto e pedido ficam no código; o conversor chama a factory; a factory usa validadores compartilhados com os formulários, omite CPF/CNPJ sintético do cadastro e compartilha cliente/produto por preset dentro do mesmo `runId`. Os testes locais atuais da factory passam.

O bloqueio principal é que o conversor perde a finalidade fiscal: não transfere `fiscalModel` nem `lifecycleStage`, e a factory cria todos os pedidos como `scheduled`. Assim, os presets de cancelamento, estorno e devolução não produzem os estados que descrevem. Além disso, o Playwright fiscal não chama a factory, escolhe pedidos existentes por posição/elegibilidade e pode transmitir uma nota real em HML. Uma nota HML antiga também pode fazer o teste passar sem executar o cenário atual.

“Definido no código-fonte” significa que a receita dos dados é versionada no repositório. Para aparecer na UI e ser resolvido pelo backend fiscal, a factory precisa persistir cliente, produto/variação e pedido nos serviços normais do ERP — portanto, os registros ficam no Supabase operacional. Esta auditoria não fez essa gravação.

## O que está alinhado

- Existem 6 presets de clientes, 3 de produtos e 8 de pedidos HML em TypeScript.
- Os presets e a factory usam validadores compartilhados com os formulários. A factory valida cliente, produto e pedido antes da persistência, incluindo `validateOrderWithZod`.
- A factory não grava CPF/CNPJ sintético no cliente nem no pedido; o teste atual verifica essa condição.
- IDs são determinísticos por `runId`, operador e cenário. Cliente/produto/variação podem ser compartilhados por preset dentro da execução; cada cenário conserva seu pedido. Um novo `runId` gera novos IDs e isola execuções, mas não reutiliza artefatos anteriores.
- O NCM é confrontado com allowlist local e palavras-chave de compatibilidade. Isso prova a regra codificada, não consulta atual ao catálogo oficial; fonte e vigência não foram verificadas nesta rodada.
- O helper usa serviços de persistência do ERP e verifica dependências existentes, como categoria, fornecedor e vendedor; não deve duplicar essas dependências.

## Achados que impedem considerar a suíte pronta

### 1. A factory perde modelo e ciclo de vida dos presets — bloqueador

`HML_ORDER_PRESETS` contém quatro cenários de emissão regular, dois de cancelamento, um de estorno e um de devolução. Porém, `buildSyntheticScenarioFromHmlPreset()` converte apenas campos comerciais para `SyntheticSalesScenarioInput`; não carrega `fiscalModel` nem `lifecycleStage`. Depois, `buildScenarioCommand()` define `status: 'scheduled'` incondicionalmente.

Consequências:
- O preset de devolução, cujo pedido original está `fulfilled`, vira `scheduled`; não demonstra circulação nem é base correta para devolução.
- O preset NFC-e presencial também perde o estado original.
- Cancelamento e estorno são apenas pedidos de venda; não criam/vinculam NF autorizada, ambiente, chave/protocolo ou evento anterior. Não são cenários prontos para esses eventos.
- A conversão não informa ao Playwright o modelo (55/65) ou cenário instanciado. O teste de conversão cobre apenas a venda interna NF-e 55, não os oito presets nem os estados resultantes.

Não basta alterar o status diretamente para `fulfilled`: circulação deve ocorrer pelo fluxo transacional normal, incluindo estoque e histórico. A factory precisa modelar o ciclo sem contornar esses efeitos.

### 2. Playwright não consome as fixtures; pode gerar falso positivo ou transmissão não planejada — bloqueador

`erp/tests/e2e/fiscal/fiscal-ui-navigation.spec.ts` não referencia presets nem `createSyntheticSalesScenario`. Quando não encontra nota HML, percorre até 12 pedidos e abre o primeiro elegível, sem exigir metadata `is_test`, `runId` ou ID da factory. Se encontra qualquer nota HML recebida no período “Este ano”, pula a emissão e valida esse documento sem vinculá-lo à execução atual.

Portanto, o teste pode transmitir em HML usando pedido operacional não identificado como fixture ou passar por causa de uma nota antiga, sem testar o cenário/pedido/XML pretendidos. Ao clicar em `nfe-emit-button`, o spec inicia transmissão. `npm run test:e2e:fiscal:hml` não é só navegação ou pré-validação; não executar rotineiramente nem sem autorização explícita específica.

A comparação XML também está incompleta: o spec verifica `<tpAmb>2</tpAmb>` e o resultado visual, mas não usa `fiscalXmlAssertions.ts` para comparar preset, pedido persistido, snapshot e XML assinado.

### 3. Três falhas atuais no contrato de bloqueio interestadual

No teste focado atual, PR→SC, PR→SP e PR→RS retornam `422`, `numberReserved=false` e `sefazContacted=false`, mas com `HML_RULESET_NOT_APPLICABLE`. Os testes esperam `HML_INTERSTATE_MATRIX_NOT_APPROVED`. A proteção contra numeração/transmissão funciona nesses casos mockados, mas o código e os testes divergem na classificação explícita da matriz não aprovada. Alinhar o contrato antes de usar essa evidência como aceite.

### 4. Modo E2E simulado não é substituto automático

Os 4 testes unitários de `sefazE2eSimulator` passam e verificam guards de XML HML, endpoint/modelo, produção e refs operacionais. Isso não equivale a Playwright integrado. O simulador rejeita refs operacionais, enquanto a configuração Playwright exige a ref Supabase vinculada e a política do projeto proíbe banco/projeto isolado. O modo `simulated` também configura Playwright headless, contrário ao requisito de UI visível. Não rodar esse E2E até existir alvo permitido e comprovadamente seguro; não criar projeto/schema paralelo para contornar o guard.

### 5. Script legado pode transmitir por HTTP direto

`scripts/testing/nfe-hml-automated.cjs` contém POST autenticado para `/api/nfe/emit`, fora da interface. Embora não conste dos scripts npm usuais, pode ser chamado diretamente por Node. Isso conflita com a regra do projeto: transmissão real HML somente pela UI. Não executar; retirar ou restringir esse caminho em tarefa própria.

### 6. Documentação não descreve o código atual

`docs/testing/fiscal-interface-e2e.md` diz que o spec não abre o modal, não gera XML e não compara o XML; também descreve jornada que localiza fixture criada pelo helper e compara snapshot/XML. O spec atual transmite e não usa o helper. Atualizar esse documento e reconciliar com `docs/fiscal/status-testes-homologacao.md`, preservando datas e separando evidência histórica, teste local, integração remota e emissão real. O log fornecido pelo usuário sobre autorização anterior é evidência relatada, não reconsultada nesta auditoria.

## Execuções e limites desta auditoria

| Teste | Executado | Projeto/ref | Massa sintética/runId | Resultado | Limitação/evidência pendente |
|---|---|---|---|---|---|
| `syntheticSalesScenarioFixture.test.ts` | Sim | Local, dependências em memória | Fixtures de teste em memória; sem execução remota | 17/17 passaram | Não prova Supabase, RLS ou UI; não cobre conversão dos oito ciclos de vida |
| `sefazE2eSimulator.test.ts` | Sim | Local, função pura | XML sintético de teste; sem `runId` remoto | 4/4 passaram | Prova só a fronteira do simulador, não E2E integrado |
| `hmlTechnicalEmission.test.ts` | Sim | Local, DB/SOAP mockados | Snapshots sintéticos em memória | 42/45 passaram; 3 falhas de classificação interestadual | Nenhum RPC/SOAP real ou transmissão SEFAZ |
| Playwright HML (`test:e2e:fiscal:hml`) | Não | — | Nenhum | Não executado | O spec pode transmitir; seleção não está vinculada à factory |
| Playwright fiscal simulado | Não | — | Nenhum | Não executado | Sem alvo compatível com guards/política atuais; config headless |
| Integração Supabase e UI autenticada | Não | Nenhuma ref consultada nesta auditoria | Nenhum `runId` remoto | Não executada | Persistência, visibilidade, metadata, limpeza e concorrência não comprovadas |
| Emissão real SEFAZ HML | Não | — | Nenhum documento enviado nesta auditoria | Nenhuma transmissão | Não equivale ao histórico relatado pelo usuário nem à suíte local |

Uma bateria ampliada anterior apresentou 13 falhas, incluindo 10 na factory; no rerun focado atual, a factory passou 17/17. Essas 10 falhas não se reproduziram no estado verificado agora. As três falhas interestaduais permanecem reproduzíveis.

## Próximos passos recomendados

1. Corrigir a conversão para preservar `fiscalModel`/`lifecycleStage` e modelar os artefatos predecessores. Cancelamento/estorno exigem documento autorizado elegível; devolução exige circulação pelo fluxo comercial transacional.
2. Adicionar testes que convertam os oito presets e provem modelo, estado, dependências e vínculos. Tornar datas de agendamento relativas à execução ou rejeitar datas vencidas.
3. Ligar Playwright ao ID retornado pela factory e validar metadata/runId; falhar se não localizar exatamente essa fixture. Separar o spec sem transmissão do smoke test real, manual, visível, autorizado e reconciliável.
4. Comparar XML com preset/pedido/snapshot e validar campos fiscais relevantes, não somente `tpAmb`.
5. Alinhar `HML_RULESET_NOT_APPLICABLE` versus `HML_INTERSTATE_MATRIX_NOT_APPROVED`; atualizar documentação e script legado.
6. Só depois dos guards e da autorização aplicável, fazer integração remota pequena pelo helper e revisar a fixture pela UI. Não transmitir durante essa primeira validação.

## Escopo

Inspeção local de código, regras e documentação; execução somente de testes Vitest locais/mockados. Não houve navegador/login, leitura ou gravação no Supabase, criação de fixture remota, consulta/transmissão à SEFAZ ou alteração de código de produção. Este arquivo é o único artefato atualizado nesta rodada.
