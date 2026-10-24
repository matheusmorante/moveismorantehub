# Histórico de correções fiscais — 23/10/2026

Este registro complementa o índice de vigência. As primeiras seções descrevem o fluxo atual de Ciência automática e recuperação de lacunas da distribuição. As seções seguintes preservam etapas anteriores e devem ser lidas como histórico quando substituídas pelo índice vigente. Nenhuma transmissão fiscal foi executada durante estas correções.

## Status de NF-e resumo e orientação de consulta no Portal

> Esta versão inicial usava o rótulo expansível “XML PENDENTE”. Depois foi substituída por um aviso e ação na linha; a apresentação atual é o modal centralizado descrito mais abaixo.

### Problema e sintomas

Notas recebidas somente como `resNFe` apareciam com zero itens, sem explicar a diferença entre consultar a situação pela chave no Portal da SEFAZ e obter o XML completo.

### Causa raiz

O resumo realmente não contém os itens. A consulta pública por chave exibe dados e situação da NF-e, mas não equivale à obtenção do XML completo pelo destinatário, que depende de manifestação aceita. As telas não distinguiam esses dois resultados.

### Arquivos e linhas

- `shared-utils/inboundSummaryHelp.ts:1-2` — centraliza a orientação sobre resumo, consulta pública, manifestação e XML.
- `erp/src/pages/App/Stock/InboundInvoices/components/InboundInvoicesTable.tsx:151-157,253-259` e `erp/src/pages/App/Stock/InboundInvoices/components/SummaryXmlStatusBadge.tsx:1-38` — identifica o resumo e abre a explicação por clique, mantendo-a também no atributo de ajuda ao passar o mouse.
- `erp/src/pages/App/Stock/InboundInvoices/modals/InboundInvoiceDetailsModal.tsx:38,133-136` — apresenta a mesma orientação quando o resumo não tem itens.
- `mobile/src/features/stock/invoices/components/invoice-card/InvoiceCardContent.tsx:1-4,20-21,59-117,241-273` — replica o rótulo e a explicação expansível por toque no app.
- `mobile/src/features/stock/invoices/modals/invoice-details/InvoiceDetailsItemsSection.tsx:1-3,23-26` — apresenta a mesma orientação na lista de itens vazia.
- `docs/fiscal/README.md:483` e este histórico — mantêm a referência fiscal vigente.

### Solução e validação

Na primeira versão, as notas `resNFe` exibiam `RESUMO • SEFAZ` e `XML PENDENTE`, com ajuda expansível no ERP e no app móvel. Essa apresentação foi substituída pelas versões intermediária e atual registradas abaixo. A ajuda explicava que a chave permite consulta pública da situação, mas não baixa o XML integral; a obtenção como destinatário requer manifestação aceita com certificado digital. Ciência não confirma a compra e pode ser rejeitada após o prazo de 10 dias (cStat 596).

