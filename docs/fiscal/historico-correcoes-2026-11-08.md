# Histórico de correções fiscais — 08/11/2026

## Casos de devolução e estorno extraídos da suíte de cancelamento

**Motivo:** `cancelEndpoint.test.ts` agrupava a validação de cancelamentos de saída com cinco casos contíguos sobre elegibilidade de NF-e de devolução/estorno: vínculo ao pedido de devolução, bloqueio de vínculo comercial inválido, substituição fiscal ativa e restrição ao modelo 55. A extração é estrutural; não foi observada falha funcional.

**Alteração:** os cinco casos passaram para `erp/src/pages/utils/nfe/__tests__/cancelEndpointReturnReversalCases.ts`, registrados no mesmo ponto do `describe('API de cancelamento de NF-e')`. O spec proprietário fornece os mesmos `mocks`, `database`, `fiscalDocument`, `request` e `response`; títulos, assertions, ordem, setup `beforeEach` e mocks de módulo foram mantidos. Nenhum código de produção foi alterado.

**Arquivos:** `erp/src/pages/utils/nfe/__tests__/cancelEndpoint.test.ts`, novo `erp/src/pages/utils/nfe/__tests__/cancelEndpointReturnReversalCases.ts`, `docs/auditorias/inventario-arquivos-grandes.md`, este histórico e `docs/fiscal/README.md`.

**Linhas afetadas:** spec proprietário: import na linha 2 e registro na linha 406; helper: linhas 1–181; inventário: resumo nas linhas 6–7 e remoção da entrada do proprietário da tabela; índice fiscal: linha 8; este registro: linhas 3–13.

**Revisão e validação:** o bloco movido corresponde ao baseline do `HEAD` (171 linhas; SHA-256 `00A7992D06F3190A3B908F3D0830B1DEFCE997AF1FCC3E979034737B09CA04BD`), e o spec corresponde à transformação exata com a chamada substituindo o grupo e um import adicional. Foram revisados o handler `api/nfe/cancel.ts`, o preflight que valida pedido/documento, os três consumidores de `/api/nfe/cancel`, a configuração `src/**/*.test.{ts,tsx}` e o script fiscal que aponta para a pasta da suíte. O helper `.ts` não vira suíte autônoma. Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente. Não houve acesso ao banco, chamada externa ou emissão/transmissão fiscal.

## Elegibilidade de NFD/estorno extraída da suíte da API

**Motivo:** `orderCancellationPolicyEndpoint.test.ts` cobria duas responsabilidades de teste: elegibilidade somente leitura de documentos de operação NFD/estorno e contrato HTTP de pré-validação do endpoint. O grupo de elegibilidade é um limite coeso: exerce `evaluateOperationDocumentEligibility` diretamente, sem passar pelo handler, enquanto os testes restantes exercitam a API.

**Alteração:** movidas as seis declarações (14 cenários contando os `it.each`) para `erp/src/pages/utils/nfe/__tests__/operationDocumentEligibilityCases.ts`. O helper recebe os mesmos `document`, `orderId` e `query` do spec e registra o mesmo `describe` na posição original. Mocks, fixtures, testes HTTP, export e comportamento fiscal não foram alterados. O spec ficou com 499 linhas e o helper com 61.

**Arquivos:** `erp/src/pages/utils/nfe/__tests__/orderCancellationPolicyEndpoint.test.ts`, novo `erp/src/pages/utils/nfe/__tests__/operationDocumentEligibilityCases.ts`, `docs/auditorias/inventario-arquivos-grandes.md`, este histórico e `docs/fiscal/README.md`.

**Linhas afetadas:** spec proprietário: import na linha 2 e registro na linha 33; helper: linhas 1–61; inventário: resumo nas linhas 6–7 e remoção da entrada do proprietário da tabela; índice fiscal: linha 8; este registro: linhas 3–13.

**Revisão e validação:** o corpo movido corresponde ao baseline do `HEAD` com SHA-256 `62C6F74FF2F8122C2CFFEBFDB64570EFED69C98326A982089032FD14CC14825C`; o proprietário corresponde exatamente à transformação do baseline com somente a chamada no lugar do grupo e um import novo. Foram conferidos os consumidores da API, os imports do helper e a descoberta Vitest `src/**/*.test.{ts,tsx}`; o helper `.ts` sem sufixo `.test` não constitui suíte autônoma. Inventário reconciliado em 41 arquivos TypeScript acima de 500 linhas. Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente. Não houve acesso ao banco, chamada externa ou emissão/transmissão fiscal.

## Preparação de emissão incerta extraída da suíte

**Causa:** `normalOutboundEmission.test.ts` reunia a orquestração de emissão com cinco declarações de teste contíguas (uma parametrizada) sobre contenção na preparação, conclusão após o prazo, timeout de consulta somente leitura, resposta perdida e falha de rede com resultado desconhecido. A extração é estrutural; não havia falha funcional observada.

