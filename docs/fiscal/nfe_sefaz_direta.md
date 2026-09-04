# Emissão de NF-e e NFC-e Direta (SEFAZ-PR) — Móveis Morante Hub

> **Status:** Em implementação / Módulo Fiscal Direto  
> **Objetivo:** Emissão, cancelamento, inutilização e consulta de documentos fiscais eletrônicos diretamente nos WebServices da SEFAZ-PR, eliminando custos com gateways ou APIs intermediárias pagas (Focus NFe, Bling, etc.).

---

## 1. Arquitetura da Solução Fiscal

```
[ ERP Morante Hub ]
       │ (JSON do Pedido)
       ▼
[ api/nfe/emit.ts ] ───► [ nfeSigner.ts ] ───► Assinatura XML (Certificado Digital A1)
       │                                            │
       ▼                                            ▼
[ sefazClient.ts ] ◄──────────────────────── Envio SOAP HTTPS mTLS
       │
       ├───► [ SEFAZ-PR Homologação / Produção ]
       ▼
Retorno: Protocolo de Autorização + XML Autorizado + DANFE
       │
       ▼
Persistência no Supabase (`order_data.nfe`, `invoices`) + Envio ao Cliente
```

### Tecnologias e Bibliotecas
- **Linguagem / Runtime:** TypeScript / Node.js (Serverless API em `api/nfe/`).
- **Certificado Digital:** Certificado A1 (.pfx / .p12) convertido em PEM/Cert para autenticação mTLS e assinatura digital.
- **Criptografia e Assinatura:** `node-forge` / `crypto` para assinatura digital RSA-SHA1 com enveloped signature no padrão W3C XMLDSig.
- **Validação:** Validação dos Schemas XSD oficiais da SEFAZ (v4.00) antes da transmissão.

---

## 2. Ambientes: Homologação vs Produção

Seguindo a regra de isolamento de ambientes do Morante Hub:

| Configuração | Homologação (`NODE_ENV=development`) | Produção (`NODE_ENV=production`) |
|---|---|---|
| **Ambiente (`tpAmb`)** | `2` (Homologação) | `1` (Produção) |
| **WebService Autorização** | `https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4` | `https://nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4` |
| **WebService Retorno** | `https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeRetAutorizacao4` | `https://nfe.sefa.pr.gov.br/nfe/NFeRetAutorizacao4` |
| **Destinatário de Testes** | CNPJ / CPF e Nome com "SEM VALOR FISCAL" | Dados reais do cliente |
| **Série da Nota** | Série 900+ (testes) | Série 1 (produção) |

---

## 3. Estrutura e Regras de Negócio Tributárias (Móveis no Paraná)

### CFOPs Padrão
- **5.102 / 6.102:** Venda de mercadoria adquirida ou recebida de terceiros (operações internas no PR e interestaduais).
- **5.405:** Venda de mercadoria sujeita ao regime de Substituição Tributária (quando aplicável).
- **1.202 / 2.202:** Devolução de venda de mercadoria adquirida ou recebida de terceiros.

### CSOSN / CRT (Simples Nacional)
- Empresa optante pelo **Simples Nacional** (CRT = 1):
  - **CSOSN 102:** Tributada pelo Simples Nacional sem permissão de crédito.
  - **CSOSN 500:** ICMS cobrado anteriormente por ST ou antecipação.
  - **CSOSN 900:** Outros casos especiais ou devoluções.

### Itens e Campos Obrigatórios no Produto
Para a emissão fiscal direta, cada produto/variação precisa ter:
1. **NCM** (Nomenclatura Comum do Mercosul, ex: móveis de madeira 9403...).
2. **CEST** (se sujeito à ST).
3. **CFOP** correspondente à operação.
4. **Origem da Mercadoria** (0 - Nacional, etc.).
5. **Valor Unitário e Quantidade Comercial/Tributável**.

---

## 4. Contingência e Tratamento de Falhas

1. **Timeout SEFAZ / Indisponibilidade**:
   - Em caso de falha de comunicação ou retorno 108/109 (serviço paralisado), a nota entra em fila de contingência offline (para NFC-e via EPEC ou contingência offline do PR).
2. **Rejeições Comuns e Tratamento**:
   - **Rejeição 204 (Duplicidade de NF-e):** O sistema recupera a chave de acesso existente no banco e consulta o status na SEFAZ em vez de reemitir com novo número.
   - **Rejeição 539 (Duplicidade com diferença na Chave):** Ajusta o sequencial e verifica a numeração autorizada.
3. **Segurança do Certificado:**
   - O arquivo do certificado (.pfx) e sua senha nunca são versionados no Git. Ficam armazenados em variáveis de ambiente protegidas (`SEFAZ_CERT_BASE64`, `SEFAZ_CERT_PASSWORD`).

---

## 5. Arquivos de Código Relacionados
- [`api/nfe/emit.ts`](file:///c:/Users/Rosilene/Desktop/morantehub/api/nfe/emit.ts): Ponto de entrada da emissão e geração do XML.
- [`api/nfe/nfeSigner.ts`](file:///c:/Users/Rosilene/Desktop/morantehub/api/nfe/nfeSigner.ts): Módulo criptográfico de assinatura e envelope XML.
- [`api/nfe/sefazClient.ts`](file:///c:/Users/Rosilene/Desktop/morantehub/api/nfe/sefazClient.ts): Cliente SOAP HTTPS mTLS para os servidores da SEFAZ-PR.
