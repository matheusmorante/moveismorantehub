# Auditoria nativa do Estoque — 24/10/2026

## Ambiente e limites

- Teste executado com Maestro 2.10.0 no aplicativo Android físico `com.morante.mobile`, conectado por Depuração sem fio. Não foi usado Expo Web nem emulador.
- O app instalado informa versão `1.6.2`, `versionCode` 29; o checkout informa `versionCode` 27. Os achados visuais descrevem o binário instalado. As explicações baseadas no código do checkout são hipóteses fortes, mas precisam ser confirmadas no build 29.
- As telas foram percorridas em leitura. Não foram importados XML, criados/recebidos/cancelados pedidos, editados ou estornados movimentos, iniciados/finalizados inventários, alterados vínculos fiscais nem gravados dados remotos. Nenhum novo rascunho local foi criado.
- Os auxiliares do Maestro ficaram instalados no aparelho; as execuções seguintes com `--no-reinstall-driver` não voltaram a pedir instalação.
- Capturas e relatórios do dispositivo estão em `H:\MoranteHub-Maestro-Audit-20261024`.

## Cobertura

| Tela/fluxo | Resultado no aparelho |
|---|---|
| Resumo | Abriu; mostrou 45 itens cadastrados e 12 NF-e de entrada. |
| Movimentações | Abriu; filtro “Este Mês” e movimentos existentes visíveis. Ações Editar/Estornar não foram acionadas. |
| Inventário | Lista e detalhe existentes abriram em leitura; nenhum comando de iniciar, revisar ou finalizar foi acionado. Ver achado abaixo. |
| Pedidos de Compra | Lista e detalhe do Pedido #1 abriram; fechar o modal devolveu à lista. Editar, Marcar atendido e Cancelar não foram acionados. |
| NF Entrada | Lista abriu. Não foi acionada importação nem ação de vínculo. Ver aviso abaixo. |
| Recebimentos | A rota abriu, mas a área de conteúdo permaneceu vazia por mais de cinco segundos. Ver achado abaixo. |
| Fornecedores | Lista abriu; pesquisa, Novo e Tentar contagem não foram acionados. |
| Indisponíveis | Estado vazio abriu com “0 registros” e explicação de estoque liberado. Abas Todas/Ativas/Desfeitas e categoria Normal foram alternadas; as mensagens vazias correspondentes apareceram corretamente. |

Os fluxos exploratórios Maestro de navegação e filtros passaram. Uma primeira asserção de filtro de Indisponíveis esperava o texto incorreto “Nenhuma indisponibilidade registrada”; a tela filtrada usa “Nenhum registro encontrado”. A asserção foi corrigida e o fluxo passou, sem erro do app.

## Achados

### P2 — Recebimentos não comunica a lista vazia

No binário instalado, a tela mostra apenas o cabeçalho “Recebimentos”; não aparece indicador de carregamento, mensagem vazia ou erro, mesmo após a espera. No checkout, `ReceiptsScreen.tsx:37` sempre inclui `MODULE_HEADER` no array da `FlatList`, enquanto a mensagem “Nenhum recebimento encontrado” está em `ListEmptyComponent` (`:175–190`). Com a lista sem recebimentos, o array ainda contém o cabeçalho e o estado vazio não é apresentado. A correspondência exata com o binário instalado não pode ser provada por causa da diferença de `versionCode`.

### P2 — Pedido cancelado ainda aparece como aguardando recebimento

Na lista, os Pedidos #2 e #3 exibem o badge “Cancelado” e, ao mesmo tempo, o subtítulo “Aguardando recebimento”. Em `PurchaseCard.tsx:39`, o subtítulo considera somente `stockProcessed`, sem tratar o estado cancelado. A interface apresenta dois estados incompatíveis para o mesmo pedido.

### P2 / confirmar — Contagem e código dos cartões de Inventário

A lista mostrou dois inventários em andamento com código `#000008`, um deles identificado como armazenado no aparelho. No detalhe aberto, a contagem geral era 3/271 (1%), enquanto o cartão mostrava 271 sob “Produtos contados”. No checkout, o rascunho local preenche `productsCount` com `d.items.length` (`useInventory.ts:41–45`) e o cartão exibe esse número como produtos contados (`InventoryCardContent.tsx:109`); isso representa o tamanho do escopo, não os itens com contagem física. A coincidência do código entre o registro local e o remoto sugere colisão, mas precisa ser confirmada no build 29 e com os registros de origem.

### Observação fiscal — NF Entrada

A lista exibe o aviso “Falha de comunicação ao processar a Ciência automática” e notas com “Vinculações pendentes”. Não foi aberto fluxo de importação, vínculo ou transmissão e não foi feita análise da causa fiscal. Qualquer diagnóstico ou correção deve seguir a documentação fiscal vigente antes de tocar código ou operação.

## Resultado

A navegação nativa pelos módulos solicitados foi exercitada com sucesso, exceto o conteúdo de Recebimentos, que abriu sem apresentar estado de lista. O menu final do Estoque ficou aberto no aparelho. Os fluxos exploratórios desta auditoria não alteram o contador de cenários formalmente migrados em `mobile/e2e/MIGRATION_TRACKING.md`; eles não são ainda uma suíte determinística com fixtures próprias.
