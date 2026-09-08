---
name: eficiencia-dados-egress
description: Diretrizes obrigatórias de eficiência de dados, prevenção contra Egress excessivo no Supabase/APIs, paginação server-side com suporte a filtros/pesquisa/ordenação sem sacrificar interface, lazy loading de JSONs e segurança em testes E2E.
---

# PROMPT — CRIAR/ATUALIZAR SKILL PERMANENTE DE EFICIÊNCIA DE DADOS, EGRESS E CONSULTAS

Crie ou atualize uma Skill permanente do projeto responsável por orientar qualquer implementação que envolva:

- banco de dados;
- Supabase;
- APIs;
- consultas;
- listagens;
- paginação;
- pesquisa;
- filtros;
- ordenação;
- Realtime;
- Storage;
- Edge Functions;
- integrações;
- mobile;
- ERP;
- dashboards;
- relatórios;
- agentes/IA;
- testes automatizados;
- Playwright/E2E;
- sincronizações;
- carregamento de arquivos.

Essa Skill deve ser considerada obrigatoriamente sempre que código novo ou existente puder gerar leitura, transferência ou sincronização de dados.

O objetivo é impedir que o projeto volte a gerar Egress desnecessário, mantendo ao mesmo tempo 100% das funcionalidades e informações necessárias ao usuário.

==================================================
1. PRINCÍPIO CENTRAL
==================================================

A regra principal é:

TRANSFERIR SOMENTE OS DADOS NECESSÁRIOS PARA EXECUTAR CORRETAMENTE A FUNCIONALIDADE.

Isso NÃO significa esconder dados do usuário.

Significa evitar transferir dados que naquele momento não são necessários.

A otimização deve ocorrer principalmente na forma como os dados são:

- consultados;
- filtrados;
- paginados;
- transferidos;
- reutilizados;
- atualizados.

Nunca economizar Egress sacrificando funcionalidade.

==================================================
2. INTERFACE E FUNCIONALIDADE SÃO INEGOCIÁVEIS
==================================================

Nenhuma otimização de Egress pode, por conta própria:

- remover coluna;
- remover campo;
- remover informação;
- esconder valor;
- remover status;
- remover badge;
- remover imagem necessária;
- remover ação;
- remover botão;
- remover filtro;
- remover pesquisa;
- remover ordenação;
- alterar paginação visível;
- alterar regra de negócio;
- prejudicar edição;
- prejudicar impressão;
- prejudicar exportação;
- prejudicar detalhes;
- prejudicar relatórios;
- mudar comportamento esperado pelo usuário.

Se hoje uma listagem mostra:

- código;
- data;
- cliente;
- valor;
- vendedor;
- status;
- agendamento;
- indicadores;
- ações;

ela deve continuar mostrando essas informações depois da otimização.

A interface existente é a referência funcional.

Otimização de backend NÃO é autorização para simplificar a interface.

==================================================
3. PRIMEIRO SUSPEITO: PAGINAÇÃO
==================================================

Sempre que houver uma listagem, verificar PRIMEIRO:

"Quantos registros a interface mostra?"

e:

"Quantos registros o banco está realmente retornando?"

Exemplo:

A interface mostra:

30 pedidos.

A consulta não deve buscar:

2.000 pedidos

para posteriormente executar algo semelhante a:

slice(0, 30)

no frontend.

Isso continua transferindo 2.000 registros.

A paginação deve ocorrer preferencialmente no banco/API.

Exemplo conceitual Supabase:

Página 1:

.range(0, 29)

Página 2:

.range(30, 59)

Página 3:

.range(60, 89)

etc.

Se a tela mostra 30 registros, normalmente devem ser transferidos apenas os registros necessários para aquela página.

Quando o usuário mudar de página, buscar a nova página.

NÃO carregar antecipadamente milhares de registros apenas porque o usuário poderá eventualmente navegar até eles.

==================================================
4. ISSO VALE PARA TODAS AS LISTAGENS
==================================================

Aplicar esse raciocínio a:

