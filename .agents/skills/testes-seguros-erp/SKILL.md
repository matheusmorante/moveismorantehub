---
name: testes-seguros-erp
description: Planeje e execute testes seguros do ERP em alterações de regras de negócio, banco, estoque, vendas, recebimentos, devoluções, custos, relatórios ou integrações, sem tocar dados reais.
---

# Testes seguros do ERP

Use esta skill sempre que a mudança puder alterar regras de negócio, persistência ou efeitos entre módulos. Para alterações estritamente visuais, aplique-a somente se houver dúvida razoável sobre efeito comportamental.

## Regra de ouro

Teste regras reais do ERP com dados isolados, reproduzíveis e descartáveis. Nunca use, edite, cancele ou tente restaurar registros reais/preexistentes como massa de teste.

Priorize testes de integração da camada de serviço, regras de negócio, unidades, invariantes, idempotência e concorrência quando aplicável. Use browser/E2E apenas para fluxos estratégicos; a interface não é prova suficiente de uma regra crítica.

## Camada e armazenamento adequados

Escolha a camada mais simples capaz de provar corretamente o comportamento:

| Necessidade | Execução e dados |
| --- | --- |
| Cálculo, validação, total, CMV, custo médio ou transição determinística | Teste unitário totalmente em memória. |
| Regra que depende de porta/repositório, mas não de SQL | Fake, mock ou repositório em memória. |
| Query, constraint, relação, transação, migration, atomicidade ou concorrência | PostgreSQL/Supabase exclusivo de testes. |
| Fluxo completo entre módulos | Aplicação e banco de testes; poucos cenários. |
| Comportamento de interface realmente crítico | E2E/browser, de forma estratégica. |

Não use localStorage para simular PostgreSQL/Supabase. Ele só pode ser testado quando a funcionalidade real usar localStorage.

## Segurança para dados persistentes

Antes de qualquer teste que grave dados:

1. Confirme que o ambiente não é produção. Prefira banco dedicado de testes; em seguida, ambiente local/dev isolado. Se não for possível confirmar, não execute teste destrutivo.
2. Gere um `testRunId` único, como `TESTE_ERP_20260831_220500_A7F92`, e o aplique em campos seguros existentes (nome, observação, descrição, referência ou código) em todos os registros criados.
3. Localize e remova somente resíduos inequivocamente marcados por execuções anteriores, respeitando dependências. Nunca apague algo apenas porque parece teste.
4. Prefira transação com rollback quando ela representar fielmente o fluxo. Caso contrário, use cleanup em `finally`/hooks e valide ao final que não há registros com o `testRunId`.

Cada teste cria seus próprios dados e não depende de ordem, de execução anterior ou de registros compartilhados. Use factories/fixtures que recebam o `testRunId` para impedir dados sem marcação.

Testes de integração devem usar PostgreSQL/Supabase de teste, não SQLite nem estruturas simplificadas que escondam diferenças relevantes. A suíte destrutiva deve exigir credenciais explicitamente destinadas a teste e abortar se elas estiverem ausentes ou apontarem para produção; nunca confiar apenas no nome de um arquivo `.env`.

## O que validar

Para toda funcionalidade nova ou correção, identifique regras tocadas, entidades alteradas e efeitos colaterais. Teste caminho feliz, erros, repetição/idempotência, cancelamento ou reversão quando aplicável e integração com módulos relacionados. Um retorno HTTP bem-sucedido não substitui a validação do estado final.

Para uma regressão, adicione teste que reproduza o defeito: ele deve falhar na implementação defeituosa e passar com a correção. Não altere um teste só para ocultar divergência; confirme a regra oficial e corrija teste ou implementação conforme ela.

### Estoque, CMPM e CMV

Quando envolver estoque, recebimento, vendas, devoluções, inventário, ajuste, cancelamento ou custo:

- valide efeitos de estoque e custo com valores controlados;
- execute a mesma ação duas vezes para provar que não duplica movimentos;
- compare o estado materializado (`stock`, `costPrice`) com o replay do histórico para a massa de teste;
- assegure que venda preserva custo médio unitário, recebe CMV da data do evento e que custo desconhecido não vira zero;
- cubra estoque zerado, correções históricas e devolução/cancelamento como eventos distintos;
- teste concorrência quando houver possibilidade de atualizações simultâneas.

Mantenha duas camadas: muitos cenários matemáticos em memória e poucos cenários completos no PostgreSQL de teste. Concorrência e transações exigem banco real de teste, pois mocks não revelam perdas de atualização.

Para pedidos de venda, cubra criação, itens cadastrados e temporários, agendamento, movimentação correspondente, cancelamento/estorno e vinculação posterior de item temporário, garantindo efeito uma única vez. Para relatórios, valide faturamento, CMV, lucro, margem e efeitos de devoluções/cancelamentos com dados conhecidos.

## Auditoria de integridade de estoque e relatórios

