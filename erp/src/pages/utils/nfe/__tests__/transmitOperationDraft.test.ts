import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    validateNfeAgainstOfficialSchema: vi.fn(),
    extractCertificateAndKey: vi.fn(),
    signNfeXml: vi.fn(),
    sendSoapToSefaz: vi.fn(),
    buildReviewedFiscalOperationXml: vi.fn(),
    parseAuthorizedInvoiceLines: vi.fn(),
}));

vi.mock('../../../../../../node_modules/@supabase/supabase-js/dist/index.mjs', () => ({ createClient: mocks.createClient }));
vi.mock('../../../../../../api/nfe/schemaValidator', () => ({ validateNfeAgainstOfficialSchema: mocks.validateNfeAgainstOfficialSchema }));
vi.mock('../../../../../../api/nfe/nfeSigner', () => ({
    extractCertificateAndKey: mocks.extractCertificateAndKey,
    signNfeXml: mocks.signNfeXml,
}));
vi.mock('../../../../../../api/nfe/sefazClient', () => ({ sendSoapToSefaz: mocks.sendSoapToSefaz }));
vi.mock('../fiscalOperationXml', () => ({ buildReviewedFiscalOperationXml: mocks.buildReviewedFiscalOperationXml }));
vi.mock('../invoiceLineSnapshot', () => ({ parseAuthorizedInvoiceLines: mocks.parseAuthorizedInvoiceLines }));

const sourceKey = '1'.repeat(44);
const reviewedProduct = '<prod><cProd>SKU-1</cProd><xProd>Cadeira</xProd><NCM>94017900</NCM><CFOP>1202</CFOP><qCom>1.0000</qCom><vProd>100.00</vProd></prod>';
const reviewedTaxes = '<imposto><ICMS><ICMSSN102><orig>0</orig><CSOSN>102</CSOSN></ICMSSN102></ICMS></imposto>';
const authReply = '<retEnviNFe><cStat>104</cStat><xMotivo>Lote processado</xMotivo><protNFe><infProt><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo><nProt>141260000123456</nProt><dhRecbto>2026-09-26T12:00:00-03:00</dhRecbto></infProt></protNFe></retEnviNFe>';
const rejectedReply = '<retEnviNFe><cStat>104</cStat><xMotivo>Lote processado</xMotivo><protNFe><infProt><cStat>539</cStat><xMotivo>Duplicidade de NF-e</xMotivo></infProt></protNFe></retEnviNFe>';
const notFoundReply = '<retConsSitNFe><cStat>217</cStat><xMotivo>NF-e não consta na base</xMotivo></retConsSitNFe>';
const uncertainReply = '<retConsSitNFe><cStat>105</cStat><xMotivo>Lote em processamento</xMotivo></retConsSitNFe>';

