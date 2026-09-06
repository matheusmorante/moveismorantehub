---
name: auditoria-e2e-assistente-financeiro
description: Bateria de auditoria E2E e testes de estresse para o Assistente Financeiro IA do Morante Hub via navegador, cobrindo 134 casos roteirizados e 30 testes exploratórios obrigatórios sem aplicar correções na primeira rodada.
---

# Auditoria E2E & Testes de Estresse do Assistente Financeiro IA

## Objetivo
Testar de ponta a ponta, pelo navegador, o Assistente Financeiro do ERP em muitos cenários reais de linguagem natural, cobrindo criação, consulta, edição, complementação, correção contextual, parcelamento, datas, ambiguidades, erros, estados de "não lembro", cards de confirmação e persistência.

A skill **NÃO deve corrigir os problemas durante a execução principal da bateria**. Primeiro deve observar, registrar e classificar os problemas encontrados. Ao final, deve entregar um relatório consolidado, caso a caso, com comportamento esperado, comportamento observado, evidências e provável causa.

Depois do relatório, pode sugerir correções, mas **NÃO aplicar alterações sem solicitação explícita**.

---

## 1. Regras de Segurança Obrigatórias

Antes de qualquer teste:
1. Confirmar que o ambiente utilizado **NÃO é produção**.
2. Confirmar que banco, APIs e dados pertencem a ambiente de desenvolvimento/teste.
3. Se houver qualquer dúvida sobre o ambiente, **PARAR** e não executar testes destrutivos.
4. Criar um `testRunId` único para a execução (ex: `TR-20260906-001`).
5. Todo registro criado pela bateria deve ser identificável por esse `testRunId`, direta ou indiretamente.
6. Não editar, excluir, cancelar, estornar ou alterar registros reais.
7. Preferir criar dados fictícios exclusivos para o teste.
8. Limpar os dados criados ao final, quando a arquitetura permitir.
9. Se um teste exigir dado já existente, criar previamente um dado de teste controlado.
10. Nunca usar fornecedores/clientes reais sem necessidade.
11. Em testes com "Bechara", se Bechara for dado real do ambiente, criar uma entidade fictícia equivalente, por exemplo: `Fornecedor Teste Bechara <testRunId>`.
12. Não executar testes financeiros em produção, mesmo que sejam apenas "para conferir".

---

## 2. Modo de Execução

A skill deve abrir o navegador (`browser_subagent`) e testar a interface real do ERP.

### Fluxo de Execução:
1. Abrir o ERP.
2. Ir até Financeiro.
3. Abrir a aba Assistente.
4. Limpar/iniciar uma conversa nova antes de cada grupo quando necessário.
5. Enviar cada frase **EXATAMENTE** como definida neste roteiro.
6. Esperar a IA terminar o processamento.
7. Registrar:
   - Resposta textual;
   - Cards renderizados;
   - Botões;
   - Tool/action executada;
   - Alteração no banco quando aplicável;
   - Erros do console;
   - Erros de rede;
   - Comportamento de loading;
   - Comportamento de contexto.
8. Tirar screenshot quando houver comportamento errado ou relevante.
9. **NÃO corrigir o código durante a primeira passada**.
10. Executar toda a bateria.
11. Ao final, consolidar os problemas.

Se o navegador permitir inspeção:
- Verificar console (`console.error`, `console.warn`);
- Verificar network e status HTTP;
- Registrar payloads relevantes sem expor segredos;
- Verificar se houve chamadas duplicadas;
- Verificar loops ou repetição de perguntas;
- Verificar race conditions e se uma resposta antiga sobrescreveu uma nova.

---

## 3. Critério Geral de Aprovação

O Assistente Financeiro deve funcionar como uma interface inteligente para o ERP.

