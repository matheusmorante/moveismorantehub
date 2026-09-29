const fs = require('fs');
const file = 'mobile/src/features/logistics/screens/DeliveriesHubScreen.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  /<NativeAssembliesScreen\s*isDarkMode=\{isDarkMode\}\s*initialSubTab=\{initialAssemblySubTab\}\s*onSelectOrder=\{onSelectOrder\}\s*\/>/g,
  "<NativeAssembliesScreen\n          isDarkMode={isDarkMode}\n          initialSubTab={initialAssemblySubTab}\n          onSelectOrder={onSelectOrder}\n          scheduleDateScope={scheduleDateScope}\n        />"
);

fs.writeFileSync(file, c);
console.log('Passed prop');
