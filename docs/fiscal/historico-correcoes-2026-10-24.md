# Histórico de correções fiscais — 24/10/2026

## Aviso de comunicação separado de lote pendente de reconciliação na Ciência automática

### Problema e sintomas

Quando o navegador não recebia a resposta da chamada de Ciência automática, a tela apresentava “Lote de Ciência pendente de reconciliação”. Esse estado é reservado às respostas do servidor que confirmam eventos sem resultado individual seguro; uma falha de comunicação não confirma que exista um evento registrado para reconciliar.

### Causa raiz comprovada

O `catch` do serviço ERP convertia timeout ou falha de rede em `pending: true`, e o componente associava qualquer `pending` a um lote confirmado pelo servidor. O serviço mobile retornava erro genérico sem distinguir a ausência de resposta do estado de reconciliação informado pela API.

### Solução e arquivos alterados

- `erp/src/pages/utils/inboundNfe/services/sefazInboundSyncService.ts:36,274–280` — representa falha de comunicação como `communicationUnconfirmed`, mantendo a retomada automática e sem classificá-la como lote pendente.
- `erp/src/pages/App/Stock/InboundInvoices/components/SefazSyncStatusBadge.tsx:92–95` — apresenta “Comunicação sem confirmação” para ausência de resposta e reserva “Lote de Ciência pendente de reconciliação” para pendência confirmada na resposta da API.
- `mobile/src/services/stock/stockSefazService.ts:28–40` e `mobile/src/features/stock/invoices/components/SefazSyncStatusBadge.tsx:90–93` — aplicam a mesma distinção e mantêm a retomada automática.
- `docs/estoque/guia-pratico/gerar_guia.py:400–406` e os dois PDFs do guia (página 7) — orientam a conferir o Histórico Fiscal antes de tentar registrar a Ciência novamente após uma falha de comunicação.
- `docs/estoque/guia-pratico/README.md:40`, `docs/fiscal/README.md:9` e este histórico (`:3–25`) — registram a orientação e a correção.

O aviso informa que o processamento pode ter sido iniciado e não autoriza repetir o evento sem conferir o Histórico Fiscal. A API e a guarda de idempotência não foram alteradas.

### Validação e limites

Inspeção estática confirmou que falhas de comunicação ficam separadas do campo `pending` retornado pela API e que ambos os clientes mantêm o backoff de retomada existente. `git diff --check` passou nos arquivos textuais alterados. O guia foi gerado em 27 páginas; a página 7 foi renderizada e revisada, e as duas cópias têm o mesmo SHA-256. O acesso pelo submenu Estoque continua apontando para `/guias/guia-pratico-estoque.pdf`. Não executei testes automatizados. Nenhuma transmissão à SEFAZ, gravação remota ou migration foi realizada.

## Busca do produto pai no cadastro rápido da NF-e

### Problema e sintomas

Ao buscar “Guarda-roupa Monza” no campo Produto pai, o nome não aparecia mesmo havendo um produto ativo “Guarda Roupa Monza 4 Portas c/ Pés” no catálogo.

### Causa raiz comprovada

O filtro local do autocomplete normalizava acentos e caixa, mas mantinha hífens. Assim, o token “Guarda-roupa” não correspondia ao trecho “Guarda Roupa” do nome cadastrado. O construtor da consulta já normalizava o hífen para espaço, de modo que a divergência acontecia na comparação dos nomes após a busca.

### Solução e arquivos alterados

- `erp/src/components/productAutocompleteUtils.tsx:42–46` — adiciona normalização de hífens e sublinhados como separadores para comparação de nomes.
- `erp/src/components/hooks/useProductAutocomplete.ts:11,109,142–165` — aplica essa normalização aos nomes do produto pai e das variações; mantém a comparação de SKU e código com o normalizador original e preserva os filtros de fornecedor, status ativo e rascunho.
- `docs/fiscal/README.md:9` e este histórico (`:3–21`) — registram a correção e suas validações nas referências atuais.

### Validação e limites

A consulta somente leitura no ERP pelo navegador mostrou o produto ativo “Guarda Roupa Monza 4 Portas c/ Pés”, que usa espaço no lugar do hífen digitado; a importação do módulo atualizado no navegador confirmou que os termos normalizados encontram esse nome. Também há um cadastro exato “Guarda Roupa Monza” em rascunho e desativado; ele continua indisponível como produto pai pelas validações existentes. Uma consulta somente leitura ao projeto operacional (`hkoxhourxwlddgsfdgws`) encontrou zero novos registros nas tabelas `public.inbound_manifestation_events` e `public.sefaz_inbound_xml_consult_attempts` entre 23:08 e 23:15:30 UTC de 24/10/2026. Não registrei produto nem vínculo de fornecedor. Não executei testes automatizados.