Use este protocolo complementar quando a solicitação envolver auditar, testar ponta a ponta ou corrigir a cadeia de estoque, CMPM/CMV ou relatórios de vendas. Ele não substitui as regras oficiais do ERP: antes de testar, leia `regras-de-negocio-erp` e o código efetivamente responsável pelos fluxos.

### Modos de execução

- **Auditoria de produção:** somente leitura. Pode comparar registros, movimentos, saldos materializados e relatórios existentes, mas nunca cria massa de teste, recalcula cache ou corrige dados reais.
- **Teste de integração:** usa exclusivamente banco de testes/local isolado, com `testRunId`, dados conhecidos e limpeza comprovada.
- **Correção:** acontece depois de localizar e explicar a causa. Corrija a regra ou a persistência necessária, adicione a regressão que reproduz o defeito e rode novamente toda a cadeia afetada. Não faça "correção" silenciosa de histórico de produção sem escopo e aprovação explícitos.

### Preparação e oráculo independente

1. Mapeie tabelas, serviços, status, constraints e origem de cada relatório; não invente campos ou transições.
2. Para cada SKU/variação de teste, comece com saldo e custo conhecidos e monte uma linha do tempo com data efetiva e critério de desempate existente no sistema.
3. Calcule fora da interface o esperado: quantidade, valor de estoque, CMPM, CMV por saída, faturamento, devolução e margem. Esse cálculo é o oráculo; não reutilize a mesma função sob teste para provar a própria regra.
4. Depois de cada evento, compare o esperado com `inventory_moves` efetivos, `stock`/`costPrice` materializados, histórico da tela e relatório. `inventory_moves` efetivos são a fonte de verdade; caches precisam coincidir com o replay.

### Matriz mínima de auditoria

| Evento | Evidência obrigatória |
| --- | --- |
| Recebimento | Uma entrada por item cadastrado, quantidade/custo/data corretos, saldo e CMPM atualizados. Criar o pedido de compra, por si só, não pode gerar entrada física. |
| Venda agendada ou atendida | Uma única saída por item cadastrado, com quantidade, vínculo e CMV materializado. Item temporário não ganha movimento artificial. |
| Repetição/reload/concorrência | Nenhuma entrada, saída, devolução ou ajuste duplicado; validar idempotência no banco, não apenas no botão. |
| Cancelamento | Estorna as saídas vinculadas e recompõe o saldo sem fingir uma devolução; histórico de auditoria permanece. |
| Devolução atendida | Cria uma única entrada para item cadastrado; a saída original continua existindo. Devolução agendada não movimenta. O custo de retorno usa o CMV histórico confiável da venda, nunca o custo atual. |
| Item temporário e reconciliação | O temporário não movimenta até haver referência operacional válida. Ao reconciliar venda/devolução já efetivada, valide a materialização histórica prevista pela regra oficial, sem duplicidade, com replay quando aplicável. |
| Inventário/ajuste | Diferença entre contagem física e saldo calculado gera ajuste único; movimentos de inventário confirmado são imutáveis. |

### Correções históricas de custo

Quando alterar custo, quantidade ou data efetiva de um recebimento/entrada passada, teste obrigatoriamente:

1. o replay cronológico determinístico somente do SKU/variação afetado;
2. o novo CMPM após cada evento posterior;
3. o CMV recalculado das saídas posteriores que dependem desse histórico;
4. `costPrice` e `stock` finais iguais ao replay;
5. pedidos, saídas e relatórios fora do SKU/período afetado inalterados.

Custo desconhecido é desconhecido: nunca substitua por zero apenas para fechar conta. Use tolerância decimal definida pelo domínio e informe qualquer arredondamento.

### Relatórios comerciais e operacionais

Valide as duas histórias sem misturá-las:

- estoque físico vem de movimentos válidos, estornos e ajustes;
- faturamento, devoluções, venda líquida, CMV, lucro e margem vêm dos registros comerciais e seus snapshots históricos.

Confirme que devolução reduz o resultado comercial mesmo quando um item não movimenta estoque, que cancelamento não é contado como devolução e que item temporário continua no faturamento. Compare totais, quantidades e agrupamentos com uma planilha/cálculo independente para a massa controlada.

### Registro de achados e correções

Para cada cenário, registre: `testRunId`, dados iniciais, eventos/data, movimentos esperados e encontrados, saldo/CMPM/CMV esperado e encontrado, totais de relatório, evidência técnica e resultado. Classifique como crítico quando houver duplicidade, divergência de saldo, CMV histórico alterado indevidamente ou divergência comercial.

Antes de corrigir, descreva comportamento atual, regra violada, causa provável e alcance. Após a correção, registre os arquivos/migrations alterados e execute o cenário que falhava mais regressões de recebimento, venda, devolução, cancelamento e relatório relacionadas.

## Encerramento

Informe cenários executados, resultados, bugs e correções. Em bateria persistente, informe explicitamente o `testRunId`, se o cleanup foi validado e qualquer resíduo que não pôde ser removido com segurança.
