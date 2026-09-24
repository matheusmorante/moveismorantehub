---
name: nfe-sefaz-direto
description: >
  Status e diretrizes oficiais da implementacao de emissao de NF-e/NFC-e diretamente
  com o SEFAZ-PR e sincronizacao/recepcao automatica de NF-e de entrada via Distribuicao DF-e
  (NFeDistribuicaoDFe) e Manifestacao do Destinatario no Ambiente Nacional. Consulte esta skill SEMPRE
  que for trabalhar com: NF-e, NFC-e, Distribuicao DF-e, NFeDistribuicaoDFe, Ambiente Nacional,
  Manifestacao do Destinatario, distNSU, consChNFe, consNSU, nota fiscal, fiscal, certificado digital,
  DANFE, XML, SEFAZ, emissao, tributacao, cancelamento ou devolucao fiscal.
---

# NF-e SEFAZ Direto & Distribuição DF-e — Diretrizes Oficiais e Arquitetura

## 🏛️ Contexto e Arquitetura Geral

O Morante Hub opera em dois pilares fiscais diretos e integrados:
1. **Emissão de Documentos Fiscais de Saída:** NF-e (Modelo 55 - Entrega) e NFC-e (Modelo 65 - Retirada) **diretamente com o SEFAZ-PR** (sem API intermediária como Bling, Focus NFe ou Nuvem Fiscal).
2. **Sincronização Automática de NF-e de Entrada:** Recepção automática de NF-e destinadas ao CNPJ da empresa por meio do serviço oficial **NFeDistribuicaoDFe** e **Manifestação do Destinatário** atendidos pelo **Ambiente Nacional**, integrando diretamente ao pipeline e importador existente do Morante Hub sem arquiteturas paralelas.

---

## 🚦 ORDEM OBRIGATÓRIA DE TRABALHO PARA SINCRONIZAÇÃO / DF-e

Toda e qualquer intervenção, planejamento ou código relacionado a sincronização SEFAZ e Distribuição DF-e **DEVE** seguir impreterivelmente esta ordem de 5 etapas:

1. **ETAPA 1 — AUDITORIA DA IMPLEMENTAÇÃO EXISTENTE NO MORANTEHUB:**
   - **NÃO presumir que é necessário criar do zero.**
   - Mapear e auditar no projeto antes de tocar no código:
     - Módulo de NF-e de entrada (`/inbound-invoices` ou similar);
     - Tabelas de NF-e, itens, mapeamentos de fornecedores e produtos;
     - Como a chave de acesso (44 dígitos) é validada e como duplicidades são tratadas (`UNIQUE(company_id, access_key)`);
     - Importador e parser de XML existente (normalização de campos, impostos, NCM, CFOP);
     - Onde e como o XML é atualmente armazenado e recuperado;
     - Como certificados digitais (A1 / PFX / P12) já são armazenados e tratados (segurança, backend-only);
     - Rota e mecanismo manual existente de consulta de chave / upload de DANFE/XML;
     - Jobs, agendamentos ou cron existentes no backend/Supabase.
   - **Proibido criar uma segunda arquitetura fiscal paralela.** A Distribuição DF-e é apenas mais uma fonte de entrada para o mesmo importador.

2. **ETAPA 2 — CONSULTAR A DOCUMENTAÇÃO OFICIAL VIGENTE:**
   - **NUNCA implementar com base em memória interna, suposições, posts de blogs ou fóruns.**
   - Consultar fontes oficiais vigentes antes de escrever código:
     - Portal Nacional da NF-e (`nfe.fazenda.gov.br`);
     - Notas Técnicas vigentes: NT 2014.002 e suas versões/atualizações vigentes para Distribuição DF-e;
     - Manual de Orientação do Contribuinte (MOC) e schemas XML oficiais (`retDistDFeInt`, `docZip`, `resNFe`, `procNFe`);
     - SEFA/PR e Ambiente Nacional para registro de eventos da Manifestação do Destinatário.
   - Se houver divergência entre prompts anteriores e a documentação oficial mais recente, a **documentação oficial prevalece**.

3. **ETAPA 3 — DESENHAR FLUXO E ARQUITETURA DE FORMA CONCISA:**
   - Documentar brevemente o que já existe, o que será estendido e o que realmente precisa ser criado.
   - Preservar o fluxo manual existente como contingência permanente (para NF-e antigas fora da janela nacional, contingência ou XMLs manuais).

4. **ETAPA 4 — IMPLEMENTAÇÃO INCREMENTAL NO BACKEND (COM ISOLAMENTO DEV/PROD):**
   - Toda comunicação DF-e deve acontecer **exclusivamente no backend** (Edge Functions ou serviço Node/backend). **Nunca** expor ou manipular certificado digital ou mTLS no frontend (React ou React Native).
   - Aplicar locks anti-concorrência, controle de concorrência por CNPJ/ambiente, tratamento de cursor NSU e rate limits.

5. **ETAPA 5 — TESTES COM MOCKS E HOMOLOGAÇÃO ANTES DE PRODUÇÃO:**
   - Mockar serviços fiscais em testes automatizados (Vitest/Playwright). Não bombardear os Web Services oficiais durante suítes de teste.
   - Validar ponta a ponta primeiro em **Homologação**, com separação estrita de cursor e certificados, antes de liberar em Produção.

---

## 📡 DIRETRIZES TÉCNICAS E REGRAS OFICIAIS DA DISTRIBUIÇÃO DF-E (NFeDistribuicaoDFe)

