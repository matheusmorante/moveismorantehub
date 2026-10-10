# Invariantes do emissor fiscal de saída

**Escopo:** NF-e 55; aplicar à NFC-e 65 somente onde a regra e o serviço forem compatíveis. **Revisão:** 2026-10-09. Estas são exigências de projeto e critérios de revisão, não uma declaração de conformidade geral da implementação. O estado dos testes fiscais está no [status central de homologação](status-testes-homologacao.md). A fonte normativa de cada mudança deve ser consultada novamente nas publicações oficiais aplicáveis, listadas em [manuais](manuais/README.md).

| ID | Invariante | Evidência mínima para considerá-la atendida |
|---|---|---|
| FISCAL-001 | Certificado A1 e chave privada nunca chegam ao Web/Mobile. | Segredos somente no backend, contrato de resposta e bundle inspecionados. |
| FISCAL-002 | Web/Mobile nunca chamam a SEFAZ diretamente. | Rede do cliente aponta apenas para a API interna; SOAP/mTLS restritos ao backend. |
| FISCAL-003 | O documento autorizado e seu XML/protocolo são fatos históricos imutáveis. | Bloqueio de alteração/apagamento e snapshots preservados no banco; correções são eventos vinculados. |
| FISCAL-004 | Timeout de transmissão não equivale a rejeição. | Tentativa marcada como incerta, sem retransmissão automática. |
| FISCAL-005 | Erro de rede não prova que a NF-e não foi emitida. | Resposta/UI distinguem falha de comunicação de rejeição fiscal. |
| FISCAL-006 | Estado incerto exige consulta e reconciliação pela mesma chave/tentativa. | Retomada após timeout, crash e resposta perdida, com resultado e protocolo persistidos. |
| FISCAL-007 | Uma intenção fiscal não gera duas notas por retry, duplo clique ou concorrência. | Chave de idempotência persistida, constraints e prova com duas sessões reais. |
| FISCAL-008 | Numeração é reservada atomicamente por modelo, série e ambiente. | RPC/índice transacional e teste de concorrência em PostgreSQL real. |
| FISCAL-009 | `SELECT MAX(numero)+1` nunca é usado para reservar numeração. | Busca de todos os caminhos de emissão e prova do mecanismo de reserva. |
| FISCAL-010 | XML aplicável é validado localmente contra o XSD oficial vigente antes do envio. | Cada endpoint transmissor valida o XML gerado e assinado com pacote rastreável. |
| FISCAL-011 | A1, senha, chave privada, CSRT e tokens não aparecem em logs, traces ou frontend. | Inspeção de logs/telemetria/contratos e testes de sanitização. |
| FISCAL-012 | Pedido de venda e documento fiscal são entidades distintas. | Identidades, estados e histórico separados; vínculo explícito e preservado. |
| FISCAL-013 | A NF-e preserva snapshot dos dados usados na emissão. | XML e itens/dados fiscais da tentativa sobrevivem a edições futuras do pedido/cadastro. |
| FISCAL-014 | Falha local após autorização é reconciliável. | Chave, XML, resposta e protocolo recuperáveis; teste de falha na persistência. |
| FISCAL-015 | Cancelar pedido ou estado local não cancela a NF-e na SEFAZ. | Evento fiscal com retorno/protocolo próprio e estado separado. |
| FISCAL-016 | CC-e não reescreve XML original autorizado. | Evento assinado, sequência, retorno e vínculo com documento original. |
| FISCAL-017 | Biblioteca de terceiros não substitui especificação oficial. | Regra fiscal ligada a MOC/Anexo/NT/XSD/UF e versão aplicável. |
| FISCAL-018 | Alteração de regra fiscal tem evidência oficial verificável. | Fonte, versão, seção, data, ambiente/modelo/UF e decisão registrados no diff ou documentação. |

## Transições e efeitos obrigatórios

- **Preparação/reserva:** gravar intenção, snapshot e chave de idempotência antes da chamada externa. Reservar número e impedir tentativa concorrente numa transação local. Reserva não significa autorização fiscal nem movimentação de estoque.
- **Transmissão:** persistir XML/chave e estado antes de chamar a SEFAZ. Não manter transação PostgreSQL aberta durante SOAP/mTLS. Timeout, crash ou resposta perdida preservam estado incerto e bloqueiam nova emissão da mesma intenção até reconciliação.
- **Autorização confirmada:** persistir resposta, `cStat`, protocolo, XML autorizado e itens/snapshot; efeitos internos vinculados ao estado autorizado devem ocorrer atomicamente ou ficar numa fila/estado reconciliável, sem declarar conclusão parcial. Uma reconsulta não cria efeitos pela segunda vez.
- **Rejeição confirmada:** preservar tentativa e motivo; permitir nova tentativa apenas conforme regra de numeração e idempotência da operação, sem reclassificar timeout como rejeição.
- **Cancelamento e CC-e:** manter eventos e protocolos próprios, ligados à nota; não apagar autorização nem substituir seu XML. Qualquer reversão de estoque/financeiro segue a regra específica do pedido/devolução e precisa de vínculo e idempotência próprios.

## Gatilhos de revisão antes de produção

FISCAL-010 deixou de ser ausente no caminho principal: `api/nfe/emit.ts`, `api/nfe/emitNormalSale.ts` e `api/nfe/transmit-operation-draft.ts` chamam o validador do XSD oficial em suas rotas de transmissão/retry. Na execução focada de 09/10, os 11 testes de `fiscalOperationXml.test.ts` passaram; em `hmlNormalSaleRuleSet.test.ts`, os XMLs NFC-e pickup e delivery falharam porque o XSD PL_010f rejeitou a posição de `infAdProd`. Portanto o gate está implementado, mas FISCAL-010 ainda não está comprovado em todos os modelos/cenários aplicáveis. FISCAL-007/008/014 exigem prova com banco real, falha após autorização e duas sessões; testes mockados não bastam. O estado completo está no [status central de homologação](status-testes-homologacao.md).
