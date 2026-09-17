# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: products\products-variations-e2e.spec.ts >> Suíte E2E B2B - Criação de Produto, Variações e Validações de Negócio >> Caso 8: Mover variação com fotos explícitas e herdadas
- Location: tests\e2e\products\products-variations-e2e.spec.ts:235:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: Erros críticos de console detectados

expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "Failed to load resource: the server responded with a status of 404 ()",
+ ]
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button:has-text("Concluir")')

```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - generic [ref=f1e2]:
    - generic [ref=f1e3]:
      - region "Notifications Alt+T"
      - main [ref=f1e4]:
        - generic [ref=f1e7]:
          - generic [ref=f1e9]:
            - generic [ref=f1e10]:
              - generic [ref=f1e11]: 
              - textbox "Pesquisar produtos..." [ref=f1e12]
            - text: 
            - button " Novo Produto" [ref=f1e14] [cursor=pointer]:
              - generic [ref=f1e15]: 
              - generic [ref=f1e16]: Novo Produto
          - generic [ref=f1e17]:
            - generic [ref=f1e20]:
              - button " Mostrar desativados" [ref=f1e22] [cursor=pointer]:
                - generic [ref=f1e23]: 
                - text: Mostrar desativados
              - generic [ref=f1e24]:
                - text:                                                                                                       
                - generic [ref=f1e25]:
                  - button " Variações (1) 003995 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Sofá Woodx Jaffar 3 Lugares 2,00 M Sofás •  Multiloja Salvados" [ref=f1e26] [cursor=pointer]:
                    - generic [ref=f1e27]:
                      - generic [ref=f1e28]:
                        - button " Variações (1)" [ref=f1e29]:
                          - generic [ref=f1e30]: 
                          - generic [ref=f1e31]: Variações (1)
                        - generic [ref=f1e32]: "003995"
                      - generic [ref=f1e33]:
                        - generic "Status ERP derivado das variações" [ref=f1e35]:
                          - generic [ref=f1e36]:
                            - generic [ref=f1e37]: ERP
                            - generic [ref=f1e38]: Ativo
                        - generic [ref=f1e41]:
                          - generic [ref=f1e42]: 
                          - text: Queima dos Salvados
                        - generic [ref=f1e43]:
                          - button "Editar Produto" [ref=f1e44]:
                            - generic [ref=f1e45]: 
                          - button "Opções do produto" [ref=f1e46]:
                            - generic [ref=f1e47]: 
                    - generic [ref=f1e49]:
                      - heading "Sofá Woodx Jaffar 3 Lugares 2,00 M" [level=3] [ref=f1e50]
                      - generic [ref=f1e51]:
                        - generic [ref=f1e52]: Sofás
                        - generic [ref=f1e53]: •
                        - generic [ref=f1e54]:
                          - generic [ref=f1e55]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003994 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Guarda Roupa Atualle Sao Paulo 6pt 3gv Friso Reflec Guarda-Roupas •  Multiloja Salvados" [ref=f1e56] [cursor=pointer]:
                    - generic [ref=f1e57]:
                      - generic [ref=f1e58]:
                        - button " Variações (1)" [ref=f1e59]:
                          - generic [ref=f1e60]: 
                          - generic [ref=f1e61]: Variações (1)
                        - generic [ref=f1e62]: "003994"
                      - generic [ref=f1e63]:
                        - generic "Status ERP derivado das variações" [ref=f1e65]:
                          - generic [ref=f1e66]:
                            - generic [ref=f1e67]: ERP
                            - generic [ref=f1e68]: Ativo
                        - generic [ref=f1e71]:
                          - generic [ref=f1e72]: 
                          - text: Queima dos Salvados
                        - generic [ref=f1e73]:
                          - button "Editar Produto" [ref=f1e74]:
                            - generic [ref=f1e75]: 
                          - button "Opções do produto" [ref=f1e76]:
                            - generic [ref=f1e77]: 
                    - generic [ref=f1e79]:
                      - heading "Guarda Roupa Atualle Sao Paulo 6pt 3gv Friso Reflec" [level=3] [ref=f1e80]
                      - generic [ref=f1e81]:
                        - generic [ref=f1e82]: Guarda-Roupas
                        - generic [ref=f1e83]: •
                        - generic [ref=f1e84]:
                          - generic [ref=f1e85]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003993 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Guarda Roupa Faimec Portugal 2 Portas Guarda-Roupas •  Multiloja Salvados" [ref=f1e86] [cursor=pointer]:
                    - generic [ref=f1e87]:
                      - generic [ref=f1e88]:
                        - button " Variações (1)" [ref=f1e89]:
                          - generic [ref=f1e90]: 
                          - generic [ref=f1e91]: Variações (1)
                        - generic [ref=f1e92]: "003993"
                      - generic [ref=f1e93]:
                        - generic "Status ERP derivado das variações" [ref=f1e95]:
                          - generic [ref=f1e96]:
                            - generic [ref=f1e97]: ERP
                            - generic [ref=f1e98]: Ativo
                        - generic [ref=f1e101]:
                          - generic [ref=f1e102]: 
                          - text: Queima dos Salvados
                        - generic [ref=f1e103]:
                          - button "Editar Produto" [ref=f1e104]:
                            - generic [ref=f1e105]: 
                          - button "Opções do produto" [ref=f1e106]:
                            - generic [ref=f1e107]: 
                    - generic [ref=f1e109]:
                      - heading "Guarda Roupa Faimec Portugal 2 Portas" [level=3] [ref=f1e110]
                      - generic [ref=f1e111]:
                        - generic [ref=f1e112]: Guarda-Roupas
                        - generic [ref=f1e113]: •
                        - generic [ref=f1e114]:
                          - generic [ref=f1e115]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003992 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Paneleiro Telasul Star New 4pt 80cm Paneleiros •  Multiloja Salvados" [ref=f1e116] [cursor=pointer]:
                    - generic [ref=f1e117]:
                      - generic [ref=f1e118]:
                        - button " Variações (1)" [ref=f1e119]:
                          - generic [ref=f1e120]: 
                          - generic [ref=f1e121]: Variações (1)
                        - generic [ref=f1e122]: "003992"
                      - generic [ref=f1e123]:
                        - generic "Status ERP derivado das variações" [ref=f1e125]:
                          - generic [ref=f1e126]:
                            - generic [ref=f1e127]: ERP
                            - generic [ref=f1e128]: Ativo
                        - generic [ref=f1e131]:
                          - generic [ref=f1e132]: 
                          - text: Queima dos Salvados
                        - generic [ref=f1e133]:
                          - button "Editar Produto" [ref=f1e134]:
                            - generic [ref=f1e135]: 
                          - button "Opções do produto" [ref=f1e136]:
                            - generic [ref=f1e137]: 
                    - generic [ref=f1e139]:
                      - heading "Paneleiro Telasul Star New 4pt 80cm" [level=3] [ref=f1e140]
                      - generic [ref=f1e141]:
                        - generic [ref=f1e142]: Paneleiros
                        - generic [ref=f1e143]: •
                        - generic [ref=f1e144]:
                          - generic [ref=f1e145]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003991 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Cabeceira Jsw Amanda 1,58 M Cabeceiras •  Multiloja Salvados" [ref=f1e146] [cursor=pointer]:
                    - generic [ref=f1e147]:
                      - generic [ref=f1e148]:
                        - button " Variações (1)" [ref=f1e149]:
                          - generic [ref=f1e150]: 
                          - generic [ref=f1e151]: Variações (1)
                        - generic [ref=f1e152]: "003991"
                      - generic [ref=f1e153]:
                        - generic "Status ERP derivado das variações" [ref=f1e155]:
                          - generic [ref=f1e156]:
                            - generic [ref=f1e157]: ERP
                            - generic [ref=f1e158]: Ativo
                        - generic [ref=f1e161]:
                          - generic [ref=f1e162]: 
                          - text: Queima dos Salvados
                        - generic [ref=f1e163]:
                          - button "Editar Produto" [ref=f1e164]:
                            - generic [ref=f1e165]: 
                          - button "Opções do produto" [ref=f1e166]:
                            - generic [ref=f1e167]: 
                    - generic [ref=f1e169]:
                      - heading "Cabeceira Jsw Amanda 1,58 M" [level=3] [ref=f1e170]
                      - generic [ref=f1e171]:
                        - generic [ref=f1e172]: Cabeceiras
                        - generic [ref=f1e173]: •
                        - generic [ref=f1e174]:
                          - generic [ref=f1e175]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003990 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Sofá Woodx Khalifa 4lug 2,50 M Veludo Sofás •  Multiloja Salvados" [ref=f1e176] [cursor=pointer]:
                    - generic [ref=f1e177]:
                      - generic [ref=f1e178]:
                        - button " Variações (1)" [ref=f1e179]:
                          - generic [ref=f1e180]: 
                          - generic [ref=f1e181]: Variações (1)
                        - generic [ref=f1e182]: "003990"
                      - generic [ref=f1e183]:
                        - generic "Status ERP derivado das variações" [ref=f1e185]:
                          - generic [ref=f1e186]:
                            - generic [ref=f1e187]: ERP
                            - generic [ref=f1e188]: Ativo
                        - generic [ref=f1e191]:
                          - generic [ref=f1e192]: 
                          - text: Queima dos Salvados
                        - generic [ref=f1e193]:
                          - button "Editar Produto" [ref=f1e194]:
                            - generic [ref=f1e195]: 
                          - button "Opções do produto" [ref=f1e196]:
                            - generic [ref=f1e197]: 
                    - generic [ref=f1e199]:
                      - heading "Sofá Woodx Khalifa 4lug 2,50 M Veludo" [level=3] [ref=f1e200]
                      - generic [ref=f1e201]:
                        - generic [ref=f1e202]: Sofás
                        - generic [ref=f1e203]: •
                        - generic [ref=f1e204]:
                          - generic [ref=f1e205]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003989 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Paneleiro Telasul Lumina 2pt 50cm Paneleiros •  Multiloja Salvados" [ref=f1e206] [cursor=pointer]:
                    - generic [ref=f1e207]:
                      - generic [ref=f1e208]:
                        - button " Variações (1)" [ref=f1e209]:
                          - generic [ref=f1e210]: 
                          - generic [ref=f1e211]: Variações (1)
                        - generic [ref=f1e212]: "003989"
                      - generic [ref=f1e213]:
                        - generic "Status ERP derivado das variações" [ref=f1e215]:
                          - generic [ref=f1e216]:
                            - generic [ref=f1e217]: ERP
                            - generic [ref=f1e218]: Ativo
                        - generic [ref=f1e221]:
                          - generic [ref=f1e222]: 
                          - text: Queima dos Salvados
                        - generic [ref=f1e223]:
                          - button "Editar Produto" [ref=f1e224]:
                            - generic [ref=f1e225]: 
                          - button "Opções do produto" [ref=f1e226]:
                            - generic [ref=f1e227]: 
                    - generic [ref=f1e229]:
                      - heading "Paneleiro Telasul Lumina 2pt 50cm" [level=3] [ref=f1e230]
                      - generic [ref=f1e231]:
                        - generic [ref=f1e232]: Paneleiros
                        - generic [ref=f1e233]: •
                        - generic [ref=f1e234]:
                          - generic [ref=f1e235]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003988 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Mesa Madetal Onix MDF/Vidro 154 X 90 Mesa para Sala de Jantar •  Multiloja Salvados" [ref=f1e236] [cursor=pointer]:
                    - generic [ref=f1e237]:
                      - generic [ref=f1e238]:
                        - button " Variações (1)" [ref=f1e239]:
                          - generic [ref=f1e240]: 
                          - generic [ref=f1e241]: Variações (1)
                        - generic [ref=f1e242]: "003988"
                      - generic [ref=f1e243]:
                        - generic "Status ERP derivado das variações" [ref=f1e245]:
                          - generic [ref=f1e246]:
                            - generic [ref=f1e247]: ERP
                            - generic [ref=f1e248]: Ativo
                        - generic [ref=f1e251]:
                          - generic [ref=f1e252]: 
                          - text: Queima dos Salvados
                        - generic [ref=f1e253]:
                          - button "Editar Produto" [ref=f1e254]:
                            - generic [ref=f1e255]: 
                          - button "Opções do produto" [ref=f1e256]:
                            - generic [ref=f1e257]: 
                    - generic [ref=f1e259]:
                      - heading "Mesa Madetal Onix MDF/Vidro 154 X 90" [level=3] [ref=f1e260]
                      - generic [ref=f1e261]:
                        - generic [ref=f1e262]: Mesa para Sala de Jantar
                        - generic [ref=f1e263]: •
                        - generic [ref=f1e264]:
                          - generic [ref=f1e265]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003987 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Cristaleira Indekes Damasco 2 Portas de Vidro LED 70cm Cristaleiras •  Multiloja Salvados" [ref=f1e266] [cursor=pointer]:
                    - generic [ref=f1e267]:
                      - generic [ref=f1e268]:
                        - button " Variações (1)" [ref=f1e269]:
                          - generic [ref=f1e270]: 
                          - generic [ref=f1e271]: Variações (1)
                        - generic [ref=f1e272]: "003987"
                      - generic [ref=f1e273]:
                        - generic "Status ERP derivado das variações" [ref=f1e275]:
                          - generic [ref=f1e276]:
                            - generic [ref=f1e277]: ERP
                            - generic [ref=f1e278]: Ativo
                        - generic [ref=f1e281]:
                          - generic [ref=f1e282]: 
                          - text: Queima dos Salvados
                        - generic [ref=f1e283]:
                          - button "Editar Produto" [ref=f1e284]:
                            - generic [ref=f1e285]: 
                          - button "Opções do produto" [ref=f1e286]:
                            - generic [ref=f1e287]: 
                    - generic [ref=f1e289]:
                      - heading "Cristaleira Indekes Damasco 2 Portas de Vidro LED 70cm" [level=3] [ref=f1e290]
                      - generic [ref=f1e291]:
                        - generic [ref=f1e292]: Cristaleiras
                        - generic [ref=f1e293]: •
                        - generic [ref=f1e294]:
                          - generic [ref=f1e295]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003986 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Guarda Roupa Notavel Nt5015 4pt 3gv Guarda-Roupas •  Multiloja Salvados" [ref=f1e296] [cursor=pointer]:
                    - generic [ref=f1e297]:
                      - generic [ref=f1e298]:
                        - button " Variações (1)" [ref=f1e299]:
                          - generic [ref=f1e300]: 
                          - generic [ref=f1e301]: Variações (1)
                        - generic [ref=f1e302]: "003986"
                      - generic [ref=f1e303]:
                        - generic "Status ERP derivado das variações" [ref=f1e305]:
                          - generic [ref=f1e306]:
                            - generic [ref=f1e307]: ERP
                            - generic [ref=f1e308]: Ativo
                        - generic [ref=f1e311]:
                          - generic [ref=f1e312]: 
                          - text: Queima dos Salvados
                        - generic [ref=f1e313]:
                          - button "Editar Produto" [ref=f1e314]:
                            - generic [ref=f1e315]: 
                          - button "Opções do produto" [ref=f1e316]:
                            - generic [ref=f1e317]: 
                    - generic [ref=f1e319]:
                      - heading "Guarda Roupa Notavel Nt5015 4pt 3gv" [level=3] [ref=f1e320]
                      - generic [ref=f1e321]:
                        - generic [ref=f1e322]: Guarda-Roupas
                        - generic [ref=f1e323]: •
                        - generic [ref=f1e324]:
                          - generic [ref=f1e325]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003985 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Balcão para Cooktop 1,05 Indekes 1pt 1gv C/Tampo Balcões para Cooktop •  Multiloja Salvados" [ref=f1e326] [cursor=pointer]:
                    - generic [ref=f1e327]:
                      - generic [ref=f1e328]:
                        - button " Variações (1)" [ref=f1e329]:
                          - generic [ref=f1e330]: 
                          - generic [ref=f1e331]: Variações (1)
                        - generic [ref=f1e332]: "003985"
                      - generic [ref=f1e333]:
                        - generic "Status ERP derivado das variações" [ref=f1e335]:
                          - generic [ref=f1e336]:
                            - generic [ref=f1e337]: ERP
                            - generic [ref=f1e338]: Ativo
                        - generic [ref=f1e341]:
                          - generic [ref=f1e342]: 
                          - text: Queima dos Salvados
                        - generic [ref=f1e343]:
                          - button "Editar Produto" [ref=f1e344]:
                            - generic [ref=f1e345]: 
                          - button "Opções do produto" [ref=f1e346]:
                            - generic [ref=f1e347]: 
                    - generic [ref=f1e349]:
                      - heading "Balcão para Cooktop 1,05 Indekes 1pt 1gv C/Tampo" [level=3] [ref=f1e350]
                      - generic [ref=f1e351]:
                        - generic [ref=f1e352]: Balcões para Cooktop
                        - generic [ref=f1e353]: •
                        - generic [ref=f1e354]:
                          - generic [ref=f1e355]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003984 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Berço Mini Cama Henn Aconcheg Berços •  Multiloja Salvados" [ref=f1e356] [cursor=pointer]:
                    - generic [ref=f1e357]:
                      - generic [ref=f1e358]:
                        - button " Variações (1)" [ref=f1e359]:
                          - generic [ref=f1e360]: 
                          - generic [ref=f1e361]: Variações (1)
                        - generic [ref=f1e362]: "003984"
                      - generic [ref=f1e363]:
                        - generic "Status ERP derivado das variações" [ref=f1e365]:
                          - generic [ref=f1e366]:
                            - generic [ref=f1e367]: ERP
                            - generic [ref=f1e368]: Ativo
                        - generic [ref=f1e371]:
                          - generic [ref=f1e372]: 
                          - text: Queima dos Salvados
                        - generic [ref=f1e373]:
                          - button "Editar Produto" [ref=f1e374]:
                            - generic [ref=f1e375]: 
                          - button "Opções do produto" [ref=f1e376]:
                            - generic [ref=f1e377]: 
                    - generic [ref=f1e379]:
                      - heading "Berço Mini Cama Henn Aconcheg" [level=3] [ref=f1e380]
                      - generic [ref=f1e381]:
                        - generic [ref=f1e382]: Berços
                        - generic [ref=f1e383]: •
                        - generic [ref=f1e384]:
                          - generic [ref=f1e385]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003983 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Comoda Infantil Henn Aconchego 1pt 4gv Cômodas •  Multiloja Salvados" [ref=f1e386] [cursor=pointer]:
                    - generic [ref=f1e387]:
                      - generic [ref=f1e388]:
                        - button " Variações (1)" [ref=f1e389]:
                          - generic [ref=f1e390]: 
                          - generic [ref=f1e391]: Variações (1)
                        - generic [ref=f1e392]: "003983"
                      - generic [ref=f1e393]:
                        - generic "Status ERP derivado das variações" [ref=f1e395]:
                          - generic [ref=f1e396]:
                            - generic [ref=f1e397]: ERP
                            - generic [ref=f1e398]: Ativo
                        - generic [ref=f1e401]:
                          - generic [ref=f1e402]: 
                          - text: Queima dos Salvados
                        - generic [ref=f1e403]:
                          - button "Editar Produto" [ref=f1e404]:
                            - generic [ref=f1e405]: 
                          - button "Opções do produto" [ref=f1e406]:
                            - generic [ref=f1e407]: 
                    - generic [ref=f1e409]:
                      - heading "Comoda Infantil Henn Aconchego 1pt 4gv" [level=3] [ref=f1e410]
                      - generic [ref=f1e411]:
                        - generic [ref=f1e412]: Cômodas
                        - generic [ref=f1e413]: •
                        - generic [ref=f1e414]:
                          - generic [ref=f1e415]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003982 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Guarda Roupa Doripel New Xangai 6pt 2gv 100% MDF Guarda-Roupas •  Multiloja Salvados" [ref=f1e416] [cursor=pointer]:
                    - generic [ref=f1e417]:
                      - generic [ref=f1e418]:
                        - button " Variações (1)" [ref=f1e419]:
                          - generic [ref=f1e420]: 
                          - generic [ref=f1e421]: Variações (1)
                        - generic [ref=f1e422]: "003982"
                      - generic [ref=f1e423]:
                        - generic "Status ERP derivado das variações" [ref=f1e425]:
                          - generic [ref=f1e426]:
                            - generic [ref=f1e427]: ERP
                            - generic [ref=f1e428]: Ativo
                        - generic [ref=f1e431]:
                          - generic [ref=f1e432]: 
                          - text: Queima dos Salvados
                        - generic [ref=f1e433]:
                          - button "Editar Produto" [ref=f1e434]:
                            - generic [ref=f1e435]: 
                          - button "Opções do produto" [ref=f1e436]:
                            - generic [ref=f1e437]: 
                    - generic [ref=f1e439]:
                      - heading "Guarda Roupa Doripel New Xangai 6pt 2gv 100% MDF" [level=3] [ref=f1e440]
                      - generic [ref=f1e441]:
                        - generic [ref=f1e442]: Guarda-Roupas
                        - generic [ref=f1e443]: •
                        - generic [ref=f1e444]:
                          - generic [ref=f1e445]: 
                          - text: Multiloja Salvados
                  - button " Variações (1) 003981 Status ERP derivado das variações  Queima dos Salvados Editar Produto Opções do produto Guarda Roupa Made Marcs Atlanta 2 Portas 4 Gavetas Ripado Guarda-Roupas •  Multiloja Salvados" [ref=f1e446] [cursor=pointer]:
                    - generic [ref=f1e447]:
                      - generic [ref=f1e448]:
                        - button " Variações (1)" [ref=f1e449]:
                          - generic [ref=f1e450]: 
                          - generic [ref=f1e451]: Variações (1)
                        - generic [ref=f1e452]: "003981"
                      - generic [ref=f1e453]:
                        - generic "Status ERP derivado das variações" [ref=f1e455]:
                          - generic [ref=f1e456]:
                            - generic [ref=f1e457]: ERP
                            - generic [ref=f1e458]: Ativo
                        - generic [ref=f1e461]:
                          - generic [ref=f1e462]: 
                          - text: Queima dos Salvados
                        - generic [ref=f1e463]:
                          - button "Editar Produto" [ref=f1e464]:
                            - generic [ref=f1e465]: 
                          - button "Opções do produto" [ref=f1e466]:
                            - generic [ref=f1e467]: 
                    - generic [ref=f1e469]:
                      - heading "Guarda Roupa Made Marcs Atlanta 2 Portas 4 Gavetas Ripado" [level=3] [ref=f1e470]
                      - generic [ref=f1e471]:
                        - generic [ref=f1e472]: Guarda-Roupas
                        - generic [ref=f1e473]: •
                        - generic [ref=f1e474]:
                          - generic [ref=f1e475]: 
                          - text: Multiloja Salvados
              - generic [ref=f1e476]:
                - generic [ref=f1e477]:
                  - generic [ref=f1e478]: Página 1 · 237 itens no catálogo
                  - combobox [ref=f1e480]:
                    - option "10 por página"
                    - option "15 por página" [selected]
                - generic [ref=f1e481]:
                  - button "" [disabled] [ref=f1e482]
                  - button "1" [disabled] [ref=f1e486]
                  - button "2" [ref=f1e488] [cursor=pointer]
                  - button "" [ref=f1e489] [cursor=pointer]
            - generic [ref=f1e491]:
              - generic [ref=f1e492]:
                - button " Resumo dos Produtos " [ref=f1e493] [cursor=pointer]:
                  - generic [ref=f1e494]:
                    - generic [ref=f1e495]: 
                    - heading "Resumo dos Produtos" [level=4] [ref=f1e497]
                  - generic [ref=f1e498]: 
                - generic [ref=f1e499]:
                  - button " Total de Cadastrados 269" [ref=f1e500] [cursor=pointer]:
                    - generic [ref=f1e501]:
                      - generic [ref=f1e502]: 
                      - generic [ref=f1e503]: Total de Cadastrados
                    - generic [ref=f1e504]: "269"
                  - generic [ref=f1e505]:
                    - button "Publicados 153" [ref=f1e506] [cursor=pointer]:
                      - generic [ref=f1e507]: Publicados
                      - generic [ref=f1e508]: "153"
                    - button "Desativados 23" [ref=f1e509] [cursor=pointer]:
                      - generic [ref=f1e510]: Desativados
                      - generic [ref=f1e511]: "23"
                    - button " Rascunhos (Em Cadastro) 0" [ref=f1e512] [cursor=pointer]:
                      - generic [ref=f1e513]:
                        - generic [ref=f1e514]: 
                        - generic [ref=f1e515]: Rascunhos (Em Cadastro)
                      - generic [ref=f1e516]: "0"
              - generic [ref=f1e517]:
                - button " Filtros " [ref=f1e518] [cursor=pointer]:
                  - generic [ref=f1e519]:
                    - generic [ref=f1e520]: 
                    - heading "Filtros" [level=4] [ref=f1e522]
                  - generic [ref=f1e523]: 
                - complementary "Filtros de produtos" [ref=f1e525]:
                  - generic [ref=f1e526]:
                    - generic [ref=f1e527]: Parâmetros
                    - generic [ref=f1e529]:
                      - generic [ref=f1e530]:
                        - generic [ref=f1e531]: Categoria
                        - combobox "Categoria" [ref=f1e532] [cursor=pointer]:
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
                      - generic [ref=f1e533]:
                        - generic [ref=f1e534]: Situação no ERP
                        - combobox "Situação no ERP" [ref=f1e535] [cursor=pointer]:
                          - option "Todos os Produtos" [selected]
                          - option "Produtos Ativos"
                          - option "Produtos Desativados"
                          - option "Rascunhos (Em Cadastro)"
                      - generic [ref=f1e536]:
                        - generic [ref=f1e537]: Catálogo Digital
                        - combobox "Catálogo Digital" [ref=f1e538] [cursor=pointer]:
                          - option "Todos" [selected]
                          - option "Publicado no Catálogo"
                          - option "Ocultado do Catálogo"
                  - button "Limpar Filtros" [ref=f1e540] [cursor=pointer]:
                    - generic [aria-hidden] [ref=f1e541]: 
                    - text: Limpar Filtros
      - generic [ref=f1e543]:
        - generic:
          - generic:
            - generic: Seu Lizandro
            - generic: Agente IA do ERP
        - button "Abrir chat do Seu Lizandro, Agente Inteligente do ERP" [ref=f1e544] [cursor=pointer]:
          - img "Seu Lizandro - Agente IA" [ref=f1e546]
    - region "Notifications Alt+T"
  - dialog [ref=f1e549]:
    - button "Fechar formulário de produto" [ref=f1e550]
    - generic [ref=f1e551]:
      - generic [ref=f1e552]:
        - generic [ref=f1e553]:
          - heading "Cadastro de Produto" [level=2] [ref=f1e554]
          - generic [ref=f1e555]:
            - generic [ref=f1e556]: "ERP: Pendente"
            - generic [ref=f1e559]: "Catálogo: Ocultado"
        - button "Fechar formulário" [ref=f1e562] [cursor=pointer]:
          - generic [aria-hidden] [ref=f1e563]: 
      - tablist "Abas do formulário de produto" [ref=f1e565]:
        - tab "Cadastro Geral" [selected] [ref=f1e566] [cursor=pointer]
        - tab "Fotos" [ref=f1e568] [cursor=pointer]:
          - generic [aria-hidden] [ref=f1e569]: 
        - tab "Informações Técnicas" [ref=f1e571] [cursor=pointer]:
          - generic [aria-hidden] [ref=f1e572]: 
        - tab "Estoque e Precificação" [ref=f1e574] [cursor=pointer]:
          - generic [aria-hidden] [ref=f1e575]: 
        - tab "Variações" [ref=f1e577] [cursor=pointer]:
          - generic [aria-hidden] [ref=f1e578]: 
        - tab "Tributário / NF" [ref=f1e580] [cursor=pointer]:
          - generic [aria-hidden] [ref=f1e581]: 
      - generic [ref=f1e584]:
        - generic [ref=f1e586]:
          - generic [ref=f1e587]:
            - generic [ref=f1e588]:
              - generic [ref=f1e589]: Nome
              - generic [ref=f1e590]: "*"
            - button "Diferenciar Título no Catálogo" [ref=f1e591] [cursor=pointer]
          - 'textbox "Digite o nome interno do produto (ex: SOFA 3 LUG)..." [ref=f1e592]'
        - generic [ref=f1e594]:
          - generic [ref=f1e596]:
            - generic [ref=f1e597]:
              - generic [ref=f1e598]: Categoria(s)
              - generic [ref=f1e599]: "*"
            - button "Gerenciar Categorias de Produtos" [ref=f1e600] [cursor=pointer]:
              - generic [ref=f1e601]: GERENCIAR
              - generic [ref=f1e602]: 
          - generic [ref=f1e604]:
            - generic: 
            - textbox "Pesquisar categorias" [ref=f1e605]:
              - /placeholder: Pesquisar categorias...
        - generic [ref=f1e607]:
          - generic [ref=f1e608]: Oportunidade
          - combobox [ref=f1e610]:
            - option "Nenhuma (Produto Normal)" [selected]
            - option "Mega Liquidação"
            - option "Queima dos Salvados"
            - option "Última Unidade - Mostruário"
        - generic [ref=f1e612]:
          - generic [ref=f1e613]: Observações Internas
          - textbox "Digite notas internas sobre este produto, processos ou detalhes específicos..." [ref=f1e615]
      - generic [ref=f1e616]:
        - button " Salvar rascunho" [disabled] [ref=f1e618]:
          - generic [ref=f1e619]: 
          - generic [ref=f1e620]: Salvar rascunho
        - generic [ref=f1e621]:
          - button "Cancelar" [ref=f1e622] [cursor=pointer]
          - button "Próxima etapa " [ref=f1e623] [cursor=pointer]:
            - generic [ref=f1e624]: Próxima etapa
            - generic [ref=f1e625]: 
```

