/**
 * Fachada do domínio de Notas Fiscais de Entrada (Mobile Stock).
 * Reexporta os serviços modulares de consulta, importação XML, vínculos e catálogo.
 */
export {
  fetchInboundInvoices,
  fetchInboundInvoicesPage,
  fetchInboundInvoiceDetails,
  deleteInboundInvoice,
} from './invoices/inboundInvoiceQueryService';

export {
  findInboundInvoiceSupplier,
  importInboundInvoiceXml,
} from './invoices/inboundInvoiceImportService';

export {
  fetchInboundInvoiceForMappings,
  updateInboundInvoiceMappings,
  saveInboundSupplierProductCode,
  findInboundSupplierProductCodes,
  deleteInboundSupplierProductCode,
} from './invoices/inboundInvoiceMappingsService';

export {
  searchInboundInvoiceSuppliers,
  searchInboundInvoiceProducts,
  getInboundInvoiceProductById,
  fetchInboundInvoiceProductDetails,
  searchInboundInvoiceProductParents,
  fetchInboundInvoiceSupplierCatalog,
} from './invoices/inboundInvoiceCatalogLookupService';
