---
name: arquitetura-agente-gemini
description: Diretrizes obrigatórias para criação, alteração, testes e evolução do Agente Conversacional Gemini no ERP e Mobile, garantindo Function Calling, contexto real e proibição de parsers heurísticos como cérebro.
---

# SKILL: Arquitetura do Agente Gemini do ERP

Esta skill define as regras obrigatórias para qualquer criação, alteração, correção ou expansão relacionada ao agente de IA Gemini utilizado no ERP e aplicativos associados.

O objetivo é manter uma arquitetura consistente, segura, testável e baseada em compreensão semântica do modelo, evitando o retorno gradual de parsers, regex e heurísticas manuais.

---

## 1. PRINCÍPIO CENTRAL

O Gemini é responsável por:

* compreender linguagem natural;
* identificar intenção;
* compreender contexto;
* interpretar correções do usuário;
* decidir quais ferramentas utilizar;
* preencher argumentos das ferramentas;
* escolher quando consultar dados;
* continuar raciocínio após respostas das tools;
* formular resposta natural.

O ERP é responsável por:

* dados;
* autenticação;
* autorização;
* validação;
* regras de negócio;
* integridade;
* persistência;
* execução de operações;
* segurança.

Nunca inverter essas responsabilidades.

---

## 2. ARQUITETURA OBRIGATÓRIA

Toda funcionalidade de IA deve seguir conceitualmente:

Usuário
↓
Frontend
↓
Backend/API
↓
Camada do Agente Gemini
├── instruções
├── contexto da conversa
├── definições das tools
├── loop de tool calling
└── resposta do modelo
↓
Tools
↓
Services do ERP
↓
Validações e permissões
↓
Repositories/ORM
↓
Banco de dados

Nunca permitir:

Gemini → SQL → Banco

Nunca permitir:

Gemini → alteração direta do banco

Nunca permitir:

Frontend → Gemini → operação sensível sem passar pelo backend.

---

## 3. NÃO USAR PARSER COMO CÉREBRO

É proibido implementar compreensão de linguagem natural principalmente através de:

* regex;
* palavras-chave;
* listas de sinônimos;
* if/else para descobrir intenção;
* classificação manual por palavras;
* parsing manual de frases;
* extração manual de valor monetário;
* identificação manual de datas em linguagem natural;
* identificação manual de entrada/saída pela frase;
* mapeamento direto de palavras para categoria.

Exemplo proibido:

if texto.includes("gasolina") {
categoria = "combustível"
}

Exemplo correto:

Gemini interpreta o texto
↓
consulta categorias reais
↓
seleciona uma categoria disponível
↓
tool executa operação.

Regex e parser continuam permitidos para funções técnicas legítimas, como:

* protocolo HTTP;
* validação de formato;
* IDs;
* schemas;
* serialização;
* sanitização;
* parsing técnico.

A proibição é especificamente contra usar essas técnicas para substituir a compreensão de linguagem natural.

---

## 4. FUNCTION CALLING / TOOL CALLING

Sempre que o agente precisar consultar ou alterar o ERP, preferir Function Calling / Tool Calling.

Não utilizar o Gemini apenas como:

texto → JSON → JSON.parse → lógica manual.

Structured Output deve ser usado quando o objetivo real for produzir dados estruturados como saída.

Function Calling deve ser usado quando o objetivo for interagir com capacidades do ERP.

---

## 5. TOOLS

Toda tool deve representar uma capacidade real do sistema.

Evitar tools genéricas como:

execute()
executeAction()
saveData()
queryDatabase()
runCommand()

Preferir:

buscarMovimentacoesFinanceiras()
buscarCategoriasFinanceiras()
criarMovimentacaoFinanceira()
alterarMovimentacaoFinanceira()
buscarCliente()
buscarFornecedor()
buscarProduto()
buscarEntrega()

Os nomes acima são exemplos.

Sempre analisar os services e entidades existentes antes de criar novas tools.

---

## 6. TOOLS NÃO CONTÊM REGRA DUPLICADA

Uma tool deve ser uma camada fina entre Gemini e aplicação.

Exemplo:

Gemini
↓
criarMovimentacaoFinanceira()
↓
FinancialService.createMovement()
↓
validação/regra existente
↓
repository

Não duplicar dentro da tool:

* cálculo;
* regra financeira;
* permissão;
* regra de estoque;
* regra fiscal;
* lógica de entrega;
* regra de preço;

se já existir service responsável.

---

## 7. DESCRIÇÕES DAS TOOLS

Toda tool deve informar ao Gemini:

* o que faz;
* quando usar;
* quando não usar;
* significado de cada argumento;
* campos obrigatórios;
* campos opcionais;
* enums possíveis;
* limitações.

A descrição da tool faz parte da inteligência do agente.

Não criar descrições vagas.

Ruim:

"Cria um registro."

Bom:

