# Auditoria e rastreabilidade Playwright mobile → Maestro

Data da auditoria: 2026-09-25.

## Resultado da classificação

- 26 cenários lógicos em 5 arquivos `*.spec.ts` estão sob `mobile/e2e/`. O Playwright lista 52 execuções por cenário nos projetos `Mobile Chrome` (emulação Pixel 5 no navegador) e `Desktop Chrome`.
- Os 26 specs são `PLAYWRIGHT_WEB`, sem execução de app nativo. Classificação final: **19 `MIGRAR_PARA_MAESTRO`**, **1 `MANTER_PLAYWRIGHT_WEB`**, **6 `BLOQUEADO_POR_DADOS`**. Nenhum foi descartado como duplicado.
- Os 19 candidatos são fluxos de interface mobile cujo valor final depende de validar a UI/comportamento no app Android real. Eles ainda **não estão migrados**: progresso 0 validado; após preparar ambiente, há 1 flow smoke de abertura pendente de execução física.
- O Android SDK local já contém `platform-tools/adb`, API 36, Build Tools 36 e NDK; Java 17 está instalado. A CLI Maestro 2.10.0 foi instalada no perfil do usuário. Foi configurado ADB/PATH apenas para o SDK existente; nenhum Emulator, AVD ou pacote de emulação foi instalado/configurado.
- `adb devices -l` retornou somente o cabeçalho sem aparelho conectado/autorizado. Estado: `AGUARDANDO_CELULAR_WIFI`; não instalar driver USB nem usar emulador como alternativa.
- `mobile/e2e/run-inventory-audit.mjs` é script auxiliar Playwright (`OUTRO`), não spec; não foi contado nos 26 cenários e permanece sem execução até isolar seus efeitos de escrita.

## Outros testes encontrados

Os 26 arquivos abaixo são `VITEST_UNIT` (`MANTER_VITEST`), incluindo testes de serviços com Supabase mockado; a busca não encontrou chamada de rede/banco real, suíte `VITEST_INTEGRATION`, nem teste nativo instrumentado por Playwright. Mantêm-se no Vitest, sem conversão para Maestro:

- Financeiro: `mobile/src/services/financial/financialPurposeReply.test.ts`, `mobile/src/services/financial/financialBatchQueue.test.ts`, `mobile/src/services/financial/financialBatchExtraction.test.ts`, `mobile/src/features/finance/components/chat/financialCardTimeline.test.ts`, `mobile/src/features/finance/components/card/CardActionsSection.test.ts`.
- Serviços/IA: `mobile/src/services/aiSummaryService.test.ts`, `mobile/src/services/aiAgent/__tests__/productAgentTools.test.ts`, `mobile/src/services/aiAgent/mobileAgentTools.test.ts`, `mobile/src/services/aiAgent/mobileAgentService.test.ts`.
- Estoque: `mobile/src/features/stock/moves/domain/inventoryMovesRules.test.ts`, `mobile/src/features/stock/invoices/utils/invoiceList.test.ts`, `mobile/src/features/stock/invoices/utils/inboundXmlParser.test.ts`, `mobile/src/features/stock/invoices/utils/accessKey.test.ts`, `mobile/src/features/stock/inventory/inventoryParity.test.ts`.
- Produtos/pedidos: `mobile/src/features/products/domain/productVariationName.test.ts`, `mobile/src/features/products/categories/domain/categoryEnvironmentServices.test.ts`, `mobile/src/features/products/categories/domain/categoryEnvironmentRules.test.ts`, `mobile/src/features/orders/services/mobileOrderListService.test.ts`.
- Logística: `mobile/src/features/logistics/utils/__tests__/googleMapsNavigationDeliveryFlow.test.ts`, `mobile/src/features/logistics/utils/scheduleSlots.test.ts`, `mobile/src/features/logistics/utils/deliverySummaryMetrics.test.ts`, `mobile/src/features/logistics/utils/deliveryRouteRules.test.ts`, `mobile/src/features/logistics/domain/teamLocationStatus.test.ts`, `mobile/src/features/logistics/domain/teamLocationPrivacy.test.ts`, `mobile/src/features/logistics/domain/calculateOptimizedDeliveryRoute.test.ts`.

Os rótulos de classificação seguem exatamente `MIGRAR_PARA_MAESTRO`, `MANTER_PLAYWRIGHT_WEB`, `MANTER_VITEST`, `BLOQUEADO_POR_DADOS` e `DESCARTAR_DUPLICADO`. O campo de progresso é separado: `AGUARDANDO_CELULAR_WIFI`, `FLOW_CRIADO_NAO_VALIDADO` ou `VALIDADO_NO_DISPOSITIVO`. Nenhum dos 26 cenários Playwright foi ainda validado como migrado.

## Rastreabilidade por cenário

