var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../api/nfe/schemaValidator.ts
var schemaValidator_exports = {};
__export(schemaValidator_exports, {
  NFE_SCHEMA_PACKAGE: () => NFE_SCHEMA_PACKAGE,
  validateCancellationAgainstOfficialSchema: () => validateCancellationAgainstOfficialSchema,
  validateNfeAgainstOfficialSchema: () => validateNfeAgainstOfficialSchema,
  validateUnsignedNfeStructure: () => validateUnsignedNfeStructure
});
module.exports = __toCommonJS(schemaValidator_exports);
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var import_node_url = require("node:url");
var import_xmldom = require("@xmldom/xmldom");
var NFE_SCHEMA_PACKAGE = "PL_010f_v1.04";
var schemaRelativePath = `api/nfe/schemas/${NFE_SCHEMA_PACKAGE}/nfe_v4.00.xsd`;
function resolveFilePath(filename) {
  try {
    if (filename.startsWith("file:")) {
      return (0, import_node_url.fileURLToPath)(filename);
    }
    const url = new URL(filename);
    if (url.protocol === "file:") {
      return (0, import_node_url.fileURLToPath)(url);
    }
    return null;
  } catch {
    return filename;
  }
}
var fsProviderRegistered = false;
function registerCustomFsProvider(xmlRegisterInputProvider) {
  if (fsProviderRegistered) return;
  fsProviderRegistered = true;
  xmlRegisterInputProvider({
    match(filename) {
      const p = resolveFilePath(filename);
      return p != null && (0, import_node_fs.existsSync)(p);
    },
    open(filename) {
      const p = resolveFilePath(filename);
      if (!p) return void 0;
      try {
        return (0, import_node_fs.openSync)(p, "r");
      } catch {
        return void 0;
      }
    },
    read(fd, buf) {
      try {
        return (0, import_node_fs.readSync)(fd, buf, 0, buf.byteLength, null);
      } catch {
        return -1;
      }
    },
    close(fd) {
      try {
        (0, import_node_fs.closeSync)(fd);
      } catch {
      }
      return true;
    }
  });
}
async function validateUnsignedNfeStructure(xml) {
  if (!xml || /<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new Error("XML fiscal cont\xE9m declara\xE7\xE3o n\xE3o permitida.");
  const { XmlDocument } = await import("libxml2-wasm");
  let document;
  try {
    document = XmlDocument.fromBuffer(Buffer.from(xml, "utf8"));
    if (!/<NFe\s+xmlns="http:\/\/www\.portalfiscal\.inf\.br\/nfe">/.test(xml) || !/<infNFe\s+Id="NFe[0-9]{6}[A-Z0-9]{12}[0-9]{26}"\s+versao="4\.00">/.test(xml) || /<(?:\w+:)?Signature(?:\s|>)/.test(xml))
      throw new Error("Envelope NF-e pr\xE9-assinatura inesperado.");
  } catch (error) {
    throw new Error(
      `XML da NF-e pr\xE9-assinatura inv\xE1lido: ${error instanceof Error ? error.message.slice(0, 300) : "erro desconhecido"}`
    );
  } finally {
    document?.dispose();
  }
}
async function validateNfeAgainstOfficialSchema(xml) {
  return validatePinnedSchema(xml, schemaRelativePath, NFE_SCHEMA_PACKAGE);
}
async function validateCancellationAgainstOfficialSchema(xml, expected) {
  await validatePinnedSchema(
    xml,
    "api/nfe/schemas/Evento_NT2026.004/envEvento_v1.00.xsd",
    "Evento_NT2026.004"
  );
  const document = new import_xmldom.DOMParser().parseFromString(xml, "text/xml");
  const ns = "http://www.portalfiscal.inf.br/nfe";
  const events = document.getElementsByTagNameNS(ns, "infEvento");
  const detail = document.getElementsByTagNameNS(ns, "detEvento");
  const tag = (name) => {
    const elements = events[0]?.getElementsByTagNameNS(ns, name);
    return elements?.length === 1 ? elements[0].textContent : null;
  };
  if (events.length !== 1 || detail.length !== 1 || tag("tpEvento") !== "110111" || tag("nSeqEvento") !== "1" || tag("chNFe") !== expected.accessKey || tag("tpAmb") !== String(expected.environment) || tag("nProt") !== expected.protocol || events[0].getAttribute("Id") !== `ID110111${expected.accessKey}01`) {
    throw new Error("Identidade do evento de cancelamento divergente do documento.");
  }
  const fragment = detail[0].cloneNode(true);
  fragment.setAttribute("xmlns", ns);
  await validatePinnedSchema(
    new import_xmldom.XMLSerializer().serializeToString(fragment),
    "api/nfe/schemas/Evento_Canc_PL_v1.01/e110111_v1.00.xsd",
    "Evento_Canc_PL_v1.01"
  );
}
async function validatePinnedSchema(xml, relativePath, packageName) {
  if (!xml || /<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new Error("XML fiscal cont\xE9m declara\xE7\xE3o n\xE3o permitida.");
  const candidates = [
    (0, import_node_path.resolve)(process.cwd(), relativePath),
    (0, import_node_path.resolve)(process.cwd(), "..", relativePath)
  ];
  const path = candidates.find(import_node_fs.existsSync) || candidates[0];
  const { XmlDocument, XsdValidator, xmlRegisterInputProvider } = await import("libxml2-wasm");
  registerCustomFsProvider(xmlRegisterInputProvider);
  let schema;
  let validator;
  let document;
  try {
    schema = XmlDocument.fromBuffer((0, import_node_fs.readFileSync)(path), { url: (0, import_node_url.pathToFileURL)(path).href });
    validator = XsdValidator.fromDoc(schema);
    document = XmlDocument.fromBuffer(Buffer.from(xml, "utf8"));
    validator.validate(document);
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 500) : "erro desconhecido";
    throw new Error(`XML da NF-e n\xE3o passou pelo schema oficial ${packageName}: ${detail}`);
  } finally {
    document?.dispose();
    validator?.dispose();
    schema?.dispose();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  NFE_SCHEMA_PACKAGE,
  validateCancellationAgainstOfficialSchema,
  validateNfeAgainstOfficialSchema,
  validateUnsignedNfeStructure
});
