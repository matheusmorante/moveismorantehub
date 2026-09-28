export type EntityType = 'product' | 'variation' | 'customer' | 'supplier' | 'order' | 'receivable';

export interface ColumnMapping {
  erpField: string;
  csvHeader: string;
  defaultValue?: any;
  transform?: (value: string) => any;
}

export interface ImportConfig {
  id: string;
  name: string;
  entityType: EntityType;
  delimiter: string;
  mappings: ColumnMapping[];
}

export const BLING_PRODUCT_DEFAULTS: ImportConfig = {
  id: 'bling-products',
  name: 'Bling - Produtos',
  entityType: 'product',
  delimiter: ';',
  mappings: [
    { erpField: 'code', csvHeader: 'Código' },
    { erpField: 'description', csvHeader: 'Descrição' },
    { erpField: 'unitPrice', csvHeader: 'Preço' },
    { erpField: 'costPrice', csvHeader: 'Preço de custo' },
    { erpField: 'stock', csvHeader: 'Estoque' },
    { erpField: 'minStock', csvHeader: 'Estoque mínimo' },
    { erpField: 'unit', csvHeader: 'Unidade', defaultValue: 'UN' },
    { erpField: 'brand', csvHeader: 'Marca' },
    { erpField: 'category', csvHeader: 'Categoria do produto' },
    { erpField: 'ncm', csvHeader: 'NCM' },
    { erpField: 'supplier', csvHeader: 'Fornecedor' },
    { erpField: 'location', csvHeader: 'Localização' },
  ],
};

export const BLING_VARIATION_DEFAULTS: ImportConfig = {
  id: 'bling-variations',
  name: 'Bling - Variações',
  entityType: 'variation',
  delimiter: ';',
  mappings: [
    { erpField: 'code', csvHeader: 'Código' },
    { erpField: 'description', csvHeader: 'Descrição' },
    { erpField: 'parentCode', csvHeader: 'Código Pai' },
    { erpField: 'unitPrice', csvHeader: 'Preço' },
    { erpField: 'stock', csvHeader: 'Estoque' },
    { erpField: 'brand', csvHeader: 'Marca' },
  ],
};

export const BLING_CUSTOMER_DEFAULTS: ImportConfig = {
  id: 'bling-customers',
  name: 'Bling - Clientes',
  entityType: 'customer',
  delimiter: ';',
  mappings: [
    { erpField: 'fullName', csvHeader: 'Nome' },
    { erpField: 'cpfCnpj', csvHeader: 'CPF/CNPJ' },
    { erpField: 'rgIe', csvHeader: 'RG/IE' },
    { erpField: 'email', csvHeader: 'E-mail' },
    { erpField: 'phone', csvHeader: 'Celular' },
    { erpField: 'address', csvHeader: 'Endereço' },
    { erpField: 'city', csvHeader: 'Cidade' },
    { erpField: 'uf', csvHeader: 'UF' },
  ],
};

export const BLING_SUPPLIER_DEFAULTS: ImportConfig = {
  id: 'bling-suppliers',
  name: 'Bling - Fornecedores',
  entityType: 'supplier',
  delimiter: ';',
  mappings: [
    { erpField: 'fullName', csvHeader: 'Nome' },
    { erpField: 'cpfCnpj', csvHeader: 'CPF/CNPJ' },
    { erpField: 'email', csvHeader: 'E-mail' },
    { erpField: 'phone', csvHeader: 'Celular' },
    { erpField: 'address', csvHeader: 'Endereço' },
  ],
};

export const BLING_ORDER_DEFAULTS: ImportConfig = {
  id: 'bling-orders',
  name: 'Bling - Pedidos de Venda',
  entityType: 'order',
  delimiter: ';',
  mappings: [
    { erpField: 'orderNumber', csvHeader: 'Número' },
    { erpField: 'date', csvHeader: 'Data' },
    { erpField: 'customerName', csvHeader: 'Cliente' },
    { erpField: 'total', csvHeader: 'Total' },
    { erpField: 'status', csvHeader: 'Situação' },
    { erpField: 'paymentMethod', csvHeader: 'Forma de pagamento' },
  ],
};

export const BLING_RECEIVABLE_DEFAULTS: ImportConfig = {
  id: 'bling-receivables',
  name: 'Bling - Contas a Receber',
  entityType: 'receivable',
  delimiter: ';',
  mappings: [
    { erpField: 'description', csvHeader: 'Descrição' },
    { erpField: 'value', csvHeader: 'Valor' },
    { erpField: 'dueDate', csvHeader: 'Vencimento' },
    { erpField: 'customerName', csvHeader: 'Cliente' },
    { erpField: 'category', csvHeader: 'Categoria' },
    { erpField: 'status', csvHeader: 'Situação' },
  ],
};
