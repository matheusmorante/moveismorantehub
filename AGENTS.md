# Regras Obrigatórias para Agentes de IA — MoranteHub

Este arquivo estabelece as regras e diretrizes mandatórias para qualquer agente de inteligência artificial (Antigravity, Codex, Gemini, Claude, Cursor, etc.) que for inspecionar, refatorar, corrigir ou criar código neste repositório.

---

## 1. Regra Fundamental: Consulta Prévia à Documentação Vigente

Antes de propor, inspecionar ou alterar qualquer código relacionado ao sistema fiscal (NF-e modelo 55, NFC-e modelo 65, cancelamento, devolução, inutilização, reconciliação, transmissão SEFAZ, schemas ou banco de dados), **O AGENTE DEVE OBRIGATORIAMENTE CONSULTAR A DOCUMENTAÇÃO VIGENTE**:

1. **Ler o índice oficial de vigência:** [`docs/fiscal/README.md`](docs/fiscal/README.md).
2. **Consultar os invariantes arquiteturais:** [`docs/fiscal/invariantes-arquiteturais.md`](docs/fiscal/invariantes-arquiteturais.md) (invariantes `FISCAL-001` a `FISCAL-022`).
3. **Verificar os históricos de correções recentes:** [`docs/fiscal/historico-correcoes-2026-10-14.md`](docs/fiscal/historico-correcoes-2026-10-14.md) e [`docs/fiscal/revisao-fluxos-saida-2026-10-13.md`](docs/fiscal/revisao-fluxos-saida-2026-10-13.md).

> **Aviso Crítico:** É terminantemente proibido agir com base em suposições, documentações legadas desatualizadas ou snapshots substituídos. O agente deve sempre conferir a documentação mais recente antes de realizar alterações.

---

## 2. Regra de Registro: Documentação Mandatória de Toda Correção Fiscal

Toda e qualquer correção de bug, ajuste de lógica, adequação de schema, otimização de performance, criação de migration ou refinamento de interface no ecossistema fiscal **DEVE SER IMEDIATAMENTE REGISTRADA NA DOCUMENTAÇÃO**:

* **Onde registrar:** Crie ou atualize o arquivo em [`docs/fiscal/historico-correcoes-YYYY-MM-DD.md`](docs/fiscal/).
* **O que deve constar no registro:**
  1. Problema identificado e sintomas observados.
  2. Causa raiz técnica comprovada.
  3. Lista exata dos arquivos e linhas modificados (backend, frontend, SQL/migrations).
  4. Solução técnica implementada.
  5. Testes executados e validações que comprovam a não-regressão.
* **Atualização do índice:** Toda nova documentação deve ser imediatamente linkada na seção *Referências atuais* de [`docs/fiscal/README.md`](docs/fiscal/README.md).
* **Nenhum agente pode finalizar uma tarefa sem documentar as correções realizadas.** Isso garante que agentes subsequentes não fiquem lendo documentações dessincronizadas ou reintroduzam falhas já sanadas.

---

## 3. Invariantes de Segurança e Confiabilidade Fiscal

**Política de produto obrigatória: o MoranteHub NÃO utiliza Carta de Correção Eletrônica (CC-e). Não criar, restaurar ou oferecer botão, formulário, modal, menu, rota ou fluxo de CC-e, inclusive tela dedicada de histórico. A correção fiscal adotada é cancelamento fiscal ou estorno fiscal direto da NF, segundo a elegibilidade vigente. A circulação da mercadoria também não autoriza oferecer CC-e. Artefatos técnicos/eventos antigos de CC-e, quando necessários à auditoria, não autorizam reintroduzir a funcionalidade. Esta diretriz não altera por inferência os critérios de circulação da mercadoria.**