**Refatoração:** as cinco declarações passaram para `normalOutboundPreparationUncertaintyCases.ts`. `registerNormalOutboundPreparationUncertaintyCases({ mocks })` é chamado no ponto original, diretamente dentro do mesmo `describe` raiz. As fixtures de pedido/banco e o mock SOAP continuam compartilhados pelo harness e pelo `vi.hoisted` do spec; os hooks `beforeEach`/`afterEach` e os mocks de módulo permanecem no proprietário.

**Arquivos:** `erp/src/pages/utils/nfe/__tests__/normalOutboundEmission.test.ts` (461 linhas), novo `erp/src/pages/utils/nfe/__tests__/normalOutboundPreparationUncertaintyCases.ts` (118 linhas), `docs/auditorias/inventario-arquivos-grandes.md`, este histórico e `docs/fiscal/README.md`.

**Revisão e validação:** o bloco movido (95 linhas) é idêntico ao `HEAD`, com SHA-256 `42E461FB8D1DC23F92B2FB3F2A59B4979C88E83985299FF39A23587D9B05B414`; o proprietário foi comparado à transformação exata do baseline. A chamada continua na mesma posição do `describe` e sob o mesmo setup/hook; a descoberta Vitest usa `src/**/*.test.{ts,tsx}`, de modo que o helper não se torna uma suíte autônoma. Imports de timeout/status acompanharam as declarações; os módulos de emissão e o harness não foram alterados. Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente. Não houve acesso ao banco, chamada externa ou emissão/transmissão fiscal.

## Geração de HTML DANFE extraída para helper da suíte

**Causa:** `danfeGeneratorModules.test.ts` reunia casos dos submódulos de layout e um grupo coeso de quinze declarações sobre o HTML gerado, XML autorizado e impressão NFC-e A4. A separação é estrutural; não havia falha funcional observada.

**Refatoração:** o `describe('generateDanfeHtml')` passou para `danfeGeneratorHtmlCases.ts`. O proprietário chama `registerDanfeGeneratorHtmlCases()` no ponto original, dentro do mesmo `describe` raiz. Os fixtures permanecem criados no proprietário e são passados ao helper; títulos, assertions, chamadas e ordem dos casos foram preservados.

**Arquivos:** `erp/src/pages/utils/nfe/__tests__/danfeGeneratorModules.test.ts` (199 linhas), novo `erp/src/pages/utils/nfe/__tests__/danfeGeneratorHtmlCases.ts` (369 linhas), `docs/auditorias/inventario-arquivos-grandes.md`, este histórico e `docs/fiscal/README.md`.

**Revisão e validação:** o grupo movido corresponde ao baseline com SHA-256 `CAD9DE66E7D2F07961C8FAA28671E38F09E8E7FE58693C8713F0FE252466CC3E` após normalizar finais de linha; o proprietário corresponde à transformação exata do baseline após trocar apenas o grupo pela chamada e remover os imports usados exclusivamente por ele. O script `test:fiscal:danfe` mantém o caminho do proprietário; Vitest descobre `.test.ts(x)`, e o helper não é uma suíte autônoma. As dependências de geração, parsing, chave e layout não foram alteradas. Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente. Não houve acesso ao banco, chamada externa ou emissão/transmissão fiscal.

## Casos de fronteira de transporte fiscal extraídos da suíte

**Causa:** `transportFiscalRules.test.ts` reunia quinze cenários de transporte e transportador com um grupo coeso sobre a fronteira entre o comando de emissão, a resolução do documento e os dados serializados. Não havia falha funcional observada; a separação melhora a coesão da suíte sem modificar comportamento fiscal.

**Refatoração:** os casos 12–14 — rejeição de combinações incoerentes no comando, XML de retirada com modalidade 4 e descarte de dados residuais com transporte desligado — foram movidos para `transportFiscalBoundaryCases.ts`. O spec chama `registerTransportFiscalBoundaryCases(makeFacts)` no ponto original dentro do mesmo `describe`. A factory existente é recebida como argumento; os hooks de `fetch`, os casos 1–11 e o caso 15 continuam no spec proprietário.

**Arquivos:** `erp/src/pages/utils/nfe/__tests__/transportFiscalRules.test.ts` (475 linhas), novo `erp/src/pages/utils/nfe/__tests__/transportFiscalBoundaryCases.ts` (106 linhas), `docs/auditorias/inventario-arquivos-grandes.md`, este histórico e `docs/fiscal/README.md`.

**Revisão e validação:** os corpos e títulos extraídos foram comparados ao `HEAD` após remover apenas a linha vazia que separava os casos 14 e 15. A sequência 12, 13 e 14 continua entre os mesmos casos 11 e 15; o import de `parseFiscalEmissionCommand` passou a ser consumido pelo helper, e a API dos módulos de produção não mudou. A configuração Vitest descobre `src/**/*.test.{ts,tsx}`; o helper não é executado como suíte autônoma. Os módulos de regra, parser, serialização, chave e fixture estão sem diff próprio. Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente. Não houve acesso a banco, chamada externa ou transmissão fiscal.

## Serialização de IE extraída da suíte de destinatário fiscal

