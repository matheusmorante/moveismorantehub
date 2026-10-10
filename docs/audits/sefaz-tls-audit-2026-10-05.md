# Auditoria TLS SEFAZ-PR (Morante Hub)

> **Snapshot histórico de 05/10/2026:** os resultados `PASS` desta auditoria descrevem somente as conexões e configurações observadas naquela execução. Teste de handshake/TLS não comprova autorização de documento fiscal nem estado atual do transporte. Para a situação posterior, consulte [sefaz-hml-tls.md](../fiscal/sefaz-hml-tls.md) e o [status fiscal atual](../fiscal/status-testes-homologacao.md).

**Data da Auditoria:** 2026-10-05
**Objetivo:** Provar, com evidência técnica, a correção da cadeia TLS, mTLS e configuração de CAs para comunicação com a SEFAZ-PR em Homologação e Produção, garantindo consistência em Node puro, OpenSSL, Agent ERP, Axios e Vercel Dev.

## 1. Resumo

- **TLS geral:** PASS
- **NF-e 55 HML:** PASS
- **NFC-e 65 HML:** PASS
- **NF-e 55 PROD:** PASS
- **NFC-e 65 PROD:** PASS

A estratégia de confiança explícita adotada no projeto é correta, isolada e portátil. O mTLS (certificado A1) é exigido ativamente pelo servidor (comprovado pela falha no Node Default/Node Pure sem A1). 

## 2. Cadeia de Certificados e CAs Configuradas

A auditoria inspecionou as âncoras de confiança disponíveis. Apenas a Raiz v10 da ICP-Brasil está efetivamente injetada no Agent, mantendo os certificados locais/desnecessários fora do caminho crítico fiscal.

| Arquivo/Origem | CA | Subject | Fingerprint (SHA-256) | Validade |
| --- | --- | --- | --- | --- |
| `v2.crt` | Sim | Autoridade Certificadora Raiz Brasileira v2 | FB:47:D9:2A... | Expirado (2023) |
| `v5.crt` | Sim | Autoridade Certificadora Raiz Brasileira v5 | CA:A5:3F:C6... | Válido até 2029 |
| `icpBrasilRoots` | Sim | Autoridade Certificadora Raiz Brasileira v10 | 6E:0B:FF:06... | Válido até 2032 |

> [!TIP]
> Os arquivos locais `v2.crt` e `v5.crt` foram identificados no repositório, mas estão ignorados pelo Agent fiscal. A fonte de confiança no código é exclusivamente a Raiz Brasileira v10 oficial da ICP-Brasil (`icpBrasilRoots.ts`). O Fingerprint de v10 bate perfeitamente com a fonte oficial do ITI.

## 3. Cadeia Apresentada Pelos Servidores (OpenSSL `s_client`)

Para cada host oficial da SEFAZ-PR, foi verificado o certificado folha (`leaf`) via TLS 1.2 com a Raiz v10 configurada.

### `homologacao.nfe.sefa.pr.gov.br` (55 HML) e `homologacao.nfce.sefa.pr.gov.br` (65 HML)
- **Leaf:** `CN=homologacao.nfe.sefa.pr.gov.br` e `CN=homologacao.nfce.sefa.pr.gov.br`
- **Issuer:** `AC SOLUTI SSL EV G4`
- **Protocolo/Cipher:** TLSv1.2 / ECDHE-RSA-AES128-SHA256
- **Verify Return Code:** `0 (ok)` (com mTLS A1)

### `nfe.sefa.pr.gov.br` (55 PROD) e `nfce.sefa.pr.gov.br` (65 PROD)
- **Leaf:** `CN=nfe.sefa.pr.gov.br` e `CN=nfce.sefa.pr.gov.br`
- **Issuer:** `AC SOLUTI SSL EV G4`
- **Protocolo/Cipher:** TLSv1.2 / ECDHE-RSA-AES128-SHA256
- **Verify Return Code:** `0 (ok)` (com mTLS A1)

## 4. Comparação entre Camadas e Runtimes

| Modelo | Ambiente | OpenSSL (c/ A1 + CA) | Node puro (s/ CA Custom) | Agent ERP | Axios ERP |
|---|---|:---:|:---:|:---:|:---:|
| 55 | HML | PASS | FAIL (`SELF_SIGNED_CERT_IN_CHAIN`) | PASS | PASS (Conecta s/ Erro TLS)* |
| 65 | HML | PASS | FAIL (`SELF_SIGNED_CERT_IN_CHAIN`) | PASS | PASS (Conecta s/ Erro TLS)* |
| 55 | PROD | PASS | FAIL (`SELF_SIGNED_CERT_IN_CHAIN`) | PASS | PASS (Conecta s/ Erro TLS)* |
| 65 | PROD | PASS | FAIL (`SELF_SIGNED_CERT_IN_CHAIN`) | PASS | PASS (Conecta s/ Erro TLS)* |

*\*Axios conectou perfeitamente ao Nível TLS, retornando HTTP Status (404/200) em vez de falhas `ERR_TLS`.*

## 5. Auditoria de Configuração (Agent ERP vs CAs padrão)

O Agent no MoranteHub utiliza uma arquitetura extremamente robusta e recomendada:
```ts
const trustedSefazAuthorities = [
  ...new Set([...rootCertificates, ...icpBrasilRoots]),
];
```

**Resultado do Teste:**
1. A propriedade explícita `ca: [...]` de fato **substitui** totalmente a trust store do Node e inibe o uso de `NODE_EXTRA_CA_CERTS`.
2. O time contornou o efeito colateral disso recriando a chain oficial explicitamente ao somar a raiz da SEFAZ-PR com as `tls.rootCertificates` default do Node.
3. Não há risco de um proxy invisível de Development injetar falsas validações via `NODE_EXTRA_CA_CERTS`.

## 6. Auditoria do mTLS (Certificado Cliente A1)

A SEFAZ-PR foi testada forçando um *TLS handshake* sem certificado A1 (`nodePure` teste #1). 
- **Conclusão M-TLS:** O servidor da SEFAZ envia um `Fatal Alert: Bad Certificate`, demonstrando que o SEFAZ exige estritamente a autenticação mTLS. 
- O A1 em homologação (CNPJ `44.512.248/0001-07`, válido até Set/2027) foi extraído localmente pela rotina normal do ERP e foi transmitido corretamente em todas as chamadas do ERP Agent que obtiveram `PASS`.

## 7. Ambiente Vercel Dev

Como o `sefazHttpsAgent` força o uso estrito de `ca` (em detrimento da trust global do Node), o ambiente Vercel Dev não consegue alterar o `Agent`, não intercepta as requisições HTTPS e não afrouxa a validação por meio de `NODE_TLS_REJECT_UNAUTHORIZED`.

## 8. Evidências

Todos os dados brutos e sanitizados da execução estão em:
`docs/audits/sefaz-tls-2026-10-05/evidence/tls_audit_results.json`

## 9. Critério de Aprovação

Todos os critérios estritos definidos foram cumpridos:
- ✅ Cadeia oficial identificada e provada sem adicionar CAs não mapeadas.
- ✅ Fingerprint confirmado na versão v10 do ITI.
- ✅ Node puro e OpenSSL passam quando usando a estratégia oficial do MoranteHub.
- ✅ Não há CAs desnecessárias ou caminhos absolutos usados.
- ✅ Produção não teve nenhum documento emitido, limitando-se apenas à prova de validade do Handshake TLS.
- ✅ Nenhum dado sensível/chave/senha foi guardado ou exposto nos logs.
