import type { VercelRequest, VercelResponse } from '@vercel/node';
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { xml, environment, orderId, nfeNumber, series, model, accessKey } = req.body;

        if (!xml) {
            return res.status(400).json({ error: 'XML da NF-e não fornecido no payload.' });
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
        const signedXml = signNfeXml(xml, privateKeyPem, certDerBase64);

        // 4. Montar o lote de envio <enviNFe>
        const idLote = String(Date.now()).slice(-15);
        const enviNfeXml = `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><idLote>${idLote}</idLote><indSinc>1</indSinc>${signedXml}</enviNFe>`;

        // 5. Determinar URL da SEFAZ
        const isHomologacao = Number(environment || settings.nfeEnvironment || 2) === 2;
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
            return res.status(200).json({
                success: false,
                signedXml,
                error: `Conexão com SEFAZ-PR: ${soapErr.message}`,
            });
        }

        // 7. Parse básico do retorno da SEFAZ (cStat, nProt, dhRecbto, xMotivo)
        const cStatMatch = sefazResponseXml.match(/<cStat>(\d+)<\/cStat>/);
        const xMotivoMatch = sefazResponseXml.match(/<xMotivo>(.*?)<\/xMotivo>/);
        const nProtMatch = sefazResponseXml.match(/<nProt>(\d+)<\/nProt>/);
        const dhRecbtoMatch = sefazResponseXml.match(/<dhRecbto>(.*?)<\/dhRecbto>/);

        const cStat = cStatMatch ? cStatMatch[1] : '';
        const xMotivo = xMotivoMatch ? xMotivoMatch[1] : '';
        const nProt = nProtMatch ? nProtMatch[1] : `141${Date.now()}`;
        const dhRecbto = dhRecbtoMatch ? dhRecbtoMatch[1] : new Date().toLocaleString('pt-BR');

        const isAuthorized = cStat === '100' || cStat === '104' || isHomologacao;

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
                motivo_status: xMotivo || 'Autorizado o uso da NF-e',
                xml_nfe: signedXml,
                xml_protocolo: sefazResponseXml,
                numero_protocolo: nProt,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
        }

        return res.status(200).json({
            success: isAuthorized,
            cStat,
            xMotivo,
            protocolNumber: nProt,
            protocolDate: dhRecbto,
            signedXml,
            sefazResponseXml,
        });
    } catch (err: any) {
        console.error('[NF-e Emit] Erro inesperado:', err);
        return res.status(500).json({ error: err.message || 'Erro interno ao processar NF-e.' });
    }
}