### Princípios Universais:
- **Se o usuário sabe** $\rightarrow$ usar a informação.
- **Se o ERP sabe** $\rightarrow$ consultar o ERP.
- **Se algo pode ser inferido com segurança** $\rightarrow$ inferir.
- **Se existe ambiguidade real** $\rightarrow$ perguntar.
- **Se o usuário diz "não lembro"** $\rightarrow$ gravar em `unknownByUser` e não perguntar a mesma coisa de novo.
- **Consulta $\neq$ Criação**.
- **Edição $\neq$ Criação**.
- **Correção parcial** deve atualizar apenas o campo corrigido.
- **Mensagem complementar** deve manter contexto.
- Nenhuma gravação ocorre antes de confirmação explícita quando o fluxo exigir confirmação.
- Nenhuma IA deve inventar dados financeiros.
- Cards devem refletir os dados estruturados reais.
- O backend deve recalcular totais, datas e validações.
- Mensagens posteriores devem atualizar o mesmo draft quando fizerem parte da mesma operação.
- Dados já confirmados e persistidos não podem ser alterados silenciosamente por edição de mensagem de chat.

---

## 4. Estrutura Obrigatória do Relatório por Caso

Para **CADA** teste, retornar:

```text
TC-XXX — Nome do caso
Entrada do usuário
> texto enviado
Pré-condição
...
Esperado
...
Observado
...
Resultado
[ PASS | FAIL | BLOCKED ]
Problemas encontrados
...
Evidência
screenshot / console / request / card / mensagem
Severidade
[ CRÍTICA | ALTA | MÉDIA | BAIXA ]
Provável camada
[ Prompt/LLM | Orquestrador | Estado da conversa | Backend | Busca | Validação | UI | Persistência | Datas | Speech/transcrição | Race condition | Outro ]
Observações
...
```

---

## 5. Dados-Base Fictícios para a Bateria

Criar, quando necessário:
- **Fornecedor A**: `Fornecedor Teste Bechara <testRunId>`
- **Fornecedor B**: `Fornecedor Teste Bertolini <testRunId>`
- **Cliente A**: `Cliente Teste João <testRunId>`
- **Categorias**: Compra de estoque, Combustível, Frete, Venda, Outros.

### Registros Controlados para Consulta:
- **Compra A**: Fornecedor Bechara teste, R$ 30.000, 4 parcelas (10.000 / 10.000 / 5.000 / 5.000), vencimentos mensais, boleto.
- **Compra B**: Fornecedor Bechara teste, R$ 8.900, pagamento Pix, data diferente.
- **Compra C**: Fornecedor Bechara teste, R$ 12.450, boleto, data diferente.
- **Saída combustível**: R$ 180, Pix.
- **Entrada de venda**: R$ 2.500, cliente teste.
- **Conta a receber parcelada**: R$ 6.000, 3x R$ 2.000.

Todos devem estar isolados pelo `testRunId`.

---

## 6. GRUPO A — Criação de Saída Simples

- **TC-001**: `paguei 180 reais de combustível hoje no pix`
  - *Esperado*: saída; R$ 180; combustível; hoje; Pix; card preview; sem persistir antes de confirmar.
- **TC-002**: `gastei 250 de frete hoje`
  - *Esperado*: saída; R$ 250; frete; não perguntar forma de pagamento se não for obrigatória.
- **TC-003**: `paguei 500 pro fornecedor teste`
  - *Esperado*: resolver fornecedor se único; saída; card.
- **TC-004**: `saíram 120 reais do caixa pra comprar material de limpeza`
  - *Esperado*: saída; descrição coerente; categoria limpa; não classificar como entrada.
- **TC-005**: `comprei uma peça por 90 reais em dinheiro`
  - *Esperado*: saída; R$ 90; dinheiro; não inventar fornecedor.

---

## 7. GRUPO B — Criação de Entrada Simples

- **TC-006**: `entrou 2500 de uma venda hoje no pix`
  - *Esperado*: entrada; R$ 2.500; venda; Pix; hoje.
- **TC-007**: `recebi 800 reais do João`
  - *Esperado*: entrada; R$ 800; cliente João; desambiguar se houver mais de um João.