### 1. Endpoints e Ambiente Nacional
- **Ambiente Nacional:** A Distribuição DF-e (`NFeDistribuicaoDFe` método `nfeDistDFeInteresse`) e os eventos de **Manifestação do Destinatário** são processados no **Ambiente Nacional** (não no Web Service estadual do SEFAZ-PR).
- Os schemas, URLs de homologação e produção devem ser obtidos estritamente da documentação oficial e notas técnicas vigentes.

### 2. Cursor distNSU, ultNSU e maxNSU
- **Mecanismo Principal:** `distNSU` é a forma padrão da sincronização automática. Morante Hub envia o último NSU consultado (`ultNSU`), e o Ambiente Nacional retorna lote de documentos compactados (`docZip`), junto com os novos `ultNSU` e `maxNSU`.
- **NSU é Metadado Técnico:** Nunca inventar, calcular ou tentar extrair NSU do corpo do XML original da NF-e. O NSU é gerado exclusivamente pelo Ambiente Nacional.
- **Continuidade de Lotes:** Se `ultNSU < maxNSU`, existem mais documentos na fila para consumir. O sistema deve continuar do `ultNSU` retornado. Se `ultNSU == maxNSU`, a fila está atualizada.
- **Primeira Sincronização:** Seguir a regra oficial da NT 2014.002 para primeiro acesso (last_nsu = 0 / 15 dias). Não assumir que será possível puxar todo o histórico antigo (o upload manual atua como contingência).

### 3. Tratamento Estrito de Códigos de Status (cStat) e Prevenção de Consumo Indevido (656)
- **cStat 138 (Documento localizado):** Processar os documentos do lote normalmente e persistir o novo `ultNSU`.
- **cStat 137 (Nenhum documento localizado):** O Ambiente Nacional indica que não há novidades. **Proibido consultar em loop.** Deve-se respeitar imediatamente o intervalo mínimo de cooldown (pelo menos 1 hora) configurando `next_allowed_sync_at`.
- **cStat 656 (Rejeição: Consumo Indevido):** Ocorre se o sistema requisitar repetidamente antes do cooldown ou violar regras de consulta.
  - **Bloqueio Absoluto:** NUNCA disparar retry loop ao receber 656.
  - Registrar log completo: timestamp, CNPJ, operação, NSU enviado, ultNSU, maxNSU, xMotivo e aguardar o tempo estipulado na rejeição oficial.

### 4. Concorrência e Locks
- É estritamente proibido permitir que o job automático do scheduler, um clique do usuário no botão "Sincronizar SEFAZ" ou múltiplas instâncias de backend consultem distNSU concorrentemente para o mesmo CNPJ e ambiente.
- Adquirir lock atômico por `(company_id, cnpj, environment)` antes de iniciar a consulta, persistir o `ultNSU` de forma transacional e liberar o lock ao final.

### 5. resNFe (Resumo) vs procNFe (XML Completo) e Manifestação do Destinatário
- Nem todo `docZip` contém a NF-e completa: o Ambiente Nacional distribui resumos (`resNFe`) e documentos completos (`procNFe` / `nfeProc`).
- **Resumo (`resNFe`):** Contém chNFe, CNPJ/CPF emitente, nome/razão social, IE, data de emissão, tipo, valor total e digest value. NÃO contém os itens da nota.
  - Deve ser registrado no ERP em estado de resumo (`SUMMARY_ONLY` / descoberto), aguardando obtenção do XML completo.
- **Obtenção do XML Completo via Manifestação:**
  - Para notas onde só há `resNFe`, o destinatário precisa registrar um evento de manifestação no Ambiente Nacional (comumente **Ciência da Operação**, código `210210`).
  - **Diferença Crucial:** Ciência da Operação indica apenas conhecimento da operação, permitindo o download do XML completo. NÃO é Confirmação da Operação (`210200`). **NUNCA registrar manifestação conclusiva (Confirmação da Operação / Desconhecimento / Operação Não Realizada) automaticamente sem ação expressa do usuário!**
  - Após autorização do evento no Ambiente Nacional, a NF-e completa (`procNFe`) torna-se disponível em consulta posterior via `distNSU` ou `consChNFe`.

### 6. Consulta Pontual pela Chave (`consChNFe`) e `consNSU`
- `consChNFe`: Usado para consulta pontual de chave de 44 dígitos (por digitação, bipagem ou QR Code da DANFE física). Respeitar a regra oficial: se o destinatário ainda não manifestou a nota, a SEFAZ devolve apenas o resumo.
- `consNSU`: Exclusivo para reaver pontualmente um NSU específico que sofreu falha ou lacuna, nunca para polling contínuo.

### 7. Unificação do Pipeline e Prevenção de Duplicidades
- **Convergência Total:** O XML descompactado da SEFAZ deve cair exatamente no mesmo pipeline de validação e importação do upload manual (`inboundInvoiceParser`, vinculação de fornecedores, vinculação de produtos por código/SKU, cálculo de custos fiscais).
- **Sem Duplicidade:** A chave de 44 dígitos é a autoridade única (`UNIQUE(company_id, access_key)`). Se uma NF-e já foi importada manualmente ou já constar no banco, atualizar metadados sem duplicar o registro fiscal nem criar fornecedores/itens redundantes.

### 8. Segurança e Certificado Digital
- Certificado digital A1 (PFX/P12 e senha) deve ser gerenciado com secrets seguros no backend.
- Nunca trafegar certificado ou chave privada para o bundle do cliente, nunca registrar senha em logs, e sanitizar XMLs contra XXE.

---

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
