# Auditoria inicial — conformidade documental do módulo fiscal

> **Registro histórico:** auditoria de 2026-09-29. A skill indicada abaixo foi removida em 2026-10-03 a pedido da usuária, e os critérios de teste HML foram retirados para redefinição. Este arquivo preserva o diagnóstico da época e não é roteiro atual.

**Data:** 2026-09-29  
**Skill aplicada à época:** `fiscal-nfe-nfce-official-docs` (removida em 2026-10-03)
**Escopo:** leitura do roadmap fiscal existente, inventário estrutural de API/UI/testes/migrations e conferência direcionada do portal nacional e páginas SEFA/PR. Esta é uma triagem documental/arquitetural; não é homologação fiscal, revisão tributária linha a linha, nem prova de conformidade de cada XML contra os pacotes XSD atualmente vigentes. A auditoria de ferramentas e arquitetura está em [auditoria-stack-fiscal-saida.md](auditoria-stack-fiscal-saida.md).

## Estado por área

| Área | Estado | Evidência e gap conhecido | Prioridade |
|---|---|---|---|
| Emissão NF-e 55 | PRECISA DE VALIDAÇÃO | Há fluxo fiscal no backend e rascunhos/transmissão; o roadmap mantém bloqueado até completar e evidenciar a matriz de homologação real SEFA/PR. | P0 |
| Emissão NFC-e 65 | PRECISA DE VALIDAÇÃO | Há suporte e testes isolados no código, mas falta evidência da matriz real de homologação por modelo. | P0 |
| XML e XSD | PARCIAL | Em 2026-09-29, o portal listou 010f em uso; ZIP oficial e cinco XSDs locais coincidem por SHA-256. `transmit-operation-draft.ts` valida antes e depois da assinatura, mas `emit.ts` não chama o validador XSD antes da transmissão. Falta revisar aplicabilidade de NTs e outros XML/eventos. | P0 |
| Assinatura e certificado | PARCIAL | Assinatura/backend está implementada; cadeia com certificado de homologação e interoperabilidade real ainda depende da matriz P0. Segredos devem permanecer em backend. | P0 |
| CSRT | PRECISA DE VALIDAÇÃO | A cobertura, UF/modelo aplicáveis, geração e testes não foram comprovados nesta auditoria documental. | P1 |
| CSC e QR Code NFC-e | PRECISA DE VALIDAÇÃO | Há referências e lógica no projeto, mas falta provar a conformidade com o manual QR Code vigente, credencial correta por ambiente e testes ponta a ponta. | P0 |
| DANFE NF-e / NFC-e | PARCIAL | Existem geradores no ERP; comparação visual e estrutural contra Anexo II e manual NFC-e vigente ainda não foi concluída. | P1 |
| Autorização e reconciliação | PARCIAL | Existem transmissão/consulta e recuperação técnica; o roadmap registra que timeout após envio exige reconciliação e a matriz real ainda não foi executada. | P0 |
| Cancelamento fiscal | PARCIAL | Endpoint e regras locais existem; falta evidência de cancelamento real em homologação, persistência do protocolo e reconciliação completa. | P1 |
| Carta de Correção (CC-e) | PARCIAL | A UI/backend agora enviam ao endpoint SEFA/PR, carregam a última correção e sequência, limitam caracteres/modelo/ambiente, reservam idempotentemente no RPC e reconciliam timeout sem retransmissão automática. Testes focados locais cobrem autorização, cStat 135, repetição e timeout/reconciliação; falta homologação real e evidência do protocolo/XML persistidos no serviço. | P1 |
| Inutilização | NÃO IMPLEMENTADO | O roadmap lista inutilização de numeração como operação fiscal faltante. | P2 |
| Contingência NF-e 55 | NÃO IMPLEMENTADO | O roadmap aponta contingência SVC-RS/EPEC pendente; selecionar modo/UF e implementar conforme manual e NT vigentes. | P2 |
| Contingência offline NFC-e 65 | NÃO IMPLEMENTADO | O roadmap aponta fluxo offline pendente; requer fila, transmissão posterior e reconciliação conforme Anexo IV/manual específico. | P2 |
| Numeração concorrente | PARCIAL | Há reserva atômica no banco e teste isolado de concorrência; a cadeia completa migration/API/UI ainda não está provada na jornada fiscal ponta a ponta. | P1 |
| Tributação / Reforma Tributária | PRECISA DE VALIDAÇÃO | NTs RTC e alterações de 2026 complementam a edição MOC 7.0/anexos recebida; faltou auditoria de campos, cálculo, regras, cronogramas e impacto por regime/modelo. | P0 |
| Armazenamento de XML/eventos | PARCIAL | Tabelas e persistência fiscal existem; falta fechar evidência ponta a ponta de XML autorizado, protocolo, evento e documento após sucesso, rejeição e timeout. | P0 |
| Tratamento de rejeições | PARCIAL | Há parser e regras de resposta testados localmente; mapear os `cStat` aplicáveis à documentação vigente e à UX segue pendente no roadmap. | P1 |
| Idempotência, retry e concorrência | PARCIAL | RPCs e constraints protegem partes da reserva/emissão/eventos; ainda é necessário provar sucesso, falha de persistência pós-autorização, retry, repetição e concorrência na integração completa. | P0 |

