# Histórico de correções fiscais — 23/10/2026

Este registro complementa o índice de vigência. A primeira seção descreve o fluxo atual de recuperação de lacunas da distribuição. As seções seguintes preservam etapas anteriores e devem ser lidas como histórico quando substituídas pelo índice vigente. Nenhuma alteração desta correção emite ou modifica documentos fiscais.

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

`distNSU` continua sendo o mecanismo de descoberta. O sistema conserva o NSU de cada `docZip`, registra lacunas observadas e consulta um NSU por chamada `consNSU`, em ordem, com intervalo global por CNPJ de cinco minutos: até 12 chamadas por hora, abaixo do teto oficial de 20 chamadas pontuais por hora. Uma recuperação é tentada após uma distribuição bem-sucedida; outras pendentes são retomadas a cada cinco minutos enquanto a tela de NF de entrada estiver aberta no ERP ou no app. Se a SEFAZ responder cStat 656, o sistema aguarda uma hora. O botão “Consultar no Portal” permanece. Foram removidas das interfaces a consulta direta `consChNFe` e a ação “Buscar XML” de nota existente. A Edge Function conserva o handler antigo `consChNFe` temporariamente por compatibilidade com versões antigas do cliente; os serviços atuais do ERP e do app móvel não o chamam. O download local do XML que já está salvo permanece disponível. Resumos `resNFe` continuam sem itens; o XML completo atualiza o resumo sem ser substituído por uma resposta posterior incompleta.

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
