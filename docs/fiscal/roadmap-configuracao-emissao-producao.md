# Roadmap Canônico: NF-e e NFC-e de Saída (MoranteHub)

**Atualizado em:** 28/09/2026  
**Fonte de Verdade para:** Emissão de Documentos Fiscais de Saída (NF-e/NFC-e) diretamente com o SEFAZ-PR.

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

Executar contra os web services oficiais de homologação SEFAZ-PR, sem dados reais de produção. Cada execução deve registrar modelo, cenário, request XML efetivamente transmitido (sanitizado apenas de dados pessoais quando o artefato for compartilhado; preservar hash do XML integral), chave de acesso, `cStat`/`xMotivo`, protocolo quando emitido, estado final de tentativa e documento no banco, e resultado observado na interface.

**Regra de aceite por cenário:** o status só pode mudar de “não executado” para “aprovado” quando houver evidências persistidas e verificáveis dos sistemas envolvidos. Relato textual, captura de tela isolada ou teste local não são suficientes. Para emissão autorizada, conferir correspondência entre chave de acesso, protocolo, `cStat`, XML final/protocolado e documento persistido no banco; anexar também a evidência da resposta SEFAZ e do estado apresentado pela interface. Guardar artefatos com acesso restrito e identificador/hash para permitir revisão sem expor dados pessoais ou credenciais.

| Cenário | Modelo | Evidências obrigatórias | Status |
|---|---:|---|---|
| Emissão autorizada | 55 | XML assinado/transmitido, chave, `cStat`, protocolo, registro persistido e UI autorizada | ⬜ Não executado nesta auditoria |
| Emissão autorizada | 65 | XML assinado/transmitido, chave, `cStat`, protocolo, registro persistido e UI autorizada | ⬜ Não executado nesta auditoria |
| Rejeição fiscal conhecida | 55 e 65 | XML, `cStat`/motivo, estado rejeitado no banco e orientação/UI sem falso sucesso | ⬜ Não executado nesta auditoria |
| Consulta posterior de documento autorizado | 55 e 65 | resposta de consulta, protocolo/estado reconciliado no banco e UI atualizada | ⬜ Não executado nesta auditoria |
| Cancelamento fiscal elegível | 55 e 65 | evento transmitido, retorno SEFAZ, protocolo e estado reconciliado; respeitar regra de circulação/prazo do modelo | ⬜ Não executado nesta auditoria |
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
- [ ] Carta de Correção Eletrônica (CC-e), somente para modelo 55. A tela atual contém modal, mas o botão apenas mostra toast de sucesso e não transmite evento ao backend/SEFAZ.

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
