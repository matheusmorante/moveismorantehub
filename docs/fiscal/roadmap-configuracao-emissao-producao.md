# Roadmap Canônico: NF-e e NFC-e de Saída (MoranteHub)

**Atualizado em:** 28/09/2026  
**Fonte de Verdade para:** Emissão de Documentos Fiscais de Saída (NF-e/NFC-e) diretamente com o SEFAZ-PR.

## 1. Estado Atual e Correções Conceituais (Auditoria Revisada)

A auditoria identificou exageros e incorreções conceituais na análise anterior que agora estão corrigidos:
- **Homologação x Produção:** O código suporta configurar ambos, mas **Produção não está "homologada"**. O fato de existirem endpoints não significa que a emissão de produção foi validada ponta a ponta. O status real é: *código preparado e testado localmente, mas a integração contra a SEFAZ em Produção carece de validação e operação efetiva*.
- **Inutilização de Numeração:** Foi incorretamente classificada como um evento comum (`tpEvento=107`). Inutilização não é tratada por evento da nota, mas sim por um web service próprio e layout específico (`inutNFe`).
- **Contingência Subestimada:** Não existe regra única como "basta usar `tpEmis=9`" para ambos os modelos.
  - **NFC-e (Mod 65) no PR:** Adota contingência offline (`tpEmis=9`), o que exige guardar XML assinado e transmiti-lo depois.
  - **NF-e (Mod 55) no PR:** Adota contingências complexas como SVC-RS ou EPEC, que requerem comunicação com ambientes nacionais distintos. A lógica deve ser implementada e auditada separadamente.
- **Carta de Correção (CC-e):** É um evento *posterior* à autorização. Não bloqueia a emissão principal da NF-e, logo foi reclassificada para a fila de completude operacional (P1), não sendo prioritária (P0) para ligar a chave do emissor.

## 2. Reclassificação de Prioridades

### 🔴 P0 — Bloqueia Emissão Segura (Caminho Principal)
*Focar exclusivamente em garantir que o fluxo base não tenha pontas soltas antes de avançar para eventos acessórios.*
- **Geração Normal 55/65, XML e Assinatura:** Garantir geração fiel ao MOC vigente.
- **Numeração e Persistência Seguras:** Numeração estritamente atômica.
- **Timeouts e Reconciliação (O gargalo atual):** Falhas de rede ou de Edge Functions geram notas "pendentes". O sistema precisa *obrigatoriamente* possuir uma rotina sólida de conciliação (`consSitNFe`) que recupere recibos/protocolos "perdidos" para impedir dupla emissão na SEFAZ.
- **Idempotência Real:** Impedir duplo processamento de uma mesma requisição de emissão sob concorrência.
- **Isolamento de Ambientes:** Separação inquebrável de Produção x Homologação.
- **Homologação SEFAZ:** Emissão 100% validada ponta a ponta contra o webservice de Homologação real do Paraná.

### 🟡 P1 — Necessário para Operação Fiscal Completa
*Recursos que não bloqueiam a emissão da primeira nota perfeitamente válida, mas são vitais para o dia a dia e contabilidade.*
- **Inutilização (`inutNFe`):** Tratamento correto de pulos numéricos, consumindo o WS específico.
- **Cancelamento:** Respeitando os ciclos do estoque e limites rígidos de tempo (NFC-e 30m, NF-e 168h).
- **DANFE Definitivo:** Layout em PDF/Impressora maduro com QR Code dinâmico preciso.
- **Contingências Específicas:**
  - NFC-e Offline (`tpEmis=9`).
  - NF-e SVC-RS/EPEC.
- **Carta de Correção (CC-e):** Apenas Mod 55.
- **Tratamento de Rejeições:** Tela/soluções que ajudem o usuário a corrigir XML e reenviar sem corromper o banco.

### 🟢 P2 — Maturidade Operacional e Otimização
*Não impede a operação nem a contabilidade inicial, mas profissionaliza a ferramenta.*
- **Observabilidade / Telemetria:** Tracing em conformidade com as regras do projeto via OpenTelemetry.
- **Dashboards:** Painel de resiliência e painéis de contingências pendentes de envio.
- **Métricas:** Tracking de rejeições mais comuns, performance de assinatura e respostas da Vercel vs SEFAZ.

---
## 3. Avanços Recentes (Resolução de Idempotência e Concorrência P0)

1. **Reconciliação e Timeouts**: Interface reativa no frontend e backend agora permitem recuperar protocolos perdidos na SEFAZ. O timeout não gera duplicidade.
2. **Atomicidade de Reserva**: Substituída a lógica frágil na API por uma RPC atômica (`reserve_nfe_outbound_emission`) usando `pg_advisory_xact_lock` no pedido. Blinda contra abas concorrentes simultâneas.
   * **Nota de Validação**: A atomicidade da reserva na RPC foi comprovada localmente com duas conexões PostgreSQL independentes. No entanto, o teste focado utilizou apenas as migrations essenciais ao cenário isolado. Isso **não certifica** a cadeia completa de migrations do projeto nem valida toda a jornada de numeração no frontend/API; apenas isola e comprova a proteção contra race conditions na reserva. A ausência de queima de numeração/chave adicional neste cenário é inferida pela arquitetura atual e precisará ser comprovada no E2E.
3. **Tratamento de Rejeição 217**: Se a SEFAZ não receber o documento (cStat 217), a UI libera a ação "Retransmitir mesma NF-e", que reaproveita a mesma chave, numeração e XML íntegro no banco.

---
## 4. Próximo Passo Exato

**O caminho principal P0 (Caminho Feliz, Timeouts, Idempotência e Concorrência) está PRONTO PARA HOMOLOGAÇÃO.** 
O próximo passo lógico é executar testes reais ponta a ponta contra o ambiente de **Homologação da SEFAZ**.