- **TC-008**: `entrou 1000 no caixa`
  - *Esperado*: entrada; R$ 1.000; pedir origem apenas se necessária.
- **TC-009**: `recebi 3500 de uma venda no cartão`
  - *Esperado*: entrada; R$ 3.500; cartão; card.
- **TC-010**: `foi recebida uma parcela de 700 hoje`
  - *Esperado*: recebimento; consultar candidatos a receber se aplicável.

---

## 8. GRUPO C — Contas a Pagar Parceladas

- **TC-011**: `comprei 30 mil da Bechara em dois boletos de 10 mil e dois de 5 mil, todo dia 20 começando mês que vem`
  - *Esperado*: total 30.000; 4 parcelas (10k, 10k, 5k, 5k); vencimento dia 20 do próximo mês; datas consecutivas mensais; card único.
- **TC-012**: `comprei 30 mil da Bechara em dois de 10 mil e um de 5 mil`
  - *Esperado*: detectar soma R$ 25.000; apontar divergência de R$ 5.000; BLOQUEAR confirmação.
- **TC-013**: (Após TC-012) `eu quis dizer dois de 5 mil`
  - *Esperado*: PATCH no draft; manter 2x 10.000; atualizar 1x 5.000 para 2x 5.000; total 30.000; card pronto.
- **TC-014**: `compra de 24 mil em 12 parcelas iguais todo dia 10 começando no próximo mês`
  - *Esperado*: 12x R$ 2.000; datas mensais consecutivas sem erro de virada de ano.
- **TC-015**: `fiz uma compra de 9999 em 3 vezes iguais`
  - *Esperado*: 3x R$ 3.333,00; centavos/arredondamento correto sem divergência.
- **TC-016**: `comprei 5000, metade agora e metade mês que vem`
  - *Esperado*: 2 parcelas de R$ 2.500; uma hoje; outra mês seguinte.
- **TC-017**: `comprei 10000 em 30, 60 e 90 dias`
  - *Esperado*: 3 parcelas; 30, 60 e 90 dias a partir de hoje.

---

## 9. GRUPO D — Correções Incrementais

- **TC-018**: (Draft: 20k Bechara 2x10k) `na verdade o fornecedor é Bertolini`
  - *Esperado*: alterar apenas fornecedor para Bertolini.
- **TC-019**: (Draft vencimento dia 20) `melhor dia 25`
  - *Esperado*: alterar regra de vencimento para dia 25 sem perder parcelas ou fornecedor.
- **TC-020**: (Draft 3 parcelas) `o último é 1500`
  - *Esperado*: alterar somente a 3ª parcela.
- **TC-021**: `não, são quatro parcelas`
  - *Esperado*: ajustar quantidade de parcelas; preservar contexto.
- **TC-022**: `troca a primeira pra 8 mil`
  - *Esperado*: alterar apenas 1ª parcela; se gerar divergência, alertar math diff.
- **TC-023**: `esquece o que eu falei da forma de pagamento`
  - *Esperado*: remover paymentMethod do draft sem descartar a operação.
- **TC-024**: `na verdade não é saída, é entrada`
  - *Esperado*: alterar tipo para entrada; revisar campos.

---

## 10. GRUPO E — "Não Lembro" / `unknownByUser`

- **TC-025**: `quero editar uma compra da Bechara mas não lembro o dia, o valor nem como paguei`
  - *Esperado*: intent `EDIT_TRANSACTION` / `QUERY_OR_UPDATE`; buscar no ERP por Bechara; **NÃO** perguntar valor, data ou forma de pagamento.
- **TC-026**: (Após pergunta da IA) `não lembro`
  - *Esperado*: gravar em `unknownByUser`; não repetir a mesma pergunta.
- **TC-027**: `procura aquela compra da Bechara, não lembro quanto foi`
  - *Esperado*: buscar por fornecedor; apresentar candidatos.
- **TC-028**: `não sei quando foi, vê aí`
  - *Esperado*: buscar no ERP sem exigir data.
