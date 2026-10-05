---
name: testes-seguros-erp
description: Planeje e execute testes seguros do ERP e App Mobile em alterações de regras de negócio, banco, estoque, vendas, recebimentos, devoluções, custos, relatórios ou integrações; use o Supabase remoto configurado como padrão para testes de integração com PostgreSQL, com escopo controlado e fixtures sintéticas.
---

# Testes Seguros do ERP & App Mobile

Para sincronização das variáveis do ambiente local, falhas no `predev`, secrets ou escolha entre Development e Preview, siga a fonte única [vercel-development](../vercel-development/SKILL.md). Esta skill continua definindo os limites de segurança dos testes.

A reconciliação técnica de tentativa fiscal incerta pode usar o backend/API oficial sem interface, com retransmissão desabilitada e exatamente o documento/chave/XML/`emissionRequestId` existentes. Confira persistência e isolamento dos efeitos conforme `docs/testing/SUPABASE_REMOTE_TEST_POLICY.md`. Evidência de backend/SEFAZ/banco deve ser distinguida da validação do botão, requisição e atualização visual no frontend; emissão de teste continua pela UI.

Use esta skill sempre que a mudança puder alterar regras de negócio, persistência, interface ou efeitos entre módulos. Também utilize-a como guia mestre para executar e continuar o **Roadmap Cíclico de Testes Contínuos** do Morante Hub.

## Quando aplicar esta Skill

- Ao implementar, classificar, executar ou migrar testes unitários, de integração ou E2E do ERP/App Mobile.
- Quando testes puderem acessar Supabase, autenticação, pedidos, produtos, variações, composição, estoque ou inventário.

## Quando NÃO aplicar

- Para alterações de interface ou lógica sem impacto de teste, dados, persistência ou fluxo entre módulos.
- Para automação de interface nativa que não use Maestro em celular físico conectado por depuração Wi‑Fi. Emuladores/AVDs e testes em alvo USB não são permitidos.

## Política incremental de validação

Ao alterar código, a própria alteração autoriza a validação mínima necessária antes do commit. Use `git diff` para delimitar arquivos e módulos e rode primeiro somente o teste focado do módulo alterado. Se ele passar, execute TypeScript/compilação e lint apenas no escopo aplicável. Não rode baterias amplas por padrão.

Para mudança apenas de texto ou CSS, faça somente as verificações mínimas aplicáveis; use validação visual apenas quando ela comprovar algo que as verificações automáticas não cobrem.

Escale para integração ou E2E apenas depois de as verificações focadas anteriores passarem e quando a natureza da mudança justificar. Integração é indicada para alterações em Supabase/PostgreSQL, RPC, Edge Functions, API, autenticação, permissões, persistência, sincronização ou contratos entre serviços. Playwright é a automação padrão de interface/E2E: use-o no ERP React/Web e no Expo Web quando suportado. Viewport mobile continua sendo navegador, não valida comportamento nativo completo.
Os testes E2E nativos do app Android usam **Maestro somente em celular físico conectado por Depuração sem fio (Wi‑Fi)**. Não iniciar nem usar Emulador/AVD, e não selecionar aparelho conectado por USB. Faça o pareamento/conexão sem fio do Android antes de executar; quando houver mais de um dispositivo, informe `ANDROID_SERIAL`. O executor deve recusar serial de emulador e serial sem formato de conexão Wi‑Fi. Para todos os testes de integração PostgreSQL/Supabase, use o projeto remoto configurado e siga a política canônica em `docs/testing/SUPABASE_REMOTE_TEST_POLICY.md`.

Para replicação/sincronização ERP ↔ App Mobile, rode o teste unitário focado da fila, transformação ou serviço alterado. Se o contrato ou a persistência entre os dois lados mudar, acrescente integração isolada que verifique idempotência, estados de sync e autoridade do backend, sem usar dados reais. E2E só é necessário quando a mudança alcançar um fluxo de usuário que unitário e integração não cubram.

Se uma camada falhar, interrompa a escalada, investigue e corrija antes de prosseguir. Não repita validações aprovadas sem mudança relevante; filtre logs extensos e reporte apenas o resultado útil. A suíte completa é prioritariamente responsabilidade do CI no push/PR. Rode-a localmente apenas para mudança transversal, risco concreto de regressão ampla ou pedido explícito do usuário. Não crie watchers ou retries em background como padrão.

## Prioridade de execução sobre auditoria

Em tarefas cujo objetivo explícito seja executar, testar, validar ou reproduzir um fluxo já compreendido, confirme apenas as pré-condições materiais de segurança (sessão/permissão, ambiente, dados de teste, isolamento de efeitos e caminho de execução). Se já houver runner/API, use essa automação como caminho principal; não navegue manualmente no ERP para procurar massa, consultar estado ou baixar evidências que o runner/API/banco possam verificar. Reserve a UI para testes de interação visual ou etapas sem cobertura automatizada. Assim que as pré-condições forem comprovadas, execute; investigue apenas erros concretos, corrija e repita o cenário antes da regressão necessária. Não adie a execução para ler mais arquivos ou buscar alternativas sem dúvida material de segurança ou validade. “Ainda estou auditando” não é bloqueio; bloqueios devem apontar dependência ou risco concreto. Priorize fixture criada, fluxo percorrido, resposta externa e persistência validadas.

