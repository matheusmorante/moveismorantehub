---
name: modularizacao_codigo
description: Engenharia de Software, SOLID, Código Limpo, Arquitetura e Modularização Segura. Garante que qualquer alteração siga princípios rigorosos de engenharia (investigação prévia, Single Source of Truth, separação de camadas, contratos TypeScript estritos, Zero Trust em dados externos, idempotência, ausência de abstrações prematuras e arquivos coesos de 30-100 linhas).
---

# Skill: Engenharia de Software, Código Limpo, Arquitetura e Modularização Segura

## Princípio Permanente Inviolável

> [!IMPORTANT]
> **"ANTES DE CRIAR, PROCURE.  
> ANTES DE ALTERAR, ENTENDA.  
> ANTES DE ABSTRAIR, JUSTIFIQUE.  
> ANTES DE CONCLUIR, TESTE.  
> ANTES DE DIZER QUE RESOLVEU, VERIFIQUE REGRESSÕES."**
>
> O objetivo principal NÃO é produzir mais código nem criar abstrações mecanicamente.  
> O objetivo é manter um sistema cada vez mais simples de entender, testar, modificar e evoluir com segurança.

---

## Objetivo da Skill

Manter todo o ecossistema Morante Hub (ERP, Mobile e integrações) operando sob padrões rigorosos de engenharia de software.  
Esta skill deve ser aplicada de forma contínua e automática durante **qualquer** tarefa de leitura, correção, refatoração ou criação de funcionalidades no projeto.

---

# 0. A Regra Mais Importante para Agentes: Investigação Prévia Obrigatória

**ANTES DE ESCREVER UMA ÚNICA LINHA DE CÓDIGO, INVESTIGUE O PROJETO.**

Nenhum agente deve iniciar uma implementação relevante sem primeiro mapear e entender profundamente como aquela área já funciona.

Antes de propor ou alterar algo, você DEVE obrigatoriamente procurar:
* Implementações existentes e fluxos correlatos;
* Componentes, hooks, contexts e stores relacionados;
* Services, domain functions, repositories e clients;
* Schemas de validação, types TypeScript e interfaces;
* Endpoints de API, migrations, constraints de banco de dados;
* Testes automatizados existentes e fixtures;
* Regras de negócio vigentes no módulo.

### O agente deve responder internamente antes de agir:
1. **Onde essa responsabilidade já está implementada?**
2. **Existe código equivalente ou reaproveitável?**
3. **Qual é a Fonte Única de Verdade (Single Source of Truth)?**
4. **Qual camada arquitetural deve receber a mudança?**
5. **O que depende dessa estrutura e o que pode quebrar?**

> [!CAUTION]
> **É EXPRESSAMENTE PROIBIDO** criar uma implementação paralela ou duplicada simplesmente porque foi mais fácil ou rápido do que localizar a implementação existente no projeto.

---

# 0.1. Fluxo Obrigatório de Desenvolvimento (Ciclo de 9 Etapas)

Toda tarefa de engenharia no Morante Hub segue obrigatoriamente o ciclo disciplinado:

```text
1. INVESTIGAR           (Localizar código, dependências e fontes da verdade)
       ↓
2. ENTENDER             (Compreender o fluxo atual e regras de domínio)
       ↓
3. IDENTIFICAR CAUSA    (Separar Sintoma → Causa Imediata → Causa Raiz)
       ↓
4. PLANEJAR             (Definir a menor alteração arquiteturalmente correta)
       ↓
5. IMPLEMENTAR          (Escrever código limpo, tipado e com alta coesão)
       ↓
6. VALIDAR              (Verificar contratos, tipagem TypeScript e lints)
       ↓
7. TESTAR               (Executar testes unitários, integração e E2E)
       ↓
8. REVISAR REGRESSÕES   (Auditar impactos colaterais nos fluxos vizinhos)
       ↓
9. CONCLUIR             (Atender aos 17 itens do Checklist Operacional)
```

