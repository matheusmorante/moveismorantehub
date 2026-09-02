---
name: nfe-sefaz-direto
description: >
  Status da implementacao de emissao de NF-e e NFC-e diretamente com o SEFAZ
  (sem API intermediaria) no projeto Morante Hub. Consulte esta skill SEMPRE
  que for trabalhar com qualquer tarefa relacionada a: NF-e, NFC-e, nota fiscal,
  fiscal, certificado digital, DANFE, XML, SEFAZ, emissao, tributacao ou protocolo.
---

# NF-e SEFAZ Direto — Status da Implementacao

## Contexto

O Morante Hub esta implementando a emissao de NF-e e NFC-e **diretamente com o SEFAZ-PR**,
sem usar API intermediaria (sem Bling, Focus NFe, Nuvem Fiscal, etc.).
O ambiente alvo inicial e **homologacao** (tpAmb=2), para depois migrar para producao.

---

## JA IMPLEMENTADO

### Dados Fiscais dos Produtos
- **Tipo `FiscalInfo`** (`erp/src/pages/types/product.type.ts`): NCM, ncmDescription, CEST, origem, cst (CSOSN), CFOP, pisCst, cofinsCst, icmsPercent, codigoServico, issPercent
- **Aba "Fiscal" no produto** (`erp/src/pages/App/Products/components/tabs/ProductFiscalTab.tsx`): UI completa com sugestao de NCM por IA, CEST, CSOSN, CFOP, aliquotas
- **Configuracoes padrao fiscais** (`erp/src/pages/App/Settings/components/FiscalSettingsSection.tsx`): defaults globais salvos em `settings.fiscalDefaults`
- **Defaults no `settingsService.ts`**: NCM `94036000`, CFOP `5102`, CSOSN `102`, PIS/COFINS CST `49`, origem `0`

### Regra de Tipo de Documento
- **`fiscalDocumentRule.ts`** (`erp/src/pages/utils/fiscalDocumentRule.ts`):
  - Retirada (pickup) -> NFC-e
  - Entrega (delivery) -> NF-e
- **Testes unitarios** (`fiscalDocumentRule.test.ts`) — passando com vitest

### Dados Basicos do Emitente (parcial)
Campos existentes em `AppSettings` (`settingsService.ts` linhas ~71-74):
- `companyName` — Razao Social / Nome Fantasia
- `companyCnpj` — CNPJ formatado
- `companyAddress` — Endereco completo (string unica — precisa ser desmembrado)
- `companyPhone` — Telefone

### Chave de Acesso NF-e de Entrada
- **`ReceiptFiscalDocumentsSection.tsx`**: campo de chave de acesso 44 digitos para registrar NF de **entrada** nos Recebimentos de Mercadorias
- Storage Supabase `purchase-attachments` para anexar XMLs/PDFs de NF de entrada

### Infraestrutura Disponivel
- **Vercel** configurado e em uso — pode hospedar Serverless Functions Node.js
- **Supabase** com Edge Functions (`supabase/functions/`) — usado para webhook WhatsApp e gateway Rede
- **Bling** configurado (`blingConfig` em AppSettings) — hoje so para importacao de dados, nao emissao de NF

---

## BLOQUEANTE — Sem isso nao e possivel emitir

### 1. Certificado Digital A-1 (.pfx)
- **Status:** NAO EXISTE em lugar nenhum no projeto
- O que precisa:
  - Arquivo `.pfx` (ou `.p12`) + senha, emitido por AC credenciada ICP-Brasil (Serasa, Certisign, Soluti)
  - Armazenamento seguro: Vercel Environment Variable (base64 do .pfx) + Vercel Secret para a senha
- **ATENCAO:** O SEFAZ aceita certificado real mesmo em homologacao. Nao existe "certificado de teste".

### 2. Backend de assinatura XML + envio SEFAZ
- **Status:** NENHUM endpoint de NF-e existe
- Por que nao pode ser no browser: CORS + mTLS + seguranca da chave privada
- Solucao planejada: **Vercel Serverless Function** em Node.js em `api/nfe/emit.ts`
  - Libs: `node-forge` + `xml-crypto` (assinatura XMLDSig RSA-SHA1) + `axios` (SOAP)
  - Endpoints SEFAZ-PR homologacao:
    - Autorizacao: `https://hmg.nfe.fazenda.pr.gov.br/nfe/services/NfeAutorizacao4`
    - Ret Autorizacao: `https://hmg.nfe.fazenda.pr.gov.br/nfe/services/NfeRetAutorizacao4`
    - Consulta Protocolo: `https://hmg.nfe.fazenda.pr.gov.br/nfe/services/NfeConsultaProtocolo4`

---

## FALTANDO — Dados, estrutura e banco

### 3. Dados do emitente incompletos nos Settings
Faltam estes campos em `AppSettings` e na UI de Settings:
- `companyIE` — Inscricao Estadual -> `emit.IE`
- `companyIM` — Inscricao Municipal -> `emit.IM` (para NFS-e futura)
- `companyCRT` — Codigo Regime Tributario (1=Simples Nacional) -> `emit.CRT`
- `companyCEP` -> `emit.enderEmit.CEP`
- `companyBairro` -> `emit.enderEmit.xBairro`
- `companyCMun` — Codigo IBGE municipio -> `emit.enderEmit.cMun`
- `companyUF` -> `emit.enderEmit.UF`