---

## 1. Regra de Ouro da Blindagem de Dados

> [!CAUTION]
> **NÃO altere nem exclua dados comerciais, estoque ou financeiro de registros operacionais em testes.** A única exceção é vincular fatos fiscais persistentes de uma emissão HML explicitamente autorizada pelo usuário, nos limites abaixo.
> O Supabase remoto configurado é o ambiente padrão para testes controlados de banco com registros sintéticos identificados por `TEST_AUT_<uuid>`. Não altere registros operacionais em testes de banco, falha transacional, concorrência ou fluxo com efeitos em estoque/financeiro. **Exceção:** smoke test manual de emissão fiscal em Homologação pode usar pedido operacional existente quando o usuário autorizar explicitamente; não exige pedido sintético nem sessão de navegador isolada. A emissão deve ficar em `tpAmb=2`, sem alterar dados comerciais, estoque ou financeiro; confirme NCM compatível, ausência de tentativa/documento HML prévio ou incerto e preserve os fatos fiscais gerados. Detalhes e limites estão em `docs/testing/SUPABASE_REMOTE_TEST_POLICY.md`. Fixtures de outros fluxos podem gerar efeitos comerciais/financeiros próprios se todos os itens forem de teste, estiverem identificados pelo mesmo `testRunId` e houver exclusão verificável dos dashboards/indicadores. Valide filtros efetivos, não apenas nome/observação. Limpe pelo fluxo normal e reverta efeitos quando suportado, mantendo históricos confirmados e registros fiscais que devam permanecer rastreáveis. Um produto real pode ser referenciado quando autorizado, sem modificar cadastro, custo ou estoque.

1. **Geração de `testRunId`**: Cada cenário baseado em fixtures gera um identificador único no formato canônico `TEST_AUT_<uuid>`. Para identificar a suíte de origem (unitário, integração, E2E), use metadata adicional (campo, observação, tag), sem alterar o prefixo. O smoke test fiscal HML autorizado com pedido operacional não cria fixture nem exige `testRunId` para o pedido; registre a autorização e o identificador do pedido sem expor dados pessoais.
2. **Identificação inequívoca**: O identificador deve aparecer no nome, SKU, código ou observação do registro. Use também metadata de origem somente quando o campo já existir ou fizer sentido arquiteturalmente; não altere o schema apenas para testes.
3. **Registro de propriedade**: O harness deve guardar em memória os IDs criados pela execução e o tipo de cada registro. Todo helper de update/delete deve executar `assertOwnedByCurrentTest(record)` e falhar fechado se o ID não estiver registrado, se o `testRunId` não corresponder ou se houver qualquer dúvida.
4. **Arrange / Act / Assert / Cleanup**: Para fixtures, crie dependências com dados sintéticos, execute o fluxo real e valide UI/persistência/relações. No smoke test fiscal HML, use a exceção da política canônica. Remova apenas IDs temporários criados pela execução, após validar propriedade e se a regra de negócio permitir. Não apague snapshots, tentativas, protocolos ou outros fatos fiscais que devam permanecer rastreáveis; registre sua retenção e isolamento.
5. **Ordem de limpeza**: Exclua filhos e relacionamentos antes dos pais, respeitando as foreign keys. Nunca use `DELETE` amplo, `LIKE 'E2E%'`, `truncate`, cascade não confirmado, reset de tabela ou cleanup global.
6. **Ambiente de integração**: Testes de banco que escrevem no PostgreSQL, validam falhas transacionais, concorrência controlada ou rollback devem usar o Supabase remoto configurado com dados sintéticos próprios e escopo restrito, conforme a política remota canônica. O smoke test manual fiscal HML segue a exceção da política. Não use Docker/Supabase Local. Não execute falha induzida ou concorrência ampla sobre estado compartilhado/operacional; se um cenário não puder ser isolado com segurança no projeto remoto, relate a limitação específica e prossiga com as validações independentes.
7. **Relatório obrigatório**: Para cenários com fixtures, registre `testRunId`, registros sintéticos criados por tipo, IDs e quantidades removidos ou retidos e falhas de cleanup. Para emissão HML em pedido operacional, registre a autorização, o identificador do pedido sem dados pessoais, o ambiente e documento/protocolo gerados. Relate aprovados/reprovados e eventuais efeitos comerciais, de estoque ou financeiros.
8. **Isolamento entre testes paralelos**: Se testes E2E rodam em paralelo, cada teste deve derivar seu próprio identificador do `testRunId` da bateria (ex: `TEST_AUT_<uuid>_NomeDoTeste`) para evitar interferência entre testes que manipulam os mesmos tipos de registro.

---

## 2. Ambientes de Teste

Por decisão do usuário em 03/10/2026, testes de banco usam sempre o Supabase remoto configurado. Não solicitar abertura, instalação ou inicialização do Docker Desktop como gate.

Use esta ordem de decisão, sem depender de dia ou horário:

1. **Teste focado**: prefira Vitest/Jest com mocks, fixtures e estado em memória para lógica isolada.
2. **Integração PostgreSQL/Supabase**: use exclusivamente o projeto Supabase remoto configurado. Para migrations, RPCs, RLS, constraints, triggers, rollback e idempotência, confirme projeto/ref e escopo; crie fixtures sintéticas próprias e execute apenas operações controladas. O smoke test manual fiscal HML segue a exceção documentada na política canônica. Não usar, instalar ou iniciar Docker/Supabase Local.
3. **Isolamento no remoto**: para testes de banco, antes da primeira escrita, use `testRunId=TEST_AUT_<uuid>`, registre os IDs de propriedade e comprove que o fluxo só alcança essa massa. A emissão fiscal HML autorizada é a exceção: confira ambiente, tentativa/documento anterior e ausência de efeitos em estoque/financeiro. Verifique snapshots afetados e indicadores. Limpe fixtures pelo fluxo normal sem apagar históricos confirmados. Não use reset, DROP/TRUNCATE, fault injection não isolada ou carga ampla.
4. **Cenário remoto não isolável**: marque somente a evidência específica como não executada e explique o risco ou limitação concreta. Não classifique a ausência de Docker como bloqueio. Continue os testes remotos controlados e as validações independentes; não substitua evidência PostgreSQL por mocks nem declare rollback, atomicidade, RLS ou concorrência comprovados sem exercitá-los com dados sintéticos adequados.
5. **Fluxo de usuário ou validação visual necessária**: depois dos testes focados passarem, use Playwright ou o navegador local já aberto somente para o fluxo afetado. Para o preview mobile, use endereço `localhost` (nunca LAN); em autenticação local, use a porta 80 ou 81, não a 82.
6. **Navegador integrado**: o SQL Editor pode ser usado quando plugin/CLI falhar, conforme `AGENTS.md` e `database-supabase`; trocar de ferramenta não altera os limites de segurança acima.
7. **Escalonamento**: não rode Playwright, navegador ou integração por padrão. Faça isso somente se a mudança afetar comportamento, persistência, navegação ou apresentação que os testes focados não provem.

---
## 3. Matriz Completa de Tipos de Testes

A suíte do Morante Hub engloba **todos os tipos possíveis de teste** para assegurar tanto a lógica profunda de negócio quanto a integridade da interface:

| Tipo de Teste | Escopo | Ferramentas / Métodos |
|---|---|---|
| **Testes Unitários** | Funções puras, cálculos de CMPM, CMV, frete, descontos, transições de status, máscaras de moeda, formatação de endereço, slots de horário. | Vitest (`npm --prefix erp run test:unit`), Jest. Execução em memória sem dependências externas. |
| **Mutation testing** | Força condições, limites e transições em regras críticas para revelar testes que passam sem detectar regressões. | StrykerJS com o runner Vitest; começar por escopos explícitos de regras de negócio. Sobreviventes exigem revisão antes de virar teste; não estabelecer gate de score sem baseline. |
| **Análise estática centralizada** | Bugs, code smells e segurança básica em JS/TS/CSS; importa cobertura LCOV gerada pelo Vitest. | Serviço SonarQube já configurado no CI ou serviço gerenciado; não preparar instância local com Docker. Credenciais apenas por variável de ambiente. |
| **Testes de Componentes** | Componentes React e formulários. | Vitest + React Testing Library; cobrir estados e interações aplicáveis. Não substitui integração de banco. |
| **Testes de Integração** | Services, persistência, Supabase/PostgreSQL, RPCs, Edge Functions e contratos entre serviços. | Vitest contra o Supabase remoto configurado com fixtures sintéticas de propriedade comprovada quando o comportamento do banco for relevante; validar retorno e estado persistido. Mocks servem apenas para unidade/contrato isolado, nunca como prova de integração. |
| **E2E Web (ERP e Expo Web)** | Navegação, telas, responsividade, formulários e modais disponíveis no navegador. | Playwright; Chrome DevTools complementa diagnóstico. Viewport mobile continua sendo navegador. |
| **E2E Android Nativo (React Native)** | Telas reais, navegação, inputs, seletores, modais e fluxo no runtime Android. | **Maestro** (CLI / Flows YAML) somente em celular físico por Depuração sem fio (Wi‑Fi). Emulador/AVD e alvo USB são recusados; ADB fica limitado ao pareamento/conexão e operações necessárias ao Maestro. |
| **Testes de Tipagem & Contratos** | Conformidade TypeScript, integridade de propriedades herdadas, schemas tributários, eventos mobile. | `node mobile/node_modules/typescript/bin/tsc --noEmit`, `npm --prefix erp run typecheck`. |
| **Lógica Offline-First Mobile** | Transformações, idempotência, ciclo de eventos e regras de sincronização independentes do runtime nativo. | Vitest com fixtures/mocks para lógica isolada; não usar isso como evidência de que AsyncStorage, NetInfo, câmera, permissões ou SQLite nativo funcionam. A validação nativa é manual do usuário no APK. |
| **Persistência Local (ERP Web)** | IndexedDB para cache, rascunhos ou dados offline no navegador. Aplica-se somente a módulos que usam armazenamento local; não confundir com SQLite (mobile) nem MySQL. | Vitest com `fake-indexeddb` para lógica de persistência; Playwright `evaluate` para verificação de estado real no navegador. Se o módulo não usa armazenamento local, esta linha não se aplica. |

