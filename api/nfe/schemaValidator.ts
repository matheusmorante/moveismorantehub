import { closeSync, existsSync, openSync, readFileSync, readSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

export const NFE_SCHEMA_PACKAGE = 'PL_010f_v1.04';
const schemaRelativePath = `api/nfe/schemas/${NFE_SCHEMA_PACKAGE}/nfe_v4.00.xsd`;

function resolveFilePath(filename: string): string | null {
  try {
    if (filename.startsWith('file:')) {
      return fileURLToPath(filename);
    }
    const url = new URL(filename);
    if (url.protocol === 'file:') {
      return fileURLToPath(url);
    }
    return null;
  } catch {
    return filename;
  }
}

let fsProviderRegistered = false;
function registerCustomFsProvider(xmlRegisterInputProvider: any) {
  if (fsProviderRegistered) return;
  fsProviderRegistered = true;
  xmlRegisterInputProvider({
    match(filename: string) {
      const p = resolveFilePath(filename);
      return p != null && existsSync(p);
    },
    open(filename: string) {
      const p = resolveFilePath(filename);
      if (!p) return undefined;
      try {
        return openSync(p, 'r');
      } catch {
        return undefined;
      }
    },
    read(fd: number, buf: Uint8Array) {
      try {
        return readSync(fd, buf, 0, buf.byteLength, null);
      } catch {
        return -1;
      }
    },
    close(fd: number) {
      try {
        closeSync(fd);
      } catch {}
      return true;
    },
  });
}

/** The official nfe_v4.00 schema requires Signature. Before signing, check only
 * well-formedness and the expected unsigned envelope; run the full XSD after signing. */
export async function validateUnsignedNfeStructure(xml: string): Promise<void> {
  if (!xml || /<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new Error('XML fiscal contém declaração não permitida.');
  const { XmlDocument } = await import('libxml2-wasm');
  let document: ReturnType<typeof XmlDocument.fromBuffer> | undefined;
  try {
    document = XmlDocument.fromBuffer(Buffer.from(xml, 'utf8'));
    if (
      !/<NFe\s+xmlns="http:\/\/www\.portalfiscal\.inf\.br\/nfe">/.test(xml) ||
      !/<infNFe\s+Id="NFe[0-9]{6}[A-Z0-9]{12}[0-9]{26}"\s+versao="4\.00">/.test(xml) ||
      /<(?:\w+:)?Signature(?:\s|>)/.test(xml)
    )
      throw new Error('Envelope NF-e pré-assinatura inesperado.');
  } catch (error) {
    throw new Error(
      `XML da NF-e pré-assinatura inválido: ${error instanceof Error ? error.message.slice(0, 300) : 'erro desconhecido'}`
    );
  } finally {
    document?.dispose();
  }
}

/** Validate locally against the pinned official NF-e package. No SEFAZ request is made. */
export async function validateNfeAgainstOfficialSchema(xml: string): Promise<void> {
  return validatePinnedSchema(xml, schemaRelativePath, NFE_SCHEMA_PACKAGE);
}

/** Validate the unchanged signed envelope and the cancellation-specific detail. */
export async function validateCancellationAgainstOfficialSchema(
  xml: string,
  expected: { accessKey: string; environment: number; protocol: string }
): Promise<void> {
  await validatePinnedSchema(
    xml,
    'api/nfe/schemas/Evento_NT2026.004/envEvento_v1.00.xsd',
    'Evento_NT2026.004'
  );
  const document = new DOMParser().parseFromString(xml, 'text/xml');
  const ns = 'http://www.portalfiscal.inf.br/nfe';
  const events = document.getElementsByTagNameNS(ns, 'infEvento');
  const detail = document.getElementsByTagNameNS(ns, 'detEvento');
  const tag = (name: string) => {
    const elements = events[0]?.getElementsByTagNameNS(ns, name);
    return elements?.length === 1 ? elements[0].textContent : null;
  };
  if (
    events.length !== 1 ||
    detail.length !== 1 ||
    tag('tpEvento') !== '110111' ||
    tag('nSeqEvento') !== '1' ||
    tag('chNFe') !== expected.accessKey ||
    tag('tpAmb') !== String(expected.environment) ||
    tag('nProt') !== expected.protocol ||
    events[0].getAttribute('Id') !== `ID110111${expected.accessKey}01`
  ) {
    throw new Error('Identidade do evento de cancelamento divergente do documento.');
  }
  const fragment = detail[0].cloneNode(true) as (typeof detail)[0];
  fragment.setAttribute('xmlns', ns);
  await validatePinnedSchema(
    new XMLSerializer().serializeToString(fragment),
    'api/nfe/schemas/Evento_Canc_PL_v1.01/e110111_v1.00.xsd',
    'Evento_Canc_PL_v1.01'
  );
}

async function validatePinnedSchema(
  xml: string,
  relativePath: string,
  packageName: string
): Promise<void> {
  if (!xml || /<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new Error('XML fiscal contém declaração não permitida.');
  const candidates = [
    resolve(process.cwd(), relativePath),
    resolve(process.cwd(), '..', relativePath),
  ];
  const path = candidates.find(existsSync) || candidates[0];
  const { XmlDocument, XsdValidator, xmlRegisterInputProvider } = await import('libxml2-wasm');
  registerCustomFsProvider(xmlRegisterInputProvider);
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
    throw new Error(`XML da NF-e não passou pelo schema oficial ${packageName}: ${detail}`);
  } finally {
    document?.dispose();
    validator?.dispose();
    schema?.dispose();
  }
}