1. **Separação de Ambientes:** Isolamento estrito entre Homologação (`tpAmb = 2`) e Produção (`tpAmb = 1`). Produção exige autorização explícita do operador e certificado válido.
2. **Idempotência e Numeração:** 
   * `SELECT MAX(numero) + 1` é estritamente proibido. Numerações fiscais são reservadas de forma atômica no PostgreSQL.
   * Não retransmitir automaticamente quando houver resultado incerto. Em caso de timeout de rede ou queda, consulte primeiro a mesma chave na SEFAZ.
3. **Integridade de Snapshots:**
   * Nunca injete campos arbitrários em objetos JSON de snapshot que sejam validados via hash ou RPC no banco (`prepare_nfe_outbound_attempt`). O payload enviado deve ser idêntico ao snapshot persistido.
4. **Validação XSD:**
   * Todo XML gerado deve ser validado localmente contra o pacote XSD oficial vigente antes de qualquer tentativa de transmissão à SEFAZ.
5. **Segurança de Credenciais:**
   * Certificados A1, chaves privadas, senhas e tokens de API nunca devem ser expostos no frontend, nem registrados em logs ou ferramentas de telemetria.

---

## 4. Concorrência, Banco de Dados e Timeouts de Rede

1. **Transações Ociosas no PostgreSQL:**
   * Nunca mantenha transações abertas no PostgreSQL enquanto aguarda I/O de rede (chamadas à SEFAZ via SOAP/mTLS, APIs externas ou ações do cliente).
   * O banco deve sempre respeitar `idle_in_transaction_session_timeout <= 60s` para impedir que conexões abandonadas segurem `advisory locks` e esgotem o pool do PostgREST.
2. **Resiliência e Proteção contra Travamentos no Frontend:**
   * Nenhuma consulta assíncrona ao Supabase ou à API pode bloquear a interface do usuário indefinidamente.
   * Utilizar a função de proteção `withTimeout` com temporizadores adequados e fallbacks seguros em chamadas críticas de sessão (`AuthContext.tsx`), perfil e status.
   * Preservar timers de failsafe ativos para garantir que o estado `loading` nunca permaneça `true` indefinidamente.
   * Fornecer sempre feedback visual claro e transparente (banners animados com spinner e textos explicativos de status).

---

## 5. Todos os Formulários: React Hook Form + zodResolver

Por determinação do usuário, **todos os formulários do sistema** (ERP, aplicativo móvel e catálogo digital) devem usar `react-hook-form` e `@hookform/resolvers/zod`. A regra inclui modais com botões, cadastros inline, configurações, buscas submetidas, importações e autosave.

* Toda operação de submissão deve executar o resolver real antes de chamar seu serviço; instalar/importar a biblioteca não satisfaz a regra.
* Reutilizar schemas Zod explícitos de domínio em `shared-utils` quando as regras forem comuns. Não inferir regras de negócio apenas dos tipos do Supabase nem usar schemas vazios/permissivos para simular a integração.
* Campos filhos pertencem ao formulário proprietário. Preservar contratos distintos de rascunho, finalização, baixa, cancelamento e consulta; um rascunho pode estar incompleto.
* Erros devem impedir o efeito e ser apresentados na interface. Valores parseados seguem para a operação; regras de permissões, contexto, banco e fiscal continuam no backend.
* Registrar a cobertura e os caminhos ainda pendentes no inventário de migração; não declarar conclusão global enquanto houver caminhos sem conferência.

---

## 6. Navegação do Aplicativo: Módulos e Filtros Separados

* A aba global **Pedidos** do aplicativo deve abrir um menu de módulos equivalente à hierarquia de Vendas do ERP, incluindo Pedidos de Venda, Orçamentos, Assistências e Devoluções.
* Ao entrar em um módulo, a lista e a consulta devem ficar limitadas ao tipo selecionado. A tela **Pedidos de Venda** deve exibir somente filtros de status da venda; Assistências, Devoluções e Orçamentos são módulos próprios, nunca filtros da lista de vendas.
* Preservar essa hierarquia ao criar ou revisar a navegação mobile; não juntar tipos de operação diferentes em uma única lista de filtros.

