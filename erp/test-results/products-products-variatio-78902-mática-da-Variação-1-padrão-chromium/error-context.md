# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products\products-variations-e2e.spec.ts >> Suíte E2E B2B - Criação de Produto, Variações e Validações de Negócio >> Caso 1: Criação de produto simples e geração automática da Variação 1 padrão
- Location: tests\e2e\products\products-variations-e2e.spec.ts:51:5

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('div[role="dialog"] table tbody tr')
Expected: 1
Received: 0
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" locator('div[role="dialog"] table tbody tr') with timeout 5000ms
  - waiting for locator('div[role="dialog"] table tbody tr')
    14 × locator resolved to 0 elements
       - unexpected value "0"

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - region "Notifications Alt+T"
      - main [ref=e4]:
        - generic [ref=e7]:
          - generic [ref=e9]:
            - generic [ref=e10]:
              - generic [ref=e11]: 
              - textbox "Pesquisar produtos..." [ref=e12]
            - text: 
            - button " Novo Produto" [ref=e14] [cursor=pointer]:
              - generic [ref=e15]: 
              - generic [ref=e16]: Novo Produto
          - generic [ref=e17]:
            - generic [ref=e20]:
              - button " Mostrar desativados" [ref=e22] [cursor=pointer]:
                - generic [ref=e23]: 
                - text: Mostrar desativados
              - generic [ref=e24]:
                - text:                                                                                                       
                - generic [ref=e25]:
                  - button " Variações (1) 003995 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Sofá Woodx Jaffar 3 Lugares 2,00 M Sofás •  Multiloja Salvados" [ref=e26] [cursor=pointer]:
                    - generic [ref=e27]:
                      - generic [ref=e28]:
                        - button " Variações (1)" [ref=e29]:
                          - generic [ref=e30]: 
                          - generic [ref=e31]: Variações (1)
                        - generic [ref=e32]: "003995"
                      - generic [ref=e33]:
                        - generic "Status ERP derivado das variações" [ref=e35]:
                          - generic [ref=e36]:
                            - generic [ref=e37]: ERP
                            - generic [ref=e38]: Ativo
                        - generic [ref=e41]:
                          - generic [ref=e42]: 
                          - text: Queima dos Salvados
                        - generic [ref=e43]:
                          - button "Editar Produto" [ref=e44]:
                            - generic [ref=e45]: 
                          - button "Opções do produto" [ref=e46]:
                            - generic [ref=e47]: 
                    - generic [ref=e49]:
                      - heading "Sofá Woodx Jaffar 3 Lugares 2,00 M" [level=3] [ref=e50]
                      - generic [ref=e51]:
                        - generic [ref=e52]: Sofás
                        - generic [ref=e53]: •
                        - generic [ref=e54]:
                          - generic [ref=e55]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003994 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Guarda Roupa Atualle Sao Paulo 6pt 3gv Friso Reflec Guarda-Roupas •  Multiloja Salvados" [ref=e56] [cursor=pointer]:
                    - generic [ref=e57]:
                      - generic [ref=e58]:
                        - button " Variações (1)" [ref=e59]:
                          - generic [ref=e60]: 
                          - generic [ref=e61]: Variações (1)
                        - generic [ref=e62]: "003994"
                      - generic [ref=e63]:
                        - generic "Status ERP derivado das variações" [ref=e65]:
                          - generic [ref=e66]:
                            - generic [ref=e67]: ERP
                            - generic [ref=e68]: Ativo
                        - generic [ref=e71]:
                          - generic [ref=e72]: 
                          - text: Queima dos Salvados
                        - generic [ref=e73]:
                          - button "Editar Produto" [ref=e74]:
                            - generic [ref=e75]: 
                          - button "Opções do produto" [ref=e76]:
                            - generic [ref=e77]: 
                    - generic [ref=e79]:
                      - heading "Guarda Roupa Atualle Sao Paulo 6pt 3gv Friso Reflec" [level=3] [ref=e80]
                      - generic [ref=e81]:
                        - generic [ref=e82]: Guarda-Roupas
                        - generic [ref=e83]: •
                        - generic [ref=e84]:
                          - generic [ref=e85]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003993 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Guarda Roupa Faimec Portugal 2 Portas Guarda-Roupas •  Multiloja Salvados" [ref=e86] [cursor=pointer]:
                    - generic [ref=e87]:
                      - generic [ref=e88]:
                        - button " Variações (1)" [ref=e89]:
                          - generic [ref=e90]: 
                          - generic [ref=e91]: Variações (1)
                        - generic [ref=e92]: "003993"
                      - generic [ref=e93]:
                        - generic "Status ERP derivado das variações" [ref=e95]:
                          - generic [ref=e96]:
                            - generic [ref=e97]: ERP
                            - generic [ref=e98]: Ativo
                        - generic [ref=e101]:
                          - generic [ref=e102]: 
                          - text: Queima dos Salvados
                        - generic [ref=e103]:
                          - button "Editar Produto" [ref=e104]:
                            - generic [ref=e105]: 
                          - button "Opções do produto" [ref=e106]:
                            - generic [ref=e107]: 
                    - generic [ref=e109]:
                      - heading "Guarda Roupa Faimec Portugal 2 Portas" [level=3] [ref=e110]
                      - generic [ref=e111]:
                        - generic [ref=e112]: Guarda-Roupas
                        - generic [ref=e113]: •
                        - generic [ref=e114]:
                          - generic [ref=e115]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003992 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Paneleiro Telasul Star New 4pt 80cm Paneleiros •  Multiloja Salvados" [ref=e116] [cursor=pointer]:
                    - generic [ref=e117]:
                      - generic [ref=e118]:
                        - button " Variações (1)" [ref=e119]:
                          - generic [ref=e120]: 
                          - generic [ref=e121]: Variações (1)
                        - generic [ref=e122]: "003992"
                      - generic [ref=e123]:
                        - generic "Status ERP derivado das variações" [ref=e125]:
                          - generic [ref=e126]:
                            - generic [ref=e127]: ERP
                            - generic [ref=e128]: Ativo
                        - generic [ref=e131]:
                          - generic [ref=e132]: 
                          - text: Queima dos Salvados
                        - generic [ref=e133]:
                          - button "Editar Produto" [ref=e134]:
                            - generic [ref=e135]: 
                          - button "Opções do produto" [ref=e136]:
                            - generic [ref=e137]: 
                    - generic [ref=e139]:
                      - heading "Paneleiro Telasul Star New 4pt 80cm" [level=3] [ref=e140]
                      - generic [ref=e141]:
                        - generic [ref=e142]: Paneleiros
                        - generic [ref=e143]: •
                        - generic [ref=e144]:
                          - generic [ref=e145]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003991 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Cabeceira Jsw Amanda 1,58 M Cabeceiras •  Multiloja Salvados" [ref=e146] [cursor=pointer]:
                    - generic [ref=e147]:
                      - generic [ref=e148]:
                        - button " Variações (1)" [ref=e149]:
                          - generic [ref=e150]: 
                          - generic [ref=e151]: Variações (1)
                        - generic [ref=e152]: "003991"
                      - generic [ref=e153]:
                        - generic "Status ERP derivado das variações" [ref=e155]:
                          - generic [ref=e156]:
                            - generic [ref=e157]: ERP
                            - generic [ref=e158]: Ativo
                        - generic [ref=e161]:
                          - generic [ref=e162]: 
                          - text: Queima dos Salvados
                        - generic [ref=e163]:
                          - button "Editar Produto" [ref=e164]:
                            - generic [ref=e165]: 
                          - button "Opções do produto" [ref=e166]:
                            - generic [ref=e167]: 
                    - generic [ref=e169]:
                      - heading "Cabeceira Jsw Amanda 1,58 M" [level=3] [ref=e170]
                      - generic [ref=e171]:
                        - generic [ref=e172]: Cabeceiras
                        - generic [ref=e173]: •
                        - generic [ref=e174]:
                          - generic [ref=e175]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003990 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Sofá Woodx Khalifa 4lug 2,50 M Veludo Sofás •  Multiloja Salvados" [ref=e176] [cursor=pointer]:
                    - generic [ref=e177]:
                      - generic [ref=e178]:
                        - button " Variações (1)" [ref=e179]:
                          - generic [ref=e180]: 
                          - generic [ref=e181]: Variações (1)
                        - generic [ref=e182]: "003990"
                      - generic [ref=e183]:
                        - generic "Status ERP derivado das variações" [ref=e185]:
                          - generic [ref=e186]:
                            - generic [ref=e187]: ERP
                            - generic [ref=e188]: Ativo
                        - generic [ref=e191]:
                          - generic [ref=e192]: 
                          - text: Queima dos Salvados
                        - generic [ref=e193]:
                          - button "Editar Produto" [ref=e194]:
                            - generic [ref=e195]: 
                          - button "Opções do produto" [ref=e196]:
                            - generic [ref=e197]: 
                    - generic [ref=e199]:
                      - heading "Sofá Woodx Khalifa 4lug 2,50 M Veludo" [level=3] [ref=e200]
                      - generic [ref=e201]:
                        - generic [ref=e202]: Sofás
                        - generic [ref=e203]: •
                        - generic [ref=e204]:
                          - generic [ref=e205]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003989 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Paneleiro Telasul Lumina 2pt 50cm Paneleiros •  Multiloja Salvados" [ref=e206] [cursor=pointer]:
                    - generic [ref=e207]:
                      - generic [ref=e208]:
                        - button " Variações (1)" [ref=e209]:
                          - generic [ref=e210]: 
                          - generic [ref=e211]: Variações (1)
                        - generic [ref=e212]: "003989"
                      - generic [ref=e213]:
                        - generic "Status ERP derivado das variações" [ref=e215]:
                          - generic [ref=e216]:
                            - generic [ref=e217]: ERP
                            - generic [ref=e218]: Ativo
                        - generic [ref=e221]:
                          - generic [ref=e222]: 
                          - text: Queima dos Salvados
                        - generic [ref=e223]:
                          - button "Editar Produto" [ref=e224]:
                            - generic [ref=e225]: 
                          - button "Opções do produto" [ref=e226]:
                            - generic [ref=e227]: 
                    - generic [ref=e229]:
                      - heading "Paneleiro Telasul Lumina 2pt 50cm" [level=3] [ref=e230]
                      - generic [ref=e231]:
                        - generic [ref=e232]: Paneleiros
                        - generic [ref=e233]: •
                        - generic [ref=e234]:
                          - generic [ref=e235]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003988 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Mesa Madetal Onix MDF/Vidro 154 X 90 Mesa para Sala de Jantar •  Multiloja Salvados" [ref=e236] [cursor=pointer]:
                    - generic [ref=e237]:
                      - generic [ref=e238]:
                        - button " Variações (1)" [ref=e239]:
                          - generic [ref=e240]: 
                          - generic [ref=e241]: Variações (1)
                        - generic [ref=e242]: "003988"
                      - generic [ref=e243]:
                        - generic "Status ERP derivado das variações" [ref=e245]:
                          - generic [ref=e246]:
                            - generic [ref=e247]: ERP
                            - generic [ref=e248]: Ativo
                        - generic [ref=e251]:
                          - generic [ref=e252]: 
                          - text: Queima dos Salvados
                        - generic [ref=e253]:
                          - button "Editar Produto" [ref=e254]:
                            - generic [ref=e255]: 
                          - button "Opções do produto" [ref=e256]:
                            - generic [ref=e257]: 
                    - generic [ref=e259]:
                      - heading "Mesa Madetal Onix MDF/Vidro 154 X 90" [level=3] [ref=e260]
                      - generic [ref=e261]:
                        - generic [ref=e262]: Mesa para Sala de Jantar
                        - generic [ref=e263]: •
                        - generic [ref=e264]:
                          - generic [ref=e265]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003987 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Cristaleira Indekes Damasco 2 Portas de Vidro LED 70cm Cristaleiras •  Multiloja Salvados" [ref=e266] [cursor=pointer]:
                    - generic [ref=e267]:
                      - generic [ref=e268]:
                        - button " Variações (1)" [ref=e269]:
                          - generic [ref=e270]: 
                          - generic [ref=e271]: Variações (1)
                        - generic [ref=e272]: "003987"
                      - generic [ref=e273]:
                        - generic "Status ERP derivado das variações" [ref=e275]:
                          - generic [ref=e276]:
                            - generic [ref=e277]: ERP
                            - generic [ref=e278]: Ativo
                        - generic [ref=e281]:
                          - generic [ref=e282]: 
                          - text: Queima dos Salvados
                        - generic [ref=e283]:
                          - button "Editar Produto" [ref=e284]:
                            - generic [ref=e285]: 
                          - button "Opções do produto" [ref=e286]:
                            - generic [ref=e287]: 
                    - generic [ref=e289]:
                      - heading "Cristaleira Indekes Damasco 2 Portas de Vidro LED 70cm" [level=3] [ref=e290]
                      - generic [ref=e291]:
                        - generic [ref=e292]: Cristaleiras
                        - generic [ref=e293]: •
                        - generic [ref=e294]:
                          - generic [ref=e295]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003986 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Guarda Roupa Notavel Nt5015 4pt 3gv Guarda-Roupas •  Multiloja Salvados" [ref=e296] [cursor=pointer]:
                    - generic [ref=e297]:
                      - generic [ref=e298]:
                        - button " Variações (1)" [ref=e299]:
                          - generic [ref=e300]: 
                          - generic [ref=e301]: Variações (1)
                        - generic [ref=e302]: "003986"
                      - generic [ref=e303]:
                        - generic "Status ERP derivado das variações" [ref=e305]:
                          - generic [ref=e306]:
                            - generic [ref=e307]: ERP
                            - generic [ref=e308]: Ativo
                        - generic [ref=e311]:
                          - generic [ref=e312]: 
                          - text: Queima dos Salvados
                        - generic [ref=e313]:
                          - button "Editar Produto" [ref=e314]:
                            - generic [ref=e315]: 
                          - button "Opções do produto" [ref=e316]:
                            - generic [ref=e317]: 
                    - generic [ref=e319]:
                      - heading "Guarda Roupa Notavel Nt5015 4pt 3gv" [level=3] [ref=e320]
                      - generic [ref=e321]:
                        - generic [ref=e322]: Guarda-Roupas
                        - generic [ref=e323]: •
                        - generic [ref=e324]:
                          - generic [ref=e325]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003985 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Balcão para Cooktop 1,05 Indekes 1pt 1gv C/Tampo Balcões para Cooktop •  Multiloja Salvados" [ref=e326] [cursor=pointer]:
                    - generic [ref=e327]:
                      - generic [ref=e328]:
                        - button " Variações (1)" [ref=e329]:
                          - generic [ref=e330]: 
                          - generic [ref=e331]: Variações (1)
                        - generic [ref=e332]: "003985"
                      - generic [ref=e333]:
                        - generic "Status ERP derivado das variações" [ref=e335]:
                          - generic [ref=e336]:
                            - generic [ref=e337]: ERP
                            - generic [ref=e338]: Ativo
                        - generic [ref=e341]:
                          - generic [ref=e342]: 
                          - text: Queima dos Salvados
                        - generic [ref=e343]:
                          - button "Editar Produto" [ref=e344]:
                            - generic [ref=e345]: 
                          - button "Opções do produto" [ref=e346]:
                            - generic [ref=e347]: 
                    - generic [ref=e349]:
                      - heading "Balcão para Cooktop 1,05 Indekes 1pt 1gv C/Tampo" [level=3] [ref=e350]
                      - generic [ref=e351]:
                        - generic [ref=e352]: Balcões para Cooktop
                        - generic [ref=e353]: •
                        - generic [ref=e354]:
                          - generic [ref=e355]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003984 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Berço Mini Cama Henn Aconcheg Berços •  Multiloja Salvados" [ref=e356] [cursor=pointer]:
                    - generic [ref=e357]:
                      - generic [ref=e358]:
                        - button " Variações (1)" [ref=e359]:
                          - generic [ref=e360]: 
                          - generic [ref=e361]: Variações (1)
                        - generic [ref=e362]: "003984"
                      - generic [ref=e363]:
                        - generic "Status ERP derivado das variações" [ref=e365]:
                          - generic [ref=e366]:
                            - generic [ref=e367]: ERP
                            - generic [ref=e368]: Ativo
                        - generic [ref=e371]:
                          - generic [ref=e372]: 
                          - text: Queima dos Salvados
                        - generic [ref=e373]:
                          - button "Editar Produto" [ref=e374]:
                            - generic [ref=e375]: 
                          - button "Opções do produto" [ref=e376]:
                            - generic [ref=e377]: 
                    - generic [ref=e379]:
                      - heading "Berço Mini Cama Henn Aconcheg" [level=3] [ref=e380]
                      - generic [ref=e381]:
                        - generic [ref=e382]: Berços
                        - generic [ref=e383]: •
                        - generic [ref=e384]:
                          - generic [ref=e385]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003983 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Comoda Infantil Henn Aconchego 1pt 4gv Cômodas •  Multiloja Salvados" [ref=e386] [cursor=pointer]:
                    - generic [ref=e387]:
                      - generic [ref=e388]:
                        - button " Variações (1)" [ref=e389]:
                          - generic [ref=e390]: 
                          - generic [ref=e391]: Variações (1)
                        - generic [ref=e392]: "003983"
                      - generic [ref=e393]:
                        - generic "Status ERP derivado das variações" [ref=e395]:
                          - generic [ref=e396]:
                            - generic [ref=e397]: ERP
                            - generic [ref=e398]: Ativo
                        - generic [ref=e401]:
                          - generic [ref=e402]: 
                          - text: Queima dos Salvados
                        - generic [ref=e403]:
                          - button "Editar Produto" [ref=e404]:
                            - generic [ref=e405]: 
                          - button "Opções do produto" [ref=e406]:
                            - generic [ref=e407]: 
                    - generic [ref=e409]:
                      - heading "Comoda Infantil Henn Aconchego 1pt 4gv" [level=3] [ref=e410]
                      - generic [ref=e411]:
                        - generic [ref=e412]: Cômodas
                        - generic [ref=e413]: •
                        - generic [ref=e414]:
                          - generic [ref=e415]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003982 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Guarda Roupa Doripel New Xangai 6pt 2gv 100% MDF Guarda-Roupas •  Multiloja Salvados" [ref=e416] [cursor=pointer]:
                    - generic [ref=e417]:
                      - generic [ref=e418]:
                        - button " Variações (1)" [ref=e419]:
                          - generic [ref=e420]: 
                          - generic [ref=e421]: Variações (1)
                        - generic [ref=e422]: "003982"
                      - generic [ref=e423]:
                        - generic "Status ERP derivado das variações" [ref=e425]:
                          - generic [ref=e426]:
                            - generic [ref=e427]: ERP
                            - generic [ref=e428]: Ativo
                        - generic [ref=e431]:
                          - generic [ref=e432]: 
                          - text: Queima dos Salvados
                        - generic [ref=e433]:
                          - button "Editar Produto" [ref=e434]:
                            - generic [ref=e435]: 
                          - button "Opções do produto" [ref=e436]:
                            - generic [ref=e437]: 
                    - generic [ref=e439]:
                      - heading "Guarda Roupa Doripel New Xangai 6pt 2gv 100% MDF" [level=3] [ref=e440]
                      - generic [ref=e441]:
                        - generic [ref=e442]: Guarda-Roupas
                        - generic [ref=e443]: •
                        - generic [ref=e444]:
                          - generic [ref=e445]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003981 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Guarda Roupa Made Marcs Atlanta 2 Portas 4 Gavetas Ripado Guarda-Roupas •  Multiloja Salvados" [ref=e446] [cursor=pointer]:
                    - generic [ref=e447]:
                      - generic [ref=e448]:
                        - button " Variações (1)" [ref=e449]:
                          - generic [ref=e450]: 
                          - generic [ref=e451]: Variações (1)
                        - generic [ref=e452]: "003981"
                      - generic [ref=e453]:
                        - generic "Status ERP derivado das variações" [ref=e455]:
                          - generic [ref=e456]:
                            - generic [ref=e457]: ERP
                            - generic [ref=e458]: Ativo
                        - generic [ref=e461]:
                          - generic [ref=e462]: 
                          - text: Queima dos Salvados
                        - generic [ref=e463]:
                          - button "Editar Produto" [ref=e464]:
                            - generic [ref=e465]: 
                          - button "Opções do produto" [ref=e466]:
                            - generic [ref=e467]: 
                    - generic [ref=e469]:
                      - heading "Guarda Roupa Made Marcs Atlanta 2 Portas 4 Gavetas Ripado" [level=3] [ref=e470]
                      - generic [ref=e471]:
                        - generic [ref=e472]: Guarda-Roupas
                        - generic [ref=e473]: •
                        - generic [ref=e474]:
                          - generic [ref=e475]: 
                          - text: Multiloja Salvados
              - generic [ref=e476]:
                - generic [ref=e477]:
                  - generic [ref=e478]: Página 1 · 237 itens no catálogo
                  - combobox [ref=e480]:
                    - option "10 por página"
                    - option "15 por página" [selected]
                - generic [ref=e481]:
                  - button "" [disabled] [ref=e482]
                  - button "1" [disabled] [ref=e486]
                  - button "2" [ref=e488] [cursor=pointer]
                  - button "" [ref=e489] [cursor=pointer]
            - generic [ref=e491]:
              - generic [ref=e492]:
                - button " Resumo dos Produtos " [ref=e493] [cursor=pointer]:
                  - generic [ref=e494]:
                    - generic [ref=e495]: 
                    - heading "Resumo dos Produtos" [level=4] [ref=e497]
                  - generic [ref=e498]: 
                - generic [ref=e499]:
                  - button " Total de Cadastrados 269" [ref=e500] [cursor=pointer]:
                    - generic [ref=e501]:
                      - generic [ref=e502]: 
                      - generic [ref=e503]: Total de Cadastrados
                    - generic [ref=e504]: "269"
                  - generic [ref=e505]:
                    - button "Publicados 153" [ref=e506] [cursor=pointer]:
                      - generic [ref=e507]: Publicados
                      - generic [ref=e508]: "153"
                    - button "Desativados 23" [ref=e509] [cursor=pointer]:
                      - generic [ref=e510]: Desativados
                      - generic [ref=e511]: "23"
                    - button " Rascunhos (Em Cadastro) 0" [ref=e512] [cursor=pointer]:
                      - generic [ref=e513]:
                        - generic [ref=e514]: 
                        - generic [ref=e515]: Rascunhos (Em Cadastro)
                      - generic [ref=e516]: "0"
              - generic [ref=e517]:
                - button " Filtros " [ref=e518] [cursor=pointer]:
                  - generic [ref=e519]:
                    - generic [ref=e520]: 
                    - heading "Filtros" [level=4] [ref=e522]
                  - generic [ref=e523]: 
                - complementary "Filtros de produtos" [ref=e525]:
                  - generic [ref=e526]:
                    - generic [ref=e527]: Parâmetros
                    - generic [ref=e529]:
                      - generic [ref=e530]:
                        - generic [ref=e531]: Categoria
                        - combobox "Categoria" [ref=e532] [cursor=pointer]:
                          - option "Todas as Categorias" [selected]
                          - option "Somente Produtos"
                          - option "Somente Serviços"
                          - option "Aparadores Buffets"
                          - option "Armários Aéreos"
                          - option "Armários Multiuso"
                          - option "Armários para Fornos"
                          - option "Balcões com Fruteiras"
                          - option "Balcões com Tampo"
                          - option "Balcões para Cooktop"
                          - option "Balcões para Filtro de Àgua"
                          - option "Balcões para Pia"
                          - option "Banheiro"
                          - option "Beliches"
                          - option "Berços"
                          - option "Cabeceiras"
                          - option "Cadeiras para Escritório"
                          - option "Cadeiras para Sala de Jantar"
                          - option "Camas/Bases Box"
                          - option "Colchões"
                          - option "Cômodas"
                          - option "Conjunto para Sala de Jantar"
                          - option "Conjuntos para Banheiro"
                          - option "Cozinha"
                          - option "Cristaleiras"
                          - option "Escritório"
                          - option "Espelheira para Banheiro"
                          - option "Estantes"
                          - option "Guarda-Roupas"
                          - option "Homes"
                          - option "Jogo de Cozinha"
                          - option "Lavanderia"
                          - option "Mesa para Sala de Jantar"
                          - option "Mesas de Cabeceira"
                          - option "Mesas para Escritório"
                          - option "Painéis"
                          - option "Paneleiros"
                          - option "Penteadeiras"
                          - option "Pias"
                          - option "Poltronas"
                          - option "Quarto"
                          - option "Racks"
                          - option "Sala de Estar"
                          - option "Sala de Jantar"
                          - option "Sapateiras"
                          - option "Sofás"
                          - option "Tampos"
                          - option "Treliches"
                      - generic [ref=e533]:
                        - generic [ref=e534]: Situação no ERP
                        - combobox "Situação no ERP" [ref=e535] [cursor=pointer]:
                          - option "Todos os Produtos" [selected]
                          - option "Produtos Ativos"
                          - option "Produtos Desativados"
                          - option "Rascunhos (Em Cadastro)"
                      - generic [ref=e536]:
                        - generic [ref=e537]: Catálogo Digital
                        - combobox "Catálogo Digital" [ref=e538] [cursor=pointer]:
                          - option "Todos" [selected]
                          - option "Publicado no Catálogo"
                          - option "Ocultado do Catálogo"
                  - button "Limpar Filtros" [ref=e540] [cursor=pointer]:
                    - generic [aria-hidden] [ref=e541]: 
                    - text: Limpar Filtros
      - generic [ref=e543]:
        - generic:
          - generic:
            - generic: Seu Lizandro
            - generic: Agente IA do ERP
        - button "Abrir chat do Seu Lizandro, Agente Inteligente do ERP" [ref=e544] [cursor=pointer]:
          - img "Seu Lizandro - Agente IA" [ref=e546]
    - region "Notifications Alt+T"
  - dialog [ref=e549]:
    - button "Fechar formulário de produto" [ref=e550]
    - generic [ref=e551]:
      - generic [ref=e552]:
        - generic [ref=e553]:
          - heading "Cadastro de Produto" [level=2] [ref=e554]
          - generic [ref=e555]:
            - generic [ref=e556]: "ERP: Pendente"
            - generic [ref=e559]: "Catálogo: Ocultado"
        - button "Fechar formulário" [ref=e562] [cursor=pointer]:
          - generic [aria-hidden] [ref=e563]: 
      - tablist "Abas do formulário de produto" [ref=e565]:
        - tab "Cadastro Geral" [selected] [ref=e566] [cursor=pointer]
        - tab "Fotos" [ref=e568] [cursor=pointer]:
          - generic [aria-hidden] [ref=e569]: 
        - tab "Informações Técnicas" [ref=e571] [cursor=pointer]:
          - generic [aria-hidden] [ref=e572]: 
        - tab "Estoque e Precificação" [ref=e574] [cursor=pointer]:
          - generic [aria-hidden] [ref=e575]: 
        - tab "Variações" [active] [ref=e577] [cursor=pointer]:
          - generic [aria-hidden] [ref=e578]: 
        - tab "Tributário / NF" [ref=e580] [cursor=pointer]:
          - generic [aria-hidden] [ref=e581]: 
      - generic [ref=e584]:
        - generic [ref=e586]:
          - generic [ref=e587]:
            - generic [ref=e588]:
              - generic [ref=e589]: Nome
              - generic [ref=e590]: "*"
            - button "Diferenciar Título no Catálogo" [ref=e591] [cursor=pointer]
          - 'textbox "Digite o nome interno do produto (ex: SOFA 3 LUG)..." [ref=e592]'
        - generic [ref=e594]:
          - generic [ref=e596]:
            - generic [ref=e597]:
              - generic [ref=e598]: Categoria(s)
              - generic [ref=e599]: "*"
            - button "Gerenciar Categorias de Produtos" [ref=e600] [cursor=pointer]:
              - generic [ref=e601]: GERENCIAR
              - generic [ref=e602]: 
          - generic [ref=e604]:
            - generic: 
            - textbox "Pesquisar categorias" [ref=e605]:
              - /placeholder: Pesquisar categorias...
        - generic [ref=e607]:
          - generic [ref=e608]: Oportunidade
          - combobox [ref=e610]:
            - option "Nenhuma (Produto Normal)" [selected]
            - option "Mega Liquidação"
            - option "Queima dos Salvados"
            - option "Última Unidade - Mostruário"
        - generic [ref=e612]:
          - generic [ref=e613]: Observações Internas
          - textbox "Digite notas internas sobre este produto, processos ou detalhes específicos..." [ref=e615]
      - generic [ref=e616]:
        - button " Salvar rascunho" [disabled] [ref=e618]:
          - generic [ref=e619]: 
          - generic [ref=e620]: Salvar rascunho
        - generic [ref=e621]:
          - button "Cancelar" [ref=e622] [cursor=pointer]
          - button "Próxima etapa " [ref=e623] [cursor=pointer]:
            - generic [ref=e624]: Próxima etapa
            - generic [ref=e625]: 
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Suíte E2E B2B - Criação de Produto, Variações e Validações de Negócio', () => {
  4   |     const testRunId = `[TESTE_AUT]_VAR_${Date.now()}`;
  5   |     const AUTH_QUERY = 'auth_email=matheusmorante002@gmail.com&user_id=mock-e2e-master&auth_role=administrator';
  6   |     let consoleErrors: string[] = [];
  7   |     let pageErrors: string[] = [];
  8   | 
  9   |     test.beforeEach(async ({ page }) => {
  10  |         consoleErrors = [];
  11  |         pageErrors = [];
  12  | 
  13  |         page.on('console', msg => {
  14  |             if (msg.type() === 'error') {
  15  |                 consoleErrors.push(msg.text());
  16  |             }
  17  |         });
  18  | 
  19  |         page.on('pageerror', err => {
  20  |             pageErrors.push(err.message);
  21  |         });
  22  | 
  23  |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  24  |         await page.waitForLoadState('domcontentloaded');
  25  |     });
  26  | 
  27  |     test.afterEach(async ({ page }) => {
  28  |         const realErrors = consoleErrors.filter(e => 
  29  |             !e.includes('favicon') && 
  30  |             !e.includes('Download the React DevTools') &&
  31  |             !e.includes('net::ERR_CONNECTION_REFUSED') && !e.includes('404') && !e.includes('Not Found')
  32  |         );
  33  |         expect(realErrors, 'Erros críticos de console detectados').toEqual([]);
  34  |         expect(pageErrors, 'Exceções de tela branca detectadas').toEqual([]);
  35  | 
  36  |         // Teardown seguro de dados criados com testRunId
  37  |         await page.evaluate((runId) => {
  38  |             const raw = localStorage.getItem('erp_products');
  39  |             if (raw) {
  40  |                 try {
  41  |                     const products = JSON.parse(raw);
  42  |                     const filtered = products.filter((p: any) => !p.name?.includes(runId) && !p.id?.includes(runId));
  43  |                     localStorage.setItem('erp_products', JSON.stringify(filtered));
  44  |                 } catch (e) {
  45  |                     console.error(e);
  46  |                 }
  47  |             }
  48  |         }, testRunId);
  49  |     });
  50  | 
  51  |     test('Caso 1: Criação de produto simples e geração automática da Variação 1 padrão', async ({ page }) => {
  52  |         const newProductBtn = page.locator('button:has-text("Novo Produto")').first();
  53  |         await expect(newProductBtn).toBeVisible({ timeout: 15000 });
  54  |         await newProductBtn.click();
  55  | 
  56  |         // Modal de produto deve estar visível
  57  |         const parentModal = page.locator('.fixed.inset-0 .relative.bg-white, .fixed.inset-0 .relative.dark\\:bg-slate-900').first();
  58  |         await expect(parentModal).toBeVisible({ timeout: 5000 });
  59  | 
  60  |         // Preenche o nome na aba Geral
  61  |         const nameInput = page.locator('input[placeholder*="nome interno"], input[placeholder*="SOFA 3 LUG"]').first();
  62  |         await expect(nameInput).toBeVisible();
  63  |         await nameInput.fill(`${testRunId} poltrona do papai com reclinador`);
  64  |         await nameInput.blur();
  65  | 
  66  |         // Verifica formatação automática em Title Case com conectivos 'do' e 'com' em minúsculo
  67  |         const formattedValue = await nameInput.inputValue();
  68  |         expect(formattedValue).toContain('Poltrona do Papai com Reclinador');
  69  | 
  70  |         // Navega para a aba de variações
  71  |         const variationsTabBtn = page.locator('button:has-text("Variações")').first();
  72  |         await variationsTabBtn.click();
  73  | 
  74  |         // Deve existir a Variação 1 gerada automaticamente na lista
  75  |         const tableRows = page.locator('div[role="dialog"] table tbody tr');
  76  |         console.log(await page.evaluate(() => document.body.innerHTML.substring(0, 3000)));
> 77  |         await expect(tableRows).toHaveCount(1);
      |                                 ^ Error: expect(locator).toHaveCount(expected) failed
  78  |     });
  79  | 
  80  |     test('Caso 2: Bloqueio de criação de nova variação sem atributo definido na Variação 1', async ({ page }) => {
  81  |         const newProductBtn = page.locator('button:has-text("Novo Produto")').first();
  82  |         await expect(newProductBtn).toBeVisible({ timeout: 15000 });
  83  |         await newProductBtn.click();
  84  | 
  85  |         // Navega para a aba de variações
  86  |         const variationsTabBtn = page.locator('button:has-text("Variações")').first();
  87  |         await variationsTabBtn.click();
  88  | 
  89  |         // Botão "Adicionar variação" deve estar desabilitado ou barrar a criação com aviso
  90  |         const addVarBtn = page.locator('button:has-text("Adicionar variação")').first();
  91  |         const isDisabled = await addVarBtn.isDisabled();
  92  | 
  93  |         if (isDisabled) {
  94  |             expect(isDisabled).toBe(true);
  95  |         } else {
  96  |             await addVarBtn.click();
  97  |             // Deve exibir toast de bloqueio informando necessidade de atributo na Variação 1
  98  |             const toastMessage = page.locator('text=Antes de criar outra variação, informe pelo menos um atributo');
  99  |             await expect(toastMessage).toBeVisible({ timeout: 5000 });
  100 |         }
  101 |     });
  102 | 
  103 |     test('Caso 3: Adição de Variação Manual com Atributos e Validação do Tamanho do Modal', async ({ page }) => {
  104 |         const newProductBtn = page.locator('button:has-text("Novo Produto")').first();
  105 |         await expect(newProductBtn).toBeVisible({ timeout: 15000 });
  106 |         await newProductBtn.click();
  107 | 
  108 |         // Preenche nome do pai
  109 |         const nameInput = page.locator('input[placeholder*="nome interno"], input[placeholder*="SOFA 3 LUG"]').first();
  110 |         await nameInput.fill(`${testRunId} Guarda-Roupa de Casal com Espelho`);
  111 |         await nameInput.blur();
  112 | 
  113 |         // Aba de Variações
  114 |         await page.locator('button:has-text("Variações")').first().click();
  115 | 
  116 |         // Clica na Variação 1 para editar
  117 |         const firstVarRow = page.locator('div[role="dialog"] table tbody tr').first();
  118 |         await firstVarRow.click();
  119 | 
  120 |         // Modal de Variação deve estar aberto
  121 |         const varModal = page.locator('div[role="dialog"][aria-labelledby="variation-form-modal-title"]').first();
  122 |         await expect(varModal).toBeVisible({ timeout: 5000 });
  123 | 
  124 |         // Validação estrita do tamanho do Modal de Variação (mesmo tamanho do modal pai: max-w-5xl h-[92vh] rounded-3xl)
  125 |         const modalClass = await varModal.getAttribute('class');
  126 |         expect(modalClass).toContain('max-w-5xl');
  127 |         expect(modalClass).toContain('h-[92vh]');
  128 |         expect(modalClass).toContain('rounded-3xl');
  129 | 
  130 |         // Fecha/Conclui o modal da Variação 1
  131 |         const cancelOrCloseBtn = page.locator('button:has-text("Cancelar"), button:has-text("Concluir")').first();
  132 |         await cancelOrCloseBtn.click();
  133 |     });
  134 | 
  135 |     test('Caso 4: Regra de Imutabilidade da Variação 1', async ({ page }) => {
  136 |         const newProductBtn = page.locator('button:has-text("Novo Produto")').first();
  137 |         await expect(newProductBtn).toBeVisible({ timeout: 15000 });
  138 |         await newProductBtn.click();
  139 | 
  140 |         await page.locator('button:has-text("Variações")').first().click();
  141 | 
  142 |         // Tenta remover a Variação 1 se houver botão de exclusão
  143 |         const deleteBtn = page.locator('div[role="dialog"] table tbody tr button[title*="Excluir"], div[role="dialog"] table tbody tr button i.bi-trash').first();
  144 |         if (await deleteBtn.isVisible()) {
  145 |             await deleteBtn.click();
  146 |             // Deve informar que a Variação 1 é obrigatória
  147 |             const warningToast = page.locator('text=A Variação 1 é obrigatória e não pode ser removida');
  148 |             await expect(warningToast).toBeVisible({ timeout: 5000 });
  149 |         }
  150 |     });
  151 | 
  152 |     test('Caso 5: Cadastro Rápido de Variação em Pai Existente sem Variação Duplicada', async ({ page }) => {
  153 |         // Testa a rota de notas fiscais de entrada / conferência onde o operador faz cadastro rápido
  154 |         await page.goto(`/stock/receipts?${AUTH_QUERY}`);
  155 |         await page.waitForLoadState('domcontentloaded');
  156 | 
  157 |         // Garante que a tela carregou sem erros de runtime
  158 |         expect(await page.locator('body').isVisible()).toBe(true);
  159 |     });
  160 | 
  161 |     test('Caso 6: Formatação rigorosa de Title Case em atributos e valores de variações', async ({ page }) => {
  162 |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  163 |         await page.waitForLoadState('domcontentloaded');
  164 | 
  165 |         const newProductBtn = page.locator('button:has-text("Novo Produto")').first();
  166 |         await expect(newProductBtn).toBeVisible({ timeout: 15000 });
  167 |         await newProductBtn.click();
  168 | 
  169 |         const nameInput = page.locator('input[placeholder*="nome interno"], input[placeholder*="SOFA 3 LUG"]').first();
  170 |         await nameInput.fill('MESA DE JANTAR PARA 6 LUGARES COM TAMPO DE VIDRO');
  171 |         await nameInput.blur();
  172 | 
  173 |         const formatted = await nameInput.inputValue();
  174 |         expect(formatted).toBe('Mesa de Jantar para 6 Lugares com Tampo de Vidro');
  175 |     });
  176 | 
  177 |     test('Caso 7: Fusão de variação com variação de outro produto pai', async ({ page }) => {
```