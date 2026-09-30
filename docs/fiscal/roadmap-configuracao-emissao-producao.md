# Roadmap Canônico: NF-e e NFC-e de Saída (MoranteHub)

**Atualizado em:** 30/09/2026
**Fonte de Verdade para:** Emissão de Documentos Fiscais de Saída (NF-e/NFC-e) diretamente com o SEFAZ-PR.

## Ponto de retomada em outro PC — 30/09/2026

**Trabalho interrompido a pedido da usuária. Não houve autorização real da SEFAZ. A próxima ação é conferir a publicação da correção TLS e consultar a tentativa existente, sem criar outra nota.**

### Escopo autorizado nesta etapa

- Prioridade exclusiva: NF-e modelo 55 de saída, pedido real existente, SEFAZ-PR **homologação (`tpAmb=2`)**. Produção fiscal permanece bloqueada; não expandir para NFC-e, eventos, contingência ou outras funções para concluir esta etapa.
- Preservar pedido original, produtos, variações, quantidades, valores, descontos, frete, pagamentos, estoque, reservas, financeiro e contas a receber. Gravar somente os registros fiscais de homologação. Não inventar dados comerciais/fiscais ausentes.
- CSOSN 103 configurável no backend como padrão HML somente na ausência de regra/exceção/seleção explícita. Os cinco campos confirmados no modal (NCM, CFOP, origem, CEST, CSOSN) devem chegar iguais ao snapshot e XML; dados inválidos ou incompatíveis são rejeitados.

### Tentativa real já existente — preservar

| Informação | Estado registrado |
|---|---|
| Pedido | **3474**, `dc0641a1-f554-4769-a864-314c46a80f2e` |
| Valores verdadeiros | 1 produto, R$ 349,00 + frete R$ 30,00; cartão de crédito R$ 379,00 |
| Documento fiscal | `a9c29dd4-be12-46c2-9a8b-3effd1852b09` |
| Requisição original | `a682418b-2a7b-4b74-aa62-1fd75f048bbd` |
| Modelo / ambiente / série / número | **55 / 2 / 900 / 700** |
| Estado | **Pendente**, XML assinado salvo, sem protocolo confirmado |
| Transmissão | `HML_TRANSMISSION_UNCERTAIN`; não comprova recebimento pela SEFAZ |
| Consulta | `HML_RECONCILIATION_REQUIRED`; reenvio permanece bloqueado |
| Causa concreta da falha | **`SELF_SIGNED_CERT_IN_CHAIN`** na consulta publicada |

A chave de acesso e o XML integral estão no registro fiscal do Supabase; recuperá-los pelo ID acima, sem expor dados pessoais em logs/documentação. Não apagar a tentativa, reiniciar sequência, alterar XML persistido ou gerar outra chave/número para contornar a pendência.

### Correções e evidências já obtidas

- Carregamento ESM/CommonJS corrigido com bundle fiscal CJS único e wrappers do ERP; inicialização real passou localmente e na Vercel.
- Payload completo dos cinco campos, validação estrita, snapshot imutável, comparação com XML antes do SOAP e preservação ao fechar/reabrir o modal implementados. Testes separados e simultâneos até o XML do transporte passaram. NCM inválido digitado não conserva silenciosamente o valor anterior.
- Pipeline `HML_NORMAL_SALE_V1` reaproveita determinação, composição de serviços/descontos, assinatura, XSD, leases, consulta e persistência. Exceções CFOP/alíquotas/PIS/COFINS incompatíveis bloqueiam a matriz limitada de venda interna CRT 1; não são substituídas.
- Playwright autenticado acionou a emissão normal do pedido 3474. Campos iguais entre formulário, payload, snapshot e XML persistido: NCM 94034000, CFOP 5102, origem 0, CEST vazio, CSOSN 103 (`ICMSSN102`).
- Assinatura do XML real verificada independentemente com seu certificado público. A1 dentro da validade, até 25/09/2027.
- Comparação de conteúdo/hashes antes/depois da tentativa e consultas: pedido, itens, pagamentos, movimentos de estoque vinculados, contas a receber e transações financeiras inalterados. Gatilho fiscal observado apenas vincula o snapshot; não movimenta estoque/financeiro.
- ID do token ativo HML informado pela usuária: **2**, configurado como **`NFE_ID_CSRT_HOMOLOGACAO=02`**. Segredo existente preservado. Readiness publicado passou com `configurationIssues: []`.
- Diagnóstico de transporte registra apenas códigos de rede/TLS e status HTTP, sem Axios config, certificados privados, XML ou segredo.
- Correção TLS implementada em `api/nfe/sefazHmlTrust.ts` e `sefazClient.ts`: raiz ICP-Brasil v10 baixada por HTTPS do ITI, fingerprint comparada com a cadeia do servidor; adicionada às autoridades padrão somente no host HML exato. **`rejectUnauthorized: true` mantido**. Ver [evidência de confiança TLS](sefaz-hml-tls.md).
- Validações focadas aprovadas: matriz de venda real (10 testes); diagnóstico/transmissão/consulta (28); confiança TLS/serializer (11); demais regressões fiscais/modal preservadas. TypeScript fiscal, lint focado e inicialização passaram após a correção TLS. Esses testes não comprovam autorização SEFAZ.