---

## 7. Testes: Playwright, Maestro, Vitest e banco remoto

* Não iniciar nem usar Supabase Local, PostgreSQL local, Docker ou banco/simulador local como infraestrutura de teste. O fluxo local de Supabase está extinto no projeto; não executar `supabase start`, resets locais, migrations em banco local nem `npm run advisors` (o script usa `--local`).
* Os runners permitidos são Playwright para fluxos de interface no navegador, Maestro CLI para fluxos nativos do aplicativo Android em telefone físico e Vitest/RTL para componentes e lógica isolada. Não executar scripts de teste avulsos em Node/CJS/SQL nem CLI Supabase. Os scripts `npm run test:mobile:*` são permitidos quando delegam a execução ao Maestro e respeitam as guardas abaixo.
* Testes de interface no navegador devem exercitar a UI com Playwright; testes nativos do aplicativo Android devem usar Maestro conforme [`mobile/maestro/README.md`](mobile/maestro/README.md). Não usar Expo Web nem emulador como substituto do teste no aplicativo Android. Testes de componente e lógica isolada devem usar Vitest/RTL; mocks não comprovam persistência ou comportamento real do PostgreSQL.
* Para Maestro, usar somente telefone físico conectado por Depuração sem fio via ADB, escolher explicitamente o serial quando houver mais de um destino e preservar os dados existentes do aplicativo. Não limpar os dados do app, desinstalar ou instalar outra build durante uma auditoria sem autorização explícita.
* Ao executar testes de navegador, iniciar o servidor de desenvolvimento do ERP e usar sempre a porta `5173`; configurar `strictPort` para impedir fallback silencioso para outra porta.
* Quando a propriedade depender do banco, usar somente o projeto Supabase remoto operacional existente, schema `public` e fixtures próprias com ownership e gates comprovados, conforme [`docs/testing/SUPABASE_REMOTE_TEST_POLICY.md`](docs/testing/SUPABASE_REMOTE_TEST_POLICY.md). Isso vale também para fluxos Maestro. Não criar branches, projetos, bancos ou schemas para testar.
* O operador concedeu autorização permanente para o agente aplicar migrations de schema necessárias a tarefas explicitamente solicitadas no Supabase operacional existente, sem pedir nova confirmação para cada migration. A autorização e seus limites estão registrados em [`docs/testing/SUPABASE_REMOTE_TEST_POLICY.md`](docs/testing/SUPABASE_REMOTE_TEST_POLICY.md).
* Emissão fiscal real à SEFAZ só pode ocorrer pela UI, em Homologação e com autorização explícita. Se autenticação, ownership ou isolamento dos artefatos não for comprovado, não contornar a guarda: concluir as provas de UI somente leitura seguras com Playwright ou Maestro e registrar o cenário remoto gravável como pendente com a causa concreta.

## 8. Remoção do Catálogo da Meta

* Sempre que o usuário pedir para ocultar/remover um produto ou variação do catálogo, verificar a sincronização real com a Meta Catalog Graph API (`items_batch`) e confirmar o resultado no próprio catálogo da Meta (consulta de produtos por `retailer_id`/SKU). Não considerar a mudança do status no ERP nem a retirada do feed CSV como confirmação suficiente.
* O feed CSV antigo não está mais em uso como fonte de sincronização. Não depender dele para remover itens da Meta; usar a Graph API e, se não for possível consultar/confirmar o resultado, deixar essa limitação explícita ao usuário.

---

## 9. Autonomia de Login e Credenciais da Vercel