## Botão Cadastro rápido em Gerenciar Vínculos da NF-e de entrada

### Problema e sintomas

Em Gerenciar Vínculos, o botão da linha sem produto associado abria o fluxo de cadastro rápido, mas mostrava “Cadastrar”, um ícone de mais e uma pílula verde. O usuário pediu que a ação ficasse identificada como “Cadastro rápido”, em amarelo, com um raio preto.

### Causa raiz comprovada

O rótulo, ícone e cores estavam definidos diretamente no botão condicional de `InboundItemLinkHeader`; o fluxo acionado já era o callback existente de cadastro rápido.

### Solução e arquivos alterados

- `erp/src/pages/App/Stock/InboundInvoices/components/InboundItemLinkHeader.tsx:109–137` — muda o rótulo para “Cadastro rápido”, aplica formato de pílula amarela, remove transformação para caixa alta e usa raio preto. O callback e as condições para exibir a ação permanecem os mesmos.
- `docs/estoque/guia-pratico/gerar_guia.py:375` — atualiza a instrução da página 9 para o nome atual do botão.
- `docs/estoque/guia-pratico/README.md` — registra o trecho atualizado na página 9.
- `erp/public/guias/guia-pratico-estoque.pdf` e `output/pdf/guia-pratico-do-estoque.pdf` — cópias geradas pelo mesmo script e conferidas como idênticas.
- `docs/fiscal/README.md` e este histórico — registram a mudança nas referências atuais.

### Validação e limites

O gerador do guia conferiu páginas, texto e igualdade dos dois PDFs; a página 9 foi renderizada e revisada visualmente. Não rodei testes automatizados: a alteração no ERP é apenas visual, e o fluxo/callback não mudou. Não houve gravação remota, migration ou operação na SEFAZ.

## Cadastro rápido da NF-e: categoria manual e dados informativos

### Problema e sintomas

O modal de cadastro rápido duplicava o NCM, que já aparece no resumo “Produto da nota fiscal”, e apresentava um campo editável de custo de aquisição. Também sugeria a categoria por IA ou regra local, exigia uma confirmação por checkbox e oferecia restaurar os dados da NF-e. O operador pediu seleção manual da categoria e remoção desses controles.

### Causa raiz comprovada

O modal combinava dados informativos da nota com campos editáveis e uma etapa de sugestão/confirmação de categoria. Além do helper de sugestão por IA/regra, a preparação do produto ainda chamava um resolvedor automático quando criava o produto pai. O custo e o NCM também alimentam internamente o cadastro e a resolução de divergência fiscal; remover seus inputs não exige apagar esses dados derivados da NF-e nem o resumo já existente.

### Solução e arquivos alterados

- `erp/src/pages/App/Stock/InboundInvoices/modals/QuickRegisterVariationModal.tsx:92,112–165,239–265,309–328,349–352,413–423,452` — remove os inputs de custo e NCM, mantém o NCM no resumo da nota e nos controles de divergência da variação; remove a sugestão automática, a confirmação da categoria e o botão de restaurar; deixa a categoria inicialmente vazia para seleção manual; aplica borda inferior aos campos editáveis.
- `erp/src/pages/App/Stock/InboundInvoices/services/inboundProductPreparationService.ts:12–47,82–99,198–219,232 (trechos removidos/alterados); 55,146 (estado atual)` — remove o helper de sugestão e as resoluções automáticas na preparação de produto; a criação usa somente `categoryId` selecionado, ou nenhuma categoria se ausente.
- `shared-utils/operationsFormSchemas.ts:92–140` — remove `categoryConfirmed` e sua validação; continua exigindo categoria escolhida e preserva o resolver real do formulário.
- `erp/src/pages/App/Stock/InboundInvoices/components/InboundQuickRegister.test.tsx:48,85–100,150–164,170` — atualiza os casos existentes para categoria manual e ausência de controles removidos; não executado nesta revisão.
- `erp/src/pages/App/Stock/InboundInvoices/services/inboundProductPreparationService.test.ts:14,64–77` — atualiza a expectativa para categoria escolhida manualmente e ausência de chamadas ao resolvedor automático; não executado nesta revisão.
- `docs/estoque/guia-pratico/gerar_guia.py:375–386` e `docs/estoque/guia-pratico/README.md:36,42` — atualiza as instruções para custo médio do estoque, CMV na venda e escolha manual da categoria; remove captura obsoleta da confirmação automática.
- `erp/public/guias/guia-pratico-estoque.pdf` (páginas 9–10) e `output/pdf/guia-pratico-do-estoque.pdf` — PDFs gerados; 26 páginas, 21 capturas utilizadas e cópias idênticas.
- `docs/fiscal/README.md:10,16` e este histórico (`:25–50`) — registram a revisão atual.

