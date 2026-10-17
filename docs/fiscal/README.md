# Documentação fiscal: índice e vigência

**Reconciliado com o checkout em 13/10/2026.** A consulta oficial foi restrita às regras e fontes registradas em cada revisão. Use este índice para diferenciar as regras/documentos vigentes dos snapshots históricos. Relatórios datados continuam disponíveis para preservar evidências, mas não substituem o estado atual do código.

> **Regra obrigatória do produto: não existe CC-e no MoranteHub.** Não criar nem restaurar carta de correção, inclusive botão, formulário, modal, rota ou tela de histórico. As correções seguem por **cancelamento fiscal ou estorno fiscal direto da NF**, conforme a elegibilidade vigente. Referências antigas a CC-e são exclusivamente técnicas/de auditoria e não autorizam implementar essa funcionalidade. Ver [política vigente](historico-correcoes-2026-10-16.md#política-de-produto--cc-e-ausente-do-sistema) e [FISCAL-016](invariantes-arquiteturais.md).

## Referências atuais

- [Desacoplamento de Características Técnicas do Cadastro/ERP e Ocultação para Estoquista — 16/10](historico-correcoes-2026-10-16.md#desacoplamento-de-características-técnicas-do-cadastroerp-e-ocultação-para-estoquista): remoção de asteriscos vermelhos de características técnicas (exigidas apenas no Catálogo Digital), ocultação das abas de características para o perfil estoquista (`isStockistOnly`) no produto pai e nas variações com fallbacks de navegação, condicionamento do asterisco de Preço de Venda a produtos sem variações e desacoplamento de dimensões/características da validação de cadastro de variações (`getVariationRegistrationIssue`). 140 testes mobile e mais de 260 testes ERP aprovados (100%).

- [Relatórios ERP — proprietário, autosave e filhos conferidos16/10](historico-correcoes-2026-10-16.md#relatórios-erp--proprietário-autosave-e-filhos-conferidos):preparação, recibos, fila de filtros, modo público, CSV e referências conferidos, preservando Bling.111 testes/lint sem erros e build ERP completo em1m42s aprovados. ERP123/132 encerrados,9 pendentes; censo adicional/mobile/catálogo continuam abertos.

- [Relatórios Bling — proprietário e composição conferidos16/10](historico-correcoes-2026-10-16.md#relatórios-bling--proprietário-e-composição-conferidos): período/consulta/dados calculados, gravação/exclusão e leitura/filtros com resolvers reais e recibos; falha de página não salva análise parcial.49 testes/lint sem erros e build ERP em1m42s aprovados. ERP122/132 encerrados,10 pendentes no principal; censo adicional/mobile/catálogo continuam abertos.

- [Assistente global — envio, histórico e voz conferidos16/10](historico-correcoes-2026-10-16.md#assistente-global--envio-histórico-e-voz-conferidos): quatro intenções com RHF/resolvers reais, até resposta/recibo local; prazos/contexto, rascunho e falha de cache sem reenviar operação confirmada.45 testes/lint e build ERP em1m35s aprovados. ERP121/132 encerrados,11 pendentes no principal; censo adicional/mobile/catálogo continuam abertos.

- [Modelo de etiqueta — biblioteca de recorte conferida16/10](historico-correcoes-2026-10-16.md#modelo-de-etiqueta--biblioteca-de-recorte-conferida): resolver até leitura/canvas/callback, geometria/prazo/trava e erro; removido atraso fixo.37 testes/lint e build ERP em1m30s aprovados. ERP120/132 encerrados,12 pendentes no principal; biblioteca retida sem reativação.

- [Variações — recorte, envio, propagação e busca conferidos16/10](historico-correcoes-2026-10-16.md#variações--recorte-envio-propagação-e-busca-conferidos): resolver até upload/callback, trava compartilhada, prazo/contexto, erro e repetição sem novo envio após recusa conhecida.137 testes em16 arquivos, lint sem erros e build ERP completo em1m48s aprovados. ERP119/132 encerrados,13 pendentes; censo adicional e mobile/catálogo permanecem em conferência.

- [Replicação e Paridade: Módulo de Produtos ERP → Mobile App — 16/10](historico-correcoes-2026-10-16.md#replicação-e-paridade-módulo-de-produtos-erp--mobile-app): canonicalização da validação de publicação em `shared-utils/catalogPublicationValidation.ts`, desbloqueio do toggle de catálogo para rascunhos com detalhamento de requisitos obrigatórios (`checkEcomLegibility`), exibição do SKU normalizado para variação única (`displaySku`) no card móvel e alinhamento de isenção de fornecedor e dimensões "não se aplica" em `productRegistrationRules.ts`. 139 testes mobile e 20 testes ERP aprovados (100%).

- [Editor de posts e autosave — proprietários conferidos16/10](historico-correcoes-2026-10-16.md#editor-de-posts--busca-seleção-e-template-conferidos): busca/seleção/template até recibo; [fila da biblioteca](historico-correcoes-2026-10-16.md#autosave-de-templates--biblioteca-proprietária-e-fila-conferidas) valida no proprietário antes de gravar e preserva settings/revisões.162 testes em17 arquivos, lint sem erros e build ERP completo em1m37s aprovados. TS305 externos; ERP118/132 encerrados,14 pendentes.

- [Campanhas e modelos — proprietário ativo com recibos conferidos16/10](historico-correcoes-2026-10-16.md#campanhas-e-modelos--proprietário-ativo-com-recibos-conferidos): contratos próprios até recibo/refresh, falha parcial explícita e escolhas/reset locais confirmados.108 testes/lint e build ERP em1m40s aprovados; ERP116/132 encerrados,16 pendentes.

- [Assistência técnica: segregação entre Assistência Avulsa e Assistência Vinculada a Venda Atendida — 16/10](historico-correcoes-2026-10-16.md#assistência-técnica-segregação-entre-assistência-avulsa-e-assistência-vinculada-a-venda-atendida): remoção de busca/toggle de vínculo no formulário avulso ("Pedido de Assistência Avulso"), botão "Nova Assistência Avulsa" na toolbar, nova ação "Gerar Assistência" no menu dos 3 pontinhos para pedidos com status atendido (`fulfilled`, `delivered`, circulação concluída), cabeçalho dinâmico com badge `#código`, card no topo com detalhes da venda e seleção de itens com defeito/quantidade. RHF/Zod presente e zero CC-e; o proprietário agregado continua pendente de conferência até salvamento/recibo, conforme inventário. 17 testes unitários aprovados (100%).

- [Ambientação — biblioteca conferida sem acionador ativo16/10](historico-correcoes-2026-10-16.md#ambientação--biblioteca-conferida-sem-acionador-ativo): sugestão/geração/salvamento/aplicação no resolver até recibo, fallback local confirmado e explícito.56 testes de marketing, lint e build ERP completo em1m30s aprovados; ERP115/132 encerrados,17 pendentes. Biblioteca retida, sem reativação.

- [Biblioteca de artes — upload, consulta e exclusão conferidos16/10](historico-correcoes-2026-10-16.md#biblioteca-de-artes--upload-consulta-e-exclusão-conferidos): resolver até recibo/refresh, contexto/prazos e limpeza parcial explícita.35 testes, lint e build ERP em1m47s aprovados; ERP114/132 encerrados,18 pendentes.

- [WhatsApp nas configurações — snapshot parseado16/10](historico-correcoes-2026-10-16.md#whatsapp-nas-configurações--submissões-com-snapshot-parseado): três intenções até recibo, valores atuais em serviço/headers, trava/prazo/contexto/erro.69 testes conjuntos com Settings e lint aprovados; build ERP final aprovado em 1m48s. Sem envio real.

- [Configurações gerais — autosave confirmado pelo proprietário16/10](historico-correcoes-2026-10-16.md#configurações-gerais--autosave-confirmado-pelo-proprietário): fila/debounce, leitura confirmada, campos preservados e recibo real;37 testes/lint/build aprovados. WhatsApp foi conferido separadamente na referência acima.

- [CSOSN de homologação — proprietário conferido16/10](historico-correcoes-2026-10-16.md#csosn-de-homologação--proprietário-conferido): resolver até recibo HML confirmado, prazo/trava/retry/erro;32 testes, lint e build ERP em 1m33s aprovados. ERP110/131 encerrados,21 pendentes.

- [Continuidade final dos formulários16/10](../forms/continuidade-formularios-2026-10-16.md): ERP115/132 itens encerrados,17 pendentes;56 provas de marketing,42 móveis e48 catálogo em seus lotes próprios. Builds ERP/Next e TS catálogo aprovados; pendências de voz/live, uploads e demais proprietários preservadas. Inclui retirada definitiva da interface de CC-e por determinação do usuário.

- [Pedido assistido, lançamento móvel e produto do catálogo — continuação16/10](historico-correcoes-2026-10-16.md#pedido-assistido-lançamento-móvel-e-produto-do-catálogo--continuação): pedido assistido e lançamento manual conferidos; salvamento do catálogo com provas próprias, uploads ainda pendentes. ERP108/131 encerrados,23 pendentes, incluindo retirada de CC-e.

- **[Política de produto: CC-e ausente do sistema — 16/10](historico-correcoes-2026-10-16.md#política-de-produto--cc-e-ausente-do-sistema). O MoranteHub NÃO utiliza Carta de Correção. Não criar/restaurar interface ou fluxo de CC-e, nem tela dedicada de histórico. Correções seguem cancelamento fiscal/estorno fiscal direto conforme elegibilidade; critérios de circulação permanecem nas regras vigentes. Artefatos legados são exclusivamente técnicos/de auditoria.**

- [Etiquetagem — biblioteca conferida — 16/10](historico-correcoes-2026-10-16.md#etiquetagem--biblioteca-conferida): dez provas de contexto, callback aguardado, prazo e seleção preservada; sem acionador ativo localizado.

- [Vínculo após cadastrar produto — confirmação e persistência conferidas — 16/10](historico-correcoes-2026-10-16.md#vínculo-após-cadastrar-produto--confirmação-e-persistência-conferidas): seleção/remoção, callback pós-cadastro e mapeamentos aguardam recibos; canais/conclusão têm proprietário próprio. 157 testes, lint sem erros e build aprovados; TS global falha fora das fontes deste lote. ERP 105/131, 26 pendentes; sem prontidão global ou operação remota declarada.

- [WhatsApp e bibliotecas assistidas — conferência de submissões — 16/10](historico-correcoes-2026-10-16.md#whatsapp-e-bibliotecas-assistidas--conferência-de-submissões): travas comuns, callback/recibo aguardado, timeout/contexto, erro visível e sugestão no resolver; 32 testes incluídos no lote de 157 aprovado. WhatsApp tem consumidor ativo; recebimento assistido/voz permanecem bibliotecas sem acionador localizado, sem reativação inferida.

- [Cadastro rápido da nota de entrada — preparação no resolver — 16/10](historico-correcoes-2026-10-16.md#cadastro-rápido-da-nota-de-entrada--preparação-no-resolver): seleção/comando no RHF até resultado, prazo/contexto, erro/progresso, pai revalidado e custo zero. 59 testes, lint sem erros e build aprovados; TS global falha fora do lote. Salvamento/vínculo posterior continuam pendentes; inventário 100/130, 30 pendentes.

- [Produto da nota de entrada — biblioteca conferida, abertura ausente — 16/10](historico-correcoes-2026-10-16.md#produto-da-nota-de-entrada--biblioteca-conferida-abertura-ausente): resolver acompanha a preparação, com contexto/prazo/erro e campos parseados. 47 testes, lint sem erros e build aprovados; TS global falha fora do lote. Sem acionador ativo localizado; cadastro rápido e vínculo posterior ainda exigem sua prova própria. Inventário permanece 100/130 (76,9%), 30 pendentes.

- [Cancelamento da devolução comercial — confirmação conferida — 16/10](historico-correcoes-2026-10-16.md#cancelamento-da-devolução-comercial--confirmação-conferida): contrato próprio, versão/snapshot, resolver até recibo, trava comum com recebimento, prazos/falhas e notificação correta. 156 testes, lint e build aprovados; TS global falha fora do lote. ERP 100/130 (76,9%), 30 pendentes; sem operação comercial remota ou transmissão fiscal.

- [Recebimento da devolução comercial — confirmação conferida — 16/10](historico-correcoes-2026-10-16.md#recebimento-da-devolução-comercial--confirmação-conferida): versão obrigatória, snapshot preservado e recibo comercial antes da etapa fiscal; sessão/prazos e bloqueio incerto. 110 testes, lint e build aprovados; TS global falha fora do lote. ERP 99/130 (76,2%); proprietário ativo de cancelamento comercial acrescentado ao inventário. Sem escrita comercial real ou transmissão.

- [Arte de etiquetas — gestos já iniciados respeitam a trava — 16/10](historico-correcoes-2026-10-16.md#arte-de-etiquetas--interações-iniciadas-antes-da-trava): posição/tamanho/rotação conferem a guarda também nos listeners de window. 198 testes, lint sem erros e build aprovados; TypeScript global reprova fora do lote. Inventário ERP registra 98/129 (76,0%), sem conclusão global.

- [Formulário de variações — composição em conferência — 16/10](historico-correcoes-2026-10-16.md#formulário-de-variações--composição-em-conferência): contratos de conclusão/rascunho, trava/contexto/prazos, feedback e abas reais; 99 testes em 11 arquivos, lint sem erros e build aprovados. TS global falha fora das fontes alteradas. Recorte/upload/propagação de imagem e resolver da busca compartilhada de componentes continuam pendentes. Inventário permanece 98/129.

- [Mesclagem canônica — confirmação e busca conferidas — 16/10](historico-correcoes-2026-10-16.md#mesclagem-canônica--confirmação-e-busca-conferidas): resolver até vínculo/ocultação confirmados, busca literal protegida, identidade/contexto, falha parcial/incerta e bloqueio de repetição. 97 testes em seis arquivos, lint sem erros/avisos e build aprovados; TS global falha fora do lote. ERP 98/129 (76,0%), 31 pendentes; SQL remoto/histórico/RLS/concorrência não comprovados.

- [Mudança de família — proprietário e confirmação conferidos — 16/10](historico-correcoes-2026-10-16.md#mudança-de-família--proprietário-e-confirmação-conferidos): resolver até confirmação de vínculo/fotos, revisão de cinco segundos por rascunho, consultas paginadas com prazo/guarda, atributos acessíveis e compatibilidade de visibilidade legada. 49 testes, lint sem erros/avisos e build aprovados; TS global falha fora do lote. ERP 97/129 (75,2%), 32 pendentes; mesclagem canônica e prova remota têm caminhos próprios.

- [Indisponibilidades — confirmação e anexos conferidos — 16/10](historico-correcoes-2026-10-16.md#indisponibilidades--confirmação-e-anexos-conferidos): resolver até confirmação de RPC/linha, contexto/prazos, anexos preservados em incerteza e consulta de fornecedores com erro/repetição. 74 testes locais, lint sem erros/avisos e build aprovados; TS global falha fora do lote. ERP 95/129 (73,6%), 34 pendentes; sem prova remota de RPC/RLS/transação.

- [Arte de etiquetas — exportação, título e controles conferidos — 16/10](historico-correcoes-2026-10-16.md#arte-de-etiquetas--exportação-título-e-controles-conferidos): resolver real, exportação aguardada/limitada, guarda de sessão/snapshot e prévia sem alterar preços. Menu, toolbar, cores e camadas reais conferidos; 195 testes, lint sem erros e build aprovados. ERP 94/129 (72,9%), 35 pendentes; mobile/catálogo seguem em inventário próprio.

- [Arte de etiquetas — persistência confirmada e fila protegida — 16/10](historico-correcoes-2026-10-16.md#arte-de-etiquetas--persistência-confirmada-e-fila-protegida): resolver até confirmação, fila/contexto/prazos, resultado parcial/incerto, retry reparador, consultas e histórico protegidos. 142 testes locais, lint sem erros e build aprovados; TS global falha fora do lote. Exportação/renomear e filhos concluídos na continuação acima.

- [Rótulos fiscais — feedback de carregamento com faixa de luz (shimmer) — 16/10](historico-correcoes-2026-10-16.md#rótulos-fiscais--feedback-visual-de-carregamento-com-faixa-de-luz-shimmer): substituição do spinner circular giratório por faixa luminosa (shimmer) no background de `NF` e `NFH`, preservação de sigla e suporte a `prefers-reduced-motion`. 5 testes unitários e 24 testes da suíte de pedidos aprovados.

- [Dados de etiquetas de preço — aplicação e busca conferidas — 16/10](historico-correcoes-2026-10-16.md#dados-da-etiqueta-de-preço--aplicação-e-busca-com-resolver): rascunho isolado, resolver até callback confirmado, contexto/prazos e busca com cache/erro. 49 testes, lint sem erros e build aprovados; TS global falha fora do lote. ERP 93/129 (72,1%), 36 pendentes. Persistência completa da arte permanece em item próprio.

- [Impressão de OS — imports corrigidos — 16/10](historico-correcoes-2026-10-16.md#impressão-de-os--imports-após-extração-dos-renderizadores): caminhos após extração dos renderizadores de devolução/assistência corrigidos com alias existente; módulos e ações HTTP200 no Vite ativo, cinco testes dos utilitários aprovados.

- [Etiquetas — duplicação/cópia/exclusão confirmadas — 16/10](historico-correcoes-2026-10-16.md#modelos-de-etiquetas--cópia-e-exclusão-confirmadas-pelo-proprietário): resolver até a confirmação, trava/contexto e bloqueio incerto persistente, cache inicial preservado e diálogos reais aguardando sucesso. 107 testes locais, lint sem erros e build aprovados. Editor/consulta/preferências conferidos na continuação abaixo.

- [Editor de modelos — salvar, consultar e preservar preferências — 16/10](historico-correcoes-2026-10-16.md#editor-de-modelos--salvar-consultar-e-preservar-preferências): proprietário e filhos conferidos, snapshot/zeros/frações/Custom e fallback preservados; confirmação/contexto/prazos na composição real. 171 testes, lint sem erros e build aprovados; TS global falha fora do lote. ERP 92/129 (71,3%), 37 pendentes; mobile/catálogo e demais editores têm itens próprios.

- [Etiquetas — fronteiras de persistência de modelos — 15/10](historico-correcoes-2026-10-15.md#etiquetas--fronteiras-de-persistência-de-modelos-em-validação): modelos validados antes do I/O, confirmação de payload/ID/linha removida, fallback local confirmado e preservação de zeros/frações/JSON. 113 testes locais, lint e build aprovados; tipos de arte/callback alinhados. Editor agregado e cópia/exclusão conferidos nas referências de 16/10.

- [Etiquetas — uploads locais e amostra — 15/10](historico-correcoes-2026-10-15.md#etiquetas--uploads-locais-e-amostra-com-proprietário): leitura vinculada ao item/contexto, aborto, prazo de 10s e erro/progresso na biblioteca real. Limpeza e upload de amostra têm contratos próprios; 91 testes locais, lint sem erros e build aprovados. Dois proprietários antes só no censo/texto explicitados; ERP 91/129 (70,5%), 38 pendentes.

- [Etiquetas — biblioteca de imagens — 15/10](historico-correcoes-2026-10-15.md#etiquetas--biblioteca-de-imagens-consulta-e-alterações-confirmadas): quatro intenções com resolver real, consulta limitada, leitura de arquivo protegida e confirmação de INSERT/DELETE. 54 testes locais, lint e build aprovados; proprietário conferido. Uploads locais conferidos na referência acima; demais editores seguem pendentes.

- [Etiquetas — logotipos e rótulos locais — 15/10](historico-correcoes-2026-10-15.md#etiquetas--proprietário-de-logotipos-rótulos-e-confirmação-local): cinco intenções sob RHF, confirmação de armazenamento antes de publicar, campos extras preservados e erro/progresso pela fachada real. 51 testes locais e build aprovados; proprietário e dois filhos conferidos. Biblioteca de imagens conferida na referência acima; demais editores continuam pendentes.

- [Refatoração de princípios de engenharia no módulo de pessoas e clientes (`usePersonForm`) — 15/10](historico-correcoes-2026-10-15.md#refatoração-de-princípios-de-engenharia-no-módulo-de-pessoas-e-clientes-usepersonform): decomposição de hook monólito (522 linhas) em submódulos SRP (`usePersonAddress`, `usePersonContacts`, `useEmployeeRoles`, `usePersonSubmit`), aplicação de Strategy Pattern (`PersonCollectionStrategy`) desacoplando regras por coleção, Facade Pattern com 100% retrocompatibilidade e estrita adesão ao RHF + zodResolver.

- [Atualização de cliente no pedido de venda: separação entre cadastro operacional e artefato de teste — 15/10](historico-correcoes-2026-10-15.md#atualização-de-cliente-no-pedido-de-venda-separação-entre-cadastro-operacional-e-artefato-de-teste): correção em `updatePerson` para não exigir contexto de teste em clientes operacionais reais quando o operador está em ambiente de desenvolvimento.

- [Histórico de preços e edição de lote — 15/10](historico-correcoes-2026-10-15.md#histórico-de-preços--resolver-e-comando-transacional-de-lote-em-validação): resolver acompanha consulta/gravação com prazo e proteção de proprietário/replay. 52 testes locais, lint e build aprovados; migration autorizada aplicada como20261015232214 e 15 checks catálogo/helpers puros aprovados. Caminho de formulário conferido, sem prova de negócio/rollback/concorrência com fixtures.

- [Ações pós-venda: modal de Informações da Entrega e renomeação de Emissão de NF de saída — 15/10](historico-correcoes-2026-10-15.md#ações-pós-venda-modal-de-informações-da-entrega-e-renomeação-de-emissão-de-nf-de-saída): remoção do rótulo "Cadastrado", criação do modal dedicado de informações da entrega, checkmarks e anel verde restritos aos botões internos do modal de entrega, renomeação de "Emitir nota fiscal de saída" para "Emissão de NF de saída" e adequação do consumo de autenticação.

- [Inventário — escopo, contagem parcial e conclusão — 15/10](historico-correcoes-2026-10-15.md#inventário--escopo-contagem-parcial-e-conclusão-no-ciclo-do-resolver): quatro caminhos conferidos, contratos completos no resolver, duplicação/restauração, confirmação de início/gravações locais e submissão congelada; 77 testes ERP, lint e build aprovados, sem prova de transação no PostgreSQL.

- [Movimentações de estoque — 15/10](historico-correcoes-2026-10-15.md#movimentação-de-estoque-do-pedido--validação-do-lote-e-confirmação-das-etapas): pedido/manual/compra conferidos com resolver até gravar, confirmação de movimento/conclusão e falhas parciais visíveis; 77 testes locais, lint e build aprovados, sem prova de atomicidade PostgreSQL ou prontidão fiscal global.

- [Revisão dos formulários financeiros — 15/10](../forms/revisao-financeiro-2026-10-15.md): quatro proprietários conferidos, migration aplicada com autorização e 15 checks remotos aprovados; provas de negócio, concorrência e rollback ainda pendentes.

- [Inventário de formulários mobile e catálogo — 15/10](../forms/inventario-mobile-catalogo-2026-10-15.md): localização de campos, wrappers e proprietários; conferência individual pendente, sem comprovar prontidão global.

- [Histórico de correções — 15/10](historico-correcoes-2026-10-15.md): formulários de pedidos, produtos, pessoas, operações fiscais, devoluções e importação de NF-e; rascunho manual, identidade de teste e consulta de distância; preservação da chave alfanumérica nos serviços de entrada; otimização de índices/triggers em variações de produto eliminando timeout de 8s (57014) no PostgreSQL; padronização e migração de características de pés (Possui pés, Quantidade de pés, Material dos pés); subtópicos dedicados de características no ERP e Mobile (Portas, Gavetas, Prateleiras e Pés); auditoria completa e povoamento atômico das características de puxadores (`Tipo de puxador` e `Material dos puxadores`) com base estrita nas descrições de produtos; remoção do switch "Não se aplica" nas características técnicas do produto e variações com experiência natural de preenchimento e garantia de persistência visual contínua das características preenchidas/selecionadas durante a pesquisa. Validações locais e pendências registradas sem declarar prontidão fiscal global. Autocomplete compartilhado e mapa de frete: contratos de consulta, mescla de endereço, invalidação de localização e respostas concorrentes conferidos. Importação de pessoas conferida em leitura, mapeamento e persistência por blocos, com preservação de confirmações e contexto. Reconciliação de produtos: contratos, consultas, campos inline e confirmação de gravações, com limites de atomicidade registrados.

- [Migração de todos os formulários para RHF + zodResolver — 14/10](../forms/migracao-rhf-zod-2026-10-14.md): escopo ERP, móvel e catálogo, contratos compartilhados, inventário e validação em andamento; cadastro de serviços conferido com 17 testes locais e build, preservando os contratos parcial/rascunho/finalização; limites/custos das APIs conferidos com 24 testes e confirmação de persistência antes dos caches. Não equivale à conclusão global nem à prontidão fiscal ponta a ponta.

- [Auditoria de domínio e gerador sintético — 14/10](auditoria-regras-gerador-sintetico-2026-10-14.md): pedido em etapas sequenciais, inventário de lacunas frontend/backend, correções em andamento e migration preparada. Gerador e população em massa ainda não habilitados.

- [Marcador de teste dos formulários — retomada de 14/10](historico-correcoes-2026-10-14.md#marcador-de-teste-utilizável-nos-formulários-em-development): contexto de execução sem variável obrigatória; HTTP 403 resolvido ao retirar a precedência do `.env` legado da API. Endpoint retornou 204 e marcador confirmado visualmente na porta 5173. O [lote comercial](integracao-comercial-controlada-2026-10-13.md) já está autorizado e em retomada.

- **Política de correção:** o ERP não utiliza CC-e. Correções seguem cancelamento ou estorno direto pela política central, conforme prazo e elegibilidade fiscal. Após circulação, aplica-se devolução vinculada. CC-e antiga é preservada apenas como histórico/reconciliação, sem nova transmissão e sem pendência de implementação para habilitá-la.
- [Histórico de correções fiscais — 14/10](historico-correcoes-2026-10-14.md): correções no Pedido 5749 (503/preparação), reconciliação/feedback do modal, acessibilidade WCAG AAA de alertas, timeout de conexões no PostgreSQL, preservação de snapshot no cancelamento comercial, auditoria/desacoplamento de cancelamento comercial e regularização fiscal, refatoração modular (SOLID/SRP/SLAP) de `nfeService.ts` e `api/nfe/cancel.ts`, modal completo de detalhes da NF-e de estorno fiscal, correção de `ReferenceError: estornoDraftId is not defined` em visualização mobile/cards, padronização terminológica estrita entre esferas comerciais e fiscais (`FISCAL-023`), paridade de consulta e detalhes entre ERP e App Mobile, refatoração arquitetural modular limpa do módulo de pedidos mobile (`features/orders`), replicação abrangente de recursos visuais/operacionais do ERP (TitleCase, intervalo de datas, avisos de coleta de devolução e pendência fiscal, navegação tátil por pedido vinculado e filtros operacionais) e preservação do invariante estrito de somente leitura no app móvel.
- [Revisão dos fluxos de saída — 13/10](revisao-fluxos-saida-2026-10-13.md): correções de consulta, cancelamento, devolução e modal; evidências locais e pendências concretas.
- [Status dos testes fiscais](status-testes-homologacao.md): implementação, testes, evidência HML, bloqueios e pendências por fluxo.
- [Roadmap de emissão](roadmap-configuracao-emissao-producao.md): arquitetura atual e prontidão para Produção.
- [Invariantes arquiteturais](invariantes-arquiteturais.md): critérios permanentes de revisão do emissor.
- [Matriz de saída interestadual](matriz-saida-interestadual.md), [auditoria de CFOP](auditoria-cfop-nfe-nfce.md) e [determinação de CFOP por produto/pedido](matriz-determinacao-cfop-produto-pedido.md): escopo atual, regras aprovadas e CFOPs candidatos.
- [NF-e de devolução](nfe-devolucao.md): condições, validações e limites do fluxo implementado.
- [Modelo fiscal varejista no Paraná](decisao-modelo-varejo-pr.md) e [decisão PIS/COFINS](decisoes-contribuicoes-venda-normal.md): decisões de negócio delimitadas ao cenário descrito em cada arquivo.
- [Fontes oficiais NF-e/NFC-e](manuais/README.md): links oficiais, registro das versões e verificações realizadas.
- [`api/nfe/schemas/README.md`](../../api/nfe/schemas/README.md): origem, pacote e hash dos XSDs fixados no código.
- [E2E fiscal pela interface](../testing/fiscal-interface-e2e.md): política de segurança, estado do runner e critério para testes de interface.

## Etapa atual da implantação — 13/10/2026

Produção está disponível por padrão no caminho de emissão; cada operação conserva confirmação explícita, autorização do operador, configuração fiscal e validações próprias do cenário. Isso não comprova prontidão ponta a ponta nem autorização para transmitir. Não há emissão real de Produção comprovada nesta revisão. Consulte o [status detalhado](status-testes-homologacao.md) para evidências atuais e limitações e o [roadmap](roadmap-configuracao-emissao-producao.md) para a arquitetura fiscal.


## Publicações que ainda precisam de análise de aplicabilidade

| Publicação consultada em 09/10/2026 | Estado da revisão do ERP |
|---|---|
| NT 2026.004 v1.01 — CNPJ alfanumérico e chave de acesso | Implantada em homologação e produção em 2026. O schema aceita CNPJ alfanumérico em campos fiscais, mas a auditoria encontrou geração, validação, consulta, cancelamento e importação de chaves ainda restritas a dígitos. Compatibilidade ponta a ponta pendente; ver status central. |
| NT 2025.002 v1.52, NT 2026.007 v1.10 e NT 2026.008 v1.00 | Implantação adiada para 26/10/2026 em HML e 16/11/2026 em Produção ([aviso SVRS/ENCAT](https://dfe-portal.svrs.rs.gov.br/Nfe/Avisos)). Revisar regra, leiaute e cenários antes da nova janela HML. |
| NT 2026.002 v1.11, NT 2026.003 v1.00 e NT 2026.010 v1.00 | Especificações de DANFE Simplificado Tipo 2, contingência relacionada e DANFE NF-e para RTC ainda não comparadas ao renderizador/fluxos atuais. Adoção do produto deve ser decidida separadamente. |
| NT 2026.009 v1.00 | Publica correção em regra de validação. O efeito exato sobre as operações do ERP ainda precisa ser lido no documento específico. |
| Informe Técnico 2023.002 v2.10 (CFOP) | O catálogo local é estático e não foi comparado código a código com a tabela publicada. |
| Informe Técnico 2024.001 v2.40 (NCM) | Vigente desde 01/10/2026. A agenda e a última execução remotas do sync de NCM não foram consultadas. |
| Informe Técnico 2025.002 v1.70 (IBS/CBS) | Tabelas cClassTrib/CST/crédito presumido atualizadas em 01/10. A presença dos elementos no XSD não prova cálculo ou serialização; revisar regime, cronograma e cenários. |

As publicações não são, por si sós, prova de defeito ou de obrigação de implementar todas as opções normativas. A decisão depende de escopo e cronograma oficiais, regime tributário e operação coberta. Consulte [manuais/README.md](manuais/README.md) antes de uma alteração fiscal.

## Relatórios, checkpoints e evidências preservados

Os arquivos abaixo são snapshots de auditorias, decisões ou execuções com data própria. Use o status atual antes de reaproveitar um diagnóstico ou próximo passo:

- [Auditoria de cancelamento, estorno e devolução — 08/10](auditoria-cancelamento-estorno-devolucao-2026-10-08.md)
- [Auditoria de conformidade documental — 29/09](auditoria-conformidade-documental.md)
- [Auditoria do domínio tributário](auditoria-dominio-determinacao-tributaria.md)
- [Auditoria da stack de saída — 29/09](auditoria-stack-fiscal-saida.md)
- [Auditoria do caso contribuinte/consumidor final](auditoria-familia-interestadual-contribuinte-final.md): investigação aberta; não aprova família interestadual.
- [Auditoria histórica PR→SC](auditoria-interestadual-pr-sc.md)
- [Baseline HML de 01/10](baseline-e2e-homologacao-2026-10-01.md): evidência persistida da execução; não é roteiro para retransmissão.
- [Checkpoint da edição fiscal — 09/10](checkpoint-edicao-fiscal-2026-10-09.md)
- [Correção da reserva de numeração HML — 03/10](correcao-reserva-numeracao-hml-2026-10-03.md)
- [Correção de série/IE HML — 30/09](correcao-serie-ie-hml.md)
- [Validação da política de modelo varejista — 03/10](validacao-modelo-varejo-pr-2026-10-03.md)
- [Auditoria TLS SEFAZ-PR — 05/10](../audits/sefaz-tls-audit-2026-10-05.md): snapshot histórico de transporte, não comprova autorização fiscal nem estado atual.
- [Reserva, persistência e reconciliação — atualização 07/10](emissao-normal-reserva-reconciliacao.md): evidência remota histórica, não reconsultada nesta auditoria.
- [Retomada fiscal de 07/10](retomada-2026-10-07.md)
- [Verificação HTTPS/mTLS HML — 05/10](sefaz-hml-tls.md): transporte e bloqueio do certificado não revalidados depois daquela data.
- [Recuperação de consulta 217 — 04/10](recuperacao-217-numero-original.md)
- [Recuperação de tentativa ativa — 04/10](recuperacao-tentativa-ativa.md)

## Planos e snapshots substituídos

- [Emissão direta SEFAZ](nfe_sefaz_direta.md): documento antigo preservado como referência histórica; a arquitetura, persistência e status atuais estão no roadmap e no status central.
- [Plano de abas Produção/Homologação](plano-abas-ambiente-fiscal.md): proposta de abas não implementada; a tela atual usa uma lista com filtro de ambiente.
- [Alerta de erro fiscal no modal](plano-modal-alerta-erro-fiscal.md): a proposta foi implementada; o arquivo registra a decisão e aponta os componentes atuais.
- [Diff declarativo do schema](diff-declarativo-schema-nfe.md) e [plano de reconciliação do schema](plano-reconciliacao-schema-nfe.md): snapshots de 28/09; não comprovam o estado remoto atual nem são migrations executáveis.

Mantenha os registros históricos. Quando uma implementação, regra, fonte oficial ou resultado de teste mudar, atualize primeiro a referência atual correspondente e só depois o índice.
