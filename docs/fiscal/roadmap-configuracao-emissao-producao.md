# Roadmap Canônico: NF-e e NFC-e de Saída (MoranteHub)

**Atualizado em:** 30/09/2026
**Fonte de Verdade para:** Emissão de Documentos Fiscais de Saída (NF-e/NFC-e) diretamente com o SEFAZ-PR.

## Ponto de retomada — 30/09/2026

**A primeira NF-e 55 do pedido 3474 foi autorizada pela SEFAZ-PR em homologação: número 701, série 1, cStat 100, protocolo persistido e status homologada. Produção fiscal continua bloqueada.**

### Escopo e fatos preservados

- Pedido real existente **3474**, `dc0641a1-f554-4769-a864-314c46a80f2e`, exclusivamente modelo 55 e `tpAmb=2`.
- Um produto, quantidade 1, R$ 349,00 + frete R$ 30,00; cartão de crédito R$ 379,00. Pedido, itens, pagamentos, estoque, reservas, contas a receber e transações financeiras preservados.
- Os cinco campos confirmados no modal chegaram iguais aos snapshots e XMLs: NCM 94034000, CFOP 5102, origem 0, CEST vazio e CSOSN 103 (grupo ICMSSN102).
- A IE correta foi informada pela usuária e já constava no cadastro ao retomar. Sua validade matemática foi conferida; a autorização SEFAZ fornece a evidência real desta emissão. Somente a série HML foi corrigida de 900 para 1, sem reiniciar contador ou alterar configuração de produção.

### Histórico fiscal vinculado — preservar os três registros

| Intenção | Documento | Série / número | Resultado |
|---|---|---|---|
| Original | `a9c29dd4-be12-46c2-9a8b-3effd1852b09` | 900 / 700 | Erro 244: série incompatível; sem protocolo |
| Correção de série | `f59bf51f-ce9a-4ccd-b35a-d84639a5f712` | 1 / 700 | Erro 209: IE inválida; sem protocolo |
| Correção de IE | `b1e4be97-4391-43b9-8d03-bd7e43e3276c` | **1 / 701** | **Homologada, cStat 100, protocolo confirmado** |

Requisição autorizada: `5594dbc0-d8a3-4ac8-ae3d-f7fd5aeaa39e`. Cada correção aponta para a anterior por `hml_correction_of_document_id`, tanto no snapshot quanto no documento. XMLs, chaves e protocolos integrais permanecem no Supabase, com acesso restrito; não incluí-los em logs públicos. As rejeições anteriores são imutáveis e não foram apagadas nem alteradas.

### Causas resolvidas e evidências

- A publicação TLS anterior ficou READY. A consulta real da primeira chave retornou **217**, permitindo o reenvio explícito do mesmo XML/chave; esse reenvio retornou **244**. O transporte TLS está resolvido, com verificação do servidor mantida. Ver [confiança TLS](sefaz-hml-tls.md).
- O MOC define a faixa 0–889 para emissão normal por contribuinte CNPJ. O padrão HML agora é série 1; configuração explícita incompatível bloqueia antes de reserva/SOAP.
- A tentativa com série 1 retornou **209**. A validação de IE do Paraná agora ocorre antes da reserva e novamente no snapshot persistido. XML rejeitado por 209 não é consultado/retransmitido como se estivesse pendente.
- Nova intenção somente após rejeição confirmada 244 com série diferente, ou 209 com IE diferente e válida no novo snapshot. Pendência, consulta 217, autorização e outros códigos bloqueiam outra intenção. Não há correção automática de dados fiscais nem emissão automática no próximo retorno.
- A tentativa corrigida retornou **100**. Chave/protocolo da resposta conferem com o documento persistido; itens fiscais e histórico foram gravados pela RPC transacional existente.
- Assinatura do XML autorizado verificada independentemente com o certificado público. Certificado válido até 25/09/2027.
- Recuperação idempotente da intenção autorizada preservou número, série, XML, protocolo e uma única autorização. Essa recuperação devolve fatos persistidos; não equivale a uma nova consulta SOAP de documento já autorizado.
- Playwright autenticado confirmou modal HML e os três registros separadamente na tela fiscal, com status iguais aos do banco. A auditoria da tela não acionou emissão, cancelamento ou alteração comercial.
- Comparação antes/depois de cada transmissão e da recuperação: pedido, itens, pagamentos, movimentos de estoque, contas a receber e transações financeiras inalterados.
- Testes focados aprovados para série, IE, emissão, recuperação, frontend e consumidor de operação fiscal. PostgreSQL local isolado: **31 assertivas pgTAP**, além de verificações de rollback, replay, duas sessões concorrentes, idempotência e imutabilidade de histórico. Sem testes destrutivos ou de concorrência no remoto.
- TypeScript do backend fiscal e lint focado passaram. O TypeScript do ERP ainda apresenta erros anteriores fora deste escopo; comparação com HEAD não encontrou novos diagnósticos. Build/publicação fiscal passaram. Advisors remotos antes/depois: **379 alertas existentes, nenhum novo**.

