# Baseline fiscal E2E — homologação SEFAZ-PR

> **Registro histórico de execução:** esta baseline preserva evidências e resultados de 2026-10-01. As instruções e critérios para novos testes de NF-e/NFC-e em homologação foram removidos em 2026-10-03 para redefinição. Não use este arquivo como roteiro nem retransmita os documentos registrados.

Estado de referência aprovado em `2026-10-01T19:32:18.854Z` para o `testRunId` `11ae099c-9497-4b0c-b308-1116c88c6d06`. O backend usado foi a implantação Vercel [`morantehub-1jo971ypw`](https://morantehub-1jo971ypw-matheusmorantes-projects.vercel.app), com `tpAmb=2`, série 1 e produção desabilitada. Projeto Supabase: `hkoxhourxwlddgsfdgws`.

Esta baseline congela o comportamento operacional já aprovado; não representa um tag Git nem uma árvore de trabalho limpa. O `HEAD` observado durante o registro era `e3930b8a9f37d81f9b674a8a5c1e76912bebed60`, e havia alterações locais em andamento. A implantação e os hashes abaixo identificam a evidência fiscal de referência sem misturá-la às alterações posteriores da interface.

| Documento | Situação final | Número/série | Chave de acesso | Protocolo SEFAZ |
|---|---|---|---|---|
| Venda cancelada antes da circulação | NF-e 55 cancelada em HML | 102 / 1 | `41261044512248000107550010000001021691802600` | Autorização `141260000600820`; cancelamento `141260000601112` |
| Venda entregue | NF-e 55 homologada | 103 / 1 | `41261044512248000107550010000001031029741292` | `141260000601131` |
| Devolução parcial — 1 unidade | NF-e 55 homologada | 107 / 1 | `41261044512248000107550010000001071467832735` | `141260000601324` |
| Devolução do saldo — 1 unidade | NF-e 55 homologada | 108 / 1 | `41261044512248000107550010000001081585497496` | `141260000601339` |

O cenário cobriu emissão e consulta reais, cancelamento antes da circulação, bloqueio após entrega, devolução comercial parcial em duas etapas, vinculação à NF-e original, replay idempotente e excesso de quantidade rejeitado. O saldo de estoque voltou de 30 para 30; contas a receber e lançamentos financeiros dos pedidos de teste permaneceram zerados. Os pedidos e documentos ficaram identificados pelo marcador HML e preservados como histórico; o cadastro fiscal do produto real não foi alterado.

## Integridade dos arquivos de referência

Os XMLs assinados e as respostas da SEFAZ permanecem no diretório local ignorado pelo Git `.agent/nfe-hml-evidence/`. Confira os SHA-256 antes de usá-los como fixture. Não substitua esta evidência por XML reconstruído.

| Arquivo | SHA-256 |
|---|---|
| `a-outbound-signed.xml` | `2e8a128073aebf481380bc0e42f4d026da29ed1f8fbafc96a952c6b5d7fc4701` |
| `a-outbound-sefaz.xml` | `32d19d979167bca20db92629b72fbd86e7f013d6eebfdd6b09a8ce841cc64436` |
| `a-cancel-signed.xml` | `fd0d0aef469f1c9b9f6a2f64f80dbd980dae0dd455dc8dfd9fced65d7d1dffd7` |
| `a-cancel-sefaz.xml` | `99f417b6b530ecae90f61344b60ca77aabdbb17492ed077ebf0c711bfdb537e` |
| `b-outbound-signed.xml` | `130ca435280fa5a124e4cf128068b8648adf8dfe94e5680d4326b6c124be5886` |
| `b-outbound-sefaz.xml` | `f327db1e1fed869ae77dfbc4189d3ee6a36453eefe919573ea44a92895354743` |
| `b-return-1-signed.xml` | `42ff3e795d32b9dc2769fd9949ab1bc2fb6c4f9a8a6bfef73928cab8719c0f22` |
| `b-return-1-sefaz.xml` | `d433e6ef629e4d68dd3cb89005199d42d4f4829aa74f3e551db2319c3933d48b` |
| `b-return-2-signed.xml` | `5e7dca64695a14444f995a112c45e4dbee9c12c6b06e7fc8d65f553266db298e` |
| `b-return-2-sefaz.xml` | `e75e25e180dcbe19c462c5aaccc8657d2d584a490cd9c60680279a11fc34512e` |

The structured audit is [`nfe-hml-final-evidence.json`](../../.agent/nfe-hml-final-evidence.json); the full run notes are [`nfe-hml-e2e-report-20261001.md`](../../.agent/nfe-hml-e2e-report-20261001.md). Rejected attempts 215, 588 and 253 are kept beside the successful XMLs for diagnosis.

## Limites da evidência

Esta baseline prova a emissão HML básica e a operação de devolução/cancelamento pela API/RPC real. Ela não prova concorrência no PostgreSQL, fault injection nesse banco, nem uma jornada visual autenticada no ERP Web. Esses são gates separados; a suíte fiscal automatizada e os cenários complementares precisam ser registrados sem reclassificar o resultado desta baseline.
