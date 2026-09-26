# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products\reconciliation.spec.ts >> Central de Conciliação e Saneamento de Produtos >> 11. Atributo obrigatório faltante aparece, pode ser preenchido e desaparece após salvar
- Location: tests\e2e\products\reconciliation.spec.ts:342:5

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
                - generic [ref=e16]: "1"
                - generic [ref=e17]: produtos
              - generic [ref=e18]:
                - generic [ref=e20]: "1"
                - generic [ref=e21]: pendências
          - generic [ref=e22]:
            - button " Todos 1" [ref=e23] [cursor=pointer]:
              - generic [ref=e24]: 
              - generic [ref=e25]: Todos
              - generic [ref=e26]: "1"
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
            - button " Atributos 1" [ref=e39] [cursor=pointer]:
              - generic [ref=e40]: 
              - generic [ref=e41]: Atributos
              - generic [ref=e42]: "1"
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
        - generic [ref=e64]:
          - generic [ref=e66] [cursor=pointer]:
            - checkbox "Selecionar todos da página (1)" [ref=e67]
            - generic [ref=e68]: Selecionar todos da página (1)
          - generic [ref=e69]:
            - generic [ref=e70]:
              - generic [ref=e71]:
                - checkbox [ref=e72] [cursor=pointer]
                - generic [ref=e73]:
                  - generic [ref=e74]:
                    - heading "[TESTE_AUT] Guarda-Roupa" [level=3] [ref=e75]
                    - generic [ref=e76]: TEST_AUT_GR_001
                  - generic [ref=e77]:
                    - generic [ref=e78]:
                      - generic [ref=e79]: 
                      - text: Guarda-Roupas
                    - generic [ref=e80]:
                      - generic [ref=e81]: 
                      - text: "[TESTE_AUT] Fornecedor"
              - generic [ref=e82]:
                - generic [ref=e83]:
                  - generic [ref=e84]: 
                  - text: 1 pendência
                - button "" [ref=e85] [cursor=pointer]
            - generic [ref=e88]:
              - generic [ref=e89]: Variações do Produto (1)
              - generic [ref=e92]:
                - generic [ref=e93]:
                  - generic [ref=e94]:
                    - generic [ref=e95]: "[TESTE_AUT] Guarda-Roupa Branco"
                    - generic [ref=e96]: TEST_AUT_GR_001-01
                  - generic [ref=e97]:
                    - generic [ref=e98]: 
                    - text: 1 pendente(s)
                - generic [ref=e100]:
                  - generic [ref=e101]:
                    - generic [ref=e102]: 
                    - text: Material
                  - textbox "Valor de Material..." [ref=e105]
          - generic [ref=e106]:
            - generic [ref=e107]: Mostrando 1 até 1 de 1 produtos
            - generic [ref=e108]:
              - button " Anterior" [disabled] [ref=e109]:
                - generic [ref=e110]: 
                - text: Anterior
              - generic [ref=e111]: Página 1
              - button "Próxima " [disabled] [ref=e112]:
                - text: Próxima
                - generic [ref=e113]: 
    - generic [ref=e115]:
      - generic:
        - generic:
          - generic: Seu Lizandro
          - generic: Agente IA do ERP
      - button "Abrir chat do Seu Lizandro, Agente Inteligente do ERP" [ref=e116] [cursor=pointer]:
        - img "Seu Lizandro - Agente IA" [ref=e118]
  - region "Notifications Alt+T"
```