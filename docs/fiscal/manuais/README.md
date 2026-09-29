# Consulta online de documentação NF-e/NFC-e

Os PDFs fornecidos foram removidos do repositório a pedido da usuária. Este arquivo contém somente um índice de fontes oficiais; não armazena manuais, MOCs ou Notas Técnicas. Antes de cada alteração fiscal relevante, abra a página oficial, confirme a publicação vigente e acesse o documento específico aplicável.

## Fontes oficiais

- [Portal Nacional NF-e — Manuais](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=ndIjl%2BiEFdE%3D)
- [Portal Nacional NF-e — Notas Técnicas vigentes](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=6WfrpZYE4Ik%3D)
- [Portal Nacional NF-e — Esquemas XML](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=BMPFMBoln3w%3D)
- [SEFA/PR — endpoints NF-e 4.00 de homologação e produção](https://sped.fazenda.pr.gov.br/NFe/Pagina/Enderecos-dos-ambientes-de-homologacao-e-producao-Versao-400)
- [SEFA/PR — eventos NF-e](https://sped.fazenda.pr.gov.br/NFe/Pagina/Eventos-NF-e)
- [SEFA/PR — serviços web NF-e disponíveis](https://sped.fazenda.pr.gov.br/NFe/Pagina/Servicos-web-services-disponiveis)

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

- `last_official_docs_check`: 2026-09-29.
- `moc_version_checked`: confirmar a listagem de Manuais em cada tarefa; a versão fornecida anteriormente não deve ser presumida como vigente.
- `latest_nts_checked`: a lista/avisos oficiais consultados incluem NT 2023.003 v1.30, NT 2014.001 v1.41, NT 2014.002 v1.40, NT 2026.001 v1.02a, NT 2026.004 v1.01, NT 2025.002 v1.51, NT 2026.003 v1.00, NT 2026.002 v1.10 e NT 2026.007 v1.00. Reabrir a lista e confirmar versões, escopo e cronogramas antes de usá-las.
- `source_discrepancy`: o índice de documentos vigentes exibiu NT 2014.001 v1.40, enquanto o aviso oficial de 04/08/2026 anunciou a v1.41; consultar o documento e seu cronograma diretamente se a tarefa envolver EPEC, sem inferir qual revisão se aplica.
- `schema_package_checked`: em 2026-09-29, o portal de esquemas listou o pacote 010f entre as versões oficiais em uso. O ZIP oficial referenciado em `api/nfe/schemas/README.md` retornou SHA-256 `B8589490A58A09A993A80E6AC4D7ED10F20892061ECFC56719337098D4B95998`; seus cinco XSDs coincidem byte a byte com os cinco arquivos locais. Revalidar publicação, aplicabilidade e NTs a cada mudança de XML.
- `sefaz_pr_docs_checked`: endpoints NF-e 4.00, serviços e eventos consultados em 2026-09-29; confirmar novamente serviço e ambiente antes de cada integração/transmissão.

## Regra de uso

Aplicar `.agents/skills/fiscal-nfe-nfce-official-docs/SKILL.md`. A fonte normativa é a publicação oficial atual, consultada diretamente. Este índice é apenas um mapa de navegação. Não salvar cópias locais de manuais/MOC/NT como fonte permanente. Manter apenas artefatos técnicos necessários ao funcionamento do sistema, como schemas XSD efetivamente utilizados, com versão e origem rastreáveis.
