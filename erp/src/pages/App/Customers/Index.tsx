import PersonPage from "../Registrations/shared/PersonPage";

const Customers = () => (
    <PersonPage
        title="Clientes"
        subtitle=""
        newLabel="Novo Cliente"
        newIcon="bi bi-person-plus-fill"
        collectionName="customers"
        storageKey="customers_table"
        canImport={false}
    />
);

export default Customers;