"Cria uma movimentação financeira após os dados obrigatórios terem sido identificados. Utilize apenas para entradas ou saídas financeiras válidas. Não utilize para transferência entre contas caso o ERP possua uma operação específica para transferência."

---

## 8. IDs NUNCA SÃO INVENTADOS

O Gemini nunca pode inventar:

* clienteId;
* fornecedorId;
* categoriaId;
* produtoId;
* contaId;
* movimentacaoId;
* entregaId;
* usuárioId;
* qualquer outro identificador persistido.

Se precisar de um registro existente, deve consultar uma tool apropriada.

Dados persistidos pertencem ao ERP.

---

## 9. CONTEXTO CONVERSACIONAL

Preservar contexto de conversa utilizando o mecanismo recomendado pela versão atual da API Gemini adotada pelo projeto.

Não substituir contexto real por dezenas de estados manuais como:

pendingAction
waitingValue
waitingCategory
waitingCustomer
previousIntent
waitingConfirmation

Estados explícitos são permitidos apenas quando representam um estado real do fluxo da aplicação e são necessários para segurança ou persistência.

Não usá-los para simular compreensão de conversa.

O agente deve compreender naturalmente sequências como:

Usuário:
"Registra 300 de combustível."

Assistente:
"Qual veículo?"

Usuário:
"Fiorino."

ou:

Usuário:
"Foi 300."

Usuário:
"Na verdade, 350."

ou:

Usuário:
"Foi hoje."

Usuário:
"Não, ontem."

---

## 10. SYSTEM INSTRUCTION

Manter uma instrução central do agente.

Ela pode definir:

* papel do agente;
* conceitos do ERP;
* comportamento esperado;
* regras semânticas;
* segurança;
* uso das tools;
* quando perguntar;
* quando confirmar;
* proibição de inventar dados.

Não colocar nela grandes volumes de dados dinâmicos.

Não inserir listas enormes de:

* clientes;
* produtos;
* categorias;
* movimentações;
* entregas;

se esses dados podem ser consultados por tools.

---

## 11. FONTE DA VERDADE

A fonte factual de verdade é sempre o ERP.

O Gemini não deve assumir que algo existe apenas porque foi mencionado.

Quando necessário, consultar.

Exemplo:

Usuário:
"Coloca no João."

Se houver vários registros compatíveis:

consultar ERP.

Se continuar ambíguo:

perguntar ao usuário.

Nunca escolher aleatoriamente.

---

## 12. AMBIGUIDADE

O agente deve evitar perguntas desnecessárias.

Se uma informação puder ser descoberta de forma segura consultando o ERP, consulte primeiro.

Pergunte somente aquilo que realmente não pode ser inferido ou descoberto com segurança.

Não transformar o chat em formulário.

---

## 13. VALIDAÇÃO

Toda entrada criada pelo Gemini deve ser considerada não confiável até ser validada.

O backend deve validar:

* schema;
* tipo;
* enum;
* valor;
* existência de IDs;
* autorização;
* permissões;
* estado atual;
* regra de negócio.

O Gemini interpreta.

O backend valida.

---

## 14. OPERAÇÕES DE ESCRITA

Toda operação que altera dados deve passar pelos mesmos services e regras utilizadas pelo restante do sistema.

IA não recebe tratamento privilegiado.

Se um usuário não poderia executar determinada ação pela interface tradicional, também não deve conseguir executá-la por meio do agente.

---

## 15. CONFIRMAÇÃO

Não confirmar tudo.

Utilizar confirmação proporcional ao risco.

Possíveis critérios:

* destrutivo;
* irreversível;
* alto impacto;
* alto valor;
* exclusão;
* cancelamento;
* alteração sensível;
* operação que afeta terceiros.

Operações simples e reversíveis não devem gerar fricção desnecessária.

Seguir as políticas reais definidas para o projeto.

---

## 16. LOOP DE TOOL CALLING

Implementar chamadas encadeadas corretamente.

Exemplo:

Mensagem
↓
Gemini solicita tool A
↓
executar A
↓
resultado retorna ao Gemini
↓
Gemini solicita B
↓
executar B
↓
resultado retorna
↓
Gemini conclui

Adicionar proteção contra:

* loops infinitos;
* chamadas repetidas;
* número excessivo de ferramentas;
* tool inexistente;
* argumentos inválidos.

---

## 17. ERROS DAS TOOLS

Preferir respostas estruturadas.

Exemplo conceitual:

{
success: false,
code: "NOT_FOUND",
message: "...",
recoverable: true
}

O agente deve poder determinar se deve:

* tentar outra consulta;
* corrigir argumentos;
* perguntar ao usuário;
* encerrar;
* informar erro.

Não expor stack trace ou erro interno ao usuário final.

---

## 18. LINGUAGEM NATURAL

O agente deve aceitar linguagem real dos operadores, incluindo:

* português informal;
* erros de digitação;
* transcrição de áudio;
* frases curtas;
* abreviações;
* correções;
* referências anteriores;
* números escritos por extenso;
* datas relativas.

Não adicionar regra específica para cada variação linguística.

---

## 19. TESTES

Toda alteração importante no agente deve incluir testes.

Separar:

### Testes determinísticos

Testar:

* tools;
* services;
* schemas;
* permissões;
* erros;
* validações;
* tool executor.

### Testes com Gemini real

Manter smoke/integration tests separados.

Testar conversas naturais.

Não validar texto idêntico.

Validar:

* tool escolhida;
* intenção correta;
* argumentos;
* sequência de tools;
* contexto;
* ausência de IDs inventados;
* comportamento diante de ambiguidade.

---

## 20. REGRESSÕES

Sempre que um bug de compreensão for encontrado, antes de adicionar código manual pergunte:

"Isso é uma falha de regra do ERP ou uma falha de compreensão semântica?"

Se for compreensão semântica:

avaliar primeiro:

* system instruction;
* descrição da tool;
* schema da tool;
* contexto;
* exemplo relevante;
* modelo utilizado;

antes de criar parser ou regex.

Toda correção de bug deve ganhar um teste de regressão.

---

## 21. OBSERVABILIDADE

Registrar informações suficientes para investigar comportamento.

Em ambiente apropriado registrar:

* request/conversation ID;
* modelo;
* tool calls;
* parâmetros;
* resultados;
* duração;
* erros;
* quantidade de iterações;
* tokens/custo quando disponível.

Respeitar privacidade e evitar armazenamento desnecessário de informações sensíveis.

---

## 22. CUSTO E TOKENS

Não enviar todo o ERP ao Gemini.

Dar ao agente:

* instruções estáveis;
* histórico necessário;
* tools;
* resultados específicos das consultas.

Se uma tool retornar centenas de registros, implementar paginação, busca ou filtro.

Não despejar milhares de registros no contexto esperando que o modelo encontre algo.

---

## 23. NÃO CRIAR MULTI-AGENT PREMATURAMENTE

Por padrão, utilizar um agente com várias ferramentas.

Criar múltiplos agentes somente quando houver necessidade arquitetural concreta.

Não criar:

FinanceAgent
ProductAgent
DeliveryAgent
CustomerAgent
RouterAgent
SupervisorAgent

apenas porque o framework permite.

Complexidade deve ser justificada.

---

## 24. MODELO GEMINI

Antes de alterar integrações relevantes, verificar a documentação oficial atual do Gemini.

Não assumir que:

* endpoint antigo;
* SDK antigo;
* modelo antigo;
* gerenciamento de sessão antigo;

continua sendo a recomendação atual.

Preferir APIs estáveis/recomendadas para novos desenvolvimentos.

---

## 25. ALTERAÇÕES NO AGENTE

Antes de implementar qualquer mudança relevante:

1. analisar a arquitetura existente;
2. identificar a causa;
3. verificar se existe service reutilizável;
4. verificar se a mudança pertence à IA ou ao ERP;
5. implementar com menor acoplamento possível;
6. criar/atualizar testes;
7. testar regressões.

Nunca corrigir um problema adicionando uma camada de workaround sem investigar sua origem.

---

## 26. REGRA DE DECISÃO

Sempre utilizar esta pergunta:

"Estou programando uma regra real do negócio ou estou programando manualmente uma tentativa de compreender português?"

Se for regra de negócio:

implementar no sistema.

Se for compreensão de português:

deixar o modelo interpretar sempre que for seguro.

---

## 27. OBJETIVO FINAL

O agente deve parecer uma interface natural para as capacidades existentes do ERP.

O operador deve poder falar normalmente:

"Paguei 200 de combustível."

"Na verdade foram 230."

"Foi ontem."

"Quanto gastamos de combustível esse mês?"

"Mostra as saídas de ontem."

"Aquele lançamento que fiz agora está errado."

O sistema deve compreender o contexto, utilizar dados reais e executar através das ferramentas apropriadas.

O código não deve precisar antecipar todas as formas possíveis que uma pessoa pode usar para dizer a mesma coisa.

---

## 28. AO FINAL DE QUALQUER ALTERAÇÃO

Antes de declarar a tarefa concluída, verificar:

* Foi adicionado algum parser desnecessário?
* Foi adicionada regex para compreender linguagem?
* Alguma regra de negócio foi colocada no prompt?
* Alguma tool está genérica demais?
* O Gemini consegue inventar algum ID?
* Existe validação no backend?
* As permissões continuam sendo respeitadas?
* O contexto funciona?
* Existem testes de regressão?
* Uma tool está duplicando um service?
* Dados dinâmicos estão sendo enviados desnecessariamente ao prompt?
* Há logs suficientes para investigar erros?

Se qualquer resposta indicar problema arquitetural, corrigir antes de concluir.