O campo de custo removido era apenas uma edição do cadastro. A origem do custo operacional continua sendo o estoque: as entradas atualizam o custo médio, e a venda materializa o CMV conforme o custo médio vigente no momento da baixa, seguindo `docs/decisoes/adr-002-cmpm-e-cmv-materializado.md`. O app móvel mantém seu formulário de custo, que é uma interface distinta.

### Validação e limites

Revisão estática e `git diff --check` concluídos; nenhuma suíte foi executada. O gerador verificou paginação e texto, produziu 26 páginas com 21 capturas e confirmou que as duas cópias são idênticas. As páginas 9 e 10 foram renderizadas e revisadas visualmente, sem cortes ou sobreposições. Não houve gravação remota, migration ou operação na SEFAZ.

## Campo CST/CSOSN consistente no cadastro de produto

### Problema e sintomas

Ao escolher um código CSOSN na aba Fiscal do cadastro mobile, a interface atualizava `fiscal.cst` e também acrescentava `fiscal.csosn`. O cadastro ERP atualiza somente `fiscal.cst`, que é o campo de domínio declarado como CST ou CSOSN. Como os dois clientes persistem o objeto fiscal completo, o app podia gravar uma chave adicional ausente no payload ERP.

### Causa raiz comprovada

`ProductFormFiscalTab.updateFiscalCst` escrevia `csosn: value` enquanto `ProductFiscalTab.updateFiscalCst` escrevia somente `cst` e `cest`. `FiscalInfo` declara `cst?: string` (“or CSOSN”) e não declara um campo próprio `csosn`; os mappers ERP e mobile enviam o JSON fiscal completo. Ambos os handlers também mantinham a mesma regra de CEST: preservar o valor nos códigos `201`, `202` e `500`, limpar para os demais.

### Solução e arquivos alterados

- `shared-utils/productFiscalCst.ts:1–20` — centraliza a atualização do código e do CEST, preservando os demais campos do JSON fiscal.
- `erp/src/pages/App/Products/components/tabs/fiscal/ProductFiscalTab.tsx:14,42–47` — passa a usar a regra compartilhada.
- `mobile/src/features/products/modals/tabs/ProductFormFiscalTab.tsx:22,224–229` — passa a usar a mesma regra e deixa de adicionar `csosn` nas novas alterações do campo.
- `erp/src/pages/utils/productFiscalCst.test.ts:1–38` — cobre preservação/limpeza do CEST, dados fiscais não relacionados e uma chave `csosn` legada já existente.
- `docs/fiscal/README.md:9`, este histórico `:3–25`, `docs/produtos/paridade-erp-app.md:2976–2987` e `docs/geral/roadmap_pendente.md:421–423` — registram a correção, evidência e limites.

O helper preserva chaves legadas que já estejam no JSON fiscal; não houve migração nem remoção de dados históricos. Nenhuma regra tributária, operação de emissão, XML ou integração SEFAZ mudou.

### Validação e limites

Vitest pelo runner ERP: **7/7** em `productFiscalCst.test.ts` e `ProductFiscalTab.test.tsx`. O primeiro arquivo confere a regra compartilhada; o segundo cobre a aba ERP existente. Não foi feita validação visual autenticada do cadastro de Produtos nem execução do formulário nativo. Nenhuma migration, gravação remota ou operação na SEFAZ foi realizada.

## Edição de pedido não invalida a versão carregada pelo autosave do rascunho

### Problema e sintomas

Ao alterar a data de um pedido de venda em rascunho e salvar pelo modal de edição, a gravação falhava com `O pedido mudou durante a conferência fiscal. Reabra a edição para revisar os dados atuais.`

### Causa raiz comprovada