Nos E2E Playwright com backend real, siga a regra de propriedade da seção 1: criar somente dados próprios e identificáveis, guardar IDs exatos, editar/excluir apenas esses IDs e limpar de forma restrita. Não use limpeza por prefixo/`LIKE` nem selecione registros operacionais existentes como massa mutável.

### 3.2 Mutation testing e análise SonarQube

- ERP usa `npm --prefix erp run test:mutation:critical` para a fatia inicial de regras críticas e `npm --prefix erp run test:coverage:critical` para gerar LCOV focado. O relatório HTML/JSON do Stryker fica em `erp/reports/mutation/` e a cobertura em `erp/coverage/`; são artefatos locais ignorados pelo Git.
- A configuração Stryker deve nomear os arquivos mutados, usar Vitest `perTest`, concurrency conservadora e TypeScript checker quando aplicável. Não mutar testes, mocks, fixtures, arquivos gerados ou configuração. Classificar `Killed`, `Survived`, `No coverage`, `Timeout` e `CompileError` conforme o relatório. Investigar sobreviventes relevantes; não declarar falha automática por score arbitrário. Registrar score e limitações como baseline.
- SonarQube: executar somente pelo serviço já configurado no CI ou serviço gerenciado; não configurar ambiente local com Docker. Não gravar token no repositório, linha de comando versionada ou arquivo de configuração.
- `sonar-project.properties` deve excluir dependências, builds, relatórios, código gerado e testes da análise de produção; importar `erp/coverage/lcov.info` quando gerado. Cobertura ausente ou parcial deve ser declarada como tal, não inferida.

### 3.1 Estados Obrigatórios de UI

Testes de componentes e telas (integração e E2E) devem verificar, no mínimo:
- **Carregando**: skeleton/spinner visível durante fetch.
- **Vazio**: mensagem adequada quando não há dados.
- **Sucesso**: dados renderizados corretamente.
- **Erro**: feedback ao usuário quando API/rede falha.
- **Desabilitado / Sem permissão / Offline**: quando aplicável ao fluxo.

### 3.2 Checklist Transversal de Casos Negativos

Para cada módulo, além do happy path:
- [ ] Entrada inválida / campos obrigatórios vazios.
- [ ] Valores limites (0, mínimo, máximo, negativo).
- [ ] Operação duplicada / duplo clique / reenvio (idempotência).
- [ ] Cancelamento e reversão, quando o fluxo suportar.
- [ ] Permissão insuficiente / RLS / role ausente.
- [ ] Sessão expirada durante operação.
- [ ] Falha de rede / API indisponível / timeout.
- [ ] Concorrência (dois operadores no mesmo registro).

### 3.3 Cobertura como Indicador

> [!NOTE]
> Percentual de cobertura de linhas é **indicador de amplitude**, não prova de qualidade. Um módulo com 100% de cobertura pode ter zero casos negativos. Priorize cenários de negócio relevantes sobre metas numéricas.

---



### 3.4 Responsabilidades das Ferramentas e Fluxo Proporcional ao Risco
- **Vitest**: Funções puras, cálculos e lógicas isoladas (Fluxo cotidiano).
- **RTL (React Testing Library)**: Interações de interface e componentes isolados (Fluxo cotidiano).
- **Playwright**: E2E em navegador, fluxos completos de UI integrados.
- **pgTAP e Atomicidade**: validações PostgreSQL no Supabase remoto usando fixtures sintéticas e operações controladas; não executar fault injection ampla nem cenários que alcancem registros compartilhados.
- **Ferramentas Pesadas (Nuance de Roteamento)**:
  - **k6**: Executar *exclusivamente* quando houver um objetivo explícito de carga ou performance.
  - **OWASP ZAP**: Executar *exclusivamente* para auditoria de segurança ou em fluxo explicitamente definido. Não usar na rotina diária.
  - **Trivy / Gitleaks**: Têm primariamente papel de CI/CD ou auditoria focada. Gitleaks pode fazer sentido localmente antes de commits específicos, mas não force execução automática a cada alteração de código.
- **Fluxo Proporcional ao Risco**:
  - *Baixo*: Unitários (Vitest).
  - *Médio*: Componentes e fluxos isolados (RTL).
  - *Alto*: Integração pontual, Playwright E2E.
  - *Crítico*: testes PostgreSQL/Supabase no projeto remoto configurado, com massa sintética isolada e efeitos limitados; concorrência/carga ampla não é permitida no projeto compartilhado.

## 4. Ordem Oficial dos Módulos Vitais e Críticos

Os testes devem seguir rigorosamente a **ordem de criticidade do negócio**:

```
[MÓDULO 1] Vendas & Pedidos de Venda (SalesOrder)
    ↓
[MÓDULO 2] Estoque, Movimentações, CMPM e CMV
    ↓
[MÓDULO 3] Logística, Entregas e Montagens (ERP & Mobile)
    ↓
[MÓDULO 4] Fiscal (NF-e / NFC-e SEFAZ-PR Direto)
    ↓
[MÓDULO 5] Financeiro, Recebimentos e Contas a Receber
    ↓
[MÓDULO 6] Produtos, Variações & Catálogo Digital
    ↓
[MÓDULO 7] Pessoas, Clientes, Fornecedores & Geocodificação
    ↓
[MÓDULO 8] Catálogo Digital & Integração Meta
    ↓
[MÓDULO 9] Relatórios Gerenciais, DRE & Métricas Comerciais
    ↓
[RECOMEÇO DO CICLO] → Retorna ao [MÓDULO 1] (Ciclo N+1)
```

