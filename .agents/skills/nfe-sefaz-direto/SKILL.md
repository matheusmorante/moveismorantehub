---
name: nfe-sefaz-direto
description: >
  Status e diretrizes oficiais da implementacao de emissao de NF-e e NFC-e diretamente
  com o SEFAZ-PR (sem API intermediaria) no projeto Morante Hub. Consulte esta skill SEMPRE
  que for trabalhar com qualquer tarefa relacionada a: NF-e, NFC-e, nota fiscal,
  fiscal, certificado digital, DANFE, XML, SEFAZ, emissao, tributacao, cancelamento ou devolucao fiscal.
---

# NF-e SEFAZ Direto — Status da Implementacao e Diretrizes Oficiais

## 🏛️ Contexto e Arquitetura

O Morante Hub implementa a emissao de NF-e (Modelo 55 - Entrega) e NFC-e (Modelo 65 - Retirada) **diretamente com o SEFAZ-PR** (sem API intermediaria como Bling, Focus NFe ou Nuvem Fiscal).

---

## ⚖️ SEPARAÇÃO ESTRITA ENTRE PEDIDO/VENDA E DOCUMENTO FISCAL

### 1. Fronteira de Responsabilidades
- **O Módulo Fiscal NUNCA altera estoque diretamente:** O estoque responde ao domínio comercial/operacional (`orders`, `inventory_moves`), e o módulo fiscal reflete ou documenta a operação.
- **Uma NF-e / NFC-e Autorizada NUNCA é editada ou apagada:** O que muda é o seu estado fiscal ou a emissão de outro documento fiscal complementar/reverso (ex: NF-e de Devolução/Entrada referenciando a chave original).

### 2. Onde Cada Ação Acontece no Sistema

#### 🏢 A. Tela Fiscal (`/fiscal-documents` — Vendas > Notas Fiscais)
Dedicada **estritamente à administração fiscal e eventos da SEFAZ**:
- **Consultar Situação na SEFAZ:** Verificar protocolo, status e autorização em tempo real.
- **Cancelar Documento Fiscal:** Transmissão de evento de cancelamento oficial com justificativa (mínimo de 15 caracteres) dentro do prazo regulamentar.
- **Emitir Carta de Correção Eletrônica (CC-e):** Vinculada à NF-e para correções permitidas pela legislação.
- **Reenviar / Consultar Transmissão:** Tratar erros de comunicação ou contingência.
- **Visualizar / Imprimir DANFE Oficial:** Conforme modelo A4 Retrato MOC 7.0 com logotipo da Móveis Morante.
- **Baixar XML Assinado:** Para envio ao cliente, contador ou armazenamento legal.
- **Inutilizar Numeração:** Para faixas ou números que foram pulados.

#### 🛒 B. Tela de Pedidos (`/sales-order` — Pedidos de Venda / Pós-Venda)
Dedicada às **operações comerciais e de cliente** (que geram movimentação de estoque e disparam os processos fiscais correspondentes):
- **Cancelar Venda:** Desfaz a operação comercial, estorna saídas de estoque e solicita o cancelamento da NF-e vinculada se já houver sido autorizada.
- **Registrar Devolução Total:** Entrada das mercadorias de volta ao estoque via `inventory_moves` e geração de **NF-e de Devolução / Entrada** referenciando a NF original.
- **Devolução Parcial:** Entrada exclusiva dos itens devolvidos no estoque e emissão de NF-e de Devolução apenas com os itens e quantidades retornados.
- **Troca de Mercadoria:** Tratada operacionalmente como Devolução do item antigo (entrada de estoque + NF de devolução) + Novo Pedido de Venda do novo item (saída de estoque + nova NF-e).

---

## 📋 STATUS DAS IMPLEMENTAÇÕES

### 1. Dados e Configurações da Empresa Emitente
- **Razão Social / Fantasia:** Móveis Morante
- **CNPJ:** `44.512.248/0001-07`
- **Inscrição Estadual (IE):** `9091234567` | **CRT:** `1 - Simples Nacional`
- **Endereço Completo:** R. Cascavel, 306, Guaraituba, Colombo - PR, CEP: 83410-270 (Código IBGE Município: `4105805`)
- **CSC NFC-e Homologação SEFAZ-PR:** `cscId: "000001"`, `cscToken: "XBMSLQTB4VWHAPSUJLG14Q4YDYZRQLSUQRMF"`
- **Numeração Sequencial Inicial:** Configurada a partir de `700` (`nfeNextNumber: 700`, `nfceNextNumber: 700`) para evitar conflito com sistemas legados.