### 4. Numeracao e serie da NF-e
- **Status:** NAO EXISTE
- Precisa: sequencia de `nNF` (numero da nota) por serie, controlado no banco
- Serie padrao: `1` para NF-e e `1` para NFC-e (configuravel)

### 5. Tabela `nfe_documents` no Supabase
- **Status:** NENHUMA MIGRATION EXISTE
- Estrutura minima necessaria:
```sql
CREATE TABLE nfe_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  numero_nfe INTEGER NOT NULL,
  serie VARCHAR(3) NOT NULL DEFAULT '1',
  chave_acesso VARCHAR(44) UNIQUE,
  modelo VARCHAR(2),         -- '55'=NF-e, '65'=NFC-e
  ambiente INTEGER DEFAULT 2, -- 2=homologacao, 1=producao
  status VARCHAR(30) DEFAULT 'pendente',
  -- status possiveis: pendente | autorizada | denegada | cancelada | erro
  xml_nfe TEXT,              -- XML assinado enviado ao SEFAZ
  xml_protocolo TEXT,        -- Retorno SEFAZ (nProt, dhRecbto)
  numero_protocolo VARCHAR(20),
  danfe_url TEXT,            -- URL do PDF do DANFE no Storage
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 6. Dados fiscais do produto nao sobem para o Item do pedido
- O produto tem `fiscal` com NCM, CFOP etc., mas o tipo `Item` no pedido NAO carrega esses campos
- Ao montar o XML da NF-e, precisara buscar os dados fiscais de cada produto pelo `productId`
- Solucao preferida: propagar `item.fiscal` no snapshot do pedido no momento da venda

### 7. Campo `indIEDest` no destinatario
- **Status:** FALTA no cadastro de clientes
- Indicador de IE do destinatario (1=contribuinte, 2=isento, 9=nao contribuinte)
- Afeta o CFOP correto (5102 vs 5103)

---

## SEQUENCIA DE IMPLEMENTACAO (por fases)

### Fase 1 — Preparacao (sem emissao ainda)
- [ ] Completar dados do emitente em `AppSettings` + UI (IE, CRT, CEP, bairro, municipio, UF, IBGE)
- [ ] Criar migration `nfe_documents` no Supabase
- [ ] Adicionar configuracao de serie NF-e e controle de numeracao sequencial no banco
- [ ] Propagar `fiscal` do produto para o `Item` no pedido (snapshot na venda)
- [ ] Adicionar `indIEDest` no cadastro de clientes

### Fase 2 — Backend de emissao
- [ ] Upload do certificado `.pfx` de homologacao nas Vercel Env Vars (base64)
- [ ] Criar `api/nfe/emit.ts` (Vercel Function):
  - Montar XML NF-e layout 4.00
  - Assinar com `xml-crypto` + `node-forge` (XMLDSig RSA-SHA1)
  - Enviar via SOAP para SEFAZ-PR homologacao
  - Salvar resultado em `nfe_documents`
- [ ] Criar `api/nfe/danfe.ts` para gerar PDF do DANFE

### Fase 3 — Frontend
- [ ] Botao "Gerar NF-e" nas acoes do pedido (`orderActionsConfig.ts`)
- [ ] Adicionar `ISSUE_NFE` ao tipo `OrderAction` em `order.type.ts`
- [ ] Modal de resultado (chave de acesso, botao DANFE, status)
- [ ] Tela de gestao de NF-e emitidas com filtros de status e cancelamento

### Fase 4 — Producao
- [ ] Trocar endpoints SEFAZ para producao (tpAmb=1)
- [ ] Substituir certificado de homologacao pelo de producao
- [ ] Validar numeracao sequencial sem gaps

---

## ARQUIVOS-CHAVE DO PROJETO

| Arquivo | Para que serve na NF-e |
|---|---|
| `erp/src/pages/types/product.type.ts` | Tipo `FiscalInfo` — campos fiscais por produto |
| `erp/src/pages/types/order.type.ts` | Tipo `Order` — adicionar `nfeData?` aqui |
| `erp/src/pages/utils/settingsService.ts` | `AppSettings` — adicionar dados do emitente |
| `erp/src/pages/utils/fiscalDocumentRule.ts` | Regra NF-e vs NFC-e por modalidade |
| `erp/src/pages/App/Settings/components/FiscalSettingsSection.tsx` | UI de configuracoes fiscais — expandir |
| `erp/src/pages/App/SalesOrder/OrderActions/orderActionsConfig.ts` | Adicionar acao "Gerar NF-e" |
| `supabase/migrations/` | Criar migration `nfe_documents` aqui |
| `api/` (raiz Vercel) | Criar `nfe/emit.ts` e `nfe/danfe.ts` aqui |

---

## REGRAS IMPORTANTES (nao violar)

1. **NUNCA** expor a chave privada do certificado no frontend — toda assinatura e exclusivamente no backend
2. **SEMPRE** usar `tpAmb=2` no ambiente de desenvolvimento — nunca acionar producao por acidente
3. **Antes** de montar XML de um pedido, verificar se todos os itens tem NCM valido (8 digitos), CFOP e CSOSN preenchidos
4. **Retrocompatibilidade:** Pedidos existentes nao tem `fiscal` nos itens — buscar do cadastro do produto via `productId` como fallback
5. **NFC-e (modelo 65)** = retirada na loja = sem campo transporte, destinatario opcional para consumidor final
6. **NF-e (modelo 55)** = entrega em domicilio = destinatario obrigatorio com endereco completo
7. **Cancelamento** de NF-e so e permitido em ate 24h apos autorizacao e antes da circulacao da mercadoria