---

## 5. Roteiro Cíclico Contínuo e Continuação por Goals

> [!IMPORTANT]
> **Roteiro Cíclico Infinito**: O teste nunca termina em um ponto morto. Quando o **Módulo 9** é concluído com sucesso, o roteiro **recomeça no Módulo 1** em uma nova rodada de checagem (Ciclo 1 → Ciclo 2 → Ciclo 3...).
> **Continuação Exata de Onde Parou**: Sempre que o usuário solicitar *"continue os testes"*, *"prossiga com o roteiro"* ou acionar a execução, o agente deve obrigatoriamente ler o arquivo de tracking `docs/ROTEIRO_TESTES_CICLICOS.md`, identificar o último goal/módulo concluído e retomar a partir da etapa seguinte.

### Protocolo de Execução do Roteiro Cíclico:

1. **Leitura do Checkpoint**:
   Abra e leia `docs/ROTEIRO_TESTES_CICLICOS.md`. Identifique:
   - `Ciclo Atual` (ex: Ciclo 1)
   - `Módulo Atual` (ex: Módulo 3 - Logística)
   - `Próxima Etapa / Goal` (ex: Etapa 3.2 - Teste da Tela de Etapas da Entrega)
2. **Seleção de Ambiente**:
   Prefira testes focados com mocks/fixtures em memória para lógica isolada. Use o Supabase remoto configurado para integração de banco com fixtures sintéticas e escopo controlado conforme a seção 2. O smoke test fiscal HML autorizado segue a exceção canônica e pode usar o navegador Dev autenticado já aberto, sem exigir uma sessão isolada. Não use Docker/Supabase Local; se algum cenário não puder ser isolado com segurança no remoto, registre a limitação específica sem marcar ausência de Docker como bloqueio.
3. **Execução da Etapa Atual**:
   - Execute os testes correspondentes (unitários, integração, tipo ou interface).
   - Se envolver persistência em teste de banco, gere `testRunId`, crie uma árvore exclusiva com dados sintéticos, registre cada ID e valide propriedade antes de alterar/excluir. Para smoke test fiscal HML autorizado, aplique a exceção da política canônica; preserve e registre fatos fiscais que precisem permanecer rastreáveis.
4. **Registro de Resultados**:
   - Atualize `docs/ROTEIRO_TESTES_CICLICOS.md` com:
     - Status: `PASSOU`, `FALHOU` ou `AVISO`.
     - Evidência técnica (log, saída do comando, screenshot se visual).
     - Registro de qualquer bug detectado para correção imediata.
5. **Avanço do Cursor de Goals**:
   - Avance o cursor para a próxima etapa.
   - Se completou o Módulo 9, atualize `Ciclo Atual = Ciclo + 1` e aponte para `Módulo 1 - Etapa 1.1`.
6. **Reporte ao Usuário**:
   Apresente um resumo claro do que foi testado, qual foi o resultado, e qual é o próximo goal pronto para execução.

---

## 6. Detalhamento dos Módulos no Roteiro

### [MÓDULO 1] Vendas & Pedidos de Venda (`SalesOrder`)
- **1.1 Código Sequencial Único (`orderIndex`)**: Validação de formato `#00XXXX`, não-nulo, unicidade estrita, bloqueio sem código, blindagem em updates parciais.
- **1.2 Ciclo de Vida e Status**: Transição `draft` → `scheduled` (para entregas com agendamento) ou `fulfilled` (para retiradas imediatas).
- **1.3 Ações Pós-Venda (`PostOrderActionsModal`)**: Garantia de que ações de impressão/WhatsApp nunca revertem status para rascunho nem perdem `orderIndex`.
- **1.4 Itens e Manuseio de Montagem**: Preservação estrita do manuseio selecionado; selos amarelo (`Montagem Depósito`) e vermelho (`Montagem Fora`) com ícone `Drill` preenchido.
- **1.5 Cálculos Financeiros do Pedido**: Subtotal, descontos (R$ e %), frete manual vs automático, acréscimos, valor total líquido, troco.
- **1.6 Interface Full Screen**: Modal de pedido em tela cheia (`z-[999999]`) sobrepondo o header, bloqueio de scroll do body e ausência de barra vertical nos inputs numéricos (`CurrencyInput`).

### [MÓDULO 2] Estoque, Movimentações, CMPM e CMV
- **2.1 Entradas de Estoque**: Criação de movimentos de entrada (`inventory_moves`), cálculo correto do Custo Médio Ponderado Móvel (CMPM).
- **2.2 Saídas por Venda**: Saída única e irreversível vinculada ao pedido atendido; CMV materializado com base no CMPM da data da venda.
- **2.3 Idempotência**: Validação contra duplicação de saídas ou entradas ao recarregar a tela ou reenviar requisições.
- **2.4 Cancelamentos & Estornos**: Cancelamento de pedido estorna as saídas de estoque recompondo o saldo físico sem duplicar registros de auditoria.
- **2.5 Devoluções de Venda**: Entrada única para itens devolvidos recuperando o CMV original histórico da venda, sem usar o custo atual.