- pedidos;
- produtos;
- clientes;
- pessoas;
- fornecedores;
- recebimentos;
- notas;
- contas;
- transações;
- movimentações;
- logs;
- usuários;
- estoque;
- financeiro;
- relatórios;
- agenda;
- qualquer outra coleção.

Porém:

NÃO modificar todas essas telas automaticamente.

Aplicar quando estiver criando, alterando ou auditando a funcionalidade correspondente.

Não realizar uma refatoração global sem necessidade.

==================================================
5. PAGINAÇÃO DEVE FUNCIONAR JUNTO COM PESQUISA
==================================================

Muito cuidado ao transformar paginação client-side em server-side.

Se atualmente o sistema carrega 2.000 registros e pesquisa localmente, simplesmente reduzir a resposta para 30 registros QUEBRA a pesquisa.

Exemplo:

Existem:

5.000 produtos.

A página atual possui:

30 produtos.

O produto:

"Guarda-Roupa Monza"

está entre os registros que anteriormente corresponderiam à posição 3.847.

O usuário pesquisa:

"Guarda-Roupa Monza"

O sistema PRECISA encontrá-lo.

Não pesquisar somente nos 30 registros carregados.

Fluxo correto:

PESQUISA
↓
BANCO/API
↓
FILTROS
↓
ORDENAÇÃO
↓
PAGINAÇÃO
↓
RESULTADOS

A consulta deve encontrar registros dentro do conjunto completo permitido e somente depois retornar a página correspondente.

==================================================
6. FILTROS DEVEM SER COMPATÍVEIS COM PAGINAÇÃO
==================================================

O mesmo vale para:

- status;
- cliente;
- vendedor;
- fornecedor;
- categoria;
- período;
- datas;
- situação;
- origem;
- tipo;
- qualquer filtro existente.

Não aplicar filtros somente aos 30 registros atuais quando semanticamente o filtro deve atuar sobre todos os registros.

Quando apropriado:

FILTRO
↓
BANCO
↓
RESULTADOS FILTRADOS
↓
PAGINAÇÃO

==================================================
7. ORDENAÇÃO TAMBÉM DEVE SER GLOBAL
==================================================

Se o usuário ordenar por:

- data;
- valor;
- cliente;
- código;
- status;
- nome;
- preço;

não ordenar apenas os 30 registros atuais se o comportamento esperado for ordenar o conjunto completo.

Preferencialmente:

FILTRO
+
PESQUISA
+
ORDER BY
+
PAGINAÇÃO

devem compor a mesma consulta server-side quando isso for necessário para preservar a semântica da tela.

==================================================
8. CONTAGEM NÃO EXIGE CARREGAR TODOS OS REGISTROS
==================================================

Se a interface precisa mostrar:

847 resultados

ou:

Página 1 de 29

não carregar 847 objetos apenas para contar.

Utilizar mecanismos apropriados de count do banco/API.

Exemplo conceitual:

count: 'exact'

quando realmente necessário.

O sistema pode receber:

30 registros

+

total: 847

sem transferir os 847 objetos.

==================================================
9. NÃO USAR SELECT('*') AUTOMATICAMENTE
==================================================

Não adotar:

select('*')

como padrão para qualquer consulta.

Antes de definir os campos, verificar exatamente quais dados a funcionalidade utiliza.

Preferir projeções explícitas quando isso reduzir significativamente o payload.

Exemplo:

.select(`
  id,
  order_number,
  customer_name,
  total_value,
  status,
  created_at
`)

PORÉM:

Nunca remover um campo da consulta simplesmente porque parece desnecessário.

Antes, procurar onde ele é utilizado:

- componente;
- hook;
- filtro;
- formatter;
- modal;
- botão;
- edição;
- impressão;
- exportação;
- cálculo;
- regra de negócio;
- mobile;
- integração.

A redução de campos deve ser baseada em evidência.

==================================================
10. SELECT('*') NÃO É PROIBIDO ABSOLUTAMENTE
==================================================

Pode existir situação em que o registro completo seja necessário.

Portanto, não criar regra cega proibindo `select('*')`.

