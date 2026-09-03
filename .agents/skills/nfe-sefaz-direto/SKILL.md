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

O Morante Hub implementa a emissão de NF-e (Modelo 55 - Entrega) e NFC-e (Modelo 65 - Retirada) **diretamente com o SEFAZ-PR** (sem API intermediária como Bling, Focus NFe ou Nuvem Fiscal).

---

## ⚖️ MATRIZ OFICIAL DE OPERAÇÕES E SEPARAÇÃO DE TELAS

| Ação | NF-e (Mod. 55) | NFC-e (Mod. 65) | Tela de Pedidos (`/sales-order`) | Tela Fiscal (`/fiscal-documents`) |
|---|:---:|:---:|:---:|:---:|
| **Consultar Situação SEFAZ** | ✅ | ✅ | — | ✅ Ação direta SEFAZ |
| **Cancelar Documento Fiscal** | ✅ | ✅ | Indireto *(se cancelável)* | ✅ Ação direta SEFAZ |
| **Carta de Correção (CC-e)** | ✅ | ❌ *(Rejeição MOC)* | — | ✅ Exclusivo Mod. 55 |
| **Baixar XML Assinado** | ✅ | ✅ | Link no pedido | ✅ Download centralizado |
| **Visualizar / Imprimir DANFE** | ✅ *(A4 MOC 7.0)* | ✅ *(DANFE NFC-e)* | Link no pedido | ✅ Impressão centralizada |
| **Inutilizar Numeração** | ✅ | ✅ *(conforme SEFAZ)* | — | ✅ Administração de numeração |
| **Cancelar Venda (Não Atendido)** | — | — | ✅ Desfaz venda + estorno | — |
| **Registrar Devolução Total** | — | — | ✅ Devolução Comercial + Entrada Estoque | — *(Fiscal resolve doc)* |
| **Registrar Devolução Parcial** | — | — | ✅ Devolução Comercial + Entrada Estoque | — *(Fiscal resolve doc)* |
| **Troca de Mercadoria** | — | — | ✅ Devolução Comercial + Nova Venda | — *(Fiscal resolve doc)* |

---

## 🔒 REGRAS CRÍTICAS DE ARQUITETURA E ISOLAMENTO DE DOMÍNIOS

### 1. Desacoplamento Estrito entre Domínio Comercial e Domínio Fiscal
- **REGRA DE OURO:** Nenhum fluxo comercial/pedidos deve montar diretamente XML, CFOP, finalidade, referências (NT 2026.002) ou eventos SEFAZ. Essas decisões pertencem **exclusivamente ao módulo fiscal**.
- O fluxo comercial executa:
  1. Criação da devolução comercial / pós-venda.
  2. Lançamento da movimentação de entrada no estoque (`inventory_moves`).
  3. Tratamento financeiro (estorno, crédito ou reembolso).
  4. Chamada de alto nível para o módulo fiscal (ex: `fiscalService.createReturnDocument({ returnId, originalFiscalDocumentId })`).
- O **Módulo Fiscal** é a autoridade exclusiva que determina o documento fiscal de devolução adequado (sempre emitindo documento fiscal de entrada válido conforme a UF, tipo de documento original NF-e 55 ou NFC-e 65, e normas tributárias vigentes).

### 2. Carta de Correção (CC-e) vs NFC-e (Modelo 65)
- O Manual de Orientação do Contribuinte (MOC) proíbe expressamente Carta de Correção para NFC-e (Modelo 65), gerando rejeição na SEFAZ.
- Na tela `/fiscal-documents`, o botão e o modal de **Carta de Correção Eletrônica (CC-e)** aparecem **EXCLUSIVAMENTE para NF-e (Modelo 55)**.

### 3. Cancelamento de Venda vs Mercadoria Entregue vs Devolução
- **Cancelamento de Venda antes da entrega / saída da mercadoria:**
  - Desfaz o pedido operacionalmente (`status = 'cancelled'`).
  - Estorna as saídas de estoque vinculadas via `inventory_moves`.
  - Se houver NF-e/NFC-e autorizada e elegível para cancelamento fiscal (`canCancelFiscalDocument`), dispara o evento de cancelamento para a SEFAZ.
- **Mercadoria já entregue (Pedido com status `fulfilled` / Atendido):**
  - **PROIBIDO CANCELAR A VENDA DIRETO:** A mercadoria já circulou e foi entregue ao cliente.
  - A operação deve obrigatoriamente seguir o fluxo de **Registrar Devolução** (Total ou Parcial), mantendo o histórico da venda original e solicitando ao módulo fiscal a emissão do documento fiscal de entrada apropriado.

### 4. Validação Resiliente de Cancelamento Fiscal (`canCancelFiscalDocument`)
- A elegibilidade de cancelamento é avaliada pela camada fiscal (`canCancelFiscalDocument(document)`), considerando se a mercadoria já circulou e os parâmetros por UF/modelo/ambiente, evitando regras fixas espalhadas no frontend.

---

## 📋 CONFIGURAÇÕES DA EMPRESA EMITENTE

- **Razão Social / Fantasia:** Móveis Morante
- **CNPJ:** `44.512.248/0001-07`
- **Inscrição Estadual (IE):** `9091234567` | **CRT:** `1 - Simples Nacional`
- **Endereço Completo:** R. Cascavel, 306, Guaraituba, Colombo - PR, CEP: 83410-270 (Código IBGE Município: `4105805`)
- **CSC NFC-e Homologação SEFAZ-PR:** `cscId: "000001"`, `cscToken: "XBMSLQTB4VWHAPSUJLG14Q4YDYZRQLSUQRMF"`
- **Numeração Sequencial Inicial:** Padrão configurado a partir de `#000700` (`nfeNextNumber: 700`, `nfceNextNumber: 700`).