### [MÓDULO 3] Logística, Entregas e Montagens (ERP & App Mobile)
- **3.1 Sem Ordem Compulsória**: Agendamentos por período (`13:00–18:00`) exibem pin normal sem cadeado e sem `#1, #2, #3`; horários fixos (`15:00`) exibem cadeado `🔒`.
- **3.2 Hub de Entregas Mobile (Hoje, Cronograma, Mapa)**: Estado sem seleção compacto ("X entregas pendentes hoje"), clique no marcador destaca pin e substitui card, botão `X` limpa seleção.
- **3.3 Depósito Móveis Morante**: Pin diferenciado (`🏬`), sem opções de entrega.
- **3.4 Fluxo de Início de Entrega**: Clique em `[ INICIAR ENTREGA ]` direciona para a tela de etapas existente; primeira etapa oferece `[ ABRIR ROTA NO GOOGLE MAPS ]` via navegação externa no Android.
- **3.5 Mobile Offline-First**: Eventos operacionais locais com UUID idempotente, ciclo de 4 estados (`PENDING` → `SYNCING` → `CONFIRMED` / `REJECTED`).

### [MÓDULO 4] Fiscal (NF-e / NFC-e SEFAZ-PR Direto)
- **4.1 Modal de Emissão Fiscal**: Lista de itens da venda sem numeração estática `#1, #2...`. Destaque para itens temporários (`!productId`).
- **4.2 Campos Tributários Obrigatórios**: NCM pesquisável com `NcmSelect`, CFOP, CSOSN/CST, Origem e CEST selecionáveis via `<select>`.
- **4.3 Validação de XML & Schemas**: Validação dos nós XML contra schemas oficiais do SEFAZ-PR antes da transmissão.
- **4.4 DANFE & Contingência**: Geração de espelho DANFE e tratamento de contingência sem perda de dados fiscais.

### [MÓDULO 5] Financeiro, Recebimentos e Contas a Receber
- **5.1 Geração de Contas a Receber**: Parcelamento, vencimentos e valores gerados automaticamente na conclusão do pedido.
- **5.2 Baixas e Formas de Pagamento**: Baixas parciais e totais (Dinheiro, PIX, Cartão, Boleto, Promissória).
- **5.3 Conciliação de Caixa**: Fechamento de caixa diário e conferência de recebimentos por operador.

### [MÓDULO 6] Produtos, Variações & Catálogo Digital
- **6.1 Ativo / Desativado vs Publicado / Oculto**: Independência total entre ativação no ERP (`active: true/false`) e publicação no Catálogo Digital (`published/hidden`).
- **6.2 Rascunhos**: Exibição na listagem principal com badge âmbar, bloqueio de ativação/publicação até conclusão e botão "Descartar Rascunho" nos 3 pontinhos.
- **6.3 Variações Filhas**: Herança padrão de informações do produto pai (`syncDescription`, dimensões, peso); cards brancos individuais e fundo cinza para o pai.
- **6.4 Fotos 1:1 (`SquareImageCropper`)**: Proporção quadrada sem borda interna, cantos retos e canvas livre de erro CORS tainted.
- **6.5 Responsividade**: Cards em resoluções `< 1280px` e Tabela em `>= 1280px`.

### [MÓDULO 7] Pessoas, Clientes, Fornecedores & Geocodificação
- **7.1 Validações Cadastrais**: CPF/CNPJ, máscaras, estado padrão Paraná (`PR`).
- **7.2 Autocomplete de Endereços**: Google Places restrito a logradouros/ruas (sem estabelecimentos comerciais).
- **7.3 Geocodificação Resiliente**: Fallback de coordenadas (número → rua → bairro/cidade) com proteção de cota Google Cloud (margem 70%).

### [MÓDULO 8] Catálogo Digital & Integração Meta
- **8.1 Visualização Digital**: Renderização correta de produtos publicados, fotos e preços.
- **8.2 Geração de Feed Meta**: Formato XML/CSV padronizado para sincronização de catálogo no Facebook/Instagram.

### [MÓDULO 9] Relatórios Gerenciais, DRE & Métricas Comerciais
- **9.1 Faturamento Líquido vs Bruto**: Dedução de devoluções e desconsideração de pedidos cancelados.
- **9.2 Apuração de Margem e Lucro**: Confronto de faturamento com o CMV real do estoque.
- **9.3 Comissões**: Cálculo correto por vendedor e montador de acordo com regras operacionais.

---

## 7. Estratégia Canônica para Persistência e Operações Críticas

Esta seção é a fonte canônica para testes de banco. Operação crítica inclui qualquer fluxo que altere múltiplos registros ou afete estoque, pedidos, recebimentos, financeiro, fiscal, permissões, histórico ou sincronização. Aplique os casos relevantes; registre justificativa para itens não aplicáveis, sem inventar riscos inexistentes.

### 7.1 Níveis e limites de evidência

