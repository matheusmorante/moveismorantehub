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

## Encerramento

Informe cenários executados, resultados, bugs e correções. Em bateria persistente, informe explicitamente o `testRunId`, se o cleanup foi validado e qualquer resíduo que não pôde ser removido com segurança.