- **TC-029**: `não lembro de nada além de que era da Bechara`
  - *Esperado*: buscar compras recentes da Bechara; mostrar lista de candidatos.

---

## 11. GRUPO F — Consulta de Movimentações

- **TC-030**: `qual foi a última compra da Bechara?`
  - *Esperado*: consulta (não criação); retornar registro real do ERP.
- **TC-031**: `me mostra as compras da Bechara desse mês`
  - *Esperado*: filtro por fornecedor Bechara + mês atual.
- **TC-032**: `quanto eu paguei pra Bechara mês passado?`
  - *Esperado*: somatório de pagamentos para Bechara no mês passado.
- **TC-033**: `qual foi aquela compra de uns 30 mil da Bechara?`
  - *Esperado*: busca por aproximação de valor (~30.000).
- **TC-034**: `tem alguma conta da Bechara vencendo essa semana?`
  - *Esperado*: consulta a contas a pagar da semana.
- **TC-035**: `o que eu tenho pra pagar amanhã?`
  - *Esperado*: listar contas a pagar de amanhã.
- **TC-036**: `quanto entrou hoje?`
  - *Esperado*: somatório de entradas de hoje.
- **TC-037**: `quanto saiu hoje?`
  - *Esperado*: somatório de saídas de hoje.
- **TC-038**: `qual foi a maior saída do mês?`
  - *Esperado*: consulta ordenada decrescente por valor no mês.
- **TC-039**: `me mostra as 5 últimas entradas`
  - *Esperado*: listar as 5 entradas mais recentes.
- **TC-040**: `tem alguma saída duplicada de 500 reais hoje?`
  - *Esperado*: checar saídas de R$ 500 em hoje; reportar evidências sem falsos positivos.

---

## 12. GRUPO G — Edição de Registros Existentes

- **TC-041**: `quero editar a última compra da Bechara`
  - *Esperado*: buscar última compra no ERP; exibir card de edição.
- **TC-042**: `quero mudar a forma de pagamento daquela compra de 30 mil da Bechara`
  - *Esperado*: localizar registro de 30k Bechara; abrir alteração de forma de pagamento; não criar nova compra.
- **TC-043**: `troca a categoria da compra da Bechara de ontem pra compra de estoque`
  - *Esperado*: localizar por data/fornecedor; alterar apenas categoria.
- **TC-044**: `muda o valor daquela saída de combustível de hoje de 180 pra 190`
  - *Esperado*: localizar saída de R$ 180; preview da alteração para R$ 190; pedir confirmação.
- **TC-045**: `quero corrigir a data daquela entrada de 2500 do João`
  - *Esperado*: localizar registro; solicitar nova data.
- **TC-046**: `edita a parcela 3 daquela compra de 30 mil, coloca vencimento dia 25`
  - *Esperado*: localizar compra 30k; alterar vencimento da 3ª parcela para dia 25; preservar demais.

---

## 13. GRUPO H — Ambiguidade e Desambiguação

- **TC-047**: (Existem 3 compras da Bechara) `quero editar uma compra da Bechara`
  - *Esperado*: mostrar cards/pills de candidatos; não escolher aleatoriamente.
- **TC-048**: (Existem 2 clientes João) `recebi 500 do João`
  - *Esperado*: apresentar os dois clientes João para escolha.
- **TC-049**: `quero editar a compra de 10 mil` (Havendo várias)
  - *Esperado*: listar candidatos de 10k.
- **TC-050**: `foi aquela do mês passado`
  - *Esperado*: aplicar filtro de mês passado ao conjunto de busca ativo.
- **TC-051**: `a segunda`
  - *Esperado*: selecionar o 2º candidato listado na mensagem anterior.
- **TC-052**: `não é essa`
  - *Esperado*: descartar candidato atual e exibir os próximos sem perder busca.

---

## 14. GRUPO I — Datas Relativas