function createDatabase() {
    const state = {
        draft: { id: '11111111-1111-4111-8111-111111111111', operation_kind: 'return', finalidade: 4,
            original_document_id: '22222222-2222-4222-8222-222222222222', original_access_key: sourceKey,
            return_order_id: '33333333-3333-4333-8333-333333333333', environment: 1, status: 'ready',
            reason: null, nature_of_operation: 'Devolução de mercadoria',
            review_data: { recipient_xml: '<dest/>', totals_xml: '<total/>', transport_xml: '<transp/>', payment_xml: '<pag/>', reason: '' },
            reviewed_at: '2026-09-26T12:00:00.000Z', access_key: null as string | null,
            signed_xml: null as string | null, document_id: null as string | null, sefaz_response_xml: null as string | null },
        source: { id: '22222222-2222-4222-8222-222222222222', order_id: '44444444-4444-4444-8444-444444444444',
            status: 'autorizada', ambiente: 1, modelo: '55', chave_acesso: sourceKey, numero_protocolo: '141260000654321', xml_protocolo: '<dhRecbto>2026-09-26T12:00:00-03:00</dhRecbto>' },
        lines: [{ id: '55555555-5555-4555-8555-555555555555', original_document_item_id: '66666666-6666-4666-8666-666666666666',
            fiscal_item_number: 1, quantity: 1, gross_value: 100, discount_value: 0, reviewed_cfop: '1202',
            reviewed_product_xml: reviewedProduct, reviewed_taxes_xml: reviewedTaxes }],
        originalLines: [{ id: '66666666-6666-4666-8666-666666666666', item_number: 2, billed_quantity: 2,
            gross_value: 200, discount_value: 0, product_code: 'SKU-1', description: 'Cadeira', unit_value: 100,
            product_xml: '<prod><NCM>94017900</NCM></prod>', taxes_xml: reviewedTaxes }],
        settings: { data: { companyCnpj: '44512248000107', nfeSerie: '1', nfeNextNumber: 700,
            certificateBase64: 'mock-pfx', certificatePassword: 'mock-password' } },
        rpcCalls: [] as Array<{ name: string; args: Record<string, unknown> }>,
    };

    const from = (table: string) => {
        let patch: Record<string, unknown> | null = null;
        let idFilter: string | null = null;
        let statusFilter: string | null = null;
        let statusIn: string[] | null = null;
        const resultForTable = () => table === 'nfe_operation_drafts' ? state.draft
            : table === 'nfe_documents' ? state.source
                : table === 'nfe_operation_draft_lines' ? state.lines
                    : table === 'nfe_document_items' ? state.originalLines
                        : table === 'settings' ? state.settings : null;
        const queryResult = () => {
            if (!patch) return { data: resultForTable(), error: null };
            if (table !== 'nfe_operation_drafts' || idFilter !== state.draft.id ||
                (statusFilter && state.draft.status !== statusFilter) ||
                (statusIn && !statusIn.includes(state.draft.status))) return { data: null, error: null };
            Object.assign(state.draft, patch);
            return { data: { id: state.draft.id }, error: null };
        };
        const builder: any = {
            select: () => builder,
            update: (value: Record<string, unknown>) => { patch = value; return builder; },
            eq: (column: string, value: string) => {
                if (column === 'id') idFilter = value;
                if (column === 'status') statusFilter = value;
                return builder;
            },
            in: (column: string, values: string[]) => { if (column === 'status') statusIn = values; return builder; },
            order: () => builder,
            maybeSingle: async () => queryResult(),
            then: (resolve: (value: unknown) => void, reject: (error: unknown) => void) => {
                return Promise.resolve(queryResult()).then(resolve, reject);
            },
        };
        return builder;
    };

    const db = {
        auth: { getUser: async () => ({ data: { user: { id: '77777777-7777-4777-8777-777777777777' } }, error: null }) },
        from,
        rpc: async (name: string, args: Record<string, unknown>) => {
            state.rpcCalls.push({ name, args });
            if (name === 'reserve_next_nfe_number') return { data: 701, error: null };
            if (name === 'persist_authorized_nfe_operation_draft') {
                state.draft.status = 'authorized';
                state.draft.document_id = String(args.p_document_id);
                return { data: args.p_document_id, error: null };
            }
            return { data: null, error: { message: 'RPC inesperada' } };
        },
    };
    return { db, state };
}

function createResponse() {
    let statusCode = 200;
    let body: any;
    const response: any = {
        setHeader: vi.fn(),
        status(code: number) { statusCode = code; return response; },
        json(value: unknown) { body = value; return response; },
        end() { return response; },
    };
    return { response, get statusCode() { return statusCode; }, get body() { return body; } };
}

async function getHandler() {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key';
    vi.resetModules();
    return (await import('../../../../../../api/nfe/transmit-operation-draft')).default;
}

