---
name: governanca-skills
description: Governança, seleção, composição e manutenção de Skills no Morante Hub. Consulte esta skill para descobrir quais skills usar para uma tarefa, resolver conflitos entre regras, compor múltiplas skills ou auditar/manter as instruções do agente.
---

# Skill: Governança, Composição e Arquitetura de Instruções

## Quando aplicar esta Skill
Aplicar quando a tarefa envolver:
- Seleção e composição de múltiplas Skills para uma tarefa complexa;
- Resolução de conflitos de regras entre código, documentação e instruções do agente;
- Auditoria, criação, divisão, fusão ou manutenção de Skills no diretório `.agents/skills/`;
- Organização das 4 camadas de instruções (Rules, AGENTS.md, Skills e Documentação).

## Quando NÃO aplicar
- Para tarefas de implementação direta sem dúvidas de composição de skills;
- Para consultas exclusivas a regras de negócio de estoque ou vendas (consultar `regras-de-negocio-erp`).

---

## 1. Princípio Geral de Classificação em 4 Camadas

A arquitetura de instruções do Morante Hub é organizada em quatro níveis de responsabilidade:

1. **CAMADA 1 — RULES (Regras Permanentes do Agente)**:
   - *"O que o agente DEVE ou NÃO DEVE fazer em qualquer tarefa"*.
   - Princípios permanentes, restrições universais, prevenções contra erros recorrentes.
2. **CAMADA 2 — AGENTS.MD (Mapa Operacional do Agente)**:
   - *"Como o agente descobre e orquestra o trabalho"*.
   - Hierarquia oficial, mapa pré-flight em 3 níveis e matriz de roteamento de Skills e Documentação.
3. **CAMADA 3 — SKILLS ESPECIALIZADAS (`.agents/skills/`)**:
   - *"Como executar um trabalho especializado quando acionado"*.
   - Conhecimento metodológico especializado: workflows, checklists, estratégias, anti-patterns, testes e ferramentas.
4. **CAMADA 4 — DOCUMENTAÇÃO OFICIAL (`docs/`)**:
   - *"Como o sistema funciona atualmente (Estado, Schemas, Fluxos e Decisões)"*.
   - Fonte de verdade sobre entidades, máquinas de estado, diagramas Mermaid, ERDs, APIs e ADRs.

---

## 2. Modelo de Composição em Camadas por Tarefa

Nenhuma tarefa relevante deve ser executada utilizando apenas uma Skill. O agente deve compor as instruções em camadas:

```text
┌────────────────────────────────────────────────────────┐
│  CAMADA 1 & 2: GLOBAL (Universal - AGENTS.md)          │
│  - Entenda antes de alterar                            │
│  - Menor mudança necessária (sem refatoração inútil)   │
│  - Investigação de causa raiz                          │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│  CAMADA TÉCNICA (Skills Especializadas)                │
│  - `modularizacao_codigo` (SOLID, coesão, 30-100 lin)  │
│  - `database-supabase` (Paginação server-side, Egress) │
│  - `testes-seguros-erp` (Vitest, Playwright, E2E)      │
│  - `cloud-free-tier-guard` (APIs externas, Maps, AI)   │
│  - `mobile-offline-first` (SQLite, fila de eventos)    │
│  - `arquitetura-agente-gemini` (Function Calling)      │
│  - `analise-compatibilidade-mudancas` (Fallbacks)      │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│  CAMADA DE DOMÍNIO E DOCUMENTAÇÃO (`docs/`)            │
│  - `regras-de-negocio-erp` (CMPM, estoque, devoluções) │
│  - `modelagem-negocio-arquitetura` (Diagramas, Docs)   │
│  - `nfe-sefaz-direto` (Fiscal, SEFAZ-PR, impostos)     │
│  - `auditoria-e2e-assistente-financeiro` (Transações)  │
└────────────────────────────────────────────────────────┘
```

---

## 3. Resolução de Conflitos e Precedência de Fontes

Quando houver divergência entre código, documentação e skills:

1. **Integridade e segurança dos dados** (prevenção contra corrupção ou perda irreversível de dados);
2. **Regra de negócio canônica** (fórmulas e processos oficiais registrados nas skills de domínio e `docs/negocio/`);
3. **Investigação de causa raiz (`Regra Oficial × Código em Produção`)**:
   > Divergência entre regra oficial e código significa **INVESTIGAR A CAUSA RAIZ, e NUNCA adaptar automaticamente um ao outro.** Verifique se o código possui um bug silencioso ou se a regra evoluiu com aval do usuário.
4. **Regras técnicas específicas** (TypeScript, React, Supabase, Expo);
5. **Boas práticas genéricas de engenharia**.

---

## 4. Manutenção e Qualidade das Skills

- **Princípio da Fonte Canônica Única**: Cada regra possui um único local oficial. Não duplicar regras de negócio no `AGENTS.md` ou em múltiplas skills.
- **Estrutura Obrigatória de Toda Skill**:
  - Frontmatter com `name` e `description` orientada a gatilhos;
  - `## Quando aplicar esta Skill`;
  - `## Quando NÃO aplicar`;
  - `## Referências e Fonte Canônica de Documentação`.