**Causa:** `fiscalRecipientIe.test.ts` combinava casos de validação da inscrição estadual, construção do bloco XML do destinatário e serialização fiscal final. O último `describe` tinha fixtures próprias para verificar a presença/ausência de `<IE>` no XML de NF-e 55 e NFC-e 65, constituindo uma unidade de responsabilidade distinta. Não foi observada falha funcional.

**Refatoração:** o `describe('fiscalXmlSerializer (Backend XML output)')`, incluindo quatro casos e suas fixtures, foi movido para `fiscalRecipientIeSerializerCases.ts`. `registerFiscalXmlSerializerCases()` é chamado na posição original dentro do `describe` pai. A validação do destinatário e a construção via `buildDestXml` continuam no spec.

**Arquivos:** `erp/src/pages/utils/nfe/__tests__/fiscalRecipientIe.test.ts` (251 linhas), novo `erp/src/pages/utils/nfe/__tests__/fiscalRecipientIeSerializerCases.ts` (283 linhas), `docs/auditorias/inventario-arquivos-grandes.md`, este histórico e `docs/fiscal/README.md`.

**Revisão e validação:** as 270 linhas do grupo movido são idênticas ao `HEAD`; os 16 registros de teste e sua ordem geral foram comparados antes/depois. O spec não tinha exports públicos; os imports usados apenas pela serialização acompanham o grupo. A configuração Vitest descobre `src/**/*.test.{ts,tsx}`; o helper não se torna uma suíte separada e é importado somente pelo proprietário. Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente. Não houve acesso a banco, chamada externa ou transmissão fiscal.

## Apresentação integral de NF-e 55 extraída da suíte

**Causa:** `issuedFiscalDocumentDetailsModal.test.tsx` concentrava no proprietário o cenário longo que percorre as seis abas de uma NF-e 55, enquanto os demais casos cobrem interações menores e outros tipos/estados do modal. A extração é apenas estrutural; não havia falha funcional observada.

**Refatoração:** o caso completo foi movido para `issuedFiscalDocumentFullNfeDetailsCase.tsx`. `registerIssuedFiscalDocumentFullNfeDetailsCase()` permanece registrado na mesma posição dentro de `describe('IssuedFiscalDocumentDetailsModal')`, preservando o título da suíte, ordem relativa, fixture local, mocks, sequência de cliques e asserções — inclusive a exibição do evento histórico já coberto.

**Arquivos:** `erp/src/pages/App/FiscalDocuments/__tests__/issuedFiscalDocumentDetailsModal.test.tsx` (563 linhas), novo `erp/src/pages/App/FiscalDocuments/__tests__/issuedFiscalDocumentFullNfeDetailsCase.tsx` (226 linhas), `docs/auditorias/inventario-arquivos-grandes.md`, este histórico e `docs/fiscal/README.md`.

**Revisão e validação:** o corpo extraído corresponde ao `HEAD` com SHA-256 `715372EB0402FD5F772A09E527B6C40FF9B0D930FE6242DD34BE2CA2ECA4EAEF`; o proprietário corresponde ao baseline após substituir apenas o caso pela chamada e adicionar o import. `vi.mock` e `afterEach` continuam no spec e o helper registra o teste nesse contexto. A configuração Vitest inclui o spec `*.test.tsx`; o helper não é executado como suíte independente. A API do componente, a rota consumidora e os módulos de serviço permanecem sem alteração. Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente. Não houve acesso ao banco, chamada externa ou emissão/transmissão fiscal.

## Casos de taxas da venda normal extraídos da suíte HML

**Causa:** `hmlNormalSaleRuleSet.test.ts` acumulava oito declarações (11 cenários com o `it.each` de modelo/ambiente) sobre cálculo, rateio, reconciliação, bloqueio e serialização das taxas junto aos testes de parcelas e demais responsabilidades da política de venda normal. O bloco coeso de cobrança foi separado sem alteração de regra fiscal.

**Refatoração:** os casos passaram para `erp/src/pages/utils/nfe/__tests__/hmlNormalSalePaymentFeeCases.ts`. O proprietário chama `registerHmlNormalSalePaymentFeeCases({ makeFacts })` no ponto original, logo após os mesmos hooks de stub/restore de `fetch` e dentro do mesmo `describe`. A factory existente é recebida como dependência; os demais casos e a fixture permanecem no spec.

**Arquivos:** `erp/src/pages/utils/nfe/__tests__/hmlNormalSaleRuleSet.test.ts` (744 linhas), novo `erp/src/pages/utils/nfe/__tests__/hmlNormalSalePaymentFeeCases.ts` (222 linhas), `docs/auditorias/inventario-arquivos-grandes.md`, este histórico e `docs/fiscal/README.md`.

