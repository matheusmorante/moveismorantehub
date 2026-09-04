# 📋 Planos Pendentes e Roadmap — Móveis Morante Hub
> **Última atualização:** Setembro de 2026  
> **Status:** Documento vivo de planejamento operacional e técnico.

---

## 🎯 Status Geral das Entregas

### ✅ Funcionalidades Já Concluídas (Setembro 2026)
- [x] **Independência Total de Canais (ERP vs Catálogo)**: Status `active` no ERP e `status` no Catálogo totalmente desacoplados. Produtos desativados permanecem na listagem normal.
- [x] **Botões Bipartidos "Status de Canais"**: Implementados na tabela, nos cards e na listagem de variações.
- [x] **Requisitos Inteligentes de Ativação**: Custo desobrigado da ativação (preenchido em compras); validação dinâmica destacando apenas campos pendentes.
- [x] **Remoção de Coluna de Visibilidade Redundante**: Sidebar e cabeçalhos de tabela limpos e focados.
- [x] **Observações por Item (`observation`)**: Campo no item do pedido concatenado com `" - "` nos impressos, ordens de serviço, recibo e WhatsApp.
- [x] **Assinatura Digital ICP-Brasil nos Recibos**: Carimbo criptográfico oficial com QR Code dinâmico determinístico, sem assinatura manual em papel.
- [x] **Vendedores Habilitados**: Filtro exclusivo para colaboradores ativos com credenciais válidas; snapshot de `sellerId` e `seller` persistidos.
- [x] **Código Sequencial Obrigatório (`orderIndex`)**: Geração imediata de 6 dígitos `#000000` na abertura de pedidos; blindagem contra `undefined`.
- [x] **Padronização do Ícone de Montagem (`DrillIcon`)**: Componente de parafusadeira preenchida em todos os módulos.
- [x] **Autosave de Rascunhos**: Em pedidos, pessoas e produtos com recuperação transparente.
- [x] **Fotos em Proporção 1:1**: Recorte livre sem cantos arredondados e proxy anti-CORS para manipulação de mídias remotas.

---

## 🚀 Próximas Frentes de Desenvolvimento

### 1. 🏛️ Emissão Direta de NF-e e NFC-e no SEFAZ-PR
- [ ] Concluir testes de envio com certificado A1 no ambiente de homologação (`tpAmb: 2`).
- [ ] Geração do DANFE em PDF com chave de acesso e código de barras via Edge Function.
- [ ] Fluxo de cancelamento e inutilização de numeração diretamente pelo ERP.
- [ ] Envio automático do XML e DANFE ao cliente via WhatsApp e e-mail.

### 2. 📱 Mobile: Conferência Cega e Recebimento no Depósito
- [ ] Módulo de contagem física cega de mercadoria no aplicativo móvel.
- [ ] Leitura de código de barras / QR Code via câmera nativa do dispositivo.
- [ ] Modo offline com persistência de eventos no SQLite e sincronização com fila de 4 estados (`PENDING` → `SYNCING` → `CONFIRMED` / `REJECTED`).
- [ ] Alerta imediato de divergência entre nota do fornecedor e mercadoria recebida.

### 3. 🎙️ BI por Voz (Sales Intelligence)
- [ ] Interface no mobile/web para áudio rápido do vendedor no balcão após o atendimento.
- [ ] Armazenamento persistente do áudio original no Supabase Storage / R2 para auditoria e histórico (mesmo em caso de falha da IA).
- [ ] Transcrição e extração de JSON via Gemini API (`produto`, `resultado`, `motivo_objeção`, `demanda_não_atendida`).
- [ ] Pipeline de consolidação e análise estratégica via NotebookLM.

### 4. 💰 Módulo de Comissões e Metas de Vendedores
- [ ] Painel analítico de comissões por vendedor com base nos snapshots históricos de `sellerId`.
- [ ] Regras de comissão diferenciadas por categoria de produto e forma de pagamento.
- [ ] Abatimento líquido de devoluções atendidas no cálculo de comissão do período.

---

## 📝 Arquitetura do Ecossistema
- **ERP:** React + Vite + TypeScript + Tailwind CSS (`erp/`)
- **Catálogo Digital:** Next.js + Tailwind CSS + Cloudflare R2 (`digital-catalog/`)
- **Mobile:** React Native + Expo (Offline-First pragmático) (`mobile/`)
- **API & Fiscal:** Node.js Serverless + SEFAZ-PR direta (`api/`)
- **Banco de Dados:** PostgreSQL 15+ no Supabase (`supabase/`)
