# Visão Geral da Arquitetura Técnica — Morante Hub

Este documento descreve a infraestrutura, a pilha tecnológica e o modelo C4 de arquitetura do ecossistema Morante Hub.

---

## 🏗️ 1. C4 Model — Nível 1: Contexto do Sistema (System Context)

```mermaid
flowchart TD
    subgraph USERS["Atores & Usuários"]
        Admin[Administrador / Gestor]
        Seller[Vendedor / Atendente]
        Driver[Entregador / Montador]
        Customer[Cliente Final / Consumidor]
    end

    subgraph SYSTEM["Ecossistema Morante Hub"]
        ERP["ERP Web Application<br/>(Gestão, Vendas, Estoque, Financeiro)"]
        AppMobile["App Mobile Offline-First<br/>(Entregas, Montagens, Vistorias)"]
        Catalog["Catálogo Digital Público<br/>(Vitrine Virtual)"]
    end

    subgraph EXTERNAL["Sistemas & Serviços Externos"]
        SEFAZ["SEFAZ-PR<br/>(Emissão Direta NF-e/NFC-e)"]
        Gemini["Google Gemini IA<br/>(Visão Multimodal & Parsing)"]
        GMaps["Google Maps Platform<br/>(Roteirização de Entregas)"]
        FCM["Firebase FCM<br/>(Push Notifications)"]
    end

    Admin --> ERP
    Seller --> ERP
    Driver --> AppMobile
    Customer --> Catalog

    ERP -->|Emissão SOAP Certificado A1| SEFAZ
    ERP -->|Parsing XML & Imagens| Gemini
    ERP -->|Geocodificação & Rota| GMaps
    ERP -->|Notificação de Entrega/Cancelamento| FCM
    AppMobile -->|Sincronização 4-Estados| ERP
```

---

## 🏛️ 2. C4 Model — Nível 2: Containers do Sistema

```mermaid
flowchart TD
    subgraph FRONTEND_CONTAINERS["Containers de Client/Frontend"]
        WebSPA["ERP Web (Single Page App)<br/>React 18 + TypeScript + Vite"]
        MobileApp["App Mobile (Android/iOS)<br/>React Native + Expo + SQLite Local"]
    end

    subgraph BACKEND_CONTAINERS["Backend Serverless (Supabase BaaS)"]
        PostgresDB[(PostgreSQL Database<br/>Esquemas, RLS, Triggers, RPCs)]
        RealtimePubSub[Supabase Realtime Pub/Sub<br/>Websockets de Eventos]
        StorageBucket[Supabase Object Storage<br/>Comprovantes, Anexos & Fotos]
    end

    subgraph EXTERNAL_SERVICES["Integrações & APIs Externas"]
        SefazPR[SEFAZ-PR WebServices]
        GeminiAPI[Google Gemini 2.5 / 1.5 Flash API]
        GoogleMapsAPI[Google Maps Directions API]
    end

    WebSPA -->|PostgREST REST/JSON & RLS| PostgresDB
    WebSPA -->|Realtime Subscriptions| RealtimePubSub
    WebSPA -->|Upload/Download Mídia| StorageBucket
    WebSPA -->|Comunicação Direta SOAP A1| SefazPR
    WebSPA -->|Parsing Multimodal| GeminiAPI
    WebSPA -->|Rotas e Lat/Lng| GoogleMapsAPI

    MobileApp -->|SQLite Event Queue| MobileApp
    MobileApp -->|Sync Batch HTTP| PostgresDB
```

---

## 🔒 3. Princípios Arquiteturais Permanentes

1. **Zero Trust & Sanitização em Borda**: Toda entrada de usuário no ERP ou Mobile é sanitizada e validada via contratos TypeScript estritos.
2. **Prevenção de Egress Excessivo no Supabase**: Consultas utilizam paginação server-side com filtros atômicos (`limit`, `range`), evitando downloads integrais de tabelas.
3. **Limite de R$ 0,00 em Cloud**: A Skill `cloud-free-tier-guard` impõe limites rígidos de consumo em APIs do Google Cloud e Gemini.
