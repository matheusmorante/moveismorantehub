import PersonPage from "../Registrations/shared/PersonPage";

const Customers = () => (
    <PersonPage
        title="Clientes"
        subtitle="Base de Relacionamento e Contatos"
        newLabel="Novo Cliente"
        newIcon="bi bi-person-plus-fill"
        collectionName="customers"
        storageKey="customers_table"
        canImport={true}
    />
);

export default Customers;
