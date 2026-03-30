import PersonPage from "../Registrations/shared/PersonPage";

const Customers = () => (
    <PersonPage
        title="Clientes e Fornecedores"
        subtitle="Base de Relacionamento e Contatos"
        newLabel="Novo Cliente/Fornecedor"
        newIcon="bi bi-person-plus-fill"
        collectionName="customers"
        storageKey="customers_table"
        canImport={true}
    />
);

export default Customers;
