# Integrações Externas — Morante Hub

Este documento descreve a arquitetura e os diagramas de sequência temporal das integrações externas do Morante Hub: SEFAZ-PR (NF-e/NFC-e), Google Maps Platform e IA Google Gemini Native.

---

## 📜 1. Sequence Diagram — Emissão Direta SEFAZ-PR (sem Intermediários)

```mermaid
sequenceDiagram
    autonumber
    actor User as Operador ERP
    participant ERP as ERP Web (React)
    participant Signer as Assinador XML (WebCrypto / A1)
    participant SEFAZ as SEFAZ-PR WebServices (SOAP)
    participant DB as Supabase PostgreSQL

    User->>ERP: Solicitante clica "Emitir Nota Fiscal"
    ERP->>DB: Busca dados da Venda, Cliente e Tributação (NCM/ICMS)
    DB-->>ERP: Dados estruturados do Pedido
    ERP->>ERP: Monta XML NFe (Modelo 55/65)
    ERP->>Signer: Assina XML com Certificado A1 (.pfx)
    Signer-->>ERP: XML Assinado + DigestValue
    ERP->>SEFAZ: Transmite Lote nfeAutorizacaoLote (SOAP/HTTPS)
    SEFAZ-->>ERP: Retorna nRec (Número do Recibo)
    ERP->>SEFAZ: Consulta Protocolo nfeRetAutorizacao (SOAP)
    SEFAZ-->>ERP: Retorna cStat=100 (Autorizado o uso da NF-e)
    ERP->>DB: Salva nfe_key, protocolo_autorizacao e XML final
    ERP-->>User: Exibe DANFE e libera emissão
```

---

## 🤖 2. Sequence Diagram — Parsing e Classificação NF-e XML / Gemini IA

```mermaid
sequenceDiagram
    autonumber
    actor User as Almoxarife
    participant ERP as ERP Web (React)
    participant Parser as InboundXmlParser (TS)
    participant Gemini as Google Gemini IA 2.5/1.5 Flash
    participant DB as Supabase PostgreSQL

    User->>ERP: Seleciona Arquivo XML (.xml) ou Imagem
    alt Arquivo é XML Válido (.xml)
        ERP->>Parser: parseInboundNfeXml(xmlString)
        Parser-->>ERP: Extração Instantânea de Itens, NCM, Código Fornecedor
    else Arquivo é Imagem / PDF
        ERP->>Gemini: Modelflash / Extração Multimodal OCR
        Gemini-->>ERP: Estrutura JSON com itens e valores
    end
    ERP->>DB: Consulta product_supplier_codes (Vínculos passados)
    DB-->>ERP: Retorna sugestões de vínculos com variações ERP
    ERP-->>User: Exibe tela de conferência pré-preenchida
```

---

## 🗺️ 3. Sequence Diagram — Geolocalização e Cálculo de Rotas Google Maps

```mermaid
sequenceDiagram
    autonumber
    actor User as Montador / Vendedor
    participant ERP as ERP / App Mobile
    participant Maps as Google Maps Directions API
    participant FCM as Firebase Cloud Messaging

    User->>ERP: Seleciona rota do dia ou altera endereço do cliente
    ERP->>Maps: Geocodificação (Endereço -> Lat/Lng) + Matriz de Distância
    Maps-->>ERP: Retorna distância (KM), tempo estimado e rota em mapa
    ERP->>FCM: Notifica dispositivo do Entregador com rota otimizada
```

---

## 🔗 Mapeamento em Código e Testes

- **Fiscal SEFAZ**: [`nfeService.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/nfe/nfeService.ts) e [`nfe_sefaz_direta.md`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/docs/fiscal/nfe_sefaz_direta.md)
- **IA Gemini Native**: [`geminiAgentService.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/services/aiAgent/geminiAgentService.ts)
- **Google Maps**: [`useOrderDistanceCalculator.ts`](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/App/SalesOrder/hooks/useOrderDistanceCalculator.ts)