**Revisão e validação:** as 204 linhas movidas correspondem ao baseline limpo do `HEAD` (SHA-256 `E5060AD53AE67F2DD9C93DCEF05F079AE42D5E4FF6FA58C61E083160B509F487`); o proprietário corresponde à transformação exata do baseline após trocar apenas o grupo pelo registro, adicionar o import e remover o import do auditor comercial usado somente pelos casos extraídos. Títulos, assertions, ordem e factory foram preservados. Os módulos de política HML/venda normal e os exports usados foram revisados. `erp/vitest.config.ts` descobre `src/**/*.test.{ts,tsx}` e `test:fiscal:unit` aponta para a pasta; o helper não termina em `.test.ts(x)` e só é registrado pelo proprietário. A contagem física e o catálogo seguem reconciliados em 40 arquivos acima de 500 linhas; o proprietário ficou com 744 e o helper com 222. Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente. Não houve acesso ao banco, chamada externa ou transmissão fiscal.

## Apresentação da sugestão de NCM extraída para componente próprio

**Causa:** `ProductFormFiscalTab.tsx` reunia a apresentação da sugestão assistida de NCM inline com a coordenação do formulário fiscal. Não foi observada falha funcional; a extração separa uma unidade de apresentação, mantendo a aba como proprietária da condição que decide quando exibi-la.

**Refatoração:** as 29 linhas de JSX da sugestão passaram para `ProductFormNcmSuggestion.tsx`. A condição `ncmSuggestion && !fiscal.ncm`, os dados, os callbacks e a ordem no formulário permanecem na aba. O componente usa a mesma folha de estilos, e a API pública de `ProductFormFiscalTab` continua igual.

**Arquivos:** `mobile/src/features/products/modals/tabs/ProductFormFiscalTab.tsx` (600 linhas), novo `mobile/src/features/products/modals/tabs/ProductFormNcmSuggestion.tsx` (47 linhas), `docs/auditorias/inventario-arquivos-grandes.md`, este histórico e `docs/fiscal/README.md`.

**Linhas afetadas:** `ProductFormFiscalTab.tsx`: 32, 266–274; `ProductFormNcmSuggestion.tsx`: 1–47; inventário: 6–7 e 656; índice fiscal: 8; este registro: 87–97.

**Revisão e validação:** após normalizar a indentação e adaptar apenas as referências aos props, o JSX extraído corresponde ao bloco do baseline (SHA-256 `73E042CB0BC1F89DBCD374FEC1861209F4C9A8DBF11662140FFD0E36874EA5DB`); o arquivo proprietário foi comparado à transformação exata do baseline com import novo e substituição do bloco pela mesma condição mais o componente. Props públicos e os chamadores existentes permanecem; o chamador em `ProductFormScreen.tsx` tem diff local de extração do cabeçalho, mas sua chamada fiscal não foi alterada. Consulta, filtros, permissões e lógica fiscal não foram modificados. Nenhum teste, build ou typecheck executado; validação dinâmica pendente. Nenhum banco, chamada externa ou transmissão foi acessado.

## Controles de prévia do DANFE NFC-e extraídos do stylesheet

**Causa:** `danfeNfceA4Styles.ts` mantinha no stylesheet principal tanto as regras de layout do documento A4 quanto as regras dos controles da prévia na tela (barra sem impressão, botões e identificadores de ambiente). É uma separação estrutural; não foi observada falha de renderização.

**Refatoração:** as 73 linhas de CSS dos controles de prévia passaram para `danfeNfceA4ChromeStyles.ts`. O export público `DANFE_NFCE_A4_STYLES` segue como fachada; o ponto de composição, a ordem do CSS e as regras de impressão permanecem no proprietário.

**Arquivos:** `erp/src/pages/utils/nfe/danfe/danfeNfceA4Styles.ts` (617 linhas), novo `erp/src/pages/utils/nfe/danfe/danfeNfceA4ChromeStyles.ts` (74 linhas), `danfeNfceA4.ts` e `danfe/index.ts` (chamador e reexport conferidos, sem alteração), inventário, este histórico e `docs/fiscal/README.md`.

**Linhas afetadas:** proprietário: 1 e 21; novo módulo: 1–74; inventário: 6–7 e 638; índice: 8; este registro: 99–109.

**Revisão e validação:** as 73 linhas de CSS extraídas correspondem ao baseline (SHA-256 `057C1542D725FFEF9CB8624A9E75FCC11040205A98AAE97ECBB52C365726D2F4`); ao expandir a interpolação, a string completa de `DANFE_NFCE_A4_STYLES` ficou idêntica ao baseline. O proprietário é exatamente a transformação esperada com um import e a interpolação no ponto original; o export consumido por `danfeNfceA4.ts` e a exportação pública pelo índice permanecem iguais. Nenhum teste, build ou typecheck foi executado; validação visual/dinâmica de impressão pendente. Nenhum banco, chamada externa ou emissão/transmissão fiscal foi acessado.

## Reconciliação da preparação e retomada da intenção extraídas da suíte

**Causa:** `nfeServiceServerBoundary.test.ts` reunia cinco casos contíguos sobre localizar o documento pela intenção original, reconciliar uma preparação ausente/inválida e retomar a mesma intenção após resposta incerta, junto aos outros contratos da fronteira do serviço. Não foi observada falha funcional; a mudança é estrutural.