O modal carregava `updatedAt` do pedido e passava esse valor como versão esperada para a atualização otimista. Ao mesmo tempo, o hook habilitava o autosave para rascunhos existentes; a alteração da data disparava esse autosave sem versão esperada e atualizava `orders.updated_at`. O botão Salvar continuava usando o `updatedAt` antigo do pedido carregado, então a RPC versionada corretamente recusava a gravação com `ORDER_VERSION_CONFLICT`.

### Solução e arquivos alterados

- `erp/src/pages/App/SalesOrder/hooks/useSalesOrderForm.ts:68–72,239–243,292` — adiciona a opção `autoSaveExistingDrafts` (habilitada por padrão) e permite ao chamador desativar o autosave somente para pedidos existentes.
- `erp/src/pages/App/SalesOrder/modals/OrderEditModal.tsx:34` — desativa o autosave de rascunhos existentes no modal; mudanças, inclusive a data, são persistidas pelo salvamento explícito com a versão carregada.
- `docs/fiscal/README.md:9` e `docs/fiscal/historico-correcoes-2026-10-24.md:3–23` — registram a correção vigente.

O controle otimista de concorrência permanece ativo; a alteração remove a escrita automática concorrente do modal sem enfraquecer a proteção contra edições externas. O autosave dos demais fluxos de rascunho continua habilitado por padrão.

### Validação e limites

Inspeção estática rastreou a opção até a condição do hook, o salvamento explícito e a comparação versionada que gera `ORDER_VERSION_CONFLICT`. Testes automatizados não foram executados nesta sessão. Nenhuma migration, gravação no banco remoto ou operação na SEFAZ foi realizada.

## Pagamento na entrega e status Verificar nas novas NF-e

### Problema e sintomas

Na emissão de NF-e de venda, o status `Verificar` bloqueava a determinação fiscal por ser tratado como não confirmado. Já `Pendente` continuava sendo tratado como pagamento a prazo, embora a interface apresente esse estado como “Pendente - na entrega” para pedidos com entrega. O usuário informou que a NF só será entregue depois que o cliente pagar.

### Causa raiz comprovada

`classifyOrderPaymentSettlement` só classifica status iniciados por “pago” como recebidos, status iniciados por “pendente” como pendentes e os demais — inclusive `Verificar` — como não confirmados. `resolveNormalSalePayments` bloqueava pagamentos não confirmados e gerava `indPag=1`/cobrança para os pendentes. Em `BodyRow.tsx`, a opção persistida é `Pendente`; o texto “na entrega” é apresentado conforme `deliveryMethod === 'delivery'`.

### Solução e arquivos alterados

- `api/nfe/fiscalSnapshot.ts` — declara o campo opcional tipado `paymentSettlementPolicy`; a ausência do campo identifica snapshots históricos, e o campo participa do hash persistido.
- `api/nfe/normal-sale/normalEmissionDispatcher.ts` — inclui `NF_HANDED_OVER_AFTER_PAYMENT` no snapshot criado no servidor, antes da determinação e persistência.
- `api/nfe/normal-sale/payments.ts` — quando a política está presente, status `Verificar` e `Pendente` de pedidos com entrega contam como recebidos exclusivamente para a NF, exceto quando o meio é Promissória. Promissórias sempre permanecem pendentes/a prazo (`indPag=1`). Para os demais meios assumidos como recebidos, `indPag` passa a `0` (à vista), os valores e meios de pagamento registrados são preservados e não se cria vencimento/cobrança para essas linhas. Uma data de pagamento só é incluída se houver status `Pago` e o meio não for Promissória.
- `api/nfe/normalSaleRuleSet.ts`, `api/nfe/fiscalXmlAudit.ts` e `api/nfe/orderEditFiscalAudit.ts` — já passam o snapshot imutável ao resolvedor; o novo campo faz a emissão e as auditorias usarem a mesma política. Snapshots antigos sem o campo continuam usando os status registrados.
- `docs/fiscal/README.md` e este histórico — registram a regra nas referências atuais.

O [MOC 7.0, Anexo I, grupo YA](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf) define `indPag=0` como pagamento à vista e `indPag=1` como pagamento a prazo; `tPag` continua identificando o meio de pagamento. A regra segue a premissa operacional informada pelo usuário, não consulta comprovante bancário ou adquirente e não altera o status nem o saldo comercial do pedido. O snapshot continua com `schemaVersion=1` e o ruleset aceito pelo RPC; o campo é criado pelo servidor e fica coberto pelo hash do próprio snapshot. Documentos e tentativas já preparados não são reescritos.

