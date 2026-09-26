import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const NFE_SCHEMA_PACKAGE = 'PL_010f_v1.04';
const schemaRelativePath = `api/nfe/schemas/${NFE_SCHEMA_PACKAGE}/nfe_v4.00.xsd`;

/** Validate locally against the pinned official NF-e package. No SEFAZ request is made. */
export async function validateNfeAgainstOfficialSchema(xml: string): Promise<void> {
    if (!xml || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('XML fiscal contém declaração não permitida.');
    const candidates = [resolve(process.cwd(), schemaRelativePath),
        resolve(process.cwd(), '..', schemaRelativePath)];
    const path = candidates.find(existsSync) || candidates[0];
    const [{ XmlDocument, XsdValidator }, { xmlRegisterFsInputProviders }] = await Promise.all([
        import('libxml2-wasm'), import('libxml2-wasm/lib/nodejs.mjs'),
    ]);
    xmlRegisterFsInputProviders();
    let schema: ReturnType<typeof XmlDocument.fromBuffer> | undefined;
    let validator: ReturnType<typeof XsdValidator.fromDoc> | undefined;
    let document: ReturnType<typeof XmlDocument.fromBuffer> | undefined;
    try {
        schema = XmlDocument.fromBuffer(readFileSync(path), { url: pathToFileURL(path).href });
        validator = XsdValidator.fromDoc(schema);
        document = XmlDocument.fromBuffer(Buffer.from(xml, 'utf8'));
        validator.validate(document);
    } catch (error) {
        const detail = error instanceof Error ? error.message.slice(0, 500) : 'erro desconhecido';
        throw new Error(`XML da NF-e não passou pelo schema oficial ${NFE_SCHEMA_PACKAGE}: ${detail}`);
    } finally {
        document?.dispose();
        validator?.dispose();
        schema?.dispose();
    }
}
