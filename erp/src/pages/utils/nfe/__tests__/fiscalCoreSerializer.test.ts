import { describe, expect, it } from 'vitest';
import { generateNfeAccessKey } from '../nfeAccessKey';
import { resolveFiscalDocument, type FiscalDocument, type FiscalSnapshotCandidate } from '../../../../../../api/nfe/fiscalSnapshot';
import { type ApprovedFiscalRuleSet } from '../../../../../../api/nfe/fiscalCore';
import { serializeFiscalDocument } from '../../../../../../api/nfe/fiscalXmlSerializer';
import { validateNfeAgainstOfficialSchema, validateUnsignedNfeStructure } from '../../../../../../api/nfe/schemaValidator';
import { createHmlTechnicalRuleSet, HML_TECHNICAL_RULESET_VERSION } from '../../../../../../api/nfe/hmlTechnicalRuleSet';
import { signNfeXml } from '../../../../../../api/nfe/nfeSigner';
import { appendResponsibleTechnician } from '../../../../../../api/nfe/responsibleTechnician';
import forge from 'node-forge';
import { initialHmlCsosnConfiguration } from '../../../../../../api/nfe/csosnPolicy';

const snapshot: FiscalSnapshotCandidate = {
  schemaVersion: 1,
  capturedAt: '2026-09-30T13:00:00.000Z',
  order: { id: 'synthetic-order', type: 'sale', status: 'scheduled', version: 1,
    updatedAt: '2026-09-30T12:00:00.000Z', data: { items: [], payments: [] } },
  issuerProfile: { companyCnpj: '12345678000195' },
  emissionRequest: { id: 'f19b3e63-6f84-45ea-8c5f-39476d709a3d', environment: 2 },
};
const decision = { decisionId: 'approved-scenario', ruleSetVersion: 'synthetic-v1',
  effectiveAt: '2026-09-01', inputFacts: {}, result: {}, reason: 'Cenário sintético aprovado para teste estrutural',
  approver: 'Responsável fiscal sintético' };
const address = { street: 'Rua Teste', number: '10', district: 'Centro',
  municipalityCode: '4105805', municipality: 'Colombo', uf: 'PR', postalCode: '83410270' };
const makeDocument = (hash: string): FiscalDocument => ({
  snapshotHash: hash, ruleSetVersion: 'synthetic-v1', model: '55', environment: 2,
  issuer: { cnpj: '12345678000195', name: 'Empresa Sintética', ie: '1234567890', crt: '1',
    municipalityCode: '4105805', address },
  recipient: { name: 'Cliente Sintético', cpfCnpj: '12345678909', ieIndicator: '9', address },
  operation: { natureOfOperation: 'VENDA', direction: 'outbound', purpose: '1', destination: '1',
    presence: '1', finalConsumer: '1', freightMode: '9' },
  items: [{ itemNumber: 1,
    product: { code: 'P-1', description: 'Móvel sintético', gtin: 'SEM GTIN', quantity: 1,
      unitValue: 100, gross: 100, discount: 0, freight: 0, insurance: 0, otherExpenses: 0 },
    classification: { ncm: '94036000', origin: '0', cfop: '5102', unit: 'UN' },
    taxes: [
      { group: 'ICMS', codeSystem: 'CSOSN', code: '102', values: { vICMS: 0 }, decisionId: decision.decisionId },
      { group: 'PIS', codeSystem: 'CST', code: '99', values: { vBC: 0, pPIS: 0, vPIS: 0 }, decisionId: decision.decisionId },
      { group: 'COFINS', codeSystem: 'CST', code: '99', values: { vBC: 0, pCOFINS: 0, vCOFINS: 0 }, decisionId: decision.decisionId },
    ], decisions: [decision] }],
  payments: [{ methodCode: '17', amount: 60, decision }, { methodCode: '01', amount: 40, decision }],
  totals: { icmsBase: 0, products: 100, discount: 0, freight: 0, insurance: 0, otherExpenses: 0,
    icms: 0, icmsExempt: 0, fcp: 0, icmsStBase: 0, icmsSt: 0, fcpSt: 0,
    fcpStRetained: 0, ii: 0, ipi: 0, ipiReturned: 0, pis: 0, cofins: 0,
    invoice: 100, payment: 100, change: 0 },
  decisions: [decision],
});
const rules: ApprovedFiscalRuleSet = { version: 'synthetic-v1', approvedBy: decision.approver,
  approvedAt: '2026-08-31', effectiveFrom: '2026-09-01', issuerCnpj: '12345678000195',
  determine: (_snapshot, hash) => makeDocument(hash) };