* O agente é responsável por executar os logins necessários ao trabalho autorizado. Não pedir ao usuário que tente entrar, preencha credenciais ou faça o login manualmente.
* As credenciais devem ser obtidas das variáveis de ambiente da Vercel do projeto e ambiente corretos. Usar a integração ou CLI autenticada e os mecanismos de ambiente já adotados pelo repositório.
* **Acesso às ferramentas com perfil de operador:** A conta de operador do ERP/app é `matheusmorante002@gmail.com`. Usar somente credenciais dessa conta obtidas dos ambientes Vercel do projeto; confirmar que o endereço carregado corresponde a essa conta antes de autenticar e não substituir por contas de teste de outros módulos. As credenciais de operador disponibilizadas nos ambientes do projeto podem ser usadas pelo agente para acessar as ferramentas necessárias a uma tarefa autorizada, não apenas para testes. Usar o ambiente compatível com a tarefa e respeitar as permissões do perfil, os gates de ownership e as autorizações já definidas; o login não concede autorização adicional para operações fiscais em produção, externas ou irreversíveis.
* Se o login falhar, investigar e corrigir a causa — configuração, carregamento das variáveis, formulário, sessão, permissões ou automação do navegador — e repetir o fluxo apropriado. Resolver os impedimentos técnicos de autonomia antes de transferir trabalho ao usuário.
* Carregar credenciais somente em memória durante a execução. Não expor senhas, tokens ou sessões em mensagens, argumentos de comando, snapshots, screenshots, traces, logs ou arquivos de evidência.
* A autonomia de login preserva as permissões da conta, os gates de ownership e isolamento dos testes e as autorizações exigidas para operações fiscais ou outras ações externas.

---

## 10. Inicialização e Reinício dos Servidores de Desenvolvimento

* Sempre que o usuário pedir para iniciar, subir ou reiniciar um servidor, executar **`npm run dev` na raiz do repositório**, iniciando toda a pilha de serviços orquestrada por esse comando.
* Expressões como “iniciar o servidor do ERP”, “servidor do app” ou referências a um módulo também significam iniciar a pilha completa. Usar o comando padrão da raiz, com os mecanismos de ambiente existentes.
* Ao reiniciar, encerrar a execução anterior da mesma pilha antes de iniciar a nova, evitando processos duplicados e conflitos de portas.
* Confirmar que o ERP está disponível na porta `5173` com `strictPort` e que a API da porta `3000` responde antes de informar que o ambiente está pronto.

---

## 11. Guia Prático do Estoque: Atualização Obrigatória

* Sempre que uma mudança de lógica, regra ou interface do módulo de Estoque alterar como o estoquista deve operar o ERP ou o app, **atualizar o guia prático no mesmo trabalho**. Não encerrar a alteração operacional como concluída com o guia pendente ou desatualizado.
* A regra inclui mudanças em passos, pré-requisitos, permissões, botões, status e orientações de recebimentos, NF de entrada, vínculos de fornecedor/produtos, compras, inventários, movimentações e etiquetas.
* Atualizar `erp/public/guias/guia-pratico-estoque.pdf`, usado pelo submenu Estoque, e manter `output/pdf/guia-pratico-do-estoque.pdf` com o mesmo conteúdo. Atualizar apenas histórico técnico ou arquivos temporários não substitui essa entrega.
* O guia deve explicar a operação em linguagem de usuário, com os nomes reais das ações e condições vigentes. Conferir as instruções existentes, corrigir os trechos afetados e remover orientações substituídas.
* Ao editar o PDF, usar a skill de PDF disponível, renderizar o documento final e revisar visualmente as páginas alteradas. Conferir que as cópias estejam sincronizadas e que o acesso pelo submenu permaneça funcionando.
* Aplicar a skill `morantehub-stock-guide`, quando disponível. A obrigação também vale para agentes que não tenham essa skill instalada.
* Mudanças exclusivamente internas, sem impacto na operação do estoquista, não exigem reescrever o PDF; o agente deve avaliar esse impacto antes de concluir.

## 12. Conciliação de Produtos: exclusiva do ERP

