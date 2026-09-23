import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { extractCertificateAndKey, signNfeXml } from './nfeSigner';
import { sendSoapToSefaz } from './sefazClient';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://wzpdfmihnwcrgkyagwkd.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

// Endpoints Oficiais SEFAZ-PR Homologação e Produção
const SEFAZ_PR_URLS = {
    homologacao: {
        autorizacao: 'https://hmg.nfe.fazenda.pr.gov.br/nfe/services/NfeAutorizacao4',
        retAutorizacao: 'https://hmg.nfe.fazenda.pr.gov.br/nfe/services/NfeRetAutorizacao4',
    },
    producao: {
        autorizacao: 'https://nfe.fazenda.pr.gov.br/nfe/services/NfeAutorizacao4',
        retAutorizacao: 'https://nfe.fazenda.pr.gov.br/nfe/services/NfeRetAutorizacao4',
    }
};

function readXmlTag(xml: string, tag: string): string | undefined {
    const match = xml.match(new RegExp(`<(?:(?:[\\w.-]+):)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:[\\w.-]+):)?${tag}>`, 'i'));
    return match?.[1]?.trim();
}

function getAuthorizationResult(xml: string, expectedAccessKey: string) {
    const protocolBlocks = Array.from(xml.matchAll(/<(?:[\w.-]+:)?protNFe\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?protNFe>/gi));

    for (const match of protocolBlocks) {
        const protocolXml = match[1];
        const cStat = readXmlTag(protocolXml, 'cStat') || '';
        const protocolNumber = readXmlTag(protocolXml, 'nProt');
        const authorizedAccessKey = readXmlTag(protocolXml, 'chNFe');

        if (cStat === '100' && protocolNumber && authorizedAccessKey === expectedAccessKey) {
            return {
                cStat,
                xMotivo: readXmlTag(protocolXml, 'xMotivo') || '',
                protocolNumber,
                protocolDate: readXmlTag(protocolXml, 'dhRecbto'),
                authorizedAccessKey,
            };
        }
    }

    const rejectedProtocol = protocolBlocks[0]?.[1];
    return {
        cStat: rejectedProtocol ? readXmlTag(rejectedProtocol, 'cStat') || '' : readXmlTag(xml, 'cStat') || '',
        xMotivo: rejectedProtocol ? readXmlTag(rejectedProtocol, 'xMotivo') || '' : readXmlTag(xml, 'xMotivo') || '',
        protocolNumber: undefined,
        protocolDate: undefined,
        authorizedAccessKey: undefined,
    };
}

