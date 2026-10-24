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

## 7. Testes: interface via Playwright, lógica via Vitest e banco remoto

* Não iniciar nem usar Supabase Local, PostgreSQL local, Docker ou banco/simulador local como infraestrutura de teste. O fluxo local de Supabase está extinto no projeto; não executar `supabase start`, resets locais, migrations em banco local nem `npm run advisors` (o script usa `--local`).
* Os únicos runners de teste permitidos são Playwright para fluxos de interface no navegador e Vitest/RTL para componentes e lógica. Não executar scripts de teste avulsos em Node/CJS/SQL nem CLI Supabase; testes que dependam do banco remoto devem estar integrados ao Playwright ou Vitest e obedecer às guardas abaixo.
* Testes de interface devem exercitar o navegador de desenvolvimento pela UI com Playwright. Testes de componente e lógica isolada devem usar Vitest/RTL; mocks não comprovam persistência ou comportamento real do PostgreSQL.
* Ao executar testes de navegador, iniciar o servidor de desenvolvimento do ERP e usar sempre a porta `5173`; configurar `strictPort` para impedir fallback silencioso para outra porta.
* Quando a propriedade depender do banco, usar somente o projeto Supabase remoto operacional existente, schema `public` e fixtures próprias com ownership e gates comprovados, conforme [`docs/testing/SUPABASE_REMOTE_TEST_POLICY.md`](docs/testing/SUPABASE_REMOTE_TEST_POLICY.md). Não criar branches, projetos, bancos ou schemas para testar.
* Emissão fiscal real à SEFAZ só pode ocorrer pela UI, em Homologação e com autorização explícita. Se autenticação, ownership ou isolamento dos artefatos não for comprovado, não contornar a guarda: concluir as provas locais seguras e registrar o cenário remoto como pendente com a causa concreta.

## 8. Remoção do Catálogo da Meta

* Sempre que o usuário pedir para ocultar/remover um produto ou variação do catálogo, verificar a sincronização real com a Meta Catalog Graph API (`items_batch`) e confirmar o resultado no próprio catálogo da Meta (consulta de produtos por `retailer_id`/SKU). Não considerar a mudança do status no ERP nem a retirada do feed CSV como confirmação suficiente.
* O feed CSV antigo não está mais em uso como fonte de sincronização. Não depender dele para remover itens da Meta; usar a Graph API e, se não for possível consultar/confirmar o resultado, deixar essa limitação explícita ao usuário.

---

## 9. Autonomia de Login e Credenciais da Vercel

* O agente é responsável por executar os logins necessários ao trabalho autorizado. Não pedir ao usuário que tente entrar, preencha credenciais ou faça o login manualmente.
* As credenciais devem ser obtidas das variáveis de ambiente da Vercel do projeto e ambiente corretos. Usar a integração ou CLI autenticada e os mecanismos de ambiente já adotados pelo repositório.
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
