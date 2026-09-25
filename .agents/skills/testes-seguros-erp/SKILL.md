---
name: testes-seguros-erp
description: Planeje e execute testes seguros do ERP e App Mobile em alterações de regras de negócio, banco, estoque, vendas, recebimentos, devoluções, custos, relatórios ou integrações, permitindo Supabase real somente com dados E2E próprios, rastreáveis e removidos por ID, com suporte a roadmap cíclico contínuo e ambientes sem Docker.
---

# Testes Seguros do ERP & App Mobile

Use esta skill sempre que a mudança puder alterar regras de negócio, persistência, interface ou efeitos entre módulos. Também utilize-a como guia mestre para executar e continuar o **Roadmap Cíclico de Testes Contínuos** do Morante Hub.

## Quando aplicar esta Skill

- Ao implementar, classificar, executar ou migrar testes unitários, de integração ou E2E do ERP/App Mobile.
- Quando testes puderem acessar Supabase, autenticação, pedidos, produtos, variações, composição, estoque ou inventário.

## Quando NÃO aplicar

- Para alterações de interface ou lógica sem impacto de teste, dados, persistência ou fluxo entre módulos.
- Para automação de interface nativa por Maestro, ADB, Expo MCP, emulador/AVD ou aparelho físico: essa validação cabe ao usuário no APK.

## Política incremental de validação

Ao alterar código, a própria alteração autoriza a validação mínima necessária antes do commit. Use `git diff` para delimitar arquivos e módulos e rode primeiro somente o teste focado do módulo alterado. Se ele passar, execute TypeScript/compilação e lint apenas no escopo aplicável. Não rode baterias amplas por padrão.

Para mudança apenas de texto ou CSS, faça somente as verificações mínimas aplicáveis; use validação visual apenas quando ela comprovar algo que as verificações automáticas não cobrem.

Escale para integração ou E2E apenas depois de as verificações focadas anteriores passarem e quando a natureza da mudança justificar. Integração é indicada para alterações em Supabase/PostgreSQL, RPC, Edge Functions, API, autenticação, permissões, persistência, sincronização ou contratos entre serviços. Playwright é a única automação de interface/E2E: use-o no ERP React/Web e no Expo Web quando suportado. Viewport mobile continua sendo navegador, não valida comportamento nativo. Não executar Maestro, ADB, Expo MCP, emulador/AVD nem automação em aparelho físico. Para APIs ou fluxos exclusivos do React Native, faça apenas validações focadas que não dependam do runtime nativo; a validação nativa fica com o usuário no APK. Quando necessária, prepare e entregue o APK sem instalá-lo ou executá-lo.

Para replicação/sincronização ERP ↔ App Mobile, rode o teste unitário focado da fila, transformação ou serviço alterado. Se o contrato ou a persistência entre os dois lados mudar, acrescente integração isolada que verifique idempotência, estados de sync e autoridade do backend, sem usar dados reais. E2E só é necessário quando a mudança alcançar um fluxo de usuário que unitário e integração não cubram.

Se uma camada falhar, interrompa a escalada, investigue e corrija antes de prosseguir. Não repita validações aprovadas sem mudança relevante; filtre logs extensos e reporte apenas o resultado útil. A suíte completa é prioritariamente responsabilidade do CI no push/PR. Rode-a localmente apenas para mudança transversal, risco concreto de regressão ampla ou pedido explícito do usuário. Não crie watchers ou retries em background como padrão.

---

## 1. Regra de Ouro da Blindagem de Dados

> [!CAUTION]
> **NUNCA ALTERAR OU EXCLUIR REGISTROS OPERACIONAIS EXISTENTES.**
> Playwright pode usar o Supabase atualmente utilizado pelo sistema, inclusive o banco real, desde que crie, edite, valide e remova exclusivamente registros criados pela própria execução. Dados reais existentes nunca podem ser reutilizados como massa de teste.

1. **Geração de `testRunId`**: Cada bateria gera um identificador único, preferencialmente `E2E_<timestamp>_<uuid>`.
2. **Identificação inequívoca**: O identificador deve aparecer no nome, SKU, código ou observação do registro. Use também metadata de origem somente quando o campo já existir ou fizer sentido arquiteturalmente; não altere o schema apenas para testes.
3. **Registro de propriedade**: O harness deve guardar em memória os IDs criados pela execução e o tipo de cada registro. Todo helper de update/delete deve executar `assertOwnedByCurrentTest(record)` e falhar fechado se o ID não estiver registrado, se o `testRunId` não corresponder ou se houver qualquer dúvida.
4. **Arrange / Act / Assert / Cleanup**: Crie todas as dependências da árvore do teste, execute o fluxo real, valide UI/persistência/relações após recarregar e remova apenas os IDs criados pela execução em `try/finally`, `afterEach` ou `afterAll`.
5. **Ordem de limpeza**: Exclua filhos e relacionamentos antes dos pais, respeitando as foreign keys. Nunca use `DELETE` amplo, `LIKE 'E2E%'`, `truncate`, cascade não confirmado, reset de tabela ou cleanup global.
6. **Supabase real**: A ausência de banco separado não bloqueia automaticamente Playwright. O banco atualmente usado pode ser alvo quando a execução puder provar propriedade, usar identificadores únicos e garantir teardown. Sem essa prova, não faça escrita.
7. **Relatório obrigatório**: Registre `testRunId`, registros criados por tipo, quantidade removida, resíduos por falha de cleanup com IDs, aprovados, reprovados e a confirmação de que nenhum registro operacional real foi alterado.

