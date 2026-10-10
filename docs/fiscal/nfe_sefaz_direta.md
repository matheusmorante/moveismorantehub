# Emissão fiscal direta — registro histórico

> **Documento arquivado:** esta especificação antiga descrevia uma proposta inicial de emissão direta à SEFAZ-PR. Seus detalhes de persistência (`order_data.nfe`, `invoices`), nomes de secrets, CFOP/CSOSN padrão, contingência e caminhos de código foram superados ou não têm proveniência atual. Não use este arquivo como manual de operação nem como descrição do código vigente.

## Decisão preservada

O registro explica a decisão arquitetural de manter a transmissão de NF-e/NFC-e integrada diretamente aos web services da SEFAZ, sem gateway fiscal pago. Essa decisão não documenta a implementação completa nem prova que cada modelo, evento, ambiente ou contingência esteja pronto.

## Referências atuais

- [Índice fiscal](README.md): fontes atuais, decisões vigentes e arquivos históricos.
- [Roadmap de emissão](roadmap-configuracao-emissao-producao.md): arquitetura do fluxo e prontidão para Produção.
- [Status dos testes fiscais](status-testes-homologacao.md): estado de implementação, testes, autorização HML e pendências.
- [Índice de manuais oficiais](manuais/README.md): documentos e fontes a consultar antes de mudanças fiscais.

A implementação normal atual passa por [`emit.ts`](../../api/nfe/emit.ts), [`emitNormalSale.ts`](../../api/nfe/emitNormalSale.ts), [`schemaValidator.ts`](../../api/nfe/schemaValidator.ts) e pela política de tentativa/reconciliação em [`outboundAttempt.ts`](../../api/nfe/normal-sale/outboundAttempt.ts). O navegador fornece comando e escolhas do formulário; no caminho normal atual, o XML final é montado e validado pelo servidor. Veja o status central para limites por modelo e operação.