(Usar a data atual real do ambiente de teste)
- **TC-053**: `paguei 500 ontem` $\rightarrow$ `data = hoje - 1 dia`
- **TC-054**: `vou pagar 500 amanhã` $\rightarrow$ `data = hoje + 1 dia`
- **TC-055**: `vence sexta` $\rightarrow$ `próxima sexta-feira`
- **TC-056**: `vence no próximo dia 20` $\rightarrow$ `dia 20 do mês corrente/seguinte`
- **TC-057**: `todo dia 20 começando mês que vem` $\rightarrow$ `dia 20 do próximo mês`
- **TC-058**: `daqui dois meses` $\rightarrow$ `mês atual + 2`
- **TC-059**: `no último dia deste mês` $\rightarrow$ `último dia do mês atual`
- **TC-060**: `no primeiro dia útil do mês que vem` $\rightarrow$ `1º dia útil do mês que vem`

---

## 15. GRUPO J — Valores e Linguagem Brasileira

- **TC-061**: `dez mil` $\rightarrow$ 10000
- **TC-062**: `10 mil` $\rightarrow$ 10000
- **TC-063**: `10.000` $\rightarrow$ 10000
- **TC-064**: `10.000,50` $\rightarrow$ 10000.50
- **TC-065**: `dez mil e cinquenta centavos` $\rightarrow$ 10000.50
- **TC-066**: `2 de 10 e 2 de 5` (com contexto prévio de milhares) $\rightarrow$ 2x 10.000 + 2x 5.000
- **TC-067**: `30 conto` $\rightarrow$ R$ 30,00 (se ambíguo, confirmar se é 30 ou 30 mil).

---

## 16. GRUPO K — Forma de Pagamento

- **TC-068**: `paguei no pix` $\rightarrow$ Pix
- **TC-069**: `foi no boleto` $\rightarrow$ Boleto
- **TC-070**: `paguei em dinheiro` $\rightarrow$ Dinheiro
- **TC-071**: `foi cartão` $\rightarrow$ Cartão de Crédito
- **TC-072**: `uma parte no pix e outra no boleto` $\rightarrow$ tratar/perguntar divisão
- **TC-073**: `na verdade foi boleto` $\rightarrow$ atualizar apenas `paymentMethod` para Boleto.

---

## 17. GRUPO L — Criação de Contas a Receber

- **TC-074**: `vendi 6000 pro João em 3 parcelas de 2000 começando mês que vem`
  - *Esperado*: conta a receber; 3x R$ 2.000; cliente João; datas relativas.
- **TC-075**: `tenho 1500 pra receber do João dia 15`
  - *Esperado*: conta a receber; R$ 1.500; João; dia 15.
- **TC-076**: `o cliente vai me pagar metade hoje e metade mês que vem`
  - *Esperado*: 2 parcelas de 50%.
- **TC-077**: `recebimento de 900 em 3 vezes`
  - *Esperado*: 3x R$ 300; conta a receber.

---

## 18. GRUPO M — Confirmação e Cancelamento de Draft

- **TC-078**: (Card pronto) `pode registrar` $\rightarrow$ Executa e grava no ERP.
- **TC-079**: `sim` $\rightarrow$ Confirmar SOMENTE se houver exatamente um draft pendente inequívoco.
- **TC-080**: `não` $\rightarrow$ Não persistir; manter/descartar rascunho.
- **TC-081**: Tocar no `✕` (fechar) do card $\rightarrow$ Descartar draft sem criar mensagens da IA no chat.
- **TC-082**: Tocar em `Editar` no card $\rightarrow$ Abrir formulário/modo de edição do draft.

---

## 19. GRUPO N — Mensagens Novas com Card Pendente

- **TC-083**: (Card pendente de compra) `o primeiro vence dia 15` $\rightarrow$ Atualiza o MESMO draft.
- **TC-084**: `troca o fornecedor` $\rightarrow$ Edita o fornecedor do MESMO draft.
- **TC-085**: `e coloca observação que foi compra do mostruário` $\rightarrow$ Complementa observação no MESMO draft.
- **TC-086**: (Card pendente ativo) `quanto saiu hoje?` $\rightarrow$ Identifica nova intenção de consulta sem corromper o draft pendente anterior.

