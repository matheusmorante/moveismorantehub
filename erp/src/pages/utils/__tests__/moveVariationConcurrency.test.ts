import { describe, it } from 'vitest';

describe('concorrência ao mover variações entre produtos', () => {
  it.todo(
    'prova concorrência entre duas variações usando fixture sintética própria e autorizada',
  );
  it.todo(
    'prova concorrência de duas movimentações da mesma variação sem sobrescrita inconsistente',
  );
  it.todo(
    'prova rollback ao tentar mover uma variação para um produto inexistente',
  );
});