### Publicações e banco

- Última publicação confirmada pronta, com diagnóstico: `dpl_CLMKYH5exeAjDFc88orZN54mZeUp`, `https://morantehub-qwqpr61jz-matheusmorantes-projects.vercel.app`.
- **Publicação com correção TLS enviada antes da interrupção:** `dpl_AjcYhTvZFauxjgrLpNRaamqTeCFa`, `https://morantehub-kf17dazo1-matheusmorantes-projects.vercel.app`. O comando de upload concluiu; a resposta inicial era `INITIALIZING`. **Conferir READY/logs no outro PC; execução remota da correção TLS ainda não foi validada. Não publicar outra versão sem necessidade.**
- Os deployments usam o alvo Vercel `production` para carregar as credenciais existentes, com `--skip-domain`; isso não libera emissão fiscal de produção. O backend permanece HML e não houve promoção manual do domínio principal.
- Supabase operacional confirmado: **`hkoxhourxwlddgsfdgws`**. Não criar projeto/branch HML nem executar reset, testes destrutivos, fault injection ou concorrência no remoto.
- Migrations locais 01434–01437 correspondem ao lote remoto `20260930172744_nfe_hml_csosn_snapshot_atomic_isolation`; 01438–01439 ao lote `20260930201939_nfe_modal_selections_and_real_order_hml`. **Já aplicadas: não reaplicar cegamente nem usar `db push` geral.** Advisors antes/depois sem novos alertas fiscais.
- Docker indisponível. Falhas transacionais/concorrência das migrations novas ainda precisam de PostgreSQL isolado; não apresentar testes em memória como prova de rollback do banco real.

### Ordem exata para continuar

1. Sincronizar o código desta sessão no outro PC. **As alterações estão locais na branch `main`, sem commit/push desta sessão.** Este arquivo isolado não transfere a implementação. Não copiar `.env`, certificado A1, senhas ou segredos para o repositório; autenticar Vercel/Supabase pelos meios existentes no outro PC.
2. Conferir o estado e os logs de `dpl_AjcYhTvZFauxjgrLpNRaamqTeCFa`. Se READY, verificar `item-defaults` autenticado: ambiente 2, `productionApproved=false`, configuração sem pendências.
3. Consultar **o documento existente** pelo endpoint `/api/nfe/consult`, com `documentId=a9c29dd4-be12-46c2-9a8b-3effd1852b09`. Usar a publicação TLS acima e registrar o resultado real. Preservar XML/chave/número e comparar novamente os vínculos operacionais.
4. Se a consulta confirmar autorização, conferir/persistir protocolo, chave, `cStat=100`, XML, itens fiscais, histórico e recuperação idempotente. Se confirmar **217**, permitir somente reenvio explícito do **mesmo documento/XML/chave**, pelo mecanismo de retry já existente. Resposta incerta continua bloqueando reenvio; nenhuma nova numeração.
5. Investigar eventual rejeição real conforme a documentação oficial. Cada correção/publicação deve estar ligada a uma causa identificada. Não repetir builds sem alterações ou evidência nova.
6. Após primeira autorização real e ausência comprovada de efeitos comerciais, testar poucos pedidos reais com múltiplos produtos, descontos, frete e formas de pagamento diferentes. A matriz atual é limitada; exceções sem suporte devem bloquear.
7. Atualizar este roadmap e o relatório com retorno SEFAZ efetivo, protocolo persistido e evidências de isolamento. **Produção fiscal continua fora do escopo.**

