# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products\reconciliation.spec.ts >> Central de Conciliação e Saneamento de Produtos >> 9. Responsividade: Mobile (390x844)
- Location: tests\e2e\products\reconciliation.spec.ts:319:5

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Tearing down "context" exceeded the test timeout of 30000ms.
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - region "Notifications Alt+T"
    - main [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6]:
          - generic [ref=e7]:
            - generic [ref=e8]:
              - heading " Conciliação de Produtos" [level=1] [ref=e9]:
                - generic [ref=e10]: 
                - text: Conciliação de Produtos
              - paragraph [ref=e12]: Corrija campos obrigatórios e inconsistências do cadastro.
            - generic [ref=e13]:
              - generic [ref=e14]:
                - generic [ref=e16]: "0"
                - generic [ref=e17]: produtos
              - generic [ref=e18]:
                - generic [ref=e20]: "0"
                - generic [ref=e21]: pendências
          - generic [ref=e22]:
            - button " Todos 0" [ref=e23] [cursor=pointer]:
              - generic [ref=e24]: 
              - generic [ref=e25]: Todos
              - generic [ref=e26]: "0"
            - button " Fornecedor 0" [ref=e27] [cursor=pointer]:
              - generic [ref=e28]: 
              - generic [ref=e29]: Fornecedor
              - generic [ref=e30]: "0"
            - button " Categoria 0" [ref=e31] [cursor=pointer]:
              - generic [ref=e32]: 
              - generic [ref=e33]: Categoria
              - generic [ref=e34]: "0"
            - button " NCM 0" [ref=e35] [cursor=pointer]:
              - generic [ref=e36]: 
              - generic [ref=e37]: NCM
              - generic [ref=e38]: "0"
            - button " Atributos 0" [ref=e39] [cursor=pointer]:
              - generic [ref=e40]: 
              - generic [ref=e41]: Atributos
              - generic [ref=e42]: "0"
            - button " Preço 0" [ref=e43] [cursor=pointer]:
              - generic [ref=e44]: 
              - generic [ref=e45]: Preço
              - generic [ref=e46]: "0"
        - generic [ref=e48]:
          - generic [ref=e49]:
            - generic [ref=e50]: Tipo de Pendência
            - combobox [ref=e51] [cursor=pointer]:
              - option "Todas as pendências" [selected]
              - option "Sem fornecedores"
              - option "Sem categoria"
              - option "NCM ausente ou inválido"
              - option "Atributos obrigatórios / vazios"
              - option "Sem preço de venda"
          - generic [ref=e52]:
            - generic [ref=e53]: Categoria
            - generic [ref=e56]:
              - generic [ref=e57]: 
              - textbox "Todas as categorias" [ref=e58]
          - generic [ref=e59]:
            - generic [ref=e60]: Buscar Produto
            - generic [ref=e62]:
              - generic: 
              - textbox "Nome, SKU ou código..." [ref=e63]
        - generic [ref=e65]:
          - generic [ref=e66]: 
          - heading "Nenhum produto com pendências encontrado!" [level=4] [ref=e68]
          - paragraph [ref=e69]: Seus produtos estão em conformidade com as regras obrigatórias de cadastro para os filtros atuais.
    - generic [ref=e71]:
      - generic:
        - generic:
          - generic: Seu Lizandro
          - generic: Agente IA do ERP
      - button "Abrir chat do Seu Lizandro, Agente Inteligente do ERP" [ref=e72] [cursor=pointer]:
        - img "Seu Lizandro - Agente IA" [ref=e74]
  - region "Notifications Alt+T"
```