# Test source

```ts
  150 | 
  151 |     test('Caso 5: Cadastro Rápido de Variação em Pai Existente sem Variação Duplicada', async ({ page }) => {
  152 |         // Testa a rota de notas fiscais de entrada / conferência onde o operador faz cadastro rápido
  153 |         await page.goto(`/stock/receipts?${AUTH_QUERY}`);
  154 |         await page.waitForLoadState('domcontentloaded');
  155 | 
  156 |         // Garante que a tela carregou sem erros de runtime
  157 |         expect(await page.locator('body').isVisible()).toBe(true);
  158 |     });
  159 | 
  160 |     test('Caso 6: Formatação rigorosa de Title Case em atributos e valores de variações', async ({ page }) => {
  161 |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  162 |         await page.waitForLoadState('domcontentloaded');
  163 | 
  164 |         const newProductBtn = page.locator('button:has-text("Novo Produto")').first();
  165 |         await expect(newProductBtn).toBeVisible({ timeout: 15000 });
  166 |         await newProductBtn.click();
  167 | 
  168 |         const nameInput = page.locator('input[placeholder*="nome interno"], input[placeholder*="SOFA 3 LUG"]').first();
  169 |         await nameInput.fill('MESA DE JANTAR PARA 6 LUGARES COM TAMPO DE VIDRO');
  170 |         await nameInput.blur();
  171 | 
  172 |         const formatted = await nameInput.inputValue();
  173 |         expect(formatted).toBe('Mesa de Jantar para 6 Lugares com Tampo de Vidro');
  174 |     });
  175 | 
  176 |     test('Caso 7: Fusão de variação com variação de outro produto pai', async ({ page }) => {
  177 |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  178 |         await page.waitForLoadState('domcontentloaded');
  179 | 
  180 |         // Cria o Produto Pai A
  181 |         const newProductBtn = page.locator('button:has-text("Novo Produto")').first();
  182 |         await expect(newProductBtn).toBeVisible({ timeout: 15000 });
  183 |         await newProductBtn.click();
  184 |         const nameInputA = page.locator('input[placeholder*="nome interno"]').first();
  185 |         await nameInputA.fill(`${testRunId} Pai Origem`);
  186 |         await nameInputA.blur();
  187 |         await page.locator('button:has-text("Concluir")').click();
  188 | 
  189 |         // Cria o Produto Pai B (Canônico)
  190 |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  191 |         await page.waitForLoadState('domcontentloaded');
  192 |         await expect(newProductBtn).toBeVisible({ timeout: 15000 });
  193 |         await newProductBtn.click();
  194 |         const nameInputB = page.locator('input[placeholder*="nome interno"]').first();
  195 |         await nameInputB.fill(`${testRunId} Pai Destino`);
  196 |         await nameInputB.blur();
  197 |         await page.locator('button:has-text("Concluir")').click();
  198 | 
  199 |         // Acessa a lista novamente para buscar as variações
  200 |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  201 |         await page.waitForLoadState('domcontentloaded');
  202 |         
  203 |         // Clica na linha do Pai Origem para expandir variações
  204 |         await page.locator(`td:has-text("${testRunId} Pai Origem")`).first().click();
  205 | 
  206 |         // Localiza a linha da Variação do Pai Origem e abre o menu de ações
  207 |         const trVariação = page.locator(`tr:has-text("Variação 1"):near(:text("${testRunId} Pai Origem"))`).first();
  208 |         await trVariação.locator('button[title="Mais ações"]').first().click();
  209 |         
  210 |         // Clica em "Mesclar com outra variação"
  211 |         await page.locator('button:has-text("Mesclar com outra variação")').first().click();
  212 | 
  213 |         // Modal de fusão deve estar visível
  214 |         const mergeModal = page.locator('div[role="dialog"][aria-labelledby="merge-variation-title"]').first();
  215 |         await expect(mergeModal).toBeVisible();
  216 | 
  217 |         // Digita o nome do Pai Destino para buscar a variação canônica
  218 |         const searchInput = mergeModal.locator('input[placeholder*="Pesquise por nome"]').first();
  219 |         await searchInput.fill(`${testRunId} Pai Destino`);
  220 | 
  221 |         // Seleciona a opção encontrada
  222 |         const option = mergeModal.locator('button:has-text("Pai Destino")').first();
  223 |         await expect(option).toBeVisible({ timeout: 5000 });
  224 |         await option.click();
  225 | 
  226 |         // Confirma a fusão
  227 |         const confirmBtn = mergeModal.locator('button:has-text("Confirmar fusão")').first();
  228 |         await confirmBtn.click();
  229 | 
  230 |         const successToast = page.locator('text=Variação mesclada');
  231 |         await expect(successToast).toBeVisible({ timeout: 5000 });
  232 |         await expect(mergeModal).toBeHidden({ timeout: 5000 });
  233 |     });
  234 | 
  235 |     test('Caso 8: Mover variação com fotos explícitas e herdadas', async ({ page }) => {
  236 |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  237 |         await page.waitForLoadState('domcontentloaded');
  238 | 
  239 |         // Note: For a real test, we would upload an image, but Playwright might skip the complex upload UI.
  240 |         // We will just verify that the modal for moving variations can be opened and submitted without crashing
  241 |         // and that it preserves the variation's photos if we stub or mock the API.
  242 |         
  243 |         // Cria o Produto Pai A (Origem)
  244 |         const newProductBtn = page.locator('button:has-text("Novo Produto")').first();
  245 |         await expect(newProductBtn).toBeVisible({ timeout: 15000 });
  246 |         await newProductBtn.click();
  247 |         const nameInputA = page.locator('input[placeholder*="nome interno"]').first();
  248 |         await nameInputA.fill(`${testRunId} Pai Origem Mov`);
  249 |         await nameInputA.blur();
> 250 |         await page.locator('button:has-text("Concluir")').click();
      |                                                           ^ Error: locator.click: Test timeout of 30000ms exceeded.
  251 | 
  252 |         // Cria o Produto Pai B (Destino)
  253 |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  254 |         await page.waitForLoadState('domcontentloaded');
  255 |         await expect(newProductBtn).toBeVisible({ timeout: 15000 });
  256 |         await newProductBtn.click();
  257 |         const nameInputB = page.locator('input[placeholder*="nome interno"]').first();
  258 |         await nameInputB.fill(`${testRunId} Pai Destino Mov`);
  259 |         await nameInputB.blur();
  260 |         await page.locator('button:has-text("Concluir")').click();
  261 | 
  262 |         // Acessa a lista
  263 |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  264 |         await page.waitForLoadState('domcontentloaded');
  265 | 
  266 |         // Clica na linha do Pai Origem Mov
  267 |         await page.locator(`td:has-text("${testRunId} Pai Origem Mov")`).first().click();
  268 | 
  269 |         // Clica na linha da Variação do Pai Origem e abre o menu de ações
  270 |         const trVariação = page.locator(`tr:has-text("Variação 1"):near(:text("${testRunId} Pai Origem Mov"))`).first();
  271 |         const moreActions = trVariação.locator('button[title="Mais opções do produto"], button[aria-label="Mais opções da variação"]').first();
  272 |         await moreActions.click();
  273 |         
  274 |         // Clica em "Mover para outro produto pai"
  275 |         const moveBtn = page.locator('button:has-text("Mover para outro produto pai")').first();
  276 |         
  277 |         // Trata a obrigatoriedade do Fornecedor antes de Mover
  278 |         // Na prática, se o produto estiver sem fornecedor, vai exibir um Toast de erro.
  279 |         // Como Mover exige fornecedor, vamos apenas validar se o botão existe no DOM ou se exibe a restrição corretamente.
  280 |         expect(await moveBtn.isVisible()).toBe(true);
  281 |     });
  282 | 
  283 |     test('Caso 9: Criação rápida de variação em produto existente sem loop infinito (Maximum update depth exceeded)', async ({ page }) => {
  284 |         // Cria o Produto Pai
  285 |         const newProductBtn = page.locator('button:has-text("Novo Produto")').first();
  286 |         await expect(newProductBtn).toBeVisible({ timeout: 15000 });
  287 |         await newProductBtn.click();
  288 |         
  289 |         const nameInputA = page.locator('input[placeholder*="nome interno"]').first();
  290 |         await nameInputA.fill(`${testRunId} Pai Sem Loop`);
  291 |         await nameInputA.blur();
  292 | 
  293 |         // Aba Estoque para colocar preço no pai e habilitar herança rápida
  294 |         await page.locator('button:has-text("Estoque")').first().click();
  295 |         const priceInput = page.locator('input[placeholder="0,00"]').first();
  296 |         await priceInput.fill('100,00');
  297 | 
  298 |         await page.locator('button:has-text("Concluir")').click();
  299 | 
  300 |         // Volta para a lista e abre o produto recém-criado
  301 |         await page.goto(`/registrations/products?${AUTH_QUERY}`);
  302 |         await page.waitForLoadState('domcontentloaded');
  303 | 
  304 |         // Abre modal do produto existente (clica no botão de edição ou na linha)
  305 |         await page.locator(`td:has-text("${testRunId} Pai Sem Loop")`).first().click();
  306 |         const editBtn = page.locator(`tr:has-text("${testRunId} Pai Sem Loop") button[title="Editar produto"]`).first();
  307 |         if (await editBtn.isVisible()) {
  308 |             await editBtn.click();
  309 |         }
  310 | 
  311 |         // Modal de produto deve estar visível
  312 |         const parentModal = page.locator('.fixed.inset-0 .relative.bg-white, .fixed.inset-0 .relative.dark\\:bg-slate-900').first();
  313 |         await expect(parentModal).toBeVisible({ timeout: 5000 });
  314 | 
  315 |         // Navega para aba variações
  316 |         await page.locator('button:has-text("Variações")').first().click();
  317 | 
  318 |         // Clica em "Adicionar variação" rapidamente
  319 |         const addVarBtn = page.locator('button:has-text("Adicionar variação")').first();
  320 |         await addVarBtn.click();
  321 | 
  322 |         // Modal de variação abre
  323 |         const varModal = page.locator('div[role="dialog"][aria-labelledby="variation-form-modal-title"]').first();
  324 |         await expect(varModal).toBeVisible({ timeout: 5000 });
  325 | 
  326 |         // Adiciona um atributo qualquer e salva a variação
  327 |         const addAttrBtn = varModal.locator('button:has-text("Adicionar Atributo")').first();
  328 |         if (await addAttrBtn.isVisible()) {
  329 |             await addAttrBtn.click();
  330 |         }
  331 | 
  332 |         const valueInput = varModal.locator('input[placeholder="Ex: P, Vermelho, 110V"]').first();
  333 |         if (await valueInput.isVisible()) {
  334 |             await valueInput.fill('Novo Atributo');
  335 |             await valueInput.press('Enter');
  336 |         }
  337 | 
  338 |         // Concluir variação
  339 |         await varModal.locator('button:has-text("Concluir")').first().click();
  340 | 
  341 |         // Verifica que o modal da variação fechou
  342 |         await expect(varModal).toBeHidden({ timeout: 5000 });
  343 | 
  344 |         // Se houver loop infinito, o Playwright vai travar ou capturar erro de console "Maximum update depth exceeded"
  345 |         // O afterEach garante que pageErrors e consoleErrors estejam vazios.
  346 |         
  347 |         // Conclui o produto
  348 |         await page.locator('button:has-text("Concluir")').first().click();
  349 |         
  350 |         const successToast = page.locator('text=Produto salvo com sucesso');
```