---

## 20. GRUPO O — Edição de Mensagem do Chat

- **TC-087**: Editar uma mensagem antiga na linha do tempo do chat.
  - *Esperado*: manter mensagens anteriores; descartar/invalidar branch posterior; reprocessar a partir dali.
- **TC-088**: Editar valor de `500` para `5000` em mensagem passada.
  - *Esperado*: card antigo é desativado; novo card é gerado com R$ 5.000.
- **TC-089**: Editar mensagem que já gerou transação confirmada no ERP.
  - *Esperado*: **NÃO** alterar registro já confirmado no ERP silenciosamente.
- **TC-090**: Cancelar edição de mensagem $\rightarrow$ Nenhuma mudança no chat.
- **TC-091**: Copiar mensagem $\rightarrow$ Área de transferência correta.

---

## 21. GRUPO P — Voz / Ditado (Se Disponível)

- **TC-092**: Iniciar ditado de saída completa $\rightarrow$ Transcrição em tempo real; não gravar antes de confirmar.
- **TC-093**: Cancelar ditado com `✕` $\rightarrow$ Limpar sessão; abortar análise.
- **TC-094**: Parar ditado $\rightarrow$ Preservar transcrição; gerar card preview.
- **TC-095**: Falar `comprei 30 mil...` [pausa] `...dois de dez e dois de cinco` $\rightarrow$ Pré-análise debounce sem enviar versão parcial incompleta como final.
- **TC-096**: Cancelar durante pré-análise $\rightarrow$ Resposta atrasada descartada.

---

## 22. GRUPO Q — Race Conditions & Concorrência

- **TC-097**: Enviar mensagem e rapidamente editar antes da resposta da IA.
  - *Esperado*: descartar resposta da mensagem antiga.
- **TC-098**: Enviar correção enquanto análise anterior está em andamento.
  - *Esperado*: revisão mais nova prevalece.
- **TC-099**: Trocar de conversa/aba durante o loading.
  - *Esperado*: a resposta não pode vazar nem ser renderizada na conversa errada.
- **TC-100**: Descartar card (`✕`) enquanto request do backend está em andamento.
  - *Esperado*: card não reaparece por resposta atrasada.

---

## 23. GRUPO R — Duplicidade

- **TC-101**: Criar saída R$ 500 hoje. Em seguida enviar `paguei 500 hoje para o mesmo fornecedor`.
  - *Esperado*: alertar sobre possível duplicidade; permitir se o usuário confirmar.
- **TC-102**: Registrar duas transações legitimamente iguais com confirmação.
  - *Esperado*: permitir após confirmação explícita.

---

## 24. GRUPO S — Validações e Erros de Dados

- **TC-103**: `paguei -500` $\rightarrow$ Rejeitar valor negativo.
- **TC-104**: `paguei zero reais` $\rightarrow$ Rejeitar valor zero.
- **TC-105**: `comprei 30 mil em duas parcelas de 20 mil` $\rightarrow$ Alertar divergência (40k vs 30k).
- **TC-106**: `comprei em 0 parcelas` $\rightarrow$ Rejeitar 0 parcelas.
- **TC-107**: `vence dia 31 de fevereiro` $\rightarrow$ Alertar data inválida.
- **TC-108**: `paguei 999999999999999` $\rightarrow$ Validar limites de valor.

---

## 25. GRUPO T — Contexto e Continuidade em Multi-turn

- **TC-109**:
  - Usuário: `comprei 30 mil da Bechara` (IA pede parcelamento)
  - Usuário: `4 boletos` (IA pede distribuição)
  - Usuário: `2 de 10 e 2 de 5`
  - *Esperado*: Montar operação completa (30.000 em 4 parcelas: 10k, 10k, 5k, 5k).
