import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

describe('Contrato estático dos comandos SQL — não comprova PostgreSQL', () => {
  const directory = new URL('../../../../../../supabase/migrations/', import.meta.url);
  const files = readdirSync(directory).filter((file) => file.endsWith('_customer_support_internal_commands.sql'));
  const separationFiles = readdirSync(directory).filter((file) => file.endsWith('_customer_support_history_context_and_separated_comments.sql'));
  if (files.length !== 1) throw new Error('Esperada uma única migration dos comandos internos.');
  if (separationFiles.length !== 1) throw new Error('Esperada uma única migration para separar comentários do resumo.');
  const sql = readFileSync(new URL(files[0], directory), 'utf8');
  const separationSql = readFileSync(new URL(separationFiles[0], directory), 'utf8');
  it('protege as cinco funções e não remove o contrato do frontend anterior na expansão', () => {
    expect(sql.match(/auth.uid\(\) IS NULL OR NOT public.customer_support_can_view\(\)/g)).toHaveLength(5);
    expect(sql.match(/SECURITY DEFINER SET search_path = '' SET statement_timeout = '10s'/g)).toHaveLength(5);
    expect(sql.match(/FOR UPDATE/g)).toHaveLength(5);
    expect(sql.match(/FROM PUBLIC, anon;/g)).toHaveLength(5);
    expect(sql).not.toMatch(/\bDROP\b|REVOKE INSERT ON TABLE|REVOKE UPDATE ON TABLE/);
  });
  it('deriva autoria no servidor, protege marcadores e dispensa eventos de estados repetidos', () => {
    expect(sql).toContain("'author_id', auth.uid()");
    expect(sql).toContain("lower(v_tag) LIKE 'status:%'");
    expect(sql).toContain('IF v_current IS NOT DISTINCT FROM p_assignee_id THEN RETURN true; END IF;');
    expect(sql).toContain('IF v_current = p_status THEN RETURN true; END IF;');
    expect(sql).toContain("ERRCODE = '40001'");
  });

  it('mantém comentários no histórico sem substituir as notas editáveis da conversa', () => {
    expect(separationSql).toContain('public.customer_support_can_view()');
    expect(separationSql).toContain('UPDATE public.whatsapp_conversations SET updated_at = now()');
    expect(separationSql).toContain("'internal_note'");
    expect(separationSql).not.toMatch(/UPDATE\s+public\.whatsapp_conversations\s+SET\s+internal_notes\s*=/i);
  });
});
