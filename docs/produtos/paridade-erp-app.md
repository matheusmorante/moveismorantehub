# Auditoria de paridade do módulo Produtos: ERP → App Mobile

**Status:** em andamento. Este inventário acompanha as execuções cíclicas da auditoria. A Conciliação de Produtos segue exclusiva do ERP pela exceção dos Ciclos 127/131. A projeção técnica escolhida pelo usuário está aplicada nos dois writers desde o Ciclo 139, com `technical_specs` preservado por compatibilidade; o Ciclo 180 acrescentou 7 testes Vitest do helper compartilhado para simples, família, precedência, preservação e falha de leitura. O autosave seguro do Ciclo 117 já tem a RPC de ACK instalada no remoto pelo Ciclo 178; ainda falta provar resposta/idempotência com uma fixture previamente autorizada. O claim offline decidido pelo usuário está implementado e testado localmente (Ciclos 143/170), mas o backend remoto continua em v1: a migration necessária cria objetos em `app_private`, enquanto o `AGENTS.md` §13 autoriza migrations apenas em `public`; a pergunta sobre autorizar essa migration específica ou redesenhar o armazenamento continua pendente — a confirmação do modelo de ownership não concede essa autorização de schema. Não ativar as flags v2 nem declarar ownership remoto seguro antes dessa decisão e da validação. O Ciclo 181 comprovou acesso autenticado do ERP à lista e ao editor de composição por Playwright; outras abas/perfis e o aplicativo ainda não foram validados. O Ciclo 184 adicionou ao app o filtro administrativo para exibir registros de teste e compartilhou com o ERP o predicado PostgREST para marcadores em `technical_specs`; validação visual e Android/iOS seguem pendentes. Permanecem pendentes a confirmação de efeitos externos Meta/R2 e diagnósticos TypeScript globais em arquivos fora dos recortes recentes. Os demais ciclos e limitações seguem registrados abaixo; não declarar conclusão global enquanto houver estados sem conferência.

**Atualização do Ciclo 377:** a revisão do custo no cadastro rápido mobile pela NF-e confirmou que o valor inicial inclui os custos fiscais e adicionais rateados, como o `finalCost` calculado pelo ERP; o campo editável é uma particularidade mobile já registrada no inventário de formulários. Não encontrei diferença suportada no estado de custo para itens válidos. A mesma reauditoria confirmou que os handlers manuais de desconto do Produto Pai permanecem implementados e ligados às entradas mobile, corrigindo uma frase desatualizada no inventário de formulários; não há teste direto de interação desses callbacks.

**Atualização do Ciclo 378:** ERP e app mostram a galeria herdada sem ações de edição na variação única. Uma falha antiga era causada por teste ERP que esperava arraste nesse estado, contradizendo o código e o contrato de herança; atualizei a expectativa do teste para cobrir a visualização somente leitura, e a suíte focada passou em **5/5**. Nenhum comportamento de produção foi alterado.

**Atualização do Ciclo 379:** comparei a falha parcial de um lote com múltiplas fotos no Produto Pai. Os dois clientes só aplicam URLs ao rascunho após o lote inteiro terminar; ERP agenda arquivos em paralelo e app processa um a um. Registrei a serialização do app como adaptação de processamento local, sem alteração de código; possíveis objetos remotos órfãos após falha não foram verificados em R2.

**Atualização do Ciclo 380:** remover foto da galeria atualizava o rascunho no estado local, mas não agendava o autosave de 500 ms no ERP; no app, qualquer alteração no formulário incrementa a revisão e agenda o salvamento serializado. Passei a remoção ERP pelo callback de autosave já usado na inclusão/substituição e confirmei o contrato com teste focado **6/6**. Nenhuma operação de armazenamento remoto foi executada.

**Atualização do Ciclo 381:** reordenar fotos do Produto Pai no ERP também alterava apenas o estado local, sem o autosave de 500 ms que o app aciona por revisão do formulário. A reordenação ERP agora agenda o callback existente depois de cada mudança efetiva de posição, com debounce já fornecido pelo autosave. O teste focado passou em **7/7**; também corrigi um fixture de teste antigo que tratava a variação única como família multi-variação.

**Atualização do Ciclo 382:** recortar uma foto existente e aplicar o novo URL também agenda autosave de rascunho em ambos: ERP pelo callback após a substituição; app pelo incremento de revisão de `setFormData` e fila serializada. Acrescentei uma asserção RTL ao teste do recorte ERP; a suíte permaneceu em **7/7**. O app ainda revalida o URL de origem antes e depois do upload, proteção já documentada nos Ciclos 167–168.

**Atualização do Ciclo 383:** corrigi o carregamento da origem do recorte mobile: fechar o modal ou atingir o timeout agora cancela o `DownloadResumable` e remove o arquivo parcial do cache; a variante web também aborta cada tentativa HTTP em timeout/fechamento. Três testes Vitest cobrem cancelamento, timeout/limpeza e limpeza após sucesso. O typecheck mobile continua não zero por diagnósticos fora deste recorte.

**Atualização do Ciclo 384:** auditei a galeria de fotos próprias de cada variação em uma família com múltiplas variações. Seleção, limite de 15 URLs únicas da galeria do pai, compatibilidade de URLs legadas ao editar, desvinculação, recorte e ordenação final estão cobertos por regras compartilhadas ou equivalentes; os botões móveis “Mover para cima/baixo” substituem o arraste web sem restringir a ordem possível. O ERP aguarda o ACK do autosave do rascunho dentro da troca da foto; no app, o modal fecha após atualizar o formulário, e o `ProductFormScreen` exibe o estado da fila serializada (salvando/salvo/erro), agenda após 500 ms e faz flush/espera do ACK antes de fechar o formulário. Essa progressão é adaptação de feedback do modal nativo e permanece protegida contra perda silenciosa ao sair; não encontrei diferença comprovada de regra ou payload que justifique novo mecanismo. Vitest focado: ERP **42/42**; mobile **8/8**. Falta teste direto do componente editor móvel, UI autenticada Playwright e runtime Android/iOS; nenhum upload ou salvamento remoto foi feito. Detalhes e arquivos no Ciclo 384 abaixo.

**Atualização do Ciclo 385:** a captura enviada pelo usuário mostrou o erro de carregamento da lista com o contador “0”, embora esse valor fosse apenas o estado inicial após falha. No ERP, erro e lista vazia retornam antes de renderizar o contador; no app ele aparecia sempre. O cabeçalho mobile agora só mostra a contagem quando a consulta mantém linhas, preservando-a durante atualização com snapshot. Teste Vitest focado: **2/2**. O estado visual pós-correção ainda não foi conferido em aparelho físico.

**Atualização do Ciclo 386:** a restauração pela Lixeira aplica o mesmo gate `deleteProducts` e a mesma RPC `restore_product_from_trash(p_product_id)` no ERP e no app; ambos validam o UUID, restauram o pai e as variações conforme estados anteriores e solicitam sincronização Meta após sucesso. O app acrescenta resolver RHF/Zod e timeout limitado, e faz refresh aguardado; o ERP atualiza o cache/invalida queries e usa toast. Os testes focados passaram: ERP **3**, serviço mobile **5**, gate mobile **2**. A query antiga incluía também `active=false`; a decisão do usuário sobre Lixeira versus Desativados foi aplicada nos dois clientes no Ciclo 390.

**Atualização do Ciclo 387:** ao reabrir produto para edição, a lista mobile não reconhecia atributos legados gravados como `attribute_name`/`option` e podia manter valores vazios; o ERP já os convertia e filtrava. Extraí o parser puro para `shared-utils` e passei a usá-lo no mapeamento ERP e na hidratação da lista mobile. A adaptação mobile preserva `showName` em objetos estruturados e aliases já aceitos (`attribute`/`val`). Vitest focado: **39/39**; `git diff --check` limpo, somente avisos de conversão CRLF/LF. Persistem sem conferência Playwright autenticada e runtime Android/Maestro. Nenhuma gravação remota ou sincronização externa ocorreu.

**Atualização do Ciclo 388:** reauditei o botão “Tentar novamente” no estado de erro da lista mostrado na captura. ERP e app só substituem a lista por erro quando não há linhas para a consulta, usam a mesma mensagem e recarregam a mesma página/filtros ao tentar de novo. O QueryClient ERP e o helper mobile fazem uma repetição automática com intervalo inicial de 1 s antes de exibir a falha. Vitest focado ERP/mobile: **27/27**. Não encontrei diferença de código; a causa do erro da captura não é identificável sem log/erro da consulta real.

**Atualização do Ciclo 389:** o typecheck mobile detectou uma referência restante a `getDimensionField` depois que o Ciclo 374 substituiu essa função local pelo helper compartilhado `getProductTechnicalDimensionField`. Troquei a chamada residual, mantendo o critério de dimensão física do formulário; o TS2304 saiu do arquivo de Produtos. Vitest do helper compartilhado: **21/21**. O typecheck global continua falhando por diagnósticos em outros arquivos, documentados abaixo.

**Atualização do Ciclo 328:** as sugestões de componentes na aba Composição agora exibem o preço promocional com a mesma precedência do ERP, usando regra compartilhada. O preço regular que é gravado na linha do componente não foi alterado.

**Atualização do Ciclo 352:** reauditei a elegibilidade de Serviços no seletor de componentes. `itemType: 'standard'` do app significa “fora de composição”, não “somente `item_type = product`”; ERP e app podem sugerir Serviços ativos. A divergência apontada inicialmente no Ciclo 324 era uma leitura incorreta desse enum e fica resolvida sem mudar o comportamento.

**Atualização do Ciclo 353:** a busca de componentes no ERP agora mostra o estado vazio somente após resposta confirmada sem resultados. Se a consulta falhar, apresenta erro e retry sem afirmar também que nenhum produto existe, alinhando-se ao app.

**Atualização dos Ciclos 354–355:** a reauditoria constatou que a suposta lista de CFOPs de Produto do Ciclo 354 era apenas um cálculo não renderizado; seu teste cobria o helper, não a tela. Removi essa alteração sem efeito. Na mesma aba, corrigi uma divergência real para Serviço: um CFOP municipal legado fora de 5933/6933 era mostrado falsamente como 5933 no app. Agora o valor salvo é identificado como indisponível sem ser alterado; somente a seleção explícita troca o código. Vitest mobile passou em **3/3**. A permissão do Catálogo (`productConfig`) segue distinta da permissão tributária e bloqueia a ação para perfis sem acesso, conforme confirmado pelo operador. Sem Playwright autenticado ou validação Android/Maestro; não houve consulta/escrita remota, SEFAZ, Meta, migration ou deploy.

**Atualização do Ciclo 356:** para perfis sem permissão tributária, o grupo continua esmaecido e sem interação; agora cada controle nativo também é anunciado como desabilitado e permanece acessível ao leitor de tela, em vez de desaparecer da árvore de acessibilidade apesar do aviso de somente consulta. Vitest mobile passou em **2/2**. A regra de papéis válidos é equivalente entre ERP/app. A resposta recente sobre Catálogo confirma o contrato já coberto nos Ciclos 303–306: sem `productConfig`, o status fica visível, mas desabilitado; rascunho e requisitos de publicação são bloqueios diferentes. Esse gate não precisa ser reauditoria pendente.

**Atualização do Ciclo 357:** na aba Tributário/NF, o app agora usa o título genérico do ERP quando o tipo é Serviço; antes dizia “Classificação Fiscal (NCM)” acima do código municipal de serviço. A revisão confirmou que as condições dos campos de Produto e Serviço já coincidem nos dois clientes. Vitest mobile **4/4**, teste fiscal ERP **3/3**; sem Playwright autenticado ou dispositivo nativo.

**Atualização do Ciclo 358:** na aba Estoque e Precificação, alinhei o cabeçalho mobile “Preços de Venda & Desconto” ao ERP (“Precificação e Descontos”) e acrescentei “(Produto Pai)” quando o formulário contém variações. A alteração é de apresentação; handlers, cálculos compartilhados, sincronização e payloads não mudaram. Vitest/RTL mobile **2/2**; sem Playwright autenticado ou Android/Maestro.

**Atualização do Ciclo 359:** o snapshot de rascunho mobile deixava os campos auxiliares de desconto do produto pai dentro de `technical_specs.draftProduct`, embora o ERP os mantenha apenas em estado local. O helper compartilhado agora os remove, preservando `unitPrice`/`promoPrice`; Vitest mobile **61/61** e ERP **10/10**. Auditoria geral continua aberta.

**Atualização dos Ciclos 360–361:** a seleção de fornecedor confirmou equivalência de limite (três), fornecedor principal, defaults de IPI/frete e custo final. O Ciclo 361 corrigiu a divergência para IDs legados duplicados: ERP e app agora usam `normalizeProductSupplierIds` compartilhado. Vitest mobile focado: **3/3**; comparação visual/nativa segue pendente.

**Atualização do Ciclo 363:** conferi a disponibilidade da aba Estoque e Precificação para Serviço. ERP e app a ocultam, mantêm a aba tributária e retornam à aba Geral se a troca de tipo invalidar o estado ativo. Nenhuma diferença funcional comprovada; sem mudança de código.

**Atualização do Ciclo 364:** comparei o checklist de prontidão da variação no formulário principal mobile com o cabeçalho do modal de variação ERP. Ambos montam o registro efetivo pelo helper compartilhado e executam os mesmos verificadores de legibilidade do ERP e do Catálogo. No modo família, o indicador de preço verifica a existência de variações; o preço próprio/herdado de cada linha continua validado individualmente na submissão nos dois clientes. Não foi comprovada divergência mobile, então não alterei código.

**Atualização do Ciclo 329:** o usuário confirmou alinhar ERP e app à documentação ao converter uma família salva de duas variações em produto simples. Os dois clientes já reativam a herança do pai para os campos comerciais documentados, mantendo UUID/SKU, saldo físico e atributos próprios; não foi necessária nova alteração de produção.

**Atualização do Ciclo 330:** cobri com Vitest o callback de remoção do componente na aba móvel de Composição: a linha selecionada sai do estado do formulário e as demais permanecem. O teste ERP do formulário também passou; nenhum código de produção mudou.

**Atualização do Ciclo 331:** corrigi a geração em lote nos dois clientes para usar no nome automático apenas valores de atributos com `showName !== false`; os atributos ocultos continuam persistidos e disponíveis para filtros e validação.

**Atualização do Ciclo 332:** esclareci o controle `showName` no modal ERP e no modal mobile. Os rótulos agora dizem se o valor da característica entra no nome automático, sem sugerir que “só o valor” aparece quando a opção está desligada.

**Atualização do Ciclo 333:** no cadastro de tipos de produto, o app agora exibe indicador de gravação e desativa o botão durante a inserção, como o ERP. O formulário continua validando pelo schema compartilhado e serviço/payload permanecem iguais.

**Atualização do Ciclo 335:** a busca de categorias no app agora preserva espaços nas pontas do termo, como a busca ERP existente; a regressão confirma também que termo composto só por espaços não ativa filtro. Testes do domínio de categorias: **48/48**.

**Atualização do Ciclo 336:** documentei como adaptação nativa justificada a orientação contextual dos estados vazios de Categorias/Ambientes no app: diferencia busca sem resultado de cadastro vazio e indica a recuperação pelo toque. Não altera filtro, dados ou ações; o ERP conserva sua mensagem de tabela.

**Atualização do Ciclo 305:** o usuário confirmou que a ação do Catálogo deve ficar bloqueada para perfis sem a permissão correspondente. ERP/app já bloqueiam a interface; a migration local de proteção no banco corresponde a esse contrato, mas permanece não aplicada e não comprovada no remoto.

**Atualização do Ciclo 303:** o status do Catálogo permanece visível e bloqueado para perfil sem `productConfig`; o salvamento não publica nem oculta. Rascunho e pendências de legibilidade são bloqueios separados da autorização. O ERP agora usa fallback fechado (`canManageCatalog=false`) quando um chamador omite a permissão, convergindo com o default mobile. Vitest ERP passou em **10/10**.

**Atualização do Ciclo 302:** não foi possível validar a tecla de busca em Android: `adb devices -l` não listou telefone e o comando Maestro não está instalado. Não instalei/substituí build nem alterei dados; a prova nativa segue pendente.

**Atualização do Ciclo 243:** na família com múltiplas variações, o app agora limita a 15 as fotos próprias ao carregar e gravar, sem limitar a galeria do pai nem a galeria herdada de produto simples. Reordenação e desvínculo de URL legado não dependem mais de a foto ainda existir na galeria do pai; novas seleções continuam restritas às fotos disponíveis. Vitest mobile **55/55**, modal ERP **9/9** e `git diff --check` passaram. A verificação TypeScript mobile ainda encerra com 10 diagnósticos globais, sem referências aos arquivos alterados. Sem Playwright autenticado, Android/Maestro ou escrita remota.

**Atualização do Ciclo 154:** a entrada de estoque continua atualizando `stock` e CMPM/`costPrice`; ela não recalcula `finalPurchasePrice` no ERP. Como a documentação vigente não cria essa regra e a hidratação do formulário ERP/mobile usa o mesmo cálculo compartilhado, foi preservado o resultado atual do ERP conforme a instrução permanente do usuário para divergências sem contrato documentado.

**Atualização do Ciclo 155:** o seletor de características de categoria no app agora segue o mínimo de duas letras e a normalização compartilhada do ERP. Leituras do catálogo/vínculos têm limite de 15 s nos dois clientes; o formulário continua falhando fechado quando não consegue carregar a configuração atual. O campo-filho foi vinculado ao proprietário RHF/Zod no inventário de formulários.

**Atualização do Ciclo 156:** a tela nativa do Catálogo Meta agora alerta que o feed CSV é legado, orienta usar a Graph API e manda confirmar publicação/remoção pelo `retailer_id` ou SKU no catálogo externo. Não houve chamada de rede ou alteração do endpoint CSV.

**Atualização do Ciclo 160:** a releitura estática confirmou que a projeção de atributos obrigatórios alcança tanto a variação operacional única de produto simples quanto cada linha de uma família, via helper compartilhado usado pelos writers ERP e mobile. Foram corrigidos os marcadores históricos dos Ciclos 38–39 que ainda diziam que essa persistência e a interface mobile da Conciliação estavam pendentes. Prova remota de dados, UI autenticada e runtime Android/iOS permanecem pendentes.

**Atualização do Ciclo 161:** alinhei o payload mobile ao ERP ao apagar a característica `Marca`: o app agora preserva `brand: ''` (e omite a chave quando o campo não foi fornecido), em vez de converter string vazia para `null`. O teste focado do serviço passou em 27/27 após estabilizar o mock da leitura de atributos obrigatórios; a validação visual autenticada e nativa segue pendente.

**Atualização do Ciclo 162:** reauditei `channelBaseDescriptions.whatsapp` em todos os caminhos ativos de envio Graph revisados e acrescentei cobertura Vitest para os serviços ERP/mobile. Os fluxos por lote e o envio individual ERP incluíram a base configurada nos payloads testados, sem duplicar o prefixo. Não encontrei um caminho ativo revisado que publique a descrição sem a base configurada; não houve chamada à Meta.

**Atualização do Ciclo 163:** revalidei estaticamente o autosave de rascunhos contra o hook ERP, a fila mobile e a RPC versionada local. A fila/version-ack mobile passou novamente em 35/35 testes Vitest. O estado remoto continua pendente conforme a última evidência registrada no Ciclo 141; não apliquei migration nem fiz chamadas remotas.

**Atualização do Ciclo 164:** reexecutei os testes atuais da conversão família→produto simples nos dois clientes. ERP passou em 12/12 e mobile em 8/8; a leitura confirmou o helper compartilhado e a preservação explícita do saldo, UUID, SKU e atributos da variação sobrevivente. UI autenticada/nativa e persistência remota seguem sem prova.

**Atualização do Ciclo 165:** no upload direto de fotos do formulário mobile, substituí a chave R2 baseada em `Date.now()` + nome informado por UUID + nome sanitizado, como no ERP. A API de upload continua recebendo o mesmo contrato; teste Vitest cobre nomes repetidos e fallback quando `crypto.randomUUID` não existe (6/6). Sem upload remoto ou validação visual/nativa.

**Atualização do Ciclo 166:** a aba Fotos mobile agora gera as versões WebP média e miniatura requisitadas pelos leitores de imagem, usando perfis compartilhados com o ERP (1000 px/0,5 MiB/0,85 e 200 px/0,05 MiB/0,75). O upload original permanece obrigatório e é o único URL persistido; falhas nos derivados usam fallback para o original. A validação Vitest passou em **10/10 do serviço de fotos**, mais **3/3 do domínio de recorte**, e **24/24 ERP**; a verificação TypeScript isolada dos arquivos mobile alterados passou. Playwright autenticado/R2 e Android/iOS continuam pendentes; o TypeScript global mobile segue bloqueado por sintaxe preexistente em `CategoryAttributesPicker.tsx:154`.

**Atualização do Ciclo 167:** o recorte de foto de uma variação agora valida por RHF/Zod se o URL de origem ainda está na galeria exibida antes do processamento/upload e repete a validação antes de aplicar a substituição. A rotina ERP já verificava a origem antes do upload e na etapa de troca; no mobile, uma origem obsoleta podia subir um arquivo órfão e fechar o recorte sem substituir nenhuma referência. O schema compartilhado novo e seu Vitest passaram em **2/2**; validação TypeScript direcionada foi executada, sem diagnóstico nos arquivos alterados, mas o comando terminou com incompatibilidades preexistentes fora deles. Playwright autenticado, R2 real e Android/iOS permanecem pendentes.

**Atualização do Ciclo 168:** a aba Fotos do produto pai passou a fornecer ao modal de recorte a lista atual da galeria. Assim, o mesmo schema RHF/Zod rejeita a origem removida antes de processar/enviar e volta a verificá-la antes de aplicar a substituição, alinhando o estado do produto pai à validação já usada nas fotos de variação.

**Atualização do Ciclo 169:** no envio final de produto simples com `minStock` negativo, ERP e app bloqueiam pelo resolver Zod e mantêm a aba ativa sem redirecionar para Estoque e Precificação. A comparação das rotas mostrou equivalência, não uma diferença exclusiva mobile. Os outros estados de preço/estoque e as validações visuais/nativas seguem em aberto.

**Atualização do Ciclo 175:** removido o bloqueio de parser no seletor mobile de atributos de categoria. O TypeScript global deixou de reportar `TS1005` nesse arquivo; continuam 12 diagnósticos em outras áreas do app/shared-utils, registrados no ciclo abaixo.

**Atualização do Ciclo 176:** corrigida a assinatura Zod v4 do schema compartilhado de descrições por IA. O compilador mobile deixou de apontar `productAiFormSchemas.ts`; permanecem 11 diagnósticos globais em arquivos alheios ao schema, conforme evidências do ciclo abaixo.

**Atualização do Ciclo 177:** o resultado timeout/valor do helper compartilhado de atributos agora é discriminado por presença de `value`, resolvendo o diagnóstico TypeScript sem alterar o prazo ou o fail-closed já aplicado a ERP e mobile. A checagem global reduziu de 11 para 10 diagnósticos; o helper passou em **3/3** testes Vitest dedicados.

**Atualização do Ciclo 183:** o app passou a distinguir uma falha de atualização da mesma consulta de uma falha após mudar filtro/página. Assim mantém na tela somente o último snapshot que corresponde à consulta atual, como o ERP, sem ocultar resultados válidos por causa de um refresh malsucedido nem vazar itens de filtros anteriores. O helper puro de snapshot passou em **6/6** testes Vitest; UI e runtime Android/iOS continuam pendentes.

**Atualização do Ciclo 184:** o filtro administrativo de registros de teste foi acrescentado à lista mobile, validado pelo schema RHF/Zod antes da consulta e protegido pela permissão administrativa derivada da sessão. O predicado PostgREST dos marcadores JSON em `technical_specs` agora é único e compartilhado entre o filtro da lista ERP, as estatísticas ERP e o serviço mobile, mantendo a exclusão no servidor antes de paginação; a visualização habilitada também alcança as cargas completas por ID. Vitest focado: mobile **26/26**, ERP **12/12**. Os checks TypeScript globais continuam não zero por diagnósticos fora dos arquivos alterados; Playwright e Android/iOS não foram executados, conforme as limitações de sessão já registradas no Ciclo 182. Nenhum dado remoto foi gravado; o runner ERP executou o `build:support` previsto pelo script do pacote e alterações preexistentes de suporte/guia foram preservadas.

**Atualização do Ciclo 201:** o descarte de rascunho mobile agora usa a RPC `delete_unreferenced_product`, igual ao ERP, sem excluir variações diretamente, ignorar falhas ou converter falha em exclusão lógica silenciosa. A tela impede a chamada sem as permissões que tornam o item disponível (`productConfig` e `deleteProducts`); a RPC também verifica `deleteProducts`, referências/estoque e concorrência antes de excluir. A confirmação passa pelo resolver RHF/Zod e só remove o item local após resposta de sucesso. A implantação remota da função e a validação Android/iOS permanecem pendentes; não houve consulta ou escrita remota.

**Atualização do Ciclo 202:** “Mover para lixeira” no app agora repete o gate de permissão na tela, executa a confirmação por RHF/Zod e aplica timeout de 10 s ao RPC transacional; somente resposta de sucesso agenda o Graph. Vitest focado passou em **79/79**. A RPC operacional e o comportamento Android/iOS não foram consultados.

**Atualização do Ciclo 157:** foram reconciliados marcadores antigos de “próximo recorte” já cobertos por ciclos posteriores (variações, projeção de atributos, composição, lista, preço/estoque, responsável do inventário e Meta). As limitações de UI autenticada/nativa, persistência externa e RPC de saldo/CMPM continuam pendentes; nenhuma foi fechada por evidência estática.

> **Exceção vigente — decisão do usuário no Ciclo 127, reafirmada no Ciclo 131:** a Conciliação de Produtos permanece somente no ERP. A tela, o acesso pelo menu/estado de produtos, o adaptador de serviços e os helpers de ciclo de vida específicos do mobile foram removidos. Não tratar sua ausência no aplicativo como diferença de paridade, não propor nova implementação e não a reintroduzir sem pedido explícito posterior. Permanecem no ERP a rota, a permissão e os serviços compartilhados que ele consome; a regra permanente está em `AGENTS.md`, `rules/products/product-reconciliation-erp-only.yml` e na automação recorrente.

> **Recuperação do inventário — 23/10/2026:** o arquivo do workspace foi encontrado com 0 bytes após falta de espaço no volume C:. A versão rastreada no Git foi restaurada; ela continha os ciclos 1–5. Os ciclos 8–12 abaixo foram recompostos apenas a partir dos registros atuais em `docs/geral/roadmap_pendente.md` e `docs/forms/inventario-mobile-catalogo-2026-10-15.md`. Não há evidência localizada para reconstituir os ciclos 6–7, então eles permanecem sem status de conclusão.

## Regras e referências consultadas

- `AGENTS.md` e `docs/geral/USER_RULES.md`.
- Skills de replicação ERP → app. A cópia encontrada neste workspace está em `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/erp-web-to-mobile-replication/SKILL.md`; ela está em cache gerado e não foi tratada como fonte canônica. Nenhuma cópia canônica foi encontrada em `.agents/skills` na raiz, `erp/` ou `mobile/` durante este ciclo.
- `docs/negocio/produtos/estrutura-produto-variacao.md` e `docs/negocio/produtos/operacoes-troca-pai-merge.md`.
- `docs/negocio/estoque/inventario-e-ajustes.md`, `docs/negocio/estoque/movimentacoes-e-custo.md` e `docs/negocio/estoque/contrato-indice-inventario-offline.md`.
- `docs/arquitetura/offline-e-sincronizacao.md` e `docs/mobile/arquitetura_offline_first.md`.
- Regras em `rules/`; `rules/products/product-reconciliation-erp-only.yml` protege a exceção ERP-only registrada nos Ciclos 127/131. A regra `rules/stock/no-inventory-move-write-in-ui.yml` foi consultada no Ciclo 93 e delimita a pendência: qualquer futura ação mobile de entrada precisa gravar por serviço/RPC de estoque autorizado, nunca diretamente pela UI.
- A skill atual não foi localizada fora do cache de build `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/erp-web-to-mobile-replication/SKILL.md`; suas instruções foram usadas como orientação, sem tratá-la como fonte canônica.

## Ciclo 1 — modos simples/variações e composição

**Recorte:** distinção entre produto simples, produto com múltiplas variações e composição; seleção de componentes e validação de ativação.

### Resultado da comparação de código

- [x] O modo simples/variável do app usa a mesma regra operacional do ERP no formulário: produto simples tem uma variação; o modo com variações precisa de múltiplas linhas. O rascunho preserva o modo salvo enquanto ainda pode estar incompleto. Referências: `mobile/src/features/products/domain/mobileProductVariationMode.ts`, `mobile/src/features/products/screens/ProductFormScreen.tsx`, `mobile/src/features/products/modals/tabs/ProductFormBasicTab.tsx`; ERP: `erp/src/pages/App/Products/components/tabs/ProductGeneralTab.tsx` e `erp/src/pages/App/Products/ProductList/utils/catalog/productListTransformers.ts`.
- [x] A aba de variações do app aparece somente quando o modo multi-variação está habilitado. A edição dos componentes da composição ocorre por variação, como no ERP: `mobile/src/features/products/modals/tabs/ProductFormVariationsTab.tsx` e `ProductFormCompositionTab.tsx`; ERP: `erp/src/pages/App/Products/modals/VariationFormModal.tsx` e `erp/src/pages/App/Products/components/variationTabs/VariationCompositionItemsTab.tsx`.
- [x] A busca de componentes do app exclui composições, respeita fornecedor e seleciona produtos ou variações ativas não mescladas, preservando o UUID do produto e, quando aplicável, o UUID da variação. O fluxo ERP equivalente está em `erp/src/components/ProductAutocomplete.tsx` e `erp/src/components/hooks/useProductAutocomplete.ts`.
- [x] A validação de ativação é compartilhada em `shared-utils/productActivationValidation.ts`; o serviço mobile e o hook ERP passam os dados do produto, variações e componentes para a mesma regra.
- [x] A fórmula de disponibilidade de composição é compartilhada em `shared-utils/compositionMath.ts`; o ERP mantém um reexport de compatibilidade em `erp/src/pages/utils/compositionMath.ts` e o app importa a mesma função.
- [x] O formulário mobile passa pelo wrapper RHF com `zodResolver` em `mobile/src/hooks/useZodForm.ts` e pelo schema de domínio `shared-utils/mobileProductFormSchema.ts`.
- [x] A composição simples pode manter componentes no produto pai e a composição com variações pode manter componentes por variação. A documentação informa que o ERP não expõe edição de componentes no pai de uma composição simples; o app também não foi encontrado com esse editor. Portanto, não foi criado um fluxo mobile que não existe no ERP. O app preserva os dados raiz ao carregar e salvar.
- [x] Não foi encontrada neste recorte uma diferença funcional comprovada que justificasse alterar o código mobile. O workspace já continha alterações não commitadas, inclusive no módulo de Produtos; elas foram preservadas.

### Validação executada

- Mobile: Vitest focado para `mobileProductVariationMode`, `mobileProductCompositionItems` e `mobileProductCompositionService`: **3 arquivos, 13 testes aprovados**.
- ERP: Vitest focado para `useProductsActivationValidation` e `productListTransformers`: **2 arquivos, 15 testes aprovados**.
- Não houve comparação visual/interativa via Playwright neste ciclo. A paridade visual deste recorte continua pendente; os testes de lógica não comprovam interface ou comportamento nativo.

## Ciclo 2 — tentativa de comparação visual (acesso)

**Recorte:** abertura visível do ERP para iniciar a comparação do seletor Simples/Com variações.

- [x] Playwright foi aberto em modo visível na porta `5173`; a UI mostrou `http://localhost:5173/login`, com campos de e-mail e senha. A sessão de navegador foi mantida aberta.
- [x] As variáveis do projeto Vercel foram consultadas sem descriptografar valores. Não foi localizada credencial de teste de login do ERP/app. As variáveis de operador encontradas são exclusivas dos cenários fiscais e não foram reutilizadas para autenticação geral.
- [x] O setup E2E local documenta fallback de sessão mockada quando a senha não está configurada; esse fallback não foi usado, pois não comprova autenticação nem preserva a guarda de acesso.
- [ ] A tela de Produtos do ERP e a correspondente tela Expo Web não foram alcançadas. Nenhuma conclusão visual ou funcional foi tirada deste ciclo e nenhum código de produto foi alterado.
- [ ] Para destravar a comparação visual, disponibilizar uma conta de teste do aplicativo nas variáveis de desenvolvimento da Vercel, sem compartilhar a senha no chat. Depois, retomar pelo seletor simples/variações.

## Ciclo 3 — busca textual da lista

**Recorte:** contrato de busca por nome na lista de Produtos, incluindo debounce, termos de produto/variação e limite de correspondências.

### Resultado da comparação e correções

- [x] O ERP e o app agora compartilham `PRODUCT_LIST_SEARCH_MIN_LENGTH`, o debounce de 350 ms e a construção dos termos em `shared-utils/productListSearch.ts`. A busca continua exigindo pelo menos 3 caracteres; apagar o texto limpa a busca imediatamente e reduzir para 1–2 caracteres limpa o filtro após o debounce. Antes, o app mantinha a consulta anterior ao digitar um termo curto, apesar de mostrar o novo texto.
- [x] A busca de nomes de produto e variação usa a mesma construção de termos no ERP e no app. O ERP já detectava mais de 100 correspondências buscando até 101; o app limitava a 100 e podia mostrar uma lista truncada como se estivesse completa. O serviço mobile agora busca até 101 e apresenta a mesma mensagem de refinamento do ERP quando ultrapassa 100.
- [x] Os filtros de status ativo/inativo ficam suspensos enquanto há busca textual, mantendo o rascunho de filtro, como no ERP. A busca não considera a descrição: o contrato atual consulta nome/código do pai e nome/SKU de variações pela regra compartilhada. Esta descrição substitui a frase histórica incorreta, corrigida no Ciclo 301.
- [x] O tipo do hook ERP `useProductsPageState` foi apontado para o arquivo existente em `erp/src/pages/types/product.type.ts`; isso removeu o diagnóstico de import no arquivo alterado e permitiu verificar sua tipagem no contexto atual.
- [ ] A comparação visual/funcional via Playwright segue pendente: a sessão disponível ainda abre em `/login`, sem credencial geral de teste nas variáveis de desenvolvimento consultadas. A inspeção deste ciclo foi de código e testes; Expo Web também não comprovaria comportamento nativo.

### Validação executada

- Mobile: Vitest focado em `mobileProductListFilters.test.ts`, `mobileProductSearch.test.ts` e `mobileProductFetchService.test.ts`: **3 arquivos, 16 testes aprovados**.
- ERP: Vitest focado em `productFilterBuilder.test.ts`: **1 arquivo, 9 testes aprovados**.
- TypeScript: os comandos de verificação completa dos projetos continuam não zero por diagnósticos preexistentes em outros arquivos. A filtragem dos resultados não encontrou diagnósticos nos arquivos alterados deste ciclo, tanto no mobile quanto no ERP.

### Achado separado: ordenação

- [x] A ordenação foi auditada no Ciclo 80: embora a tabela ERP XL mostre ícones, o callback da página é inerte e a ação não altera filtros nem consulta; essa tabela fica oculta no layout de cards. A lista efetivamente disponível em ERP e mobile inicia em `created_at DESC`, portanto não se adicionou seletor mobile sem equivalente funcional.

## Ciclo 4 — filtros da lista e limpeza

**Recorte:** status ERP, tipo geral, publicação no Catálogo Digital, categoria e ação para limpar filtros.

### Resultado da comparação e correção

- [x] Os controles de status e publicação no Catálogo Digital correspondem aos do ERP: Ativos/Desativados/Rascunhos e Publicados/Ocultados. A seleção no app passa por `productListFormSchema` antes da consulta; estados ativo, desativado e rascunho seguem cláusulas próprias no serviço mobile.
- [x] O rótulo de tipo geral existe nas duas interfaces. A auditoria inicial encontrou que “Somente Produtos” no ERP inclui `item_type` produto, composição e nulo, enquanto o app consultava apenas `item_type = product`. A diferença foi corrigida no Ciclo 29 com predicado compartilhado e inclusão de composições condicionada a `viewProductCompositions`; sem a permissão, a exclusão mobile continua. O estado padrão **Todos** no app permanece em ciclo próprio.
- [x] O ERP oferece `Limpar`/`Limpar Filtros`; o mobile não oferecia uma ação equivalente. O app agora limpa busca aplicada e exibida, status, tipo geral, categoria e status do catálogo, restaura a inclusão de desativados e volta à primeira página. A ação preserva o modo Lixeira e o controle de itens mesclados, como os estados independentes correspondentes no ERP.
- [x] O filtro de categoria mobile usa UUIDs e considera `products.category_id`, a relação normalizada `product_categories` e o nome legado em `products.category`, conforme a classificação de produto por múltiplas categorias descrita em `docs/negocio/produtos/estrutura-produto-variacao.md`.
- [x] Divergência do filtro de categoria corrigida no Ciclo 32: `ProductFilters` envia o UUID, e agora ERP e mobile consultam `category_id`, `product_categories` e o nome legado da categoria pelo mesmo helper compartilhado. O salvamento ERP grava `category_id`/`product_categories` e remove o texto legado (`productPersistenceService.ts`); nenhum cliente foi reduzido ao contrato textual antigo.
- [x] O filtro de rascunhos foi alinhado no Ciclo 31: ERP e mobile usam o predicado compartilhado `is_draft = true OR status = 'draft'`, coerente com os mappers dos dois clientes.
- [ ] Não houve inspeção visual via Playwright neste ciclo: a sessão disponível continua em `/login`, e o acesso à tela de produtos sem autenticação não foi contornado.

### Validação executada

- Mobile: Vitest em `mobileProductListFilters.test.ts`: **1 arquivo, 5 testes aprovados**.
- TypeScript mobile: verificação completa não zero por erros preexistentes fora dos arquivos alterados; não houve diagnóstico nos arquivos alterados deste ciclo.
- O teste de UI e a comparação visual seguem pendentes até a tela autenticada estar acessível. Expo Web, quando disponível, não comprova comportamento nativo.

## Ciclo 5 — carregamento, erro e lista vazia

**Recorte:** estados da lista de Produtos após consulta, falha, ausência de itens e busca sem resultados.

### Resultado da comparação e correção

- [x] O ERP exibe carregamento com “Sincronizando catálogo...”; o app mostra `ActivityIndicator` e “Carregando produtos...”. Ambos substituem a lista enquanto a carga inicial está em andamento.
- [x] O ERP executa `fetchProductsPage(..., { throwOnError: true })` e, em caso de falha sem dados atuais, mostra estado de erro e ação “Tentar novamente”. O mobile já tinha `loadError`, botão de nova tentativa e tratamento da exceção no hook, mas a consulta da lista não ativava `throwOnError`. Como `fetchMobileProductsPage` converte erros de consulta em `{ data: [], total: 0 }` por padrão, falhas da lista podiam aparecer como ausência de produtos.
- [x] A chamada de listagem em `useMobileProducts` agora define `throwOnError: true`. A exceção alcança o `catch` existente, que mostra o estado de erro e preserva a ação de nova tentativa. Outros chamadores do serviço mantêm o comportamento tolerante padrão.
- [x] A ausência de itens possui mensagem específica no app para composições e lixeira e mensagem geral para produtos; a lista ERP usa mensagem geral. Para busca sem resultados, ambos apresentam estado vazio sem erro. Não foi identificada diferença funcional que exija outra alteração neste recorte.
- [ ] A comparação visual permanece pendente: Playwright abriu `http://localhost:5173/login` e mostrou a tela de autenticação; não foi possível acessar Produtos no ERP ou no Expo Web. Não houve tentativa de contornar a guarda. A cópia consultada da skill continua somente em cache de build, sem fonte canônica localizada.

### Validação executada

- Mobile: Vitest focado em `mobileProductFetchService.test.ts`: **1 arquivo, 9 testes aprovados**, incluindo propagação de erro com `throwOnError` habilitado.
- TypeScript mobile: a verificação completa ainda retorna diagnósticos preexistentes em outros módulos; não houve diagnóstico em `useMobileProducts.ts` nem no teste alterado.
- `git diff --check`: aprovado. A tela autenticada e o comportamento nativo não foram validados visualmente neste ciclo.

## Ciclos 6–13 — evidências recuperadas e atualizações recentes

### Ciclos 6–7 — histórico não reconstruído

- [ ] A cópia rastreada recuperada termina no Ciclo 5, e as referências atuais consultadas não descrevem os Ciclos 6–7. Não atribuir conclusão a esses ciclos sem localizar evidência adicional.

### Ciclo 8 — ambiente e categoria no formulário básico

- [x] O registro do roadmap informa que a resolução de ambiente pelas categorias passou a usar a travessia compartilhada ERP/app em `shared-utils/productCategoryResolution.ts`; o campo `environment` foi explicitado no schema Zod mobile e o seletor Oportunidade foi bloqueado no ERP. A validação visual autenticada permanece pendente.

### Ciclo 9 — informações básicas e título

- [x] O registro do roadmap confirma que `ProductTitleTab` não está conectado ao formulário ativo do ERP e que o mobile alinhou a sincronização de `name`, `title` e `marketplaceTitle` ao fluxo ativo. A inspeção visual autenticada não foi possível; não tratar a aba desconectada do ERP como paridade visual comprovada.

### Ciclos 10–12 — remoção, limite, substituição e recorte de fotos

- [x] A remoção de imagem do produto pai usa `removeProductImageGlobally`, compartilhada entre ERP e mobile. O limite de seleção passou a ser aplicado a arquivos/assets antes de leitura e upload, por `limitProductImageSelection`. A substituição é centralizada em `replaceProductImageGlobally` em `shared-utils/productImageOperations.ts`, com propagação compatível para produto pai, variação única e referências legadas.
- [x] O checkpoint de formulários registra 12 testes mobile e 24 ERP aprovados para o conjunto de operações de fotos dos Ciclos 10–12. Isso prova os casos cobertos pelos testes, não upload remoto real nem comportamento nativo.
- [x] Diferença de recorte resolvida no Ciclo 15: o ERP compõe o resultado no palco branco 1080×1080; o mobile agora rasteriza o mesmo palco com `react-native-svg`, converte a seleção de layout para pixels e recorta essa imagem pelo Expo ImageManipulator. A geometria e a margem continuam cobertas pelo schema compartilhado; a confirmação visual em Android/iOS permanece pendente.

### Ciclo 13 — fotos: ordenação da galeria do produto pai

- [x] No ERP, o arraste da galeria move uma foto para qualquer posição e, quando há exatamente uma variação, sincroniza a ordem herdada nessa variação. O app oferecia apenas “Definir como Capa” e alterava somente `images` do pai; não permitia posições intermediárias e podia deixar a galeria local da variação única desatualizada.
- [x] A regra pura passou a ser compartilhada por `shared-utils/productImageOrdering.ts`, com `moveProductImageGlobally` para reordenar o pai e alinhar a variação única sem mutar a entrada. ERP e mobile usam a função compartilhada. O modal mobile agora oferece mover para cima/baixo com área de toque mínima de 44 px; variações múltiplas mantêm suas galerias próprias.
- [x] Vitest focado: **2 arquivos / 14 testes ERP** e **1 arquivo / 5 testes mobile** aprovados. A suíte adicional `VariationPhotosTab.test.tsx` falhou ao buscar o título `Clique para ver opções ou arraste para reordenar`; o componente e o teste dessa suíte não foram alterados neste ciclo, então a falha é inconclusiva e precisa de investigação separada. TypeScript completo reportou 413 diagnósticos ERP e 66 mobile, sem diagnóstico nos caminhos alterados.
- [ ] Playwright permaneceu na tela `/login`; não havia credencial geral de teste nas variáveis consultadas e nenhuma guarda foi contornada. A comparação visual autenticada e a validação nativa continuam pendentes. Expo Web não prova o runtime nativo.
- [x] O Ciclo 14 concluiu a comparação funcional do seletor de fotos por variação e adicionou ao mobile “Selecionar todas/Desmarcar todas” com o mesmo limite e ordem da galeria do ERP, além do indicador numérico da ordem selecionada.
- [ ] A comparação visual autenticada do seletor e a validação nativa continuam pendentes; Playwright ainda mostra `/login` sem conta geral de teste disponível.

### Ciclo 14 — fotos: seleção em lote da galeria do produto pai

- [x] O modal ERP permite selecionar individualmente e em lote, limpar a seleção, conferir a ordem de seleção e limitar a no máximo 15 fotos. A ação final executa `createVariationImageSelectionFormSchema` por `useZodForm` antes de aplicar as URLs ao rascunho da variação.
- [x] O app já mantinha seleção em rascunho, confirmação, validação pelo mesmo schema Zod e ordenação por toques/arrows, mas não tinha a ação em lote nem mostrava a posição de cada foto dentro do seletor. `toggleAllParentProductImages` foi adicionada a `shared-utils/productImageSelection.ts` e é usada no ERP e mobile; o app agora mostra “Selecionar todas/Desmarcar todas”, respeita o limite e exibe o número de ordem em cada foto selecionada.
- [x] A seleção continua local ao formulário até confirmar e salvar o produto; não houve escrita remota. O mobile mantém o modal nativo e apresenta a orientação de adicionar fotos ao pai com o botão desativado quando a galeria está vazia; é a adaptação nativa correspondente ao estado vazio do modal ERP.
- [x] Vitest ERP em `VariationParentImagesSelectModal.test.tsx`: **1 arquivo / 9 testes aprovados**, incluindo seleção em lote, limpeza, validação e ordem/limite compartilhados. TypeScript completo: **41 diagnósticos mobile** e **415 ERP**, sem diagnóstico nos arquivos tocados neste ciclo.
- [ ] Playwright não alcançou o seletor autenticado: a tela disponível é `/login`. A interação nativa não foi verificada em aparelho; Expo Web não substitui essa validação.

### Ciclo 15 — fotos: saída do recorte quadrado

**Recorte:** palco, margem branca e seleção do modal de recorte mobile.

- [x] O ERP usa um palco quadrado 1080×1080 branco, encaixa a imagem dentro da margem configurável de 0–35% e recorta a seleção do palco; a seleção pode incluir a margem. A interface mobile agora segue esse modelo, começa com a área 1:1 completa, permite mover/redimensionar dentro do palco, voltar a centralizar e ajustar a margem em passos de 5%.
- [x] O app usa o `Svg.toDataURL` do `react-native-svg` já instalado (15.15.4) para rasterizar o palco mostrado, mede o raster gerado no dispositivo e converte a seleção de pontos de layout para pixels. `expo-image-manipulator` recorta esse raster, redimensiona a saída a 1080×1080 e salva WebP; reduz a qualidade de 0.95 até 0.55 quando necessário para tentar atingir o alvo de 0.3 MB do ERP. A composição usa somente `Rect` e `Image` SVG locais; não adiciona dependência nem usa o `extent` web-only do Expo.
- [x] O recorte continua validado pelo schema compartilhado `squareImageCropFormSchema` via `useZodForm`/`zodResolver`; upload e substituição HTTPS continuam passando por seus schemas e serviços atuais.
- [x] Vitest focado: **1 arquivo / 3 testes** de geometria, margem, limites de seleção e mapeamento de coordenadas passou. `git diff --check` passou. TypeScript completo do mobile continua não zero com **41 diagnósticos em outros módulos**, sem diagnóstico em `ProductSquareImageCropModal.tsx` e `mobileProductImageCrop.ts`; o `tsconfig` exclui o arquivo Vitest.
- [ ] A geração e leitura nativa do PNG, a qualidade visual em Android/iOS e a dimensão final no runtime do aparelho ainda precisam de validação em dispositivo. Não foi executado runner nativo; a restrição vigente permite Playwright para UI e Vitest/RTL para lógica. Expo Web não certifica essa captura.
- [ ] A comparação visual autenticada do modal continua pendente: Playwright disponível segue em `/login`, sem credencial geral de teste localizada. Upload remoto também não foi executado.

### Ciclo 16 — descrição: geração por características e texto informativo

**Recorte:** aba Descrição, modal de geração e instrução/payload enviados pelo proxy mobile.

### Resultado da comparação e correções

- [x] O ERP oferece dois modos no `ProductDescriptionInformativeModal`: gerar pelas características do cadastro e gerar por texto informativo. O mobile tinha somente o primeiro. A aba mobile agora abre `ProductDescriptionAiModal` com ambos os modos e seleciona características quando os pré-requisitos estão preenchidos; caso contrário, abre texto informativo, como o ERP.
- [x] A lista de pré-requisitos para características usa a função de características obrigatórias já existente no domínio mobile, excluindo Cor da descrição. O texto informativo usa `productAiDescriptiveTextFormSchema` (mínimo de 5 caracteres) em React Hook Form com `zodResolver`, exibe o erro e não chama o serviço com conteúdo inválido. Ambos atualizam a descrição no formulário proprietário e notificam o blur/sucesso; não persistem fora do fluxo normal de salvar produto.
- [x] O ERP envia prompts distintos para os dois modos e exige estrutura comercial com `Características:` e `Dimensões:` quando aplicáveis. O proxy mobile usava uma instrução genérica comum. O app agora informa o modo `characteristics` ou `informative_text`; o proxy valida esse discriminador e escolhe instruções equivalentes por modo. A operação allowlisted, autenticação, cota, timeout e sanitização da resposta foram preservados. As instruções mantêm as proteções contra conteúdo usado como instrução, especificações inventadas, menção de Cor e o rótulo Modelo/Linha com barra.
- [x] A área de toque do botão de abertura foi elevada a 44 px; o rótulo da aba ativa conserva a cor de destaque no tema escuro.

### Validação executada e limites

- Mobile: Vitest focado em `mobileProductAiService.test.ts`: **1 arquivo / 10 testes aprovados**, incluindo o discriminador enviado em cada modo e o bloqueio do texto informativo inválido antes do proxy.
- TypeScript mobile: a execução atual terminou com o diagnóstico em `shared-utils/productAiFormSchemas.ts:11` (assinatura de `z.enum`); a filtragem não apontou erro nos componentes e serviço mobile alterados. O proxy Edge não foi implantado nem exercitado contra o Gemini real.
- Playwright continua na tela `/login`; sem credencial geral disponível nas variáveis já consultadas. Não houve contorno de autenticação. Expo Web não foi validado nesta aba e não comprovaria o runtime nativo.
- [ ] Permanecem pendentes a comparação visual autenticada e a confirmação do formato gerado pelo serviço real; não houve chamada externa à IA nem deploy da Edge Function.

### Ciclo 17 — Estoque e Precificação: edição de preço promocional

**Recorte:** carregamento dos campos de desconto ao editar um produto e indicador de preço obrigatório no modo simples/multi-variação.

#### Resultado da comparação e correções

- [x] O ERP calcula os campos auxiliares de desconto ao abrir um produto: `useProductFormLoad` chama `initializeDiscounts` tanto no carregamento inicial quanto após receber os dados completos. O app carregava `unitPrice` e `promoPrice`, mas não preenchia `% Desconto` nem `R$ Desconto`, deixando os campos vazios mesmo quando o preço promocional estava salvo.
- [x] `deriveProductDiscountFields` agora é a regra pura compartilhada pelo hook ERP e pelo carregamento de produto no mobile. O app normaliza os valores localizados antes do cálculo; quando a promoção é positiva e inferior ao preço de venda, exibe o desconto fixo com duas casas e o percentual com uma casa. Sem desconto válido, os dois campos ficam vazios.
- [x] O indicador vermelho de obrigatoriedade no app agora só acompanha “Preço de Venda” quando `hasVariations` é falso, como no `ProductPricingFields` do ERP. A regra de validação/salvamento não mudou.
- [x] Os campos de desconto continuam auxiliares de apresentação; o serviço mobile persiste preço de venda e preço promocional (`unit_price`/`promo_price`), sem criar um campo de desconto independente. Não houve alteração de schema, payload ou gravação remota.

#### Validação executada e limites

- Mobile: Vitest focado em `productDiscountFields.test.ts`: **1 arquivo / 5 testes aprovados** para promoção válida, preço zero, promoção zero, preço igual e promoção acima do preço.
- `git diff --check`: aprovado.
- TypeScript completo no mobile e ERP permanece não zero por diagnósticos em módulos não relacionados; não há diagnóstico reportado nos arquivos deste ciclo. A verificação ERP foi filtrada para confirmar especificamente os arquivos tocados.
- Não houve comparação visual autenticada nesta execução. A última evidência registrada para Playwright continua na rota `/login`; nenhuma guarda foi contornada. A validação de runtime nativo permanece pendente, e Expo Web não a comprova.

#### Pendências de Preços e Estoque

- [x] Os handlers de percentual, valor fixo e preço promocional foram alinhados pelo cálculo compartilhado no Ciclo 19; ver evidências abaixo.
- [x] Os padrões IPI/frete do fornecedor foram alinhados no Ciclo 18, junto do cálculo de custo final com frete `none`; ver evidências abaixo.
- [x] Cálculo do custo final e sincronização herdada conferidos no Ciclo 18; ver evidências abaixo.
- [x] A conversão do campo de estoque mínimo foi alinhada ao ERP no Ciclo 20; permanecem os demais estados de validação/erro da aba.
- [ ] A inspeção visual autenticada e a confirmação em aparelho continuam pendentes.

### Ciclo 18 — Estoque e Precificação: padrões do fornecedor e custo final

**Recorte:** seleção de fornecedor, defaults de IPI/frete e cálculo do custo final para produto e variações.

#### Resultado da comparação e correções

- [x] No ERP, `ProductSupplierField` aplica `defaultIpiPercent`, `defaultFreightCost` e `defaultFreightType` do fornecedor escolhido. O serviço mobile consultava somente nome/apelido e origens de estoque, e sua aba de preços apenas incluía o ID do fornecedor. O DTO e a consulta mobile agora incluem os três defaults; `resolveProductSupplierPricingDefaults` compartilhado mantém o valor atual quando o fornecedor não tem um default e aplica zeros e `none` como valores explícitos.
- [x] A seleção mobile recalcula `finalPurchasePrice` com os defaults. Os valores continuam no formulário proprietário e passam pela validação RHF/Zod existente ao salvar; o wrapper de `setFormData` mantém a propagação para variações herdadas. A tabela e o payload de produto não mudaram.
- [x] A auditoria encontrou uma divergência interna no ERP: a aba principal interpretava `freightType: 'none'` como percentual, o sincronizador como frete fixo e o editor de variação como percentual. A UI mobile já oferece explicitamente “Sem frete” e não soma o frete nesse estado; o mapeamento ERP de fornecedor também normaliza default nulo para `none`. `calculateProductFinalPurchasePrice` agora é a regra compartilhada entre o app, a aba/sincronização do ERP e o editor de variações. `none` não soma frete; IPI e frete fixos ou percentuais preservam seus contratos, e IPI `none` também não é somado.
- [x] A fórmula se mantém limitada ao custo final editado no cadastro. O cálculo distinto da lista de estoque inicial não foi alterado. Nenhuma gravação remota ou implantação foi feita.

#### Validação executada e limites

- Mobile: `npm run test:unit:mobile --prefix erp -- src/features/products/domain/productSupplierPricingDefaults.test.ts` — **1 arquivo / 5 testes aprovados**, cobrindo defaults do fornecedor e cálculos com frete fixo, percentual, sem frete e tipos de IPI.
- ERP: `npm run test:unit --prefix erp -- src/pages/App/Products/hooks/variation/variationFormDefaults.test.ts` — **1 arquivo / 7 testes aprovados**, incluindo custo de variação sem frete.
- `git diff --check`: aprovado. As verificações TypeScript completas de ERP e mobile terminaram com código 2 por diagnósticos fora dos caminhos deste ciclo. A filtragem dos arquivos tocados encontrou **0 diagnósticos no mobile e 0 no ERP**; foi incluído `unit: 'UN'` no fixture do teste de variações, que estava sem um campo obrigatório.
- Não houve comparação visual autenticada nesta execução. A última evidência de acesso continua sendo `/login`; a inspeção autenticada do ERP/app e a validação em dispositivo nativo seguem pendentes. Expo Web não comprova comportamento nativo.

#### Pendências de Preços e Estoque

- [x] Os casos de valores apagados, zero e promoção igual ao preço de venda foram cobertos no Ciclo 19.
- [x] A entrada de estoque mínimo foi alinhada ao ERP no Ciclo 20; permanecem os estados de validação/erro e os demais estados da aba.
- [ ] A inspeção visual autenticada e a confirmação em aparelho continuam pendentes.

### Ciclo 19 — Estoque e Precificação: handlers manuais de desconto

**Recorte:** edição do preço de venda, percentual de desconto, valor fixo e preço promocional no produto pai, com propagação às variações herdadas.

#### Resultado da comparação e correções

- [x] A regra pura agora é compartilhada em `productDiscountFields.ts`: percentagem para valor promocional, valor fixo para percentagem e preço promocional para os campos derivados. ERP e app usam a mesma regra; cada tela mantém seu formato de estado (número/`undefined` no ERP, texto no app).
- [x] Percentual ou valor fixo zero, promoção direta zero e campos apagados agora normalizam para ausência de preço promocional. Antes, percentual zero no ERP podia gravar o próprio preço de venda como promoção; no app, a string `'0'` podia chegar ao payload como número zero enquanto o ERP convertia esse estado para `null`.
- [x] Ao digitar preço promocional igual ou acima do preço de venda, ambos preservam o valor digitado, mas limpam os campos auxiliares de desconto. Isso remove os valores antigos que o ERP mantinha visíveis após a promoção deixar de representar um desconto; o helper de carregamento já seguia essa regra.
- [x] Alterar o preço de venda recalcula os campos derivados pela regra compartilhada. Percentual zero não recria uma promoção igual ao preço. A limpeza/atualização continua propagada para variações com `syncPromoPrice` habilitado.
- [x] Percentual e valor fixo permanecem auxiliares de edição; o payload do produto segue persistindo somente os campos existentes `unit_price` e `promo_price`. O schema e o fluxo de submissão RHF/Zod do formulário proprietário não mudaram, e nenhuma gravação remota foi feita.

#### Validação executada e limites

- Mobile: `npm run test:unit:mobile --prefix erp -- src/features/products/domain/productDiscountFields.test.ts` — **1 arquivo / 11 testes aprovados**, cobrindo cálculo percentual/fixo, zero, invalidez e preço promocional igual/acima do preço de venda.
- ERP: `npm run test:unit --prefix erp -- src/pages/App/Products/hooks/form/useProductFormPricing.test.tsx` — **1 arquivo / 3 testes aprovados**, cobrindo percentual zero, promoção igual ao preço, promoção zero e propagação às variações herdadas.
- `git diff --check`: aprovado. As verificações TypeScript completas de ERP e mobile terminaram com código 2 por diagnósticos fora dos caminhos deste ciclo; os arquivos tocados apresentaram **0 diagnósticos em cada projeto**.
- Não houve comparação visual autenticada nesta execução. A última evidência de acesso continua sendo `/login`; a validação visual com conta e a validação em dispositivo nativo permanecem pendentes. Expo Web não comprova comportamento nativo.

#### Pendências de Preços e Estoque

- [x] Conversão da entrada de estoque mínimo alinhada ao ERP no Ciclo 20.
- [ ] Conferir os demais estados de validação/erro e da aba.
- [x] No produto pai, entradas negativas e descontos acima de 100%/do preço foram conferidos no Ciclo 21; descontos próprios das variações seguem pendentes.
- [ ] A inspeção visual autenticada e a confirmação em aparelho continuam pendentes.

### Ciclo 20 — Estoque e Precificação: edição do estoque mínimo

**Recorte:** campo Estoque Mínimo do produto simples na aba Estoque e Precificação.

#### Resultado da comparação e correção

- [x] O ERP converte cada edição com `parseInt` e transforma campo vazio/inválido em `0`; o app mantinha o texto e permitia que valores fracionários chegassem ao payload. Ambos os schemas impedem valores negativos na submissão final e em rascunho.
- [x] `parseProductMinimumStockInput` agora centraliza a conversão e é usado pelo ERP e pelo app. A digitação alterada segue o mesmo comportamento; dados fracionários já carregados continuam preservados enquanto o campo não for editado. O payload e o schema não mudaram.
- [x] O campo permanece oculto quando o produto está no modo multi-variação em ambas as interfaces. A validação continua no formulário proprietário por RHF/Zod no mobile e pelo schema compartilhado do domínio no ERP.

#### Validação executada e limites

- Mobile: `npm run test:unit:mobile --prefix erp -- src/features/products/domain/productMinimumStockInput.test.ts` — **1 arquivo / 1 teste aprovado**, cobrindo inteiro, decimal truncado, vazio, entrada inválida, negativo encaminhado à validação e valor numérico.
- `git diff --check`: aprovado; o Git reportou apenas avisos de normalização CRLF/LF em arquivos já modificados.
- TypeScript completo de ERP e mobile terminou com código 2 por diagnósticos em outros módulos; a filtragem dos arquivos tocados neste ciclo não encontrou diagnóstico.
- Playwright abriu o ERP em janela visível na porta 5173 e confirmou que a rota redireciona para `/login`. A comparação autenticada da aba não foi possível sem acesso à sessão; nenhuma guarda foi contornada. A tela do app/Expo Web não foi aberta, e isso não comprova runtime nativo.
- A origem canônica da skill continua pendente: a busca encontrou apenas a cópia incluída no backup de build em `erp/.vercel`; o arquivo foi lido como orientação, não tratado como fonte canônica.

#### Pendências de Preços e Estoque

- [x] A conversão de estoque mínimo na edição do campo foi alinhada no Ciclo 20.
- [x] Limites negativos e acima do preço no desconto do produto pai foram conferidos no Ciclo 21; falta auditar os campos próprios das variações.
- [ ] Conferir estados de validação/erro e demais estados da aba.
- [ ] Fazer comparação visual autenticada e validar em aparelho; Expo Web não comprova comportamento nativo.

### Ciclo 21 — Estoque e Precificação: limites de desconto no produto pai

**Recorte:** desconto percentual, desconto fixo e campos de preço no produto simples ou no pai de uma família com variações.

#### Resultado da comparação e correção

- [x] ERP e app chamam as mesmas funções de `productDiscountFields.ts`. Percentual negativo não cria promoção; percentual acima de 100% e desconto fixo acima do preço deixam o preço promocional ausente. Somente `unitPrice` e `promoPrice` são persistidos; os descontos percentuais/fixos são auxiliares.
- [x] O ERP tinha um desvio ao passar os retornos de `CurrencyInput` por `String(...)`. Um valor negativo colado no preço de venda, no preço promocional ou no desconto fixo perdia o sinal no `parsePrice` e podia ser reinterpretado como positivo. `ProductPricingFields` e `ProductInventoryTab` agora preservam os retornos numéricos. Preço de venda negativo permanece negativo e o schema do formulário bloqueia o salvamento; preço promocional/desconto negativos não criam promoção, igual ao mobile.
- [x] O input percentual ERP declara `min=0` e `max=100`, mas o modal não contém `<form>` e o rodapé dispara `handleSubmit` por botão `type="button"`; essa validade HTML não bloqueia a submissão nem gera erro visível. O mobile não tem atributos RN equivalentes. Como a regra compartilhada evita persistir uma promoção acima do limite em ambos, a diferença fica registrada como particularidade de plataforma sem efeito no payload.

#### Validação executada e limites

- Mobile: `npm run test:unit:mobile --prefix erp -- src/features/products/domain/productDiscountFields.test.ts` — **1 arquivo / 13 testes aprovados**, incluindo entrada negativa e limites acima de 100% e do preço.
- ERP: `npm run test:unit --prefix erp -- src/pages/App/Products/hooks/form/useProductFormPricing.test.tsx` — **1 arquivo / 7 testes aprovados**, incluindo propagação, preço negativo, desconto fixo negativo e percentual acima de 100%.
- TypeScript completo do ERP terminou com código 2 por diagnósticos em outros módulos; a filtragem dos arquivos ERP tocados não encontrou diagnóstico. Não houve alteração de código de produção mobile neste ciclo.
- `git diff --check`: aprovado, com avisos existentes de normalização CRLF/LF.
- Playwright manteve a janela visível na porta 5173 e confirmou que o ERP continua em `/login`; sem sessão autenticada, os campos não puderam ser exercitados pela UI e nenhuma guarda foi contornada. Expo Web e runtime nativo não foram abertos nesta execução.
- A cópia da skill usada permanece somente no backup de build em `erp/.vercel`; a fonte canônica segue pendente de localização.

#### Pendências de Preços e Estoque

- [x] Limites negativos e máximos dos descontos do produto pai conferidos no Ciclo 21.
- [x] Descontos próprios das variações e validação da submissão mobile conferidos no Ciclo 22.
- [ ] Conferir os outros estados de validação/erro da aba e de submissão.
- [ ] Fazer comparação visual autenticada e validar em aparelho; Expo Web não comprova comportamento nativo.

### Ciclo 22 — Estoque e Precificação: descontos próprios das variações

**Recorte:** preço de venda próprio, desconto percentual, desconto fixo e preço promocional em variações de uma família, incluindo preservação da entrada e bloqueio na submissão.

#### Resultado da comparação e correção

- [x] O ERP mantém os valores de desconto percentual e fixo em estado de edição e usa o schema de submissão da variação para rejeitar percentual fora de 0–100 ou valor fixo acima do preço. O app calculava os campos apenas a partir do preço promocional; descontos fora do limite viravam promoção zero e os textos digitados desapareciam sem bloquear o salvamento.
- [x] Os handlers de preço próprio do ERP e do app agora reutilizam a regra compartilhada productDiscountFields.ts. O app guarda os valores digitados na variação enquanto ela é editada e recalcula o outro campo e a promoção com a função compartilhada, inclusive quando o preço de venda muda.
- [x] A validação de percentual e desconto fixo da variação passou a usar getProductDiscountValidationIssues nos dois schemas. No app, o schema do formulário proprietário RHF/Zod aplica a regra às variações com preço próprio, antes de salvar rascunho ou concluir; o erro é roteado para a aba Variações. Preço herdado e variação única seguem fora dessa validação própria.
- [x] Os descontos percentual e fixo são auxiliares de edição, não campos persistentes. O serviço mobile os remove de technical_specs.variationDetails e eles não chegam à RPC; o payload transacional mantém os campos já existentes de preço e promoção, junto aos demais campos permitidos da variação. Nenhuma gravação remota foi feita.

#### Validação executada e limites

- Mobile: npm run test:unit:mobile --prefix erp -- src/features/products/domain/productDiscountFields.test.ts src/features/products/domain/mobileProductFormSchema.test.ts src/features/products/services/mobileProductMutationService.test.ts — **3 arquivos / 57 testes aprovados**, cobrindo limites, erro no schema final e de rascunho, payload e retirada dos campos auxiliares.
- ERP: `productVariationSubmissionDiscount.test.ts` — **1 teste aprovado**, cobrindo os dois limites no schema compartilhado usado pela submissão da variação; `useVariationPricing.test.tsx` — **7 testes aprovados**, incluindo desconto acima de 100% mantido para validação e normalização de zero.
- O arquivo adjacente `useVariationForm.test.tsx` foi repetido isoladamente: **12 de 13 testes passaram**. O teste “não vincula automaticamente fotos do produto pai e preserva fotos vinculadas manualmente” falhou porque esperava zero fotos herdadas e recebeu 20. O arquivo de teste e o código de fotos não foram alterados neste ciclo; essa falha permanece fora do recorte.
- `git diff --check`: aprovado, com avisos de normalização CRLF/LF em arquivos modificados. As verificações TypeScript completas de ERP e mobile retornaram código 2. Os filtros mais recentes não encontraram diagnóstico nos arquivos de implementação alterados; uma execução ERP também apontou `TS18047` em `useVariationForm.test.tsx:276`, uma asserção adjacente não alterada neste ciclo. O filtro mobile dos arquivos alterados não encontrou diagnóstico.
- Playwright abriu o ERP em navegador visível na porta 5173 e confirmou que a rota vai para /login. A listagem das variáveis de desenvolvimento da Vercel não apresentou credenciais gerais de conta de teste do ERP; não usei variáveis de operador fiscal nem contornei autenticação. A comparação visual autenticada continua pendente. Expo Web e runtime nativo não foram validados.
- A única cópia acessível da skill de replicação continua dentro do backup de build em erp/.vercel; foi usada como orientação, não como fonte canônica. A origem canônica segue pendente.

### Ciclo 23 — direcionamento do erro de desconto próprio para a variação

**Recorte:** caminho de erro emitido pelo RHF/Zod ao validar desconto percentual ou fixo em uma variação com preço próprio.

#### Resultado da comparação e correção

- [x] No ERP, o modal edita uma variação por vez; em erro de desconto, a validação compartilhada bloqueia o save, mostra toast/banner e abre a aba `estoque` (Precificação) da mesma variação.
- [x] No mobile, o schema do formulário proprietário emite caminhos aninhados como `variacoes[0].discountPercent`. `flattenFormErrors` os transforma em `variacoes_0_discountPercent`, mas `ProductFormScreen` antes só reconhecia IDs de abas exatos; o alerta mostrava o erro, porém a tela permanecia na aba atual e nenhuma variação era aberta.
- [x] `resolveMobileProductFormErrorNavigation` mapeia o caminho ao tab `variacoes` e ao índice da variação; o formulário proprietário passa esse destino à aba, que expande a linha e abre `estoque` (Precificação). A regra RHF/Zod e a mensagem de domínio continuam as mesmas; não foi adicionada validação duplicada.

#### Validação executada e limites

- Mobile: `mobileProductFormErrorNavigation.test.ts` e `mobileProductFormSchema.test.ts` — **2 arquivos / 21 testes aprovados**. O teste percorre o caminho aninhado produzido por `flattenFormErrors` e confirma o destino para os dois campos de desconto.
- TypeScript mobile completo retornou código 1; a filtragem dos arquivos alterados deste ciclo não encontrou diagnóstico.
- `git diff --check`: aprovado; Git reportou avisos de normalização CRLF/LF em arquivos modificados.
- A validação visual continua pendente: a última sessão de Playwright registrada está em `/login`; esta execução não autenticou nem contornou a guarda. Expo Web e runtime nativo não foram validados.

### Ciclo 24 — direcionamento de preço inválido para a variação

**Recorte:** erro de preço de venda inválido em família multi-variação, tanto quando a variação usa preço próprio quanto quando herda preço zerado do produto pai.

#### Resultado da comparação e correção

- [x] O ERP valida cada variação pela regra compartilhada `getVariationRegistrationIssue`; em preço inválido, seleciona a primeira variação com erro, abre Variações e direciona para Estoque e Precificação. A regra de preço herdado/próprio consta em `docs/negocio/produtos/estrutura-produto-variacao.md`.
- [x] O schema mobile antes emitia um erro genérico em `estoque` quando nenhum preço da família era positivo e reduzia erros específicos da variação ao caminho raiz `variacoes`. Agora suprime o erro genérico do produto pai em modo multi-variação e mantém o caminho `variacoes[index].price`, com a mensagem de domínio; o roteador RHF abre a variação indicada e seu painel de precificação.
- [x] Preço próprio zerado na segunda variação e preço do pai zerado herdado por ambas estão cobertos. O primeiro caso direciona para o índice 1; o segundo para o índice 0, como o ERP, que foca o primeiro registro inválido.

#### Validação executada e limites

- Mobile: `mobileProductFormErrorNavigation.test.ts` e `mobileProductFormSchema.test.ts` — **2 arquivos / 23 testes aprovados**, incluindo os dois cenários de preço e o caminho `variacoes_1_price` após `flattenFormErrors`.
- TypeScript mobile completo terminou com código 2 por diagnósticos de outras áreas do projeto. A primeira execução também identificou um estreitamento de tipo incompleto no efeito que abre a variação; o fluxo agora verifica o objeto de destino antes de ler seu painel. A execução final filtrada não apontou diagnóstico nos arquivos deste ciclo.
- `git diff --check`: aprovado; Git reportou somente avisos de normalização CRLF/LF em arquivos previamente modificados.
- A comparação visual autenticada segue pendente: a sessão disponível está em `/login`; não contornei a autenticação. Expo Web e runtime Android/iOS não foram validados.

### Ciclo 25 — direcionamento de variação sem foto

**Recorte:** erro de validação final quando falta uma foto vinculada à variação, em produto simples ou família multi-variação.

#### Resultado da comparação e correção

- [x] No ERP, `validateProductFormSubmission` escolhe a primeira variação sem foto e informa `invalidVariation` na aba `fotos`; `useProductFormSubmit` seleciona essa variação. `useVariationForm` abre a aba Fotos quando a variação não tem imagens. A regra de galeria herdada da variação única e galerias próprias em famílias consta em `docs/negocio/produtos/estrutura-produto-variacao.md`.
- [x] O schema mobile aplicava a mesma exigência e identificava a variação pelo nome, mas emitia o erro apenas no caminho raiz `variacoes`, deixando a linha recolhida em Informações Básicas. Agora emite `variacoes[index].images`; o roteador expande a variação que falhou e abre Fotos vinculadas. Na variação única, a tela mostra a galeria herdada e a instrução para adicionar fotos ao produto pai.
- [x] O erro continua sendo de conclusão: rascunhos incompletos podem ser salvos sem fotos, como no ERP.

#### Validação executada e limites

- Mobile: `mobileProductFormErrorNavigation.test.ts` e `mobileProductFormSchema.test.ts` — **2 arquivos / 25 testes aprovados**, cobrindo ausência de foto em multi-variação, produto simples sem nenhuma galeria, caminho de roteamento ao painel Fotos e rascunho sem imagens.
- ERP: `productFormValidation.test.ts` — **7 testes aprovados**, confirmando o bloqueio por foto e a permissão de rascunho. Corrigi apenas os fixtures de `useProductFormSubmit.test.tsx` para que `hasVariations: false` represente os casos completos com uma variação, conforme o contrato documentado. A execução daquele ciclo deixou 1 falha em 21 testes, causada por `variations: [null]`; o crash de `getVariationRegistrationIssue` foi corrigido e coberto no Ciclo 26. Nenhum código de produção ERP foi alterado durante o Ciclo 25.
- TypeScript mobile completo terminou com código 2 por **105 linhas de diagnóstico em outras áreas**; o filtro não encontrou diagnóstico no schema, roteador e componentes envolvidos neste ciclo.
- `git diff --check`: aprovado, com avisos de normalização CRLF/LF em arquivos existentes.
- A comparação visual autenticada segue pendente: o acesso documentado para o ERP permanece em `/login`. Expo Web e runtime Android/iOS não foram validados.

### Ciclo 26 — variação nula não interrompe validação

**Recorte:** submissão do formulário quando a lista de variações contém uma entrada estruturalmente inválida, especificamente `variations: [null]`.

#### Resultado da comparação e correção

- [x] No ERP, o schema Zod já rejeitava a entrada nula, mas `validateProductFormSubmission` continuava a validação contextual para reunir erros. `getVariationRegistrationIssue` então lia `variation.name` e lançava exceção antes de retornar os erros do formulário.
- [x] O helper compartilhado agora ignora a variação atual nula/não-objeto nessa etapa contextual. O erro de estrutura continua vindo do schema, e a submissão não chega a `saveProduct`; regras de negócio não foram enfraquecidas.
- [x] O schema mobile também rejeita `[null]` por `safeParse` sem lançar exceção. O caminho de submissão permanece bloqueado pelo resolver; não foi necessária uma regra mobile duplicada.

#### Validação executada e limites

- ERP: `variationRegistrationRules.test.ts`, `productFormValidation.test.ts` e `useProductFormSubmit.test.tsx` — **3 arquivos / 38 testes aprovados**. A cobertura verifica o helper com entrada nula e o fluxo real que impede salvar o produto malformado.
- Mobile: `mobileProductFormErrorNavigation.test.ts` e `mobileProductFormSchema.test.ts` — **2 arquivos / 26 testes aprovados**, incluindo a rejeição de `[null]` sem exceção.
- TypeScript global ERP e mobile terminou com códigos **2** e **1**, respectivamente, por diagnósticos em outros módulos; a filtragem não encontrou diagnósticos nos arquivos de produtos/shared-utils deste ciclo.
- `git diff --check`: aprovado; apenas avisos de normalização CRLF/LF em arquivos já modificados.
- Este ciclo não fez escrita remota. Comparação visual autenticada e runtime Android/iOS seguem sem validação; Expo Web não comprova comportamento nativo. A skill de replicação continua disponível apenas na cópia de cache documentada acima.

### Ciclo 27 — nome e busca de fornecedor

**Recorte:** estado da busca, nome exibido nas sugestões e identificação dos fornecedores vinculados no formulário Estoque e Precificação.

#### Achado registrado antes de alterar a experiência

- [x] O ERP usa a mesma precedência para busca e rótulo: `fullName`, `socialName`, `nickname` e `tradeName` (primeiro valor disponível). O mobile exibia `nickname` antes de `full_name` e pesquisava um texto composto com ambos, então um fornecedor podia aparecer com rótulo diferente e ser localizado por um termo que o ERP não encontra. O serviço mobile não selecionava `social_name`, campo presente em `people` e usado pelo modelo ERP.
- [x] Não encontrei justificativa para essa diferença nas particularidades mobile/documentação de formulários. O helper compartilhado espelha a precedência do ERP; no DTO mobile, `tradeName` corresponde ao campo persistido `nickname`, sem adicionar coluna inexistente à consulta.

#### Resultado da comparação e correção

- [x] `shared-utils/productSupplierDisplayName.ts` centraliza o rótulo e a busca usando a precedência `fullName` → `socialName` → `nickname` → `tradeName`, aceitando os formatos camelCase e snake_case. ERP usa o helper em `ProductSupplierField.tsx`; mobile usa o mesmo nome resolvido nas sugestões e nos fornecedores vinculados.
- [x] `mobileSupplierService.ts` agora seleciona `social_name` de `people`. `trade_name` continua sendo apenas o alias de compatibilidade de `nickname` no DTO; nenhuma coluna nova foi presumida.
- [x] A tela ERP foi conferida autenticada via Playwright: Produtos → Novo Produto → Estoque e Precificação. O campo informa busca por nome/razão social, aceita duas letras; a consulta `mo` mostrou quatro sugestões e a seleção temporária de “Movelipe” exibiu o mesmo rótulo no formulário. Recarreguei a página para descartar o estado em memória. A rede mostrou leituras de `people`/`products` e nenhuma mutação de produto; somente a verificação do operador de teste e telemetria foram POST.
- [ ] O aplicativo não foi exercitado visualmente em Expo Web nem em runtime nativo neste ciclo. Expo Web não comprova comportamento Android/iOS.

#### Validação executada e limites

- Mobile: `productSupplierDisplayName.test.ts` e `mobileSupplierService.test.ts` — **2 arquivos / 4 testes aprovados**, cobrindo precedência ERP, `social_name` e seleção da coluna no serviço.
- TypeScript completo de ERP e mobile terminou com código 2 por diagnósticos em outros módulos; a filtragem dos arquivos alterados do Ciclo 27 não encontrou diagnóstico.
- `git diff --check`: aprovado; Git emitiu somente avisos de normalização CRLF/LF em arquivos já modificados.
- A skill `erp-web-to-mobile-replication` continua localizada somente na cópia em cache de build descrita no início deste inventário; nenhuma fonte canônica foi encontrada.

#### Pendências de Preços e Estoque

- [x] Limites de descontos no produto pai (Ciclo 21) e nas variações próprias (Ciclo 22).
- [x] Erro de desconto próprio direciona à variação e ao painel de precificação correspondente (Ciclo 23).
- [x] Erro de preço inválido em família multi-variação direciona à variação e ao painel correspondente (Ciclo 24).
- [x] Ausência de foto direciona à variação que falhou e ao painel Fotos (Ciclo 25).
- [ ] Conferir os demais estados de validação/erro e de submissão da aba.
- [ ] Fazer comparação visual autenticada e validar em aparelho; Expo Web não comprova comportamento nativo.

### Ciclo 28 — fornecedor obrigatório na finalização

**Recorte:** submissão final de mercadoria adquirida de terceiros sem fornecedor principal, mantendo o contrato mais permissivo do rascunho.

#### Evidência e correção

- [x] A schema compartilhada do ERP e a schema mobile bloqueiam a finalização de produto adquirido de terceiros sem `mainSupplierId`/`supplierId`; fabricação própria dispensa fornecedor e rascunhos incompletos continuam permitidos. No mobile, o erro ainda mantém o caminho `estoque` para abrir a aba correta.
- [x] A UI ERP apresenta “Selecione um fornecedor.”; a mensagem mobile atual é “Selecione o fornecedor principal na aba Estoque e Precificação.”. Não encontrei exceção documentada para a diferença; vou compartilhar a regra e a mensagem, preservando o destino de navegação nativo.
- [x] Playwright confirmou o estado ERP inicial da aba: padrão “Adquirido de Terceiros”, aviso de exigência de fornecedor e rótulo “Fornecedores *”. Nenhum campo foi preenchido nem submetido; a evidência não prova o comportamento Android/iOS.

#### Resultado da comparação e correção

- [x] `shared-utils/productSupplierRequirement.ts` centraliza a regra de fornecedor e a mensagem “Selecione um fornecedor.”. A validação de domínio do ERP e o schema mobile usam o mesmo helper; `useProductFormSubmit` também usa a constante compartilhada para o feedback do ERP.
- [x] Terceiros sem `mainSupplierId`/`supplierId` continuam bloqueados na finalização; fabricação própria pode concluir sem fornecedor; rascunhos seguem permitidos sem fornecedor. O mobile conserva o caminho `estoque`, que direciona ao painel nativo correspondente.
- [x] A sessão visível do ERP está na lista `/products`, sem modal aberto. Nenhum produto foi submetido ou gravado neste ciclo.
- [ ] O estado de erro após submissão não foi exercitado visualmente, pois concluir um formulário real poderia gravar dados. Expo Web e runtime Android/iOS não foram validados.

#### Validação executada e limites

- ERP: `productFormValidation.test.ts` e `useProductFormSubmit.test.tsx` — **2 arquivos / 30 testes aprovados**, cobrindo a exigência na finalização, fabricação própria, rascunho e bloqueio do efeito.
- Mobile: `mobileProductFormSchema.test.ts` — **1 arquivo / 22 testes aprovados**, cobrindo a mensagem equivalente, caminho `estoque`, fabricação própria e continuidade dos cenários existentes.
- TypeScript completo terminou com código 2 em ambos os projetos: **687 linhas de diagnóstico no ERP** e **105 no mobile**. O filtro dos arquivos do ciclo não encontrou diagnóstico.
- `git diff --check`: aprovado; os avisos exibidos foram apenas de normalização CRLF/LF em arquivos já modificados.
- A skill `erp-web-to-mobile-replication` continua disponível apenas na cópia em cache de `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/`; não foi localizada fonte canônica no projeto nem em `C:\Users\mathe\.agents\skills`/`C:\Users\mathe\.codex\skills`.

### Ciclo 29 — filtro geral “Somente Produtos”

**Recorte:** seleção explícita de **Somente Produtos** na lista; o estado padrão **Todos** fica para outro ciclo.

#### Evidência e correção

- [x] Na UI ERP, o drawer **Filtros Avançados** oferece **Somente Produtos**. Playwright visível selecionou e aplicou a opção; não houve mutação de cadastro. `productFilterBuilder` implementa o filtro como `item_type` produto, composição ou nulo legado.
- [x] O mobile mostra o mesmo rótulo em `ProductsHeaderFiltersSheet`, mas a consulta padrão da lista exclui `item_type = composition` e depois reduz **Somente Produtos** a `item_type = product`.
- [x] O mobile também possui a permissão `viewProductCompositions` e um módulo separado de Composições. A correção deve incluir composições no filtro de Produtos somente quando essa permissão estiver concedida, preservando a restrição de acesso. Não encontrei justificativa para a diferença entre ERP e mobile quando o usuário tem acesso a ambos os módulos.
- [x] Esta evidência cobre somente a seleção **Somente Produtos**. A lista padrão **Todos** no mobile continua excluindo composições e será auditada como estado separado.

#### Correção aplicada e validação

- [x] O predicado `item_type.eq.product,item_type.eq.composition,item_type.is.null` agora tem uma constante compartilhada (`shared-utils/productListTypeFilters.ts`), consumida pelo filtro ERP e pela consulta mobile.
- [x] O mobile usa esse predicado em **Somente Produtos** apenas no modo padrão e quando `NativeProductsScreen` confirma a permissão `viewProductCompositions`. Sem essa permissão, mantém a exclusão de composições; o módulo próprio de Composições e o estado padrão **Todos** permanecem inalterados.
- [x] O filtro continua validado por `productListFormSchema` no hook `useMobileProducts`; o sinal de permissão vem do controle de acesso da tela e não de entrada editável.
- [x] Vitest: `productFilterBuilder.test.ts` — **10 testes aprovados**; `mobileProductFetchService.test.ts` — **11 testes aprovados**. `git diff --check` passou.
- [x] Playwright visível confirmou no ERP a seleção e aplicação de **Somente Produtos**, restaurando depois **Todas as Categorias**; nenhum produto foi gravado. Os testes do serviço verificam o predicado enviado, sem alegar leitura de composição real no banco.
- [x] TypeScript ERP/mobile: ambas as verificações terminaram com código 2 por diagnósticos globais preexistentes (687 linhas ERP, 105 mobile); nenhum diagnóstico filtrado apontou para os arquivos alterados neste ciclo.
- [ ] Expo Web e runtime nativo não foram validados; o Playwright desta etapa cobriu somente a tela do ERP.
- [ ] A skill `erp-web-to-mobile-replication` segue disponível somente na cópia do cache de build; a fonte canônica não foi localizada.

### Ciclo 30 — tipo geral “Todos” na lista padrão

**Recorte:** valor geral `all` no modo Produtos do app, correspondente a **Todas as Categorias** na consulta padrão do ERP.

#### Achado registrado antes da correção

- [x] A UI autenticada do ERP exibe **Todas as Categorias** selecionado por padrão (`http://localhost:5173/products`); o catálogo mostra 273 itens. O drawer de filtros foi aberto via Playwright e fechado sem aplicar alteração ou gravar produtos.
- [x] O estado ERP começa com `filters = {}`; no modo `standard`, `ProductList` mantém `itemType` indefinido. `useProducts`/`productFilterBuilder` não acrescentam filtro de tipo nessa situação, então a consulta padrão não exclui composições.
- [x] O mobile define `generalTypeFilter = 'all'` por padrão e passa `itemType: 'standard'`; `mobileProductFetchService` ainda aplica `item_type IS DISTINCT FROM composition`, inclusive nesse estado. Assim, a lista mobile omite composições.
- [x] A correção deve respeitar `viewProductCompositions`: incluir composições em **Todos** quando autorizado e conservar a exclusão quando a permissão não estiver concedida. A consulta ERP de tipo geral **Todos** não impõe filtro e também inclui serviços e tipos legados; o estado **Somente Produtos** segue coberto no Ciclo 29.
- [x] Esta evidência compara estado visual e contratos de query; não afirma que um registro de composição real foi consultado. A tela móvel ainda não foi exercitada em Expo Web/aparelho.

#### Correção aplicada e validação

- [x] O serviço mobile recebe `canViewCompositions` da tela. No modo padrão com tipo geral `all`, usuários autorizados deixam de receber a exclusão `item_type IS DISTINCT FROM composition`; sem essa permissão, a exclusão permanece. A consulta de **Somente Produtos** continua usando o predicado compartilhado do Ciclo 29; **Somente Serviços** continua limitada a `item_type = service`.
- [x] A tela só alcança a consulta pela lista cujo estado passa por `productListFormSchema` em `useMobileProducts`; a permissão é contextual e não um campo de formulário.
- [x] Vitest `mobileProductFetchService.test.ts`: **13 testes aprovados**, incluindo os estados **Todos** e **Somente Produtos** com e sem permissão. `git diff --check` passou.
- [x] Playwright confirmou no ERP **Todas as Categorias** selecionado e o total visual de 273 itens. Abri e fechei o drawer sem aplicar filtros ou gravar produtos. A sessão reportou 35 erros de console acumulados, incluindo um 404/HMR do Vite para `shared-utils/commercialScheduling/validationRules.ts`; o arquivo existe no workspace atual e o erro não foi reproduzido durante a interação deste ciclo. Isso limita a prova visual aos componentes que permaneceram carregados e não confirma a presença de uma composição específica nos resultados.
- [x] TypeScript mobile terminou com código 2 por **105 linhas de diagnósticos globais**; o filtro não encontrou diagnóstico em `mobileProductFetchService.ts`, `useMobileProducts.ts`, `NativeProductsScreen.tsx` ou na constante compartilhada.
- [ ] Expo Web e runtime nativo não foram validados; nenhuma leitura direta de composição real foi feita nesta etapa.
- [ ] A skill `erp-web-to-mobile-replication` segue disponível somente na cópia do cache de build; a fonte canônica não foi localizada.

### Ciclo 31 — filtro de situação “Rascunhos”

**Recorte:** consulta da situação **Rascunhos (Em Cadastro)** na lista, sem alterar contratos de salvar rascunho ou concluir produto.

#### Achado registrado antes da correção

- [x] Playwright autenticado mostrou a opção ERP **Rascunhos (Em Cadastro)** no filtro **Situação no ERP**. O drawer permaneceu sem seleção aplicada; nenhum produto foi gravado.
- [x] `ProductFilters` mapeia essa opção para `isDraft: true`, mas `productFilterBuilder` consulta somente `is_draft = true`.
- [x] O mapper ERP já define `isDraft` por `is_draft` **ou** `status = 'draft'`; o filtro mobile já consulta `is_draft = true OR status = 'draft'` e seu mapper usa a mesma interpretação. Portanto, o filtro ERP omitia registros que o próprio ERP e o mobile classificam como rascunhos.
- [x] `docs/negocio/produtos/estrutura-produto-variacao.md` preserva rascunhos incompletos e o modo salvo; não há regra de domínio que justifique excluir do filtro um item marcado `status = 'draft'`.
- [x] A correção proposta é compartilhar o predicado de listagem entre ERP e mobile. A prova cobre o contrato de consulta e a classificação por código; não afirma a existência de registros legados com `status = 'draft'` no banco remoto.

#### Correção aplicada e validação

- [x] `shared-utils/productListDraftFilters.ts` define `is_draft.eq.true,status.eq.draft`; o builder ERP e o serviço mobile agora usam a mesma constante.
- [x] Vitest focado: **11 testes ERP** em `productFilterBuilder.test.ts` e **14 testes mobile** em `mobileProductFetchService.test.ts` aprovados. `git diff --check` passou.
- [x] TypeScript completo terminou não zero com **687 linhas de diagnósticos globais no ERP** e **105 no mobile**; a filtragem não encontrou diagnósticos nos arquivos alterados deste ciclo.
- [x] Playwright confirmou a opção de rascunhos no ERP. O filtro não foi aplicado e nenhum produto foi gravado; a prova valida a opção e os contratos por código, não resultados de registros remotos.
- [ ] Expo Web e runtime nativo não foram validados. A skill `erp-web-to-mobile-replication` continua acessível somente na cópia em cache de build; não foi localizada fonte canônica.

### Ciclo 32 — filtro por categoria da lista

**Recorte:** aplicar a categoria selecionada pelo UUID no estado da lista, sem alterar o cadastro de categorias ou produtos.

#### Evidência anterior à correção

- [x] O seletor ERP em `ProductFilters.tsx` usa `cat.id` no valor da opção; o campo não envia o nome da categoria.
- [x] `productPersistenceService.ts` remove `products.category` antes de persistir, grava o UUID em `products.category_id` e sincroniza as categorias selecionadas em `product_categories`.
- [x] Antes da correção, `productFilterBuilder.ts` comparava o UUID do filtro somente com `products.category`. O app já incluía `category_id`, as relações `product_categories` e o nome legado no predicado.
- [x] A documentação de estrutura classifica Produtos em zero ou mais Categorias; portanto, filtrar somente a categoria primária não cobre vínculos secundários.
- [x] Supabase informa que `.or()` não combina filtros de tabelas distintas; o helper consulta os IDs de vínculos e os inclui no predicado da tabela `products` ([documentação de filtros `or`](https://supabase.com/docs/reference/javascript/using-filters-or)).

#### Correção aplicada e validação

- [x] `shared-utils/productListCategoryFilters.ts` agora busca, em paralelo, o nome legado da categoria e os IDs de Produtos relacionados; monta um predicado comum para `category_id`, `category` legado e IDs N:N. Nomes com caracteres reservados são citados/escapados e os IDs repetidos são removidos.
- [x] Builder ERP e serviço mobile reutilizam o helper, propagam falhas das leituras auxiliares e conservam os demais filtros da lista.
- [x] Vitest focado: **17 testes ERP** (`productFilterBuilder.test.ts` e `productListCategoryFilters.test.ts`) e **15 testes mobile** (`mobileProductFetchService.test.ts`) aprovados.
- [x] TypeScript completo terminou não zero por diagnósticos globais: **687 linhas no ERP** e **105 no mobile**; a filtragem não encontrou diagnósticos nos arquivos alterados neste ciclo. `git diff --check` passou.
- [ ] Playwright visível usou a porta 5173, mas `/products` redirecionou para `/login`. As variáveis Vercel consultadas não incluem conta geral de teste; as variáveis fiscais não foram reutilizadas. A opção da categoria não foi selecionada visualmente e não houve leitura de produtos no banco remoto nem escrita de dados.
- [ ] Expo Web e runtime nativo não foram validados; a interface móvel permanece fora desta prova de query.

### Ciclo 33 — resumo Modelo/Linha no modal de descrição com IA

**Recorte:** estado de características no modal de geração da aba Descrição.

#### Evidência da divergência

- [x] O `ProductDescriptionInformativeModal` do ERP mostra Modelo e Linha em linhas separadas quando ambos existem; quando há apenas um valor ou o atributo combinado `Modelo/Linha`, mostra o rótulo “Modelo / Linha”.
- [x] A aba mobile já calculava `modelOrLine` a partir das chaves combinadas e dos valores individuais, mas não o passava ao modal. O modal sempre apresentava “Modelo” e só apresentava “Linha” separadamente, deixando o resumo com um traço quando o valor estava no atributo combinado.
- [x] A validação, o schema Zod e a chamada de geração já eram compartilhados/equivalentes; a diferença estava apenas na apresentação dos dados no modal.

#### Correção aplicada e validação

- [x] `buildProductDescriptionModelSummary` agora preserva a apresentação separada quando Modelo e Linha existem e usa “Modelo / Linha” com fallback ao valor individual quando existe apenas um.
- [x] A aba mobile envia ao modal o `modelOrLine` já resolvido pelo formulário. Payload de IA, validação e persistência do produto não mudaram.
- [x] Vitest focado: **3 testes** do resumo e **10 testes** do serviço mobile de IA aprovados.
- [x] TypeScript completo do mobile terminou não zero com erros globais em outros módulos e no schema compartilhado existente; não foram reportados diagnósticos nos arquivos do modal e do resumo.
- [ ] O teste já existente da aba ERP não iniciou: Vitest não resolveu `react/jsx-dev-runtime` no ambiente atual, então nenhum teste dessa suíte foi executado.
- [ ] Playwright visível abriu `/products` na porta 5173 e foi redirecionado para `/login`. Nenhuma autenticação foi contornada; o modal não foi aberto no navegador e não houve chamada real à IA nem gravação de produto.
- [ ] Expo Web e runtime nativo não foram validados. A paridade visual autenticada e o comportamento nativo do modal continuam pendentes.

### Ciclo 34 — característica Marca na aba técnica

**Recorte:** edição da característica Marca e sincronização com o estado raiz do formulário.

#### Evidência da divergência

- [x] O ERP atualiza `technicalValues.Marca` e também `formData.brand` em `applyTechnicalValueChangeToProduct`; sua aba de Descrição usa `brand` antes do fallback técnico.
- [x] O mobile atualizava `technicalValues` e, para variações, `attributes`, mas não sincronizava `formData.brand` ao editar Marca. A aba de Descrição prioriza `formData.brand`, e o payload mobile também lê esse campo raiz; um valor anterior podia continuar sendo usado.
- [x] A regra de sincronização era pequena e pura, mas estava isolada no helper ERP; foi compartilhada para manter o mesmo mapeamento nos dois formulários.

#### Correção aplicada e validação

- [x] `shared-utils/productTechnicalRootPatch.ts` define a atualização de Marca no campo raiz. ERP e mobile agora usam o mesmo helper; apagar Marca também limpa o valor raiz mobile. Valores técnicos e atributos da variação continuam seguindo seus caminhos existentes.
- [x] A cobertura do formulário RHF/Zod não mudou: os campos continuam pertencendo ao `ProductFormScreen` e passam pelo resolver principal antes do serviço.
- [x] Vitest focado: **15 testes aprovados** — 3 do helper compartilhado, 2 do serviço mobile de características e 10 de sincronização técnica ERP.
- [x] A filtragem TypeScript não encontrou diagnósticos nos arquivos tocados; as verificações completas do workspace continuam não zero por diagnósticos globais em outros módulos.
- [ ] A suíte visual pelo Playwright permanece na tela `/login`; não houve acesso à aba nem salvamento de Produto.
- [x] A divergência de persistência foi auditada no Ciclo 35; veja a evidência e o alinhamento abaixo.
- [ ] Expo Web e runtime nativo não foram validados.

### Ciclo 35 — persistência da característica Marca

**Recorte:** contrato de gravação de `products.brand` e de `technical_specs.technicalValues.Marca`.

#### Evidência da divergência

- [x] A migration `supabase/migrations/20260817000000_fix_product_images_and_columns.sql` cria a coluna direta `products.brand`. `mapToDB` do ERP já a inclui, e `mapFromDB` lê esse campo.
- [x] Antes da correção, `erp/src/pages/utils/productService/productPersistenceService.ts` e `erp/src/pages/utils/productService/productMutationService.ts` removiam `brand` antes da gravação: `syncProductToSupabase` e o caminho de atualização sem produto no cache em `saveProduct`. `mobile/src/features/products/services/mobileProductMutationService.ts` envia `brand` e `technical_specs.technicalValues` na RPC `save_mobile_product_transaction`.
- [x] A definição atual da RPC foi inspecionada no projeto Supabase remoto, schema `public`, por consulta SQL somente de leitura. Ela inclui `brand` tanto no `INSERT` quanto no `UPDATE`, e também grava `technical_specs`; nenhuma linha de Produto foi alterada nessa inspeção. A função não está versionada nas migrations locais.
- [x] A documentação vigente não define `brand` como exceção mobile nem explica sua remoção pelo ERP. O campo raiz também é mantido pelo handler compartilhado da característica `Marca` e é lido no mapeamento dos dois clientes.

#### Correção aplicada e validação

- [x] Os escritores ERP deixaram de remover a coluna `brand`, alinhando o contrato web ao mobile e ao schema atual. O mobile mantém os dois campos: `brand` para a coluna raiz e `Marca` em `technicalValues` para as características.
- [x] O formulário continua pertencendo ao `ProductFormScreen` e passa pelo RHF/Zod existente; esta correção só altera a persistência após validação.
- [x] Vitest ERP: **1 teste** em `productPersistenceService.test.ts` confirma `brand` no payload de `syncProductToSupabase`. Vitest mobile: **20 testes** em `mobileProductMutationService.test.ts` aprovados, incluindo `brand` e `technicalValues.Marca` no payload da RPC.
- [x] `git diff --check` passou sem erros de whitespace; Git emitiu apenas avisos de finais de linha CRLF em arquivos do workspace. Não houve alteração de schema nem gravação remota.
- [ ] Playwright segue sem sessão autenticada em `/login`; este recorte de persistência não alterou UI. Não houve inspeção autenticada, gravação remota ou validação em aparelho. Expo Web não comprova comportamento nativo.
- [ ] O caminho alternativo do ERP para atualizar registro ausente do cache teve a mesma exclusão removida, mas não foi exercitado por teste específico neste ciclo.

### Ciclo 298 — promoção conforme propriedade no card de produto simples — 25/10/2026

**Recorte:** estado da lista no card de produto simples/variação operacional única. Conferi preço regular e promoção efetivos herdados do pai, promo ausente/zero/inválida e os dados que chegam ao card ERP e mobile.

#### Auditoria e correção

- [x] ERP: `fetchProductsPage` mapeia o pai com `mapFromDB`, a lista usa `flattenProductsForList` e calcula `allVariations` com `resolveProductVariationPricing`. O card e a célula da tabela selecionam a variação única já efetiva; só mostram o preço promocional quando ele é numérico, maior que zero e menor que o preço regular. O modelo de produto salvo com uma variação restaura a herança pai→filho na redução, conforme Ciclo 119 e `estrutura-produto-variacao.md`.
- [x] App: `mobileProductFetchService` resolve preço e promoção separadamente conforme `syncUnitPrice`/`syncPromoPrice`, sem alterar as flags. Divergência encontrada no card: `useMobileProductCardState` fazia fallback `singleVariation.promoPrice ?? product.promoPrice` sem considerar o dono do campo. Numa variação com promoção própria vazia/nula, o card mostrava a promoção do pai; ERP preservava a ausência do valor próprio.
- [x] Corrigido no app: `resolveMobileProductCardPricing` em `mobileProductCardRules.ts` agora usa o helper compartilhado `resolveProductVariationPricing` e só consulta o preço promocional do pai se a variação herda esse campo. Variação sem promoção própria permanece sem promoção, mesmo que o pai tenha uma; com herança ativa, o card continua mostrando a promoção válida do pai. Não mudei flags, payloads, persistência, preço de formulário, gate do Catálogo ou ações de Conciliação.
- [x] A condição de exibição permanece equivalente ao ERP: promoção ausente, zero, inválida, igual ou acima do preço regular não produz badge nem preço antigo riscado; promoção positiva menor que o preço regular é exibida. As regressões cobrem herança válida, valor próprio ausente/zero/inválido e promoção de pai ausente/zero/igual/maior/inválida.
- [x] Código e testes deste recorte: `mobile/src/features/products/domain/mobileProductCardRules.ts`, `mobile/src/features/products/domain/mobileProductCardRules.test.ts` e `mobile/src/features/products/hooks/useMobileProductCardState.ts`. Os testes ERP existentes em `productListTransformers.test.ts` e `ProductCardVariationItem.test.tsx` e o teste de leitura mobile `mobileProductFetchService.test.ts` foram executados como cobertura adjacente.

#### Validação e limites

- Vitest/RTL focado: **100/100 em 4 arquivos** — testes de transformação da lista ERP, card/linha de variação ERP, fetch mobile e regras de apresentação do card mobile.
- `npx tsc --noEmit --pretty false` em `mobile/` terminou com código 1 por **15 diagnósticos globais** em `e2e/categories-characteristics.spec.ts`, campos numéricos comuns, finanças, agenda, inventário, notas fiscais, configuração Vitest e `shared-utils/commercialScheduling`; nenhum aponta aos arquivos deste ciclo.
- `git diff --check` passou para os arquivos/documentos deste recorte; Git sinalizou somente conversões CRLF/LF no working tree.
- Sem Playwright autenticado: a sessão anterior redireciona para login e o fluxo disponível pode limpar rascunhos. Sem Maestro em aparelho físico; não usei Expo Web como prova nativa. Sem Supabase/PostgreSQL/Docker local, consulta ou escrita remota, DML, RPC real, migration, Meta Graph API ou deploy. Nenhuma regra operacional do Estoque mudou; o Guia Prático não se aplica.
- Regras e fontes consultadas antes da correção: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/mobile/arquitetura_offline_first.md`, auditoria de arquitetura de produtos, inventário de formulários, este inventário e roadmap. Não há `AGENTS.md` aninhado nas árvores ERP/mobile/`shared-utils` usadas. A skill atual não está nas pastas canônicas `.agents/skills`/`skills` nem no perfil; a cópia `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/erp-web-to-mobile-replication/SKILL.md` foi consultada somente como orientação em cache.

**Conclusão do recorte:** o card mobile agora respeita a propriedade da promoção como ERP, inclusive quando a promoção própria está ausente. Quando a variação herda, ambos mostram somente promoção positiva e abaixo do preço regular. A auditoria geral de Produtos continua aberta.

#### Próximo recorte identificado

O item que este ciclo havia encaminhado foi auditado no Ciclo 299; resultado e evidências estão registrados abaixo.

### Ciclo 299 — alias legado de preço de venda na lista — 25/10/2026

**Recorte:** mapeamento de preço de venda do produto pai e da variação operacional herdada na lista de Produtos.

#### Auditoria e correção

- [x] `unit_price` é a fonte atual e `price` é fallback legado: as escritas do ERP/mobile preenchem os dois campos; as migrations de busca/ativação usam `COALESCE(unit_price, price, 0)` nessa ordem. O schema-base preserva `price NOT NULL`, enquanto `unit_price` foi adicionado nullable sem backfill. A migration de ativação deixa elegível um produto com preço legado positivo quando `unit_price` está nulo. Isso comprova um estado persistido permitido, embora nenhuma linha remota tenha sido consultada.
- [x] Divergência comprovada na cadeia: ERP `LIGHT_COLUMNS` buscava somente `unit_price`; com essa projeção, um pai sem valor na coluna nova virava zero no `mapFromDB`. O app seleciona `*`/ambos os aliases e resolvia `unit_price ?? price`, exibindo o valor legado. No ERP, quando ambos eram carregados, `mapFromDB` também dava prioridade ao alias antigo `price`, diferente do fetch mobile e das queries atuais de catálogo.
- [x] `product_variations.use_parent_price` tem default `true` e aceita `null`. O app e `resolveProductVariationPricing` tratam somente `false` como preço próprio; o mapper ERP usava truthiness e, para `null`, selecionava incorretamente o preço próprio da variação. O mapper ERP agora adota o mesmo teste explícito `!== false`.
- [x] Criada `shared-utils/productUnitPrice.ts` para centralizar precedência `unit_price` → `unitPrice` → `price` → zero. O ERP agora seleciona `price` para permitir o fallback e usa o helper no mapeamento do produto, da variação padrão e das variações herdadas. O fetch mobile também usa o mesmo helper em suas projeções de produto e variações, mantendo o valor legado apenas quando falta o canônico.
- [x] Regras de preço próprio de variação, flags de herança, payloads de gravação e schema do banco não foram alterados. Nenhuma migration foi criada ou aplicada; a Conciliação de Produtos continua exclusiva do ERP.
- [x] Fontes consultadas antes da mudança: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/mobile/arquitetura_offline_first.md`, `docs/produtos/auditoria-arquitetura-organizacao-produtos.md`, este inventário e `docs/geral/roadmap_pendente.md`. Não há `AGENTS.md` aninhado nas árvores ERP/mobile/`shared-utils`. A skill atual não foi localizada nas pastas canônicas `.agents/skills`/`skills` nem no perfil; a cópia `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/erp-web-to-mobile-replication/SKILL.md` foi consultada somente como orientação em cache.

#### Validação e limitações

- [x] Vitest focado: mapper do produto, mapper de variações, serviço/fetch da lista mobile e fiscal mapper — **4 arquivos, 48/48 testes aprovados**. Cobertura inclui alias divergente, `unit_price` nulo, fallback legado e herança ERP com flag `null`.
- [x] `tsc --noEmit` ERP terminou com exit 2 e **415 diagnósticos** já distribuídos pelo projeto; filtragem confirmou **zero** em `productMapper.ts`, `productVariationMapper.ts`, `productQueryService.ts`, `productMapperPricing.test.ts`, `mobileProductFetchService.ts` e `productUnitPrice.ts`. O `tsc` mobile terminou não-zero com **15 diagnósticos globais** em Node typings, inputs numéricos, finanças, agenda, estoque, notas fiscais, configuração Vitest e `commercialScheduling`; nenhum aponta os arquivos deste recorte.
- [ ] Não foi feita leitura/escrita remota, DML, RPC, migration, deploy ou chamada externa. UI autenticada e runtime Android/iOS não foram exercitados; Expo Web não comprovaria comportamento nativo.
- [x] `git diff --check` dos arquivos tocados passou; Git sinalizou apenas normalização CRLF/LF nos arquivos existentes.

**Conclusão do recorte:** ERP e app agora usam a mesma precedência no pai e na variação herdada. `unit_price` prevalece inclusive quando diverge do alias antigo; se for nulo, o preço legado é exibido nos dois. Uma flag de herança `null` também segue o default compartilhado e herda o preço do pai. A auditoria geral de Produtos permanece aberta.

### Ciclo 300 — preço canônico na validação de ativação mobile — 25/10/2026

**Recorte:** estado de ativação/desativação de produto simples e variação, especialmente o preço do pai usado pela validação compartilhada.

#### Evidência da divergência

- [x] O ERP envia `targetProd.unitPrice` ao `validateProductActivationRequirements`; a lista hidrata esse campo por `mapFromDB`, agora com precedência compartilhada `unit_price` → alias camel → legado `price` (Ciclo 299).
- [x] O serviço mobile consulta a linha persistida antes de ativar e construía `unitPrice` por `row.price ?? row.unit_price`. Quando os aliases divergiam, a validação podia permitir ativação com `unit_price = 0` e `price > 0`, ou bloquear preço canônico positivo com alias legado zerado.
- [x] A regra de domínio compartilhada valida preço do pai para produto simples e variação herdada; os gates existentes de permissão, rascunho, salvados, categoria, fornecedor e composição permanecem no mesmo caminho.

#### Correção aplicada e validação

- [x] `mobileProductMutationService` agora usa `resolveProductUnitPrice`, o mesmo helper já aplicado às leituras da lista ERP e mobile. Nenhuma regra de permissão/status, query, payload de escrita ou RPC foi alterada.
- [x] Adicionada regressão em `mobileProductMutationService.test.ts`: com `unit_price = 100` e `price = 0`, a ativação prossegue pelo preço canônico; a implementação anterior falhava esse cenário. Os testes existentes continuam cobrindo preço herdado zerado e ausência de mutação quando inválido.
- [x] Vitest/RTL focado: **61/61 testes** em `mobileProductMutationService.test.ts`.
- [x] Sem Playwright autenticado ou teste Android/Maestro; o teste de serviço não executa gravação remota. Sem Supabase/PostgreSQL/Docker local, consulta ou escrita remota, RPC real ou deploy. `git diff --check` passou; Git sinalizou apenas a normalização CRLF/LF dos arquivos existentes.
- [x] Regras consultadas antes da mudança: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/mobile/arquitetura_offline_first.md`, `docs/produtos/auditoria-arquitetura-organizacao-produtos.md`, este inventário e `docs/geral/roadmap_pendente.md`. Não há `AGENTS.md` aninhado nas árvores ERP/mobile/`shared-utils` utilizadas. A skill canônica não está nas pastas `.agents/skills`/`skills`; a cópia em `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/erp-web-to-mobile-replication/SKILL.md` foi usada apenas como orientação em cache.

**Conclusão do recorte:** a validação de ativação mobile agora recebe o mesmo preço efetivo que a lista ERP e aplica a precedência canônica já compartilhada. Os gates de ativação permanecem inalterados. A auditoria geral de Produtos continua aberta.

### Ciclo 301 — submissão imediata da busca mobile — 25/10/2026

**Recorte:** busca textual na lista de Produtos e Composições, incluindo tecla de submissão, termos consultados, estados sem termo/sem resultados/erro e interação com filtros e paginação.

#### Evidência da comparação

- [x] A regra de termos é compartilhada em `shared-utils/productListSearch.ts`: nome e código do produto pai; nome e SKU das variações; normalização de acentos, hífen e variantes `i/y`; descrição não participa. As consultas ERP (`productFilterBuilder.ts`) e mobile (`mobileProductFetchService.ts`) usam os mesmos builders, consultam variações até `limite + 1` e propagam a mesma mensagem quando há mais de 100 correspondências.
- [x] ERP e app compartilham mínimo de 3 caracteres e debounce de 350 ms. O ERP também aplica imediatamente no Enter pelo `handleSearchKeyDown`, cancelando o debounce pendente; limpa o termo aplicado se o campo estiver vazio e ignora submissão de 1–2 caracteres. No app, `ProductsHeader` não encaminhava `onSubmitEditing`; o campo só aplicava via debounce.
- [x] Na mudança de busca, o ERP reinicia a consulta na página 1 e limpa seleção; o app troca a chave dos filtros, solicita a página 1 e mantém o controle de requisições obsoletas. Filtros de categoria, publicação e modo continuam combinados; Ativos/Desativados são suspensos durante busca nos dois, enquanto a seleção de Rascunhos permanece específica.
- [x] Com termo vazio não é feita busca de variações em nenhum cliente. Os dois apresentam estado vazio quando a consulta retorna zero; falhas da consulta de variações impedem resultado parcial. O retry configurado do ERP é uma nova tentativa e o app faz uma repetição, conforme os contratos existentes. Loading, alertas e componentes visuais seguem adaptados à plataforma.
- [x] A descrição anterior do Ciclo 3 que dizia “restrita a nomes” estava incorreta para a implementação atual. Foi substituída pelo contrato comprovado nome/código/SKU, sem estender a busca a descrição.

#### Correção aplicada e validação

- [x] O app expõe `submitSearchTerm`: ao submeter via teclado, cancela o timer pendente e aplica imediatamente um termo válido; em branco limpa; com 1–2 caracteres ignora a ação, preservando o filtro aplicado, como no Enter do ERP. A digitação continua usando o debounce compartilhado de 350 ms e o mínimo de três caracteres.
- [x] `ProductsHeader` encaminha `TextInput.onSubmitEditing`, configura `returnKeyType="search"` e atualiza o placeholder para “Buscar por nome, código ou SKU”, que corresponde aos campos realmente pesquisados. O pedido continua passando pelo `productListFormSchema`/`useZodForm` antes de `fetchMobileProductsPage`.
- [x] Vitest ERP: **22/22** em `productFilterBuilder.test.ts` e `ProductSearchDebounce.test.tsx`. Vitest mobile: **47/47** em `mobileProductListFilters.test.ts`, `mobileProductSearch.test.ts` e `mobileProductFetchService.test.ts`; nova cobertura do resolver de submissão testa termo válido, vazio e curto.
- [x] `tsc --noEmit` mobile terminou com exit 1 por **15 diagnósticos globais** em E2E, componentes de campos numéricos, finanças, agenda, estoque/faturas, configuração Vitest e `commercialScheduling`; nenhum aponta aos arquivos alterados neste ciclo.
- [x] `git diff --check` passou; Git mostrou apenas avisos de normalização CRLF/LF em arquivos existentes.
- [ ] Não houve execução visual autenticada por Playwright nem validação da tecla em Android físico/Maestro. Playwright/Expo Web não comprova `TextInput.onSubmitEditing` no runtime nativo. Não houve Supabase/PostgreSQL/Docker local, consulta/escrita remota, mutação de Produto ou deploy.
- [x] Regras consultadas antes da mudança: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/mobile/arquitetura_offline_first.md`, inventário de formulários, este inventário e roadmap. A busca não possui uma particularidade mobile separada localizada em `docs/`; o contrato estava registrado neste inventário. Não há `AGENTS.md` aninhado nas árvores ERP/mobile/`shared-utils`. A skill canônica não existe em `.agents/skills`/`skills`; a cópia em cache em `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/erp-web-to-mobile-replication/SKILL.md` foi consultada apenas como orientação.

**Conclusão do recorte:** termos pesquisados, normalização, limite, filtros combinados, paginação, vazio e erro já convergiam; a submissão pelo teclado era a diferença funcional. O app agora aplica a consulta imediatamente sem alterar o contrato do servidor ou os filtros. A auditoria geral de Produtos continua aberta.

#### Próximo recorte identificado

### Ciclo 302 — tentativa de validação nativa da busca — 25/10/2026

**Recorte:** disponibilidade de aparelho físico e Maestro para validar `TextInput.onSubmitEditing` do Ciclo 301.

- [x] `adb devices -l` retornou a lista vazia (“List of devices attached”) e `Get-Command maestro` não encontrou o executável. O README do Maestro do projeto exige telefone físico pareado via Wi‑Fi ADB; emulador/USB não foram usados como substituto.
- [x] Não instalei ou substituí build, não limpei dados e não iniciei servidor; nenhuma consulta/escrita remota, alteração de Produto ou deploy ocorreu.
- [ ] A tecla de busca continua sem comprovação Android nativa; Playwright/Expo Web não prova `onSubmitEditing` no React Native.

**Conclusão do recorte:** a validação nativa está bloqueada pela indisponibilidade local de telefone Wi‑Fi ADB e Maestro. A implementação lógica e a submissão acessível permanecem cobertas pelo Ciclo 301. A auditoria prossegue para outro estado funcional sem instalar ferramentas ou alterar dados do aparelho.

### Ciclo 303 — bloqueio do Catálogo Digital sem permissão — 25/10/2026

**Recorte:** interação com o badge de publicação/ocultação na lista de Produtos para perfil sem `productConfig`.

#### Contrato confirmado e correção

- [x] No ERP, `erp/src/pages/App/Products/Index.tsx` calcula `readOnly = !canPerform('productConfig', roles)`; a lista propaga esse estado e os componentes de card/linha derivam `canManageCatalog` dele. No app, `NativeProductsScreen.tsx` usa `canUseProductPermission('productConfig')` e encaminha o resultado aos cards e variações.
- [x] Ambos mantêm o status do Catálogo visível, mas bloqueiam publicar/ocultar sem a permissão. A permissão de abrir a tela de administração Meta (`viewMetaCatalog`) é separada. Rascunho também fica bloqueado; produto finalizado com dados obrigatórios ausentes pode abrir a ação, mas a validação compartilhada rejeita a publicação e não altera o status. Salvar o produto não publica nem oculta automaticamente.
- [x] Identificado um fallback permissivo isolado no componente ERP: `ChannelStatusBadges` assumia `canManageCatalog=true` se um futuro chamador esquecesse de informar a permissão, enquanto o badge mobile assume falso. O default ERP agora é `false`; callers autorizados mantêm `true` explícito derivado da sessão. O handler também já retornava sem mutação quando a permissão é falsa.
- [x] Adicionada regressão RTL que passa callback sem permissão explícita e confirma botão desabilitado, dica acessível e ausência de callback; testes de cenários autorizados passaram a informar `canManageCatalog=true` explicitamente.
- [x] O esclarecimento do usuário confirma que o controle pode ficar bloqueado para quem não tem a permissão correspondente. “Gate” neste contexto significa essa guarda de acesso; um trigger SQL é uma proteção adicional do servidor, não o botão nem uma regra de elegibilidade do Catálogo.

#### Validação e limites

- [x] Vitest/RTL ERP `ChannelStatusBadges.test.tsx`: **10/10**.
- [x] `git diff --check` passou; somente avisos de normalização CRLF/LF.
- [ ] Sem Playwright autenticado ou teste Android/iOS; nenhuma chamada à Meta, consulta/escrita remota, migration ou deploy ocorreu. A proteção server-side por trigger continua como pendência independente registrada nos ciclos 208/222; não foi alterada neste recorte.
- [x] Regras consultadas: `AGENTS.md` (fornecido pelo usuário e lido para a seção de testes), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, inventário, roadmap e skill `erp-web-to-mobile-replication`. A busca confirmou que a skill não está nas pastas canônicas `.agents/skills`/`skills`; apenas a cópia de cache sob `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/` estava acessível e foi usada somente como orientação. Não há `AGENTS.md` aninhado em ERP/mobile; o arquivo aninhado em `digital-catalog/` não se aplica a este recorte.

**Conclusão do recorte:** o gate visual de permissão agora falha fechado também quando o componente ERP não recebe a prop. A ausência de `productConfig`, o estado de rascunho e os requisitos de elegibilidade para publicar são condições distintas; salvar por si só não muda o status do Catálogo.

#### Próximo recorte identificado

Continuar na próxima execução pela cadeia funcional de publicação já aprovada: confirmar em perfil autorizado a chamada após persistência e o tratamento dos erros do servidor, sem executar Graph API nem alterar dados externos. A validação nativa da busca do Ciclo 301 continua pendente até haver telefone físico Wi‑Fi ADB e Maestro.

### Ciclo 304 — erros e ordenação da mutação do Catálogo Digital — 25/10/2026

**Recorte:** publicação/ocultação de produto ou variação após a guarda de permissão, com atenção à ordem das gravações, à sincronização Meta e a falhas ambíguas.

#### Evidência e correção

- [x] Após os gates de `productConfig` e de elegibilidade documentados no Ciclo 303, o ERP e o app aguardam as escritas do produto/variação antes de solicitar a sincronização Meta em segundo plano. A sincronização não participa da confirmação de sucesso da persistência e não foi chamada externamente neste ciclo.
- [x] Divergência encontrada ao ocultar uma variação: o app já interrompia a operação se a consulta de irmãs publicadas falhasse; o ERP ignorava o `error` e podia ocultar o pai sem saber se ainda havia outra variação publicada. `persistCatalogStatus` agora propaga o erro antes da gravação do pai e antes do trigger Meta, alinhando-se ao comportamento mobile.
- [x] Erros genéricos podiam receber no app a mensagem incorreta “O status do produto não foi alterado”, inclusive se a gravação tivesse sido parcial ou se a reconsulta posterior à gravação falhasse. `getProductCatalogMutationFailureNotice` agora é compartilhado e orienta atualização da lista sem afirmar que o estado persistido permaneceu intacto; a negação SQLSTATE `42501` mantém a mensagem específica de permissão nos dois clientes.
- [x] Testes de serviço ERP comprovam que a falha na consulta de irmãs impede a gravação do pai e a sincronização Meta, e que no sucesso a ordem é gravação da variação → leitura das irmãs → gravação do pai → trigger. O serviço mobile já tinha cobertura para propagação de `42501` sem trigger e para sucesso; não foi alterado neste ciclo.

#### Validação e limitações

- [x] Vitest focado (ERP + serviço mobile): **81/81** em quatro arquivos — helper de aviso compartilhado (5), hook de lista ERP (12), persistência de status ERP (3) e serviço de mutação mobile (61).
- [x] `git diff --check` passou nos arquivos tocados; Git emitiu somente avisos de normalização CRLF/LF em arquivos existentes.
- [ ] O caminho foi exercitado com mocks, sem sessão real de perfil autorizado e sem persistência remota. Playwright autenticado não foi executado; não houve Graph API, confirmação no Catálogo Meta, leitura/escrita remota, migration ou deploy. A prova Android nativa segue pendente por falta de aparelho Wi‑Fi ADB/Maestro (Ciclo 302); Expo Web não foi usado como substituto.
- [x] Regras consultadas: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/mobile/arquitetura_offline_first.md`, este inventário, roadmap e a skill `erp-web-to-mobile-replication`. A busca não localizou skill canônica em `.agents/skills`/`skills`; somente a cópia em cache sob `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/` estava acessível e foi usada como orientação. `AGENTS.md` aninhado existe apenas em `digital-catalog/` e não se aplica a este recorte.

**Conclusão do recorte:** a gravação do pai não ocorre mais com leitura incerta das variações, e ambas as interfaces dão feedback honesto em falhas cujo resultado não foi confirmado. A guarda de perfil permanece separada da prontidão de publicação; nenhum acesso ou efeito externo foi simulado como prova real. A auditoria geral de Produtos continua aberta.

### Ciclo 305 — confirmação do gate de permissão do Catálogo — 25/10/2026

**Recorte:** ações do menu/status na lista de Produtos para perfis sem `productConfig`, retomando a dúvida do usuário sobre o que o “gate” bloqueia.

#### Evidência

- [x] O usuário confirmou que, para perfil sem a permissão correspondente, a ação do Catálogo pode ficar bloqueada. Neste fluxo, `productConfig` autoriza publicar/ocultar; não é o mesmo que o produto estar em rascunho nem que passar pela validação de requisitos.
- [x] O ERP calcula `readOnly = !canManageProducts` a partir de `productConfig`. Sem ela, o card mostra “Ver detalhes” em vez do menu de ações; `ChannelStatusBadges` conserva o status visível e desabilitado, inclusive como fallback quando o caller não informa `canManageCatalog` (Ciclo 303).
- [x] O app deriva `canEditProducts` de `productConfig`; `MobileProductCard` passa `canChangeCatalog=false` sem essa permissão e mantém o status legível. Detalhes de leitura continuam em ação separada. Os demais itens do menu de edição e as regras de rascunho/lixeira foram conferidos contra os Ciclos 190–198; `Pedidos Vinculados` para leitura foi fechado no Ciclo 191.
- [x] O estado da UI corresponde às regras compartilhadas de identidade de perfil/etiqueta em `shared-utils/productPermissions.ts`; a publicação continua validada pelo helper de elegibilidade usado pelos dois clientes. Salvar o formulário não publica o produto automaticamente.
- [x] Revisão estática da migration local `supabase/migrations/20261025002304_protect_product_catalog_status_permission.sql`: os triggers em `products` e `product_variations` protegem mudança de `status` e inserção já `published`, verificam `auth.uid()`, perfil e `rolePermissions.productConfig` e falham fechados para configuração explícita malformada. É uma camada de servidor distinta do bloqueio visual; não substitui a validação de conteúdo do Catálogo.

#### Limitações

- [ ] A migration não foi aplicada nem exercitada no banco remoto neste ciclo; enquanto permanecer ausente, uma escrita direta autenticada ainda pode tentar contornar o gate visual. A instrução da automação desta execução proíbe gravações externas, então a confirmação do comportamento do PostgreSQL segue pendente. Não use mocks ou a revisão do SQL como prova de RLS/trigger.
- [x] Não houve alteração de código, chamada Graph API, leitura ou gravação remota, migration aplicada, Playwright autenticado, Maestro ou deploy; por isso não foi executado teste automatizado neste recorte de confirmação/revisão estática. A orientação oficial do Supabase descreve RLS como controle no banco e recomenda `SECURITY INVOKER` por padrão: [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) e [Database Functions](https://supabase.com/docs/guides/database/functions).
- [x] Regras consultadas: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, documentos de estrutura e operações de variação, arquitetura offline-first, este inventário, roadmap, skill `erp-web-to-mobile-replication` e skill `supabase`. A skill de replicação segue acessível apenas na cópia em cache sob `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/`; a busca não encontrou `AGENTS.md` aninhado em `erp/`, `mobile/` ou `shared-utils`.

**Conclusão do recorte:** a regra que o usuário aprovou é bloquear a ação para quem não tem `productConfig`, mantendo o status visível. Rascunho e falta de requisitos também bloqueiam a publicação, por razões diferentes. O gate de interface está alinhado; o gate de banco permanece pendente de execução remota, sem ser apresentado como concluído.

#### Próximo recorte identificado

Revisar outro estado da lista de Produtos, mantendo a confirmação autenticada do perfil e a verificação externa Meta como limitações explícitas até haver sessão segura; não reutilizar Conciliação de Produtos no app.

### Ciclo 306 — confirmação do status visível sem `productConfig` — 25/10/2026

**Recorte:** releitura do badge Publicado/Oculto em cards de produto e variação para o perfil sem permissão de editar Produtos, após o esclarecimento do usuário sobre o “gate” do Catálogo.

#### Evidência

- [x] O usuário confirmou que a ação pode ser bloqueada para quem não tem permissão. O significado aplicado é: `productConfig` permite publicar/ocultar; sem essa permissão, o estado continua legível e o controle não executa a mutação. Ser rascunho e não atender aos requisitos de publicação continuam condições independentes.
- [x] `NativeProductsScreen` deriva `canChangeCatalog` de `canUseProductPermission('productConfig')` e mantém `showCatalogStatus` ligado para perfis a quem o status não deve ser ocultado. O mesmo par de props chega aos cards pai, variação única e lista expandida; `MobileChannelBadges` encaminha clique somente quando a regra de interação permite.
- [x] Revisão do helper mobile confirma botão bloqueado e dica de acessibilidade quando falta a permissão; a cobertura também diferencia produto finalizado, rascunho e variação mesclada.
- [x] Vitest focado de `mobile/src/features/products/domain/mobileProductCardRules.test.ts`: **61/61**. O teste RTL ERP `ChannelStatusBadges.test.tsx` passou **10/10** no Ciclo 303.

#### Limitações

- [ ] Não repeti o login Playwright: o Ciclo 182 identificou a limpeza automática `runDraftCleanup` no Dashboard ao autenticar, com tentativas de marcar rascunhos antigos como excluídos. Não há fixture própria autorizada para esse perfil; os testes de regra/helper não substituem observação de interface nem execução autenticada.
- [ ] A migration `20261025002304_protect_product_catalog_status_permission.sql` permanece local e não aplicada. A UI bloqueia a ação, mas a proteção contra escrita direta no banco não foi comprovada. Nenhuma chamada Meta, consulta/escrita remota ou DDL ocorreu.
- [x] Skill de replicação acessível somente na cópia de build/cache sob `erp/.vercel`; não foi tratada como fonte canônica. A skill Supabase e as regras de segurança do repositório foram consultadas; as policies locais permitem leitura do próprio perfil e da configuração de permissões.

**Conclusão do recorte:** a interpretação do usuário está refletida na interface e coberta pela regra mobile: status do Catálogo permanece visível, mas a ação é bloqueada sem `productConfig`. O código de produção não precisou de alteração. O próximo ciclo segue para outro estado da lista de Produtos; a autenticação que pode disparar limpeza e a proteção server-side não devem ser declaradas validadas por esta evidência.

### Ciclo 307 — mensagens das pré-condições de mover/mesclar na lista — 25/10/2026

**Recorte:** alertas do menu de ações de variação quando falta fornecedor ou, para mover, característica/valor.

- [x] ERP `ProductCardActions.tsx` e app `MobileProductVariationActionsMenu.tsx` já aplicavam as mesmas pré-condições: fornecedor para mover e mesclar; característica com valor para mover. O merge não exige atributo em nenhum cliente.
- [x] Alinhei os textos dos corpos dos alertas mobile aos toasts do ERP. Mantive os títulos curtos próprios do `Alert` nativo e não alterei gates, callbacks, serviços, payloads ou permissões. As props obrigatórias e a normalização dos atributos existentes foram preservadas.
- [x] Vitest focado `mobileProductVariationActionsService.test.ts`: **19/19**. `git diff --check` passou; Git emitiu somente aviso de normalização CRLF/LF no arquivo existente.

#### Limitações

- [ ] Não há teste de componente localizado para `MobileProductVariationActionsMenu`; o Vitest valida a derivação das pré-condições, não renderiza o novo texto de alerta. Sem Playwright autenticado ou validação Android/iOS/Maestro. A tentativa de autenticação continua evitada devido à limpeza de rascunhos do Dashboard (Ciclo 182); Expo Web não prova o `Alert` nativo.
- [x] Sem consulta/escrita remota, ação real de mover/mesclar, Supabase/PostgreSQL/Docker local, chamada Meta ou deploy. A Conciliação permanece exclusiva do ERP.
- [x] Regras consultadas: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, documentação de estrutura e operações de variação, este inventário, roadmap e skill `erp-web-to-mobile-replication`. Não há `AGENTS.md` aninhado nos diretórios ERP/mobile/`shared-utils`; a skill canônica não foi localizada fora da cópia de build/cache em `erp/.vercel`, consultada apenas como orientação.

**Conclusão do recorte:** mensagens das duas pré-condições agora correspondem ao ERP; a interface conserva títulos adaptados à plataforma. A auditoria geral de Produtos continua aberta.

#### Próximo recorte identificado

Retomar outro estado funcional da lista de Produtos, sem autenticar enquanto o Dashboard puder limpar rascunhos; manter pendentes a validação visual autenticada e a validação nativa até haver condição segura.

### Ciclo 308 — alternância Ativo/Desativado na lista — 25/10/2026

**Recorte:** acionamento do status ERP em produto simples/variação e confirmação antes de desativar.

- [x] Comparei `ChannelStatusBadges.handleERPClick` com `MobileChannelBadges.handleToggleERP`: ambos impedem a alteração para pai (status derivado), rascunho, origem não convencional/mesclada ou perfil sem permissão. A reativação passa pela regra compartilhada `productActivationValidation`; desativação não executa essa validação nos dois clientes.
- [x] O badge de status ERP chama diretamente a alternância nos dois clientes, sem confirmação intermediária. A confirmação em `deactivateSingleProduct` é do callback separado de descarte/desativação via `onDelete`, não do botão de status. Portanto não acrescentei uma confirmação redundante ao app.
- [x] O menu mobile oferece adicionalmente um atalho “Desativar/Reativar Produto”, que chama o mesmo handler de status do badge; não cria uma operação diferente. No app a alteração local só ocorre após a mutação retornar sucesso e a lista é recarregada; o ERP atualiza otimisticamente, mostra toast e reverte em erro. São estratégias de atualização por plataforma, com resultado persistido equivalente no sucesso.
- [x] O modo de erro dá feedback em ambos (toast ERP; `Alert` e refetch mobile). A ausência de toast de sucesso no app é compensada pela mudança visível do badge após a resposta e recarga; nenhuma divergência de regra ou confirmação exige correção neste estado.

#### Limitações

- [ ] Comparação estática dos handlers e callbacks; sem Playwright autenticado ou runtime Android/iOS/Maestro. Não rodei testes por não haver mudança de código; os testes focados de persistência/validação de ativação e seus resultados anteriores permanecem registrados nos Ciclos 207, 300 e 306.
- [x] Sem operação real de status, consulta/escrita remota, Supabase/PostgreSQL/Docker local ou deploy. Não acessei Conciliação no mobile.
- [x] Regras consultadas: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, inventário, roadmap e skill `erp-web-to-mobile-replication`. Não há `AGENTS.md` aninhado nos diretórios ERP/mobile/`shared-utils`; a skill canônica segue não localizada e a cópia de cache sob `erp/.vercel` serve somente como orientação.

**Conclusão do recorte:** o status ERP não pede confirmação antes da desativação; a confirmação de `deactivateSingleProduct` pertence ao callback de exclusão separado. O app preserva gates e validação compartilhada e acrescenta somente um atalho mobile ao mesmo controle. Nenhuma alteração de código foi necessária.

#### Próximo recorte identificado

Continuar a auditoria de outro estado da lista de Produtos; manter a verificação visual autenticada e nativa como limitações e evitar login enquanto o Dashboard puder limpar rascunhos.

### Ciclo 309 — regressão do `brand` no fallback ERP sem cache — 25/10/2026

**Recorte:** atualização de Produto quando `updateProduct` não encontra o registro no cache local e precisa persistir o payload mapeado diretamente.

- [x] A pendência do Ciclo 297 era somente de cobertura: o ERP já havia parado de remover `brand` antes de `mapToDB`. Confirmei o caminho `index === -1` de `updateProduct`, que atualiza `products` com `mapToDB(persistenceProduct)`, e o caminho mobile, que inclui `brand` na RPC transacional junto de `technical_specs`.
- [x] Adicionei regressão em `erp/src/pages/utils/productService/productMutationService.test.ts`, com cache local vazio, que confirma o filtro pelo UUID e a preservação de `brand: 'Morante'` no payload de `products`.
- [x] Vitest focado ERP, executado dentro de `erp/` usando `vitest.config.ts`: **15/15**. A primeira tentativa na raiz usou configuração sem alias ERP e falhou antes de coletar testes; a invocação correta passou. Encerrei o processo watch. `git diff --check` passou, com aviso de normalização CRLF/LF.

#### Limitações

- [ ] Sem Playwright autenticado ou validação em Android/iOS; este recorte é de persistência, sem alteração de UI. Não houve escrita/consulta remota, Supabase/PostgreSQL/Docker local ou deploy. Mocks comprovam o payload do serviço, não a gravação no banco.
- [x] Regras consultadas: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, documentação de estrutura e operações de variação, este inventário, roadmap e skill `erp-web-to-mobile-replication`. Não há `AGENTS.md` aninhado nos diretórios ERP/mobile/`shared-utils`; a fonte canônica da skill não foi localizada e a cópia em cache em `erp/.vercel` foi usada apenas como orientação.

**Conclusão do recorte:** a pendência de regressão do fallback ERP foi encerrada; produto ausente do cache preserva a coluna `brand` no payload mapeado, alinhado ao caminho mobile. A auditoria geral permanece aberta.

#### Próximo recorte identificado

Prosseguir por outro estado funcional ainda sem evidência, mantendo pendentes Playwright autenticado e validação nativa até haver condição segura.

### Ciclo 310 — mensagens e estados do menu de ações da variação — 25/10/2026

**Recorte:** apresentação das ações e pré-condições de mover/mesclar no menu mobile de uma variação.

- [x] Comparei `ProductCardActions` do ERP com `MobileProductVariationActionsMenu`: o ERP apresenta os bloqueios como toast e o app usa `Alert`; os textos e critérios de fornecedor/característica permanecem equivalentes. Mesclar exige fornecedor, mas não característica; mover exige ambos.
- [x] Acrescentei `MobileProductVariationActionsMenu.test.tsx` com mock explícito das primitivas React Native e dos ícones. Os quatro casos verificam ações disponíveis, mensagens e bloqueio dos callbacks por falta de pré-condição, diferença entre mover e mesclar, estado mesclado somente para histórico e motivo acessível quando a lixeira está bloqueada.
- [x] Vitest focado mobile: **4/4**; nenhum arquivo de produção alterado. Os callbacks foram capturados no render React server-side para verificar o contrato do componente com mocks.

#### Limitações

- [ ] O teste não exercita a entrega real de `Alert.alert` nem gesto/toque de React Native em aparelho; sem Playwright autenticado ou runtime Android/iOS/Maestro. A tentativa Playwright permanece evitada enquanto o login pode disparar a limpeza automática de rascunhos descrita no Ciclo 182.
- [x] Sem operação real de mover/mesclar/lixeira, consulta/escrita remota, Supabase/PostgreSQL/Docker local, chamada Meta ou deploy. A Conciliação continua exclusiva do ERP.
- [x] Regras consultadas: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, documentação de estrutura e operações de variação, inventário, roadmap e skill `erp-web-to-mobile-replication`. Não há `AGENTS.md` aninhado sob `mobile/`, `erp/`, `shared-utils/` ou `docs/`; a fonte canônica da skill não foi localizada, e a cópia em cache sob `erp/.vercel` foi usada apenas como orientação.

**Conclusão do recorte:** os textos e gates do menu mobile agora têm regressão focada no componente; nenhuma divergência de regra frente ao ERP foi identificada. A auditoria geral permanece aberta.

#### Próximo recorte identificado

Prosseguir por outro estado funcional da lista de Produtos; manter a comparação autenticada e a validação nativa como limitações explícitas.

### Ciclo 311 — ação Duplicar no menu de produto simples — 25/10/2026

**Recorte:** menu acionado no card de um produto simples representado por produto pai com uma variação operacional.

- [x] A referência ERP `ProductCardActions` mostra **Duplicar** para produto pai (`!product.isVariation`) mesmo quando o card tem `singleVariation`; a ação recebe o objeto do produto pai. Antes do ciclo, o app abria `MobileProductVariationActionsMenu` nesse estado, sem callback de duplicação, embora `MobileProductCard` já tivesse `onDuplicate` no menu de outros produtos.
- [x] Adicionei `onDuplicate` opcional ao menu mobile de variação única e o conectei em `MobileProductCard` somente quando `canEdit`, perfil não é label-only e `cardActionAvailability.canDuplicate` permitem. O callback entrega o produto pai à rotina existente `handleDuplicate`, que carrega os dados completos e abre um rascunho; não dupliquei lógica de negócio. O menu de variação expandida não recebe essa ação.
- [x] Vitest focado: componente do menu **5/5** e `mobileProductCardRules.test.ts` **61/61** (**66/66** no comando). O novo caso confirma que duplicar fecha o menu e invoca o callback uma vez.
- [x] `git diff --check` sem erros (aviso de normalização CRLF/LF no roadmap). TypeScript mobile global terminou com **15 diagnósticos em arquivos alheios**; nenhum nos arquivos alterados. A primeira invocação de `tsc` apontou caminho de `tsconfig` inexistente; a invocação corrigida executou a checagem do projeto.

#### Limitações

- [ ] Sem Playwright autenticado ou teste Android/iOS/Maestro; o teste valida o contrato do componente com React Native mockado, não o gesto real nem a abertura do formulário no aparelho. A autenticação segue evitada por risco de limpeza de rascunhos no Dashboard (Ciclo 182).
- [x] Sem leitura/escrita remota, criação real de rascunho, Supabase/PostgreSQL/Docker local ou deploy. A Conciliação de Produtos continua exclusiva do ERP.
- [x] Regras consultadas: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, documentação de estrutura e operações de variação, inventário, roadmap e skill `erp-web-to-mobile-replication`. Não há `AGENTS.md` aninhado sob `mobile/`, `erp/`, `shared-utils/` ou `docs/`; a fonte canônica da skill não foi localizada, e a cópia de cache sob `erp/.vercel` serviu apenas como orientação.

**Conclusão do recorte:** a ação de duplicar produto simples que faltava no menu da variação única agora usa a rotina existente do app e preserva os gates ERP de edição/tipo/perfil. A auditoria geral permanece aberta.

#### Próximo recorte identificado

Prosseguir por outro estado funcional da lista de Produtos; manter pendentes Playwright autenticado e validação nativa até haver sessão segura e aparelho disponível.

### Ciclo 312 — resumo dos componentes no card de composição — 25/10/2026

**Recorte:** informação visível sob o título na lista de Produtos para composição/combos.

#### Evidência e correção

- [x] O card e a célula de descrição do ERP exibem abaixo do título os nomes curtos dos componentes de `comboItems` quando o registro é composição ou combo legado (`isCombo`). O mobile já recebia `combo_items` na projeção da lista e preservava `description`, mas o card apresentava apenas o selo “Composição”, sem o resumo.
- [x] O mobile agora reutiliza `getMobileProductRootCompositionItems` para normalizar componentes e adiciona `getMobileProductCompositionCardItems` como transformação de apresentação equivalente ao ERP (`description` antes de ` - `; fallback “Item sem nome”). Aceita aliases camel/snake e composições legadas `isCombo`/`is_combo`.
- [x] O resumo é exibido sob o nome do card, com limite de duas linhas e rótulo acessível; nenhum cálculo de saldo, quantidade, componente persistido ou fluxo de estoque foi alterado.
- [x] Vitest focado em `mobileProductCardDisplay.test.ts`: **5/5**. Inclui nomes curtos, aliases/dados serializados, produto não composto e fallback sem descrição.
- [x] `git diff --check` passou; Git só avisou que normalizará CRLF/LF no roadmap. A checagem `tsc --noEmit -p tsconfig.json` mobile terminou com **15 diagnósticos globais**, todos em arquivos/configurações fora deste recorte; nenhum aponta para os arquivos alterados.

#### Limitações

- [ ] Não houve Playwright autenticado nem renderização em telefone/Maestro; o teste cobre a transformação pura, não o layout real do card React Native. Expo Web não foi usado como prova de comportamento nativo. A autenticação continua sem ser repetida devido ao risco documentado de limpeza de rascunhos no Dashboard (Ciclo 182).
- [x] Sem consulta ou escrita remota, Supabase/PostgreSQL/Docker local, acesso à Meta ou deploy. A Conciliação de Produtos permanece exclusiva do ERP.
- [x] Regras consultadas: `AGENTS.md` (regras fornecidas pelo usuário e arquivo da raiz, seções de formulários/testes/Conciliação), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/produtos/auditoria-arquitetura-organizacao-produtos.md`, `docs/mobile/arquitetura_offline_first.md`, este inventário, roadmap e skill `erp-web-to-mobile-replication`. A skill não foi encontrada em fonte canônica `.agents/skills`/`skills`; somente a cópia de cache em `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/` estava acessível e foi usada como orientação. Não há `AGENTS.md` aninhado em `mobile/`, `erp/`, `shared-utils/` ou `docs/`.

**Conclusão do recorte:** o card mobile de composição agora apresenta a mesma lista resumida de componentes que a lista ERP, preservando os dados e o contrato de estoque. A auditoria geral continua aberta.

#### Próximo recorte identificado

Prosseguir por outro estado da lista de Produtos, mantendo pendentes a validação visual autenticada e a prova nativa até haver uma condição segura; considerar os ciclos 303–306 como confirmação já concluída do bloqueio de publicação sem `productConfig`.

### Ciclo 313 — categoria primária legada no card/lista mobile — 25/10/2026

**Recorte:** apresentação da categoria em produto de lista cujo `category_id` está preenchido, mas não tem linha em `product_categories`.

#### Evidência e correção

- [x] O mapper ERP preenche `categoryIds` pelas relações normalizadas e usa `category_id` como fallback quando não há relações (`erp/src/pages/utils/productService/productMapper.ts`). O card ERP consulta esses IDs na árvore de categorias antes de recorrer ao texto legado `product.category`.
- [x] A consulta completa mobile carregava o `category_id`, mas o pós-processamento só buscava nomes dos IDs vindos de `product_categories`; assim, cards de linhas legadas sem relação exibiam apenas o texto de `products.category` (que pode estar vazio) em vez do nome da categoria.
- [x] Criei `getMobileProductListCategoryIds` e `getMobileProductListCategoryLabel` no domínio da apresentação: relações normalizadas têm precedência e `category_id` só entra como fallback, preservando o contrato ERP quando coexistem ambos. O lookup agora inclui o ID legado e a categoria é resolvida antes do texto de compatibilidade. Acrescentei `category_id` também à projeção compacta de resumo, mesmo sem call site produtivo localizado no momento.
- [x] A cobertura de serviço reproduz uma linha sem `product_categories`, com `category_id` válido e label textual vazio; agora roda tanto pela consulta completa usada pela lista quanto pela projeção compacta, verificando seleção da coluna/projeção, query de nome e label final. Testes focados de apresentação e fetch mobile: **46/46** em dois arquivos.
- [x] `git diff --check` passou; Git avisou somente sobre normalização CRLF/LF nos arquivos de fetch. `tsc --noEmit -p tsconfig.json` mobile terminou com **15 diagnósticos globais preexistentes**, em arquivos fora deste recorte, sem erros nos arquivos alterados.

#### Limitações

- [ ] Não houve Playwright autenticado nem renderização em telefone/Maestro; os testes validam a derivação e o mapeamento com mocks, não o visual do card nem uma leitura real do banco. Expo Web não foi usado como substituto do runtime nativo. A autenticação continua pendente pelo risco de limpeza de rascunhos no Dashboard descrito no Ciclo 182.
- [x] Sem leitura/escrita remota, Supabase/PostgreSQL/Docker local ou deploy. A Conciliação de Produtos permanece exclusiva do ERP.
- [x] Regras consultadas antes da mudança: `AGENTS.md` (arquivo raiz e regras de testes, formulários e Conciliação; `rg` localizou somente outro AGENTS em `digital-catalog/`, fora do escopo), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, documentação de estrutura e operações de variação, auditoria de arquitetura de Produtos, arquitetura offline-first, inventário, roadmap e skill `erp-web-to-mobile-replication`. A skill não foi encontrada na fonte canônica `.agents/skills`/`skills`; somente a cópia em `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/` estava acessível e foi usada como orientação.

**Conclusão do recorte:** a lista mobile agora resolve a categoria do registro legado por ID na mesma ordem de precedência do mapper/card ERP. O texto `category` continua como fallback para registros antigos sem ID resolvível. A auditoria geral permanece aberta.

#### Próximo recorte identificado

Prosseguir pelo estado de erro/indisponibilidade da consulta de nomes de categoria durante a lista; manter pendentes a validação visual autenticada e a validação Android/iOS até haver uma condição segura e aparelho físico disponível.

### Ciclo 314 — falha na consulta do nome da categoria na lista — 25/10/2026

**Recorte:** estado de erro da lista quando a resolução do nome de uma categoria relacionada falha.

#### Evidência e conclusão

- [x] ERP: `fetchProductsPage` inclui `product_categories(...categories...)` na consulta que alimenta a lista e usa `throwOnError: true` em `erp/src/pages/App/Products/ProductList/hooks/data/useProducts.ts`. Com erro sem dados atuais, `ProductList` mostra “Não foi possível carregar os produtos.” e a ação “Tentar novamente”.
- [x] Mobile: a consulta de nomes em `categories` propaga `categoryError` quando `throwOnError` está ligado; o caller da lista habilita essa opção. `useMobileProducts` converte a falha para a mesma mensagem e o estado vazio de `NativeProductsScreen` apresenta “Tentar novamente”. O caminho já preserva o contrato ERP; nenhuma mudança de produção foi necessária.
- [x] Acrescentei regressão de serviço em que a consulta principal retorna um produto e a consulta de categorias falha; o erro de categoria precisa ser propagado para que o estado de erro/retry não pareça uma lista vazia. Vitest de apresentação + fetch: **47/47** em dois arquivos.
- [x] `git diff --check` passou. Nenhuma consulta ao banco real, escrita remota, ambiente local proibido ou deploy.

#### Limitações

- [ ] A cobertura comprova a propagação pelo serviço com mocks; não exercita a renderização/retry real da tela. Playwright autenticado segue pendente; não houve validação em aparelho/Maestro. Expo Web não foi usado como prova nativa.
- [x] Regras consultadas antes da mudança: `AGENTS.md` (runner permitido e Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, estrutura de produtos/variações, arquitetura offline-first, auditoria de arquitetura, inventário, roadmap e skill `erp-web-to-mobile-replication`. Só foi encontrada a cópia em cache sob `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/`; ela orientou a revisão, sem ser tratada como fonte canônica.

**Conclusão do recorte:** tanto ERP quanto mobile tratam a falha de resolução de categorias como erro de carga, com mensagem genérica e possibilidade de tentar novamente; não há diferença funcional comprovada para corrigir. A auditoria geral continua aberta.

#### Próximo recorte identificado

Na mesma lista, comparar a falha de atualização quando já existe um snapshot anterior e o critério de mantê-lo ou limpá-lo. Permanecem pendentes as validações visuais autenticada e nativa.

### Ciclo 315 — snapshot da lista após falha de atualização — 25/10/2026

**Recorte:** lista de Produtos com dados já carregados, durante atualização da mesma consulta ou falha de uma consulta com filtros/página diferentes.

#### Evidência e conclusão

- [x] ERP usa como chave de consulta filtros, página e tamanho da página; `shouldClearQueryListSnapshot` mantém resultado quando a mesma chave conserva dados e limpa a cópia local somente quando a consulta atual não tem dados e terminou com erro (`erp/src/pages/App/Products/ProductList/hooks/data/useProducts.ts`, `erp/src/pages/utils/queryListSnapshot.ts`). A tela mostra erro/retry somente quando não há produtos visíveis.
- [x] Mobile inclui filtros e tamanho da página em `requestFiltersKey` e acrescenta a página ao snapshot. `shouldClearMobileProductListSnapshot` mantém o snapshot quando a atualização falha para a mesma chave e limpa quando ainda não houve sucesso para a chave solicitada. `useMobileProducts` mantém o conteúdo em erro de mesmo snapshot e `NativeProductsScreen` só troca a lista pela mensagem com retry quando não há produtos.
- [x] Os comportamentos cobertos pelos helpers são equivalentes: mesma chave com falha mantém; chave nova sem resposta confirmada limpa; enquanto não há erro, o snapshot anterior não é descartado apenas por estar carregando. Vitest dos helpers ERP e mobile: **18/18** em dois arquivos.
- [x] Não encontrei diferença de produção que justificasse correção; `git diff --check` passou. Nenhuma alteração funcional foi feita neste ciclo.

#### Limitações

- [ ] A comparação cobriu helpers e leitura estática dos hooks/telas, sem exercitar a refetch real no React Query ou a renderização/retry da UI. Playwright autenticado e validação nativa continuam pendentes; Expo Web não comprovaria runtime nativo.
- [x] Regras consultadas: `AGENTS.md` (Vitest/RTL, restrições de infra e Conciliação exclusiva do ERP), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, estrutura de produtos/variações, operações mover/merge, arquitetura offline-first, auditoria de arquitetura, inventário, roadmap e skill `erp-web-to-mobile-replication`. A skill atual não foi localizada em fonte canônica `.agents/skills`/`skills`; a cópia acessível em `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/` foi usada apenas como orientação.

**Conclusão do recorte:** a política de retenção/limpeza da lista em falhas de atualização mantém o contrato ERP no mobile para snapshot, filtro, página e tamanho da página. A auditoria geral permanece aberta.

#### Próximo recorte identificado

Na lista, revisar a transição de filtros/página após retry e a sincronização do indicador de paginação, sem reabrir a exceção permanente da Conciliação ERP-only. Permanecem pendentes as validações visuais autenticada e nativa.

### Ciclo 316 — paginação após retry e mudança de filtro — 25/10/2026

**Recorte:** transição da página corrente, tamanho de página e indicador após retry/refetch, mudança de filtro e redução da contagem.

#### Evidência e conclusão

- [x] ERP reinicia a página para 1 ao mudar filtros ou tamanho, conserva resultados da mesma consulta durante refetch com falha e ajusta a página depois de uma resposta bem-sucedida que reduza o número de páginas (`useProductsQueryState.test.tsx`).
- [x] Mobile faz a nova consulta na página 1 imediatamente ao mudar os filtros, inclui tamanho e página na chave do snapshot, conserva a página selecionada até ter resposta confirmada e então a ajusta para a última página válida. `retryMobileProductListReadOnce` e o QueryClient ERP fazem uma repetição antes de expor a falha (ERP `retry: 1`).
- [x] Os slots de navegação usam `getFixedPageSlots`/`normalizePageNumber` compartilhados. O mobile omite o bloqueio por `loading` no componente de slots, porém oculta seu rodapé durante carregamento bloqueante e o mantém no pull-to-refresh; no ERP, o carregamento inicial também substitui o conteúdo e o refetch com cache mantém os slots disponíveis.
- [x] O indicador textual difere por plataforma: ERP mostra “Página n · N itens no catálogo”; app mostra o intervalo “Exibindo x-y de N produtos”. Ambos derivam a mesma página, contagem e tamanhos válidos (10/15); o intervalo é uma adaptação compacta do rodapé nativo e não altera a paginação.
- [x] Vitest/RTL do hook ERP e teste de lógica da paginação mobile: **27/27** em dois arquivos. As mensagens de `console` sobre mutações do Catálogo em dois testes ERP são saídas esperadas desses casos e não falhas. `git diff --check` sem erro; nenhuma mudança de produção foi necessária.

#### Limitações

- [ ] A suíte exercita o hook ERP e helpers mobile, mas não monta o hook/tela mobile nem valida toque e renderização real. Não houve Playwright autenticado ou aparelho/Maestro; Expo Web não comprovaria comportamento nativo.
- [x] Regras consultadas: `AGENTS.md` (testes permitidos, sem banco local, formulários e Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, estrutura de produtos/variações, operações mover/merge, arquitetura offline-first, auditoria de arquitetura, inventário, roadmap e skill `erp-web-to-mobile-replication`. A versão da skill não foi encontrada em `.agents/skills`; usei somente a cópia acessível no backup de dependências do ERP como orientação.

**Conclusão do recorte:** mudança de filtro, página após retry, clamping e número visível de itens mantêm contrato equivalente. A diferença na frase do indicador foi registrada como adaptação de apresentação para a tela mobile. A auditoria geral continua aberta.

#### Próximo recorte identificado

Continuar no módulo Produtos pelo estado de filtros da lista (catálogo, tipo e status) e verificar payload/contagem sem reabrir a Conciliação, que permanece exclusiva do ERP. As validações visuais autenticada e nativa continuam pendentes.

### Ciclo 317 — interseção de tipo, situação e Catálogo Digital na lista — 25/10/2026

**Recorte:** combinação dos filtros da lista por tipo (padrão/composição e produto/serviço), situação no ERP (ativo/desativado/rascunho) e status no Catálogo Digital (publicado/ocultado), incluindo a contagem antes da paginação.

#### Evidência e conclusão

- [x] No ERP, `ProductFilters` separa “Situação no ERP” (`activeOnly`/`isDraft`) de “Catálogo Digital” (`status`). `ProductList` acrescenta `itemType = composition` no modo Composições; no modo padrão mantém os filtros de tipo recebidos. `applyProductFiltersAndSort` combina `itemType`/`excludeItemType`, `isDraft`, ativo e `status` na mesma query antes de aplicar `.range`. `fetchProductsPage` solicita `count: 'exact'` e devolve essa contagem do conjunto filtrado.
- [x] No app, `ProductsHeaderFiltersSheet` oferece as mesmas escolhas de situação e Catálogo e o filtro de tipo geral produto/serviço; o modo Composições é mantido separadamente. `useMobileProducts` passa cada dimensão em campo próprio (`statusFilter`, `catalogStatus`, `itemType`, `generalType`), e `fetchMobileProductsPage` aplica as condições na query `products`, solicita contagem exata e só então pagina. Assim como no ERP, a condição de Catálogo na lista compara `products.status` do registro-pai; não foi introduzido um filtro distinto por status das linhas de variação.
- [x] Os testes já existentes cobrem interseção situação+Catálogo em composições, status de Catálogo em produtos padrão e ordem dos filtros antes do intervalo no ERP (`productFilterBuilder.test.ts`). No app, cobrem a mesma interseção, `count: 'exact'`, `total` resultante e intervalo (`mobileProductFetchService.test.ts`); `mobileProductListFilters.test.ts` verifica campos independentes e validação pelo schema RHF/Zod.
- [x] Resultado: não foi encontrada diferença de payload, semântica de filtro ou contagem que justifique mudança de produção. O filtro geral adicional do app é uma adaptação de seleção nativa que encaminha o equivalente produto/serviço usado no ERP; as escolhas de Composições continuam condicionadas ao modo e permissões existentes.
- [x] Vitest focado: ERP **17/17**; app **46/46** em dois arquivos. O pacote `mobile/` não possui Vitest próprio instalado; a primeira tentativa não resolveu `vitest/config`. A repetição com Vitest 2.1.9 já instalado em `erp/node_modules`, disponibilizado por `NODE_PATH` sem instalar dependências, passou integralmente.
- [x] Esclarecimento posterior do usuário: para perfil sem a permissão pertinente, é aceitável bloquear a ação do Catálogo. Isso reafirma o gate registrado nos Ciclos 196/198/203; não muda a consulta nem mistura permissão com a validação de rascunho/conformidade.

#### Limitações

- [ ] A comparação deste recorte foi estática, apoiada pelos testes de construção das queries; não houve Playwright autenticado ou renderização em aparelho/Maestro. Portanto, labels, toque e comportamento do modal nativo seguem sem validação visual; Expo Web não comprovaria o runtime nativo.
- [x] Sem consulta ou escrita remota, Supabase/PostgreSQL/Docker local, Meta ou deploy. A Conciliação permanece somente no ERP.
- [x] Regras e documentação consultadas: `AGENTS.md` (formulários, testes e Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/mobile/arquitetura_offline_first.md`, auditoria de arquitetura de Produtos, inventário, roadmap e skill `erp-web-to-mobile-replication`. A skill atual não foi encontrada na fonte canônica do projeto; somente a cópia de cache em `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/` estava acessível e foi usada como orientação.

**Conclusão do recorte:** filtros de tipo, situação no ERP e Catálogo Digital se intersectam no servidor e a contagem considera a mesma seleção antes do intervalo, com contratos equivalentes. Nenhuma mudança de código foi necessária. A auditoria geral continua aberta.

#### Próximo recorte identificado

Continuar em outro estado da lista de Produtos; manter pendentes a comparação Playwright autenticada e a validação nativa em telefone físico/Maestro. Não reabrir a Conciliação de Produtos, exclusiva do ERP.

### Ciclo 318 — visibilidade de variações mescladas na lista — 25/10/2026

**Recorte:** alternância “Mostrar mesclados” em famílias mistas e em famílias cujas variações foram todas mescladas.

#### Evidência e conclusão

- [x] ERP: `ProductsTopToolbar` publica o toggle em todos os modos dessa tela; `useProductsPageState` envia `showMergedProducts` como `includeMergedVariations`. Quando desligado, `useProducts` oculta a linha de cada variação com `mergedToVariationId`, remove o pai somente quando todas as variações estão mescladas e mantém no pai apenas as variações não mescladas. Ligá-lo revela as linhas mescladas e o pai integralmente mesclado. A troca do toggle reinicia a página e limpa a seleção.
- [x] App: `ProductsHeaderMenuDropdown` oferece a mesma ação nos modos Produtos e Composições; a folha de filtros repete o controle no modo Produtos. `useMobileProducts` inclui a opção na chave da consulta, volta à página 1 e invalida respostas da consulta anterior. `fetchMobileProductsPage` mantém uma família mista e apresenta somente suas variações não mescladas por padrão; remove o pai quando todas estão mescladas; com `includeMerged` habilitado, apresenta o pai e as variações, marcadas com `isMerged`.
- [x] A contagem nos dois serviços é dos registros-pai filtrados e não é reduzida pela transformação local que oculta variações mescladas. A família mista versus integralmente mesclada segue a mesma regra; não há payload ou contrato backend adicional.
- [x] A folha de filtros mobile oculta o toggle quando `mode === 'composition'`, mas o menu do cabeçalho o mantém disponível nesse modo. A tela de Composições dedicada no app é uma extensão mobile: `/products/compositions` no ERP redireciona para `/products`. A localização no menu versus toolbar é adaptação de plataforma e não bloqueia o acesso à ação no modo composto; não justifica criar uma rota ERP ou ampliar o escopo.
- [x] Vitest focado: transformação ERP `productListTransformers.test.ts` **4/4**; fetch e guarda de solicitações mobile `mobileProductFetchService.test.ts` + `mobileProductListRequest.test.ts` **51/51**. Não foi necessária alteração de produção.

#### Limitações

- [ ] Os testes cobrem transformação, filtragem e invalidação de solicitações, sem montar as telas ou validar toque, posição e feedback visual. Não houve Playwright autenticado nem aparelho/Maestro; Expo Web não comprovaria o comportamento nativo. A presença do controle no menu foi confirmada estaticamente.
- [x] Sem leitura/escrita remota, Supabase/PostgreSQL/Docker local ou deploy. A Conciliação de Produtos permanece exclusivamente no ERP.
- [x] Regras consultadas: `AGENTS.md` (RHF/Zod, runners autorizados, banco local proibido e Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, estrutura de produto/variação, operações de mover/merge, arquitetura offline-first, inventário, roadmap e skill `erp-web-to-mobile-replication`. A busca não encontrou skill canônica em `.agents/skills`/`skills`; foi consultada somente a cópia de cache no backup de dependências ERP como orientação.

**Conclusão do recorte:** o toggle usa a mesma regra de visibilidade para variações mescladas e preserva o contrato de contagem nos dois clientes. Nenhuma mudança de código foi necessária. A auditoria geral continua aberta.

#### Próximo recorte identificado

Prosseguir para outro estado funcional da lista ou das variações. Manter pendentes a comparação visual autenticada e a prova nativa por telefone físico/Maestro; não reabrir a Conciliação, exclusiva do ERP.

### Ciclo 319 — revisão das policies consultadas pela guarda do Catálogo — 25/10/2026

**Recorte:** coerência entre o trigger local que bloqueia a publicação/ocultação sem `productConfig` e as permissões de leitura das tabelas que ele consulta.

#### Evidência

- [x] A migration local `supabase/migrations/20261025002304_protect_product_catalog_status_permission.sql` cria a função e os triggers em `public.products` e `public.product_variations`. A função usa `SECURITY INVOKER`, `search_path = ''`, `auth.uid()`, valida os papéis do próprio perfil e lê `settings.data.rolePermissions.productConfig`; mantém a decisão do usuário: a ação de Catálogo exige `productConfig`, enquanto a interface mantém o status visível. A inserção já `published` e a mudança de status são os únicos eventos novos bloqueados; salvar outros dados não publica nem oculta por si só.
- [x] A migration local `20260827221000_secure_profiles_access_management.sql` limita a policy de leitura de `profiles` à própria linha (ou administrador), que corresponde ao `WHERE profile.id = auth.uid()` do trigger. A policy `Anyone can read settings` da migration `20260827233000_secure_settings_writes.sql` permite a leitura da configuração; `20260928171344_restrict_settings_data_api.sql` concede explicitamente `SELECT` em `settings` a `authenticated`.
- [x] A revisão não encontrou um `GRANT SELECT ON public.profiles TO authenticated` explícito nas migrations versionadas. RLS/policy limita linhas, mas não substitui o privilégio de tabela. A documentação atual do Supabase também separa esses dois controles: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) e [funções](https://supabase.com/docs/guides/database/functions). Não concluo que o grant esteja ausente do projeto — os privilégios padrão do projeto podem fornecê-lo —, apenas que os arquivos versionados não o comprovam.
- [x] A migration segue local e sem aplicação remota; não foi executada leitura de ACL, chamada de teste, escrita, migration, deploy ou integração PostgreSQL nesta execução. Assim, nem o grant efetivo de `profiles`, nem a execução real do trigger foram comprovados. A política vigente do projeto proíbe banco local e exige que RLS, triggers e persistência sejam verificados no Supabase remoto operacional; mocks ou leitura SQL estática não bastam.
- [x] Nenhum arquivo de produção ou migration foi alterado. A skill `erp-web-to-mobile-replication` não foi encontrada na fonte canônica `.agents/skills`; consultei a cópia de cache do backup ERP apenas como orientação. Também foram lidos `AGENTS.md` (seções 7, 12 e 13), `docs/geral/USER_RULES.md`, `docs/testing/SUPABASE_REMOTE_TEST_POLICY.md`, a documentação de estrutura e operações de produtos, as policies versionadas e o inventário/roadmap. Não há `AGENTS.md` aninhado em `docs/`, `shared-utils/` ou `supabase/`.

#### Limitações

- [ ] A proteção server-side continua pendente: confirmar no projeto operacional o privilégio efetivo de leitura de `profiles` para `authenticated`, aplicar a migration autorizada somente após revisar estado e precondições remotos, e exercitar allow/deny através de fixture autorizada. Não substituir esse passo por grant amplo ou `SECURITY DEFINER` em resposta a uma falha de privilégio.
- [ ] A inspeção estática não valida RLS, execução do trigger nem que cada escritor operacional de status apresenta contexto de usuário autenticado. As validações visuais de ERP e nativas permanecem limitadas às evidências dos Ciclos 305–306.

**Conclusão do recorte:** as policies de linha e a configuração de permissão são coerentes com a identidade consultada pelo trigger; o grant SQL efetivo em `profiles` e a proteção executada ainda não estão provados. Não houve alteração funcional nem teste nesta revisão. A auditoria geral continua aberta.

#### Próximo recorte identificado

Continuar por outro estado da lista de Produtos. Manter o trigger de Catálogo como pendência de verificação no Supabase remoto operacional, sem declarar a proteção pronta; não revisitar a Conciliação, exclusiva do ERP.

### Ciclo 320 — seleção em lote na lista responsiva de produtos — 25/10/2026

**Recorte:** possibilidade de selecionar cards de Produto e acionar operações em lote no estado ERP abaixo de XL, comparada à lista React Native.

#### Evidência

- [x] O ERP alterna a tabela para cards em telas menores que 1280 px ou quando detecta WebView/mobile. `ProductTable` esconde o contêiner da tabela nesse estado e mantém a lista de cards visível. As caixas de seleção por linha e “selecionar todos” pertencem a `ProductRow`/`ProductTable`, dentro da tabela.
- [x] `ProductCard` recebe `isSelected` e `onToggleSelection`, mas nesta versão só usa `isSelected` para realçar a borda. Não chama `onToggleSelection` nem apresenta controle de seleção; portanto, a seleção em lote da página não pode ser iniciada pelo layout de cards do ERP. A barra de lote fica fora do contêiner da tabela e pode permanecer visível se uma seleção for feita antes de reduzir a janela; esse caso de transição entre larguras não oferece uma ação de seleção nova nos cards.
- [x] `NativeProductsScreen` renderiza `MobileProductCard` sem propriedades ou estado de seleção em lote; `MobileProductCard` não oferece controle para seleção. As ações individuais de Produto/variação e lixeira continuam disponíveis pelos gates já auditados. Assim, no estado de cards correspondente ao app, ERP e mobile não iniciam seleção nem lote.
- [x] A falta de seleção em lote no app não é tratada como diferença de paridade: ela acompanha o estado responsivo de cards do próprio ERP. Não foi criado um fluxo mobile adicional para desativar/restaurar múltiplos Produtos. A busca em `docs/mobile/`, `docs/produtos/`, `docs/negocio/produtos/` e `docs/forms/` não encontrou uma particularidade separada para seleção de cards; a justificativa está documentada aqui a partir do breakpoint e dos componentes ERP.
- [x] Inspecionei implementação ERP, utilitário/estado de seleção (`productSelection.ts`, `useProducts`) e lista/cartão mobile. O escopo não atravessou a Conciliação, protegida por `rules/products/product-reconciliation-erp-only.yml`. Nenhum código foi alterado; não houve teste automatizado ou validação visual porque a conclusão é estática e não altera UI.
- [x] Regras/referências consultadas: `AGENTS.md` (formulários, runners permitidos e Conciliação ERP-only), `docs/geral/USER_RULES.md`, regra de Conciliação, skill `erp-web-to-mobile-replication` (somente cópia acessível no cache do backup ERP; fonte canônica não localizada), estrutura de produto/variação, operações mover/merge, inventário e roadmap. Não há `AGENTS.md` aninhado nos diretórios envolvidos.

#### Limitações

- [ ] Não fiz comparação visual autenticada em Playwright nem teste em Android físico/Maestro. O recorte não afirma equivalência visual ou comportamento nativo; apenas compara o caminho de seleção presente nos componentes.
- [ ] Na UI ERP, uma seleção iniciada na tabela desktop pode manter a barra de lote ao reduzir a largura, pois a barra não está no contêiner oculto da tabela. Não alterei esse caso de redimensionamento: ele não é um caminho para iniciar seleção a partir do estado mobile do aplicativo.

**Conclusão do recorte:** na apresentação responsiva de cards, ambos os clientes não permitem iniciar seleção em lote; o app não tem uma operação a replicar nesse estado. Nenhuma alteração de produção é necessária para esta parte. A auditoria geral continua aberta.

#### Próximo recorte identificado

Retomar outra aba/estado de cadastro ou edição de Produto e comparar um único fluxo de entrada com o respectivo formulário ERP e schema compartilhado; manter pendentes as validações visuais autenticada/nativa e a proteção remota do Catálogo.

### Ciclo 321 — identidade UUID da variação padrão no cadastro simples — 25/10/2026

**Recorte:** abertura de **Novo Produto** sem dados iniciais, criação da variação operacional única e identidade usada no primeiro e nos próximos autosaves.

#### Evidência e correção

- [x] O ERP abre o formulário simples por `openNewProduct('standard')`; `useProductFormLoad` materializa a variação por `ensureProductFormVariation`/`ensureDefaultVariation`. A variação padrão recebe UUID v4 antes de salvar, SKU derivado do código e valores herdados do pai. Isso respeita a identidade estável descrita em `docs/negocio/produtos/estrutura-produto-variacao.md`.
- [x] No mobile, `NativeProductsScreen.handleOpenNew` abre o mesmo estado sem dados. Antes deste ciclo, a variação provisória era identificada como `new_${productCode}-01`. `saveMobileProduct` converte IDs que não sejam UUID em um UUID novo para cada payload; após o ACK do autosave o formulário atualizava a identidade do pai, mas deixava esse ID provisório na variação. Assim uma nova edição/serialização podia enviar outra identidade para a mesma variação.
- [x] A variação simples criada no formulário mobile agora usa `createMobileProductVariationId`, a mesma fonte usada pela geração de variações múltiplas. O UUID existe antes do primeiro autosave e é conservado pelas sincronizações de formulário; o persistidor já preserva IDs UUID recebidos no payload. A cobertura verifica a forma UUID gerada, UUIDs distintos na geração em lote e a passagem dos IDs estáveis até `p_variations`.
- [x] Os valores-padrão restantes foram comparados sem ampliar a mudança: flags de rascunho/ativo e `condition` divergem transitoriamente entre os objetos iniciais; ambos os clientes normalizam o primeiro autosave para rascunho inativo e a finalização de cadastro novo para ativo/oculto, e o campo de origem do estoque continua exigido. Não há correção adicional suportada neste estado.
- [x] Regras consultadas: `AGENTS.md` (RHF/Zod, runners e exceção ERP-only da Conciliação), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/mobile/arquitetura_offline_first.md`, inventário de formulários, roadmap e skill `erp-web-to-mobile-replication`. A busca não encontrou cópia canônica no projeto; usei a cópia acessível no cache do backup do ERP apenas como orientação. Não há `AGENTS.md` aninhado em `mobile/`, `shared-utils/` ou `docs/`.

#### Validação e limitações

- [x] Vitest focado, via runner ERP permitido: `mobileProductVariationGeneration.test.ts` e `mobileProductMutationService.test.ts` — **2 arquivos, 65 testes aprovados**.
- [ ] A inspeção é de implementação e lógica; não houve Playwright autenticado nem aparelho Android físico/Maestro. Expo Web não comprova comportamento nativo.
- [ ] O teste não cria fixture nem chama a RPC remota; a identidade no contrato serializado do cliente está coberta, mas a persistência/idempotência completa da RPC segue dependente da fixture remota previamente autorizada registrada no início do inventário.
- [x] Sem Supabase/PostgreSQL/Docker local, leitura/escrita remota, deploy ou alteração fiscal. A Conciliação continua exclusiva do ERP.

**Conclusão do recorte:** foi corrigida a divergência comprovada de identidade da variação simples durante o ciclo de cadastro/autosave; a regra de negócio de persistência continua no serviço existente. A auditoria geral segue aberta.

#### Próximo recorte identificado

Retomar outro estado de cadastro/edição que não esteja encerrado no inventário; manter como pendências separadas a validação visual autenticada/nativa e a estabilidade do contrato remoto do autosave com fixture autorizada.

### Ciclo 322 — nome padrão ao adicionar variação individual — 25/10/2026

**Recorte:** ação **Adicionar variação** no formulário de Produto, após entrar no modo com variações.

#### Evidência e correção

- [x] O ERP usa `createDefaultNewVariation`: nomeia pelo nome do produto, depois pela descrição, e usa `Nova Variação` como último fallback; aplica `toTitleCase` compartilhado. O `textUtils.ts` do ERP reexporta a mesma função de `shared-utils/productText.ts` usada pelo app.
- [x] No mobile, `handleAdd` antes usava somente `formData.name`, mantinha a capitalização digitada e recorria a `Produto`. Isso divergia quando só a descrição estava preenchida ou ambos os campos estavam vazios, além de não aplicar o formato do ERP. Agora usa `getInitialMobileVariationName`, função pura coberta por testes, que replica o contrato do domínio ERP. UUID estável da variação continua sendo alocado pela correção do Ciclo 321; campos extras de apresentação/canal e valores mobile permanecem intactos.
- [x] Revisei a regra de drafts/estado inicial: não alterei o contrato de status nesta ação; o serviço mobile normaliza o autosave e a finalização em seus caminhos próprios, como registrado no Ciclo 321.
- [x] Regras e referências consultadas: `AGENTS.md` (formulários RHF/Zod, runners e Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, documentação de estrutura produto/variação e mover/merge, `docs/mobile/arquitetura_offline_first.md`, skill `erp-web-to-mobile-replication`, inventário e roadmap. Não há `AGENTS.md` aninhado em `mobile/`, `shared-utils/` ou `docs/`. A busca não encontrou fonte canônica da skill no projeto; a cópia encontrada no cache do backup ERP foi usada apenas como orientação.

#### Validação e limitações

- [x] Vitest pelo runner ERP permitido — `mobileProductVariationGeneration.test.ts` e `mobileProductMutationService.test.ts`: **2 arquivos, 66 testes aprovados**.
- [x] `git diff --check` sem erros; Git avisou apenas que pode normalizar CRLF do arquivo TSX já alterado.
- [ ] Sem comparação Playwright autenticada nem teste em Android físico/Maestro; Expo Web não comprova comportamento nativo. Sem fixture ou RPC remota, acesso/escrita externa ou deploy. A persistência completa do autosave segue como limitação remota autorizada/pendente; a Conciliação permanece exclusiva do ERP.

**Conclusão do recorte:** o default de nome da ação de adicionar variação individual agora coincide com o ERP e tem cobertura de lógica. A auditoria geral continua aberta.

#### Próximo recorte identificado

Continuar por outro estado do formulário/aba de Produto, uma ação por execução. Manter pendentes a comparação visual autenticada/nativa e as provas remotas de persistência/gates já listadas; não revisitar a Conciliação, exclusiva do ERP.

### Ciclo 323 — flags de herança das dimensões ao adicionar variação — 25/10/2026

**Recorte:** contrato de herança de dimensões da variação criada pela ação **Adicionar variação**.

#### Evidência

- [x] O helper ERP `createDefaultNewVariation` inclui `syncDimensions: true` e também as quatro flags por eixo (`syncWidth`, `syncHeight`, `syncDepth`, `syncWeight`). O `handleAdd` mobile inicializa as quatro flags por eixo como `true`, mas não inclui a flag agregada `syncDimensions`.
- [x] A diferença agregada não chega a mudar a operação: não há leitor/controle ativo de `syncDimensions` fora dos defaults ERP; a documentação de domínio define a herança por dimensão. Ambos os escritores persistem `use_parent_dimensions` a partir de `syncWidth`; o mapper ERP restaura cada flag por eixo a partir do detalhe próprio, com fallback para `use_parent_dimensions`. O app mantém e sincroniza as quatro flags por eixo em seu estado de formulário.
- [x] A identidade (UUID), nome, SKU, preços herdados, estado de canal e demais defaults da ação foram comparados nos Ciclos 321–322. Não encontrei divergência funcional apoiada por esse campo agregado; não repliquei metadado sem consumidor no app nem alterei o payload.
- [x] Fontes conferidas nesta execução: `createDefaultNewVariation`, `useProductFormVariations.addVariation`, `ProductFormVariationsTab.handleAdd`, `variationFormDefaults`, `productVariationMapper`, os dois persistidores e a regra `use_parent_dimensions`; documentação de estrutura produto/variação, mover/merge, arquitetura offline-first e skill `erp-web-to-mobile-replication`. A skill existe somente na cópia do cache de build do ERP no workspace, sem fonte canônica localizada. `AGENTS.md` e `docs/geral/USER_RULES.md` foram relidos; a regra ERP-only de Conciliação permanece preservada.

#### Validação e limitações

- [x] Comparação estática de criação → estado do formulário → persistência → hidratação; nenhum código de produção foi alterado, então não executei teste automatizado.
- [ ] Sem Playwright autenticado nem aparelho Android/Maestro. Expo Web não comprova comportamento nativo. Não houve leitura/escrita remota, fixture, migration ou deploy.

**Conclusão do recorte:** `syncDimensions` é uma diferença de representação sem efeito adicional comprovável; as flags persistidas por eixo e o contrato `use_parent_dimensions` permanecem equivalentes. Nenhuma correção é necessária para este estado. A auditoria geral continua aberta.

#### Próximo recorte identificado

Auditar uma ação diferente do formulário de Produto em um único estado, usando o roteiro de cadeia ponta a ponta. Manter abertas as validações visuais autenticada/nativa e os cenários remotos já listados; não revisitar a Conciliação, exclusiva do ERP.

### Ciclo 324 — debounce da busca de componentes da composição — 25/10/2026

**Recorte:** consulta de sugestões no campo de componentes da aba de Composição, sem alterar a montagem, a validação ou a persistência dos itens.

#### Evidência e correção

- [x] O fluxo ERP ativo usa `VariationCompositionItemsTab` → `ProductAutocomplete` → `useProductAutocomplete`; após a mesma validação RHF/Zod de consulta mínima de três caracteres, aguardava 300 ms. O app usa `ProductFormCompositionTab` e o mesmo schema, mas aguardava 500 ms.
- [x] Centralizei `PRODUCT_AUTOCOMPLETE_DEBOUNCE_MS = 300` em `shared-utils/productAutocompleteFormSchema.ts`; ERP e app agora consomem a mesma constante. O valor escolhido conserva o comportamento ERP e reduz em 200 ms a latência da busca móvel. Fornecedor, normalização/validação do query, limite, filtros, payloads, estados de loading/erro/retry e persistência não foram alterados por esta correção.
- [x] Os testes ERP de apresentação/hook e do serviço mobile de busca de componentes passaram: **3 arquivos, 10/10 testes**. Antes de validar, corrigi o mock de `ProductAutocomplete.form.test.tsx`, que não exportava `normalizeProductSearchSeparators`, helper já consumido pelo hook; as três falhas anteriores exibiam erro por ausência desse mock, e não falha do serviço ou do novo intervalo.
- [x] Hipótese de diferença de escopo registrada na primeira leitura e encerrada no Ciclo 352: `itemType = 'standard'` é um modo de lista que exclui composições, não um filtro de `item_type = 'product'`; a comparação dos filtros completos confirmou que ERP e app podem oferecer Serviços ativos como componentes. Não foi necessário escolher uma regra nova nem alterar o comportamento.
- [x] Fontes consultadas: `VariationCompositionItemsTab`, `ProductAutocomplete`, `useProductAutocomplete`, `ProductFormCompositionTab`, `mobileProductCompositionService`, schema compartilhado, testes focados, documentação de estrutura produto/variação, operações de mover/merge, arquitetura offline-first, `AGENTS.md`, `docs/geral/USER_RULES.md`, regra `rules/products/product-reconciliation-erp-only.yml`, inventário e roadmap. Não há `AGENTS.md` aninhado nos diretórios ERP/mobile/shared-utils/docs deste recorte. A skill `erp-web-to-mobile-replication` segue acessível apenas na cópia de cache do backup ERP; não localizei fonte canônica no projeto.

#### Validação e limitações

- [x] Vitest permitido via runner ERP: `ProductAutocomplete.form.test.tsx`, `ProductAutocomplete.variationDisplay.test.tsx` e `mobileProductCompositionService.test.ts` — **3 arquivos, 10 testes aprovados**.
- [x] `git diff --check` final sem erros; Git emitiu somente avisos de normalização CRLF/LF nos arquivos previamente alterados.
- [ ] Sem Playwright autenticado nem teste em telefone Android/Maestro; Expo Web não comprova comportamento nativo. Não houve consulta ou escrita remota, alteração de backend/migration, acesso à Meta ou deploy.

**Conclusão do recorte:** ERP e app agora usam o mesmo atraso de busca de 300 ms. A elegibilidade foi reexaminada no Ciclo 352 e não apresentou diferença entre clientes.

#### Próximo recorte identificado

Na época, a elegibilidade de Serviços ainda parecia aberta; a revisão do Ciclo 352 demonstrou que os clientes já permitem os mesmos candidatos e encerrou essa hipótese. Seguir para outro estado/ação, mantendo as validações visuais autenticada/nativa e remotas pendentes. Não reintroduzir Conciliação no app.

### Ciclo 325 — quantidade dos componentes da composição — 25/10/2026

**Recorte:** editar, validar e exibir a quantidade necessária de cada linha de `comboItems` no formulário de composição por variação.

#### Evidência

- [x] No ERP, o campo usa `type="number"`, `min="1"` e atualiza o estado somente quando `Number(value) >= 1`; o botão do modal aciona `handleSubmit` diretamente. O schema `productVariationDraftSchema` valida o valor numérico e `createProductVariationFormSchema` rejeita quantidade abaixo de um antes do salvamento da variação.
- [x] No app, o `TextInput` usa `decimal-pad`; `parseLocalizedNumber` aceita a notação local, não grava texto vazio/inválido ou valor abaixo de um no estado do produto, o blur restaura a última quantidade válida e os botões diminuem/aumentam em passos unitários com mínimo de um. O `ProductFormScreen` submete e autosalva através dos proprietários RHF/Zod; `createMobileProductFormSchema` verifica o mínimo na finalização para componentes do pai e de cada variação.
- [x] Os schemas de conclusão aceitam valores numéricos `>= 1` nos dois clientes, sem regra explícita de inteiro no domínio. O `step` implícito do HTML não é a regra usada pelo botão ERP, que é `type="button"` e invoca o submit controlado; por isso não tratei a aparência `number` vs `decimal-pad` como contrato de quantidade inteira.
- [x] Os drafts preservam linhas incompletas enquanto não se finaliza; mantive separados esses contratos conforme `AGENTS.md` (draft incompleto vs finalização). Nenhuma lógica de submissão/persistência foi alterada neste ciclo.
- [ ] Diferença visual apenas para estado legado inválido: o subtotal ERP multiplica pelo valor armazenado diretamente; o app usa `Math.max(1, quantity)` e mostra um subtotal de pelo menos uma unidade. Para dados válidos, ambos calculam `unitPrice × quantity`; não encontrei fluxo atual que permita o operador gravar zero pelo controle. A apresentação de registros legados inválidos não foi alterada.
- [x] Fontes consultadas: `VariationCompositionItemsTab`, `VariationModalFooter`, `useVariationForm`, `productVariationValidation`, `ProductFormCompositionTab`, `ProductFormScreen`, `mobileProductFormSchema`, `mobileProductCompositionService`, testes/schema de variações e composição, `docs/forms/inventario-mobile-catalogo-2026-10-15.md`, `docs/forms/migracao-rhf-zod-2026-10-14.md`, documentação de estrutura produto/variação e mover/merge, `AGENTS.md`, `docs/geral/USER_RULES.md`, regra ERP-only da Conciliação, inventário, roadmap e skill. Não há `AGENTS.md` aninhado nos diretórios envolvidos. A skill do projeto permanece localizada apenas na cópia de cache de build registrada no Ciclo 324; não foi tratada como canônica.

#### Validação e limitações

- [x] Comparação estática da entrada, parser, schema RHF/Zod, submit/autosave e cálculo do subtotal. Sem mudança de produção, portanto sem nova execução de teste.
- [ ] Sem Playwright autenticado nem Android físico/Maestro; Expo Web não comprova teclado, blur ou comportamento nativo. Sem acesso/escrita remota, migration ou deploy.

**Conclusão do recorte:** para quantidades válidas, o limite, o valor persistido e o incremento estão alinhados; não há correção de produção necessária. O preview de dados legados zero permanece registrado como exceção de apresentação. A auditoria geral continua aberta.

#### Próximo recorte identificado

Prosseguir para outro estado/ação de Produtos. A dúvida então pendente sobre serviços como componentes foi encerrada no Ciclo 352, sem diferença a corrigir. Preservar as pendências de UI autenticada, runtime Android/Maestro e prova remota; Conciliação segue exclusiva do ERP.

### Ciclo 326 — remoção de componente da composição — 25/10/2026

**Recorte:** ação **Remover Item** sobre uma linha de componentes na aba de Composição de uma variação.

#### Evidência

- [x] O ERP `VariationCompositionItemsTab.handleRemoveItem` clona `comboItems`, remove somente o índice escolhido e atualiza o estado local da variação. O botão de lixeira chama o handler diretamente, sem confirmação. O total sugerido é recalculado a partir das linhas restantes.
- [x] O app `ProductFormCompositionTab.handleRemove` também filtra somente a linha escolhida e não apresenta confirmação. Ele limpa `quantityInputs`, estado transitório indexado por posição, para impedir que um texto não confirmado de uma linha passe a ser exibido na próxima após a remoção/reindexação. A tela pai repassa o setter da variação selecionada e persiste sua cópia em `formData.variations`; não remove produto/variação do catálogo nem toca em estoque.
- [x] O total sugerido do app é refeito depois da atualização, assim como o ERP para componentes válidos. A mutação mobile envia a lista resultante em `product_variations.combo_items` após `normalizeComboItems`; o ERP envia o `combo_items` da variação no `saveVariation`. Um produto pai, uma variação distinta ou outras linhas não são alterados pela remoção.
- [x] A diferença do momento de persistência permanece o comportamento documentado do formulário: no app, mudança em rascunho pode entrar na fila serializada de autosave RHF/Zod; no ERP, a variação fica no estado local até **Salvar Alterações**. Em produto não rascunho, a remoção também permanece no estado do formulário até sua finalização. Não alterei autosave nem modal de confirmação.
- [x] Regras consultadas: `AGENTS.md` (RHF/Zod, validação e Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, skill de replicação disponível apenas no cache ERP, documentação de produto/variação e mover/merge, inventário de formulários, inventário de paridade e roadmap. Não há `AGENTS.md` aninhado em `erp/src/pages/App/Products`, `mobile/src/features/products` ou `docs/`.

#### Validação e limitações

- [x] Revisão estática do handler → setter da variação proprietária → autosave/submissão RHF/Zod → payload `combo_items`; nenhuma diferença funcional de exclusão foi encontrada e nenhum código de produção foi alterado, portanto não executei teste automatizado.
- [ ] O arquivo `VariationFormModal.test.tsx` contém cobertura ERP para o acionamento de **Remover Item**, mas não encontrei teste dedicado de UI para o componente React Native. Isso não impediu a conclusão estática do handler; toque, blur e re-render não foram provados em Android físico/Maestro. Sem Playwright autenticado, consulta/escrita remota ou deploy.

**Conclusão do recorte:** a exclusão de linha e o escopo da alteração coincidem. A limpeza de buffers por índice é adaptação local do app para sua entrada nativa. A remoção em rascunho segue autosave serializado e não altera imediatamente o backend fora desse fluxo.

#### Próximo recorte identificado

Continuar por outro estado de Produtos, uma ação por execução. A dúvida do Ciclo 324 sobre serviços como componentes foi encerrada no Ciclo 352 após confirmar que ERP e app aceitam a mesma classe; preservar as limitações de validação visual autenticada, runtime nativo e persistência remota. A Conciliação permanece exclusiva do ERP.

### Ciclo 327 — componente simples legado com variação virtual — 25/10/2026

**Recorte:** selecionar um produto simples legado sem linha real em `product_variations` para integrar `combo_items` de uma variação composta.

#### Evidência e correção

- [x] O mapper ERP gera uma linha visual `isVirtual: true` com ID composto (`productId_sku-01`) quando o produto legado não tem variação persistida. O autocomplete ERP oferecia essa linha; `handleSelectProduct` gravava seu ID em `combo_items.variationId`.
- [x] O serviço mobile de composição já remove variações virtuais das sugestões reais e, quando só existe esse fallback, oferece o produto pai sem `variationId`. O contrato de domínio mantém `variationId` opcional; a documentação determina identidade estável UUID para variações reais e estoque de componentes simples no pai.
- [x] A consulta ERP de disponibilidade usa `variationId` para procurar uma linha em `product_variations`. Como o ID visual virtual não existe no banco, a referência legada produzia estoque calculado zero apesar de haver saldo no pai. Alinhei a seleção ERP ao app: para `isVirtual`, guarda `undefined` e usa a disponibilidade do produto pai; para variação real, conserva o UUID selecionado. Descrição, preço, estoque inicial do item, quantidade e seleção de variação real permanecem inalterados.
- [x] A revisão confirmou que essa exceção só é usada no fallback legado sem variação persistida; produtos operacionais atuais continuam selecionando a variação real. O estado segue pertencendo ao formulário da variação e passa pelo schema RHF/Zod existente antes de `onSave`.
- [x] Fontes consultadas: `createDefaultVariation`/`mapDbVariations`, `useProductAutocomplete`, `VariationCompositionItemsTab`, `ProductFormCompositionTab`, `searchMobileProductCompositionCandidates`, `applyCompositionAvailability`, persistência ERP/mobile, tipos `ComboItem`/`Variation`, `docs/negocio/produtos/estrutura-produto-variacao.md`, operações de mover/merge, particularidades offline-first, inventários de formulários/paridade, roadmap, `AGENTS.md`, `docs/geral/USER_RULES.md`, regra ERP-only da Conciliação e skill `erp-web-to-mobile-replication`. Não há `AGENTS.md` aninhado nos diretórios deste recorte. A skill não foi encontrada em fonte canônica do projeto; foi consultada somente na cópia de cache registrada anteriormente.

#### Validação e limitações

- [x] Acrescentei regressão RTL que escolhe o produto legado pelo autocomplete, submete o formulário e confirma que o payload retém `productId`, descrição/preço/estoque/quantidade e não envia o ID virtual como `variationId`.
- [x] Vitest permitido via runner ERP: `VariationFormModal.test.tsx` e `mobileProductCompositionService.test.ts` — **2 arquivos, 41/41 testes aprovados**. A suíte mantém mensagens esperadas de timeout/rede em seus casos de erro.
- [ ] Sem Playwright autenticado, aparelho Android/Maestro ou leitura/escrita remota; a regressão de formulário usa os serviços mockados e não comprova recálculo persistido de disponibilidade no banco. Não apliquei migration nem deploy.

**Conclusão do recorte:** ERP e app passam a referenciar o pai para o fallback simples virtual, evitando chave sintética em `combo_items`; referências a variações reais continuam intactas. A auditoria geral permanece aberta.

#### Próximo recorte identificado

Continuar por outra aba/estado de Produtos. A revisão do Ciclo 352 confirmou paridade na elegibilidade de Serviços, sem necessidade de alterar o filtro. Manter abertas as comparações visuais autenticadas, validação nativa e prova de persistência remota; a Conciliação continua exclusiva do ERP.

### Ciclo 328 — preço exibido nas sugestões de componentes — 25/10/2026

**Recorte:** valor exibido para um produto/variação candidata no autocomplete da aba Composição de uma variação.

#### Evidência e correção

- [x] O ERP exibia o primeiro valor truthy nesta ordem: promoção da variação, preço regular da variação, promoção do pai, preço regular do pai, zero. A aba mobile exibia sempre preço regular e o mapper das sugestões descartava os campos promocionais.
- [x] Extraí a precedência de apresentação para `shared-utils/productAutocompleteDisplayPrice.ts`; o ERP e o mobile usam o mesmo helper. O serviço mobile agora preserva os preços promocionais normalizados do produto e da variação na sugestão.
- [x] O `handleAddItem` segue gravando o preço regular (`variationPrice`/`unitPrice`) no `comboItems`; preço promocional afeta somente o texto da sugestão, igual ao contrato atual de seleção do ERP. Busca, elegibilidade de tipos, quantidade, estoque, persistência e estado RHF/Zod do formulário proprietário não mudaram.
- [x] Fontes comparadas: `ProductAutocomplete`, `useProductAutocomplete`, `VariationCompositionItemsTab`, `ProductFormCompositionTab`, `mobileProductCompositionService`, `mobileProductFetchService`, tipos Product/Variation/ComboItem, testes ERP/mobile, schema de busca compartilhado, documentação de estrutura de produtos/variações, operações mover/merge, particularidades mobile offline-first, inventário de formulários, `AGENTS.md`, `docs/geral/USER_RULES.md`, regra de Conciliação ERP-only, inventário e roadmap. Não há `AGENTS.md` aninhado nos diretórios-fonte; a skill de replicação segue disponível apenas na cópia de cache do backup ERP, não tratada como fonte canônica.

#### Validação e limitações

- [x] Vitest focado pelo runner ERP: helper compartilhado, sugestão visual ERP e serviço mobile — **3 arquivos, 10/10 testes aprovados**. Os testes cobrem precedência, fallback de zero, renderização da promoção e preservação dos valores no candidato.
- [x] `git diff --check` não apontou erros de whitespace; exibiu apenas avisos de normalização CRLF já comuns na árvore de trabalho.
- [ ] ESLint direcionado não iniciou: o executável encontrado é ESLint 10, mas o projeto não tem `eslint.config.*` compatível (`.eslintrc` legado); comando encerrou com código 1 antes de analisar os arquivos. O TypeScript ERP local não concluiu em aproximadamente um minuto e foi interrompido sem emitir diagnósticos. Sem Playwright autenticado, runtime Android/Maestro ou prova de persistência remota; não houve chamadas ou gravações externas.

**Conclusão do recorte:** a lista de candidatos de composição no mobile agora mostra a mesma escolha de preço promocional do ERP, sem alterar o valor regular usado para compor o item. A auditoria permanece aberta.

#### Próximo recorte identificado

Continuar em outra aba/estado de Produtos. A hipótese do Ciclo 324 sobre serviços como componentes foi encerrada no Ciclo 352: os clientes aceitam a mesma classe de candidatos. Preservar limitações de UI autenticada, validação nativa e prova remota; a Conciliação continua exclusiva do ERP.

### Ciclo 329 — conversão de família salva em produto simples — 25/10/2026

**Recorte:** remover uma das duas variações de um produto salvo e verificar a transição da variação restante para produto simples.

#### Decisão e evidência

- [x] O usuário escolheu alinhar ERP e app à documentação vigente. `estrutura-produto-variacao.md` determina que, quando restar uma variação operacional, nome, preços, descrição, dimensões e imagens voltam a herdar do pai; a interface reativa a sincronização.
- [x] O helper compartilhado `inheritSimpleProductVariationFromParent` aplica nome/títulos, preços, descrição, condição/fiscal, dimensões, custos acessórios e imagens do pai, e reativa as flags de herança. IDs e SKU da variação sobrevivente são preservados pelo spread de seus dados.
- [x] Como a documentação não define estoque como campo herdado e atributos existentes devem continuar preservados, os dois clientes passam `preserveVariationStock: true` e `preserveVariationAttributes: true` para produto salvo. Isso evita alteração implícita de saldo ou exclusão dos atributos da variação que sobrevive; não equivale a uma movimentação de estoque.
- [x] ERP `useProductFormVariations.removeVariation` reativa a herança após reduzir para uma linha; o caminho de exclusão física bem-sucedida em `useProductFormModal` também remapeia a linha restante com as mesmas opções. O mobile `ProductFormVariationsTab.handleRemove` só confirma a conversão após a verificação de histórico e usa o wrapper `inheritMobileSimpleVariationFromParent`, que delega ao mesmo helper compartilhado; em seguida define `hasVariations: false`.
- [x] A cobertura de domínio mobile e do hook ERP já confirma o comportamento com pai em saldo 12 e variação sobrevivente em saldo 7, além da preservação dos atributos, UUID/SKU, herança de preços/campos comerciais e reativação das flags. O código existente atende à escolha do usuário; nenhuma nova alteração de produção ou ajuste da documentação foi necessário.
- [x] Fontes consultadas nesta execução: `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `simpleProductVariationInheritance.ts`, `useProductFormVariations.ts`, `useProductFormModal.ts`, `ProductFormVariationsTab.tsx`, `productVariationParentSync.ts` e testes de herança ERP/mobile; `AGENTS.md`, `docs/geral/USER_RULES.md`, regras pertinentes, skill de replicação, inventário e roadmap. A skill do projeto continua localizada apenas no cache de build do ERP; não foi tratada como fonte canônica.

#### Validação e limitações

- [x] Vitest focado pelo runner permitido, nos quatro arquivos ERP/mobile do helper, remoção e persistência: **4 arquivos, 83/83 testes aprovados** (resultado registrado nesta execução antes da atualização documental).
- [ ] A comparação foi estática nos caminhos de UI; sem Playwright autenticado nem aparelho Android/Maestro. A exclusão física e a persistência completa dessa conversão não foram executadas contra backend remoto; nenhum dado ou serviço externo foi alterado. Expo Web não comprovaria o comportamento nativo.

**Conclusão do recorte:** a transição 2→1 reativa a herança documentada nos dois clientes sem mudar saldo físico nem remover atributos, como confirmado pelo usuário. Não há diferença funcional comprovada que exija correção neste recorte; a auditoria geral permanece aberta.

#### Próximo recorte identificado

Continuar em outro estado do módulo Produtos. A hipótese do Ciclo 324 sobre serviços como componentes foi encerrada por evidência no Ciclo 352; manter as validações visuais autenticadas/nativas e as provas remotas já registradas; não reabrir a Conciliação de Produtos, exclusiva do ERP.

### Ciclo 330 — remoção de componente na aba móvel de Composição — 25/10/2026

**Recorte:** selecionar **Remover Item** em uma linha de `comboItems` da aba de Composição de uma variação, sem remover o pai, a variação ou alterar saldo físico.

#### Evidência e cobertura

- [x] A revisão anterior (Ciclo 326) confirmou que ERP `VariationCompositionItemsTab.handleRemoveItem` e app `ProductFormCompositionTab.handleRemove` retiram somente a linha selecionada. O app também limpa buffers temporários de quantidade indexados por posição antes da reindexação; ambos atualizam o estado pertencente ao formulário da variação.
- [x] Acrescentei `mobile/src/features/products/modals/tabs/ProductFormCompositionTab.test.tsx`: renderiza a aba com primitives React Native mockadas, aciona o callback da segunda linha e aplica o updater recebido pelo proprietário; o estado resultante conserva a primeira linha e remove apenas a segunda.
- [x] Reexecutei o teste ERP `VariationFormModal.test.tsx`. A regressão já cobre a interação **Remover Item** pelo formulário real de variação e confirma que a linha restante é submetida com sua quantidade editada, sem chamadas de mutação fora do teste.
- [x] O formulário não ganhou um proprietário/submissão paralelos: `ProductFormScreen` segue responsável pelo estado e pela validação RHF/Zod do produto; a aba de composição só propõe atualizações em `comboItems`, conforme a cobertura de formulário registrada no inventário de migração.
- [x] Regras e fontes consultadas: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, skill `erp-web-to-mobile-replication` (somente cópia de cache ERP localizada; não tratada como fonte canônica), `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, inventário de formulários e roadmap. Não foi localizado `AGENTS.md` aninhado nos diretórios ERP/mobile/shared-utils/docs deste recorte.

#### Validação e limites

- [x] Vitest mobile pelo runner permitido: teste de componente `ProductFormCompositionTab.test.tsx` — **1/1** aprovado.
- [x] Vitest ERP pelo runner permitido: `VariationFormModal.test.tsx` — **37/37** aprovados, incluindo remoção de linha e salvamento da linha restante.
- [x] `git diff --check` sem erros de whitespace; avisos de CRLF/LF podem ocorrer nos arquivos já modificados.
- [ ] O teste mobile chama o callback capturado num renderer de teste com componentes nativos mockados; não comprova toque/gesto, blur ou re-render em telefone. Sem Playwright autenticado nem Android físico/Maestro; nenhuma persistência remota, consulta/escrita externa, migration ou deploy foi feita. Expo Web não comprovaria o gesto nativo.

**Conclusão do recorte:** a ação móvel agora possui cobertura explícita para escopo da remoção; o comportamento funcional continua alinhado ao ERP e não precisou de correção de produção. A auditoria geral permanece aberta.

#### Próximo recorte identificado

Continuar em outro estado de Produtos. A elegibilidade de Serviços foi confirmada equivalente entre os clientes no Ciclo 352; não há ajuste de filtro pendente. Seguem pendentes a inspeção visual autenticada e as provas nativas/remotas registradas, sem reintroduzir a Conciliação no aplicativo.

### Ciclo 331 — visibilidade de atributos na geração em lote — 25/10/2026

**Recorte:** modal de geração cartesiana da aba Variações: formar os nomes automáticos das linhas recém-geradas respeitando `showName`.

#### Evidência e correção

- [x] A documentação vigente define `showName: false` como atributo que permanece disponível para filtro/regra, mas cujo **valor não entra no nome automático**; ausência do campo equivale a `true`.
- [x] ERP e app mantinham todos os valores no nome criado em lote, embora a edição normal de nomes e os cards já omitam valores explicitamente ocultos. O teste mobile existente inclusive esperava “Camiseta Azul P” com `Tamanho.showName=false`, contradizendo o contrato documentado.
- [x] Extraí `getVariationNameAttributeValues` para `shared-utils/productVariationNameValidation.ts`; a finalização compartilhada, a projeção de nomes do ERP e ambos os geradores em lote reutilizam a mesma regra. O valor oculto continua em `attributes` com `showName:false`; só deixa de compor `name`.
- [x] A seleção cartesiana, os valores de atributos, SKUs, identidade UUID, estado inicial, campos técnicos variáveis, submissão RHF/Zod e persistência não foram alterados.
- [x] Fontes consultadas: `AGENTS.md`, `docs/geral/USER_RULES.md`, regra ERP-only da Conciliação, skill de replicação (encontrada apenas no cache de build do ERP; sem versão canônica atual em `.agents/skills`/`skills`), estrutura de produto/variação, operações mover/merge, inventário de formulários e roadmap, `CartesianVariationModal`, `buildBulkVariations`, `variationFormDefaults`, `variationFormSubmitRules`, `ProductVariationGenerationModal`, `ProductFormVariationsTab`, esquemas Zod, helper compartilhado e testes ERP/mobile. Não foi encontrado `AGENTS.md` aninhado nos diretórios deste recorte.

#### Validação e limites

- [x] Vitest focado: ERP `variationGenerationRules.test.ts` + `variationNaming.test.ts` **11/11**, `variationFormDefaults.test.ts` **8/8**; mobile `mobileProductVariationGeneration.test.ts` + `productVariationName.test.ts` **20/20**. Total do recorte: **39/39**.
- [x] `git diff --check` sem erros de whitespace; apenas avisos de normalização CRLF/LF. `tsc` global do mobile saiu com 15 diagnósticos de outros módulos/infraestrutura; o `tsc` global do ERP saiu não-zero com muitos diagnósticos preexistentes e saída truncada, portanto não serve como validação limpa do repositório. Os Vitest focados transpilaram e passaram.
- [ ] Sem Playwright autenticado ou runtime Android/Maestro nesta execução. A correção é da transformação de domínio; nenhuma consulta/escrita remota, migration ou deploy foi realizada. Expo Web não comprova o comportamento nativo.

**Conclusão do recorte:** os dois geradores passam a respeitar a regra de visibilidade já usada pelo restante do domínio, preservando todos os atributos. A auditoria geral permanece aberta.

### Ciclo 332 — rótulo do controle de visibilidade no gerador — 25/10/2026

**Recorte:** controle que define se o valor de uma característica aparece no nome automático, no modal ERP e no modal nativo do app.

#### Evidência e correção

- [x] O contrato documentado em `estrutura-produto-variacao.md` é sobre incluir ou ocultar o **valor** no nome automático. No mobile, “Com rótulo”/“Só valor” descrevia uma semântica diferente; no ERP, “Mostrar Nome”/“Ocultar Nome” não especificava que se referia ao valor da característica.
- [x] Os dois modais agora mostram `Valor no Nome` ou `Valor Oculto`; o tooltip ERP e o rótulo de acessibilidade mobile descrevem que o valor está exibido/oculto no nome automático. A seleção, `showName`, atributos persistidos, geração, validação RHF/Zod e payload permanecem iguais.
- [x] Fontes consultadas: `AGENTS.md`, `docs/geral/USER_RULES.md`, regra ERP-only da Conciliação, skill de replicação (somente cópia de cache no backup de build, sem fonte canônica atual), documentação de estrutura produto/variação e mover/merge, inventário de formulários, roadmap, `CartesianVariationModal`, `ProductVariationGenerationModal` e helper compartilhado. Não há `AGENTS.md` aninhado nos diretórios envolvidos.

#### Validação e limites

- [x] Revisão estática dos rótulos nos dois componentes e `git diff --check` dos arquivos deste recorte passaram (exit code 0; Git avisou somente sobre normalização CRLF/LF). Nenhum teste de lógica foi executado porque não houve mudança de comportamento.
- [ ] Não houve autenticação Playwright porque o inventário ainda registra possível limpeza automática de rascunhos ao abrir o Dashboard (Ciclo 182). Não há dispositivo Android/Maestro disponível nesta sessão; nenhuma alteração remota, migration ou deploy foi feita. A renderização de Expo Web não comprovaria o texto no runtime nativo.

**Conclusão do recorte:** a UI passa a descrever o efeito documentado do controle nos dois clientes, sem alterar comportamento ou dados. A auditoria geral permanece aberta.

### Ciclo 333 — estado de gravação no cadastro de tipo de produto — 25/10/2026

**Recorte:** adicionar um tipo de produto na tela nativa de Configurações de Produto.

#### Evidência e correção

- [x] O ERP ativo (`ProductTypes/Index.tsx`) separa `fetching` da lista de `loading` da mutação; durante a inclusão, desativa o botão e troca o ícone por indicador de progresso. O modal ERP legado apresenta o mesmo estado, embora não tenha callsites ativos localizados.
- [x] O mobile já submetia `catalogNameFormSchema` pelo `useZodForm.validateAndRun` real e o serviço normalizava o nome antes do mesmo `INSERT` em `product_types`. Contudo, durante o I/O o botão continuava com ícone de adicionar e sem estado acessível de ocupado. `validateAndRun` já bloqueia uma segunda submissão, mas essa proteção não dava feedback ao operador.
- [x] Acrescentei estado `saving` independente do carregamento da lista. A ação agora fica desativada enquanto a inserção e atualização da lista terminam, mostra `ActivityIndicator` e expõe `busy`/nome acessível; em falha, `finally` restaura o botão e o alerta existente continua responsável pelo erro. Validação Zod, normalização, serviço, payload, permissões e confirmação de exclusão não foram alterados.
- [x] O ERP emite toast de sucesso; o app, após resposta bem-sucedida, limpa o campo e atualiza a lista. Mantive essa confirmação não modal própria do app: `Alert` seria bloqueante e não há componente de toast móvel compartilhado. A limpeza do campo e a lista atualizada comunicam o resultado sem interromper a tarefa.
- [x] Fontes comparadas antes da alteração: `ProductTypes/Index.tsx`, `productCatalogMetadataService.ts`, `ProductTypeManagementModal.tsx`, `ProductTypesManagerModal.tsx`, `ProductConfigModal.tsx`, `NativeProductsScreen.tsx`, `mobileProductTypeService.ts`, `useZodForm.ts` e `catalogNameFormSchema`. Regras/docs consultadas: `AGENTS.md` (RHF/Zod e runners), `docs/geral/USER_RULES.md`, regra `product-reconciliation-erp-only.yml`, estrutura de produto/variação, operações mover/merge, nota offline-first, inventários de produtos/formulários e roadmap. Não há `AGENTS.md` aninhado no caminho. A skill de replicação permanece disponível apenas na cópia de cache do backup `.vercel`; não foi tratada como fonte canônica.

#### Validação e limites

- [x] Revisão estática confirmou que `saving` é ativado somente depois da validação do resolver e é sempre limpo no `finally`; a lista mantém seu estado `loading` separado.
- [ ] A tentativa de Vitest/RTL não coletou: com `jsdom`, a dependência `canvas.node` está ausente; usando o `happy-dom` já instalado, o módulo `@testing-library/react` não resolve a partir do pacote mobile. Removi o teste temporário não executado; nenhuma dependência ou configuração de runner foi alterada. Não há teste focado aprovado neste ciclo.
- [ ] Sem Playwright autenticado (o inventário registra risco de limpeza de rascunhos ao abrir o Dashboard no Ciclo 182) e sem dispositivo físico/Maestro disponível. Não houve consulta ou escrita remota, alteração de migration ou deploy; mocks/checagem estática não comprovam a persistência do cadastro. Expo Web não comprovaria o comportamento nativo.
- [x] `git diff --check` dos arquivos do recorte passou (exit code 0; avisos de normalização CRLF/LF apenas nos arquivos históricos já em estado modificado).

**Conclusão do recorte:** o botão mobile agora comunica e bloqueia a gravação em andamento, seguindo o estado equivalente do ERP sem duplicar regras ou mudar o contrato de cadastro. A auditoria geral permanece aberta.

### Ciclo 334 — bloquear mudanças no modal de categoria durante o salvamento — 25/10/2026

**Recorte:** criação/edição de Categoria ou Ambiente, enquanto `useCategoryFormModal` aguarda o serviço assíncrono.

#### Evidência e correção

- [x] O modal ERP ativo (`erp/src/pages/App/Products/Categories/modals/CategoryEnvironmentModal.tsx`) desativa o campo de nome e as caixas de seleção de vínculos enquanto `isSubmitting` está ativo.
- [x] O proprietário mobile (`mobile/src/features/products/categories/hooks/useCategoryFormModal.ts`) primeiro executa `catalogNameFormSchema` e `categoryAttributeSelectionsSchema` por `useZodForm.validateAndRun`; somente então ativa `isSubmitting`, chama o mesmo serviço de domínio móvel e aguarda o refresh. Antes do ajuste, o `TextInput` de nome e as linhas de `CategoryLinksPicker` ainda aceitavam alteração durante esse I/O, embora atributos, cancelar e salvar já fossem bloqueados.
- [x] Alinhei os controles móveis: o nome recebe `editable={!isSubmitting}` e opacidade reduzida, e `CategoryLinksPicker` recebe `disabled={isSubmitting}`. As linhas nativas passam a usar `disabled`, estado de acessibilidade `checked`/`disabled` e apresentação atenuada. O modo não desativado continua sendo o padrão reutilizável do picker.
- [x] O formulário e o hook proprietário não mudaram; schema, parse, validação, serviço, efeitos e payload permanecem iguais. Nenhuma regra compartilhada de negócio precisava de alteração, pois a diferença é interação de plataforma durante uma gravação.
- [x] Fontes consultadas: `AGENTS.md` (formulários RHF/Zod e runners permitidos), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, skill `erp-web-to-mobile-replication` (localizada somente na cópia de cache dentro do backup `.vercel`; não foi considerada fonte canônica), `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/mobile/arquitetura_offline_first.md`, inventários de paridade/formulários e roadmap. Confirmado que o picker ativo tem apenas este callsite e que não há `AGENTS.md` aninhado no caminho.

#### Validação e limites

- [x] Vitest mobile focado `CategoryLinksPicker.test.tsx`: **2/2** aprovados; cobre estado desativado/acessível durante save e estado disponível fora do save, com primitives React Native mockadas.
- [x] Revisão estática confirmou que o nome fica não editável, os vínculos ficam desativados e o estado é limpo no `finally` do proprietário. `git diff --check` sem erros no recorte; avisos de normalização CRLF/LF podem ocorrer em arquivos existentes.
- [x] `tsc --noEmit -p mobile/tsconfig.json` não concluiu limpo por diagnósticos existentes em `DistanceInput.tsx`, `MeasurementInput.tsx`, `useAgendaData.ts`, hooks de inventário, `InventoryMoveEditModalContent.tsx`, `financialAiAssistantService.ts`, configuração Vitest e `shared-utils/commercialScheduling`; nenhum diagnóstico apontou os arquivos alterados neste ciclo.
- [ ] Sem Playwright autenticado: a abertura do Dashboard ainda tem o risco documentado de limpar rascunhos. Sem aparelho Android físico/Maestro disponível; a prova com primitives mockadas não confirma gestos, leitor de tela ou rendering nativo. Não houve leitura/escrita remota, migration ou deploy; Expo Web não comprova comportamento nativo.

**Conclusão do recorte:** durante a gravação, o operador não consegue alterar localmente nome/vínculos diferentes do snapshot já submetido; os controles correspondem ao bloqueio do ERP sem alterar a operação de negócio. A auditoria geral permanece aberta.

### Ciclo 335 — busca de categorias com espaços nas extremidades — 25/10/2026

**Achado registrado antes da correção:** `CategoriesListSection` do ERP só usa `searchTerm.trim()` para decidir se há termo, mas compara com `searchTerm.toLowerCase()` sem remover espaços. O app recebe o mesmo texto bruto de `MobileCategoriesHeader`, porém `filterCategories` removia os espaços antes da comparação; assim, a busca com espaços antes/depois do nome localiza a categoria apenas no mobile. Não foi encontrada regra de domínio ou particularidade documentada que justifique essa divergência. A busca da lista é local, e a arquitetura online-first de cadastro/edição não muda esse escopo.

**Decisão de execução:** conforme a instrução permanente para divergências sem justificativa documentada, alinhar o app ao comportamento vigente do ERP; não mudar o ERP nem ampliar para a busca de Ambientes, cujo código já compara o termo bruto nos dois clientes. Preservar o guard existente para termo vazio/composto só de espaços. Antes da alteração foram comparados o ERP ativo, o helper e teste mobile, o estado bruto da busca nos dois headers e a ausência de um helper de filtro compartilhado aplicável.

#### Evidência e correção

- [x] `filterCategories` agora compara com `searchTerm.toLowerCase()` depois do mesmo guard por `searchTerm.trim()` usado no ERP. A regressão cobre termo simples correspondente, o mesmo termo cercado por espaços sem correspondência e termo só de espaços sem filtro; filtros de vínculo, estado de busca, serviços e payloads não mudaram.
- [x] Não foi encontrado helper compartilhado de busca de categorias nos módulos compartilhados; mantive a adaptação mínima no helper já proprietário da lista mobile, sem refatoração transversal do ERP.
- [x] Fontes conferidas antes da edição: `AGENTS.md` (validação RHF/Zod e runner Vitest permitido), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, skill de replicação (somente cópia de cache dentro de backup `.vercel` disponível; não é fonte canônica), `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/mobile/arquitetura_offline_first.md`, `docs/produtos/auditoria-arquitetura-organizacao-produtos.md`, inventários de paridade/formulários e roadmap. Não há `AGENTS.md` aninhado em `mobile/src/features/products/categories/domain/`.

#### Validação e limites

- [x] Vitest mobile do diretório `categories/domain`: **48/48** em três arquivos (`categoryEnvironmentRules`, seleção de atributos e serviços).
- [x] `git diff --check` sem erros nos arquivos do recorte; apenas avisos de normalização CRLF/LF em arquivos já modificados.
- [x] `tsc --noEmit -p mobile/tsconfig.json` continua com **10 diagnósticos globais fora do recorte** (inputs de medidas, agenda, inventário, movimentação de estoque, assistente financeiro, configuração Vitest e tipos de agendamento compartilhados); nenhum diagnóstico apontou `categoryEnvironmentRules.ts` ou seu teste.
- [ ] Sem Playwright autenticado: o risco documentado de limpeza de rascunhos ao abrir Dashboard permanece. Sem telefone físico/Maestro; nenhuma leitura/escrita remota, migration ou deploy. Expo Web não comprova a busca no runtime nativo.

**Conclusão do recorte:** a busca local de categorias no mobile agora tem a mesma comparação case-insensitive com texto bruto do ERP para entradas com espaços externos; o guard de texto vazio continua preservado. A auditoria geral permanece aberta.

### Ciclo 336 — estado vazio e sem resultados de Categorias e Ambientes — 25/10/2026

**Recorte:** feedback das listas de Categoria e Ambiente quando os dados estão vazios ou a busca/filtro não retorna itens.

#### Evidência e conclusão

- [x] `CategoriesListSection` ERP apresenta a mesma linha genérica “Nenhuma categoria encontrada.” tanto no estado inicial sem registros quanto quando busca/filtro não encontra itens. `EnvironmentsTable` ERP diferencia “Nenhum ambiente cadastrado” da busca sem correspondência e oferece a orientação “Tente buscar por outro termo ou limpe a busca.”; quando vazio, orienta criar pelo botão acima.
- [x] `MobileCategoriesList` mantém o título “Nenhuma categoria encontrada”, mas contextualiza a recuperação: sugere outro termo/ajuste do filtro ou orienta tocar em “Categoria” para criar. `MobileEnvironmentsList` separa explicitamente busca sem resultados e lista sem cadastro, preserva a orientação de limpar/refazer a busca e traduz a ação de criação para o botão mobile.
- [x] A diferença é apenas feedback de apresentação: filtro e busca continuam locais sobre as mesmas coleções carregadas, e os textos não mudam cadastro, vínculos, contagens ou serviços. Mantive a adaptação nativa com ícone/card e instrução de toque; a lista ERP permanece como referência de regra e mantém a ação de criar disponível no cabeçalho.
- [x] Registrei esta particularidade mobile no inventário persistente como exceção de apresentação justificada, em vez de remover orientação contextual sem alterar qualquer contrato funcional. Nenhuma alteração de código foi necessária.
- [x] Fontes comparadas: `CategoriesListSection.tsx`, `EnvironmentsTable.tsx`, `MobileCategoriesList.tsx`, `MobileEnvironmentsList.tsx`, `MobileCategoriesHeader.tsx`, `NativeCategoriesScreen.tsx` e `filterCategories`/`filterEnvironments`; regras e referências: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, skill de replicação (somente cópia de cache localizada em backup `.vercel`), `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/mobile/arquitetura_offline_first.md`, `docs/produtos/auditoria-arquitetura-organizacao-produtos.md`, inventário e roadmap. Não há `AGENTS.md` aninhado nos caminhos consultados.

#### Validação e limites

- [x] Revisão estática confirmou os ramos de lista vazia versus busca/filtro sem resultado nos quatro componentes. Não executei testes: não houve mudança de lógica ou de código.
- [x] `git diff --check` sem erros no registro; avisos de CRLF/LF são apenas de normalização dos arquivos históricos já modificados.
- [ ] Sem Playwright autenticado, devido ao risco documentado de limpeza de rascunhos ao abrir Dashboard; sem aparelho físico/Maestro. A inspeção de JSX prova as mensagens condicionais, mas não layout/legibilidade visual ou leitor de tela nativo. Nenhuma consulta/escrita remota, migration ou deploy; Expo Web não comprova runtime nativo.

**Conclusão do recorte:** estados de dados vazios e ausência de correspondência estão funcionalmente alinhados; as instruções extras do app são mantidas como adaptação mobile de apresentação e recuperação, sem diferença de domínio. A auditoria geral permanece aberta.

#### Próximo recorte identificado

Na aba Por ambiente, comparar o gesto de pull-to-refresh como affordance mobile exclusiva; manter pendente a validação visual autenticada e Android/Maestro.

### Ciclo 337 — busca de Ambiente por nome e categoria vinculada — 25/10/2026

**Achado registrado antes da alteração:** `EnvironmentsTable` (ERP) e `MobileEnvironmentsList` filtram com a mesma condição: termo vazio/só espaços preserva a coleção, termo não vazio é comparado sem diferenciar maiúsculas, usa o texto bruto e inclui o ambiente quando o nome dele ou de uma categoria vinculada coincide. Os dois serviços projetam os mesmos IDs filhos por `category_relationships.parent_id`. Portanto não havia diferença de comportamento no estado ativo. Contudo, `filterEnvironments` no domínio mobile não tem callsite de produção, remove espaços do termo e não consulta categorias vinculadas; o teste existente verificava apenas esse helper isolado, não o filtro usado pela tela.

**Decisão de execução:** registrar o falso sinal de cobertura e consolidar o filtro puro existente nas telas ERP e mobile em uma função compartilhada, mantendo exatamente o comportamento ativo já estabelecido pelo ERP. Não alterar consultas, relações, payloads, busca por Categoria, instruções de estados vazios ou a exceção de Conciliação ERP-only.

#### Evidência e correção

- [x] Extraí a regra ativa para `shared-utils/categoryEnvironmentSearch.ts`; `EnvironmentsTable` do ERP e `MobileEnvironmentsList` agora chamam a mesma função. Para termo vazio ou só espaços, a lista original é preservada; termos não vazios continuam case-insensitive, sem trim, e correspondem ao ambiente ou a uma categoria vinculada pelo ID. Consultar categorias para a correspondência não liga categorias órfãs a ambientes.
- [x] Removi `filterEnvironments` do domínio mobile porque não tinha callsites de produção e divergiam da tela; substituí o teste enganoso, que exercitava apenas esse helper, por cinco casos do helper efetivamente usado: termo vazio, whitespace-only, nome do ambiente, categoria vinculada, órfã e espaços externos. O helper agora é verificado pela mesma função consumida nos dois clientes.
- [x] Antes da alteração, conferi `AGENTS.md` raiz e as regras de formulário/testes, `docs/geral/USER_RULES.md`, a regra `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, a documentação offline-first e os inventários de Produtos/formulários/roadmap. Não há `AGENTS.md` aninhado nos caminhos tocados. A skill de replicação só foi localizada em cópia de cache no backup `.vercel`; usada como orientação de procedimento, não tratada como fonte canônica.

#### Validação e limites

- [x] Vitest mobile, diretório de domínio `categories`: **52/52** em 4 arquivos (inclui os 5 novos cenários da função compartilhada).
- [x] `git diff --check` dos arquivos do ciclo: exit code 0; apenas avisos de normalização CRLF/LF. Os caminhos relativos ERP e mobile foram resolvidos para o helper compartilhado.
- [x] `rg` não encontrou chamadas restantes a `filterEnvironments(`; as telas usam `filterEnvironmentsBySearch`.
- [ ] `npx tsc --noEmit -p mobile/tsconfig.json` continua sem conclusão limpa (exit 1), com diagnósticos fora dos arquivos deste ciclo: `e2e/categories-characteristics.spec.ts` (`node:crypto`); `DistanceInput.tsx` e `MeasurementInput.tsx` (`typingMode`); `useFinancialAiChat.ts` (inferência/retorno implícito); `CreateEventModal.tsx` (tipo possivelmente `undefined`); `useAgendaData.ts` (argumento ausente); `inventoryOutboxSync.ts` (`data` em `never`); `InvoicesScreenContent.tsx` (string nullable); `financialAiAssistantService.ts` (campo `role`); `vitest.config.ts` (módulo `vitest/config`); e dois diagnósticos em `shared-utils/commercialScheduling` (`period` e resolução de `Shipping.type`). O diagnóstico inicial do caminho mobile incorreto foi corrigido; a nova execução não apontou os arquivos alterados.
- [ ] No diretório `erp`, `npx tsc --noEmit -p tsconfig.json --pretty false` foi iniciado, mas não produziu saída por mais de dois minutos; encerrei o processo como inconclusivo. A resolução do caminho relativo ERP foi confirmada diretamente; typecheck completo ERP permanece pendente.
- [ ] Playwright autenticado não executado, devido ao risco já documentado de limpar rascunhos ao abrir o Dashboard; não há dispositivo Android físico/Maestro disponível nesta execução. Nenhum teste de Expo Web foi tratado como prova nativa. Não houve acesso ou gravação em banco remoto, migration ou deploy.

**Conclusão do recorte:** busca ativa de Ambientes equivalente no ERP e no app e agora implementada por uma única função compartilhada; a antiga cobertura unitária falsa foi substituída por cobertura da regra efetiva. Próximo recorte: estados de carregamento, erro/recarga e vazio da lista Por ambiente. A auditoria geral permanece aberta.

### Ciclo 338 — estado de carregamento inicial da aba Por ambiente — 25/10/2026

**Recorte:** estado inicial, antes da primeira resposta de ambientes, categorias e contagens.

#### Evidência da comparação

- [x] ERP (`Categories/Index.tsx`) e mobile (`NativeCategoriesScreen.tsx`) substituem a tela pelo indicador de carregamento enquanto `loading` está ativo; nenhum dos dois permite interagir com a lista antes de todas as três consultas do `Promise.all` terminarem.
- [x] Ambos iniciam a consulta no efeito de montagem e mantêm uma coleção inicial vazia até sucesso. O app mostra o texto “Carregando ambientes e categorias...” sob o `ActivityIndicator`; o ERP mostra o spinner central sem texto. Mantive essa informação explícita no app por clareza da adaptação nativa e pela regra geral do `AGENTS.md` de feedback claro em operações assíncronas. Não é diferença de regra nem justificativa para retirar o texto do mobile.
- [x] Os hooks usam a mesma unidade de carga (ambientes, categorias e contagens) e só desligam `loading` no `finally`; falha inicial e atualização silenciosa ficam fora deste recorte e serão avaliadas separadamente.
- [x] Fontes consultadas antes de registrar: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, skill `erp-web-to-mobile-replication` (só disponível em cópia cache `.vercel`, sem fonte canônica atual), estrutura produto/variação, operação mover/merge, arquitetura offline-first e inventários/roadmap. Não há `AGENTS.md` aninhado nos diretórios de ERP/mobile/`shared-utils` envolvidos.

#### Validação e limites

- [x] Comparação estática dos dois owners (`Index.tsx`/hook ERP e `NativeCategoriesScreen.tsx`/hook mobile); nenhuma mudança de código necessária.
- [ ] Sem Vitest/RTL porque não houve alteração de lógica; Playwright autenticado permanece pendente devido ao risco já registrado de limpeza de rascunhos ao abrir o Dashboard. Sem aparelho físico/Maestro disponível; a inspeção do JSX nativo não é prova de runtime Android/iOS. Nenhum acesso ou escrita remota, migration ou deploy.

**Conclusão do recorte:** estado bloqueante de carregamento inicial equivalente nos dois clientes; texto explicativo do app é uma adaptação de feedback necessária à plataforma e fica preservado. Próximo recorte: falha das consultas no primeiro carregamento da aba Por ambiente. A auditoria geral permanece aberta.

### Ciclo 339 — falha inicial das consultas da aba Por ambiente — 25/10/2026

**Recorte:** erro de consulta no primeiro carregamento, antes de existir conteúdo em memória.

#### Achados registrados antes de decidir manter ou alterar

- [x] `fetchEnvironments` do ERP captura falhas da consulta e retorna `[]`; também captura falhas de rede/exceções e retorna `[]`. Assim, o `Promise.all` do hook ERP conclui como sucesso, não aciona `toast.error` do catch principal e a tela termina mostrando o estado “Nenhum ambiente cadastrado”.
- [x] `fetchMobileEnvironments` propaga tanto erros retornados pelo Supabase quanto exceções. O hook mobile captura a rejeição, abre `Alert.alert('Erro ao carregar', 'Não foi possível carregar as categorias e ambientes.')` e não substitui as coleções; após `finally`, a tela também mostra a apresentação vazia inicial.
- [x] Na leitura das relações `category_relationships`, ERP retorna os ambientes sem suas categorias em caso de erro; mobile propaga a falha e evita renderizar vínculos como se fossem conhecidos. Para consulta principal de `categories`, os dois serviços suprimem o erro e retornam lista vazia; na falha da consulta de relações das categorias, ambos preservam nomes sem relações conhecidas.
- [x] A diferença foi mantida deliberadamente: a regra ativa do `AGENTS.md` exige feedback claro para chamadas assíncronas, e `docs/mobile/arquitetura_offline_first.md` classifica retaguarda/cadastro como online-first estrito. O aviso nativo é mais transparente que a tela ERP, e rejeitar a leitura relacional evita afirmar vínculos possivelmente falsos. Alterar ERP ou enfraquecer o serviço mobile para suprimir o erro não é necessário para paridade segura; o pós-alerta ainda usa o layout vazio compartilhado e fica como limitação visual a reavaliar se houver especificação de um estado de erro dedicado.
- [x] Fontes consultadas antes desta decisão: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, skill `erp-web-to-mobile-replication` (encontrada somente na cópia cache `.vercel`), docs vigentes de estrutura/variação e mover/merge, nota offline-first, inventários de Produtos/formulários e roadmap. Nenhum `AGENTS.md` aninhado nos caminhos ERP/mobile foi encontrado.

#### Validação e limites

- [x] Comparação estática de `categoryService.ts`, `mobileCategoryService.ts`, `useCategoriesAndEnvironments.ts`, `useMobileCategoriesAndEnvironments.ts` e respectivos owners de tela. Nenhuma mudança de código ou contrato foi necessária; sem teste de código.
- [ ] Sem Playwright autenticado para observar a apresentação do toast/alerta, conforme risco documentado de limpeza de rascunhos ao abrir Dashboard; sem aparelho físico/Maestro nesta sessão. Nenhuma consulta remota, escrita, migration ou deploy.

**Conclusão do recorte:** o mobile mantém seu tratamento explícito e mais conservador de falha inicial, especialmente para não inventar estado de relacionamentos; essa diferença está documentada como exceção de resiliência. ERP ainda pode apresentar erro de leitura de ambiente como lista vazia, mas a correção desse comportamento ERP fica fora do ajuste de paridade mobile. Próximo recorte: falha de recarga após mutação bem-sucedida. A auditoria geral permanece aberta.

### Ciclo 340 — falha de recarga após mutação em Por ambiente — 25/10/2026

**Recorte:** leitura de atualização disparada depois de criar/editar/excluir Ambiente ou Categoria e depois de desvincular.

#### Evidência da comparação

- [x] No ERP, os serviços de mutação concluem antes do refresh. O handler mostra `toast.success`, fecha o formulário e chama `loadData(true)`. Se essa leitura falhar, `loadData` captura o erro e exibe `toast.error('Erro ao carregar dados.')`; as listas anteriores permanecem porque `setEnvironments`/`setCategories` só são chamados depois de todo o `Promise.all`.
- [x] No app, `useCategoryFormModal` conclui o serviço, fecha o modal e chama `onSuccess`; o proprietário chama `loadData(true)`. Em falha da leitura, o hook mantém as listas anteriores, mostra `Alert.alert('Erro ao carregar', 'Não foi possível carregar as categorias e ambientes.')` e o `finally` encerra `refreshing`. O alerta identifica falha de leitura, não da mutação já concluída. A tela também usa `RefreshControl`, então o estado do spinner fica visível durante a recarga nativa.
- [x] ERP mantém `refreshing` interno e dispara leituras silenciosas pós-mutação, mas `Index.tsx` não conecta essa flag a um controle visual. A mensagem de sucesso antecede a recarga; no app o fechamento do modal conclui a interação e o `RefreshControl` pode sinalizar a atualização. Preservada a confirmação atual, sem introduzir um `Alert` bloqueante de sucesso nem retirar o feedback de erro.
- [x] É uma adaptação de feedback específica de plataforma, não divergência no resultado de negócio: após leitura bem-sucedida ambos substituem as coleções; após falha ambos preservam os dados em memória. O `AGENTS.md` exige retorno visual claro em operações assíncronas e o app é online-first para cadastro, conforme `docs/mobile/arquitetura_offline_first.md`.
- [x] Fontes consultadas antes do registro: `AGENTS.md`, `docs/geral/USER_RULES.md`, regra `product-reconciliation-erp-only.yml`, skill `erp-web-to-mobile-replication` (somente cópia cache `.vercel` disponível), estrutura de produto/variação, operação mover/merge, offline-first, inventário de paridade e roadmap. Não há `AGENTS.md` aninhado nas áreas consultadas.

#### Validação e limites

- [x] Revisão estática de `useCategoriesAndEnvironments.ts`, `useCategoryFormModal.ts`, `useMobileCategoriesAndEnvironments.ts`, `NativeCategoriesScreen.tsx` e respectivos services; nenhuma alteração de código/contrato necessária.
- [ ] Sem Vitest/RTL porque não houve alteração de código. Sem Playwright autenticado para observar toast/alerta e atualização visual; sem dispositivo físico/Maestro para comprovar RefreshControl Android/iOS. Não houve acesso ou escrita remota, migration ou deploy.

**Conclusão do recorte:** mutação e estado de dados continuam preservados se a leitura pós-mutação falhar; feedback de sucesso/erro é adaptado ao runtime sem alertar que a mutação falhou. Próximo recorte: affordance de pull-to-refresh existente só no app e sua interação com o estado Por ambiente. A auditoria geral permanece aberta.

### Ciclo 341 — pull-to-refresh na aba Por ambiente — 25/10/2026

**Recorte:** gesto nativo de atualização da lista, sem mutação de negócio.

#### Evidência da comparação

- [x] `NativeCategoriesScreen` liga o `RefreshControl` do `ScrollView` a `refresh`; o hook chama `loadData(true)`, que consulta ambientes, categorias e contagens em conjunto. O gesto não altera estado ou payload persistido.
- [x] Enquanto `refreshing` está ativo, o app conserva a lista visível e exibe o indicador próprio do `RefreshControl`; o estado inicial bloqueante não volta a substituir a tela. Em sucesso, todos os dados são atualizados juntos; em falha, os dados anteriores são mantidos, o alerta comunica o erro e o `finally` desliga o indicador.
- [x] `CategoriesHeader`/`Index.tsx` do ERP não expõem botão ou controle equivalente para leitura manual; `refreshing` é interno ao hook e a página somente chama `loadData(true)` depois de mutações. Recarregar o navegador inteiro não é equivalente ao refresh de dados dentro da tela.
- [x] Preservada a affordance adicional mobile: é um padrão nativo de atualização apenas de leitura, útil em uma tela online-first, sem duplicar regra nem substituir a tela ERP. O estado de dados obtido continua sob o mesmo serviço e contrato de consulta.
- [x] Fontes consultadas antes do registro: `AGENTS.md`, `docs/geral/USER_RULES.md`, regra `product-reconciliation-erp-only.yml`, skill `erp-web-to-mobile-replication` (somente cache `.vercel`, sem fonte canônica), estrutura de produto/variação, operações mover/merge, offline-first, inventário e roadmap. Não há `AGENTS.md` aninhado nos caminhos ERP/mobile envolvidos.

#### Validação e limites

- [x] Revisão estática do `RefreshControl`, do callback `refresh` e de `loadData(true)` em mobile, comparada à ausência de acionador manual em `CategoriesHeader`/`Index.tsx` ERP. Nenhuma mudança de código necessária; sem teste Vitest/RTL.
- [ ] Sem Playwright autenticado para o ERP (risco de limpeza de rascunhos já registrado) e sem dispositivo Android físico/Maestro. Expo Web não comprova gesto, indicador ou lifecycle nativos; nenhum refresh remoto, escrita, migration ou deploy realizado.

**Conclusão do recorte:** pull-to-refresh é uma affordance exclusivamente mobile, segura e de leitura; deve permanecer como particularidade de plataforma, sem exigir botão equivalente no ERP. Próximo recorte: filtro de Categorias com/sem Ambiente e persistência ao alternar a aba.

### Ciclo 342 — filtro Sem ambiente e retenção ao alternar a aba — 25/10/2026

**Recorte:** acionador de categorias órfãs, três filtros da lista e retorno de Por categoria para Por ambiente e vice-versa.

#### Evidência da comparação

- [x] ERP e mobile definem órfã como categoria sem `parents` ou com lista vazia; total e subconjunto Sem ambiente usam esse predicado. Com ambiente é o complemento, e Todas mantém a coleção completa. Termo de busca combina com os filtros nas duas telas; normalização do nome e espaços já está registrada no Ciclo 335.
- [x] Ambos exibem contagem/atalho para órfãs somente quando o total é maior que zero. O atalho seleciona Por categoria e solicita `sem_ambiente`. Na entrada pelo atalho, a categoria resultante é a mesma em ambos.
- [x] Divergência de estado registrada antes de decidir: ERP mantém `filterType` local em `CategoriesListSection`; ao alternar para Por ambiente, o componente desmonta e, no retorno, restaura `initialFilter` (controlado pelo estado do hook, normalmente `todas`). Mobile mantém `categoryFilter` no hook e o passa controlado a `MobileCategoriesList`, então uma seleção manual permanece ao alternar as visualizações.
- [x] O estado controlado mobile também mantém responsivo o atalho: depois de visitar Sem ambiente, escolher outro filtro e apertar novamente “Ver categorias”, o app atualiza o filtro para órfãs. No ERP, se o valor parent `initialFilter` já for `sem_ambiente` mas o filtro local tiver sido trocado, repetir o atalho não muda a prop e não força a atualização local. Isso é uma limitação do estado ERP, não um requisito de reproduzir no app.
- [x] Preservada a retenção mobile como diferença de interação justificada: alternar visualizações não perde a seleção manual e o link de pendências leva de volta ao filtro solicitado. A diferença fica registrada como particularidade do app; não alterei nem ERP nem mobile. Os dados/resultados do filtro não divergem para a mesma seleção.
- [x] Fontes conferidas antes do registro: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, skill de replicação (localizada apenas na cópia cache `.vercel`, sem fonte canônica), estrutura de produto/variação, mover/merge, arquitetura offline-first, inventário e roadmap. Nenhum `AGENTS.md` aninhado em ERP/mobile/`shared-utils`.

#### Validação e limites

- [x] Revisão estática de `CategoriesListSection`, `MobileCategoriesList`, `CategoriesHeader`, `MobileCategoriesHeader`, `handleViewOrphans` e `filterCategories`/`getOrphanCategories`; nenhuma mudança de código necessária.
- [ ] Sem teste de código, Playwright autenticado ou dispositivo Android físico/Maestro nesta execução; comparação das transições foi derivada dos proprietários e ciclos de montagem do React. Nenhuma consulta/escrita remota, migration ou deploy.

**Conclusão do recorte:** predicados, totais e filtro órfão são equivalentes; o mobile preserva a seleção ao alternar visualizações e tem atalho mais responsivo no caso citado. Esta retenção é mantida como adaptação documentada. Próximo recorte: seleção e lista de Categorias — contagem/produtos vinculados e associações exibidas. A auditoria geral permanece aberta.

### Ciclo 343 — contagem de produtos e ambientes associados por Categoria — 25/10/2026

**Recorte:** origem da contagem de produtos vinculados, apresentação do total no card/linha de Categoria e resolução visual dos Ambientes associados.

#### Evidência da comparação

- [x] No caminho de sucesso, `fetchCategoryProductCounts` (ERP) e `fetchMobileCategoryProductCounts` consultam as mesmas fontes: `product_categories(category_id, product_id)` e `products(id, category_id)` para `category_id` não nulo. Ambos unem as fontes em um `Set` por categoria e produto, então uma mesma associação presente na relação N:N e no campo primário conta uma vez; ambos aplicam `productCount || 0` ao montar os nós. O formato e os valores apresentados (0 produtos, 1 produto e N produtos) são equivalentes.
- [x] As duas listas derivam os nomes associados pelas relações `category_relationships(parent_id, child_id)`: ERP projeta os filhos em `EnvironmentNode.categories`; mobile projeta `categoryIds` no serviço e o hook adapta esse campo para `EnvironmentNode.categories`. As telas fazem lookup por ID, exibem o nome do Ambiente e sinalizam quando a Categoria não tem Ambiente. No caso de falha da leitura relacional, as diferenças de erro/fallback já estão cobertas no Ciclo 339; este recorte não altera esses contratos.
- [x] Apresentação responsiva ERP limita os nomes visíveis aos três primeiros e indica `+N`, com os demais nomes em atributo `title`; a tela nativa mobile mostra todos os nomes como chips, sem truncar a associação. Mantive a lista completa no app: ela evita esconder vínculos sem oferecer tooltip nativo e preserva descoberta pelo toque/leitura, enquanto a quebra de linha é controlada pelo layout nativo. A diferença é apenas de apresentação, sem alteração da associação persistida.
- [x] Os textos para Categoria órfã são “Sem ambiente” no ERP e “Sem ambiente vinculado” no mobile; o segundo explicita o sentido do badge, sem mudar o predicado, que foi comparado no Ciclo 342.
- [x] Há uma diferença de compatibilidade no conjunto de Categorias exibido: `fetchCategories` no ERP consulta apenas `type = 'category'`; `fetchMobileCategories` consulta todos os registros e exclui apenas `type = 'environment'` via `isProductCategoryOption`. A função compartilhada e testes existentes tratam tipos ausentes/nulos como opções legadas (incluindo teste no serviço mobile e teste do serviço de opções ERP). Preservei esse suporte no mobile, registrando a diferença aqui em vez de ocultar cadastros legados sem evidência de saneamento; a presença desses registros no banco operacional não foi consultada.
- [x] Não encontrei divergência de contagem nem perda de vínculos no caminho carregado com sucesso que justificasse alterar o serviço. Nenhum código de produção foi alterado neste ciclo.
- [x] Fontes conferidas antes do registro: `AGENTS.md` (incluindo a regra de formulários RHF/Zod, runners e Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/mobile/arquitetura_offline_first.md`, inventário e roadmap. Não há `AGENTS.md` aninhado nos caminhos ERP/mobile/`shared-utils`. A fonte canônica da skill `erp-web-to-mobile-replication` não existe em `.agents/skills` nem em `skills/`; como anotado nos ciclos anteriores, a única cópia acessível é o backup de cache `.vercel` e permanece limitada a orientação.

#### Validação e limites

- [x] Comparação estática de `categoryService.ts`, `mobileCategoryService.ts`, `useCategoriesAndEnvironments.ts`, `useMobileCategoriesAndEnvironments.ts`, `CategoriesListSection.tsx` e `MobileCategoriesList.tsx`, incluindo os testes existentes de categorias legadas e deduplicação de contagem. Nenhuma alteração de lógica/código foi feita; não executei testes.
- [ ] Sem Playwright autenticado para observar a apresentação do ERP: abrir o Dashboard mantém o risco documentado de limpar rascunhos. Sem aparelho Android físico/Maestro para conferir chips e leitura no runtime nativo; Expo Web não comprovaria esse comportamento. Não consultei nem gravei dados remotos, não apliquei migration e não fiz deploy.

**Conclusão do recorte:** no estado de sucesso, contagem e relações Categoria–Ambiente são equivalentes. O app conserva todos os nomes e oferece compatibilidade adicional com categorias legadas sem tipo; ambas ficam registradas como particularidades de apresentação/compatibilidade, não como diferença a remover sem prova de domínio em contrário. Próximo recorte: confirmar o bloqueio de exclusão de Categoria quando a contagem de produtos vinculados é positiva. A auditoria geral permanece aberta.

### Ciclo 344 — bloqueio de exclusão de Categoria em uso — 25/10/2026

**Recorte:** estado preventivo da ação na lista e no modal de edição, revalidação no serviço e mensagem quando os vínculos diretos e N:N apontam para o mesmo produto.

#### Divergência registrada antes da correção

- [x] A contagem exibida e usada na guarda visual vem da deduplicação entre `product_categories` e `products.category_id` (Ciclo 343). O ERP também deduplica a mensagem do serviço: após as contagens `head`, lê os IDs dos dois vínculos e une os IDs em um `Set`.
- [x] `deleteMobileCategory` já mantém guarda de servidor e valida `error` em ambas as consultas de contagem, falhando fechado; porém sua mensagem soma os totais brutos de `product_categories` e `products`. Se o mesmo produto tiver as duas referências, a exclusão continua bloqueada mas a mensagem mobile pode superestimar o total mostrado na tela. A suíte atual testa os totais independentes e não esse cruzamento.
- [x] No ERP, lista e modal usam `SecureDeleteButton` realmente desabilitado quando o snapshot tem contagem positiva; no mobile, lista e modal chamam `canDeleteCategory`, exibem um `Alert` de bloqueio no toque e a operação volta a validar o estado atual no serviço. O toque com alerta é adaptação nativa; não será convertido em botão inerte.
- [x] Diferença registrada antes da correção: a regra do ERP exibe o número de Produtos distintos, portanto o app deve comunicar o mesmo total quando existe sobreposição. Plano mínimo: compartilhar a projeção pura de contagens por Categoria e reutilizá-la para deduplicar a resposta detalhada da guarda mobile, preservando o fail-closed mobile e o bloqueio preventivo da interface.
- [x] Achado adicional antes da correção do estado de falha: os serviços de contagem da lista não verificavam `pcRes.error`/`prodRes.error` e suprimiam exceções retornando `{}`. Se a API resolve a requisição com erro e dados nulos, a lista apresenta zero e libera o acionador visual; a revalidação do serviço impede a exclusão final, mas o aviso só surge depois da confirmação. O `loadData` de ambos já captura a rejeição e preserva os nós anteriores; o erro será propagado para mostrar o feedback existente em vez de comunicar uma contagem incerta como zero.

#### Correção aplicada

- [x] Extraí `countDistinctProductsByCategory` para `shared-utils/categoryProductCounts.ts`; `fetchCategoryProductCounts` e `fetchMobileCategoryProductCounts` agora usam a mesma regra para compor a contagem da tela. A guarda `deleteCategory` do ERP e `deleteMobileCategory` do app também usam essa regra para informar o total real, sem somar duas vezes o mesmo Produto encontrado em `product_categories` e `products.category_id`.
- [x] Na guarda mobile, se as contagens exatas são positivas, o serviço lê os IDs de cada origem, verifica erros dessas leituras e deduplica antes de apresentar a mensagem. Mantém o fallback para a contagem positiva inicial se os dados vierem vazios, então a nova etapa nunca converte vínculo positivo/incerto em permissão para excluir.
- [x] O ERP agora verifica os erros das consultas `head` e da leitura detalhada antes de prosseguir; isso alinha a segurança ao mobile, que já verificava os erros `head`. Falha em qualquer consulta de guarda interrompe a exclusão. Ambos os serviços de contagem da tela agora verificam `.error` e propagam a rejeição, em vez de retornar `{}` como se o total fosse zero; os hooks existentes mostram toast/Alert e só substituem os nós após as três leituras concluírem.
- [x] Preservadas as adaptações de interação: ERP mantém a ação realmente desabilitada e explica o motivo via tooltip acessível; mobile mantém o toque que apresenta `Alert` e a confirmação nativa para Categoria sem produtos. A última revalidação no serviço continua sendo a autoridade contra contagem desatualizada. Nenhum formulário, vínculo, permissão, consulta remota, migration ou UI de Conciliação foi alterado.
- [x] Arquivos de produção: `shared-utils/categoryProductCounts.ts`, `erp/src/pages/utils/categoryService.ts` e `mobile/src/features/products/services/mobileCategoryService.ts`. Cobertura: `erp/src/pages/utils/categoryProductCounts.test.ts`, `erp/src/pages/utils/__tests__/categoryDeletionRules.test.ts` e `mobile/src/features/products/categories/domain/categoryEnvironmentServices.test.ts`.

#### Validação e limites

- [x] Vitest ERP focado: **10/10** em dois arquivos (helper, bloqueio por vínculo, IDs repetidos entre fontes, falha de consultas `head`/detalhadas e propagação de erro de contagem).
- [x] Vitest mobile: **18/18** em `categoryEnvironmentServices.test.ts`, incluindo contagem de tela deduplicada, bloqueio de exclusão com referência cruzada, erro de leitura de IDs, erro de contagem, e ausência de chamadas de remoção após falha/uso. Executado pela configuração `erp/vitest.mobile.config.ts`, que aponta para `mobile/`; a configuração própria de mobile ainda falha ao resolver `vitest/config`, então não reinstalei dependências.
- [x] `git diff --check` nos arquivos do ciclo: exit code 0; apenas aviso preexistente de normalização CRLF/LF em arquivos alterados. O teste confirma a lógica mockada, não persistência real.
- [ ] Sem Playwright autenticado; abrir o Dashboard mantém o risco documentado de limpar rascunhos. Sem Android físico/Maestro; nenhuma gravação/consulta remota, migration ou deploy. Typecheck integral não executado; Expo Web não comprova comportamento nativo.
- [x] Regras e documentação consultadas antes das alterações: `AGENTS.md` (regras de formulários, testes e Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/mobile/arquitetura_offline_first.md`, inventário e roadmap. Não há `AGENTS.md` aninhado em ERP/mobile/`shared-utils`. Skill canônica `erp-web-to-mobile-replication` ausente em `.agents/skills` e `skills/`; só o backup de cache `.vercel` continua acessível como orientação.

**Conclusão do recorte:** a tela nunca trata uma leitura de contagem falha como zero; o toque de exclusão é bloqueado preventivamente quando há Produtos e a revalidação rejeita vínculo atual/resultado incerto; mensagens ERP/mobile usam contagem distinta e já não divergem quando as duas fontes repetem o mesmo ID. A confirmação/toast/Alert continuam adaptados à plataforma. Próximo recorte: conferir contagem de Categoria em falha de refresh posterior a alteração e continuidade do estado visual, sem gravar dados. A auditoria geral permanece aberta.

### Ciclo 345 — contagem preservada quando falha o refresh pós-mutação — 25/10/2026

**Recorte:** atualização de Categorias/Ambientes depois de salvar, excluir ou desvincular, quando a consulta de contagem de produtos falha.

#### Evidência da comparação

- [x] `loadData` do ERP e `loadData` mobile consultam ambientes, categorias e contagens com `Promise.all`; preparam os nós localmente e só chamam `setEnvironments`/`setCategories` depois que todas as três leituras resolvem. Como os serviços de contagem agora propagam tanto `.error` quanto exceções (Ciclo 344), falha dessa consulta não mapeia a categoria para `productCount: 0` nem substitui parcialmente as listas. Os nós anteriores e suas contagens permanecem visíveis.
- [x] Depois de uma mutação concluída, o ERP mantém o retorno de sucesso da ação e exibe também o erro genérico de atualização se o refresh falhar. No app, salvar fecha o modal após o serviço concluir; o refresh apresenta `Alert` dizendo que não foi possível carregar categorias/ambientes. Excluir/desvincular também aguardam o refresh e recebem o mesmo alerta. O alerta identifica falha de leitura, e não solicita repetir a mutação. As rotas de serviço não são chamadas novamente pelo catch de `loadData`.
- [x] As mutações da aba — criar/editar Categoria/Ambiente, excluir categoria sem produtos e desvincular Categoria — não alteram associações de Produtos existentes; portanto preservar os nós/contagens anteriores em falha não publica uma contagem parcial como nova. Se uma ação posterior tentar excluir Categoria usando um snapshot antigo, a guarda de serviço volta a consultar as relações e falha fechada em erro/incerteza, conforme Ciclo 344.
- [x] Diferença visual mantida como feedback de plataforma: o ERP usa toast não bloqueante e o app usa `Alert` nativo; ambos terminam o refresh e mantêm os dados completos anteriores. Não alterei wording nem introduzi confirmação de sucesso no app, pois o modal fecha só depois da mutação e o alerta informa especificamente que a leitura falhou.
- [x] Fontes conferidas para esta revisão: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, documentação de estrutura de produto/variação, mover/merge, offline-first, este inventário e o item de paridade na roadmap. `rg --files --hidden` não localizou `AGENTS.md` aninhado em `erp/`, `mobile/` ou `shared-utils/`. A skill canônica `erp-web-to-mobile-replication` segue ausente em `.agents/skills`, `skills/` e nas skills globais examinadas; a limitação da cópia cache já está anotada nos ciclos anteriores.

#### Validação e limites

- [x] Revisão estática do `loadData` de ambos os hooks, `fetchCategoryProductCounts`, `fetchMobileCategoryProductCounts`, do save modal mobile e das mutações pós-refresh; nenhum código de produção precisou de alteração neste recorte.
- [ ] Não executei Vitest/RTL porque não houve alteração de lógica. Sem Playwright autenticado para provocar falha visualmente (o risco de limpeza de rascunhos do Dashboard continua registrado) e sem dispositivo Android físico/Maestro; Expo Web não comprova `Alert`/`RefreshControl` nativos. Não houve consulta ou escrita remota, migration ou deploy.

**Conclusão do recorte:** a falha da contagem durante atualização não zera nem parcialmente atualiza o estado visível em ERP ou app; ambos preservam a contagem anterior e comunicam que a carga falhou. Não identifiquei divergência de regra que justifique patch. A falha das relações já havia sido comparada no Ciclo 339; o próximo recorte passa ao contrato de criação/edição de Categoria/Ambiente no app. A auditoria geral permanece aberta.

### Ciclo 346 — contrato de gravação de Categoria/Ambiente no mobile — 25/10/2026

**Recorte:** nome persistido, slug e metadados do fluxo de criação/edição na aba Categorias/Ambientes.

#### Divergências comprovadas

- [x] ERP e app já executam os schemas Zod reais antes de chamar seus serviços. Ambos deixam o campo de nome em maiúsculas na UI e transformam o valor validado; no ERP, `createCategory`/`updateCategory` e `createEnvironment`/`updateEnvironment` normalizam o valor persistido via `toTitleCase`. Antes deste ciclo, `saveMobileCategory` e `saveMobileEnvironment` apenas removiam espaços externos e persistiam o texto em caixa alta recebido do formulário.
- [x] O ERP gera um slug normalizado e único ao criar Categoria e Ambiente. O serviço mobile não enviava `slug`; a migration `supabase/migrations/20260828080000_add_category_seo_columns.sql` adiciona a coluna como texto e faz somente backfill dos registros existentes, sem declarar default. A página pública `digital-catalog/src/app/categorias/[slug]/page.tsx` procura a categoria pelo `categories.slug`, então uma categoria criada no app sem slug não podia ser localizada por esse caminho.
- [x] Ao criar Categoria, o handler ERP também envia `meta_title: "<nome validado> | Móveis Morante"`; o serviço mobile não persistia esse metadado. Ao editar, o ERP preserva o slug salvo quando o formulário não envia alteração SEO; o app seguirá preservando esse mesmo comportamento.
- [x] Não há particularidade documentada que justifique nomes persistidos em caixa alta ou omissão de slug/meta_title no app; o campo visual em caixa alta foi preservado como adaptação de interface.

#### Correção aplicada

- [x] Extraí `normalizeSlug` e `resolveUniqueSlug` para `shared-utils/uniqueSlug.ts`; `erp/src/pages/utils/uniqueSlug.ts` reexporta a implementação comum, mantendo os call sites ERP existentes, e o mobile passou a usar as mesmas regras de normalização, colisão e sufixo numérico.
- [x] Os serviços mobile agora usam `toTitleCase` compartilhado ao criar/editar Categoria e Ambiente. Ao criar, ambos gravam slug único; Categoria também recebe o mesmo `meta_title` padrão do handler ERP. Em edição, os slugs existentes continuam intocados, conforme o fluxo ERP sem edição SEO.
- [x] Os testes móveis foram ajustados para provar nome title case, slug de Ambiente, colisão com sufixo numérico de Categoria, metadado default e nome normalizado na edição. O schema/resolver e a tela não mudaram; as submissões continuam passando por `useZodForm`.
- [x] Arquivos de produção: `shared-utils/uniqueSlug.ts`, `erp/src/pages/utils/uniqueSlug.ts` e `mobile/src/features/products/services/mobileCategoryService.ts`. Cobertura: `erp/src/pages/utils/uniqueSlug.test.ts` e `mobile/src/features/products/categories/domain/categoryEnvironmentServices.test.ts`.

#### Validação e limites

- [x] Vitest ERP `uniqueSlug.test.ts`: **3/3**. Vitest mobile `categoryEnvironmentServices.test.ts`: **18/18**. Regressão ERP de persistência comercial (`productPersistenceService.test.ts` e `productDraftPersistence.test.ts`): **11/11** após mover o helper compartilhado.
- [x] `git diff --check` nos arquivos do ciclo passou; Git emitiu apenas avisos de normalização CRLF/LF em arquivos já alterados.
- [ ] Sem Playwright autenticado e sem dispositivo Android físico/Maestro; Expo Web não confirma comportamento nativo. Nenhuma Categoria/Ambiente foi gravada remotamente, nenhuma migration foi aplicada e não houve deploy. Os testes cobrem queries/payloads mockados, não persistência operacional.
- [x] Regras conferidas: `AGENTS.md` (RHF/Zod, testes permitidos e Conciliação ERP-only), `docs/geral/USER_RULES.md`, regra de Conciliação, `digital-catalog/AGENTS.md` para a leitura da rota pública, documentação de estrutura/variação, mover/merge, offline-first, inventário e roadmap. A skill `erp-web-to-mobile-replication` não foi localizada nas skills canônicas de projeto ou globais examinadas; a limitação da cópia em cache permanece registrada nos ciclos anteriores. Não há `AGENTS.md` aninhado em `erp/`, `mobile/` ou `shared-utils/`.

**Conclusão do recorte:** Categoria/Ambiente criados no app agora recebem os mesmos nomes normalizados, slugs únicos e — para Categoria — metadado default do ERP, sem mudar a UI ou a resolução de formulário. A mudança é validada por Vitest, mas a persistência remota e a rota pública não foram exercitadas. Próximo recorte: cobertura de duplicidade e falha parcial nos vínculos Categoria–Ambiente dos formulários. A auditoria geral permanece aberta.

### Ciclo 347 — vínculos de Categoria/Ambiente na criação e edição — 25/10/2026

**Recorte:** duplicidade da seleção e sequência de gravação das relações `category_relationships` / `category_attributes` no cadastro e na edição.

#### Comparação e correção

- [x] ERP e app evitam duplicação por interação normal: ambos alternam a seleção com uma guarda `includes`; o helper mobile `toggleNodeLink` e o toggle inline do ERP adicionam uma única vez e removem a seleção ao tocar novamente. A tela inicializa a seleção pelas relações existentes. A migração `20261008010903_rename_dining_category_labels_and_add_kitchen_parent.sql` também usa `ON CONFLICT (parent_id, child_id)`, evidenciando a unicidade do par persistido. A validação Zod aceita arrays de strings sem um refinamento `.unique()` nos dois clientes; chamadas de serviço com arrays artificiais repetidos podem ser rejeitadas pelo índice do banco, mas não encontrei divergência ERP/mobile que justifique normalizar apenas o app.
- [x] Divergência comprovada: ao criar Ambiente, o app gravava a linha `categories` e em seguida executava `DELETE` de relações para o ID recém-criado antes do `INSERT`; ao criar Categoria, fazia exclusões equivalentes em `category_relationships` e `category_attributes`. O ERP não apaga vínculos na criação: insere somente a linha-base e depois os vínculos selecionados. A chamada extra no app era um ponto de falha dispensável após a linha-base já estar gravada.
- [x] Ajustei `saveMobileEnvironment` e `saveMobileCategory` para executar `DELETE` somente nos caminhos de edição. Criações continuam inserindo os vínculos e atributos selecionados; edições mantêm a sequência ERP de atualizar a linha-base, excluir associações antigas e inserir as novas.
- [x] A suíte agora afirma que criação não chama os deletes e que edição ainda os executa. Acrescentei cobertura de falha de inserção de vínculo em criação de Categoria: o serviço propaga o erro sem apagar associações; o teste também deixa explícito que o registro-base já foi inserido antes da falha.

#### Limitação compartilhada e validação

- [x] Categoria e Ambiente permanecem operações multi-etapa, sem transação/RPC atômica, tanto no ERP quanto no app. Falha ao inserir relação após a inserção/edição da linha-base pode deixar cadastro parcialmente aplicado; falha após remoção na edição pode deixar a linha sem vínculos. Não alterei somente o app nem introduzi contrato/RPC diferente do ERP; uma correção atômica requer decisão e implementação conjunta.
- [x] Os dois formulários continuam submetendo pelo `useZodForm` e schemas Zod explícitos existentes; o recorte não alterou validação, UI ou payloads dos formulários.
- [x] Vitest via `erp/vitest.mobile.config.ts`: `categoryEnvironmentServices.test.ts` **19/19** e `categoryEnvironmentRules.test.ts` **19/19** (38/38). `git diff --check` aplicado aos arquivos deste ciclo passou, sem erros.
- [ ] Sem Playwright autenticado ou aparelho Android físico/Maestro nesta execução; Expo Web não prova o fluxo nativo. Nenhuma gravação remota, migration ou deploy foi feita. Os testes usam Supabase mockado e não comprovam transação/índice operacional.
- [x] Regras conferidas: `AGENTS.md` (RHF/Zod, runners e Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/mobile/arquitetura_offline_first.md`, este inventário e o item correspondente no roadmap. Não há `AGENTS.md` aninhado nos caminhos tocados. A skill `erp-web-to-mobile-replication` não foi localizada em `.agents/skills`, `skills/`, skills globais nem entre arquivos `SKILL.md` do projeto; orientação canônica indisponível, limitação já documentada nos ciclos anteriores.

**Conclusão do recorte:** a criação mobile não tenta mais excluir associações inexistentes e segue a sequência do ERP; as edições preservam o contrato já comum. Seleção por UI e unicidade persistida impedem duplicidade no caminho normal. Arrays repetidos injetados diretamente e falha parcial por ausência de transação continuam riscos comuns aos dois clientes, fora de uma correção mobile-only. A auditoria geral permanece aberta.

### Ciclo 348 — atributos técnicos obrigatórios da Categoria na edição do Produto — 25/10/2026

**Recorte:** aba técnica do formulário de Produto, com foco na precedência entre exigência da Categoria para publicação e exceção de apresentação para `Altura` em Colchões.

#### Evidência e correção

- [x] A edição carrega os campos técnicos e marca `isRequiredForCatalog` quando uma Categoria selecionada os exige. O contrato vigente mantém a exigência de publicação separada da obrigatoriedade geral do formulário; associação da Categoria não inventa valor. Para Colchões, `Altura` é normalmente ocultada e `Espessura do colchão` é a medida específica.
- [x] Divergência reproduzível por inspeção da lógica: o ERP avalia a exigência de catálogo antes da exceção visual de Colchões. O app avaliava primeiro a exceção de `Altura`, ocultando o campo mesmo quando a Categoria selecionada o exigia. Isso impedia o operador de preencher um requisito de publicação.
- [x] Extraí `isProductTechnicalAttributeRequiredByCategories` para `shared-utils/productCategoryRequiredAttributes.ts` e passei a usar o mesmo predicado no seletor técnico do ERP e do app. No app, a regra de requisito de catálogo agora precede a exceção de `Altura`; a distinção permanece: o campo aparece e recebe `isRequiredForCatalog: true`, mas não se torna `isRequired` do formulário por esse motivo.
- [x] Adicionei regressão para `Altura` exigida na categoria de colchão e controle para `Altura` sem requisito, que continua oculta. O schema Zod, a submissão, o payload de salvamento e demais regras de obrigatoriedade não foram alterados neste recorte.

#### Validação e limites

- [x] Vitest mobile: `productCharacteristics.test.ts` **27/27** e `mobileProductMutationService.test.ts` **61/61** (**88/88** no total), via configuração `erp/vitest.mobile.config.ts`.
- [x] Vitest ERP: `productCategoryRequiredAttributes.test.ts` **18/18** e `useProductTechnicalTab.test.ts` **8/8** (**26/26** no total).
- [x] `git diff --check` nos arquivos do ciclo passou; somente avisos de normalização CRLF/LF em arquivos já alterados.
- [ ] Sem Playwright autenticado e sem aparelho Android físico/Maestro nesta execução; Expo Web não comprovaria o comportamento nativo. Não consultei nem gravei dados remotos, não apliquei migration e não fiz deploy. Os testes mockados validam a projeção/regra, não o comportamento persistido no PostgreSQL.
- [x] Regras consultadas: `AGENTS.md` (RHF/Zod, validadores permitidos e Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, documentação de estrutura de produto/variação, operações de mover/merge, notas mobile e inventário/roadmap. Skill canônica `erp-web-to-mobile-replication` não encontrada nas fontes do projeto; foi usada somente a orientação acessível em cache, cuja origem canônica não foi confirmada.

**Conclusão do recorte:** quando a Categoria exige `Altura` para publicação, ERP e app agora mantêm o campo disponível; sem essa exigência, o app continua aplicando a particularidade documentada de Colchões. Próximo: seguir o valor preenchido na aba técnica até o payload de salvamento e a recarga da edição, cobrindo Produto simples e variações sem conflitar com atributos próprios. A auditoria geral permanece aberta.

### Ciclo 349 — persistência e reabertura de atributos da variação — 25/10/2026

**Recorte:** continuidade da aba técnica, seguindo um valor obrigatório por Categoria da entrada do formulário ao `product_variations.attributes` e de volta à edição.

#### Comparação e correção

- [x] O ERP e o app carregam os vínculos `category_attributes` verificados e usam `projectRequiredCategoryAttributesToVariations` compartilhado ao salvar. O helper projeta somente valor preenchido e exigido por Categoria para cada variação, mantém override próprio, respeita override explicitamente vazio e não remove atributos já persistidos se a exigência da Categoria for retirada. Ambos continuam gravando compatibilidade em `products.technical_specs`; a fonte canônica para os valores efetivos permanece `product_variations.attributes`.
- [x] Divergência comprovada na reabertura: o ERP `mapDbVariations` passa os atributos por `toTitleCase` compartilhado (nome e valor; por exemplo, mantém a sigla `MDF`); o app retornava a estrutura de `attributes` sem a mesma normalização. Um valor salvo corretamente podia, portanto, aparecer com capitalização diferente ao editar.
- [x] O mapeador de resposta mobile agora normaliza os atributos da variação via parser mobile existente e `toTitleCase` de `shared-utils`. A alteração é somente no objeto carregado para a UI: não atualiza a linha no banco, não altera `showName` e não mexe nos payloads. A rota `summaryOnly`, que não hidrata atributos por ser um resumo de lista, permaneceu inalterada.
- [x] Acrescentei regressão para nome/valor em maiúsculas, preservação de `showName: false` e acrônimo `MDF`. O ERP já possui cobertura correspondente no `productVariationMapper.test.ts`.

#### Validação e limites

- [x] Vitest mobile, `mobileProductFetchService.test.ts`: **37/37**.
- [x] Vitest ERP, `productVariationMapper.test.ts`: **8/8**. Uma primeira chamada com a configuração ERP executada a partir da raiz não selecionou testes por usar raiz de inclusão diferente; corrigido o diretório de execução e a suíte efetivamente executada passou.
- [x] `git diff --check` nos dois arquivos mobile passou; Git emitiu apenas avisos de normalização CRLF/LF.
- [ ] Os testes exercitam o mapeamento com respostas mockadas; não comprovam leitura persistida no PostgreSQL. Sem Playwright autenticado ou aparelho Android/Maestro; Expo Web não prova apresentação nativa. Não consultei/escrevi dados remotos, não apliquei migration nem fiz deploy.
- [x] Regras consultadas: `AGENTS.md` (RHF/Zod, métodos de validação permitidos e Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/mobile/arquitetura_offline_first.md`, inventário e roadmap. A skill canônica `erp-web-to-mobile-replication` não está nas skills do projeto/globais examinadas; a cópia de cache não tem origem canônica confirmada e permanece apenas como orientação.

**Conclusão do recorte:** o contrato de salvamento da projeção é comum e a reabertura mobile agora apresenta os atributos no mesmo padrão do ERP sem regravar dados. Próximo: verificar o estado de rascunho versus publicação para um atributo obrigatório ausente, incluindo a validação, o gate do Catálogo e a navegação do erro na aba técnica. A auditoria geral permanece aberta.

### Ciclo 350 — rascunho, elegibilidade do Catálogo e destino do bloqueio — 25/10/2026

**Recorte:** conclusão do formulário/aba técnica para atributo obrigatório ausente, distinguindo salvamento de produto, elegibilidade do Catálogo e autorização para alterar o status.

#### Comparação e conclusão

- [x] Rascunho incompleto é um estado de salvamento, não uma publicação. O ERP (`createProductFormSchema` com `saveAsDraft`) e o app (`createMobileProductFormSchema` com `draft`) permitem a persistência parcial necessária ao rascunho após validar o nome e a forma dos valores. A finalização executa o schema operacional de cadastro; os campos exigidos somente para o Catálogo não viram obrigatórios de cadastro por essa distinção.
- [x] Salvar um produto finalizado não publica automaticamente o Catálogo: a criação/finalização o mantém oculto, e a publicação é uma ação separada no status da lista. Um atributo marcado obrigatório pela Categoria para o Catálogo pode permanecer pendente enquanto o item está oculto; ao pedir publicação, ERP e app carregam as exigências atuais da Categoria e usam `validateCatalogPublication` compartilhado, que rejeita a mudança sem persistir o status.
- [x] Na interface, a publicação também é bloqueada para rascunho e para quem não tem `productConfig`; o status permanece visível e desabilitado nesse perfil. Essa foi a opção confirmada pelo usuário. `viewMetaCatalog` dá acesso à administração Meta e não substitui a permissão de gerenciar o status do produto. A guarda de banco tem migration local revisada nos Ciclos 305/306, mas sua aplicação/eficácia no Supabase remoto permanece sem comprovação.
- [x] Se o produto já está publicado, ambos impedem salvar uma edição que deixe pendente um atributo exigido pela Categoria. Buscam novamente os vínculos da Categoria antes da gravação e falham fechados quando a leitura não pode ser confirmada. Para produtos ocultos, essa condição de preservação do estado publicado não se aplica.
- [x] Erros operacionais estruturados do formulário encaminham para a aba/painel correspondente, inclusive Características Técnicas. Já a reprovação da exigência específica do Catálogo durante publicação/edição de item publicado é mostrada depois da validação do formulário e não navega automaticamente: ERP usa toast e o app usa alerta nativo, ambos retornando sem executar a gravação/status. As regras, o bloqueio e o destino são equivalentes; feedback visual é adaptação do runtime.
- [x] O cabeçalho/checklist de prontidão continua listando requisitos gerais nos dois clientes; a exigência variável por Categoria é validada no ato da publicação/edição publicada, não aparece como item individual naquele checklist. Não introduzi no app um fluxo extra que não existe no ERP.
- [x] Nenhuma alteração de produção ou teste foi necessária neste ciclo. Inventário anterior dos Ciclos 303–306 já registra a decisão do usuário de bloquear a ação de Catálogo para perfis sem permissão.

#### Validação e limites

- [x] Revisão estática das schemas RHF/Zod, do handler de submissão ERP/app, do helper compartilhado `catalogPublicationValidation`, dos controles de status, navegação e dos testes existentes. Nenhum runner foi executado, pois não houve alteração de código.
- [ ] Sem Playwright autenticado, Android físico/Maestro ou leitura/gravação remota nesta execução; Expo Web não comprovaria gesto/comportamento nativo. Não houve chamada à Meta, migration remota ou deploy. A autorização de UI sem `productConfig` está verificada estaticamente, mas não foi feita prova de autorização no servidor.
- [x] Regras consultadas: `AGENTS.md` (RHF/Zod, validadores permitidos e Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/mobile/arquitetura_offline_first.md`, notas/inventário/roadmap. A skill canônica `erp-web-to-mobile-replication` não foi encontrada em `.agents/skills`, `skills/` ou nas pastas globais pesquisadas; a cópia de cache permanece apenas como orientação, sem origem canônica confirmada.

**Conclusão do recorte:** são verificações independentes: (1) salvar o produto, (2) estar conforme para publicação e (3) ter permissão para alterar o status do Catálogo. Um produto oculto pode ser salvo mesmo sem atributo exigido somente pelo Catálogo; publicar fica bloqueado enquanto ele for rascunho, não cumprir os requisitos ou o perfil não tiver `productConfig`. Para esse perfil, o status fica visível, mas desabilitado. Se um produto já publicado perder requisito durante a edição, essa gravação é barrada para não manter publicado um item inválido. Os comportamentos ERP/app estão alinhados, sem correção necessária; o bloqueio na interface foi confirmado, mas o guard remoto ainda não foi comprovado. Próximo: inspecionar na aba técnica a recuperação do operador após bloquear uma edição de produto publicado por atributo obrigatório. A auditoria geral permanece aberta.

### Ciclo 351 — recuperação após edição publicada bloqueada por atributo da categoria — 25/10/2026

**Recorte:** permanência do formulário aberto, retorno à aba Características Técnicas e atalhos de prontidão depois de uma edição ser bloqueada por atributo obrigatório de Categoria.

#### Comparação e conclusão

- [x] Na edição de item já publicado, ambos renovam os vínculos `category_attributes` (timeout de 15 s e falha fechada) antes de salvar. Se o atributo obrigatório estiver vazio, a validação retorna antes de montar/enviar payload, preserva o formulário aberto e mantém a aba atual. ERP mostra toast; app mostra alerta nativo. Os dois não limpam os valores digitados nem navegam automaticamente para outra aba.
- [x] Com a categoria selecionada, a aba Características Técnicas continua disponível para correção manual nos dois formulários. O campo exigido é apresentado como obrigatório e não pode ser marcado como “Não informar”; após corrigir, o operador pode reenviar a edição. Se estiver em outra aba ao receber o bloqueio, precisa selecionar Características Técnicas manualmente.
- [x] O checklist de prontidão do Catálogo em ambos lista requisitos gerais e não cria uma entrada por atributo obrigatório dinâmico de Categoria. Consequentemente, não existe atalho do checklist diretamente ao atributo ausente. O painel mostra o estado geral, mas a mensagem do bloqueio durante edição publicada não identifica o nome do campo; a publicação iniciada pela lista, por sua vez, usa o resultado detalhado compartilhado.
- [x] A ausência de identificação/atalho após esse bloqueio é uma limitação comum ao ERP e ao app, não uma lacuna de replicação mobile. Não alterei somente o app nem criei um comportamento divergente sem respaldo documental; uma melhoria desse feedback deve ser decidida e aplicada ao fluxo de referência também.
- [x] O esclarecimento do usuário permanece aplicado: para perfil sem `productConfig`, o status do Catálogo fica visível e desabilitado na interface. Isso é distinto de rascunho e de legibilidade; a proteção remota de banco continua sem prova e não foi alterada aqui.

#### Validação e limites

- [x] Revisão estática dos dois handlers de submissão, schemas Zod, navegação por erro, abas técnicas, requisitos visíveis e checklists de prontidão. Nenhuma alteração de código foi necessária; nenhum runner foi executado.
- [ ] Sem UI autenticada por Playwright nesta sessão: o login tem risco conhecido de limpeza de rascunhos (Ciclo 182). Sem aparelho Android físico/Maestro; Expo Web não comprovaria a retomada nativa após Alert. Sem leitura/escrita remota, chamada Meta, migration ou deploy.
- [x] Regras consultadas: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, estrutura produto/variação, operações mover/merge, arquitetura offline-first, inventário e roadmap. A cópia procedural da skill foi localizada somente dentro de `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/`; trata-se de cache de backup de build (pacote `morante-hub-root`), sem origem canônica atual confirmada, usada apenas como orientação. As pastas canônicas e globais continuam sem a skill.

**Conclusão do recorte:** após o bloqueio, ERP e app preservam o formulário e permitem correção manual na aba técnica; ambos deixam o operador identificar o atributo por conta própria, pois o aviso e o checklist não apontam o campo específico. Não há diferença de paridade a corrigir neste estado. Próximo: voltar à composição e auditar a elegibilidade de Serviços na busca de componentes; essa hipótese foi resolvida no Ciclo 352. A auditoria geral permanece aberta.

### Ciclo 352 — elegibilidade de Serviços na busca de componentes — 25/10/2026

**Recorte:** somente os filtros de busca e seleção de candidatos na aba Composição; sem alterar validação de ativação, cálculo de saldo ou gravação.

#### Comparação e conclusão

- [x] No ERP, `VariationCompositionItemsTab` usa `ProductAutocomplete` com `supplierId` e `excludeCombos=true`, sem `productsOnly`. `fetchAllProductSearchResults` consulta produtos ativos e não rascunhos, sem filtro de `item_type`; `useProductAutocomplete` exclui `isCombo`, `combo`, `composition` e variações mescladas, mas não exclui `service`.
- [x] No app, `mobileProductCompositionService` pede `itemType: 'standard'`. Esse valor é um modo do filtro mobile que remove composições, não uma condição SQL `item_type = 'product'`; a query usa `item_type IS DISTINCT FROM 'composition'`, preservando linhas legadas e Serviços. O filtro posterior remove composições/combos, rascunhos e itens inativos, sem remover Serviços.
- [x] Assim, a dúvida antiga registrada no Ciclo 324 veio de interpretar `standard` como tipo de item. O caminho efetivo não exclui Serviços em nenhum cliente: ambos podem oferecê-los como candidatos se ativos, não rascunho, não compostos e compatíveis com o fornecedor informado. Não há divergência ERP→app a corrigir e não é preciso decidir um contrato novo para fins de paridade.
- [x] A documentação de composição exige ao menos dois componentes e calcula disponibilidade a partir de saldo; não define exclusão de Serviços. Não inferi uma nova regra de domínio além do comportamento atualmente comum aos clientes.
- [x] Nenhuma alteração de código ou teste foi necessária. O Ciclo 324 permanece como registro histórico da hipótese inicial; esta auditoria a corrige e encerra a pendência de paridade.

#### Evidências e limites

- [x] Revisão estática de `VariationCompositionItemsTab`, `ProductAutocomplete`, `useProductAutocomplete`, `productAutocompleteUtils.fetchAllProductSearchResults`, `productFilterBuilder`, `ProductFormCompositionTab`, `mobileProductCompositionService` e `mobileProductFetchService`. O `ComboItemSelector` legado foi inspecionado, mas não possui callsites no código ERP; não foi usado como caminho ativo para a conclusão.
- [x] Regras consultadas: `AGENTS.md` (RHF/Zod, validadores e Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, estrutura de produto/variação, mover/merge, arquitetura offline-first, este inventário e o item correspondente do roadmap. Não há `AGENTS.md` aninhado nos diretórios ERP/mobile/shared-utils deste recorte. A skill `erp-web-to-mobile-replication` segue sem fonte canônica localizada; apenas a cópia em cache de backup documentada em ciclos anteriores está disponível como orientação.
- [ ] Nenhum runner foi executado, pois não houve alteração de lógica; sem Playwright autenticado, aparelho Android/Maestro, consulta/escrita remota, migration ou deploy. Revisão estática dos filtros não confirma a experiência visual em sessão real nem a projeção de saldo para registros remotos.

**Conclusão do recorte:** os seletores ERP e app permitem a mesma classe de candidatos, incluindo Serviços, e excluem composições/combos. A diferença anotada no Ciclo 324 está encerrada por evidência do significado do enum mobile `standard`; nenhuma mudança de código é indicada. A auditoria geral permanece aberta.

### Ciclo 353 — estados de vazio e erro na busca de componentes — 25/10/2026

**Recorte:** estados de entrada curta, carregamento, resposta sem resultados, falha e retry na busca da aba Composição.

#### Comparação e correção

- [x] ERP e app usam `productAutocompleteFormSchema` compartilhado (consulta com no mínimo três caracteres), o debounce compartilhado de 300 ms, timeout de busca de 10 segundos, estado de loading, mensagem de busca sem resultados e retry explícito após falha. O app limpa o erro e os resultados anteriores ao editar a consulta; o hook ERP também invalida sugestões antigas ao mudar o termo.
- [x] Divergência reproduzida por leitura do render: no ERP, depois de erro do serviço o hook limpava as sugestões e desativava loading, mas a lista suspensa continuava aberta e exibia “Nenhum produto encontrado para esta busca.” junto ao alerta de erro. Isso confundia falha de consulta com resposta vazia.
- [x] Ajustei `ProductAutocomplete` para só renderizar “Nenhum produto encontrado” quando não há `searchError`. O app já tinha a mesma distinção (`!searchError`); não houve mudança no app, no schema, na seleção, no filtro ou no payload. O erro e o retry explícito permanecem disponíveis.
- [x] Acrescentei regressão de UI pelo Vitest/RTL para as duas respostas: falha exibe alerta sem estado vazio; resposta bem-sucedida com array vazio exibe o estado vazio.

#### Validação e limites

- [x] Vitest ERP via runner do pacote: `ProductAutocomplete.form.test.tsx` — **6/6 testes aprovados**. O caso existente de timeout imprimiu o aviso esperado do helper de proteção; a suíte terminou com exit code 0.
- [x] `git diff --check` sem erros; há apenas os avisos de normalização CRLF/LF nos arquivos anteriormente modificados.
- [ ] Sem Playwright autenticado nem teste Android físico/Maestro. O Vitest/RTL verifica a lógica de apresentação com serviços mockados; não comprova layout de navegador autenticado, interação nativa nem conexão real. Nenhuma leitura/escrita remota, migration, Meta ou deploy foi realizada.
- [x] Regras consultadas: `AGENTS.md` (RHF/Zod e runners permitidos), `docs/geral/USER_RULES.md`, regra `rules/products/product-reconciliation-erp-only.yml`, documentação de estrutura produto/variação, operações mover/merge, arquitetura offline-first, inventário e roadmap. Não há `AGENTS.md` aninhado nos diretórios ERP/mobile/docs usados neste recorte. A skill foi lida da única cópia acessível no backup `.vercel/builders-backup-72ebb3b0`; como a origem não é canônica, permanece apenas orientação, e as fontes `.agents/skills`/`skills/` do projeto não a contêm.

**Conclusão do recorte:** a mensagem de vazio agora significa somente “a busca terminou sem resultados”; um erro permanece um erro com opção de retry, igual ao app. Busca curta, loading, sucesso e retry continuam preservados. A auditoria geral do módulo Produtos permanece aberta.

#### Próximo recorte identificado

Continuar a aba Tributário/NF pelo estado Produto normal versus Serviço e comparar quais campos aparecem fora/dentro do grupo de configuração. Manter pendentes as provas autenticadas/nativas e de persistência remota; preservar os gates separados de imposto e Catálogo, a confirmação do operador sobre `productConfig` e a Conciliação exclusiva do ERP.

### Ciclo 354 — hipótese de paridade CFOP, reavaliada no Ciclo 355 — 25/10/2026

**Recorte original:** cálculo de opções CFOP da aba Tributário/NF do formulário principal de Produto.

#### Reauditoria

- [x] A conclusão de que o ERP exibia uma lista de CFOPs ativos para produtos normais estava incorreta: `ProductFiscalTab.tsx` só renderiza o seletor de CFOP municipal dentro da condição `itemType === 'service'`. `productFiscalOptions.ts` é a fonte de outra superfície fiscal; não prova um controle no formulário de Produto.
- [x] No app, `availableCfopOptions` e `selectedCfop` também eram calculados para Produto normal, mas `selectedCfop` só era renderizado no JSX de Serviço. A lista normal não era apresentada ao operador.
- [x] O teste 1/1 do Ciclo 354 verificou apenas o conteúdo do adaptador novo e não demonstrou diferença visual/funcional do formulário. Removi o adaptador dessa hipótese e não alterei catálogo, seleção, payload ou emissão de produto normal.

#### Evidências e limites

- [x] Referências: `erp/src/pages/App/Products/components/tabs/fiscal/ProductFiscalTab.tsx:268-282` e `mobile/src/features/products/modals/tabs/ProductFormFiscalTab.tsx:464-488`; somente o seletor municipal de Serviço é exposto nos dois formulários.
- [x] O Ciclo 355 corrigiu o valor salvo que não corresponde a opção municipal, descrito abaixo. A busca da skill canônica em `.agents/skills`, `skills/` e no cache `.vercel` disponível neste checkout não encontrou o arquivo; usei as regras do repositório e a evidência dos ciclos anteriores, sem tratar o registro de uma cópia histórica em cache como fonte canônica.

**Conclusão reaberta:** não havia diferença de UI de CFOP para produto normal a corrigir. A anotação original do Ciclo 354 foi substituída por esta reauditoria; os arquivos de código e a validação reais estão no Ciclo 355.

### Ciclo 355 — CFOP municipal legado no formulário de Serviço — 25/10/2026

**Recorte:** aba Tributário/NF, Serviço, valor `fiscal.cfop` previamente salvo fora das opções municipais vigentes.

#### Comparação e correção

- [x] O ERP controla o seletor com `formData.fiscal?.cfop || '5933'` e oferece 5933/6933. Se um valor legado não corresponder às opções, ele não é apresentado como se fosse um código selecionado.
- [x] O app também oferece 5933/6933, mas antes exibia `SERVICE_CFOP_OPTIONS[0]` como fallback para qualquer valor não reconhecido. Isso fazia um CFOP legado aparecer falsamente como 5933, sem que o estado salvo fosse 5933.
- [x] Extraí as duas opções municipais e um resolvedor de rótulo para o domínio mobile. Campo ausente continua mostrando o default ERP 5933; 6933 continua selecionado normalmente; código legado agora é mostrado como salvo e fora das opções atuais. O valor só muda quando o operador escolhe explicitamente uma opção; nenhum payload ou regra de emissão foi alterado.
- [x] A lista de CFOP para Produto normal que o Ciclo 354 tentou alinhar foi removida: a reauditoria confirmou que ela não aparecia em nenhum controle do formulário ERP ou mobile.

#### Evidências, validação e limites

- [x] Vitest mobile `mobileProductFiscalOptions.test.ts`: **3/3** (default ausente/vazio, opção municipal válida e valor legado indisponível). A ligação do resolvedor e das opções ao componente foi revisada estaticamente.
- [x] Regras consultadas: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, índice/invariantes e históricos fiscais, estrutura do produto/variação, mover/merge, documentação mobile disponível, este inventário e roadmap. Não há `AGENTS.md` aninhado nos diretórios alterados.
- [x] A busca do Ciclo 355 cobriu `.agents/skills`, `skills/` e `.vercel/` na raiz, mas não `erp/.vercel/`; o Ciclo 356 localizou e leu a cópia em `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/erp-web-to-mobile-replication/SKILL.md`. É cache de backup de build, não fonte canônica; a localização foi corrigida sem promover essa cópia a autoridade.
- [ ] Sem formulário autenticado no Playwright ou dispositivo físico Android/Maestro; Expo Web não demonstraria comportamento nativo. Sem consulta/escrita remota, Meta, SEFAZ, migration ou deploy.

**Conclusão do recorte:** o valor legado municipal não é mascarado pelo default visual 5933 nem sobrescrito implicitamente. O próximo ciclo pode avançar para outra aba/estado de Produtos; a auditoria geral continua aberta.

### Ciclo 356 — permissão de configuração tributária no formulário — 25/10/2026

**Recorte:** aba Tributário/NF, formulário de Produto/Serviço aberto por perfis que não podem alterar as configurações de imposto; separado da ação publicar/ocultar do Catálogo.

#### Comparação e conclusão

- [x] O ERP deriva `canConfigureProductTaxes` no modal com `getProfileRoles(profile).some(role => role !== 'seller' && role !== 'stockist')`. `getProfileRoles` delega a `shared-utils/productPermissions.getProductProfileRoles`, que aceita os papéis tipados da sessão: `administrator`, `manager`, `stockist`, `seller`, `deliverer`, `accountant` ou `pending`.
- [x] O app deriva o mesmo predicado em `useProductFormPermissions.ts`, a partir do mesmo helper de papéis, normalizando aliases/valores antes de avaliar. Para todos os valores suportados por `Profile/UserRole`, os resultados coincidem: perfis exclusivamente `seller`/`stockist` não editam os impostos; demais papéis válidos podem fazê-lo. Papel ausente ou somente `pending` resulta em bloqueio nos dois.
- [x] No ERP, o grupo “Configurações de Imposto por Produto” fica visível, esmaecido e dentro de `<fieldset disabled>`. No app, fica visualmente desabilitado com `pointerEvents="none"`; antes, `accessibilityElementsHidden`/`no-hide-descendants` removiam seus valores do leitor de tela embora o texto dissesse que eram consultáveis. Corrigi o estado: o grupo continua sem interação, mas botões e campo numérico recebem `disabled`/`editable=false` e `accessibilityState.disabled`, ficando legíveis como controles desabilitados. Para perfil estoquista isolado, o grupo todo é ocultado nos dois; a área de NCM fica fora da guarda tributária em ambos.
- [x] A divergência de normalização só aparece para valores/aliases que não pertencem ao tipo `Profile/UserRole`; o app falha fechado e o ERP poderia tratá-los como autorizados pelo predicado simples. Mantive o comportamento mobile mais restritivo, sem ampliar acesso a partir de dados fora do contrato.
- [x] `productConfig` não é a fonte desse gate: ela controla a edição do cadastro e a mudança de status do Catálogo. A confirmação do usuário de que a ação do Catálogo fica bloqueada sem permissão continua atendida separadamente; os bloqueios de rascunho e de requisitos do Catálogo continuam sendo condições de elegibilidade, não autorização.
- [x] Nenhuma diferença de regra/papéis válidos exigiu mudança de backend, payload ou identificador de permissão tributária. A única correção é a exposição acessível de estado bloqueado, sem habilitar alteração.

#### Evidências, validação e limites

- [x] Revisão estática em `erp/src/pages/App/Products/modals/ProductFormModal.tsx`, `erp/src/pages/utils/accessRoles.ts`, `erp/src/pages/App/Products/components/tabs/fiscal/ProductFiscalTab.tsx`, `mobile/src/features/products/hooks/useProductFormPermissions.ts`, `mobile/src/features/products/screens/ProductFormScreen.tsx`, `mobile/src/features/products/modals/tabs/ProductFormFiscalTab.tsx`, `shared-utils/productPermissions.ts` e tipos `Profile/UserRole`. Os paths não contêm `AGENTS.md` aninhado.
- [x] A regra da skill foi consultada na cópia de cache de backup acima apenas como orientação (comparar ERP/shared/mobile; trabalhar um estado por vez; separar UI de regra; registrar limitações nativas). Nenhuma nova regra de negócio foi duplicada nem alterada.
- [x] Regras consultadas: `AGENTS.md` (RHF/Zod, runners permitidos, não usar banco local e Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/fiscal/README.md`, `docs/fiscal/invariantes-arquiteturais.md`, estrutura produto/variação, mover/merge, arquitetura mobile offline-first, este inventário e roadmap.
- [x] Vitest mobile `ProductFormFiscalTab.permission.test.tsx`: **2/2**, verificando controles e texto acessíveis porém desabilitados sem permissão e habilitados com permissão. `git diff --check` passou.
- [x] Regras consultadas: `AGENTS.md` (formulários RHF/Zod, runners permitidos, sem banco local e Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/fiscal/README.md`, `docs/fiscal/invariantes-arquiteturais.md`, estrutura produto/variação, mover/merge, arquitetura mobile offline-first, este inventário e roadmap. A skill de replicação foi lida na única cópia localizada em cache de backup `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/erp-web-to-mobile-replication/SKILL.md`; ela não é fonte canônica confirmada e foi usada apenas como orientação. Não há `AGENTS.md` aninhado nos diretórios alterados.
- [ ] Sem Playwright autenticado ou dispositivo físico Android/Maestro; a renderização Vitest com mocks verifica os props de acessibilidade, mas não prova anúncio de leitor de tela em runtime nativo. Sem consulta/escrita remota, chamada Meta/SEFAZ, migration ou deploy.

**Conclusão do recorte:** o gate tributário está equivalente para os papéis válidos e permanece separado de `productConfig`; as informações fiscais bloqueadas agora continuam disponíveis para consulta assistiva e são identificadas como desabilitadas. O app mantém bloqueio fail-closed para papel fora do contrato. A resposta recente do operador sobre o Catálogo reafirma o comportamento já verificado nos Ciclos 303–306, sem nova mudança necessária. O Ciclo 357 segue abaixo com o estado Produto/Serviço. A auditoria geral permanece aberta.

### Ciclo 357 — campos fiscais por tipo de item — 25/10/2026

**Recorte:** somente os títulos e campos da aba Tributário/NF conforme `itemType` Produto normal ou Serviço; comparação das condições fora e dentro do grupo de impostos.

#### Comparação e correção

- [x] No ERP, a seção usa o título “Informações Fiscais para NF-e”. Para Produto, mostra o seletor NCM e, quando aplicável, CEST; dentro das configurações tributárias mostra origem da mercadoria, CSOSN ICMS, não exibe o CFOP municipal reservado a Serviço, mostra alíquota ICMS, PIS e COFINS. Para Serviço, troca NCM por Código Municipal/Serviço, não mostra CEST nem origem, e dentro do grupo tributário mostra CSOSN ISSQN, CFOP Municipal, alíquota ISS, PIS e COFINS.
- [x] O mobile já aplicava as mesmas condições de campos: NCM/CEST/origem/ICMS somente no ramo Produto; Código Municipal/Serviço, CFOP Municipal e ISS no ramo Serviço; o grupo tributário e o CEST respeitam também o perfil estoquista conforme o ERP. O campo de Serviço tinha, porém, o título fixo “Classificação Fiscal (NCM)”, que não descrevia o conteúdo.
- [x] O título mobile agora varia pelo `itemType`: Produto mantém “Classificação Fiscal (NCM)”; Serviço usa “Informações Fiscais para NF-e”, como o cabeçalho genérico do ERP. Nenhuma validação, valor fiscal, persistência, chamada, payload ou permissão foi alterada.

#### Evidências, validação e limites

- [x] Comparação estática: `erp/src/pages/App/Products/components/tabs/fiscal/ProductFiscalTab.tsx:90-204,231-359` e `mobile/src/features/products/modals/tabs/ProductFormFiscalTab.tsx:231-456,457-607`; exceção por item type e estoquista segue equivalente após a correção do título.
- [x] Vitest mobile `ProductFormFiscalTab.permission.test.tsx`: **4/4** (campos mostrados/omitidos para Produto e Serviço, além dos estados permitido/bloqueado); teste ERP `ProductFiscalTab.test.tsx`: **3/3**; `git diff --check` passou, com avisos CRLF/LF somente.
- [x] Regras consultadas: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/fiscal/README.md`, invariantes e históricos fiscais vigentes, estrutura de Produto/Variação, operações de mover/merge, arquitetura mobile offline-first, inventário e roadmap. Não há `AGENTS.md` aninhado nos diretórios alterados.
- [x] Skill `erp-web-to-mobile-replication` lida na cópia encontrada sob `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills/`; é cache de backup, não fonte canônica. Nenhuma versão canônica foi encontrada nos diretórios `.agents/skills`/`skills` do projeto; o processo acessível foi usado somente como orientação.
- [ ] Sem sessão autenticada Playwright para comparação visual e sem telefone físico Android/Maestro; a renderização dos testes Vitest não prova comportamento nativo. Expo Web não foi usado como substituto. Nenhuma consulta/escrita remota, chamada Meta/SEFAZ, migration ou deploy.

**Conclusão do recorte:** as condições dos campos fiscais por `itemType` já eram equivalentes; corrigi apenas o cabeçalho mobile de Serviço, que o chamava incorretamente de NCM. Próximo: avançar para outro estado documentado do formulário de Produto, mantendo validação visual autenticada e nativa como pendente. A auditoria geral permanece aberta.

### Ciclo 358 — cabeçalho da precificação do produto pai — 25/10/2026

**Recorte:** título do cartão de preços de venda/descontos na aba Estoque e Precificação do formulário de Produto.

#### Comparação e correção

- [x] ERP (`ProductPricingFields`) identifica a seção como “Precificação e Descontos” e acrescenta “(Produto Pai)” quando o produto tem variações.
- [x] O app usava “Preços de Venda & Desconto” e não identificava explicitamente que, em uma família, os preços exibidos nesse painel pertencem ao produto pai. Não há particularidade mobile documentada para essa diferença de rótulo.
- [x] Alinhei o título e o sufixo condicional no cartão mobile. A mudança não altera entradas, cálculos, descontos, herança, fornecedores, custos, schema RHF/Zod, validação ou payload.
- [x] Os handlers de preço e desconto continuam usando `shared-utils/productDiscountFields`; a mudança ficou restrita à apresentação do estado simples versus família.

#### Validação e limites

- [x] Vitest/RTL focado `ProductFormPricesTab.header.test.tsx`: **2/2** — título do produto simples e identificação do pai quando há variações.
- [ ] Sem Playwright autenticado para comparação visual, sem aparelho Android/Maestro e sem prova de leitores de tela/runtime nativo. Expo Web não foi usado como substituto. Sem acesso ou gravações remotas, alteração de dados, Meta, SEFAZ, migration ou deploy.
- [x] Regras consultadas: `AGENTS.md` (formulários RHF/Zod, validações permitidas e limite Conciliação ERP-only), `docs/geral/USER_RULES.md`, estrutura de Produto/Variação, mover/merge, arquitetura mobile offline-first, inventário de formulários, regra `product-reconciliation-erp-only.yml`, inventário e roadmap. Não há `AGENTS.md` aninhado nos diretórios do recorte. A skill de replicação foi consultada na única cópia disponível no cache de backup `.vercel/builders-backup-72ebb3b0`; `.agents/skills` e `skills/` canônicos não existem no checkout, portanto a cópia foi usada somente como orientação.

**Conclusão do recorte:** cabeçalho da seção de precificação no estado simples/família agora corresponde ao ERP. Nenhuma diferença funcional de preço foi alterada neste ciclo. A auditoria geral permanece aberta; próxima execução deve selecionar outro estado ainda não fechado do formulário de Produto e manter pendente a validação visual/nativa autenticada.

### Ciclo 359 — descontos auxiliares no snapshot de rascunho — 25/10/2026

**Recorte:** contrato de persistência dos campos `% Desconto` e `R$ Desconto` do produto pai durante autosave de rascunho.

#### Comparação e correção

- [x] O ERP mantém `discountPercent` e `discountFixed` no estado local de `useProductFormPricing`; o objeto proprietário do Produto recebe somente `unitPrice` e `promoPrice`.
- [x] No app, os campos auxiliares ficam no `formData`. Como `createMobileProductFormSchema` usa `passthrough`, o autosave os levava ao helper `createProductDraftSnapshot` e, então, ao JSON `technical_specs.draftProduct`. Na reabertura, `ProductFormScreen` recalcula esses campos a partir de preço e promoção e sobrescreve os valores do snapshot. A diferença não alterava a tela reaberta, mas gravava estado auxiliar redundante que o ERP não persiste.
- [x] `shared-utils/productDraftSnapshot.ts` agora remove apenas os campos auxiliares do produto pai antes de serializar; preço de venda e preço promocional continuam no snapshot. Não alterei campos de desconto dentro das variações, regras de validação, cálculos, confirmação do autosave, versão/ACK, payload transacional nem comportamento de retomada.

#### Evidências, validação e limites

- [x] Comparação estática: `erp/src/pages/App/Products/hooks/form/useProductFormPricing.ts`, `shared-utils/mobileProductFormSchema.ts`, `mobile/src/features/products/screens/ProductFormScreen.tsx`, `mobile/src/features/products/services/mobileProductMutationService.ts` e `shared-utils/productDraftSnapshot.ts`.
- [x] Vitest mobile `mobileProductMutationService.test.ts`: **61/61**, incluindo ausência dos auxiliares no snapshot enviado pela RPC e preservação de `unitPrice`/`promoPrice`; teste ERP `productDraftSnapshot.test.ts`: **10/10**; `git diff --check` passou (avisos somente de normalização CRLF/LF).
- [x] Consultei `AGENTS.md`, `docs/geral/USER_RULES.md`, documentação vigente de estrutura e operações Produto/Variação, regra `product-reconciliation-erp-only.yml`, inventário de formulários, inventário de paridade, roadmap e a skill acessível. Não há `AGENTS.md` aninhado nos caminhos do recorte.
- [x] A skill `erp-web-to-mobile-replication` foi lida na cópia de cache em `erp/.vercel/builders-backup-72ebb3b0`; continua sem fonte canônica confirmada em `.agents/skills`/`skills` do projeto, portanto serviu somente como orientação.
- [ ] Sem comparação visual autenticada com Playwright ou validação em telefone físico Android/Maestro. Expo Web não foi usado como prova nativa. Nenhum banco local/remoto, dado operacional, Graph API, SEFAZ, migration ou deploy foi acessado neste ciclo.

**Conclusão do recorte:** os campos auxiliares do desconto do produto pai deixaram de ser serializados no snapshot de rascunho, igualando o contrato ao ERP sem afetar os valores persistidos de preço. A auditoria geral permanece aberta; validação visual autenticada/nativa e demais estados da aba continuam pendentes.

### Ciclo 360 — seleção e remoção de fornecedores no produto pai — 25/10/2026

**Recorte:** seleção de até três fornecedores, definição do fornecedor principal, aplicação dos padrões de IPI/frete e inclusão/remoção na aba Estoque e Precificação.

#### Comparação e conclusão

- [x] No ERP (`ProductSupplierField`), a seleção deduplica os IDs, limita o vínculo a três fornecedores, filtra pela origem de estoque do produto e usa busca local a partir de dois caracteres. O primeiro fornecedor selecionado é `mainSupplierId`/`supplierId`; ao remover o principal, o primeiro restante assume esses campos.
- [x] O app (`ProductFormPricesTab`) mantém os mesmos limites e resultados usando `getProductSupplierStockOrigin`, `supplierProvidesStockOrigin`, `matchesProductSupplierSearch` e `resolveProductSupplierPricingDefaults`, compartilhados com o ERP. O mapeamento do DTO snake_case fornece os mesmos defaults; zeros e `freightType: 'none'` permanecem valores explícitos. A remoção também promove o primeiro ID restante sem recalcular ou apagar defaults, como no ERP.
- [x] O ERP recalcula `finalPurchasePrice` ao aplicar os campos alterados via `calculateProductFinalPurchasePrice`; o app usa `resolveMobileProductFinalPurchasePrice`, adaptador que normaliza os formatos camelCase/snake_case e chama a mesma função compartilhada. Ambos mantêm a seleção no formulário proprietário e submetem o produto ao resolver RHF/Zod existente.
- [x] A inclusão de um fornecedor recém-criado também segue a mesma operação de seleção: o ERP encaminha o registro retornado por `PersonFormModal` a `addSupplier`; o app persiste via `SupplierFormModal`, atualiza a lista local e chama o mesmo handler de seleção da aba. Não encontrei diferença comprovada em limite, fornecedor principal, origem ou defaults que justifique mudança de código.
- [x] A UI web usa dropdown/portal e a mobile usa superfície touch; são adaptações de plataforma. O estado mobile separado de carregamento/erro/vazio e retry após falha/timeout continua documentado nos Ciclos 27 e 89. O serviço ERP atual entrega lista vazia no callback após falha de consulta, enquanto o app distingue falha de lista vazia; preservo a recuperação mobile já documentada.

#### Evidências, validação e limites

- [x] Inspeção estática: `erp/src/pages/App/Products/components/tabs/ProductSupplierField.tsx`, `ProductInventoryTab.tsx`, `personQueryService.ts`; `shared-utils/productSupplierStockOrigin.ts`, `productSupplierDisplayName.ts`, `productSupplierPricingDefaults.ts`, `productPurchasePricing.ts`; `mobile/src/features/products/modals/tabs/ProductFormPricesTab.tsx`, `domain/productPurchasePrice.ts` e `services/mobileSupplierService.ts`.
- [x] Consultei `AGENTS.md` (formulários e runners permitidos), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, a documentação de estrutura e operações Produto/Variação, o inventário de formulários e o roadmap. `rg --files -g AGENTS.md` encontrou apenas a regra raiz e a regra de `digital-catalog`; não há `AGENTS.md` aninhado nos diretórios deste recorte.
- [x] A skill `erp-web-to-mobile-replication` foi lida na única cópia localizada em cache de backup `erp/.vercel/builders-backup-72ebb3b0`; não foi confirmada como fonte canônica e foi usada somente como orientação.
- [ ] Sem alteração de código, não executei testes neste ciclo. Também não houve Playwright autenticado, comparação visual do app ou validação em aparelho Android/Maestro. Expo Web não comprova o runtime nativo; nenhum banco, serviço externo ou dado operacional foi acessado.

**Conclusão do recorte:** os contratos de adicionar/remover fornecedor, limitar a três, escolher o principal e aplicar padrões de IPI/frete permanecem equivalentes ERP/mobile pela lógica compartilhada. Nenhuma correção de produção foi necessária. Permanecem pendentes as provas visuais/nativas e os demais estados de Estoque e Precificação; a auditoria geral continua aberta.

### Ciclo 361 — deduplicação dos fornecedores vinculados no formulário — 25/10/2026

**Recorte:** interpretação da lista de fornecedores já vinculados ao produto na aba Estoque e Precificação; limite de três, chips, busca de fornecedores ainda não selecionados e remoção.

#### Comparação e correção

- [x] O ERP resolvia `supplierIds` com ordem estável, remoção de valores vazios e deduplicação por ID antes de renderizar os chips, filtrar opções, calcular o limite de três e processar adição/remoção.
- [x] O mapeamento mobile preserva `supplier_ids` recebido do produto, mas `ProductFormPricesTab` usava a lista sem deduplicar. A busca de metadados já usa `Set`, porém não é a fonte dos chips nem do limite desta aba. Assim, um registro legado com IDs repetidos podia ocupar vagas e exibir chips repetidos no app, divergindo do ERP.
- [x] Extraí a normalização existente do ERP para `shared-utils/productSupplierIds.ts` e passei ERP e mobile a reutilizar `normalizeProductSupplierIds`. A ordem e o fallback para `mainSupplierId`/`supplierId` foram preservados. Uma inclusão ou remoção continua gravando a lista efetivamente selecionada; não normalizei o payload de produtos intocados nem alterei o banco.
- [x] A alteração é restrita à seleção de fornecedores no formulário; defaults, cálculo, requisitos de fornecedor, schema/submissão RHF/Zod, autosave e payloads de outros campos não mudaram.

#### Evidências, validação e limites

- [x] Revisão estática: `erp/src/pages/App/Products/components/tabs/ProductSupplierField.tsx` já deduplicava por `Set`; `mobile/src/features/products/services/mobileProductFetchService.ts` hidrata o array sem normalização; `mobile/src/features/products/modals/tabs/ProductFormPricesTab.tsx` usava a lista direta nos chips/limite. O helper comum agora fornece o mesmo resultado aos dois clientes.
- [x] Vitest mobile focado `productSupplierIds.test.ts`: **3/3**, cobrindo deduplicação estável, remoção de valores vazios, fallback principal/legado e preservação do contrato em que uma lista presente tem precedência. `git diff --check` passou, com avisos apenas de normalização CRLF/LF em arquivos existentes.
- [x] Consultei `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, documentação de Produto/Variação e operações mover/merge, inventário de formulários, este inventário e roadmap. A busca por `erp-web-to-mobile-replication` em `.agents/skills`, `skills`, `C:\Users\mathe\.agents\skills` e `C:\Users\mathe\.codex\skills` não encontrou fonte atual; a cópia de cache de backup `erp/.vercel/builders-backup-72ebb3b0` foi lida apenas como orientação. Não há `AGENTS.md` aninhado nos diretórios deste recorte.
- [ ] Sem Playwright autenticado, validação visual mobile ou aparelho Android/Maestro. Expo Web não comprova runtime nativo. Nenhuma leitura/escrita remota, migration, Meta, SEFAZ ou deploy foi feita.

**Conclusão do recorte:** a lista vinculada de fornecedores, a busca e o limite de três agora tratam IDs repetidos da mesma forma em ERP e app, sem alterar os registros até uma interação explícita. Permanecem pendentes as provas visuais/nativas e os demais estados da aba; a auditoria geral continua aberta.

### Ciclo 362 — origem comercial do produto — 25/10/2026

**Recorte:** alternância entre “Adquirido de Terceiros” e “Fabricação Própria” na aba Estoque e Precificação, incluindo os efeitos sobre fornecedor, validação e CFOP.

#### Comparação e conclusão

- [x] ERP (`ProductInventoryTab`) e app (`ProductFormPricesTab`) derivam `isOwnProduction` com a mesma precedência: `merchandiseOrigin === 'own_production'`, `isOwnProduction === true` ou `fiscal.merchandiseOrigin === 'own_production'`.
- [x] Ambos atualizam `merchandiseOrigin`, `isOwnProduction` e `fiscal.merchandiseOrigin`. Ao alternar para fabricação própria, somente o CFOP base `5102` muda para `5101`; ao voltar para terceiros, somente `5101` muda para `5102`. Outros CFOPs existentes são preservados.
- [x] A seleção de fornecedores fica preservada no estado do formulário quando o painel é ocultado para fabricação própria; voltar para terceiros reexibe os mesmos fornecedores. O ERP limpa `validationErrors.mainSupplierId`; no app, `onSupplierValidationCleared` limpa o erro do fornecedor no formulário proprietário (`ProductFormScreen`). Rascunho/finalização continuam passando pelo resolver RHF/Zod do proprietário.
- [x] O aviso adicional de fabricação própria no app e o controle touch com `accessibilityState.selected` são adaptações visuais/acessíveis da plataforma; não mudam regra ou payload. O seletor web do ERP usa um grupo de botões.
- [x] Não foi encontrada diferença funcional comprovada neste estado; nenhuma alteração de produção foi necessária. A dúvida do usuário sobre o gate do Catálogo não se aplica a este controle de origem e permanece documentada nos Ciclos 303–306 (`productConfig` autoriza publicar/ocultar; rascunho e requisitos de publicação são condições independentes).

#### Evidências, validação e limites

- [x] Inspeção estática: `erp/src/pages/App/Products/components/tabs/ProductInventoryTab.tsx:98-143`, `ProductManufacturingTypeToggle.tsx:3-73`, `mobile/src/features/products/modals/tabs/ProductFormPricesTab.tsx:106-120,292-373` e `mobile/src/features/products/screens/ProductFormScreen.tsx:1375-1388`.
- [x] Consultei `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, estrutura de Produto/Variação, mover/merge, inventário de formulários, inventário de paridade, roadmap e skill acessível. Como a inspeção incluiu conversão de CFOP, consultei também `docs/fiscal/README.md`, invariantes e históricos fiscais vigentes, conforme a regra raiz. Não há `AGENTS.md` aninhado nos diretórios ERP/mobile/shared-utils deste recorte. A skill de replicação continua localizada somente em cache de backup `.vercel`; foi usada como orientação, sem tratá-la como fonte canônica.
- [x] Sem alteração de código, não executei testes. Não houve Playwright autenticado, comparação visual em aparelho Android/Maestro, consulta ou escrita remota, chamada externa, migration ou deploy. Expo Web não foi usado como prova de comportamento nativo.

**Conclusão do recorte:** a alternância de origem comercial e seus efeitos sobre fornecedor, erro de validação e CFOP correspondem entre ERP e app. Permanecem pendentes outros estados da aba e as validações visuais/nativas; a auditoria geral continua aberta.

### Ciclo 363 — abas de cadastro para Serviço — 25/10/2026

**Recorte:** visibilidade da aba Estoque e Precificação no formulário de Produto quando `itemType = 'service'`, incluindo troca de tipo com a aba de Estoque aberta.

#### Comparação e conclusão

- [x] O ERP exclui, para Serviço, as abas e superfícies de Estoque e Precificação, Variações, Características, Descrição e Galeria; mantém Informações Básicas e Tributário/NF. O cabeçalho usa `isService` derivado do estado canônico do formulário e `ProductFormTabContent` não renderiza esses conteúdos para Serviço.
- [x] O app aplica as mesmas condições em `TABS`: Fotos, Características, Descrição e Estoque exigem item diferente de Serviço; Variações usa `shouldShowMobileProductVariationsTab`; Tributário/NF continua disponível para Serviço. Ao carregar `product`, `ProductFormScreen` normaliza o tipo persistido (`item_type`/`itemType`) para `formData.itemType`, campo canônico usado pelas condições das abas.
- [x] Se a mudança do tipo deixar a aba atual invisível, o efeito de `ProductFormScreen` retorna o foco a Informações Básicas, evitando manter uma superfície de Estoque inacessível para o tipo Serviço. O fluxo não substitui nem ignora o resolver RHF/Zod do formulário proprietário.
- [x] A navegação horizontal nativa e o cabeçalho web são adaptações de plataforma. Não encontrei diferença funcional comprovada nem motivo para alterar código.

#### Evidências, validação e limites

- [x] Inspeção estática: `erp/src/pages/App/Products/components/form/ProductFormHeader.tsx:37-65`, `ProductFormTabContent.tsx:114-200`, `erp/src/pages/App/Products/hooks/form/useProductFormModal.ts:103-108`; `mobile/src/features/products/screens/ProductFormScreen.tsx:113-151,327-342,417-431,1121-1154`.
- [x] Consultei `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, estrutura Produto/Variação, operações mover/merge, notas de arquitetura mobile, inventário de formulários, inventário de paridade, roadmap e a skill acessível. A busca não encontrou `AGENTS.md` aninhado em `erp/`, `mobile/` ou `shared-utils`; a cópia da skill em `.vercel/builders-backup-72ebb3b0` continua sendo apenas cache/orientação, sem fonte canônica localizada.
- [x] Sem mudança de código, não executei testes. Não houve Playwright autenticado, teste Android/Maestro, acesso remoto, mutation, migration ou deploy. Expo Web não comprovaria comportamento nativo.

**Conclusão do recorte:** Serviço não oferece a aba Estoque e Precificação em nenhum cliente. As condições das abas e o retorno à aba Geral ao alterar o tipo são equivalentes pelo estado canônico carregado; nenhuma correção de produção foi necessária. A auditoria geral permanece aberta.

### Ciclo 364 — prontidão individual da variação no formulário principal — 25/10/2026

**Recorte:** checklist ERP/Catálogo exibido junto à linha de cada variação no formulário mobile, incluindo a leitura do preço efetivo e a validação individual da linha.

#### Comparação e conclusão

- [x] No ERP, `VariationFormModal` projeta o pai e a variação com `getEffectiveProductForVariationReadiness` e chama os verificadores compartilhados `checkERPLegibility` e `checkEcomLegibility` para o cabeçalho.
- [x] No app, `ProductFormVariationsTab` monta a mesma projeção compartilhada e `getMobileProductReadiness` chama `checkProductErpLegibility` e `checkEcomLegibility`, as mesmas regras de domínio. O preço exibido na linha é resolvido por `resolveProductVariationPricing`, compartilhado.
- [x] A regra compartilhada do indicador trata o preço de um pai em modo família como prontidão da família (existência de variações), não como confirmação individual do preço de cada linha. Esse comportamento é igual nos dois clientes; a submissão revalida cada variação separadamente com `getVariationRegistrationIssue` no ERP e `getMobileVariationRegistrationIssue`/schema RHF-Zod no app. Assim, o alias interno `unitPrice` não foi alterado apenas no mobile nem convertido em uma nova regra de interface.
- [x] Nenhuma diferença suportada ERP→mobile foi comprovada neste estado; sem alteração de produção ou de teste. Uma eventual mudança do significado do indicador deve partir de regra comum e alcançar ERP e app, fora desta correção de paridade.

#### Evidências, validação e limites

- [x] Inspeção estática: `erp/src/pages/App/Products/modals/VariationFormModal.tsx:139-144`, `erp/src/pages/App/Products/hooks/variation/variationFormSubmitRules.ts:45-107`, `mobile/src/features/products/modals/tabs/ProductFormVariationsTab.tsx:587-637`, `mobile/src/features/products/domain/productRegistrationRules.ts:40-95`, `shared-utils/productErpLegibility.ts` e `shared-utils/productVariationPricing.ts`.
- [x] Regras e fontes consultadas: `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, `docs/decisoes/adr-004-offline-first-eventos-atomicos-mobile.md`, `docs/forms/inventario-mobile-catalogo-2026-10-15.md`, este inventário, roadmap e skill de replicação acessível. A busca encontrou apenas o `AGENTS.md` raiz para os diretórios ERP/mobile/shared-utils deste recorte. A skill continua ausente em `.agents/skills` e `skills/` canônicos; a cópia em `erp/.vercel/builders-backup-72ebb3b0` foi usada somente como orientação.
- [ ] Sem mudança de código, não executei testes. Não houve Playwright autenticado, renderização visual do app ou teste em Android/Maestro; Expo Web não comprovaria runtime nativo. Sem consulta/escrita remota, Meta, SEFAZ, migration ou deploy.

**Conclusão do recorte:** os verificadores e as projeções usados pelo indicador de variação correspondem entre ERP e app. A regra compartilhada do checklist da família não representa validação de preço por linha; a submissão fornece essa validação separada nos dois clientes. Não há correção de paridade neste recorte. A auditoria geral permanece aberta.

### Ciclo 365 — leitura da disponibilidade calculada de composições na lista — 25/10/2026

**Recorte:** saldo exibido para composição simples e família de composição nas páginas da lista e no carregamento de produto completo.

#### Comparação e exceção de segurança

- [x] ERP (`applyCompositionAvailability`) e app (`applyMobileCompositionAvailability`) consultam os saldos atuais dos produtos e variações componentes com limite de 10 segundos. Se a leitura falha, excede o limite ou não há componentes referenciados, ambos exibem disponibilidade zero; a projeção não é salva em `products.stock` nem em `product_variations.stock`.
- [x] Os dois integram as linhas do pai como fallback para variações sem composição própria, calculam o mínimo de kits montáveis pelo helper compartilhado `calculateCompositionAvailability` e somam a disponibilidade das variações quando alguma delas tem composição própria. As chamadas ocorrem depois da leitura/paginação; o app aplica o cálculo tanto ao resumo quanto ao resultado completo.
- [x] Encontrei uma divergência restrita a dados inválidos: o ERP agrega primeiro quantidades de linhas repetidas para o mesmo produto/variação e só depois verifica se o total é positivo; o app rejeita cada quantidade não finita ou menor/igual a zero antes de agregar. Assim, linhas duplicadas inválidas de `-1` e `2` para o mesmo componente poderiam mostrar disponibilidade positiva no ERP e zero no app.
- [x] Os schemas de operação não aceitam quantidades negativas; ao concluir, as validações compartilhadas exigem quantidade mínima 1. A divergência só alcança registros legados/corrompidos, fora do fluxo suportado de gravação. Mantive o app em modo fail-closed: copiar o cálculo permissivo nesse caso poderia anunciar kits vendáveis sem saldo válido. Registrei a diferença como exceção de segurança e possível correção interna do ERP, não como funcionalidade ausente no app.
- [x] A consulta Supabase é específica de cada serviço, enquanto a regra matemática principal já é compartilhada. Não há necessidade de duplicar ou mover a integração ao mobile.

#### Evidências, validação e limites

- [x] Revisão estática de `erp/src/pages/utils/productService/productQueryService.ts:21-112,148-152,249-292`, `mobile/src/features/products/services/mobileProductFetchService.ts:115-219,451-456,736-741`, `shared-utils/compositionMath.ts`, `shared-utils/productVariationValidation.ts`, `shared-utils/mobileProductFormSchema.ts` e `mobile/src/features/products/services/mobileProductFetchService.test.ts:1515-1553`.
- [x] O teste mobile existente confirma disponibilidade zero para quantidade inválida igual a zero; a leitura estática confirma a defesa mobile para qualquer linha inválida. Nenhum código mudou neste ciclo, portanto não executei runner.
- [x] Regras consultadas: `AGENTS.md` (RHF/Zod, runners permitidos, preservação de saldo físico e limite Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, documentação de Produto/Variação e de mover/merge, notas offline-first, inventário e roadmap. Não há `AGENTS.md` aninhado nos diretórios deste recorte. A skill de replicação continua acessível apenas no cache de backup `.vercel`, sem fonte canônica confirmada; foi usada apenas como orientação.
- [ ] Sem Playwright autenticado, Android físico/Maestro ou prova com banco remoto; não houve gravação, Meta, SEFAZ, migration ou deploy. Revisão estática e teste existente não demonstram o saldo de registros operacionais remotos.

**Conclusão do recorte:** para dados válidos, a disponibilidade calculada e seus estados de falha são equivalentes. Em dados malformados, o app falha fechado e evita possível inflação de disponibilidade; preservei essa adaptação e registrei a permissividade residual do ERP para eventual correção comum. Não há alteração de produto/app neste ciclo. A auditoria geral permanece aberta.

### Ciclo 366 — preço e saldo nas linhas expandidas de variação — 25/10/2026

**Recorte:** valores de preço regular, promoção e estoque mostrados por variação ao expandir uma família na lista de Produtos.

#### Comparação e conclusão

- [x] ERP transforma as variações por `flattenProductsForList` e chama `resolveProductVariationPricing` para resolver preço regular e promoção independentemente conforme cada flag de herança; `ProductCardVariationItem` só trata como promoção um valor positivo inferior ao preço efetivo.
- [x] O app mapeia `use_parent_price`/`use_parent_promo_price` para flags camelCase e materializa os valores efetivos do pai ou da variação em `mobileProductFetchService`; `MobileProductVariationCard` apresenta esses valores e aplica a mesma condição para o preço promocional. A linha não depende de preço calculado localmente no componente visual.
- [x] A apresentação de estoque por linha também coincide: ambos usam `variation.stock` com fallback visual zero. Para composições, o dado chega da projeção de disponibilidade da lista auditada no Ciclo 365. A família mantém preço/estoque no nível dos filhos; os cards pais de múltiplas variações omitem esse rodapé nos dois clientes.
- [x] O ERP mantém testes de preço próprio zero com promoção herdada e preço regular herdado com promoção própria em `ProductCardVariationItem.test.tsx`; os testes mobile do fetch confirmam os valores efetivos e flags de herança em `mobileProductFetchService.test.ts`. A inspeção não mostrou um ramo suportado no qual a projeção diverge.
- [x] Nenhuma mudança de código foi necessária. Permissões de Catálogo, variação mesclada, menu e ações da linha não foram reabertas neste recorte; permanecem documentadas em ciclos próprios.

#### Evidências e limites

- [x] Comparação estática: `erp/src/pages/App/Products/ProductList/utils/catalog/productListTransformers.ts:50-80,95-138`, `erp/src/pages/App/Products/ProductList/components/Variations/ProductCardVariationItem.tsx:78-98,177-187`, `mobile/src/features/products/services/mobileProductFetchService.ts:510-552,600-620` e `mobile/src/features/products/components/MobileProductVariationCard.tsx:84-89,152-170`.
- [x] Consultei `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, estrutura Produto/Variação, operações mover/merge, notas offline-first, inventário de formulários, este inventário, roadmap e skill acessível. Não há `AGENTS.md` aninhado aplicável em ERP/mobile/shared-utils; a skill de replicação segue disponível somente no cache `.vercel` sem origem canônica confirmada e foi usada apenas como orientação.
- [ ] Sem alteração de código, não executei testes. Os testes existentes foram inspecionados, não reexecutados. Sem Playwright autenticado ou Android físico/Maestro; Expo Web não comprovaria comportamento nativo. Nenhuma consulta/gravação remota, migration, Meta, SEFAZ ou deploy.

**Conclusão do recorte:** preços efetivos e estoque exibidos em cada linha expandida seguem a mesma projeção de pai/variação e a mesma condição de promoção em dados válidos. Nenhuma diferença ERP→app requer correção neste estado. A auditoria geral permanece aberta.

### Ciclo 367 — consulta somente leitura de produto e variação — 25/10/2026

**Recorte:** conteúdo apresentado ao selecionar “Ver detalhes” para um produto ou uma variação, sem abrir o formulário de edição.

#### Comparação e conclusão

- [x] Os dois modais apresentam título, primeira imagem, preço promocional quando válido, saldo, estado Ativo/Inativo, descrição, Código, Categoria, Marca, Linha/Modelo, Cor, Material, dimensões e peso. O app aceita aliases legados adicionais (`color`, formatos snake_case e imagem em string) para dados já normalizados; isso amplia a tolerância de leitura sem alterar o contrato ERP.
- [x] Ambos exibem características do registro e, quando houver, nome, SKU, preço e estoque das variações. Para a variação, ERP e app normalizam o nome com `normalizeProductVariationName`; a precedência de preço do modal continua igual (preço promocional efetivo, preço da variação, fallback para o pai), e o saldo vem da mesma projeção de lista.
- [x] O objeto de leitura não executa mutações. ERP abre `ProductDetailsModal` quando recebe `viewingProduct`; o app passa `detailsProduct` ao `MobileProductDetailsModal` e só o exibe enquanto `canViewDetails` está autorizado. A ação do app é encaminhada pelas linhas/cartões correspondentes; não abre Conciliação nem formulário de edição.
- [x] Modal central com clique externo/Escape no ERP e folha inferior com safe-area/botão de voltar no mobile são adaptações de plataforma. Não alteram os campos ou os dados consultados. Não encontrei diferença suportada que justifique mudança de código.

#### Evidências e limites

- [x] Comparação estática: `erp/src/pages/App/Products/modals/ProductDetailsModal.tsx:14-188`, `erp/src/pages/App/Products/modals/ProductsModalsContainer.tsx:28-55,100-108`, `mobile/src/features/products/modals/MobileProductDetailsModal.tsx:15-210`, `mobile/src/features/products/screens/NativeProductsScreen.tsx:88-92,650-653,724-729`, `mobile/src/features/products/services/mobileProductFetchService.ts:510-552,600-628` e `shared-utils/productVariationNameValidation.ts:19-28`.
- [x] Consultei `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, estrutura Produto/Variação, operações mover/merge, arquitetura offline-first, inventário de formulários, inventário de paridade, roadmap e skill de replicação acessível. A skill continua disponível apenas no cache `.vercel` (backup de build) sem origem canônica confirmada; usei-a como orientação. Não há `AGENTS.md` aninhado aplicável aos diretórios ERP/mobile/shared-utils deste recorte.
- [ ] Não encontrei teste dedicado para os dois modais. Sem alteração de código, não executei teste. Não houve Playwright autenticado, teste Android físico/Maestro nem acesso remoto; Expo Web não comprovaria a adaptação nativa. Nenhuma consulta/escrita em banco, chamada Meta/SEFAZ, migration ou deploy.

**Conclusão do recorte:** a visualização somente leitura cobre os mesmos dados de Produto e Variação. Ações e fechamentos diferem conforme a plataforma e a autorização, mas não a informação principal; nenhuma correção de paridade foi necessária. A auditoria geral permanece aberta.

### Ciclo 368 — consulta de Serviço no modal de detalhes — 25/10/2026

**Recorte:** visualizar detalhes de um Serviço pela lista, incluindo campos de preço/estoque, características e a disponibilidade do modal para perfis somente de leitura.

#### Comparação e conclusão

- [x] `ProductDetailsModal` e `MobileProductDetailsModal` não criam um formato alternativo para `itemType = service`: ambos mostram o preço efetivo (com promoção válida), o saldo informado ou zero, estado ativo, descrição e os mesmos detalhes gerais; características e linhas de variação aparecem somente se os dados vierem preenchidos.
- [x] A regra de domínio exclui Serviço da invariante “todo Produto possui variação”; assim, um Serviço sem variações não ganha linhas fictícias no modal. Nenhum modal usa `item_type` para apresentar estoque, preço ou atributos com outra semântica. O rótulo “Estoque” é, portanto, igual nos dois clientes, ainda que o valor de um Serviço possa ser zero/ausente.
- [x] No ERP, `openEditProduct(p, readOnly)` direciona registros em modo somente leitura para `viewingProduct`, e o container renderiza o modal. No app, o acesso ao modal exige `canViewDetails`, que é ocultado para perfil exclusivo de etiquetas e depende de leitura do catálogo ou das composições; o modal é desmontado quando a permissão não está presente. Não há mutação nesse fluxo.
- [x] A folha inferior e a área segura do React Native seguem como adaptação de plataforma, enquanto o ERP usa modal central. Nenhuma diferença funcional de Serviço foi comprovada nesse recorte; sem mudança de código.

#### Evidências, validação e limites

- [x] Inspeção estática de `erp/src/pages/App/Products/modals/ProductDetailsModal.tsx:14-188`, `erp/src/pages/App/Products/hooks/useProductsModals.ts:32-53`, `erp/src/pages/App/Products/modals/ProductsModalsContainer.tsx:100-108`, `mobile/src/features/products/modals/MobileProductDetailsModal.tsx:34-210`, `mobile/src/features/products/screens/NativeProductsScreen.tsx:89-92,724-729`, `mobile/src/features/products/components/MobileProductCard.tsx:279-291` e `docs/negocio/produtos/estrutura-produto-variacao.md`.
- [x] Consultei `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, a documentação vigente de estrutura Produto/Variação e mover/merge, este inventário, roadmap e a skill `erp-web-to-mobile-replication` acessível. Não há `AGENTS.md` aninhado em `erp/`, `mobile/`, `shared-utils/`, `docs/` ou `rules/`; a skill segue localizada somente na cópia de cache de build `.vercel`, sem origem canônica confirmada, e foi usada apenas como orientação.
- [ ] Sem alteração de código, não executei testes. Não houve Playwright autenticado ou Android físico/Maestro; Expo Web não comprovaria o comportamento nativo. Nenhuma leitura/escrita remota, chamada Meta/SEFAZ, migration ou deploy.

**Conclusão do recorte:** a consulta de Serviço usa os mesmos campos e as mesmas condições de conteúdo em ERP e app; o app preserva a autorização da ação e a adaptação nativa não muda a regra. Nenhuma correção ERP→app necessária neste estado. A auditoria geral permanece aberta.

### Ciclo 369 — finalização de Produto simples sem preço de venda — 25/10/2026

**Recorte:** conclusão de Produto simples (uma variação única herdando o preço do pai) quando o preço de venda está ausente ou zerado; estado de bloqueio, retorno à precificação e mensagem.

#### Comparação e conclusão

- [x] A regra do domínio define Produto simples como pai com exatamente uma variação operacional, cuja precificação é herdada do pai. O ERP valida o preço efetivo dessa variação via `getVariationRegistrationIssue`/`checkProductErpLegibility` e converte o erro para `unitPrice`, selecionando a aba Estoque e Precificação. O formulário RHF/Zod bloqueia a submissão antes de chamar o serviço.
- [x] No app, `createMobileProductFormSchema` valida que exista preço vendável no pai ou na variação única e emite erro no campo raiz `estoque`; a revalidação de registro da própria variação também rejeita preço efetivo não positivo. `presentValidationErrors` preserva o erro de preço, destaca o campo e abre a aba Estoque e Precificação antes de qualquer `onSave`.
- [x] Para o caminho de preço ausente/zero, a mensagem apresentada pelo ERP e a mensagem resolvida para o alerta mobile são `Por favor, informe o Preço de Venda do produto na aba Estoque e Precificação.`. O título/estilo do toast web e do alerta nativo são adaptações de plataforma. Não encontrei diferença funcional comprovada nem mudança necessária.
- [x] O estado de família multi-variação e preço próprio de filho não foi incluído; ele possui ciclo e roteamento próprios (Ciclo 24). Rascunho, fornecedor, fotos e demais pré-requisitos não foram alterados neste recorte.

#### Evidências, validação e limites

- [x] Inspeção estática: `shared-utils/productDomainValidation.ts:35-125`, `shared-utils/productErpLegibility.ts:70-118`, `shared-utils/productVariationRules.ts`, `erp/src/pages/App/Products/hooks/form/productFormValidation.ts:23-64,145-211`, `erp/src/pages/App/Products/hooks/form/useProductFormSubmit.ts:92-117`, `shared-utils/mobileProductFormSchema.ts:225-274`, `mobile/src/features/products/domain/productRegistrationRules.ts:150-207`, `mobile/src/features/products/domain/mobileProductFormErrorNavigation.ts:25-159` e `mobile/src/features/products/screens/ProductFormScreen.tsx:738-755,964-1070`.
- [x] Vitest focado: mobile `mobileProductFormSchema.test.ts` + `mobileProductFormErrorNavigation.test.ts`: **60/60**; ERP `productFormValidation.test.ts` + `useProductFormSubmit.test.tsx`: **31/31**. O segundo grupo emite `stderr` de falhas de salvamento simuladas previstas pelos testes, que também passaram.
- [x] Consultei `AGENTS.md` (RHF/Zod e runners permitidos), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, estrutura Produto/Variação, operações mover/merge, inventário de formulários, este inventário, roadmap e a skill de replicação disponível. Não há `AGENTS.md` aninhado nos diretórios ERP/mobile/shared-utils; a skill segue acessível somente na cópia de cache `.vercel`, sem origem canônica confirmada, usada apenas como orientação.
- [ ] Sem alteração de código. Não houve Playwright autenticado, teste Android físico/Maestro ou prova remota; Expo Web não comprova runtime nativo. Nenhum dado remoto, Meta/SEFAZ, migration ou deploy foi acessado.

**Conclusão do recorte:** ao concluir um Produto simples sem preço positivo, ERP e app impedem o salvamento, devolvem o operador à aba de precificação e orientam a informar o preço. A validação móvel permanece no resolver RHF/Zod do formulário proprietário; não foi adicionada submissão paralela. Nenhuma diferença ERP→app a corrigir neste estado. A auditoria geral permanece aberta.

### Ciclo 370 — consulta inicial autenticada da lista de Produtos — 25/10/2026

**Recorte:** estado inicial da lista padrão do ERP, sem aplicar busca, filtros ou ações; conferência estática do mesmo contrato inicial no app.

#### Comparação e conclusão

- [x] Playwright visível autenticou no ambiente de desenvolvimento e abriu `/products`; a lista terminou de carregar com **15 linhas** no DOM. A inspeção foi somente leitura, não abriu formulários nem acionou controles. Não houve request para `/api/nfe/inbound-manifestation` nesta sessão.
- [x] No ERP, o estado inicial de `useProductsPageState` usa filtros vazios; `useProducts` envia página 1 com 15 itens, inclui desativados por padrão, exclui produtos de teste, mantém ordenação `created_at DESC` e deixa o status e a categoria sem filtro.
- [x] No app, `DEFAULT_MOBILE_PRODUCT_LIST_FILTERS` inicia com status `all`, exibição de desativados, categoria vazia, Catálogo `all`, tipo geral `all` e teste oculto; `useMobileProducts` também começa na página 1 com 15 itens. A consulta mobile ordena `created_at DESC`; as opções de tamanho `[10, 15]` vêm do schema compartilhado. A inclusão de composições na lista padrão segue a permissão já auditada nos Ciclos 29–30.
- [x] Para este estado inicial, não encontrei divergência de contrato ou paginação; nenhuma mudança de código foi necessária. A interpretação do usuário sobre `productConfig` permanece: o controle de publicar/ocultar fica desabilitado para quem não tem permissão; isso não bloqueia salvar produto ainda oculto. Rascunho e conformidade continuam sendo condições independentes de publicação (Ciclos 303–306/350).

#### Evidências, validação e limites

- [x] Playwright headed/in-memory: rota `/products`, título `ERP Móveis Morante`, 15 linhas, dois campos de entrada, sem request à rota de manifestação NF-e. A sessão permanece aberta para inspeção; valores de credenciais não foram mostrados, salvos ou incluídos em artefatos.
- [x] Inspeção estática: `erp/src/pages/App/Products/hooks/useProductsPageState.ts:30-36`, `erp/src/pages/App/Products/ProductList/hooks/data/useProducts.ts:58-105`, `erp/src/pages/utils/productService/productQueryService.ts:159-190`, `mobile/src/features/products/domain/mobileProductListFilters.ts:5-12`, `mobile/src/features/products/hooks/useMobileProducts.ts:48-96,168-222`, `mobile/src/features/products/services/mobileProductFetchService.ts:223-346` e `shared-utils/listingFormSchemas.ts:6-9`.
- [x] Consultei `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, estrutura Produto/Variação, operações mover/merge, ADR offline-first, este inventário, roadmap e a skill acessível de replicação. Não há `AGENTS.md` aninhado aplicável. A skill permanece disponível somente no backup `.vercel`, sem origem canônica confirmada, e foi usada como orientação.
- [ ] Sem mudança de código, não executei Vitest/RTL. Esta leitura autenticada do ERP não valida runtime nativo Android/iOS; Expo Web não foi usado como substituto. Não houve escrita de dados comerciais, chamada Meta/SEFAZ, migration ou deploy.

**Conclusão do recorte:** o estado inicial autenticado da lista exibiu uma página de 15 linhas e corresponde aos defaults de consulta inspecionados no app. A validação abrange apenas a primeira página sem filtros; busca, filtros, outras páginas e runtime nativo continuam cobertos por ciclos próprios ou pendentes. A auditoria geral permanece aberta.

### Ciclo 371 — ação de históricos na lista de Produtos — 25/10/2026

**Recorte:** possibilidade de abrir os históricos de preço e de lotes a partir da lista de Produtos; comparação do modal ERP, do encadeamento de ações e do menu mobile.

#### Comparação e conclusão

- [x] O ERP mantém `PriceHistoryModal`, com abas de preços e lotes. A aba de preços consulta `product_price_history`; a de lotes consulta entradas de `inventory_moves`, calcula saldos residuais e permite editar quantidade/custo pelo serviço `updateInventoryMove`. O modal aplica RHF/Zod, timeout e bloqueio de repetição após resultado incerto.
- [x] A abertura atualmente não chega a nenhum controle do ERP: `Index.tsx` passa `openShowHistory` para `ProductList`; a lista repassa `onShowHistory` às superfícies de tabela/cards/variações, porém os componentes terminais não o consomem. `ProductRowActionsCell` declara o prop mas não o encaminha a `ParentProductActions`; `ProductCardActions` e `VariationItemActions` também não o extraem nem invocam. A busca no módulo não encontrou chamada de `onShowHistory` nem outra montagem do modal além de `ProductsModalsContainer`.
- [x] O app não oferece histórico de preço/lotes em `MobileProductActionsMenu`; ambos os clientes têm consulta de pedidos vinculados e etiqueta de preço. Como o modal ERP está sem entrada funcional na lista, a ausência móvel não comprova diferença de paridade e não justifica expor no app uma consulta que também carrega edição de custo e quantidade de lote. Nenhuma alteração foi feita.
- [x] Este registro não inclui histórico de vendas/pedidos vinculados, edição de preços do produto, etiquetas ou movimentação de estoque iniciada pelas telas próprias de Estoque.

#### Evidências, validação e limites

- [x] Inspeção estática: `erp/src/pages/App/Products/modals/PriceHistoryModal.tsx:23-24,59-117`, `erp/src/pages/App/Products/priceHistory/priceHistoryService.ts:14-80`, `erp/src/pages/App/Products/hooks/useProductsModals.ts:114-117`, `erp/src/pages/App/Products/Index.tsx:145`, `erp/src/pages/App/Products/ProductList/index.tsx:191`, `erp/src/pages/App/Products/ProductList/components/Table/ProductRow.tsx:174`, `erp/src/pages/App/Products/ProductList/components/Table/ProductRowActionsCell.tsx:34-35,42-71`, `erp/src/pages/App/Products/ProductList/components/Card/ProductCardHeader.tsx:231`, `erp/src/pages/App/Products/ProductList/components/Card/ProductCardActions.tsx:26,39-52`, `erp/src/pages/App/Products/ProductList/components/Variations/ProductCardVariationItem.tsx:244` e `erp/src/pages/App/Products/ProductList/components/Variations/VariationItemActions.tsx:26,28-38`; app: `mobile/src/features/products/components/MobileProductActionsMenu.tsx:169-181`.
- [x] Consultei as instruções de `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, documentação de estrutura e operações de produtos, arquitetura offline-first, inventário de formulários, roadmap, este inventário e a skill de replicação acessível. Não há `docs/AGENTS.md` ou `docs/produtos/AGENTS.md`. A skill segue ausente das pastas canônicas do workspace e disponível somente na cópia de backup `.vercel`; sua origem canônica não foi confirmada e ela foi usada apenas como orientação.
- [ ] Sem alteração de código: não executei Vitest/RTL nem interagi com dados remotos. A lista ERP autenticada já estava aberta desde o Ciclo 370; este recorte foi concluído pela inspeção do grafo de props e serviços. Não foi feita comparação visual/nativa do modal, pois ele não tem ação alcançável no ERP. Nenhuma gravação comercial, chamada Meta/SEFAZ, migration ou deploy.

**Conclusão do recorte:** existe implementação ERP de históricos, mas ela não está conectada a uma ação acessível na lista. A ausência correspondente no app não é diferença suportada pelo ERP ativo. Se o modal voltar a ser conectado no ERP, seu contrato de leitura e também a edição de lotes devem ser reavaliados antes de qualquer réplica mobile. A auditoria geral permanece aberta.

### Ciclo 372 — atalho de movimentação de estoque na lista de Produtos — 25/10/2026

**Recorte:** possibilidade de abrir o lançamento manual de entrada, saída ou ajuste diretamente a partir de um produto/variação na lista; verificação do alvo especial de Produto Composto e da superfície mobile.

#### Comparação e conclusão

- [x] O ERP tem `openLaunchStock`, que prepara o pai ou a variação e controla `StockLaunchModal`. O modal permite lançamento manual de entrada/saída/ajuste para item comum; para Produto Composto, substitui o formulário por orientação de que o saldo é calculado e a movimentação deve ocorrer nos componentes. O formulário usa `stockLaunchFormSchema`, `saveInventoryMove`, leitura das movimentações para saldo e bloqueio em resultado incerto.
- [x] A lista tipa e encaminha `onLaunchStock`, mas nenhum controle terminal o executa. Na tabela, `ProductRowActionsCell` passa a prop para `ParentProductActions`, cujo tipo a declara, mas a implementação não a extrai nem renderiza ação. Nos cards, `ProductCardHeader` encaminha a prop para `ProductCardActions`, que também a declara sem a consumir. A lista de variações mantém o prop até `VariationItemActions`, que não o extrai nem invoca. `openLaunchStock` e o modal, portanto, não são alcançáveis pelas ações atuais de Produtos.
- [x] O menu de ações do app não tem atalho de lançamento manual de estoque por produto/variação. Essa ausência não comprova diferença ERP→app porque a entrada correspondente do ERP está desconectada. Não acrescentei uma rota de escrita alternativa ao mobile; estoque físico continua pertencendo às movimentações e aos fluxos de Estoque. Para composições, a documentação vigente também proíbe gravar a disponibilidade calculada como saldo físico, e o modal órfão mostra componentes como único alvo operacional.
- [x] Não alterei o guia prático de Estoque: nenhum passo ou ação operacional foi modificado; apenas registrei que o suposto atalho da lista não está ativo.

#### Evidências, validação e limites

- [x] Inspeção estática: `erp/src/pages/App/Products/hooks/useProductsModals.ts:119-126`, `erp/src/pages/App/Products/Index.tsx:146,205`, `erp/src/pages/App/Products/modals/ProductsModalsContainer.tsx:92-97`, `erp/src/pages/App/Stock/modals/StockLaunchModal.tsx:15-43,49-138`, `erp/src/pages/App/Products/ProductList/components/Table/ProductRowActionsCell.tsx:35,46-65,91-109`, `erp/src/pages/App/Products/ProductList/components/Table/ProductRowActions/ParentProductActions.tsx:33` e a implementação do componente, `erp/src/pages/App/Products/ProductList/components/Card/ProductCardHeader.tsx:232`, `erp/src/pages/App/Products/ProductList/components/Card/ProductCardActions.tsx:27` e seu destructuring, `erp/src/pages/App/Products/ProductList/components/Variations/VariationItemActions.tsx:27` e seu destructuring; no app: `mobile/src/features/products/components/MobileProductActionsMenu.tsx`, `mobile/src/features/products/screens/NativeProductsScreen.tsx:636-666`, além da arquitetura de estoque em `docs/mobile/arquitetura_offline_first.md` e da regra de saldo físico em `docs/negocio/produtos/estrutura-produto-variacao.md`.
- [x] Consultei as regras vigentes de `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, documentação de Produto/Variação e mover/merge, nota offline-first, inventário de formulários, inventário de paridade, roadmap e skill de replicação acessível. A regra de RHF/Zod e a restrição de runners continuam respeitadas; não houve código alterado. A skill segue disponível somente na cópia de backup `.vercel`, sem origem canônica confirmada, e foi usada apenas como orientação.
- [ ] Sem teste ou automação de UI: este recorte identifica um callback não consumido pelo código e não altera comportamento. A lista autenticada permaneceu aberta desde o Ciclo 370, sem interação neste ciclo; não usei Expo Web como prova nativa. Não houve escrita remota, atualização do guia, migration, Meta/SEFAZ ou deploy.

**Conclusão do recorte:** o código ERP contém um modal de lançamento de estoque e seus handlers, mas nenhuma ação ativa na lista chega a ele. A ausência do atalho no app não é diferença suportada pelo ERP atual. Se o ERP voltar a conectar esse atalho, será necessário comparar a operação RHF/Zod, permissões, saldo e composição antes de considerar a réplica mobile. A auditoria geral permanece aberta.

### Ciclo 373 — impressão de etiquetas na lista de Produtos — 26/10/2026

**Recorte:** ações de etiquetas de identificação e de preço para Produto simples, pai com variações e linha de variação; gates de perfil e destino da ação móvel.

#### Comparação e conclusão

- [x] No ERP, linhas em modo somente leitura oferecem apenas **Detalhes** para perfis comuns; a ação de etiquetas fica no menu de perfis que podem editar Produtos. Etiqueta de identificação exige `printProductIdentificationLabels`, uma variação única e registro que não seja rascunho/mesclado. Linhas de variações oferecem identificação sob a mesma permissão e não oferecem etiqueta de preço individual. A etiqueta de preço do Produto pai fica no menu do pai.
- [x] No app, `NativeProductsScreen` deriva as mesmas permissões de edição e impressão. O menu nativo da variação única recebe a ação de identificação apenas com `printProductIdentificationLabels`; a disponibilidade reutiliza `getProductIdentificationLabelActionAvailability` de `shared-utils/productPermissions.ts`. Variações filhas recebem somente a ação de identificação, bloqueada para mescladas. A ação de preço do pai requer edição, oculta lixeira/perfil exclusivo de identificação e recebe o UUID do pai, correspondendo ao gate do menu ERP; não liberei impressão de preço para perfil somente leitura.
- [x] A identificação no ERP passa o produto preparado em `location.state` com pai/variação e quantidade 10 com preenchimento da folha. O app adapta a navegação para deep link com `productId`, `variationId`, `cat=identificacao`, `autoAddProduct=true` e `fillSheet=1`; `useLabelProducts` resolve pai e variação no mesmo destino de Etiquetas. O preço usa o mesmo destino `cat=precos` e pré-seleciona o UUID do pai. A variação não troca de alvo para o pai em uma ação por filho.
- [x] A tela ERP de seleção de etiquetas usa `labelPrintSelectionFormSchema` via `useZodForm` e executa `validateAndRun`; o app abre essa mesma tela web, sem criar formulário ou regra de seleção de quantidade paralela. O atalho de preço no card nativo também dá acesso a uma capacidade já presente no menu ERP da tabela, embora não no card responsivo web; mantive-o como adaptação de entrada mobile para o fluxo existente.
- [x] Não foi comprovada diferença de regra, permissionamento ou payload que justifique alteração de código. Não atualizei o guia de Estoque porque o fluxo de operação não mudou.

#### Evidências, validação e limites

- [x] Inspeção estática: ERP `ProductRowActionsCell.tsx:73-95`, `ParentProductActions.tsx:62-68,85-112,237-253,322-340`, `VariationItemActions.tsx:40-47,90-104`, `ProductRowModals.tsx:24-43`, `LabelPrintSelectionModal.tsx:53,118-140`, `useLabelPrintingState.ts:26-44,68-96` e `useLabelProducts.ts:30-90`; app `NativeProductsScreen.tsx:70-90,642-650`, `useMobileProductCardState.ts:35-52`, `MobileProductCard.tsx:155-175,529-558`, `MobileProductVariationCard.tsx:117-124,207-218`, `MobileProductActionsMenu.tsx`, `MobileProductVariationActionsMenu.tsx:86-101,188-199` e `productLabelLinks.ts:1-21`; lógica compartilhada `productPermissions.ts:197-235`.
- [x] Consultei `AGENTS.md` (formulários RHF/Zod, runners UI, guia de Estoque e exceção Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, documentação vigente Produto/Variação, operações mover/merge, arquitetura offline-first, inventário de formulários, inventário de paridade e roadmap. Não há `AGENTS.md` aninhado nas pastas ERP/mobile/shared-utils/docs/rules. A skill `erp-web-to-mobile-replication` foi consultada na cópia acessível em `erp/.vercel/builders-backup-72ebb3b0/node_modules/morante-hub-root/.agents/skills`; a versão canônica do projeto segue ausente e a proveniência do backup não foi confirmada.
- [ ] Revisão estática apenas. Não executei testes, não imprimi etiqueta e não validei o deep link em Playwright autenticado nem no dispositivo Android/Maestro; Expo Web não comprova que `Linking.openURL` ou a impressão final funcionam no runtime nativo. Nenhuma consulta/escrita remota, Meta/SEFAZ, migration ou deploy.

**Conclusão do recorte:** os gates e destinos de etiquetas correspondem para as ações equivalentes. O app usa deep link para reutilizar a tela web de impressão; a compatibilidade visual/autenticada e nativa permanece sem prova. Nenhuma diferença suportada exige correção neste estado; a auditoria geral continua aberta.

### Ciclo 374 — dimensões na aba técnica do Produto e da Variação — 26/10/2026

**Recorte:** edição de altura, largura, profundidade/comprimento e peso na aba técnica do formulário principal e no editor técnico da variação; projeção para propriedades numéricas e regras de herança.

#### Diferença e correção

- [x] No ERP, `applyTechnicalValueChangeToProduct` mapeia os nomes dimensionais base e `* total` para `height`, `width`, `depth` e `weight`, aceita somente números positivos nas propriedades físicas e sincroniza valores definidos com variações que herdam. No editor de uma variação, `VariationTechnicalTab.handleSetOverride` grava a característica em `technicalValues` e `attributes`; não injeta o rótulo textual `Não se aplica` nas colunas numéricas nem desativa as flags de herança.
- [x] O app mapeava somente `Altura`, `Largura`, `Profundidade`/`Comprimento` e `Peso`, portanto `Altura total`, `Largura total`, `Profundidade total` e `Comprimento total` não atualizavam as propriedades numéricas como no ERP. O setter também copiava o valor textual de uma característica para a propriedade dimensional, inclusive `Não se aplica`, e fazia isso durante a edição de variação; o schema numérico do formulário rejeita esse valor e as propriedades são serializadas para o payload de gravação.
- [x] `shared-utils/productTechnicalDimensions.ts` centraliza o mapeamento e a conversão já usados pela regra ERP. O ERP preserva o comportamento anterior por meio desse helper. No app, a aba técnica do Produto pai aplica a conversão numérica, reconhece os aliases `* total` e limpa a propriedade com `undefined`; o editor de variação mantém seu override em `technicalValues`/`attributes`, sem contaminar as dimensões herdadas nem as flags de sincronização. Isso preserva o contrato RHF/Zod do formulário proprietário; nenhuma submissão paralela foi introduzida.
- [x] Não foi alterado o fluxo operacional do Estoque, de impressão ou de Conciliação. A exceção permanente ERP-only da Conciliação permanece preservada.

#### Evidências, validação e limites

- [x] Inspeção ERP: `erp/src/pages/App/Products/components/tabs/technical/sync/valueChange.ts`, `erp/src/pages/App/Products/components/tabs/technical/technicalTabUtils.ts:35-42`, `erp/src/pages/App/Products/components/variationTabs/VariationTechnicalTab.tsx:313-344,347-358`, `erp/src/pages/App/Products/hooks/variation/useVariationForm.ts:296-340` e `erp/src/pages/utils/productService/productPersistenceService.ts:315-326`.
- [x] Inspeção mobile e contrato: `mobile/src/features/products/modals/tabs/ProductFormTechnicalTab.tsx:388-427,455-495`, `mobile/src/features/products/screens/ProductFormScreen.tsx:340-355,964-1000`, `mobile/src/features/products/modals/tabs/ProductFormVariationsTab.tsx:601-613`, `mobile/src/features/products/services/mobileProductMutationService.ts:652-658,793-803` e `shared-utils/mobileProductFormSchema.ts:20-42`.
- [x] Regressão Vitest focada: **75/75 em três arquivos** (`productTechnicalDimensions.test.ts`, `technicalTabUtils.test.ts` e `mobileProductFormSchema.test.ts`), incluindo aliases base/total, conversão pt-BR, valores não positivos/inválidos, propagação ERP a variações herdadas e preservação do schema numérico mobile. A primeira seleção do helper usou um caminho fora do `include` e coletou zero testes; a rodada final foi refeita nos caminhos incluídos. Não houve consulta nem gravação de produto no banco.
- [x] Consultei `AGENTS.md` (RHF/Zod e runners permitidos), `docs/geral/USER_RULES.md`, regra `rules/products/product-reconciliation-erp-only.yml`, docs vigentes de Produto/Variação e mover/merge, arquitetura offline-first, inventário de formulários, este inventário, roadmap e skill `erp-web-to-mobile-replication`. Não há `AGENTS.md` aninhado aplicável. A skill continua acessível somente na cópia de backup `.vercel`; sua proveniência canônica não foi confirmada e foi usada apenas como orientação.
- [ ] Sem Playwright autenticado para abrir e interagir com os dois formulários, e sem validação Android/Maestro; a inspeção estática e o teste lógico não comprovam renderização, toque ou persistência nativa. Expo Web não foi tratado como prova de runtime Android/iOS. Nenhuma gravação remota, Meta/SEFAZ, migration ou deploy.

**Conclusão do recorte:** os aliases dimensionais e o tratamento numérico no formulário principal agora seguem a regra ERP; características próprias da variação continuam em `technicalValues`/`attributes`, como no editor ERP, e não produzem strings inválidas nas colunas numéricas. A comparação autenticada visual/nativa permanece pendente. A auditoria geral continua aberta.

### Ciclo 375 — estado vazio e carregamento da paginação de Produtos — 26/10/2026

**Recorte:** presença do rodapé de paginação em resultado vazio, erro sem snapshot, carregamento bloqueante e atualização com linhas preservadas; limite e faixa da consulta por página.

#### Comparação e conclusão

- [x] O ERP substitui a lista por carregamento, erro sem linhas ou vazio sem resultados; nesses três estados o rodapé não é montado. Com linhas preservadas durante refresh, a tabela e o rodapé continuam visíveis. No app, `shouldShowMobileProductPagination` exige linhas e oculta o rodapé durante carregamento bloqueante; mantém-no no pull-to-refresh com o snapshot atual. Os estados correspondem.
- [x] ERP e app usam `getFixedPageSlots` e `normalizePageNumber` de `shared-utils/fixedPagination.ts`; a consulta usa o mesmo intervalo inclusivo: `(page - 1) * pageSize` até `from + pageSize - 1`, ordenado por `created_at DESC` e com contagem exata. O tamanho permanece limitado a 10/15 por `listingFormSchemas.ts`. No app, `handleItemsPerPageChange` executa o resolver real do `productListFormSchema` antes de atualizar tamanho e voltar à página 1; no ERP, `ProductListPageSizeSelect` valida pelo `useZodForm` antes do handler equivalente.
- [x] A observação anterior do Ciclo 316 — ausência de prop `loading` no componente móvel de slots — não cria um estado ativo divergente: nos estados com carregamento bloqueante, ERP e app substituem/ocultam a paginação; no refresh com cache/pull-to-refresh, ambos preservam linhas e controles. Não alterei o bloqueio de slots nem os controles de tamanho.
- [x] Não encontrei diferença funcional suportada neste estado; nenhuma mudança de produção foi necessária. A Conciliação continua exclusiva do ERP conforme a exceção permanente.

#### Evidências e limites

- [x] Inspeção estática: ERP `erp/src/pages/App/Products/ProductList/index.tsx:117-157,244-273`, `erp/src/pages/App/Products/ProductList/components/Shared/ProductListPageSizeSelect.tsx:18-31`, `erp/src/pages/App/Products/ProductList/hooks/data/useProducts.ts:57-61,102-105,203-209`, `erp/src/pages/utils/productService/productQueryService.ts:159-190`; app `mobile/src/features/products/screens/NativeProductsScreen.tsx:596-631,670-683`, `mobile/src/features/products/domain/mobileProductListPresentation.ts:1-5`, `mobile/src/features/products/components/MobileProductPagination.tsx:29-83`, `mobile/src/features/products/hooks/useMobileProducts.ts:105-122,154-169,284-304,323-363,622-633`, `mobile/src/features/products/services/mobileProductFetchService.ts:221-234,346-358`; compartilhados `shared-utils/fixedPagination.ts` e `shared-utils/listingFormSchemas.ts:6-18`.
- [x] Consultei `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, documentação vigente de estrutura Produto/Variação e mover/merge, inventários de paridade/formulários, roadmap e skill `erp-web-to-mobile-replication`. Não há `AGENTS.md` aninhado aplicável a ERP, mobile, shared-utils ou docs; a regra aninhada de Catálogo Digital não se aplica. A skill permanece acessível somente no backup `.vercel`, sem proveniência canônica confirmada, e foi usada apenas como orientação.
- [x] Não executei testes nesta revisão sem alteração; os testes focados de request/paginação já documentados no Ciclo 316 cobrem helpers mobile e hook ERP. Nenhuma leitura/escrita remota, Meta/SEFAZ, migration, deploy ou ação operacional foi feita.
- [ ] Playwright autenticado não exercitou visualmente o mobile nesta execução, e não houve validação Android/Maestro em aparelho físico. A inspeção estática não comprova toque nem layout nativo; Expo Web não foi tratado como prova nativa.

**Conclusão do recorte:** resultado vazio, erro sem linhas e carregamento bloqueante escondem paginação nos dois clientes; refresh com snapshot preservado mantém a paginação visível. O range, a contagem, os tamanhos válidos e a validação antes da mudança estão alinhados. Nenhuma correção de código foi necessária. A auditoria geral permanece aberta.

### Ciclo 376 — gate de criação de Produto Composto para Estoquista isolado — 26/10/2026

**Recorte:** ação **Novo Produto Composto** no menu da lista padrão de Produtos, para perfil exclusivamente Estoquista.

#### Comparação e classificação

- [x] O ERP calcula `canManageProducts` por `canPerform('productConfig', roles)` e só mostra o menu de ações quando essa permissão está concedida. No modo padrão, o menu contém **Novo Produto Composto** e o callback abre o formulário com `itemType: 'composition'`. A regra ERP não acrescenta uma exceção pelo papel Estoquista.
- [x] O app calcula `canEditProducts` pela mesma permissão compartilhada, mas deriva `canCreateComposition = canEditProducts && !isStockistOnly`; tanto a visibilidade do item do menu quanto o callback respeitam esse valor. Assim, no perfil exclusivamente Estoquista, o app bloqueia composição mesmo quando `productConfig` está concedida. A permissão padrão de `productConfig` inclui `stockist`; a migração de permissões remove o papel Estoquista de `viewProductCompositions`, sem removê-lo de `productConfig`.
- [x] A divergência já está registrada como particularidade mobile no Ciclo 271 do roadmap: o perfil exclusivamente Estoquista não recebe a ação de criar composição, além do bloqueio geral para quem não tem `productConfig`. As instruções vigentes pedem preservar particularidades mobile documentadas. Mantive o gate existente e não alterei o formulário, a permissão ERP ou a matriz compartilhada. A exceção se restringe à criação de composição; a criação normal de produto continua sob `productConfig`.
- [x] A Conciliação continua ERP-only pela regra permanente do usuário; não foi criada nem alterada superfície mobile para esse módulo.

#### Evidências, validação e limites

- [x] Inspeção ERP: `erp/src/pages/App/Products/Index.tsx:23,119-124`, `erp/src/pages/App/Products/components/ProductsTopToolbar.tsx:100-142`, `erp/src/pages/utils/permissionService.ts:44-65`, `erp/src/pages/utils/permissionConfig.ts:91-102` e `erp/src/pages/utils/settings/migrations.ts:45-80,241-255`.
- [x] Inspeção app e regra compartilhada: `mobile/src/features/products/screens/NativeProductsScreen.tsx:71-80,513-564`, `mobile/src/features/products/components/header/ProductsHeaderMenuDropdown.tsx:95-114`, `shared-utils/productPermissions.ts:89-97,134-142,165-170` e `docs/geral/roadmap_pendente.md` (Ciclo 271). A skill `erp-web-to-mobile-replication` foi consultada somente na cópia do backup `.vercel`; a versão canônica não foi localizada.
- [x] Consultei `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, documentação vigente de Produto/Variação e mover/merge, inventários pertinentes, este inventário e o item 5 do roadmap. Nenhum `AGENTS.md` aninhado aplicável foi encontrado nos diretórios ERP, mobile, shared-utils ou docs.
- [x] Sem mudança de código, não executei Vitest/RTL nem TypeScript. Não houve consulta ou escrita remota, chamada Meta/SEFAZ, migration, deploy ou operação de Estoque.
- [ ] A conferência permaneceu estática: a sessão Playwright disponível estava na tela de login e o perfil de teste disponível é fiscal, sem usar suas credenciais para contornar as permissões da tarefa. Não há telefone conectado por ADB Wi-Fi/Maestro nesta execução; não houve validação Android. Expo Web não comprovaria a interação nativa.

**Conclusão do recorte:** o app tem um bloqueio adicional documentado para Estoquista isolado, embora o ERP exponha a criação quando `productConfig` permite. Mantive a particularidade mobile registrada no Ciclo 271, sem diferença não documentada a corrigir neste estado. A auditoria geral permanece aberta.

### Ciclo 377 — custo derivado da NF-e no cadastro rápido mobile — 26/10/2026

**Recorte:** custo unitário pré-preenchido para cadastrar um Produto simples pelo atalho de vínculo de item da NF-e, na aba mobile Estoque e Precificação.

#### Comparação e classificação

- [x] No ERP, o cadastro rápido recebe `item.finalCost` calculado por `itemCostWithAdditionalCosts` (ou usa `unitCost` quando não há `finalCost`). O custo considera o valor unitário da mercadoria, IPI, ICMS-ST, frete, seguro, outras despesas fiscais e custos adicionais não fiscais rateados pela quantidade. A seleção passa por `quickRegisterSelectionFormSchema`, que exige um custo finito e não negativo para Produto simples/Composição antes da criação.
- [x] No app, `useInboundQuickRegistration` preenche `costPrice` com `landedUnitCost(item)`. A fórmula soma os mesmos componentes e rateia os extras pela quantidade; o valor chega ao campo condicional `showInboundCostPrice` no `ProductFormPricesTab`. O `ProductFormScreen` valida o cadastro pelo resolver RHF/Zod; na finalização o custo é obrigatório e não negativo, enquanto rascunho permanece incompleto. O serviço de produto não cria saldo inicial por esse custo.
- [x] A entrada do app permite revisar esse custo no formulário completo; o modal rápido ERP usa o `finalCost` calculado e não apresenta campo de edição manual. A particularidade móvel já está documentada no inventário de formulários (Ciclo 91) e foi preservada. Para item fiscal válido, os custos incluídos na NF-e não são reaplicados ao editar o campo: `finalPurchasePrice` do fluxo usa o custo já desembarcado.
- [x] A revisão não encontrou diferença de resultado para linha válida. As fórmulas continuam em módulos de plataforma separados; não extraí um helper compartilhado sem divergência funcional comprovada. Para `unitCost` negativo malformado, o mobile limita a parcela base a zero, enquanto o helper ERP recebe o valor bruto; o resolver de finalização rejeita custo resultante negativo. Nenhuma regra foi alterada para ampliar a tolerância a dados fiscais inválidos.
- [x] Como conferência correlata da mesma aba, os callbacks do Produto Pai para percentual, desconto fixo, preço promocional e preço de venda continuam conectados no `ProductFormPricesTab`; usam os mesmos cálculos de `shared-utils/productDiscountFields.ts` que o hook ERP. Os descontos percentuais/fixos são auxiliares e não formam payload independente; o preço promocional segue pelo schema do formulário. Os limites no desconto do pai e as exceções de valor inválido já foram registrados nos Ciclos 19–24. A frase do inventário de formulários que dizia que os handlers continuavam pendentes estava desatualizada; foi corrigida para distinguir funcionalidade implementada de cobertura direta de interação ainda ausente.
- [x] A exceção permanente ERP-only da Conciliação de Produtos permanece intacta. Este recorte é do cadastro rápido de item de NF-e e não cria tela, serviço, entrada ou fluxo de Conciliação no mobile.

#### Evidências, validação e limites

- [x] ERP: `erp/src/pages/App/Stock/InboundInvoices/modals/QuickRegisterVariationModal.tsx:116,250-255`, `erp/src/pages/App/Stock/InboundInvoices/hooks/useInboundInvoiceQuickRegister.ts:88,178-209`, `erp/src/pages/App/Stock/InboundInvoices/services/inboundProductPreparationService.ts:32,103-140`, `erp/src/pages/utils/inboundNfe/utils/inboundItemCosts.ts` e `shared-utils/operationsFormSchemas.ts` (`quickRegisterSelectionFormSchema`).
- [x] App: `mobile/src/features/stock/invoices/modals/inbound-mappings/inboundCostUtils.ts:8-18`, `mobile/src/features/stock/invoices/modals/inbound-mappings/hooks/useInboundQuickRegistration.ts:66-75`, `mobile/src/features/stock/invoices/modals/inbound-mappings/InboundQuickProductModal.tsx:140-147`, `mobile/src/features/products/modals/tabs/ProductFormPricesTab.tsx:147-210,517-542`, `mobile/src/features/products/screens/ProductFormScreen.tsx:642-654` e `shared-utils/mobileProductFormSchema.ts:32-36,75`.
- [x] Regras/documentação consultadas: `AGENTS.md` (RHF/Zod, testes permitidos, guia de Estoque e Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, estrutura Produto/Variação, operações mover/merge, inventários de Produtos e formulários, item 5 do roadmap e skill `erp-web-to-mobile-replication`. A busca pela skill atual em `.agents/skills`/skills do projeto não encontrou fonte canônica; a cópia acessível está no backup `.vercel` e sua proveniência não foi confirmada, então serviu apenas como orientação. Não há `AGENTS.md` aninhado aplicável a ERP, mobile, shared-utils ou docs.
- [x] Sem mudança de código, não executei Vitest/RTL nem TypeScript. Os testes focados anteriores de custos NF e do cadastro rápido permanecem referenciados no inventário de formulários e nos testes de domínio ERP. Não houve consulta/escrita remota, operação de estoque, emissão/transmissão fiscal, chamada Meta, migration ou deploy.
- [ ] Sem sessão Playwright autenticada para abrir os modais de cadastro rápido dos dois clientes neste recorte; não houve validação Android/Maestro em aparelho físico. A revisão de código não comprova toque, layout nativo nem persistência remota; Expo Web não foi tratado como prova nativa.

**Conclusão do recorte:** o custo pré-preenchido para item válido chega ao Produto simples com os mesmos custos da NF-e no ERP e no app; a edição manual no formulário mobile permanece uma adaptação já documentada. Não surgiu diferença funcional suportada para corrigir. A auditoria geral permanece aberta.

### Ciclo 378 — galeria herdada de fotos da variação única — 26/10/2026

**Recorte:** aba Fotos da variação simples com exatamente uma variação; exibição das imagens do pai e affordances de editar, remover e reordenar fotos.

#### Comparação e classificação

- [x] O ERP resolve a galeria da variação única usando as URLs do produto pai e o componente `VariationPhotosTab` entra em modo de consulta: mostra a quantidade, capa e imagens herdadas, sem botões de seleção, recorte, desvínculo ou arraste. A ordenação continua sendo feita na galeria do pai, cuja regra compartilhada mantém a variação única sincronizada.
- [x] O app passa `inheritsParentGallery={isSingleVariation}` a `ProductVariationPhotosEditor`, que mostra o contador herdado e omite os controles de edição e o seletor de fotos nesse estado. A edição/reordenação do produto pai continua atualizando a variação única pelo helper compartilhado; em famílias multi-variação, cada galeria segue editável e própria.
- [x] A divergência pendente registrada no Ciclo 13 era uma expectativa obsoleta do teste ERP: ele tentava arrastar imagens com `isSingleVariation=true`, embora a implementação ativa e a documentação já definissem o estado como somente leitura. Corrigi apenas o teste para conferir fotos herdadas, contador/capa e ausência dos controles; não alterei a interface ou regra de produção. A Conciliação permanece ERP-only.

#### Evidências, validação e limites

- [x] ERP: `erp/src/pages/App/Products/components/tabs/images/VariationPhotosTab.tsx:75-103` (retorno somente leitura) e `erp/src/pages/App/Products/modals/VariationFormModal.tsx:121,229-247` (fonte e passagem da galeria do pai). App: `mobile/src/features/products/modals/tabs/ProductFormVariationsTab.tsx:1145-1153` e `mobile/src/features/products/modals/components/ProductVariationPhotosEditor.tsx:108-206` (contador herdado e controles condicionais). A ordem da galeria do pai usa `shared-utils/productImageOrdering.ts` por `ProductFormPhotosTab` mobile; a mesma regra havia sido auditada no Ciclo 13.
- [x] Vitest/RTL focado: `npm run test -- --run --config vitest.config.ts src/pages/App/Products/components/tabs/images/VariationPhotosTab.test.tsx` em `erp/` — **1 arquivo, 5 testes aprovados**. `git diff --check` será conferido após registrar o ciclo.
- [x] Consultei `AGENTS.md`, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, `docs/negocio/produtos/estrutura-produto-variacao.md`, `docs/negocio/produtos/operacoes-troca-pai-merge.md`, inventários de Produtos e formulários, item 5 do roadmap e a skill de replicação acessível. Nenhum `AGENTS.md` aninhado aplicável foi encontrado. A skill canônica do projeto não apareceu em `.agents/skills` ou nos diretórios ERP/mobile/shared-utils; a cópia do backup `.vercel` foi usada somente como orientação e sua origem não está confirmada.
- [ ] Esta correção de teste não exercitou a tela em Playwright autenticado nem o componente no Android/Maestro físico; a renderização por Vitest/RTL não prova layout ou interação nativa. Não houve upload, consulta/escrita remota, chamada Meta/SEFAZ, migration, deploy ou mudança operacional do Estoque; o guia prático não precisou de atualização.

**Conclusão do recorte:** o modo de foto herdada da variação única já tem o mesmo contrato no ERP e no app. O teste ERP que alegava reordenação pela variação única foi corrigido para refletir o comportamento documentado e a suíte focada passou. A validação visual/nativa das fotos permanece pendente; a auditoria geral continua aberta.

### Ciclo 379 — falha parcial do envio múltiplo de fotos do Produto Pai — 26/10/2026

**Recorte:** estado de erro ao selecionar e enviar mais de uma foto na galeria do Produto Pai, incluindo validação, aplicação dos URLs e efeitos de um arquivo que falha no meio do lote.

#### Comparação e classificação

- [x] O ERP limita a seleção e executa `imageFilesFormSchema` pelo `useZodForm` antes do upload. Prepara as derivações e envia cada arquivo do lote em paralelo; original é obrigatório e falha de `_medium`/`_thumb` usa fallback para o original. Só depois de `Promise.all` bem-sucedido acrescenta todos os URLs ao rascunho e sincroniza a galeria da variação única. Se qualquer original falhar, mantém o estado local anterior, mostra erro e encerra o indicador de carregamento; as outras tarefas já iniciadas podem continuar no armazenamento.
- [x] O app aplica o mesmo limite antes da leitura dos assets, valida o conjunto com RHF/Zod (`mobileProductPhotoUploadFormSchema`) e valida URLs HTTPS recebidos por outro resolver (`mobileProductPhotoUrlsFormSchema`). O lote é processado em sequência; os derivados locais e remotos também são tentados em sequência e mantêm fallback para o original. O callback que acrescenta as fotos à galeria só é chamado depois que todos os URLs passam pela validação; no erro, nenhuma foto do lote é adicionada, o `Alert` apresenta a causa disponível e o indicador é encerrado.
- [x] Para o usuário, o estado de erro é all-or-nothing nos dois clientes: nenhuma URL da seleção parcialmente enviada aparece no formulário. O app mantém o processamento sequencial como particularidade de plataforma: cada item lê uma origem e cria derivações locais por `ImageManipulator`, evitando concorrência entre essas etapas no dispositivo; a ordem final continua sendo a ordem de seleção. O app também mantém a mensagem detalhada do `Alert`, enquanto o ERP usa um toast genérico.
- [x] Efeito remoto não confirmado: se uma imagem anterior do lote já tiver subido quando outra falha, seu objeto pode ficar sem referência no formulário. Esse risco existe nos dois clientes, com alcance diferente: o ERP já iniciou todas as tarefas paralelas; o app interrompe antes de iniciar as fotos seguintes. Não introduzi limpeza ou retry automático de objetos, pois exigiriam confirmação de ownership/resultado do upload e poderiam apagar imagem válida. A confirmação real no R2 permanece pendente.
- [x] Não surgiu diferença de regra de negócio que justifique mudança de produção. A particularidade mobile de sequência e feedback de erro ficou documentada; não alterei limites, formulários, mensagens ou chamadas. A exceção ERP-only de Conciliação permanece intacta.

#### Evidências, validação e limites

- [x] ERP: `erp/src/pages/App/Products/hooks/form/useProductFormImages.ts:26,54-58,84-113`, `shared-utils/fileFormSchemas.ts:9-11`, `shared-utils/productImageSelection.ts` e `shared-utils/productImageDerivatives.ts`. App: `mobile/src/features/products/modals/tabs/ProductFormPhotosTab.tsx:49-75,98-139,143-181,196-208`, `mobile/src/features/products/services/mobileProductPhotoService.ts:138-180` e `shared-utils/productImageFormSchemas.ts:18-36`. As duas telas usam o formulário proprietário e resolvers Zod reais antes de enviar/aplicar dados.
- [x] Consultei `AGENTS.md` (formulários RHF/Zod, runners e restrições de dados), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, documentação de estrutura Produto/Variação e mover/merge, inventários de Produto/formulários e item 5 do roadmap. A skill canônica não foi encontrada nas pastas de skills pesquisadas; a cópia acessível em `.vercel` foi consultada somente como orientação, com proveniência não confirmada. Não há `AGENTS.md` aninhado nas árvores ERP/mobile/shared-utils/docs/rules.
- [ ] Revisão estática somente. Não rodei testes nem abri Playwright para este estado; um lote real pode gravar arquivos no R2 e não foi enviado. Não houve consulta/escrita Supabase, chamada Meta/SEFAZ, migration, deploy ou alteração operacional de Estoque. O guia prático não requer atualização.

**Conclusão do recorte:** falha em qualquer item deixa a galeria local inalterada nos dois clientes; a única diferença comprovada está no agendamento e no texto do alerta. A sequência mobile é mantida como adaptação para processamento de imagens no dispositivo, e o risco de objetos órfãos após falha permanece registrado para validação remota autorizada. A auditoria geral continua aberta.

### Ciclo 380 — autosave do rascunho ao remover foto do Produto Pai — 26/10/2026

**Recorte:** remoção de uma foto já presente na galeria do Produto Pai, com atenção ao rascunho salvo e ao vínculo herdado pela variação única.

#### Diferença e correção

- [x] A operação local dos dois clientes reutiliza `removeProductImageGlobally`: remove a URL da galeria e, se houver uma única variação, mantém a galeria herdada sincronizada; em famílias com várias variações, remove o vínculo somente das variações que usavam a imagem. O helper é compartilhado e não executa exclusão do objeto no armazenamento.
- [x] No app, `setFormData` incrementa a revisão do formulário, e o efeito agenda o autosave serializado após 500 ms quando o estado pode ser salvo como rascunho. No ERP, a remoção atualizava `formData` e, ao fechar, o rascunho acabaria salvando por `hasChanged`; porém `removePhoto` não chamava `scheduleDraftAutoSave`, ao contrário da inclusão e substituição. A remoção ficava somente local até outra ação que agendasse autosave ou até o fechamento explícito do modal, sem a confirmação de autosave em 500 ms que o restante da galeria oferece.
- [x] Acrescentei `onImagesSaved?.()` ao caminho de remoção em `useProductFormImages`. A callback existente agenda em 500 ms somente para rascunhos; não introduz submissão própria nem contorna o schema do autosave. O teste de remoção também exige que a callback seja disparada, preservando a verificação dos vínculos pai/variações.
- [x] Não alterei o app, a remoção física de objetos R2, o cadastro publicado, nem a regra de fotos herdadas. Nenhuma operação de Estoque foi modificada, portanto o guia de Estoque permanece correto.

#### Evidências, validação e limites

- [x] Comparei ERP `ProductEcommerceTab.tsx:58-76`, `ProductFormTabContent.tsx:115-125`, `useProductFormModal.ts:159-168,286-324` e `useProductFormImages.ts:120-125`; app `ProductFormPhotosTab.tsx:49-75,210-220`, `ProductFormScreen.tsx:345-356,873-901` e `mobileProductImageOrdering.ts`. O fluxo ERP/app reaproveita `shared-utils/productImageOperations.ts` para projeção da remoção.
- [x] Consultei as regras do `AGENTS.md` e `docs/geral/USER_RULES.md`, a regra `rules/products/product-reconciliation-erp-only.yml`, documentos vigentes de estrutura e mover/merge de Produto, inventários de Produto e formulários, roadmap e a skill de replicação acessível. Não há `AGENTS.md` aninhado aplicável; skill canônica não encontrada na árvore `.agents/skills`, e a cópia em `.vercel` segue com proveniência não confirmada, usada apenas como orientação.
- [x] Regressão Vitest focada em `erp/src/pages/App/Products/hooks/form/useProductFormImages.test.ts`: antes da correção a asserção falhou (`onImagesSaved` chamada 0 vezes); após a correção, **1 arquivo / 6 testes aprovados**. Não executei Playwright porque remover imagem em formulário autenticado pode gravar o rascunho no servidor; não usei Expo Web como prova nativa.
- [x] Sem chamada ao R2, leitura ou escrita Supabase, Meta/SEFAZ, migration ou deploy. A suíte usa as funções de upload mockadas; não confirma comportamento do armazenamento real.

**Conclusão do recorte:** a remoção no ERP agora agenda o autosave de rascunho no mesmo intervalo de 500 ms das demais alterações da galeria, preservando a validação/resolução existente e a sincronização de fotos herdadas. A verificação visual autenticada e o runtime nativo continuam pendentes; a auditoria geral permanece aberta.

### Ciclo 381 — autosave do rascunho ao reordenar fotos do Produto Pai — 26/10/2026

**Recorte:** reordenação por arraste na galeria principal do formulário de Produto, incluindo atualização da capa/secundária e sincronização herdada da variação única.

#### Diferença e correção

- [x] O ERP atualiza a ordem pelo `moveProductImageGlobally`, que mantém as fotos sincronizadas quando existe uma única variação. O app usa o mesmo helper e a reordenação acessível por ações de mover também atualiza o formulário; a arquitetura de autosave mobile agenda uma gravação de rascunho 500 ms após nova revisão.
- [x] O manipulador ERP `onDragOver` alterava `formData` quando a foto passava a ocupar nova posição, mas não acionava `onImagesSaved`; portanto, ao contrário da inclusão/substituição/remoção, não agenda o autosave de 500 ms. O salvamento ocorria só por outra alteração agendada, ação explícita ou fechamento que detectasse `hasChanged`.
- [x] Acrescentei a chamada ao callback existente somente dentro do ramo em que a posição realmente mudou. Eventos de arraste sem reordenação não agendam salvamento; alterações repetidas durante o arraste reutilizam o debounce de 500 ms da rotina de rascunho, sem criar submissão ou serviço novo.
- [x] O teste RTL reproduz o arraste da primeira foto para a segunda, verifica a ordem final e a sincronização da variação única, e exige a chamada do autosave. A primeira execução evidenciou tanto a falha nova (callback não chamada) quanto uma asserção antiga com fixture incorreto: ela esperava ausência de selo de capa para uma única variação, apesar de o código marcar Produto simples. Corrigi o fixture para duas variações, que é o estado sem selo coberto pelo teste.

#### Evidências, validação e limites

- [x] ERP: `erp/src/pages/App/Products/components/tabs/ProductEcommerceTab.tsx` (ordenação por arraste e chamada de autosave), `ProductFormTabContent.tsx` (callback `scheduleDraftAutoSave`) e `useProductFormModal.ts` (debounce 500 ms limitado a rascunhos). App: `mobile/src/features/products/modals/tabs/ProductFormPhotosTab.tsx` (ações de reordenação), `ProductFormScreen.tsx` (incremento da revisão e autosave serializado) e `shared-utils/productImageOrdering.ts`.
- [x] Consultei `AGENTS.md` (RHF/Zod, runners e limites de gravação), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, a documentação vigente de Produto/Variação e operações de mover/merge, inventários de Produto e formulários, roadmap e a skill de replicação acessível. Não há `AGENTS.md` aninhado aplicável; a fonte canônica da skill segue ausente e a cópia `.vercel` foi usada somente como orientação, com proveniência não confirmada.
- [x] Regressão Vitest/RTL focada em `erp/src/pages/App/Products/components/tabs/ProductEcommerceTab.test.tsx`: inicialmente 5/7 passaram, revelando a chamada de autosave ausente e o fixture legado; após a correção e atualização do fixture, **1 arquivo / 7 testes passaram**. `git diff --check` será executado após registrar este ciclo.
- [x] Sem Playwright autenticado: arrastar fotos poderia persistir alteração de um produto real. Não houve upload/R2, Supabase, Meta/SEFAZ, migration, deploy ou operação de Estoque. Nenhuma atualização do guia prático é necessária.

**Conclusão do recorte:** quando a posição muda, a galeria ERP agora agenda autosave de rascunho; o app já tinha esse comportamento por revisão de estado. A ordem e a sincronização da variação única continuam no helper compartilhado. Validação visual/nativa permanece pendente e a auditoria geral continua aberta.

### Ciclo 382 — aplicação do recorte e autosave do rascunho — 26/10/2026

**Recorte:** concluir o recorte quadrado de uma foto existente na galeria do Produto Pai, validar origem e URL de substituição, atualizar a variação única e persistir o rascunho.

#### Comparação e conclusão

- [x] No ERP, `SquareImageCropper` executa `squareImageCropFormSchema`; após gerar o arquivo, `ProductEcommerceTab.handleCropPhoto` delega a `handleReplacePhoto`, que valida o arquivo com RHF/Zod, faz upload otimizado, troca a URL com `replaceProductImageGlobally` e chama `onImagesSaved`. A rotina do modal conecta esse callback a `scheduleDraftAutoSave`, que agenda após 500 ms somente para rascunhos. A primeira foto mantém sua posição de capa e a variação única recebe a nova galeria pelo helper compartilhado.
- [x] No app, `ProductSquareImageCropModal` valida origem atual por `createProductImageCropSourceFormSchema` antes do processamento e novamente após upload; valida seleção/medidas com RHF/Zod, arquivo com `mobileProductPhotoUploadFormSchema`, e a troca old/new HTTPS com `productImageReplacementFormSchema`. A tela atualiza pai e variação única com `replaceProductImageGlobally`; `setFormData` incrementa a revisão, e o efeito da `ProductFormScreen` agenda o autosave serializado de 500 ms. Essa validação dupla da origem é uma salvaguarda mobile já registrada nos Ciclos 167–168.
- [x] Não há diferença de persistência comprovada no caminho de sucesso: ambos alteram a galeria local somente após obter e validar o novo endereço; no app, fechamento do recorte após sucesso e imagem atualizada na grade dão o feedback nativo, enquanto o ERP mostra toast de sucesso. A mensagem/forma de feedback permanece como adaptação de plataforma, sem acrescentar alerta redundante ao app.
- [x] Acrescentei `onImagesSaved` e a asserção de chamada ao teste RTL já existente de substituição por recorte, que também verifica propagação às variações. Nenhum código de produção foi alterado neste recorte.

#### Evidências, validação e limites

- [x] ERP: `erp/src/pages/App/Products/components/tabs/ProductEcommerceTab.tsx:58-94,311-316`, `erp/src/pages/App/Products/components/tabs/images/SquareImageCropper.tsx:22-29,179-251`, `erp/src/pages/App/Products/components/form/ProductFormTabContent.tsx:115-125` e `erp/src/pages/App/Products/hooks/form/useProductFormModal.ts:159-167`. App: `mobile/src/features/products/modals/components/ProductSquareImageCropModal.tsx:141-147,280-410`, `mobile/src/features/products/modals/tabs/ProductFormPhotosTab.tsx:449-463`, `mobile/src/features/products/screens/ProductFormScreen.tsx:345-356,873-901` e `mobile/src/features/products/services/mobileProductPhotoService.ts`. Regra de projeção: `shared-utils/productImageOperations.ts`.
- [x] Consultei `AGENTS.md` (RHF/Zod, runners, guia de Estoque e Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, docs de estrutura e operações de variação, inventários de Produto e formulários, roadmap e skill acessível. Não encontrei `AGENTS.md` aninhado aplicável; `.agents/skills/erp-web-to-mobile-replication/SKILL.md` não está presente no workspace e a cópia `.vercel` foi usada apenas como orientação, sem proveniência canônica confirmada.
- [x] Regressão Vitest/RTL ERP em `erp/src/pages/App/Products/components/tabs/ProductEcommerceTab.test.tsx`: **1 arquivo / 7 testes aprovados**, incluindo substituição por recorte, URLs em pai/variações e chamada do autosave. A suíte mocka upload e não verifica R2 nem a persistência do rascunho no banco.
- [x] Revisão estática mobile; não executei Playwright autenticado porque recortar em sessão real envia um novo objeto e pode salvar o produto. Não houve upload R2, consulta/gravação Supabase, Meta/SEFAZ, migration, deploy ou alteração operacional de Estoque; o guia não precisou de atualização. Não usei Expo Web como prova nativa.

**Conclusão do recorte:** o recorte concluído preserva a validação de origem e substituição no app; o salvamento de rascunhos após a troca está ligado ao mecanismo serializado mobile, equivalente ao callback de 500 ms do ERP. A apresentação visual autenticada e o processamento em Android/iOS permanecem pendentes; a auditoria geral continua aberta.

### Ciclo 383 — erro, timeout e cancelamento ao carregar foto para recorte — 26/10/2026

**Recorte:** abrir o recorte de uma imagem existente e fechar o modal, trocar a origem, atingir timeout ou falhar ao buscar/renderizar a imagem. Não inclui upload do recorte nem alteração do formulário.

#### Diferença e correção

- [x] O ERP tenta candidatos de leitura com `AbortController` e limite de 15 s; se os candidatos falham por CORS, tenta renderizar a URL original. Se essa URL também estiver indisponível, o `<img>` não tem `onError`: a imagem quebrada fica visível e o botão segue desabilitado porque `selection` nunca foi inicializada, mas a mensagem de falha/CORS não aparece. Não repliquei esse fallback menos informativo no app.
- [x] No app, as falhas e timeouts de leitura já produziam `loadError` visível e mantinham a aplicação do recorte desabilitada. O problema comprovado era que `withTimeout` apenas encerrava a espera: `FileSystem.downloadAsync` podia continuar transferindo ao fechar/trocar a origem ou após os 20 s, e um resultado tardio de timeout podia deixar arquivo parcial no cache. A rotina agora usa `createDownloadResumable`, associa `cancelAsync` ao `AbortSignal` do efeito e, em falha/cancelamento/timeout, cancela e apaga o destino parcial. O download concluído conserva a limpeza temporária quando o modal fecha.
- [x] Na variante web, cada candidato usa um `AbortController` ligado ao cancelamento do efeito; falha HTTP, resposta vazia ou timeout aborta essa tentativa antes de avançar. Fechar o modal ou trocar a URL interrompe a tentativa em curso. As mensagens de erro, candidatos/proxies e validação pré/pós-upload permanecem inalteradas.
- [x] Regressão Vitest isolada do helper: `productCropImageSource.test.ts` cobre cancelamento por fechamento, timeout com cancelamento e remoção de arquivo parcial, e limpeza após download bem-sucedido: **1 arquivo / 3 testes aprovados**.

#### Evidências, validação e limites

- [x] ERP inspecionado: `erp/src/pages/App/Products/components/tabs/images/SquareImageCropper.tsx:51-102,352-372,449-458` (timeout/abort, fallback de URL e estados de loading/erro, sem `onError` no `<img>`). Mobile inspecionado: `mobile/src/features/products/modals/components/ProductSquareImageCropModal.tsx:35-105,159-214,421-454,579-590` (candidatos web, download local, erro visível, timeout do renderer, cancelamento e botões); API Expo confirmada em `mobile/node_modules/expo-file-system/src/legacy/FileSystem.ts:324-356,457-488`.
- [x] Alterações: `mobile/src/features/products/modals/components/ProductSquareImageCropModal.tsx` passa sinal para fetch/download e aborta no cleanup; novo `mobile/src/features/products/modals/domain/productCropImageSource.ts` cancela downloads nativos e limpa cache parcial; novo teste Vitest no mesmo diretório.
- [x] Consultei `AGENTS.md` (RHF/Zod, testes permitidos, Conciliação ERP-only e restrição de gravações), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, docs vigentes de Produto/Variação e mover/merge, inventários de produto e formulários, roadmap e a skill de replicação acessível. Não há `AGENTS.md` aninhado aplicável. A skill canônica `.agents/skills/erp-web-to-mobile-replication/SKILL.md` continua ausente; a cópia de cache `.vercel` serviu somente de orientação e a proveniência permanece não confirmada.
- [x] `npm run test:unit:mobile --prefix erp -- src/features/products/modals/domain/productCropImageSource.test.ts`: **3/3**. `tsc --noEmit -p mobile/tsconfig.json --pretty false` continuou com exit 1 por diagnósticos globais em outros caminhos (inclusive `ProductFormTechnicalTab.tsx:689`, fora do recorte) e outros módulos; nenhum dos arquivos deste ciclo foi apontado. A primeira execução focou um caminho de teste incorreto e não descobriu testes; a execução no caminho correto passou.
- [x] Sem Playwright autenticado: abrir o modal de recorte exige uma foto existente de produto, e a sessão/test fixture não é apropriada para validar esse estado sem tocar dado real; não fiz upload, gravação de produto, acesso ao R2/Supabase/Meta/SEFAZ, migration ou deploy. Expo Web não provaria o cancelamento nativo. Maestro/telefone físico não foram usados; runtime Android/iOS permanece pendente. `git diff --check` foi aplicado aos arquivos do recorte; o TypeScript global continua pendente. Sem impacto na operação do estoquista, não é necessária atualização do guia de Estoque.

**Conclusão do recorte:** o app conserva o tratamento de falha mais explícito que o ERP e agora também interrompe tentativas de rede/Expo ao fechar/trocar a origem e limpa cache parcial após timeout. A variante web e o cancelamento nativo foram cobertos logicamente, mas o comportamento Android/iOS real e comparação visual autenticada permanecem pendentes; a auditoria geral continua aberta.

### Ciclo 384 — galeria de fotos proprias das variacoes — 26/10/2026

**Recorte:** seleção de fotos da galeria do produto pai para uma variação de uma família multi-variação; limite e unicidade; compatibilidade de imagens legadas; reordenação/desvinculação; recorte e salvamento de rascunho. A galeria herdada da variação única foi encerrada no Ciclo 378 e não faz parte deste estado.

#### Comparação e classificação

- [x] O ERP usa `VariationPhotosTab` e `VariationParentImagesSelectModal`; o app usa `ProductVariationPhotosEditor`. Ambos limitam novas seleções às imagens atualmente disponíveis no produto pai, removem URLs repetidas e limitam cada variação a 15 imagens por `createVariationImageSelectionFormSchema` e pelo helper `toggleAllParentProductImages`, compartilhados entre os clientes.
- [x] O app separa validação de seleção nova da edição da lista atual. `createVariationImageListEditFormSchema` permite manter URLs legadas já vinculadas que deixaram de estar na galeria do pai, sem permitir inseri-las de novo no seletor; o ERP preserva o mesmo vínculo existente ao editar a lista. Não encontrei divergência de payload ou propriedade.
- [x] Ambos permitem desvincular uma imagem, recortar uma imagem da variação e persistir a ordem, com a primeira imagem como capa. ERP usa drag-and-drop; o app usa ações acessíveis “Mover foto para cima/baixo”. A interação é diferente por plataforma, mas alcança a mesma sequência e não altera as regras de ordenação.
- [x] O recorte ainda é validado pelo formulário RHF/Zod dono do Produto. O ERP aguarda `handleReplaceImageGlobal`; em rascunho, o callback faz `await autoSaveDraft(next)` e só conclui após ACK. No mobile, o callback atualiza o formulário proprietário, incrementa a revisão e agenda a fila serializada do autosave em 500 ms. O estado da fila apresenta salvando/salvo/erro e, ao fechar o formulário, `flushDraftAutoSave` espera o ACK ou oferece nova tentativa/descartar. O modal nativo de recorte fecha antes desse ACK; a divergência observada é de progressão/feedback dentro do modal, não de payload ou confirmação final. Com a fila central e o bloqueio de fechamento sem ACK, não surgiu uma correção menor e segura que preserve o contrato existente.
- [x] Os mesmos contratos são usados para variações novas e já salvas; Produto simples e variação única mantêm o comportamento de galeria herdada somente leitura documentado no Ciclo 378.

#### Evidências, validação e limites

- [x] ERP inspecionado: `erp/src/pages/App/Products/components/tabs/images/VariationPhotosTab.tsx`, `erp/src/pages/App/Products/components/modals/variations/VariationParentImagesSelectModal.tsx`, `erp/src/pages/App/Products/modals/VariationFormModal.tsx`, `erp/src/pages/App/Products/hooks/variation/useVariationForm.ts:408-463` e `erp/src/pages/App/Products/hooks/form/useProductFormModal.ts:490-501`.
- [x] Mobile inspecionado: `mobile/src/features/products/modals/components/ProductVariationPhotosEditor.tsx:15-101,117-201,208-329`, `mobile/src/features/products/modals/tabs/ProductFormVariationsTab.tsx:1144-1154` e `mobile/src/features/products/screens/ProductFormScreen.tsx:344-357,760-916,1626-1639`. Contratos compartilhados: `shared-utils/productImageFormSchemas.ts:38-60`, `shared-utils/productImageSelection.ts:24-39` e `shared-utils/productImageOperations.ts`.
- [x] Testes Vitest: ERP `VariationPhotosTab.test.tsx` + `VariationFormModal.test.tsx`, **42/42**; mobile `productImageFormSchemas.test.ts` + `mobileProductImageCrop.test.ts`, **8/8**. O componente `ProductVariationPhotosEditor` não possui teste direto localizado; o resultado dos schemas/helpers não comprova gestos, layout ou toque.
- [x] Consultei `AGENTS.md` (RHF/Zod, runners permitidos, Conciliação ERP-only e proteção de gravações), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, estrutura Produto/Variação, operações de mover/merge, inventários de produtos/formulários, item 5 do roadmap e skill de replicação acessível. Não há `AGENTS.md` aninhado aplicável. A skill canônica em `.agents/skills/erp-web-to-mobile-replication/SKILL.md` continua ausente; a cópia disponível no backup `.vercel` orientou a revisão, mas sua proveniência não foi confirmada.
- [x] Sem alteração de código de produção neste ciclo. Não houve Playwright autenticado, upload de foto, leitura/gravação Supabase, chamada R2/Meta/SEFAZ, migration ou deploy. Android/iOS/Maestro não foram usados; Expo Web não seria evidência de comportamento nativo. A fila de autosave e a resposta de versão foram conferidas estaticamente, sem fixture remota. O recorte não altera a operação do estoquista, portanto o guia de Estoque não requer atualização.

**Conclusão do recorte:** para galeria própria em família multi-variação, contratos de seleção, edição, recorte e ordem estão alinhados; a interação de ordenação usa affordance nativa. O app mantém ACK seguro por meio da fila serializada e do flush antes de fechar o formulário, embora feche o modal de recorte antes do ACK. O risco residual é de feedback e persistência remota não comprovada, registrado acima; não há diferença funcional suportada a corrigir sem alterar o desenho central de autosave. A auditoria geral continua aberta.

### Ciclo 385 — contagem da lista durante erro ou vazio — 26/10/2026

**Recorte:** contador no cabeçalho da lista de Produtos quando a consulta falha sem linhas ou retorna uma lista vazia.

#### Diferença e correção

- [x] A imagem enviada pelo usuário mostra a lista mobile em erro de carregamento: a interface exibe corretamente a mensagem de falha e “Tentar novamente”, mas também apresenta “Produtos 0”. Quando a consulta falha, esse zero é o estado inicial do contador e não uma contagem confirmada do catálogo.
- [x] No ERP, `ProductList/index.tsx` retorna os estados de carregamento, erro sem linhas e lista vazia antes da seção que apresenta o total. O contador só aparece quando existem linhas renderizadas. O cabeçalho mobile, por outro lado, sempre renderizava `totalCount`, inclusive no erro e no vazio.
- [x] `ProductsHeader` agora aceita `showCount`; a tela da lista o deriva da presença de linhas carregadas. Assim, erro sem snapshot, consulta vazia e carga inicial sem linhas não exibem “0”; quando uma atualização mantém o snapshot de linhas, o contador continua visível como no ERP. A mudança é apenas de apresentação: retry, consulta, total retornado e permissões não foram alterados.

#### Evidências, validação e limites

- [x] ERP: `erp/src/pages/App/Products/ProductList/index.tsx:119-175` retorna erro/vazio antes de montar a contagem. Mobile: `mobile/src/features/products/screens/NativeProductsScreen.tsx:546-555` passa total e presença de linhas; `mobile/src/features/products/components/ProductsHeader.tsx:20-52,66-101,140-153` controla a renderização do badge.
- [x] Consultei `AGENTS.md` (formulários RHF/Zod, ferramentas de validação, preservação da Conciliação ERP-only e limites de gravação), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, estrutura Produto/Variação, operações de mover/merge, inventários de Produtos e formulários, roadmap e a skill de replicação acessível. Não há `AGENTS.md` aninhado aplicável. A skill canônica do projeto segue ausente das pastas `.agents/skills` verificadas; a cópia em cache `.vercel` serviu apenas como orientação e sua proveniência não foi confirmada.
- [x] Vitest focado pelo runner do ERP: `npm run test -- --run --config vitest.config.ts ../mobile/src/features/products/components/ProductsHeader.test.tsx` — **1 arquivo, 2 testes aprovados** (badge omitido sem linhas e mantido com contagem/snapshot). A primeira execução encontrou apenas a ausência de `StyleSheet` no mock do teste; após completar o mock, passou.
- [x] A captura inicial do usuário comprova o estado anterior no app; a nova captura anexada em 26/10/2026 mostra o mesmo erro e o botão “Tentar novamente”, mas sem o badge “0” ao lado de “Produtos”, confirmando visualmente a apresentação corrigida. A imagem é evidência fornecida pelo usuário, não uma execução independente de Playwright/Maestro; ainda falta validar o comportamento em sessão controlada no ERP e em aparelho Android físico. Expo Web não foi usado como prova nativa. Não houve consulta/escrita remota, operação de lixeira, Meta/R2/SEFAZ, migration, deploy ou alteração operacional do Estoque; o guia prático não requer atualização.

**Conclusão do recorte:** a contagem não aparece mais como zero não confirmado nos estados mobile de erro/vazio e continua disponível enquanto há linhas. A correção de apresentação foi coberta por Vitest; a verificação no runtime nativo após a alteração permanece pendente. A auditoria geral continua aberta.

### Ciclo 386 — restauração de produto pela Lixeira — 26/10/2026

**Recorte:** ação individual Restaurar para o Produto Pai na lista filtrada da Lixeira, incluindo permissão, validação, chamada, resposta, atualização da lista e efeitos após sucesso/erro.

#### Comparação e classificação

- [x] No ERP, a lista só passa `showTrash` às ações quando `canDeleteProducts` é verdadeiro; `ParentProductActions` então apresenta Restaurar. O callback chama `executeRestoreProductFromTrash`, que mostra toast, executa `restoreProductFromTrash` e atualiza o cache/invalida a consulta somente após uma resposta de sucesso.
- [x] No app, o filtro da Lixeira também exige `deleteProducts`. O card mostra Restaurar no estado `showTrash`, exceto para perfil de identificação; `runMobileProductRestoreAction` repete o gate antes de despachar. A ação executa `productRestoreFromTrashFormSchema` pelo `useZodForm` antes de chegar ao serviço; o resolver normaliza/valida o ID. Falha de validação mostra `Alert` e não chama a operação.
- [x] Os dois serviços normalizam IDs de cards para o UUID do Produto Pai e chamam `restore_product_from_trash` com o mesmo argumento `p_product_id`. A função do banco é a mesma autoridade: exige usuário autenticado e `has_delete_products_permission()`, restaura pai e variações a partir de `trash_metadata.previous_state` e limpa o marcador `deleted`. Não executei a função nem consultei o Supabase remoto.
- [x] Sucesso e falha mantêm o contrato: ambos propagam a mensagem de negócio; no sucesso, o ERP atualiza cache local/invalida consultas e agenda o helper de sincronização do catálogo Meta, enquanto o app agenda o helper mobile e recarrega a página atual; no erro, ERP usa toast e app usa `Alert`. Timeout explícito de 10 s no serviço mobile é proteção de runtime, sem mudar a chamada ou o resultado esperado. Esses efeitos de sincronização foram inspecionados no código, não executados externamente.
- [x] Não há seleção em lote no estado mobile de cards; essa ausência acompanha o breakpoint de cards correspondente do ERP conforme o inventário do Ciclo 1186, então não criei restauração em lote no app.
- [x] O usuário decidiu no Ciclo 390 que Lixeira lista somente `deleted=true`; produtos apenas inativos ficam no filtro Desativados. A query foi corrigida em ERP e app, removendo o estado que permitia exibir itens sem exclusão com ação Restaurar.

#### Evidências, validação e limites

- [x] ERP: `ProductTable.tsx:335,385`, `ParentProductActions.tsx:64-74`, `useProductsDeletionActions.ts:52-81` e `productDependencyCheck.ts:265-304`. Predicado de consulta: `productFilterBuilder.ts:47-51`. Mobile: `NativeProductsScreen.tsx:139-149,590-594`, `MobileProductCard.tsx:238-258`, `productVariationOperationFormSchemas.ts:21-29`, `mobileProductMutationService.ts:465-484`, `useMobileProducts.ts:590-598` e `mobileProductFetchService.ts:244-251`. Contrato do RPC foi lido na migration versionada `supabase/migrations/20261013193600_product_trash_lifecycle.sql:329-424`.
- [x] Testes focados via Vitest: ERP `useProductsDeletionActions.test.ts` — **3 aprovados** para sucesso/erro; mobile `mobileProductMutationService.test.ts` — **5 aprovados** para RPC, retorno, timeout e validação; `mobileProductCardRules.test.ts` — **2 aprovados** para gate/dispatch. São testes com serviços/banco simulados, sem execução remota.
- [x] Consultei `AGENTS.md` (RHF/Zod, runners, política de não usar banco local e Conciliação ERP-only), `docs/geral/USER_RULES.md`, a regra pertinente `rules/products/product-reconciliation-erp-only.yml`, estrutura Produto/Variação, operações de mover/merge, inventário de paridade, registro de migração RHF/Zod, item 5 do roadmap e a skill acessível. Não encontrei `AGENTS.md` aninhado aplicável. A versão canônica da skill permanece ausente de `.agents/skills`; a cópia de cache em `.vercel` orientou o recorte, sem proveniência confirmada.
- [ ] Revisão estática e testes de unidade focados; não houve Playwright autenticado nem teste Android/Maestro após ação real. Nenhuma mutação remota, chamada Meta, operação SEFAZ, migration, deploy ou alteração operacional de Estoque ocorreu; o guia prático não exige atualização. A decisão pendente sobre produtos apenas inativos na Lixeira foi resolvida e aplicada no Ciclo 390.

**Conclusão do recorte:** a ação Restaurar do app corresponde ao ERP no gate, payload, resultado e atualização funcional, com validação e timeout mobile adicionais. A inconsistência para registros apenas inativos foi resolvida no Ciclo 390 conforme a decisão do usuário; a auditoria geral continua aberta.

### Ciclo 387 — leitura de atributos legados das variações — 26/10/2026

**Recorte:** parser das características de variação na consulta da lista e hidratação do produto ao abrir edição; formatos array/objeto, aliases, valores vazios e `showName`.

#### Comparação e correção

- [x] O ERP convertia arrays com `name`/`attribute_name`/`key` e `value`/`option`, convertia valores-objeto por `value`/`name`/JSON e descartava pares sem nome ou valor. A leitura mobile aceitava `name`/`attribute`/`key` e `value`/`val`, mas perdia os aliases ERP `attribute_name`/`option` e conservava valores vazios no modelo da lista. Como `NativeProductsScreen` reabre o cadastro a partir do produto recarregado pela consulta mobile, um atributo podia desaparecer no formulário ou surgir sem conteúdo.
- [x] Centralizei o parsing puro em `shared-utils/productVariationAttributes.ts`, e ERP e app passaram a consumir a mesma função. Os aliases existentes exclusivos do app (`attribute`/`val`) foram mantidos para compatibilidade. A opção `preserveStructuredShowName` conserva no mobile a preferência antiga em mapas de objetos; arrays mantêm `showName` em ambos. O mapeamento mobile segue aplicando `toTitleCase` compartilhado. Nenhum payload de gravação, schema do banco ou comportamento de autosave foi alterado.
- [x] A exceção Conciliação ERP-only permanece intacta; não houve alteração operacional no módulo Estoque e o guia prático não requer atualização.

#### Evidências, validação e limites

- [x] Referência ERP anterior: `erp/src/pages/utils/productService/productVariationMapper.ts` (parser `parseVariationAttributes` e chamada em `mapDbVariations`). Uso mobile: `mobile/src/features/products/services/mobileProductFetchService.ts` em `mapMobileVariationAttributes` e na leitura de `product_variations`. O fluxo de reabertura continua a partir do snapshot retornado por essa consulta.
- [x] Compartilhamento: novo `shared-utils/productVariationAttributes.ts`; o ERP reexporta o helper por `parseVariationAttributes`, e o serviço mobile o usa antes da normalização de texto.
- [x] Vitest via configuração do ERP: `npm run test -- --run --config vitest.config.ts ../mobile/src/features/products/domain/productVariationAttributes.test.ts ../mobile/src/features/products/services/mobileProductFetchService.test.ts` — **2 arquivos, 39 testes aprovados**. Cobrem aliases legados, exclusão de valores vazios, fallback objeto, preservação mobile de `showName` e mapeamento/carregamento da lista.
- [x] `git diff --check` passou nos arquivos do recorte; Git emitiu apenas avisos de normalização CRLF→LF nos arquivos ERP/mobile já modificados.
- [x] Antes da alteração, consultei o `AGENTS.md` da raiz informado nesta sessão, `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, documentação Produto/Variação e operações de mover/merge, inventários de produtos/formulários, item 5 do roadmap e skill acessível. Não há `AGENTS.md` aninhado nos diretórios envolvidos. A skill atual não foi encontrada em `.agents/skills`; usei somente como orientação a cópia armazenada no backup `.vercel`, cuja proveniência não foi confirmada.
- [ ] Sem Playwright autenticado, sem validação nativa por Maestro/aparelho físico e sem verificação visual após a alteração. Não consultei Supabase, não fiz DML/RPC, upload Meta/R2, ação fiscal, migration nem deploy.

**Conclusão do recorte:** leitura e normalização dos atributos legados de variação agora usam a mesma regra pura no ERP e no app, preservando a preferência `showName` previamente suportada pelo mobile. Os testes focados passaram; a auditoria do módulo Produtos permanece em andamento, com validação visual e nativa ainda pendentes.

### Ciclo 388 — nova tentativa após erro da lista — 26/10/2026

**Recorte:** estado da lista sem linhas após falha de consulta, botão de retry, repetição automática, preservação de página/filtros e retorno ao estado carregando/sucesso/erro.

#### Comparação e conclusão

- [x] No ERP, a tela prioriza loading; quando há erro e nenhuma linha, apresenta “Não foi possível carregar os produtos.” e “Tentar novamente”. A ação `refresh` invalida a query da chave atual, portanto conserva os filtros, a página e a política de retry do QueryClient.
- [x] No app, o mesmo estado é exibido quando `loadError` existe e não há linhas. O botão chama `productsHook.retry()`, que inicia `loadProducts(false, currentPage)`, limpa o erro anterior, valida os filtros e consulta a página atual; a proteção contra respostas obsoletas continua ativa.
- [x] A política de repetição também coincide: `erp/src/lib/queryClient.ts` define `retry: 1`, sem override na query de Produtos; o primeiro retry do TanStack Query espera 1 s por padrão. O mobile usa `retryMobileProductListReadOnce`, tenta a leitura novamente uma vez após `MOBILE_PRODUCT_LIST_RETRY_DELAY_MS = 1_000` e então propaga a falha. A mensagem e o rótulo do botão são iguais nos dois clientes. Não identifiquei diferença funcional no estado auditado.
- [x] A contagem “Produtos 0” já havia sido removida para erro/vazio sem snapshot no Ciclo 385; o badge não reaparece pelo retry. Quando o refetch conserva linhas de um snapshot bem-sucedido, os dois clientes mantêm esses dados em vez de sobrepor erro vazio.

#### Evidências, validação e limites

- [x] ERP: `ProductList/index.tsx:128-140`, `hooks/data/useProducts.ts:88-111,135-137` e `erp/src/lib/queryClient.ts:3-11`. Mobile: `NativeProductsScreen.tsx:597-614`, `useMobileProducts.ts:154-260,613-620` e `domain/mobileProductListRequest.ts:11-31`. Os contratos de estado e a diferença de disparo (invalidação TanStack versus consulta manual) foram comparados; a nova tentativa preserva a mesma consulta.
- [x] Vitest pelo runner permitido: ERP `useProductsQueryState.test.tsx` e mobile `mobileProductListRequest.test.ts` — **2 arquivos, 27 testes aprovados**. Os casos de serviço de query usam mocks; a política ERP de retry foi conferida também no QueryClient de produção.
- [x] Consultei o `AGENTS.md` da raiz fornecido nesta sessão (runners, login sem contornar gates, Conciliação ERP-only e proibição de DB local), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, documentação de Produto/Variação e mover/merge, inventário de paridade e item 5 do roadmap. Não há `AGENTS.md` aninhado nos diretórios ERP/mobile consultados. A skill canônica continua ausente de `.agents/skills`; a cópia `.vercel` foi usada somente como orientação e sua proveniência não foi confirmada.
- [ ] Não houve Playwright autenticado nem Maestro em aparelho Android físico; a confirmação independente do botão e da tentativa no runtime visual/nativo segue pendente. A captura inicial mostra o estado anterior da contagem e a nova captura confirma visualmente o retry sem badge “0”; nenhuma delas inclui a causa HTTP/Supabase. Sem o erro da consulta real não é possível atribuir a falha a um filtro, autorização, sessão ou disponibilidade. Não consultei/gravei Supabase, não invoquei Meta/SEFAZ, migration ou deploy; nenhuma operação de Estoque foi alterada e o guia não requer atualização.

**Conclusão do recorte:** retry, mensagem, uma repetição automática e preservação da mesma consulta estão alinhados entre ERP e mobile. Não alterei código. A causa observada na captura continua sem diagnóstico porque a imagem não contém log ou resposta da consulta; auditoria de Produtos permanece aberta.

### Ciclo 389 — referência residual na aba técnica mobile — 26/10/2026

**Recorte:** verificação estática de tipo na aba técnica do formulário, com foco no predicado que decide se uma característica é dimensão física e na equivalência com o helper usado pelo ERP.

#### Evidência e correção

- [x] O typecheck mobile falhava em `ProductFormTechnicalTab.tsx:689` porque `getDimensionField` era chamado após o Ciclo 374 remover a função local e passar a usar `getProductTechnicalDimensionField` para mapear as dimensões técnicas.
- [x] O helper compartilhado já é importado e usado pela aba mobile ao atualizar/remover dimensões, e pelo ERP em `technical/sync/valueChange.ts`. Substituí a referência residual no cálculo de `isPhysicalDimension`; não adicionei função nem alterei a regra de `applicable`, somente usei a mesma fonte de mapeamento das demais chamadas.
- [x] `productTechnicalDimensions.test.ts` passou em Vitest: **1 arquivo / 21 testes**. O typecheck mobile posterior não aponta mais `ProductFormTechnicalTab.tsx` nem `getDimensionField`.

#### Evidências, validação e limites

- [x] Fontes: `mobile/src/features/products/modals/tabs/ProductFormTechnicalTab.tsx:40,411,477,689-696`, `shared-utils/productTechnicalDimensions.ts:1-26`, `erp/src/pages/App/Products/components/tabs/technical/sync/valueChange.ts:1-50` e `productTechnicalDimensions.test.ts`.
- [x] Consultei o `AGENTS.md` da raiz informado nesta sessão (runners, RHF/Zod, Conciliação ERP-only e restrições de validação), `docs/geral/USER_RULES.md`, regra `rules/products/product-reconciliation-erp-only.yml`, documentação de estrutura Produto/Variação e operações mover/merge, inventário, roadmap e skills `ponytail` e `erp-web-to-mobile-replication`. A skill de replicação canônica continua ausente de `.agents/skills`; usei apenas a cópia `.vercel` como orientação, sem confirmar a proveniência. Não existe `AGENTS.md` aninhado aplicável nos caminhos fonte consultados.
- [x] `git diff --check` passou no arquivo do recorte, com aviso de normalização CRLF/LF.
- [ ] `tsc --noEmit -p mobile/tsconfig.json --pretty false` permanece não zero por erros fora do formulário de Produtos: `DistanceInput.tsx`, `MeasurementInput.tsx`, `useAgendaData.ts`, hooks de inventário/estoque, `InventoryMoveEditModalContent.tsx`, `financialAiAssistantService.ts`, `mobile/vitest.config.ts` e `shared-utils/commercialScheduling`. Não alterei esses módulos, sem relação demonstrada com Produtos. Sem Playwright/Maestro ou interação visual; nenhum dado remoto, estoque operacional, Meta/R2/SEFAZ, migration ou deploy foi acessado.

**Conclusão do recorte:** o erro de tipo na aba técnica de Produtos foi corrigido pela reutilização do helper compartilhado já usado pelo ERP. O projeto mobile ainda requer triagem dos diagnósticos globais fora deste recorte; a auditoria geral de Produtos continua aberta.

### Ciclo 390 — folha de filtros: visibilidade de mesclados e Lixeira — 26/10/2026

**Recorte:** filtros avançados da lista mobile e predicados ERP/mobile da Lixeira, mantendo separados o estado `active=false` e a exclusão lógica.

#### Comparação, decisão e correção

- [x] No ERP, os filtros são aplicados imediatamente pela sidebar; `ShowMergedProductsToggle` fica na toolbar e `productFilterBuilder` constrói a consulta. No app, a folha inferior atualiza os estados do hook, que consulta depois de `productListFormSchema` via `useZodForm.validateValues`; o botão “Aplicar filtros” fecha a folha, enquanto cada mudança já agenda a consulta.
- [x] `showMergedProducts` alterava a consulta mobile, mas não pertencia a `productListFormSchema`; o fetch lia o valor diretamente do closure. Incluí o booleano no schema e nos objetos validados de consulta e tamanho de página. O payload `includeMerged` agora deriva do valor parseado pelo resolver. A regra de visibilidade dos registros mesclados não mudou.
- [x] O usuário decidiu que Lixeira lista somente linhas com `deleted=true`; registros apenas inativos continuam no filtro **Desativados**. Substituí em `productFilterBuilder.ts` e `mobileProductFetchService.ts` o `OR active=false/deleted=true` por `eq('deleted', true)`. Os dois clientes continuam excluindo rascunhos; na lista normal o filtro Desativados usa `active=false` junto de `deleted=false`.
- [x] A captura anexada pelo usuário é uma tela de erro da lista, sem instruções documentais a seguir; foi mantida como evidência visual já tratada nos Ciclos 385/388, não como evidência da causa HTTP.

#### Evidências, validação e limites

- [x] ERP: `erp/src/pages/App/Products/components/ProductFilters.tsx`, `ProductsTopToolbar.tsx`, `ProductList/hooks/data/useProducts.ts` e `erp/src/pages/utils/productService/productFilterBuilder.ts`. App: `ProductsHeaderFiltersSheet.tsx`, `useMobileProducts.ts`, `mobileProductFetchService.ts` e `shared-utils/listingFormSchemas.ts`.
- [x] Regressões Vitest pelo runner do ERP: `productFilterBuilder.test.ts` (**17**), `mobileProductFetchService.test.ts` (**39**) e `mobileProductListFilters.test.ts` (**11**) — **3 arquivos, 67 testes aprovados**. Cobrem `deleted=true` na Lixeira, inativos no filtro Desativados, exclusão de rascunhos e tipos booleanos inválidos para opções de lista.
- [x] `tsc --noEmit -p mobile/tsconfig.json --pretty false`: não há diagnóstico em `useMobileProducts.ts` após incluir o campo no objeto inicial RHF. O typecheck ainda termina com erros existentes em `DistanceInput.tsx`, `MeasurementInput.tsx`, `useAgendaData.ts`, hooks de inventário/estoque, `InventoryMoveEditModalContent.tsx`, `financialAiAssistantService.ts`, `mobile/vitest.config.ts` e `shared-utils/commercialScheduling`; nenhum pertence a este recorte.
- [x] Consultei o `AGENTS.md` da raiz (formulários RHF/Zod, runners e Conciliação ERP-only), `docs/geral/USER_RULES.md`, `rules/products/product-reconciliation-erp-only.yml`, estrutura Produto/Variação, mover/merge, inventários de Produtos e formulários, item 5 do roadmap e a skill `erp-web-to-mobile-replication` acessível. Não há `AGENTS.md` aninhado nos diretórios envolvidos. A versão canônica da skill não foi localizada; usei somente a cópia no backup `.vercel` como orientação, sem proveniência confirmada.
- [ ] Sem Playwright autenticado ou Maestro em aparelho Android físico; a folha e os filtros não foram conferidos no runtime visual/nativo após a mudança. Não houve consulta/escrita Supabase, RPC de restauração, sincronização Meta, operação SEFAZ, migration, deploy ou operação operacional de Estoque; o guia prático não requer atualização.

**Conclusão do recorte:** `showMergedProducts` agora é validado antes da consulta e a separação entre Lixeira e Desativados está aplicada nos dois clientes. Os testes focados passaram; a prova visual autenticada e a nativa continuam pendentes. A auditoria global de Produtos segue em andamento.

### Ciclo 391 — busca textual da lista de Produtos — 26/10/2026

**Recorte:** limite mínimo, debounce, submissão por Enter, filtros de situação durante a busca e resolução de nomes/códigos/SKUs de variações na lista.

#### Comparação e conclusão

- [x] ERP e app usam `PRODUCT_LIST_SEARCH_MIN_LENGTH = 3` e o debounce compartilhado de **350 ms**. Ao digitar 1–2 caracteres, ambos mantêm o texto no campo e não fazem a busca; ao apagar tudo, limpam a consulta; no Enter, aplicam termos válidos, limpam termo vazio e ignoram termos curtos. O comportamento de busca ativo/desativado, com rascunhos preservados conforme o filtro, já está registrado no Ciclo 317 e segue alinhado.
- [x] `productFilterBuilder.ts` e `mobileProductFetchService.ts` reutilizam `buildProductSearchTerms`, `buildProductVariationSearchFilter` e `buildProductParentSearchFilter` de `shared-utils/productListSearch.ts`. A procura abrange nome/código no pai, nome/SKU nas variações e os pais correspondentes; ambos interrompem a consulta quando a busca por variações excede o limite compartilhado de 100.
- [x] A tela mobile valida a consulta pelo `productListFormSchema` real do `useZodForm` antes de chamar `fetchMobileProductsPage`; o campo inclui busca, filtros, paginação e opções de lista. A busca do ERP atualiza o filtro da lista a partir do input e segue a mesma normalização/limite, sem um formulário separado de submissão.
- [x] Não encontrei diferença funcional comprovada neste estado; nenhuma alteração de produção foi necessária. O estado de falha por busca ampla e seu retry são tratados nos Ciclos 388 e 390.

#### Evidências, validação e limites

- [x] ERP: `erp/src/pages/App/Products/hooks/useProductsPageState.ts`, `ProductList/index.tsx` e `erp/src/pages/utils/productService/productFilterBuilder.ts`. App: `mobile/src/features/products/hooks/useMobileProducts.ts`, `mobile/src/features/products/domain/mobileProductListFilters.ts` e `mobile/src/features/products/services/mobileProductFetchService.ts`. Regra comum: `shared-utils/productListSearch.ts`; schema móvel: `shared-utils/listingFormSchemas.ts`.
- [x] Vitest pelo runner do ERP: `productFilterBuilder.test.ts` (**17**), `mobileProductFetchService.test.ts` (**39**) e `mobileProductListFilters.test.ts` (**11**) — **3 arquivos, 67 testes aprovados**.
- [x] Consultei `AGENTS.md`, `docs/geral/USER_RULES.md`, a regra `rules/products/product-reconciliation-erp-only.yml`, documentação vigente de estrutura e operações de Produto/Variação, inventários de Produto e formulários, roadmap e a skill de replicação acessível. Não há `AGENTS.md` aninhado aplicável em ERP/mobile/shared-utils. A fonte canônica da skill permanece ausente; a cópia encontrada sob `.vercel` foi usada apenas como orientação e sem proveniência confirmada.
- [ ] Não houve Playwright autenticado nem Maestro em aparelho Android físico; esta conclusão compara a lógica e os estados cobertos por testes, sem afirmar validação visual/nativa ou execução contra o Supabase remoto. Não houve leitura/escrita remota, Meta/R2/SEFAZ, migration, deploy ou mudança operacional de Estoque; o guia prático não requer atualização.

**Conclusão do recorte:** busca curta, debounce, Enter, filtros de situação e construção da consulta permanecem equivalentes entre ERP e app, com regra pura compartilhada e validação Zod antes do fetch mobile. A prova autenticada/nativa continua pendente; a auditoria global de Produtos segue aberta.