### Validação e limites

Inspeção estática conferiu a criação server-side da política, sua participação no snapshot e a regra compartilhada de auditoria; `git diff --check` passou. Testes automatizados e validação XSD não foram executados nesta sessão. Nenhum XML foi preparado/transmitido, nenhuma emissão foi feita na SEFAZ e nenhum dado fiscal ou migration foi alterado no banco remoto.

## Retentativa automática do XML completo após Ciência aceita

### Problema e sintomas

Depois que a Ciência 210210 era registrada, o sistema consultava a chave uma vez. Quando a SEFAZ devolvia somente `resNFe` ou nenhum documento, a nota permanecia sem itens e aquela chave deixava de ser consultada automaticamente. Além disso, a configuração que desativa o envio automático de novas Ciências também encerrava a fila de XML para notas que já tinham uma Ciência registrada.

### Causa raiz comprovada

`selectPendingInboundXmlConsults` excluía para sempre qualquer chave com uma linha em `sefaz_inbound_xml_consult_attempts`, sem distinguir uma tentativa que retornou resumo de um XML completo salvo. Além disso, a API respondia `hasMore: false` e sem `retryAfter` após a tentativa incompleta; o temporizador da interface encerrava a fila. O handler também retornava antes de consultar a fila de XML quando `autoInboundScienceEnabled` estava desligado, embora essa configuração devesse controlar somente novos eventos 210210.

### Solução e arquivos alterados

- `api/nfe/inboundXmlConsultQueue.ts:12–85` — mantém elegíveis apenas notas ainda em `resNFe` com Ciência registrada; tenta chaves novas primeiro e torna a última tentativa elegível novamente após 15 minutos; calcula o próximo horário mesmo quando a tentativa ainda não venceu.
- `api/nfe/inbound-manifestation.ts:39–169` — depois de `consChNFe`, confirma se o XML completo foi realmente salvo antes de registrar `full_received`; respostas ainda incompletas ficam pendentes e programam nova tentativa em 15 minutos. Quando nenhuma consulta está vencida, devolve o próximo `retryAfter` para a interface manter o temporizador ativo após reabrir a tela.
- `api/nfe/inbound-manifestation.ts:452–455,457–584` — deixa a busca do XML de notas já manifestadas funcionar mesmo com o envio automático de novas Ciências desligado; carrega o horário da última tentativa, prioriza consultas vencidas e informa o próximo vencimento da fila.
- `docs/fiscal/README.md:9,35` e este registro — atualizam a referência vigente e identificam o comportamento da primeira versão como histórico.
- `docs/estoque/guia-pratico/gerar_guia.py:358–364`, `docs/estoque/guia-pratico/README.md:40` e os dois PDFs do guia — mantêm as instruções para o operador alinhadas ao funcionamento do ERP.

As consultas continuam limitadas pela reserva já existente de uma consulta direta por CNPJ a cada cinco minutos. O sistema não envia Confirmação da Operação automaticamente para tentar obter o XML. A fila depende da tela de NF de entrada aberta no ERP ou no app.

### Validação e limites

Revisão estática do fluxo, `git diff --check` nos arquivos desta correção e build fiscal local para validar o bundle do backend. Não foram executados testes automatizados, não houve chamada de consulta à SEFAZ nem transmissão de evento fiscal e nenhum dado/migration do Supabase operacional foi alterado. A correção está no checkout local; não foi publicada em produção.

## NF de saída integrada ao menu Vendas e remoção do atalho de relatório CSV

### Problema e sintomas

O menu Vendas ainda separava a NF de saída sob o cabeçalho “Fiscal”, e o relatório CSV permanecia disponível nos menus desktop e mobile.

### Causa raiz

`SalesNavMenu` mantinha um grupo “Fiscal” para a NF de saída e uma seção de relatórios; o `MobileNav` repetia o cabeçalho “FISCAL” e oferecia “Relatório CSV” como link.

### Solução e arquivos alterados