describe('endpoint de transmissão do rascunho fiscal (SEFAZ simulada)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.validateNfeAgainstOfficialSchema.mockResolvedValue(undefined);
        mocks.extractCertificateAndKey.mockReturnValue({ certPem: 'mock-cert', privateKeyPem: 'mock-key', certDerBase64: 'mock-der' });
        mocks.signNfeXml.mockImplementation((xml: string) => `${xml}<Signature/>`);
        mocks.buildReviewedFiscalOperationXml.mockReturnValue('<NFe><infNFe/></NFe>');
        mocks.parseAuthorizedInvoiceLines.mockReturnValue([{ invoiceItemNumber: 1, productCode: 'SKU-1',
            description: 'Cadeira', billedQuantity: 1, unitValue: 100, grossValue: 100, discountValue: 0 }]);
    });

    it('só persiste no RPC transacional após autorização com chave/protocolo SEFAZ', async () => {
        const { db, state } = createDatabase();
        mocks.createClient.mockReturnValue(db);
        mocks.sendSoapToSefaz.mockResolvedValue(authReply);
        const handler = await getHandler();
        const res = createResponse();
        await handler({ method: 'POST', headers: { authorization: 'Bearer user-token' },
            body: { draftId: state.draft.id, productionConfirmed: true } } as any, res.response);

        expect(mocks.createClient).toHaveBeenCalled();
        expect([res.statusCode, res.body]).toEqual([200, expect.objectContaining({ status: 'authorized' })]);
        expect(res.body.status).toBe('authorized');
        expect(state.draft.access_key).toMatch(/^\d{44}$/);
        expect(state.rpcCalls.map((call) => call.name)).toEqual(['reserve_next_nfe_number', 'persist_authorized_nfe_operation_draft']);
        const persist = state.rpcCalls[1].args;
        expect(persist.p_access_key).toBe(state.draft.access_key);
        expect(persist.p_signed_xml).toBe(state.draft.signed_xml);
        expect((persist.p_items as Array<Record<string, unknown>>)[0].item_number).toBe(1);
        expect(mocks.buildReviewedFiscalOperationXml.mock.calls[0][0].lines[0].originalItemNumber).toBe(2);
    });

    it('bloqueia a emissão deste fluxo para documento NFC-e modelo 65', async () => {
        const { db, state } = createDatabase();
        state.source.modelo = '65';
        mocks.createClient.mockReturnValue(db);
        const handler = await getHandler();
        const res = createResponse();
        await handler({ method: 'POST', headers: { authorization: 'Bearer user-token' },
            body: { draftId: state.draft.id, productionConfirmed: true } } as any, res.response);

        expect(res.statusCode).toBe(409);
        expect(mocks.sendSoapToSefaz).not.toHaveBeenCalled();
    });

    it('registra rejeição sem chamar a RPC de autorização', async () => {
        const { db, state } = createDatabase();
        mocks.createClient.mockReturnValue(db);
        mocks.sendSoapToSefaz.mockResolvedValue(rejectedReply);
        const handler = await getHandler();
        const res = createResponse();
        await handler({ method: 'POST', headers: { authorization: 'Bearer user-token' },
            body: { draftId: state.draft.id, productionConfirmed: true } } as any, res.response);

        expect(res.statusCode).toBe(422);
        expect(res.body.status).toBe('rejected');
        expect(state.draft.status).toBe('rejected');
        expect(state.rpcCalls.some((call) => call.name === 'persist_authorized_nfe_operation_draft')).toBe(false);
        expect(state.draft.sefaz_response_xml).toBe(rejectedReply);
    });

    it('timeout nunca retransmite automaticamente; libera somente após consulta cStat 217', async () => {
        const { db, state } = createDatabase();
        mocks.createClient.mockReturnValue(db);
        mocks.sendSoapToSefaz.mockImplementation(({ xmlPayload }: { xmlPayload: string }) =>
            xmlPayload.includes('<xServ>CONSULTAR</xServ>') ? Promise.resolve(notFoundReply) : Promise.reject(new Error('timeout')));
        const handler = await getHandler();
        const first = createResponse();
        await handler({ method: 'POST', headers: { authorization: 'Bearer user-token' },
            body: { draftId: state.draft.id, productionConfirmed: true } } as any, first.response);
        expect(first.statusCode).toBe(202);
        expect(first.body.pending).toBe(true);
        expect(state.draft.status).toBe('unknown');
        const attemptedAccessKey = state.draft.access_key;
        expect(attemptedAccessKey).toMatch(/^\d{44}$/);
        expect(state.rpcCalls.some((call) => call.name === 'persist_authorized_nfe_operation_draft')).toBe(false);

        const second = createResponse();
        await handler({ method: 'POST', headers: { authorization: 'Bearer user-token' },
            body: { draftId: state.draft.id, productionConfirmed: true } } as any, second.response);
        expect(second.statusCode).toBe(409);
        expect(second.body.retryAllowed).toBe(true);
        expect(state.draft.status).toBe('ready');
        expect(state.draft.access_key).toBe(attemptedAccessKey);
        expect(mocks.sendSoapToSefaz.mock.calls.filter(([input]) => !input.xmlPayload.includes('<xServ>CONSULTAR</xServ>'))).toHaveLength(1);
    });

    it('timeout com situação ainda incerta continua pendente e não libera retry', async () => {
        const { db, state } = createDatabase();
        mocks.createClient.mockReturnValue(db);
        mocks.sendSoapToSefaz.mockImplementation(({ xmlPayload }: { xmlPayload: string }) =>
            xmlPayload.includes('<xServ>CONSULTAR</xServ>') ? Promise.resolve(uncertainReply) : Promise.reject(new Error('timeout')));
        const handler = await getHandler();
        const res = createResponse();
        await handler({ method: 'POST', headers: { authorization: 'Bearer user-token' },
            body: { draftId: state.draft.id, productionConfirmed: true } } as any, res.response);

        expect(res.statusCode).toBe(202);
        expect(res.body.retryAllowed).toBeUndefined();
        expect(state.draft.status).toBe('unknown');
        expect(state.rpcCalls.some((call) => call.name === 'persist_authorized_nfe_operation_draft')).toBe(false);
    });
});