const key = generateNfeAccessKey({ ufCode: '41', yearMonth: '2609', cnpj: '12345678000195',
  model: '55', series: 1, number: 700, emissionType: '1', randomCode: '12345678' });
const identity = { accessKey: key.accessKey, series: 1, number: 700,
  issuedAt: '2026-09-30T10:00:00-03:00' };

describe('Fiscal Core e serializer de NF-e 55', () => {
  it('serializa somente documento resolvido e valida no XSD oficial fixado', async () => {
    const resolved = resolveFiscalDocument(snapshot, rules);
    expect(resolved.status).toBe('ready');
    if (resolved.status !== 'ready') return;
    const xml = serializeFiscalDocument(snapshot, resolved.document, rules, identity);
    await expect(validateUnsignedNfeStructure(xml)).resolves.toBeUndefined();
    await expect(validateNfeAgainstOfficialSchema(xml)).rejects.toThrow('schema oficial');
    expect(xml).toContain('<detPag><tPag>17</tPag><vPag>60.00</vPag></detPag>');
    expect(xml).toContain('<detPag><tPag>01</tPag><vPag>40.00</vPag></detPag>');
    const keyPair = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: 0 });
    const signed = signNfeXml(xml, forge.pki.privateKeyToPem(keyPair.privateKey),
      Buffer.from('certificado sintético').toString('base64'));
    await expect(validateNfeAgainstOfficialSchema(signed)).resolves.toBeUndefined();
  });

  it('bloqueia totais divergentes e matriz fora da vigência', () => {
    const invalidRules = { ...rules, determine: (_snapshot: FiscalSnapshotCandidate, hash: string) => ({
      ...makeDocument(hash), totals: { ...makeDocument(hash).totals, invoice: 99 },
    }) };
    expect(resolveFiscalDocument(snapshot, invalidRules)).toMatchObject({ status: 'blocked',
      blockers: [{ code: 'FISCAL_DOCUMENT_INCOMPLETE' }] });
    expect(resolveFiscalDocument(snapshot, { ...rules, effectiveFrom: '2026-10-01' })).toMatchObject({
      status: 'blocked', blockers: [{ code: 'FISCAL_RULESET_NOT_APPLICABLE' }],
    });
  });

  it('não promove os defaults salvos nas configurações a uma matriz aprovada', () => {
    expect(resolveFiscalDocument({ ...snapshot, fiscalConfiguration: {
      cfop: '5102', cst: '102', origem: '0', icmsPercent: 0,
      pisCst: '49', cofinsCst: '49',
    } })).toMatchObject({ status: 'blocked',
      blockers: [{ code: 'APPROVED_FISCAL_RULESET_REQUIRED' }] });
  });

  it('recusa NFC-e sem QR Code e chave diferente da reserva', () => {
    const document = makeDocument('x'.repeat(64));
    expect(() => serializeFiscalDocument(snapshot, document, rules, identity)).toThrow('snapshot');
    const resolved = resolveFiscalDocument(snapshot, rules);
    if (resolved.status !== 'ready') throw new Error('Cenário sintético deveria resolver.');
    expect(() => serializeFiscalDocument(snapshot, { ...resolved.document, model: '65' }, rules, identity))
      .toThrow('NFC-e');
    expect(() => serializeFiscalDocument(snapshot, {
      ...resolved.document,
      operation: { ...resolved.document.operation, destination: '2' },
    }, rules, identity)).toThrow('Operação fiscal não suportada');
    expect(() => serializeFiscalDocument(snapshot, resolved.document, rules,
      { ...identity, accessKey: '1'.repeat(44) })).toThrow('Chave');
  });

  it('HML_TECHNICAL_V1 só resolve fixture explícito em tpAmb=2', async () => {
    const runId = 'TEST_AUT_f19b3e63-6f84-45ea-8c5f-39476d709a3d';
    const savedDecision = {
      scope: { model: '55', operation: 'normal_sale', issuerCrt: '1' },
      pis: { cst: '99', base: 0, rate: 0, value: 0 },
      cofins: { cst: '99', base: 0, rate: 0, value: 0 },
      confirmedAt: '2026-09-01T00:00:00Z', confirmedBy: 'operator_instruction',
      productionApproved: false,
    };
    const fixture = {
      ...snapshot,
      issuerProfile: {
        companyCnpj: '12345678000195', companyName: 'EMPRESA HML',
        companyIE: '1234567890', companyCRT: '1',
        companyLogradouro: 'RUA TESTE', companyNumero: '10',
        companyBairro: 'CENTRO', companyCMun: '4105805',
        companyXMun: 'COLOMBO', companyUF: 'PR', companyCEP: '83410270',
      },
      order: { ...snapshot.order, id: runId, status: 'draft', deleted: true, data: {
        deleted: true,
        testRunId: runId,
        fiscalScenario: HML_TECHNICAL_RULESET_VERSION,
        items: [{ description: `HML TECNICO ${runId}`, quantity: 1,
          unitPrice: 100, unitDiscount: 0, isTemporaryProduct: true }],
        payments: [], fiscalTestPayments: [{ method: 'pix', amount: 100 }],
        customerData: { cpfCnpj: '12345678909', fullName: `CLIENTE ${runId}`,
          fiscalAddress: { Logradouro: 'RUA TESTE', Numero: '10', Bairro: 'CENTRO',
            CMun: '4105805', XMun: 'COLOMBO', UF: 'PR', CEP: '83410270' } },
      } },
    } satisfies FiscalSnapshotCandidate;
    const hml = createHmlTechnicalRuleSet(fixture, savedDecision, initialHmlCsosnConfiguration());
    expect(resolveFiscalDocument(fixture, hml)).toMatchObject({
      status: 'ready', document: { model: '55', environment: 2,
        ruleSetVersion: HML_TECHNICAL_RULESET_VERSION },
    });
    const resolved = resolveFiscalDocument(fixture, hml);
    if (resolved.status !== 'ready') throw new Error('Fixture HML deveria resolver.');
    const xml = appendResponsibleTechnician(
      serializeFiscalDocument(fixture, resolved.document, hml, identity),
      identity.accessKey,
      { cnpj: '12345678000195', contact: 'TECNICO HML', email: 'hml@example.test',
        phone: '41999999999', csrtId: '01', csrt: '1234567890ABCDEF' }
    );
    expect(xml).toContain('<ICMSSN102><orig>0</orig><CSOSN>103</CSOSN>');
    expect(xml).toContain('<PISOutr><CST>99</CST>');
    expect(xml).toContain('<COFINSOutr><CST>99</CST>');
    await expect(validateUnsignedNfeStructure(xml)).resolves.toBeUndefined();
    const keyPair = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: 0 });
    const signed = signNfeXml(xml, forge.pki.privateKeyToPem(keyPair.privateKey),
      Buffer.from('certificado sintético').toString('base64'));
    await expect(validateNfeAgainstOfficialSchema(signed)).resolves.toBeUndefined();
    expect(() => createHmlTechnicalRuleSet(fixture, { ...savedDecision,
      productionApproved: true }, initialHmlCsosnConfiguration())).toThrow('Decisão persistida');
    const importedFixture: FiscalSnapshotCandidate = { ...fixture, order: { ...fixture.order,
      data: { ...fixture.order.data, items: [{ ...fixture.order.data.items[0], fiscal: { origem: '2' } }] } } };
    const importedResolved = resolveFiscalDocument(importedFixture, hml);
    if (importedResolved.status !== 'ready') throw new Error('Origem deveria ser preservada.');
    expect(serializeFiscalDocument(importedFixture, importedResolved.document, hml, identity))
      .toContain('<ICMSSN102><orig>2</orig><CSOSN>103</CSOSN>');
    const manualFixture: FiscalSnapshotCandidate = { ...importedFixture,
      emissionRequest: { ...importedFixture.emissionRequest, itemCsosnOverrides: { '1': '102' } } };
    const manualResolved = resolveFiscalDocument(manualFixture, hml);
    if (manualResolved.status !== 'ready') throw new Error('Escolha manual deveria ser preservada.');
    expect(serializeFiscalDocument(manualFixture, manualResolved.document, hml, identity))
      .toContain('<ICMSSN102><orig>2</orig><CSOSN>102</CSOSN>');
    expect(resolveFiscalDocument({ ...fixture, emissionRequest: {
      ...fixture.emissionRequest, environment: 1,
    } }, hml)).toMatchObject({ status: 'blocked',
      blockers: [{ code: 'PRODUCTION_FISCAL_RULESET_REQUIRED' }] });
    expect(resolveFiscalDocument({ ...fixture, order: { ...fixture.order,
      data: { ...fixture.order.data, fiscalScenario: 'REAL' },
    } }, hml)).toMatchObject({ status: 'blocked',
      blockers: [{ code: 'FISCAL_DOCUMENT_INCOMPLETE' }] });
  });
});