- `erp/src/components/layout/DesktopNav.tsx:71` — atualiza a descrição interna do menu Vendas.
- `erp/src/components/layout/nav/menus/SalesNavMenu.tsx:14–86` — remove o cabeçalho Fiscal e o atalho “Relatório de vendas / Exportação CSV”; mantém a NF de saída no menu Vendas e preserva a permissão fiscal existente.
- `erp/src/components/layout/MobileNav.tsx:181–202,336–343,398–404,546–557` — remove o cabeçalho FISCAL e o link “Relatório CSV”; mantém “NF de saída” em Vendas e preserva o controle de acesso por rota. A categoria Vendas deixa de aparecer para perfis com apenas a permissão do relatório removido.
- `erp/src/components/layout/hooks/useDesktopNavPermissions.ts:39–48,112–121` — deixa de contar a permissão do relatório removido como acesso ao menu Vendas.
- `docs/fiscal/README.md:9` — adiciona esta correção às referências atuais; este registro está em `docs/fiscal/historico-correcoes-2026-10-24.md:3–23`.

### Validação e limites

Inspeção estática confirmou que a NF de saída continua vinculada à rota `/fiscal-documents`, protegida por `viewFiscal`, e que os menus desktop/mobile não oferecem mais o atalho do relatório CSV. `git diff --check` passou. Nenhum teste automatizado foi executado nesta alteração. A rota e a funcionalidade do relatório continuam existentes para acesso direto; somente os atalhos nos menus foram removidos. Nenhum dado fiscal, XML, banco ou comunicação com a SEFAZ foi alterado.

## Cadastro rápido de produtos na NF-e de entrada

### Problema e sintomas

Em **Gerenciar vínculos**, o cadastro rápido anterior preparava um produto simples ou uma variação usando os dados da linha, mas não resolvia o vínculo fiscal completo. Não oferecia composição manual, escolha de NCM para uma variação, revisão de duplicidades por GTIN/nome ou reuso explícito do cadastro localizado. A variação recebia a descrição da NF como nome, e uma variação virtual de produto simples podia deixar de ser materializada quando se acrescentava a segunda.

### Causa raiz comprovada

A implementação anterior tinha somente os modos `SIMPLE` e `EXISTING_PARENT`; `prepareExistingParentNewVariation` acrescentava a variação sem nome completo nem regra de NCM. `mapDbVariations` herdava o objeto fiscal inteiro do pai, sem uma exceção específica para NCM. O fluxo não consultava o mapeamento do código do fornecedor, o GTIN ou produtos de nome semelhante antes de criar. A validação padrão de variações tratava todas as características variáveis como obrigatórias e não rejeitava o mesmo nome completo entre irmãs. Por fim, a preparação do pai copiava a projeção do produto simples sem materializar uma variação virtual como linha com UUID.

### Solução

O modal real de cadastro rápido usa `useZodForm`/`zodResolver` e oferece produto simples, variação de produto existente e produto composto em **Mais opções de cadastro**. Nome, custo, NCM e fornecedor começam com os dados da NF; uma categoria existente é sugerida por IA ou regra local e exige confirmação. Restaurar repõe os valores sugeridos pela NF. Produto composto exige pelo menos dois componentes distintos, escolhidos manualmente com quantidades; o conteúdo do XML nunca determina os componentes.

Ao adicionar variação, o fluxo aceita produto simples, materializa/preserva sua variação virtual, herda os campos globais e usa o complemento para compor um nome completo único. Características são exibidas conforme a configuração do pai e somente as obrigatórias bloqueiam a operação. Uma divergência de NCM oferece os três destinos: salvar só na variação, atualizar pai e variação, ou manter o pai. `syncNcm` guarda a exceção junto dos detalhes JSON já existentes; o restante dos dados fiscais continua herdado.

Código do fornecedor (`cProd`) e GTIN exatos interrompem nova criação e permitem reutilizar o cadastro encontrado; um vínculo legado sem variação identificada pode ser reutilizado quando o produto tem uma única variação. O GTIN usa `cEAN` e recorre a `cEANTrib` quando o primeiro está vazio ou `SEM GTIN`. Semelhança apenas por nome exibe os cadastros e exige revisão. A operação tem trava contra clique repetido e progresso idempotente: um produto já confirmado é reutilizado após falha posterior, e uma gravação incerta bloqueia uma segunda criação até conferência. Produto novo fica oculto do catálogo digital, com estoque zero; o cadastro não lança estoque e mantém os dados do XML intactos. Criar o produto e aplicar o vínculo ao item acontecem na mesma ação; o vínculo do fornecedor é conferido antes de confirmar o item da nota.

### Arquivos e linhas relevantes

