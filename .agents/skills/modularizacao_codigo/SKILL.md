---
name: modularizacao_codigo
description: Responsabilidade Única, Código Limpo e Modularização Segura. Mantém arquivos coesos, pequenos (alvo de 30-100 linhas, aceitável até 150), desacoplados e sem perda de regras ou código durante refatorações.
---

# Skill: Responsabilidade Única, Código Limpo e Modularização Segura

## Objetivo

Manter todo o projeto organizado com arquivos pequenos, coesos, fáceis de localizar, entender, testar e depurar por humanos e agentes de IA.

Esta skill deve ser aplicada continuamente durante qualquer tarefa realizada no projeto.

Sempre que um arquivo existente for aberto, analisado ou alterado durante uma tarefa, verificar também se ele respeita os princípios desta skill. Se não respeitar, aproveitar a própria tarefa para modularizá-lo de forma segura, desde que isso possa ser feito sem alterar o comportamento funcional esperado.

---

# 1. Princípio principal: Responsabilidade Única

Cada arquivo deve possuir uma responsabilidade principal claramente identificável.

Deve ser possível responder em uma frase curta:

> "Qual é a responsabilidade deste arquivo?"

Se a resposta envolver vários "e", diferentes domínios, múltiplos fluxos ou responsabilidades independentes, provavelmente o arquivo deve ser dividido.

Exemplo ruim:

```text
sale-service.ts
- cria venda
- valida pagamento
- movimenta estoque
- calcula custo
- agenda entrega
- cancela venda
- envia notificação
```

Preferir:

```text
sales/
  create-sale.ts
  cancel-sale.ts
  schedule-sale.ts

payments/
  validate-sale-payment.ts

inventory/
  create-sale-stock-movement.ts
  reverse-sale-stock-movement.ts

cost/
  calculate-sale-cost.ts

notifications/
  notify-sale-created.ts
```

---

# 2. Limite de tamanho dos arquivos

O objetivo NÃO é simplesmente atingir determinada quantidade de linhas.

A prioridade é:

1. responsabilidade única;
2. alta coesão;
3. baixo acoplamento;
4. nomes claros;
5. facilidade de localização;
6. facilidade de teste;
7. facilidade de depuração.

Como regra operacional:

```text
Ideal: menor tamanho possível mantendo uma responsabilidade completa.

Alvo recomendado:
30–100 linhas.

Aceitável:
até aproximadamente 150 linhas.

Acima de 150 linhas:
analisar obrigatoriamente possibilidade de modularização.
```

Não criar divisões artificiais apenas para obedecer ao número de linhas.

Um arquivo com 120 linhas e uma responsabilidade clara é melhor que cinco arquivos de 25 linhas altamente acoplados.

Mas arquivos grandes não devem permanecer apenas por comodidade.

---

# 3. Regra contínua durante qualquer tarefa

Ao executar QUALQUER tarefa no projeto:

1. localizar os arquivos necessários;
2. entender o fluxo atual;
3. verificar responsabilidade e tamanho dos arquivos tocados;
4. executar a alteração solicitada;
5. se algum arquivo tocado estiver excessivamente grande ou acumulando responsabilidades, modularizá-lo;
6. preservar integralmente o comportamento anterior, exceto pela mudança explicitamente solicitada;
7. executar testes relacionados;
8. revisar imports e dependências;
9. verificar TypeScript/lint/build quando aplicável.

Não é necessário sair refatorando todo o projeto de uma única vez.

A modularização deve ocorrer progressivamente:

> arquivo tocado → analisar → melhorar quando necessário.

Assim o projeto inteiro vai sendo organizado naturalmente conforme evolui.

---

# 4. Regra crítica: ZERO perda de código durante modularização

Modularização é uma operação de alto risco para perda acidental de lógica.

Portanto, seguir obrigatoriamente uma estratégia conservadora.

NUNCA apagar ou recortar código importante de um arquivo antes de garantir que ele já existe corretamente no novo arquivo.

Usar sempre a estratégia:

```text
COPIAR → VALIDAR → CONECTAR → TESTAR → SÓ DEPOIS REMOVER
```

Nunca:

```text
RECORTAR → CRIAR ARQUIVO → COLAR
```

---

