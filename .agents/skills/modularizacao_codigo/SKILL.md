---
name: modularizacao_codigo
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
- Auditoria de módulos, aplicação de Clean Code, SOLID ou redução de complexidade.

## Quando NÃO aplicar
- Para dúvidas exclusivas de regras de negócio de estoque/custos (consultar `regras-de-negocio-erp`);
- Para queries e paginação de banco (consultar `database-supabase`).

---

## 1. Princípio Permanente Inviolável

> [!IMPORTANT]
> **"ANTES DE CRIAR, PROCURE. ANTES DE ALTERAR, ENTENDA. ANTES DE ABSTRAIR, JUSTIFIQUE. ANTES DE CONCLUIR, TESTE. ANTES DE DIZER QUE RESOLVEU, VERIFIQUE REGRESSÕES."**

Nenhum agente deve iniciar implementação sem primeiro investigar a arquitetura existente. É expressamente proibido criar implementações paralelas por comodidade.

---

## 2. Separação de Camadas Arquiteturais

O Morante Hub segue a separação canônica:

1. **Interface com Usuário (UI)**: Componentes React puros, modais, formulários visuais e apresentação. O JSX deve ser declarativo, sem regras pesadas de negócio.
2. **Aplicação / Casos de Uso (Application / Use Cases)**: Hooks orquestradores, coordenação de fluxos e mutações compostas.
3. **Domínio e Regras de Negócio (Domain / Business Rules)**: Funções puras de cálculo. NUNCA dependem do React ou da UI.
4. **Infraestrutura (Infrastructure)**: Clientes Supabase, chamadas à API, mTLS SEFAZ e storage.

---

## 3. Contratos TypeScript e Zero Trust

- **Proibição de `any` e `as any`**: Use tipagem estrita ou `unknown` com type guards.
- **Tratamento Deliberado de Erros**: É terminantemente proibido o uso de `catch {}` vazio ou silencioso.

---

## 4. Concorrência, Idempotência e Mutação Segura

- **Idempotência**: Operações críticas de salvamento possuem proteção contra duplo clique.
- **Transações Atômicas**: Operações compostas devem ser atômicas via RPC Postgres ou transações no banco.

---

# REGRAS OBRIGATÓRIAS DE AUDITORIA E REFATORAÇÃO

O comportamento desta skill não pode considerar uma tarefa concluída apenas porque "aplicou Clean Code" nos arquivos citados ou porque os testes passaram. O comportamento deve ser: **auditar → corrigir → reauditar → provar que não ficaram violações relevantes**.

## 1. AUDITORIA DEVE SER GLOBAL DENTRO DO ESCOPO
Se o usuário pedir para corrigir um módulo, diretório, feature ou domínio inteiro, faça uma varredura em todos os arquivos relevantes daquele escopo. Não limite a análise aos arquivos inicialmente mencionados pelo usuário. A tarefa não pode ser marcada como concluída enquanto violações estruturais importantes ainda permanecerem sem avaliação.

## 2. CRITÉRIOS OBJETIVOS DE AUDITORIA
A skill deve procurar, no mínimo:
- **Arquivos excessivamente grandes**: Não usar número de linhas como regra absoluta, mas investigar arquivos acima de 300–400 linhas, hooks acima de 200–300 linhas, componentes gigantes.
- **God Hooks**: Detectar hooks que concentrem várias responsabilidades independentes (estado, banco, HTTP, validação, persistência, etc.). Separar por responsabilidade.
- **God Components**: Detectar componentes que misturem apresentação, consultas, mutations e domínio. Separar quando houver fronteiras reais de responsabilidade.
- **Funções excessivamente grandes**: Investigar funções extensas, muitos `if`, muitos retornos e vários efeitos colaterais.
- **Muitos parâmetros posicionais**: Se uma função possui muitos parâmetros (especialmente booleanos ou opcionais), preferir um objeto tipado.

## 3. SEPARAÇÃO DE RESPONSABILIDADES
Aplicar SRP de forma prática. Separar em pastas como `components/`, `hooks/`, `services/`, `domain/`, etc., somente quando houver responsabilidade concreta correspondente. Evitar `utils/tudo.ts` ou arquivos genéricos.

## 4. UI NÃO DEVE VIRAR CAMADA DE INFRAESTRUTURA
Auditar hooks e componentes procurando chamadas diretas ao banco (Supabase/SQL), manipulação direta de storage ou persistência complexa. Mover para services, repositories ou adapters. A UI coordena, não implementa a infraestrutura.