Scripts disponíveis: `scripts/testing/nfe-hml-ui-audit.cjs` (somente leitura por padrão; emissão controlada apenas com `--emit-hml-3474`, que recusa uma tentativa HML existente), `nfe-hml-live.cjs` (readiness/consulta), `nfe-hml-document-audit.cjs` (assinatura do documento salvo), `nfe-operational-audit.cjs` (hashes privados). Para retomar a nota pendente, utilizar consulta/retry por documento; **não repetir o modo de primeira emissão**. Dados pessoais/credenciais são usados apenas em memória e não devem ser incluídos nos artefatos compartilhados.

Referências complementares: [limites e evidências do pedido real](limites-teste-pedido-real-hml.md), [auditoria fiscal, seção 17](auditoria-dominio-determinacao-tributaria.md), [índice oficial de manuais](manuais/README.md).

## 1. Estado Atual e Correções Conceituais (Auditoria Revisada)

**Status de produção: BLOQUEADO até aprovação da matriz real de homologação SEFAZ-PR abaixo.** O módulo possui implementação e testes locais, mas não deve ser considerado pronto para emissão fiscal em produção antes de haver evidência real aprovada para os modelos 55 e 65. Homologação de testes não equivale a autorização para produção.

A auditoria identificou exageros e incorreções conceituais na análise anterior que agora estão corrigidos:
- **Homologação x Produção:** O código suporta configurar ambos, mas **Produção não está "homologada"**. O fato de existirem endpoints não significa que a emissão de produção foi validada ponta a ponta. O status real é: *código preparado e testado localmente, mas a integração contra a SEFAZ em Produção carece de validação e operação efetiva*.
- **Inutilização de Numeração:** Foi incorretamente classificada como um evento comum (`tpEvento=107`). Inutilização não é tratada por evento da nota, mas sim por um web service próprio e layout específico (`inutNFe`).
- **Contingência Subestimada:** Não existe regra única como "basta usar `tpEmis=9`" para ambos os modelos.
  - **NFC-e (Mod 65) no PR:** Adota contingência offline (`tpEmis=9`), o que exige guardar XML assinado e transmiti-lo depois.
  - **NF-e (Mod 55) no PR:** Adota contingências complexas como SVC-RS ou EPEC, que requerem comunicação com ambientes nacionais distintos. A lógica deve ser implementada e auditada separadamente.
- **Carta de Correção (CC-e):** É um evento *posterior* à autorização. Não bloqueia a emissão principal da NF-e, logo foi reclassificada para a fila de completude operacional (P1), não sendo prioritária (P0) para ligar a chave do emissor.

## 2. Roadmap por prioridade

### 🔴 P0 — Bloqueador de produção: homologação ponta a ponta real

Executar contra os web services oficiais de homologação SEFAZ-PR. Conforme instrução de 30/09/2026, a NF-e 55 deve usar pedido real existente, exclusivamente `tpAmb=2`, sem efeitos comerciais; não criar massa comercial fictícia para comprovar autorização. Cada execução deve registrar modelo, cenário, request XML efetivamente transmitido (sanitizado apenas de dados pessoais quando o artefato for compartilhado; preservar hash do XML integral), chave de acesso, `cStat`/`xMotivo`, protocolo quando emitido, estado final de tentativa e documento no banco, e resultado observado na interface.

**Regra de aceite por cenário:** o status só pode mudar de “não executado” para “aprovado” quando houver evidências persistidas e verificáveis dos sistemas envolvidos. Relato textual, captura de tela isolada ou teste local não são suficientes. Para emissão autorizada, conferir correspondência entre chave de acesso, protocolo, `cStat`, XML final/protocolado e documento persistido no banco; anexar também a evidência da resposta SEFAZ e do estado apresentado pela interface. Guardar artefatos com acesso restrito e identificador/hash para permitir revisão sem expor dados pessoais ou credenciais.

