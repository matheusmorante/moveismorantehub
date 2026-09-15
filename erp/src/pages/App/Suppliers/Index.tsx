import PersonPage from "../Registrations/shared/PersonPage";

const Suppliers = () => (
    <PersonPage
        title="Fornecedores"
        subtitle=""
        newLabel="Novo Fornecedor"
        newIcon="bi bi-plus-lg"
        collectionName="suppliers"
        storageKey="suppliers_table"
        canImport={false}
    />
);

export default Suppliers;