Referências oficiais: [Perguntas frequentes do Portal Nacional da NF-e — consulta por chave e Ciência da Emissão](https://www.nfe.fazenda.gov.br/portal/consulta.aspx/perguntasFrequentes.aspx?AspxAutoDetectCookieSupport=1&tipoConteudo=3Ow1nfTBzIo%3D) e [NT 2020.001 — manifestação pelo Portal com certificado digital do destinatário](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=vuPAbOafoX4%3D).

`git diff --check` foi executado para os arquivos desta correção. Nenhum teste automatizado, build, gravação remota ou chamada à SEFAZ foi executado.

## Aviso de NF-e incompleta com consulta no Portal — versão intermediária

### Problema e sintomas

As notas recebidas somente como `resNFe` continuavam com zero itens, e o aviso “XML PENDENTE” só explicava o motivo depois de um clique. Faltava uma ação direta na própria linha/card para abrir o Portal Nacional já com a chave de acesso preenchida.

### Causa raiz

O documento `resNFe` não contém os itens da NF-e. O aviso anterior era expansível e não oferecia a consulta contextual no Portal. A consulta pública mostra a situação do documento, mas não disponibiliza o XML completo.

### Arquivos e linhas

- `shared-utils/inboundSummaryHelp.ts:1-2` — orienta a consultar pelo botão ao lado, registrar Ciência da Emissão e solicitar o XML completo pelo Portal.
- `erp/src/pages/App/Stock/InboundInvoices/components/InboundInvoicesTable.tsx:152,249` e `erp/src/pages/App/Stock/InboundInvoices/components/SummaryXmlStatusBadge.tsx:1-49` — substituem os rótulos anteriores por “Nota fiscal incompleta:” e posicionam o botão “Consultar no Portal” ao lado do texto, abrindo uma nova aba com a chave preenchida.
- `mobile/src/features/stock/invoices/components/invoice-card/InvoiceCard.tsx:5-14` e `mobile/src/features/stock/invoices/components/invoice-card/InvoiceCardContent.tsx:1-5,10-24,61-104,232-280` — passam o handler ao card, removem “(resumo)” do rótulo e colocam o botão junto da orientação, normalizando a chave para habilitar a consulta.
- `mobile/src/features/stock/invoices/screens/invoices-screen/InvoicesScreenContent.tsx:142-144` e `mobile/src/features/stock/invoices/screens/invoices-screen/useInvoiceScreenActions.ts:79-87` — conectam o botão ao fluxo já usado pelo app para abrir o Portal com a chave preenchida.
- `docs/fiscal/README.md:18` e `docs/fiscal/historico-correcoes-2026-10-23.md:34-56` — registram a implementação atual e a distinção entre consulta e obtenção do XML.

### Solução e validação

Esta versão intermediária exibia “Nota fiscal incompleta:” e o botão “Consultar no Portal” diretamente no card. Ela foi substituída pelo selo clicável “XML incompleto” e pelo modal centralizado descrito na seção seguinte. O Portal abre a consulta pública com a chave informada; a Ciência aceita pode permitir ao destinatário obter o XML completo, sujeito às regras de download da SEFAZ.

Referências oficiais: [Perguntas frequentes do Portal Nacional da NF-e — Ciência da Emissão e download do XML](https://www.nfe.fazenda.gov.br/portal/perguntasFrequentes.aspx?AspxAutoDetectCookieSupport=1&tipoConteudo=PN6e+JQMTxs%3D) e [FAQ da SEFAZ do Paraná — serviços de manifestação e download](https://atendimento.fazenda.pr.gov.br/sacsefa/portal/assuntosReferente/23).

Foi executado `git diff --check` nos arquivos alterados. Não foram executados testes automatizados nem build; não houve gravação remota, consulta à SEFAZ ou envio de evento fiscal.

## Modal centralizado para completar XML de NF-e incompleta

### Problema e sintomas

Notas recebidas somente como `resNFe` não têm itens. Era necessário que o selo explicasse o próximo passo e abrisse o importador contextual, sem deixar a tela de notas operável ao fundo. No app móvel, o importador anterior aparecia como uma tela inteira. O campo para colar XML e o botão “Processar XML colado” eram desnecessários nesse fluxo, que deve importar o arquivo XML.

### Causa raiz

O resumo de distribuição não contém os itens da NF-e. O aviso e a consulta ao Portal precisavam ficar junto do fluxo de importação do XML completo, que deve atualizar a nota já cadastrada pela mesma chave. A apresentação mobile usava `pageSheet`, sem o fundo escurecido e sem o enquadramento central solicitados. O campo de texto duplicava a importação e não era necessário para fornecer o XML.

### Arquivos e linhas

- `shared-utils/inboundSummaryHelp.ts:1-2` — centraliza a explicação sobre o resumo, a consulta no Portal, a Ciência aceita e a importação do XML completo.
- `erp/src/pages/App/Stock/InboundInvoices/components/SummaryXmlStatusBadge.tsx:1-23`, `components/InboundInvoicesTable.tsx:151-157,249-255` e `screens/InboundInvoicesScreen.tsx:49,184-190,218-225` — exibem o botão “XML incompleto” sem tooltip e abrem o importador com a nota selecionada.
- `erp/src/pages/App/Stock/InboundInvoices/modals/InboundDocumentImportModal.tsx:1-294` — apresenta a orientação e o botão do Portal no modal central padrão, mantém somente a seleção/arraste de arquivo, remove o campo de colagem e passa a chave esperada ao importador.
- `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundDocumentImport.ts:45-52,85-96` — rejeita o XML quando a chave não corresponde à nota incompleta selecionada, antes de consultar ou gravar dados.
- `mobile/src/features/stock/invoices/components/invoice-card/InvoiceCard.tsx:10` e `InvoiceCardContent.tsx:60-76`, `screens/invoices-screen/InvoicesScreenContent.tsx:48,145-149,211-223` e `screens/invoices-screen/useInvoiceScreenActions.ts:7,92-120` — abrem o modal pela nota selecionada, importam o arquivo XML e conferem a chave antes da importação.
- `mobile/src/features/stock/invoices/modals/invoice-import/InvoiceImportModal.tsx:1-260`, `InvoiceImportXmlUploadSection.tsx:1-43` e `invoiceImportModal.styles.ts:1-194` — exibem o modal centralizado com fundo escuro bloqueante, CTA do Portal e seletor de arquivo; removem a área de colagem e o botão de processar texto.
- `erp/src/pages/App/Stock/InboundInvoices/modals/InboundInvoiceDetailsModal.tsx:133-136` e `mobile/src/features/stock/invoices/modals/invoice-details/InvoiceDetailsItemsSection.tsx:1-26` — mantêm mensagem neutra na lista de itens vazia, sem repetir uma orientação fora do modal.
- Este histórico e `docs/fiscal/README.md:18,488` — registram a implementação atual e a vigência.

### Solução e validação

O selo “XML incompleto” abre o importador existente. No ERP, o diálogo já é centralizado; no app, a apresentação agora usa modal sobreposto, alinhado ao centro, fundo escurecido e conteúdo que bloqueia interação com a tela inferior. O aviso explica como consultar a nota no Portal e obter o XML completo. O botão “Consultar no Portal” abre a consulta com a chave da própria nota; a importação é feita selecionando o arquivo XML. O campo para colar conteúdo e o botão “Processar XML colado” foram removidos. A chave extraída do arquivo precisa corresponder à nota selecionada. O serviço idempotente atualiza a nota existente se o XML trouxer itens/dados novos e mantém a resposta de “sem alterações” para conteúdo já salvo.

Referências oficiais: [Perguntas frequentes do Portal Nacional da NF-e — Ciência da Emissão e download do XML](https://www.nfe.fazenda.gov.br/portal/perguntasFrequentes.aspx?AspxAutoDetectCookieSupport=1&tipoConteudo=PN6e+JQMTxs%3D) e [FAQ da SEFAZ do Paraná — serviços de manifestação e download](https://atendimento.fazenda.pr.gov.br/sacsefa/portal/assuntosReferente/23).

`git diff --check` foi executado. Não foram executados testes automatizados nem build; não houve gravação remota, consulta à SEFAZ ou envio de evento fiscal.

## Campos da NF de entrada usam borda inferior

### Problema e sintomas

Os campos de pesquisa por fornecedor/NF/chave, filtro de período e chave/XML no formulário de importação apareciam com bordas completas e cantos arredondados, diferentes do padrão de inputs usado no ERP.

### Causa raiz

Os componentes de NF de entrada definiam estilos próprios de borda ao redor dos controles em vez do padrão de linha inferior, tanto em Tailwind no ERP quanto nos estilos React Native do app.

### Arquivos e linhas

- `erp/src/pages/App/Stock/InboundInvoices/components/InboundInvoicesHeader.tsx:76-171` — altera select de período, meses personalizados e busca de fornecedor/NF/chave.
- `erp/src/pages/App/Stock/InboundInvoices/modals/InboundDocumentImportModal.tsx:123-140` — altera o input da chave de acesso no importador.
- `erp/src/pages/App/Stock/InboundInvoices/modals/InboundXmlImportModal.tsx:156-174` — altera a área de colagem do XML.
- `mobile/src/features/stock/invoices/screens/invoices-screen/invoicesScreen.styles.ts:54-107` — aplica a linha inferior ao período, meses personalizados e busca.
- `mobile/src/features/stock/invoices/modals/invoice-import/invoiceImportModal.styles.ts:57-76` — aplica a linha inferior ao campo da chave de acesso.
- `docs/fiscal/README.md:9-10` e este histórico — registram a correção visual.

### Solução e validação

Os campos de texto e período agora usam apenas a borda inferior, com cor de foco e contraste para o modo escuro. O estilo também foi alinhado no app móvel. A área tracejada de seleção de arquivo permanece como ação de upload. Busca, filtros, scanner, validação e importação mantêm o comportamento existente.

`git diff --check` foi executado nos arquivos alterados. Nenhum teste automatizado, alteração de dados ou chamada à SEFAZ foi executado.

## Contador de sincronização da NF de entrada distingue descoberta e recuperação

### Problema e sintomas

O badge da NF de entrada mostrava “Próxima verificação em ~60 min”, dando a entender que a recuperação automática de lacunas de NSU também esperaria uma hora.

### Causa raiz

O status `last_sync_at` e `next_allowed_sync_at` pertence à descoberta geral `distNSU`, que continua limitada a uma vez por hora. O badge usava esse horário para uma mensagem genérica e não mostrava a checagem periódica da fila `consNSU`, executada a cada cinco minutos pela tela aberta.

### Arquivos e linhas

- `erp/src/pages/App/Stock/InboundInvoices/components/SefazSyncStatusBadge.tsx:11,21,151-165,191-285` — identifica `distNSU` como descoberta geral, exibe seu próximo horário separado e conta os cinco minutos até a próxima checagem de lacunas.
- `mobile/src/features/stock/invoices/components/SefazSyncStatusBadge.tsx:6,17,156-170,198-287` — replica a distinção e os dois indicadores no app móvel.
- `docs/fiscal/README.md:9-10` e este histórico — atualizam as referências fiscais vigentes.

### Solução e validação

O indicador agora nomeia a próxima busca geral por NF-e como `distNSU` e exibe à parte a próxima checagem da fila de lacunas `consNSU`, com contador local de cinco minutos e a condição “se houver pendências”. Isso não altera as chamadas à SEFAZ: `distNSU` permanece a cada hora; `consNSU` só consulta a SEFAZ quando há NSU faltante na fila e respeita o intervalo global de cinco minutos. A busca geral e a recuperação continuam dependendo da tela de NF de entrada aberta.

`git diff --check` foi executado para os arquivos alterados; nenhum teste automatizado ou chamada à SEFAZ foi executado. A verificação global também encontrou uma linha em branco no fim de `erp/src/pages/App/Products/components/variationTabs/VariationAttributeValueInput.tsx`, fora desta correção.

## Navegação do ERP para NF de saída, NF de entrada e NCMs

### Problema e sintomas

Os acessos de NF de saída, NF de entrada e NCM ficavam juntos em um menu Fiscal separado dos módulos comerciais e de estoque. Os nomes extensos também não correspondiam aos rótulos curtos solicitados para os módulos.

### Causa raiz

O menu desktop importava um `FiscalNavMenu` próprio, enquanto o `MobileNav` mantinha uma categoria Fiscal independente. O cabeçalho da NF de saída mostrava o menu de três pontos apenas para exportação e não tinha acesso ao catálogo NCM.

### Arquivos e linhas

- `erp/src/components/layout/DesktopNav.tsx:54,71-80` — remove o menu Fiscal separado e exibe Estoque/Vendas também quando o perfil tem acesso às respectivas notas fiscais.
- `erp/src/components/layout/MobileNav.tsx:95-102,195-201,322-379,557-571` — move as entradas para Estoque e Vendas, aplica as permissões de cada link e remove a categoria Fiscal independente.
- `erp/src/components/layout/nav/menus/SalesNavMenu.tsx:14-105` — coloca NF de saída no agrupamento Fiscal do menu Vendas.
- `erp/src/components/layout/nav/menus/StockNavMenu.tsx:14-136` — coloca NF de entrada no agrupamento Fiscal do menu Estoque.
- `erp/src/components/layout/types.ts:4`, `erp/src/components/layout/nav/index.ts:10` e `erp/src/components/layout/nav/menus/FiscalNavMenu.tsx` — removem a chave, exportação e componente do menu Fiscal separado.
- `erp/src/pages/App/FiscalDocuments/components/FiscalDocumentsHeader.tsx:2,11,20,46,97-143` e `erp/src/pages/App/FiscalDocuments/index.tsx:50,187` — renomeiam o cabeçalho para “NF de saída” e mostram “NCMs” no menu de três pontos somente com a permissão de catálogo.
- `erp/src/pages/App/Stock/InboundInvoices/components/InboundInvoicesHeader.tsx:58,61` — renomeia o título para “NF de entrada”.
- `erp/src/pages/App/FiscalDocuments/__tests__/fiscalDocumentsComponents.test.tsx:33` — atualiza a expectativa do título.
- `docs/fiscal/README.md:9` e `docs/fiscal/historico-correcoes-2026-10-23.md:27-56` — registram esta correção no índice e no histórico.

### Solução implementada

NF de saída agora aparece como submódulo de Vendas; NF de entrada aparece como submódulo de Estoque. Os dois nomes foram encurtados nos menus e cabeçalhos. NCMs está no menu de três pontos do cabeçalho de NF de saída e continua condicionado à permissão `viewNcmCatalog`. Rotas, guards de acesso e operações fiscais existentes foram preservados.

### Validação e limites

- `git diff --check` nos arquivos desta correção passou. A revisão estática confirmou que cada link usa sua rota e permissão existentes. A verificação global também sinalizou uma linha em branco final em `erp/src/pages/App/Products/components/variationTabs/VariationAttributeValueInput.tsx`, arquivo fora desta correção e não alterado por ela.
- Nenhum teste automatizado foi executado. Nenhum dado, XML, snapshot, banco de dados ou comunicação com a SEFAZ foi alterado.

## Ciência automática da emissão para notas resumo

### Problema e sintomas

As NF-e recebidas pela distribuição como `resNFe` apareciam sem produtos porque o resumo não contém os itens `<det>`. O operador teria de abrir o Portal e registrar Ciência individualmente; o objetivo do fluxo é obter o XML completo sem repetir essa ação nota por nota.

### Causa raiz

O sistema armazenava o resumo e recuperava NSUs faltantes, mas não enviava automaticamente o evento 210210 que habilita a obtenção do XML completo. Antes de existir manifestação aceita, a consulta pela chave (`consChNFe`) retorna somente o resumo. A Ciência é opcional e não conclusiva: depois dela, o destinatário ainda precisa registrar a manifestação final aplicável à operação.

### Arquivos e linhas

- `api/nfe/inbound-manifestation.ts:29-267,303-378,425-553`, bundle `erp/server/nfe/inbound-manifestation.cjs:859,888,926,1011,1121,1168,1184,1257` e source map `erp/server/nfe/inbound-manifestation.cjs.map:1` — aceitam `process-auto` somente com autorização fiscal e opção administrativa ativa; selecionam até 20 notas resumo do mesmo ambiente, assinam eventos individualmente, serializam todos os envios por CNPJ, persistem o retorno individual e aplicam intervalo de cinco segundos após a resposta; uma rejeição 656 pausa a fila por uma hora.
- `erp/src/pages/utils/settings/types.ts:101`, `erp/src/pages/utils/settings/defaults.ts:82` e `shared-utils/appSettingsFormSchema.ts:98` — definem a opção, mantêm seu padrão desativado e validam o valor no formulário de configurações.
- `erp/src/pages/App/Settings/components/fiscal/FiscalSettingsSection.tsx:155-164` — disponibiliza a ativação única com aviso explícito de Produção, evento não conclusivo e necessidade da manifestação final.
- `erp/src/pages/utils/inboundNfe/services/sefazInboundSyncService.ts:33-48,225-276` e `erp/src/pages/App/Stock/InboundInvoices/components/SefazSyncStatusBadge.tsx:21-175` — transportam status/retomada e drenam lotes seguintes após cinco segundos, com espera progressiva em falhas temporárias, sem acoplar a fila de Ciência ao cronograma `consNSU`.
- `mobile/src/services/stock/stockSefazService.ts:3-36` e `mobile/src/features/stock/invoices/components/SefazSyncStatusBadge.tsx:17-190` — aplicam a mesma fila sequencial e retomada no app móvel, separada das consultas `consNSU`.
- `supabase/functions/sefaz-inbound-sync/index.ts:12-13,95-264,276-299,385-449,660-762` — aplica intervalo global de cinco minutos entre consultas pontuais `consNSU`/`consChNFe` e uma hora entre distribuições `distNSU`.
- `supabase/migrations/20261023185901_sefaz_direct_consult_throttle.sql:14-64` — fornece a reserva de cinco minutos compartilhada pelas consultas pontuais `consNSU` e `consChNFe`.
- `supabase/migrations/20261023213230_sefaz_manifestation_batch_queue.sql:1-138` — cria lease exclusivo por CNPJ, cooldown de cinco segundos após resposta, pausa de uma hora para cStat 656, RLS e RPCs apenas para `service_role`.
- `docs/fiscal/README.md:9-10` e `docs/fiscal/historico-correcoes-2026-10-23.md:5-40,65-67` — atualizam índice, separação de filas e limites.

### Solução implementada

O administrador ativa “Enviar Ciência da Emissão automaticamente para notas resumo” uma vez nas configurações fiscais. A opção começa desligada. Enquanto a tela de NF de entrada estiver aberta no ERP ou no app, o backend procura até 20 NF-e modelo 55 autorizadas que ainda tenham somente `resNFe`, do mesmo ambiente, confere o CNPJ destinatário e verifica que não exista evento de Ciência registrado, rejeitado, incerto ou em processamento. Cada lote contém no máximo 20 eventos assinados individualmente. Uma trava persistente permite somente um envio por CNPJ por vez; após a resposta da SEFAZ e persistência do resultado, a fila aguarda cinco segundos antes do próximo lote. Esse intervalo é uma regra interna conservadora, não um limite oficial universal da SEFAZ. Não há teto fixo de lotes por hora no aplicativo. Se ocorrer cStat 656, a fila de manifestações pausa por uma hora. Falhas temporárias recebem tentativas com intervalos progressivamente maiores. Respostas incertas ficam no histórico e seus eventos não são reenviados automaticamente.

`consNSU` e `consChNFe` compartilham uma consulta pontual a cada cinco minutos por CNPJ; `distNSU` conserva seu cooldown independente de uma hora. A fila de Ciência não reserva nem consome esses intervalos. A automação continua dependente da tela de NF de entrada aberta, pois o projeto ainda não possui um worker agendado em segundo plano.

As interfaces não oferecem consulta manual `consChNFe` nem reativam “Buscar XML”. Após Ciência aceita, a fila automática pode consultar uma chave por vez; se a resposta ainda trouxer somente `resNFe`, a chave fica marcada como consultada e aguarda a próxima distribuição para receber o XML completo e seus itens. O evento 210210 não confirma a compra; o aplicativo não envia manifestação conclusiva automaticamente.

Referências oficiais: [Perguntas frequentes do Portal Nacional da NF-e — Ciência habilita o download do XML e não é manifestação conclusiva](https://www.nfe.fazenda.gov.br/portal/perguntasFrequentes.aspx?AspxAutoDetectCookieSupport=1&tipoConteudo=PN6e+JQMTxs%3D), [NT 2020.001 vigente — o lote de recepção de eventos aceita até 20 eventos](https://www.nfe.fazenda.gov.br/PORTal/exibirArquivo.aspx?conteudo=nPKQWFVzvQo%3D), [NT 2014.002 — `consChNFe` consulta a NF-e por chave](https://www.nfe.fazenda.gov.br/Portal/exibirArquivo.aspx?conteudo=0rPhVp1wRqc%3D) e [Portal Nacional da NF-e — limite de 20 consultas pontuais por hora](https://www.nfe.fazenda.gov.br/portal/informe.aspx?AspxAutoDetectCookieSupport=1&Informe=A6qvFRVbPSA%3D&ehCTG=false).

### Validação e limites

- A leitura do diff confirmou opção padrão desligada, validação administrativa pela área de configurações, autorização de operador no backend, uso do A1 somente no servidor, reserva por CNPJ, registro durável e bloqueio de repetição de tentativas existentes.
- Nenhum evento foi enviado à SEFAZ nesta etapa anterior e nenhum conjunto de testes foi executado. `node scripts/build-fiscal.cjs` concluiu o empacotamento. `npm run build:fiscal --prefix erp` empacotou os bundles, mas a verificação de inicialização parou antes dos checks de handlers ao encontrar 13 funções de API no diretório (limite Vercel Hobby configurado: 12), condição preexistente fora deste diff. A migration foi aplicada ao projeto Supabase operacional `hkoxhourxwlddgsfdgws` e registrada como versão `20261023213230`, nome `sefaz_manifestation_batch_queue`. A pós-verificação confirmou RLS ativo, sem leitura por `anon`/`authenticated`, tabela acessível ao `service_role` e RPCs executáveis apenas por `service_role` (além do proprietário `postgres`). O advisor de segurança sinaliza “RLS enabled no policy” para esta tabela interna; não há grants para clientes, e a API usa o papel de servidor.
- O código da API permanece no checkout e não foi publicado. A automação só começa depois da publicação e da ativação explícita nas configurações fiscais; depende de uma tela de NF de entrada aberta. Eventos incertos ou rejeitados exigem análise no histórico fiscal.

### Correção da validação do destinatário da Ciência automática

#### Problema e causa raiz

Depois da ativação, a fila falhava antes de enviar a Ciência com “O CNPJ destinatário não corresponde à chave de acesso”. O código comparava o CNPJ do destinatário com o bloco de 14 caracteres da chave que identifica o **emitente**. A RPC no Supabase repetia a mesma comparação incorreta. O MOC da NF-e identifica explicitamente esse campo da chave como CNPJ/CPF do emitente.

#### Arquivos e linhas

- `api/nfe/inboundManifestationProtocol.ts:33-37` — valida o formato do CNPJ do evento sem compará-lo ao CNPJ do emitente na chave.
- `api/nfe/inbound-manifestation.ts:477` — ajusta a mensagem de erro para descrever corretamente a divergência entre destinatário salvo e CNPJ do evento.
- `supabase/migrations/20261023221734_fix_inbound_manifestation_recipient_validation.sql:1-112` — atualiza a RPC para comparar o CNPJ do evento somente com `inbound_invoices.destinatario_cnpj`, mantendo checagens de chave, modelo, ambiente, autorização, resumo e permissões.
- `erp/server/nfe/inbound-manifestation.cjs:806-817` e `erp/server/nfe/inbound-manifestation.cjs.map` — recompila a função de API local.
- `erp/src/pages/utils/nfe/__tests__/inboundManifestationProtocol.test.ts:1-17` — prova que uma chave com CNPJ do emitente diferente aceita e preserva o CNPJ destinatário no XML do evento.
- `erp/src/pages/App/Settings/components/fiscal/FiscalSettingsSection.tsx:162-168` — corrige o texto que dizia “uma nota a cada cinco minutos”; agora informa até 20 eventos por lote e intervalo de cinco segundos após a resposta.

#### Validação e resultado operacional

- Vitest focado: 1 teste aprovado. `node erp/scripts/build-fiscal.cjs` concluiu a geração do bundle.
- A migration foi aplicada ao projeto Supabase operacional na versão `20261023221734`. A leitura de pós-aplicação confirmou que a comparação com a chave foi removida, a validação contra o destinatário salvo permanece e só `service_role` tem execução da RPC (`anon` e `authenticated` não têm).
- A opção de Ciência foi ativada nas configurações do ERP e permaneceu marcada após recarregar a tela. O lote seguinte registrou 2 eventos (`cStat=135`); 8 foram rejeitados com `cStat=596`, pois a SEFAZ informou prazo vencido de 10 dias. Esses eventos não são reenviados automaticamente.
- Os XMLs completos e itens das notas aceitas ainda aguardam a próxima distribuição `distNSU`; nenhuma consulta `consChNFe` foi enviada. Uma checagem acompanhada foi agendada para verificar o resultado sem disparar novas consultas ou eventos.
- Referência oficial para a composição da chave: [MOC NF-e 7.0 — Visão Geral, Tabela 2-1](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=LrBx7WT9PuA%3D).

## Consulta automática do XML após Ciência aceita

### Problema e causa raiz

A configuração `autoInboundScienceEnabled` é iniciada como `false` e o backend não transmite eventos enquanto ela permanecer desativada. Isso exige ativação administrativa explícita para um evento fiscal; não é controlado pelo contador de 60 minutos. Depois que a opção foi ligada e a SEFAZ aceitou duas Ciências, o sistema ainda aguardava `distNSU` e não tentava obter os XMLs completos por chave, deixando os itens zerados enquanto os resumos permaneciam salvos.

### Arquivos e linhas

- `api/nfe/inbound-manifestation.ts` — separa notas sem tentativa de Ciência das notas com Ciência registrada; após esgotar eventos novos, consulta uma nota registrada por chamada usando `consChNFe`, registra retornos sem XML completo e agenda o próximo item no intervalo global.
- `api/nfe/inboundXmlConsultQueue.ts` — seleciona somente resumo com evento 210210 `registered` e sem consulta concluída; rejeições como cStat 596 não entram na fila.
- `supabase/migrations/20261023222725_sefaz_inbound_xml_consult_tracking.sql` — prepara tabela interna com RLS para evitar repetir chaves que já retornaram somente resumo ou nenhum documento; sem grants de cliente, leitura/escrita restritas a `service_role`.
- `erp/src/pages/utils/inboundNfe/services/sefazInboundSyncService.ts` — transporta resultado da busca automática e quantidade de itens persistidos.
- `erp/src/pages/App/Stock/InboundInvoices/components/SefazSyncStatusBadge.tsx` e `mobile/src/features/stock/invoices/components/SefazSyncStatusBadge.tsx` — atualizam e recarregam as listas quando o XML completo e os itens são salvos; mostram a espera de cinco minutos ou da próxima distribuição.
- `erp/src/pages/App/Settings/components/fiscal/FiscalSettingsSection.tsx` — explica que, após Ciência aceita, a busca do XML ocorre automaticamente em segundo plano e segue o intervalo da SEFAZ.
- `erp/src/pages/utils/nfe/__tests__/automaticInboundXmlQueue.test.ts` — prova que somente eventos registrados e ainda não consultados são selecionados.
- `docs/fiscal/README.md` e este histórico — registram o motivo da opção desligada e o fluxo automático.

### Solução e validação

Com a opção administrativa ativada, o backend envia Ciência para notas resumo elegíveis. Somente eventos confirmados com cStat de registro habilitam a etapa seguinte. O ERP e o app chamam a mesma API; ela usa a Edge Function já existente para `consChNFe`, sem restaurar o botão de consulta por chave ou “Buscar XML”. `consNSU` e `consChNFe` compartilham a reserva global de uma consulta pontual por CNPJ a cada cinco minutos. Ao receber XML completo, a rotina confere que ele foi salvo e informa quantos itens foram persistidos. Se vier apenas `resNFe` ou nenhum documento, grava o resultado para não repetir a mesma chave e aguarda a próxima distribuição. A tela de NF de entrada precisa continuar aberta para processar a fila.

A leitura oficial da NT 2014.002 confirma que, para destinatário com manifestação, `consChNFe` devolve a NF-e; sem manifestação, devolve apenas o resumo: [NT 2014.002 — consulta de NF-e por chave (`consChNFe`)](https://www.nfe.fazenda.gov.br/Portal/exibirArquivo.aspx?conteudo=155Wx5%2FJB5A%3D). Ciência segue sendo não conclusiva e não confirma recebimento.

- Motivo da opção desligada: `erp/src/pages/utils/settings/defaults.ts` define `autoInboundScienceEnabled: false`; a API exige `true`. A configuração foi ativada pelo painel fiscal após autorização do usuário.
- A migration `20261023222725_sefaz_inbound_xml_consult_tracking` foi aplicada ao Supabase operacional como versão remota `20261023223616`; a leitura pós-aplicação confirmou RLS ligado, permissões necessárias para `service_role` e ausência de leitura para `anon`/`authenticated`.
- As Ciências já observadas antes desta mudança foram: 2 registradas (`cStat=135`) e 8 rejeitadas (`cStat=596`, fora do prazo de 10 dias). Nenhuma dessas rejeitadas é consultada automaticamente por chave.

## Pausa explícita quando falta a tabela da consulta automática de XML

### Problema e causa raiz

A interface mostrava “Não foi possível conferir as consultas automáticas de XML já realizadas”. A consulta somente leitura ao Supabase operacional `hkoxhourxwlddgsfdgws` confirmou que `public.sefaz_inbound_xml_consult_attempts` ainda não existia. Essa tabela é criada pela migration `20261023222725_sefaz_inbound_xml_consult_tracking`. O backend retornava 503 genérico antes de processar a fila, e a interface considerava o erro repetível.

### Arquivos e solução

- `api/nfe/inbound-manifestation.ts:457,499-551` — reconhece os erros PostgreSQL/PostgREST de tabela ausente, mantém o processamento normal das Ciências ainda pendentes e pausa somente a busca `consChNFe` com resposta 409 não repetível quando não há mais Ciência a processar; falhas não relacionadas continuam como 503. A fila deixa de repetir polling inútil.
- `api/nfe/inboundXmlConsultQueue.ts:1-40` e `api/nfe/inboundManifestationProtocol.ts:19-98` — selecionam resumos com Ciência registrada e ainda sem consulta e processam o protocolo dos eventos em lote.
- `erp/src/pages/utils/inboundNfe/services/sefazInboundSyncService.ts:41-48,250-267` e `erp/src/pages/App/Stock/InboundInvoices/components/SefazSyncStatusBadge.tsx:73-95` — transportam o resultado e exibem XML completo, pendência ou erro não repetível no ERP.
- `erp/src/pages/App/Settings/components/fiscal/FiscalSettingsSection.tsx`, `erp/src/pages/utils/settings/defaults.ts`, `erp/src/pages/utils/settings/types.ts` e `shared-utils/appSettingsFormSchema.ts` — mantêm a configuração da Ciência automática no formulário fiscal.
- `erp/src/pages/App/Stock/InboundInvoices/components/InboundInvoicesHeader.tsx`, `modals/InboundDocumentImportModal.tsx` e `modals/InboundXmlImportModal.tsx` — preservam o fluxo ERP de entrada sem reintroduzir consulta manual por chave ou “Buscar XML”.
- `docs/fiscal/README.md` e este histórico — registram a causa confirmada, a versão da migration e a implantação concluída.

### Validação e estado remoto

- Migration aplicada ao projeto operacional como versão `20261023223616`; a leitura pós-aplicação confirmou a tabela, RLS ligado, grants de leitura/escrita somente a `service_role` e sem `SELECT` para `anon`/`authenticated`.
- A produção Vercel foi publicada no deployment `dpl_8nLcMiTQ8vLodaTgnve7Bvc5vxPf` (`READY`) e vinculada a `https://morantehub.com`. O build remoto passou pela verificação dos 12 handlers fiscais e compilou o ERP.
- O advisor remoto retornou apenas o aviso informativo `rls_enabled_no_policy` para esta tabela; é esperado porque o acesso cliente foi revogado e somente o backend com `service_role` usa a tabela. Nenhum aviso de performance novo apontou para ela.
- Nenhuma consulta ou manifestação foi enviada à SEFAZ durante esta correção. Não foram executados testes unitários; o build de produção validou compilação e inicialização, não o recebimento real dos itens/XML.
- Não foi executado runner de testes nesta correção.

## Recuperação automática de lacunas por `consNSU` e remoção da consulta manual por chave

### Problema e sintomas

Na distribuição `distNSU`, cada bloco `docZip` contém o NSU próprio do documento. O processamento anterior podia atribuir o cursor `ultNSU` a todos os documentos e não guardava os intervalos faltantes para consulta posterior. Isso podia deixar notas sem importação e itens ausentes quando a SEFAZ só havia entregue o resumo `resNFe`. As telas do ERP e do app móvel também ofereciam consulta direta por chave e a ação “Buscar XML” para uma NF já cadastrada.

### Causa raiz

O parser extraía o conteúdo de `docZip`, mas descartava seus atributos, inclusive `NSU`; não havia fila durável nem uma rotina para consultar um NSU pontual por `consNSU`. Além disso, `resNFe` é somente um resumo e não contém os itens `<det>`. O botão “Buscar XML” existia para tentar obter pela chave um XML completo ainda não armazenado. Quando o XML completo já está salvo, ele pode ser baixado sem nova consulta. Quando existe apenas um resumo, os itens só aparecem quando o XML completo chegar pela distribuição ou quando o operador importar o XML recebido do fornecedor.

### Arquivos e linhas

- `supabase/functions/sefaz-inbound-sync/index.ts:12-69,71-126,128-262,319-438,538-670` — identifica lacunas sem confundir NSU do documento com o cursor, persiste e reclama intervalos da fila, consulta um NSU com `consNSU`, respeita a trava de cinco minutos, interpreta cStat 137/138/656 e não substitui um XML completo por resumo.
- `supabase/functions/sefaz-inbound-sync/utils/xmlParser.ts:17-36` — extrai o atributo NSU e o conteúdo comprimido de cada `docZip`.
- `supabase/functions/sefaz-inbound-sync/utils/soap.ts:1-13` — monta envelopes separados para `distNSU` e `consNSU`.
- `supabase/migrations/20261023203000_sefaz_nsu_recovery_queue.sql:3-91` — cria fila durável de intervalos, lease concorrente, RLS sem acesso cliente e RPC restrita ao `service_role`.
- `supabase/migrations/20261023185901_sefaz_direct_consult_throttle.sql:1-64` — fornece a reserva atômica de uma consulta pontual por CNPJ a cada cinco minutos, agora usada por `consNSU`; sua etapa original está registrada abaixo.
- ERP: `erp/src/pages/App/Stock/InboundInvoices/components/InboundInvoicesTable.tsx:157,329`; `components/SefazSyncStatusBadge.tsx:14-51`; `hooks/useInboundDocumentImport.ts:81-222`; `modals/InboundAccessKeyModal.tsx:113-126`; `modals/InboundDocumentImportModal.tsx:139-164`; `modals/InboundInvoiceDetailsModal.tsx:133-136`; `screens/InboundInvoicesScreen.tsx:120-180`; `erp/src/pages/utils/inboundNfe/services/sefazInboundSyncService.ts:143-156` — removem as ações diretas e de busca remota, mantêm “Consultar no Portal”, retomam a fila e explicam notas resumo.
- ERP: `erp/src/pages/App/Stock/InboundInvoices/modals/inboundImportForms.test.tsx:9-100` — remove expectativas de ações retiradas da interface; o teste não foi executado.
- App móvel: `mobile/src/features/stock/invoices/components/SefazSyncStatusBadge.tsx:14-53`; `components/invoice-card/InvoiceCard.tsx:9-10`; `components/invoice-card/InvoiceCardContent.tsx:10-17,132-231`; `modals/invoice-actions/InvoiceActionModal.tsx:19-46`; `modals/invoice-details/InvoiceDetailsItemsSection.tsx:9-26`; `modals/invoice-details/InvoiceDetailsModal.tsx:25-66`; `modals/invoice-details/invoiceDetailsModal.styles.ts:98-107`; `modals/invoice-import/InvoiceImportAccessKeySection.tsx:10-85`; `modals/invoice-import/InvoiceImportModal.tsx:73-147`; `modals/invoice-import/invoiceImportModal.styles.ts:76-92`; `screens/invoices-screen/InvoicesScreenContent.tsx:80-209`; `screens/invoices-screen/useInvoiceScreenActions.ts:32-88,156-174`; `mobile/src/services/stock/stockSefazService.ts:32-37` — aplicam as mesmas remoções e explicações no app, mantêm o botão do Portal e retomam a fila enquanto a tela está aberta.
- `docs/fiscal/README.md:9-11` e `docs/fiscal/historico-correcoes-2026-10-23.md:1-38` — apontam e registram o fluxo vigente.

### Solução implementada

`distNSU` continua sendo o mecanismo de descoberta e roda no máximo uma vez por hora. O sistema conserva o NSU de cada `docZip`, registra lacunas observadas e consulta um NSU por chamada `consNSU`, em ordem, com intervalo global por CNPJ de cinco minutos (até 12 consultas pontuais por hora). Essa fila é independente dos lotes de Ciência. Uma recuperação é tentada após uma distribuição bem-sucedida; outras pendentes são retomadas em intervalos de cinco minutos enquanto a tela de NF de entrada estiver aberta no ERP ou no app. A fila de Ciência tem ritmo próprio e pode seguir enquanto houver resumos, um lote por vez, respeitando cinco segundos após cada resposta. Se a SEFAZ responder cStat 656, a fila afetada aguarda uma hora. O botão “Consultar no Portal” permanece. Foram removidas das interfaces a consulta direta `consChNFe` e a ação “Buscar XML” de nota existente. A Edge Function conserva o handler antigo `consChNFe` temporariamente por compatibilidade com versões antigas do cliente; os serviços atuais do ERP e do app móvel não o chamam. O download local do XML que já está salvo permanece disponível. Resumos `resNFe` continuam sem itens; o XML completo atualiza o resumo sem ser substituído por uma resposta posterior incompleta.

Referências oficiais: [Nota Técnica 2014.002 — distribuição de DF-e e consulta pontual por NSU](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=wLVBlKchUb4%3D) e [Portal Nacional da NF-e — limite de consultas pontuais e cStat 656](https://www.nfe.fazenda.gov.br/PORTAL/exibirArquivo.aspx?conteudo=VgPuhtPApQo%3D).

### Validação e limites

- A migration `20261023203000_sefaz_nsu_recovery_queue` foi aplicada ao projeto Supabase operacional `hkoxhourxwlddgsfdgws`. A leitura do catálogo confirmou RLS ativo, sem acesso de leitura/claim para `anon` ou `authenticated` e RPC executável por `service_role`.
- `sefaz-inbound-sync` está ativa na versão 28, com `verify_jwt=true`.
- Nenhuma consulta SOAP foi enviada à SEFAZ e nenhum teste automatizado foi executado. O código das interfaces ERP e móvel foi atualizado no checkout, mas não publicado: a árvore contém alterações não relacionadas e publicar esse checkout incluiria essas mudanças. A recuperação repetida depende de a tela de NF de entrada estar aberta; não foi configurado um worker agendado em segundo plano.
- Uma NF que tenha somente `resNFe` continuará sem itens até receber o XML completo pela distribuição ou até o operador importar o XML completo do fornecedor. Se o XML completo já estiver salvo, não é necessário buscá-lo novamente; o download local do XML salvo continua disponível.

## Consulta direta à SEFAZ limitada a uma por CNPJ a cada cinco minutos e itens atualizados pelo XML completo

> Registro da etapa intermediária. O fluxo atual de `consNSU`, a remoção das ações diretas e a retenção do botão do Portal estão descritos na seção acima.

### Problema e sintomas

Consultas `consChNFe` podiam ser repetidas para chaves diferentes sem um controle persistente por CNPJ; o único cooldown do sistema pertencia à consulta de distribuição `distNSU`. As telas de NF de entrada também ofereciam links ao portal SEFAZ junto à consulta direta pela chave. Após o operador confirmar Ciência da Emissão, as duas telas do ERP chamavam `consChNFe` novamente de imediato. Quando a SEFAZ retornava `resNFe`, a nota era salva sem itens porque o resumo não contém os blocos `<det>`. No fluxo de importação direta, a verificação de chave duplicada podia parar a tela mesmo quando a consulta já havia atualizado a nota resumida com o XML completo.

### Causa raiz

`sefaz-inbound-sync` limitava cada consulta por chave a uma chamada SOAP (`MAX_ITERATIONS=1`), mas não limitava a frequência de consultas `consChNFe` do CNPJ. O ERP e o app móvel ofereciam uma segunda ação que abria o portal externo; no app móvel, ela duplicava a consulta direta já disponível. Ao mesmo tempo, o campo `next_allowed_sync_at` da tabela `sefaz_nsu_control` é usado pelo fluxo periódico de distribuição `distNSU`, portanto não podia ser reutilizado como trava da consulta manual por chave. O parser já distinguia o XML completo do `resNFe` e retornava `itens: []` para o resumo, comportamento necessário porque a SEFAZ ainda não entregou o conteúdo dos produtos.

### Arquivos e linhas

- `supabase/migrations/20261023185901_sefaz_direct_consult_throttle.sql:1-64` — cria a trava persistente por CNPJ com RPC atômica; a tabela fica sob RLS, sem acesso de `anon`/`authenticated`, e a execução é exclusiva de `service_role`.
- `supabase/functions/sefaz-inbound-sync/index.ts:19,67,147-158,166-190,311-337,387-395` — reserva o intervalo de cinco minutos somente para `consChNFe`, falha fechada quando não consegue validar a reserva e mantém o cooldown `distNSU` separado; cStat 656 continua bloqueando o CNPJ pela regra de uma hora.
- `erp/src/pages/App/Stock/InboundInvoices/modals/InboundDocumentImportModal.tsx:19-20,79-111,214-228` e `erp/src/pages/App/Stock/InboundInvoices/screens/InboundInvoicesScreen.tsx:150-181` — removem a consulta imediata após Ciência, informam o intervalo de cinco minutos e deixam a consulta manual por chave identificada como `consChNFe`.
- `erp/src/pages/App/Stock/InboundInvoices/modals/InboundAccessKeyModal.tsx:96-112` — remove o link antigo para o portal do modal legado de chave; o fluxo periódico por NSU permanece separado.
- `mobile/src/features/stock/invoices/modals/invoice-import/InvoiceImportAccessKeySection.tsx:1-98` e `InvoiceImportModal.tsx:28-190` — removem o link/ação do portal e mantêm somente a consulta direta de chave pelo serviço `consChNFe`.
- `mobile/src/features/stock/invoices/screens/invoices-screen/InvoicesScreenContent.tsx:70-80` e `useInvoiceScreenActions.ts:1-90,195-207` — removem o encaminhamento e o handler que abriam o portal externo.
- `mobile/src/features/stock/invoices/modals/invoice-import/invoiceImportModal.styles.ts:94-110` — remove estilos que pertenciam ao botão do portal.
- `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundDocumentImport.ts:78-132,211-222` — ao receber XML completo pela SEFAZ, trata o resumo existente como atualização, preserva o estado local e mostra os itens em vez de abrir alerta de duplicidade.
- `erp/src/pages/App/Stock/InboundInvoices/modals/InboundDocumentImportModal.tsx:19-20,81-82` e `erp/src/pages/App/Stock/InboundInvoices/screens/InboundInvoicesScreen.tsx:262-265` — atualizam a listagem quando a consulta direta trouxe somente resumo.
- `erp/src/pages/App/Stock/InboundInvoices/modals/InboundInvoiceDetailsModal.tsx:37,133-136` — explica que o resumo da SEFAZ ainda não contém itens e orienta aguardar o próximo intervalo para consultar o XML completo.
- `docs/fiscal/README.md:9` e `docs/fiscal/historico-correcoes-2026-10-23.md` — atualizam o índice e registram esta correção.

### Solução implementada

O Supabase reserva atomicamente uma consulta manual por chave para o CNPJ a cada cinco minutos, inclusive entre sessões concorrentes e chaves diferentes. Esse limite se aplica somente ao `consChNFe`; a descoberta periódica e sequencial de notas continua usando `distNSU` e seu cooldown próprio. `consNSU` fica reservado para recuperar pontualmente um NSU faltante conhecido. O intervalo de cinco minutos permite até 12 chamadas por hora por CNPJ, abaixo do teto adotado de 20 por hora. A reserva é consumida imediatamente antes da ponte mTLS e permanece válida mesmo se a chamada terminar em erro, protegendo a SEFAZ contra repetição após timeout. Os links ao portal foram removidos do ERP e do app móvel; permanece uma única ação de consulta direta na tela de chave. Ciência da Emissão não confirma a compra e não provoca uma consulta SOAP adicional. O sistema passa a aceitar o XML completo retornado pela SEFAZ como atualização da nota resumida e recarrega a lista.

Referência oficial: [Portal Nacional da NF-e — limites do Web Service NFeDistribuicaoDFe](https://www.nfe.fazenda.gov.br/portal/informe.aspx?AspxAutoDetectCookieSupport=1&Informe=0cu%2FyBLKrCs%3D&ehCTG=false).

### Validação e limites

- A migration remota foi aplicada no projeto operacional e aparece como versão `20261023185901`, nome `sefaz_direct_consult_throttle`.
- A consulta somente de catálogo confirmou a tabela com RLS ativo e a RPC como `SECURITY INVOKER`, sem `EXECUTE` para `anon`/`authenticated` e com `EXECUTE` para `service_role`. Os avisos Supabase de RLS sem políticas são informativos e intencionais para essa tabela de controle somente do servidor.
- `sefaz-inbound-sync` foi implantada como versão 27, `ACTIVE`, com `verify_jwt=true`.
- Não foram executados testes automatizados nem enviada consulta SOAP à SEFAZ. As alterações da interface estão no checkout, mas não foram publicadas na Vercel porque a árvore de trabalho contém alterações não relacionadas e publicá-la incluiria essas mudanças. O bloqueio e a reserva no Supabase já estão ativos.

## Consulta direta da NF de entrada usa a ponte fiscal vigente

### Problema e sintomas

Ao consultar uma NF-e pela chave no fluxo de entrada, o app apresentava “Certificado digital A1 (.pfx) ou senha não configurados.” O log operacional de 23/10/2026 às 17:01:14 UTC confirmou a mensagem na função `sefaz-inbound-sync` antes de qualquer chamada à ponte fiscal.

### Causa raiz

A Edge Function ativa no Supabase operacional estava na versão 25, ainda carregava o certificado por `SEFAZ_CERTIFICATE_BASE64`/`SEFAZ_CERTIFICATE_PASSWORD` ou pelos antigos campos `certificateBase64`/`certificatePassword` de `settings.data`. A tela fiscal já informa que A1 e senha ficam exclusivamente no servidor; o fluxo de configuração remove esses segredos das configurações compartilhadas. O código vigente do repositório já delega o mTLS à API Node da Vercel, que lê `NFE_CERTIFICATE_BASE64` e `NFE_CERTIFICATE_PASSWORD` somente no backend. As duas variáveis estão cadastradas como segredos com escopo de Produção na Vercel. A função remota estava desatualizada em relação ao código do checkout.

### Arquivos e linhas

- `supabase/functions/sefaz-inbound-sync/index.ts:157-198` — versão vigente enviada à Edge Function; encaminha a consulta à ponte autenticada da Vercel sem incluir certificado ou chave privada no payload.
- `erp/api/dist-dfe.ts:204-226` — ponte Node existente que lê o PFX e a senha do ambiente do servidor e cria o agente mTLS. Nenhuma linha local foi alterada neste arquivo.
- `erp/src/pages/utils/inboundNfe/services/sefazInboundSyncService.ts:150-170` — consulta por chave usada pelo app e chamada da Edge Function. Nenhuma linha local foi alterada neste arquivo.
- `erp/src/pages/App/Settings/components/fiscal/CompanyFiscalDataSection.tsx:264-275` — esclarece que o A1 e a senha são configurados somente no servidor. Nenhuma linha local foi alterada neste arquivo.
- `docs/fiscal/historico-correcoes-2026-10-23.md` e `docs/fiscal/README.md` — registro e índice desta correção.

### Solução implementada

Foi implantado no projeto Supabase operacional `hkoxhourxwlddgsfdgws` o código fiscal vigente do repositório: `sefaz-inbound-sync` avançou da versão 25 para a 26 e manteve `verify_jwt=true`. A versão ativa usa a ponte `/api/dist-dfe`; o PFX e a senha permanecem na Vercel, e a Edge Function envia somente os dados da consulta. Nenhuma variável de ambiente, dado fiscal, XML ou migration foi alterada.

### Validação e limites

A leitura do log confirmou a causa no request real que falhou. Após a implantação, a leitura do recurso remoto confirmou `status=ACTIVE`, versão 26, JWT obrigatório, chamada à ponte e ausência de leitura de `SEFAZ_CERTIFICATE_BASE64`/`SEFAZ_CERTIFICATE_PASSWORD` ou encaminhamento de `certPem`/`privateKeyPem`. Não executei uma nova consulta à SEFAZ nem testes automatizados; a consulta real de verificação pode persistir o XML retornado. O deployment da Edge Function não altera documentos nem transmite eventos fiscais.

## Consulta da NF de entrada retornava HTTP 500 por módulo ausente na ponte fiscal

### Problema e sintomas

Depois de ativar `sefaz-inbound-sync` versão 26, uma consulta pelo app passou da mensagem de certificado para “HTTP 500 / erro de comunicação”. O log de produção da Vercel às 17:09:47 UTC confirmou falha ao carregar a função `/api/dist-dfe`; o request do Supabase chegou à ponte, mas não prosseguiu até a SEFAZ.

### Causa raiz

`erp/api/dist-dfe.ts` importava `api/nfe/sefazHttpsAgent` e `api/nfe/nfeSigner` de fora do diretório `erp` configurado para a aplicação. O build da Vercel publicou a função em `erp/api/dist-dfe.js` sem empacotar esses módulos externos; o carregamento ESM falhou com `ERR_MODULE_NOT_FOUND` antes de executar o handler.

### Arquivos e linhas

- `api/nfe/distDfeBridge.ts:1-221` — preserva o handler da ponte e resolve os auxiliares fiscais como imports locais, para que o build fiscal inclua toda a cadeia mTLS.
- `erp/scripts/build-fiscal.cjs:19,39-42` — gera `erp/server/nfe/dist-dfe-bridge.cjs` como bundle CJS e sua declaração de tipo.
- `erp/api/dist-dfe.ts:1-7` — exporta o handler do bundle fiscal gerado, sem imports relativos que escapem do pacote da função.
- `erp/vercel.json:6-9` — configura 30 segundos e a região `gru1` para a consulta, compatíveis com o timeout de 25 segundos da ponte.
- `docs/fiscal/historico-correcoes-2026-10-23.md:31-56` — registra causa, correção, deployment e validação limitada à inicialização da rota.
- `docs/fiscal/README.md:10` — inclui esta correção nas referências atuais.

### Solução implementada

A ponte passa pelo mesmo build fiscal CJS usado pelas demais rotas do ERP. O pacote contém `sefazHttpsAgent`, `nfeSigner` e as dependências locais necessárias; o endpoint mantém autenticação, validação do PFX no servidor, separação de homologação/produção e o payload sem certificado. A região `gru1` mantém a chamada próxima ao serviço brasileiro.

### Validação e limites

O log de produção comprovou o erro de carregamento antes da correção. O build de produção da Vercel concluiu; a implantação `dpl_2tZb4TRyA8K2iZfnx5kMRvLqe611` ficou `READY` e os aliases `morantehub.vercel.app` e `morantehub.com` foram promovidos. Um `GET` seguro à rota no domínio público retornou o `404` esperado em Produção (`{"error":"NOT_FOUND"}`), provando que o módulo carregou e executou o handler; a rota não iniciou SOAP nem acessou o certificado. Não foram executados testes automatizados nem repetida uma consulta fiscal real; a confirmação do retorno da SEFAZ deve ser feita pelo operador ao consultar novamente no app.

## Scanner da chave da NF de entrada com código de barras e leitura de texto

### Problema e sintomas

O scanner de chave da NF de entrada descrevia QR Code como opção, mas o DANFE modelo 55 apresenta a chave em código de barras linear. O quadro quadrado do scanner dificultava enquadrar esse código. Quando o código não era reconhecido, o app também encerrava o scanner antes de permitir usar a leitura do texto impresso. A interface usava “NF-e” como se significasse nota de entrada.

### Causa raiz

O modal de importação reutiliza `InventoryScannerScreen` com `accessKeyMode`, mas o componente configurava somente `qr` para todos os modos e aplicava uma moldura quadrada. O OCR da chave já existia, porém a interface não o apresentava claramente como alternativa ao código de barras; o manipulador também fechava o scanner quando a leitura não continha uma chave válida.

### Arquivos e linhas

- `mobile/src/features/stock/inventory/screens/InventoryScannerScreen.tsx:80,170,221,273,313` — usa o formato CODE-128 e moldura horizontal somente em `accessKeyMode`, mantém o QR no scanner de inventário e identifica a leitura OCR como alternativa para os 44 caracteres impressos.
- `mobile/src/features/stock/inventory/screens/inventory-scanner/inventoryScanner.styles.ts:94` — adiciona a moldura horizontal para a chave.
- `mobile/src/features/stock/invoices/modals/invoice-import/InvoiceImportModal.tsx:89,122-132,164,229-230` — renomeia o fluxo para NF de entrada, informa código de barras e OCR e mantém o scanner aberto caso o código lido não resulte em uma chave válida.
- `mobile/src/features/stock/invoices/modals/invoice-import/InvoiceImportAccessKeySection.tsx:32,36,58` — atualiza o título, validação visível e acessibilidade para NF de entrada.
- `mobile/src/features/stock/invoices/modals/invoice-import/InvoiceImportXmlUploadSection.tsx:21,37` — identifica a entrada e informa o formato eletrônico aceito, modelo 55.
- `mobile/src/features/stock/invoices/screens/invoices-screen/InvoicesPageHeader.tsx:57,117` — atualiza o botão de importação e a busca.
- `mobile/src/features/stock/invoices/utils/inboundXmlParser.ts:41,50` — corrige as mensagens de erro do parser de XML da entrada.
- `shared-utils/lookupFormSchemas.ts:15,19` — atualiza mensagens dos schemas de XML e chave da entrada.
- `docs/fiscal/README.md:12` — adiciona esta correção às referências atuais.

### Solução e limites

O modo de chave agora lê CODE-128, padrão do código de barras da chave no DANFE, e usa uma moldura horizontal. Se a leitura falhar, o operador pode acionar “Ler chave impressa” para reconhecer a chave de 44 caracteres; uma leitura inválida mantém o scanner aberto. O scanner de inventário conserva sua configuração anterior. Os rótulos desta operação passam a dizer “NF de entrada”; “nota fiscal eletrônica” é escrito por extenso ao descrever o documento eletrônico.

### Validação

A seção 2 do [MOC 7.0, Anexo II — Manual de Especificações Técnicas do DANFE e Código de Barras](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-ii-manual-especificacoes-tecnicas-danfe-codigo-barras.pdf) especifica CODE-128C para o código de barras da NF-e. Os tipos instalados do `expo-camera` incluem `code128`; a configuração alterada se aplica somente a `accessKeyMode`. Não foram executados testes automatizados nem leitura em dispositivo físico. Nenhum XML, registro fiscal, banco de dados ou comunicação com a SEFAZ foi alterado.

## DANFE NFC-e A4 preenche a tabela de itens em todas as folhas

### Problema e sintomas

O DANFE A4 da NFC-e 65 podia deixar uma área grande sem uso abaixo dos itens. Em documentos com mais de uma folha, as folhas de continuação também precisavam usar o espaço disponível para a tabela.

### Causa raiz

`danfeNfceA4.ts` já definia o paginador que separa os itens por capacidade de cada folha, mas o script não era incluído no HTML retornado. Depois de ativá-lo, o preenchimento visual ainda consistia em uma única linha vazia esticada para ocupar o espaço; isso deixava a tabela sem a grade regular que dá continuidade à lista de itens no DANFE 55.

### Arquivos e linhas

- `erp/src/pages/utils/nfe/danfe/danfeNfceA4.ts:229-251,1501` — cria linhas vazias uniformes para preencher a área restante de cada folha que contém itens; o script de paginação é incluído no HTML antes do fechamento do `body`.
- `docs/fiscal/README.md:13` — adiciona esta correção às referências atuais.

### Solução e limites

O HTML executa o paginador depois de montar o documento. Ele divide os itens entre folhas, mantém o cabeçalho da tabela e calcula linhas vazias de altura uniforme (aproximadamente 4 mm cada) para completar a grade até o rodapé. A mesma regra é aplicada a todas as folhas que contêm itens, incluindo continuações. Dados, valores, QR Code e autorização continuam vinculados ao XML autorizado; o modelo 55 e o cupom de 80 mm não foram alterados.

### Validação

A inspeção confirmou que o script inline executa antes do evento `load` que inicia a impressão e que o preenchimento anterior criava apenas uma linha vazia. `git diff --check` não apontou erros. Não foram executados testes automatizados, navegador ou impressão física; a conferência visual em impressora e em diferentes navegadores permanece pendente. Nenhum dado, XML, banco ou comunicação com a SEFAZ foi alterado.

## Remoção do marcador legado do Bling dos pedidos

### Problema e sintomas

O contrato de pedidos ainda guardava `is_registered_in_bling` na tabela `orders`, no JSON de `order_data` e na RPC `save_order_transaction`. A remoção da integração Bling deixaria a gravação de pedidos quebrada se a coluna fosse removida sem atualizar a RPC e seus leitores/escritores.

### Causa raiz

O marcador era um campo residual da integração de importação e exportação Bling; nenhum fluxo atual precisa dele. A função transacional continuava incluindo a coluna em `INSERT`/`UPDATE`.

### Arquivos e linhas

- `supabase/migrations/20261023103833_remove_bling_and_settings_credentials.sql:1-2,56-59,61-155` — preserva snapshots antigos em vez de executar `UPDATE orders`, recria `order_list_items` sem a coluna mantendo `security_invoker`, proprietário e grants, remove a coluna física e limpa credenciais antigas de `public.settings` sem remover o identificador público `cscId`.
- `erp/src/pages/types/order.type.ts:99` — remove o campo do tipo `Order`.
- `erp/src/pages/utils/orderMapper/mapOrderFromDatabase.ts:16-21,124` — copia o JSON antes de sanitizar os dois nomes legados e grava o snapshot sem o estado Bling, sem modificar a linha de origem.
- `erp/src/pages/utils/orderMapper/orderMapperTypes.ts:30` — remove o campo do contrato do banco.
- `erp/src/pages/utils/orderPersistencePayload.ts:59-60,88` — remove o campo do payload físico e limpa caches antigos antes de salvar `order_data`.
- `erp/src/pages/utils/orderSyncQueries/orderSyncConstants.ts:11` — remove o campo da projeção usada nas consultas.
- `mobile/src/features/orders/services/mobileOrderListService.ts:26,167-172` — remove a coluna Bling da consulta e limpa o JSON legado antes de montar o item mobile.
- `erp/src/pages/utils/settings/migrations.ts:14-40` e `storage.ts:41-64` — eliminam segredos e configuração antiga do Bling das configurações/cache, sem apagar o `cscId` público.
- `erp/src/pages/utils/__tests__/orderMapper.test.ts:290`, `erp/src/pages/utils/__tests__/orderSnapshotResolution.test.ts:300` e `mobile/src/features/orders/services/mobileOrderListService.test.ts:181` — provam limpeza no mapeador, no payload salvo e na lista mobile.
- `erp/server/nfe/audit-order-edit.cjs:2345-2394` e `erp/server/nfe/audit-order-edit.cjs.map` — artefatos compilados regenerados sem o campo.
- `docs/fiscal/README.md:12` e `docs/fiscal/historico-correcoes-2026-10-23.md:58-97` — atualizam o índice fiscal e registram os guards que impediram a limpeza de snapshots, a migration aplicada e as validações remotas.
- `docs/integracoes/seguranca-integracoes-remocao-bling-2026-10-23.md:14,24-36` — registra a preservação das chaves históricas, o estado da publicação e o resultado da pós-verificação.

### Solução e limites

A migration falha antes de remover a coluna se a definição remota da RPC ou da view divergir dos trechos esperados. `order_list_items` é recriada sem o campo e mantém a configuração `security_invoker`, o proprietário e os grants atuais. A RPC deixa de ler/escrever a coluna e elimina os dois nomes legados quando pedidos forem salvos no futuro. Nenhuma linha antiga de `orders.order_data` é atualizada: a tentativa de limpeza ampla acionou as guardas de artefatos de teste e de devolução comercial (`RETURN_SOURCE_LINE_INVALID`), além de triggers fiscais/comerciais. Os marcadores antigos permanecem inertes para auditoria; nenhum snapshot fiscal, documento, evento, XML ou autorização é alterado.

Na leitura imediatamente anterior à aplicação, 316 pedidos tinham uma das chaves legadas em `order_data`. A pós-verificação confirmou que essas 316 cópias históricas foram preservadas. A auditoria recursiva das configurações não encontrou valores não vazios com nomes de token, segredo, senha, certificado ou chave de API após a limpeza.

O identificador público `cscId` permanece em `public.settings` e no formulário fiscal porque não é o segredo CSC; somente o token CSC e os dados do certificado são retirados do JSON compartilhado.

A publicação de produção foi concluída antes da migration. A migration aparece no histórico remoto como versão `20261023130851`, nome `20261023103833_remove_bling_and_settings_credentials`. A implantação de produção mais recente é `dpl_8BqN79XPkSLtVfuPkF6WeWWdzkAk`, `READY`, com os aliases `morantehub.vercel.app` e `morantehub.com`.

### Validação

- Build ERP aprovado e implantação Vercel de produção em `READY`; os erros de tipagem do candidato foram corrigidos antes da implantação atual.
- 293 testes ERP passaram em 23 arquivos; os testes focados do candidato passaram 92/92 em sete arquivos. O Playwright de leitura da Inbox passou 1/1 na porta `5173`, com gravações comerciais bloqueadas.
- Pós-verificação remota: coluna `orders.is_registered_in_bling` ausente; RPC sem referência à coluna; `order_list_items` sem a coluna, com `security_invoker=true`, proprietário `postgres` e grants de leitura para `anon`, `authenticated` e `service_role`; credenciais antigas e configuração Bling ausentes; `cscId` preservado; 316 snapshots históricos inalterados.

## NCM na conciliação de produtos ERP e app

### Problema e sintoma

Ao compartilhar no ciclo de paridade a gravação individual da conciliação de produtos, o campo NCM continuava pertencendo ao objeto JSON `products.fiscal`. Enviar somente `{ ncm }` em um caminho mobile novo descartaria campos fiscais existentes, como CSOSN e CEST. Não foi observada perda de dados; a correção preventiva foi conferida pelo contrato ERP e pelo payload do serviço comum.

### Causa raiz

A leitura e o merge do objeto fiscal estavam acoplados ao serviço de mutação ERP. A nova card mobile precisava usar exatamente a mesma operação, preservando chaves já persistidas e a validação compartilhada do NCM.

### Arquivos e linhas

- `shared-utils/productReconciliationMutations.ts:54-68` — consulta o campo fiscal antes da alteração, rejeita JSON de formato inesperado e aplica `{ ...fiscalAtual, ncm }` no update do produto.
- `erp/src/pages/App/Products/Reconciliation/services/reconciliationMutations.ts:81-84` e `mobile/src/features/products/services/mobileProductReconciliationService.ts:37-40` — ambos delegam à mesma função de gravação compartilhada.
- `mobile/src/features/products/screens/NativeProductReconciliationCard.tsx:67,91-98,359-367` — inicializa, valida/prepara e apresenta o NCM individual editado na card mobile.
- `erp/src/pages/App/Products/Reconciliation/services/reconciliationMutations.test.ts:56-66` — confere leitura, normalização do NCM e preservação de CSOSN/CEST no payload do card.
- `docs/fiscal/README.md:9`, `docs/produtos/paridade-erp-app.md:918-953` e `docs/forms/migracao-rhf-zod-2026-10-14.md:664-668` — indexam o registro e documentam a paridade, validação e limites da UI mobile.

### Solução, validação e limites

O schema de domínio transforma o NCM para oito dígitos; antes de gravar, o serviço lê `products.fiscal` e preserva as demais propriedades. A mutação só anuncia sucesso quando o registro atualizado é retornado. Vitest ERP: 30 testes aprovados em três arquivos; Vitest mobile: 8 testes aprovados em dois arquivos. TypeScript integral continua com diagnósticos globais fora do recorte. Os testes usam cliente mockado; nenhuma escrita remota, alteração de XML, emissão, migration ou deploy ocorreu. A validação visual e o runtime nativo permanecem pendentes, conforme o inventário de Produtos.

### NCM em lote compartilhado pela conciliação ERP e app — Ciclo 50

#### Problema e sintomas

A conciliação precisava aplicar NCM a vários produtos selecionados também no app. Uma implementação mobile independente que enviasse somente `{ ncm }` poderia substituir o JSON de `products.fiscal` e perder propriedades existentes como CSOSN e CEST. Não foi observada perda de dados; a correção preventiva foi comprovada nos payloads de teste.

#### Causa raiz

As mutações em lote estavam ligadas ao serviço ERP. O app não tinha ações nativas equivalentes e precisava usar o mesmo fluxo de leitura, merge fiscal e confirmação, além de receber a seleção completa de IDs filtrados antes da mutação.

#### Arquivos e linhas

- `shared-utils/productReconciliationBatchMutations.ts:29-133` — serviço comum para fornecedor, categoria, NCM e atributo; linhas 78-99 leem o NCM fiscal atual e gravam `{ ...fiscal, ncm }` após confirmação do registro.
- `erp/src/pages/App/Products/Reconciliation/services/reconciliationMutations.ts:6-15` e `mobile/src/features/products/services/mobileProductReconciliationService.ts:34-51` — wrappers ERP e mobile delegam ao serviço compartilhado.
- `shared-utils/reconciliationFormSchemas.ts:11-20,55-73` — contratos de lote e validações contextuais de fornecedor, categoria e atributo.
- `shared-utils/productReconciliationQueries.ts:249-305` — resolução dos produtos do filtro em blocos de 500, ordenados por UUID.
- `mobile/src/features/products/screens/NativeProductReconciliationBatchModal.tsx:78-81,153-193` e `NativeProductReconciliationScreen.tsx:252-307` — validação RHF/Zod, confirmação, prazo, estado incerto e envio das operações.
- `erp/src/pages/App/Products/Reconciliation/services/productReconciliationBatchMutations.test.ts:36-93` e `mobile/src/features/products/services/mobileProductReconciliationService.test.ts:201-230` — preservação de campos fiscais e confirmação no caminho comum ERP/mobile.
- `docs/fiscal/README.md:9`, `docs/produtos/paridade-erp-app.md:940-970` e `docs/forms/migracao-rhf-zod-2026-10-14.md` — referências do índice, inventário de paridade e cobertura RHF/Zod.

#### Solução implementada

O ERP e o app agora usam `applyProductReconciliationBatchWithClient`. Para NCM, o serviço lê cada `products.fiscal`, valida que o JSON é um objeto, mantém suas chaves e altera somente `ncm`; confirma o registro retornado antes de informar sucesso. A seleção global usa uma consulta compartilhada que enumera todos os IDs em blocos ordenados. A tela nativa valida os valores parseados antes do serviço e, se o timeout tornar o resultado incerto, impede uma segunda submissão na sessão. O fluxo não transmite documento, altera XML ou executa operação fiscal na SEFAZ.

#### Testes e limites

Vitest: **71 testes aprovados em 9 arquivos** de consulta, lista, card, formulários, esquemas e serviço ERP/mobile; incluem o merge dos campos CSOSN/CEST no NCM em lote. TypeScript completo ERP/mobile terminou com código 2 por diagnósticos globais; a filtragem não encontrou diagnóstico nos arquivos da conciliação ou schemas compartilhados. Playwright visível redirecionou a rota para `/login`; não houve validação autenticada, Expo Web ou runtime Android/iOS. Os testes usam cliente Supabase mockado; nenhuma escrita remota, alteração de XML, emissão à SEFAZ, migration ou deploy ocorreu.

## App mobile: inicialização e fotos offline no fluxo de entrega

### Problema e sintomas

O Expo Web montava o bundle, mas o app ficava em tela branca por falha ao resolver um utilitário ERP e por um `ReferenceError` ao carregar o modal de vínculos de NF de entrada. No fluxo de entrega, estados eram enfileirados sem rede, mas a foto de comprovação ficava como URI `file://`/`blob:`; o sincronizador não fazia upload antes de enviar o pedido, então a evidência não virava uma URL utilizável.

### Causa raiz

O Metro não observava a pasta de utilitários ERP importada por `shared-utils`. O conteúdo do modal de vínculos importava o barrel `index.ts`, que também exportava o modal wrapper, formando um ciclo. A fila offline guardava apenas o patch JSON e não tinha uma etapa de mídia; `DELIVERY_START_SERVICE` também faltava na união de eventos aceita pelo TypeScript.

### Arquivos e linhas

- `mobile/metro.config.js:5-9` — adiciona as raízes compartilhada e de utilitários ERP ao Metro.
- `mobile/src/features/stock/invoices/modals/inbound-mappings/InboundInvoiceMappingsModalContent.tsx:14-18` — importa dependências diretamente, sem entrar no barrel cíclico.
- `mobile/src/features/stock/invoices/modals/inbound-mappings/types.ts:1-2` — reexporta o tipo usado pelos cards de vínculo.
- `mobile/src/services/offline/offlineTypes.ts:8-13` e `mobile/src/services/offline/offlineSyncManager.ts:89-98` — tipam e aplicam a etapa `DELIVERY_START_SERVICE`.
- `mobile/src/services/offline/offlineSyncManager.ts:36,67,299-300,379-440` — corrige tipos do patch e envia evidências locais antes da operação de sincronização.
- `mobile/src/repositories/SyncQueueRepository.ts:97-103` — persiste o payload atualizado na fila SQLite.
- `mobile/src/features/orders/services/deliveryProofRules.ts:1-7` (novo) — classifica URIs locais e descreve a metadata temporária da foto.
- `mobile/src/features/orders/services/deliveryProofUploadService.ts:1-104` (novo) — copia fotos nativas para `documentDirectory`, prepara upload assinado com timeout e distingue indisponibilidade temporária.
- `mobile/src/features/orders/components/delivery/UnattendedModal.tsx:16-126` — mantém foto local quando a rede cai e passa metadata ao registro.
- `mobile/src/features/orders/services/deliveryFlowService.ts:7-8,291-339,385-430` — impede URI local em escrita direta e enfileira metadata somente para sincronização; tipa os patches de retrocesso.
- `mobile/src/features/orders/screens/delivery-preparation/DeliveryPreparationContent.tsx:30`, `DeliveryPreparationModals.tsx:23-29`, `deliveryPreparation.types.ts:2,70-75` e `useDeliveryFlowActions.ts:109,200-217,252-268` — alinha os contratos das ações, do formulário e dos callbacks.
- `mobile/src/features/orders/services/__tests__/deliveryFlowService.test.ts:137-161` — cobre a proteção contra persistir URI local no pedido remoto.
- `mobile/e2e/delivery-flow.spec.ts:339-340,475-500,582,607-612` — simula queda/retorno de rede e verifica upload e URL remota.
- `docs/fiscal/README.md` e este histórico — registram a referência vigente.

### Solução implementada

No aparelho, a foto selecionada é mantida em `documentDirectory` quando o upload fica indisponível. A fila conserva a URI e metadata local; ao reconectar, solicita credenciais, envia o arquivo, grava a URL remota de volta no SQLite e só então chama `sync_entity_operation`. A metadata e a URI local são removidas do patch enviado. A tela também não faz escrita direta em `orders` quando ainda tem uma URI local.

### Testes e limites

Vitest: **25 testes em 3 arquivos aprovados**, incluindo as etapas de entrega offline, regras das etapas e a proteção da URI local. Playwright: **10 testes aprovados** (5 Mobile Chrome e 5 Desktop Chrome), cobrindo entrega online com pagamentos/retrocessos, percurso offline com foto e reconexão, cancelamento pelo mapa e validações dos modais. As rotas de pedidos, RPC e upload usam fixtures interceptadas; não houve escrita no Supabase operacional nem upload real. O typecheck completo do app continua com diagnósticos preexistentes fora do recorte, incluindo logística, produtos e tipos do módulo de estoque; a filtragem dos arquivos de entrega, fila offline e imports corrigidos não apontou erro. A evidência não cobre reinício do processo Android com foto pendente nem sincronização real do backend.

## Descrição oficial do NCM após digitação manual no cadastro de produto

### Problema e sintomas

No cadastro de produto do app, digitar manualmente um NCM completo atualizava `fiscal.ncm`, mas não limpava `fiscal.ncmDescription` ao trocar o código nem copiava para o JSON fiscal a descrição oficial já carregada do catálogo. A descrição era visível no cartão do catálogo, então o operador podia salvar texto fiscal antigo ou vazio apesar da tela mostrar o texto atual. No ERP, a troca limpa a descrição anterior e o carregamento do catálogo completa uma descrição ausente.

### Causa raiz técnica

`ProductFormFiscalTab` mantinha a busca e a mutação do código separadas e, no caminho de digitação direta, atualizava somente `ncm`. O efeito de `fetchMobileNcmCatalogEntry` preenchia a apresentação do cartão, sem sincronizar uma descrição ausente para o formulário proprietário. A lógica de limpeza/preenchimento existia somente no seletor ERP.

### Arquivos e linhas modificados

- `shared-utils/productFiscalNcm.ts:1-35` — centraliza limpeza de descrição obsoleta e preenchimento condicional da descrição oficial para o código ainda selecionado.
- `erp/src/pages/App/Products/components/tabs/fiscal/ProductNcmSelector.tsx:4-8,62-72,185-190,208-213,314-320` — usa as funções compartilhadas na edição, consulta e seleção do NCM.
- `mobile/src/features/products/modals/tabs/ProductFormFiscalTab.tsx:1-2,16-20,116-119,170-194,209-223,280-298,352-365` — aplica as mesmas funções ao código manual e, após a consulta do catálogo, grava a descrição somente se o operador ainda tiver aquele código selecionado e a descrição estiver vazia.
- `erp/src/pages/App/Products/components/tabs/fiscal/ProductNcmSelector.test.tsx:12-22,140-163` — verifica troca de código, preservação de CEST e atualização da descrição oficial.
- `docs/fiscal/README.md` e este histórico — registram a referência vigente.

### Solução e validação

As operações puras de NCM agora vivem em `shared-utils` e são consumidas pelos dois clientes. Ao digitar outro código, ambos limpam a descrição anterior; quando a consulta retorna a descrição oficial, o mobile a grava somente para a seleção manual ainda ativa e não substitui uma descrição já preenchida. A escolha por sugestão continua gravando o código e a descrição oficial diretamente. Não foram alterados classificação tributária, NCM do produto, payload de emissão, XML, banco de dados ou serviços fiscais remotos.

Vitest ERP: **7 testes aprovados** em `ProductNcmSelector.test.tsx`, incluindo o fluxo de troca manual. TypeScript integral ERP e mobile termina com código 2 por diagnósticos globais já existentes; a filtragem não encontrou erros em `ProductNcmSelector.tsx`, `ProductFormFiscalTab.tsx` ou `productFiscalNcm.ts`. `git diff --check` passou. A tela autenticada não foi aberta neste ciclo, a sessão Playwright permanece limitada pelo login de acesso e não há renderer React Native configurado; comparação visual, Expo Web e aparelho ficam pendentes. Nenhuma consulta remota, gravação, transmissão à SEFAZ ou implantação foi executada.

## Busca textual de NCM com código anterior selecionado

### Problema e sintomas

Ao editar um produto com NCM selecionado e substituir o conteúdo do campo por uma busca descritiva (por exemplo, `cama casal`), o ERP grava a consulta no estado fiscal, limpa a descrição do código anterior e mantém os demais campos, como CEST. O campo mobile mostrava a busca, mas mantinha o código anterior no objeto fiscal enviado pelo formulário; o cartão antigo continuava associado até a seleção ou limpeza explícita. Assim, o usuário podia ver a busca textual enquanto o formulário ainda salvava outro NCM.

### Causa raiz técnica

`ProductFormFiscalTab` mantinha `ncmSearch` independente de `formData.fiscal.ncm` para todo texto que não fosse um código completo. O ERP, por sua vez, passa busca textual pelo helper compartilhado `updateProductFiscalNcmCode`, que atualiza `ncm` e remove `ncmDescription` quando os códigos normalizados divergem. O serviço mobile já inclui `productData.fiscal` no payload de salvamento, então o valor antigo persistia.

### Arquivos e linhas modificados

- `mobile/src/features/products/modals/tabs/ProductFormFiscalTab.tsx:280-299` — sincroniza a busca não vazia que não seja um NCM completo ao rascunho fiscal pelo helper compartilhado.
- `erp/src/pages/App/Products/components/tabs/fiscal/ProductNcmSelector.test.tsx:165-182` — cobre texto de busca, descarte da descrição anterior e preservação do CEST no contrato ERP de referência.
- `docs/produtos/paridade-erp-app.md:1123-1136`, `docs/forms/migracao-rhf-zod-2026-10-14.md` e `docs/fiscal/README.md` — registram a evidência e os limites deste recorte.

### Solução e validação

O campo mobile agora usa `updateProductFiscalNcmCode` para manter `formData.fiscal.ncm` coerente com a consulta visível. A função já preserva as demais chaves fiscais e limpa `ncmDescription` quando a consulta deixa de corresponder ao código anterior. O caminho de código completo e o de seleção de resultado continuam distintos e não foram alterados. O campo segue sob o formulário proprietário `ProductFormScreen` e seu resolver real; sem alteração de regra tributária, emissão, XML, backend ou banco.

Vitest ERP: **8 testes aprovados** em `ProductNcmSelector.test.tsx`, incluindo o estado de substituição por descrição. TypeScript mobile encerrou com código 1 devido a diagnósticos globais; a filtragem não encontrou apontamentos nos arquivos alterados do recorte. `git diff --check` passou. Playwright autenticado não foi executado neste ciclo e o último estado visual disponível está em `/login`; não há renderer React Native configurado. Expo Web e aparelho permanecem pendentes. Nenhuma gravação remota, transmissão à SEFAZ ou implantação ocorreu.

## Importação idempotente de XML da NF-e de entrada

### Problema e sintomas

Ao importar um XML com uma chave de acesso já cadastrada, o ERP bloqueava qualquer arquivo repetido e o app móvel rejeitava a importação. Isso também impedia completar uma NF-e resumida ou antiga quando o novo XML trazia itens ou outros campos ainda ausentes. O operador não recebia um resultado distinto para “mesmos dados” e “dados novos”.

### Causa raiz técnica

Os fluxos tratavam toda chave repetida como erro, sem comparar os dados fiscais do XML com o registro existente. O caminho do ERP que verificava a duplicidade também podia interpretar uma falha na consulta como ausência da nota e prosseguir para a gravação.

### Arquivos e linhas modificados

- `shared-utils/inboundInvoiceXmlMerge.ts:1-261` — mescla somente campos ausentes e itens faltantes pela chave da nota e pelo número de item; preserva valores existentes e sinaliza valores fiscais divergentes.
- `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundDocumentImport.ts:14,82-178` — classifica a importação como nova, sem alterações ou atualização; mostra progresso e exige confirmação do servidor ao atualizar registro existente.
- `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundDocumentImport.test.tsx:11,88-100` — atualiza a expectativa existente de duplicidade para o resultado sem alterações; o teste não foi executado.
- `erp/src/pages/App/Stock/InboundInvoices/modals/InboundDuplicateKeyAlertModal.tsx:58-112` — explica que uma divergência sem dados novos bloqueou a atualização e que o cadastro foi preservado.
- `erp/src/pages/utils/inboundNfe/services/inboundInvoicesQueryService.ts:369-470` — interrompe a importação quando não consegue conferir o cabeçalho ou os itens já cadastrados e prioriza a leitura remota sobre o cache.
- `mobile/src/services/stock/invoices/inboundInvoiceImportService.ts:53-253` — lê o cadastro e os itens existentes, preserva fornecedor, status, recebimento e vínculos, mescla os dados novos e retorna o resultado da operação.
- `mobile/src/services/stock/invoices/inboundInvoiceMappers.ts:153` — inclui o ambiente fiscal no payload persistido.
- `mobile/src/features/stock/invoices/modals/invoice-import/InvoiceImportModal.tsx:27-145` — mostra a etapa atual da importação.
- `mobile/src/features/stock/invoices/screens/invoices-screen/useInvoiceScreenActions.ts:90-145` — apresenta mensagens diferentes para nota nova, atualização e nota já cadastrada sem dados novos.
- `docs/fiscal/README.md:486` e `docs/fiscal/historico-correcoes-2026-10-23.md:573-600` — registram a regra atual de importação.

### Solução e validação

ERP e app agora mantêm uma única NF-e por chave de acesso. Se o XML trouxer itens ou preencher campos vazios, o sistema mescla esses dados sem apagar campos, itens, vínculos de produto, fornecedor ou estado de recebimento já existentes. A interface informa que a nota cadastrada está sendo atualizada e confirma a conclusão. Se não houver dados novos, informa que a NF-e já está cadastrada sem alterações. Se houver somente valores fiscais divergentes, a operação é bloqueada; se também houver dados novos, a mesclagem os salva e avisa que os valores divergentes foram preservados. Falhas ao conferir a duplicidade no ERP também interrompem a operação em segurança.

Foi feita revisão estática dos caminhos de importação e persistência e verificada a preservação dos campos operacionais nas duas plataformas. Nenhum teste automatizado, build, consulta/gravação no Supabase, chamada à SEFAZ ou implantação foi executado neste ciclo.

## Import fiscal no app móvel bloqueava o bundle Android

### Problema e sintomas

A exportação Android do app falhava ao resolver `shared-utils/fiscalIdentifiers` a partir da tela de importação da NF-e. Isso impedia gerar uma atualização OTA para o aplicativo, embora a falha fosse anterior a qualquer execução fiscal.

### Causa raiz técnica

O import relativo tinha seis níveis `../`, mas o arquivo consumidor está em `mobile/src/features/stock/invoices/screens/invoices-screen/` e o helper fica na raiz do repositório em `shared-utils/`. Eram necessários sete níveis para chegar à raiz.

### Arquivos e linhas modificados

- `mobile/src/features/stock/invoices/screens/invoices-screen/useInvoiceScreenActions.ts:7` — corrigido o caminho do import de `normalizeFiscalIdentifier`.
- `docs/fiscal/README.md` — adicionada esta referência atual.
- `docs/fiscal/historico-correcoes-2026-10-23.md` — registrado o sintoma, a causa e a validação.

### Solução e validação

O import agora resolve o helper já compartilhado; não houve mudança em regras de identificação, validações fiscais, payloads, emissão, XML, banco ou chamadas à SEFAZ. `npx expo export --platform android --output-dir %TEMP%\morante-map-fix-export` concluiu com sucesso, gerando um bundle Android de 9,2 MB a partir de 3.669 módulos.

## Importação XML da NF-e usa o esquema atual dos itens

### Problema e sintomas

Ao importar um arquivo XML no ERP, a verificação de duplicidade falhava com `column inbound_invoice_items.inbound_invoice_id does not exist`. A gravação subsequente também usava nomes de colunas antigos e não compatíveis com a tabela normalizada, impedindo persistir os itens da nota.

### Causa raiz técnica

Os logs do Supabase registraram a consulta HTTP 400 e a coluna inexistente. A inspeção somente leitura do schema `public` confirmou que `inbound_invoice_items` usa `invoice_id`, `item_number`, `product_code`, `product_description`, `unit_cost`, `total_cost` e `raw_item`; também confirmou o índice único `(invoice_id, item_number)`. O ERP ainda consultava e gravava usando `inbound_invoice_id`, `item_index` e outros nomes legados. O app móvel já usa o esquema canônico. Não era uma migration pendente.

### Arquivos modificados

- `erp/src/pages/utils/inboundNfe/services/inboundInvoicesQueryService.ts:448-449` — lê itens por `invoice_id` e ordena por `item_number`.
- `erp/src/pages/utils/inboundNfe/services/inboundInvoicesMapper.ts:35-195` — normaliza os nomes atuais da tabela, incluindo `raw_item`, descrição, código, valores, tributos e vínculos de produto.
- `erp/src/pages/utils/inboundNfe/services/inboundInvoicesMutationService.ts:7,126-170` — grava os itens com as colunas canônicas e confirma a persistência por `invoice_id`/`item_number`.
- `docs/fiscal/README.md:19` — adiciona esta correção às referências atuais.
- `docs/fiscal/historico-correcoes-2026-10-23.md:679-701` — registra o diagnóstico, as alterações e a validação.

### Solução e validação

A consulta e o upsert do ERP agora usam o mesmo esquema e a mesma chave única já usados pelo app móvel. A leitura também converte os campos normalizados para o formato de item esperado pelo ERP, permitindo que notas existentes com itens sejam conferidas e mescladas ao XML. Nenhuma tabela, migration ou dado remoto foi alterado; não foram enviadas consultas/eventos fiscais à SEFAZ.

Foram consultados somente a estrutura e os índices da tabela e os logs relacionados ao erro no Supabase operacional. `git diff --check` passou. Testes automatizados e build não foram executados neste ciclo.

## NF de entrada: bloqueio de exclusão e validação de destinatário

### Problema e causa raiz

A tela de entrada oferecia remoção no menu do ERP e do app móvel, e os serviços chamavam `DELETE` diretamente. No Supabase operacional, a tabela também concedia `DELETE` e `TRUNCATE` aos papéis da API e tinha uma política `FOR ALL`; portanto, esconder apenas o botão não protegeria o registro. Nenhum limite comum verificava se o CNPJ destinatário correspondia ao CNPJ configurado da empresa. Além disso, o parser da distribuição automática preenchia o destinatário de `resNFe` com um CNPJ fixo e o XML completo recorria a esse valor fixo quando o grupo `<dest>` não estava presente.

### Arquivos modificados

- `shared-utils/inboundInvoiceRecipient.ts:3-32` — normaliza e compara os CNPJs e traduz os erros de integridade do banco.
- `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundDocumentImport.ts:100` e `erp/src/pages/utils/inboundNfe/services/inboundInvoicesMutationService.ts:8-17,31,89,154-160` — valida o destinatário antes da importação/cache, recusa exclusão e traduz a rejeição do trigger.
- `erp/src/pages/App/Stock/InboundInvoices/components/InboundInvoiceActionsMenu.tsx:1-48`, `InboundInvoicesTable.tsx:1-53` e `screens/InboundInvoicesScreen.tsx:1-202` — remove ação, confirmação e callback de exclusão.
- `erp/src/pages/utils/inboundNfe/services/inboundMutationsService.ts:8-9` — bloqueia também a função de exclusão legada não exportada pela fachada ativa.
- `erp/src/pages/App/Stock/InboundInvoices/components/InboundInvoicesTable.test.tsx:20-56`, `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundDocumentImport.test.tsx:19` e `erp/src/pages/utils/inboundNfe/__tests__/inboundInvoiceKeyPersistence.test.ts:16,47-53` e `inboundMappingConfirmation.test.ts:7-10` — remove prop obsoleta, alinha fixtures ao CNPJ empresarial e atualiza a expectativa de exclusão; nenhum teste foi executado.
- `mobile/src/services/stock/invoices/inboundInvoiceImportService.ts:13-15,69-80,247-251` — confere o destinatário com `settings.data.companyCnpj` e apresenta erro legível se o guard do banco recusar a gravação.
- `mobile/src/services/stock/invoices/inboundInvoiceQueryService.ts:96-97`, `features/stock/invoices/modals/invoice-actions/InvoiceActionModal.tsx:1-77`, `screens/invoices-screen/useInvoiceScreenActions.ts:1-165` e `InvoicesScreenContent.tsx:75-205` — bloqueia o serviço e remove botão e confirmação de exclusão.
- `supabase/functions/sefaz-inbound-sync/index.ts:240,612-617` e `utils/xmlParser.ts:38-39,63-65,131-168` — atribui o CNPJ da distribuição a `resNFe`; documentos completos usam o CNPJ declarado no XML, sem inventar destinatário padrão.
- `supabase/migrations/20261024013614_protect_inbound_invoice_integrity.sql:1-64` — cria trigger `SECURITY INVOKER` para validar `settings.data.companyCnpj`, rejeitar `DELETE` e revogar `DELETE`/`TRUNCATE`.
- `docs/fiscal/README.md:9` — registra esta referência atual.

### Solução e validação

ERP e app móvel não exibem opção para apagar NF de entrada. Os serviços também recusam exclusão caso sejam chamados por outro caminho. A validação no cliente ocorre antes de qualquer importação manual; no Supabase, o trigger cobre importações automáticas via `distNSU`/`consNSU`, gravações diretas e mudanças futuras do destinatário. O limite compara o XML completo com o CNPJ fiscal configurado e usa o CNPJ da sessão de distribuição quando o retorno contém apenas `resNFe`.

A migration `20261024013614` foi aplicada ao Supabase operacional. A leitura posterior do catálogo confirmou o trigger ativo em `INSERT`/`UPDATE`/`DELETE`, função `SECURITY INVOKER` com `search_path` vazio e ausência de privilégios `DELETE`/`TRUNCATE` para `anon`, `authenticated` e `service_role`. Nenhuma linha de nota, configuração ou XML foi lida. Nenhum teste ou build foi executado. O código das telas e da Edge Function está somente no checkout e ainda requer publicação/deploy para aparecer fora deste ambiente. Nenhuma consulta, Ciência, manifestação ou outro evento foi enviado à SEFAZ.

## Atalho para gerar recebimento pela NF-e e guia prático do estoque

### Necessidade e comportamento

Na lista de NF-e de entrada, o menu de ações não oferecia um caminho direto para iniciar um recebimento. A tela de Recebimentos já aceitava a chave da NF-e pela URL e abria o formulário preenchido, então o atalho foi conectado a esse fluxo existente.

“Gerar recebimento” aparece somente quando o usuário pode acessar Recebimentos, a nota ainda não foi recebida, há chave e fornecedor vinculados, a NF-e contém itens completos e cada item tem produto vinculado. O clique abre o formulário de recebimento preenchido com a nota; não confirma nem movimenta estoque. O operador ainda confere a entrega física e confirma o recebimento. Resumo sem itens e notas já recebidas não oferecem a ação.

O PDF em linguagem de usuário reúne os caminhos existentes no submenu Estoque. A página 3 detalha a ordem da chegada da carga: conferir com a NF-e entregue ou, sem NF-e, com o pedido de compra; importar o XML pelo modal; abrir Gerenciar vínculos; pesquisar produtos existentes antes de usar “Cadastrar” (cadastro rápido), que já vincula o novo produto; e gerar o recebimento no rodapé depois de vincular fornecedor e todos os itens. O formulário abre preenchido com fornecedor, produtos, quantidades e preços de custo. O guia também lembra de lançar frete cobrado por fora sem duplicar despesas já incluídas na NF-e. As demais páginas explicam confirmação do recebimento, compras, inventário, movimentações, indisponibilidades e etiquetas. O guia está acessível pelo item “Guia prático do estoque” no submenu Estoque.

### Arquivos modificados

- `erp/src/pages/App/Stock/InboundInvoices/components/InboundInvoiceActionsMenu.tsx:7,28-42` — inclui a ação condicionada “Gerar recebimento”.
- `erp/src/pages/App/Stock/InboundInvoices/components/InboundInvoicesTable.tsx:13-24,52-68` — exige permissão de recebimentos, NF não recebida, fornecedor/chave presentes, itens completos e cada produto vinculado.
- `erp/src/pages/App/Stock/InboundInvoices/screens/InboundInvoicesScreen.tsx:2,32-36,138-141,187-188` — confere permissão e encaminha a chave para o formulário existente.
- `erp/src/components/layout/nav/menus/StockNavMenu.tsx:138-154` — adiciona o acesso ao guia no submenu Estoque.
- `erp/public/guias/guia-pratico-estoque.pdf` e `output/pdf/guia-pratico-do-estoque.pdf` — cópias idênticas do guia para acesso no aplicativo e entrega; a página 3 foi atualizada com o fluxo de conferência, cadastro e geração do recebimento descrito acima.
- `docs/fiscal/README.md` — adiciona esta referência atual.

### Validação e limites

A página 3 da versão atualizada foi renderizada e revisada visualmente; o PDF foi conferido com oito páginas A4, sem criptografia, os trechos-chave foram extraídos e as duas cópias foram comparadas byte a byte. `git diff --check` passou; testes automatizados, build e deploy não foram executados. Não houve alteração no banco, no XML fiscal ou em chamadas à SEFAZ.

## Vinculações pendentes abrem gerenciar vínculos e o modal oferece gerar recebimento

### Problema e sintomas

O selo “Vinculações Pendentes” era apenas informativo, e o modal “Gerenciar vínculos” não oferecia um caminho para iniciar o recebimento depois da conciliação dos produtos.

### Causa raiz

A abertura do modal existia apenas na ação dos três pontinhos. O formulário de recebimento já podia ser aberto com a chave da NF-e, mas o status pendente não acionava esse gerenciamento e o modal não apresentava a ação.

### Solução

O selo “Vinculações Pendentes” agora abre o gerenciamento por clique em desktop e no layout de cards. O rodapé do modal inclui “Gerar recebimento”. O botão fica cinza e desativado enquanto falta permissão de Recebimentos, fornecedor vinculado, chave de acesso, XML completo ou vínculo de qualquer item; também bloqueia nota já recebida, carregamento/salvamento e vínculo com confirmação incerta. Ao passar o mouse ou focar o botão desativado, o tooltip explica o requisito pendente. Quando habilitado, abre o formulário preenchido pela NF-e e aguarda a conferência e confirmação da pessoa usuária; não movimenta o estoque sozinho.

### Arquivos e validação

- `erp/src/pages/App/Stock/InboundInvoices/components/InboundInvoicesTable.tsx:8-9,55-67,176-195,276-293` — torna clicáveis os selos pendentes nos layouts de tabela e card e reutiliza a elegibilidade do recebimento.
- `erp/src/pages/App/Stock/InboundInvoices/inboundReceiptEligibility.ts:1-32` — centraliza a regra de vínculos completos, os requisitos e a explicação para cada bloqueio.
- `erp/src/pages/App/Stock/InboundInvoices/modals/ManageInboundInvoiceMappingsModal.tsx:15-23,141-147,303-333` — acrescenta o botão no rodapé, estado desativado e tooltip acessível por mouse e teclado.
- `erp/src/pages/App/Stock/InboundInvoices/screens/InboundInvoicesScreen.tsx:208-216` — passa a permissão e conecta a ação do modal ao fluxo existente de recebimentos.
- `docs/fiscal/README.md:10` e este histórico:751-777 — atualizam o índice vigente e documentam esta correção.

`git diff --check` passou. Testes automatizados, build e implantação não foram executados. Não houve alteração em banco, XML fiscal, regras fiscais ou chamadas à SEFAZ.

## Impressão de etiquetas de identificação pela NF-e ou pelo recebimento

### Necessidade e comportamento

O fluxo de recebimento não oferecia impressão contextual das etiquetas de identificação. Agora, nos três pontinhos da NF-e, a ação aparece quando o fornecedor e todos os itens estão vinculados e o usuário tem permissão para imprimir etiquetas. Nos três pontinhos do recebimento, a mesma ação permanece visível, porém desativada com explicação enquanto o registro for rascunho, estiver estornado ou não tiver itens vinculados; fica ativa somente no status `received`.

Ao clicar, o modal de seleção abre com os produtos e as quantidades já preenchidos. Nome, código e dados da variação vêm do cadastro atual consultado pelo ID do vínculo, não da descrição ou dos valores fiscais da linha da NF-e. A quantidade da NF-e ou do recebimento define quantas unidades de estoque serão etiquetadas; itens repetidos do mesmo produto/variação são agrupados. Depois da conferência no modal, confirmar abre a tela existente de impressão.

O guia prático explica que cada unidade de estoque recebe uma etiqueta, não cada caixa. A etiqueta deve ser colada no volume 1; se isso não for possível, a equipe deve adotar e manter o mesmo volume principal. Um guarda-roupa dividido em três caixas continua sendo um item de estoque e recebe uma etiqueta. Para evitar gerar novas identidades para as mesmas unidades, a equipe escolhe apenas um dos caminhos de impressão para cada entrada. A identificação individual por volume fica para uma etapa futura: caso seja criada, os volumes do mesmo item precisarão compartilhar o mesmo QR para não contar o item várias vezes, e a quantidade de caixas poderá mudar sem aviso da fábrica.

### Arquivos e validação

- `erp/src/pages/App/Products/components/labelPrintSelection.ts:3-14` e `components/modals/product/LabelPrintSelectionModal.tsx:20-25,55-115,128-145` — aceitam uma seleção contextual de vários produtos, pré-selecionam as quantidades recebidas e avançam para a categoria correta de impressão.
- `erp/src/pages/App/Stock/LabelPrinting/services/identificationLabelPrefillService.ts:1-80` — valida e agrupa referências, consulta os produtos e variações vinculados em uma chamada com timeout e prepara os dados atuais do catálogo.
- `erp/src/pages/App/Stock/InboundInvoices/components/InboundInvoiceActionsMenu.tsx:7-45`, `InboundInvoicesTable.tsx:18-20,28-32,64-77` e `screens/InboundInvoicesScreen.tsx:6,16-18,40,62-63,150-177,228-229,290-296` — apresenta a ação apenas com vínculo completo e encaminha os itens vinculados ao modal de seleção.
- `erp/src/pages/App/Stock/Receipts/components/ReceiptsActionsMenu.tsx:14,31-74`, `ReceiptCard.tsx:17,32,146`, `ReceiptsTableRow.tsx:19,37,124`, `ReceiptsTable.tsx:16,34,99` e `screens/ReceiptsScreen.tsx:3,22-24,27,35-37,113-134,211,228,300-306` — apresenta a ação nos cards e na tabela; exige status `received` para habilitar.
- `output/pdf/guia-pratico-do-estoque.pdf` e `erp/public/guias/guia-pratico-estoque.pdf` — revisam a página 4 e permanecem como cópias do mesmo guia de oito páginas.
- `docs/fiscal/README.md:10` e este histórico:775-794 — adicionam esta referência atual e documentam a mudança.

A página 4 atualizada foi renderizada e revisada visualmente; as duas cópias do PDF foram comparadas. `git diff --check` foi executado. Testes, build e implantação não foram executados. Não houve alteração no banco, em documentos fiscais armazenados ou em chamadas à SEFAZ.

## Responsável logado no inventário do ERP e vínculos da NF-e no app

### Problema e causa raiz

No ERP, o formulário de novo inventário abria sem responsável selecionado, embora o app já use o perfil logado como responsável inicial. No app, o selo “Vinculações pendentes” era apenas informativo; o card não encaminhava a ação ao modal de conciliação. Os estados de NF-e também não mostravam os ícones correspondentes aos status do ERP.

### Solução

O escopo do inventário no ERP agora recebe o ID de `profile` e o usa como valor inicial do responsável. O seletor existente continua editável, e a validação do formulário continua conferindo a pessoa escolhida antes de iniciar o inventário.

No app, tocar no selo “Vinculações pendentes” abre “Gerenciar vínculos” e não abre os detalhes do card. Os selos de XML incompleto, disponibilidade, recebimento e vínculo completo agora mostram ícones com as cores já alinhadas ao ERP. O cadastro rápido de produto já existente foi conferido: preenche fornecedor, custo e descrição a partir do item da NF-e e vincula o novo cadastro depois de salvo; seu fluxo não precisou de alteração.

O módulo de Recebimentos do app continua voltado à conferência física de recebimentos criados no ERP; este ciclo não adicionou criação de rascunho de recebimento no app. As regras do ERP para “Gerar recebimento” permanecem vinculadas à NF-e completa, fornecedor e produtos vinculados, permissão de Recebimentos e nota ainda não recebida. A remoção de exclusão da NF de entrada e a validação do destinatário existentes não foram alteradas.

### Arquivos modificados

- `erp/src/pages/App/Stock/Inventory/modals/InventoryScopeModal.tsx:3,35,50` — usa o perfil autenticado como responsável inicial.
- `erp/src/pages/App/Stock/Inventory/hooks/useInventoryScopeBuilder.ts:13,22` — recebe o responsável padrão sem impedir a edição do estado pelo seletor.
- `erp/src/pages/App/Stock/Inventory/modals/InventoryScopeModal.test.tsx:10-12,39-52` — cobre pré-seleção e troca do responsável antes da confirmação.
- `mobile/src/features/stock/invoices/components/invoice-card/InvoiceCard.tsx:6-12`, `InvoiceCardContent.tsx:3-12,59-113,201-231` e `screens/invoices-screen/InvoicesScreenContent.tsx:149` — conecta o selo pendente ao modal e adiciona ícones aos status da lista.
- Este histórico e `docs/fiscal/README.md` — registram a atualização e mantêm o índice vigente sincronizado.

### Validação e limites

`npm run test:unit --prefix erp -- src/pages/App/Stock/Inventory/modals/InventoryScopeModal.test.tsx` — 1 arquivo, 20 testes aprovados. `git diff --check` passou nos arquivos alterados. O TypeScript completo do app móvel terminou com diagnósticos preexistentes em outros caminhos, sem erro nos arquivos da lista de NF-e alterados neste ciclo. Não foi feito build nativo nem navegação autenticada via Playwright. Nenhum dado remoto, schema, XML fiscal ou chamada à SEFAZ foi alterado.

## Cadastro rápido direto nos vínculos da NF-e de entrada

- **Problema:** a ação Cadastrar abria o formulário completo de produto, embora o operador já tivesse os dados do item da nota e quisesse concluir o cadastro rapidamente.
- **Causa comprovada:** `useInboundInvoiceQuickRegister` apenas preparava os dados e ativava `isProductModalOpen`; o segundo caminho em `InboundNfeItemsSection` repetia essa preparação sem aguardar confirmação do vínculo.
- **Solução:** opções Cadastrar produto simples e Cadastrar variação em produto existente, com confirmação Cadastrar e vincular. O fluxo passa pelos resolvers reais RHF/Zod, usa os serviços de produto existentes, confirma o cadastro e a associação de código do fornecedor e aplica o vínculo ao item. Cadastro novo começa com saldo zero e preço de venda zero, sem publicar no catálogo; o custo e a unidade vêm da nota. A entrada no estoque continua exclusiva da confirmação do recebimento. Variação nova preserva o pai e as variações existentes. A segunda chamada no recebimento reutiliza o mesmo proprietário.
- **Proteções:** fornecedor, item e contexto conferidos antes dos efeitos; código do fornecedor obrigatório e consulta prévia para não duplicar associação existente; bloqueio de clique/fechamento em andamento; limite total de 45 segundos; produto já salvo reutilizado se apenas a leitura de confirmação falhar; gravação incerta exige conferência antes de nova criação. Não se altera o XML fiscal.
- **Arquivos:** `shared-utils/operationsFormSchemas.ts` (seleção), `shared-utils/inboundProductLinkFormSchemas.ts` (payload), `erp/src/pages/App/Stock/InboundInvoices/modals/QuickRegisterVariationModal.tsx`, `hooks/useInboundInvoiceQuickRegister.ts`, `hooks/useInboundInvoiceItemsReview.ts`, `components/InboundQuickRegister.test.tsx` e `erp/src/pages/App/Stock/Receipts/components/InboundNfeItemsSection.tsx`. As localizações e a validação visual constam no fechamento desta entrega abaixo.
- **Validação já executada:** Vitest em três arquivos, 49 testes aprovados, incluindo 25 casos de cadastro direto, validação, falha, contexto alterado, duplicidade e timeout. Serviços de persistência simulados; não comprova escrita no PostgreSQL remoto. Nenhum produto, recebimento ou evento SEFAZ real foi criado nesta validação.
- **Complemento da persistência de variações:** o serviço `productVariationActionsService.ts` gravava a linha da variação e somente o horário do pai; o custo próprio e as opções de sincronização vivem em `technical_specs.variationDetails` e desapareciam ao recarregar. O serviço agora preserva as demais especificações, grava esses detalhes e o indicador de múltiplas variações, e propaga erro dessa etapa. Não envia saldo nem preço do pai na atualização. Dois novos testes verificam o round-trip no mapper e a falha; junto dos mappers, 13 testes aprovados, totalizando 62 testes focados distintos. Sem migration e sem gravação real de negócio.

### Etiquetas de produto simples e guia ilustrado do estoque

- **Problema e causa:** a preparação de etiquetas procurava uma linha de variação, mas `processProductData` só desdobrava produtos marcados com múltiplas variações. Produtos simples também têm uma variação física e a referência salva na NF-e pode apontar para ela. Isso tornava a seleção indisponível para esses produtos. A anotação de tipo também omitia `variationId`.
- **Solução:** o serviço de preparação desdobra as variações disponíveis para resolver a identidade exata solicitada, inclusive a variação única, mantém o agrupamento das quantidades e usa o cadastro atual. Não altera as descrições da NF-e nem gera identificação física durante a leitura. O teste da tabela passa o callback atual de completar XML e usa happy-dom, evitando uma dependência nativa de canvas ausente no ambiente jsdom.
- **Guia de usuário:** substituída a edição de oito páginas por 24 páginas ilustradas com capturas reais, ampliações, setas e números. Inclui o novo cadastro direto, XML incompleto, salvar vínculos, habilitação de recebimento, conferência da carga, custos, etiquetas por unidade, compras, inventário, histórico e avarias. Corrigida a orientação antiga de lançamento manual em Movimentações: o fluxo conectado é uma consulta; a correção é feita na origem. A criação de fornecedor/produto e a confirmação de entrada não foram executadas em dados reais para produzir as fotos. Exemplos de menus, contagem e seleção de etiquetas usam componentes reais com dados fictícios e callbacks sem gravação.
- **Artefatos:** fonte e roteiro em `docs/estoque/guia-pratico/gerar_guia.py`, instruções em `README.md`, prévias isoladas em `previews.tsx`, capturas e coordenadas em `imagens/`, manifesto de geração em `manifesto.json`. Os PDFs servido e de entrega são `erp/public/guias/guia-pratico-estoque.pdf` e `output/pdf/guia-pratico-do-estoque.pdf`. Não há rota de prévia de documentação na navegação do ERP.
- **Prova:** oito casos específicos do serviço de etiquetas passaram, incluindo produto simples, variação ausente, agrupamento, quantidade inválida e prazo de consulta. A seleção de etiquetas, adaptador de NF para recebimento e proprietários de leitura/impressão passaram em outros 19 casos; três testes da tabela passaram após ajuste do ambiente. As provas usam Vitest/RTL com serviços simulados, não demonstram persistência remota. A revisão visual e a verificação do PDF servido estão registradas no fechamento abaixo.

### Fechamento e localizações desta entrega

O cadastro rápido foi ampliado em paralelo com categoria confirmada, reaproveitamento de duplicidades, dados próprios da variação e composição manual. As páginas 8 e 9 foram alinhadas aos controles atuais (Novo produto simples, Nova variação de produto existente e Mais opções). Os 49 testes da primeira rodada referem-se ao contrato inicial; não representam certificação global da ampliação posterior.

| Arquivo | Linhas de referência da alteração |
|---|---|
| `shared-utils/operationsFormSchemas.ts` | 92: contrato do seletor rápido; ampliado depois com as escolhas adicionais |
| `shared-utils/inboundProductLinkFormSchemas.ts` | 14: payload de cadastro rápido, descrição e código obrigatórios |
| `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceQuickRegister.ts` | 24: proprietário compartilhado; 67: comando validado de criação/vínculo |
| `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceItemsReview.ts` | 148: contexto da nota e callback de gravação passados ao proprietário |
| `erp/src/pages/App/Stock/InboundInvoices/modals/QuickRegisterVariationModal.tsx` | 9: imports de tipo separados para evitar erro 500 no compilador do Vite; 133: formulário com resolver real |
| `erp/src/pages/App/Stock/Receipts/components/InboundNfeItemsSection.tsx` | 45: reutilização do cadastro/vínculo direto; 104: seletor integrado |
| `erp/src/pages/utils/productService/productVariationActionsService.ts` | 13: mapper dos detalhes; 163: persistência e conferência do erro dos metadados, preservando saldo e preço do pai |
| `erp/src/pages/utils/productService/productVariationQuickRegistration.test.ts` | 1: regressões de custo próprio e falha de persistência |
| `erp/src/pages/App/Stock/InboundInvoices/components/InboundQuickRegister.test.tsx` | 1: cobertura inicial de criação direta; posteriormente ampliada junto do contrato |
| `erp/src/pages/App/Stock/LabelPrinting/services/identificationLabelPrefillService.ts` | 62: resolução da variação física mesmo em produto simples |
| `erp/src/pages/App/Stock/LabelPrinting/services/identificationLabelPrefillService.test.ts` | 1: regressões de referência, quantidade e timeout |
| `erp/src/pages/App/Stock/InboundInvoices/components/InboundInvoicesTable.test.tsx` | 1: happy-dom; 31 e 53: callback atual de importação |
| `docs/estoque/guia-pratico/gerar_guia.py` | 1: fonte editável do tutorial e geração das duas cópias |
| `docs/estoque/guia-pratico/README.md`, `previews.tsx`, `imagens/capturas.json`, `manifesto.json` | 1: manutenção, exemplos sem gravação, coordenadas e inventário das imagens |
| `erp/public/guias/guia-pratico-estoque.pdf`, `output/pdf/guia-pratico-do-estoque.pdf` | PDFs completos, 24 páginas, sem linhas textuais de código |
| `docs/fiscal/README.md`, `docs/forms/migracao-rhf-zod-2026-10-14.md` | Referências atuais e registro de cobertura da primeira rodada |

A rodada final dos serviços de etiquetas, persistência dos detalhes de variação, seleção de etiquetas, leitura local, tabela e adaptador de recebimento passou: **32 testes em sete arquivos**, com Vitest/RTL e serviços simulados. A checagem global de tipos do checkout tinha diagnósticos fora desse recorte; não foi declarada aprovada. Não houve migration, consulta à SEFAZ, evento fiscal, criação real de produto ou confirmação de estoque nesta entrega. As capturas por Playwright usam desenvolvimento na porta 5173 e as chamadas de mutação/eventos foram bloqueadas durante a documentação.

**Conferência do PDF entregue:** 24 páginas renderizadas em PNG pelo Poppler e revisadas visualmente em grades e detalhes ampliados, incluindo campos, categoria, menus, custos, contagem e volume principal. Foram utilizadas 22 capturas, com círculos, contornos e setas vetoriais. Não houve corte de texto, sobreposição ou página vazia na versão conferida. A leitura de `http://localhost:5173/guias/guia-pratico-estoque.pdf` retornou HTTP 200 e `application/pdf`; seus bytes foram comparados com o arquivo público e a cópia de entrega e coincidiram. O link foi conferido na UI do submenu Estoque. A ampliação adicional do cadastro rápido tem validação própria em andamento; os testes iniciais não foram reapresentados como certificação desse novo contrato.
