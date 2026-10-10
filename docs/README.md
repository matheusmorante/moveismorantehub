# Documentação Oficial de Negócio, Arquitetura e Processos — Morante Hub

Bem-vindo ao **portal canônico de documentação do Morante Hub**. Este documento e sua estrutura funcionam como um **mapa vivo e navegável do funcionamento real do sistema**, conectando as regras de negócio aos serviços, bancos de dados, testes automatizados e diagramas visuais.

---

## 🗺️ Mapa do Sistema e Navegação Rápida

A documentação está organizada em três perspectivas complementares:

```text
                               ┌─────────────────────────────────────────┐
                               │           DOCUMENTAÇÃO OFICIAL          │
                               └────────────────────┬────────────────────┘
                                                    │
        ┌───────────────────────────────────────────┼───────────────────────────────────────────┐
        │                                           │                                           │
┌───────▼────────┐                         ┌────────▼────────┐                         ┌────────▼────────┐
│   A. NEGÓCIO   │                         │ B. ARQUITETURA  │                         │  C. DECISÕES    │
│  (O que/Porquê)│                         │  (Como coopera) │                         │     (ADRs)      │
└───────┬────────┘                         └────────┬────────┘                         └────────┬────────┘
        │                                           │                                           │
        ├── Visão Geral & Regras Globais            ├── Visão da Stack (React, Expo, Supabase)  ├── ADR-001: Histórico Imutável
        ├── Mapa do Negócio (Mermaid LR)            ├── Modelo de Dados (ERD Mermaid)           ├── ADR-002: CMPM e CMV
        ├── Matriz de Efeitos                       ├── Offline-First & Sincronização Mobile    ├── ADR-003: UUID em Variações
        └── Módulos de Domínio                      └── Integrações (SEFAZ, Maps, Gemini IA)    ├── ADR-004: Eventos Offline
            ├── Vendas & Pedidos                                                                └── ADR-005: SEFAZ Direta
            ├── Estoque & CMPM/CMV
            ├── Compras & Recebimentos
            ├── NF-e de Entrada XML
            ├── Devoluções & Cancelamentos
            ├── Assistências Técnicas
            ├── Produtos & Variações
            ├── Financeiro & IA Gemini
            └── Operação, Montagens & Entregas
```

---

## 📚 Índice Detalhado de Documentos

### A. Perspectiva de Negócio (`docs/negocio/`)
Explica **o que acontece no negócio, por que acontece e quais as regras invioláveis**, sem depender de jargões técnicos para ser compreendida.

1. **[Visão Geral do Negócio](negocio/visao-geral.md)**: Entidades fundamentais, conceitos do Morante Hub e abrangência operacional.
2. **[Mapa do Negócio](negocio/mapa-do-negocio.md)**: Visão macro do fluxo de dados e interações entre Vendas, Estoque, Financeiro e Operação *(Mermaid Flowchart LR)*.
3. **[Regras e Invariantes Globais](negocio/regras-globais.md)**: As 6 regras de ouro que nunca podem ser quebradas no sistema.
4. **[Matriz de Efeitos Globais](negocio/matriz-de-efeitos.md)**: Tabela de impacto imediato (Ação → Estoque → Financeiro → Operação → Auditoria → Reversibilidade).
5. **Módulos de Domínio**:
   - **[Vendas & Pedidos](negocio/vendas/ciclo-de-vida-pedidos.md)**: Ciclo de vida (`draft` → `scheduled` → `fulfilled` / `cancelled`), reservas e estoque; cancelamento somente sem circulação, retorno físico por devolução vinculada.
   - **[Regras de Estoque em Vendas](negocio/vendas/regras-estoque-vendas.md)**: CMV materializado, data de efeito do pedido e tratativa de itens sem cadastro.
   - **[Cancelamentos e Reversões](negocio/vendas/cancelamentos-reversoes.md)**: Diferença semântica entre cancelar, estornar e desfazer vendas.
   - **[Estoque, Custos (CMPM) e Movimentações](negocio/estoque/movimentacoes-e-custo.md)**: Fórmulas de CMPM, tipos de movimento e regras de saldo.
   - **[Inventário e Ajustes](negocio/estoque/inventario-e-ajustes.md)**: Contagem física, acertos de saldo e baixas por avaria.
   - **[Recebimentos de Compras](negocio/recebimentos/recebimento-de-compras.md)**: Confirmação de pedidos de compra, atualização de CMPM e saldo.
   - **[Estorno de Recebimento](negocio/recebimentos/estorno-recebimento.md)**: Reversão de compras e recálculo retroativo compensatório.
   - **[NF-e de Entrada XML](negocio/nf-entrada/importacao-conferencianf.md)**: Importação de XML SEFAZ, conciliação e entrada fiscal.
   - **[Devoluções Vinculadas e Livres](negocio/devolucoes/devolucoes-vinculadas-e-livres.md)**: Solicitação e confirmação física de devolução; RPCs remotas confirmam entrada de estoque na mesma transação, com fonte SQL local e testes de falha/retry/concorrência pendentes.
   - **[Estorno de Devolução](negocio/devolucoes/estorno-devolucao.md)**: Reversão de devoluções com modal e timer de segurança de 5 segundos.
   - **[Assistências Técnicas](negocio/assistencias/assistencias-tecnicas.md)**: Ordens de serviço de assistência, substituição de peças e custos de mão de obra.
   - **[Produtos e Variações](negocio/produtos/estrutura-produto-variacao.md)**: Variação principal única, UUIDs, SKUs e atributos.
   - **[Mover Pai e Merge de Variações](negocio/produtos/operacoes-troca-pai-merge.md)**: Mover variação para outro pai e mesclagem canônica.
   - **[Financeiro e Assistente IA](negocio/financeiro/assistente-ia-e-contas.md)**: Lançamentos financeiros, assistente por áudio/texto Gemini, regras *batch-aware*.
   - **[Operação, Montagens e Entregas](negocio/operacao/agendamentos-e-montagens.md)**: Logística, agendamento de entregas, selos `Drill` (Montagem Depósito/Fora), integração Google Maps.