---

## 2. Ambientes de Teste sem Docker

Docker não faz parte do fluxo de desenvolvimento ou validação deste projeto. Escolha a opção mais simples e segura para o escopo:

1. **Teste focado**: prefira Vitest/Jest com mocks, fixtures e estado em memória para validar a unidade alterada.
2. **Integração necessária**: use serviços locais já disponíveis sem Docker ou o Supabase atualmente utilizado, desde que a suíte crie dados próprios com `testRunId`, registre seus IDs, valide propriedade e faça limpeza garantida. O uso de banco real não autoriza tocar registros existentes.
3. **Sem isolamento comprovável**: não faça escritas; cubra o contrato com mocks/testes focados e registre a limitação. “Banco real” sozinho não é motivo para bloquear, mas também não substitui a prova de propriedade.
4. **Fluxo de usuário ou validação visual necessária**: depois dos testes focados passarem, use Playwright ou o navegador local já aberto somente para o fluxo afetado. Para o preview mobile, use endereço `localhost` (nunca LAN); em autenticação local, use a porta 80 ou 81, não a 82.
5. **Escalonamento**: não rode Playwright, navegador ou integração por padrão. Faça isso somente se a mudança afetar comportamento, persistência, navegação ou apresentação que os testes focados não provem.

---

## 3. Matriz Completa de Tipos de Testes

A suíte do Morante Hub engloba **todos os tipos possíveis de teste** para assegurar tanto a lógica profunda de negócio quanto a integridade da interface:

| Tipo de Teste | Escopo | Ferramentas / Métodos |
|---|---|---|
| **Testes Unitários** | Funções puras, cálculos de CMPM, CMV, frete, descontos, transições de status, máscaras de moeda, formatação de endereço, slots de horário. | Vitest (`npm --prefix erp run test:unit`), Jest. Execução em memória sem dependências externas. |
| **Testes de Integração** | Serviços de Venda, Estoque, Movimentações, Conciliação Financeira, APIs externas (Google Maps, SEFAZ schemas). | Vitest com serviços locais sem Docker ou staging isolado com `testRunId`; mocks quando não houver ambiente seguro. |
| **E2E Web (ERP e Expo Web)** | Navegação, telas, responsividade, formulários e modais disponíveis no navegador. | Playwright; Chrome DevTools complementa diagnóstico. Viewport mobile continua sendo navegador. |
| **Comportamento exclusivo do React Native** | Câmera, permissões, lifecycle, SQLite e APIs nativas não disponíveis no browser. | Não automatizar em dispositivo/emulador. Fazer validações estáticas/focadas quando úteis e entregar APK para validação manual do usuário quando necessário. |
| **Testes de Tipagem & Contratos** | Conformidade TypeScript, integridade de propriedades herdadas, schemas tributários, eventos mobile. | `node mobile/node_modules/typescript/bin/tsc --noEmit`, `npm --prefix erp run typecheck`. |
| **Lógica Offline-First Mobile** | Transformações, idempotência, ciclo de eventos e regras de sincronização independentes do runtime nativo. | Vitest com fixtures/mocks para lógica isolada; não usar isso como evidência de que AsyncStorage, NetInfo, câmera, permissões ou SQLite nativo funcionam. A validação nativa é manual do usuário no APK. |

Nos E2E Playwright com backend real, siga a regra de propriedade da seção 1: criar somente dados próprios e identificáveis, guardar IDs exatos, editar/excluir apenas esses IDs e limpar de forma restrita. Não use limpeza por prefixo/`LIKE` nem selecione registros operacionais existentes como massa mutável.

---

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
2. **Seleção de Ambiente sem Docker**:
   Prefira testes focados com mocks/fixtures em memória. Para integração indispensável, use serviço local já disponível ou staging isolado com `testRunId`; sem isolamento comprovável, não faça escritas e registre a limitação.
3. **Execução da Etapa Atual**:
   - Execute os testes correspondentes (unitários, integração, tipo ou interface).
   - Se envolver persistência, gere `testRunId`, crie uma árvore exclusiva de dados, registre cada ID criado, valide a propriedade antes de qualquer update/delete e faça teardown completo em `finally`.
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


## Referências e Fonte Canônica de Documentação

- [Playwright — projetos e emulação de dispositivos](https://playwright.dev/docs/emulation)