# 5. Procedimento obrigatório de modularização segura

Antes de iniciar uma modularização significativa:

```bash
git status
git add .
git commit -m "checkpoint antes da modularização"
```

Se já houver alterações não relacionadas à tarefa, analisar cuidadosamente antes do commit para não misturar mudanças indevidas.

O objetivo é existir um checkpoint recuperável antes da refatoração.

Depois:

## Etapa 1 — identificar responsabilidades

Mapear explicitamente o que existe no arquivo.

Exemplo:

```text
SaleForm.tsx

Responsabilidades encontradas:
- estado do formulário
- informações do cliente
- itens da venda
- pagamento
- entrega
- validações
- submissão
- cálculo de totais
```

Definir previamente quais partes serão extraídas.

---

## Etapa 2 — criar os novos arquivos

Criar os arquivos de destino ANTES de remover qualquer código do arquivo original.

Exemplo:

```text
SaleCustomerSection.tsx
SaleItemsSection.tsx
SalePaymentSection.tsx
SaleDeliverySection.tsx
useSaleForm.ts
calculate-sale-total.ts
```

---

## Etapa 3 — COPIAR o código

Copiar o código necessário do arquivo original para o novo arquivo.

Neste momento o código original ainda deve permanecer intacto.

Não apagar imediatamente.

Isso cria temporariamente duplicação, o que é aceitável durante a refatoração.

Prioridade:

> segurança > elegância temporária.

---

## Etapa 4 — conectar o novo módulo

Adicionar imports e começar a utilizar o novo arquivo.

Exemplo:

```ts
import { calculateSaleTotal } from "./calculate-sale-total";
```

Certificar-se de que:

* parâmetros foram preservados;
* tipos foram preservados;
* retornos foram preservados;
* efeitos colaterais foram preservados;
* tratamento de erros foi preservado;
* regras de negócio foram preservadas.

---

## Etapa 5 — validar

Antes de remover o código antigo:

* TypeScript deve estar válido;
* imports devem resolver;
* testes relacionados devem passar;
* comportamento esperado deve permanecer;
* chamadas devem estar apontando para o novo módulo.

Quando possível executar:

```bash
npm run typecheck
npm run lint
npm run test
```

Ou os comandos equivalentes existentes no projeto.

---

## Etapa 6 — somente agora remover o código antigo

Somente depois da nova implementação estar conectada e validada, remover a implementação duplicada do arquivo original.

Nunca remover antecipadamente.

---

## Etapa 7 — validar novamente

Executar novamente as verificações.

Confirmar que não ficaram:

* imports mortos;
* exports mortos;
* funções duplicadas;
* referências antigas;
* chamadas apontando para implementação removida;
* arquivos órfãos.

---

# 6. Git como rede de segurança

Antes de refatorações relevantes, criar checkpoint.

Exemplo:

```bash
git status
git add .
git commit -m "checkpoint antes de modularizar SaleForm"
```

Depois da modularização:

```bash
git status
git diff
```

Revisar cuidadosamente o diff.

Verificar especialmente linhas removidas.

Pergunta obrigatória ao analisar cada remoção:

> "Esse código foi realmente substituído ou transferido para outro local?"

Se não houver resposta clara, NÃO remover.

Quando tudo estiver validado:

```bash
git add .
git commit -m "refactor: modulariza SaleForm por responsabilidade"
```

---

# 7. Nunca sobrescrever mudanças do usuário

Antes de modificar um arquivo:

```bash
git status
git diff
```

Se existirem alterações recentes ou não commitadas:

* entendê-las;
* preservá-las;
* não executar reset;
* não restaurar arquivo inteiro;
* não sobrescrever versões;
* não descartar mudanças sem autorização explícita.

Proibido utilizar para "resolver rapidamente":

```bash
git reset --hard
git checkout -- arquivo
git restore arquivo
```

quando houver risco de apagar trabalho existente.

---

# 8. Cuidado com refatoração automática

Não utilizar substituições globais agressivas sem verificar contexto.

Evitar operações que possam remover grandes blocos inadvertidamente.

Depois de qualquer alteração significativa, revisar:

```bash
git diff --stat
git diff
```

Se uma modularização aparentemente pequena apresentar centenas ou milhares de linhas removidas inesperadamente:

PARAR.

Investigar antes de continuar.

---

# 9. Nunca alterar regra de negócio silenciosamente

Uma modularização deve ser estrutural.

Exemplo:

Antes:

```ts
function cancelSale() {
  reverseStockMovement();
  updateSaleStatus();
}
```

Depois da modularização:

```ts
import { reverseSaleStockMovement } from "@/inventory";

function cancelSale() {
  reverseSaleStockMovement();
  updateSaleStatus();
}
```

O comportamento deve continuar equivalente.

Não aproveitar uma refatoração para alterar silenciosamente:

* regra de estoque;
* status;
* cálculos;
* validações;
* permissões;
* fluxos;
* datas;
* custos;
* movimentações;
* efeitos colaterais.

Mudança funcional deve estar relacionada explicitamente à tarefa atual.

---

# 10. Arquivos de domínio devem ter nomes explícitos

Evitar nomes genéricos:

```text
utils.ts
helpers.ts
functions.ts
common.ts
service.ts
logic.ts
misc.ts
```

Preferir nomes semânticos:

```text
calculate-moving-average-cost.ts
create-sale-stock-movement.ts
reverse-sale-stock-movement.ts
complete-receipt.ts
cancel-receipt.ts
reprocess-cost-from-date.ts
validate-sale-payment.ts
calculate-inventory-adjustment.ts
```

A estrutura do projeto deve permitir que outro desenvolvedor ou agente encontre a regra procurando pelo seu significado.

---

# 11. Componentes React

Evitar componentes gigantes.

Se um componente contém:

* formulário;
* tabela;
* modal;
* chamadas de API;
* regra de negócio;
* cálculos;
* transformação de dados;
* vários estados independentes;

provavelmente deve ser dividido.

Exemplo:

```text
ProductForm.tsx
```

pode virar:

```text
product-form/
  ProductForm.tsx
  BasicInformationSection.tsx
  TechnicalInformationSection.tsx
  ProductImagesSection.tsx
  VariationsSection.tsx
  PricingSection.tsx
  StockSection.tsx
  TaxSection.tsx

  hooks/
    useProductForm.ts

  schemas/
    product-form.schema.ts
```

---

# 12. Regras de negócio fora da interface

Componentes React não devem carregar regras críticas do domínio quando elas podem existir separadamente.

Evitar:

```tsx
const newAverageCost =
  ((stock * oldCost) + (receivedQuantity * purchaseCost)) /
  (stock + receivedQuantity);
```

diretamente dentro de componente.

Preferir:

```ts
calculate-moving-average-cost.ts
```

e utilizar:

```ts
const newAverageCost = calculateMovingAverageCost({
  currentStock,
  currentAverageCost,
  receivedQuantity,
  purchaseCost,
});
```

Isso melhora:

* testes;
* reutilização;
* localização;
* depuração;
* segurança das regras.

---

# 13. Services e casos de uso

Evitar um único service gigante por entidade:

```text
sale.service.ts
inventory.service.ts
product.service.ts
```

com dezenas de funções.

Preferir casos de uso:

```text
sales/
  create-sale.ts
  update-sale.ts
  cancel-sale.ts
  schedule-sale.ts
  complete-sale.ts

inventory/
  create-stock-entry.ts
  create-stock-output.ts
  reverse-stock-movement.ts
  adjust-stock.ts
```

---

# 14. Funções

Funções devem ter objetivo claro.

Evitar funções gigantes que:

```text
validam
buscam
calculam
persistem
notificam
formatam
```

na mesma implementação.

Quando necessário dividir em funções menores com nomes semânticos.

Exemplo:

```ts
async function completeReceipt(input) {
  const receipt = await loadReceipt(input.id);

  validateReceiptCanBeCompleted(receipt);

  const movements = buildReceiptStockMovements(receipt);

  await persistStockMovements(movements);

  await markReceiptAsCompleted(receipt.id);
}
```

O caso de uso continua coordenando o processo, mas cada regra possui responsabilidade clara.

---

# 15. Não criar abstrações prematuras

Modularizar não significa abstrair tudo.

Não criar:

* factories desnecessárias;
* wrappers sem utilidade;
* interfaces de uma única implementação sem motivo;
* helpers de uma linha sem valor semântico;
* abstrações genéricas impossíveis de localizar.