Ele pode ser utilizado quando:

- todos ou praticamente todos os campos são necessários;
- quantidade de registros é pequena;
- trata-se de detalhe de um registro;
- o payload é pequeno;
- existe justificativa técnica.

A Skill deve ensinar raciocínio, não criar proibições irracionais.

==================================================
11. LISTAGEM E DETALHES SÃO COISAS DIFERENTES
==================================================

Uma listagem normalmente precisa de menos informações que a tela de detalhes.

Exemplo:

LISTA DE PEDIDOS

Pode precisar:

id
código
cliente
data
agendamento
valor
status
vendedor
indicadores

DETALHES DO PEDIDO

Pode precisar:

itens
pagamentos
entrega
endereço
observações
histórico
JSON completo
dados fiscais
etc.

Não carregar necessariamente todos os detalhes de 30, 100 ou 2.000 pedidos apenas porque eventualmente o usuário poderá abrir um deles.

Quando o usuário abrir determinado pedido, buscar os dados necessários daquele pedido.

Isso é lazy loading de DADOS.

Não é remoção de funcionalidade.

==================================================
12. CUIDADO ESPECIAL COM JSON
==================================================

Campos como:

order_data
metadata
payload
history
raw_response
configuration

podem conter grandes quantidades de informação.

Uma única coluna JSON pode representar mais tráfego que dezenas de colunas simples.

Antes de incluir JSON grande em uma listagem, verificar se aquela tela realmente precisa dele.

Se apenas o detalhe precisa:

LISTA
→ dados resumidos

CLIQUE NO PEDIDO
→ carregar JSON necessário

==================================================
13. NÃO DUPLICAR CONSULTAS
==================================================

Antes de criar:

getOrders()
fetchOrders()
loadOrders()
queryOrders()

verificar se os dados já estão disponíveis.

Evitar:

Tela
→ busca orders

Componente A
→ busca orders novamente

Componente B
→ busca orders novamente

Resumo
→ busca orders novamente

Modal
→ busca todos novamente

Quando apropriado, reutilizar:

- estado;
- hook;
- cache;
- store;
- provider;
- serviço existente;
- resultado da consulta atual.

Mas NÃO introduzir arquitetura complexa apenas para evitar uma pequena consulta.

==================================================
14. POLLING DEVE SER JUSTIFICADO
==================================================

Antes de implementar:

setInterval(..., 10000)

perguntar:

O dado realmente precisa atualizar a cada 10 segundos?

Avaliar:

- atualização manual;
- atualização após ação;
- refetch ao focar;
- intervalo maior;
- Realtime;
- atualização localizada.

Não criar polling agressivo por conveniência.

==================================================
15. REALTIME NÃO DEVE CAUSAR REFETCH GIGANTE
==================================================

Se um único pedido mudar, evitar:

EVENTO REALTIME
↓
BUSCAR NOVAMENTE 2.000 PEDIDOS

Quando apropriado:

EVENTO
↓
ATUALIZAR REGISTRO AFETADO

ou:

EVENTO
↓
REFETCH DA PÁGINA ATUAL

Porém preservar o comportamento funcional esperado.

==================================================
16. PRODUTOS E RELAÇÕES
==================================================

Não carregar automaticamente todas as relações em toda listagem.

Evitar sem necessidade:

select(`
  *,
  product_variations(*),
  product_images(*),
  product_categories(*, categories(*))
`)

Se o card precisa:

- nome;
- preço;
- estoque;
- imagem principal;
- status;

buscar o necessário.

Quando abrir o produto, buscar:

- imagens completas;
- variações;
- categorias;
- demais detalhes;

se necessário.

IMPORTANTE:

Não remover imagens ou informações atualmente mostradas.

Otimizar a consulta, não a experiência.

==================================================
17. AGENDA E INTERVALOS TEMPORAIS
==================================================

Calendários e agendas devem buscar o intervalo necessário para construir corretamente a visualização.

Exemplo:

Se a interface está mostrando setembro:

buscar o período necessário para setembro e eventuais dias adicionais que a interface precise exibir.

Se mudar para outubro:

buscar outubro.

Não buscar automaticamente todo o histórico de pedidos desde o início da empresa quando a tela não precisa disso.

Mas também não limitar arbitrariamente o período e fazer eventos desaparecerem.

A interface define a necessidade.

==================================================
18. IA E RESUMOS
==================================================

Agentes e resumos de IA também devem respeitar eficiência.

Antes de buscar todos os pedidos:

verificar se:

- os dados já estão carregados;
- existe período solicitado;
- existe filtro;
- pode agregar no banco;
- pode limitar os registros;
- precisa realmente do JSON completo.

Isso reduz simultaneamente:

- Egress;
- tokens;
- latência;
- custo da IA.

==================================================
19. TESTES PODEM USAR O BANCO REAL
==================================================

REGRA IMPORTANTE DESTE PROJETO:

NÃO assumir que testes sempre possuem:

- banco local;
- Supabase local;
- servidor interno;
- ambiente isolado.

Nem sempre será possível executar dessa forma.

Os testes PODEM utilizar o banco/Supabase utilizado pelo sistema quando necessário.

Portanto:

NÃO bloquear automaticamente Playwright, E2E ou outros testes apenas porque estão apontando para o banco real.

NÃO exigir `local-test` como condição absoluta para execução.

NÃO criar uma proteção que simplesmente impeça qualquer teste contra o Supabase real.

==================================================
20. TESTES NO BANCO REAL DEVEM SER CONTROLADOS
==================================================

O fato de testes poderem utilizar o banco real NÃO significa que podem desperdiçar recursos ou manipular dados indiscriminadamente.

Quando testes utilizarem esse ambiente:

- criar somente registros necessários;
- identificar dados criados pelo teste;
- modificar somente dados apropriados;
- limpar somente dados criados pelo próprio teste quando seguro;
- evitar leitura completa de tabelas;
- utilizar filtros;
- utilizar paginação;
- utilizar limites;
- evitar loops;
- evitar milhares de requests;
- evitar polling desnecessário;
- evitar execução paralela descontrolada;
- não excluir dados legítimos;
- não alterar registros reais aleatoriamente.

Um teste não recebe permissão para gerar Egress ilimitado só porque é teste.

==================================================
21. TESTES DE LISTAGENS DEVEM RESPEITAR PAGINAÇÃO
==================================================

Se um teste precisa verificar:

"o pedido apareceu na listagem"

não é necessário buscar 2.000 pedidos repetidamente.

O teste deve reproduzir o comportamento normal e eficiente da aplicação.

Testes devem ajudar a detectar consultas ineficientes, não mascará-las.

==================================================
22. NÃO SUPERENGENHEIRAR
==================================================

Esta é uma regra fundamental.

Ao encontrar Egress elevado:

NÃO refatorar imediatamente toda a arquitetura.

NÃO adicionar automaticamente:

- Redis;
- nova store;
- nova biblioteca;
- RPC;
- views;
- materialized views;
- novo schema;
- cache complexo;
- nova camada de serviços;
- sincronização offline;
- nova infraestrutura.

Primeiro resolver o problema mais simples comprovado.

==================================================
23. ORDEM PADRÃO DE INVESTIGAÇÃO
==================================================

Quando houver consumo elevado em uma listagem, investigar nesta ordem:

1. Quantos registros estão sendo buscados?

2. Quantos realmente aparecem?

3. Existe paginação server-side?

4. Pesquisa e filtros estão sendo feitos antes da paginação?

5. Existe `select('*')` trazendo dados grandes?

6. Existe JSON grande?

7. Existem consultas duplicadas?

8. Existe refetch desnecessário?

9. Existe polling?

10. Realtime está causando consultas grandes?

11. Existem arquivos/imagens desnecessários?

12. Só depois considerar mudanças arquiteturais maiores.

==================================================
24. PRINCÍPIO 80/20
==================================================

Priorizar as correções que entregam maior redução de Egress com menor risco.