| Cenário | Modelo | Evidências obrigatórias | Status |
|---|---:|---|---|
| Emissão autorizada | 55 | XML assinado/transmitido, chave, `cStat`, protocolo, registro persistido e UI autorizada | ⏳ Pedido 3474, nota 700/900 pendente; falha TLS identificada, correção enviada, sem autorização |
| Emissão autorizada | 65 | XML assinado/transmitido, chave, `cStat`, protocolo, registro persistido e UI autorizada | ⬜ Não executado nesta auditoria |
| Rejeição fiscal conhecida | 55 e 65 | XML, `cStat`/motivo, estado rejeitado no banco e orientação/UI sem falso sucesso | ⬜ Não executado nesta auditoria |
| Consulta posterior de documento autorizado | 55 e 65 | resposta de consulta, protocolo/estado reconciliado no banco e UI atualizada | ⬜ Não executado nesta auditoria |
| Cancelamento fiscal elegível | 55 e 65 | evento transmitido, retorno SEFAZ, protocolo e estado reconciliado; respeitar regra de circulação/prazo do modelo | ⬜ Não executado nesta auditoria |
| Carta de Correção Eletrônica | 55 | evento 110110 assinado/transmitido, sequência, `cStat`/protocolo, XML/resposta persistidos e tentativa repetida idempotente | ⬜ Não executado nesta auditoria |
| Emissão com resposta perdida/pendente e recuperação | 55 e 65 | tentativa e XML persistidos antes do envio, consulta posterior e reconciliação sem duplicar autorização | ⬜ Não executado nesta auditoria |

**Gate:** só marcar P0 concluído e reavaliar liberação de produção quando todas as linhas aplicáveis tiverem evidências anexadas e revisadas. Não registrar chaves, dados pessoais ou XML integral em logs públicos; armazenar artefatos de homologação com acesso restrito.

### 🟠 P1 — Segurança operacional

- [ ] Concorrência de numeração: duas emissões simultâneas não obtêm a mesma reserva nem criam duplicidade.
- [ ] Timeout após transmissão: manter tentativa pendente e consultar antes de qualquer reenvio.
- [ ] SEFAZ autoriza, mas a resposta se perde: recuperar protocolo e persistir/reconciliar sem nova emissão.
- [ ] Rejeição 217: permitir apenas retransmissão explícita da mesma chave e do mesmo XML.
- [ ] Repetição/retry idempotente da requisição e proteção contra cliques repetidos.

Evidência local já indicada: reserva atômica foi exercitada com duas conexões PostgreSQL; existem testes unitários para timeout/217 em `transmitOperationDraft.test.ts`. Isso não substitui a matriz real P0 nem prova a cadeia completa de migrations/API/UI.

### 🟡 P2 — Operações fiscais ainda faltantes

- [ ] Inutilização de faixa numérica pelo serviço e leiaute próprios `inutNFe`.
- [ ] Contingência offline de NFC-e, incluindo guarda de XML assinado, transmissão posterior e reconciliação.
- [ ] Contingências de NF-e aplicáveis ao PR (SVC-RS/EPEC), com regras e serviços separados da NFC-e.
- [x] Carta de Correção Eletrônica (CC-e), somente para modelo 55. API/UI, sequência/idempotência, confirmação do retorno e reconciliação estão implementadas e cobertas por testes locais focados; falta validar na matriz de homologação P0.

### 🟢 P3 — UX de rejeições

- [ ] Mapear rejeições comuns para instruções práticas e acionáveis de correção.
- [ ] Permitir corrigir e reenviar mantendo a trilha da tentativa e sem reutilizar chave/XML quando o conteúdo fiscal tiver mudado.

### 🔵 P4 — Operação madura

- [ ] Métricas de emissão/autorização/rejeição, latência SEFAZ e uso de contingência.
- [ ] Logs estruturados e rastreáveis, com sanitização de dados pessoais e segredos.
- [ ] Alertas para tentativas pendentes, falhas de reconciliação e contingências não transmitidas.
- [ ] Painel de rejeições, latência e contingências.

### Escopo operacional fora do gate fiscal