### 2. Certificado Digital A1 (.pfx) & Backend de Assinatura
- **Armazenamento:** Upload direto no ERP em formato Base64 persistido em `settings.certificateBase64` com proteção estrita por perfil de Administrador (`isAdmin`).
- **Motor Criptográfico (`api/nfe/nfeSigner.ts`):** Leitura PKCS#12 via `node-forge`, extração de chave privada e certificado PEM, assinatura digital padrão **XMLDSig RSA-SHA1** com canonização **C14N**.
- **Cliente SOAP mTLS (`api/nfe/sefazClient.ts`):** Socket HTTPS com chave privada do cliente e certificado para comunicação mútua com os WebServices da SEFAZ-PR.
- **Serverless Function Vercel (`api/nfe/emit.ts`):** Endpoint atômico que orquestra a assinatura, montagem do lote `<enviNFe>`, transmissão à SEFAZ-PR e gravação em `nfe_documents`.

### 3. DANFE A4 Retrato Oficial (MOC 7.0 — Anexo II)
- **100% Conforme o Manual Nacional:**
  - Canhoto de recebimento no topo com data e assinatura do recebedor.
  - Cabeçalho de 3 blocos com Logo da Móveis Morante em alta resolução e slogan *"QUALIDADE QUE CABE NO SEU BOLSO"*.
  - Código de barras CODE-128C e chave de acesso de 44 dígitos formatada em 11 blocos de 4.
  - Natureza da Operação e Protocolo de Autorização de Uso.
  - Inscrição Estadual, IE Subst. Trib. e CNPJ do Emitente.
  - Destinatário completo com data/hora de saída.
  - Fatura / Duplicatas.
  - Cálculo do Imposto Completo (Base ICMS, Valor ICMS, ST, Frete, Seguro, Desconto, Outras Despesas, IPI e Total).
  - Transportador / Volumes (Modalidade do Frete 0 a 9, Placa, UF, Qtd, Espécie, Pesos).
  - Tabela de Produtos com 14 colunas fiscais.
  - Informações Complementares do Simples Nacional e Reservado ao Fisco.

---

## 🗂️ TABELA CENTRAL: `nfe_documents` (Supabase)

```sql
CREATE TABLE IF NOT EXISTS nfe_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  numero_nfe INTEGER NOT NULL,
  serie VARCHAR(3) NOT NULL DEFAULT '1',
  chave_acesso VARCHAR(44) UNIQUE,
  modelo VARCHAR(2) NOT NULL, -- '55'=NF-e, '65'=NFC-e
  ambiente INTEGER DEFAULT 2,  -- 2=homologacao, 1=producao
  status VARCHAR(30) DEFAULT 'pendente', -- autorizada | cancelada | rejeitada | pendente | erro
  motivo_status TEXT,
  xml_nfe TEXT,               -- XML assinado enviado
  xml_protocolo TEXT,         -- Retorno oficial SEFAZ (nProt, dhRecbto)
  numero_protocolo VARCHAR(20),
  valor_total NUMERIC(12,2),
  destinatario_nome TEXT,
  destinatario_documento TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 🚨 REGRAS CRÍTICAS (NUNCA VIOLAR)

1. **Separação Rígida:** Nunca faça o módulo fiscal manipular estoque diretamente; as baixas e entradas de estoque pertencem às regras de negócio de `orders` e `inventory_moves`.
2. **Imutabilidade Fiscal:** Nunca exclua nem sobrescreva uma NF autorizada no banco de dados. Cancelamentos e devoluções são registrados como novos estados ou novos documentos fiscais vinculados.
3. **Ambiente Padrão:** O ambiente de desenvolvimento usa `tpAmb=2` (Homologação). Apenas mude para Produção (`tpAmb=1`) sob solicitação explícita do usuário.
4. **Segurança do Certificado:** A leitura e manipulação de certificados e credenciais fiscais é restrita a usuários Administradores (`isAdmin`).
