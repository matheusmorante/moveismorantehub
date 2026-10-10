# Recuperação de consulta 217 — 2026-10-04

> **Registro histórico de somente leitura:** descreve a observação daquele pedido em 04/10/2026. Não declara estado atual da tentativa, do banco ou da SEFAZ. Consulte [status-testes-homologacao.md](status-testes-homologacao.md) antes de qualquer operação ou reconciliação.

A solicitação `26557db7-8b96-4eb0-b80a-11ffa4bd431d` pertence ao pedido
4077, NFC-e 613, série 1, ambiente 2. A investigação foi somente de leitura no
projeto `hkoxhourxwlddgsfdgws`, confirmado pela URL Development do app.
O primeiro registro de resposta é pendente, com motivo “Resposta da transmissão
HML desconhecida” e resposta vazia. Duas consultas posteriores registraram
`217`. O histórico disponível não identifica a causa de transporte do primeiro
envio; não comprova autorização nem permite descartar o documento reservado.

## Correção

O retorno `HML_CONFIRMED_NOT_FOUND` omitia modelo, número, série, ambiente e
resultado da consulta. Agora informa esses dados do documento persistido,
`pending=false` e `state=not_found`. O HTTP 409 continua sinalizando que a
requisição de emissão recuperou uma tentativa anterior, sem emitir outra nota.

A tela exibe o número original e bloqueia sua edição durante a recuperação.
Antes, um número editado manualmente continuava sendo passado com
`retryDocumentId`, combinação recusada pelo serviço cliente antes da chamada
ao backend. A retransmissão agora passa apenas o documento original, sem número
manual. O botão identifica NF-e ou NFC-e conforme o modelo recuperado.

## Efeitos e validação

Sem mudança de schema, RPC ou regras de persistência. A reserva original e seu
XML/chave permanecem preservados. A retransmissão explícita continua consultando
a mesma chave antes do envio, validando o XML original e usando os leases e RPCs
transacionais existentes. Falha de persistência mantém reconciliação pendente.
Esta recuperação HML não gera estoque, financeiro ou reservas comerciais.

- 87 testes Vitest/RTL aprovados: pipeline HML, fronteira cliente/API, consulta
  e modal; inclui retorno 217 com metadados e retomada após número manual.
- ESLint: zero erros; dois avisos existentes em `NfeGeneralTab`.
- Compilação e inicialização fiscal aprovadas; módulos, WASM e XSD resolvidos.
- TypeScript fiscal: bloqueado por três erros existentes fora desta correção,
  em `ReceiptPrintDocument`, `fiscalOperationReview` e `fiscalOperationXml`.
- Não houve nova emissão, escrita em dados operacionais ou teste de banco real
  nesta tarefa. Os testes com mocks não comprovam comunicação SOAP real.

## Fontes oficiais

Consultadas em 2026-10-04, somente para interpretar consulta e recuperação:

- [MOC 7.0, Anexo I, revisão 7.03, seção 4.4.2](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf):
  `217` indica que a NF-e não consta na base SEFAZ.
- [SEFA/PR, endpoints 4.00](https://sped.fazenda.pr.gov.br/NFe/Pagina/Enderecos-dos-ambientes-de-homologacao-e-producao-Versao-400):
  consulta de chave e autorização são serviços distintos em homologação.

Sem alteração de leiaute/XML ou revisão integral de NTs.
