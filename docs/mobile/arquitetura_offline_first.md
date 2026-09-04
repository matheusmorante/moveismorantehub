# Arquitetura Mobile Offline-First — Móveis Morante Hub

> **Status:** Ativo e Implementado no aplicativo `mobile/`  
> **Objetivo:** Garantir a operação contínua de entregadores, montadores e almoxarifes mesmo em áreas sem conexão de internet (zonas rurais, subsolos, galpões sem Wi-Fi), com sincronização segura e idempotente ao restabelecer o sinal.

---

## 1. Princípios Arquiteturais e Escopo

### O que É Offline-First (Risco Operacional de Campo e Depósito)
- **Entregas:** Confirmação de entrega, recebimento de pagamentos pendentes, assinatura do cliente, fotos do comprovante e geolocalização.
- **Montagens:** Checklist de montagem, fotos do móvel montado, apontamento de avarias/assistências técnicas.
- **Depósito / Almoxarifado:** Inventário físico (contagem cega), recebimento e conferência de mercadorias com leitor de código de barras / câmera.

### O que NÃO É Offline-First (Online-First Estrito)
- Operações administrativas e de retaguarda: criação/edição de produtos, alteração de regras de precificação, dashboards gerenciais e relatórios consolidados. Essas ações dependem de validação centralizada e conexão online ativa.

---

## 2. Ciclo de Vida dos Eventos Operacionais (4 Estados)

O aplicativo **nunca** grava estados absolutos no banco diretamente (como `stock = X` ou `status = 'fulfilled'`). Ele gera **eventos atômicos de negócio** com UUID idempotente e timestamp UTC:

```
                  ┌──────────────────────┐
                  │       PENDING        │ (Gravado no SQLite / WatermelonDB local)
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │       SYNCING        │ (Tentativa de envio via fila de sync)
                  └─────┬──────────┬─────┘
                        │          │
        Sucesso (200)   │          │ Falha de Validação de Negócio (422)
                        ▼          ▼
            ┌──────────────┐    ┌──────────────┐
            │  CONFIRMED   │    │   REJECTED   │ (Interrompe retentativas; exige ação)
            └──────────────┘    └──────────────┘
```

1. **`PENDING`**: Evento registrado localmente no dispositivo. A interface atualiza imediatamente de forma otimista.
2. **`SYNCING`**: O gerenciador de sincronização em segundo plano está transmitindo o lote de eventos para o backend.
3. **`CONFIRMED`**: O backend processou as regras de negócio, persistiu os movimentos de estoque e retornou confirmação. O evento pode ser arquivado localmente.
4. **`REJECTED`**: Falha irrecuperável de negócio (ex: pedido cancelado anteriormente no ERP, mercadoria bloqueada). **Não entra em loop infinito de retentativas**. Exibe alerta visual com o motivo para o operador intervir.

---

## 3. Fila de Mídia (Fotos, Canhotos e Assinaturas)

Mídias pesadas (fotos de móveis montados, fotos de caixas com defeito, canhotos assinados) possuem **fila de upload dedicada e separada dos eventos de texto**:
- A confirmação do evento de entrega/montagem é transmitida primeiro (JSON leve de poucos bytes).
- As imagens são comprimidas localmente no dispositivo (JPEG qualidade 80%, máximo 1600px).
- O upload para o storage (Supabase Storage / Cloudflare R2) ocorre em segundo plano com suporte a retomada (chunked/resumable upload).

---

## 4. Idempotência e Autoridade Central

- **Idempotência Estrita:** Todo evento carrega um UUID v4 gerado no dispositivo móvel. Se a rede oscilar e o evento for reenviado, o backend descarta o duplicado sem gerar novas movimentações de estoque ou duplicar atendimentos.
- **Backend como Autoridade:** O backend (Supabase RPCs / Edge Functions) é a autoridade máxima de regras de estoque e validação financeira. O mobile apenas reporta ações do operador no mundo físico.

---

## 5. Arquivos de Código Relacionados
- [`mobile/src/`](file:///c:/Users/Rosilene/Desktop/morantehub/mobile/src/): Estrutura de telas, componentes e serviços do app React Native / Expo.
- [`mobile/App.tsx`](file:///c:/Users/Rosilene/Desktop/morantehub/mobile/App.tsx): Ponto de entrada do aplicativo mobile com provedores de rede e autenticação.
- [`mobile/eas.json`](file:///c:/Users/Rosilene/Desktop/morantehub/mobile/eas.json): Configuração de builds e updates OTA via EAS (Expo Application Services).