Envio automático de XML/DANFE por WhatsApp ou e-mail é uma funcionalidade operacional independente. Não é critério para considerar a emissão fiscal válida nem para aprovar o gate P0.

## 3. Histórico técnico e prioridade anterior

### 🔴 P0 — Bloqueia Emissão Segura (Caminho Principal, histórico)
*Focar exclusivamente em garantir que o fluxo base não tenha pontas soltas antes de avançar para eventos acessórios.*
- **Geração Normal 55/65, XML e Assinatura:** Garantir geração fiel ao MOC vigente.
- **Numeração e Persistência Seguras:** Numeração estritamente atômica.
- **Timeouts e Reconciliação (O gargalo atual):** Falhas de rede ou de Edge Functions geram notas "pendentes". O sistema precisa *obrigatoriamente* possuir uma rotina sólida de conciliação (`consSitNFe`) que recupere recibos/protocolos "perdidos" para impedir dupla emissão na SEFAZ.
- **Idempotência Real:** Impedir duplo processamento de uma mesma requisição de emissão sob concorrência.
- **Isolamento de Ambientes:** Separação inquebrável de Produção x Homologação.
- **Homologação SEFAZ:** Emissão 100% validada ponta a ponta contra o webservice de Homologação real do Paraná.

### 🟡 P1 — Necessário para Operação Fiscal Completa (histórico)
*Recursos que não bloqueiam a emissão da primeira nota perfeitamente válida, mas são vitais para o dia a dia e contabilidade.*
- **Inutilização (`inutNFe`):** Tratamento correto de pulos numéricos, consumindo o WS específico.
- **Cancelamento:** Respeitando os ciclos do estoque e limites rígidos de tempo (NFC-e 30m, NF-e 168h).
- **DANFE Definitivo:** Layout em PDF/Impressora maduro com QR Code dinâmico preciso.
- **Contingências Específicas:**
  - NFC-e Offline (`tpEmis=9`).
  - NF-e SVC-RS/EPEC.
- **Carta de Correção (CC-e):** Apenas Mod 55.
- **Tratamento de Rejeições:** Tela/soluções que ajudem o usuário a corrigir XML e reenviar sem corromper o banco.

### 🟢 P2 — Maturidade Operacional e Otimização (histórico)
*Não impede a operação nem a contabilidade inicial, mas profissionaliza a ferramenta.*
- **Observabilidade / Telemetria:** Tracing em conformidade com as regras do projeto via OpenTelemetry.
- **Dashboards:** Painel de resiliência e painéis de contingências pendentes de envio.
- **Métricas:** Tracking de rejeições mais comuns, performance de assinatura e respostas da Vercel vs SEFAZ.

---
## 4. Avanços Recentes (Resolução de Idempotência e Concorrência)

1. **Reconciliação e Timeouts**: Interface reativa no frontend e backend agora permitem recuperar protocolos perdidos na SEFAZ. O timeout não gera duplicidade.
2. **Atomicidade de Reserva**: Substituída a lógica frágil na API por uma RPC atômica (`reserve_nfe_outbound_emission`) usando `pg_advisory_xact_lock` no pedido. Blinda contra abas concorrentes simultâneas.
   * **Nota de Validação**: A atomicidade da reserva na RPC foi comprovada localmente com duas conexões PostgreSQL independentes. No entanto, o teste focado utilizou apenas as migrations essenciais ao cenário isolado. Isso **não certifica** a cadeia completa de migrations do projeto nem valida toda a jornada de numeração no frontend/API; apenas isola e comprova a proteção contra race conditions na reserva. A ausência de queima de numeração/chave adicional neste cenário é inferida pela arquitetura atual e precisará ser comprovada no E2E.
3. **Tratamento de Rejeição 217**: Se a SEFAZ não receber o documento (cStat 217), a UI libera a ação "Retransmitir mesma NF-e", que reaproveita a mesma chave, numeração e XML íntegro no banco.

---
## 5. Próximo Passo Exato

**Próximo passo: executar e preencher a matriz P0 real contra o ambiente de Homologação da SEFAZ-PR.** O núcleo pode estar pronto para ser homologado, mas permanece bloqueado para produção até a aprovação documentada dos cenários aplicáveis.