* A Conciliação de Produtos permanece somente no ERP por decisão explícita do usuário. Não crie nem reintroduza no aplicativo tela, rota, serviço/adaptador, botão, entrada de menu, fluxo ou link que abra a Conciliação como módulo mobile. Não registre sua ausência no app como diferença de paridade.
* Preserve as telas, rotas, permissões, queries, mutações e helpers compartilhados que o ERP usa. A regra de código que protege a superfície mobile está em `rules/products/product-reconciliation-erp-only.yml`; só reverta esta exceção mediante pedido explícito posterior do usuário.

## 13. Autorização permanente para migrations Supabase

* Em 24/10/2026, o operador autorizou o agente a executar, sem confirmação repetida por migration, migrations de schema necessárias para implementar tarefas explicitamente solicitadas no Supabase operacional já usado pelo ERP.
* Antes de cada aplicação, revisar o SQL completo, confirmar o project ref, consultar o histórico remoto e validar precondições, compatibilidade e impacto. Aplicar somente no schema `public` do projeto operacional existente e verificar o resultado depois.
* Quando uma migration de schema for necessária para concluir uma tarefa explicitamente solicitada, aplicá-la ao Supabase operacional na mesma tarefa após as verificações acima. Não finalizar deixando a migration apenas no repositório nem tratar a aplicação como uma etapa futura. Se o histórico, as precondições ou a compatibilidade não forem confirmados, não aplicar e registrar o bloqueio concreto.
* Esta autorização cobre DDL de migrations dentro do escopo solicitado. Não autoriza provisionar fixtures ou dados sintéticos, fazer escritas DML de teste, limpar dados, criar projetos/branches/bancos/schemas, enviar mensagens, executar ações fiscais nem contornar gates de ownership, isolamento e autorização específicos. Essas operações continuam sujeitas à política e às aprovações próprias.
* Permanecem proibidos Supabase Local, migrations em banco local, `DROP`, `TRUNCATE`, DDL experimental e alterações amplas de RLS no banco compartilhado. Preferir migrations compatíveis e reversíveis, sem apagar histórico ou registros operacionais.

## 14. Semântica da Lixeira de Produtos

* A Lixeira lista somente produtos com `deleted = true`; produtos inativos sem exclusão permanecem no filtro **Desativados**.
* Aplicar esse predicado tanto no ERP quanto no aplicativo. Não combinar `active = false` com a Lixeira.

## 15. Obrigatoriedade no Formulário de Produto

* No formulário de produto, o asterisco vermelho indica exclusivamente campos necessários para concluir o cadastro no ERP. Não usar o asterisco em características que sejam exigidas somente para o Catálogo Digital.
* Marca e Modelo/Linha são características obrigatórias para publicação no Catálogo Digital em todas as categorias. Características obrigatórias por categoria também devem ser adicionadas automaticamente e validadas para publicação no Catálogo Digital. Nenhuma dessas exigências deve bloquear o cadastro nem a ativação do produto no ERP, nem exibir asterisco vermelho ou controle para ativar/desativar a característica.
* Quantidade de portas, Tipo de portas, Peso e Material das portas permanecem opcionais em todas as categorias, tanto no cadastro do ERP quanto na publicação no Catálogo Digital, inclusive quando houver configurações antigas marcando esses campos como obrigatórios. Material das portas continua opcional independentemente da quantidade de portas ou do valor de qualquer outra característica.
* Características Sim/Não devem usar um grupo de opções radio com rótulos visíveis “Sim” e “Não”, sem alternador deslizante; preserve a acessibilidade dos controles para leitores de tela.

## 16. Publicação de atualizações OTA do aplicativo

* Publicar uma atualização OTA (EAS Update), em qualquer branch, ambiente ou plataforma, somente quando o usuário pedir explicitamente. Um pedido para implementar uma mudança no app não autoriza sua publicação OTA.
* Sem pedido explícito de OTA, concluir as alterações locais e informar que a publicação ficou pendente. Builds e verificações locais do bundle são permitidos se não publicarem uma atualização.