**Refatoração:** os cinco casos passaram para `nfeServiceServerBoundaryPreparationRecoveryCases.ts`. O spec chama `registerNfeServiceServerBoundaryPreparationRecoveryCases(mocks)` no mesmo ponto do `describe('emissão NF-e no ERP')`, antes dos mesmos hooks. Os testes continuam registrados sob o mesmo título de suíte, com seus imports dinâmicos, mocks, ordem e assertions originais.

**Arquivos:** `erp/src/pages/utils/nfe/__tests__/nfeServiceServerBoundary.test.ts` (583 linhas), novo `erp/src/pages/utils/nfe/__tests__/nfeServiceServerBoundaryPreparationRecoveryCases.ts` (166 linhas), `docs/auditorias/inventario-arquivos-grandes.md`, este histórico e `docs/fiscal/README.md`.

**Linhas afetadas:** spec: 2 e 241; novo helper: 1–166; inventário: 6–7 e 662; índice: 8; este registro: 111–121.

**Revisão e validação:** o bloco extraído tem 159 linhas e corresponde ao baseline (`HEAD`) com SHA-256 `9D7B655FD11CDFE743C9489D720CBD1E31CE74483D512E70490E228EC2FBB884`; o proprietário é a transformação exata do baseline após adicionar um import e substituir o bloco pela chamada no ponto original. A contagem estática conserva 25 declarações de teste entre proprietário e helper. Os módulos `nfeService.ts`, `nfeReconciliationService.ts`, a configuração Vitest e o chamador de registro foram conferidos; o helper não termina em `*.test.ts(x)` e não é descoberto como suíte independente. Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente. Não houve acesso ao banco, chamada externa ou emissão/transmissão fiscal.

## Confirmação de Produção extraída da suíte de transmissão de rascunhos

**Causa:** `transmitOperationDraft.test.ts` mantinha próximos dois grupos de casos que verificam a fronteira entre transmissão de rascunho `ready` em Produção (que exige confirmação explícita) e consulta de tentativa `unknown`/`transmitting` (que não envia confirmação de transmissão). Não foi observada falha funcional; a extração é estrutural.

**Refatoração:** os grupos parametrizados passaram para `transmitOperationDraftProductionConfirmationCases.ts`. O spec chama o helper após os mesmos hooks e antes do próximo caso, mantendo o mesmo `describe`, títulos, dados, mocks, fábricas, ordem e assertions.

**Arquivos:** `erp/src/pages/utils/nfe/__tests__/transmitOperationDraft.test.ts` (1403 linhas), novo `erp/src/pages/utils/nfe/__tests__/transmitOperationDraftProductionConfirmationCases.ts` (57 linhas), `docs/auditorias/inventario-arquivos-grandes.md`, este histórico e `docs/fiscal/README.md`.

**Linhas afetadas:** spec: 2 e 439; helper: 1–57; inventário: 6–7 e 644; índice: 8; este registro: 123–133.

**Revisão e validação:** o bloco de 41 linhas corresponde ao baseline (`HEAD`) com SHA-256 `70692CDE85B90A611C06268B5B9C827DA27D1442F16F3FFE625C42023BF1F9BB`; o proprietário é a transformação exata do baseline após adicionar um import e registrar o helper no lugar original. A contagem estática mantém 38 declarações entre spec e helper e quatro execuções parametrizadas no grupo movido. O handler `api/nfe/transmit-operation-draft.ts`, a configuração Vitest e a referência de registro foram conferidos; a descoberta continua no spec `*.test.ts`, e o helper não vira suíte independente. Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente. Não houve acesso ao banco, chamada externa ou emissão/transmissão fiscal.

## Escolha de ambiente fiscal extraída da suíte de emissão

**Causa:** `useNfeEmission.test.tsx` reunia os cenários de escolha e inicialização do ambiente de emissão junto aos testes do hook e dos formulários. Os cinco casos formam uma unidade coesa: bloqueio de Homologação já emitida, entrada em Produção, reemissão HML vinculada, disponibilidade de Produção quando existe apenas NFC-e HML e ambiente inicial do formulário. A extração é estrutural; não foi observada falha funcional.

**Refatoração:** os cinco casos contíguos passaram para `useNfeEmissionEnvironmentChoiceCases.tsx`. O spec chama `registerNfeEmissionEnvironmentChoiceCases({ mocks, order })` na posição original, sob o mesmo `describe` e depois dos mesmos hooks. O helper importa os mesmos componentes e o serviço mockado; a fixture `order` e o objeto `mocks` são passados pelo proprietário.

**Arquivos:** `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/useNfeEmission.test.tsx` (2291 linhas), novo `erp/src/pages/App/SalesOrder/OrderActions/nfe-modal/useNfeEmissionEnvironmentChoiceCases.tsx` (139 linhas), `docs/auditorias/inventario-arquivos-grandes.md` e este histórico/índice.

**Linhas afetadas:** spec: import do helper na linha 19 e registro na linha 2195; novo helper: 1–139; inventário: 6–7 e linha 638; índice fiscal: linha 8; este registro: 135–145.

