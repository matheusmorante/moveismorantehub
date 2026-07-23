# 📋 Planos Pendentes de Execução — Móveis Morante Hub
> **Última atualização:** 2026-03-10 23:20 (BRT)
> **Status:** Documento vivo na Raiz do Projeto.

---

## 🎙️ NOVO: BI por Voz (Sales Intelligence)
**Conceito:** Capturar o "porquê não comprou" e o comportamento do cliente no balcão via áudio guiado.

### 🔲 Pendente
- [ ] **Interface de Voz:** Criar botão "Finalizar Atendimento" no app mobile dos vendedores.
- [ ] **Processamento Gemini:** Rota Node.js para transcrever áudio e extrair JSON estruturado:
  - `{produto, status_venda, motivo_objecao, demanda_nao_atendida}`.
- [ ] **Stepper de Áudio:** Interface que guia o vendedor sobre o que falar (Produto, Motivo da perda, Sugestão).
- [ ] **Integração NotebookLM:** Gerar exportador de dados para análise de padrões mensais.

---

## 🔲 1. Autosave / Rascunhos (Draft System)
### ✅ Já Feito
- [x] Tipagem `isDraft` em `Person`, `Product` e `Service`.
- [x] Autosave inteligente (3s) no `ProductFormModal` e `PersonFormModal`.
- [x] Serviço de limpeza automática (`draftCleanupService.ts`).

### 🔲 Pendente
- [ ] **Executar SQL no Supabase** para colunas `is_draft` e `updated_at`.
- [ ] Implementar autosave em **Serviços** (`ServiceFormModal`).
- [ ] Criar aba de "Rascunhos" nas listagens do ERP.

---

## 🔲 2. Integração WhatsApp Marketplace
### 🔲 Pendente
- [ ] Sincronizar Catálogo Meta com Supabase.
- [ ] Webhook para pedidos via chat.
- [ ] Notificações automáticas de entrega/status.

---

## 🔲 3. Inteligência Artificial (Gemini API)
### 🔲 Pendente  
- [ ] **Chatbot Consultor (RAG):** Consulta estoque e manuais em tempo real.
- [ ] **Visão Computacional:** Gerar `alt text` de fotos de produtos automaticamente.
- [ ] **OCR de Notas:** Leitura de GNRE/Notas de fornecedores para entrada de estoque.

---

## 🔲 4. Deploy & Infraestrutura (Vercel)
### 🔲 Pendente
- [ ] **Corrigir Root Directory:** No Vercel, mudar de `pdv` para `apps/erp`.
- [ ] **Pipelines de Branch:** Usar `main` para Produção e `dev` para Preview automático.
- [ ] Testar rotas de redirecionamento do Supabase Auth em `pdv.vercel.app`.

---

## 🔲 5. Sistema de Combos
### ✅ Já Feito
- [x] Seletor de itens de combo pronto.
- [x] Cálculo de preço/estoque virtual.

### 🔲 Pendente
- [ ] Persistência de `combo_items` no banco de dados.
- [ ] Interface de visualização de kit no carrinho/venda.

---

## 🔲 6. Qualidade & Auditoria
- [ ] Resolver lints remanescentes.
- [ ] Testar impressão de pedidos com mapa de rota real.
- [ ] Revisar UI mobile em telas de 360px.

---

## 📝 Notas de Versão
- **Backend:** Supabase
- **IA Principal:** Google Gemini API
- **Arquitetura:** Monorepo (apps/erp, apps/ecommerce)