- **Unitário**: Vitest para funções, cálculos, validações, regras, transformações e estados isolados. Mocks são adequados neste nível.
- **Componente**: Vitest + React Testing Library para loading, vazio, sucesso, erro, validação, campos desabilitados, permissões, offline, interações e submissão, conforme aplicável.
- **Integração**: quando houver comportamento relevante de Supabase/PostgreSQL, testar contra o Supabase remoto configurado, com fixtures sintéticas e escopo isolado por IDs. Verificar estado final diretamente nas tabelas e relações, não só o retorno do service/RPC.
- **RPC/Edge Function**: executar pela interface real (RPC/HTTP) e validar resposta, permissões e efeitos persistidos. Mock do Supabase, teste frontend ou inspeção de código não substituem esse nível.
- **E2E**: Playwright cobre o fluxo integrado pela perspectiva do usuário. Não substitui integração de banco, RPC, atomicidade, rollback ou concorrência.

### 7.2 Matriz mínima por operação crítica

Antes de validar, registre as invariantes da operação (por exemplo, saldo não negativo, vínculos consistentes, devolução aplicada uma vez, estorno sem efeito residual) e avalie:

| Caso | Evidência esperada |
|---|---|
| Sucesso | Retorno e estado final persistido, incluindo relações, quantidades e metadados relevantes. |
| Entrada inválida / registro inexistente | Erro explícito e nenhum efeito parcial; cobrir UUID/formato, quantidade zero/negativa, saldo insuficiente e relação inválida quando aplicável. |
| Constraints | Tentar violar diretamente no banco NOT NULL, UNIQUE, CHECK, FK, índices únicos compostos ou regras equivalentes relevantes; comprovar rejeição no PostgreSQL. |
| Permissão / RLS | Usuários/roles distintos; conferir leitura/escrita permitida e negada e autorização de RPC. Frontend nunca é barreira de segurança. |
| Atomicidade / rollback | Para uma ação lógica com múltiplas gravações, use um cenário transacional com registros sintéticos próprios; verifique que entradas inválidas ou rejeitadas não deixam efeitos parciais e consulte todas as tabelas relacionadas. Não injete falhas em registros ou infraestrutura compartilhados. `BEGIN/COMMIT`, retorno de erro, mocks ou inspeção de código não provam atomicidade. |
| Concorrência | Quando houver disputa por saldo, status, sequência, reserva ou registro compartilhado, executar duas requisições simultâneas somente quando ambas atuarem em registros sintéticos próprios e o teste tiver escopo baixo; provar as invariantes sem disputa por dados operacionais. |
| Idempotência | Quando houver retry, duplo clique, timeout, webhook ou sync repetível, repetir com a mesma chave de evento/idempotência e provar ausência de efeitos duplicados. |
| Integração / E2E | Verificar service/frontend e fluxo E2E principal quando aplicáveis e não cobertos pelos níveis anteriores. |

Operação com múltiplas gravações que precisa ser uma ação lógica deve usar fronteira transacional no backend (função/RPC PostgreSQL quando apropriado). Comprove rollback por cenários transacionais controlados sobre fixtures próprias. Não execute fault injection ou rollback destrutivo no estado operacional compartilhado; se não houver forma segura de provar um cenário, relate a evidência pendente específica.

### 7.3 RPCs e Edge Functions

- Toda RPC crítica tem testes próprios de sucesso, parâmetros inválidos, registro inexistente, permissões e constraints aplicáveis.
- Validar retorno **e** estado final das tabelas afetadas. Em operações compostas, conferir quantidades, vínculos, movimentos, saldos e metadados que definem as invariantes.
- Edge Functions são chamadas pelo endpoint de teste; validar status/body e efeitos persistidos.
- Atomicidade, concorrência controlada e idempotência devem ser exercitadas no PostgreSQL remoto sobre fixtures sintéticas, não somente pela camada HTTP.

### 7.4 Migrações, offline e sincronização

- Migrações de regras críticas: revisar integralmente a migration versionada, confirmar project ref, executar `npm run advisors` e aplicar ao Supabase remoto configurado somente após validação de escopo e compatibilidade. Validar a migration aplicada com fixtures sintéticas e operações normais no remoto; não experimentar DDL, reset, DROP/TRUNCATE ou fault injection. Este fluxo não comprova instalação em banco vazio/clonado, que deve ser relatada como limitação da política remota.
- Offline/sync: separar evidência de persistência local (SQLite/IndexedDB), fila/transição de estados, transporte/retry/conflito e processamento PostgreSQL. Validar duplicidade, sync parcial e autoridade do backend. Teste local não comprova servidor; teste do servidor não comprova SQLite/IndexedDB.
- Após a operação, reconsultar estado persistido e validar invariantes. Relatar limitações de ambiente; não declarar integração, atomicidade ou rollback como aprovados sem exercitá-los.
- Em toda auditoria de módulo crítico, o relatório final deve listar explicitamente os testes executados (comando/escopo e resultado) e os testes não executados, cada um com seu motivo e a evidência pendente. Não resumir Vitest com mocks como “testado” sem qualificar que integração/PostgreSQL real, atomicidade, concorrência ou RLS não foram cobertos.
- Todo relatório de auditoria/testes deve separar testes executados, não executados, motivo, evidência obtida e evidência pendente. Para cada teste, preencher a matriz: `Teste | Executado | Projeto/ref (sem credenciais) | Massa sintética/testRunId | Resultado | Limitação/evidência pendente`. Identifique a camada validada; não resuma mocks como prova de integração real. Se um cenário não for seguro de executar no projeto remoto compartilhado, nomeie o risco concreto e a evidência faltante.

