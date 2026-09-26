---
name: principios-de-programacao
description: Engenharia de Software, SOLID, Código Limpo, Princípios de Programação, Clareza Arquitetural e Refatoração Segura. Garante arquivos coesos, responsabilidade única, código limpo, legível, intuitivo, contratos TypeScript estritos, eliminação de duplicidades e estratégias conservadoras de refatoração sem perda de lógica.
---

# Skill: Princípios de Programação, SOLID e Código Limpo

## Quando aplicar esta Skill
Aplicar quando a tarefa envolver:
- Criação, refatoração ou divisão de arquivos e componentes;
- Estruturação de camadas (UI → Application → Domain → Infrastructure);
- Modelagem de contratos TypeScript e interfaces;
- Tratamento de concorrência, idempotência e mutações de dados;
- Arquivos que acumulam múltiplas responsabilidades ou ferem o princípio da responsabilidade única.

## Quando NÃO aplicar
- Para dúvidas exclusivas de regras de negócio de estoque/custos (consultar `regras-de-negocio-erp`);
- Para queries e paginação de banco (consultar `database-supabase`).

---

## 1. Princípio Permanente Inviolável

> [!IMPORTANT]
> **"ANTES DE CRIAR, PROCURE. ANTES DE ALTERAR, ENTENDA. ANTES DE ABSTRAIR, JUSTIFIQUE. ANTES DE CONCLUIR, TESTE. ANTES DE DIZER QUE RESOLVEU, VERIFIQUE REGRESSÕES."**

Nenhum agente deve iniciar implementação sem primeiro investigar a arquitetura existente. É expressamente proibido criar implementações paralelas por comodidade.

---

## 2. Responsabilidade Única

Cada arquivo deve possuir uma responsabilidade principal clara, respondendo à pergunta:
> *"Qual é a responsabilidade única deste arquivo?"*

- **O tamanho não é medido por linhas**: A conformidade com a modularização e tamanho é garantida pelo estrito cumprimento do SOLID e do Código Limpo. Se o arquivo segue o Princípio da Responsabilidade Única (SRP), ele tem o tamanho correto.
- **Divisão**: Analisar divisão modular apenas quando houver infração real de responsabilidade.
- **Alertas**: Não devem ser gerados alertas ou perguntas repetitivas ao usuário com base puramente na contagem de linhas do arquivo.

---

## 3. Estratégia de Modularização Conservadora (Zero Perda de Lógica)

Modularização é uma operação sensível. Siga estritamente o fluxo:

```text
COPIAR → VALIDAR → CONECTAR → TESTAR → SÓ DEPOIS REMOVER
```

- Nunca recorte código antes de garantir que o novo módulo já compila e está funcionando;
- Mantenha total fidelidade das regras de negócio durante refatorações;
- Execute os testes automatizados da área antes e depois de cada extração.

---

## 4. Separação de Camadas Arquiteturais

O Morante Hub segue a separação canônica:

1. **Interface com Usuário (UI)**:
   - Componentes React puros, modais, formulários visuais e apresentação. O JSX deve ser declarativo, sem regras pesadas de negócio ou cálculos de CMV.
2. **Aplicação / Casos de Uso (Application / Use Cases)**:
   - Hooks orquestradores (ex: `useSalesOrderForm`), coordenação de fluxos e mutações compostas.
3. **Domínio e Regras de Negócio (Domain / Business Rules)**:
   - Funções puras de cálculo (CMPM, CMV, validações fiscais, frete). NUNCA dependem do React ou da UI.
4. **Infraestrutura (Infrastructure)**:
   - Clientes Supabase, chamadas à API do Google Maps, Gemini, mTLS SEFAZ e storage.

---

## 5. Contratos TypeScript Rigorosos e Zero Trust

- **Proibição de `any` e `as any`**: Use tipagem estrita ou `unknown` com type guards. Nunca mascare erros de tipagem com casts cegos.
- **Proibição de `@ts-ignore` leviano**: Permitido apenas em conflitos insuperáveis de bibliotecas terceiras, com comentário obrigatório.
- **Zero Trust em Dados Externos**: Entradas de formulários, query strings, retornos de IA e respostas de APIs devem ser validados e sanitizados nas fronteiras.
- **Tratamento Deliberado de Erros**:
  > [!CAUTION]
  > É terminantemente proibido o uso de `catch {}` vazio ou silencioso. Todo erro deve ser tratado, registrado ou reportado ao usuário.

---

## 6. Concorrência, Idempotência e Mutação Segura

- **Idempotência em Mutações**: Reenvios de requisições ou duplo clique do operador nunca podem duplicar movimentações de estoque, pedidos ou transações financeiras.
- **Botões com Bloqueio de Submissão**: Formulários e botões de ação devem desabilitar imediatamente ao primeiro clique (`isSubmitting: true`) até a conclusão.
- **Transações Atômicas**: Operações compostas devem ser atômicas via RPC Postgres ou transações no banco, garantindo rollback em caso de falha parcial.

---

## 7. Checklist Operacional Pré-Conclusão

Antes de concluir qualquer tarefa de engenharia, confirme mentalmente:

1. [ ] **Investigação**: Entendi a causa raiz e localizei os arquivos existentes antes de codificar?
2. [ ] **SSOT**: Respeitei a fonte canônica da regra sem duplicar lógica de negócio?
3. [ ] **Camadas**: A responsabilidade está na camada correta (UI vs Caso de Uso vs Domínio vs Infra)?
4. [ ] **Simplicidade**: A solução é simples, robusta e sem abstrações prematuras (KISS/YAGNI)?
5. [ ] **TypeScript**: O código compila sem erros, sem `any` desnecessário e sem supressões?
6. [ ] **Tratamento de Erro**: Não deixei blocos de `catch` vazios e garanti feedback amigável?
7. [ ] **Idempotência**: Operações críticas de salvamento possuem proteção contra duplo clique?
8. [ ] **Testes e Anti-Regressão**: Os testes existentes passaram e não foram mascarados?
