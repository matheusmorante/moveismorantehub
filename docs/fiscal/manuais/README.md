# Consulta online de documentação NF-e/NFC-e

Os PDFs fornecidos foram removidos do repositório a pedido da usuária. Este arquivo contém somente um índice de fontes oficiais; não armazena manuais, MOCs ou Notas Técnicas. Antes de cada alteração fiscal relevante, abra a página oficial, confirme a publicação vigente e acesse o documento específico aplicável.

## Fontes oficiais

- [Portal Nacional NF-e — Manuais](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=ndIjl%2BiEFdE%3D)
- [Portal Nacional NF-e — Notas Técnicas vigentes](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=6WfrpZYE4Ik%3D)
- [Portal Nacional NF-e — Esquemas XML](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=BMPFMBoln3w%3D)
- [SEFA/PR — endpoints NF-e 4.00 de homologação e produção](https://sped.fazenda.pr.gov.br/NFe/Pagina/Enderecos-dos-ambientes-de-homologacao-e-producao-Versao-400)
- [SEFA/PR — eventos NF-e](https://sped.fazenda.pr.gov.br/NFe/Pagina/Eventos-NF-e)
- [SEFA/PR — serviços web NF-e disponíveis](https://sped.fazenda.pr.gov.br/NFe/Pagina/Servicos-web-services-disponiveis)
- [SEFA/PR — FAQ de cancelamento e estorno de NF-e/NFC-e (perguntas 1671 e 1485)](https://atendimento.fazenda.pr.gov.br/sacsefa/portal/assuntosReferente/23)
- [SEFA/PR — NPF 038/2022 (preenchimento da NF-e de estorno)](https://www.sefanet.pr.gov.br/dados/SEFADOCUMENTOS/103202200038.pdf)
- [Legislação PR — Decreto 8.470/2021, prazo NF-e modelo 55](https://www.legislacao.pr.gov.br/legislacao/listarAtosAno.do?action=exibir&codAto=252377)

## Roteamento por assunto

| Alteração | Consultar no portal oficial |
|---|---|
| Campos, leiaute, obrigatoriedade, validação, rejeição, impostos e totais | MOC, Anexo I, Notas Técnicas vigentes e XSD oficial em uso |
| DANFE NF-e / código de barras | MOC, Anexo II, Notas Técnicas e XSD aplicáveis |
| DANFE NFC-e / QR Code | Manual técnico vigente de DANFE NFC-e/QR Code, Notas Técnicas e regras da UF |
| Contingência NF-e modelo 55 | Anexo/manual de contingência NF-e, NTs e serviços autorizadores vigentes |
| Contingência NFC-e modelo 65/offline | Anexo/manual de contingência NFC-e e especificação offline vigentes |
| Cancelamento, CC-e, inutilização ou outro evento | MOC, schema do evento, NTs vigentes e página de eventos/endpoints da SEFA/PR |
| Endpoints, certificado e particularidades do Paraná | Páginas oficiais da SEFA/PR para serviço, UF e ambiente envolvidos |
| Distribuição de DF-e | NT vigente, schemas de distribuição e regras atuais de consumo/NSU |

## Registro da última verificação

- `last_access_key_digit_check`: 2026-10-01. O [manual de integração no Portal Nacional, seção de cálculo do DV da chave](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=d%2FNN9SSgick%3D) especifica pesos 2–9 e `DV = 11 - resto`, com zero somente para restos 0/1. A busca na fonte oficial recuperou essa regra; o MOC online da SEFA/PR retornou 502. A SEFAZ-PR HML rejeitou com `253` a chave da devolução 106 cujo resto era 10: o gerador convertia indevidamente DV 1 em 0. A correção preserva DV 1, cobre os onze restos em teste e não altera chaves/XMLs já persistidos. Consulta restrita ao DV; não é revisão integral das NTs.
- `last_return_message_format_check`: 2026-10-01. A [NT 2010.009, regra D01e, Portal Nacional](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=k850Io7vg%2FE%3D) e o [Anexo I disponibilizado no Portal Nacional](https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=HO2V+vzhFBk%3D) identificam `588` para caracteres de edição entre tags ou nas extremidades da mensagem. A SEFAZ-PR HML confirmou essa rejeição na devolução: o XML revisado preservava a indentação dos fragmentos da NF-e original. A transmissão remove esses nós de formatação antes de assinar, preserva espaços dentro dos valores e valida o XSD completo após a assinatura. A declaração XML é removida somente ao incorporar a NF-e ao lote, sem modificar o conteúdo assinado. Consulta restrita à formação da mensagem, sem revisão integral das NTs.
- `last_cancellation_timestamp_check`: 2026-10-01. A [NT 2011.003, leiaute do evento de cancelamento, Portal Nacional](https://www.nfe.fazenda.gov.br/Portal/exibirArquivo.aspx?conteudo=hNJXbmu+l8Q%3D) descreve o horário do evento com TZD numérico. O tipo `TDateTimeUTC` do pacote oficial fixado `PL_010f_v1.04` exige segundos inteiros e fuso `+HH:MM`/`-HH:MM`; `toISOString()` com milissegundos e `Z` não atende esse tipo. O evento real em homologação retornou `cStat=215` para esse formato. Cancelamento passou a reutilizar `formatNfeDateTime`; a tentativa rejeitada permanece no histórico. A página [SEFA/PR — eventos NF-e](https://sped.fazenda.pr.gov.br/NFe/Pagina/Eventos-NF-e) foi reconferida. O PDF da NT teve redirecionamento ao abrir diretamente; a busca oficial recuperou o leiaute. Esta consulta é restrita ao formato temporal do evento, sem revisão integral das NTs.
- `last_series_ie_check`: 2026-09-30. [MOC 7, Anexo I, CONFAZ](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf), B07/B26-10 (série normal CNPJ 0–889, rejeição 244) e C17-20 (IE inválida, rejeição 209); [SEFA/PR — cálculo do dígito verificador](https://www.fazenda.pr.gov.br/Pagina/calculo-digito-verificador), dois DVs módulo 11, pesos 2–7 da direita para a esquerda. Consulta direta dessas fontes; os índices MOC/NTs do Portal Nacional falharam por redirecionamento. Não considerar revisão integral das NTs atuais. A nota corrigida recebeu cStat 100 em homologação; produção permanece bloqueada.
- `last_post_authorization_consult_check`: 2026-09-30. [SEFA/PR — endpoints NF-e 4.00](https://sped.fazenda.pr.gov.br/NFe/Pagina/Enderecos-dos-ambientes-de-homologacao-e-producao-Versao-400) confirma `NFeConsultaProtocolo4` em homologação. A página oficial lista consulta por chave como serviço distinto de autorização. A [página oficial de eventos](https://sped.fazenda.pr.gov.br/NFe/Pagina/Eventos-NF-e) confirma que a situação pode ser consultada separadamente; CC-e e cancelamento são eventos registrados via serviço de eventos. Revisão de integração e endpoint, não uma revisão integral das NTs vigentes.
- `last_event_portal_check`: 2026-09-30. A [SEFA/PR — eventos NF-e](https://sped.fazenda.pr.gov.br/NFe/Pagina/Eventos-NF-e) confirma serviço estadual para CC-e e cancelamento, assinatura pelo CNPJ-base do emitente e que nova CC-e substitui a anterior. Consultar o MOC/NT e legislação aplicáveis no momento da transmissão; esta leitura não aprovou operação real de evento.
- `last_csosn_check`: 2026-09-30. [MOC 7, Anexo I, revisão 7.03 (outubro/2020), hospedado pelo CONFAZ](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf), grupo N10d, páginas 42–43: CSOSN 102/103/300/400 compartilham `ICMSSN102`, com `orig` e `CSOSN`. O XSD oficial fixado `PL_010f_v1.04` aceita 103 nesse grupo; houve validação automatizada após assinatura. A consulta confirma a estrutura XML, não o enquadramento de toda venda real. O índice/MOC/NTs do Portal Nacional tiveram falha de redirecionamento; esta consulta não é revisão integral das NTs atuais. Endpoints NF-e 4.00 de homologação da SEFA/PR foram reconferidos em 30/09/2026.
- `last_serializer_check`: 2026-09-30. Foi conferida a página oficial da SEFA/PR para CSRT e a estrutura do XSD `PL_010f_v1.04` já fixado; a abertura direta do índice/MOC no Portal Nacional falhou por redirecionamento nesta sessão. Não considerar esta verificação uma revisão integral do MOC/NTs nem aprovação tributária.
- `last_official_docs_check`: 2026-09-30.
- `moc_version_checked`: confirmar a listagem de Manuais em cada tarefa; a versão fornecida anteriormente não deve ser presumida como vigente.
- `latest_nts_checked`: a lista/avisos oficiais consultados incluem NT 2023.003 v1.30, NT 2014.001 v1.41, NT 2014.002 v1.40, NT 2026.001 v1.02a, NT 2026.004 v1.01, NT 2025.002 v1.51, NT 2026.003 v1.00, NT 2026.002 v1.10 e NT 2026.007 v1.00. Reabrir a lista e confirmar versões, escopo e cronogramas antes de usá-las.
- `source_discrepancy`: o índice de documentos vigentes exibiu NT 2014.001 v1.40, enquanto o aviso oficial de 04/08/2026 anunciou a v1.41; consultar o documento e seu cronograma diretamente se a tarefa envolver EPEC, sem inferir qual revisão se aplica.
- `schema_package_checked`: em 2026-09-29, o portal de esquemas listou o pacote 010f entre as versões oficiais em uso. O ZIP oficial referenciado em `api/nfe/schemas/README.md` retornou SHA-256 `B8589490A58A09A993A80E6AC4D7ED10F20892061ECFC56719337098D4B95998`; seus cinco XSDs coincidem byte a byte com os cinco arquivos locais. Revalidar publicação, aplicabilidade e NTs a cada mudança de XML.
- `sefaz_pr_docs_checked`: endpoints NF-e 4.00, serviços e eventos consultados em 2026-09-29; confirmar novamente serviço e ambiente antes de cada integração/transmissão.

## Regra de uso

Aplicar `.agents/skills/fiscal-nfe-nfce-official-docs/SKILL.md`. A fonte normativa é a publicação oficial atual, consultada diretamente. Este índice é apenas um mapa de navegação. Não salvar cópias locais de manuais/MOC/NT como fonte permanente. Manter apenas artefatos técnicos necessários ao funcionamento do sistema, como schemas XSD efetivamente utilizados, com versão e origem rastreáveis.

### Verificação de cancelamento comercial/fiscal — 2026-10-01

- A legislação paranaense consultada fixa NF-e modelo 55 em 168 horas ([Decreto PR 8.470/2021](https://www.legislacao.pr.gov.br/legislacao/listarAtosAno.do?action=exibir&codAto=252377)).
- O FAQ atual da SEFA/PR define NFC-e modelo 65 em 30 minutos e, após perda do prazo sem operação realizada, orienta NF-e de estorno conforme RICMS/PR art. 298, VII ([perguntas 1485 e 1671](https://atendimento.fazenda.pr.gov.br/sacsefa/portal/assuntosReferente/23)).
- O preenchimento do estorno de NF-e 55 segue a [NPF 038/2022](https://www.sefanet.pr.gov.br/dados/SEFADOCUMENTOS/103202200038.pdf). Diferenças/acréscimos para apuração posterior exigem revisão fiscal conforme art. 298, §2º. Não transmitir estorno sem revisar os dados tributários.