---

## 8. Proibição Absoluta de Mascarar Problemas & Diagnóstico de Causa Raiz

### Regra de Ouro dos Testes:
> [!CAUTION]
> **É EXPRESSAMENTE PROIBIDO MASCARAR PROBLEMAS PARA FAZER TESTE PASSAR.**
> Nunca tente fazer uma suíte passar por meio de:
> - Remoção ou enfraquecimento de `expect` / assertions;
> - Aumento arbitrário de timeouts sem prova cabal de lentidão ambiental;
> - Inserção de `sleep`, `setTimeout` ou atrasos artificiais;
> - Ignorar exceções com blocos vazios (`try { ... } catch {}`);
> - Desabilitar ou comentar testes (`.skip`, `xit`);
> - Alterar a expectativa do teste para aceitar um bug ou comportamento incorreto;
> - Inserir valores fixos (hardcodes) específicos apenas para agradar o teste.

### Investigação da Causa Raiz:
Ao encontrar um teste quebrado ou bug em tempo de execução, o agente DEVE seguir obrigatoriamente a cadeia de diagnóstico:
```text
SINTOMA (onde o erro se manifestou)
   ↓
CAUSA IMEDIATA (qual variável, retorno ou chamada quebrou a asserção)
   ↓
CAUSA RAIZ (qual regra, contrato, fluxo ou fonte da verdade originou a inconsistência)
```
- **Correção no Nível Correto**: Se o defeito pertence a uma regra compartilhada ou entidade central, é proibido aplicar patches locais na tela ou no teste. A correção deve ser efetuada na fonte da verdade (service/entidade/validador).
- **Testes de Regressão Obrigatórios**: Toda correção de bug deve ser acompanhada do teste automatizado específico que reproduza o cenário problemático antes da correção e comprove a estabilidade contínua após a correção.

### Anti-padrões de Seletores (Playwright e Componentes)
- Preferir `getByRole`, `getByLabel`, `getByText` e `data-testid` nomeados sobre seletores CSS internos ou posição ordinal.
- Proibido depender de classes CSS geradas automaticamente (`.css-xxx`, `.sc-xxx`).
- Evitar seletores por texto exato quando o texto pode mudar — preferir `data-testid` ou role com name.
- Proibido `page.waitForTimeout(ms)` como substituto de `page.waitForSelector` / `expect(...).toBeVisible()`.

### Critério de Encerramento e Status INCONCLUSIVO
Além de APROVADO e REPROVADO, existe oficialmente o status **INCONCLUSIVO**.
O agente **deve** usar o status INCONCLUSIVO e interromper processos que:
- Ficam travados (hanging) no terminal;
- Consomem CPU indefinidamente sem produzir resultado (comum em compilações, `tsc`, scripts `npm`, Playwright);
- Dependem de um ambiente indisponível.

Um processo travado nunca deve ser interpretado como "sucesso", nem reprovado como se fosse falha de lógica que precise de alteração no código. Classifique como INCONCLUSIVO, interrompa-o e reduza o escopo ou utilize outra abordagem.

O agente só deve declarar "testado" (APROVADO) quando:
1. O resultado esperado foi verificado na interface (texto, estado visual, feedback).
2. Os efeitos colaterais foram conferidos (banco, local storage, estoque, financeiro).
3. Os estados relevantes foram cobertos (sucesso, erro, vazio, loading — conforme 3.1).
4. Casos negativos aplicáveis ao fluxo foram incluídos (conforme 3.2).

### Cancelamento comercial/fiscal de vendas
- Cobrir NF-e 55 antes de 168h, no instante-limite e depois; cobrir NFC-e 65 antes de 30 min, no limite e depois. A data usada é a autorização fiscal em UTC/offset, nunca horário local presumido.
- Cobrir pedido agendado e retirada pendente sem circulação; `fulfilled` em entrega e retirada, além de trânsito, bloqueiam cancelamento/estorno por operação não realizada.
- Cobrir documento ausente/rejeitado, autorizado, já cancelado, tentativa repetida e timeout incerto. Repetição não duplica reversão de estoque, evento, rascunho de estorno ou devolução.
- Provar no mesmo banco/fluxo que estoque e status comercial confirmam ou revertem atomicamente. SEFAZ é efeito externo após commit: persistir tentativa e demonstrar reconciliação sem repetir evento quando o primeiro resultado é incerto.
- Estorno exige conferência dos dados fiscais e do art. 298, §2º do RICMS/PR quando a apuração for posterior.
- Cobrir retorno por coleta pendente sem estoque, confirmação como “Coletada” com uma entrada idempotente e retorno entregue pelo cliente na loja como “Recebida” com entrada na criação transacional. Confirmar que criação agendada não libera NF-e de devolução; fluxo fiscal só fica disponível após retorno físico.

---

## Referências e Fonte Canônica de Documentação

- [Política de Testes Supabase Remoto](../../../docs/testing/SUPABASE_REMOTE_TEST_POLICY.md) — padrão canônico para integração PostgreSQL/Supabase, fixtures e migrations revisadas.
- [Playwright — projetos e emulação de dispositivos](https://playwright.dev/docs/emulation)
