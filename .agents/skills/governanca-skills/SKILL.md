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
│  - `database-supabase` (Busca aproximada, Egress, SQL) │
│  - `testes-seguros-erp` (Vitest, Playwright, E2E)      │
│  - `vercel-preview-secrets` (Vercel Preview e Secrets) │
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

## 3. Governança de Padrões Técnicos e Prevenção de Anti-Patterns

Para garantir sustentabilidade e eficiência, o agente deve coibir ativamente as seguintes anomalias arquiteturais:

- **Buscas Textuais Despadronizadas e Investigação de Seq Scans Inesperados**:
  - Toda busca textual livre em tabelas relevantes no PostgreSQL deve seguir a regra oficial em `database-supabase` (índice `gin_trgm_ops`, normalização, `limit` e debounce).
  - É proibido espalhar `.ilike('%...%')` em tabelas sem índice adequado ou criar RPCs duplicadas para o mesmo domínio.
  - Um `Seq Scan` inesperado em consulta crítica ou tabela relevante deve ser investigado, sem tratar varredura sequencial em tabelas pequenas ou com poucas páginas como anomalia per se.
- **Prevenção de Egress e Download Excessivo**:
  - É estritamente vedado baixar centenas de registros para filtrar no React (`.filter()`) ou fazer loops de paginação para carregar catálogos inteiros.
- **Separação Obrigatória entre PostgreSQL e SQLite**:
  - Recursos e extensões específicas do PostgreSQL (`pg_trgm`, `unaccent`, RLS, triggers) **jamais** devem ser assumidos no SQLite local do Mobile (telas offline de entregas, montagens e cronograma). O SQLite opera local-first com suas próprias rotinas locais.

---

## 4. Resolução de Conflitos e Precedência de Fontes

Quando houver divergência entre código, documentação e skills:

1. **Integridade e segurança dos dados** (prevenção contra corrupção ou perda irreversível de dados);
2. **Regra de negócio canônica** (fórmulas e processos oficiais registrados nas skills de domínio e `docs/negocio/`);
3. **Investigação de causa raiz (`Regra Oficial × Código em Produção`)**:
   > Divergência entre regra oficial e código significa **INVESTIGAR A CAUSA RAIZ, e NUNCA adaptar automaticamente um ao outro.** Verifique se o código possui um bug silencioso ou se a regra evoluiu com aval do usuário.
4. **Regras técnicas específicas** (TypeScript, React, Supabase, Expo);
5. **Boas práticas genéricas de engenharia**.

---

## 5. Manutenção e Qualidade das Skills

- **Princípio da Fonte Canônica Única**: Cada regra possui um único local oficial. Não duplicar regras de negócio no `AGENTS.md` ou em múltiplas skills.
- **Estrutura Obrigatória de Toda Skill**:
  - Frontmatter com `name` e `description` orientada a gatilhos;
  - `## Quando aplicar esta Skill`;
  - `## Quando NÃO aplicar`;
  - `## Referências e Fonte Canônica de Documentação`.
- **ast-grep para análise estrutural**: quando solicitado para busca estrutural complexa, auditoria global, migração estrutural ou localização de violações em massa, verifique primeiro regras/configuração existentes e use `ast-grep` se estiver disponível. Não o torne obrigatório em mudanças pequenas. Só crie regras estruturais repetíveis, com alta confiança e exemplos positivos/negativos; não duplique verificações de Biome, TypeScript, ESLint, Knip, Semgrep/CodeQL ou testes de runtime. Mantenha as regras na skill/ferramenta existente do domínio, sem criar skill de ast-grep.
- **CALM para grafo relacional**: quando disponível, use `orient` para panorama e hotspots e `trace` para callers/callees, caminhos e referências; use `change` para impacto de diff. Em CALM 0.8.x, `reference_impact` pertence a `trace` e o impacto do diff é `diff_impact` no conjunto `change`; não invente preset/tool `impact`. Preserve o escopo mínimo configurado no projeto. CALM descreve como o código está conectado; skills e documentação descrevem como deve funcionar; testes comprovam comportamento. Ele complementa Serena (navegação/edição cirúrgica), ast-grep (padrões estruturais), dependency-cruiser (boundaries) e Repomix (contexto amplo após delimitação), sem substituí-los.
