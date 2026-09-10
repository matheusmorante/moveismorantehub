---
name: governanca-skills
description: Governança, seleção, composição e manutenção de Skills no Morante Hub. Consulte esta skill para descobrir quais skills usar para uma tarefa, resolver conflitos entre regras, compor múltiplas skills ou auditar/manter as instruções do agente.
---

# Skill: Governança e Composição de Skills

## Objetivo

Garantir que o agente:
* descubra corretamente quais Skills são relevantes para cada tarefa;
* combine múltiplas Skills quando necessário;
* não carregue Skills sem relação com a tarefa;
* não ignore regras críticas;
* não duplique regras entre Skills;
* não crie novas Skills desnecessariamente;
* mantenha as Skills pequenas, especializadas e coerentes;
* trate cada Skill como uma fonte canônica de instruções dentro de seu escopo.

Esta Skill governa **como as outras Skills devem ser usadas e mantidas**.

---

## 1. Regra Principal de Seleção

Antes de implementar qualquer alteração relevante, determine:
1. Qual é a tarefa?
2. Quais áreas do projeto serão afetadas?
3. Quais tecnologias estão envolvidas?
4. Quais domínios de negócio estão envolvidos?
5. Quais Skills correspondem a essas áreas?

> [!IMPORTANT]
> **Nunca escolha automaticamente apenas uma Skill.** Uma tarefa comumente exige a composição de várias Skills simultâneas (ex: banco + regra de negócio + frontend).

---

## 2. Modelo de Composição em 3 Camadas

As Skills devem ser interpretadas em camadas:

```text
┌────────────────────────────────────────────────────────┐
│  CAMADA GLOBAL (Universal - AGENTS.md)                 │
│  - Entenda antes de alterar                            │
│  - Menor mudança necessária (sem refatoração inútil)   │
│  - Investigação de causa raiz                          │
│  - Proibição de inventar arquitetura                   │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│  CAMADA TÉCNICA (Especializada por Tecnologia)         │
│  - `modularizacao_codigo` (SOLID, coesão, 30-100 lin)  │
│  - `eficiencia-dados-egress` (Supabase, paginação)     │
│  - `testes-seguros-erp` (Vitest, Playwright, E2E)      │
│  - `cloud-free-tier-guard` (APIs externas, Maps, AI)   │
│  - `mobile-offline-first` (SQLite, fila de eventos)    │
│  - `arquitetura-agente-gemini` (Function Calling)      │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│  CAMADA DE DOMÍNIO (Regras Oficiais de Negócio)        │
│  - `regras-de-negocio-erp` (CMPM, estoque, devoluções) │
│  - `nfe-sefaz-direto` (Fiscal, SEFAZ-PR, impostos)     │
│  - `auditoria-e2e-assistente-financeiro` (Transações)  │
└────────────────────────────────────────────────────────┘
```

---

## 3. Classificação Interna Obrigatória Pré-Implementação

Antes de modificar qualquer código, confirme mentalmente:

```text
Tarefa:
Arquivos/módulos provavelmente afetados:
Tecnologias envolvidas:
Domínios envolvidos:
Skills globais:
Skills técnicas:
Skills de domínio:
```

---

## 4. Regra de Resolução de Conflitos e Precedência

Quando duas Skills, documentos ou trechos de código parecerem conflitantes, adote estritamente a seguinte ordem de análise:

1. **Integridade e segurança dos dados** (prevenção contra perda, corrupção, inconsistência ou vazamento);
2. **Regra de negócio canônica** (fórmulas oficiais de CMV, CMPM, estoque e fluxos de negócio registrados nas skills de domínio);
3. **Investigação criteriosa de divergências (`Regra Oficial × Código em Produção`)**:
   > [!IMPORTANT]
   > O código em produção pode conter um bug silencioso ou legado, e a documentação pode estar desatualizada. **Divergência entre regra oficial e código significa INVESTIGAR A CAUSA RAIZ, e NUNCA adaptar automaticamente um ao outro.** Verifique se o código possui desvio de comportamento ou se a regra de produto evoluiu com aval do usuário.
4. **Regras técnicas específicas da tecnologia** (TypeScript, Supabase, React, Expo);
5. **Boas práticas genéricas de engenharia**.

> [!WARNING]
> Nunca escolha silenciosamente uma regra contraditória. Se houver divergência entre regra oficial, intenção de negócio e código que represente decisão ambígua de produto, consulte o usuário antes de prosseguir.

---

## 5. Fonte Canônica Única (Single Source of Truth)

- Cada regra importante possui **um único local canônico**.
- É proibido copiar fórmulas ou regras inteiras para outras Skills; use referências explícitas (ex: *"Para cálculo do CMV e CMPM, consulte a skill regras-de-negocio-erp"*).
- Skills **não devem virar changelog** (*"Em agosto corrigimos..."*). A Skill deve documentar exclusivamente **como o sistema deve funcionar agora**.

---

## 6. Critérios para Manutenção de Skills

### Quando Criar Nova Skill
- Existe um conjunto consistente e coeso de regras;
- São reutilizadas frequentemente em tarefas futuras;
- Possuem gatilhos de consulta claros e objetivos;
- Misturá-las com outra Skill tornaria a existente excessivamente ampla.

### Quando Dividir uma Skill
- Mistura múltiplos domínios independentes;
- Cresce excessivamente (> 500-800 linhas sem justificativa);
- Precisa ser carregada frequentemente por causa de apenas uma pequena seção isolada.

### Quando Fundir Skills
- Possuem praticamente os mesmos gatilhos operacionais;
- São normalmente utilizadas juntas em 100% dos casos;
- Repetem regras ou tratam partes inseparáveis da mesma arquitetura.

---

## 7. Gatilhos Obrigatórios em Toda Skill

Toda Skill deve manter declarados no topo:
1. `## Quando aplicar esta Skill` (lista de gatilhos acionadores objetivos);
2. `## Quando NÃO aplicar` (cenários comuns onde a skill não deve ser carregada por engano);
3. `## Skills relacionadas` (dependências cruzadas sem replicação de texto).

---

## 8. Regra de Ouro Final

> **Carregue o menor conjunto completo de instruções necessário para compreender corretamente a tarefa.**  
> Nem o menor número possível (ignorando regras essenciais), nem todas as Skills por garantia (causando poluição e perda de foco).
