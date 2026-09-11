# ADR-004: Arquitetura Offline-First Orientada a Eventos Atômicos no App Mobile

* **Status**: Aceito e Em Vigor
* **Data**: 2026-09-10
* **Domínio**: Mobile, Entregas, Vistorias e Concorrência

---

## 🎯 Contexto e Problema

Motoristas e equipes de entrega/montagem operam frequentemente em áreas urbanas ou rurais com oscilação severa ou ausência total de sinal de internet. Tentar sincronizar requisições HTTP síncronas bloqueia a interface do aplicativo e gera perda de dados de conferências e assinaturas.

---

## 💡 Decisão Arquitetural

1. **Buffer Local Pragmático com SQLite**: Todas as ações de campo (conferência, entrega, fotos, vistoria) são persistidas instantaneamente no banco SQLite local do dispositivo.
2. **Ciclo dos 4 Estados do Evento**: O ciclo de vida do evento offline assume estritamente:
   - `PENDING`: Criado e salvo localmente no celular.
   - `SYNCING`: Transmitido via background task assim que a rede é restabelecida.
   - `CONFIRMED`: Processado e validado com sucesso pelo Supabase.
   - `REJECTED`: Rejeitado pelo backend devido a conflito de regra de negócio.
3. **Idempotência por Hash de Evento**: Re-envios causados por instabilidade de rede são ignorados no servidor se o `event_id` já foi processado.

---

## ⚖️ Consequências

- **Positivas**:
  - Zero travamento na operação de campo por falta de internet.
  - Sincronização resiliente e idempotente.
- **Negativas**:
  - Exige tratamento de conflitos no estado `REJECTED` quando regras online falharem.

---

## 🔗 Mapeamento no Código

- **Sincronização Mobile**: `[offlineSyncService.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/services/offlineSyncService.ts)`
- **Banco SQLite**: `[sqlite.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/mobile/src/db/sqlite.ts)`
- **Testes de Transação**: `[mobile-transactions.spec.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/tests/mobile-transactions.spec.ts)`