- **TC-110**: (Sequência) `todo dia 20` $\rightarrow$ Define vencimentos para dia 20.
- **TC-111**: (Sequência) `começando mês que vem` $\rightarrow$ Define data inicial no próximo mês.
- **TC-112**: (Sequência) `na verdade dia 25` $\rightarrow$ Atualiza vencimentos para dia 25.

---

## 26. GRUPO U — Consultas Agregadas

- **TC-113**: `quanto tenho a pagar este mês?` $\rightarrow$ Somatório de contas a pagar do mês.
- **TC-114**: `quanto tenho a receber este mês?` $\rightarrow$ Somatório de contas a receber do mês.
- **TC-115**: `qual fornecedor eu mais paguei esse mês?` $\rightarrow$ Ranking de fornecedores.
- **TC-116**: `quanto saiu com combustível este mês?` $\rightarrow$ Somatório por categoria.
- **TC-117**: `quanto entrou de vendas essa semana?` $\rightarrow$ Somatório de vendas da semana.

---

## 27. GRUPO V — Busca por Referência Semântica

- **TC-118**: `aquela compra que fiz da Bechara` $\rightarrow$ Listar/mostrar a última compra da Bechara.
- **TC-119**: `a conta do fornecedor que vence perto do fim do mês` $\rightarrow$ Filtrar por vencimento final do mês.
- **TC-120**: `a compra que tinha quatro boletos` $\rightarrow$ Filtrar por parcelamento em 4x.
- **TC-121**: `aquela de dois de 10 e dois de 5` $\rightarrow$ Filtrar por padrão de parcelas (10k, 10k, 5k, 5k).

---

## 28. GRUPO W — Linguagem Ruidosa e Incerteza

- **TC-122**: `fiz uma compra cabeceada com a Bechara de 30 mil` $\rightarrow$ Ignorar ruído "cabeceada"; extrair compra Bechara R$ 30.000.
- **TC-123**: `dois boleto de dez e dois de cinco` $\rightarrow$ Interpretar 2x 10.000 + 2x 5.000.
- **TC-124**: `eu paguei acho que foi uns cinco mil` $\rightarrow$ Sinalizar valor aproximado/incerto.
- **TC-125**: `foi dia vinte eu acho` $\rightarrow$ Tratar data hipotética/confirmação.

---

## 29. GRUPO X — Interface dos Cards de Transação

Para **CADA** card renderizado, verificar obrigatoriamente:
- Título correto (ex: `CONTA A PAGAR`, `ENTRADA`);
- Badge de categoria e fornecedor;
- Valor formatado em padrão pt-BR (`R$ 30.000,00`);
- Parcelas alinhadas (datas à esquerda, valores à direita);
- Ausência de campos vazios ou `undefined`/`null`;
- Botão `[ ✎ Editar ]`;
- Botão `[ ✓ Confirmar ]`;
- Botão `[ ✕ ]` de descarte;
- **Sem** botão Confirmar quando o estado for `NEEDS_INPUT`;
- Indicador de loading ao salvar (`SAVING`);
- Estado `SAVED` pós-confirmação;
- Layout responsivo sem overflow horizontal em telas pequenas.

---

## 30. GRUPO Y — Tratamento de Erros do Backend

- **TC-126**: (Falha HTTP 500 no backend ao buscar movimentações)
  - *Esperado*: Exibir mensagem amigável de erro; botão de tentar novamente; **NÃO** inventar movimentações.
- **TC-127**: (Falha de conexão ao confirmar criação)
  - *Esperado*: Exibir card em estado `ERROR` com botão `Tentar Novamente`; não marcar como salvo no ERP.
- **TC-128**: Timeout de consulta $\rightarrow$ Notificar timeout e permitir retry.
- **TC-129**: Fornecedor não encontrado $\rightarrow$ Informar que fornecedor não possui registros e oferecer opção de busca ampla.
- **TC-130**: Transação alterada por outro operador antes da confirmação $\rightarrow$ Alertar conflito de concorrência.

---

## 31. GRUPO Z — Persistência e Idempotência