## 17. Paridade obrigatória nas funcionalidades existentes no ERP e no app

* Ao alterar uma funcionalidade existente tanto no ERP quanto no aplicativo, conferir os caminhos reais nas duas plataformas e aplicar a mudança equivalente em ambas no mesmo trabalho, sem exigir que o usuário repita o pedido para o app. Isso inclui regras, validações, permissões, filtros e otimizações de consultas ou carregamento de mídias, respeitando as diferenças de interface web e nativa.
* Antes de afirmar que uma mudança foi replicada, localizar e revisar as telas, componentes, hooks, serviços e chamadores correspondentes. Registrar o que foi alterado e validado em cada plataforma; não declarar paridade concluída se uma delas ficou pendente.
* Esta regra cobre as funcionalidades já existentes nas duas plataformas. Se o módulo ou a tela não existir no app, informar a ausência concreta; a paridade de uma alteração pontual não autoriza criar um módulo inteiro. Não presumir uma implementação mobile nem pedir decisão sobre criar esse módulo como condição para concluir a alteração na tela existente do ERP.
* Preservar as exceções explícitas de produto, especialmente a Conciliação de Produtos exclusiva do ERP (seção 12), e a exigência de pedido explícito para publicação OTA (seção 16).

## 18. Paginação fixa no ERP e telas sem paginação

* Nas listas paginadas do ERP, exibir no máximo 15 registros por página. Não oferecer opções de 30, 50, 100 ou outro tamanho selecionável; remova o seletor e mantenha a navegação entre páginas.
* A Agenda e o Cronograma de logística não devem ter paginação. Exibir todos os resultados que correspondam aos filtros vigentes, sem recorte por página nem controles de navegação.
* Ao criar ou alterar um paginador do ERP, conferir todas as listas e caminhos afetados. A página inicial deve permanecer em 15 e não deve recuperar preferências ou quantidades salvas anteriormente.

## 19. Campos de busca e autocomplete

* Campos que oferecem sugestões em modal/dropdown ancorado ao input devem iniciar a busca e exibir resultados somente após pelo menos 3 caracteres úteis, com debounce mínimo de 300 ms nas consultas remotas. Consultas canceladas ou respostas obsoletas não devem atualizar a lista.
* Exibir no máximo os 5 primeiros resultados nas sugestões. Aplicar limite também na consulta remota quando isso preservar os filtros e a cobertura da busca; se houver overfetch necessário por filtragem local posterior, documentar o motivo e manter a lista visível limitada a 5.
* No ERP em telas largas, a busca comum de campo usa a lista de resultados ancorada abaixo do input, sem abrir uma tela/modal dedicado de busca avançada. Interfaces dedicadas de busca avançada ficam restritas ao mobile; quando usadas em campos, devem apresentar os resultados em um painel compacto logo abaixo do input.
* Revisar os chamadores e consumidores antes de alterar busca compartilhada; não aplicar esta regra a listas completas, filtros de páginas ou fluxos próprios de seleção/histórico que não sejam autocomplete de campo.

## 20. Busca sem distinção de acentos

* Em todos os campos de busca por texto livre do ERP e do aplicativo, letras com e sem acento devem encontrar os mesmos resultados, sem distinção de maiúsculas e minúsculas. Por exemplo, “cafe” deve localizar “Café”, e “Café” deve localizar “cafe”.
* Aplicar a normalização tanto à consulta quanto aos valores comparados, em buscas locais, offline e remotas. Em consultas remotas, filtrar no servidor antes da paginação, do limite e da contagem; não carregar apenas uma página para depois remover acentos no cliente.
* Preservar os textos exibidos e armazenados, os campos cobertos pela busca, os filtros existentes e a pesquisa por códigos numéricos. A normalização vale somente para comparação e não altera cadastros.
* Ao alterar uma busca existente nos dois clientes, conferir os caminhos reais do ERP e do app e manter a regra equivalente em ambos. Reutilizar os utilitários compartilhados quando aplicável, sem enfraquecer os limites de caracteres, debounce, cancelamento e quantidade de sugestões definidos na seção 19.

