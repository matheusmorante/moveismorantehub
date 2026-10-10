# ADR-005: Emissão Fiscal Direta SEFAZ-PR Sem Intermediários Pagos

* **Status**: Aceito e Em Vigor
* **Data**: 2026-09-10
* **Domínio**: Fiscal, Custos Cloud e SEFAZ-PR

Esta decisão define o meio de integração e permanece aceita. Ela não certifica a implementação de todos os modelos, eventos, contingências ou ambientes; consulte o [índice/status fiscal atual](../fiscal/README.md).

---

## 🎯 Contexto e Problema

Plataformas intermediárias de emissão fiscal cobram mensalidades ou tarifas por nota emitida, onerando a operação e inserindo uma dependência externa em caso de indisponibilidade da API intermediária.

---

## 💡 Decisão Arquitetural

1. **Emissão Direta via WebServices SEFAZ-PR**: Comunicação nativa SOAP/HTTPS direta com a Secretaria da Fazenda do Estado do Paraná (SEFAZ-PR) para emissão de NF-e (Modelo 55) e NFC-e (Modelo 65).
2. **Assinatura A1 no servidor**: Assinatura digital do XML utilizando Certificado Digital A1 no runtime server-side configurado para o ERP.
3. **Custo Zero por Nota**: Eliminação integral de custos por emissão de nota fiscal, mantendo o objetivo de custo operacional R$ 0,00 da skill `cloud-free-tier-guard`.

---

## ⚖️ Consequências

- **Positivas**:
  - Economia financeira permanente de intermediação fiscal.
  - Controle direto sobre os web services, tentativas e respostas SEFAZ nos fluxos implementados.
- **Negativas**:
  - Exige manter atualizados e versionados os schemas XSD oficiais e revisar as novas Notas Técnicas. O pacote atualmente fixado no código é informado em [`api/nfe/schemas/README.md`](../../api/nfe/schemas/README.md); isso não comprova a adoção das publicações recentes.

---

## 🔗 Mapeamento no Código

- **Serviço Fiscal**: [nfeService.ts](../../erp/src/pages/utils/nfe/nfeService.ts)
- **Documentação atual e status**: [índice fiscal](../fiscal/README.md). O antigo [documento de emissão direta](../fiscal/nfe_sefaz_direta.md) foi preservado como referência histórica.
