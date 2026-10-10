---
name: nfe-sefaz-direto
description: >
  Status e diretrizes oficiais da implementacao de emissao de NF-e/NFC-e diretamente
  com o SEFAZ-PR e sincronizacao/recepcao automatica de NF-e de entrada via Distribuicao DF-e
  (NFeDistribuicaoDFe) e Manifestacao do Destinatario no Ambiente Nacional. Consulte esta skill para alterar
  ou diagnosticar regras/fluxos técnicos de: NF-e, NFC-e, Distribuicao DF-e, NFeDistribuicaoDFe, Ambiente Nacional,
  Manifestacao do Destinatario, distNSU, consChNFe, consNSU, nota fiscal, fiscal, certificado digital,
  DANFE, XML, SEFAZ, emissao, tributacao, cancelamento ou devolucao fiscal.
---

# NF-e SEFAZ Direto & Distribuição DF-e — Diretrizes Oficiais e Arquitetura

## Quando aplicar esta Skill

Use para mudanças ou diagnóstico técnico de emissão NF-e/NFC-e e de integração Distribuição DF-e/Manifestação do Destinatário.

## Quando NÃO aplicar

Não a use para repetir auditoria técnica completa ao retomar um E2E já preparado; use `testes-seguros-erp` para gates e continuidade. Regras normativas fiscais seguem `fiscal-nfe-nfce-official-docs`.

## 🏛️ Contexto e Arquitetura Geral

O Morante Hub opera em dois pilares fiscais diretos e integrados:
1. **Emissão de Documentos Fiscais de Saída:** existem fluxos para NF-e (Modelo 55) e NFC-e (Modelo 65) **diretamente com o SEFAZ-PR** (sem API intermediária como Bling, Focus NFe ou Nuvem Fiscal). A matriz de modelo está em `docs/fiscal/decisao-modelo-varejo-pr.md`; a cobertura e os bloqueios atuais estão em `docs/fiscal/status-testes-homologacao.md`. Não inferir elegibilidade nem prontidão apenas pela existência de um serializer.
2. **Sincronização Automática de NF-e de Entrada:** Recepção automática de NF-e destinadas ao CNPJ da empresa por meio do serviço oficial **NFeDistribuicaoDFe** e **Manifestação do Destinatário** atendidos pelo **Ambiente Nacional**, integrando diretamente ao pipeline e importador existente do Morante Hub sem arquiteturas paralelas.

---

## 🚦 ORDEM OBRIGATÓRIA DE TRABALHO PARA SINCRONIZAÇÃO / DF-e

Para gates, evidência reutilizável e retomada sem repetir etapas aprovadas, siga `testes-seguros-erp`. O roteiro abaixo se aplica a mudanças ou diagnóstico técnico do fluxo DF-e, não é uma lista para reexecutar durante cada E2E fiscal. Consulte fonte oficial vigente quando alterar comportamento normativo, endpoint, schema ou protocolo, e somente a parte pertinente à dúvida atual.

Toda e qualquer intervenção, planejamento ou código relacionado a sincronização SEFAZ e Distribuição DF-e **DEVE** seguir impreterivelmente esta ordem de 5 etapas:

1. **ETAPA 1 — AUDITORIA DA IMPLEMENTAÇÃO EXISTENTE NO MORANTEHUB:**
   - **NÃO presumir que é necessário criar do zero.**
   - Mapear e auditar no projeto antes de tocar no código:
     - Módulo de NF-e de entrada (`/inbound-invoices` ou similar);
     - Tabelas de NF-e, itens, mapeamentos de fornecedores e produtos;
     - Como a chave de acesso de 44 posições é validada e como duplicidades são tratadas (`UNIQUE(company_id, access_key)`); preservar letras no bloco CNPJ é requisito da NT 2026.004, mas a cobertura atual do ERP é parcial (consulte o status central).
     - Importador e parser de XML existente (normalização de campos, impostos, NCM, CFOP);
     - Onde e como o XML é atualmente armazenado e recuperado;
     - Como certificados digitais (A1 / PFX / P12) já são armazenados e tratados (segurança, backend-only);
     - Rota e mecanismo manual existente de consulta de chave / upload de DANFE/XML;
     - Jobs, agendamentos ou cron existentes no backend/Supabase.
   - **Proibido criar uma segunda arquitetura fiscal paralela.** A Distribuição DF-e é apenas mais uma fonte de entrada para o mesmo importador.

