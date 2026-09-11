# ADR-005: Emissão Fiscal Direta SEFAZ-PR Sem Intermediários Pagos

* **Status**: Aceito e Em Vigor
* **Data**: 2026-09-10
* **Domínio**: Fiscal, Custos Cloud e SEFAZ-PR

---

## 🎯 Contexto e Problema

Plataformas intermediárias de emissão fiscal cobram mensalidades ou tarifas por nota emitida, onerando a operação e inserindo uma dependência externa em caso de indisponibilidade da API intermediária.

---

## 💡 Decisão Arquitetural

1. **Emissão Direta via WebServices SEFAZ-PR**: Comunicação nativa SOAP/HTTPS direta com a Secretaria da Fazenda do Estado do Paraná (SEFAZ-PR) para emissão de NF-e (Modelo 55) e NFC-e (Modelo 65).
2. **Assinatura A1 no Client/Node**: Assinatura digital do lote XML utilizando Certificado Digital A1 no próprio servidor/ambiente do ERP.
3. **Custo Zero por Nota**: Eliminação integral de custos por emissão de nota fiscal, mantendo o objetivo de custo operacional R$ 0,00 da skill `cloud-free-tier-guard`.

---

## ⚖️ Consequências

- **Positivas**:
  - Economia financeira permanente de intermediação fiscal.
  - Controle total sobre o ciclo de emissão, contingência e retorno do protocolo SEFAZ.
- **Negativas**:
  - Exige manter atualizados os schemas XSD oficiais da SEFAZ (PL_009, etc.).

---

## 🔗 Mapeamento no Código

- **Serviço Fiscal**: `[nfeService.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/nfe/nfeService.ts)`
- **Documentação de Emissão**: `[nfe_sefaz_direta.md](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/docs/fiscal/nfe_sefaz_direta.md)`