## 21. Máscaras para valores monetários e percentuais

* Campos monetários devem reutilizar o padrão de máscara do projeto: a digitação começa pelos centavos à direita e cada novo dígito desloca os anteriores para a esquerda. Para valores em reais, manter duas casas decimais e a formatação local (`0,01`, `0,12`, `1,23`), sem tratar o primeiro dígito digitado como reais inteiros.
* Campos percentuais também devem usar máscara numérica, com a precisão adequada ao domínio e o sufixo visual correspondente. Ao alternar entre percentual e valor monetário, preservar a conversão numérica e aplicar a máscara do modo atual.
* Reutilizar `CurrencyInput`, `MaskedNumericInput` ou o componente mascarado equivalente do ERP; não deixar esses valores em `TextInput`/`input` sem máscara nem duplicar parsers locais quando houver componente padrão.
* Manter no estado e nas operações os valores numéricos já interpretados; a string formatada pertence somente à apresentação. Conferir digitação, exclusão, colagem e troca de modo antes de considerar uma máscara concluída.

## 22. Refatoração modular orientada a princípios

* Aplicar responsabilidade única, coesão e baixo acoplamento ao revisar arquivos grandes. O limite de 500 linhas prioriza a inspeção; a refatoração deve se apoiar numa responsabilidade distinta e demonstrável.
* Antes de concluir que não há refatoração segura, mapear as responsabilidades do arquivo e avaliar pelo menos um limite concreto, como estado e hidratação, transformação/mapeamento, acesso a dados, configuração estática ou apresentação. Preservar interfaces públicas com fachadas, reexports ou adaptadores quando isso permitir extrair a unidade sem mudar o contrato.
* Muitos `useState`, setters, consumidores, tipos compartilhados ou um objeto de retorno amplo não provam, por si só, que o código é inseparável. Tratar esses elementos como dependências a mapear; avaliar a extração de uma unidade coesa mantendo a forma pública e verificando ordem, fallbacks, validação e tratamento de erros.
* Declarar um alvo bloqueado somente diante de evidência concreta: diff local no próprio alvo ou dependência diretamente acoplada, ou uma incompatibilidade de comportamento/contrato que permaneça após avaliar uma fachada compatível. Alterações locais não relacionadas não bloqueiam o trabalho. Se não houver limite seguro, registrar no inventário qual responsabilidade foi avaliada e a causa específica da recusa, e avançar para outro candidato disponível.
* Usar as skills `ponytail` e `safe-refactor` como método de trabalho, não apenas citá-las: escolher a menor extração completa, conferir chamadores/dependências/exports e comparar o comportamento antes e depois. Usar `investigate-first` quando comportamento ou fronteira não estiverem claros. Respeitar a política de testes vigente e não alegar validação dinâmica sem executá-la.

## 23. Módulo Produtos desativado no app beta

* No aplicativo beta, manter o botão **Produtos** visível na navegação, porém desativado e inacessível. Não abrir o módulo por toque nem por aba/URL inicial direta; voltar para Operações. O app de produção e o ERP mantêm o acesso conforme as permissões existentes.
* O beta corresponde ao canal EAS `preview` e à simulação local iniciada pelo comando raiz `npm run dev`. Manter `EXPO_PUBLIC_APP_BETA=true` no perfil `preview` de `mobile/eas.json` e no ambiente do processo local iniciado por `scripts/run-vercel-env-dev.cjs`.
* A navegação deve usar essa identificação para desativar o botão e impedir a abertura direta de Produtos. Não reativar o módulo no beta sem pedido explícito posterior do usuário.

## 24. Filtros de dados no servidor