function escapeXml(value: string): string {
    const escapedCharacters: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
    };
    return value.replace(/[&<>"']/g, (character) => escapedCharacters[character]);
}

function addCsrtToNfeXml(xml: string, accessKey: string, environment: number): string {
    const suffix = environment === 1 ? 'PRODUCAO' : 'HOMOLOGACAO';
    const csrt = process.env[`NFE_CSRT_${suffix}`] || '';
    const idCsrt = process.env[`NFE_ID_CSRT_${suffix}`] || '';
    const responsibleTechCnpj = process.env.NFE_RESPONSIBLE_TECH_CNPJ || '';
    const responsibleTechContact = process.env.NFE_RESPONSIBLE_TECH_CONTACT || '';
    const responsibleTechEmail = process.env.NFE_RESPONSIBLE_TECH_EMAIL || '';
    const responsibleTechPhone = process.env.NFE_RESPONSIBLE_TECH_PHONE || '';

    if (!csrt || !idCsrt) {
        throw new Error(`CSRT não configurado no servidor para ${suffix.toLowerCase()}. Defina NFE_CSRT_${suffix} e NFE_ID_CSRT_${suffix} nas variáveis de ambiente.`);
    }
    if (!/^0?[1-5]$/.test(idCsrt) || Buffer.byteLength(csrt, 'utf8') < 16 || Buffer.byteLength(csrt, 'utf8') > 36) {
        throw new Error(`Configuração de CSRT inválida para ${suffix.toLowerCase()}. Verifique as variáveis NFE_ID_CSRT_${suffix} e NFE_CSRT_${suffix}.`);
    }
    if (!/<\/infAdic\s*>/i.test(xml) || !/<\/infNFe\s*>/i.test(xml)) {
        throw new Error('XML da NF-e não possui os grupos necessários para incluir o responsável técnico.');
    }

    if (!/^\d{14}$/.test(responsibleTechCnpj)
        || responsibleTechContact.trim().length < 2 || responsibleTechContact.length > 60
        || responsibleTechEmail.length < 6 || responsibleTechEmail.length > 60 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(responsibleTechEmail)
        || !/^\d{6,14}$/.test(responsibleTechPhone)) {
        throw new Error('Dados do responsável técnico inválidos. Configure CNPJ, contato, e-mail e telefone no servidor.');
    }

    const hashCsrt = createHash('sha1').update(`${csrt}${accessKey}`, 'utf8').digest('base64');
    const responsibleTechnicalInfo = `<infRespTec><CNPJ>${responsibleTechCnpj}</CNPJ><xContato>${escapeXml(responsibleTechContact.trim())}</xContato><email>${escapeXml(responsibleTechEmail.trim())}</email><fone>${responsibleTechPhone}</fone><idCSRT>${idCsrt.padStart(2, '0')}</idCSRT><hashCSRT>${hashCsrt}</hashCSRT></infRespTec>`;

    return xml.replace(/<\/infNFe\s*>/i, `${responsibleTechnicalInfo}</infNFe>`);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { xml, environment, orderId, nfeNumber, series, model, accessKey } = req.body;

        if (!xml || !/^\d{44}$/.test(String(accessKey || ''))) {
            return res.status(400).json({ error: 'XML ou chave de acesso da NF-e ausente ou inválida.' });
        }

        // 1. Obter configurações fiscais e certificado do banco
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data: settingsRow, error: settingsErr } = await supabase
            .from('settings')
            .select('*')
            .eq('id', 'app')
            .maybeSingle();

        const settings = settingsRow?.data || settingsRow || {};
        const pfxBase64 = settings.certificateBase64 || process.env.NFE_CERTIFICATE_BASE64;
        const pfxPassword = settings.certificatePassword || process.env.NFE_CERTIFICATE_PASSWORD;

        if (!pfxBase64) {
            return res.status(400).json({
                error: 'Certificado digital (.pfx) não encontrado nas configurações nem nas variáveis de ambiente.',
            });
        }

        // 2. Extrair chaves criptográficas do Certificado A1
        const { privateKeyPem, certPem, certDerBase64 } = extractCertificateAndKey(pfxBase64, pfxPassword || '');

        // 3. Assinar digitalmente o XML (XMLDSig RSA-SHA1)
        const isHomologacao = Number(environment || settings.nfeEnvironment || 2) === 2;
        const xmlWithCsrt = addCsrtToNfeXml(xml, accessKey, isHomologacao ? 2 : 1);
        const signedXml = signNfeXml(xmlWithCsrt, privateKeyPem, certDerBase64);

        // 4. Montar o lote de envio <enviNFe>
        const idLote = String(Date.now()).slice(-15);
        const enviNfeXml = `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><idLote>${idLote}</idLote><indSinc>1</indSinc>${signedXml}</enviNFe>`;

        // 5. Determinar URL da SEFAZ
        const sefazUrl = isHomologacao 
            ? SEFAZ_PR_URLS.homologacao.autorizacao 
            : SEFAZ_PR_URLS.producao.autorizacao;

        console.log(`[NF-e Emit] Enviando lote ${idLote} para SEFAZ-PR (${isHomologacao ? 'Homologação' : 'Produção'})...`);

        // 6. Transmitir SOAP mTLS para a SEFAZ
        let sefazResponseXml: string;
        try {
            sefazResponseXml = await sendSoapToSefaz({
                url: sefazUrl,
                action: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeAutorizacaoLote',
                xmlPayload: enviNfeXml,
                certPem,
                privateKeyPem,
            });
        } catch (soapErr: any) {
            console.error('[NF-e Emit] Erro na conexão SOAP SEFAZ:', soapErr.message);
            // Em ambiente de desenvolvimento/teste de conexão, retorna o XML assinado com detalhe do retorno
            return res.status(502).json({
                success: false,
                error: `Conexão com SEFAZ-PR: ${soapErr.message}`,
            });
        }

        // A autorização individual vem em protNFe/infProt; cStat 104 apenas informa que o lote foi processado.
        const authorization = getAuthorizationResult(sefazResponseXml, accessKey);
        const isAuthorized = authorization.cStat === '100'
            && Boolean(authorization.protocolNumber)
            && Boolean(authorization.protocolDate)
            && authorization.authorizedAccessKey === accessKey;
        const failureReason = isAuthorized
            ? authorization.xMotivo
            : authorization.cStat === '104'
                ? 'Lote processado, mas a resposta não confirmou a autorização individual. Consulte esta chave na SEFAZ antes de tentar novamente.'
                : authorization.cStat === '100'
                    ? 'A resposta indicou autorização, mas faltam dados válidos de protocolo ou a chave autorizada não corresponde. Consulte esta chave na SEFAZ antes de tentar novamente.'
                : authorization.xMotivo || 'A SEFAZ não retornou protocolo válido de autorização.';

        // 8. Gravar documento na tabela nfe_documents
        if (orderId) {
            await supabase.from('nfe_documents').upsert({
                order_id: orderId,
                numero_nfe: nfeNumber,
                serie: series || '1',
                chave_acesso: accessKey,
                modelo: model || '55',
                ambiente: isHomologacao ? 2 : 1,
                status: isAuthorized ? 'autorizada' : 'erro',
                motivo_status: failureReason,
                xml_nfe: signedXml,
                xml_protocolo: sefazResponseXml,
                numero_protocolo: isAuthorized ? authorization.protocolNumber : null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
        }

        return res.status(200).json({
            success: isAuthorized,
            cStat: authorization.cStat,
            xMotivo: failureReason,
            protocolNumber: isAuthorized ? authorization.protocolNumber : undefined,
            protocolDate: isAuthorized ? authorization.protocolDate : undefined,
            authorizedAccessKey: isAuthorized ? authorization.authorizedAccessKey : undefined,
            signedXml,
            sefazResponseXml,
            error: isAuthorized ? undefined : failureReason,
        });
    } catch (err: any) {
        console.error('[NF-e Emit] Erro inesperado:', err);
        return res.status(500).json({ error: err.message || 'Erro interno ao processar NF-e.' });
    }
}
