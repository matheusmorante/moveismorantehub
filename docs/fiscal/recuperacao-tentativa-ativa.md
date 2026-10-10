# Recuperação de tentativa ativa — 2026-10-04

> **Registro histórico de implementação:** os achados e resultados descrevem a alteração de 04/10/2026; não são estado atual de autorização SEFAZ nem roteiro para repetir uma tentativa. Consulte [status-testes-homologacao.md](status-testes-homologacao.md) para o estado do código e dos testes.

## Causa e comportamento

O cliente descartava a intenção fiscal após `ALREADY_ACTIVE_FISCAL_ATTEMPT` e
solicitava outra intenção a cada clique. A recuperação procurava documentos por
`emission_request_id`, enquanto a reserva bloqueava outra intenção por pedido,
modelo e ambiente. O erro da requisição bloqueada não demonstrava se a tentativa
anterior havia sido transmitida.

O backend agora procura também o documento ativo de saída por pedido e ambiente
HML, inclusive quando a intenção do cliente é diferente. Retorna HTTP 409, mantém
o código diagnóstico `HML_SNAPSHOT_RESERVATION_FAILED` e informa o documento e a
intenção existentes. A UI preserva/adota essa intenção e oferece consulta.
Um conflito descoberto durante a reserva também recebe esse tratamento.

Quando existe somente snapshot, a recuperação usa a mesma intenção nos RPCs de
preparação/reserva existentes. Ela preserva snapshot, número e escolhas fiscais
congeladas; não apaga nem libera manualmente a reserva. Se os fatos congelados
forem inválidos, a retomada continua sujeita às validações oficiais existentes.

Após transmissão incerta, somente consulta conclusiva permite prosseguir:

- Autorização verificável: persistir protocolo/itens na tentativa original.
- `217`: persistir ausência e oferecer retransmissão do mesmo XML/chave. Não
  descartar a intenção nem criar outro número.
- Consulta inconclusiva, erro de transporte ou rejeição da própria consulta:
  manter `pendente`. Rejeitar uma consulta não rejeita o documento transmitido.
- Rejeição definitiva já persistida da emissão: permitir correção conforme o
  fluxo existente, preservando a tentativa rejeitada.

## Atomicidade e efeitos

Reserva de snapshot/número e bloqueio de concorrência continuam nos RPCs
transacionais existentes. XML/documento são persistidos antes da transmissão;
SOAP ocorre após o commit, com lease e token de tentativa. Resposta e protocolo
usam `persist_hml_nfe_result`; falha de persistência mantém recuperação pendente.
Os tokens de lease não são retornados ao frontend.

Essa recuperação HML não cria efeitos comerciais, de estoque ou financeiros.
Nenhuma migration, escrita em documento operacional ou nova emissão real foi
executada para esta correção. A investigação remota foi somente de leitura; uma
tentativa pendente encontrada passou a homologada durante a investigação por
uma operação externa a esta tarefa.

## Fontes oficiais consultadas

Consulta em 2026-10-04, restrita à reconciliação, sem mudança de leiaute/XML:

- [MOC 7.0, Anexo I, revisão 7.03, outubro/2020, CONFAZ](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf),
  seção 4.4: `100` autorização; `108/109` serviço paralisado; `204` duplicidade;
  `217` documento não consta. Esses códigos não justificam tratar falha de
  consulta como prova de rejeição da autorização.
- [SEFA/PR, endpoints 4.00](https://sped.fazenda.pr.gov.br/NFe/Pagina/Enderecos-dos-ambientes-de-homologacao-e-producao-Versao-400):
  consulta por chave e autorização são serviços distintos em homologação.

## Evidências

| Teste | Executado | Projeto/ref | Massa | Resultado | Limitação |
|---|---|---|---|---|---|
| Pipeline, fronteira cliente/API e modal | Sim, Vitest/RTL | Sem banco | Fixtures mockadas | 82 testes aprovados | Não prova SOAP real |
| Concorrência de duas intenções, replay e rejeição de chave reutilizada | Sim, RPCs reais | `hkoxhourxwlddgsfdgws` | `TEST_AUT_e4dc33b2-0a12-40d6-b6b3-288b342534a1` | Uma reserva, série HML 885, número 2; replay idêntico, sem incremento extra | Sem criar documento ou transmitir à SEFAZ |
| Compilação/inicialização fiscal e resolução do XSD | Sim, `npm run build:fiscal` | Local | Sem transmissão | Aprovado | Não substitui TypeScript |
| ESLint dos arquivos ERP alterados | Sim | Local | N/A | Sem erros | Dois avisos existentes de props não usadas em `NfeGeneralTab` |
| TypeScript fiscal | Sim, `tsconfig.fiscal.json` | Local | N/A | Não aprovado | Erros fora do patch: `ReceiptPrintDocument.tsx` (`fullName`/`never`), `fiscalOperationReview.ts` e `fiscalOperationXml.ts` (`onError`/`Options`) |

A fixture remota tem `status=draft`, `deleted=true`, `payments=[]` e
`fiscalScenario=HML_TECHNICAL_V1`. A regra
`is_nfe_hml_technical_order` exclui esse formato dos efeitos de dashboards e
resumos. A reserva fiscal e sua linhagem são preservadas; nenhum registro
operacional foi usado como massa mutável. A primeira execução também preservou
`TEST_AUT_1de7161d-7a4b-42c1-880a-5a5021b0d8f6`, série HML 885/número 1.

O teste remoto é opt-in, fora da suíte unitária. Em PowerShell, a partir de `erp`:

```powershell
$env:RUN_FISCAL_RPC_INTEGRATION = '1'
node --use-system-ca node_modules/vitest/vitest.mjs run --config vitest.fiscal-rpc.config.ts
```

O runner propaga os argumentos Node aos workers para preservar a confiança TLS
do sistema. Não desabilita validação de certificados nem altera `.env.local`.
