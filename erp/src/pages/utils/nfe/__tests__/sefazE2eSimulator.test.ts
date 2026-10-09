import { describe, expect, it } from 'vitest';
import { simulateFiscalE2eSoap, type FiscalE2eSimulatorEnvironment } from '../../../../../../api/nfe/sefazE2eSimulator';

const accessKey = '41261012345678000199550010000001231000001230';
const xmlPayload = `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe Id="NFe${accessKey}"><ide><tpAmb>2</tpAmb><mod>55</mod></ide></infNFe></NFe></enviNFe>`;
const params = {
  url: 'https://homologacao.nfe.sefa.pr.gov.br/ws/NFeAutorizacao4.asmx',
  action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote',
  xmlPayload,
};
const safeEnvironment: FiscalE2eSimulatorEnvironment = {
  FISCAL_E2E_ALLOWED_SUPABASE_REF: 'fiscal-e2e-isolated',
  FISCAL_E2E_SIMULATOR_ENABLED: '1',
  MORANTE_ENV_SOURCE: 'vercel-development',
  NFE_E2E_SEFAZ_MODE: 'simulated',
  NFE_ENVIRONMENT: '2',
  NFE_PRODUCTION_ENABLED: 'false',
  SUPABASE_URL: 'https://fiscal-e2e-isolated.supabase.co',
  VERCEL_ENV: 'development',
};

describe('fronteira do simulador fiscal E2E', () => {
  it('fica inativo sem a seleção explícita de modo simulado', () => {
    expect(simulateFiscalE2eSoap(params, { ...safeEnvironment, NFE_E2E_SEFAZ_MODE: undefined })).toBeNull();
  });

  it('simula autorização marcada sem alterar o XML enviado', () => {
    const reply = simulateFiscalE2eSoap(params, safeEnvironment);

    expect(reply).toContain('<cStat>104</cStat>');
    expect(reply).toContain('<cStat>100</cStat>');
    expect(reply).toContain(`<chNFe>${accessKey}</chNFe>`);
    expect(reply).toContain('nenhuma transmissão à SEFAZ ocorreu');
    expect(params.xmlPayload).toBe(xmlPayload);
  });

  it('bloqueia refs dos bancos operacionais mesmo se forem declaradas como isoladas', () => {
    expect(() =>
      simulateFiscalE2eSoap(params, {
        ...safeEnvironment,
        FISCAL_E2E_ALLOWED_SUPABASE_REF: 'hkoxhourxwlddgsfdgws',
        SUPABASE_URL: 'https://hkoxhourxwlddgsfdgws.supabase.co',
      })
    ).toThrowError(expect.objectContaining({ code: 'FISCAL_E2E_SIMULATOR_GUARD_FAILED' }));
  });

  it('bloqueia Produção, endpoint de produção, consultas e XML de ambiente 1', () => {
    expect(() =>
      simulateFiscalE2eSoap(params, { ...safeEnvironment, NFE_PRODUCTION_ENABLED: 'true' })
    ).toThrowError(expect.objectContaining({ code: 'FISCAL_E2E_SIMULATOR_GUARD_FAILED' }));
    expect(() =>
      simulateFiscalE2eSoap(
        { ...params, url: 'https://nfe.sefa.pr.gov.br/ws/NFeAutorizacao4.asmx' },
        safeEnvironment
      )
    ).toThrowError(expect.objectContaining({ code: 'FISCAL_E2E_SIMULATOR_ACTION_NOT_SUPPORTED' }));
    expect(() =>
      simulateFiscalE2eSoap(
        { ...params, action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF' },
        safeEnvironment
      )
    ).toThrowError(expect.objectContaining({ code: 'FISCAL_E2E_SIMULATOR_ACTION_NOT_SUPPORTED' }));
    expect(() =>
      simulateFiscalE2eSoap(
        { ...params, xmlPayload: xmlPayload.replace('<tpAmb>2</tpAmb>', '<tpAmb>1</tpAmb>') },
        safeEnvironment
      )
    ).toThrowError(expect.objectContaining({ code: 'FISCAL_E2E_SIMULATOR_XML_INVALID' }));
  });
});
