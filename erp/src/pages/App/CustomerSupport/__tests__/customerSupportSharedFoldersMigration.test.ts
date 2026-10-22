import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(new URL('../../../../../../docs/integracoes/sql/customer-support-shared-folder-maintenance.sql', import.meta.url), 'utf8');

describe('Manutenção compartilhada — inspeção estática, sem prova PostgreSQL entre identidades', () => {
  it('amplia somente manutenção, mantendo autorização da Central nos dois lados do UPDATE', () => {
    expect(sql.match(/ALTER POLICY /g)).toHaveLength(2);
    expect(sql).toContain('ALTER POLICY customer_support_inboxes_update');
    expect(sql).toContain('ALTER POLICY customer_support_inboxes_delete');
    expect(sql).toContain('WITH CHECK ((SELECT public.customer_support_can_view()))');
    expect(sql.match(/USING \(\(SELECT public\.customer_support_can_view\(\)\)\)/g)).toHaveLength(2);
    expect(sql).not.toContain('created_by =');
    expect(sql).not.toMatch(/ALTER POLICY customer_support_inboxes_(insert|select)/);
  });

  it('preserva identidade por privilégios de coluna sem liberar anon ou alterar registros', () => {
    expect(sql).toContain('REVOKE ALL ON public.customer_support_inboxes FROM PUBLIC, anon, authenticated');
    expect(sql).toContain('REVOKE ALL (id, name, criteria, created_by, created_at, updated_at)');
    expect(sql).toContain('GRANT UPDATE (name, criteria, updated_at) ON public.customer_support_inboxes TO authenticated');
    expect(sql).not.toMatch(/GRANT UPDATE ON |GRANT UPDATE \([^)]*(created_by|created_at|\bid\b)/);
    expect(sql).not.toMatch(/DISABLE|DROP |CREATE TABLE|CREATE SCHEMA|^\s*(INSERT INTO|UPDATE public|DELETE FROM)/m);
  });
});
