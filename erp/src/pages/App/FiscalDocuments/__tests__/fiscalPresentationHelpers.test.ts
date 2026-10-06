import { describe, expect, it } from 'vitest';
import {
  formatFiscalDateTime,
  formatFiscalPhone,
  formatFiscalPostalCode,
  formatFiscalTaxId,
  getCardBrandLabel,
  getCardIntegrationLabel,
  getDestinationLabel,
  getEnvironmentLabel,
  getFinalConsumerLabel,
  getFiscalEventLabel,
  getFiscalModelLabel,
  getFiscalTransportSummary,
  getFreightDetailedDescription,
  getFreightModeLabel,
  getFreightResponsibleLabel,
  getInvoicePurposeLabel,
  getItemOriginLabel,
  getOperationTypeLabel,
  getPaymentIndicatorLabel,
  getPaymentMethodLabel,
  getPresenceLabel,
  getStateRegistrationIndicatorLabel,
  normalizeFiscalTransport,
} from '../utils/fiscalPresentationHelpers';

describe('FiscalDocuments - fiscalPresentationHelpers', () => {
  describe('Modalidade do Frete e Transporte', () => {
    it('traduz todos os códigos de modFrete (0, 1, 2, 3, 4, 9) para descrições oficiais legíveis', () => {
      expect(getFreightModeLabel('0')).toBe(
        'Contratação do frete por conta do remetente (CIF)'
      );
      expect(getFreightModeLabel('1')).toBe(
        'Contratação do frete por conta do destinatário (FOB)'
      );
      expect(getFreightModeLabel('2')).toBe(
        'Contratação do frete por conta de terceiros'
      );
      expect(getFreightModeLabel('3')).toBe(
        'Transporte próprio por conta do remetente'
      );
      expect(getFreightModeLabel('4')).toBe(
        'Transporte próprio por conta do destinatário'
      );
      expect(getFreightModeLabel('9')).toBe('Sem ocorrência de transporte');
      expect(getFreightModeLabel('')).toBe('Não informado');
      expect(getFreightModeLabel(null)).toBe('Não informado');
      expect(getFreightModeLabel('88')).toBe('Modalidade 88');
    });

    it('traduz modFrete para rótulos curtos e naturais de responsável pelo transporte', () => {
      expect(getFreightResponsibleLabel('0')).toBe(
        'Frete por conta do remetente (CIF)'
      );
      expect(getFreightResponsibleLabel('1')).toBe(
        'Frete por conta do destinatário (FOB)'
      );
      expect(getFreightResponsibleLabel('2')).toBe(
        'Transportador terceiro contratado'
      );
      expect(getFreightResponsibleLabel('3')).toBe(
        'Transporte próprio da empresa'
      );
      expect(getFreightResponsibleLabel('4')).toBe(
        'Retirada pelo próprio cliente'
      );
      expect(getFreightResponsibleLabel('9')).toBe(
        'Sem transporte nesta operação'
      );
      expect(getFreightResponsibleLabel(undefined)).toBe('Responsável não informado');
    });

    it('fornece descrições explicativas detalhadas para orientar o operador', () => {
      expect(getFreightDetailedDescription('3')).toContain('empresa emitente');
      expect(getFreightDetailedDescription('4')).toContain('pelo cliente');
      expect(getFreightDetailedDescription('9')).toContain('sem necessidade de movimentação');
      expect(getFreightDetailedDescription('99')).toBe('');
    });

    it('normaliza transporte tanto de objeto estruturado quanto de array de strings legado', () => {
      const structured = normalizeFiscalTransport({
        modFrete: '3',
        carrierName: 'Móveis Morante',
      });
      expect(structured?.modFrete).toBe('3');
      expect(structured?.carrierName).toBe('Móveis Morante');

      const legacyArray = normalizeFiscalTransport([
        'modFrete: 3',
        'xNome: Móveis Morante',
        'placa: ABC1234',
        'UF: PR',
      ]);
      expect(legacyArray?.modFrete).toBe('3');
      expect(legacyArray?.carrierName).toBe('Móveis Morante');
      expect(legacyArray?.vehiclePlate).toBe('ABC1234');
      expect(legacyArray?.vehicleState).toBe('PR');

      expect(normalizeFiscalTransport(null)).toBeNull();
      expect(normalizeFiscalTransport([])).toBeNull();
      expect(normalizeFiscalTransport({})).toBeNull();
    });

    it('gera resumo textual de transporte sem vazar códigos técnicos do XML', () => {
      expect(getFiscalTransportSummary({ modFrete: '3' })).toBe(
        'Transporte próprio da empresa'
      );
      expect(
        getFiscalTransportSummary({
          modFrete: '0',
          carrierName: 'Expresso Rápido',
          vehiclePlate: 'XYZ9876',
          vehicleState: 'SP',
        })
      ).toBe('Frete por conta do remetente (CIF) · Expresso Rápido · Placa XYZ9876/SP');
      expect(getFiscalTransportSummary(null)).toBe('Não informado');
    });
  });

  describe('Identificação e Metadados Gerais', () => {
    it('traduz ambiente de homologação e produção', () => {
      expect(getEnvironmentLabel(1)).toBe('Produção');
      expect(getEnvironmentLabel('1')).toBe('Produção');
      expect(getEnvironmentLabel(2)).toBe('Homologação');
      expect(getEnvironmentLabel('2')).toBe('Homologação');
      expect(getEnvironmentLabel(null)).toBe('Não identificado');
    });

    it('traduz tipo de operação (0 = Entrada, 1 = Saída)', () => {
      expect(getOperationTypeLabel('0')).toBe('Entrada');
      expect(getOperationTypeLabel('1')).toBe('Saída');
      expect(getOperationTypeLabel('')).toBe('—');
    });

    it('traduz destino da operação (idDest)', () => {
      expect(getDestinationLabel('1')).toBe('Operação interna (mesmo estado)');
      expect(getDestinationLabel('2')).toBe('Operação interestadual');
      expect(getDestinationLabel('3')).toBe('Operação com o exterior');
      expect(getDestinationLabel(null)).toBe('—');
    });

    it('traduz consumidor final (indFinal)', () => {
      expect(getFinalConsumerLabel('1')).toBe('Sim');
      expect(getFinalConsumerLabel('0')).toBe('Não');
      expect(getFinalConsumerLabel('')).toBe('—');
    });

    it('traduz presença do comprador (indPres)', () => {
      expect(getPresenceLabel('1')).toBe('Presencial');
      expect(getPresenceLabel('2')).toBe('Não presencial — internet');
      expect(getPresenceLabel('4')).toBe('Entrega em domicílio');
      expect(getPresenceLabel('99')).toBe('—');
    });

    it('traduz modelos fiscais 55 e 65', () => {
      expect(getFiscalModelLabel('55')).toBe('NF-e · modelo 55');
      expect(getFiscalModelLabel('65')).toBe('NFC-e · modelo 65');
    });
  });

  describe('Destinatário e Tributação de Itens', () => {
    it('traduz indicador da inscrição estadual (indIEDest)', () => {
      expect(getStateRegistrationIndicatorLabel('1')).toBe('Contribuinte do ICMS');
      expect(getStateRegistrationIndicatorLabel('2')).toBe('Contribuinte isento');
      expect(getStateRegistrationIndicatorLabel('9')).toBe('Não contribuinte');
      expect(getStateRegistrationIndicatorLabel('')).toBe('—');
    });

    it('traduz código de origem da mercadoria para texto humano', () => {
      expect(getItemOriginLabel('0')).toBe('Nacional');
      expect(getItemOriginLabel('1')).toBe('Estrangeira — Importação direta');
      expect(getItemOriginLabel('2')).toBe('Estrangeira — Mercado interno');
      expect(getItemOriginLabel('')).toBe('');
    });

    it('formata CPF e CNPJ com pontuação padrão', () => {
      expect(formatFiscalTaxId('12345678909')).toBe('123.456.789-09');
      expect(formatFiscalTaxId('12345678000195')).toBe('12.345.678/0001-95');
      expect(formatFiscalTaxId('')).toBe('—');
    });

    it('formata CEP e Telefones', () => {
      expect(formatFiscalPostalCode('83405000')).toBe('83405-000');
      expect(formatFiscalPhone('41999998888')).toBe('(41) 99999-8888');
      expect(formatFiscalPhone('4133334444')).toBe('(41) 3333-4444');
      expect(formatFiscalPostalCode('')).toBe('—');
    });
  });

  describe('Pagamentos', () => {
    it('traduz métodos de pagamento (tPag) e indicador de pagamento (indPag)', () => {
      expect(getPaymentMethodLabel('01')).toBe('Dinheiro');
      expect(getPaymentMethodLabel('03')).toBe('Cartão de crédito');
      expect(getPaymentMethodLabel('15')).toBe('Boleto bancário');
      expect(getPaymentMethodLabel('17')).toBe('PIX');
      expect(getPaymentMethodLabel('90')).toBe('Sem pagamento');
      expect(getPaymentMethodLabel('PIX')).toBe('PIX');

      expect(getPaymentIndicatorLabel('0')).toBe('Pagamento à vista');
      expect(getPaymentIndicatorLabel('1')).toBe('Pagamento a prazo');
      expect(getPaymentIndicatorLabel('')).toBe('');
    });

    it('traduz bandeiras de cartão (tBand) e integração (tpIntegra)', () => {
      expect(getCardBrandLabel('01')).toBe('Visa');
      expect(getCardBrandLabel('02')).toBe('Mastercard');
      expect(getCardBrandLabel('03')).toBe('American Express');
      expect(getCardBrandLabel('04')).toBe('Sorocred');
      expect(getCardBrandLabel('05')).toBe('Diners Club');
      expect(getCardBrandLabel('06')).toBe('Elo');
      expect(getCardBrandLabel('99')).toBe('Outros');
      expect(getCardBrandLabel('')).toBe('');

      expect(getCardIntegrationLabel('1')).toBe('TEF / Integrado');
      expect(getCardIntegrationLabel('2')).toBe('Maquininha (POS manual)');
      expect(getCardIntegrationLabel('')).toBe('');
    });
  });

  describe('Finalidade da NF-e e Eventos Fiscais', () => {
    it('traduz finalidade da NF-e (finNFe)', () => {
      expect(getInvoicePurposeLabel('1')).toBe('Venda normal');
      expect(getInvoicePurposeLabel('2')).toBe('NF-e complementar');
      expect(getInvoicePurposeLabel('3')).toBe('NF-e de ajuste');
      expect(getInvoicePurposeLabel('4')).toBe('Devolução de mercadoria');
      expect(getInvoicePurposeLabel('')).toBe('Normal');
    });

    it('traduz tipos de eventos fiscais SEFAZ (tpEvento)', () => {
      expect(getFiscalEventLabel('110110')).toBe('Carta de Correção Eletrônica (CC-e)');
      expect(getFiscalEventLabel('110111')).toBe('Cancelamento de NF-e');
      expect(getFiscalEventLabel('cce')).toBe('Carta de Correção Eletrônica (CC-e)');
      expect(getFiscalEventLabel('cancel')).toBe('Cancelamento de NF-e');
      expect(getFiscalEventLabel('999999')).toBe('Evento fiscal (999999)');
    });

    it('formata data e hora fiscal de forma amigável para o operador', () => {
      const formatted = formatFiscalDateTime('2026-10-05T18:42:00-03:00');
      expect(formatted).toContain('05/10/2026');
      expect(formatted).toContain('18:42');
      expect(formatFiscalDateTime('')).toBe('—');
      expect(formatFiscalDateTime(null)).toBe('—');
    });
  });
});
