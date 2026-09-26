import re

path = 'c:/Users/mathe/OneDrive/Área de Trabalho/projetos/morantehub/mobile/src/features/compositions/modals/MobileCompositionFormModal.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

c = re.sub(r'const term = \\%\\%\\;', 'const term = %\%;', c)
c = re.sub(r'\.or\(\\\\\n.*ilike.*', '.or(
ame.ilike.\,code.ilike.\)', c)
c = re.sub(r'const description = product\.variationName \? .*?: product\.name;', 'const description = product.variationName ? ${product.name} -  : product.name;', c)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
