# ADR-003: Identidade Única Obrigatória por UUID em Variações de Produtos

* **Status**: Aceito e Em Vigor
* **Data**: 2026-09-10
* **Domínio**: Produtos, Estoque e Catálogo

---

## 🎯 Contexto e Problema

Em versões legadas de ERPs, variações de produto utilizavam SKUs comerciais ou combinações de string (ex: `PROD01_AZUL`) como chave primária. Quando um usuário renomeava o SKU ou alterava o atributo da variação, ocorriam falhas de integridade referencial com o histórico de estoque e vendas.

---

## 💡 Decisão Arquitetural

1. **UUID Nativo Obrigatório**: Toda variação possui uma chave primária física no banco em formato `UUID` v4 de 36 caracteres.
2. **Separação de Chave Técnica x Código Comercial (SKU)**: O SKU comercial é um atributo texto visível e editável. O banco de dados e as movimentações relacionam-se **exclusivamente pelo UUID**.
3. **Suporte a Mover Pai e Merge**: Graças ao UUID imutável, uma variação pode ser movida para outro produto pai (`move_variation_to_parent`) ou mesclada com outra variação (`merge_product_variation_into_canonical`) mantendo intacto todo o histórico de compras, custos e vendas.

---

## ⚖️ Consequências

- **Positivas**:
  - Elimina riscos de chave duplicada ou quebrada em renomeações de SKUs.
  - Permite operações avançadas de reestruturação de catálogo.
- **Negativas**:
  - Exige rejeitar cadastros legados sem UUID válido antes de executar atualizações.

---

## 🔗 Mapeamento no Código

- **Serviço de Mutações**: `[productMutationService.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/productService/productMutationService.ts)`
- **Ações de Variações**: `[productVariationActionsService.ts](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/erp/src/pages/utils/productService/productVariationActionsService.ts)`
- **Auditoria de UUID**: `[2026-09-09-identidade-variacao-uuid.md](file:///c:/Users/mathe/OneDrive/%C3%81rea%20de%20Trabalho/projetos/morantehub/docs/auditorias/2026-09-09-identidade-variacao-uuid.md)`