---

### B. Perspectiva de Arquitetura (`docs/arquitetura/`)
Explica **como os módulos do sistema cooperam e como estão tecnicamente implementados**.

1. **[Visão Geral da Arquitetura](arquitetura/visao-geral.md)**: Diagrama de componentes (ERP Web, Mobile App Native, Vercel, Supabase PostgreSQL, Edge Functions).
2. **[Módulos e Cooperação](arquitetura/modulos-e-cooperacao.md)**: Orquestração entre serviços no frontend e triggers/RPCs no banco.
3. **[Modelo de Dados & Schemas](arquitetura/modelo-de-dados-e-schemas.md)**: Diagrama ERD conceitual *(Mermaid erDiagram)*, tabelas principais, RLS e RPCs.
4. **[Offline-First e Sincronização Mobile](arquitetura/offline-e-sincronizacao.md)**: Arquitetura pragmática SQLite no App Mobile, fila `pending_events`, ciclo de 4 estados e sincronia Supabase.
5. **[Integrações Externas](arquitetura/integracoes.md)**: SEFAZ-PR direta (emissão NF-e/NFC-e), Google Maps Platform e IA Gemini Native.

---

### C. Decisões Arquiteturais — ADRs (`docs/decisoes/`)
Registra os **fundamentos históricos e justificativas técnicas** das escolhas mais críticas do projeto.

- **[ADR-001: Imutabilidade de Fatos Históricos e Snapshots](decisoes/adr-001-fatos-historicos-e-snapshots-imutaveis.md)**
- **[ADR-002: Cálculo de CMPM e CMV Materializado](decisoes/adr-002-cmpm-e-cmv-materializado.md)**
- **[ADR-003: Identidade Única e Obrigatória por UUID em Variações](decisoes/adr-003-identidade-unicidade-uuid-variacoes.md)**
- **[ADR-004: Arquitetura Offline-First Orientada a Eventos no Mobile](decisoes/adr-004-offline-first-eventos-atomicos-mobile.md)**
- **[ADR-005: Emissão Direta SEFAZ-PR Sem Intermediários Pagos](decisoes/adr-005-emissao-direta-sefaz-pr-sem-intermediarios.md)**

---

## 🛡️ Protocolo de Manutenção e Governança

Esta documentação é mantida sob as diretrizes do [.agents/AGENTS.md](../.agents/AGENTS.md) e governada pela Skill [.agents/skills/modelagem-negocio-arquitetura/SKILL.md](../.agents/skills/modelagem-negocio-arquitetura/SKILL.md).

> **Regra de Ouro do Desenvolvedor/Agente**: Sempre que uma alteração de código modificar regras de negócio, contratos de API, tabelas ou fluxos de estado, atualize a documentação correspondente na mesma tarefa antes de declarar a atividade como concluída.

Registro da revisão transversal inicial das regras de estoque, recebimentos, devoluções e schema: 14 de setembro de 2026. Consulte os status atuais dos módulos antes de reutilizar aquelas conclusões.