2. **ETAPA 2 — CONSULTAR A DOCUMENTAÇÃO OFICIAL VIGENTE QUANDO A REGRA MUDAR OU ESTIVER INCERTA:**
   - Siga os requisitos e a precedência de fontes descritos em `fiscal-nfe-nfce-official-docs`; consulte somente os materiais oficiais pertinentes à mudança atual.
   - Para DF-e, as referências relevantes incluem:
     - Portal Nacional da NF-e (`nfe.fazenda.gov.br`);
     - Notas Técnicas vigentes: NT 2014.002 e suas versões/atualizações vigentes para Distribuição DF-e;
     - Manual de Orientação do Contribuinte (MOC) e schemas XML oficiais (`retDistDFeInt`, `docZip`, `resNFe`, `procNFe`);
     - SEFA/PR e Ambiente Nacional para registro de eventos da Manifestação do Destinatário.
   - Divergência normativa deve ser resolvida conforme a skill fiscal oficial antes de alterar comportamento.

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
- `consChNFe`: Usado para consulta pontual de chave de 44 posições (por digitação, bipagem ou QR Code da DANFE física). O padrão oficial admite letras no bloco CNPJ conforme NT 2026.004; conferir o suporte real do código antes de afirmar compatibilidade. Respeitar a regra oficial: se o destinatário ainda não manifestou a nota, a SEFAZ devolve apenas o resumo.
- `consNSU`: Exclusivo para reaver pontualmente um NSU específico que sofreu falha ou lacuna, nunca para polling contínuo.

### 7. Unificação do Pipeline e Prevenção de Duplicidades
- **Convergência Total:** O XML descompactado da SEFAZ deve cair exatamente no mesmo pipeline de validação e importação do upload manual (`inboundInvoiceParser`, vinculação de fornecedores, vinculação de produtos por código/SKU, cálculo de custos fiscais).
- **Sem Duplicidade:** A chave de 44 posições é a autoridade única (`UNIQUE(company_id, access_key)`). Normalize apenas separadores de apresentação e preserve caracteres alfanuméricos permitidos. Se uma NF-e já foi importada manualmente ou já constar no banco, atualizar metadados sem duplicar o registro fiscal nem criar fornecedores/itens redundantes.

### 8. Segurança e Certificado Digital
- Certificado digital A1 (PFX/P12 e senha) deve ser gerenciado com secrets seguros no backend.
- Nunca trafegar certificado ou chave privada para o bundle do cliente, nunca registrar senha em logs, e sanitizar XMLs contra XXE.

---

---

## ⚖️ CANCELAMENTO, ESTORNO E DEVOLUÇÃO

- Os pontos de entrada do Pedido de Venda e da tela de Notas Fiscais de Saída usam a mesma operação comercial transacional e a mesma política/serviço fiscal central. A tela fiscal pode iniciar o cancelamento vinculado, mas não altera o status do pedido diretamente.
- A decisão de circulação usa `hasGoodsCirculated(order)`: `fulfilled` conta tanto para entrega quanto para retirada; evidência de saída ou trânsito também deve ser considerada. Com circulação, bloquear cancelamento como operação não realizada e não gerar estorno. Após retorno físico, usar devolução vinculada e preservar a NF-e original.
- Sem circulação e sem documento autorizado (ausente, rejeitado ou nunca autorizado), cancelar pedido/estoque sem evento fiscal. Sem circulação e com documento autorizado, selecionar automaticamente o cancelamento SEFAZ dentro do prazo ou o estorno quando permitido; o usuário não escolhe o efeito.
- No Paraná, o prazo é 168 horas para NF-e 55 e 30 minutos para NFC-e 65, conforme a orientação estadual vigente. Centralizar os prazos e cobrir o instante exato do limite.
- Estoque e atualização comercial são confirmados na transação do pedido. A chamada SEFAZ acontece após o commit; falha ou timeout fiscal exige tentativa idempotente e reconciliação, sem desfazer o fato comercial confirmado.
- Criar uma devolução não confirma retorno físico nem emite documento. Coleta só conclui quando confirmada como “Coletada”; entrega física pelo cliente conclui como “Recebida”. A entrada de estoque acompanha a confirmação física na transação do pedido. A NF-e de devolução é preparada na área fiscal depois do retorno. A cobertura atual de devolução fiscal originada por NFC-e 65 deve ser consultada no status central.

## Estado do código e fontes de referência

- Regras e estado de cobertura: `docs/fiscal/status-testes-homologacao.md`.
- Política oficial e fontes atuais: `docs/fiscal/manuais/README.md` e `docs/fiscal/decisao-modelo-varejo-pr.md`.
- Pedido de Venda: `erp/src/pages/App/SalesOrder/OrderHistoryList/useOrderHistoryOperations.ts`.
- Iniciação pela tela fiscal: `erp/src/pages/App/FiscalDocuments/services/fiscalCancellationService.ts`.
- Operação comercial compartilhada: `erp/src/pages/utils/orderMutationService.ts` e `erp/src/pages/utils/orderUpdateService.ts`.
- Política/efeito fiscal compartilhados: `erp/src/pages/utils/nfe/nfeService.ts`, `api/nfe/order-cancellation-policy.ts` e `api/nfe/cancel.ts`.

Dados fiscais do emitente, credenciais, CSC e sequência são lidos da configuração em runtime; não manter valores de uma empresa específica nesta skill. Segredos permanecem em armazenamento seguro e nunca em documentação, logs ou bundle do cliente.

## Referências e fonte canônica de documentação

- Regras normativas, fontes oficiais, ambiente HML/Produção, CNPJ alfanumérico e idempotência fiscal: `.agents/skills/fiscal-nfe-nfce-official-docs/SKILL.md`.
- Gates e retomada de testes: `.agents/skills/testes-seguros-erp/SKILL.md`.