- `shared-utils/operationsFormSchemas.ts:92–165` — modos, validações de cadastro, NCM, características, nomes e composição.
- `shared-utils/inboundProductLinkFormSchemas.ts:6–35` e `shared-utils/inboundQuickRegisterRules.ts:1–44` — payload RHF/Zod, GTIN, normalização fiscal e nomes.
- `erp/src/pages/App/Stock/InboundInvoices/modals/QuickRegisterVariationModal.tsx:95–513` — interface e confirmação pelo resolver.
- `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceQuickRegister.ts:24–387` — deduplicação, recuperação por etapa, gravação e confirmação do vínculo.
- `erp/src/pages/App/Stock/InboundInvoices/services/inboundProductPreparationService.ts:21–303` — sugestão de categoria, criação simples/composta, herança e materialização da variação virtual.
- `erp/src/pages/App/Stock/InboundInvoices/components/InboundItemLinkHeader.tsx:19–132`, `erp/src/pages/App/Stock/InboundInvoices/components/InboundInvoiceItemsReview.tsx:25–125` e `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceItemsReview.ts:126–130,362–370` — acionador, ocultação após seleção e proprietário do modal.
- `erp/src/pages/utils/productService/productQueryService.ts:300–348` — busca exata de GTIN e cadastros semelhantes.
- `erp/src/pages/types/product.type.ts:49`, `erp/src/pages/utils/productService/productVariationMapper.ts:88–123` e `erp/src/pages/utils/productService/productToDbMapper.ts:201–216` — `syncNcm` e persistência em `technical_specs.variationDetails`, sem migration.
- `shared-utils/productVariationValidation.ts:54–128`, `erp/src/pages/App/Products/components/variationTabs/VariationTechnicalTab.tsx:160–205`, `erp/src/pages/App/Products/hooks/variation/useVariationForm.ts:190–214` e `erp/src/pages/App/Products/hooks/variation/variationFormSubmitRules.ts:13–83` — nome único, campos obrigatórios e preservação do NCM específico no formulário padrão.
- `erp/src/pages/App/Stock/InboundInvoices/components/InboundQuickRegister.test.tsx:82–306`, `erp/src/pages/App/Products/modals/VariationFormModal.test.tsx:202–218` e `erp/src/pages/utils/productService/productVariationQuickRegistration.test.ts:16–35` — resolver, fluxo, herança, NCM, duplicidades, retomada e round-trip dos detalhes.
- `docs/forms/migracao-rhf-zod-2026-10-14.md:706` — inventário RHF/Zod; a cobertura global permanece aberta.
- `docs/estoque/guia-pratico/gerar_guia.py:311–331`, `docs/estoque/guia-pratico/README.md:30–34` e `docs/estoque/guia-pratico/manifesto.json` — orientação operacional e geração do guia.
- `erp/public/guias/guia-pratico-estoque.pdf`, páginas 8–9, e `output/pdf/guia-pratico-do-estoque.pdf`, páginas 8–9 — cópias geradas e sincronizadas.

### Testes e limites da prova

Vitest/RTL: **87 testes aprovados em quatro arquivos**, cobrindo resolver real, obrigatórios/opcionais, nome duplicado, variação virtual de produto simples, os três destinos de NCM, categoria, `cEAN`/fallback de GTIN, reutilização de `cProd`/GTIN, confirmação de semelhança nominal, composição manual, clique repetido e recuperação após falhas. O mapeamento JSON de `syncNcm` foi exercitado em ida e volta. A checagem integral ERP de TypeScript termina com 426 diagnósticos distribuídos em outros arquivos e zero diagnósticos nos arquivos deste lote. Não houve migration.

Playwright: a prévia visível na porta 5173 carregou o componente real com dados fictícios e exibiu os modos simples, variação e composição. O callback da prévia não grava dados e o fluxo não foi submetido. O ERP respondeu HTTP 200 em 5173; a porta 3000 respondeu HTTP 404 na raiz `/` (sem consulta a endpoint autenticado). Não foi iniciado um segundo processo. A sugestão de IA falhou na primeira carga e a regra local forneceu a categoria demonstrativa; a criação de produto e a persistência real não foram exercitadas. Não houve escrita no Supabase remoto nem emissão/alteração fiscal.

Guia: geradas 24 páginas e 22 imagens; cópias idênticas. As páginas 8 e 9 foram renderizadas e revisadas visualmente, sem corte ou sobreposição. O submenu Estoque continua apontando para `erp/public/guias/guia-pratico-estoque.pdf`.

## Custo de aquisição no cadastro rápido por NF-e no app móvel

