---
name: safe-refactor
description: Restructure code while preserving behavior. Use for extraction, consolidation, ownership moves, or cleanup where verification must bracket structural edits e obedece regras estritas de reauditoria.
---

# Safe refactor

Define behavior-preservation boundary and establish verification before structural edits.

- Keep feature changes outside refactor.
- Move one ownership boundary at a time.
- Preserve public interfaces, failure behavior, ordering, and compatibility unless explicitly scoped.
- Keep intermediate states buildable and testable.
- Avoid dependency or configuration growth without correctness need.

Run same proof after change. Stop when behavior matches and requested structure is achieved.

---

# REGRAS DE AUDITORIA E REFATORAÇÃO DE CLEAN CODE

As regras abaixo são OBRIGATÓRIAS durante a refatoração. A tarefa não está concluída apenas porque o código editado passou nos testes ou porque os arquivos solicitados foram limpos. O ciclo deve ser: **auditar → corrigir → reauditar → provar que não ficaram violações relevantes**.

## 1. AUDITORIA DEVE SER GLOBAL DENTRO DO ESCOPO
Faça uma varredura em todos os arquivos relevantes daquele escopo. Não limite a análise aos arquivos inicialmente mencionados pelo usuário. A tarefa não pode ser marcada como concluída enquanto violações estruturais importantes ainda permanecerem sem avaliação (ex: se um God Hook estiver oculto no mesmo módulo, você deve identificá-lo).

## 2. CRITÉRIOS OBJETIVOS DE REFATORAÇÃO
- **God Hooks e God Components**: Separe apenas quando houver fronteiras reais de responsabilidade.
- **Funções excessivamente grandes**: Extraia responsabilidades quando melhorar legibilidade, teste, isolamento e manutenção. Investigar também blocos com muitos parâmetros posicionais.
- **UI não é Infra**: Remova SQL, chamadas HTTP complexas e regras de persistência de dentro de Hooks/Componentes de UI.
- **Regras de Domínio**: Mova validações fiscais e de negócio para camadas de domínio, evitando duplicação.
- **Não aplique SOLID de forma cega**: Abstraia apenas se facilitar o teste, reduzir acoplamento ou eliminar duplicação real. Não faça overengineering.
- **Sem limites de linha cego**: Não divida arquivos apenas para diminuir LOC. Analise coesão e complexidade em vez de apenas quantidade de linhas.
- **Evite refatoração cosmética**: Não mova código se isso apenas transferir a complexidade sem melhorar a arquitetura (ex: criar dezenas de mini-arquivos interdependentes).
- **Tratamento de Erros e Estado**: Revise hooks com dependências entrelaçadas, `useEffect` que faz trabalho demais e erros que são silenciosamente engolidos.

## 3. PRESERVAR COMPORTAMENTO SEMPRE
A refatoração não pode alterar silenciosamente regra fiscal, financeira, de estoque ou permissões. Primeiro preserve o comportamento, depois melhore a estrutura.

## 4. EXECUTAR TESTES
Depois das alterações, execute os testes relevantes (typecheck, lint, unitários). Não declare sucesso se testes falharem pelas alterações.

## 5. REAUDITORIA OBRIGATÓRIA ANTES DE CONCLUIR
Esta regra é **crítica**. Depois de terminar a refatoração: **AUDITE NOVAMENTE TODO O ESCOPO ORIGINAL.**
Não declare a refatoração "concluída" apenas porque os testes rodaram. Você deve responder:
- Ainda existe God Hook no escopo?
- Ainda existe God Component?
- Alguma função concentra responsabilidades independentes?
- Infraestrutura continua dentro da UI?
Se houver, continue a refatoração.

## 6. RELATÓRIO FINAL HONESTO
Ao final da refatoração, não forneça frases vazias como "A arquitetura está perfeita". Produza um relatório indicando:
1. Alterações realizadas e os novos limites de responsabilidade;
2. Arquivos criados/movidos;
3. Problemas resolvidos;
4. **Resultados da reauditoria final**;
5. Problemas restantes e dívida técnica não resolvida;
6. Evidência da validação (quais testes/verificações rodaram).