`MANTER_PLAYWRIGHT` significa que o cenário valida a versão Expo Web e fica na suíte web. Não significa que a versão nativa esteja coberta.

| ID | Teste atual | Comportamento/assert principal | Pré-condição e dados | Classificação / destino |
|---|---|---|---|---|
| STK-01 | `stock.spec.ts` — Movimentações, lista e pesquisa | Paginação/lista, pesquisa e filtro | Dados existentes somente para leitura; Maestro deve usar fixture controlada para asserts determinísticos | `MIGRAR_PARA_MAESTRO` |
| STK-02 | Pedidos de Compra e lista | Abre a tela e verifica ação/estados | Navegação/listagem; sem criação | `MIGRAR_PARA_MAESTRO` |
| STK-03 | Notas Fiscais e validação de importação | Chave inválida mantém consulta desabilitada; cancela | Sem persistência esperada | `MIGRAR_PARA_MAESTRO` |
| STK-04 | Gerenciamento de vínculos de NF-e | Abre vínculos da NF-e fixa `#133744`, acessa composição e conclui | ID operacional fixo e possível persistência; não executar contra esse registro | `BLOQUEADO_POR_DADOS` |
| STK-05 | Recebimentos e lista | Abre recebimentos e verifica lista/estado | Somente navegação/leitura | `MIGRAR_PARA_MAESTRO` |
| STK-06 | Inventário e entrada da tela | Abre inventário e verifica ação de scanner/inventário geral | Ação de scanner é apenas visual; câmera real exige cenário Maestro separado | `MIGRAR_PARA_MAESTRO` |
| STK-07 | Fornecedores e lista | Abre fornecedores e verifica conteúdo | Somente navegação/leitura | `MIGRAR_PARA_MAESTRO` |
| INV-01 | `inventory.spec.ts` — paridade do card | Verifica status, data, responsável, contados e ajustes | Atualmente seleciona inventário existente; migrar com fixture de teste própria | `MIGRAR_PARA_MAESTRO` |
| INV-02 | Opções do card de inventário | Abre opções e cancela | Atualmente seleciona inventário existente; migrar com fixture própria | `MIGRAR_PARA_MAESTRO` |
| INV-03 | Criar inventário personalizado | Seleciona produto, conta, revisa/confirma e verifica card final | Usa produto existente e finaliza inventário sem IDs/cleanup próprios | `BLOQUEADO_POR_DADOS` |
| PRD-01 | `products.spec.ts` — lista, filtros e edição | Abre produto e inspeciona aba Variações/ação de adicionar | Reescrever com produto e variação E2E próprios; incluir ciclo pai + variação | `MIGRAR_PARA_MAESTRO` |
| PRD-02 | Novo produto e validação inicial | Abre formulário, valida campos/etapas/rascunho | Não salva nem cria registro | `MIGRAR_PARA_MAESTRO` |
| PRD-03 | Configurações de produto | Exibe categorias, atributos/variações, ambientes e tipos | Navegação/modal de interface nativa | `MIGRAR_PARA_MAESTRO` |
| PRD-04 | Nova composição | Abre fluxo, informa nome, abre componentes e verifica vazio | Hoje não persiste; Maestro valida interação nativa; persistência exige fixture E2E | `MIGRAR_PARA_MAESTRO` |
| PRD-05 | Reabrir composição existente | Abre a primeira composição e verifica variações/componentes | Recriar como composição de teste própria; nunca editar primeira linha operacional | `MIGRAR_PARA_MAESTRO` |
| CAT-01 | `categories-characteristics.spec.ts` — alternar visualizações | Navega para ambientes/categorias e troca modo | UI mobile, sem escrita esperada | `MIGRAR_PARA_MAESTRO` |
| CAT-02 | Filtrar órfãs e pesquisar | Filtra categorias sem ambiente e pesquisa | UI mobile com lista de dados | `MIGRAR_PARA_MAESTRO` |
| CAT-03 | Criar/cancelar ambiente | Preenche modal, cancela e verifica reabertura vazia | Não deve persistir | `MIGRAR_PARA_MAESTRO` |
| CAT-04 | Criar/cancelar categoria | Verifica campos/características, preenche e cancela | Não deve persistir | `MIGRAR_PARA_MAESTRO` |
| CAT-05 | Configurar tipos de atributos | Alterna tipos inteiro/decimal e obrigatório | Confirmar se seleção persiste; se persistir, fixture própria antes da execução | `MIGRAR_PARA_MAESTRO` |
| CAT-06 | Criar, vincular, editar e excluir | Valida CRUD com rotas REST simuladas em memória | O page.route do Playwright é específico da versão Web e já cobre mock/CRUD sem banco | `MANTER_PLAYWRIGHT_WEB` |
| IVM-01 | `inventory-all-modes.spec.ts` — estoque completo | Contagens +/−/manual, revisão e finalização | Usa produtos reais e finaliza inventário; pode alterar estoque | `BLOQUEADO_POR_DADOS` |
| IVM-02 | Por fornecedor | Seleciona fornecedor e conta produtos | Usa fornecedor/produtos existentes; possível rascunho persistido | `BLOQUEADO_POR_DADOS` |
| IVM-03 | Seleção personalizada | Adiciona produto e realiza contagem | Usa produtos existentes; possível rascunho persistido | `BLOQUEADO_POR_DADOS` |
| IVM-04 | Sem contagens, voltar | Sai do fluxo sem contar e verifica que não cria inventário fantasma | Fluxo negativo sem persistência esperada | `MIGRAR_PARA_MAESTRO` |
| IVM-05 | Offline, SQLite e reconexão | Conta offline, fecha/reabre, reconecta e conclui sync | Usa dados existentes e pode alterar estoque; cobertura nativa SQLite requer device/fixture própria | `BLOQUEADO_POR_DADOS` |

