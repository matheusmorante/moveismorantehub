'use strict';

process.stderr.write(
  'Este audit legado selecionava um pedido operacional fixo e foi desativado. Use o runner fiscal com --run-id e --order-id de artefatos já persistidos no Supabase.\n',
);
process.exitCode = 2;