Registro separado de uma alteração mobile já presente no checkout em 24/10, mantido porque `docs/fiscal/README.md` já aponta para esta seção. `InboundQuickProductModal` agora passa `showInboundCostPrice` ao formulário do produto novo, mantendo esse campo oculto ao criar variação; o formulário proprietário o inclui na submissão e na validação RHF/Zod. O custo continua vindo do item da NF e não cria movimentação de estoque. A causa observável no fluxo anterior era a chamada do modal sem essa indicação para o formulário mobile, que usa `false` por padrão.

**Arquivos:** `mobile/src/features/stock/invoices/modals/inbound-mappings/InboundQuickProductModal.tsx:138`, `mobile/src/features/products/screens/ProductFormScreen.tsx:191–202,570–577,761` e `mobile/src/features/products/modals/tabs/ProductFormPricesTab.tsx:36–62,522–546`. O inventário RHF registra 76/76 testes do Ciclo 91 aprovados para schema, roteamento de erro e mutação; TypeScript mobile global teve 23 diagnósticos fora do lote, e a prova de navegador, renderer nativo e persistência real ficaram pendentes naquele ciclo. Esta alteração mobile não fez parte da implementação ERP desta revisão.

### Custo próprio na variação de produto-pai existente — Ciclo 92

**Problema e causa:** ao cadastrar por NF-e uma variação em produto-pai existente no app, `startVariationRegistration` abria o formulário do pai sem transportar o custo do item. `ProductFormVariationsTab.handleAdd` iniciava a variação com custo e flag herdados do pai; no ERP o fluxo usa o custo calculado para a linha e desliga a herança antes de salvar a variação.

**Solução:** o helper compartilhado `withOwnInboundVariationCost` define `costPrice` da linha e `syncCostPrice=false`; o ERP e o mobile o reutilizam. O `InboundQuickProductModal` fornece `landedUnitCost(registrationItem)` ao `ProductFormScreen`. Para o submit, o formulário do pai prepara a última variação nova com o custo da NF antes do `validateAndRun`; o schema de domínio e o `zodResolver` validam esse valor antes do serviço de mutação. O custo do pai e das variações anteriores ficam intactos. O ERP não exibe um campo de custo editável neste estado, então a UI mobile também não o acrescentou. O guia passou a explicar que o custo fica na variação, o saldo inicia em zero e a entrada de estoque depende do recebimento.

**Arquivos de implementação:** `shared-utils/inboundQuickRegisterRules.ts:46–50`, `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceQuickRegister.ts:11,177–195`, `mobile/src/features/stock/invoices/modals/inbound-mappings/InboundQuickProductModal.tsx:137–146` e `mobile/src/features/products/screens/ProductFormScreen.tsx:193,205,592–606,678`. A persistência mobile existente permanece em `mobile/src/features/products/services/mobileProductMutationService.ts:532–543,646`.

**Registro de cobertura:** `erp/src/pages/App/Stock/InboundInvoices/components/InboundQuickRegister.test.tsx:188` verifica `costPrice` próprio e `syncCostPrice=false`; `mobile/src/features/products/services/mobileProductMutationService.test.ts:184–203` verifica a serialização do custo próprio. Foram executados os dois arquivos de teste, totalizando 64/64.

**Documentação e artefatos atualizados:** `docs/produtos/paridade-erp-app.md:1595–1608`, `docs/geral/roadmap_pendente.md:166`, `docs/forms/inventario-mobile-catalogo-2026-10-15.md:75`, `docs/forms/migracao-rhf-zod-2026-10-14.md:706`, `docs/fiscal/README.md:10`, este histórico `:51–63`, `docs/estoque/guia-pratico/README.md:34` e `docs/estoque/guia-pratico/gerar_guia.py:323`. A geração também atualizou `docs/estoque/guia-pratico/manifesto.json` e a página 9 de `erp/public/guias/guia-pratico-estoque.pdf` e `output/pdf/guia-pratico-do-estoque.pdf`; o submenu aponta para o primeiro arquivo em `erp/src/components/layout/nav/menus/StockNavMenu.tsx:138`.

**Validação e limites:** Vitest: **64/64** em `InboundQuickRegister.test.tsx` e `mobileProductMutationService.test.ts`. TypeScript completo: 426 diagnósticos ERP e 23 mobile, sem apontamentos nos arquivos deste recorte. `git diff --check` passou. Playwright visível segue bloqueado pela ausência de distribuição WSL; não houve leitura/gravação remota ou movimentação de estoque. Runtime nativo e UI autenticada permanecem pendentes.