## Ações e pendências

1. Migrar progressivamente os 19 cenários marcados `MIGRAR_PARA_MAESTRO`, começando por abertura/navegação e depois módulos operacionais. Até o momento há somente o smoke técnico de abertura; nenhum desses 19 cenários está convertido/validado.
2. Os 6 `BLOQUEADO_POR_DADOS` permanecem bloqueados até usar dados exclusivos `E2E_<timestamp>_<uuid>`, guardar IDs próprios e fazer limpeza restrita. Não selecionar registro real para editar/excluir e não finalizar inventário que ajuste estoque real.
   A configuração atual repete testes até 2 vezes no CI; sem isolamento, uma falha pode repetir essas mutações, então os casos bloqueados não devem ser disparados no CI contra dados operacionais.
3. `CAT-06` fica como `MANTER_PLAYWRIGHT_WEB`: testa CRUD web com interceptação local `page.route`, cuja configuração é específica do navegador e não prova comportamento nativo.
4. Corrigido anteriormente: removida do CAT-06 a limpeza global por prefixo `[TESTE_AUT]` que consultava/apagava categorias fora do escopo. O cenário usa estado em memória e identificador de execução único.
5. Ambiente: Java 17 e `adb` já existiam; Maestro CLI 2.10.0 foi instalado. `ANDROID_HOME`, `ANDROID_SDK_ROOT`, `JAVA_HOME` e PATH do usuário foram configurados para platform-tools e Maestro. A configuração não instala nem inicia emulador.
6. O comando `adb devices -l` retornou lista vazia, apesar do aparelho estar fisicamente conectado conforme informado pelo usuário. Estado para a configuração atual: `AGUARDANDO_CELULAR_WIFI`; o fluxo agora requer pareamento pela Depuração sem fio e não usa drivers USB.
7. Comandos reproduzíveis e proteção que recusa emulador/AVD e alvo USB estão em `mobile/maestro/README.md` e `mobile/scripts/maestro-device.mjs`. `run-inventory-audit.mjs` segue sem execução até revisar seus efeitos de escrita.

## Validação da auditoria original (2026-09-25)

- Nenhum cenário E2E foi executado contra o banco real.
- Nenhum arquivo `erp/**` ou Playwright do ERP foi alterado nesta migração.
- Flow criado: 1 smoke de abertura. A execução física posterior está registrada abaixo.
- Cenários do roteiro migrados/validados: 0; 19 candidatos para Maestro aguardam implementação/execução física; 1 permanece como Expo Web; 6 continuam `BLOQUEADO_POR_DADOS`.
- Playwright removido: 0; Playwright do ERP permanece intacto.
- Na auditoria original, a execução em celular não foi possível porque o ADB retornou zero devices. O status atual está registrado abaixo.

## Atualização de execução física (2026-10-24)

