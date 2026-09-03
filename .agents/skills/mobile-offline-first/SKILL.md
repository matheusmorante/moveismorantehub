---
name: mobile-offline-first
description: Garante arquitetura Offline-First pragmática orientada a risco operacional (entregas, montagens, inventário, recebimento/conferência, vistorias) com eventos atômicos, ciclo de 4 estados (PENDING, SYNCING, CONFIRMED, REJECTED), idempotência, cache de trabalho e backend como autoridade estrita de regras e estoque.
---

# Skill: Mobile Offline-First & Sincronização Baseada em Eventos

Esta skill define as diretrizes arquiteturais, escopos, ciclo de vida de eventos e padrões de sincronização offline para o aplicativo Mobile do **Morante Hub**.

---

## 🎯 1. Critério de Escopo por Risco Operacional

O suporte Offline-First é determinado **estritamente pelo risco operacional de interrupção de trabalho em campo ou no depósito/armazém sem sinal de internet**, e não pelo simples fato de ser uma tela mobile.

### 🔴 A. Obrigatório Offline-First (Operação de Campo e Depósito Crítica)
Processos em que o operador, entregador, montador ou estoquista **não pode parar** por falta de sinal 4G/Wi-Fi no armazém ou em trânsito:
- **Roteiro e Entregas**: Baixa de entrega, status do trajeto, insucesso de entrega com motivo formal.
- **Montagens & Assistências**: Checklists de execução, status e relatórios de montagem.
- **Evidências em Campo**: Assinatura digital do cliente, fotos de comprovante, avarias e vistorias.
- **Inventário Físico & Contagem de Estoque**: Contagem cega/assistida, leitura de QR/código de barras e lançamento de inventário no depósito.
- **Recebimento de Mercadorias & Conferência Física**: Checklist de recebimento, conferência de volumes por fornecedor/NF e apontamento de divergências físicas.

### 🟡 B. Cache Local para Leitura/Consulta (Read-Only Working Set)
Dados baixados para dar suporte às tarefas atribuídas ao operador:
- Produtos e variações relevantes/catálogo básico de consulta.
- Pedidos e entregas vinculadas ao roteiro do dia do operador.
- Cargas e pedidos de compra liberados para recebimento/conferência no armazém.
- Dados de contato e endereço dos clientes das tarefas baixadas.
- *Regra*: Não tenta baixar a base inteira do ERP; baixa o **working set** do operador.

### 🟢 C. Online-First (Operações Administrativas / Conexão Obrigatória)
Telas que exigem validação centralizada em tempo real e não devem operar offline:
- Criação e edição cadastral de produtos e variações.
- Precificação, tabelas de preço e margens de lucro.
- Dashboard consolidado, faturamento e métricas financeiras.
- Configurações do sistema, gestão de acessos e usuários.

---

## 🔄 2. Ciclo de Vida dos Eventos Locais (Os 4 Estados Obrigatórios)

Cada evento gerado localmente no dispositivo transita obrigatoriamente por 4 estados formais:

```
  ┌───────────┐         ┌───────────┐         ┌───────────┐
  │  PENDING  │ ──────> │  SYNCING  │ ──────> │ CONFIRMED │ (Sucesso: Efetivado no ERP)
  └───────────┘         └───────────┘         └───────────┘
                              │
                              │ (Falha de Invariante / Regra de Negócio)
                              ▼
                        ┌───────────┐
                        │ REJECTED  │ (Requer Atenção / Exibe motivo ao operador)
                        └───────────┘
```

| Estado | Significado Técnico | Comportamento no App |
|---|---|---|
| **`PENDING`** | Operação realizada localmente offline, persistida no banco local com UUID. | Badge *"Aguardando conexão"*. Permite ao operador continuar trabalhando normalmente. |
| **`SYNCING`** | Conexão detectada; lote de eventos em transmissão ativa para o backend. | Badge *"Transmitindo..."*. Bloqueia reenvio concorrente do mesmo evento. |
| **`CONFIRMED`** | O backend validou idempotência, regras e aplicou as movimentações no banco. | Evento removido da fila ativa local; dados locais atualizados com a resposta definitiva. |
| **`REJECTED`** | O backend rejeitou o evento por violação de regra (ex: pedido já cancelado na central). | **Não re-tenta infinitamente**. Fica marcado em vermelho com o motivo detalhado e badge *"Requer atenção"*. |

---

## ⚙️ 3. Arquitetura de Sincronização: Backend como Autoridade Estrita

```
   ┌─────────────────────────────────────────────────────────────┐
   │                   OPERADOR NO CAMPO / DEPÓSITO              │
   │                                                             │
   │  Ação: "Recebeu 10 un. Cadeira Roma no Recebimento #102"    │
   │  Local: Grava Evento { event_id: UUID,                      │
   │         type: 'RECEIPT_CHECK_CONFIRMED', state: 'PENDING',  │
   │         occurred_at: '14:32:10', payload: {...} }           │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                  (Ao reconectar) │ PUSH (State: SYNCING)
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                  SERVIDOR / SUPABASE BACKEND                │
   │                                                             │
   │  1. Idempotência: Se event_id já existe, retorna CONFIRMED. │
   │  2. Validação de Invariantes & Regras de Negócio:           │
   │     - Recebimento foi estornado na central enquanto offline?│
   │     - Pedido de entrega foi cancelado pelo cliente?         │
   │  3. Se Inválido: Retorna REJECTED com { reason: '...' }.    │
   │  4. Se Válido: Aplica regras centrais + `inventory_moves`   │
   │     e retorna CONFIRMED com payload reconciliado.           │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                 Resposta do Lote │ ACK
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                  CACHE LOCAL DO MOBILE                      │
   │  Se CONFIRMED: limpa da fila.                               │
   │  Se REJECTED: alerta operador com ação de contingência.     │
   └─────────────────────────────────────────────────────────────┘
```

### Regras Críticas de Implementação:
1. **Fronteira Rígida de Estoque**:
   - O mobile **nunca** calcula saldo absoluto (`stock = X`).
   - O mobile apenas relata: *"esta contagem/baixa/conferência ocorreu às X horas sob a tarefa Y"*.
   - O **backend** é quem calcula entradas/saídas definitivas em `inventory_moves` e atualiza o estoque.
2. **Idempotência por `event_id` (UUID v4)**:
   - Todo evento nasce com UUID único gerado no momento do clique.
   - Retentativas de rede com o mesmo UUID jamais duplicam lançamentos no banco.
3. **Mídias e Anexos Isolados**:
   - Fotos de vistorias, avarias, assinaturas e NFs são armazenadas no disco local (`file://`).
   - Gerenciadas por uma fila dedicada (`media_upload_queue`) desacoplada do JSON de eventos.
4. **Tratamento de Eventos `REJECTED`**:
   - Quando um evento é rejeitado (ex: pedido cancelado), a UI exibe o card em estado de alerta para que o operador saiba o motivo (ex: *"Esta entrega não pôde ser confirmada porque o pedido foi cancelado pela administração"*).

---

## 🤖 4. Diretriz do Agente de Desenvolvimento

- **Avaliação Automática e Foco em Risco Operacional**: Ao desenvolver ou manter o app mobile, aplicar a arquitetura de eventos Offline-First nos fluxos de campo e armazém (entregas, montagens, inventário e recebimento/conferência).
- Manter fluxos administrativos estritamente Online-First e o backend como autoridade máxima de estoque e regras de negócio.