**Revisão estática:** o bloco de 130 linhas corresponde ao baseline (`HEAD`) com SHA-256 `A8568BEC63793C4BB86FF85CF194803CE182C8D9EDB0E2A3C8949C975F4A461A`; o proprietário corresponde exatamente ao baseline após substituir o bloco pela chamada, adicionar o import do helper e transferir para ele o import de `NfeEnvironmentChoiceModal`. Os cinco títulos, fixtures locais, chamadas mockadas, assertions e ordem foram preservados. O helper tem um export consumido apenas pelo spec. `fetchOrderFiscalBadgeStatuses` continua importado no spec para o hook `beforeEach`, e seu módulo mantém o mock global aplicado ao helper. O config Vitest inclui `src/**/*.test.{ts,tsx}`; o helper não tem sufixo `.test` e não é descoberto como suíte separada. Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente. Não houve acesso ao banco, chamada externa ou emissão/transmissão fiscal.

## Recuperação de tentativa HML extraída da suíte técnica de emissão

**Causa:** `hmlTechnicalEmission.test.ts` mantinha junto aos outros casos do pipeline três declarações contíguas sobre localizar uma tentativa ativa com outra intenção, classificar conflito de snapshot e manter a trava diante de consultas inconclusivas da SEFAZ. A responsabilidade comum é a recuperação/reconciliação da mesma tentativa HML; a extração é estrutural e não foi observada falha funcional.

**Refatoração:** as três declarações passaram para `hmlTechnicalEmissionAttemptRecoveryCases.ts`. O spec chama `registerHmlTechnicalEmissionAttemptRecoveryCases({ mocks, database, command, candidate })` no ponto original, dentro do mesmo `describe` e antes das mesmas declarações de hooks. O helper recebe as referências do mesmo mock, factory de banco e fixtures compartilhadas.

**Arquivos:** `erp/src/pages/utils/nfe/__tests__/hmlTechnicalEmission.test.ts` (1137 linhas), novo `erp/src/pages/utils/nfe/__tests__/hmlTechnicalEmissionAttemptRecoveryCases.ts` (105 linhas), inventário, este histórico e `docs/fiscal/README.md`. A implementação em `api/nfe/emitHmlTechnical.ts` e seus exports não foi alterada.

**Linhas afetadas:** spec: import na linha 14 e registro na linha 245; helper: 1–105; inventário: 6–7 e linha 652; índice fiscal: linha 8; este registro: 147–157.

**Revisão estática:** o bloco de 89 linhas corresponde ao baseline (`HEAD`) com SHA-256 `7F2193B5FC17E9F6C1660D83FB74A2F9EA420381FE3CA75C2A220418F322AC43`; o proprietário foi comparado à transformação exata do baseline com o import e a chamada no ponto original. Os títulos, resultados parametrizados, argumentos, mocks, ordem e assertions permanecem. O helper importa os mesmos exports do módulo fiscal; o spec mantém os `vi.mock` hoisted, fixture/factory e hooks aplicados à chamada do helper. O Vitest inclui `src/**/*.test.{ts,tsx}`; o helper não tem sufixo `.test` e não é descoberto como suíte separada. Nenhum teste, build ou typecheck executado; validação dinâmica pendente. Não houve acesso ao banco, chamada externa ou emissão/transmissão fiscal.

## Integração de FiscalContext até XML na matriz interestadual

**Causa:** `interstateOutboundFiscalMatrix.test.ts` combinava muitos contratos unitários da matriz com um cenário de integração que percorre o `FiscalContext`, a decisão de modelo, a seleção de uma regra sintética e a serialização XML. A distinção de responsabilidade é demonstrável pelo fluxo completo e pelos imports usados somente nesse caso; não foi observada falha funcional.

**Refatoração:** o único cenário passou para `interstateOutboundFiscalMatrixFiscalContextXmlCase.ts`. O spec chama `registerInterstateOutboundFiscalMatrixFiscalContextXmlCase({ facts, completeRule })` na posição original, ao final do mesmo `describe`. O helper importa os mesmos módulos de montagem/serialização e recebe os dois valores compartilhados do proprietário.

**Arquivos:** `erp/src/pages/utils/nfe/__tests__/interstateOutboundFiscalMatrix.test.ts` (732 linhas), novo `erp/src/pages/utils/nfe/__tests__/interstateOutboundFiscalMatrixFiscalContextXmlCase.ts` (151 linhas), inventário, este histórico e `docs/fiscal/README.md`. Nenhuma implementação, export ou contrato de runtime foi alterado.

**Linhas afetadas:** spec: imports redistribuídos nas linhas 2–15 e registro na linha 731; helper: 1–151; inventário: resumo nas linhas 6–7 e entrada na linha 659; índice fiscal: linha 8; este registro: linhas 159–169.

**Revisão estática:** as 125 linhas do cenário correspondem literalmente ao baseline (`HEAD`), SHA-256 `7013EF71D8F85DDDAFECCC42AC309B69DDFF7803BFF85C59DDC032D38CFFE0E2`; a inspeção do diff confirmou apenas o movimento desse bloco, a redistribuição de imports e a chamada no mesmo ponto. As 35 declarações de teste, seus dados e a ordem foram preservados. O `vitest.config.ts` descobre `*.test.ts` e não executa o helper como suíte separada. Nenhum teste, build ou typecheck executado; validação dinâmica pendente. Não houve banco, chamada externa nem transmissão SEFAZ.

