# Diretrizes e Regras de Desenvolvimento — MoranteHub

> **Regra Obrigatória para Agentes de IA:** Sempre consulte e siga a documentação técnica vigente em `docs/fiscal/` antes de realizar qualquer alteração no sistema fiscal. Toda correção ou melhoria deve ser imediatamente documentada para evitar dessincronização de contexto entre agentes.

---

## 1. Diretrizes para o Módulo Fiscal (NF-e 55 e NFC-e 65)

### Consulta Prévia Mandatória
Antes de inspecionar, refatorar ou propor correções no ecossistema fiscal, leia:
* [`docs/fiscal/README.md`](docs/fiscal/README.md) — Índice oficial e estado de vigência da documentação.
* [`docs/fiscal/invariantes-arquiteturais.md`](docs/fiscal/invariantes-arquiteturais.md) — Invariantes mandatórios (`FISCAL-001` a `FISCAL-022`).
* [`docs/fiscal/historico-correcoes-2026-10-14.md`](docs/fiscal/historico-correcoes-2026-10-14.md) — Registro das correções recentes de performance, RPC, UI e concorrência.

### Documentação Obrigatória de Correções
Qualquer alteração efetuada nos arquivos fiscais (`api/nfe/`, componentes do modal de emissão, reconciliação, migrações SQL ou regras de cálculo tributário):
1. **DEVE ser registrada** com problema, causa raiz, arquivos alterados e validações em `docs/fiscal/historico-correcoes-*.md`.
2. **DEVE ser linkada** em `docs/fiscal/README.md`.
3. Nunca conclua uma modificação fiscal deixando a documentação desatualizada.

---

## 2. Invariantes de Banco de Dados e Conexões

* **Timeout de Transações:** Manter sempre `idle_in_transaction_session_timeout <= 60s` para prevenir transações órfãs e travamento do pool do PostgREST.
* **Nunca manter transações SQL abertas** durante transmissões HTTP/mTLS com a SEFAZ.
* **Reserva de Numeração:** Utilizar estritamente RPCs transacionais atômicas. Proibido `SELECT MAX(numero) + 1`.
* **Integridade de Snapshots:** O JSON de produtos e inputs fiscais não deve receber propriedades arbitrárias que divirjam do snapshot salvo no banco (evita `FISCAL_SOURCE_CHANGED`).

---

## 3. Resiliência do Frontend e Acessibilidade

* **Watchdogs e Timeouts:** Proteger consultas assíncronas essenciais com `withTimeout` (ex: `AuthContext.tsx`, carregamento de perfil). O estado `loading` nunca deve travar indefinidamente.
* **Feedback Visual Transparente:** Exibir spinners animados e banners de status durante qualquer operação demorada (transmissão, consulta SEFAZ, reconciliação). O modal nunca deve fechar silenciosamente sem resultado.
* **Acessibilidade WCAG AAA:** Textos sobre avisos (amarelo/ouro) devem obrigatoriamente usar fontes escuras de alto contraste (`#3b1900` sobre `#f59e0b` no tema claro) para garantir legibilidade impecável.