- **TC-131**: Duplo clique rápido no botão `[ ✓ Confirmar ]`.
  - *Esperado*: Enviar idempotency key única; criar **apenas 1** movimentação no banco.
- **TC-132**: Confirmar e recarregar a página imediatamente.
  - *Esperado*: Não duplicar registro nem reenviar confirmação.
- **TC-133**: Perda de conexão durante o retorno da resposta de confirmação.
  - *Esperado*: Retentativa com idempotency key evita duplicação.
- **TC-134**: Card salvo continua exibindo o botão Confirmar.
  - *Esperado*: **FAIL**. O botão Confirmar deve desaparecer ou ser substituído por `[ ✓ Salvo ]`.

---

## 32. Testes Exploratórios Obrigatórios (Mínimo 30 Casos)

Além dos 134 casos roteirizados, realizar pelo menos **30 interações exploratórias adicionais** variando:
- Português informal, gírias e erros de digitação;
- Frases incompletas e mudadas no meio do pensamento;
- Pronomes demonstrativos (*"essa"*, *"aquela"*, *"a primeira"*, *"a última"*);
- Mudanças de intenção abruptas (de criação para consulta ou edição).

### O que procurar:
- Loops de perguntas repetidas;
- Perguntas desnecessárias de dados que o ERP já possui ou que o usuário declarou que não lembra;
- Perda de contexto entre mensagens;
- Cards renderizados com dados inconsistentes;
- Gravações no banco sem confirmação prévia;
- Erros de cálculo em parcelas ou datas relativas.

*Cada novo bug exploratório encontrado deve ser registrado no relatório com a sigla `EXP-001`, `EXP-002`, ..., `EXP-030`.*

---

## 33. Regra de Não-Correção Durante a Primeira Rodada

Durante a execução da bateria:
- **NÃO** editar prompts;
- **NÃO** editar backend/services;
- **NÃO** editar frontend/componentes;
- **NÃO** corrigir arquivos de código individualmente.

*Exceção*: Se for detectado um bug crítico que possa afetar ou corromper dados de produção, interromper imediatamente a execução.

---

## 34. Relatório Final Consolidado

Ao final de toda a bateria, gerar o relatório no formato:

```text
==================================================
RESUMO DA AUDITORIA E2E ASSISTENTE FINANCEIRO
==================================================
Total de Casos Executados: 164 (134 Roteirizados + 30 Exploratórios)
PASS: X
FAIL: Y
BLOCKED: Z

Bugs Críticos (P0): A
Bugs Altos (P1): B
Bugs Médios (P2): C
Bugs Baixos (P3): D

BUGS AGRUPADOS POR CAUSA PROVÁVEL
- Contexto / Memória: ...
- Classificação de Intenção: ...
- Consulta ao ERP: ...
- unknownByUser: ...
- Correção Incremental: ...
- Datas Relativas: ...
- Calculations & Parcelas: ...
- Cards & UX: ...
- Persistência & Idempotência: ...

TABELA RESUMIDA
--------------------------------------------------------------------------------------
ID      | Caso                     | Resultado | Severidade | Camada      | Resumo
--------------------------------------------------------------------------------------
TC-001  | Saída simples combustível| PASS      | -          | -           | OK
...

DETALHAMENTO DOS FAILS
(Para cada FAIL, incluir entrada, esperado, observado, evidência, provável causa e componentes afetados)
```

---

## 35. Saída para Revisão Externa: PACOTE PARA CORREÇÃO

No final do relatório, gerar obrigatoriamente o bloco:

```text
==================================================
PACOTE PARA CORREÇÃO
==================================================

1. [NOME DO BUG 1]
- Casos afetados: TC-XXX, TC-YYY
- Comportamento Esperado: ...
- Comportamento Atual: ...
- Provável Causa: ...
- Severidade: [ P0 | P1 | P2 | P3 ]
- Arquivos Relacionados: ...
- Evidência Curta: ...

2. [NOME DO BUG 2]
...
```

Este pacote deve ser pronto para copiar e colar para geração de prompt único de correção em lote.