## Auditoria operacional fiscal extraída do coordenador de diagnósticos

**Causa:** `scripts/testing/fiscal-audit.ts` combinava a coleta read-only de evidências operacionais de um documento fiscal existente com a orquestração de vários modos de diagnóstico. A separação é estrutural; não foi observada falha funcional.

**Refatoração:** o corpo do modo `operational` passou para `scripts/testing/fiscal-audit/operationalEvidence.ts`. O coordenador importa `runOperationalAudit` e delega a mesma raiz no mesmo ramo. O wrapper continua compilando o mesmo entrypoint e enviando o mesmo modo.

**Arquivos:** `scripts/testing/fiscal-audit.ts` (496 linhas), novo `scripts/testing/fiscal-audit/operationalEvidence.ts` (23 linhas), `docs/auditorias/inventario-arquivos-grandes.md`, este histórico e `docs/fiscal/README.md`. `scripts/testing/run-fiscal-audit.cjs` e `scripts/testing/nfe-operational-audit.cjs` foram lidos para confirmar o despacho e o limite read-only, mas não foram alterados.

**Linhas afetadas:** coordenador: import na linha 18 e delegação nas linhas 88–89; helper: linhas 1–23; inventário: resumo na linha 6 e remoção da entrada acima do limite na tabela; índice fiscal: linha 8; este registro: linhas 171–181.

**Revisão estática:** o bloco operacional corresponde exatamente ao baseline (`HEAD`) após remover somente dois espaços de indentação, SHA-256 `D2CA6F869A34F6B38FDE0CFB28750DC6B4B02D79CD23AB9BFC1F1D61C20F1C60`. Permanecem a mesma guarda de projeto e ambiente, configuração do cliente, seleção do documento e snapshot, captura da ordem operacional, hashes, campos e saída JSON. O único consumidor do helper é o ramo `operational`; o modo e os argumentos do wrapper não mudaram. A contagem física ficou em 39 arquivos `.ts`/`.tsx` acima de 500 linhas, sem ausências, sobras ou divergências com a tabela. Nenhum teste, build, typecheck ou auditoria foi executado; validação dinâmica pendente. Não houve acesso ao banco, chamada externa ou transmissão fiscal.

## Resolução do CNPJ do emitente extraída do sincronizador DF-e

**Causa:** `supabase/functions/sefaz-inbound-sync/index.ts` misturava a escolha do CNPJ solicitado, o fallback para `SEFAZ_CNPJ` e a consulta de `settings.data.companyCnpj` com a coordenação dos demais passos da sincronização. A extração é estrutural; não foi observada falha funcional.

**Refatoração:** `resolveCompanyCnpj` encapsula a mesma precedência, consulta somente `settings.data`, normaliza para dígitos e mantém a mesma falha quando nenhum CNPJ está configurado. O entry point repassa o cliente, o valor solicitado e a variável de ambiente no local original; os consumidores seguintes continuam recebendo o mesmo CNPJ normalizado.

**Arquivos:** `supabase/functions/sefaz-inbound-sync/index.ts` (501 linhas), novo `supabase/functions/sefaz-inbound-sync/utils/resolveCompanyCnpj.ts` (28 linhas), inventário, este histórico e `docs/fiscal/README.md`. `utils/nsuRecovery.ts`, `utils/syncStatusPayload.ts`, `supabase/config.toml` e o entry point foram revisados para confirmar convenção, ownership e referências; somente os dois módulos citados e a documentação foram alterados.

**Linhas afetadas:** sincronizador: import na linha 9 e chamada nas linhas 74–79; helper: linhas 1–28; inventário: resumo na linha 6 e catálogo na linha 686; índice fiscal: linha 8; este registro: linhas 183–193.

**Revisão estática:** o proprietário corresponde exatamente ao baseline (`HEAD`) após adicionar o import e substituir o bloco pela chamada no mesmo ponto. O corpo extraído preserva o valor pedido → `SEFAZ_CNPJ` → `settings.data.companyCnpj`, o `select("data")`, o tratamento do erro de consulta, a remoção de caracteres não numéricos e a mensagem de CNPJ ausente; comparação transformada do helper: SHA-256 `E2542FC287E6700A6B1BB39B89C17971ADABA275513CE5199CF78555C7EB2414`. O helper possui um export, consumido somente pelo entry point. A varredura e o catálogo reconciliaram 39 arquivos acima de 500 linhas, sem ausências, sobras ou contagens divergentes. Nenhum teste, build ou typecheck foi executado; validação dinâmica pendente. Nenhuma chamada remota, transmissão SEFAZ, escrita, migration ou deploy foi realizada.

## Invariante Fiscal: Bloqueio de cancelamento comercial de pedido com NF-e ativa na SEFAZ via Assistente IA

