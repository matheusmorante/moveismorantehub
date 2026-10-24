# Histórico de correções fiscais — 24/10/2026

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
