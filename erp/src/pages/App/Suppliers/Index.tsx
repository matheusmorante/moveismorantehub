import PersonPage from "../Registrations/shared/PersonPage";

const Suppliers = () => (
    <PersonPage
        title="Fornecedores"
        subtitle="Cadeia de Parceiros e Fornecedores"
        newLabel="Novo Fornecedor"
        newIcon="bi bi-truck"
        collectionName="suppliers"
        storageKey="suppliers_table"
        canImport={true}
    />
);

export default Suppliers;
