# Schema oficial NF-e

Pacote `PL_010f_v1.04`, obtido do [Portal Nacional da NF-e](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=BMPFMBoln3w%3D) e reconfirmado em 29/09/2026. A listagem integral identifica o pacote 010f como versão oficial em uso, publicada em 31/08/2026, associada à NT 2025.002 v1.50 e NT 2026.007 v1.00. A listagem também contém entradas mais antigas, como 010e_v1.02; elas não substituem o 010f atual.

Conferência de vigência em 09/10/2026: o índice de schemas ainda lista o pacote 010f como oficial em uso. O Portal Nacional publicou novas revisões de NT em 01/10/2026, mas adiou a implantação da NT 2025.002 v1.52, NT 2026.007 v1.10 e NT 2026.008 v1.00 para 26/10/2026 em homologação e 16/11/2026 em produção ([aviso oficial da SVRS/ENCAT](https://dfe-portal.svrs.rs.gov.br/Nfe/Avisos)). O hash abaixo demonstra correspondência com o pacote 010f conferido em 29/09; não prova cobertura dessas revisões futuras. Revalidar o pacote e os cenários aplicáveis antes da nova data de homologação. Os erros XSD atuais de NFC-e pickup e delivery permanecem registrados no [status fiscal](../../../docs/fiscal/status-testes-homologacao.md).

## CNPJ alfanumérico e chave de acesso

A NT 2026.004 v1.01 permite letras no bloco CNPJ da chave de acesso: a chave mantém 44 posições, com padrão `[0-9]{6}[A-Z0-9]{12}[0-9]{26}`; o DV considera cada caractere pelo valor ASCII menos 48 antes do módulo 11. O XSD local aceita CNPJ alfanumérico em tipos fiscais, mas isso não comprova suporte no gerador/validador de chave. Em 09/10/2026, o código ainda gera e valida chaves apenas numéricas e normaliza chaves recebidas removendo letras. Consulte o [status fiscal](../../../docs/fiscal/status-testes-homologacao.md) antes de afirmar compatibilidade.

Fontes oficiais: [NT conjunta DFe — CNPJ alfanumérico](https://www.nfe.fazenda.gov.br/Portal/exibirArquivo.aspx?conteudo=5ZkvIZt10mQ%3D) e [NT 2026.004 v1.01](https://dfe-portal.svrs.rs.gov.br/NFe/Documentos).

Download original: `https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=8ITFuBLltXs%3D`.
SHA-256 do ZIP: `B8589490A58A09A993A80E6AC4D7ED10F20892061ECFC56719337098D4B95998`.

SHA-256 dos XSDs locais, conferidos byte a byte com o ZIP oficial em 29/09/2026:

| Arquivo | SHA-256 |
|---|---|
| `DFeTiposBasicos_v1.00.xsd` | `173577A4E3A9DC1D0DECED85B89B955B6064BB5A4AE5A96F6727D2DA8A694D09` |
| `leiauteNFe_v4.00.xsd` | `2BACE939973916D54184FF3E2740041A932DE5D79772F3363504504160F22542` |
| `nfe_v4.00.xsd` | `ADCE3646C13CEB54922EC3142FC1DC45BD4FB839AC35AD583E86C733C07D27DF` |
| `tiposBasico_v4.00.xsd` | `772619C85723E598840667CA66E7298A250442DF47EEB94B397D2A333CE62047` |
| `xmldsig-core-schema_v1.01.xsd` | `F56744A5F51C03F027DE13F39F869307091781A9EF1D91B1EBE14719CE28E1AC` |

A confirmação comparou os cinco arquivos do pacote integral, e não somente o XSD raiz. A validação local é obrigatória antes de qualquer transmissão; ela não substitui as regras de negócio da SEFAZ nem a confirmação de autorização.
