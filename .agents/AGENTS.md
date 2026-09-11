# Regras Universais e Orquestração do Sistema — Morante Hub

Este documento é o **Mapa Operacional Canônico de Nível 1** do Morante Hub.
Ele define a hierarquia de instruções do agente, seus princípios fundamentais e a matriz de descoberta de Skills e Documentação.

---

## 1. CAMADA 1 — PRINCÍPIOS PERMANENTES INVIOLÁVEIS DO AGENTE (RULES)

> [!IMPORTANT]
> **"ANTES DE CRIAR, PROCURE. ANTES DE ALTERAR, ENTENDA. ANTES DE ABSTRAIR, JUSTIFIQUE. ANTES DE CONCLUIR, TESTE. ANTES DE DIZER QUE RESOLVEU, VERIFIQUE REGRESSÕES."**

1. **Investigação Prévia Obrigatória**: Nunca inicie implementação sem antes localizar e entender o código existente. É expressamente proibido criar implementações paralelas por comodidade.
2. **Regra da Causa Raiz**: Nunca corrija sintomas antes de investigar e identificar a causa raiz. É proibido adicionar retries, timeouts, sleeps artificiais, mascarar assertions ou duplicar lógica para contornar um problema de origem.
3. **Menor Alteração Necessária (Anti-Refatoração Desnecessária)**: Modifique apenas o necessário para cumprir a tarefa. Não realize "limpeza geral", renomeações em massa ou reestruturações não solicitadas. Se uma refatoração for genuinamente indispensável, justifique previamente ao usuário.
4. **Resolução de Divergências (`Regra Oficial × Código`)**: O código em produção pode conter bugs silenciosos ou legados, e documentações podem desatualizar. **Divergência entre regra de negócio e código significa INVESTIGAR A CAUSA RAIZ, e NUNCA adaptar automaticamente um ao outro.** Consulte o usuário em caso de dúvida de negócio.
5. **Git Push**: Nunca executar `git push` automaticamente. Aguardar solicitação explícita do usuário.
6. **Idioma**: Falar apenas em português brasileiro.

---

## 2. CAMADA 2 — PRE-FLIGHT E HIERARQUIA DE INSTRUÇÕES (AGENTS.MD)

Antes de propor ou realizar qualquer edição (`replace_file_content` / `write_to_file`) em QUALQUER arquivo, o agente DEVE mentalmente executar a verificação de conformidade em 3 níveis:

```text
┌────────────────────────────────────────────────────────┐
│  NÍVEL 1: GLOBAL (Universal - AGENTS.md)               │
│  - Entendi a causa raiz?                               │
│  - É a menor alteração necessária?                     │
│  - Evitei refatoração paralela ou cosmética?           │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│  NÍVEL 2: TÉCNICO (Skill Técnica Envolvida)            │
│  - `governanca-skills`         → Seleção e composição  │
│  - `modularizacao_codigo`      → Arquitetura, SOLID    │
│  - `database-supabase`         → Consultas e Egress    │
│  - `testes-seguros-erp`        → Testes e causa raiz   │
│  - `cloud-free-tier-guard`     → APIs e teto R$ 0,00   │
│  - `mobile-offline-first`      → SQLite e sincronia    │
│  - `arquitetura-agente-gemini` → Function Calling IA   │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│  NÍVEL 3: DOMÍNIO E DOCUMENTAÇÃO (`docs/`)             │
│  - `regras-de-negocio-erp`        → Estoque, CMPM, CMV   │
│  - `modelagem-negocio-arquitetura`→ Diagramas e Docs   │
│  - `nfe-sefaz-direto`             → Fiscal, SEFAZ-PR     │
│  - `analise-compatibilidade`      → Snapshots/Histórico  │
└────────────────────────────────────────────────────────┘
```

---

## 3. CAMADA 3 — ROTEADOR DE SKILLS ESPECIALIZADAS

Consulte a skill correspondente para obter o procedimento operacional detalhado:

| Categoria | Skill | Quando Utilizar / Gatilho |
|---|---|---|
| **Metagovernança** | `governanca-skills` | Descobrir quais skills usar, resolver conflitos de regras e auditar instruções. |
| **Arquitetura & Clean Code** | `modularizacao_codigo` | Refatorar arquivos extensos (alvo 30-100 linhas), desacoplar componentes. |
| **Modelagem & Docs** | `modelagem-negocio-arquitetura` | Alterar processos, atualizar diagramas Mermaid e manter a documentação viva em `docs/`. |
| **Regras de Negócio ERP** | `regras-de-negocio-erp` | Alterar vendas, estoque, CMPM, CMV, recebimentos, devoluções e despesas. |
| **Banco de Dados** | `database-supabase` | Criar migrations, tabelas, consultas Supabase, otimização de Egress e RLS. |
| **Mobile & Offline** | `mobile-offline-first` | Funcionalidades offline no App, SQLite local e sincronia em 4 estados. |
| **Fiscal & Notas** | `nfe-sefaz-direto` | Emissão de NF-e/NFC-e, XML, tributação e comunicação SEFAZ-PR. |
| **Inteligência Artificial** | `arquitetura-agente-gemini` | Function Calling, tools do assistente IA, prompts e agentes Gemini. |
| **Testes & Qualidade** | `testes-seguros-erp` | Planejamento e execução de testes Vitest, Playwright, E2E e Docker. |
| **Testes Financeiros** | `auditoria-e2e-assistente-financeiro` | Bateria de testes E2E com 164 casos do assistente financeiro no navegador. |
| **Compatibilidade** | `analise-compatibilidade-mudancas` | Novos campos em JSONs/tabelas, fallbacks de leitura e retrocompatibilidade. |
| **Publicação Mobile** | `mobile-eas-publicacao` | Builds nativas Android/iOS, atualizações OTA e publicação Expo EAS. |
| **Proteção Cloud** | `cloud-free-tier-guard` | Proteção contra cobranças, cotas de APIs (Google Maps, Gemini) e teto R$ 0,00. |
| **Organização de Pastas** | `organizacao-arquivos-diretorios` | Estruturação de diretórios, subpastas semânticas e migração segura de arquivos sem quebra de imports. |

---

## 4. CAMADA 4 — DOCUMENTAÇÃO OFICIAL DO SISTEMA (`docs/`)

Para entender como o sistema funciona atualmente (entidades, estados, diagramas e arquitetura), consulte a documentação canônica em `docs/`:

- **Índice Navegável**: [docs/README.md](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/docs/README.md)
- **Regras de Domínio**: [docs/negocio/](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/docs/negocio/)
- **Arquitetura Técnica**: [docs/arquitetura/](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/docs/arquitetura/)
- **Decisões de Arquitetura (ADRs)**: [docs/decisoes/](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/docs/decisoes/)
- **Padrões Visuais (UI/UX)**: [docs/negocio/operacao/padroes-visuais-ui.md](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/docs/negocio/operacao/padroes-visuais-ui.md)
- **Mapa de Módulos e Código**: [docs/arquitetura/modulos-e-cooperacao.md](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/docs/arquitetura/modulos-e-cooperacao.md)
