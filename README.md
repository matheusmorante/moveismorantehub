# 🚀 Morante Hub — Ecossistema Integrado de Gestão e Vendas

Bem-vindo ao repositório central do **Morante Hub** (Móveis Morante). Este ecossistema une a operação de retaguarda (ERP), o aplicativo móvel de entregas e montagens (Mobile), a vitrine digital para clientes (Catálogo Digital) e as integrações fiscais e de mensageria (API).

---

## 📂 Estrutura do Ecossistema

O repositório está organizado nos seguintes módulos principais:

| Diretório | Descrição | Stack Tecnológica |
|---|---|---|
| [`erp/`](./erp) | **ERP Administrativo** — Gestão de pedidos, estoque, movimentações, produtos, compras, clientes e financeiro. | React 18, Vite, TypeScript, Tailwind CSS |
| [`digital-catalog/`](./digital-catalog) | **Catálogo Digital** — Vitrine pública online dos produtos para clientes e integração Meta (Instagram / WhatsApp). | Next.js, React, Tailwind CSS, Cloudflare R2 |
| [`mobile/`](./mobile) | **App Mobile Logístico** — Operação de campo para entregadores, montadores e conferência de almoxarifado (Offline-First). | React Native, Expo, EAS, TypeScript |
| [`api/`](./api) | **API Serverless & Integrações** — Emissão direta de NF-e/NFC-e na SEFAZ-PR, webhooks e automações. | Node.js, TypeScript, Serverless |
| [`supabase/`](./supabase) | **Banco de Dados & Backend** — Migrações SQL, triggers, funções RPC e políticas de segurança (RLS). | PostgreSQL, Supabase |
| [`docs/`](./docs) | **Documentação do Sistema** — Guias de arquitetura, operações, regras fiscais e estratégias de negócio. | Markdown |
| [`shared-utils/`](./shared-utils) | **Scripts Utilitários** — Ferramentas de manutenção, migração de dados e scripts auxiliares. | Node.js, JavaScript |

---

## 🛠️ Como Executar o Projeto

### Pré-requisitos
- **Node.js**: v18+ ou v20+ LTS
- **npm** ou **yarn**
- **Git**

---

### 1. ERP Administrativo (`erp/`)

O painel de gestão da empresa:

```bash
cd erp
npm install
npm run dev
```
> O ERP estará acessível em `http://localhost:5173`. Para testar a compilação de produção: `npm run build`.

---

### 2. Catálogo Digital (`digital-catalog/`)

A vitrine online para clientes e WhatsApp:

```bash
cd digital-catalog
npm install
npm run dev
```
> O Catálogo estará acessível em `http://localhost:3000`.

---

### 3. Aplicativo Mobile (`mobile/`)

O app para motoristas, montadores e almoxarife:

```bash
cd mobile
npm install
npx expo start
```
> Utilize o Expo Go no dispositivo físico ou emulador Android/iOS. Para compilar builds de produção ou atualizações remotas, consulte o arquivo [`mobile/eas.json`](./mobile/eas.json).

---

### 4. API de Emissão Fiscal e Webhooks (`api/`)

Endpoints de automação e emissão de notas fiscais:

```bash
# Na raiz do repositório
npm run dev
```

---

## 🌐 Ambientes: Desenvolvimento vs Produção

Seguindo as diretrizes do projeto:
- **Desenvolvimento (`dev`):** O comando diário `npm run dev` inicia o stack via `scripts/run-vercel-env-dev.cjs` e carrega as variáveis Vercel Development para o projeto Supabase configurado. O ambiente fiscal de homologação usa `environment=2`/`tpAmb=2`; banco remoto não determina o ambiente fiscal.
- **Produção (`prod`):** Deploy automatizado via Vercel (ERP, Catálogo e API) e Expo EAS (Mobile), usando a configuração Production correspondente. Para emissão fiscal, `environment=1`/`tpAmb=1` é exclusivamente Produção e depende dos gates do backend.

---

## 📜 Regras, Documentação e Diretrizes

- **[RULES.md](./RULES.md)**: Regras de ouro do projeto (código limpo, economia de tokens, convenções de status e fluxos).
- **[.agents/AGENTS.md](./.agents/AGENTS.md)**: Histórico e especificações de comportamento dos módulos do sistema.
- **[IDEIAS_E_PLANOS.md](./IDEIAS_E_PLANOS.md)**: Roadmap estratégico, backlog e planos de novas funcionalidades.
- **[docs/ERP_OPERATIONS.md](./docs/ERP_OPERATIONS.md)**: Documentação aprofundada da operação de pedidos, estoque e canais.
- **[docs/fiscal/README.md](./docs/fiscal/README.md)**: Índice fiscal com documentação vigente, relatórios históricos e publicações pendentes de análise.
- **[docs/mobile/arquitetura_offline_first.md](./docs/mobile/arquitetura_offline_first.md)**: Padrão offline-first com fila de eventos de 4 estados.
- **[docs/arquitetura/estrutura_banco_supabase.md](./docs/arquitetura/estrutura_banco_supabase.md)**: Diagramas e modelo de dados no Supabase.
