export interface BlingProductItem {
  id: number | string;
  nome: string;
  codigo?: string;
  preco?: number | string;
  precoCusto?: number | string;
  pesoBruto?: number | string;
  idProdutoPai?: number | string;
  formato?: string;
  localizacao?: string;
  tipo?: string;
  situacao?: string;
  estoqueMinimo?: number;
  estoque?: {
    saldoTotal?: number;
  };
  imagemURL?: string;
  variacao?: {
    nome?: string;
  };
}