Exemplo real do tipo de problema que esta Skill deve evitar:

A interface mostra:

30 pedidos.

O sistema busca:

2.000 pedidos completos.

Antes de inventar cache, RPC, mudança de schema ou nova arquitetura:

CORRIGIR PARA:

Banco
↓
filtro/pesquisa
↓
ordenação
↓
30 registros necessários
↓
frontend

Depois:

MEDIR NOVAMENTE.

Talvez essa única correção elimine a maior parte do problema.

==================================================
25. OTIMIZAÇÃO DEVE SER INCREMENTAL
==================================================

Fluxo obrigatório:

IDENTIFICAR
↓
MEDIR
↓
CORRIGIR A CAUSA MAIS PROVÁVEL
↓
TESTAR
↓
MEDIR NOVAMENTE
↓
DECIDIR SE OUTRA ALTERAÇÃO É NECESSÁRIA

Nunca:

EGRESS ALTO
↓
REFATORAR TUDO

==================================================
26. NÃO COPIAR "BOAS PRÁTICAS" CEGAMENTE
==================================================

Uma técnica utilizada em outro sistema não deve ser implementada automaticamente neste projeto.

Antes de adicionar qualquer solução, perguntar:

"Qual problema concreto desta aplicação isso resolve?"

Se não existir resposta clara:

NÃO implementar.

A Skill deve favorecer:

- simplicidade;
- manutenção;
- evidência;
- medição;
- menor risco;
- menor complexidade.

==================================================
27. EVITAR N+1
==================================================

Evitar:

buscar 30 pedidos
↓
30 consultas de cliente
↓
30 consultas de vendedor
↓
30 consultas de pagamento

Isso pode transformar uma página em dezenas ou centenas de requests.

Quando apropriado utilizar:

- relações;
- joins;
- consultas em lote;
- agregações;
- recursos equivalentes do banco.

Novamente:

não superengenheirar quando o problema não existe.

==================================================
28. PESQUISA NÃO DEVE DISPARAR REQUEST DESCONTROLADO
==================================================

Se pesquisa acontece enquanto o usuário digita, considerar debounce quando apropriado.

Exemplo conceitual:

300–500 ms.

Não é uma regra absoluta.

Se a interface utiliza botão "Pesquisar", preservar o comportamento existente.

==================================================
29. CANCELAR OU IGNORAR CONSULTAS OBSOLETAS
==================================================

Quando o usuário muda rapidamente:

- página;
- filtro;
- pesquisa;
- período;

evitar que respostas antigas sobrescrevam resultados novos.

Quando apropriado, cancelar ou ignorar requests obsoletos.

Isso também ajuda a evitar consultas redundantes.

==================================================
30. CACHE SOMENTE QUANDO FIZER SENTIDO
==================================================

Cache não é solução automática para Egress.

Antes de adicionar cache:

verificar se simplesmente corrigir:

- paginação;
- limite;
- filtros;
- campos;

já resolve.

Cache pode ser apropriado para:

- categorias;
- configurações;
- dados pouco mutáveis;
- parâmetros;
- permissões;
- listas estáticas.

Mas deve existir justificativa.

==================================================
31. CUIDADO COM useEffect
==================================================

Sempre verificar se hooks estão causando chamadas repetidas.

Exemplo perigoso:

useEffect(() => {
  loadData()
}, [data])

quando `loadData()` modifica `data`.

Isso pode gerar:

- loop;
- múltiplas consultas;
- Egress elevado;
- bugs.

Também verificar Strict Mode e comportamentos de desenvolvimento antes de concluir que existe duplicação em produção.

==================================================
32. NÃO FAZER REQUEST DURANTE RENDERIZAÇÃO
==================================================

Chamadas de rede não devem ser disparadas diretamente pelo processo de renderização de um componente de forma que cada render gere nova consulta.

==================================================
33. RELATÓRIOS E AGREGAÇÕES
==================================================

Se a interface precisa apenas:

- quantidade de pedidos;
- total vendido;
- ticket médio;
- total por vendedor;
- total por categoria;