- O ADB detectou um telefone Android físico por Depuração sem fio. Duas entradas mDNS correspondiam ao mesmo hardware; o Maestro foi apontado a um serial explícito.
- O Maestro CLI 2.10.0 não estava no PATH nem no caminho padrão esperado pelo runner. Para esta execução, a versão documentada foi extraída em `%TEMP%`; o PATH e a instalação do app não foram alterados.
- O pacote instalado era `com.morante.mobile`, versão `1.6.2`, `versionCode` 29. O checkout informa `versionCode` 27 em `mobile/app.json`; portanto, o binário do aparelho não corresponde ao build descrito pelo checkout.
- `smoke/app-launch.yaml` foi executado no telefone e falhou após 28 segundos: o elemento `app-root` não ficou visível. Depois do fluxo, a atividade em primeiro plano era a tela inicial do Android. Os marcadores filtrados de crash nativo/AndroidRuntime não indicaram exceção fatal. A causa da ausência de `app-root` não foi comprovada.
- Uma segunda tentativa temporária, somente com `launchApp` e `waitForAnimationToEnd`, foi interrompida porque o Maestro não conseguiu gravar os logs (`java.io.IOException: Espaço insuficiente no disco`). O resultado é inconclusivo; após a interrupção, o Android estava na tela inicial. A unidade C: chegou a 0 bytes livres. Os artefatos dessa execução permanecem nos diretórios locais do Maestro; a remoção direcionada foi bloqueada pela política do ambiente. Nenhum botão de estoque ou envio de formulário foi acionado.
- Até esta etapa, nenhum fluxo de Estoque foi aberto e nenhuma gravação remota foi realizada. `inventory-audit.yaml` continua pendente: confirmar o escopo e contar grava um rascunho local no SQLite e o fluxo não faz a limpeza desse rascunho.
- Mais tarde, com espaço disponível, o fluxo somente de abertura foi repetido com --test-output-dir e --debug-output em H:/MoranteHub-Maestro-Audit-20261024. O Maestro marcou 1/1 como Passed em 10 segundos, mas a captura mostrava a busca do launcher MIUI, não o MoranteHub; depois do fluxo, com.morante.mobile não tinha processo ativo e a atividade em primeiro plano era o launcher. O comando enviou a abertura a com.morante.mobile/.MainActivity, sem exceção fatal nos marcadores AndroidRuntime filtrados. Como o fluxo não afirmava a visibilidade do app, o resultado não valida a abertura nem autoriza seguir para Estoque; a causa permanece não comprovada.
- Após instalar os auxiliares do Maestro, `--no-reinstall-driver` permitiu execuções sem novo prompt. Uma captura confirmou a tela de Operações; `Mais` → `Estoque` abriu o menu, e as telas de lista/detalhe de Inventário foram abertas em leitura. Nenhum botão `Iniciar`, `Revisar` ou `Novo Inventário` foi acionado.
- Observação sobre Inventário: a lista mostrou dois registros `#000008` em andamento, sendo um identificado na UI como armazenado no aparelho; o detalhe mostrou 3/271 itens contados (1%). No checkout, `useInventory` mescla rascunhos locais e sessões remotas deduplicando por ID, e `InventoryCardContent` mostra `productsCount/items_count` sob o rótulo “Produtos contados”; para rascunhos locais, esse valor é `d.items.length`, o tamanho do escopo, não a quantidade com contagem física. Isso explica o cartão 271 versus detalhe 3/271 no checkout, mas a build instalada é outra. A repetição do número entre registro local e remoto é suspeita: o código visível não deduplica por código de negócio, porém a causa não está confirmada na versão instalada. O cabeçalho 0/0 acompanha a etapa ativa; no resumo sem etapa selecionada, o checkout passa listas vazias ao cabeçalho enquanto o cartão geral calcula o total.
- Na volta, o botão visível da tela de detalhe retornou à lista; o BACK do Android levou ao launcher. As tentativas seguintes não reabriram a raiz do app, então Pedidos de Compra não chegou a abrir. Recebimentos e Indisponíveis também permanecem pendentes.
- Status do smoke original: `FLOW_CRIADO_NAO_VALIDADO`. Uma asserção posterior de `app-root` passou quando o processo do app foi preservado; isso não valida ainda o smoke original nem os demais módulos. Repetir com build correspondente ao checkout antes de atribuir os resultados ao código atual.

## Continuação da validação nativa (2026-10-24)

- Com o app reaberto pelo usuário e o auxiliar Maestro instalado, a auditoria continuou no aplicativo Android físico, sem Expo Web. Resumo, Movimentações, Inventário, Pedidos de Compra (lista e detalhe), NF Entrada, Recebimentos, Fornecedores e Indisponíveis foram acessados; os filtros de Indisponíveis também foram exercitados em leitura.
- O detalhe de Pedido #1 foi fechado pelo controle do modal, retornando à lista. Depois, os módulos restantes foram acessados pelo botão de retorno interno, sem usar BACK do Android.
- Foram observados: conteúdo vazio sem mensagem na tela de Recebimentos; pedidos cancelados com subtítulo “Aguardando recebimento”; diferença entre contagem do cartão e detalhe de Inventário e dois códigos `#000008` em andamento; aviso de falha da Ciência automática na lista de NF Entrada. Evidências, hipóteses e limites estão em [`mobile/maestro/audit-stock-native-2026-10-24.md`](../maestro/audit-stock-native-2026-10-24.md).
- Os fluxos exploratórios não executaram gravações locais/remotas e não mudam a contagem de cenários Playwright migrados: não usam fixtures próprias e não substituem a migração formal. A diferença `versionCode` 29 instalado versus 27 no checkout permanece, então causas atribuídas ao código do checkout precisam ser revalidadas no binário correspondente.