## 5. DOMÍNIO NÃO DEVE FICAR ESPALHADO NA UI
Regras de domínio (fiscais, financeiras, matriz, status) não devem existir apenas em componentes ou hooks. Mova ou reutilize funções de domínio apropriadas. Evite duplicação entre frontend e backend.

## 6. NÃO APLICAR SOLID DE FORMA MECÂNICA
Não criar abstrações apenas para afirmar que usou SOLID. Pergunte se a extração melhora a leitura, reduz acoplamento e facilita o teste. Evite overengineering.

## 7. NÃO USAR LIMITE DE LINHAS COMO REGRA CEGA
Não divida automaticamente um arquivo de 500 linhas. Analise coesão, responsabilidades e facilidade de teste. Um arquivo grande e altamente coeso pode permanecer.

## 8. EVITAR REFATORAÇÃO COSMÉTICA
É proibido mover código sem reduzir acoplamento, esconder God Object atrás de outro arquivo ou trocar complexidade local por imports circulares. A mudança deve melhorar a arquitetura real.

## 9. VERIFICAR ORGANIZAÇÃO DE ARQUIVOS E PASTAS
Analise nomes, localização das responsabilidades, arquivos em lugares incorretos, dependências circulares e helpers genéricos demais. Reorganize para melhorar fronteiras arquiteturais.

## 10. DETECTAR DUPLICAÇÃO SEM CRIAR ABSTRAÇÕES PREMATURAS
Procurar duplicação real de lógicas, validações e regras de domínio. Extrair somente quando a abstração possuir significado claro.

## 11. REVISAR TIPAGEM
Detectar `any`, casts excessivos, tipos duplicados e parâmetros booleanos obscuros. Corrigir quando possível sem mudar comportamento.

## 12. REVISAR EFEITOS E ESTADO REACT
Auditar hooks gigantes, `useEffect` fazendo trabalho demais, estados derivados armazenados desnecessariamente, duplicação de estado e efeitos com regras de persistência/domínio.

## 13. REVISAR TRATAMENTO DE ERROS
Detectar erros engolidos, somente `console.warn`, ou toasts usados como lógica de domínio. Separar erro técnico → domínio → mensagem para UI.

## 14. PRESERVAR COMPORTAMENTO
A refatoração não pode alterar regras fiscais, estoque, permissões ou comportamento sem justificativa. Preserve comportamento primeiro, melhore a estrutura depois.

## 15. EXECUTAR TESTES APÓS REFATORAÇÃO
Execute typecheck, lint, e os testes unitários/E2E relevantes disponíveis. Não declare sucesso se falharem por causa da alteração.

## 16. REAUDITORIA OBRIGATÓRIA
**Esta é uma regra crítica.** Depois de terminar a refatoração, AUDITE NOVAMENTE TODO O ESCOPO ORIGINAL. Não faça apenas `refatorei → testes passaram → concluído`. Faça o ciclo completo: auditoria inicial → inventário → refatoração → testes → **nova auditoria completa** → validação final.

## 17. CRITÉRIO DE SAÍDA
Nunca escreva "Refatoração concluída seguindo Clean Code" apenas porque testes passaram. Antes, responda: ainda existe God Hook? Ainda existe God Component? Alguma função concentra responsabilidades independentes? Se a resposta indicar problema relevante, a tarefa não está concluída.

## 18. PRODUZIR RELATÓRIO FINAL HONESTO
Apresente: Alterações realizadas, Arquivos criados/movidos, Problemas resolvidos, **Reauditoria final** e Problemas restantes. Não esconda dívida técnica. Informe a validação executada.

## 19. NÃO CONFUNDIR "FUNCIONA" COM "ESTÁ BEM ARQUITETADO"
Testes passando não comprovam SRP, boa modularização, coesão ou manutenibilidade. Avalie ambos separadamente.

## 20. EXEMPLO DE FALHA QUE DEVE SER DETECTADA
Um hook de 1.000 linhas lidando com estado React, carregamento fiscal, validações, persistência, reconciliação e emissão. Mesmo funcionando, é um forte candidato a God Hook e a auditoria não estará concluída sem propor ou executar sua divisão.

## 21. REGRA PRINCIPAL DA SKILL
Não pergunte: "Corrigi os arquivos que o usuário apontou?" Pergunte: "O escopo solicitado ainda contém violações relevantes dos princípios que fui instruída a aplicar?" Se sim, continue a auditoria/refatoração.

## 22. NÃO DECLARAR SUCESSO SEM EVIDÊNCIA
Evite frases vagas ("Tudo está seguindo SOLID"). Prefira evidência concreta baseada na reauditoria: "Não foram encontrados hooks com múltiplas responsabilidades críticas; Restaram os seguintes pontos...".
