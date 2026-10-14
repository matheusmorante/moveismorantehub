# Regras Obrigatórias para Agentes de IA — MoranteHub

Este arquivo estabelece as regras e diretrizes mandatórias para qualquer agente de inteligência artificial (Antigravity, Codex, Gemini, Claude, Cursor, etc.) que for inspecionar, refatorar, corrigir ou criar código neste repositório.

---

## 1. Regra Fundamental: Consulta Prévia à Documentação Vigente

Antes de propor, inspecionar ou alterar qualquer código relacionado ao sistema fiscal (NF-e modelo 55, NFC-e modelo 65, cancelamento, devolução, inutilização, reconciliação, transmissão SEFAZ, schemas ou banco de dados), **O AGENTE DEVE OBRIGATORIAMENTE CONSULTAR A DOCUMENTAÇÃO VIGENTE**:

1. **Ler o índice oficial de vigência:** [`docs/fiscal/README.md`](docs/fiscal/README.md).
2. **Consultar os invariantes arquiteturais:** [`docs/fiscal/invariantes-arquiteturais.md`](docs/fiscal/invariantes-arquiteturais.md) (invariantes `FISCAL-001` a `FISCAL-022`).
3. **Verificar os históricos de correções recentes:** [`docs/fiscal/historico-correcoes-2026-10-14.md`](docs/fiscal/historico-correcoes-2026-10-14.md) e [`docs/fiscal/revisao-fluxos-saida-2026-10-13.md`](docs/fiscal/revisao-fluxos-saida-2026-10-13.md).

> **Aviso Crítico:** É terminantemente proibido agir com base em suposições, documentações legadas desatualizadas ou snapshots substituídos. O agente deve sempre conferir a documentação mais recente antes de realizar alterações.

---

## 2. Regra de Registro: Documentação Mandatória de Toda Correção Fiscal

Toda e qualquer correção de bug, ajuste de lógica, adequação de schema, otimização de performance, criação de migration ou refinamento de interface no ecossistema fiscal **DEVE SER IMEDIATAMENTE REGISTRADA NA DOCUMENTAÇÃO**:

* **Onde registrar:** Crie ou atualize o arquivo em [`docs/fiscal/historico-correcoes-YYYY-MM-DD.md`](docs/fiscal/).
* **O que deve constar no registro:**
  1. Problema identificado e sintomas observados.
  2. Causa raiz técnica comprovada.
  3. Lista exata dos arquivos e linhas modificados (backend, frontend, SQL/migrations).
  4. Solução técnica implementada.
  5. Testes executados e validações que comprovam a não-regressão.
* **Atualização do índice:** Toda nova documentação deve ser imediatamente linkada na seção *Referências atuais* de [`docs/fiscal/README.md`](docs/fiscal/README.md).
* **Nenhum agente pode finalizar uma tarefa sem documentar as correções realizadas.** Isso garante que agentes subsequentes não fiquem lendo documentações dessincronizadas ou reintroduzam falhas já sanadas.

---

## 3. Invariantes de Segurança e Confiabilidade Fiscal

1. **Separação de Ambientes:** Isolamento estrito entre Homologação (`tpAmb = 2`) e Produção (`tpAmb = 1`). Produção exige autorização explícita do operador e certificado válido.
2. **Idempotência e Numeração:** 
   * `SELECT MAX(numero) + 1` é estritamente proibido. Numerações fiscais são reservadas de forma atômica no PostgreSQL.
   * Não retransmitir automaticamente quando houver resultado incerto. Em caso de timeout de rede ou queda, consulte primeiro a mesma chave na SEFAZ.
3. **Integridade de Snapshots:**
   * Nunca injete campos arbitrários em objetos JSON de snapshot que sejam validados via hash ou RPC no banco (`prepare_nfe_outbound_attempt`). O payload enviado deve ser idêntico ao snapshot persistido.
4. **Validação XSD:**
   * Todo XML gerado deve ser validado localmente contra o pacote XSD oficial vigente antes de qualquer tentativa de transmissão à SEFAZ.
5. **Segurança de Credenciais:**
   * Certificados A1, chaves privadas, senhas e tokens de API nunca devem ser expostos no frontend, nem registrados em logs ou ferramentas de telemetria.

---

## 4. Concorrência, Banco de Dados e Timeouts de Rede

1. **Transações Ociosas no PostgreSQL:**
   * Nunca mantenha transações abertas no PostgreSQL enquanto aguarda I/O de rede (chamadas à SEFAZ via SOAP/mTLS, APIs externas ou ações do cliente).
   * O banco deve sempre respeitar `idle_in_transaction_session_timeout <= 60s` para impedir que conexões abandonadas segurem `advisory locks` e esgotem o pool do PostgREST.
2. **Resiliência e Proteção contra Travamentos no Frontend:**
   * Nenhuma consulta assíncrona ao Supabase ou à API pode bloquear a interface do usuário indefinidamente.
   * Utilizar a função de proteção `withTimeout` com temporizadores adequados e fallbacks seguros em chamadas críticas de sessão (`AuthContext.tsx`), perfil e status.
   * Preservar timers de failsafe ativos para garantir que o estado `loading` nunca permaneça `true` indefinidamente.
   * Fornecer sempre feedback visual claro e transparente (banners animados com spinner e textos explicativos de status).
