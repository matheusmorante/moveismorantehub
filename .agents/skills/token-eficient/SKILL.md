name: token-efficient
description: Reduz o consumo de tokens e contexto durante tarefas de desenvolvimento. Use quando estiver trabalhando em projetos de código e quiser minimizar leituras, respostas, análises e chamadas de ferramentas desnecessárias sem comprometer a correção.
Token Efficient Development
Objetivo

Trabalhar com o menor consumo possível de tokens e contexto, mantendo qualidade, segurança e correção.

Regra principal

Não leia, analise ou modifique nada que não seja necessário para concluir a tarefa atual.

Contexto
Não faça varredura completa do projeto sem necessidade.
Não abra arquivos grandes inteiros quando uma busca localizada for suficiente.
Procure primeiro por nomes de funções, componentes, classes, rotas, imports e referências.
Leia somente os trechos relevantes.
Não reabra arquivos que já foram analisados e não foram alterados.
Não repita informações já obtidas durante a tarefa.
Não carregue documentação extensa se a tarefa puder ser resolvida com conhecimento local.
Busca

Antes de abrir arquivos:

Identifique o símbolo ou comportamento relevante.
Faça uma busca direcionada.
Abra somente os arquivos relacionados.
Expanda o contexto apenas se necessário.

Prefira:

busca por nome de função;
busca por componente;
busca por rota;
busca por erro;
busca por import;
busca por referência.

Evite:

listar todo o projeto;
abrir dezenas de arquivos;
ler arquivos não relacionados;
analisar dependências sem necessidade.
Alterações
Faça a menor alteração necessária.
Não refatore código não relacionado à tarefa.
Não altere arquitetura sem necessidade.
Não reformate arquivos inteiros sem motivo.
Não substitua implementações funcionais apenas por preferência de estilo.
Evite criar novos arquivos quando um existente resolve o problema.
Debugging

Ao encontrar um erro:

Identifique a causa provável.
Localize o código responsável.
Leia somente o contexto necessário.
Faça uma alteração pequena.
Verifique o resultado.
Pare quando o problema estiver resolvido.

Não faça múltiplas alterações especulativas ao mesmo tempo.

Testing
Execute somente os testes relevantes.
Se existir um teste específico para a funcionalidade alterada, priorize-o.
Não execute toda a suíte sem necessidade.
Depois de uma alteração pequena, faça uma verificação pequena.
Faça testes mais amplos somente quando houver risco de regressão.
Ferramentas

Use ferramentas somente quando agregarem informação necessária.

Evite chamadas redundantes.

Antes de executar uma ferramenta, pergunte internamente:

"Preciso realmente desse resultado para concluir a tarefa?"

Se a resposta for não, não execute.

Código
Não reproduza código inteiro na resposta.
Mostre apenas trechos necessários quando precisar explicar.
Não adicione comentários óbvios.
Não gere documentação automaticamente.
Não gere exemplos extras sem solicitação.
Não crie abstrações prematuras.
Comunicação

Responda de forma curta e objetiva.

Não:

repita a solicitação do usuário;
explique conceitos óbvios;
descreva cada linha modificada;
produza longos resumos;
liste arquivos que não foram afetados.

Prefira:

Alterado

resumo curto da mudança.

Verificado

teste ou validação realizada.

Problemas

somente se houver algum.
Planejamento

Para tarefas simples:

não produza um plano longo;
execute diretamente.

Para tarefas complexas:

faça um plano curto;
execute por etapas;
mantenha apenas o contexto necessário para a etapa atual.
Regras de parada

Pare quando:

a tarefa estiver concluída;
o teste relevante passar;
o erro estiver resolvido;
não houver mais alteração necessária.

Não continue procurando melhorias não solicitadas.

Prioridade

Em caso de conflito, siga esta ordem:

Correção
Segurança
Requisitos do usuário
Testabilidade
Economia de tokens
Melhorias opcionais

Nunca economize tokens sacrificando correção ou segurança.