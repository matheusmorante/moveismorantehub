import { describe, expect, it } from 'vitest';
import {
  getResponsibleTechnicianConfig,
  getResponsibleTechnicianConfigurationIssues,
} from '../../../../../../api/nfe/responsibleTechnician';
const env = {
  NFE_RESPONSIBLE_TECH_CNPJ: '12345678000195',
  NFE_RESPONSIBLE_TECH_CONTACT: 'TECNICO TEST_AUT',
  NFE_RESPONSIBLE_TECH_EMAIL: 'test@example.test',
  NFE_RESPONSIBLE_TECH_PHONE: '41999999999',
  NFE_ID_CSRT_HOMOLOGACAO: '01',
  NFE_CSRT_HOMOLOGACAO: 'TESTAUT1234567890',
  NFE_ID_CSRT_PRODUCAO: '02',
  NFE_CSRT_PRODUCAO: 'PRODTEST1234567890',
};
describe('CSRT por ambiente e nomes já configurados na Vercel', () => {
  it('reads the configured aliases and only the homologation CSRT for HML', () => {
    expect(getResponsibleTechnicianConfig(env, 2)).toMatchObject({
      csrtId: '01',
      csrt: env.NFE_CSRT_HOMOLOGACAO,
    });
    expect(getResponsibleTechnicianConfig(env, 1)).toMatchObject({
      csrtId: '02',
      csrt: env.NFE_CSRT_PRODUCAO,
    });
  });
  it('never substitutes a production CSRT when the HML CSRT is missing', () => {
    expect(
      getResponsibleTechnicianConfig({ ...env, NFE_CSRT_HOMOLOGACAO: undefined }, 2)
    ).toBeNull();
  });
  it('reports invalid field names without returning credential values', () => {
    const issues = getResponsibleTechnicianConfigurationIssues(
      { ...env, NFE_ID_CSRT_HOMOLOGACAO: 'INVALID_TEST_AUT', NFE_RESPONSIBLE_TECH_PHONE: '' },
      2
    );
    expect(issues).toEqual(['responsibleTechnician.phone', 'responsibleTechnician.csrtId']);
    expect(JSON.stringify(issues)).not.toContain('INVALID_TEST_AUT');
    expect(JSON.stringify(issues)).not.toContain(env.NFE_CSRT_HOMOLOGACAO);
    expect(getResponsibleTechnicianConfigurationIssues(env, 2)).toEqual([]);
  });
});