* Em listas, buscas e seletores de dados armazenados no servidor, implementar os filtros no servidor no ERP e no aplicativo. Aplicar os critérios e a ordenação antes da paginação, do limite e da contagem, preservando permissões e regras de exclusão aplicáveis.
* Não baixar conjuntos completos ou páginas de candidatos para filtrar, ordenar ou contar no navegador ou aplicativo. Consultas devem retornar somente a página ou os resultados necessários; carregar detalhes adicionais apenas quando a operação exigir.
* Preservar os campos e resultados abrangidos pelos filtros, inclusive dados legados, e as regras de busca sem acentos e sem depender da ordem das palavras. Confirmar os caminhos das duas plataformas e os consumidores compartilhados antes de alterar a consulta.
* Sem conexão, o aplicativo pode filtrar o cache existente no dispositivo para manter o modo offline; a interface deve informar que os resultados são locais. Ao voltar a ficar online, executar novamente a consulta no servidor. Qualquer outra exceção para dados remotos depende de solicitação explícita posterior do usuário e deve ser documentada.

## 25. Consumo do Supabase, consultas e egress

* Em toda mudança que introduza ou altere acesso a dados no ERP, aplicativo, catálogo, API ou banco, considere desde o início como reduzir requisições, trabalho do banco e bytes transferidos, preservando resultados, permissões, informações necessárias, atualização de preços/estoque e operação offline. A economia de consumo é requisito recorrente, mesmo quando não for o foco principal do pedido.
* Trate quantidade de requisições, custo de execução no banco e egress como métricas diferentes. Reduzir chamadas não garante reduzir bytes; uma resposta menor não garante reduzir CPU ou tempo do banco. Compare medidas equivalentes quando disponíveis e identifique telemetria amostral como estimativa, sem apresentá-la como cobrança oficial.
* Em consultas Supabase, selecione campos explícitos usados pelo consumidor; filtre, ordene, agregue, conte e pagine no servidor antes de limitar os resultados. Para listas, prefira resumos e carregue detalhes pelo ID quando necessários. Evite consultas N+1, leituras repetidas por assinante e respostas completas sem necessidade; use lotes, deduplicação e cache com chave, escopo e invalidação corretos.
* Em SQL/RPC, avalie projeções, predicados, joins, agregações e índices junto ao plano de execução. Adicione índices ou RPCs somente quando evidência mostrar benefício; mantenha filtros de exclusão e permissões/RLS antes da paginação e não amplie acesso para reduzir consultas.
* Preserve a atualização exigida pelo domínio: preços e estoque devem ser conferidos ao serem usados; mensagens precisam recuperar alterações após desconexão; o app offline pode buscar nos dados salvos e deve consultar novamente o servidor ao reconectar. Não introduza cache que torne esses dados incorretos ou silenciosamente obsoletos.
* Quando a funcionalidade existir no ERP e no app, confira os dois caminhos e seus chamadores. Para medir, registre separadamente volume de chamadas, linhas/campos e bytes/respostas, latência e serviço (REST, Realtime, Storage); use janelas e versões comparáveis e não declare economia faturável sem evidência do medidor oficial.
* Revisar os acessos amplos com `rules/supabase/supabase-consumption.yml` e aplicar a skill `supabase-consumption`, quando disponível. Esta regra complementa a seção 24 e não altera os limites de migrações, testes remotos e mudanças operacionais definidos na seção 7 e na seção 13.
* Manter `docs/auditorias/roadmap-otimizacao-consumo-supabase.md` como índice cumulativo das áreas auditadas e das sugestões. Cada sugestão deve ter ID, evidência, estimativa/limite de economia, opções, implicações, status e decisão; registrar `negada` quando recusada e `executada` com arquivos/validações quando aplicada. Antes de propor algo, ler o roadmap e os registros anteriores para não repetir recomendações; não alterar código ou banco sem aceite explícito do usuário.