## Próximas ações prioritárias

1. Executar a matriz real P0 em homologação para modelos 55 e 65, incluindo agora o evento CC-e; guardar artefatos controlados e não usar dados de produção.
2. Fazer `emit.ts` validar XML antes/depois da assinatura com o XSD oficial já conferido; revisar geração XML e aplicabilidade das NTs vigentes, incluindo RTC e CNPJ alfanumérico quando pertinentes.
3. Fechar a auditoria do DANFE/QR Code com os manuais específicos e validar assinatura/certificado/CSC em homologação.
4. Implementar inutilização e contingências como trabalhos separados, após definir o escopo operacional e consultar os documentos e serviços oficiais específicos.
5. Fazer revisão tributária por regime e operação com contador/responsável fiscal antes de declarar a parte de tributação conforme.

## Validação da implementação CC-e anterior

- Vitest fiscal focado: 17 testes aprovados em 4 arquivos (builder/validação, parser de eventos, endpoint CC-e e elegibilidade por modelo/ambiente).
- ESLint: passou nos arquivos alterados do ERP.
- `npx tsc --noEmit -p api/tsconfig.nfe.json`: passou, incluindo a API de CC-e.
- `npx tsc --noEmit -p erp/tsconfig.fiscal.json`: ainda falha em arquivos fora desta alteração (`ReceiptPrintDocument.tsx`, `fiscalOperationReview.ts`, `fiscalOperationXml.ts`, `orderCrmSyncService.ts`, `orderItemStockReconciliation.ts` e `orderSyncQueries.ts`); nenhum diagnóstico foi emitido para os arquivos alterados nesta tarefa.
- Supabase remoto: verificação somente leitura confirmou tabela, coluna `request_id`, índice e RPC; execução da RPC está restrita a `service_role`.
- Cópias PDF: removidas; `docs/fiscal/manuais/` contém apenas este índice de fontes oficiais.

## Evidências oficiais consultadas nesta auditoria

- Portal Nacional NF-e: MOC/manuais, notas técnicas vigentes e esquemas XML listados no [índice de fontes](manuais/README.md).
- SEFA/PR: endpoints oficiais NF-e 4.00 para homologação/produção e regras de eventos, incluindo a substituição da CC-e anterior pela nova.
- Roadmap interno: `docs/fiscal/roadmap-configuracao-emissao-producao.md`, especialmente matriz P0 não executada e operações P2 pendentes.

## Limites

Os estados `PARCIAL` e `PRECISA DE VALIDAÇÃO` não significam aprovação fiscal. Esta auditoria não transmite documentos, não habilita produção e não substitui revisão contábil/fiscal ou homologação pela SEFA/PR. Atualize este relatório quando uma evidência nova alterar o estado de uma área.
