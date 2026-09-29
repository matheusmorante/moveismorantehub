const fs = require('fs');
const file = 'mobile/src/features/logistics/screens/DeliveriesHubScreen.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  /\{\/\* Filtro Global de Período posicionado na linha do título: \[ Hoje \] \[ Dias seguintes \] \*\/\}\\s*\{activeTab !== 'assemblies' && \(/g,
  "{/* Filtro Global de Período posicionado na linha do título: [ Hoje ] [ Dias seguintes ] */}\n          {"
);

c = c.replace(
  /<NativeAssembliesScreen\s*isDarkMode=\{isDarkMode\}\s*initialSubTab=\{initialAssemblySubTab\}\s*onSelectOrder=\{onSelectOrder\}\s*\/>/g,
  "<NativeAssembliesScreen\n          isDarkMode={isDarkMode}\n          initialSubTab={initialAssemblySubTab}\n          onSelectOrder={onSelectOrder}\n          scheduleDateScope={scheduleDateScope}\n        />"
);

c = c.replace(/gap: 14,/g, "gap: 8,");
c = c.replace(/minHeight: 44,/g, "minHeight: 32,");
c = c.replace(/paddingHorizontal: 20,/g, "paddingHorizontal: 14,");
c = c.replace(/paddingVertical: 10,/g, "paddingVertical: 6,");
c = c.replace(/borderRadius: 22,/g, "borderRadius: 16,");
c = c.replace(/fontSize: 15,/g, "fontSize: 12,");
c = c.replace(/borderRadius: 26,/g, "borderRadius: 20,");

fs.writeFileSync(file, c);
console.log('Hub screen updated');