### Publicação e banco

- Publicação usada na autorização: `dpl_41N7FCiAAkJsJtbioLvP2KsA1wAu`, [deployment](https://morantehub-7dcj1fbq3-matheusmorantes-projects.vercel.app).
- Publicação final READY, incluindo tratamento de nova intenção após 209 no frontend: `dpl_FzExmdGotaN9BpsboBXwTNE3gp1j`, [deployment](https://morantehub-2ea4w7jpf-matheusmorantes-projects.vercel.app).
- Alvo Vercel production com `--skip-domain` para usar as credenciais existentes; isso não habilita produção fiscal. API confirmou ambiente 2 e `productionApproved=false`.
- Projeto Supabase confirmado: `hkoxhourxwlddgsfdgws`. Migrations 01434–01437 e 01438–01439 já estavam aplicadas nos lotes anteriores. Aplicadas e registradas agora: `20260930214601_nfe_hml_series_correction` e `20260930222310_nfe_hml_issuer_ie_correction`. Não usar db push geral nem reaplicar lotes cegamente.
- Alterações desta continuação estão locais, sem commit/push. Para outro PC, transferir o código por Git, preservando segredos fora do repositório. O banco e os deployments acima já receberam as correções validadas.

### Próxima etapa

1. Não emitir novamente o pedido 3474: a intenção acima já está autorizada em HML. Recuperar pelo request ID ou consultar pelo document ID; preservar as duas rejeições vinculadas.
2. Ampliar a matriz modelo 55 com poucos pedidos elegíveis: múltiplos produtos, descontos, frete e formas de pagamento diferentes. Exceções fora da matriz fiscal suportada devem bloquear.
3. Validar separadamente consulta SOAP posterior, eventos e demais cenários necessários à produção. Recuperação local idempotente não substitui esses cenários.
4. Produção fiscal e NFC-e 65 continuam fora do aceite desta etapa.

Scripts: `nfe-hml-ui-audit.cjs` é somente leitura por padrão; seu modo de primeira emissão recusa histórico existente. `nfe-hml-live.cjs` seleciona a tentativa pela requisição exata, preserva os campos do snapshot e usa retryDocumentId na reconciliação. `nfe-hml-document-audit.cjs` verifica assinatura. `nfe-hml-series-correction-local.cjs` exercita as migrations em PostgreSQL local descartável. Todos ficam em scripts/testing.

Referências: [correção de série/IE e consistência](correcao-serie-ie-hml.md), [limites do pedido real](limites-teste-pedido-real-hml.md), [índice oficial de manuais](manuais/README.md).

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
| Emissão autorizada | 55 | XML assinado/transmitido, chave, `cStat`, protocolo, registro persistido e UI autorizada | ✅ Pedido 3474, NF-e 701/série 1 autorizada em HML (cStat 100); protocolo, itens e UI conferidos |
| Emissão autorizada | 65 | XML assinado/transmitido, chave, `cStat`, protocolo, registro persistido e UI autorizada | ⬜ Não executado nesta auditoria |
| Rejeição fiscal conhecida | 55 e 65 | XML, `cStat`/motivo, estado rejeitado no banco e orientação/UI sem falso sucesso | Modelo 55: 244 e 209 preservados no banco e UI; modelo 65 não executado |
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

- [ ] Migrar a autenticação do backend fiscal de `SUPABASE_SERVICE_ROLE_KEY` para uma Supabase Secret Key dedicada ao componente fiscal, mantendo-a apenas no runtime de servidor e removendo a chave legada após validar a transição.
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
