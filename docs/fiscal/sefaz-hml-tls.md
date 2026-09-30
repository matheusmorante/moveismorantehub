# Cadeia TLS da SEFAZ-PR em homologação

Em 30/09/2026, a consulta publicada da NF-e HML 700/900 retornou `SELF_SIGNED_CERT_IN_CHAIN`. O Node da Vercel não confiava na AC-Raiz v10 apresentada pelo serviço.

O servidor de `homologacao.nfe.sefa.pr.gov.br` apresenta certificado CELEPAR, intermediária `AC SOLUTI SSL EV G4` e `Autoridade Certificadora Raiz Brasileira v10`. A raiz foi obtida por HTTPS a partir do [Repositório AC-Raiz oficial do ITI](https://www.gov.br/iti/pt-br/assuntos/repositorio/repositorio-ac-raiz), link [ICP-Brasil v10 — SSL](https://acraiz.icpbrasil.gov.br/credenciadas/RAIZ/ICP-Brasilv10.crt).

Fingerprint SHA-256 da raiz: `6E:0B:FF:06:9A:26:99:4C:15:DE:2C:48:88:CC:54:AF:84:88:2E:54:95:B7:FB:F6:6B:E9:CC:FF:EC:74:89:F6`. A cópia oficial coincide com a raiz da cadeia do servidor; flag CA e assinatura própria foram verificadas. A origem é a raiz oficial, não o certificado folha capturado da conexão.

`sefazHmlTrust.ts` adiciona essa raiz às autoridades padrão do Node apenas para HTTPS no hostname exato de homologação NF-e do Paraná. `rejectUnauthorized: true` e verificação de hostname continuam habilitados. Produção e outros hosts permanecem com sua confiança anterior. Não configurar `NODE_TLS_REJECT_UNAUTHORIZED=0`.

O certificado público incorporado é um artefato técnico de confiança; não contém chave privada, segredo CSRT ou dados de cliente. Atualizações devem reconferir publicação oficial, validade, fingerprint e necessidade real. A inclusão da raiz não comprova autorização de NF-e.