avaliar se faz sentido calcular no banco.

Não baixar milhares de objetos completos apenas para executar:

reduce()

no frontend quando uma agregação pequena resolveria.

==================================================
34. BANCO PEQUENO NÃO SIGNIFICA EGRESS PEQUENO
==================================================

Nunca usar tamanho do banco como argumento de que Egress será pequeno.

Exemplo:

Banco = 65 MB

Se os mesmos dados forem transferidos 100 vezes:

≈ 6,5 GB

O problema pode estar na FREQUÊNCIA DE LEITURA.

Sempre considerar:

TAMANHO DO PAYLOAD
×
QUANTIDADE DE CHAMADAS
×
QUANTIDADE DE USUÁRIOS

==================================================
35. PENSAR EM ESCALA SEM PREMATURAMENTE OTIMIZAR
==================================================

Ao implementar algo, considerar:

4 usuários
40 usuários
400 usuários
4.000 usuários

Perguntar:

"Essa consulta continuará razoável?"

Porém:

não construir arquitetura para 4.000 usuários se não existe necessidade atual.

O objetivo é evitar erros óbvios de escala, não fazer otimização prematura.

==================================================
36. VALIDAÇÃO VISUAL OBRIGATÓRIA
==================================================

Ao otimizar uma consulta que alimenta interface existente:

ANTES:

registrar o comportamento e, quando útil, screenshots.

DEPOIS:

comparar.

Garantir:

mesmas colunas
mesmos campos
mesmos valores
mesmos status
mesmos filtros
mesma pesquisa
mesma ordenação
mesmas ações
mesmas possibilidades de navegação
mesmas informações necessárias

A otimização não pode causar regressão visual ou funcional.

==================================================
37. TESTAR CASOS QUE PAGINAÇÃO COSTUMA QUEBRAR
==================================================

Ao mudar paginação, obrigatoriamente testar:

- página 1;
- página intermediária;
- última página;
- troca de quantidade por página, se existir;
- pesquisa por registro fora da página atual;
- filtro que retorna registros fora da página atual;
- combinação de filtros;
- ordenação;
- alteração de registro;
- exclusão;
- criação;
- atualização Realtime, se existir;
- retorno para página anterior;
- contagem total;
- estado vazio.

Especialmente:

Pesquisar um registro que NÃO estava entre os registros originalmente carregados na página atual.

Ele deve ser encontrado corretamente.

==================================================
38. MEDIR ANTES E DEPOIS
==================================================

Quando estiver corrigindo problema de Egress, registrar quando tecnicamente viável:

ANTES:

- número de requests;
- número de registros;
- campos retornados;
- tamanho aproximado do payload;
- frequência;
- tempo.

DEPOIS:

as mesmas métricas.

Exemplo:

ANTES:
2.000 pedidos
payload X MB

DEPOIS:
30 pedidos
payload Y KB

Não declarar que uma otimização resolveu o problema sem alguma evidência quando a medição for possível.

==================================================
39. NÃO OTIMIZAR O QUE NÃO É O PROBLEMA PRINCIPAL
==================================================

Se a auditoria demonstrar que:

95% do problema vem de uma listagem carregando milhares de registros,

não gastar primeiro tempo modificando uma consulta de poucos KB executada uma vez.

Ordenar problemas por:

IMPACTO ESTIMADO
×
FREQUÊNCIA
×
FACILIDADE DE CORREÇÃO
×
RISCO DE REGRESSÃO

Priorizar maior benefício com menor risco.

==================================================
40. CHECKLIST PARA NOVA FEATURE
==================================================

Antes de considerar concluída uma feature que acessa dados:

[ ] Quantidade de registros buscada é razoável?
[ ] Existe limite?
[ ] Precisa de paginação?
[ ] Paginação está no backend quando necessário?
[ ] Pesquisa funciona sobre o conjunto completo?
[ ] Filtros funcionam sobre o conjunto completo?
[ ] Ordenação continua correta?
[ ] Campos retornados são necessários?
[ ] Existe JSON grande desnecessário?
[ ] Existe consulta duplicada?
[ ] Existe polling desnecessário?
[ ] Realtime gera refetch grande?
[ ] Existem N+1 queries?
[ ] Arquivos/imagens carregados são necessários?
[ ] Testes não geram tráfego absurdo?
[ ] Interface permanece completa?
[ ] Nenhuma funcionalidade foi removida?
[ ] A solução é simples o suficiente?
[ ] Foi evitado superengineering?

==================================================
41. CHECKLIST DE CODE REVIEW
==================================================

Ao revisar código de acesso a dados, procurar explicitamente por:

select('*')
getAll
fetchAll
loadAll
limit(1000+)
range muito grande
order_data
metadata
payload
JSON grande
setInterval
Realtime
useEffect
queries dentro de loops
queries dentro de map
requests durante render
consultas duplicadas
tabelas completas
Storage
imagens completas em listagens
testes repetitivos

A presença desses padrões NÃO significa automaticamente que existe erro.

Significa:

INVESTIGAR.

==================================================
42. REGRA DE NÃO REGRESSÃO
==================================================

Uma otimização só pode ser considerada concluída quando:

1. a funcionalidade continua correta;

2. a interface continua apresentando tudo que precisa;

3. pesquisa continua correta;

4. filtros continuam corretos;

5. ordenação continua correta;

6. paginação continua correta;

7. detalhes continuam acessíveis;

8. ações continuam funcionando;

9. testes relevantes passam;

10. o consumo foi reduzido ou existe evidência técnica clara da melhoria.

==================================================
43. REGRA FINAL DA SKILL
==================================================

O objetivo nunca é:

"gastar o mínimo possível de Egress a qualquer custo".

O objetivo é:

FUNCIONALIDADE CORRETA
+
INTERFACE COMPLETA
+
CONSULTAS PROPORCIONAIS À NECESSIDADE
+
MENOS DADOS DESNECESSÁRIOS
+
MENOS REQUESTS DESNECESSÁRIOS
+
BOA ESCALABILIDADE
+
CÓDIGO SIMPLES E MANUTENÍVEL

Sempre preferir:

"buscar exatamente o necessário"

em vez de:

"buscar tudo por garantia"

ou:

"buscar pouco e quebrar a funcionalidade".

==================================================
44. INSTRUÇÃO PARA O AGENTE
==================================================

Esta Skill deve influenciar NOVAS IMPLEMENTAÇÕES e ALTERAÇÕES FUTURAS.

Não utilize a existência desta Skill como autorização para refatorar todo o projeto imediatamente.

Quando estiver trabalhando em uma funcionalidade:

1. entenda o comportamento atual;
2. preserve a interface;
3. identifique como os dados são utilizados;
4. procure desperdícios óbvios;
5. corrija primeiro paginação, limites, filtros e projeções quando forem o problema;
6. teste;
7. meça;
8. somente avance para soluções mais complexas se ainda houver necessidade.

Se encontrar uma oportunidade de otimização fora do escopo da tarefa atual que exija mudança relevante de arquitetura ou possa causar regressão:

NÃO altere silenciosamente.

Registre a descoberta e apresente a recomendação separadamente.

==================================================
45. LIÇÃO ARQUITETURAL DESTE PROJETO
==================================================

Este projeto já apresentou situação em que poucas pessoas utilizando o sistema foram capazes de gerar vários GB de Egress porque determinadas telas podiam buscar grandes quantidades de registros completos apesar de exibirem apenas uma pequena página.

Essa classe de problema não deve voltar a ser introduzida.

Sempre que implementar uma listagem, pense:

"Se existem 100.000 registros no banco e a tela mostra 30, quantos registros esta requisição transfere?"

A resposta ideal normalmente deve estar próxima de:

30

e não:

100.000.

Mas os 30 resultados precisam continuar contendo TODAS as informações necessárias para reproduzir corretamente a interface atual.

E pesquisa, filtros e ordenação precisam continuar funcionando sobre o conjunto correto de dados.

Essa é a filosofia permanente desta Skill.