Priorizar clareza.

---

# 16. Localidade do código

Código relacionado deve permanecer próximo.

Evitar colocar uma função usada somente por vendas dentro de:

```text
src/utils/
```

Preferir:

```text
src/modules/sales/utils/
```

ou, melhor ainda, um nome específico dentro do próprio domínio.

---

# 17. Imports

Evitar dependências circulares.

Uma extração não deve criar:

```text
A → B → C → A
```

Se surgir dependência circular, revisar responsabilidades.

Domínio não deve depender desnecessariamente da camada visual.

Preferência:

```text
UI
↓
caso de uso
↓
domínio
↓
repository/interface
```

e não o contrário.

---

# 18. Testes durante modularização

Sempre que um código crítico for extraído, preservar ou adicionar testes quando possível.

Prioridade especial para:

* estoque;
* movimentações;
* CMPM;
* CMV;
* recebimentos;
* devoluções;
* cancelamentos;
* inventários;
* pagamentos;
* pedidos.

Uma modularização que remove cobertura ou impossibilita testar uma regra deve ser revista.

---

# 19. Comparação comportamental

Quando uma função crítica for movida, comparar implementação antiga e nova.

Verificar:

```text
inputs
outputs
validações
throws
efeitos colaterais
queries
ordem das operações
transações
status alterados
movimentações criadas
valores calculados
```

Não assumir que código "parecido" é equivalente.

---

# 20. Banco e transações

Ao modularizar código que altera dados relacionados, não quebrar atomicidade.

Se originalmente uma operação dependia de transação:

```ts
db.transaction(...)
```

preservar essa transação.

Não mover operações para arquivos diferentes de forma que passem a executar fora da mesma transação.

Separação física de arquivos NÃO deve significar separação da transação de negócio.

---

# 21. Erros e exceções

Preservar:

* mensagens importantes;
* tipos de erro;
* condições de erro;
* tratamento;
* rollback;
* logs relevantes.

Não engolir erros durante refatoração.

---

# 22. Checklist obrigatório antes de finalizar uma tarefa

Antes de considerar qualquer tarefa concluída, revisar os arquivos tocados.

Perguntar:

```text
[ ] Cada arquivo possui responsabilidade clara?
[ ] Algum arquivo ultrapassou aproximadamente 150 linhas?
[ ] Se ultrapassou, existe motivo real para permanecer assim?
[ ] Alguma regra de negócio está presa na UI?
[ ] Existem nomes genéricos demais?
[ ] Há funções gigantes?
[ ] A modularização preservou todo o comportamento?
[ ] Algum código foi removido sem substituição clara?
[ ] Foram preservadas alterações existentes do usuário?
[ ] O git diff foi revisado?
[ ] TypeScript continua válido?
[ ] Os testes relacionados passam?
[ ] Não existem imports quebrados?
[ ] Não existem arquivos antigos órfãos?
[ ] Não foram criadas dependências circulares?
[ ] Transações de banco continuam preservadas?
```

---

# 23. Regra máxima de segurança

Durante refatorações, considerar código existente como patrimônio que não pode ser perdido.

Sempre presumir que uma linha existente pode representar uma regra de negócio importante até provar o contrário.

Portanto:

> Nunca apagar primeiro e tentar reconstruir depois.

Sempre:

> copiar → conectar → validar → testar → remover duplicação.

Git deve funcionar como camada adicional de segurança, não como desculpa para realizar alterações destrutivas.

---

# 24. Comportamento esperado do agente

O agente deve agir como um mantenedor cuidadoso do projeto.

Não buscar apenas "fazer funcionar".

Buscar simultaneamente:

```text
correção
clareza
modularidade
segurança
testabilidade
rastreabilidade
facilidade de manutenção
facilidade de investigação futura
```

Quando tocar em código legado ou excessivamente grande, melhorar progressivamente sua estrutura.

Não tentar reescrever todo o projeto de uma vez.

A estratégia padrão é:

```text
TOCOU → ENTENDEU → ALTEROU → MODULARIZOU → VALIDOU
```

Sempre com prioridade absoluta para não perder código nem alterar silenciosamente regras existentes.
