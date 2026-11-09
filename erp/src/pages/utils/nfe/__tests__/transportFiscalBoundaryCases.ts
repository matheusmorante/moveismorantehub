import { expect, it } from 'vitest';
import { createHmlNormalSaleRuleSet } from '../../../../../../api/nfe/hmlNormalSaleRuleSet';
import { initialHmlCsosnConfiguration } from '../../../../../../api/nfe/csosnPolicy';
import {
  parseFiscalEmissionCommand,
  resolveFiscalDocument,
  type FiscalSnapshotCandidate,
} from '../../../../../../api/nfe/fiscalSnapshot';
import { generateNfeAccessKey } from '../nfeAccessKey';
import { serializeFiscalDocument } from '../../../../../../api/nfe/fiscalXmlSerializer';

type MakeFacts = (finalConsumer?: boolean) => FiscalSnapshotCandidate;

export function registerTransportFiscalBoundaryCases(makeFacts: MakeFacts): void {
  // 12. Backend rejeita combinações impossíveis
  it('12. Backend parseFiscalEmissionCommand rejeita estados incoerentes', () => {
    // 12.1 Transporte OFF com transportador informado
    const cmd1 = parseFiscalEmissionCommand({
      orderId: 'ORDER-1',
      environment: 2,
      emissionRequestId: 'f19b3e63-6f84-45ea-8c5f-39476d709a3d',
      hasTransport: false,
      transporter: { name: 'TRANSPORTE INVALIDO', cnpj: '12345678000195' },
    });
    expect(cmd1).toHaveProperty('error');
    expect((cmd1 as any).error).toContain('Transporte desligado não admite dados de transportador');

    // 12.2 Transporte OFF com modFrete != 9
    const cmd2 = parseFiscalEmissionCommand({
      orderId: 'ORDER-1',
      environment: 2,
      emissionRequestId: 'f19b3e63-6f84-45ea-8c5f-39476d709a3d',
      hasTransport: false,
      freightMode: '3',
    });
    expect(cmd2).toHaveProperty('error');
    expect((cmd2 as any).error).toContain('Transporte desligado exige modalidade 9');

    // 12.3 Transporte OFF com transportResponsible informado
    const cmd3 = parseFiscalEmissionCommand({
      orderId: 'ORDER-1',
      environment: 2,
      emissionRequestId: 'f19b3e63-6f84-45ea-8c5f-39476d709a3d',
      hasTransport: false,
      transportResponsible: 'OWN_COMPANY',
    });
    expect(cmd3).toHaveProperty('error');
    expect((cmd3 as any).error).toContain('Transporte desligado não admite responsável');
  });

  // 13. Serializer gera XML correto
  it('13. Serializer gera tags transp e transporta estritamente corretas', async () => {
    // Teste com NF-e 55 + retirada (modFrete = 4)
    const facts55 = makeFacts(false);
    facts55.emissionRequest.hasTransport = true;
    facts55.emissionRequest.transportResponsible = 'CUSTOMER';
    facts55.order.data.shipping = { value: 0, deliveryMethod: 'pickup' };
    facts55.order.data.payments = [{ method: 'Pix', amount: 349 }];

    const rules55 = await createHmlNormalSaleRuleSet(facts55, initialHmlCsosnConfiguration());
    const res55 = resolveFiscalDocument(facts55, rules55);
    if (res55.status !== 'ready') throw new Error(JSON.stringify(res55.blockers));

    const key55 = generateNfeAccessKey({
      ufCode: '41',
      yearMonth: '2609',
      cnpj: '12345678000195',
      model: '55',
      series: '1',
      number: 213,
      emissionType: '1',
      randomCode: '12345678',
    }).accessKey;

    const xml55 = serializeFiscalDocument(facts55, res55.document, rules55, {
      accessKey: key55,
      series: 1,
      number: 213,
      issuedAt: '2026-09-30T10:00:00-03:00',
    });

    expect(xml55).toContain('<transp><modFrete>4</modFrete></transp>');
    expect(xml55).not.toContain('<transporta>');
  });

  // 14. Nenhum dado antigo escondido é enviado quando transporte é desligado (NFC-e 65 com retirada)
  it('14. Nenhum dado de transportador é enviado quando transporte é desligado', async () => {
    const facts = makeFacts();
    facts.emissionRequest.finalConsumer = true;
    facts.emissionRequest.hasTransport = false;
    // Tenta injetar dados residuais
    facts.order.data.shipping = {
      value: 0,
      deliveryMethod: 'pickup',
      transporter: { name: 'RESIDUAL', cnpj: '11111111000111' },
    };
    facts.order.data.payments = [{ method: 'Pix', amount: 349 }];

    const rules = await createHmlNormalSaleRuleSet(facts, initialHmlCsosnConfiguration());
    const res = resolveFiscalDocument(facts, rules);
    if (res.status !== 'ready') throw new Error(JSON.stringify(res.blockers));

    expect(res.document.operation.freightMode).toBe('9');
    expect(res.document.operation.transporter).toBeUndefined();
  });
}