**Causa:** Na auditoria de ferramentas do assistente de IA (`updateOrderOperationForAgent`), verificou-se a possibilidade de cancelamento de pedido comercial (`status: 'cancelled'`) mesmo quando já existisse NF-e autorizada/homologada na SEFAZ para o pedido, violando o Invariante de Confiabilidade Fiscal (`FISCAL-003` e diretrizes de integridade documental de `AGENTS.md`).

**Correção:** Implementada validação obrigatória em `shared-utils/agentOrderAndPeopleOperations.ts`: antes de permitir `nextStatus === 'cancelled'`, o sistema consulta a tabela `nfe_documents` filtrando por `order_id` e status em `('autorizada', 'homologada', 'processando')`. Caso exista documento fiscal ativo, a operação é rejeitada com erro explícito informando o número e a chave da NF-e e orientando a realização prévia do cancelamento fiscal ou estorno na SEFAZ antes do cancelamento comercial. Não há oferta nem menção a CC-e, em conformidade com a política obrigatória de produto.

**Arquivos:** `shared-utils/agentOrderAndPeopleOperations.ts`, `erp/src/services/aiAgent/__tests__/agentExtendedToolsAndPermissions.test.ts`, este histórico e `docs/fiscal/README.md`.

**Validação e Testes:** Testado via Vitest em `erp/src/services/aiAgent/__tests__/agentExtendedToolsAndPermissions.test.ts` (`bloqueia cancelamento comercial quando houver NF-e ativa na SEFAZ (Invariante Fiscal)`), comprovando o bloqueio seguro e a rejeição com mensagem explicativa. 111 testes automatizados aprovados na suíte de IA.

## Concorrência Distribuída, Fila de Mensagens Pendentes e Idempotência de Despacho no Agente WhatsApp (Lizandro)

**Causa:** Travas puramente em memória (`isConversationTurnInFlight`) não garantiam exclusividade em múltiplas instâncias serverless na Vercel, permitindo processamento concorrente da mesma conversa. Além disso, mensagens recebidas durante a geração de uma resposta ficavam sem resposta na fila, e falhas de rede no envio à Meta podiam causar retransmissões cegas com duplicidade.

**Correção:**
1. **Trava Atômica Distribuída no PostgreSQL:** Criação da tabela `whatsapp_ai_agent_turns` com índice único condicional (`WHERE status = 'in_flight'`) e RPC `customer_support_acquire_ai_turn`. Garante fisicamente no banco que apenas uma execução por conversa produza respostas ativas, recuperando automaticamente travas abandonadas (leasetime expirado).
2. **Fila e Agrupamento de Mensagens Pendentes:** Na RPC `customer_support_complete_ai_turn`, o banco verifica atomicamente se novas mensagens do cliente chegaram após o instante de aquisição do turno (`timestamp > acquired_at`). O orquestrador detecta `has_pending: true`, agrupa as perguntas em sequência e aciona imediatamente o próximo turno com teto de proteção contra loops (máximo 3 turnos encadeados).
3. **Idempotência Estrita de Despacho Outbound:** Criação da tabela `whatsapp_ai_dispatches` e RPCs `customer_support_prepare_ai_dispatch` e `customer_support_record_ai_dispatch_outcome`. Respostas planejadas recebem chave única determinística; caso ocorra timeout ou erro de rede durante a chamada à Meta Graph API, o estado é registrado como `uncertain`, bloqueando retransmissões cegas (`outcome_uncertain_no_blind_retry`).
4. **Revalidação Atômica de Transferência Humana:** Antes do envio da mensagem à Meta API, o estado da conversa é revalidado no PostgreSQL. Atribuições manuais a atendentes (`assigned_to`) ou marcadores `atendimento_humano` abortam o envio pendente.
5. **Classificação e Controle de Custos:** `classifyAiModelError` categoriza esgotamento financeiro (`quota_exhausted`), rate limit temporário por minuto (`rate_limit_exceeded`), indisponibilidade do provedor (`provider_outage`), timeout e falhas de autenticação, registrando `model_requested`, `model_effective` e `fallback_reason`.

**Arquivos:** `supabase/migrations/20261109010000_customer_support_ai_agent_concurrency.sql`, `erp/src/pages/utils/customerSupport/whatsappAiAgent/whatsappAiAgentSecurity.ts`, `erp/src/pages/utils/customerSupport/whatsappAiAgent/whatsappAiModelRunner.ts`, `erp/src/pages/utils/customerSupport/whatsappAiAgent/whatsappAiAgentDispatcher.ts`, `erp/src/pages/utils/customerSupport/whatsappAiAgent/whatsappAiAgentOrchestrator.ts`, `erp/src/pages/App/CustomerSupport/__tests__/whatsappAiAgentConcurrency.test.ts`.

**Validação e Testes:** Migration aplicada ao Supabase operacional (`hkoxhourxwlddgsfdgws`). 6 cenários de concorrência e idempotência validados em `whatsappAiAgentConcurrency.test.ts`; 113 testes aprovados em 10 suítes de teste de atendimento e IA.