> [!WARNING]
> Uma tarefa **NUNCA** deve ser considerada concluída apenas porque:
> - O código compilou;
> - Não apareceu erro visível de TypeScript;
> - Apenas um teste isolado passou;
> - A tela abriu sem crash;
> - A API retornou status HTTP 200.
> 
> **Conclusão real significa**: O comportamento solicitado funciona perfeitamente E todos os comportamentos e integrações relacionados continuam funcionando com integridade.

---

# 0.2. Princípios de Engenharia de Software

Aplique estes princípios com discernimento e bom senso prático (sem dogmatismo mecânico):

* **SOLID**:
  - *Single Responsibility*: Uma única razão para mudar por arquivo/função.
  - *Open/Closed*: Extensível sem alterar contratos consolidados.
  - *Liskov Substitution*: Subtipos respeitam contratos dos tipos base.
  - *Interface Segregation*: Interfaces pequenas e específicas; clientes não dependem do que não usam.
  - *Dependency Inversion*: Módulos de alto nível dependem de abstrações/contratos, não de detalhes voláteis de infraestrutura.
* **KISS (Keep It Simple, Stupid)**: A solução mais simples que resolve o problema com robustez é sempre superior a uma arquitetura engenhosa e complexa.
* **DRY com Moderação (Don't Repeat Yourself)**: Evite duplicação de regras de negócio essenciais, mas prefira pequena duplicação temporária a uma abstração prematura acoplada e incorreta.
* **YAGNI (You Aren't Gonna Need It)**: Não implemente recursos para "casos futuros hipotéticos" que não foram solicitados.
* **Separation of Concerns & Camadas Claras**: Separação nítida entre UI, Use Cases, Domínio e Infraestrutura.
* **Single Source of Truth (SSOT)**: Cada dado ou regra crítica de negócio possui um único local canônico de cálculo e armazenamento.
* **Composition over Inheritance**: Componha pequenas funções e componentes em vez de criar hierarquias profundas de herança ou classes base infladas.
* **Explicit over Implicit**: Fluxos de dados, parâmetros e retornos devem ser transparentes e rastreáveis; sem variáveis mágicas ou mutações invisíveis.
* **Fail Fast & Defensive Programming**: Valide argumentos nas fronteiras imediatamente; impeça dados corrompidos de trafegarem pelo sistema.
* **Imutabilidade**: Trate snapshots, históricos e estados de UI como imutáveis, evitando mutações diretas que causam bugs de concorrência ou re-render fantasma.

---

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

Acima de 200 linhas ou infração real de Responsabilidade Única / Código Limpo:
Analisar modularização e consultar o usuário.
```

**Regra Estrita de Consulta ao Usuário**:
> SOMENTE perguntar ao usuário sobre implementação de código limpo, responsabilidade única e modularização se o arquivo **realmente infringir responsabilidade única, código limpo ou ultrapassar 200 linhas**. Arquivos pequenos, coesos e bem estruturados (ex: < 150–200 linhas) NÃO devem gerar perguntas repetitivas ao usuário.

Não criar divisões artificiais apenas para obedecer ao número de linhas.

Um arquivo com 120 linhas e uma responsabilidade clara é melhor que cinco arquivos de 25 linhas altamente acoplados.

Mas arquivos grandes (> 200 linhas ou com acúmulo de responsabilidades) não devem permanecer apenas por comodidade.

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

---

# 25. Protocolo de Chamada On-Demand (Roadmap & Lote de 3 Arquivos)

Quando o usuário pedir explicitamente a limpeza, modularização ou refatoração do código:

1. **Mapeamento e Roadmap de Prioridades**:
   - O agente analisa o projeto e gera um **Roadmap de Prioridades** listando os arquivos que mais precisam de modularização (priorizando arquivos > 200 linhas ou com acúmulo de responsabilidades).

2. **Execução em Lote de 3 Arquivos**:
   - O agente seleciona e realiza a refatoração modular segura de **no máximo 3 arquivos por vez**.
   - Aplica a estratégia estrita: `COPIAR → VALIDAR → CONECTAR → TESTAR → REMOVER`.

3. **Pausa Interativa e Proteção de Contexto**:
   - Ao concluir o lote de 3 arquivos, o agente faz uma pausa e pergunta ao usuário:
     > *"Concluí a modularização de 3 arquivos do roadmap ([Arquivos refatorados]). Deseja que eu prossiga com os próximos 3 arquivos da lista?"*
   - Isso evita o esgotamento da janela de contexto e mantém cada etapa 100% testada e auditável pelo usuário.

---

# 26. Camadas Arquiteturais e Separação de Responsabilidades

O Morante Hub segue a separação canônica de quatro camadas:

```text
1. Interface com Usuário (UI)
   └── Componentes React, telas, páginas, modais, formulários, formatação de apresentação.
       ↓
2. Aplicação / Casos de Uso (Application / Use Cases)
   └── Hooks orquestradores, fluxos de checkout, coordenação de etapas, mutações compostas.
       ↓
3. Domínio e Regras de Negócio (Domain / Business Rules)
   └── Funções puras de cálculo (CMPM, CMV, frete, descontos, regras fiscais, validadores).
       ↓
4. Infraestrutura (Infrastructure)
   └── Supabase, clientes de banco, Gemini API, Google Maps, storage, WhatsApp API, Webhooks.
```

- **Isolamento de Infraestrutura**: Frameworks e bibliotecas externas de infraestrutura NUNCA devem ditar ou se misturar diretamente com as regras centrais de negócio.
- **Direção de Dependência**: A UI depende de Use Cases e Domínio; o Domínio NUNCA depende da UI.

---

# 27. Fonte Única da Verdade (Single Source of Truth - SSOT)

Regras vitais e cálculos críticos NUNCA devem existir duplicados em múltiplos pontos do sistema.
Especialmente:
* **Estoque e Movimentações**: O estoque é apurado pelo saldo de movimentações atômicas no banco de dados.
* **Custos, CMPM e CMV**: O cálculo do CMPM vigente e a materialização do CMV em vendas possuem regra única centralizada em [regras-de-negocio-erp](file:///c:/Users/Rosilene/Desktop/morantehub/.agents/skills/regras-de-negocio-erp/SKILL.md).
* **Preços, Descontos e Condições Comerciais**: Devem ser validados por serviços centrais, nunca recalculados informalmente na interface.
* **Status de Pedidos e Entregas**: Transições de status são governadas por máquinas de estado no backend/services.

> [!IMPORTANT]
> Antes de implementar qualquer regra ou cálculo, procure a Fonte da Verdade existente. Se encontrar duplicação histórica, planeje a convergência segura sem quebra de compatibilidade.

---

# 28. TypeScript Rigoroso e Contratos de Dados

O TypeScript deve ser utilizado como ferramenta de garantia de segurança em tempo de compilação, e não como obstáculo a ser burlado:

- **Proibido `any` e `as any`**: O uso de `any` ou type assertion cego (`as any`) para silenciar o compilador é expressamente vetado. Use tipos explícitos ou `unknown` com asserção/type guard seguro.
- **Proibido `@ts-ignore` Leviano**: `@ts-ignore` ou `@ts-expect-error` só é admissível em situações extremas de incompatibilidade de bibliotecas de terceiros, obrigatoriamente acompanhado de comentário explicando o porquê.
- **Proibido Tornar Campos Opcionais sem Razão**: Nunca adicione `?` a propriedades essenciais apenas para fazer a chamada compilar; trate o valor ausente explicitamente.
- **Preferir Unions Discriminadas**: Use propriedades discriminadoras (ex: `type: 'EXPENSE' | 'INCOME'` ou `status: 'ready' | 'needs_input'`) para tornar estados inválidos impossíveis de serem representados.

---

# 29. Princípio de Zero Trust para Dados Externos

Nunca confie cegamente em dados provenientes de:
* Entradas do usuário (formulários, inputs, cliques);
* Parâmetros de URL, query strings ou rotas;
* `localStorage` ou `sessionStorage`;
* Respostas de APIs externas ou webhooks;
* Retornos de modelos de IA (Gemini, ChatGPT);
* Arquivos enviados para upload.

**Regra Operacional**: Todos os dados externos devem ser validados e sanitizados nas fronteiras antes de serem propagados para os serviços internos e o banco de dados.

---

# 30. Operações Críticas, Concorrência e Idempotência

Para operações que alteram saldo, geram débitos/créditos, movimentam estoque ou emitem notas fiscais:
- **Idempotência Obrigatória**: O reenvio de uma mesma requisição (por retry de rede, clique duplo do usuário ou instabilidade de sinal no app mobile) NUNCA pode duplicar uma venda, transação financeira ou baixa de estoque. Utilize identificadores de idempotência (`clientTransactionId`, `testRunId`, etc.).
- **Atomicidade e Transações**: Operações compostas (ex: concluir pedido + movimentar estoque + gerar contas a receber) devem executar em transação atômica (`db.transaction`). Se uma etapa falhar, o estado anterior deve ser preservado integralmente.
- **Proteção contra Duplo Clique**: Interfaces de confirmação devem desabilitar botões imediatamente ao primeiro clique (`submitting: true`) até a conclusão ou erro da operação.

---

# 31. Engenharia de Frontend

* **Componentes Focados**: Cada componente deve possuir uma responsabilidade visual e interativa clara.
* **Regra de Negócio Fora do JSX**: O JSX deve ser expressivo e declarativo, evitando cálculos pesados de CMV, formatações complexas ou filtros em linha dentro do `return`.
* **Estado Derivado Prioritário**: Antes de declarar um novo `useState`, pergunte: *"Esse valor pode ser derivado diretamente de props ou de outro estado existente?"*. Evite sincronização de estados redundantes.
* **Uso Criterioso de `useEffect`**: Evite usar `useEffect` para transformar dados ou reagir a ações do usuário. Prefira handlers orientados a eventos (`onClick`, `onChange`) ou valores derivados com `useMemo`.
* **Estados de Interface Completos**: Toda tela ou lista assíncrona deve prever de forma elegante: *Loading State* (esqueleto/spinner), *Error State* (aviso recuperável com botão de tentar novamente) e *Empty State* (ilustração e mensagem instrutiva quando não houver dados).

---

# 32. Engenharia de Backend e Banco de Dados

* **Autoridade Estrita no Backend**: Validações de permissão, cálculos de preço final, saldos e regras fiscais NUNCA devem confiar no frontend. A segurança reside no servidor.
* **Integridade Referencial no Banco**: Modificações em tabelas devem respeitar PKs, FKs, constraints de unicidade (`UNIQUE`), defaults consistentes e índices adequados para consultas de alta frequência.
* **Migrações Compatíveis**: Alterações de schema devem ser aditivas e compatíveis com a versão anterior do código em produção, garantindo zero downtime.

---

# 33. Segurança, Performance e Observabilidade

* **Segurança Contínua**: Validação contra injeções SQL, XSS, vazamento de credenciais e exposição indevida de dados sensíveis em logs ou clientes web. Secrets e chaves privadas pertencem exclusivamente ao ambiente seguro do servidor.
* **Performance Consciente**: Evite consultas N+1, polling agressivo sem debounce, re-renders desnecessários de componentes de listas e transporte de payloads gigantes de dados não consumidos pela interface.
* **Cache com Invalidação Deliberada**: Nunca adicione cache em memória ou storage sem ter uma estratégia clara e testada de invalidação e atualização.
* **Observabilidade Útil**: Emita logs estruturados com contexto suficiente (IDs de correlação, duração e códigos de erro) para facilitar diagnósticos em produção, sem jamais logar senhas, tokens ou dados pessoais sensíveis.

---

# 34. Tratamento Deliberado de Erros

> [!CAUTION]
> **É PROIBIDO O USO DE `try { ... } catch {}` VAZIO OU SILENCIOSO.**
> Todo bloco de captura de erro DEVE:
> 1. Tratar o erro de forma deliberada e recuperável;
> 2. Fornecer feedback claro e acionável ao operador;
> 3. Ou registrar o erro estruturado para observabilidade quando for uma falha inesperada.

---

# 35. Escopo Controlado, Nomenclatura e Dependências

* **Menor Alteração Arquiteturalmente Correta**: Não use tarefas pequenas como pretexto para reescrever áreas não relacionadas, mas nunca use "escopo mínimo" como desculpa para introduzir gambiarras técnicas.
* **Nomenclatura que Revela Intenção**: Nomes de variáveis, funções e componentes devem refletir a linguagem ubíqua do negócio (ex: `calculateMovingAverageCost`, `reverseStockMovement`). Evite nomes vagos como `data`, `info`, `obj`, `temp`, `item2`, `doStuff`, `handleThing`.
* **Cuidado com Dependências**: Antes de instalar qualquer biblioteca externa via `npm`, verifique se o projeto já possui utilitário nativo equivalente. Evite inchar o bundle com pacotes desnecessários.

---

# 36. Hierarquia Universal de Decisão

Quando houver múltiplos caminhos de implementação possíveis para uma mesma funcionalidade, utilize rigorosamente a seguinte escala de prioridade:

```text
1.  CORREÇÃO                  (O comportamento solicitado deve funcionar perfeitamente)
2.  SEGURANÇA                  (Sem brechas, vazamento de dados ou permissões burláveis)
3.  INTEGRIDADE DOS DADOS      (Sem corrupção de estoque, financeiro ou histórico)
4.  CLAREZA                    (Código autoexplicativo, legível para outros desenvolvedores)
5.  SIMPLICIDADE               (KISS — a solução mais simples que resolve com robustez)
6.  MANUTENIBILIDADE           (Fácil de evoluir, modular e desacoplado)
7.  CONSISTÊNCIA ARQUITETURAL  (Alinhado aos padrões e convenções já adotados no projeto)
8.  TESTABILIDADE              (Fácil de cobrir por testes unitários e de integração)
9.  PERFORMANCE                (Rápido e eficiente, sem otimização prematura)
10. CONVENIÊNCIA DO AGENTE     (A última consideração — NUNCA escolha uma solução frágil só porque foi mais rápida de codificar)
```

---

# 37. Checklist Operacional Pré-Conclusão (17 Itens)

Antes de declarar qualquer tarefa como concluída, o agente DEVE responder internamente:

- [ ] 1. **Investigação**: Entendi profundamente a implementação e o fluxo existente antes de editar?
- [ ] 2. **Anti-Duplicação**: Procurei código existente antes de criar um novo arquivo ou função?
- [ ] 3. **SSOT**: A Fonte Única da Verdade foi respeitada sem duplicar regras de negócio?
- [ ] 4. **Camadas**: A responsabilidade foi alocada na camada correta (UI vs Caso de Uso vs Domínio vs Infra)?
- [ ] 5. **Anti-Complexidade**: Não introduzi abstração desnecessária (KISS/YAGNI)?
- [ ] 6. **TypeScript Seguro**: Não usei `any`, `as any`, casts cegos nem `@ts-ignore` leviano?
- [ ] 7. **Zero Trust**: Entradas de formulário, APIs externas e retornos de IA foram validados nas fronteiras?
- [ ] 8. **Segurança**: Permissões e regras críticas estão validadas no backend/services?
- [ ] 9. **Idempotência**: Operações de mutação crítica estão protegidas contra duplo clique e reenvios?
- [ ] 10. **Erros**: Não deixei blocos de `catch` vazios e garanti feedback útil ao operador?
- [ ] 11. **Performance**: Não introduzi renderizações redundantes, loops caros ou chamadas de API duplicadas?
- [ ] 12. **Causa Raiz**: O problema foi corrigido na causa raiz e não apenas no sintoma com um patch local?
- [ ] 13. **Testes Unitários**: O comportamento alterado está coberto por testes automatizados?
- [ ] 14. **Casos de Borda**: Cenários de valor nulo, vazio, cancelado e limites numéricos foram verificados?
- [ ] 15. **Anti-Regressão**: Os fluxos correlatos e as suítes de testes vizinhas continuam passando 100% verdes?
- [ ] 16. **Retrocompatibilidade**: A alteração respeita dados e históricos legados sem quebrar exibições?
- [ ] 17. **Simplicidade Final**: O código ficou limpo, compreensível e natural para outro desenvolvedor ler?


