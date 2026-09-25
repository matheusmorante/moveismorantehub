# Auditoria e rastreabilidade Playwright mobile → Maestro

Data da auditoria: 2026-09-25.

## Resultado da classificação

- 26 cenários lógicos em 5 arquivos `*.spec.ts` estão sob `mobile/e2e/`. O Playwright lista 52 execuções por cenário nos projetos `Mobile Chrome` (emulação Pixel 5 no navegador) e `Desktop Chrome`.
- Os 26 specs são `PLAYWRIGHT_WEB`, sem execução de app nativo. Classificação final: **19 `MIGRAR_PARA_MAESTRO`**, **1 `MANTER_PLAYWRIGHT_WEB`**, **6 `BLOQUEADO_POR_DADOS`**. Nenhum foi descartado como duplicado.
- Os 19 candidatos são fluxos de interface mobile cujo valor final depende de validar a UI/comportamento no app Android real. Eles ainda **não estão migrados**: progresso 0 validado; após preparar ambiente, há 1 flow smoke de abertura pendente de execução física.
- O Android SDK local já contém `platform-tools/adb`, API 36, Build Tools 36 e NDK; Java 17 está instalado. A CLI Maestro 2.10.0 foi instalada no perfil do usuário. Foi configurado ADB/PATH apenas para o SDK existente; nenhum Emulator, AVD ou pacote de emulação foi instalado/configurado.
- `adb devices -l` retornou somente o cabeçalho sem aparelho conectado/autorizado. Não consta interface Android/ADB entre os dispositivos USB enumerados. Estado: `AGUARDANDO_DISPOSITIVO_FISICO`; não fazer driver install no escuro, nem usar emulador como alternativa.
- `mobile/e2e/run-inventory-audit.mjs` é script auxiliar Playwright (`OUTRO`), não spec; não foi contado nos 26 cenários e permanece sem execução até isolar seus efeitos de escrita.

## Outros testes encontrados

Os 26 arquivos abaixo são `VITEST_UNIT` (`MANTER_VITEST`), incluindo testes de serviços com Supabase mockado; a busca não encontrou chamada de rede/banco real, suíte `VITEST_INTEGRATION`, nem teste nativo instrumentado por Playwright. Mantêm-se no Vitest, sem conversão para Maestro:

- Financeiro: `mobile/src/services/financial/financialPurposeReply.test.ts`, `mobile/src/services/financial/financialBatchQueue.test.ts`, `mobile/src/services/financial/financialBatchExtraction.test.ts`, `mobile/src/features/finance/components/chat/financialCardTimeline.test.ts`, `mobile/src/features/finance/components/card/CardActionsSection.test.ts`.
- Serviços/IA: `mobile/src/services/deliveryAudioCacheService.test.ts`, `mobile/src/services/aiSummaryService.test.ts`, `mobile/src/services/aiAgent/__tests__/productAgentTools.test.ts`, `mobile/src/services/aiAgent/mobileAgentTools.test.ts`, `mobile/src/services/aiAgent/mobileAgentService.test.ts`.
- Estoque: `mobile/src/features/stock/moves/domain/inventoryMovesRules.test.ts`, `mobile/src/features/stock/invoices/utils/invoiceList.test.ts`, `mobile/src/features/stock/invoices/utils/inboundXmlParser.test.ts`, `mobile/src/features/stock/invoices/utils/accessKey.test.ts`, `mobile/src/features/stock/inventory/inventoryParity.test.ts`.
- Produtos/pedidos: `mobile/src/features/products/domain/productVariationName.test.ts`, `mobile/src/features/products/categories/domain/categoryEnvironmentServices.test.ts`, `mobile/src/features/products/categories/domain/categoryEnvironmentRules.test.ts`, `mobile/src/features/orders/services/mobileOrderListService.test.ts`.
- Logística: `mobile/src/features/logistics/utils/__tests__/googleMapsNavigationDeliveryFlow.test.ts`, `mobile/src/features/logistics/utils/scheduleSlots.test.ts`, `mobile/src/features/logistics/utils/deliverySummaryMetrics.test.ts`, `mobile/src/features/logistics/utils/deliveryRouteRules.test.ts`, `mobile/src/features/logistics/domain/teamLocationStatus.test.ts`, `mobile/src/features/logistics/domain/teamLocationPrivacy.test.ts`, `mobile/src/features/logistics/domain/calculateOptimizedDeliveryRoute.test.ts`.

Os rótulos de classificação seguem exatamente `MIGRAR_PARA_MAESTRO`, `MANTER_PLAYWRIGHT_WEB`, `MANTER_VITEST`, `BLOQUEADO_POR_DADOS` e `DESCARTAR_DUPLICADO`. O campo de progresso é separado: `AGUARDANDO_DISPOSITIVO_FISICO`, `FLOW_CRIADO_NAO_VALIDADO` ou `VALIDADO_NO_DISPOSITIVO`. Nenhum dos 26 cenários Playwright foi ainda validado como migrado.

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
6. O comando `adb devices -l` retornou lista vazia, apesar do aparelho estar fisicamente conectado conforme informado pelo usuário; o Gerenciador de Dispositivos também não mostrou interface Android/ADB. Estado permanece `AGUARDANDO_DISPOSITIVO_FISICO_RECONHECIDO`; não foi instalado driver sem fabricante/modelo identificável.
7. Comandos reproduzíveis e proteção que recusa AVD estão em `mobile/maestro/README.md` e `mobile/scripts/maestro-device.mjs`. `run-inventory-audit.mjs` segue sem execução até revisar seus efeitos de escrita.

## Validação desta auditoria

- Nenhum cenário E2E foi executado contra o banco real.
- Nenhum arquivo `erp/**` ou Playwright do ERP foi alterado nesta migração.
- Flow criado: 1 smoke de abertura, ainda não validado no aparelho (`FLOW_CRIADO_NAO_VALIDADO`).
- Cenários do roteiro migrados/validados: 0; 19 candidatos para Maestro aguardam implementação/execução física; 1 permanece como Expo Web; 6 continuam `BLOQUEADO_POR_DADOS`.
- Playwright removido: 0; Playwright do ERP permanece intacto.
- Execução física não foi possível porque o ADB retornou zero devices. Não rodamos Maestro contra emulador nem executamos cenários que possam tocar dados reais.
